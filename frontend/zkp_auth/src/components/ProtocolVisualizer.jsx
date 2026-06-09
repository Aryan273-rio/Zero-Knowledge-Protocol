import { motion } from "framer-motion";
import { Server, Laptop, ArrowRightLeft, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

export function ProtocolVisualizer({ phase, values, isSuccess }) {
  const [pulse, setPulse] = useState(false);

  // Trigger pulse effect when verification succeeds
  useEffect(() => {
    if (isSuccess) {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess]);

  const Packet = ({ label, direction, show }) => {
    if (!show) return null;
    return (
      <motion.div
        initial={{ x: direction === "right" ? -100 : 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 flex flex-col items-center z-20"
      >
        <div className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-[0_0_10px_rgba(225,29,72,0.6)]">
          {label}
        </div>
        <motion.div 
          animate={{ x: direction === "right" ? [0, 50, 100] : [0, -50, -100], opacity: [1, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="h-1 w-4 bg-rose-400 rounded-full mt-1 blur-[1px]"
        />
      </motion.div>
    );
  };

  return (
    <div className="relative w-full py-12 px-4 glass-panel rounded-3xl overflow-hidden mb-8">
      {/* Success glow background */}
      {pulse && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.4, 0] }}
          transition={{ duration: 2, ease: "easeOut" }}
          className="absolute inset-0 bg-emerald-500/20 blur-[60px]"
        />
      )}

      <div className="flex items-center justify-between max-w-2xl mx-auto relative z-10">
        
        {/* Client Node */}
        <div className="flex flex-col items-center">
          <motion.div 
            animate={{ 
              boxShadow: phase === "committing" || phase === "responding" 
                ? "0 0 25px rgba(244,63,94,0.5)" 
                : "0 0 0px rgba(244,63,94,0)",
              scale: phase === "committing" || phase === "responding" ? 1.05 : 1
            }}
            className="w-20 h-20 bg-zinc-900 border-2 border-zinc-700 rounded-2xl flex items-center justify-center relative"
          >
            <Laptop className="w-8 h-8 text-zinc-300" />
            <div className="absolute -bottom-3 bg-zinc-800 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border border-zinc-700">
              Prover
            </div>
          </motion.div>

          {/* Client Data Box */}
          <div className="mt-8 text-center min-h-[60px]">
            {values.x && (
              <div className="text-xs font-mono-code text-zinc-400">
                x = <span className="text-pink-400">Secret</span>
              </div>
            )}
            {values.k && (
              <div className="text-xs font-mono-code text-zinc-400 mt-1">
                k = <span className="text-amber-400">Ephemeral</span>
              </div>
            )}
          </div>
        </div>

        {/* Center Connection Area */}
        <div className="flex-1 flex items-center justify-center relative px-8">
          <div className="w-full h-px bg-zinc-800 relative">
            {/* Animated dashed line */}
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-600 to-transparent opacity-50"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
          </div>

          {/* Activity Icon */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-zinc-950 p-2 rounded-full border border-zinc-800">
            {isSuccess ? (
              <ShieldCheck className="w-6 h-6 text-emerald-500" />
            ) : (
              <ArrowRightLeft className={`w-5 h-5 text-zinc-600 ${phase !== "idle" && !isSuccess ? "animate-pulse text-rose-500" : ""}`} />
            )}
          </div>

          {/* Data Packets */}
          <Packet label="r (Commitment)" direction="right" show={phase === "committing"} />
          <Packet label="e (Challenge)" direction="left" show={phase === "challenging"} />
          <Packet label="s (Response)" direction="right" show={phase === "responding"} />
        </div>

        {/* Server Node */}
        <div className="flex flex-col items-center">
          <motion.div 
             animate={{ 
              boxShadow: phase === "challenging" || phase === "verifying" 
                ? "0 0 25px rgba(244,63,94,0.5)" 
                : isSuccess ? "0 0 30px rgba(16,185,129,0.5)" : "0 0 0px rgba(244,63,94,0)",
              scale: phase === "challenging" || phase === "verifying" || isSuccess ? 1.05 : 1,
              borderColor: isSuccess ? "rgb(16, 185, 129)" : ""
            }}
            className="w-20 h-20 bg-zinc-900 border-2 border-zinc-700 rounded-2xl flex items-center justify-center relative"
          >
            <Server className={`w-8 h-8 ${isSuccess ? "text-emerald-400" : "text-zinc-300"}`} />
            <div className="absolute -bottom-3 bg-zinc-800 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border border-zinc-700">
              Verifier
            </div>
          </motion.div>

          {/* Server Data Box */}
          <div className="mt-8 text-center min-h-[60px]">
            {values.y && (
              <div className="text-xs font-mono-code text-zinc-400">
                y = <span className="text-zinc-300">Public Key</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Success Particle Burst */}
      {pulse && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
           <motion.div
            initial={{ scale: 0, opacity: 1 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{ duration: 1 }}
            className="w-32 h-32 border-4 border-emerald-500 rounded-full"
           />
        </div>
      )}
    </div>
  );
}
