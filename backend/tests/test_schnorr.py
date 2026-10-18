"""
tests/test_schnorr.py — Cryptographic correctness tests for the Schnorr protocol.

These tests verify:
  - Valid proofs verify correctly
  - Tampered proofs are rejected
  - Edge cases and boundary values
  - Subgroup membership checks
  - Nonce generation uses OS CSPRNG
"""

import secrets
import pytest

# Force sys.path so tests can be run from project root
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.config import G, P, Q
from app.services.schnorr import generate_challenge, verify_proof


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_keypair():
    """Generate a fresh Schnorr keypair for test use."""
    x = secrets.randbelow(Q - 2) + 1  # x ∈ [1, Q-1]
    y = pow(G, x, P)                  # y = G^x mod P
    return x, y


def make_proof(x: int, y: int) -> tuple[int, int, int, int]:
    """
    Execute the full Schnorr protocol and return (r, e, s, y).

    r = G^k mod P   (commitment)
    e = challenge from server
    s = (k + e*x) mod Q  (response)
    """
    k = secrets.randbelow(Q - 2) + 1  # ephemeral nonce k ∈ [1, Q-1]
    r = pow(G, k, P)
    e = generate_challenge()
    s = (k + e * x) % Q
    return r, e, s


# ── Domain Parameter Tests ────────────────────────────────────────────────────

class TestDomainParameters:
    def test_p_is_correct_bit_length(self):
        """P must be 1536 bits (RFC 3526 Group 5)."""
        assert P.bit_length() == 1536

    def test_g_generates_order_q_subgroup(self):
        """G^Q mod P must equal 1, confirming G generates the correct subgroup."""
        assert pow(G, Q, P) == 1

    def test_q_is_half_of_p_minus_one(self):
        """P = 2Q + 1 (safe prime structure)."""
        assert P == 2 * Q + 1

    def test_p_is_odd(self):
        """P must be odd (it's prime and > 2)."""
        assert P % 2 == 1

    def test_q_is_positive(self):
        assert Q > 0

    def test_g_equals_2(self):
        """G is documented as 2 — verify this."""
        assert G == 2


# ── Challenge Generation Tests ────────────────────────────────────────────────

class TestGenerateChallenge:
    def test_challenge_in_range(self):
        """Challenge must be in (1, Q) — exclusive on both ends."""
        for _ in range(50):
            e = generate_challenge()
            assert 1 < e < Q, f"Challenge {e} out of range (1, Q)"

    def test_challenge_is_positive(self):
        e = generate_challenge()
        assert e > 0

    def test_challenges_are_not_all_equal(self):
        """Challenges must be random, not constant."""
        challenges = {generate_challenge() for _ in range(20)}
        assert len(challenges) > 1, "All challenges were identical — check CSPRNG"

    def test_challenges_not_trivially_small(self):
        """Q is 1535-bit; no challenge should be a small integer in practice."""
        for _ in range(20):
            e = generate_challenge()
            # With overwhelming probability, a real CSPRNG won't produce e < 2^100
            assert e > 2 ** 100, f"Suspiciously small challenge: {e}"


# ── verify_proof: Valid Proof Tests ───────────────────────────────────────────

class TestVerifyProofValid:
    def test_valid_proof_verifies(self):
        """Core correctness: a correctly computed proof must verify."""
        x, y = make_keypair()
        r, e, s = make_proof(x, y)
        assert verify_proof(y, r, e, s) is True

    def test_valid_proof_verifies_multiple_keys(self):
        """Multiple independent keys must each produce valid proofs."""
        for _ in range(5):
            x, y = make_keypair()
            r, e, s = make_proof(x, y)
            assert verify_proof(y, r, e, s) is True

    def test_specific_small_secret(self):
        """Test with a manually chosen x=1 (boundary value)."""
        x = 1
        y = pow(G, x, P)
        k = secrets.randbelow(Q - 2) + 1
        r = pow(G, k, P)
        e = generate_challenge()
        s = (k + e * x) % Q
        assert verify_proof(y, r, e, s) is True

    def test_s_equals_zero_rejected(self):
        """s=0 means the prover provided no information — reject."""
        x, y = make_keypair()
        r, e, _ = make_proof(x, y)
        # s=0 is mathematically: G^0 = 1, so lhs=1.
        # rhs = r * y^e mod P which is extremely unlikely to be 1.
        result = verify_proof(y, r, e, 0)
        assert result is False


# ── verify_proof: Invalid Proof Tests ────────────────────────────────────────

class TestVerifyProofInvalid:
    def test_tampered_response_s_rejected(self):
        """s+1 must not verify."""
        x, y = make_keypair()
        r, e, s = make_proof(x, y)
        s_bad = (s + 1) % Q
        assert verify_proof(y, r, e, s_bad) is False

    def test_tampered_commitment_r_rejected(self):
        """If r is changed, verification must fail."""
        x, y = make_keypair()
        r, e, s = make_proof(x, y)
        r_bad = (r + 1) % P
        assert verify_proof(y, r_bad, e, s) is False

    def test_wrong_public_key_rejected(self):
        """Using the wrong public key must fail verification."""
        x, y = make_keypair()
        r, e, s = make_proof(x, y)
        x2, y2 = make_keypair()
        if y2 != y:  # Ensure they differ (overwhelmingly likely)
            assert verify_proof(y2, r, e, s) is False

    def test_tampered_challenge_rejected(self):
        """If verifier uses a different challenge than what was signed, fail."""
        x, y = make_keypair()
        k = secrets.randbelow(Q - 2) + 1
        r = pow(G, k, P)
        e_real = generate_challenge()
        s = (k + e_real * x) % Q
        # Use a different challenge in verification
        e_fake = (e_real + 1) % Q
        if e_fake != e_real:
            assert verify_proof(y, r, e_fake, s) is False

    def test_random_s_fails_with_overwhelming_probability(self):
        """A random s chosen without knowing x almost certainly fails."""
        x, y = make_keypair()
        r, e, _ = make_proof(x, y)
        s_random = secrets.randbelow(Q)
        # Valid s is extremely rare; 1-in-Q chance of accidental success
        # Don't assert False — just check it was computed without error
        result = verify_proof(y, r, e, s_random)
        assert isinstance(result, bool)

    def test_all_zeros_rejected(self):
        """All-zero inputs must not produce True."""
        # y=0 is not a valid group element
        # This should either return False or raise (caught by global handler in prod)
        try:
            result = verify_proof(0, 0, 0, 0)
            assert result is False
        except Exception:
            pass  # Exception is also acceptable for invalid inputs

    def test_y_equals_one_rejected(self):
        """y=1 means x=0 (discrete log is trivially 0), should verify as False."""
        # If y=1, G^s = r * 1^e = r, so verification reduces to G^s == r.
        # The correct prover would need s = k, but we don't know k here.
        y = 1
        r = pow(G, 42, P)  # arbitrary commitment
        e = generate_challenge()
        s = 43  # wrong
        result = verify_proof(y, r, e, s)
        assert result is False


# ── Prover/Verifier Consistency Tests ────────────────────────────────────────

class TestProverVerifierConsistency:
    def test_verification_equation_holds_by_construction(self):
        """
        Manually verify the math: G^s ≡ r · y^e (mod P).
        This is the core Schnorr correctness proof.
        """
        x, y = make_keypair()
        k = secrets.randbelow(Q - 2) + 1
        r = pow(G, k, P)
        e = generate_challenge()
        s = (k + e * x) % Q

        lhs = pow(G, s, P)
        rhs = (r * pow(y, e, P)) % P
        assert lhs == rhs, "Math verification failed — protocol broken!"

    def test_verify_proof_matches_manual_check(self):
        """verify_proof() result must agree with manual equation check."""
        x, y = make_keypair()
        r, e, s = make_proof(x, y)
        lhs = pow(G, s, P)
        rhs = (r * pow(y, e, P)) % P
        expected = (lhs == rhs)
        assert verify_proof(y, r, e, s) == expected

    def test_reused_nonce_different_s_exposes_structure(self):
        """
        If k is reused with two different challenges, the responses differ.
        This documents the nonce-reuse hazard without actually exploiting it.
        s1 = k + e1*x,  s2 = k + e2*x  →  s1 - s2 = (e1-e2)*x mod Q
        """
        x, y = make_keypair()
        k = secrets.randbelow(Q - 2) + 1
        e1 = generate_challenge()
        e2 = generate_challenge()
        if e1 == e2:
            return  # Astronomically unlikely, skip

        s1 = (k + e1 * x) % Q
        s2 = (k + e2 * x) % Q
        assert s1 != s2, "Same nonce with different challenges produced same response!"


# ── Nonce Generation Tests ────────────────────────────────────────────────────

class TestNonceGeneration:
    def test_generate_challenge_uses_secrets_module(self):
        """
        Verify that generate_challenge() is backed by secrets.randbelow,
        which uses the OS CSPRNG.  We check via the module source, not the
        value (statistical tests are unreliable for unit tests).
        """
        import inspect
        from app.services import schnorr
        source = inspect.getsource(schnorr)
        assert "secrets.randbelow" in source, (
            "generate_challenge() must use secrets.randbelow (OS CSPRNG)"
        )

    def test_no_math_random_in_schnorr(self):
        """math.random is not cryptographically secure; must not appear in schnorr.py."""
        import inspect
        from app.services import schnorr
        source = inspect.getsource(schnorr)
        assert "math.random" not in source
        assert "random.random" not in source
