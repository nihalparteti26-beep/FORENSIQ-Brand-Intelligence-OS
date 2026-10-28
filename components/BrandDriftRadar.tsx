'use client';

import React, { useState } from 'react';
import { immuneEngine, BrandContract } from '../lib/immune';
import { AdHistoryItem } from '../lib/mockData/inkloom';

export function BrandDriftRadar() {
  const [selectedAd, setSelectedAd] = useState<AdHistoryItem | null>(null);
  const [patchApplied, setPatchApplied] = useState(false);
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [issuedContract, setIssuedContract] = useState<BrandContract | null>(null);

  const driftData = immuneEngine.getDriftRadarData();
  const rootCause = immuneEngine.getRootCauseAnalysis();
  const heatmap = immuneEngine.getRepeatedMistakesHeatmap();
  const unclearRules = immuneEngine.getUnclearGuidelines();

  const handleApplyPatch = () => {
    immuneEngine.applySystemicPatch();
    setPatchApplied(true);
  };

  const handleIssueContract = () => {
    const contract = immuneEngine.issueBrandContract({
      assetTitle: "Q4 Enterprise Launch Campaign Master",
      content: "Inkloom saves 25% creative production time backed by SOC-2 Type II audit.",
      approvedBy: "Elena Rostova (Chief Brand Officer)",
      approverRole: "Brand Manager",
      verifiedFactIds: ["FACT-001", "FACT-003"],
      governanceScore: 98
    });
    setIssuedContract(contract);
    setContractModalOpen(true);
  };

  return (
    <div className="space-y-8">
      {/* Brand Drift Radar Line Chart (BrandGene) */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                Brand Drift Radar™ (BrandGene Tone Trajectory)
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                40 Ads Multi-Month Telemetry
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Visualizes brand drift over 6 months: From authoritative & informative down to hyper-urgency and salesy copy.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-rose-400 bg-rose-950/40 border border-rose-800/40 px-2.5 py-1 rounded-lg">
              📉 Tone Delta: -78 pts
            </span>
          </div>
        </div>

        {/* Custom SVG Line Chart for 40 Ads History */}
        <div className="relative bg-slate-950/90 rounded-xl p-4 border border-slate-800/80 select-none">
          <div className="flex justify-between text-[10px] text-slate-400 font-mono mb-2">
            <span>May 2024 (Informative / 96%)</span>
            <span className="text-amber-400">July 2024 (Agency X Onboarding)</span>
            <span className="text-rose-400">October 2024 (Urgency Drift / 14%)</span>
          </div>

          <svg className="w-full h-48" viewBox="0 0 800 160">
            {/* Gridlines */}
            <line x1="0" y1="30" x2="800" y2="30" stroke="#1E293B" strokeDasharray="3,3" />
            <line x1="0" y1="80" x2="800" y2="80" stroke="#1E293B" strokeDasharray="3,3" />
            <line x1="0" y1="130" x2="800" y2="130" stroke="#1E293B" strokeDasharray="3,3" />

            {/* Polyline connecting 40 ad data points */}
            <polyline
              fill="none"
              stroke="#6366F1"
              strokeWidth="3"
              points={driftData.ads.map((ad, i) => {
                const x = (i / (driftData.ads.length - 1)) * 780 + 10;
                // toneScore ranges 0 to 100, invert for svg y
                const y = 145 - (ad.toneScore / 100) * 125;
                return `${x},${y}`;
              }).join(' ')}
            />

            {/* Render 40 Data Points (Clickable) */}
            {driftData.ads.map((ad, i) => {
              const x = (i / (driftData.ads.length - 1)) * 780 + 10;
              const y = 145 - (ad.toneScore / 100) * 125;
              const isSelected = selectedAd?.id === ad.id;
              const dotColor = ad.flagged ? '#EF4444' : ad.toneScore < 70 ? '#F59E0B' : '#38BDF8';

              return (
                <circle
                  key={ad.id}
                  cx={x}
                  cy={y}
                  r={isSelected ? 6 : ad.flagged ? 4.5 : 3.5}
                  fill={dotColor}
                  stroke="#FFFFFF"
                  strokeWidth={isSelected ? 2 : 1}
                  className="cursor-pointer hover:scale-150 transition-all"
                  onClick={() => setSelectedAd(ad)}
                />
              );
            })}
          </svg>

          {/* Ad Detail Card on Click */}
          {selectedAd && (
            <div className="mt-4 p-4 rounded-xl bg-slate-900 border border-sky-500/40 flex items-start justify-between gap-4 animate-in fade-in">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold text-white font-mono">
                    Ad #{selectedAd.adNumber}: "{selectedAd.title}"
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {selectedAd.date} · {selectedAd.channel}
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                    selectedAd.flagged ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {selectedAd.sentiment}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-sans italic mt-1">
                  "{selectedAd.copySnippet}"
                </p>
                <p className="text-[10px] text-slate-500 font-mono mt-1">
                  Author Agency: {selectedAd.authorAgency} · Tone Score: {selectedAd.toneScore}/100 · Urgency: {selectedAd.urgencyScore}/100
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAd(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Root-Cause Immunizer (Finds WHY Mistakes Repeat) */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 border border-sky-500/40 shadow-2xl">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💉</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                  Root-Cause Immunizer™ (Systemic Error Prevention)
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                  ML Pattern Extraction
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {rootCause.headline}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleApplyPatch}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 shadow-lg cursor-pointer ${
              patchApplied
                ? 'bg-emerald-600 text-white shadow-emerald-500/30'
                : 'bg-gradient-to-r from-sky-500 to-indigo-600 hover:opacity-90 text-white shadow-sky-500/30'
            }`}
          >
            {patchApplied ? (
              <>
                <span>✓ Systemic Patch Deployed</span>
                <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded">18 Seats Protected</span>
              </>
            ) : (
              <>
                <span>⚡ Deploy Systemic Immunization Patch</span>
                <span className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded">1-Click Fix</span>
              </>
            )}
          </button>
        </div>

        {/* Pattern Breakdown Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800">
            <p className="text-[11px] font-mono text-slate-400 uppercase font-semibold mb-2">
              Repeated Error Breakdown (Same Template = 62.5% of Violations):
            </p>
            <div className="space-y-2">
              {rootCause.violationsBreakdown.map((vb, i) => (
                <div key={i} className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-900/60 border border-slate-800/80">
                  <span className="text-slate-300">{vb.rule}</span>
                  <span className="font-mono text-rose-400 font-bold">{vb.occurrences}x</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
            <div>
              <p className="text-[11px] font-mono text-slate-400 uppercase font-semibold mb-2">
                Systemic Solution & Policy Enforcement:
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                {rootCause.systemicFix}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Agency: {rootCause.agency}</span>
              <span className="text-emerald-400 font-bold">Prevents 23 Future Errors</span>
            </div>
          </div>
        </div>
      </div>

      {/* Repeated Mistakes Heatmap & Unclear Guideline Detector */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Heatmap Card */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>🔥</span>
              <span>Repeated Mistakes Heatmap</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">By Department</span>
          </div>
          <div className="space-y-2">
            {heatmap.map((h, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs">
                <div>
                  <p className="text-slate-200 font-medium">{h.guideline}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{h.department}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-rose-400">{h.violationCount} hits</span>
                  <span className={`w-2 h-2 rounded-full ${h.riskWeight === 'High' ? 'bg-rose-500' : 'bg-amber-400'}`} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Unclear Guideline Detector */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>❓</span>
              <span>Unclear Guideline Detector</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Dispute Rates</span>
          </div>
          <div className="space-y-3">
            {unclearRules.map(ur => (
              <div key={ur.ruleId} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-white">{ur.ruleTitle}</span>
                  <span className="font-mono text-amber-400 font-bold">{ur.disputeRate} Disputes</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-normal">
                  {ur.systemicDiagnosis}
                </p>
                <div className="p-2 rounded bg-sky-950/30 border border-sky-800/40 text-[11px] text-sky-200 mt-1">
                  💡 Recommendation: {ur.suggestedClarification}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BrandContract™ Audit Certificate Action */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between flex-wrap gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📜</span>
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Issue Official BrandContract™ Digital Certificate
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Cryptographically anchors approval timestamp, approver signature, and BrandDNA validity.
          </p>
        </div>
        <button
          type="button"
          onClick={handleIssueContract}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-600 to-teal-500 hover:opacity-90 text-white font-bold text-xs shadow-lg shadow-sky-500/20 transition-all font-mono"
        >
          Generate BrandContract™
        </button>
      </div>

      {/* BrandContract Certificate Modal */}
      {contractModalOpen && issuedContract && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-sky-500/50 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏛️</span>
                <div>
                  <h3 className="text-base font-bold text-white font-mono">
                    BrandContract™ Official Certificate
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    ID: {issuedContract.contractId}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setContractModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <p className="text-slate-400 font-mono">Campaign Asset:</p>
                <p className="text-white font-semibold">{issuedContract.assetTitle}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <p className="text-slate-400 font-mono">Approver:</p>
                  <p className="text-white font-medium">{issuedContract.approvedBy}</p>
                  <p className="text-[10px] text-sky-400 font-mono">{issuedContract.approverRole}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <p className="text-slate-400 font-mono">Expiry Date:</p>
                  <p className="text-white font-medium">{issuedContract.expiryDate}</p>
                  <p className="text-[10px] text-emerald-400 font-mono">Valid 365 Days</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px]">
                <p className="text-slate-400">Cryptographic SHA-256 Hash:</p>
                <p className="text-cyan-300 break-all">{issuedContract.sha256Hash}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px]">
                <p className="text-slate-400">Digital Signature:</p>
                <p className="text-indigo-300">{issuedContract.digitalSignature}</p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setContractModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs font-mono"
              >
                Close Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
