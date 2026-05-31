import { useState } from "react";
import { Register } from "./components/Register.jsx";
import { Login } from "./components/Login.jsx";

function LockIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      <circle cx="12" cy="16" r="1" fill="currentColor" />
    </svg>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState("register");
  const [registered, setRegistered] = useState(null);

  function handleRegistered(username, x, y) {
    setRegistered({ username, x, y });
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased">
      {/* Background texture */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-rose-950/10 via-transparent to-transparent" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 40px, #fff 40px, #fff 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, #fff 40px, #fff 41px)",
          }}
        />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 py-12 sm:py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-950/60 border border-rose-900/40 mb-5">
            <LockIcon className="w-7 h-7 text-rose-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-50 mb-3">
            Zero-Knowledge Auth
          </h1>
          <p className="text-zinc-500 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Schnorr Identification Protocol — prove knowledge of a secret without
            revealing it.{" "}
            <span className="text-zinc-600">
              512-bit safe prime · g=2
            </span>
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 gap-1">
            {[
              { id: "register", label: "Register", icon: "✦" },
              { id: "login", label: "Login", icon: "⟶" },
            ].map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`relative px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                  activeTab === id
                    ? "bg-rose-900/70 text-zinc-100 shadow-inner"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                }`}
              >
                <span className="text-[10px] opacity-60">{icon}</span>
                {label}
                {id === "login" && registered && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute top-2 right-2" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Panel */}
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/40">
          {/* Jump hint when registered */}
          {activeTab === "register" && registered && (
            <div className="mb-6 flex items-center justify-between gap-3 bg-emerald-950/30 border border-emerald-900/30 rounded-lg px-4 py-2.5">
              <p className="text-xs text-emerald-500">
                ✓ <strong>{registered.username}</strong> registered. Secret key
                auto-filled in Login.
              </p>
              <button
                onClick={() => setActiveTab("login")}
                className="text-xs text-emerald-400 hover:text-emerald-300 whitespace-nowrap underline underline-offset-2"
              >
                Go to Login →
              </button>
            </div>
          )}

          {activeTab === "register" ? (
            <Register onRegistered={handleRegistered} />
          ) : (
            <Login
              prefillUsername={registered?.username}
              prefillX={registered?.x}
            />
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center space-y-1">
          <p className="text-xs text-zinc-700">
            All cryptography runs client-side in pure JavaScript BigInt. No
            external libraries.
          </p>
          <p className="text-xs text-zinc-700">
            512-bit safe prime. Secret key never leaves the browser.
          </p>
        </div>
      </div>
    </div>
  );
}