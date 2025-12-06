"use client";

import { useEffect, useState } from "react";
import ReportImages from "./ReportImages";

type Report = {
  _id: string;
  title: string;
  reportType: string;
  imageCount: number;
  createdAt: string;
  userEmail?: string;
  imageUrls: string[];
};

export default function ImageGallery() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/gallery/reports", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Failed to load reports");
      setReports(json.reports || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }

  const filteredReports = reports.filter((r) =>
    r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.userEmail?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (selectedReport) {
    return (
      <ReportImages
        report={selectedReport}
        onBack={() => setSelectedReport(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-rose-50">
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <section className="rounded-2xl border border-rose-200 bg-white/80 backdrop-blur shadow-xl shadow-rose-100 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
                Image Gallery
              </h1>
              <p className="text-gray-600">
                Select a report to view and customize its images
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search reports..."
                  className="pl-9 pr-4 py-2 rounded-xl border border-rose-200 bg-white focus:ring-2 focus:ring-rose-300 focus:border-rose-300 outline-none text-sm w-64"
                />
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <circle cx="11" cy="11" r="8" strokeWidth="2" />
                  <path d="M21 21l-4.35-4.35" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              {error}
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              {searchQuery ? "No reports match your search" : "No reports with images found"}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredReports.map((report) => (
                <button
                  key={report._id}
                  onClick={() => setSelectedReport(report)}
                  className="w-full text-left px-4 py-3 rounded-xl border border-rose-100 hover:border-rose-300 hover:bg-rose-50/50 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-semibold text-sm ${
                        report.reportType === 'Asset' ? 'bg-blue-500' :
                        report.reportType === 'RealEstate' ? 'bg-emerald-500' :
                        'bg-purple-500'
                      }`}>
                        {report.reportType === 'Asset' ? 'A' :
                         report.reportType === 'RealEstate' ? 'RE' : 'S'}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 group-hover:text-rose-700 transition-colors">
                          {report.title}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-2">
                          <span>{report.imageCount} images</span>
                          <span>•</span>
                          <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                          {report.userEmail && (
                            <>
                              <span>•</span>
                              <span>{report.userEmail}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <svg
                      className="w-5 h-5 text-gray-400 group-hover:text-rose-500 group-hover:translate-x-1 transition-all"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
