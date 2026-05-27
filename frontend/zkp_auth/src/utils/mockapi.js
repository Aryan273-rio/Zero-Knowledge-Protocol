/**
 * Real API — Connects to the FastAPI Backend
 */

// Your FastAPI server address
const BASE_URL = "http://localhost:8000";

/**
 * POST /api/register
 * Sends the user's public key (y) to the backend database.
 */
export async function apiRegister(username, y) {
  const response = await fetch(`${BASE_URL}/api/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // Convert BigInt to string before sending because JSON doesn't support BigInt
    body: JSON.stringify({ username, y: y.toString() }) 
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Registration failed");
  }

  return await response.json();
}

/**
 * POST /api/login/commit
 * Sends the commitment (r) to the server.
 * Returns a random challenge (e) from the server.
 */
export async function apiLoginCommit(username, r) {
  const response = await fetch(`${BASE_URL}/api/login/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, r: r.toString() })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "User not found. Please register first.");
  }

  const data = await response.json();
  
  // The server sends 'e' as a string. We must convert it back to a BigInt 
  // so your frontend schnorr.js math continues to work correctly.
  return { e: BigInt(data.e) }; 
}

/**
 * POST /api/login/verify
 * Sends the response (s) to the server for mathematical verification.
 */
export async function apiLoginVerify(username, s) {
  const response = await fetch(`${BASE_URL}/api/login/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, s: s.toString() })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail || "Verification failed. Proof is invalid.");
  }

  return await response.json();
}

/** * Removed userStore checks: 
 * We no longer check if a user exists locally because the real backend handles it.
 * We can leave this as a stub that always returns false if your UI components 
 * still call it, or you can delete it if you aren't using it for UI hints.
 */
export function userExists(username) {
  return false; 
}