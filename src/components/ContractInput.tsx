"use client";

import { useState } from "react";
import { FaMapMarkerAlt } from "react-icons/fa";

interface ContractInputProps {
  defaultAddress: string;
  onSubmit: (address: string) => void;
}

export default function ContractInput({ defaultAddress, onSubmit }: ContractInputProps) {
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
        Paste a verified Sei EVM contract
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
