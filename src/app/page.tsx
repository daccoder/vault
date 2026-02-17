"use client";

import { useState } from "react";
import Header from "@/components/Header";
import AirdropProgress from "@/components/AirdropProgress";
import ContractInput from "@/components/ContractInput";
import ContractGrimoire from "@/components/ContractGrimoire";
import { DEFAULT_CONTRACT_ADDRESS } from "@/lib/constants";
import { useContractData } from "@/lib/useContractData";
import { CHAIN_OPTIONS } from "@/lib/types";

export default function Home() {
  const [contractAddress, setContractAddress] = useState(DEFAULT_CONTRACT_ADDRESS);
  const [chainId, setChainId] = useState(1329);
  const {
    abiFunctions,
    results,
    inputValues,
    loading,
    scanningEvents,
    error,
    tokenInfo,
    callFunction,
    handleInputChange,
  } = useContractData(contractAddress, chainId);

  const chainName = CHAIN_OPTIONS.find((c) => c.id === chainId)?.name ?? "Unknown";

  return (
    <div className="min-h-screen p-4 md:p-8">
      <Header />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Stats & Input */}
        <div className="space-y-6">
          <ContractInput
            defaultAddress={DEFAULT_CONTRACT_ADDRESS}
            chainId={chainId}
            onSubmit={setContractAddress}
            onChainChange={setChainId}
          />
          <AirdropProgress
            tokenInfo={tokenInfo}
            loading={loading}
            scanningEvents={scanningEvents}
            hasContract={!!contractAddress}
          />
        </div>

        {/* Right Column: Contract Reader */}
        <div className="lg:col-span-2">
          <ContractGrimoire
            abiFunctions={abiFunctions}
            results={results}
            inputValues={inputValues}
            loading={loading}
            error={error}
            hasContract={!!contractAddress}
            chainName={chainName}
            onCallFunction={callFunction}
            onInputChange={handleInputChange}
          />
        </div>
      </div>
    </div>
  );
}
