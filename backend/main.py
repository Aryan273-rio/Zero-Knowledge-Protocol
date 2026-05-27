from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import random

app = FastAPI(title="Schnorr ZKP Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

P = 23
Q = 11
G = 2

user_store = {}    
session_store = {}  

class RegisterRequest(BaseModel):
    username: str
    y: str  

class CommitRequest(BaseModel):
    username: str
    r: str

class VerifyRequest(BaseModel):
    username: str
    s: str

@app.post("/api/register")
def register(request: RegisterRequest):
    username = request.username.strip()
    
    if username in user_store:
        raise HTTPException(status_code=400, detail=f'Username "{username}" is already taken.')

    user_store[username] = {"y": int(request.y)}
    return {"success": True, "message": "Public key registered successfully."}

@app.post("/api/login/commit")
def login_commit(request: CommitRequest):
    username = request.username.strip()
    
    if username not in user_store:
        raise HTTPException(status_code=404, detail=f'User "{username}" not found. Please register first.')
    
    user = user_store[username]

    e = random.SystemRandom().randrange(1, Q)

    session_store[username] = {
        "r": int(request.r),
        "e": e,
        "y": user["y"]
    }

    return {"e": str(e)}

@app.post("/api/login/verify")
def login_verify(request: VerifyRequest):
    username = request.username.strip()
    
    if username not in session_store:
        raise HTTPException(status_code=400, detail="No active login session. Please start over.")
    
    session = session_store.pop(username) 
    
    r = session["r"]
    e = session["e"]
    y = session["y"]
    s = int(request.s)

    left_side = pow(G, s, P)
    right_side = (r * pow(y, e, P)) % P
    
    if left_side != right_side:
        raise HTTPException(status_code=401, detail="Verification failed. Proof is invalid.")
    
    return {"success": True, "message": "Authentication successful!"}