// Generate test output for comparison with TypeScript implementation
use serde::{Serialize, Deserialize};
use std::fs::File;
use std::io::Write;

// Import from bab_rs
use bab_rs::{batch_hash, William3Digest};

#[derive(Serialize, Deserialize)]
struct TestInput {
    text: String,
    bytes: Vec<u8>,
    #[serde(rename = "chunkSize")]
    chunk_size: usize,
}

#[derive(Serialize, Deserialize)]
struct TestOutput {
    name: String,
    input: TestInput,
    #[serde(rename = "batchHash")]
    batch_hash: String,
    // Note: Rust version doesn't have verification metadata yet
    // verificationMetadata: Option<VerificationMetadata>
}

fn bytes_to_hex(bytes: &[u8]) -> String {
    bytes.iter()
        .map(|b| format!("{:02x}", b))
        .collect::<String>()
}

fn main() {
    // Note: bab_rs uses a fixed 1024-byte chunk size internally
    // The chunk_size values here are just for JSON output compatibility
    let base_text = "The quick brown fox jumps over the lazy dog. This is a longer text that will span multiple chunks.";
    let long_text = base_text.repeat(20);

    let test_cases = vec![
        ("simple", "hello world", 1024),
        ("empty", "", 1024),
        ("single_chunk", "hello", 1024),
        ("multiple_chunks", &long_text, 1024),
    ];

    let mut results = Vec::new();

    for (name, text, chunk_size) in test_cases.iter() {
        let data = text.as_bytes();

        // Compute batch hash
        let mut digest = William3Digest::default();
        batch_hash(data, &mut digest);

        let output = TestOutput {
            name: name.to_string(),
            input: TestInput {
                text: text.to_string(),
                bytes: data.to_vec(),
                chunk_size: *chunk_size,
            },
            batch_hash: bytes_to_hex(digest.as_bytes()),
        };

        results.push(output);
    }

    // Write to file
    let json = serde_json::to_string_pretty(&results).unwrap();
    let mut file = File::create("../rust-output.json").unwrap();
    file.write_all(json.as_bytes()).unwrap();

    println!("✓ Rust output written to: test-comparison/rust-output.json");
    println!("✓ Generated {} test cases", results.len());
}
