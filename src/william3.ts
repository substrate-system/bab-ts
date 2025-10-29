import {
    hash1,
    CHUNK_START,
    CHUNK_END,
    PARENT,
    ROOT,
    KEYED_HASH,
    IV,
    BLOCK_LEN
} from './portable.js'

export const WIDTH = 32 // Output digest size in bytes
export const CHUNK_SIZE = 1024 // Chunk size in bytes

// Context for hashing chunks (leaf nodes)
class HashChunkContext {
    private key:number[]
    private chunkSize:number

    constructor (key?:number[], chunkSize?:number) {
        this.key = key || IV
        this.chunkSize = chunkSize ?? CHUNK_SIZE
    }

    getKey ():number[] {
        return this.key
    }

    getChunkSize ():number {
        return this.chunkSize
    }

    isKeyed ():boolean {
        return this.key.length > 8 || this.key.some((v, i) => v !== [
            0xc88f633b, 0x4168fbf2, 0x6ba32583, 0xb0ff1847,
            0xac57e47d, 0xa8931330, 0x796a4645, 0x6b28a3ee
        ][i])
    }
}

// Context for hashing inner nodes
class HashInnerContext {
    private key:number[]

    constructor (key?:number[]) {
        this.key = key || IV
    }

    getKey ():number[] {
        return this.key
    }

    isKeyed ():boolean {
        return this.key.length > 8 || this.key.some((v, i) => v !== IV[i])
    }
}

// Hash a single chunk (leaf node)
export function hashChunk (
    data:Uint8Array,
    isRoot:boolean,
    chunkContext:HashChunkContext
): Uint8Array {
    let flags = 0
    if (isRoot) {
        flags |= ROOT
    }
    if (chunkContext.isKeyed()) {
        flags |= KEYED_HASH
    }

    return hash1(chunkContext.getKey(), data, 0n, flags, CHUNK_START, CHUNK_END)
}

// // Encode a u64 as little-endian bytes
// function u64ToLeBytes (value:bigint):Uint8Array {
//     const bytes = new Uint8Array(8)
//     for (let i = 0; i < 8; i++) {
//         bytes[i] = Number((value >> BigInt(i * 8)) & 0xFFn)
//     }
//     return bytes
// }

// Hash an inner node (combining two child nodes)
export function hashInner (
    leftLabel:Uint8Array,
    rightLabel:Uint8Array,
    length:bigint,
    isRoot:boolean,
    innerContext:HashInnerContext
):Uint8Array {
    // Prepare input: left_label || right_label (64 bytes total)
    // The length is passed as the counter parameter, NOT concatenated into input
    const input = new Uint8Array(BLOCK_LEN)
    input.set(leftLabel, 0)
    input.set(rightLabel, WIDTH)

    let flags = PARENT
    if (isRoot) {
        flags |= ROOT
    }
    if (innerContext.isKeyed()) {
        flags |= KEYED_HASH
    }

    return hash1(innerContext.getKey(), input, length, flags, 0, 0)
}

// Create unkeyed contexts
export function createContexts (chunkSize?:number):{
    chunkContext:HashChunkContext,
    innerContext:HashInnerContext
} {
    return {
        chunkContext: new HashChunkContext(undefined, chunkSize),
        innerContext: new HashInnerContext()
    }
}

// Create keyed contexts
export function createKeyedContexts (key:number[], chunkSize?:number):{
    chunkContext:HashChunkContext,
    innerContext:HashInnerContext
} {
    return {
        chunkContext: new HashChunkContext(key, chunkSize),
        innerContext: new HashInnerContext(key)
    }
}
