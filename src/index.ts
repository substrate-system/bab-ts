// Bab: A Hash Function for Verifiable Streaming
// TypeScript implementation of the Bab family of hash functions
// https://worm-blossom.github.io/bab/

export { BabDigest } from './digest.js'
export { BabHasher } from './hasher.js'
export { batchHash, batchHashKeyed } from './batch.js'
export { hashChunk, hashInner, WIDTH, CHUNK_SIZE, createContexts, createKeyedContexts } from './william3.js'
export { buildVerificationMetadata, verifyChunk } from './verify.js'
export type { ChunkVerificationData } from './verify.js'

// Re-export compression primitives for advanced use
export { hash1, CHUNK_START, CHUNK_END, PARENT, ROOT, KEYED_HASH } from './portable.js'
