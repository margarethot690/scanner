import type { ILeaseInfo } from '@decentralchain/node-api-js/api-node/leasing';
import type {
  IPeerAllResponse,
  IPeerConnectedResponse,
} from '@decentralchain/node-api-js/api-node/peers';

// ─── Transaction ─────────────────────────────────────────────────
// Flat convenience interface for node-API transaction responses.
// Field types use string | number (the SDK's TLong) for amounts/fees.
// Type-specific fields are optional; the index signature allows
// dynamic access (sorting, JSON display).

export interface Transaction {
  id: string;
  type: number;
  version: number;
  timestamp: number;
  sender: string;
  senderPublicKey?: string;
  recipient?: string;
  amount?: string | number;
  fee: string | number;
  feeAssetId?: string | null;
  height: number;
  assetId?: string | null;
  attachment?: string;
  proofs?: string[];
  transfers?: Array<{ recipient: string; amount: string | number }>;
  name?: string;
  description?: string;
  quantity?: string | number;
  decimals?: number;
  reissuable?: boolean;
  script?: string | null;
  leaseId?: string;
  dApp?: string;
  call?: {
    function: string;
    args: Array<{ type: string; value: unknown }>;
  };
  payment?: Array<{ amount: string | number; assetId: string | null }>;
  data?: Array<{ key: string; type: string; value: unknown }>;
  stateChanges?: unknown;
  applicationStatus?: 'succeeded' | 'script_execution_failed';
}

// ─── Lease ───────────────────────────────────────────────────────
// Re-export from SDK — no hand-written duplicate needed.

export type Lease = ILeaseInfo;

// ─── Peer ────────────────────────────────────────────────────────
// Combines fields from /peers/connected and /peers/all endpoints
// plus scanner-specific nodeName enrichment.

export type Peer = Partial<IPeerConnectedResponse> &
  Partial<IPeerAllResponse> & {
    address: string;
    nodeName?: string;
  };

// ─── Entity Storage ──────────────────────────────────────────────

export interface EntityRecord {
  id: string;
  created_date: string;
  updated_date: string;
  [key: string]: unknown;
}

export interface EntityAccessor<T extends EntityRecord = EntityRecord> {
  list(sort?: string, limit?: number): Promise<T[]>;
  filter(query?: Record<string, unknown>, sort?: string, limit?: number): Promise<T[]>;
  get(id: string): Promise<T>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

export interface AssetLogoRequestRecord extends EntityRecord {
  asset_id: string;
  asset_name?: string;
  logo_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  user_email?: string;
}

export interface NodeRegistrationRecord extends EntityRecord {
  node_name?: string;
  node_url?: string;
  user_email?: string;
  status?: string;
  [key: string]: unknown;
}

// ─── Toast ───────────────────────────────────────────────────────

export interface ToastData {
  id: string;
  open: boolean;
  title?: string;
  description?: string | React.ReactNode;
  variant?: 'default' | 'destructive';
  action?: React.ReactElement;
  onOpenChange?: (open: boolean) => void;
}

export interface ToastState {
  toasts: ToastData[];
}

export type ToastAction =
  | { type: typeof TOAST_ADD; toast: ToastData }
  | { type: typeof TOAST_UPDATE; toast: Partial<ToastData> & { id: string } }
  | { type: typeof TOAST_DISMISS; toastId?: string }
  | { type: typeof TOAST_REMOVE; toastId?: string };

declare const TOAST_ADD: 'ADD_TOAST';
declare const TOAST_UPDATE: 'UPDATE_TOAST';
declare const TOAST_DISMISS: 'DISMISS_TOAST';
declare const TOAST_REMOVE: 'REMOVE_TOAST';

// ─── Context Types ───────────────────────────────────────────────

export type Language = 'en' | 'es';

export interface LanguageContextValue {
  language: Language;
  changeLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

// ─── Component Props ─────────────────────────────────────────────

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export interface TokenAssetStat {
  assetId: string;
  txCount: number;
  totalAmount: number;
  name?: string;
  decimals?: number;
}
