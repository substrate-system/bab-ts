# Bab Implementation Comparison

This directory contains scripts to compare the TypeScript and Rust
implementations of Bab hash functions.


## Prerequisites

### For TypeScript

- Node.js installed ✓ (you already have this)
- Project built: `npm run build` ✓

### For Rust (first time only)

Install Rust using rustup:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```
Then restart your terminal.

## Quick Start

### Run Complete Comparison

```bash
npm run compare
```

This command will:
1. Generate TypeScript output with verification metadata
2. Build and run Rust comparison (downloads dependencies on first run)
3. Compare both outputs and report any differences

**Note**: The Rust bab_rs library doesn't have verification metadata functions yet, so it only outputs batch hashes for comparison.

## What Gets Compared

Both implementations hash the same test data with 1024-byte chunks:

1. **simple**: "hello world" (11 bytes, single chunk)
2. **empty**: Empty string (0 bytes)
3. **single_chunk**: "hello" (5 bytes, single chunk)
4. **multiple_chunks**: Longer text (1960 bytes, multiple chunks)

## Output Files

After running `npm run compare`, you'll find:
- `typescript-output.json` - Full output including verification metadata
- `rust-output.json` - Batch hashes from Rust implementation

The TypeScript output includes verification metadata (sibling labels, directions, merge lengths) while Rust only outputs batch hashes.

## Troubleshooting

### Rust compilation errors
- Make sure you have the latest Rust: `rustup update`
- The Rust code fetches bab_rs from Codeberg

### TypeScript errors
- Make sure the project is built: `npm run build`
- Check that Node.js version is 18+: `node --version`
