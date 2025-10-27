// Batch hashing API for Bab
// This is the simplest API - requires the full string to be available at once

import { BabDigest } from './digest.js'
import { hashChunk, hashInner, CHUNK_SIZE, createContexts, createKeyedContexts } from './william3.js'

// The simplest hashing API; it requires the full string to be available at once
export function batchHash(data: Uint8Array): BabDigest {
    const { chunkContext, innerContext } = createContexts()
    const result = doBatchHash(data, true, chunkContext, innerContext)
    return new BabDigest(result)
}

// Keyed variant of batch hashing
export function batchHashKeyed(data: Uint8Array, key: number[]): BabDigest {
    const { chunkContext, innerContext } = createKeyedContexts(key)
    const result = doBatchHash(data, true, chunkContext, innerContext)
    return new BabDigest(result)
}

// Internal recursive batch hashing implementation
function doBatchHash(
    data: Uint8Array,
    isRoot: boolean,
    chunkContext: any,
    innerContext: any
): Uint8Array {
    // Base case: data fits in a single chunk
    if (data.length <= CHUNK_SIZE) {
        return hashChunk(data, isRoot, chunkContext)
    }

    // Recursive case: split into two parts
    // Find the split point: the largest power of 2 chunks that is less than the total number of chunks
    // This ensures all left subtrees are complete trees
    const numChunks = Math.ceil(data.length / CHUNK_SIZE)

    // Find the largest power of 2 that is less than numChunks
    // This is: 1 << floor(log2(numChunks - 1)) for numChunks > 1
    // Or equivalently: the highest bit in (numChunks - 1)
    const splitChunks = numChunks === 1 ? 1 : (1 << Math.floor(Math.log2(numChunks - 1)))
    const splitPoint = splitChunks * CHUNK_SIZE

    // Recursively hash left and right parts
    const leftData = data.slice(0, Math.min(splitPoint, data.length))
    const rightData = data.slice(Math.min(splitPoint, data.length))

    const leftLabel = doBatchHash(leftData, false, chunkContext, innerContext)
    const rightLabel = doBatchHash(rightData, false, chunkContext, innerContext)

    // Combine with hash_inner
    return hashInner(leftLabel, rightLabel, BigInt(data.length), isRoot, innerContext)
}
