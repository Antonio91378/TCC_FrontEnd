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
  // Body: { endpoint?: string, nodeId: string, value: boolean | number | string, dataType?: string }
  const body = await req.json().catch(() => null) as null | { endpoint?: string; nodeId?: string; value?: unknown; dataType?: string };
  const endpoint = body?.endpoint || process.env.OPCUA_ENDPOINT || req.nextUrl.searchParams.get('endpoint');
  const nodeId = body?.nodeId || req.nextUrl.searchParams.get('nodeId') || process.env.OPCUA_NODE_ID;
  const value = body?.value;
  const dataTypeOverride = (body?.dataType || req.nextUrl.searchParams.get('dataType') || '').toString();

  if (!endpoint || !nodeId || value === undefined) {
    return new Response(JSON.stringify({ error: 'Missing endpoint, nodeId or value' }), { status: 400 });
  }

  function inferVariant(val: unknown): Variant {
    // If dataTypeOverride provided, try to use it
    const t = dataTypeOverride.trim().toLowerCase();
    const map: Record<string, DataType> = {
      boolean: DataType.Boolean,
      bool: DataType.Boolean,
      double: DataType.Double,
      number: DataType.Double,
      float: DataType.Float,
      int: DataType.Int32,
      int32: DataType.Int32,
      int16: DataType.Int16,
      uint16: DataType.UInt16,
      uint32: DataType.UInt32,
      string: DataType.String,
    };
    if (t && map[t] !== undefined) {
      return new Variant({ dataType: map[t], value: castValue(val, map[t]) });
    }
    // Auto-infer: boolean stays boolean; number => Double; numeric string => Double; else string
    if (typeof val === 'boolean') {
      return new Variant({ dataType: DataType.Boolean, value: val });
    }
    if (typeof val === 'number' && Number.isFinite(val)) {
      return new Variant({ dataType: DataType.Double, value: val });
    }
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (trimmed === 'true' || trimmed === 'false') {
        return new Variant({ dataType: DataType.Boolean, value: trimmed === 'true' });
      }
      const n = Number(trimmed);
      if (Number.isFinite(n)) {
        return new Variant({ dataType: DataType.Double, value: n });
      }
      return new Variant({ dataType: DataType.String, value: trimmed });
    }
    // Fallback
    return new Variant({ dataType: DataType.String, value: String(val) });
  }

  function castValue(val: unknown, type: DataType): unknown {
    switch (type) {
      case DataType.Boolean:
        if (typeof val === 'boolean') return val;
        if (typeof val === 'string') return val.trim() === 'true' || val.trim() === '1';
        if (typeof val === 'number') return val !== 0;
        return Boolean(val);
      case DataType.Double:
      case DataType.Float:
      case DataType.Int16:
      case DataType.Int32:
      case DataType.UInt16:
      case DataType.UInt32: {
        const n = typeof val === 'number' ? val : Number(String(val));
        return Number.isFinite(n) ? n : 0;
      }
      case DataType.String:
      default:
        return String(val);
    }
  }

  const client = OPCUAClient.create({ endpointMustExist: false });
  let session: ClientSession | null = null;
  try {
    await client.connect(endpoint);
    session = await client.createSession();
    // Write boolean using write() API
    const v = inferVariant(value);
    const nodesToWrite: WriteValueOptions[] = [
      { nodeId, attributeId: AttributeIds.Value, value: { value: v } },
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
