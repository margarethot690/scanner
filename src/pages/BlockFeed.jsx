
import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { blockchainAPI } from "../components/utils/blockchain";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { fromUnix, truncate, timeAgo } from "../components/utils/formatters";
import CopyButton from "../components/shared/CopyButton";
import { Activity, Play, Pause, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "../components/contexts/LanguageContext"; // Added import
import { useBlockHeight, useLatestBlock } from "../hooks/useBlockPolling";

const MAX_BLOCKS_PER_REQUEST = 100; // API limit for block headers request
const INITIAL_BLOCKS_TO_FETCH = 20;
const MAX_GAP_TO_FETCH = 50; // Don't try to fetch more than 50 blocks at once when catching up

export default function BlockFeed() {
  const { t } = useLanguage(); // Added useLanguage hook
  const [paused, setPaused] = useState(false);
  const [blocks, setBlocks] = useState([]);
  const [expandedBlocks, setExpandedBlocks] = useState(new Set());
  const lastHeightRef = useRef(0);

  const { data: currentHeight } = useBlockHeight(!paused);

  const { data: lastBlock } = useLatestBlock(!paused);

  // Initial load - fetch last 20 blocks
  const { data: initialBlocks, isLoading } = useQuery({
    queryKey: ["initialBlocks", currentHeight?.height],
    queryFn: async () => {
      if (!currentHeight?.height) return null;
      const from = Math.max(1, currentHeight.height - (INITIAL_BLOCKS_TO_FETCH - 1));
      const to = currentHeight.height;
      
      // Safety check
      if (to - from > MAX_BLOCKS_PER_REQUEST) {
        console.warn(`Block range too large: ${from}-${to}, limiting to ${MAX_BLOCKS_PER_REQUEST}`);
        return blockchainAPI.getBlockHeaders(to - MAX_BLOCKS_PER_REQUEST + 1, to);
      }
      
      return blockchainAPI.getBlockHeaders(from, to);
    },
    enabled: !!currentHeight?.height && blocks.length === 0,
  });

  // Set initial blocks
  useEffect(() => {
    if (initialBlocks && blocks.length === 0) {
      const sorted = [...initialBlocks].sort((a, b) => b.height - a.height);
      setBlocks(sorted);
      if (sorted.length > 0) {
        lastHeightRef.current = sorted[0].height;
      }
    }
  }, [initialBlocks, blocks.length]);

  // Monitor for new blocks
  useEffect(() => {
    if (!lastBlock || paused) return;

    const newHeight = lastBlock.height;
    if (newHeight > lastHeightRef.current) {
      // New block detected
      const gap = newHeight - lastHeightRef.current;
      
      if (gap === 1) {
        // Just one new block
        setBlocks((prev) => [lastBlock, ...prev.slice(0, 49)]);
        lastHeightRef.current = newHeight;
      } else if (gap > 1 && gap <= MAX_GAP_TO_FETCH) {
        // Multiple new blocks - fetch them all (but only if gap is reasonable)
        const fetchMissing = async () => {
          try {
            const from = lastHeightRef.current + 1;
            const to = newHeight;
            
            console.log(`Fetching missing blocks ${from} to ${to} (gap: ${gap})`);
            const missing = await blockchainAPI.getBlockHeaders(from, to);
            const sorted = [...missing].sort((a, b) => b.height - a.height);
            setBlocks((prev) => [...sorted, ...prev.slice(0, 50 - sorted.length)]);
            lastHeightRef.current = newHeight;
          } catch (error) {
            console.error(`Failed to fetch missing blocks:`, error);
            // Fallback: just add the last block
            setBlocks((prev) => [lastBlock, ...prev.slice(0, 49)]);
            lastHeightRef.current = newHeight;
          }
        };
        fetchMissing();
      } else if (gap > MAX_GAP_TO_FETCH) {
        // Gap too large, just add the new block and update reference
        console.warn(`Gap too large (${gap} blocks), skipping missing blocks`);
        setBlocks((prev) => [lastBlock, ...prev.slice(0, 49)]);
        lastHeightRef.current = newHeight;
      }
    }
  }, [lastBlock, paused]);

  const toggleExpand = (height) => {
    setExpandedBlocks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(height)) {
        newSet.delete(height);
      } else {
        newSet.add(height);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{t("liveBlockFeed")}</h1>
          <p className="text-gray-600">{t("realtimeBlockUpdates")}</p>
        </div>
        <Button
          onClick={() => setPaused(!paused)}
          variant={paused ? "default" : "outline"}
          className="gap-2"
        >
          {paused ? (
            <>
              <Play className="w-4 h-4" />
              {t("resumeFeed")}
            </>
          ) : (
            <>
              <Pause className="w-4 h-4" />
              {t("pauseFeed")}
            </>
          )}
        </Button>
      </div>

      {!paused && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-600 animate-pulse" />
            <span className="text-sm font-medium text-green-900">
              {t("live")} - {t("monitoringNewBlocks")}
            </span>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {isLoading ? (
          Array(10)
            .fill(0)
            .map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))
        ) : (
          <AnimatePresence initial={false}>
            {blocks.map((block) => (
              <motion.div
                key={block.height}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="bg-blue-600 text-white rounded-lg px-4 py-2">
                          <p className="text-xs font-medium">{t("height")}</p>
                          <p className="text-2xl font-bold">
                            {block.height.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">
                            {fromUnix(block.timestamp)}
                          </p>
                          <p className="text-xs text-gray-400">
                            {timeAgo(block.timestamp)}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-lg">
                        {block.transactionCount || 0} {t("txsShort")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">{t("blockId")}</p>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {truncate(block.signature, 16)}
                          </code>
                          <CopyButton text={block.signature} />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">{t("generator")}</p>
                        <Link
                          to={createPageUrl("Address", `?addr=${block.generator}`)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-mono"
                        >
                          {truncate(block.generator, 12)}
                        </Link>
                      </div>
                    </div>

                    {block.transactionCount > 0 && (
                      <div className="border-t pt-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpand(block.height)}
                          className="w-full justify-between"
                        >
                          <span>
                            {expandedBlocks.has(block.height)
                              ? t("hideTransactions")
                              : t("showTransactions")}
                          </span>
                          {expandedBlocks.has(block.height) ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                        
                        {expandedBlocks.has(block.height) && (
                          <TransactionList blockHeight={block.height} />
                        )}
                      </div>
                    )}

                    <div className="flex justify-end mt-4">
                      <Link to={createPageUrl("BlockDetail", `?height=${block.height}`)}>
                        <Button variant="outline" size="sm">
                          {t("viewDetails")}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

function TransactionList({ blockHeight }) {
  const { t } = useLanguage(); // Added useLanguage hook
  const { data: block, isLoading } = useQuery({
    queryKey: ["blockTxs", blockHeight],
    queryFn: () => blockchainAPI.getBlockByHeight(blockHeight),
  });

  if (isLoading) {
    return (
      <div className="mt-3 space-y-2">
        {Array(3)
          .fill(0)
          .map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
      </div>
    );
  }

  if (!block?.transactions || block.transactions.length === 0) {
    return (
      <p className="text-sm text-gray-500 mt-3 text-center">
        {t("noTransactionsInBlock")}
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
      {block.transactions.map((tx) => (
        <Link
          key={tx.id}
          to={createPageUrl("Transaction", `?id=${tx.id}`)}
          className="block p-3 border rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <code className="text-xs font-mono truncate block">
                {truncate(tx.id, 20)}
              </code>
              <p className="text-xs text-gray-500 mt-1">{t("type")}: {tx.type}</p>
            </div>
            {tx.fee && (
              <Badge variant="outline" className="ml-2">
                {t("fee")}: {tx.fee}
              </Badge>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
