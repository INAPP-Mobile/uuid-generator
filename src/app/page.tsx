"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import Script from "next/script";
import {
  Copy,
  Check,
  Trash2,
  Star,
  History as HistoryIcon,
  Clock,
  RefreshCw,
} from "lucide-react";
import { toast } from "react-toastify";

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

import {
  HistoryEntry,
  getHistory,
  addEntry,
  deleteEntry,
  clearHistory,
  togglePin,
} from "@/lib/history";

const firebaseConfig = {
  apiKey: "AIzaSyBTFYW79t3Hd8ldCfc6tw6VFG34FjsjGgU",
  authDomain: "freeq-one.firebaseapp.com",
  projectId: "freeq-one",
  storageBucket: "freeq-one.firebasestorage.app",
  messagingSenderId: "905128076747",
  appId: "1:905128076747:web:5c7e293432301f611b824e",
  measurementId: "G-DT3XNM6TPG",
};

const app = initializeApp(firebaseConfig);
export { app };

type UuidVersion = "v4" | "v7";
type Mode = "single" | "bulk";

function generateUuidV4(): string {
  const hex = "0123456789abcdef";
  let uuid = "";
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      uuid += "-";
    } else if (i === 14) {
      uuid += "4";
    } else if (i === 19) {
      uuid += hex[(Math.random() * 4) | 0 + 8];
    } else {
      uuid += hex[(Math.random() * 16) | 0];
    }
  }
  return uuid;
}

function generateUuidV7(): string {
  const timestamp = Date.now().toString(16).padStart(12, "0");
  const hex = "0123456789abcdef";
  let random = "";
  for (let i = 0; i < 18; i++) {
    random += hex[(Math.random() * 16) | 0];
  }
  const variant = hex[(Math.random() * 4) | 0 + 8];
  return `${timestamp.slice(0, 8)}-${timestamp.slice(8, 12)}-7${random.slice(0, 3)}-${variant}${random.slice(3, 6)}-${random.slice(6)}`;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len) + "...";
}

export default function Home() {
  const [version, setVersion] = useState<UuidVersion>("v4");
  const [mode, setMode] = useState<Mode>("single");
  const [currentUuid, setCurrentUuid] = useState("");
  const [uuids, setUuids] = useState<string[]>([]);
  const [count, setCount] = useState(10);
  const [autoCopy, setAutoCopy] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    if (typeof window !== "undefined") {
      try {
        return getHistory();
      } catch {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    getAnalytics(app);
  }, []);

  const generateSingle = useCallback(() => {
    const uuid = version === "v4" ? generateUuidV4() : generateUuidV7();
    setCurrentUuid(uuid);
    const updated = addEntry(uuid, version, "");
    setHistory(updated);
    if (autoCopy) {
      navigator.clipboard.writeText(uuid).catch(() => {});
      toast.success("Copied to clipboard");
    }
  }, [version, autoCopy]);

  const generateBulk = useCallback(() => {
    const generator = version === "v4" ? generateUuidV4 : generateUuidV7;
    const generated: string[] = [];
    for (let i = 0; i < count; i++) {
      generated.push(generator());
    }
    setUuids(generated);
    if (generated.length > 0) {
      const joined = generated.join("\n");
      const updated = addEntry(joined, `${version}-bulk`, "");
      setHistory(updated);
    }
  }, [version, count]);

  const handleCopy = useCallback(async (value: string, index: number) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  }, []);

  const handleCopyAll = useCallback(async () => {
    if (uuids.length === 0) return;
    try {
      await navigator.clipboard.writeText(uuids.join("\n"));
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
      toast.success("All UUIDs copied");
    } catch {
      toast.error("Failed to copy");
    }
  }, [uuids]);

  const handleClear = useCallback(() => {
    setUuids([]);
  }, []);

  const displayHistory = useMemo(() => {
    const pinned = history.filter((e) => e.pinned);
    const unpinned = history.filter((e) => !e.pinned);
    return [...pinned, ...unpinned];
  }, [history]);

  const handleHistoryLoad = useCallback((entry: HistoryEntry) => {
    const isBulk = entry.mode.includes("bulk");
    if (isBulk) {
      const lines = entry.input.split("\n");
      if (lines.length > 1) {
        setMode("bulk");
        setCount(lines.length);
        setUuids(lines);
        return;
      }
    }
    setMode("single");
    setCurrentUuid(entry.input);
  }, []);

  const handleHistoryTogglePin = useCallback((id: string) => {
    const result = togglePin(id);
    setHistory(result.entries);
    if (result.limitReached) {
      toast.warning("Maximum 10 pinned items");
    }
  }, []);

  const handleHistoryDelete = useCallback((id: string) => {
    const updated = deleteEntry(id);
    setHistory(updated);
  }, []);

  const handleHistoryClear = useCallback(() => {
    const updated = clearHistory();
    setHistory(updated);
    toast.success("History cleared");
  }, []);

  return (
    <main className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold mb-2 text-center">
          UUID Generator
        </h1>
        <p className="text-center text-gray-400 mb-8 text-sm">
          Generate UUIDs (v4, v7) instantly. Copy, bulk generate, and track history.
        </p>

        <div className="flex items-center justify-center gap-2 mb-6">
          <button
            onClick={() => { setVersion("v4"); setCurrentUuid(""); setUuids([]); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              version === "v4"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            UUID v4
          </button>
          <button
            onClick={() => { setVersion("v7"); setCurrentUuid(""); setUuids([]); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              version === "v7"
                ? "bg-blue-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            UUID v7
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6">
          <button
            onClick={() => { setMode("single"); setUuids([]); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              mode === "single"
                ? "bg-gray-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            Single
          </button>
          <button
            onClick={() => { setMode("bulk"); setCurrentUuid(""); }}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              mode === "bulk"
                ? "bg-gray-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            Bulk
          </button>
        </div>

        {mode === "single" ? (
          <div className="space-y-4 mb-8">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Generated UUID
                </span>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoCopy}
                      onChange={(e) => setAutoCopy(e.target.checked)}
                      className="accent-blue-500"
                    />
                    <span className="text-xs text-gray-400">Auto-copy</span>
                  </label>
                </div>
              </div>
              {currentUuid ? (
                <div className="flex items-center gap-3">
                  <code className="flex-1 text-lg font-mono text-white bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 break-all select-all">
                    {currentUuid}
                  </code>
                  <button
                    onClick={() => handleCopy(currentUuid, 0)}
                    className="flex items-center gap-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-gray-300 transition-colors shrink-0"
                  >
                    {copiedIndex === 0 ? (
                      <Check size={14} className="text-green-400" />
                    ) : (
                      <Copy size={14} />
                    )}
                    Copy
                  </button>
                  <button
                    onClick={generateSingle}
                    className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs text-white transition-colors shrink-0"
                  >
                    <RefreshCw size={14} />
                    Generate New
                  </button>
                </div>
              ) : (
                <div className="flex justify-center">
                  <button
                    onClick={generateSingle}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm text-white font-medium transition-colors"
                  >
                    Generate
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4 mb-8">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Bulk Generate
                </span>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoCopy}
                      onChange={(e) => setAutoCopy(e.target.checked)}
                      className="accent-blue-500"
                    />
                    <span className="text-xs text-gray-400">Auto-copy</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-400">Count:</label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={count}
                    onChange={(e) => setCount(Math.min(1000, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-20 px-2 py-1 bg-gray-900 border border-gray-600 rounded text-sm text-white text-center font-mono"
                  />
                </div>
                <input
                  type="range"
                  min={1}
                  max={1000}
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value))}
                  className="flex-1 accent-blue-500"
                />
                <span className="text-xs text-gray-400 w-16 text-right">{count} UUID{count !== 1 ? "s" : ""}</span>
              </div>

              <button
                onClick={generateBulk}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm text-white font-medium transition-colors"
              >
                Generate
              </button>

              {uuids.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">{uuids.length} UUIDs generated</span>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCopyAll}
                        className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 transition-colors"
                      >
                        {copiedAll ? (
                          <Check size={12} className="text-green-400" />
                        ) : (
                          <Copy size={12} />
                        )}
                        Copy All
                      </button>
                      <button
                        onClick={handleClear}
                        className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-red-600 rounded text-xs text-gray-300 transition-colors"
                      >
                        <Trash2 size={12} />
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1 bg-gray-900/50 rounded-lg p-2">
                    {uuids.map((uuid, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 border border-gray-700/50 rounded hover:bg-gray-700/50 group transition-colors"
                      >
                        <code className="flex-1 text-sm font-mono text-gray-200 truncate">
                          {uuid}
                        </code>
                        <button
                          onClick={() => handleCopy(uuid, i)}
                          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-600 rounded transition-all text-gray-400 hover:text-white shrink-0"
                          title="Copy"
                        >
                          {copiedIndex === i ? (
                            <Check size={12} className="text-green-400" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <HistoryIcon size={14} />
              History
            </h2>
            {displayHistory.length > 0 && (
              <button
                onClick={handleHistoryClear}
                className="flex items-center gap-1 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 transition-colors"
              >
                <Trash2 size={12} />
                Clear All
              </button>
            )}
          </div>

          {displayHistory.length === 0 ? (
            <div className="text-gray-500 text-sm text-center py-8">
              No history yet
            </div>
          ) : (
            <div className="space-y-1 max-h-[320px] overflow-y-auto pr-1">
              {displayHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="group flex items-center gap-2 px-3 py-2 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700/50 rounded-lg cursor-pointer transition-colors"
                  onClick={() => handleHistoryLoad(entry)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleHistoryTogglePin(entry.id);
                    }}
                    className="shrink-0 p-0.5 transition-colors"
                    title={entry.pinned ? "Unpin" : "Pin"}
                  >
                    <Star
                      size={14}
                      className={
                        entry.pinned
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-gray-500 hover:text-gray-300"
                      }
                    />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-medium px-1 py-0.5 rounded bg-purple-900/50 text-purple-300">
                        UUID
                      </span>
                      <span className="text-[10px] text-gray-500 truncate">
                        {truncate(entry.mode.includes("bulk") ? `${entry.input.split("\n").length} UUIDs` : entry.input, 48)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={10} className="text-gray-600" />
                      <span className="text-[10px] text-gray-600">
                        {timeAgo(entry.timestamp)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleHistoryDelete(entry.id);
                    }}
                    className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-600/30 rounded transition-all text-gray-500 hover:text-red-400 shrink-0"
                    title="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-12 text-center text-gray-400 text-sm">
          <p>
            Generate UUIDs (v4, v7) instantly. Part of the{" "}
            <a
              href="https://freeq.one"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              freeq.one
            </a>{" "}
            tools suite.
          </p>
        </div>
      </div>

      <Script
        async
        src="https://www.googletagmanager.com/gtag/js?id=AW-971442831"
        strategy="afterInteractive"
      />
      <Script
        id="gtag-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'AW-971442831');
        gtag('event', 'conversion', {
            'send_to': 'AW-971442831/vGudCLGrjq4cEI-VnM8D',
            'value': 1.0,
            'currency': 'CAD'
        });
      `,
        }}
      />
    </main>
  );
}
