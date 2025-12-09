import { NextResponse, type NextRequest } from "next/server";

const HITPAW_API_KEY = process.env.HITPAW_API_KEY;
const HITPAW_ENHANCE_URL = "https://api.hitpaw.com/api/v3/photoEnhanceByUrl";
const HITPAW_STATUS_URL = "https://api.hitpaw.com/api/v3/photo-enhance/status";

// Start enhancement job
export async function POST(request: NextRequest) {
  const token = request.cookies.get("cv_admin")?.value;
  if (!token) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  if (!HITPAW_API_KEY) {
    return NextResponse.json(
      { message: "HitPaw API key not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { imageUrl, action } = body;

    // Handle status check
    if (action === "status") {
      const { jobId } = body;
      if (!jobId) {
        return NextResponse.json({ message: "Job ID required" }, { status: 400 });
      }

      const statusRes = await fetch(`${HITPAW_STATUS_URL}?job_id=${jobId}`, {
        method: "POST",
        headers: {
          "User-Agent": "Apifox/1.0.0 (https://apifox.com)",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ job_id: jobId }),
      });

      const statusData = await statusRes.json();
      console.log("[HitPaw] Status check for job:", jobId, statusData);

      return NextResponse.json(statusData);
    }

    // Start new enhancement job
    if (!imageUrl || typeof imageUrl !== "string") {
      return NextResponse.json({ message: "Image URL required" }, { status: 400 });
    }

    // Determine format from URL
    const urlLower = imageUrl.toLowerCase();
    let imageFormat = ".jpg";
    if (urlLower.includes(".png")) imageFormat = ".png";
    else if (urlLower.includes(".webp")) imageFormat = ".webp";

    console.log("[HitPaw] Starting enhancement for:", imageUrl.substring(0, 80) + "...");

    const enhanceRes = await fetch(HITPAW_ENHANCE_URL, {
      method: "POST",
      headers: {
        "APIKEY": HITPAW_API_KEY,
        "User-Agent": "Apifox/1.0.0 (https://apifox.com)",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: imageUrl,
        image_format: imageFormat,
      }),
    });

    const enhanceData = await enhanceRes.json();
    console.log("[HitPaw] Enhancement response:", enhanceData);

    // API returns code: 200 for success
    if (!enhanceRes.ok || (enhanceData.code !== 200 && enhanceData.code !== 0)) {
      return NextResponse.json(
        { message: enhanceData.message || "Failed to start enhancement" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      jobId: enhanceData.data?.job_id,
      message: "Enhancement started",
    });
  } catch (e) {
    console.error("[HitPaw] Error:", e);
    return NextResponse.json(
      { message: "Failed to process enhancement request" },
      { status: 500 }
    );
  }
}
