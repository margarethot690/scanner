import { useQuery } from '@tanstack/react-query';
import { ArrowUpDown, Coins, FileText, Search, TrendingUp, Wallet } from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  fetchActiveLeases,
  fetchAddressNFTs,
  fetchAddressTransactions,
  fetchAssetsBalance,
  type TAssetDetails,
  type TAssetsBalance,
} from '@/lib/api';
import type { Lease, Transaction } from '@/types';
import { createPageUrl } from '@/utils';
import { useLanguage } from '../components/contexts/LanguageContext';
import AssetLogo from '../components/shared/AssetLogo'; // New import
import CopyButton from '../components/shared/CopyButton';
import { formatAmount, fromUnix, truncate } from '../components/utils/formatters';

type SortDirection = 'asc' | 'desc';
type TxSortKey = 'type' | 'timestamp' | 'fee';

interface TxSortConfig {
  key: TxSortKey;
  direction: SortDirection;
}

export default function Address() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const initialAddress = urlParams.get('addr') || '';

  const [searchAddress, setSearchAddress] = useState(initialAddress);
  const [address, setAddress] = useState(initialAddress);

  const { data: balances, isLoading: balancesLoading } = useQuery<TAssetsBalance>({
    queryKey: ['balances', address],
    queryFn: () => fetchAssetsBalance(address),
    enabled: !!address,
  });

  const { data: transactions, isLoading: txLoading } = useQuery<Transaction[]>({
    queryKey: ['transactions', address],
    queryFn: () => fetchAddressTransactions(address, 50),
    enabled: !!address,
  });

  const { data: nfts, isLoading: nftsLoading } = useQuery<TAssetDetails[]>({
    queryKey: ['nfts', address],
    queryFn: () => fetchAddressNFTs(address, 100),
    enabled: !!address,
  });

  const { data: leases, isLoading: leasesLoading } = useQuery<Lease[]>({
    queryKey: ['leases', address],
    queryFn: () => fetchActiveLeases(address),
    enabled: !!address,
  });

  const [txSearchTerm, setTxSearchTerm] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState('all');
  const [txSortConfig, setTxSortConfig] = useState<TxSortConfig>({
    key: 'timestamp',
    direction: 'desc',
  });

  const addressTransactions = useMemo<Transaction[]>(() => {
    return transactions ?? [];
  }, [transactions]);

  const addressBalances = balances?.balances ?? [];
  const addressNfts = nfts ?? [];
  const addressLeases = leases ?? [];

  const handleSearch = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchAddress.trim()) {
      setAddress(searchAddress.trim());
      navigate(createPageUrl('Address', `?addr=${searchAddress.trim()}`));
    }
  };

  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = [...addressTransactions];

    if (txSearchTerm) {
      const search = txSearchTerm.toLowerCase();
      filtered = filtered.filter(
        (tx) =>
          tx.id?.toLowerCase().includes(search) ||
          tx.sender?.toLowerCase().includes(search) ||
          tx.recipient?.toLowerCase().includes(search),
      );
    }

    if (txTypeFilter !== 'all') {
      filtered = filtered.filter((tx) => String(tx.type) === txTypeFilter);
    }

    filtered.sort((a, b) => {
      const aVal = a[txSortConfig.key] as string | number | undefined | null;
      const bVal = b[txSortConfig.key] as string | number | undefined | null;

      if (typeof aVal === 'undefined' || aVal === null) return 1;
      if (typeof bVal === 'undefined' || bVal === null) return -1;

      let comparison = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else {
        comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      }

      return txSortConfig.direction === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [addressTransactions, txSearchTerm, txTypeFilter, txSortConfig]);

  const transactionTypes = useMemo(() => {
    if (addressTransactions.length === 0) return [];
    const types = new Set(addressTransactions.map((tx) => String(tx.type)));
    return Array.from(types);
  }, [addressTransactions]);

  const handleSort = (key: TxSortKey) => {
    setTxSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            {t('searchAddress')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder={t('enterAddress')}
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" disabled={!searchAddress.trim()}>
              {t('search')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {address && (
        <>
          {/* Header */}
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('addressDetails')}</h1>
            <div className="flex items-center gap-2 mt-4">
              <Wallet className="w-5 h-5 text-gray-500" />
              <code className="text-sm bg-gray-100 px-3 py-2 rounded">{address}</code>
              <CopyButton text={address} label={t('copyAddress')} />
            </div>
          </div>

          <Tabs defaultValue="balances" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
              <TabsTrigger value="balances">
                <Coins className="w-4 h-4 mr-2" />
                {t('balances')}
              </TabsTrigger>
              <TabsTrigger value="transactions">
                <FileText className="w-4 h-4 mr-2" />
                {t('transactions')}
              </TabsTrigger>
              <TabsTrigger value="nfts">
                <Coins className="w-4 h-4 mr-2" />
                {t('nfts')}
              </TabsTrigger>
              <TabsTrigger value="leases">
                <TrendingUp className="w-4 h-4 mr-2" />
                {t('leases')}
              </TabsTrigger>
            </TabsList>

            {/* Balances Tab */}
            <TabsContent value="balances">
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>{t('assetBalances')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {balancesLoading ? (
                    <div className="space-y-3">
                      {['balance-1', 'balance-2', 'balance-3', 'balance-4', 'balance-5'].map(
                        (key) => (
                          <Skeleton key={key} className="h-12 w-full" />
                        ),
                      )}
                    </div>
                  ) : addressBalances.length > 0 ? (
                    <div className="space-y-3">
                      {addressBalances.map((balance) => (
                        <Link
                          key={balance.assetId}
                          to={createPageUrl('Asset', `?id=${balance.assetId}`)}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <AssetLogo assetId={balance.assetId} size="sm" />
                            <div>
                              <p className="font-medium">
                                {balance.issueTransaction?.name || t('unknownAsset')}
                              </p>
                              <p className="text-xs text-gray-500 font-mono">
                                {truncate(balance.assetId, 12)}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">
                              {formatAmount(
                                Number(balance.balance),
                                balance.issueTransaction?.decimals || 8,
                              )}
                            </p>
                            <p className="text-xs text-gray-500">
                              {balance.balance?.toLocaleString()} {t('units')}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-8">{t('noBalancesFound')}</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Transactions Tab */}
            <TabsContent value="transactions">
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <CardTitle>{t('recentTransactions')}</CardTitle>
                    <div className="flex gap-2 w-full md:w-auto">
                      <div className="relative flex-1 md:w-48">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                          placeholder={t('searchBySenderRecipient')}
                          className="pl-8"
                          value={txSearchTerm}
                          onChange={(e) => setTxSearchTerm(e.target.value)}
                        />
                      </div>
                      <Select value={txTypeFilter} onValueChange={setTxTypeFilter}>
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder={t('type')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('allTypes')}</SelectItem>
                          {transactionTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {txLoading ? (
                    <div className="space-y-3">
                      {[
                        'tx-1',
                        'tx-2',
                        'tx-3',
                        'tx-4',
                        'tx-5',
                        'tx-6',
                        'tx-7',
                        'tx-8',
                        'tx-9',
                        'tx-10',
                      ].map((key) => (
                        <Skeleton key={key} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : filteredAndSortedTransactions.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('transactionId')}</TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSort('type')}
                              className="flex items-center gap-1"
                            >
                              {t('type')}
                              <ArrowUpDown className="h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSort('timestamp')}
                              className="flex items-center gap-1"
                            >
                              {t('timestamp')}
                              <ArrowUpDown className="h-3 w-3" />
                            </Button>
                          </TableHead>
                          <TableHead className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSort('fee')}
                              className="flex items-center gap-1"
                            >
                              {t('fee')}
                              <ArrowUpDown className="h-3 w-3" />
                            </Button>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAndSortedTransactions.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell>
                              <Link
                                to={createPageUrl('Transaction', `?id=${tx.id}`)}
                                className="text-blue-600 hover:text-blue-700 font-mono text-sm"
                              >
                                {truncate(tx.id, 14)}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">{tx.type}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-gray-600">
                              {fromUnix(tx.timestamp)}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatAmount(tx.fee)} DC
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center text-gray-500 py-8">
                      {txSearchTerm || txTypeFilter !== 'all'
                        ? t('noTransactionsMatch')
                        : t('noTransactionsFound')}
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* NFTs Tab */}
            <TabsContent value="nfts">
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>{t('nftCollection')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {nftsLoading ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {['nft-1', 'nft-2', 'nft-3', 'nft-4', 'nft-5', 'nft-6', 'nft-7', 'nft-8'].map(
                        (key) => (
                          <Skeleton key={key} className="h-32 w-full" />
                        ),
                      )}
                    </div>
                  ) : addressNfts.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {addressNfts.map((nft) => (
                        <Link
                          key={nft.assetId}
                          to={createPageUrl('Asset', `?id=${nft.assetId}`)}
                          className="border rounded-lg p-4 hover:shadow-lg transition-shadow"
                        >
                          <div className="flex items-center justify-center mb-3">
                            <AssetLogo assetId={nft.assetId} size="lg" />
                          </div>
                          <p className="text-sm font-medium truncate text-center">
                            {nft.name || t('unnamedNFT')}
                          </p>
                          <p className="text-xs text-gray-500 font-mono truncate text-center">
                            {truncate(nft.assetId, 8)}
                          </p>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-8">{t('noNFTsFound')}</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Leases Tab */}
            <TabsContent value="leases">
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>{t('activeLeases')}</CardTitle>
                </CardHeader>
                <CardContent>
                  {leasesLoading ? (
                    <div className="space-y-3">
                      {['lease-1', 'lease-2', 'lease-3', 'lease-4', 'lease-5'].map((key) => (
                        <Skeleton key={key} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : addressLeases.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('leaseId')}</TableHead>
                          <TableHead>{t('recipient')}</TableHead>
                          <TableHead className="text-right">{t('amount')}</TableHead>
                          <TableHead>{t('status')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {addressLeases.map((lease) => (
                          <TableRow key={lease.id}>
                            <TableCell className="font-mono text-sm">
                              {truncate(lease.id, 12)}
                            </TableCell>
                            <TableCell>
                              <Link
                                to={createPageUrl('Address', `?addr=${lease.recipient}`)}
                                className="text-blue-600 hover:text-blue-700 font-mono text-sm"
                              >
                                {truncate(lease.recipient, 12)}
                              </Link>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatAmount(lease.amount)} DC
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="bg-green-100 text-green-700">
                                {t('active')}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center text-gray-500 py-8">{t('noActiveLeases')}</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
