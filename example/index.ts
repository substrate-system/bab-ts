import { type FunctionComponent, render } from 'preact'
import { useCallback } from 'preact/hooks'
import { html } from 'htm/preact'
import { useComputed, useSignal } from '@preact/signals'
import Debug from '@substrate-system/debug'
import { concat } from 'uint8arrays'
import {
    batchHash,
    buildVerificationMetadata,
    verifyChunk,
    BabDigest
} from '../src/index.js'
import { type ChunkMetadataLight } from '../src/verify.js'
const debug = Debug(import.meta.env.DEV)

const NBSP = '\u00A0'
const CHUNK_SIZE = 8  // Each input will be padded to 8 bytes = 1 chunk

const Example:FunctionComponent = function () {
    const batchInput = useSignal('hello world')
    const batchOutput = useSignal('')

    const incrementals = useSignal<string[]>(['hello', ' ', 'world'])
    const incrementalHashes = useSignal<string[]>([])
    const incrementalOutput = useSignal<string>('')

    // Verification state
    const verifyInputs = useSignal<string[]>(['hello', ' ', 'world'])
    const trustedRoot = useSignal<string>('')
    const verificationMetadata = useSignal<ChunkMetadataLight[]>([])
    const verificationResults = useSignal<Array<boolean|null>>([null, null, null])
    const verificationResultClasses = useComputed<(string)[]>(() => {
        return verificationResults.value.map(r => {
            if (r === null) return ''
            else return r ? 'valid' : 'invalid'
        })
    })

    // @ts-expect-error dev
    window.state = {
        incrementals,
        incrementalHashes,
        incrementalOutput,
        verifyInputs,
        trustedRoot,
        verificationMetadata,
        verificationResults
    }

    function hashBatch () {
        try {
            // const encoder = new TextEncoder()
            // const data = encoder.encode(batchInput.value)
            const input = batchInput.value.split(' ')
            const data = input.flatMap((word, index) => {
                // If it's the last word, just return the word.
                // Otherwise, return the word and a space element.
                if (index < input.length - 1) {
                    return [word, ' ']
                } else {
                    return [word]
                }
            })

            const buffers = data.map(str => padToChunkSize(str))

            const digest = batchHash(concat(buffers), CHUNK_SIZE)
            batchOutput.value = digest.toHex()
        } catch (_err) {
            const err = _err as Error
            debug('errrrr', err)
        }
    }

    // Build the trusted root digest from the verification inputs
    const buildTrustedRoot = useCallback(() => {
        try {
            // Pad each input and concatenate
            const buffers = verifyInputs.value.map(str => padToChunkSize(str))
            const fullData = concat(buffers)

            // Build verification metadata
            const metadata = buildVerificationMetadata(fullData, CHUNK_SIZE)

            // Store metadata and trusted root
            verificationMetadata.value = metadata.chunks.map(chunk => {
                return buildVerificationMetadata.lighten(chunk)
            })
            trustedRoot.value = metadata.rootDigest.toHex()

            // Reset verification results
            verificationResults.value = [null, null, null]

            debug('Built verification metadata:', metadata)
        } catch (_err) {
            const err = _err as Error
            debug('Error building trusted root:', err)
        }
    }, [])

    /**
     * Verify a single chunk.
     */
    const verifyChunkAtIndex = useCallback((ev:MouseEvent) => {
        ev.preventDefault()
        const { index } = (ev.target as HTMLButtonElement).dataset
        const chunkIndex = parseInt(index!)

        try {
            if (!trustedRoot.value) {
                debug('No trusted root available')
                return
            }

            // Pad the current input
            const chunkData = padToChunkSize(verifyInputs.value[chunkIndex])
            const metadata = verificationMetadata.value[chunkIndex]

            if (!metadata) {
                debug('No metadata for chunk', chunkIndex)
                return
            }

            // Verify the chunk
            const trustedDigest = BabDigest.fromHex(trustedRoot.value)
            const isValid = verifyChunk(
                chunkData,  // the data to check
                metadata,  // chunk metadata
                verifyInputs.value.length,  // number of chunks
                trustedDigest,  // hash of everything (root hash)
                CHUNK_SIZE,  // chunk size -- 8 bytes for us
            )

            // Update results
            const results = [...verificationResults.value]
            results[chunkIndex] = isValid
            verificationResults.value = results

            debug(`Chunk ${chunkIndex} verification:`, isValid)
        } catch (_err) {
            const err = _err as Error
            debug('Error verifying chunk:', err)
        }
    }, [])

    return html`
        <main>
            <h1>Bab Hash Function</h1>
            <p class="subtitle">
                A cryptographic hash function for verifiable streaming and
                content-addressable storage
            </p>

            <div class="info">
                <h2>About Bab</h2>
                <ul>
                    <li><strong>Default Chunk Size:</strong> 1024 bytes</li>
                    <li><strong>Demo Chunk Size:</strong> ${CHUNK_SIZE} bytes (configurable)</li>
                    <li><strong>Digest Size:</strong> 32 bytes (256 bits)</li>
                    <li><strong>Algorithm:</strong> WILLIAM3 (BLAKE3-based)</li>
                </ul>
                <p>
                    Learn more at <a
                        href="https://worm-blossom.github.io/bab/"
                        target="_blank"
                        rel="noopener"
                    >
                        worm-blossom.github.io/bab
                    </a>
                </p>
            </div>

            <div class="method">
                <h2>Batch Hashing</h2>
                <p class="description">
                    Hash the data all at once.
                </p>
                <input
                    type="text"
                    value=${batchInput}
                    onInput=${(e:any) => { batchInput.value = e.target.value }}
                    placeholder="Enter text to hash"
                    class="input"
                />
                <button onClick=${hashBatch} class="button">
                    Hash (Batch)
                </button>
                ${batchOutput && html`
                    <div class="output">
                        <strong>Digest:</strong>
                        <code class="digest">${batchOutput}</code>
                    </div>
                `}
            </div>

            <div class="method verification">
                <h2>Incremental Verification</h2>
                <p class="description">
                    Verify chunks as they arrive, without waiting for the
                    complete file. Before verifying the chunks, we need
                    to call${NBSP}
                </p>

                <pre>
                    <code>
                        buildVerificationMetadata(fullData, CHUNK_SIZE)
                    </code>
                </pre>

                <p>
                    on the complete buffer. The function${NBSP}
                    <code>buildVerificationMetadata</code> is exposed in the
                    file <code>./src/verify.ts</code>. This metadata should
                    be created before transferring the data.
                </p>

                <div class="verification-explainer">
                    <p><strong>How it works:</strong></p>
                    <ol>
                        <li>
                            <strong>Get trusted root: </strong>
                            You receive the file's hash from a trusted source
                            (signed manifest, CID, etc.)
                        </li>
                        <li>
                            <strong>Chunks arrive with proof: </strong>
                            Each chunk comes with sibling labels from the
                            Merkle tree
                        </li>
                        <li>
                            <strong>Verify immediately: </strong>
                            You verify each chunk against the trusted root as
                            it arrives
                        </li>
                    </ol>
                </div>

                <div class="step">
                    <h3>Step 1: Build Trusted Root</h3>
                    <p>
                        First, simulate getting the "original" file and its
                        trusted root digest:
                    </p>

                    ${[0, 1, 2].map(i => html`
                        <div class="verify-input-group">
                            <strong>Chunk ${i + 1}:</strong>
                            <input
                                type="text"
                                name="chunk${i + 1}"
                                value=${!verifyInputs.value[i].trim() ? '(whitespace)' : verifyInputs.value[i]}
                                onInput=${(e:any) => {
                                    const newInputs = [...verifyInputs.value]
                                    newInputs[i] = e.target.value
                                    verifyInputs.value = newInputs
                                }}
                                placeholder="Chunk ${i + 1} data"
                                class="root-input input${!verifyInputs.value[i].trim() ? ' whitespace' : ''}"
                                maxlength="${CHUNK_SIZE}"
                            />
                            <span class="byte-count">
                                (${verifyInputs.value[i].length}/${CHUNK_SIZE} bytes)
                            </span>
                        </div>
                    `)}

                    <button onClick=${buildTrustedRoot} class="button">
                        Build Trusted Root Digest
                    </button>

                    ${trustedRoot.value && html`
                        <div class="output trusted-root">
                            <strong>Trusted Root Digest:</strong>
                            <code class="digest">${trustedRoot.value}</code>

                            <strong>Chunk metadata:</strong>
                            <p>
                                One metadata for each chunk.
                            </p>
                            <pre>
                                ${JSON.stringify(
                                    verificationMetadata,
                                    customStringifier,
                                    2
                                )}
                            </pre>

                            <p class="note">
                                In practice, you'd receive this from a trusted
                                source. Now you can verify chunks as
                                they stream in.
                            </p>
                        </div>
                    `}
                </div>

                ${trustedRoot.value && html`
                    <div class="step">
                        <h3>Step 2: Verify Chunks as They Arrive</h3>
                        <p>
                            Simulate chunks arriving one at a time. Try
                            changing a chunk to see verification fail.
                        </p>

                        <p>
                            Here we call <code>verifyChunk</code> with the
                            chunk data, the metadata for that chunk,
                            the root hash, and the total number of chunks.
                        </p>

                        ${[0, 1, 2].map(i => html`
                            <div class="verify-chunk-section">
                                <div>
                                    <strong>Chunk ${i + 1}:</strong>
                                    <input
                                        type="text"
                                        value=${verifyInputs.value[i].trim() ?
                                            verifyInputs.value[i] :
                                            '(white space)'}
                                        onInput=${(e:any) => {
                                            const newInputs = [...verifyInputs.value]
                                            newInputs[i] = e.target.value
                                            debug('new input value', newInputs[i])
                                            verifyInputs.value = newInputs

                                            // Reset verification result when input changes
                                            const newResults = [...verificationResults.value]
                                            newResults[i] = null
                                            verificationResults.value = newResults
                                        }}
                                        placeholder="Chunk ${i + 1} data"
                                        class="input ${verifyInputs.value[i].trim() ? verifyInputs.value[i] : 'whitespace'}"
                                        maxlength="${CHUNK_SIZE}"
                                    />
                                </div>

                                <button
                                    data-index="${i}"
                                    onClick=${verifyChunkAtIndex}
                                    class="button verify-btn"
                                >
                                    Verify Chunk ${i + 1}
                                </button>

                                <div
                                    class="verification-result ${verificationResultClasses.value[i]}"
                                >
                                    <span class="valid">[x] Valid</span>
                                    <span class="invalid">not valid...</span>
                                </div>
                            </div>
                        `)}

                        <div class="verification-note">
                            <p>
                                <strong>Try it: </strong>
                                Change "hello" to "hallo" in Chunk 1 and
                                verify it.  It will fail immediately without
                                downloading the rest!
                            </p>
                        </div>
                    </div>
                `}
            </div>

        </main>
    `
}

render(html`<${Example} />`, document.getElementById('root')!)

// Pad a string to CHUNK_SIZE bytes
function padToChunkSize (str:string):Uint8Array {
    const encoder = new TextEncoder()
    const data = encoder.encode(str)
    const padded = new Uint8Array(CHUNK_SIZE)
    padded.set(data.slice(0, CHUNK_SIZE))

    return padded
}

function customStringifier (_key, value) {
    if (value instanceof Uint8Array ||
      (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) ||
      (typeof DataView !== 'undefined' && value instanceof DataView)
    ) {
        return 'buffer: ' + value.byteLength + ' bytes'
    }
    return value  // Return the original value for other types
}
