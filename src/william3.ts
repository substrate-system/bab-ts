// WILLIAM3 instantiation of Bab hash function
import { hash1, CHUNK_START, CHUNK_END, PARENT, ROOT, KEYED_HASH } from './portable.js'

export const WIDTH = 32 // Output digest size in bytes
export const CHUNK_SIZE = 1024 // Chunk size in bytes

// Context for hashing chunks (leaf nodes)
class HashChunkContext {
    private key: number[]
    private chunkSize: number

    constructor (key?: number[], chunkSize?: number) {
        this.key = key || [
            0x67e6096a, 0x85ae67bb, 0x72f36e3c, 0x3af54fa5,
            0x7f520e51, 0x8c68059b, 0xabd9831f, 0x19cde05b
        ]
        this.chunkSize = chunkSize ?? CHUNK_SIZE
    }

    getKey (): number[] {
        return this.key
    }

    getChunkSize (): number {
        return this.chunkSize
    }

    isKeyed (): boolean {
        return this.key.length > 8 || this.key.some((v, i) => v !== [
            0x67e6096a, 0x85ae67bb, 0x72f36e3c, 0x3af54fa5,
            0x7f520e51, 0x8c68059b, 0xabd9831f, 0x19cde05b
        ][i])
    }
}

// Context for hashing inner nodes
class HashInnerContext {
    private key: number[]

    constructor (key?: number[]) {
        this.key = key || [
            0x67e6096a, 0x85ae67bb, 0x72f36e3c, 0x3af54fa5,
            0x7f520e51, 0x8c68059b, 0xabd9831f, 0x19cde05b
        ]
    }

    getKey (): number[] {
        return this.key
    }

    isKeyed (): boolean {
        return this.key.length > 8 || this.key.some((v, i) => v !== [
            0x67e6096a, 0x85ae67bb, 0x72f36e3c, 0x3af54fa5,
            0x7f520e51, 0x8c68059b, 0xabd9831f, 0x19cde05b
        ][i])
    }
}

// Hash a single chunk (leaf node)
export function hashChunk (
    data: Uint8Array,
    isRoot: boolean,
    chunkContext: HashChunkContext
): Uint8Array {
    let flags = CHUNK_START | CHUNK_END
    if (isRoot) {
        flags |= ROOT
    }
    if (chunkContext.isKeyed()) {
        flags |= KEYED_HASH
    }

    return hash1(chunkContext.getKey(), data, 0n, flags)
}

// Encode a u64 as little-endian bytes
function u64ToLeBytes (value: bigint): Uint8Array {
    const bytes = new Uint8Array(8)
    for (let i = 0; i < 8; i++) {
        bytes[i] = Number((value >> BigInt(i * 8)) & 0xFFn)
    }
    return bytes
}

// Hash an inner node (combining two child nodes)
export function hashInner (
    leftLabel: Uint8Array,
    rightLabel: Uint8Array,
    length: bigint,
    isRoot: boolean,
    innerContext: HashInnerContext
): Uint8Array {
    // Prepare input: left_label || right_label || length_bytes
    const lengthBytes = u64ToLeBytes(length)
    const input = new Uint8Array(leftLabel.length + rightLabel.length + lengthBytes.length)
    input.set(leftLabel, 0)
    input.set(rightLabel, leftLabel.length)
    input.set(lengthBytes, leftLabel.length + rightLabel.length)

    let flags = PARENT
    if (isRoot) {
        flags |= ROOT
    }
    if (innerContext.isKeyed()) {
        flags |= KEYED_HASH
    }

    return hash1(innerContext.getKey(), input, 0n, flags)
}

// Create unkeyed contexts
export function createContexts (chunkSize?: number): { chunkContext: HashChunkContext, innerContext: HashInnerContext } {
    return {
        chunkContext: new HashChunkContext(undefined, chunkSize),
        innerContext: new HashInnerContext()
    }
}

// Create keyed contexts
export function createKeyedContexts (key: number[], chunkSize?: number): { chunkContext: HashChunkContext, innerContext: HashInnerContext } {
    return {
        chunkContext: new HashChunkContext(key, chunkSize),
        innerContext: new HashInnerContext(key)
    }
}
