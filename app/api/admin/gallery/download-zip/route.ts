import { NextResponse, type NextRequest } from "next/server";
import { SERVER_URL } from "@/lib/api";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("cv_admin")?.value;
  if (!token) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { urls, settings } = body;

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ message: "URLs required" }, { status: 400 });
    }

    // Call server to create zip with transformed images
    const res = await fetch(`${SERVER_URL}/api/gallery/download-zip`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ urls, settings }),
      cache: "no-store",
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { message: err?.message || "Failed to create zip" },
        { status: res.status }
      );
    }

    const buffer = await res.arrayBuffer();
    
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="images.zip"',
      },
    });
  } catch (e) {
    console.error("Download zip error:", e);
    return NextResponse.json({ message: "Failed to create zip" }, { status: 500 });
  }
}
