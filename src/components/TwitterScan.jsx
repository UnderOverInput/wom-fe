/* eslint-disable react/prop-types */
// TwitterScan.jsx
// eslint-disable-next-line no-unused-vars
import React, { useState, useEffect, useRef } from "react";
import { toPng } from "html-to-image";  // Replace html2canvas with html-to-image
import Header from "../components/Header";
import Footer from "../components/Footer";
// Removed Chart.js dependencies for lighter bundle
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/solid";
import { supabase } from "../lib/supabaseClient";
import logo from "../assets/logo.webp";
import { fetchTopActiveTokensByTweetCount } from "../utils/fetchTopActiveTokensByTweetCount";

// Simple SVG Bar Chart Component
const SimpleBarChart = ({ data, labels }) => {
  const maxValue = Math.max(...data);
  const chartHeight = 180;
  const chartWidth = 300;
  const barWidth = chartWidth / data.length - 8;
  
  return (
    <div className="w-full h-[180px] flex items-end justify-center bg-[#0f0f0f] rounded p-3">
      <svg width={chartWidth} height={chartHeight} className="overflow-visible">
        {data.map((value, i) => {
          const barHeight = maxValue > 0 ? (value / maxValue) * (chartHeight - 40) : 0;
          const x = i * (barWidth + 8);
          
          return (
            <g key={i}>
              {/* Bar */}
              <rect
                x={x}
                y={chartHeight - barHeight - 30}
                width={barWidth}
                height={barHeight}
                fill="rgba(255, 77, 255, 0.6)"
                rx={3}
                className="transition-all duration-500 hover:fill-[rgba(255,77,255,0.8)]"
              />
              {/* Label */}
              <text
                x={x + barWidth / 2}
                y={chartHeight - 10}
                textAnchor="middle"
                fill="#EAEAEA"
                fontSize="11"
                className="font-mono"
              >
                {labels[i]}
              </text>
              {/* Value on hover */}
              {value > 0 && (
                <text
                  x={x + barWidth / 2}
                  y={chartHeight - barHeight - 35}
                  textAnchor="middle"
                  fill="#FF4DFF"
                  fontSize="10"
                  className="font-mono opacity-0 hover:opacity-100 transition-opacity"
                >
                  {value}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const WATCHLIST_KEY = "twitterScanWatchlist";
const TRENDING_LOADED_KEY = "twitterScanTrendingLoaded";

// Shimmer loading card component
const ShimmerCard = () => (
  <div className="bg-[#13131A] border border-[#2A2A2A] p-5 rounded-xl animate-pulse">
    <div className="flex justify-between items-start mb-2">
      <div className="h-4 bg-[#2A2A2A] rounded w-16 shimmer"></div>
      <div className="flex flex-col items-end gap-1">
        <div className="flex gap-2">
          <div className="w-4 h-4 bg-[#2A2A2A] rounded shimmer"></div>
          <div className="w-4 h-4 bg-[#2A2A2A] rounded shimmer"></div>
        </div>
        <div className="h-3 bg-[#2A2A2A] rounded w-20 shimmer"></div>
      </div>
    </div>
    
    <div className="space-y-2 mb-4">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex justify-between">
          <div className="h-3 bg-[#2A2A2A] rounded w-6 shimmer"></div>
          <div className="h-3 bg-[#2A2A2A] rounded w-8 shimmer"></div>
        </div>
      ))}
    </div>
    
    <div className="h-[180px] bg-[#2A2A2A] rounded shimmer"></div>
  </div>
);

const TwitterScan = () => {
  const [watchlist, setWatchlist] = useState([]);
  const [tokenOptions, setTokenOptions] = useState([]);
  const [filteredOptions, setFilteredOptions] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingTokens, setLoadingTokens] = useState(new Set()); // Track individual token loading
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const cardRefs = useRef({});

  useEffect(() => {
    const stored = localStorage.getItem(WATCHLIST_KEY);
    if (stored) {
      try {
        setWatchlist(JSON.parse(stored));
      } catch {
        console.error("Invalid watchlist in localStorage");
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist));
  }, [watchlist]);

  useEffect(() => {
    const fetchTokens = async () => {
      const { data, error } = await supabase
        .from("tokens")
        .select("token_symbol, token_name")
        .eq("is_active", true);
      if (!error && data) {
        setTokenOptions(data);
        setFilteredOptions(data);
      }
    };
    fetchTokens();
  }, []);

  useEffect(() => {
    let mounted = true;

    const preloadTrending = async () => {
      const stored = localStorage.getItem(WATCHLIST_KEY);
      const trendingLoaded = localStorage.getItem(TRENDING_LOADED_KEY);
      
      // Skip if we have watchlist items or already loaded trending tokens in this session
      if (!mounted || (stored && JSON.parse(stored)?.length > 0) || trendingLoaded) {
        return;
      }

      setLoading(true);
      try {
        const trendingTokens = await fetchTopActiveTokensByTweetCount(24, 1);
        for (const token of trendingTokens) {
          if (!mounted) return;
          await handleSelectToken(token, true);
        }
        // Mark that we've loaded trending tokens for this session
        localStorage.setItem(TRENDING_LOADED_KEY, "true");
      } catch (err) {
        console.error("Failed to preload trending tokens", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    preloadTrending();

    return () => {
      mounted = false;
    };
  }, []);

  // Clear trending loaded flag when component unmounts (page navigation)
  useEffect(() => {
    return () => {
      localStorage.removeItem(TRENDING_LOADED_KEY);
    };
  }, []);

  const groupIntoBuckets = (tweets) => {
    const now = Date.now();
    const buckets = {
      "1h": 0,
      "3h": 0,
      "6h": 0,
      "12h": 0,
      "24h": 0,
      "48h": 0,
    };

    tweets.forEach((tweet) => {
      const ageH = (now - new Date(tweet.created_at).getTime()) / 36e5;

      if (ageH <= 1) buckets["1h"]++;
      else if (ageH <= 3) buckets["3h"]++;
      else if (ageH <= 6) buckets["6h"]++;
      else if (ageH <= 12) buckets["12h"]++;
      else if (ageH <= 24) buckets["24h"]++;
      else if (ageH <= 48) buckets["48h"]++;
    });

    return buckets;
  };

  // Helper function to convert hourly buckets to interval buckets
  const convertVolumeBucketsToIntervals = (hourlyBuckets) => {
    const now = Date.now();
    const buckets = {
      "1h": 0,
      "3h": 0,
      "6h": 0,
      "12h": 0,
      "24h": 0,
      "48h": 0,
    };

    // Convert hourly buckets (ISO timestamp keys) to interval buckets
    Object.entries(hourlyBuckets).forEach(([hourTimestamp, count]) => {
      const hourTime = new Date(hourTimestamp).getTime();
      const ageH = (now - hourTime) / 36e5; // Convert to hours

      if (ageH <= 1) buckets["1h"] += count;
      else if (ageH <= 3) buckets["3h"] += count;
      else if (ageH <= 6) buckets["6h"] += count;
      else if (ageH <= 12) buckets["12h"] += count;
      else if (ageH <= 24) buckets["24h"] += count;
      else if (ageH <= 48) buckets["48h"] += count;
    });

    return buckets;
  };

  const handleSelectToken = async (token_symbol, fromTrending = false) => {
    const raw = token_symbol;
    const symbol = raw.toUpperCase();
    const normalized = symbol.toLowerCase();
    
    if (watchlist.some((t) => t.token === symbol)) return;

    // Add to loading set
    setLoadingTokens(prev => new Set([...prev, symbol]));

    const { data: tokenData } = await supabase
      .from("tokens")
      .select("is_active")
      .eq("token_symbol", normalized)
      .maybeSingle();

    // Check if token doesn't exist in database
    if (!tokenData) {
      try {
        // Call the volume endpoint to get tweet data for new token
        const volumeRes = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/volume/${normalized}`
        );
        
        if (!volumeRes.ok) {
          const errorData = await volumeRes.json().catch(() => ({ detail: 'Unknown error' }));
          alert(`Token "${symbol}" not found: ${errorData.detail || 'Failed to fetch token data'}`);
          setLoadingTokens(prev => {
            const newSet = new Set(prev);
            newSet.delete(symbol);
            return newSet;
          });
          return;
        }
        
        const volumeData = await volumeRes.json();
        
        if (!volumeData.total || volumeData.total === 0) {
          alert(`No tweet data found for token "${symbol}".`);
          setLoadingTokens(prev => {
            const newSet = new Set(prev);
            newSet.delete(symbol);
            return newSet;
          });
          return;
        }
        
        // Convert volume service buckets to the format expected by the UI
        const buckets = convertVolumeBucketsToIntervals(volumeData.buckets);
        
        setWatchlist((prev) => [
          ...prev,
          {
            token: symbol,
            total: volumeData.total,
            intervals: buckets,
            history: ["1h", "3h", "6h", "12h", "24h", "48h"].map((k) => buckets[k]),
            preloaded: fromTrending,
            isVolumeSearch: true, // Flag to indicate this came from volume search
          },
        ]);
        
        setSearchInput("");
        setFilteredOptions(tokenOptions);
        setLoadingTokens(prev => {
          const newSet = new Set(prev);
          newSet.delete(symbol);
          return newSet;
        });
        return;
        
      } catch (err) {
        console.error("Volume endpoint failed:", err);
        alert(`Failed to fetch data for token "${symbol}". Please try again.`);
        setLoadingTokens(prev => {
          const newSet = new Set(prev);
          newSet.delete(symbol);
          return newSet;
        });
        return;
      }
    }

    // Check if token exists but is not active
    if (!tokenData.is_active) {
      alert(`Token "${symbol}" is currently inactive.`);
      setLoadingTokens(prev => {
        const newSet = new Set(prev);
        newSet.delete(symbol);
        return newSet;
      });
      return;
    }

    try {
      let tweets = [];

      const { data: supabaseTweets } = await supabase
        .from("tweets")
        .select("created_at")
        .eq("token_symbol", normalized)
        .gte("created_at", new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString());

      if (supabaseTweets?.length > 0) {
        tweets = supabaseTweets;
      } else {
        const fallbackRes = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/tweets/${normalized}`
        );
        const fallbackData = await fallbackRes.json();
        tweets = fallbackData?.tweets || [];
      }

      if (tweets.length === 0) {
        alert("No tweet data found for this token.");
        setLoadingTokens(prev => {
          const newSet = new Set(prev);
          newSet.delete(symbol);
          return newSet;
        });
        return;
      }

      const buckets = groupIntoBuckets(tweets);

      setWatchlist((prev) => [
        ...prev,
        {
          token: symbol,
          total: Object.values(buckets).reduce((a, b) => a + b, 0),
          intervals: buckets,
          history: ["1h", "3h", "6h", "12h", "24h", "48h"].map((k) => buckets[k]),
          preloaded: fromTrending,
        },
      ]);
    } catch (err) {
      console.error("Token selection failed:", err);
      alert("Failed to fetch token data. Please try again.");
    }

    setLoadingTokens(prev => {
      const newSet = new Set(prev);
      newSet.delete(symbol);
      return newSet;
    });
    setSearchInput("");
    setFilteredOptions(tokenOptions);
  };

  const handleSearchInput = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    setFilteredOptions(
      tokenOptions.filter((t) =>
        t.token_symbol.toLowerCase().includes(val.toLowerCase())
      )
    );
    setHighlightedIndex(-1);
  };

  const handleRemoveToken = (symbol) => {
    setWatchlist((prev) => prev.filter((t) => t.token !== symbol));
  };

  const handleShare = async (token) => {
    const cardEl = cardRefs.current[token];
    if (!cardEl) return;

    try {
      const button = cardEl.querySelector("button[title='Download card']");
      if (button) button.style.visibility = "hidden";

      // Use html-to-image instead of html2canvas
      const dataUrl = await toPng(cardEl, {
        backgroundColor: null,
        quality: 1.0,
        pixelRatio: 2, // Higher resolution
      });

      // Create a canvas to add watermark
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Create image from dataUrl
      const img = new Image();
      img.onload = () => {
        // Set canvas size to match image
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the main image
        ctx.drawImage(img, 0, 0);
        
        // Add watermark
        const watermark = new Image();
        watermark.src = logo;
        watermark.onload = () => {
          const padding = 12;
          const scale = 0.25;
          const w = watermark.width * scale;
          const h = watermark.height * scale;

          ctx.drawImage(
            watermark,
            canvas.width - w - padding,
            canvas.height - h - padding,
            w,
            h
          );

          // Download the final image
          const finalDataUrl = canvas.toDataURL("image/png");
          const link = document.createElement("a");
          link.href = finalDataUrl;
          link.download = `${token}-twittercard.png`;
          link.click();
        };
      };
      img.src = dataUrl;

      if (button) button.style.visibility = "visible";
    } catch (err) {
      console.error("Image capture failed:", err);
    }
  };

  return (
    <div className="bg-[#0A0A0E] min-h-screen text-white font-mono tracking-widest">
      <Header />
      <div className="text-center pt-10 pb-6 px-4">
        <h1 className="text-2xl sm:text-3xl font-semibold">TwitterScan</h1>
        <p className="text-sm text-[#AAA] mt-2 font-light">
          Realtime tweet tracking for Solana tokens.
        </p>
      </div>

      <div className="flex justify-center mb-12 px-4">
        <div className="relative w-full max-w-md">
          <input
            type="text"
            value={searchInput}
            onChange={handleSearchInput}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlightedIndex((prev) =>
                  Math.min(prev + 1, filteredOptions.length - 1)
                );
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlightedIndex((prev) => Math.max(prev - 1, 0));
              } else if (e.key === "Enter" && highlightedIndex >= 0) {
                e.preventDefault();
                handleSelectToken(filteredOptions[highlightedIndex].token_symbol);
              } else if (e.key === "Enter" && searchInput.trim()) {
                e.preventDefault();
                handleSelectToken(searchInput.trim());
              } else if (e.key === "Escape") {
                setHighlightedIndex(-1);
              }
            }}
            placeholder="Search token..."
            className="w-full px-4 py-2.5 rounded-full bg-[#14141A] border border-[#2A2A2A] text-white placeholder-[#777] focus:ring-2 focus:ring-[#FF4DFF] outline-none font-mono tracking-widest"
          />
          <MagnifyingGlassIcon className="w-5 h-5 absolute right-4 top-2.5 text-[#FF4DFF]" />
          {searchInput && (
            <div className="absolute w-full bg-[#1A1A1A] border border-[#2A2A2A] mt-2 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto">
              {filteredOptions.map((token, i) => (
                <div
                  key={i}
                  onClick={() => handleSelectToken(token.token_symbol)}
                  className={`px-4 py-2 text-sm flex justify-between font-mono cursor-pointer ${
                    i === highlightedIndex
                      ? "bg-[#333] text-[#FF4DFF]"
                      : "hover:bg-[#2C2C2C]"
                  }`}
                >
                  <span>{token.token_symbol}</span>
                  <span className="text-[#FF4DFF]">({token.token_name})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="px-6 max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
        {loading ? (
          <>
            <div className="col-span-full text-center text-[#999] italic animate-pulse mb-6">
              Fetching trending token...
            </div>
            {/* Show shimmer cards while loading trending */}
            <ShimmerCard />
          </>
        ) : (
          <>
            {/* Render actual watchlist cards */}
            {watchlist.map(({ token, total, intervals, history, preloaded }, index) => (
              <div key={index} className="relative">
                {preloaded && (
                  <div className="absolute -top-4 left-1 z-10">
                    <span className="text-xs bg-[#1A1A1A] px-3 py-1 rounded-full border border-[#FF4DFF] text-[#FF4DFF] w-fit">
                      🔥 Trending — Top 24h Volume
                    </span>
                  </div>
                )}
                <div
                  ref={(el) => (cardRefs.current[token] = el)}
                  className="relative bg-[#13131A] border border-[#2A2A2A] p-5 rounded-xl transition-all hover:shadow-[0_0_15px_#FF4DFF40]"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h2 className="text-base font-normal">{token}</h2>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleShare(token)}
                          title="Download card"
                          className="text-[#888] hover:text-white transition-all"
                        >
                          <ArrowDownTrayIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRemoveToken(token)}
                          title="Remove"
                          className="text-[#888] hover:text-red-500 transition-all"
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-xs text-[#FF4DFF] mt-1">
                        {total.toLocaleString()} <span className="text-[#AAA]">tweets</span>
                      </div>
                    </div>
                  </div>

                  <ul className="text-sm text-[#AAA] space-y-1 mb-4">
                    {Object.entries(intervals).map(([label, value]) => (
                      <li key={label} className="flex justify-between">
                        <span>{label}</span>
                        <span>{value.toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>

                  <SimpleBarChart
                    data={history}
                    labels={["1h", "3h", "6h", "12h", "24h", "48h"]}
                  />
                </div>
              </div>
            ))}

            {/* Render shimmer cards for tokens currently being loaded */}
            {Array.from(loadingTokens).map((token) => (
              <div key={`loading-${token}`} className="relative">
                <div className="absolute -top-4 left-1 z-10">
                  <span className="text-xs bg-[#1A1A1A] px-3 py-1 rounded-full border border-[#FF4DFF] text-[#FF4DFF] w-fit animate-pulse">
                    Loading {token}...
                  </span>
                </div>
                <ShimmerCard />
              </div>
            ))}

            {/* Empty state */}
            {watchlist.length === 0 && loadingTokens.size === 0 && (
              <div className="col-span-full text-center text-[#777] italic mt-8">
                Your watchlist is empty. Search for a token above to get started.
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
      
      <style>{`
        .shimmer {
          background: linear-gradient(90deg, #2A2A2A 25%, #3A3A3A 50%, #2A2A2A 75%);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
        
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
    </div>
  );
};

export default TwitterScan;