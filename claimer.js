import "dotenv/config";
import { ethers } from "ethers";

/**
 * WEN Auto Claimer Bot (Base)
 * - Calls a permissionless claim method on a target contract at a fixed interval
 * - Designed for “anyone-can-call” vesting/airdrop contracts (tokens go to beneficiary)
 *
 * ENV:
 *  RPC_URL
 *  PRIVATE_KEY
 *  CONTRACT_ADDRESS
 *  METHOD            (claim | release | withdraw)
 *  INTERVAL_MINUTES  (default: 5)
 *  MIN_CLAIMABLE_WEI (default: 0)
 */

// ---------- Config ----------
const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const METHOD = (process.env.METHOD || "claim").trim();
const INTERVAL_MINUTES = Number(process.env.INTERVAL_MINUTES || "5");
const MIN_CLAIMABLE_WEI = BigInt(process.env.MIN_CLAIMABLE_WEI || "0");

// Basic validations
function requireEnv(name, value) {
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
}

requireEnv("RPC_URL", RPC_URL);
requireEnv("PRIVATE_KEY", PRIVATE_KEY);
requireEnv("CONTRACT_ADDRESS", CONTRACT_ADDRESS);

// ---------- Provider / Wallet ----------
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// ---------- Minimal ABI ----------
const ABI = [
  // claim methods
  "function claim() external",
  "function release() external",
  "function withdraw() external",

  // optional view methods for claimable amounts (common patterns)
  "function claimable() external view returns (uint256)",
  "function releasable() external view returns (uint256)"
];

const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

// ---------- Helpers ----------
async function safeCall(fn, fallback = null) {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

async function getClaimableAmountWei() {
  // Try common patterns. If not available, return null.
  const claimable = await safeCall(() => contract.claimable(), null);
  if (claimable !== null) return claimable;

  const releasable = await safeCall(() => contract.releasable(), null);
  if (releasable !== null) return releasable;

  return null;
}

function nowISO() {
  return new Date().toISOString();
}

function minutesToMs(min) {
  return Math.max(1, min) * 60 * 1000;
}

async function sendClaimTx() {
  // Select method safely
  if (METHOD === "claim") return await contract.claim();
  if (METHOD === "release") return await contract.release();
  if (METHOD === "withdraw") return await contract.withdraw();

  throw new Error(`Unsupported METHOD="${METHOD}". Use: claim | release | withdraw`);
}

// ---------- Main Loop ----------
async function tick() {
  console.log(`\n[${nowISO()}] ⏱ Checking contract: ${CONTRACT_ADDRESS}`);
  console.log(`[${nowISO()}] 👛 Bot wallet: ${wallet.address}`);
  console.log(`[${nowISO()}] 🔧 Method: ${METHOD}`);

  // Optional: check claimable amount first (if contract supports it)
  const claimableWei = await getClaimableAmountWei();

  if (claimableWei === null) {
    console.log(`[${nowISO()}] ℹ️ Claimable view method not found. Attempting tx anyway...`);
  } else {
    console.log(`[${nowISO()}] ✅ Claimable (wei): ${claimableWei.toString()}`);
    if (claimableWei <= MIN_CLAIMABLE_WEI) {
      console.log(
        `[${nowISO()}] 😴 Below threshold (MIN_CLAIMABLE_WEI=${MIN_CLAIMABLE_WEI.toString()}). Skipping.`
      );
      return;
    }
  }

  // Send tx
  try {
    const tx = await sendClaimTx();
    console.log(`[${nowISO()}] 🚀 TX sent: ${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`[${nowISO()}] 🎉 Confirmed in block: ${receipt.blockNumber}`);
  } catch (err) {
    const msg = err?.shortMessage || err?.message || String(err);
    console.error(`[${nowISO()}] ❌ TX failed: ${msg}`);
  }
}

// ---------- Boot ----------
console.log("🤖 WEN Auto Claimer Bot started");
console.log(`⏲ Interval: ${INTERVAL_MINUTES} minute(s)`);

// Run once immediately
await tick();

// Then run on interval
setInterval(() => {
  tick().catch((e) => console.error("Tick error:", e?.message || e));
}, minutesToMs(INTERVAL_MINUTES));
