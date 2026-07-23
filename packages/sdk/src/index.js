"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SolSentryClient = void 0;
class SolSentryClient {
    baseUrl;
    apiKey;
    timeoutMs;
    constructor(opts = {}) {
        this.baseUrl = (opts.baseUrl || 'https://solsentry.io').replace(/\/$/, '');
        this.apiKey = opts.apiKey;
        this.timeoutMs = opts.timeoutMs || 5000;
    }
    async fetchJson(path, init = {}) {
        const url = `${this.baseUrl}${path}`;
        const headers = {
            'Content-Type': 'application/json',
            ...init.headers,
        };
        if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
            headers['X-SolSentry-API-Key'] = this.apiKey;
        }
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
            const res = await fetch(url, { ...init, headers, signal: controller.signal });
            if (!res.ok) {
                const errorText = await res.text().catch(() => '');
                throw new Error(`SolSentry API HTTP ${res.status}: ${errorText || res.statusText}`);
            }
            return (await res.json());
        }
        finally {
            clearTimeout(timer);
        }
    }
    async checkProtocolRisk(protocolSlug) {
        return this.fetchJson('/api/v1/risk-check', {
            method: 'POST',
            body: JSON.stringify({ protocolSlug }),
        });
    }
    async evaluatePolicy(params) {
        return this.mcpCall('solsentry_evaluate_policy', params);
    }
    async preflight(params) {
        return this.mcpCall('solsentry_preflight', params);
    }
    async simulateTransaction(params) {
        return this.fetchJson('/api/v1/simulate', {
            method: 'POST',
            body: JSON.stringify(params),
        });
    }
    async mcpCall(name, args) {
        const res = await this.fetchJson('/api/v1/mcp', {
            method: 'POST',
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: Date.now(),
                method: 'tools/call',
                params: { name, arguments: args },
            }),
        });
        if (res?.error) {
            throw new Error(`MCP Error ${res.error.code}: ${res.error.message}`);
        }
        return (res?.result?.structuredContent || res?.result?.content?.[0]?.text);
    }
}
exports.SolSentryClient = SolSentryClient;
