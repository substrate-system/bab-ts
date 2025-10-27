import { test } from '@substrate-system/tapzero'
import { BabHasher, batchHash, BabDigest, CHUNK_SIZE } from '../src/index.js'

// Import verification tests
import './verify.test.js'

test('basic batch hashing', async t => {
    const data = new Uint8Array([1, 2, 3, 4, 5])
    const digest = batchHash(data)

    t.ok(digest instanceof BabDigest, 'should return a BabDigest')
    t.equal(digest.asBytes().length, 32, 'digest should be 32 bytes')
    t.ok(digest.toHex().length === 64,
        'hex representation should be 64 characters')
})

test('empty data hashing', async t => {
    const emptyData = new Uint8Array(0)
    const digest = batchHash(emptyData)

    t.ok(digest instanceof BabDigest,
        'should return a BabDigest for empty data')
    t.equal(digest.asBytes().length, 32, 'digest should be 32 bytes')
})

test('incremental hashing matches batch hashing - small data', async t => {
    const data = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])

    const batchDigest = batchHash(data)

    const hasher = BabHasher.create()
    hasher.write(data)
    const incrementalDigest = hasher.finish()

    t.ok(
        batchDigest.equals(incrementalDigest),
        'batch and incremental hashing should produce same result'
    )
})

test('incremental hashing matches batch hashing - multiple writes', async t => {
    const data = new Uint8Array(100)
    for (let i = 0; i < 100; i++) {
        data[i] = i % 256
    }

    const batchDigest = batchHash(data)

    const hasher = BabHasher.create()
    // Write in multiple chunks
    hasher.write(data.slice(0, 30))
    hasher.write(data.slice(30, 60))
    hasher.write(data.slice(60))
    const incrementalDigest = hasher.finish()

    t.ok(
        batchDigest.equals(incrementalDigest),
        'batch and incremental hashing should produce same result ' +
            'with multiple writes'
    )
})

test('incremental hashing matches batch hashing - large data', async t => {
    // Test with data larger than CHUNK_SIZE
    const dataSize = CHUNK_SIZE * 2 + 500
    const data = new Uint8Array(dataSize)
    for (let i = 0; i < dataSize; i++) {
        data[i] = i % 256
    }

    const batchDigest = batchHash(data)

    const hasher = BabHasher.create()
    hasher.write(data)
    const incrementalDigest = hasher.finish()

    t.ok(
        batchDigest.equals(incrementalDigest),
        'batch and incremental hashing should produce same result for large data'
    )
})

test('incremental hashing with small writes', async t => {
    const dataSize = CHUNK_SIZE * 2 + 500
    const data = new Uint8Array(dataSize)
    for (let i = 0; i < dataSize; i++) {
        data[i] = i % 256
    }

    const batchDigest = batchHash(data)

    const hasher = BabHasher.create()
    // Write one byte at a time
    for (let i = 0; i < dataSize; i++) {
        hasher.write(data.slice(i, i + 1))
    }
    const incrementalDigest = hasher.finish()

    t.ok(
        batchDigest.equals(incrementalDigest),
        'incremental hashing with single-byte writes should match batch hashing'
    )
})

test('digest equality', async t => {
    const data = new Uint8Array([1, 2, 3, 4, 5])
    const digest1 = batchHash(data)
    const digest2 = batchHash(data)

    t.ok(digest1.equals(digest2), 'same data should produce equal digests')
})

test('digest inequality', async t => {
    const data1 = new Uint8Array([1, 2, 3, 4, 5])
    const data2 = new Uint8Array([1, 2, 3, 4, 6])

    const digest1 = batchHash(data1)
    const digest2 = batchHash(data2)

    t.ok(!digest1.equals(digest2),
        'different data should produce different digests')
})

test('digest hex conversion', async t => {
    const data = new Uint8Array([1, 2, 3, 4, 5])
    const digest = batchHash(data)

    const hex = digest.toHex()
    const restored = BabDigest.fromHex(hex)

    t.ok(digest.equals(restored), 'digest should be restorable from hex')
})

test('different data sizes', async t => {
    const testSizes = [0, 1, 10, 100, 1000, CHUNK_SIZE - 1,
        CHUNK_SIZE, CHUNK_SIZE + 1, CHUNK_SIZE * 2, CHUNK_SIZE * 3 + 100]

    for (const size of testSizes) {
        const data = new Uint8Array(size)
        for (let i = 0; i < size; i++) {
            data[i] = i % 256
        }

        const batchDigest = batchHash(data)

        const hasher = BabHasher.create()
        hasher.write(data)
        const incrementalDigest = hasher.finish()

        t.ok(
            batchDigest.equals(incrementalDigest),
            `size ${size}: batch and incremental should match`
        )
    }
})

test('constant-time equality', async t => {
    const digest1 = BabDigest.fromHex(
        '0000000000000000000000000000000000000000000000000000000000000000')
    const digest2 = BabDigest.fromHex(
        '0000000000000000000000000000000000000000000000000000000000000001')
    const digest3 = BabDigest.fromHex(
        '0000000000000000000000000000000000000000000000000000000000000000')

    t.ok(digest1.equals(digest3), 'identical digests should be equal')
    t.ok(!digest1.equals(digest2), 'different digests should not be equal')
})
