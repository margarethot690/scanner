import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { blockchainAPI } from "../components/utils/blockchain";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Network, CheckCircle, Globe, XCircle, Pause, MapPin, Leaf } from "lucide-react";
import { fromUnix } from "../components/utils/formatters";
import { useLanguage } from "../components/contexts/LanguageContext";

export default function Peers() {
  const { t } = useLanguage();
  const [enrichedPeers, setEnrichedPeers] = useState({});
  const [nodeRegistrations, setNodeRegistrations] = useState([]);

  const { data: connected, isLoading: connectedLoading } = useQuery({
    queryKey: ["peers", "connected"],
    queryFn: () => blockchainAPI.getConnectedPeers(),
  });

  const { data: all, isLoading: allLoading } = useQuery({
    queryKey: ["peers", "all"],
    queryFn: () => blockchainAPI.getAllPeers(),
  });

  const { data: suspended, isLoading: suspendedLoading } = useQuery({
    queryKey: ["peers", "suspended"],
    queryFn: () => blockchainAPI.getSuspendedPeers(),
  });

  const { data: blacklisted, isLoading: blacklistedLoading } = useQuery({
    queryKey: ["peers", "blacklisted"],
    queryFn: () => blockchainAPI.getBlacklistedPeers(),
  });

  // Fetch node registrations
  useEffect(() => {
    const fetchRegistrations = async () => {
      try {
        const registrations = await base44.entities.NodeRegistration.list();
        setNodeRegistrations(registrations);
      } catch (error) {
        console.error("Failed to fetch node registrations:", error);
      }
    };
    fetchRegistrations();
  }, []);

  // Enrich peer data with node names and countries
  useEffect(() => {
    const enrichPeers = async (peers) => {
      if (!peers?.peers?.length) return;

      const newEnrichedData = {};
      
      for (const peer of peers.peers) {
        const address = peer.address || peer.declaredAddress;
        if (!address || enrichedPeers[address]) continue;

        try {
          // Extract IP from address (format: /ip:port)
          const ip = address.split('/')[1]?.split(':')[0];
          if (!ip) continue;

          // Add delay to respect API rate limits
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Get geolocation data
          const geoResponse = await fetch(`https://ipapi.co/${ip}/json/`);
          const geoData = await geoResponse.json();
          
          // Find matching node registration by wallet address
          const registration = nodeRegistrations.find(reg => 
            reg.status === 'approved' && peer.nodeName && 
            peer.nodeName.toLowerCase().includes(reg.node_name.toLowerCase())
          );

          // Check green hosting
          let isGreenHost = false;
          let hostedBy = null;
          try {
            const hostname = ip; // Use IP as hostname for green check
            const greenResponse = await fetch(`https://api.thegreenwebfoundation.org/api/v3/greencheck/${hostname}`);
            const greenData = await greenResponse.json();
            isGreenHost = greenData.green || false;
            hostedBy = greenData.hosted_by || null;
          } catch (error) {
            console.error(`Failed to check green hosting for ${ip}:`, error);
          }

          newEnrichedData[address] = {
            country: geoData.country_name || 'Unknown',
            countryCode: geoData.country_code || '',
            city: geoData.city || '',
            registeredName: registration?.node_name || peer.nodeName || null,
            isGreen: isGreenHost,
            hostedBy: hostedBy
          };
        } catch (error) {
          console.error(`Failed to enrich peer ${address}:`, error);
        }
      }

      setEnrichedPeers(prev => ({ ...prev, ...newEnrichedData }));
    };

    if (connected?.peers) enrichPeers(connected);
    if (all?.peers) enrichPeers(all);
    if (suspended?.peers) enrichPeers(suspended);
    if (blacklisted?.peers) enrichPeers(blacklisted);
  }, [connected, all, suspended, blacklisted, nodeRegistrations]);

  const PeerTable = ({ peers, isLoading }) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("address")}</TableHead>
            <TableHead>{t("declaredAddress")}</TableHead>
            <TableHead>{t("nodeName")}</TableHead>
            <TableHead>{t("country")}</TableHead>
            <TableHead>Green Host</TableHead>
            <TableHead>{t("lastSeen")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array(5)
              .fill(0)
              .map((_, i) => (
                <TableRow key={i}>
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
              ))
          ) : peers && peers.peers?.length > 0 ? (
            peers.peers.map((peer, index) => {
              const address = peer.address || peer.declaredAddress;
              const enrichedData = enrichedPeers[address];
              const nodeName = enrichedData?.registeredName || peer.nodeName || t("unknownNode");
              
              return (
                <TableRow key={index}>
                  <TableCell className="font-mono text-sm">
                    {peer.address || "N/A"}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {peer.declaredAddress || "N/A"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {nodeName}
                    </div>
                  </TableCell>
                  <TableCell>
                    {enrichedData ? (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span>{enrichedData.country}</span>
                        {enrichedData.countryCode && (
                          <span className="text-xl">
                            {String.fromCodePoint(...[...enrichedData.countryCode.toUpperCase()].map(c => 127397 + c.charCodeAt()))}
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
                    {peer.lastSeen ? fromUnix(peer.lastSeen) : "N/A"}
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                {t("noPeersFound")}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">{t("networkPeers")}</h1>
        <p className="text-gray-600">{t("viewPeerConnections")}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{t("connected")}</p>
                <p className="text-2xl font-bold">
                  {connectedLoading ? "..." : connected?.peers?.length || 0}
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
                <p className="text-sm text-gray-500 mb-1">{t("allPeers")}</p>
                <p className="text-2xl font-bold">
                  {allLoading ? "..." : all?.peers?.length || 0}
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
                <p className="text-sm text-gray-500 mb-1">{t("suspended")}</p>
                <p className="text-2xl font-bold">
                  {suspendedLoading ? "..." : suspended?.peers?.length || 0}
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
                <p className="text-sm text-gray-500 mb-1">{t("blacklisted")}</p>
                <p className="text-2xl font-bold">
                  {blacklistedLoading ? "..." : blacklisted?.peers?.length || 0}
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
            {t("peerDetails")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="connected">
            <div className="px-6 pt-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="connected">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {t("connected")}
                </TabsTrigger>
                <TabsTrigger value="all">
                  <Globe className="w-4 h-4 mr-2" />
                  {t("allPeers")}
                </TabsTrigger>
                <TabsTrigger value="suspended">
                  <Pause className="w-4 h-4 mr-2" />
                  {t("suspended")}
                </TabsTrigger>
                <TabsTrigger value="blacklisted">
                  <XCircle className="w-4 h-4 mr-2" />
                  {t("blacklisted")}
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