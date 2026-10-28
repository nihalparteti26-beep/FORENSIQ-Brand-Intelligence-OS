'use client';

import React, { useState } from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Topbar } from '../../components/Topbar';
import { JudgeDemoBar } from '../../components/JudgeDemoBar';
import { MultiAgentDebate } from '../../components/MultiAgentDebate';
import { brandCompiler, CompilerReport } from '../../lib/compiler';
import { brandNegotiator, MultiAgentDebateResult } from '../../lib/compiler/agents';
import { DEMO_PRESET_SCENARIOS } from '../../lib/mockData/inkloom';

export default function ReviewPage() {
  const [currentRole, setCurrentRole] = useState<'Creator' | 'Brand Manager' | 'Reviewer' | 'Legal & Compliance'>('Reviewer');
  const [privacyShieldActive, setPrivacyShieldActive] = useState(true);
  const [draftContent, setDraftContent] = useState(DEMO_PRESET_SCENARIOS.highRisk.content);
  const [report, setReport] = useState<CompilerReport>(brandCompiler.compile(draftContent));
  const [debate, setDebate] = useState<MultiAgentDebateResult>(brandNegotiator.conductDebate(draftContent, report));
  const [isCompiling, setIsCompiling] = useState(false);
  const [showJsonAudit, setShowJsonAudit] = useState(false);

  const handleRunCompiler = () => {
    setIsCompiling(true);
    setTimeout(() => {
      const newReport = brandCompiler.compile(draftContent);
      setReport(newReport);
      setDebate(brandNegotiator.conductDebate(draftContent, newReport));
      setIsCompiling(false);
    }, 1000);
  };

  const checks = [
    { num: '01', title: 'Tone Check', detail: 'LLM tone & sentiment analysis vs brand guidelines', status: report.findings.some(f => f.category === 'Tone') ? 'WARN' : 'PASS' },
    { num: '02', title: 'Terminology Check', detail: 'Banned vocabulary list vs approved lexicon', status: report.findings.some(f => f.category === 'Terminology') ? 'FAIL' : 'PASS' },
    { num: '03', title: 'Messaging Check', detail: 'Core value pillars, positioning & required disclaimers', status: report.findings.some(f => f.category === 'Messaging') ? 'WARN' : 'PASS' },
    { num: '04', title: 'Visual Check', detail: 'Logo version (v2.4 SVG), brand hex #0284C7, typography', status: report.findings.some(f => f.category === 'Visual') ? 'WARN' : 'PASS' },
    { num: '05', title: 'Accessibility Check', detail: 'WCAG 2.1 contrast (4.5:1 ratio) & axe-core rules', status: report.findings.some(f => f.category === 'Accessibility') ? 'FAIL' : 'PASS' },
    { num: '06', title: 'Claim Evidence Check', detail: 'Qdrant vector similarity match to BrandDNA facts', status: report.findings.some(f => f.category === 'Claim Evidence') ? 'FAIL' : 'PASS' },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar currentPath="/review" />
      <div className="flex-1 flex flex-col min-w-0">
        <JudgeDemoBar activePage="review" />
        <Topbar
          title="Step 3: Pre-Publish Compiler Check"
          subtitle="6 deterministic brand governance tests + Autonomous 4-Agent Debate (BrandNegotiator)"
          currentRole={currentRole}
          onRoleChange={setCurrentRole}
          privacyShieldActive={privacyShieldActive}
          onTogglePrivacyShield={() => setPrivacyShieldActive(!privacyShieldActive)}
        />
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6 overflow-y-auto">
          {/* Action Header Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 border border-slate-800 flex items-center justify-between flex-wrap gap-4 shadow-xl">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">⚙️</span>
                <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  BrandTrust Compiler™ Pre-Flight Execution
                </h2>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Compiles creative content against 200+ testable brand, legal, and visual policies.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowJsonAudit(!showJsonAudit)}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition-all"
              >
                {showJsonAudit ? 'Hide JSON Report' : '{ } View Audit JSON'}
              </button>
              <button
                type="button"
                onClick={handleRunCompiler}
                disabled={isCompiling}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-600 to-teal-500 hover:opacity-90 text-white font-bold text-xs shadow-lg shadow-sky-500/20 transition-all font-mono flex items-center gap-2 cursor-pointer"
              >
                {isCompiling ? (
                  <>
                    <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Compiling 6 Tests...</span>
                  </>
                ) : (
                  <>
                    <span>⚡ Run BrandTrust Compiler</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 6 Automated Check Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {checks.map(c => {
              const isPass = c.status === 'PASS';
              const isWarn = c.status === 'WARN';
              return (
                <div
                  key={c.num}
                  className={`p-4 rounded-xl border transition-all ${
                    isPass
                      ? 'bg-slate-900/60 border-emerald-500/30'
                      : isWarn
                      ? 'bg-slate-900/60 border-amber-500/30'
                      : 'bg-slate-900/60 border-rose-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-slate-500">CHECK {c.num}</span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                        isPass
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : isWarn
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-white mb-1">{c.title}</h3>
                  <p className="text-[11px] text-slate-400 leading-normal">{c.detail}</p>
                </div>
              );
            })}
          </div>

          {/* JSON Audit Report Drawer */}
          {showJsonAudit && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-sky-300 overflow-x-auto max-h-72">
              <pre>{JSON.stringify({ report, debateConsensus: debate.synthesizedConsensus }, null, 2)}</pre>
            </div>
          )}

          {/* 4-Agent Debate Surface (BrandNegotiator) */}
          <MultiAgentDebate debateResult={debate} />
        </main>
      </div>
    </div>
  );
}
