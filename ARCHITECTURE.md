# NexusMatrix System Architecture & Technical Specification

## 📐 System Architecture Diagram

```
React / Vite Browser UI
        │
        │ HTTP REST API (src/services/apiClient.ts)
        ▼
Express Server (server/server.ts)
        │
        ▼
Dynamic Agent Loop (src/engine/agentLoop.ts)
        │
        ├───────────────────────┼────────────────────────┐
        ▼                       ▼                        ▼
Google Gemini API       Model Context Protocol   Supabase Vector Repository
(GEMINI_API_KEY env)    (nexusMcpServer.ts)      (RLS tenant isolation)
```

---

## 🔒 Architectural Boundaries & Security

1. **Frontend / Server Separation (Gate 11)**:
   - The React/Vite browser UI contains **zero** direct imports of agent engines, Gemini SDKs (`@google/genai`), or privileged Supabase credentials.
   - All browser operations route through typed HTTP REST endpoints exposed by Express in `server/server.ts`:
     - `POST /api/agent-loop/run`: Executes dynamic agent loops with Zod action validation.
     - `POST /api/agents/execute`: Executes standalone multi-modal agent inference.
     - `POST /api/evaluation/run`: Evaluates benchmark dataset metrics.
     - `POST /api/vectors/search` & `POST /api/vectors/add`: Manages 768D vector database memory.
     - `GET /api/mcp/tools`: Discovers registered MCP tools.

2. **Credential Management**:
   - Provider API keys are managed exclusively via server-side process environment variables (`GEMINI_API_KEY`, `SUPABASE_SECRET_KEY`).
   - Browser client code never persists API keys in `localStorage`, `sessionStorage`, or React state.

3. **Row-Level Security (RLS) & Tenant Isolation (Gate 9)**:
   - Supabase database schema enforces `(SELECT auth.uid())::text = owner_id` on `nexus_vectors` table with `WITH CHECK` clauses for `authenticated` roles.
   - Anonymous access (`owner_id = 'anon'`) is eliminated.

---

## 🧮 Mathematical Formulations

### Cosine Similarity Dot-Product
$$\text{Similarity}(A, B) = \frac{A \cdot B}{\|A\| \|B\|} = \frac{\sum_{i=1}^{768} A_i B_i}{\sqrt{\sum_{i=1}^{768} A_i^2} \sqrt{\sum_{i=1}^{768} B_i^2}}$$

### Semantic Cache Distance Threshold
$$d(A, B) = 1 - \text{Similarity}(A, B) \le 0.12 \implies \text{Similarity}(A, B) \ge 0.88$$
