// BabDigest - A wrapper around a fixed-size byte array
// Provides constant-time comparison to prevent timing attacks

export class BabDigest {
    private bytes:Uint8Array

    constructor (bytes:Uint8Array) {
        if (bytes.length !== 32) {
            throw new Error(
                `BabDigest must be exactly 32 bytes, got ${bytes.length}`
            )
        }
        this.bytes = new Uint8Array(bytes)
    }

    // Get the underlying bytes (returns a copy to prevent mutation)
    intoBytes ():Uint8Array {
        return new Uint8Array(this.bytes)
    }

    // Get immutable reference to bytes
    asBytes ():Readonly<Uint8Array> {
        return this.bytes
    }

    // Get mutable reference (use with caution)
    asMutBytes ():Uint8Array {
        return this.bytes
    }

    // Constant-time equality comparison
    equals (other:BabDigest):boolean {
        return constantTimeEq(this.bytes, other.bytes)
    }

    // Convert to hex string for display
    toHex ():string {
        return Array.from(this.bytes)
            .map(b => b.toString(16).padStart(2, '0'))
            .join('')
    }

    // Create from hex string
    static fromHex (hex:string):BabDigest {
        if (hex.length !== 64) {
            throw new Error(`Hex string must be exactly 64 characters, got ${hex.length}`)
        }
        const bytes = new Uint8Array(32)
        for (let i = 0; i < 32; i++) {
            bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
        }
        return new BabDigest(bytes)
    }

    // Standard equality for use with === operator
    // Note: This is not constant-time, use equals() for security-sensitive code
    toString ():string {
        return this.toHex()
    }
}

// Constant-time equality comparison
// Returns true if all bytes are equal, false otherwise
// This prevents timing attacks by always comparing all bytes
function constantTimeEq (a:Uint8Array, b:Uint8Array):boolean {
    if (a.length !== b.length) {
        return false
    }

    let result = 0
    for (let i = 0; i < a.length; i++) {
        result |= a[i] ^ b[i]
    }

    return result === 0
}
