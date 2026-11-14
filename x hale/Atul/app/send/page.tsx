"use client";

import { useState } from "react";

const BALANCE = 0.01; // USDT balance
const PRICE = 1; // USD per USDT
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"];

type Props = {
  address?: string;
  onBack?: () => void;
  onReview?: (amount: number) => void;
};

export default function SendAmount({
  address = "0x37e6b03d83fc4bdafb4d57d9187802d5cffffdda",
  onBack,
  onReview,
}: Props) {
  const [val, setVal] = useState("");
  const [usdMode, setUsdMode] = useState(false);

  const n = parseFloat(val) || 0;
  const tokenAmt = usdMode ? n / PRICE : n;
  const valid = tokenAmt > 0 && tokenAmt <= BALANCE;
  const fiat = usdMode ? `${tokenAmt.toFixed(2)} USDT` : `$${(tokenAmt * PRICE).toFixed(2)}`;

  const press = (k: string) => {
    setVal((v) => {
      if (k === "del") return v.slice(0, -1);
      if (k === ".") return v.includes(".") ? v : (v || "0") + ".";
      const next = v === "0" ? k : v + k;
      const dec = next.split(".")[1];
      return dec && dec.length > 6 ? v : next;
    });
  };

  const setMax = () => setVal(String(usdMode ? BALANCE * PRICE : BALANCE));

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col bg-[#0f121b] px-[4.5%] pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] font-sans text-white">
      {/* Header */}
      <header className="relative -mx-[4.5%] flex h-[72px] shrink-0 items-center justify-center border-b border-[#1b1f2c] px-[4.5%]">
        <button
          onClick={onBack}
          aria-label="Back"
          className="absolute left-[4.5%] grid h-12 w-12 place-items-center rounded-full bg-[#1a1e2d]"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <h1 className="text-xl font-semibold">Amount</h1>
      </header>

      {/* To address */}
      <div className="-mx-[4.5%] flex gap-2 border-b border-[#1b1f2c] px-[4.5%] py-4 text-[19px] font-medium leading-snug">
        <span className="shrink-0 text-[#8b90a0]">To:</span>
        <b className="break-all font-medium">{address}</b>
      </div>

      {/* Amount display */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center">
        <div
          className={`max-w-full overflow-hidden whitespace-nowrap font-bold leading-none ${val ? "text-white" : "text-[#363f66]"}`}
          style={{ fontSize: Math.max(40, 84 - Math.max(0, val.length - 6) * 8) }}
        >
          {val || "0"}
        </div>
        <button
          onClick={() => {
            setUsdMode((m) => !m);
            setVal("");
          }}
          aria-label="Swap currency"
          className="mt-3.5 flex items-center gap-2 text-[22px] font-medium"
        >
          <span>≈ {fiat}</span>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 20V5M4 9l4-4 4 4M16 4v15M12 15l4 4 4-4" />
          </svg>
        </button>
      </div>

      {/* Token row */}
      <div className="flex shrink-0 items-center gap-4 pb-3 pt-2">
        <div className="relative h-[60px] w-[60px] shrink-0">
          <div className="grid h-[60px] w-[60px] place-items-center rounded-full bg-[#26a17b]">
            <svg width="34" height="34" viewBox="0 0 32 32" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
              <path d="M6 6h20M16 6v20" />
              <ellipse cx="16" cy="14" rx="12" ry="3.2" strokeWidth="1.6" />
            </svg>
          </div>
          <div className="absolute -bottom-1 -right-1.5 grid h-[26px] w-[26px] place-items-center rounded-[7px] bg-black">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f0b90b" strokeWidth="2" strokeLinejoin="round">
              <path d="M12 3l3 3-3 3-3-3zM6 9l3 3-3 3-3-3zM18 9l3 3-3 3-3-3zM12 15l3 3-3 3-3-3z" />
            </svg>
          </div>
        </div>
        <div className="flex-1">
          <div className="text-[21px] font-semibold">{BALANCE} USDT</div>
          <div className="mt-1 text-lg text-[#8b90a0]">${(BALANCE * PRICE).toFixed(2)}</div>
        </div>
        <button onClick={setMax} className="h-12 rounded-full bg-[#1a1e2d] px-6 text-[19px] font-semibold">
          Max
        </button>
      </div>

      {/* Keypad */}
      <div className="grid shrink-0 grid-cols-3">
        {KEYS.map((k) => (
          <button
            key={k}
            onClick={() => press(k)}
            aria-label={k}
            className="h-[clamp(56px,9.5vh,84px)] rounded-2xl text-[32px] font-semibold active:bg-white/5"
          >
            {k === "del" ? (
              <svg className="mx-auto" width="34" height="34" viewBox="0 0 28 28" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 5h14a2 2 0 012 2v14a2 2 0 01-2 2H9l-6-9z" />
                <path d="M13 10l6 6M19 10l-6 6" />
              </svg>
            ) : (
              k
            )}
          </button>
        ))}
      </div>

      {/* Review */}
      <button
        disabled={!valid}
        onClick={() => onReview?.(tokenAmt)}
        className={`mb-4 mt-3 h-[68px] shrink-0 rounded-full text-[22px] font-semibold transition-colors ${
          valid ? "bg-[#5b7cff] text-white" : "cursor-not-allowed bg-[#1b1d27] text-[#3d4670]"
        }`}
      >
        Review
      </button>
    </div>
  );
}
