-- ============================================================================
-- NexusMatrix Database RLS Isolation Test Suite (pgTAP / SQL Test Suite)
-- Tests RLS isolation policies on nexus_vectors table across roles and users
-- ============================================================================

BEGIN;

-- 1. Setup Test Users
-- User A (auth.uid() = 'user_a_11111')
-- User B (auth.uid() = 'user_b_22222')

-- Test Case 1: Anonymous Role Cannot Select Rows
SET LOCAL ROLE anon;
SET LOCAL "request.jwt.claim.sub" = '';
SELECT count(*) FROM nexus_vectors; 
-- Expected: 0 rows returned (or permission denied)

-- Test Case 2: User A Inserts Data under User A identity
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = 'user_a_11111';

INSERT INTO nexus_vectors (id, owner_id, text, agent_id, agent_name, modality, embedding)
VALUES ('vec_a_1', 'user_a_11111', 'User A vector memory spec', 'orchestrator', 'Master Agent', 'text', array_fill(0.1::float, ARRAY[768])::vector);

-- Test Case 3: User A CAN Select Own Data
SELECT id FROM nexus_vectors WHERE id = 'vec_a_1';
-- Expected: 1 row returned ('vec_a_1')

-- Test Case 4: User A CANNOT Forge Insert Ownership to User B
-- Attempting to insert a row with owner_id = 'user_b_22222' while authenticated as user_a_11111
-- INSERT INTO nexus_vectors (id, owner_id, text, agent_id, agent_name, modality, embedding)
-- VALUES ('vec_forged', 'user_b_22222', 'Forged vector payload', 'orchestrator', 'Master Agent', 'text', array_fill(0.1::float, ARRAY[768])::vector);
-- Expected: RLS Check Violation Exception (WITH CHECK clause fails)

-- Test Case 5: User B CANNOT Select User A Data
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" = 'user_b_22222';

SELECT id FROM nexus_vectors WHERE id = 'vec_a_1';
-- Expected: 0 rows returned (Tenant Isolation)

-- Test Case 6: User B CANNOT Update User A Data
UPDATE nexus_vectors SET text = 'Hacked text' WHERE id = 'vec_a_1';
-- Expected: 0 rows updated

-- Test Case 7: User B CANNOT Delete User A Data
DELETE FROM nexus_vectors WHERE id = 'vec_a_1';
-- Expected: 0 rows deleted

-- Test Case 8: User B CANNOT Transfer Ownership of User A Data
UPDATE nexus_vectors SET owner_id = 'user_b_22222' WHERE id = 'vec_a_1';
-- Expected: 0 rows updated

-- Test Case 9: RPC match_nexus_vectors Respects Ownership
SELECT * FROM match_nexus_vectors(
  query_embedding := array_fill(0.1::float, ARRAY[768])::vector,
  match_threshold := 0.70,
  match_count := 5,
  request_owner_id := 'user_b_22222'
);
-- Expected: 0 rows returned because User B does not own 'vec_a_1'

ROLLBACK;
