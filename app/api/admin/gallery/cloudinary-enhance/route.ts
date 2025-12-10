import { NextResponse, type NextRequest } from "next/server";
import { SERVER_URL } from "@/lib/api";

const CLOUDINARY_CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD || "dxgupmiv5";

// POST handler for Cloudinary enhancement
// This applies e_improve transformation and saves as a permanent file
export async function POST(request: NextRequest) {
  const token = request.cookies.get("cv_admin")?.value;
  if (!token) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
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

    console.log("[Cloudinary-Enhance] ========== NEW ENHANCEMENT REQUEST ==========");
    console.log("[Cloudinary-Enhance] Image URL:", imageUrl.substring(0, 100));
    console.log("[Cloudinary-Enhance] Report ID:", reportId);
    console.log("[Cloudinary-Enhance] Report Type:", reportType);

    // Step 1: Build enhanced Cloudinary URL with e_improve transformation
    // Check if it's already a Cloudinary upload URL
    const cloudinaryUploadMatch = imageUrl.match(
      /^https:\/\/res\.cloudinary\.com\/([^/]+)\/image\/upload\/(.+)$/
    );

    let enhancedFetchUrl: string;
    
    if (cloudinaryUploadMatch) {
      // For Cloudinary upload URLs, insert e_improve after /upload/
      const [, cloudName, rest] = cloudinaryUploadMatch;
      enhancedFetchUrl = `https://res.cloudinary.com/${cloudName}/image/upload/e_improve,q_auto:best/${rest}`;
    } else {
      // For external URLs, use fetch mode with e_improve
      const finalSourceUrl = imageUrl.includes("?") ? encodeURIComponent(imageUrl) : imageUrl;
      enhancedFetchUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/fetch/e_improve,q_auto:best/${finalSourceUrl}`;
    }

    console.log("[Cloudinary-Enhance] Enhanced fetch URL:", enhancedFetchUrl.substring(0, 120));

    // Step 2: Upload the enhanced image to Cloudinary as a permanent file
    console.log("[Cloudinary-Enhance] Uploading enhanced image to Cloudinary...");
    
    const uploadRes = await fetch(`${SERVER_URL}/api/gallery/upload-from-url`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        imageUrl: enhancedFetchUrl,
        folder: "enhanced",
      }),
    });

    const uploadData = await uploadRes.json();

    if (!uploadRes.ok || !uploadData.success) {
      console.error("[Cloudinary-Enhance] Upload failed:", uploadData);
      return NextResponse.json(
        { message: uploadData.message || "Failed to upload enhanced image" },
        { status: 400 }
      );
    }

    console.log("[Cloudinary-Enhance] ✅ Uploaded to Cloudinary:", uploadData.url);

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
        console.warn("[Cloudinary-Enhance] Report update failed:", updateData);
      } else {
        console.log("[Cloudinary-Enhance] ✅ Report updated successfully");
      }
    }

    return NextResponse.json({
      success: true,
      enhancedUrl: uploadData.url,
      uploaded: true,
      message: "Cloudinary enhancement complete",
    });
  } catch (e) {
    console.error("[Cloudinary-Enhance] Error:", e);
    return NextResponse.json(
      { message: "Failed to process enhancement request" },
      { status: 500 }
    );
  }
}
