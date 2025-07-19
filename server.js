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

// Tính Thần Sát
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

// Tính Dụng Thần
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
    dungThan = [nhatChuNguHanh, tuongSinh[tuongKhac[nhatChuNguHanh]]];
    lyDo = `Vì ${cachCuc}, cần hỗ trợ bằng hành của Nhật Chủ (${nhatChuNguHanh}) và hành sinh Nhật Chủ (${tuongSinh[tuongKhac[nhatChuNguHanh]]}).`;
  }

  return { dungThan, lyDo, cachCuc };
};

// Tạo câu trả lời trực tiếp
const generateResponse = (tuTru, nguHanhCount, thapThanResults, dungThanResult, thanSatResults, userInput, messages, language) => {
  const totalElements = Object.values(nguHanhCount).reduce((a, b) => a + b, 0);
  const tyLeNguHanh = Object.fromEntries(
    Object.entries(nguHanhCount).map(([k, v]) => [k, `${((v / totalElements) * 100).toFixed(2)}%`])
  );
  const nhatChu = tuTru.ngay.split(" ")[0];
  const canNguHanh = { Giáp: "Mộc", Ất: "Mộc", Bính: "Hỏa", Đinh: "Hỏa", Mậu: "Thổ", Kỷ: "Thổ", Canh: "Kim", Tân: "Kim", Nhâm: "Thủy", Quý: "Thủy" };
  const userInputLower = userInput.toLowerCase();

  // Xác định loại câu hỏi
  const isMoney = userInputLower.includes("tiền bạc") || userInputLower.includes("tài chính") || userInputLower.includes("money") || userInputLower.includes("finance");
  const isCareer = userInputLower.includes("nghề") || userInputLower.includes("công việc") || userInputLower.includes("sự nghiệp") || userInputLower.includes("career") || userInputLower.includes("job");
  const isHealth = userInputLower.includes("sức khỏe") || userInputLower.includes("bệnh tật") || userInputLower.includes("health");
  const isLove = userInputLower.includes("tình duyên") || userInputLower.includes("tình yêu") || userInputLower.includes("love");
  const isMarriage = userInputLower.includes("hôn nhân") || userInputLower.includes("marriage");
  const isChildren = userInputLower.includes("con cái") || userInputLower.includes("children");
  const isComplex = userInputLower.includes("dự đoán") || userInputLower.includes("tương lai") || userInputLower.includes("future") || userInputLower.includes("đại vận");

  // Xử lý câu hỏi phức tạp
  if (isComplex) {
    return `
${language === "vi" ? "Luận giải Bát Tự" : "Bazi Interpretation"}:
${language === "vi" ? "Câu hỏi của bạn liên quan đến các vấn đề phức tạp như dự đoán tương lai hoặc đại vận, cần phân tích chi tiết hơn. Vui lòng gửi câu hỏi qua email app.aihuyenhoc@gmail.com hoặc tham gia cộng đồng Discord (xem thông tin ứng dụng) để được hỗ trợ chuyên sâu." : "Your question involves complex matters like future predictions or major life cycles, requiring detailed analysis. Please send your question to app.aihuyenhoc@gmail.com or join our Discord community (see app details) for in-depth support."}
    `;
  }

  // Lọc chỉ các Thần Sát có trong lá số
  const activeThanSat = [];
  if (thanSatResults.thienAtQuyNhan.length) activeThanSat.push(`Thiên Ất Quý Nhân: ${thanSatResults.thienAtQuyNhan.join(", ")} (quý nhân phù trợ)`);
  if (thanSatResults.daoHoa.length) activeThanSat.push(`Đào Hoa: ${thanSatResults.daoHoa.join(", ")} (tình duyên, sức hút)`);
  if (thanSatResults.vanXuong.length) activeThanSat.push(`Văn Xương: ${thanSatResults.vanXuong.join(", ")} (học vấn, sáng tạo)`);
  if (thanSatResults.thaiCucQuyNhan.length) activeThanSat.push(`Thái Cực Quý Nhân: ${thanSatResults.thaiCucQuyNhan.join(", ")} (trí tuệ, tâm linh)`);
  if (thanSatResults.hongLoan.length) activeThanSat.push(`Hồng Loan: ${thanSatResults.hongLoan.join(", ")} (hôn nhân, tình duyên)`);
  if (thanSatResults.thienDuc.length) activeThanSat.push(`Thiên Đức: ${thanSatResults.thienDuc.join(", ")} (phúc đức, bảo vệ)`);
  if (thanSatResults.nguyetDuc.length) activeThanSat.push(`Nguyệt Đức: ${thanSatResults.nguyetDuc.join(", ")} (hòa hợp, ân đức)`);

  // Xây dựng câu trả lời chi tiết
  let response = `
${language === "vi" ? "Luận giải Bát Tự" : "Bazi Interpretation"}:
${language === "vi" ? "Tứ Trụ:" : "Four Pillars:"} Giờ ${tuTru.gio}, Ngày ${tuTru.ngay}, Tháng ${tuTru.thang}, Năm ${tuTru.nam}
${language === "vi" ? "Ngũ Hành:" : "Five Elements:"} ${Object.entries(tyLeNguHanh).map(([k, v]) => `${k}: ${v}`).join(", ")}
${language === "vi" ? "Thập Thần:" : "Ten Gods:"} ${Object.entries(thapThanResults).map(([elem, thapThan]) => `${elem}: ${thapThan}`).join(", ")}
${language === "vi" ? "Dụng Thần:" : "Useful God:"} ${dungThanResult.dungThan.join(", ")} (${dungThanResult.lyDo})
${language === "vi" ? "Thần Sát:" : "Auspicious Stars:"}
${activeThanSat.length ? activeThanSat.join("\n") : "Không có Thần Sát nổi bật trong lá số."}

${language === "vi" ? "Phân tích tổng quan:" : "Overall Analysis:"}
Nhật Chủ ${nhatChu} (${canNguHanh[nhatChu]}) như ${canNguHanh[nhatChu].toLowerCase()} lấp lánh giữa đất trời, mang trong mình sức sống của ${canNguHanh[nhatChu].toLowerCase() === "mộc" ? "rừng xanh vươn mình trong gió" : canNguHanh[nhatChu].toLowerCase() === "hỏa" ? "ngọn lửa rực cháy soi đường" : canNguHanh[nhatChu].toLowerCase() === "thổ" ? "ngọn núi vững chãi che chở" : canNguHanh[nhatChu].toLowerCase() === "kim" ? "vàng quý tinh luyện" : "dòng sông linh hoạt chảy mãi"}. 
Ngũ hành trong lá số như bức tranh sinh động: Mộc là rừng xanh, Hỏa là ngọn lửa, Thổ là núi cao, Kim là vàng bạc, Thủy là dòng sông. Tỷ lệ: ${Object.entries(tyLeNguHanh).map(([k, v]) => `${k}: ${v}`).join(", ")}.
Vận mệnh của bạn là hành trình khám phá bản thân, với sự kiên định và sắc bén của hành Kim. Dụng Thần ${dungThanResult.dungThan.join(", ")} như ánh sáng dẫn đường, giúp bạn vượt qua thử thách và tỏa sáng.

${language === "vi" ? "Đề xuất để may mắn hơn:" : "Suggestions for Greater Fortune:"}
- **Màu sắc**: ${dungThanResult.dungThan.includes("Thổ") ? "vàng, nâu đất" : dungThanResult.dungThan.includes("Kim") ? "trắng, bạc" : "xanh lá, đỏ, xanh dương"} để tăng cường năng lượng tích cực.
- **Vật phẩm phong thủy**: Sử dụng thạch anh vàng, ngọc bích, hoặc đá obsidian để thu hút may mắn và bảo vệ.
- **Hướng tốt**: ${dungThanResult.dungThan.includes("Thổ") ? "Đông Bắc" : dungThanResult.dungThan.includes("Kim") ? "Tây" : "Đông, Nam, Bắc"} để kích hoạt vận may.
${language === "vi" ? "Cầu chúc bạn như vàng quý tỏa sáng, vận mệnh rạng ngời muôn đời!" : "May you shine like refined gold, with a destiny radiant forever!"}
`;

  if (isMoney) {
    response += `
${language === "vi" ? "Tài lộc:" : "Wealth:"}
Như ${canNguHanh[nhatChu].toLowerCase()} cần ${dungThanResult.dungThan[0].toLowerCase()} để tỏa sáng, tài lộc của bạn phụ thuộc vào sự cân bằng của Chính Tài và Thiên Tài. ${thapThanResults[Object.keys(thapThanResults).find(k => thapThanResults[k] === "Chính Tài" || thapThanResults[k] === "Thiên Tài")] ? "Chính Tài hoặc Thiên Tài hiện diện, báo hiệu cơ hội tài chính ổn định hoặc bất ngờ." : "Tài lộc cần sự hỗ trợ từ Dụng Thần " + dungThanResult.dungThan.join(", ") + "."} 
${language === "vi" ? "Đề xuất:" : "Suggestions:"} Chọn màu sắc như ${dungThanResult.dungThan.includes("Thổ") ? "vàng, nâu" : dungThanResult.dungThan.includes("Kim") ? "trắng, bạc" : "xanh lá, đỏ, xanh dương"}, vật phẩm như thạch anh vàng hoặc ngọc bích, và hướng ${dungThanResult.dungThan.includes("Thổ") ? "Đông Bắc" : dungThanResult.dungThan.includes("Kim") ? "Tây" : "Bắc"} để thu hút tài lộc.
${language === "vi" ? "Cầu chúc tài lộc bạn như dòng sông vàng chảy mãi, thịnh vượng muôn đời!" : "May your wealth flow like a golden river, prosperous forever!"}
`;
  } else if (isCareer) {
    response += `
${language === "vi" ? "Sự nghiệp:" : "Career:"}
Như ${canNguHanh[nhatChu].toLowerCase()} được ${dungThanResult.dungThan[0].toLowerCase()} nâng niu, sự nghiệp của bạn cần sự hỗ trợ từ Thực Thần và Chính Quan. ${thapThanResults[Object.keys(thapThanResults).find(k => thapThanResults[k] === "Thực Thần" || thapThanResults[k] === "Chính Quan")] ? "Thực Thần hoặc Chính Quan hiện diện, mang đến sáng tạo và trách nhiệm trong công việc." : "Dụng Thần " + dungThanResult.dungThan.join(", ") + " sẽ dẫn bạn đến con đường thành công."} 
${thanSatResults.vanXuong.length ? "Văn Xương xuất hiện, học vấn và sáng tạo là chìa khóa." : activeThanSat.includes("Đào Hoa") ? "Đào Hoa hiện diện, mang sức hút và khả năng giao tiếp, phù hợp với các nghề liên quan đến đối ngoại." : ""} 
${language === "vi" ? "Đề xuất:" : "Suggestions:"} Phù hợp với nghề ${dungThanResult.dungThan.includes("Mộc") ? "giáo dục, sáng tạo, nghệ thuật" : dungThanResult.dungThan.includes("Hỏa") ? "truyền thông, marketing, lãnh đạo" : dungThanResult.dungThan.includes("Thổ") ? "bất động sản, tài chính, quản lý" : dungThanResult.dungThan.includes("Kim") ? "công nghệ, kỹ thuật, phân tích" : "giao tiếp, du lịch, tư vấn"}. Chọn màu sắc ${dungThanResult.dungThan.includes("Thổ") ? "vàng, nâu" : dungThanResult.dungThan.includes("Kim") ? "trắng, bạc" : "xanh lá, đỏ, xanh dương"}, vật phẩm như thạch anh vàng hoặc ngọc bích, và hướng ${dungThanResult.dungThan.includes("Thổ") ? "Đông Bắc" : dungThanResult.dungThan.includes("Kim") ? "Tây" : "Đông, Nam, Bắc"}.
${language === "vi" ? "Cầu chúc sự nghiệp bạn như ngọn núi vững vàng, rực rỡ ánh vàng!" : "May your career stand like a mountain, radiant with golden light!"}
`;
  } else if (isHealth) {
    response += `
${language === "vi" ? "Sức khỏe:" : "Health:"}
Như ${canNguHanh[nhatChu].toLowerCase()} được ${dungThanResult.dungThan[0].toLowerCase()} che chở, sức khỏe của bạn cần sự cân bằng ngũ hành. ${thapThanResults[Object.keys(thapThanResults).find(k => thapThanResults[k] === "Chính Ấn")] ? "Chính Ấn mang sự bảo vệ, giúp bạn vượt qua khó khăn về sức khỏe." : "Dụng Thần " + dungThanResult.dungThan.join(", ") + " sẽ nuôi dưỡng cơ thể bạn."} 
${thanSatResults.thienDuc.length || thanSatResults.nguyetDuc.length ? "Thiên Đức hoặc Nguyệt Đức hiện diện, mang phúc đức bảo vệ." : ""}
${language === "vi" ? "Đề xuất:" : "Suggestions:"} Chọn màu sắc ${dungThanResult.dungThan.includes("Thổ") ? "vàng, nâu" : dungThanResult.dungThan.includes("Kim") ? "trắng, bạc" : "xanh lá, xanh dương"}, vật phẩm như ngọc bích hoặc đá thạch anh, và hướng ${dungThanResult.dungThan.includes("Thổ") ? "Đông Bắc" : dungThanResult.dungThan.includes("Kim") ? "Tây" : "Bắc"} để tăng cường sức khỏe.
${language === "vi" ? "Cầu chúc sức khỏe bạn như dòng sông trong lành, bền lâu mãi mãi!" : "May your health flow like a clear river, enduring forever!"}
`;
  } else if (isLove || isMarriage) {
    response += `
${language === "vi" ? "Tình duyên & Hôn nhân:" : "Love & Marriage:"}
Như ${canNguHanh[nhatChu].toLowerCase()} tìm thấy ${dungThanResult.dungThan[0].toLowerCase()}, tình duyên của bạn nở hoa trong sự hòa hợp. ${thanSatResults.daoHoa.length || thanSatResults.hongLoan.length ? "Đào Hoa hoặc Hồng Loan hiện diện, mang sức hút và duyên phận." : "Dụng Thần " + dungThanResult.dungThan.join(", ") + " sẽ dẫn bạn đến tình yêu bền vững."} 
${thapThanResults[Object.keys(thapThanResults).find(k => thapThanResults[k] === "Thực Thần")] ? "Thực Thần mang sự hòa hợp và lãng mạn." : ""}
${language === "vi" ? "Đề xuất:" : "Suggestions:"} Chọn màu sắc ${dungThanResult.dungThan.includes("Hỏa") ? "đỏ, hồng" : dungThanResult.dungThan.includes("Kim") ? "trắng, bạc" : "xanh lá, xanh dương"}, vật phẩm như thạch anh hồng, và hướng ${dungThanResult.dungThan.includes("Hỏa") ? "Nam" : dungThanResult.dungThan.includes("Kim") ? "Tây" : "Đông, Bắc"} để thu hút tình duyên.
${language === "vi" ? "Cầu chúc tình duyên bạn như hoa nở trên cành, mãi mãi rực rỡ!" : "May your love blossom like flowers on a branch, radiant forever!"}
`;
  } else if (isChildren) {
    response += `
${language === "vi" ? "Con cái:" : "Children:"}
Như ${canNguHanh[nhatChu].toLowerCase()} được ${dungThanResult.dungThan[0].toLowerCase()} nâng niu, con cái là niềm vui rực rỡ trong đời bạn. ${thapThanResults[Object.keys(thapThanResults).find(k => thapThanResults[k] === "Thực Thần" || thapThanResults[k] === "Thương Quan")] ? "Thực Thần hoặc Thương Quan hiện diện, mang sự gắn kết với con cái." : "Dụng Thần " + dungThanResult.dungThan.join(", ") + " sẽ mang phúc đức cho con cái."} 
${thanSatResults.thaiCucQuyNhan.length ? "Thái Cực Quý Nhân hiện diện, mang trí tuệ và phúc đức cho thế hệ sau." : ""}
${language === "vi" ? "Đề xuất:" : "Suggestions:"} Chọn màu sắc ${dungThanResult.dungThan.includes("Thổ") ? "vàng, nâu" : dungThanResult.dungThan.includes("Kim") ? "trắng, bạc" : "xanh lá, xanh dương"}, vật phẩm như ngọc bích, và hướng ${dungThanResult.dungThan.includes("Thổ") ? "Đông Bắc" : dungThanResult.dungThan.includes("Kim") ? "Tây" : "Đông"} để tăng phúc đức cho con cái.
${language === "vi" ? "Cầu chúc con cái bạn như những vì sao sáng, mang niềm vui muôn đời!" : "May your children shine like stars, bringing joy forever!"}
`;
  }

  return response;
};

// Gọi API OpenAI
const callOpenAI = async (payload, retries = 5, delay = 2000) => {
  if (!process.env.OPENAI_API_KEY) {
    console.error("Lỗi: OPENAI_API_KEY không được cấu hình trong .env");
    throw new Error("Missing OpenAI API key");
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Thử gọi OpenAI lần ${attempt}...`);
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        payload,
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 20000
        }
      );
      console.log("Gọi OpenAI thành công:", response.data.id);
      return response.data;
    } catch (err) {
      console.error(`Thử lại lần ${attempt} thất bại:`, err.message, err.response?.data || {});
      if (attempt === retries) {
        console.error("Hết số lần thử, chuyển sang generateResponse");
        throw new Error("Failed to connect to OpenAI after retries");
      }
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
};

// API luận giải Bát Tự
app.post("/api/luan-giai-bazi", async (req, res) => {
  console.log("Request received:", JSON.stringify(req/body, null, 2));
  const { messages, tuTruInfo } = req.body;
  const useOpenAI = process.env.USE_OPENAI !== "false";

  if (!messages || !tuTruInfo) {
    console.error("Thiếu messages hoặc tuTruInfo");
    return res.status(400).json({ error: "Thiếu messages hoặc tuTruInfo" });
  }

  // Lấy tin nhắn người dùng
  const lastUserMsg = messages.slice().reverse().find(m => m.role === "user");
  const userInput = lastUserMsg ? lastUserMsg.content.toLowerCase() : "";
  // Xác định ngôn ngữ dựa trên toàn bộ messages
  const hasVietnamese = messages.some(msg => /[\u00C0-\u1EF9]/.test(msg.content) || msg.content.includes("hãy") || msg.content.includes("ngày sinh"));
  const language = hasVietnamese ? "vi" : "en";

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
  } catch {
    tuTruParsed = parseEnglishTuTru(userInput);
  }

  if (!tuTruParsed || !tuTruParsed.nam || !tuTruParsed.thang || !tuTruParsed.ngay || !tuTruParsed.gio) {
    console.error("Tứ Trụ không hợp lệ:", tuTruInfo);
    return res.status(400).json({ error: language === "vi" ? "Tứ Trụ không hợp lệ" : "Invalid Four Pillars" });
  }
  console.log("Parsed Tu Tru:", JSON.stringify(tuTruParsed, null, 2));

  // Phân tích ngũ hành
  let nguHanhCount;
  try {
    nguHanhCount = analyzeNguHanh(tuTruParsed);
    console.log("Ngũ hành:", JSON.stringify(nguHanhCount, null, 2));
  } catch (e) {
    console.error("Lỗi analyzeNguHanh:", e.message);
    return res.status(400).json({ error: language === "vi" ? e.message : "Invalid Five Elements data" });
  }

  // Tính Thập Thần
  let thapThanResults;
  try {
    thapThanResults = tinhThapThan(tuTruParsed.ngay.split(" ")[0], tuTruParsed);
    console.log("Thập Thần:", JSON.stringify(thapThanResults, null, 2));
  } catch (e) {
    console.error("Lỗi tinhThapThan:", e.message);
    return res.status(400).json({ error: language === "vi" ? e.message : "Invalid Ten Gods data" });
  }

  // Tính Dụng Thần
  let dungThanResult;
  try {
    dungThanResult = tinhDungThan(tuTruParsed.ngay.split(" ")[0], tuTruParsed.thang.split(" ")[1], nguHanhCount);
    console.log("Dụng Thần:", JSON.stringify(dungThanResult, null, 2));
  } catch (e) {
    console.error("Lỗi tinhDungThan:", e.message);
    return res.status(400).json({ error: language === "vi" ? e.message : "Invalid Useful God data" });
  }

  // Tính Thần Sát
  let thanSatResults;
  try {
    thanSatResults = tinhThanSat(tuTruParsed);
    console.log("Thần Sát:", JSON.stringify(thanSatResults, null, 2));
  } catch (e) {
    console.error("Lỗi tinhThanSat:", e.message);
    return res.status(400).json({ error: language === "vi" ? e.message : "Invalid Auspicious Stars data" });
  }

  // Tạo câu trả lời
  if (!useOpenAI) {
    console.log("Sử dụng generateResponse vì USE_OPENAI=false");
    const answer = generateResponse(tuTruParsed, nguHanhCount, thapThanResults, dungThanResult, thanSatResults, userInput, messages, language);
    return res.json({ answer });
  }

  // Gọi OpenAI
  const prompt = `
Bạn là bậc thầy Bát Tự, trả lời bằng ${language === "vi" ? "tiếng Việt" : "English"}, chi tiết, thơ ca, chạm nội tâm. Chỉ liệt kê các Thần Sát có trong lá số (bỏ qua những Thần Sát không xuất hiện). Phân tích:
Tứ Trụ: Giờ ${tuTruParsed.gio}, Ngày ${tuTruParsed.ngay}, Tháng ${tuTruParsed.thang}, Năm ${tuTruParsed.nam}
Ngũ Hành: ${Object.entries(nguHanhCount).map(([k, v]) => `${k}: ${((v / Object.values(nguHanhCount).reduce((a, b) => a + b, 0)) * 100).toFixed(2)}%`).join(", ")}
Thập Thần: ${Object.entries(thapThanResults).map(([elem, thapThan]) => `${elem}: ${thapThan}`).join(", ")}
Dụng Thần: ${dungThanResult.dungThan.join(", ")} (${dungThanResult.lyDo})
Thần Sát: ${Object.entries(thanSatResults).filter(([_, value]) => value.length > 0).map(([key, value]) => `${key}: ${value.join(", ")}`).join("; ")}
Câu hỏi: ${userInput}
${userInput.includes("tiền bạc") || userInput.includes("money") ? "Phân tích tài lộc dựa trên Chính Tài, Thiên Tài và Dụng Thần." : ""}
${userInput.includes("nghề") || userInput.includes("công việc") || userInput.includes("sự nghiệp") || userInput.includes("career") ? "Phân tích sự nghiệp dựa trên Thực Thần, Chính Quan, Văn Xương, Đào Hoa." : ""}
${userInput.includes("sức khỏe") || userInput.includes("health") ? "Phân tích sức khỏe dựa trên ngũ hành, Chính Ấn, Thiên Đức." : ""}
${userInput.includes("tình duyên") || userInput.includes("hôn nhân") || userInput.includes("love") || userInput.includes("marriage") ? "Phân tích tình duyên/hôn nhân dựa trên Đào Hoa, Hồng Loan, Thực Thần." : ""}
${userInput.includes("con cái") || userInput.includes("children") ? "Phân tích con cái dựa trên Thực Thần, Thương Quan, Thái Cực Quý Nhân." : ""}
${userInput.includes("dự đoán") || userInput.includes("tương lai") || userInput.includes("future") ? "Câu hỏi phức tạp, hướng dẫn liên hệ app.aihuyenhoc@gmail.com hoặc Discord." : ""}
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
    const answer = generateResponse(tuTruParsed, nguHanhCount, thapThanResults, dungThanResult, thanSatResults, userInput, messages, language);
    res.json({ answer });
  }
});

// Xử lý lỗi toàn cục
app.use((err, req, res, next) => {
  console.error("Lỗi server:", err.stack);
  res.status(500).json({ error: "Đã xảy ra lỗi hệ thống, vui lòng thử lại sau" });
});

// Khởi động server
const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
server.setTimeout(120000);
