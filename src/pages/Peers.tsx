import { useQuery } from '@tanstack/react-query';
import { CheckCircle, Globe, Leaf, MapPin, Network, Pause, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NodeRegistration } from '@/api/entities';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  fetchAllPeers,
  fetchBlacklistedPeers,
  fetchConnectedPeers,
  fetchSuspendedPeers,
  type IAllConnectedResponse,
  type IAllResponse,
  type IBlackPeer,
  type ISuspendedPeer,
} from '@/lib/api';
import type { NodeRegistrationRecord, Peer } from '@/types';
import { useLanguage } from '../components/contexts/LanguageContext';
import { fromUnix } from '../components/utils/formatters';

type PeerApiShape =
  | Peer[]
  | IAllConnectedResponse
  | IAllResponse
  | ISuspendedPeer[]
  | IBlackPeer[]
  | null
  | undefined;

type EnrichedPeerData = {
  country: string;
  countryCode: string;
  city: string;
  registeredName: string | null;
  isGreen: boolean;
  hostedBy: string | null;
};

const extractPeers = (data: PeerApiShape): Peer[] => {
  if (!data) return [];
  if (Array.isArray(data)) {
    // ISuspendedPeer[] / IBlackPeer[] have {hostname, timestamp} — normalize to Peer shape
    if (data.length > 0 && data[0] && 'hostname' in data[0] && !('address' in data[0])) {
      return (data as ISuspendedPeer[]).map((p) => ({
        address: (p as ISuspendedPeer & { hostname: string }).hostname,
        lastSeen: p.timestamp,
        ...('reason' in p ? { peerName: (p as IBlackPeer).reason } : {}),
      })) as Peer[];
    }
    return data as Peer[];
  }
  return ((data as IAllConnectedResponse | IAllResponse).peers as Peer[]) || [];
};

export default function Peers() {
  const { t } = useLanguage();
  const [enrichedPeers, setEnrichedPeers] = useState<Record<string, EnrichedPeerData>>({});
  const [nodeRegistrations, setNodeRegistrations] = useState<NodeRegistrationRecord[]>([]);

  const { data: connected, isLoading: connectedLoading } = useQuery<IAllConnectedResponse>({
    queryKey: ['peers', 'connected'],
    queryFn: () => fetchConnectedPeers(),
  });

  const { data: all, isLoading: allLoading } = useQuery<IAllResponse>({
    queryKey: ['peers', 'all'],
    queryFn: () => fetchAllPeers(),
  });

  const { data: suspended, isLoading: suspendedLoading } = useQuery<ISuspendedPeer[]>({
    queryKey: ['peers', 'suspended'],
    queryFn: () => fetchSuspendedPeers(),
  });

  const { data: blacklisted, isLoading: blacklistedLoading } = useQuery<IBlackPeer[]>({
    queryKey: ['peers', 'blacklisted'],
    queryFn: () => fetchBlacklistedPeers(),
  });

  // Fetch node registrations
  useEffect(() => {
    const fetchRegistrations = async () => {
      try {
        const registrations = await NodeRegistration.list();
        setNodeRegistrations(registrations);
      } catch (error) {
        console.error('Failed to fetch node registrations:', error);
      }
    };
    fetchRegistrations();
  }, []);

  // Enrich peer data with node names and countries
  useEffect(() => {
    const enrichPeers = async (peers: PeerApiShape) => {
      const peerList = extractPeers(peers);
      if (!peerList.length) return;

      const newEnrichedData: Record<string, EnrichedPeerData> = {};
      const CACHE_KEY = 'peer_enrichment_cache';

      // Load cache from localStorage
      let cache: Record<string, Omit<EnrichedPeerData, 'registeredName'>> = {};
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) cache = JSON.parse(cached);
      } catch (error) {
        console.error('Failed to load cache:', error);
      }

      for (const peer of peerList) {
        const address = peer.address || peer.declaredAddress;
        const peerNodeName = typeof peer.nodeName === 'string' ? peer.nodeName : null;
        if (!address || enrichedPeers[address]) continue;

        try {
          // Extract IP from address (format: /ip:port)
          const ip = address.split('/')[1]?.split(':')[0];
          if (!ip) continue;

          // Check cache first
          if (cache[ip]) {
            const registration = nodeRegistrations.find(
              (reg) =>
                reg.status === 'approved' &&
                peerNodeName &&
                typeof reg.node_name === 'string' &&
                peerNodeName.toLowerCase().includes(reg.node_name.toLowerCase()),
            );

            newEnrichedData[address] = {
              ...cache[ip],
              registeredName:
                (typeof registration?.node_name === 'string' ? registration.node_name : null) ||
                peerNodeName ||
                null,
            };
            continue;
          }

          // Add delay to respect API rate limits
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Get geolocation data
          const geoResponse = await fetch(`https://ipapi.co/${ip}/json/`);
          const geoData = await geoResponse.json();

          // Find matching node registration
          const registration = nodeRegistrations.find(
            (reg) =>
              reg.status === 'approved' &&
              peerNodeName &&
              typeof reg.node_name === 'string' &&
              peerNodeName.toLowerCase().includes(reg.node_name.toLowerCase()),
          );

          // Check green hosting
          let isGreenHost = false;
          let hostedBy = null;
          try {
            const hostname = ip;
            const greenResponse = await fetch(
              `https://api.thegreenwebfoundation.org/api/v3/greencheck/${hostname}`,
            );
            const greenData = await greenResponse.json();
            isGreenHost = greenData.green || false;
            hostedBy = greenData.hosted_by || null;
          } catch (error) {
            console.error(`Failed to check green hosting for ${ip}:`, error);
          }

          const geo = geoData as {
            country_name?: string;
            country_code?: string;
            city?: string;
          };

          const enrichedData: EnrichedPeerData = {
            country: geo.country_name || 'Unknown',
            countryCode: geo.country_code || '',
            city: geo.city || '',
            registeredName:
              (typeof registration?.node_name === 'string' ? registration.node_name : null) ||
              peerNodeName ||
              null,
            isGreen: isGreenHost,
            hostedBy: hostedBy,
          };

          newEnrichedData[address] = enrichedData;

          // Cache the result (without registeredName as it may change)
          cache[ip] = {
            country: enrichedData.country,
            countryCode: enrichedData.countryCode,
            city: enrichedData.city,
            isGreen: enrichedData.isGreen,
            hostedBy: enrichedData.hostedBy,
          };
        } catch (error) {
          console.error(`Failed to enrich peer ${address}:`, error);
        }
      }

      // Save updated cache
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      } catch (error) {
        console.error('Failed to save cache:', error);
      }

      setEnrichedPeers((prev) => ({ ...prev, ...newEnrichedData }));
    };

    enrichPeers(connected);
    enrichPeers(all);
    enrichPeers(suspended);
    enrichPeers(blacklisted);
  }, [connected, all, suspended, blacklisted, nodeRegistrations, enrichedPeers]);

  const PeerTable = ({ peers, isLoading }: { peers: PeerApiShape; isLoading: boolean }) => {
    const peerList = extractPeers(peers);

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('address')}</TableHead>
              <TableHead>{t('declaredAddress')}</TableHead>
              <TableHead>{t('nodeName')}</TableHead>
              <TableHead>{t('country')}</TableHead>
              <TableHead>Green Host</TableHead>
              <TableHead>{t('lastSeen')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }, (_, skeletonIndex) => `skeleton-${skeletonIndex}`).map(
                (skeletonKey) => (
                  <TableRow key={skeletonKey}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-28" />
                    </TableCell>
                  </TableRow>
                ),
              )
            ) : peerList.length > 0 ? (
              peerList.map((peer) => {
                const address = peer.address || peer.declaredAddress;
                const enrichedData = address ? enrichedPeers[address] : undefined;
                const nodeName = enrichedData?.registeredName || peer.nodeName || t('unknownNode');

                return (
                  <TableRow key={peer.address || peer.declaredAddress || nodeName}>
                    <TableCell className="font-mono text-sm">{peer.address || 'N/A'}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {peer.declaredAddress || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">{nodeName}</div>
                    </TableCell>
                    <TableCell>
                      {enrichedData ? (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          <span>{enrichedData.country}</span>
                          {enrichedData.countryCode && (
                            <span className="text-xl">
                              {String.fromCodePoint(
                                ...[...enrichedData.countryCode.toUpperCase()].map(
                                  (c) => 127397 + c.charCodeAt(0),
                                ),
                              )}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">...</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {enrichedData ? (
                        enrichedData.isGreen ? (
                          <Badge className="bg-green-100 text-green-800 gap-1">
                            <Leaf className="w-3 h-3" />
                            Green
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            Standard
                          </Badge>
                        )
                      ) : (
                        <span className="text-gray-400">...</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {peer.lastSeen ? fromUnix(peer.lastSeen) : 'N/A'}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                  {t('noPeersFound')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">{t('networkPeers')}</h1>
        <p className="text-gray-600">{t('viewPeerConnections')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{t('connected')}</p>
                <p className="text-2xl font-bold">
                  {connectedLoading ? '...' : extractPeers(connected).length || 0}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{t('allPeers')}</p>
                <p className="text-2xl font-bold">
                  {allLoading ? '...' : extractPeers(all).length || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Globe className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{t('suspended')}</p>
                <p className="text-2xl font-bold">
                  {suspendedLoading ? '...' : extractPeers(suspended).length || 0}
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-xl">
                <Pause className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{t('blacklisted')}</p>
                <p className="text-2xl font-bold">
                  {blacklistedLoading ? '...' : extractPeers(blacklisted).length || 0}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-xl">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Peer Lists */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="w-5 h-5" />
            {t('peerDetails')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="connected">
            <div className="px-6 pt-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="connected">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {t('connected')}
                </TabsTrigger>
                <TabsTrigger value="all">
                  <Globe className="w-4 h-4 mr-2" />
                  {t('allPeers')}
                </TabsTrigger>
                <TabsTrigger value="suspended">
                  <Pause className="w-4 h-4 mr-2" />
                  {t('suspended')}
                </TabsTrigger>
                <TabsTrigger value="blacklisted">
                  <XCircle className="w-4 h-4 mr-2" />
                  {t('blacklisted')}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="connected" className="mt-6">
              <PeerTable peers={connected} isLoading={connectedLoading} />
            </TabsContent>

            <TabsContent value="all" className="mt-6">
              <PeerTable peers={all} isLoading={allLoading} />
            </TabsContent>

            <TabsContent value="suspended" className="mt-6">
              <PeerTable peers={suspended} isLoading={suspendedLoading} />
            </TabsContent>

            <TabsContent value="blacklisted" className="mt-6">
              <PeerTable peers={blacklisted} isLoading={blacklistedLoading} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
