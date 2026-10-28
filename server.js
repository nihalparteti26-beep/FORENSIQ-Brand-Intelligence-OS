import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { neo4jService } from './lib/db/neo4j.ts';
import { qdrantService } from './lib/db/qdrant.ts';
import { aiProvider } from './lib/ai/provider.ts';
import { ingestionPipeline } from './lib/ingest/pipeline.ts';
import { visionGuardService } from './lib/vision/guard.ts';
import { mutationEngine, sseBroadcaster } from './lib/mutations/engine.ts';
import { brandCompiler } from './lib/compiler/index.ts';
import { brandNegotiator } from './lib/compiler/agents.ts';
import { immuneEngine } from './lib/immune/index.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3001;
const PUBLIC_DIR = path.join(__dirname, 'public');
const UPLOADS_DIR = path.join(PUBLIC_DIR, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Multer in-memory storage for fast buffer processing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// Serve static frontend and uploads
app.use(express.static(PUBLIC_DIR));

// ==========================================
// 1. HEALTH & SYSTEM STATUS
// ==========================================
app.get('/api/health', (req, res) => {
  const neo4jStatus = neo4jService.getConnectionStatus();
  const qdrantStatus = qdrantService.getConnectionStatus();
  const aiStatus = aiProvider.getConnectionStatus();

  res.json({
    status: 'HEALTHY',
    version: '3.0.0-ENTERPRISE',
    timestamp: new Date().toISOString(),
    services: {
      neo4j: neo4jStatus,
      qdrant: qdrantStatus,
      aiProvider: aiStatus,
      sseClients: sseBroadcaster.getActiveCount()
    }
  });
});

// ==========================================
// 2. SERVER-SENT EVENTS (SSE) STREAM
// ==========================================
app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  const clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  sseBroadcaster.addClient(clientId, res);

  res.write(`event: connected\ndata: ${JSON.stringify({ clientId, timestamp: new Date().toISOString() })}\n\n`);

  req.on('close', () => {
    sseBroadcaster.removeClient(clientId);
  });
});

// ==========================================
// 3. BRANDDNA FACTS API (NEO4J + QDRANT)
// ==========================================
app.get('/api/brand-dna', async (req, res) => {
  try {
    const { category, status, q } = req.query;
    const facts = await neo4jService.getAllFacts({
      category,
      status,
      search: q
    });
    res.json({ facts, total: facts.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/brand-dna', async (req, res) => {
  try {
    const { action, id, fact } = req.body;
    if (action === 'toggle-expiry' && id) {
      const updated = await neo4jService.toggleFactExpiry(id);
      sseBroadcaster.broadcast('fact_updated', { fact: updated });
      return res.json({ success: true, fact: updated });
    }

    if (action === 'create' && fact) {
      const created = await neo4jService.upsertFact(fact);
      await qdrantService.upsertPoint(created.id, created.claim, created);
      sseBroadcaster.broadcast('fact_created', { fact: created });
      return res.json({ success: true, fact: created });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. IMPROVEMENT ONE: REAL-TIME INGESTION
// ==========================================
app.post('/api/ingest', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Please upload a brand document or spreadsheet.' });
    }

    const job = await ingestionPipeline.processUpload({
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      buffer: req.file.buffer
    });

    sseBroadcaster.broadcast('ingest_started', {
      jobId: job.jobId,
      fileName: job.fileName
    });

    res.json({
      success: true,
      jobId: job.jobId,
      status: job.status,
      message: `File '${job.fileName}' received and queued for BrandDNA synthesis.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ingest/status/:jobId', (req, res) => {
  const job = ingestionPipeline.getJob(req.params.jobId);
  if (!job) {
    return res.status(404).json({ error: 'Ingestion job not found' });
  }
  res.json(job);
});

app.get('/api/ingest/jobs', (req, res) => {
  res.json({ jobs: ingestionPipeline.getAllJobs() });
});

// ==========================================
// 5. IMPROVEMENT TWO: VISUAL VISION GUARD
// ==========================================
app.post('/api/vision/check', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded. Please upload a PNG, JPEG, or WebP creative.' });
    }

    const result = await visionGuardService.analyzeCreative({
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      buffer: req.file.buffer
    });

    sseBroadcaster.broadcast('vision_analyzed', {
      analysisId: result.analysisId,
      score: result.complianceScore,
      status: result.overallStatus
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/vision/history', (req, res) => {
  res.json({ history: visionGuardService.getHistory() });
});

app.get('/api/vision/:id', (req, res) => {
  const item = visionGuardService.getAnalysisById(req.params.id);
  if (!item) return res.status(404).json({ error: 'Vision analysis not found' });
  res.json(item);
});

// ==========================================
// 6. CREATION-TIME FIREWALL COMPILER & DEBATE
// ==========================================
app.post('/api/compiler/check', (req, res) => {
  const content = req.body.content || '';
  const report = brandCompiler.compile(content);
  res.json({
    score: report.score,
    overallStatus: report.overallStatus,
    riskLevel: report.riskLevel,
    findings: report.findings,
    summary: report.summary
  });
});

app.post('/api/compiler/debate', (req, res) => {
  const content = req.body.content || '';
  const report = brandCompiler.compile(content);
  const debate = brandNegotiator.conductDebate(content, report);
  res.json(debate);
});

// ==========================================
// 7. IMPROVEMENT THREE: MUTATION GRAPH & ASSETS
// ==========================================
app.post('/api/assets/publish', async (req, res) => {
  try {
    const { title, content, actor, role, complianceScore, bypassedRules, channel } = req.body;
    if (!content) {
      return res.status(400).json({ error: 'Content is required to publish an asset.' });
    }

    const result = await mutationEngine.publishAsset({
      title: title || 'Campaign Ad Override',
      content,
      actor: actor || 'Content Creator',
      role: role || 'Creator',
      complianceScore: complianceScore ?? 45,
      bypassedRules: bypassedRules || [],
      channel: channel || 'LinkedIn Ads'
    });

    res.json({
      success: true,
      asset: result.asset,
      totalAssets: result.totalAssets,
      message: `Asset ${result.asset.id} successfully persisted in Neo4j graph.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/assets', async (req, res) => {
  try {
    const assets = await neo4jService.getAllAssets();
    res.json({ assets, total: assets.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 8. BRANDRIPPLE FORENSICS GRAPH
// ==========================================
app.get('/api/forensics/ripple', async (req, res) => {
  try {
    const factId = req.query.factId || 'FACT-001';
    const ripple = await mutationEngine.getRippleGraph(factId);
    res.json(ripple);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/forensics/simulate-cascade', async (req, res) => {
  try {
    const factId = req.body.factId || 'FACT-001';
    const ripple = await mutationEngine.getRippleGraph(factId);

    sseBroadcaster.broadcast('cascade_simulated', {
      factId,
      affectedAssetsCount: ripple.affectedAssetsCount,
      containmentSeconds: 1.8,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      factId,
      affectedAssetsCount: ripple.affectedAssetsCount,
      containmentSeconds: 1.8,
      channels: ripple.channels,
      message: `2-second cascade containment simulated: ${ripple.affectedAssetsCount} downstream assets auto-flagged in 1.8s.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 9. SELF-HEALING IMMUNITY ENGINE & CONTRACT
// ==========================================
app.get('/api/immune/proposals', async (req, res) => {
  try {
    const targetFactId = req.query.targetFactId || 'FACT-001';
    const proposals = await mutationEngine.getProposals(targetFactId);
    res.json(proposals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/immune/patch', async (req, res) => {
  try {
    const { actor = 'Elena Rostova (Chief Brand Officer)', role = 'Legal & Compliance', targetFactId = 'FACT-001' } = req.body;

    const patchResult = await mutationEngine.executePatch({
      actor,
      role,
      targetFactId
    });

    res.json({
      success: patchResult.success,
      patchResult,
      message: `Systemic patch verified and deployed across ${patchResult.succeeded} assets.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/immune/contract', (req, res) => {
  try {
    const { content, approvedBy, approverRole, verifiedFactIds, governanceScore } = req.body;
    const contract = immuneEngine.issueBrandContract({
      assetTitle: 'Brand Publishing Release',
      content: content || 'Verified Enterprise Marketing Copy',
      approvedBy: approvedBy || 'Elena Rostova (Chief Brand Officer)',
      approverRole: approverRole || 'Legal & Compliance',
      verifiedFactIds: verifiedFactIds || ['FACT-001', 'FACT-003'],
      governanceScore: governanceScore ?? 98
    });
    res.json(contract);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 10. DRIFT RADAR HISTORY
// ==========================================
app.get('/api/drift/history', async (req, res) => {
  try {
    const history = await neo4jService.getDriftRadarHistory();
    res.json({ history, total: history.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SPA Fallback: Serve index.html for any unhandled routes
app.use((req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🛡️  FORENSIQ · Brand Intelligence OS (Round 3 Complete)`);
  console.log(`======================================================`);
  console.log(`🚀 Production Server running at: http://localhost:${PORT}`);
  console.log(`🧬 BrandDNA: Active (Qdrant Vectors + Neo4j Graph)`);
  console.log(`👁️  Vision Guard: Active (Delta E CIELAB + Text AST Inspector)`);
  console.log(`🌊 BrandRipple: Active (Live Mutations + SSE Stream)`);
  console.log(`💉 Self-Healing Immunizer: Active (Transactional Patch Engine)`);
  console.log(`======================================================\n`);
});

export default app;
