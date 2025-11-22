import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

const BLOCKS_PER_SNAPSHOT = 30;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    // Fetch all existing snapshots to find the lowest height
    const allSnapshotsResult = await base44.asServiceRole.entities.BlockchainSnapshot.list('', 10000);
    const allSnapshots = Array.isArray(allSnapshotsResult) ? allSnapshotsResult : [];
    
    if (allSnapshots.length === 0) {
      // No snapshots exist yet, start from current height
      return Response.json({
        success: false,
        message: 'No existing snapshots found. Please generate a snapshot for current height first.',
        action_required: 'Call generateBlockchainSnapshot without parameters to create initial snapshot'
      });
    }

    // Find the lowest snapshot height
    const lowestHeight = Math.min(...allSnapshots.map(s => s.snapshot_height));
    
    console.log(`Lowest existing snapshot height: ${lowestHeight}`);
    
    // Calculate the next target height for backfilling
    const targetHeight = lowestHeight - BLOCKS_PER_SNAPSHOT;
    
    // Check if we've reached the genesis block
    if (targetHeight <= 0) {
      return Response.json({
        success: false,
        message: 'Backfilling complete! Reached genesis block.',
        lowest_snapshot_height: lowestHeight,
        total_snapshots: allSnapshots.length
      });
    }

    console.log(`Generating snapshot for target height: ${targetHeight}`);

    // Call generateBlockchainSnapshot with the target height
    const snapshotResponse = await base44.asServiceRole.functions.invoke('generateBlockchainSnapshot', {
      height: targetHeight
    });

    if (snapshotResponse.data.success) {
      return Response.json({
        success: true,
        message: `Backfill snapshot created successfully`,
        snapshot: snapshotResponse.data.snapshot,
        next_target_height: targetHeight - BLOCKS_PER_SNAPSHOT > 0 ? targetHeight - BLOCKS_PER_SNAPSHOT : null,
        progress: {
          current_lowest_height: targetHeight,
          previous_lowest_height: lowestHeight,
          total_snapshots: allSnapshots.length + 1,
          estimated_blocks_to_genesis: targetHeight
        }
      });
    } else {
      return Response.json({
        success: false,
        message: snapshotResponse.data.message || 'Failed to create backfill snapshot',
        error: snapshotResponse.data.error
      });
    }

  } catch (error) {
    console.error('Error in backfill process:', error);
    return Response.json({ 
      success: false,
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});