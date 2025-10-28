// Tests for incremental verification API
import { test } from '@substrate-system/tapzero'
import {
    buildVerificationMetadata,
    verifyChunk,
    batchHash
} from '../src/index.js'

test('buildVerificationMetadata creates correct root digest', (t) => {
    const data = new TextEncoder().encode('hello world')
    const metadata = buildVerificationMetadata(data)

    // Should match batch hash
    const batchDigest = batchHash(data)
    t.equal(metadata.rootDigest.toHex(), batchDigest.toHex(),
        'root should match batch hash')
})

test('verifyChunk validates correct chunks', (t) => {
    const data = new TextEncoder().encode('hello world')
    const metadata = buildVerificationMetadata(data, 8)  // 8-byte chunks

    // Verify each chunk
    for (let i = 0; i < metadata.chunks.length; i++) {
        const chunk = metadata.chunks[i]
        const isValid = verifyChunk(
            chunk.chunkData,
            metadata.chunks.length,
            chunk.siblingLabels,
            chunk.siblingDirections,
            metadata.rootDigest,
            8,
            chunk.mergeLengths
        )
        t.ok(isValid, `chunk ${i} should be valid`)
    }
})

test('verifyChunk rejects tampered chunks', (t) => {
    const data = new TextEncoder().encode('hello world')
    const metadata = buildVerificationMetadata(data, 8)  // 8-byte chunks

    if (metadata.chunks.length > 0) {
        const chunk = metadata.chunks[0]
        // Tamper with the chunk data
        const tamperedData = new Uint8Array(chunk.chunkData)
        tamperedData[0] = tamperedData[0] ^ 0xFF  // Flip bits

        const isValid = verifyChunk(
            tamperedData,
            metadata.chunks.length,
            chunk.siblingLabels,
            chunk.siblingDirections,
            metadata.rootDigest,
            8,
            chunk.mergeLengths
        )
        t.ok(!isValid, 'tampered chunk should be invalid')
    }
})

test('verification works with different chunk sizes', (t) => {
    const data = new TextEncoder().encode('hello world')

    for (const chunkSize of [4, 8, 16, 32]) {
        const metadata = buildVerificationMetadata(data, chunkSize)

        // Verify all chunks
        let allValid = true
        for (let i = 0; i < metadata.chunks.length; i++) {
            const chunk = metadata.chunks[i]
            const isValid = verifyChunk(
                chunk.chunkData,
                metadata.chunks.length,
                chunk.siblingLabels,
                chunk.siblingDirections,
                metadata.rootDigest,
                chunkSize,
                chunk.mergeLengths
            )
            allValid = allValid && isValid
        }
        t.ok(allValid, `all chunks valid with chunk size ${chunkSize}`)
    }
})

test('single chunk verification', (t) => {
    const data = new TextEncoder().encode('hi')
    const metadata = buildVerificationMetadata(data, 1024)  // Larger than data

    t.equal(metadata.chunks.length, 1, 'should have 1 chunk')

    const chunk = metadata.chunks[0]
    const isValid = verifyChunk(
        chunk.chunkData,
        1,
        chunk.siblingLabels,
        chunk.siblingDirections,
        metadata.rootDigest,
        1024,
        chunk.mergeLengths
    )
    t.ok(isValid, 'single chunk should be valid')
})
