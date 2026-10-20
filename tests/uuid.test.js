import test from 'node:test';
import assert from 'node:assert/strict';
import { generateSecureUUID } from '../src/utils/uuid.js';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function withCrypto(stub, fn) {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    Object.defineProperty(globalThis, 'crypto', { value: stub, configurable: true, writable: true });
    try {
        return fn();
    } finally {
        if (original) Object.defineProperty(globalThis, 'crypto', original);
        else delete globalThis.crypto;
    }
}

test('menghasilkan UUID v4 pada konteks normal', () => {
    assert.match(generateSecureUUID(), UUID_V4);
});

test('tetap menghasilkan UUID v4 saat crypto.randomUUID melempar SecurityError', () => {
    const cryptoStub = {
        randomUUID() {
            throw new DOMException('The operation is insecure.', 'SecurityError');
        },
        getRandomValues(bytes) {
            for (let i = 0; i < bytes.length; i++) bytes[i] = i * 7;
            return bytes;
        }
    };
    const result = withCrypto(cryptoStub, () => generateSecureUUID());
    assert.match(result, UUID_V4);
});

test('tetap menghasilkan UUID v4 saat Web Crypto tidak tersedia', () => {
    const result = withCrypto(undefined, () => generateSecureUUID());
    assert.match(result, UUID_V4);
});

test('tidak pernah melempar walau semua API crypto menolak akses', () => {
    const cryptoStub = {
        randomUUID() {
            throw new DOMException('The operation is insecure.', 'SecurityError');
        },
        getRandomValues() {
            throw new DOMException('The operation is insecure.', 'SecurityError');
        }
    };
    const result = withCrypto(cryptoStub, () => generateSecureUUID());
    assert.match(result, UUID_V4);
});
