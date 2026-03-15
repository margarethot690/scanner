import { useQuery } from '@tanstack/react-query';
import { Award, Globe, Leaf, TrendingUp, Zap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchConnectedPeers, type IAllConnectedResponse } from '@/lib/api';
import type { Peer } from '@/types';

type SustainabilityStats = {
  totalNodes: number;
  greenNodes: number;
  standardNodes: number;
  greenPercentage: number;
  hostingProviders: Record<string, number>;
  countriesData: Record<string, { total: number; green: number }>;
};

export default function Sustainability() {
  const [greenStats, setGreenStats] = useState<SustainabilityStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const { data: connected } = useQuery<IAllConnectedResponse>({
    queryKey: ['peers', 'connected'],
    queryFn: () => fetchConnectedPeers(),
  });

  useEffect(() => {
    const analyzeGreenHosting = async () => {
      if (!connected?.peers?.length) {
        setLoading(false);
        return;
      }

      setLoading(true);
      let greenCount = 0;
      let totalChecked = 0;
      const hostingProviders: Record<string, number> = {};
      const countriesData: Record<string, { total: number; green: number }> = {};

      for (const peer of connected.peers as Peer[]) {
        const address = peer.address || peer.declaredAddress;
        if (!address) continue;

        try {
          const ip = address.split('/')[1]?.split(':')[0];
          if (!ip) continue;

          // Check green hosting
          const greenResponse = await fetch(
            `https://api.thegreenwebfoundation.org/api/v3/greencheck/${ip}`,
          );
          const greenData = (await greenResponse.json()) as { green?: boolean; hosted_by?: string };

          totalChecked++;
          if (greenData.green) {
            greenCount++;
            const provider = greenData.hosted_by || 'Unknown';
            hostingProviders[provider] = (hostingProviders[provider] || 0) + 1;
          }

          // Get country data
          const geoResponse = await fetch(`https://ipapi.co/${ip}/json/`);
          const geoData = (await geoResponse.json()) as { country_name?: string };
          const country = geoData.country_name || 'Unknown';

          if (!countriesData[country]) {
            countriesData[country] = { total: 0, green: 0 };
          }
          countriesData[country].total++;
          if (greenData.green) countriesData[country].green++;

          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          console.error('Failed to analyze peer:', error);
        }
      }

      const greenPercentage = totalChecked > 0 ? (greenCount / totalChecked) * 100 : 0;

      setGreenStats({
        totalNodes: totalChecked,
        greenNodes: greenCount,
        standardNodes: totalChecked - greenCount,
        greenPercentage,
        hostingProviders,
        countriesData,
      });
      setLoading(false);
    };

    analyzeGreenHosting();
  }, [connected]);

  const pieData = greenStats
    ? [
        { name: 'Green Hosting', value: greenStats.greenNodes, color: '#22c55e' },
        { name: 'Standard Hosting', value: greenStats.standardNodes, color: '#94a3b8' },
      ]
    : [];

  const topProviders = greenStats
    ? Object.entries(greenStats.hostingProviders)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    : [];

  const topGreenCountries = greenStats
    ? Object.entries(greenStats.countriesData)
        .map(([name, data]) => ({
          name,
          greenPercentage: (data.green / data.total) * 100,
          greenCount: data.green,
          total: data.total,
        }))
        .sort((a, b) => b.greenPercentage - a.greenPercentage)
        .slice(0, 5)
    : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
          <Leaf className="w-10 h-10 text-green-600" />
          Network Sustainability
        </h1>
        <p className="text-gray-600">
          Tracking renewable energy usage across DecentralChain network nodes
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Green Hosting %</p>
                <p className="text-3xl font-bold text-green-600">
                  {loading ? '...' : `${greenStats?.greenPercentage.toFixed(1)}%`}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <Leaf className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Green Nodes</p>
                <p className="text-3xl font-bold text-green-600">
                  {loading ? '...' : greenStats?.greenNodes || 0}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Analyzed</p>
                <p className="text-3xl font-bold text-gray-900">
                  {loading ? '...' : greenStats?.totalNodes || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Globe className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Leaf className="w-5 h-5 text-green-600" />
              Hosting Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Skeleton className="w-64 h-64 rounded-full" />
              </div>
            ) : (
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
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-green-600" />
              Top Green Hosting Providers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }, (_, skeletonIndex) => `skeleton-${skeletonIndex}`).map(
                  (skeletonKey) => (
                    <Skeleton key={skeletonKey} className="h-12 w-full" />
                  ),
                )}
              </div>
            ) : topProviders.length > 0 ? (
              <div className="space-y-4">
                {topProviders.map((provider, index) => (
                  <div key={provider.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-green-100 text-green-800">#{index + 1}</Badge>
                      <span className="font-medium">{provider.name}</span>
                    </div>
                    <span className="text-2xl font-bold text-green-600">{provider.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">No green providers found</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Countries Ranking */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-600" />
            Top Countries by Green Hosting Adoption
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }, (_, skeletonIndex) => `skeleton-${skeletonIndex}`).map(
                (skeletonKey) => (
                  <Skeleton key={skeletonKey} className="h-16 w-full" />
                ),
              )}
            </div>
          ) : topGreenCountries.length > 0 ? (
            <div className="space-y-6">
              {topGreenCountries.map((country, index) => (
                <div key={country.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className="bg-green-100 text-green-800">#{index + 1}</Badge>
                      <span className="font-medium">{country.name}</span>
                      <span className="text-sm text-gray-500">
                        ({country.greenCount}/{country.total} nodes)
                      </span>
                    </div>
                    <span className="text-lg font-bold text-green-600">
                      {country.greenPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <Progress value={country.greenPercentage} className="h-2" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No data available</p>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <Leaf className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-2">About Green Hosting</h3>
              <p className="text-gray-600 leading-relaxed">
                Green hosting indicates that the server infrastructure uses renewable energy sources
                or carbon offset programs. Data is verified by The Green Web Foundation, an
                independent organization tracking the environmental impact of the internet.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
