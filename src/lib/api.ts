/**
 * SDK-backed API layer for DecentralChain scanner.
 *
 * Replaces the hand-rolled BlockchainAPI class with @decentralchain/node-api-js.
 * Keeps raw fetch for: matcher orderbook and data-service pair info
 * (served by separate non-node services without SDK equivalents).
 */
import { create } from '@decentralchain/node-api-js';
import type {
  IAssetDistribution,
  TAssetBalance,
  TAssetDetails,
  TAssetsBalance,
  TErrorResponse,
} from '@decentralchain/node-api-js/api-node/assets';
import type { IBlock, IBlockHeader } from '@decentralchain/node-api-js/api-node/blocks';
import type {
  INodeStatus as INodeStatusBase,
  INodeVersion,
} from '@decentralchain/node-api-js/api-node/node';
import type { IBlackPeer, ISuspendedPeer } from '@decentralchain/node-api-js/api-node/peers';
import type { TRewards } from '@decentralchain/node-api-js/api-node/rewards';
import type { Lease, Peer, Transaction } from '@/types';

/** Augmented node status – the real API returns extra fields the SDK omits. */
export interface INodeStatus extends INodeStatusBase {
  blockGeneratorStatus?: string;
  historyReplierEnabled?: boolean;
}

/** Balance details — SDK's TLong fields arrive as string | number at runtime. */
export interface IBalanceDetails {
  address: string;
  regular: string | number;
  generating: string | number;
  available: string | number;
  effective: string | number;
}

/** Blockchain rewards — SDK's TLong fields arrive as string | number at runtime. */
export interface IRewards {
  height: number;
  totalDccAmount: string | number;
  currentReward: string | number;
  minIncrement: string | number;
  term: number;
  nextCheck: number;
  votingIntervalStart: number;
  votingInterval: number;
  votingThreshold: number;
  votes: { increase: number; decrease: number };
}

// Re-export SDK types for consumers
export type {
  IAssetDistribution,
  IBlackPeer,
  IBlock,
  IBlockHeader,
  INodeVersion,
  ISuspendedPeer,
  TAssetBalance,
  TAssetDetails,
  TAssetsBalance,
  TRewards,
};

// ── Constants ──────────────────────────────────────────────────────────
const DEFAULT_NODE_URL = 'https://mainnet-node.decentralchain.io';
const MATCHER_URL = 'https://mainnet-matcher.decentralchain.io';
const DATA_SERVICE_URL = 'https://data-service.decentralchain.io/v0';
const DISTRIBUTION_PAGE_LIMIT = 1000;

// ── SDK Instance ───────────────────────────────────────────────────────
const nodeApi = create(DEFAULT_NODE_URL);

/** Fetch details for a single asset (SDK takes string[]). */
export async function fetchAssetDetailsById(assetId: string): Promise<TAssetDetails> {
  const results = await nodeApi.assets.fetchDetails([assetId]);
  return results[0] as TAssetDetails;
}

/** Batch-fetch details for multiple assets in a single HTTP request. */
export async function fetchBatchAssetDetails(
  assetIds: string[],
): Promise<Map<string, TAssetDetails>> {
  if (assetIds.length === 0) return new Map();

  const results = (await nodeApi.assets.fetchAssetsDetails(assetIds)) as (
    | TAssetDetails
    | TErrorResponse
  )[];
  const map = new Map<string, TAssetDetails>();
  for (const r of results) {
    if (!('error' in r)) {
      map.set(r.assetId, r);
    }
  }
  return map;
}

// ── Typed wrappers (absorb SDK ↔ scanner type mismatch) ───────────────

// Blocks
export async function fetchHeight(): Promise<{ height: number }> {
  return nodeApi.blocks.fetchHeight();
}

export async function fetchLastBlock(): Promise<IBlock> {
  return nodeApi.blocks.fetchLast() as Promise<IBlock>;
}

export async function fetchBlockAt(height: number): Promise<IBlock> {
  return nodeApi.blocks.fetchBlockAt(height) as Promise<IBlock>;
}

export async function fetchBlockById(id: string): Promise<IBlock> {
  return nodeApi.blocks.fetchBlockById(id) as Promise<IBlock>;
}

export async function fetchBlockHeadersSeq(from: number, to: number): Promise<IBlockHeader[]> {
  return nodeApi.blocks.fetchHeadersSeq(from, to) as Promise<IBlockHeader[]>;
}

// Transactions
export async function fetchTransactionInfo(id: string): Promise<Transaction> {
  return nodeApi.transactions.fetchInfo(id) as Promise<Transaction>;
}

export async function fetchUnconfirmedTransactionInfo(id: string): Promise<Transaction> {
  return nodeApi.transactions.fetchUnconfirmedInfo(id) as Promise<Transaction>;
}

export async function fetchAddressTransactions(
  address: string,
  limit: number,
): Promise<Transaction[]> {
  return nodeApi.transactions.fetchTransactions(address, limit) as Promise<Transaction[]>;
}

export async function fetchUnconfirmedTransactions(): Promise<Transaction[]> {
  return nodeApi.transactions.fetchUnconfirmed() as Promise<Transaction[]>;
}

// Assets
export async function fetchAssetsBalance(address: string): Promise<TAssetsBalance> {
  return nodeApi.assets.fetchAssetsBalance(address) as Promise<TAssetsBalance>;
}

export async function fetchAddressNFTs(address: string, limit: number): Promise<TAssetDetails[]> {
  return nodeApi.assets.fetchAssetsAddressLimit(address, limit) as Promise<TAssetDetails[]>;
}

// Leasing
export async function fetchActiveLeases(address: string): Promise<Lease[]> {
  return nodeApi.leasing.fetchActive(address) as Promise<Lease[]>;
}

// Peers
export async function fetchConnectedPeers(): Promise<PeersConnectedResponse> {
  return nodeApi.peers.fetchConnected() as Promise<PeersConnectedResponse>;
}

export async function fetchAllPeers(): Promise<PeersAllResponse> {
  return nodeApi.peers.fetchAll() as Promise<PeersAllResponse>;
}

export async function fetchSuspendedPeers(): Promise<ISuspendedPeer[]> {
  return nodeApi.peers.fetchSuspended();
}

export async function fetchBlacklistedPeers(): Promise<IBlackPeer[]> {
  return nodeApi.peers.fetchBlackListed();
}

// Node
export async function fetchNodeStatus(): Promise<INodeStatus> {
  return nodeApi.node.fetchNodeStatus() as Promise<INodeStatus>;
}

export async function fetchNodeVersion(): Promise<INodeVersion> {
  return nodeApi.node.fetchNodeVersion();
}

// Rewards
export async function fetchRewards(height?: number): Promise<IRewards> {
  return nodeApi.rewards.fetchRewards(height) as Promise<IRewards>;
}

// Addresses
export async function fetchBalanceDetails(address: string): Promise<IBalanceDetails> {
  return nodeApi.addresses.fetchBalanceDetails(address) as Promise<IBalanceDetails>;
}

/** Extract typed transactions from a block response. */
export function getBlockTransactions(block: IBlock): Transaction[] {
  return block.transactions as Transaction[];
}

// ── Peer response types (matching SDK structure) ───────────────────────

export interface PeersConnectedResponse {
  peers: Peer[];
}

export interface PeersAllResponse {
  peers: Peer[];
}

// ── Scanner-specific types (not in SDK) ────────────────────────────────
export interface FullDistribution {
  items: Record<string, number>;
  totalPages: number;
  totalHolders: number;
}

interface OrderbookMarket {
  amountAsset: string;
  priceAsset: string;
}

export interface OrderbookResponse {
  markets: OrderbookMarket[];
}

interface PairInfoResponse {
  __type?: string;
  data: {
    firstPrice: number;
    lastPrice: number;
    volume: number;
    volumeWaves?: number;
    quoteVolume?: number;
    txsCount: number;
    weightedAveragePrice?: number;
    high?: number;
    low?: number;
  } | null;
}

export interface DexPairData {
  amountAsset: string;
  priceAsset: string;
  amountAssetName: string;
  priceAssetName: string;
  lastPrice: number;
  volume24h?: number;
  pairName: string;
  volume: number;
  change24h: number;
  high: number;
  low: number;
  txsCount: number;
}

// ── Asset distribution (via SDK with `after` cursor) ───────────────────
export async function fetchFullAssetDistribution(
  assetId: string,
  height: number,
  onProgress: ((pages: number, holders: number, hasMore: boolean) => void) | null = null,
): Promise<FullDistribution> {
  let allItems: Record<string, number> = {};
  let after: string | undefined;
  let pageCount = 0;
  let hasMore = true;

  while (hasMore) {
    const page = await nodeApi.assets.fetchAssetDistribution(
      assetId,
      height,
      DISTRIBUTION_PAGE_LIMIT,
      after,
    );
    allItems = { ...allItems, ...page.items };
    pageCount++;

    if (onProgress) {
      onProgress(pageCount, Object.keys(allItems).length, page.hasNext);
    }

    if (page.hasNext && page.lastItem) {
      after = page.lastItem;
      hasMore = true;
      await new Promise((resolve) => setTimeout(resolve, 100));
    } else {
      hasMore = false;
    }
  }

  return {
    items: allItems,
    totalPages: pageCount,
    totalHolders: Object.keys(allItems).length,
  };
}

// ── Matcher / DEX (no SDK equivalent) ──────────────────────────────────
export async function fetchMatcherOrderbook(): Promise<OrderbookResponse> {
  const response = await fetch(`${MATCHER_URL}/matcher/orderbook`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as OrderbookResponse;
}

export async function fetchPairInfo(
  amountAsset: string,
  priceAsset: string,
): Promise<PairInfoResponse | null> {
  const response = await fetch(`${DATA_SERVICE_URL}/pairs/${amountAsset}/${priceAsset}`);
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`HTTP ${response.status}`);
  }
  return (await response.json()) as PairInfoResponse;
}
