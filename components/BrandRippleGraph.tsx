'use client';

import React, { useState } from 'react';
import { forensicsEngine, BlastRadiusResult, ForensicsNode, ForensicsEdge } from '../lib/forensics';

export function BrandRippleGraph() {
  const [isSimulated, setIsSimulated] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedFactId, setSelectedFactId] = useState<string>("FACT-001");
  const [activeNode, setActiveNode] = useState<ForensicsNode | null>(null);

  const blastRadius: BlastRadiusResult = forensicsEngine.calculateBlastRadius(selectedFactId);
  const graphData = forensicsEngine.getGraphData(selectedFactId, isSimulated);

  const handleTriggerSimulation = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setIsSimulated(!isSimulated);
      setIsAnimating(false);
    }, 1800);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between flex-wrap gap-4 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              BrandRipple™ Claim Provenance & Impact Graph
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
              Interactive React Flow / D3
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Trace claims from origin spreadsheets to sales decks and multi-channel public ads.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* 2-Second Cascade Simulation Button (Core Requirement!) */}
          <button
            type="button"
            onClick={handleTriggerSimulation}
            disabled={isAnimating}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 shadow-lg cursor-pointer ${
              isSimulated
                ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/30'
                : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-amber-500/30'
            }`}
          >
            {isAnimating ? (
              <>
                <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Simulating 2-Sec Cascade...</span>
              </>
            ) : isSimulated ? (
              <>
                <span>⚠️ Cascade Active: 47 Assets Flagged</span>
                <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded">Reset</span>
              </>
            ) : (
              <>
                <span>⚡ Simulate Fact Expiry / Change</span>
                <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded">2-Sec Test</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Blast Radius KPI Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <p className="text-[11px] font-mono text-slate-400 uppercase font-semibold">
            Root Fact Focus:
          </p>
          <p className="text-sm font-bold text-white mt-1">
            FACT-001 (25% Savings)
          </p>
          <span className="text-[10px] text-emerald-400 font-mono">Source: Forrester TEI Study</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <p className="text-[11px] font-mono text-slate-400 uppercase font-semibold">
            Blast Radius Reach:
          </p>
          <p className="text-2xl font-extrabold text-cyan-400 font-mono mt-0.5">
            {isSimulated ? '47' : blastRadius.affectedAssetsCount} Assets
          </p>
          <span className="text-[10px] text-slate-400">1 Fact → 23 to 47 live assets</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <p className="text-[11px] font-mono text-slate-400 uppercase font-semibold">
            Affected Channels:
          </p>
          <div className="flex flex-wrap gap-1 mt-1.5">
            {blastRadius.affectedChannels.map(c => (
              <span key={c} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                {c}
              </span>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
          <p className="text-[11px] font-mono text-slate-400 uppercase font-semibold">
            Automated Containment Time:
          </p>
          <p className="text-2xl font-extrabold text-emerald-400 font-mono mt-0.5">
            1.8s
          </p>
          <span className="text-[10px] text-slate-400">vs 3 days manual audit</span>
        </div>
      </div>

      {/* Interactive Visual Graph Canvas */}
      <div className="relative rounded-2xl border border-slate-800 bg-slate-950/90 overflow-hidden shadow-2xl min-h-[500px]">
        {/* Graph Legend */}
        <div className="absolute top-4 left-4 z-20 bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-800 text-xs space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <span className="text-slate-300 font-mono text-[11px]">Approved BrandDNA Fact</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-slate-300 font-mono text-[11px]">Unverified Mutation (40%)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
            <span className="text-slate-300 font-mono text-[11px]">Internal Pitch Deck</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-slate-300 font-mono text-[11px]">Public Ads / Channels</span>
          </div>
        </div>

        {/* SVG Topology & Node Canvas */}
        <svg className="w-full h-[520px] select-none" viewBox="0 0 1450 520">
          <defs>
            <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0284C7" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#6366F1" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="alertGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#EF4444" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.9" />
            </linearGradient>
          </defs>

          {/* Render Connections */}
          {graphData.edges.map(e => {
            const sNode = graphData.nodes.find(n => n.id === e.source);
            const tNode = graphData.nodes.find(n => n.id === e.target);
            if (!sNode || !tNode) return null;

            const isRed = e.style?.stroke === '#EF4444' || isSimulated;
            return (
              <g key={e.id}>
                <line
                  x1={sNode.x}
                  y1={sNode.y}
                  x2={tNode.x}
                  y2={tNode.y}
                  stroke={isRed ? 'url(#alertGrad)' : 'url(#edgeGrad)'}
                  strokeWidth={isRed ? '2.5' : '1.5'}
                  strokeDasharray={e.animated ? '5,5' : undefined}
                />
                {e.label && (
                  <text
                    x={(sNode.x! + tNode.x!) / 2}
                    y={(sNode.y! + tNode.y!) / 2 - 8}
                    fill={isRed ? '#FCA5A5' : '#94A3B8'}
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {e.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Render Interactive Nodes */}
          {graphData.nodes.map(n => {
            const isSelected = activeNode?.id === n.id;
            let bgColor = '#0F172A';
            let strokeColor = '#38BDF8';
            let glow = 'rgba(56, 189, 248, 0.2)';

            if (n.type === 'violation' || (isSimulated && n.type === 'asset')) {
              strokeColor = '#EF4444';
              glow = 'rgba(239, 68, 68, 0.4)';
            } else if (n.type === 'document') {
              strokeColor = '#818CF8';
            } else if (n.type === 'channel') {
              strokeColor = '#F59E0B';
            }

            return (
              <g
                key={n.id}
                onClick={() => setActiveNode(n)}
                className="cursor-pointer transition-all hover:opacity-90"
                transform={`translate(${n.x}, ${n.y})`}
              >
                <circle
                  r={isSelected ? 32 : 26}
                  fill={bgColor}
                  stroke={strokeColor}
                  strokeWidth={isSelected ? 3 : 2}
                  style={{ filter: `drop-shadow(0 0 10px ${glow})` }}
                />
                <text
                  textAnchor="middle"
                  dy="-4"
                  fill="#FFFFFF"
                  fontSize="10"
                  fontWeight="bold"
                  fontFamily="sans-serif"
                >
                  {n.label.length > 18 ? n.label.slice(0, 16) + '..' : n.label}
                </text>
                <text
                  textAnchor="middle"
                  dy="12"
                  fill="#94A3B8"
                  fontSize="8"
                  fontFamily="monospace"
                >
                  {n.type.toUpperCase()}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Selected Node Drawer / Info Card */}
        {activeNode && (
          <div className="absolute bottom-4 right-4 z-20 w-80 p-4 rounded-xl bg-slate-900/95 border border-sky-500/40 shadow-2xl backdrop-blur-md animate-in fade-in duration-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">
                {activeNode.type} Node Details
              </span>
              <button
                type="button"
                onClick={() => setActiveNode(null)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>
            <h4 className="text-sm font-bold text-white leading-tight">
              {activeNode.label}
            </h4>
            <p className="text-xs text-slate-300 mt-1">
              {activeNode.subLabel}
            </p>
            <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400 font-mono space-y-1">
              <p>Risk Level: <span className="text-amber-400">{activeNode.riskLevel || 'Standard'}</span></p>
              <p>Status: <span className="text-cyan-400">{activeNode.status}</span></p>
            </div>
          </div>
        )}
      </div>

      {/* Claim Genealogy Timeline (Spreadsheet v2 -> Sales Deck -> 12 Ads) */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
        <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider mb-4 flex items-center gap-2">
          <span>📜</span>
          <span>Claim Genealogy Audit Trail (Origin → Spread → Impact)</span>
        </h3>
        <div className="relative border-l-2 border-slate-700 ml-4 pl-6 space-y-6">
          {blastRadius.genealogyTrail.map((item) => (
            <div key={item.step} className="relative">
              <span className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-slate-950 border-2 border-sky-400 flex items-center justify-center text-[9px] font-bold text-white">
                {item.step}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white">{item.entity}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    {item.type}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">{item.date}</span>
                </div>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {item.note}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
