// server.js
"use strict";

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
app.use(express.json({ limit: "1mb" }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/health", (_, res) => res.status(200).send("OK"));

/* ========== Utilities ========== */
const rmDiacritics = (s) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const guessLanguage = (messages) => {
  const txt = (messages || []).map((m) => m.content || "").join(" ");
  const looksVI = /ngay|thang|nam|gio|giap|at|binh|dinh|mau|ky|canh|tan|nham|quy|ty|suu|dan|mao|thin|ty|ngo|mui|than|dau|tuat|hoi/i.test(
    rmDiacritics(txt)
  );
  return looksVI ? "vi" : "en";
};

const isHeartfeltOverview = (text) =>
  /hay xem bat tu cho minh nhe/i.test(rmDiacritics(text || ""));

/* ========== Can–Chi maps ========== */
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

/* ========== Normalize & parse ========= */
const normalizeCanChi = (input) => {
  if (!input || typeof input !== "string") return null;
  const [rawCan, rawChi] = input.trim().split(/\s+/);
  if (!rawCan || !rawChi) return null;

  // VI
  const viCan = Object.keys(heavenlyStemsMap.vi);
  const viChi = Object.keys(earthlyBranchesMap.vi);
  const canVi = viCan.find(
    (k) => rmDiacritics(k).toLowerCase() === rmDiacritics(rawCan).toLowerCase()
  );
  const chiVi = viChi.find(
    (k) => rmDiacritics(k).toLowerCase() === rmDiacritics(rawChi).toLowerCase()
  );
  if (canVi && chiVi) return `${canVi} ${chiVi}`;

  // EN
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
      const slot = (m[3] || "").toLowerCase();
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

/* ========== 60 Hoa Giáp (auto) ========== */
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

/* ========== Core tables ========== */
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

const analyzeNguHanh = (tuTru) => {
  const count = { Mộc: 0, Hỏa: 0, Thổ: 0, Kim: 0, Thủy: 0 };
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
    if (canNguHanh[e]) count[canNguHanh[e]] += 1;
    if (chiNguHanh[e]) count[chiNguHanh[e]] += 1;
  }
  for (const chi of branches) {
    (hiddenElements[chi] || []).forEach((h) => {
      if (canNguHanh[h]) count[canNguHanh[h]] += 0.3;
    });
  }
  if (Object.values(count).every((v) => v === 0))
    throw new Error("Không tìm thấy ngũ hành hợp lệ");
  return count;
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
      value:
        coThanQuaTu[ngayChi]?.filter((c) => branches.includes(c)) || [],
    },
    "Kiếp Sát": {
      vi: "Kiếp Sát",
      en: "Robbery Star",
      value: branches.includes(kiepSat[ngayChi]) ? [kiepSat[ngayChi]] : [],
    },
    "Không Vong": {
      vi: "Không Vong",
      en: "Void Star",
      value: (khongVong[tuTru.ngay] || []).filter((c) =>
        branches.includes(c)
      ),
    },
  };
};

/* ========== Personality & meta ========== */
const personalityDescriptions = {
  Mộc: { vi: "sáng tạo, linh hoạt, ham học hỏi", en: "creative, adaptable, curious" },
  Hỏa: { vi: "nhiệt huyết, chủ động, truyền cảm hứng", en: "passionate, proactive, inspiring" },
  Thổ: { vi: "vững chãi, thực tế, đáng tin", en: "grounded, practical, reliable" },
  Kim: { vi: "kỷ luật, sắc sảo, quyết đoán", en: "disciplined, sharp, decisive" },
  Thủy: { vi: "nhạy bén, uyển chuyển, sâu sắc", en: "perceptive, fluid, deep" },
};

const elementMeta = {
  Mộc: {
    vi: { env: "không gian nhiều cây xanh/ánh sáng tự nhiên", jobs: "giáo dục, thiết kế, nội dung, cố vấn phát triển", colors: "xanh lá, gỗ nâu" },
    en: { env: "greenery & natural light", jobs: "education, design, content, advisory", colors: "green, wood-brown" },
  },
  Hỏa: {
    vi: { env: "môi trường sôi động, trình diễn, spotlight", jobs: "truyền thông, sân khấu, năng lượng", colors: "đỏ, cam" },
    en: { env: "dynamic/spotlight settings", jobs: "media, stage, energy", colors: "red, orange" },
  },
  Thổ: {
    vi: { env: "hệ thống ổn định, quản trị – vận hành", jobs: "quản trị, bất động sản, vận hành", colors: "vàng, nâu đất" },
    en: { env: "stable systems & operations", jobs: "management, real estate, operations", colors: "yellow, earth-brown" },
  },
  Kim: {
    vi: { env: "quy chuẩn, dữ liệu, công nghệ – tài chính", jobs: "tài chính, kỹ thuật, pháp chế", colors: "trắng, ánh kim" },
    en: { env: "structured, data/tech/finance", jobs: "finance, engineering, compliance", colors: "white, metallic" },
  },
  Thủy: {
    vi: { env: "nghiên cứu, dữ liệu, di chuyển – kết nối", jobs: "CNTT, logistics, nghiên cứu", colors: "xanh dương, đen" },
    en: { env: "research, data, mobility", jobs: "IT, logistics, research", colors: "blue, black" },
  },
};

/* ========== Topic detection (diverse keywords) ========== */
const detectTopic = (text) => {
  const t = rmDiacritics((text || "").toLowerCase());
  const tests = [
    ["MONEY", /(tai loc|tien|thu nhap|tai chinh|dau tu|kiem tien|wealth|money|finance|income|salary|cashflow|invest|roi|profit)/],
    ["CAREER", /(su nghiep|nghe nghiep|thang tien|cong viec|job|career|promotion|manager|startup|business|ban hang|sales|marketing|product|dev)/],
    ["LOVE", /(tinh cam|tinh yeu|hon nhan|ket hon|yeu|romance|relationship|lover|crush|marriage|couple|doi tac tinh cam)/],
    ["FAMILY", /(gia dinh|gia dao|cha me|vo chong|con chau|noi ngoai|family|parents|spouse|inlaws|home harmony)/],
    ["HEALTH", /(suc khoe|benh|tam ly|stress|mat ngu|dinh duong|tap luyen|health|sleep|anxiety|wellbeing|exercise)/],
    ["CHILDREN", /(con cai|con minh|nuoi day|hoc hanh|education for kids|parenting|child)/],
    ["PROPERTY", /(bat dong san|tai san|dat dai|nha cua|house|property|real estate|land|apartment)/],
    ["STUDY", /(hoc tap|thi cu|bang cap|nghien cuu|du hoc|study|exam|degree)/],
    ["TIMING", /(khi nao may man|thoi diem may man|bao gio tot|tuong lai may man|best time|good timing|luckiest)/],
    ["INVEST", /(co nen dau tu|dau tu gi|risk|stocks|crypto|vay von|investment)/],
    ["COMM", /(giao tiep|thuyet phuc|trinh bay|thuyet trinh|communication|speak|present)/],
    ["COLOR", /(mac mau gi|mau sac hop|tone color|lucky color|ao mau gi|phong thuy mau)/],
  ];
  for (const [name, re] of tests) if (re.test(t)) return name;
  if (isHeartfeltOverview(text)) return "HEARTFELT";
  return "GENERAL";
};

/* ========== Formatting helpers ========== */
const pct = (n) => `${(+n).toFixed(2)}%`;
const bullet = (s) => `• ${s}`;
const joinBullets = (arr) => arr.filter(Boolean).map(bullet).join("\n");

/* ========== Response generators ========== */
const genHeartfeltOverview = (lang, tuTru, nguHanh, thapThan, thanSat, dungThan) => {
  const vi = lang === "vi";
  const nhatChu = tuTru.ngay.split(" ")[0];
  const hanh = canNguHanh[nhatChu];
  const entries = Object.entries(nguHanh);
  const total = entries.reduce((a, [, v]) => a + v, 0) || 1;
  const perc = Object.fromEntries(entries.map(([k, v]) => [k, (v / total) * 100]));
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  const dominant = sorted[0][0];
  const weak = sorted[sorted.length - 1][0];

  const dungs = Array.isArray(dungThan) ? dungThan : [];
  const chosen = dungs[0] || (weak === "Hỏa" ? "Hỏa" : dominant);
  const meta = elementMeta[chosen][vi ? "vi" : "en"];

  const godsCount = {};
  Object.values(thapThan || {}).forEach((n) => {
    if (!n) return;
    godsCount[n] = (godsCount[n] || 0) + 1;
  });
  const topGods = Object.entries(godsCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([n, c]) => `${n} (${c})`)
    .join(" · ");

  const stars = Object.values(thanSat || {})
    .filter((v) => v.value && v.value.length)
    .map((v) => `${v[vi ? "vi" : "en"]}: ${v.value.join(", ")}`)
    .join(" | ");

  if (vi) {
    return [
      `Chào bạn, mình đã xem Tứ Trụ: **Giờ ${tuTru.gio} – Ngày ${tuTru.ngay} – Tháng ${tuTru.thang} – Năm ${tuTru.nam}**.`,
      `Nhật Chủ **${nhatChu} (${hanh})** – khí chất ${personalityDescriptions[hanh].vi}.`,
      `Cán cân Ngũ Hành: Mộc ${pct(perc["Mộc"])} · Hỏa ${pct(perc["Hỏa"])} · Thổ ${pct(perc["Thổ"])} · Kim ${pct(perc["Kim"])} · Thủy ${pct(perc["Thủy"])}.`,
      `Bức tranh tổng thể: **${dominant}** đang vượng, **${weak}** hơi thiếu → nên **bổ ${chosen}** để cân bằng.`,
      `Môi trường hợp: ${meta.env}. Nghề hợp: ${meta.jobs}.`,
      topGods ? `Thập Thần nổi bật: ${topGods}.` : "",
      stars ? `Thần Sát đang kích hoạt: ${stars}.` : "",
      joinBullets([
        `Giữ thói quen định kỳ nuôi dưỡng yếu tố **${chosen}** trong sinh hoạt.`,
        `Dành 20–30 phút mỗi ngày cho hoạt động giúp tâm trí an định / sáng tạo.`,
        `Kết nối Quý Nhân bằng sự chân thành và chia sẻ giá trị bạn mạnh.`,
      ]),
    ]
      .filter(Boolean)
      .join("\n");
  }
  // English
  return [
    `I've reviewed your Four Pillars: **Hour ${tuTru.gio} – Day ${tuTru.ngay} – Month ${tuTru.thang} – Year ${tuTru.nam}**.`,
    `Day Master **${nhatChu} (${hanh})** – ${personalityDescriptions[hanh].en}.`,
    `Five Elements balance: Wood ${pct(perc["Mộc"])} · Fire ${pct(perc["Hỏa"])} · Earth ${pct(perc["Thổ"])} · Metal ${pct(perc["Kim"])} · Water ${pct(perc["Thủy"])}.`,
    `Overall: **${dominant}** is strong, **${weak}** is weaker → **add ${chosen}** to balance.`,
    `Best environments: ${meta.env}. Suitable careers: ${meta.jobs}.`,
    topGods ? `Prominent Ten Gods: ${topGods}.` : "",
    stars ? `Active stars: ${stars}.` : "",
    joinBullets([
      `Nurture **${chosen}** in daily routines.`,
      `20–30 minutes/day for grounding or creative practice.`,
      `Grow your network through honest contributions.`,
    ]),
  ]
    .filter(Boolean)
    .join("\n");
};

const genTopicAnswer = (topic, lang, ctx) => {
  const vi = lang === "vi";
  const { tuTru, nguHanh, thapThan, thanSat, dungThan } = ctx;
  const nhatChu = tuTru.ngay.split(" ")[0];
  const hanh = canNguHanh[nhatChu];
  const dungs = Array.isArray(dungThan) ? dungThan : [];
  const chosen = dungs[0] || "Hỏa";

  // helper: count Ten Gods
  const countGod = (name) =>
    Object.values(thapThan || {}).filter((v) => v === name).length;

  switch (topic) {
    case "MONEY": {
      const ct = countGod("Chính Tài");
      const tt = countGod("Thiên Tài");
      if (vi) {
        return [
          `**Tài vận:** Xu hướng tích lũy **ổn định** nhờ ${ct ? "Chính Tài" : "kỷ luật cá nhân"}; cơ hội đột phá đến từ ${tt ? "Thiên Tài (linh hoạt/ngoài lương)" : "kỹ năng mới bạn đang học"}.`,
          joinBullets([
            "Thiết lập 3 quỹ: chi tiêu – dự phòng 6 tháng – đầu tư đều.",
            "Tập trung tài sản cố định/giá trị thật; tránh lướt sóng theo cảm xúc.",
            `Chọn ngành dòng tiền phù hợp Dụng Thần **${chosen}** (ví dụ: ${
              elementMeta[chosen].vi.jobs
            }).`,
          ]),
        ].join("\n");
      }
      return [
        `**Wealth:** Steady accumulation via ${ct ? "Direct Wealth (discipline)" : "personal budgeting"}; upside from ${tt ? "Indirect Wealth (side income/opportunistic)" : "upskilling and pricing your value"}.`,
        joinBullets([
          "Run 50/30/20 or 60/20/20 budgets with a 6-month buffer.",
          "Prefer cash-flowing or intrinsic-value assets; avoid hype trades.",
          `Aim for income streams aligned with **${chosen}** (e.g., ${elementMeta[chosen].en.jobs}).`,
        ]),
      ].join("\n");
    }

    case "CAREER": {
      const tq = countGod("Chính Quan") + countGod("Thất Sát");
      const an = countGod("Chính Ấn") + countGod("Thiên Ấn");
      const thuc = countGod("Thực Thần") + countGod("Thương Quan");
      if (vi) {
        return [
          "**Sự nghiệp:**",
          tq
            ? "- Có chất lãnh đạo/quy chuẩn; hợp vị trí quản lý hoặc tiêu chuẩn hoá quy trình."
            : "- Hợp môi trường linh hoạt, đề cao hiệu suất thực chiến.",
          an
            ? "- Dễ phát triển ở nơi coi trọng học thuật/giấy tờ – pháp lý."
            : "",
          thuc
            ? "- Mạnh về sáng tạo, sản phẩm, nội dung – truyền thông."
            : "",
          joinBullets([
            `Tìm môi trường mang hành **${chosen}**: ${elementMeta[chosen][
              vi ? "vi" : "en"
            ].env}.`,
            "Xây 1 case study định lượng thành tựu/ROI; cập nhật 3 tháng/lần.",
            "Tận dụng Quý Nhân bằng mentor/peer review mỗi tuần.",
          ]),
        ]
          .filter(Boolean)
          .join("\n");
      }
      return [
        "**Career:**",
        tq ? "- Leadership/compliance potential; suits ops/management." : "- Agile, impact-driven settings suit you.",
        an ? "- Thrive where credentials/research matter." : "",
        thuc ? "- Strong in creativity/product/content." : "",
        joinBullets([
          `Choose **${chosen}** environments: ${elementMeta[chosen].en.env}.`,
          "Build a quantified achievements doc; refresh quarterly.",
          "Leverage mentors/peers weekly.",
        ]),
      ]
        .filter(Boolean)
        .join("\n");
    }

    case "LOVE": {
      const daoHoaAct = thanSat?.["Đào Hoa"]?.value?.length;
      if (vi) {
        return [
          "**Tình cảm:**",
          daoHoaAct
            ? "- Có Đào Hoa: tăng cơ hội gặp gỡ khi tham gia cộng đồng/sự kiện sở thích."
            : "- Duyên đến qua mạng lưới công việc – bạn bè giới thiệu.",
          joinBullets([
            "Giao tiếp theo 'nói thật – nói vừa – nói để gần': chân thành, ngắn gọn, hướng kết nối.",
            `Không gian hẹn hò hợp **${chosen}** (ví dụ: ${elementMeta[chosen].vi.env}).`,
          ]),
        ].join("\n");
      }
      return [
        "**Love:**",
        daoHoaAct
          ? "- Peach Blossom active: join interest-based communities."
          : "- Prospects come via professional/friends network.",
        joinBullets([
          "Communicate: honest—concise—connecting.",
          `Date in **${chosen}** environments (e.g., ${elementMeta[chosen].en.env}).`,
        ]),
      ].join("\n");
    }

    case "FAMILY": {
      if (vi) {
        return [
          "**Gia đạo:** Ưu tiên nền nếp và sự lắng nghe.",
          joinBullets([
            "Thiết lập 1 giờ 'không thiết bị' mỗi tối để trò chuyện.",
            "Mỗi tuần 1 bữa ăn gia đình – mỗi người nói 3 điều biết ơn.",
            "Chia vai theo thế mạnh từng người; các quyết định tiền bạc cần nguyên tắc chung.",
          ]),
        ].join("\n");
      }
      return [
        "**Family:** keep structure and listening.",
        joinBullets([
          "Nightly 1-hour no-device talk time.",
          "Weekly family meal with 3 gratitudes each.",
          "Role-based chores; shared money rules.",
        ]),
      ].join("\n");
    }

    case "HEALTH": {
      const weak = Object.entries(nguHanh).sort((a, b) => a[1] - b[1])[0][0];
      if (vi) {
        return [
          "**Sức khỏe:** chú ý nhịp ngủ và căng thẳng cảm xúc.",
          joinBullets([
            "Đi bộ nhanh 20–30 phút/ngày hoặc thở 4-7-8 trước khi ngủ.",
            `Nuôi dưỡng hành **${weak}** (yếu) qua thực đơn/sinh hoạt phù hợp.`,
            "Giới hạn caffeine sau 14:00; đặt giờ đi ngủ cố định.",
          ]),
        ].join("\n");
      }
      return [
        "**Health:** mind your sleep & stress.",
        joinBullets([
          "20–30 min brisk walk/day or 4-7-8 breathing at night.",
          `Support the weaker element (${weak}) via diet/habits.`,
          "Limit caffeine after 2pm; fixed bedtime.",
        ]),
      ].join("\n");
    }

    case "CHILDREN": {
      if (vi) {
        return [
          "**Con cái:** khuyến khích khám phá & kỷ luật nhẹ nhàng.",
          joinBullets([
            "Chọn hoạt động trải nghiệm/nhóm học theo thế mạnh tự nhiên.",
            "Khen vào nỗ lực & tiến bộ; đặt mục tiêu nhỏ theo tuần.",
            "Đồng hành qua dự án mini cha/mẹ – con cùng làm.",
          ]),
        ].join("\n");
      }
      return [
        "**Children:** curiosity + gentle structure.",
        joinBullets([
          "Pick experiential clubs aligned with natural strengths.",
          "Praise effort & progress; weekly micro-goals.",
          "Do a parent-kid mini project.",
        ]),
      ].join("\n");
    }

    case "PROPERTY": {
      if (vi) {
        return [
          "**Bất động sản/Tài sản:** ưu tiên an toàn & dòng tiền.",
          joinBullets([
            "Không dùng đòn bẩy quá 35–40% thu nhập ròng.",
            "Chọn tài sản có nhu cầu thật (ở/cho thuê), pháp lý rõ.",
            `Môi trường ngành phù hợp **${chosen}**: ${elementMeta[chosen].vi.jobs}.`,
          ]),
        ].join("\n");
      }
      return [
        "**Property/Assets:** safety & cashflow first.",
        joinBullets([
          "Avoid leverage beyond ~35–40% net income.",
          "Prefer real demand & clean legal.",
          `Industry fit with **${chosen}**: ${elementMeta[chosen].en.jobs}.`,
        ]),
      ].join("\n");
    }

    case "STUDY": {
      if (vi) {
        return [
          "**Học tập:**",
          joinBullets([
            "Hệ thống hoá kiến thức theo sơ đồ/từ khoá – ôn lặp 24h/7d.",
            "Tạo nhóm học 2–3 người để dạy lẫn nhau.",
            `Chọn đề tài/khóa học nuôi dưỡng **${chosen}**.`,
          ]),
        ].join("\n");
      }
      return [
        "**Study:**",
        joinBullets([
          "Map concepts; review after 24h/7d (spaced repetition).",
          "Form a 2–3 person study circle.",
          `Pick courses that feed **${chosen}**.`,
        ]),
      ].join("\n");
    }

    case "TIMING": {
      if (vi) {
        return [
          "**Thời điểm may mắn:** nên chọn bối cảnh nuôi dưỡng Dụng Thần thay vì chờ ngày giờ hiếm gặp.",
          joinBullets([
            `Việc quan trọng hãy đặt khi bạn đang “nạp” ${chosen}: không gian ${elementMeta[chosen].vi.env}.`,
            "Chuẩn bị kỹ – hành động nhất quán sẽ mở vận may.",
          ]),
        ].join("\n");
      }
      return [
        "**Lucky timing:** create contexts that feed your Useful God.",
        joinBullets([
          `Schedule key actions where **${chosen}** is present (e.g., ${elementMeta[chosen].en.env}).`,
          "Preparation + consistency compounds luck.",
        ]),
      ].join("\n");
    }

    case "INVEST": {
      if (vi) {
        return [
          "**Đầu tư:**",
          joinBullets([
            "Xác định mục tiêu – ngưỡng chịu rủi ro; tránh quyết định khi cảm xúc mạnh.",
            "Ưu tiên danh mục đa dạng, chi phí thấp; kỷ luật nạp đều.",
            "Giữ quỹ khẩn cấp 6 tháng trước khi tăng rủi ro.",
          ]),
        ].join("\n");
      }
      return [
        "**Investing:**",
        joinBullets([
          "Define goal & risk band; no emotional decisions.",
          "Prefer diversified, low-cost portfolios; DCA with discipline.",
          "Keep 6-month emergency fund before risk.",
        ]),
      ].join("\n");
    }

    case "COLOR": {
      const meta = elementMeta[chosen][vi ? "vi" : "en"];
      if (vi) {
        return `Màu hợp để “nuôi” Dụng Thần **${chosen}**: ${meta.colors}. Dùng khi cần tự tin/kết nối.`;
      }
      return `Supportive colors for **${chosen}**: ${meta.colors}. Use for confidence & connection.`;
    }

    default: {
      // GENERAL: trả lời nhẹ, gợi mở
      return genHeartfeltOverview(lang, tuTru, nguHanh, thapThan, thanSat, dungThan);
    }
  }
};

/* ========== OpenAI (optional) ========== */
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
    return true; // coi như endpoint nghẽn—vẫn cho fallback
  }
};

const callOpenAI = async (payload, retries = 2, delay = 1500) => {
  if (!process.env.OPENAI_API_KEY) throw new Error("Missing OpenAI API key");
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await axios.post(
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
      return res.data;
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) throw new Error("Invalid API key");
      if (attempt === retries || status === 429)
        throw new Error(err.message || "OpenAI error");
      await new Promise((r) => setTimeout(r, delay * attempt));
    }
  }
};

/* ========== Main route ========== */
app.post("/api/luan-giai-bazi", async (req, res) => {
  const start = Date.now();
  try {
    const { messages, tuTruInfo, dungThan } = req.body || {};
    const language = guessLanguage(messages);
    const userInput =
      (messages || []).slice().reverse().find((m) => m.role === "user")
        ?.content || "";

    // Cache
    const cacheKey = `${tuTruInfo}|${userInput}|${language}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ answer: cached, cached: true });

    // Validate
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
      return res
        .status(400)
        .json({
          error:
            language === "vi"
              ? "Dụng Thần không hợp lệ"
              : "Invalid Useful God",
        });
    }

    // Parse tứ trụ
    let tuTru;
    try {
      tuTru = JSON.parse(tuTruInfo);
      tuTru = {
        gio: normalizeCanChi(tuTru.gio),
        ngay: normalizeCanChi(tuTru.ngay),
        thang: normalizeCanChi(tuTru.thang),
        nam: normalizeCanChi(tuTru.nam),
      };
      if (!tuTru.gio || !tuTru.ngay || !tuTru.thang || !tuTru.nam) {
        throw new Error("invalid");
      }
    } catch {
      tuTru = parseEnglishTuTru(userInput);
      if (!tuTru?.gio || !tuTru?.ngay || !tuTru?.thang || !tuTru?.nam) {
        return res.status(400).json({
          error:
            language === "vi"
              ? "Tứ Trụ không hợp lệ"
              : "Invalid Four Pillars",
        });
      }
    }

    // Compute
    const nguHanh = analyzeNguHanh(tuTru);
    let thapThan = {};
    try {
      thapThan = tinhThapThan(tuTru.ngay.split(" ")[0], tuTru);
    } catch (e) {
      // continue with empty
    }
    const thanSat = tinhThanSat(tuTru);

    // Topic & draft
    const topic = detectTopic(userInput);
    const base =
      topic === "HEARTFELT"
        ? genHeartfeltOverview(language, tuTru, nguHanh, thapThan, thanSat, dungThanHanh)
        : genTopicAnswer(topic, language, {
            tuTru,
            nguHanh,
            thapThan,
            thanSat,
            dungThan: dungThanHanh,
          });

    // Optional polish by OpenAI
    const useOpenAI = process.env.USE_OPENAI !== "false";
    if (!useOpenAI) {
      cache.set(cacheKey, base);
      return res.json({ answer: base, took_ms: Date.now() - start });
    }

    const keyOk = await checkOpenAIKey();
    if (!keyOk) {
      cache.set(cacheKey, base);
      return res.json({
        answer: base,
        warning: language === "vi" ? "OpenAI không khả dụng" : "OpenAI unavailable",
        took_ms: Date.now() - start,
      });
    }

    // Prompt: giữ ý — không bịa mốc thời gian
    const prompt =
      (language === "vi"
        ? `Hãy viết lại đoạn dưới đây theo văn phong gần gũi, truyền cảm nhưng rõ ý; giữ nguyên thuật ngữ Bát Tự; không tự bịa mốc thời gian, không lặp lại ý.\n\n`
        : `Rewrite the text below in a warm, clear tone; keep Bazi terms; no invented dates; avoid repetition.\n\n`) + base;

    try {
      const gpt = await callOpenAI({
        model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
        max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || "1100", 10),
      });
      const answer =
        gpt?.choices?.[0]?.message?.content?.trim() || base;
      cache.set(cacheKey, answer);
      return res.json({ answer, took_ms: Date.now() - start });
    } catch (e) {
      // Fallback
      cache.set(cacheKey, base);
      return res.json({
        answer: base,
        warning:
          language === "vi"
            ? `Không thể kết nối OpenAI: ${e.message}`
            : `OpenAI error: ${e.message}`,
        took_ms: Date.now() - start,
      });
    }
  } catch (err) {
    try {
      fs.appendFileSync(
        "error.log",
        `${new Date().toISOString()} - ${err.stack || err.message}\n`
      );
    } catch {}
    return res.status(500).json({ error: "System error occurred" });
  }
});

/* ========== Server boot ========== */
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
