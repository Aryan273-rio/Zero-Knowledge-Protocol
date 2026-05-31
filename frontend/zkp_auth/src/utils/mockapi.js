/**
 * Real API client — talks to the FastAPI backend at localhost:8000
 */

const BASE = "http://127.0.0.1:8000/api";

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    // FastAPI can return detail as a string or an array of validation objects
    const detail = data.detail;
    if (typeof detail === "string") {
      throw new Error(detail);
    } else if (Array.isArray(detail)) {
      throw new Error(detail.map((e) => e.msg).join(", "));
    } else {
      throw new Error("Request failed");
    }
  }

  return data;
}

/**
 * POST /api/register
 * Sends only the public key y — secret x never leaves the browser.
 */
export async function apiRegister(username, y) {
  return await post("/register", {
    username,
    public_key_y: Number(y),  // BigInt → Number for JSON serialisation
  });
}

/**
 * POST /api/auth/commit
 * Sends commitment r, receives { session_id, challenge_e }.
 */
export async function apiLoginCommit(username, r) {
  const data = await post("/auth/commit", {
    username,
    commitment_r: Number(r),
  });

  return {
    e: BigInt(data.challenge_e),  // Convert back to BigInt for math
    sessionId: data.session_id,
  };
}

/**
 * POST /api/auth/verify
 * Sends session_id + response s, receives { authenticated, token }.
 */
export async function apiLoginVerify(username, s, sessionId) {
  return await post("/auth/verify", {
    session_id: sessionId,
    response_s: Number(s),
  });
}