const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

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
  "Giáp Dần", "Ất Mão", "Bính Thìn", "Đinh Tỵ", "Mậu Ngọ", "Kỷ Mùi", "Canh Thân", "Tân Dậu", "Nhâm Tuất", "Quý Hợi",
  "Giáp Tý", "Ất Sửu", "Bính Dần", "Đinh Mão", "Mậu Thìn", "Kỷ Tỵ", "Canh Ngọ", "Tân Mùi", "Nhâm Thân", "Quý Dậu"
];

const getCanChiForYear = (year) => {
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return null;
  const baseYear = 1984;
  const index = (year - baseYear) % 60;
  const adjustedIndex = index < 0 ? index + 60 : index;
  if (year === 2026 && hoaGiap[adjustedIndex] !== "Bính Ngọ") {
    throw new Error("Sai Can Chi cho năm 2026, phải là Bính Ngọ");
  }
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
    throw new Error(`Phân tích ngũ hành thất bại: ${e.message}`);
  }
};

const determineThanVuongNhac = (nguHanhCount, nhatChu) => {
  const canNguHanh = {
    Giáp: "Mộc", Ất: "Mộc", Bính: "Hỏa", Đinh: "Hỏa", Mậu: "Thổ",
    Kỷ: "Thổ", Canh: "Kim", Tân: "Kim", Nhâm: "Thủy", Quý: "Thủy"
  };
  const nhatChuHanh = canNguHanh[nhatChu];
  const total = Object.values(nguHanhCount).reduce((a, b) => a + b, 0);
  const nhatChuStrength = nguHanhCount[nhatChuHanh] / total;
  return nhatChuStrength > 0.35 ? "Vượng" : nhatChuStrength < 0.25 ? "Nhược" : "Bình hòa";
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
    return { error: `Không thể tính Thập Thần: ${e.message}` };
  }
};

const tinhThanSat = (tuTru, language = "vi") => {
  const thienAtQuyNhan = {
    Giáp: ["Sửu", "Mùi"], Ất: ["Tý", "Hợi"], Bính: ["Dần", "Mão"], Đinh: ["Sửu", "Hợi"],
    Mậu: ["Tỵ", "Ngọ"], Kỷ: ["Thìn", "Tuất"], Canh: ["Thân", "Dậu"], Tân: ["Thân", "Dậu"],
    Nhâm: ["Hợi", "Tý"], Quý: ["Tý", "Hợi"]
  };
  const daoHoa = {
    Thân: "Dậu", Tý: "Dậu", Thìn: "Dậu",
    Hợi: "Tý", Mão: "Tý", Mùi: "Tý",
    Dần: "Mão", Ngọ: "Mão", Tuất: "Mão",
    Tỵ: "Ngọ", Dậu: "Ngọ", Sửu: "Ngọ"
  };
  const hongLoan = {
    Tý: "Dậu", Sửu: "Thân", Dần: "Mùi", Mão: "Ngọ", Thìn: "Tỵ", Tỵ: "Thìn",
    Ngọ: "Mão", Mùi: "Dần", Thân: "Sửu", Dậu: "Tý", Tuất: "Hợi", Hợi: "Tuất"
  };

  const nhatChu = tuTru.ngay?.split(" ")[0];
  const chiNgay = tuTru.ngay?.split(" ")[1];
  const branches = [
    tuTru.nam?.split(" ")[1], tuTru.thang?.split(" ")[1],
    tuTru.ngay?.split(" ")[1], tuTru.gio?.split(" ")[1]
  ].filter(Boolean);

  if (!nhatChu || !branches.length) {
    throw new Error("Invalid nhatChu or branches");
  }

  return {
    "Thiên Ất Quý Nhân": { 
      vi: "Thiên Ất Quý Nhân", 
      en: "Nobleman Star", 
      value: thienAtQuyNhan[nhatChu]?.filter(chi => branches.includes(chi)) || [] 
    },
    "Đào Hoa": { 
      vi: "Đào Hoa", 
      en: "Peach Blossom", 
      value: branches.includes(daoHoa[chiNgay]) ? [daoHoa[chiNgay]] : [] 
    },
    "Hồng Loan": { 
      vi: "Hồng Loan", 
      en: "Red Phoenix", 
      value: branches.includes(hongLoan[chiNgay]) ? [hongLoan[chiNgay]] : [] 
    }
  };
};

const dayMasterDescriptions = {
  Mộc: {
    vi: "Như cây xanh vươn cao, bạn tràn đầy sức sống, sáng tạo, linh hoạt, nhưng cần ổn định cảm xúc.",
    en: "Like a tree reaching for sunlight, you are vibrant, creative, adaptable, but need emotional grounding."
  },
  Hỏa: {
    vi: "Như ngọn lửa rực rỡ, bạn bừng cháy đam mê, nhiệt huyết, dễ truyền cảm hứng nhưng cần kiểm soát bốc đồng.",
    en: "Like a blazing fire, you burn with passion, enthusiasm, inspiring others but need to manage impulsiveness."
  },
  Thổ: {
    vi: "Như ngọn núi vững chãi, bạn đáng tin cậy, kiên định, thực tế, nhưng cần mở lòng với thay đổi.",
    en: "Like a steadfast mountain, you are reliable, resolute, practical, but need to embrace change."
  },
  Kim: {
    vi: "Như thanh kiếm sắc bén, bạn tinh tế, quyết tâm, chính trực, nhưng cần cân bằng lý trí và cảm xúc.",
    en: "Like a gleaming sword, you are refined, determined, upright, but need balance between logic and emotion."
  },
  Thủy: {
    vi: "Như dòng sông sâu thẳm, bạn thông thái, nhạy bén, sâu sắc, nhưng cần kiểm soát cảm xúc mạnh mẽ.",
    en: "Like a deep river, you are wise, perceptive, profound, but need to manage intense emotions."
  }
};

const thapThanEffects = {
  "Tỷ Kiên": { vi: "Tự lập, mạnh mẽ, lãnh đạo, nhưng cần tránh cố chấp.", en: "Independent, strong, leadership qualities, but avoid stubbornness." },
  "Kiếp Tài": { vi: "Quyết đoán, mạo hiểm, tài năng, dễ bốc đồng.", en: "Decisive, daring, talented, prone to impulsiveness." },
  "Thực Thần": { vi: "Sáng tạo, nghệ thuật, yêu tự do, gu thẩm mỹ tinh tế.", en: "Creative, artistic, freedom-loving, refined aesthetic taste." },
  "Thương Quan": { vi: "Tư duy sắc bén, dũng cảm, giỏi diễn đạt, phù hợp sáng tạo.", en: "Sharp-minded, courageous, expressive, suited for creative fields." },
  "Chính Tài": { vi: "Giỏi quản lý tài chính, thận trọng, tích lũy tài sản.", en: "Skilled in financial management, cautious, good at accumulating wealth." },
  "Thiên Tài": { vi: "Nhạy bén, sáng tạo, linh hoạt, giỏi kiếm tiền từ ý tưởng.", en: "Perceptive, creative, flexible, skilled at earning from ideas." },
  "Chính Quan": { vi: "Trách nhiệm, uy tín, đáng tin cậy, phù hợp lãnh đạo.", en: "Responsible, reputable, trustworthy, suited for leadership." },
  "Thất Sát": { vi: "Dũng cảm, quyết liệt, kiên cường, cần kiểm soát bốc đồng.", en: "Courageous, assertive, resilient, needs to control impulsiveness." },
  "Chính Ấn": { vi: "Trí tuệ, học vấn, tư duy logic, thích nghiên cứu.", en: "Wise, scholarly, logical, enjoys research." },
  "Thiên Ấn": { vi: "Sáng tạo, tư duy độc đáo, trực giác mạnh, phù hợp nghệ thuật.", en: "Creative, unique thinking, strong intuition, suited for arts." }
};

const determineQuestionType = (userInput, language) => {
  const normalizedInput = typeof userInput === "string" ? userInput.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
  const keywords = {
    isMoney: {
      vi: ["tien bac", "tai chinh", "tai loc", "lam giau", "kinh doanh", "dau tu"],
      en: ["money", "finance", "wealth", "investment", "business", "income"],
      not: ["tai nan", "accident"]
    },
    isCareer: {
      vi: ["nghe", "cong viec", "su nghiep", "viec lam", "chuc vu", "nghe nghiep"],
      en: ["career", "job", "work", "profession", "employment", "occupation"]
    },
    isFame: {
      vi: ["cong danh", "danh tieng", "ten tuoi", "uy tin", "thanh tuu"],
      en: ["fame", "reputation", "prestige", "success", "achievement"]
    },
    isHealth: {
      vi: ["suc khoe", "benh tat", "sang khoe", "the luc", "tri benh"],
      en: ["health", "illness", "wellness", "sickness", "recovery"]
    },
    isLove: {
      vi: ["tinh duyen", "tinh yeu", "hon nhan", "vo chong", "tinh cam"],
      en: ["love", "marriage", "romance", "relationship", "partner"]
    },
    isFamily: {
      vi: ["gia dao", "gia dinh", "ho gia", "than nhan", "gia can"],
      en: ["family", "household", "kin", "relatives", "parents"]
    },
    isChildren: {
      vi: ["con cai", "con", "tre con", "con nho", "nuoi day"],
      en: ["children", "kids", "offspring", "son", "daughter"]
    },
    isProperty: {
      vi: ["tai san", "dat dai", "nha cua", "bat dong san", "so huu"],
      en: ["property", "real estate", "land", "house", "asset"]
    },
    isDanger: {
      vi: ["tai nan", "nguy hiem", "rui ro", "an toan", "tai hoa"],
      en: ["accident", "danger", "risk", "safety", "hazard"]
    },
    isYear: {
      vi: ["nam", "sang nam", "tuong lai", "nam toi", "nam sau"],
      en: ["year", "next year", "future", "coming year", "forecast"]
    },
    isComplex: {
      vi: ["du doan", "tuong lai", "van menh", "dai van", "toan bo"],
      en: ["predict", "future", "destiny", "life path", "overall"]
    },
    isThapThan: {
      vi: ["thap than", "mười than", "than tai", "ty kien"],
      en: ["ten gods", "ten deities", "shoulder", "wealth"]
    },
    isThanSat: {
      vi: ["than sat", "sao", "thien at", "dao hoa", "hong loan"],
      en: ["auspicious stars", "stars", "nobleman", "peach blossom"]
    }
  };

  const types = {};
  for (const [type, { vi, en, not = [] }] of Object.entries(keywords)) {
    const viMatch = vi.some(keyword => normalizedInput.includes(keyword));
    const enMatch = en.some(keyword => normalizedInput.includes(keyword));
    const notMatch = not.some(keyword => normalizedInput.includes(keyword));
    types[type] = (viMatch || enMatch) && !notMatch;
  }
  types.isGeneral = !Object.values(types).some(v => v && v !== types.isYear);
  console.log("Question Type:", types);
  return types;
};

const analyzeYear = (year, tuTru, nguHanhCount, thapThanResults, dungThan) => {
  const canChi = getCanChiForYear(year);
  if (!canChi) return { vi: "Năm không hợp lệ", en: "Invalid year" };
  if (year === 2026 && canChi !== "Bính Ngọ") {
    throw new Error("Sai Can Chi cho năm 2026, phải là Bính Ngọ");
  }
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
  return {
    vi: `Năm ${year} (${can} ${chi}): ${nguHanhYear.can} (${canThapThan}), ${nguHanhYear.chi} (${chiThapThan}). ${isFavorable ? `Hỗ trợ Dụng Thần ${dungThan.join(", ")}, mang cơ hội.` : `Cân bằng ${dungThan.join(", ")} để tận dụng cơ hội.`}`,
    en: `Year ${year} (${can} ${chi}): ${nguHanhYear.can} (${canThapThan}), ${nguHanhYear.chi} (${chiThapThan}). ${isFavorable ? `Supports Useful God ${dungThan.join(", ")}, bringing opportunities.` : `Balance ${dungThan.join(", ")} to seize opportunities.`}`
  };
};

const estimateTokens = (text) => {
  return Math.ceil(text.length / 3.5); // Tinh chỉnh ước lượng cho tiếng Việt
};

const generateResponse = (tuTru, nguHanhCount, thapThanResults, thanSatResults, dungThan, userInput, messages, language) => {
  const totalElements = Object.values(nguHanhCount).reduce((a, b) => a + b, 0);
  const tyLeNguHanh = Object.fromEntries(
    Object.entries(nguHanhCount).map(([k, v]) => [k, k === "Hỏa" ? "Hỏa" : k, v.toFixed(1)])
  );
  const nhatChu = tuTru.ngay.split(" ")[0];
  const chiNgay = tuTru.ngay.split(" ")[1];
  const canNguHanh = {
    Giáp: "Mộc", Ất: "Mộc", Bính: "Hỏa", Đinh: "Hỏa", Mậu: "Thổ",
    Kỷ: "Thổ", Canh: "Kim", Tân: "Kim", Nhâm: "Thủy", Quý: "Thủy"
  };

  if (!dungThan || !dungThan.length || !dungThan.every(d => ["Mộc", "Hỏa", "Thổ", "Kim", "Thủy"].includes(d))) {
    throw new Error(language === "vi" ? "Dụng Thần không hợp lệ hoặc thiếu" : "Invalid or missing Useful God");
  }

  const { isGeneral, isMoney, isCareer, isFame, isHealth, isLove, isFamily, isChildren, isProperty, isDanger, isYear, isComplex, isThapThan, isThanSat } = determineQuestionType(userInput, language);

  let response = `${language === "vi" ? "Luận giải Bát Tự:\n" : "Bazi Interpretation:\n"}`;

  if (isComplex) {
    return `${language === "vi" ? "Vui lòng gửi câu hỏi qua app.aihuyenhoc@gmail.com" : "Please send questions to app.aihuyenhoc@gmail.com"}`;
  }

  if (isCareer) {
    response += `
${language === "vi" ? `Sự Nghiệp\nDựa trên Dụng Thần ${dungThan.join(", ")}, bạn phù hợp với:\n${dungThan.includes("Hỏa") ? "- Hỏa: Truyền thông, marketing, nghệ thuật.\n" : ""}${dungThan.includes("Thổ") ? "- Thổ: Bất động sản, kiến trúc.\n" : ""}Năm 2026 (Bính Ngọ, Hỏa vượng) mang cơ hội trong ${dungThan.includes("Hỏa") ? "truyền thông" : dungThan.includes("Thổ") ? "bất động sản" : "dự án liên quan"}.\n**Lời Khuyên**\n- Phát triển kỹ năng sáng tạo hoặc nghiên cứu bất động sản.\n- Sử dụng màu **${dungThan.includes("Hỏa") ? "đỏ, cam" : ""}${dungThan.includes("Hỏa") && dungThan.includes("Thổ") ? " hoặc " : ""}${dungThan.includes("Thổ") ? "nâu, vàng đất" : ""}**.\n- Đeo dây **màu đỏ** hoặc vòng **thạch anh vàng**.` : `Career\nBased on Useful Gods ${dungThan.join(", ")}, you are suited for:\n${dungThan.includes("Hỏa") ? "- Fire: Media, marketing, arts.\n" : ""}${dungThan.includes("Thổ") ? "- Earth: Real estate, architecture.\n" : ""}2026 (Bing Wu, strong Fire) brings opportunities in ${dungThan.includes("Hỏa") ? "media" : dungThan.includes("Thổ") ? "real estate" : "related projects"}.\n**Advice**\n- Develop creative skills or research real estate.\n- Use colors **${dungThan.includes("Hỏa") ? "red, orange" : ""}${dungThan.includes("Hỏa") && dungThan.includes("Thổ") ? " or " : ""}${dungThan.includes("Thổ") ? "brown, earthy tones" : ""}**.\n- Wear a **red cord** or **citrine** ring.`}
`;
    return response.trim().substring(0, 5000); // Giới hạn kích thước
  }

  if (isLove) {
    const daoHoa = thanSatResults["Đào Hoa"].value.length ? `Có Đào Hoa tại ${thanSatResults["Đào Hoa"].value[0]}` : "Không có Đào Hoa";
    const daoHoaDirection = { "Tý": "Bắc", "Ngọ": "Nam", "Mão": "Đông", "Dậu": "Tây" }[daoHoa[chiNgay]] || "Đông";
    response += `
${language === "vi" ? `Tình Duyên\n${daoHoa}. Có Hồng Loan tại Mùi. Hợp với người ${dungThan.includes("Hỏa") ? "nồng nhiệt" : dungThan.includes("Thổ") ? "thực tế" : "tinh tế"}. Nếu chưa có người yêu, đặt **lọ hoa ở góc ${daoHoaDirection}**. Năm 2026, tham gia sự kiện sáng tạo.\n**Lời Khuyên**\n- Mặc màu **${dungThan.includes("Hỏa") ? "đỏ, cam" : ""}${dungThan.includes("Hỏa") && dungThan.includes("Thổ") ? " hoặc " : ""}${dungThan.includes("Thổ") ? "nâu, vàng đất" : ""}**.\n- Đeo dây **màu đỏ** hoặc vòng **thạch anh vàng**.` : `Love\n${daoHoa}. Red Phoenix at Goat. Compatible with ${dungThan.includes("Hỏa") ? "passionate" : dungThan.includes("Thổ") ? "practical" : "refined"} partners. If single, place a **vase in the ${daoHoaDirection} corner**. In 2026, attend creative events.\n**Advice**\n- Wear **${dungThan.includes("Hỏa") ? "red, orange" : ""}${dungThan.includes("Hỏa") && dungThan.includes("Thổ") ? " or " : ""}${dungThan.includes("Thổ") ? "brown, earthy tones" : ""}**.\n- Wear a **red cord** or **citrine** ring.`}
`;
    return response.trim().substring(0, 5000);
  }

  if (isYear) {
    const yearMatch = userInput.match(/\d{4}/);
    const year = yearMatch ? parseInt(yearMatch[0]) : null;
    if (year) {
      const yearAnalysis = analyzeYear(year, tuTru, nguHanhCount, thapThanResults, dungThan);
      response += `
${language === "vi" ? `Năm ${year}:\n${yearAnalysis[language]}\n**Lời Khuyên**: Sử dụng màu **${dungThan.includes("Hỏa") ? "đỏ, cam" : ""}${dungThan.includes("Hỏa") && dungThan.includes("Thổ") ? " hoặc " : ""}${dungThan.includes("Thổ") ? "nâu, vàng đất" : ""}**.` : `Year ${year}:\n${yearAnalysis[language]}\n**Advice**: Use colors **${dungThan.includes("Hỏa") ? "red, orange" : ""}${dungThan.includes("Hỏa") && dungThan.includes("Thổ") ? " or " : ""}${dungThan.includes("Thổ") ? "brown, earthy tones" : ""}**.`}
`;
      return response.trim().substring(0, 5000);
    }
  }

  if (isGeneral) {
    response += `
${language === "vi" ? `**Lá số**: Giờ ${tuTru.gio}, Ngày ${tuTru.ngay}, Tháng ${tuTru.thang}, Năm ${tuTru.nam}.\n**Dụng Thần**: ${dungThan.join(", ")}.\n**Ngũ Hành**: ${Object.entries(tyLeNguHanh).map(([k, v]) => `${k}: ${v}`).join(", ")}.\n**Thần Sát**: Đào Hoa (${thanSatResults["Đào Hoa"].value.join(", ") || "Không có"}), Hồng Loan (${thanSatResults["Hồng Loan"].value.join(", ") || "Không có"}).\n
## 1. Tính Cách\n**Nhâm (Thủy)**: ${dayMasterDescriptions["Thủy"].vi}\n
## 2. Sự Nghiệp\nDựa trên Dụng Thần ${dungThan.join(", ")}, bạn phù hợp với:\n${dungThan.includes("Hỏa") ? "- Hỏa: Truyền thông, marketing, nghệ thuật.\n" : ""}${dungThan.includes("Thổ") ? "- Thổ: Bất động sản, kiến trúc.\n" : ""}Năm 2026 (Bính Ngọ, Hỏa vượng) mang cơ hội trong ${dungThan.includes("Hỏa") ? "truyền thông" : dungThan.includes("Thổ") ? "bất động sản" : "dự án liên quan"}.\n
## 3. Tình Duyên\n${thanSatResults["Đào Hoa"].value.length ? `Có Đào Hoa tại ${thanSatResults["Đào Hoa"].value[0]}` : "Không có Đào Hoa"}. Có Hồng Loan tại Mùi. Hợp với người ${dungThan.includes("Hỏa") ? "nồng nhiệt" : dungThan.includes("Thổ") ? "thực tế" : "tinh tế"}. Đặt **lọ hoa ở góc Đông (Mão)** nếu chưa có người yêu.\n
## 4. Lời Khuyên\n- Sử dụng màu **${dungThan.includes("Hỏa") ? "đỏ, cam" : ""}${dungThan.includes("Hỏa") && dungThan.includes("Thổ") ? " hoặc " : ""}${dungThan.includes("Thổ") ? "nâu, vàng đất" : ""}**.\n- Đeo dây **màu đỏ** hoặc vòng **thạch anh vàng**.` : `**Four Pillars**: Hour ${tuTru.gio}, Day ${tuTru.ngay}, Month ${tuTru.thang}, Year ${tuTru.nam}.\n**Useful Gods**: ${dungThan.join(", ")}.\n**Five Elements**: ${Object.entries(tyLeNguHanh).map(([k, v]) => `${k}: ${v}`).join(", ")}.\n**Auspicious Stars**: Peach Blossom (${thanSatResults["Đào Hoa"].value.join(", ") || "None"}), Red Phoenix (${thanSatResults["Hồng Loan"].value.join(", ") || "None"}).\n
## 1. Personality\n**Ren (Water)**: ${dayMasterDescriptions["Thủy"].en}\n
## 2. Career\nBased on Useful Gods ${dungThan.join(", ")}, you are suited for:\n${dungThan.includes("Hỏa") ? "- Fire: Media, marketing, arts.\n" : ""}${dungThan.includes("Thổ") ? "- Earth: Real estate, architecture.\n" : ""}2026 (Bing Wu, strong Fire) brings opportunities in ${dungThan.includes("Hỏa") ? "media" : dungThan.includes("Thổ") ? "real estate" : "related projects"}.\n
## 3. Love\n${thanSatResults["Đào Hoa"].value.length ? `Peach Blossom at ${thanSatResults["Đào Hoa"].value[0]}` : "No Peach Blossom"}. Red Phoenix at Goat. Compatible with ${dungThan.includes("Hỏa") ? "passionate" : dungThan.includes("Thổ") ? "practical" : "refined"} partners. Place a **vase in the East (Rabbit)** if single.\n
## 4. Advice\n- Use colors **${dungThan.includes("Hỏa") ? "red, orange" : ""}${dungThan.includes("Hỏa") && dungThan.includes("Thổ") ? " or " : ""}${dungThan.includes("Thổ") ? "brown, earthy tones" : ""}**.\n- Wear a **red cord** or **citrine** ring.`}
`;
    return response.trim().substring(0, 5000);
  }

  return response.trim().substring(0, 5000);
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
    return response.data.data.some(m => m.id.includes("gpt-3.5-turbo") || m.id.includes("gpt-4"));
  } catch (err) {
    console.error("Lỗi kiểm tra API key:", err.message);
    return false;
  }
};

const callOpenAI = async (payload, retries = 3, delay = 5000) => {
  console.log(`Bắt đầu OpenAI: ${new Date().toISOString()}`);
  if (!process.env.OPENAI_API_KEY) throw new Error("Missing OpenAI API key");
  if (!payload.model || !payload.messages || !Array.isArray(payload.messages) || payload.messages.length === 0) {
    throw new Error("Invalid payload: Missing model or messages");
  }

  const validModels = ["gpt-3.5-turbo", "gpt-4"];
  if (!validModels.includes(payload.model)) {
    throw new Error(`Invalid model: ${payload.model}. Must be one of ${validModels.join(", ")}`);
  }

  const promptText = payload.messages.map(m => m.content).join(" ");
  const estimatedTokens = estimateTokens(promptText);
  if (estimatedTokens > 3500) {
    throw new Error(`Prompt quá dài: ${estimatedTokens} tokens. Giảm xuống dưới 3500 tokens.`);
  }

  const isKeyValid = await checkOpenAIKey();
  if (!isKeyValid) throw new Error("Invalid API key");

  const isServerUp = await checkOpenAIStatus();
  if (!isServerUp) throw new Error("OpenAI server down");

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Thử ${attempt}, Payload:`, JSON.stringify(payload, null, 2));
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          ...payload,
          max_tokens: Math.min(payload.max_tokens || 1000, 4096 - estimatedTokens)
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json"
          },
          timeout: 60000
        }
      );
      console.log(`Hoàn thành OpenAI: ${new Date().toISOString()}`);
      return response.data;
    } catch (err) {
      console.error(`Thử ${attempt} thất bại: ${err.message}`);
      if (err.response?.status === 400) {
        console.error("Chi tiết lỗi 400:", err.response?.data?.error);
        throw new Error(`Bad Request: ${err.response?.data?.error?.message || "Invalid payload"}`);
      }
      if (err.response?.status === 429) throw new Error("Quota exceeded");
      if (err.response?.status === 401) throw new Error("Invalid API key");
      if (attempt === retries) throw new Error(`Failed after ${retries} retries: ${err.message}`);
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
};

app.post("/api/luan-giai-bazi", async (req, res) => {
  const startTime = Date.now();
  const { messages, tuTruInfo, dungThan, language = "vi" } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: language === "vi" ? "Thiếu messages" : "Missing messages" });
  }
  if (!tuTruInfo || typeof tuTruInfo !== "string") {
    return res.status(400).json({ error: language === "vi" ? "Thiếu tuTruInfo" : "Missing tuTruInfo" });
  }
  if (!dungThan || !Array.isArray(dungThan) || !dungThan.length || !dungThan.every(d => ["Mộc", "Hỏa", "Thổ", "Kim", "Thủy"].includes(d))) {
    return res.status(400).json({ error: language === "vi" ? "Dụng Thần không hợp lệ hoặc thiếu" : "Invalid or missing Useful God" });
  }

  const payloadSize = Buffer.byteLength(JSON.stringify(req.body), "utf8");
  if (payloadSize > 10 * 1024 * 1024) {
    console.error(`Payload quá lớn: ${payloadSize} bytes`);
    return res.status(413).json({ error: language === "vi" ? "Yêu cầu quá lớn" : "Request entity too large" });
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
    console.error("Lỗi parse tuTruInfo:", e.message);
    return res.status(400).json({ error: language === "vi" ? `Tứ Trụ không hợp lệ: ${e.message}` : `Invalid Four Pillars: ${e.message}` });
  }

  let nguHanh;
  try {
    nguHanh = analyzeNguHanh(tuTru);
  } catch (err) {
    console.error("Lỗi phân tích Ngũ Hành:", err.message);
    return res.status(400).json({ error: language === "vi" ? `Lỗi Ngũ Hành: ${err.message}` : `Five Elements error: ${err.message}` });
  }

  let thapThanResults = {};
  try {
    thapThanResults = tinhThapThan(tuTru.ngay?.split(" ")[0], tuTru);
  } catch (err) {
    console.error("Lỗi tính Thập Thần:", err.message);
    thapThanResults = { warning: `Không thể tính Thập Thần: ${err.message}` };
  }

  let thanSatResults = {};
  try {
    thanSatResults = tinhThanSat(tuTru, language);
  } catch (err) {
    console.error("Lỗi tính Thần Sát:", err.message);
    thanSatResults = { warning: `Không thể tính Thần Sát: ${err.message}` };
  }

  const useOpenAI = process.env.USE_OPENAI !== "false";
  const userInput = messages?.slice().reverse().find(m => m.role === "user")?.content || "";

  console.log("Input:", { userInput, dungThan, questionType: determineQuestionType(userInput, language) });

  const prompt = `
You are a Bazi expert. Respond in ${language === "vi" ? "Vietnamese" : "English"} to the user's question, using Useful Gods (${dungThan.join(", ")}) for advice. Be concise, empathetic, and focus ONLY on the requested aspect (e.g., career, love). Avoid unrelated sections unless a general analysis is requested. Provide actionable advice tied to Useful Gods. Limit response to 300 words.

Bazi: Hour ${tuTru.gio}, Day ${tuTru.ngay}, Month ${tuTru.thang}, Year ${tuTru.nam}
Useful Gods: ${dungThan.join(", ")}
Question: ${userInput || "Provide a general Bazi analysis"}
`;

  try {
    if (useOpenAI) {
      const gptRes = await callOpenAI({
        model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 1000
      });
      console.log(`Tổng thời gian xử lý: ${Date.now() - startTime}ms`);
      return res.json({ answer: gptRes.choices[0].message.content.substring(0, 5000) });
    } else {
      const answer = generateResponse(tuTru, nguHanh, thapThanResults, thanSatResults, dungThan, userInput, messages, language);
      console.log(`Tổng thời gian xử lý: ${Date.now() - startTime}ms`);
      return res.json({ answer });
    }
  } catch (err) {
    console.error("Lỗi OpenAI hoặc xử lý:", err.message);
    const answer = generateResponse(tuTru, nguHanh, thapThanResults, thanSatResults, dungThan, userInput, messages, language);
    return res.status(200).json({
      answer,
      warning: language === "vi" ? `Không thể kết nối với OpenAI: ${err.message}` : `Failed to connect with OpenAI: ${err.message}`
    });
  }
});

app.use((err, req, res, next) => {
  console.error("Lỗi hệ thống:", err.stack);
  if (err.status === 413 || err.type === "entity.too.large") {
    return res.status(413).json({ error: req.body.language === "vi" ? "Yêu cầu quá lớn" : "Request entity too large" });
  }
  return res.status(500).json({ error: req.body.language === "vi" ? "Lỗi hệ thống xảy ra" : "System error occurred" });
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
