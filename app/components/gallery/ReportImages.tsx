"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Image from "next/image";

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
  format: "jpeg" | "png" | "webp";
  maintainAspect: boolean;
};

const DEFAULT_SETTINGS: ImageSettings = {
  width: 1200,
  height: 900,
  quality: 85,
  format: "jpeg",
  maintainAspect: true,
};

const PRESET_SIZES = [
  { label: "Original", width: 0, height: 0 },
  { label: "Small (800×600)", width: 800, height: 600 },
  { label: "Medium (1200×900)", width: 1200, height: 900 },
  { label: "Large (1920×1440)", width: 1920, height: 1440 },
  { label: "HD (1920×1080)", width: 1920, height: 1080 },
  { label: "4K (3840×2160)", width: 3840, height: 2160 },
];

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
  const [livePreviewEnabled, setLivePreviewEnabled] = useState(true);
  const [imageLoadStates, setImageLoadStates] = useState<Record<string, boolean>>({});

  // Debounced settings for live preview to avoid too many API calls
  const [debouncedSettings, setDebouncedSettings] = useState<ImageSettings>(settings);
  
  const buildTransformUrl = useCallback((url: string, s: ImageSettings) => {
    const params = new URLSearchParams();
    params.set("url", url);
    if (s.width > 0) params.set("width", String(s.width));
    if (s.height > 0) params.set("height", String(s.height));
    params.set("quality", String(s.quality));
    params.set("format", s.format);
    params.set("maintainAspect", String(s.maintainAspect));
    return `/api/admin/gallery/transform?${params.toString()}`;
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSettings(settings);
    }, 300);
    return () => clearTimeout(timer);
  }, [settings]);

  // Build live preview URLs for selected images
  const livePreviewUrls = useMemo(() => {
    if (!livePreviewEnabled || selectedImages.size === 0) return new Map();
    const urls = new Map<string, string>();
    selectedImages.forEach((url) => {
      urls.set(url, buildTransformUrl(url, debouncedSettings));
    });
    return urls;
  }, [livePreviewEnabled, selectedImages, debouncedSettings, buildTransformUrl]);

  const handleImageLoad = (url: string) => {
    setImageLoadStates((prev) => ({ ...prev, [url]: true }));
  };

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

  const deselectAll = () => {
    setSelectedImages(new Set());
  };

  const previewImage = async (url: string) => {
    setPreviewLoading(true);
    setPreviewUrl(null);
    try {
      const transformUrl = buildTransformUrl(url, settings);
      // Just set the URL - the image will load naturally
      setPreviewUrl(transformUrl);
    } finally {
      setPreviewLoading(false);
    }
  };

  const downloadSingle = async (url: string) => {
    const transformUrl = buildTransformUrl(url, settings);
    const link = document.createElement("a");
    link.href = transformUrl;
    link.download = `image.${settings.format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadSelected = async () => {
    if (selectedImages.size === 0) return;

    setDownloading(true);
    try {
      const urls = Array.from(selectedImages);

      if (urls.length === 1) {
        // Single image - direct download
        await downloadSingle(urls[0]);
      } else {
        // Multiple images - create zip
        const res = await fetch("/api/admin/gallery/download-zip", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            urls,
            settings,
          }),
        });

        if (!res.ok) throw new Error("Failed to create zip");

        const blob = await res.blob();
        const downloadUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `${report.title.replace(
          /[^a-z0-9]/gi,
          "_"
        )}_images.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(downloadUrl);
      }
    } catch (e) {
      console.error("Download failed:", e);
      alert("Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  const applyPreset = (preset: (typeof PRESET_SIZES)[0]) => {
    setSettings((s) => ({
      ...s,
      width: preset.width,
      height: preset.height,
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-rose-50">
      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-xl border border-rose-200 hover:bg-rose-50 transition-colors"
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
              {report.title}
            </h1>
            <p className="text-gray-500 text-sm">
              {report.imageCount} images • {report.reportType}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Controls Panel */}
          <div className="lg:col-span-1 space-y-4">
            <section className="rounded-2xl border border-rose-200 bg-white/80 backdrop-blur shadow-lg p-4 space-y-4">
              <h2 className="font-semibold text-gray-900">Image Settings</h2>

              {/* Preset Sizes */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Preset Sizes
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_SIZES.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => applyPreset(preset)}
                      className={`px-2 py-1.5 text-xs rounded-lg border transition-all ${
                        settings.width === preset.width &&
                        settings.height === preset.height
                          ? "bg-rose-500 text-white border-rose-500"
                          : "bg-white border-rose-200 hover:border-rose-300 text-gray-700"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Size */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Width
                  </label>
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
                    className="w-full px-3 py-2 rounded-lg border border-rose-200 focus:ring-2 focus:ring-rose-300 outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">
                    Height
                  </label>
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
                    className="w-full px-3 py-2 rounded-lg border border-rose-200 focus:ring-2 focus:ring-rose-300 outline-none text-sm"
                  />
                </div>
              </div>

              {/* Maintain Aspect Ratio */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.maintainAspect}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      maintainAspect: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 rounded border-rose-300 text-rose-500 focus:ring-rose-300"
                />
                <span className="text-sm text-gray-700">
                  Maintain aspect ratio
                </span>
              </label>

              {/* Quality */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">
                  Quality: {settings.quality}%
                </label>
                <input
                  type="range"
                  min="10"
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
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Smaller file</span>
                  <span>Better quality</span>
                </div>
              </div>

              {/* Format */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Format
                </label>
                <div className="flex gap-2">
                  {(["jpeg", "png", "webp"] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() =>
                        setSettings((s) => ({ ...s, format: fmt }))
                      }
                      className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-all uppercase ${
                        settings.format === fmt
                          ? "bg-rose-500 text-white border-rose-500"
                          : "bg-white border-rose-200 hover:border-rose-300 text-gray-700"
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Selection & Download */}
            <section className="rounded-2xl border border-rose-200 bg-white/80 backdrop-blur shadow-lg p-4 space-y-3">
              <h2 className="font-semibold text-gray-900">Selection</h2>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-rose-200 hover:bg-rose-50 text-gray-700"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAll}
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-rose-200 hover:bg-rose-50 text-gray-700"
                >
                  Deselect
                </button>
              </div>
              <p className="text-sm text-gray-500">
                {selectedImages.size} of {report.imageUrls.length} selected
              </p>
              <button
                onClick={downloadSelected}
                disabled={selectedImages.size === 0 || downloading}
                className="w-full px-4 py-3 rounded-xl bg-rose-500 text-white font-medium hover:bg-rose-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {downloading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Download{" "}
                    {selectedImages.size > 0 ? `(${selectedImages.size})` : ""}
                  </>
                )}
              </button>
            </section>
          </div>

          {/* Images Grid */}
          <div className="lg:col-span-3">
            <section className="rounded-2xl border border-rose-200 bg-white/80 backdrop-blur shadow-lg p-4">
              {/* Live Preview Toggle */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-rose-100">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">
                    {report.imageUrls.length} images
                  </span>
                  {selectedImages.size > 0 && livePreviewEnabled && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-rose-100 text-rose-700">
                      Live Preview ON
                    </span>
                  )}
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={livePreviewEnabled}
                    onChange={(e) => setLivePreviewEnabled(e.target.checked)}
                    className="w-4 h-4 rounded border-rose-300 text-rose-500 focus:ring-rose-300"
                  />
                  <span className="text-sm text-gray-600">
                    Show live preview on selected
                  </span>
                </label>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {report.imageUrls.map((url, idx) => {
                  const isSelected = selectedImages.has(url);
                  const liveUrl = livePreviewUrls.get(url);
                  const showTransformed = isSelected && livePreviewEnabled && liveUrl;
                  
                  return (
                    <div
                      key={url}
                      className={`relative group rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                        isSelected
                          ? "border-rose-500 shadow-lg shadow-rose-200 ring-2 ring-rose-300"
                          : "border-transparent hover:border-rose-200"
                      }`}
                      onClick={() => toggleImage(url)}
                    >
                      {/* Blur placeholder skeleton */}
                      {!imageLoadStates[showTransformed ? liveUrl! : url] && (
                        <div className="absolute inset-0 bg-gradient-to-br from-rose-100 to-rose-50 animate-pulse" />
                      )}
                      
                      {/* Image - use transformed URL for selected, original for others */}
                      {showTransformed ? (
                        <Image
                          src={liveUrl!}
                          alt={`Image ${idx + 1} (transformed)`}
                          width={400}
                          height={300}
                          className={`w-full aspect-[4/3] object-cover transition-opacity duration-300 ${
                            imageLoadStates[liveUrl!] ? "opacity-100" : "opacity-0"
                          }`}
                          onLoad={() => handleImageLoad(liveUrl!)}
                          unoptimized
                          priority={idx < 8}
                        />
                      ) : (
                        <Image
                          src={url}
                          alt={`Image ${idx + 1}`}
                          width={400}
                          height={300}
                          className={`w-full aspect-[4/3] object-cover transition-opacity duration-300 ${
                            imageLoadStates[url] ? "opacity-100" : "opacity-0"
                          }`}
                          onLoad={() => handleImageLoad(url)}
                          unoptimized
                          loading={idx < 8 ? "eager" : "lazy"}
                        />
                      )}
                      
                      {/* Live preview indicator */}
                      {showTransformed && (
                        <div className="absolute top-2 right-2 px-1.5 py-0.5 text-[10px] font-medium rounded bg-rose-500 text-white shadow">
                          LIVE
                        </div>
                      )}
                    {/* Selection checkbox */}
                    <div
                      className={`absolute top-2 left-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        selectedImages.has(url)
                          ? "bg-rose-500 border-rose-500"
                          : "bg-white/80 border-gray-300 group-hover:border-rose-400"
                      }`}
                    >
                      {selectedImages.has(url) && (
                        <svg
                          className="w-4 h-4 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="3"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </div>
                    {/* Actions */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          previewImage(url);
                        }}
                        className="p-2 rounded-lg bg-white/90 hover:bg-white text-gray-700 transition-all"
                        title="Preview with settings"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadSingle(url);
                        }}
                        className="p-2 rounded-lg bg-white/90 hover:bg-white text-gray-700 transition-all"
                        title="Download with settings"
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                          />
                        </svg>
                      </button>
                    </div>
                    {/* Index */}
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/50 text-white text-xs">
                      {idx + 1}
                    </div>
                  </div>
                );
              })}
              </div>
            </section>
          </div>
        </div>

        {/* Preview Modal */}
        {(previewUrl || previewLoading) && (
          <div
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setPreviewUrl(null)}
          >
            <div
              className="relative max-w-5xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setPreviewUrl(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              {previewLoading ? (
                <div className="w-96 h-72 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500"></div>
                </div>
              ) : previewUrl ? (
                <div className="relative">
                  <Image
                    src={previewUrl}
                    alt="Preview with applied settings"
                    width={settings.width || 1200}
                    height={settings.height || 900}
                    className="max-w-full max-h-[85vh] object-contain"
                    onLoad={() => setPreviewLoading(false)}
                    unoptimized
                    priority
                  />
                </div>
              ) : null}
              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
                <div className="px-3 py-1.5 rounded-lg bg-black/50 text-white text-sm">
                  {settings.width || "Auto"}×{settings.height || "Auto"} •{" "}
                  {settings.quality}% • {settings.format.toUpperCase()}
                </div>
                {previewUrl && (
                  <a
                    href={previewUrl}
                    download={`preview.${settings.format}`}
                    className="px-4 py-2 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium transition-colors"
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
