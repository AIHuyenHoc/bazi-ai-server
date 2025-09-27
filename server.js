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
    windowMs: 15 * 60 * 1000, // 15 phút
    max: 100, // Giới hạn 100 yêu cầu mỗi IP trong 15 phút
  })
);

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

const canChiNguHanhInfo = `
Ngũ hành 10 Thiên Can:
- Giáp, Ất: Mộc
- Bính, Đinh: Hỏa
- Mậu, Kỷ: Thổ
- Canh, Tân: Kim
- Nhâm, Quý: Thủy
Ngũ hành 12 Địa Chi:
- Tý, Hợi: Thủy
- Sửu, Thìn, Mùi, Tuất: Thổ
- Dần, Mão: Mộc
- Tỵ, Ngọ: Hỏa
- Thân, Dậu: Kim
`;

const heavenlyStemsMap = {
  en: { Jia: "Giáp", Yi: "Ất", Bing: "Bính", Ding: "Đinh", Wu: "Mậu", Ji: "Kỷ", Geng: "Canh", Xin: "Tân", Ren: "Nhâm", Gui: "Quý" },
  vi: { Giáp: "Giáp", Ất: "Ất", Bính: "Bính", Đinh: "Đinh", Mậu: "Mậu", Kỷ: "Kỷ", Canh: "Canh", Tân: "Tân", Nhâm: "Nhâm", Quý: "Quý" }
};
const earthlyBranchesMap = {
  en: { Rat: "Tý", Ox: "Sửu", Tiger: "Dần", Rabbit: "Mão", Dragon: "Thìn", Snake: "Tỵ", Horse: "Ngọ", Goat: "Mùi", Monkey: "Thân", Rooster: "Dậu", Dog: "Tuất", Pig: "Hợi" },
  vi: { Tý: "Tý", Sửu: "Sửu", Dần: "Dần", Mão: "Mão", Thìn: "Thìn", Tỵ: "Tỵ", Ngọ: "Ngọ", Mùi: "Mùi", Thân: "Thân", Dậu: "Dậu", Tuất: "Tuất", Hợi: "Hợi" }
};

const normalizeCanChi = (input) => {
  if (!input || typeof input !== "string") return null;
  const parts = input.trim().split(" ");
  if (parts.length !== 2) return null;
  const can = Object.keys(heavenlyStemsMap.vi).find(k => k.toLowerCase() === parts[0].toLowerCase());
  const chi = Object.keys(earthlyBranchesMap.vi).find(k => k.toLowerCase() === parts[1].toLowerCase());
  if (!can || !chi) return null;
  return `${can} ${chi}`;
};

const parseEnglishTuTru = (input) => {
  try {
    const parts = input.match(/(\w+\s+\w+)\s*(?:hour|day|month|year)/gi)?.map(part => part.trim().split(" "));
    if (!parts || parts.length !== 4) return null;
    return {
      gio: `${heavenlyStemsMap.en[parts[0][0]] || parts[0][0]} ${earthlyBranchesMap.en[parts[0][1]] || parts[0][1]}`,
      ngay: `${heavenlyStemsMap.en[parts[1][0]] || parts[1][0]} ${earthlyBranchesMap.en[parts[1][1]] || parts[1][1]}`,
      thang: `${heavenlyStemsMap.en[parts[2][0]] || parts[2][0]} ${earthlyBranchesMap.en[parts[2][1]] || parts[2][1]}`,
      nam: `${heavenlyStemsMap.en[parts[3][0]] || parts[3][0]} ${earthlyBranchesMap.en[parts[3][1]] || parts[3][1]}`
    };
  } catch (e) {
    console.error("Lỗi parseEnglishTuTru:", e.message);
    return null;
  }
};

const hoaGiap = [
   "Giáp Tý", "Ất Sửu", "Bính Dần", "Đinh Mão", "Mậu Thìn", "Kỷ Tỵ", "Canh Ngọ", "Tân Mùi", "Nhâm Thân", "Quý Dậu",
  "Giáp Tuất", "Ất Hợi", "Bính Tý", "Đinh Sửu", "Mậu Dần", "Kỷ Mão", "Canh Thìn", "Tân Tỵ", "Nhâm Ngọ", "Quý Mùi",
  "Giáp Thân", "Ất Dậu", "Bính Tuất", "Đinh Hợi", "Mậu Tý", "Kỷ Sửu", "Canh Dần", "Tân Mão", "Nhâm Thìn", "Quý Tỵ",
  "Giáp Ngọ", "Ất Mùi", "Bính Thân", "Đinh Dậu", "Mậu Tuất", "Kỷ Hợi", "Canh Tý", "Tân Sửu", "Nhâm Dần", "Quý Mão",
  "Giáp Thìn", "Ất Tỵ", "Bính Ngọ", "Đinh Mùi", "Mậu Thân, "Kỷ Dậu", "Canh Tuất", "Tân Hợi", "Nhâm Tý", "Quý Sửu",
  "Giáp Dần", "Ất Mão", "Bính Thìn", "Đinh Tỵ", "Mậu Ngọ", "Kỷ Mùi", "Canh Thân", "Tân Dậu", "Nhâm Tuất", "Quý Hợi"
];

const getCanChiForYear = (year) => {
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return null;
  const baseYear = 1984;
  const index = (year - baseYear) % 60;
  const adjustedIndex = index < 0 ? index + 60 : index;
  return hoaGiap[adjustedIndex] || null;
};

const analyzeNguHanh = (tuTru) => {
  const nguHanhCount = { Mộc: 0, Hỏa: 0, Thổ: 0, Kim: 0, Thủy: 0 };
  const canNguHanh = {
    Giáp: "Mộc", Ất: "Mộc", Bính: "Hỏa", Đinh: "Hỏa", Mậu: "Thổ",
    Kỷ: "Thổ", Canh: "Kim", Tân: "Kim", Nhâm: "Thủy", Quý: "Thủy"
  };
  const chiNguHanh = {
    Tý: "Thủy", Hợi: "Thủy", Sửu: "Thổ", Thìn: "Thổ", Mùi: "Thổ", Tuất: "Thổ",
    Dần: "Mộc", Mão: "Mộc", Tỵ: "Hỏa", Ngọ: "Hỏa", Thân: "Kim", Dậu: "Kim"
  };
  const hiddenElements = {
    Tý: ["Quý"], Sửu: ["Kỷ", "Tân", "Quý"], Dần: ["Giáp", "Bính", "Mậu"], Mão: ["Ất"],
    Thìn: ["Mậu", "Ất", "Quý"], Tỵ: ["Bính", "Canh", "Mậu"], Ngọ: ["Đinh", "Kỷ"],
    Mùi: ["Kỷ", "Đinh", "Ất"], Thân: ["Canh", "Nhâm", "Mậu"], Dậu: ["Tân"],
    Tuất: ["Mậu", "Đinh", "Tân"], Hợi: ["Nhâm", "Giáp"]
  };

  try {
    const elements = [
      tuTru.nam ? tuTru.nam.split(" ") : [],
      tuTru.thang ? tuTru.thang.split(" ") : [],
      tuTru.ngay ? tuTru.ngay.split(" ") : [],
      tuTru.gio ? tuTru.gio.split(" ") : []
    ].flat().filter(Boolean);
    const branches = [
      tuTru.nam?.split(" ")[1], tuTru.thang?.split(" ")[1],
      tuTru.ngay?.split(" ")[1], tuTru.gio?.split(" ")[1]
    ].filter(Boolean);

    if (elements.length < 4 || branches.length < 4) {
      throw new Error("Tứ Trụ không đầy đủ");
    }

    for (const elem of elements) {
      if (canNguHanh[elem]) nguHanhCount[canNguHanh[elem]] += 1;
      if (chiNguHanh[elem]) nguHanhCount[chiNguHanh[elem]] += 1;
    }
    for (const chi of branches) {
      const hidden = hiddenElements[chi] || [];
      for (const hiddenCan of hidden) {
        if (canNguHanh[hiddenCan]) nguHanhCount[canNguHanh[hiddenCan]] += 0.3;
      }
    }

    const total = Object.values(nguHanhCount).reduce((a, b) => a + b, 0);
    if (total === 0) throw new Error("Không tìm thấy ngũ hành hợp lệ");
    return nguHanhCount;
  } catch (e) {
    console.error("Lỗi phân tích ngũ hành:", e.message);
    throw new Error("Không thể phân tích ngũ hành");
  }
};

const tinhThapThan = (nhatChu, tuTru) => {
  const canNguHanh = {
    Giáp: "Mộc", Ất: "Mộc", Bính: "Hỏa", Đinh: "Hỏa", Mậu: "Thổ",
    Kỷ: "Thổ", Canh: "Kim", Tân: "Kim", Nhâm: "Thủy", Quý: "Thủy"
  };
  const chiNguHanh = {
    Tý: "Thủy", Hợi: "Thủy", Sửu: "Thổ", Thìn: "Thổ", Mùi: "Thổ", Tuất: "Thổ",
    Dần: "Mộc", Mão: "Mộc", Tỵ: "Hỏa", Ngọ: "Hỏa", Thân: "Kim", Dậu: "Kim"
  };
  const thapThanMap = {
    Kim: {
      Kim: ["Tỷ Kiên", "Kiếp Tài"], Thủy: ["Thực Thần", "Thương Quan"], Mộc: ["Chính Tài", "Thiên Tài"],
      Hỏa: ["Chính Quan", "Thất Sát"], Thổ: ["Chính Ấn", "Thiên Ấn"]
    },
    Mộc: {
      Mộc: ["Tỷ Kiên", "Kiếp Tài"], Hỏa: ["Thực Thần", "Thương Quan"], Thổ: ["Chính Tài", "Thiên Tài"],
      Kim: ["Chính Quan", "Thất Sát"], Thủy: ["Chính Ấn", "Thiên Ấn"]
    },
    Hỏa: {
      Hỏa: ["Tỷ Kiên", "Kiếp Tài"], Thổ: ["Thực Thần", "Thương Quan"], Kim: ["Chính Tài", "Thiên Tài"],
      Thủy: ["Chính Quan", "Thất Sát"], Mộc: ["Chính Ấn", "Thiên Ấn"]
    },
    Thổ: {
      Thổ: ["Tỷ Kiên", "Kiếp Tài"], Kim: ["Thực Thần", "Thương Quan"], Thủy: ["Chính Tài", "Thiên Tài"],
      Mộc: ["Chính Quan", "Thất Sát"], Hỏa: ["Chính Ấn", "Thiên Ấn"]
    },
    Thủy: {
      Thủy: ["Tỷ Kiên", "Kiếp Tài"], Mộc: ["Thực Thần", "Thương Quan"], Hỏa: ["Chính Tài", "Thiên Tài"],
      Thổ: ["Chính Quan", "Thất Sát"], Kim: ["Chính Ấn", "Thiên Ấn"]
    }
  };

  if (!nhatChu || !canNguHanh[nhatChu]) {
    throw new Error("Nhật Chủ không hợp lệ");
  }

  const isYang = ["Giáp", "Bính", "Mậu", "Canh", "Nhâm"].includes(nhatChu);
  const thapThanResults = {};

  try {
    const elements = [
      tuTru.gio?.split(" ")[0], tuTru.thang?.split(" ")[0], tuTru.nam?.split(" ")[0]
    ].filter(Boolean);
    const branches = [
      tuTru.gio?.split(" ")[1], tuTru.ngay?.split(" ")[1],
      tuTru.thang?.split(" ")[1], tuTru.nam?.split(" ")[1]
    ].filter(Boolean);

    if (elements.length < 3 || branches.length < 4) {
      throw new Error("Tứ Trụ không đầy đủ");
    }

    for (const can of elements) {
      if (can === nhatChu) continue;
      const nguHanh = canNguHanh[can];
      if (!nguHanh) continue;
      const isCanYang = ["Giáp", "Bính", "Mậu", "Canh", "Nhâm"].includes(can);
      const index = (isYang === isCanYang) ? 0 : 1;
      thapThanResults[can] = thapThanMap[canNguHanh[nhatChu]][nguHanh][index];
    }

    for (const chi of branches) {
      const nguHanh = chiNguHanh[chi];
      if (!nguHanh) continue;
      const isChiYang = ["Tý", "Dần", "Thìn", "Ngọ", "Thân", "Tuất"].includes(chi);
      const index = (isYang === isChiYang) ? 0 : 1;
      thapThanResults[chi] = thapThanMap[canNguHanh[nhatChu]][nguHanh][index];
    }

    return thapThanResults;
  } catch (e) {
    console.error("Lỗi tính Thập Thần:", e.message);
    throw new Error("Không thể tính Thập Thần");
  }
};

const tinhThanSat = (tuTru) => {
  const nhatChu = tuTru.ngay?.split(" ")[0];
  const ngayChi = tuTru.ngay?.split(" ")[1];
  const branches = [
    tuTru.nam?.split(" ")[1], tuTru.thang?.split(" ")[1],
    tuTru.ngay?.split(" ")[1], tuTru.gio?.split(" ")[1]
  ].filter(Boolean);

  if (!nhatChu || !ngayChi || !branches.length) {
    throw new Error("Invalid nhatChu or branches");
  }

  const thienAtQuyNhan = {
    Giáp: ["Sửu", "Mùi"], Mậu: ["Sửu", "Mùi"], Canh: ["Sửu", "Mùi"],
    Ất: ["Thân", "Tý"], Kỷ: ["Thân", "Tý"],
    Bính: ["Dậu", "Hợi"], Đinh: ["Dậu", "Hợi"],
    Tân: ["Dần", "Ngọ"],
    Nhâm: ["Tỵ", "Mão"], Quý: ["Tỵ", "Mão"]
  };

  const tuongTinh = {
    Thân: "Tý", Tý: "Tý", Thìn: "Tý",
    Tỵ: "Dậu", Dậu: "Dậu", Sửu: "Dậu",
    Dần: "Ngọ", Ngọ: "Ngọ", Tuất: "Ngọ",
    Hợi: "Mão", Mão: "Mão", Mùi: "Mão"
  };

  const vanXuong = {
    Giáp: ["Tỵ"], Ất: ["Ngọ"], Bính: ["Thân"], Đinh: ["Dậu"],
    Mậu: ["Thân"], Kỷ: ["Dậu"], Canh: ["Hợi"], Tân: ["Tý"],
    Nhâm: ["Dần"], Quý: ["Mão"]
  };

  const daoHoa = {
    Thân: "Dậu", Tý: "Dậu", Thìn: "Dậu",
    Tỵ: "Ngọ", Dậu: "Ngọ", Sửu: "Ngọ",
    Dần: "Mão", Ngọ: "Mão", Tuất: "Mão",
    Hợi: "Tý", Mão: "Tý", Mùi: "Tý"
  };

  const dichMa = {
    Thân: "Dần", Tý: "Dần", Thìn: "Dần",
    Tỵ: "Hợi", Dậu: "Hợi", Sửu: "Hợi",
    Dần: "Thân", Ngọ: "Thân", Tuất: "Thân",
    Hợi: "Tỵ", Mão: "Tỵ", Mùi: "Tỵ"
  };

  const coThanQuaTu = {
    Tý: ["Dần", "Tuất"], Sửu: ["Dần", "Tuất"], Hợi: ["Dần", "Tuất"],
    Dần: ["Tỵ", "Sửu"], Mão: ["Tỵ", "Sửu"], Thìn: ["Tỵ", "Sửu"],
    Tỵ: ["Thân", "Thìn"], Ngọ: ["Thân", "Thìn"], Mùi: ["Thân", "Thìn"],
    Thân: ["Hợi", "Mùi"], Dậu: ["Hợi", "Mùi"], Tuất: ["Hợi", "Mùi"]
  };

  const kiepSat = {
    Thân: "Tỵ", Tý: "Tỵ", Thìn: "Tỵ",
    Tỵ: "Dần", Dậu: "Dần", Sửu: "Dần",
    Dần: "Hợi", Ngọ: "Hợi", Tuất: "Hợi",
    Hợi: "Thân", Mão: "Thân", Mùi: "Thân"
  };

  const khongVong = {
    "Giáp Tý": ["Tuất", "Hợi"], "Ất Sửu": ["Tuất", "Hợi"], "Bính Dần": ["Tuất", "Hợi"], "Đinh Mão": ["Tuất", "Hợi"],
    "Mậu Thìn": ["Tuất", "Hợi"], "Kỷ Tỵ": ["Tuất", "Hợi"], "Canh Ngọ": ["Tuất", "Hợi"], "Tân Mùi": ["Tuất", "Hợi"],
    "Nhâm Thân": ["Tuất", "Hợi"], "Quý Dậu": ["Tuất", "Hợi"],
    "Giáp Tuất": ["Thân", "Dậu"], "Ất Hợi": ["Thân", "Dậu"], "Bính Tý": ["Thân", "Dậu"], "Đinh Sửu": ["Thân", "Dậu"],
    "Mậu Dần": ["Thân", "Dậu"], "Kỷ Mão": ["Thân", "Dậu"], "Canh Thìn": ["Thân", "Dậu"], "Tân Tỵ": ["Thân", "Dậu"],
    "Nhâm Ngọ": ["Thân", "Dậu"], "Quý Mùi": ["Thân", "Dậu"],
    "Giáp Thân": ["Ngọ", "Mùi"], "Ất Dậu": ["Ngọ", "Mùi"], "Bính Tuất": ["Ngọ", "Mùi"], "Đinh Hợi": ["Ngọ", "Mùi"],
    "Mậu Tý": ["Ngọ", "Mùi"], "Kỷ Sửu": ["Ngọ", "Mùi"], "Canh Dần": ["Ngọ", "Mùi"], "Tân Mão": ["Ngọ", "Mùi"],
    "Nhâm Thìn": ["Ngọ", "Mùi"], "Quý Tỵ": ["Ngọ", "Mùi"],
    "Giáp Ngọ": ["Thìn", "Tỵ"], "Ất Mùi": ["Thìn", "Tỵ"], "Bính Thân": ["Thìn", "Tỵ"], "Đinh Dậu": ["Thìn", "Tỵ"],
    "Mậu Tuất": ["Thìn", "Tỵ"], "Kỷ Hợi": ["Thìn", "Tỵ"], "Canh Tý": ["Thìn", "Tỵ"], "Tân Sửu": ["Thìn", "Tỵ"],
    "Nhâm Dần": ["Thìn", "Tỵ"], "Quý Mão": ["Thìn", "Tỵ"],
    "Giáp Thìn": ["Dần", "Mão"], "Ất Tỵ": ["Dần", "Mão"], "Bính Ngọ": ["Dần", "Mão"], "Đinh Mùi": ["Dần", "Mão"],
    "Mậu Thân": ["Dần", "Mão"], "Kỷ Dậu": ["Dần", "Mão"], "Canh Tuất": ["Dần", "Mão"], "Tân Hợi": ["Dần", "Mão"],
    "Nhâm Tý": ["Dần", "Mão"], "Quý Sửu": ["Dần", "Mão"],
    "Giáp Dần": ["Tý", "Sửu"], "Ất Mão": ["Tý", "Sửu"], "Bính Thìn": ["Tý", "Sửu"], "Đinh Tỵ": ["Tý", "Sửu"],
    "Mậu Ngọ": ["Tý", "Sửu"], "Kỷ Mùi": ["Tý", "Sửu"], "Canh Thân": ["Tý", "Sửu"], "Tân Dậu": ["Tý", "Sửu"],
    "Nhâm Tuất": ["Tý", "Sửu"], "Quý Hợi": ["Tý", "Sửu"]
  };

  return {
    "Thiên Ất Quý Nhân": {
      vi: "Thiên Ất Quý Nhân",
      en: "Nobleman Star",
      value: thienAtQuyNhan[nhatChu]?.filter(chi => branches.includes(chi)) || []
    },
    "Tướng Tinh": {
      vi: "Tướng Tinh",
      en: "General Star",
      value: branches.includes(tuongTinh[ngayChi]) ? [tuongTinh[ngayChi]] : []
    },
    "Văn Xương": {
      vi: "Văn Xương",
      en: "Literary Star",
      value: vanXuong[nhatChu]?.filter(chi => branches.includes(chi)) || []
    },
    "Đào Hoa": {
      vi: "Đào Hoa",
      en: "Peach Blossom",
      value: branches.includes(daoHoa[ngayChi]) ? [daoHoa[ngayChi]] : []
    },
    "Dịch Mã": {
      vi: "Dịch Mã",
      en: "Traveling Horse",
      value: branches.includes(dichMa[ngayChi]) ? [dichMa[ngayChi]] : []
    },
    "Cô Thần Quả Tú": {
      vi: "Cô Thần Quả Tú",
      en: "Loneliness Star",
      value: coThanQuaTu[ngayChi]?.filter(chi => branches.includes(chi)) || []
    },
    "Kiếp Sát": {
      vi: "Kiếp Sát",
      en: "Robbery Star",
      value: branches.includes(kiepSat[ngayChi]) ? [kiepSat[ngayChi]] : []
    },
    "Không Vong": {
      vi: "Không Vong",
      en: "Void Star",
      value: khongVong[tuTru.ngay]?.filter(chi => branches.includes(chi)) || []
    }
  };
};

const personalityDescriptions = {
  Mộc: { vi: "sáng tạo, linh hoạt, thông minh", en: "creative, adaptable, intelligent" },
  Hỏa: { vi: "đam mê, năng động, nhiệt huyết", en: "passionate, energetic, enthusiastic" },
  Thổ: { vi: "vững chãi, đáng tin, thực tế", en: "steadfast, reliable, practical" },
  Kim: { vi: "tinh tế, quyết tâm, chính trực", en: "elegant, determined, upright" },
  Thủy: { vi: "sâu sắc, trí tuệ, nhạy bén", en: "profound, intelligent, perceptive" }
};

const thapThanEffects = {
  "Tỷ Kiên": { vi: "Tự lập, mạnh mẽ", en: "Independent, strong" },
  "Kiếp Tài": { vi: "Tài năng, quyết đoán", en: "Talented, decisive" },
  "Thực Thần": { vi: "Sáng tạo, nghệ thuật", en: "Creative, artistic" },
  "Thương Quan": { vi: "Tư duy sắc bén", en: "Sharp-minded" },
  "Chính Tài": { vi: "Giỏi quản lý tài chính", en: "Good at financial management" },
  "Thiên Tài": { vi: "Nhạy bén, sáng tạo", en: "Perceptive, creative" },
  "Chính Quan": { vi: "Trách nhiệm, uy tín", en: "Responsible, influential" },
  "Thất Sát": { vi: "Dũng cảm, quyết liệt", en: "Courageous, assertive" },
  "Chính Ấn": { vi: "Trí tuệ, học vấn", en: "Wise, scholarly" },
  "Thiên Ấn": { vi: "Sáng tạo, tư duy độc đáo", en: "Creative, unique thinking" }
};

const determineQuestionType = (userInput, language) => {
  const normalizedInput = typeof userInput === "string" ? userInput.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
  const types = {
    isMoney: /tien bac|tai chinh|tai loc|money|finance|wealth|thu nhap|lam giau|dau tu|invest/i.test(normalizedInput),
    isCareer: /nghe|cong viec|su nghiep|career|job|lam viec|thang tien|chuyen mon|kinh doanh|business|khoi nghiep|startup/i.test(normalizedInput),
    isFame: /cong danh|fame|reputation|danh tieng|truyen thong|no tieng|thanh cong|success/i.test(normalizedInput),
    isHealth: /suc khoe|benh tat|health|the luc|binh an|tam ly|mental/i.test(normalizedInput),
    isLove: /tinh duyen|tinh yeu|love|hon nhan|marriage|vo chong|nguoi yeu|ket hon|romance|lang man|duyen phan/i.test(normalizedInput),
    isFamily: /gia dao|gia dinh|family|phu huynh|cha me|vo chong|ho hang|relative/i.test(normalizedInput),
    isChildren: /con cai|children|con trai|con gai|nuoi day|parenting/i.test(normalizedInput),
    isProperty: /tai san|dat dai|property|real estate|nha cua|bat dong san|so huu/i.test(normalizedInput),
    isComplex: /du doan|tuong lai|future|dai van|vận mệnh|so phan|destiny/i.test(normalizedInput),
    isThapThan: /thap than|ten gods/i.test(normalizedInput),
    isThanSat: /than sat|auspicious stars|sao|quy nhan|dao hoa|van xuong|tuong tinh|dich ma|co than|qua tu|kiep sat|khong vong/i.test(normalizedInput)
  };
  types.isGeneral = !Object.values(types).some(v => v);
  return types;
};

const generateResponse = (tuTru, nguHanhCount, thapThanResults, thanSatResults, dungThan, userInput, messages, language) => {
  const totalElements = Object.values(nguHanhCount).reduce((a, b) => a + b, 0);
  const tyLeNguHanh = Object.fromEntries(
    Object.entries(nguHanhCount).map(([k, v]) => [k, `${((v / totalElements) * 100).toFixed(2)}%`])
  );
  const nhatChu = tuTru.ngay.split(" ")[0];
  const canNguHanh = {
    Giáp: "Mộc", Ất: "Mộc", Bính: "Hỏa", Đinh: "Hỏa", Mậu: "Thổ",
    Kỷ: "Thổ", Canh: "Kim", Tân: "Kim", Nhâm: "Thủy", Quý: "Thủy"
  };

  const { isGeneral, isMoney, isCareer, isFame, isHealth, isLove, isFamily, isChildren, isProperty, isComplex, isThapThan, isThanSat } = determineQuestionType(userInput, language);

  if (isComplex) {
    return `${language === "vi" ? "Vui lòng gửi câu hỏi qua app.aihuyenhoc@gmail.com" : "Please send questions to app.aihuyenhoc@gmail.com"}`;
  }

  let response = "";

  if (isGeneral) {
    response += `
${language === "vi" ? "Luận giải Bát Tự:" : "Bazi Interpretation:"}
${language === "vi" ? `Nhật Chủ ${nhatChu} (${canNguHanh[nhatChu]}): ${personalityDescriptions[canNguHanh[nhatChu]].vi}` : `Day Master ${nhatChu} (${canNguHanh[nhatChu]}): ${personalityDescriptions[canNguHanh[nhatChu]].en}`}
Tứ Trụ: ${language === "vi" ? `Giờ ${tuTru.gio}, Ngày ${tuTru.ngay}, Tháng ${tuTru.thang}, Năm ${tuTru.nam}` : `Hour ${tuTru.gio}, Day ${tuTru.ngay}, Month ${tuTru.thang}, Year ${tuTru.nam}`}
Ngũ Hành: ${Object.entries(tyLeNguHanh).map(([k, v]) => `${k}: ${v}`).join(", ")}
${language === "vi" ? `Dụng Thần: ${dungThan.join(", ")}` : `Useful God: ${dungThan.join(", ")}`}
${language === "vi" ? `Nghề nghiệp: Phù hợp ${dungThan.includes("Mộc") ? "giáo dục, nghệ thuật" : "tư vấn, giao tiếp"}` : `Suitable for ${dungThan.includes("Mộc") ? "education, arts" : "consulting, communication"}`}
${language === "vi" ? `Đề xuất: Màu sắc ${dungThan.includes("Mộc") ? "xanh lá" : "xanh dương"}` : `Color ${dungThan.includes("Mộc") ? "green" : "blue"}`}
`;
  }

  if (isMoney) {
    const chinhTai = thapThanResults["Mùi"] || "Không nổi bật";
    response += `
${language === "vi" ? "Tài lộc:" : "Wealth:"}
${language === "vi" ? `Chính Tài (${chinhTai}): Bạn có khả năng quản lý tài chính tốt, tích lũy ổn định qua công việc hoặc đầu tư dài hạn. Dụng Thần ${dungThan[0]} hỗ trợ tìm kiếm cơ hội tài chính trong các ngành sáng tạo hoặc trí tuệ. Từ 2026-2027, tài lộc sẽ cải thiện.` : `Wealth Star (${chinhTai}): You excel in financial management, accumulating wealth steadily. Useful God ${dungThan[0]} supports opportunities in creative or intellectual fields. Wealth improves from 2026-2027.`}
${language === "vi" ? `Lời khuyên: Tiết kiệm đều đặn, đầu tư vào giáo dục hoặc công nghệ, sử dụng màu ${dungThan.includes("Mộc") ? "xanh lá" : "xanh dương"} để kích hoạt vận may.` : `Advice: Save consistently, invest in education or tech, use ${dungThan.includes("Mộc") ? "green" : "blue"} to boost luck.`}
`;
  }

  if (isCareer) {
    const thucThan = thapThanResults["Bính"] || "Không nổi bật";
    const tuongTinh = thanSatResults["Tướng Tinh"].value.length ? "Có Tướng Tinh" : "Không có Tướng Tinh";
    response += `
${language === "vi" ? "Sự nghiệp:" : "Career:"}
${language === "vi" ? `Thực Thần (${thucThan}): Bạn phù hợp với ngành nghề sáng tạo như giáo dục, nghệ thuật, truyền thông. ${tuongTinh}. Dụng Thần ${dungThan[0]} hỗ trợ trí tuệ và tư duy, giúp thăng tiến từ 2025-2035.` : `Food God (${thucThan}): You thrive in creative fields like education, arts, media. ${tuongTinh}. Useful God ${dungThan[0]} supports intellectual growth, with advancement from 2025-2035.`}
${language === "vi" ? `Lời khuyên: Phát triển kỹ năng giao tiếp, tận dụng quý nhân để mở rộng cơ hội.` : `Advice: Enhance communication skills, leverage networks for opportunities.`}
`;
  }

  if (isFame) {
    const vanXuong = thanSatResults["Văn Xương"].value.length ? "Có Văn Xương" : "Không có Văn Xương";
    response += `
${language === "vi" ? "Công danh:" : "Fame:"}
${language === "vi" ? `Chính Ấn và Thực Thần hỗ trợ trí tuệ và danh tiếng trong lĩnh vực trí thức. ${vanXuong}. Dụng Thần ${dungThan[0]} giúp bạn nổi bật từ 2027.` : `Seal and Food God support intellectual fame. ${vanXuong}. Useful God ${dungThan[0]} boosts recognition from 2027.`}
${language === "vi" ? `Lời khuyên: Xây dựng uy tín qua học vấn và đóng góp sáng tạo.` : `Advice: Build reputation through knowledge and creative contributions.`}
`;
  }

  if (isHealth) {
    const kiepSat = thanSatResults["Kiếp Sát"].value.length ? "Có Kiếp Sát" : "Không có Kiếp Sát";
    response += `
${language === "vi" ? "Sức khỏe:" : "Health:"}
${language === "vi" ? `Cần cân bằng Dụng Thần ${dungThan[0]} để duy trì sức khỏe tinh thần. ${kiepSat}. Thủy yếu, chú ý hệ thần kinh và cảm xúc.` : `Balance Useful God ${dungThan[0]} for mental health. ${kiepSat}. Weak Water suggests attention to nerves and emotions.`}
${language === "vi" ? `Lời khuyên: Tập thiền hoặc yoga, sử dụng màu xanh dương để thư giãn.` : `Advice: Practice meditation or yoga, use blue for relaxation.`}
`;
  }

  if (isLove) {
    const chinhTai = thapThanResults["Mùi"] || "Không nổi bật";
    const daoHoa = thanSatResults["Đào Hoa"].value.length ? "Có Đào Hoa" : "Không có Đào Hoa";
    response += `
${language === "vi" ? "Tình duyên:" : "Love:"}
${language === "vi" ? `Chính Tài (${chinhTai}): Bạn hợp với người thực tế, đáng tin. ${daoHoa}. Dụng Thần ${dungThan[0]} giúp tình duyên ổn định từ 2026. Thiên Ất Quý Nhân hỗ trợ gặp người phù hợp.` : `Wealth Star (${chinhTai}): You’re suited to reliable partners. ${daoHoa}. Useful God ${dungThan[0]} stabilizes love from 2026. Nobleman aids in meeting compatible partners.`}
${language === "vi" ? `Lời khuyên: Giao tiếp chân thành, mặc màu ${dungThan.includes("Mộc") ? "xanh lá" : "xanh dương"} để tăng sức hút.` : `Advice: Communicate honestly, wear ${dungThan.includes("Mộc") ? "green" : "blue"} to enhance charm.`}
`;
  }

  if (isFamily) {
    const chinhTai = thapThanResults["Mùi"] || "Không nổi bật";
    const coThanQuaTu = thanSatResults["Cô Thần Quả Tú"].value.length ? "Có Cô Thần Quả Tú" : "Không có Cô Thần Quả Tú";
    response += `
${language === "vi" ? "Gia đạo:" : "Family:"}
${language === "vi" ? `Chính Tài (${chinhTai}): Gia đạo ổn định, nhưng cần ${dungThan[0]} để tăng hòa hợp cảm xúc. ${coThanQuaTu}. Thiên Ất Quý Nhân hỗ trợ giải quyết mâu thuẫn.` : `Wealth Star (${chinhTai}): Stable family life, but ${dungThan[0]} is needed for emotional harmony. ${coThanQuaTu}. Nobleman helps resolve conflicts.`}
${language === "vi" ? `Lời khuyên: Dành thời gian chia sẻ, dùng màu xanh dương để tăng hòa khí.` : `Advice: Spend time communicating, use blue for harmony.`}
`;
  }

  if (isChildren) {
    const thucThan = thapThanResults["Bính"] || "Không nổi bật";
    response += `
${language === "vi" ? "Con cái:" : "Children:"}
${language === "vi" ? `Thực Thần (${thucThan}): Con cái thông minh, sáng tạo. Dụng Thần ${dungThan[0]} hỗ trợ giáo dục và gắn kết. Niềm vui từ 2025-2035.` : `Food God (${thucThan}): Intelligent, creative children. Useful God ${dungThan[0]} aids education and bonding. Joy from 2025-2035.`}
${language === "vi" ? `Lời khuyên: Khuyến khích con cái sáng tạo, dành thời gian giáo dục.` : `Advice: Encourage creativity, invest time in education.`}
`;
  }

  if (isProperty) {
    const chinhTai = thapThanResults["Mùi"] || "Không nổi bật";
    response += `
${language === "vi" ? "Tài sản, đất đai:" : "Property, Real Estate:"}
${language === "vi" ? `Chính Tài (${chinhTai}): Tích lũy tài sản cố định tốt, đặc biệt bất động sản. Dụng Thần ${dungThan[0]} mang cơ hội từ 2026-2030.` : `Wealth Star (${chinhTai}): Strong accumulation of fixed assets, especially property. Useful God ${dungThan[0]} brings opportunities from 2026-2030.`}
${language === "vi" ? `Lời khuyên: Nghiên cứu thị trường, hợp tác với người có kinh nghiệm.` : `Advice: Research markets, collaborate with experts.`}
`;
  }

  if (isThapThan) {
    response += `
${language === "vi" ? "Thập Thần:" : "Ten Gods:"}
${Object.entries(thapThanResults).map(([elem, thapThan]) => thapThanEffects[thapThan] ? `${elem}: ${thapThanEffects[thapThan][language]}` : "").filter(Boolean).join("\n")}
`;
  }

  if (isThanSat) {
    const activeThanSat = Object.entries(thanSatResults)
      .filter(([_, value]) => value.value.length)
      .map(([_, value]) => `${value[language]}: ${value.value.join(", ")}`);
    response += `
${language === "vi" ? "Thần Sát:" : "Auspicious Stars:"}
${activeThanSat.length > 0 ? activeThanSat.join("\n") : language === "vi" ? "Không có Thần Sát nổi bật" : "No prominent stars"}
`;
  }

  return response.trim();
};

const checkOpenAIStatus = async () => {
  try {
    const response = await axios.get("https://status.openai.com/api/v2/status.json", { timeout: 10000 });
    return response.data.status.indicator === "none";
  } catch (err) {
    console.error("Lỗi kiểm tra OpenAI:", err.message);
    return false;
  }
};

const checkOpenAIKey = async () => {
  try {
    const response = await axios.get("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      timeout: 10000
    });
    return response.data.data.some(m => m.id.includes("gpt-3.5-turbo"));
  } catch (err) {
    console.error("Lỗi kiểm tra API key:", err.message);
    return false;
  }
};

const callOpenAI = async (payload, retries = 3, delay = 5000) => {
  console.log(`Bắt đầu OpenAI: ${new Date().toISOString()}`);
  if (!process.env.OPENAI_API_KEY) throw new Error("Missing OpenAI API key");
  if (!payload.model || !payload.messages) throw new Error("Invalid payload");

  const isKeyValid = await checkOpenAIKey();
  if (!isKeyValid) throw new Error("Invalid API key");

  const isServerUp = await checkOpenAIStatus();
  if (!isServerUp) throw new Error("OpenAI server down");

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Thử ${attempt}`);
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        payload,
        {
          headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
          timeout: 60000
        }
      );
      console.log(`Hoàn thành OpenAI: ${new Date().toISOString()}`);
      return response.data;
    } catch (err) {
      console.error(`Thử ${attempt} thất bại: ${err.message}`);
      if (err.response?.status === 429) throw new Error("Quota exceeded");
      if (err.response?.status === 401) throw new Error("Invalid API key");
      if (attempt === retries) throw new Error(`Failed after ${retries} retries: ${err.message}`);
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
};

app.post("/api/luan-giai-bazi", async (req, res) => {
  const startTime = Date.now();
  const { messages, tuTruInfo, dungThan } = req.body;
  const useOpenAI = process.env.USE_OPENAI !== "false";
  const language = messages?.some(m => /[\u00C0-\u1EF9]/.test(m.content)) ? "vi" : "en";

  const userInput = messages?.slice().reverse().find(m => m.role === "user")?.content || "";
  const cacheKey = `${tuTruInfo}-${userInput}-${language}`;
  const cachedResponse = cache.get(cacheKey);
  if (cachedResponse) {
    console.log(`Cache hit: ${cacheKey}`);
    return res.json({ answer: cachedResponse });
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: language === "vi" ? "Thiếu messages" : "Missing messages" });
  }
  if (!tuTruInfo || typeof tuTruInfo !== "string") {
    return res.status(400).json({ error: language === "vi" ? "Thiếu tuTruInfo" : "Missing tuTruInfo" });
  }
  let dungThanHanh = Array.isArray(dungThan) ? dungThan : dungThan?.hanh || [];
  if (!dungThanHanh.every(d => ["Mộc", "Hỏa", "Thổ", "Kim", "Thủy"].includes(d))) {
    return res.status(400).json({ error: language === "vi" ? "Dụng Thần không hợp lệ" : "Invalid Useful God" });
  }

  let tuTru;
  try {
    tuTru = JSON.parse(tuTruInfo);
    tuTru = {
      gio: normalizeCanChi(tuTru.gio),
      ngay: normalizeCanChi(tuTru.ngay),
      thang: normalizeCanChi(tuTru.thang),
      nam: normalizeCanChi(tuTru.nam)
    };
    if (!tuTru.gio || !tuTru.ngay || !tuTru.thang || !tuTru.nam) {
      throw new Error("Tứ Trụ không đầy đủ");
    }
  } catch (e) {
    tuTru = parseEnglishTuTru(userInput);
    if (!tuTru || !tuTru.gio || !tuTru.ngay || !tuTru.thang || !tuTru.nam) {
      return res.status(400).json({ error: language === "vi" ? "Tứ Trụ không hợp lệ" : "Invalid Four Pillars" });
    }
  }

  let nguHanh;
  try {
    nguHanh = analyzeNguHanh(tuTru);
  } catch (err) {
    return res.status(400).json({ error: language === "vi" ? "Dữ liệu ngũ hành không hợp lệ" : "Invalid Five Elements" });
  }

  let thapThanResults = {};
  try {
    thapThanResults = tinhThapThan(tuTru.ngay?.split(" ")[0], tuTru);
  } catch (err) {
    console.error("Lỗi Thập Thần:", err.message);
  }

  let thanSatResults = {};
  try {
    thanSatResults = tinhThanSat(tuTru);
  } catch (err) {
    console.error("Lỗi Thần Sát:", err.message);
    return res.status(400).json({ error: language === "vi" ? "Lỗi tính Thần Sát" : "Error calculating Auspicious Stars" });
  }

  if (!useOpenAI) {
    const answer = generateResponse(tuTru, nguHanh, thapThanResults, thanSatResults, dungThanHanh, userInput, messages, language);
    cache.set(cacheKey, answer);
    console.log(`Tổng thời gian xử lý: ${Date.now() - startTime}ms`);
    return res.json({ answer });
  }

  const prompt = `
Bắt buộc trả lời bằng ${language === "vi" ? "tiếng Việt" : "English"}. Nhật Chủ là Thiên Can ngày sinh. Cấu trúc:
- Phân tích chi tiết dựa trên câu hỏi: ${userInput || "Tổng quan"}.
- Sử dụng Tứ Trụ, Ngũ Hành, Thập Thần, Thần Sát, Dụng Thần.
- Lời khuyên cụ thể, tránh chung chung.

Tứ Trụ: Giờ ${tuTru.gio || "N/A"}, Ngày ${tuTru.ngay || "N/A"}, Tháng ${tuTru.thang || "N/A"}, Năm ${tuTru.nam || "N/A"}
Ngũ Hành: ${Object.entries(nguHanh).map(([k, v]) => `${k}: ${v}`).join(", ") || "N/A"}
Thập Thần: ${Object.entries(thapThanResults).map(([k, v]) => `${k}: ${v}`).join(", ") || "N/A"}
Thần Sát: ${Object.entries(thanSatResults).map(([k, v]) => `${v[language]}: ${v.value.join(", ") || "N/A"}`).join("; ") || "N/A"}
Dụng Thần: ${dungThanHanh.join(", ") || "N/A"}
Câu hỏi: ${userInput || "N/A"}
`;

  try {
    const gptRes = await callOpenAI({
      model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 1500
    });
    const answer = gptRes.choices[0].message.content;
    cache.set(cacheKey, answer);
    console.log(`Tổng thời gian xử lý: ${Date.now() - startTime}ms`);
    return res.json({ answer });
  } catch (err) {
    console.error("OpenAI error:", err.message);
    const answer = generateResponse(tuTru, nguHanh, thapThanResults, thanSatResults, dungThanHanh, userInput, messages, language);
    cache.set(cacheKey, answer);
    return res.json({ answer, warning: language === "vi" ? `Không thể kết nối với OpenAI: ${err.message}` : `Failed to connect with OpenAI: ${err.message}` });
  }
});

app.use((err, req, res, next) => {
  fs.appendFileSync('error.log', `${new Date().toISOString()} - Lỗi hệ thống: ${err.stack}\n`);
  console.error("Lỗi hệ thống:", err.stack);
  res.status(500).json({ error: "System error occurred" });
});

const port = process.env.PORT || 10000;
const server = app.listen(port, async () => {
  console.log(`Server running on port ${port}`);
  try {
    const isKeyValid = await checkOpenAIKey();
    console.log(`OpenAI API key valid: ${isKeyValid}`);
  } catch (err) {
    console.error("Lỗi kiểm tra OpenAI API key:", err.message);
  }
});
server.setTimeout(300000);

