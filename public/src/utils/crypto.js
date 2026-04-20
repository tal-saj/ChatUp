// utils/crypto.js
// Pure Web Crypto API — no external libraries needed.
// Uses RSA-OAEP with SHA-256. Keys are stored in localStorage as JWK.
//
// KEY PERSISTENCE GUARANTEE:
//   Once a key pair is generated it is NEVER overwritten.
//   This ensures messages encrypted with your public key remain decryptable
//   across sessions, browser restarts, and re-logins.
//   The only way to lose decryptability is manually clearing localStorage.

const ALGO = {
  name: "RSA-OAEP",
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: "SHA-256",
};

const KEY_USAGE_PUBLIC  = ["encrypt"];
const KEY_USAGE_PRIVATE = ["decrypt"];
const KEY_USAGE_PAIR    = ["encrypt", "decrypt"];

const LOCAL_PRIVATE_KEY = "chatup-private-key";
const LOCAL_PUBLIC_KEY  = "chatup-public-key-jwk";

// ── Generate a new RSA key pair and store in localStorage ───────────────────
// NOTE: call this ONLY when hasKeyPair() returns false.
export async function generateAndStoreKeyPair() {
  const keyPair = await crypto.subtle.generateKey(ALGO, true, KEY_USAGE_PAIR);

  const publicJwk  = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

  localStorage.setItem(LOCAL_PUBLIC_KEY,  JSON.stringify(publicJwk));
  localStorage.setItem(LOCAL_PRIVATE_KEY, JSON.stringify(privateJwk));

  return { publicJwk, privateJwk };
}

// ── Get own public key JWK string (for uploading to server) ─────────────────
export function getStoredPublicKeyJwk() {
  return localStorage.getItem(LOCAL_PUBLIC_KEY); // raw JSON string
}

// ── Check if key pair already exists in localStorage ────────────────────────
export function hasKeyPair() {
  return !!(localStorage.getItem(LOCAL_PUBLIC_KEY) && localStorage.getItem(LOCAL_PRIVATE_KEY));
}

// ── Import a JWK public key (from server) for encryption ───────────────────
async function importPublicKey(jwkString) {
  const jwk = typeof jwkString === "string" ? JSON.parse(jwkString) : jwkString;
  return crypto.subtle.importKey("jwk", jwk, ALGO, false, KEY_USAGE_PUBLIC);
}

// ── Import own private key from localStorage for decryption ─────────────────
async function importPrivateKey() {
  const raw = localStorage.getItem(LOCAL_PRIVATE_KEY);
  if (!raw) throw new Error("No private key found in localStorage");
  const jwk = JSON.parse(raw);
  return crypto.subtle.importKey("jwk", jwk, ALGO, false, KEY_USAGE_PRIVATE);
}

// ── Encrypt a plaintext string with a given JWK public key string ───────────
export async function encryptMessage(plaintext, recipientPublicKeyJwk) {
  const key       = await importPublicKey(recipientPublicKeyJwk);
  const encoded   = new TextEncoder().encode(plaintext);
  const encrypted = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, key, encoded);
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)));
}

// ── Decrypt a Base64 ciphertext string using own private key ─────────────────
export async function decryptMessage(base64Ciphertext) {
  try {
    const key       = await importPrivateKey();
    const bytes     = Uint8Array.from(atob(base64Ciphertext), (c) => c.charCodeAt(0));
    const decrypted = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, key, bytes);
    return new TextDecoder().decode(decrypted);
  } catch (err) {
    console.error("Decryption failed:", err);
    return null;
  }
}
