import { ShieldCheck, LogOut } from "lucide-react";

export function ProtectedDashboard({ onLogout }) {
  return (
    <div className="glass-panel rounded-3xl p-8 w-full max-w-md mx-auto relative overflow-hidden border border-emerald-900/30">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 to-teal-500" />
      
      <div className="flex flex-col items-center text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-emerald-950/50 flex items-center justify-center border border-emerald-800/50 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
          <ShieldCheck className="w-10 h-10 text-emerald-400" />
        </div>
        
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Securely Authenticated</h2>
          <p className="text-sm text-zinc-400">
            You have successfully proven your identity using the Schnorr Zero-Knowledge Protocol without revealing your secret key.
          </p>
        </div>
        
        <div className="w-full bg-black/40 rounded-xl p-4 border border-zinc-800/50 text-left">
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-1">Session Token</div>
          <div className="text-xs font-mono text-zinc-300 break-all opacity-80">
            {localStorage.getItem("zkp_auth_token")}
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full group relative flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-medium py-3 rounded-xl transition-all duration-300 border border-zinc-800"
        >
          <LogOut className="w-4 h-4" />
          <span>Disconnect Session</span>
        </button>
      </div>
    </div>
  );
}
