# bab ts
[![tests](https://img.shields.io/github/actions/workflow/status/substrate-system/bab-ts/nodejs.yml?style=flat-square)](https://github.com/substrate-system/package/actions/workflows/nodejs.yml)
[![types](https://img.shields.io/npm/types/@substrate-system/icons?style=flat-square)](README.md)
[![module](https://img.shields.io/badge/module-ESM%2FCJS-blue?style=flat-square)](README.md)
[![semantic versioning](https://img.shields.io/badge/semver-2.0.0-blue?logo=semver&style=flat-square)](https://semver.org/)
[![Common Changelog](https://nichoth.github.io/badge/common-changelog.svg)](./CHANGELOG.md)
[![install size](https://flat.badgen.net/packagephobia/install/@substrate-system/bab-ts)](https://packagephobia.com/result?p=@substrate-system/bab-ts)
[![gzip size](https://img.shields.io/bundlephobia/minzip/@substrate-system/bab-ts?style=flat-square)](https://bundlephobia.com/@substrate-system/name/package/bab-ts)
[![dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen.svg?style=flat-square)](package.json)
[![license](https://img.shields.io/badge/license-Big_Time-blue?style=flat-square)](LICENSE)


[Bab](https://worm-blossom.github.io/bab/) in TypeScript.

Bab is a cryptographic hash function that lets you incrementally verify parts
of the download, as they stream in.

[I made a kind of elaborate demo page for this](https://substrate-system.github.io/bab-ts/).

<details><summary><h2>Contents</h2></summary>

<!-- toc -->

- [Install](#install)
- [Example](#example)
  * [A few definitions](#a-few-definitions)
  * [File Provider Perspective](#file-provider-perspective)
  * [File Downloader Perspective](#file-downloader-perspective)
  * [What is `ChunkMetadataLight`?](#what-is-chunkmetadatalight)
  * [Metadata Flow](#metadata-flow)
  * [Chunk Size Considerations](#chunk-size-considerations)
- [Use](#use)
  * [ESM](#esm)
  * [Common JS](#common-js)
  * [JS](#js)
  * [pre-built JS](#pre-built-js)

<!-- tocstop -->

</details>

## Install

Installation instructions

```sh
npm i -S @substrate-system/bab-ts
```

## Example

See [the demo page also](https://substrate-system.github.io/bab-ts/) for an
interactive version.

This example shows both sides of streaming verification: the file provider
(who has the data) and the file downloader (who wants to verify it).

### A few definitions

__Root Digest__

A cryptographic hash of the entire file, shared upfront via a trusted channel.

__Chunk Metadata (Light)__

Small verification data sent with each chunk during streaming


### File Provider Perspective

The provider has data to share. It should:

1. Build metadata for all chunks
2. Share the root digest via a trusted channel (out-of-band)
3. Stream chunks with their metadata


```ts
import {
    buildVerificationMetadata,
    BabDigest,
    type ChunkMetadataLight
} from '@substrate-system/bab-ts'

// The file provider has some data to share
const fileData = new TextEncoder().encode(
    'This is a large file that will be streamed in chunks...'
)

// Build verification metadata for all chunks upfront
const { rootDigest, chunks } = buildVerificationMetadata(fileData)

// Share the root digest via a trusted channel
// (e.g., signed message, QR code)
// The downloader will use this to verify chunks

console.log('Root digest (share this):', rootDigest.toHex())

// Prepare to stream chunks with their metadata
// The light version excludes the chunk data and chunk label,
// because they're not needed for verification
const chunksToStream = chunks.map(chunk => ({
    chunkIndex: chunk.chunkIndex,
    data: chunk.chunkData,
    // Use the lighten method to extract only verification metadata
    metadata: buildVerificationMetadata.lighten(chunk)
}))

// Stream each chunk with metadata
for (const { chunkIndex, chunkData, metadata } of chunksToStream) {
    // IRL, you would send this over the network
    // The metadata is sent WITH each chunk
    sendToDownloader({
        index: chunkIndex,
        data: chunkData,
        metadata: metadata  // siblingLabels, directions, lengths
    })
}
```

### File Downloader Perspective

The downloader receives:
1. The trusted root digest via a trusted channel
2. Chunks with metadata (streamed incrementally)

```ts
import {
  verifyChunk,
  BabDigest,
  type ChunkMetadataLight
} from '@substrate-system/bab-ts'

// Downloader receives the root digest via a trusted channel
// (e.g., from a signed message, a secure webpage, or scanned QR code)
const trustedRootDigest = BabDigest.fromHex(
    'a1b2c3d4...'  // The hex string from the provider
)

// Downloader also needs to know the total number of chunks
const totalChunks = 5  // Communicated by provider

// As each chunk arrives with its metadata, verify it immediately
function onChunkReceived(
    chunkData:Uint8Array,
    metadata:ChunkMetadataLight,
    chunkIndex:number
) {
    // Verify this chunk with the trusted root digest
    const isValid = verifyChunk(
        chunkData,
        metadata,
        totalChunks,
        trustedRootDigest
    )

    if (isValid) {
        console.log(`Chunk ${chunkIndex} verified successfully`)
        // Can immediately use/save this chunk
        processVerifiedChunk(chunkData, chunkIndex)
    } else {
        console.error(`Chunk ${chunkIndex} failed verification!`)
        // Reject this chunk - it may be corrupted or malicious
    }
}

// Simulate receiving chunks
onChunkReceived(
    receivedChunkData,     // Uint8Array
    receivedMetadata,      // ChunkMetadataLight
    0                      // chunk index
)
```

### What is `ChunkMetadataLight`?

The light metadata contains only what's needed to verify a chunk. Call
`buildVerificationMetadata.lighten` on any chunk to get the light metadata.


```ts
interface ChunkMetadataLight {
    // Sibling hashes along the Merkle tree path
    siblingLabels:Uint8Array[]

    // Which side each sibling is on (0 = left, 1 = right)
    siblingDirections:number[]

    // Combined data lengths at each merge point
    mergeLengths:number[]
}
```

This metadata is small (typically a few hundred bytes) and allows the
downloader to reconstruct the Merkle tree path from the chunk to the root,
verifying the chunk's authenticity.


### Metadata Flow

1. **Provider**: Builds all metadata upfront using `buildVerificationMetadata()`
2. **Provider**: Shares root digest upfront via trusted channel
3. **Provider**: For each chunk during streaming, sends:
   - The chunk data
   - The light metadata for that specific chunk
4. **Downloader**: Receives root digest first (trusted)
5. **Downloader**: For each chunk received, immediately verifies it using the
   chunk data + metadata + trusted root digest

### Chunk Size Considerations

The metadata size scales with the depth of the Merkle tree, which is roughly
`log2(number_of_chunks)`. Each chunk's metadata includes an array of sibling
labels (32 bytes each), one for each level of the tree.

**Default chunk size: 1024 bytes (1 KB)**

Examples of metadata overhead:
- **1 MB file** (1,024 chunks):
  ~10 sibling labels = **~320 bytes per chunk** (~32% overhead)
- **1 GB file** (1,048,576 chunks):
  ~20 sibling labels = **~640 bytes per chunk** (~62% overhead)

>
> [!IMPORTANT]  
> If you use very small chunks, the metadata can exceed the chunk
> size, defeating the purpose of streaming verification.
> For example, 64-byte chunks would have ~448 bytes of metadata per chunk
> (7x overhead) for a 1MB file.
> 


You can customize the chunk size:

```ts
buildVerificationMetadata(data, 4096)  // 4KB chunks
```

Choose a chunk size that balances:

- **Smaller chunks**: More frequent verification, better for
  slow/unreliable networks
- **Larger chunks**: Less metadata overhead, better for fast/reliable networks


-------


## Use

This exposes ESM and common JS via [package.json `exports` field](https://nodejs.org/api/packages.html#exports).

### ESM
```js
import '@substrate-system/bab-ts'
```

### Common JS
```js
require('@substrate-system/bab-ts')
```
### JS
```js
import '@substrate-system/bab-ts'
```

### pre-built JS

This package exposes minified JS files too. Copy them to a location that is
accessible to your web server, then link to them in HTML.

#### copy
```sh
cp ./node_modules/@substrate-system/bab-ts/dist/module.min.js ./public
```

#### HTML
```html
<script type="module" src="./module.min.js"></script>
```
