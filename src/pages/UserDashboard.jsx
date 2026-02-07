import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  User,
  Mail,
  Shield,
  Calendar,
  Activity,
  TrendingUp,
  Clock,
  LayoutDashboard,
  Server,
  Network,
  Settings,
  Save,
  CheckCircle,
  AlertCircle,
  Upload,
  Image as ImageIcon,
  Coins,
  XCircle,
  DollarSign,
  TrendingDown,
  Wallet,
  Users,
  Zap, // Added Zap for node version
  BarChart3, // Added BarChart3 for network stats
  FileText, // Added FileText icon for reports
  ExternalLink, // Added ExternalLink icon
  RefreshCw, // Added RefreshCw icon for refresh button
  Receipt, // Added Receipt icon for transaction fees
  Calculator,
  Blocks,
  RotateCcw,
  Info,
  Percent,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { blockchainAPI } from "../components/utils/blockchain";
import AssetLogo from "../components/shared/AssetLogo";
import { Textarea } from "@/components/ui/textarea";
import ReportCard from "../components/dashboard/ReportCard";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { truncate } from "../components/utils/formatters";
import { useLanguage } from "../components/contexts/LanguageContext";

// Helper function to format amount for display
const formatAmount = (amount, decimals = 2) => {
  if (typeof amount !== 'number' || isNaN(amount)) return 'N/A'; // N/A kept as literal for formatting function return value
  return amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: decimals });
};

// Helper function for time ago
const timeAgo = (timestamp) => {
  if (!timestamp) return 'N/A'; // N/A kept as literal for formatting function return value
  const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
};

// Factory function to create a blockchain API instance with a custom base URL
// NOTE: This factory function is no longer directly used for node owner dashboard features
// because we are now invoking backend functions to bypass CORS.
// It remains here for other potential uses or for for reference.
const createCustomBlockchainAPI = (baseURL) => {
  const cleanBaseURL = baseURL.trim().replace(/\/$/, ''); // Remove trailing slash

  const makeRequest = async (path) => {
    const response = await fetch(`${cleanBaseURL}${path}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${path}: ${response.statusText}`);
    }
    return response.json();
  };

  return {
    getHeight: () => makeRequest('/blocks/height'),
    getLastBlock: () => makeRequest('/blocks/last'),
    getNodeVersion: () => makeRequest('/node/version'),
    getBlockHeaders: async (from, to) => makeRequest(`/blocks/headers/${from}/${to}`),
    // Add other blockchain API methods as needed
  };
};

// IMPORTANT: Replace this with the actual Base44 App ID for DCC Reports
// This ID is used to construct the URL for generating reports.
const DCC_REPORTS_APP_ID = "68e848614749b5c2de7b91ab"; // Example: "your_dcc_reports_app_id" - PLEASE UPDATE

// Casino App ID for the new API endpoint
const CASINO_APP_ID = "68f96110bcdf97e096018eeb";

export default function UserDashboard() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [nodeUrl, setNodeUrl] = useState("");
  const [nodeName, setNodeName] = useState("");
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);

  // Node status and peers state
  const [showNodeStatus, setShowNodeStatus] = useState(false);
  const [showPeers, setShowPeers] = useState(false);
  const [nodeStatusData, setNodeStatusData] = useState(null);
  const [peersData, setPeersData] = useState(null);
  const [loadingNodeStatus, setLoadingNodeStatus] = useState(false);
  const [loadingPeers, setLoadingPeers] = useState(false);

  // Asset logo upload state
  const [showLogoDialog, setShowLogoDialog] = useState(false);
  const [assetIdForLogo, setAssetIdForLogo] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoUploadStatus, setLogoUploadStatus] = useState(null);

  const { data: user, isLoading } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  // Create custom blockchain API instance with user's node URL
  // This is no longer directly used for node owner dashboard features
  // because we are now invoking backend functions to bypass CORS.
  const userBlockchainAPI = React.useMemo(() => {
    if (user?.node_api_url) {
      return createCustomBlockchainAPI(user.node_api_url);
    }
    return blockchainAPI; // Fallback to default if no custom URL is set
  }, [user?.node_api_url]);

  // Fetch user's logo requests
  const { data: myLogoRequests, isLoading: logoRequestsLoading } = useQuery({
    queryKey: ["myLogoRequests", user?.email],
    queryFn: () => base44.entities.AssetLogoRequest.filter({
      requested_by: user.email
    }),
    enabled: !!user?.email,
  });

  // Fetch casino profits for node owners
  const {
    data: casinoProfits,
    isLoading: casinoProfitsLoading,
    error: casinoProfitsError,
    refetch: refetchCasinoProfits // <--- Destructure the refetch function here
  } = useQuery({
    queryKey: ["casinoProfits", user?.email, CASINO_APP_ID], // <--- Include CASINO_APP_ID in the key
    queryFn: async () => {
      try {
        const response = await fetch(
          `https://crc-casino-copy-96018eeb.base44.app/api/apps/${CASINO_APP_ID}/functions/getNodeOwnerProfits`
        );
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to fetch casino profits: ${response.status} - ${errorText}`);
        }
        const data = await response.json();
        console.log("Casino profits data:", data);
        return data;
      } catch (error) {
        console.error("Error fetching casino profits:", error);
        throw error;
      }
    },
    enabled: !!user?.node_owner,
    retry: 1,
  });

  // Fetch blockchain data for Node Owner Dashboard using backend functions
  const { data: height } = useQuery({
    queryKey: ["height", user?.node_api_url],
    queryFn: async () => {
      if (!user?.node_api_url) return null; // Guard against missing URL
      const response = await base44.functions.invoke('getNodeHeight', {
        nodeUrl: user.node_api_url
      });
      // Assuming response.data contains the height object { height: number }
      return response.data;
    },
    enabled: !!user?.node_owner && !!user?.node_api_url,
  });

  const { data: lastBlock } = useQuery({
    queryKey: ["lastBlock", user?.node_api_url],
    queryFn: async () => {
      if (!user?.node_api_url) return null; // Guard against missing URL
      const response = await base44.functions.invoke('getLastBlock', {
        nodeUrl: user.node_api_url
      });
      // Assuming response.data contains the last block object
      return response.data;
    },
    enabled: !!user?.node_owner && !!user?.node_api_url,
  });

  const { data: nodeVersion } = useQuery({
    queryKey: ["nodeVersion", user?.node_api_url],
    queryFn: async () => {
      if (!user?.node_api_url) return null; // Guard against missing URL
      const response = await base44.functions.invoke('getNodeVersion', {
        nodeUrl: user.node_api_url
      });
      // Assuming response.data contains the node version object { version: string }
      return response.data;
    },
    enabled: !!user?.node_owner && !!user?.node_api_url,
  });

  const currentHeight = height?.height || 0;

  const { data: recentBlocks } = useQuery({
    queryKey: ["recentBlocks", currentHeight, user?.node_api_url],
    queryFn: async () => {
      if (!user?.node_api_url || currentHeight === 0) return null; // Guard against missing URL or zero height
      const from = Math.max(1, currentHeight - 99);
      const response = await base44.functions.invoke('getBlockHeaders', {
        nodeUrl: user.node_api_url,
        from,
        to: currentHeight
      });
      // Assuming response.data contains an array of block headers
      return response.data;
    },
    enabled: currentHeight > 0 && !!user?.node_owner && !!user?.node_api_url,
    staleTime: 10000, // consider fresh for 10 seconds
  });

  // Calculate transaction stats and analytics
  const txStats = React.useMemo(() => {
    if (!recentBlocks || recentBlocks.length === 0) return null;

    const totalTxs = recentBlocks.reduce((sum, block) => sum + (block.transactionCount || 0), 0);
    const avgTxPerBlock = totalTxs / recentBlocks.length;

    // Calculate average block time
    const sorted = [...recentBlocks].sort((a, b) => a.height - b.height);
    
    // Filter out blocks with timestamp 0 or same timestamp as previous (invalid)
    const validBlocks = sorted.filter((block, i, arr) => 
      block.timestamp > 0 && (i === 0 || block.timestamp > arr[i-1].timestamp)
    );

    let totalBlockTime = 0;
    for (let i = 1; i < validBlocks.length; i++) {
      const timeDiff = (validBlocks[i].timestamp - validBlocks[i - 1].timestamp) / 1000;
      totalBlockTime += timeDiff;
    }
    const avgBlockTime = validBlocks.length > 1 ? totalBlockTime / (validBlocks.length - 1) : 60;
    const blocksPerDay = (24 * 3600) / avgBlockTime;
    const estTxPer24h = Math.round(avgTxPerBlock * blocksPerDay);

    // TPS calculation
    const totalTime = validBlocks.length > 1 ? (validBlocks[validBlocks.length - 1].timestamp - validBlocks[0].timestamp) / 1000 : 0;
    const tps = totalTime > 0 ? totalTxs / totalTime : 0;

    // Chart data for last 50 blocks
    const chartData = sorted.slice(-50).map((block) => ({
      height: block.height,
      txCount: block.transactionCount || 0,
      timestamp: block.timestamp,
    }));

    // Block time chart data
    const blockTimeData = [];
    for (let i = 1; i < Math.min(validBlocks.length, 50); i++) {
      const idx = validBlocks.length - Math.min(validBlocks.length, 50) + i;
      if (idx >= 1 && idx < validBlocks.length) {
        const timeDiff = (validBlocks[idx].timestamp - validBlocks[idx - 1].timestamp) / 1000;
        blockTimeData.push({
          height: validBlocks[idx].height,
          time: timeDiff > 0 ? timeDiff : 0,
        });
      }
    }

    // Transaction Volume Trend (hourly aggregation for last 24h estimate)
    // For 100 blocks, a very rough estimate. Could be more granular if more blocks fetched.
    const volumeTrendData = [];
    const blocksPerInterval = Math.max(1, Math.floor(sorted.length / 24)); // roughly 1 hour per interval
    
    for (let i = 0; i < 24; i++) {
      const start = sorted.length - (i + 1) * blocksPerInterval;
      const end = sorted.length - i * blocksPerInterval;
      
      if (start < 0 && end <= 0) break; // No more blocks to process
      
      const intervalBlocks = sorted.slice(Math.max(0, start), Math.max(0, end));
      if (intervalBlocks.length === 0) continue;

      const intervalTxs = intervalBlocks.reduce((sum, b) => sum + (b.transactionCount || 0), 0);
      
      volumeTrendData.push({
        hour: `${i}h ago`,
        transactions: intervalTxs,
        avgPerBlock: intervalBlocks.length > 0 ? intervalTxs / intervalBlocks.length : 0,
      });
    }

    // Network Utilization (block size analysis)
    const blockSizeData = sorted.slice(-50).map(block => ({
      height: block.height,
      size: block.blocksize || 0,
    }));

    const avgBlockSize = sorted.reduce((sum, b) => sum + (b.blocksize || 0), 0) / sorted.length;
    const maxBlockSize = Math.max(...sorted.map(b => b.blocksize || 0));

    return {
      totalTxs,
      avgTxPerBlock: avgTxPerBlock.toFixed(2),
      estTxPer24h,
      avgBlockTime: avgBlockTime.toFixed(2),
      tps: tps.toFixed(3),
      chartData,
      blockTimeData,
      volumeTrendData: volumeTrendData.reverse(), // Show newest on the right
      blockSizeData,
      avgBlockSize: avgBlockSize.toFixed(0),
      maxBlockSize,
    };
  }, [recentBlocks]);

  const updateNodeConfigMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      setConnectionStatus({ type: "success", message: t("configSaved") });
    },
    onError: (error) => {
      setConnectionStatus({ type: "error", message: t("failedToSaveConfig").replace("{error}", error.message || t('unknownError')) });
    },
  });

  // Set initial values when user data loads
  React.useEffect(() => {
    if (user?.node_api_url) {
      setNodeUrl(user.node_api_url);
    }
    if (user?.node_name) {
      setNodeName(user.node_name);
    }
  }, [user]);

  const testNodeConnection = async () => {
    if (!nodeUrl) {
      setConnectionStatus({ type: "error", message: t("pleaseEnterNodeUrl") });
      return;
    }

    setTestingConnection(true);
    setConnectionStatus(null);

    try {
      // Call backend function to test the connection
      const response = await base44.functions.invoke('testNodeConnection', {
        nodeUrl: nodeUrl.trim()
      });

      if (response.data.success) {
        const data = response.data.data;
        const updatedDate = data.updatedDate ? new Date(data.updatedDate).toLocaleString() : t('na');
        
        setConnectionStatus({
          type: "success",
          message: t("connectionSuccessful")
            .replace("{endpoint}", response.data.endpoint)
            .replace("{blockchainHeight}", data.blockchainHeight.toLocaleString())
            .replace("{stateHeight}", data.stateHeight.toLocaleString())
            .replace("{updatedDate}", updatedDate),
          data: data
        });
      } else {
        setConnectionStatus({
          type: "error",
          message: t("connectionFailed")
            .replace("{error}", response.data.error)
            .replace("{endpoint}", response.data.endpoint)
            .replace("{details}", response.data.details ? `\n\n${response.data.details}` : ''),
        });
      }
    } catch (error) {
      setConnectionStatus({
        type: "error",
        message: t("errorTestingConnection").replace("{error}", error.message || t('unknownErrorOccurred')),
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveNodeConfig = () => {
    updateNodeConfigMutation.mutate({ 
      node_api_url: nodeUrl,
      node_name: nodeName
    });
  };

  const handleResetToDefault = () => {
    setNodeUrl("");
    setNodeName("");
    updateNodeConfigMutation.mutate({ 
      node_api_url: "",
      node_name: ""
    });
    setConnectionStatus(null);
  };

  const handleLogoUpload = async (e) => {
    e.preventDefault();
    if (!assetIdForLogo || !logoFile || !user) {
      setLogoUploadStatus({ type: "error", message: t("provideAssetIdAndLogo") });
      return;
    }

    setUploadingLogo(true);
    setLogoUploadStatus(null);

    try {
      // Check if asset exists
      let asset;
      try {
        asset = await blockchainAPI.getAssetDetails(assetIdForLogo);
      } catch (assetError) {
        setLogoUploadStatus({ type: "error", message: t("assetNotFound").replace("{assetId}", assetIdForLogo) });
        setUploadingLogo(false);
        return;
      }
      
      // Check if logo already exists (approved)
      const existingLogos = await base44.entities.AssetLogoRequest.filter({
        asset_id: assetIdForLogo,
        status: "approved"
      });

      if (existingLogos && existingLogos.length > 0) {
        setLogoUploadStatus({ 
          type: "error", 
          message: t("assetAlreadyHasApprovedLogo") 
        });
        setUploadingLogo(false);
        return;
      }

      // Upload the logo file
      const { file_url } = await base44.integrations.Core.UploadFile({ file: logoFile });

      // Create logo request
      await base44.entities.AssetLogoRequest.create({
        asset_id: assetIdForLogo,
        asset_name: asset.name || t("unknownAsset"), // Use translated placeholder if asset name is missing
        logo_url: file_url,
        status: "pending",
        requested_by: user.email
      });

      setLogoUploadStatus({ 
        type: "success", 
        message: t("logoSubmittedSuccess") 
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["myLogoRequests"] });
      
      // Reset form
      setAssetIdForLogo("");
      setLogoFile(null);
      
      // Close dialog after 2 seconds
      setTimeout(() => {
        setShowLogoDialog(false);
        setLogoUploadStatus(null);
      }, 2000);

    } catch (error) {
      setLogoUploadStatus({ 
        type: "error", 
        message: error.message || t("failedToSubmitLogoRequest") 
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  // Functions to fetch node status and peers using backend
  const fetchNodeStatus = async () => {
    if (!user?.node_api_url) {
      setNodeStatusData({ error: t("noNodeUrlConfigured") });
      setShowNodeStatus(true); // Show the card with the error message
      return;
    }

    setLoadingNodeStatus(true);
    setNodeStatusData(null); // Clear previous status
    try {
      const response = await base44.functions.invoke('getNodeStatus', {
        nodeUrl: user.node_api_url
      });
      setNodeStatusData(response.data);
      setShowNodeStatus(true);
    } catch (error) {
      setNodeStatusData({ error: error.message || t("failedToFetchNodeStatus") });
      setShowNodeStatus(true);
    } finally {
      setLoadingNodeStatus(false);
    }
  };

  const fetchPeers = async () => {
    if (!user?.node_api_url) {
      setPeersData({ error: t("noNodeUrlConfigured") });
      setShowPeers(true); // Show the card with the error message
      return;
    }

    setLoadingPeers(true);
    setPeersData(null); // Clear previous peers
    try {
      const response = await base44.functions.invoke('getPeers', {
        nodeUrl: user.node_api_url
      });
      setPeersData(response.data);
      setShowPeers(true);
    } catch (error) {
      setPeersData({ error: error.message || t("failedToFetchPeers") });
      setShowPeers(true);
    } finally {
      setLoadingPeers(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const StatCard = ({ title, value, icon: Icon, color, link, badge }) => {
    const CardWrapper = link ? Link : "div";
    const props = link ? { to: link } : {};

    return (
      <CardWrapper {...props}>
        <Card className={`border-none shadow-lg hover:shadow-xl transition-shadow ${link ? 'cursor-pointer' : ''}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 mb-1">{title}</p>
                <p className="text-2xl font-bold">{value}</p>
                {badge && <Badge variant="secondary" className="mt-2">{badge}</Badge>}
              </div>
              <div className={`p-3 ${color} bg-opacity-20 rounded-xl`}>
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </CardWrapper>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array(3)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
        </div>
      </div>
    );
  }

  // Determine default tab based on node owner status
  // Changed defaultTab for non-node-owners from "node-config" to "asset-logo"
  // because "node-config" is now only visible to node owners.
  const defaultTab = user?.node_owner ? "node-owner" : "asset-logo";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          {t("welcomeBack")}, {user.full_name}!
        </h1>
        <p className="text-gray-600">
          {t("hereIsYourDashboard")}
        </p>
      </div>

      {/* User Info Card */}
      <Card className="border-none shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <CardTitle className="flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5" />
            {t("myAccount")}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white text-2xl">
                {getInitials(user.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">{user.full_name}</h2>
              <div className="flex items-center gap-2 text-gray-600 mt-1">
                <Mail className="w-4 h-4" />
                <span>{user.email}</span>
              </div>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                {user.role === "admin" ? (
                  <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200">
                    <Shield className="w-3 h-3 mr-1" />
                    {t("administrator")}
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <User className="w-3 h-3 mr-1" />
                    {t("user")}
                  </Badge>
                )}
                {user.node_owner && (
                  <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200">
                    <Server className="w-3 h-3 mr-1" />
                    {t("nodeOwner")}
                    {user.node_ownership_percentage !== null && user.node_ownership_percentage !== undefined && (
                      <span className="ml-1">({user.node_ownership_percentage}%)</span>
                    )}
                  </Badge>
                )}
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  <span>{t("joined")} {new Date(user.created_date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab} className="space-y-6">
        <div className="overflow-x-auto pb-2 -mx-4 px-4">
          <TabsList className="inline-flex w-auto min-w-full lg:grid lg:w-full lg:grid-cols-8">
          {user?.node_owner && (
            <>
              <TabsTrigger value="node-owner" className="whitespace-nowrap">
                <Server className="w-4 h-4 mr-2" />
                {t("nodeOwnerDashboard")}
              </TabsTrigger>
              <TabsTrigger value="node-apps" className="whitespace-nowrap">
                <DollarSign className="w-4 h-4 mr-2" />
                {t("nodeOwnerApps")}
              </TabsTrigger>
              <TabsTrigger value="dcc-reports" className="whitespace-nowrap">
                <FileText className="w-4 h-4 mr-2" />
                {t("dccReports")}
              </TabsTrigger>
              <TabsTrigger value="tutorials" className="whitespace-nowrap">
                <Activity className="w-4 h-4 mr-2" />
                Tutorials
              </TabsTrigger>
              <TabsTrigger value="node-earnings" className="whitespace-nowrap">
                <TrendingUp className="w-4 h-4 mr-2" />
                Node Earnings
              </TabsTrigger>
              <TabsTrigger value="node-config" className="whitespace-nowrap"> {/* Moved inside node_owner check */}
                <Settings className="w-4 h-4 mr-2" />
                {t("nodeConfiguration")}
              </TabsTrigger>
            </>
          )}
          <TabsTrigger value="asset-logo" className="whitespace-nowrap">
            <ImageIcon className="w-4 h-4 mr-2" />
            {t("assetLogoManagement")}
          </TabsTrigger>
          <TabsTrigger value="my-assets" className="whitespace-nowrap">
            <Coins className="w-4 h-4 mr-2" />
            {t("myAssets")}
          </TabsTrigger>
        </TabsList>
        </div>

        {/* Node Owner Dashboard Tab */}
        {user?.node_owner && (
          <TabsContent value="node-owner" className="space-y-6">
            {/* Key Metrics */}
            <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg">
                    <Server className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {user.node_name || t("myNode")}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {user.node_ownership_percentage !== null && user.node_ownership_percentage !== undefined ? `${user.node_ownership_percentage}% ${t("ownership")}` : t("ownershipData")} 
                      {user.locked_dcc_tokens !== null && user.locked_dcc_tokens !== undefined ? ` • ${formatAmount(user.locked_dcc_tokens, 0)} DCC ${t("locked")}` : ''}
                    </p>
                    {user.node_api_url && (
                      <p className="text-xs text-gray-500 mt-1 font-mono">
                        {t("nodeAPI")}: {user.node_api_url}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title={t("currentHeight")}
                value={currentHeight ? currentHeight.toLocaleString() : t("na")}
                icon={Activity}
                color="text-blue-600"
              />
              <StatCard
                title={t("nodeVersion")}
                value={nodeVersion?.version || t("na")}
                icon={Zap}
                color="text-purple-600"
              />
              <StatCard
                title={t("lastBlock")}
                value={lastBlock ? timeAgo(lastBlock.timestamp) : t("na")}
                icon={Clock}
                color="text-orange-600"
              />
              <StatCard
                title={t("avgBlockTime")}
                value={txStats ? `${txStats.avgBlockTime}s` : t("na")}
                icon={Clock}
                color="text-indigo-600"
              />
            </div>

            {/* Advanced Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <StatCard
                title={t("transactionsPerSecond")}
                value={txStats ? txStats.tps : t("na")}
                icon={Zap}
                color="text-purple-600"
              />
              <StatCard
                title={t("avgTxPerBlock")}
                value={txStats ? txStats.avgTxPerBlock : t("na")}
                icon={BarChart3}
                color="text-green-600"
              />
              <StatCard
                title={t("estTransactions24h")}
                value={txStats ? txStats.estTxPer24h.toLocaleString() : t("na")}
                icon={TrendingUp}
                color="text-pink-600"
              />
            </div>

            {/* Analytics Charts */}
            {txStats && (
              <>
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle>{t("transactionVolumeTrendLast24h")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={txStats.volumeTrendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                        <YAxis label={{ value: t("transactions"), angle: -90, position: "insideLeft" }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #ccc",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar dataKey="transactions" fill="#8b5cf6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle>{t("transactionsPerBlock")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={txStats.chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="height"
                          tick={{ fontSize: 12 }}
                          label={{ value: t("blockHeight"), position: "insideBottom", offset: -5 }}
                        />
                        <YAxis label={{ value: t("transactions"), angle: -90, position: "insideLeft" }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #ccc",
                            borderRadius: "8px",
                          }}
                        />
                        <Bar dataKey="txCount" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle>{t("blockTime")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={txStats.blockTimeData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="height"
                          tick={{ fontSize: 12 }}
                          label={{ value: t("blockHeight"), position: "insideBottom", offset: -5 }}
                        />
                        <YAxis label={{ value: t("seconds"), angle: -90, position: "insideLeft" }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #ccc",
                            borderRadius: "8px",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="time"
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle>{t("networkUtilization")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={txStats.blockSizeData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="height"
                          tick={{ fontSize: 12 }}
                          label={{ value: t("blockHeight"), position: "insideBottom", offset: -5 }}
                        />
                        <YAxis label={{ value: t("bytes"), angle: -90, position: "insideLeft" }} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "white",
                            border: "1px solid #ccc",
                            borderRadius: "8px",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="size"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Summary Statistics */}
                <Card className="border-none shadow-lg">
                  <CardHeader>
                    <CardTitle>{t("summaryStatistics")}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div>
                        <p className="text-sm text-gray-500 mb-2">{t("totalTransactions")}</p>
                        <p className="text-2xl font-bold">
                          {txStats.totalTxs.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-2">{t("blocksAnalyzed")}</p>
                        <p className="text-2xl font-bold">
                          {recentBlocks?.length || 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-2">{t("avgBlockSize")}</p>
                        <p className="text-2xl font-bold">
                          {txStats.avgBlockSize} {t("bytes")}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-2">{t("maxBlockSize")}</p>
                        <p className="text-2xl font-bold">
                          {txStats.maxBlockSize.toLocaleString()} {t("bytes")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Node Management */}
            <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-blue-50">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Server className="w-5 h-5" />
                  {t("nodeOwnerManagement")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-gray-700 mb-6">
                  {t("viewDetailedInfo")}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    onClick={fetchNodeStatus}
                    disabled={loadingNodeStatus || !user.node_api_url}
                    className="p-4 h-auto bg-white border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 text-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        {loadingNodeStatus ? (
                          <Clock className="w-5 h-5 text-purple-600 animate-spin" />
                        ) : (
                          <Server className="w-5 h-5 text-purple-600" />
                        )}
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold">{t("nodeStatus")}</h3>
                        <p className="text-sm text-gray-600">{t("viewNodeInfo")}</p>
                      </div>
                    </div>
                  </Button>
                  
                  <Button
                    onClick={fetchPeers}
                    disabled={loadingPeers || !user.node_api_url}
                    className="p-4 h-auto bg-white border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 text-gray-900 transition-colors"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        {loadingPeers ? (
                          <Clock className="w-5 h-5 text-blue-600 animate-spin" />
                        ) : (
                          <Network className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold">{t("peerNetwork")}</h3>
                        <p className="text-sm text-gray-600">{t("viewAllPeers")}</p>
                      </div>
                    </div>
                  </Button>
                </div>

                {!user.node_api_url && (
                  <Alert className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {t("configureNodeUrl")}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Node Status Display */}
                {showNodeStatus && nodeStatusData && (
                  <Card className="mt-6 border-2 border-purple-200">
                    <CardHeader className="bg-purple-50">
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Server className="w-5 h-5" />
                          {t("nodeStatus")}
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => setShowNodeStatus(false)}>
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      {nodeStatusData.error ? (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{t("errorFetchingStatus").replace("{error}", nodeStatusData.error)}</AlertDescription>
                        </Alert>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500 mb-1">{t("blockchainHeight")}</p>
                            <p className="text-lg font-bold">{nodeStatusData.blockchainHeight?.toLocaleString() || t('na')}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 mb-1">{t("stateHeight")}</p>
                            <p className="text-lg font-bold">{nodeStatusData.stateHeight?.toLocaleString() || t('na')}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 mb-1">{t("timestamp")}</p>
                            <p className="text-sm">{nodeStatusData.updatedDate ? new Date(nodeStatusData.updatedDate).toLocaleString() : t('na')}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500 mb-1">{t("syncStatus")}</p>
                            <Badge variant={nodeStatusData.blockchainHeight === nodeStatusData.stateHeight && nodeStatusData.blockchainHeight > 0 ? "default" : "secondary"}>
                              {nodeStatusData.blockchainHeight === nodeStatusData.stateHeight && nodeStatusData.blockchainHeight > 0 ? t("synced") : t("syncingOrUnknown")}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Peers Display */}
                {showPeers && peersData && (
                  <Card className="mt-6 border-2 border-blue-200">
                    <CardHeader className="bg-blue-50">
                      <CardTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <Network className="w-5 h-5" />
                          {t("peersList").replace("{count}", peersData.peers?.length || 0)}
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => setShowPeers(false)}>
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      {peersData.error ? (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{t("errorFetchingStatus").replace("{error}", peersData.error)}</AlertDescription>
                        </Alert>
                      ) : peersData.peers && peersData.peers.length > 0 ? (
                        <div className="max-h-96 overflow-y-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>{t("peerAddress")}</TableHead>
                                <TableHead>{t("peerLastSeen")}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {peersData.peers.map((peer, index) => (
                                <TableRow key={index}>
                                  <TableCell className="font-mono text-sm">{peer.address}</TableCell>
                                  <TableCell className="text-sm">
                                    {peer.lastSeen ? timeAgo(peer.lastSeen) : t("never")}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-4">{t("noPeersFound")}</p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Node Owner Apps Tab */}
        {user?.node_owner && (
          <TabsContent value="node-apps" className="space-y-6">
            <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    {t("nodeOwnerApps")} - {t("revenueAndStats")}
                  </CardTitle>
                  <Button
                    onClick={() => {
                      refetchCasinoProfits(); // <--- Use the refetch function directly
                    }}
                    disabled={casinoProfitsLoading}
                    variant="secondary"
                    size="sm"
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${casinoProfitsLoading ? 'animate-spin' : ''}`} />
                    {t("refresh")}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-gray-700 mb-4">
                  {t("trackEarnings")}
                </p>

                {/* CR Coin Casino Section */}
                <Card className="border-2 border-purple-200">
                  <CardHeader className="bg-gradient-to-r from-purple-100 to-pink-100">
                    <CardTitle className="flex items-center gap-2 text-purple-900">
                      <Coins className="w-5 h-5" />
                      {t("casinoRevenue")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    {casinoProfitsLoading ? (
                      <div className="space-y-4">
                        {Array(4)
                          .fill(0)
                          .map((_, i) => (
                              <Skeleton key={i} className="h-24 w-full" />
                          ))}
                      </div>
                    ) : casinoProfits ? (
                      <CasinoProfitsDisplay data={casinoProfits} user={user} queryClient={queryClient} t={t} />
                    ) : (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {t("error")}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* DCC Reports Tab */}
        {user?.node_owner && (
          <TabsContent value="dcc-reports" className="space-y-6">
            <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  {t("dccMonthlyReports")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-gray-700 mb-6">
                  {t("dccReportsDesc")}
                </p>

                <div className="space-y-4">
                  {/* October 2025 Reports */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">{t("october2025")}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* English Report */}
                      <ReportCard
                        title={t("englishReport")}
                        dateRange="October 1-31, 2025"
                        language="en"
                        startDate="2025-10-01"
                        endDate="2025-10-31"
                        t={t}
                        appId={DCC_REPORTS_APP_ID} // Pass DCC_REPORTS_APP_ID
                      />

                      {/* Spanish Report */}
                      <ReportCard
                        title={t("spanishReport")}
                        dateRange="1-31 de Octubre, 2025"
                        language="es"
                        startDate="2025-10-01"
                        endDate="2025-10-31"
                        t={t}
                        appId={DCC_REPORTS_APP_ID} // Pass DCC_REPORTS_APP_ID
                      />
                    </div>
                  </div>

                  {/* Future months can be added here */}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Tutorials Tab */}
        {user?.node_owner && (
          <TabsContent value="tutorials" className="space-y-6">
            <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Tutorials
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-gray-700 mb-6">
                  Learn how to use DecentralScan and manage your node with these helpful video tutorials.
                </p>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">DCC Ecosystem Overview</h3>
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                      <div className="aspect-video">
                        <iframe
                          src="https://player.vimeo.com/video/1152063295?h=8234a136f9&title=0&byline=0&portrait=0"
                          className="w-full h-full"
                          frameBorder="0"
                          allow="autoplay; fullscreen; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      </div>
                      <div className="p-4">
                        <h4 className="font-semibold text-gray-900 mb-1">DCC Ecosystem Overview Video</h4>
                        <p className="text-sm text-gray-600">
                          Get a comprehensive overview of the DCC ecosystem and its components.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Getting Started</h3>
                    <div className="bg-white rounded-lg shadow-md overflow-hidden">
                      <div className="aspect-video">
                        <iframe
                          src="https://player.vimeo.com/video/1152058019?h=36cbfb4f7f&title=0&byline=0&portrait=0"
                          className="w-full h-full"
                          frameBorder="0"
                          allow="autoplay; fullscreen; picture-in-picture"
                          allowFullScreen
                        ></iframe>
                      </div>
                      <div className="p-4">
                        <h4 className="font-semibold text-gray-900 mb-1">Introduction to DecentralScan</h4>
                        <p className="text-sm text-gray-600">
                          Learn the basics of navigating DecentralScan and exploring blockchain data.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Node Earnings Tab */}
        {user?.node_owner && (
          <TabsContent value="node-earnings" className="space-y-6">
            <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
              <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Node Earnings Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-gray-700 mb-6">
                  Calculate your potential node earnings based on your ownership percentage and locked DCC tokens.
                </p>

                {/* Current Configuration */}
                <Card className="border-2 border-green-200 mb-6">
                  <CardHeader className="bg-green-50">
                    <CardTitle className="text-lg text-gray-900">Your Current Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label className="text-sm text-gray-600">Node Ownership Percentage</Label>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="text-3xl font-bold text-green-700">
                            {user?.node_ownership_percentage || 0}%
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600">Locked DCC Tokens</Label>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="text-3xl font-bold text-green-700">
                            {formatAmount(user?.locked_dcc_tokens || 0, 0)} DCC
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Earnings Calculator */}
                <NodeEarningsCalculator user={user} />

                {/* Additional Revenue Sources */}
                <Card className="border-none shadow-lg mt-6 bg-gradient-to-br from-indigo-50 to-purple-50">
                  <CardHeader>
                    <CardTitle className="text-lg">Additional Revenue Sources</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-indigo-200">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                          <DollarSign className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-1">Casino Revenue Share</h4>
                          <p className="text-sm text-gray-600">
                            Node owners receive a share of CR Coin Casino profits based on ownership percentage.
                          </p>
                          <Link to="#" onClick={(e) => { e.preventDefault(); document.querySelector('[value="node-apps"]')?.click(); }} className="text-indigo-600 text-sm font-medium mt-2 inline-block">
                            View Casino Earnings →
                          </Link>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-4 bg-white rounded-lg border border-purple-200">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Receipt className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-1">Transaction Fees</h4>
                          <p className="text-sm text-gray-600">
                            Your node earns a portion of all transaction fees processed on the network.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Info Note */}
                <Alert className="mt-6 border-blue-200 bg-blue-50">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    <strong>Note:</strong> These calculations are estimates based on current block rewards and network performance. 
                    Actual earnings may vary based on network conditions, block generation times, and other factors.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Node Configuration Tab */}
        {user?.node_owner && (
          <TabsContent value="node-config" className="space-y-6">
            <Card className="border-none shadow-lg">
              <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  {t("nodeConfiguration")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div>
                  <Label htmlFor="node-name" className="text-base font-medium">
                    {t("nodeName")}
                  </Label>
                  <p className="text-sm text-gray-500 mb-3">
                    {t("nodeNameDesc")}
                  </p>
                  <Input
                    id="node-name"
                    type="text"
                    placeholder={t("enterNodeName")}
                    value={nodeName}
                    onChange={(e) => setNodeName(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="node-url" className="text-base font-medium">
                    {t("defaultRestAPI")}
                  </Label>
                  <p className="text-sm text-gray-500 mb-3">
                    {t("configureNode")}
                  </p>
                  <div className="flex gap-2">
                    <Input
                      id="node-url"
                      type="text"
                      placeholder={t("enterNodeUrl")}
                      value={nodeUrl}
                      onChange={(e) => setNodeUrl(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={testNodeConnection}
                      disabled={testingConnection || !nodeUrl}
                    >
                      {testingConnection ? t("testing") : t("testConnection")}
                    </Button>
                  </div>
                </div>

                {connectionStatus && (
                  <Alert variant={connectionStatus.type === "error" ? "destructive" : "default"}>
                    {connectionStatus.type === "success" ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertDescription>
                      <div className="whitespace-pre-wrap text-sm">
                        {connectionStatus.message}
                      </div>
                      {connectionStatus.data && (
                        <div className="mt-3 p-3 bg-gray-50 rounded border">
                          <p className="text-xs font-semibold text-gray-700 mb-2">{t("response")}:</p>
                          <pre className="text-xs text-gray-600 overflow-x-auto">
                            {JSON.stringify(connectionStatus.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={handleSaveNodeConfig}
                    disabled={updateNodeConfigMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateNodeConfigMutation.isPending ? t("saving") : t("saveConfiguration")}
                  </Button>
                  {(nodeUrl || nodeName) && (
                    <Button
                      variant="outline"
                      onClick={handleResetToDefault}
                      disabled={updateNodeConfigMutation.isPending}
                    >
                      {t("resetToDefault")}
                    </Button>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {t("exampleConfiguration")}
                  </h4>
                  <div className="space-y-1 text-sm text-blue-800">
                    <p><strong>{t("publicNode")}:</strong> https://mainnet-node.decentralchain.io</p>
                    <p><strong>{t("localNode")}:</strong> http://127.0.0.1:6869</p>
                    <p><strong>{t("remoteNode")}:</strong> http://your-node-ip:6869</p>
                  </div>
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                    <strong>{t("note")}:</strong> {t("corsNote")}
                  </div>
                </div>

                {user.node_api_url && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800">
                      <CheckCircle className="w-4 h-4 inline mr-1" />
                      {t("currentlyUsing")}: <strong>{user.node_api_url}</strong>
                    </p>
                  </div>
                )}
                {user.node_name && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800">
                      <CheckCircle className="w-4 h-4 inline mr-1" />
                      {t("nodeNamed")}: <strong>{user.node_name}</strong>
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Asset Logo Management Tab */}
        <TabsContent value="asset-logo" className="space-y-6">
          <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
            <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                {t("assetLogoManagement")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <p className="text-gray-700 mb-4">
                {t("assetLogoDesc")}
              </p>
              <Dialog open={showLogoDialog} onOpenChange={setShowLogoDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Upload className="w-4 h-4 mr-2" />
                    {t("addAssetLogo")}
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>{t("submitAssetLogo")}</DialogTitle>
                    <DialogDescription>
                      {t("uploadLogoDesc")}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleLogoUpload} className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="asset-id">{t("assetId")}</Label>
                      <Input
                        id="asset-id"
                        type="text"
                        placeholder={t("enterAssetId")}
                        value={assetIdForLogo}
                        onChange={(e) => setAssetIdForLogo(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="logo-file">{t("logoImage")}</Label>
                      <Input
                        id="logo-file"
                        type="file"
                        accept="image/*"
                        onChange={(e) => setLogoFile(e.target.files[0])}
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {t("logoRecommendation")}
                      </p>
                    </div>

                    {logoUploadStatus && (
                      <Alert variant={logoUploadStatus.type === "error" ? "destructive" : "default"}>
                        {logoUploadStatus.type === "success" ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                        <AlertDescription>{logoUploadStatus.message}</AlertDescription>
                      </Alert>
                    )}

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowLogoDialog(false);
                          setLogoUploadStatus(null);
                          setAssetIdForLogo("");
                          setLogoFile(null);
                        }}
                      >
                        {t("cancel")}
                      </Button>
                      <Button
                        type="submit"
                        disabled={uploadingLogo || !assetIdForLogo || !logoFile}
                      >
                        {uploadingLogo ? t("uploading") : t("submitRequest")}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>

        {/* My Assets Tab */}
        <TabsContent value="my-assets" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <CardTitle className="flex items-center gap-2">
                <Coins className="w-5 h-5" />
                {t("myLogoRequests")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {logoRequestsLoading ? (
                <div className="space-y-4">
                  {Array(3)
                    .fill(0)
                    .map((_, i) => (
                        <Skeleton key={i} className="h-32 w-full" />
                    ))}
                </div>
              ) : myLogoRequests && myLogoRequests.length > 0 ? (
                <div className="space-y-4">
                  {myLogoRequests.map((request) => (
                    <Card key={request.id} className="border-2">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-6">
                          {/* Logo Preview */}
                          <div className="flex-shrink-0">
                            <AssetLogo assetId={request.asset_id} size="lg" />
                            <p className="text-xs text-center text-gray-500 mt-2">
                              {request.status === "approved" ? t("approved") : t("currentLogo")}
                            </p>
                          </div>

                          {/* Request Details */}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className="text-lg font-bold text-gray-900">
                                  {request.asset_name || t("asset")}
                                </h3>
                                <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">
                                  {request.asset_id}
                                </code>
                              </div>
                              <Badge
                                variant={
                                  request.status === "approved"
                                    ? "default"
                                    : request.status === "rejected"
                                    ? "destructive"
                                    : "secondary"
                                }
                                className="ml-2"
                              >
                                {request.status === "approved" && (
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                )}
                                {request.status === "rejected" && (
                                  <XCircle className="w-3 h-3 mr-1" />
                                )}
                                {request.status === "pending" && (
                                  <Clock className="w-3 h-3 mr-1" />
                                )}
                                {t(request.status)}
                              </Badge>
                            </div>

                            <div className="space-y-2 text-sm text-gray-600">
                              <div>
                                <strong>{t("submitted")}:</strong>{" "}
                                {new Date(request.created_date).toLocaleString()}
                              </div>
                              {request.status === "rejected" && request.rejection_reason && (
                                <Alert variant="destructive">
                                  <AlertCircle className="h-4 w-4" />
                                  <AlertDescription>
                                    <strong>{t("rejectionReason")}:</strong> {request.rejection_reason}
                                  </AlertDescription>
                                  </Alert>
                              )}
                              {request.status === "approved" && (
                                <Alert>
                                  <CheckCircle className="h-4 w-4" />
                                  <AlertDescription>
                                    {t("logoLive")}
                                  </AlertDescription>
                                </Alert>
                              )}
                              {request.status === "pending" && (
                                <Alert>
                                  <Clock className="h-4 w-4" />
                                  <AlertDescription>
                                    {t("awaitingApproval")}
                                  </AlertDescription>
                                </Alert>
                              )}
                            </div>

                            {/* View Asset Link */}
                            <Link
                              to={createPageUrl("Asset", `?id=${request.asset_id}`)}
                              className="inline-block mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium"
                            >
                              {t("viewAssetDetails")} →
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Coins className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg mb-2">{t("noLogoRequests")}</p>
                  <p className="text-sm">
                    {t("submitFirstLogo")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      {/* Quick Links */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle>{t("popularFeatures")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              to={createPageUrl("Transaction")}
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 mb-1">{t("searchTransactions")}</h3>
              <p className="text-sm text-gray-600">{t("findAnyTransaction")}</p>
            </Link>
            <Link
              to={createPageUrl("Address")}
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 mb-1">{t("addressLookup")}</h3>
              <p className="text-sm text-gray-600">{t("viewBalancesHistory")}</p>
            </Link>
            <Link
              to={createPageUrl("Asset")}
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 mb-1">{t("assetExplorer")}</h3>
              <p className="text-sm text-gray-600">{t("exploreBlockchainAssets")}</p>
            </Link>
            <Link
              to={createPageUrl("DistributionTool")}
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 mb-1">{t("distributionAnalysis")}</h3>
              <p className="text-sm text-gray-600">{t("analyzeAssetDistribution")}</p>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Node Earnings Calculator Component
function NodeEarningsCalculator({ user }) {
  const [dccStaked, setDccStaked] = React.useState(user?.locked_dcc_tokens || 10000);
  const [ownershipPercent, setOwnershipPercent] = React.useState(user?.node_ownership_percentage || 100);

  // Constants (hard-coded)
  const Tb = 60; // Block time in seconds
  const Bd = 1440; // Blocks per day
  const Rb = 1; // Block reward in DCC
  const pi = 1.0; // Participation score (100% uptime)
  const Seff = 500000; // Total effective stake

  // Calculate results
  const results = React.useMemo(() => {
    if (Seff <= 0) {
      return {
        valid: false,
        error: "Network stake unavailable",
        stakeShare: 0,
        expectedBlocksPerDay: 0,
        earningsDay: 0,
        earningsMonth: 0,
        earningsYear: 0,
        principal: 0,
        apy: 0,
      };
    }

    const Si = Math.max(0, Number(dccStaked) || 0);
    const w = Math.max(0, Math.min(100, Number(ownershipPercent) || 0)) / 100;

    const stakeShare = (Si * pi) / Seff;
    const expectedBlocksPerDay = Bd * stakeShare;
    const earningsDay = w * Bd * (Si * pi / Seff) * Rb;
    const earningsMonth = earningsDay * 30;
    const earningsYear = earningsDay * 365;
    const principal = w * Si;
    const apy = principal > 0 ? (earningsYear / principal) * 100 : 0;

    return {
      valid: true,
      error: null,
      stakeShare: stakeShare * 100,
      expectedBlocksPerDay,
      earningsDay,
      earningsMonth,
      earningsYear,
      principal,
      apy,
    };
  }, [dccStaked, ownershipPercent, Seff, Bd, Rb, pi]);

  const handleReset = () => {
    setDccStaked(user?.locked_dcc_tokens || 10000);
    setOwnershipPercent(user?.node_ownership_percentage || 100);
  };

  const StatCard = ({ title, value, unit, icon: Icon, gradient }) => (
    <Card className={`border-none shadow-lg ${gradient}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-gray-700">{title}</p>
          <div className="p-2 bg-white/50 rounded-lg">
            <Icon className="w-4 h-4 text-gray-700" />
          </div>
        </div>
        <p className="text-xl font-bold text-gray-900">
          {typeof value === "number" ? value.toFixed(2) : value}
          {unit && <span className="text-sm ml-1 text-gray-600">{unit}</span>}
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Calculator Card */}
      <Card className="border-none shadow-xl">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Calculator Inputs
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* DCC Staked Input */}
          <div className="space-y-2">
            <Label htmlFor="dcc-staked" className="text-base font-semibold">
              DCC Staked (Locked)
            </Label>
            <div className="flex items-center gap-3">
              <Input
                id="dcc-staked"
                type="number"
                min="0"
                step="1000"
                value={dccStaked}
                onChange={(e) => setDccStaked(e.target.value === "" ? 0 : Number(e.target.value))}
                className="text-lg"
                placeholder="Enter DCC amount"
              />
              <Coins className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">
              Total amount of DCC tokens locked in the node
            </p>
          </div>

          {/* Ownership Percentage */}
          <div className="space-y-4">
            <Label htmlFor="ownership" className="text-base font-semibold">
              Ownership Percentage
            </Label>
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <Slider
                  id="ownership"
                  min={0}
                  max={100}
                  step={1}
                  value={[ownershipPercent]}
                  onValueChange={(value) => setOwnershipPercent(value[0])}
                  className="w-full"
                />
              </div>
              <div className="flex items-center gap-2 w-32">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={ownershipPercent}
                  onChange={(e) => {
                    const value = e.target.value;
                    const num = value === "" ? 0 : Number(value);
                    setOwnershipPercent(Math.max(0, Math.min(100, num)));
                  }}
                  className="text-center"
                />
                <Percent className="w-5 h-5 text-gray-400" />
              </div>
            </div>
            <p className="text-sm text-gray-500">
              Your ownership share of the node (0-100%)
            </p>
          </div>

          {/* Reset Button */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleReset}
              variant="outline"
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Your Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {!results.valid && (
        <Alert variant="destructive">
          <Info className="w-4 h-4" />
          <AlertDescription>{results.error}</AlertDescription>
        </Alert>
      )}

      {/* Results Grid */}
      {results.valid && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Stake Share"
              value={results.stakeShare}
              unit="%"
              icon={PieChart}
              gradient="bg-gradient-to-br from-blue-50 to-blue-100"
            />
            <StatCard
              title="Est. Blocks/Day"
              value={results.expectedBlocksPerDay}
              icon={Blocks}
              gradient="bg-gradient-to-br from-purple-50 to-purple-100"
            />
            <StatCard
              title="Principal"
              value={results.principal}
              unit="DCC"
              icon={Coins}
              gradient="bg-gradient-to-br from-indigo-50 to-indigo-100"
            />
            <StatCard
              title="APY (Simple)"
              value={results.apy}
              unit="%"
              icon={TrendingUp}
              gradient="bg-gradient-to-br from-green-50 to-green-100"
            />
          </div>

          {/* Earnings Cards */}
          <Card className="border-none shadow-xl">
            <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Earnings Projections
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-orange-600" />
                    <p className="text-sm font-semibold text-gray-700">Daily</p>
                  </div>
                  <p className="text-3xl font-bold text-orange-700">
                    {results.earningsDay.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">DCC per day</p>
                </div>

                <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-6 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-yellow-600" />
                    <p className="text-sm font-semibold text-gray-700">Monthly</p>
                  </div>
                  <p className="text-3xl font-bold text-yellow-700">
                    {results.earningsMonth.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">DCC per month (30 days)</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-5 h-5 text-green-600" />
                    <p className="text-sm font-semibold text-gray-700">Yearly</p>
                  </div>
                  <p className="text-3xl font-bold text-green-700">
                    {results.earningsYear.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">DCC per year (365 days)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Assumptions */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-sm text-gray-700">
          <strong>Assumptions:</strong> 1 DCC/block, 1 block/60s, S<sub>eff</sub>=500,000 DCC, uptime=100%, fees excluded.
        </AlertDescription>
      </Alert>
    </div>
  );
}

// CR Coin Casino Profits Display Component
function CasinoProfitsDisplay({ data, user, queryClient, t }) {
  const COLORS = ["#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6"];

  // Withdrawal request state
  const [showWithdrawalDialog, setShowWithdrawalDialog] = useState(false);
  const [crcWalletAddress, setCrcWalletAddress] = useState("");
  const [btcWalletAddress, setBtcWalletAddress] = useState("");
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);
  const [withdrawalStatus, setWithdrawalStatus] = useState(null);

  // Fetch blockchain config for total nodes
  const { data: blockchainConfigs } = useQuery({
    queryKey: ["blockchainConfig"],
    queryFn: () => base44.entities.BlockchainConfig.list(),
  });

  // Fetch user's withdrawal requests from database
  const { data: withdrawalRequests, isLoading: withdrawalsLoading } = useQuery({
    queryKey: ["userWithdrawals", user?.email],
    queryFn: () => base44.entities.WithdrawalRequest.filter({
      user_email: user.email
    }, "-created_date", 50),
    enabled: !!user?.email,
  });

  const totalNodes = blockchainConfigs?.[0]?.total_nodes || 50;
  const userOwnershipPercent = user?.node_ownership_percentage || 0;

  console.log("CasinoProfitsDisplay - Raw data:", data);
  console.log("User ownership percentage:", userOwnershipPercent);
  console.log("Total nodes:", totalNodes);

  // Parse the actual API response structure
  const casinoData = data?.data || {};
  const crcData = casinoData.crc || {};
  const btcData = casinoData.btc || {};
  const usdData = casinoData.usd_reference || {};
  
  console.log("Parsed casino data:", { crcData, btcData, usdData });

  const periodEnd = casinoData.period_end ? new Date(casinoData.period_end).toLocaleDateString() : t('na');
  const generatedAt = casinoData.generated_at ? new Date(casinoData.generated_at).toLocaleString() : t('na');

  // Calculate profit per node
  const profitPerFullNode = {
    crc: (crcData.casino_pnl || 0) / totalNodes,
    btc: (btcData.casino_pnl || 0) / totalNodes,
    usd: (usdData.casino_pnl || 0) / totalNodes,
  };

  console.log("Profit per full node:", profitPerFullNode);

  // Calculate user's profit based on their ownership percentage
  // Formula: (Total Casino P&L / Total Nodes) * (User Ownership % / 100)
  const userProfit = {
    crc: profitPerFullNode.crc * (userOwnershipPercent / 100),
    btc: profitPerFullNode.btc * (userOwnershipPercent / 100),
    usd: profitPerFullNode.usd * (userOwnershipPercent / 100),
  };

  console.log("User profit:", userProfit);
  console.log("Calculation: CRC = (" + (crcData.casino_pnl || 0) + " / " + totalNodes + ") * (" + userOwnershipPercent + " / 100) = " + userProfit.crc);

  // Prepare chart data for currencies (using user's actual profit)
  const currencyChartData = [
    {
      name: "CRC",
      pnl: userProfit.crc,
      totalPnl: crcData.casino_pnl || 0,
      deposits: crcData.total_deposits || 0,
      fill: "#8b5cf6",
    },
    {
      name: "BTC",
      pnl: userProfit.btc,
      totalPnl: btcData.casino_pnl || 0,
      deposits: btcData.total_deposits || 0,
      fill: "#f59e0b",
    },
  ];

  // Prepare deposit/withdrawal comparison
  const transactionData = [
    { name: t("crcDeposits"), value: crcData.deposits_count || 0, fill: "#10b981" },
    { name: t("crcWithdrawals"), value: crcData.withdrawals_count || 0, fill: "#ef4444" },
    { name: t("btcDeposits"), value: btcData.deposits_count || 0, fill: "#3b82f6" },
    { name: t("btcWithdrawals"), value: btcData.withdrawals_count || 0, fill: "#f97316" },
  ];

  const handleWithdrawalRequest = async (e) => {
    e.preventDefault();
    if (!crcWalletAddress || !btcWalletAddress || !user) {
      setWithdrawalStatus({ type: "error", message: t("provideBothWalletAddresses") });
      return;
    }

    setSubmittingWithdrawal(true);
    setWithdrawalStatus(null);

    try {
      await base44.entities.WithdrawalRequest.create({
        user_email: user.email,
        user_name: user.full_name,
        crc_wallet_address: crcWalletAddress,
        btc_wallet_address: btcWalletAddress,
        crc_amount: userProfit.crc,
        btc_amount: userProfit.btc,
        usd_equivalent: userProfit.usd,
        status: "pending"
      });

      setWithdrawalStatus({ 
        type: "success", 
        message: t("withdrawalRequestSubmitted") 
      });
      
      queryClient.invalidateQueries({ queryKey: ["userWithdrawals"] });

      // Reset form
      setCrcWalletAddress("");
      setBtcWalletAddress("");

      // Close dialog after 2 seconds
      setTimeout(() => {
        setShowWithdrawalDialog(false);
        setWithdrawalStatus(null);
      }, 2000);

    } catch (error) {
      setWithdrawalStatus({ 
        type: "error", 
        message: error.message || t("failedToSubmitWithdrawalRequest") 
      });
    } finally {
      setSubmittingWithdrawal(false);
    }
  };


  // Check if user has required setup
  const hasRequiredSetup = userOwnershipPercent > 0;

  if (!hasRequiredSetup) {
    return (
      <Alert className="border-yellow-200 bg-yellow-50">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <AlertDescription className="text-yellow-800">
          {t("setupRequired")}: {t("nodeOwnershipNotSet")}
          <br />
          <span className="text-sm mt-2 block">
            {t("contactAdminToSetup")}
          </span>
        </AlertDescription>
      </Alert>
    );
  }

  // Check if casino data is available
  if (!casinoData || Object.keys(casinoData).length === 0) {
    return (
      <Alert className="border-orange-200 bg-orange-50">
        <AlertCircle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-800">
          {t("noCasinoData")}
          <br />
          <span className="text-sm mt-2 block">
            {t("casinoDataMayNotBeAvailable")}
          </span>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600">{t("period")}</p>
            <p className="font-semibold text-gray-900">{t("allTimeUntil", { periodEnd })}</p>
          </div>
          <div>
            <p className="text-gray-600">{t("totalNetworkNodes")}</p>
            <p className="font-semibold text-purple-700">{totalNodes} {t("nodes")}</p>
          </div>
          <div>
            <p className="text-gray-600">{t("yourNodeOwnership")}</p>
            <p className="font-semibold text-purple-700">{userOwnershipPercent}%</p>
          </div>
          <div>
            <p className="text-gray-600">{t("lastUpdated")}</p>
            <p className="font-semibold text-gray-900">{generatedAt}</p>
          </div>
        </div>
      </div>

      {/* Key Metrics - Your Actual Share */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-emerald-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{t("networkTotalDepositsUSD")}</p>
                <p className="text-2xl font-bold text-green-700">
                  ${formatAmount(usdData.total_deposits || 0, 2)}
                </p>
              </div>
              <div className="p-3 bg-green-200 rounded-xl">
                <TrendingUp className="w-6 h-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{t("networkCasinoPNLUSD")}</p>
                <p className="text-2xl font-bold text-purple-700">
                  ${formatAmount(usdData.casino_pnl || 0, 2)}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  {t("perNode")}: ${profitPerFullNode.usd.toFixed(2)}
                </p>
              </div>
              <div className="p-3 bg-purple-200 rounded-xl">
                <Activity className="w-6 h-6 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{t("yourProfitShareUSD")}</p>
                <p className="text-2xl font-bold text-blue-700">
                  ${userProfit.usd.toFixed(2)}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {t("basedOnOwnership", { percent: userOwnershipPercent })}
                </p>
              </div>
              <div className="p-3 bg-blue-200 rounded-xl">
                <DollarSign className="w-6 h-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Your Profit Breakdown by Currency */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            {t("yourProfitShareBreakdown")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* CRC Profit */}
            <div className="bg-white p-4 rounded-lg border-2 border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <AssetLogo assetId="G9TVbwiiUZd5WxFxoY7Tb6ZPjGGLfynJK4a3aoC59cMo" size="sm" />
                <p className="text-sm font-medium text-gray-600">CR Coin (CRC)</p>
              </div>
              <p className="text-3xl font-bold text-purple-700">
                {userProfit.crc.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {t("networkTotal")}: {formatAmount(crcData.casino_pnl || 0, 2)}
              </p>
            </div>

            {/* BTC Profit */}
            <div className="bg-white p-4 rounded-lg border-2 border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center text-white text-sm font-bold">
                  ₿
                </div>
                <p className="text-sm font-medium text-gray-600">Bitcoin (BTC)</p>
              </div>
              <p className="text-3xl font-bold text-orange-600">
                {userProfit.btc.toFixed(8)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {t("networkTotal")}: {(btcData.casino_pnl || 0).toFixed(8)}
              </p>
            </div>

            {/* USD Equivalent */}
            <div className="bg-white p-4 rounded-lg border-2 border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-bold">
                  $
                </div>
                <p className="text-sm font-medium text-gray-600">USD Equivalent</p>
              </div>
              <p className="text-3xl font-bold text-green-700">
                ${userProfit.usd.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {t("networkTotal")}: ${formatAmount(usdData.casino_pnl || 0, 2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Withdrawal Request Button */}
      <div className="flex justify-center">
        <Dialog open={showWithdrawalDialog} onOpenChange={setShowWithdrawalDialog}>
          <DialogTrigger asChild>
            <Button size="lg" className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg">
              <Wallet className="w-5 h-5 mr-2" />
              {t("requestWithdrawal")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{t("requestProfitWithdrawal")}</DialogTitle>
              <DialogDescription>
                {t("enterWalletAddresses")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleWithdrawalRequest} className="space-y-4 py-4">
              {/* Withdrawal Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">{t("withdrawalAmount")}</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-sm text-gray-600">CRC</p>
                    <p className="text-lg font-bold text-purple-700">{userProfit.crc.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">BTC</p>
                    <p className="text-lg font-bold text-orange-600">{userProfit.btc.toFixed(8)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{t("usdEquivalent")}</p>
                    <p className="text-lg font-bold text-green-700">${userProfit.usd.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              {/* Wallet Addresses */}
              <div>
                <Label htmlFor="crc-wallet" className="flex items-center gap-2">
                  <AssetLogo assetId="G9TVbwiiUZd5WxFxoY7Tb6ZPjGGLfynJK4a3aoC59cMo" size="xs" />
                  {t("crcWalletAddress")}
                </Label>
                <Input
                  id="crc-wallet"
                  type="text"
                  placeholder={t("enterCrcWallet")}
                  value={crcWalletAddress}
                  onChange={(e) => setCrcWalletAddress(e.target.value)}
                  required
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t("yourCrcProfits")}
                </p>
              </div>

              <div>
                <Label htmlFor="btc-wallet" className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">₿</div>
                  {t("btcWalletAddress")}
                </Label>
                <Input
                  id="btc-wallet"
                  type="text"
                  placeholder={t("enterBtcWallet")}
                  value={btcWalletAddress}
                  onChange={(e) => setBtcWalletAddress(e.target.value)}
                  required
                  className="mt-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t("yourBtcProfits")}
                </p>
              </div>

              {withdrawalStatus && (
                <Alert variant={withdrawalStatus.type === "error" ? "destructive" : "default"}>
                  {withdrawalStatus.type === "success" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>{withdrawalStatus.message}</AlertDescription>
                </Alert>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowWithdrawalDialog(false);
                    setWithdrawalStatus(null);
                    setCrcWalletAddress("");
                    setBtcWalletAddress("");
                  }}
                >
                  {t("cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={submittingWithdrawal || !crcWalletAddress || !btcWalletAddress}
                  className="bg-gradient-to-r from-green-600 to-emerald-600"
                >
                  {submittingWithdrawal ? t("submitting") : t("submitRequest")}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Currency Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Your Profit by Currency */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">{t("yourProfitByCurrency")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={currencyChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value, name, props) => {
                    if (name === t("yourProfit")) { // Translate tooltip key
                      return [`${value.toFixed(6)} ${props.payload.name}`, name];
                    }
                    return [value.toLocaleString(), name];
                  }}
                />
                <Bar dataKey="pnl" name={t("yourProfit")} radius={[8, 8, 0, 0]}>
                  {currencyChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Transaction Distribution */}
        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">{t("transactionDistributionNetwork")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={transactionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  dataKey="value"
                >
                  {transactionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* My Withdrawal Requests */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-gray-700" />
            {t("myWithdrawalRequests")}
            {withdrawalRequests && withdrawalRequests.length > 0 && (
              <Badge variant="outline" className="ml-2">
                {withdrawalRequests.length} {t("total")}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {withdrawalsLoading ? (
            <div className="space-y-3">
              {Array(3).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : withdrawalRequests && withdrawalRequests.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("requestDate")}</TableHead>
                    <TableHead>{t("crcAmount")}</TableHead>
                    <TableHead>{t("btcAmount")}</TableHead>
                    <TableHead>{t("usdEquivalent")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead>{t("processedDate")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawalRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="text-sm">
                        {new Date(request.created_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="font-medium">
                        {request.crc_amount?.toFixed(2)} CRC
                      </TableCell>
                      <TableCell className="font-medium">
                        {request.btc_amount?.toFixed(8)} BTC
                      </TableCell>
                      <TableCell className="font-medium">
                        ${request.usd_equivalent?.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            request.status === 'completed' 
                              ? 'default' 
                              : request.status === 'rejected'
                              ? 'destructive'
                              : request.status === 'approved'
                              ? 'default'
                              : 'secondary'
                          }
                          className={
                            request.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : request.status === 'approved'
                              ? 'bg-blue-100 text-blue-700'
                              : request.status === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }
                        >
                          {t(request.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {request.processed_date 
                          ? new Date(request.processed_date).toLocaleDateString()
                          : '-'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Wallet className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>{t("noWithdrawalRequests")}</p>
              <p className="text-sm mt-1">{t("clickRequestWithdrawal")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Info */}
      <Card className="border-none shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-200 rounded-xl">
              <Activity className="w-6 h-6 text-blue-700" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900 mb-2">{t("aboutYourCasinoRevenue")}</h3>
              <p className="text-gray-700 text-sm leading-relaxed">
                {t("asNodeOwner")
                  .replace("{ownership}", userOwnershipPercent)
                  .replace("{totalProfit}", (usdData.casino_pnl || 0).toFixed(2))
                  .replace("{totalNodes}", totalNodes)
                  .replace("{profitPerNode}", profitPerFullNode.usd.toFixed(2))
                  .replace("{yourProfit}", userProfit.usd.toFixed(2))
                }
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}