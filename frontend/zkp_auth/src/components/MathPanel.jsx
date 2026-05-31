import { p, q, g } from "../utils/schnorr.js";

/**
 * Renders a single step in the ZKP handshake with its math.
 */
function ProofStep({ step, label, formula, value, status = "idle" }) {
  const statusColor = {
    idle: "text-zinc-500",
    active: "text-amber-400",
    done: "text-emerald-400",
    error: "text-rose-400",
  }[status];

  const dotColor = {
    idle: "bg-zinc-700",
    active: "bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.8)] animate-pulse",
    done: "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]",
    error: "bg-rose-500 shadow-[0_0_8px_rgba(225,29,72,0.4)]",
  }[status];

  return (
    <div className="flex gap-4 items-start py-4 border-b border-zinc-800/60 last:border-0 group transition-all duration-300 hover:bg-zinc-800/20 px-2 rounded-lg -mx-2">
      <div className="flex flex-col items-center gap-1.5 mt-1.5">
        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotColor} transition-all duration-500`} />
        <span className="text-zinc-600 text-[10px] font-mono font-bold">{step}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-zinc-400 mb-1 uppercase tracking-widest font-semibold">{label}</p>
        {/* Added break-all here to fix the text overflow */}
        <p className="font-mono text-sm text-zinc-200 break-all leading-relaxed bg-zinc-950/50 p-2 rounded-md border border-zinc-800/50 shadow-inner">
          {formula}
        </p>
        {value !== undefined && (
          <p className={`font-mono text-xs mt-2 ${statusColor} transition-colors duration-300 break-all`}>
            <span className="opacity-50 mr-2">↳</span> 
            <span className="text-sm font-semibold">{value?.toString() ?? "…"}</span>
          </p>
        )}
      </div>
    </div>
  );
}

export function MathPanel({ phase, values = {} }) {
  const { x, y, k, r, e, s } = values;

  const steps = [
    {
      step: "P",
      label: "System Parameters",
      formula: `p=${p}, q=${q}, g=${g}`,
      value: null,
      status: "done",
    },
    {
      step: "1",
      label: "Secret key (never shared)",
      formula: "x ← random ∈ [1, q−1]",
      value: x,
      status: x !== undefined ? "done" : "idle",
    },
    {
      step: "2",
      label: "Public key (registered)",
      formula: `y = g^x mod p`,
      value: y,
      status: y !== undefined ? "done" : "idle",
    },
    {
      step: "3",
      label: "Commitment (login step 1)",
      formula: "k ← random,  r = g^k mod p",
      value: r !== undefined ? `k=${k}, r=${r}` : undefined,
      status: r !== undefined ? "done" : phase === "committing" ? "active" : "idle",
    },
    {
      step: "4",
      label: "Challenge (from server)",
      formula: "e ← random ∈ [1, q−1]",
      value: e,
      status: e !== undefined ? "done" : phase === "challenging" ? "active" : "idle",
    },
    {
      step: "5",
      label: "Response (login step 2)",
      formula: "s = (k + e·x) mod q",
      value: s,
      status: s !== undefined ? "done" : phase === "responding" ? "active" : "idle",
    },
    {
      step: "✓",
      label: "Server verification",
      formula: "g^s ≡ r · y^e  (mod p)?",
      value: phase === "verified" ? "✓ True — Access granted" : phase === "failed" ? "✗ False — Rejected" : undefined,
      status: phase === "verified" ? "done" : phase === "failed" ? "error" : phase === "verifying" ? "active" : "idle",
    },
  ];

  return (
    // Added backdrop blur and better gradient borders for a premium feel
    <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-700/50 rounded-2xl p-6 h-full shadow-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1.5 h-5 bg-rose-700 rounded-full shadow-[0_0_8px_rgba(190,18,60,0.6)]" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-300">
          Proof Trace Monitor
        </h3>
      </div>
      <div className="space-y-1">
        {steps.map((s, i) => (
          <ProofStep key={i} {...s} />
        ))}
      </div>
      <div className="mt-6 pt-4 border-t border-zinc-800/60">
        <p className="text-[11px] text-zinc-500 leading-relaxed font-medium">
          Zero-Knowledge: the verifier learns nothing about <span className="text-rose-400/80 font-mono bg-rose-950/30 px-1 py-0.5 rounded">x</span> — only that the prover knows it. Security relies on the hardness of the discrete logarithm problem.
        </p>
      </div>
    </div>
  );
}