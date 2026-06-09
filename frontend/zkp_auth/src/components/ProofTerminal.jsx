import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { Terminal } from "lucide-react";

export function ProofTerminal({ logs }) {
  const endRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const TypewriterLog = ({ log }) => {
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className="font-mono-code text-[11px] sm:text-xs leading-relaxed mb-2 flex items-start gap-3"
      >
        <span className="text-zinc-600 shrink-0">
          [{new Date(log.timestamp).toISOString().substring(11, 23)}]
        </span>
        <span className={`shrink-0 font-bold ${
          log.type === "INFO" ? "text-sky-400" :
          log.type === "SENT" ? "text-amber-400" :
          log.type === "RECV" ? "text-purple-400" :
          log.type === "CALC" ? "text-pink-400" :
          log.type === "VERIFY" ? "text-indigo-400" :
          log.type === "SUCCESS" ? "text-emerald-400" :
          "text-rose-500"
        }`}>
          [{log.type}]
        </span>
        <span className="text-zinc-300 break-all">{log.message}</span>
      </motion.div>
    );
  };

  return (
    <div className="w-full bg-[#0a0a0c] border border-zinc-800 rounded-2xl overflow-hidden shadow-xl flex flex-col h-[300px]">
      {/* Terminal Header */}
      <div className="bg-[#121214] border-b border-zinc-800 px-4 py-2 flex items-center gap-3">
        <Terminal className="w-4 h-4 text-zinc-500" />
        <span className="text-[10px] font-mono-code uppercase tracking-widest text-zinc-500 font-bold">
          Proof Trace Monitor
        </span>
        <div className="ml-auto flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
        </div>
      </div>

      {/* Terminal Body */}
      <div className="flex-1 p-4 overflow-y-auto scroll-smooth">
        {logs.length === 0 ? (
          <div className="text-zinc-600 font-mono-code text-xs">Waiting for protocol execution...</div>
        ) : (
          logs.map((log, i) => <TypewriterLog key={i} log={log} />)
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
