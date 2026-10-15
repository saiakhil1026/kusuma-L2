# NexusMatrix ⚡ Enterprise Multi-Modal MCP Agent Orchestrator

**NexusMatrix** is an enterprise-grade AI agent orchestration framework featuring genuine model-mediated control flow, Model Context Protocol (MCP) transport integration via `@modelcontextprotocol/sdk`, binary image buffer visual decoding, TypeScript Compiler API AST refactoring, task-derived evidence reflection, claim-to-observation semantic grounding, held-out benchmark dataset evaluation, tenant isolation, and Qdrant vector persistence.

---

## 🌟 Verification Status Summary

| Capability | Verification Status | Implementation Detail |
| :--- | :--- | :--- |
| **Model Provenance** | **Verified** | Langfuse trace metadata with `langfuseTraceId`; never manufactures provider request IDs when offline or rate-limited. |
| **Model-Mediated MCP Loop** | **Verified** | Dynamic loop over `@modelcontextprotocol/sdk` (`vector_search`, `store_memory`, `refactor_code`, `zero_trust_audit`, `parse_vision_tags`). |
| **Binary Image Decoding** | **Verified** | Real binary buffer parsing for PNG, JPEG, and WebP headers; computes true dimensions, Shannon byte entropy, and pixel luminance. |
| **AST Code Refactoring** | **Verified** | Real TypeScript Compiler API (`ts.createSourceFile`, AST Transformers, Printer) for `var` to `const` and `.then()` to `async/await`. |
| **Tenant-Aware Qdrant Persistence** | **Verified** | Production tools depend on `VectorRepository` (`QdrantVectorRepository` / `LocalVectorRepository`), awaiting writes and querying vector points. |
| **Auth & Tenancy** | **Verified** | Express authentication middleware derives `owner_id` server-side; enforces tenant isolation and least-privilege access. |
| **Authoritative Claim Grounding** | **Verified** | Evaluates claim-level semantic support and contradiction; rejects ungrounded or contradicted answers and updates run completion status. |
| **Reflection Safeguards** | **Verified** | Reflection steps execute inside common step executor obeying global `maxSteps` limits without converting failures to successes. |
| **Held-Out Benchmark Evaluation** | **Verified** | Multilabel classification tool selection metrics (TP, FP, FN, Precision, Recall, F1), answer property validation, and grounding requirements over held-out dataset `v2.0.0`. |
| **REST Response Contracts** | **Verified** | Shared Zod schemas in `src/contracts/apiContracts.ts` validated across Express, client, React components, and HTTP integration tests. |

---

## 🚀 Commands & Verification Pipeline

```bash
# 1. Run Vitest Unit & Integration Test Suite (63 Tests, 14 Test Files)
npm test

# 2. Run Strict TypeScript Static Typecheck
npm run typecheck

# 3. Run ESLint Code Linter
npm run lint

# 4. Build Production Bundle (tsc -b && vite build)
npm run build

# 5. Generate Curated Execution Traces & Validate Scenarios
npm run traces:generate

# 6. Run Live Langfuse Observability Model Execution Evidence Demo
npm run demo:live

# 7. Start Express Server & Frontend App
npm run server
npm run dev
```

---

## ⚙️ Security Posture & Architecture Boundaries

* **Browser / Server Separation**: The React/Vite browser UI communicates exclusively over Express REST API endpoints (`/api/agent-loop/run`, `/api/evaluation/run`, `/api/mcp/*`, `/api/vectors/*`). Credentials and provider calls remain strictly server-side.
* **Database & Credential Security**: Authentication middleware validates tokens and derives trusted `owner_id`. Database RLS policies enforce `(SELECT auth.uid())::text = owner_id` with `WITH CHECK` clauses and explicit `REVOKE ALL FROM PUBLIC, anon`.

---

## 📄 License

MIT License. Built for Enterprise Multi-Modal Agent Orchestration.
