"use client";

import { useState } from "react";
import Header from "@/components/Header";
import AirdropProgress from "@/components/AirdropProgress";
import ContractInput from "@/components/ContractInput";
import ContractGrimoire from "@/components/ContractGrimoire";
import { DEFAULT_CONTRACT_ADDRESS } from "@/lib/constants";
import { useContractData } from "@/lib/useContractData";

export default function Home() {
  const [contractAddress, setContractAddress] = useState(DEFAULT_CONTRACT_ADDRESS);
  const {
    abiFunctions,
    results,
    inputValues,
    loading,
    error,
    tokenInfo,
    callFunction,
    handleInputChange,
  } = useContractData(contractAddress);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <Header />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Stats & Input */}
        <div className="space-y-6">
          <ContractInput
            defaultAddress={DEFAULT_CONTRACT_ADDRESS}
            onSubmit={setContractAddress}
          />
          <AirdropProgress
            tokenInfo={tokenInfo}
            loading={loading}
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
            onCallFunction={callFunction}
            onInputChange={handleInputChange}
          />
        </div>
      </div>
    </div>
  );
}
