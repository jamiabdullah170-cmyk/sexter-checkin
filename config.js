// =============================================================================
// KONFIGURASI — Sexter Daily Check-In (Agent ID)
// =============================================================================
// CONTRACT_ADDRESS: alamat kontrak SexterCheckIn di BNB Chain (CREATE2,
// sudah ditentukan sebelum deploy dan tidak berubah).
// DEPLOY_BLOCK: nomor blok saat kontrak di-deploy — dipakai leaderboard
// supaya query event tidak mulai dari blok 0. Diisi setelah deploy.
// =============================================================================
const CONFIG = {
  CONTRACT_ADDRESS: "0xA5fB97140B821B556678a73Df272F1A5042D80e1",
  DEPLOY_BLOCK: 134473146,

  // BNB Smart Chain mainnet.
  CHAIN_ID: 56,
  CHAIN_NAME: "BNB Smart Chain",
  CHAIN_RPC: "https://bsc-dataseed.binance.org", // RPC publik read-only, tanpa key
  BSCSCAN_TX: "https://bscscan.com/tx/",
  BSCSCAN_ADDRESS: "https://bscscan.com/address/",

  // Kontrak SPACE ID Agent ID (ERC-721, non-transferable) — alamat resmi dari
  // pengumuman Binance Agent ID Hackathon.
  AGENT_ID_ADDRESS: "0x60b9262456de011f7d15a54cdd8c48baaa8b022f",

  LEADERBOARD_TOP: 20,
};
