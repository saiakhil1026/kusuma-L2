-- NexusMatrix Enterprise Framework - Supabase Postgres + pgvector Schema
-- Project Reference: zmgchehdwvycngptkqnd

-- 1. Enable vector extension for 768-dimensional embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Create 768D Vector Memory Table
CREATE TABLE IF NOT EXISTS nexus_vectors (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL DEFAULT 'anon',
  text TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  modality TEXT NOT NULL,
  node_title TEXT,
  tokens INT DEFAULT 0,
  embedding vector(768) NOT NULL,
  projection_2d JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Cosine Distance Index for Sub-Millisecond Search
CREATE INDEX IF NOT EXISTS nexus_vectors_embedding_cosine_idx 
ON nexus_vectors USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 4. Create DAG Task Graphs Table
CREATE TABLE IF NOT EXISTS nexus_dag_graphs (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL DEFAULT 'anon',
  objective TEXT NOT NULL,
  status TEXT NOT NULL,
  nodes JSONB NOT NULL,
  total_tokens INT DEFAULT 0,
  total_latency_ms INT DEFAULT 0,
  cache_hits INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 5. Create Inter-Agent Telemetry Logs Table
CREATE TABLE IF NOT EXISTS nexus_telemetry_logs (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL DEFAULT 'anon',
  node_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  status TEXT NOT NULL,
  confidence FLOAT NOT NULL,
  alerts JSONB NOT NULL,
  suggested_action TEXT,
  latency_ms INT NOT NULL,
  tokens_used INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. SECURITY REMEDIATION: Row Level Security (RLS) & Access Policies
-- ============================================================================

ALTER TABLE nexus_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_dag_graphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE nexus_telemetry_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS nexus_vectors_select_policy ON nexus_vectors;
DROP POLICY IF EXISTS nexus_vectors_insert_policy ON nexus_vectors;
DROP POLICY IF EXISTS nexus_vectors_update_policy ON nexus_vectors;
DROP POLICY IF EXISTS nexus_vectors_delete_policy ON nexus_vectors;

DROP POLICY IF EXISTS nexus_dag_graphs_select_policy ON nexus_dag_graphs;
DROP POLICY IF EXISTS nexus_dag_graphs_insert_policy ON nexus_dag_graphs;

DROP POLICY IF EXISTS nexus_telemetry_logs_select_policy ON nexus_telemetry_logs;
DROP POLICY IF EXISTS nexus_telemetry_logs_insert_policy ON nexus_telemetry_logs;

-- RLS Policies for nexus_vectors (Tenant / User Isolation)
CREATE POLICY nexus_vectors_select_policy ON nexus_vectors
  FOR SELECT USING (
    owner_id = current_setting('request.jwt.claims', true)::json->>'sub'
    OR owner_id = 'anon'
    OR current_setting('role', true) = 'service_role'
  );

CREATE POLICY nexus_vectors_insert_policy ON nexus_vectors
  FOR INSERT WITH CHECK (
    owner_id = COALESCE(current_setting('request.jwt.claims', true)::json->>'sub', 'anon')
    OR current_setting('role', true) = 'service_role'
  );

CREATE POLICY nexus_vectors_update_policy ON nexus_vectors
  FOR UPDATE USING (
    owner_id = current_setting('request.jwt.claims', true)::json->>'sub'
    OR current_setting('role', true) = 'service_role'
  );

CREATE POLICY nexus_vectors_delete_policy ON nexus_vectors
  FOR DELETE USING (
    owner_id = current_setting('request.jwt.claims', true)::json->>'sub'
    OR current_setting('role', true) = 'service_role'
  );

-- RLS Policies for nexus_dag_graphs
CREATE POLICY nexus_dag_graphs_select_policy ON nexus_dag_graphs
  FOR SELECT USING (
    owner_id = current_setting('request.jwt.claims', true)::json->>'sub'
    OR owner_id = 'anon'
    OR current_setting('role', true) = 'service_role'
  );

CREATE POLICY nexus_dag_graphs_insert_policy ON nexus_dag_graphs
  FOR INSERT WITH CHECK (
    owner_id = COALESCE(current_setting('request.jwt.claims', true)::json->>'sub', 'anon')
    OR current_setting('role', true) = 'service_role'
  );

-- RLS Policies for nexus_telemetry_logs
CREATE POLICY nexus_telemetry_logs_select_policy ON nexus_telemetry_logs
  FOR SELECT USING (
    owner_id = current_setting('request.jwt.claims', true)::json->>'sub'
    OR owner_id = 'anon'
    OR current_setting('role', true) = 'service_role'
  );

CREATE POLICY nexus_telemetry_logs_insert_policy ON nexus_telemetry_logs
  FOR INSERT WITH CHECK (
    owner_id = COALESCE(current_setting('request.jwt.claims', true)::json->>'sub', 'anon')
    OR current_setting('role', true) = 'service_role'
  );

-- ============================================================================
-- 7. RPC Function for Cosine Similarity Vector Search (>0.88 Threshold)
-- Validates input bounds and enforces security invoker
-- ============================================================================

CREATE OR REPLACE FUNCTION match_nexus_vectors (
  query_embedding vector(768),
  match_threshold float DEFAULT 0.88,
  match_count int DEFAULT 5,
  request_owner_id text DEFAULT NULL
)
RETURNS TABLE (
  id text,
  text text,
  agent_id text,
  agent_name text,
  modality text,
  node_title text,
  tokens int,
  similarity float,
  projection_2d jsonb
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  -- Input Validation
  IF match_threshold < 0.0 OR match_threshold > 1.0 THEN
    RAISE EXCEPTION 'match_threshold must be between 0.0 and 1.0';
  END IF;

  IF match_count < 1 OR match_count > 100 THEN
    RAISE EXCEPTION 'match_count must be between 1 and 100';
  END IF;

  RETURN QUERY
  SELECT
    v.id,
    v.text,
    v.agent_id,
    v.agent_name,
    v.modality,
    v.node_title,
    v.tokens,
    1 - (v.embedding <=> query_embedding) AS similarity,
    v.projection_2d
  FROM nexus_vectors v
  WHERE 1 - (v.embedding <=> query_embedding) >= match_threshold
    AND (
      request_owner_id IS NULL 
      OR v.owner_id = request_owner_id 
      OR v.owner_id = 'anon'
    )
  ORDER BY v.embedding <=> query_embedding ASC
  LIMIT match_count;
END;
$$;
