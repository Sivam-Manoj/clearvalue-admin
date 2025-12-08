import { NextResponse, type NextRequest } from "next/server";
import { SERVER_URL } from "@/lib/api";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("cv_admin")?.value;
  if (!token) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  try {
    // Get current user info to check role
    const meRes = await fetch(`${SERVER_URL}/api/admin/me`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const meData = await meRes.json().catch(() => ({}));
    const userRole = meData?.user?.role;
    const userId = meData?.user?._id;
    
    // For regular users, only fetch their own reports
    const isRegularUser = userRole === "user";
    
    // Fetch approved Asset reports with images
    const assetRes = await fetch(`${SERVER_URL}/api/asset/all-approved`, {
      cache: "no-store",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    
    const assetData = await assetRes.json().catch(() => ({ reports: [] }));
    const assetReports = Array.isArray(assetData?.reports) ? assetData.reports : [];
    
    // Fetch approved RealEstate reports with images
    const reRes = await fetch(`${SERVER_URL}/api/real-estate/all-approved`, {
      cache: "no-store",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    
    const reData = await reRes.json().catch(() => ({ reports: [] }));
    const realEstateReports = Array.isArray(reData?.reports) ? reData.reports : [];
    
    // Transform to gallery format
    const allReports = [
      ...assetReports.map((r: any) => ({
        _id: r._id,
        title: r.client_name || r.preview_data?.client_name || `Asset Report`,
        reportType: "Asset",
        imageCount: Array.isArray(r.imageUrls) ? r.imageUrls.length : 0,
        createdAt: r.createdAt,
        userEmail: r.user?.email,
        userId: r.user?._id,
        imageUrls: Array.isArray(r.imageUrls) ? r.imageUrls : [],
      })),
      ...realEstateReports.map((r: any) => ({
        _id: r._id,
        title: r.preview_data?.property_details?.address || 
               r.property_details?.address || 
               `Real Estate Report`,
        reportType: "RealEstate",
        imageCount: Array.isArray(r.imageUrls) ? r.imageUrls.length : 0,
        createdAt: r.createdAt,
        userEmail: r.user?.email,
        userId: r.user?._id,
        imageUrls: Array.isArray(r.imageUrls) ? r.imageUrls : [],
      })),
    ];
    
    // Filter: regular users only see their own reports
    const reports = allReports
      .filter((r) => r.imageCount > 0)
      .filter((r) => !isRegularUser || r.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ reports });
  } catch (e) {
    console.error("Gallery reports error:", e);
    return NextResponse.json(
      { message: "Failed to fetch reports" },
      { status: 500 }
    );
  }
}
