// server.js
/**
 * BAZI API - phiên bản truyền cảm, tránh lặp, nhận biết chủ đề rộng, hỗ trợ lựa chọn.
 * - CORS chắc chắn + /diag để chẩn đoán
 * - Văn phong cảm xúc khi gặp "Hãy xem bát tự cho mình nhé"
 * - Xử lý câu hỏi lựa chọn (A/B, màu, nghề)
 * - Tránh lặp ý trong cùng hội thoại
 * - Fallback sinh nội bộ nếu OpenAI lỗi / tắt
 */

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

/* ================== BẢO MẬT & KẾT NỐI ================== */
const ALLOW_ORIGINS = (process.env.CORS_ORIGINS || "*")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin: function(origin, cb) {
    if (!origin || ALLOW_ORIGINS.includes("*") || ALLOW_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error("CORS blocked: " + origin));
  },
  methods: ["GET","HEAD","PUT","PATCH","POST","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
  credentials: true,
  maxAge: 86400
}));
app.options("*", cors());

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use(express.json({ limit: "1mb" }));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.get("/health", (req, res) => res.status(200).send("OK"));

/* ================== TIỆN ÍCH ================== */
const rmDiacritics = s => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const pct = n => `${(+n).toFixed(2)}%`;
const safeArr = v => Array.isArray(v) ? v : (v ? [v] : []);
const take = (arr, n) => arr.slice(0, n);
const uniq = arr => Array.from(new Set(arr));

const explainAxiosError = (err) => {
  if (err?.response) {
    return {
      type: "axios-response",
      status: err.response.status,
      statusText: err.response.statusText,
      data: err.response.data
    };
  }
  if (err?.request) return { type: "axios-request", code: err.code || null, message: err.message };
  return { type: "generic", message: err?.message || "unknown" };
};

/* ================== CAN–CHI & NGŨ HÀNH ================== */
const heavenlyStemsMap = {
  en: { Jia: "Giáp", Yi: "Ất", Bing: "Bính", Ding: "Đinh", Wu: "Mậu", Ji: "Kỷ", Geng: "Canh", Xin: "Tân", Ren: "Nhâm", Gui: "Quý" },
  vi: { Giáp: "Giáp", Ất: "Ất", Bính: "Bính", Đinh: "Đinh", Mậu: "Mậu", Kỷ: "Kỷ", Canh: "Canh", Tân: "Tân", Nhâm: "Nhâm", Quý: "Quý" }
};
const earthlyBranchesMap = {
  en: { Rat: "Tý", Ox: "Sửu", Tiger: "Dần", Rabbit: "Mão", Dragon: "Thìn", Snake: "Tỵ", Horse: "Ngọ", Goat: "Mùi", Monkey: "Thân", Rooster: "Dậu", Dog: "Tuất", Pig: "Hợi" },
  vi: { Tý: "Tý", Sửu: "Sửu", Dần: "Dần", Mão: "Mão", Thìn: "Thìn", Tỵ: "Tỵ", Ngọ: "Ngọ", Mùi: "Mùi", Thân: "Thân", Dậu: "Dậu", Tuất: "Tuất", Hợi: "Hợi" }
};

const heavenlyStemsVI = ["Giáp","Ất","Bính","Đinh","Mậu","Kỷ","Canh","Tân","Nhâm","Quý"];
const earthlyBranchesVI = ["Tý","Sửu","Dần","Mão","Thìn","Tỵ","Ngọ","Mùi","Thân","Dậu","Tuất","Hợi"];
const hoaGiap = Array.from({ length: 60 }, (_, i) => `${heavenlyStemsVI[i % 10]} ${earthlyBranchesVI[i % 12]}`);

const canNguHanh = { Giáp:"Mộc", Ất:"Mộc", Bính:"Hỏa", Đinh:"Hỏa", Mậu:"Thổ", Kỷ:"Thổ", Canh:"Kim", Tân:"Kim", Nhâm:"Thủy", Quý:"Thủy" };
const chiNguHanh = { Tý:"Thủy", Hợi:"Thủy", Sửu:"Thổ", Thìn:"Thổ", Mùi:"Thổ", Tuất:"Thổ", Dần:"Mộc", Mão:"Mộc", Tỵ:"Hỏa", Ngọ:"Hỏa", Thân:"Kim", Dậu:"Kim" };

const normalizeCanChi = (input) => {
  if (!input || typeof input !== "string") return null;
  const [rawCan, rawChi] = input.trim().split(/\s+/);
  if (!rawCan || !rawChi) return null;

  // VI trước
  const viCan = Object.keys(heavenlyStemsMap.vi);
  const viChi = Object.keys(earthlyBranchesMap.vi);
  const canVi = viCan.find(k => rmDiacritics(k).toLowerCase() === rmDiacritics(rawCan).toLowerCase());
  const chiVi = viChi.find(k => rmDiacritics(k).toLowerCase() === rmDiacritics(rawChi).toLowerCase());
  if (canVi && chiVi) return `${canVi} ${chiVi}`;

  // EN fallback
  const enCanKey = Object.keys(heavenlyStemsMap.en).find(k => k.toLowerCase() === rawCan.toLowerCase());
  const enChiKey = Object.keys(earthlyBranchesMap.en).find(k => k.toLowerCase() === rawChi.toLowerCase());
  if (enCanKey && enChiKey) {
    return `${heavenlyStemsMap.en[enCanKey]} ${earthlyBranchesMap.en[enChiKey]}`;
  }
  return null;
};

const parseEnglishTuTru = (input) => {
  try {
    if (!input) return null;
    // ví dụ: "Jia Zi day, Yi You month, Gui Hai hour, Yi Si year"
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
  for (const chi of branches) {
    (hiddenElements[chi] || []).forEach(h => { if (canNguHanh[h]) nguHanhCount[canNguHanh[h]] += 0.3; });
  }
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

/* ================== NGÔN NGỮ & Ý ĐỊNH ================== */
const guessLanguage = (messages) => {
  const txt = (messages || []).map(m => m.content || "").join(" ");
  const looksVI = /ngay|thang|nam|gio|giap|at|binh|dinh|mau|ky|canh|tan|nham|quy|ty|suu|dan|mao|thin|ty|ngo|mui|than|dau|tuat|hoi|b\u00E1t t\u1EF1|ng\u0169 h\u00E0nh/i.test(rmDiacritics(txt));
  return looksVI ? "vi" : "en";
};

/** Mở rộng keyword nhận ý định (đa lĩnh vực) */
const determineQuestionType = (userInputRaw, language) => {
  const s = rmDiacritics((userInputRaw || "").toLowerCase());
  const re = (r) => r.test(s);
  const or = (arr) => new RegExp(arr.join("|"), "i");

  const viMoney = ["tai van","tai loc","tien bac","tien","thu nhap","tai chinh","dau tu","chi tieu","kiem tien","vi tien","tai phu"];
  const enMoney = ["money","wealth","finance","income","invest","investment","spend","budget","cashflow"];
  const viCareer = ["su nghiep","cong viec","nghe nghiep","thang tien","chuyen mon","khoi nghiep","kinh doanh","doi nghe","doi cong viec"];
  const enCareer = ["career","job","work","promotion","startup","business","switch job"];
  const viFame = ["cong danh","danh tieng","uy tin","anh huong","noi tieng","thuong hieu ca nhan"];
  const enFame = ["fame","reputation","recognition","influence","brand"];
  const viHealth = ["suc khoe","benh","tam ly","cang thang","stress","an ngu","the luc","suc benh"];
  const enHealth = ["health","mental","stress","sleep","fitness","wellbeing"];
  const viLove = ["tinh duyen","tinh yeu","hon nhan","ket hon","nguoi yeu","vo chong","ly hon","chia tay"];
  const enLove = ["love","marriage","romance","relationship","partner","breakup","divorce"];
  const viFamily = ["gia dinh","gia dao","cha me","con cai","anh em","cha me con cai","mau thuan gia dinh"];
  const enFamily = ["family","parents","home","household","conflict at home"];
  const viChildren = ["con cai","nuoi day","hoc hanh cua con","sinh con","con trai","con gai"];
  const enChildren = ["children","kids","parenting","pregnancy"];
  const viProperty = ["bat dong san","nha cua","dat dai","tai san","mua nha","ban nha","chuyen nha","dinh cu"];
  const enProperty = ["property","real estate","house","move","relocation","asset"];
  const viStudy = ["hoc tap","thi cu","bang cap","nghien cuu","du hoc"];
  const enStudy = ["study","school","exam","research","scholarship"];
  const viTravel = ["du lich","di chuyen","cong tac","di xa","xuat hanh"];
  const enTravel = ["travel","trip","move abroad","commute","journey"];
  const viFriend = ["ban be","doi tac","hop tac","doi ngu","networking"];
  const enFriend = ["friends","partnership","collaboration","network"];
  const viFood = ["an uong","am thuc","che do an","keto","eat clean","chay","chay truong"];
  const enFood = ["diet","food","cuisine","nutrition","eat clean","vegan","vegetarian","keto"];
  const viSport = ["the thao","tap luyen","chay bo","bong da","yoga","boi loi","gym"];
  const enSport = ["sport","exercise","run","football","yoga","swim","gym","training"];
  const viPets = ["thu cung","meo","cho","nuoi thu","pet","choi voi thu cung"];
  const enPets = ["pet","dog","cat","pets"];
  const viHabit = ["thoi quen","ren luyen","tu ky luat","lam viec hieu qua","sang tao","thoi quen xau"];
  const enHabit = ["habit","discipline","routine","productivity","creativity"];
  const viChoice = ["hay","hoac","chon","nen chon","giu a hay b","mau nao","nghe nao","option","lua chon"];
  const enChoice = ["or","choose","pick","which","option A or B","color","job","select"];

  const flags = {
    isGeneral: false,
    isMoney: re(or([...viMoney, ...enMoney])),
    isCareer: re(or([...viCareer, ...enCareer])),
    isFame: re(or([...viFame, ...enFame])),
    isHealth: re(or([...viHealth, ...enHealth])),
    isLove: re(or([...viLove, ...enLove])),
    isFamily: re(or([...viFamily, ...enFamily])),
    isChildren: re(or([...viChildren, ...enChildren])),
    isProperty: re(or([...viProperty, ...enProperty])),
    isStudy: re(or([...viStudy, ...enStudy])),
    isTravel: re(or([...viTravel, ...enTravel])),
    isFriend: re(or([...viFriend, ...enFriend])),
    isFood: re(or([...viFood, ...enFood])),
    isSport: re(or([...viSport, ...enSport])),
    isPets: re(or([...viPets, ...enPets])),
    isHabit: re(or([...viHabit, ...enHabit])),
    isChoice: re(or([...viChoice, ...enChoice])),
    isThapThan: /thap than|ten gods/i.test(s),
    isThanSat: /than sat|auspicious|sao|quy nhan|dao hoa|van xuong|tuong tinh|dich ma|co than|qua tu|kiep sat|khong vong/i.test(s),
    isSummonBazi: /hay xem bat tu cho minh nhe|hay xem bat tu cho minh nhé|xem bat tu cho minh/i.test(s)
  };

  flags.isGeneral = !Object.values(flags).some(Boolean);
  return flags;
};

/* ================== META NGHỀ, MÀU, LỐI SỐNG ================== */
const elementMeta = {
  "Mộc": {
    vi: { colors: ["xanh lá","rêu","xanh ngọc"], jobs: ["giáo dục","thiết kế","nội dung","tư vấn phát triển"], foods: ["rau xanh, mầm, thảo dược"], sports: ["đi bộ dưới tán cây","đạp xe","yoga"], pets: ["chó hiền, mèo ngoan, cá cảnh"], traits: "ấm áp, phát triển bền bỉ" },
    en: { colors: ["green","teal","jade"], jobs: ["education","design","content","advisory"], foods: ["greens, sprouts, herbs"], sports: ["walking in parks","cycling","yoga"], pets: ["gentle dogs, calm cats, fish"], traits: "warm, steadily growing" }
  },
  "Hỏa": {
    vi: { colors: ["đỏ thẫm","cam đất","hồng san hô"], jobs: ["truyền thông","sân khấu","startup","năng lượng"], foods: ["gia vị ấm, trà gừng"], sports: ["chạy ngắn","HIIT","khiêu vũ"], pets: ["chó năng động"], traits: "nhiệt thành, bùng nổ đúng lúc" },
    en: { colors: ["deep red","burnt orange","coral"], jobs: ["media","stage","startup","energy"], foods: ["warming spices, ginger tea"], sports: ["sprints","HIIT","dance"], pets: ["active dogs"], traits: "warm-hearted, timely burst" }
  },
  "Thổ": {
    vi: { colors: ["vàng đất","be","nâu nhạt"], jobs: ["quản trị","vận hành","bất động sản"], foods: ["ngũ cốc, khoai củ"], sports: ["đi bộ ổn định","tập sức bền"], pets: ["chó trung thành"], traits: "vững chãi, đáng tin" },
    en: { colors: ["earth yellow","beige","taupe"], jobs: ["operations","management","real estate"], foods: ["grains, roots"], sports: ["steady walks","endurance"], pets: ["loyal dogs"], traits: "grounded and reliable" }
  },
  "Kim": {
    vi: { colors: ["trắng","bạc","xám nhạt"], jobs: ["tài chính","kỹ thuật","pháp chế"], foods: ["thanh đạm, ít dầu mỡ"], sports: ["tạ vừa sức","pilates"], pets: ["mèo sạch sẽ"], traits: "kỷ luật, chuẩn mực" },
    en: { colors: ["white","silver","light gray"], jobs: ["finance","engineering","compliance"], foods: ["light, clean"], sports: ["moderate weights","pilates"], pets: ["tidy cats"], traits: "disciplined and precise" }
  },
  "Thủy": {
    vi: { colors: ["xanh dương","đen than","xanh biển"], jobs: ["CNTT","nghiên cứu","logistics"], foods: ["đậu hạt, tảo biển"], sports: ["bơi","đi bộ ven sông"], pets: ["cá, rùa"], traits: "linh hoạt, sâu lắng" },
    en: { colors: ["blue","charcoal","navy"], jobs: ["IT","research","logistics"], foods: ["beans, seaweed"], sports: ["swimming","riverside walks"], pets: ["fish, turtles"], traits: "fluid and thoughtful" }
  },
};

/* ================== CHỌN LỰA (COLOR/JOB/GENERIC) ================== */
const COLOR_WORDS_VI = ["do","cam","vang","xanh","xanh la","xanh duong","hong","tim","den","trang","bac","xam","be","nau","xanh ngoc","xanh bien","ruou vang"];
const COLOR_WORDS_EN = ["red","orange","yellow","green","blue","pink","purple","black","white","silver","gray","beige","brown","teal","navy","coral","gold","jade"];
const JOB_WORDS_VI = ["tai chinh","ke toan","ky su","thiet ke","giao vien","ban hang","marketing","luat","cntt","data","nghien cuu","san xuat","bat dong san","startup","y te","truyen thong","sang tao"];
const JOB_WORDS_EN = ["finance","accounting","engineer","design","teacher","sales","marketing","law","it","data","research","manufacturing","real estate","startup","healthcare","media","creative"];

const extractChoices = (text, lang) => {
  const s = rmDiacritics((text || "").toLowerCase());
  // dạng "A hay B", "A hoặc B", "A or B", "chọn X, Y, Z?"
  const tokens = s
    .split(/[,\/]/g)
    .map(t => t.trim())
    .filter(Boolean);

  // thêm tách bởi " hay / hoặc / or "
  const splitHay = s.split(/\s+(hay|hoac|or)\s+/g).map(t=>t.trim()).filter(t => !/(hay|hoac|or)/.test(t) && t);

  let options = uniq(tokens.concat(splitHay));
  options = options.filter(o => o.length > 0 && o.length <= 40);

  // nhận dạng loại
  const isColor = options.some(o => (lang === "vi" ? COLOR_WORDS_VI : COLOR_WORDS_EN).some(w => o.includes(w)));
  const isJob = options.some(o => (lang === "vi" ? JOB_WORDS_VI : JOB_WORDS_EN).some(w => o.includes(w)));
  return { options: take(options, 8), type: isColor ? "color" : (isJob ? "job" : "generic") };
};

const scoreChoice = (option, context) => {
  const { chosenElement, lang } = context;
  if (!option) return 0;
  const o = rmDiacritics(option);

  // Color match
  const colorMap = {
    "Mộc": ["xanh la","xanh ngoc","green","teal","jade","rieu"],
    "Hỏa": ["do","coral","cam","orange","do tham","red","hong"],
    "Thổ": ["vang","be","nau","earth","beige","brown","taupe"],
    "Kim": ["trang","bac","xam","white","silver","gray","grey","light gray"],
    "Thủy": ["xanh duong","xanh bien","den","blue","navy","charcoal","black"]
  };
  const jobsMap = {
    "Mộc": ["giao vien","thiet ke","noi dung","design","education","content","advisory","tu van"],
    "Hỏa": ["truyen thong","san khau","media","startup","nang luong","performance"],
    "Thổ": ["quan tri","van hanh","bat dong san","real estate","operations","management"],
    "Kim": ["tai chinh","ky thuat","phap che","finance","engineering","compliance","law"],
    "Thủy": ["cntt","it","data","nghien cuu","research","logistics","logistic"]
  };

  let score = 0;
  // ưu tiên khớp với Dụng Thần
  safeArr(colorMap[chosenElement]).forEach(k => { if (o.includes(rmDiacritics(k))) score += 2; });
  safeArr(jobsMap[chosenElement]).forEach(k => { if (o.includes(rmDiacritics(k))) score += 2; });
  // cộng nhẹ nếu trung hòa yếu tố yếu
  if (context.weakElement) {
    if (chosenElement !== context.weakElement) score += 0.5;
  }
  // độ dài hợp lý
  if (option.length <= 20) score += 0.2;

  return score;
};

/* ================== VĂN PHONG & TRÁNH LẶP ================== */
const openersVI = [
  "Mình vừa xem qua tứ trụ của bạn và cảm nhận đầu tiên là:",
  "Nhìn vào lá số, mình thấy một mạch năng lượng rất rõ:",
  "Tứ trụ của bạn mở ra một câu chuyện khá thú vị:",
  "Điểm nổi bật ở lá số này là:"
];
const bridgesVI = [
  "Từ đó có thể gợi ý:",
  "Vì vậy, mình khuyên bạn:",
  "Nếu tinh gọn lại:",
  "Chuẩn hoá thành định hướng:"
];

const openersEN = [
  "Looking at your four pillars, the first impression is:",
  "Your chart reveals a clear flow of energy:",
  "Your Bazi tells a meaningful story:",
  "What stands out right away is:"
];
const bridgesEN = [
  "So the guidance is:",
  "That suggests:",
  "In short:",
  "Turn this into action:"
];

const pickVar = (arr, seed = 0) => arr[(Math.abs(seed) + arr.length) % arr.length];

const dedupeParagraphs = (text, messages) => {
  if (!text) return text;
  const prev = (messages || []).filter(m => m.role === "assistant").slice(-2).map(m => (m.content || "").trim());
  if (!prev.length) return text;
  let out = text.split("\n").filter(Boolean);
  const prevBlob = rmDiacritics(prev.join("\n").toLowerCase());
  out = out.filter(p => !prevBlob.includes(rmDiacritics(p.toLowerCase())));
  // nếu xoá quá tay, trả lại phần cốt lõi
  if (out.length < 3) return text;
  return out.join("\n");
};

/* ================== TẠO VĂN BẢN TRUYỀN CẢM (LOCAL) ================== */
const personalityDescriptions = {
  Mộc: { vi: "mạch Mộc ấm áp, giàu ý tưởng và biết cách nuôi dưỡng", en: "a warm Wood current—fertile with ideas and growth" },
  Hỏa: { vi: "mạch Hỏa nhiệt thành, quyết liệt và bừng sáng đúng lúc", en: "a fiery current—passionate, decisive, timely" },
  Thổ: { vi: "mạch Thổ vững chãi, thực tế và giữ nhịp ổn định", en: "an Earth current—grounded, steady, practical" },
  Kim: { vi: "mạch Kim kỷ luật, mạch lạc và ưa tinh gọn", en: "a Metal current—disciplined, clear, minimal" },
  Thủy: { vi: "mạch Thủy linh hoạt, sâu lắng và nhạy bén", en: "a Water current—fluid, reflective, perceptive" }
};

const generateIntroIfSummoned = (tuTru, nguHanhCount, lang) => {
  const nhatChu = tuTru.ngay.split(" ")[0];
  const hanh = canNguHanh[nhatChu];
  const entries = Object.entries(nguHanhCount);
  const total = entries.reduce((a,[,v])=>a+v,0) || 1;
  const perc = Object.fromEntries(entries.map(([k,v]) => [k, (v/total)*100]));
  const sorted = [...entries].sort((a,b)=>b[1]-a[1]);
  const dominant = sorted[0][0];
  const weak = sorted[sorted.length-1][0];
  const meta = elementMeta[hanh][lang];

  if (lang === "vi") {
    return [
      `Nhật Chủ **${nhatChu} (${hanh})**, ${personalityDescriptions[hanh].vi}.`,
      `Tương quan ngũ hành: Mộc ${pct(perc["Mộc"]||0)}, Hỏa ${pct(perc["Hỏa"]||0)}, Thổ ${pct(perc["Thổ"]||0)}, Kim ${pct(perc["Kim"]||0)}, Thủy ${pct(perc["Thủy"]||0)}.`,
      `Bức tranh tổng thể: **${dominant}** vượng – **${weak}** mỏng; chỉ cần điều tiết khéo là thế cục mở ra.`,
      `Mình sẽ luận theo câu hỏi của bạn ngay dưới đây.`
    ].join("\n");
  } else {
    return [
      `Day Master **${nhatChu} (${hanh})**, ${personalityDescriptions[hanh].en}.`,
      `Five-element mix: Wood ${pct(perc["Mộc"]||0)}, Fire ${pct(perc["Hỏa"]||0)}, Earth ${pct(perc["Thổ"]||0)}, Metal ${pct(perc["Kim"]||0)}, Water ${pct(perc["Thủy"]||0)}.`,
      `Overall shape: **${dominant}** strong – **${weak}** light; with fine-tuning, paths open.`,
      `Now I’ll speak right to your question.`
    ].join("\n");
  }
};

const generateByTopic = (topic, ctx) => {
  const { lang, nhatChu, dmHanh, chosenElement, dominant, weak, meta, thapThanResults, thanSatResults } = ctx;
  const opener = lang === "vi" ? openersVI : openersEN;
  const bridge = lang === "vi" ? bridgesVI : bridgesEN;
  const start = pickVar(opener, (topic||"").length);

  const starsActive = Object.values(thanSatResults||{}).filter(v => v.value && v.value.length);
  const starLine = starsActive.length
    ? (lang === "vi"
        ? `Một vài thần sát đang mở cửa: ${starsActive.map(v => v.vi + (v.value.length ? ` (${v.value.join(", ")})` : "")).join(" · ")}.`
        : `Some stars are active: ${starsActive.map(v => v.en + (v.value.length ? ` (${v.value.join(", ")})` : "")).join(" · ")}.`)
    : (lang === "vi" ? `Không có thần sát gây nhiễu đáng kể.` : `No disruptive star is prominent.`);

  const tthanCounts = {};
  Object.values(thapThanResults||{}).forEach(n => { if(!n) return; tthanCounts[n]=(tthanCounts[n]||0)+1; });
  const tthanTop = Object.entries(tthanCounts).sort((a,b)=>b[1]-a[1])[0]?.[0];

  const vi = {
    money: [
      `${start} năng lượng tiền tài xuất hiện theo hướng **${chosenElement}** – nghiêng về ${meta.jobs.join(", ")}.`,
      tthanTop ? `Thập Thần chủ đạo đang nghiêng về **${tthanTop}**, hợp mạch tích lũy ổn định.` : `Đà tích lũy tốt nếu chọn nhịp ổn định, tránh nước rút.`,
      `${pickVar(bridge, 1)} hãy quản trị dòng tiền thật rõ ràng, ưu tiên khoản sinh lãi đều; giữ kỷ luật khi ${dominant} vượng, đừng để ${weak} quá mỏng.`,
    ],
    career: [
      `${start} sự nghiệp hưởng lợi khi bạn đặt mình ở vai trò ${meta.jobs.slice(0,2).join(" / ")} – nơi ${dmHanh.toLowerCase()} phát huy.`,
      tthanTop ? `Thập Thần nổi trội: **${tthanTop}** – thuận đường chuyên môn, xét tiêu chuẩn minh bạch.` : `Ưu tiên chất lượng và nhịp học hỏi đều.`,
      `${pickVar(bridge, 2)} chọn dự án có cấu trúc rõ; thêm một mảnh **${chosenElement}** mỗi ngày là tiến triển thấy được.`,
    ],
    love: [
      `${start} chuyện tình cảm cần nhịp **vừa ấm vừa ổn**: ${dmHanh} giúp bạn chân thành, nhưng hãy cho nhau khoảng thở của **${weak}**.`,
      starLine,
      `${pickVar(bridge, 3)} nói điều mình cần – nhẹ mà thật. Hợp tác thay vì so bì, lửa vừa đủ sẽ làm ấm chứ không làm bỏng.`,
    ],
    family: [
      `${start} gia đình là nền **${dominant}** đang vững, chỉ cần bù cho phần **${weak}** là chạm được hoà khí.`,
      starLine,
      `${pickVar(bridge, 0)} thiết lập giờ trò chuyện cố định; mỗi tuần thêm một thói quen nhỏ gắn kết là đủ.`,
    ],
    health: [
      `${start} sức khỏe cải lên khi bạn giữ nhịp ổn định: **${dmHanh}** ưa điều độ hơn là bứt phá ngắn hạn.`,
      `${pickVar(bridge, 1)} ngủ đủ – ăn sạch – vận động vừa tầm (${meta.sports.slice(0,2).join(", ")}).`,
    ],
    fame: [
      `${start} uy tín đến từ sự mạch lạc: ${dmHanh} đưa bạn về phía **chất lượng trước, tiếng sau**.`,
      tthanTop ? `Điểm tựa Thập Thần: **${tthanTop}** – xây hồ sơ cá nhân chắc tay.` : `Viết – chia sẻ – đóng góp, rồi danh tiếng tự đến.`,
    ],
    property: [
      `${start} tài sản cố định nên đi **từ nhỏ đến vừa**, chọn vị trí vững (hợp **${chosenElement}**).`,
      `${pickVar(bridge, 2)} ưu tiên dòng tiền an toàn trước, tăng tỷ trọng sau khi hệ số rủi ro rõ ràng.`,
    ],
    children: [
      `${start} con trẻ hợp môi trường **mở và đều**: học qua trải nghiệm, khen sự cố gắng thay vì chỉ kết quả.`,
      `${pickVar(bridge, 1)} mỗi tuần cùng con một dự án nhỏ – bền hơn mọi buổi học quá tải.`,
    ],
    study: [
      `${start} học tập hiệu quả khi bạn chia mạch **ngắn – rõ – đều**.`,
      `${pickVar(bridge, 3)} ôn theo vòng lặp 2-7-30; biến kiến thức thành sản phẩm nhỏ.`,
    ],
    travel: [
      `${start} nên ưu tiên hành trình **gọn và có chủ đích** – hợp ${dmHanh.toLowerCase()}.`,
      `${pickVar(bridge, 0)} lịch trình chừa khoảng thở; mỗi điểm đến một ý nghĩa, ít mà sâu.`,
    ],
    friend: [
      `${start} đối tác hợp là người bổ phần **${weak}** đang thiếu, để bạn giữ mũi nhọn ở **${dominant}**.`,
      `${pickVar(bridge, 2)} rõ ràng mục tiêu – trách nhiệm – kênh trao đổi.`,
    ],
    food: [
      `${start} ẩm thực nên thiên về **sạch và vừa phải**: ${meta.foods.join(", ")}.`,
      `${pickVar(bridge, 1)} ăn chậm – tiêu thụ đủ, đừng sa đà khẩu vị quá mạnh khi **${dominant}** đã vượng.`,
    ],
    sport: [
      `${start} thể thao hợp nhịp **vừa đằm, đều tay**: ${meta.sports.join(", ")}.`,
      `${pickVar(bridge, 0)} đo bằng cảm nhận cơ thể hơn là chỉ số đơn lẻ.`,
    ],
    pets: [
      `${start} thú cưng nên chọn tính **dịu – đều** phù hợp lịch sinh hoạt.`,
      `${pickVar(bridge, 3)} dành thời gian chất lượng thay vì thật nhiều nhưng rời rạc.`,
    ],
    habit: [
      `${start} thói quen nên bám **nhịp ngày** thay vì chờ cảm hứng.`,
      `${pickVar(bridge, 1)} mỗi tuần tăng 5% độ khó – ít mà đều, kết quả rất thật.`,
    ],
    thapthan: [
      `${start} Thập Thần đang vẽ nét nghiêng: **${tthanTop || "không nổi trội"}**.`,
      `${pickVar(bridge, 2)} chủ động đặt mình đúng vai trò để tận dụng thế này.`,
    ],
    thansat: [
      `${start} ${starLine}`,
      `${pickVar(bridge, 0)} biết điểm mạnh để bật, biết điểm nhiễu để né – vậy là đủ.`,
    ],
    generic: [
      `${start} mình đã đọc khí mạch lá số và hiểu điều bạn quan tâm.`,
      `${pickVar(bridge, 1)} nếu muốn đi sâu, bạn có thể hỏi rõ tình huống – mình sẽ soi đúng chỗ, nói đúng phần cần.`,
    ]
  };

  const en = { // rút gọn tiếng Anh
    money: [`${start} your wealth flow leans on **${chosenElement}** roles like ${meta.jobs.join(", ")}.`, starLine],
    career: [`${start} your career grows where ${dmHanh.toLowerCase()} shines—${meta.jobs.slice(0,2).join(" / ")}.`],
    love: [`${start} love likes **warm yet breathable** rhythm—mind the light **${weak}** part.`],
    family: [`${start} family is your steady ground; fill the **${weak}** gap and harmony settles.`],
    health: [`${start} health improves with steady rhythms; choose ${meta.sports.slice(0,2).join(", ")}.`],
    fame: [`${start} reputation follows clarity—quality first, noise later.`],
    property: [`${start} go **small to mid** in assets, prioritize safe cashflow.`],
    children: [`${start} children thrive on open, even-paced learning.`],
    study: [`${start} study best in short, clear, regular loops.`],
    travel: [`${start} travel light and intentional—less but deep.`],
    friend: [`${start} partners who fill **${weak}** let you keep **${dominant}** sharp.`],
    food: [`${start} go clean and moderate: ${meta.foods.join(", ")}.`],
    sport: [`${start} pick ${meta.sports.join(", ")} with body feedback as the compass.`],
    pets: [`${start} gentle pets match your daily cadence.`],
    habit: [`${start} routines over moods—tiny weekly upgrades compound.`],
    thapthan: [`${start} Ten Gods tilt: **${tthanTop || "none dominant"}**.`],
    thansat: [`${start} ${starLine}`],
    generic: [`${start} I’ve read your chart’s pulse and hear your concern.`],
  };

  const bank = lang === "vi" ? vi : en;
  return (bank[topic] || bank.generic).join("\n");
};

const generateChoiceAnswer = (choiceInfo, ctx) => {
  const { options, type } = choiceInfo;
  const { lang, chosenElement, weakElement } = ctx;
  if (!options.length) return "";

  // chấm điểm
  const scored = options.map(opt => ({ opt, s: scoreChoice(opt, { chosenElement, weakElement, lang }) }))
                        .sort((a,b)=>b.s-a.s);

  const top = take(scored, 3);
  if (lang === "vi") {
    return [
      `Về lựa chọn của bạn:`,
      type === "color"
        ? `• Theo mạch **${chosenElement}**, màu khuyến nghị: ${top.map(t=>t.opt).join(", ")}.`
        : type === "job"
          ? `• Nghề hợp hệ **${chosenElement}**: ${top.map(t=>t.opt).join(", ")}.`
          : `• Gợi ý ưu tiên: ${top.map(t=>t.opt).join(", ")}.`,
      `Lý do: tăng phần cần bù và giữ mũi nhọn nơi bạn mạnh.`
    ].join("\n");
  }
  return [
    `Regarding your options:`,
    type === "color"
      ? `• For **${chosenElement}**, recommended colors: ${top.map(t=>t.opt).join(", ")}.`
      : type === "job"
        ? `• Careers aligned with **${chosenElement}**: ${top.map(t=>t.opt).join(", ")}.`
        : `• Suggested priority: ${top.map(t=>t.opt).join(", ")}.`,
    `Reason: reinforce what’s needed while keeping your edge.`
  ].join("\n");
};

const generateResponse = (tuTru, nguHanhCount, thapThanResults, thanSatResults, dungThan, userInput, messages, lang, flags) => {
  const language = lang || guessLanguage(messages);
  const nhatChu = tuTru.ngay.split(" ")[0];
  const dmHanh = canNguHanh[nhatChu];
  const entries = Object.entries(nguHanhCount);
  const total = entries.reduce((a,[,v])=>a+v,0) || 1;
  const sorted = [...entries].sort((a,b)=>b[1]-a[1]);
  const dominant = sorted[0][0];
  const weak = sorted[sorted.length-1][0];

  const dungs = Array.isArray(dungThan) ? dungThan : [];
  const chosenElement = dungs[0] || dominant;
  const meta = elementMeta[chosenElement][language];

  // intro truyền cảm khi có mệnh lệnh “Hãy xem bát tự…”
  const intro = flags.isSummonBazi ? generateIntroIfSummoned(tuTru, nguHanhCount, language) : "";

  const ctx = { lang: language, nhatChu, dmHanh, chosenElement, dominant, weak, meta, thapThanResults, thanSatResults, weakElement: weak };

  // ghép theo chủ đề
  const parts = [];
  if (intro) parts.push(intro);

  if (flags.isMoney) parts.push(generateByTopic("money", ctx));
  if (flags.isCareer) parts.push(generateByTopic("career", ctx));
  if (flags.isFame) parts.push(generateByTopic("fame", ctx));
  if (flags.isHealth) parts.push(generateByTopic("health", ctx));
  if (flags.isLove) parts.push(generateByTopic("love", ctx));
  if (flags.isFamily) parts.push(generateByTopic("family", ctx));
  if (flags.isChildren) parts.push(generateByTopic("children", ctx));
  if (flags.isProperty) parts.push(generateByTopic("property", ctx));
  if (flags.isStudy) parts.push(generateByTopic("study", ctx));
  if (flags.isTravel) parts.push(generateByTopic("travel", ctx));
  if (flags.isFriend) parts.push(generateByTopic("friend", ctx));
  if (flags.isFood) parts.push(generateByTopic("food", ctx));
  if (flags.isSport) parts.push(generateByTopic("sport", ctx));
  if (flags.isPets) parts.push(generateByTopic("pets", ctx));
  if (flags.isHabit) parts.push(generateByTopic("habit", ctx));
  if (flags.isThapThan) parts.push(generateByTopic("thapthan", ctx));
  if (flags.isThanSat) parts.push(generateByTopic("thansat", ctx));
  if (flags.isGeneral) parts.push(generateByTopic("generic", ctx));

  // xử lý câu hỏi lựa chọn
  if (flags.isChoice) {
    const choiceInfo = extractChoices(userInput, language);
    const choiceText = generateChoiceAnswer(choiceInfo, ctx);
    if (choiceText) parts.push(choiceText);
  }

  // tránh lặp với 1–2 câu trả lời trước
  const text = dedupeParagraphs(parts.filter(Boolean).join("\n\n"), messages);
  return text.trim();
};

/* ================== OPENAI ================== */
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
    if (err.response && err.response.status === 401) return false;
    return true; // endpoint nghẽn vẫn coi là có key, để fallback quyết định sau
  }
};

const callOpenAI = async (payload, retries = 2, delay = 1200) => {
  if (!process.env.OPENAI_API_KEY) throw new Error("Missing OpenAI API key");
  if (!payload.model || !payload.messages) throw new Error("Invalid payload");

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        payload,
        { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" }, timeout: 30000 }
      );
      return response.data;
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) throw new Error("Invalid API key");
      if (attempt === retries || status === 429) throw new Error(err.message || "OpenAI error");
      await new Promise(r => setTimeout(r, delay * attempt));
    }
  }
};

/* ================== ROUTES ================== */
app.get("/diag", async (req, res) => {
  const out = {
    ok: true,
    time: new Date().toISOString(),
    hasApiKey: !!process.env.OPENAI_API_KEY,
    useOpenAI: process.env.USE_OPENAI !== "false"
  };
  try {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
    if (out.useOpenAI && out.hasApiKey) {
      try {
        const r = await axios.post("https://api.openai.com/v1/chat/completions", {
          model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 1
        }, {
          headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
          timeout: 8000
        });
        out.openaiReachable = true;
        out.model = r.data?.model || (process.env.OPENAI_MODEL || "gpt-3.5-turbo");
      } catch (e) {
        out.openaiReachable = false;
        out.openaiError = e.response?.status || e.code || e.message;
      }
    }
  } catch (e) {
    out.ok = false;
    out.error = e.message;
  }
  res.json(out);
});

app.post("/api/luan-giai-bazi", async (req, res) => {
  const startTime = Date.now();
  try {
    const { messages, tuTruInfo, dungThan } = req.body;
    const language = guessLanguage(messages);
    const userInput = (messages || []).slice().reverse().find(m => m.role === "user")?.content || "";
    const flags = determineQuestionType(userInput, language);

    // Cache theo nội dung & ngôn ngữ
    const cacheKey = `${tuTruInfo}-${userInput}-${language}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ answer: cached });

    // Validate
    if (!Array.isArray(messages) || !messages.length) {
      return res.status(400).json({ error: language === "vi" ? "Thiếu messages" : "Missing messages" });
    }
    if (!tuTruInfo || typeof tuTruInfo !== "string") {
      return res.status(400).json({ error: language === "vi" ? "Thiếu tuTruInfo" : "Missing tuTruInfo" });
    }
    const dungThanHanh = Array.isArray(dungThan) ? dungThan : (dungThan?.hanh || []);
    if (!dungThanHanh.every(d => ["Mộc","Hỏa","Thổ","Kim","Thủy"].includes(d))) {
      return res.status(400).json({ error: language === "vi" ? "Dụng Thần không hợp lệ" : "Invalid Useful God" });
    }

    // Parse Tứ Trụ
    let tuTru;
    try {
      tuTru = JSON.parse(tuTruInfo);
      tuTru = { gio: normalizeCanChi(tuTru.gio), ngay: normalizeCanChi(tuTru.ngay), thang: normalizeCanChi(tuTru.thang), nam: normalizeCanChi(tuTru.nam) };
      if (!tuTru.gio || !tuTru.ngay || !tuTru.thang || !tuTru.nam) throw new Error("invalid");
    } catch {
      tuTru = parseEnglishTuTru(userInput);
      if (!tuTru?.gio || !tuTru?.ngay || !tuTru?.thang || !tuTru?.nam) {
        return res.status(400).json({ error: language === "vi" ? "Tứ Trụ không hợp lệ" : "Invalid Four Pillars" });
      }
    }

    // Phân tích cốt lõi
    let nguHanh, thapThanResults = {}, thanSatResults = {};
    try { nguHanh = analyzeNguHanh(tuTru); }
    catch { return res.status(400).json({ error: language === "vi" ? "Dữ liệu ngũ hành không hợp lệ" : "Invalid Five Elements" }); }

    try { thapThanResults = tinhThapThan(tuTru.ngay?.split(" ")[0], tuTru); }
    catch (e) { console.error("Lỗi Thập Thần:", e.message); }

    try { thanSatResults = tinhThanSat(tuTru); }
    catch (e) {
      console.error("Lỗi Thần Sát:", e.message);
      return res.status(400).json({ error: language === "vi" ? "Lỗi tính Thần Sát" : "Error calculating Auspicious Stars" });
    }

    // Văn bản nội bộ (truyền cảm + chống lặp)
    const baseText = generateResponse(tuTru, nguHanh, thapThanResults, thanSatResults, dungThanHanh, userInput, messages, language, flags);

    const useOpenAI = process.env.USE_OPENAI !== "false";
    if (!useOpenAI) {
      cache.set(cacheKey, baseText);
      console.log(`Processing time: ${Date.now() - startTime}ms`);
      return res.json({ answer: baseText });
    }

    // Gửi OpenAI “đánh bóng” ngắn gọn, không bịa ngày tháng, giữ thuật ngữ
    const keyOk = await checkOpenAIKey();
    if (!keyOk) {
      cache.set(cacheKey, baseText);
      return res.json({ answer: baseText, warning: language === "vi" ? "OpenAI không khả dụng – dùng bản nội bộ." : "OpenAI unavailable – used local draft." });
    }

    // Nếu câu hỏi ngoài lề quá → cho GPT trả lời trực tiếp nhưng có ngữ cảnh Bazi
    const directMisc = (!Object.values(flags).some(Boolean) || (!flags.isMoney && !flags.isCareer && !flags.isLove && !flags.isFamily && !flags.isHealth && !flags.isProperty && !flags.isStudy && !flags.isTravel && !flags.isFriend && !flags.isFood && !flags.isSport && !flags.isPets && !flags.isHabit && !flags.isThapThan && !flags.isThanSat && !flags.isChoice));
    const polishInstructionVI = `Viết lại đoạn dưới đây với giọng ấm áp, truyền cảm nhưng súc tích, tránh lặp, không bịa mốc thời gian. Giữ nguyên các thuật ngữ Bát Tự (can, chi, ngũ hành, thập thần, thần sát).`;
    const polishInstructionEN = `Rewrite warmly and evocatively but concise; avoid repetition and do not invent dates. Preserve Bazi terms (stems, branches, five elements, ten gods, stars).`;

    const systemPrompt = (language === "vi")
      ? "Bạn là chuyên gia Bát Tự nói ngắn gọn, ấm áp, không phô trương, không lặp, không bịa mốc thời gian."
      : "You are a Bazi expert: warm, succinct, no fluff, no repetition, no invented dates.";

    const polishMessages = directMisc
      ? [
          { role: "system", content: systemPrompt },
          { role: "user", content: `${language === "vi" ? "Ngữ cảnh Bát Tự:" : "Bazi context:"}\n${baseText}\n\n${language === "vi" ? "Câu hỏi:" : "Question:"} ${userInput}\n\n${language === "vi" ? "Yêu cầu:" : "Instruction:"} ${polishInstructionVI}` }
        ]
      : [
          { role: "system", content: systemPrompt },
          { role: "user", content: `${language === "vi" ? polishInstructionVI : polishInstructionEN}\n\n---\n${baseText}` }
        ];

    const gptRes = await callOpenAI({
      model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
      messages: polishMessages,
      temperature: Number(process.env.OPENAI_TEMPERATURE || 0.55),
      top_p: Number(process.env.OPENAI_TOP_P || 0.95),
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || "1200", 10)
    });

    const answer = gptRes?.choices?.[0]?.message?.content?.trim() || baseText;
    const finalAnswer = dedupeParagraphs(answer, messages); // tránh lặp lần cuối

    cache.set(cacheKey, finalAnswer);
    console.log(`Processing time: ${Date.now() - startTime}ms`);
    return res.json({ answer: finalAnswer });
  } catch (err) {
    const detail = explainAxiosError(err);
    try { fs.appendFileSync("error.log", `${new Date().toISOString()} - ${JSON.stringify(detail)}\n`); } catch {}
    console.error("API error:", detail);
    return res.status(500).json({ error: "System error occurred", detail });
  }
});

/* ================== ERROR HANDLER ================== */
app.use((err, req, res, next) => {
  const payload = { error: "System error occurred", detail: explainAxiosError(err) };
  try { fs.appendFileSync("error.log", `${new Date().toISOString()} - ${JSON.stringify(payload)}\n`); } catch {}
  console.error("SystemError:", payload);
  res.status(500).json(payload);
});

/* ================== SERVER ================== */
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
