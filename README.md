# ZKP Auth — FastAPI Backend

Zero-Knowledge Proof authentication using the **Schnorr Identification Protocol**.
The server never sees, stores, or transmits the user's secret key.

---

## Project Structure

```
app/
├── main.py               # FastAPI app factory, CORS, lifecycle
├── config.py             # Cryptographic parameters (P, Q, G)
├── database.py           # Motor async MongoDB client
├── schemas/
│   ├── auth.py           # CommitRequest, CommitResponse, VerifyRequest, VerifyResponse
│   └── user.py           # RegisterRequest, RegisterResponse
├── routes/
│   ├── register.py       # POST /api/register
│   └── auth.py           # POST /api/auth/commit, POST /api/auth/verify
├── services/
│   ├── schnorr.py        # generate_challenge(), verify_proof()
│   └── session_manager.py# In-memory session store with TTL
├── models/
│   └── user.py           # MongoDB document shape
└── utils/
    └── validators.py     # Username, public key, commitment, response validation
```

---

## Prerequisites

- Python 3.10+
- MongoDB running on `localhost:27017`

---

## Setup & Run

```bash
# 1. Create virtual environment
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Start MongoDB (if not already running)
mongod --dbpath /data/db

# 4. Run the server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Server runs at: http://127.0.0.1:8000
Interactive docs: http://127.0.0.1:8000/docs

---

## API Endpoints

### POST /api/register
```json
Request:
{
  "username": "alice",
  "public_key_y": 12345678901234567890
}

Response (201):
{
  "status": "success",
  "message": "User registered successfully"
}
```

### POST /api/auth/commit
```json
Request:
{
  "username": "alice",
  "commitment_r": 98765432109876543210
}

Response (200):
{
  "session_id": "a3f1c2d4e5b6a7c8d9e0f1a2b3c4d5e6",
  "challenge_e": 4567890123456789012
}
```

### POST /api/auth/verify
```json
Request:
{
  "session_id": "a3f1c2d4e5b6a7c8d9e0f1a2b3c4d5e6",
  "response_s": 11223344556677889900
}

Response (200) — success:
{
  "authenticated": true,
  "token": "dev_token_abc123..."
}

Response (401) — failure:
{
  "authenticated": false,
  "message": "Zero-knowledge proof failed."
}
```

### GET /health
```json
{
  "status": "ok",
  "service": "ZKP Auth — Schnorr Identification Protocol",
  "version": "1.0.0"
}
```

---

## Connecting the Frontend

Update `src/utils/mockApi.js` in the React project to hit the real backend:

```js
const BASE = "http://127.0.0.1:8000/api";

export async function apiRegister(username, y) {
  const res = await fetch(`${BASE}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, public_key_y: y.toString() }),
  });
  if (!res.ok) throw new Error((await res.json()).detail);
  return res.json();
}

export async function apiLoginCommit(username, r) {
  const res = await fetch(`${BASE}/auth/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, commitment_r: r.toString() }),
  });
  if (!res.ok) throw new Error((await res.json()).detail);
  const data = await res.json();
  return { e: BigInt(data.challenge_e), sessionId: data.session_id };
}

export async function apiLoginVerify(sessionId, s) {
  const res = await fetch(`${BASE}/auth/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, response_s: s.toString() }),
  });
  if (!res.ok) throw new Error((await res.json()).message);
  return res.json();
}
```

---

## Security Notes

- Secret key `x` never leaves the client — not in requests, not in logs, not in DB
- Sessions are single-use and expire after 60 seconds
- Public key subgroup membership is validated on registration (`y^Q mod P == 1`)
- Challenges use `secrets.randbelow()` (OS CSPRNG)
- All Schnorr math uses Python's built-in `pow(base, exp, mod)` — no external libs