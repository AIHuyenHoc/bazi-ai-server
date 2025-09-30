// server.js — Bát Tự + GPT-3.5 polish, can-chi guard, year guard 2026–2033

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

/* ────────────────── security & middleware ────────────────── */
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 150,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/health", (req, res) => res.status(200).send("OK"));

/* ────────────────── helpers & maps ────────────────── */
const rm = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

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

const VN_ELEMS = ["Mộc", "Hỏa", "Thổ", "Kim", "Thủy"];

/* ───── Năm hợp lệ 2026–2033 (chặn bịa “Ất Tý”, …) ───── */
const YEARS_26_33 = [
  { year: 2026, label: "Bính Ngọ", elements: ["Hỏa"] },
  { year: 2027, label: "Đinh Mùi", elements: ["Hỏa", "Thổ"] },
  { year: 2028, label: "Mậu Thân", elements: ["Thổ", "Kim"] },
  { year: 2029, label: "Kỷ Dậu", elements: ["Thổ", "Kim"] },
  { year: 2030, label: "Canh Tuất", elements: ["Kim", "Thổ"] },
  { year: 2031, label: "Tân Hợi", elements: ["Kim", "Thủy"] },
  { year: 2032, label: "Nhâm Tý", elements: ["Kim", "Thủy"] },
  { year: 2033, label: "Quý Sửu", elements: ["Thủy", "Thổ"] },
];
const ALLOWED_YEAR_LABELS = YEARS_26_33.map((x) => x.label);
const ALLOWED_YEAR_DIGITS = new Set(YEARS_26_33.map((x) => x.year));

/* ────────────────── language guess ────────────────── */
const guessLang = (messages = []) => {
  const t = rm(messages.map((m) => m.content || "").join(" "));
  const vi = /(bat tu|tu tru|ngay|thang|nam|gio|giap|at|binh|dinh|mau|ky|canh|tan|nham|quy|ty|suu|dan|mao|thin|ty|ngo|mui|than|dau|tuat|hoi)/i.test(
    t
  );
  return vi ? "vi" : "en";
};

/* ───────────── normalize can-chi & parse English input ───────────── */
const normalizeCanChi = (s) => {
  if (!s || typeof s !== "string") return null;
  const [c1, c2] = s.trim().split(/\s+/);
  if (!c1 || !c2) return null;

  const viCan = Object.keys(heavenlyStemsMap.vi).find(
    (k) => rm(k).toLowerCase() === rm(c1).toLowerCase()
  );
  const viChi = Object.keys(earthlyBranchesMap.vi).find(
    (k) => rm(k).toLowerCase() === rm(c2).toLowerCase()
  );
  if (viCan && viChi) return `${viCan} ${viChi}`;

  const enCan = heavenlyStemsMap.en[c1];
  const enChi = earthlyBranchesMap.en[c2];
  if (enCan && enChi) return `${enCan} ${enChi}`;

  return null;
};

const parseEnglishTuTru = (input) => {
  if (!input) return null;
  // e.g. "Jia Zi day, Yi You month, Gui Hai hour, Yi Si year"
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

/* ────────────────── Ngũ Hành & Thần Sát (rút gọn) ────────────────── */
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

  const tokens = [tuTru.nam, tuTru.thang, tuTru.ngay, tuTru.gio]
    .join(" ")
    .trim()
    .split(/\s+/);
  const branches = [
    tuTru.nam?.split(" ")[1],
    tuTru.thang?.split(" ")[1],
    tuTru.ngay?.split(" ")[1],
    tuTru.gio?.split(" ")[1],
  ].filter(Boolean);

  if (tokens.length < 8) throw new Error("Tứ Trụ không đầy đủ");

  for (const tk of tokens) {
    if (canNguHanh[tk]) count[canNguHanh[tk]] += 1;
    if (chiNguHanh[tk]) count[chiNguHanh[tk]] += 1;
  }
  for (const chi of branches) {
    (hidden[chi] || []).forEach((h) => {
      if (canNguHanh[h]) count[canNguHanh[h]] += 0.3;
    });
  }
  const total = Object.values(count).reduce((a, b) => a + b, 0);
  if (!total) throw new Error("Ngũ Hành rỗng");
  return count;
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
    return {
      "Thiên Ất Quý Nhân": [],
      "Văn Xương": [],
      "Đào Hoa": [],
      "Dịch Mã": [],
    };

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

  return {
    "Thiên Ất Quý Nhân": thienAtQuyNhan[nhatChu]?.filter((c) =>
      branches.includes(c)
    ) || [],
    "Văn Xương": vanXuong[nhatChu]?.filter((c) => branches.includes(c)) || [],
    "Đào Hoa": branches.includes(daoHoa[ngayChi]) ? [daoHoa[ngayChi]] : [],
    "Dịch Mã": branches.includes(dichMa[ngayChi]) ? [dichMa[ngayChi]] : [],
  };
};

/* ────────────────── intents ────────────────── */
const classify = (txt) => {
  const t = rm((txt || "").toLowerCase());
  const hasChoice = /(?:\b| )(?:hay|or)\b/i.test(txt || "");
  const intents = {
    general: /(hay xem bat tu|xem bat tu|tong quan|bat tu)/i.test(t),
    money:
      /(tai van|tai chinh|tien bac|thu nhap|giau|tiet kiem|dau tu|wealth|finance|bat dong san|real estate)/i.test(
        t
      ),
    career: /(nghe nghiep|su nghiep|cong viec|job|career|chuyen nganh)/i.test(t),
    love: /(tinh cam|hon nhan|nguoi yeu|ket hon|love|romance|dao hoa)/i.test(t),
    health: /(suc khoe|benh|sleep|an uong|stress|tam ly|mental)/i.test(t),
    family: /(gia dao|gia dinh|cha me|vo chong|con chau|anh em)/i.test(t),
    children: /(con cai|nuoi day|tre em|con trai|con gai)/i.test(t),
    color: /(mau|ao|mac|phong cach|style|fashion)/i.test(t),
    timeLuck:
      /(may man|thoi diem|gio tot|ngay may|thang nao tot|nam nao tot|nam nao may man|nhung nam tot)/i.test(
        t
      ),
  };
  if (!Object.values(intents).some((v) => v)) intents.general = true;
  return { ...intents, hasChoice };
};

/* ────────────────── percentify & skeleton ────────────────── */
const percentify = (obj) => {
  const total = Object.values(obj).reduce((a, b) => a + b, 0) || 1;
  const out = {};
  VN_ELEMS.forEach(
    (k) => (out[k] = `${(((obj[k] || 0) / total) * 100).toFixed(2)}%`)
  );
  return out;
};

const skeletonGeneral = ({
  tuTru,
  nguHanhPct,
  nhatChu,
  nhatHanh,
  dungThan,
  thanSat,
}) => {
  const starsActive = Object.entries(thanSat || {})
    .filter(([_, v]) => v.length)
    .map(([k, v]) => `${k}: ${v.join(", ")}`)
    .join(" · ");
  return [
    `Tứ Trụ: Giờ ${tuTru.gio} – Ngày ${tuTru.ngay} – Tháng ${tuTru.thang} – Năm ${tuTru.nam}.`,
    `Nhật Chủ ${nhatChu} (${nhatHanh}).`,
    `Ngũ Hành: ${VN_ELEMS.map((k) => `${k} ${nguHanhPct[k]}`).join(", ")}.`,
    `Dụng Thần: ${dungThan.length ? dungThan.join(", ") : "—"}.`,
    starsActive ? `Thần Sát: ${starsActive}.` : `Thần Sát: —.`,
  ].join("\n");
};

/* ────────────────── Element guide (nhắc GPT) ────────────────── */
const ELEMENT_GUIDE_VI = `
Chuẩn hoá ngũ hành:
- Thiên Can → hành: Giáp, Ất = Mộc; Bính, Đinh = Hỏa; Mậu, Kỷ = Thổ; Canh, Tân = Kim; Nhâm, Quý = Thủy.
- Địa Chi → hành: Tý, Hợi = Thủy; Sửu, Thìn, Mùi, Tuất = Thổ; Dần, Mão = Mộc; Tỵ, Ngọ = Hỏa; Thân, Dậu = Kim.
Khi nhắc tới “tuổi/chi Tý, Sửu, …” hoặc “hành của Tý/Ngọ/…”, PHẢI dùng bảng trên, tuyệt đối không suy diễn khác.
Với câu hỏi A/B (ví dụ: “tuổi Tý hay tuổi Ngọ?”), so sánh theo Dụng Thần:
- Ưu tiên chi có hành trùng Dụng Thần;
- Nếu cả hai không trùng, chọn chi giúp cân bằng % Ngũ Hành (giảm hành đang vượng, bồi hành đang yếu);
- Giải thích ngắn gọn, đúng hành của từng chi.
`;

/* ────────────────── OpenAI call ────────────────── */
const callOpenAI = async (payload, retries = 2, delay = 1200) => {
  if (!process.env.OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
  for (let i = 1; i <= retries; i++) {
    try {
      const r = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        payload,
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 45000,
        }
      );
      return r.data;
    } catch (e) {
      if (i === retries) throw e;
      await new Promise((r) => setTimeout(r, delay * i));
    }
  }
};

/* ────────────────── Post-process: fix hành & chặn năm ────────────────── */
const expectedElement = (name) => canNguHanh[name] || chiNguHanh[name] || null;

const fixElementMistakes = (text) => {
  if (!text) return text;

  const STEMS = Object.keys(canNguHanh);
  const BRANCHES = Object.keys(chiNguHanh);
  const NAMES = [...STEMS, ...BRANCHES].join("|");
  const ELEMS = "(Mộc|Hỏa|Thổ|Kim|Thủy)";

  // “Tên (Hành)”
  const reParen = new RegExp(`\\b(${NAMES})\\s*\\(\\s*${ELEMS}\\s*\\)`, "g");
  text = text.replace(reParen, (_m, name, elem) => {
    const want = expectedElement(cap(name));
    if (!want || want === elem) return `${name} (${elem})`;
    return `${name} (${want})`;
  });

  // “Tên hành Hành”
  const reHanh = new RegExp(`\\b(${NAMES})\\s*hành\\s*${ELEMS}`, "gi");
  text = text.replace(reHanh, (_m, name, elem) => {
    const want = expectedElement(cap(name));
    if (!want || want.toLowerCase() === elem.toLowerCase())
      return `${name} hành ${elem}`;
    return `${name} hành ${want}`;
  });

  return text;
};

const sanitizeYears = (text, dungThan) => {
  if (!text) return text;

  // 1) Loại các can-chi không nằm trong whitelist 2026–2033
  const rePair =
    /\b(Giáp|Ất|Bính|Đinh|Mậu|Kỷ|Canh|Tân|Nhâm|Quý)\s+(Tý|Sửu|Dần|Mão|Thìn|Tỵ|Ngọ|Mùi|Thân|Dậu|Tuất|Hợi)\b/g;
  text = text.replace(rePair, (m) =>
    ALLOWED_YEAR_LABELS.includes(m) ? m : ""
  );

  // 2) Loại các năm số không thuộc 2026–2033
  text = text.replace(/\b(20\d{2})\b/g, (m) =>
    ALLOWED_YEAR_DIGITS.has(Number(m)) ? m : ""
  );

  // 3) Nếu text không còn năm nào mà câu hỏi có “năm nào”, gợi ý theo Dụng Thần
  const hasAnyAllowed =
    ALLOWED_YEAR_LABELS.some((label) => text.includes(label)) ||
    YEARS_26_33.some((y) => text.includes(String(y.year)));
  const needYears = /năm|nam nao|year/i.test(text);

  if (!hasAnyAllowed && needYears) {
    const prefer = Array.isArray(dungThan) ? dungThan : [];
    const ranked = YEARS_26_33.map((y) => ({
      ...y,
      score: y.elements.reduce(
        (s, e) => s + (prefer.includes(e) ? 2 : prefer.length ? 0 : 1),
        0
      ),
    }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((y) => `${y.year} ${y.label} (${y.elements.join(" & ")})`)
      .join("; ");
    text += `\n\nGợi ý năm thuận lợi (chỉ trong 2026–2033): ${ranked}.`;
  }

  return text;
};

const postProcess = (text, { hasChoice, yearPair, dungThan }) => {
  let out = (text || "").trim();

  // bỏ lời mời A/B nếu người dùng không hỏi
  if (!hasChoice) {
    const bad =
      /(A\/B|lựa chọn|chon [ab]\b|tuoi\s+(ty|suu|dan|mao|thin|ty|ngo|mui|than|dau|tuat|hoi))/i;
    out = out
      .split("\n")
      .filter((l) => !bad.test(rm(l)))
      .join("\n")
      .trim();
  }

  // chỉ giữ “Tuổi <can-chi>” nếu đúng NĂM sinh
  const reAge =
    /^\s*Tuổi\s+(Giáp|Ất|Bính|Đinh|Mậu|Kỷ|Canh|Tân|Nhâm|Quý)\s+(Tý|Sửu|Dần|Mão|Thìn|Tỵ|Ngọ|Mùi|Thân|Dậu|Tuất|Hợi)/i;
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

  // sửa sai hành
  out = fixElementMistakes(out);

  // chặn năm bịa, chỉ cho 2026–2033
  out = sanitizeYears(out, dungThan);

  return out;
};

/* ────────────────── main route ────────────────── */
app.post("/api/luan-giai-bazi", async (req, res) => {
  const started = Date.now();
  try {
    const { messages, tuTruInfo, dungThan } = req.body;
    if (!Array.isArray(messages) || !messages.length)
      return res.status(400).json({ error: "Missing messages" });
    if (!tuTruInfo) return res.status(400).json({ error: "Missing tuTruInfo" });

    const lang = guessLang(messages);
    const lastUser =
      [...messages].reverse().find((m) => m.role === "user")?.content || "";
    const intents = classify(lastUser);

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
      tuTru = parseEnglishTuTru(lastUser);
      if (!tuTru)
        return res
          .status(400)
          .json({ error: lang === "vi" ? "Tứ Trụ không hợp lệ" : "Invalid Four Pillars" });
    }

    const nhatChu = tuTru.ngay.split(" ")[0];
    const nhatHanh = canNguHanh[nhatChu];
    const dungThanHanh = Array.isArray(dungThan)
      ? dungThan
      : dungThan?.hanh || [];
    if (!dungThanHanh.every((d) => VN_ELEMS.includes(d))) {
      return res
        .status(400)
        .json({
          error: lang === "vi" ? "Dụng Thần không hợp lệ" : "Invalid Useful God",
        });
    }

    // phân tích
    const nguHanh = analyzeNguHanh(tuTru);
    const nguHanhPct = percentify(nguHanh);
    const thanSat = tinhThanSat(tuTru);

    // khung luôn có Bát Tự
    const core = skeletonGeneral({
      tuTru,
      nguHanhPct,
      nhatChu,
      nhatHanh,
      dungThan: dungThanHanh,
      thanSat,
    });

    // hướng dẫn theo intent
    const sections = [];
    if (intents.general)
      sections.push(
        lang === "vi"
          ? "Tổng quan: khí chất Nhật Chủ, thế cân bằng Ngũ Hành, vì sao cần bồi dưỡng Dụng Thần; gợi ý 2–3 bước hành động."
          : "Overview: Day Master temperament, element balance, why to nourish Useful God; offer 2–3 concrete next steps."
      );
    if (intents.money)
      sections.push(
        lang === "vi"
          ? "Tài vận: gắn Dụng Thần vào cách kiếm/giữ tiền; tận dụng bạn bè có ngày sinh hoặc tuổi Quý Nhân nếu có; không nói chung chung."
          : "Wealth: tie Useful God to ways of earning/saving;leverage friends whose birth date or zodiac aligns with Nobleman if available; avoid being vague."
      );
    if (intents.career)
      sections.push(
        llang === "vi"
      ? "Sự nghiệp: gợi ý ngành/kiểu làm việc hợp Dụng Thần; tận dụng bạn bè hoặc đối tác có ngày sinh hoặc tuổi Quý Nhân; tránh lan man."
      : "Career: suggest industries/work styles aligned with Useful God; leverage friends or partners whose birth date or zodiac matches Nobleman; avoid digression."
  );
if (intents.love)
  sections.push(
    lang === "vi"
      ? "Tình cảm: dùng Đào Hoa/Quý Nhân (nếu có) + Dụng Thần để gợi ý phong cách giao tiếp/hẹn hò; Các năm phạm sao Đào Hoa sẽ dễ có được tình yêu hoặc tình yêu thăng hoa theo nhiều cách khác nhau"
      : "Love: use Peach Blossom/Nobleman (if present) + Useful God for communication/dating style; years with Peach Blossom influence bring love opportunities or relationship growth."
  );
if (intents.health)
  sections.push(
    lang === "vi"
      ? "Sức khỏe: liên hệ hành yếu/vượng tới ngủ/thở/vận động; 1 thói quen 10–15 phút. Nếu có quá nhiều ngũ hành nào đó hoặc thiếu ngũ hành bất kỳ thì dễ bị bệnh liên quan. Ví dụ như ngũ hành kim là liên quan đến phổi, ngũ hành thủy là liên quan đến thận - tiết niệu, ngũ hành mộc là liên quan đến gan - chấn thương tay chân, ngũ hành hỏa là tim - thần - kinh - máu huyết, ngũ hành thổ là liên quan đến bao tử - tiêu hóa"
      : "Health: link weak/strong elements to sleep/breath/movement; suggest one 10–15 min habit. Excess or lack of any element may relate to illness: Metal→lungs, Water→kidneys/urinary, Wood→liver/limbs, Fire→heart/nerves/blood, Earth→stomach/digestion."
  );
if (intents.family)
  sections.push(
    lang === "vi"
      ? "Gia đạo: một hành động cụ thể để tăng hòa khí dựa trên Dụng Thần. Nếu có sự xung khắc giữa các địa chi thì gia đình hay bất hòa, nên tìm cách để hòa hợp vì gia đình là điều quan trọng nhất trong đời. Cẩn thận các năm hoặc đại vận xung trực tiếp với trụ tháng và trụ năm, ví dụ như Thìn xung với Tuất (hoặc ngược lại), Sửu xung với Mùi (hoặc ngược lại), Dần xung với Thân (hoặc ngược lại), Tỵ xung với Hợi (hoặc ngược lại), Tý xung với Ngọ (hoặc ngược lại), Mão xung với Dậu (hoặc ngược lại)."
      : "Family: one concrete action for harmony based on Useful God. Beware clashes between earthly branches that cause discord; major years or luck cycles directly clashing with year/month pillars (e.g., Dragon vs Dog, Ox vs Goat, Tiger vs Monkey, Snake vs Pig, Rat vs Horse, Rabbit vs Rooster) often trigger conflicts."
  );
if (intents.children)
  sections.push(
    lang === "vi"
      ? "Con cái: định hướng học tập/nuôi dạy khớp Dụng Thần."
      : "Children: guide study/parenting in line with Useful God."
  );
if (intents.color)
  sections.push(
    lang === "vi"
      ? "Màu sắc/phong cách: chỉ trả lời khi được hỏi; quy palette theo Dụng Thần."
      : "Color/style: answer only when asked; map palette to Useful God."
      );
    if (intents.timeLuck)
      sections.push(
        lang === "vi"
          ? `Thời điểm may mắn: Các thời gian gần nhất trong khoảng từ năm 2026–2033 sau:
${YEARS_26_33.map(
  (y) => `- ${y.year} ${y.label} (${y.elements.join(" & ")})`
).join("\n")}
Tuyệt đối không nêu tổ hợp can-chi khác. Ưu tiên năm có hành trùng Dụng Thần, hoặc giúp cân bằng % Ngũ Hành.`
          : `Lucky years: ONLY choose among 2026–2033:
${YEARS_26_33.map(
  (y) => `- ${y.year} ${y.label} (${y.elements.join(" & ")})`
).join("\n")}
Never invent other sexagenary pairs. Prefer years matching Useful God or balancing the chart.`
      );

    const system =
      lang === "vi"
        ? [
            "Bạn là trợ lý Bát Tự tinh tế. Văn phong nồng ấm, rõ ràng, có chiều sâu, không sáo rỗng.",
            "BẮT BUỘC: mở đầu bằng Tứ Trụ + Nhật Chủ (hành) + % Ngũ Hành + Dụng Thần + Thần Sát (nếu có).",
            "Chỉ dùng từ 'Tuổi ...' khi nhắc NĂM sinh; không dùng 'Tuổi ...' cho giờ/ngày/tháng.",
            "Luôn gắn khuyến nghị với Dụng Thần; nhắc Thần Sát chỉ khi đang kích.",
            "Không bịa mốc năm; màu sắc chỉ nhắc khi người dùng hỏi.",
            ELEMENT_GUIDE_VI,
          ].join("\n")
        : [
            "You are a warm, precise Bazi assistant.",
            "MUST start with Four Pillars + Day Master(element) + Five-elements % + Useful God + Active Stars.",
            "Do NOT say 'Age ...' for hour/day/month; only for YEAR.",
            "Always tie advice to Useful God; mention stars only if active.",
            "No made-up yearly predictions; discuss color only if asked.",
          ].join("\n");

    const sectionGuide =
      sections.length > 0
        ? (lang === "vi"
            ? `Trọng tâm cần trả lời:\n- ${sections.join("\n- ")}`
            : `Focus:\n- ${sections.join("\n- ")}`) : "";

    const context = [
      core,
      lang === "vi"
        ? "Nếu câu hỏi có lựa chọn A/B, hãy trả lời dạng so sánh ngắn, gắn với Dụng Thần."
        : "If the user asks A/B, compare briefly and tie to Useful God.",
      sectionGuide,
    ]
      .filter(Boolean)
      .join("\n\n");

    const payload = {
      model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
      temperature: 0.5,
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || "1200", 10),
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content:
            (lang === "vi" ? "Câu hỏi người dùng: " : "User question: ") +
            lastUser +
            "\n\n" +
            context,
        },
      ],
    };

    let answer;
    try {
      const gpt = await callOpenAI(payload);
      answer = gpt?.choices?.[0]?.message?.content?.trim();
    } catch (e) {
      // fallback ngắn gọn (vẫn có skeleton)
      answer = core + (lang === "vi"
        ? `\n\nGợi ý: ưu tiên hành ${dungThanHanh[0] || nhatHanh} trong lựa chọn hằng ngày.`
        : `\n\nTip: favour ${dungThanHanh[0] || nhatHanh} element in daily choices.`);
    }

    answer = postProcess(answer, {
      hasChoice: intents.hasChoice,
      yearPair: tuTru.nam,
      dungThan: dungThanHanh,
    });

    const cacheKey = `${JSON.stringify(tuTru)}|${rm(lastUser)}|${dungThanHanh.join(
      ","
    )}|${lang}`;
    cache.set(cacheKey, answer);

    return res.json({ answer, meta: { ms: Date.now() - started } });
  } catch (err) {
    try {
      fs.appendFileSync(
        "error.log",
        `${new Date().toISOString()} ${err.stack || err.message}\n`
      );
    } catch {}
    return res.status(500).json({ error: "Internal error" });
  }
});

/* ────────────────── error handler ────────────────── */
app.use((err, req, res, next) => {
  try {
    fs.appendFileSync(
      "error.log",
      `${new Date().toISOString()} - ${err.stack || err.message}\n`
    );
  } catch {}
  res.status(500).json({ error: "System error occurred" });
});

/* ────────────────── start ────────────────── */
const port = process.env.PORT || 10000;
const server = app.listen(port, () => console.log(`Server listening on ${port}`));
server.setTimeout(300000);


