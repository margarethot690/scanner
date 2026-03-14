// ─── Transaction ─────────────────────────────────────────────────

export interface Transaction {
  id: string;
  type: number;
  version: number;
  timestamp: number;
  sender: string;
  senderPublicKey?: string;
  recipient?: string;
  amount?: number;
  fee: number;
  feeAssetId?: string | null;
  height?: number;
  assetId?: string | null;
  attachment?: string;
  proofs?: string[];
  transfers?: Array<{ recipient: string; amount: number }>;
  name?: string;
  description?: string;
  quantity?: number;
  decimals?: number;
  reissuable?: boolean;
  script?: string | null;
  leaseId?: string;
  dApp?: string;
  call?: {
    function: string;
    args: Array<{ type: string; value: unknown }>;
  };
  payment?: Array<{ amount: number; assetId: string | null }>;
  data?: Array<{ key: string; type: string; value: unknown }>;
  [key: string]: unknown;
}

// ─── Lease ───────────────────────────────────────────────────────

export interface Lease {
  id: string;
  sender: string;
  recipient: string;
  amount: number;
  status?: string;
  height?: number;
  [key: string]: unknown;
}

// ─── Peer ────────────────────────────────────────────────────────

export interface Peer {
  address: string;
  declaredAddress?: string;
  nodeName?: string;
  peerName?: string;
  peerNonce?: number;
  lastSeen?: number;
  applicationName?: string;
  applicationVersion?: string;
  [key: string]: unknown;
}

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
