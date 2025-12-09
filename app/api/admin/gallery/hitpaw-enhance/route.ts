import { NextResponse, type NextRequest } from "next/server";
import { SERVER_URL } from "@/lib/api";

const HITPAW_API_KEY = process.env.HITPAW_API_KEY;
const HITPAW_ENHANCE_URL = "https://api.hitpaw.com/api/v3/photoEnhanceByUrl";
const HITPAW_STATUS_URL = "https://api.hitpaw.com/api/v3/photo-enhance/status";

// Max time to wait for enhancement (2 minutes)
const MAX_WAIT_TIME = 120000;
const POLL_INTERVAL = 3000;

// Helper: Wait for enhancement to complete
async function waitForEnhancement(jobId: string): Promise<{ success: boolean; url?: string; error?: string }> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < MAX_WAIT_TIME) {
    try {
      const statusRes = await fetch(`${HITPAW_STATUS_URL}?job_id=${jobId}`, {
        method: "POST",
        headers: {
          "User-Agent": "Apifox/1.0.0 (https://apifox.com)",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ job_id: jobId }),
      });

      const statusData = await statusRes.json();
      console.log("[HitPaw] Status:", statusData);

      if ((statusData.code === 200 || statusData.code === 0) && statusData.data) {
        const status = statusData.data.status;
        
        if (status === 2) {
          // Completed
          return { success: true, url: statusData.data.output_image_url };
        } else if (status === -1) {
          // Failed
          return { success: false, error: statusData.data.message || "Enhancement failed" };
        }
        // status 1 = still processing, continue waiting
      } else if (statusData.code && statusData.code !== 200 && statusData.code !== 0) {
        return { success: false, error: statusData.message || "API error" };
      }
    } catch (e) {
      console.error("[HitPaw] Poll error:", e);
    }
    
    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
  }
  
  return { success: false, error: "Enhancement timed out after 2 minutes" };
}

// POST handler for enhancement
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
    const { imageUrl, reportId, reportType } = body;

    if (!imageUrl || typeof imageUrl !== "string") {
      return NextResponse.json({ message: "Image URL required" }, { status: 400 });
    }

    // Determine format from URL
    const urlLower = imageUrl.toLowerCase();
    let imageFormat = ".jpg";
    if (urlLower.includes(".png")) imageFormat = ".png";
    else if (urlLower.includes(".webp")) imageFormat = ".webp";

    console.log("[HitPaw] Starting enhancement for:", imageUrl.substring(0, 80) + "...");

    // Step 1: Start enhancement job
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

    if (!enhanceRes.ok || (enhanceData.code !== 200 && enhanceData.code !== 0)) {
      return NextResponse.json(
        { message: enhanceData.message || "Failed to start enhancement" },
        { status: 400 }
      );
    }

    const jobId = enhanceData.data?.job_id;
    if (!jobId) {
      return NextResponse.json(
        { message: "No job ID returned" },
        { status: 400 }
      );
    }

    console.log("[HitPaw] Job started:", jobId);

    // Step 2: Wait for enhancement to complete
    const result = await waitForEnhancement(jobId);
    
    if (!result.success || !result.url) {
      return NextResponse.json(
        { message: result.error || "Enhancement failed" },
        { status: 400 }
      );
    }

    console.log("[HitPaw] Enhancement complete, URL:", result.url.substring(0, 80) + "...");

    // Step 3: Upload enhanced image to Cloudinary via server
    const uploadRes = await fetch(`${SERVER_URL}/api/gallery/upload-from-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        imageUrl: result.url,
        folder: "enhanced",
      }),
    });

    const uploadData = await uploadRes.json();
    
    if (!uploadRes.ok || !uploadData.success) {
      console.error("[HitPaw] Upload failed:", uploadData);
      // Return the HitPaw URL as fallback
      return NextResponse.json({
        success: true,
        enhancedUrl: result.url,
        uploaded: false,
        message: "Enhanced but upload failed - using HitPaw URL",
      });
    }

    console.log("[HitPaw] Uploaded to Cloudinary:", uploadData.url);

    // Step 4: Update the report if reportId and reportType provided
    if (reportId && reportType) {
      const updateRes = await fetch(`${SERVER_URL}/api/gallery/update-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reportId,
          reportType,
          oldUrl: imageUrl,
          newUrl: uploadData.url,
        }),
      });

      const updateData = await updateRes.json();
      
      if (!updateRes.ok) {
        console.warn("[HitPaw] Report update failed:", updateData);
      } else {
        console.log("[HitPaw] Report updated successfully");
      }
    }

    return NextResponse.json({
      success: true,
      enhancedUrl: uploadData.url,
      uploaded: true,
      message: "Enhancement complete and uploaded",
    });

  } catch (e) {
    console.error("[HitPaw] Error:", e);
    return NextResponse.json(
      { message: "Failed to process enhancement request" },
      { status: 500 }
    );
  }
}
