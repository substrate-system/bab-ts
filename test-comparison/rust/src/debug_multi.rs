// Debug multi-chunk hashing
use bab_rs::{batch_hash, William3Digest};

fn bytes_to_hex(bytes: &[u8]) -> String {
    bytes.iter()
        .map(|b| format!("{:02x}", b))
        .collect::<String>()
}

fn main() {
    let test_string = "The quick brown fox jumps over the lazy dog. This is a longer text that will span multiple chunks.".repeat(20);
    let data = test_string.as_bytes();

    println!("Input length: {}", data.len());
    println!();

    // Full hash
    let mut digest = William3Digest::default();
    batch_hash(data, &mut digest);
    println!("Rust hash: {}", bytes_to_hex(digest.as_bytes()));
    println!();

    // First chunk (1024 bytes)
    let chunk1 = &data[0..1024];
    let mut chunk1_digest = William3Digest::default();
    batch_hash(chunk1, &mut chunk1_digest);
    println!("First chunk (1024 bytes) hash: {}", bytes_to_hex(chunk1_digest.as_bytes()));

    // Second chunk (936 bytes)
    let chunk2 = &data[1024..1960];
    let mut chunk2_digest = William3Digest::default();
    batch_hash(chunk2, &mut chunk2_digest);
    println!("Second chunk (936 bytes) hash: {}", bytes_to_hex(chunk2_digest.as_bytes()));
}
