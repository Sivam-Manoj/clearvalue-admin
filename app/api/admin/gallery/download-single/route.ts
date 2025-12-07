import { NextResponse, type NextRequest } from "next/server";
import { SERVER_URL } from "@/lib/api";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("cv_admin")?.value;
  if (!token) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ message: "URL required" }, { status: 400 });
    }

    console.log("[Admin API] Downloading single image from:", url.substring(0, 80) + "...");

    // Call server to download image
    const res = await fetch(`${SERVER_URL}/api/gallery/download-single`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[Admin API] Download failed:", err);
      return NextResponse.json(
        { message: err?.message || "Failed to download" },
        { status: res.status }
      );
    }

    const buffer = await res.arrayBuffer();
    const contentType = res.headers.get("content-type") || "image/jpeg";
    
    console.log("[Admin API] Downloaded:", (buffer.byteLength / 1024).toFixed(1), "KB");

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": 'attachment; filename="image.jpg"',
      },
    });
  } catch (e) {
    console.error("Download single error:", e);
    return NextResponse.json({ message: "Failed to download image" }, { status: 500 });
  }
}
