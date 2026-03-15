import { useQuery } from '@tanstack/react-query';
import { AlertCircle, BarChart3, Coins, Search, TrendingUp, Users } from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  fetchAssetDetailsById,
  fetchBlockAt,
  fetchBlockHeadersSeq,
  fetchHeight,
  getBlockTransactions,
  type IBlockHeader,
  type TAssetDetails,
} from '@/lib/api';
import type { TokenAssetStat } from '@/types';
import { createPageUrl } from '@/utils';
import { useLanguage } from '../components/contexts/LanguageContext';
import AssetLogo from '../components/shared/AssetLogo';
import CopyButton from '../components/shared/CopyButton';

import { formatAmount, truncate } from '../components/utils/formatters';

const COLORS = [
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#6366f1',
  '#f43f5e',
  '#14b8a6',
];

export default function Asset() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const initialAssetId = urlParams.get('id') || '';

  const [searchAssetId, setSearchAssetId] = useState(initialAssetId);
  const [assetId, setAssetId] = useState(initialAssetId);

  const {
    data: asset,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['asset', assetId],
    queryFn: () => fetchAssetDetailsById(assetId),
    enabled: !!assetId,
  });

  const handleSearch = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (searchAssetId.trim()) {
      setAssetId(searchAssetId.trim());
      navigate(createPageUrl('Asset', `?id=${searchAssetId.trim()}`));
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            {t('searchAsset')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder={t('enterAssetId')}
                value={searchAssetId}
                onChange={(e) => setSearchAssetId(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" disabled={!searchAssetId.trim()}>
              {t('search')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Asset Activity Visualization */}
      <AssetActivityWidget />

      {/* Results */}
      {assetId && (
        <>
          <div className="flex items-start gap-4">
            {asset && <AssetLogo assetId={asset.assetId} size="xl" />}
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('assetDetails')}</h1>
              {asset && <p className="text-gray-600 mt-1">{asset.name || t('unnamedAsset')}</p>}
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error.message || t('failedToLoadAsset')}</AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {Array.from({ length: 6 }, (_, skeletonIndex) => `skeleton-${skeletonIndex}`).map(
                    (skeletonKey) => (
                      <div key={skeletonKey}>
                        <Skeleton className="h-4 w-24 mb-2" />
                        <Skeleton className="h-6 w-full" />
                      </div>
                    ),
                  )}
                </div>
              </CardContent>
            </Card>
          ) : asset ? (
            <>
              {/* Asset Information */}
              <Card className="border-none shadow-lg">
                <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white">
                  <CardTitle className="flex items-center gap-2">
                    <Coins className="w-5 h-5" />
                    {t('assetInformation')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-sm text-gray-500 mb-2">{t('assetName')}</p>
                      <p className="text-2xl font-bold">{asset.name || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-2">{t('decimals')}</p>
                      <p className="font-semibold">{asset.decimals}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-500 mb-2">{t('assetId')}</p>
                      <div className="flex items-center gap-2">
                        <code className="text-sm bg-gray-50 p-2 rounded flex-1 overflow-x-auto">
                          {asset.assetId}
                        </code>
                        <CopyButton text={asset.assetId} label={t('copyAssetId')} />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-2">{t('totalQuantity')}</p>
                      <p className="font-semibold">
                        {formatAmount(Number(asset.quantity), Number(asset.decimals))}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-2">{t('reissuable')}</p>
                      <Badge variant={asset.reissuable ? 'default' : 'secondary'}>
                        {asset.reissuable ? t('yes') : t('no')}
                      </Badge>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm text-gray-500 mb-2">{t('issuer')}</p>
                      <Link
                        to={createPageUrl('Address', `?addr=${asset.issuer}`)}
                        className="text-blue-600 hover:text-blue-700 font-mono text-sm"
                      >
                        {asset.issuer}
                      </Link>
                    </div>
                    {asset.description && (
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-500 mb-2">{t('description')}</p>
                        <p className="text-gray-700">{asset.description}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Distribution Tool Link */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>{t('distributionAnalysis')}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">
                    {t('exploreHolderDistribution')}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 mb-4">{t('useAdvancedTool')}</p>
                  <Link to={createPageUrl('DistributionTool', `?assetId=${asset.assetId}`)}>
                    <Button>{t('launchDistributionTool')}</Button>
                  </Link>
                </CardContent>
              </Card>

              {/* Raw JSON */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>{t('rawAssetData')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-xs">
                    {JSON.stringify(asset, null, 2)}
                  </pre>
                </CardContent>
              </Card>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

// Asset Activity Widget
function AssetActivityWidget() {
  const { t } = useLanguage();
  const [assetActivity, setAssetActivity] = useState<{
    assets: TokenAssetStat[];
    totalAssets: number;
    totalTxCount: number;
  } | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const { data: height } = useQuery({
    queryKey: ['height'],
    queryFn: () => fetchHeight(),
  });

  const currentHeight = height?.height || 0;

  useEffect(() => {
    if (!currentHeight) return;

    const fetchAssetActivity = async () => {
      setLoading(true);
      try {
        // Fetch last 50 blocks
        const from = Math.max(1, currentHeight - 49);
        const blockHeaders = await fetchBlockHeadersSeq(from, currentHeight);

        // Track asset activity
        const assetStats: Record<string, TokenAssetStat> = {};
        let totalTxCount = 0;
        let successfulBlocks = 0;

        // REDUCED: Fetch transactions from only last 8 blocks (instead of 15)
        for (const block of (blockHeaders as IBlockHeader[]).slice(-8)) {
          try {
            // Add delay between requests to avoid overwhelming the API
            await new Promise((resolve) => setTimeout(resolve, 200));

            const fullBlock = await fetchBlockAt(block.height);
            if (fullBlock?.transactions) {
              successfulBlocks++;
              for (const tx of getBlockTransactions(fullBlock)) {
                totalTxCount++;

                // Track asset transfers
                if ([4, 11].includes(tx.type) && tx.assetId) {
                  if (!assetStats[tx.assetId]) {
                    assetStats[tx.assetId] = {
                      txCount: 0,
                      totalAmount: 0,
                      assetId: tx.assetId,
                    };
                  }
                  const stat = assetStats[tx.assetId];
                  if (!stat) continue;
                  stat.txCount++;

                  if (tx.type === 4) {
                    stat.totalAmount += Number(tx.amount) || 0;
                  } else if (tx.type === 11 && tx.transfers) {
                    for (const transfer of tx.transfers) {
                      stat.totalAmount += Number(transfer.amount) || 0;
                    }
                  }
                }
              }
            }
          } catch (err: unknown) {
            console.error(`Failed to fetch block ${block.height}:`, err);
            // Continue with other blocks
          }
        }

        // Only proceed if we got at least some data
        if (successfulBlocks === 0 || Object.keys(assetStats).length === 0) {
          console.warn('Failed to fetch any asset activity data or no transactions found.');
          setLoading(false);
          return;
        }

        // Get top 8 most active assets
        const topAssets = Object.values(assetStats)
          .sort((a, b) => b.txCount - a.txCount)
          .slice(0, 8);

        // Fetch asset details with delays
        for (const asset of topAssets) {
          try {
            await new Promise((resolve) => setTimeout(resolve, 150));
            const details = (await fetchAssetDetailsById(asset.assetId)) as TAssetDetails;
            asset.name = details.name || 'Unknown';
            asset.decimals = details.decimals || 8;
          } catch (err: unknown) {
            console.error(`Failed to fetch asset details for ${asset.assetId}:`, err);
            asset.name = truncate(asset.assetId, 8);
            asset.decimals = 8;
          }
        }

        setAssetActivity({
          assets: topAssets,
          totalAssets: Object.keys(assetStats).length,
          totalTxCount,
        });
      } catch (error: unknown) {
        console.error('Failed to fetch asset activity:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAssetActivity();
  }, [currentHeight]);

  if (loading) {
    return (
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {t('assetActivity')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-16">
            <img
              src="https://i.imgur.com/MsLURjt.gif"
              alt="Loading..."
              className="w-32 h-32 object-contain"
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!assetActivity || assetActivity.assets.length === 0) {
    return (
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            {t('assetActivity')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">{t('noAssetActivity')}</p>
        </CardContent>
      </Card>
    );
  }

  const pieData = assetActivity.assets.map((asset, index) => ({
    name: asset.name,
    value: asset.txCount,
    fill: COLORS[index % COLORS.length],
  }));

  const barData = assetActivity.assets.map((asset, index) => ({
    name: asset.name,
    transactions: asset.txCount,
    amount: formatAmount(asset.totalAmount, asset.decimals),
    fill: COLORS[index % COLORS.length],
  }));

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          {t('mostActiveAssets')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pie Chart */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-4 text-center">
              {t('transactionDistribution')}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name ?? ''}: ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  dataKey="value"
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{assetActivity.totalAssets}</p>
              <p className="text-sm text-gray-600">{t('uniqueAssetsTraded')}</p>
            </div>
          </div>

          {/* Bar Chart */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-4 text-center">
              {t('transactionVolume')}
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="transactions" radius={[0, 4, 4, 0]}>
                  {barData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{assetActivity.totalTxCount}</p>
              <p className="text-sm text-gray-600">{t('totalTransactions')}</p>
            </div>
          </div>
        </div>

        {/* Asset List */}
        <div className="mt-8">
          <h3 className="text-sm font-medium text-gray-700 mb-3">{t('topAssets')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {assetActivity.assets.map((asset) => (
              <Link
                key={asset.assetId}
                to={createPageUrl('Asset', `?id=${asset.assetId}`)}
                className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white border rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <AssetLogo assetId={asset.assetId} size="sm" />
                  <div>
                    <p className="font-medium text-sm">{asset.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatAmount(asset.totalAmount, asset.decimals)} {t('transferred')}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">
                  {asset.txCount} {t('txAbbreviation')}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
