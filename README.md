# ZKP Auth — Zero-Knowledge Proof Authentication

An educational implementation of the **Schnorr Identification Protocol**, a zero-knowledge proof system. The server never sees, stores, or transmits the user's secret key.

---

## What is a Zero-Knowledge Proof?

A ZKP lets a **prover** convince a **verifier** that they know a secret, without ever revealing the secret itself. In this app:

- **Prover** = your browser (knows secret key `x`)
- **Verifier** = the backend server (knows only public key `y = g^x mod p`)
- The server mathematically confirms you know `x` — without ever seeing it

---

## Schnorr Protocol — How It Works

```
Public parameters:  p (1536-bit safe prime, RFC 3526 Group 5)
                    q = (p-1)/2  (subgroup order)
                    g = 2        (generator)

Registration:       x  ← random ∈ [1, q-1]       (your secret key)
                    y  = g^x mod p                (public key — stored server-side)

Login Step 1:       k  ← random ephemeral nonce
                    r  = g^k mod p                (commitment — sent to server)

Login Step 2:       e  ← random challenge from server
                    s  = (k + e·x) mod q          (response — sent to server)

Verification:       g^s ≡ r · y^e  (mod p)  ?

                    Proof: g^s = g^(k+e·x) = g^k · (g^x)^e = r · y^e  ✓
```

### Why is it zero-knowledge?
`s` is computationally indistinguishable from a random element of ℤ_q because `k` is uniformly random and secret. The verifier learns nothing about `x` from seeing `(r, e, s)`.

### Security precautions
- Secret key `x` never leaves the browser
- Server uses `secrets.randbelow()` (OS CSPRNG) for challenges
- Sessions are single-use and expire after 60 seconds
- Public key subgroup membership checked on registration (`y^q mod p == 1`)
- No external crypto libraries — Python's built-in `pow(base, exp, mod)`

---

## Project Structure

```
Zero-Knowledge-Protocol/
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI app factory, CORS, lifespan
│   │   ├── config.py             # Cryptographic parameters (P, Q, G)
│   │   ├── database.py           # Motor async MongoDB client (+ mock)
│   │   ├── schemas/
│   │   │   ├── auth.py           # CommitRequest/Response, VerifyRequest/Response
│   │   │   └── user.py           # RegisterRequest, RegisterResponse
│   │   ├── routes/
│   │   │   ├── register.py       # POST /api/register
│   │   │   └── auth.py           # POST /api/auth/commit, POST /api/auth/verify
│   │   ├── services/
│   │   │   ├── schnorr.py        # generate_challenge(), verify_proof()
│   │   │   └── session_manager.py# In-memory session store with TTL
│   │   ├── models/
│   │   │   └── user.py           # MongoDB document shape
│   │   └── utils/
│   │       └── validators.py     # Input validation (username, public key, etc.)
│   ├── tests/
│   │   ├── test_schnorr.py       # 26 cryptographic unit tests
│   │   └── test_api.py           # 21 API integration tests
│   ├── requirements.txt
│   ├── pytest.ini
│   └── .env.example
│
└── frontend/
    └── zkp_auth/
        ├── src/
        │   ├── App.jsx
        │   ├── components/
        │   │   ├── AuthJourney.jsx       # Main register/login flow
        │   │   ├── ProtocolVisualizer.jsx# Animated prover↔verifier diagram
        │   │   ├── MathPanel.jsx         # Step-by-step proof trace
        │   │   ├── ProofTerminal.jsx     # Live log terminal
        │   │   ├── ProtectedDashboard.jsx# Shown after successful auth
        │   │   └── ...
        │   └── utils/
        │       ├── schnorr.js    # Client-side Schnorr (BigInt, modPow, CSPRNG)
        │       └── mockapi.js    # API client for backend
        ├── package.json
        └── vite.config.js
```

---

## Prerequisites

- Python 3.10+
- Node.js 18+ and npm
- MongoDB running on `localhost:27017` **OR** use the built-in in-memory mock (no MongoDB required for local dev)

---

## Backend Setup

```bash
cd backend

# 1. Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. (Optional) Configure environment
cp .env.example .env
# Edit .env if you want to use a real MongoDB instance

# 4. Start the server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The server starts at: **http://127.0.0.1:8000**
Interactive API docs: **http://127.0.0.1:8000/docs**

> **Note:** The default configuration uses an in-memory MongoDB mock (`mongomock-motor`).
> No external database is needed for local development or testing.
> Set `MONGO_URI` in `.env` to use a real Atlas or local MongoDB instance.

---

## Frontend Setup

```bash
cd frontend/zkp_auth

# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev
```

The frontend runs at: **http://localhost:5173**

---

## Running Tests

```bash
cd backend
source venv/bin/activate

# Run all tests
python -m pytest tests/ -v

# Run only cryptographic tests
python -m pytest tests/test_schnorr.py -v

# Run only API tests
python -m pytest tests/test_api.py -v
```

Expected output: **47 passed, 0 warnings**

---

## API Endpoints

### POST /api/register
```json
Request:  { "username": "alice", "public_key_y": "12345678..." }
Response: { "status": "success", "message": "User registered successfully" }
```

### POST /api/auth/commit
```json
Request:  { "username": "alice", "commitment_r": "98765432..." }
Response: { "session_id": "a3f1c2d4...", "challenge_e": "4567890..." }
```

### POST /api/auth/verify
```json
Request:   { "session_id": "a3f1c2d4...", "response_s": "11223344..." }
Response (200 success): { "authenticated": true, "token": "dev_token_abc123..." }
Response (401 failure): HTTP 401 with { "detail": "Zero-knowledge proof failed." }
```

### GET /health
```json
{ "status": "ok", "service": "ZKP Authentication API", "version": "1.0.0" }
```

---

## Environment Variables

| Variable   | Default                   | Description                       |
|------------|---------------------------|-----------------------------------|
| `MONGO_URI`| `mongodb://localhost:27017/` | MongoDB connection string       |
| `MONGO_DB` | `zkp_clean_db`            | Database name                    |

---

## Known Limitations (Educational Demo)

| Limitation | Production Recommendation |
|---|---|
| 1536-bit group (RFC 3526 Group 5) | Use 3072+ bit (Group 15) for post-2030 security |
| In-memory session store | Use Redis with `SETNX` + `EXPIRE` for multi-process |
| `dev_token_*` mock token | Replace with real JWT / session cookie |
| No rate limiting | Add `slowapi` or nginx rate limit on commit endpoint |
| Single-process GIL protects session dict | Use Redis for multi-worker deployments |
| Challenge is fully random (interactive) | Can use Fiat–Shamir transform for non-interactive proofs |

---

## Interview Demo Sequence

### 1. Problem Statement
> "Traditional passwords are a liability. When you log in, your password is sent to the server — if the server is compromised or the channel is intercepted, your credential is exposed. A zero-knowledge proof solves this: you prove you know a secret without ever transmitting it."

### 2. Roles
> "In our Schnorr protocol: the **prover** (browser) knows the secret key `x`. The **verifier** (server) knows only `y = g^x mod p`. The server verifies the proof without learning `x`."

### 3. Show public values
- Open the app, click Register
- Point to the MathPanel — show `p` (the 1536-bit prime), `g=2`, and `q`
- Show the key generation: `x` (secret, never leaves browser) and `y` (public, sent to server)

### 4. Generate and verify a valid proof
- Register a user — observe the log: "Transmitting Public Key (y) to server"
- Log in — watch the 4-step proof: Commitment → Challenge → Response → Verify
- Show the success state: "Zero-Knowledge Authentication successful!"

### 5. Tamper and show failure
- Register a second user
- During login, after getting `s`, manually add 1 to it using browser DevTools
  - *Or explain:* "If you try a random `s` without knowing `x`, the probability of it being correct is 1/Q — that's 1 in a 465-digit number. Computationally infeasible."
- Show the 401 response and "Zero-knowledge proof failed." message

### 6. Explain the math
> "The verification equation is `g^s ≡ r · y^e (mod p)`. Let's expand:
> `g^s = g^(k + e·x) = g^k · g^(e·x) = g^k · (g^x)^e = r · y^e`. It balances — the proof is valid.
> If you change `s`, the left side changes but the right side doesn't, so the equation fails."

### 7. Engineering highlights
> "One challenge I solved: JavaScript's native JSON numbers lose precision for integers above 2^53. Our public key is a 1536-bit number — massively larger. The fix was to transmit all large integers as decimal strings and use JavaScript's `BigInt` type with `window.crypto.getRandomValues()` for the CSPRNG. On the backend, Pydantic validators accept both `int` and string, casting safely before the math runs."

---

## Security Notes

- Secret key `x` never leaves the client — not in requests, logs, or DB
- Nonce `k` is ephemeral — discarded after each login attempt
- Sessions are single-use (replay attacks impossible)
- Challenges use `secrets.randbelow()` — OS CSPRNG
- Public key subgroup membership validated on registration
- Constant-time comparison used in `verify_proof()` to prevent timing side channels