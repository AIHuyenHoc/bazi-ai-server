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

/* ===== Helpers ===== */
const rmDiacritics = (s = "") =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/* ===== Can–Chi maps ===== */
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

const heavenlyStemsVI = ["Giáp","Ất","Bính","Đinh","Mậu","Kỷ","Canh","Tân","Nhâm","Quý"];
const earthlyBranchesVI = ["Tý","Sửu","Dần","Mão","Thìn","Tỵ","Ngọ","Mùi","Thân","Dậu","Tuất","Hợi"];

/* ===== Normalize & Parse ===== */
const normalizeCanChi = (input) => {
  if (!input || typeof input !== "string") return null;
  const [rawCan, rawChi] = input.trim().split(/\s+/);
  if (!rawCan || !rawChi) return null;

  const viCan = Object.keys(heavenlyStemsMap.vi);
  const viChi = Object.keys(earthlyBranchesMap.vi);
  const canVi = viCan.find(k => rmDiacritics(k) === rmDiacritics(rawCan));
  const chiVi = viChi.find(k => rmDiacritics(k) === rmDiacritics(rawChi));
  if (canVi && chiVi) return `${canVi} ${chiVi}`;

  const enCanKey = Object.keys(heavenlyStemsMap.en).find(k => rmDiacritics(k) === rmDiacritics(rawCan));
  const enChiKey = Object.keys(earthlyBranchesMap.en).find(k => rmDiacritics(k) === rmDiacritics(rawChi));
  if (enCanKey && enChiKey) {
    return `${heavenlyStemsMap.en[enCanKey]} ${earthlyBranchesMap.en[enChiKey]}`;
  }
  return null;
};

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
    if (out.gio && out.ngay && out.thang && out.nam) return out;
    return null;
  } catch { return null; }
};

/* ===== 60 Hoa Giáp (auto) ===== */
const hoaGiap = Array.from({ length: 60 }, (_, i) => `${heavenlyStemsVI[i % 10]} ${earthlyBranchesVI[i % 12]}`);
const getCanChiForYear = (year) => {
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return null;
  const baseYear = 1984;
  let idx = (year - baseYear) % 60;
  if (idx < 0) idx += 60;
  return hoaGiap[idx] || null;
};

/* ===== Core Calculations ===== */
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

/* ===== Thần sát rút gọn (giữ nguyên logic chính) ===== */
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

/* ===== Language & intent ===== */
const personalityDescriptions = {
  Mộc: { vi:"sáng tạo, linh hoạt, thông minh", en:"creative, adaptable, intelligent" },
  Hỏa: { vi:"nhiệt huyết, chủ động", en:"passionate, proactive" },
  Thổ: { vi:"vững chãi, thực tế", en:"grounded, practical" },
  Kim: { vi:"kỷ luật, quyết đoán", en:"disciplined, decisive" },
  Thủy: { vi:"nhạy bén, uyển chuyển", en:"perceptive, fluid" }
};

const elementMeta = {
  "Mộc": { vi:{ color:"xanh lá", jobs:"giáo dục/thiết kế/nội dung, cố vấn phát triển" }, en:{ color:"green", jobs:"education/design/content, advisory" } },
  "Hỏa": { vi:{ color:"đỏ/cam", jobs:"truyền thông, trình diễn, năng lượng" }, en:{ color:"red/orange", jobs:"media, performance, energy" } },
  "Thổ": { vi:{ color:"vàng/đất", jobs:"bất động sản, vận hành, quản trị" }, en:{ color:"yellow/earth", jobs:"real estate, ops, management" } },
  "Kim": { vi:{ color:"trắng/ánh kim", jobs:"tài chính, kỹ thuật, pháp chế" }, en:{ color:"white/metallic", jobs:"finance, engineering, compliance" } },
  "Thủy": { vi:{ color:"xanh dương/đen", jobs:"CNTT-data, logistics, nghiên cứu" }, en:{ color:"blue/black", jobs:"IT/data, logistics, research" } },
};

const guessLanguage = (messages) => {
  const txt = (messages || []).map(m => m.content || "").join(" ");
  const looksVI = /ngay|thang|nam|gio|giap|at|binh|dinh|mau|ky|canh|tan|nham|quy|ty|suu|dan|mao|thin|ty|ngo|mui|than|dau|tuat|hoi/i.test(rmDiacritics(txt));
  return looksVI ? "vi" : "en";
};

const intentDetector = (text) => {
  const t = rmDiacritics(text);
  const isGeneralAsk = /(xem|coi)\s*bat\s*tu|xem\s*la\s*so|hay\s*xem\s*bat\s*tu/.test(t);

  const isTiming = /(khi\s*nao|bao\s*gio|thoi\s*diem|thang\s*nao|gio\s*nao|ngay\s*nao|nam\s*nao)/.test(t);
  const isMoney = /(tien|tai\s*chinh|tai\s*loc|thu\s*nhap|dong\s*tien|tiet\s*kiem|quy\s*mo\s*dau\s*tu|wealth|finance|income)/.test(t)
                || /(dau\s*tu|dau\s*co|mua\s*ban|chung\s*khoan|co\s*phieu|trai\s*phieu|crypto|coin|etf|mo\s*vi\s*the|cat\s*lo)/.test(t);
  const isInvest = /(dau\s*tu|mua\s*co\s*phieu|mo\s*vi\s*the|trade|trading|dau\s*co|crypto|coin|etf)/.test(t);
  const isCareer = /(su\s*nghiep|nghe|cong\s*viec|thang\s*tien|luong|offer|okr|kpi|promotion|career|job)/.test(t);
  const isFame = /(cong\s*danh|danh\s*tieng|reputation|truyen\s*thong|noi\s*tieng|success)/.test(t);
  const isHealth = /(suc\s*khoe|benh|tam\s*ly|stress|giac\s*ngu|mat\s*ngu|sleep|health)/.test(t);
  const isLove = /(tinh\s*duyen|tinh\s*yeu|hon\s*nhan|cuoi|marriage|romance|nguoi\s*yeu)/.test(t);
  const isFamily = /(gia\s*dao|gia\s*dinh|cha\s*me|vo\s*chong|nguoi\s*than|relative|parents)/.test(t);
  const isChildren = /(con\s*cai|tre\s*em|nuoi\s*day|children|con\s*trai|con\s*gai)/.test(t);
  const isProperty = /(bat\s*dong\s*san|nha|dat|so\s*do|lai\s*suat|mua\s*nha|cho\s*thue|property|real\s*estate)/.test(t);
  const isColor = /(mau|mac\s*ao\s*mau|chon\s*mau|color|phong\s*thuy\s*mau)/.test(t);

  const isComplex = /(du\s*doan|so\s*phan|dinh\s*menh|dai\s*van)/.test(t);

  const none =
    !isGeneralAsk && !isTiming && !isMoney && !isCareer && !isFame && !isHealth &&
    !isLove && !isFamily && !isChildren && !isProperty && !isColor && !isComplex;

  return { isGeneralAsk, isTiming, isMoney, isInvest, isCareer, isFame, isHealth, isLove, isFamily, isChildren, isProperty, isColor, isComplex, isGeneral: none };
};

const countRecentTimingAsk = (messages, window=6) => {
  const lastUsers = (messages||[]).filter(m=>m.role==="user").slice(-window).map(m=>rmDiacritics(m.content||""));
  return lastUsers.filter(t=>/(khi\s*nao|thoi\s*diem|bao\s*gio|gio\s*nao|thang\s*nao|nam\s*nao|may\s*man)/.test(t)).length;
};

const colorByElementVI = {
  "Mộc": { wear:["xanh lá","xanh rêu","gỗ"], avoid:["trắng ánh kim","xám bạc"] },
  "Hỏa": { wear:["đỏ","cam","tím"], avoid:["đen","xanh đậm"] },
  "Thổ": { wear:["vàng","nâu đất","be"], avoid:["xanh lá đậm"] },
  "Kim": { wear:["trắng","bạc","ghi sáng"], avoid:["đỏ","cam đậm"] },
  "Thủy": { wear:["xanh dương","đen","xanh than"], avoid:["vàng đất"] },
};

/* ===== Text generator ===== */
const pct = n => `${(+n).toFixed(2)}%`;

const generateResponse = (tuTru, nguHanhCount, thapThanResults, thanSatResults, dungThan, userInput, messages, lang) => {
  const language = lang || guessLanguage(messages);
  const intent = intentDetector(userInput || "");
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

  const activeStars = Object.values(thanSatResults||{})
    .filter(v => v.value && v.value.length)
    .map(v => `${v[language]}: ${v.value.join(", ")}`);

  const timingCount = countRecentTimingAsk(messages);

  // Intro trust when user says "xem bát tự"
  if (intent.isGeneralAsk || intent.isGeneral) {
    if (language === "vi") {
      return [
        `Mình đã xem Tứ Trụ của bạn: Giờ ${tuTru.gio}, Ngày ${tuTru.ngay}, Tháng ${tuTru.thang}, Năm ${tuTru.nam}.`,
        `Nhật Chủ ${nhatChu} (${dmHanh}) – ${personalityDescriptions[dmHanh].vi}.`,
        `Ngũ Hành: ${["Mộc","Hỏa","Thổ","Kim","Thủy"].map(h=>`${h} ${pct(percents[h]||0)}`).join(", ")}.`,
        `Tổng quan: ${dominant} vượng, ${weak} yếu → nên bổ ${chosen} để cân bằng.`,
        activeStars.length ? `Thần Sát kích hoạt: ${activeStars.join(" | ")}` : `Thần Sát: không nổi bật.`,
        `Bạn có thể hỏi tiếp về: tài vận, sự nghiệp, tình cảm, sức khỏe, gia đạo, con cái, tài sản, hoặc **thời điểm thuận lợi**.`
      ].join("\n");
    } else {
      return [
        `Your Four Pillars: Hour ${tuTru.gio}, Day ${tuTru.ngay}, Month ${tuTru.thang}, Year ${tuTru.nam}.`,
        `Day Master ${nhatChu} (${dmHanh}) – ${personalityDescriptions[dmHanh].en}.`,
        `Five Elements: ${["Mộc","Hỏa","Thổ","Kim","Thủy"].map(h=>`${h} ${pct(percents[h]||0)}`).join(", ")}.`,
        `Overview: strong ${dominant}, weak ${weak} → add ${chosen} to balance.`,
        activeStars.length ? `Auspicious Stars: ${activeStars.join(" | ")}` : `Auspicious Stars: none prominent.`,
        `Ask me about wealth, career, love, health, family, children, property, or **good timing**.`
      ].join("\n");
    }
  }

  // COLOR intent
  if (intent.isColor) {
    const meta = colorByElementVI[chosen];
    return language === "vi"
      ? `Theo Bát Tự của bạn, nên ưu tiên **màu thuộc ${chosen}**.\n• Mặc/đeo: ${meta.wear.join(", ")}.\n• Hạn chế: ${meta.avoid.join(", ")}.\nGợi ý: phối một điểm nhấn ${meta.wear[0]} khi cần tự tin/thu hút.`
      : `Favor **${chosen}** colors.\n• Wear: ${meta.wear.join(", ")}.\n• Avoid: ${meta.avoid.join(", ")}.\nTip: add a ${meta.wear[0]} accent for confidence/attraction.`;
  }

  // MONEY / INVEST (with or without timing)
  if (intent.isMoney || intent.isInvest) {
    const lines = [];
    if (language === "vi") {
      lines.push("**Tài vận/Đầu tư:**");
      lines.push("• Nguyên tắc: tập trung tích lũy ổn định, ưu tiên tài sản cố định/giá trị cốt lõi.");
      lines.push(`• Dụng Thần: bổ ${chosen} để cân bằng → chọn lĩnh vực mang hành ${chosen.toLowerCase()} (gợi ý theo nghề).`);
      if (intent.isInvest) {
        lines.push("• Lưu ý: Đây không phải tư vấn tài chính; tránh đòn bẩy cao và quyết định theo cảm xúc.");
      }
      if (intent.isTiming) {
        if (timingCount <= 1) {
          lines.push(`• Thời điểm thuận: **giờ** ${["09:00–11:00 (Tỵ)","11:00–13:00 (Ngọ)"].join(" hoặc ")}; **tháng** Tỵ/Ngọ (nếu không vướng Đại vận/Lưu niên).`);
        } else {
          lines.push("• Kích hoạt vận: ngủ đủ, vận động ra mồ hôi, gặp gỡ/trao đổi vào khung giờ sáng; tránh quyết định khi mệt/giận.");
        }
      }
    } else {
      lines.push("**Wealth/Investment:**");
      lines.push("• Principle: grow steadily; favor core, cash-flow assets.");
      lines.push(`• Useful God: add ${chosen} → pick fields aligned with ${chosen}.`);
      if (intent.isInvest) lines.push("• Note: Not financial advice; avoid high leverage and emotional trades.");
      if (intent.isTiming) {
        if (timingCount <= 1) lines.push("• Favorable timing: hours 09:00–11:00, 11:00–13:00; months of Snake/Horse (subject to luck cycles).");
        else lines.push("• Activate luck: proper sleep, sweat exercise, morning meetings; avoid decisions when tired/angry.");
      }
    }
    return lines.join("\n");
  }

  // TIMING only
  if (intent.isTiming) {
    if (timingCount <= 1) {
      return language === "vi"
        ? "Khung thuận lợi: **09:00–11:00 (Tỵ)**, **11:00–13:00 (Ngọ)**; ưu tiên tháng **Tỵ/Ngọ**. (Chưa xét Đại vận/Lưu niên cụ thể.)"
        : "Good windows: **09:00–11:00** and **11:00–13:00**; prefer months **Snake/Horse**. (Not accounting for major cycles.)";
    }
    return language === "vi"
      ? "Để **kích hoạt vận**, hãy: ngủ đủ – vận động ra mồ hôi – gặp gỡ buổi sáng – làm việc gắn với Dụng Thần. Tránh quyết định lớn khi mệt hoặc căng thẳng."
      : "To **activate luck**: sleep well, sweat workouts, morning meetings, and tasks aligned with the Useful God. Avoid big decisions when tired or stressed.";
  }

  // Other single-topic quick replies
  if (intent.isHealth) {
    return language === "vi"
      ? `Sức khỏe: Thủy đang cao, Hỏa yếu → dễ nặng cảm xúc/thiếu nhiệt. Nên vận động ra mồ hôi, tắm ấm buổi tối, hạn chế thức khuya & caffeine muộn.`
      : `Health: High Water, weak Fire → manage emotions/low warmth. Sweat workouts, warm evening shower, avoid late caffeine & late nights.`;
  }

  if (intent.isCareer) {
    const job = elementMeta[chosen][language].jobs;
    return language === "vi"
      ? `Sự nghiệp: hợp **${job}**. Tập trung vai trò dùng tư duy/diễn đạt; xây hệ thống kỷ luật, tránh nhảy việc theo cảm xúc.`
      : `Career: suitable for **${job}**. Lean into thinking/communication roles; build discipline systems, avoid reactive job-hopping.`;
  }

  if (intent.isLove) {
    return language === "vi"
      ? `Tình cảm: hợp người có tính **${personalityDescriptions[chosen].vi}**. Tăng duyên bằng giao tiếp chân thành và gặp gỡ buổi sáng/đầu tuần.`
      : `Love: you match with people who are **${personalityDescriptions[chosen].en]}**. Improve chances via honest talks and morning/early-week meetups.`;
  }

  if (intent.isFamily) {
    return language === "vi"
      ? `Gia đạo: duy trì kỷ luật cảm xúc; dành thời gian trao đổi đều đặn mỗi tuần. Dụng Thần ${chosen} phù trợ sự ấm áp/kết nối.`
      : `Family: practice emotional discipline; schedule weekly check-ins. Useful God ${chosen} supports warmth/connection.`;
  }

  if (intent.isChildren) {
    return language === "vi"
      ? `Con cái: thiên hướng **${personalityDescriptions[chosen].vi}**. Khuyến khích hoạt động sáng tạo/gắn với ${chosen.toLowerCase()}.`
      : `Children: tendency toward **${personalityDescriptions[chosen].en]}**. Encourage creative activities aligned with ${chosen}.`;
  }

  if (intent.isProperty) {
    return language === "vi"
      ? `Bất động sản: ưu tiên tài sản có pháp lý rõ ràng & dòng tiền; tránh đòn bẩy cao. Thời điểm thăm nhà/gặp môi giới: 09:00–13:00.`
      : `Property: prefer clear-title, cash-flow assets; avoid high leverage. Visit properties/meet agents 09:00–13:00.`;
  }

  if (intent.isComplex) {
    return language === "vi"
      ? "Mình không dự đoán định mệnh chi tiết. Bạn có thể hỏi cụ thể về tài vận, sự nghiệp, sức khỏe, tình cảm, thời điểm… để mình phân tích theo Bát Tự."
      : "I don’t forecast fate in detail. Ask about wealth, career, health, love, or timing and I’ll analyze via Bazi.";
  }

  // Fallback – nhẹ nhàng điều hướng
  return language === "vi"
    ? "Mình có thể hỗ trợ các chủ đề: **tài vận, sự nghiệp, tình cảm, sức khỏe, gia đạo, con cái, tài sản, thời điểm thuận lợi, màu sắc phù hợp**. Bạn muốn xem phần nào?"
    : "I can help with **wealth, career, love, health, family, children, property, timing, colors**. Which would you like to explore?";
};

/* ===== OpenAI (optional polish) ===== */
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

/* ===== Main Route ===== */
app.post("/api/luan-giai-bazi", async (req, res) => {
  const startTime = Date.now();
  try {
    const { messages, tuTruInfo, dungThan } = req.body;
    const useOpenAI = process.env.USE_OPENAI !== "false";
    const language = guessLanguage(messages);
    const userInput = (messages || []).slice().reverse().find(m => m.role === "user")?.content || "";

    if (!Array.isArray(messages) || !messages.length) {
      return res.status(400).json({ error: language === "vi" ? "Thiếu messages" : "Missing messages" });
    }
    if (!tuTruInfo || typeof tuTruInfo !== "string") {
      return res.status(400).json({ error: language === "vi" ? "Thiếu tuTruInfo" : "Missing tuTruInfo" });
    }

    const cacheKey = `${tuTruInfo}-${userInput}-${language}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ answer: cached });

    const dungThanHanh = Array.isArray(dungThan) ? dungThan : (dungThan?.hanh || []);
    if (!dungThanHanh.every(d => ["Mộc","Hỏa","Thổ","Kim","Thủy"].includes(d))) {
      return res.status(400).json({ error: language === "vi" ? "Dụng Thần không hợp lệ" : "Invalid Useful God" });
    }

    // Chuẩn hóa tứ trụ
    let tuTru;
    try {
      tuTru = JSON.parse(tuTruInfo);
      tuTru = { gio: normalizeCanChi(tuTru.gio), ngay: normalizeCanChi(tuTru.ngay), thang: normalizeCanChi(tuTru.thang), nam: normalizeCanChi(tuTru.nam) };
      if (!tuTru.gio || !tuTru.ngay || !tuTru.thang || !tuTru.nam) throw new Error("invalid");
    } catch {
      const parsed = parseEnglishTuTru(userInput);
      if (!parsed?.gio || !parsed?.ngay || !parsed?.thang || !parsed?.nam) {
        return res.status(400).json({ error: language === "vi" ? "Tứ Trụ không hợp lệ" : "Invalid Four Pillars" });
      }
      tuTru = parsed;
    }

    // Phân tích
    const nguHanh = analyzeNguHanh(tuTru);
    let thapThanResults = {};
    try { thapThanResults = tinhThapThan(tuTru.ngay?.split(" ")[0], tuTru); } catch {}
    const thanSatResults = tinhThanSat(tuTru);

    // Sinh nội bộ
    const baseText = generateResponse(tuTru, nguHanh, thapThanResults, thanSatResults, dungThanHanh, userInput, messages, language);

    if (!useOpenAI) {
      cache.set(cacheKey, baseText);
      return res.json({ answer: baseText });
    }

    // Dùng OpenAI để “polish” (tùy chọn)
    const prompt = language === "vi"
      ? `Viết lại đoạn sau gọn, thân thiện, không thêm dự đoán vô căn cứ, giữ nguyên ý Bát Tự:\n\n${baseText}`
      : `Polish the text below (concise, friendly, no fabrication), keep Bazi terms:\n\n${baseText}`;

    let answer = baseText;
    try {
      const keyOk = await checkOpenAIKey();
      if (keyOk) {
        const gptRes = await callOpenAI({
          model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.5,
          max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || "1200", 10)
        });
        answer = gptRes?.choices?.[0]?.message?.content?.trim() || baseText;
      }
    } catch (e) {
      // fallback silently
    }

    cache.set(cacheKey, answer);
    return res.json({ answer, _t: Date.now() - startTime });
  } catch (err) {
    try { fs.appendFileSync("error.log", `${new Date().toISOString()} - ${err.stack}\n`); } catch {}
    console.error("Lỗi hệ thống:", err);
    return res.status(500).json({ error: "System error occurred" });
  }
});

/* ===== Server ===== */
const port = process.env.PORT || 10000;
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
server.setTimeout(300000);
