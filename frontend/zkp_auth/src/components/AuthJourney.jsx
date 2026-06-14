import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { generateKeypair, generateCommitment, computeResponse, modPow, p, g } from "../utils/schnorr.js";
import { apiRegister, apiLoginCommit, apiLoginVerify } from "../utils/mockapi.js";
import { ArrowRight, Key, Fingerprint } from "lucide-react";

export function AuthJourney({ setPhase, setMathValues, setIsSuccess, addLog }) {
  const [mode, setMode] = useState("register"); // 'register' or 'login'
  const [username, setUsername] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    const user = username.trim();
    if (!user) return;
    if (!/^[a-zA-Z0-9_\-]{3,50}$/.test(user)) {
      addLog({ type: "ERROR", message: "Username must be 3-50 chars (alphanumeric, _, -)." });
      setPhase("error");
      return;
    }
    setIsLoading(true);
    setPhase("registering");
    setMathValues({});
    setIsSuccess(false);

    try {
      addLog({ type: "INFO", message: `Initiating registration for user: ${user}` });
      
      const kp = generateKeypair();
      setMathValues({ x: kp.x, y: kp.y });
      addLog({ type: "CALC", message: `Generated Secret Key (x) and Public Key (y = g^x mod p)` });
      
      await new Promise(res => setTimeout(res, 800)); // Visual delay
      
      addLog({ type: "SENT", message: `Transmitting Public Key (y) to server...` });
      await apiRegister(user, kp.y.toString());
      
      addLog({ type: "SUCCESS", message: `Registration complete. Secret Key securely saved.` });
      setSecretKey(kp.x.toString());
      setMode("login");
      setPhase("idle");
    } catch (err) {
      addLog({ type: "ERROR", message: err.message });
      setPhase("error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    const user = username.trim();
    if (!user || !secretKey.trim()) return;
    if (!/^[a-zA-Z0-9_\-]{3,50}$/.test(user)) {
      addLog({ type: "ERROR", message: "Username must be 3-50 chars (alphanumeric, _, -)." });
      setPhase("error");
      return;
    }
    
    setIsLoading(true);
    setIsSuccess(false);
    
    try {
      addLog({ type: "INFO", message: `Initiating Zero-Knowledge login for: ${user}` });
      
      let x;
      try {
        x = BigInt(secretKey.trim());
      } catch {
        throw new Error("Invalid Secret Key format");
      }
      
      const y = modPow(g, x, p);
      setMathValues({ x, y });

      // Step 1: Commitment
      setPhase("committing");
      addLog({ type: "CALC", message: `Generating ephemeral secret (k) and commitment (r = g^k mod p)` });
      const { k, r } = generateCommitment();
      setMathValues(v => ({ ...v, k, r }));
      
      await new Promise(res => setTimeout(res, 1000));
      
      addLog({ type: "SENT", message: `Transmitting commitment (r) to server` });
      const { e, sessionId } = await apiLoginCommit(user, r);
      
      // Step 2: Challenge
      setPhase("challenging");
      setMathValues(v => ({ ...v, e }));
      addLog({ type: "RECV", message: `Received challenge (e) from server` });
      
      await new Promise(res => setTimeout(res, 1000));
      
      // Step 3: Response
      setPhase("responding");
      addLog({ type: "CALC", message: `Computing response s = (k + e·x) mod q` });
      const { s } = computeResponse(k, e, x);
      setMathValues(v => ({ ...v, s }));
      
      await new Promise(res => setTimeout(res, 1000));
      
      // Step 4: Verification
      setPhase("verifying");
      addLog({ type: "SENT", message: `Transmitting response (s) for verification` });
      
      const res = await apiLoginVerify(user, s, sessionId);
      
      addLog({ type: "VERIFY", message: `Server validated proof: g^s ≡ r · y^e mod p` });
      await new Promise(res => setTimeout(res, 500));
      
      setPhase("verified");
      setIsSuccess(true);
      addLog({ type: "SUCCESS", message: `Zero-Knowledge Authentication successful!` });
      
      // Give the visualizer 2 seconds to show the final state, then show dashboard
      setTimeout(() => {
        if (res.token) {
          // Pass it up to App.jsx to render ProtectedDashboard
          // Uses window event or prop callback
          window.dispatchEvent(new CustomEvent("loginSuccess", { detail: res.token }));
        }
      }, 2000);
      
    } catch (err) {
      addLog({ type: "ERROR", message: err.message });
      setPhase("failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-panel rounded-3xl p-8 w-full max-w-md mx-auto relative overflow-hidden">
      {/* Modes toggle */}
      <div className="flex justify-center mb-8 relative z-10">
        <div className="bg-zinc-900/80 p-1 rounded-xl border border-zinc-800/80 flex">
          <button
            onClick={() => setMode("register")}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              mode === "register" ? "bg-zinc-800 text-white shadow-md" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Register
          </button>
          <button
            onClick={() => setMode("login")}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              mode === "login" ? "bg-zinc-800 text-white shadow-md" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Authenticate
          </button>
        </div>
      </div>

      <div className="space-y-6 relative z-10">
        <div>
          <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2 ml-1">
            Identity
          </label>
          <div className="relative">
            <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              disabled={isLoading}
              className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-4 pl-12 pr-4 text-sm text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600/50 transition-all disabled:opacity-50"
            />
          </div>
        </div>

        <AnimatePresence mode="popLayout">
          {mode === "login" && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 24 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
            >
              <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2 ml-1">
                Secret Key (x)
              </label>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
                <input
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="Paste your secret key"
                  disabled={isLoading}
                  className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl py-4 pl-12 pr-4 text-sm font-mono-code text-zinc-200 placeholder-zinc-700 focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600/50 transition-all disabled:opacity-50"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={mode === "register" ? handleRegister : handleLogin}
          disabled={isLoading || !username}
          className="w-full mt-8 group relative flex items-center justify-center gap-3 bg-gradient-to-r from-rose-700 to-pink-700 hover:from-rose-600 hover:to-pink-600 text-white font-bold py-4 rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden shadow-[0_0_20px_rgba(225,29,72,0.3)]"
        >
          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
          <span className="relative z-10">
            {isLoading ? "Processing..." : mode === "register" ? "Generate Keys & Register" : "Execute Zero-Knowledge Proof"}
          </span>
          {!isLoading && <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />}
        </button>
      </div>
    </div>
  );
}
