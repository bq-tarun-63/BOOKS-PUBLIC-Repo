import { NextResponse } from "next/server";
import { CmsService } from "@/services/cmsService";
import crypto from "crypto";

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { searchParams } = new URL(req.url);
    const draft = searchParams.get("draft") === 'true';
    const { id } = await context.params;
    const item = await CmsService.getById({
      id,
      opts: { draft },
    });
    if (!item) return NextResponse.json({ message: 'Not found' }, { status: 404 });

    const body = JSON.stringify(item);
    const etag = 'W/"' + crypto.createHash('sha1').update(body).digest('hex') + '"';
    const ifNoneMatch = new Headers(req.headers).get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag } });
    }
    return new NextResponse(body, { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300', ETag: etag } });
  } catch (e: any) {
    return NextResponse.json({ message: e.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const body = await req.json();
    const { id } = await context.params;
    await CmsService.updateDraft({
      id,
      fields: body?.fields ?? body,
      type: body?.type,
      updatedBy: body?.updatedBy,
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ message: e.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const body = await req.json();
    const { id } = await context.params;
    console.log('PATCH CMS content:', { id, body });
    await CmsService.updateDraft({
      id,
      fields: body?.fields ?? body,
      type: body?.type,
      updatedBy: body?.updatedBy,
    });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error('PATCH CMS content error:', e);
    return NextResponse.json({ message: e.message || 'Server error' }, { status: 500 });
  }
}

