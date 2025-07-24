const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

// Khởi tạo ứng dụng Express
const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint cho Render
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Thông tin ngũ hành Thiên Can và Địa Chi
const canChiNguHanhInfo = `
Ngũ hành 10 Thiên Can:
- Giáp, Ất: Mộc (cây cối, sự phát triển, sáng tạo)
- Bính, Đinh: Hỏa (ngọn lửa, đam mê, năng lượng)
- Mậu, Kỷ: Thổ (đất đai, sự ổn định, nuôi dưỡng)
- Canh, Tân: Kim (kim loại, sự chính xác, kiên định)
- Nhâm, Quý: Thủy (nước, linh hoạt, trí tuệ)
Ngũ hành 12 Địa Chi:
- Tý, Hợi: Thủy (dòng sông, sự thích nghi)
- Sửu, Thìn, Mùi, Tuất: Thổ (núi cao, sự bền vững)
- Dần, Mão: Mộc (rừng xanh, sự sinh trưởng)
- Tỵ, Ngọ: Hỏa (mặt trời, sự rực rỡ)
- Thân, Dậu: Kim (vàng bạc, sự tinh tế)
`;

// Ánh xạ Thiên Can và Địa Chi
const heavenlyStemsMap = {
  en: { Jia: "Giáp", Yi: "Ất", Bing: "Bính", Ding: "Đinh", Wu: "Mậu", Ji: "Kỷ", Geng: "Canh", Xin: "Tân", Ren: "Nhâm", Gui: "Quý" },
  vi: { Giáp: "Giáp", Ất: "Ất", Bính: "Bính", Đinh: "Đinh", Mậu: "Mậu", Kỷ: "Kỷ", Canh: "Canh", Tân: "Tân", Nhâm: "Nhâm", Quý: "Quý" }
};
const earthlyBranchesMap = {
  en: { Rat: "Tý", Ox: "Sửu", Tiger: "Dần", Rabbit: "Mão", Dragon: "Thìn", Snake: "Tỵ", Horse: "Ngọ", Goat: "Mùi", Monkey: "Thân", Rooster: "Dậu", Dog: "Tuất", Pig: "Hợi" },
  vi: { Tý: "Tý", Sửu: "Sửu", Dần: "Dần", Mão: "Mão", Thìn: "Thìn", Tỵ: "Tỵ", Ngọ: "Ngọ", Mùi: "Mùi", Thân: "Thân", Dậu: "Dậu", Tuất: "Tuất", Hợi: "Hợi" }
};

// Chuẩn hóa Can/Chi
const normalizeCanChi = (input) => {
  if (!input || typeof input !== "string") {
    console.error("Can Chi không hợp lệ, phải là chuỗi:", input);
    return null;
  }
  const parts = input.trim().split(" ");
  if (parts.length !== 2) {
    console.error("Can Chi không đúng định dạng 'Can Chi':", input);
    return null;
  }
  const can = Object.keys(heavenlyStemsMap.vi).find(k => k.toLowerCase() === parts[0].toLowerCase());
  const chi = Object.keys(earthlyBranchesMap.vi).find(k => k.toLowerCase() === parts[1].toLowerCase());
  if (!can || !chi) {
    console.error("Can hoặc Chi không hợp lệ:", parts);
    return null;
  }
  return `${can} ${chi}`;
};

// Parse Tứ Trụ từ tiếng Anh sang tiếng Việt
const parseEnglishTuTru = (input) => {
  try {
    const parts = input.match(/(\w+\s+\w+)\s*(?:hour|day|month|year)/gi)?.map(part => part.trim().split(" "));
    if (!parts || parts.length !== 4) {
      console.error("Không thể parse Tứ Trụ từ đầu vào tiếng Anh:", input);
      return null;
    }
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

// Chu kỳ 60 Hoa Giáp
const hoaGiap = [
  "Giáp Tý", "Ất Sửu", "Bính Dần", "Đinh Mão", "Mậu Thìn", "Kỷ Tỵ", "Canh Ngọ", "Tân Mùi", "Nhâm Thân", "Quý Dậu",
  "Giáp Tuất", "Ất Hợi", "Bính Tý", "Đinh Sửu", "Mậu Dần", "Kỷ Mão", "Canh Thìn", "Tân Tỵ", "Nhâm Ngọ", "Quý Mùi",
  "Giáp Thân", "Ất Dậu", "Bính Tuất", "Đinh Hợi", "Mậu Tý", "Kỷ Sửu", "Canh Dần", "Tân Mão", "Nhâm Thìn", "Quý Tỵ",
  "Giáp Ngọ", "Ất Mùi", "Bính Thân", "Đinh Dậu", "Mậu Tuất", "Kỷ Hợi", "Canh Tý", "Tân Sửu", "Nhâm Dần", "Quý Mão",
  "Giáp Thìn", "Ất Tỵ", "Bính Ngọ", "Đinh Mùi", "Mậu Thân", "Kỷ Dậu", "Canh Tuất", "Tân Hợi", "Nhâm Tý", "Quý Sửu",
  "Giáp Dần", "Ất Mão", "Bính Thìn", "Đinh Tỵ", "Mậu Ngọ", "Kỷ Mùi", "Canh Thân", "Tân Dậu", "Nhâm Tuất", "Quý Hợi"
];

// Tính Can Chi cho năm
const getCanChiForYear = (year) => {
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    console.error("Năm không hợp lệ:", year);
    return null;
  }
  const baseYear = 1984;
  const index = (year - baseYear) % 60;
  const adjustedIndex = index < 0 ? index + 60 : index;
  return hoaGiap[adjustedIndex] || null;
};

// Phân tích ngũ hành từ Tứ Trụ
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
      throw new Error("Tứ Trụ không đầy đủ hoặc không hợp lệ");
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
    throw new Error("Không thể phân tích ngũ hành do dữ liệu Tứ Trụ không hợp lệ");
  }
};

// Tính Thập Thần
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
      throw new Error("Tứ Trụ không đầy đủ để tính Thập Thần");
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
    throw new Error("Không thể tính Thập Thần do dữ liệu Tứ Trụ không hợp lệ");
  }
};

// Tính Thần Sát
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
    throw new Error("Invalid nhatChu or branches");
  }

  return {
    "Thiên Ất Quý Nhân": { vi: "Thiên Ất Quý Nhân", en: "Nobleman Star", value: thienAtQuyNhan[nhatChu]?.filter(chi => branches.includes(chi)) || [] },
    "Đào Hoa": { vi: "Đào Hoa", en: "Peach Blossom", value: branches.includes(daoHoa[tuTru.ngay?.split(" ")[1]]) ? [daoHoa[tuTru.ngay?.split(" ")[1]]] : [] },
    "Văn Xương": { vi: "Văn Xương", en: "Literary Star", value: vanXuong[nhatChu]?.filter(chi => branches.includes(chi)) || [] },
    "Thái Cực Quý Nhân": { vi: "Thái Cực Quý Nhân", en: "Grand Ultimate Noble", value: thaiCucQuyNhan[nhatChu]?.filter(chi => branches.includes(chi)) || [] },
    "Hồng Loan": { vi: "Hồng Loan", en: "Red Phoenix", value: branches.includes(hongLoan[tuTru.ngay?.split(" ")[1]]) ? [hongLoan[tuTru.ngay?.split(" ")[1]]] : [] },
    "Thiên Đức": { vi: "Thiên Đức", en: "Heavenly Virtue", value: thienDuc[nhatChu]?.filter(chi => branches.includes(chi)) || [] },
    "Nguyệt Đức": { vi: "Nguyệt Đức", en: "Lunar Virtue", value: nguyetDuc[nhatChu]?.filter(chi => branches.includes(chi)) || [] },
    "Tướng Tinh": { vi: "Tướng Tinh", en: "General Star", value: tuongTinh[nhatChu]?.filter(chi => branches.includes(chi)) || [] },
    "Dịch Mã": { vi: "Dịch Mã", en: "Traveling Horse", value: dichMa[tuTru.ngay?.split(" ")[1]]?.filter(chi => branches.includes(chi)) || [] },
    "Cô Thần Quả Tú": { vi: "Cô Thần Quả Tú", en: "Solitary Widow", value: coThanQuaTu[nhatChu]?.filter(chi => branches.includes(chi)) || [] },
    "Kiếp Sát": { vi: "Kiếp Sát", en: "Robbery Sha", value: kiepSat[nhatChu]?.filter(chi => branches.includes(chi)) || [] },
    "Không Vong": { vi: "Không Vong", en: "Void Star", value: khongVong[nhatChu]?.filter(chi => branches.includes(chi)) || [] }
  };
};

// Tạo câu trả lời trực tiếp
const generateResponse = (tuTru, nguHanhCount, thapThanResults, dungThan, userInput, messages, language) => {
  const totalElements = Object.values(nguHanhCount).reduce((a, b) => a + b, 0);
  const tyLeNguHanh = Object.fromEntries(
    Object.entries(nguHanhCount).map(([k, v]) => [k, `${((v / totalElements) * 100).toFixed(2)}%`])
  );
  const nhatChu = tuTru.ngay.split(" ")[0];
  const canNguHanh = { 
    Giáp: "Mộc", Ất: "Mộc", Bính: "Hỏa", Đinh: "Hỏa", Mậu: "Thổ", 
    Kỷ: "Thổ", Canh: "Kim", Tân: "Kim", Nhâm: "Thủy", Quý: "Thủy" 
  };
  const userInputLower = userInput.toLowerCase();

  // Xác định loại câu hỏi
  const isMoney = userInputLower.includes("tiền bạc") || userInputLower.includes("tài chính") || userInputLower.includes("money") || userInputLower.includes("finance");
  const isCareer = userInputLower.includes("nghề") || userInputLower.includes("công việc") || userInputLower.includes("sự nghiệp") || userInputLower.includes("career") || userInputLower.includes("job");
  const isHealth = userInputLower.includes("sức khỏe") || userInputLower.includes("bệnh tật") || userInputLower.includes("health");
  const isLove = userInputLower.includes("tình duyên") || userInputLower.includes("tình yêu") || userInputLower.includes("love");
  const isMarriage = userInputLower.includes("hôn nhân") || userInputLower.includes("marriage");
  const isChildren = userInputLower.includes("con cái") || userInputLower.includes("children");
  const isComplex = userInputLower.includes("dự đoán") || userInputLower.includes("tương lai") || userInputLower.includes("future") || userInputLower.includes("đại vận");
  const isThapThan = userInputLower.includes("thập thần") || userInputLower.includes("ten gods");
  const isThanSat = userInputLower.includes("thần sát") || userInputLower.includes("auspicious stars") || userInputLower.includes("sao");

  // Xử lý câu hỏi phức tạp
  if (isComplex) {
    return `
${language === "vi" ? "Luận giải Bát Tự" : "Bazi Interpretation"}:
${language === "vi" ? "Câu hỏi của bạn liên quan đến các vấn đề phức tạp như dự đoán tương lai hoặc đại vận, cần phân tích chi tiết hơn. Vui lòng gửi câu hỏi qua email app.aihuyenhoc@gmail.com hoặc tham gia cộng đồng Discord (xem thông tin ứng dụng) để được hỗ trợ chuyên sâu." : "Your question involves complex matters like future predictions or major life cycles, requiring detailed analysis. Please send your question to app.aihuyenhoc@gmail.com or join our Discord community (see app details) for in-depth support."}
    `;
  }

  // Mô tả tính cách dựa trên Nhật Chủ
  const personalityDescriptions = {
    Kim: {
      vi: "Tinh tế, nhạy bén, kiên định như vàng bạc được tôi luyện, luôn tìm kiếm sự hoàn mỹ và sắc sảo trong tư duy. Bạn yêu cái đẹp, sống tinh tế, và thường đầu tư vào hình ảnh cá nhân. Đôi khi khắt khe với bản thân hoặc dễ bị cảm xúc chi phối khi áp lực.",
      en: "Refined, perceptive, steadfast like forged gold, always seeking perfection and sharpness in thought. You love beauty, live elegantly, and often invest in personal image. Sometimes overly critical of yourself or prone to emotional overwhelm under stress."
    },
    Mộc: {
      vi: "Sáng tạo, linh hoạt, vươn mình như rừng xanh trước gió, mang trong mình sức sống dạt dào. Bạn thích khám phá và dễ thích nghi, nhưng có thể thiếu kiên nhẫn.",
      en: "Creative, adaptable, rising like a green forest in the wind, filled with vibrant life. You enjoy exploration and adapt easily, but may lack patience."
    },
    Hỏa: {
      vi: "Nồng nhiệt, đam mê, rực rỡ như ngọn lửa soi đường, luôn tràn đầy năng lượng và khát khao dẫn dắt. Bạn dễ thu hút người khác nhưng cần kiểm soát sự bốc đồng.",
      en: "Passionate, radiant like a guiding flame, always full of energy and a desire to lead. You attract others easily but need to control impulsiveness."
    },
    Thổ: {
      vi: "Vững chãi, đáng tin cậy, như ngọn núi che chở, mang lại sự ổn định và nuôi dưỡng cho vạn vật. Bạn đáng tin nhưng đôi khi hơi bảo thủ.",
      en: "Steady, reliable, like a sheltering mountain, providing stability and nurturing all things. You are dependable but sometimes slightly stubborn."
    },
    Thủy: {
      vi: "Linh hoạt, sâu sắc, như dòng sông chảy mãi, luôn thích nghi và tìm ra con đường của riêng mình. Bạn thông minh nhưng có thể thiếu quyết đoán.",
      en: "Fluid, profound, like a flowing river, always adapting and finding its own path. You are intelligent but may lack decisiveness."
    }
  };

  // Mô tả Thập Thần
  const thapThanEffects = {
    "Thực Thần": { vi: "Mang đến sự sáng tạo dạt dào, tư duy độc đáo, phù hợp với nghệ thuật và sáng tác.", en: "Brings abundant creativity and unique thinking, suitable for arts and innovation." },
    "Thương Quan": { vi: "Thêm phần quyết đoán, dám nghĩ dám làm, nhưng cần kiểm soát sự bốc đồng.", en: "Adds decisiveness and boldness, but requires control over impulsiveness." },
    "Chính Ấn": { vi: "Như người thầy dẫn dắt, giúp bạn học hỏi và trưởng thành qua thử thách.", en: "Like a guiding teacher, helping you learn and grow through challenges." },
    "Thiên Ấn": { vi: "Tăng cường trí tuệ và trực giác, phù hợp với công việc đòi hỏi sự sâu sắc.", en: "Enhances wisdom and intuition, suitable for insightful work." },
    "Chính Tài": { vi: "Mang lại sự ổn định tài chính, khả năng quản lý và tổ chức.", en: "Brings financial stability, management, and organizational skills." },
    "Thiên Tài": { vi: "Tạo cơ hội bất ngờ về tài lộc, phù hợp với những công việc sáng tạo.", en: "Creates unexpected wealth opportunities, suitable for creative pursuits." },
    "Chính Quan": { vi: "Thêm phần trách nhiệm và uy tín, phù hợp với vai trò lãnh đạo.", en: "Adds responsibility and prestige, suitable for leadership roles." },
    "Thất Sát": { vi: "Tăng tính quyết liệt, dũng cảm, nhưng cần cân bằng để tránh xung đột.", en: "Increases intensity and courage, but needs balance to avoid conflicts." }
  };

  // Mô tả Thần Sát
  const thanSatDescriptions = {
    "Thiên Ất Quý Nhân": { vi: "Quý nhân phù trợ, mang lại sự hỗ trợ từ người khác, giúp vượt khó khăn.", en: "Noble assistance, bringing support from others to overcome difficulties." },
    "Đào Hoa": { vi: "Tăng sức hút và duyên dáng trong giao tiếp, hỗ trợ quan hệ xã hội.", en: "Enhances charm and grace in interactions, aiding social relationships." },
    "Văn Xương": { vi: "Hỗ trợ học vấn, sáng tạo, mang lại thành công trong học thuật.", en: "Supports academic success and creativity, leading to scholarly achievements." },
    "Thái Cực Quý Nhân": { vi: "Tăng trí tuệ, kết nối tâm linh, mang phúc đức.", en: "Enhances wisdom and spiritual connection, bringing blessings." },
    "Hồng Loan": { vi: "Thúc đẩy tình duyên, hôn nhân, mang lại duyên phận.", en: "Promotes romance and marriage, bringing destined connections." },
    "Thiên Đức": { vi: "Mang phúc đức, bảo vệ khỏi khó khăn.", en: "Brings blessings and protection from hardships." },
    "Nguyệt Đức": { vi: "Tạo sự hòa hợp, ân đức, giúp cuộc sống thuận lợi.", en: "Creates harmony and grace, facilitating a smooth life." },
    "Tướng Tinh": { vi: "Mang cơ hội thăng tiến, khởi nghiệp, thành công trong sự nghiệp.", en: "Brings opportunities for promotion, entrepreneurship, and career success." },
    "Dịch Mã": { vi: "Báo hiệu sự di chuyển, cơ hội ở nước ngoài, phát triển sự nghiệp.", en: "Indicates movement, opportunities abroad, and career development." },
    "Cô Thần Quả Tú": { vi: "Có thể gây cô đơn, khó khăn trong hôn nhân, cần cân bằng cảm xúc.", en: "May cause loneliness or marital challenges, requiring emotional balance." },
    "Kiếp Sát": { vi: "Đưa ra thách thức, cần cẩn thận với tiểu nhân hoặc mất mát.", en: "Presents challenges, requiring caution against adversaries or losses." },
    "Không Vong": { vi: "Có thể gây trở ngại nhỏ, nhưng hóa giải nếu kết hợp với sao cát.", en: "May cause minor obstacles, but resolved with auspicious stars." }
  };

  // Xây dựng câu trả lời
  let response = `
${language === "vi" ? "Luận giải Bát Tự" : "Bazi Interpretation"}:

${language === "vi" ? `Như viên ngọc quý ẩn trong lòng đất, Nhật Chủ ${nhatChu} (${canNguHanh[nhatChu]}) mang ánh sáng của ${personalityDescriptions[canNguHanh[nhatChu]].vi}` : `Like a precious gem hidden within the earth, Day Master ${nhatChu} (${canNguHanh[nhatChu]}) carries the light of ${personalityDescriptions[canNguHanh[nhatChu]].en}`}
${language === "vi" ? "Tứ Trụ:" : "Four Pillars:"} ${language === "vi" ? `Giờ ${tuTru.gio}, Ngày ${tuTru.ngay}, Tháng ${tuTru.thang}, Năm ${tuTru.nam}` : `Hour ${tuTru.gio}, Day ${tuTru.ngay}, Month ${tuTru.thang}, Year ${tuTru.nam}`}
${language === "vi" ? "Ngũ Hành:" : "Five Elements:"}
${Object.entries(tyLeNguHanh).map(([k, v]) => `${k}: ${v}`).join("\n")}
${language === "vi" ? `Với Nhật Chủ ${nhatChu} (${canNguHanh[nhatChu]}), lá số ${canNguHanh[nhatChu]} yếu (Thân Nhược), cần Dụng Thần ${dungThan.join(", ")} để cân bằng.` : `With Day Master ${nhatChu} (${canNguHanh[nhatChu]}), the chart is weak (Shen Ruo), requiring Useful God ${dungThan.join(", ")} for balance.`}

${language === "vi" ? "Tính cách:" : "Personality:"}
${language === "vi" ? `Bạn là hiện thân của ${canNguHanh[nhatChu]}, ${personalityDescriptions[canNguHanh[nhatChu]].vi}` : `You embody ${canNguHanh[nhatChu]}, ${personalityDescriptions[canNguHanh[nhatChu]].en}`}
`;

  // Thêm phân tích Thập Thần nếu được yêu cầu
  if (isThapThan) {
    response += `
${language === "vi" ? "Thập Thần:" : "Ten Gods:"}
${Object.entries(thapThanResults).map(([elem, thapThan]) => thapThanEffects[thapThan] ? `${elem} (${thapThan}): ${thapThanEffects[thapThan][language]}` : "").filter(Boolean).join("\n")}
`;
  }

  // Thêm phân tích Thần Sát nếu được yêu cầu
  if (isThanSat) {
    const activeThanSat = Object.entries(tinhThanSat(tuTru))
      .filter(([_, value]) => value.value.length)
      .map(([key, value]) => `${value[language]}: ${value.value.join(", ")} (${thanSatDescriptions[key][language]})`);
    response += `
${language === "vi" ? "Thần Sát:" : "Auspicious Stars:"}
${activeThanSat.length ? activeThanSat.join("\n") : language === "vi" ? "Không có Thần Sát nổi bật trong lá số." : "No prominent Auspicious Stars in the chart."}
`;
  }

  // Nghề nghiệp phù hợp
  response += `
${language === "vi" ? "Nghề nghiệp phù hợp:" : "Suitable Careers:"}
${language === "vi" ? `Dụng Thần ${dungThan.join(", ")} gợi ý bạn nên chọn nghề ${dungThan.includes("Mộc") ? "giáo dục, sáng tạo, nghệ thuật" : dungThan.includes("Hỏa") ? "truyền thông, marketing, lãnh đạo" : dungThan.includes("Thổ") ? "bất động sản, tài chính, quản lý" : dungThan.includes("Kim") ? "công nghệ, kỹ thuật, phân tích" : "giao tiếp, du lịch, tư vấn"}.` : `Useful God ${dungThan.join(", ")} suggests choosing careers in ${dungThan.includes("Mộc") ? "education, creativity, arts" : dungThan.includes("Hỏa") ? "media, marketing, leadership" : dungThan.includes("Thổ") ? "real estate, finance, management" : dungThan.includes("Kim") ? "technology, engineering, analysis" : "communication, travel, consulting"}.`}
${language === "vi" ? "Hãy chọn con đường kết hợp giữa sáng tạo và cấu trúc, như một nghệ nhân chạm khắc kiệt tác từ tâm hồn." : "Choose a path that blends creativity and structure, like an artisan crafting masterpieces from the soul."}
`;

  // Màu sắc may mắn
  response += `
${language === "vi" ? "Màu sắc may mắn:" : "Lucky Colors:"}
${language === "vi" ? `Để kích hoạt vận may, hãy ưu tiên màu sắc của Dụng Thần: ${dungThan.includes("Thổ") ? "vàng, nâu đất" : ""}${dungThan.includes("Kim") ? (dungThan.includes("Thổ") ? ", trắng, bạc" : "trắng, bạc") : ""}${dungThan.includes("Hỏa") ? (dungThan.length > 1 ? ", đỏ, hồng" : "đỏ, hồng") : ""}${dungThan.includes("Mộc") ? (dungThan.length > 1 ? ", xanh lá" : "xanh lá") : ""}${dungThan.includes("Thủy") ? (dungThan.length > 1 ? ", xanh dương, đen" : "xanh dương, đen") : ""}.` : `To activate good fortune, prioritize Useful God colors: ${dungThan.includes("Thổ") ? "yellow, brown" : ""}${dungThan.includes("Kim") ? (dungThan.includes("Thổ") ? ", white, silver" : "white, silver") : ""}${dungThan.includes("Hỏa") ? (dungThan.length > 1 ? ", red, pink" : "red, pink") : ""}${dungThan.includes("Mộc") ? (dungThan.length > 1 ? ", green" : "green") : ""}${dungThan.includes("Thủy") ? (dungThan.length > 1 ? ", blue, black" : "blue, black") : ""}.`}
${language === "vi" ? `Sử dụng vật phẩm phong thủy như ${dungThan.includes("Thổ") ? "thạch anh vàng, ngọc bích" : ""}${dungThan.includes("Kim") ? (dungThan.includes("Thổ") ? ", đá mặt trăng, thạch anh trắng" : "đá mặt trăng, thạch anh trắng") : ""}${dungThan.includes("Hỏa") ? (dungThan.length > 1 ? ", thạch anh hồng, ruby" : "thạch anh hồng, ruby") : ""}${dungThan.includes("Mộc") ? (dungThan.length > 1 ? ", ngọc lục bảo" : "ngọc lục bảo") : ""}${dungThan.includes("Thủy") ? (dungThan.length > 1 ? ", lapis lazuli, aquamarine" : "lapis lazuli, aquamarine") : ""}, và chọn hướng ${dungThan.includes("Thổ") ? "Đông Bắc" : ""}${dungThan.includes("Kim") ? (dungThan.includes("Thổ") ? " hoặc Tây" : "Tây") : ""}${dungThan.includes("Hỏa") ? (dungThan.length > 1 ? " hoặc Nam" : "Nam") : ""}${dungThan.includes("Mộc") ? (dungThan.length > 1 ? " hoặc Đông" : "Đông") : ""}${dungThan.includes("Thủy") ? (dungThan.length > 1 ? " hoặc Bắc" : "Bắc") : ""} để thu hút năng lượng tích cực.` : `Use feng shui items like ${dungThan.includes("Thổ") ? "citrine, jade" : ""}${dungThan.includes("Kim") ? (dungThan.includes("Thổ") ? ", moonstone, white quartz" : "moonstone, white quartz") : ""}${dungThan.includes("Hỏa") ? (dungThan.length > 1 ? ", rose quartz, ruby" : "rose quartz, ruby") : ""}${dungThan.includes("Mộc") ? (dungThan.length > 1 ? ", emerald" : "emerald") : ""}${dungThan.includes("Thủy") ? (dungThan.length > 1 ? ", lapis lazuli, aquamarine" : "lapis lazuli, aquamarine") : ""}, and choose directions ${dungThan.includes("Thổ") ? "Northeast" : ""}${dungThan.includes("Kim") ? (dungThan.includes("Thổ") ? " or West" : "West") : ""}${dungThan.includes("Hỏa") ? (dungThan.length > 1 ? " or South" : "South") : ""}${dungThan.includes("Mộc") ? (dungThan.length > 1 ? " or East" : "East") : ""}${dungThan.includes("Thủy") ? (dungThan.length > 1 ? " or North" : "North") : ""} to attract positive energy.`}
`;

  // Phân tích bổ sung dựa trên câu hỏi
  if (isMoney) {
    response += `
${language === "vi" ? "Tài lộc:" : "Wealth:"}
${language === "vi" ? `Như ${canNguHanh[nhatChu].toLowerCase()} cần ${dungThan[0].toLowerCase()} để tỏa sáng, tài lộc của bạn phụ thuộc vào sự cân bằng của Dụng Thần.` : `As ${canNguHanh[nhatChu].toLowerCase()} needs ${dungThan[0].toLowerCase()} to shine, your wealth depends on the balance of Useful God.`}
${language === "vi" ? `Đề xuất: Chọn màu sắc như ${dungThan.includes("Thổ") ? "vàng, nâu" : dungThan.includes("Kim") ? "trắng, bạc" : "xanh lá, đỏ, xanh dương"}, vật phẩm như ${dungThan.includes("Thổ") ? "thạch anh vàng" : dungThan.includes("Kim") ? "đá mặt trăng" : "thạch anh hồng"}, và hướng ${dungThan.includes("Thổ") ? "Đông Bắc" : dungThan.includes("Kim") ? "Tây" : "Bắc"} để thu hút tài lộc.` : `Suggestions: Choose colors like ${dungThan.includes("Thổ") ? "yellow, brown" : dungThan.includes("Kim") ? "white, silver" : "green, red, blue"}, items like ${dungThan.includes("Thổ") ? "citrine" : dungThan.includes("Kim") ? "moonstone" : "rose quartz"}, and the direction ${dungThan.includes("Thổ") ? "Northeast" : dungThan.includes("Kim") ? "West" : "North"} to attract wealth.`}
${language === "vi" ? "Cầu chúc tài lộc bạn như dòng sông vàng chảy mãi, thịnh vượng muôn đời!" : "May your wealth flow like a golden river, prosperous forever!"}
`;
  } else if (isCareer) {
    response += `
${language === "vi" ? "Sự nghiệp:" : "Career:"}
${language === "vi" ? `Như ${canNguHanh[nhatChu].toLowerCase()} được ${dungThan[0].toLowerCase()} nâng niu, sự nghiệp của bạn cần sự hỗ trợ từ Dụng Thần.` : `As ${canNguHanh[nhatChu].toLowerCase()} is nurtured by ${dungThan[0].toLowerCase()}, your career needs support from Useful God.`}
${language === "vi" ? `Phù hợp với nghề ${dungThan.includes("Mộc") ? "giáo dục, sáng tạo, nghệ thuật" : dungThan.includes("Hỏa") ? "truyền thông, marketing, lãnh đạo" : dungThan.includes("Thổ") ? "bất động sản, tài chính, quản lý" : dungThan.includes("Kim") ? "công nghệ, kỹ thuật, phân tích" : "giao tiếp, du lịch, tư vấn"}.` : `Suitable for careers in ${dungThan.includes("Mộc") ? "education, creativity, arts" : dungThan.includes("Hỏa") ? "media, marketing, leadership" : dungThan.includes("Thổ") ? "real estate, finance, management" : dungThan.includes("Kim") ? "technology, engineering, analysis" : "communication, travel, consulting"}.`}
${language === "vi" ? `Đề xuất: Chọn màu sắc ${dungThan.includes("Thổ") ? "vàng, nâu" : dungThan.includes("Kim") ? "trắng, bạc" : "xanh lá, đỏ, xanh dương"}, vật phẩm như ${dungThan.includes("Thổ") ? "thạch anh vàng" : dungThan.includes("Kim") ? "đá mặt trăng" : "thạch anh hồng"}, và hướng ${dungThan.includes("Thổ") ? "Đông Bắc" : dungThan.includes("Kim") ? "Tây" : "Đông, Nam, Bắc"}.` : `Suggestions: Choose colors ${dungThan.includes("Thổ") ? "yellow, brown" : dungThan.includes("Kim") ? "white, silver" : "green, red, blue"}, items like ${dungThan.includes("Thổ") ? "citrine" : dungThan.includes("Kim") ? "moonstone" : "rose quartz"}, and the direction ${dungThan.includes("Thổ") ? "Northeast" : dungThan.includes("Kim") ? "West" : "East, South, North"}.`}
${language === "vi" ? "Cầu chúc sự nghiệp bạn như ngọn núi vững vàng, rực rỡ ánh vàng!" : "May your career stand like a mountain, radiant with golden light!"}
`;
  } else if (isHealth) {
    response += `
${language === "vi" ? "Sức khỏe:" : "Health:"}
${language === "vi" ? `Như ${canNguHanh[nhatChu].toLowerCase()} được ${dungThan[0].toLowerCase()} che chở, sức khỏe của bạn cần sự cân bằng ngũ hành.` : `As ${canNguHanh[nhatChu].toLowerCase()} is protected by ${dungThan[0].toLowerCase()}, your health requires balance of the Five Elements.`}
${language === "vi" ? `Đề xuất: Chọn màu sắc ${dungThan.includes("Thổ") ? "vàng, nâu" : dungThan.includes("Kim") ? "trắng, bạc" : "xanh lá, xanh dương"}, vật phẩm như ${dungThan.includes("Thổ") ? "ngọc bích" : dungThan.includes("Kim") ? "thạch anh trắng" : "lapis lazuli"}, và hướng ${dungThan.includes("Thổ") ? "Đông Bắc" : dungThan.includes("Kim") ? "Tây" : "Bắc"} để tăng cường sức khỏe.` : `Suggestions: Choose colors ${dungThan.includes("Thổ") ? "yellow, brown" : dungThan.includes("Kim") ? "white, silver" : "green, blue"}, items like ${dungThan.includes("Thổ") ? "jade" : dungThan.includes("Kim") ? "white quartz" : "lapis lazuli"}, and the direction ${dungThan.includes("Thổ") ? "Northeast" : dungThan.includes("Kim") ? "West" : "North"} to enhance health.`}
${language === "vi" ? "Cầu chúc sức khỏe bạn như dòng sông trong lành, bền lâu mãi mãi!" : "May your health flow like a clear river, enduring forever!"}
`;
  } else if (isLove || isMarriage) {
    response += `
${language === "vi" ? "Tình duyên & Hôn nhân:" : "Love & Marriage:"}
${language === "vi" ? `Như ${canNguHanh[nhatChu].toLowerCase()} tìm thấy ${dungThan[0].toLowerCase()}, tình duyên của bạn nở hoa trong sự hòa hợp.` : `As ${canNguHanh[nhatChu].toLowerCase()} finds ${dungThan[0].toLowerCase()}, your love blossoms in harmony.`}
${language === "vi" ? `Đề xuất: Chọn màu sắc ${dungThan.includes("Hỏa") ? "đỏ, hồng" : dungThan.includes("Kim") ? "trắng, bạc" : "xanh lá, xanh dương"}, vật phẩm như ${dungThan.includes("Hỏa") ? "thạch anh hồng" : dungThan.includes("Kim") ? "đá mặt trăng" : "ngọc bích"}, và hướng ${dungThan.includes("Hỏa") ? "Nam" : dungThan.includes("Kim") ? "Tây" : "Đông, Bắc"} để thu hút tình duyên.` : `Suggestions: Choose colors ${dungThan.includes("Hỏa") ? "red, pink" : dungThan.includes("Kim") ? "white, silver" : "green, blue"}, items like ${dungThan.includes("Hỏa") ? "rose quartz" : dungThan.includes("Kim") ? "moonstone" : "jade"}, and the direction ${dungThan.includes("Hỏa") ? "South" : dungThan.includes("Kim") ? "West" : "East, North"} to attract love.`}
${language === "vi" ? "Cầu chúc tình duyên bạn như hoa nở trên cành, mãi mãi rực rỡ!" : "May your love blossom like flowers on a branch, radiant forever!"}
`;
  } else if (isChildren) {
    response += `
${language === "vi" ? "Con cái:" : "Children:"}
${language === "vi" ? `Như ${canNguHanh[nhatChu].toLowerCase()} được ${dungThan[0].toLowerCase()} nâng niu, con cái là niềm vui rực rỡ trong đời bạn.` : `As ${canNguHanh[nhatChu].toLowerCase()} is nurtured by ${dungThan[0].toLowerCase()}, your children bring radiant joy to your life.`}
${language === "vi" ? `Đề xuất: Chọn màu sắc ${dungThan.includes("Thổ") ? "vàng, nâu" : dungThan.includes("Kim") ? "trắng, bạc" : "xanh lá, xanh dương"}, vật phẩm như ${dungThan.includes("Thổ") ? "ngọc bích" : dungThan.includes("Kim") ? "thạch anh trắng" : "ngọc lục bảo"}, và hướng ${dungThan.includes("Thổ") ? "Đông Bắc" : dungThan.includes("Kim") ? "Tây" : "Đông"} để tăng phúc đức cho con cái.` : `Suggestions: Choose colors ${dungThan.includes("Thổ") ? "yellow, brown" : dungThan.includes("Kim") ? "white, silver" : "green, blue"}, items like ${dungThan.includes("Thổ") ? "jade" : dungThan.includes("Kim") ? "white quartz" : "emerald"}, and the direction ${dungThan.includes("Thổ") ? "Northeast" : dungThan.includes("Kim") ? "West" : "East"} to enhance blessings for children.`}
${language === "vi" ? "Cầu chúc con cái bạn như những vì sao sáng, mang niềm vui muôn đời!" : "May your children shine like stars, bringing joy forever!"}
`;
  }

  // Lời khuyên
  response += `
${language === "vi" ? "Lời khuyên:" : "Advice:"}
${language === "vi" ? `Hãy để ${canNguHanh[nhatChu]} trong bạn như ${canNguHanh[nhatChu] === "Kim" ? "viên ngọc được mài giũa" : canNguHanh[nhatChu] === "Mộc" ? "cây xanh vươn mình" : canNguHanh[nhatChu] === "Hỏa" ? "ngọn lửa rực rỡ" : canNguHanh[nhatChu] === "Thổ" ? "ngọn núi vững chãi" : "dòng sông bất tận"}, luôn sáng bóng và kiên cường. Tận dụng sự ${canNguHanh[nhatChu] === "Kim" ? "tinh tế và quyết tâm" : canNguHanh[nhatChu] === "Mộc" ? "sáng tạo và linh hoạt" : canNguHanh[nhatChu] === "Hỏa" ? "đam mê và dẫn dắt" : canNguHanh[nhatChu] === "Thổ" ? "vững chãi và nuôi dưỡng" : "sâu sắc và thích nghi"} để xây dựng cuộc sống ý nghĩa. Dụng Thần ${dungThan.join(", ")} sẽ dẫn bạn đi đúng hướng, như ${dungThan.includes("Thổ") ? "ngọn núi vàng" : dungThan.includes("Kim") ? "viên ngọc quý" : dungThan.includes("Hỏa") ? "ngọn lửa bất diệt" : dungThan.includes("Mộc") ? "rừng xanh bạt ngàn" : "dòng sông bất tận"} trước gió.` : `Let the ${canNguHanh[nhatChu]} within you shine like ${canNguHanh[nhatChu] === "Kim" ? "a gem polished by challenges" : canNguHanh[nhatChu] === "Mộc" ? "a thriving tree" : canNguHanh[nhatChu] === "Hỏa" ? "a radiant flame" : canNguHanh[nhatChu] === "Thổ" ? "a steadfast mountain" : "an endless river"}, always radiant and resilient. Leverage your ${canNguHanh[nhatChu] === "Kim" ? "elegance and determination" : canNguHanh[nhatChu] === "Mộc" ? "creativity and adaptability" : canNguHanh[nhatChu] === "Hỏa" ? "passion and leadership" : canNguHanh[nhatChu] === "Thổ" ? "steadfastness and nurturing" : "depth and adaptability"} to build a meaningful life. Useful God ${dungThan.join(", ")} will guide you, like ${dungThan.includes("Thổ") ? "a golden mountain" : dungThan.includes("Kim") ? "a precious gem" : dungThan.includes("Hỏa") ? "an eternal flame" : dungThan.includes("Mộc") ? "a vast forest" : "an endless river"} standing strong.`}
${language === "vi" ? `Cầu chúc bạn như ${canNguHanh[nhatChu] === "Kim" ? "viên ngọc quý" : canNguHanh[nhatChu] === "Mộc" ? "cây xanh vươn mình" : canNguHanh[nhatChu] === "Hỏa" ? "ngọn lửa bất diệt" : canNguHanh[nhatChu] === "Thổ" ? "ngọn núi vững chãi" : "dòng sông bất tận"}, vận mệnh rạng ngời muôn đời!` : `May you shine like ${canNguHanh[nhatChu] === "Kim" ? "a precious gem" : canNguHanh[nhatChu] === "Mộc" ? "a thriving tree" : canNguHanh[nhatChu] === "Hỏa" ? "an eternal flame" : canNguHanh[nhatChu] === "Thổ" ? "a steadfast mountain" : "an endless river"}, with a destiny radiant forever!`}
`;

  return response;
};

// Kiểm tra API key OpenAI
const checkOpenAIKey = async () => {
  try {
    const response = await axios.get("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 10000
    });
    console.log("API key hợp lệ, danh sách mô hình:", response.data.data.map(m => m.id));
    return response.data.data.some(m => m.id.includes("gpt-3.5-turbo"));
  } catch (err) {
    console.error("Lỗi kiểm tra API key:", err.message, err.response?.data || {});
    return false;
  }
};

// Gọi API OpenAI
const callOpenAI = async (payload, retries = 5, delay = 3000) => {
  if (!process.env.OPENAI_API_KEY) {
    console.error("Lỗi: OPENAI_API_KEY không được cấu hình trong .env");
    throw new Error("Missing OpenAI API key");
  }

  if (!payload.model || !payload.messages || !Array.isArray(payload.messages) || !payload.messages.every(msg => msg.role && typeof msg.content === "string")) {
    console.error("Payload không hợp lệ:", JSON.stringify(payload, null, 2));
    throw new Error("Invalid payload format");
  }

  const isKeyValid = await checkOpenAIKey();
  if (!isKeyValid) {
    throw new Error("Invalid or expired OpenAI API key");
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Thử gọi OpenAI lần ${attempt} với mô hình ${payload.model}...`);
      console.log("Payload:", JSON.stringify(payload, null, 2));
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        payload,
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 45000
        }
      );
      console.log("Gọi OpenAI thành công:", response.data.id);
      return response.data;
    } catch (err) {
      console.error(`Thử lại lần ${attempt} thất bại:`, {
        message: err.message,
        code: err.code,
        response: err.response?.data || {},
        status: err.response?.status
      });
      if (err.response?.data?.error?.message) {
        console.error("Chi tiết lỗi từ OpenAI:", err.response.data.error.message);
      }
      if (attempt === retries) {
        throw new Error(`Failed to connect to OpenAI after ${retries} retries: ${err.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
};

// API luận giải Bát Tự
app.post("/api/luan-giai-bazi", async (req, res) => {
  console.log("Request received:", JSON.stringify(req.body, null, 2));
  const { messages, tuTruInfo, dungThan } = req.body;
  const useOpenAI = process.env.USE_OPENAI !== "false";
  const language = messages?.some(msg => /[\u00C0-\u1EF9]/.test(msg.content) || msg.content.includes("hãy") || msg.content.includes("ngày sinh")) ? "vi" : "en";

  // Kiểm tra đầu vào
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    console.error("Thiếu hoặc không hợp lệ: messages");
    return res.status(400).json({ error: language === "vi" ? "Thiếu hoặc không hợp lệ: messages" : "Missing or invalid: messages" });
  }
  if (!tuTruInfo || typeof tuTruInfo !== "string") {
    console.error("Thiếu hoặc không hợp lệ: tuTruInfo");
    return res.status(400).json({ error: language === "vi" ? "Thiếu hoặc không hợp lệ: tuTruInfo" : "Missing or invalid: tuTruInfo" });
  }
  let dungThanHanh = [];
  if (Array.isArray(dungThan)) {
    dungThanHanh = dungThan;
  } else if (dungThan && Array.isArray(dungThan.hanh)) {
    dungThanHanh = dungThan.hanh;
  } else {
    console.error("Thiếu hoặc không hợp lệ: dungThan");
    return res.status(400).json({ error: language === "vi" ? "Thiếu hoặc không hợp lệ: Dụng Thần" : "Missing or invalid: Useful God" });
  }
  if (!dungThanHanh.every(d => ["Mộc", "Hỏa", "Thổ", "Kim", "Thủy"].includes(d))) {
    console.error("Dụng Thần chứa giá trị không hợp lệ:", dungThanHanh);
    return res.status(400).json({ error: language === "vi" ? "Dụng Thần chứa giá trị không hợp lệ" : "Useful God contains invalid values" });
  }

  // Lấy tin nhắn người dùng
  const lastUserMsg = messages.slice().reverse().find(m => m.role === "user");
  const userInput = lastUserMsg ? lastUserMsg.content : "";

  // Parse và chuẩn hóa Tứ Trụ
  let tuTruParsed = null;
  try {
    tuTruParsed = JSON.parse(tuTruInfo);
    tuTruParsed = {
      gio: normalizeCanChi(tuTruParsed.gio),
      ngay: normalizeCanChi(tuTruParsed.ngay),
      thang: normalizeCanChi(tuTruParsed.thang),
      nam: normalizeCanChi(tuTruParsed.nam)
    };
    console.log("Parsed tuTru:", JSON.stringify(tuTruParsed, null, 2));
    if (!tuTruParsed.gio || !tuTruParsed.ngay || !tuTruParsed.thang || !tuTruParsed.nam) {
      throw new Error("Tứ Trụ không đầy đủ");
    }
  } catch (e) {
    console.error("Lỗi parse tuTruInfo:", e.message);
    tuTruParsed = parseEnglishTuTru(userInput);
    if (!tuTruParsed || !tuTruParsed.gio || !tuTruParsed.ngay || !tuTruParsed.thang || !tuTruParsed.nam) {
      console.error("Tứ Trụ không hợp lệ:", tuTruParsed);
      return res.status(400).json({ error: language === "vi" ? "Tứ Trụ không hợp lệ hoặc thiếu thông tin" : "Invalid or incomplete Four Pillars" });
    }
  }

  // Phân tích ngũ hành
  let nguHanhCount;
  try {
    nguHanhCount = analyzeNguHanh(tuTruParsed);
    console.log("Ngũ hành:", JSON.stringify(nguHanhCount, null, 2));
  } catch (e) {
    console.error("Lỗi analyzeNguHanh:", e.message);
    return res.status(400).json({ error: language === "vi" ? e.message : "Invalid Five Elements data" });
  }

  // Tính Thập Thần (nếu cần)
  let thapThanResults = {};
  if (userInput.toLowerCase().includes("thập thần") || userInput.toLowerCase().includes("ten gods")) {
    try {
      thapThanResults = tinhThapThan(tuTruParsed.ngay.split(" ")[0], tuTruParsed);
      console.log("Thập Thần:", JSON.stringify(thapThanResults, null, 2));
    } catch (e) {
      console.error("Lỗi tinhThapThan:", e.message);
      return res.status(400).json({ error: language === "vi" ? e.message : "Invalid Ten Gods data" });
    }
  }

  // Tính Thần Sát (nếu cần)
  let thanSatResults = {};
  if (userInput.toLowerCase().includes("thần sát") || userInput.toLowerCase().includes("auspicious stars") || userInput.toLowerCase().includes("sao")) {
    try {
      thanSatResults = tinhThanSat(tuTruParsed);
      console.log("Thần Sát:", JSON.stringify(thanSatResults, null, 2));
    } catch (e) {
      console.error("Lỗi tinhThanSat:", e.message);
      return res.status(400).json({ error: language === "vi" ? e.message : "Invalid Auspicious Stars data" });
    }
  }

  // Tạo câu trả lời
  if (!useOpenAI) {
    console.log("Sử dụng generateResponse vì USE_OPENAI=false");
    const answer = generateResponse(tuTruParsed, nguHanhCount, thapThanResults, dungThanHanh, userInput, messages, language);
    return res.json({ answer });
  }

  // Gọi OpenAI với prompt tối ưu
  const prompt = `
Bạn là bậc thầy Bát Tự, trả lời bằng ${language === "vi" ? "tiếng Việt" : "English"}, chi tiết, rõ ràng, mang tính thơ ca nhưng dễ hiểu. Nhật Chủ là Thiên Can của ngày sinh, không phải giờ sinh. Cấu trúc câu trả lời:
1. Tính cách: Dựa trên Nhật Chủ, mô tả chi tiết phẩm chất và điểm mạnh/yếu.
2. Nghề nghiệp: Gợi ý nghề phù hợp dựa trên Dụng Thần.
3. Màu sắc may mắn: Dựa trên Dụng Thần, gợi ý màu sắc và vật phẩm phong thủy chính xác, tránh màu sắc tương khắc với Nhật Chủ.
4. Lời khuyên: Mang tính khích lệ, cá nhân hóa dựa trên Nhật Chủ và Dụng Thần.
Chỉ đề cập Thập Thần và Thần Sát khi người dùng hỏi cụ thể (chứa "thập thần", "ten gods", "thần sát", "auspicious stars", hoặc "sao"). Phân tích:

**Tứ Trụ**: Giờ ${tuTruParsed.gio}, Ngày ${tuTruParsed.ngay}, Tháng ${tuTruParsed.thang}, Năm ${tuTruParsed.nam}
**Nhật Chủ**: ${tuTruParsed.ngay.split(" ")[0]} (Thiên Can của ngày sinh)
**Ngũ Hành**: ${Object.entries(nguHanhCount).map(([k, v]) => `${k}: ${((v / Object.values(nguHanhCount).reduce((a, b) => a + b, 0)) * 100).toFixed(2)}%`).join(", ")}
${userInput.toLowerCase().includes("thập thần") || userInput.toLowerCase().includes("ten gods") ? `**Thập Thần**: ${Object.entries(thapThanResults).map(([elem, thapThan]) => `${elem}: ${thapThan}`).join(", ")}` : ""}
${userInput.toLowerCase().includes("thần sát") || userInput.toLowerCase().includes("auspicious stars") || userInput.toLowerCase().includes("sao") ? `**Thần Sát**: ${Object.entries(thanSatResults).filter(([_, value]) => value.value.length > 0).map(([key, value]) => `${value.vi}: ${value.value.join(", ")}`).join("; ")}` : ""}
**Dụng Thần**: ${dungThanHanh.join(", ")}
**Câu hỏi**: ${userInput}

${userInput.toLowerCase().includes("tiền bạc") || userInput.toLowerCase().includes("money") ? "Phân tích tài lộc dựa trên Dụng Thần." : ""}
${userInput.toLowerCase().includes("nghề") || userInput.toLowerCase().includes("công việc") || userInput.toLowerCase().includes("sự nghiệp") || userInput.toLowerCase().includes("career") ? "Phân tích sự nghiệp dựa trên Dụng Thần." : ""}
${userInput.toLowerCase().includes("sức khỏe") || userInput.toLowerCase().includes("health") ? "Phân tích sức khỏe dựa trên ngũ hành và Dụng Thần." : ""}
${userInput.toLowerCase().includes("tình duyên") || userInput.toLowerCase().includes("hôn nhân") || userInput.toLowerCase().includes("love") || userInput.toLowerCase().includes("marriage") ? "Phân tích tình duyên/hôn nhân dựa trên Dụng Thần." : ""}
${userInput.toLowerCase().includes("con cái") || userInput.toLowerCase().includes("children") ? "Phân tích con cái dựa trên Dụng Thần." : ""}
${userInput.toLowerCase().includes("dự đoán") || userInput.toLowerCase().includes("tương lai") || userInput.toLowerCase().includes("future") ? "Câu hỏi phức tạp, hướng dẫn liên hệ app.aihuyenhoc@gmail.com hoặc Discord." : ""}
`;

  try {
    const gptRes = await callOpenAI({
      model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 1500,
      top_p: 0.9,
      frequency_penalty: 0.2,
      presence_penalty: 0.1
    });
    res.json({ answer: gptRes.choices[0].message.content });
  } catch (err) {
    console.error("GPT API error:", err.message, err.response?.data || {});
    console.log("Chuyển sang generateResponse do lỗi OpenAI");
    const answer = generateResponse(tuTruParsed, nguHanhCount, thapThanResults, dungThanHanh, userInput, messages, language);
    res.json({ answer, warning: language === "vi" ? `Không thể kết nối với OpenAI: ${err.message}` : `Failed to connect to OpenAI: ${err.message}` });
  }
});

// Xử lý lỗi toàn cục
app.use((err, req, res, next) => {
  console.error("Lỗi server:", err.stack);
  res.status(500).json({ error: language === "vi" ? "Đã xảy ra lỗi hệ thống, vui lòng thử lại sau" : "A system error occurred, please try again later" });
});

// Khởi động server
const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
server.setTimeout(120000);
