"use client";

import { useState, useCallback } from "react";

type Report = {
  _id: string;
  title: string;
  reportType: string;
  imageCount: number;
  createdAt: string;
  userEmail?: string;
  imageUrls: string[];
};

type ImageSettings = {
  width: number;
  height: number;
  quality: number;
};

// Simple presets for common use cases
const PRESETS = [
  { label: "Web (Small ~100KB)", width: 1200, height: 900, quality: 70 },
  { label: "Medium (~200KB)", width: 1400, height: 1050, quality: 75 },
  { label: "Large (~400KB)", width: 1920, height: 1440, quality: 80 },
  { label: "Original Quality", width: 0, height: 0, quality: 95 },
];

const DEFAULT_SETTINGS: ImageSettings = {
  width: 1200,
  height: 900,
  quality: 70,
};

export default function ReportImages({
  report,
  onBack,
}: {
  report: Report;
  onBack: () => void;
}) {
  const [settings, setSettings] = useState<ImageSettings>(DEFAULT_SETTINGS);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Build transform URL
  const buildTransformUrl = useCallback((url: string, s: ImageSettings) => {
    const params = new URLSearchParams();
    params.set("url", url);
    if (s.width > 0) params.set("width", String(s.width));
    if (s.height > 0) params.set("height", String(s.height));
    params.set("quality", String(s.quality));
    return `/api/admin/gallery/transform?${params.toString()}`;
  }, []);

  const toggleImage = (url: string) => {
    setSelectedImages((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedImages(new Set(report.imageUrls));
  };

  const selectNone = () => {
    setSelectedImages(new Set());
  };

  const previewImage = async (url: string) => {
    setPreviewLoading(true);
    setPreviewUrl(buildTransformUrl(url, settings));
  };

  const downloadSingle = async (url: string) => {
    const transformedUrl = buildTransformUrl(url, settings);
    const link = document.createElement("a");
    link.href = transformedUrl;
    link.download = `image.jpg`;
    link.click();
  };

  const downloadSelected = async () => {
    if (selectedImages.size === 0) return;
    setDownloading(true);

    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("cv_admin="))
        ?.split("=")[1];

      const response = await fetch("/api/admin/gallery/download-zip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          urls: Array.from(selectedImages),
          settings: {
            width: settings.width,
            height: settings.height,
            quality: settings.quality,
          },
        }),
      });

      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${report.title.replace(/[^a-z0-9]/gi, "_")}_images.zip`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download images");
    } finally {
      setDownloading(false);
    }
  };

  const applyPreset = (preset: typeof PRESETS[0]) => {
    setSettings({
      width: preset.width,
      height: preset.height,
      quality: preset.quality,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-rose-100">
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-rose-100 text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{report.title}</h1>
            <p className="text-gray-500 text-sm">
              {report.imageCount} images • {report.reportType}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Controls Panel */}
          <div className="lg:col-span-1 space-y-4">
            <section className="rounded-2xl border border-rose-200 bg-white/80 backdrop-blur shadow-lg p-4 space-y-4">
              <h2 className="font-semibold text-gray-900">Compression Settings</h2>
              <p className="text-xs text-gray-500">
                Lower quality = smaller file size
              </p>

              {/* Quick Presets */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Quick Presets</label>
                {PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => applyPreset(preset)}
                    className={`w-full px-3 py-2 text-left text-sm rounded-lg border transition-all ${
                      settings.width === preset.width &&
                      settings.height === preset.height &&
                      settings.quality === preset.quality
                        ? "bg-rose-500 text-white border-rose-500"
                        : "bg-white border-rose-200 hover:border-rose-400"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Custom Settings */}
              <div className="pt-2 border-t border-rose-100">
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Custom Settings
                </label>
                
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <label className="text-xs text-gray-500">Max Width</label>
                    <input
                      type="number"
                      value={settings.width || ""}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          width: parseInt(e.target.value) || 0,
                        }))
                      }
                      placeholder="Auto"
                      className="w-full px-2 py-1.5 text-sm rounded border border-rose-200 focus:ring-1 focus:ring-rose-300 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Max Height</label>
                    <input
                      type="number"
                      value={settings.height || ""}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          height: parseInt(e.target.value) || 0,
                        }))
                      }
                      placeholder="Auto"
                      className="w-full px-2 py-1.5 text-sm rounded border border-rose-200 focus:ring-1 focus:ring-rose-300 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-500">
                    Quality: {settings.quality}%
                  </label>
                  <input
                    type="range"
                    min="30"
                    max="100"
                    step="5"
                    value={settings.quality}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        quality: parseInt(e.target.value),
                      }))
                    }
                    className="w-full h-2 bg-rose-100 rounded-lg appearance-none cursor-pointer accent-rose-500"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>Smaller</span>
                    <span>Better</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Selection & Download */}
            <section className="rounded-2xl border border-rose-200 bg-white/80 backdrop-blur shadow-lg p-4 space-y-3">
              <h2 className="font-semibold text-gray-900">Download</h2>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-rose-200 hover:bg-rose-50"
                >
                  Select All
                </button>
                <button
                  onClick={selectNone}
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-rose-200 hover:bg-rose-50"
                >
                  Clear
                </button>
              </div>
              <p className="text-sm text-gray-600 text-center">
                {selectedImages.size} of {report.imageCount} selected
              </p>
              <button
                onClick={downloadSelected}
                disabled={selectedImages.size === 0 || downloading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 text-white font-medium hover:from-rose-600 hover:to-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
              >
                {downloading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Compressing...
                  </span>
                ) : (
                  `Download ${selectedImages.size} Images`
                )}
              </button>
            </section>
          </div>

          {/* Image Grid */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {report.imageUrls.map((url, index) => (
                <div
                  key={url}
                  className={`group relative rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                    selectedImages.has(url)
                      ? "border-rose-500 ring-2 ring-rose-300 shadow-lg"
                      : "border-rose-100 hover:border-rose-300"
                  }`}
                  onClick={() => toggleImage(url)}
                >
                  <div className="aspect-[4/3] relative bg-gray-100">
                    <img
                      src={url}
                      alt={`Image ${index + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>

                  {/* Selection indicator */}
                  <div
                    className={`absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                      selectedImages.has(url)
                        ? "bg-rose-500 text-white"
                        : "bg-white/80 border border-gray-300"
                    }`}
                  >
                    {selectedImages.has(url) && (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          previewImage(url);
                        }}
                        className="flex-1 px-2 py-1 text-xs bg-white/90 rounded text-gray-800 hover:bg-white"
                      >
                        Preview
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadSingle(url);
                        }}
                        className="flex-1 px-2 py-1 text-xs bg-rose-500 rounded text-white hover:bg-rose-600"
                      >
                        Download
                      </button>
                    </div>
                  </div>

                  {/* Index badge */}
                  <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/50 rounded text-white text-xs">
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Preview Modal */}
        {(previewUrl || previewLoading) && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setPreviewUrl(null);
              setPreviewLoading(false);
            }}
          >
            <div
              className="relative bg-white rounded-2xl p-2 max-w-4xl max-h-[90vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  setPreviewUrl(null);
                  setPreviewLoading(false);
                }}
                className="absolute top-4 right-4 z-10 p-2 bg-black/50 rounded-full text-white hover:bg-black/70"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              {previewLoading && !previewUrl ? (
                <div className="w-96 h-72 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500" />
                </div>
              ) : previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-w-full max-h-[85vh] object-contain"
                  onLoad={() => setPreviewLoading(false)}
                />
              ) : null}
              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                <div className="px-3 py-1.5 rounded-lg bg-black/50 text-white text-sm">
                  {settings.width || "Auto"}×{settings.height || "Auto"} • Q:{settings.quality}%
                </div>
                {previewUrl && (
                  <a
                    href={previewUrl}
                    download="preview.jpg"
                    className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium"
                  >
                    Download
                  </a>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
