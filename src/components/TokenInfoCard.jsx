/* eslint-disable react-hooks/rules-of-hooks */
import React, { useMemo } from "react";
import solanaIcon from "../assets/solana.png";
import { 
  ChartBarIcon,           // Replaces AiOutlineLineChart
  InformationCircleIcon   // Replaces HiOutlineInformationCircle
} from "@heroicons/react/24/outline";
import PropTypes from "prop-types";

const getScoreColor = (score = 0) => {
  if (score >= 49) return "bg-green-500 shadow-green-500/40";
  if (score >= 25) return "bg-yellow-400 shadow-yellow-400/40";
  return "bg-red-500 shadow-red-500/40";
};

// eslint-disable-next-line react/prop-types
const TokenInfoCard = React.memo(function TokenInfoCard({ token, isLoading }) {
  if (!token) return null;

  const scoreColor = useMemo(() => getScoreColor(Number(token.wom_score)), [token.wom_score]);

  const marketData = useMemo(
    () => [
      {
        label: "Market Cap",
        value: token.market_cap_usd != null ? `$${token.market_cap_usd.toLocaleString()}` : "—",
      },
      {
        label: "24h Volume",
        value: token.volume_usd != null ? `$${token.volume_usd.toLocaleString()}` : "—",
      },
      {
        label: "Liquidity",
        value: token.liquidity_usd != null ? `$${token.liquidity_usd.toLocaleString()}` : "—",
      },
      {
        label: "1h Change",
        value: `${(token.pricechange1h ?? 0).toFixed(2)}%`,
        className: token.pricechange1h >= 0 ? "text-green-400" : "text-red-400",
      },
    ],
    [token]
  );

  if (isLoading) {
    return (
      <div className="w-full p-4 rounded-xl bg-black/30 border border-gray-800 animate-pulse space-y-4">
        <div className="h-6 w-32 bg-gray-700 rounded" />
        <div className="h-4 w-24 bg-gray-700 rounded" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-5 bg-gray-700 rounded col-span-1" />
          <div className="h-5 bg-gray-700 rounded col-span-1" />
          <div className="h-5 bg-gray-700 rounded col-span-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative p-5 rounded-2xl bg-[#0A0F0A] border border-gray-800/60 shadow-xl transition-all duration-300 hover:border-green-500/30">
      {/* DEX Link */}
      <div className="absolute top-4 right-4">
        <a
          href={token.dex_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-green-400 transition"
        >
          <ChartBarIcon className="w-5 h-5" />
        </a>
      </div>

      {/* Header Info */}
      <div className="flex items-center gap-4 mb-4">
        <img
          src={token.image_url || solanaIcon}
          alt={token.token_symbol}
          className="w-10 h-10 rounded-lg shadow-sm border border-green-900 object-cover"
        />
        <div>
          <h2 className="text-lg font-semibold text-green-300">
            {token.token_symbol?.toUpperCase()}
          </h2>
          <p className="text-xs text-gray-500">
            {token.age ? `${token.age} old` : "—"}
          </p>
        </div>
      </div>

      {/* WOM Score */}
      <div className="mb-5">
        <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
          <span>WOM SCORE</span>
          <span className="relative group">
            <InformationCircleIcon className="w-4 h-4 cursor-pointer hover:text-green-400" />
            <div className="absolute left-4 top-5 z-10 hidden group-hover:block bg-[#0A0F0A] text-[11px] text-white p-2 rounded-md shadow-md w-52 border border-green-400">
              WOM (Word-of-Mouth) Score shows how much social buzz this token has on Twitter.
            </div>
          </span>
        </div>

        <div className="relative w-full h-2 rounded-full bg-gray-800 overflow-hidden">
          {token.wom_score === "Calculating..." ? (
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-green-400 via-green-200 to-green-400 animate-pulse" />
          ) : (
            <div
              className={`absolute top-0 left-0 h-full ${scoreColor}`}
              style={{ width: `${token.wom_score ?? 0}%` }}
            />
          )}
        </div>
        <p className="text-xs mt-1 text-gray-300">
          {token.wom_score === "Calculating..." ? "Analyzing tweets..." : `${token.wom_score}/100`}
        </p>
      </div>

      {/* Market Stats */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        {marketData.map((item, i) => (
          <div key={i} className="flex flex-col bg-[#111] p-3 rounded-xl">
            <span className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">
              {item.label}
            </span>
            <span className={`font-semibold ${item.className || "text-gray-200"}`}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

TokenInfoCard.propTypes = {
  token: PropTypes.shape({
    image_url: PropTypes.string,
    token_symbol: PropTypes.string,
    age: PropTypes.string, 
    wom_score: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    dex_url: PropTypes.string,
    market_cap_usd: PropTypes.number,
    volume_usd: PropTypes.number,
    liquidity_usd: PropTypes.number,
    pricechange1h: PropTypes.number,
  }),
};

export default TokenInfoCard;