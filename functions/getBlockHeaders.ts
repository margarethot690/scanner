import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';
import { validateNodeUrl, validatePositiveInt } from './_shared/validation.ts';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const cleanUrl = validateNodeUrl(body.nodeUrl || user.node_api_url, 'https://mainnet-node.decentralchain.io');
        const from = validatePositiveInt(body.from, 'from');
        const to = validatePositiveInt(body.to, 'to');
        
        const response = await fetch(`${cleanUrl}/blocks/headers/seq/${from}/${to}`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        return Response.json(data);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});