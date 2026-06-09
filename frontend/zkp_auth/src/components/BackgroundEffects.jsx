import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export function BackgroundEffects() {
  const [nodes, setNodes] = useState([]);

  useEffect(() => {
    // Generate random nodes for the network effect
    const newNodes = Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 1,
      delay: Math.random() * 5,
      duration: Math.random() * 10 + 10
    }));
    setNodes(newNodes);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {/* Matte black base */}
      <div className="absolute inset-0 bg-black" />
      
      {/* Subtle crimson and pink glow in the center */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-rose-900/10 rounded-full blur-[120px] mix-blend-screen" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-pink-900/10 rounded-full blur-[80px] mix-blend-screen" />

      {/* Binary Rain / Matrix subtle overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03] mix-blend-screen"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Ctext x='10' y='20' font-family='monospace' font-size='10' fill='%23ffffff'%3E0%3C/text%3E%3Ctext x='40' y='50' font-family='monospace' font-size='10' fill='%23ffffff'%3E1%3C/text%3E%3Ctext x='25' y='35' font-family='monospace' font-size='10' fill='%23ffffff'%3E%2B%3C/text%3E%3C/svg%3E")`,
          backgroundSize: '60px 60px'
        }}
      />

      {/* Floating Network Nodes */}
      {nodes.map((node) => (
        <motion.div
          key={node.id}
          className="absolute rounded-full bg-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.3)]"
          style={{
            width: node.size,
            height: node.size,
            left: `${node.x}%`,
            top: `${node.y}%`,
          }}
          animate={{
            y: [0, -20, 0, 20, 0],
            x: [0, 15, 0, -15, 0],
            opacity: [0.1, 0.5, 0.1]
          }}
          transition={{
            duration: node.duration,
            repeat: Infinity,
            delay: node.delay,
            ease: "linear"
          }}
        />
      ))}

      {/* Grid overlay */}
      <div 
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }}
      />
      
      {/* Bottom fade */}
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-black to-transparent" />
    </div>
  );
}
