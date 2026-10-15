# NexusMatrix Enterprise: Complete Interactive Walkthrough & User Guide

Welcome to the **NexusMatrix Enterprise v3.7** interactive guide. This document provides a step-by-step, action-and-outcome walkthrough of every screen, button, input field, and workflow in the application.

---

## Table of Contents

1. [Application Architecture & Access](#1-application-architecture--access)
2. [Module 1: Agent Studio (Autonomous Execution Hub)](#2-module-1-agent-studio-autonomous-execution-hub)
   - [Scenario 1.1: Web Research & Evidence Grounding](#scenario-11-web-research--evidence-grounding)
   - [Scenario 1.2: Code Sandbox Execution](#scenario-12-code-sandbox-execution)
   - [Scenario 1.3: Virtual Filesystem Operations](#scenario-13-virtual-filesystem-operations)
   - [Scenario 1.4: Zero-Trust Security Vulnerability Audit](#scenario-14-zero-trust-security-vulnerability-audit)
   - [Scenario 1.5: TypeScript AST Code Refactoring](#scenario-15-typescript-ast-code-refactoring)
   - [Scenario 1.6: Vector Memory Cosine Search](#scenario-16-vector-memory-cosine-search)
   - [Scenario 1.7: Custom User Objective Execution](#scenario-17-custom-user-objective-execution)
   - [Scenario 1.8: Switching Studio Views (Stream vs DAG vs Split)](#scenario-18-switching-studio-views-stream-vs-dag-vs-split)
3. [Module 2: MCP Tools Catalog & Interactive Test Bench](#3-module-2-mcp-tools-catalog--interactive-test-bench)
   - [Scenario 2.1: Testing `web_search`](#scenario-21-testing-web_search)
   - [Scenario 2.2: Testing `code_execute`](#scenario-22-testing-code_execute)
   - [Scenario 2.3: Testing `file_system`](#scenario-23-testing-file_system)
   - [Scenario 2.4: Testing `refactor_code`](#scenario-24-testing-refactor_code)
   - [Scenario 2.5: Testing `zero_trust_audit`](#scenario-25-testing-zero_trust_audit)
   - [Scenario 2.6: Testing `vector_search`](#scenario-26-testing-vector_search)
   - [Scenario 2.7: Testing `store_memory`](#scenario-27-testing-store_memory)
   - [Scenario 2.8: Testing `parse_vision_tags`](#scenario-28-testing-parse_vision_tags)
4. [Module 3: Agent Mesh Dashboard (10 Autonomous Agents)](#4-module-3-agent-mesh-dashboard-10-autonomous-agents)
   - [Scenario 3.1: Inspecting an Agent](#scenario-31-inspecting-an-agent)
   - [Scenario 3.2: Running the Multi-Modal Sandbox](#scenario-32-running-the-multi-modal-sandbox)
5. [Module 4: Vector Memory Explorer (768D Vector DB)](#5-module-4-vector-memory-explorer-768d-vector-db)
   - [Scenario 4.1: Querying Vector Memory with Semantic Cache](#scenario-41-querying-vector-memory-with-semantic-cache)
   - [Scenario 4.2: Ingesting Custom Vector Memory](#scenario-42-ingesting-custom-vector-memory)
6. [Module 5: Evaluation & Empirical Benchmarks](#6-module-5-evaluation--empirical-benchmarks)
   - [Scenario 5.1: Running the 8-Case Benchmark Suite](#scenario-51-running-the-8-case-benchmark-suite)
7. [Module 6: Architecture Blueprint](#7-module-6-architecture-blueprint)
8. [Troubleshooting & Status Reference](#8-troubleshooting--status-reference)

---

## 1. Application Architecture & Access

NexusMatrix consists of two processes running locally on your system:
* **Frontend Web Application**: [http://localhost:5173](http://localhost:5173) (Vite React application)
* **Backend REST API Server**: [http://localhost:3002](http://localhost:3002) (Express server hosting MCP tools and agents)

### How to verify both are active
1. Open [http://localhost:5173](http://localhost:5173) in your browser.
2. In the top-right header, verify the badge:
   * **Badge Text**: `Server: Online (3002)`
   * **Indicator**: Green shield icon
   * **MCP Tools**: `8 Active`
   * **Memory Count**: `7 Vectors`

---

## 2. Module 1: Agent Studio (Autonomous Execution Hub)

The **Agent Studio** is your primary workspace. In this tab, you submit high-level engineering objectives. The system automatically plans a Directed Acyclic Graph (DAG), chooses the appropriate agents, executes registered MCP tools, inspects observations, performs an evidence reflection audit, and produces a grounded final deliverable.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          ONE-CLICK PRESETS                             │
│  [Web Research]  [Code Sandbox]  [Filesystem]  [Security]  [Refactor]  │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
                          [Run Autonomous Loop]
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
┌──────────────────────┐                           ┌─────────────────────┐
│  DAG TOPOLOGY MAP    │                           │ STEP ACTION STREAM  │
│  N1: Planner         │                           │ Step 1: Tool Call   │
│  N2: Executor        │ ──► [Inspect Node]        │ Step 2: Observation │
│  N3: Guardrail       │                           │ Step 3: Reflection  │
│  N4: Synthesizer     │                           │ Final: Deliverable  │
└──────────────────────┘                           └─────────────────────┘
```

---

### Scenario 1.1: Web Research & Evidence Grounding

* **Goal**: Research Node.js 22 LTS features and summarize key breaking changes with citations.
* **Step 1**: On the **Agent Studio** tab, locate the **One-Click Objective Presets** grid.
* **Step 2**: Click the preset card titled **`Web Research & Grounding`** (cyan globe icon).
  * **What Happens**:
    * The card gains a cyan glowing border.
    * The objective prompt box is populated with:  
      `"Research Node.js 22 LTS features and summarize key breaking changes, V8 upgrades, and performance benchmarks with verified source citations."`
    * The dynamic DAG map automatically synthesizes nodes for the **Researcher Agent** and **Synthesizer Agent**.
* **Step 3**: Click the gradient button **`Run Autonomous Execution`**.
  * **What Happens During Execution**:
    * The button switches to a spinner: `Executing Workflow...`
  * **What Appears in the Action Stream**:
    1. **Step #1 Card**:
       * Badge: `Step #1` and `Tool: web_search`
       * Reasoning: *"Model selected MCP tool 'web_search' with arguments: { query: 'Node.js 22 LTS features...' }"*
       * Captured Observation: Formatted JSON containing verified sources, URLs, and relevance scores.
    2. **Grounding & Reflection Card**:
       * Status Banner: Green `Status: PASSED & GROUNDED` (Confidence: 100%).
       * Claim-Level Grounding: Shows `Groundedness Ratio: 100%`, `Supported Claims: 1`, `Total Claims: 1`.
       * Evidence Provenance: Displays clickable citation markers `[Source S1]`, `[Source S2]`.
    3. **Consolidated Grounded Output Card**:
       * Displays the structured summary with breaking changes and verified sources.
* **Step 4**: Click the **`Copy`** button in the upper-right corner of the output card.
  * **What Happens**: Text is copied to your clipboard and the icon changes to a green checkmark `Copied`.

---

### Scenario 1.2: Code Sandbox Execution

* **Goal**: Execute JavaScript code in an isolated sandbox, calculate prime numbers, and inspect stdout.
* **Step 1**: In the preset grid, click **`Code Sandbox Execution`** (emerald code icon).
  * **What Happens**: The prompt box fills with:  
    `"Execute isolated JavaScript code to calculate prime numbers up to 100, record stdout execution output, and verify runtime latency."`
  * The DAG graph immediately updates to highlight the **Executor Agent** as the primary node.
* **Step 2**: Click **`Run Autonomous Execution`**.
  * **What Appears**:
    1. **Step #1 Card**:
       * Badge: `Step #1` and `Tool: code_execute`
       * Reasoning: Explains that the Executor agent is running sandbox verification.
       * Captured Observation: Real execution status (`status: 0`, stdout capturing computed primes, execution duration in milliseconds).
    2. **Grounding Audit**:
       * Verifies that the computed primes in the final answer match the sandbox stdout.
    3. **Consolidated Grounded Output**:
       * Shows the dynamically verified prime list (e.g. `[2, 3, 5, 7]` when calculating up to 10, or all 25 primes `[2, 3, 5, ... 97]` when calculating up to 100) and latency metrics dynamically matched to your custom input.

---

### Scenario 1.3: Virtual Filesystem Operations

* **Goal**: Inspect virtual workspace artifacts and generate an architecture manifest.
* **Step 1**: Click the preset card **`Virtual Filesystem Operations`** (amber folder icon).
* **Step 2**: Click **`Run Autonomous Execution`**.
  * **What Appears**:
    1. **Step #1 Card**:
       * Badge: `Tool: file_system`
       * Arguments: `{ action: "list", filePath: "." }`
       * Observation: Displays virtual artifacts found in the workspace (`README.md`, `config/mesh.json`).
    2. **Final Output**:
       * Generates an enterprise architecture manifest referencing confirmed workspace paths.

---

### Scenario 1.4: Zero-Trust Security Vulnerability Audit

* **Goal**: Scan authentication code for SQL injection, hardcoded secrets, and TLS bypass.
* **Step 1**: Click the preset card **`Zero-Trust Security Audit`** (rose shield icon).
* **Step 2**: Click **`Run Autonomous Execution`**.
  * **What Appears**:
    1. **Step #1 Card**:
       * Badge: `Tool: zero_trust_audit`
       * Observation: Displays static analysis results highlighting potential vulnerabilities (SQL query concatenation, hardcoded API keys, `NODE_TLS_REJECT_UNAUTHORIZED = 0`).
    2. **Grounding Audit**:
       * Evaluates zero-trust bounds and verifies that safety assertions are grounded in actual audit observations.
    3. **Final Output**:
       * Provides remediation steps (parameterized queries, environment variable secrets, TLS validation enforcement).

---

### Scenario 1.5: TypeScript AST Code Refactoring

* **Goal**: Refactor legacy JavaScript into modern TypeScript async/await.
* **Step 1**: Click the preset card **`TypeScript AST Refactor`** (blue zap icon).
* **Step 2**: Click **`Run Autonomous Execution`**.
  * **What Appears**:
    1. **Step #1 Card**:
       * Badge: `Tool: refactor_code`
       * Arguments: Code requirement + source code containing `var` and `.then()`.
       * Observation: Transformed code output using TypeScript Abstract Syntax Tree transformation (`const`, `async/await`, explicit types).
    2. **Final Output**:
       * Refactored, production-ready TypeScript code.

---

### Scenario 1.6: Vector Memory Cosine Search

* **Goal**: Query the 768D vector database for architecture specs.
* **Step 1**: Click the preset card **`Vector Memory Search`** (purple layers icon).
* **Step 2**: Click **`Run Autonomous Execution`**.
  * **What Appears**:
    1. **Step #1 Card**:
       * Badge: `Tool: vector_search`
       * Observation: Lists the top 3 vector matches from the vector database with cosine similarity scores, agent ownership, and text snippets.
    2. **Final Output**:
       * Context synthesis linking memory embeddings to the user's objective.

---

### Scenario 1.7: Custom User Objective Execution

* **Goal**: Execute any arbitrary engineering prompt.
* **Step 1**: Click inside the text area labeled *"Enter your autonomous engineering objective..."*.
* **Step 2**: Type your prompt, for example:  
  `"Search memory for security guidelines, verify code execution of an array sort, and synthesize the final result."`
* **Step 3**: Click **`Run Autonomous Execution`**.
  * **What Happens**:
    * The orchestrator parses your keywords.
    * It dynamically decomposes the prompt into sub-tasks.
    * It calls multiple MCP tools in sequence.
    * It audits the observations and presents the final answer.

---

### Scenario 1.8: Switching Studio Views (Stream vs DAG vs Split)

In the upper-right corner of the Agent Studio header, locate the view mode buttons:

* **Click `Execution Stream`** (default):
  * **Outcome**: Full-width display of the step-by-step reasoning timeline and evidence reflection audit card.
* **Click `DAG Topology`**:
  * **Outcome**:
    * Replaces the timeline with the **DAG Topological Execution Map**.
    * Displays node cards: `N1: Decompose Objective`, `N2: Research / Execute`, `N3: Validate Safety`, `N4: Synthesize Output`.
    * **Action**: Click on **Node N1**.
    * **Outcome**: The right-side **Node Details Inspector** opens, showing the node's input specification, assigned agent, status, and deliverable output.
* **Click `Split View`** (available on larger screens):
  * **Outcome**: Renders the DAG Topology Map on the left (7 columns) and the Step Action Stream on the right (5 columns) simultaneously.

---

## 3. Module 2: MCP Tools Catalog & Interactive Test Bench

Click **`MCP Tools Catalog`** in the top navigation bar to open the dedicated tool exploration and testing dashboard.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CATEGORY FILTER PILLS                           │
│   [All Tools (8)]  [Search & Memory]  [Code & Sandbox]  [Files]        │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
┌───────────────────────────────────┐       ┌────────────────────────────┐
│      TOOL CARDS GRID (8)          │       │ INTERACTIVE TEST BENCH     │
│  • web_search                     │       │ Selected: web_search       │
│  • code_execute                   │ ────► │ Input Arguments (JSON)     │
│  • file_system                    │       │ [Execute MCP Tool Button]  │
│  • vector_search                  │       │ ────────────────────────── │
│  • store_memory                   │       │ Execution Output Container │
│  • refactor_code                  │       │ (real stdout, latency, ms) │
│  • zero_trust_audit               │       │                            │
│  • parse_vision_tags              │       │                            │
└───────────────────────────────────┘       └────────────────────────────┘
```

---

### Scenario 2.1: Testing `web_search`

1. In the left grid, click the **`web_search`** card.
   * **What Happens**:
     * The card gets a cyan border with the label `Active in Bench`.
     * The right-side **Interactive Tool Test Bench** loads the preset JSON:
       ```json
       {
         "query": "Node.js 22 LTS features and performance benchmarks",
         "topK": 3
       }
       ```
2. Click the button **`Execute MCP Tool`**.
   * **What Happens**:
     * Button displays a spinner: `Executing web_search...`
     * A real HTTP POST request is sent to `/api/mcp/call`.
     * Within ~2ms, the **Execution Output** container populates:
       * Green checkmark with execution duration (`latencyMs: 1ms`).
       * Formatted JSON showing query results, URLs, snippets, and relevance scores.
3. Click the **`Copy`** button above the output container to copy the result.

---

### Scenario 2.2: Testing `code_execute`

1. Click the **`code_execute`** card (emerald icon).
   * **What Happens**: The test bench arguments editor automatically populates with JavaScript code calculating the Fibonacci sequence:
     ```json
     {
       "code": "const fib = [0, 1];\nfor (let i = 2; i < 10; i++) {\n  fib[i] = fib[i - 1] + fib[i - 2];\n}\nconsole.log('Fibonacci sequence computed:', fib);\nfib;",
       "language": "javascript",
       "timeoutMs": 1500
     }
     ```
2. Click **`Execute MCP Tool`**.
   * **What Appears in the Output Container**:
     ```json
     {
       "success": true,
       "language": "javascript",
       "stdout": "[Code executed with return status: 0]",
       "latencyMs": 1
     }
     ```
   * **Try Your Own Code**: Edit the `"code"` field in the textarea to `"const x = 5 * 10; x;"` and click **`Execute MCP Tool`** to see instant evaluation.

---

### Scenario 2.3: Testing `file_system`

1. Click the **`file_system`** card (amber icon).
   * **Auto-loaded Arguments**:
     ```json
     {
       "action": "list",
       "filePath": "."
     }
     ```
2. Click **`Execute MCP Tool`**.
   * **What Appears**:
     ```json
     {
       "action": "list",
       "filePath": ".",
       "success": true,
       "items": [
         "README.md",
         "config/mesh.json"
       ],
       "message": "Found 2 artifacts in virtual workspace",
       "latencyMs": 1
     }
     ```
3. **Try Writing a File**:
   * Change the JSON in the editor to:
     ```json
     {
       "action": "write",
       "filePath": "notes.txt",
       "content": "Hello from NexusMatrix MCP test bench!"
     }
     ```
   * Click **`Execute MCP Tool`**.
   * **Outcome**: Returns `"success": true` confirming the artifact was created in the virtual workspace.

---

### Scenario 2.4: Testing `refactor_code`

1. Click the **`refactor_code`** card (blue icon).
   * **Auto-loaded Arguments**: Source code with `var apiKey = "sample_key"` and Promise `.then()`.
2. Click **`Execute MCP Tool`**.
   * **What Appears**: The TypeScript AST engine transforms the code, converting `var` to `const` and `.then()` chains to `async/await` syntax.

---

### Scenario 2.5: Testing `zero_trust_audit`

1. Click the **`zero_trust_audit`** card (rose icon).
   * **Auto-loaded Arguments**: Vulnerable code sample containing raw SQL string concatenation and `NODE_TLS_REJECT_UNAUTHORIZED = "0"`.
2. Click **`Execute MCP Tool`**.
   * **What Appears**: The security scanner returns a breakdown of detected vulnerabilities, flagging high-risk patterns.

---

### Scenario 2.6: Testing `vector_search`

1. Click the **`vector_search`** card (indigo icon).
2. Click **`Execute MCP Tool`**.
   * **What Appears**: Returns cosine similarity matches against the 768D vector database, including distance scores and agent IDs.

---

### Scenario 2.7: Testing `store_memory`

1. Click the **`store_memory`** card (purple icon).
2. Click **`Execute MCP Tool`**.
   * **What Appears**: Indexes a new technical text into the vector database and returns the generated 768D vector ID and timestamp.

---

### Scenario 2.8: Testing `parse_vision_tags`

1. Click the **`parse_vision_tags`** card (violet eye icon).
2. Click **`Execute MCP Tool`**.
   * **What Appears**: Extracts spatial bounding box tags in `[ymin, xmin, ymax, xmax]` format for layout elements.

---

## 4. Module 3: Agent Mesh Dashboard (10 Autonomous Agents)

Click **`Agent Mesh`** in the top navigation bar.

### Scenario 3.1: Inspecting an Agent

* **What You See**: A grid of **10 Autonomous Agents**:
  1. **Master Orchestrator Agent**: DAG decomposition & planning
  2. **Text Summarizer Agent**: Document compression & synthesis
  3. **Vision & Image Captioner Agent**: Spatial diagram analysis
  4. **Code Assistant Agent**: TypeScript/Python AST refactoring
  5. **Deep Logic Reasoning Agent**: Algorithmic proofs & constraints
  6. **Guardrail & Data Validator Agent**: Zero-trust compliance & schema checks
  7. **Multi-Agent Deliverable Synthesizer**: Deliverable consolidation
  8. **Autonomous Researcher Agent**: Web search & empirical grounding
  9. **Isolated Code Execution Agent**: Sandbox execution & assertion runner
  10. **Log Analysis & Root Cause Triage Agent**: Error trace triage & bug diagnosis
* **Action**: Click on the **`Autonomous Researcher Agent`** card.
  * **Outcome**:
    * The card gains a cyan highlight ring.
    * The **Interactive Multi-Modal Sandbox** at the bottom automatically switches context to the Researcher agent.

---

### Scenario 3.2: Running the Multi-Modal Sandbox

1. In the sandbox prompt area, type:  
   `"Explain the difference between Zero Trust architecture and perimeter defense."`
2. Click **`Run Agent Sandbox`**.
   * **What Happens**:
     * The agent executes inference via the server API.
     * The **Agent Output Deliverable** panel displays the generated response.
     * A new entry is appended to the **Agent Telemetry & Decision Feedback Ledger** on the right, recording execution latency (ms), tokens used, and confidence score.

---

## 5. Module 4: Vector Memory Explorer (768D Vector DB)

Click **`Vector Memory`** in the top navigation bar.

### Scenario 5.1: Querying Vector Memory with Semantic Cache

1. In the search box at the top, type:  
   `"microservice architecture and DAG orchestration"`
2. Click **`Search Vectors`** (or press Enter).
   * **What Appears**:
     * **Semantic Cache Indicator**: Shows whether this query or a semantically similar query was found in cache (Cosine Similarity threshold > 0.88).
     * **Top Matches**: Ranked vector cards showing:
       * Similarity score (e.g. `94.2%`)
       * Originating Agent badge
       * Text snippet
       * Modality (`text`, `code`, or `vision`)
     * **2D Projection Map**: Visual scatter plot highlighting the nearest vector cluster.

---

### Scenario 5.2: Ingesting Custom Vector Memory

1. Scroll down to the **Inject Custom Memory Vector** form.
2. In the text area, enter:  
   `"NexusMatrix v3.7 implements dynamic MCP tool discovery with in-memory fallback."`
3. Click **`Inject Vector Memory`**.
   * **What Happens**:
     * Generates a 768-dimensional embedding.
     * Adds the vector to storage.
     * The vector count in the top header increments by 1.
     * The new vector appears in subsequent similarity searches.

---

## 6. Module 5: Evaluation & Empirical Benchmarks

Click **`Evaluation Metrics`** in the top navigation bar.

### Scenario 5.1: Running the 8-Case Benchmark Suite

1. Review the benchmark description. The test suite evaluates 8 versioned test cases spanning:
   * Tool Selection Multilabel Precision / Recall / F1
   * Required Evidence Presence
   * Factual Grounding Verification
   * Self-Reflection Recovery
2. Click the gradient button **`Run Full Framework Benchmark`**.
   * **What Appears After Completion**:
     * **Metric Cards**:
       * **Overall Pass Rate %**: Percentage of test cases meeting all criteria.
       * **Multilabel F1 Score**: Measures tool selection accuracy.
       * **Grounding Score %**: Measures adherence to observed facts.
       * **Average Latency**: Execution speed per test case.
     * **Detailed Test Case Table**: A breakdown of all 8 cases showing which tools were selected, whether required evidence was gathered, and pass/fail indicators.

---

## 7. Module 6: Architecture Blueprint

Click **`Architecture Blueprint`** in the top navigation bar.

* **What You See**:
  * **Formal Mathematical Specifications**:
    * Cosine Similarity formula: $\text{Sim}(u, v) = \frac{u \cdot v}{\|u\| \|v\|}$
    * Semantic Cache decision boundary: $\text{Sim} \ge 0.88$ (Cosine Distance $\le 0.12$)
    * Topological Sorting invariant for DAG execution
  * **Zero-Trust Security Invariants**: Rules governing API boundaries, credential storage (server-side only), and input sanitization.
  * **Multi-Modal Flow Diagram**: Visual flow of user prompts through orchestrator decomposition, tool execution, and reflection verification.

---

## 8. Troubleshooting & Status Reference

| Symptom | Cause | Solution |
|---|---|---|
| Header shows `Server: Disconnected` | Backend Express server on port 3002 is stopped | Run `npm run server` in your terminal |
| Port collision error on startup | Another service is using port 3001 or 3002 | Check `.env` and verify `PORT=3002` is configured |
| Tool execution returns error in test bench | Malformed JSON in the test bench argument editor | Click the **Reset** button to restore valid sample JSON |
| Tests fail in terminal | Outdated test dependencies | Run `npm test` to verify all 14 test suites pass |

---

*NexusMatrix Enterprise Framework — Built with TypeScript, React, Express, and the Model Context Protocol.*
