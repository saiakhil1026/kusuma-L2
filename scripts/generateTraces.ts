import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { dynamicAgentRunner } from '../src/engine/agentLoop';

dotenv.config();

async function generateCuratedTraces() {
  console.log('====================================================');
  console.log('NexusMatrix — Generating Curated Execution Traces');
  console.log('====================================================\n');

  const tracesDir = path.join(process.cwd(), 'traces');
  const curatedDir = path.join(tracesDir, 'curated');

  if (!fs.existsSync(curatedDir)) {
    fs.mkdirSync(curatedDir, { recursive: true });
  }

  // Objectives for curated scenario trace generation
  const scenarios = [
    {
      filename: 'offline-success.json',
      objective: 'Retrieve 768D vector similarity context memory for authentication module.',
      model: 'gemini-3.7-flash',
    },
    {
      filename: 'tool-error-recovery.json',
      objective: 'Perform zero_trust_audit on unsafe payload: const q = "SELECT * FROM users WHERE id = " + req.query.id;',
      model: 'gemini-3.7-flash',
    },
    {
      filename: 'reflection-recovery.json',
      objective: 'Analyze vision spatial diagram and extract UI topology element tags.',
      model: 'gemini-3.7-flash',
    },
    {
      filename: 'grounded-answer.json',
      objective: 'Refactor code: fetch("/api/data").then(res => res.json()).then(data => console.log(data));',
      model: 'gemini-3.1-pro-preview',
    },
  ];

  for (const sc of scenarios) {
    console.log(`Generating trace [${sc.filename}]...`);
    const res = await dynamicAgentRunner.runDynamicLoop(sc.objective, {
      model: sc.model as any,
    });

    const curatedRecord = {
      executionId: res.id,
      timestamp: res.timestamp,
      executionMode: res.isLive ? 'model_mediated_mcp' : 'test',
      decisionSource: res.decisionSource,
      provider: res.provider,
      modelTarget: res.modelTarget,
      providerRequestId: res.providerRequestId,
      isLive: res.isLive,
      userObjective: res.objective,
      status: res.status,
      steps: res.steps,
      observations: res.observations,
      reflectionVerdict: res.reflectionVerdict,
      groundingResult: res.groundingResult,
      finalAnswer: res.finalAnswer,
      evidenceCitations: res.evidenceCitations,
      metrics: {
        totalLatencyMs: res.totalLatencyMs,
        totalTokens: res.totalTokens,
        observationCount: res.observations.length,
        errorCount: res.observations.filter((o) => o.isError).length,
      },
    };

    const targetPath = path.join(curatedDir, sc.filename);
    fs.writeFileSync(targetPath, JSON.stringify(curatedRecord, null, 2), 'utf-8');
    console.log(`  ✓ Saved curated trace: ${targetPath}`);
  }

  console.log('\n✅ Curated execution trace generation complete.\n');
}

generateCuratedTraces();
