/**
 * ChatMe E2EE Crypto Utility
 * Uses Web Crypto API: ECDH for key exchange + AES-GCM for message encryption.
 * All operations are async and return ArrayBuffers / base64 strings.
 */

// ── Key Generation ────────────────────────────────────────────────────────────

/**
 * Generate a fresh ECDH key pair for this session.
 * Returns { publicKey, privateKey } as CryptoKey objects.
 */
export async function generateKeyPair() {
  return await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );
}

/**
 * Export a public key to a base64 string so it can be sent over WS.
 */
export async function exportPublicKey(publicKey) {
  const raw = await crypto.subtle.exportKey('raw', publicKey);
  return arrayBufferToBase64(raw);
}

/**
 * Import a peer's base64 public key back into a CryptoKey.
 */
export async function importPublicKey(base64) {
  const raw = base64ToArrayBuffer(base64);
  return await crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    []
  );
}

// ── Shared Secret Derivation ──────────────────────────────────────────────────

/**
 * Derive a symmetric AES-GCM key from our private key + peer's public key.
 */
export async function deriveSharedKey(myPrivateKey, peerPublicKey) {
  return await crypto.subtle.deriveKey(
    { name: 'ECDH', public: peerPublicKey },
    myPrivateKey,
    { name: 'AES-GCM', length: 256 },
    true, // extractable (allow exporting/persisting the derived key)
    ['encrypt', 'decrypt']
  );
}

/**
 * Export private key to a JWK string.
 */
export async function exportPrivateKey(privateKey) {
  const jwk = await crypto.subtle.exportKey('jwk', privateKey);
  return JSON.stringify(jwk);
}

/**
 * Import private key from a JWK string.
 */
export async function importPrivateKey(jwkString) {
  const jwk = JSON.parse(jwkString);
  return await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );
}

/**
 * Export a derived AES-GCM key to a base64 string.
 */
export async function exportSharedKey(sharedKey) {
  const raw = await crypto.subtle.exportKey('raw', sharedKey);
  return arrayBufferToBase64(raw);
}

/**
 * Import an AES-GCM key from a base64 string.
 */
export async function importSharedKey(base64) {
  const raw = base64ToArrayBuffer(base64);
  return await crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'AES-GCM' },
    true,
    ['encrypt', 'decrypt']
  );
}


// ── Encryption / Decryption ───────────────────────────────────────────────────

/**
 * Encrypt a plaintext string with AES-GCM.
 * Returns an object { iv, ciphertext } both as base64 strings.
 */
export async function encryptMessage(sharedKey, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    encoded
  );
  return {
    iv: arrayBufferToBase64(iv.buffer),
    ciphertext: arrayBufferToBase64(cipherBuffer)
  };
}

/**
 * Decrypt a ciphertext encrypted with AES-GCM.
 * Accepts the same shape as encryptMessage returns.
 */
export async function decryptMessage(sharedKey, { iv, ciphertext }) {
  try {
    const ivBuffer = base64ToArrayBuffer(iv);
    const cipherBuffer = base64ToArrayBuffer(ciphertext);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBuffer },
      sharedKey,
      cipherBuffer
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return '[Encrypted message — key mismatch]';
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = '';
  bytes.forEach(b => { str += String.fromCharCode(b); });
  return btoa(str);
}

function base64ToArrayBuffer(base64) {
  const str = atob(base64);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes.buffer;
}

// ── Session Key Store ─────────────────────────────────────────────────────────
// In-memory store: peerId -> { sharedKey, myPublicKeyBase64 }
const sessionKeys = new Map();

export function storeSharedKey(peerId, sharedKey) {
  sessionKeys.set(peerId, sharedKey);
  if (typeof window !== 'undefined' && window.localStorage) {
    exportSharedKey(sharedKey).then(b64 => {
      localStorage.setItem(`chatme_shared_key_${peerId}`, b64);
    }).catch(err => console.warn('Failed to persist shared key to localStorage:', err));
  }
}

export function getSharedKey(peerId) {
  return sessionKeys.get(peerId) || null;
}

export function clearSharedKey(peerId) {
  sessionKeys.delete(peerId);
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.removeItem(`chatme_shared_key_${peerId}`);
  }
}

export function hasSharedKey(peerId) {
  return sessionKeys.has(peerId);
}
