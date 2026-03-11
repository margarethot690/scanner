
// API client for DecentralChain
const DEFAULT_BASE_URL = "https://mainnet-node.decentralchain.io";
const PAGE_LIMIT = 1000;
const REQUEST_TIMEOUT = 20000;
const MAX_RETRIES = 3;

export class BlockchainAPI {
  constructor(customBaseUrl = null) {
    this.baseURL = customBaseUrl || DEFAULT_BASE_URL;
  }

  setBaseURL(url) {
    this.baseURL = url || DEFAULT_BASE_URL;
  }

  async request(endpoint, retries = 0) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Handle rate limiting and server errors with retry
        if ((response.status === 429 || response.status >= 500) && retries < MAX_RETRIES) {
          const delay = Math.pow(2, retries) * 1000; // Exponential backoff
          console.log(`Retrying ${endpoint} after ${delay}ms (attempt ${retries + 1}/${MAX_RETRIES})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.request(endpoint, retries + 1);
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${REQUEST_TIMEOUT}ms`);
      }
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // Blocks
  async getHeight() {
    return this.request("/blocks/height");
  }

  async getLastBlock() {
    return this.request("/blocks/last");
  }

  async getBlockByHeight(height) {
    return this.request(`/blocks/at/${height}`);
  }

  async getBlockById(id) {
    return this.request(`/blocks/${id}`);
  }

  async getBlockHeaders(from, to) {
    return this.request(`/blocks/headers/seq/${from}/${to}`);
  }

  async getBlockHeadersAtHeight(height) {
    return this.request(`/blocks/headers/at/${height}`);
  }

  async getBlocksForgedByAddress(address, from, to) {
    return this.request(`/blocks/address/${address}/${from}/${to}`);
  }

  // Transactions
  async getTransaction(id) {
    return this.request(`/transactions/info/${id}`);
  }

  async getUnconfirmedTransaction(id) {
    return this.request(`/transactions/unconfirmed/info/${id}`);
  }

  async getAddressTransactions(address, limit = 50) {
    return this.request(`/transactions/address/${address}/limit/${limit}`);
  }

  async getUnconfirmedTransactions() {
    return this.request("/transactions/unconfirmed");
  }

  // Address & Assets
  async getAddressBalances(address) {
    return this.request(`/assets/balance/${address}`);
  }

  async getAddressAssetBalance(address, assetId) {
    return this.request(`/assets/balance/${address}/${assetId}`);
  }

  async getAddressNFTs(address, limit = 100) {
    return this.request(`/assets/nft/${address}/limit/${limit}`);
  }

  async getAssetDetails(assetId) {
    return this.request(`/assets/details/${assetId}`);
  }

  async getAssetDistribution(assetId, height, limit = PAGE_LIMIT, after = null) {
    let endpoint = `/assets/${assetId}/distribution/${height}/limit/${limit}`;
    if (after) {
      endpoint += `?after=${after}`;
    }
    const response = await this.request(endpoint);
    
    // Normalize response - API may return 'values' or 'items', and 'last' or 'lastItem' or 'lastAddress'
    const items = response.values || response.items || {};
    const hasNext = response.hasNext || false;
    const lastAddress = response.last || response.lastAddress || response.lastItem || null;
    
    return {
      hasNext,
      lastAddress,
      items
    };
  }

  // Fetch ALL distribution pages with pagination
  async getFullAssetDistribution(assetId, height, onProgress = null) {
    let allItems = {};
    let after = null;
    let pageCount = 0;
    let hasMore = true;
    
    console.log(`Starting full distribution fetch for asset ${assetId} at height ${height}`);
    
    while (hasMore) {
      try {
        const page = await this.getAssetDistribution(assetId, height, PAGE_LIMIT, after);
        
        // Merge this page's items
        allItems = { ...allItems, ...page.items };
        pageCount++;
        
        const totalHolders = Object.keys(allItems).length;
        console.log(`Page ${pageCount}: fetched ${Object.keys(page.items).length} addresses, total ${totalHolders}, hasNext=${page.hasNext}, last=${page.lastAddress}`);
        
        // Update progress
        if (onProgress) {
          onProgress(pageCount, totalHolders, page.hasNext);
        }
        
        // Check if there are more pages
        if (page.hasNext && page.lastAddress) {
          after = page.lastAddress;
          hasMore = true;
          // Small delay between requests to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 100));
        } else {
          hasMore = false;
        }
      } catch (error) {
        console.error(`Error fetching page ${pageCount + 1}:`, error);
        throw error;
      }
    }
    
    console.log(`Completed! Fetched ${pageCount} pages with ${Object.keys(allItems).length} total holders`);
    
    return {
      items: allItems,
      totalPages: pageCount,
      totalHolders: Object.keys(allItems).length
    };
  }

  // Leasing
  async getActiveLeases(address) {
    return this.request(`/leasing/active/${address}`);
  }

  // Peers
  async getConnectedPeers() {
    return this.request("/peers/connected");
  }

  async getAllPeers() {
    return this.request("/peers/all");
  }

  async getBlacklistedPeers() {
    return this.request("/peers/blacklisted");
  }

  async getSuspendedPeers() {
    return this.request("/peers/suspended");
  }

  // Node
  async getNodeStatus() {
    return this.request("/node/status");
  }

  async getNodeVersion() {
    return this.request("/node/version");
  }

  // Add a method for network statistics, assuming an endpoint like /node/state or /node/stats
  async getNodeState() {
    return this.request("/node/state"); // Common endpoint for overall node/network stats
  }

  // Rewards
  async getRewards() {
    return this.request("/blockchain/rewards");
  }

  async getRewardsAtHeight(height) {
    return this.request(`/blockchain/rewards/${height}`);
  }

  // DEX / Matcher
  async getMatcherOrderbook() {
    try {
      const response = await fetch("https://mainnet-matcher.decentralchain.io/matcher/orderbook");
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Failed to fetch matcher orderbook:", error);
      throw error;
    }
  }

  async getPairInfo(amountAsset, priceAsset) {
    try {
      const response = await fetch(
        `https://data-service.decentralchain.io/v0/pairs/${amountAsset}/${priceAsset}`
      );
      if (!response.ok) {
        // Don't log 404 errors as they are expected for many pairs
        if (response.status !== 404) {
          console.error(`Failed to fetch pair info for ${amountAsset}/${priceAsset}: HTTP ${response.status}`);
        }
        // Always throw for non-ok responses; the catch block will distinguish 404s
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      // Check if the error is a 404 from our thrown error
      if (error.message && error.message.startsWith('HTTP 404')) {
        // Silently fail for 404s: return null to indicate the pair was not found.
        return null;
      }
      // For all other errors (network issues, 5xx, etc.), log and re-throw
      console.error(`Failed to fetch pair info for ${amountAsset}/${priceAsset}:`, error);
      throw error;
    }
  }
}

export const blockchainAPI = new BlockchainAPI();

// Function to create a custom API instance with user's node URL
export const createCustomBlockchainAPI = (nodeUrl) => {
  return new BlockchainAPI(nodeUrl);
};
