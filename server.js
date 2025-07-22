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

// Tạo câu trả lời trực tiếp
const generateResponse = (tuTru, nguHanhCount, thapThanResults, dungThan, thanSatResults, userInput, messages, language) => {
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

  // Mô tả tính cách dựa trên Nhật Chủ và Thập Thần
  const personalityDescriptions = {
    Kim: "tinh tế, nhạy bén, kiên định như vàng bạc được tôi luyện, luôn tìm kiếm sự hoàn mỹ và sắc sảo trong tư duy.",
    Mộc: "sáng tạo, linh hoạt, vươn mình như rừng xanh trước gió, mang trong mình sức sống dạt dào.",
    Hỏa: "nồng nhiệt, đam mê, rực rỡ như ngọn lửa soi đường, luôn tràn đầy năng lượng và khát khao dẫn dắt.",
    Thổ: "vững chãi, đáng tin cậy, như ngọn núi che chở, mang lại sự ổn định và nuôi dưỡng cho vạn vật.",
    Thủy: "linh hoạt, sâu sắc, như dòng sông chảy mãi, luôn thích nghi và tìm ra con đường của riêng mình."
  };
  const thapThanEffects = {
    "Thực Thần": "mang đến sự sáng tạo dạt dào, khả năng tư duy độc đáo.",
    "Thương Quan": "thêm phần quyết đoán, dám nghĩ dám làm, nhưng cần kiểm soát sự bốc đồng.",
    "Chính Ấn": "như người thầy dẫn dắt, giúp bạn học hỏi và trưởng thành qua thử thách.",
    "Thiên Ấn": "tăng cường trí tuệ và trực giác, phù hợp với các công việc đòi hỏi sự sâu sắc.",
    "Chính Tài": "mang lại sự ổn định tài chính, khả năng quản lý và tổ chức.",
    "Thiên Tài": "tạo cơ hội bất ngờ về tài lộc, phù hợp với những công việc sáng tạo.",
    "Chính Quan": "thêm phần trách nhiệm và uy tín, phù hợp với vai trò lãnh đạo.",
    "Thất Sát": "tăng tính quyết liệt, dũng cảm, nhưng cần cân bằng để tránh xung đột."
  };

  // Lọc và diễn giải Thần Sát đúng ý nghĩa
  const activeThanSat = [];
  if (thanSatResults.thienAtQuyNhan.length) activeThanSat.push(`Thiên Ất Quý Nhân: ${thanSatResults.thienAtQuyNhan.join(", ")} (quý nhân phù trợ, mang lại sự hỗ trợ từ người khác)`);
  if (thanSatResults.daoHoa.length) activeThanSat.push(`Đào Hoa: ${thanSatResults.daoHoa.join(", ")} (tăng sức hút và duyên dáng trong giao tiếp)`);
  if (thanSatResults.vanXuong.length) activeThanSat.push(`Văn Xương: ${thanSatResults.vanXuong.join(", ")} (hỗ trợ học vấn, sáng tạo)`);
  if (thanSatResults.thaiCucQuyNhan.length) activeThanSat.push(`Thái Cực Quý Nhân: ${thanSatResults.thaiCucQuyNhan.join(", ")} (tăng trí tuệ, kết nối tâm linh)`);
  if (thanSatResults.hongLoan.length) activeThanSat.push(`Hồng Loan: ${thanSatResults.hongLoan.join(", ")} (thúc đẩy tình duyên, hôn nhân)`);
  if (thanSatResults.thienDuc.length) activeThanSat.push(`Thiên Đức: ${thanSatResults.thienDuc.join(", ")} (mang phúc đức, bảo vệ)`);
  if (thanSatResults.nguyetDuc.length) activeThanSat.push(`Nguyệt Đức: ${thanSatResults.nguyetDuc.join(", ")} (tạo sự hòa hợp, ân đức)`);

  // Xây dựng câu trả lời chi tiết
  let response = `
${language === "vi" ? "Luận giải Bát Tự" : "Bazi Interpretation"}:

Như một viên ngọc quý lấp lánh giữa đất trời, Nhật Chủ ${nhatChu} (${canNguHanh[nhatChu]}) mang ánh sáng của ${personalityDescriptions[canNguHanh[nhatChu]]} 
${language === "vi" ? "Tứ Trụ:" : "Four Pillars:"} Giờ ${tuTru.gio}, Ngày ${tuTru.ngay}, Tháng ${tuTru.thang}, Năm ${tuTru.nam}
${language === "vi" ? "Ngũ Hành:" : "Five Elements:"} ${Object.entries(tyLeNguHanh).map(([k, v]) => `${k}: ${v}`).join(", ")}

${language === "vi" ? "Tính cách:" : "Personality:"}
Bạn là hiện thân của ${canNguHanh[nhatChu]}, ${personalityDescriptions[canNguHanh[nhatChu]]} 
${Object.entries(thapThanResults).map(([elem, thapThan]) => thapThanEffects[thapThan]ഗ ? `${elem} (${thapThan}): ${thapThanEffects[thapThan]}` : "").filter(Boolean).join(" ")} 
${thanSatResults.daoHoa.length ? "Đào Hoa hiện diện, ban tặng bạn sức hút tự nhiên, dễ dàng tạo thiện cảm trong giao tiếp." : ""} 

${language === "vi" ? "Dụng Thần:" : "Useful God:"}
Dụng Thần ${dungThan.join(", ")} dẫn dắt vận mệnh của bạn, giúp cân bằng và phát huy tiềm năng. Hãy để ${dungThan.join(" và ")} dẫn đường, như ánh sao soi sáng hành trình.

${language === "vi" ? "Nghề nghiệp phù hợp:" : "Suitable Careers:"}
${thapThanResults[Object.keys(thapThanResults).find(k => thapThanResults[k] === "Thực Thần")] ? "Thực Thần hiện diện, mang đến sự sáng tạo và tư duy phân tích xuất sắc." : ""} 
${thanSatResults.daoHoa.length ? "Đào Hoa mang sức hút và tài giao tiếp, phù hợp với các ngành như quan hệ công chúng, marketing, hoặc tư vấn." : ""} 
${thanSatResults.vanXuong.length ? "Văn Xương xuất hiện, học vấn và sáng tạo là chìa khóa dẫn bạn đến thành công." : ""} 
Dụng Thần ${dungThan.join(", ")} gợi ý bạn nên chọn nghề ${dungThan.includes("Mộc") ? "giáo dục, sáng tạo, nghệ thuật" : dungThan.includes("Hỏa") ? "truyền thông, marketing, lãnh đạo" : dungThan.includes("Thổ") ? "bất động sản, tài chính, quản lý" : dungThan.includes("Kim") ? "công nghệ, kỹ thuật, phân tích" : "giao tiếp, du lịch, tư vấn"}. 
Hãy chọn con đường cho phép bạn kết hợp sáng tạo và cấu trúc, như một nghệ nhân chạm khắc nên những kiệt tác từ tâm hồn.

${language === "vi" ? "Màu sắc may mắn:" : "Lucky Colors:"}
Để kích hoạt vận may, hãy ưu tiên màu sắc của Dụng Thần: ${dungThan.includes("Thổ") ? "vàng, nâu đất" : dungThan.includes("Kim") ? "trắng, bạc" : "xanh lá, đỏ, xanh dương"}. 
Sử dụng vật phẩm phong thủy như thạch anh vàng, ngọc bích, hoặc đá obsidian, và chọn hướng ${dungThan.includes("Thổ") ? "Đông Bắc" : dungThan.includes("Kim") ? "Tây" : "Đông, Nam, Bắc"} để thu hút năng lượng tích cực.

${language === "vi" ? "Thần Sát:" : "Auspicious Stars:"}
${activeThanSat.length ? `Lá số được điểm tô bởi ${activeThanSat.join("; ")}, như những ánh sao nhỏ lặng lẽ nâng đỡ hành trình của bạn.` : "Không có Thần Sát nổi bật trong lá số."}

${language === "vi" ? "Lời khuyên:" : "Advice:"}
Hãy để ${canNguHanh[nhatChu]} trong bạn như viên ngọc được mài giũa qua thử thách, luôn sáng bóng và kiên cường. Tận dụng ${thapThanResults[Object.keys(thapThanResults).find(k => thapThanResults[k] === "Thực Thần")] ? "sự sáng tạo từ Thực Thần" : "tài năng bẩm sinh"} và ${thanSatResults.daoHoa.length ? "sức hút từ Đào Hoa" : "nội lực của bạn"} để xây dựng những mối quan hệ ý nghĩa và chinh phục mục tiêu. Mỗi bước đi, hãy để Dụng Thần ${dungThan.join(", ")} dẫn đường, giúp bạn vững vàng như núi cao, rực rỡ như ánh vàng.
${language === "vi" ? "Cầu chúc bạn như ngọn núi vàng quý, vận mệnh rạng ngời muôn đời!" : "May you shine like refined gold, with a destiny radiant forever!"}
`;

  if (isMoney) {
    response += `
${language === "vi" ? "Tài lộc:" : "Wealth:"}
Như ${canNguHanh[nhatChu].toLowerCase()} cần ${dungThan[0].toLowerCase()} để tỏa sáng, tài lộc của bạn phụ thuộc vào sự cân bằng của Chính Tài và Thiên Tài. ${thapThanResults[Object.keys(thapThanResults).find(k => thapThanResults[k] === "Chính Tài" || thapThanResults[k] === "Thiên Tài")] ? "Chính Tài hoặc Thiên Tài hiện diện, báo hiệu cơ hội tài chính ổn định hoặc bất ngờ." : "Tài lộc cần sự hỗ trợ từ Dụng Thần " + dungThan.join(", ") + "."} 
${language === "vi" ? "Đề xuất:" : "Suggestions:"} Chọn màu sắc như ${dungThan.includes("Thổ") ? "vàng, nâu" : dungThan.includes("Kim") ? "trắng, bạc" : "xanh lá, đỏ, xanh dương"}, vật phẩm như thạch anh vàng hoặc ngọc bích, và hướng ${dungThan.includes("Thổ") ? "Đông Bắc" : dungThan.includes("Kim") ? "Tây" : "Bắc"} để thu hút tài lộc.
${language === "vi" ? "Cầu chúc tài lộc bạn như dòng sông vàng chảy mãi, thịnh vượng muôn đời!" : "May your wealth flow like a golden river, prosperous forever!"}
`;
  } else if (isCareer) {
    response += `
${language === "vi" ? "Sự nghiệp:" : "Career:"}
Như ${canNguHanh[nhatChu].toLowerCase()} được ${dungThan[0].toLowerCase()} nâng niu, sự nghiệp của bạn cần sự hỗ trợ từ Thực Thần và Chính Quan. ${thapThanResults[Object.keys(thapThanResults).find(k => thapThanResults[k] === "Thực Thần" || thapThanResults[k] === "Chính Quan")] ? "Thực Thần hoặc Chính Quan hiện diện, mang đến sáng tạo và trách nhiệm trong công việc." : "Dụng Thần " + dungThan.join(", ") + " sẽ dẫn bạn đến con đường thành công."} 
${thanSatResults.vanXuong.length ? "Văn Xương xuất hiện, học vấn và sáng tạo là chìa khóa." : activeThanSat.includes("Đào Hoa") ? "Đào Hoa hiện diện, mang sức hút và khả năng giao tiếp, phù hợp với các nghề liên quan đến đối ngoại." : ""} 
${language === "vi" ? "Đề xuất:" : "Suggestions:"} Phù hợp với nghề ${dungThan.includes("Mộc") ? "giáo dục, sáng tạo, nghệ thuật" : dungThan.includes("Hỏa") ? "truyền thông, marketing, lãnh đạo" : dungThan.includes("Thổ") ? "bất động sản, tài chính, quản lý" : dungThan.includes("Kim") ? "công nghệ, kỹ thuật, phân tích" : "giao tiếp, du lịch, tư vấn"}. Chọn màu sắc ${dungThan.includes("Thổ") ? "vàng, nâu" : dungThan.includes("Kim") ? "trắng, bạc" : "xanh lá, đỏ, xanh dương"}, vật phẩm như thạch anh vàng hoặc ngọc bích, và hướng ${dungThan.includes("Thổ") ? "Đông Bắc" : dungThan.includes("Kim") ? "Tây" : "Đông, Nam, Bắc"}.
${language === "vi" ? "Cầu chúc sự nghiệp bạn như ngọn núi vững vàng, rực rỡ ánh vàng!" : "May your career stand like a mountain, radiant with golden light!"}
`;
  } else if (isHealth) {
    response += `
${language === "vi" ? "Sức khỏe:" : "Health:"}
Như ${canNguHanh[nhatChu].toLowerCase()} được ${dungThan[0].toLowerCase()} che chở, sức khỏe của bạn cần sự cân bằng ngũ hành. ${thapThanResults[Object.keys(thapThanResults).find(k => thapThanResults[k] === "Chính Ấn")] ? "Chính Ấn mang sự bảo vệ, giúp bạn vượt qua khó khăn về sức khỏe." : "Dụng Thần " + dungThan.join(", ") + " sẽ nuôi dưỡng cơ thể bạn."} 
${thanSatResults.thienDuc.length || thanSatResults.nguyetDuc.length ? "Thiên Đức hoặc Nguyệt Đức hiện diện, mang phúc đức bảo vệ." : ""}
${language === "vi" ? "Đề xuất:" : "Suggestions:"} Chọn màu sắc ${dungThan.includes("Thổ") ? "vàng, nâu" : dungThan.includes("Kim") ? "trắng, bạc" : "xanh lá, xanh dương"}, vật phẩm như ngọc bích hoặc đá thạch anh, và hướng ${dungThan.includes("Thổ") ? "Đông Bắc" : dungThan.includes("Kim") ? "Tây" : "Bắc"} để tăng cường sức khỏe.
${language === "vi" ? "Cầu chúc sức khỏe bạn như dòng sông trong lành, bền lâu mãi mãi!" : "May your health flow like a clear river, enduring forever!"}
`;
  } else if (isLove || isMarriage) {
    response += `
${language === "vi" ? "Tình duyên & Hôn nhân:" : "Love & Marriage:"}
Như ${canNguHanh[nhatChu].toLowerCase()} tìm thấy ${dungThan[0].toLowerCase()}, tình duyên của bạn nở hoa trong sự hòa hợp. ${thanSatResults.daoHoa.length || thanSatResults.hongLoan.length ? "Đào Hoa hoặc Hồng Loan hiện diện, mang sức hút và duyên phận." : "Dụng Thần " + dungThan.join(", ") + " sẽ dẫn bạn đến tình yêu bền vững."} 
${thapThanResults[Object.keys(thapThanResults).find(k => thapThanResults[k] === "Thực Thần")] ? "Thực Thần mang sự hòa hợp và lãng mạn." : ""}
${language === "vi" ? "Đề xuất:" : "Suggestions:"} Chọn màu sắc ${dungThan.includes("Hỏa") ? "đỏ, hồng" : dungThan.includes("Kim") ? "trắng, bạc" : "xanh lá, xanh dương"}, vật phẩm như thạch anh hồng, và hướng ${dungThan.includes("Hỏa") ? "Nam" : dungThan.includes("Kim") ? "Tây" : "Đông, Bắc"} để thu hút tình duyên.
${language === "vi" ? "Cầu chúc tình duyên bạn như hoa nở trên cành, mãi mãi rực rỡ!" : "May your love blossom like flowers on a branch, radiant forever!"}
`;
  } else if (isChildren) {
    response += `
${language === "vi" ? "Con cái:" : "Children:"}
Như ${canNguHanh[nhatChu].toLowerCase()} được ${dungThan[0].toLowerCase()} nâng niu, con cái là niềm vui rực rỡ trong đời bạn. ${thapThanResults[Object.keys(thapThanResults).find(k => thapThanResults[k] === "Thực Thần" || thapThanResults[k] === "Thương Quan")] ? "Thực Thần hoặc Thương Quan hiện diện, mang sự gắn kết với con cái." : "Dụng Thần " + dungThan.join(", ") + " sẽ mang phúc đức cho con cái."} 
${thanSatResults.thaiCucQuyNhan.length ? "Thái Cực Quý Nhân hiện diện, mang trí tuệ và phúc đức cho thế hệ sau." : ""}
${language === "vi" ? "Đề xuất:" : "Suggestions:"} Chọn màu sắc ${dungThan.includes("Thổ") ? "vàng, nâu" : dungThan.includes("Kim") ? "trắng, bạc" : "xanh lá, xanh dương"}, vật phẩm như ngọc bích, và hướng ${dungThan.includes("Thổ") ? "Đông Bắc" : dungThan.includes("Kim") ? "Tây" : "Đông"} để tăng phúc đức cho con cái.
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
  console.log("Request received:", JSON.stringify(req.body, null, 2));
  const { messages, tuTruInfo, dungThan } = req.body;
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

  // Kiểm tra Dụng Thần từ client
  const validElements = ["Mộc", "Hỏa", "Thổ", "Kim", "Thủy"];
  if (!dungThan || !Array.isArray(dungThan) || !dungThan.every(elem => validElements.includes(elem))) {
    console.error("Dụng Thần không hợp lệ:", dungThan);
    return res.status(400).json({ error: language === "vi" ? "Dụng Thần không hợp lệ hoặc thiếu" : "Invalid or missing Useful God" });
  }
  console.log("Dụng Thần từ client:", dungThan);

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
    const answer = generateResponse(tuTruParsed, nguHanhCount, thapThanResults, dungThan, thanSatResults, userInput, messages, language);
    return res.json({ answer });
  }

  // Gọi OpenAI với prompt cải tiến
  const prompt = `
Bạn là bậc thầy Bát Tự, trả lời bằng ${language === "vi" ? "tiếng Việt" : "English"}, chi tiết, thơ ca, chạm nội tâm. TẬP TRUNG vào tính cách (dựa trên Nhật Chủ và Thập Thần), nghề nghiệp phù hợp (dựa trên Thực Thần, Chính Quan, Đào Hoa, Dụng Thần), và màu sắc may mắn (dựa trên Dụng Thần). Thần Sát CHỈ là chi tiết phụ, đề cập NGẮN GỌN, sử dụng tên đầy đủ (ví dụ: Nguyệt Đức, KHÔNG viết tắt thành nguyetDuc), và DIỄN GIẢI ĐÚNG (Nguyệt Đức mang sự hòa hợp, phúc đức, KHÔNG phải xấu xa). KHÔNG nhấn mạnh Thần Sát ở đầu câu trả lời. Phân tích:
Tứ Trụ: Giờ ${tuTruParsed.gio}, Ngày ${tuTruParsed.ngay}, Tháng ${tuTruParsed.thang}, Năm ${tuTruParsed.nam}
Ngũ Hành: ${Object.entries(nguHanhCount).map(([k, v]) => `${k}: ${((v / Object.values(nguHanhCount).reduce((a, b) => a + b, 0)) * 100).toFixed(2)}%`).join(", ")}
Thập Thần: ${Object.entries(thapThanResults).map(([elem, thapThan]) => `${elem}: ${thapThan}`).join(", ")}
Dụng Thần: ${dungThan.join(", ")} (Được cung cấp từ client)
Thần Sát: ${Object.entries(thanSatResults).filter(([_, value]) => value.length > 0).map(([key, value]) => `${key === "nguyetDuc" ? "Nguyệt Đức" : key}: ${value.join(", ")}`).join("; ")}
Câu hỏi: ${userInput}
${userInput.includes("tiền bạc") || userInput.includes("money") ? "Phân tích tài lộc dựa trên Chính Tài, Thiên Tài và Dụng Thần." : ""}
${userInput.includes("nghề") || userInput.includes("công việc") || userInput.includes("sự nghiệp") || userInput.includes("career") ? "Phân tích sự nghiệp dựa trên Thực Thần, Chính Quan, Văn Xương, Đào Hoa, và Dụng Thần." : ""}
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
    const answer = generateResponse(tuTruParsed, nguHanhCount, thapThanResults, dungThan, thanSatResults, userInput, messages, language);
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
server.setTimeout(120000);const express = require("express");
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

// Tạo câu trả lời trực tiếp
const generateResponse = (tuTru, nguHanhCount, thapThanResults, dungThan, thanSatResults, userInput, messages, language) => {
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

  // Mô tả tính cách dựa trên Nhật Chủ và Thập Thần
  const personalityDescriptions = {
    Kim: "tinh tế, nhạy bén, kiên định như vàng bạc được tôi luyện, luôn tìm kiếm sự hoàn mỹ và sắc sảo trong tư duy.",
    Mộc: "sáng tạo, linh hoạt, vươn mình như rừng xanh trước gió, mang trong mình sức sống dạt dào.",
    Hỏa: "nồng nhiệt, đam mê, rực rỡ như ngọn lửa soi đường, luôn tràn đầy năng lượng và khát khao dẫn dắt.",
    Thổ: "vững chãi, đáng tin cậy, như ngọn núi che chở, mang lại sự ổn định và nuôi dưỡng cho vạn vật.",
    Thủy: "linh hoạt, sâu sắc, như dòng sông chảy mãi, luôn thích nghi và tìm ra con đường của riêng mình."
  };
  const thapThanEffects = {
    "Thực Thần": "mang đến sự sáng tạo dạt dào, khả năng tư duy độc đáo.",
    "Thương Quan": "thêm phần quyết đoán, dám nghĩ dám làm, nhưng cần kiểm soát sự bốc đồng.",
    "Chính Ấn": "như người thầy dẫn dắt, giúp bạn học hỏi và trưởng thành qua thử thách.",
    "Thiên Ấn": "tăng cường trí tuệ và trực giác, phù hợp với các công việc đòi hỏi sự sâu sắc.",
    "Chính Tài": "mang lại sự ổn định tài chính, khả năng quản lý và tổ chức.",
    "Thiên Tài": "tạo cơ hội bất ngờ về tài lộc, phù hợp với những công việc sáng tạo.",
    "Chính Quan": "thêm phần trách nhiệm và uy tín, phù hợp với vai trò lãnh đạo.",
    "Thất Sát": "tăng tính quyết liệt, dũng cảm, nhưng cần cân bằng để tránh xung đột."
  };

  // Lọc và diễn giải Thần Sát đúng ý nghĩa
  const activeThanSat = [];
  if (thanSatResults.thienAtQuyNhan.length) activeThanSat.push(`Thiên Ất Quý Nhân: ${thanSatResults.thienAtQuyNhan.join(", ")} (quý nhân phù trợ, mang lại sự hỗ trợ từ người khác)`);
  if (thanSatResults.daoHoa.length) activeThanSat.push(`Đào Hoa: ${thanSatResults.daoHoa.join(", ")} (tăng sức hút và duyên dáng trong giao tiếp)`);
  if (thanSatResults.vanXuong.length) activeThanSat.push(`Văn Xương: ${thanSatResults.vanXuong.join(", ")} (hỗ trợ học vấn, sáng tạo)`);
  if (thanSatResults.thaiCucQuyNhan.length) activeThanSat.push(`Thái Cực Quý Nhân: ${thanSatResults.thaiCucQuyNhan.join(", ")} (tăng trí tuệ, kết nối tâm linh)`);
  if (thanSatResults.hongLoan.length) activeThanSat.push(`Hồng Loan: ${thanSatResults.hongLoan.join(", ")} (thúc đẩy tình duyên, hôn nhân)`);
  if (thanSatResults.thienDuc.length) activeThanSat.push(`Thiên Đức: ${thanSatResults.thienDuc.join(", ")} (mang phúc đức, bảo vệ)`);
  if (thanSatResults.nguyetDuc.length) activeThanSat.push(`Nguyệt Đức: ${thanSatResults.nguyetDuc.join(", ")} (tạo sự hòa hợp, ân đức)`);

  // Xây dựng câu trả lời chi tiết
  let response = `
${language === "vi" ? "Luận giải Bát Tự" : "Bazi Interpretation"}:

Như một viên ngọc quý lấp lánh giữa đất trời, Nhật Chủ ${nhatChu} (${canNguHanh[nhatChu]}) mang ánh sáng của ${personalityDescriptions[canNguHanh[nhatChu]]} 
${language === "vi" ? "Tứ Trụ:" : "Four Pillars:"} Giờ ${tuTru.gio}, Ngày ${tuTru.ngay}, Tháng ${tuTru.thang}, Năm ${tuTru.nam}
${language === "vi" ? "Ngũ Hành:" : "Five Elements:"} ${Object.entries(tyLeNguHanh).map(([k, v]) => `${k}: ${v}`).join(", ")}

${language === "vi" ? "Tính cách:" : "Personality:"}
Bạn là hiện thân của ${canNguHanh[nhatChu]}, ${personalityDescriptions[canNguHanh[nhatChu]]} 
${Object.entries(thapThanResults).map(([elem, thapThan]) => thapThanEffects[thapThan]ഗ ? `${elem} (${thapThan}): ${thapThanEffects[thapThan]}` : "").filter(Boolean).join(" ")} 
${thanSatResults.daoHoa.length ? "Đào Hoa hiện diện, ban tặng bạn sức hút tự nhiên, dễ dàng tạo thiện cảm trong giao tiếp." : ""} 

${language === "vi" ? "Dụng Thần:" : "Useful God:"}
Dụng Thần ${dungThan.join(", ")} dẫn dắt vận mệnh của bạn, giúp cân bằng và phát huy tiềm năng. Hãy để ${dungThan.join(" và ")} dẫn đường, như ánh sao soi sáng hành trình.

${language === "vi" ? "Nghề nghiệp phù hợp:" : "Suitable Careers:"}
${thapThanResults[Object.keys(thapThanResults).find(k => thapThanResults[k] === "Thực Thần")] ? "Thực Thần hiện diện, mang đến sự sáng tạo và tư duy phân tích xuất sắc." : ""} 
${thanSatResults.daoHoa.length ? "Đào Hoa mang sức hút và tài giao tiếp, phù hợp với các ngành như quan hệ công chúng, marketing, hoặc tư vấn." : ""} 
${thanSatResults.vanXuong.length ? "Văn Xương xuất hiện, học vấn và sáng tạo là chìa khóa dẫn bạn đến thành công." : ""} 
Dụng Thần ${dungThan.join(", ")} gợi ý bạn nên chọn nghề ${dungThan.includes("Mộc") ? "giáo dục, sáng tạo, nghệ thuật" : dungThan.includes("Hỏa") ? "truyền thông, marketing, lãnh đạo" : dungThan.includes("Thổ") ? "bất động sản, tài chính, quản lý" : dungThan.includes("Kim") ? "công nghệ, kỹ thuật, phân tích" : "giao tiếp, du lịch, tư vấn"}. 
Hãy chọn con đường cho phép bạn kết hợp sáng tạo và cấu trúc, như một nghệ nhân chạm khắc nên những kiệt tác từ tâm hồn.

${language === "vi" ? "Màu sắc may mắn:" : "Lucky Colors:"}
Để kích hoạt vận may, hãy ưu tiên màu sắc của Dụng Thần: ${dungThan.includes("Thổ") ? "vàng, nâu đất" : dungThan.includes("Kim") ? "trắng, bạc" : "xanh lá, đỏ, xanh dương"}. 
Sử dụng vật phẩm phong thủy như thạch anh vàng, ngọc bích, hoặc đá obsidian, và chọn hướng ${dungThan.includes("Thổ") ? "Đông Bắc" : dungThan.includes("Kim") ? "Tây" : "Đông, Nam, Bắc"} để thu hút năng lượng tích cực.

${language === "vi" ? "Thần Sát:" : "Auspicious Stars:"}
${activeThanSat.length ? `Lá số được điểm tô bởi ${activeThanSat.join("; ")}, như những ánh sao nhỏ lặng lẽ nâng đỡ hành trình của bạn.` : "Không có Thần Sát nổi bật trong lá số."}

${language === "vi" ? "Lời khuyên:" : "Advice:"}
Hãy để ${canNguHanh[nhatChu]} trong bạn như viên ngọc được mài giũa qua thử thách, luôn sáng bóng và kiên cường. Tận dụng ${thapThanResults[Object.keys(thapThanResults).find(k => thapThanResults[k] === "Thực Thần")] ? "sự sáng tạo từ Thực Thần" : "tài năng bẩm sinh"} và ${thanSatResults.daoHoa.length ? "sức hút từ Đào Hoa" : "nội lực của bạn"} để xây dựng những mối quan hệ ý nghĩa và chinh phục mục tiêu. Mỗi bước đi, hãy để Dụng Thần ${dungThan.join(", ")} dẫn đường, giúp bạn vững vàng như núi cao, rực rỡ như ánh vàng.
${language === "vi" ? "Cầu chúc bạn như ngọn núi vàng quý, vận mệnh rạng ngời muôn đời!" : "May you shine like refined gold, with a destiny radiant forever!"}
`;

  if (isMoney) {
    response += `
${language === "vi" ? "Tài lộc:" : "Wealth:"}
Như ${canNguHanh[nhatChu].toLowerCase()} cần ${dungThan[0].toLowerCase()} để tỏa sáng, tài lộc của bạn phụ thuộc vào sự cân bằng của Chính Tài và Thiên Tài. ${thapThanResults[Object.keys(thapThanResults).find(k => thapThanResults[k] === "Chính Tài" || thapThanResults[k] === "Thiên Tài")] ? "Chính Tài hoặc Thiên Tài hiện diện, báo hiệu cơ hội tài chính ổn định hoặc bất ngờ." : "Tài lộc cần sự hỗ trợ từ Dụng Thần " + dungThan.join(", ") + "."} 
${language === "vi" ? "Đề xuất:" : "Suggestions:"} Chọn màu sắc như ${dungThan.includes("Thổ") ? "vàng, nâu" : dungThan.includes("Kim") ? "trắng, bạc" : "xanh lá, đỏ, xanh dương"}, vật phẩm như thạch anh vàng hoặc ngọc bích, và hướng ${dungThan.includes("Thổ") ? "Đông Bắc" : dungThan.includes("Kim") ? "Tây" : "Bắc"} để thu hút tài lộc.
${language === "vi" ? "Cầu chúc tài lộc bạn như dòng sông vàng chảy mãi, thịnh vượng muôn đời!" : "May your wealth flow like a golden river, prosperous forever!"}
`;
  } else if (isCareer) {
    response += `
${language === "vi" ? "Sự nghiệp:" : "Career:"}
Như ${canNguHanh[nhatChu].toLowerCase()} được ${dungThan[0].toLowerCase()} nâng niu, sự nghiệp của bạn cần sự hỗ trợ từ Thực Thần và Chính Quan. ${thapThanResults[Object.keys(thapThanResults).find(k => thapThanResults[k] === "Thực Thần" || thapThanResults[k] === "Chính Quan")] ? "Thực Thần hoặc Chính Quan hiện diện, mang đến sáng tạo và trách nhiệm trong công việc." : "Dụng Thần " + dungThan.join(", ") + " sẽ dẫn bạn đến con đường thành công."} 
${thanSatResults.vanXuong.length ? "Văn Xương xuất hiện, học vấn và sáng tạo là chìa khóa." : activeThanSat.includes("Đào Hoa") ? "Đào Hoa hiện diện, mang sức hút và khả năng giao tiếp, phù hợp với các nghề liên quan đến đối ngoại." : ""} 
${language === "vi" ? "Đề xuất:" : "Suggestions:"} Phù hợp với nghề ${dungThan.includes("Mộc") ? "giáo dục, sáng tạo, nghệ thuật" : dungThan.includes("Hỏa") ? "truyền thông, marketing, lãnh đạo" : dungThan.includes("Thổ") ? "bất động sản, tài chính, quản lý" : dungThan.includes("Kim") ? "công nghệ, kỹ thuật, phân tích" : "giao tiếp, du lịch, tư vấn"}. Chọn màu sắc ${dungThan.includes("Thổ") ? "vàng, nâu" : dungThan.includes("Kim") ? "trắng, bạc" : "xanh lá, đỏ, xanh dương"}, vật phẩm như thạch anh vàng hoặc ngọc bích, và hướng ${dungThan.includes("Thổ") ? "Đông Bắc" : dungThan.includes("Kim") ? "Tây" : "Đông, Nam, Bắc"}.
${language === "vi" ? "Cầu chúc sự nghiệp bạn như ngọn núi vững vàng, rực rỡ ánh vàng!" : "May your career stand like a mountain, radiant with golden light!"}
`;
  } else if (isHealth) {
    response += `
${language === "vi" ? "Sức khỏe:" : "Health:"}
Như ${canNguHanh[nhatChu].toLowerCase()} được ${dungThan[0].toLowerCase()} che chở, sức khỏe của bạn cần sự cân bằng ngũ hành. ${thapThanResults[Object.keys(thapThanResults).find(k => thapThanResults[k] === "Chính Ấn")] ? "Chính Ấn mang sự bảo vệ, giúp bạn vượt qua khó khăn về sức khỏe." : "Dụng Thần " + dungThan.join(", ") + " sẽ nuôi dưỡng cơ thể bạn."} 
${thanSatResults.thienDuc.length || thanSatResults.nguyetDuc.length ? "Thiên Đức hoặc Nguyệt Đức hiện diện, mang phúc đức bảo vệ." : ""}
${language === "vi" ? "Đề xuất:" : "Suggestions:"} Chọn màu sắc ${dungThan.includes("Thổ") ? "vàng, nâu" : dungThan.includes("Kim") ? "trắng, bạc" : "xanh lá, xanh dương"}, vật phẩm như ngọc bích hoặc đá thạch anh, và hướng ${dungThan.includes("Thổ") ? "Đông Bắc" : dungThan.includes("Kim") ? "Tây" : "Bắc"} để tăng cường sức khỏe.
${language === "vi" ? "Cầu chúc sức khỏe bạn như dòng sông trong lành, bền lâu mãi mãi!" : "May your health flow like a clear river, enduring forever!"}
`;
  } else if (isLove || isMarriage) {
    response += `
${language === "vi" ? "Tình duyên & Hôn nhân:" : "Love & Marriage:"}
Như ${canNguHanh[nhatChu].toLowerCase()} tìm thấy ${dungThan[0].toLowerCase()}, tình duyên của bạn nở hoa trong sự hòa hợp. ${thanSatResults.daoHoa.length || thanSatResults.hongLoan.length ? "Đào Hoa hoặc Hồng Loan hiện diện, mang sức hút và duyên phận." : "Dụng Thần " + dungThan.join(", ") + " sẽ dẫn bạn đến tình yêu bền vững."} 
${thapThanResults[Object.keys(thapThanResults).find(k => thapThanResults[k] === "Thực Thần")] ? "Thực Thần mang sự hòa hợp và lãng mạn." : ""}
${language === "vi" ? "Đề xuất:" : "Suggestions:"} Chọn màu sắc ${dungThan.includes("Hỏa") ? "đỏ, hồng" : dungThan.includes("Kim") ? "trắng, bạc" : "xanh lá, xanh dương"}, vật phẩm như thạch anh hồng, và hướng ${dungThan.includes("Hỏa") ? "Nam" : dungThan.includes("Kim") ? "Tây" : "Đông, Bắc"} để thu hút tình duyên.
${language === "vi" ? "Cầu chúc tình duyên bạn như hoa nở trên cành, mãi mãi rực rỡ!" : "May your love blossom like flowers on a branch, radiant forever!"}
`;
  } else if (isChildren) {
    response += `
${language === "vi" ? "Con cái:" : "Children:"}
Như ${canNguHanh[nhatChu].toLowerCase()} được ${dungThan[0].toLowerCase()} nâng niu, con cái là niềm vui rực rỡ trong đời bạn. ${thapThanResults[Object.keys(thapThanResults).find(k => thapThanResults[k] === "Thực Thần" || thapThanResults[k] === "Thương Quan")] ? "Thực Thần hoặc Thương Quan hiện diện, mang sự gắn kết với con cái." : "Dụng Thần " + dungThan.join(", ") + " sẽ mang phúc đức cho con cái."} 
${thanSatResults.thaiCucQuyNhan.length ? "Thái Cực Quý Nhân hiện diện, mang trí tuệ và phúc đức cho thế hệ sau." : ""}
${language === "vi" ? "Đề xuất:" : "Suggestions:"} Chọn màu sắc ${dungThan.includes("Thổ") ? "vàng, nâu" : dungThan.includes("Kim") ? "trắng, bạc" : "xanh lá, xanh dương"}, vật phẩm như ngọc bích, và hướng ${dungThan.includes("Thổ") ? "Đông Bắc" : dungThan.includes("Kim") ? "Tây" : "Đông"} để tăng phúc đức cho con cái.
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
  console.log("Request received:", JSON.stringify(req.body, null, 2));
  const { messages, tuTruInfo, dungThan } = req.body;
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

  // Kiểm tra Dụng Thần từ client
  const validElements = ["Mộc", "Hỏa", "Thổ", "Kim", "Thủy"];
  if (!dungThan || !Array.isArray(dungThan) || !dungThan.every(elem => validElements.includes(elem))) {
    console.error("Dụng Thần không hợp lệ:", dungThan);
    return res.status(400).json({ error: language === "vi" ? "Dụng Thần không hợp lệ hoặc thiếu" : "Invalid or missing Useful God" });
  }
  console.log("Dụng Thần từ client:", dungThan);

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
    const answer = generateResponse(tuTruParsed, nguHanhCount, thapThanResults, dungThan, thanSatResults, userInput, messages, language);
    return res.json({ answer });
  }

  // Gọi OpenAI với prompt cải tiến
  const prompt = `
Bạn là bậc thầy Bát Tự, trả lời bằng ${language === "vi" ? "tiếng Việt" : "English"}, chi tiết, thơ ca, chạm nội tâm. TẬP TRUNG vào tính cách (dựa trên Nhật Chủ và Thập Thần), nghề nghiệp phù hợp (dựa trên Thực Thần, Chính Quan, Đào Hoa, Dụng Thần), và màu sắc may mắn (dựa trên Dụng Thần). Thần Sát CHỈ là chi tiết phụ, đề cập NGẮN GỌN, sử dụng tên đầy đủ (ví dụ: Nguyệt Đức, KHÔNG viết tắt thành nguyetDuc), và DIỄN GIẢI ĐÚNG (Nguyệt Đức mang sự hòa hợp, phúc đức, KHÔNG phải xấu xa). KHÔNG nhấn mạnh Thần Sát ở đầu câu trả lời. Phân tích:
Tứ Trụ: Giờ ${tuTruParsed.gio}, Ngày ${tuTruParsed.ngay}, Tháng ${tuTruParsed.thang}, Năm ${tuTruParsed.nam}
Ngũ Hành: ${Object.entries(nguHanhCount).map(([k, v]) => `${k}: ${((v / Object.values(nguHanhCount).reduce((a, b) => a + b, 0)) * 100).toFixed(2)}%`).join(", ")}
Thập Thần: ${Object.entries(thapThanResults).map(([elem, thapThan]) => `${elem}: ${thapThan}`).join(", ")}
Dụng Thần: ${dungThan.join(", ")} (Được cung cấp từ client)
Thần Sát: ${Object.entries(thanSatResults).filter(([_, value]) => value.length > 0).map(([key, value]) => `${key === "nguyetDuc" ? "Nguyệt Đức" : key}: ${value.join(", ")}`).join("; ")}
Câu hỏi: ${userInput}
${userInput.includes("tiền bạc") || userInput.includes("money") ? "Phân tích tài lộc dựa trên Chính Tài, Thiên Tài và Dụng Thần." : ""}
${userInput.includes("nghề") || userInput.includes("công việc") || userInput.includes("sự nghiệp") || userInput.includes("career") ? "Phân tích sự nghiệp dựa trên Thực Thần, Chính Quan, Văn Xương, Đào Hoa, và Dụng Thần." : ""}
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
    const answer = generateResponse(tuTruParsed, nguHanhCount, thapThanResults, dungThan, thanSatResults, userInput, messages, language);
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
