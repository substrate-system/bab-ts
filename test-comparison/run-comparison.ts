import { test } from '@substrate-system/tapzero'
import { execSync } from 'node:child_process'
import { writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
    batchHash,
    buildVerificationMetadata,
} from '../src/index.js'

/**
 * Automated comparison test - runs Rust, TypeScript, and compares outputs
 *   - use 1024 byte chunks to match Rust implementation
 */

const testCases = [
    {
        name: 'simple',
        data: 'hello world',
        chunkSize: 1024
    },
    {
        name: 'empty',
        data: '',
        chunkSize: 1024
    },
    {
        name: 'single_chunk',
        data: 'hello',
        chunkSize: 1024
    },
    {
        name: 'multiple_chunks',
        data: 'The quick brown fox jumps over the lazy dog. This is a longer text that will span multiple chunks.'.repeat(20),
        chunkSize: 1024
    }
]

interface TestOutput {
    name:string
    input:{
        text:string
        bytes:number[]
        chunkSize:number
    }
    batchHash:string
    verificationMetadata?: {
        rootDigest:string
        numChunks:number
        chunks:Array<{
            chunkIndex:number
            chunkData:number[]
            chunkLabel:number[]
            siblingLabels:number[][]
            siblingDirections:number[]
            mergeLengths:number[]
        }>
    }
}

function uint8ArrayToArray (arr:Uint8Array):number[] {
    return Array.from(arr)
}

// Generate test outputs once
function generateOutputs () {
    // Step 1: Generate TypeScript output
    const tsResults:TestOutput[] = []

    for (const testCase of testCases) {
        const encoder = new TextEncoder()
        const data = encoder.encode(testCase.data)

        const digest = batchHash(data, testCase.chunkSize)
        const metadata = buildVerificationMetadata(data, testCase.chunkSize)

        const output: TestOutput = {
            name: testCase.name,
            input: {
                text: testCase.data,
                bytes: uint8ArrayToArray(data),
                chunkSize: testCase.chunkSize
            },
            batchHash: digest.toHex(),
            verificationMetadata: {
                rootDigest: metadata.rootDigest.toHex(),
                numChunks: metadata.chunks.length,
                chunks: metadata.chunks.map(chunk => ({
                    chunkIndex: chunk.chunkIndex,
                    chunkData: uint8ArrayToArray(chunk.chunkData),
                    chunkLabel: uint8ArrayToArray(chunk.chunkLabel),
                    siblingLabels: chunk.siblingLabels.map(uint8ArrayToArray),
                    siblingDirections: chunk.siblingDirections,
                    mergeLengths: chunk.mergeLengths
                }))
            }
        }

        tsResults.push(output)
    }

    const tsOutputPath = join(
        process.cwd(),
        'test-comparison',
        'typescript-output.json'
    )
    writeFileSync(tsOutputPath, JSON.stringify(tsResults, null, 2))

    // Step 2: Generate Rust output
    try {
        execSync('cargo run --release --bin bab-comparison', {
            cwd: join(process.cwd(), 'test-comparison', 'rust'),
            stdio: 'pipe'  // Suppress Rust output in tests
        })
    } catch (_err) {
        const err = _err as Error
        throw new Error('Failed to run Rust comparison: ' + err.message +
            '\nMake sure Rust is installed: curl --proto \'=https\' --tlsv1.2 -sSf https://sh.rustup.rs | sh')
    }

    const rustOutputPath = join(process.cwd(), 'test-comparison', 'rust-output.json')
    const rustResults = JSON.parse(readFileSync(rustOutputPath, 'utf-8'))

    return { tsResults, rustResults }
}

// Generate outputs once at module load
const { tsResults, rustResults } = generateOutputs()

test('TypeScript vs Rust: hello world', (t) => {
    const ts = tsResults.find(r => r.name === 'simple')
    const rust = rustResults.find((r: any) => r.name === 'simple')

    t.ok(ts, 'TypeScript output exists for "simple" test')
    t.ok(rust, 'Rust output exists for "simple" test')
    t.equal(ts?.input.bytes.length, 11, 'input is 11 bytes')
    t.equal(ts?.batchHash, rust?.batchHash, 'batch hashes should match')
})

test('TypeScript vs Rust: empty string', (t) => {
    const ts = tsResults.find(r => r.name === 'empty')
    const rust = rustResults.find((r: any) => r.name === 'empty')

    t.ok(ts, 'TypeScript output exists for "empty" test')
    t.ok(rust, 'Rust output exists for "empty" test')
    t.equal(ts?.input.bytes.length, 0, 'input is 0 bytes')
    t.equal(ts?.batchHash, rust?.batchHash, 'batch hashes should match')
})

test('TypeScript vs Rust: single chunk', (t) => {
    const ts = tsResults.find(r => r.name === 'single_chunk')
    const rust = rustResults.find((r: any) => r.name === 'single_chunk')

    t.ok(ts, 'TypeScript output exists for "single_chunk" test')
    t.ok(rust, 'Rust output exists for "single_chunk" test')
    t.equal(ts?.input.bytes.length, 5, 'input is 5 bytes')
    t.equal(ts?.batchHash, rust?.batchHash, 'batch hashes should match')
})

test('TypeScript vs Rust: multiple chunks', (t) => {
    const ts = tsResults.find(r => r.name === 'multiple_chunks')
    const rust = rustResults.find((r: any) => r.name === 'multiple_chunks')

    t.ok(ts, 'TypeScript output exists for "multiple_chunks" test')
    t.ok(rust, 'Rust output exists for "multiple_chunks" test')
    t.equal(ts?.input.bytes.length, 1960, 'input is 1960 bytes')
    t.ok((ts?.verificationMetadata?.numChunks || 0) > 1, 'should have multiple chunks')
    t.equal(ts?.batchHash, rust?.batchHash, 'batch hashes should match')
})
