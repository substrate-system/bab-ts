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
  * [Metadata Flow](#metadata-flow)
  * [Chunk Size Considerations](#chunk-size-considerations)
- [Use](#use)
  * [ESM](#esm)
  * [Common JS](#common-js)
  * [JS](#js)
  * [pre-built JS](#pre-built-js)
- [Test](#test)
  * [Compare](#compare)
  * [The `compare` script](#the-compare-script)

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

__Chunk Metadata__

Verification data for each chunk, including sibling labels from the Merkle tree path


### File Provider Perspective

The provider has data to share. It should:

1. Build metadata for all chunks
2. Share the root digest via a trusted channel (out-of-band)
3. Stream chunks with their metadata


```ts
import {
    buildVerificationMetadata,
    BabDigest,
    type ChunkVerificationData
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

// Stream each chunk with its metadata
for (const chunk of chunks) {
    // IRL, you would send this over the network
    // The chunk includes both data and verification metadata
    sendToDownloader({
        index: chunk.chunkIndex,
        data: chunk.chunkData,
        // Metadata includes siblingLabels, siblingDirections, and mergeLengths
        metadata: chunk
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
  type ChunkVerificationData
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
    metadata:ChunkVerificationData,
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
    receivedMetadata,      // ChunkVerificationData
    0                      // chunk index
)
```

### Metadata Flow

1. **Provider**: Builds all metadata upfront using `buildVerificationMetadata()`
2. **Provider**: Shares root digest upfront via trusted channel
3. **Provider**: For each chunk during streaming, sends:
   - The chunk data (`chunkData`)
   - The verification metadata (`siblingLabels`, `siblingDirections`, `mergeLengths`)
4. **Downloader**: Receives root digest first (trusted)
5. **Downloader**: For each chunk received, immediately verifies it using the
   chunk data + verification metadata + trusted root digest

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

-------


## Test

### Compare

```sh
npm run compare
```

Create output from the rust version, and compare it to the output from
this module. This command runs the file
[run-comparison.ts](./test-comparison/run-comparison.ts),
which calls the [Rust version of bab](https://codeberg.org/worm-blossom/bab_rs).

#### Rust Dependency

That means that this module depends on the Rust module for the tests. That's
what [./test-comparison/rust/Cargo.toml](./test-comparison/rust/Cargo.toml)
is for.

You need Rust to do this.

##### Install Rust

```sh
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

That's it. Then you can run the `npm run compare` test.


When you call `npm run compare`, it executes:

```sh
cargo run --release --bin bab-comparison
```

Then Cargo (Rust's package manager):

1. Downloads `bab_rs` from https://codeberg.org/worm-blossom/bab_rs.git
2. Compiles it
3. Runs the comparison binary




### The `compare` script

Execute these steps:

1. Run TypeScript implementation (lines 63-99 in
   [run-comparison.ts](./test-comparison/run-comparison.ts#L63)):
    - Execute `batchHash()` and `buildVerificationMetadata()` from this
      module on test cases
    - Write results to `test-comparison/ts-output.json`
2. Run Rust implementation (lines 102-111):
    - Execute `cargo run --release --bin bab-comparison`
    - This compiles and runs the Rust binary which generates output using
      the `bab_rs` library
    - Write results to `test-comparison/rust-output.json`
3. Compare outputs (lines 122-161):
    - Load both JSON files
    - Run 17 tests comparing:
        * Batch hashes for "hello world", empty string, single chunk, and
          multiple chunks
        * Input byte lengths
        * Number of chunks
    - Use `tapzero` to report results
