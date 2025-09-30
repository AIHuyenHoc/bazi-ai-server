// server.js — Bát Tự API (guard 2026–2033, no-% text, “bổ sung Dụng Thần”, career = nghề CỤ THỂ)

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

/* ───────── middleware ───────── */
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

/* ───────── helpers & maps ───────── */
const rm = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const lc = (s) => rm(String(s || "")).toLowerCase();
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

const heavenlyStemsMap = {
  en: { Jia: "Giáp", Yi: "Ất", Bing: "Bính", Ding: "Đinh", Wu: "Mậu", Ji: "Kỷ", Geng: "Canh", Xin: "Tân", Ren: "Nhâm", Gui: "Quý" },
  vi: { Giáp: "Giáp", Ất: "Ất", Bính: "Bính", Đinh: "Đinh", Mậu: "Mậu", Kỷ: "Kỷ", Canh: "Canh", Tân: "Tân", Nhâm: "Nhâm", Quý: "Quý" },
};
const earthlyBranchesMap = {
  en: { Rat: "Tý", Ox: "Sửu", Tiger: "Dần", Rabbit: "Mão", Dragon: "Thìn", Snake: "Tỵ", Horse: "Ngọ", Goat: "Mùi", Monkey: "Thân", Rooster: "Dậu", Dog: "Tuất", Pig: "Hợi" },
  vi: { Tý: "Tý", Sửu: "Sửu", Dần: "Dần", Mão: "Mão", Thìn: "Thìn", Tỵ: "Tỵ", Ngọ: "Ngọ", Mùi: "Mùi", Thân: "Thân", Dậu: "Dậu", Tuất: "Tuất", Hợi: "Hợi" },
};
const enCanLower = Object.fromEntries(Object.entries(heavenlyStemsMap.en).map(([k, v]) => [k.toLowerCase(), v]));
const enChiLower = Object.fromEntries(Object.entries(earthlyBranchesMap.en).map(([k, v]) => [k.toLowerCase(), v]));

const canNguHanh = { Giáp: "Mộc", Ất: "Mộc", Bính: "Hỏa", Đinh: "Hỏa", Mậu: "Thổ", Kỷ: "Thổ", Canh: "Kim", Tân: "Kim", Nhâm: "Thủy", Quý: "Thủy" };
const chiNguHanh = { Tý: "Thủy", Hợi: "Thủy", Sửu: "Thổ", Thìn: "Thổ", Mùi: "Thổ", Tuất: "Thổ", Dần: "Mộc", Mão: "Mộc", Tỵ: "Hỏa", Ngọ: "Hỏa", Thân: "Kim", Dậu: "Kim" };

const VN_ELEMS = ["Mộc", "Hỏa", "Thổ", "Kim", "Thủy"];

/* ───────── năm hợp lệ 2026–2033 ───────── */
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

/* ───────── language guess ───────── */
const guessLang = (messages = []) => {
  const t = rm(messages.map((m) => m.content || "").join(" "));
  return /(bat tu|tu tru|ngay|thang|nam|gio|giap|at|binh|dinh|mau|ky|canh|tan|nham|quy|ty|suu|dan|mao|thin|ty|ngo|mui|than|dau|tuat|hoi)/i.test(t) ? "vi" : "en";
};

/* ───────── normalize & parsing ───────── */
const normalizeCanChi = (s) => {
  if (!s || typeof s !== "string") return null;
  const [c1r, c2r] = s.trim().split(/\s+/);
  if (!c1r || !c2r) return null;
  const c1 = lc(c1r), c2 = lc(c2r);

  const viCan = Object.keys(heavenlyStemsMap.vi).find((k) => lc(k) === c1);
  const viChi = Object.keys(earthlyBranchesMap.vi).find((k) => lc(k) === c2);
  if (viCan && viChi) return `${viCan} ${viChi}`;

  const enCan = enCanLower[c1], enChi = enChiLower[c2];
  if (enCan && enChi) return `${enCan} ${enChi}`;
  return null;
};

const parseEnglishTuTru = (input) => {
  if (!input) return null;
  const re = /([A-Za-z]+)\s+([A-Za-z]+)\s*(hour|day|month|year)/gi;
  const out = {};
  for (const m of input.matchAll(re)) {
    const stem = heavenlyStemsMap.en[cap(m[1].toLowerCase())] || enCanLower[m[1].toLowerCase()] || m[1];
    const br = earthlyBranchesMap.en[cap(m[2].toLowerCase())] || enChiLower[m[2].toLowerCase()] || m[2];
    const pair = `${stem} ${br}`;
    const slot = m[3].toLowerCase();
    if (slot === "hour") out.gio = pair;
    if (slot === "day") out.ngay = pair;
    if (slot === "month") out.thang = pair;
    if (slot === "year") out.nam = pair;
  }
  return out.gio && out.ngay && out.thang && out.nam ? out : null;
};

/* ───────── phân tích ───────── */
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

  const tokens = [tuTru.nam, tuTru.thang, tuTru.ngay, tuTru.gio].join(" ").trim().split(/\s+/);
  const branches = [tuTru.nam?.split(" ")[1], tuTru.thang?.split(" ")[1], tuTru.ngay?.split(" ")[1], tuTru.gio?.split(" ")[1]].filter(Boolean);

  if (tokens.length < 8) throw new Error("Tứ Trụ không đầy đủ");

  for (const tk of tokens) {
    if (canNguHanh[tk]) count[canNguHanh[tk]] += 1;
    if (chiNguHanh[tk]) count[chiNguHanh[tk]] += 1;
  }
  for (const chi of branches) (hidden[chi] || []).forEach((h) => { if (canNguHanh[h]) count[canNguHanh[h]] += 0.3; });

  if (!Object.values(count).reduce((a, b) => a + b, 0)) throw new Error("Ngũ Hành rỗng");
  return count;
};

const rankElements = (count) => Object.entries(count).map(([hanh, value]) => ({ hanh, value })).sort((a, b) => b.value - a.value);

const tinhThanSat = (tuTru) => {
  const nhatChu = tuTru.ngay?.split(" ")[0];
  const ngayChi = tuTru.ngay?.split(" ")[1];
  const branches = [tuTru.nam?.split(" ")[1], tuTru.thang?.split(" ")[1], tuTru.ngay?.split(" ")[1], tuTru.gio?.split(" ")[1]].filter(Boolean);
  if (!nhatChu || !ngayChi || !branches.length)
    return { "Thiên Ất Quý Nhân": [], "Văn Xương": [], "Đào Hoa": [], "Dịch Mã": [] };

  const thienAtQuyNhan = { Giáp: ["Sửu", "Mùi"], Mậu: ["Sửu", "Mùi"], Canh: ["Sửu", "Mùi"], Ất: ["Thân", "Tý"], Kỷ: ["Thân", "Tý"], Bính: ["Dậu", "Hợi"], Đinh: ["Dậu", "Hợi"], Tân: ["Dần", "Ngọ"], Nhâm: ["Tỵ", "Mão"], Quý: ["Tỵ", "Mão"] };
  const vanXuong = { Giáp: ["Tỵ"], Ất: ["Ngọ"], Bính: ["Thân"], Đinh: ["Dậu"], Mậu: ["Thân"], Kỷ: ["Dậu"], Canh: ["Hợi"], Tân: ["Tý"], Nhâm: ["Dần"], Quý: ["Mão"] };
  const daoHoa = { Thân: "Dậu", Tý: "Dậu", Thìn: "Dậu", Tỵ: "Ngọ", Dậu: "Ngọ", Sửu: "Ngọ", Dần: "Mão", Ngọ: "Mão", Tuất: "Mão", Hợi: "Tý", Mão: "Tý", Mùi: "Tý" };
  const dichMa = { Thân: "Dần", Tý: "Dần", Thìn: "Dần", Tỵ: "Hợi", Dậu: "Hợi", Sửu: "Hợi", Dần: "Thân", Ngọ: "Thân", Tuất: "Thân", Hợi: "Tỵ", Mão: "Tỵ", Mùi: "Tỵ" };

  return {
    "Thiên Ất Quý Nhân": thienAtQuyNhan[nhatChu]?.filter((c) => branches.includes(c)) || [],
    "Văn Xương": vanXuong[nhatChu]?.filter((c) => branches.includes(c)) || [],
    "Đào Hoa": branches.includes(daoHoa[ngayChi]) ? [daoHoa[ngayChi]] : [],
    "Dịch Mã": branches.includes(dichMa[ngayChi]) ? [dichMa[ngayChi]] : [],
  };
};

/* ───────── intents ───────── */
const classify = (txt) => {
  const t = rm((txt || "").toLowerCase());
  const hasChoice = /(?:\b| )(?:hay|or)\b/i.test(txt || "");
  const intents = {
    general: /(hay xem bat tu|xem bat tu|tong quan|bat tu)/i.test(t),
    money: /(tai van|tai chinh|tien bac|thu nhap|giau|tiet kiem|dau tu|wealth|finance|bat dong san|real estate)/i.test(t),
    career: /(nghe nghiep|su nghiep|cong viec|job|career|chuyen nganh|vi tri|nganh)/i.test(t),
    love: /(tinh cam|hon nhan|nguoi yeu|ket hon|love|romance|dao hoa)/i.test(t),
    health: /(suc khoe|benh|sleep|an uong|stress|tam ly|mental)/i.test(t),
    family: /(gia dao|gia dinh|cha me|vo chong|con chau|anh em)/i.test(t),
    children: /(con cai|nuoi day|tre em|con trai|con gai)/i.test(t),
    color: /(mau|ao|mac|phong cach|style|fashion)/i.test(t),
    timeLuck: /(may man|thoi diem|gio tot|ngay may|thang nao tot|nam nao tot|nam nao may man|nhung nam tot|year)/i.test(t),
  };
  if (!Object.values(intents).some((v) => v)) intents.general = true;
  return { ...intents, hasChoice };
};

/* ───────── percentify (FE only) & skeleton ───────── */
const percentify = (obj) => {
  const total = Object.values(obj).reduce((a, b) => a + b, 0) || 1;
  const out = {};
  ["Mộc", "Hỏa", "Thổ", "Kim", "Thủy"].forEach((k) => (out[k] = `${(((obj[k] || 0) / total) * 100).toFixed(2)}%`));
  return out;
};

const skeletonGeneral = ({ tuTru, nhatChu, nhatHanh, dungThan, thanSat }) => {
  const starsActive = Object.entries(thanSat || {}).filter(([_, v]) => v.length).map(([k, v]) => `${k}: ${v.join(", ")}`).join(" · ");
  return [
    `Tứ Trụ: Giờ ${tuTru.gio} – Ngày ${tuTru.ngay} – Tháng ${tuTru.thang} – Năm ${tuTru.nam}.`,
    `Nhật Chủ ${nhatChu} (${nhatHanh}).`,
    `Dụng Thần: ${dungThan.length ? dungThan.join(", ") : "—"}.`,
    starsActive ? `Thần Sát: ${starsActive}.` : `Thần Sát: —.`,
  ].join("\n");
};

/* ───────── Thực hành “bổ sung Dụng Thần” & ngành nghề gợi ý ───────── */
const PRACTICAL_GUIDE_VI = `
Gợi ý bổ sung Dụng Thần (thực hành, không dùng “bồi hành”):
- Mộc: không gian xanh/ánh sáng tự nhiên; trồng/cắt tỉa cây; viết–đọc–học; vận động linh hoạt; vật liệu gỗ/giấy; hướng Đông/Đông Nam.
- Hỏa: ánh sáng/nhiệt vừa đủ; nói–thuyết trình; cardio; bếp/điện/media; nhịp ngủ–thức đều; hướng Nam.
- Thổ: giờ giấc ổn định; kế hoạch/sổ sách; gốm–đất–làm bánh; thực dưỡng cân bằng; hướng Trung tâm/Tây Nam/Đông Bắc.
- Kim: tối giản–kỷ luật; hít thở/phổi; làm với kim loại–công cụ–dữ liệu; luật/quy chuẩn; hướng Tây/Tây Bắc.
- Thủy: thiền thở–ngủ đủ; gần nước–di chuyển; nghiên cứu/suy tư; giao tiếp xa/logistics; hướng Bắc; lịch uống nước.
`;

const JOB_GUIDE_VI = `
Gợi ý NGÀNH/NGHỀ theo Dụng Thần (để lựa chọn nhanh):
- Mộc: giáo dục–đào tạo, ngôn ngữ–biên/phiên dịch, y học cổ truyền–vật lý trị liệu, thiết kế–sáng tạo nội dung, nông–lâm.
- Hỏa: năng lượng–điện–điện tử, ẩm thực–bếp–F&B, truyền thông–quảng cáo–MC, sự kiện–giải trí, bán hàng–thuyết trình.
- Thổ: xây dựng–kiến trúc–QS, vận hành–PMO–QA quy trình, nông sản–thực phẩm–chuỗi cung ứng, địa ốc–quy hoạch, hành chính–kế hoạch.
- Kim: luật–tuân thủ–kiểm toán, tài chính–ngân hàng–chứng khoán, phân tích dữ liệu–BI, cơ khí–chế tạo–QA kỹ thuật, an ninh–bảo hộ–tiêu chuẩn.
- Thủy: logistics–vận tải–hàng hải, du lịch–hàng không, CNTT–hạ tầng mạng–SaaS/Cloud, chăm sóc khách hàng–CS, thương mại–xuất nhập khẩu.
KHI HỎI “NÊN CHỌN CÔNG VIỆC GÌ”: hãy liệt kê 3–5 ngành/nghề CỤ THỂ phù hợp với các hành trong Dụng Thần, mỗi ngành 1–2 câu “vì sao hợp”.
`;

/* ───────── OpenAI & post-process ───────── */
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

const expectedElement = (name) => canNguHanh[name] || chiNguHanh[name] || null;

const fixElementMistakes = (text) => {
  if (!text) return text;
  const NAMES = [...Object.keys(canNguHanh), ...Object.keys(chiNguHanh)].join("|");
  const ELEMS = "(Mộc|Hỏa|Thổ|Kim|Thủy)";
  const reParen = new RegExp(`\\b(${NAMES})\\s*\\(\\s*${ELEMS}\\s*\\)`, "g");
  text = text.replace(reParen, (_m, name, elem) => {
    const want = expectedElement(cap(name));
    if (!want || want === elem) return `${name} (${elem})`;
    return `${name} (${want})`;
  });
  const reHanh = new RegExp(`\\b(${NAMES})\\s*hành\\s*${ELEMS}`, "gi");
  text = text.replace(reHanh, (_m, name, elem) => {
    const want = expectedElement(cap(name));
    if (!want || want.toLowerCase() === elem.toLowerCase()) return `${name} hành ${elem}`;
    return `${name} hành ${want}`;
  });
  return text;
};

// chỉ lọc năm “năm/nam/year …”, không đụng dòng Tứ Trụ
const sanitizeYears = (text, dungThan) => {
  if (!text) return text;
  const lines = text.split("\n");
  const head = lines[0] || "";
  let rest = lines.slice(1).join("\n");
  const CAN = "(Giáp|Ất|Bính|Đinh|Mậu|Kỷ|Canh|Tân|Nhâm|Quý)";
  const CHI = "(Tý|Sửu|Dần|Mão|Thìn|Tỵ|Ngọ|Mùi|Thân|Dậu|Tuất|Hợi)";
  const reYearPairCtx = new RegExp(`\\b(?:năm|nam|year)\\s+${CAN}\\s+${CHI}\\b`, "gi");
  rest = rest.replace(reYearPairCtx, (m) => {
    const pair = m.replace(/^(?:năm|nam|year)\s+/i, "");
    return ALLOWED_YEAR_LABELS.includes(pair) ? m : "";
  });
  rest = rest.replace(/\b(20\d{2})\b/g, (m, _y, offset, s) => {
    const before = s.slice(Math.max(0, offset - 8), offset);
    if (!/(năm|nam|year)\s*$/i.test(before)) return m;
    return ALLOWED_YEAR_DIGITS.has(Number(m)) ? m : "";
  });

  const hasAnyAllowed = ALLOWED_YEAR_LABELS.some((label) => rest.includes(label)) || YEARS_26_33.some((y) => rest.includes(String(y.year)));
  const needYears = /(năm|nam|year)/i.test(rest);
  if (!hasAnyAllowed && needYears) {
    const prefer = Array.isArray(dungThan) ? dungThan : [];
    const ranked = YEARS_26_33.map((y) => ({
      ...y,
      score: y.elements.reduce((s, e) => s + (prefer.includes(e) ? 2 : prefer.length ? 0 : 1), 0),
    }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((y) => `${y.year} ${y.label} (${y.elements.join(" & ")})`)
      .join("; ");
    rest += `\n\nGợi ý năm thuận lợi (chỉ trong 2026–2033): ${ranked}.`;
  }

  return [head, rest].filter(Boolean).join("\n");
};

const postProcess = (text, { hasChoice, yearPair, dungThan }) => {
  let out = (text || "").trim();

  if (!hasChoice) {
    const bad = /(A\/B|lựa chọn|chon [ab]\b|tuoi\s+(ty|suu|dan|mao|thin|ty|ngo|mui|than|dau|tuat|hoi))/i;
    out = out.split("\n").filter((l) => !bad.test(rm(l))).join("\n").trim();
  }
  const reAge = /^\s*Tuổi\s+(Giáp|Ất|Bính|Đinh|Mậu|Kỷ|Canh|Tân|Nhâm|Quý)\s+(Tý|Sửu|Dần|Mão|Thìn|Tỵ|Ngọ|Mùi|Thân|Dậu|Tuất|Hợi)/i;
  out = out.split("\n").filter((line) => {
    const m = line.match(reAge);
    if (!m) return true;
    const pair = `${cap(m[1])} ${cap(m[2])}`;
    return pair === yearPair;
  }).join("\n").trim();

  out = fixElementMistakes(out);
  out = sanitizeYears(out, dungThan);

  // Loại bỏ mọi cụm “bồi/nuôi dưỡng hành …” → chỉ giữ “bổ sung Dụng Thần”
  out = out.replace(/\b(bồi|nuôi dưỡng|tăng cường)\s+hành\s+(Mộc|Hỏa|Thổ|Kim|Thủy)\b/gi, "bổ sung Dụng Thần");

  return out;
};

/* ───────── main route ───────── */
app.post("/api/luan-giai-bazi", async (req, res) => {
  const started = Date.now();
  try {
    const { messages, tuTruInfo, dungThan } = req.body;
    if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: "Missing messages" });
    if (!tuTruInfo) return res.status(400).json({ error: "Missing tuTruInfo" });

    const lang = guessLang(messages);
    const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content || "";
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
      if (!tuTru.gio || !tuTru.ngay || !tuTru.thang || !tuTru.nam) throw new Error("invalid");
    } catch {
      tuTru = parseEnglishTuTru(lastUser);
      if (!tuTru) return res.status(400).json({ error: lang === "vi" ? "Tứ Trụ không hợp lệ" : "Invalid Four Pillars" });
    }

    const nhatChu = tuTru.ngay.split(" ")[0];
    const nhatHanh = canNguHanh[nhatChu];

    // Dụng Thần
    const dungThanHanh = Array.isArray(dungThan) ? dungThan : (dungThan && Array.isArray(dungThan.hanh) ? dungThan.hanh : []);
    if (!dungThanHanh.length && nhatHanh) dungThanHanh.push(nhatHanh);
    if (!dungThanHanh.every((d) => VN_ELEMS.includes(d))) {
      return res.status(400).json({ error: lang === "vi" ? "Dụng Thần không hợp lệ" : "Invalid Useful God" });
    }

    // phân tích
    const nguHanh = analyzeNguHanh(tuTru);
    const nguHanhPct = percentify(nguHanh); // FE
    const ranking = rankElements(nguHanh);
    const strongest = ranking[0]?.hanh;
    const weakest = ranking[ranking.length - 1]?.hanh;
    const thanSat = tinhThanSat(tuTru);

    // core skeleton
    const core = skeletonGeneral({ tuTru, nhatChu, nhatHanh, dungThan: dungThanHanh, thanSat });

    // Hướng dẫn theo intent
    const sections = [];
    if (intents.general)
      sections.push(
        lang === "vi"
          ? "Tổng quan: vì sao cần BỔ SUNG DỤNG THẦN; đưa 2–3 bước thực hành cụ thể (thói quen/không gian/cộng tác)."
          : "Overview: why to SUPPLEMENT the Useful God; provide 2–3 practical steps (habits/space/partners)."
      );

    if (intents.money)
      sections.push(
        lang === "vi"
          ? "Tài vận: ứng dụng Dụng Thần vào nghề/ngành, đối tác, không gian làm việc, lịch làm."
          : "Wealth: apply Useful God to industry/partners/workspace/schedule."
      );

    // ✅ Career: BẮT BUỘC 3–5 nghề cụ thể
    if (intents.career)
      sections.push(
        lang === "vi"
          ? "Sự nghiệp: TRỰC TIẾP gợi ý 3–5 ngành/nghề CỤ THỂ khớp Dụng Thần (mỗi ngành 1–2 câu vì sao hợp). Tránh lời khuyên chung chung."
          : "Career: DIRECTLY suggest 3–5 SPECIFIC professions/industries matching the Useful God (1–2 lines each on why). Avoid generic tips."
      );

    if (intents.love)
      sections.push(
        lang === "vi"
          ? "Tình cảm: phong cách giao tiếp, hoạt động hẹn hò phù hợp Dụng Thần."
          : "Love: communication & dating activities aligned with Useful God."
      );
    if (intents.health)
      sections.push(lang === "vi" ? "Sức khỏe: 1 thói quen 10–15 phút/ngày phù hợp Dụng Thần." : "Health: one 10–15 min habit aligned with Useful God.");
    if (intents.family)
      sections.push(lang === "vi" ? "Gia đạo: 1 hành động cụ thể theo Dụng Thần để tăng hòa khí." : "Family: one concrete action per Useful God to increase harmony.");
    if (intents.children)
      sections.push(lang === "vi" ? "Con cái: định hướng học tập/hoạt động theo Dụng Thần." : "Children: study/activities per Useful God.");
    if (intents.color)
      sections.push(lang === "vi" ? "Màu sắc/phong cách: chỉ khi được hỏi; map theo Dụng Thần." : "Color/style: only if asked; map to Useful God.");
    if (intents.timeLuck)
      sections.push(
        lang === "vi"
          ? `Thời điểm may mắn: chỉ cân nhắc 2026–2033:
${YEARS_26_33.map((y) => `- ${y.year} ${y.label} (${y.elements.join(" & ")})`).join("\n")}
Ưu tiên năm hợp Dụng Thần.`
          : `Lucky years: ONLY 2026–2033:
${YEARS_26_33.map((y) => `- ${y.year} ${y.label} (${y.elements.join(" & ")})`).join("\n")}
Prefer Useful God matches.`
      );

    // System prompt — bắt buộc nghề CỤ THỂ khi hỏi career/job
    const system =
      lang === "vi"
        ? [
            "Bạn là trợ lý Bát Tự tinh tế. Văn phong nồng ấm, rõ ràng, thực dụng.",
            "MỞ ĐẦU: Tứ Trụ + Nhật Chủ (hành) + Dụng Thần + Thần Sát (nếu có).",
            "Chỉ dùng 'Tuổi ...' cho NĂM sinh.",
            "Tất cả khuyến nghị dùng cụm 'BỔ SUNG DỤNG THẦN' (không dùng 'bồi hành ...'). Việc làm cụ thể, áp dụng ngay.",
            "Khi người dùng hỏi 'nên chọn công việc gì' / 'career' / 'job': BẮT BUỘC liệt kê 3–5 ngành/nghề CỤ THỂ phù hợp Dụng Thần, mỗi ngành 1–2 câu vì sao hợp. Tuyệt đối không trả lời mơ hồ kiểu quản lý thời gian/sắp xếp công việc.",
            "Không bịa mốc năm; màu sắc chỉ khi được hỏi.",
            PRACTICAL_GUIDE_VI,
            JOB_GUIDE_VI,
          ].join("\n")
        : [
            "You are a warm, precise Bazi assistant.",
            "START WITH: Four Pillars + Day Master(element) + Useful God + Active Stars.",
            "Only say 'Age ...' for YEAR.",
            "All advice uses 'SUPPLEMENT THE USEFUL GOD' phrasing (no 'boost element ...'). Be practical and immediately actionable.",
            "When asked about career/jobs, you MUST list 3–5 SPECIFIC professions/industries aligned with the Useful God with 1–2 lines each on why. Avoid vague tips.",
            "No invented years; color only if asked.",
          ].join("\n");

    const sectionGuide = sections.length ? (lang === "vi" ? `Trọng tâm:\n- ${sections.join("\n- ")}` : `Focus:\n- ${sections.join("\n- ")}`) : "";

    // Đưa tên các hành Dụng Thần & job guide vào context
    const dtLine = lang === "vi" ? `Dụng Thần cần bổ sung: ${dungThanHanh.join(", ")}.` : `Useful God to supplement: ${dungThanHanh.join(", ")}.`;
    const jobGuideLine = lang === "vi"
      ? `Gợi ý ngành theo Dụng Thần trong hệ thống ở trên; ưu tiên các ngành khớp: ${dungThanHanh.join(", ")}.`
      : `Use the job guide above; prefer industries matching: ${dungThanHanh.join(", ")}.`;

    const context = [core, dtLine, jobGuideLine, sectionGuide].filter(Boolean).join("\n\n");

    const payload = {
      model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
      temperature: 0.5,
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || "1200", 10),
      messages: [
        { role: "system", content: system },
        { role: "user", content: (lang === "vi" ? "Câu hỏi người dùng: " : "User question: ") + lastUser + "\n\n" + context },
      ],
    };

    const cacheKey = `${JSON.stringify(tuTru)}|${lc(lastUser)}|${dungThanHanh.join(",")}|${lang}|advice=useful-god-career`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return res.json({
        answer: cached,
        meta: { ms: Date.now() - started, cached: true, nguHanh, nguHanhPct, strongest, weakest },
      });
    }

    let answer;
    try {
      const gpt = await callOpenAI(payload);
      answer = gpt?.choices?.[0]?.message?.content?.trim();
    } catch (e) {
      // fallback ngắn gọn, nhưng vẫn gợi ý nghề CỤ THỂ
      const sampleJobsVi = {
        Mộc: ["Giáo dục/đào tạo", "Thiết kế–nội dung", "YHCT/vật lý trị liệu"],
        Hỏa: ["Điện–điện tử", "Ẩm thực–bếp–F&B", "Truyền thông–sự kiện"],
        Thổ: ["Xây dựng/điều phối", "Vận hành/PMO", "BĐS–quy hoạch"],
        Kim: ["Luật/tuân thủ", "Tài chính–chứng khoán", "Phân tích dữ liệu/BI"],
        Thủy: ["Logistics/vận tải", "Du lịch–hàng không", "CNTT–Cloud/SaaS"],
      };
      const viJobs = dungThanHanh.flatMap((h) => sampleJobsVi[h] || []).slice(0, 5);
      answer =
        core +
        "\n\n" +
        (lang === "vi"
          ? `Gợi ý nghề cụ thể (theo Dụng Thần): ${viJobs.join(" · ")}.`
          : `Sample roles by Useful God: ${dungThanHanh.join(", ")}.`);

      try {
        fs.appendFileSync(
          "error.log",
          `${new Date().toISOString()} | /api/luan-giai-bazi | OpenAI error: ${e.stack || e.message}\n`
        );
      } catch {}
    }

    answer = postProcess(answer, { hasChoice: intents.hasChoice, yearPair: tuTru.nam, dungThan: dungThanHanh });

    cache.set(cacheKey, answer);
    return res.json({
      answer,
      meta: { ms: Date.now() - started, nguHanh, nguHanhPct, strongest, weakest },
    });
  } catch (err) {
    try {
      fs.appendFileSync(
        "error.log",
        `${new Date().toISOString()} | ${req.method} ${req.url} | ${err.stack || err.message}\n`
      );
    } catch {}
    return res.status(500).json({ error: "Internal error" });
  }
});

/* ───────── error handler & start ───────── */
app.use((err, req, res, next) => {
  try {
    fs.appendFileSync("error.log", `${new Date().toISOString()} - ${err.stack || err.message}\n`);
  } catch {}
  res.status(500).json({ error: "System error occurred" });
});

const port = process.env.PORT || 10000;
const server = app.listen(port, () => console.log(`Server listening on http://localhost:${port}`));
server.setTimeout(300000);
