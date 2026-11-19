# Sexter Daily Check-In — Agent ID

A daily check-in dApp on BNB Chain, built exclusively for **SPACE ID Agent ID**
holders, by **sexter.ai** for the **Binance Agent ID Hackathon**
(18 Nov – 9 Dec 2026).

**Live app:** https://jamiabdullah170-cmyk.github.io/sexter-checkin/

## What it does

- Holders of an Agent ID (SPACE ID's non-transferable ERC-721 identity for AI
  agents) can check in **once per UTC day**.
- Each check-in is stored on-chain: current streak, last check-in day, and
  lifetime total. Consecutive days grow the streak; missing a day resets it.
- Every check-in emits a `CheckIn` event, so the public leaderboard on the
  site is rebuilt purely from on-chain logs — no server, no database.
- The contract is **immutable and free**: no owner, no admin functions, no
  fees, no token. Check-in costs nothing but gas.

## Contract

| | |
|---|---|
| Contract | `SexterCheckIn` |
| Address (BNB Chain) | `0xA5fB97140B821B556678a73Df272F1A5042D80e1` |
| BscScan | https://bscscan.com/address/0xA5fB97140B821B556678a73Df272F1A5042D80e1 |
| Agent ID registry (gate) | `0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F` |
| Compiler | solc 0.8.28, optimizer 200 runs, EVM paris |
| Source | [`contracts/SexterCheckIn.sol`](../contracts/SexterCheckIn.sol) — MIT |

Deployment used the Arachnid deterministic deployment proxy (CREATE2), so the
address above was fixed and published before deployment.

## How Agent ID is integrated

`checkIn()` calls `balanceOf(msg.sender)` on the official Agent ID registry
and reverts with `NotAgentIdHolder` unless the caller holds an Agent ID. There
is no allowlist or signature server to trust — eligibility is read directly
from the registry contract on every call.

## Repository layout

- `site/` — the static frontend (this folder): `index.html`, `config.js`, `app.js`
- `contracts/` — Solidity sources
- `artifacts/` — compiled artifacts + the standard-json compiler input used
  for source verification
- `tools/` — compile, local test (Ganache, 11 checks), and deployment prep scripts

## Local development

```bash
cd tools
npm install
node compile.mjs   # compiles contracts/ into artifacts/
node test.mjs      # spins up Ganache and runs the behaviour tests
```
