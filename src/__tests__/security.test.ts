import fs from 'fs';
import path from 'path';
import { describe, it, expect } from 'vitest';
import { executeZeroTrustAuditTool } from '../tools/zeroTrustAuditTool';

describe('Security & Database RLS Policy Audit Suite', () => {
  it('should detect unsafe SQL string concatenation fixtures', async () => {
    const unsafeCode = `const query = "SELECT * FROM nexus_vectors WHERE text LIKE '%" + req.query.q + "%'";`;
    const res = await executeZeroTrustAuditTool({ payloadToAudit: unsafeCode });

    expect(res.status).toBe('FAILED');
    expect(res.passed).toBe(false);
    expect(res.vulnerabilities.some((v) => v.category === 'SQL Injection')).toBe(true);
  });

  it('should detect hardcoded passwords or API key candidates in source payloads using synthetic fixtures', async () => {
    const unsafeCode = `const dbPassword = "FAKE_TEST_SECRET_DO_NOT_USE_123456"; const key = "AIzaSyDummyTestKeyForVerification12345";`;
    const res = await executeZeroTrustAuditTool({ payloadToAudit: unsafeCode });

    expect(res.status).toBe('FAILED');
    expect(res.passed).toBe(false);
    expect(res.vulnerabilities.some((v) => v.category === 'Hardcoded Secret')).toBe(true);
  });

  it('should detect insecure TLS certificate bypass settings', async () => {
    const unsafeCode = `const client = new Client({ ssl: { rejectUnauthorized: false } });`;
    const res = await executeZeroTrustAuditTool({ payloadToAudit: unsafeCode });

    expect(res.status).toBe('FAILED');
    expect(res.passed).toBe(false);
    expect(res.vulnerabilities.some((v) => v.category === 'Insecure Transport Security')).toBe(true);
  });

  it('should pass audit for clean type-safe TypeScript code', async () => {
    const safeCode = `export function computeVectorProduct(a: number[], b: number[]): number { return a.reduce((sum, val, i) => sum + val * b[i], 0); }`;
    const res = await executeZeroTrustAuditTool({ payloadToAudit: safeCode });

    expect(res.status).toBe('PASSED');
    expect(res.passed).toBe(true);
    expect(res.vulnerabilitiesCount).toBe(0);
  });

  it('verifies SQL schema RLS policies contain strict owner_id check, WITH CHECK clauses, and least privilege REVOKEs', () => {
    const schemaPath = path.join(process.cwd(), 'supabase', 'schema.sql');
    const sqlContent = fs.readFileSync(schemaPath, 'utf-8');

    // 1. RLS Enabled on all public tables
    expect(sqlContent).toContain('ALTER TABLE nexus_vectors ENABLE ROW LEVEL SECURITY;');
    expect(sqlContent).toContain('ALTER TABLE nexus_dag_graphs ENABLE ROW LEVEL SECURITY;');
    expect(sqlContent).toContain('ALTER TABLE nexus_telemetry_logs ENABLE ROW LEVEL SECURITY;');

    // 2. Strict (select auth.uid())::text = owner_id check
    expect(sqlContent).toContain('owner_id = (SELECT auth.uid())::text');

    // 3. WITH CHECK clause present on INSERT and UPDATE policies
    expect(sqlContent).toContain('WITH CHECK');

    // 4. Security Invoker function definition for match_nexus_vectors
    expect(sqlContent).toContain('SECURITY INVOKER');

    // 5. Least privilege REVOKE statements for PUBLIC / anon
    expect(sqlContent).toContain('REVOKE ALL ON TABLE nexus_vectors FROM PUBLIC, anon;');
    expect(sqlContent).toContain('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE nexus_vectors TO authenticated, service_role;');
    expect(sqlContent).toContain('REVOKE ALL ON FUNCTION match_nexus_vectors FROM PUBLIC, anon;');
  });

  it('verifies database RLS test suite SQL file exists with full coverage', () => {
    const rlsSqlPath = path.join(process.cwd(), 'supabase', '__tests__', 'rls_isolation.sql');
    expect(fs.existsSync(rlsSqlPath)).toBe(true);

    const rlsContent = fs.readFileSync(rlsSqlPath, 'utf-8');
    expect(rlsContent).toContain('SET LOCAL ROLE anon;');
    expect(rlsContent).toContain('User B CANNOT Select User A Data');
    expect(rlsContent).toContain('User B CANNOT Update User A Data');
    expect(rlsContent).toContain('User B CANNOT Delete User A Data');
    expect(rlsContent).toContain('RPC match_nexus_vectors Respects Ownership');
  });
});
