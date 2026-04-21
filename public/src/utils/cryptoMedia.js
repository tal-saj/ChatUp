// utils/cryptoMedia.js
// AES-GCM symmetric encryption for media files.
// Flow:
//   1. Generate a random 256-bit AES-GCM key
//   2. Encrypt the file bytes with AES-GCM
//   3. Export the AES key as raw bytes, then encrypt THAT with
//      RSA-OAEP (same keys already in localStorage) — once for sender, once for recipient
//   4. Upload the encrypted blob to the server; store the two encrypted AES keys
//
// On receipt:
//   1. Decrypt the AES key with your RSA private key
//   2. Import the raw AES key
//   3. Decrypt the blob bytes
//   4. Create an object URL for display / download

// ── AES-GCM helpers ──────────────────────────────────────────────────────────

export async function generateAesKey() {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function aesEncrypt(aesKey, arrayBuffer) {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    arrayBuffer
  );
  // Prepend IV so we can recover it on decrypt (iv || ciphertext)
  const result = new Uint8Array(iv.byteLength + encrypted.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encrypted), iv.byteLength);
  return result.buffer;
}

export async function aesDecrypt(aesKey, arrayBuffer) {
  const data = new Uint8Array(arrayBuffer);
  const iv = data.slice(0, 12);
  const ciphertext = data.slice(12);
  return crypto.subtle.decrypt({ name: "AES-GCM", iv }, aesKey, ciphertext);
}

// ── RSA wrapping of AES key ───────────────────────────────────────────────────

const RSA_ALGO = { name: "RSA-OAEP", hash: "SHA-256" };

async function importRsaPublicKey(jwkString) {
  const jwk = typeof jwkString === "string" ? JSON.parse(jwkString) : jwkString;
  return crypto.subtle.importKey("jwk", jwk, RSA_ALGO, false, ["encrypt"]);
}

async function importRsaPrivateKey() {
  const raw = localStorage.getItem("chatup-private-key");
  if (!raw) throw new Error("No private key in localStorage");
  const jwk = JSON.parse(raw);
  return crypto.subtle.importKey("jwk", jwk, RSA_ALGO, false, ["decrypt"]);
}

export async function wrapAesKey(aesKey, recipientPublicKeyJwk) {
  const rsaKey = await importRsaPublicKey(recipientPublicKeyJwk);
  const rawAes = await crypto.subtle.exportKey("raw", aesKey);
  const wrapped = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, rsaKey, rawAes);
  return btoa(String.fromCharCode(...new Uint8Array(wrapped)));
}

export async function unwrapAesKey(wrappedBase64) {
  const rsaKey = await importRsaPrivateKey();
  const bytes = Uint8Array.from(atob(wrappedBase64), (c) => c.charCodeAt(0));
  const rawAes = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, rsaKey, bytes);
  return crypto.subtle.importKey("raw", rawAes, { name: "AES-GCM" }, false, ["decrypt"]);
}

// ── High-level helpers ────────────────────────────────────────────────────────

/**
 * Encrypt a File/Blob for upload.
 * Returns { encryptedBlob, wrappedKeyForSender, wrappedKeyForRecipient }
 */
export async function encryptFile(file, senderPublicKeyJwk, recipientPublicKeyJwk) {
  const aesKey = await generateAesKey();
  const plainBuffer = await file.arrayBuffer();
  const encryptedBuffer = await aesEncrypt(aesKey, plainBuffer);
  const encryptedBlob = new Blob([encryptedBuffer], { type: "application/octet-stream" });

  const [wrappedKeyForSender, wrappedKeyForRecipient] = await Promise.all([
    wrapAesKey(aesKey, senderPublicKeyJwk),
    wrapAesKey(aesKey, recipientPublicKeyJwk),
  ]);

  return { encryptedBlob, wrappedKeyForSender, wrappedKeyForRecipient };
}

/**
 * Decrypt a media message.
 * wrappedKey: the base64 wrapped AES key for this user
 * encryptedBuffer: ArrayBuffer of the downloaded encrypted blob
 * Returns decrypted ArrayBuffer
 */
export async function decryptFile(wrappedKey, encryptedBuffer) {
  const aesKey = await unwrapAesKey(wrappedKey);
  return aesDecrypt(aesKey, encryptedBuffer);
}

/**
 * Fetch an encrypted file from a URL, decrypt it, and return an Object URL.
 * mimeType: original MIME type (e.g. "image/jpeg") so the browser renders correctly.
 */
export async function fetchAndDecrypt(url, wrappedKey, mimeType) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
  const encryptedBuffer = await response.arrayBuffer();
  const decryptedBuffer = await decryptFile(wrappedKey, encryptedBuffer);
  const blob = new Blob([decryptedBuffer], { type: mimeType });
  return URL.createObjectURL(blob);
}
