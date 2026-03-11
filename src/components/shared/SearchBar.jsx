import React, { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { blockchainAPI } from "@/components/utils/blockchain";
import { useToast } from "@/components/ui/use-toast";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    const trimmedQuery = query.trim();

    try {
      // Check if it's a block height (all digits)
      if (/^\d+$/.test(trimmedQuery)) {
        navigate(createPageUrl("BlockDetail", `?height=${trimmedQuery}`));
        setLoading(false);
        return;
      }

      // Check if it's a long hash (block/tx/asset ID - typically 40+ chars)
      if (trimmedQuery.length >= 40) {
        // Try as block ID first
        try {
          await blockchainAPI.getBlockById(trimmedQuery);
          navigate(createPageUrl("BlockDetail", `?id=${trimmedQuery}`));
          setLoading(false);
          return;
        } catch (blockError) {
          // Try as transaction ID
          try {
            await blockchainAPI.getTransaction(trimmedQuery);
            navigate(createPageUrl("Transaction", `?id=${trimmedQuery}`));
            setLoading(false);
            return;
          } catch (txError) {
            // Try as asset ID
            try {
              await blockchainAPI.getAssetDetails(trimmedQuery);
              navigate(createPageUrl("Asset", `?id=${trimmedQuery}`));
              setLoading(false);
              return;
            } catch (assetError) {
              throw new Error("No block, transaction, or asset found with this ID");
            }
          }
        }
      }

      // Otherwise, assume it's an address
      navigate(createPageUrl("Address", `?addr=${trimmedQuery}`));
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Search Error",
        description: error.message || "Could not find the requested resource",
      });
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSearch} role="search" aria-label="Search the blockchain" className="relative flex-1 max-w-2xl">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" aria-hidden="true" />
      <Input
        type="text"
        placeholder="Search by block height, block ID, transaction ID, address, or asset ID..."
        aria-label="Search by block height, transaction ID, address, or asset ID"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pl-10 pr-24"
        disabled={loading}
      />
      <Button
        type="submit"
        size="sm"
        disabled={loading || !query.trim()}
        className="absolute right-1.5 top-1/2 transform -translate-y-1/2"
      >
        {loading ? (
          <><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /><span className="sr-only">Searching...</span></>
        ) : (
          "Search"
        )}
      </Button>
    </form>
  );
}