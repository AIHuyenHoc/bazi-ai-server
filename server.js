// server.js (rev: focus Bát Tự + Dụng Thần + Thần Sát, GPT polish, choice-handling)
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

/* ====== security/mw ====== */
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

/* ====== helpers: text, maps ====== */
const rm = s => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;

const heavenlyStemsMap = {
  en: { Jia: "Giáp", Yi: "Ất", Bing: "Bính", Ding: "Đinh", Wu: "Mậu", Ji: "Kỷ", Geng: "Canh", Xin: "Tân", Ren: "Nhâm", Gui: "Quý" },
  vi: { Giáp: "Giáp", Ất: "Ất", Bính: "Bính", Đinh: "Đinh", Mậu: "Mậu", Kỷ: "Kỷ", Canh: "Canh", Tân: "Tân", Nhâm: "Nhâm", Quý: "Quý" }
};
const earthlyBranchesMap = {
  en: { Rat: "Tý", Ox: "Sửu", Tiger: "Dần", Rabbit: "Mão", Dragon: "Thìn", Snake: "Tỵ", Horse: "Ngọ", Goat: "Mùi", Monkey: "Thân", Rooster: "Dậu", Dog: "Tuất", Pig: "Hợi" },
  vi: { Tý: "Tý", Sửu: "Sửu", Dần: "Dần", Mão: "Mão", Thìn: "Thìn", Tỵ: "Tỵ", Ngọ: "Ngọ", Mùi: "Mùi", Thân: "Thân", Dậu: "Dậu", Tuất: "Tuất", Hợi: "Hợi" }
};
const canNguHanh = { Giáp:"Mộc", Ất:"Mộc", Bính:"Hỏa", Đinh:"Hỏa", Mậu:"Thổ", Kỷ:"Thổ", Canh:"Kim", Tân:"Kim", Nhâm:"Thủy", Quý:"Thủy" };
const chiNguHanh = { Tý:"Thủy", Hợi:"Thủy", Sửu:"Thổ", Thìn:"Thổ", Mùi:"Thổ", Tuất:"Thổ", Dần:"Mộc", Mão:"Mộc", Tỵ:"Hỏa", Ngọ:"Hỏa", Thân:"Kim", Dậu:"Kim" };
const VN_ELEMS = ["Mộc","Hỏa","Thổ","Kim","Thủy"];

/* ====== language guess ====== */
const guessLang = (messages=[]) => {
  const t = rm(messages.map(m=>m.content||"").join(" "));
  const vi = /(bat tu|tu tru|ngay|thang|nam|gio|giap|at|binh|dinh|mau|ky|canh|tan|nham|quy|ty|suu|dan|mao|thin|ty|ngo|mui|than|dau|tuat|hoi)/i.test(t);
  return vi ? "vi" : "en";
};

/* ====== normalize input can-chi ====== */
const normalizeCanChi = (s) => {
  if (!s || typeof s !== "string") return null;
  const [c1,c2] = s.trim().split(/\s+/);
  if (!c1 || !c2) return null;
  const viCan = Object.keys(heavenlyStemsMap.vi).find(k => rm(k).toLowerCase() === rm(c1).toLowerCase());
  const viChi = Object.keys(earthlyBranchesMap.vi).find(k => rm(k).toLowerCase() === rm(c2).toLowerCase());
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
    const stem = heavenlyStemsMap.en[m[1]] || m[1]; const br = earthlyBranchesMap.en[m[2]] || m[2];
    const pair = `${stem} ${br}`; const slot = m[3].toLowerCase();
    if (slot==="hour") out.gio = pair;
    if (slot==="day") out.ngay = pair;
    if (slot==="month") out.thang = pair;
    if (slot==="year") out.nam = pair;
  }
  return (out.gio && out.ngay && out.thang && out.nam) ? out : null;
};

/* ====== Ngu Hanh / Thap Than / Than Sat (rút gọn đủ dùng) ====== */
const analyzeNguHanh = (tuTru) => {
  const count = { Mộc:0, Hỏa:0, Thổ:0, Kim:0, Thủy:0 };
  const hidden = {
    Tý:["Quý"], Sửu:["Kỷ","Tân","Quý"], Dần:["Giáp","Bính","Mậu"], Mão:["Ất"],
    Thìn:["Mậu","Ất","Quý"], Tỵ:["Bính","Canh","Mậu"], Ngọ:["Đinh","Kỷ"],
    Mùi:["Kỷ","Đinh","Ất"], Thân:["Canh","Nhâm","Mậu"], Dậu:["Tân"],
    Tuất:["Mậu","Đinh","Tân"], Hợi:["Nhâm","Giáp"]
  };
  const pieces = [tuTru.nam, tuTru.thang, tuTru.ngay, tuTru.gio].join(" ").trim().split(/\s+/);
  const branches = [tuTru.nam?.split(" ")[1], tuTru.thang?.split(" ")[1], tuTru.ngay?.split(" ")[1], tuTru.gio?.split(" ")[1]].filter(Boolean);

  if (pieces.length < 8) throw new Error("Tứ Trụ không đầy đủ");

  for (const token of pieces) {
    if (canNguHanh[token]) count[canNguHanh[token]] += 1;
    if (chiNguHanh[token]) count[chiNguHanh[token]] += 1;
  }
  for (const chi of branches) (hidden[chi]||[]).forEach(h => { if (canNguHanh[h]) count[canNguHanh[h]] += 0.3; });
  const total = Object.values(count).reduce((a,b)=>a+b,0);
  if (!total) throw new Error("Ngũ Hành rỗng");
  return count;
};

const tinhThapThan = (nhatChu, tuTru) => {
  if (!nhatChu || !canNguHanh[nhatChu]) throw new Error("Nhật Chủ không hợp lệ");
  const map = {
    Kim: { Kim:["Tỷ Kiên","Kiếp Tài"], Thủy:["Thực Thần","Thương Quan"], Mộc:["Chính Tài","Thiên Tài"], Hỏa:["Chính Quan","Thất Sát"], Thổ:["Chính Ấn","Thiên Ấn"] },
    Mộc: { Mộc:["Tỷ Kiên","Kiếp Tài"], Hỏa:["Thực Thần","Thương Quan"], Thổ:["Chính Tài","Thiên Tài"], Kim:["Chính Quan","Thất Sát"], Thủy:["Chính Ấn","Thiên Ấn"] },
    Hỏa: { Hỏa:["Tỷ Kiên","Kiếp Tài"], Thổ:["Thực Thần","Thương Quan"], Kim:["Chính Tài","Thiên Tài"], Thủy:["Chính Quan","Thất Sát"], Mộc:["Chính Ấn","Thiên Ấn"] },
    Thổ: { Thổ:["Tỷ Kiên","Kiếp Tài"], Kim:["Thực Thần","Thương Quan"], Thủy:["Chính Tài","Thiên Tài"], Mộc:["Chính Quan","Thất Sát"], Hỏa:["Chính Ấn","Thiên Ấn"] },
    Thủy: { Thủy:["Tỷ Kiên","Kiếp Tài"], Mộc:["Thực Thần","Thương Quan"], Hỏa:["Chính Tài","Thiên Tài"], Thổ:["Chính Quan","Thất Sát"], Kim:["Chính Ấn","Thiên Ấn"] },
  };
  const isYang = ["Giáp","Bính","Mậu","Canh","Nhâm"].includes(nhatChu);
  const els = [tuTru.gio?.split(" ")[0], tuTru.thang?.split(" ")[0], tuTru.nam?.split(" ")[0]].filter(Boolean);
  const chis = [tuTru.gio?.split(" ")[1], tuTru.ngay?.split(" ")[1], tuTru.thang?.split(" ")[1], tuTru.nam?.split(" ")[1]].filter(Boolean);
  const res = {};
  for (const can of els) {
    if (can === nhatChu) continue;
    const h = canNguHanh[can]; if (!h) continue;
    const idx = (isYang === ["Giáp","Bính","Mậu","Canh","Nhâm"].includes(can)) ? 0 : 1;
    res[can] = map[canNguHanh[nhatChu]][h][idx];
  }
  for (const chi of chis) {
    const h = chiNguHanh[chi]; if (!h) continue;
    const idx = (isYang === ["Tý","Dần","Thìn","Ngọ","Thân","Tuất"].includes(chi)) ? 0 : 1;
    res[chi] = map[canNguHanh[nhatChu]][h][idx];
  }
  return res;
};

const tinhThanSat = (tuTru) => {
  const nhatChu = tuTru.ngay?.split(" ")[0];
  const ngayChi = tuTru.ngay?.split(" ")[1];
  const branches = [tuTru.nam?.split(" ")[1], tuTru.thang?.split(" ")[1], tuTru.ngay?.split(" ")[1], tuTru.gio?.split(" ")[1]].filter(Boolean);
  if (!nhatChu || !ngayChi || !branches.length) throw new Error("Thiếu dữ liệu Thần Sát");

  const thienAtQuyNhan = { Giáp:["Sửu","Mùi"], Mậu:["Sửu","Mùi"], Canh:["Sửu","Mùi"], Ất:["Thân","Tý"], Kỷ:["Thân","Tý"], Bính:["Dậu","Hợi"], Đinh:["Dậu","Hợi"], Tân:["Dần","Ngọ"], Nhâm:["Tỵ","Mão"], Quý:["Tỵ","Mão"] };
  const tuongTinh = { Thân:"Tý", Tý:"Tý", Thìn:"Tý", Tỵ:"Dậu", Dậu:"Dậu", Sửu:"Dậu", Dần:"Ngọ", Ngọ:"Ngọ", Tuất:"Ngọ", Hợi:"Mão", Mão:"Mão", Mùi:"Mão" };
  const vanXuong = { Giáp:["Tỵ"], Ất:["Ngọ"], Bính:["Thân"], Đinh:["Dậu"], Mậu:["Thân"], Kỷ:["Dậu"], Canh:["Hợi"], Tân:["Tý"], Nhâm:["Dần"], Quý:["Mão"] };
  const daoHoa = { Thân:"Dậu", Tý:"Dậu", Thìn:"Dậu", Tỵ:"Ngọ", Dậu:"Ngọ", Sửu:"Ngọ", Dần:"Mão", Ngọ:"Mão", Tuất:"Mão", Hợi:"Tý", Mão:"Tý", Mùi:"Tý" };
  const dichMa = { Thân:"Dần", Tý:"Dần", Thìn:"Dần", Tỵ:"Hợi", Dậu:"Hợi", Sửu:"Hợi", Dần:"Thân", Ngọ:"Thân", Tuất:"Thân", Hợi:"Tỵ", Mão:"Tỵ", Mùi:"Tỵ" };

  return {
    "Thiên Ất Quý Nhân": thienAtQuyNhan[nhatChu]?.filter(c=>branches.includes(c)) || [],
    "Tướng Tinh": branches.includes(tuongTinh[ngayChi]) ? [tuongTinh[ngayChi]] : [],
    "Văn Xương": vanXuong[nhatChu]?.filter(c=>branches.includes(c)) || [],
    "Đào Hoa": branches.includes(daoHoa[ngayChi]) ? [daoHoa[ngayChi]] : [],
    "Dịch Mã": branches.includes(dichMa[ngayChi]) ? [dichMa[ngayChi]] : [],
  };
};

/* ====== intent detection (nhiều lĩnh vực & A/B) ====== */
const classify = (txt) => {
  const t = rm((txt||"").toLowerCase());
  const hasChoice = /(?:\b| )(?:hay|or)\b/i.test((txt||""));
  const intents = {
    general: /(hay xem bat tu|xem bat tu|tong quan|bat tu)/i.test(t),
    money: /(tai van|tai chinh|tien bac|thu nhap|giau|tiet kiem|dau tu|money|wealth|finance|real estate|bat dong san)/i.test(t),
    career: /(nghe nghiep|su nghiep|cong viec|thang tien|job|career|chuyen nganh|hoc nganh)/i.test(t),
    love: /(tinh cam|hon nhan|nguoi yeu|ket hon|love|romance|dao hoa)/i.test(t),
    health: /(suc khoe|benh|sleep|an uong|stress|tam ly|mental)/i.test(t),
    family: /(gia dao|gia dinh|cha me|vo chong|con chau|anh em)/i.test(t),
    children: /(con cai|nuoi day|tre em|con trai|con gai)/i.test(t),
    color: /(mau|ao|mac|phong cach|style|fashion)/i.test(t),
    timeLuck: /(may man|thoi diem|gio tot|ngay may|thang nao tot)/i.test(t),
    study: /(hoc tap|thi cu|bang cap|ngoai ngu)/i.test(t),
    travel: /(du lich|di chuyen|visa|dich ma)/i.test(t),
    sports: /(the thao|tap luyen|chay bo|gym|yoga)/i.test(t),
    pet: /(thu cung|cho|meo|pet)/i.test(t),
    food: /(am thuc|an gi|che do an|diet|keto|eat)/i.test(t),
    friendship: /(ban be|giao tiep|network|ket noi)/i.test(t),
    tenGods: /(thap than|ten gods)/i.test(t),
    stars: /(than sat|quy nhan|dao hoa|van xuong|tuong tinh|dich ma)/i.test(t),
  };
  // default
  if (!Object.values(intents).some(v=>v)) intents.general = true;
  return { ...intents, hasChoice };
};

/* ====== percent string ====== */
const percentify = (obj) => {
  const total = Object.values(obj).reduce((a,b)=>a+b,0) || 1;
  const out = {};
  VN_ELEMS.forEach(k => out[k] = `${((obj[k]||0)/total*100).toFixed(2)}%`);
  return out;
};

/* ====== core: skeleton text (always with Bát Tự) ====== */
const skeletonGeneral = ({tuTru, nguHanhPct, nhatChu, nhatHanh, dungThan, thanSat}) => {
  const starsActive = Object.entries(thanSat||{}).filter(([_,v])=>v.length).map(([k,v])=>`${k}: ${v.join(", ")}`).join(" · ");
  return [
    `Tứ Trụ: Giờ ${tuTru.gio} – Ngày ${tuTru.ngay} – Tháng ${tuTru.thang} – Năm ${tuTru.nam}.`,
    `Nhật Chủ ${nhatChu} (${nhatHanh}).`,
    `Ngũ Hành: ${VN_ELEMS.map(k=>`${k} ${nguHanhPct[k]}`).join(", ")}.`,
    `Dụng Thần: ${dungThan.length ? dungThan.join(", ") : "—"}.`,
    starsActive ? `Thần Sát: ${starsActive}.` : `Thần Sát: —.`,
  ].join("\n");
};

/* ====== GPT polish with rules ====== */
const callOpenAI = async (payload, retries=2, delay=1200) => {
  if (!process.env.OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
  for (let i=1;i<=retries;i++){
    try {
      const r = await axios.post("https://api.openai.com/v1/chat/completions", payload, {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type":"application/json" },
        timeout: 45000
      });
      return r.data;
    } catch (e) {
      if (i===retries) throw e;
      await new Promise(r=>setTimeout(r, delay*i));
    }
  }
};

const postProcess = (text, { hasChoice, yearPair }) => {
  let out = (text||"").trim();

  // cấm rao giảng chung chung không có Bát Tự
  if (!/Tứ Trụ:|Four Pillars:/i.test(out)) {
    // không có skeleton → giữ nguyên (GPT có thể đã gộp), nhưng thường prompt đã buộc có
  }

  // nếu không có lựa chọn → bỏ các dòng mời gọi chọn A/B, tuổi hợp…
  if (!hasChoice) {
    const bad = /(A\/B|lựa chọn|chon [ab]\b|tuoi\s+(ty|suu|dan|mao|thin|ty|ngo|mui|than|dau|tuat|hoi))/i;
    out = out.split("\n").filter(l => !bad.test(rm(l))).join("\n").trim();
  }

  // chỉ cho phép “Tuổi <can-chi>” trùng năm sinh
  const reAge = /^\s*Tuổi\s+(Giáp|Ất|Bính|Đinh|Mậu|Kỷ|Canh|Tân|Nhâm|Quý)\s+(Tý|Sửu|Dần|Mão|Thìn|Tỵ|Ngọ|Mùi|Thân|Dậu|Tuất|Hợi)/i;
  out = out.split("\n").filter(line=>{
    const m = line.match(reAge);
    if (!m) return true;
    const pair = `${cap(m[1])} ${cap(m[2])}`;
    return pair === yearPair; // giữ nếu đúng NĂM
  }).join("\n").trim();

  return out;
};

/* ====== main route ====== */
app.post("/api/luan-giai-bazi", async (req, res) => {
  const started = Date.now();
  try {
    const { messages, tuTruInfo, dungThan } = req.body;
    if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error:"Missing messages" });
    if (!tuTruInfo) return res.status(400).json({ error:"Missing tuTruInfo" });

    const lang = guessLang(messages);
    const lastUser = [...messages].reverse().find(m=>m.role==="user")?.content || "";
    const intents = classify(lastUser);

    // parse tứ trụ
    let tuTru;
    try {
      const raw = JSON.parse(tuTruInfo);
      tuTru = { gio: normalizeCanChi(raw.gio), ngay: normalizeCanChi(raw.ngay), thang: normalizeCanChi(raw.thang), nam: normalizeCanChi(raw.nam) };
      if (!tuTru.gio || !tuTru.ngay || !tuTru.thang || !tuTru.nam) throw new Error("invalid");
    } catch {
      tuTru = parseEnglishTuTru(lastUser);
      if (!tuTru) return res.status(400).json({ error: lang==="vi" ? "Tứ Trụ không hợp lệ" : "Invalid Four Pillars" });
    }

    const nhatChu = tuTru.ngay.split(" ")[0];
    const nhatHanh = canNguHanh[nhatChu];
    const dungThanHanh = Array.isArray(dungThan) ? dungThan : (dungThan?.hanh || []);
    if (!dungThanHanh.every(d=>VN_ELEMS.includes(d))) {
      return res.status(400).json({ error: lang==="vi" ? "Dụng Thần không hợp lệ" : "Invalid Useful God" });
    }

    // phân tích
    const nguHanh = analyzeNguHanh(tuTru);
    const nguHanhPct = percentify(nguHanh);
    const thanSat = tinhThanSat(tuTru);
    const thapThan = intents.tenGods ? tinhThapThan(nhatChu, tuTru) : {}; // chỉ tính khi cần

    // skeleton luôn có Bát Tự/Dụng Thần/Thần Sát
    const core = skeletonGeneral({ tuTru, nguHanhPct, nhatChu, nhatHanh, dungThan: dungThanHanh, thanSat });

    // nạp context chuyên biệt theo intent
    const sections = [];
    if (intents.general) {
      sections.push(lang==="vi"
        ? "Tổng quan: Nêu khí chất Nhật Chủ, thế cân bằng Ngũ Hành, vì sao cần bồi dưỡng Dụng Thần; gợi ý 2–3 hướng hành động ngắn."
        : "Overview: Day Master temperament, element balance, why to nourish Useful God; 2–3 concrete next steps.");
    }
    if (intents.money) sections.push(lang==="vi"
      ? "Tài vận: Liên hệ Dụng Thần vào hình thức kiếm/giữ tiền; nếu có Thiên Ất Quý Nhân/Dịch Mã/Dào Hoa đang kích, nêu cách tận dụng; tránh liệt kê chung chung."
      : "Wealth: Tie Useful God to how to earn/retain money; if Nobleman/Travel/Peach Blossom active, show how to leverage; no generic platitudes.");
    if (intents.career) sections.push(lang==="vi"
      ? "Sự nghiệp: Khuyến nghị ngành/cách làm khớp Dụng Thần; không lan man sang Thập Thần trừ khi được hỏi."
      : "Career: Recommend roles/process aligned with Useful God; avoid Ten Gods unless asked.");
    if (intents.love) sections.push(lang==="vi"
      ? "Tình cảm: Dùng Đào Hoa/Quý Nhân (nếu có) + Dụng Thần để định phong cách giao tiếp/hẹn hò."
      : "Love: Use Peach Blossom/Nobleman (if any) + Useful God for communication/dating style.");
    if (intents.health) sections.push(lang==="vi"
      ? "Sức khỏe: Liên hệ hành yếu/vượng tới chế độ ngủ/thở/vận động; 1 thói quen 10–15 phút."
      : "Health: Map weak/strong elements to sleep/breath/movement; 1 habit 10–15 mins.");
    if (intents.family) sections.push(lang==="vi" ? "Gia đạo: Cách hóa giải dựa trên Dụng Thần; một hành động cụ thể để hòa khí." : "Family: How to balance with Useful God; one concrete action for harmony.");
    if (intents.children) sections.push(lang==="vi" ? "Con cái: Gợi ý nuôi dạy/định hướng học tập khớp Dụng Thần." : "Children: Parenting/study orientation aligned with Useful God.");
    if (intents.color) sections.push(lang==="vi"
      ? "Màu sắc/phong cách: Chỉ nêu khi người dùng hỏi; quy về Dụng Thần (ví dụ hành Hỏa → ấm/năng động; Thủy → xanh dương/đen...)."
      : "Color/style: Only when asked; map to Useful God palette.");
    if (intents.timeLuck) sections.push(lang==="vi"
      ? "Thời điểm may mắn: Nếu hành cần bổ sung là Hỏa/Thổ/Kim/Thủy/Mộc, gợi ý khung giờ–nhịp sinh hoạt tương ứng; không đoán mò năm."
      : "Lucky timing: Suggest daily windows matching Useful God; do not invent years.");
    if (intents.study) sections.push(lang==="vi" ? "Học tập: Phương pháp học và khung luyện tập hợp hành Dụng Thần." : "Study: Methods and schedule aligned with Useful God.");
    if (intents.travel) sections.push(lang==="vi" ? "Di chuyển/du lịch: Nếu có Dịch Mã, gợi ý kiểu dịch chuyển nên tận dụng." : "Travel: If Traveling Horse active, how to leverage.");
    if (intents.sports) sections.push(lang==="vi" ? "Thể thao: Môn và nhịp tập khớp Dụng Thần (Mộc → linh hoạt; Kim → sức bền/kỷ luật...)."
                                                : "Sports: Disciplines matching Useful God.");
    if (intents.pet) sections.push(lang==="vi" ? "Thú cưng: Gợi ý loại thú cưng/phong cách chăm dựa trên hành cần nuôi dưỡng."
                                              : "Pets: Pet type/care style mapped to Useful God.");
    if (intents.food) sections.push(lang==="vi" ? "Ẩm thực: Tông vị/nhóm thực phẩm cân bằng hành yếu (mô tả tinh tế, tránh y khoa)."
                                               : "Food: Flavour/food groups to balance weak elements (non-medical, gentle).");
    if (intents.friendship) sections.push(lang==="vi" ? "Bạn bè/network: Cách xây dựng kết nối theo Thần Sát Quý Nhân + Dụng Thần."
                                                     : "Friendship/networking via Nobleman + Useful God.");
    if (intents.tenGods) sections.push(lang==="vi" ? "Thập Thần (khi được hỏi): điểm nổi bật, ứng xử khéo để phát huy."
                                                   : "Ten Gods (on request): highlights and how to use them.");
    if (intents.stars) sections.push(lang==="vi" ? "Thần Sát: liệt kê sao đang kích và cách dùng thực tế."
                                                 : "Stars: list active stars and practical usage.");

    // nếu câu hỏi có A/B (ví dụ 'màu xanh hay màu đỏ')
    const hasChoice = intents.hasChoice;

    /* ====== GPT polish ====== */
    const system = lang==="vi"
      ? [
          "Bạn là trợ lý Bát Tự tinh tế. Văn phong nồng ấm, rõ ràng, có chiều sâu, không sáo rỗng.",
          "BẮT BUỘC: mở đầu bằng Tứ Trụ + Nhật Chủ (hành) + % Ngũ Hành + Dụng Thần + Thần Sát kích hoạt (nếu có).",
          "Chỉ dùng từ 'Tuổi ...' khi nhắc NĂM sinh; không dùng 'Tuổi ...' cho giờ/ngày/tháng.",
          "Luôn liên hệ khuyến nghị với Dụng Thần. Nhắc Thần Sát chỉ khi có sao đang kích.",
          "Không lặp lại màu sắc trừ khi người dùng hỏi về màu/phong cách.",
          "Không bịa mốc năm vận hạn; có thể gợi ý khung giờ/nhịp sinh hoạt hàng ngày phù hợp hành.",
          "Chỉ nói Thập Thần nếu người dùng hỏi."
        ].join("\n")
      : [
          "You are a Bazi assistant. Warm, precise, grounded.",
          "MUST start with Four Pillars + Day Master(element) + Five-elements % + Useful God + Active Stars.",
          "Do NOT say 'Age ...' for hour/day/month; only for YEAR.",
          "Always tie advice to Useful God; mention stars only if active.",
          "No color repetition unless asked; no made-up yearly predictions.",
          "Mention Ten Gods only if asked."
        ].join("\n");

    const sectionGuide = sections.length
      ? (lang==="vi" ? `Trọng tâm cần trả lời:\n- ${sections.join("\n- ")}` : `Focus:\n- ${sections.join("\n- ")}`)
      : "";

    const context = [
      core,
      lang==="vi" ? "Nếu câu hỏi có lựa chọn A/B, hãy trả lời dạng so sánh ngắn, gắn với Dụng Thần." :
                    "If the question is A/B, compare briefly and tie to Useful God.",
      sectionGuide
    ].filter(Boolean).join("\n\n");

    const payload = {
      model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
      temperature: 0.5,
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || "1200",10),
      messages: [
        { role: "system", content: system },
        { role: "user", content: (lang==="vi" ? "Câu hỏi người dùng: " : "User question: ") + lastUser + "\n\n" + context }
      ]
    };

    let answer;
    try {
      const gpt = await callOpenAI(payload);
      answer = gpt?.choices?.[0]?.message?.content?.trim();
    } catch (e) {
      // Fallback rất ngắn gọn nhưng vẫn chuẩn Bát Tự
      const starsActive = Object.entries(thanSat||{}).filter(([_,v])=>v.length).map(([k,v])=>`${k}: ${v.join(", ")}`).join(" · ");
      const intro = core;
      const hint = lang==="vi"
        ? `Gợi ý: ưu tiên hành ${dungThanHanh[0]||nhatHanh} trong các lựa chọn hằng ngày.`
        : `Tip: favour ${dungThanHanh[0]||nhatHanh} element in daily choices.`;
      answer = [intro, hint].join("\n\n");
    }

    // hậu xử lý chống “Tuổi …” sai & chống mời chọn A/B khi không có
    answer = postProcess(answer, { hasChoice, yearPair: tuTru.nam });

    // cache theo câu hỏi
    const cacheKey = `${JSON.stringify(tuTru)}|${rm(lastUser)}|${dungThanHanh.join(",")}|${lang}`;
    cache.set(cacheKey, answer);

    return res.json({ answer, meta: { ms: Date.now()-started } });
  } catch (err) {
    try { fs.appendFileSync("error.log", `${new Date().toISOString()} ${err.stack||err.message}\n`); } catch {}
    return res.status(500).json({ error: "Internal error" });
  }
});

/* ====== error mw ====== */
app.use((err, req, res, next) => {
  try { fs.appendFileSync("error.log", `${new Date().toISOString()} - ${err.stack||err.message}\n`); } catch {}
  res.status(500).json({ error: "System error occurred" });
});

/* ====== start ====== */
const port = process.env.PORT || 10000;
const server = app.listen(port, ()=>console.log(`Server listening on ${port}`));
server.setTimeout(300000);
