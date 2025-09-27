// server.js
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const NodeCache = require("node-cache");
const fs = require("fs");
require("dotenv").config();

const app = express();

// ===== CORS (allowlist bằng ENV: CORS_ORIGINS="https://a.com,https://b.com")
const allowlist = (process.env.CORS_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!allowlist.length || !origin) return cb(null, true);
    return allowlist.includes(origin) ? cb(null, true) : cb(new Error("Not allowed by CORS"));
  },
  credentials: true
}));

// ===== Security & Limits
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false }));

// ===== Caching
const cache = new NodeCache({ stdTTL: 3600 }); // 1h cho analysis, 10m cho câu trả lời
const replyCache = new NodeCache({ stdTTL: 600 });

app.get("/health", (req, res) => res.status(200).send("OK"));

// ================== BẢN ĐỒ CAN–CHI ==================
const heavenlyStemsMap = {
  en: { Jia: "Giáp", Yi: "Ất", Bing: "Bính", Ding: "Đinh", Wu: "Mậu", Ji: "Kỷ", Geng: "Canh", Xin: "Tân", Ren: "Nhâm", Gui: "Quý" },
  vi: { Giáp: "Giáp", Ất: "Ất", Bính: "Bính", Đinh: "Đinh", Mậu: "Mậu", Kỷ: "Kỷ", Canh: "Canh", Tân: "Tân", Nhâm: "Nhâm", Quý: "Quý" }
};
const earthlyBranchesMap = {
  en: { Rat: "Tý", Ox: "Sửu", Tiger: "Dần", Rabbit: "Mão", Dragon: "Thìn", Snake: "Tỵ", Horse: "Ngọ", Goat: "Mùi", Monkey: "Thân", Rooster: "Dậu", Dog: "Tuất", Pig: "Hợi" },
  vi: { Tý: "Tý", Sửu: "Sửu", Dần: "Dần", Mão: "Mão", Thìn: "Thìn", Tỵ: "Tỵ", Ngọ: "Ngọ", Mùi: "Mùi", Thân: "Thân", Dậu: "Dậu", Tuất: "Tuất", Hợi: "Hợi" }
};
const rmDiacritics = s => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

// ================== CHUẨN HÓA CAN CHI ==================
const normalizeCanChi = (input) => {
  if (!input || typeof input !== "string") return null;
  const [rawCan, rawChi] = input.trim().split(/\s+/);
  if (!rawCan || !rawChi) return null;

  const viCan = Object.keys(heavenlyStemsMap.vi);
  const viChi = Object.keys(earthlyBranchesMap.vi);
  const canVi = viCan.find(k => rmDiacritics(k).toLowerCase() === rmDiacritics(rawCan).toLowerCase());
  const chiVi = viChi.find(k => rmDiacritics(k).toLowerCase() === rmDiacritics(rawChi).toLowerCase());
  if (canVi && chiVi) return `${canVi} ${chiVi}`;

  const enCanKey = Object.keys(heavenlyStemsMap.en).find(k => k.toLowerCase() === rawCan.toLowerCase());
  const enChiKey = Object.keys(earthlyBranchesMap.en).find(k => k.toLowerCase() === rawChi.toLowerCase());
  if (enCanKey && enChiKey) return `${heavenlyStemsMap.en[enCanKey]} ${earthlyBranchesMap.en[enChiKey]}`;
  return null;
};

// ================== PARSER TIẾNG ANH ==================
const parseEnglishTuTru = (input) => {
  try {
    if (!input) return null;
    // Ví dụ: "Jia Zi hour, Ji Hai day, Yi You month, Gui Mao year"
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
    return (out.gio && out.ngay && out.thang && out.nam) ? out : null;
  } catch { return null; }
};

// ================== 60 HOA GIÁP (tạo tự động) ==================
const heavenlyStemsVI = ["Giáp","Ất","Bính","Đinh","Mậu","Kỷ","Canh","Tân","Nhâm","Quý"];
const earthlyBranchesVI = ["Tý","Sửu","Dần","Mão","Thìn","Tỵ","Ngọ","Mùi","Thân","Dậu","Tuất","Hợi"];
const hoaGiap = Array.from({ length: 60 }, (_, i) => `${heavenlyStemsVI[i % 10]} ${earthlyBranchesVI[i % 12]}`);

const getCanChiForYear = (year) => {
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return null;
  const baseYear = 1984; // Giáp Tý
  let idx = (year - baseYear) % 60;
  if (idx < 0) idx += 60;
  return hoaGiap[idx] || null;
};

// ================== NGŨ HÀNH / THẬP THẦN / THẦN SÁT ==================
const canNguHanh = { Giáp:"Mộc", Ất:"Mộc", Bính:"Hỏa", Đinh:"Hỏa", Mậu:"Thổ", Kỷ:"Thổ", Canh:"Kim", Tân:"Kim", Nhâm:"Thủy", Quý:"Thủy" };
const chiNguHanh = { Tý:"Thủy", Hợi:"Thủy", Sửu:"Thổ", Thìn:"Thổ", Mùi:"Thổ", Tuất:"Thổ", Dần:"Mộc", Mão:"Mộc", Tỵ:"Hỏa", Ngọ:"Hỏa", Thân:"Kim", Dậu:"Kim" };

const analyzeNguHanh = (tuTru) => {
  const nguHanhCount = { Mộc: 0, Hỏa: 0, Thổ: 0, Kim: 0, Thủy: 0 };
  const hiddenElements = {
    Tý:["Quý"], Sửu:["Kỷ","Tân","Quý"], Dần:["Giáp","Bính","Mậu"], Mão:["Ất"],
    Thìn:["Mậu","Ất","Quý"], Tỵ:["Bính","Canh","Mậu"], Ngọ:["Đinh","Kỷ"],
    Mùi:["Kỷ","Đinh","Ất"], Thân:["Canh","Nhâm","Mậu"], Dậu:["Tân"],
    Tuất:["Mậu","Đinh","Tân"], Hợi:["Nhâm","Giáp"]
  };
  const elements = [
    ...(tuTru.nam||"").split(" "), ...(tuTru.thang||"").split(" "),
    ...(tuTru.ngay||"").split(" "), ...(tuTru.gio||"").split(" ")
  ].filter(Boolean);
  const branches = [tuTru.nam?.split(" ")[1], tuTru.thang?.split(" ")[1], tuTru.ngay?.split(" ")[1], tuTru.gio?.split(" ")[1]].filter(Boolean);

  if (elements.length < 8 || branches.length < 4) throw new Error("Tứ Trụ không đầy đủ");

  for (const e of elements) {
    if (canNguHanh[e]) nguHanhCount[canNguHanh[e]] += 1;
    if (chiNguHanh[e]) nguHanhCount[chiNguHanh[e]] += 1;
  }
  for (const chi of branches) (hiddenElements[chi] || []).forEach(h => { if (canNguHanh[h]) nguHanhCount[canNguHanh[h]] += 0.3; });
  const total = Object.values(nguHanhCount).reduce((a,b)=>a+b,0);
  if (!total) throw new Error("Không tìm thấy ngũ hành hợp lệ");
  return nguHanhCount;
};

const tinhThapThan = (nhatChu, tuTru) => {
  if (!nhatChu || !canNguHanh[nhatChu]) throw new Error("Nhật Chủ không hợp lệ");
  const thapThanMap = {
    Kim: { Kim:["Tỷ Kiên","Kiếp Tài"], Thủy:["Thực Thần","Thương Quan"], Mộc:["Chính Tài","Thiên Tài"], Hỏa:["Chính Quan","Thất Sát"], Thổ:["Chính Ấn","Thiên Ấn"] },
    Mộc: { Mộc:["Tỷ Kiên","Kiếp Tài"], Hỏa:["Thực Thần","Thương Quan"], Thổ:["Chính Tài","Thiên Tài"], Kim:["Chính Quan","Thất Sát"], Thủy:["Chính Ấn","Thiên Ấn"] },
    Hỏa: { Hỏa:["Tỷ Kiên","Kiếp Tài"], Thổ:["Thực Thần","Thương Quan"], Kim:["Chính Tài","Thiên Tài"], Thủy:["Chính Quan","Thất Sát"], Mộc:["Chính Ấn","Thiên Ấn"] },
    Thổ: { Thổ:["Tỷ Kiên","Kiếp Tài"], Kim:["Thực Thần","Thương Quan"], Thủy:["Chính Tài","Thiên Tài"], Mộc:["Chính Quan","Thất Sát"], Hỏa:["Chính Ấn","Thiên Ấn"] },
    Thủy: { Thủy:["Tỷ Kiên","Kiếp Tài"], Mộc:["Thực Thần","Thương Quan"], Hỏa:["Chính Tài","Thiên Tài"], Thổ:["Chính Quan","Thất Sát"], Kim:["Chính Ấn","Thiên Ấn"] },
  };
  const isYang = ["Giáp","Bính","Mậu","Canh","Nhâm"].includes(nhatChu);
  const out = {};
  const els = [tuTru.gio?.split(" ")[0], tuTru.thang?.split(" ")[0], tuTru.nam?.split(" ")[0]].filter(Boolean);
  const chis = [tuTru.gio?.split(" ")[1], tuTru.ngay?.split(" ")[1], tuTru.thang?.split(" ")[1], tuTru.nam?.split(" ")[1]].filter(Boolean);

  if (els.length < 3 || chis.length < 4) throw new Error("Tứ Trụ không đầy đủ");

  for (const can of els) {
    if (can === nhatChu) continue;
    const h = canNguHanh[can]; if (!h) continue;
    const sameYang = ["Giáp","Bính","Mậu","Canh","Nhâm"].includes(can);
    const idx = (isYang === sameYang) ? 0 : 1;
    out[can] = thapThanMap[canNguHanh[nhatChu]][h][idx];
  }
  for (const chi of chis) {
    const h = chiNguHanh[chi]; if (!h) continue;
    const chiYang = ["Tý","Dần","Thìn","Ngọ","Thân","Tuất"].includes(chi);
    const idx = (isYang === chiYang) ? 0 : 1;
    out[chi] = thapThanMap[canNguHanh[nhatChu]][h][idx];
  }
  return out;
};

// — Thần sát rút gọn (như bản trước, đủ dùng) —
const tinhThanSat = (tuTru) => {
  const nhatChu = tuTru.ngay?.split(" ")[0];
  const ngayChi = tuTru.ngay?.split(" ")[1];
  const branches = [tuTru.nam?.split(" ")[1], tuTru.thang?.split(" ")[1], tuTru.ngay?.split(" ")[1], tuTru.gio?.split(" ")[1]].filter(Boolean);
  if (!nhatChu || !ngayChi || !branches.length) throw new Error("Invalid nhatChu or branches");

  const thienAtQuyNhan = { Giáp:["Sửu","Mùi"], Mậu:["Sửu","Mùi"], Canh:["Sửu","Mùi"], Ất:["Thân","Tý"], Kỷ:["Thân","Tý"], Bính:["Dậu","Hợi"], Đinh:["Dậu","Hợi"], Tân:["Dần","Ngọ"], Nhâm:["Tỵ","Mão"], Quý:["Tỵ","Mão"] };
  const tuongTinh = { Thân:"Tý", Tý:"Tý", Thìn:"Tý", Tỵ:"Dậu", Dậu:"Dậu", Sửu:"Dậu", Dần:"Ngọ", Ngọ:"Ngọ", Tuất:"Ngọ", Hợi:"Mão", Mão:"Mão", Mùi:"Mão" };
  const vanXuong = { Giáp:["Tỵ"], Ất:["Ngọ"], Bính:["Thân"], Đinh:["Dậu"], Mậu:["Thân"], Kỷ:["Dậu"], Canh:["Hợi"], Tân:["Tý"], Nhâm:["Dần"], Quý:["Mão"] };
  const daoHoa = { Thân:"Dậu", Tý:"Dậu", Thìn:"Dậu", Tỵ:"Ngọ", Dậu:"Ngọ", Sửu:"Ngọ", Dần:"Mão", Ngọ:"Mão", Tuất:"Mão", Hợi:"Tý", Mão:"Tý", Mùi:"Tý" };
  const dichMa = { Thân:"Dần", Tý:"Dần", Thìn:"Dần", Tỵ:"Hợi", Dậu:"Hợi", Sửu:"Hợi", Dần:"Thân", Ngọ:"Thân", Tuất:"Thân", Hợi:"Tỵ", Mão:"Tỵ", Mùi:"Tỵ" };
  const coThanQuaTu = { Tý:["Dần","Tuất"], Sửu:["Dần","Tuất"], Hợi:["Dần","Tuất"], Dần:["Tỵ","Sửu"], Mão:["Tỵ","Sửu"], Thìn:["Tỵ","Sửu"], Tỵ:["Thân","Thìn"], Ngọ:["Thân","Thìn"], Mùi:["Thân","Thìn"], Thân:["Hợi","Mùi"], Dậu:["Hợi","Mùi"], Tuất:["Hợi","Mùi"] };
  const kiepSat = { Thân:"Tỵ", Tý:"Tỵ", Thìn:"Tỵ", Tỵ:"Dần", Dậu:"Dần", Sửu:"Dần", Dần:"Hợi", Ngọ:"Hợi", Tuất:"Hợi", Hợi:"Thân", Mão:"Thân", Mùi:"Thân" };

  const khongVong = {
    "Giáp Tý":["Tuất","Hợi"], "Ất Sửu":["Tuất","Hợi"], "Bính Dần":["Tuất","Hợi"], "Đinh Mão":["Tuất","Hợi"],
    "Mậu Thìn":["Tuất","Hợi"], "Kỷ Tỵ":["Tuất","Hợi"], "Canh Ngọ":["Tuất","Hợi"], "Tân Mùi":["Tuất","Hợi"],
    "Nhâm Thân":["Tuất","Hợi"], "Quý Dậu":["Tuất","Hợi"],
    "Giáp Tuất":["Thân","Dậu"], "Ất Hợi":["Thân","Dậu"], "Bính Tý":["Thân","Dậu"], "Đinh Sửu":["Thân","Dậu"],
    "Mậu Dần":["Thân","Dậu"], "Kỷ Mão":["Thân","Dậu"], "Canh Thìn":["Thân","Dậu"], "Tân Tỵ":["Thân","Dậu"],
    "Nhâm Ngọ":["Thân","Dậu"], "Quý Mùi":["Thân","Dậu"],
    "Giáp Thân":["Ngọ","Mùi"], "Ất Dậu":["Ngọ","Mùi"], "Bính Tuất":["Ngọ","Mùi"], "Đinh Hợi":["Ngọ","Mùi"],
    "Mậu Tý":["Ngọ","Mùi"], "Kỷ Sửu":["Ngọ","Mùi"], "Canh Dần":["Ngọ","Mùi"], "Tân Mão":["Ngọ","Mùi"],
    "Nhâm Thìn":["Ngọ","Mùi"], "Quý Tỵ":["Ngọ","Mùi"],
    "Giáp Ngọ":["Thìn","Tỵ"], "Ất Mùi":["Thìn","Tỵ"], "Bính Thân":["Thìn","Tỵ"], "Đinh Dậu":["Thìn","Tỵ"],
    "Mậu Tuất":["Thìn","Tỵ"], "Kỷ Hợi":["Thìn","Tỵ"], "Canh Tý":["Thìn","Tỵ"], "Tân Sửu":["Thìn","Tỵ"],
    "Nhâm Dần":["Thìn","Tỵ"], "Quý Mão":["Thìn","Tỵ"],
    "Giáp Thìn":["Dần","Mão"], "Ất Tỵ":["Dần","Mão"], "Bính Ngọ":["Dần","Mão"], "Đinh Mùi":["Dần","Mão"],
    "Mậu Thân":["Dần","Mão"], "Kỷ Dậu":["Dần","Mão"], "Canh Tuất":["Dần","Mão"], "Tân Hợi":["Dần","Mão"],
    "Nhâm Tý":["Dần","Mão"], "Quý Sửu":["Dần","Mão"],
    "Giáp Dần":["Tý","Sửu"], "Ất Mão":["Tý","Sửu"], "Bính Thìn":["Tý","Sửu"], "Đinh Tỵ":["Tý","Sửu"],
    "Mậu Ngọ":["Tý","Sửu"], "Kỷ Mùi":["Tý","Sửu"], "Canh Thân":["Tý","Sửu"], "Tân Dậu":["Tý","Sửu"],
    "Nhâm Tuất":["Tý","Sửu"], "Quý Hợi":["Tý","Sửu"]
  };

  return {
    "Thiên Ất Quý Nhân": { vi:"Thiên Ất Quý Nhân", en:"Nobleman Star", value: thienAtQuyNhan[nhatChu]?.filter(c=>branches.includes(c)) || [] },
    "Tướng Tinh": { vi:"Tướng Tinh", en:"General Star", value: branches.includes(tuongTinh[ngayChi]) ? [tuongTinh[ngayChi]] : [] },
    "Văn Xương": { vi:"Văn Xương", en:"Literary Star", value: vanXuong[nhatChu]?.filter(c=>branches.includes(c)) || [] },
    "Đào Hoa": { vi:"Đào Hoa", en:"Peach Blossom", value: branches.includes(daoHoa[ngayChi]) ? [daoHoa[ngayChi]] : [] },
    "Dịch Mã": { vi:"Dịch Mã", en:"Traveling Horse", value: branches.includes(dichMa[ngayChi]) ? [dichMa[ngayChi]] : [] },
    "Cô Thần Quả Tú": { vi:"Cô Thần Quả Tú", en:"Loneliness Star", value: coThanQuaTu[ngayChi]?.filter(c=>branches.includes(c)) || [] },
    "Kiếp Sát": { vi:"Kiếp Sát", en:"Robbery Star", value: branches.includes(kiepSat[ngayChi]) ? [kiepSat[ngayChi]] : [] },
    "Không Vong": { vi:"Không Vong", en:"Void Star", value: (khongVong[tuTru.ngay]||[]).filter(c=>branches.includes(c)) }
  };
};

// ================== NGÔN NGỮ & RENDER ==================
const personalityDescriptions = {
  Mộc: { vi: "sáng tạo, linh hoạt, thông minh", en: "creative, adaptable, intelligent" },
  Hỏa: { vi: "nhiệt huyết, chủ động", en: "passionate, proactive" },
  Thổ: { vi: "vững chãi, thực tế", en: "grounded, practical" },
  Kim: { vi: "kỷ luật, quyết đoán", en: "disciplined, decisive" },
  Thủy: { vi: "nhạy bén, uyển chuyển", en: "perceptive, fluid" }
};
const elementMeta = {
  "Mộc": { vi: { color: "xanh lá", jobs: "giáo dục/thiết kế/sáng tạo nội dung, cố vấn" }, en: { color: "green", jobs: "education/design/content, advisory" } },
  "Hỏa": { vi: { color: "đỏ/cam", jobs: "truyền thông, trình diễn, năng lượng" }, en: { color: "red/orange", jobs: "media, performance, energy" } },
  "Thổ": { vi: { color: "vàng/đất", jobs: "bất động sản, quản trị, vận hành" }, en: { color: "yellow/earth", jobs: "real estate, ops, management" } },
  "Kim": { vi: { color: "trắng/ánh kim", jobs: "tài chính, kỹ thuật, pháp chế" }, en: { color: "white/metallic", jobs: "finance, engineering, compliance" } },
  "Thủy": { vi: { color: "xanh dương/đen", jobs: "CNTT – dữ liệu, logistics, nghiên cứu" }, en: { color: "blue/black", jobs: "IT/data, logistics, research" } },
};
const guessLanguage = (messages) => {
  const txt = (messages || []).map(m => m.content || "").join(" ");
  const looksVI = /ngay|thang|nam|gio|giap|at|binh|dinh|mau|ky|canh|tan|nham|quy|ty|suu|dan|mao|thin|ty|ngo|mui|than|dau|tuat|hoi/i.test(rmDiacritics(txt));
  return looksVI ? "vi" : "en";
};
const pct = n => `${(+n).toFixed(2)}%`;

const determineQuestionType = (userInput) => {
  const t = rmDiacritics((userInput || "").toLowerCase());
  const is = (re) => re.test(t);
  const types = {
    isMoney: is(/tien bac|tai chinh|tai loc|money|finance|wealth|thu nhap|dau tu|invest/),
    isCareer: is(/nghe|cong viec|su nghiep|career|job|thang tien|kinh doanh|business|startup/),
    isFame: is(/cong danh|danh tieng|fame|reputation|success/),
    isHealth: is(/suc khoe|health|benh|tam ly|mental/),
    isLove: is(/hon nhan|tinh duyen|tinh yeu|marriage|love|romance/),
    isFamily: is(/gia dao|gia dinh|family/),
    isChildren: is(/con cai|children|parenting/),
    isProperty: is(/tai san|dat dai|bat dong san|property|real estate/),
    isThapThan: is(/thap than|ten gods/),
    isThanSat: is(/than sat|auspicious|sao|quy nhan|dao hoa|van xuong|tuong tinh|dich ma|co than|qua tu|kiep sat|khong vong/)
  };
  types.isGeneral = !Object.values(types).some(v => v);
  return types;
};

const renderGeneral = (tuTru, nguHanhCount, thapThanResults, thanSatResults, dungThan, language) => {
  const nhatChu = tuTru.ngay.split(" ")[0];
  const dmHanh = canNguHanh[nhatChu];
  const entries = Object.entries(nguHanhCount);
  const total = entries.reduce((a,[,v])=>a+v,0) || 1;
  const percents = Object.fromEntries(entries.map(([k,v]) => [k, (v/total)*100]));
  const sorted = [...entries].sort((a,b)=>b[1]-a[1]);
  const dominant = sorted[0][0];
  const weak = sorted[sorted.length-1][0];

  const dungs = Array.isArray(dungThan) ? dungThan : [];
  const chosen = dungs[0] || dominant;
  const meta = elementMeta[chosen][language];

  const godsCount = {};
  Object.values(thapThanResults||{}).forEach(n => { if(!n) return; godsCount[n]=(godsCount[n]||0)+1; });
  const topGods = Object.entries(godsCount).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([n,c])=>`${n} (${c})`);

  const activeStars = Object.values(thanSatResults||{})
    .filter(v => v.value && v.value.length)
    .map(v => `${v[language]}: ${v.value.join(", ")}`);

  if (language === "vi") {
    return [
      "Luận giải Bát Tự:",
      `Nhật Chủ ${nhatChu} (${dmHanh}) – ${personalityDescriptions[dmHanh].vi}.`,
      `Tứ Trụ: Giờ ${tuTru.gio} · Ngày ${tuTru.ngay} · Tháng ${tuTru.thang} · Năm ${tuTru.nam}`,
      `Ngũ Hành: ${["Mộc","Hỏa","Thổ","Kim","Thủy"].map(h=>`${h} ${pct(percents[h]||0)}`).join(", ")}`,
      `Tổng quan: ${dominant} vượng, ${weak} yếu → nên bổ ${chosen} để cân bằng.`,
      `Nghề hợp: ${meta.jobs}. Màu gợi ý: ${meta.color}.`,
      topGods.length ? `Thập Thần nổi bật: ${topGods.join(" · ")}` : `Thập Thần nổi bật: không đáng kể.`,
      activeStars.length ? `Thần Sát kích hoạt: ${activeStars.join(" | ")}` : `Thần Sát: không nổi bật.`
    ].join("\n");
  }
  return [
    "Bazi Insight:",
    `Day Master ${nhatChu} (${dmHanh}) – ${personalityDescriptions[dmHanh].en}.`,
    `Four Pillars: Hour ${tuTru.gio} · Day ${tuTru.ngay} · Month ${tuTru.thang} · Year ${tuTru.nam}`,
    `Five Elements: ${["Mộc","Hỏa","Thổ","Kim","Thủy"].map(h=>`${h} ${pct(percents[h]||0)}`).join(", ")}`,
    `Overall: ${dominant} strong, ${weak} weak → add ${chosen} to balance.`,
    `Careers: ${meta.jobs}. Colors: ${meta.color}.`,
    topGods.length ? `Ten Gods: ${topGods.join(" · ")}` : `Ten Gods: none prominent.`,
    activeStars.length ? `Auspicious Stars: ${activeStars.join(" | ")}` : `Auspicious Stars: none.`
  ].join("\n");
};

const renderIntent = (intent, tuTru, nguHanhCount, thapThanResults, thanSatResults, dungThan, language) => {
  // Renderer ngắn gọn cho các câu hỏi hẹp (không gọi LLM)
  const bullets = [];
  const dm = tuTru.ngay.split(" ")[0];
  const dmHanh = canNguHanh[dm];
  const has = (name) => Object.values(thanSatResults[name]?.value || []).length > 0;

  const verdict = (txt) => language === "vi" ? `Kết luận: ${txt}` : `Verdict: ${txt}`;
  const advise = (txt) => language === "vi" ? `• ${txt}` : `• ${txt}`;

  switch (intent) {
    case "love": {
      const peach = has("Đào Hoa");
      const noble = has("Thiên Ất Quý Nhân");
      bullets.push(verdict(peach ? "Đường tình cảm có duyên, dễ gặp người hợp." : "Tình cảm thiên về ổn định, cần chủ động nuôi dưỡng."));
      if (noble) bullets.push(advise(language==="vi"?"Có Quý Nhân hỗ trợ kết nối.":"Nobleman star supports connections."));
      bullets.push(advise(language==="vi"?"Ưu tiên giao tiếp chân thành, chia sẻ cảm xúc đều.":"Prioritize honest communication."));
      bullets.push(advise(language==="vi"?"Bổ sung Dụng Thần: " + (dungThan[0]||dmHanh) :"Add Useful Element: " + (dungThan[0]||dmHanh)));
      break;
    }
    case "money": {
      const hasSeal = Object.values(thapThanResults).includes("Chính Ấn");
      bullets.push(verdict(language==="vi"?"Tài vận ở mức trung bình–khá, tích lũy tốt khi kỷ luật.":"Wealth: fair to good with disciplined saving."));
      if (hasSeal) bullets.push(advise(language==="vi"?"Thiên/Chính Ấn trợ học hành – nâng bậc thu nhập qua kỹ năng.":"Seal favors study → upskill for higher income."));
      bullets.push(advise(language==="vi"?"Đổi 1 phần sang tài sản ổn định (quỹ/bđs) thay vì lướt sóng.":"Allocate to stable assets over speculation."));
      break;
    }
    case "career": {
      bullets.push(verdict(language==="vi"?"Hợp môi trường cần sáng tạo/giao tiếp, có cơ hội thăng tiến.":"Fit for creative/communication roles; growth potential."));
      bullets.push(advise(language==="vi"?"Tập trung vào 1 kỹ năng mũi nhọn, đo kết quả theo quý.":"Focus on one spike skill; review quarterly."));
      break;
    }
    case "health": {
      bullets.push(verdict(language==="vi"?"Cần cân bằng cảm xúc/giấc ngủ; tránh làm quá sức.":"Balance sleep/emotions; avoid overwork."));
      bullets.push(advise(language==="vi"?"Thêm vận động nhẹ, thiền 10–15 phút/ngày.":"Light exercise, 10–15min meditation."));
      break;
    }
    case "family": {
      bullets.push(verdict(language==="vi"?"Gia đạo thiên ổn, cần lắng nghe để tránh hiểu nhầm.":"Family: mostly steady; practice active listening."));
      bullets.push(advise(language==="vi"?"Duy trì bữa cơm chung/tuần.":"Keep one weekly family meal."));
      break;
    }
    case "children": {
      bullets.push(verdict(language==="vi"?"Con cái thiên hướng sáng tạo, cần khích lệ tự lập.":"Children show creativity; encourage autonomy."));
      bullets.push(advise(language==="vi"?"Đầu tư kỹ năng mềm và thể thao.":"Invest in soft skills & sports."));
      break;
    }
    case "property": {
      bullets.push(verdict(language==="vi"?"Nên tích lũy tài sản cố định theo kế hoạch, tránh FOMO.":"Build fixed assets via plan; avoid FOMO."));
      bullets.push(advise(language==="vi"?"Giữ tỉ lệ tiền mặt dự phòng 6 tháng chi tiêu.":"Keep 6-month expense cash buffer."));
      break;
    }
    default:
      return renderGeneral(tuTru, nguHanhCount, thapThanResults, thanSatResults, dungThan, language);
  }
  return bullets.join("\n");
};

// ================== OPENAI (tuỳ chọn để 'polish') ==================
const checkOpenAIKey = async () => {
  if (!process.env.OPENAI_API_KEY) return false;
  try {
    await axios.post(
      "https://api.openai.com/v1/chat/completions",
      { model: process.env.OPENAI_MODEL || "gpt-3.5-turbo", messages: [{ role: "user", content: "ping" }], max_tokens: 1 },
      { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, timeout: 8000 }
    );
    return true;
  } catch (err) {
    if (err.response?.status === 401) return false;
    return true;
  }
};

const callOpenAI = async (payload, retries = 2, delay = 1200) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const { data } = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        payload,
        { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" }, timeout: 30000 }
      );
      return data;
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) throw new Error("Invalid API key");
      if (attempt === retries || status === 429) throw new Error(err.message || "OpenAI error");
      await new Promise(r => setTimeout(r, delay * attempt));
    }
  }
};

// ================== ENDPOINT 1: PHÂN TÍCH (một lần) ==================
app.post("/api/phan-tich", (req, res) => {
  const { sessionId, tuTruInfo, dungThan } = req.body;
  if (!sessionId) return res.status(400).json({ error: "Missing sessionId" });
  if (!tuTruInfo || typeof tuTruInfo !== "string") return res.status(400).json({ error: "Missing tuTruInfo" });

  const dungThanHanh = Array.isArray(dungThan) ? dungThan : (dungThan?.hanh || []);
  if (!dungThanHanh.every(d => ["Mộc","Hỏa","Thổ","Kim","Thủy"].includes(d))) {
    return res.status(400).json({ error: "Invalid Useful God" });
  }

  let tuTru;
  try {
    tuTru = JSON.parse(tuTruInfo);
    tuTru = { gio: normalizeCanChi(tuTru.gio), ngay: normalizeCanChi(tuTru.ngay), thang: normalizeCanChi(tuTru.thang), nam: normalizeCanChi(tuTru.nam) };
    if (!tuTru.gio || !tuTru.ngay || !tuTru.thang || !tuTru.nam) throw new Error("invalid");
  } catch {
    return res.status(400).json({ error: "Invalid Four Pillars" });
  }

  try {
    const nguHanh = analyzeNguHanh(tuTru);
    const thapThanResults = tinhThapThan(tuTru.ngay.split(" ")[0], tuTru);
    const thanSatResults = tinhThanSat(tuTru);
    const analysis = { tuTru, nguHanh, thapThanResults, thanSatResults, dungThanHanh };
    cache.set(`analysis:${sessionId}`, analysis, 60 * 60);
    return res.json({ ok: true, analysis });
  } catch (e) {
    console.error("Analyze error:", e.message);
    return res.status(400).json({ error: e.message || "Analyze failed" });
  }
});

// ================== ENDPOINT 2: HỎI GÌ TRẢ NẤY (tránh lặp) ==================
app.post("/api/hoi", async (req, res) => {
  const { sessionId, question, language: lang } = req.body;
  const language = lang || "vi";
  const analysis = cache.get(`analysis:${sessionId}`);
  if (!analysis) return res.status(400).json({ error: "Chưa có phân tích. Hãy gọi /api/phan-tich trước." });

  const { tuTru, nguHanh, thapThanResults, thanSatResults, dungThanHanh } = analysis;
  const t = determineQuestionType(question);
  const INTENT = t.isLove ? "love" : t.isMoney ? "money" : t.isCareer ? "career" : t.isFame ? "fame"
              : t.isHealth ? "health" : t.isFamily ? "family" : t.isChildren ? "children"
              : t.isProperty ? "property" : "general";

  const cacheKey = `reply:${sessionId}:${INTENT}:${rmDiacritics(question).slice(0,80)}`;
  const cached = replyCache.get(cacheKey);
  if (cached) return res.json({ answer: cached, intent: INTENT, cached: true });

  // Không dùng GPT cho intent hẹp -> nhanh & không lan man
  let base = renderIntent(INTENT, tuTru, nguHanh, thapThanResults, thanSatResults, dungThanHanh, language);

  // Optional polish bằng GPT nếu bật USE_OPENAI và intent=general
  if (process.env.USE_OPENAI !== "false" && INTENT === "general") {
    try {
      const keyOk = await checkOpenAIKey();
      if (keyOk) {
        const sys = language === "vi"
          ? "Bạn là chuyên gia Bát Tự. Trả lời ngắn gọn, thân thiện. Không liệt kê dông dài."
          : "You are a BaZi expert. Be concise and friendly.";
        const { choices } = await callOpenAI({
          model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
          messages: [{ role: "system", content: sys }, { role: "user", content: base }],
          temperature: 0.3, max_tokens: 600
        });
        base = choices?.[0]?.message?.content?.trim() || base;
      }
    } catch (e) {
      console.warn("Polish skipped:", e.message);
    }
  }

  replyCache.set(cacheKey, base);
  return res.json({ answer: base, intent: INTENT });
});

// ================== BACKWARD COMPAT: endpoint cũ ==================
app.post("/api/luan-giai-bazi", async (req, res) => {
  const { messages, tuTruInfo, dungThan, sessionId = "legacy" } = req.body;
  // 1) phân tích khi chưa có
  if (!cache.get(`analysis:${sessionId}`)) {
    const r = await new Promise(resolve => {
      const req2 = { body: { sessionId, tuTruInfo, dungThan } };
      const res2 = { status: (c)=>({ json: (o)=>resolve({ code:c, body:o }) }), json: (o)=>resolve({ code:200, body:o }) };
      app._router.handle({ ...req2, method:"POST", url:"/api/phan-tich" }, res2, ()=>{});
    });
    if (r.code !== 200) return res.status(r.code).json(r.body);
  }
  // 2) trả lời theo câu hỏi cuối cùng
  const language = guessLanguage(messages);
  const question = (messages || []).slice().reverse().find(m=>m.role==="user")?.content || "";
  const r2 = await new Promise(resolve => {
    const req3 = { body: { sessionId, question, language } };
    const res3 = { status: (c)=>({ json: (o)=>resolve({ code:c, body:o }) }), json: (o)=>resolve({ code:200, body:o }) };
    app._router.handle({ ...req3, method:"POST", url:"/api/hoi" }, res3, ()=>{});
  });
  return res.status(r2.code).json({ answer: r2.body.answer, intent: r2.body.intent });
});

// ================== ERROR HANDLER ==================
app.use((err, req, res, next) => {
  try { fs.appendFileSync("error.log", `${new Date().toISOString()} - ${err.stack}\n`); } catch {}
  console.error("Lỗi hệ thống:", err.stack);
  res.status(500).json({ error: "System error occurred" });
});

// ================== SERVER ==================
const port = process.env.PORT || 10000;
const server = app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  try {
    const ok = await checkOpenAIKey();
    console.log(`OpenAI API key valid: ${ok}`);
  } catch (e) {
    console.error("Check OpenAI key error:", e.message);
  }
});
server.setTimeout(300000);
