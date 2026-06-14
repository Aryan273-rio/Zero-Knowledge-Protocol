"""
Configuration and cryptographic domain parameters.

P is a verified 1024-bit safe prime from IETF RFC 3526 (MODP Group 2).
P = 2Q + 1 where both P and Q are prime.
G = 2 is a generator of the subgroup of order Q in Z*_P.
"""

# ── App Metadata ─────────────────────────────────────────────
APP_TITLE   = "ZKP Authentication API"
APP_VERSION = "1.0.0"

# ── Schnorr Domain Parameters ────────────────────────────────
# RFC 3526 1024-bit MODP Group — verified safe prime
P = 0xFFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA237327FFFFFFFFFFFFFFFF

Q = (P - 1) // 2  # Subgroup order: P = 2Q + 1 (safe prime so Q is also prime)

G = 2             # Generator: G^Q ≡ 1 (mod P)

# ── Session Config ───────────────────────────────────────────
SESSION_TTL_SECONDS = 60

import os

# ── MongoDB Config ───────────────────────────────────────────
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://ankithzkp9888:trA5Vrblgbe7j817@cluster0.wtucidj.mongodb.net/")
MONGO_DB  = os.getenv("MONGO_DB", "zkp_clean_db")

# ── App Config ───────────────────────────────────────────────
APP_HOST = "127.0.0.1"
APP_PORT = 8000