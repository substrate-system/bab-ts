// BabHasher - Incremental hasher for Bab
// Implements a streaming hasher that can process data in chunks

import { BabDigest } from './digest.js'
import { hashChunk, hashInner, CHUNK_SIZE, createContexts, createKeyedContexts } from './william3.js'

// Tree node for storing frontier structure
interface TreeNode {
    label: Uint8Array
    left?: TreeNode
    right?: TreeNode
    dataLength: number
    isLeaf: boolean
    chunkData?: Uint8Array  // For leaf nodes, store the raw data to recompute with isRoot=true
}

export class BabHasher {
    private chunkContext: any
    private innerContext: any
    private partialChunk: Uint8Array
    private partialChunkLen: number
    private frontier: TreeNode[]
    private completedBytes: number
    private completedChunks: number

    constructor(keyed: boolean = false, key?: number[]) {
        if (keyed && key) {
            const contexts = createKeyedContexts(key)
            this.chunkContext = contexts.chunkContext
            this.innerContext = contexts.innerContext
        } else {
            const contexts = createContexts()
            this.chunkContext = contexts.chunkContext
            this.innerContext = contexts.innerContext
        }

        this.partialChunk = new Uint8Array(CHUNK_SIZE)
        this.partialChunkLen = 0
        this.frontier = []
        this.completedBytes = 0
        this.completedChunks = 0
    }

    // Create a standard (unkeyed) hasher
    static create(): BabHasher {
        return new BabHasher(false)
    }

    // Create a keyed hasher
    static createKeyed(key: number[]): BabHasher {
        return new BabHasher(true, key)
    }

    // Write data to the hasher
    write(data: Uint8Array): void {
        let offset = 0

        while (offset < data.length) {
            // Fill the partial chunk
            const remainingInChunk = CHUNK_SIZE - this.partialChunkLen
            const remainingInData = data.length - offset
            const toCopy = Math.min(remainingInChunk, remainingInData)

            this.partialChunk.set(data.slice(offset, offset + toCopy), this.partialChunkLen)
            this.partialChunkLen += toCopy
            offset += toCopy

            // If we've completed a chunk, process it
            if (this.partialChunkLen === CHUNK_SIZE) {
                this.progressOrCompleteCurrentChunk()
            }
        }
    }

    // Process a completed chunk
    private progressOrCompleteCurrentChunk(): void {
        // Hash the completed chunk
        const chunkData = this.partialChunk.slice(0, this.partialChunkLen)
        const label = hashChunk(chunkData, false, this.chunkContext)

        // Update completed bytes
        const chunkLen = this.partialChunkLen
        this.completedBytes += chunkLen

        // Reset partial chunk
        this.partialChunkLen = 0

        // Create tree node for this chunk, storing the data for potential recomputation
        const node: TreeNode = {
            label,
            dataLength: chunkLen,
            isLeaf: true,
            chunkData: new Uint8Array(chunkData)  // Copy the chunk data
        }

        // Update the frontier (BEFORE incrementing completedChunks)
        this.updateFrontierForNewLeaf(node)

        // Increment completedChunks AFTER updating frontier
        this.completedChunks++
    }

    // Update the frontier when a new leaf is added
    private updateFrontierForNewLeaf(node: TreeNode): void {
        const numCompletedChunks = this.numberOfCompletedChunks()

        // Merge nodes in the frontier according to the binary representation
        let currentNode = node
        let exponent = 0

        while (exponent < 64 && isBitSet(numCompletedChunks, exponent)) {
            // Merge with the node at this exponent
            if (this.frontier[exponent]) {
                const leftNode = this.frontier[exponent]
                // The length is the sum of the data in both subtrees
                const mergedDataLength = leftNode.dataLength + currentNode.dataLength
                const mergedLabel = hashInner(leftNode.label, currentNode.label, BigInt(mergedDataLength), false, this.innerContext)

                // Create merged node
                currentNode = {
                    label: mergedLabel,
                    left: leftNode,
                    right: currentNode,
                    dataLength: mergedDataLength,
                    isLeaf: false
                }

                // Clear the merged entry
                delete this.frontier[exponent]
            }
            exponent++
        }

        // Store the merged node at the correct index
        this.frontier[exponent] = currentNode
    }

    // Get the number of completed chunks
    private numberOfCompletedChunks(): number {
        return this.completedChunks
    }

    // Finish hashing and return the digest
    finish(): BabDigest {
        // If no data was written, return hash of empty string
        if (this.completedBytes === 0 && this.partialChunkLen === 0) {
            const emptyLabel = hashChunk(new Uint8Array(0), true, this.chunkContext)
            return new BabDigest(emptyLabel)
        }

        // Process any remaining partial chunk
        if (this.partialChunkLen > 0) {
            const finalChunkData = this.partialChunk.slice(0, this.partialChunkLen)
            // If this is the only chunk, mark it as root
            const isOnlyChunk = (this.completedChunks === 0)
            const label = hashChunk(finalChunkData, isOnlyChunk, this.chunkContext)
            const chunkLen = this.partialChunkLen
            this.completedBytes += chunkLen
            this.partialChunkLen = 0

            if (isOnlyChunk) {
                // If it's the only chunk, return it directly as the root
                return new BabDigest(label)
            }

            const node: TreeNode = {
                label,
                dataLength: chunkLen,
                isLeaf: true,
                chunkData: new Uint8Array(finalChunkData)  // Copy the chunk data
            }
            this.updateFrontierForNewLeaf(node)
            this.completedChunks++
        }

        // Combine all nodes in the frontier
        // Find all non-empty frontier entries (higher indices = larger subtrees = leftmost in tree)
        const nodes: TreeNode[] = []
        for (let i = this.frontier.length - 1; i >= 0; i--) {
            if (this.frontier[i]) {
                nodes.push(this.frontier[i])
            }
        }

        if (nodes.length === 0) {
            // Should never happen, but handle it
            const emptyLabel = hashChunk(new Uint8Array(0), true, this.chunkContext)
            return new BabDigest(emptyLabel)
        }

        if (nodes.length === 1) {
            // Single node - recompute as root
            return new BabDigest(this.recomputeAsRoot(nodes[0]))
        }

        // Multiple nodes - combine them from left to right
        let currentNode = nodes[0]
        for (let i = 1; i < nodes.length; i++) {
            const isRoot = (i === nodes.length - 1)
            const mergedLabel = hashInner(currentNode.label, nodes[i].label, BigInt(this.completedBytes), isRoot, this.innerContext)
            currentNode = {
                label: mergedLabel,
                left: currentNode,
                right: nodes[i],
                dataLength: currentNode.dataLength + nodes[i].dataLength,
                isLeaf: false
            }
        }

        return new BabDigest(currentNode.label)
    }

    // Recompute a tree node as root (with isRoot=true)
    private recomputeAsRoot(node: TreeNode): Uint8Array {
        if (node.isLeaf) {
            // Recompute the leaf with isRoot=true
            if (node.chunkData) {
                return hashChunk(node.chunkData, true, this.chunkContext)
            }
            // Shouldn't happen, but fallback to existing label
            return node.label
        }

        if (!node.left || !node.right) {
            // Missing children, return as-is
            return node.label
        }

        // Recursively get labels of children
        const leftLabel = node.left.label
        const rightLabel = node.right.label

        // Recompute with isRoot=true
        return hashInner(leftLabel, rightLabel, BigInt(node.dataLength), true, this.innerContext)
    }
}

// Check if the k-th bit is set in a number
function isBitSet(n: number, k: number): boolean {
    return ((n >> k) & 1) === 1
}
