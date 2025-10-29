// Generate test vectors from the Rust reference implementation
use bab_rs::{batch_hash, William3Digest};
use serde::{Serialize, Deserialize};
use std::fs::File;
use std::io::Write as IoWrite;

#[derive(Serialize, Deserialize)]
struct TestVector {
    description: String,
    input_text: String,
    input_bytes: Vec<u8>,
    expected_hash: String,
}

fn bytes_to_hex(bytes: &[u8]) -> String {
    bytes.iter()
        .map(|b| format!("{:02x}", b))
        .collect::<String>()
}

fn main() {
    println!("Generating Bab WILLIAM3 Test Vectors...\n");

    // Create owned strings for repeated inputs
    let bytes_256 = "a".repeat(256);
    let bytes_1024 = "b".repeat(1024);
    let bytes_1025 = "x".repeat(1025);
    let bytes_2048 = "c".repeat(2048);

    let test_inputs: Vec<(&str, &str)> = vec![
        ("empty string", ""),
        ("single character", "a"),
        ("hello", "hello"),
        ("hello world", "hello world"),
        ("BLAKE3", "BLAKE3"),
        ("WILLIAM3", "WILLIAM3"),
        ("256 bytes of 'a'", &bytes_256),
        ("1024 bytes of 'b'", &bytes_1024),
        ("1025 bytes (crosses chunk boundary)", &bytes_1025),
        ("2048 bytes", &bytes_2048),
        ("all ASCII printable chars", " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~"),
    ];

    let mut vectors = Vec::new();

    for (description, text) in test_inputs.iter() {
        let data = text.as_bytes();
        let mut digest = William3Digest::default();
        batch_hash(data, &mut digest);

        let vector = TestVector {
            description: description.to_string(),
            input_text: if data.len() > 100 {
                format!("{}... ({} bytes total)", &text[..100], data.len())
            } else {
                text.to_string()
            },
            input_bytes: data.to_vec(),
            expected_hash: bytes_to_hex(digest.as_bytes()),
        };

        println!("✓ {}: {}", description, vector.expected_hash);
        vectors.push(vector);
    }

    // Write to JSON file
    let json = serde_json::to_string_pretty(&vectors).unwrap();
    let mut file = File::create("../../test-vectors.json").unwrap();
    file.write_all(json.as_bytes()).unwrap();

    println!("\n✓ Test vectors written to: test-comparison/test-vectors.json");
    println!("✓ Generated {} test vectors", vectors.len());
}
