import { NextResponse, type NextRequest } from "next/server";
import { CmsService } from "@/services/cmsService";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) return NextResponse.json({ message: "projectId is required" }, { status: 400 });
    const type = searchParams.get("type") || undefined;
    const tag = searchParams.get("tag") || undefined;
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;
    const offset = searchParams.get("offset") ? Number(searchParams.get("offset")) : undefined;
    const items = await CmsService.search({
      projectId,
      opts: { type, tag, limit, offset },
    });
    const body = JSON.stringify(items);
    const etag = 'W/"' + crypto.createHash('sha1').update(body).digest('hex') + '"';
    const ifNoneMatch = req.headers.get('if-none-match');
    if (ifNoneMatch && ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag } });
    }
    return new NextResponse(body, { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300', ETag: etag } });
  } catch (e: any) {
    return NextResponse.json({ message: e.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.projectId || !body?.type) {
      return NextResponse.json({ message: "projectId and type are required" }, { status: 400 });
    }
    const {
      projectId,
      customId,
      slug,
      locale,
      type,
      fields,
      createdBy,
      tags,
      metadata,
    } = body;
    const created = await CmsService.createDraft({
      projectId,
      customId,
      slug,
      locale,
      type,
      fields,
      createdBy,
      tags,
      metadata,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ message: e.message || 'Server error' }, { status: 500 });
  }
}

