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
const canChiNguhanhInfo = `
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
  if (!input) return input;
  const parts = input.trim().split(" ");
  if (parts.length !== 2) return input;
  const can = Object.keys(heavenlyStemsMap.vi).find(k => k.toLowerCase() === parts[0].toLowerCase());
  const chi = Object.keys(earthlyBranchesMap.vi).find(k => k.toLowerCase() === parts[1].toLowerCase());
  return can && chi ? `${can} ${chi}` : input;
};

// Parse Tứ Trụ từ tiếng Anh sang tiếng Việt
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
  } catch {
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
  const baseYear = 1984;
  const index = (year - baseYear) % 60;
  const adjustedIndex = index < 0 ? index + 60 : index;
  return hoaGiap[adjustedIndex] || "Không xác định";
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

// Trích xuất Dụng Thần từ tin nhắn người dùng
const extractDungThan = (userInput, language) => {
  const nguHanhList = ["Mộc", "Hỏa", "Thổ", "Kim", "Thủy"];
  const nguHanhListEn = ["Wood", "Fire", "Earth", "Metal", "Water"];
  const userInputLower = userInput.toLowerCase();
  let dungThan = [];

  // Tìm Dụng Thần từ từ khóa "Dụng Thần" hoặc "Useful God"
  const dungThanMatch = userInputLower.match(/(?:dụng thần|useful god)\s*[:=]\s*([^\n]+)/i);
  if (dungThanMatch) {
    const elements = dungThanMatch[1].split(",").map(e => e.trim());
    dungThan = elements.filter(e => nguHanhList.includes(e) || nguHanhListEn.includes(e));
    if (language === "vi") {
      dungThan = dungThan.map(e => nguHanhList[nguHanhListEn.indexOf(e)] || e);
    } else {
      dungThan = dungThan.map(e => nguHanhListEn[nguHanhList.indexOf(e)] || e);
    }
  }

  // Nếu không tìm thấy, tìm các ngũ hành trực tiếp trong tin nhắn
  if (!dungThan.length) {
    dungThan = nguHanhList.filter(hanh => userInputLower.includes(hanh.toLowerCase()));
    if (language === "en") {
      dungThan = nguHanhListEn.filter(hanh => userInputLower.includes(hanh.toLowerCase()));
    }
  }

  return dungThan.length ? dungThan : null;
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
    Mộc: {
      Mộc: ["Tỷ Kiên", "Kiếp Tài"],
      Hỏa: ["Thực Thần", "Thương Quan"],
      Thổ: ["Chính Tài", "Thiên Tài"],
      Kim: ["Chính Quan", "Thất Sát"],
      Thủy: ["Chính Ấn", "Thiên Ấn"]
    },
    Hỏa: {
      Hỏa: ["Tỷ Kiên", "Kiếp Tài"],
      Thổ: ["Thực Thần", "Thương Quan"],
      Kim: ["Chính Tài", "Thiên Tài"],
      Thủy: ["Chính Quan", "Thất Sát"],
      Mộc: ["Chính Ấn", "Thiên Ấn"]
    },
    Thổ: {
      Thổ: ["Tỷ Kiên", "Kiếp Tài"],
      Kim: ["Thực Thần", "Thương Quan"],
      Thủy: ["Chính Tài", "Thiên Tài"],
      Mộc: ["Chính Quan", "Thất Sát"],
      Hỏa: ["Chính Ấn", "Thiên Ấn"]
    },
    Kim: {
      Kim: ["Tỷ Kiên", "Kiếp Tài"],
      Thủy: ["Thực Thần", "Thương Quan"],
      Mộc: ["Chính Tài", "Thiên Tài"],
      Hỏa: ["Chính Quan", "Thất Sát"],
      Thổ: ["Chính Ấn", "Thiên Ấn"]
    },
    Thủy: {
      Thủy: ["Tỷ Kiên", "Kiếp Tài"],
      Mộc: ["Thực Thần", "Thương Quan"],
      Hỏa: ["Chính Tài", "Thiên Tài"],
      Thổ: ["Chính Quan", "Thất Sát"],
      Kim: ["Chính Ấn", "Thiên Ấn"]
    }
  };
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

    for (const can of elements) {
      if (can === nhatChu) continue;
      const nguHanh = canNguHanh[can];
      const isCanYang = ["Giáp", "Bính", "Mậu", "Canh", "Nhâm"].includes(can);
      const index = (isYang === isCanYang) ? 0 : 1;
      thapThanResults[can] = thapThanMap[canNguHanh[nhatChu]][nguHanh][index];
    }

    for (const chi of branches) {
      const nguHanh = chiNguHanh[chi];
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
    Giáp: ["Tý"], Ất: ["Tý"], Bính: ["Dần"], Đing: ["Dần"], Mậu: ["Thìn"],
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

  if (!nhatChu || !branches.length) throw new Error("Invalid nhatChu or branches");

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
    Mộc: {
      vi: "Sáng tạo, linh hoạt, vươn mình như rừng xanh trước gió, mang trong mình sức sống dạt dào. Bạn thích khám phá và dễ thích nghi, nhưng có thể thiếu kiên nhẫn hoặc dễ bị phân tâm khi áp lực.",
      en: "Creative, adaptable, rising like a green forest in the wind, filled with vibrant life. You enjoy exploration and adapt easily, but may lack patience or become distracted under pressure."
    },
    Hỏa: {
      vi: "Nồng nhiệt, đam mê, rực rỡ như ngọn lửa soi đường, luôn tràn đầy năng lượng và khát khao dẫn dắt. Bạn dễ thu hút người khác nhưng cần kiểm soát sự bốc đồng.",
      en: "Passionate, radiant like a guiding flame, always full of energy and a desire to lead. You attract others easily but need to control impulsiveness."
    },
    Thổ: {
      vi: "Vững chãi, đáng tin cậy, như ngọn núi che chở, mang lại sự ổn định và nuôi dưỡng cho vạn vật. Bạn đáng tin nhưng đôi khi hơi bảo thủ.",
      en: "Steady, reliable, like a sheltering mountain, providing stability and nurturing all things. You are dependable but sometimes slightly stubborn."
    },
    Kim: {
      vi: "Tinh tế, nhạy bén, kiên định như vàng bạc được tôi luyện, luôn tìm kiếm sự hoàn mỹ và sắc sảo trong tư duy. Bạn yêu cái đẹp, sống tinh tế, nhưng đôi khi khắt khe với bản thân.",
      en: "Refined, perceptive, steadfast like forged gold, always seeking perfection and sharpness in thought. You love beauty, live elegantly, but can be overly critical of yourself."
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

  // Ánh xạ màu sắc và vật phẩm phong thủy theo Dụng Thần
  const luckyColors = {
    Thủy: { vi: "xanh dương, đen", en: "blue, black" },
    Mộc: { vi: "xanh lá", en: "green" },
    Hỏa: { vi: "đỏ, hồng", en: "red, pink" },
    Thổ: { vi: "vàng, nâu", en: "yellow, brown" },
    Kim: { vi: "trắng, bạc", en: "white, silver" }
  };
  const fengShuiItems = {
    Thủy: { vi: "lapis lazuli, aquamarine", en: "lapis lazuli, aquamarine" },
    Mộc: { vi: "ngọc lục bảo", en: "emerald" },
    Hỏa: { vi: "thạch anh hồng, ruby", en: "rose quartz, ruby" },
    Thổ: { vi: "thạch anh vàng, ngọc bích", en: "citrine, jade" },
    Kim: { vi: "đá mặt trăng, thạch anh trắng", en: "moonstone, white quartz" }
  };
  const directions = {
    Thủy: { vi: "Bắc", en: "North" },
    Mộc: { vi: "Đông", en: "East" },
    Hỏa: { vi: "Nam", en: "South" },
    Thổ: { vi: "Đông Bắc", en: "Northeast" },
    Kim: { vi: "Tây", en: "West" }
  };
  const careers = {
    Thủy: { vi: "nghệ thuật, nghiên cứu, tư vấn", en: "arts, research, consulting" },
    Mộc: { vi: "giáo dục, y học, thiết kế", en: "education, medicine, design" },
    Hỏa: { vi: "truyền thông, marketing, lãnh đạo", en: "media, marketing, leadership" },
    Thổ: { vi: "bất động sản, tài chính, quản lý", en: "real estate, finance, management" },
    Kim: { vi: "công nghệ, kỹ thuật, phân tích", en: "technology, engineering, analysis" }
  };

  // Tạo danh sách màu sắc, vật phẩm và hướng dựa trên Dụng Thần
  const selectedColors = dungThan.map(hanh => luckyColors[hanh]?.[language]).filter(Boolean).join(", ");
  const selectedItems = dungThan.map(hanh => fengShuiItems[hanh]?.[language]).filter(Boolean).join(", ");
  const selectedDirections = dungThan.map(hanh => directions[hanh]?.[language]).filter(Boolean).join(", ");
  const selectedCareers = dungThan.map(hanh => careers[hanh]?.[language]).filter(Boolean).join(", ");

  // Xây dựng câu trả lời
  let response = `
${language === "vi" ? "Luận giải Bát Tự" : "Bazi Interpretation"}:

${language === "vi" ? `Như cây xanh vươn mình giữa trời, Nhật Chủ ${nhatChu} (${canNguHanh[nhatChu]}) mang sức sống mãnh liệt và sự sáng tạo không ngừng.` : `Like a thriving tree under the sky, Day Master ${nhatChu} (${canNguHanh[nhatChu]}) embodies vibrant vitality and boundless creativity.`}
${language === "vi" ? "Tứ Trụ:" : "Four Pillars:"} ${language === "vi" ? `Giờ ${tuTru.gio}, Ngày ${tuTru.ngay}, Tháng ${tuTru.thang}, Năm ${tuTru.nam}` : `Hour ${tuTru.gio}, Day ${tuTru.ngay}, Month ${tuTru.thang}, Year ${tuTru.nam}`}
${language === "vi" ? "Ngũ Hành:" : "Five Elements:"}
${Object.entries(tyLeNguHanh).map(([k, v]) => `${k}: ${v}`).join("\n")}

${language === "vi" ? "Nhân cách:" : "Personality:"}
${language === "vi" ? `Bạn là hiện thân của ${canNguHanh[nhatChu]}, ${personalityDescriptions[canNguHanh[nhatChu]].vi}` : `You embody ${canNguHanh[nhatChu]}, ${personalityDescriptions[canNguHanh[nhatChu]].en}`}

${language === "vi" ? "Nghề nghiệp:" : "Careers:"}
${language === "vi" ? `Với Dụng Thần ${dungThan.join(", ")}, bạn có thể thăng tiến trong các lĩnh vực như ${selectedCareers || "phù hợp với sở trường cá nhân"}.` : `With Useful God ${dungThan.join(", ")}, you can excel in fields like ${selectedCareers || "aligned with your strengths"}.`}

${language === "vi" ? "Màu sắc may mắn:" : "Lucky Colors:"}
${language === "vi" ? `Để kích hoạt vận may, hãy ưu tiên màu sắc: ${selectedColors || "phù hợp với Dụng Thần"}. Sử dụng vật phẩm phong thủy như ${selectedItems || "tùy theo sở thích"} và hướng ${selectedDirections || "tùy theo hoàn cảnh"}.` : `To activate good fortune, prioritize colors: ${selectedColors || "aligned with Useful God"}. Use feng shui items like ${selectedItems || "based on preference"} and directions ${selectedDirections || "based on context"}.`}

${language === "vi" ? "Lời khuyên:" : "Advice:"}
${language === "vi" ? `Hãy cân bằng giữa sự nghiêm túc và linh hoạt, giữ cho tâm hồn luôn mở cửa để thu nhận những trải nghiệm mới. Sức mạnh của ${dungThan.join(", ")} sẽ dẫn dắt bạn đến thành công nếu biết tận dụng chúng một cách khôn ngoan.` : `Balance seriousness with flexibility, keeping your spirit open to new experiences. The strength of ${dungThan.join(", ")} will guide you to success if used wisely.`}
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
    const activeThanSat = Object.entries(thanSatResults)
      .filter(([_, value]) => value.value.length)
      .map(([key, value]) => `${value[language]}: ${value.value.join(", ")} (${thanSatDescriptions[key][language]})`);
    response += `
${language === "vi" ? "Thần Sát:" : "Auspicious Stars:"}
${activeThanSat.length ? activeThanSat.join("\n") : language === "vi" ? "Không có Thần Sát nổi bật trong lá số." : "No prominent Auspicious Stars in the chart."}
`;
  }

  // Phân tích bổ sung dựa trên câu hỏi
  if (isMoney) {
    response += `
${language === "vi" ? "Tài lộc:" : "Wealth:"}
${language === "vi" ? `Như ${canNguHanh[nhatChu].toLowerCase()} cần ${dungThan[0].toLowerCase()} để tỏa sáng, tài lộc của bạn phụ thuộc vào sự cân bằng của Dụng Thần.` : `As ${canNguHanh[nhatChu].toLowerCase()} needs ${dungThan[0].toLowerCase()} to shine, your wealth depends on the balance of Useful God.`}
${language === "vi" ? `Đề xuất: Chọn màu sắc như ${selectedColors || "phù hợp với Dụng Thần"}, vật phẩm như ${selectedItems || "tùy theo sở thích"}, và hướng ${selectedDirections || "tùy theo hoàn cảnh"} để thu hút tài lộc.` : `Suggestions: Choose colors like ${selectedColors || "aligned with Useful God"}, items like ${selectedItems || "based on preference"}, and direction ${selectedDirections || "based on context"} to attract wealth.`}
`;
  } else if (isCareer) {
    response += `
${language === "vi" ? "Sự nghiệp:" : "Career:"}
${language === "vi" ? `Như ${canNguHanh[nhatChu].toLowerCase()} được ${dungThan[0].toLowerCase()} nâng niu, sự nghiệp của bạn cần sự hỗ trợ từ Dụng Thần.` : `As ${canNguHanh[nhatChu].toLowerCase()} is nurtured by ${dungThan[0].toLowerCase()}, your career needs support from Useful God.`}
${language === "vi" ? `Phù hợp với nghề ${selectedCareers || "phù hợp với sở trường cá nhân"}.` : `Suitable for careers in ${selectedCareers || "aligned with your strengths"}.`}
`;
  } else if (isHealth) {
    response += `
${language === "vi" ? "Sức khỏe:" : "Health:"}
${language === "vi" ? `Như ${canNguHanh[nhatChu].toLowerCase()} được ${dungThan[0].toLowerCase()} che chở, sức khỏe của bạn cần sự cân bằng của Dụng Thần.` : `As ${canNguHanh[nhatChu].toLowerCase()} is protected by ${dungThan[0].toLowerCase()}, your health requires balance of Useful God.`}
${language === "vi" ? `Đề xuất: Chọn màu sắc ${selectedColors || "phù hợp với Dụng Thần"}, vật phẩm như ${selectedItems || "tùy theo sở thích"}, và hướng ${selectedDirections || "tùy theo hoàn cảnh"}.` : `Suggestions: Choose colors ${selectedColors || "aligned with Useful God"}, items like ${selectedItems || "based on preference"}, and direction ${selectedDirections || "based on context"}.`}
`;
  } else if (isLove || isMarriage) {
    response += `
${language === "vi" ? "Tình duyên & Hôn nhân:" : "Love & Marriage:"}
${language === "vi" ? `Như ${canNguHanh[nhatChu].toLowerCase()} tìm thấy ${dungThan[0].toLowerCase()}, tình duyên của bạn nở hoa trong sự hòa hợp.` : `As ${canNguHanh[nhatChu].toLowerCase()} finds ${dungThan[0].toLowerCase()}, your love blossoms in harmony.`}
${language === "vi" ? `Đề xuất: Chọn màu sắc ${selectedColors || "phù hợp với Dụng Thần"}, vật phẩm như ${selectedItems || "tùy theo sở thích"}, và hướng ${selectedDirections || "tùy theo hoàn cảnh"}.` : `Suggestions: Choose colors ${selectedColors || "aligned with Useful God"}, items like ${selectedItems || "based on preference"}, and direction ${selectedDirections || "based on context"}.`}
`;
  } else if (isChildren) {
    response += `
${language === "vi" ? "Con cái:" : "Children:"}
${language === "vi" ? `Như ${canNguHanh[nhatChu].toLowerCase()} được ${dungThan[0].toLowerCase()} nâng niu, con cái là niềm vui rực rỡ trong đời bạn.` : `As ${canNguHanh[nhatChu].toLowerCase()} is nurtured by ${dungThan[0].toLowerCase()}, your children bring radiant joy to your life.`}
${language === "vi" ? `Đề xuất: Chọn màu sắc ${selectedColors || "phù hợp với Dụng Thần"}, vật phẩm như ${selectedItems || "tùy theo sở thích"}, và hướng ${selectedDirections || "tùy theo hoàn cảnh"}.` : `Suggestions: Choose colors ${selectedColors || "aligned with Useful God"}, items like ${selectedItems || "based on preference"}, and direction ${selectedDirections || "based on context"}.`}
`;
  }

  return response;
};

// Kiểm tra API key
const checkOpenAIKey = async () => {
  try {
    console.log("Checking OpenAI API key...");
    const response = await axios.get("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 10000
    });
    console.log("API key valid. Available models:", response.data.data.map(m => m.id));
    const hasModel = response.data.data.some(m => m.id.includes("gpt-3.5-turbo"));
    if (!hasModel) {
      console.error("Model gpt-3.5-turbo not available with this API key");
      return false;
    }
    return true;
  } catch (err) {
    console.error("Error checking API key:", {
      message: err.message,
      code: err.code,
      response: err.response?.data || {},
      status: err.response?.status
    });
    return false;
  }
};

// Gọi API OpenAI
const callOpenAI = async (payload, retries = 5, delay = 3000) => {
  if (!process.env.OPENAI_API_KEY) {
    console.error("Error: OPENAI_API_KEY not configured in .env");
    throw new Error("Missing OpenAI API key");
  }

  if (!payload.model || !payload.messages || !Array.isArray(payload.messages) || !payload.messages.every(msg => msg.role && typeof msg.content === "string")) {
    console.error("Invalid payload:", JSON.stringify(payload, null, 2));
    throw new Error("Invalid payload format");
  }

  const isKeyValid = await checkOpenAIKey();
  if (!isKeyValid) {
    throw new Error("Invalid or expired OpenAI API key");
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Attempting OpenAI call ${attempt} with model ${payload.model}...`);
      console.log("Payload:", JSON.stringify(payload, null, 2));
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        payload,
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 60000 // 60-second timeout
        }
      );
      console.log("OpenAI call successful:", response.data.id);
      return response.data;
    } catch (err) {
      console.error(`Retry attempt ${attempt} failed:`, {
        message: err.message,
        code: err.code,
        response: err.response?.data || {},
        status: err.response?.status,
        headers: err.response?.headers || {}
      });
      if (err.response?.data?.error?.message) {
        console.error("OpenAI error details:", err.response.data.error.message);
      }
      if (attempt === retries) {
        console.error("Exhausted retries, falling back to generateResponse");
        throw new Error(`Failed to connect to OpenAI after ${retries} retries: ${err.message}`);
      }
      console.log(`Waiting ${delay * attempt}ms before retry ${attempt + 1}`);
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
};

// API luận giải Bát Tự
app.post("/api/luan-giai-bazi", async (req, res) => {
  console.log("Request received:", JSON.stringify(req.body, null, 2));
  const { messages, tuTruInfo } = req.body;
  const useOpenAI = process.env.USE_OPENAI !== "false";
  const language = messages.some(msg => /[\u00C0-\u1EF9]/.test(msg.content) || msg.content.includes("hãy") || msg.content.includes("ngày sinh")) ? "vi" : "en";

  // Kiểm tra đầu vào
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    console.error("Missing or invalid: messages");
    return res.status(400).json({ error: language === "vi" ? "Thiếu hoặc không hợp lệ: messages" : "Missing or invalid: messages" });
  }
  if (!tuTruInfo) {
    console.error("Missing tuTruInfo");
    return res.status(400).json({ error: language === "vi" ? "Thiếu tuTruInfo" : "Missing tuTruInfo" });
  }

  // Lấy tin nhắn người dùng
  const lastUserMsg = messages.slice().reverse().find(m => m.role === "user");
  const userInput = lastUserMsg ? lastUserMsg.content : "";

  // Trích xuất Dụng Thần từ tin nhắn hoặc tuTruInfo
  let dungThan = extractDungThan(userInput, language);
  let tuTruParsed = null;

  // Parse tuTruInfo
  try {
    tuTruParsed = JSON.parse(tuTruInfo);
    tuTruParsed = {
      gio: normalizeCanChi(tuTruParsed.gio),
      ngay: normalizeCanChi(tuTruParsed.ngay),
      thang: normalizeCanChi(tuTruParsed.thang),
      nam: normalizeCanChi(tuTruParsed.nam)
    };

    // Sử dụng dungThan từ tuTruInfo nếu không tìm thấy trong tin nhắn
    if (!dungThan && tuTruParsed.dungThan && tuTruParsed.dungThan.hanh) {
      console.log("Falling back to tuTruInfo.dungThan:", tuTruParsed.dungThan.hanh);
      dungThan = tuTruParsed.dungThan.hanh;
    }
  } catch (e) {
    console.error("Error parsing tuTruInfo:", e.message);
    tuTruParsed = parseEnglishTuTru(userInput);
  }

  // Kiểm tra Tứ Trụ và Dụng Thần
  if (!tuTruParsed || !tuTruParsed.nam || !tuTruParsed.thang || !tuTruParsed.ngay || !tuTruParsed.gio) {
    console.error("Tứ Trụ không hợp lệ:", tuTruInfo);
    return res.status(400).json({ error: language === "vi" ? "Tứ Trụ không hợp lệ" : "Invalid Four Pillars" });
  }
  if (!dungThan) {
    console.error("Không tìm thấy Dụng Thần trong tin nhắn hoặc tuTruInfo");
    return res.status(400).json({ error: language === "vi" ? "Vui lòng cung cấp Dụng Thần trong tin nhắn hoặc tuTruInfo" : "Please provide Useful God in the message or tuTruInfo" });
  }
  console.log("Parsed Tu Tru:", JSON.stringify(tuTruParsed, null, 2));
  console.log("Dụng Thần sử dụng:", dungThan);

  // Phân tích ngũ hành
  let nguHanhCount;
  try {
    nguHanhCount = analyzeNguHanh(tuTruParsed);
    console.log("Ngũ hành:", JSON.stringify(nguHanhCount, null, 2));
  } catch (e) {
    console.error("Error in analyzeNguHanh:", e.message);
    return res.status(400).json({ error: language === "vi" ? e.message : "Invalid Five Elements data" });
  }

  // Tính Thập Thần nếu được yêu cầu
  let thapThanResults = {};
  const isThapThan = userInput.toLowerCase().includes("thập thần") || userInput.toLowerCase().includes("ten gods");
  if (isThapThan) {
    try {
      thapThanResults = tinhThapThan(tuTruParsed.ngay.split(" ")[0], tuTruParsed);
      console.log("Thập Thần:", JSON.stringify(thapThanResults, null, 2));
    } catch (e) {
      console.error("Error in tinhThapThan:", e.message);
      return res.status(400).json({ error: language === "vi" ? e.message : "Invalid Ten Gods data" });
    }
  }

  // Tính Thần Sát nếu được yêu cầu
  let thanSatResults = {};
  const isThanSat = userInput.toLowerCase().includes("thần sát") || userInput.toLowerCase().includes("auspicious stars") || userInput.toLowerCase().includes("sao");
  if (isThanSat) {
    try {
      thanSatResults = tinhThanSat(tuTruParsed);
      console.log("Thần Sát:", JSON.stringify(thanSatResults, null, 2));
    } catch (e) {
      console.error("Error in tinhThanSat:", e.message);
      return res.status(400).json({ error: language === "vi" ? e.message : "Invalid Auspicious Stars data" });
    }
  }

  // Tạo câu trả lời nếu OpenAI bị tắt
  if (!useOpenAI) {
    console.log("Using generateResponse because USE_OPENAI=false");
    const answer = generateResponse(tuTruParsed, nguHanhCount, thapThanResults, thanSatResults, dungThan, userInput, messages, language);
    return res.json({ answer });
  }

  // Gọi OpenAI với prompt tối ưu
  const prompt = `
You are a Bazi master, responding in ${language === "vi" ? "Vietnamese" : "English"}, detailed, poetic yet clear. Day Master is the Heavenly Stem of the day, not the full pillar. Use the Useful God provided without recalculation. Response structure:
1. Personality: Based on Day Master, describe qualities and strengths/weaknesses accurately (e.g., Giáp Mộc is creative, adaptable, not "refined" like Kim).
2. Careers: Suggest careers based on Useful God (e.g., Thủy: arts, research, consulting; Mộc: education, medicine, design).
3. Lucky Colors: Select only Useful God colors (Thủy: blue, black; Mộc: green; Hỏa: red, pink; Thổ: yellow, brown; Kim: white, silver) and matching feng shui items. Avoid colors that clash with Day Master.
4. Advice: Personalize based on Day Master and Useful God, inspirational.
Include Ten Gods and Auspicious Stars only if explicitly requested (contains "thập thần", "ten gods", "thần sát", "auspicious stars", or "sao"). Show Five Elements percentages. Analysis:

**Four Pillars**: Hour ${tuTruParsed.gio}, Day ${tuTruParsed.ngay}, Month ${tuTruParsed.thang}, Year ${tuTruParsed.nam}.
**Day Master**: ${tuTruParsed.ngay.split(" ")[0]} (${canNguHanh[tuTruParsed.ngay.split(" ")[0]]}).
**Five Elements**: ${Object.entries(nguHanhCount).map(([k, v]) => `${k}: ${((v / Object.values(nguHanhCount).reduce((a, b) => a + b, 0)) * 100).toFixed(2)}%`).join(", ")}.
**Useful God**: ${dungThan.join(", ")}.
**Language**: ${language}.
**User Request**: ${userInput}.
${isThapThan ? `**Ten Gods**: ${JSON.stringify(thapThanResults)}` : ""}
${isThanSat ? `**Auspicious Stars**: ${JSON.stringify(thanSatResults)}` : ""}
`;

  try {
    const openAIResponse = await callOpenAI({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: userInput }
      ],
      max_tokens: 1000,
      temperature: 0.7
    });
    console.log("OpenAI response:", JSON.stringify(openAIResponse, null, 2));
    const answer = openAIResponse.choices[0]?.message?.content || generateResponse(tuTruParsed, nguHanhCount, thapThanResults, thanSatResults, dungThan, userInput, messages, language);
    return res.json({ answer });
  } catch (err) {
    console.error("Error calling OpenAI, falling back to generateResponse:", err.message);
    const fallbackAnswer = generateResponse(tuTruParsed, nguHanhCount, thapThanResults, thanSatResults, dungThan, userInput, messages, language);
    return res.json({ answer: fallbackAnswer, warning: language === "vi" ? `Không thể kết nối với OpenAI: ${err.message}` : `Failed to connect to OpenAI: ${err.message}` });
  }
});

// Xử lý lỗi toàn cục
app.use((err, req, res, next) => {
  console.error("Lỗi server:", err.stack);
  res.status(500).json({ error: language === "vi" ? "Đã xảy ra lỗi hệ thống, vui lòng thử lại sau" : "A system error occurred, please try again later" });
});

// Khởi động server
const port = process.env.PORT || 10000; // Use Render's default port 10000 as fallback
const host = '0.0.0.0'; // Explicitly bind to 0.0.0.0 for Render
const server = app.listen(port, host, () => {
  console.log(`Server is running on host ${host} and port ${port}`);
});
server.setTimeout(120000); // Keep 120-second timeout for Render
