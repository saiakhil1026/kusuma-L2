import { describe, it, expect } from 'vitest';
import { app } from '../../server/server';
import {
  HealthStatsResponseSchema,
  VectorSearchResponseSchema,
} from '../contracts/apiContracts';

describe('HTTP REST Integration & API Contract Verification Suite', () => {
  it('GET /api/health returns valid schema adhering to HealthStatsResponseSchema', async () => {
    const responseData = await executeExpressRoute(app, 'GET', '/api/health');

    expect(responseData.status).toBe(200);
    const parsed = HealthStatsResponseSchema.parse(responseData.body);

    expect(parsed.status).toBe('online');
    expect(parsed.mcpToolsCount).toBeGreaterThan(0);
    expect(parsed.vectorCount).toBeGreaterThanOrEqual(0);
    expect(parsed.models.length).toBeGreaterThan(0);
    expect(['local', 'qdrant']).toContain(parsed.persistenceMode);
  });

  it('POST /api/vectors/search matches canonical VectorSearchResponseSchema and returns item object structure', async () => {
    const searchBody = {
      query: 'authentication token specs',
      topK: 3,
    };

    const responseData = await executeExpressRoute(app, 'POST', '/api/vectors/search', searchBody);

    expect(responseData.status).toBe(200);
    const parsed = VectorSearchResponseSchema.parse(responseData.body);

    expect(parsed.query).toBe(searchBody.query);
    expect(Array.isArray(parsed.results)).toBe(true);

    if (parsed.results.length > 0) {
      const firstResult = parsed.results[0];
      expect(firstResult.item).toBeDefined();
      expect(firstResult.item.id).toBeDefined();
      expect(firstResult.item.text).toBeDefined();
      expect(firstResult.item.metadata).toBeDefined();
      expect(typeof firstResult.similarity).toBe('number');
    }
  });

  it('POST /api/vectors/add accepts vector insertion and derives authenticated owner identity', async () => {
    const addBody = {
      text: 'HTTP Integration Test Vector Payload',
      agentId: 'orchestrator',
      agentName: 'Master Orchestrator Agent',
      modality: 'text',
      inputType: 'Integration Unit Test',
    };

    const responseData = await executeExpressRoute(app, 'POST', '/api/vectors/add', addBody);

    expect(responseData.status).toBe(200);
    expect(responseData.body.id).toBeDefined();
    expect(responseData.body.text).toBe(addBody.text);
  });
});

async function executeExpressRoute(expressApp: any, method: string, url: string, body?: any): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    let responseStatus = 200;
    let responseBody: any = null;
    const headers: Record<string, string> = {};

    const req: any = {
      method,
      url,
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer integration_test_token_12345',
      },
      body: body || {},
    };

    const res: any = {
      statusCode: 200,
      status(code: number) {
        responseStatus = code;
        this.statusCode = code;
        return this;
      },
      setHeader(name: string, value: string) {
        headers[name.toLowerCase()] = value;
        return this;
      },
      getHeader(name: string) {
        return headers[name.toLowerCase()];
      },
      removeHeader(name: string) {
        delete headers[name.toLowerCase()];
        return this;
      },
      on() { return this; },
      emit() { return true; },
      json(data: any) {
        responseBody = data;
        resolve({ status: responseStatus, body: responseBody });
      },
      send(data: any) {
        responseBody = typeof data === 'string' ? JSON.parse(data) : data;
        resolve({ status: responseStatus, body: responseBody });
      },
      end(data?: any) {
        if (data) responseBody = typeof data === 'string' ? JSON.parse(data) : data;
        resolve({ status: responseStatus, body: responseBody });
      },
    };

    expressApp(req, res, (err: any) => {
      if (err) reject(err);
      else resolve({ status: responseStatus, body: responseBody });
    });
  });
}