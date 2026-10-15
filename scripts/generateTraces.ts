import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { dynamicAgentRunner } from '../src/engine/agentLoop';
import { validateTraceScenario, validateTraceSchema } from '../src/engine/traceValidator';

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

  // 6 Curated Trace Scenarios demonstrating distinct acceptance-critical behaviors (Issue 1 & 12)
  const scenarios = [
    {
      filename: 'offline-success.json',
      objective: 'Retrieve 768D vector similarity context memory for authentication module.',
      forceOffline: true,
      maxSteps: 6,
    },
    {
      filename: 'tool-error-recovery.json',
      objective: 'Perform zero_trust_audit on unsafe payload (trigger_error_recovery): const q = "SELECT * FROM users WHERE id = " + req.query.id;',
      forceOffline: true,
      maxSteps: 6,
    },
    {
      filename: 'reflection-recovery.json',
      objective: 'Analyze vision spatial diagram and extract UI topology element tags.',
      forceOffline: true,
      maxSteps: 6,
    },
    {
      filename: 'grounded-answer.json',
      objective: 'Refactor code: fetch("/api/data").then(res => res.json()).then(data => console.log(data));',
      forceOffline: true,
      maxSteps: 6,
    },
    {
      filename: 'live-langfuse-provenance.json',
      objective: 'Search vector memory for zero-trust microservice auth architecture specs.',
      forceOffline: false, // Attempts live Langfuse API call when API key is available
      maxSteps: 6,
    },
    {
      filename: 'bounded-failure-execution.json',
      objective: 'Execute complex multi-step analysis exceeding step budget limits.',
      forceOffline: true,
      maxSteps: 1, // Forces step budget boundary failure
    },
  ];

  for (const sc of scenarios) {
    console.log(`Generating trace [${sc.filename}]...`);
    const res = await dynamicAgentRunner.runDynamicLoop(sc.objective, {
      forceOffline: sc.forceOffline,
      maxSteps: sc.maxSteps,
    });

    const curatedRecord = {
      executionId: res.id,
      langfuseTraceId: res.langfuseTraceId,
      timestamp: res.timestamp,
      executionMode: res.isLive ? 'langfuse_traced' : 'offline',
      status: res.status,
      userObjective: res.objective,
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

    // Validate Trace Schema & Scenario Event Criteria (Issue 12 & 13)
    try {
      validateTraceSchema(curatedRecord);
      const validation = validateTraceScenario(curatedRecord as any, sc.filename);
      if (!validation.valid) {
        console.warn(`  ⚠️ Warning: Trace [${sc.filename}] scenario validation note: ${validation.reason}`);
      }
    } catch (err: any) {
      console.error(`  ❌ Schema validation failed for ${sc.filename}: ${err.message}`);
    }

    const targetPath = path.join(curatedDir, sc.filename);
    fs.writeFileSync(targetPath, JSON.stringify(curatedRecord, null, 2), 'utf-8');
    console.log(`  ✓ Saved curated trace: ${targetPath}`);
  }

  console.log('\n✅ Curated execution trace generation complete (6/6 traces written).\n');
}

generateCuratedTraces();