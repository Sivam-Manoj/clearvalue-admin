import { NextResponse, type NextRequest } from "next/server";
import { SERVER_URL } from "@/lib/api";

// Picsart Upscale Enhance API
const PICSART_API_KEY = process.env.PICSART_API_KEY;
const PICSART_ENHANCE_URL = "https://api.picsart.io/tools/1.0/upscale/enhance";

// POST handler for enhancement
export async function POST(request: NextRequest) {
  const token = request.cookies.get("cv_admin")?.value;
  if (!token) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  if (!PICSART_API_KEY) {
    return NextResponse.json(
      { message: "Picsart API key not configured" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { imageUrl, reportId, reportType } = body;

    if (!imageUrl || typeof imageUrl !== "string") {
      return NextResponse.json(
        { message: "Image URL required" },
        { status: 400 }
      );
    }

    // Determine format from URL
    const urlLower = imageUrl.toLowerCase();
    let imageFormat = "JPG";
    if (urlLower.includes(".png")) imageFormat = "PNG";
    else if (urlLower.includes(".webp")) imageFormat = "WEBP";

    console.log("[Picsart] ========== NEW ENHANCEMENT REQUEST ==========");
    console.log("[Picsart] Image URL:", imageUrl.substring(0, 100));
    console.log("[Picsart] Report ID:", reportId);
    console.log("[Picsart] Report Type:", reportType);
    console.log("[Picsart] Output Format:", imageFormat);
    console.log("[Picsart] API Key present:", !!PICSART_API_KEY);

    // Step 1: Call Picsart Upscale Enhance API
    const formData = new FormData();
    formData.append("image_url", imageUrl);
    formData.append("upscale_factor", "2"); // 2x upscale (max 64Mpx output)
    formData.append("format", imageFormat);

    console.log("[Picsart] Calling Picsart Enhance API...");

    const enhanceRes = await fetch(PICSART_ENHANCE_URL, {
      method: "POST",
      headers: {
        "X-Picsart-API-Key": PICSART_API_KEY,
        Accept: "application/json",
      },
      body: formData,
    });

    const enhanceData = await enhanceRes.json();
    console.log("[Picsart] Response status:", enhanceRes.status);
    console.log("[Picsart] Response:", JSON.stringify(enhanceData).substring(0, 200));

    if (!enhanceRes.ok) {
      console.error("[Picsart] ❌ API Error:", enhanceData);
      return NextResponse.json(
        { message: enhanceData.message || enhanceData.detail || "Enhancement failed" },
        { status: enhanceRes.status }
      );
    }

    // Picsart returns the enhanced image URL in data.url
    const enhancedUrl = enhanceData.data?.url;
    if (!enhancedUrl) {
      console.error("[Picsart] ❌ No URL in response:", enhanceData);
      return NextResponse.json(
        { message: "No enhanced image URL returned" },
        { status: 400 }
      );
    }

    console.log("[Picsart] ✅ Enhancement complete!");
    console.log("[Picsart] Enhanced URL:", enhancedUrl.substring(0, 100));
    console.log("[Picsart] Now uploading to Cloudinary...");

    // Step 2: Upload enhanced image to Cloudinary via server
    const uploadRes = await fetch(`${SERVER_URL}/api/gallery/upload-from-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        imageUrl: enhancedUrl,
        folder: "enhanced",
      }),
    });

    const uploadData = await uploadRes.json();

    if (!uploadRes.ok || !uploadData.success) {
      console.error("[Picsart] Upload failed:", uploadData);
      // Return the Picsart URL as fallback
      return NextResponse.json({
        success: true,
        enhancedUrl: enhancedUrl,
        uploaded: false,
        message: "Enhanced but upload failed - using Picsart URL",
      });
    }

    console.log("[Picsart] ✅ Uploaded to Cloudinary:", uploadData.url);
    console.log("[Picsart] File size:", uploadData.bytes, "bytes");

    // Step 3: Update the report if reportId and reportType provided
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
        console.warn("[Picsart] Report update failed:", updateData);
      } else {
        console.log("[Picsart] ✅ Report updated successfully");
      }
    }

    return NextResponse.json({
      success: true,
      enhancedUrl: uploadData.url,
      uploaded: true,
      message: "Enhancement complete and uploaded",
    });
  } catch (e) {
    console.error("[Picsart] Error:", e);
    return NextResponse.json(
      { message: "Failed to process enhancement request" },
      { status: 500 }
    );
  }
}
