// WILLIAM3 portable compression implementation
// Based on BLAKE3 but with modifications for Bab

// Constants from BLAKE3
export const BLOCK_LEN = 64

// Initialization vector (BLAKE3 digest of the ASCII string "WILLIAM3")
export const IV:number[] = [
    0xc88f633b, 0x4168fbf2, 0x6ba32583, 0xb0ff1847,
    0xac57e47d, 0xa8931330, 0x796a4645, 0x6b28a3ee
]

// Message schedule
const MSG_SCHEDULE:number[][] = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    [2, 6, 3, 10, 7, 0, 4, 13, 1, 11, 12, 5, 9, 14, 15, 8],
    [3, 4, 10, 12, 13, 2, 7, 14, 6, 5, 9, 0, 11, 15, 8, 1],
    [10, 7, 12, 9, 14, 3, 13, 15, 4, 0, 11, 2, 5, 8, 1, 6],
    [12, 13, 9, 11, 15, 10, 14, 8, 7, 2, 5, 3, 0, 1, 6, 4],
    [9, 14, 11, 5, 8, 12, 15, 1, 13, 3, 0, 10, 2, 6, 4, 7],
    [11, 15, 5, 0, 1, 9, 8, 6, 14, 10, 2, 12, 3, 4, 7, 13]
]

// Domain separation flags
export const CHUNK_START = 1 << 0
export const CHUNK_END = 1 << 1
export const PARENT = 1 << 2
export const ROOT = 1 << 3
export const KEYED_HASH = 1 << 4

// Rotate right
function rotr32 (x:number, n:number):number {
    return (x >>> n) | (x << (32 - n))
}

// Add two 32-bit integers (with overflow wrapping)
function wrappingAdd (a:number, b:number):number {
    return (a + b) >>> 0
}

// The g mixing function
function g (
    state:number[],
    a:number,
    b:number,
    c:number,
    d:number,
    mx:number,
    my:number
):void {
    state[a] = wrappingAdd(wrappingAdd(state[a], state[b]), mx)
    state[d] = rotr32(state[d] ^ state[a], 16)
    state[c] = wrappingAdd(state[c], state[d])
    state[b] = rotr32(state[b] ^ state[c], 12)
    state[a] = wrappingAdd(wrappingAdd(state[a], state[b]), my)
    state[d] = rotr32(state[d] ^ state[a], 8)
    state[c] = wrappingAdd(state[c], state[d])
    state[b] = rotr32(state[b] ^ state[c], 7)
}

// One round of compression
function round (state:number[], msg:number[], schedule:number[]):void {
    // Column mixing
    g(state, 0, 4, 8, 12, msg[schedule[0]], msg[schedule[1]])
    g(state, 1, 5, 9, 13, msg[schedule[2]], msg[schedule[3]])
    g(state, 2, 6, 10, 14, msg[schedule[4]], msg[schedule[5]])
    g(state, 3, 7, 11, 15, msg[schedule[6]], msg[schedule[7]])

    // Diagonal mixing
    g(state, 0, 5, 10, 15, msg[schedule[8]], msg[schedule[9]])
    g(state, 1, 6, 11, 12, msg[schedule[10]], msg[schedule[11]])
    g(state, 2, 7, 8, 13, msg[schedule[12]], msg[schedule[13]])
    g(state, 3, 4, 9, 14, msg[schedule[14]], msg[schedule[15]])
}

// Prepare initial state and run 7 rounds
function compressPre (
    chainingValue:number[],
    blockWords:number[],
    counter:bigint,
    blockLen:number,
    flags:number
):number[] {
    const state = [
        chainingValue[0], chainingValue[1], chainingValue[2], chainingValue[3],
        chainingValue[4], chainingValue[5], chainingValue[6], chainingValue[7],
        IV[0], IV[1], IV[2], IV[3],
        Number(counter & 0xFFFFFFFFn), Number(counter >> 32n), blockLen, flags
    ]

    for (let i = 0; i < 7; i++) {
        round(state, blockWords, MSG_SCHEDULE[i])
    }

    return state
}

// Finalize compression by XORing state halves
function compressInPlace (
    chainingValue:number[],
    blockWords:number[],
    counter:bigint,
    blockLen:number,
    flags:number
):void {
    const state = compressPre(chainingValue, blockWords, counter, blockLen, flags)

    for (let i = 0; i < 8; i++) {
        chainingValue[i] = state[i] ^ state[i + 8]
    }
}

// Convert 64 bytes to 16 u32 words (little-endian)
function wordsFromLeBytes64 (bytes:Uint8Array):number[] {
    const words:number[] = []
    for (let i = 0; i < 16; i++) {
        words.push(
            bytes[i * 4] |
            (bytes[i * 4 + 1] << 8) |
            (bytes[i * 4 + 2] << 16) |
            (bytes[i * 4 + 3] << 24)
        )
    }
    return words
}

// Convert 8 u32 words to 32 bytes (little-endian)
function leBytesFromWords32 (words:number[]):Uint8Array {
    const bytes = new Uint8Array(32)
    for (let i = 0; i < 8; i++) {
        bytes[i * 4] = words[i] & 0xFF
        bytes[i * 4 + 1] = (words[i] >>> 8) & 0xFF
        bytes[i * 4 + 2] = (words[i] >>> 16) & 0xFF
        bytes[i * 4 + 3] = (words[i] >>> 24) & 0xFF
    }
    return bytes
}

// Main hash1 function - processes input data with block padding for the final block
export function hash1 (
    chainingValue:number[],
    data:Uint8Array,
    counter:bigint,
    flags:number,
    flagsStart:number = 0,
    flagsEnd:number = 0
):Uint8Array {
    const cv = [...chainingValue]
    let offset = 0
    let blockFlags = flags | flagsStart

    // Process blocks (if empty, skip and return unchanged CV)
    while (offset < data.length) {
        const remainingBytes = data.length - offset
        const isLastBlock = remainingBytes <= BLOCK_LEN

        if (isLastBlock) {
            blockFlags |= flagsEnd
        }

        if (remainingBytes < BLOCK_LEN) {
            // Final incomplete block - pad with zeros
            const finalBlock = new Uint8Array(BLOCK_LEN)
            finalBlock.set(data.slice(offset))
            const blockWords = wordsFromLeBytes64(finalBlock)
            compressInPlace(cv, blockWords, counter, BLOCK_LEN, blockFlags)
            break
        } else {
            // Complete block
            const block = data.slice(offset, offset + BLOCK_LEN)
            const blockWords = wordsFromLeBytes64(block)
            compressInPlace(cv, blockWords, counter, BLOCK_LEN, blockFlags)
            offset += BLOCK_LEN
            // After first block, remove CHUNK_START flag
            blockFlags = flags
        }
    }

    return leBytesFromWords32(cv)
}
