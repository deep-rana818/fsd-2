const DEV_JWT_SECRET = "rbac-react-json-demo-secret";

export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function base64UrlEncode(value) {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function sign(value) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(DEV_JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

function signaturesMatch(first, second) {
  if (first.length !== second.length) return false;
  let difference = 0;
  for (let index = 0; index < first.length; index += 1) {
    difference |= first[index] ^ second[index];
  }
  return difference === 0;
}

function decodeJsonPart(part) {
  return JSON.parse(decoder.decode(base64UrlDecode(part)));
}

export async function createAccessToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64UrlEncode(JSON.stringify({
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    iat: now,
    exp: now + ACCESS_TOKEN_TTL_SECONDS,
  }));
  const signature = base64UrlEncode(await sign(`${header}.${payload}`));
  return `${header}.${payload}.${signature}`;
}

export async function verifyAccessToken(token) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return { valid: false, reason: "Malformed token." };

    const [header, payload, suppliedSignature] = parts;
    const decodedHeader = decodeJsonPart(header);
    if (decodedHeader.alg !== "HS256" || decodedHeader.typ !== "JWT") {
      return { valid: false, reason: "Unsupported token." };
    }

    const expectedSignature = await sign(`${header}.${payload}`);
    if (!signaturesMatch(base64UrlDecode(suppliedSignature), expectedSignature)) {
      return { valid: false, reason: "Invalid token signature." };
    }

    const claims = decodeJsonPart(payload);
    if (!claims.sub || !claims.role || typeof claims.exp !== "number") {
      return { valid: false, reason: "Missing token claims." };
    }
    if (claims.exp <= Math.floor(Date.now() / 1000)) {
      return { valid: false, reason: "Session expired." };
    }
    return { valid: true, claims };
  } catch {
    return { valid: false, reason: "Invalid token." };
  }
}
