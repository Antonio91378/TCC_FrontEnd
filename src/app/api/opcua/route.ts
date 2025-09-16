import { NextRequest } from 'next/server';
import { OPCUAClient, AttributeIds, ReadValueIdOptions, ClientSession } from 'node-opcua';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const endpoint = process.env.OPCUA_ENDPOINT || req.nextUrl.searchParams.get('endpoint');
  const idsParam = req.nextUrl.searchParams.get('ids');
  const nodeIds = idsParam ? idsParam.split(',') : (process.env.OPCUA_NODE_IDS?.split(',') || []);

  if (!endpoint || nodeIds.length === 0) {
    return new Response(JSON.stringify({ error: 'Missing OPC UA endpoint or node ids' }), { status: 400 });
  }

  const client = OPCUAClient.create({ endpointMustExist: false });
  let session: ClientSession | null = null;
  try {
    await client.connect(endpoint);
    session = await client.createSession();

  const nodesToRead: ReadValueIdOptions[] = nodeIds.map((nodeId) => ({ nodeId, attributeId: AttributeIds.Value }));
  type DataValueLike = { value?: { value?: unknown } };
  const dataValues = (await session.read(nodesToRead, 0)) as unknown as DataValueLike[];

    const now = Date.now();
    const values: Record<string, unknown> = Object.fromEntries(
      nodeIds.map((id, i) => [id, dataValues[i]?.value?.value ?? null])
    );

    return new Response(
      JSON.stringify({ t: now, values }),
      { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } }
    );
  } catch (err) {
    console.error('OPC UA read error', err);
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  } finally {
    try { if (session) await session.close(); } catch {}
    try { await client.disconnect(); } catch {}
  }
}
