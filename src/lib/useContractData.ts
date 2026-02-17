"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import type { AbiFunction } from "viem";
import { fetchAbi, readContract, fetchMerkleStats } from "@/lib/client";
import type { TokenInfo } from "@/lib/types";

export interface FunctionResult {
  value: unknown;
  loading: boolean;
  error?: string;
}

const CLAIM_FN_PATTERNS = [
  "totalclaimed",
  "claimed",
  "totaldistributed",
  "distributed",
  "totalreleased",
  "released",
  "totalvested",
];

// Heuristic: if the ABI has these functions, it's likely a Merkle distributor
const MERKLE_SIGNATURES = ["isclaimed", "merkleroot", "claim"];

function looksLikeMerkleDistributor(fns: AbiFunction[]): boolean {
  const names = new Set(fns.map((f) => f.name.toLowerCase()));
  return MERKLE_SIGNATURES.filter((s) => names.has(s)).length >= 2;
}

const EMPTY_TOKEN_INFO: TokenInfo = {
  name: null,
  symbol: null,
  decimals: null,
  totalSupply: null,
  totalClaimed: null,
  claimedPercent: null,
  claimCount: null,
  source: null,
};

export function useContractData(contractAddress: string, chainId: number) {
  const [abiFunctions, setAbiFunctions] = useState<AbiFunction[]>([]);
  const [results, setResults] = useState<Record<string, FunctionResult>>({});
  const [inputValues, setInputValues] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(false);
  const [scanningEvents, setScanningEvents] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo>(EMPTY_TOKEN_INFO);

  const addressRef = useRef(contractAddress);
  addressRef.current = contractAddress;

  const chainIdRef = useRef(chainId);
  chainIdRef.current = chainId;

  const callFunction = useCallback(
    async (fn: AbiFunction, args: Record<string, string>) => {
      const key = fn.name;
      setResults((prev) => ({ ...prev, [key]: { value: null, loading: true } }));

      try {
        const fnArgs = fn.inputs.map((input) => {
          const val = args[input.name ?? ""];
          if (input.type.startsWith("uint") || input.type.startsWith("int")) {
            return (val || "0");
          }
          if (input.type === "bool") {
            return val === "true";
          }
          return val || "";
        });

        const result = await readContract(
          addressRef.current,
          fn,
          fnArgs.length > 0 ? fnArgs : undefined,
          chainIdRef.current,
        );

        setResults((prev) => ({
          ...prev,
          [key]: { value: result, loading: false },
        }));

        return result;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Call failed";
        setResults((prev) => ({
          ...prev,
          [key]: { value: null, loading: false, error: msg },
        }));
        return null;
      }
    },
    [],
  );

  // Fetch ABI and auto-read on address or chain change
  useEffect(() => {
    if (!contractAddress) {
      setAbiFunctions([]);
      setResults({});
      setError(null);
      setTokenInfo(EMPTY_TOKEN_INFO);
      setScanningEvents(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setScanningEvents(false);
      setError(null);
      setAbiFunctions([]);
      setResults({});
      setInputValues({});
      setTokenInfo(EMPTY_TOKEN_INFO);

      try {
        const fns = await fetchAbi(contractAddress, chainId);
        if (cancelled) return;
        setAbiFunctions(fns);

        // Auto-call all no-input functions in parallel
        const noInputFns = fns.filter((fn) => fn.inputs.length === 0);
        const autoResults: Record<string, unknown> = {};

        const settled = await Promise.allSettled(
          noInputFns.map(async (fn) => {
            const result = await readContract(contractAddress, fn, undefined, chainId);
            autoResults[fn.name] = result;
            if (!cancelled) {
              setResults((prev) => ({
                ...prev,
                [fn.name]: { value: result, loading: false },
              }));
            }
            return { name: fn.name, result };
          }),
        );

        // Mark failed ones
        for (let i = 0; i < settled.length; i++) {
          const s = settled[i];
          const fn = noInputFns[i];
          if (s.status === "rejected") {
            const msg = s.reason instanceof Error ? s.reason.message : "Call failed";
            if (!cancelled) {
              setResults((prev) => ({
                ...prev,
                [fn.name]: { value: null, loading: false, error: msg },
              }));
            }
          }
        }

        if (cancelled) return;

        // Build token info from auto-read results
        const info: TokenInfo = { ...EMPTY_TOKEN_INFO };

        if (typeof autoResults.name === "string") info.name = autoResults.name;
        if (typeof autoResults.symbol === "string") info.symbol = autoResults.symbol;

        const rawDecimals = autoResults.decimals;
        if (rawDecimals !== undefined && rawDecimals !== null) {
          info.decimals = Number(rawDecimals);
        }

        const rawSupply = autoResults.totalSupply;
        if (rawSupply !== undefined && rawSupply !== null) {
          try {
            info.totalSupply = BigInt(rawSupply as string);
          } catch {
            // not a bigint string
          }
        }

        // Find claimed amount from any matching view function
        for (const pattern of CLAIM_FN_PATTERNS) {
          const fnName = noInputFns.find(
            (f) => f.name.toLowerCase() === pattern,
          )?.name;
          if (fnName && autoResults[fnName] !== undefined && autoResults[fnName] !== null) {
            try {
              info.totalClaimed = BigInt(autoResults[fnName] as string);
              info.source = "view";
              break;
            } catch {
              // not a bigint string
            }
          }
        }

        // Compute claimed percent from view functions
        if (info.totalSupply && info.totalSupply > 0n && info.totalClaimed !== null) {
          info.claimedPercent =
            Number((info.totalClaimed * 10000n) / info.totalSupply) / 100;
        }

        setTokenInfo(info);

        // Main loading done — contract reader is usable now
        setLoading(false);

        // --- Merkle fallback (runs in background) ---
        if (info.claimedPercent === null && looksLikeMerkleDistributor(fns)) {
          if (cancelled) return;
          setScanningEvents(true);
          try {
            const stats = await fetchMerkleStats(contractAddress, chainId);
            if (cancelled) return;

            setTokenInfo((prev) => ({
              ...prev,
              name: stats.tokenName ?? prev.name,
              symbol: stats.tokenSymbol ?? prev.symbol,
              decimals: stats.decimals ?? prev.decimals,
              totalSupply: BigInt(stats.totalAllocation),
              totalClaimed: BigInt(stats.totalClaimed),
              claimedPercent: stats.claimedPercent,
              claimCount: stats.claimCount,
              source: "events",
            }));
          } catch {
            // Event scanning failed — no claim data available
          } finally {
            if (!cancelled) setScanningEvents(false);
          }
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to fetch ABI");
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [contractAddress, chainId, callFunction]);

  const handleInputChange = (fnName: string, inputName: string, value: string) => {
    setInputValues((prev) => ({
      ...prev,
      [fnName]: { ...prev[fnName], [inputName]: value },
    }));
  };

  return {
    abiFunctions,
    results,
    inputValues,
    loading,
    scanningEvents,
    error,
    tokenInfo,
    callFunction,
    handleInputChange,
  };
}
