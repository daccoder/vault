"use client";

import { FaBookDead } from "react-icons/fa";
import type { AbiFunction } from "viem";
import type { FunctionResult } from "@/lib/useContractData";

interface ContractGrimoireProps {
  abiFunctions: AbiFunction[];
  results: Record<string, FunctionResult>;
  inputValues: Record<string, Record<string, string>>;
  loading: boolean;
  error: string | null;
  hasContract: boolean;
  chainName: string;
  onCallFunction: (fn: AbiFunction, args: Record<string, string>) => void;
  onInputChange: (fnName: string, inputName: string, value: string) => void;
}

function formatResult(val: unknown): string {
  if (val === null || val === undefined) return "\u2014";
  if (typeof val === "bigint") return val.toLocaleString();
  if (typeof val === "boolean") return val ? "true" : "false";
  if (Array.isArray(val)) return val.map(formatResult).join(", ");
  return String(val);
}

export default function ContractGrimoire({
  abiFunctions,
  results,
  inputValues,
  loading,
  error,
  hasContract,
  chainName,
  onCallFunction,
  onInputChange,
}: ContractGrimoireProps) {
  return (
    <div className="stone-bg gold-border p-6 rounded-2xl min-h-[500px]">
      <div className="flex justify-between items-center mb-6 border-b border-amber-900/40 pb-4">
        <h2 className="font-heading text-2xl text-amber-500">
          <FaBookDead className="inline mr-3" /> Contract Reader
        </h2>
        <span className="text-[10px] bg-emerald-900/40 text-emerald-300 px-3 py-1 rounded-full border border-emerald-800">
          READ ONLY
        </span>
      </div>

      {!hasContract && (
        <p className="text-gray-500 text-center py-16 italic">
          Enter a verified contract address to read its functions
        </p>
      )}

      {loading && (
        <div className="text-center py-16">
          <p className="text-amber-400 animate-pulse">Fetching ABI &amp; reading contract...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/15 border border-red-900/50 rounded-xl p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {abiFunctions.length > 0 && (
        <p className="text-xs text-gray-500 mb-4">
          {abiFunctions.length} read function{abiFunctions.length !== 1 && "s"} found
        </p>
      )}

      <div className="space-y-3">
        {abiFunctions.map((fn) => {
          const res = results[fn.name];
          const hasInputs = fn.inputs.length > 0;

          return (
            <div
              key={fn.name}
              className="bg-black/25 border border-gray-800/60 p-4 rounded-xl hover:border-amber-800/50 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-amber-400 font-bold mb-1">
                    {fn.name}
                    <span className="text-gray-600 text-sm font-normal ml-0.5">
                      ({fn.inputs.map((i) => i.type).join(", ")})
                    </span>
                  </p>

                  {hasInputs && (
                    <div className="mt-3 space-y-2">
                      {fn.inputs.map((input) => (
                        <div key={input.name} className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-500 w-24 shrink-0 font-mono">
                            {input.name}
                          </span>
                          <input
                            type="text"
                            placeholder={input.type}
                            value={inputValues[fn.name]?.[input.name ?? ""] ?? ""}
                            onChange={(e) =>
                              onInputChange(fn.name, input.name ?? "", e.target.value)
                            }
                            className="flex-1 bg-black/40 border border-gray-700/50 rounded-lg px-2.5 py-1.5 text-xs text-amber-200 focus:outline-none focus:border-amber-700 placeholder:text-gray-600"
                          />
                        </div>
                      ))}
                      <button
                        onClick={() => onCallFunction(fn, inputValues[fn.name] ?? {})}
                        className="mt-2 text-xs bg-amber-900/30 text-amber-300 px-4 py-1.5 rounded-lg border border-amber-800/50 hover:bg-amber-800/40 transition-colors"
                      >
                        Query
                      </button>
                    </div>
                  )}
                </div>

                <div className="md:text-right shrink-0">
                  <p className="text-[10px] text-gray-600 uppercase mb-1 tracking-wider">
                    {fn.outputs.map((o) => o.type).join(", ")}
                  </p>
                  {res?.loading ? (
                    <p className="text-amber-400/50 text-sm animate-pulse">reading...</p>
                  ) : res?.error ? (
                    <p
                      className="text-red-400/80 text-xs font-mono bg-red-900/15 px-3 py-1.5 rounded-lg border border-red-900/30 inline-block max-w-[250px] truncate"
                      title={res.error}
                    >
                      {res.error}
                    </p>
                  ) : (
                    <p className="text-blue-300/90 font-mono text-sm bg-blue-900/10 px-3 py-1.5 rounded-lg border border-blue-900/30 inline-block break-all max-w-[320px]">
                      {formatResult(res?.value)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 p-4 border-t border-amber-900/30 text-center">
        <p className="text-[10px] text-gray-600 tracking-wide">
          Live reads from {chainName}
        </p>
      </div>
    </div>
  );
}
