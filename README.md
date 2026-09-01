# NexusMatrix ⚡ Enterprise Multi-Modal MCP Agent Orchestrator

**NexusMatrix** is an enterprise-grade AI agent orchestration framework featuring 100% genuine model-mediated control flow, real Model Context Protocol (MCP) transport integration via `@modelcontextprotocol/sdk`, task-derived evidence reflection, claim-to-observation grounding, versioned dataset evaluation, strict RLS tenant isolation, and async Supabase vector persistence.

---

## 🌟 Architecture & Core Capabilities

* **Model-Mediated MCP Decision Loop**: Executes dynamic decision loops where Google Gemini models (`gemini-3.7-flash`, `gemini-3.1-pro-preview`) inspect observation ledgers and determine next tool calls over MCP transports (`InMemoryTransport`).
* **Real MCP SDK Integration**: Built strictly on `@modelcontextprotocol/sdk/client` and `@modelcontextprotocol/sdk/server`, exposing typed schemas for `vector_search`, `store_memory`, `refactor_code`, `zero_trust_audit`, and `parse_vision_tags`.
* **Task-Derived Evidence Reflection**: Evaluates output deliverable quality dynamically based on task type (`vision`, `audit`, `vector_search`, `refactor`), requesting missing tool evidence and issuing automated recovery passes.
* **Claim-to-Observation Grounding Engine**: Verifies claim citations (`[Observation O1]`) against observation ledgers, ensuring cited observations exist in the run and contain matching evidence.
* **Strict Security & RLS Tenant Isolation**: Environment-managed credentials (`GEMINI_API_KEY`, `SUPABASE_SECRET_KEY`), zero browser secrets, and strict Supabase Postgres RLS policies (`(SELECT auth.uid())::text = owner_id`) with `WITH CHECK` enforcement.
* **Non-Circular Versioned Evaluation Benchmark**: Evaluates framework performance against `evaluation/dataset/v1.json`, reporting separate empirical metrics for **LIVE GEMINI** vs **OFFLINE DRIVER** execution without fabricated headline constants.

---

## 🚀 Commands & Verification Pipeline

```bash
# 1. Run Vitest Unit & Integration Test Suite (44 Tests, 9 Suites)
npm run test

# 2. Run Strict TypeScript Static Typecheck
npm run typecheck

# 3. Build Production Bundle (tsc -b && vite build)
npm run build

# 4. Run Cross-Platform Code Lint
npm run lint

# 5. Run Live Gemini Model Execution Evidence Demo
GEMINI_API_KEY="your_key" npm run demo:live

# 6. Generate Curated Execution Traces
npm run traces:generate

# 7. Start Express Server & Frontend App
npm run server
npm run dev
```

---

## ⚙️ Security Posture & Architecture Boundaries

* **Browser / Server Separation**: The browser UI communicates exclusively over HTTP REST API endpoints exposed by `server/server.ts` (`/api/agent-loop/run`, `/api/evaluation/run`, `/api/mcp/*`, `/api/vectors/*`). No API keys or privileged database operations exist in client-side code.
* **Database & Credential Security**: Credentials are set strictly via process environment variables (`.env`). Anonymous bypass (`owner_id = 'anon'`) is eliminated.

---

## 📄 License

MIT License. Built for Enterprise Multi-Modal Agent Orchestration.
