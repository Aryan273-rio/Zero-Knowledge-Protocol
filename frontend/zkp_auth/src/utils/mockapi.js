/**
 * Mock API — simulates backend endpoints for ZKP auth.
 *
 * In production these would be real HTTP calls. Here we store state
 * in a module-level Map to simulate a server database across calls.
 */

import { verify, generateChallenge } from "./schnorr.js";

// In-memory "database": username → { y: BigInt }
const userStore = new Map();

// Pending login sessions: username → { r: BigInt, e: BigInt, y: BigInt }
const sessionStore = new Map();

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * POST /api/register
 * Stores the user's public key y.
 * In production, y would be stored in a database; the secret x NEVER leaves the client.
 */
export async function apiRegister(username, y) {
  await delay(600); // Simulate network latency

  if (userStore.has(username)) {
    throw new Error(`Username "${username}" is already taken.`);
  }

  userStore.set(username, { y });
  return { success: true, message: "Public key registered." };
}

/**
 * POST /api/login/commit
 * Receives the prover's commitment r = g^k mod p.
 * Returns a random challenge e from the server.
 * Stores r and e in a short-lived session.
 */
export async function apiLoginCommit(username, r) {
  await delay(500);

  const user = userStore.get(username);
  if (!user) {
    throw new Error(`User "${username}" not found. Please register first.`);
  }

  // Server generates the challenge — must be unpredictable
  const e = generateChallenge();
  sessionStore.set(username, { r, e, y: user.y });

  return { e }; // Send challenge back to prover
}

/**
 * POST /api/login/verify
 * Receives the prover's response s = (k + e·x) mod q.
 * Runs g^s ≡ r · y^e (mod p) and grants/denies access.
 * Session is always cleared regardless of outcome (prevents replay).
 */
export async function apiLoginVerify(username, s) {
  await delay(700);

  const session = sessionStore.get(username);
  sessionStore.delete(username); // One-time session — always wipe

  if (!session) {
    throw new Error("No active login session. Please start over.");
  }

  const { r, e, y } = session;
  const valid = verify(y, r, e, s);

  if (!valid) {
    throw new Error("Verification failed. Proof is invalid.");
  }

  return { success: true, message: "Authentication successful!" };
}

/** Check if a user exists in the mock store (for UI hints only) */
export function userExists(username) {
  return userStore.has(username);
}