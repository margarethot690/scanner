
import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

const DEFAULT_BASE_URL = "https://mainnet-node.decentralchain.io";
const CR_COIN_ASSET_ID = "G9TVbwiiUZd5WxFxoY7Tb6ZPjGGLfynJK4a3aoC59cMo";
const BLOCKS_PER_SNAPSHOT = 30;
const ATOMIC_UNITS = 100000000; // 10^8 - DCC has 8 decimals

// Helper function to make API requests with retry logic
async function apiRequest(url: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, { 
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) {
        if (response.status === 429 || response.status >= 500) {
          const delay = Math.pow(2, i) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}

async function calculateCRCoinMetrics(blocks: any[], nodeUrl: string) {
  const crcMetrics = {
    totalTransferVolume: 0,
    transferAmounts: [],
    transferCount: 0,
    currentPeriodSenders: new Set<string>(),
    currentPeriodRecipients: new Set<string>(),
  };

  // Process blocks for CR Coin transfers
  for (const block of blocks) {
    if (!block.transactions) continue;
    
    for (const tx of block.transactions) {
      // Type 4 = Transfer transaction
      if (tx.type === 4 && tx.assetId === CR_COIN_ASSET_ID) {
        const amountInDCC = (tx.amount || 0) / ATOMIC_UNITS; // Convert to standard units
        crcMetrics.totalTransferVolume += amountInDCC;
        crcMetrics.transferAmounts.push(amountInDCC);
        crcMetrics.transferCount++;
        
        if (tx.sender) crcMetrics.currentPeriodSenders.add(tx.sender);
        if (tx.recipient) crcMetrics.currentPeriodRecipients.add(tx.recipient);
      }
    }
  }

  // Calculate average and median
  const avgTransferAmount = crcMetrics.transferCount > 0
    ? crcMetrics.totalTransferVolume / crcMetrics.transferCount
    : 0;

  const sortedAmounts = [...crcMetrics.transferAmounts].sort((a, b) => a - b);
  const medianTransferAmount = sortedAmounts.length > 0
    ? sortedAmounts[Math.floor(sortedAmounts.length / 2)]
    : 0;

  // Fetch CR Coin trading data from data-service
  let tradingData = {
    lastPrice: 0,
    priceChange24h: 0,
    high24h: 0,
    low24h: 0,
    weightedAvgPrice: 0,
    tradingVolume24h: 0,
    quoteVolume24h: 0,
    tradesCount: 0,
    activePairs: 0,
  };

  try {
    // Get orderbook to find active pairs
    const orderbook = await apiRequest("https://mainnet-matcher.decentralchain.io/matcher/orderbook");
    const crcPairs = orderbook?.matcherPublicKey ? 
      (orderbook.pairs || []).filter((p: { amountAsset: string; priceAsset: string; }) => 
        p.amountAsset === CR_COIN_ASSET_ID || p.priceAsset === CR_COIN_ASSET_ID
      ) : [];
    
    tradingData.activePairs = crcPairs.length;

    // Fetch pair data for CRC/DCC pair - USE "DCC" NOT "WAVES"
    try {
      const pairInfo = await apiRequest(
        `https://data-service.decentralchain.io/v0/pairs/${CR_COIN_ASSET_ID}/DCC`
      );
      
      if (pairInfo?.data) {
        tradingData.lastPrice = pairInfo.data.lastPrice || 0;
        
        // Calculate 24h change percentage from firstPrice and lastPrice
        if (pairInfo.data.firstPrice && pairInfo.data.firstPrice > 0) {
          tradingData.priceChange24h = ((pairInfo.data.lastPrice - pairInfo.data.firstPrice) / pairInfo.data.firstPrice) * 100;
        } else {
          tradingData.priceChange24h = 0;
        }
        
        tradingData.high24h = pairInfo.data.high || 0;
        tradingData.low24h = pairInfo.data.low || 0;
        tradingData.weightedAvgPrice = pairInfo.data.weightedAveragePrice || 0;
        
        // NOTE: "volume" = CR Coin volume, "quoteVolume" = DCC volume
        // "volumeWaves" is a legacy field name that also contains DCC volume (same as quoteVolume)
        tradingData.tradingVolume24h = pairInfo.data.volume || 0; // CR Coin volume
        tradingData.quoteVolume24h = pairInfo.data.quoteVolume || pairInfo.data.volumeWaves || 0; // DCC volume
        tradingData.tradesCount = pairInfo.data.txsCount || 0;
        
        console.log(`✓ Fetched CRC/DCC trading data: price=${tradingData.lastPrice}, volume=${tradingData.tradingVolume24h}, trades=${tradingData.tradesCount}`);
      }
    } catch (error: any) {
      console.log("Could not fetch CRC/DCC pair data:", error.message);
    }
  } catch (error: any) {
    console.log("Could not fetch matcher data:", error.message);
  }

  return {
    totalTransferVolume: crcMetrics.totalTransferVolume,
    averageTransferAmount: avgTransferAmount,
    medianTransferAmount: medianTransferAmount,
    transferCount: crcMetrics.transferCount,
    currentPeriodSenders: crcMetrics.currentPeriodSenders,
    currentPeriodRecipients: crcMetrics.currentPeriodRecipients,
    ...tradingData,
  };
}

Deno.serve(async (req: Request) => {
  const startTime = Date.now();
  
  try {
    const base44 = createClientFromRequest(req);
    
    // NO AUTHENTICATION REQUIRED - This endpoint is public
    
    // Parse request body for optional target height
    let targetHeight = null;
    try {
      const body = await req.json();
      targetHeight = body.height || null;
    } catch (e) {
      // No body or invalid JSON, use current height
    }

    // Always use the default public node
    const nodeUrl = DEFAULT_BASE_URL;
    console.log(`Using node URL: ${nodeUrl}`);
    
    // Fetch current blockchain height
    console.log(`Fetching current height from: ${nodeUrl}/blocks/height`);
    const heightData = await apiRequest(`${nodeUrl}/blocks/height`);
    const currentHeight = heightData.height;
    console.log(`Current blockchain height: ${currentHeight}`);
    
    // Determine snapshot height
    let snapshotHeight;
    if (targetHeight !== null && targetHeight > 0) {
      snapshotHeight = targetHeight;
      console.log(`Using provided target height: ${snapshotHeight}`);
    } else {
      snapshotHeight = Math.floor(currentHeight / BLOCKS_PER_SNAPSHOT) * BLOCKS_PER_SNAPSHOT;
      console.log(`Calculated snapshot height from current: ${snapshotHeight}`);
    }
    
    if (snapshotHeight <= 0) {
      return Response.json({ 
        success: false, 
        message: 'Reached genesis block, no more snapshots to generate' 
      });
    }

    // Check if snapshot already exists - USE SERVICE ROLE
    const existingSnapshots = await base44.asServiceRole.entities.BlockchainSnapshot.filter({
      snapshot_height: snapshotHeight
    });
    
    if (existingSnapshots && existingSnapshots.length > 0) {
      return Response.json({
        success: false,
        message: `Snapshot for height ${snapshotHeight} already exists`,
        existing_snapshot: existingSnapshots[0]
      });
    }

    // Calculate block range
    const toHeight = snapshotHeight;
    const fromHeight = Math.max(1, snapshotHeight - BLOCKS_PER_SNAPSHOT + 1);
    const blocksAnalyzed = toHeight - fromHeight + 1;

    console.log(`Generating snapshot for height ${snapshotHeight}`);
    console.log(`Block range: ${fromHeight} to ${toHeight} (${blocksAnalyzed} blocks)`);

    // Fetch blocks
    const seqUrl = `${nodeUrl}/blocks/seq/${fromHeight}/${toHeight}`;
    console.log(`Fetching blocks from: ${seqUrl}`);
    
    let blocks;
    try {
      blocks = await apiRequest(seqUrl);
      console.log(`✓ Successfully fetched ${blocks.length} blocks`);
    } catch (error: any) {
      console.error(`✗ Failed to fetch blocks: ${error.message}`);
      console.error(`Error details:`, error);
      throw new Error(`Failed to fetch blocks from ${seqUrl}: ${error.message}`);
    }
    
    if (!blocks || blocks.length === 0) {
      throw new Error('No blocks returned from API');
    }

    // Get snapshot timestamp from the last block
    const snapshotTimestamp = blocks[blocks.length - 1]?.timestamp || Date.now();

    // Calculate block time statistics
    const blockTimes: number[] = [];
    for (let i = 1; i < blocks.length; i++) {
      const timeDiff = (blocks[i].timestamp - blocks[i - 1].timestamp) / 1000;
      if (timeDiff > 0) blockTimes.push(timeDiff);
    }

    blockTimes.sort((a, b) => a - b);
    const avgBlockTime = blockTimes.length > 0 ? blockTimes.reduce((sum, t) => sum + t, 0) / blockTimes.length : 0;
    const medianBlockTime = blockTimes.length > 0 ? blockTimes[Math.floor(blockTimes.length / 2)] : 0;
    const minBlockTime = blockTimes.length > 0 ? blockTimes[0] : 0;
    const maxBlockTime = blockTimes.length > 0 ? blockTimes[blockTimes.length - 1] : 0;
    
    const variance = blockTimes.length > 0 ? blockTimes.reduce((sum, t) => sum + Math.pow(t - avgBlockTime, 2), 0) / blockTimes.length : 0;
    const stdDeviationBlockTime = Math.sqrt(variance);

    // Block time distribution
    const blockTimeDistribution: Record<string, number> = {};
    for (const time of blockTimes) {
      const bucket = `${Math.floor(time / 10) * 10}-${Math.floor(time / 10) * 10 + 10}s`;
      blockTimeDistribution[bucket] = (blockTimeDistribution[bucket] || 0) + 1;
    }

    // Transaction statistics
    let totalTxs = 0;
    const txPerBlock: number[] = [];
    let emptyBlocks = 0;
    const blockSizes: number[] = [];
    let totalDataProcessed = 0;
    const transactionTypeDistribution: Record<number, { count: number, totalFees: number }> = {};
    const generators: Record<string, number> = {};
    let totalRewards = 0;
    let totalFees = 0;
    const transactionFees: number[] = [];
    const transactionSizes: number[] = [];
    let totalTransactionVolumeNative = 0;
    const transferAmounts: number[] = [];
    const issueAssetFees: number[] = [];
    const leaseAmounts: number[] = [];
    let dataTransactionCount = 0;
    let invokeScriptCount = 0;
    let largestSingleTransaction = 0;
    const uniqueSenders = new Set<string>();
    const uniqueRecipients = new Set<string>();
    const assetActivity: Record<string, { transactionCount: number, totalVolume: number }> = {};
    const hourlyActivity = Array(24).fill(0).map((_, i) => ({ hour: i, transactions: 0, blocks: 0 }));
    const dailyActivity = Array(7).fill(0).map((_, i) => ({ day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i], transactions: 0, blocks: 0 }));

    for (const block of blocks) {
      const txCount = block.transactionCount || (block.transactions ? block.transactions.length : 0);
      totalTxs += txCount;
      txPerBlock.push(txCount);
      
      if (txCount === 0) emptyBlocks++;
      
      const blockSize = block.blocksize || 0;
      blockSizes.push(blockSize);
      totalDataProcessed += blockSize;
      
      // Generator tracking
      if (block.generator) {
        generators[block.generator] = (generators[block.generator] || 0) + 1;
      }
      
      // Block rewards - use 'reward' field if available, otherwise 'desiredReward'
      // Convert from atomic units (10^8) to DCC
      const blockReward = block.reward !== undefined ? block.reward : (block.desiredReward > 0 ? block.desiredReward : 0);
      totalRewards += blockReward / ATOMIC_UNITS;
      
      // Block fees - use block-level 'totalFee' field (already in atomic units)
      // This is the total of all transaction fees in this block, in DCC atomic units
      const blockTotalFee = block.totalFee || block.fee || 0;
      totalFees += blockTotalFee / ATOMIC_UNITS;
      
      // Hourly and daily activity
      const blockDate = new Date(block.timestamp);
      const hour = blockDate.getHours();
      const day = blockDate.getDay();
      hourlyActivity[hour].blocks++;
      dailyActivity[day].blocks++;
      
      // Process transactions
      if (block.transactions) {
        for (const tx of block.transactions) {
          const txType = tx.type;
          
          // Type distribution
          if (!transactionTypeDistribution[txType]) {
            transactionTypeDistribution[txType] = { count: 0, totalFees: 0 };
          }
          transactionTypeDistribution[txType].count++;
          
          // Individual transaction fee - convert from atomic units
          // Note: feeAssetId: null means DCC was used as the fee
          const feeInDCC = (tx.fee || 0) / ATOMIC_UNITS;
          transactionTypeDistribution[txType].totalFees += feeInDCC;
          transactionFees.push(feeInDCC);
          
          // Transaction size
          const txSize = JSON.stringify(tx).length;
          transactionSizes.push(txSize);
          
          // Senders and recipients
          if (tx.sender) uniqueSenders.add(tx.sender);
          if (tx.recipient) uniqueRecipients.add(tx.recipient);
          
          // Type-specific analysis
          if (txType === 4) { // Transfer
            const amountInAtomic = tx.amount || 0;
            // Check if it's a native DCC transfer (no assetId or assetId is null/WAVES/DCC)
            if (!tx.assetId || tx.assetId === "WAVES" || tx.assetId === "DCC") {
              // Native token transfer - convert from atomic units
              const amountInDCC = amountInAtomic / ATOMIC_UNITS;
              totalTransactionVolumeNative += amountInDCC;
              transferAmounts.push(amountInDCC);
              
              if (amountInDCC > largestSingleTransaction) {
                largestSingleTransaction = amountInDCC;
              }
            }
            
            // Asset activity tracking (keep in atomic units for aggregation)
            const assetId = tx.assetId || "DCC";
            if (!assetActivity[assetId]) {
              assetActivity[assetId] = { transactionCount: 0, totalVolume: 0 };
            }
            assetActivity[assetId].transactionCount++;
            assetActivity[assetId].totalVolume += amountInAtomic;
          } else if (txType === 3) { // Issue Asset
            issueAssetFees.push(feeInDCC);
          } else if (txType === 8 || txType === 9) { // Lease / Lease Cancel
            if (tx.amount) leaseAmounts.push(tx.amount / ATOMIC_UNITS);
          } else if (txType === 12) { // Data Transaction
            dataTransactionCount++;
          } else if (txType === 16) { // Invoke Script
            invokeScriptCount++;
          }
          
          // Hourly activity
          hourlyActivity[hour].transactions++;
          dailyActivity[day].transactions++;
        }
      }
    }

    // Block size distribution
    const blockSizeDistribution: Record<string, number> = {};
    for (const size of blockSizes) {
      // Buckets by 10KB
      const bucket = `${Math.floor(size / 10000) * 10}k-${Math.floor(size / 10000) * 10 + 10}k`;
      blockSizeDistribution[bucket] = (blockSizeDistribution[bucket] || 0) + 1;
    }

    // Calculate averages and metrics
    const avgBlockSize = blockSizes.reduce((sum, s) => sum + s, 0) / blockSizes.length || 0;
    const maxBlockSize = Math.max(...blockSizes, 0);
    const avgTxPerBlock = totalTxs / blocks.length || 0;
    const maxTxInBlock = Math.max(...txPerBlock, 0);
    
    // FIX: min_tx_in_block should be 0 if all blocks are empty, otherwise minimum non-zero value
    const nonEmptyBlocks = txPerBlock.filter(count => count > 0);
    const minTxInBlock = nonEmptyBlocks.length > 0 ? Math.min(...nonEmptyBlocks) : 0;
    
    const emptyBlocksPercentage = (emptyBlocks / blocks.length) * 100 || 0;
    
    // TPS calculation
    const totalTimeSeconds = blockTimes.reduce((sum, t) => sum + t, 0);
    const tps = totalTimeSeconds > 0 ? totalTxs / totalTimeSeconds : 0;
    const theoreticalMaxTps = avgBlockTime > 0 ? maxTxInBlock / avgBlockTime : 0;
    const networkUtilization = theoreticalMaxTps > 0 ? (tps / theoreticalMaxTps) * 100 : 0;
    
    // Fee statistics (already in DCC)
    transactionFees.sort((a, b) => a - b);
    const avgTransactionFee = transactionFees.length > 0 ? transactionFees.reduce((sum, f) => sum + f, 0) / transactionFees.length : 0;
    const medianTransactionFee = transactionFees.length > 0 ? transactionFees[Math.floor(transactionFees.length / 2)] : 0;
    
    // Transaction size statistics
    const avgTransactionSize = transactionSizes.length > 0 ? transactionSizes.reduce((sum, s) => sum + s, 0) / transactionSizes.length : 0;
    const totalTransactionData = transactionSizes.reduce((sum, s) => sum + s, 0);
    const transactionFeesPerByte = totalTransactionData > 0 ? totalFees / totalTransactionData : 0;
    
    // Transfer statistics (already in DCC)
    transferAmounts.sort((a, b) => a - b);
    const avgTransferAmount = transferAmounts.length > 0 ? transferAmounts.reduce((sum, a) => sum + a, 0) / transferAmounts.length : 0;
    const medianTransferAmount = transferAmounts.length > 0 ? transferAmounts[Math.floor(transferAmounts.length / 2)] : 0;
    
    // Other averages (already in DCC)
    const avgIssueAssetFee = issueAssetFees.length > 0 ? issueAssetFees.reduce((sum, f) => sum + f, 0) / issueAssetFees.length : 0;
    const avgLeaseAmount = leaseAmounts.length > 0 ? leaseAmounts.reduce((sum, a) => sum + a, 0) / leaseAmounts.length : 0;
    const avgReward = blocks.length > 0 ? totalRewards / blocks.length : 0;
    
    // Data and smart contract percentages
    const percentageDataTransactions = totalTxs > 0 ? (dataTransactionCount / totalTxs) * 100 : 0;
    const percentageInvokeScriptTransactions = totalTxs > 0 ? (invokeScriptCount / totalTxs) * 100 : 0;
    
    // Transaction burstiness (variance in tx per block)
    const avgTxCount = txPerBlock.reduce((sum, count) => sum + count, 0) / txPerBlock.length || 0;
    const txVariance = txPerBlock.reduce((sum, count) => sum + Math.pow(count - avgTxCount, 2), 0) / txPerBlock.length || 0;
    const txBurstiness = Math.sqrt(txVariance);
    
    // Generator statistics (top generators and Gini coefficient for decentralization)
    const generatorList = Object.entries(generators).map(([address, blocks_generated]) => ({
      address,
      blocks_generated,
      percentage: (blocks_generated / blocksAnalyzed) * 100
    })).sort((a, b) => b.blocks_generated - a.blocks_generated);
    
    const topGenerators = generatorList.slice(0, 10);
    const uniqueGenerators = generatorList.length;
    
    // Gini coefficient calculation for generator concentration
    const sortedGeneratorBlocks = generatorList.map(g => g.blocks_generated).sort((a, b) => a - b);
    let giniSum = 0;
    for (let i = 0; i < sortedGeneratorBlocks.length; i++) {
      giniSum += (2 * (i + 1) - sortedGeneratorBlocks.length - 1) * sortedGeneratorBlocks[i];
    }
    const giniCoefficient = sortedGeneratorBlocks.length > 0
      ? giniSum / (sortedGeneratorBlocks.length * sortedGeneratorBlocks.reduce((sum, b) => sum + b, 0))
      : 0;
    
    // Top active assets - convert volumes from atomic units for DCC
    const topActiveAssets = Object.entries(assetActivity)
      .map(([assetId, data]) => ({
        assetId,
        transactionCount: data.transactionCount,
        // Convert volume from atomic units for DCC/WAVES, leave others as-is
        totalVolume: (assetId === "DCC" || assetId === "WAVES") 
          ? data.totalVolume / ATOMIC_UNITS 
          : data.totalVolume
      }))
      .sort((a, b) => b.totalVolume - a.totalVolume)
      .slice(0, 20);
    
    // Total value transferred by asset - convert for DCC
    const totalValueTransferredByAsset: Record<string, number> = {};
    Object.entries(assetActivity).forEach(([assetId, data]) => {
      totalValueTransferredByAsset[assetId] = (assetId === "DCC" || assetId === "WAVES")
        ? data.totalVolume / ATOMIC_UNITS 
        : data.totalVolume;
    });
    
    // Asset issuance count
    const newAssetsIssued = transactionTypeDistribution[3]?.count || 0;
    
    // Network health score (0-100) - weighted calculation
    const healthFactors = [
      Math.min(tps / 10, 1) * 20, // TPS factor (up to 20 points)
      Math.min(uniqueGenerators / 10, 1) * 15, // Decentralization (up to 15 points)
      (1 - Math.min(emptyBlocksPercentage / 100, 1)) * 15, // Block utilization (up to 15 points)
      Math.min(networkUtilization / 100, 1) * 20, // Network utilization (up to 20 points)
      (1 - Math.min(giniCoefficient, 1)) * 15, // Fairness of generator distribution (up to 15 points)
      Math.min(uniqueSenders.size / 100, 1) * 15, // Active participation (up to 15 points)
    ];
    const networkHealthScore = healthFactors.reduce((sum, factor) => sum + factor, 0);
    
    // Fetch peer information
    let connectedPeers = 0;
    let totalKnownPeers = 0;
    let peerVersionDistribution: { version: string; count: number; }[] = [];
    let nodeVersion = "unknown";
    
    try {
      const peersData = await apiRequest(`${nodeUrl}/peers/connected`);
      connectedPeers = peersData?.peers?.length || 0;
      
      const allPeersData = await apiRequest(`${nodeUrl}/peers/all`);
      totalKnownPeers = allPeersData?.peers?.length || 0;
      
      // Peer version distribution
      const versionCounts: Record<string, number> = {};
      if (peersData?.peers) {
        for (const peer of peersData.peers) {
          const version = peer.applicationVersion || "unknown";
          versionCounts[version] = (versionCounts[version] || 0) + 1;
        }
      }
      peerVersionDistribution = Object.entries(versionCounts).map(([version, count]) => ({
        version,
        count
      }));
      
      const versionData = await apiRequest(`${nodeUrl}/node/version`);
      nodeVersion = versionData?.version || "unknown";
    } catch (error: any) {
      console.log("Could not fetch peer data:", error.message);
    }
    
    // Calculate CR Coin specific metrics
    const crcMetrics = await calculateCRCoinMetrics(blocks, nodeUrl);
    
    // Fetch previous snapshot for cumulative calculations - USE SERVICE ROLE
    let previousSnapshot = null;
    try {
      const previousSnapshots = await base44.asServiceRole.entities.BlockchainSnapshot.list('-snapshot_height', 1);
      if (previousSnapshots && previousSnapshots.length > 0) {
        const olderSnapshots = previousSnapshots.filter(s => s.snapshot_height < snapshotHeight);
        if (olderSnapshots.length > 0) {
          previousSnapshot = olderSnapshots.sort((a, b) => b.snapshot_height - a.snapshot_height)[0];
        }
      }
    } catch (error: any) {
      console.log('No previous snapshot found or error fetching:', error.message);
      previousSnapshot = null;
    }

    // Cumulative unique senders and recipients
    let previousSendersSet = new Set<string>();
    let previousRecipientsSet = new Set<string>();
    
    // If there's a previous snapshot, get its cumulative data
    if (previousSnapshot) {
      console.log(`Found previous snapshot at height ${previousSnapshot.snapshot_height}`);
      
      if (previousSnapshot.crc_unique_senders_addresses && Array.isArray(previousSnapshot.crc_unique_senders_addresses)) {
        previousSendersSet = new Set<string>(previousSnapshot.crc_unique_senders_addresses);
      }
      
      if (previousSnapshot.crc_unique_recipients_addresses && Array.isArray(previousSnapshot.crc_unique_recipients_addresses)) {
        previousRecipientsSet = new Set<string>(previousSnapshot.crc_unique_recipients_addresses);
      }
    } else {
      console.log('No previous snapshot found - starting cumulative counts from zero');
    }

    // Merge current period with previous cumulative
    const cumulativeSenders = new Set<string>([...previousSendersSet, ...crcMetrics.currentPeriodSenders]);
    const cumulativeRecipients = new Set<string>([...previousRecipientsSet, ...crcMetrics.currentPeriodRecipients]);
    
    // New users in this period
    const newSendersThisPeriod = [...crcMetrics.currentPeriodSenders]
      .filter(addr => !previousSendersSet.has(addr)).length;
    const newRecipientsThisPeriod = [...crcMetrics.currentPeriodRecipients]
      .filter(addr => !previousRecipientsSet.has(addr)).length;
    
    // Processing time
    const processingTimeMs = Date.now() - startTime;
    
    // Create snapshot object
    const snapshotData = {
      snapshot_height: snapshotHeight,
      snapshot_timestamp: snapshotTimestamp,
      blocks_analyzed: blocksAnalyzed,
      
      // Block time statistics
      avg_block_time: avgBlockTime,
      median_block_time: medianBlockTime,
      min_block_time: minBlockTime,
      max_block_time: maxBlockTime,
      std_deviation_block_time: stdDeviationBlockTime,
      block_time_distribution: blockTimeDistribution,
      
      // Transaction statistics
      tps: parseFloat(tps.toFixed(3)),
      total_txs: totalTxs,
      avg_tx_per_block: avgTxPerBlock,
      max_tx_in_block: maxTxInBlock,
      min_tx_in_block: minTxInBlock, // FIXED: Now always has a value
      empty_blocks: emptyBlocks,
      empty_blocks_percentage: parseFloat(emptyBlocksPercentage.toFixed(2)),
      
      // Block size statistics
      avg_block_size: Math.round(avgBlockSize),
      max_block_size: maxBlockSize,
      total_data_processed: totalDataProcessed,
      block_size_distribution: blockSizeDistribution,
      
      // Generator statistics
      unique_generators: uniqueGenerators,
      gini_coefficient: parseFloat(giniCoefficient.toFixed(4)),
      top_generators: topGenerators,
      
      // Rewards - FIXED: Now properly calculated
      total_rewards: parseFloat(totalRewards.toFixed(8)),
      avg_reward: parseFloat(avgReward.toFixed(8)),
      
      // Network health
      network_health_score: parseFloat(networkHealthScore.toFixed(1)),
      theoretical_max_tps: parseFloat(theoreticalMaxTps.toFixed(3)),
      network_utilization: parseFloat(networkUtilization.toFixed(2)),
      
      // Transaction type distribution
      transaction_type_distribution: transactionTypeDistribution,
      
      // Activity patterns
      hourly_activity: hourlyActivity,
      daily_activity: dailyActivity,
      
      // Peer information
      connected_peers: connectedPeers,
      total_known_peers: totalKnownPeers,
      peer_version_distribution: peerVersionDistribution,
      node_version: nodeVersion,
      
      // Processing metadata
      processing_time_ms: processingTimeMs,
      
      // Fee statistics
      avg_transaction_fee: parseFloat(avgTransactionFee.toFixed(8)),
      median_transaction_fee: parseFloat(medianTransactionFee.toFixed(8)),
      total_fees_collected: parseFloat(totalFees.toFixed(8)),
      
      // User activity
      unique_active_addresses: uniqueSenders.size + uniqueRecipients.size,
      unique_senders: uniqueSenders.size,
      unique_recipients: uniqueRecipients.size,
      
      // Asset activity
      top_active_assets: topActiveAssets,
      new_assets_issued: newAssetsIssued,
      total_value_transferred_by_asset: totalValueTransferredByAsset,
      
      // General transaction metrics - FIXED: Now properly calculated
      total_transaction_volume_native: parseFloat(totalTransactionVolumeNative.toFixed(8)),
      avg_transaction_size_bytes: Math.round(avgTransactionSize),
      transaction_fees_per_byte: parseFloat(transactionFeesPerByte.toFixed(8)),
      percentage_data_transactions: parseFloat(percentageDataTransactions.toFixed(2)),
      percentage_invoke_script_transactions: parseFloat(percentageInvokeScriptTransactions.toFixed(2)),
      largest_single_transaction_value: parseFloat(largestSingleTransaction.toFixed(8)), // FIXED
      transaction_burstiness: parseFloat(txBurstiness.toFixed(3)),
      avg_transfer_amount: parseFloat(avgTransferAmount.toFixed(8)), // FIXED
      median_transfer_amount: parseFloat(medianTransferAmount.toFixed(8)), // FIXED
      avg_issue_asset_fee: parseFloat(avgIssueAssetFee.toFixed(8)), // FIXED
      avg_lease_amount: parseFloat(avgLeaseAmount.toFixed(8)), // FIXED
      
      // CR Coin specific metrics
      crc_total_transfer_volume: parseFloat(crcMetrics.totalTransferVolume.toFixed(8)),
      crc_average_transfer_amount: parseFloat(crcMetrics.averageTransferAmount.toFixed(8)),
      crc_median_transfer_amount: parseFloat(crcMetrics.medianTransferAmount.toFixed(8)),
      crc_transfer_count: crcMetrics.transferCount,
      crc_last_price_dcc: crcMetrics.lastPrice,
      crc_24h_price_change_percent_dcc: parseFloat(crcMetrics.priceChange24h.toFixed(2)), // Ensure this is formatted correctly
      crc_24h_high_price_dcc: crcMetrics.high24h,
      crc_24h_low_price_dcc: crcMetrics.low24h,
      crc_weighted_average_price_dcc: crcMetrics.weightedAvgPrice,
      crc_24h_total_trading_volume_dcc: crcMetrics.tradingVolume24h,
      crc_24h_total_quote_volume_dcc: crcMetrics.quoteVolume24h,
      crc_total_24h_trades_count: crcMetrics.tradesCount,
      crc_active_trading_pairs_count: crcMetrics.activePairs,
      crc_unique_senders_cumulative: cumulativeSenders.size,
      crc_unique_recipients_cumulative: cumulativeRecipients.size,
      crc_unique_senders_addresses: Array.from(cumulativeSenders),
      crc_unique_recipients_addresses: Array.from(cumulativeRecipients),
      crc_new_senders_this_period: newSendersThisPeriod,
      crc_new_recipients_this_period: newRecipientsThisPeriod,
    };
    
    // Save snapshot to database
    console.log('Saving snapshot to database...');
    const snapshot = await base44.asServiceRole.entities.BlockchainSnapshot.create(snapshotData);
    console.log(`Snapshot saved successfully with ID: ${snapshot.id}`);
    
    const processingTime = Date.now() - startTime;
    console.log(`✓ Snapshot created successfully in ${processingTime}ms`);

    return Response.json({
      success: true,
      snapshot: {
        id: snapshot.id,
        height: snapshotHeight,
        blocks_analyzed: blocksAnalyzed,
        from_height: fromHeight,
        to_height: toHeight,
        processing_time_ms: processingTime,
      },
      message: `Snapshot generated successfully for height ${snapshotHeight}`
    });
    
  } catch (error: any) {
    console.error('Error generating snapshot:', error);
    console.error('Stack trace:', error.stack);
    return Response.json({ 
      success: false,
      error: error.message,
      stack: error.stack,
      details: 'Check function logs for more information'
    }, { status: 500 });
  }
});
