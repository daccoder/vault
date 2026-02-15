"use client";

import { FaScroll } from "react-icons/fa";
import type { TokenInfo } from "@/lib/types";

interface AirdropProgressProps {
  tokenInfo: TokenInfo;
  loading: boolean;
  hasContract: boolean;
}

function formatBigInt(val: bigint | null, decimals: number | null): string {
  if (val === null) return "—";
  const d = decimals ?? 18;
  const whole = val / 10n ** BigInt(d);
  if (whole >= 1_000_000_000n) return `${(Number(whole) / 1e9).toFixed(2)}B`;
  if (whole >= 1_000_000n) return `${(Number(whole) / 1e6).toFixed(2)}M`;
  if (whole >= 1_000n) return `${(Number(whole) / 1e3).toFixed(2)}K`;
  return whole.toLocaleString();
}

export default function AirdropProgress({
  tokenInfo,
  loading,
  hasContract,
}: AirdropProgressProps) {
  const { name, symbol, totalSupply, totalClaimed, claimedPercent, decimals } =
    tokenInfo;
  const displayPercent = claimedPercent !== null ? Math.round(claimedPercent * 100) / 100 : null;
  const tokenLabel = symbol ?? name ?? "Token";

  return (
    <div className="stone-bg gold-border p-6 rounded-2xl">
      <h2 className="font-heading text-xl text-amber-500 mb-4 border-b border-amber-900/40 pb-2">
        <FaScroll className="inline mr-2" /> Airdrop Tracker
      </h2>

      {!hasContract && (
        <p className="text-gray-500 text-sm italic text-center py-4">
          Enter a contract address to see live stats
        </p>
      )}

      {loading && (
        <p className="text-amber-400/70 text-sm animate-pulse text-center py-4">
          Reading chain data...
        </p>
      )}

      {hasContract && !loading && (
        <>
          {/* Progress bar */}
          <div className="mb-5">
            <div className="flex justify-between mb-2 text-sm">
              <span className="text-gray-400">
                {totalClaimed !== null ? "Claimed" : "Supply Loaded"}
              </span>
              <span className="text-amber-400 font-bold">
                {displayPercent !== null ? `${displayPercent}%` : "—"}
              </span>
            </div>
            <div className="w-full bg-black/60 h-5 rounded-full overflow-hidden border border-gray-800">
              <div
                className="progress-bar-fill h-full transition-all duration-1000 rounded-full"
                style={{ width: `${displayPercent ?? 0}%` }}
              />
            </div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-black/40 p-3 rounded-xl border border-gray-800/60">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                Total Supply
              </p>
              <p className="text-lg text-amber-400 font-bold">
                {formatBigInt(totalSupply, decimals)}{" "}
                <span className="text-xs text-gray-500">{tokenLabel}</span>
              </p>
            </div>

            <div className="bg-black/40 p-3 rounded-xl border border-gray-800/60">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                Total Claimed
              </p>
              <p className="text-lg text-emerald-400 font-bold">
                {totalClaimed !== null
                  ? formatBigInt(totalClaimed, decimals)
                  : "N/A"}
                {totalClaimed !== null && (
                  <span className="text-xs text-gray-500"> {tokenLabel}</span>
                )}
              </p>
            </div>

            {name && (
              <div className="bg-black/40 p-3 rounded-xl border border-gray-800/60">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                  Token
                </p>
                <p className="text-lg text-parchment">{name}</p>
              </div>
            )}

            {symbol && (
              <div className="bg-black/40 p-3 rounded-xl border border-gray-800/60">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                  Symbol
                </p>
                <p className="text-lg text-parchment">{symbol}</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
