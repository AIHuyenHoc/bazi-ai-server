const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

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
  "Giáp Ngọ", "Ất Mùi", "Bính Ngọ", "Đinh Mùi", "Mậu Thân", "Kỷ Dậu", "Canh Tuất", "Tân Hợi", "Nhâm Tý", "Quý Sửu",
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
  const hiddenElements = {
    Tý: ["Quý"], Sửu: ["Kỷ", "Tân", "Quý"], Dần: ["Giáp", "Bính", "Mậu"], Mão: ["Ất"],
    Thìn: ["Mậu", "Ất", "Quý"], Tỵ: ["Bính", "Canh", "Mậu"], Ngọ: ["Đinh", "Kỷ"],
    Mùi: ["Kỷ", "Đinh", "Ất"], Thân: ["Canh", "Nhâm", "Mậu"], Dậu: ["Tân"],
    Tuất: ["Mậu", "Đinh", "Tân"], Hợi: ["Nhâm", "Giáp"]
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

    // Tính Thập Thần cho Thiên Can
    for (const can of elements) {
      if (can === nhatChu) continue;
      const nguHanh = canNguHanh[can];
      if (!nguHanh) continue;
      const isCanYang = ["Giáp", "Bính", "Mậu", "Canh", "Nhâm"].includes(can);
      const index = (isYang === isCanYang) ? 0 : 1;
      thapThanResults[can] = thapThanMap[canNguHanh[nhatChu]][nguHanh][index];
    }

    // Tính Thập Thần cho Địa Chi và Tàng Can
    for (const chi of branches) {
      const nguHanh = chiNguHanh[chi];
      if (!nguHanh) continue;
      const isChiYang = ["Tý", "Dần", "Thìn", "Ngọ", "Thân", "Tuất"].includes(chi);
      const index = (isYang === isChiYang) ? 0 : 1;
      thapThanResults[chi] = thapThanMap[canNguHanh[nhatChu]][nguHanh][index];

      const hidden = hiddenElements[chi] || [];
      for (const hiddenCan of hidden) {
        const hiddenNguHanh = canNguHanh[hiddenCan];
        if (!hiddenNguHanh) continue;
        const isHiddenCanYang = ["Giáp", "Bính", "Mậu", "Canh", "Nhâm"].includes(hiddenCan);
        const hiddenIndex = (isYang === isHiddenCanYang) ? 0 : 1;
        thapThanResults[`${hiddenCan} (${chi})`] = thapThanMap[canNguHanh[nhatChu]][hiddenNguHanh][hiddenIndex];
      }
    }

    console.log(`Thập Thần: ${JSON.stringify(thapThanResults)}`);
    return thapThanResults;
  } catch (e) {
    console.error("Lỗi tính Thập Thần:", e.message);
    throw new Error("Không thể tính Thập Thần");
  }
};

const tinhThanSat = (tuTru) => {
  const thienAtQuyNhan = {
    Giáp: ["Sửu", "Mùi"], Ất: ["Tý", "Hợi"], Bính: ["Dần", "Mão"], Đinh: ["Sửu", "Hợi"],
    Mậu: ["Tỵ", "Ngọ"], Kỷ: ["Thìn", "Tuất"], Canh: ["Thân", "Dậu"], Tân: ["Thân", "Dậu"],
    Nhâm: ["Hợi", "Tý"], Quý: ["Tý", "Hợi"]
  };
  const daoHoa = {
    Tý: "Dậu", Sửu: "Thân", Dần: "Mùi", Mão: "Ngọ", Thìn: "Tỵ", Tỵ: "Thìn",
    Ngọ: "Mão", Mùi: "Dần", Thân: "Sửu", Dậu: "Tý", Tuất: "Hợi", Hợi: "Tuất"
  };
  const hongLoan = {
    Tý: "Dậu", Sửu: "Thân", Dần: "Mùi", Mão: "Ngọ", Thìn: "Tỵ", Tỵ: "Thìn",
    Ngọ: "Mão", Mùi: "Dần", Thân: "Sửu", Dậu: "Tý", Tuất: "Hợi", Hợi: "Tuất"
  };

  const nhatChu = tuTru.ngay?.split(" ")[0];
  const branches = [
    tuTru.nam?.split(" ")[1], tuTru.thang?.split(" ")[1],
    tuTru.ngay?.split(" ")[1], tuTru.gio?.split(" ")[1]
  ].filter(Boolean);

  if (!nhatChu || !branches.length) {
    throw new Error("Invalid nhatChu or branches");
  }

  return {
    "Thiên Ất Quý Nhân": { vi: "Thiên Ất Quý Nhân", en: "Nobleman Star", value: thienAtQuyNhan[nhatChu]?.filter(chi => branches.includes(chi)) || [] },
    "Đào Hoa": { vi: "Đào Hoa", en: "Peach Blossom", value: branches.includes(daoHoa[tuTru.ngay?.split(" ")[1]]) ? [daoHoa[tuTru.ngay?.split(" ")[1]]] : [] },
    "Hồng Loan": { vi: "Hồng Loan", en: "Red Phoenix", value: branches.includes(hongLoan[tuTru.ngay?.split(" ")[1]]) ? [hongLoan[tuTru.ngay?.split(" ")[1]]] : [] }
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
  "Tỷ Kiên": { vi: "Tự lập, mạnh mẽ, thích cạnh tranh", en: "Independent, strong, competitive" },
  "Kiếp Tài": { vi: "Tài năng, quyết đoán, dễ gặp cạnh tranh", en: "Talented, decisive, prone to competition" },
  "Thực Thần": { vi: "Sáng tạo, nghệ thuật, giỏi quản lý tài chính", en: "Creative, artistic, good at financial management" },
  "Thương Quan": { vi: "Tư duy sắc bén, dễ áp lực", en: "Sharp-minded, prone to stress" },
  "Chính Tài": { vi: "Giỏi quản lý tài chính, ổn định", en: "Good at financial management, stable" },
  "Thiên Tài": { vi: "Nhạy bén, sáng tạo, đầu tư mạo hiểm", en: "Perceptive, creative, risk-taking" },
  "Chính Quan": { vi: "Trách nhiệm, uy tín, lãnh đạo", en: "Responsible, influential, leadership" },
  "Thất Sát": { vi: "Dũng cảm, quyết liệt, áp lực cao", en: "Courageous, assertive, high pressure" },
  "Chính Ấn": { vi: "Trí tuệ, học vấn, tư duy sâu sắc", en: "Wise, scholarly, deep thinking" },
  "Thiên Ấn": { vi: "Sáng tạo, tư duy độc đáo", en: "Creative, unique thinking" }
};

const dungThanRecommendations = {
  Thủy: { vi: "màu xanh dương, môi trường gần nước, ngành tư vấn, công nghệ", en: "blue color, water-related environment, consulting, technology" },
  Mộc: { vi: "màu xanh lá, môi trường cây cối, ngành giáo dục, nghệ thuật, truyền thông", en: "green color, nature-related environment, education, arts, media" },
  Hỏa: { vi: "màu đỏ, môi trường năng động, ngành marketing, sáng tạo", en: "red color, dynamic environment, marketing, creative industries" },
  Thổ: { vi: "màu nâu, môi trường ổn định, ngành bất động sản, xây dựng", en: "brown color, stable environment, real estate, construction" },
  Kim: { vi: "màu trắng, môi trường chính xác, ngành tài chính, kỹ thuật", en: "white color, precise environment, finance, engineering" }
};

const determineQuestionType = (userInput, language) => {
  const normalizedInput = typeof userInput === "string" ? userInput.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
  const types = {
    isMoney: /tien bac|tai chinh|tai loc|lam giau|money|finance|wealth/i.test(normalizedInput),
    isCareer: /nghe|cong viec|su nghiep|career|job/i.test(normalizedInput),
    isFame: /cong danh|fame|reputation/i.test(normalizedInput),
    isHealth: /suc khoe|benh tat|health/i.test(normalizedInput),
    isLove: /tinh duyen|tinh yeu|love|hon nhan|marriage/i.test(normalizedInput),
    isFamily: /gia dao|gia dinh|family/i.test(normalizedInput),
    isChildren: /con cai|children/i.test(normalizedInput),
    isProperty: /tai san|dat dai|property|real estate/i.test(normalizedInput),
    isYear: /nam \d{4}|year \d{4}|sang nam/i.test(normalizedInput),
    isComplex: /du doan|tuong lai|future|dai van/i.test(normalizedInput),
    isThapThan: /thap than|ten gods/i.test(normalizedInput),
    isThanSat: /than sat|auspicious stars|sao/i.test(normalizedInput)
  };
  types.isGeneral = !Object.values(types).some(v => v);
  return types;
};

const analyzeYear = (year, tuTru, nguHanhCount, thapThanResults, dungThan) => {
  const canChi = getCanChiForYear(year);
  if (!canChi) return { vi: "Năm không hợp lệ", en: "Invalid year" };
  const [can, chi] = canChi.split(" ");
  const canNguHanh = {
    Giáp: "Mộc", Ất: "Mộc", Bính: "Hỏa", Đinh: "Hỏa", Mậu: "Thổ",
    Kỷ: "Thổ", Canh: "Kim", Tân: "Kim", Nhâm: "Thủy", Quý: "Thủy"
  };
  const chiNguHanh = {
    Tý: "Thủy", Hợi: "Thủy", Sửu: "Thổ", Thìn: "Thổ", Mùi: "Thổ", Tuất: "Thổ",
    Dần: "Mộc", Mão: "Mộc", Tỵ: "Hỏa", Ngọ: "Hỏa", Thân: "Kim", Dậu: "Kim"
  };
  const nhatChu = tuTru.ngay.split(" ")[0];
  const thapThanMap = {
    Kim: { Kim: ["Tỷ Kiên", "Kiếp Tài"], Thủy: ["Thực Thần", "Thương Quan"], Mộc: ["Chính Tài", "Thiên Tài"], Hỏa: ["Chính Quan", "Thất Sát"], Thổ: ["Chính Ấn", "Thiên Ấn"] },
    Mộc: { Mộc: ["Tỷ Kiên", "Kiếp Tài"], Hỏa: ["Thực Thần", "Thương Quan"], Thổ: ["Chính Tài", "Thiên Tài"], Kim: ["Chính Quan", "Thất Sát"], Thủy: ["Chính Ấn", "Thiên Ấn"] },
    Hỏa: { Hỏa: ["Tỷ Kiên", "Kiếp Tài"], Thổ: ["Thực Thần", "Thương Quan"], Kim: ["Chính Tài", "Thiên Tài"], Thủy: ["Chính Quan", "Thất Sát"], Mộc: ["Chính Ấn", "Thiên Ấn"] },
    Thổ: { Thổ: ["Tỷ Kiên", "Kiếp Tài"], Kim: ["Thực Thần", "Thương Quan"], Thủy: ["Chính Tài", "Thiên Tài"], Mộc: ["Chính Quan", "Thất Sát"], Hỏa: ["Chính Ấn", "Thiên Ấn"] },
    Thủy: { Thủy: ["Tỷ Kiên", "Kiếp Tài"], Mộc: ["Thực Thần", "Thương Quan"], Hỏa: ["Chính Tài", "Thiên Tài"], Thổ: ["Chính Quan", "Thất Sát"], Kim: ["Chính Ấn", "Thiên Ấn"] }
  };
  const isYang = ["Giáp", "Bính", "Mậu", "Canh", "Nhâm"].includes(nhatChu);
  const isCanYang = ["Giáp", "Bính", "Mậu", "Canh", "Nhâm"].includes(can);
  const isChiYang = ["Tý", "Dần", "Thìn", "Ngọ", "Thân", "Tuất"].includes(chi);
  const canThapThan = thapThanMap[canNguHanh[nhatChu]][canNguHanh[can]][(isYang === isCanYang) ? 0 : 1];
  const chiThapThan = thapThanMap[canNguHanh[nhatChu]][chiNguHanh[chi]][(isYang === isChiYang) ? 0 : 1];

  const nguHanhYear = { can: canNguHanh[can], chi: chiNguHanh[chi] };
  const isFavorable = dungThan.includes(nguHanhYear.can) || dungThan.includes(nguHanhYear.chi);
  const analysis = {
    vi: `Năm ${year} (${can} ${chi}): ${nguHanhYear.can} (${canThapThan}), ${nguHanhYear.chi} (${chiThapThan}). ${isFavorable ? `Hỗ trợ Dụng Thần ${dungThan.join(", ")}, mang cơ hội.` : `Cần cân bằng với ${dungThan.join(", ")} để giảm áp lực.`}`,
    en: `Year ${year} (${can} ${chi}): ${nguHanhYear.can} (${canThapThan}), ${nguHanhYear.chi} (${chiThapThan}). ${isFavorable ? `Supports Useful God ${dungThan.join(", ")}, bringing opportunities.` : `Balance with ${dungThan.join(", ")} to reduce pressure.`}`
  };
  return analysis;
};

const generateResponse = (tuTru, nguHanhCount, thapThanResults, thanSatResults, dungThan, userInput, messages, language) => {
  const totalElements = Object.values(nguHanhCount).reduce((a, b) => a + b, 0);
  const tyLeNguHanh = Object.fromEntries(
    Object.entries(nguHanhCount).map(([k, v]) => [k, `${((v / totalElements) * 100).toFixed(2)}% (${v.toFixed(1)})`])
  );
  const nhatChu = tuTru.ngay.split(" ")[0];
  const canNguHanh = {
    Giáp: "Mộc", Ất: "Mộc", Bính: "Hỏa", Đinh: "Hỏa", Mậu: "Thổ",
    Kỷ: "Thổ", Canh: "Kim", Tân: "Kim", Nhâm: "Thủy", Quý: "Thủy"
  };
  const chiNguHanh = {
    Tý: "Thủy", Hợi: "Thủy", Sửu: "Thổ", Thìn: "Thổ", Mùi: "Thổ", Tuất: "Thổ",
    Dần: "Mộc", Mão: "Mộc", Tỵ: "Hỏa", Ngọ: "Hỏa", Thân: "Kim", Dậu: "Kim"
  };

  const { isGeneral, isMoney, isCareer, isFame, isHealth, isLove, isFamily, isChildren, isProperty, isYear, isComplex, isThapThan, isThanSat } = determineQuestionType(userInput, language);

  if (isComplex) {
    return `${language === "vi" ? "Vui lòng gửi câu hỏi qua app.aihuyenhoc@gmail.com" : "Please send questions to app.aihuyenhoc@gmail.com"}`;
  }

  let response = "";

  if (isGeneral) {
    response += `
${language === "vi" ? "Luận giải Bát Tự:" : "Bazi Interpretation:"}
${language === "vi" ? `Nhật Chủ ${nhatChu} (${canNguHanh[nhatChu]}): ${personalityDescriptions[canNguHanh[nhatChu]].vi}.` : `Day Master ${nhatChu} (${canNguHanh[nhatChu]}): ${personalityDescriptions[canNguHanh[nhatChu]].en}.`}
Tứ Trụ: ${language === "vi" ? `Giờ ${tuTru.gio}, Ngày ${tuTru.ngay}, Tháng ${tuTru.thang}, Năm ${tuTru.nam}` : `Hour ${tuTru.gio}, Day ${tuTru.ngay}, Month ${tuTru.thang}, Year ${tuTru.nam}`}
Ngũ Hành: ${Object.entries(tyLeNguHanh).map(([k, v]) => `${k}: ${v}`).join(", ")} (Thiên Can/Địa Chi: 1 điểm, Tàng Can: 0.3 điểm)
Thập Thần:
${Object.entries(thapThanResults).map(([elem, thapThan]) => thapThanEffects[thapThan] ? `- ${elem}: ${thapThanEffects[thapThan][language]}` : "").filter(Boolean).join("\n")}
${language === "vi" ? `Thần Sát: Thiên Ất Quý Nhân ở ${thanSatResults["Thiên Ất Quý Nhân"].value.join(", ") || "không có"} (hỗ trợ từ đồng nghiệp, người thân).` : `Auspicious Stars: Nobleman Star at ${thanSatResults["Thiên Ất Quý Nhân"].value.join(", ") || "none"} (support from colleagues, family).`}
${language === "vi" ? `Dụng Thần: ${dungThan.join(", ")} (kích hoạt trí tuệ, linh hoạt).` : `Useful God: ${dungThan.join(", ")} (enhances intellect, flexibility).`}
${language === "vi" ? `Lời khuyên: Tập trung vào ngành nghề liên quan ${dungThan.map(d => dungThanRecommendations[d].vi).join(" hoặc ")}; sử dụng màu ${dungThan.includes("Mộc") ? "xanh lá" : "xanh dương"}.` : `Advice: Focus on careers in ${dungThan.map(d => dungThanRecommendations[d].en).join(" or ")}; use ${dungThan.includes("Mộc") ? "green" : "blue"}.`}
`;
  }

  if (isMoney) {
    const thucThan = thapThanResults["Kỷ"] || "Không nổi bật";
    const thienTai = thapThanResults["Đinh"] || "Không nổi bật";
    response += `
${language === "vi" ? "Tài lộc:" : "Wealth:"}
${language === "vi" ? `Thực Thần (${thucThan}), Thiên Tài (${thienTai}): Bạn có khả năng kiếm tiền từ sáng tạo, nghệ thuật, đầu tư mạo hiểm. Kim mạnh (${tyLeNguHanh.Kim}) mang tài chính ổn định, nhưng cần kích hoạt ${dungThan.join(", ")} để mở rộng cơ hội. Tân Tỵ thuộc Kim và Hỏa, phù hợp với ngành trí tuệ hơn đất đai.` : `Food God (${thucThan}), Indirect Wealth (${thienTai}): You can earn through creativity, arts, or investments. Strong Metal (${tyLeNguHanh.Kim}) ensures stable finances, but activate ${dungThan.join(", ")} for opportunities. Tân Tỵ is Metal and Fire, suited for intellectual fields, not land.`}
${language === "vi" ? `Lời khuyên: Đầu tư vào ${dungThan.map(d => dungThanRecommendations[d].vi).join(" hoặc ")}; sử dụng màu ${dungThan.includes("Mộc") ? "xanh lá" : "xanh dương"}.` : `Advice: Invest in ${dungThan.map(d => dungThanRecommendations[d].en).join(" or ")}; use ${dungThan.includes("Mộc") ? "green" : "blue"}.`}
`;
  }

  if (isCareer) {
    const tyKien = thapThanResults["Canh"] || "Không nổi bật";
    const chinhAn = thapThanResults["Tý"] || "Không nổi bật";
    response += `
${language === "vi" ? "Sự nghiệp:" : "Career:"}
${language === "vi" ? `Tỷ Kiên (${tyKien}), Chính Ấn (${chinhAn}): Phù hợp với công việc tự lập, sáng tạo như ${dungThan.map(d => dungThanRecommendations[d].vi).join(" hoặc ")}. Dụng Thần ${dungThan.join(", ")} hỗ trợ trí tuệ, giúp thăng tiến từ 2025-2035. Thiên Ất Quý Nhân mang sự hỗ trợ từ đồng nghiệp.` : `Shoulder-to-Shoulder (${tyKien}), Direct Seal (${chinhAn}): Suited for independent, creative roles like ${dungThan.map(d => dungThanRecommendations[d].en).join(" or ")}. Useful God ${dungThan.join(", ")} supports intellect, with advancement from 2025-2035. Nobleman brings support.`}
${language === "vi" ? `Lời khuyên: Phát triển kỹ năng lãnh đạo, tận dụng mạng lưới quan hệ, sử dụng màu ${dungThan.includes("Mộc") ? "xanh lá" : "xanh dương"}.` : `Advice: Develop leadership skills, leverage networks, use ${dungThan.includes("Mộc") ? "green" : "blue"}.`}
`;
  }

  if (isFame) {
    response += `
${language === "vi" ? "Công danh:" : "Fame:"}
${language === "vi" ? `Chính Ấn và Thực Thần hỗ trợ danh tiếng trong ${dungThan.map(d => dungThanRecommendations[d].vi).join(" hoặc ")}. Dụng Thần ${dungThan.join(", ")} giúp nổi bật từ 2027.` : `Direct Seal and Food God support fame in ${dungThan.map(d => dungThanRecommendations[d].en).join(" or ")}. Useful God ${dungThan.join(", ")} boosts recognition from 2027.`}
${language === "vi" ? `Lời khuyên: Xây dựng uy tín qua học vấn và đóng góp sáng tạo, sử dụng màu ${dungThan.includes("Mộc") ? "xanh lá" : "xanh dương"}.` : `Advice: Build reputation through knowledge and creative contributions, use ${dungThan.includes("Mộc") ? "green" : "blue"}.`}
`;
  }

  if (isHealth) {
    response += `
${language === "vi" ? "Sức khỏe:" : "Health:"}
${language === "vi" ? `Kim mạnh (${tyLeNguHanh.Kim}), Thủy yếu (${tyLeNguHanh.Thủy}), cần cân bằng ${dungThan.join(", ")} để duy trì sức khỏe tinh thần. Chú ý hệ thần kinh và cảm xúc.` : `Strong Metal (${tyLeNguHanh.Kim}), weak Water (${tyLeNguHanh.Thủy}), balance ${dungThan.join(", ")} for mental health. Focus on nervous system and emotions.`}
${language === "vi" ? `Lời khuyên: Tập thiền, yoga; sử dụng màu ${dungThan.includes("Mộc") ? "xanh lá" : "xanh dương"} để thư giãn.` : `Advice: Practice meditation, yoga; use ${dungThan.includes("Mộc") ? "green" : "blue"} for relaxation.`}
`;
  }

  if (isLove) {
    const thienTai = thapThanResults["Đinh"] || "Không nổi bật";
    const daoHoa = thanSatResults["Đào Hoa"].value.length ? "Có Đào Hoa" : "Không có Đào Hoa";
    response += `
${language === "vi" ? "Tình duyên:" : "Love:"}
${language === "vi" ? `Thiên Tài (${thienTai}): Hợp với người sáng tạo, nhạy bén (nếu nam) hoặc cần kích hoạt ${dungThan.join(", ")} để ổn định (nếu nữ). ${daoHoa}. Dụng Thần ${dungThan.join(", ")} giúp hòa hợp từ 2026. Thiên Ất Quý Nhân hỗ trợ hóa giải mâu thuẫn.` : `Indirect Wealth (${thienTai}): Suited to creative, perceptive partners (if male) or activate ${dungThan.join(", ")} for stability (if female). ${daoHoa}. Useful God ${dungThan.join(", ")} stabilizes love from 2026. Nobleman aids conflict resolution.`}
${language === "vi" ? `Lời khuyên: Giao tiếp chân thành, sử dụng màu ${dungThan.includes("Mộc") ? "xanh lá" : "xanh dương"} để tăng sức hút.` : `Advice: Communicate honestly, use ${dungThan.includes("Mộc") ? "green" : "blue"} to enhance charm.`}
`;
  }

  if (isFamily) {
    const thucThan = thapThanResults["Kỷ"] || "Không nổi bật";
    response += `
${language === "vi" ? "Gia đạo:" : "Family:"}
${language === "vi" ? `Thực Thần (${thucThan}): Gia đạo ổn định, nhưng cần ${dungThan.join(", ")} để tăng hòa hợp. Thiên Ất Quý Nhân hỗ trợ giải quyết mâu thuẫn.` : `Food God (${thucThan}): Stable family life, but ${dungThan.join(", ")} needed for harmony. Nobleman helps resolve conflicts.`}
${language === "vi" ? `Lời khuyên: Dành thời gian chia sẻ, sử dụng màu ${dungThan.includes("Mộc") ? "xanh lá" : "xanh dương"} để tăng hòa khí.` : `Advice: Spend time communicating, use ${dungThan.includes("Mộc") ? "green" : "blue"} for harmony.`}
`;
  }

  if (isChildren) {
    const thucThan = thapThanResults["Kỷ"] || "Không nổi bật";
    response += `
${language === "vi" ? "Con cái:" : "Children:"}
${language === "vi" ? `Thực Thần (${thucThan}): Con cái thông minh, sáng tạo. Dụng Thần ${dungThan.join(", ")} hỗ trợ giáo dục. Niềm vui từ 2025-2035.` : `Food God (${thucThan}): Intelligent, creative children. Useful God ${dungThan.join(", ")} aids education. Joy from 2025-2035.`}
${language === "vi" ? `Lời khuyên: Khuyến khích con cái sáng tạo, dành thời gian giáo dục.` : `Advice: Encourage creativity, invest time in education.`}
`;
  }

  if (isProperty) {
    const thucThan = thapThanResults["Kỷ"] || "Không nổi bật";
    response += `
${language === "vi" ? "Tài sản, đất đai:" : "Property, Real Estate:"}
${language === "vi" ? `Thực Thần (${thucThan}): Tích lũy tài sản cố định tốt, nhưng cần ${dungThan.join(", ")} để tìm cơ hội. Kim mạnh hỗ trợ đầu tư ổn định.` : `Food God (${thucThan}): Strong accumulation of fixed assets, but ${dungThan.join(", ")} needed for opportunities. Strong Metal supports stable investments.`}
${language === "vi" ? `Lời khuyên: Nghiên cứu thị trường, hợp tác với người có kinh nghiệm, sử dụng màu ${dungThan.includes("Mộc") ? "xanh lá" : "xanh dương"}.` : `Advice: Research markets, collaborate with experts, use ${dungThan.includes("Mộc") ? "green" : "blue"}.`}
`;
  }

  if (isYear) {
    const yearMatch = userInput.match(/\d{4}/);
    const year = yearMatch ? parseInt(yearMatch[0]) : null;
    if (year) {
      const yearAnalysis = analyzeYear(year, tuTru, nguHanhCount, thapThanResults, dungThan);
      response += `
${language === "vi" ? `Năm ${year}:` : `Year ${year}:`}
${yearAnalysis[language]}
${language === "vi" ? `Lời khuyên: Tận dụng cơ hội từ ${dungThan.join(", ")}, tránh tranh cãi, sử dụng màu ${dungThan.includes("Mộc") ? "xanh lá" : "xanh dương"}.` : `Advice: Leverage opportunities from ${dungThan.join(", ")}, avoid conflicts, use ${dungThan.includes("Mộc") ? "green" : "blue"}.`}
`;
    }
  }

  if (isThapThan) {
    response += `
${language === "vi" ? "Thập Thần:" : "Ten Gods:"}
${Object.entries(thapThanResults).map(([elem, thapThan]) => thapThanEffects[thapThan] ? `- ${elem}: ${thapThanEffects[thapThan][language]}` : "").filter(Boolean).join("\n")}
${language === "vi" ? `Dụng Thần: ${dungThan.join(", ")} hỗ trợ cân bằng lá số.` : `Useful God: ${dungThan.join(", ")} balances the chart.`}
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

  const userInput = messages?.slice().reverse().find(m => m.role === "user")?.content || "";

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
    return res.status(400).json({ error: language === "vi" ? "Không thể tính Thập Thần" : "Cannot calculate Ten Gods" });
  }

  let thanSatResults = {};
  try {
    thanSatResults = tinhThanSat(tuTru);
  } catch (err) {
    console.error("Lỗi Thần Sát:", err.message);
  }

  if (!useOpenAI) {
    const answer = generateResponse(tuTru, nguHanh, thapThanResults, thanSatResults, dungThanHanh, userInput, messages, language);
    console.log(`Tổng thời gian xử lý: ${Date.now() - startTime}ms`);
    return res.json({ answer });
  }

  const prompt = `
Bắt buộc trả lời bằng ${language === "vi" ? "tiếng Việt" : "English"}. Nhật Chủ là Thiên Can ngày sinh. Cấu trúc:
- Phân tích chi tiết dựa trên câu hỏi: ${userInput || "Tổng quan"}.
- Sử dụng Tứ Trụ, Ngũ Hành, Thập Thần, Thần Sát, Dụng Thần.
- Tích hợp Dụng Thần (${dungThanHanh.join(", ")}) vào mọi lời khuyên.
- Lời khuyên cụ thể, tránh chung chung.
- Nếu hỏi về năm cụ thể, phân tích lưu niên dựa trên Thiên Can, Địa Chi.
- Xác định chính xác ngũ hành của Can Chi (Thiên Can: Giáp, Ất - Mộc; Bính, Đinh - Hỏa; Mậu, Kỷ - Thổ; Canh, Tân - Kim; Nhâm, Quý - Thủy. Địa Chi: Tý, Hợi - Thủy; Sửu, Thìn, Mùi, Tuất - Thổ; Dần, Mão - Mộc; Tỵ, Ngọ - Hỏa; Thân, Dậu - Kim).
- Tân Tỵ: Tân (Kim), Tỵ (Hỏa, Tàng Can: Bính - Hỏa, Canh - Kim, Mậu - Thổ).
- Thiên Ất Quý Nhân là sao hỗ trợ, không gây khó khăn.

Tứ Trụ: Giờ ${tuTru.gio || "N/A"}, Ngày ${tuTru.ngay || "N/A"}, Tháng ${tuTru.thang || "N/A"}, Năm ${tuTru.nam || "N/A"}
Ngũ Hành: ${Object.entries(nguHanh).map(([k, v]) => `${k}: ${v.toFixed(1)} (${((v / Object.values(nguHanh).reduce((a, b) => a + b, 0)) * 100).toFixed(2)}%)`).join(", ") || "N/A"}
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
    console.log(`Tổng thời gian xử lý: ${Date.now() - startTime}ms`);
    return res.json({ answer: gptRes.choices[0].message.content });
  } catch (err) {
    console.error("OpenAI error:", err.message);
    const answer = generateResponse(tuTru, nguHanh, thapThanResults, thanSatResults, dungThanHanh, userInput, messages, language);
    return res.json({ answer, warning: language === "vi" ? `Không thể kết nối với OpenAI: ${err.message}` : `Failed to connect with OpenAI: ${err.message}` });
  }
});

app.use((err, req, res, next) => {
  console.error("Lỗi hệ thống:", err.stack);
  res.status(500).json({ error: language === "vi" ? "Lỗi hệ thống xảy ra" : "System error occurred" });
});

const port = process.env.PORT || 5000;
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
