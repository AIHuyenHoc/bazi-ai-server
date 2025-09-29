// server.js (robust CORS, tolerant input, year-window 2026–2033, GPT polish)
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

/* ---------- Security & Core MW ---------- */
app.set("trust proxy", 1); // render/vercel/nginx
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(
  cors({
    origin: (_o, cb) => cb(null, true),                 // allow all origins (đơn giản)
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
    maxAge: 86400,
  })
);
app.options("*", cors()); // handle preflight cho mọi route
app.use(express.json({ limit: "1mb" }));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 150,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// request log ngắn gọn để debug Failed-to-fetch
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.get("/health", (_req, res) => res.status(200).send("OK"));

/* ---------- Helpers & Tables ---------- */
const rm = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

const heavenlyStemsMap = {
  en: { Jia: "Giáp", Yi: "Ất", Bing: "Bính", Ding: "Đinh", Wu: "Mậu", Ji: "Kỷ", Geng: "Canh", Xin: "Tân", Ren: "Nhâm", Gui: "Quý" },
  vi: { Giáp: "Giáp", Ất: "Ất", Bính: "Bính", Đinh: "Đinh", Mậu: "Mậu", Kỷ: "Kỷ", Canh: "Canh", Tân: "Tân", Nhâm: "Nhâm", Quý: "Quý" },
};
const earthlyBranchesMap = {
  en: { Rat: "Tý", Ox: "Sửu", Tiger: "Dần", Rabbit: "Mão", Dragon: "Thìn", Snake: "Tỵ", Horse: "Ngọ", Goat: "Mùi", Monkey: "Thân", Rooster: "Dậu", Dog: "Tuất", Pig: "Hợi" },
  vi: { Tý: "Tý", Sửu: "Sửu", Dần: "Dần", Mão: "Mão", Thìn: "Thìn", Tỵ: "Tỵ", Ngọ: "Ngọ", Mùi: "Mùi", Thân: "Thân", Dậu: "Dậu", Tuất: "Tuất", Hợi: "Hợi" },
};
const canNguHanh = { Giáp: "Mộc", Ất: "Mộc", Bính: "Hỏa", Đinh: "Hỏa", Mậu: "Thổ", Kỷ: "Thổ", Canh: "Kim", Tân: "Kim", Nhâm: "Thủy", Quý: "Thủy" };
const chiNguHanh = { Tý: "Thủy", Hợi: "Thủy", Sửu: "Thổ", Thìn: "Thổ", Mùi: "Thổ", Tuất: "Thổ", Dần: "Mộc", Mão: "Mộc", Tỵ: "Hỏa", Ngọ: "Hỏa", Thân: "Kim", Dậu: "Kim" };
const ELEMS = ["Mộc", "Hỏa", "Thổ", "Kim", "Thủy"];

const guessLang = (messages = []) => {
  const t = rm(messages.map((m) => m.content || "").join(" "));
  const vi = /(bat tu|tu tru|ngay|thang|nam|gio|giap|at|binh|dinh|mau|ky|canh|tan|nham|quy|ty|suu|dan|mao|thin|ty|ngo|mui|than|dau|tuat|hoi)/i.test(t);
  return vi ? "vi" : "en";
};

const normalizeCanChi = (s) => {
  if (!s || typeof s !== "string") return null;
  const [c1, c2] = s.trim().split(/\s+/);
  if (!c1 || !c2) return null;
  const viCan = Object.keys(heavenlyStemsMap.vi).find((k) => rm(k).toLowerCase() === rm(c1).toLowerCase());
  const viChi = Object.keys(earthlyBranchesMap.vi).find((k) => rm(k).toLowerCase() === rm(c2).toLowerCase());
  if (viCan && viChi) return `${viCan} ${viChi}`;
  const enCan = heavenlyStemsMap.en[c1];
  const enChi = earthlyBranchesMap.en[c2];
  if (enCan && enChi) return `${enCan} ${enChi}`;
  return null;
};

const parseEnglishTuTru = (input) => {
  if (!input) return null;
  const re = /([A-Za-z]+)\s+([A-Za-z]+)\s*(hour|day|month|year)/gi;
  const out = {};
  for (const m of input.matchAll(re)) {
    const stem = heavenlyStemsMap.en[m[1]] || m[1];
    const br = earthlyBranchesMap.en[m[2]] || m[2];
    const pair = `${stem} ${br}`;
    const slot = m[3].toLowerCase();
    if (slot === "hour") out.gio = pair;
    if (slot === "day") out.ngay = pair;
    if (slot === "month") out.thang = pair;
    if (slot === "year") out.nam = pair;
  }
  return out.gio && out.ngay && out.thang && out.nam ? out : null;
};

/* ---------- Năm may mắn 2026–2033 (cố định) ---------- */
const YEARS = [
  { y: 2026, cc: "Bính Ngọ",  elems: ["Hỏa"] },
  { y: 2027, cc: "Đinh Mùi",  elems: ["Hỏa", "Thổ"] },
  { y: 2028, cc: "Mậu Thân", elems: ["Thổ", "Kim"] },
  { y: 2029, cc: "Kỷ Dậu",   elems: ["Thổ", "Kim"] },
  { y: 2030, cc: "Canh Tuất", elems: ["Kim", "Thổ"] },
  { y: 2031, cc: "Tân Hợi",  elems: ["Kim", "Thủy"] },
  { y: 2032, cc: "Nhâm Tý",  elems: ["Kim", "Thủy"] },
  { y: 2033, cc: "Quý Sửu",  elems: ["Thủy", "Thổ"] },
];
const suggestYears = (favElems = []) => {
  const fav = favElems.filter((x) => ELEMS.includes(x));
  // ưu tiên năm có giao nhau nhiều với Dụng Thần
  return YEARS
    .map((o) => ({ ...o, score: o.elems.reduce((s, e) => s + (fav.includes(e) ? 1 : 0), 0) }))
    .sort((a, b) => b.score - a.score || a.y - b.y);
};

/* ---------- Phân tích ngũ hành / thần sát (rút gọn) ---------- */
const analyzeNguHanh = (tuTru) => {
  const count = { Mộc: 0, Hỏa: 0, Thổ: 0, Kim: 0, Thủy: 0 };
  const hidden = {
    Tý: ["Quý"], Sửu: ["Kỷ", "Tân", "Quý"], Dần: ["Giáp", "Bính", "Mậu"], Mão: ["Ất"],
    Thìn: ["Mậu", "Ất", "Quý"], Tỵ: ["Bính", "Canh", "Mậu"], Ngọ: ["Đinh", "Kỷ"],
    Mùi: ["Kỷ", "Đinh", "Ất"], Thân: ["Canh", "Nhâm", "Mậu"], Dậu: ["Tân"],
    Tuất: ["Mậu", "Đinh", "Tân"], Hợi: ["Nhâm", "Giáp"],
  };
  const pieces = [tuTru.nam, tuTru.thang, tuTru.ngay, tuTru.gio].join(" ").trim().split(/\s+/);
  const branches = [tuTru.nam?.split(" ")[1], tuTru.thang?.split(" ")[1], tuTru.ngay?.split(" ")[1], tuTru.gio?.split(" ")[1]].filter(Boolean);

  if (pieces.length < 8) throw new Error("Tứ Trụ không đầy đủ");

  for (const t of pieces) {
    if (canNguHanh[t]) count[canNguHanh[t]] += 1;
    if (chiNguHanh[t]) count[chiNguHanh[t]] += 1;
  }
  for (const chi of branches) (hidden[chi] || []).forEach((h) => { if (canNguHanh[h]) count[canNguHanh[h]] += 0.3; });

  const total = Object.values(count).reduce((a, b) => a + b, 0);
  if (!total) throw new Error("Ngũ Hành rỗng");
  return count;
};
const percentify = (obj) => {
  const total = Object.values(obj).reduce((a, b) => a + b, 0) || 1;
  const out = {};
  ELEMS.forEach((k) => (out[k] = `${(((obj[k] || 0) / total) * 100).toFixed(2)}%`));
  return out;
};

const tinhThanSat = (tuTru) => {
  const nhatChu = tuTru.ngay?.split(" ")[0];
  const ngayChi = tuTru.ngay?.split(" ")[1];
  const branches = [tuTru.nam?.split(" ")[1], tuTru.thang?.split(" ")[1], tuTru.ngay?.split(" ")[1], tuTru.gio?.split(" ")[1]].filter(Boolean);
  if (!nhatChu || !ngayChi || !branches.length) return {};

  const thienAtQuyNhan = { Giáp: ["Sửu", "Mùi"], Mậu: ["Sửu", "Mùi"], Canh: ["Sửu", "Mùi"], Ất: ["Thân", "Tý"], Kỷ: ["Thân", "Tý"], Bính: ["Dậu", "Hợi"], Đinh: ["Dậu", "Hợi"], Tân: ["Dần", "Ngọ"], Nhâm: ["Tỵ", "Mão"], Quý: ["Tỵ", "Mão"] };
  const tuongTinh = { Thân: "Tý", Tý: "Tý", Thìn: "Tý", Tỵ: "Dậu", Dậu: "Dậu", Sửu: "Dậu", Dần: "Ngọ", Ngọ: "Ngọ", Tuất: "Ngọ", Hợi: "Mão", Mão: "Mão", Mùi: "Mão" };
  const vanXuong = { Giáp: ["Tỵ"], Ất: ["Ngọ"], Bính: ["Thân"], Đinh: ["Dậu"], Mậu: ["Thân"], Kỷ: ["Dậu"], Canh: ["Hợi"], Tân: ["Tý"], Nhâm: ["Dần"], Quý: ["Mão"] };
  const daoHoa = { Thân: "Dậu", Tý: "Dậu", Thìn: "Dậu", Tỵ: "Ngọ", Dậu: "Ngọ", Sửu: "Ngọ", Dần: "Mão", Ngọ: "Mão", Tuất: "Mão", Hợi: "Tý", Mão: "Tý", Mùi: "Tý" };
  const dichMa = { Thân: "Dần", Tý: "Dần", Thìn: "Dần", Tỵ: "Hợi", Dậu: "Hợi", Sửu: "Hợi", Dần: "Thân", Ngọ: "Thân", Tuất: "Thân", Hợi: "Tỵ", Mão: "Tỵ", Mùi: "Tỵ" };

  return {
    "Thiên Ất Quý Nhân": thienAtQuyNhan[nhatChu]?.filter((c) => branches.includes(c)) || [],
    "Tướng Tinh": branches.includes(tuongTinh[ngayChi]) ? [tuongTinh[ngayChi]] : [],
    "Văn Xương": vanXuong[nhatChu]?.filter((c) => branches.includes(c)) || [],
    "Đào Hoa": branches.includes(daoHoa[ngayChi]) ? [daoHoa[ngayChi]] : [],
    "Dịch Mã": branches.includes(dichMa[ngayChi]) ? [dichMa[ngayChi]] : [],
  };
};

/* ---------- GPT ---------- */
const callOpenAI = async (payload, retries = 2, delay = 1200) => {
  if (!process.env.OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
  for (let i = 1; i <= retries; i++) {
    try {
      const r = await axios.post("https://api.openai.com/v1/chat/completions", payload, {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        timeout: 45000,
      });
      return r.data;
    } catch (e) {
      if (i === retries) throw e;
      await new Promise((r) => setTimeout(r, delay * i));
    }
  }
};

/* ---------- Intent ---------- */
const classify = (txt) => {
  const t = rm((txt || "").toLowerCase());
  const hasChoice = /(?:\b| )(?:hay|or)\b/i.test(txt || "");
  const intents = {
    general: /(hay xem bat tu|xem bat tu|tong quan|bat tu)/i.test(t),
    money: /(tai van|tai chinh|tien bac|thu nhap|giau|tiet kiem|dau tu|real estate|bat dong san)/i.test(t),
    career: /(nghe nghiep|su nghiep|cong viec|thang tien|job|career|chuyen nganh)/i.test(t),
    love: /(tinh cam|hon nhan|nguoi yeu|ket hon|love|romance|dao hoa)/i.test(t),
    health: /(suc khoe|benh|sleep|an uong|stress|tam ly|mental)/i.test(t),
    family: /(gia dao|gia dinh|cha me|vo chong|con chau|anh em)/i.test(t),
    children: /(con cai|nuoi day|tre em|con trai|con gai)/i.test(t),
    color: /(mau|ao|mac|phong cach|style|fashion)/i.test(t),
    timeLuck: /(may man|thoi diem|gio tot|ngay may|thang nao tot)/i.test(t),
    timeLuckYear: /(nam nao tot|năm nào tốt|which year is good|year will be lucky)/i.test(t),
    sports: /(the thao|tap luyen|chay bo|gym|yoga)/i.test(t),
    pet: /(thu cung|cho|meo|pet)/i.test(t),
    food: /(am thuc|an gi|che do an|diet|keto|eat)/i.test(t),
    friendship: /(ban be|giao tiep|network|ket noi)/i.test(t),
  };
  if (!Object.values(intents).some((v) => v)) intents.general = true;
  return { ...intents, hasChoice };
};

/* ---------- Skeleton ---------- */
const skeletonGeneral = ({ tuTru, nguHanhPct, nhatChu, nhatHanh, dungThan, thanSat }) => {
  const starsActive = Object.entries(thanSat || {})
    .filter(([_, v]) => v.length)
    .map(([k, v]) => `${k}: ${v.join(", ")}`)
    .join(" · ");
  return [
    `Tứ Trụ: Giờ ${tuTru.gio} – Ngày ${tuTru.ngay} – Tháng ${tuTru.thang} – Năm ${tuTru.nam}.`,
    `Nhật Chủ ${nhatChu} (${nhatHanh}).`,
    `Ngũ Hành: ${ELEMS.map((k) => `${k} ${nguHanhPct[k]}`).join(", ")}.`,
    `Dụng Thần: ${dungThan.length ? dungThan.join(", ") : "—"}.`,
    starsActive ? `Thần Sát: ${starsActive}.` : `Thần Sát: —.`,
  ].join("\n");
};

const postProcess = (text, { hasChoice, yearPair }) => {
  let out = (text || "").trim();
  if (!hasChoice) {
    const bad = /(A\/B|lựa chọn|chon [ab]\b|tuoi\s+(ty|suu|dan|mao|thin|ty|ngo|mui|than|dau|tuat|hoi))/i;
    out = out.split("\n").filter((l) => !bad.test(rm(l))).join("\n").trim();
  }
  // chỉ cho phép "Tuổi <can chi>" nếu đúng năm sinh
  const reAge = /^\s*Tuổi\s+(Giáp|Ất|Bính|Đinh|Mậu|Kỷ|Canh|Tân|Nhâm|Quý)\s+(Tý|Sửu|Dần|Mão|Thìn|Tỵ|Ngọ|Mùi|Thân|Dậu|Tuất|Hợi)/i;
  out = out
    .split("\n")
    .filter((line) => {
      const m = line.match(reAge);
      if (!m) return true;
      const pair = `${cap(m[1])} ${cap(m[2])}`;
      return pair === yearPair;
    })
    .join("\n")
    .trim();
  return out;
};

/* ---------- Main API ---------- */
app.post("/api/luan-giai-bazi", async (req, res) => {
  const started = Date.now();
  try {
    const { messages, tuTruInfo, dungThan } = req.body;
    if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: "Missing messages" });
    const lang = guessLang(messages);
    const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content || "";
    const intents = classify(lastUser);

    // ---- Parse Tứ Trụ: chấp nhận object hoặc string
    let tuTru;
    try {
      let raw = null;
      if (typeof tuTruInfo === "string") raw = JSON.parse(tuTruInfo);
      else if (tuTruInfo && typeof tuTruInfo === "object") raw = tuTruInfo;
      else throw new Error("tuTruInfo must be string or object");

      tuTru = {
        gio: normalizeCanChi(raw.gio),
        ngay: normalizeCanChi(raw.ngay),
        thang: normalizeCanChi(raw.thang),
        nam: normalizeCanChi(raw.nam),
      };
      if (!tuTru.gio || !tuTru.ngay || !tuTru.thang || !tuTru.nam) throw new Error("invalid four pillars");
    } catch {
      // không đẩy sang parser English nếu tuTruInfo không hợp lệ – trả lỗi rõ ràng
      const msg =
        lang === "vi"
          ? "Tứ Trụ không hợp lệ. Yêu cầu {gio, ngay, thang, nam} định dạng 'Can Chi' (ví dụ 'Giáp Tý')."
          : "Invalid Four Pillars. Provide {gio,ngay,thang,nam} as 'Can Chi' pairs (e.g. 'Giap Ty').";
      return res.status(400).json({ error: msg });
    }

    const nhatChu = tuTru.ngay.split(" ")[0];
    const nhatHanh = canNguHanh[nhatChu];
    const dungThanHanh = Array.isArray(dungThan) ? dungThan : dungThan?.hanh || [];
    if (!dungThanHanh.every((d) => ELEMS.includes(d))) {
      return res.status(400).json({ error: lang === "vi" ? "Dụng Thần không hợp lệ" : "Invalid Useful God" });
    }

    // ---- Phân tích
    const nguHanh = analyzeNguHanh(tuTru);
    const nguHanhPct = percentify(nguHanh);
    const thanSat = tinhThanSat(tuTru);

    // ---- Nếu hỏi "năm nào tốt": trả lời LOCAL (không để GPT bịa)
    if (intents.timeLuckYear) {
      const list = suggestYears(dungThanHanh);
      const bullets = list
        .slice(0, 8)
        .map((x) => `• ${x.y} – ${x.cc} (${x.elems.join(" & ")})`)
        .join("\n");
      const why =
        lang === "vi"
          ? `Ưu tiên các năm có hành trùng với Dụng Thần (${dungThanHanh.join(", ") || nhatHanh}).`
          : `Prefer years whose elements intersect your Useful God (${dungThanHanh.join(", ") || nhatHanh}).`;

      const head = skeletonGeneral({ tuTru, nguHanhPct, nhatChu, nhatHanh, dungThan: dungThanHanh, thanSat });
      const body =
        lang === "vi"
          ? `Các năm nên ưu tiên (2026–2033):\n${bullets}\n\n${why}`
          : `Recommended years (2026–2033):\n${bullets}\n\n${why}`;
      return res.json({ answer: `${head}\n\n${body}`, meta: { ms: Date.now() - started, src: "local-year" } });
    }

    // ---- GPT polish (các câu còn lại)
    const core = skeletonGeneral({ tuTru, nguHanhPct, nhatChu, nhatHanh, dungThan: dungThanHanh, thanSat });

    const focus = [];
    if (intents.general) focus.push(lang === "vi" ? "Tổng quan & 2–3 bước hành động sát dụng thần." : "Overview & 2–3 actions tied to Useful God.");
    if (intents.money) focus.push(lang === "vi" ? "Tài vận: cách kiếm/giữ tiền gắn Dụng Thần; tận dụng Quý Nhân/Dịch Mã nếu có." : "Wealth: earning/retaining tied to Useful God; leverage Nobleman/Travel if active.");
    if (intents.career) focus.push(lang === "vi" ? "Sự nghiệp: vai trò, môi trường, thói quen làm việc khớp Dụng Thần." : "Career: roles, environments, habits aligned with Useful God.");
    if (intents.love) focus.push(lang === "vi" ? "Tình cảm: phong cách giao tiếp/hẹn hò dựa Đào Hoa & Dụng Thần." : "Love: communication/dating style via Peach Blossom + Useful God.");
    if (intents.health) focus.push(lang === "vi" ? "Sức khỏe: 1 thói quen 10–15 phút/ngày để cân hành yếu." : "Health: one 10–15 min habit to balance weak element.");
    if (intents.family) focus.push(lang === "vi" ? "Gia đạo: một động thái hóa giải dựa Dụng Thần." : "Family: one concrete action using Useful God.");
    if (intents.children) focus.push(lang === "vi" ? "Con cái: định hướng học/nuôi dạy hợp hành." : "Children: study/parenting tips by element.");
    if (intents.color) focus.push(lang === "vi" ? "Màu sắc/phong cách: chỉ trả lời khi được hỏi, quy về Dụng Thần." : "Color/style: answer only when asked, map to Useful God.");
    if (intents.sports) focus.push(lang === "vi" ? "Thể thao: môn phù hợp hành." : "Sports: disciplines by element.");
    if (intents.pet) focus.push(lang === "vi" ? "Thú cưng: loại/cách chăm theo hành." : "Pets: type/care by element.");
    if (intents.food) focus.push(lang === "vi" ? "Ẩm thực: nhóm vị & thực phẩm cân bằng hành (phi y khoa)." : "Food: flavours/foods to balance element (non-medical).");
    if (intents.friendship) focus.push(lang === "vi" ? "Bạn bè/network: tận dụng Quý Nhân + Dụng Thần." : "Friendship/networking via Nobleman + Useful God.");

    const system =
      lang === "vi"
        ? [
            "Bạn là trợ lý Bát Tự ấm áp, súc tích, có chiều sâu.",
            "BẮT BUỘC mở đầu bằng: Tứ Trụ + Nhật Chủ(hành) + % Ngũ Hành + Dụng Thần + Thần Sát (nếu có).",
            "Luôn gắn khuyến nghị với Dụng Thần. Không lặp đi lặp lại màu sắc nếu không được hỏi.",
            "Không bịa năm vận hạn. Nếu người dùng hỏi 'năm nào tốt', API đã trả lời ở server.",
          ].join("\n")
        : [
            "You are a warm, precise Bazi assistant.",
            "MUST start with: Four Pillars + Day Master(element) + five-elements% + Useful God + active stars.",
            "Tie advice to Useful God. Do not repeat colors unless asked.",
            "Do NOT invent lucky years. The server handles that case.",
          ].join("\n");

    const context = [
      core,
      focus.length ? (lang === "vi" ? `Trọng tâm:\n- ${focus.join("\n- ")}` : `Focus:\n- ${focus.join("\n- ")}`) : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const payload = {
      model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
      temperature: 0.5,
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || "1200", 10),
      messages: [
        { role: "system", content: system },
        { role: "user", content: (lang === "vi" ? "Câu hỏi: " : "Question: ") + lastUser + "\n\n" + context },
      ],
    };

    let answer;
    try {
      const gpt = await callOpenAI(payload);
      answer = gpt?.choices?.[0]?.message?.content?.trim() || core;
    } catch (e) {
      console.error("OpenAI error:", e.message);
      answer = core;
    }
    answer = postProcess(answer, { hasChoice: intents.hasChoice, yearPair: tuTru.nam });

    const cacheKey = `${JSON.stringify(tuTru)}|${rm(lastUser)}|${(dungThanHanh || []).join(",")}|${lang}`;
    cache.set(cacheKey, answer);

    return res.json({ answer, meta: { ms: Date.now() - started } });
  } catch (err) {
    try {
      fs.appendFileSync("error.log", `${new Date().toISOString()} ${err.stack || err.message}\n`);
    } catch {}
    return res.status(500).json({ error: "Internal error" });
  }
});

/* ---------- Diagnostics (giúp bắt lỗi 'Failed to fetch') ---------- */
app.get("/diag", async (_req, res) => {
  const out = {
    time: new Date().toISOString(),
    node: process.version,
    hasKey: !!process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
  };
  try {
    await axios.get("https://status.openai.com/api/v2/status.json", { timeout: 5000 });
    out.openaiReachable = true;
  } catch {
    out.openaiReachable = false;
  }
  res.json(out);
});

/* ---------- Error handler ---------- */
app.use((err, _req, res, _next) => {
  try { fs.appendFileSync("error.log", `${new Date().toISOString()} - ${err.stack || err.message}\n`); } catch {}
  res.status(500).json({ error: "System error occurred" });
});

/* ---------- Start ---------- */
const port = process.env.PORT || 10000;
const server = app.listen(port, () => console.log(`Server listening on ${port}`));
server.setTimeout(300000);
