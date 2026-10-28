import { INKLOOM_BRAND_FACTS, INKLOOM_MARKETING_ASSETS, type BrandFact, type BrandAsset } from '../mockData/inkloom.ts';

export interface ForensicsNode {
  id: string;
  type: 'fact' | 'document' | 'asset' | 'channel' | 'violation';
  label: string;
  subLabel?: string;
  status: 'valid' | 'expired' | 'flagged' | 'published' | 'investigating';
  riskLevel?: 'Low' | 'Medium' | 'High';
  metadata: Record<string, any>;
  x?: number;
  y?: number;
}

export interface ForensicsEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
  style?: Record<string, any>;
}

export interface BlastRadiusResult {
  rootFactId: string;
  rootClaimText: string;
  affectedAssetsCount: number;
  affectedChannels: string[];
  affectedDecks: string[];
  potentialFineExposure: string;
  assets: Array<{
    id: string;
    title: string;
    type: string;
    channel: string;
    status: string;
    riskLevel: string;
    owner: string;
  }>;
  genealogyTrail: Array<{
    step: number;
    entity: string;
    type: string;
    date: string;
    note: string;
  }>;
}

export class BrandForensicsEngine {
  private assets: BrandAsset[] = [...INKLOOM_MARKETING_ASSETS];
  private facts: BrandFact[] = [...INKLOOM_BRAND_FACTS];

  /**
   * Calculate Blast Radius for any given fact
   */
  public calculateBlastRadius(factId: string): BlastRadiusResult {
    const fact = this.facts.find(f => f.id === factId) || this.facts[0];
    
    // Find all directly dependent assets
    const directAssets = this.assets.filter(a => a.dependentFactIds.includes(factId));
    
    // Simulate downstream ad variants (e.g. 1 deck produces 12 paid ad variants, 3 landing pages, 6 social posts = 23 total)
    const multiplier = factId === 'FACT-001' ? 6 : factId === 'FACT-EXP-001' ? 8 : 4;
    const simulatedCount = Math.max(directAssets.length, directAssets.length * multiplier);

    const channels = Array.from(new Set(directAssets.map(a => a.channel)));
    if (!channels.includes('LinkedIn Ads')) channels.push('LinkedIn Ads');
    if (!channels.includes('Meta Paid Social')) channels.push('Meta Paid Social');
    if (!channels.includes('Enterprise Sales Pipeline')) channels.push('Enterprise Sales Pipeline');

    const genealogyTrail = [
      { step: 1, entity: "Internal Spreadsheet v2 (Q1 2023)", type: "Origin Source", date: "Jan 14, 2023", note: "Draft calculation rounded up from 25.4% to 40% without peer review." },
      { step: 2, entity: "Agency X Pitch Master Deck (Slide 4)", type: "Internal Deck", date: "Mar 22, 2023", note: "Imported into executive presentation without BrandDNA hash verification." },
      { step: 3, entity: "Enterprise Sales Enablement Template v1.2", type: "Sales Asset", date: "Jun 11, 2023", note: "Distributed to 42 account executives globally." },
      { step: 4, entity: "12 Meta & LinkedIn Paid Growth Ads", type: "Public Campaigns", date: "Sep 01, 2024", note: "Active ad spend generating 4.2M public impressions." },
      { step: 5, entity: "Customer Executive Inquiries", type: "External Impact", date: "Oct 18, 2024", note: "Two Fortune 500 prospects noted discrepancies with technical whitepaper." }
    ];

    return {
      rootFactId: fact.id,
      rootClaimText: fact.claim_text,
      affectedAssetsCount: simulatedCount,
      affectedChannels: channels,
      affectedDecks: ["Enterprise_Pitch_Master_v4.pptx", "AgencyX_Social_Templates_Q3.pptx", "TEI_Summary_Brochure_v2.pdf"],
      potentialFineExposure: fact.status === 'expired' ? "$250,000 - $1.2M FTC/Competitor Challenge" : "$0 (Defensible)",
      assets: directAssets.map(a => ({
        id: a.id,
        title: a.title,
        type: a.type,
        channel: a.channel,
        status: a.status,
        riskLevel: a.riskLevel,
        owner: a.owner
      })),
      genealogyTrail
    };
  }

  /**
   * Generates graph nodes and edges for React Flow / D3 visualization
   */
  public getGraphData(activeFactId: string = "FACT-001", isCascadeSimulated: boolean = false) {
    const nodes: ForensicsNode[] = [];
    const edges: ForensicsEdge[] = [];

    // Origin Fact Node
    nodes.push({
      id: "node-fact-root",
      type: "fact",
      label: "FACT-001: 25% Time Savings",
      subLabel: "Forrester TEI Verified Source",
      status: isCascadeSimulated ? "expired" : "valid",
      riskLevel: isCascadeSimulated ? "High" : "Low",
      metadata: { source: "Forrester TEI Study 2023", owner: "Sarah Chen" },
      x: 100,
      y: 200
    });

    // Unverified Offshoot Node (The 40% mutation!)
    nodes.push({
      id: "node-mutation",
      type: "violation",
      label: "MUTATION: '40% Efficiency'",
      subLabel: "Unbacked claim introduced in Spreadsheet v2",
      status: "flagged",
      riskLevel: "High",
      metadata: { introducedBy: "Agency X Growth", date: "2023-01-14" },
      x: 400,
      y: 80
    });

    // Document Intermediate Nodes
    nodes.push({
      id: "node-doc-spreadsheet",
      type: "document",
      label: "Spreadsheet_v2_2023.xlsx",
      subLabel: "Origin Spread Document",
      status: "investigating",
      riskLevel: "Medium",
      metadata: { author: "Agency X Analyst" },
      x: 400,
      y: 260
    });

    nodes.push({
      id: "node-doc-deck",
      type: "document",
      label: "Sales_Pitch_Master_Q3.pptx",
      subLabel: "Slide 4 Claim Container",
      status: isCascadeSimulated ? "flagged" : "published",
      riskLevel: "High",
      metadata: { views: 1820 },
      x: 700,
      y: 180
    });

    // Public Asset Nodes
    const assetNodes = [
      { id: "node-asset-1", label: "12 Meta Paid Ads", sub: "Ad Set #8491", y: 60, risk: "High" as const },
      { id: "node-asset-2", label: "6 LinkedIn Sponsored Posts", sub: "Executive Campaign", y: 150, risk: "High" as const },
      { id: "node-asset-3", label: "Q4 Enterprise Brochure", sub: "PDF Downloads", y: 240, risk: "Medium" as const },
      { id: "node-asset-4", label: "Website Pricing & ROI Page", sub: "Public URL", y: 330, risk: "High" as const },
      { id: "node-asset-5", label: "Customer Case Study Deck", sub: "SlideShare & Sales", y: 410, risk: "Medium" as const }
    ];

    assetNodes.forEach(an => {
      nodes.push({
        id: an.id,
        type: "asset",
        label: an.label,
        subLabel: an.sub,
        status: isCascadeSimulated ? "flagged" : "published",
        riskLevel: an.risk,
        metadata: { channel: "Public Distribution" },
        x: 1000,
        y: an.y
      });
    });

    // Downstream Channels
    nodes.push({
      id: "node-chan-meta",
      type: "channel",
      label: "Meta Graph API (4.2M Impr)",
      subLabel: "Active Paid Spend",
      status: isCascadeSimulated ? "flagged" : "published",
      riskLevel: "High",
      metadata: { spend: "$42,000/mo" },
      x: 1300,
      y: 100
    });

    nodes.push({
      id: "node-chan-sales",
      type: "channel",
      label: "Salesforce Outreach (42 Reps)",
      subLabel: "Active Sales Sequences",
      status: isCascadeSimulated ? "flagged" : "published",
      riskLevel: "High",
      metadata: { activeLeads: 850 },
      x: 1300,
      y: 280
    });

    // Build Edges
    edges.push(
      { id: "e1", source: "node-fact-root", target: "node-doc-spreadsheet", label: "cited in", animated: true },
      { id: "e2", source: "node-doc-spreadsheet", target: "node-mutation", label: "mutated to 40%", animated: true, style: { stroke: "#EF4444", strokeWidth: 2 } },
      { id: "e3", source: "node-mutation", target: "node-doc-deck", label: "copied into", animated: true },
      { id: "e4", source: "node-doc-deck", target: "node-asset-1", label: "spawned 12 ads", animated: isCascadeSimulated },
      { id: "e5", source: "node-doc-deck", target: "node-asset-2", label: "derived into", animated: isCascadeSimulated },
      { id: "e6", source: "node-doc-deck", target: "node-asset-3", label: "brochure content", animated: isCascadeSimulated },
      { id: "e7", source: "node-doc-deck", target: "node-asset-4", label: "web page ROI", animated: isCascadeSimulated },
      { id: "e8", source: "node-doc-deck", target: "node-asset-5", label: "customer deck", animated: isCascadeSimulated },
      { id: "e9", source: "node-asset-1", target: "node-chan-meta", label: "live ad spend", animated: true },
      { id: "e10", source: "node-asset-2", target: "node-chan-sales", label: "sales collateral", animated: true }
    );

    return { nodes, edges };
  }
}

export const forensicsEngine = new BrandForensicsEngine();
