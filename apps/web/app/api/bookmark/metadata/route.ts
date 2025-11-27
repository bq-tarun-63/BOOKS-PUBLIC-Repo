import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    // Validate URL
    const urlObj = new URL(url);
    
    // Fetch the HTML
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BetaQue/1.0; +https://betaque.com)",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch URL" },
        { status: response.status }
      );
    }

    const html = await response.text();
    
    // Extract metadata using regex (simple approach)
    // For production, consider using a proper HTML parser like cheerio
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i) || 
                       html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i) ||
                       html.match(/<meta\s+name="twitter:title"\s+content="([^"]+)"/i);
    
    const descriptionMatch = html.match(/<meta\s+name="description"\s+content="([^"]+)"/i) ||
                              html.match(/<meta\s+property="og:description"\s+content="([^"]+)"/i) ||
                              html.match(/<meta\s+name="twitter:description"\s+content="([^"]+)"/i);
    
    const imageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i) ||
                        html.match(/<meta\s+name="twitter:image"\s+content="([^"]+)"/i) ||
                        html.match(/<meta\s+property="og:image:url"\s+content="([^"]+)"/i);
    
    const faviconMatch = html.match(/<link[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*href=["']([^"]+)["']/i) ||
                              html.match(/<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"]+)["']/i);

    let title = titleMatch && titleMatch[1] ? titleMatch[1].trim() : urlObj.hostname;
    let description = descriptionMatch && descriptionMatch[1] ? descriptionMatch[1].trim() : "";
    let image = imageMatch && imageMatch[1] ? imageMatch[1].trim() : "";
    let favicon = faviconMatch && faviconMatch[1] ? faviconMatch[1].trim() : "";

    // Resolve relative URLs
    if (image && !image.startsWith("http")) {
      image = new URL(image, url).href;
    }
    if (favicon && !favicon.startsWith("http")) {
      favicon = new URL(favicon, url).href;
    }

    // For GitHub specifically, use their Open Graph API
    if (urlObj.hostname === "github.com") {
      const pathParts = urlObj.pathname.split("/").filter(Boolean);
      if (pathParts.length >= 2) {
        // Try to get better metadata from GitHub's Open Graph
        const ogImage = `https://opengraph.githubassets.com/${Math.random().toString(36).substring(7)}/${pathParts[0]}/${pathParts[1]}`;
        if (!image) {
          image = ogImage;
        }
        if (!favicon) {
          favicon = "https://github.com/favicon.ico";
        }
      }
    }

    return NextResponse.json({
      title,
      description,
      image,
      favicon,
    });
  } catch (error) {
    console.error("Error fetching bookmark metadata:", error);
    return NextResponse.json(
      { error: "Failed to fetch metadata" },
      { status: 500 }
    );
  }
}

