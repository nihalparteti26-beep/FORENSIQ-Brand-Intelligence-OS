import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import neo4j from 'neo4j-driver';
import { INKLOOM_BRAND_FACTS, INKLOOM_MARKETING_ASSETS } from '../mockData/inkloom.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const STORE_PATH = path.join(DATA_DIR, 'neo4j_store.json');

export interface GraphNode {
  id: string;
  labels: string[];
  properties: Record<string, any>;
}

export interface GraphRelationship {
  id: string;
  type: string;
  startNodeId: string;
  endNodeId: string;
  properties: Record<string, any>;
}

export interface GraphStoreState {
  nodes: Record<string, GraphNode>;
  relationships: GraphRelationship[];
  auditLogs: Array<{
    id: string;
    action: string;
    actor: string;
    timestamp: string;
    details: any;
  }>;
}

class Neo4jGraphService {
  private driver: any = null;
  private isConnected = false;
  private storeState: GraphStoreState = {
    nodes: {},
    relationships: [],
    auditLogs: []
  };

  constructor() {
    this.initStore();
    this.initDriver();
  }

  private initStore() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(STORE_PATH)) {
      try {
        const raw = fs.readFileSync(STORE_PATH, 'utf-8');
        this.storeState = JSON.parse(raw);
        return;
      } catch (err) {
        console.warn('⚠️  Could not read existing neo4j_store.json, re-initializing...', err);
      }
    }

    // Seed default state from Inkloom mock data
    this.seedDefaultGraph();
    this.persistStore();
  }

  private seedDefaultGraph() {
    this.storeState = {
      nodes: {},
      relationships: [],
      auditLogs: []
    };

    // 1. Seed Documents
    const docs = [
      { id: 'DOC-001', title: 'Forrester Total Economic Impact Study 2023', version: 'v2.1', type: 'PDF' },
      { id: 'DOC-002', title: 'Inkloom Brand Master Guidelines 2024', version: 'v2.4', type: 'PDF' },
      { id: 'DOC-003', title: 'A-LIGN SOC-2 Annual Audit Report 2024', version: 'v3.0', type: 'PDF' },
      { id: 'DOC-004', title: 'Enterprise Growth Pitch Master Template', version: 'v1.2', type: 'PPTX' }
    ];
    for (const d of docs) {
      this.storeState.nodes[d.id] = {
        id: d.id,
        labels: ['Document'],
        properties: { ...d, createdAt: '2024-01-15T00:00:00Z' }
      };
    }

    // 2. Seed BrandDNA Facts
    for (const f of INKLOOM_BRAND_FACTS) {
      this.storeState.nodes[f.id] = {
        id: f.id,
        labels: ['Fact'],
        properties: {
          id: f.id,
          claim: f.claim_text,
          category: f.category,
          sourceDoc: f.source_doc,
          evidenceUrl: f.evidence_url,
          expiryDate: f.expiry_date,
          version: f.version,
          owner: f.owner,
          confidence: f.confidence,
          status: f.status,
          tags: f.tags,
          createdAt: '2024-02-01T00:00:00Z',
          updatedAt: '2024-02-01T00:00:00Z'
        }
      };

      // Connect to root document
      this.storeState.relationships.push({
        id: `rel_${f.id}_doc`,
        type: 'EXTRACTED_FROM',
        startNodeId: f.id,
        endNodeId: 'DOC-001',
        properties: { confidence: f.confidence }
      });
    }

    // 3. Seed Marketing Assets (Exactly 23 initial assets)
    const allInitialAssets = [...INKLOOM_MARKETING_ASSETS];
    const extraAssets = [
      { id: "ASSET-016", title: "Q4 Growth Retargeting Ad #1", type: "Ad", channel: "Meta Paid Social", owner: "Growth Marketing", status: "published", lastUpdated: "2024-10-18", dependentFactIds: ["FACT-001"], riskLevel: "High", originDoc: "AgencyX_Social_Templates_Q3.pptx" },
      { id: "ASSET-017", title: "Executive Benchmark Carousel #2", type: "Ad", channel: "LinkedIn Ads", owner: "Demand Gen", status: "published", lastUpdated: "2024-10-19", dependentFactIds: ["FACT-001", "FACT-006"], riskLevel: "High", originDoc: "Executive_Carousel_Deck.pptx" },
      { id: "ASSET-018", title: "Enterprise Sales Slide 4 Master", type: "Sales Deck", channel: "Enterprise Direct Sales", owner: "Sales Enablement", status: "published", lastUpdated: "2024-10-20", dependentFactIds: ["FACT-001"], riskLevel: "High", originDoc: "AgencyX_Pitch_Master.pptx" },
      { id: "ASSET-019", title: "Agency X Starter Pitch Template", type: "Sales Deck", channel: "Enterprise Direct Sales", owner: "Agency X Growth Partners", status: "published", lastUpdated: "2024-10-21", dependentFactIds: ["FACT-001", "FACT-EXP-001"], riskLevel: "High", originDoc: "AgencyX_Template_v1.2.pptx" },
      { id: "ASSET-020", title: "Google Performance Max Ad Variant B", type: "Ad", channel: "Google Search", owner: "Paid Search Team", status: "published", lastUpdated: "2024-10-22", dependentFactIds: ["FACT-001"], riskLevel: "High", originDoc: "PMax_Copy_Sheet.xlsx" },
      { id: "ASSET-021", title: "Partner Co-Marketing One-Pager", type: "Landing Page", channel: "Website & Resource Center", owner: "Partner Marketing", status: "published", lastUpdated: "2024-10-23", dependentFactIds: ["FACT-001"], riskLevel: "High", originDoc: "Partner_OnePager.docx" },
      { id: "ASSET-022", title: "Customer Renewal Webinar Slide", type: "Sales Deck", channel: "Marketo Lifecycle", owner: "Customer Marketing", status: "published", lastUpdated: "2024-10-24", dependentFactIds: ["FACT-001"], riskLevel: "Medium", originDoc: "Webinar_Slide_Deck.pptx" },
      { id: "ASSET-023", title: "Brand Intelligence Whitepaper Deck", type: "Sales Deck", channel: "Enterprise Sales Pipeline", owner: "Product Marketing", status: "published", lastUpdated: "2024-10-25", dependentFactIds: ["FACT-001"], riskLevel: "Low", originDoc: "Whitepaper_Deck_v2.pptx" }
    ];
    for (const ea of extraAssets) {
      if (!allInitialAssets.some(a => a.id === ea.id)) {
        allInitialAssets.push(ea as any);
      }
    }

    for (const a of allInitialAssets) {
      this.storeState.nodes[a.id] = {
        id: a.id,
        labels: ['Asset'],
        properties: {
          id: a.id,
          title: a.title,
          type: a.type,
          channel: a.channel,
          owner: a.owner,
          status: a.status,
          lastUpdated: a.lastUpdated,
          riskLevel: a.riskLevel,
          originDoc: a.originDoc,
          content: a.title.includes('Ad') || a.riskLevel === 'High'
            ? `Discover why Inkloom saves 40% efficiency gains for marketing teams. ACT NOW for special enterprise access.`
            : `Enterprise Brand Governance platform overview. Certified SOC-2 Type II with 25% verified productivity gains.`,
          version: 'v1.0',
          complianceScore: a.riskLevel === 'High' ? 42 : a.riskLevel === 'Medium' ? 72 : 95
        }
      };

      // Connect Asset to dependent facts
      for (const factId of a.dependentFactIds) {
        if (this.storeState.nodes[factId]) {
          this.storeState.relationships.push({
            id: `rel_${a.id}_${factId}`,
            type: factId === 'FACT-001' && a.riskLevel === 'High' ? 'MUTATED_FROM' : 'DEPENDS_ON',
            startNodeId: a.id,
            endNodeId: factId,
            properties: {
              mutationNote: factId === 'FACT-001' && a.riskLevel === 'High' ? 'Claim rounded up from 25% to 40%' : 'Direct citation',
              timestamp: '2024-05-10T12:00:00Z'
            }
          });
        }
      }
    }

    // Log seed audit
    this.storeState.auditLogs.push({
      id: 'AUDIT-INIT',
      action: 'SYSTEM_BOOTSTRAP',
      actor: 'System Installer',
      timestamp: new Date().toISOString(),
      details: { factsCount: INKLOOM_BRAND_FACTS.length, assetsCount: INKLOOM_MARKETING_ASSETS.length }
    });
  }

  private persistStore() {
    try {
      const tempPath = `${STORE_PATH}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.storeState, null, 2), 'utf-8');
      fs.renameSync(tempPath, STORE_PATH);
    } catch (err) {
      console.error('❌ Failed to persist neo4j_store.json:', err);
    }
  }

  private async initDriver() {
    const uri = process.env.NEO4J_URI;
    const user = process.env.NEO4J_USERNAME;
    const password = process.env.NEO4J_PASSWORD;

    if (uri && user && password) {
      try {
        this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
        const serverInfo = await this.driver.getServerInfo();
        this.isConnected = true;
        console.log(`✅ Connected to Neo4j instance at: ${uri} (${serverInfo.agent})`);
      } catch (err: any) {
        console.warn(`⚠️  Neo4j connection failed (${err.message}). Using durable file-backed graph store.`);
        this.isConnected = false;
        this.driver = null;
      }
    } else {
      // Development fallback clearly documented
      this.isConnected = false;
    }
  }

  public getConnectionStatus() {
    return {
      mode: this.isConnected ? 'neo4j_live' : 'durable_graph_store',
      connected: this.isConnected,
      uri: process.env.NEO4J_URI || 'local-file://data/neo4j_store.json',
      activeNodesCount: Object.keys(this.storeState.nodes).length,
      relationshipsCount: this.storeState.relationships.length,
      storageFile: STORE_PATH
    };
  }

  // --- FACTS OPERATIONS ---
  public async getAllFacts(filter?: { category?: string; status?: string; search?: string }): Promise<any[]> {
    let facts = Object.values(this.storeState.nodes)
      .filter(n => n.labels.includes('Fact'))
      .map(n => n.properties);

    if (filter) {
      if (filter.category && filter.category !== 'All') {
        facts = facts.filter(f => f.category?.toLowerCase() === filter.category?.toLowerCase());
      }
      if (filter.status && filter.status !== 'All') {
        facts = facts.filter(f => f.status === filter.status);
      }
      if (filter.search) {
        const q = filter.search.toLowerCase();
        facts = facts.filter(f =>
          (f.claim && f.claim.toLowerCase().includes(q)) ||
          (f.id && f.id.toLowerCase().includes(q)) ||
          (f.sourceDoc && f.sourceDoc.toLowerCase().includes(q)) ||
          (f.owner && f.owner.toLowerCase().includes(q))
        );
      }
    }
    return facts;
  }

  public async getFactById(id: string): Promise<any | null> {
    const node = this.storeState.nodes[id];
    if (node && node.labels.includes('Fact')) {
      return node.properties;
    }
    return null;
  }

  public async upsertFact(fact: any): Promise<any> {
    const id = fact.id || `FACT-${String(Object.keys(this.storeState.nodes).length + 1).padStart(3, '0')}`;
    const existing = this.storeState.nodes[id];

    const properties = {
      id,
      claim: fact.claim || fact.claim_text,
      category: fact.category || 'Product',
      sourceDoc: fact.sourceDoc || fact.source_doc || 'Uploaded Brand Document',
      evidenceUrl: fact.evidenceUrl || fact.evidence_url || '',
      expiryDate: fact.expiryDate || fact.expiry_date || '2028-12-31',
      version: fact.version || 'v1.0',
      owner: fact.owner || 'Brand Ingestion Pipeline',
      confidence: typeof fact.confidence === 'number' ? fact.confidence : 0.95,
      status: fact.status || 'valid',
      tags: Array.isArray(fact.tags) ? fact.tags : ['ingested'],
      isInferredExpiry: Boolean(fact.isInferredExpiry),
      inferredNote: fact.inferredNote || null,
      pageNumber: fact.pageNumber || null,
      provenance: fact.provenance || null,
      createdAt: existing ? existing.properties.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.storeState.nodes[id] = {
      id,
      labels: ['Fact'],
      properties
    };

    // If source document specified, link to document
    if (fact.documentId && this.storeState.nodes[fact.documentId]) {
      this.storeState.relationships.push({
        id: `rel_${id}_${fact.documentId}`,
        type: 'EXTRACTED_FROM',
        startNodeId: id,
        endNodeId: fact.documentId,
        properties: { page: fact.pageNumber || 1, confidence: properties.confidence }
      });
    }

    this.storeState.auditLogs.push({
      id: `AUDIT-${Date.now()}`,
      action: existing ? 'FACT_UPDATED' : 'FACT_CREATED',
      actor: fact.owner || 'Pipeline',
      timestamp: new Date().toISOString(),
      details: { factId: id, claim: properties.claim }
    });

    this.persistStore();
    return properties;
  }

  public async toggleFactExpiry(id: string): Promise<any> {
    const node = this.storeState.nodes[id];
    if (!node || !node.labels.includes('Fact')) {
      throw new Error(`Fact with id ${id} not found`);
    }

    const currentStatus = node.properties.status;
    const newStatus = currentStatus === 'valid' ? 'expired' : 'valid';
    node.properties.status = newStatus;
    node.properties.expiryDate = newStatus === 'expired' ? '2023-12-31' : '2028-12-31';
    node.properties.updatedAt = new Date().toISOString();

    this.storeState.auditLogs.push({
      id: `AUDIT-${Date.now()}`,
      action: 'FACT_EXPIRY_TOGGLED',
      actor: 'Brand Manager',
      timestamp: new Date().toISOString(),
      details: { factId: id, newStatus, newExpiry: node.properties.expiryDate }
    });

    this.persistStore();
    return node.properties;
  }

  // --- ASSETS OPERATIONS ---
  public async getAllAssets(): Promise<any[]> {
    return Object.values(this.storeState.nodes)
      .filter(n => n.labels.includes('Asset'))
      .map(n => n.properties);
  }

  public async getAssetById(id: string): Promise<any | null> {
    const node = this.storeState.nodes[id];
    if (node && node.labels.includes('Asset')) {
      return node.properties;
    }
    return null;
  }

  public async addAsset(assetData: {
    title: string;
    content: string;
    actor?: string;
    channel?: string;
    type?: string;
    complianceScore?: number;
    bypassedRules?: any[];
    dependentFactId?: string;
  }): Promise<{ asset: any; totalAssets: number }> {
    const currentAssetNodes = Object.values(this.storeState.nodes).filter(n => n.labels.includes('Asset'));
    const nextNum = currentAssetNodes.length + 1;
    const assetId = `ASSET-${String(nextNum).padStart(3, '0')}`;

    const newAsset = {
      id: assetId,
      title: assetData.title || `Campaign Ad #${nextNum}`,
      type: assetData.type || 'Ad',
      channel: assetData.channel || 'LinkedIn Ads',
      owner: assetData.actor || 'Content Creator',
      status: 'published',
      lastUpdated: new Date().toISOString().split('T')[0],
      riskLevel: (assetData.complianceScore ?? 50) < 60 ? 'High' : (assetData.complianceScore ?? 50) < 85 ? 'Medium' : 'Low',
      originDoc: 'Creation-Firewall-Override',
      content: assetData.content,
      version: 'v1.0',
      complianceScore: assetData.complianceScore ?? 45,
      bypassedRules: assetData.bypassedRules || [],
      publishedAt: new Date().toISOString()
    };

    // Store node
    this.storeState.nodes[assetId] = {
      id: assetId,
      labels: ['Asset'],
      properties: newAsset
    };

    // Determine target fact to link
    const targetFactId = assetData.dependentFactId || (assetData.content.includes('40%') ? 'FACT-001' : 'FACT-001');

    // Create MUTATED_FROM relationship if non-compliant claim
    this.storeState.relationships.push({
      id: `rel_${assetId}_${targetFactId}`,
      type: newAsset.riskLevel === 'High' ? 'MUTATED_FROM' : 'DEPENDS_ON',
      startNodeId: assetId,
      endNodeId: targetFactId,
      properties: {
        timestamp: new Date().toISOString(),
        actor: assetData.actor || 'Creator',
        note: `Override publication: "${newAsset.title}"`
      }
    });

    // Record audit event
    this.storeState.auditLogs.push({
      id: `AUDIT-${Date.now()}`,
      action: 'ASSET_FORCE_PUBLISHED',
      actor: assetData.actor || 'Creator',
      timestamp: new Date().toISOString(),
      details: {
        assetId,
        score: newAsset.complianceScore,
        bypassedRulesCount: newAsset.bypassedRules.length
      }
    });

    this.persistStore();

    const updatedTotal = Object.values(this.storeState.nodes).filter(n => n.labels.includes('Asset')).length;
    return { asset: newAsset, totalAssets: updatedTotal };
  }

  // --- FORENSICS & GRAPH TRAVERSAL ---
  public async getRippleGraph(rootFactId = 'FACT-001') {
    const rootFact = this.storeState.nodes[rootFactId]?.properties || null;

    // Find all assets linked via MUTATED_FROM or DEPENDS_ON to rootFactId
    const downstreamRels = this.storeState.relationships.filter(
      r => r.endNodeId === rootFactId && (r.type === 'MUTATED_FROM' || r.type === 'DEPENDS_ON')
    );

    const assetIds = new Set(downstreamRels.map(r => r.startNodeId));
    const affectedAssets = Object.values(this.storeState.nodes)
      .filter(n => n.labels.includes('Asset') && assetIds.has(n.id))
      .map(n => n.properties);

    // Channels count
    const channels = [...new Set(affectedAssets.map(a => a.channel))];

    return {
      rootFact: rootFact ? `${rootFact.id} (${rootFact.claim.slice(0, 30)}...)` : 'FACT-001 (25% Savings)',
      rootFactDetails: rootFact,
      affectedAssetsCount: affectedAssets.length,
      channels: channels.length > 0 ? channels : ['LinkedIn', 'Meta', 'Google Search', 'Sales Decks'],
      containmentSeconds: 1.8,
      assets: affectedAssets,
      relationships: downstreamRels
    };
  }

  // --- IMMUNIZER SELF-HEALING REPAIRS ---
  public async proposeRemediation(targetFactId = 'FACT-001') {
    const approvedFact = this.storeState.nodes[targetFactId]?.properties;
    const replacementClaim = approvedFact
      ? '25% creative production time savings (Forrester TEI Study 2023, p. 14)'
      : '25% creative production time savings';

    // Find all assets needing remediation
    const assets = Object.values(this.storeState.nodes)
      .filter(n => n.labels.includes('Asset'))
      .map(n => n.properties);

    const proposals = assets.map(asset => {
      let originalText = asset.content || asset.title;
      let proposedText = originalText;
      let needsRepair = false;

      // Replace 40% efficiency with 25% approved
      if (/40%\s*(?:more\s*)?(?:efficient|efficiency|time\s*savings|faster)/i.test(originalText)) {
        proposedText = originalText.replace(
          /40%\s*(?:more\s*)?(?:efficient|efficiency|time\s*savings|faster)/gi,
          '25% creative production time savings'
        );
        needsRepair = true;
      }

      // Replace $49 expired pricing
      if (/\$49(?:\/seat)?/i.test(proposedText)) {
        proposedText = proposedText.replace(/\$49(?:\/seat)?/gi, 'tailored enterprise pricing');
        needsRepair = true;
      }

      // Replace banned words
      if (/\bcheap\b/i.test(proposedText)) {
        proposedText = proposedText.replace(/\bcheap\b/gi, 'cost-effective');
        needsRepair = true;
      }
      if (/\bmiracle\b/i.test(proposedText)) {
        proposedText = proposedText.replace(/\bmiracle\b/gi, 'proven automated');
        needsRepair = true;
      }
      if (/\binsane\b/i.test(proposedText)) {
        proposedText = proposedText.replace(/\binsane\b/gi, 'measurable');
        needsRepair = true;
      }
      if (/\bact now\b/i.test(proposedText)) {
        proposedText = proposedText.replace(/\bact now\b/gi, 'explore enterprise architecture');
        needsRepair = true;
      }

      return {
        assetId: asset.id,
        assetTitle: asset.title,
        channel: asset.channel,
        currentVersion: asset.version || 'v1.0',
        proposedVersion: 'v2.0',
        currentScore: asset.complianceScore || 45,
        projectedScore: 98,
        needsRepair,
        originalContent: originalText,
        proposedContent: proposedText,
        approvedSourceFact: targetFactId,
        evidenceDoc: approvedFact?.sourceDoc || 'Forrester TEI Study 2023 (p. 14)'
      };
    });

    return {
      targetFactId,
      approvedReplacement: replacementClaim,
      totalDownstream: assets.length,
      eligibleForRepair: proposals.filter(p => p.needsRepair).length,
      proposals
    };
  }

  public async executeRemediationPatch(options: {
    actor: string;
    role: string;
    targetFactId?: string;
  }): Promise<{
    success: boolean;
    total: number;
    succeeded: number;
    failed: number;
    skipped: number;
    pending: number;
    repairedAssetIds: string[];
    transactionId: string;
    timestamp: string;
  }> {
    const { actor, role, targetFactId = 'FACT-001' } = options;

    // Authorization check
    if (!['Legal & Compliance', 'Brand Manager', 'Reviewer'].includes(role)) {
      throw new Error(`Unauthorized: Role '${role}' does not possess permission to execute systemic remediation patches.`);
    }

    const snapshot = JSON.parse(JSON.stringify(this.storeState));
    const txId = `TX-REMED-${Date.now().toString(36).toUpperCase()}`;

    try {
      const remediationPlan = await this.proposeRemediation(targetFactId);
      let succeeded = 0;
      let failed = 0;
      let skipped = 0;
      const repairedAssetIds: string[] = [];

      for (const proposal of remediationPlan.proposals) {
        try {
          const node = this.storeState.nodes[proposal.assetId];
          if (!node) {
            skipped++;
            continue;
          }

          // Apply update
          node.properties.content = proposal.proposedContent;
          node.properties.version = proposal.proposedVersion;
          node.properties.complianceScore = proposal.projectedScore;
          node.properties.status = 'remediated';
          node.properties.remediatedAt = new Date().toISOString();
          node.properties.remediatedBy = `${actor} (${role})`;
          node.properties.remediationTx = txId;

          // Convert MUTATED_FROM to DEPENDS_ON relationship
          for (const rel of this.storeState.relationships) {
            if (rel.startNodeId === proposal.assetId && rel.type === 'MUTATED_FROM') {
              rel.type = 'DEPENDS_ON';
              rel.properties.remediatedAt = new Date().toISOString();
              rel.properties.remediationTx = txId;
            }
          }

          succeeded++;
          repairedAssetIds.push(proposal.assetId);
        } catch (itemErr) {
          console.error(`Error repairing asset ${proposal.assetId}:`, itemErr);
          failed++;
        }
      }

      // Record audit log
      this.storeState.auditLogs.push({
        id: `AUDIT-${Date.now()}`,
        action: 'SYSTEMIC_IMMUNIZATION_EXECUTED',
        actor: `${actor} (${role})`,
        timestamp: new Date().toISOString(),
        details: {
          txId,
          targetFactId,
          total: remediationPlan.totalDownstream,
          succeeded,
          failed,
          skipped
        }
      });

      this.persistStore();

      return {
        success: failed === 0,
        total: remediationPlan.totalDownstream,
        succeeded,
        failed,
        skipped,
        pending: 0,
        repairedAssetIds,
        transactionId: txId,
        timestamp: new Date().toISOString()
      };
    } catch (txError) {
      // Compensating rollback on multi-step catastrophic failure
      console.error('❌ Catastrophic failure in executeRemediationPatch, rolling back transaction:', txError);
      this.storeState = snapshot;
      this.persistStore();
      throw txError;
    }
  }

  // --- DRIFT RADAR HISTORY ---
  public async getDriftRadarHistory() {
    // Generate multi-month ad drift trajectory, incorporating newly published assets
    const base40Ads = Array.from({ length: 40 }, (_, i) => {
      const adNum = i + 1;
      let toneScore: number, urgencyScore: number, sentiment: string, flagged: boolean;
      if (adNum <= 10) {
        toneScore = 96 - Math.round(adNum * 0.8);
        urgencyScore = 5 + adNum;
        sentiment = 'Objective';
        flagged = false;
      } else if (adNum <= 20) {
        toneScore = 86 - Math.round((adNum - 10) * 1.8);
        urgencyScore = 20 + (adNum - 10) * 3;
        sentiment = 'Persuasive';
        flagged = false;
      } else if (adNum <= 30) {
        toneScore = 65 - Math.round((adNum - 20) * 2.8);
        urgencyScore = 55 + (adNum - 20) * 3.3;
        sentiment = adNum >= 24 ? 'Aggressive Hype' : 'Salesy Drift';
        flagged = adNum >= 24;
      } else {
        toneScore = 35 - Math.round((adNum - 30) * 2.1);
        urgencyScore = 88 + Math.round((adNum - 30) * 1.2);
        sentiment = 'Aggressive Hype';
        flagged = true;
      }
      return {
        adNum,
        title: `Ad Campaign #${adNum}`,
        date: `2024-${String(5 + Math.floor(i / 8)).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
        toneScore: Math.max(12, toneScore),
        urgencyScore: Math.min(100, urgencyScore),
        sentiment,
        flagged,
        agency: adNum <= 10 ? 'Internal Brand' : 'Agency X Growth Partners',
        snippet: adNum === 30 ? 'Inkloom Delivers Insane 40% Efficiency Gains in under 3 days!' : `High velocity creative automation variant #${adNum}`
      };
    });

    // Append any newly published assets after initial 23
    const liveAssets = Object.values(this.storeState.nodes).filter(n => n.labels.includes('Asset'));
    if (liveAssets.length > 23) {
      const extraAssets = liveAssets.slice(23);
      extraAssets.forEach((ea, idx) => {
        base40Ads.push({
          adNum: 40 + idx + 1,
          title: ea.properties.title || `Live Override Ad #${40 + idx + 1}`,
          date: ea.properties.lastUpdated || new Date().toISOString().split('T')[0],
          toneScore: ea.properties.complianceScore || 45,
          urgencyScore: 85,
          sentiment: 'Aggressive Hype',
          flagged: (ea.properties.complianceScore || 45) < 70,
          agency: 'Creation Firewall Override',
          snippet: ea.properties.content ? ea.properties.content.slice(0, 60) + '...' : 'Override publication'
        });
      });
    }

    return base40Ads;
  }
}

export const neo4jService = new Neo4jGraphService();
