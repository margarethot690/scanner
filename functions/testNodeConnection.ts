import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { validateNodeUrl } from './_shared/validation.ts';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Parse request body to get the node URL
        const { nodeUrl } = await req.json();

        if (!nodeUrl) {
            return Response.json({ 
                error: 'Node URL is required' 
            }, { status: 400 });
        }

        // Validate and sanitize the URL to prevent SSRF
        const cleanUrl = validateNodeUrl(nodeUrl, '');
        const testEndpoint = `${cleanUrl}/node/status`;

        console.log(`Testing connection to: ${testEndpoint}`);

        try {
            // Make request to the node's status endpoint
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

            const response = await fetch(testEndpoint, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                return Response.json({
                    success: false,
                    error: `HTTP ${response.status}: ${response.statusText}`,
                    endpoint: testEndpoint,
                    statusCode: response.status
                });
            }

            const data = await response.json();

            // Validate response structure
            if (data.blockchainHeight === undefined || data.stateHeight === undefined) {
                return Response.json({
                    success: false,
                    error: 'Invalid response structure - missing blockchainHeight or stateHeight',
                    endpoint: testEndpoint,
                    receivedData: data
                });
            }

            // Connection successful
            return Response.json({
                success: true,
                endpoint: testEndpoint,
                data: {
                    blockchainHeight: data.blockchainHeight,
                    stateHeight: data.stateHeight,
                    updatedTimestamp: data.updatedTimestamp,
                    updatedDate: data.updatedDate
                },
                message: `Successfully connected to node. Blockchain Height: ${data.blockchainHeight.toLocaleString()}, State Height: ${data.stateHeight.toLocaleString()}`
            });

        } catch (fetchError) {
            if (fetchError.name === 'AbortError') {
                return Response.json({
                    success: false,
                    error: 'Connection timeout after 10 seconds',
                    endpoint: testEndpoint
                });
            }

            return Response.json({
                success: false,
                error: `Failed to connect: ${fetchError.message}`,
                endpoint: testEndpoint,
                details: 'This could be due to: 1) Node is not running, 2) Incorrect URL, 3) Network issues, or 4) Node is not accessible from this server'
            });
        }

    } catch (error) {
        console.error('Error in testNodeConnection:', error);
        return Response.json({ 
            error: error.message || 'Internal server error' 
        }, { status: 500 });
    }
});