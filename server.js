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

/* ===== Can–Chi maps ===== */
const heavenlyStemsMap = {
  en: { Jia: "Giáp", Yi: "Ất", Bing: "Bính", Ding: "Đinh", Wu: "Mậu", Ji: "Kỷ", Geng: "Canh", Xin: "Tân", Ren: "Nhâm", Gui: "Quý" },
  vi: { Giáp: "Giáp", Ất: "Ất", Bính: "Bính", Đinh: "Đinh", Mậu: "Mậu", Kỷ: "Kỷ", Canh: "Canh", Tân: "Tân", Nhâm: "Nhâm", Quý: "Quý" }
};
const earthlyBranchesMap = {
  en: { Rat: "Tý", Ox: "Sửu", Tiger: "Dần", Rabbit: "Mão", Dragon: "Thìn", Snake: "Tỵ", Horse: "Ngọ", Goat: "Mùi", Monkey: "Thân", Rooster: "Dậu", Dog: "Tuất", Pig: "Hợi" },
  vi: { Tý: "Tý", Sửu: "Sửu", Dần: "Dần", Mão: "Mão", Thìn: "Thìn", Tỵ: "Tỵ", Ngọ: "Ngọ", Mùi: "Mùi", Thân: "Thân", Dậu: "Dậu", Tuất: "Tuất", Hợi: "Hợi" }
};
const rmDiacritics = s => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/* ===== Chuẩn hoá Can Chi ===== */
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

/* ===== Parser tiếng Anh linh hoạt ===== */
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
  } catch {
    return null;
  }
};

/* ===== 60 Hoa Giáp (tạo tự động) ===== */
const stemsVI = ["Giáp","Ất","Bính","Đinh","Mậu","Kỷ","Canh","Tân","Nhâm","Quý"];
const branchesVI = ["Tý","Sửu","Dần","Mão","Thìn","Tỵ","Ngọ","Mùi","Thân","Dậu","Tuất","Hợi"];
const hoaGiap = Array.from({ length: 60 }, (_, i) => `${stemsVI[i % 10]} ${branchesVI[i % 12]}`);

/* ===== Ngũ hành/Thập thần/Thần sát ===== */
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
  for (const chi of branches) (hidden[chi] || []).forEach(h => { if (canNguHanh[h]) nguHanhCount[canNguHanh[h]] += 0.3; });
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
  const els = [tuTru.gio?.split(" ")[0], tuTru.thang?.split(" ")[0], tuTru.nam?.split(" ")[0]].filter(Boolean);
  const chis = [tuTru.gio?.split(" ")[1], tuTru.ngay?.split(" ")[1], tuTru.thang?.split(" ")[1], tuTru.nam?.split(" ")[1]].filter(Boolean);
  if (els.length < 3 || chis.length < 4) throw new Error("Tứ Trụ không đầy đủ");

  for (const can of els) {
    if (can === nhatChu) continue;
    const h = canNguHanh[can]; if (!h) continue;
    const sameYang = ["Giáp","Bính","Mậu","Canh","Nhâm"].includes(can);
    const idx = (isYang === sameYang) ? 0 : 1;
    out[can] = map[canNguHanh[nhatChu]][h][idx];
  }
  for (const chi of chis) {
    const h = chiNguHanh[chi]; if (!h) continue;
    const chiYang = ["Tý","Dần","Thìn","Ngọ","Thân","Tuất"].includes(chi);
    const idx = (isYang === chiYang) ? 0 : 1;
    out[chi] = map[canNguHanh[nhatChu]][h][idx];
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

/* ===== Ngôn ngữ & meta ===== */
const personalityDescriptions = {
  Mộc: { vi: "sáng tạo, linh hoạt, thông minh", en: "creative, adaptable, intelligent" },
  Hỏa: { vi: "nhiệt huyết, chủ động", en: "passionate, proactive" },
  Thổ: { vi: "vững chãi, thực tế", en: "grounded, practical" },
  Kim: { vi: "kỷ luật, quyết đoán", en: "disciplined, decisive" },
  Thủy: { vi: "nhạy bén, uyển chuyển", en: "perceptive, fluid" }
};
const elementMeta = {
  "Mộc": { vi: { color: "xanh lá", jobs: "giáo dục/thiết kế/sáng tạo nội dung, cố vấn phát triển" }, en: { color: "green", jobs: "education/design/content, advisory" } },
  "Hỏa": { vi: { color: "đỏ/cam", jobs: "truyền thông, trình diễn, công nghệ năng lượng" }, en: { color: "red/orange", jobs: "media, performance, energy tech" } },
  "Thổ": { vi: { color: "vàng/đất", jobs: "bất động sản, quản trị, vận hành" }, en: { color: "yellow/earth", jobs: "real estate, operations, management" } },
  "Kim": { vi: { color: "trắng/ánh kim", jobs: "tài chính, kỹ thuật, pháp chế" }, en: { color: "white/metallic", jobs: "finance, engineering, compliance" } },
  "Thủy": { vi: { color: "xanh dương/đen", jobs: "CNTT–dữ liệu, logistics, nghiên cứu" }, en: { color: "blue/black", jobs: "IT/data, logistics, research" } },
};
const timingByElement = {
  "Mộc": { months:["Dần (tháng 1)","Mão (tháng 2)"], hours:["03:00–05:00 (Dần)","05:00–07:00 (Mão)"] },
  "Hỏa": { months:["Tỵ (tháng 4)","Ngọ (tháng 5)"], hours:["09:00–11:00 (Tỵ)","11:00–13:00 (Ngọ)"] },
  "Thổ": { months:["Thìn (3)","Mùi (6)","Tuất (9)","Sửu (12)"], hours:["07:00–09:00 (Thìn)","13:00–15:00 (Mùi)","19:00–21:00 (Tuất)","01:00–03:00 (Sửu)"] },
  "Kim": { months:["Thân (7)","Dậu (8)"], hours:["15:00–17:00 (Thân)","17:00–19:00 (Dậu)"] },
  "Thủy": { months:["Hợi (10)","Tý (11)"], hours:["21:00–23:00 (Hợi)","23:00–01:00 (Tý)"] },
};
const guessLanguage = (messages) => {
  const txt = (messages || []).map(m => m.content || "").join(" ");
  const looksVI = /ngay|thang|nam|gio|giap|at|binh|dinh|mau|ky|canh|tan|nham|quy|ty|suu|dan|mao|thin|ty|ngo|mui|than|dau|tuat|hoi/i.test(rmDiacritics(txt));
  return looksVI ? "vi" : "en";
};

/* ===== Phân loại intent (thêm isOverview) ===== */
const determineQuestionType = (userInput) => {
  const t = rmDiacritics((userInput || "").toLowerCase());
  const is = (re) => re.test(t);
  const types = {
    isOverview: is(/xem bat tu|xem ba tu|bat tu|tu tru|coi la so|xem la so|bazi/),
    isMoney:   is(/tien bac|tai chinh|tai loc|money|finance|wealth|thu nhap|dau tu|invest/),
    isCareer:  is(/nghe|cong viec|su nghiep|career|job|thang tien|kinh doanh|business|startup|doi viec|chuyen viec/),
    isFame:    is(/cong danh|danh tieng|fame|reputation|success/),
    isHealth:  is(/suc khoe|health|benh|tam ly|mental/),
    isLove:    is(/hon nhan|tinh duyen|tinh yeu|marriage|love|romance/),
    isFamily:  is(/gia dao|gia dinh|family|cha me|ba me|bo me|vo chong|con cai/),
    isChildren:is(/con cai|children|parenting|sinh con|co con/),
    isProperty:is(/tai san|dat dai|bat dong san|property|real estate|mua nha|ban nha|chuyen nha/),
    isThapThan:is(/thap than|ten gods/),
    isThanSat: is(/than sat|auspicious|sao|quy nhan|dao hoa|van xuong|tuong tinh|dich ma|co than|qua tu|kiep sat|khong vong/),
    isTiming:  is(/khi nao|bao gio|luc nao|thoi diem|may man|van may|best time|when|luck(y)?|ky hop dong|thi cu|du lich|ra mat|mo ban|mua ban|chuyen cong tac|doi viec|chuyen viec|chuyen nha/)
  };
  types.isGeneral = !Object.values(types).some(v => v);
  return types;
};

/* ===== Trust intro + render helpers ===== */
const pct = n => `${(+n).toFixed(2)}%`;

const trustIntro = (tuTru, language) => {
  const dayStem = (tuTru.ngay || "").split(" ")[0];
  const dm = canNguHanh[dayStem];
  if (language === "vi") {
    return [
      `Mình đã nhận Tứ Trụ của bạn: Giờ ${tuTru.gio}, Ngày ${tuTru.ngay}, Tháng ${tuTru.thang}, Năm ${tuTru.nam}.`,
      `Bạn sinh **ngày ${tuTru.ngay}**, Nhật Chủ **${dayStem} (${dm})**.`
    ].join("\n");
  }
  return [
    `I received your Four Pillars: Hour ${tuTru.gio}, Day ${tuTru.ngay}, Month ${tuTru.thang}, Year ${tuTru.nam}.`,
    `You were born on **${tuTru.ngay}**, Day Master **${dayStem} (${dm})**.`
  ].join("\n");
};

const renderGeneral = (tuTru, nguHanhCount, thapThanResults, thanSatResults, dungThan, language, withIntro = false) => {
  const nhatChu = tuTru.ngay.split(" ")[0];
  const dmHanh = canNguHanh[nhatChu];
  const entries = Object.entries(nguHanhCount);
  const total = entries.reduce((a,[,v])=>a+v,0) || 1;
  const perc = Object.fromEntries(entries.map(([k,v]) => [k, (v/total)*100]));
  const sorted = [...entries].sort((a,b)=>b[1]-a[1]);
  const dominant = sorted[0][0];
  const weak = sorted[sorted.length-1][0];
  const dungs = Array.isArray(dungThan) ? dungThan : [];
  const chosen = dungs[0] || dominant;
  const meta = elementMeta[chosen][language];

  const godsCount = {};
  Object.values(thapThanResults||{}).forEach(n => { if(!n) return; godsCount[n]=(godsCount[n]||0)+1; });
  const topGods = Object.entries(godsCount).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([n,c])=>`${n} (${c})`);
  const stars = Object.values(thanSatResults||{}).filter(v => v.value && v.value.length).map(v => `${v[language]}: ${v.value.join(", ")}`);

  const head = withIntro ? (trustIntro(tuTru, language) + "\n") : "";

  if (language === "vi") {
    return [
      head + "Luận giải Bát Tự:",
      `Nhật Chủ ${nhatChu} (${dmHanh}) – ${personalityDescriptions[dmHanh].vi}.`,
      `Ngũ Hành: ${["Mộc","Hỏa","Thổ","Kim","Thủy"].map(h=>`${h} ${pct(perc[h]||0)}`).join(", ")}`,
      `Bức tranh tổng thể: ${dominant} vượng, ${weak} yếu → nên **bổ ${chosen}** để cân bằng.`,
      `Nghề hợp: ${meta.jobs}. Màu gợi ý: ${meta.color}.`,
      topGods.length ? `Thập Thần nổi bật: ${topGods.join(" · ")}` : `Thập Thần nổi bật: Không đáng kể.`,
      stars.length ? `Thần Sát kích hoạt: ${stars.join(" | ")}` : `Thần Sát kích hoạt: Không có nổi bật.`
    ].join("\n");
  }
  return [
    head + "Bazi Insight:",
    `Day Master ${nhatChu} (${dmHanh}) – ${personalityDescriptions[dmHanh].en}.`,
    `Five Elements: ${["Mộc","Hỏa","Thổ","Kim","Thủy"].map(h=>`${h} ${pct(perc[h]||0)}`).join(", ")}`,
    `Overall: ${dominant} strong, ${weak} weak → **add ${chosen}** to balance.`,
    `Careers: ${meta.jobs}. Colors: ${meta.color}.`,
    topGods.length ? `Ten Gods: ${topGods.join(" · ")}` : `Ten Gods: none prominent.`,
    stars.length ? `Auspicious Stars: ${stars.join(" | ")}` : `Auspicious Stars: none prominent.`
  ].join("\n");
};

const renderTiming = (dungThan, language) => {
  const chosen = (Array.isArray(dungThan) && dungThan[0]) || "Mộc";
  const t = timingByElement[chosen];
  const meta = elementMeta[chosen][language];
  if (language === "vi") {
    return [
      `Kết luận: thuận lợi khi **hành ${chosen} vượng**.`,
      `• Ưu tiên **tháng**: ${t.months.join(", ")}`,
      `• Ưu tiên **giờ**: ${t.hours.join(", ")}`,
      `• Không nêu năm cụ thể vì chưa tính **Đại vận/Lưu niên**.`,
      `• Môi trường nên chọn: lĩnh vực mang tính ${chosen.toLowerCase()} — ${meta.jobs}.`,
      `• Màu/cảm hứng: ${meta.color}.`
    ].join("\n");
  }
  return [
    `Verdict: luck peaks when **${chosen}** is strong.`,
    `• Prefer **months**: ${t.months.join(", ")}`,
    `• Prefer **hours**: ${t.hours.join(", ")}`,
    `• No specific years (Luck/Annual pillars not computed).`,
    `• Favor environments of ${chosen.toLowerCase()} — ${meta.jobs}.`,
    `• Colors: ${meta.color}.`
  ].join("\n");
};

const renderIntent = (intent, tuTru, nguHanhCount, thapThanResults, thanSatResults, dungThan, language) => {
  const chosen = (Array.isArray(dungThan) && dungThan[0]) || "Mộc";
  const meta = elementMeta[chosen][language];
  const quick = (title, tipsVI, tipsEN) => language === "vi"
    ? [`Kết luận: ${title}`, ...tipsVI].join("\n")
    : [`Verdict: ${title}`, ...tipsEN].join("\n");

  switch (intent) {
    case "timing":   return renderTiming(dungThan, language);
    case "love":     return quick(language === "vi" ? "đường tình cảm có duyên, dễ gặp người hợp." : "romance is supported; likely to meet a compatible partner.", [ `• Tăng ${chosen} để ổn định cảm xúc; màu: ${meta.color}.`, "• Ưu tiên giao tiếp chân thành, hẹn giờ thuộc khung may mắn." ], [ `• Add ${chosen} for emotional balance; colors: ${meta.color}.`, "• Schedule dates in lucky hour windows." ]);
    case "money":    return quick(language === "vi" ? "tài lộc trung bình–khá; tích luỹ tốt khi kỷ luật." : "wealth moderate–good; grows with discipline.", [ `• Tập trung tài sản cố định/khả năng ${meta.jobs.split(",")[0]}.`, `• Dùng tông ${meta.color}; tránh liều lĩnh ngắn hạn.` ], [ `• Prefer fixed assets / strengths in ${meta.jobs.split(",")[0]}.`, `• Use ${meta.color} tones; avoid short-term gambling.` ]);
    case "career":   return quick(language === "vi" ? "hợp môi trường rõ KPI, thiên về " + chosen.toLowerCase() + "." : "fit roles aligned with " + chosen.toLowerCase() + " qualities.", [ "• Bồi dưỡng kỹ năng lõi; cân bằng yếu tố còn thiếu.", "• Chọn dự án vào khung giờ thuận lợi." ], [ "• Build core skills; balance the weak element.", "• Time key actions in lucky windows." ]);
    case "health":   return quick(language === "vi" ? "cần cân bằng cảm xúc – ngủ/nghỉ đều." : "balance emotions; rest and sleep regularly.", [ "• Thiền/đi bộ 10–15 phút mỗi ngày.", `• Dùng sắc ${meta.color} để thư giãn.` ], [ "• Meditate/walk 10–15 min daily.", `• Use ${meta.color} palette to relax.` ]);
    case "family":   return quick(language === "vi" ? "gia đạo ổn khi giao tiếp ấm." : "family harmony improves with warm communication.", [ `• Bổ sung ${chosen}; chủ động lắng nghe.`, "• Duy trì nếp sinh hoạt đều." ], [ `• Add ${chosen}; practice active listening.`, "• Keep regular routines." ]);
    case "children": return quick(language === "vi" ? "con cái thiên hướng sáng tạo/học tốt." : "children show creativity/learning.", [ "• Khuyến khích dự án nhỏ, khen đúng lúc.", "• Sắp giờ học theo khung may mắn." ], [ "• Encourage small projects; timely praise.", "• Schedule study in lucky hours." ]);
    case "property": return quick(language === "vi" ? "hợp tài sản cố định; cân đối dòng tiền." : "fixed assets favored; manage cash flow.", [ "• Khảo sát kỹ khu vực; pháp lý rõ.", "• Giao dịch vào khung giờ thuận lợi." ], [ "• Research areas; clean legal status.", "• Time transactions within lucky windows." ]);
    case "thapthan": {
      const counts = {}; Object.values(thapThanResults||{}).forEach(n => { if(n) counts[n]=(counts[n]||0)+1; });
      const tops = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([n,c])=>`${n} (${c})`);
      return language === "vi" ? `Thập Thần nổi bật: ${tops.length?tops.join(" · "):"không đáng kể"}.` : `Ten Gods highlights: ${tops.length?tops.join(" · "):"none"}.`;
    }
    case "thansat": {
      const stars = Object.values(thanSatResults||{}).filter(v=>v.value && v.value.length).map(v => `${v[language]}: ${v.value.join(", ")}`);
      return stars.length ? (language==="vi" ? `Thần Sát kích hoạt: ${stars.join(" | ")}` : `Auspicious Stars: ${stars.join(" | ")}`) : (language==="vi" ? "Không có Thần Sát nổi bật." : "No prominent stars.");
    }
    default:
      return language === "vi"
        ? [`Gợi ý nhanh: tăng **${chosen}** để cân bằng; màu hợp: ${meta.color}.`, "Bạn có thể hỏi sâu về: tài lộc, sự nghiệp, tình cảm, sức khỏe, gia đạo, con cái, tài sản, **thời điểm may mắn**."].join("\n")
        : [`Quick tip: add **${chosen}** to balance; colors: ${meta.color}.`, "Ask about: wealth, career, love, health, family, children, property, **timing/luck**."].join("\n");
  }
};

/* ===== OpenAI (tùy chọn để polish) ===== */
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

/* ===== Route chính ===== */
app.post("/api/luan-giai-bazi", async (req, res) => {
  const startTime = Date.now();
  try {
    const { messages, tuTruInfo, dungThan } = req.body;
    const language = guessLanguage(messages);
    const userInput = (messages || []).slice().reverse().find(m => m.role === "user")?.content || "";

    const cacheKey = `${tuTruInfo}-${userInput}-${language}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ answer: cached });

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

    // Tứ trụ
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

    // Phân tích
    const nguHanh = analyzeNguHanh(tuTru);
    let thapThanResults = {};
    try { thapThanResults = tinhThapThan(tuTru.ngay?.split(" ")[0], tuTru); } catch {}
    const thanSatResults = tinhThanSat(tuTru);

    // Intent
    const flags = determineQuestionType(userInput);
    let intent = "general";
    if (flags.isOverview) intent = "general"; // ép overview
    else if (flags.isTiming) intent = "timing";
    else if (flags.isLove) intent = "love";
    else if (flags.isMoney) intent = "money";
    else if (flags.isCareer) intent = "career";
    else if (flags.isHealth) intent = "health";
    else if (flags.isFamily) intent = "family";
    else if (flags.isChildren) intent = "children";
    else if (flags.isProperty) intent = "property";
    else if (flags.isThapThan) intent = "thapthan";
    else if (flags.isThanSat) intent = "thansat";

    // Kết xuất
    let baseText;
    if (intent === "general") {
      // Nếu người dùng nói "xem bát tự" → luôn kèm trust-intro
      const withIntro = flags.isOverview === true;
      baseText = renderGeneral(tuTru, nguHanh, thapThanResults, thanSatResults, dungThanHanh, language, withIntro);
    } else {
      baseText = renderIntent(intent, tuTru, nguHanh, thapThanResults, thanSatResults, dungThanHanh, language);
    }

    // Polish bằng OpenAI (tùy chọn)
    let answer = baseText;
    if (process.env.USE_OPENAI !== "false") {
      const ok = await checkOpenAIKey();
      if (ok) {
        const prompt = language === "vi"
          ? `Viết lại đoạn sau gọn gàng, thân thiện, không lặp, không thêm năm/tháng tự đoán:\n\n${baseText}`
          : `Rewrite concisely and friendly, no repetition, no invented dates:\n\n${baseText}`;
        try {
          const gptRes = await callOpenAI({
            model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.5,
            max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || "900", 10)
          });
          answer = gptRes?.choices?.[0]?.message?.content?.trim() || baseText;
        } catch {}
      }
    }

    cache.set(cacheKey, answer);
    console.log(`Processing time: ${Date.now() - startTime}ms`);
    return res.json({ answer });
  } catch (err) {
    try { fs.appendFileSync("error.log", `${new Date().toISOString()} - ${err.stack}\n`); } catch {}
    console.error("Route error:", err);
    return res.status(500).json({ error: "Internal error" });
  }
});

/* ===== Error handler & server ===== */
app.use((err, req, res, next) => {
  try { fs.appendFileSync("error.log", `${new Date().toISOString()} - ${err.stack}\n`); } catch {}
  console.error("Lỗi hệ thống:", err.stack);
  res.status(500).json({ error: "System error occurred" });
});

const port = process.env.PORT || 10000;
const server = app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  try { console.log(`OpenAI API key valid: ${await checkOpenAIKey()}`); } catch (e) { console.error("Check OpenAI key error:", e.message); }
});
server.setTimeout(300000);
