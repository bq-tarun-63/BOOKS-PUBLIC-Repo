import { NextResponse } from "next/server";
import { CmsService } from "@/services/cmsService";
import crypto from "crypto";

export async function GET(req: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    const locale = searchParams.get("locale") || undefined;
    const draft = searchParams.get("draft") === 'true';
    if (!projectId) return NextResponse.json({ message: "projectId is required" }, { status: 400 });
    const { slug } = await context.params;
    const item = await CmsService.getBySlug({
      projectId,
      slug: decodeURIComponent(slug),
      locale,
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

