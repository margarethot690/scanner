import { useQuery } from '@tanstack/react-query';
import { Activity, ArrowUpDown, RefreshCw, Search, TrendingDown, TrendingUp } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  type DexPairData,
  fetchBatchAssetDetails,
  fetchMatcherOrderbook,
  fetchPairInfo,
  type OrderbookResponse,
} from '@/lib/api';
import { createPageUrl } from '@/utils';
import { useLanguage } from '../components/contexts/LanguageContext';
import AssetLogo from '../components/shared/AssetLogo';

type DexPairRow = DexPairData & {
  firstPrice: number;
  quoteVolume: number;
  weightedAveragePrice: number;
};

type DexSortKey = 'pairName' | 'lastPrice' | 'change24h' | 'high' | 'low' | 'volume' | 'txsCount';

export default function DexPairs() {
  const { t } = useLanguage();
  const [pairsData, setPairsData] = useState<DexPairRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: DexSortKey; direction: 'asc' | 'desc' }>({
    key: 'volume',
    direction: 'desc',
  });

  // Fetch trading pairs
  const { data: orderbook, refetch: refetchOrderbook } = useQuery<OrderbookResponse>({
    queryKey: ['matcherOrderbook'],
    queryFn: () => fetchMatcherOrderbook(),
    staleTime: 60000,
  });

  useEffect(() => {
    const fetchPairsData = async () => {
      if (!orderbook?.markets) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // Phase 1: Fetch pair info for all markets (data-service — sequential with delay)
        const marketPairInfo: Array<{
          market: (typeof orderbook.markets)[0];
          data: NonNullable<NonNullable<Awaited<ReturnType<typeof fetchPairInfo>>>['data']>;
        }> = [];
        for (const market of orderbook.markets) {
          try {
            await new Promise((resolve) => setTimeout(resolve, 100));
            const pairInfo = await fetchPairInfo(market.amountAsset, market.priceAsset);
            if (pairInfo?.data) {
              marketPairInfo.push({ market, data: pairInfo.data });
            }
          } catch (_error) {}
        }

        // Phase 2: Batch-fetch all unique asset details in one HTTP request
        const DCC_IDS = new Set(['DCC', 'WAVES']);
        const assetIds = new Set<string>();
        for (const { market } of marketPairInfo) {
          if (!DCC_IDS.has(market.amountAsset)) assetIds.add(market.amountAsset);
          if (!DCC_IDS.has(market.priceAsset)) assetIds.add(market.priceAsset);
        }
        const assetMap = await fetchBatchAssetDetails([...assetIds]);

        // Phase 3: Assemble pairs with resolved names
        const pairs: DexPairRow[] = [];
        for (const { market, data } of marketPairInfo) {
          const amountAssetName = DCC_IDS.has(market.amountAsset)
            ? 'DCC'
            : assetMap.get(market.amountAsset)?.name || 'Unknown';
          const priceAssetName = DCC_IDS.has(market.priceAsset)
            ? 'DCC'
            : assetMap.get(market.priceAsset)?.name || 'Unknown';

          const change24h =
            data.firstPrice > 0 ? ((data.lastPrice - data.firstPrice) / data.firstPrice) * 100 : 0;

          pairs.push({
            amountAsset: market.amountAsset,
            priceAsset: market.priceAsset,
            amountAssetName,
            priceAssetName,
            pairName: `${amountAssetName}/${priceAssetName}`,
            lastPrice: data.lastPrice,
            firstPrice: data.firstPrice,
            volume: data.volume,
            quoteVolume: data.quoteVolume || 0,
            change24h,
            high: data.high || 0,
            low: data.low || 0,
            txsCount: data.txsCount,
            weightedAveragePrice: data.weightedAveragePrice || 0,
          });
        }

        setPairsData(pairs);
      } catch (error) {
        console.error('Failed to fetch pairs data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPairsData();
  }, [orderbook]);

  const handleSort = (key: DexSortKey): void => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const handleRefresh = (): void => {
    refetchOrderbook();
  };

  const filteredAndSortedPairs = React.useMemo(() => {
    let filtered = [...pairsData];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (pair) =>
          pair.pairName.toLowerCase().includes(search) ||
          pair.amountAssetName.toLowerCase().includes(search) ||
          pair.priceAssetName.toLowerCase().includes(search),
      );
    }

    filtered.sort((a, b) => {
      const aVal = a[sortConfig.key as keyof DexPairRow];
      const bVal = b[sortConfig.key as keyof DexPairRow];

      if (typeof aVal === 'undefined' || aVal === null) return 1;
      if (typeof bVal === 'undefined' || bVal === null) return -1;

      const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [pairsData, searchTerm, sortConfig]);

  const totalVolume = pairsData.reduce((sum, pair) => sum + (pair.volume || 0), 0);
  const totalTrades = pairsData.reduce((sum, pair) => sum + (pair.txsCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('dexTradingPairs')}</h1>
        <p className="text-gray-600">{t('exploreDexPairs')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{t('totalPairs')}</p>
                <p className="text-2xl font-bold">{loading ? '...' : pairsData.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <ArrowUpDown className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{t('totalVolume24h')}</p>
                <p className="text-2xl font-bold">{loading ? '...' : totalVolume.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{t('totalTrades24h')}</p>
                <p className="text-2xl font-bold">
                  {loading ? '...' : totalTrades.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <Activity className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trading Pairs Table */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle>{t('allTradingPairs')}</CardTitle>
            <div className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder={t('searchPairs')}
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button variant="outline" size="icon" onClick={handleRefresh} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <img
                src="https://i.imgur.com/MsLURjt.gif"
                alt="Loading..."
                className="w-32 h-32 object-contain"
              />
            </div>
          ) : filteredAndSortedPairs.length === 0 ? (
            <Alert>
              <AlertDescription>
                {searchTerm ? t('noResultsFound') : t('noTradingPairs')}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('pair')}</TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('lastPrice')}
                        className="flex items-center gap-1 -ml-3"
                      >
                        {t('lastPrice')}
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('change24h')}
                        className="flex items-center gap-1 -ml-3"
                      >
                        {t('change24h')}
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('high')}
                        className="flex items-center gap-1 -ml-3"
                      >
                        {t('high24h')}
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('low')}
                        className="flex items-center gap-1 -ml-3"
                      >
                        {t('low24h')}
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('volume')}
                        className="flex items-center gap-1 -ml-3"
                      >
                        {t('volume24h')}
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSort('txsCount')}
                        className="flex items-center gap-1 -ml-3"
                      >
                        {t('trades')}
                        <ArrowUpDown className="h-3 w-3" />
                      </Button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedPairs.map((pair) => (
                    <TableRow
                      key={`${pair.amountAsset}-${pair.priceAsset}-${pair.pairName}`}
                      className="hover:bg-gray-50"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <AssetLogo assetId={pair.amountAsset} size="sm" />
                          <div>
                            <p className="font-medium">{pair.pairName}</p>
                            <div className="flex gap-1 mt-1">
                              <Link
                                to={createPageUrl('Asset', `?id=${pair.amountAsset}`)}
                                className="text-xs text-blue-600 hover:text-blue-700"
                              >
                                {pair.amountAssetName}
                              </Link>
                              <span className="text-xs text-gray-400">/</span>
                              <Link
                                to={createPageUrl('Asset', `?id=${pair.priceAsset}`)}
                                className="text-xs text-blue-600 hover:text-blue-700"
                              >
                                {pair.priceAssetName}
                              </Link>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">{pair.lastPrice.toFixed(8)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={pair.change24h >= 0 ? 'default' : 'destructive'}
                          className="gap-1"
                        >
                          {pair.change24h >= 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          {pair.change24h.toFixed(2)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{pair.high.toFixed(8)}</TableCell>
                      <TableCell className="font-mono text-sm">{pair.low.toFixed(8)}</TableCell>
                      <TableCell className="font-semibold">{pair.volume.toFixed(2)}</TableCell>
                      <TableCell className="text-gray-600">
                        {pair.txsCount.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
