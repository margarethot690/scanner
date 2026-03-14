import type { Core, EventObject } from 'cytoscape';
import cytoscape from 'cytoscape';
import fcose from 'cytoscape-fcose';
import { AlertCircle, Info, Loader2, Network, PlayCircle, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { fetchAddressTransactions } from '@/lib/api';
import { useLanguage } from '../components/contexts/LanguageContext';

// Register fcose layout once
cytoscape.use(fcose);

interface TransactionMapFormState {
  assetId: string;
  treatAsNative: boolean;
  rootAddress: string;
  maxHops: number;
  perAddressLimit: number;
}

interface TransactionMapUiState {
  loading: boolean;
  error: string | null;
  progress: string;
}

interface ParsedTransfer {
  kind: 'transfer' | 'mass' | 'invokePay';
  id: string;
  ts: number;
  from: string;
  to: string;
  amount: number;
  fee: number;
  assetId: string | null;
}

interface GraphNode {
  id: string;
  weight: number;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  amount: number;
  ts: number;
  txid: string;
}

interface TransactionMapGraphState {
  nodes: Record<string, GraphNode>;
  edges: GraphEdge[];
  hopsBuilt: number;
}

export default function TransactionMap() {
  const { t } = useLanguage();
  const [form, setForm] = useState<TransactionMapFormState>({
    assetId: '',
    treatAsNative: false,
    rootAddress: '',
    maxHops: 2,
    perAddressLimit: 200,
  });

  const [ui, setUi] = useState<TransactionMapUiState>({
    loading: false,
    error: null,
    progress: '',
  });

  const [graph, setGraph] = useState<TransactionMapGraphState>({
    nodes: {},
    edges: [],
    hopsBuilt: 0,
  });

  const cyRef = useRef<Core | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const visitedRef = useRef<{ addresses: Set<string>; txIds: Set<string> }>({
    addresses: new Set<string>(),
    txIds: new Set<string>(),
  });
  const rawCacheRef = useRef<Record<string, unknown>>({});

  // Helper to check if address is valid (not an alias)
  const isValidAddress = (addr: string | null | undefined): addr is string => {
    if (!addr || typeof addr !== 'string') return false;
    // Skip alias addresses (format: alias:X:name)
    if (addr.startsWith('alias:')) return false;
    // Valid addresses are typically 35 characters and start with '3'
    return addr.length >= 30 && addr.startsWith('3');
  };

  const parseTxsForAsset = (
    txArrays: unknown,
    { assetId, treatAsNative }: { assetId: string; treatAsNative: boolean },
  ): ParsedTransfer[] => {
    const flat = (Array.isArray(txArrays) ? txArrays : []) as Array<Record<string, unknown>>;
    const out: ParsedTransfer[] = [];

    for (const t_item of flat) {
      // Renamed 't' to 't_item' to avoid conflict with i18n 't' function
      const type = Number(t_item.type);
      const sender = typeof t_item.sender === 'string' ? t_item.sender : '';
      const txAssetId = typeof t_item.assetId === 'string' ? t_item.assetId : null;
      const isNative = treatAsNative || txAssetId == null;

      // Skip if sender is an alias
      if (!isValidAddress(sender)) {
        continue;
      }

      // Simple transfer (type 4)
      if (type === 4) {
        const recipient = typeof t_item.recipient === 'string' ? t_item.recipient : '';
        const ok = assetId ? txAssetId === assetId : isNative;
        if (ok && isValidAddress(recipient)) {
          out.push({
            kind: 'transfer',
            id: String(t_item.id),
            ts: Number(t_item.timestamp || 0),
            from: sender,
            to: recipient,
            amount: Number(t_item.amount || 0),
            fee: Number(t_item.fee || 0),
            assetId: txAssetId,
          });
        }
      }
      // Mass transfer (type 11)
      else if (type === 11) {
        const ok = assetId ? txAssetId === assetId : isNative;
        const transfers = Array.isArray(t_item.transfers)
          ? (t_item.transfers as Array<{ recipient?: string; amount?: number }>)
          : [];
        if (ok) {
          for (const it of transfers) {
            const recipient = typeof it.recipient === 'string' ? it.recipient : '';
            if (isValidAddress(recipient)) {
              out.push({
                kind: 'mass',
                id: String(t_item.id),
                ts: Number(t_item.timestamp || 0),
                from: sender,
                to: recipient,
                amount: Number(it.amount || 0),
                fee: Number(t_item.fee || 0),
                assetId: txAssetId,
              });
            }
          }
        }
      }
      // Invoke-script payments (type 16)
      else if (type === 16) {
        const stateChanges =
          t_item.stateChanges && typeof t_item.stateChanges === 'object'
            ? (t_item.stateChanges as {
                payments?: Array<{ assetId?: string | null; amount?: number; recipient?: string }>;
              })
            : {};
        const pays = Array.isArray(stateChanges.payments) ? stateChanges.payments : [];
        for (const p of pays) {
          const pAssetId = typeof p.assetId === 'string' ? p.assetId : null;
          const ok = assetId ? pAssetId === assetId : pAssetId == null && (treatAsNative || true);
          const recipientCandidate =
            (typeof t_item.recipient === 'string' ? t_item.recipient : null) ||
            (typeof p.recipient === 'string' ? p.recipient : null) ||
            sender;
          if (ok && isValidAddress(recipientCandidate)) {
            out.push({
              kind: 'invokePay',
              id: String(t_item.id),
              ts: Number(t_item.timestamp || 0),
              from: sender,
              to: recipientCandidate,
              amount: Number(p.amount || 0),
              fee: Number(t_item.fee || 0),
              assetId: pAssetId,
            });
          }
        }
      }
    }
    return out;
  };

  const buildGraph = async () => {
    const { assetId, treatAsNative, rootAddress, maxHops, perAddressLimit } = form;

    if (!rootAddress.trim()) {
      setUi({ loading: false, error: t('errorRootAddressRequired'), progress: '' });
      return;
    }

    // Validate root address
    if (!isValidAddress(rootAddress.trim())) {
      setUi({ loading: false, error: t('errorInvalidAddressFormat'), progress: '' });
      return;
    }

    setUi({ loading: true, error: null, progress: t('initializingProgress') });
    const newGraph: TransactionMapGraphState = { nodes: {}, edges: [], hopsBuilt: 0 };
    visitedRef.current = { addresses: new Set(), txIds: new Set() };
    rawCacheRef.current = {};

    const Q: Array<{ addr: string; hop: number }> = [{ addr: rootAddress.trim(), hop: 0 }];
    visitedRef.current.addresses.add(rootAddress.trim());

    const addNode = (a: string) => {
      if (!newGraph.nodes[a]) {
        newGraph.nodes[a] = { id: a, weight: 0 };
      }
    };

    const addEdge = (tx: ParsedTransfer) => {
      const key = `${tx.id}:${tx.from}->${tx.to}`;
      if (!visitedRef.current.txIds.has(key)) {
        visitedRef.current.txIds.add(key);
        newGraph.edges.push({
          id: key,
          source: tx.from,
          target: tx.to,
          amount: tx.amount,
          ts: tx.ts,
          txid: tx.id,
        });
        const sourceNode = newGraph.nodes[tx.from];
        if (sourceNode) sourceNode.weight += Number(tx.amount || 0);
        addNode(tx.to);
        const targetNode = newGraph.nodes[tx.to];
        if (targetNode) targetNode.weight += 0;
      }
    };

    try {
      let processed = 0;
      while (Q.length) {
        const next = Q.shift();
        if (!next) continue;
        const { addr, hop } = next;
        processed++;

        setUi((prev) => ({
          ...prev,
          progress: t('processingAddressProgress', {
            processed: processed,
            totalRemaining: processed + Q.length,
            hop: hop,
          }),
        }));

        // Skip if not a valid address
        if (!isValidAddress(addr)) {
          console.warn(t('warningSkippingInvalidAddress', { address: addr }));
          continue;
        }

        addNode(addr);

        // Fetch or reuse txs
        let res = rawCacheRef.current[addr];
        if (!res) {
          try {
            res = await fetchAddressTransactions(addr, perAddressLimit);
            rawCacheRef.current[addr] = res;
          } catch (error: unknown) {
            console.warn(
              t('warningFailedToFetchTxs', {
                address: addr,
                message: error instanceof Error ? error.message : String(error),
              }),
            );
            // Continue with other addresses even if one fails
            continue;
          }
        }

        const transfers = parseTxsForAsset(res, { assetId, treatAsNative });

        for (const tx of transfers) {
          // tx.from and tx.to are guaranteed to be valid addresses by parseTxsForAsset
          addNode(tx.from);
          addNode(tx.to);
          addEdge(tx);

          // Only add to Q if not visited and is a valid address (parseTxsForAsset already filtered it, but good to double check)
          if (
            hop + 1 <= maxHops &&
            !visitedRef.current.addresses.has(tx.to) &&
            isValidAddress(tx.to)
          ) {
            visitedRef.current.addresses.add(tx.to);
            Q.push({ addr: tx.to, hop: hop + 1 });
          }
        }
      }

      newGraph.hopsBuilt = maxHops;
      setGraph(newGraph);
      setUi({ loading: false, error: null, progress: '' });

      // Render after state update
      setTimeout(() => renderGraph(newGraph), 100);
    } catch (error: unknown) {
      console.error(t('errorBuildingGraph'), error);
      setUi({
        loading: false,
        error: error instanceof Error ? error.message : t('errorFailedToBuildGraph'),
        progress: '',
      });
    }
  };

  const renderGraph = (graphData: TransactionMapGraphState): void => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const nodes = Object.values(graphData.nodes).map((n) => ({
      data: { id: n.id, label: truncateAddress(n.id), weight: n.weight },
    }));

    const edges = graphData.edges.map((e) => ({
      data: {
        id: e.id,
        source: e.source,
        target: e.target,
        amount: e.amount,
        ts: e.ts,
        txid: e.txid,
      },
    }));

    try {
      cyRef.current = cytoscape({
        container,
        elements: [...nodes, ...edges],
        style: [
          {
            selector: 'node',
            style: {
              label: 'data(label)',
              'font-size': 10,
              'text-valign': 'center',
              'text-halign': 'center',
              'background-color': '#3b82f6',
              width: 'mapData(weight, 0, 1e10, 20, 60)',
              height: 'mapData(weight, 0, 1e10, 20, 60)',
              color: '#fff',
            },
          },
          {
            selector: 'edge',
            style: {
              'curve-style': 'bezier',
              'target-arrow-shape': 'triangle',
              'target-arrow-color': '#6366f1',
              'line-color': '#6366f1',
              width: 'mapData(amount, 0, 1e9, 1, 8)',
              'line-opacity': 0.5,
            },
          },
          {
            selector: ':selected',
            style: {
              'border-width': 3,
              'border-color': '#ef4444',
            },
          },
        ],
        layout: {
          name: 'fcose',
          quality: 'proof',
          randomize: true,
          packComponents: true,
          nodeSeparation: 100,
        } as cytoscape.LayoutOptions,
      });

      // Click handlers
      cyRef.current.on('tap', 'edge', (evt: EventObject) => {
        const d = evt.target.data() as {
          txid: string;
          amount: number;
          ts: number;
        };
        const info = `Tx: ${d.txid}\nAmount: ${d.amount}\nTime: ${new Date(d.ts).toISOString()}`;
        navigator.clipboard.writeText(d.txid);
        alert(`${t('txIdCopied')}\n\n${info}`);
      });

      cyRef.current.on('tap', 'node', (evt: EventObject) => {
        const id = String(evt.target.data('id'));
        navigator.clipboard.writeText(id);
        alert(`${t('addressCopied')}: ${id}`);
      });
    } catch (error: unknown) {
      console.error(t('errorRenderingGraph'), error);
      setUi((prev) => ({ ...prev, error: t('errorFailedToRenderGraph') }));
    }
  };

  const clearGraph = (): void => {
    if (cyRef.current) {
      cyRef.current.destroy();
      cyRef.current = null;
    }
    setGraph({ nodes: {}, edges: [], hopsBuilt: 0 });
    visitedRef.current = { addresses: new Set(), txIds: new Set() };
    rawCacheRef.current = {};
    setUi({ loading: false, error: null, progress: '' });
  };

  const truncateAddress = (addr: string): string => {
    if (!addr || addr.length <= 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const nodeCount = Object.keys(graph.nodes).length;
  const edgeCount = graph.edges.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('transactionMapTitle')}</h1>
        <p className="text-gray-600">{t('visualizeTransactionFlow')}</p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>{t('demoDataNote')}</AlertTitle>
        <AlertDescription>{t('demoDataDescription')}</AlertDescription>
      </Alert>

      {/* Configuration Card */}
      <Card className="border-none shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
          <CardTitle className="flex items-center gap-2">
            <Network className="w-5 h-5" />
            {t('graphConfigurationTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="assetId">{t('assetIdLabel')}</Label>
              <Input
                id="assetId"
                placeholder={t('assetIdPlaceholder')}
                value={form.assetId}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm({
                    ...form,
                    assetId: val,
                    treatAsNative: val.trim() === '',
                  });
                }}
                disabled={ui.loading}
              />
            </div>

            <div>
              <Label htmlFor="rootAddress">{t('rootAddressLabel')}</Label>
              <Input
                id="rootAddress"
                placeholder={t('startingAddressPlaceholder')}
                value={form.rootAddress}
                onChange={(e) => setForm({ ...form, rootAddress: e.target.value })}
                disabled={ui.loading}
              />
            </div>

            <div>
              <Label htmlFor="maxHops">{t('maxHopsLabel')}</Label>
              <Input
                id="maxHops"
                type="number"
                min="1"
                max="4"
                value={form.maxHops}
                onChange={(e) => setForm({ ...form, maxHops: parseInt(e.target.value, 10) || 2 })}
                disabled={ui.loading}
              />
            </div>

            <div>
              <Label htmlFor="perAddressLimit">{t('txPerAddressLimitLabel')}</Label>
              <Input
                id="perAddressLimit"
                type="number"
                min="50"
                max="500"
                value={form.perAddressLimit}
                onChange={(e) =>
                  setForm({
                    ...form,
                    perAddressLimit: Number.parseInt(e.target.value, 10) || 200,
                  })
                }
                disabled={ui.loading}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="treatAsNative"
              checked={form.treatAsNative}
              onCheckedChange={(checked: boolean) => setForm({ ...form, treatAsNative: checked })}
              disabled={ui.loading}
            />
            <Label htmlFor="treatAsNative">{t('treatAsNativeLabel')}</Label>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={buildGraph}
              disabled={ui.loading || !form.rootAddress.trim()}
              className="flex-1"
            >
              {ui.loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('buildingButton')}
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4 mr-2" />
                  {t('buildMapButton')}
                </>
              )}
            </Button>
            <Button onClick={clearGraph} variant="outline" disabled={ui.loading}>
              <Trash2 className="w-4 h-4 mr-2" />
              {t('clearButton')}
            </Button>
          </div>

          {ui.progress && (
            <div className="text-sm text-gray-600 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {ui.progress}
            </div>
          )}

          {ui.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{ui.error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      {nodeCount > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">{t('addressesCountLabel')}</p>
              <p className="text-2xl font-bold">{nodeCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">{t('transfersCountLabel')}</p>
              <p className="text-2xl font-bold">{edgeCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-500">{t('hopsExploredLabel')}</p>
              <p className="text-2xl font-bold">{graph.hopsBuilt}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Graph Visualization */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{t('transactionGraphTitle')}</CardTitle>
            <div className="flex gap-2">
              <Badge variant="outline">{t('nodeIsAddress')}</Badge>
              <Badge variant="outline">{t('edgeIsTransfer')}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div
            ref={containerRef}
            id="tx-graph"
            className="w-full bg-gray-50 rounded-lg border"
            style={{ height: '70vh', minHeight: '500px' }}
          />
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="text-base">{t('legendTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>{t('legendNodeSize')}</p>
          <p>{t('legendEdgeWidth')}</p>
          <p>{t('legendClickEdge')}</p>
          <p>{t('legendClickNode')}</p>
          <p>{t('legendDragNodes')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
