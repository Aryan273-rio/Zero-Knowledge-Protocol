import { useState } from "react";
import { ChevronDown, ChevronRight, Copy, Check } from "lucide-react";
import { p, q, g } from "../utils/schnorr.js";

function truncateBigInt(val) {
  if (!val) return "";
  const str = val.toString();
  if (str.length <= 40) return str;
  return `${str.substring(0, 15)}...${str.substring(str.length - 15)}`;
}

function MathVariable({ label, symbol, value, isFullWidth = false, highlightColor = "zinc" }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  if (value === undefined || value === null) return null;

  const colorClasses = {
    zinc: "text-zinc-300",
    pink: "text-pink-400",
    amber: "text-amber-400",
    purple: "text-purple-400",
    emerald: "text-emerald-400",
    rose: "text-rose-400"
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(value.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex flex-col bg-[#121214] border border-zinc-800/60 rounded-xl p-3 ${isFullWidth ? 'col-span-full' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="bg-zinc-800 text-[10px] font-mono-code font-bold px-1.5 py-0.5 rounded text-zinc-400">
            {symbol}
          </div>
          <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">{label}</span>
        </div>
        <button 
          onClick={handleCopy}
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
          title="Copy full value"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
      
      <div className="flex items-start gap-2">
        <button 
          onClick={() => setExpanded(!expanded)}
          className="mt-0.5 text-zinc-600 hover:text-zinc-400 flex-shrink-0"
        >
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        <div className={`font-mono-code text-xs sm:text-sm break-all ${colorClasses[highlightColor]}`}>
          {expanded ? value.toString() : truncateBigInt(value)}
        </div>
      </div>
    </div>
  );
}

export function MathExplorer({ values }) {
  const { x, y, k, r, e, s } = values;

  return (
    <div className="w-full glass-panel rounded-3xl p-6">
      <h3 className="text-sm font-bold tracking-widest uppercase text-zinc-400 mb-6 flex items-center gap-2">
        <div className="w-1.5 h-4 bg-rose-600 rounded-full shadow-[0_0_8px_rgba(225,29,72,0.6)]" />
        Cryptographic Parameters
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Constant System Parameters */}
        <MathVariable label="Safe Prime" symbol="p" value={p} isFullWidth />
        <MathVariable label="Subgroup Order" symbol="q" value={q} isFullWidth />
        <MathVariable label="Generator" symbol="g" value={g} />

        {/* User Specific & Protocol Parameters */}
        <MathVariable label="Secret Key" symbol="x" value={x} highlightColor="pink" />
        <MathVariable label="Public Key" symbol="y" value={y} highlightColor="zinc" />
        
        <MathVariable label="Ephemeral Secret" symbol="k" value={k} highlightColor="amber" />
        <MathVariable label="Commitment" symbol="r" value={r} highlightColor="amber" />
        
        <MathVariable label="Challenge" symbol="e" value={e} highlightColor="purple" />
        <MathVariable label="Response" symbol="s" value={s} highlightColor="emerald" />
      </div>
    </div>
  );
}
