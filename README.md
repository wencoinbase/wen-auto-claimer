# WEN Auto Claimer Bot 🤖

A production-ready automation bot for the Base network.

This tool executes permissionless (“anyone-can-call”) smart contract methods to claim vested tokens, airdrops, and other claimable rewards on a schedule. When used with public vesting/claim contracts, tokens are delivered to the beneficiary address defined by the contract — not the bot wallet.

> Non-custodial by design. The bot only pays gas and triggers public claim functions.

---

## Features

- Automated execution at a configurable interval
- Non-custodial (gas sponsor wallet only)
- 100% on-chain interactions (no UI automation)
- Supports common claim patterns:
  - Vesting claim contracts (`claim`, `release`, `withdraw`)
  - Airdrop claim contracts
  - Any permissionless public method on Base (extendable)

---

## Requirements

- Node.js 18+ recommended
- A Base RPC endpoint (Alchemy / QuickNode / etc.)
- A dedicated bot wallet with a small ETH balance for gas

---

## Setup

### 1) Install dependencies

```bash
git clone https://github.com/wencoinbase/wen-auto-claimer
cd wen-auto-claimer
npm install
