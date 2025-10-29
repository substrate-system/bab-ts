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
        const chunkMetadata = {
            siblingLabels: chunk.siblingLabels,
            siblingDirections: chunk.siblingDirections,
            mergeLengths: chunk.mergeLengths
        }
        const isValid = verifyChunk(
            chunk.chunkData,
            chunkMetadata,
            metadata.chunks.length,
            metadata.rootDigest,
            8
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

        const chunkMetadata = {
            siblingLabels: chunk.siblingLabels,
            siblingDirections: chunk.siblingDirections,
            mergeLengths: chunk.mergeLengths
        }
        const isValid = verifyChunk(
            tamperedData,
            chunkMetadata,
            metadata.chunks.length,
            metadata.rootDigest,
            8
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
            const chunkMetadata = {
                siblingLabels: chunk.siblingLabels,
                siblingDirections: chunk.siblingDirections,
                mergeLengths: chunk.mergeLengths
            }
            const isValid = verifyChunk(
                chunk.chunkData,
                chunkMetadata,
                metadata.chunks.length,
                metadata.rootDigest,
                chunkSize
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
    const chunkMetadata = {
        siblingLabels: chunk.siblingLabels,
        siblingDirections: chunk.siblingDirections,
        mergeLengths: chunk.mergeLengths
    }
    const isValid = verifyChunk(
        chunk.chunkData,
        chunkMetadata,
        1,
        metadata.rootDigest,
        1024
    )
    t.ok(isValid, 'single chunk should be valid')
})

test('lighten method creates correct metadata', (t) => {
    const data = new TextEncoder().encode('hello world')
    const metadata = buildVerificationMetadata(data, 8)

    if (metadata.chunks.length > 0) {
        const chunk = metadata.chunks[0]
        const lightMetadata = buildVerificationMetadata.lighten(chunk)

        t.ok(lightMetadata.siblingLabels, 'should have siblingLabels')
        t.ok(lightMetadata.siblingDirections, 'should have siblingDirections')
        t.ok(lightMetadata.mergeLengths, 'should have mergeLengths')
        t.equal(lightMetadata.siblingLabels, chunk.siblingLabels,
            'siblingLabels should match')
        t.equal(lightMetadata.siblingDirections, chunk.siblingDirections,
            'siblingDirections should match')
        t.equal(lightMetadata.mergeLengths, chunk.mergeLengths,
            'mergeLengths should match')
    }
})

test('lighten metadata can be used for verification', (t) => {
    const data = new TextEncoder().encode('hello world')
    const metadata = buildVerificationMetadata(data, 8)

    // Verify each chunk using lighten
    for (let i = 0; i < metadata.chunks.length; i++) {
        const chunk = metadata.chunks[i]
        const lightMetadata = buildVerificationMetadata.lighten(chunk)

        const isValid = verifyChunk(
            chunk.chunkData,
            lightMetadata,
            metadata.chunks.length,
            metadata.rootDigest,
            8
        )
        t.ok(isValid, `chunk ${i} should be valid with lighten metadata`)
    }
})
