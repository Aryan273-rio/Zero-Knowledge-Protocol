import { useState } from "react";
import { generateKeypair } from "../utils/schnorr.js";
import { apiRegister } from "../utils/mockApi.js";
import { MathPanel } from "./MathPanel.jsx";

export function Register({ onRegistered }) {
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState("idle");
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
      // THE FIX: kp.y must be converted to a string here! 
      // JSON cannot serialize 512-bit BigInts naturally.
      const result = await apiRegister(username.trim(), kp.y.toString()); 
      
      setKeypair(kp);
      setStatus("success");
      setMessage(result.message || "Registration successful.");
      onRegistered?.(username.trim(), kp.x, kp.y);
    } catch (err) {
      setStatus("error");
      setMessage(err.message);
      setMathValues({});
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Left — Form */}
      <div className="space-y-8 mt-2">
        <div>
          <p className="text-zinc-400 text-sm leading-relaxed">
            Registration generates a random secret key <span className="font-mono text-rose-400/80 bg-rose-950/30 px-1 py-0.5 rounded">x</span> on your device.
            Only the public key <span className="font-mono text-zinc-300 bg-zinc-800/50 px-1 py-0.5 rounded">y = g^x mod p</span> is
            sent to the server. Your secret never leaves your browser.
          </p>
        </div>

        <div className="space-y-3 relative group">
          <label className="block text-[11px] font-bold uppercase tracking-widest text-zinc-500 ml-1">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleRegister()}
            placeholder="Choose a username"
            disabled={status === "loading"}
            // Upgraded input styling with focus rings and shadows
            className="w-full bg-zinc-900/50 backdrop-blur-sm border border-zinc-700/60 rounded-xl px-5 py-4 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-rose-700 focus:ring-4 focus:ring-rose-900/20 transition-all duration-300 text-sm shadow-inner disabled:opacity-50"
          />
        </div>

        <button
          onClick={handleRegister}
          disabled={status === "loading"}
          // Upgraded button styling
          className="w-full bg-gradient-to-r from-rose-900 to-rose-800 hover:from-rose-800 hover:to-rose-700 disabled:from-zinc-800 disabled:to-zinc-800 disabled:cursor-not-allowed text-zinc-100 disabled:text-zinc-500 font-semibold py-4 px-6 rounded-xl shadow-lg transition-all duration-300 text-sm tracking-wide flex items-center justify-center gap-3 border border-rose-700/50 disabled:border-zinc-700/50 group"
        >
          {status === "loading" ? (
            <>
              <span className="w-5 h-5 border-2 border-zinc-500 border-t-rose-300 rounded-full animate-spin" />
              Computing Math…
            </>
          ) : (
            <>
              <span>Generate Keys & Register</span>
              <svg className="w-4 h-4 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </>
          )}
        </button>

        {/* Status message */}
        {message && (
          <div
            className={`rounded-xl px-5 py-4 text-sm font-medium border shadow-lg backdrop-blur-sm ${
              status === "success"
                ? "bg-emerald-950/40 border-emerald-800/50 text-emerald-300"
                : status === "error"
                ? "bg-rose-950/40 border-rose-800/50 text-rose-300"
                : "bg-zinc-900/60 border-zinc-700/40 text-zinc-300"
            }`}
          >
            {message}
          </div>
        )}

        {/* Keypair display */}
        {keypair && status === "success" && (
          <div className="bg-zinc-900/60 backdrop-blur-md border border-amber-900/50 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse" />
              <p className="text-[11px] uppercase tracking-widest text-amber-500 font-bold">
                Save your secret key
              </p>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              This is your only copy of the secret key. In a real application,
              this would be stored securely (e.g., encrypted in localStorage or
              a hardware key).
            </p>
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center gap-4 bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50">
                <span className="text-xs text-zinc-500 font-mono font-bold whitespace-nowrap uppercase tracking-wider">
                  x (secret)
                </span>
                <span className="font-mono text-xs text-amber-400 truncate break-all">
                  {keypair.x.toString()}
                </span>
              </div>
              <div className="flex justify-between items-center gap-4 bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50">
                <span className="text-xs text-zinc-500 font-mono font-bold whitespace-nowrap uppercase tracking-wider">
                  y (public)
                </span>
                <span className="font-mono text-xs text-zinc-300 truncate break-all">
                  {keypair.y.toString()}
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