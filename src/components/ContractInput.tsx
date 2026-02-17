"use client";

import { useState } from "react";
import { FaMapMarkerAlt } from "react-icons/fa";
import { CHAIN_OPTIONS } from "@/lib/types";

interface ContractInputProps {
  defaultAddress: string;
  chainId: number;
  onSubmit: (address: string) => void;
  onChainChange: (chainId: number) => void;
}

export default function ContractInput({
  defaultAddress,
  chainId,
  onSubmit,
  onChainChange,
}: ContractInputProps) {
  const [contractAddress, setContractAddress] = useState(defaultAddress);

  const handleSubmit = () => {
    const trimmed = contractAddress.trim();
    if (trimmed) onSubmit(trimmed);
  };

  return (
    <div className="stone-bg gold-border p-6 rounded-2xl">
      <h2 className="font-heading text-xl text-amber-500 mb-4 border-b border-amber-900/40 pb-2">
        <FaMapMarkerAlt className="inline mr-2" /> Contract Address
      </h2>

      <label className="text-[10px] text-gray-500 block mb-1 uppercase tracking-wider">
        Chain
      </label>
      <select
        value={chainId}
        onChange={(e) => onChainChange(Number(e.target.value))}
        className="w-full p-2.5 rounded-xl input-field text-sm mb-4 focus:outline-none focus:ring-1 focus:ring-amber-700 appearance-none cursor-pointer"
      >
        {CHAIN_OPTIONS.map((chain) => (
          <option key={chain.id} value={chain.id}>
            {chain.name}
          </option>
        ))}
      </select>

      <label className="text-[10px] text-gray-500 block mb-1 uppercase tracking-wider">
        Paste an airdrop distributor address contract address
      </label>
      <input
        type="text"
        value={contractAddress}
        onChange={(e) => setContractAddress(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        placeholder="0x..."
        className="w-full p-2.5 rounded-xl input-field text-sm mb-4 focus:outline-none focus:ring-1 focus:ring-amber-700"
      />
      <button
        onClick={handleSubmit}
        className="w-full btn-primary py-2.5 rounded-xl text-amber-400 font-bold uppercase text-sm"
      >
        Read Contract
      </button>
    </div>
  );
}
