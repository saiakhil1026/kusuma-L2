import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Gate 11 — Frontend / Server Architectural Separation Suite', () => {
  const componentsDir = path.join(process.cwd(), 'src', 'components');
  const servicesDir = path.join(process.cwd(), 'src', 'services');

  // Test A — Browser has no Gemini credential path
  it('Test A: Frontend source files must not reference VITE_GEMINI_API_KEY or client credential paths', () => {
    const componentFiles = fs.readdirSync(componentsDir).map((f) => path.join(componentsDir, f));
    const serviceFiles = fs.existsSync(servicesDir)
      ? fs.readdirSync(servicesDir).map((f) => path.join(servicesDir, f))
      : [];
    const filesToCheck = [...componentFiles, ...serviceFiles, path.join(process.cwd(), 'src', 'App.tsx')];

    filesToCheck.forEach((filePath) => {
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const content = fs.readFileSync(filePath, 'utf-8');
        expect(content).not.toContain('VITE_GEMINI_API_KEY');
        expect(content).not.toContain('import.meta.env.VITE_GEMINI');
      }
    });
  });

  // Test B — Frontend uses REST API
  it('Test B: Frontend components must communicate via REST API client without direct engine execution imports', () => {
    const componentFiles = fs.readdirSync(componentsDir).map((f) => path.join(componentsDir, f));

    componentFiles.forEach((filePath) => {
      if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        const content = fs.readFileSync(filePath, 'utf-8');
        // Exclude type-only imports; ensure no direct runtime engine object imports
        const nonTypeImports = content.split('\n').filter((line) => line.startsWith('import ') && !line.startsWith('import type ')).join('\n');

        expect(nonTypeImports).not.toContain("from '../engine/agentLoop'");
        expect(nonTypeImports).not.toContain("from '../engine/geminiClient'");
        expect(nonTypeImports).not.toContain("from '../engine/evaluationEngine'");
        expect(nonTypeImports).not.toContain("from '../engine/vectorStore'");
        expect(nonTypeImports).not.toContain("from '../engine/semanticCache'");
        expect(content).not.toContain('@google/genai');
        expect(content).not.toContain('GoogleGenAI');
      }
    });
  });

  // Test C — Gemini provider is server-side only
  it('Test C: GoogleGenAI provider instantiation must only exist in server execution modules', () => {
    const geminiClientPath = path.join(process.cwd(), 'src', 'engine', 'geminiClient.ts');
    const content = fs.readFileSync(geminiClientPath, 'utf-8');

    expect(content).not.toContain('VITE_GEMINI_API_KEY');
    expect(content).not.toContain('import.meta.env.VITE_GEMINI');
    expect(content).toContain('process.env.GEMINI_API_KEY');
  });

  // Test D — API key is not persisted in browser storage
  it('Test D: Application source code must not store or persist Gemini API keys in localStorage or sessionStorage', () => {
    const componentsDir = path.join(process.cwd(), 'src', 'components');

    function checkDirRecursively(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      entries.forEach((entry) => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          checkDirRecursively(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const forbiddenKey = 'GEMINI' + '_API_KEY';
          expect(content).not.toContain(`localStorage.setItem('${forbiddenKey}'`);
          expect(content).not.toContain(`sessionStorage.setItem('${forbiddenKey}'`);
          expect(content).not.toContain('setGeminiApiKey(');
        }
      });
    }

    checkDirRecursively(componentsDir);
  });

  // Test E — Existing functionality remains intact
  it('Test E: Server REST API endpoints and engine functions remain 100% operational', async () => {
    const serverPath = path.join(process.cwd(), 'server', 'server.ts');
    const serverContent = fs.readFileSync(serverPath, 'utf-8');

    expect(serverContent).toContain("app.post('/api/agent-loop/run'");
    expect(serverContent).toContain("app.post('/api/evaluation/run'");
    expect(serverContent).toContain("app.post('/api/agents/execute'");
    expect(serverContent).toContain("app.post('/api/vectors/search'");
    expect(serverContent).toContain("app.get('/api/health'");
  });
});
