import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import CopyButton from "../components/shared/CopyButton";
import { truncate } from "../components/utils/formatters";
import { Server, Search, CheckCircle, XCircle, Clock } from "lucide-react";

export default function AdminNodeRegistrations() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: registrations, isLoading } = useQuery({
    queryKey: ["nodeRegistrations"],
    queryFn: () => base44.entities.NodeRegistration.list("-created_date"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.NodeRegistration.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["nodeRegistrations"] }),
  });

  const filteredRegistrations = registrations?.filter((r) => {
    const matchesFilter = filter === "all" || r.status === filter;
    const matchesSearch = search === "" || 
      r.node_name?.toLowerCase().includes(search.toLowerCase()) ||
      r.wallet_address?.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  }) || [];

  const statusConfig = {
    pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800", icon: Clock },
    approved: { label: "Approved", color: "bg-green-100 text-green-800", icon: CheckCircle },
    rejected: { label: "Rejected", color: "bg-red-100 text-red-800", icon: XCircle },
  };

  const counts = {
    all: registrations?.length || 0,
    pending: registrations?.filter(r => r.status === "pending").length || 0,
    approved: registrations?.filter(r => r.status === "approved").length || 0,
    rejected: registrations?.filter(r => r.status === "rejected").length || 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Node Registrations</h1>
        <p className="text-gray-600">Manage node registration submissions</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { key: "all", label: "Total", color: "blue" },
          { key: "pending", label: "Pending", color: "yellow" },
          { key: "approved", label: "Approved", color: "green" },
          { key: "rejected", label: "Rejected", color: "red" },
        ].map(({ key, label, color }) => (
          <Card key={key} className="border-none shadow">
            <CardContent className="pt-4">
              <p className="text-sm text-gray-600">{label}</p>
              <p className={`text-2xl font-bold text-${color}-600`}>{counts[key]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Server className="w-5 h-5" />
              Submissions
            </CardTitle>
            <div className="flex gap-2">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No registrations found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Node Name</TableHead>
                  <TableHead>Wallet Address</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegistrations.map((reg) => {
                  const status = statusConfig[reg.status] || statusConfig.pending;
                  const StatusIcon = status.icon;
                  return (
                    <TableRow key={reg.id}>
                      <TableCell className="font-medium">{reg.node_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-sm">{truncate(reg.wallet_address, 16)}</code>
                          <CopyButton text={reg.wallet_address} />
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {new Date(reg.created_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={status.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {reg.status === "pending" && (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 hover:bg-green-50"
                              onClick={() => updateMutation.mutate({ id: reg.id, status: "approved" })}
                              disabled={updateMutation.isPending}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => updateMutation.mutate({ id: reg.id, status: "rejected" })}
                              disabled={updateMutation.isPending}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}