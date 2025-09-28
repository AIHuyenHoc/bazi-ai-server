// server.js — Bát Tự AI (warm, non-repetitive, with GPT fallback)
// ---------------------------------------------------------------

/* Core deps */
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const NodeCache = require("node-cache");
const fs = require("fs");
require("dotenv").config();

/* App setup */
const app = express();
const cache = new NodeCache({ stdTTL: 600 }); // 10 phút

app.use(helmet());
app.use(cors()); // TIP: Consider allowlist for production.
app.use(express.json({ limit: "1mb" }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/health", (req, res) => res.status(200).send("OK"));

/* ==========================
   Utilities & Base Mappings
   ========================== */

const rm = (s = "") => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
const pct = (n) => `${(+n).toFixed(2)}%`;
const pick = (...arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

const guessLanguage = (messages = []) => {
  const txt = rm(messages.map((m) => m.content || "").join(" "));
  const looksVI = /(ngay|thang|nam|gio|giap|at|binh|dinh|mau|ky|canh|tan|nham|quy|ty|suu|dan|mao|thin|ty|ngo|mui|than|dau|tuat|hoi|ban|minh|cho|toi)/i.test(
    txt
  );
  return looksVI ? "vi" : "en";
};

/* Can-Chi maps */
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

/* Normalize "Giáp Tý" or "Jia Zi" */
const normalizeCanChi = (input) => {
  if (!input || typeof input !== "string") return null;
  const [rawCan, rawChi] = input.trim().split(/\s+/);
  if (!rawCan || !rawChi) return null;

  // Try Vietnamese first (accent-insensitive)
  const viCan = Object.keys(heavenlyStemsMap.vi);
  const viChi = Object.keys(earthlyBranchesMap.vi);
  const canVi = viCan.find((k) => rm(k).toLowerCase() === rm(rawCan).toLowerCase());
  const chiVi = viChi.find((k) => rm(k).toLowerCase() === rm(rawChi).toLowerCase());
  if (canVi && chiVi) return `${canVi} ${chiVi}`;

  // Try English
  const enCanKey = Object.keys(heavenlyStemsMap.en).find(
    (k) => rm(k).toLowerCase() === rm(rawCan).toLowerCase()
  );
  const enChiKey = Object.keys(earthlyBranchesMap.en).find(
    (k) => rm(k).toLowerCase() === rm(rawChi).toLowerCase()
  );
  if (enCanKey && enChiKey) {
    return `${heavenlyStemsMap.en[enCanKey]} ${earthlyBranchesMap.en[enChiKey]}`;
  }
  return null;
};

const parseEnglishTuTru = (input) => {
  try {
    if (!input) return null;
    // e.g. "Jia Zi hour, Yi You day, Gui Hai month, Yi Si year"
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

/* Ngũ hành analysis (with hidden stems) */
const analyzeNguHanh = (tuTru) => {
  const count = { Mộc: 0, Hỏa: 0, Thổ: 0, Kim: 0, Thủy: 0 };
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

  const elems = [
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

  if (elems.length < 8 || branches.length < 4) throw new Error("Tứ Trụ không đầy đủ");

  for (const e of elems) {
    if (canNguHanh[e]) count[canNguHanh[e]] += 1;
    if (chiNguHanh[e]) count[chiNguHanh[e]] += 1;
  }
  for (const c of branches) {
    (hidden[c] || []).forEach((h) => {
      if (canNguHanh[h]) count[canNguHanh[h]] += 0.3;
    });
  }
  const total = Object.values(count).reduce((a, b) => a + b, 0);
  if (!total) throw new Error("Không tìm thấy ngũ hành hợp lệ");
  return count;
};

/* Ten Gods (Thập Thần) compact */
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
  const yang = ["Giáp", "Bính", "Mậu", "Canh", "Nhâm"];
  const isYang = yang.includes(nhatChu);

  const out = {};
  const els = [tuTru.gio?.split(" ")[0], tuTru.thang?.split(" ")[0], tuTru.nam?.split(" ")[0]].filter(Boolean);
  const chis = [
    tuTru.gio?.split(" ")[1],
    tuTru.ngay?.split(" ")[1],
    tuTru.thang?.split(" ")[1],
    tuTru.nam?.split(" ")[1],
  ].filter(Boolean);

  if (els.length < 3 || chis.length < 4) throw new Error("Tứ Trụ không đầy đủ");

  for (const c of els) {
    if (c === nhatChu) continue;
    const h = canNguHanh[c];
    if (!h) continue;
    const sameYang = yang.includes(c);
    const idx = isYang === sameYang ? 0 : 1;
    out[c] = map[canNguHanh[nhatChu]][h][idx];
  }
  for (const b of chis) {
    const h = chiNguHanh[b];
    if (!h) continue;
    const chiYang = ["Tý", "Dần", "Thìn", "Ngọ", "Thân", "Tuất"].includes(b);
    const idx = isYang === chiYang ? 0 : 1;
    out[b] = map[canNguHanh[nhatChu]][h][idx];
  }
  return out;
};

/* Simple thần sát (subset used) */
const tinhThanSat = (tuTru) => {
  const nhatChu = tuTru.ngay?.split(" ")[0];
  const ngayChi = tuTru.ngay?.split(" ")[1];
  const branches = [
    tuTru.nam?.split(" ")[1],
    tuTru.thang?.split(" ")[1],
    tuTru.ngay?.split(" ")[1],
    tuTru.gio?.split(" ")[1],
  ].filter(Boolean);
  if (!nhatChu || !ngayChi || !branches.length) throw new Error("Dữ liệu ngày không hợp lệ");

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

  return {
    "Thiên Ất Quý Nhân": {
      vi: "Thiên Ất Quý Nhân",
      en: "Nobleman",
      value: (thienAtQuyNhan[nhatChu] || []).filter((c) => branches.includes(c)),
    },
    "Văn Xương": {
      vi: "Văn Xương",
      en: "Literary",
      value: (vanXuong[nhatChu] || []).filter((c) => branches.includes(c)),
    },
    "Đào Hoa": {
      vi: "Đào Hoa",
      en: "Peach Blossom",
      value: daoHoa[ngayChi] && branches.includes(daoHoa[ngayChi]) ? [daoHoa[ngayChi]] : [],
    },
  };
};

/* Personality & element meta */
const personality = {
  Mộc: { vi: "sáng tạo, linh hoạt", en: "creative and flexible" },
  Hỏa: { vi: "nhiệt huyết, chủ động", en: "passionate and proactive" },
  Thổ: { vi: "vững chãi, thực tế", en: "grounded and practical" },
  Kim: { vi: "kỷ luật, chính trực", en: "disciplined and upright" },
  Thủy: { vi: "nhạy bén, sâu sắc", en: "perceptive and deep" },
};
const elementMeta = {
  Mộc: { color: "xanh lá", jobs: "giáo dục, thiết kế, nội dung", times: "05:00–07:00" },
  Hỏa: { color: "đỏ/cam", jobs: "truyền thông, trình diễn, năng lượng", times: "11:00–13:00" },
  Thổ: { color: "vàng/đất", jobs: "quản trị, vận hành, BĐS", times: "07:00–09:00" },
  Kim: { color: "trắng/ánh kim", jobs: "tài chính, kỹ thuật, pháp chế", times: "15:00–17:00" },
  Thủy: { color: "xanh dương/đen", jobs: "CNTT-dữ liệu, logistics, nghiên cứu", times: "21:00–23:00" },
};

/* Lục hợp / Tam hợp / Xung */
const lucHop = { Tý: "Sửu", Sửu: "Tý", Dần: "Hợi", Hợi: "Dần", Mão: "Tuất", Tuất: "Mão", Thìn: "Dậu", Dậu: "Thìn", Tỵ: "Thân", Thân: "Tỵ", Ngọ: "Mùi", Mùi: "Ngọ" };
const xung = { Tý: "Ngọ", Sửu: "Mùi", Dần: "Thân", Mão: "Dậu", Thìn: "Tuất", Tỵ: "Hợi", Ngọ: "Tý", Mùi: "Sửu", Thân: "Dần", Dậu: "Mão", Tuất: "Thìn", Hợi: "Tỵ" };
const tamHopGroups = [
  ["Thân", "Tý", "Thìn"],
  ["Hợi", "Mão", "Mùi"],
  ["Dần", "Ngọ", "Tuất"],
  ["Tỵ", "Dậu", "Sửu"],
];

/* Intent detection (broad) */
const intents = [
  { key: "overview", re: /(hay xem bat tu|xem bat tu|xem tu tru|luan giai bat tu)/i },
  { key: "health", re: /(suc khoe|benh|om|sleep|ngu|stress|dinh duong|an uong|thiền|yoga|tap)/i },
  { key: "love", re: /(tinh cam|tinh duyen|hon nhan|nguoi yeu|romance|ket hon|crush)/i },
  { key: "money", re: /(tien|tai chinh|tai loc|thu nhap|giau|tiet kiem|chi tieu|ngan sach|dau tu|stock|coin|crypto|chung khoan)/i },
  { key: "career", re: /(su nghiep|cong viec|nghe nghiep|thang tien|chuyen viec|boss|luong|ky nang)/i },
  { key: "family", re: /(gia dao|gia dinh|bo me|cha me|vo chong|anh em)/i },
  { key: "children", re: /(con cai|con trai|con gai|tre em|nuoi day|sinh con)/i },
  { key: "property", re: /(tai san|bat dong san|mua nha|dat dai)/i },
  { key: "study", re: /(hoc|thi|diem|on thi|du hoc|bang cap|study|exam)/i },
  { key: "travel", re: /(du lich|xuat hanh|di xa|cong tac|di chuyen|travel)/i },
  { key: "fitness", re: /(the thao|tap gym|chay bo|yoga|boi|fitness)/i },
  { key: "food", re: /(am thuc|an gi|mon an|che do an|keto|low carb|vegan|diet)/i },
  { key: "style", re: /(mau sac|mau|mac ao|trang phuc|thoi trang|kieu toc|phong cach|color)/i },
  { key: "friends", re: /(ban be|dong nghiep|network|ket noi|xung dot|mau thuan|conflict)/i },
  { key: "timing", re: /(may man|gio tot|ngay tot|thoi diem|fortune|lucky)/i },
  // A/B choices detection at runtime
];

/* Angle rotation memory (avoid repetition) */
const nextAngle = (fingerprint, intent, pool) => {
  const key = `angle:${fingerprint}:${intent}`;
  const idx = cache.get(key) || 0;
  const next = (idx + 1) % pool.length;
  cache.set(key, next);
  return idx; // return current index to use now
};

/* ==============
   OpenAI helpers
   ============== */

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const hasOpenAI = () => Boolean(process.env.OPENAI_API_KEY);

const callOpenAI = async (payload, retries = 2, delay = 1200) => {
  if (!hasOpenAI()) throw new Error("Missing OpenAI API key");
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { data } = await axios.post(OPENAI_URL, payload, {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      });
      return data;
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error?.message || err.message;
      if (status === 401) throw new Error("Invalid OpenAI API key");
      if (attempt === retries || status === 429) throw new Error(msg);
      await new Promise((r) => setTimeout(r, delay * attempt));
    }
  }
};

/* ==============================
   Domain writers (non-repetitive)
   ============================== */

const cheerfulOpenersVI = [
  (name, nhatChu, hanh) =>
    `Xin chào bạn, mình đã xem Bát Tự: ${name}. Nhật Chủ ${nhatChu} (${hanh}) tạo nên khí chất rất riêng — ${personality[hanh].vi}.`,
  (name, nhatChu, hanh) =>
    `Chào bạn, Bát Tự của bạn hiện lên khá rõ: ${name}. Nhật Chủ ${nhatChu} thuộc hành ${hanh}, mang nét ${personality[hanh].vi}.`,
  (name, nhatChu, hanh) =>
    `Mình vừa trải tứ trụ của bạn: ${name}. Nhật Chủ ${nhatChu} – hành ${hanh} – cho cảm giác cân bằng và chân thật.`,
];

const overviewVI = (tuTru, nguHanh, thapThan, thanSat, dungThan) => {
  const nhatChu = tuTru.ngay.split(" ")[0];
  const hanh = canNguHanh[nhatChu];
  const total = Object.values(nguHanh).reduce((a, b) => a + b, 0) || 1;
  const pr = (k) => pct((nguHanh[k] / total) * 100);
  const canvas = `Mộc ${pr("Mộc")} · Hỏa ${pr("Hỏa")} · Thổ ${pr("Thổ")} · Kim ${pr("Kim")} · Thủy ${pr("Thủy")}`;

  const duo = Object.entries(thapThan || {})
    .slice(0, 4)
    .map(([k, v]) => `${k}: ${v}`)
    .join(" · ");
  const stars = Object.values(thanSat || {})
    .filter((v) => v.value && v.value.length)
    .map((v) => `${v.vi}: ${v.value.join(", ")}`)
    .join(" | ");

  const opener = pick(
    cheerfulOpenersVI[0](
      `Giờ ${tuTru.gio} – Ngày ${tuTru.ngay} – Tháng ${tuTru.thang} – Năm ${tuTru.nam}`,
      nhatChu,
      hanh
    ),
    cheerfulOpenersVI[1](
      `Giờ ${tuTru.gio} · Ngày ${tuTru.ngay} · Tháng ${tuTru.thang} · Năm ${tuTru.nam}`,
      nhatChu,
      hanh
    ),
    cheerfulOpenersVI[2](
      `Giờ ${tuTru.gio}, Ngày ${tuTru.ngay}, Tháng ${tuTru.thang}, Năm ${tuTru.nam}`,
      nhatChu,
      hanh
    )
  );

  // Balance hint (avoid pushing colors here)
  const sorted = Object.entries(nguHanh).sort((a, b) => b[1] - a[1]);
  const strong = sorted[0][0];
  const weak = sorted[sorted.length - 1][0];
  const need = dungThan?.[0] || weak;

  return [
    opener,
    `Bức tranh ngũ hành: ${canvas}. Tổng quan: ${strong} đang vượng, ${weak} còn mỏng — nên nuôi thêm ${need} để cân bằng.`,
    `Thập Thần nổi bật: ${duo || "không nổi bật rõ rệt"}.`,
    stars ? `Thần Sát kích hoạt: ${stars}.` : "",
    `Nếu bạn muốn đi sâu, mình có thể bàn về tài vận, sự nghiệp, tình cảm, sức khỏe, gia đạo, con cái, học tập, du lịch, phong cách… bạn muốn bắt đầu chủ đề nào?`,
  ]
    .filter(Boolean)
    .join("\n");
};

/* Angle pools */
const pools = {
  health: [
    (hanh) =>
      `Điểm cần giữ là ${hanh === "Thổ" ? "đều bữa và tiêu hoá êm" : "giấc ngủ ổn định"} — hãy chọn một thay đổi nhỏ trong tuần này: đi bộ 10–15 phút sau bữa tối, và tắt màn hình 30 phút trước giờ ngủ.`,
    () =>
      `Cân bằng cảm xúc bằng nhịp thở 4–6: hít 4 giây, thở ra 6 giây, làm 3 lần mỗi khi thấy căng. Những nhịp thở nhỏ giúp đầu óc mát hơn và cơ thể tự điều chỉnh.`,
    () =>
      `Hãy nạp “nhiên liệu sạch”: bữa sáng gọn gàng, uống nước ấm khi thức dậy, và giữ 2 lít nước/ngày. Sự đều đặn nhỏ bồi sức lâu dài.`,
    () =>
      `Cơ thể hợp với vận động vừa phải. Một lịch đơn giản: 2 buổi đi bộ nhanh, 1 buổi kéo giãn/yoga, mỗi buổi 20–25 phút — duy trì 3 tuần là bạn thấy khác ngay.`,
  ],
  love: [
    (ngayChi) =>
      `Trong đối thoại, bạn hợp kiểu trao đổi thẳng thắn nhưng ấm áp. Với chi ngày ${ngayChi}, bạn hợp người kiên định, mục tiêu rõ ràng; tránh kéo dài im lặng — hẹn một cuộc trò chuyện chất lượng/tuần.`,
    () =>
      `Thay vì đoán ý nhau, hãy thử “nguyên tắc một việc tốt”: mỗi ngày làm một hành động nhỏ (nhắn tin hỏi han, một tách trà, một đoạn đường đưa đón). Tình cảm lớn lên từ những điều vừa tầm.`,
    () =>
      `Giữ ranh giới lành mạnh: đồng ý cách lắng nghe, giờ nào nói chuyện, giờ nào nghỉ. Khi khung rõ, yêu thương ấm hơn và bền hơn.`,
    () =>
      `Nếu độc thân, mở rộng vòng tròn qua bạn bè tin cậy. Một buổi cà phê sáng giữa tuần thường mang lại cuộc trò chuyện hay ho hơn là những buổi tối ồn ào.`,
  ],
  money: [
    () =>
      `Bắt đầu bằng bản đồ tiền đơn giản: 50% chi bắt buộc, 30% linh hoạt, 20% tiết kiệm/đầu tư. Khi dòng chảy rõ, tài vận ổn định tự nhiên.`,
    () =>
      `Tạo quỹ dự phòng 3–6 tháng chi phí sinh hoạt trước khi mạo hiểm. Sự an tâm giúp bạn ra quyết định tỉnh táo hơn.`,
    () =>
      `Hãy khai thác kỹ năng sẵn có để tăng thu nhập phụ: dạy kèm, nội dung số, tư vấn nhỏ theo chuyên môn. Một dự án mini 6 tuần sẽ cho bạn số liệu thật.`,
    () =>
      `Tập trung tài sản cố định trước (tiết kiệm, bảo hiểm, công cụ làm việc) rồi mới nghĩ tới đầu tư rủi ro cao. Kỷ luật nhỏ mỗi tháng đẻ ra quả ngọt.`,
  ],
  career: [
    (hanh) =>
      `Bạn hợp vai trò có quy trình rõ và thước đo cụ thể. Với khí ${hanh}, chọn việc ưu tiên chất lượng thay vì số lượng; bạn “làm đến đâu ra đến đó”.`,
    () =>
      `Kỹ năng nên mài lại: 1 lõi nghề, 1 kỹ năng mềm (viết/ thuyết trình/ đàm phán). Mỗi tuần học 90 phút, áp dụng vào việc thật.`,
    () =>
      `Đặt “thời gian trọng điểm” 90 phút buổi sáng cho việc khó nhất trong ngày. Hiệu suất tăng rõ rệt chỉ sau 10 ngày.`,
    () =>
      `Xây hồ sơ hiển thị: một trang tổng hợp dự án, 3 minh chứng kết quả định lượng. Khi bạn kể chuyện bằng số liệu, cơ hội tự tìm đến.`,
  ],
  timing: [
    (need) =>
      `Khi cần ra quyết định, hãy tận dụng khung giờ hợp hành ${need}: ${elementMeta[need].times}. Khung này giúp tâm trí gọn gàng để chọn đúng.`,
    () =>
      `Hành động mới nên khởi động vào đầu tuần; cuối tuần dành cho rà soát – hoàn thiện. Nhịp “mở – đóng” rõ ràng tạo may mắn bền.`,
    () =>
      `Trong 7 ngày tới, chọn 1 việc quan trọng và chấm vào 3 ô: chuẩn bị – thực hiện – kết thúc. Hoàn tất một vòng nhỏ luôn kéo theo cơ hội mới.`,
  ],
  family: [
    () =>
      `Trong nhà, một buổi ăn chung yên tĩnh mỗi tuần giúp cân bằng mọi thứ. Mỗi người chia sẻ một “điều tốt nhỏ” — cách đơn giản để nối lòng.`,
    () =>
      `Khi có xung đột, đặt quy ước “dừng 10 phút rồi nói tiếp”. Một khoảng thở ngắn cứu được cả buổi trò chuyện.`,
  ],
  children: [
    () =>
      `Trẻ hợp nhịp học ngắn: 25 phút tập trung + 5 phút nghỉ, lặp lại 3 lần. Tạo “góc học bé xinh” để não bộ tự vào nếp.`,
    () =>
      `Khuyến khích sáng tạo: 1 dự án nhỏ/tuần (ghép hình, làm vở kịch mini, trồng cây). Kết quả không quan trọng bằng niềm vui cùng làm.`,
  ],
  property: [
    () =>
      `Nếu cân nhắc tài sản, hãy đi 3 bước: nhu cầu thật – khả năng trả – phương án dự phòng. Đừng ký hợp đồng sau 20:00, hãy để qua một đêm rồi quyết.`,
    () =>
      `Tập trung bất động sản để ở trước khi đầu tư cho thuê. Dòng tiền an toàn là nền vững để lớn hơn sau này.`,
  ],
  study: [
    () =>
      `Chọn khung 90 phút sáng cho môn khó; chiều để luyện đề; tối chỉ ôn nhẹ và đi ngủ sớm. Não nhớ lâu khi có nhịp nghỉ đúng.`,
    () =>
      `Tìm một mentor hoặc nhóm học 2–3 người. Người đồng hành giúp bạn giữ nhịp và phản hồi kịp lúc.`,
  ],
  travel: [
    () =>
      `Khi xuất hành, chuẩn 3 thứ: bản đồ offline, 1 danh sách liên hệ khẩn và bảo hiểm du lịch. Sự chủ động biến chuyến đi thành trải nghiệm nhẹ nhàng.`,
    () =>
      `Đi công tác nên hẹn 1 cuộc gặp ngắn buổi sáng với đối tác chính — đầu giờ tỉnh táo dễ chốt việc quan trọng.`,
  ],
  fitness: [
    () =>
      `Nếu mới bắt đầu, lịch 3 buổi/tuần: 1 cardio nhẹ, 1 sức mạnh toàn thân, 1 kéo giãn sâu. Đừng ham số lượng, hãy ham đều đặn.`,
    () =>
      `Sau mỗi buổi tập, ghi lại 2 con số: thời lượng và nhịp tim. Số liệu giúp bạn thấy mình tiến bộ để có động lực dài hơi.`,
  ],
  food: [
    (need) =>
      `Thực đơn hợp hành ${need}: ưu tiên nấu ấm, ít dầu mỡ, gia vị hài hòa. Một bát canh nóng mỗi tối vừa nhẹ bụng vừa ngủ sâu.`,
    () =>
      `Hãy thử “bữa trưa xanh”: 1 phần rau lớn + 1 phần đạm gọn + 1 phần tinh bột vừa. Cơ thể nhẹ mà vẫn đủ năng lượng.`,
  ],
  style: [
    (need) =>
      `Bảng màu nên ưu tiên tông của ${need.toLowerCase()}: ${elementMeta[need].color}. Chọn một item chủ đạo rồi phối đồ tối giản — bạn sẽ trông gọn gàng mà nổi bật.`,
    () =>
      `Trang phục làm việc: 1 gam trung tính + 1 điểm nhấn nhỏ (khăn, đồng hồ, giày). Vẻ chỉn chu đến từ những đường cắt gọn và chất liệu đứng form.`,
  ],
  friends: [
    () =>
      `Trong môi trường làm việc, quy ước “phản hồi trong 24 giờ” và “viết lại thoả thuận sau họp” giúp giảm xung đột đáng kể.`,
    () =>
      `Mở rộng kết nối: mỗi tuần gặp một người bạn cũ/đồng nghiệp cũ. Cầu nối ấm áp thường đem đến cơ hội bất ngờ.`,
  ],
};

/* Color → element mapping (very rough & multilingual) */
const colorToElement = (word) => {
  const w = rm(word).toLowerCase();
  if (/(do|do cam|cam|orange|red)/.test(w)) return "Hỏa";
  if (/(vang|dat|nau|be|yellow|earth|brown|beige|sand)/.test(w)) return "Thổ";
  if (/(trang|bac|kim|white|silver|metal)/.test(w)) return "Kim";
  if (/(xanh duong|den|blue|black|navy)/.test(w)) return "Thủy";
  if (/(xanh la|luc|green|teal)/.test(w)) return "Mộc";
  if (/(tim|purple|violet|magenta)/.test(w)) return "Hỏa"; // nửa Hỏa nửa Thủy; tạm ưu Hỏa
  return null;
};

/* A/B choice helper */
const chooseBetween = (aRaw, bRaw, context) => {
  const a = aRaw.trim();
  const b = bRaw.trim();

  // 1) Color choice
  const aEl = colorToElement(a);
  const bEl = colorToElement(b);
  if (aEl || bEl) {
    const need = context.dungThan?.[0] || context.weakElement || "Thổ";
    const score = (el) => (el === need ? 2 : el ? 1 : 0);
    const pickOne = score(aEl) >= score(bEl) ? a : b;
    const why =
      `Vì nên bồi hành ${need.toLowerCase()}, bảng màu đó hỗ trợ thần khí và cảm giác tự tin.` +
      ` Hãy bắt đầu bằng món dễ phối (áo/khăn/giày) rồi tăng dần độ đậm.`;
    return `Mình nghiêng về **${pickOne}**. ${why}`;
  }

  // 2) Zodiac branch (chi) choice
  const branches = Object.keys(earthlyBranchesMap.vi);
  if (branches.includes(a) && branches.includes(b)) {
    const ngayChi = context.ngayChi;
    const prefer = (x) =>
      (lucHop[ngayChi] === x ? 3 : 0) +
      (tamHopGroups.some((g) => g.includes(ngayChi) && g.includes(x)) ? 2 : 0) +
      (xung[ngayChi] === x ? -2 : 0);
    const ans = prefer(a) >= prefer(b) ? a : b;
    const reason =
      lucHop[ngayChi] === ans
        ? `vì **Lục hợp** với chi ngày ${ngayChi}`
        : tamHopGroups.some((g) => g.includes(ngayChi) && g.includes(ans))
        ? `vì chung **Tam hợp** với chi ngày ${ngayChi}`
        : `vì ít xung khắc với chi ngày ${ngayChi}`;
    return `Nghiêng về **${ans}**, ${reason}. Dù vậy, sự hoà hợp còn nằm ở cách giao tiếp hàng ngày nữa bạn nhé.`;
  }

  // 3) Job choice — very simple element mapping
  const jobMap = {
    "tai chinh": "Kim",
    ke_toan: "Kim",
    ky_su: "Kim",
    lap_trinh: "Thủy",
    data: "Thủy",
    thiet_ke: "Mộc",
    giao_vien: "Mộc",
    marketing: "Hỏa",
    truyen_thong: "Hỏa",
    van_hanh: "Thổ",
    bat_dong_san: "Thổ",
  };
  const jobEl = (txt) => {
    const t = rm(txt).toLowerCase();
    if (/tai chinh|ke toan|bank|finance|account/.test(t)) return jobMap["tai chinh"];
    if (/ky su|engineer|cokhi|dien|it(?!em)/.test(t)) return "Kim";
    if (/lap trinh|developer|software|coder|data|phan tich/.test(t)) return "Thủy";
    if (/thiet ke|design|ux|ui|giao vien|teacher/.test(t)) return "Mộc";
    if (/marketing|quang cao|truyen thong|content/.test(t)) return "Hỏa";
    if (/van hanh|operation|bat dong san|real estate|quan tri/.test(t)) return "Thổ";
    return null;
  };
  const aJob = jobEl(a);
  const bJob = jobEl(b);
  if (aJob || bJob) {
    const need = context.dungThan?.[0] || context.strongElement; // có thể chọn theo Dụng thần/điểm mạnh
    const score = (el) => (el === need ? 2 : el ? 1 : 0);
    const ans = score(aJob) >= score(bJob) ? a : b;
    const why = `vì thiên về hành **${(score(aJob) >= score(bJob) ? aJob : bJob) || need}**, phù hợp nhịp năng lượng của bạn hiện tại.`;
    return `Mình chọn **${ans}**, ${why}`;
  }

  return null; // fall back to intent or GPT
};

/* Pretty % string */
const toPercentLine = (count) => {
  const total = Object.values(count).reduce((a, b) => a + b, 0) || 1;
  const p = (k) => pct((count[k] / total) * 100);
  return `Mộc ${p("Mộc")}, Hỏa ${p("Hỏa")}, Thổ ${p("Thổ")}, Kim ${p("Kim")}, Thủy ${p("Thủy")}`;
};

/* Main answer dispatcher (Vietnamese only for now) */
const answerForIntent = (intent, ctx, userText, fingerprint) => {
  const { tuTru, nguHanh, thapThan, thanSat, dungThan } = ctx;
  const nhatChu = tuTru.ngay.split(" ")[0];
  const hanh = canNguHanh[nhatChu];

  // Special: overview hook if user says "Hãy xem bát tự cho mình"
  if (intent === "overview") {
    return overviewVI(tuTru, nguHanh, thapThan, thanSat, dungThan);
  }

  // A/B choices: "... A hay B"
  const m = rm(userText).match(/(.+?)\s+hay\s+(.+?)$/i) || rm(userText).match(/(.+?)\s+or\s+(.+?)$/i);
  if (m) {
    const suggestion = chooseBetween(m[1], m[2], {
      dungThan,
      weakElement: Object.entries(nguHanh).sort((a, b) => a[1] - b[1])[0][0],
      strongElement: Object.entries(nguHanh).sort((a, b) => b[1] - a[1])[0][0],
      ngayChi: tuTru.ngay.split(" ")[1],
    });
    if (suggestion) return suggestion;
  }

  // Prevent repetition by rotating angles
  const pool = pools[intent] || [];
  if (!pool.length) return null;
  const idx = nextAngle(fingerprint, intent, pool);
  const fn = pool[idx];

  // Build context lines (avoid repeating color unless "style")
  const lines = [];
  if (intent === "health") {
    lines.push(fn(hanh));
  } else if (intent === "love") {
    lines.push(fn(tuTru.ngay.split(" ")[1]));
  } else if (intent === "money" || intent === "career" || intent === "timing") {
    const need = dungThan?.[0] || hanh;
    lines.push(fn(need));
  } else if (intent === "food" || intent === "style") {
    const need = dungThan?.[0] || hanh;
    lines.push(fn(need));
  } else {
    lines.push(fn());
  }

  // Gentle, specific closing sentence
  const closings = [
    `Bạn cần mình đi sâu hơn phần nào không?`,
    `Nếu muốn, mình có thể gợi ý từng bước nhỏ để bạn bắt đầu ngay hôm nay.`,
    `Mình luôn ở đây để cùng bạn tinh chỉnh kế hoạch.`,
  ];
  return `${lines.join(" ")} ${pick(...closings)}`;
};

/* Intent resolver */
const detectIntent = (text) => {
  const t = rm(text);
  for (const it of intents) {
    if (it.re.test(t)) return it.key;
  }
  // A/B choice implies style/love/job… keep as null, will handle separately
  if (/\s(hay|or)\s/.test(t)) return "choice";
  return null;
};

/* =========================
   Main API route (VI/EN)
   ========================= */
app.post("/api/luan-giai-bazi", async (req, res) => {
  const start = Date.now();
  try {
    const { messages, tuTruInfo, dungThan } = req.body || {};
    const language = guessLanguage(messages);
    if (language !== "vi") {
      return res
        .status(400)
        .json({ error: "Hiện tại API này trả lời tốt nhất bằng tiếng Việt." });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Thiếu messages" });
    }
    if (!tuTruInfo || typeof tuTruInfo !== "string") {
      return res.status(400).json({ error: "Thiếu tuTruInfo" });
    }

    const userText = (messages.slice().reverse().find((m) => m.role === "user")?.content || "").trim();

    // Parse Tứ Trụ
    let tuTru;
    try {
      const raw = JSON.parse(tuTruInfo);
      tuTru = {
        gio: normalizeCanChi(raw.gio),
        ngay: normalizeCanChi(raw.ngay),
        thang: normalizeCanChi(raw.thang),
        nam: normalizeCanChi(raw.nam),
      };
      if (!tuTru.gio || !tuTru.ngay || !tuTru.thang || !tuTru.nam) throw new Error("invalid");
    } catch {
      tuTru = parseEnglishTuTru(userText);
      if (!tuTru?.gio || !tuTru?.ngay || !tuTru?.thang || !tuTru?.nam) {
        return res.status(400).json({ error: "Tứ Trụ không hợp lệ" });
      }
    }

    // Core analysis
    let nguHanh, thapThan, thanSat;
    try {
      nguHanh = analyzeNguHanh(tuTru);
    } catch {
      return res.status(400).json({ error: "Dữ liệu ngũ hành không hợp lệ" });
    }
    try {
      thapThan = tinhThapThan(tuTru.ngay?.split(" ")[0], tuTru);
    } catch (e) {
      thapThan = {};
    }
    try {
      thanSat = tinhThanSat(tuTru);
    } catch (e) {
      thanSat = {};
    }

    const dungThanArr = Array.isArray(dungThan)
      ? dungThan
      : dungThan?.hanh && Array.isArray(dungThan.hanh)
      ? dungThan.hanh
      : [];

    // Cache fingerprint (per user birth chart)
    const fingerprint = `${tuTru.gio}|${tuTru.ngay}|${tuTru.thang}|${tuTru.nam}`;

    // Detect intent
    let intent = detectIntent(userText) || "overview";

    // Build internal answer
    let internalAnswer = answerForIntent(
      intent === "choice" ? "style" : intent,
      { tuTru, nguHanh, thapThan, thanSat, dungThan: dungThanArr },
      userText,
      fingerprint
    );

    // If intent not recognized or internalAnswer empty → GPT fallback
    if (!internalAnswer || intent === null) {
      if (!hasOpenAI()) {
        // basic fallback
        internalAnswer =
          "Mình đã ghi nhận câu hỏi của bạn. Hãy diễn đạt rõ hơn mục tiêu (tài vận, sự nghiệp, tình cảm, sức khỏe, màu sắc, thời điểm may mắn…), mình sẽ trả lời thật cụ thể nhé.";
      } else {
        const base = overviewVI(tuTru, nguHanh, thapThan, thanSat, dungThanArr);
        const sys =
          "Bạn là cố vấn Bát Tự nói tiếng Việt, ấm áp, cụ thể, không lặp lại lời khuyên đã nêu. Trả lời ngắn gọn nhưng có cảm xúc và hành động rõ ràng.";
        const prompt =
          `${base}\n\nNgười dùng hỏi: "${userText}". ` +
          "Hãy trả lời thẳng trọng tâm, đưa lời khuyên thực tế, tránh dự đoán ngày tháng cụ thể nếu không có dữ liệu vận hạn.";
        try {
          const gpt = await callOpenAI({
            model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
            temperature: 0.6,
            max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || "900", 10),
            messages: [
              { role: "system", content: sys },
              { role: "user", content: prompt },
            ],
          });
          internalAnswer =
            gpt?.choices?.[0]?.message?.content?.trim() ||
            "Mình sẽ cần thêm thông tin để trả lời sâu hơn câu này.";
        } catch (e) {
          internalAnswer =
            "Hiện không kết nối được tới dịch vụ soạn thảo. Bạn có thể hỏi lại theo một chủ đề rõ hơn (tài vận/sự nghiệp/tình cảm/sức khỏe…) và mình sẽ trả lời ngay bằng phân tích nội bộ.";
        }
      }
    } else if (process.env.POLISH_WITH_GPT === "true" && hasOpenAI()) {
      // Optional: polish phrasing only (keep meaning)
      try {
        const gpt = await callOpenAI({
          model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
          temperature: 0.5,
          max_tokens: 600,
          messages: [
            {
              role: "system",
              content:
                "Bạn là biên tập viên tiếng Việt. Hãy viết lại đoạn sau cho ấm áp, tự nhiên, tránh lặp từ, không thay đổi ý nghĩa, không thêm dự đoán thời gian cụ thể.",
            },
            { role: "user", content: internalAnswer },
          ],
        });
        internalAnswer = gpt?.choices?.[0]?.message?.content?.trim() || internalAnswer;
      } catch {
        // keep internalAnswer
      }
    }

    const answer = internalAnswer.trim();
    // Optional cache per request content
    const cacheKey = `ans:${fingerprint}:${rm(userText).slice(0, 50)}`;
    cache.set(cacheKey, answer);

    console.log(`OK in ${Date.now() - start}ms`);
    return res.json({
      answer,
      meta: {
        nhatChu: tuTru.ngay.split(" ")[0],
        nguHanh: toPercentLine(nguHanh),
      },
    });
  } catch (err) {
    try {
      fs.appendFileSync(
        "error.log",
        `${new Date().toISOString()} - ${err.stack || err.message}\n`
      );
    } catch {}
    console.error(err);
    return res.status(500).json({ error: "Đã xảy ra lỗi hệ thống." });
  }
});

/* =============
   Server start
   ============= */
const port = process.env.PORT || 10000;
const server = app.listen(port, () => {
  console.log(`Bát Tự AI server is running on port ${port}`);
});
server.setTimeout(300000);
