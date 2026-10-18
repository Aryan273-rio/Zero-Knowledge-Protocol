"""
tests/test_api.py — FastAPI endpoint integration tests.

Tests use httpx AsyncClient + ASGITransport against the real FastAPI app
with an in-memory MongoDB mock (mongomock-motor) so no live Atlas or
local MongoDB instance is needed.

Every test exercises real request/response schemas, validators, and
Schnorr math — no mocks of the cryptographic layer.
"""

import secrets
import pytest
import pytest_asyncio

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from httpx import AsyncClient, ASGITransport
from app.main import app
from app.database import connect_db
from app.config import G, P, Q


# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest_asyncio.fixture(scope="module", autouse=True)
async def startup():
    """Run FastAPI startup (connects in-memory MongoDB mock) once per module."""
    await connect_db()
    yield


@pytest_asyncio.fixture
async def client():
    """Fresh HTTPX async client per test."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as c:
        yield c


# ── Helpers ───────────────────────────────────────────────────────────────────

def fresh_username() -> str:
    return f"testuser_{secrets.token_hex(4)}"


def gen_keypair():
    x = secrets.randbelow(Q - 2) + 1
    y = pow(G, x, P)
    return x, y


async def register_user(client, username: str, y: int) -> dict:
    r = await client.post(
        "/api/register",
        json={"username": username, "public_key_y": str(y)},
    )
    return r


async def full_valid_proof(client, username: str, x: int) -> dict:
    """Register → commit → verify with a correct proof. Returns the verify response."""
    # Register (if not already)
    y = pow(G, x, P)

    # Commit
    k = secrets.randbelow(Q - 2) + 1
    r = pow(G, k, P)
    cr = await client.post(
        "/api/auth/commit",
        json={"username": username, "commitment_r": str(r)},
    )
    assert cr.status_code == 200, f"Commit failed: {cr.text}"
    data = cr.json()
    session_id = data["session_id"]
    e = int(data["challenge_e"])

    s = (k + e * x) % Q
    vr = await client.post(
        "/api/auth/verify",
        json={"session_id": session_id, "response_s": str(s)},
    )
    return vr


# ── Health Check ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health(client):
    r = await client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert "service" in data
    assert "version" in data


# ── Registration ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_register_success(client):
    username = fresh_username()
    x, y = gen_keypair()
    r = await register_user(client, username, y)
    assert r.status_code == 201
    data = r.json()
    assert data["status"] == "success"


@pytest.mark.asyncio
async def test_register_duplicate_username(client):
    username = fresh_username()
    x, y = gen_keypair()
    r1 = await register_user(client, username, y)
    assert r1.status_code == 201
    r2 = await register_user(client, username, y)
    assert r2.status_code == 400
    assert "taken" in r2.json()["detail"].lower()


@pytest.mark.asyncio
async def test_register_invalid_username_too_short(client):
    r = await client.post("/api/register", json={"username": "ab", "public_key_y": "123456"})
    assert r.status_code == 422  # pydantic/validator error


@pytest.mark.asyncio
async def test_register_invalid_username_special_chars(client):
    x, y = gen_keypair()
    r = await client.post("/api/register", json={"username": "bad user!", "public_key_y": str(y)})
    assert r.status_code in (400, 422)


@pytest.mark.asyncio
async def test_register_invalid_public_key_zero(client):
    """y=0 is not in the group — must be rejected."""
    r = await client.post("/api/register", json={"username": fresh_username(), "public_key_y": "0"})
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_register_invalid_public_key_one(client):
    """y=1 is not a valid group element for our subgroup — rejected by validator."""
    r = await client.post("/api/register", json={"username": fresh_username(), "public_key_y": "1"})
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_register_public_key_not_in_subgroup(client):
    """
    y=2 is G itself (valid element) but let's check a random non-subgroup element.
    Elements not satisfying y^Q ≡ 1 (mod P) must be rejected.
    """
    # P-1 is in Z*_P but has order 2, not Q — it's outside the order-Q subgroup
    y_bad = P - 1
    r = await client.post(
        "/api/register",
        json={"username": fresh_username(), "public_key_y": str(y_bad)},
    )
    assert r.status_code == 400
    assert "subgroup" in r.json()["detail"].lower()


@pytest.mark.asyncio
async def test_register_missing_fields(client):
    r = await client.post("/api/register", json={"username": "alice"})
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_register_malformed_json(client):
    r = await client.post(
        "/api/register",
        content=b"not json",
        headers={"Content-Type": "application/json"},
    )
    assert r.status_code == 422


# ── Auth Commit ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_commit_unknown_user(client):
    r = await client.post(
        "/api/auth/commit",
        json={"username": "nobody_ever_registered", "commitment_r": str(pow(G, 7, P))},
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_commit_returns_session_and_challenge(client):
    username = fresh_username()
    x, y = gen_keypair()
    await register_user(client, username, y)

    k = secrets.randbelow(Q - 2) + 1
    r_val = pow(G, k, P)
    r = await client.post(
        "/api/auth/commit",
        json={"username": username, "commitment_r": str(r_val)},
    )
    assert r.status_code == 200
    data = r.json()
    assert "session_id" in data
    assert "challenge_e" in data
    # challenge_e is returned as a string to preserve precision
    e = int(data["challenge_e"])
    assert 1 < e < Q


@pytest.mark.asyncio
async def test_commit_invalid_commitment_too_large(client):
    username = fresh_username()
    x, y = gen_keypair()
    await register_user(client, username, y)

    # r >= P is out of group — rejected by validator
    r_bad = P  # == 0 mod P, not valid
    r = await client.post(
        "/api/auth/commit",
        json={"username": username, "commitment_r": str(r_bad)},
    )
    assert r.status_code == 400


# ── Auth Verify ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_verify_valid_proof(client):
    username = fresh_username()
    x, y = gen_keypair()
    await register_user(client, username, y)
    vr = await full_valid_proof(client, username, x)
    assert vr.status_code == 200
    data = vr.json()
    assert data["authenticated"] is True
    assert data["token"] is not None
    assert data["token"].startswith("dev_token_")


@pytest.mark.asyncio
async def test_verify_invalid_response_s(client):
    """A tampered response must produce 401 — NOT 200."""
    username = fresh_username()
    x, y = gen_keypair()
    await register_user(client, username, y)

    k = secrets.randbelow(Q - 2) + 1
    r = pow(G, k, P)
    cr = await client.post(
        "/api/auth/commit",
        json={"username": username, "commitment_r": str(r)},
    )
    data = cr.json()
    session_id = data["session_id"]
    e = int(data["challenge_e"])

    # Deliberately wrong s
    s_bad = secrets.randbelow(Q - 2) + 1

    vr = await client.post(
        "/api/auth/verify",
        json={"session_id": session_id, "response_s": str(s_bad)},
    )
    assert vr.status_code == 401, (
        f"Expected 401 for invalid proof, got {vr.status_code}: {vr.text}"
    )


@pytest.mark.asyncio
async def test_verify_session_single_use(client):
    """After one verify attempt, the session is consumed — replay must fail."""
    username = fresh_username()
    x, y = gen_keypair()
    await register_user(client, username, y)

    k = secrets.randbelow(Q - 2) + 1
    r = pow(G, k, P)
    cr = await client.post(
        "/api/auth/commit",
        json={"username": username, "commitment_r": str(r)},
    )
    data = cr.json()
    session_id = data["session_id"]
    e = int(data["challenge_e"])
    s = (k + e * x) % Q

    # First verify — should succeed
    vr1 = await client.post(
        "/api/auth/verify",
        json={"session_id": session_id, "response_s": str(s)},
    )
    assert vr1.status_code == 200

    # Replay the same session_id — must fail (session consumed)
    vr2 = await client.post(
        "/api/auth/verify",
        json={"session_id": session_id, "response_s": str(s)},
    )
    assert vr2.status_code == 400, "Replayed session must be rejected (single-use)"


@pytest.mark.asyncio
async def test_verify_unknown_session_id(client):
    vr = await client.post(
        "/api/auth/verify",
        json={"session_id": "deadbeef" * 4, "response_s": "12345"},
    )
    assert vr.status_code == 400


@pytest.mark.asyncio
async def test_verify_token_not_in_error_response(client):
    """Error responses must NOT contain a token."""
    username = fresh_username()
    x, y = gen_keypair()
    await register_user(client, username, y)

    k = secrets.randbelow(Q - 2) + 1
    r = pow(G, k, P)
    cr = await client.post(
        "/api/auth/commit",
        json={"username": username, "commitment_r": str(r)},
    )
    session_id = cr.json()["session_id"]

    # Send wrong s
    vr = await client.post(
        "/api/auth/verify",
        json={"session_id": session_id, "response_s": "1"},
    )
    assert vr.status_code == 401
    # No token in failure response
    body = vr.json()
    assert body.get("token") is None or body.get("authenticated") is not True


@pytest.mark.asyncio
async def test_no_secret_material_in_responses(client):
    """
    Verify that server responses never contain private key material.
    This checks that x (secret key) is never echoed back.
    """
    username = fresh_username()
    x, y = gen_keypair()
    await register_user(client, username, y)

    k = secrets.randbelow(Q - 2) + 1
    r = pow(G, k, P)
    cr = await client.post(
        "/api/auth/commit",
        json={"username": username, "commitment_r": str(r)},
    )
    data = cr.json()
    session_id = data["session_id"]
    e = int(data["challenge_e"])
    s = (k + e * x) % Q

    vr = await client.post(
        "/api/auth/verify",
        json={"session_id": session_id, "response_s": str(s)},
    )
    response_text = vr.text
    # x (secret key) must not appear in any response body
    assert str(x) not in response_text, "Secret key x leaked in verify response!"
    assert str(k) not in response_text, "Ephemeral nonce k leaked in verify response!"


# ── Debug Endpoint ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_debug_users_endpoint(client):
    """The debug endpoint must return a list (may be empty or contain test users)."""
    r = await client.get("/api/debug/users")
    assert r.status_code == 200
    data = r.json()
    assert "registered_users" in data
    assert isinstance(data["registered_users"], list)


@pytest.mark.asyncio
async def test_debug_users_no_private_keys(client):
    """Debug endpoint must NOT expose public_key_y raw values with secret info."""
    username = fresh_username()
    x, y = gen_keypair()
    await register_user(client, username, y)

    r = await client.get("/api/debug/users")
    response_text = r.text
    # Secret key x must never appear in the debug listing
    assert str(x) not in response_text, "Secret key x found in debug users response!"
