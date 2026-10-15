import dotenv from 'dotenv';
import { dynamicAgentRunner } from '../src/engine/agentLoop';

dotenv.config();

async function runLiveDemo() {
  console.log('====================================================');
  console.log('NexusMatrix — Langfuse-Traced MCP Agent Execution');
  console.log('====================================================\n');

  const langfuseKey = process.env.LANGFUSE_SECRET_KEY;
  if (!langfuseKey) {
    console.error('❌ ERROR: Missing LANGFUSE_SECRET_KEY environment variable.');
    console.error('Please set LANGFUSE_SECRET_KEY in your environment or .env file before running demo:live.');
    console.error('Example: LANGFUSE_SECRET_KEY="your_key" npm run demo:live\n');
    process.exit(1);
  }

  console.log('🔑 Environment LANGFUSE_SECRET_KEY detected.');
  console.log('🚀 Executing dynamic agent loop via Langfuse observability...\n');

  try {
    const objective = 'Perform security zero-trust audit and retrieve vector memory for microservice authentication module.';
    const result = await dynamicAgentRunner.runDynamicLoop(objective, {
      maxSteps: 6,
      forceOffline: false,
    });

    console.log('\n====================================================');
    console.log('EXECUTION PROVENANCE & SUMMARY AUDIT:');
    console.log('====================================================');
    console.log(`Execution ID:        ${result.id}`);
    console.log(`Langfuse Trace ID:   ${result.langfuseTraceId || 'N/A'}`);
    console.log(`Is Live API:         ${result.isLive}`);
    console.log(`Final Status:        ${result.status}`);
    console.log(`Total Latency:       ${result.totalLatencyMs} ms`);
    console.log(`Total Tokens:        ${result.totalTokens}`);
    console.log(`Reflection Status:   ${result.reflectionVerdict.status}`);
    console.log(`Groundedness Pct:    ${result.groundingResult.groundednessPct}%`);
    console.log(`Saved Trace Path:    ${result.tracePath || 'N/A'}`);

    console.log('\n--- Final Grounded Answer ---');
    console.log(result.finalAnswer);
    console.log('====================================================\n');
  } catch (err: any) {
    console.error('\n❌ Live Execution Error:', err.message);
    process.exit(1);
  }
}

runLiveDemo();