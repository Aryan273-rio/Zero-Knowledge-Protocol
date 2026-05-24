import { useState } from "react";
import { generateKeypair } from "../utils/schnorr.js";
import { apiRegister } from "../utils/mockApi.js";
import { MathPanel } from "./MathPanel.jsx";

export function Register({ onRegistered }) {
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [message, setMessage] = useState("");
  const [keypair, setKeypair] = useState(null);
  const [mathValues, setMathValues] = useState({});

  async function handleRegister() {
    if (!username.trim()) {
      setStatus("error");
      setMessage("Please enter a username.");
      return;
    }

    setStatus("loading");
    setMessage("Generating keypair…");
    setMathValues({});
    setKeypair(null);

    // Step 1: Generate keypair client-side
    const kp = generateKeypair();
    setMathValues({ x: kp.x, y: kp.y });
    setMessage("Registering public key with server…");

    try {
      // Step 2: Send ONLY the public key y to the server
      const result = await apiRegister(username.trim(), kp.y);
      setKeypair(kp);
      setStatus("success");
      setMessage(result.message);
      onRegistered?.(username.trim(), kp.x, kp.y);
    } catch (err) {
      setStatus("error");
      setMessage(err.message);
      setMathValues({});
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left — Form */}
      <div className="space-y-6">
        <div>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Registration generates a random secret key{" "}
            <span className="font-mono text-zinc-300">x</span> on your device.
            Only the public key{" "}
            <span className="font-mono text-zinc-300">y = g^x mod p</span> is
            sent to the server. Your secret never leaves your browser.
          </p>
        </div>

        <div className="space-y-3">
          <label className="block text-xs uppercase tracking-widest text-zinc-500">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRegister()}
            placeholder="Choose a username"
            disabled={status === "loading"}
            className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-rose-800 focus:ring-1 focus:ring-rose-800/40 transition-all text-sm disabled:opacity-50"
          />
        </div>

        <button
          onClick={handleRegister}
          disabled={status === "loading"}
          className="w-full bg-rose-900 hover:bg-rose-800 disabled:bg-zinc-800 disabled:cursor-not-allowed text-zinc-100 disabled:text-zinc-500 font-medium py-3 px-6 rounded-lg transition-all duration-200 text-sm tracking-wide flex items-center justify-center gap-2 group"
        >
          {status === "loading" ? (
            <>
              <span className="w-4 h-4 border-2 border-zinc-500 border-t-rose-400 rounded-full animate-spin" />
              Working…
            </>
          ) : (
            <>
              <span>Generate Keys & Register</span>
              <svg
                className="w-4 h-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </>
          )}
        </button>

        {/* Status message */}
        {message && (
          <div
            className={`rounded-lg px-4 py-3 text-sm border ${
              status === "success"
                ? "bg-emerald-950/40 border-emerald-800/40 text-emerald-400"
                : status === "error"
                ? "bg-red-950/40 border-red-800/40 text-red-400"
                : "bg-zinc-900/60 border-zinc-700/40 text-zinc-400"
            }`}
          >
            {message}
          </div>
        )}

        {/* Keypair display */}
        {keypair && status === "success" && (
          <div className="bg-zinc-900/80 border border-amber-900/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <p className="text-xs uppercase tracking-widest text-amber-600 font-semibold">
                Save your secret key
              </p>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              This is your only copy of the secret key. In a real application,
              this would be stored securely (e.g., encrypted in localStorage or
              a hardware key).
            </p>
            <div className="space-y-2">
              <div className="flex justify-between items-center gap-3">
                <span className="text-xs text-zinc-500 font-mono whitespace-nowrap">
                  x (secret)
                </span>
                <span className="font-mono text-sm text-amber-400 bg-zinc-950 px-2 py-1 rounded">
                  {keypair.x.toString()} (0x{keypair.xHex})
                </span>
              </div>
              <div className="flex justify-between items-center gap-3">
                <span className="text-xs text-zinc-500 font-mono whitespace-nowrap">
                  y (public)
                </span>
                <span className="font-mono text-sm text-zinc-300 bg-zinc-950 px-2 py-1 rounded">
                  {keypair.y.toString()} (0x{keypair.yHex})
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right — Math trace */}
      <MathPanel phase={status === "success" ? "registered" : "idle"} values={mathValues} />
    </div>
  );
}