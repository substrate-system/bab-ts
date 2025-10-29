// Detailed trace of multi-chunk hashing
use bab_rs::{William3Digest, hash_chunk, hash_inner, HashChunkContext, HashInnerContext};

fn bytes_to_hex(bytes: &[u8]) -> String {
    bytes.iter()
        .map(|b| format!("{:02x}", b))
        .collect::<String>()
}

fn main() {
    let test_string = "The quick brown fox jumps over the lazy dog. This is a longer text that will span multiple chunks.".repeat(20);
    let data = test_string.as_bytes();

    println!("Total data length: {}", data.len());
    println!();

    let chunk_context = HashChunkContext::new();
    let inner_context = HashInnerContext::new();

    // For 1960 bytes, split at 1024
    let left_data = &data[0..1024];
    let right_data = &data[1024..];

    println!("Left chunk: 0..1024 bytes");
    let mut left_hash = [0u8; 32];
    hash_chunk(left_data, false, &chunk_context, &mut left_hash);
    println!("Left hash (isRoot=false): {}", bytes_to_hex(&left_hash));
    println!();

    println!("Right chunk: 1024..1960 bytes");
    let mut right_hash = [0u8; 32];
    hash_chunk(right_data, false, &chunk_context, &mut right_hash);
    println!("Right hash (isRoot=false): {}", bytes_to_hex(&right_hash));
    println!();

    println!("Combining with hash_inner");
    println!("  leftLabel: {}", bytes_to_hex(&left_hash));
    println!("  rightLabel: {}", bytes_to_hex(&right_hash));
    println!("  length: {}", data.len());
    println!("  isRoot: true");
    let mut root_hash = [0u8; 32];
    hash_inner(&left_hash, &right_hash, data.len() as u64, true, &inner_context, &mut root_hash);
    println!("Root hash: {}", bytes_to_hex(&root_hash));
}
