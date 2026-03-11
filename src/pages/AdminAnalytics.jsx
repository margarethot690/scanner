
import React, { useState, useMemo } from "react";
import { useAuth } from "@/lib/AuthContext";
import { auth } from "@/api/auth";
import { AssetLogoRequest, WithdrawalRequest, BlockchainConfig, BlockchainSnapshot, PageView } from "@/api/entities";
import { blockchainAPI } from "../components/utils/blockchain";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Scatter,
  ScatterChart,
  ZAxis,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  BarChart3,
  Users,
  TrendingUp,
  Activity,
  DollarSign,
  Server,
  Zap,
  Download,
  Calendar,
  ImageIcon,
  Wallet,
  Clock,
  AlertCircle,
  Database,
  Cpu,
  HardDrive,
  Network,
  GitBranch,
  Award,
  Target,
  TrendingDown,
  PieChart as PieChartIcon,
  BarChart2,
  RefreshCw,
  PlayCircle,
  Coins,
  ArrowUpDown,
  UserPlus,
  Share2,
  Sparkles, // Added Sparkles icon
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { formatAmount, timeAgo, truncate } from "../components/utils/formatters";
import { useLanguage } from "../components/contexts/LanguageContext";
import AssetLogo from "../components/shared/AssetLogo";
import AnalyticsTracker from "../components/analytics/AnalyticsTracker";

const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#ef4444", "#8b5cf6", "#ec4899"];
const CR_COIN_ASSET_ID = "G9TVbwiiUZd5WxFxoY7Tb6ZPjGGLfynJK4a3aoC59cMo";

export default function AdminAnalytics() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [timeRange, setTimeRange] = useState("30d");
  const [generatingSnapshot, setGeneratingSnapshot] = useState(false);

  // New state for AI Summary
  const [aiSummary, setAiSummary] = useState(null);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState(null);

  // Check admin access
  const { user: currentUser, isLoadingAuth: userLoading } = useAuth();

  // Fetch all users
  const { data: allUsers, isLoading: usersLoading } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () => auth.listUsers(),
    enabled: currentUser?.role === "admin",
  });

  // Fetch logo requests
  const { data: logoRequests, isLoading: logosLoading } = useQuery({
    queryKey: ["allLogoRequests"],
    queryFn: () => AssetLogoRequest.list(),
    enabled: currentUser?.role === "admin",
  });

  // Fetch withdrawal requests
  const { data: withdrawalRequests, isLoading: withdrawalsLoading } = useQuery({
    queryKey: ["allWithdrawals"],
    queryFn: () => WithdrawalRequest.list(),
    enabled: currentUser?.role === "admin",
  });

  // Fetch blockchain config
  const { data: blockchainConfigs } = useQuery({
    queryKey: ["blockchainConfig"],
    queryFn: () => BlockchainConfig.list(),
    enabled: currentUser?.role === "admin",
  });

  // Fetch blockchain snapshots
  const { data: blockchainSnapshots, isLoading: snapshotsLoading, refetch: refetchSnapshots } = useQuery({
    queryKey: ["blockchainSnapshots"],
    queryFn: () => BlockchainSnapshot.list("-snapshot_height"),
    enabled: currentUser?.role === "admin",
  });

  // Blockchain data - Fetch blocks within API limit
  const { data: height } = useQuery({
    queryKey: ["height"],
    queryFn: () => blockchainAPI.getHeight(),
    enabled: currentUser?.role === "admin",
  });

  const currentHeight = height?.height || 0;

  // Fetch last 100 blocks (API limit) for real-time analysis
  const { data: recentBlocks } = useQuery({
    queryKey: ["recentBlocks", currentHeight],
    queryFn: async () => {
      const from = Math.max(1, currentHeight - 99);
      return blockchainAPI.getBlockHeaders(from, currentHeight);
    },
    enabled: currentHeight > 0 && currentUser?.role === "admin",
  });

  const { data: connectedPeers } = useQuery({
    queryKey: ["peers", "connected"],
    queryFn: () => blockchainAPI.getConnectedPeers(),
    enabled: currentUser?.role === "admin",
  });

  const { data: allPeers } = useQuery({
    queryKey: ["peers", "all"],
    queryFn: () => blockchainAPI.getAllPeers(),
    enabled: currentUser?.role === "admin",
  });

  const { data: nodeStatus } = useQuery({
    queryKey: ["nodeStatus"],
    queryFn: () => blockchainAPI.getNodeStatus(),
    enabled: currentUser?.role === "admin",
  });

  const { data: nodeVersion } = useQuery({
    queryKey: ["nodeVersion"],
    queryFn: () => blockchainAPI.getNodeVersion(),
    enabled: currentUser?.role === "admin",
  });

  // Fetch page views for website metrics
  const { data: pageViews, isLoading: pageViewsLoading } = useQuery({
    queryKey: ["pageViews"],
    queryFn: () => PageView.list("-created_date", 1000),
    enabled: currentUser?.role === "admin",
  });

  // Calculate platform analytics
  const platformAnalytics = useMemo(() => {
    if (!allUsers) return null;

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const cutoffMap = {
      "7d": now - 7 * dayMs,
      "30d": now - 30 * dayMs,
      "90d": now - 90 * dayMs,
      "all": 0,
    };
    const cutoff = cutoffMap[timeRange];

    // User growth over time
    const usersByDay = {};
    const roleDistribution = { admin: 0, user: 0 };
    const nodeOwnerCount = allUsers.filter(u => u.node_owner).length;
    
    allUsers.forEach(user => {
      const userDate = new Date(user.created_date);
      if (userDate.getTime() >= cutoff) {
        const dayKey = userDate.toISOString().split('T')[0];
        usersByDay[dayKey] = (usersByDay[dayKey] || 0) + 1;
      }
      roleDistribution[user.role] = (roleDistribution[user.role] || 0) + 1;
    });

    // Sort and format growth data
    const growthData = Object.entries(usersByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date: new Date(date).toLocaleDateString(),
        users: count,
      }));

    // Cumulative growth
    let cumulative = 0;
    const cumulativeGrowth = growthData.map(item => {
      cumulative += item.users;
      return { ...item, total: cumulative };
    });

    // User activity (based on recent data updates)
    const recentlyActive = allUsers.filter(u => {
      const updated = new Date(u.updated_date).getTime();
      return updated >= now - 7 * dayMs;
    }).length;

    // Node owner stats
    const totalOwnershipPercentage = allUsers
      .filter(u => u.node_owner && u.node_ownership_percentage)
      .reduce((sum, u) => sum + u.node_ownership_percentage, 0);

    const totalLockedDCC = allUsers
      .filter(u => u.node_owner && u.locked_dcc_tokens)
      .reduce((sum, u) => sum + u.locked_dcc_tokens, 0);

    return {
      totalUsers: allUsers.length,
      roleDistribution,
      nodeOwnerCount,
      growthData: cumulativeGrowth,
      recentlyActive,
      totalOwnershipPercentage,
      totalLockedDCC,
      avgOwnership: nodeOwnerCount > 0 ? totalOwnershipPercentage / nodeOwnerCount : 0,
    };
  }, [allUsers, timeRange]);

  // Calculate logo request analytics
  const logoAnalytics = useMemo(() => {
    if (!logoRequests) return null;

    const statusCount = logoRequests.reduce((acc, req) => {
      acc[req.status] = (acc[req.status] || 0) + 1;
      return acc;
    }, {});

    const topRequesters = Object.entries(
      logoRequests.reduce((acc, req) => {
        acc[req.requested_by] = (acc[req.requested_by] || 0) + 1;
        return acc;
      }, {})
    )
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);

    return {
      total: logoRequests.length,
      statusCount,
      topRequesters,
      approvalRate: statusCount.approved ? 
        (statusCount.approved / logoRequests.length * 100).toFixed(1) : 0,
    };
  }, [logoRequests]);

  // Calculate withdrawal analytics
  const withdrawalAnalytics = useMemo(() => {
    if (!withdrawalRequests) return null;

    const statusCount = withdrawalRequests.reduce((acc, req) => {
      acc[req.status] = (acc[req.status] || 0) + 1;
      return acc;
    }, {});

    const totalCRC = withdrawalRequests
      .filter(r => r.status === "approved")
      .reduce((sum, r) => sum + (r.crc_amount || 0), 0);

    const totalBTC = withdrawalRequests
      .filter(r => r.status === "approved")
      .reduce((sum, r) => sum + (r.btc_amount || 0), 0);

    const totalUSD = withdrawalRequests
      .filter(r => r.status === "approved")
      .reduce((sum, r) => sum + (r.usd_equivalent || 0), 0);

    const pendingUSD = withdrawalRequests
      .filter(r => r.status === "pending")
      .reduce((sum, r) => sum + (r.usd_equivalent || 0), 0);

    return {
      total: withdrawalRequests.length,
      statusCount,
      totalCRC,
      totalBTC,
      totalUSD,
      pendingUSD,
      avgWithdrawal: withdrawalRequests.length > 0 ? 
        withdrawalRequests.reduce((sum, r) => sum + (r.usd_equivalent || 0), 0) / withdrawalRequests.length : 0,
    };
  }, [withdrawalRequests]);

  // Calculate historical blockchain analytics from snapshots
  const historicalBlockchainAnalytics = useMemo(() => {
    if (!blockchainSnapshots || blockchainSnapshots.length === 0) return null;

    // Sort snapshots by height
    const sorted = [...blockchainSnapshots].sort((a, b) => a.snapshot_height - b.snapshot_height);

    // Prepare trend data for various metrics
    const trendData = sorted.map(snapshot => ({
      height: snapshot.snapshot_height,
      date: new Date(snapshot.snapshot_timestamp).toLocaleDateString(),
      tps: snapshot.tps || 0,
      avgBlockTime: snapshot.avg_block_time || 0,
      medianBlockTime: snapshot.median_block_time || 0,
      minBlockTime: snapshot.min_block_time || 0,
      maxBlockTime: snapshot.max_block_time || 0,
      stdDeviationBlockTime: snapshot.std_deviation_block_time || 0,
      healthScore: snapshot.network_health_score || 0,
      totalTxs: snapshot.total_txs || 0,
      utilization: snapshot.network_utilization || 0,
      emptyBlocksPercentage: snapshot.empty_blocks_percentage || 0,
      emptyBlocks: snapshot.empty_blocks || 0,
      giniCoefficient: snapshot.gini_coefficient || 0,
      connectedPeers: snapshot.connected_peers || 0,
      totalKnownPeers: snapshot.total_known_peers || 0,
      // General transaction metrics
      totalVolumeNative: snapshot.total_transaction_volume_native || 0,
      avgTxSize: snapshot.avg_transaction_size_bytes || 0,
      feesPerByte: snapshot.transaction_fees_per_byte || 0,
      percentageDataTxs: snapshot.percentage_data_transactions || 0,
      percentageInvokeScriptTxs: snapshot.percentage_invoke_script_transactions || 0,
      largestTx: snapshot.largest_single_transaction_value || 0,
      txBurstiness: snapshot.transaction_burstiness || 0,
      avgTransferAmount: snapshot.avg_transfer_amount || 0,
      medianTransferAmount: snapshot.median_transfer_amount || 0,
      avgIssueFee: snapshot.avg_issue_asset_fee || 0,
      avgLeaseAmount: snapshot.avg_lease_amount || 0,
      uniqueSenders: snapshot.unique_senders || 0,
      uniqueRecipients: snapshot.unique_recipients || 0,
      uniqueActiveAddresses: snapshot.unique_active_addresses || 0,
      // Block metrics
      avgBlockSize: snapshot.avg_block_size || 0,
      maxBlockSize: snapshot.max_block_size || 0,
      totalDataProcessed: snapshot.total_data_processed || 0,
      maxTxInBlock: snapshot.max_tx_in_block || 0,
      minTxInBlock: snapshot.min_tx_in_block || 0,
      // Rewards
      totalRewards: snapshot.total_rewards || 0,
      avgReward: snapshot.avg_reward || 0,
      // Fees
      avgTransactionFee: snapshot.avg_transaction_fee || 0,
      medianTransactionFee: snapshot.median_transaction_fee || 0,
      totalFeesCollected: snapshot.total_fees_collected || 0,
      // Performance
      theoreticalMaxTps: snapshot.theoretical_max_tps || 0,
      processingTimeMs: snapshot.processing_time_ms || 0,
      // Asset activity
      newAssetsIssued: snapshot.new_assets_issued || 0,
      uniqueGenerators: snapshot.unique_generators || 0,
    }));

    // Calculate averages and trends
    const latestSnapshot = sorted[sorted.length - 1];
    const oldestSnapshot = sorted[0];

    const avgTPS = sorted.reduce((sum, s) => sum + (s.tps || 0), 0) / sorted.length;
    const avgHealthScore = sorted.reduce((sum, s) => sum + (s.network_health_score || 0), 0) / sorted.length;
    const avgBlockTime = sorted.reduce((sum, s) => sum + (s.avg_block_time || 0), 0) / sorted.length;

    // Growth rates
    const tpsGrowth = oldestSnapshot.tps > 0 ? 
      ((latestSnapshot.tps - oldestSnapshot.tps) / oldestSnapshot.tps * 100).toFixed(2) : 0;
    const healthGrowth = oldestSnapshot.network_health_score > 0 ? 
      ((latestSnapshot.network_health_score - oldestSnapshot.network_health_score) / oldestSnapshot.network_health_score * 100).toFixed(2) : 0;

    // Extract complex objects from latest snapshot
    const transactionTypeDistribution = latestSnapshot.transaction_type_distribution || {};
    const topGenerators = latestSnapshot.top_generators || [];
    const blockSizeDistribution = latestSnapshot.block_size_distribution || {};
    const blockTimeDistribution = latestSnapshot.block_time_distribution || {};
    const hourlyActivity = latestSnapshot.hourly_activity || [];
    const dailyActivity = latestSnapshot.daily_activity || [];
    const peerVersionDistribution = latestSnapshot.peer_version_distribution || [];
    const topActiveAssets = latestSnapshot.top_active_assets || [];
    const totalValueTransferredByAsset = latestSnapshot.total_value_transferred_by_asset || {};

    return {
      trendData,
      latestSnapshot,
      avgTPS,
      avgHealthScore,
      avgBlockTime,
      tpsGrowth,
      healthGrowth,
      totalSnapshots: sorted.length,
      transactionTypeDistribution,
      topGenerators,
      blockSizeDistribution,
      blockTimeDistribution,
      hourlyActivity,
      dailyActivity,
      peerVersionDistribution,
      topActiveAssets,
      totalValueTransferredByAsset,
    };
  }, [blockchainSnapshots]);

  // Calculate CR Coin analytics from snapshots
  const crCoinAnalytics = useMemo(() => {
    if (!blockchainSnapshots || blockchainSnapshots.length === 0) return null;

    const sorted = [...blockchainSnapshots].sort((a, b) => a.snapshot_height - b.snapshot_height);
    const latestSnapshot = sorted[sorted.length - 1];
    const oldestSnapshot = sorted[0];

    // Prepare trend data for CR Coin metrics
    const crcTrendData = sorted.map(snapshot => ({
      height: snapshot.snapshot_height,
      date: new Date(snapshot.snapshot_timestamp).toLocaleDateString(),
      // Price metrics
      lastPrice: snapshot.crc_last_price_dcc || 0,
      priceChange24h: snapshot.crc_24h_price_change_percent_dcc || 0,
      high24h: snapshot.crc_24h_high_price_dcc || 0,
      low24h: snapshot.crc_24h_low_price_dcc || 0,
      weightedAvgPrice: snapshot.crc_weighted_average_price_dcc || 0,
      // Volume metrics
      tradingVolume24h: snapshot.crc_24h_total_trading_volume_dcc || 0,
      quoteVolume24h: snapshot.crc_24h_total_quote_volume_dcc || 0,
      tradesCount: snapshot.crc_total_24h_trades_count || 0,
      activePairs: snapshot.crc_active_trading_pairs_count || 0,
      // Transfer metrics
      transferVolume: snapshot.crc_total_transfer_volume || 0,
      avgTransferAmount: snapshot.crc_average_transfer_amount || 0,
      medianTransferAmount: snapshot.crc_median_transfer_amount || 0,
      transferCount: snapshot.crc_transfer_count || 0,
      // Adoption metrics
      uniqueSendersCumulative: snapshot.crc_unique_senders_cumulative || 0,
      uniqueRecipientsCumulative: snapshot.crc_unique_recipients_cumulative || 0,
      newSenders: snapshot.crc_new_senders_this_period || 0,
      newRecipients: snapshot.crc_new_recipients_this_period || 0,
    }));

    // Calculate growth rates
    const priceGrowth = oldestSnapshot.crc_last_price_dcc > 0 ?
      ((latestSnapshot.crc_last_price_dcc - oldestSnapshot.crc_last_price_dcc) / oldestSnapshot.crc_last_price_dcc * 100).toFixed(2) : 0;
    
    const volumeGrowth = oldestSnapshot.crc_24h_total_trading_volume_dcc > 0 ?
      ((latestSnapshot.crc_24h_total_trading_volume_dcc - oldestSnapshot.crc_24h_total_trading_volume_dcc) / oldestSnapshot.crc_24h_total_trading_volume_dcc * 100).toFixed(2) : 0;

    const sendersGrowth = oldestSnapshot.crc_unique_senders_cumulative > 0 ?
      ((latestSnapshot.crc_unique_senders_cumulative - oldestSnapshot.crc_unique_senders_cumulative) / oldestSnapshot.crc_unique_senders_cumulative * 100).toFixed(2) : 0;

    // Calculate total new users across all snapshots in range
    const totalNewSenders = sorted.reduce((sum, s) => sum + (s.crc_new_senders_this_period || 0), 0);
    const totalNewRecipients = sorted.reduce((sum, s) => sum + (s.crc_new_recipients_this_period || 0), 0);

    return {
      crcTrendData,
      latestSnapshot,
      priceGrowth,
      volumeGrowth,
      sendersGrowth,
      totalNewSenders,
      totalNewRecipients,
    };
  }, [blockchainSnapshots]);

  // Calculate website metrics
  const websiteMetrics = useMemo(() => {
    if (!pageViews) return null;

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const cutoffMap = {
      "7d": now - 7 * dayMs,
      "30d": now - 30 * dayMs,
      "90d": now - 90 * dayMs,
      "all": 0,
    };
    const cutoff = cutoffMap[timeRange];

    // Filter by time range
    const filteredViews = pageViews.filter(v => new Date(v.created_date).getTime() >= cutoff);

    // Total page views
    const totalPageViews = filteredViews.length;

    // Unique visitors
    const uniqueVisitors = new Set(filteredViews.map(v => v.visitor_id)).size;

    // Bounce rate (sessions with only 1 page view)
    const sessionPageCounts = {};
    filteredViews.forEach(v => {
      sessionPageCounts[v.session_id] = (sessionPageCounts[v.session_id] || 0) + 1;
    });
    const bouncedSessions = Object.values(sessionPageCounts).filter(count => count === 1).length;
    const bounceRate = Object.keys(sessionPageCounts).length > 0 
      ? (bouncedSessions / Object.keys(sessionPageCounts).length * 100).toFixed(1)
      : 0;

    // Daily traffic trends
    const dailyTraffic = {};
    filteredViews.forEach(v => {
      const date = new Date(v.created_date).toISOString().split('T')[0];
      dailyTraffic[date] = (dailyTraffic[date] || 0) + 1;
    });
    const trafficTrend = Object.entries(dailyTraffic)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, views]) => ({
        date: new Date(date).toLocaleDateString(),
        views,
      }));

    // Hourly distribution
    const hourlyDist = Array(24).fill(0);
    filteredViews.forEach(v => {
      const hour = new Date(v.created_date).getHours();
      hourlyDist[hour]++;
    });
    const hourlyData = hourlyDist.map((count, hour) => ({ hour: `${hour}:00`, views: count }));

    // Top pages
    const pageCounts = {};
    filteredViews.forEach(v => {
      pageCounts[v.page_path] = (pageCounts[v.page_path] || 0) + 1;
    });
    const topPages = Object.entries(pageCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([path, count]) => ({ path, count, percentage: (count / totalPageViews * 100).toFixed(1) }));

    // Traffic sources
    const sources = {};
    filteredViews.forEach(v => {
      let source;
      try {
        source = v.referrer === "direct" ? "Direct" : (new URL(v.referrer || "https://direct").hostname);
        if (source === "direct") source = "Direct"; // Ensure consistency for "direct"
      } catch (e) {
        source = "Unknown/Invalid Referrer";
      }
      sources[source] = (sources[source] || 0) + 1;
    });
    const topSources = Object.entries(sources)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([source, count]) => ({ source, count }));

    // Device distribution
    const devices = { desktop: 0, mobile: 0, tablet: 0, unknown: 0 };
    filteredViews.forEach(v => {
      devices[v.device_type || "unknown"]++;
    });
    const deviceData = Object.entries(devices)
      .map(([type, count]) => ({ type: type.charAt(0).toUpperCase() + type.slice(1), count }))
      .filter(d => d.count > 0);

    // Browser distribution
    const browsers = {};
    filteredViews.forEach(v => {
      browsers[v.browser || "Unknown"] = (browsers[v.browser || "Unknown"] || 0) + 1;
    });
    const browserData = Object.entries(browsers)
      .sort(([, a], [, b]) => b - a)
      .map(([browser, count]) => ({ browser, count }));

    // Average time on page
    const avgTimeOnPage = filteredViews.length > 0
      ? filteredViews.reduce((sum, v) => sum + (v.time_on_page || 0), 0) / filteredViews.length
      : 0;

    return {
      totalPageViews,
      uniqueVisitors,
      bounceRate,
      trafficTrend,
      hourlyData,
      topPages,
      topSources,
      deviceData,
      browserData,
      avgTimeOnPage: avgTimeOnPage.toFixed(0),
    };
  }, [pageViews, timeRange]);

  // Generate AI Summary
  const generateAISummary = async () => {
    setGeneratingAI(true);
    setAiError(null);
    setAiSummary(null); // Clear previous summary
    
    try {
      // Collect all metrics for AI analysis
      const metricsData = {
        blockchain: {
          totalSnapshots: historicalBlockchainAnalytics?.totalSnapshots || 0,
          latestHeight: historicalBlockchainAnalytics?.latestSnapshot?.snapshot_height || 0,
          avgTPS: historicalBlockchainAnalytics?.avgTPS || 0,
          avgHealthScore: historicalBlockchainAnalytics?.avgHealthScore || 0,
          avgBlockTime: historicalBlockchainAnalytics?.avgBlockTime || 0,
          tpsGrowth: historicalBlockchainAnalytics?.tpsGrowth || 0,
          healthGrowth: historicalBlockchainAnalytics?.healthGrowth || 0,
          totalNativeVolume: historicalBlockchainAnalytics?.latestSnapshot?.total_transaction_volume_native || 0,
          uniqueActiveAddresses: historicalBlockchainAnalytics?.latestSnapshot?.unique_active_addresses || 0,
          networkUtilization: historicalBlockchainAnalytics?.latestSnapshot?.network_utilization || 0,
          connectedPeers: historicalBlockchainAnalytics?.latestSnapshot?.connected_peers || 0,
          emptyBlocksPercentage: historicalBlockchainAnalytics?.latestSnapshot?.empty_blocks_percentage || 0,
        },
        crCoin: {
          lastPrice: crCoinAnalytics?.latestSnapshot?.crc_last_price_dcc || 0,
          priceChange24h: crCoinAnalytics?.latestSnapshot?.crc_24h_price_change_percent_dcc || 0,
          tradingVolume24h: crCoinAnalytics?.latestSnapshot?.crc_24h_total_trading_volume_dcc || 0,
          tradesCount: crCoinAnalytics?.latestSnapshot?.crc_total_24h_trades_count || 0,
          uniqueSenders: crCoinAnalytics?.latestSnapshot?.crc_unique_senders_cumulative || 0,
          uniqueRecipients: crCoinAnalytics?.latestSnapshot?.crc_unique_recipients_cumulative || 0,
          priceGrowth: crCoinAnalytics?.priceGrowth || 0,
          volumeGrowth: crCoinAnalytics?.volumeGrowth || 0,
          totalNewSenders: crCoinAnalytics?.totalNewSenders || 0,
          totalNewRecipients: crCoinAnalytics?.totalNewRecipients || 0,
        },
        website: {
          totalPageViews: websiteMetrics?.totalPageViews || 0,
          uniqueVisitors: websiteMetrics?.uniqueVisitors || 0,
          bounceRate: websiteMetrics?.bounceRate || 0,
          avgTimeOnPage: websiteMetrics?.avgTimeOnPage || 0,
          topPages: websiteMetrics?.topPages?.slice(0, 3) || [],
          topSources: websiteMetrics?.topSources?.slice(0, 3) || [],
          deviceBreakdown: websiteMetrics?.deviceData || [],
        },
        platform: {
          totalUsers: platformAnalytics?.totalUsers || 0,
          recentlyActive: platformAnalytics?.recentlyActive || 0,
          nodeOwnerCount: platformAnalytics?.nodeOwnerCount || 0,
          avgOwnership: platformAnalytics?.avgOwnership || 0,
          totalLockedDCC: platformAnalytics?.totalLockedDCC || 0,
        },
        financial: {
          totalWithdrawals: withdrawalAnalytics?.total || 0,
          totalUSD: withdrawalAnalytics?.totalUSD || 0,
          pendingUSD: withdrawalAnalytics?.pendingUSD || 0,
          avgWithdrawal: withdrawalAnalytics?.avgWithdrawal || 0,
        },
        content: {
          totalLogoRequests: logoAnalytics?.total || 0,
          approvalRate: logoAnalytics?.approvalRate || 0,
          pendingRequests: logoAnalytics?.statusCount?.pending || 0,
        },
        timeRange,
      };

      console.log('Generating AI summary with metrics:', metricsData);

      const prompt = `You are an expert blockchain and business analytics consultant. Analyze the following comprehensive metrics from DecentralScan, a blockchain explorer and analytics platform for DecentralChain.

**METRICS DATA (${timeRange} period):**

**Blockchain Network:**
- Latest Block Height: ${metricsData.blockchain.latestHeight.toLocaleString()}
- Average TPS: ${metricsData.blockchain.avgTPS.toFixed(3)} (${metricsData.blockchain.tpsGrowth}% change)
- Network Health Score: ${metricsData.blockchain.avgHealthScore.toFixed(1)}% (${metricsData.blockchain.healthGrowth}% change)
- Average Block Time: ${metricsData.blockchain.avgBlockTime.toFixed(2)}s
- Network Utilization: ${metricsData.blockchain.networkUtilization.toFixed(1)}%
- Connected Peers: ${metricsData.blockchain.connectedPeers}
- Total Native Volume: ${metricsData.blockchain.totalNativeVolume.toLocaleString()} DCC
- Unique Active Addresses: ${metricsData.blockchain.uniqueActiveAddresses.toLocaleString()}
- Empty Blocks: ${metricsData.blockchain.emptyBlocksPercentage.toFixed(1)}%

**CR Coin (CRC) Trading:**
- Current Price: ${metricsData.crCoin.lastPrice.toFixed(8)} DCC
- 24h Price Change: ${metricsData.crCoin.priceChange24h.toFixed(2)}%
- 24h Trading Volume: ${metricsData.crCoin.tradingVolume24h.toLocaleString()} CRC
- 24h Trades Count: ${metricsData.crCoin.tradesCount.toLocaleString()}
- Unique Senders (Cumulative): ${metricsData.crCoin.uniqueSenders.toLocaleString()}
- Unique Recipients (Cumulative): ${metricsData.crCoin.uniqueRecipients.toLocaleString()}
- New Senders in Period: ${metricsData.crCoin.totalNewSenders}
- New Recipients in Period: ${metricsData.crCoin.totalNewRecipients}
- Price Growth: ${metricsData.crCoin.priceGrowth}%
- Volume Growth: ${metricsData.crCoin.volumeGrowth}%

**Website Analytics:**
- Total Page Views: ${metricsData.website.totalPageViews.toLocaleString()}
- Unique Visitors: ${metricsData.website.uniqueVisitors.toLocaleString()}
- Bounce Rate: ${metricsData.website.bounceRate}%
- Avg Time on Page: ${metricsData.website.avgTimeOnPage}s
- Top Pages: ${metricsData.website.topPages.map(p => p.path).join(', ')}
- Main Traffic Sources: ${metricsData.website.topSources.map(s => s.source).join(', ')}

**Platform Users:**
- Total Users: ${metricsData.platform.totalUsers.toLocaleString()}
- Recently Active: ${metricsData.platform.recentlyActive.toLocaleString()}
- Node Owners: ${metricsData.platform.nodeOwnerCount}
- Avg Node Ownership: ${metricsData.platform.avgOwnership.toFixed(1)}%
- Total Locked DCC: ${metricsData.platform.totalLockedDCC.toLocaleString()}

**Financial Activity:**
- Total Withdrawal Requests: ${metricsData.financial.totalWithdrawals}
- Total Withdrawn: $${metricsData.financial.totalUSD.toLocaleString()}
- Pending Withdrawals: $${metricsData.financial.pendingUSD.toLocaleString()}
- Avg Withdrawal: $${metricsData.financial.avgWithdrawal.toFixed(2)}

**Content Management:**
- Logo Requests: ${metricsData.content.totalLogoRequests}
- Approval Rate: ${metricsData.content.approvalRate}%
- Pending Requests: ${metricsData.content.pendingRequests}

**Generate a comprehensive executive summary with the following sections:**

1. **Overall Health Assessment** (2-3 sentences): Rate the overall platform health and provide a high-level assessment.

2. **Key Strengths** (3-4 bullet points): Identify the most positive indicators and achievements.

3. **Areas of Concern** (2-3 bullet points): Highlight any metrics that need attention or improvement.

4. **Growth Trends** (2-3 sentences): Analyze the growth trajectory across blockchain activity, trading, and user engagement.

5. **CR Coin Performance** (2-3 sentences): Specific insights about CR Coin adoption and trading activity.

6. **User Engagement** (2-3 sentences): Analysis of website traffic and platform user activity.

7. **Recommendations** (3-4 actionable bullet points): Specific, actionable recommendations based on the data.

8. **Outlook** (1-2 sentences): Brief forward-looking statement about expected trends.

Be specific with numbers, use professional business language, and provide actionable insights. Keep each section concise but impactful.`;

      setAiError("AI summary generation is not available without a backend LLM service. Consider connecting an OpenAI or similar API.");
    } catch (error) {
      console.error("Failed to generate AI summary:", error);
      setAiError(error.message);
    } finally {
      setGeneratingAI(false);
    }
  };

  // Export data function
  const exportData = (type) => {
    let data, filename;
    
    switch(type) {
      case "users":
        data = allUsers;
        filename = "users_export.json";
        break;
      case "withdrawals":
        data = withdrawalRequests;
        filename = "withdrawals_export.json";
        break;
      case "logos":
        data = logoRequests;
        filename = "logo_requests_export.json";
        break;
      case "snapshots":
        data = blockchainSnapshots;
        filename = "blockchain_snapshots_export.json";
        break;
      case "pageViews":
        data = pageViews;
        filename = "page_views_export.json";
        break;
      default:
        return;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    a.remove();
  };

  // Generate new snapshot manually
  const handleGenerateSnapshot = async () => {
    setGeneratingSnapshot(true);
    try {
      const heightData = await blockchainAPI.getHeight();
      const h = heightData.height;
      const snapshot = {
        snapshot_height: h,
        snapshot_date: new Date().toISOString(),
      };
      await BlockchainSnapshot.create(snapshot);
      alert(`Snapshot created successfully for height ${h}!`);
      refetchSnapshots();
    } catch (error) {
      alert(`Error generating snapshot: ${error.message}`);
    } finally {
      setGeneratingSnapshot(false);
    }
  };

  // Check admin access
  React.useEffect(() => {
    if (!userLoading && currentUser?.role !== "admin") {
      navigate(createPageUrl("Dashboard"));
    }
  }, [currentUser, userLoading, navigate]);

  if (userLoading || usersLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <img 
          src="https://i.imgur.com/MsLURjt.gif" 
          alt="Loading..."
          className="w-32 h-32 object-contain"
        />
      </div>
    );
  }

  if (currentUser?.role !== "admin") return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <BarChart3 className="w-10 h-10 text-blue-600" />
            Advanced Analytics Dashboard
          </h1>
          <p className="text-gray-600">
            Comprehensive platform and blockchain analytics with 75+ metrics per snapshot
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setTimeRange("7d")}>
            7 Days
          </Button>
          <Button variant="outline" size="sm" onClick={() => setTimeRange("30d")}>
            30 Days
          </Button>
          <Button variant="outline" size="sm" onClick={() => setTimeRange("90d")}>
            90 Days
          </Button>
          <Button variant="outline" size="sm" onClick={() => setTimeRange("all")}>
            All Time
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Users</p>
                <p className="text-3xl font-bold">{platformAnalytics?.totalUsers || 0}</p>
                <Badge className="mt-2" variant="secondary">
                  {platformAnalytics?.recentlyActive || 0} active this week
                </Badge>
              </div>
              <div className="p-3 bg-blue-100 rounded-xl">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Node Owners</p>
                <p className="text-3xl font-bold">{platformAnalytics?.nodeOwnerCount || 0}</p>
                <Badge className="mt-2" variant="secondary">
                  {platformAnalytics?.avgOwnership.toFixed(1)}% avg ownership
                </Badge>
              </div>
              <div className="p-3 bg-purple-100 rounded-xl">
                <Server className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Total Withdrawals</p>
                <p className="text-3xl font-bold">${withdrawalAnalytics?.totalUSD.toFixed(0) || 0}</p>
                <Badge className="mt-2" variant="secondary">
                  ${withdrawalAnalytics?.pendingUSD.toFixed(0) || 0} pending
                </Badge>
              </div>
              <div className="p-3 bg-green-100 rounded-xl">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">Blockchain Snapshots</p>
                <p className="text-3xl font-bold">{blockchainSnapshots?.length || 0}</p>
                <Badge className="mt-2" variant="secondary">
                  {historicalBlockchainAnalytics?.avgHealthScore.toFixed(0) || 0} % avg health
                </Badge>
              </div>
              <div className="p-3 bg-orange-100 rounded-xl">
                <Database className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Analytics */}
      <Tabs defaultValue="blockchain" className="space-y-6">
        <TabsList className="grid w-full grid-cols-7"> {/* Adjusted grid-cols to 7 */}
          <TabsTrigger value="blockchain">
            <Activity className="w-4 h-4 mr-2" />
            Blockchain
          </TabsTrigger>
          <TabsTrigger value="crcoin">
            <Coins className="w-4 h-4 mr-2" />
            CR Coin
          </TabsTrigger>
          <TabsTrigger value="website">
            <BarChart3 className="w-4 h-4 mr-2" />
            Website
          </TabsTrigger>
          <TabsTrigger value="ai-summary"> {/* New AI Summary Tab Trigger */}
            <Sparkles className="w-4 h-4 mr-2" />
            AI Summary
          </TabsTrigger>
          <TabsTrigger value="platform">
            <Users className="w-4 h-4 mr-2" />
            Platform
          </TabsTrigger>
          <TabsTrigger value="financial">
            <DollarSign className="w-4 h-4 mr-2" />
            Financial
          </TabsTrigger>
          <TabsTrigger value="content">
            <ImageIcon className="w-4 h-4 mr-2" />
            Content
          </TabsTrigger>
        </TabsList>

        {/* Blockchain Analytics Tab */}
        <TabsContent value="blockchain" className="space-y-6">
          {/* Snapshot Control */}
          <Card className="border-none shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Blockchain Snapshots</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  {blockchainSnapshots?.length || 0} snapshots recorded • Latest: Height {historicalBlockchainAnalytics?.latestSnapshot?.snapshot_height.toLocaleString() || "N/A"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={handleGenerateSnapshot} 
                  disabled={generatingSnapshot}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {generatingSnapshot ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-4 h-4 mr-2" />
                      Generate Snapshot
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => exportData("snapshots")}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export All
                </Button>
              </div>
            </CardHeader>
          </Card>

          {snapshotsLoading || !historicalBlockchainAnalytics ? (
            <div className="flex items-center justify-center py-16">
              <img 
                src="https://i.imgur.com/MsLURjt.gif" 
                alt="Loading..."
                className="w-32 h-32 object-contain"
              />
            </div>
          ) : (
            <>
              {/* Network Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-none shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Average TPS</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-blue-600">
                      {historicalBlockchainAnalytics.avgTPS.toFixed(3)}
                    </p>
                    <Badge variant={parseFloat(historicalBlockchainAnalytics.tpsGrowth) >= 0 ? "default" : "destructive"} className="mt-2">
                      {historicalBlockchainAnalytics.tpsGrowth}% {parseFloat(historicalBlockchainAnalytics.tpsGrowth) >= 0 ? "↑" : "↓"}
                    </Badge>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Average Health Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-green-600">
                      {historicalBlockchainAnalytics.avgHealthScore.toFixed(0)}%
                    </p>
                    <Badge variant={parseFloat(historicalBlockchainAnalytics.healthGrowth) >= 0 ? "default" : "destructive"} className="mt-2">
                      {historicalBlockchainAnalytics.healthGrowth}% {parseFloat(historicalBlockchainAnalytics.healthGrowth) >= 0 ? "↑" : "↓"}
                    </Badge>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Total Native Volume</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-purple-600">
                      {historicalBlockchainAnalytics.latestSnapshot.total_transaction_volume_native?.toLocaleString() || 0}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">DCC tokens</p>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Unique Addresses</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-orange-600">
                      {historicalBlockchainAnalytics.latestSnapshot.unique_active_addresses?.toLocaleString() || 0}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">Latest period</p>
                  </CardContent>
                </Card>
              </div>

              {/* Block Time Analysis - NEW EXPANDED METRICS */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Block Time Analysis (Detailed)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Average</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {historicalBlockchainAnalytics.latestSnapshot.avg_block_time?.toFixed(2) || 0}s
                      </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Median</p>
                      <p className="text-2xl font-bold text-green-600">
                        {historicalBlockchainAnalytics.latestSnapshot.median_block_time?.toFixed(2) || 0}s
                      </p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Minimum</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {historicalBlockchainAnalytics.latestSnapshot.min_block_time?.toFixed(2) || 0}s
                      </p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Maximum</p>
                      <p className="text-2xl font-bold text-red-600">
                        {historicalBlockchainAnalytics.latestSnapshot.max_block_time?.toFixed(2) || 0}s
                      </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Std Deviation</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {historicalBlockchainAnalytics.latestSnapshot.std_deviation_block_time?.toFixed(2) || 0}s
                      </p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={historicalBlockchainAnalytics.trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="avgBlockTime" stroke="#3b82f6" strokeWidth={2} name="Average" />
                      <Line type="monotone" dataKey="medianBlockTime" stroke="#10b981" strokeWidth={2} name="Median" />
                      <Line type="monotone" dataKey="minBlockTime" stroke="#f59e0b" strokeWidth={1} strokeDasharray="5 5" name="Min" />
                      <Line type="monotone" dataKey="maxBlockTime" stroke="#ef4444" strokeWidth={1} strokeDasharray="5 5" name="Max" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Block Time Distribution - NEW */}
              {Object.keys(historicalBlockchainAnalytics.blockTimeDistribution).length > 0 && (
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle>Block Time Distribution (Latest Snapshot)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={Object.entries(historicalBlockchainAnalytics.blockTimeDistribution).map(([range, count]) => ({
                        range,
                        count
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3b82f6" name="Blocks" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Transaction Metrics Cards - EXISTING - I'll keep this section as is, it's fine */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-none shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Avg Transaction Size</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-blue-600">
                      {historicalBlockchainAnalytics.latestSnapshot.avg_transaction_size_bytes?.toFixed(0) || 0}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">bytes</p>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Fees Per Byte</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-green-600">
                      {historicalBlockchainAnalytics.latestSnapshot.transaction_fees_per_byte?.toFixed(6) || 0}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">DCC/byte</p>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Largest Transaction</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-purple-600">
                      {historicalBlockchainAnalytics.latestSnapshot.largest_single_transaction_value?.toLocaleString() || 0}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">DCC tokens</p>
                  </CardContent>
                </Card>
              </div>

              {/* Block Size Analysis - NEW */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Block Size Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Average Block Size</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {(historicalBlockchainAnalytics.latestSnapshot.avg_block_size || 0).toLocaleString()} bytes
                      </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Maximum Block Size</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {(historicalBlockchainAnalytics.latestSnapshot.max_block_size || 0).toLocaleString()} bytes
                      </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Total Data Processed</p>
                      <p className="text-2xl font-bold text-green-600">
                        {(historicalBlockchainAnalytics.latestSnapshot.total_data_processed || 0).toLocaleString()} bytes
                      </p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={historicalBlockchainAnalytics.trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="avgBlockSize" stroke="#3b82f6" strokeWidth={2} name="Avg Block Size" />
                      <Line type="monotone" dataKey="maxBlockSize" stroke="#8b5cf6" strokeWidth={2} name="Max Block Size" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Block Size Distribution - NEW */}
              {Object.keys(historicalBlockchainAnalytics.blockSizeDistribution).length > 0 && (
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle>Block Size Distribution (Latest Snapshot)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={Object.entries(historicalBlockchainAnalytics.blockSizeDistribution).map(([range, count]) => ({
                        range,
                        count
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8b5cf6" name="Blocks" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Transaction Count Analysis - NEW */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Transaction Count per Block Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Max Tx in Block</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {historicalBlockchainAnalytics.latestSnapshot.max_tx_in_block || 0}
                      </p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Min Tx in Block</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {historicalBlockchainAnalytics.latestSnapshot.min_tx_in_block || 0}
                      </p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Empty Blocks</p>
                      <p className="text-2xl font-bold text-red-600">
                        {historicalBlockchainAnalytics.latestSnapshot.empty_blocks || 0}
                      </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Empty Blocks %</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {(historicalBlockchainAnalytics.latestSnapshot.empty_blocks_percentage || 0).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={historicalBlockchainAnalytics.trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="emptyBlocks" fill="#ef4444" name="Empty Blocks" />
                      <Line type="monotone" dataKey="maxTxInBlock" stroke="#3b82f6" strokeWidth={2} name="Max Tx in Block" />
                      <Line type="monotone" dataKey="minTxInBlock" stroke="#f59e0b" strokeWidth={2} name="Min Tx in Block" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Transaction Fees Analysis - NEW */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Transaction Fees Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Average Transaction Fee</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {(historicalBlockchainAnalytics.latestSnapshot.avg_transaction_fee || 0).toFixed(4)} DCC
                      </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Median Transaction Fee</p>
                      <p className="text-2xl font-bold text-green-600">
                        {(historicalBlockchainAnalytics.latestSnapshot.median_transaction_fee || 0).toFixed(4)} DCC
                      </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Total Fees Collected</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {(historicalBlockchainAnalytics.latestSnapshot.total_fees_collected || 0).toLocaleString()} DCC
                      </p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={historicalBlockchainAnalytics.trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="avgTransactionFee" stroke="#3b82f6" strokeWidth={2} name="Avg Fee" />
                      <Line type="monotone" dataKey="medianTransactionFee" stroke="#10b981" strokeWidth={2} name="Median Fee" />
                      <Line type="monotone" dataKey="totalFeesCollected" stroke="#8b5cf6" strokeWidth={2} name="Total Fees" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Rewards Analysis - NEW */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Block Rewards Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Total Rewards Distributed</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {(historicalBlockchainAnalytics.latestSnapshot.total_rewards || 0).toLocaleString()} DCC
                      </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Average Reward per Block</p>
                      <p className="text-2xl font-bold text-green-600">
                        {(historicalBlockchainAnalytics.latestSnapshot.avg_reward || 0).toFixed(2)} DCC
                      </p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={historicalBlockchainAnalytics.trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="totalRewards" stroke="#3b82f6" strokeWidth={2} name="Total Rewards" />
                      <Line type="monotone" dataKey="avgReward" stroke="#10b981" strokeWidth={2} name="Avg Reward" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Transaction Type Distribution - NEW */}
              {Object.keys(historicalBlockchainAnalytics.transactionTypeDistribution).length > 0 && (
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle>Transaction Type Distribution (Latest Snapshot)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={Object.entries(historicalBlockchainAnalytics.transactionTypeDistribution).map(([type, data]) => ({
                              name: `Type ${type}`,
                              value: data.count || 0
                            }))}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {Object.keys(historicalBlockchainAnalytics.transactionTypeDistribution).map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2">
                        <h4 className="font-semibold mb-3">Transaction Type Details:</h4>
                        {Object.entries(historicalBlockchainAnalytics.transactionTypeDistribution).map(([type, data]) => (
                          <div key={type} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="text-sm">Type {type}</span>
                            <div className="text-right">
                              <p className="font-semibold">{data.count || 0} txs</p>
                              <p className="text-xs text-gray-500">{(data.total_fees || 0).toFixed(2)} DCC fees</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Performance Metrics - NEW */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Network Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Theoretical Max TPS</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {(historicalBlockchainAnalytics.latestSnapshot.theoretical_max_tps || 0).toFixed(2)}
                      </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Network Utilization</p>
                      <p className="text-2xl font-bold text-green-600">
                        {(historicalBlockchainAnalytics.latestSnapshot.network_utilization || 0).toFixed(1)}%
                      </p>
                      <Progress value={historicalBlockchainAnalytics.latestSnapshot.network_utilization || 0} className="mt-2" />
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Snapshot Processing Time</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {(historicalBlockchainAnalytics.latestSnapshot.processing_time_ms || 0).toLocaleString()} ms
                      </p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={historicalBlockchainAnalytics.trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="theoreticalMaxTps" stroke="#3b82f6" strokeWidth={2} name="Max TPS" />
                      <Line type="monotone" dataKey="utilization" stroke="#10b981" strokeWidth={2} name="Utilization %" />
                      <Line type="monotone" dataKey="processingTimeMs" stroke="#8b5cf6" strokeWidth={2} name="Processing Time (ms)" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Top Block Generators - NEW */}
              {historicalBlockchainAnalytics.topGenerators.length > 0 && (
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle>Top Block Generators (Latest Snapshot)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {historicalBlockchainAnalytics.topGenerators.slice(0, 10).map((generator, index) => (
                        <div key={generator.address} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <code className="text-sm font-mono">{truncate(generator.address, 12)}</code>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{generator.blocks_generated} blocks</p>
                            <p className="text-xs text-gray-500">{(generator.percentage || 0).toFixed(2)}% of total</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Peer Network Analysis - NEW */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Peer Network Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Connected Peers</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {historicalBlockchainAnalytics.latestSnapshot.connected_peers || 0}
                      </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Total Known Peers</p>
                      <p className="text-2xl font-bold text-green-600">
                        {historicalBlockchainAnalytics.latestSnapshot.total_known_peers || 0}
                      </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Unique Generators</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {historicalBlockchainAnalytics.latestSnapshot.unique_generators || 0}
                      </p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={historicalBlockchainAnalytics.trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="connectedPeers" stroke="#3b82f6" strokeWidth={2} name="Connected Peers" />
                      <Line type="monotone" dataKey="totalKnownPeers" stroke="#10b981" strokeWidth={2} name="Total Known Peers" />
                      <Line type="monotone" dataKey="uniqueGenerators" stroke="#8b5cf6" strokeWidth={2} name="Unique Generators" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Peer Version Distribution - NEW */}
              {historicalBlockchainAnalytics.peerVersionDistribution.length > 0 && (
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle>Peer Version Distribution (Latest Snapshot)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={historicalBlockchainAnalytics.peerVersionDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="version" tick={{ fontSize: 11 }} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3b82f6" name="Peers" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Asset Activity - NEW */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Asset Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">New Assets Issued</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {historicalBlockchainAnalytics.latestSnapshot.new_assets_issued || 0}
                      </p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">Active Assets (Latest)</p>
                      <p className="text-2xl font-bold text-green-600">
                        {historicalBlockchainAnalytics.topActiveAssets.length}
                      </p>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={historicalBlockchainAnalytics.trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="newAssetsIssued" fill="#3b82f6" name="New Assets Issued" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Top Active Assets - NEW */}
              {historicalBlockchainAnalytics.topActiveAssets.length > 0 && (
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle>Top Active Assets by Volume (Latest Snapshot)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {historicalBlockchainAnalytics.topActiveAssets.slice(0, 10).map((asset, index) => (
                        <div key={asset.assetId || index} className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold">
                              {index + 1}
                            </div>
                            <AssetLogo assetId={asset.assetId} size="sm" />
                            <div>
                              <p className="font-medium text-sm">{asset.assetName || truncate(asset.assetId, 8)}</p>
                              <code className="text-xs text-gray-500">{truncate(asset.assetId, 12)}</code>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{asset.transactionCount} txs</p>
                            <p className="text-xs text-gray-500">{formatAmount(asset.totalVolume, 8)} transferred</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Hourly Activity - NEW */}
              {historicalBlockchainAnalytics.hourlyActivity.length > 0 && (
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle>Hourly Activity Pattern (Latest Snapshot)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={historicalBlockchainAnalytics.hourlyActivity}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="transactions" fill="#3b82f6" name="Transactions" />
                        <Bar dataKey="blocks" fill="#10b981" name="Blocks" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Daily Activity - NEW */}
              {historicalBlockchainAnalytics.dailyActivity.length > 0 && (
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle>Daily Activity Pattern (Latest Snapshot)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={historicalBlockchainAnalytics.dailyActivity}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="transactions" fill="#3b82f6" name="Transactions" />
                        <Bar dataKey="blocks" fill="#10b981" name="Blocks" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
              
              {/* Transaction Volume Trend */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Native Token Transaction Volume Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={historicalBlockchainAnalytics.trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="totalVolumeNative" 
                        stroke="#8b5cf6" 
                        fill="#8b5cf6"
                        fillOpacity={0.6}
                        name="Native Volume (DCC)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Transaction Size and Fee Trends */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Transaction Efficiency Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={historicalBlockchainAnalytics.trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="avgTxSize" 
                        stroke="#3b82f6" 
                        name="Avg Tx Size (bytes)"
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="feesPerByte" 
                        stroke="#10b981" 
                        name="Fees per Byte"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Smart Contract and Data Usage */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Smart Contract & Data Transaction Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={historicalBlockchainAnalytics.trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="percentageInvokeScriptTxs" 
                        stackId="1"
                        stroke="#f59e0b" 
                        fill="#f59e0b"
                        fillOpacity={0.8}
                        name="Invoke Script Txs (%)"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="percentageDataTxs" 
                        stackId="1"
                        stroke="#06b6d4" 
                        fill="#06b6d4"
                        fillOpacity={0.8}
                        name="Data Txs (%)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* User Activity Trends */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Network Participation Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={historicalBlockchainAnalytics.trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="uniqueActiveAddresses" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        name="Unique Active Addresses"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="uniqueSenders" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        name="Unique Senders"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="uniqueRecipients" 
                        stroke="#8b5cf6" 
                        strokeWidth={2}
                        name="Unique Recipients"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Transfer and Lease Metrics */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Transfer & Lease Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={historicalBlockchainAnalytics.trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="avgTransferAmount" fill="#3b82f6" name="Avg Transfer Amount" />
                      <Line 
                        type="monotone" 
                        dataKey="medianTransferAmount" 
                        stroke="#ec4899" 
                        strokeWidth={2}
                        name="Median Transfer Amount"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="avgLeaseAmount" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        name="Avg Lease Amount"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Transaction Burstiness */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Transaction Burstiness (Network Stability)</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    Lower values indicate more consistent transaction flow
                  </p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={historicalBlockchainAnalytics.trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="txBurstiness" 
                        stroke="#ef4444" 
                        strokeWidth={2}
                        name="Transaction Burstiness"
                        dot={{ fill: '#ef4444', r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* TPS & Health Score Trends */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Network TPS Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={historicalBlockchainAnalytics.trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="tps" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        name="TPS"
                        dot={{ fill: '#3b82f6', r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Health Score Trend */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Network Health Score Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={historicalBlockchainAnalytics.trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="healthScore" 
                        stroke="#10b981" 
                        fill="#10b981"
                        fillOpacity={0.6}
                        name="Health Score"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Decentralization Metrics */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Decentralization: Gini Coefficient Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={historicalBlockchainAnalytics.trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 1]} />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="giniCoefficient" 
                        stroke="#ec4899" 
                        strokeWidth={2}
                        name="Gini Coefficient (Lower = More Decentralized)"
                        dot={{ fill: '#ec4899', r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <p className="text-sm text-gray-500 mt-4">
                    A lower Gini coefficient indicates more even distribution of block generation among validators.
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* CR Coin Analytics Tab */}
        <TabsContent value="crcoin" className="space-y-6">
          {snapshotsLoading || !crCoinAnalytics ? (
            <div className="flex items-center justify-center py-16">
              <img 
                src="https://i.imgur.com/MsLURjt.gif" 
                alt="Loading..."
                className="w-32 h-32 object-contain"
              />
            </div>
          ) : (
            <>
              {/* CR Coin Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-2">
                      <AssetLogo assetId={CR_COIN_ASSET_ID} size="sm" />
                      <Badge variant={parseFloat(crCoinAnalytics.latestSnapshot.crc_24h_price_change_percent_dcc) >= 0 ? "default" : "destructive"}>
                        {crCoinAnalytics.latestSnapshot.crc_24h_price_change_percent_dcc?.toFixed(2) || 0}%
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">CRC Price (DCC)</p>
                    <p className="text-3xl font-bold text-blue-700">
                      {crCoinAnalytics.latestSnapshot.crc_last_price_dcc?.toFixed(8) || 0}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">24h Trading Volume</p>
                        <p className="text-3xl font-bold">{crCoinAnalytics.latestSnapshot.crc_24h_total_trading_volume_dcc?.toLocaleString() || 0}</p>
                        <p className="text-sm text-gray-500 mt-1">DCC</p>
                      </div>
                      <div className="p-3 bg-green-100 rounded-xl">
                        <ArrowUpDown className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Unique Senders (Total)</p>
                        <p className="text-3xl font-bold">{crCoinAnalytics.latestSnapshot.crc_unique_senders_cumulative?.toLocaleString() || 0}</p>
                        <Badge className="mt-2" variant="secondary">
                          +{crCoinAnalytics.totalNewSenders} in range
                        </Badge>
                      </div>
                      <div className="p-3 bg-purple-100 rounded-xl">
                        <UserPlus className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Unique Recipients (Total)</p>
                        <p className="text-3xl font-bold">{crCoinAnalytics.latestSnapshot.crc_unique_recipients_cumulative?.toLocaleString() || 0}</p>
                        <Badge className="mt-2" variant="secondary">
                          +{crCoinAnalytics.totalNewRecipients} in range
                        </Badge>
                      </div>
                      <div className="p-3 bg-orange-100 rounded-xl">
                        <Share2 className="w-6 h-6 text-orange-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Price Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-none shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">24h High</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-green-600">
                      {crCoinAnalytics.latestSnapshot.crc_24h_high_price_dcc?.toFixed(8) || 0}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">DCC</p>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">24h Low</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-red-600">
                      {crCoinAnalytics.latestSnapshot.crc_24h_low_price_dcc?.toFixed(8) || 0}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">DCC</p>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Weighted Avg Price</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-blue-600">
                      {crCoinAnalytics.latestSnapshot.crc_weighted_average_price_dcc?.toFixed(8) || 0}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">DCC (24h)</p>
                  </CardContent>
                </Card>
              </div>

              {/* CR Coin Price Trend */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>CR Coin Price Trend (vs DCC)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={crCoinAnalytics.crcTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="lastPrice" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        name="Last Price (DCC)"
                        dot={{ fill: '#3b82f6', r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="weightedAvgPrice" 
                        stroke="#8b5cf6" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="Weighted Avg Price"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Price Range Visualization */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>24h Price Range Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={crCoinAnalytics.crcTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="high24h" 
                        stroke="#10b981" 
                        fill="#10b981"
                        fillOpacity={0.3}
                        name="24h High"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="low24h" 
                        stroke="#ef4444" 
                        fill="#ef4444"
                        fillOpacity={0.3}
                        name="24h Low"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Trading Volume Metrics */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Trading Volume Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={crCoinAnalytics.crcTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="tradingVolume24h" fill="#3b82f6" name="Trading Volume (DCC)" />
                      <Line 
                        type="monotone" 
                        dataKey="tradesCount" 
                        stroke="#ec4899" 
                        strokeWidth={2}
                        name="Number of Trades"
                        yAxisId="right"
                      />
                      <YAxis yAxisId="right" orientation="right" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Active Trading Pairs */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Active Trading Pairs Count</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={crCoinAnalytics.crcTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="activePairs" fill="#10b981" name="Active Pairs" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Transfer Activity */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>CR Coin Transfer Volume & Count</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={crCoinAnalytics.crcTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="transferVolume" fill="#8b5cf6" name="Transfer Volume" />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="transferCount" 
                        stroke="#f59e0b" 
                        strokeWidth={2}
                        name="Transfer Count"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Transfer Amounts Analysis */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Average vs Median Transfer Amount</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={crCoinAnalytics.crcTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="avgTransferAmount" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        name="Average Transfer Amount"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="medianTransferAmount" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        name="Median Transfer Amount"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <p className="text-sm text-gray-500 mt-4">
                    When average is significantly higher than median, it indicates large transfers are skewing the average.
                  </p>
                </CardContent>
              </Card>

              {/* User Growth - Cumulative */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Cumulative Unique Users Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={crCoinAnalytics.crcTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="uniqueSendersCumulative" 
                        stroke="#3b82f6" 
                        fill="#3b82f6"
                        fillOpacity={0.6}
                        name="Cumulative Unique Senders"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="uniqueRecipientsCumulative" 
                        stroke="#10b981" 
                        fill="#10b981"
                        fillOpacity={0.6}
                        name="Cumulative Unique Recipients"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* New Users Per Period */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>New Users Per Snapshot Period</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={crCoinAnalytics.crcTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="newSenders" fill="#8b5cf6" name="New Senders" />
                      <Bar dataKey="newRecipients" fill="#ec4899" name="New Recipients" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Growth Summary */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>CR Coin Growth Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">Price Growth</p>
                      <p className="text-3xl font-bold text-blue-600">
                        {crCoinAnalytics.priceGrowth}%
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Over selected period</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">Volume Growth</p>
                      <p className="text-3xl font-bold text-green-600">
                        {crCoinAnalytics.volumeGrowth}%
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Trading volume change</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm text-gray-600 mb-2">User Base Growth</p>
                      <p className="text-3xl font-bold text-purple-600">
                        {crCoinAnalytics.sendersGrowth}%
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Cumulative senders</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Website Metrics Tab */}
        <TabsContent value="website" className="space-y-6">
          {pageViewsLoading || !websiteMetrics ? (
            <div className="flex items-center justify-center py-16">
              <img 
                src="https://i.imgur.com/MsLURjt.gif" 
                alt="Loading..."
                className="w-32 h-32 object-contain"
              />
            </div>
          ) : (
            <>
              {/* Real-time Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-none shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Total Page Views</p>
                        <p className="text-3xl font-bold">{websiteMetrics.totalPageViews.toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-blue-100 rounded-xl">
                        <Activity className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Unique Visitors</p>
                        <p className="text-3xl font-bold">{websiteMetrics.uniqueVisitors.toLocaleString()}</p>
                      </div>
                      <div className="p-3 bg-purple-100 rounded-xl">
                        <Users className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Bounce Rate</p>
                        <p className="text-3xl font-bold">{websiteMetrics.bounceRate}%</p>
                      </div>
                      <div className="p-3 bg-orange-100 rounded-xl">
                        <TrendingDown className="w-6 h-6 text-orange-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Avg. Time on Page</p>
                        <p className="text-3xl font-bold">{websiteMetrics.avgTimeOnPage}s</p>
                      </div>
                      <div className="p-3 bg-green-100 rounded-xl">
                        <Clock className="w-6 h-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Daily Traffic Trend */}
              <Card className="border-none shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Daily Traffic Trend</CardTitle>
                  <Button size="sm" variant="outline" onClick={() => exportData("pageViews")}>
                    <Download className="w-4 h-4 mr-2" />
                    Export Page Views
                  </Button>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={websiteMetrics.trafficTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="views" 
                        stroke="#3b82f6" 
                        fill="#3b82f6"
                        fillOpacity={0.6}
                        name="Page Views"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Hourly Distribution */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Hourly Traffic Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={websiteMetrics.hourlyData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="views" fill="#8b5cf6" name="Page Views" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Top Pages */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Top Pages</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {websiteMetrics.topPages.map((page, index) => (
                      <div key={page.path} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                            <code className="text-sm text-blue-600">{page.path}</code>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">{page.count} views</p>
                            <p className="text-xs text-gray-500">{page.percentage}%</p>
                          </div>
                        </div>
                        <Progress value={parseFloat(page.percentage)} className="h-2" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Traffic Sources & Devices */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle>Traffic Sources</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={websiteMetrics.topSources}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ source, percent }) => `${source}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {websiteMetrics.topSources.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle>Device Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={websiteMetrics.deviceData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ type, percent }) => `${type}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {websiteMetrics.deviceData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Browser Statistics */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle>Browser Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={websiteMetrics.browserData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="browser" type="category" width={100} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#10b981" name="Users" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* AI Summary Tab */}
        <TabsContent value="ai-summary" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                  AI-Generated Executive Summary
                </CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Comprehensive analysis of all platform metrics using advanced AI
                </p>
              </div>
              <Button
                onClick={generateAISummary}
                disabled={generatingAI || !historicalBlockchainAnalytics || !crCoinAnalytics || !websiteMetrics || !platformAnalytics || !withdrawalAnalytics || !logoAnalytics}
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {generatingAI ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    {aiSummary ? "Regenerate Summary" : "Generate Summary"}
                  </>
                )}
              </Button>
            </CardHeader>
          </Card>

          {aiError && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-900">Error Generating Summary</p>
                    <p className="text-sm text-red-700 mt-1">{aiError}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!aiSummary && !generatingAI && !aiError && (
            <Card className="border-none shadow-lg">
              <CardContent className="p-12 text-center">
                <Sparkles className="w-16 h-16 mx-auto mb-4 text-purple-400" />
                <h3 className="text-xl font-semibold mb-2">No Summary Generated Yet</h3>
                <p className="text-gray-500 mb-6">
                  Click "Generate Summary" to get an AI-powered analysis of all your metrics
                </p>
              </CardContent>
            </Card>
          )}

          {generatingAI && (
            <Card className="border-none shadow-lg">
              <CardContent className="p-12 text-center">
                <div className="flex flex-col items-center">
                  <RefreshCw className="w-16 h-16 text-purple-600 animate-spin mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Analyzing Your Data...</h3>
                  <p className="text-gray-500">
                    Our AI is processing {platformAnalytics?.totalUsers || 0} users, {
                      historicalBlockchainAnalytics?.totalSnapshots || 0
                    } blockchain snapshots, and {websiteMetrics?.totalPageViews || 0} page views...
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {aiSummary && !generatingAI && (
            <div className="space-y-6">
              {/* Overall Health */}
              <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-purple-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    Overall Health Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed">{aiSummary.overall_health}</p>
                </CardContent>
              </Card>

              {/* Key Strengths & Concerns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-700">
                      <TrendingUp className="w-5 h-5" />
                      Key Strengths
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {aiSummary.key_strengths?.map((strength, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-green-700 text-sm font-semibold">{index + 1}</span>
                          </div>
                          <p className="text-gray-700">{strength}</p>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-700">
                      <AlertCircle className="w-5 h-5" />
                      Areas of Concern
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {aiSummary.areas_of_concern?.map((concern, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <span className="text-orange-700 text-sm font-semibold">!</span>
                          </div>
                          <p className="text-gray-700">{concern}</p>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Growth & Performance */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-base">Growth Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 text-sm leading-relaxed">{aiSummary.growth_trends}</p>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Coins className="w-4 h-4" />
                      CR Coin Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 text-sm leading-relaxed">{aiSummary.cr_coin_performance}</p>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-base">User Engagement</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 text-sm leading-relaxed">{aiSummary.user_engagement}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Recommendations */}
              <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-purple-700">
                    <Target className="w-5 h-5" />
                    Strategic Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4">
                    {aiSummary.recommendations?.map((rec, index) => (
                      <li key={index} className="flex items-start gap-3 p-3 bg-white rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-sm font-bold">{index + 1}</span>
                        </div>
                        <p className="text-gray-700 pt-1">{rec}</p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Outlook */}
              <Card className="border-none shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-blue-600" />
                    Future Outlook
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed italic">{aiSummary.outlook}</p>
                </CardContent>
              </Card>

              {/* Metadata */}
              <Card className="border-none shadow-sm bg-gray-50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Generated at: {new Date().toLocaleString()}</span>
                    <span>Time Range: {timeRange}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Platform Analytics Tab */}
        <TabsContent value="platform" className="space-y-6">
          {/* User Growth Chart */}
          <Card className="border-none shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>User Growth Over Time</CardTitle>
              <Button size="sm" variant="outline" onClick={() => exportData("users")}>
                <Download className="w-4 h-4 mr-2" />
                Export Users
              </Button>
            </CardHeader>
            <CardContent>
              {platformAnalytics?.growthData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={platformAnalytics.growthData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="total" 
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      fillOpacity={0.6}
                      name="Total Users"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray-500 py-8">No growth data available for selected time range</p>
              )}
            </CardContent>
          </Card>

          {/* User Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Role Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Admins", value: platformAnalytics?.roleDistribution.admin || 0 },
                        { name: "Users", value: platformAnalytics?.roleDistribution.user || 0 },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      <Cell fill="#3b82f6" />
                      <Cell fill="#8b5cf6" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Node Owner Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Total Node Owners</p>
                    <p className="text-2xl font-bold">{platformAnalytics?.nodeOwnerCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Ownership</p>
                    <p className="text-2xl font-bold">{platformAnalytics?.totalOwnershipPercentage.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Locked DCC</p>
                    <p className="text-2xl font-bold">{platformAnalytics?.totalLockedDCC.toLocaleString()} DCC</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Average Ownership per Node</p>
                    <p className="text-2xl font-bold">{platformAnalytics?.avgOwnership.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Financial Analytics Tab */}
        <TabsContent value="financial" className="space-y-6">
          {/* Withdrawal Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none shadow-lg">
              <CardContent className="p-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Approved (CRC)</p>
                  <p className="text-3xl font-bold">{withdrawalAnalytics?.totalCRC.toFixed(2) || 0}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardContent className="p-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Approved (BTC)</p>
                  <p className="text-3xl font-bold">{withdrawalAnalytics?.totalBTC.toFixed(8) || 0}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardContent className="p-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Average Withdrawal</p>
                  <p className="text-3xl font-bold">${withdrawalAnalytics?.avgWithdrawal.toFixed(2) || 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Withdrawal Status Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Withdrawal Status Distribution</CardTitle>
                <Button size="sm" variant="outline" onClick={() => exportData("withdrawals")}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={Object.entries(withdrawalAnalytics?.statusCount || {}).map(([status, count]) => ({
                        name: status.charAt(0).toUpperCase() + status.slice(1),
                        value: count,
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.keys(withdrawalAnalytics?.statusCount || {}).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Withdrawal Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Total Requests</p>
                    <p className="text-2xl font-bold">{withdrawalAnalytics?.total || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Pending Value (USD)</p>
                    <p className="text-2xl font-bold text-orange-600">
                      ${withdrawalAnalytics?.pendingUSD.toFixed(2) || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Approved Value (USD)</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${withdrawalAnalytics?.totalUSD.toFixed(2) || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Content Analytics Tab */}
        <TabsContent value="content" className="space-y-6">
          {/* Logo Request Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-none shadow-lg">
              <CardContent className="p-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Total Requests</p>
                  <p className="text-3xl font-bold">{logoAnalytics?.total || 0}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardContent className="p-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Approval Rate</p>
                  <p className="text-3xl font-bold">{logoAnalytics?.approvalRate || 0}%</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardContent className="p-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Pending</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {logoAnalytics?.statusCount.pending || 0}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardContent className="p-6">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Approved</p>
                  <p className="text-3xl font-bold text-green-600">
                    {logoAnalytics?.statusCount.approved || 0}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Logo Request Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-none shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Status Distribution</CardTitle>
                <Button size="sm" variant="outline" onClick={() => exportData("logos")}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={Object.entries(logoAnalytics?.statusCount || {}).map(([status, count]) => ({
                        name: status.charAt(0).toUpperCase() + status.slice(1),
                        value: count,
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.keys(logoAnalytics?.statusCount || {}).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardHeader>
                <CardTitle>Top Requesters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {logoAnalytics?.topRequesters.map(([email, count], index) => (
                    <div key={email} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-bold">
                          {index + 1}
                        </div>
                        <span className="text-sm font-mono">{email}</span>
                      </div>
                      <Badge>{count} requests</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* System Configuration */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>System Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-2">Total Network Nodes</p>
              <p className="text-2xl font-bold">{blockchainConfigs?.[0]?.total_nodes || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">Time Range</p>
              <Badge variant="secondary" className="text-base">{timeRange}</Badge>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">Last Updated</p>
              <p className="text-sm">{new Date().toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
