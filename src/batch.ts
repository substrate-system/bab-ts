// Batch hashing API for Bab
// This is the simplest API - requires the full string to be available at once
import { BabDigest } from './digest.js'
import {
    hashChunk,
    hashInner,
    createContexts,
    createKeyedContexts
} from './william3.js'

// The simplest hashing API; requires the full string to be available
// at once
export function batchHash (data:Uint8Array, chunkSize?:number):BabDigest {
    const { chunkContext, innerContext } = createContexts(chunkSize)
    const result = doBatchHash(data, true, chunkContext, innerContext)
    return new BabDigest(result)
}

// Keyed variant of batch hashing
export function batchHashKeyed (data:Uint8Array, key:number[], chunkSize?:number):BabDigest {
    const { chunkContext, innerContext } = createKeyedContexts(key, chunkSize)
    const result = doBatchHash(data, true, chunkContext, innerContext)
    return new BabDigest(result)
}

// Internal recursive batch hashing implementation
function doBatchHash (
    data:Uint8Array,
    isRoot:boolean,
    chunkContext:any,
    innerContext:any
):Uint8Array {
    const chunkSize = chunkContext.getChunkSize()

    // Base case: data fits in a single chunk
    if (data.length <= chunkSize) {
        return hashChunk(data, isRoot, chunkContext)
    }

    // Recursive case: split into two parts
    // Split at the greatest power of 2 strictly less than data.length
    // Unless data.length is a power of 2, then use data.length / 2
    const isPowerOfTwo = (data.length & (data.length - 1)) === 0
    const splitPoint = isPowerOfTwo ?
        data.length / 2 :
        (1 << Math.floor(Math.log2(data.length)))

    // Recursively hash left and right parts
    const leftData = data.slice(0, splitPoint)
    const rightData = data.slice(splitPoint)

    const leftLabel = doBatchHash(leftData, false, chunkContext, innerContext)
    const rightLabel = doBatchHash(rightData, false, chunkContext, innerContext)

    // Combine with hash_inner
    return hashInner(leftLabel, rightLabel, BigInt(data.length), isRoot,
        innerContext)
}
