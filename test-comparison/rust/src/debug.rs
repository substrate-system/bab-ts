// Debug output for Rust implementation
use bab_rs::{William3Digest, batch_hash};

fn bytes_to_hex(bytes: &[u8]) -> String {
    bytes.iter()
        .map(|b| format!("{:02x}", b))
        .collect::<String>()
}

fn main() {
    let input = b"hello";
    println!("Input: {:?}", input);
    println!("Input length: {}", input.len());
    println!();

    let mut digest = William3Digest::default();
    batch_hash(input, &mut digest);

    println!("Result: {}", bytes_to_hex(digest.as_bytes()));
}
