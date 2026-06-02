const BASE = "http://127.0.0.1:8000/api";

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
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

export async function apiRegister(username, y) {
  return await post("/register", {
    username,
    public_key_y: y.toString(), 
  });
}

export async function apiLoginCommit(username, r) {
  const data = await post("/auth/commit", {
    username,
    commitment_r: r.toString(), 
  });

  return {
    e: BigInt(data.challenge_e), 
    sessionId: data.session_id,
  };
}

export async function apiLoginVerify(username, s, sessionId) {
  return await post("/auth/verify", {
    session_id: sessionId,
    response_s: s.toString(), 
  });
}