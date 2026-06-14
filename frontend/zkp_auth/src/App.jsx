import { useState, useEffect } from "react";
import { BackgroundEffects } from "./components/BackgroundEffects.jsx";
import { HeroSection } from "./components/HeroSection.jsx";
import { ProtocolVisualizer } from "./components/ProtocolVisualizer.jsx";
import { ProofTerminal } from "./components/ProofTerminal.jsx";
import { MathExplorer } from "./components/MathExplorer.jsx";
import { AuthJourney } from "./components/AuthJourney.jsx";
import { ProtectedDashboard } from "./components/ProtectedDashboard.jsx";

export default function App() {
  const [phase, setPhase] = useState("idle");
  const [mathValues, setMathValues] = useState({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [logs, setLogs] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem("zkp_auth_token"));

  useEffect(() => {
    const handleLogin = (e) => {
      localStorage.setItem("zkp_auth_token", e.detail);
      setIsAuthenticated(true);
    };
    window.addEventListener("loginSuccess", handleLogin);
    return () => window.removeEventListener("loginSuccess", handleLogin);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("zkp_auth_token");
    setIsAuthenticated(false);
    setPhase("idle");
    setIsSuccess(false);
    setLogs([]);
    setMathValues({});
  };

  const addLog = (log) => {
    setLogs((prev) => [...prev, { ...log, timestamp: Date.now() }]);
  };

  return (
    <div className="relative min-h-screen bg-black text-zinc-100 font-sans antialiased selection:bg-rose-500/30 selection:text-rose-200">
      <BackgroundEffects />

      <main className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <HeroSection />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-12">
          
          {/* Left Column - Interactions & Terminal */}
          <div className="lg:col-span-5 space-y-8">
            {isAuthenticated ? (
              <ProtectedDashboard onLogout={handleLogout} />
            ) : (
              <AuthJourney 
                setPhase={setPhase} 
                setMathValues={setMathValues} 
                setIsSuccess={setIsSuccess}
                addLog={addLog}
              />
            )}
            
            <ProofTerminal logs={logs} />
          </div>

          {/* Right Column - Visualizer & Math */}
          <div className="lg:col-span-7 flex flex-col gap-8">
            <ProtocolVisualizer 
              phase={phase} 
              values={mathValues} 
              isSuccess={isSuccess} 
            />
            
            <MathExplorer values={mathValues} />
          </div>

        </div>
      </main>
    </div>
  );
}