import { p, q, g } from "../utils/schnorr.js";

/**
 * Renders a single step in the ZKP handshake with its math.
 */
function ProofStep({ step, label, formula, value, status = "idle" }) {
  const statusColor = {
    idle: "text-zinc-500",
    active: "text-amber-400",
    done: "text-emerald-400",
    error: "text-red-400",
  }[status];

  const dotColor = {
    idle: "bg-zinc-700",
    active: "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]",
    done: "bg-emerald-500",
    error: "bg-red-500",
  }[status];

  return (
    <div className="flex gap-3 items-start py-3 border-b border-zinc-800/60 last:border-0">
      <div className="flex flex-col items-center gap-1 mt-1">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor} transition-all duration-300`} />
        <span className="text-zinc-600 text-[10px] font-mono">{step}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-zinc-500 mb-0.5 uppercase tracking-wider">{label}</p>
        <p className="font-mono text-sm text-zinc-300">{formula}</p>
        {value !== undefined && (
          <p className={`font-mono text-xs mt-1 ${statusColor} transition-colors duration-300`}>
            = <span className="text-base font-semibold">{value?.toString() ?? "…"}</span>
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
      label: "Parameters",
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
      status:
        r !== undefined ? "done" : phase === "committing" ? "active" : "idle",
    },
    {
      step: "4",
      label: "Challenge (from server)",
      formula: "e ← random ∈ [1, q−1]",
      value: e,
      status:
        e !== undefined ? "done" : phase === "challenging" ? "active" : "idle",
    },
    {
      step: "5",
      label: "Response (login step 2)",
      formula: "s = (k + e·x) mod q",
      value: s,
      status:
        s !== undefined ? "done" : phase === "responding" ? "active" : "idle",
    },
    {
      step: "✓",
      label: "Server verification",
      formula: "g^s ≡ r · y^e  (mod p)?",
      value:
        phase === "verified"
          ? "✓ True — Access granted"
          : phase === "failed"
          ? "✗ False — Rejected"
          : undefined,
      status:
        phase === "verified"
          ? "done"
          : phase === "failed"
          ? "error"
          : phase === "verifying"
          ? "active"
          : "idle",
    },
  ];

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-1 h-4 bg-rose-800 rounded-full" />
        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Proof Trace
        </h3>
      </div>
      <div>
        {steps.map((s, i) => (
          <ProofStep key={i} {...s} />
        ))}
      </div>
      <div className="mt-4 pt-3 border-t border-zinc-800/60">
        <p className="text-[10px] text-zinc-600 leading-relaxed">
          Zero-Knowledge: the verifier learns nothing about{" "}
          <span className="text-zinc-500 font-mono">x</span> — only that the
          prover knows it. Security relies on the hardness of the discrete
          logarithm problem.
        </p>
      </div>
    </div>
  );
}