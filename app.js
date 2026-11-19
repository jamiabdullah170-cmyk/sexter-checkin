// =============================================================================
// Sexter Daily Check-In — frontend (statis, tanpa server, tanpa build step)
// - Baca data: RPC publik BSC (read-only, tanpa key).
// - Tulis (check-in): HANYA saat user klik tombol, lewat wallet user sendiri.
// - TIDAK ADA auto-transaction dan tidak ada data yang dikirim ke server mana pun.
// =============================================================================

const CHECKIN_ABI = [
  "function checkIn()",
  "function currentDay() view returns (uint256)",
  "function getCurrentStreak(address) view returns (uint256)",
  "function getUserInfo(address) view returns (uint256 streak, uint256 lastCheckInDay, uint256 total)",
  "function totalCheckIns() view returns (uint256)",
  "function totalUsers() view returns (uint256)",
  "event CheckIn(address indexed user, uint256 indexed day, uint256 streak, uint256 totalCheckIns)",
];
const REGISTRY_ABI = ["function balanceOf(address) view returns (uint256)"];

const $ = (id) => document.getElementById(id);

// RPC publik bisa menolak/membatasi sewaktu-waktu (terutama eth_getLogs) —
// pakai daftar cadangan dan coba satu-satu sampai ada yang menjawab.
const RPC_URLS = [
  CONFIG.CHAIN_RPC,
  "https://bsc-dataseed2.binance.org",
  "https://bsc-rpc.publicnode.com",
  "https://bsc-mainnet.public.blastapi.io",
  "https://bsc.drpc.org",
  "https://bsc-dataseed1.defibit.io",
];
const readProviders = RPC_URLS.map((u) => new ethers.JsonRpcProvider(u));
const contractOn = (p) => new ethers.Contract(CONFIG.CONTRACT_ADDRESS, CHECKIN_ABI, p);
const registryOn = (p) => new ethers.Contract(CONFIG.AGENT_ID_ADDRESS, REGISTRY_ABI, p);
async function withProvider(fn) {
  let lastErr;
  for (const p of readProviders) {
    try {
      return await fn(p);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

let account = null;

$("contract-link").href = CONFIG.BSCSCAN_ADDRESS + CONFIG.CONTRACT_ADDRESS;

function setMsg(text, kind) {
  const el = $("msg");
  el.textContent = text || "";
  el.className = kind || "";
}
function shortAddr(a) {
  return a.slice(0, 6) + "…" + a.slice(-4);
}

// ------------------------------------------------------------- data reads ----
async function refresh() {
  try {
    const { users, myStreak, myInfo, today, held } = await withProvider(async (p) => {
      const c = contractOn(p);
      const [users, myStreak, myInfo, today] = await Promise.all([
        c.totalUsers(),
        account ? c.getCurrentStreak(account) : Promise.resolve(null),
        account ? c.getUserInfo(account) : Promise.resolve(null),
        c.currentDay(),
      ]);
      const held = account ? await registryOn(p).balanceOf(account) : null;
      return { users, myStreak, myInfo, today, held };
    });
    $("stat-users").textContent = users.toString();
    if (account && myInfo) {
      $("stat-streak").textContent = myStreak.toString();
      $("stat-total").textContent = myInfo.total.toString();
      const btn = $("btn-checkin");
      if (held === 0n) {
        $("agentid-line").textContent = "⚠️ Wallet ini tidak memegang Agent ID — check-in akan ditolak kontrak.";
        btn.disabled = true;
        btn.textContent = "Tidak ada Agent ID";
      } else {
        $("agentid-line").textContent = "✅ Agent ID terdeteksi di wallet ini.";
        if (myInfo.lastCheckInDay === today && myInfo.total > 0n) {
          btn.disabled = true;
          btn.textContent = "✅ Sudah check-in hari ini";
        } else {
          btn.disabled = false;
          btn.textContent = "Check-in hari ini";
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
}

async function loadLeaderboard() {
  const body = $("lb-body");
  try {
    const head = await withProvider((p) => p.getBlockNumber());
    const from = CONFIG.DEPLOY_BLOCK > 0 ? CONFIG.DEPLOY_BLOCK : Math.max(0, head - 100000);
    const events = [];
    const CHUNK = 4000;
    for (let start = from; start <= head; start += CHUNK) {
      const end = Math.min(head, start + CHUNK - 1);
      const part = await withProvider((p) => {
        const c = contractOn(p);
        return c.queryFilter(c.filters.CheckIn(), start, end);
      });
      events.push(...part);
    }
    // Agregasi per user dari event terakhirnya (streak & total ada di event).
    const byUser = new Map();
    for (const ev of events) {
      const u = ev.args.user;
      const prev = byUser.get(u);
      if (!prev || ev.blockNumber > prev.block || (ev.blockNumber === prev.block && ev.logIndex > prev.idx)) {
        byUser.set(u, { user: u, streak: Number(ev.args.streak), total: Number(ev.args.totalCheckIns), block: ev.blockNumber, idx: ev.logIndex });
      }
    }
    const rows = [...byUser.values()]
      .sort((a, b) => b.streak - a.streak || b.total - a.total)
      .slice(0, CONFIG.LEADERBOARD_TOP);
    if (!rows.length) {
      body.innerHTML = '<tr><td colspan="4">Belum ada yang check-in. Jadilah yang pertama!</td></tr>';
    } else {
      body.innerHTML = rows
        .map((r, i) => {
          const me = account && r.user.toLowerCase() === account.toLowerCase() ? ' class="me"' : "";
          return `<tr${me}><td>${i + 1}</td><td class="addr">${shortAddr(r.user)}</td><td>${r.streak}</td><td>${r.total}</td></tr>`;
        })
        .join("");
    }
    $("lb-note").textContent = `${byUser.size} alamat pernah check-in • dari ${events.length} event on-chain`;
  } catch (e) {
    console.error(e);
    body.innerHTML = '<tr><td colspan="4">Leaderboard belum bisa dimuat. Coba lagi nanti.</td></tr>';
  }
}

// ---------------------------------------------------------------- wallet ----
async function ensureBscNetwork(browserProvider) {
  const net = await browserProvider.getNetwork();
  if (Number(net.chainId) === CONFIG.CHAIN_ID) return;
  const hexId = "0x" + CONFIG.CHAIN_ID.toString(16);
  try {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexId }] });
  } catch (e) {
    if (e.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{ chainId: hexId, chainName: CONFIG.CHAIN_NAME, rpcUrls: [CONFIG.CHAIN_RPC], nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 } }],
      });
    } else {
      throw e;
    }
  }
}

async function connect() {
  if (!window.ethereum) {
    setMsg("Wallet tidak ditemukan. Buka halaman ini dari browser wallet (Binance / MetaMask).", "err");
    return;
  }
  try {
    const browserProvider = new ethers.BrowserProvider(window.ethereum);
    await browserProvider.send("eth_requestAccounts", []);
    await ensureBscNetwork(browserProvider);
    const signer = await browserProvider.getSigner();
    account = await signer.getAddress();
    $("wallet-line").textContent = "Terhubung: " + account;
    $("btn-connect").textContent = "Wallet Terhubung";
    $("btn-connect").disabled = true;
    await refresh();
    await loadLeaderboard();
  } catch (e) {
    console.error(e);
    setMsg("Gagal menghubungkan wallet: " + (e.shortMessage || e.message), "err");
  }
}

async function doCheckIn() {
  if (!account) return;
  const btn = $("btn-checkin");
  btn.disabled = true;
  btn.textContent = "Memproses…";
  setMsg("");
  try {
    const browserProvider = new ethers.BrowserProvider(window.ethereum);
    await ensureBscNetwork(browserProvider);
    const signer = await browserProvider.getSigner();
    const writeContract = new ethers.Contract(CONFIG.CONTRACT_ADDRESS, CHECKIN_ABI, signer);
    const tx = await writeContract.checkIn();
    setMsg("Transaksi terkirim, menunggu konfirmasi…");
    await tx.wait();
    setMsg("✅ Check-in berhasil! Streak kamu bertambah. Sampai jumpa besok.", "ok");
    await refresh();
    await loadLeaderboard();
  } catch (e) {
    console.error(e);
    const raw = JSON.stringify(e) + " " + (e.message || "");
    if (raw.includes("AlreadyCheckedInToday")) setMsg("Kamu sudah check-in hari ini. Balik lagi besok (UTC).", "err");
    else if (raw.includes("NotAgentIdHolder")) setMsg("Wallet ini tidak memegang Agent ID, jadi belum bisa check-in.", "err");
    else setMsg("Check-in gagal: " + (e.shortMessage || e.message), "err");
    await refresh();
  }
}

$("btn-connect").addEventListener("click", connect);
$("btn-checkin").addEventListener("click", doCheckIn);
if (window.ethereum) {
  window.ethereum.on?.("accountsChanged", () => location.reload());
  window.ethereum.on?.("chainChanged", () => location.reload());
}

refresh();
loadLeaderboard();
