import { describe, it, expect, vi, beforeEach } from 'vitest';

// We test the BlockchainAPI class directly
// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import after mocking
const { BlockchainAPI } = await import('./blockchain.jsx');

describe('BlockchainAPI', () => {
  let api;

  beforeEach(() => {
    api = new BlockchainAPI('https://test-node.example.com');
    mockFetch.mockReset();
  });

  it('should use default base URL when none provided', () => {
    const defaultApi = new BlockchainAPI();
    expect(defaultApi.baseURL).toBe('https://mainnet-node.decentralchain.io');
  });

  it('should use custom base URL when provided', () => {
    expect(api.baseURL).toBe('https://test-node.example.com');
  });

  it('should update base URL with setBaseURL', () => {
    api.setBaseURL('https://new-node.example.com');
    expect(api.baseURL).toBe('https://new-node.example.com');
  });

  it('should fall back to default URL when setBaseURL called with falsy value', () => {
    api.setBaseURL(null);
    expect(api.baseURL).toBe('https://mainnet-node.decentralchain.io');
  });

  describe('request', () => {
    it('should make a GET request to the correct URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ height: 12345 }),
      });

      const result = await api.request('/blocks/height');
      expect(result).toEqual({ height: 12345 });
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-node.example.com/blocks/height',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should throw on non-ok response after retries exhausted', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      await expect(api.request('/bad-endpoint')).rejects.toThrow('HTTP 400: Bad Request');
    });

    it('should retry on 429 with exponential backoff', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 429, statusText: 'Too Many Requests' })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: 'ok' }) });

      const result = await api.request('/blocks/height');
      expect(result).toEqual({ data: 'ok' });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on 5xx errors', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Internal Server Error' })
        .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ data: 'recovered' }) });

      const result = await api.request('/blocks/height');
      expect(result).toEqual({ data: 'recovered' });
    });

    it('should throw timeout error on abort', async () => {
      mockFetch.mockImplementationOnce(() => {
        const error = new Error('Aborted');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      await expect(api.request('/blocks/height')).rejects.toThrow('Request timeout');
    });
  });

  describe('API methods', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    it('getHeight calls correct endpoint', async () => {
      await api.getHeight();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/blocks/height'),
        expect.any(Object)
      );
    });

    it('getLastBlock calls correct endpoint', async () => {
      await api.getLastBlock();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/blocks/last'),
        expect.any(Object)
      );
    });

    it('getBlockByHeight calls correct endpoint', async () => {
      await api.getBlockByHeight(100);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/blocks/at/100'),
        expect.any(Object)
      );
    });

    it('getTransaction calls correct endpoint', async () => {
      await api.getTransaction('abc123');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/transactions/info/abc123'),
        expect.any(Object)
      );
    });

    it('getAddressBalances calls correct endpoint', async () => {
      await api.getAddressBalances('3P...');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/assets/balance/3P...'),
        expect.any(Object)
      );
    });

    it('getConnectedPeers calls correct endpoint', async () => {
      await api.getConnectedPeers();
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/peers/connected'),
        expect.any(Object)
      );
    });
  });

  describe('getAssetDistribution', () => {
    it('should normalize distribution response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          hasNext: true,
          last: 'addr1',
          items: { addr1: 100, addr2: 200 },
        }),
      });

      const result = await api.getAssetDistribution('assetId', 1000);
      expect(result).toEqual({
        hasNext: true,
        lastAddress: 'addr1',
        items: { addr1: 100, addr2: 200 },
      });
    });

    it('should handle alternate response format with values and lastAddress', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          hasNext: false,
          lastAddress: 'addr2',
          values: { addr1: 100 },
        }),
      });

      const result = await api.getAssetDistribution('assetId', 1000);
      expect(result).toEqual({
        hasNext: false,
        lastAddress: 'addr2',
        items: { addr1: 100 },
      });
    });

    it('should include after parameter when provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ hasNext: false, items: {} }),
      });

      await api.getAssetDistribution('assetId', 1000, 1000, 'afterAddr');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('?after=afterAddr'),
        expect.any(Object)
      );
    });
  });
});
