import { NextRequest } from 'next/server';
import { OPCUAClient, AttributeIds, ReadValueIdOptions, ClientSession, DataType, Variant, WriteValueOptions } from 'node-opcua';
// Firebase client for optional mirroring
import { getFirebaseDb } from '@/lib/firebase';
import { ref as dbRef, set as dbSet } from 'firebase/database';

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

export async function POST(req: NextRequest) {
  // Body: { endpoint?: string, nodeId: string, value: boolean }
  const body = await req.json().catch(() => null) as null | { endpoint?: string; nodeId?: string; value?: unknown };
  const endpoint = body?.endpoint || process.env.OPCUA_ENDPOINT || req.nextUrl.searchParams.get('endpoint');
  const nodeId = body?.nodeId || req.nextUrl.searchParams.get('nodeId') || process.env.OPCUA_NODE_ID;
  const value = body?.value;

  if (!endpoint || !nodeId || typeof value !== 'boolean') {
    return new Response(JSON.stringify({ error: 'Missing endpoint, nodeId or boolean value' }), { status: 400 });
  }

  const client = OPCUAClient.create({ endpointMustExist: false });
  let session: ClientSession | null = null;
  try {
    await client.connect(endpoint);
    session = await client.createSession();
    // Write boolean using write() API
    const nodesToWrite: WriteValueOptions[] = [
      {
        nodeId,
        attributeId: AttributeIds.Value,
        value: { value: new Variant({ dataType: DataType.Boolean, value }) },
      },
    ];
    await session.write(nodesToWrite);

    // Optional: mirror to Firebase command path so ESP32 reacts
    try {
      const cmdPath = process.env.NEXT_PUBLIC_BOOL_FIREBASE_CMD_PATH || 'bool_cmd';
      const db = getFirebaseDb();
      await dbSet(dbRef(db, cmdPath), value);
    } catch {}

    return new Response(JSON.stringify({ ok: true }), { headers: { 'content-type': 'application/json' } });
  } catch (err) {
    console.error('OPC UA write error', err);
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  } finally {
    try { if (session) await session.close(); } catch {}
    try { await client.disconnect(); } catch {}
  }
}
