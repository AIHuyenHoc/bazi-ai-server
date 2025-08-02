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
  "Giáp Dần", "Ất Mão", "Bính Thìn", "Đinh Tỵ", "Mậu Ngọ", "Kỷ Mùi", "Canh Thân", "Tân Dậu", "Nhâm Tuất", "Quý Hợi",
  "Giáp Tý", "Ất Sửu", "Bính Dần", "Đinh Mão", "Mậu Thìn", "Kỷ Tỵ", "Canh Ngọ", "Tân Mùi", "Nhâm Thân", "Quý Dậu"
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
  const nhatChi = tuTru.ngay?.split(" ")[1];
  const branches = [
    tuTru.nam?.split(" ")[1], tuTru.thang?.split(" ")[1],
    tuTru.ngay?.split(" ")[1], tuTru.gio?.split(" ")[1]
  ].filter(Boolean);

  if (!nhatChu || !nhatChi || !branches.length) {
    throw new Error("Invalid nhatChu, nhatChi, or branches");
  }

  const tuongTinh = {
    Thân: ["Tý"], Tý: ["Tý"], Thìn: ["Tý"],
    Tỵ: ["Dậu"], Dậu: ["Dậu"], Sửu: ["Dậu"],
    Dần: ["Ngọ"], Ngọ: ["Ngọ"], Tuất: ["Ngọ"],
    Hợi: ["Mão"], Mão: ["Mão"], Mùi: ["Mão"]
  };

  const thienAtQuyNhan = {
    Giáp: ["Sửu", "Mùi"], Mậu: ["Sửu", "Mùi"], Canh: ["Sửu", "Mùi"],
    Ất: ["Thân", "Tý"], Kỷ: ["Thân", "Tý"],
    Bính: ["Dậu", "Hợi"], Đinh: ["Dậu", "Hợi"],
    Tân: ["Dần", "Ngọ"],
    Nhâm: ["Tỵ", "Mão"], Quý: ["Tỵ", "Mão"]
  };

  const vanXuong = {
    Giáp: ["Tỵ"], Ất: ["Ngọ"], Bính: ["Thân"], Đinh: ["Dậu"],
    Mậu: ["Thân"], Kỷ: ["Dậu"], Canh: ["Hợi"], Tân: ["Tý"],
    Nhâm: ["Dần"], Quý: ["Mão"]
  };

  const daoHoa = {
    Thân: ["Dậu"], Tý: ["Dậu"], Thìn: ["Dậu"],
    Tỵ: ["Ngọ"], Dậu: ["Ngọ"], Sửu: ["Ngọ"],
    Dần: ["Mão"], Ngọ: ["Mão"], Tuất: ["Mão"],
    Hợi: ["Tý"], Mão: ["Tý"], Mùi: ["Tý"]
  };

  const dichMa = {
    Thân: ["Dần"], Tý: ["Dần"], Thìn: ["Dần"],
    Tỵ: ["Hợi"], Dậu: ["Hợi"], Sửu: ["Hợi"],
    Dần: ["Thân"], Ngọ: ["Thân"], Tuất: ["Thân"],
    Hợi: ["Tỵ"], Mão: ["Tỵ"], Mùi: ["Tỵ"]
  };

  const coThanQuaTu = {
    Tý: ["Dần", "Tuất"], Sửu: ["Dần", "Tuất"], Hợi: ["Dần", "Tuất"],
    Dần: ["Tỵ", "Sửu"], Mão: ["Tỵ", "Sửu"], Thìn: ["Tỵ", "Sửu"],
    Tỵ: ["Thân", "Thìn"], Ngọ: ["Thân", "Thìn"], Mùi: ["Thân", "Thìn"],
    Thân: ["Hợi", "Mùi"], Dậu: ["Hợi", "Mùi"], Tuất: ["Hợi", "Mùi"]
  };

  const kiepSat = {
    Thân: ["Tỵ"], Tý: ["Tỵ"], Thìn: ["Tỵ"],
    Tỵ: ["Dần"], Dậu: ["Dần"], Sửu: ["Dần"],
    Dần: ["Hợi"], Ngọ: ["Hợi"], Tuất: ["Hợi"],
    Hợi: ["Thân"], Mão: ["Thân"], Mùi: ["Thân"]
  };

  const khongVongMap = {
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
    "Tướng Tinh": { vi: "Tướng Tinh", en: "General Star", value: tuongTinh[nhatChi]?.filter(chi => branches.includes(chi)) || [] },
    "Thiên Ất Quý Nhân": { vi: "Thiên Ất Quý Nhân", en: "Nobleman Star", value: thienAtQuyNhan[nhatChu]?.filter(chi => branches.includes(chi)) || [] },
    "Văn Xương": { vi: "Văn Xương", en: "Literary Star", value: vanXuong[nhatChu]?.filter(chi => branches.includes(chi)) || [] },
    "Đào Hoa": { vi: "Đào Hoa", en: "Peach Blossom", value: daoHoa[nhatChi]?.filter(chi => branches.includes(chi)) || [] },
    "Dịch Mã": { vi: "Dịch Mã", en: "Traveling Horse", value: dichMa[nhatChi]?.filter(chi => branches.includes(chi)) || [] },
    "Cô Thần Quả Tú": { vi: "Cô Thần Quả Tú", en: "Loneliness Star", value: coThanQuaTu[nhatChi]?.filter(chi => branches.includes(chi)) || [] },
    "Kiếp Sát": { vi: "Kiếp Sát", en: "Robbery Star", value: kiepSat[nhatChi]?.filter(chi => branches.includes(chi)) || [] },
    "Không Vong": { vi: "Không Vong", en: "Void Star", value: khongVongMap[tuTru.ngay]?.filter(chi => branches.includes(chi)) || [] }
  };
};

const dayMasterDescriptions = {
  Mộc: {
    vi: "Như cây xanh vươn cao đón nắng, bạn tràn đầy sức sống, sáng tạo, và linh hoạt. Bạn yêu thích khám phá và không ngại thử thách, nhưng đôi khi cần thời gian để ổn định cảm xúc.",
    en: "Like a tree reaching for sunlight, you are vibrant, creative, and adaptable. You thrive on exploration and challenges but may need moments to ground your emotions"
  },
  Hỏa: {
    vi: "Như ngọn lửa rực rỡ soi sáng màn đêm, bạn bừng cháy với đam mê và nhiệt huyết, dễ truyền cảm hứng nhưng cần kiểm soát sự bốc đồng.",
    en: "Like a blazing fire illuminating the night, you burn with passion and enthusiasm, inspiring others but needing to manage impulsiveness"
  },
  Thổ: {
    vi: "Như ngọn núi vững chãi giữa đất trời, bạn đáng tin cậy, kiên định và thực tế, nhưng đôi khi cần mở lòng để đón nhận thay đổi.",
    en: "Like a steadfast mountain under the sky, you are reliable, resolute, and practical, yet may need to embrace change more openly"
  },
  Kim: {
    vi: "Như thanh kiếm sắc bén lấp lánh ánh kim, bạn tinh tế, quyết tâm và chính trực, nhưng cần cân bằng giữa lý trí và cảm xúc.",
    en: "Like a gleaming sword shining bright, you are refined, determined, and upright, but need balance between logic and emotion"
  },
  Thủy: {
    vi: "Như dòng sông sâu thẳm chảy không ngừng, bạn thông thái, nhạy bén và sâu sắc, nhưng đôi khi cần kiểm soát dòng cảm xúc mạnh mẽ.",
    en: "Like a deep river flowing endlessly, you are wise, perceptive, and profound, but may need to manage intense emotions"
  }
};

const thapThanEffects = {
  "Tỷ Kiên": { vi: "Tự lập, mạnh mẽ, có khả năng lãnh đạo, thích tự do nhưng cần tránh cố chấp", en: "Independent, strong, with leadership qualities, loves freedom but should avoid stubbornness" },
  "Kiếp Tài": { vi: "Quyết đoán, dám mạo hiểm, tài năng nhưng dễ bốc đồng trong quan hệ", en: "Decisive, daring, talented but prone to impulsiveness in relationships" },
  "Thực Thần": { vi: "Sáng tạo, nghệ thuật, yêu thích tự do, có gu thẩm mỹ tinh tế", en: "Creative, artistic, freedom-loving, with refined aesthetic taste" },
  "Thương Quan": { vi: "Tư duy sắc bén, dũng cảm, giỏi diễn đạt, phù hợp với sáng tạo", en: "Sharp-minded, courageous, expressive, suited for creative fields" },
  "Chính Tài": { vi: "Giỏi quản lý tài chính, thận trọng, giỏi tích lũy tài sản", en: "Skilled in financial management, cautious, adept at accumulating wealth" },
  "Thiên Tài": { vi: "Nhạy bén, sáng tạo, linh hoạt, giỏi kiếm tiền từ ý tưởng độc đáo", en: "Perceptive, creative, flexible, skilled at earning from unique ideas" },
  "Chính Quan": { vi: "Trách nhiệm, uy tín, đáng tin cậy, phù hợp với vai trò lãnh đạo", en: "Responsible, reputable, trustworthy, suited for leadership roles" },
  "Thất Sát": { vi: "Dũng cảm, quyết liệt, kiên cường, nhưng cần kiểm soát tính bốc đồng", en: "Courageous, assertive, resilient, but needs to control impulsiveness" },
  "Chính Ấn": { vi: "Trí tuệ, học vấn, tư duy logic, thích nghiên cứu và học hỏi", en: "Wise, scholarly, logical, enjoys research and learning" },
  "Thiên Ấn": { vi: "Sáng tạo, tư duy độc đáo, trực giác mạnh, phù hợp với nghệ thuật", en: "Creative, unique thinking, strong intuition, suited for artistic pursuits" }
};

const determineQuestionType = (userInput, language) => {
  const normalizedInput = typeof userInput === "string" ? userInput.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
  const keywords = {
    isMoney: {
      vi: ["tien bac", "tai chinh", "tai loc", "lam giau", "kinh doanh", "dau tu", "thu nhap", "cua cai", "loi nhuan", "von"],
      en: ["money", "finance", "wealth", "riches", "investment", "business", "income", "profit", "capital", "earnings"],
      not: ["tai nan", "accident"]
    },
    isCareer: {
      vi: ["nghe", "cong viec", "su nghiep", "viec lam", "chuc vu", "thang chuc", "nghe nghiep", "lam viec", "co hoi viec", "chuyen mon"],
      en: ["career", "job", "work", "profession", "employment", "promotion", "occupation", "business", "opportunity", "skill"]
    },
    isFame: {
      vi: ["cong danh", "danh tieng", "ten tuoi", "uy tin", "thanh tuu", "noi tieng", "danh vong", "thanh cong", "truyen thong", "quang cao"],
      en: ["fame", "reputation", "prestige", "success", "achievement", "recognition", "popularity", "status", "celebrity", "publicity"]
    },
    isHealth: {
      vi: ["suc khoe", "benh tat", "sang khoe", "the luc", "tri benh", "benh", "khoe manh", "y te", "phuc hoi", "the chat"],
      en: ["health", "illness", "wellness", "sickness", "disease", "recovery", "fitness", "medical", "vitality", "strength"]
    },
    isLove: {
      vi: ["tinh duyen", "tinh yeu", "hon nhan", "vo chong", "tinh cam", "ket hon", "doi lua", "lang man", "ban doi", "hanh phuc"],
      en: ["love", "marriage", "romance", "relationship", "partner", "spouse", "dating", "affection", "soulmate", "happiness"]
    },
    isFamily: {
      vi: ["gia dao", "gia dinh", "ho gia", "than nhan", "gia can", "cha me", "anh em", "vo chong", "gia toc", "hanh phuc"],
      en: ["family", "household", "kin", "relatives", "parents", "siblings", "spouse", "clan", "home", "harmony"]
    },
    isChildren: {
      vi: ["con cai", "con", "tre con", "con nho", "nuoi day", "con trai", "con gai", "sinh con", "gia dinh", "cha me"],
      en: ["children", "kids", "offspring", "son", "daughter", "parenting", "child", "family", "birth", "raising"]
    },
    isProperty: {
      vi: ["tai san", "dat dai", "nha cua", "bat dong san", "so huu", "mua ban", "nha dat", "von", "tai nguyen", "dau tu"],
      en: ["property", "real estate", "land", "house", "asset", "ownership", "buying", "selling", "resources", "investment"]
    },
    isDanger: {
      vi: ["tai nan", "nguy hiem", "rui ro", "an toan", "tai hoa", "hoan nan", "kho khan", "de phong", "phong tranh", "bao ve"],
      en: ["accident", "danger", "risk", "safety", "hazard", "trouble", "crisis", "caution", "prevention", "protection"]
    },
    isYear: {
      vi: ["nam", "sang nam", "tuong lai", "nam toi", "nam sau", "luu nien", "van menh", "tram nam", "thoi gian", "nien"],
      en: ["year", "next year", "future", "coming year", "forecast", "annual", "destiny", "time", "period", "cycle"]
    },
    isComplex: {
      vi: ["du doan", "tuong lai", "van menh", "dai van", "toan bo", "tong quan", "chi tiet", "tat ca", "toan dien", "tron doi"],
      en: ["predict", "future", "destiny", "life path", "overall", "general", "detailed", "complete", "comprehensive", "lifetime"]
    },
    isThapThan: {
      vi: ["thap than", "mười than", "than tai", "ty kien", "thuc than", "thien tai", "chinh quan", "thien an", "chinh an", "that sat"],
      en: ["ten gods", "ten deities", "shoulder", "wealth", "food god", "indirect wealth", "direct officer", "seal", "indirect seal", "seven killings"]
    },
    isThanSat: {
      vi: ["than sat", "sao", "thien at", "dao hoa", "hong loan", "quy nhan", "sao tot", "sao xau", "thien tai", "dia sat"],
      en: ["auspicious stars", "stars", "nobleman", "peach blossom", "red phoenix", "benefactor", "good stars", "bad stars", "heavenly star", "earthly star"]
    }
  };

  const types = {};
  for (const [type, { vi, en, not = [] }] of Object.entries(keywords)) {
    const viMatch = vi.some(keyword => normalizedInput.includes(keyword));
    const enMatch = en.some(keyword => normalizedInput.includes(keyword));
    const notMatch = not.some(keyword => normalizedInput.includes(keyword));
    types[type] = (viMatch || enMatch) && !notMatch;
  }
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
    vi: `Năm ${year} (${can} ${chi}): ${nguHanhYear.can} (${canThapThan}), ${nguHanhYear.chi} (${chiThapThan}). ${isFavorable ? `Hỗ trợ Dụng Thần ${dungThan.join(", ")}, mang cơ hội trong sự nghiệp và mối quan hệ.` : `Cần cân bằng với ${dungThan.join(", ")} để giảm áp lực và tận dụng cơ hội.`}`,
    en: `Year ${year} (${can} ${chi}): ${nguHanhYear.can} (${canThapThan}), ${nguHanhYear.chi} (${chiThapThan}). ${isFavorable ? `Supports Useful God ${dungThan.join(", ")}, bringing opportunities in career and relationships.` : `Balance with ${dungThan.join(", ")} to reduce pressure and seize opportunities.`}`
  };
  return analysis;
};

const determineDungThan = (nguHanhCount, nhatChu) => {
  const sortedElements = Object.entries(nguHanhCount).sort((a, b) => b[1] - a[1]);
  const strongest = sortedElements[0][0];
  const weakest = sortedElements[sortedElements.length - 1][0];
  const canNguHanh = { Giáp: "Mộc", Ất: "Mộc", Bính: "Hỏa", Đinh: "Hỏa", Mậu: "Thổ", Kỷ: "Thổ", Canh: "Kim", Tân: "Kim", Nhâm: "Thủy", Quý: "Thủy" };
  const nhatChuHanh = canNguHanh[nhatChu];
  const balanceMap = {
    Mộc: { vượng: ["Hỏa", "Thủy"], nhược: ["Mộc", "Thủy"] },
    Hỏa: { vượng: ["Thổ", "Mộc"], nhược: ["Hỏa", "Mộc"] },
    Thổ: { vượng: ["Kim", "Hỏa"], nhược: ["Thổ", "Hỏa"] },
    Kim: { vượng: ["Thủy", "Thổ"], nhược: ["Kim", "Thổ"] },
    Thủy: { vượng: ["Mộc", "Kim"], nhược: ["Thủy", "Kim"] }
  };

  const isVượng = nguHanhCount[nhatChuHanh] >= 2.5 || (nguHanhCount[nhatChuHanh] >= 2.0 && nguHanhCount[balanceMap[nhatChuHanh].vượng[0]] >= 2.0);
  return isVượng ? balanceMap[nhatChuHanh].vượng : balanceMap[nhatChuHanh].nhược;
};

const generateResponse = (tuTru, nguHanhCount, thapThanResults, thanSatResults, dungThan, userInput, messages, language) => {
  const totalElements = Object.values(nguHanhCount).reduce((a, b) => a + b, 0);
  const tyLeNguHanh = Object.fromEntries(
    Object.entries(nguHanhCount).map(([k, v]) => [k, Math.round((v / totalElements) * 100)])
  );
  const nhatChu = tuTru.ngay.split(" ")[0];
  const canNguHanh = {
    Giáp: "Mộc", Ất: "Mộc", Bính: "Hỏa", Đinh: "Hỏa", Mậu: "Thổ",
    Kỷ: "Thổ", Canh: "Kim", Tân: "Kim", Nhâm: "Thủy", Quý: "Thủy"
  };

  const { isGeneral, isMoney, isCareer, isFame, isHealth, isLove, isFamily, isChildren, isProperty, isDanger, isYear, isComplex, isThapThan, isThanSat } = determineQuestionType(userInput, language);

  if (isComplex) {
    return `${language === "vi" ? "Vui lòng gửi câu hỏi qua app.aihuyenhoc@gmail.com" : "Please send questions to app.aihuyenhoc@gmail.com"}`;
  }

  let response = `${language === "vi" ? "Luận giải Bát Tự:\n" : "Bazi Interpretation:\n"}`;

  if (isGeneral) {
    response += `
${language === "vi" ? `
### Nhật Chủ và Tính Cách
Nhật Chủ ${nhatChu} (${canNguHanh[nhatChu]}): ${dayMasterDescriptions[canNguHanh[nhatChu]].vi}
Tứ Trụ: Giờ ${tuTru.gio}, Ngày ${tuTru.ngay}, Tháng ${tuTru.thang}, Năm ${tuTru.nam}
Ngũ Hành: ${Object.entries(tyLeNguHanh).map(([k, v]) => `${k}: ${v}% (${v >= 30 ? "mạnh" : v <= 15 ? "yếu" : "trung bình"})`).join(", ")}
### Sự Nghiệp và Định Hướng
Thập Thần: ${Object.entries(thapThanResults).map(([k, v]) => `${k}: ${v}`).join(", ") || "Không có"}
Phù hợp với các ngành nghề như ${dungThan.includes("Mộc") ? "giáo dục, thiết kế" : dungThan.includes("Hỏa") ? "truyền thông, nghệ thuật" : dungThan.includes("Thổ") ? "xây dựng, bất động sản" : dungThan.includes("Kim") ? "công nghệ, kỹ thuật" : "thương mại, tư vấn"} nhờ Dụng Thần ${dungThan.join(", ")}.
### Tình Duyên và Mối Quan Hệ
Thần Sát: ${Object.entries(thanSatResults).map(([k, v]) => `${v.vi}: ${v.value.join(", ") || "Không có"}`).join("; ")}
Hợp với người ${dungThan.includes("Mộc") ? "sáng tạo, linh hoạt" : dungThan.includes("Hỏa") ? "đam mê, năng động" : dungThan.includes("Thổ") ? "ổn định, thực tế" : dungThan.includes("Kim") ? "tinh tế, chính trực" : "thông thái, sâu sắc"}.
### Sở Thích và Đam Mê
Dựa trên ${dungThan[0]}, bạn có thể yêu thích ${dungThan.includes("Mộc") ? "viết lách, nghệ thuật, khám phá thiên nhiên" : dungThan.includes("Hỏa") ? "nghệ thuật, biểu diễn, truyền cảm hứng" : dungThan.includes("Thổ") ? "làm vườn, nghiên cứu lịch sử" : dungThan.includes("Kim") ? "công nghệ, thủ công tinh xảo" : "triết học, nghiên cứu sâu sắc"}.
### Dự Đoán Tương Lai (2026-2030)
Từ 2026-2030, Dụng Thần ${dungThan.join(", ")} sẽ mang cơ hội trong sự nghiệp và mối quan hệ. Năm ${dungThan.includes("Hỏa") ? "2026 (Bính Ngọ)" : "2027 (Đinh Mùi)"} sẽ là thời điểm nổi bật.
### Lời Khuyên
Sử dụng màu sắc ${dungThan.includes("Mộc") ? "xanh lá cây, gỗ" : dungThan.includes("Hỏa") ? "đỏ, cam" : dungThan.includes("Thổ") ? "nâu, vàng đất" : dungThan.includes("Kim") ? "trắng, bạc" : "xanh dương, đen"} và vật phẩm như ${dungThan.includes("Mộc") ? "ngọc bích, gỗ" : dungThan.includes("Hỏa") ? "thạch anh hồng, đá ruby" : dungThan.includes("Thổ") ? "đá thạch anh vàng, gốm" : dungThan.includes("Kim") ? "trang sức bạc, thép" : "thủy tinh, sapphire"} để tăng cường vận may.
` : `
### Day Master and Personality
Day Master ${nhatChu} (${canNguHanh[nhatChu]}): ${dayMasterDescriptions[canNguHanh[nhatChu]].en}
Four Pillars: Hour ${tuTru.gio}, Day ${tuTru.ngay}, Month ${tuTru.thang}, Year ${tuTru.nam}
Five Elements: ${Object.entries(tyLeNguHanh).map(([k, v]) => `${k}: ${v}% (${v >= 30 ? "strong" : v <= 15 ? "weak" : "balanced"})`).join(", ")}
### Career and Direction
Ten Gods: ${Object.entries(thapThanResults).map(([k, v]) => `${k}: ${v}`).join(", ") || "None"}
Suited for careers like ${dungThan.includes("Mộc") ? "education, design" : dungThan.includes("Hỏa") ? "media, arts" : dungThan.includes("Thổ") ? "construction, real estate" : dungThan.includes("Kim") ? "tech, engineering" : "trade, consulting"} thanks to Useful God ${dungThan.join(", ")}.
### Love and Relationships
Auspicious Stars: ${Object.entries(thanSatResults).map(([k, v]) => `${v.en}: ${v.value.join(", ") || "None"}`).join("; ")}
Compatible with partners who are ${dungThan.includes("Mộc") ? "creative, adaptable" : dungThan.includes("Hỏa") ? "passionate, energetic" : dungThan.includes("Thổ") ? "stable, practical" : dungThan.includes("Kim") ? "refined, upright" : "wise, profound"}.
### Passions and Interests
Based on ${dungThan[0]}, you may enjoy ${dungThan.includes("Mộc") ? "writing, arts, nature exploration" : dungThan.includes("Hỏa") ? "arts, performance, inspiring others" : dungThan.includes("Thổ") ? "gardening, historical research" : dungThan.includes("Kim") ? "technology, fine crafts" : "philosophy, deep research"}.
### Future Outlook (2026-2030)
From 2026-2030, Useful God ${dungThan.join(", ")} will bring opportunities in career and relationships. The year ${dungThan.includes("Hỏa") ? "2026 (Bing Horse)" : "2027 (Ding Goat)"} will be significant.
### Advice
Use colors ${dungThan.includes("Mộc") ? "green, wood" : dungThan.includes("Hỏa") ? "red, orange" : dungThan.includes("Thổ") ? "brown, earthy tones" : dungThan.includes("Kim") ? "white, silver" : "blue, black"} and items like ${dungThan.includes("Mộc") ? "jade, wooden objects" : dungThan.includes("Hỏa") ? "rose quartz, ruby" : dungThan.includes("Thổ") ? "citrine, ceramics" : dungThan.includes("Kim") ? "silver jewelry, steel" : "glass, sapphire"} to enhance luck.
`}
`;
  }

  if (isMoney) {
    const chinhTai = thapThanResults["Kỷ"] || thapThanResults["Mậu"] || "Không nổi bật";
    response += `
${language === "vi" ? `
### Tài Lộc
Chính Tài/Thiên Tài (${chinhTai}): Bạn có khả năng quản lý tài chính tốt, đặc biệt trong các lĩnh vực sáng tạo hoặc đầu tư. ${dungThan[0]} mạnh sẽ thúc đẩy tài lộc. Năm 2026 mang cơ hội qua các dự án liên quan đến ${dungThan[0]}.
### Lời Khuyên
Tập trung vào các cơ hội đầu tư liên quan đến ${dungThan.includes("Mộc") ? "giáo dục, công nghệ xanh" : dungThan.includes("Hỏa") ? "nghệ thuật, truyền thông" : dungThan.includes("Thổ") ? "bất động sản, nông nghiệp" : dungThan.includes("Kim") ? "công nghệ, tài chính" : "thương mại, vận tải"}; sử dụng màu ${dungThan.includes("Mộc") ? "xanh lá" : dungThan.includes("Hỏa") ? "đỏ" : dungThan.includes("Thổ") ? "nâu" : dungThan.includes("Kim") ? "trắng" : "xanh dương"}.
` : `
### Wealth
Direct/Indirect Wealth (${chinhTai}): You excel in financial management, especially in creative or investment fields. Strong ${dungThan[0]} boosts wealth. 2026 brings opportunities via ${dungThan[0]}-related projects.
### Advice
Focus on investments in ${dungThan.includes("Mộc") ? "education, green tech" : dungThan.includes("Hỏa") ? "arts, media" : dungThan.includes("Thổ") ? "real estate, agriculture" : dungThan.includes("Kim") ? "tech, finance" : "trade, transport"}; use ${dungThan.includes("Mộc") ? "green" : dungThan.includes("Hỏa") ? "red" : dungThan.includes("Thổ") ? "brown" : dungThan.includes("Kim") ? "white" : "blue"}.
`}
`;
  }

  if (isCareer) {
    const tyKien = thapThanResults["Canh"] || thapThanResults["Tân"] || "Không nổi bật";
    const chinhAn = thapThanResults["Tý"] || thapThanResults["Hợi"] || "Không nổi bật";
    response += `
${language === "vi" ? `
### Sự Nghiệp và Định Hướng
Tỷ Kiên (${tyKien}), Chính Ấn (${chinhAn}): Phù hợp với các ngành nghề tự do, sáng tạo như ${dungThan.includes("Mộc") ? "giáo dục, thiết kế" : dungThan.includes("Hỏa") ? "truyền thông, nghệ thuật" : dungThan.includes("Thổ") ? "xây dựng, bất động sản" : dungThan.includes("Kim") ? "công nghệ, kỹ thuật" : "thương mại, tư vấn"}. Dụng Thần ${dungThan[0]} hỗ trợ thăng tiến dài hạn.
### Lời Khuyên
Phát triển kỹ năng lãnh đạo và tận dụng ${dungThan[0]} để xây dựng mạng lưới quan hệ.
` : `
### Career and Direction
Shoulder-to-Shoulder (${tyKien}), Direct Seal (${chinhAn}): Suited for independent, creative fields like ${dungThan.includes("Mộc") ? "education, design" : dungThan.includes("Hỏa") ? "media, arts" : dungThan.includes("Thổ") ? "construction, real estate" : dungThan.includes("Kim") ? "tech, engineering" : "trade, consulting"}. Useful God ${dungThan[0]} supports long-term advancement.
### Advice
Develop leadership skills and leverage ${dungThan[0]} for networking.
`}
`;
  }

  if (isFame) {
    response += `
${language === "vi" ? `
### Công Danh
Chính Ấn và Thực Thần hỗ trợ danh tiếng trong các lĩnh vực trí tuệ, sáng tạo. Dụng Thần ${dungThan[0]} giúp bạn tỏa sáng từ 2026-2030.
### Lời Khuyên
Xây dựng thương hiệu cá nhân qua ${dungThan.includes("Mộc") ? "sáng tạo nội dung" : dungThan.includes("Hỏa") ? "truyền thông" : dungThan.includes("Thổ") ? "góp phần cộng đồng" : dungThan.includes("Kim") ? "chuyên môn kỹ thuật" : "giao tiếp xã hội"}.
` : `
### Fame
Direct Seal and Food God support fame in intellectual, creative fields. Useful God ${dungThan[0]} boosts recognition from 2026-2030.
### Advice
Build your personal brand through ${dungThan.includes("Mộc") ? "content creation" : dungThan.includes("Hỏa") ? "media" : dungThan.includes("Thổ") ? "community contributions" : dungThan.includes("Kim") ? "technical expertise" : "social engagement"}.
`}
`;
  }

  if (isHealth) {
    const weakestElement = Object.entries(nguHanhCount).sort((a, b) => a[1] - b[1])[0][0];
    response += `
${language === "vi" ? `
### Sức Khỏe
${weakestElement} yếu, cần bổ sung ${dungThan[0]} để cân bằng cơ thể và tinh thần. Chú ý ${weakestElement === "Thủy" ? "hệ thần kinh, thận" : weakestElement === "Mộc" ? "gan, mật" : weakestElement === "Hỏa" ? "tim mạch, mắt" : weakestElement === "Thổ" ? "tiêu hóa, dạ dày" : "hô hấp, phổi"}.
### Lời Khuyên
Tập yoga, thiền; sử dụng màu ${dungThan.includes("Mộc") ? "xanh lá" : dungThan.includes("Hỏa") ? "đỏ" : dungThan.includes("Thổ") ? "nâu" : dungThan.includes("Kim") ? "trắng" : "xanh dương"} để thư giãn.
` : `
### Health
${weakestElement} is weak, strengthen ${dungThan[0]} for physical and mental balance. Focus on ${weakestElement === "Thủy" ? "nervous system, kidneys" : weakestElement === "Mộc" ? "liver, gallbladder" : weakestElement === "Hỏa" ? "cardiovascular, eyes" : weakestElement === "Thổ" ? "digestion, stomach" : "respiratory system, lungs"}.
### Advice
Practice yoga, meditation; use ${dungThan.includes("Mộc") ? "green" : dungThan.includes("Hỏa") ? "red" : dungThan.includes("Thổ") ? "brown" : dungThan.includes("Kim") ? "white" : "blue"} for relaxation.
`}
`;
  }

  if (isLove) {
    const thienTai = thapThanResults["Đinh"] || thapThanResults["Bính"] || "Không nổi bật";
    const daoHoa = thanSatResults["Đào Hoa"].value.length ? "Có Đào Hoa" : "Không có Đào Hoa";
    response += `
${language === "vi" ? `
### Tình Duyên
Thiên Tài (${thienTai}): Hợp với người ${dungThan.includes("Mộc") ? "sáng tạo, linh hoạt" : dungThan.includes("Hỏa") ? "đam mê, năng động" : dungThan.includes("Thổ") ? "ổn định, thực tế" : dungThan.includes("Kim") ? "tinh tế, chính trực" : "thông thái, sâu sắc"}. ${daoHoa}. Dụng Thần ${dungThan[0]} giúp ổn định tình cảm từ 2026.
### Lời Khuyên
Nếu bạn chưa có người yêu, hãy đặt vật phẩm phong thủy ở ${thanSatResults["Đào Hoa"].value.includes("Ngọ") ? "hướng nam" : thanSatResults["Đào Hoa"].value.includes("Tý") ? "hướng bắc" : thanSatResults["Đào Hoa"].value.includes("Mão") ? "hướng đông" : thanSatResults["Đào Hoa"].value.includes("Dậu") ? "hướng tây" : "phòng ngủ"} để kích hoạt Đào Hoa. Mặc màu ${dungThan.includes("Mộc") ? "xanh lá" : dungThan.includes("Hỏa") ? "đỏ" : dungThan.includes("Thổ") ? "nâu" : dungThan.includes("Kim") ? "trắng" : "xanh dương"} để tăng sức hút.
` : `
### Love
Indirect Wealth (${thienTai}): Compatible with ${dungThan.includes("Mộc") ? "creative, adaptable" : dungThan.includes("Hỏa") ? "passionate, energetic" : dungThan.includes("Thổ") ? "stable, practical" : dungThan.includes("Kim") ? "refined, upright" : "wise, profound"} partners. ${daoHoa}. Useful God ${dungThan[0]} stabilizes relationships from 2026.
### Advice
If single, place a feng shui item in ${thanSatResults["Đào Hoa"].value.includes("Ngọ") ? "southern direction" : thanSatResults["Đào Hoa"].value.includes("Tý") ? "northern direction" : thanSatResults["Đào Hoa"].value.includes("Mão") ? "eastern direction" : thanSatResults["Đào Hoa"].value.includes("Dậu") ? "western direction" : "bedroom"} to activate Peach Blossom. Wear ${dungThan.includes("Mộc") ? "green" : dungThan.includes("Hỏa") ? "red" : dungThan.includes("Thổ") ? "brown" : dungThan.includes("Kim") ? "white" : "blue"} to enhance charm.
`}
`;
  }

  if (isFamily) {
    const chinhAn = thapThanResults["Tý"] || thapThanResults["Hợi"] || "Không nổi bật";
    response += `
${language === "vi" ? `
### Gia Đạo
Chính Ấn (${chinhAn}): Gia đạo ổn định nhờ ${dungThan[0]}. Thiên Ất Quý Nhân hỗ trợ hòa hợp gia đình.
### Lời Khuyên
Dành thời gian cho gia đình, sử dụng màu ${dungThan.includes("Mộc") ? "xanh lá" : dungThan.includes("Hỏa") ? "đỏ" : dungThan.includes("Thổ") ? "nâu" : dungThan.includes("Kim") ? "trắng" : "xanh dương"} để tăng hòa khí.
` : `
### Family
Direct Seal (${chinhAn}): Family harmony supported by ${dungThan[0]}. Nobleman Star aids family unity.
### Advice
Spend time with family, use ${dungThan.includes("Mộc") ? "green" : dungThan.includes("Hỏa") ? "red" : dungThan.includes("Thổ") ? "brown" : dungThan.includes("Kim") ? "white" : "blue"} for harmony.
`}
`;
  }

  if (isChildren) {
    const thucThan = thapThanResults["Kỷ"] || thapThanResults["Mậu"] || "Không nổi bật";
    response += `
${language === "vi" ? `
### Con Cái
Thực Thần (${thucThan}): Con cái thông minh, sáng tạo, được hỗ trợ bởi ${dungThan[0]}. Cơ hội tốt từ 2025-2030.
### Lời Khuyên
Khuyến khích con cái phát triển ${dungThan.includes("Mộc") ? "sáng tạo" : dungThan.includes("Hỏa") ? "đam mê" : dungThan.includes("Thổ") ? "tính kiên định" : dungThan.includes("Kim") ? "tính chính trực" : "trí tuệ"}.
` : `
### Children
Food God (${thucThan}): Intelligent, creative children, supported by ${dungThan[0]}. Good prospects from 2025-2030.
### Advice
Encourage children to develop ${dungThan.includes("Mộc") ? "creativity" : dungThan.includes("Hỏa") ? "passion" : dungThan.includes("Thổ") ? "resilience" : dungThan.includes("Kim") ? "integrity" : "wisdom"}.
`}
`;
  }

  if (isProperty) {
    const chinhTai = thapThanResults["Kỷ"] || thapThanResults["Mậu"] || "Không nổi bật";
    response += `
${language === "vi" ? `
### Tài Sản, Đất Đai
Chính Tài (${chinhTai}): Tích lũy tài sản cố định tốt nhờ ${dungThan[0]}. Cơ hội đầu tư bất động sản từ 2026-2030.
### Lời Khuyên
Nghiên cứu kỹ thị trường, hợp tác với chuyên gia ${dungThan.includes("Mộc") ? "môi trường" : dungThan.includes("Hỏa") ? "truyền thông" : dungThan.includes("Thổ") ? "bất động sản" : dungThan.includes("Kim") ? "tài chính" : "vận tải"}.
` : `
### Property, Real Estate
Direct Wealth (${chinhTai}): Strong asset accumulation with ${dungThan[0]}. Real estate opportunities from 2026-2030.
### Advice
Research markets thoroughly, collaborate with ${dungThan.includes("Mộc") ? "environmental" : dungThan.includes("Hỏa") ? "media" : dungThan.includes("Thổ") ? "real estate" : dungThan.includes("Kim") ? "finance" : "transport"} experts.
`}
`;
  }

  if (isDanger) {
    const thucThan = thapThanResults["Kỷ"] || thapThanResults["Mậu"] || "Không nổi bật";
    response += `
${language === "vi" ? `
### Rủi Ro, Tai Nạn
Thực Thần (${thucThan}): ${dungThan[0]} mạnh giúp giảm thiểu rủi ro. Tránh các hoạt động mạo hiểm nếu ${dungThan[0]} yếu.
### Lời Khuyên
Tăng cường an toàn, sử dụng màu ${dungThan.includes("Mộc") ? "xanh lá" : dungThan.includes("Hỏa") ? "đỏ" : dungThan.includes("Thổ") ? "nâu" : dungThan.includes("Kim") ? "trắng" : "xanh dương"} và vật phẩm ${dungThan.includes("Mộc") ? "ngọc bích" : dungThan.includes("Hỏa") ? "đá ruby" : dungThan.includes("Thổ") ? "đá thạch anh vàng" : dungThan.includes("Kim") ? "bạc" : "sapphire"} để bảo vệ.
` : `
### Risk, Accidents
Food God (${thucThan}): Strong ${dungThan[0]} minimizes risks. Avoid reckless activities if ${dungThan[0]} is weak.
### Advice
Enhance safety, use ${dungThan.includes("Mộc") ? "green" : dungThan.includes("Hỏa") ? "red" : dungThan.includes("Thổ") ? "brown" : dungThan.includes("Kim") ? "white" : "blue"} and items like ${dungThan.includes("Mộc") ? "jade" : dungThan.includes("Hỏa") ? "ruby" : dungThan.includes("Thổ") ? "citrine" : dungThan.includes("Kim") ? "silver" : "sapphire"} for protection.
`}
`;
  }

  if (isYear) {
    const yearMatch = userInput.match(/\d{4}/);
    const year = yearMatch ? parseInt(yearMatch[0]) : null;
    if (year) {
      const yearAnalysis = analyzeYear(year, tuTru, nguHanhCount, thapThanResults, dungThan);
      response += `
${language === "vi" ? `
### Dự Đoán Năm ${year}
${yearAnalysis.vi}
### Lời Khuyên
Tận dụng ${dungThan[0]}, tránh xung đột, sử dụng màu ${dungThan.includes("Mộc") ? "xanh lá" : dungThan.includes("Hỏa") ? "đỏ" : dungThan.includes("Thổ") ? "nâu" : dungThan.includes("Kim") ? "trắng" : "xanh dương"}.
` : `
### Forecast for ${year}
${yearAnalysis.en}
### Advice
Leverage ${dungThan[0]}, avoid conflicts, use ${dungThan.includes("Mộc") ? "green" : dungThan.includes("Hỏa") ? "red" : dungThan.includes("Thổ") ? "brown" : dungThan.includes("Kim") ? "white" : "blue"}.
`}
`;
    }
  }

  if (isThapThan) {
    response += `
${language === "vi" ? `
### Thập Thần
${Object.entries(thapThanResults).map(([elem, thapThan]) => thapThanEffects[thapThan] ? `${elem}: ${thapThanEffects[thapThan].vi}` : "").filter(Boolean).join("\n")}
` : `
### Ten Gods
${Object.entries(thapThanResults).map(([elem, thapThan]) => thapThanEffects[thapThan] ? `${elem}: ${thapThanEffects[thapThan].en}` : "").filter(Boolean).join("\n")}
`}
`;
  }

  if (isThanSat) {
    const activeThanSat = Object.entries(thanSatResults)
      .filter(([_, value]) => value.value.length)
      .map(([_, value]) => `${value[language]}: ${value.value.join(", ")}`);
    response += `
${language === "vi" ? `
### Thần Sát
${activeThanSat.length > 0 ? activeThanSat.join("\n") : "Không có Thần Sát nổi bật"}
` : `
### Auspicious Stars
${activeThanSat.length > 0 ? activeThanSat.join("\n") : "No prominent stars"}
`}
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
  const { messages, tuTruInfo, dungThan, language = "vi" } = req.body;
  const useOpenAI = process.env.USE
