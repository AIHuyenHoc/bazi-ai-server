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

/* ===== Middlewares ===== */
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/health", (req, res) => res.status(200).send("OK"));

/* ===== Utils ===== */
const rmDiacritics = (s) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const guessLanguage = (messages) => {
  const txt = (messages || []).map((m) => m.content || "").join(" ");
  const looksVI = /ngay|thang|nam|gio|giap|at|binh|dinh|mau|ky|canh|tan|nham|quy|ty|suu|dan|mao|thin|ty|ngo|mui|than|dau|tuat|hoi|bat tu|tu tru/i.test(
    rmDiacritics(txt)
  );
  return looksVI ? "vi" : "en";
};

const hasMention = (messages, re) =>
  (messages || [])
    .filter((m) => m.role === "assistant")
    .slice(-8)
    .some((m) => re.test(m.content || ""));

/* ===== Can–Chi maps ===== */
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

const normalizeCanChi = (input) => {
  if (!input || typeof input !== "string") return null;
  const [rawCan, rawChi] = input.trim().split(/\s+/);
  if (!rawCan || !rawChi) return null;

  const viCan = Object.keys(heavenlyStemsMap.vi);
  const viChi = Object.keys(earthlyBranchesMap.vi);
  const canVi = viCan.find(
    (k) =>
      rmDiacritics(k).toLowerCase() === rmDiacritics(rawCan).toLowerCase()
  );
  const chiVi = viChi.find(
    (k) =>
      rmDiacritics(k).toLowerCase() === rmDiacritics(rawChi).toLowerCase()
  );
  if (canVi && chiVi) return `${canVi} ${chiVi}`;

  const enCanKey = Object.keys(heavenlyStemsMap.en).find(
    (k) => k.toLowerCase() === rawCan.toLowerCase()
  );
  const enChiKey = Object.keys(earthlyBranchesMap.en).find(
    (k) => k.toLowerCase() === rawChi.toLowerCase()
  );
  if (enCanKey && enChiKey) {
    return `${heavenlyStemsMap.en[enCanKey]} ${earthlyBranchesMap.en[enChiKey]}`;
  }
  return null;
};

const parseEnglishTuTru = (input) => {
  try {
    if (!input) return null;
    // e.g. "Jia Zi day, Yi You month, Gui Hai hour, Yi Si year"
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

/* ===== 60 Hoa Giáp (auto) ===== */
const heavenlyStemsVI = [
  "Giáp",
  "Ất",
  "Bính",
  "Đinh",
  "Mậu",
  "Kỷ",
  "Canh",
  "Tân",
  "Nhâm",
  "Quý",
];
const earthlyBranchesVI = [
  "Tý",
  "Sửu",
  "Dần",
  "Mão",
  "Thìn",
  "Tỵ",
  "Ngọ",
  "Mùi",
  "Thân",
  "Dậu",
  "Tuất",
  "Hợi",
];
const hoaGiap = Array.from(
  { length: 60 },
  (_, i) => `${heavenlyStemsVI[i % 10]} ${earthlyBranchesVI[i % 12]}`
);

const getCanChiForYear = (year) => {
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return null;
  const baseYear = 1984; // Giáp Tý
  let idx = (year - baseYear) % 60;
  if (idx < 0) idx += 60;
  return hoaGiap[idx] || null;
};

/* ===== Ngũ Hành / Thập Thần / Thần Sát ===== */
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

const analyzeNguHanh = (tuTru) => {
  const nguHanhCount = { Mộc: 0, Hỏa: 0, Thổ: 0, Kim: 0, Thủy: 0 };
  const hiddenElements = {
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
  const elements = [
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

  if (elements.length < 8 || branches.length < 4)
    throw new Error("Tứ Trụ không đầy đủ");

  for (const e of elements) {
    if (canNguHanh[e]) nguHanhCount[canNguHanh[e]] += 1;
    if (chiNguHanh[e]) nguHanhCount[chiNguHanh[e]] += 1;
  }
  for (const chi of branches) {
    (hiddenElements[chi] || []).forEach((h) => {
      if (canNguHanh[h]) nguHanhCount[canNguHanh[h]] += 0.3;
    });
  }
  const total = Object.values(nguHanhCount).reduce((a, b) => a + b, 0);
  if (!total) throw new Error("Không tìm thấy ngũ hành hợp lệ");
  return nguHanhCount;
};

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
  const isYang = ["Giáp", "Bính", "Mậu", "Canh", "Nhâm"].includes(nhatChu);
  const out = {};
  const els = [
    tuTru.gio?.split(" ")[0],
    tuTru.thang?.split(" ")[0],
    tuTru.nam?.split(" ")[0],
  ].filter(Boolean);
  const chis = [
    tuTru.gio?.split(" ")[1],
    tuTru.ngay?.split(" ")[1],
    tuTru.thang?.split(" ")[1],
    tuTru.nam?.split(" ")[1],
  ].filter(Boolean);

  if (els.length < 3 || chis.length < 4) throw new Error("Tứ Trụ không đầy đủ");

  for (const can of els) {
    if (can === nhatChu) continue;
    const h = canNguHanh[can];
    if (!h) continue;
    const sameYang = ["Giáp", "Bính", "Mậu", "Canh", "Nhâm"].includes(can);
    const idx = isYang === sameYang ? 0 : 1;
    out[can] = map[canNguHanh[nhatChu]][h][idx];
  }
  for (const chi of chis) {
    const h = chiNguHanh[chi];
    if (!h) continue;
    const chiYang = ["Tý", "Dần", "Thìn", "Ngọ", "Thân", "Tuất"].includes(chi);
    const idx = isYang === chiYang ? 0 : 1;
    out[chi] = map[canNguHanh[nhatChu]][h][idx];
  }
  return out;
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
    throw new Error("Invalid nhatChu or branches");

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
  const tuongTinh = {
    Thân: "Tý",
    Tý: "Tý",
    Thìn: "Tý",
    Tỵ: "Dậu",
    Dậu: "Dậu",
    Sửu: "Dậu",
    Dần: "Ngọ",
    Ngọ: "Ngọ",
    Tuất: "Ngọ",
    Hợi: "Mão",
    Mão: "Mão",
    Mùi: "Mão",
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
  const coThanQuaTu = {
    Tý: ["Dần", "Tuất"],
    Sửu: ["Dần", "Tuất"],
    Hợi: ["Dần", "Tuất"],
    Dần: ["Tỵ", "Sửu"],
    Mão: ["Tỵ", "Sửu"],
    Thìn: ["Tỵ", "Sửu"],
    Tỵ: ["Thân", "Thìn"],
    Ngọ: ["Thân", "Thìn"],
    Mùi: ["Thân", "Thìn"],
    Thân: ["Hợi", "Mùi"],
    Dậu: ["Hợi", "Mùi"],
    Tuất: ["Hợi", "Mùi"],
  };
  const kiepSat = {
    Thân: "Tỵ",
    Tý: "Tỵ",
    Thìn: "Tỵ",
    Tỵ: "Dần",
    Dậu: "Dần",
    Sửu: "Dần",
    Dần: "Hợi",
    Ngọ: "Hợi",
    Tuất: "Hợi",
    Hợi: "Thân",
    Mão: "Thân",
    Mùi: "Thân",
  };
  const khongVong = {
    "Giáp Tý": ["Tuất", "Hợi"],
    "Ất Sửu": ["Tuất", "Hợi"],
    "Bính Dần": ["Tuất", "Hợi"],
    "Đinh Mão": ["Tuất", "Hợi"],
    "Mậu Thìn": ["Tuất", "Hợi"],
    "Kỷ Tỵ": ["Tuất", "Hợi"],
    "Canh Ngọ": ["Tuất", "Hợi"],
    "Tân Mùi": ["Tuất", "Hợi"],
    "Nhâm Thân": ["Tuất", "Hợi"],
    "Quý Dậu": ["Tuất", "Hợi"],
    "Giáp Tuất": ["Thân", "Dậu"],
    "Ất Hợi": ["Thân", "Dậu"],
    "Bính Tý": ["Thân", "Dậu"],
    "Đinh Sửu": ["Thân", "Dậu"],
    "Mậu Dần": ["Thân", "Dậu"],
    "Kỷ Mão": ["Thân", "Dậu"],
    "Canh Thìn": ["Thân", "Dậu"],
    "Tân Tỵ": ["Thân", "Dậu"],
    "Nhâm Ngọ": ["Thân", "Dậu"],
    "Quý Mùi": ["Thân", "Dậu"],
    "Giáp Thân": ["Ngọ", "Mùi"],
    "Ất Dậu": ["Ngọ", "Mùi"],
    "Bính Tuất": ["Ngọ", "Mùi"],
    "Đinh Hợi": ["Ngọ", "Mùi"],
    "Mậu Tý": ["Ngọ", "Mùi"],
    "Kỷ Sửu": ["Ngọ", "Mùi"],
    "Canh Dần": ["Ngọ", "Mùi"],
    "Tân Mão": ["Ngọ", "Mùi"],
    "Nhâm Thìn": ["Ngọ", "Mùi"],
    "Quý Tỵ": ["Ngọ", "Mùi"],
    "Giáp Ngọ": ["Thìn", "Tỵ"],
    "Ất Mùi": ["Thìn", "Tỵ"],
    "Bính Thân": ["Thìn", "Tỵ"],
    "Đinh Dậu": ["Thìn", "Tỵ"],
    "Mậu Tuất": ["Thìn", "Tỵ"],
    "Kỷ Hợi": ["Thìn", "Tỵ"],
    "Canh Tý": ["Thìn", "Tỵ"],
    "Tân Sửu": ["Thìn", "Tỵ"],
    "Nhâm Dần": ["Thìn", "Tỵ"],
    "Quý Mão": ["Thìn", "Tỵ"],
    "Giáp Thìn": ["Dần", "Mão"],
    "Ất Tỵ": ["Dần", "Mão"],
    "Bính Ngọ": ["Dần", "Mão"],
    "Đinh Mùi": ["Dần", "Mão"],
    "Mậu Thân": ["Dần", "Mão"],
    "Kỷ Dậu": ["Dần", "Mão"],
    "Canh Tuất": ["Dần", "Mão"],
    "Tân Hợi": ["Dần", "Mão"],
    "Nhâm Tý": ["Dần", "Mão"],
    "Quý Sửu": ["Dần", "Mão"],
    "Giáp Dần": ["Tý", "Sửu"],
    "Ất Mão": ["Tý", "Sửu"],
    "Bính Thìn": ["Tý", "Sửu"],
    "Đinh Tỵ": ["Tý", "Sửu"],
    "Mậu Ngọ": ["Tý", "Sửu"],
    "Kỷ Mùi": ["Tý", "Sửu"],
    "Canh Thân": ["Tý", "Sửu"],
    "Tân Dậu": ["Tý", "Sửu"],
    "Nhâm Tuất": ["Tý", "Sửu"],
    "Quý Hợi": ["Tý", "Sửu"],
  };

  return {
    "Thiên Ất Quý Nhân": {
      vi: "Thiên Ất Quý Nhân",
      en: "Nobleman Star",
      value: thienAtQuyNhan[nhatChu]?.filter((c) => branches.includes(c)) || [],
    },
    "Tướng Tinh": {
      vi: "Tướng Tinh",
      en: "General Star",
      value: branches.includes(tuongTinh[ngayChi]) ? [tuongTinh[ngayChi]] : [],
    },
    "Văn Xương": {
      vi: "Văn Xương",
      en: "Literary Star",
      value: vanXuong[nhatChu]?.filter((c) => branches.includes(c)) || [],
    },
    "Đào Hoa": {
      vi: "Đào Hoa",
      en: "Peach Blossom",
      value: branches.includes(daoHoa[ngayChi]) ? [daoHoa[ngayChi]] : [],
    },
    "Dịch Mã": {
      vi: "Dịch Mã",
      en: "Traveling Horse",
      value: branches.includes(dichMa[ngayChi]) ? [dichMa[ngayChi]] : [],
    },
    "Cô Thần Quả Tú": {
      vi: "Cô Thần Quả Tú",
      en: "Loneliness Star",
      value: coThanQuaTu[ngayChi]?.filter((c) => branches.includes(c)) || [],
    },
    "Kiếp Sát": {
      vi: "Kiếp Sát",
      en: "Robbery Star",
      value: branches.includes(kiepSat[ngayChi]) ? [kiepSat[ngayChi]] : [],
    },
    "Không Vong": {
      vi: "Không Vong",
      en: "Void Star",
      value: (khongVong[tuTru.ngay] || []).filter((c) => branches.includes(c)),
    },
  };
};

/* ===== Meta & Rendering ===== */
const personalityDescriptions = {
  Mộc: { vi: "sáng tạo, linh hoạt, thông minh", en: "creative, adaptable, intelligent" },
  Hỏa: { vi: "nhiệt huyết, chủ động", en: "passionate, proactive" },
  Thổ: { vi: "vững chãi, thực tế", en: "grounded, practical" },
  Kim:  { vi: "kỷ luật, quyết đoán", en: "disciplined, decisive" },
  Thủy:{ vi: "nhạy bén, uyển chuyển", en: "perceptive, fluid" },
};

const elementMeta = {
  Mộc:  { vi: { color: "xanh lá",        jobs: "giáo dục, thiết kế, nội dung, cố vấn phát triển" }, en: { color: "green",        jobs: "education, design, content, advisory" } },
  Hỏa:  { vi: { color: "đỏ/cam",         jobs: "truyền thông, trình diễn, năng lượng"             }, en: { color: "red/orange",  jobs: "media, performance, energy tech" } },
  Thổ:  { vi: { color: "vàng/đất",       jobs: "bất động sản, vận hành, quản trị"                 }, en: { color: "yellow/earth",jobs: "real estate, operations, management" } },
  Kim:  { vi: { color: "trắng/ánh kim",  jobs: "tài chính, kỹ thuật, pháp chế"                   }, en: { color: "white/metal", jobs: "finance, engineering, compliance" } },
  Thủy: { vi: { color: "xanh dương/đen", jobs: "CNTT-dữ liệu, logistics, nghiên cứu"              }, en: { color: "blue/black",  jobs: "IT/data, logistics, research" } },
};

const timingByElement = {
  Mộc:  { months: ["Dần", "Mão"],     hours: ["03:00–05:00 (Dần)", "05:00–07:00 (Mão)"] },
  Hỏa:  { months: ["Tỵ", "Ngọ"],     hours: ["09:00–11:00 (Tỵ)", "11:00–13:00 (Ngọ)"] },
  Thổ:  { months: ["Thìn", "Tuất"],  hours: ["07:00–09:00 (Thìn)", "19:00–21:00 (Tuất)"] },
  Kim:  { months: ["Thân", "Dậu"],   hours: ["15:00–17:00 (Thân)", "17:00–19:00 (Dậu)"] },
  Thủy: { months: ["Hợi", "Tý"],     hours: ["21:00–23:00 (Hợi)", "23:00–01:00 (Tý)"] },
};

const pct = (n) => `${(+n).toFixed(2)}%`;

const shouldMentionColor = (userInput, intent, messages) => {
  const askedColor = /mau|màu|color|hop mau|chon mau|tone/i.test(
    rmDiacritics(userInput || "")
  );
  if (askedColor) return true;
  if (intent === "general") return !hasMention(messages, /(Màu|Colors)/i);
  return false;
};

/* ===== Intent detection (expanded) ===== */
const determineQuestionType = (userInput) => {
  const t = rmDiacritics((userInput || "").toLowerCase());
  const is = (re) => re.test(t);

  const types = {
    // overview / trust intro
    isOverview: is(/xem bat tu|xem ba tu|bat tu|tu tru|coi la so|xem la so|bazi|xem ho so/),

    // money — expanded
    isMoney: is(
      /(tien|tien bac|tien nong|thu nhap|luong|thuong|thu nhap|tai chinh|tai loc|tai van|van tai|tai van|tai l?oc|wealth|money|finance|prosper|dau tu|co phieu|chung khoan|coin|crypto|tiet kiem|ngan sach|no|vay)/
    ),

    // career / business
    isCareer: is(
      /(nghe|nghe nghiep|cong viec|su nghiep|thang tien|kinh doanh|start ?up|du an|hop dong|chuyen viec|xin viec|cv|job|career|promotion|boss|sep)/
    ),

    // fame / reputation / branding
    isFame: is(
      /(cong danh|danh tieng|thuong hieu|thuong hieu ca nhan|noi tieng|viral|pr|truyen thong|fame|reputation|success)/
    ),

    // health / well-being
    isHealth: is(
      /(suc khoe|benh|om|dau|met|stress|lo au|tram cam|tam ly|tam than|an ngu|mat ngu|thi?n|yoga|gym|health|well ?being)/
    ),

    // love / marriage
    isLove: is(
      /(hon nhan|ket hon|cuoi|cuoi hoi|tinh yeu|tinh duyen|nguoi yeu|crush|vo chong|ly hon|chia tay|quay lai|love|romance|marriage)/
    ),

    // family
    isFamily: is(
      /(gia dinh|gia dao|cha me|ba me|bo me|anh em|ho hang|ong ba|family|parents|relatives)/
    ),

    // children
    isChildren: is(
      /(con cai|co con|sinh con|hiem muon|nuoi day|giao duc con|children|kid|child)/
    ),

    // property / real estate
    isProperty: is(
      /(tai san|bat dong san|bds|nha dat|mua nha|ban nha|chung cu|can ho|dat dai|so do|so hong|real estate|property)/
    ),

    // timing / luck
    isTiming: is(
      /(khi nao|bao gio|luc nao|thoi diem|thoi gian nao|may man|van may|may man nhat|best time|when|ky hop dong|phong van|ra mat|mo ban|du lich|chuyen nha|chuyen cong tac)/
    ),

    // details
    isThapThan: is(/thap than|10 than|ten gods|ti kien|kiep tai|thuc than|thuong quan|chinh tai|thien tai|chinh quan|that sat|chinh an|thien an/),
    isThanSat: is(/than sat|quy nhan|dao hoa|van xuong|tuong tinh|dich ma|kiep sat|khong vong|co than|qua tu|auspicious/),
  };

  types.isGeneral = !Object.values(types).some(Boolean);
  return types;
};

/* ===== Renderers ===== */
const renderOverview = (tuTru, nguHanhCount, thapThanResults, thanSatResults, dungThan, language, messages) => {
  const nhatChu = tuTru.ngay.split(" ")[0];
  const dmHanh = canNguHanh[nhatChu];
  const entries = Object.entries(nguHanhCount);
  const total = entries.reduce((a, [, v]) => a + v, 0) || 1;
  const perc = Object.fromEntries(entries.map(([k, v]) => [k, (v / total) * 100]));
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  const dominant = sorted[0][0];
  const weak = sorted[sorted.length - 1][0];

  const dungs = Array.isArray(dungThan) ? dungThan : [];
  const chosen = dungs[0] || dominant;
  const meta = elementMeta[chosen][language];
  const mentionColor = shouldMentionColor("", "general", messages);

  const godsCount = {};
  Object.values(thapThanResults || {}).forEach((n) => {
    if (!n) return;
    godsCount[n] = (godsCount[n] || 0) + 1;
  });
  const topGods = Object.entries(godsCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([n, c]) => `${n} (${c})`);

  const activeStars = Object.values(thanSatResults || {})
    .filter((v) => v.value && v.value.length)
    .map((v) => `${v[language]}: ${v.value.join(", ")}`);

  if (language === "vi") {
    return [
      `Mình đã xem Tứ Trụ của bạn: Giờ ${tuTru.gio}, Ngày ${tuTru.ngay}, Tháng ${tuTru.thang}, Năm ${tuTru.nam}.`,
      `Nhật Chủ ${nhatChu} (${dmHanh}) – ${personalityDescriptions[dmHanh].vi}.`,
      `Ngũ Hành: ${["Mộc", "Hỏa", "Thổ", "Kim", "Thủy"].map((h) => `${h} ${pct(perc[h] || 0)}`).join(", ")}.`,
      `Tổng quan: ${dominant} vượng, ${weak} yếu → nên bổ ${chosen.toLowerCase()} để cân bằng.`,
      `Nghề hợp: ${meta.jobs}.` + (mentionColor ? ` Màu gợi ý: ${meta.color}.` : ""),
      topGods.length
        ? `Thập Thần nổi bật: ${topGods.join(" · ")}.`
        : `Thập Thần nổi bật: không đáng kể.`,
      activeStars.length
        ? `Thần Sát kích hoạt: ${activeStars.join(" | ")}.`
        : `Thần Sát kích hoạt: không nổi bật.`,
    ].join("\n");
  } else {
    return [
      `Four Pillars loaded: Hour ${tuTru.gio}, Day ${tuTru.ngay}, Month ${tuTru.thang}, Year ${tuTru.nam}.`,
      `Day Master ${nhatChu} (${dmHanh}) – ${personalityDescriptions[dmHanh].en}.`,
      `Five Elements: ${["Mộc", "Hỏa", "Thổ", "Kim", "Thủy"].map((h) => `${h} ${pct(perc[h] || 0)}`).join(", ")}.`,
      `Overall: ${dominant} strong, ${weak} weak → add ${chosen.toLowerCase()} to balance.`,
      `Suitable careers: ${meta.jobs}.` + (mentionColor ? ` Colors: ${meta.color}.` : ""),
      topGods.length ? `Ten Gods: ${topGods.join(" · ")}.` : `Ten Gods: none prominent.`,
      activeStars.length ? `Auspicious Stars: ${activeStars.join(" | ")}.` : `Auspicious Stars: none prominent.`,
    ].join("\n");
  }
};

const renderIntent = (
  intent,
  tuTru,
  nguHanhCount,
  thapThanResults,
  thanSatResults,
  dungThan,
  language,
  userInput,
  messages
) => {
  const nhatChu = tuTru.ngay.split(" ")[0];
  const chosen = (Array.isArray(dungThan) && dungThan[0]) || canNguHanh[nhatChu];
  const meta = elementMeta[chosen][language];
  const mentionColor = shouldMentionColor(userInput, intent, messages);

  const quick = (titleVI, titleEN, tipsVI = [], tipsEN = []) =>
    language === "vi"
      ? ["Kết luận: " + titleVI, ...tipsVI].filter(Boolean).join("\n")
      : ["Verdict: " + titleEN, ...tipsEN].filter(Boolean).join("\n");

  switch (intent) {
    case "timing": {
      const t = timingByElement[chosen];
      const vi = [
        `thuận lợi khi hành **${chosen}** vượng.`,
        `• Ưu tiên tháng: ${t.months.join(", ")}`,
        `• Ưu tiên giờ: ${t.hours.join(", ")}`,
        `• Không nêu năm cụ thể vì chưa tính Đại vận/Lưu niên.`,
        `• Môi trường nên chọn: ${meta.jobs}.`,
        mentionColor ? `• Màu/cảm hứng: ${meta.color}.` : null,
      ];
      const en = [
        `luck peaks when **${chosen}** is strong.`,
        `• Favor months: ${t.months.join(", ")}`,
        `• Favor hours: ${t.hours.join(", ")}`,
        `• No specific years (Luck/Annual pillars not computed).`,
        `• Preferred environments: ${meta.jobs}.`,
        mentionColor ? `• Colors: ${meta.color}.` : null,
      ];
      return quick(vi.shift(), en.shift(), vi, en);
    }

    case "love":
      return quick(
        "đường tình cảm có duyên, dễ gặp người hợp.",
        "romance is supported; likely to meet a compatible partner.",
        [
          "• Ưu tiên giao tiếp chân thành; hẹn trong khung giờ thuận.",
          mentionColor ? `• Màu gợi ý: ${meta.color}.` : null,
        ],
        [
          "• Communicate honestly; schedule in lucky hours.",
          mentionColor ? `• Colors: ${meta.color}.` : null,
        ]
      );

    case "money":
      return quick(
        "tài vận trung bình–khá; tích lũy tốt khi kỷ luật.",
        "wealth moderate–good; grows with discipline.",
        [
          "• Tập trung tài sản cố định/điểm mạnh sẵn có.",
          "• Tránh đầu tư ngắn hạn liều lĩnh.",
          mentionColor ? `• Màu: ${meta.color}.` : null,
        ],
        [
          "• Prefer fixed assets / core strengths.",
          "• Avoid short-term gambling.",
          mentionColor ? `• Colors: ${meta.color}.` : null,
        ]
      );

    case "career":
      return quick(
        `hợp môi trường có KPI rõ; thiên về phẩm chất ${chosen.toLowerCase()}.`,
        `fit roles aligned with ${chosen.toLowerCase()} qualities.`,
        ["• Bồi dưỡng kỹ năng lõi; cân bằng yếu tố còn thiếu."],
        ["• Build core skills; balance the weak element."]
      );

    case "health":
      return quick(
        "cần cân bằng cảm xúc; ngủ/nghỉ đều; thiền/đi bộ 10–15 phút mỗi ngày.",
        "balance emotions; rest well; meditate/walk 10–15 min daily."
      );

    case "family":
      return quick(
        "gia đạo ổn khi trò chuyện ấm và nếp sinh hoạt đều.",
        "family harmony improves with warm communication and routines."
      );

    case "children":
      return quick(
        "con cái thiên hướng sáng tạo/học tốt; khuyến khích dự án nhỏ.",
        "children show creativity/learning; encourage small projects."
      );

    case "property":
      return quick(
        "hợp tài sản cố định; quản trị dòng tiền chặt.",
        "fixed assets favored; manage cash flow carefully."
      );

    case "thapthan": {
      const counts = {};
      Object.values(thapThanResults || {}).forEach((n) => {
        if (n) counts[n] = (counts[n] || 0) + 1;
      });
      const tops = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([n, c]) => `${n} (${c})`);
      return language === "vi"
        ? `Thập Thần nổi bật: ${tops.length ? tops.join(" · ") : "không đáng kể"}.`
        : `Ten Gods highlights: ${tops.length ? tops.join(" · ") : "none"}.`;
    }

    case "thansat": {
      const stars = Object.values(thanSatResults || {})
        .filter((v) => v.value && v.value.length)
        .map((v) => `${v[language]}: ${v.value.join(", ")}`);
      return stars.length
        ? language === "vi"
          ? `Thần Sát kích hoạt: ${stars.join(" | ")}`
          : `Auspicious Stars: ${stars.join(" | ")}`
        : language === "vi"
        ? "Không có Thần Sát nổi bật."
        : "No prominent stars.";
    }

    default:
      return language === "vi"
        ? "Gợi ý: bạn có thể hỏi sâu về tài vận, sự nghiệp, tình cảm, sức khỏe, gia đạo, con cái, tài sản hoặc **thời điểm may mắn**."
        : "Tip: ask about wealth, career, love, health, family, children, property, or **timing**.";
  }
};

/* ===== Compose final answer (no OpenAI) ===== */
const generateResponse = (
  tuTru,
  nguHanhCount,
  thapThanResults,
  thanSatResults,
  dungThan,
  userInput,
  messages,
  language
) => {
  const intents = determineQuestionType(userInput);
  if (intents.isOverview) {
    return renderOverview(
      tuTru,
      nguHanhCount,
      thapThanResults,
      thanSatResults,
      dungThan,
      language,
      messages
    );
  }
  if (intents.isTiming)
    return renderIntent(
      "timing",
      tuTru,
      nguHanhCount,
      thapThanResults,
      thanSatResults,
      dungThan,
      language,
      userInput,
      messages
    );
  if (intents.isMoney)
    return renderIntent(
      "money",
      tuTru,
      nguHanhCount,
      thapThanResults,
      thanSatResults,
      dungThan,
      language,
      userInput,
      messages
    );
  if (intents.isCareer)
    return renderIntent(
      "career",
      tuTru,
      nguHanhCount,
      thapThanResults,
      thanSatResults,
      dungThan,
      language,
      userInput,
      messages
    );
  if (intents.isLove)
    return renderIntent(
      "love",
      tuTru,
      nguHanhCount,
      thapThanResults,
      thanSatResults,
      dungThan,
      language,
      userInput,
      messages
    );
  if (intents.isHealth)
    return renderIntent(
      "health",
      tuTru,
      nguHanhCount,
      thapThanResults,
      thanSatResults,
      dungThan,
      language,
      userInput,
      messages
    );
  if (intents.isFamily)
    return renderIntent(
      "family",
      tuTru,
      nguHanhCount,
      thapThanResults,
      thanSatResults,
      dungThan,
      language,
      userInput,
      messages
    );
  if (intents.isChildren)
    return renderIntent(
      "children",
      tuTru,
      nguHanhCount,
      thapThanResults,
      thanSatResults,
      dungThan,
      language,
      userInput,
      messages
    );
  if (intents.isProperty)
    return renderIntent(
      "property",
      tuTru,
      nguHanhCount,
      thapThanResults,
      thanSatResults,
      dungThan,
      language,
      userInput,
      messages
    );
  if (intents.isThapThan)
    return renderIntent(
      "thapthan",
      tuTru,
      nguHanhCount,
      thapThanResults,
      thanSatResults,
      dungThan,
      language,
      userInput,
      messages
    );
  if (intents.isThanSat)
    return renderIntent(
      "thansat",
      tuTru,
      nguHanhCount,
      thapThanResults,
      thanSatResults,
      dungThan,
      language,
      userInput,
      messages
    );

  // General small guidance (no color repetition)
  return renderIntent(
    "default",
    tuTru,
    nguHanhCount,
    thapThanResults,
    thanSatResults,
    dungThan,
    language,
    userInput,
    messages
  );
};

/* ===== OpenAI (optional polish) ===== */
const checkOpenAIKey = async () => {
  if (!process.env.OPENAI_API_KEY) return false;
  try {
    await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
      },
      {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        timeout: 8000,
      }
    );
    return true;
  } catch (err) {
    if (err.response && err.response.status === 401) return false;
    return true; // coi như tạm ổn để fallback
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
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );
      return response.data;
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) throw new Error("Invalid API key");
      if (attempt === retries || status === 429)
        throw new Error(err.message || "OpenAI error");
      await new Promise((r) => setTimeout(r, delay * attempt));
    }
  }
};

/* ===== Route ===== */
app.post("/api/luan-giai-bazi", async (req, res) => {
  const startTime = Date.now();
  const { messages, tuTruInfo, dungThan } = req.body;
  const useOpenAI = process.env.USE_OPENAI !== "false";
  const language = guessLanguage(messages);

  const userInput =
    (messages || []).slice().reverse().find((m) => m.role === "user")
      ?.content || "";
  const cacheKey = `${tuTruInfo}-${userInput}-${language}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ answer: cached });

  if (!Array.isArray(messages) || !messages.length) {
    return res
      .status(400)
      .json({ error: language === "vi" ? "Thiếu messages" : "Missing messages" });
  }
  if (!tuTruInfo || typeof tuTruInfo !== "string") {
    return res
      .status(400)
      .json({ error: language === "vi" ? "Thiếu tuTruInfo" : "Missing tuTruInfo" });
  }

  const dungThanHanh = Array.isArray(dungThan)
    ? dungThan
    : dungThan?.hanh || [];
  if (
    !dungThanHanh.every((d) =>
      ["Mộc", "Hỏa", "Thổ", "Kim", "Thủy"].includes(d)
    )
  ) {
    return res.status(400).json({
      error:
        language === "vi" ? "Dụng Thần không hợp lệ" : "Invalid Useful God",
    });
  }

  // Chuẩn hóa tứ trụ
  let tuTru;
  try {
    tuTru = JSON.parse(tuTruInfo);
    tuTru = {
      gio: normalizeCanChi(tuTru.gio),
      ngay: normalizeCanChi(tuTru.ngay),
      thang: normalizeCanChi(tuTru.thang),
      nam: normalizeCanChi(tuTru.nam),
    };
    if (!tuTru.gio || !tuTru.ngay || !tuTru.thang || !tuTru.nam)
      throw new Error("invalid");
  } catch {
    tuTru = parseEnglishTuTru(userInput);
    if (!tuTru?.gio || !tuTru?.ngay || !tuTru?.thang || !tuTru?.nam) {
      return res.status(400).json({
        error:
          language === "vi" ? "Tứ Trụ không hợp lệ" : "Invalid Four Pillars",
      });
    }
  }

  // Phân tích
  let nguHanh;
  try {
    nguHanh = analyzeNguHanh(tuTru);
  } catch {
    return res.status(400).json({
      error:
        language === "vi"
          ? "Dữ liệu ngũ hành không hợp lệ"
          : "Invalid Five Elements",
    });
  }

  let thapThanResults = {};
  try {
    thapThanResults = tinhThapThan(tuTru.ngay?.split(" ")[0], tuTru);
  } catch (e) {
    console.error("Lỗi Thập Thần:", e.message);
  }

  let thanSatResults = {};
  try {
    thanSatResults = tinhThanSat(tuTru);
  } catch (e) {
    console.error("Lỗi Thần Sát:", e.message);
    return res.status(400).json({
      error:
        language === "vi"
          ? "Lỗi tính Thần Sát"
          : "Error calculating Auspicious Stars",
    });
  }

  // Sinh nội bộ
  const baseText = generateResponse(
    tuTru,
    nguHanh,
    thapThanResults,
    thanSatResults,
    dungThanHanh,
    userInput,
    messages,
    language
  );

  if (!useOpenAI) {
    cache.set(cacheKey, baseText);
    console.log(`Processing time: ${Date.now() - startTime}ms`);
    return res.json({ answer: baseText });
  }

  // Dùng OpenAI để "polish" (không phát minh dữ kiện mới)
  const prompt =
    (language === "vi"
      ? "Viết lại đoạn dưới đây gọn gàng, thân thiện, không lặp, giữ nguyên thuật ngữ Bát Tự; không bịa thời gian/tiên đoán:\n\n"
      : "Rewrite the text concisely, friendly, non-repetitive, keep Bazi terms; do not invent dates/predictions:\n\n") +
    baseText;

  try {
    const ok = await checkOpenAIKey();
    if (!ok) throw new Error("Invalid API key");
    const gptRes = await callOpenAI({
      model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.45,
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || "1100", 10),
    });
    const answer =
      gptRes?.choices?.[0]?.message?.content?.trim() || baseText;
    cache.set(cacheKey, answer);
    console.log(`Processing time: ${Date.now() - startTime}ms`);
    return res.json({ answer });
  } catch (err) {
    console.error("OpenAI error:", err.message);
    cache.set(cacheKey, baseText);
    return res.json({
      answer: baseText,
      warning:
        language === "vi"
          ? `Không thể kết nối OpenAI: ${err.message}`
          : `OpenAI unavailable: ${err.message}`,
    });
  }
});

/* ===== Error Handler ===== */
app.use((err, req, res, next) => {
  try {
    fs.appendFileSync(
      "error.log",
      `${new Date().toISOString()} - ${err.stack}\n`
    );
  } catch {}
  console.error("Lỗi hệ thống:", err.stack);
  res.status(500).json({ error: "System error occurred" });
});

/* ===== Server ===== */
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
