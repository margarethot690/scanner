
import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { auth } from "@/api/auth";
import { AssetLogoRequest, WithdrawalRequest, BlockchainConfig } from "@/api/entities";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Shield,
  Users,
  AlertCircle,
  UserCheck,
  Server,
  Calendar,
  Mail,
  Settings,
  Percent,
  Check,
  X,
  Image as ImageIcon,
  Coins,
  Save,
  CheckCircle,
  DollarSign,
  Wallet,
  Clock,
  BarChart3, // Added BarChart3 icon for analytics
  RefreshCw, // Added RefreshCw icon for refresh
  FileText, // Added FileText icon for reports
  Trash2, // Added Trash2 icon for clearing cache
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AssetLogo from "../components/shared/AssetLogo";

export default function AdminPanel() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState(null);
  const [nodeConfig, setNodeConfig] = useState({
    node_api_url: "",
    node_ownership_percentage: "",
    locked_dcc_tokens: "",
  });

  const [rejectingRequest, setRejectingRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Blockchain config state
  const [totalNodes, setTotalNodes] = useState("");
  const [blockchainConfigId, setBlockchainConfigId] = useState(null);

  // New state for withdrawal requests
  const [processingWithdrawal, setProcessingWithdrawal] = useState(null);
  const [withdrawalRejectionReason, setWithdrawalRejectionReason] = useState("");

  const { user: currentUser, isLoadingAuth: userLoading } = useAuth();

  const { data: allUsers, isLoading: usersLoading } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () => auth.listUsers(),
    enabled: currentUser?.role === "admin",
  });

  const { data: pendingLogoRequests, isLoading: logosLoading } = useQuery({
    queryKey: ["pendingLogoRequests"],
    queryFn: () => AssetLogoRequest.filter({ status: "pending" }, "-created_date", 100),
    enabled: currentUser?.role === "admin",
  });

  // Fetch pending withdrawal requests
  const { data: pendingWithdrawals, isLoading: withdrawalsLoading } = useQuery({
    queryKey: ["pendingWithdrawals"],
    queryFn: () => WithdrawalRequest.filter({ status: "pending" }, "-created_date", 100),
    enabled: currentUser?.role === "admin",
  });

  // Fetch blockchain config
  const { data: blockchainConfigs, isLoading: configLoading } = useQuery({
    queryKey: ["blockchainConfig"],
    queryFn: () => BlockchainConfig.list(),
    enabled: currentUser?.role === "admin",
  });

  // Set blockchain config when loaded
  React.useEffect(() => {
    if (blockchainConfigs && blockchainConfigs.length > 0) {
      const config = blockchainConfigs[0];
      setTotalNodes(config.total_nodes || "");
      setBlockchainConfigId(config.id);
    }
  }, [blockchainConfigs]);

  const updateUserMutation = useMutation({
    mutationFn: ({ userId, data }) => auth.updateUser(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allUsers"] });
      setEditingUser(null);
    },
  });

  const updateBlockchainConfigMutation = useMutation({
    mutationFn: async ({ configId, data }) => {
      if (configId) {
        return BlockchainConfig.update(configId, data);
      } else {
        return BlockchainConfig.create({ ...data, config_name: "main" });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blockchainConfig"] });
    },
  });

  const approveLogoMutation = useMutation({
    mutationFn: ({ requestId }) =>
      AssetLogoRequest.update(requestId, { status: "approved" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingLogoRequests"] });
    },
  });

  const rejectLogoMutation = useMutation({
    mutationFn: ({ requestId, reason }) =>
      AssetLogoRequest.update(requestId, {
        status: "rejected",
        rejection_reason: reason
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingLogoRequests"] });
    },
  });

  const approveWithdrawalMutation = useMutation({
    mutationFn: async ({ requestId, adminEmail }) =>
      WithdrawalRequest.update(requestId, {
        status: "approved",
        processed_by: adminEmail,
        processed_date: new Date().toISOString()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingWithdrawals"] });
    },
  });

  const rejectWithdrawalMutation = useMutation({
    mutationFn: async ({ requestId, reason, adminEmail }) =>
      WithdrawalRequest.update(requestId, {
        status: "rejected",
        rejection_reason: reason,
        processed_by: adminEmail,
        processed_date: new Date().toISOString()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pendingWithdrawals"] });
    },
  });

  useEffect(() => {
    if (!userLoading && currentUser?.role !== "admin") {
      navigate(createPageUrl("Dashboard"));
    }
  }, [currentUser, userLoading, navigate]);

  const handleNodeOwnerToggle = (userId, currentValue) => {
    updateUserMutation.mutate({
      userId,
      data: { node_owner: !currentValue },
    });
  };

  const handleEditNodeConfig = (user) => {
    setEditingUser(user);
    setNodeConfig({
      node_api_url: user.node_api_url || "",
      node_ownership_percentage: user.node_ownership_percentage || "",
      locked_dcc_tokens: user.locked_dcc_tokens || "",
    });
  };

  const handleSaveNodeConfig = () => {
    if (!editingUser) return;

    const dataToUpdate = {
      node_api_url: nodeConfig.node_api_url,
    };

    // Only include percentage if it's a valid number
    if (nodeConfig.node_ownership_percentage !== "") {
      const percentage = parseFloat(nodeConfig.node_ownership_percentage);
      if (!isNaN(percentage) && percentage >= 0 && percentage <= 100) {
        dataToUpdate.node_ownership_percentage = percentage;
      }
    } else {
      // If the field is cleared, send null to clear it in the backend
      dataToUpdate.node_ownership_percentage = null;
    }

    // Only include locked tokens if it's a valid number
    if (nodeConfig.locked_dcc_tokens !== "") {
      const tokens = parseFloat(nodeConfig.locked_dcc_tokens);
      if (!isNaN(tokens) && tokens >= 0) {
        dataToUpdate.locked_dcc_tokens = tokens;
      }
    } else {
      dataToUpdate.locked_dcc_tokens = null;
    }

    updateUserMutation.mutate({
      userId: editingUser.id,
      data: dataToUpdate,
    });
  };

  const handleSaveBlockchainConfig = () => {
    const nodes = parseFloat(totalNodes);
    if (isNaN(nodes) || nodes < 1) {
      alert("Please enter a valid number of nodes (minimum 1)");
      return;
    }

    updateBlockchainConfigMutation.mutate({
      configId: blockchainConfigId,
      data: { total_nodes: nodes }
    });
  };

  const handleApproveLogo = (requestId) => {
    if (confirm("Approve this logo request?")) {
      approveLogoMutation.mutate({ requestId });
    }
  };

  const handleRejectLogo = (requestId) => {
    if (rejectionReason.trim()) {
      rejectLogoMutation.mutate({ requestId, reason: rejectionReason });
      setRejectingRequest(null);
      setRejectionReason("");
    } else {
      alert("Please provide a reason for rejection");
    }
  };

  const handleApproveWithdrawal = (requestId) => {
    if (confirm("Approve this withdrawal request? Make sure you have processed the payment before approving.")) {
      approveWithdrawalMutation.mutate({ requestId, adminEmail: currentUser.email });
    }
  };

  const handleRejectWithdrawal = (requestId) => {
    if (withdrawalRejectionReason.trim()) {
      rejectWithdrawalMutation.mutate({
        requestId,
        reason: withdrawalRejectionReason,
        adminEmail: currentUser.email
      });
      setProcessingWithdrawal(null);
      setWithdrawalRejectionReason("");
    } else {
      alert("Please provide a reason for rejection");
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

  const adminUsers = allUsers?.filter((u) => u.role === "admin") || [];
  const regularUsers = allUsers?.filter((u) => u.role === "user") || [];
  const nodeOwners = allUsers?.filter((u) => u.node_owner) || [];

  if (userLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (currentUser?.role !== "admin") {
    return (
      <div className="max-w-4xl mx-auto">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access this page. Admin access required.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Shield className="w-10 h-10 text-amber-600" />
            Admin Panel
          </h1>
          <p className="text-gray-600">
            Manage users and system settings
          </p>
        </div>
        <Button 
          onClick={() => navigate(createPageUrl("AdminAnalytics"))}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          View Analytics Dashboard
        </Button>
      </div>

      {/* Tabs for Admin functionalities */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-6">
          <TabsTrigger value="overview">
            <Shield className="w-4 h-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="w-4 h-4 mr-2" />
            Users ({allUsers?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="logos">
            <ImageIcon className="w-4 h-4 mr-2" />
            Asset Logos
            {pendingLogoRequests && pendingLogoRequests.length > 0 && (
              <Badge className="ml-2 bg-red-500 hover:bg-red-600">
                {pendingLogoRequests.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="withdrawals">
            <Wallet className="w-4 h-4 mr-2" />
            Withdrawals
            {pendingWithdrawals && pendingWithdrawals.length > 0 && (
              <Badge className="ml-2 bg-orange-500 hover:bg-orange-600">
                {pendingWithdrawals.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="blockchain">
            <Server className="w-4 h-4 mr-2" />
            Blockchain Config
          </TabsTrigger>
          <TabsTrigger value="reports">
            <FileText className="w-4 h-4 mr-2" />
            Reports
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab (moved stats here) */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Total Users</p>
                    <p className="text-3xl font-bold">{allUsers?.length || 0}</p>
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
                    <p className="text-sm text-gray-500 mb-1">Administrators</p>
                    <p className="text-3xl font-bold">{adminUsers.length}</p>
                  </div>
                  <div className="p-3 bg-amber-100 rounded-xl">
                    <Shield className="w-6 h-6 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Regular Users</p>
                    <p className="text-3xl font-bold">{regularUsers.length}</p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-xl">
                    <UserCheck className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Node Owners</p>
                    <p className="text-3xl font-bold">{nodeOwners.length}</p>
                  </div>
                  <div className="p-3 bg-purple-100 rounded-xl">
                    <Server className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users">
          <Card className="border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                User Management
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {usersLoading ? (
                <div className="p-6 space-y-3">
                  {Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                </div>
              ) : allUsers && allUsers.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Node Owner</TableHead>
                        <TableHead>Ownership %</TableHead>
                        <TableHead>Locked DCC</TableHead>
                        <TableHead>Node URL</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white">
                                  {getInitials(user.full_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{user.full_name}</p>
                                <p className="text-xs text-gray-500">ID: {user.id}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-gray-400" />
                              <span className="font-mono text-sm">{user.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.role === "admin" ? (
                              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200">
                                <Shield className="w-3 h-3 mr-1" />
                                Administrator
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <UserCheck className="w-3 h-3 mr-1" />
                                User
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={user.node_owner || false}
                                onCheckedChange={() => handleNodeOwnerToggle(user.id, user.node_owner)}
                                disabled={updateUserMutation.isPending}
                              />
                              <Label className="cursor-pointer text-sm">
                                {user.node_owner ? (
                                  <Badge className="bg-purple-100 text-purple-700">
                                    <Server className="w-3 h-3 mr-1" />
                                    Yes
                                  </Badge>
                                ) : (
                                  <span className="text-gray-500">No</span>
                                )}
                              </Label>
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.node_owner ? (
                              user.node_ownership_percentage !== null && user.node_ownership_percentage !== undefined ? (
                                <Badge variant="outline" className="gap-1">
                                  <Percent className="w-3 h-3" />
                                  {user.node_ownership_percentage}%
                                </Badge>
                              ) : (
                                <span className="text-gray-400 text-sm">Not set</span>
                              )
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </TableCell>
                          {/* New TableCell for Locked DCC Tokens */}
                          <TableCell>
                            {user.node_owner ? (
                              user.locked_dcc_tokens !== null && user.locked_dcc_tokens !== undefined ? (
                                <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200">
                                  <Coins className="w-3 h-3" />
                                  {user.locked_dcc_tokens.toLocaleString()} DCC
                                </Badge>
                              ) : (
                                <span className="text-gray-400 text-sm">Not set</span>
                              )
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {user.node_owner ? (
                              user.node_api_url ? (
                                <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                                  {user.node_api_url.length > 20
                                    ? `${user.node_api_url.substring(0, 20)}...`
                                    : user.node_api_url}
                                </code>
                              ) : (
                                <span className="text-gray-400 text-sm">Not set</span>
                              )
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="w-4 h-4" />
                              {new Date(user.created_date).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.node_owner && (
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditNodeConfig(user)}
                                  >
                                    <Settings className="w-4 h-4 mr-1" />
                                    Configure
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-[500px]">
                                  <DialogHeader>
                                    <DialogTitle>Configure Node Owner</DialogTitle>
                                    <DialogDescription>
                                      Set the node configuration for {editingUser?.full_name}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div>
                                      <Label htmlFor="ownership-percentage" className="flex items-center gap-2 mb-2">
                                        <Percent className="w-4 h-4" />
                                        Node Ownership Percentage
                                      </Label>
                                      <Input
                                        id="ownership-percentage"
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        placeholder="e.g., 25.5"
                                        value={nodeConfig.node_ownership_percentage}
                                        onChange={(e) =>
                                          setNodeConfig({
                                            ...nodeConfig,
                                            node_ownership_percentage: e.target.value,
                                          })
                                        }
                                      />
                                      <p className="text-xs text-gray-500 mt-1">
                                        Enter a value between 0 and 100. Leave empty to clear.
                                      </p>
                                    </div>
                                    {/* New input for Locked DCC Tokens */}
                                    <div>
                                      <Label htmlFor="locked-tokens" className="flex items-center gap-2 mb-2">
                                        <Coins className="w-4 h-4" />
                                        Locked DCC Tokens
                                      </Label>
                                      <Input
                                        id="locked-tokens"
                                        type="number"
                                        min="0"
                                        step="0.00000001" // DCC can have many decimal places
                                        placeholder="e.g., 100000"
                                        value={nodeConfig.locked_dcc_tokens}
                                        onChange={(e) =>
                                          setNodeConfig({
                                            ...nodeConfig,
                                            locked_dcc_tokens: e.target.value,
                                          })
                                        }
                                      />
                                      <p className="text-xs text-gray-500 mt-1">
                                        Amount of DCC tokens locked in this node. Leave empty to clear.
                                      </p>
                                    </div>
                                    <div>
                                      <Label htmlFor="node-url" className="flex items-center gap-2 mb-2">
                                        <Server className="w-4 h-4" />
                                        Default REST API Host/Port
                                      </Label>
                                      <Input
                                        id="node-url"
                                        type="text"
                                        placeholder="http://127.0.0.1:6869"
                                        value={nodeConfig.node_api_url}
                                        onChange={(e) =>
                                          setNodeConfig({
                                            ...nodeConfig,
                                            node_api_url: e.target.value,
                                          })
                                        }
                                      />
                                      <p className="text-xs text-gray-500 mt-1">
                                        The node API endpoint for this user.
                                      </p>
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button
                                      variant="outline"
                                      onClick={() => setEditingUser(null)}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      onClick={handleSaveNodeConfig}
                                      disabled={updateUserMutation.isPending}
                                    >
                                      {updateUserMutation.isPending ? "Saving..." : "Save Changes"}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  No users found
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logo Requests Tab */}
        <TabsContent value="logos">
          <Card className="border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white">
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Pending Logo Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {logosLoading ? (
                <div className="space-y-4">
                  {Array(3)
                    .fill(0)
                    .map((_, i) => (
                      <Skeleton key={i} className="h-32 w-full" />
                    ))}
                </div>
              ) : pendingLogoRequests && pendingLogoRequests.length > 0 ? (
                <div className="space-y-4">
                  {pendingLogoRequests.map((request) => (
                    <Card key={request.id} className="border-2">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-6">
                          {/* Logo Preview */}
                          <div className="flex-shrink-0">
                            <div className="relative">
                              <img
                                src={request.logo_url}
                                alt={request.asset_name || "Asset Logo"}
                                className="w-24 h-24 rounded-full object-cover border-4 border-gray-200 shadow-md"
                                onError={(e) => {
                                  e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'%3E%3Crect fill='%23e5e7eb' width='96' height='96'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='monospace' font-size='14' fill='%236b7280'%3ENo Image%3C/text%3E%3C/svg%3E";
                                }}
                              />
                              <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-1">
                                <ImageIcon className="w-4 h-4" />
                              </div>
                            </div>
                            <p className="text-xs text-center text-gray-500 mt-2">Proposed Logo</p>
                          </div>

                          {/* Request Details */}
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 mb-1">
                              {request.asset_name || "Unknown Asset"}
                            </h3>
                            <div className="space-y-2 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <strong>Asset ID:</strong>
                                <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                                  {request.asset_id}
                                </code>
                              </div>
                              <div>
                                <strong>Requested by:</strong> {request.requested_by}
                              </div>
                              <div>
                                <strong>Submitted:</strong> {new Date(request.created_date).toLocaleString()}
                              </div>
                              <div>
                                <strong>Logo URL:</strong>{" "}
                                <a
                                  href={request.logo_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline text-xs"
                                >
                                  View Full Size
                                </a>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 mt-4">
                              {rejectingRequest === request.id ? (
                                <div className="flex-1 space-y-2">
                                  <Textarea
                                    placeholder="Enter rejection reason..."
                                    value={rejectionReason}
                                    onChange={(e) => setRejectionReason(e.target.value)}
                                    className="h-20"
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleRejectLogo(request.id)}
                                      disabled={rejectLogoMutation.isPending}
                                    >
                                      Confirm Rejection
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setRejectingRequest(null);
                                        setRejectionReason("");
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={() => handleApproveLogo(request.id)}
                                    disabled={approveLogoMutation.isPending}
                                  >
                                    <Check className="w-4 h-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => setRejectingRequest(request.id)}
                                  >
                                    <X className="w-4 h-4 mr-1" />
                                    Reject
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">No pending logo requests</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Withdrawal Requests Tab */}
        <TabsContent value="withdrawals">
          <Card className="border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-orange-600 to-amber-600 text-white">
              <CardTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Pending Withdrawal Requests
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {withdrawalsLoading ? (
                <div className="space-y-4">
                  {Array(3)
                    .fill(0)
                    .map((_, i) => (
                      <Skeleton key={i} className="h-48 w-full" />
                    ))}
                </div>
              ) : pendingWithdrawals && pendingWithdrawals.length > 0 ? (
                <div className="space-y-4">
                  {pendingWithdrawals.map((request) => (
                    <Card key={request.id} className="border-2 border-orange-200">
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          {/* User Info */}
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-bold text-gray-900 mb-1">
                                {request.user_name}
                              </h3>
                              <p className="text-sm text-gray-600">{request.user_email}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                Requested: {new Date(request.created_date).toLocaleString()}
                              </p>
                            </div>
                            <Badge className="bg-orange-100 text-orange-700">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          </div>

                          {/* Withdrawal Amounts */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-lg">
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-2 mb-1">
                                {/* Assuming asset ID for CR Coin is this or similar */}
                                <AssetLogo assetId="G9TVbwiiUZd5WxFxoY7Tb6ZPjGGLfynJK4a3aoC59cMo" size="xs" />
                                <p className="text-sm font-medium text-gray-600">CR Coin</p>
                              </div>
                              <p className="text-2xl font-bold text-purple-700">
                                {request.crc_amount?.toFixed(2) || 0}
                              </p>
                            </div>
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-2 mb-1">
                                <div className="w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">₿</div>
                                <p className="text-sm font-medium text-gray-600">Bitcoin</p>
                              </div>
                              <p className="text-2xl font-bold text-orange-700">
                                {request.btc_amount?.toFixed(8) || 0}
                              </p>
                            </div>
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-2 mb-1">
                                <DollarSign className="w-4 h-4 text-green-600" />
                                <p className="text-sm font-medium text-gray-600">USD Value</p>
                              </div>
                              <p className="text-2xl font-bold text-green-700">
                                ${request.usd_equivalent?.toFixed(2) || 0}
                              </p>
                            </div>
                          </div>

                          {/* Wallet Addresses */}
                          <div className="space-y-3">
                            <div className="bg-white border rounded-lg p-3">
                              <p className="text-xs font-medium text-gray-500 mb-1">CR Coin Wallet</p>
                              <code className="text-sm text-gray-900 break-all">
                                {request.crc_wallet_address}
                              </code>
                            </div>
                            <div className="bg-white border rounded-lg p-3">
                              <p className="text-xs font-medium text-gray-500 mb-1">Bitcoin Wallet</p>
                              <code className="text-sm text-gray-900 break-all">
                                {request.btc_wallet_address}
                              </code>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 pt-2 border-t">
                            {processingWithdrawal === request.id ? (
                              <div className="flex-1 space-y-2">
                                <Textarea
                                  placeholder="Enter rejection reason..."
                                  value={withdrawalRejectionReason}
                                  onChange={(e) => setWithdrawalRejectionReason(e.target.value)}
                                  className="h-20"
                                />
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleRejectWithdrawal(request.id)}
                                    disabled={rejectWithdrawalMutation.isPending}
                                  >
                                    Confirm Rejection
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setProcessingWithdrawal(null);
                                      setWithdrawalRejectionReason("");
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <Button
                                  className="flex-1 bg-green-600 hover:bg-green-700"
                                  onClick={() => handleApproveWithdrawal(request.id)}
                                  disabled={approveWithdrawalMutation.isPending}
                                >
                                  <Check className="w-4 h-4 mr-2" />
                                  Approve & Mark as Paid
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => setProcessingWithdrawal(request.id)}
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Wallet className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg">No pending withdrawal requests</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Blockchain Settings Tab */}
        <TabsContent value="blockchain">
          <Card className="border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                Blockchain Network Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                <div>
                  <Label htmlFor="total-nodes" className="text-base font-medium flex items-center gap-2 mb-2">
                    <Server className="w-4 h-4" />
                    Total Nodes in Network
                  </Label>
                  <p className="text-sm text-gray-600 mb-3">
                    Configure the total number of nodes operating on the DecentralChain network.
                    This value is used to calculate individual node owner profits from network applications.
                  </p>
                  {configLoading ? (
                    <Skeleton className="h-10 w-full max-w-xs" />
                  ) : (
                    <div className="flex gap-3">
                      <Input
                        id="total-nodes"
                        type="number"
                        min="1"
                        placeholder="e.g., 50"
                        value={totalNodes}
                        onChange={(e) => setTotalNodes(e.target.value)}
                        className="max-w-xs"
                      />
                      <Button
                        onClick={handleSaveBlockchainConfig}
                        disabled={updateBlockchainConfigMutation.isPending}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        {updateBlockchainConfigMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  )}
                </div>

                {totalNodes && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                      Current Configuration
                    </h4>
                    <p className="text-sm text-blue-800">
                      Network has <strong>{totalNodes} total nodes</strong>. Each full node (100% ownership)
                      receives 1/{totalNodes} of the total network application profits.
                    </p>
                  </div>
                )}

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">How Profit Calculation Works</h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    <p><strong>1.</strong> Total app profits are divided by the number of nodes</p>
                    <p><strong>2.</strong> Each node owner receives their portion based on ownership percentage</p>
                    <p className="mt-3 p-3 bg-white rounded border">
                      <strong>Example:</strong> If total casino profit is $1000 and there are 50 nodes:<br />
                      • Each full node gets: $1000 ÷ 50 = $20<br />
                      • A 25% owner gets: $20 × 0.25 = $5
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Management Tab */}
        <TabsContent value="reports" className="space-y-6">
          <Card className="border-none shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Reports & Cache Management
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <Alert className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This section allows you to manage cached data for reporting and analytics purposes. Refreshing specific caches ensures you are viewing the most up-to-date information.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50">
                  <div>
                    <h3 className="font-semibold text-gray-900">DCC Monthly Reports Cache</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Refreshes the cache for monthly DCC reports, ensuring analytics reflect the latest data.
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      queryClient.invalidateQueries({ queryKey: ["dccReport"] }); // Assuming "dccReport" is the key for monthly reports
                      alert("Reports cache cleared successfully!");
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Reports Cache
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg bg-purple-50">
                  <div>
                    <h3 className="font-semibold text-gray-900">All Cached Data</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Clears all cached data in the application. Use this if you encounter inconsistencies or want a complete data refresh.
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      queryClient.clear();
                      alert("All application cache cleared!");
                    }}
                    variant="destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All Cache
                  </Button>
                </div>
              </div>

              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Important Cache Information:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Cached data is stored locally in your browser to improve performance.</li>
                  <li>• Refreshing a specific cache invalidates only that data, forcing a re-fetch from the server on next access.</li>
                  <li>• Clearing all cached data will remove all stored query results for this application.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Info Box */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          To invite new users or manage user roles, please use the Dashboard → Users section.
          Toggle "Node Owner" to give users access to node management features, then click "Configure" to set their ownership percentage, locked DCC tokens, and node URL.
        </AlertDescription>
      </Alert>
    </div>
  );
}
