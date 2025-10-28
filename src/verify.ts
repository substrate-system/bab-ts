// Incremental Verification API for Bab
// verify streaming data against a trusted root digest

import { BabDigest } from './digest.js'
import { hashChunk, hashInner, createContexts } from './william3.js'

// Build the Merkle tree bottom-up
// Tree nodes store the label and information about which chunks they cover
interface TreeNode {
    label:Uint8Array
    startChunk:number
    endChunk:number // exclusive
    dataLength:number
    left?:TreeNode
    right?:TreeNode
}

// metadata for a single chunk
export interface ChunkVerificationData {
    chunkIndex:number
    chunkData:Uint8Array
    chunkLabel:Uint8Array
    // Sibling labels along the path from chunk to root
    // These are sent by the server during streaming
    siblingLabels:Uint8Array[]
    // Directions (left=0, right=1) for each sibling
    // Tells us whether the sibling is on the left or right
    siblingDirections:number[]
    // Total data length at each merge point (combined left + right)
    mergeLengths:number[]
}

// Build verification metadata for all chunks in the data
export function buildVerificationMetadata (
    data:Uint8Array,
    chunkSize?:number
):{
    rootDigest:BabDigest
    chunks:ChunkVerificationData[]
} {
    const { chunkContext, innerContext } = createContexts(chunkSize)
    const actualChunkSize = chunkContext.getChunkSize()

    // Split data into chunks
    const chunks:Uint8Array[] = []
    for (let i = 0; i < data.length; i += actualChunkSize) {
        chunks.push(data.slice(i, Math.min(i + actualChunkSize, data.length)))
    }

    if (chunks.length === 0) {
        // Empty data
        const emptyLabel = hashChunk(new Uint8Array(0), true, chunkContext)
        return {
            rootDigest: new BabDigest(emptyLabel),
            chunks: []
        }
    }

    // Create leaf nodes
    let currentLevel:TreeNode[] = chunks.map((chunk, index) => {
        const isOnlyChunk = chunks.length === 1
        const label = hashChunk(chunk, isOnlyChunk, chunkContext)
        return {
            label,
            startChunk: index,
            endChunk: index + 1,
            dataLength: chunk.length
        }
    })

    // Build tree upward
    while (currentLevel.length > 1) {
        const nextLevel:TreeNode[] = []

        for (let i = 0; i < currentLevel.length; i += 2) {
            if (i + 1 < currentLevel.length) {
                // Pair of nodes
                const left = currentLevel[i]
                const right = currentLevel[i + 1]
                const combinedLength = left.dataLength + right.dataLength
                const isRoot = nextLevel.length === 0 && i + 2 >= currentLevel.length

                const label = hashInner(
                    left.label,
                    right.label,
                    BigInt(combinedLength),
                    isRoot,
                    innerContext
                )

                nextLevel.push({
                    label,
                    startChunk: left.startChunk,
                    endChunk: right.endChunk,
                    dataLength: combinedLength,
                    left,
                    right
                })
            } else {
                // Odd node - promote to next level
                nextLevel.push(currentLevel[i])
            }
        }

        currentLevel = nextLevel
    }

    const root = currentLevel[0]

    // Recompute root with isRoot=true flag
    let rootLabel:Uint8Array
    if (!root.left && !root.right) {
        // Single leaf - recompute with isRoot=true
        rootLabel = hashChunk(chunks[0], true, chunkContext)
    } else if (root.left && root.right) {
        // Inner node - recompute with isRoot=true
        rootLabel = hashInner(
            root.left.label,
            root.right.label,
            BigInt(root.dataLength),
            true,
            innerContext
        )
    } else {
        rootLabel = root.label
    }

    // Extract sibling labels for each chunk
    const verificationData:ChunkVerificationData[] = chunks.map((chunk, chunkIndex) => {
        const siblingLabels:Uint8Array[] = []
        const siblingDirections:number[] = []
        const mergeLengths:number[] = []

        // Traverse from root to this chunk, collecting siblings
        function traverse (node:TreeNode):boolean {
            if (!node.left && !node.right) {
                // Leaf node - found our chunk
                return node.startChunk === chunkIndex
            }

            // Check left subtree
            if (
                node.left &&
                (chunkIndex >= node.left.startChunk) &&
                (chunkIndex < node.left.endChunk)
            ) {
                // Our chunk is in the left subtree
                if (node.right) {
                    // Add right sibling
                    siblingLabels.push(node.right.label)
                    siblingDirections.push(1) // sibling is on the right
                    mergeLengths.push(node.dataLength) // Total length of this merge
                }
                return traverse(node.left)
            }

            // Check right subtree
            if (
                node.right &&
                chunkIndex >= node.right.startChunk &&
                chunkIndex < node.right.endChunk
            ) {
                // Our chunk is in the right subtree
                if (node.left) {
                    // Add left sibling
                    siblingLabels.push(node.left.label)
                    siblingDirections.push(0)  // sibling is on the left
                    mergeLengths.push(node.dataLength)  // Total length of merge
                }
                return traverse(node.right)
            }

            return false
        }

        traverse(root)

        const isOnlyChunk = chunks.length === 1
        const chunkLabel = hashChunk(chunk, isOnlyChunk, chunkContext)

        return {
            chunkIndex,
            chunkData: chunk,
            chunkLabel,
            siblingLabels,
            siblingDirections,
            mergeLengths
        }
    })

    return {
        rootDigest: new BabDigest(rootLabel),
        chunks: verificationData
    }
}

// Verify a chunk against a trusted root digest
export function verifyChunk (
    chunkData:Uint8Array,
    totalChunks:number,
    siblingLabels:Uint8Array[],
    siblingDirections:number[],
    trustedRoot:BabDigest,
    chunkSize?:number,
    mergeLengths?:number[]
): boolean {
    const { chunkContext, innerContext } = createContexts(chunkSize)

    // Compute chunk label
    const isOnlyChunk = totalChunks === 1
    let currentLabel = hashChunk(chunkData, isOnlyChunk, chunkContext)

    // If it's the only chunk, compare directly
    if (isOnlyChunk) {
        return trustedRoot.equals(new BabDigest(currentLabel))
    }

    // Otherwise, reconstruct the path to the root using sibling labels
    for (let i = siblingLabels.length - 1; i >= 0; i--) {
        const siblingLabel = siblingLabels[i]
        const isOnLeft = siblingDirections[i] === 0

        // Get the combined length for this merge point
        const combinedLength = mergeLengths ? BigInt(mergeLengths[i]) : BigInt(0)

        let leftLabel:Uint8Array
        let rightLabel:Uint8Array

        if (isOnLeft) {
            // Sibling is on the left, we are on the right
            leftLabel = siblingLabel
            rightLabel = currentLabel
        } else {
            // Sibling is on the right, we are on the left
            leftLabel = currentLabel
            rightLabel = siblingLabel
        }

        const isRoot = (i === 0)
        currentLabel = hashInner(
            leftLabel,
            rightLabel,
            combinedLength,
            isRoot,
            innerContext
        )
    }

    // Compare with trusted root
    return trustedRoot.equals(new BabDigest(currentLabel))
}
