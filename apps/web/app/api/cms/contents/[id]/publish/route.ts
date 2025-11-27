import { NextResponse } from "next/server";
import { CmsService } from "@/services/cmsService";

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    console.log('Publish CMS content:', { id });
    await CmsService.publish({ id });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error('Publish CMS content error:', e);
    return NextResponse.json({ message: e.message || 'Server error' }, { status: 500 });
  }
}

