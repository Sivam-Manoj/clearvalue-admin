import { NextResponse, type NextRequest } from "next/server";
import { SERVER_URL } from "@/lib/api";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("cv_admin")?.value;
  if (!token) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");
    const width = parseInt(searchParams.get("width") || "0") || 0;
    const height = parseInt(searchParams.get("height") || "0") || 0;
    const quality = parseInt(searchParams.get("quality") || "85") || 85;
    const format = searchParams.get("format") || "jpeg";
    const maintainAspect = searchParams.get("maintainAspect") !== "false";

    if (!url) {
      return NextResponse.json({ message: "URL required" }, { status: 400 });
    }

    // Call server transform endpoint
    const params = new URLSearchParams();
    params.set("url", url);
    if (width > 0) params.set("width", String(width));
    if (height > 0) params.set("height", String(height));
    params.set("quality", String(Math.min(100, Math.max(10, quality))));
    params.set("format", format);
    params.set("maintainAspect", String(maintainAspect));

    const res = await fetch(`${SERVER_URL}/api/gallery/transform?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) {
      // If server transform not available, proxy the original image
      const imgRes = await fetch(url, { cache: "no-store" });
      if (!imgRes.ok) {
        return NextResponse.json({ message: "Failed to fetch image" }, { status: 500 });
      }
      const buffer = await imgRes.arrayBuffer();
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": imgRes.headers.get("Content-Type") || "image/jpeg",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    const buffer = await res.arrayBuffer();
    const contentType = format === "png" ? "image/png" : 
                        format === "webp" ? "image/webp" : "image/jpeg";
    
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
        "Content-Disposition": `inline; filename="image.${format}"`,
      },
    });
  } catch (e) {
    console.error("Transform error:", e);
    return NextResponse.json({ message: "Transform failed" }, { status: 500 });
  }
}
