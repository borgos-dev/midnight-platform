"use client";

import Image from "next/image";

type Props = {
  provider: "MTN_MOMO" | "ORANGE_MONEY";
  setProvider: (p: "MTN_MOMO" | "ORANGE_MONEY") => void;
};

export default function PaymentMethod({ provider, setProvider }: Props) {
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-gray-300">
        Select payment method
      </h2>

      {/* MTN MoMo */}
      <div
        onClick={() => setProvider("MTN_MOMO")}
        className={`border rounded-xl p-3 flex items-center gap-4 cursor-pointer transition
          ${
            provider === "MTN_MOMO"
              ? "border-yellow-400 bg-yellow-400/10"
              : "border-white/10 hover:border-yellow-400"
          }`}
      >
        <input
          type="radio"
          name="payment"
          checked={provider === "MTN_MOMO"}
          readOnly
          className="accent-yellow-400"
        />

        <Image
          src="/payments/mtn-momo-logo.png"
          alt="MTN Mobile Money"
          width={36}
          height={36}
        />

        <span className="font-medium">MTN Mobile Money</span>
      </div>

      {/* Orange Money */}
      <div
        onClick={() => setProvider("ORANGE_MONEY")}
        className={`border rounded-xl p-3 flex items-center gap-4 cursor-pointer transition
          ${
            provider === "ORANGE_MONEY"
              ? "border-orange-500 bg-orange-500/10"
              : "border-white/10 hover:border-orange-500"
          }`}
      >
        <input
          type="radio"
          name="payment"
          checked={provider === "ORANGE_MONEY"}
          readOnly
          className="accent-orange-500"
        />

        <Image
          src="/payments/orange-money-logo.png"
          alt="Orange Money"
          width={36}
          height={36}
        />

        <span className="font-medium">Orange Money</span>
      </div>
    </div>
  );
}
