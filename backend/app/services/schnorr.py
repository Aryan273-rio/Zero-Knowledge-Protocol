"""
services/schnorr.py — Schnorr Identification Protocol cryptographic core.

All Schnorr math lives here and nowhere else.
No external crypto libraries — only Python's built-in pow() with three arguments,
which uses the fast binary exponentiation algorithm internally.

────────────────────────────────────────────────────────────────────────────────
PROTOCOL RECAP
────────────────────────────────────────────────────────────────────────────────

Setup (public):   P (safe prime), Q = (P-1)/2 (subgroup order), G = 2 (generator)
Registration:     x ← secret,  y = G^x mod P  (y is stored server-side)

Login round 1:    k ← random ∈ [1, Q-1]
                  r = G^k mod P               (commitment, sent to server)

Login round 2:    e ← random ∈ (1, Q)         (challenge, from server)
                  s = (k + e·x) mod Q          (response, sent to server)

Verification:     G^s mod P  ==  r · y^e mod P

Proof of correctness:
  G^s = G^(k + e·x) = G^k · G^(e·x) = G^k · (G^x)^e = r · y^e  ✓

Why zero-knowledge:
  s is computationally indistinguishable from a random element of Zq
  because k is uniformly random and secret. The verifier gains no
  information about x from seeing (r, e, s).

────────────────────────────────────────────────────────────────────────────────
"""

import secrets
import logging
from app.config import G, P, Q

logger = logging.getLogger(__name__)


def generate_challenge() -> int:
    """
    Generate a cryptographically random challenge e ∈ (1, Q).

    Uses secrets.randbelow() which reads from the OS CSPRNG
    (/dev/urandom on Linux, CryptGenRandom on Windows).

    The challenge must be:
      - Unpredictable (so the prover cannot precompute s)
      - In range (1, Q) — avoiding trivial edge cases at 0 and 1
    """
    # secrets.randbelow(Q - 2) gives [0, Q-3], adding 2 gives [2, Q-1]
    # so we guarantee 1 < e < Q
    return secrets.randbelow(Q - 2) + 2


def verify_proof(
    public_key_y: int,
    commitment_r: int,
    challenge_e: int,
    response_s: int,
) -> bool:
    """
    Verify a Schnorr proof.

    Checks: G^s ≡ r · y^e (mod P)

    Both sides of the equation are computed using Python's three-argument pow(),
    which internally uses the square-and-multiply algorithm:
      - Time complexity: O(log exponent) multiplications
      - Each intermediate value is reduced mod P
      - No astronomically large intermediate numbers

    Args:
        public_key_y:  The prover's registered public key y = G^x mod P
        commitment_r:  The prover's commitment r = G^k mod P
        challenge_e:   The server's random challenge e
        response_s:    The prover's response s = (k + e·x) mod Q

    Returns:
        True  — proof is valid, prover knows x
        False — proof is invalid, reject authentication
    """
    # Left-hand side: G^s mod P
    left = pow(G, response_s, P)

    # Right-hand side: (r · y^e) mod P
    # pow(public_key_y, challenge_e, P) computes y^e mod P efficiently
    right = (commitment_r * pow(public_key_y, challenge_e, P)) % P

    # Constant-time comparison is not strictly necessary here because
    # both values are public group elements, but we log only the outcome
    result = left == right

    if result:
        logger.info("Schnorr verification: PASS")
    else:
        logger.warning("Schnorr verification: FAIL (left=%s, right=%s)", left, right)

    return result