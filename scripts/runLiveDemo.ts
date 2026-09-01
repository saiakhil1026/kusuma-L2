import dotenv from 'dotenv';
import { dynamicAgentRunner } from '../src/engine/agentLoop';

dotenv.config();

async function runLiveDemo() {
  console.log('====================================================');
  console.log('NexusMatrix — Live Gemini Model MCP Agent Execution');
  console.log('====================================================\n');

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ ERROR: Missing GEMINI_API_KEY environment variable.');
    console.error('Please set GEMINI_API_KEY in your environment or .env file before running demo:live.');
    console.error('Example: GEMINI_API_KEY="your_api_key" npm run demo:live\n');
    process.exit(1);
  }

  console.log('🔑 Environment GEMINI_API_KEY detected.');
  console.log('🚀 Executing dynamic agent loop via live Google Gemini provider...\n');

  try {
    const objective = 'Perform security zero-trust audit and retrieve vector memory for microservice authentication module.';
    const result = await dynamicAgentRunner.runDynamicLoop(objective, {
      model: 'gemini-3.7-flash',
      maxSteps: 6,
    });

    console.log('\n====================================================');
    console.log('EXECUTION PROVENANCE & SUMMARY AUDIT:');
    console.log('====================================================');
    console.log(`Execution ID:        ${result.id}`);
    console.log(`Decision Source:     ${result.decisionSource}`);
    console.log(`Provider Name:       ${result.provider}`);
    console.log(`Model Target:        ${result.modelTarget}`);
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
