const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Can Chi and Five Elements data
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

// Mapping for Heavenly Stems and Earthly Branches
const heavenlyStemsMap = {
  en: { Jia: "Giáp", Yi: "Ất", Bing: "Bính", Ding: "Đinh", Wu: "Mậu", Ji: "Kỷ", Geng: "Canh", Xin: "Tân", Ren: "Nhâm", Gui: "Quý" },
  vi: { Giáp: "Giáp", Ất: "Ất", Bính: "Bính", Đinh: "Đinh", Mậu: "Mậu", Kỷ: "Kỷ", Canh: "Canh", Tân: "Tân", Nhâm: "Nhâm", Quý: "Quý" }
};
const earthlyBranchesMap = {
  en: { Rat: "Tý", Ox: "Sửu", Tiger: "Dần", Rabbit: "Mão", Dragon: "Thìn", Snake: "Tỵ", Horse: "Ngọ", Goat: "Mùi", Monkey: "Thân", Rooster: "Dậu", Dog: "Tuất", Pig: "Hợi" },
  vi: { Tý: "Tý", Sửu: "Sửu", Dần: "Dần", Mão: "Mão", Thìn: "Thìn", Tỵ: "Tỵ", Ngọ: "Ngọ", Mùi: "Mùi", Thân: "Thân", Dậu: "Dậu", Tuất: "Tuất", Hợi: "Hợi" }
};

// Normalize Can Chi input
const normalizeCanChi = (input) => {
  if (!input || typeof input !== "string") return null;
  const parts = input.trim().split(" ");
  if (parts.length !== 2) return null;
  const can = Object.keys(heavenlyStemsMap.vi).find(k => k.toLowerCase() === parts[0].toLowerCase());
  const chi = Object.keys(earthlyBranchesMap.vi).find(k => k.toLowerCase() === parts[1].toLowerCase());
  if (!can || !chi) return null;
  return `${can} ${chi}`;
};

// Parse English Four Pillars input
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
    console.error("Error in parseEnglishTuTru:", e.message);
    return null;
  }
};

// 60-year cycle (Hoa Giap)
const hoaGiap = [
  "Giáp Tý", "Ất Sửu", "Bính Dần", "Đinh Mão", "Mậu Thìn", "Kỷ Tỵ", "Canh Ngọ", "Tân Mùi", "Nhâm Thân", "Quý Dậu",
  "Giáp Tuất", "Ất Hợi", "Bính Tý", "Đinh Sửu", "Mậu Dần", "Kỷ Mão", "Canh Thìn", "Tân Tỵ", "Nhâm Ngọ", "Quý Mùi",
  "Giáp Thân", "Ất Dậu", "Bính Tuất", "Đinh Hợi", "Mậu Tý", "Kỷ Sửu", "Canh Dần", "Tân Mão", "Nhâm Thìn", "Quý Tỵ",
  "Giáp Ngọ", "Ất Mùi", "Bính Thân", "Đinh Dậu", "Mậu Tuất", "Kỷ Hợi", "Canh Tý", "Tân Sửu", "Nhâm Dần", "Quý Mão",
  "Giáp Thìn", "Ất Tỵ", "Bính Ngọ", "Đinh Mùi", "Mậu Thân", "Kỷ Dậu", "Canh Tuất", "Tân Hợi", "Nhâm Tý", "Quý Sửu",
  "Giáp Dần", "Ất Mão", "Bính Thìn", "Đinh Tỵ", "Mậu Ngọ", "Kỷ Mùi", "Canh Thân", "Tân Dậu", "Nhâm Tuất", "Quý Hợi"
];

// Get Can Chi for a specific year
const getCanChiForYear = (year) => {
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return null;
  const baseYear = 1984;
  const index = (year - baseYear) % 60;
  const adjustedIndex = index < 0 ? index + 60 : index;
  return hoaGiap[adjustedIndex] || null;
};

// Analyze Five Elements distribution
const analyzeNguHanh = (tuTru) => {
  const nguHanhCount = { Mộc: 0, Hỏa: 0, Thổ: 0, Kim: 0, Thủy: 0 };
  const nguHanhDetails = { Mộc: [], Hỏa: [], Thổ: [], Kim: [], Thủy: [] };
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
      throw new Error("Incomplete Four Pillars");
    }

    for (const elem of elements) {
      if (canNguHanh[elem]) {
        nguHanhCount[canNguHanh[elem]] += 1;
        nguHanhDetails[canNguHanh[elem]].push(`${elem} (Thiên Can)`);
      }
      if (chiNguHanh[elem]) {
        nguHanhCount[chiNguHanh[elem]] += 1;
        nguHanhDetails[chiNguHanh[elem]].push(`${elem} (Địa Chi)`);
      }
    }
    for (const chi of branches) {
      const hidden = hiddenElements[chi] || [];
      for (const hiddenCan of hidden) {
        if (canNguHanh[hiddenCan]) {
          nguHanhCount[canNguHanh[hiddenCan]] += 0.3;
          nguHanhDetails[canNguHanh[hiddenCan]].push(`${hiddenCan} (Ẩn trong ${chi})`);
        }
      }
    }

    return { count: nguHanhCount, details: nguHanhDetails };
  } catch (e) {
    console.error("Error analyzing Five Elements:", e.message);
    throw new Error("Unable to analyze Five Elements");
  }
};

// Calculate Ten Gods
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
    throw new Error("Invalid Day Master");
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
      throw new Error("Incomplete Four Pillars");
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
    console.error("Error calculating Ten Gods:", e.message);
    throw new Error("Unable to calculate Ten Gods");
  }
};

// Calculate Auspicious Stars
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
  const vanXuong = {
    Giáp: ["Tỵ"], Ất: ["Ngọ"], Bính: ["Thân"], Đinh: ["Dậu"], Mậu: ["Hợi"],
    Kỷ: ["Tý"], Canh: ["Dần"], Tân: ["Mão"], Nhâm: ["Tỵ"], Quý: ["Ngọ"]
  };
  const thaiCucQuyNhan = {
    Giáp: ["Tý"], Ất: ["Tý"], Bính: ["Dần"], Đinh: ["Dần"], Mậu: ["Thìn"],
    Kỷ: ["Thìn"], Canh: ["Ngọ"], Tân: ["Ngọ"], Nhâm: ["Thân"], Quý: ["Thân"]
  };
  const hongLoan = {
    Tý: "Dậu", Sửu: "Thân", Dần: "Mùi", Mão: "Ngọ", Thìn: "Tỵ", Tỵ: "Thìn",
    Ngọ: "Mão", Mùi: "Dần", Thân: "Sửu", Dậu: "Tý", Tuất: "Hợi", Hợi: "Tuất"
  };
  const thienDuc = {
    Giáp: ["Hợi"], Ất: ["Tý"], Bính: ["Dần"], Đinh: ["Mão"], Mậu: ["Tỵ"],
    Kỷ: ["Ngọ"], Canh: ["Thân"], Tân: ["Dậu"], Nhâm: ["Hợi"], Quý: ["Tý"]
  };
  const nguyetDuc = {
    Giáp: ["Dần"], Ất: ["Mão"], Bính: ["Tỵ"], Đinh: ["Ngọ"], Mậu: ["Thân"],
    Kỷ: ["Dậu"], Canh: ["Hợi"], Tân: ["Tý"], Nhâm: ["Dần"], Quý: ["Mão"]
  };
  const tuongTinh = {
    Giáp: ["Mão"], Ất: ["Tý"], Bính: ["Tỵ"], Đinh: ["Ngọ"], Mậu: ["Dần"],
    Kỷ: ["Hợi"], Canh: ["Thân"], Tân: ["Dậu"], Nhâm: ["Tý"], Quý: ["Hợi"]
  };
  const dichMa = {
    Dần: ["Tỵ"], Mão: ["Tỵ"], Thìn: ["Tỵ"], Tỵ: ["Dần"], Ngọ: ["Dần"], Mùi: ["Dần"],
    Thân: ["Hợi"], Dậu: ["Hợi"], Tuất: ["Hợi"], Hợi: ["Thân"], Tý: ["Thân"], Sửu: ["Thân"]
  };
  const coThanQuaTu = {
    Giáp: ["Thân", "Thìn"], Ất: ["Dậu", "Tỵ"], Bính: ["Hợi", "Mùi"], Đinh: ["Tý", "Thân"],
    Mậu: ["Dần", "Tuất"], Kỷ: ["Mão", "Hợi"], Canh: ["Tỵ", "Sửu"], Tân: ["Ngọ", "Dần"],
    Nhâm: ["Thân", "Thìn"], Quý: ["Dậu", "Tỵ"]
  };
  const kiepSat = {
    Giáp: ["Thân"], Ất: ["Dậu"], Bính: ["Hợi"], Đinh: ["Tý"], Mậu: ["Dần"],
    Kỷ: ["Mão"], Canh: ["Tỵ"], Tân: ["Ngọ"], Nhâm: ["Thân"], Quý: ["Dậu"]
  };
  const khongVong = {
    Giáp: ["Tuất", "Hợi"], Ất: ["Thân", "Dậu"], Bính: ["Ngọ", "Mùi"], Đinh: ["Tỵ", "Ngọ"],
    Mậu: ["Mão", "Thìn"], Kỷ: ["Dần", "Mão"], Canh: ["Tý", "Sửu"], Tân: ["Hợi", "Tý"],
    Nhâm: ["Dậu", "Tuất"], Quý: ["Thân", "Dậu"]
  };

  const nhatChu = tuTru.ngay?.split(" ")[0];
  const branches = [
    tuTru.nam?.split(" ")[1], tuTru.thang?.split(" ")[1],
    tuTru.ngay?.split(" ")[1], tuTru.gio?.split(" ")[1]
  ].filter(Boolean);

  if (!nhatChu || !branches.length) {
    console.error("Nhật Chủ hoặc Địa Chi không hợp lệ:", { nhatChu, branches });
    throw new Error("Invalid Day Master or branches");
  }

  return {
    "Thiên Ất Quý Nhân": { vi: "Thiên Ất Quý Nhân", en: "Nobleman Star", value: thienAtQuyNhan[nhatChu]?.filter(chi => branches.includes(chi)) || [], description: { vi: "Mang lại sự hỗ trợ từ quý nhân", en: "Brings support from benefactors" } },
    "Đào Hoa": { vi: "Đào Hoa", en: "Peach Blossom", value: branches.includes(daoHoa[tuTru.ngay?.split(" ")[1]]) ? [daoHoa[tuTru.ngay?.split(" ")[1]]] : [], description: { vi: "Tăng sức hút, tình duyên", en: "Enhances charm and romance" } },
    "Văn Xương": { vi: "Văn Xương", en: "Literary Star", value: vanXuong[nhatChu]?.filter(chi => branches.includes(chi)) || [], description: { vi: "Thúc đẩy học vấn, trí tuệ", en: "Promotes education and wisdom" } },
    "Thái Cực Quý Nhân": { vi: "Thái Cực Quý Nhân", en: "Grand Ultimate Noble", value: thaiCucQuyNhan[nhatChu]?.filter(chi => branches.includes(chi)) || [], description: { vi: "Bảo vệ và mang lại may mắn", en: "Protects and brings luck" } },
    "Hồng Loan": { vi: "Hồng Loan", en: "Red Phoenix", value: branches.includes(hongLoan[tuTru.ngay?.split(" ")[1]]) ? [hongLoan[tuTru.ngay?.split(" ")[1]]] : [], description: { vi: "Tăng cường tình duyên, hôn nhân", en: "Enhances love and marriage" } },
    "Thiên Đức": { vi: "Thiên Đức", en: "Heavenly Virtue", value: thienDuc[nhatChu]?.filter(chi => branches.includes(chi)) || [], description: { vi: "Mang phúc đức, giảm rủi ro", en: "Brings blessings, reduces risks" } },
    "Nguyệt Đức": { vi: "Nguyệt Đức", en: "Lunar Virtue", value: nguyetDuc[nhatChu]?.filter(chi => branches.includes(chi)) || [], description: { vi: "Tăng phúc đức, bảo vệ", en: "Enhances blessings, protection" } },
    "Tướng Tinh": { vi: "Tướng Tinh", en: "General Star", value: tuongTinh[nhatChu]?.filter(chi => branches.includes(chi)) || [], description: { vi: "Thúc đẩy uy quyền, lãnh đạo", en: "Promotes authority and leadership" } },
    "Dịch Mã": { vi: "Dịch Mã", en: "Traveling Horse", value: dichMa[tuTru.ngay?.split(" ")[1]]?.filter(chi => branches.includes(chi)) || [], description: { vi: "Mang cơ hội di chuyển, thay đổi", en: "Brings opportunities for travel and change" } },
    "Cô Thần Quả Tú": { vi: "Cô Thần Quả Tú", en: "Solitary Widow", value: coThanQuaTu[nhatChu]?.filter(chi => branches.includes(chi)) || [], description: { vi: "Cảnh báo cô đơn, khó khăn trong quan hệ", en: "Warns of loneliness, relationship challenges" } },
    "Kiếp Sát": { vi: "Kiếp Sát", en: "Robbery Sha", value: kiepSat[nhatChu]?.filter(chi => branches.includes(chi)) || [], description: { vi: "Cảnh báo rủi ro, cần thận trọng", en: "Warns of risks, requires caution" } },
    "Không Vong": { vi: "Không Vong", en: "Void Star", value: khongVong[nhatChu]?.filter(chi => branches.includes(chi)) || [], description: { vi: "Cảnh báo khó khăn, cần cẩn trọng trong quyết định", en: "Warns of obstacles, requires careful decisions" } }
  };
};

// Personality and Ten Gods effects
const personalityDescriptions = {
  Mộc: { vi: "sáng tạo, linh hoạt, thông minh, như cây xanh vươn mình trong gió", en: "creative, adaptable, intelligent, like a thriving tree swaying in the breeze" },
  Hỏa: { vi: "đam mê, năng động, nhiệt huyết, như ngọn lửa rực rỡ soi sáng màn đêm", en: "passionate, energetic, enthusiastic, like a radiant flame illuminating the night" },
  Thổ: { vi: "vững chãi, đáng tin, thực tế, như ngọn núi vững chãi trước bão tố", en: "steadfast, reliable, practical, like a steadfast mountain standing against storms" },
  Kim: { vi: "tinh tế, quyết tâm, chính trực, như lưỡi kiếm sắc bén được rèn trong lửa", en: "elegant, determined, upright, like a sharp sword forged in fire" },
  Thủy: { vi: "sâu sắc, trí tuệ, nhạy bén, như dòng sông chảy mãi không ngừng", en: "profound, intelligent, perceptive, like an endless river flowing tirelessly" }
};

const thapThanEffects = {
  "Tỷ Kiên": { vi: "Tự lập, mạnh mẽ, có khả năng lãnh đạo", en: "Independent, strong, with leadership potential" },
  "Kiếp Tài": { vi: "Tài năng, quyết đoán, thích cạnh tranh", en: "Talented, decisive, competitive" },
  "Thực Thần": { vi: "Sáng tạo, nghệ thuật, thích tự do", en: "Creative, artistic, freedom-loving" },
  "Thương Quan": { vi: "Tư duy sắc bén, thích đổi mới", en: "Sharp-minded, innovative" },
  "Chính Tài": { vi: "Giỏi quản lý tài chính, ổn định", en: "Good at financial management, stable" },
  "Thiên Tài": { vi: "Nhạy bén, sáng tạo, tư duy đột phá", en: "Perceptive, creative, breakthrough thinking" },
  "Chính Quan": { vi: "Trách nhiệm, uy tín, phù hợp lãnh đạo", en: "Responsible, influential, suited for leadership" },
  "Thất Sát": { vi: "Dũng cảm, quyết liệt, năng lượng mạnh", en: "Courageous, assertive, strong energy" },
  "Chính Ấn": { vi: "Trí tuệ, học vấn, tư duy sâu sắc", en: "Wise, scholarly, profound thinking" },
  "Thiên Ấn": { vi: "Sáng tạo, tư duy độc đáo, trực giác mạnh", en: "Creative, unique thinking, strong intuition" }
};

// Determine question type with expanded keywords
const determineQuestionType = (userInput, language) => {
  const normalizedInput = typeof userInput === "string" ? userInput.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
  const types = {
    isMoney: /tien bac|tai chinh|tai loc|cua cai|giau co|thinh vuong|tien|kinh te|loi nhuan|thu nhap|may man|phat tai|phu quy|loc la|kiem tien|money|finance|wealth|prosperity|riches|fortune|income|profit|earnings|financial|luck|abundance|savings|revenue|capital/i.test(normalizedInput) && !/tai nan|nguy hiem|rui ro|accident|danger|risk|safety|hazard|trouble|crisis/i.test(normalizedInput),
    isCareer: /nghe|cong viec|su nghiep|viec lam|nghe nghiep|cong danh|chuc vu|lam an|phat trien|thanh cong|career|job|work|profession|occupation|employment|success|achievement|ambition|business|promotion|enterprise|trade|industry|vocation/i.test(normalizedInput),
    isFame: /cong danh|danh vong|tieng tam|uy tin|danh tieng|vinh quang|thanh danh|dia vi|noi tieng|quyen luc|fame|reputation|prestige|honor|recognition|glory|status|renown|influence|prominence|celebrity|notoriety|acclaim|authority|leadership/i.test(normalizedInput),
    isHealth: /suc khoe|khoe manh|benh tat|benh|om yeu|the chat|tinh than|suc de khang|dau om|the luc|an khang|manh khoe|binh an|benh vien|chua benh|health|wellness|illness|disease|sickness|fitness|well-being|condition|vitality|ailment|recovery|strength|healing|energy|stamina/i.test(normalizedInput),
    isLove: /tinh duyen|tinh yeu|hon nhan|nhan duyen|tinh cam|ai tinh|ban doi|ket hon|yeu duong|hanh phuc|love|romance|marriage|relationship|affection|partner|dating|spouse|intimacy|happiness|soulmate|courtship|commitment|bond|affair/i.test(normalizedInput),
    isFamily: /gia dao|gia dinh|nha cua|to am|hanh phuc gia dinh|quan he gia dinh|mai am|than nhan|ho hang|doan vien|family|household|home|kinship|relatives|domestic life|family ties|harmony|lineage|reunion|ancestors|siblings|parents|clan|kin/i.test(normalizedInput),
    isChildren: /con cai|con|chau|hau due|tre em|dua tre|gia dinh|dong doi|con chau|the he|children|kids|offspring|descendants|family|heirs|youngsters|progeny|next generation|babies|infants|youth|successors|heritage|legacy/i.test(normalizedInput),
    isProperty: /tai san|dat dai|nha dat|bat dong san|cua cai|so huu|vat chat|tai san co dinh|dau tu|tich luy|property|real estate|assets|estate|wealth|ownership|investment|possessions|land|holdings|buildings|capital|resources|acquisition|inheritance/i.test(normalizedInput),
    isYear: /nam \d{4}|sang nam|du doan nam|tuong lai nam|year \d{4}|next year|upcoming year|yearly forecast|future year|annual prediction|coming year|new year|future|outlook|prediction/i.test(normalizedInput),
    isComplex: /du doan|tuong lai|van menh|so phan|dai van|trien vong|dinh menh|tien doan|future|destiny|fate|forecast|outlook|prospects|prediction|prophecy|fortune|life path/i.test(normalizedInput),
    isThapThan: /thap than|muoi than|than luc|van than|bat tu than|yeu to than|can chi than|than so|than menh|phan tich than|ten gods|ten deities|ten spirits|ten influences|bazi gods|elemental gods|fate gods|gods analysis|destiny gods|spiritual elements/i.test(normalizedInput),
    isThanSat: /than sat|sao|tinh tu|van sao|sao chieu menh|sao tot|sao xau|tinh than|sao menh|sao van|auspicious stars|stars|celestial stars|fate stars|lucky stars|unlucky stars|destiny stars|spiritual stars|star influences|bazi stars/i.test(normalizedInput),
    isDanger: /tai nan|nguy hiem|rui ro|an toan|hoan nan|tham hoa|safety|accident|danger|risk|hazard|trouble|crisis|calamity|disaster|threat|peril|injury|emergency|misfortune/i.test(normalizedInput)
  };
  types.isGeneral = !Object.values(types).some(v => v);
  return types;
};

// Analyze specific year
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

  const isYang = ["Giáp", "Bính", "Mậu", "Canh", "Nhâm"].includes(nhatChu);
  const nguHanhNam = canNguHanh[can] || chiNguHanh[chi];
  const isCanYang = ["Giáp", "Bính", "Mậu", "Canh", "Nhâm"].includes(can);
  const index = (isYang === isCanYang) ? 0 : 1;
  const thapThanNam = thapThanMap[canNguHanh[nhatChu]][nguHanhNam][index];

  const isFavorable = dungThan.includes(nguHanhNam);
  return {
    vi: `Năm ${year} (${canChi}): ${isFavorable ? `Thuận lợi nhờ ${nguHanhNam} hợp Dụng Thần, ${thapThanNam} hỗ trợ ${thapThanEffects[thapThanNam].vi}.` : `Cần thận trọng, ${nguHanhNam} không hợp Dụng Thần, ${thapThanNam} có thể mang thử thách.`}`,
    en: `Year ${year} (${canChi}): ${isFavorable ? `Favorable due to ${nguHanhNam} aligning with Useful God, ${thapThanNam} supports ${thapThanEffects[thapThanNam].en}.` : `Be cautious, ${nguHanhNam} conflicts with Useful God, ${thapThanNam} may bring challenges.`}`
  };
};

// Generate response with dynamic Day Master description
const generateResponse = (tuTru, nguHanhData, thapThanResults, dungThan, userInput, messages, language) => {
  const nguHanhCount = nguHanhData.count;
  const nguHanhDetails = nguHanhData.details;
  const nhatChu = tuTru.ngay.split(" ")[0];
  const canNguHanh = {
    Giáp: "Mộc", Ất: "Mộc", Bính: "Hỏa", Đinh: "Hỏa", Mậu: "Thổ",
    Kỷ: "Thổ", Canh: "Kim", Tân: "Kim", Nhâm: "Thủy", Quý: "Thủy"
  };
  const questionTypes = determineQuestionType(userInput, language);
  const { isMoney, isCareer, isFame, isHealth, isLove, isFamily, isChildren, isProperty, isYear, isComplex, isThapThan, isThanSat, isDanger, isGeneral } = questionTypes;

  // Detailed Five Elements description
  const nguHanhDesc = Object.entries(nguHanhDetails).map(([hanh, sources]) => {
    const count = nguHanhCount[hanh].toFixed(1);
    return `${hanh}: ${count} (${sources.length ? sources.join(", ") : "Không có"})`;
  }).join("\n");

  // Determine strongest and weakest elements
  const strongest = Object.entries(nguHanhCount).reduce((a, b) => a[1] > b[1] ? a : b)[0];
  const weakest = Object.entries(nguHanhCount).reduce((a, b) => a[1] < b[1] ? a : b)[0];

  // Dynamic Day Master description
  const dayMasterDesc = {
    Kim: { vi: `Như lưỡi kiếm sắc bén được rèn trong lửa, Nhật Chủ ${nhatChu} (Kim) tỏa sáng với sự tinh tế và kiên định.`, en: `Like a sharp sword forged in fire, Day Master ${nhatChu} (Metal) shines with elegance and resilience.` },
    Mộc: { vi: `Như cây xanh vươn mình trong gió, Nhật Chủ ${nhatChu} (Mộc) mang sức sống và tinh thần sáng tạo.`, en: `Like a thriving tree swaying in the breeze, Day Master ${nhatChu} (Wood) embodies vitality and creativity.` },
    Hỏa: { vi: `Như ngọn lửa rực rỡ soi sáng màn đêm, Nhật Chủ ${nhatChu} (Hỏa) bừng cháy với đam mê và nhiệt huyết.`, en: `Like a radiant flame illuminating the night, Day Master ${nhatChu} (Fire) blazes with passion and enthusiasm.` },
    Thổ: { vi: `Như ngọn núi vững chãi trước bão tố, Nhật Chủ ${nhatChu} (Thổ) mang sự ổn định và đáng tin cậy.`, en: `Like a steadfast mountain standing against storms, Day Master ${nhatChu} (Earth) exudes stability and reliability.` },
    Thủy: { vi: `Như dòng sông chảy mãi không ngừng, Nhật Chủ ${nhatChu} (Thủy) sâu sắc và linh hoạt trong mọi hoàn cảnh.`, en: `Like an endless river flowing tirelessly, Day Master ${nhatChu} (Water) is profound and adaptable.` }
  };

  let response = "";

  // Handle complex questions
  if (isComplex) {
    return {
      answer: language === "vi"
        ? "Câu hỏi liên quan đến dự đoán tương lai hoặc đại vận cần phân tích chi tiết. Vui lòng liên hệ app.aihuyenhoc@gmail.com hoặc tham gia cộng đồng Discord để được hỗ trợ."
        : "Questions about future predictions or major life cycles require detailed analysis. Please contact app.aihuyenhoc@gmail.com or join our Discord community for support.",
      warning: null
    };
  }

  // General analysis
  if (isGeneral) {
    response += `
${language === "vi" ? "Luận giải Bát Tự" : "Bazi Interpretation"}:
${dayMasterDesc[canNguHanh[nhatChu]][language]}
${language === "vi" ? "Tứ Trụ:" : "Four Pillars:"} Giờ ${tuTru.gio}, Ngày ${tuTru.ngay}, Tháng ${tuTru.thang}, Năm ${tuTru.nam}.
${language === "vi" ? "Ngũ Hành:" : "Five Elements:"}
${nguHanhDesc}
${language === "vi" ? `${strongest} mạnh nhất, thể hiện sự ${personalityDescriptions[strongest].vi.split(", ").slice(0, -1).join(", ")}. ${weakest} yếu nhất, cần bổ sung để cân bằng.` : `${strongest} is the strongest, reflecting ${personalityDescriptions[strongest].en.split(", ").slice(0, -1).join(", ")}. ${weakest} is the weakest, needing enhancement for balance.`}
${language === "vi" ? `Dụng Thần ${dungThan.join(", ")} sẽ giúp bạn cân bằng và phát triển.` : `Useful God ${dungThan.join(", ")} will help you achieve balance and growth.`}
`;
  }

  // Ten Gods analysis (if requested)
  if (isThapThan) {
    response += `
${language === "vi" ? "Thập Thần:" : "Ten Gods:"}
${Object.entries(thapThanResults).map(([elem, thapThan]) => `${elem}: ${thapThan} (${thapThanEffects[thapThan][language]})`).join("\n")}
`;
  }

  // Auspicious Stars analysis (if requested)
  if (isThanSat) {
    const thanSatResults = tinhThanSat(tuTru);
    const activeThanSat = Object.entries(thanSatResults)
      .filter(([_, value]) => value.value.length)
      .map(([key, value]) => `${value[language]}: ${value.value.join(", ")} (${value.description[language]})`);
    response += `
${language === "vi" ? "Thần Sát:" : "Auspicious Stars:"}
${activeThanSat.length ? activeThanSat.join("\n") : language === "vi" ? "Không có Thần Sát nổi bật." : "No prominent Auspicious Stars."}
`;
  }

  // Specific question analysis
  if (isMoney) {
    response += `
${language === "vi" ? "Tài lộc:" : "Wealth:"}
${language === "vi" ? `Như ${canNguHanh[nhatChu].toLowerCase()} cần ${dungThan[0].toLowerCase()} để tỏa sáng, tài lộc của bạn phụ thuộc vào Dụng Thần ${dungThan.join(", ")}.` : `As ${canNguHanh[nhatChu].toLowerCase()} needs ${dungThan[0].toLowerCase()} to shine, your wealth relies on Useful God ${dungThan.join(", ")}.`}
${language === "vi" ? `Đề xuất: Sử dụng màu ${dungThan.includes("Mộc") ? "xanh lá cây" : dungThan.includes("Hỏa") ? "đỏ, cam" : dungThan.includes("Thổ") ? "vàng, nâu" : dungThan.includes("Kim") ? "trắng, bạc" : "xanh dương"}, vật phẩm như ${dungThan.includes("Mộc") ? "ngọc bích" : dungThan.includes("Hỏa") ? "thạch anh hồng" : dungThan.includes("Thổ") ? "thạch anh vàng" : dungThan.includes("Kim") ? "đá mặt trăng" : "lapis lazuli"}, và hướng ${dungThan.includes("Mộc") ? "Đông" : dungThan.includes("Hỏa") ? "Nam" : dungThan.includes("Thổ") ? "Đông Bắc" : dungThan.includes("Kim") ? "Tây" : "Bắc"}.` : `Suggestions: Use colors like ${dungThan.includes("Mộc") ? "green" : dungThan.includes("Hỏa") ? "red, orange" : dungThan.includes("Thổ") ? "yellow, brown" : dungThan.includes("Kim") ? "white, silver" : "blue"}, items like ${dungThan.includes("Mộc") ? "jade" : dungThan.includes("Hỏa") ? "rose quartz" : dungThan.includes("Thổ") ? "citrine" : dungThan.includes("Kim") ? "moonstone" : "lapis lazuli"}, and direction ${dungThan.includes("Mộc") ? "East" : dungThan.includes("Hỏa") ? "South" : dungThan.includes("Thổ") ? "Northeast" : dungThan.includes("Kim") ? "West" : "North"}.`}
`;
  } else if (isCareer) {
    response += `
${language === "vi" ? "Sự nghiệp:" : "Career:"}
${language === "vi" ? `Như ${canNguHanh[nhatChu].toLowerCase()} được ${dungThan[0].toLowerCase()} nâng niu, sự nghiệp của bạn sẽ tỏa sáng khi tận dụng Dụng Thần ${dungThan.join(", ")}.` : `As ${canNguHanh[nhatChu].toLowerCase()} is nurtured by ${dungThan[0].toLowerCase()}, your career will shine by leveraging Useful God ${dungThan.join(", ")}.`}
${language === "vi" ? `Phù hợp với các ngành như ${dungThan.includes("Mộc") ? "giáo dục, nghệ thuật, truyền thông, thiết kế" : dungThan.includes("Hỏa") ? "marketing, lãnh đạo, sáng tạo, công nghệ" : dungThan.includes("Thổ") ? "bất động sản, quản lý, tài chính, xây dựng" : dungThan.includes("Kim") ? "kỹ thuật, công nghệ, phân tích, luật" : "giao tiếp, du lịch, tư vấn, ngoại giao"}.` : `Suitable for fields like ${dungThan.includes("Mộc") ? "education, arts, media, design" : dungThan.includes("Hỏa") ? "marketing, leadership, creativity, technology" : dungThan.includes("Thổ") ? "real estate, management, finance, construction" : dungThan.includes("Kim") ? "engineering, technology, analysis, law" : "communication, travel, consulting, diplomacy"}.`}
${thapThanResults ? Object.entries(thapThanResults).map(([elem, thapThan]) => thapThan === "Chính Ấn" ? `${language === "vi" ? "Trí tuệ từ Chính Ấn hỗ trợ các công việc nghiên cứu, giảng dạy." : "Wisdom from Direct Seal supports research and teaching."}` : thapThan === "Thực Thần" ? `${language === "vi" ? "Sáng tạo từ Thực Thần phù hợp với nghệ thuật, thiết kế." : "Creativity from Direct Resource suits arts and design."}` : thapThan === "Thiên Tài" ? `${language === "vi" ? "Nhạy bén từ Thiên Tài tốt cho công việc đổi mới." : "Insight from Indirect Wealth is great for innovation."}` : thapThan === "Chính Quan" ? `${language === "vi" ? "Uy tín từ Chính Quan lý tưởng cho vai trò lãnh đạo." : "Authority from Direct Officer is ideal for leadership."}` : "").filter(Boolean).join("\n") : ""}
${language === "vi" ? `Đề xuất: Sử dụng màu ${dungThan.includes("Mộc") ? "xanh lá cây" : dungThan.includes("Hỏa") ? "đỏ, cam" : dungThan.includes("Thổ") ? "vàng, nâu" : dungThan.includes("Kim") ? "trắng, bạc" : "xanh dương"}, vật phẩm như ${dungThan.includes("Mộc") ? "ngọc bích" : dungThan.includes("Hỏa") ? "thạch anh hồng" : dungThan.includes("Thổ") ? "thạch anh vàng" : dungThan.includes("Kim") ? "đá mặt trăng" : "lapis lazuli"}, và hướng ${dungThan.includes("Mộc") ? "Đông" : dungThan.includes("Hỏa") ? "Nam" : dungThan.includes("Thổ") ? "Đông Bắc" : dungThan.includes("Kim") ? "Tây" : "Bắc"}.` : `Suggestions: Use colors like ${dungThan.includes("Mộc") ? "green" : dungThan.includes("Hỏa") ? "red, orange" : dungThan.includes("Thổ") ? "yellow, brown" : dungThan.includes("Kim") ? "white, silver" : "blue"}, items like ${dungThan.includes("Mộc") ? "jade" : dungThan.includes("Hỏa") ? "rose quartz" : dungThan.includes("Thổ") ? "citrine" : dungThan.includes("Kim") ? "moonstone" : "lapis lazuli"}, and direction ${dungThan.includes("Mộc") ? "East" : dungThan.includes("Hỏa") ? "South" : dungThan.includes("Thổ") ? "Northeast" : dungThan.includes("Kim") ? "West" : "North"}.`}
`;
  } else if (isHealth) {
    response += `
${language === "vi" ? "Sức khỏe:" : "Health:"}
${language === "vi" ? `Như ${canNguHanh[nhatChu].toLowerCase()} cần ${dungThan[0].toLowerCase()} để cân bằng, sức khỏe của bạn phụ thuộc vào sự hài hòa của ngũ hành.` : `As ${canNguHanh[nhatChu].toLowerCase()} needs ${dungThan[0].toLowerCase()} for balance, your health relies on harmony of the Five Elements.`}
${language === "vi" ? `Đề xuất: Sử dụng màu ${dungThan.includes("Mộc") ? "xanh lá cây" : dungThan.includes("Hỏa") ? "đỏ, cam" : dungThan.includes("Thổ") ? "vàng, nâu" : dungThan.includes("Kim") ? "trắng, bạc" : "xanh dương"}, vật phẩm như ${dungThan.includes("Mộc") ? "ngọc bích" : dungThan.includes("Hỏa") ? "thạch anh hồng" : dungThan.includes("Thổ") ? "thạch anh vàng" : dungThan.includes("Kim") ? "đá mặt trăng" : "lapis lazuli"}, và hướng ${dungThan.includes("Mộc") ? "Đông" : dungThan.includes("Hỏa") ? "Nam" : dungThan.includes("Thổ") ? "Đông Bắc" : dungThan.includes("Kim") ? "Tây" : "Bắc"}.` : `Suggestions: Use colors like ${dungThan.includes("Mộc") ? "green" : dungThan.includes("Hỏa") ? "red, orange" : dungThan.includes("Thổ") ? "yellow, brown" : dungThan.includes("Kim") ? "white, silver" : "blue"}, items like ${dungThan.includes("Mộc") ? "jade" : dungThan.includes("Hỏa") ? "rose quartz" : dungThan.includes("Thổ") ? "citrine" : dungThan.includes("Kim") ? "moonstone" : "lapis lazuli"}, and direction ${dungThan.includes("Mộc") ? "East" : dungThan.includes("Hỏa") ? "South" : dungThan.includes("Thổ") ? "Northeast" : dungThan.includes("Kim") ? "West" : "North"}.`}
`;
  } else if (isLove) {
    response += `
${language === "vi" ? "Tình duyên:" : "Love:"}
${language === "vi" ? `Như ${canNguHanh[nhatChu].toLowerCase()} tìm thấy ${dungThan[0].toLowerCase()}, tình duyên của bạn nở hoa khi có sự hỗ trợ từ Dụng Thần ${dungThan.join(", ")}.` : `As ${canNguHanh[nhatChu].toLowerCase()} finds ${dungThan[0].toLowerCase()}, your love blossoms with support from Useful God ${dungThan.join(", ")}.`}
${language === "vi" ? `Đề xuất: Sử dụng màu ${dungThan.includes("Mộc") ? "xanh lá cây" : dungThan.includes("Hỏa") ? "đỏ, cam" : dungThan.includes("Thổ") ? "vàng, nâu" : dungThan.includes("Kim") ? "trắng, bạc" : "xanh dương"}, vật phẩm như ${dungThan.includes("Mộc") ? "ngọc bích" : dungThan.includes("Hỏa") ? "thạch anh hồng" : dungThan.includes("Thổ") ? "thạch anh vàng" : dungThan.includes("Kim") ? "đá mặt trăng" : "lapis lazuli"}, và hướng ${dungThan.includes("Mộc") ? "Đông" : dungThan.includes("Hỏa") ? "Nam" : dungThan.includes("Thổ") ? "Đông Bắc" : dungThan.includes("Kim") ? "Tây" : "Bắc"}.` : `Suggestions: Use colors like ${dungThan.includes("Mộc") ? "green" : dungThan.includes("Hỏa") ? "red, orange" : dungThan.includes("Thổ") ? "yellow, brown" : dungThan.includes("Kim") ? "white, silver" : "blue"}, items like ${dungThan.includes("Mộc") ? "jade" : dungThan.includes("Hỏa") ? "rose quartz" : dungThan.includes("Thổ") ? "citrine" : dungThan.includes("Kim") ? "moonstone" : "lapis lazuli"}, and direction ${dungThan.includes("Mộc") ? "East" : dungThan.includes("Hỏa") ? "South" : dungThan.includes("Thổ") ? "Northeast" : dungThan.includes("Kim") ? "West" : "North"}.`}
`;
  } else if (isChildren) {
    response += `
${language === "vi" ? "Con cái:" : "Children:"}
${language === "vi" ? `Như ${canNguHanh[nhatChu].toLowerCase()} được ${dungThan[0].toLowerCase()} nâng niu, con cái của bạn sẽ mang lại niềm vui lớn khi có Dụng Thần ${dungThan.join(", ")}.` : `As ${canNguHanh[nhatChu].toLowerCase()} is nurtured by ${dungThan[0].toLowerCase()}, your children will bring great joy with Useful God ${dungThan.join(", ")}.`}
${language === "vi" ? `Đề xuất: Sử dụng màu ${dungThan.includes("Mộc") ? "xanh lá cây" : dungThan.includes("Hỏa") ? "đỏ, cam" : dungThan.includes("Thổ") ? "vàng, nâu" : dungThan.includes("Kim") ? "trắng, bạc" : "xanh dương"}, vật phẩm như ${dungThan.includes("Mộc") ? "ngọc bích" : dungThan.includes("Hỏa") ? "thạch anh hồng" : dungThan.includes("Thổ") ? "thạch anh vàng" : dungThan.includes("Kim") ? "đá mặt trăng" : "lapis lazuli"}, và hướng ${dungThan.includes("Mộc") ? "Đông" : dungThan.includes("Hỏa") ? "Nam" : dungThan.includes("Thổ") ? "Đông Bắc" : dungThan.includes("Kim") ? "Tây" : "Bắc"}.` : `Suggestions: Use colors like ${dungThan.includes("Mộc") ? "green" : dungThan.includes("Hỏa") ? "red, orange" : dungThan.includes("Thổ") ? "yellow, brown" : dungThan.includes("Kim") ? "white, silver" : "blue"}, items like ${dungThan.includes("Mộc") ? "jade" : dungThan.includes("Hỏa") ? "rose quartz" : dungThan.includes("Thổ") ? "citrine" : dungThan.includes("Kim") ? "moonstone" : "lapis lazuli"}, and direction ${dungThan.includes("Mộc") ? "East" : dungThan.includes("Hỏa") ? "South" : dungThan.includes("Thổ") ? "Northeast" : dungThan.includes("Kim") ? "West" : "North"}.`}
`;
  } else if (isFamily) {
    response += `
${language === "vi" ? "Gia đạo:" : "Family:"}
${language === "vi" ? `Như ${canNguHanh[nhatChu].toLowerCase()} được ${dungThan[0].toLowerCase()} che chở, gia đạo của bạn sẽ hài hòa khi có Dụng Thần ${dungThan.join(", ")}.` : `As ${canNguHanh[nhatChu].toLowerCase()} is protected by ${dungThan[0].toLowerCase()}, your family life will be harmonious with Useful God ${dungThan.join(", ")}.`}
${language === "vi" ? `Đề xuất: Sử dụng màu ${dungThan.includes("Mộc") ? "xanh lá cây" : dungThan.includes("Hỏa") ? "đỏ, cam" : dungThan.includes("Thổ") ? "vàng, nâu" : dungThan.includes("Kim") ? "trắng, bạc" : "xanh dương"}, vật phẩm như ${dungThan.includes("Mộc") ? "ngọc bích" : dungThan.includes("Hỏa") ? "thạch anh hồng" : dungThan.includes("Thổ") ? "thạch anh vàng" : dungThan.includes("Kim") ? "đá mặt trăng" : "lapis lazuli"}, và hướng ${dungThan.includes("Mộc") ? "Đông" : dungThan.includes("Hỏa") ? "Nam" : dungThan.includes("Thổ") ? "Đông Bắc" : dungThan.includes("Kim") ? "Tây" : "Bắc"}.` : `Suggestions: Use colors like ${dungThan.includes("Mộc") ? "green" : dungThan.includes("Hỏa") ? "red, orange" : dungThan.includes("Thổ") ? "yellow, brown" : dungThan.includes("Kim") ? "white, silver" : "blue"}, items like ${dungThan.includes("Mộc") ? "jade" : dungThan.includes("Hỏa") ? "rose quartz" : dungThan.includes("Thổ") ? "citrine" : dungThan.includes("Kim") ? "moonstone" : "lapis lazuli"}, and direction ${dungThan.includes("Mộc") ? "East" : dungThan.includes("Hỏa") ? "South" : dungThan.includes("Thổ") ? "Northeast" : dungThan.includes("Kim") ? "West" : "North"}.`}
`;
  } else if (isFame) {
    response += `
${language === "vi" ? "Danh vọng:" : "Fame:"}
${language === "vi" ? `Như ${canNguHanh[nhatChu].toLowerCase()} được ${dungThan[0].toLowerCase()} nâng đỡ, danh vọng của bạn sẽ tỏa sáng khi có Dụng Thần ${dungThan.join(", ")}.` : `As ${canNguHanh[nhatChu].toLowerCase()} is supported by ${dungThan[0].toLowerCase()}, your fame will shine with Useful God ${dungThan.join(", ")}.`}
${language === "vi" ? `Đề xuất: Sử dụng màu ${dungThan.includes("Mộc") ? "xanh lá cây" : dungThan.includes("Hỏa") ? "đỏ, cam" : dungThan.includes("Thổ") ? "vàng, nâu" : dungThan.includes("Kim") ? "trắng, bạc" : "xanh dương"}, vật phẩm như ${dungThan.includes("Mộc") ? "ngọc bích" : dungThan.includes("Hỏa") ? "thạch anh hồng" : dungThan.includes("Thổ") ? "thạch anh vàng" : dungThan.includes("Kim") ? "đá mặt trăng" : "lapis lazuli"}, và hướng ${dungThan.includes("Mộc") ? "Đông" : dungThan.includes("Hỏa") ? "Nam" : dungThan.includes("Thổ") ? "Đông Bắc" : dungThan.includes("Kim") ? "Tây" : "Bắc"}.` : `Suggestions: Use colors like ${dungThan.includes("Mộc") ? "green" : dungThan.includes("Hỏa") ? "red, orange" : dungThan.includes("Thổ") ? "yellow, brown" : dungThan.includes("Kim") ? "white, silver" : "blue"}, items like ${dungThan.includes("Mộc") ? "jade" : dungThan.includes("Hỏa") ? "rose quartz" : dungThan.includes("Thổ") ? "citrine" : dungThan.includes("Kim") ? "moonstone" : "lapis lazuli"}, and direction ${dungThan.includes("Mộc") ? "East" : dungThan.includes("Hỏa") ? "South" : dungThan.includes("Thổ") ? "Northeast" : dungThan.includes("Kim") ? "West" : "North"}.`}
`;
  } else if (isProperty) {
    response += `
${language === "vi" ? "Tài sản:" : "Property:"}
${language === "vi" ? `Như ${canNguHanh[nhatChu].toLowerCase()} cần ${dungThan[0].toLowerCase()} để phát triển, tài sản của bạn sẽ vững mạnh khi có Dụng Thần ${dungThan.join(", ")}.` : `As ${canNguHanh[nhatChu].toLowerCase()} needs ${dungThan[0].toLowerCase()} to grow, your property will thrive with Useful God ${dungThan.join(", ")}.`}
${language === "vi" ? `Đề xuất: Sử dụng màu ${dungThan.includes("Mộc") ? "xanh lá cây" : dungThan.includes("Hỏa") ? "đỏ, cam" : dungThan.includes("Thổ") ? "vàng, nâu" : dungThan.includes("Kim") ? "trắng, bạc" : "xanh dương"}, vật phẩm như ${dungThan.includes("Mộc") ? "ngọc bích" : dungThan.includes("Hỏa") ? "thạch anh hồng" : dungThan.includes("Thổ") ? "thạch anh vàng" : dungThan.includes("Kim") ? "đá mặt trăng" : "lapis lazuli"}, và hướng ${dungThan.includes("Mộc") ? "Đông" : dungThan.includes("Hỏa") ? "Nam" : dungThan.includes("Thổ") ? "Đông Bắc" : dungThan.includes("Kim") ? "Tây" : "Bắc"}.` : `Suggestions: Use colors like ${dungThan.includes("Mộc") ? "green" : dungThan.includes("Hỏa") ? "red, orange" : dungThan.includes("Thổ") ? "yellow, brown" : dungThan.includes("Kim") ? "white, silver" : "blue"}, items like ${dungThan.includes("Mộc") ? "jade" : dungThan.includes("Hỏa") ? "rose quartz" : dungThan.includes("Thổ") ? "citrine" : dungThan.includes("Kim") ? "moonstone" : "lapis lazuli"}, and direction ${dungThan.includes("Mộc") ? "East" : dungThan.includes("Hỏa") ? "South" : dungThan.includes("Thổ") ? "Northeast" : dungThan.includes("Kim") ? "West" : "North"}.`}
`;
  } else if (isDanger) {
    response += `
${language === "vi" ? "Rủi ro/Tai nạn:" : "Danger/Accident:"}
${language === "vi" ? `Như ${canNguHanh[nhatChu].toLowerCase()} cần ${dungThan[0].toLowerCase()} để bảo vệ, bạn có thể giảm thiểu rủi ro bằng cách cân bằng ngũ hành với Dụng Thần ${dungThan.join(", ")}.` : `As ${canNguHanh[nhatChu].toLowerCase()} needs ${dungThan[0].toLowerCase()} for protection, you can mitigate risks by balancing the Five Elements with Useful God ${dungThan.join(", ")}.`}
${language === "vi" ? `Đề xuất: Sử dụng màu ${dungThan.includes("Mộc") ? "xanh lá cây" : dungThan.includes("Hỏa") ? "đỏ, cam" : dungThan.includes("Thổ") ? "vàng, nâu" : dungThan.includes("Kim") ? "trắng, bạc" : "xanh dương"}, vật phẩm như ${dungThan.includes("Mộc") ? "ngọc bích" : dungThan.includes("Hỏa") ? "thạch anh hồng" : dungThan.includes("Thổ") ? "thạch anh vàng" : dungThan.includes("Kim") ? "đá mặt trăng" : "lapis lazuli"}, và hướng ${dungThan.includes("Mộc") ? "Đông" : dungThan.includes("Hỏa") ? "Nam" : dungThan.includes("Thổ") ? "Đông Bắc" : dungThan.includes("Kim") ? "Tây" : "Bắc"}. Tránh hành động mạo hiểm và kiểm tra an toàn thường xuyên.` : `Suggestions: Use colors like ${dungThan.includes("Mộc") ? "green" : dungThan.includes("Hỏa") ? "red, orange" : dungThan.includes("Thổ") ? "yellow, brown" : dungThan.includes("Kim") ? "white, silver" : "blue"}, items like ${dungThan.includes("Mộc") ? "jade" : dungThan.includes("Hỏa") ? "rose quartz" : dungThan.includes("Thổ") ? "citrine" : dungThan.includes("Kim") ? "moonstone" : "lapis lazuli"}, and direction ${dungThan.includes("Mộc") ? "East" : dungThan.includes("Hỏa") ? "South" : dungThan.includes("Thổ") ? "Northeast" : dungThan.includes("Kim") ? "West" : "North"}. Avoid risky actions and regularly check safety measures.`}
`;
  } else if (isYear) {
    const yearMatch = userInput.match(/nam\s+(\d{4})|year\s+(\d{4})/i);
    const year = yearMatch ? parseInt(yearMatch[1] || yearMatch[2]) : new Date().getFullYear();
    const yearAnalysis = analyzeYear(year, tuTru, nguHanhCount, thapThanResults, dungThan);
    response += `
${language === "vi" ? `Dự đoán năm ${year}:` : `Prediction for year ${year}:`}
${yearAnalysis[language]}
`;
  }

  return {
    answer: response.trim(),
    warning: null
  };
};

// Main endpoint
app.post("/api/ask", async (req, res) => {
  try {
    const { tuTru, userInput, messages, language = "vi" } = req.body;
    if (!tuTru || !userInput) {
      return res.status(400).json({ error: "Missing Four Pillars or user input" });
    }

    // Validate and normalize Four Pillars
    const normalizedTuTru = {
      gio: normalizeCanChi(tuTru.gio),
      ngay: normalizeCanChi(tuTru.ngay),
      thang: normalizeCanChi(tuTru.thang),
      nam: normalizeCanChi(tuTru.nam)
    };

    if (!normalizedTuTru.gio || !normalizedTuTru.ngay || !normalizedTuTru.thang || !normalizedTuTru.nam) {
      return res.status(400).json({ error: "Invalid Four Pillars input" });
    }

    // Analyze Five Elements
    const nguHanhData = analyzeNguHanh(normalizedTuTru);
    const strongestElement = Object.entries(nguHanhData.count).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    const weakestElement = Object.entries(nguHanhData.count).reduce((a, b) => a[1] < b[1] ? a : b)[0];
    const dungThan = ["Mộc", "Hỏa", "Thổ", "Kim", "Thủy"].filter(h => h !== strongestElement && h !== weakestElement).slice(0, 2);

    // Calculate Ten Gods
    const nhatChu = normalizedTuTru.ngay.split(" ")[0];
    const thapThanResults = tinhThapThan(nhatChu, normalizedTuTru);

    // Generate response
    const response = generateResponse(normalizedTuTru, nguHanhData, thapThanResults, dungThan, userInput, messages, language);

    res.json({
      answer: response.answer,
      warning: response.warning
    });
  } catch (error) {
    console.error("Error processing request:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
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

