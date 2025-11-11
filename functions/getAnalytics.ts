import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // NO AUTHENTICATION REQUIRED - This endpoint is public
    
    // Parse query parameters
    const url = new URL(req.url);
    const timeRange = url.searchParams.get('timeRange') || '7d';
    const startDateParam = url.searchParams.get('start_date'); // Format: YYYY-MM-DD
    const endDateParam = url.searchParams.get('end_date');     // Format: YYYY-MM-DD
    
    // Calculate date range
    const now = new Date();
    let startDate;
    let endDate = now;
    
    // If explicit dates are provided, use them
    if (startDateParam && endDateParam) {
      try {
        startDate = new Date(startDateParam);
        endDate = new Date(endDateParam);
        
        // Set end date to end of day (23:59:59.999)
        endDate.setHours(23, 59, 59, 999);
        
        // Validate dates
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          return Response.json({ 
            success: false,
            error: 'Invalid date format. Use YYYY-MM-DD format for start_date and end_date.' 
          }, { status: 400 });
        }
        
        if (startDate > endDate) {
          return Response.json({ 
            success: false,
            error: 'start_date must be before or equal to end_date.' 
          }, { status: 400 });
        }
        
        console.log(`Using explicit date range: ${startDate.toISOString()} to ${endDate.toISOString()}`);
      } catch (error) {
        return Response.json({ 
          success: false,
          error: `Error parsing dates: ${error.message}` 
        }, { status: 400 });
      }
    } else {
      // Fall back to relative timeRange
      startDate = new Date();
      
      switch (timeRange) {
        case '24h':
          startDate.setHours(now.getHours() - 24);
          break;
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(now.getDate() - 90);
          break;
        case 'all':
          startDate = new Date(0); // Beginning of time
          break;
        default:
          startDate.setDate(now.getDate() - 7);
      }
      
      console.log(`Using relative time range: ${timeRange}`);
    }
    
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();
    
    // ============================================
    // 1. HISTORICAL BLOCKCHAIN ANALYTICS
    // ============================================
    const allSnapshotsResult = await base44.asServiceRole.entities.BlockchainSnapshot.list('-snapshot_height');
    
    // FIX: Ensure allSnapshots is always an array
    const allSnapshots = Array.isArray(allSnapshotsResult) ? allSnapshotsResult : [];
    
    const filteredSnapshots = allSnapshots.filter(s => 
      s.snapshot_timestamp >= startTimestamp && s.snapshot_timestamp <= endTimestamp
    );
    
    // Calculate aggregated totals across all snapshots
    const aggregatedTotals = {
      totalTransactions: filteredSnapshots.reduce((sum, s) => sum + (s.total_txs || 0), 0),
      totalBlocks: filteredSnapshots.reduce((sum, s) => sum + (s.blocks_analyzed || 0), 0),
      totalFeesCollected: filteredSnapshots.reduce((sum, s) => sum + (s.total_fees_collected || 0), 0),
      totalRewards: filteredSnapshots.reduce((sum, s) => sum + (s.total_rewards || 0), 0),
      totalDataProcessed: filteredSnapshots.reduce((sum, s) => sum + (s.total_data_processed || 0), 0),
      totalNativeVolumeTransferred: filteredSnapshots.reduce((sum, s) => sum + (s.total_transaction_volume_native || 0), 0),
      totalCRCVolumeTransferred: filteredSnapshots.reduce((sum, s) => sum + (s.crc_total_transfer_volume || 0), 0),
      totalCRCTransferCount: filteredSnapshots.reduce((sum, s) => sum + (s.crc_transfer_count || 0), 0),
      totalCRCTradingVolume: filteredSnapshots.reduce((sum, s) => sum + (s.crc_24h_total_trading_volume_dcc || 0), 0),
      totalCRCTradesCount: filteredSnapshots.reduce((sum, s) => sum + (s.crc_total_24h_trades_count || 0), 0),
      totalNewAssetsIssued: filteredSnapshots.reduce((sum, s) => sum + (s.new_assets_issued || 0), 0),
      totalEmptyBlocks: filteredSnapshots.reduce((sum, s) => sum + (s.empty_blocks || 0), 0),
    };
    
    const historicalBlockchainAnalytics = {
      totalSnapshots: filteredSnapshots.length,
      aggregatedTotals,
      latestSnapshot: filteredSnapshots[0] || null,
      avgTPS: filteredSnapshots.length > 0 
        ? filteredSnapshots.reduce((sum, s) => sum + (s.tps || 0), 0) / filteredSnapshots.length 
        : 0,
      avgHealthScore: filteredSnapshots.length > 0
        ? filteredSnapshots.reduce((sum, s) => sum + (s.network_health_score || 0), 0) / filteredSnapshots.length
        : 0,
      avgBlockTime: filteredSnapshots.length > 0
        ? filteredSnapshots.reduce((sum, s) => sum + (s.avg_block_time || 0), 0) / filteredSnapshots.length
        : 0,
      tpsGrowth: filteredSnapshots.length >= 2
        ? (((filteredSnapshots[0].tps - filteredSnapshots[filteredSnapshots.length - 1].tps) / 
            (filteredSnapshots[filteredSnapshots.length - 1].tps || 1)) * 100)
        : 0,
      healthGrowth: filteredSnapshots.length >= 2
        ? (filteredSnapshots[0].network_health_score - filteredSnapshots[filteredSnapshots.length - 1].network_health_score)
        : 0,
      tpsOverTime: filteredSnapshots.slice().reverse().map(s => ({
        height: s.snapshot_height,
        tps: s.tps || 0,
        timestamp: s.snapshot_timestamp,
      })),
      healthScoreOverTime: filteredSnapshots.slice().reverse().map(s => ({
        height: s.snapshot_height,
        score: s.network_health_score || 0,
        timestamp: s.snapshot_timestamp,
      })),
      blockTimeOverTime: filteredSnapshots.slice().reverse().map(s => ({
        height: s.snapshot_height,
        avgBlockTime: s.avg_block_time || 0,
        timestamp: s.snapshot_timestamp,
      })),
    };
    
    // ============================================
    // 2. CR COIN ANALYTICS
    // ============================================
    const crCoinSnapshots = filteredSnapshots.filter(s => s.crc_last_price_dcc !== undefined);
    
    const crCoinAnalytics = {
      totalSnapshots: crCoinSnapshots.length,
      latestSnapshot: crCoinSnapshots[0] || null,
      priceGrowth: crCoinSnapshots.length >= 2
        ? (((crCoinSnapshots[0].crc_last_price_dcc - crCoinSnapshots[crCoinSnapshots.length - 1].crc_last_price_dcc) / 
            (crCoinSnapshots[crCoinSnapshots.length - 1].crc_last_price_dcc || 1)) * 100)
        : 0,
      volumeGrowth: crCoinSnapshots.length >= 2
        ? (((crCoinSnapshots[0].crc_24h_total_trading_volume_dcc - crCoinSnapshots[crCoinSnapshots.length - 1].crc_24h_total_trading_volume_dcc) / 
            (crCoinSnapshots[crCoinSnapshots.length - 1].crc_24h_total_trading_volume_dcc || 1)) * 100)
        : 0,
      totalNewSenders: crCoinSnapshots.reduce((sum, s) => sum + (s.crc_new_senders_this_period || 0), 0),
      totalNewRecipients: crCoinSnapshots.reduce((sum, s) => sum + (s.crc_new_recipients_this_period || 0), 0),
      priceOverTime: crCoinSnapshots.slice().reverse().map(s => ({
        height: s.snapshot_height,
        price: s.crc_last_price_dcc || 0,
        timestamp: s.snapshot_timestamp,
      })),
      volumeOverTime: crCoinSnapshots.slice().reverse().map(s => ({
        height: s.snapshot_height,
        volume: s.crc_24h_total_trading_volume_dcc || 0,
        timestamp: s.snapshot_timestamp,
      })),
      holdersOverTime: crCoinSnapshots.slice().reverse().map(s => ({
        height: s.snapshot_height,
        senders: s.crc_unique_senders_cumulative || 0,
        recipients: s.crc_unique_recipients_cumulative || 0,
        timestamp: s.snapshot_timestamp,
      })),
    };
    
    // ============================================
    // 3. WEBSITE METRICS
    // ============================================
    const allPageViewsResult = await base44.asServiceRole.entities.PageView.list('-created_date');
    const allPageViews = Array.isArray(allPageViewsResult) ? allPageViewsResult : [];
    
    const filteredPageViews = allPageViews.filter(pv => {
      const pvDate = new Date(pv.created_date);
      return pvDate >= startDate && pvDate <= endDate;
    });
    
    const uniqueVisitors = new Set(filteredPageViews.map(pv => pv.visitor_id)).size;
    const uniqueSessions = new Set(filteredPageViews.map(pv => pv.session_id)).size;
    
    // Bounce rate: sessions with only 1 page view
    const sessionPageCounts = {};
    filteredPageViews.forEach(pv => {
      sessionPageCounts[pv.session_id] = (sessionPageCounts[pv.session_id] || 0) + 1;
    });
    const bouncedSessions = Object.values(sessionPageCounts).filter(count => count === 1).length;
    const bounceRate = uniqueSessions > 0 ? (bouncedSessions / uniqueSessions) * 100 : 0;
    
    // Average time on page
    const avgTimeOnPage = filteredPageViews.length > 0
      ? filteredPageViews.reduce((sum, pv) => sum + (pv.time_on_page || 0), 0) / filteredPageViews.length
      : 0;
    
    // Top pages
    const pageCounts = {};
    filteredPageViews.forEach(pv => {
      pageCounts[pv.page_path] = (pageCounts[pv.page_path] || 0) + 1;
    });
    const topPages = Object.entries(pageCounts)
      .map(([page, count]) => ({ page, views: count }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
    
    // Traffic sources
    const sourceCounts = {};
    filteredPageViews.forEach(pv => {
      const source = pv.referrer === 'direct' ? 'Direct' : new URL(pv.referrer || 'direct://').hostname || 'Direct';
      sourceCounts[source] = (sourceCounts[source] || 0) + 1;
    });
    const topSources = Object.entries(sourceCounts)
      .map(([source, count]) => ({ source, views: count }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
    
    // Device breakdown
    const deviceCounts = { desktop: 0, mobile: 0, tablet: 0, unknown: 0 };
    filteredPageViews.forEach(pv => {
      deviceCounts[pv.device_type || 'unknown']++;
    });
    const deviceData = Object.entries(deviceCounts).map(([name, value]) => ({ name, value }));
    
    // Browser breakdown
    const browserCounts = {};
    filteredPageViews.forEach(pv => {
      browserCounts[pv.browser || 'Unknown'] = (browserCounts[pv.browser || 'Unknown'] || 0) + 1;
    });
    const browserData = Object.entries(browserCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    
    // Daily traffic trends
    const dailyTraffic = {};
    filteredPageViews.forEach(pv => {
      const date = new Date(pv.created_date).toISOString().split('T')[0];
      dailyTraffic[date] = (dailyTraffic[date] || 0) + 1;
    });
    const dailyTrends = Object.entries(dailyTraffic)
      .map(([date, views]) => ({ date, views }))
      .sort((a, b) => a.date.localeCompare(b.date));
    
    // Hourly distribution
    const hourlyDist = Array(24).fill(0);
    filteredPageViews.forEach(pv => {
      const hour = new Date(pv.created_date).getHours();
      hourlyDist[hour]++;
    });
    const hourlyDistribution = hourlyDist.map((views, hour) => ({ hour, views }));
    
    const websiteMetrics = {
      totalPageViews: filteredPageViews.length,
      uniqueVisitors,
      uniqueSessions,
      bounceRate,
      avgTimeOnPage,
      topPages,
      topSources,
      deviceData,
      browserData,
      dailyTrends,
      hourlyDistribution,
    };
    
    // ============================================
    // 4. PLATFORM ANALYTICS
    // ============================================
    const allUsersResult = await base44.asServiceRole.entities.User.list();
    const allUsers = Array.isArray(allUsersResult) ? allUsersResult : [];
    
    const recentlyActiveUsers = allUsers.filter(u => {
      const lastActive = new Date(u.updated_date);
      return lastActive >= startDate && lastActive <= endDate;
    });
    
    const nodeOwners = allUsers.filter(u => u.node_owner === true);
    const avgOwnership = nodeOwners.length > 0
      ? nodeOwners.reduce((sum, u) => sum + (u.node_ownership_percentage || 0), 0) / nodeOwners.length
      : 0;
    const totalLockedDCC = nodeOwners.reduce((sum, u) => sum + (u.locked_dcc_tokens || 0), 0);
    
    const platformAnalytics = {
      totalUsers: allUsers.length,
      recentlyActive: recentlyActiveUsers.length,
      nodeOwnerCount: nodeOwners.length,
      avgOwnership,
      totalLockedDCC,
    };
    
    // ============================================
    // 5. WITHDRAWAL ANALYTICS
    // ============================================
    const allWithdrawalsResult = await base44.asServiceRole.entities.WithdrawalRequest.list('-created_date');
    const allWithdrawals = Array.isArray(allWithdrawalsResult) ? allWithdrawalsResult : [];
    
    const filteredWithdrawals = allWithdrawals.filter(w => {
      const wDate = new Date(w.created_date);
      return wDate >= startDate && wDate <= endDate;
    });
    
    const statusCount = { pending: 0, approved: 0, rejected: 0, completed: 0 };
    filteredWithdrawals.forEach(w => {
      statusCount[w.status]++;
    });
    
    const totalUSD = filteredWithdrawals.reduce((sum, w) => sum + (w.usd_equivalent || 0), 0);
    const pendingUSD = filteredWithdrawals
      .filter(w => w.status === 'pending')
      .reduce((sum, w) => sum + (w.usd_equivalent || 0), 0);
    const avgWithdrawal = filteredWithdrawals.length > 0 ? totalUSD / filteredWithdrawals.length : 0;
    
    const withdrawalAnalytics = {
      total: filteredWithdrawals.length,
      statusCount,
      totalUSD,
      pendingUSD,
      avgWithdrawal,
    };
    
    // ============================================
    // 6. LOGO REQUEST ANALYTICS
    // ============================================
    const allLogoRequestsResult = await base44.asServiceRole.entities.AssetLogoRequest.list('-created_date');
    const allLogoRequests = Array.isArray(allLogoRequestsResult) ? allLogoRequestsResult : [];
    
    const filteredLogoRequests = allLogoRequests.filter(lr => {
      const lrDate = new Date(lr.created_date);
      return lrDate >= startDate && lrDate <= endDate;
    });
    
    const logoStatusCount = { pending: 0, approved: 0, rejected: 0 };
    filteredLogoRequests.forEach(lr => {
      logoStatusCount[lr.status]++;
    });
    
    const approvalRate = filteredLogoRequests.length > 0
      ? (logoStatusCount.approved / filteredLogoRequests.length) * 100
      : 0;
    
    const logoAnalytics = {
      total: filteredLogoRequests.length,
      statusCount: logoStatusCount,
      approvalRate,
    };
    
    // ============================================
    // RETURN COMBINED ANALYTICS
    // ============================================
    return Response.json({
      success: true,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        ...(startDateParam && endDateParam 
          ? { start_date: startDateParam, end_date: endDateParam }
          : { timeRange }
        )
      },
      data: {
        blockchain: historicalBlockchainAnalytics,
        crCoin: crCoinAnalytics,
        website: websiteMetrics,
        platform: platformAnalytics,
        withdrawals: withdrawalAnalytics,
        logoRequests: logoAnalytics,
      },
      metadata: {
        generated_at: new Date().toISOString(),
        api_version: '1.0',
      }
    });
    
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return Response.json({ 
      success: false,
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});