import { useState } from "react";
import { generateCommitment, computeResponse } from "../utils/schnorr.js";
import {
  apiLoginCommit,
  apiLoginVerify,
} from "../utils/mockApi.js";
import { MathPanel } from "./MathPanel.jsx";

const PHASES = {
  IDLE: "idle",
  COMMITTING: "committing",
  CHALLENGING: "challenging",
  RESPONDING: "responding",
  VERIFYING: "verifying",
  VERIFIED: "verified",
  FAILED: "failed",
};

export function Login({ prefillUsername, prefillX }) {
  const [username, setUsername] = useState(prefillUsername ?? "");
  const [secretKeyInput, setSecretKeyInput] = useState(
    prefillX !== undefined ? prefillX.toString() : ""
  );

  const [phase, setPhase] = useState(PHASES.IDLE);
  const [message, setMessage] = useState("");
  const [mathValues, setMathValues] = useState({});

  // Ephemeral state — wiped on failure
  const [ephemeral, setEphemeral] = useState(null); // { k, r, e, x }

  function reset(msg = "", isError = false) {
    setEphemeral(null); // Always wipe k on any terminal state
    setPhase(isError ? PHASES.FAILED : PHASES.IDLE);
    setMessage(msg);
  }

  async function handleLogin() {
    const user = username.trim();
    if (!user) {
      reset("Please enter a username.", true);
      return;
    }

    let x;
    try {
      x = BigInt(secretKeyInput.trim());
      if (x <= 0n) throw new Error();
    } catch {
      reset("Invalid secret key. Enter a positive integer.", true);
      return;
    }

    setMathValues({ x });
    setMessage("");

    // ── Step 1: Commitment ─────────────────────────────────
    setPhase(PHASES.COMMITTING);
    setMessage("Generating commitment r = g^k mod p…");

    const { k, r, rHex } = generateCommitment();
    setMathValues((v) => ({ ...v, k, r }));

    let challengeResult;
    try {
      setMessage("Sending commitment to server, awaiting challenge…");
      challengeResult = await apiLoginCommit(user, r);
    } catch (err) {
      // k must be wiped if commitment fails
      reset(err.message, true);
      return;
    }

    const e = challengeResult.e;
    setMathValues((v) => ({ ...v, e }));
    setPhase(PHASES.CHALLENGING);
    setMessage(`Challenge received: e = ${e}`);

    // ── Step 2: Response ───────────────────────────────────
    await new Promise((res) => setTimeout(res, 400)); // Small UX pause

    setPhase(PHASES.RESPONDING);
    setMessage("Computing response s = (k + e·x) mod q…");

    const { s } = computeResponse(k, e, x);
    setMathValues((v) => ({ ...v, s }));

    // Store ephemeral for display (but already computed s, k no longer needed)
    setEphemeral({ k, r, e, x });

    // ── Final Verification ─────────────────────────────────
    setPhase(PHASES.VERIFYING);
    setMessage("Sending response to server for verification…");

    try {
      const result = await apiLoginVerify(user, s);
      // Success — wipe k (good hygiene even on success)
      setEphemeral((prev) => ({ ...prev, k: null }));
      setPhase(PHASES.VERIFIED);
      setMessage(result.message);
    } catch (err) {
      // Failure — immediately wipe k and ephemeral state
      setEphemeral(null);
      setPhase(PHASES.FAILED);
      setMessage(err.message);
    }
  }

  const isRunning = [
    PHASES.COMMITTING,
    PHASES.CHALLENGING,
    PHASES.RESPONDING,
    PHASES.VERIFYING,
  ].includes(phase);

  const stepLabels = [
    {
      id: PHASES.COMMITTING,
      label: "Generate commitment",
      sub: "r = g^k mod p",
    },
    {
      id: PHASES.CHALLENGING,
      label: "Receive challenge",
      sub: "e ← server random",
    },
    {
      id: PHASES.RESPONDING,
      label: "Compute response",
      sub: "s = (k + e·x) mod q",
    },
    {
      id: PHASES.VERIFYING,
      label: "Server verifies",
      sub: "g^s ≡ r · y^e mod p",
    },
  ];

  const phaseOrder = Object.values(PHASES);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left — Form */}
      <div className="space-y-6">
        <p className="text-zinc-400 text-sm leading-relaxed">
          Login executes a 2-round interactive proof. Your secret key{" "}
          <span className="font-mono text-zinc-300">x</span> never leaves your
          device — only a one-time response{" "}
          <span className="font-mono text-zinc-300">s</span> is sent, which
          reveals nothing about <span className="font-mono text-zinc-300">x</span>.
        </p>

        <div className="space-y-3">
          <label className="block text-xs uppercase tracking-widest text-zinc-500">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Your username"
            disabled={isRunning}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-rose-800 focus:ring-1 focus:ring-rose-800/40 transition-all text-sm disabled:opacity-50"
          />
        </div>

        <div className="space-y-3">
          <label className="block text-xs uppercase tracking-widest text-zinc-500">
            Secret key <span className="text-zinc-600 normal-case">(your x from registration)</span>
          </label>
          <input
            type="text"
            value={secretKeyInput}
            onChange={(e) => setSecretKeyInput(e.target.value)}
            onKeyDown={(e) => !isRunning && e.key === "Enter" && handleLogin()}
            placeholder="Enter your secret key integer"
            disabled={isRunning}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-rose-800 focus:ring-1 focus:ring-rose-800/40 transition-all font-mono text-sm disabled:opacity-50"
          />
        </div>

        <button
          onClick={phase === PHASES.VERIFIED || phase === PHASES.FAILED ? () => { setPhase(PHASES.IDLE); setMessage(""); setMathValues({}); } : handleLogin}
          disabled={isRunning}
          className={`w-full font-medium py-3 px-6 rounded-lg transition-all duration-200 text-sm tracking-wide flex items-center justify-center gap-2 group ${
            phase === PHASES.VERIFIED
              ? "bg-emerald-900 hover:bg-emerald-800 text-emerald-100"
              : phase === PHASES.FAILED
              ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              : "bg-rose-900 hover:bg-rose-800 disabled:bg-zinc-800 disabled:cursor-not-allowed text-zinc-100 disabled:text-zinc-500"
          }`}
        >
          {isRunning ? (
            <>
              <span className="w-4 h-4 border-2 border-zinc-500 border-t-rose-400 rounded-full animate-spin" />
              Authenticating…
            </>
          ) : phase === PHASES.VERIFIED ? (
            "✓ Authenticated — Login again"
          ) : phase === PHASES.FAILED ? (
            "✗ Failed — Try again"
          ) : (
            <>
              <span>Begin ZK Proof</span>
              <svg
                className="w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </button>

        {/* 4-step progress tracker */}
        {phase !== PHASES.IDLE && (
          <div className="space-y-2">
            {stepLabels.map(({ id, label, sub }) => {
              const currentIdx = phaseOrder.indexOf(phase);
              const stepIdx = phaseOrder.indexOf(id);

              const isDone =
                phase === PHASES.VERIFIED ||
                phase === PHASES.FAILED
                  ? true
                  : currentIdx > stepIdx;

              const isActive = phase === id;
              const isFailed = phase === PHASES.FAILED && isActive;

              return (
                <div
                  key={id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 ${
                    isActive
                      ? "bg-zinc-800/60 border border-zinc-700"
                      : isDone
                      ? "opacity-60"
                      : "opacity-30"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 font-bold transition-all duration-300 ${
                      isFailed
                        ? "bg-red-900 text-red-300"
                        : isDone && !isActive
                        ? "bg-emerald-900 text-emerald-300"
                        : isActive
                        ? "bg-rose-900 text-rose-300"
                        : "bg-zinc-800 text-zinc-600"
                    }`}
                  >
                    {isDone && !isActive ? "✓" : phaseOrder.indexOf(id)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-zinc-300 font-medium">{label}</p>
                    <p className="text-[10px] font-mono text-zinc-600">{sub}</p>
                  </div>
                  {isActive && !isFailed && (
                    <span className="ml-auto w-3 h-3 border-2 border-zinc-600 border-t-rose-500 rounded-full animate-spin flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Status message */}
        {message && (
          <div
            className={`rounded-lg px-4 py-3 text-sm border ${
              phase === PHASES.VERIFIED
                ? "bg-emerald-950/40 border-emerald-800/40 text-emerald-400"
                : phase === PHASES.FAILED
                ? "bg-red-950/40 border-red-800/40 text-red-400"
                : "bg-zinc-900/60 border-zinc-700/40 text-zinc-400"
            }`}
          >
            {message}
          </div>
        )}
      </div>

      {/* Right — Math trace */}
      <MathPanel phase={phase} values={mathValues} />
    </div>
  );
}