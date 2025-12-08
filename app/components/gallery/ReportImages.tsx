"use client";

import { useState, useCallback } from "react";

// Cloudinary cloud name for URL generation
const CLOUDINARY_CLOUD =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD || "dxgupmiv5";

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
  quality: "auto:best" | "auto:good" | "auto:eco" | "auto:low" | number;
  format: "auto" | "jpg" | "webp";
};

type SharpenSettings = {
  enabled: boolean;
  type: "sharpen" | "unsharpMask";
  strength: number; // 0-500 for sharpen, 0-2000 for unsharpMask
};

const DEFAULT_SHARPEN: SharpenSettings = {
  enabled: false,
  type: "sharpen",
  strength: 100,
};

type EnhanceSettings = {
  improve: boolean; // e_improve - color/contrast enhancement
};

const DEFAULT_ENHANCE: EnhanceSettings = {
  improve: true,
};

// Cloudinary presets with best enhancement settings
const PRESETS: {
  label: string;
  description: string;
  settings: ImageSettings;
  enhance: boolean;
}[] = [
  {
    label: "🌐 Web Optimized",
    description: "~150-250KB, enhanced",
    settings: {
      width: 1400,
      height: 1050,
      quality: "auto:good",
      format: "auto",
    },
    enhance: true,
  },
  {
    label: "📱 Mobile/Thumbnail",
    description: "~50-100KB, fast loading",
    settings: { width: 800, height: 600, quality: "auto:eco", format: "auto" },
    enhance: false,
  },
  {
    label: "✨ Enhanced",
    description: "~300-500KB, maximum enhancement",
    settings: {
      width: 1920,
      height: 1440,
      quality: "auto:best",
      format: "auto",
    },
    enhance: true,
  },
  {
    label: "📄 Document",
    description: "~100-200KB, for reports",
    settings: { width: 1200, height: 900, quality: "auto:good", format: "jpg" },
    enhance: true,
  },
  {
    label: "🔒 Original",
    description: "Full quality, no changes",
    settings: { width: 0, height: 0, quality: 100, format: "jpg" },
    enhance: false,
  },
];

const DEFAULT_SETTINGS: ImageSettings = PRESETS[0].settings;

export default function ReportImages({
  report,
  onBack,
}: {
  report: Report;
  onBack: () => void;
}) {
  const [settings, setSettings] = useState<ImageSettings>(DEFAULT_SETTINGS);
  const [enhance, setEnhance] =
    useState<EnhanceSettings>(DEFAULT_ENHANCE);
  const [sharpenSettings, setSharpenSettings] =
    useState<SharpenSettings>(DEFAULT_SHARPEN);
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Build Cloudinary fetch URL manually (SDK has encoding issues with query params)
  const buildCloudinaryUrl = useCallback(
    (
      url: string,
      s: ImageSettings,
      enh: EnhanceSettings = DEFAULT_ENHANCE,
      sharpening: SharpenSettings = DEFAULT_SHARPEN
    ) => {
      // For original quality, return the original URL
      const hasEnhance = enh.improve;
      if (
        s.width === 0 &&
        s.height === 0 &&
        s.quality === 100 &&
        !hasEnhance &&
        !sharpening.enabled
      ) {
        return url;
      }

      // Build transformations array manually
      const transforms: string[] = [];

      // Enhancement - e_improve for color/contrast
      if (enh.improve) {
        transforms.push("e_improve");
      }

      // Sharpening
      if (sharpening.enabled) {
        if (sharpening.type === "sharpen") {
          transforms.push(`e_sharpen:${sharpening.strength}`);
        } else {
          transforms.push(`e_unsharp_mask:${sharpening.strength}`);
        }
      }

      // Size - use limit crop to maintain aspect ratio
      if (s.width > 0 && s.height > 0) {
        transforms.push(`c_limit,w_${s.width},h_${s.height}`);
      } else if (s.width > 0) {
        transforms.push(`c_scale,w_${s.width}`);
      } else if (s.height > 0) {
        transforms.push(`c_scale,h_${s.height}`);
      }

      // Quality (keep colon as-is for auto:good, auto:best, etc.)
      if (typeof s.quality === "string") {
        transforms.push(`q_${s.quality}`);
      } else {
        transforms.push(`q_${s.quality}`);
      }

      // Format
      transforms.push(`f_${s.format}`);

      // Build final URL
      const transformStr = transforms.join("/");

      // Only encode if URL has query params (contains ?)
      // Cloudinary fetch works better with unencoded URLs when there's no query string
      const finalSourceUrl = url.includes("?") ? encodeURIComponent(url) : url;

      return `https://res.cloudinary.com/${CLOUDINARY_CLOUD}/image/fetch/${transformStr}/${finalSourceUrl}`;
    },
    []
  );

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
    setPreviewUrl(
      buildCloudinaryUrl(url, settings, enhance, sharpenSettings)
    );
  };

  const downloadSingle = async (url: string) => {
    const transformedUrl = buildCloudinaryUrl(
      url,
      settings,
      enhance,
      sharpenSettings
    );
    console.log("Downloading from:", transformedUrl);

    try {
      // Use the backend proxy to avoid CORS issues
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("cv_admin="))
        ?.split("=")[1];

      const response = await fetch("/api/admin/gallery/download-single", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: transformedUrl }),
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `image.${
        settings.format === "auto" ? "webp" : settings.format
      }`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download error:", error);
      // Fallback: open in new tab for manual save
      window.open(transformedUrl, "_blank");
    }
  };

  const downloadSelected = async () => {
    if (selectedImages.size === 0) return;
    setDownloading(true);

    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("cv_admin="))
        ?.split("=")[1];

      // Build Cloudinary URLs for each selected image with enhancement + sharpening
      const cloudinaryUrls = Array.from(selectedImages).map((url) =>
        buildCloudinaryUrl(url, settings, enhance, sharpenSettings)
      );

      const response = await fetch("/api/admin/gallery/download-zip", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          urls: cloudinaryUrls,
          useCloudinary: true, // Signal backend to fetch directly without processing
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

  const applyPreset = (preset: (typeof PRESETS)[0]) => {
    setSettings({ ...preset.settings });
    // Enable improve by default for enhanced presets
    setEnhance({ improve: preset.enhance });
  };

  const isPresetActive = (preset: (typeof PRESETS)[0]) => {
    return (
      settings.width === preset.settings.width &&
      settings.height === preset.settings.height &&
      settings.quality === preset.settings.quality &&
      settings.format === preset.settings.format
    );
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-rose-50 via-white to-rose-100 overflow-hidden">
      {/* Fixed Header */}
      <header className="flex-shrink-0 px-4 py-4 border-b border-rose-100 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-rose-100 text-gray-600"
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
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 truncate">
              {report.title}
            </h1>
            <p className="text-gray-500 text-sm">
              {report.imageCount} images • {report.reportType}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content - Flex Row */}
      <div className="flex-1 flex overflow-hidden">
        {/* Fixed Left Sidebar */}
        <aside className="hidden lg:flex lg:flex-col w-80 xl:w-96 flex-shrink-0 border-r border-rose-100 bg-white/60 backdrop-blur-sm overflow-y-auto p-4 space-y-4">
          <section className="rounded-2xl border border-rose-200 bg-white/80 backdrop-blur shadow-lg p-4 space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-gray-900">Compression</h2>
              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                Cloudinary
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Smart compression for best quality/size ratio
            </p>

            {/* Quick Presets */}
            <div className="space-y-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  className={`w-full px-3 py-2 text-left rounded-lg border transition-all ${
                    isPresetActive(preset)
                      ? "bg-rose-500 text-white border-rose-500"
                      : "bg-white border-rose-200 hover:border-rose-400"
                  }`}
                >
                  <div className="text-sm font-medium">{preset.label}</div>
                  <div
                    className={`text-xs ${
                      isPresetActive(preset) ? "text-rose-100" : "text-gray-400"
                    }`}
                  >
                    {preset.description}
                  </div>
                </button>
              ))}
            </div>

            {/* Custom Size Settings */}
            <div className="pt-2 border-t border-rose-100">
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Custom Size
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

              {/* Format selector */}
              <div className="mb-3">
                <label className="text-xs text-gray-500 block mb-1">
                  Format
                </label>
                <div className="flex gap-1">
                  {(["auto", "jpg", "webp"] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() =>
                        setSettings((s) => ({ ...s, format: fmt }))
                      }
                      className={`flex-1 px-2 py-1 text-xs rounded border transition-all ${
                        settings.format === fmt
                          ? "bg-rose-500 text-white border-rose-500"
                          : "bg-white border-rose-200 hover:border-rose-400"
                      }`}
                    >
                      {fmt === "auto" ? "Auto (Best)" : fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quality selector */}
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  Quality Mode
                </label>
                <div className="grid grid-cols-2 gap-1">
                  {(
                    [
                      { value: "auto:best", label: "Best" },
                      { value: "auto:good", label: "Good" },
                      { value: "auto:eco", label: "Eco" },
                      { value: "auto:low", label: "Low" },
                    ] as const
                  ).map((q) => (
                    <button
                      key={q.value}
                      onClick={() =>
                        setSettings((s) => ({ ...s, quality: q.value }))
                      }
                      className={`px-2 py-1 text-xs rounded border transition-all ${
                        settings.quality === q.value
                          ? "bg-rose-500 text-white border-rose-500"
                          : "bg-white border-rose-200 hover:border-rose-400"
                      }`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Enhancement Toggle */}
              <div className="pt-2 border-t border-rose-100">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Improve
                    </span>
                    <p className="text-xs text-gray-400">
                      Enhance colors & contrast
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setEnhance({ improve: !enhance.improve })
                    }
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      enhance.improve ? "bg-rose-500" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                        enhance.improve ? "translate-x-5" : ""
                      }`}
                    />
                  </button>
                </label>
              </div>

              {/* Sharpening Controls */}
              <div className="pt-2 border-t border-rose-100 space-y-2">
                <label className="flex items-center justify-between cursor-pointer">
                  <div>
                    <span className="text-sm font-medium text-gray-700">
                      Sharpening
                    </span>
                    <p className="text-xs text-gray-400">
                      Enhance image detail
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setSharpenSettings((s) => ({ ...s, enabled: !s.enabled }))
                    }
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      sharpenSettings.enabled ? "bg-rose-500" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        sharpenSettings.enabled ? "translate-x-6" : ""
                      }`}
                    />
                  </button>
                </label>

                {sharpenSettings.enabled && (
                  <>
                    {/* Sharpen Type */}
                    <div className="flex gap-1">
                      <button
                        onClick={() =>
                          setSharpenSettings((s) => ({
                            ...s,
                            type: "sharpen",
                            strength: Math.min(s.strength, 500),
                          }))
                        }
                        className={`flex-1 px-2 py-1 text-xs rounded border transition-all ${
                          sharpenSettings.type === "sharpen"
                            ? "bg-rose-500 text-white border-rose-500"
                            : "bg-white border-rose-200 hover:border-rose-400"
                        }`}
                      >
                        Sharpen
                      </button>
                      <button
                        onClick={() =>
                          setSharpenSettings((s) => ({
                            ...s,
                            type: "unsharpMask",
                          }))
                        }
                        className={`flex-1 px-2 py-1 text-xs rounded border transition-all ${
                          sharpenSettings.type === "unsharpMask"
                            ? "bg-rose-500 text-white border-rose-500"
                            : "bg-white border-rose-200 hover:border-rose-400"
                        }`}
                      >
                        Unsharp Mask
                      </button>
                    </div>

                    {/* Strength Slider */}
                    <div>
                      <label className="text-xs text-gray-500 flex justify-between">
                        <span>Strength</span>
                        <span>{sharpenSettings.strength}</span>
                      </label>
                      <input
                        type="range"
                        min="0"
                        max={sharpenSettings.type === "sharpen" ? 500 : 2000}
                        step={sharpenSettings.type === "sharpen" ? 10 : 50}
                        value={sharpenSettings.strength}
                        onChange={(e) =>
                          setSharpenSettings((s) => ({
                            ...s,
                            strength: parseInt(e.target.value),
                          }))
                        }
                        className="w-full h-2 bg-rose-100 rounded-lg appearance-none cursor-pointer accent-rose-500"
                      />
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Subtle</span>
                        <span>Strong</span>
                      </div>
                    </div>
                  </>
                )}
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
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Compressing...
                </span>
              ) : (
                `Download ${selectedImages.size} Images`
              )}
            </button>
          </section>
        </aside>

        {/* Scrollable Image Grid */}
        <main className="flex-1 overflow-y-auto p-4">
          {/* Mobile Controls Toggle */}
          <div className="lg:hidden mb-4">
            <details className="rounded-2xl border border-rose-200 bg-white/80 backdrop-blur shadow-lg">
              <summary className="p-4 cursor-pointer font-semibold text-gray-900 flex items-center justify-between">
                <span>⚙️ Compression Settings</span>
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </summary>
              <div className="p-4 pt-0 space-y-3 border-t border-rose-100">
                <div className="grid grid-cols-2 gap-2">
                  {PRESETS.slice(0, 4).map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => applyPreset(preset)}
                      className={`px-3 py-2 text-left rounded-lg border transition-all text-sm ${
                        isPresetActive(preset)
                          ? "bg-rose-500 text-white border-rose-500"
                          : "bg-white border-rose-200"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
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
                <button
                  onClick={downloadSelected}
                  disabled={selectedImages.size === 0 || downloading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 text-white font-medium disabled:opacity-50 transition-all"
                >
                  {downloading
                    ? "Compressing..."
                    : `Download ${selectedImages.size} Images`}
                </button>
              </div>
            </details>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-4">
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
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
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
        </main>
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
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
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
                {settings.width || "Auto"}×{settings.height || "Auto"} •{" "}
                {typeof settings.quality === "string"
                  ? settings.quality
                  : `Q:${settings.quality}%`}{" "}
                • {settings.format}
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
    </div>
  );
}
