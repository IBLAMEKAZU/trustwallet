"use client";

import { useEffect, useMemo, useState } from "react";
import Web3 from "web3";

const BSC_CHAIN_ID_HEX = "0x38";
const BSC_CHAIN_ID_DEC = 56;
const USDT_CONTRACT_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";
const USDT_ABI = [
  {
    constant: true,
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "decimals",
    outputs: [{ name: "", type: "uint8" }],
    type: "function",
  },
  {
    constant: true,
    inputs: [],
    name: "symbol",
    outputs: [{ name: "", type: "string" }],
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    type: "function",
  },
];

type WalletState = {
  account: string | null;
  balance: string;
  symbol: string;
  chainId: number | null;
  status: string;
  txHash: string | null;
};

function formatBalance(raw: string, decimals: number) {
  const numeric = Number(raw) / 10 ** decimals;
  return numeric.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  });
}

export default function WalletApp() {
  const [account, setAccount] = useState<string | null>(null);
  const [balance, setBalance] = useState("0");
  const [symbol, setSymbol] = useState("USDT");
  const [chainId, setChainId] = useState<number | null>(null);
  const [status, setStatus] = useState("Connect your wallet to continue.");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("0");
  const [busy, setBusy] = useState(false);

  const web3 = useMemo(() => {
    const provider = (window as any)?.ethereum || (window as any)?.trustwallet;
    return provider ? new Web3(provider) : null;
  }, []);

  const refreshBalance = async (walletAddress: string) => {
    if (!web3) return;
    try {
      const contract = new web3.eth.Contract(USDT_ABI as any, USDT_CONTRACT_ADDRESS);
      const [rawBalance, decimals, tokenSymbol] = await Promise.all([
        contract.methods.balanceOf(walletAddress).call(),
        contract.methods.decimals().call(),
        contract.methods.symbol().call(),
      ]);
      setBalance(formatBalance(rawBalance, Number(decimals)));
      setSymbol(tokenSymbol || "USDT");
      setStatus("Wallet connected.");
    } catch (error) {
      setStatus("Unable to load wallet balance.");
      console.error(error);
    }
  };

  const ensureBscNetwork = async () => {
    const provider = (window as any)?.ethereum || (window as any)?.trustwallet;
    if (!provider) {
      setStatus("No wallet provider detected. Please open this page in a wallet-enabled browser.");
      return;
    }

    try {
      const currentChain = await provider.request({ method: "eth_chainId" });
      setChainId(Number(currentChain));
      if (Number(currentChain) !== BSC_CHAIN_ID_DEC) {
        try {
          await provider.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: BSC_CHAIN_ID_HEX }],
          });
          const newChain = await provider.request({ method: "eth_chainId" });
          setChainId(Number(newChain));
        } catch (switchError: any) {
          if (switchError?.code === 4902) {
            await provider.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: BSC_CHAIN_ID_HEX,
                  chainName: "BNB Smart Chain",
                  nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
                  rpcUrls: ["https://bsc-rpc.publicnode.com"],
                  blockExplorerUrls: ["https://bscscan.com"],
                },
              ],
            });
          } else {
            throw switchError;
          }
        }
      }
    } catch (error) {
      setStatus("Please switch your wallet to BNB Smart Chain.");
      console.error(error);
    }
  };

  useEffect(() => {
    const init = async () => {
      const provider = (window as any)?.ethereum || (window as any)?.trustwallet;
      if (!provider) return;

      await ensureBscNetwork();

      try {
        const accounts = await provider.request({ method: "eth_accounts" });
        if (accounts && accounts.length > 0) {
          const connected = accounts[0];
          setAccount(connected);
          await refreshBalance(connected);
        }
      } catch (error) {
        console.error(error);
      }
    };

    init();
  }, [web3]);

  const connectWallet = async () => {
    const provider = (window as any)?.ethereum || (window as any)?.trustwallet;
    if (!provider) {
      setStatus("Install MetaMask or Trust Wallet to connect.");
      return;
    }

    setBusy(true);
    try {
      await ensureBscNetwork();
      const accounts = await provider.request({ method: "eth_requestAccounts" });
      const walletAddress = accounts[0];
      setAccount(walletAddress);
      await refreshBalance(walletAddress);
      setTxHash(null);
    } catch (error: any) {
      setStatus(error?.message || "Connection failed.");
      console.error(error);
    } finally {
      setBusy(false);
    }
  };

  const sendUsdt = async () => {
    if (!web3 || !account) {
      setStatus("Connect a wallet before sending.");
      return;
    }

    if (!recipient || !web3.utils.isAddress(recipient)) {
      setStatus("Enter a valid recipient address.");
      return;
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setStatus("Enter a valid transfer amount.");
      return;
    }

    setBusy(true);
    try {
      const contract = new web3.eth.Contract(USDT_ABI as any, USDT_CONTRACT_ADDRESS);
      const decimals = Number(await contract.methods.decimals().call());
      const rawAmount = (numericAmount * 10 ** decimals).toString();

      const txReceipt = await contract.methods.transfer(recipient, rawAmount).send({ from: account });
      setTxHash(txReceipt.transactionHash || null);
      setStatus(`Transfer successful. ${numericAmount} ${symbol} sent.`);
      await refreshBalance(account);
    } catch (error: any) {
      setStatus(error?.message || "Transfer failed.");
      console.error(error);
    } finally {
      setBusy(false);
    }
  };

  const canSend = Boolean(account) && !busy && Number(amount) > 0 && !!recipient;

  return (
    <main className="wallet-shell">
      <div className="wallet-card">
        <div className="header-row">
          <div>
            <p className="eyebrow">BNB Smart Chain</p>
            <h1>Trust Wallet Demo</h1>
          </div>
          <button onClick={connectWallet} disabled={busy} className="primary-button">
            {account ? "Reconnect" : "Connect"}
          </button>
        </div>

        <div className="info-box">
          <span className="label">Wallet</span>
          <strong>{account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "Not connected"}</strong>
        </div>

        <div className="info-box">
          <span className="label">Network</span>
          <strong>{chainId ? `BSC (${chainId})` : "Unknown"}</strong>
        </div>

        <div className="balance-box">
          <span className="label">USDT balance</span>
          <strong>{balance} {symbol}</strong>
        </div>

        <div className="status-box">{status}</div>

        <div className="transfer-form">
          <label>
            Recipient address
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="0x..."
            />
          </label>

          <label>
            Amount ({symbol})
            <input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>

          <button onClick={sendUsdt} disabled={!canSend} className="primary-button full-width">
            {busy ? "Processing..." : "Send USDT"}
          </button>
        </div>

        {txHash && (
          <div className="hash-box">
            <span className="label">Transaction</span>
            <a href={`https://bscscan.com/tx/${txHash}`} target="_blank" rel="noreferrer">
              {txHash.slice(0, 12)}...{txHash.slice(-10)}
            </a>
          </div>
        )}
      </div>

      <style jsx>{`
        .wallet-shell {
          min-height: 100vh;
          display: grid;
          place-items: center;
          background: radial-gradient(circle at top, #132238, #0b1220 50%);
          padding: 24px;
        }

        .wallet-card {
          width: min(100%, 560px);
          background: rgba(11, 17, 27, 0.96);
          border: 1px solid rgba(160, 175, 210, 0.2);
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(2, 6, 23, 0.45);
          padding: 24px;
        }

        .header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 20px;
        }

        h1 {
          margin: 4px 0 0;
          font-size: clamp(1.6rem, 3vw, 2.1rem);
        }

        .eyebrow {
          margin: 0;
          color: #74c0fc;
          font-size: 0.74rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .primary-button {
          border: none;
          border-radius: 999px;
          background: linear-gradient(135deg, #4dabf7, #228be6);
          color: white;
          font-weight: 700;
          padding: 0.8rem 1.2rem;
          cursor: pointer;
          transition: transform 0.15s ease, opacity 0.15s ease;
        }

        .primary-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .primary-button:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .full-width {
          width: 100%;
          margin-top: 8px;
        }

        .info-box, .balance-box, .hash-box {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          background: rgba(17, 24, 39, 0.9);
          border: 1px solid rgba(148, 163, 184, 0.12);
          border-radius: 14px;
          padding: 14px 16px;
          margin-bottom: 12px;
        }

        .label {
          color: #8da0bc;
          font-size: 0.78rem;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .balance-box strong {
          font-size: 1.2rem;
        }

        .status-box {
          background: rgba(15, 118, 110, 0.12);
          border: 1px solid rgba(45, 212, 191, 0.3);
          color: #c7f9f2;
          border-radius: 12px;
          padding: 12px 14px;
          margin: 12px 0 18px;
        }

        .transfer-form {
          display: grid;
          gap: 14px;
        }

        label {
          display: grid;
          gap: 8px;
          font-weight: 600;
          color: #dfeaf9;
        }

        input {
          background: rgba(15, 23, 42, 0.92);
          border: 1px solid rgba(148, 163, 184, 0.2);
          color: white;
          border-radius: 12px;
          padding: 0.9rem 1rem;
        }

        a {
          color: #7dd3fc;
          word-break: break-all;
        }
      `}</style>
    </main>
  );
}
