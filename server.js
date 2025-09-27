// server.js
// ---------------------------------------------
// Bazi API — expressive, non-repetitive replies
// ---------------------------------------------
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const NodeCache = require("node-cache");
const fs = require("fs");
require("dotenv").config();

const app = express();
const cache = new NodeCache({ stdTTL: 600 });

// ---------- middleware ----------
app.use(helmet());
app.use(cors()); // add origin allowlist in production if needed
app.use(express.json({ limit: "1mb" }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/health", (_, res) => res.status(200).send("OK"));

// ---------- helpers ----------
const rmDiacritics = (s) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const uniqLines = (text) => {
  const seen = new Set();
  return (text || "")
    .split("\n")
    .filter((line) => {
      const key = line.trim();
      if (!key) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join("\n");
};

const lastAssistant = (messages) =>
  (messages || []).slice().reverse().find((m) => m.role === "assistant")
    ?.content || "";

const avoidRepeat = (newText, messages) => {
  const prev = lastAssistant(messages);
  if (!prev) return newText;
  const prevSentences = new Set(
    prev
      .split(/(?<=[\.\?\!])\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
  );
  const filtered = newText
    .split(/(?<=[\.\?\!])\s+/)
    .filter((s) => !prevSentences.has(s.trim()))
    .join(" ");
  return filtered.trim() ? filtered : newText; // never return empty
};

// ---------- mappings ----------
const heavenlyStemsMap = {
  en: {
    Jia: "Giáp",
    Yi: "Ất",
    Bing: "Bính",
    Ding: "Đinh",
    Wu: "Mậu",
    Ji: "Kỷ",
    Geng: "Canh",
    Xin: "Tân",
    Ren: "Nhâm",
    Gui: "Quý",
  },
  vi: {
    Giáp: "Giáp",
    Ất: "Ất",
    Bính: "Bính",
    Đinh: "Đinh",
    Mậu: "Mậu",
    Kỷ: "Kỷ",
    Canh: "Canh",
    Tân: "Tân",
    Nhâm: "Nhâm",
    Quý: "Quý",
  },
};
const earthlyBranchesMap = {
  en: {
    Rat: "Tý",
    Ox: "Sửu",
    Tiger: "Dần",
    Rabbit: "Mão",
    Dragon: "Thìn",
    Snake: "Tỵ",
    Horse: "Ngọ",
    Goat: "Mùi",
    Monkey: "Thân",
    Rooster: "Dậu",
    Dog: "Tuất",
    Pig: "Hợi",
  },
  vi: {
    Tý: "Tý",
    Sửu: "Sửu",
    Dần: "Dần",
    Mão: "Mão",
    Thìn: "Thìn",
    Tỵ: "Tỵ",
    Ngọ: "Ngọ",
    Mùi: "Mùi",
    Thân: "Thân",
    Dậu: "Dậu",
    Tuất: "Tuất",
    Hợi: "Hợi",
  },
};

const canNguHanh = {
  Giáp: "Mộc",
  Ất: "Mộc",
  Bính: "Hỏa",
  Đinh: "Hỏa",
  Mậu: "Thổ",
  Kỷ: "Thổ",
  Canh: "Kim",
  Tân: "Kim",
  Nhâm: "Thủy",
  Quý: "Thủy",
};
const chiNguHanh = {
  Tý: "Thủy",
  Hợi: "Thủy",
  Sửu: "Thổ",
  Thìn: "Thổ",
  Mùi: "Thổ",
  Tuất: "Thổ",
  Dần: "Mộc",
  Mão: "Mộc",
  Tỵ: "Hỏa",
  Ngọ: "Hỏa",
  Thân: "Kim",
  Dậu: "Kim",
};

// ---------- language ----------
const guessLanguage = (messages) => {
  const txt = (messages || []).map((m) => m.content || "").join(" ");
  const looksVI = /ngay|thang|nam|gio|giap|at|binh|dinh|mau|ky|canh|tan|nham|quy|ty|suu|dan|mao|thin|ty|ngo|mui|than|dau|tuat|hoi/i.test(
    rmDiacritics(txt)
  );
  return looksVI ? "vi" : "en";
};

// ---------- can-chi normalization & parse ----------
const normalizeCanChi = (input) => {
  if (!input || typeof input !== "string") return null;
  const [rawCan, rawChi] = input.trim().split(/\s+/);
  if (!rawCan || !rawChi) return null;

  // Vietnamese
  const viCan = Object.keys(heavenlyStemsMap.vi);
  const viChi = Object.keys(earthlyBranchesMap.vi);
  const canVi = viCan.find(
    (k) => rmDiacritics(k).toLowerCase() === rmDiacritics(rawCan).toLowerCase()
  );
  const chiVi = viChi.find(
    (k) => rmDiacritics(k).toLowerCase() === rmDiacritics(rawChi).toLowerCase()
  );
  if (canVi && chiVi) return `${canVi} ${chiVi}`;

  // English
  const enCanKey = Object.keys(heavenlyStemsMap.en).find(
    (k) => k.toLowerCase() === rawCan.toLowerCase()
  );
  const enChiKey = Object.keys(earthlyBranchesMap.en).find(
    (k) => k.toLowerCase() === rawChi.toLowerCase()
  );
  if (enCanKey && enChiKey)
    return `${heavenlyStemsMap.en[enCanKey]} ${earthlyBranchesMap.en[enChiKey]}`;

  return null;
};

const parseEnglishTuTru = (input) => {
  try {
    if (!input) return null;
    // e.g. "Jia Zi day, Yi You month, Gui Hai hour, Yi Si year"
    const re = /([A-Za-z]+)\s+([A-Za-z]+)\s*(hour|day|month|year)/gi;
    const out = {};
    for (const m of input.matchAll(re)) {
      const stem = heavenlyStemsMap.en[m[1]] || m[1];
      const branch = earthlyBranchesMap.en[m[2]] || m[2];
      const pair = `${stem} ${branch}`;
      const slot = m[3].toLowerCase();
      if (slot === "hour") out.gio = pair;
      if (slot === "day") out.ngay = pair;
      if (slot === "month") out.thang = pair;
      if (slot === "year") out.nam = pair;
    }
    if (out.gio && out.ngay && out.thang && out.nam) return out;
    return null;
  } catch {
    return null;
  }
};

// ---------- 60-year cycle programmatic ----------
const heavenlyStemsVI = [
  "Giáp",
  "Ất",
  "Bính",
  "Đinh",
  "Mậu",
  "Kỷ",
  "Canh",
  "Tân",
  "Nhâm",
  "Quý",
];
const earthlyBranchesVI = [
  "Tý",
  "Sửu",
  "Dần",
  "Mão",
  "Thìn",
  "Tỵ",
  "Ngọ",
  "Mùi",
  "Thân",
  "Dậu",
  "Tuất",
  "Hợi",
];
const hoaGiap = Array.from(
  { length: 60 },
  (_, i) => `${heavenlyStemsVI[i % 10]} ${earthlyBranchesVI[i % 12]}`
);

const getCanChiForYear = (year) => {
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return null;
  const baseYear = 1984; // Giáp Tý
  let idx = (year - baseYear) % 60;
  if (idx < 0) idx += 60;
  return hoaGiap[idx] || null;
};

// ---------- core analytics ----------
const analyzeNguHanh = (tuTru) => {
  const nguHanhCount = { Mộc: 0, Hỏa: 0, Thổ: 0, Kim: 0, Thủy: 0 };
  const hidden = {
    Tý: ["Quý"],
    Sửu: ["Kỷ", "Tân", "Quý"],
    Dần: ["Giáp", "Bính", "Mậu"],
    Mão: ["Ất"],
    Thìn: ["Mậu", "Ất", "Quý"],
    Tỵ: ["Bính", "Canh", "Mậu"],
    Ngọ: ["Đinh", "Kỷ"],
    Mùi: ["Kỷ", "Đinh", "Ất"],
    Thân: ["Canh", "Nhâm", "Mậu"],
    Dậu: ["Tân"],
    Tuất: ["Mậu", "Đinh", "Tân"],
    Hợi: ["Nhâm", "Giáp"],
  };

  const parts = [
    ...(tuTru.nam || "").split(" "),
    ...(tuTru.thang || "").split(" "),
    ...(tuTru.ngay || "").split(" "),
    ...(tuTru.gio || "").split(" "),
  ].filter(Boolean);

  const branches = [
    tuTru.nam?.split(" ")[1],
    tuTru.thang?.split(" ")[1],
    tuTru.ngay?.split(" ")[1],
    tuTru.gio?.split(" ")[1],
  ].filter(Boolean);

  if (parts.length < 8 || branches.length < 4)
    throw new Error("Tứ Trụ không đầy đủ");

  for (const p of parts) {
    if (canNguHanh[p]) nguHanhCount[canNguHanh[p]] += 1;
    if (chiNguHanh[p]) nguHanhCount[chiNguHanh[p]] += 1;
  }

  for (const chi of branches) {
    (hidden[chi] || []).forEach((h) => {
      const e = canNguHanh[h];
      if (e) nguHanhCount[e] += 0.3;
    });
  }

  const total = Object.values(nguHanhCount).reduce((a, b) => a + b, 0);
  if (!total) throw new Error("Không tìm thấy ngũ hành hợp lệ");
  return nguHanhCount;
};

const tinhThapThan = (nhatChu, tuTru) => {
  if (!nhatChu || !canNguHanh[nhatChu]) throw new Error("Nhật Chủ không hợp lệ");
  const map = {
    Kim: {
      Kim: ["Tỷ Kiên", "Kiếp Tài"],
      Thủy: ["Thực Thần", "Thương Quan"],
      Mộc: ["Chính Tài", "Thiên Tài"],
      Hỏa: ["Chính Quan", "Thất Sát"],
      Thổ: ["Chính Ấn", "Thiên Ấn"],
    },
    Mộc: {
      Mộc: ["Tỷ Kiên", "Kiếp Tài"],
      Hỏa: ["Thực Thần", "Thương Quan"],
      Thổ: ["Chính Tài", "Thiên Tài"],
      Kim: ["Chính Quan", "Thất Sát"],
      Thủy: ["Chính Ấn", "Thiên Ấn"],
    },
    Hỏa: {
      Hỏa: ["Tỷ Kiên", "Kiếp Tài"],
      Thổ: ["Thực Thần", "Thương Quan"],
      Kim: ["Chính Tài", "Thiên Tài"],
      Thủy: ["Chính Quan", "Thất Sát"],
      Mộc: ["Chính Ấn", "Thiên Ấn"],
    },
    Thổ: {
      Thổ: ["Tỷ Kiên", "Kiếp Tài"],
      Kim: ["Thực Thần", "Thương Quan"],
      Thủy: ["Chính Tài", "Thiên Tài"],
      Mộc: ["Chính Quan", "Thất Sát"],
      Hỏa: ["Chính Ấn", "Thiên Ấn"],
    },
    Thủy: {
      Thủy: ["Tỷ Kiên", "Kiếp Tài"],
      Mộc: ["Thực Thần", "Thương Quan"],
      Hỏa: ["Chính Tài", "Thiên Tài"],
      Thổ: ["Chính Quan", "Thất Sát"],
      Kim: ["Chính Ấn", "Thiên Ấn"],
    },
  };
  const isYang = ["Giáp", "Bính", "Mậu", "Canh", "Nhâm"].includes(nhatChu);
  const out = {};

  const cans = [
    tuTru.gio?.split(" ")[0],
    tuTru.thang?.split(" ")[0],
    tuTru.nam?.split(" ")[0],
  ].filter(Boolean);
  const chis = [
    tuTru.gio?.split(" ")[1],
    tuTru.ngay?.split(" ")[1],
    tuTru.thang?.split(" ")[1],
    tuTru.nam?.split(" ")[1],
  ].filter(Boolean);

  if (cans.length < 3 || chis.length < 4) throw new Error("Tứ Trụ không đầy đủ");

  for (const can of cans) {
    if (can === nhatChu) continue;
    const e = canNguHanh[can];
    if (!e) continue;
    const sameYang = ["Giáp", "Bính", "Mậu", "Canh", "Nhâm"].includes(can);
    const idx = isYang === sameYang ? 0 : 1;
    out[can] = map[canNguHanh[nhatChu]][e][idx];
  }
  for (const chi of chis) {
    const e = chiNguHanh[chi];
    if (!e) continue;
    const chiYang = ["Tý", "Dần", "Thìn", "Ngọ", "Thân", "Tuất"].includes(chi);
    const idx = isYang === chiYang ? 0 : 1;
    out[chi] = map[canNguHanh[nhatChu]][e][idx];
  }
  return out;
};

const tinhThanSat = (tuTru) => {
  const nhatChu = tuTru.ngay?.split(" ")[0];
  const ngayChi = tuTru.ngay?.split(" ")[1];
  const branches = [
    tuTru.nam?.split(" ")[1],
    tuTru.thang?.split(" ")[1],
    tuTru.ngay?.split(" ")[1],
    tuTru.gio?.split(" ")[1],
  ].filter(Boolean);
  if (!nhatChu || !ngayChi || !branches.length)
    throw new Error("Invalid nhatChu or branches");

  const thienAtQuyNhan = {
    Giáp: ["Sửu", "Mùi"],
    Mậu: ["Sửu", "Mùi"],
    Canh: ["Sửu", "Mùi"],
    Ất: ["Thân", "Tý"],
    Kỷ: ["Thân", "Tý"],
    Bính: ["Dậu", "Hợi"],
    Đinh: ["Dậu", "Hợi"],
    Tân: ["Dần", "Ngọ"],
    Nhâm: ["Tỵ", "Mão"],
    Quý: ["Tỵ", "Mão"],
  };
  const tuongTinh = {
    Thân: "Tý",
    Tý: "Tý",
    Thìn: "Tý",
    Tỵ: "Dậu",
    Dậu: "Dậu",
    Sửu: "Dậu",
    Dần: "Ngọ",
    Ngọ: "Ngọ",
    Tuất: "Ngọ",
    Hợi: "Mão",
    Mão: "Mão",
    Mùi: "Mão",
  };
  const vanXuong = {
    Giáp: ["Tỵ"],
    Ất: ["Ngọ"],
    Bính: ["Thân"],
    Đinh: ["Dậu"],
    Mậu: ["Thân"],
    Kỷ: ["Dậu"],
    Canh: ["Hợi"],
    Tân: ["Tý"],
    Nhâm: ["Dần"],
    Quý: ["Mão"],
  };
  const daoHoa = {
    Thân: "Dậu",
    Tý: "Dậu",
    Thìn: "Dậu",
    Tỵ: "Ngọ",
    Dậu: "Ngọ",
    Sửu: "Ngọ",
    Dần: "Mão",
    Ngọ: "Mão",
    Tuất: "Mão",
    Hợi: "Tý",
    Mão: "Tý",
    Mùi: "Tý",
  };
  const dichMa = {
    Thân: "Dần",
    Tý: "Dần",
    Thìn: "Dần",
    Tỵ: "Hợi",
    Dậu: "Hợi",
    Sửu: "Hợi",
    Dần: "Thân",
    Ngọ: "Thân",
    Tuất: "Thân",
    Hợi: "Tỵ",
    Mão: "Tỵ",
    Mùi: "Tỵ",
  };
  const coThanQuaTu = {
    Tý: ["Dần", "Tuất"],
    Sửu: ["Dần", "Tuất"],
    Hợi: ["Dần", "Tuất"],
    Dần: ["Tỵ", "Sửu"],
    Mão: ["Tỵ", "Sửu"],
    Thìn: ["Tỵ", "Sửu"],
    Tỵ: ["Thân", "Thìn"],
    Ngọ: ["Thân", "Thìn"],
    Mùi: ["Thân", "Thìn"],
    Thân: ["Hợi", "Mùi"],
    Dậu: ["Hợi", "Mùi"],
    Tuất: ["Hợi", "Mùi"],
  };
  const kiepSat = {
    Thân: "Tỵ",
    Tý: "Tỵ",
    Thìn: "Tỵ",
    Tỵ: "Dần",
    Dậu: "Dần",
    Sửu: "Dần",
    Dần: "Hợi",
    Ngọ: "Hợi",
    Tuất: "Hợi",
    Hợi: "Thân",
    Mão: "Thân",
    Mùi: "Thân",
  };

  return {
    "Thiên Ất Quý Nhân": {
      vi: "Thiên Ất Quý Nhân",
      en: "Nobleman Star",
      value: thienAtQuyNhan[nhatChu]?.filter((c) => branches.includes(c)) || [],
    },
    "Tướng Tinh": {
      vi: "Tướng Tinh",
      en: "General Star",
      value: branches.includes(tuongTinh[ngayChi]) ? [tuongTinh[ngayChi]] : [],
    },
    "Văn Xương": {
      vi: "Văn Xương",
      en: "Literary Star",
      value: vanXuong[nhatChu]?.filter((c) => branches.includes(c)) || [],
    },
    "Đào Hoa": {
      vi: "Đào Hoa",
      en: "Peach Blossom",
      value: branches.includes(daoHoa[ngayChi]) ? [daoHoa[ngayChi]] : [],
    },
    "Dịch Mã": {
      vi: "Dịch Mã",
      en: "Traveling Horse",
      value: branches.includes(dichMa[ngayChi]) ? [dichMa[ngayChi]] : [],
    },
    "Cô Thần Quả Tú": {
      vi: "Cô Thần Quả Tú",
      en: "Solitude",
      value: coThanQuaTu[ngayChi]?.filter((c) => branches.includes(c)) || [],
    },
    "Kiếp Sát": {
      vi: "Kiếp Sát",
      en: "Robbery Sha",
      value: branches.includes(kiepSat[ngayChi]) ? [kiepSat[ngayChi]] : [],
    },
  };
};

// ---------- topic detection ----------
const isHeartfeltOverview = (text) => {
  const t = rmDiacritics((text || "").toLowerCase());
  return /(?:hay|hãy)?\s*xem\s*bat\s*tu(?:\s*cho\s*minh)?(?:\s*nhe|\s*nha)?\b/.test(t);
};

const detectTopic = (userText) => {
  const t = rmDiacritics((userText || "").toLowerCase());

  if (isHeartfeltOverview(userText)) return "HEARTFELT";

  const money =
    /tai van|tai loc|tien bac|thu nhap|giau|tien do|luong|tai chinh|money|wealth|income|invest|dau tu|co nen dau tu|chung khoan|crypto|vang|bat dong san|property/.test(
      t
    );
  if (money) return "MONEY";

  const career =
    /su nghiep|nghe nghiep|cong viec|viec lam|thang tien|promotion|business|khoi nghiep|startup|doi nghe|chuyen mon|career|job/.test(
      t
    );
  if (career) return "CAREER";

  const love =
    /tinh cam|tinh duyen|hon nhan|vo chong|nguoi yeu|kethon|crush|relationship|love|marriage/.test(
      t
    );
  if (love) return "LOVE";

  const health =
    /suc khoe|benh|om|benh tat|sk|stress|an ngu|tam ly|suc khoe tinh than|health|anxiety/.test(
      t
    );
  if (health) return "HEALTH";

  const family =
    /gia dao|gia dinh|cha me|bo me|anh chi|noi bo|quan he gia dinh|family|parents|household/.test(
      t
    );
  if (family) return "FAMILY";

  const children =
    /con cai|con cai toi|children|child|nuoi day|hoc tap cua con|giao duc con|con trai|con gai/.test(
      t
    );
  if (children) return "CHILDREN";

  const property =
    /bat dong san|mua nha|ban dat|tai san co dinh|property|real estate|dat dai|nha cua/.test(
      t
    );
  if (property) return "PROPERTY";

  const color =
    /mau nao|mau sac|mac ao mau gi|color|menh hop mau/.test(t);
  if (color) return "COLOR";

  const luck =
    /may man|gio tot|thang nao|thoi diem nao|thoi diem may man|when lucky|best timing/.test(
      t
    );
  if (luck) return "LUCK";

  return "GENERAL";
};

// ---------- copy diction ----------
const personality = {
  Mộc: "linh hoạt, sáng tạo",
  Hỏa: "nhiệt huyết, chủ động",
  Thổ: "vững chãi, thực tế",
  Kim: "kỷ luật, quyết đoán",
  Thủy: "nhạy bén, uyển chuyển",
};

const elementMeta = {
  Mộc: { color: "xanh lá", jobs: "giáo dục, thiết kế, nội dung" },
  Hỏa: { color: "đỏ/cam", jobs: "truyền thông, trình diễn, năng lượng" },
  Thổ: { color: "vàng/đất", jobs: "quản trị, vận hành, bất động sản" },
  Kim: { color: "trắng/ánh kim", jobs: "tài chính, kỹ thuật, pháp chế" },
  Thủy: { color: "xanh dương/đen", jobs: "CNTT/dữ liệu, nghiên cứu" },
};

const toPct = (v, total) => `${((v / total) * 100).toFixed(2)}%`;

// ---------- text generators ----------
const genHeartfeltOverview = (tuTru, nguHanh, thapThan, thanSat, dungThan) => {
  const nhatChu = tuTru.ngay.split(" ")[0];
  const dmHanh = canNguHanh[nhatChu];
  const total = Object.values(nguHanh).reduce((a, b) => a + b, 0);
  const ratioStr = ["Mộc", "Hỏa", "Thổ", "Kim", "Thủy"]
    .map((k) => `${k} ${toPct(nguHanh[k] || 0, total)}`)
    .join(", ");

  const sorted = Object.entries(nguHanh).sort((a, b) => b[1] - a[1]);
  const dominant = sorted[0][0];
  const weak = sorted[sorted.length - 1][0];

  const meta = elementMeta[(dungThan && dungThan[0]) || dominant];

  const activeStars = Object.values(thanSat)
    .filter((v) => v.value && v.value.length)
    .map((v) => `${v.vi}: ${v.value.join(", ")}`);

  return uniqLines(
    [
      `Xin chào bạn, mình đã xem Bát Tự: **Giờ ${tuTru.gio} – Ngày ${tuTru.ngay} – Tháng ${tuTru.thang} – Năm ${tuTru.nam}**.`,
      `Nhật Chủ **${nhatChu} (${dmHanh})** — khí chất ${personality[dmHanh]}.`,
      `Cán cân Ngũ Hành: ${ratioStr}.`,
      `Bức tranh tổng thể: **${dominant}** đang trội, **${weak}** hơi yếu → nên bồi bổ **${(dungThan && dungThan[0]) || dominant}** để cân bằng.`,
      `Gợi ý nghề hợp: ${meta.jobs}.`,
      activeStars.length
        ? `Thần Sát đang sáng: ${activeStars.join(" | ")}.`
        : "Thần Sát: không có gì quá gay gắt — dễ khai mở bằng thái độ chân thành.",
      `Nếu bạn muốn, chúng ta có thể đi sâu về: tài vận, sự nghiệp, tình cảm/hôn nhân, sức khỏe, gia đạo, con cái, tài sản hoặc thời điểm may mắn.`,
    ].join("\n")
  );
};

const genGeneral = (tuTru, nguHanh, thapThan, thanSat, dungThan) => {
  const nhatChu = tuTru.ngay.split(" ")[0];
  const dmHanh = canNguHanh[nhatChu];
  const total = Object.values(nguHanh).reduce((a, b) => a + b, 0);
  const ratioStr = ["Mộc", "Hỏa", "Thổ", "Kim", "Thủy"]
    .map((k) => `${k} ${toPct(nguHanh[k] || 0, total)}`)
    .join(", ");
  const meta = elementMeta[(dungThan && dungThan[0]) || dmHanh];

  return uniqLines(
    [
      `Tóm tắt: Nhật Chủ **${nhatChu} (${dmHanh})**.`,
      `Ngũ Hành: ${ratioStr}.`,
      `Định hướng nhanh: bồi dưỡng **${(dungThan && dungThan[0]) || dmHanh}**; nghề hợp: ${meta.jobs}.`,
    ].join("\n")
  );
};

const genMoney = (nguHanh, thapThan, thanSat, dungThan) => {
  // prioritize: Chính Tài/Thiên Tài + Kim/Thổ/Thủy thế mạnh
  const godList = Object.values(thapThan || {});
  const hasChinhTai = godList.includes("Chính Tài");
  const hasThienTai = godList.includes("Thiên Tài");
  const hint = hasChinhTai
    ? "Quản lý tốt thu – chi, kiên định mục tiêu dài hạn."
    : hasThienTai
    ? "Nhanh nhạy cơ hội, hợp dự án, hoa hồng, sản phẩm số."
    : "Tập trung nguồn thu ổn định trước, hãy tăng kỹ năng lõi.";

  const total = Object.values(nguHanh).reduce((a, b) => a + b, 0);
  const weights = Object.fromEntries(
    Object.entries(nguHanh).map(([k, v]) => [k, +((v / total) * 100).toFixed(2)])
  );

  const strongs = Object.entries(weights)
    .filter(([, p]) => p >= 25)
    .map(([k]) => k);
  const balances =
    strongs.includes("Kim") || strongs.includes("Thổ")
      ? "tài sản cố định/tài chính kỷ luật"
      : strongs.includes("Thủy")
      ? "Công nghệ – dữ liệu – nghiên cứu"
      : "dịch vụ sáng tạo/giáo dục";

  return [
    "Kết luận tài vận:",
    `• Xu hướng: ${hint}`,
    `• Thế mạnh hiện tại phù hợp với: ${balances}.`,
    "• Kinh nghiệm thực hành: 60–20–20 (nền tảng–mở rộng–dự phòng), theo dõi dòng tiền hàng tuần.",
  ].join("\n");
};

const genCareer = (nguHanh, thapThan, dungThan) => {
  const total = Object.values(nguHanh).reduce((a, b) => a + b, 0);
  const major = Object.entries(nguHanh).sort((a, b) => b[1] - a[1])[0][0];
  const field =
    major === "Hỏa"
      ? "truyền thông, trình diễn, năng lượng"
      : major === "Thổ"
      ? "quản trị – vận hành – bất động sản"
      : major === "Kim"
      ? "tài chính – kỹ thuật – pháp chế"
      : major === "Thủy"
      ? "CNTT – dữ liệu – nghiên cứu"
      : "giáo dục – thiết kế – nội dung";
  const hasQuan = Object.values(thapThan).includes("Chính Quan");
  const hasAn = Object.values(thapThan).includes("Chính Ấn");

  return [
    "Định hướng sự nghiệp:",
    `• Trục mạnh hiện tại: ${field}.`,
    `• Lợi thế: ${
      hasQuan ? "kỷ luật, thăng tiến theo khung chức danh" : "linh hoạt định hình vai trò"
    }; ${hasAn ? "nền tảng học thuật tốt" : "ưu tiên học kỹ năng thực chiến"}.`,
    "• Nên đặt OKRs theo quý, đo bằng kết quả hữu hình/thước đo cụ thể.",
  ].join("\n");
};

const genLove = (thanSat) => {
  const hasDaoHoa = (thanSat["Đào Hoa"]?.value || []).length > 0;
  const hasNoble = (thanSat["Thiên Ất Quý Nhân"]?.value || []).length > 0;
  return [
    "Tình cảm/hôn nhân:",
    hasDaoHoa
      ? "• Đào Hoa sáng: dễ gặp người hợp gu khi mở lòng."
      : "• Đào Hoa chưa mạnh: chủ động mở rộng vòng kết nối.",
    hasNoble ? "• Có Quý Nhân trợ duyên — duyên lành đến từ mối quen uy tín." : "• Xây dựng niềm tin qua lịch hẹn đều đặn, giao tiếp thẳng thắn.",
  ].join("\n");
};

const genHealth = (nguHanh) => {
  const total = Object.values(nguHanh).reduce((a, b) => a + b, 0);
  const pct = (k) => +((nguHanh[k] / total) * 100).toFixed(2);
  const tip =
    pct("Hỏa") < 10
      ? "• Hỏa yếu → ưu tiên vận động nhịp tim vừa: đi bộ nhanh/đạp xe 15–20’."
      : pct("Thủy") < 15
      ? "• Thủy hơi thấp → ngủ đủ, tránh căng thẳng kéo dài."
      : "• Duy trì giờ giấc ổn định, ăn chậm – nhai kỹ.";
  return ["Sức khỏe:", tip, "• Theo dõi cơ thể 2–3 tuần để tìm nhịp sinh hoạt hợp mình."].join(
    "\n"
  );
};

const genFamily = () => [
  "Gia đạo:",
  "• Giữ nhịp trò chuyện ngắn mỗi ngày, thống nhất quy ước giải quyết xung đột.",
  "• Khi có bất đồng, cùng nhìn lại mục tiêu chung thay vì đúng/sai.",
].join("\n");

const genChildren = () => [
  "Con cái:",
  "• Khuyến khích học qua dự án nhỏ; khen tiến bộ, không chỉ kết quả.",
  "• Tạo nếp đọc 15’/ngày, rèn tính tự lập qua việc nhà đơn giản.",
].join("\n");

const genProperty = () => [
  "Bất động sản/tài sản cố định:",
  "• Ưu tiên tài sản tạo dòng tiền hoặc đáp ứng nhu cầu thật.",
  "• Không để đòn bẩy vượt ngưỡng an toàn; theo dõi lãi suất và pháp lý.",
].join("\n");

const genColor = (dungThan, nguHanh) => {
  const total = Object.values(nguHanh).reduce((a, b) => a + b, 0);
  const strong = Object.entries(nguHanh).sort((a, b) => b[1] - a[1])[0][0];
  const chosen = (dungThan && dungThan[0]) || strong;
  const color = elementMeta[chosen].color;
  return `Màu nên ưu tiên: **${color}** (bồi dưỡng hành **${chosen}**).`;
};

const genLuck = (tuTru) => {
  // gợi khung tháng theo tam hợp/địa chi của ngày
  const chiNgay = tuTru.ngay.split(" ")[1];
  const map = {
    Tý: "Dậu/Tỵ (đồng khí Kim–Thủy dễ thông suốt)",
    Sửu: "Dậu/Tỵ",
    Dần: "Mão/Ngọ",
    Mão: "Dần/Mùi",
    Thìn: "Tý/Thân",
    Tỵ: "Thân/Dậu",
    Ngọ: "Dần/Mùi",
    Mùi: "Mão/Ngọ",
    Thân: "Tý/Thìn",
    Dậu: "Tỵ/Thân",
    Tuất: "Ngọ/Dần",
    Hợi: "Mão/Tý",
  };
  const hint = map[chiNgay] || "các tháng đồng hành thuận khí với ngày sinh";
  return [
    "Về thời điểm thuận lợi:",
    `• Ưu tiên các giai đoạn mang khí tương sinh/tương hợp với ngày **${chiNgay}** — ví dụ: **${hint}**.`,
    "• Trước mốc quan trọng, hãy chuẩn bị: mục tiêu rõ, 2 phương án dự phòng, và người hỗ trợ then chốt.",
  ].join("\n");
};

// ---------- optional OpenAI polish (off by default) ----------
const callOpenAI = async (text) => {
  if (!process.env.OPENAI_API_KEY) throw new Error("Missing OpenAI key");
  const payload = {
    model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content:
          "Hãy viết lại đoạn sau bằng giọng ấm áp, ngắn gọn, không thêm thông tin mới. Giữ nguyên thuật ngữ Bát Tự:\n\n" +
          text,
      },
    ],
    temperature: 0.5,
    max_tokens: Math.min(1200, Number(process.env.OPENAI_MAX_TOKENS || 1200)),
  };
  const res = await axios.post("https://api.openai.com/v1/chat/completions", payload, {
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    timeout: 30000,
  });
  return res.data?.choices?.[0]?.message?.content?.trim() || text;
};

// ---------- main route ----------
app.post("/api/luan-giai-bazi", async (req, res) => {
  const { messages, tuTruInfo, dungThan } = req.body || {};
  const lang = guessLanguage(messages);
  const useOpenAI = process.env.USE_OPENAI === "true"; // default off

  if (!Array.isArray(messages) || !messages.length) {
    return res
      .status(400)
      .json({ error: lang === "vi" ? "Thiếu messages" : "Missing messages" });
  }
  if (!tuTruInfo || typeof tuTruInfo !== "string") {
    return res
      .status(400)
      .json({ error: lang === "vi" ? "Thiếu tuTruInfo" : "Missing tuTruInfo" });
  }

  // cache key
  const userInput =
    messages.slice().reverse().find((m) => m.role === "user")?.content || "";
  const cacheKey = `${tuTruInfo}::${userInput}`;
  const hit = cache.get(cacheKey);
  if (hit) return res.json({ answer: hit });

  // parse tứ trụ
  let tuTru;
  try {
    const raw = JSON.parse(tuTruInfo);
    tuTru = {
      gio: normalizeCanChi(raw.gio),
      ngay: normalizeCanChi(raw.ngay),
      thang: normalizeCanChi(raw.thang),
      nam: normalizeCanChi(raw.nam),
    };
    if (!tuTru.gio || !tuTru.ngay || !tuTru.thang || !tuTru.nam)
      throw new Error("invalid");
  } catch {
    const parsed = parseEnglishTuTru(userInput);
    if (!parsed?.gio || !parsed?.ngay || !parsed?.thang || !parsed?.nam) {
      return res.status(400).json({
        error: lang === "vi" ? "Tứ Trụ không hợp lệ" : "Invalid Four Pillars",
      });
    }
    tuTru = parsed;
  }

  // analytics
  let nguHanh, thapThan, thanSat;
  try {
    nguHanh = analyzeNguHanh(tuTru);
    thapThan = tinhThapThan(tuTru.ngay.split(" ")[0], tuTru);
    thanSat = tinhThanSat(tuTru);
  } catch (e) {
    return res
      .status(400)
      .json({ error: lang === "vi" ? "Dữ liệu không hợp lệ" : "Invalid data" });
  }

  const dungs = Array.isArray(dungThan)
    ? dungThan
    : dungThan?.hanh && Array.isArray(dungThan.hanh)
    ? dungThan.hanh
    : [];

  // route by topic
  const topic = detectTopic(userInput);
  let text;

  if (topic === "HEARTFELT") {
    text = genHeartfeltOverview(tuTru, nguHanh, thapThan, thanSat, dungs);
  } else if (topic === "MONEY") {
    text = genMoney(nguHanh, thapThan, thanSat, dungs);
  } else if (topic === "CAREER") {
    text = genCareer(nguHanh, thapThan, dungs);
  } else if (topic === "LOVE") {
    text = genLove(thanSat);
  } else if (topic === "HEALTH") {
    text = genHealth(nguHanh);
  } else if (topic === "FAMILY") {
    text = genFamily();
  } else if (topic === "CHILDREN") {
    text = genChildren();
  } else if (topic === "PROPERTY") {
    text = genProperty();
  } else if (topic === "COLOR") {
    text = genColor(dungs, nguHanh);
  } else if (topic === "LUCK") {
    text = genLuck(tuTru);
  } else {
    text = genGeneral(tuTru, nguHanh, thapThan, thanSat, dungs);
  }

  // avoid repeating previous assistant text
  text = avoidRepeat(text, messages);

  // optional polish via OpenAI
  if (useOpenAI) {
    try {
      const polished = await callOpenAI(text);
      text = polished || text;
    } catch (e) {
      // fallback silently
    }
  }

  cache.set(cacheKey, text);
  return res.json({ answer: text });
});

// ---------- error handler ----------
app.use((err, req, res, next) => {
  try {
    fs.appendFileSync(
      "error.log",
      `${new Date().toISOString()} - ${err.stack || err.message}\n`
    );
  } catch {}
  console.error("System error:", err);
  res.status(500).json({ error: "System error occurred" });
});

// ---------- start ----------
const port = process.env.PORT || 10000;
const server = app.listen(port, () => {
  console.log(`Bazi server running on port ${port}`);
});
server.setTimeout(300000);
