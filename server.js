const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Set server timeout to 120 seconds
const server = app.listen(0, () => {
  const port = server.address().port;
  console.log(`Server is running on port ${port}`);
});
server.setTimeout(120000);

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Ngũ hành information for Thiên Can and Địa Chi
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

// Map Thiên Can and Địa Chi for bilingual support
const heavenlyStemsMap = {
  en: { Jia: "Giáp", Yi: "Ất", Bing: "Bính", Ding: "Đinh", Wu: "Mậu", Ji: "Kỷ", Geng: "Canh", Xin: "Tân", Ren: "Nhâm", Gui: "Quý" },
  vi: { Giáp: "Giáp", Ất: "Ất", Bính: "Bính", Đinh: "Đinh", Mậu: "Mậu", Kỷ: "Kỷ", Canh: "Canh", Tân: "Tân", Nhâm: "Nhâm", Quý: "Quý" }
};
const earthlyBranchesMap = {
  en: { Rat: "Tý", Ox: "Sửu", Tiger: "Dần", Rabbit: "Mão", Dragon: "Thìn", Snake: "Tỵ", Horse: "Ngọ", Goat: "Mùi", Monkey: "Thân", Rooster: "Dậu", Dog: "Tuất", Pig: "Hợi" },
  vi: { Tý: "Tý", Sửu: "Sửu", Dần: "Dần", Mão: "Mão", Thìn: "Thìn", Tỵ: "Tỵ", Ngọ: "Ngọ", Mùi: "Mùi", Thân: "Thân", Dậu: "Dậu", Tuất: "Tuất", Hợi: "Hợi" }
};

// Normalize Can/Chi input
const normalizeCanChi = (input) => {
  if (!input) return null;
  const parts = input.trim().split(" ");
  if (parts.length !== 2) return null;
  const can = Object.keys(heavenlyStemsMap.vi).find(k => k.toLowerCase() === parts[0].toLowerCase());
  const chi = Object.keys(earthlyBranchesMap.vi).find(k => k.toLowerCase() === parts[1].toLowerCase());
  return can && chi ? `${can} ${chi}` : null;
};

// Parse English Tứ Trụ input
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

// 60 Hoa Giáp cycle
const hoaGiap = [
  "Giáp Tý", "Ất Sửu", "Bính Dần", "Đinh Mão", "Mậu Thìn", "Kỷ Tỵ", "Canh Ngọ", "Tân Mùi", "Nhâm Thân", "Quý Dậu",
  "Giáp Tuất", "Ất Hợi", "Bính Tý", "Đinh Sửu", "Mậu Dần", "Kỷ Mão", "Canh Thìn", "Tân Tỵ", "Nhâm Ngọ", "Quý Mùi",
  "Giáp Thân", "Ất Dậu", "Bính Tuất", "Đinh Hợi", "Mậu Tý", "Kỷ Sửu", "Canh Dần", "Tân Mão", "Nhâm Thìn", "Quý Tỵ",
  "Giáp Ngọ", "Ất Mùi", "Bính Thân", "Đinh Dậu", "Mậu Tuất", "Kỷ Hợi", "Canh Tý", "Tân Sửu", "Nhâm Dần", "Quý Mão",
  "Giáp Thìn", "Ất Tỵ", "Bính Ngọ", "Đinh Mùi", "Mậu Thân", "Kỷ Dậu", "Canh Tuất", "Tân Hợi", "Nhâm Tý", "Quý Sửu",
  "Giáp Dần", "Ất Mão", "Bính Thìn", "Đinh Tỵ", "Mậu Ngọ", "Kỷ Mùi", "Canh Thân", "Tân Dậu", "Nhâm Tuất", "Quý Hợi"
];

// Get Can Chi for a year
const getCanChiForYear = (year) => {
  const baseYear = 1984;
  const index = (year - baseYear) % 60;
  const adjustedIndex = index < 0 ? index + 60 : index;
  return hoaGiap[adjustedIndex] || "Không xác định";
};

// Analyze Ngũ Hành distribution
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

// Calculate Thập Thần
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
      Kim: ["Tỷ Kiên", "Kiếp Tài"],
      Thủy: ["Thực Thần", "Thương Quan"],
      Mộc: ["Chính Tài", "Thiên Tài"],
      Hỏa: ["Chính Quan", "Thất Sát"],
      Thổ: ["Chính Ấn", "Thiên Ấn"]
    },
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

// Calculate Thần Sát
const tinhThanSat = (tuTru) => {
  const thienAtQuyNhan = {
    Giáp: ["Sửu", "Mùi"], Ất: ["Tý", "Hợi"], Bính: ["Dần", "Mão"], Đinh: ["Sửu", "Hợi"],
    Mậu: ["Tỵ", "Ngọ"], Kỷ: ["Thìn", "Tuất"], Canh: ["Thân", "Dậu"], Tân: ["Thân", "Dậu"],
    Nhâm: ["Hợi", "Tý"], Quý: ["Tý", "Hợi"]
  };
  const daoHoa = {
    Tý: "Dậu", Sửu: "Ngọ", Dần: "Mão", Mão: "Tý", Thìn: "Dậu", Tỵ: "Ngọ",
    Ngọ: "Mão", Mùi: "Tý", Thân: "Dậu", Dậu: "Ngọ", Tuất: "Mão", Hợi: "Tý"
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

  const nhatChu = tuTru.ngay?.split(" ")[0];
  const branches = [
    tuTru.nam?.split(" ")[1], tuTru.thang?.split(" ")[1],
    tuTru.ngay?.split(" ")[1], tuTru.gio?.split(" ")[1]
  ].filter(Boolean);

  if (!nhatChu || !branches.length) throw new Error("Invalid nhatChu or branches");

  return {
    thienAtQuyNhan: thienAtQuyNhan[nhatChu]?.filter(chi => branches.includes(chi)) || [],
    daoHoa: branches.includes(daoHoa[tuTru.ngay?.split(" ")[1]]) ? [daoHoa[tuTru.ngay?.split(" ")[1]]] : [],
    vanXuong: vanXuong[nhatChu]?.filter(chi => branches.includes(chi)) || [],
    thaiCucQuyNhan: thaiCucQuyNhan[nhatChu]?.filter(chi => branches.includes(chi)) || [],
    hongLoan: branches.includes(hongLoan[tuTru.ngay?.split(" ")[1]]) ? [hongLoan[tuTru.ngay?.split(" ")[1]]] : [],
    thienDuc: thienDuc[nhatChu]?.filter(chi => branches.includes(chi)) || [],
    nguyetDuc: nguyetDuc[nhatChu]?.filter(chi => branches.includes(chi)) || []
  };
};

// Calculate Dụng Thần
const tinhDungThan = (nhatChu, thangChi, nguHanhCount) => {
  const canNguHanh = {
    Giáp: "Mộc", Ất: "Mộc", Bính: "Hỏa", Đinh: "Hỏa", Mậu: "Thổ",
    Kỷ: "Thổ", Canh: "Kim", Tân: "Kim", Nhâm: "Thủy", Quý: "Thủy"
  };
  const chiNguHanh = {
    Tý: "Thủy", Hợi: "Thủy", Sửu: "Thổ", Thìn: "Thổ", Mùi: "Thổ", Tuất: "Thổ",
    Dần: "Mộc", Mão: "Mộc", Tỵ: "Hỏa", Ngọ: "Hỏa", Thân: "Kim", Dậu: "Kim"
  };
  const tuongSinh = { Mộc: "Hỏa", Hỏa: "Thổ", Thổ: "Kim", Kim: "Thủy", Thủy: "Mộc" };
  const tuongKhac = { Mộc: "Thổ", Thổ: "Thủy", Thủy: "Hỏa", Hỏa: "Kim", Kim: "Mộc" };
  const thangTrongSo = {
    Mộc: ["Dần", "Mão"], Hỏa: ["Tỵ", "Ngọ"], Thổ: ["Sửu", "Thìn", "Mùi", "Tuất"],
    Kim: ["Thân", "Dậu"], Thủy: ["Tý", "Hợi"]
  };

  if (!nhatChu || !thangChi || !canNguHanh[nhatChu] || !chiNguHanh[thangChi]) {
    throw new Error("Nhật Chủ hoặc tháng sinh không hợp lệ");
  }

  const thangHanh = chiNguHanh[thangChi];
  const nhatChuNguHanh = canNguHanh[nhatChu];
  let thanVuong = false;
  const nhatChuCount = nguHanhCount[nhatChuNguHanh] || 0;
  const khacNhatChuCount = nguHanhCount[tuongKhac[nhatChuNguHanh]] || 0;

  if (
    thangTrongSo[nhatChuNguHanh].includes(thangChi) ||
    tuongSinh[thangHanh] === nhatChuNguHanh ||
    (nhatChuCount >= 3 && khacNhatChuCount <= 1)
  ) {
    thanVuong = true;
  }

  let dungThan = [];
  let lyDo = "";
  let cachCuc = thanVuong ? "Thân Vượng" : "Thân Nhược";

  if (thanVuong) {
    dungThan = [tuongKhac[nhatChuNguHanh]];
    if (tuongKhac[tuongSinh[nhatChuNguHanh]] !== tuongKhac[nhatChuNguHanh]) {
      dungThan.push(tuongKhac[tuongSinh[nhatChuNguHanh]]);
    }
    lyDo = `Vì ${cachCuc}, cần tiết khí bằng hành khắc Nhật Chủ (${tuongKhac[nhatChuNguHanh]}) và hành tiết khí (${tuongKhac[tuongSinh[nhatChuNguHanh]] || "không có"}).`;
  } else {
    dungThan = [tuongSinh[nhatChuNguHanh], tuongSinh[tuongKhac[nhatChuNguHanh]]];
    lyDo = `Vì ${cachCuc}, cần hỗ trợ bằng hành sinh Nhật Chủ (${tuongSinh[nhatChuNguHanh]}) và hành sinh hành khắc Nhật Chủ (${tuongSinh[tuongKhac[nhatChuNguHanh]]}).`;
  }

  return { dungThan, lyDo, cachCuc };
};

// Generate direct response
const generateResponse = (tuTru, nguHanhCount, thapThanResults, dungThanResult, thanSatResults, userInput, messages, language) => {
  const totalElements = Object.values(nguHanhCount).reduce((a, b) => a + b, 0);
  const tyLeNguHanh = Object.fromEntries(
    Object.entries(nguHanhCount).map(([k, v]) => [k, `${((v / totalElements) * 100).toFixed(2)}%`])
  );
  const nhatChu = tuTru.ngay.split(" ")[0];
  const canNguHanh = { Giáp: "Mộc", Ất: "Mộc", Bính: "Hỏa", Đinh: "Hỏa", Mậu: "Thổ", Kỷ: "Thổ", Canh: "Kim", Tân: "Kim", Nhâm: "Thủy", Quý: "Thủy" };
  const userInputLower = userInput.toLowerCase();

  // Question type detection
  const isMoney = userInputLower.includes("tiền bạc") || userInputLower.includes("tài chính") || userInputLower.includes("money") || userInputLower.includes("finance");
  const isCareer = userInputLower.includes("nghề") || userInputLower.includes("công việc") || userInputLower.includes("sự nghiệp") || userInputLower.includes("career") || userInputLower.includes("job");
  const isHealth = userInputLower.includes("sức khỏe") || userInputLower.includes("bệnh tật") || userInputLower.includes("health");
  const isLove = userInputLower.includes("tình duyên") || userInputLower.includes("tình yêu") || userInputLower.includes("love");
  const isMarriage = userInputLower.includes("hôn nhân") || userInputLower.includes("marriage");
  const isChildren = userInputLower.includes("con cái") || userInputLower.includes("children");
  const isComplex = userInputLower.includes("dự đoán") || userInputLower.includes("tương lai") || userInputLower.includes("future") || userInputLower.includes("đại vận");
  const isYearAnalysis = userInputLower.includes("năm") && userInputLower.match(/\d{4}/);
  const isThanSatQuery = userInputLower.includes("vanxuong") || userInputLower.includes("văn xương");

  // Personality descriptions
  const personalityDescriptions = {
    Kim: "tinh tế, nhạy bén, kiên định như vàng bạc được tôi luyện, luôn tìm kiếm sự hoàn mỹ và sắc sảo trong tư duy.",
    Mộc: "sáng tạo, linh hoạt, vươn mình như rừng xanh trước gió, mang trong mình sức sống dạt dào.",
    Hỏa: "nồng nhiệt, đam mê, rực rỡ như ngọn lửa soi đường, luôn tràn đầy năng lượng và khát khao dẫn dắt.",
    Thổ: "vững chãi, đáng tin cậy, như ngọn núi che chở, mang lại sự ổn định và nuôi dưỡng cho vạn vật.",
    Thủy: "linh hoạt, sâu sắc, như dòng sông chảy mãi, luôn thích nghi và tìm ra con đường của riêng mình."
  };
  const thapThanEffects = {
    "Thực Thần": "mang đến sự sáng tạo, tư duy thực tiễn, giúp giải quyết vấn đề một cách tinh tế.",
    "Thương Quan": "thêm phần quyết đoán, dám nghĩ dám làm, phù hợp với các công việc sáng tạo hoặc khởi nghiệp.",
    "Chính Ấn": "như người thầy dẫn dắt, giúp bạn học hỏi và trưởng thành qua thử thách.",
    "Thiên Ấn": "tăng cường trí tuệ và trực giác, lý tưởng cho công việc nghiên cứu hoặc tâm linh.",
    "Chính Tài": "mang lại sự ổn định tài chính, khả năng quản lý và tổ chức.",
    "Thiên Tài": "tạo cơ hội bất ngờ về tài lộc, phù hợp với những công việc sáng tạo hoặc đầu tư.",
    "Chính Quan": "thêm phần trách nhiệm và uy tín, phù hợp với vai trò lãnh đạo hoặc quản lý.",
    "Thất Sát": "tăng tính quyết liệt, dũng cảm, nhưng cần cân bằng để tránh xung đột.",
    "Tỷ Kiên": "tăng ý chí tự lập, kiên cường, giúp bạn vượt qua khó khăn bằng nội lực.",
    "Kiếp Tài": "mang tính cạnh tranh, nhưng cần kiểm soát để tránh xung đột."
  };

  // Thần Sát descriptions
  const thanSatDescriptions = {
    thienAtQuyNhan: "Thiên Ất Quý Nhân: mang quý nhân phù trợ, hỗ trợ trong công việc và cuộc sống.",
    daoHoa: "Đào Hoa: tăng sức hút và duyên dáng trong giao tiếp, hỗ trợ tình duyên và quan hệ xã hội.",
    vanXuong: "Văn Xương: biểu thị trí tuệ, học vấn, sáng tạo, hỗ trợ trong giáo dục và nghệ thuật.",
    thaiCucQuyNhan: "Thái Cực Quý Nhân: tăng trí tuệ và kết nối tâm linh, mang lại sự sáng suốt.",
    hongLoan: "Hồng Loan: thúc đẩy tình duyên, hôn nhân, mang lại sự lãng mạn.",
    thienDuc: "Thiên Đức: mang phúc đức, bảo vệ, giúp vượt qua khó khăn.",
    nguyetDuc: "Nguyệt Đức: tạo sự hòa hợp, ân đức, mang lại bình an."
  };

  // Career suggestions
  const careerSuggestions = {
    Mộc: "giáo dục, sáng tạo, nghệ thuật, thiết kế, hoặc các ngành liên quan đến sự phát triển.",
    Hỏa: "truyền thông, giảng dạy, marketing, công nghệ năng lượng, hoặc các ngành cần đam mê.",
    Thổ: "bất động sản, tài chính, quản lý, hoặc các ngành cần sự ổn định.",
    Kim: "công nghệ, tài chính, phân tích dữ liệu, hoặc các ngành đòi hỏi sự chính xác.",
    Thủy: "giao tiếp, du lịch, tư vấn, hoặc các ngành cần sự linh hoạt."
  };

  // Colors and directions
  const colorDirections = {
    Mộc: { colors: "xanh lá, xanh dương", directions: "Đông, Bắc" },
    Hỏa: { colors: "đỏ, hồng", directions: "Nam" },
    Thổ: { colors: "vàng, nâu", directions: "Trung tâm, Đông Bắc" },
    Kim: { colors: "trắng, bạc", directions: "Tây" },
    Thủy: { colors: "xanh dương, đen", directions: "Bắc" }
  };

  // Generate response based on question type
  let response = "";
  if (isThanSatQuery) {
    response = `
${language === "vi" ? "Văn Xương trong Bát Tự" : "Wen Chang in Bazi"}:

Văn Xương là ngọn đèn soi sáng tri thức, biểu thị trí tuệ, học vấn, và sự sáng tạo. Trong lá số của bạn, Văn Xương xuất hiện tại ${thanSatResults.vanXuong.join(", ") || "không có"}, mang đến tư duy sắc bén và tiềm năng tỏa sáng trong giáo dục, nghệ thuật, hoặc sáng tác.

${language === "vi" ? "Đề xuất" : "Suggestions"}:  
Trau dồi học vấn, phát triển kỹ năng viết lách hoặc sáng tạo. Sử dụng màu sắc ${dungThanResult.dungThan.map(h => colorDirections[h].colors).join(" hoặc ")}, vật phẩm như thạch anh hồng, và hướng ${dungThanResult.dungThan.map(h => colorDirections[h].directions).join(" hoặc ")}.

${language === "vi" ? "Cầu chúc bạn như ngôi sao Văn Xương, tỏa sáng trên bầu trời tri thức!" : "May you shine like the Wen Chang star, radiant in the sky of wisdom!"}
`;
  } else if (isYearAnalysis) {
    const year = parseInt(userInput.match(/\d{4}/)[0]);
    const canChiYear = getCanChiForYear(year);
    const yearHanh = canChiYear.split(" ")[0] in { Bính: "Hỏa", Đinh: "Hỏa" } ? "Hỏa" : 
                     canChiYear.split(" ")[0] in { Giáp: "Mộc", Ất: "Mộc" } ? "Mộc" :
                     canChiYear.split(" ")[0] in { Mậu: "Thổ", Kỷ: "Thổ" } ? "Thổ" :
                     canChiYear.split(" ")[0] in { Canh: "Kim", Tân: "Kim" } ? "Kim" : "Thủy";
    const tuongKhac = { Mộc: "Thổ", Thổ: "Thủy", Thủy: "Hỏa", Hỏa: "Kim", Kim: "Mộc" };
    response = `
${language === "vi" ? `Luận giải năm ${year} (${canChiYear})` : `Analysis for the Year ${year} (${canChiYear})`}:

Năm ${year} (${canChiYear}, ${yearHanh}) như ${yearHanh === "Hỏa" ? "ngọn lửa rực rỡ" : yearHanh === "Mộc" ? "rừng xanh trù phú" : yearHanh === "Thổ" ? "ngọn núi vững chãi" : yearHanh === "Kim" ? "ánh bạc lấp lánh" : "dòng sông linh hoạt"}. ${yearHanh === dungThanResult.dungThan[0] || yearHanh === dungThanResult.dungThan[1] ? `Năm này hòa hợp với Dụng Thần ${yearHanh}, mang cơ hội phát triển.` : `Cần cân bằng với Dụng Thần ${dungThanResult.dungThan.join(", ")}.`}

${thapThanResults[Object.keys(thapThanResults).find(k => thapThanResults[k] === "Thực Thần")] ? "Thực Thần mang ý tưởng sáng tạo." : ""} ${thapThanResults[Object.keys(thapThanResults).find(k => thapThanResults[k] === "Thiên Tài")] ? "Thiên Tài mang cơ hội bất ngờ." : ""} ${thapThanResults[Object.keys(thapThanResults).find(k => thapThanResults[k] === "Chính Quan")] ? "Chính Quan củng cố uy tín." : ""}

${language === "vi" ? "Cơ hội và thách thức" : "Opportunities and Challenges"}:  
- ${language === "vi" ? "Cơ hội" : "Opportunities"}: ${careerSuggestions[yearHanh]} là lĩnh vực tiềm năng.  
- ${language === "vi" ? "Thách thức" : "Challenges"}: ${yearHanh === tuongKhac[canNguHanh[nhatChu]] ? `Áp lực từ ${yearHanh}, cân bằng bằng Dụng Thần.` : "Tránh làm việc quá sức."}

${language === "vi" ? "Đề xuất" : "Suggestions"}:  
Sử dụng màu sắc ${dungThanResult.dungThan.map(h => colorDirections[h].colors).join(" hoặc ")}, hướng ${dungThanResult.dungThan.map(h => colorDirections[h].directions).join(" hoặc ")}.

${language === "vi" ? `Cầu chúc năm ${year} như ${yearHanh === "Hỏa" ? "ngọn lửa thắp sáng" : "cây xanh đâm chồi"}, mang thành công rực rỡ!` : `May year ${year} bring success like ${yearHanh === "Hỏa" ? "a blazing flame" : "lush green trees"}!`}
`;
  } else if (isMarriage || isLove) {
    response = `
${language === "vi" ? "Tình duyên & Hôn nhân" : "Love & Marriage"}:

Như ${canNguHanh[nhatChu].toLowerCase()} hòa quyện cùng ${dungThanResult.dungThan[0].toLowerCase()}, tình duyên của bạn nở hoa trong sự bền vững. ${thapThanResults[Object.keys(thapThanResults).find(k => thapThanResults[k] === "Thực Thần")] ? "Thực Thần mang sự lãng mạn." : ""} ${thapThanResults[Object.keys(thapThanResults).find(k => thapThanResults[k] === "Thiên Tài")] ? "Thiên Tài mang khoảnh khắc bất ngờ." : ""} ${thapThanResults[Object.keys(thapThanResults).find(k => thapThanResults[k] === "Chính Quan")] ? "Chính Quan tăng sự tận tâm." : ""}

${language === "vi" ? "Tiềm năng và lưu ý" : "Potential and Notes"}:  
- ${language === "vi" ? "Tiềm năng" : "Potential"}: Tình cảm bền vững nhờ sự chân thành.  
- ${language === "vi" ? "Lưu ý" : "Notes"}: ${thanSatResults.daoHoa.length || thanSatResults.hongLoan.length ? "Đào Hoa/Hồng Loan tăng sức hút, nhưng cần chân thành." : "Giao tiếp cởi mở để duy trì hòa hợp."}

${language === "vi" ? "Đề xuất" : "Suggestions"}:  
Sử dụng màu sắc ${dungThanResult.dungThan.map(h => colorDirections[h].colors).join(" hoặc ")}, hướng ${dungThanResult.dungThan.map(h => colorDirections[h].directions).join(" hoặc ")}.

${language === "vi" ? `Cầu chúc tình duyên bạn như ${canNguHanh[nhatChu] === "Thổ" ? "ngọn núi ôm đất trời" : "ngọn lửa ấm áp"}, bền vững mãi mãi!` : `May your love be like ${canNguHanh[nhatChu] === "Thổ" ? "a mountain embracing the sky" : "a warm flame"}, enduring forever!`}
`;
  } else if (isCareer) {
    response = `
${language === "vi" ? "Sự nghiệp" : "Career"}:

Như ${canNguHanh[nhatChu].toLowerCase()} được ${dungThanResult.dungThan[0].toLowerCase()} nâng niu, sự nghiệp của bạn cần sáng tạo và trách nhiệm. ${thapThanResults[Object.keys(thapThanResults).find(k => thapThanResults[k] === "Thực Thần")] ? "Thực Thần mang tư duy sáng tạo." : ""} ${thapThanResults[Object.keys(thapThanResults).find(k => thapThanResults[k] === "Thiên Tài")] ? "Thiên Tài mang cơ hội bất ngờ." : ""} ${thapThanResults[Object.keys(thapThanResults).find(k => thapThanResults[k] === "Chính Quan")] ? "Chính Quan củng cố uy tín." : ""}

${thanSatResults.vanXuong.length ? "Văn Xương hỗ trợ học vấn và sáng tạo." : ""} Dụng Thần ${dungThanResult.dungThan.join(", ")} gợi ý nghề ${dungThanResult.dungThan.map(h => careerSuggestions[h]).join(" hoặc ")}.

${language === "vi" ? "Đề xuất" : "Suggestions"}:  
Sử dụng màu sắc ${dungThanResult.dungThan.map(h => colorDirections[h].colors).join(" hoặc ")}, hướng ${dungThanResult.dungThan.map(h => colorDirections[h].directions).join(" hoặc ")}. ${dungThanResult.cachCuc === "Thân Nhược" ? "Tìm hỗ trợ từ đồng nghiệp." : "Tận dụng nội lực."}

${language === "vi" ? `Cầu chúc sự nghiệp bạn như ${canNguHanh[nhatChu] === "Thổ" ? "ngọn núi vững vàng" : "ngọn lửa rực cháy"}, tỏa sáng muôn đời!` : `May your career shine like ${canNguHanh[nhatChu] === "Thổ" ? "a steadfast mountain" : "a blazing flame"}!`}
`;
  } else {
    const activeThanSat = Object.entries(thanSatResults)
      .filter(([_, value]) => value.length > 0)
      .map(([key, value]) => `${thanSatDescriptions[key]} (${value.join(", ")})`)
      .join("; ");

    response = `
${language === "vi" ? "Luận giải Bát Tự" : "Bazi Interpretation"}:

Như ${canNguHanh[nhatChu] === "Thổ" ? "ngọn núi vững chãi" : "ngọn lửa rực rỡ"}, Nhật Chủ ${nhatChu} (${canNguHanh[nhatChu]}) mang ánh sáng của ${personalityDescriptions[canNguHanh[nhatChu]]}  
${language === "vi" ? "Tứ Trụ:" : "Four Pillars:"} Giờ ${tuTru.gio}, Ngày ${tuTru.ngay}, Tháng ${tuTru.thang}, Năm ${tuTru.nam}  
${language === "vi" ? "Ngũ Hành:" : "Five Elements:"} ${Object.entries(tyLeNguHanh).map(([k, v]) => `${k}: ${v}`).join(", ")}  

${language === "vi" ? "Tính cách:" : "Personality:"}  
Bạn là hiện thân của ${canNguHanh[nhatChu]}, ${personalityDescriptions[canNguHanh[nhatChu]]} ${Object.entries(thapThanResults).map(([elem, thapThan]) => thapThanEffects[thapThan] ? `${elem} (${thapThan}): ${thapThanEffects[thapThan]}` : "").filter(Boolean).join(" ")} ${dungThanResult.cachCuc === "Thân Nhược" ? "Cách cục Thân Nhược cần hỗ trợ để tỏa sáng." : "Cách cục Thân Vượng giúp bạn chinh phục thử thách."}  

${language === "vi" ? "Cách cục:" : "Chart Pattern:"}  
Lá số thuộc cách cục ${dungThanResult.cachCuc}, cần Dụng Thần ${dungThanResult.dungThan.join(", ")}. ${dungThanResult.lyDo}  

${language === "vi" ? "Nghề nghiệp phù hợp:" : "Suitable Careers:"}  
${thapThanResults[Object.keys(thapThanResults).find(k => thapThanResults[k] === "Thực Thần")] ? "Thực Thần mang sáng tạo." : ""} ${thapThanResults[Object.keys(thapThanResults).find(k => thapThanResults[k] === "Thiên Tài")] ? "Thiên Tài mang cơ hội." : ""} ${thanSatResults.vanXuong.length ? "Văn Xương hỗ trợ học vấn." : ""} Chọn nghề ${dungThanResult.dungThan.map(h => careerSuggestions[h]).join(" hoặc ")}.  

${language === "vi" ? "Màu sắc may mắn:" : "Lucky Colors:"}  
Màu sắc: ${dungThanResult.dungThan.map(h => colorDirections[h].colors).join(" hoặc ")}. Hướng: ${dungThanResult.dungThan.map(h => colorDirections[h].directions).join(" hoặc ")}.  

${language === "vi" ? "Thần Sát:" : "Auspicious Stars:"}  
${activeThanSat.length ? `Lá số được điểm tô bởi ${activeThanSat}.` : "Không có Thần Sát nổi bật."}  

${language === "vi" ? "Lời khuyên:" : "Advice:"}  
Hãy để ${canNguHanh[nhatChu]} trong bạn như ${canNguHanh[nhatChu] === "Thổ" ? "ngọn núi vững chãi" : "ngọn lửa rực cháy"} tỏa sáng. Tận dụng ${thapThanResults[Object.keys(thapThanResults).find(k => thapThanResults[k] === "Thực Thần")] ? "sáng tạo từ Thực Thần" : "tài năng bẩm sinh"} để xây dựng tương lai.  
${language === "vi" ? `Cầu chúc bạn như ${canNguHanh[nhatChu] === "Thổ" ? "ngọn núi trường tồn" : "ngọn lửa bất diệt"}, vận mệnh rạng ngời!` : `May you shine like ${canNguHanh[nhatChu] === "Thổ" ? "a steadfast mountain" : "an eternal flame"}!`}
`;
  }

  return response.trim();
};

// Call OpenAI API with enhanced retry logic
const callOpenAI = async (tuTru, nguHanhCount, thapThanResults, dungThanResult, thanSatResults, userInput, messages, language) => {
  const prompt = `
Bạn là chuyên gia phong thủy và Bát Tự, cung cấp câu trả lời sâu sắc, thơ ca, chính xác. Dữ liệu:

- **Tứ Trụ**: Giờ ${tuTru.gio}, Ngày ${tuTru.ngay}, Tháng ${tuTru.thang}, Năm ${tuTru.nam}
- **Nhật Chủ**: ${tuTru.ngay.split(" ")[0]} (${canChiNguhanhInfo.match(new RegExp(`${tuTru.ngay.split(" ")[0]}[^:]*: ([^)]+)`))?.[1] || "Không xác định"})
- **Ngũ Hành**: ${Object.entries(nguHanhCount).map(([k, v]) => `${k}: ${((v / Object.values(nguHanhCount).reduce((a, b) => a + b, 0)) * 100).toFixed(2)}%`).join(", ")}
- **Thập Thần**: ${Object.entries(thapThanResults).map(([k, v]) => `${k}: ${v}`).join(", ")}
- **Dụng Thần**: ${dungThanResult.dungThan.join(", ")} (${dungThanResult.lyDo})
- **Cách Cục**: ${dungThanResult.cachCuc}
- **Thần Sát**: ${Object.entries(thanSatResults).filter(([_, v]) => v.length > 0).map(([k, v]) => `${k}: ${v.join(", ")}`).join("; ") || "Không có"}

**Yêu cầu**:
1. Trả lời "${userInput}" bằng văn phong thơ ca, dựa trên Nhật Chủ, Thập Thần, Dụng Thần, Thần Sát.
2. Không mặc định Nhật Chủ là Tân Kim. Phân tích dựa trên Tứ Trụ cung cấp.
3. Văn Xương là "trí tuệ, học vấn, sáng tạo".
4. Đề xuất nghề nghiệp, màu sắc, hướng theo Dụng Thần.
5. Nếu hỏi về năm cụ thể (e.g., 2026), phân tích năng lượng năm.
6. Nếu hỏi về Văn Xương, trả lời ngắn gọn, tập trung vào trí tuệ.
7. Nếu hỏi về hôn nhân, dựa trên Thực Thần, Thiên Tài, Chính Quan, không nhầm Đào Hoa/Hồng Loan.
8. Kết thúc bằng lời chúc mang hình ảnh thơ ca.

**Ngôn ngữ**: ${language === "vi" ? "Tiếng Việt" : "English"}  
**Câu hỏi**: "${userInput}"
`;

  const maxRetries = 3;
  let attempt = 0;
  const apiUrl = "https://api.openai.com/v1/chat/completions";

  while (attempt <= maxRetries) {
    try {
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("Missing OPENAI_API_KEY in environment variables");
      }

      console.log(`Attempt ${attempt + 1}: Calling OpenAI API at ${apiUrl}`);
      const response = await axios.post(
        apiUrl,
        {
          model: "gpt-4o",
          messages: [
            { role: "system", content: prompt },
            ...messages,
            { role: "user", content: userInput }
          ],
          max_tokens: 1500,
          temperature: 0.7
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json"
          },
          timeout: 15000 // 15s timeout
        }
      );
      console.log(`OpenAI API Success: Attempt ${attempt + 1}`);
      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error(`OpenAI API Attempt ${attempt + 1} Failed:`, {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: apiUrl,
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY ? '[REDACTED]' : 'MISSING'}` }
      });

      if (error.response?.status === 404) {
        console.warn("404 Error: Verify API endpoint or OpenAI service availability");
      } else if (error.response?.status === 401) {
        console.warn("401 Error: Invalid API key");
        return generateResponse(tuTru, nguHanhCount, thapThanResults, dungThanResult, thanSatResults, userInput, messages, language);
      }

      if (attempt === maxRetries) {
        console.warn("Max retries reached, falling back to generateResponse");
        return generateResponse(tuTru, nguHanhCount, thapThanResults, dungThanResult, thanSatResults, userInput, messages, language);
      }

      attempt++;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt))); // Exponential backoff: 1s, 2s, 4s
    }
  }
};

// Main API endpoint
app.post("/api/tu-tru", async (req, res) => {
  const { gio, ngay, thang, nam, userInput, messages = [], language = "vi" } = req.body;

  try {
    let tuTru = { gio, ngay, thang, nam };
    if (!tuTru.gio || !tuTru.ngay || !tuTru.thang || !tuTru.nam) {
      const parsed = parseEnglishTuTru(userInput);
      if (!parsed) {
        return res.status(400).json({ error: "Vui lòng cung cấp đầy đủ Tứ Trụ (giờ, ngày, tháng, năm)" });
      }
      tuTru = parsed;
    }

    // Validate and normalize Tứ Trụ
    tuTru.gio = normalizeCanChi(tuTru.gio);
    tuTru.ngay = normalizeCanChi(tuTru.ngay);
    tuTru.thang = normalizeCanChi(tuTru.thang);
    tuTru.nam = normalizeCanChi(tuTru.nam);

    if (!tuTru.gio || !tuTru.ngay || !tuTru.thang || !tuTru.nam) {
      return res.status(400).json({ error: "Tứ Trụ không hợp lệ. Vui lòng kiểm tra lại Can Chi." });
    }

    const nguHanhCount = analyzeNguHanh(tuTru);
    const nhatChu = tuTru.ngay.split(" ")[0];
    const thangChi = tuTru.thang.split(" ")[1];
    const thapThanResults = tinhThapThan(nhatChu, tuTru);
    const dungThanResult = tinhDungThan(nhatChu, thangChi, nguHanhCount);
    const thanSatResults = tinhThanSat(tuTru);

    const response = await callOpenAI(tuTru, nguHanhCount, thapThanResults, dungThanResult, thanSatResults, userInput, messages, language);

    res.json({ response });
  } catch (error) {
    console.error("Lỗi xử lý Tứ Trụ:", error.message);
    res.status(500).json({ error: "Đã xảy ra lỗi khi xử lý Tứ Trụ. Vui lòng kiểm tra lại thông tin." });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server Error:", err.stack);
  res.status(500).json({ error: "Lỗi server nội bộ. Vui lòng thử lại sau." });
});
