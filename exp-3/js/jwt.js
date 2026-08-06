/* ===========================================================
   jwt.js â€” minimal HS256 JWT implementation (Web Crypto API)
   In a real backend this signing happens server-side with a
   secret that never reaches the browser. Here it's simulated
   client-side so the whole flow runs as a static demo.
   =========================================================== */

const JWT_SECRET = "plantarium-demo-secret-do-not-use-in-prod";
const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;      // 15 min
const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 3600; // 7 days

function base64UrlEncode(bytes) {
  let str = typeof bytes === "string" ? bytes : String.fromCharCode(...new Uint8Array(bytes));
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecodeToString(b64url) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/").padEnd(b64url.length + (4 - b64url.length % 4) % 4, "=");
  return atob(b64);
}

async function hmacSha256(message, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return base64UrlEncode(sig);
}

async function signJWT(payload, ttlSeconds) {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + ttlSeconds };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = await hmacSha256(signingInput, JWT_SECRET);

  return `${signingInput}.${signature}`;
}

function decodeJWT(token) {
  try {
    const [h, p] = token.split(".");
    return {
      header: JSON.parse(base64UrlDecodeToString(h)),
      payload: JSON.parse(base64UrlDecodeToString(p)),
    };
  } catch {
    return null;
  }
}

async function verifyJWT(token) {
  if (!token || token.split(".").length !== 3) return { valid: false, reason: "malformed" };
  const [encodedHeader, encodedPayload, signature] = token.split(".");
  const expectedSig = await hmacSha256(`${encodedHeader}.${encodedPayload}`, JWT_SECRET);
  if (expectedSig !== signature) return { valid: false, reason: "bad-signature" };

  const payload = JSON.parse(base64UrlDecodeToString(encodedPayload));
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && now > payload.exp) return { valid: false, reason: "expired", payload };

  return { valid: true, payload };
}

window.RbacJWT = {
  signJWT,
  decodeJWT,
  verifyJWT,
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
};
