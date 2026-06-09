import { motion } from "framer-motion";
import { Lock, ShieldAlert, Fingerprint } from "lucide-react";

export function HeroSection() {
  return (
    <div className="relative pt-24 pb-16 px-4 sm:px-6 lg:px-8 text-center max-w-5xl mx-auto z-10">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex justify-center mb-8"
      >
        <div className="relative group cursor-pointer">
          <div className="absolute -inset-1 bg-gradient-to-r from-rose-600 to-pink-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
          <div className="relative bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex items-center justify-center">
            <Lock className="w-10 h-10 text-rose-500" strokeWidth={1.5} />
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/80 border border-zinc-800 backdrop-blur-sm mb-6">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-widest">
            Schnorr Protocol
          </span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
          <span className="text-gradient">Zero-Knowledge</span>
          <br />
          <span className="text-gradient-crimson">Authentication</span>
        </h1>

        <p className="mt-4 max-w-2xl text-lg md:text-xl text-zinc-400 mx-auto leading-relaxed">
          Prove your identity without revealing your secrets. 
          Experience cryptographic perfection in a single verification flow.
        </p>

        <div className="mt-10 flex justify-center gap-4 text-sm font-mono-code text-zinc-500">
          <div className="flex items-center gap-2">
            <Fingerprint className="w-4 h-4" />
            512-bit safe prime
          </div>
          <span className="opacity-30">|</span>
          <div>Generator g = 2</div>
        </div>
      </motion.div>
    </div>
  );
}
