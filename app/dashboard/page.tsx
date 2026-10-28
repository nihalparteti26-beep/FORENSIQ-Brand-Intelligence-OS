'use client';

import React, { useState } from 'react';
import { Sidebar } from '../../components/Sidebar';
import { Topbar } from '../../components/Topbar';
import { JudgeDemoBar } from '../../components/JudgeDemoBar';
import { BrandDriftRadar } from '../../components/BrandDriftRadar';

export default function DashboardPage() {
  const [currentRole, setCurrentRole] = useState<'Creator' | 'Brand Manager' | 'Reviewer' | 'Legal & Compliance'>('Legal & Compliance');
  const [privacyShieldActive, setPrivacyShieldActive] = useState(true);

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar currentPath="/dashboard" />
      <div className="flex-1 flex flex-col min-w-0">
        <JudgeDemoBar activePage="dashboard" />
        <Topbar
          title="Step 5: Approval & Immunity (Audit & Insights)"
          subtitle="Risk-based routing, BrandContract™ issuance, 40-ad Drift Radar & Root-Cause Immunizer"
          currentRole={currentRole}
          onRoleChange={setCurrentRole}
          privacyShieldActive={privacyShieldActive}
          onTogglePrivacyShield={() => setPrivacyShieldActive(!privacyShieldActive)}
        />
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full overflow-y-auto">
          {/* Risk-Based Approval Routing Pipeline */}
          <div className="mb-8 p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl">
            <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider mb-3">
              Automated Risk-Based Approval Pipeline
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-emerald-500/30">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-emerald-400">Low Risk Tier</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    Auto-Approved
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Typos, punctuation, contrast adjustments automatically patched with instant BrandContract generation.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-amber-500/30">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-amber-400">Medium Risk Tier</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                    Brand Manager
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Tone drift, secondary color deviations, and minor lexicon flags routed to Brand Director.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-rose-500/30">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-rose-400">High Risk Tier</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">
                    Legal & Compliance
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Unsubstantiated performance percentages (e.g. 40%), expired pricing ($49), or FTC liability require General Counsel signoff.
                </p>
              </div>
            </div>
          </div>

          <BrandDriftRadar />
        </main>
      </div>
    </div>
  );
}
