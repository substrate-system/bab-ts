// Test against official test vectors from Rust reference implementation
import { test } from '@substrate-system/tapzero'
import { batchHash } from '../src/index.js'

interface TestVector {
    description: string
    expected_hash: string
    input_bytes: number[]
}

// Official test vectors from Rust bab_rs reference implementation
const vectors: TestVector[] = [
    {
        description: 'empty string',
        input_bytes: [],
        expected_hash: '3b638fc8f2fb68418325a36b4718ffb07de457ac301393a845466a79eea3286b'
    },
    {
        description: 'single character "a"',
        input_bytes: [97],
        expected_hash: 'b25d11da901aa99501f67721aac02bcef1f3fc67adbada141454f46310ecaa48'
    },
    {
        description: 'hello',
        input_bytes: [104, 101, 108, 108, 111],
        expected_hash: '14cbee0d4b33e33431dbeb2cc8d5eb54204c256315f34f4d7bac151b9696c3d3'
    },
    {
        description: 'hello world',
        input_bytes: [104, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100],
        expected_hash: '5d70555767754cbd71ad5b999ecf71bedb6141a75687c20350c9968ac484fbd2'
    },
    {
        description: 'BLAKE3',
        input_bytes: [66, 76, 65, 75, 69, 51],
        expected_hash: '4f35ef04663e51012a11ecfa6039f1ffb1d7382e89bb5cc9a783187fa7f2d904'
    },
    {
        description: 'WILLIAM3',
        input_bytes: [87, 73, 76, 76, 73, 65, 77, 51],
        expected_hash: '8e136e0ed3eae636a47c55fe80e12541775067baaafa4d7089b2234746cffc8a'
    }
]

test('Bab WILLIAM3 test vectors', (t) => {
    for (const vector of vectors) {
        const data = new Uint8Array(vector.input_bytes)
        const digest = batchHash(data)
        const actual = digest.toHex()

        t.equal(
            actual,
            vector.expected_hash,
            `${vector.description}: hash should match`
        )
    }
})
