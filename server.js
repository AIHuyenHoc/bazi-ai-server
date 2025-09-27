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
const cache = new NodeCache({ stdTTL: 600 });

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/health", (req, res) => res.status(200).send("OK"));

/* ========== CAN–CHI & UTIL ========== */
const heavenlyStemsMap = {
  en: { Jia:"Giáp", Yi:"Ất", Bing:"Bính", Ding:"Đinh", Wu:"Mậu", Ji:"Kỷ", Geng:"Canh", Xin:"Tân", Ren:"Nhâm", Gui:"Quý" },
  vi: { Giáp:"Giáp", Ất:"Ất", Bính:"Bính", Đinh:"Đinh", Mậu:"Mậu", Kỷ:"Kỷ", Canh:"Canh", Tân:"Tân", Nhâm:"Nhâm", Quý:"Quý" }
};
const earthlyBranchesMap = {
  en: { Rat:"Tý", Ox:"Sửu", Tiger:"Dần", Rabbit:"Mão", Dragon:"Thìn", Snake:"Tỵ", Horse:"Ngọ", Goat:"Mùi", Monkey:"Thân", Rooster:"Dậu", Dog:"Tuất", Pig:"Hợi" },
  vi: { Tý:"Tý", Sửu:"Sửu", Dần:"Dần", Mão:"Mão", Thìn:"Thìn", Tỵ:"Tỵ", Ngọ:"Ngọ", Mùi:"Mùi", Thân:"Thân", Dậu:"Dậu", Tuất:"Tuất", Hợi:"Hợi" }
};
const rmDiacritics = s => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const hashStr = s => [...(s||"")].reduce((a,c)=>((a<<5)-a)+c.charCodeAt(0)|0,0);
const pick = (arr, seed) => arr[Math.abs(hashStr(seed)) % arr.length];

/* Chuẩn hoá “Giáp Tý” / “Jia Zi” */
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

/* Parser tiếng Anh linh hoạt */
const parseEnglishTuTru = (input) => {
  try {
    if (!input) return null;
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

/* 60 Hoa Giáp (auto) */
const heavenlyStemsVI = ["Giáp","Ất","Bính","Đinh","Mậu","Kỷ","Canh","Tân","Nhâm","Quý"];
const earthlyBranchesVI = ["Tý","Sửu","Dần","Mão","Thìn","Tỵ","Ngọ","Mùi","Thân","Dậu","Tuất","Hợi"];
const hoaGiap = Array.from({ length: 60 }, (_, i) => `${heavenlyStemsVI[i % 10]} ${earthlyBranchesVI[i % 12]}`);

/* ========== NGŨ HÀNH / THẬP THẦN / THẦN SÁT ========== */
const canNguHanh = { Giáp:"Mộc", Ất:"Mộc", Bính:"Hỏa", Đinh:"Hỏa", Mậu:"Thổ", Kỷ:"Thổ", Canh:"Kim", Tân:"Kim", Nhâm:"Thủy", Quý:"Thủy" };
const chiNguHanh = { Tý:"Thủy", Hợi:"Thủy", Sửu:"Thổ", Thìn:"Thổ", Mùi:"Thổ", Tuất:"Thổ", Dần:"Mộc", Mão:"Mộc", Tỵ:"Hỏa", Ngọ:"Hỏa", Thân:"Kim", Dậu:"Kim" };

const analyzeNguHanh = (tuTru) => {
  const nguHanhCount = { Mộc: 0, Hỏa: 0, Thổ: 0, Kim: 0, Thủy: 0 };
  const hidden = {
    Tý:["Quý"], Sửu:["Kỷ","Tân","Quý"], Dần:["Giáp","Bính","Mậu"], Mão:["Ất"],
    Thìn:["Mậu","Ất","Quý"], Tỵ:["Bính","Canh","Mậu"], Ngọ:["Đinh","Kỷ"],
    Mùi:["Kỷ","Đinh","Ất"], Thân:["Canh","Nhâm","Mậu"], Dậu:["Tân"],
    Tuất:["Mậu","Đinh","Tân"], Hợi:["Nhâm","Giáp"]
  };
  const parts = [
    ...(tuTru.nam||"").split(" "), ...(tuTru.thang||"").split(" "),
    ...(tuTru.ngay||"").split(" "), ...(tuTru.gio||"").split(" ")
  ].filter(Boolean);
  const branches = [tuTru.nam?.split(" ")[1], tuTru.thang?.split(" ")[1], tuTru.ngay?.split(" ")[1], tuTru.gio?.split(" ")[1]].filter(Boolean);
  if (parts.length < 8 || branches.length < 4) throw new Error("Tứ Trụ không đầy đủ");

  for (const p of parts) {
    if (canNguHanh[p]) nguHanhCount[canNguHanh[p]] += 1;
    if (chiNguHanh[p]) nguHanhCount[chiNguHanh[p]] += 1;
  }
  for (const chi of branches) {
    (hidden[chi] || []).forEach(h => { if (canNguHanh[h]) nguHanhCount[canNguHanh[h]] += 0.3; });
  }
  const total = Object.values(nguHanhCount).reduce((a,b)=>a+b,0);
  if (!total) throw new Error("Không tìm thấy ngũ hành hợp lệ");
  return nguHanhCount;
};

const tinhThapThan = (nhatChu, tuTru) => {
  if (!nhatChu || !canNguHanh[nhatChu]) throw new Error("Nhật Chủ không hợp lệ");
  const map = {
    Kim: { Kim:["Tỷ Kiên","Kiếp Tài"], Thủy:["Thực Thần","Thương Quan"], Mộc:["Chính Tài","Thiên Tài"], Hỏa:["Chính Quan","Thất Sát"], Thổ:["Chính Ấn","Thiên Ấn"] },
    Mộc: { Mộc:["Tỷ Kiên","Kiếp Tài"], Hỏa:["Thực Thần","Thương Quan"], Thổ:["Chính Tài","Thiên Tài"], Kim:["Chính Quan","Thất Sát"], Thủy:["Chính Ấn","Thiên Ấn"] },
    Hỏa: { Hỏa:["Tỷ Kiên","Kiếp Tài"], Thổ:["Thực Thần","Thương Quan"], Kim:["Chính Tài","Thiên Tài"], Thủy:["Chính Quan","Thất Sát"], Mộc:["Chính Ấn","Thiên Ấn"] },
    Thổ: { Thổ:["Tỷ Kiên","Kiếp Tài"], Kim:["Thực Thần","Thương Quan"], Thủy:["Chính Tài","Thiên Tài"], Mộc:["Chính Quan","Thất Sát"], Hỏa:["Chính Ấn","Thiên Ấn"] },
    Thủy:{ Thủy:["Tỷ Kiên","Kiếp Tài"], Mộc:["Thực Thần","Thương Quan"], Hỏa:["Chính Tài","Thiên Tài"], Thổ:["Chính Quan","Thất Sát"], Kim:["Chính Ấn","Thiên Ấn"] },
  };
  const isYang = ["Giáp","Bính","Mậu","Canh","Nhâm"].includes(nhatChu);
  const out = {};
  const cans = [tuTru.gio?.split(" ")[0], tuTru.thang?.split(" ")[0], tuTru.nam?.split(" ")[0]].filter(Boolean);
  const chis = [tuTru.gio?.split(" ")[1], tuTru.ngay?.split(" ")[1], tuTru.thang?.split(" ")[1], tuTru.nam?.split(" ")[1]].filter(Boolean);
  if (cans.length < 3 || chis.length < 4) throw new Error("Tứ Trụ không đầy đủ");

  for (const c of cans) {
    if (c === nhatChu) continue;
    const h = canNguHanh[c]; if (!h) continue;
    const sameYang = ["Giáp","Bính","Mậu","Canh","Nhâm"].includes(c);
    out[c] = map[canNguHanh[nhatChu]][h][(isYang === sameYang) ? 0 : 1];
  }
  for (const chi of chis) {
    const h = chiNguHanh[chi]; if (!h) continue;
    const chiYang = ["Tý","Dần","Thìn","Ngọ","Thân","Tuất"].includes(chi);
    out[chi] = map[canNguHanh[nhatChu]][h][(isYang === chiYang) ? 0 : 1];
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
    "Tướng Tinh":        { vi:"Tướng Tinh",        en:"General Star",   value: branches.includes(tuongTinh[ngayChi]) ? [tuongTinh[ngayChi]] : [] },
    "Văn Xương":         { vi:"Văn Xương",         en:"Literary Star",  value: vanXuong[nhatChu]?.filter(c=>branches.includes(c)) || [] },
    "Đào Hoa":           { vi:"Đào Hoa",           en:"Peach Blossom",  value: branches.includes(daoHoa[ngayChi]) ? [daoHoa[ngayChi]] : [] },
    "Dịch Mã":           { vi:"Dịch Mã",           en:"Traveling Horse",value: branches.includes(dichMa[ngayChi]) ? [dichMa[ngayChi]] : [] },
    "Cô Thần Quả Tú":    { vi:"Cô Thần Quả Tú",    en:"Loneliness Star",value: coThanQuaTu[ngayChi]?.filter(c=>branches.includes(c)) || [] },
    "Kiếp Sát":          { vi:"Kiếp Sát",          en:"Robbery Star",   value: branches.includes(kiepSat[ngayChi]) ? [kiepSat[ngayChi]] : [] },
    "Không Vong":        { vi:"Không Vong",        en:"Void Star",      value: (khongVong[tuTru.ngay]||[]).filter(c=>branches.includes(c)) }
  };
};

/* ========== NGÔN NGỮ & INTENT ========== */
const personalityDescriptions = {
  Mộc: { vi: "sáng tạo, linh hoạt, thông minh" },
  Hỏa: { vi: "nhiệt huyết, chủ động" },
  Thổ: { vi: "vững chãi, thực tế" },
  Kim: { vi: "kỷ luật, quyết đoán" },
  Thủy:{ vi: "nhạy bén, uyển chuyển" }
};

const guessLanguage = (messages) =>
  /ngay|thang|nam|gio|giap|at|binh|dinh|mau|ky|canh|tan|nham|quy|ty|suu|dan|mao|thin|ty|ngo|mui|than|dau|tuat|hoi/i
    .test(rmDiacritics((messages||[]).map(m=>m.content||"").join(" "))) ? "vi" : "vi";

/* intent phong phú hơn (đầu tư, ck, crypto, vàng, bđs, tiết kiệm…) */
const determineQuestionType = (userInput) => {
  const s = rmDiacritics(userInput || "").toLowerCase();

  const isMoney =
    /tai van|tai loc|tien bac|tien nong|thu nhap|luong|thuong|tai chinh|dong tien|dau tu|chung khoan|ck|co phieu|crypto|coin|vang|vay|tiet kiem|wealth|finance|money/.test(s);

  const isCareer =
    /su nghiep|cong viec|nghe nghiep|thang tien|chuyen mon|job|career|promotion|startup|doi nghe/.test(s);

  const isFame =
    /cong danh|danh tieng|reputation|noi tieng|thanh danh|fame|branding|hinh anh/.test(s);

  const isHealth =
    /suc khoe|benh|om|tam ly|stress|met moi|health|sleep|ngu|an uong/.test(s);

  const isLove =
    /tinh yeu|tinh cam|hon nhan|vo chong|nguoi yeu|ket hon|romance|love|gai/ .test(s);

  const isFamily =
    /gia dao|gia dinh|cha me|bo me|ba me|anh chi em|noi bo|mau thuan|hoa khi|family/.test(s);

  const isChildren =
    /con cai|con trai|con gai|tre con|hoc hanh|nuoi day|children|child/.test(s);

  const isProperty =
    /bat dong san|bds|nha dat|dat dai|tai san co dinh|property|real estate|mua nha|mua dat/.test(s);

  const isTiming =
    /khi nao|thoi diem|bao gio|may man|hanh van|thuan loi|time|timing/.test(s);

  const isThapThan = /thap than|ten gods|than nao/.test(s);
  const isThanSat  = /than sat|sao|quy nhan|dao hoa|van xuong|tuong tinh|dich ma|co than|qua tu|khong vong/.test(s);

  const isOverviewAsk = /(xem bat tu|luan giai|tong quan|doc la so|xem la so)/.test(s);
  const isGeneral = !(isMoney||isCareer||isFame||isHealth||isLove||isFamily||isChildren||isProperty||isTiming||isThapThan||isThanSat||isOverviewAsk);

  return { isMoney,isCareer,isFame,isHealth,isLove,isFamily,isChildren,isProperty,isTiming,isThapThan,isThanSat,isOverviewAsk,isGeneral };
};

const elementPercent = (nguHanh) => {
  const total = Object.values(nguHanh).reduce((a,b)=>a+b,0)||1;
  const pct = {};
  for (const [k,v] of Object.entries(nguHanh)) pct[k] = +(v*100/total).toFixed(2);
  return pct;
};
const groupTenGods = (thapThan) => {
  const c = { tai:0, quan:0, an:0, thuc:0 };
  Object.values(thapThan || {}).forEach(name => {
    if (!name) return;
    if (/Chính Tài|Thiên Tài/i.test(name)) c.tai++;
    if (/Chính Quan|Thất Sát/i.test(name)) c.quan++;
    if (/Chính Ấn|Thiên Ấn|Ấn/.test(name)) c.an++;
    if (/Thực Thần|Thương Quan/i.test(name)) c.thuc++;
  });
  return c;
};
const wealthElementOf = (e) => ({ Mộc:"Thổ", Thổ:"Thủy", Thủy:"Hỏa", Hỏa:"Kim", Kim:"Mộc" }[e]);
const starList = (thanSat, key) => (thanSat[key]?.value || []).join(", ");

/* có tổng quan trước đó? */
const hasOverviewBefore = (messages) =>
  (messages||[]).some(m => m.role === "assistant" && /Nhật Chủ|Tứ Trụ|Ngũ Hành/i.test(m.content||""));

/* ========== SINH VĂN CHÍNH ========== */
const generateResponse = (tuTru, nguHanh, thapThan, thanSat, dungThan, userInput, messages, lang) => {
  const language = lang || "vi";
  const nhatChu = tuTru.ngay.split(" ")[0];
  const nhatHanh = canNguHanh[nhatChu];
  const perc = elementPercent(nguHanh);
  const gods = groupTenGods(thapThan);
  const intent = determineQuestionType(userInput);
  const alreadyOverview = hasOverviewBefore(messages);

  const openers = [
    "Mình vừa xem lá số của bạn xong —",
    "Cảm ơn bạn đã tin tưởng. Nhìn vào Tứ Trụ của bạn, mình thấy:",
    "Mình xem nhanh bát tự và tóm lại thế này:",
    "Dựa trên Giờ–Ngày–Tháng–Năm của bạn, có vài điểm nổi bật:"
  ];
  const opener = pick(openers, `${tuTru.gio}|${tuTru.ngay}|${tuTru.thang}|${tuTru.nam}`);

  const quickRecap = () => {
    const sorted = Object.entries(perc).sort((a,b)=>b[1]-a[1]);
    const dominant = sorted[0][0], weakest = sorted[sorted.length-1][0];
    return [
      `Tóm nhanh: Nhật Chủ ${nhatChu} (${nhatHanh}).`,
      `Cán cân ngũ hành: ${dominant} vượng, ${weakest} yếu → nên bổ **${dungThan[0] || weakest}** để cân bằng.`,
      `Thập Thần nổi bật: Tài ${gods.tai} · Quan ${gods.quan} · Ấn ${gods.an} · Thực/Thương ${gods.thuc}.`
    ].join("\n");
  };

  const overview = () => {
    const qn = starList(thanSat, "Thiên Ất Quý Nhân");
    return [
      `${opener}`,
      `• Tứ Trụ: Giờ ${tuTru.gio} · Ngày ${tuTru.ngay} · Tháng ${tuTru.thang} · Năm ${tuTru.nam}.`,
      `• Nhật Chủ ${nhatChu} (${nhatHanh}) – ${personalityDescriptions[nhatHanh].vi}.`,
      `• Ngũ Hành: Mộc ${perc["Mộc"]}% · Hỏa ${perc["Hỏa"]}% · Thổ ${perc["Thổ"]}% · Kim ${perc["Kim"]}% · Thủy ${perc["Thủy"]}%.`,
      `• Thập Thần: Tài ${gods.tai} · Quan ${gods.quan} · Ấn ${gods.an} · Thực/Thương ${gods.thuc}.${qn ? " Có Quý Nhân: "+qn+"." : ""}`,
      `• Tổng quan: ${Object.entries(perc).sort((a,b)=>b[1]-a[1])[0][0]} vượng, ${Object.entries(perc).sort((a,b)=>a[1]-b[1])[0][0]} yếu → nên bổ **${dungThan[0] || Object.entries(perc).sort((a,b)=>a[1]-b[1])[0][0]}**.`
    ].join("\n");
  };

  /* Quy tắc hiển thị tổng quan:
     - Nếu user hỏi “xem bát tự/luận giải/tổng quan” và trước đó chưa có tổng quan → hiển thị overview.
     - Nếu user hỏi chung chung (general) nhưng đã có overview → chỉ trả “quickRecap”.
     - Nếu câu hỏi có intent rõ (tiền, sức khoẻ, …) → KHÔNG lặp overview. */
  if (intent.isOverviewAsk && !alreadyOverview) return overview();
  if (intent.isGeneral) return alreadyOverview ? quickRecap() : overview();

  if (intent.isMoney) {
    const wealthEl = wealthElementOf(nhatHanh);
    const wealthPct = perc[wealthEl] || 0;
    const qn = starList(thanSat, "Thiên Ất Quý Nhân");
    return [
      `Tài vận: hành đại diện **Tài** là ${wealthEl} (tỉ lệ ${wealthPct}%).`,
      `Tín hiệu Thập Thần: Chính/Thiên Tài ${gods.tai} lần${qn ? `; có Quý Nhân ${qn} hỗ trợ` : ""}.`,
      (wealthPct >= 20 || gods.tai >= 2)
        ? `Kết luận: tài vận **trên trung bình** nếu tập trung nguồn thu ổn định và kỷ luật chi tiêu.`
        : `Kết luận: tài vận **trung bình**; ưu tiên tích luỹ tài sản cố định, tránh đầu tư ngắn hạn rủi ro.`,
      `Gợi ý hành động: theo dõi dòng tiền, đặt % tiết kiệm cố định, nâng cấp kỹ năng để tăng thu nhập.`
    ].join("\n");
  }

  if (intent.isProperty) {
    return [
      `Bất động sản/tài sản cố định: hợp **an toàn – dòng tiền ổn định** hơn là lướt sóng.`,
      `Gợi ý: chọn khu vực hạ tầng rõ và thanh khoản tốt; hạn chế đòn bẩy khi ${perc["Thủy"]<15?"Thủy yếu":"Thủy không vượng"}.`
    ].join("\n");
  }

  if (intent.isHealth) {
    const weakest  = Object.entries(perc).sort((a,b)=>a[1]-b[1])[0][0];
    const note =
      weakest === "Thủy" ? "• Ngủ/nghỉ và hệ thần kinh — giữ nhịp ngủ đều." :
      weakest === "Mộc"  ? "• Cơ–gân — nên kéo giãn nhẹ hằng ngày." :
      weakest === "Hỏa"  ? "• Tim mạch/nhiệt — hạn chế thức khuya." :
      weakest === "Kim"  ? "• Hô hấp/da — ưu tiên môi trường thoáng." :
                            "• Tiêu hoá — ăn đúng giờ.";
    return [`Sức khoẻ: mất cân bằng ở **${weakest}**.`, note, `Thói quen: đi bộ/thiền 10–15 phút mỗi ngày.`].join("\n");
  }

  if (intent.isLove) {
    const hoa = starList(thanSat, "Đào Hoa");
    return [
      `Tình cảm: ${hoa ? `có Đào Hoa (${hoa}) → duyên đến qua mạng lưới xã hội.` : `Đào Hoa không nổi bật → cần chủ động mở rộng kết nối.`}`,
      `Gợi ý: giao tiếp thẳng thắn và hẹn khi bạn tỉnh táo nhất trong ngày.`
    ].join("\n");
  }

  if (intent.isFamily) {
    const hoa = starList(thanSat, "Đào Hoa");
    const qn  = starList(thanSat, "Thiên Ất Quý Nhân");
    const co  = starList(thanSat, "Cô Thần Quả Tú");
    return [
      `Gia đạo:`,
      qn ? `• Có Quý Nhân ${qn} — thuận nhờ người lớn hỗ trợ.` : `• Quý Nhân: chưa bật.`,
      hoa ? `• Đào Hoa ${hoa} — kết nối tốt, nhưng rạch ròi cảm xúc–gia đình.` : `• Đào Hoa: không nổi bật.`,
      co  ? `• Lưu ý Cô Thần/Quả Tú (${co}).` : `• Cô Thần/Quả Tú: không đáng ngại.`,
      `Khuyến nghị: duy trì giờ ăn/giấc ngủ chung, họp gia đình ngắn mỗi tuần.`
    ].join("\n");
  }

  if (intent.isCareer) {
    return [
      `Sự nghiệp: Quan/Ấn ${gods.quan + gods.an} lần; Thực/Thương ${gods.thuc} lần.`,
      (gods.quan + gods.an >= 2)
        ? "• Hợp vai trò quản lý/quy trình rõ ràng."
        : "• Hợp vai trò sáng tạo/thực thi, ít ràng buộc.",
      `Gợi ý: chọn môi trường tiêu chuẩn rõ; tích luỹ chứng chỉ then chốt.`
    ].join("\n");
  }

  if (intent.isChildren) {
    return [
      `Con cái: Thực/Thương ${gods.thuc} lần — tín hiệu tốt cho học & sáng tạo.`,
      `Gợi ý: khuyến khích dự án nhỏ, đọc sách và vận động nhẹ.`
    ].join("\n");
  }

  if (intent.isThanSat) {
    const list = Object.values(thanSat || {}).filter(x => x.value?.length)
      .map(x => `${x.vi}: ${x.value.join(", ")}`);
    return list.length ? list.join("\n") : "Không có Thần Sát nổi bật.";
  }

  if (intent.isThapThan) {
    const list = Object.entries(thapThan || {}).map(([k,v])=>`${k}: ${v}`).join("\n");
    return list || "Thập Thần không nổi bật.";
  }

  if (intent.isTiming) {
    const last = (messages||[]).slice().reverse().find(m=>m.role==="assistant")?.content || "";
    if (/Đại Vận|Lưu Niên/.test(last)) {
      return "Để hành động ngay 3–6 tháng tới, bạn có thể ưu tiên: (1) giữ kỷ luật tài chính, (2) chọn khung giờ bạn khoẻ nhất để gặp gỡ/đàm phán, (3) phát triển kỹ năng chủ lực. Khi cần xem mốc may mắn theo Đại Vận/Lưu Niên, mình sẽ tính riêng.";
    }
    return "May mắn cụ thể phụ thuộc Đại Vận/Lưu Niên. Bản tóm tắt hiện tại chưa tính hai yếu tố này. Nếu muốn, mình sẽ gợi ý hướng tối ưu 3–6 tháng tới để bạn áp dụng ngay.";
  }

  return quickRecap();
};

/* ========== OPENAI (polish) ========== */
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
    return true;
  }
};

const callOpenAI = async (payload, retries = 2, delay = 1500) => {
  if (!process.env.OPENAI_API_KEY) throw new Error("Missing OpenAI API key");
  if (!payload.model || !payload.messages) throw new Error("Invalid payload");
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.post("https://api.openai.com/v1/chat/completions", payload, {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
        timeout: 30000
      });
      return response.data;
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) throw new Error("Invalid API key");
      if (attempt === retries || status === 429) throw new Error(err.message || "OpenAI error");
      await new Promise(r => setTimeout(r, delay * attempt));
    }
  }
};

/* ========== ROUTE CHÍNH ========== */
app.post("/api/luan-giai-bazi", async (req, res) => {
  const startTime = Date.now();
  const { messages, tuTruInfo, dungThan } = req.body;
  const useOpenAI = process.env.USE_OPENAI !== "false";
  const language = guessLanguage(messages);
  const userInput = (messages || []).slice().reverse().find(m => m.role === "user")?.content || "";

  const cacheKey = `${tuTruInfo}-${userInput}-${language}-${hasOverviewBefore(messages)}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ answer: cached });

  if (!Array.isArray(messages) || !messages.length)
    return res.status(400).json({ error: "Thiếu messages" });
  if (!tuTruInfo || typeof tuTruInfo !== "string")
    return res.status(400).json({ error: "Thiếu tuTruInfo" });

  const dungThanHanh = Array.isArray(dungThan) ? dungThan : (dungThan?.hanh || []);
  if (!dungThanHanh.every(d => ["Mộc","Hỏa","Thổ","Kim","Thủy"].includes(d)))
    return res.status(400).json({ error: "Dụng Thần không hợp lệ" });

  // Chuẩn hoá Tứ Trụ
  let tuTru;
  try {
    tuTru = JSON.parse(tuTruInfo);
    tuTru = { gio: normalizeCanChi(tuTru.gio), ngay: normalizeCanChi(tuTru.ngay), thang: normalizeCanChi(tuTru.thang), nam: normalizeCanChi(tuTru.nam) };
    if (!tuTru.gio || !tuTru.ngay || !tuTru.thang || !tuTru.nam) throw new Error("invalid");
  } catch {
    tuTru = parseEnglishTuTru(userInput);
    if (!tuTru?.gio || !tuTru?.ngay || !tuTru?.thang || !tuTru?.nam)
      return res.status(400).json({ error: "Tứ Trụ không hợp lệ" });
  }

  // Phân tích
  let nguHanh, thapThanResults = {}, thanSatResults = {};
  try { nguHanh = analyzeNguHanh(tuTru); }
  catch { return res.status(400).json({ error: "Dữ liệu ngũ hành không hợp lệ" }); }

  try { thapThanResults = tinhThapThan(tuTru.ngay?.split(" ")[0], tuTru); }
  catch (e) { console.error("Lỗi Thập Thần:", e.message); }

  try { thanSatResults = tinhThanSat(tuTru); }
  catch (e) {
    console.error("Lỗi Thần Sát:", e.message);
    return res.status(400).json({ error: "Lỗi tính Thần Sát" });
  }

  // Sinh văn “cứng”
  const baseText = generateResponse(tuTru, nguHanh, thapThanResults, thanSatResults, dungThanHanh, userInput, messages, language);

  if (!useOpenAI) {
    cache.set(cacheKey, baseText);
    console.log(`Processing time: ${Date.now() - startTime}ms`);
    return res.json({ answer: baseText });
  }

  // Polish mềm, không bịa mốc thời gian
  const prompt = `Viết lại đoạn dưới đây bằng tiếng Việt, giọng ấm và gần gũi, không lặp ý, không thêm mốc thời gian dự đoán. Giữ nguyên thuật ngữ Bát Tự (can/chi/ngũ hành/thập thần/thần sát).
---
${baseText}
---`;

  try {
    const keyOk = await checkOpenAIKey();
    if (!keyOk) throw new Error("Invalid API key");
    const gptRes = await callOpenAI({
      model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || "1200", 10)
    });
    const answer = gptRes?.choices?.[0]?.message?.content?.trim() || baseText;
    cache.set(cacheKey, answer);
    console.log(`Processing time: ${Date.now() - startTime}ms`);
    return res.json({ answer });
  } catch (err) {
    console.error("OpenAI error:", err.message);
    cache.set(cacheKey, baseText);
    return res.json({ answer: baseText, warning: `OpenAI unavailable: ${err.message}` });
  }
});

/* ========== ERROR & BOOT ========== */
app.use((err, req, res, next) => {
  try { fs.appendFileSync("error.log", `${new Date().toISOString()} - ${err.stack}\n`); } catch {}
  console.error("Lỗi hệ thống:", err.stack);
  res.status(500).json({ error: "System error occurred" });
});

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
