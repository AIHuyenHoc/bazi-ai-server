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
  "Giáp Thân", "Ất Dậu", "Bính Tuất", "Đinh Hợi", "Mậu Tý", "Kỷ Sutil", "Canh Dần", "Tân Mão", "Nhâm Thìn", "Quý Tỵ",
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
    "Thiên Ất Quý Nhân": { vi: "Thiên Ất Quý Nhân", en: "Nobleman Star", value: thienAtQuyNhan[nhatChu]?.filter(chi => branches.includes(chi)) || [] },
    "Đào Hoa": { vi: "Đào Hoa", en: "Peach Blossom", value: branches.includes(daoHoa[tuTru.ngay?.split(" ")[1]]) ? [daoHoa[tuTru.ngay?.split(" ")[1]]] : [] },
    "Văn Xương": { vi: "Văn Xương", en: "Literary Star", value: vanXuong[nhatChu]?.filter(chi => branches.includes(chi)) || [] },
    "Thái Cực Quý Nhân": { vi: "Thái Cực Quý Nhân", en: "Grand Ultimate Noble", value: thaiCucQuyNhan[nhatChu]?.filter(chi => branches.includes(chi)) || [] },
    "Hồng Loan": { vi: "Hồng Loan", en: "Red Phoenix", value: branches.includes(hongLoan[tuTru.ngay?.split(" ")[1]]) ? [hongLoan[tuTru.ngay?.split(" ")[1]]] : [] },
    "Thiên Đức": { vi: "Thiên Đức", en: "Heavenly Virtue", value: thienDuc[nhatChu]?.filter(chi => branches.includes(chi)) || [] },
    "Nguyệt Đức": { vi: "Nguyệt Đức", en: "Lunar Virtue", value: nguyetDuc[nhatChu]?.filter(chi => branches.includes(chi)) || [] }
  };
};

// Tạo câu trả lời trực tiếp
const generateResponse = (tuTru, nguHanhCount, thapThanResults, dungThan, thanSatResults, userInput, messages, language) => {
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

  // Xử lý câu hỏi phức tạp
  if (isComplex) {
    return `
${language === "vi" ? "Luận giải Bát Tự" : "Bazi Interpretation"}:
${language === "vi" ? "Câu hỏi của bạn liên quan đến các vấn đề phức tạp như dự đoán tương lai hoặc đại vận, cần phân tích chi tiết hơn. Vui lòng gửi câu hỏi qua email app.aihuyenhoc@gmail.com hoặc tham gia cộng đồng Discord (xem thông tin ứng dụng) để được hỗ trợ chuyên sâu." : "Your question involves complex matters like future predictions or major life cycles, requiring detailed analysis. Please send your question to app.aihuyenhoc@gmail.com or join our Discord community (see app details) for in-depth support."}
    `;
  }

  // Mô tả tính cách dựa trên Nhật Chủ và Thập Thần
  const personalityDescriptions = {
    Kim: language === "vi" ? "tinh tế, nhạy bén, kiên định như vàng bạc được tôi luyện, luôn tìm kiếm sự hoàn mỹ và sắc sảo trong tư duy." : "refined, perceptive, steadfast like forged gold, always seeking perfection and sharpness in thought.",
    Mộc: language === "vi" ? "sáng tạo, linh hoạt, vươn mình như rừng xanh trước gió, mang trong mình sức sống dạt dào." : "creative, adaptable, rising like a green forest in the wind, filled with vibrant life.",
    Hỏa: language === "vi" ? "nồng nhiệt, đam mê, rực rỡ như ngọn lửa soi đường, luôn tràn đầy năng lượng và khát khao dẫn dắt." : "passionate, radiant like a guiding flame, always full of energy and a desire to lead.",
    Thổ: language === "vi" ? "vững chãi, đáng tin cậy, như ngọn núi che chở, mang lại sự ổn định và nuôi dưỡng cho vạn vật." : "steady, reliable, like a sheltering mountain, providing stability and nurturing all things.",
    Thủy: language === "vi" ? "linh hoạt, sâu sắc, như dòng sông chảy mãi, luôn thích nghi và tìm ra con đường của riêng mình." : "fluid, profound, like a flowing river, always adapting and finding its own path."
  };
  const thapThanEffects = {
    "Thực Thần": language === "vi" ? "mang đến sự sáng tạo dạt dào, khả năng tư duy độc đáo." : "brings abundant creativity and unique thinking.",
    "Thương Quan": language === "vi" ? "thêm phần quyết đoán, dám nghĩ dám làm, nhưng cần kiểm soát sự bốc đồng." : "adds decisiveness and boldness, but requires control over impulsiveness.",
    "Chính Ấn": language === "vi" ? "như người thầy dẫn dắt, giúp bạn học hỏi và trưởng thành qua thử thách." : "like a guiding teacher, helping you learn and grow through challenges.",
    "Thiên Ấn": language === "vi" ? "tăng cường trí tuệ và trực giác, phù hợp với các công việc đòi hỏi sự sâu sắc." : "enhances wisdom and intuition, suitable for insightful work.",
    "Chính Tài": language === "vi" ? "mang lại sự ổn định tài chính, khả năng quản lý và tổ chức." : "brings financial stability, management, and organizational skills.",
    "Thiên Tài": language === "vi" ? "tạo cơ hội bất ngờ về tài lộc, phù hợp với những công việc sáng tạo." : "creates unexpected wealth opportunities, suitable for creative pursuits.",
    "Chính Quan": language === "vi" ? "thêm phần trách nhiệm và uy tín, phù hợp với vai trò lãnh đạo." : "adds responsibility and prestige, suitable for leadership roles.",
    "Thất Sát": language === "vi" ? "tăng tính quyết liệt, dũng cảm, nhưng cần cân bằng để tránh xung đột." : "increases intensity and courage, but needs balance to avoid conflicts."
  };

  // Lọc và diễn giải Thần Sát đúng ý nghĩa
  const activeThanSat = [];
  const thanSatDescriptions = {
    "Thiên Ất Quý Nhân": language === "vi" ? "quý nhân phù trợ, mang lại sự hỗ trợ từ người khác" : "noble assistance, bringing support from others",
    "Đào Hoa": language === "vi" ? "tăng sức hút và duyên dáng trong giao tiếp" : "enhances charm and grace in interactions",
    "Văn Xương": language === "vi" ? "hỗ trợ học vấn, sáng tạo" : "supports academic success and creativity",
    "Thái Cực Quý Nhân": language === "vi" ? "tăng trí tuệ, kết nối tâm linh" : "enhances wisdom and spiritual connection",
    "Hồng Loan": language === "vi" ? "thúc đẩy tình duyên, hôn nhân" : "promotes romance and marriage",
    "Thiên Đức": language === "vi" ? "mang phúc đức, bảo vệ" : "brings blessings and protection",
    "Nguyệt Đức": language === "vi" ? "tạo sự hòa hợp, ân đức" : "creates harmony and grace"
  };
  Object.keys(thanSatResults).forEach(key => {
    if (thanSatResults[key].value.length) {
      const displayName = language === "vi" ? thanSatResults[key].vi : thanSatResults[key].en;
      activeThanSat.push(`${displayName}: ${thanSatResults[key].value.join(", ")} (${thanSatDescriptions[key]})`);
    }
  });

  // Sửa lỗi cú pháp trong xử lý Thập Thần
  const thapThanDescriptions = Object.entries(thapThanResults)
    .map(([elem, thapThan]) => {
      return thapThanEffects[thapThan] ? `${elem} (${thapThan}): ${thapThanEffects[thapThan]}` : null;
    })
    .filter(Boolean)
    .join(" ");

  // Xây dựng câu trả lời chi tiết
  let response = `
${language === "vi" ? "Luận giải Bát Tự" : "Bazi Interpretation"}:

${language === "vi" ? `Như một viên ngọc quý lấp lánh giữa đất trời, Nhật Chủ ${nhatChu} (${canNguHanh[nhatChu]}) mang ánh sáng của ${personalityDescriptions[canNguHanh[nhatChu]]}` : `Like a precious gem shining between heaven and earth, Day Master ${nhatChu} (${canNguHanh[nhatChu]}) carries the light of ${personalityDescriptions[canNguHanh[nhatChu]]}`} 
${language === "vi" ? "Tứ Trụ:" : "Four Pillars:"} ${language === "vi" ? `Giờ ${tuTru.gio}, Ngày ${tuTru.ngay}, Tháng ${tuTru.thang}, Năm ${tuTru.nam}` : `Hour ${tuTru.gio}, Day ${tuTru.ngay}, Month ${tuTru.thang}, Year ${tuTru.nam}`}
${language === "vi" ? "Ngũ Hành:" : "Five Elements:"} ${Object.entries(tyLeNguHanh).map(([k, v]) => `${k}: ${v}`).join(", ")}

${language === "vi" ? "Tính cách:" : "Personality:"}
${language === "vi" ? `Bạn là hiện thân của ${canNguHanh[nhatChu]}, ${personalityDescriptions[canNguHanh[nhatChu]]}` : `You embody ${canNguHanh[nhatChu]}, ${personalityDescriptions[canNguHanh[nhatChu]]}`} 
${thapThanDescriptions.length > 0 ? thapThanDescriptions : language === "vi" ? "Không có Thập Thần nổi bật trong lá số." : "No prominent Ten Gods in the chart."} 
${thanSatResults["Đào Hoa"].value.length ? language === "vi" ? "Đào Hoa hiện diện, ban tặng bạn sức hút tự nhiên, dễ dàng tạo thiện cảm trong giao tiếp." : "Peach Blossom is present, granting you natural charm and ease in creating rapport." : ""} 

${language === "vi" ? "Dụng Thần:" : "Useful God:"}
${language === "vi" ? `Dụng Thần ${dungThan.join(", ")} dẫn dắt vận mệnh của bạn, giúp cân bằng và phát huy tiềm năng. Hãy để ${dungThan.join(" và ")} dẫn đường, như ánh sao soi sáng hành trình.` : `Useful God ${dungThan.join(", ")} guides your destiny, balancing and unleashing your potential. Let ${dungThan.join(" and ")} lead the way, like a star illuminating your journey.`}

${language === "vi" ? "Nghề nghiệp phù hợp:" : "Suitable Careers:"}
${Object.keys(thapThanResults).some(k => thapThanResults[k] === "Thực Thần") ? language === "vi" ? "Thực Thần hiện diện, mang đến sự sáng tạo và tư duy phân tích xuất sắc." : "Eating God is present, bringing creativity and exceptional analytical thinking." : ""} 
${thanSatResults["Đào Hoa"].value.length ? language === "vi" ? "Đào Hoa mang sức hút và tài giao tiếp, phù hợp với các ngành như quan hệ công chúng, marketing, hoặc tư vấn." : "Peach Blossom brings charm and communication skills, suitable for fields like public relations, marketing, or consulting." : ""} 
${thanSatResults["Văn Xương"].value.length ? language === "vi" ? "Văn Xương xuất hiện, học vấn và sáng tạo là chìa khóa dẫn bạn đến thành công." : "Literary Star appears, with academics and creativity as keys to your success." : ""} 
${language === "vi" ? `Dụng Thần ${dungThan.join(", ")} gợi ý bạn nên chọn nghề ${dungThan.includes("Mộc") ? "giáo dục, sáng tạo, nghệ thuật" : dungThan.includes("Hỏa") ? "truyền thông, marketing, lãnh đạo" : dungThan.includes("Thổ") ? "bất động sản, tài chính, quản lý" : dungThan.includes("Kim") ? "công nghệ, kỹ thuật, phân tích" : "giao tiếp, du lịch, tư vấn"}.` : `Useful God ${dungThan.join(", ")} suggests choosing careers in ${dungThan.includes("Mộc") ? "education, creativity, arts" : dungThan.includes("Hỏa") ? "media, marketing, leadership" : dungThan.includes("Thổ") ? "real estate, finance, management" : dungThan.includes("Kim") ? "technology, engineering, analysis" : "communication, travel, consulting"}.`} 
${language === "vi" ? "Hãy chọn con đường cho phép bạn kết hợp sáng tạo và cấu trúc, như một nghệ nhân chạm khắc nên những kiệt tác từ tâm hồn." : "Choose a path that blends creativity and structure, like an artisan crafting masterpieces from the soul."}

${language === "vi" ? "Màu sắc may mắn:" : "Lucky Colors:"}
${language === "vi" ? `Để kích hoạt vận may, hãy ưu tiên màu sắc của Dụng Thần: ${dungThan.includes("Thổ") ? "vàng, nâu đất" : dungThan.includes("Kim") ? "trắng, bạc" : "xanh lá, đỏ, xanh dương"}.` : `To activate good fortune, prioritize Useful God colors: ${dungThan.includes("Thổ") ? "yellow, brown" : dungThan.includes("Kim") ? "white, silver" : "green, red, blue"}.`} 
${language === "vi" ? `Sử dụng vật phẩm phong thủy như thạch anh vàng, ngọc bích, hoặc đá obsidian, và chọn hướng ${dungThan.includes("Thổ") ? "Đông Bắc" : dungThan.includes("Kim") ? "Tây" : "Đông, Nam, Bắc"} để thu hút năng lượng tích cực.` : `Use feng shui items like citrine, jade, or obsidian, and align with the direction ${dungThan.includes("Thổ") ? "Northeast" : dungThan.includes("Kim") ? "West" : "East, South, North"} to attract positive energy.`}

${language === "vi" ? "Thần Sát:" : "Auspicious Stars:"}
${activeThanSat.length ? language === "vi" ? `Lá số được điểm tô bởi ${activeThanSat.join("; ")}, như những ánh sao nhỏ lặng lẽ nâng đỡ hành trình của bạn.` : `Your chart is adorned with ${activeThanSat.join("; ")}, like small stars quietly supporting your journey.` : language === "vi" ? "Không có Thần Sát nổi bật trong lá số." : "No prominent Auspicious Stars in the chart."}

${language === "vi" ? "Lời khuyên:" : "Advice:"}
${language === "vi" ? `Hãy để ${canNguHanh[nhatChu]} trong bạn như viên ngọc được mài giũa qua thử thách, luôn sáng bóng và kiên cường. Tận dụng ${Object.keys(thapThanResults).some(k => thapThanResults[k] === "Thực Thần") ? "sự sáng tạo từ Thực Thần" : "tài năng bẩm sinh"} và ${thanSatResults["Đào Hoa"].value.length ? "sức hút từ Đào Hoa" : "nội lực của bạn"} để xây dựng những mối quan hệ ý nghĩa và chinh phục mục tiêu. Mỗi bước đi, hãy để Dụng Thần ${dungThan.join(", ")} dẫn đường, giúp bạn vững vàng như núi cao, rực rỡ như ánh vàng.` : `Let the ${canNguHanh[nhatChu]} within you shine like a gem polished by challenges, always radiant and resilient. Leverage ${Object.keys(thapThanResults).some(k => thapThanResults[k] === "Thực Thần") ? "the creativity of Eating God" : "your innate talents"} and ${thanSatResults["Đào Hoa"].value.length ? "the charm of Peach Blossom" : "your inner strength"} to build meaningful relationships and conquer goals. With each step, let Useful God ${dungThan.join(", ")} guide you, steadfast like a mountain, radiant like gold.`}
${language === "vi" ? "Cầu chúc bạn như ngọn núi vàng quý, vận mệnh rạng ngời muôn đời!" : "May you shine like refined gold, with a destiny radiant forever!"}
`;

  if (isMoney) {
    response += `
${language === "vi" ? "Tài lộc:" : "Wealth:"}
${language === "vi" ? `Như ${canNguHanh[nhatChu].toLowerCase()} cần ${dungThan[0].toLowerCase()} để tỏa sáng, tài lộc của bạn phụ thuộc vào sự cân bằng của Chính Tài và Thiên Tài.` : `As ${canNguHanh[nhatChu].toLowerCase()} needs ${dungThan[0].toLowerCase()} to shine, your wealth depends on the balance of Proper Wealth and Unexpected Wealth.`} ${Object.keys(thapThanResults).some(k => thapThanResults[k] === "Chính Tài" || thapThanResults[k] === "Thiên Tài") ? language === "vi" ? "Chính Tài hoặc Thiên Tài hiện diện, báo hiệu cơ hội tài chính ổn định hoặc bất ngờ." : "Proper Wealth or Unexpected Wealth is present, signaling stable or unexpected financial opportunities." : language === "vi" ? `Tài lộc cần sự hỗ trợ từ Dụng Thần ${dungThan.join(", ")}.` : `Wealth requires support from Useful God ${dungThan.join(", ")}.`} 
${language === "vi" ? "Đề xuất:" : "Suggestions:"} ${language === "vi" ? `Chọn màu sắc như ${dungThan.includes("Thổ") ? "vàng, nâu" : dungThan.includes("Kim") ? "trắng, bạc" : "xanh lá, đỏ, xanh dương"}, vật phẩm như thạch anh vàng hoặc ngọc bích, và hướng ${dungThan.includes("Thổ") ? "Đông Bắc" : dungThan.includes("Kim") ? "Tây" : "Bắc"} để thu hút tài lộc.` : `Choose colors like ${dungThan.includes("Thổ") ? "yellow, brown" : dungThan.includes("Kim") ? "white, silver" : "green, red, blue"}, items like citrine or jade, and the direction ${dungThan.includes("Thổ") ? "Northeast" : dungThan.includes("Kim") ? "West" : "North"} to attract wealth.`}
${language === "vi" ? "Cầu chúc tài lộc bạn như dòng sông vàng chảy mãi, thịnh vượng muôn đời!" : "May your wealth flow like a golden river, prosperous forever!"}
`;
  } else if (isCareer) {
    response += `
${language === "vi" ? "Sự nghiệp:" : "Career:"}
${language === "vi" ? `Như ${canNguHanh[nhatChu].toLowerCase()} được ${dungThan[0].toLowerCase()} nâng niu, sự nghiệp của bạn cần sự hỗ trợ từ Thực Thần và Chính Quan.` : `As ${canNguHanh[nhatChu].toLowerCase()} is nurtured by ${dungThan[0].toLowerCase()}, your career needs support from Eating God and Proper Authority.`} ${Object.keys(thapThanResults).some(k => thapThanResults[k] === "Thực Thần" || thapThanResults[k] === "Chính Quan") ? language === "vi" ? "Thực Thần hoặc Chính Quan hiện diện, mang đến sáng tạo và trách nhiệm trong công việc." : "Eating God or Proper Authority is present, bringing creativity and responsibility to work." : language === "vi" ? `Dụng Thần ${dungThan.join(", ")} sẽ dẫn bạn đến con đường thành công.` : `Useful God ${dungThan.join(", ")} will lead you to success.`} 
${thanSatResults["Văn Xương"].value.length ? language === "vi" ? "Văn Xương xuất hiện, học vấn và sáng tạo là chìa khóa." : "Literary Star appears, with academics and creativity as keys." : thanSatResults["Đào Hoa"].value.length ? language === "vi" ? "Đào Hoa hiện diện, mang sức hút và khả năng giao tiếp, phù hợp với các nghề liên quan đến đối ngoại." : "Peach Blossom is present, bringing charm and communication skills, suitable for public-facing roles." : ""} 
${language === "vi" ? "Đề xuất:" : "Suggestions:"} ${language === "vi" ? `Phù hợp với nghề ${dungThan.includes("Mộc") ? "giáo dục, sáng tạo, nghệ thuật" : dungThan.includes("Hỏa") ? "truyền thông, marketing, lãnh đạo" : dungThan.includes("Thổ") ? "bất động sản, tài chính, quản lý" : dungThan.includes("Kim") ? "công nghệ, kỹ thuật, phân tích" : "giao tiếp, du lịch, tư vấn"}.` : `Suitable for careers in ${dungThan.includes("Mộc") ? "education, creativity, arts" : dungThan.includes("Hỏa") ? "media, marketing, leadership" : dungThan.includes("Thổ") ? "real estate, finance, management" : dungThan.includes("Kim") ? "technology, engineering, analysis" : "communication, travel, consulting"}.`} ${language === "vi" ? `Chọn màu sắc ${dungThan.includes("Thổ") ? "vàng, nâu" : dungThan.includes("Kim") ? "trắng, bạc" : "xanh lá, đỏ, xanh dương"}, vật phẩm như thạch anh vàng hoặc ngọc bích, và hướng ${dungThan.includes("Thổ") ? "Đông Bắc" : dungThan.includes("Kim") ? "Tây" : "Đông, Nam, Bắc"}.` : `Choose colors ${dungThan.includes("Thổ") ? "yellow, brown" : dungThan.includes("Kim") ? "white, silver" : "green, red, blue"}, items like citrine or jade, and the direction ${dungThan.includes("Thổ") ? "Northeast" : dungThan.includes("Kim") ? "West" : "East, South, North"}.`}
${language === "vi" ? "Cầu chúc sự nghiệp bạn như ngọn núi vững vàng, rực rỡ ánh vàng!" : "May your career stand like a mountain, radiant with golden light!"}
`;
  } else if (isHealth) {
    response += `
${language === "vi" ? "Sức khỏe:" : "Health:"}
${language === "vi" ? `Như ${canNguHanh[nhatChu].toLowerCase()} được ${dungThan[0].toLowerCase()} che chở, sức khỏe của bạn cần sự cân bằng ngũ hành.` : `As ${canNguHanh[nhatChu].toLowerCase()} is protected by ${dungThan[0].toLowerCase()}, your health requires balance of the Five Elements.`} ${Object.keys(thapThanResults).some(k => thapThanResults[k] === "Chính Ấn") ? language === "vi" ? "Chính Ấn mang sự bảo vệ, giúp bạn vượt qua khó khăn về sức khỏe." : "Proper Seal provides protection, helping you overcome health challenges." : language === "vi" ? `Dụng Thần ${dungThan.join(", ")} sẽ nuôi dưỡng cơ thể bạn.` : `Useful God ${dungThan.join(", ")} will nurture your body.`} 
${thanSatResults["Thiên Đức"].value.length || thanSatResults["Nguyệt Đức"].value.length ? language === "vi" ? "Thiên Đức hoặc Nguyệt Đức hiện diện, mang phúc đức bảo vệ." : "Heavenly Virtue or Lunar Virtue is present, bringing protective blessings." : ""}
${language === "vi" ? "Đề xuất:" : "Suggestions:"} ${language === "vi" ? `Chọn màu sắc ${dungThan.includes("Thổ") ? "vàng, nâu" : dungThan.includes("Kim") ? "trắng, bạc" : "xanh lá, xanh dương"}, vật phẩm như ngọc bích hoặc đá thạch anh, và hướng ${dungThan.includes("Thổ") ? "Đông Bắc" : dungThan.includes("Kim") ? "Tây" : "Bắc"} để tăng cường sức khỏe.` : `Choose colors ${dungThan.includes("Thổ") ? "yellow, brown" : dungThan.includes("Kim") ? "white, silver" : "green, blue"}, items like jade or quartz, and the direction ${dungThan.includes("Thổ") ? "Northeast" : dungThan.includes("Kim") ? "West" : "North"} to enhance health.`}
${language === "vi" ? "Cầu chúc sức khỏe bạn như dòng sông trong lành, bền lâu mãi mãi!" : "May your health flow like a clear river, enduring forever!"}
`;
  } else if (isLove || isMarriage) {
    response += `
${language === "vi" ? "Tình duyên & Hôn nhân:" : "Love & Marriage:"}
${language === "vi" ? `Như ${canNguHanh[nhatChu].toLowerCase()} tìm thấy ${dungThan[0].toLowerCase()}, tình duyên của bạn nở hoa trong sự hòa hợp.` : `As ${canNguHanh[nhatChu].toLowerCase()} finds ${dungThan[0].toLowerCase()}, your love blossoms in harmony.`} ${thanSatResults["Đào Hoa"].value.length || thanSatResults["Hồng Loan"].value.length ? language === "vi" ? "Đào Hoa hoặc Hồng Loan hiện diện, mang sức hút và duyên phận." : "Peach Blossom or Red Phoenix is present, bringing charm and destiny." : language === "vi" ? `Dụng Thần ${dungThan.join(", ")} sẽ dẫn bạn đến tình yêu bền vững.` : `Useful God ${dungThan.join(", ")} will lead you to lasting love.`} 
${Object.keys(thapThanResults).some(k => thapThanResults[k] === "Thực Thần") ? language === "vi" ? "Thực Thần mang sự hòa hợp và lãng mạn." : "Eating God brings harmony and romance." : ""}
${language === "vi" ? "Đề xuất:" : "Suggestions:"} ${language === "vi" ? `Chọn màu sắc ${dungThan.includes("Hỏa") ? "đỏ, hồng" : dungThan.includes("Kim") ? "trắng, bạc" : "xanh lá, xanh dương"}, vật phẩm như thạch anh hồng, và hướng ${dungThan.includes("Hỏa") ? "Nam" : dungThan.includes("Kim") ? "Tây" : "Đông, Bắc"} để thu hút tình duyên.` : `Choose colors ${dungThan.includes("Hỏa") ? "red, pink" : dungThan.includes("Kim") ? "white, silver" : "green, blue"}, items like rose quartz, and the direction ${dungThan.includes("Hỏa") ? "South" : dungThan.includes("Kim") ? "West" : "East, North"} to attract love.`}
${language === "vi" ? "Cầu chúc tình duyên bạn như hoa nở trên cành, mãi mãi rực rỡ!" : "May your love blossom like flowers on a branch, radiant forever!"}
`;
  } else if (isChildren) {
    response += `
${language === "vi" ? "Con cái:" : "Children:"}
${language === "vi" ? `Như ${canNguHanh[nhatChu].toLowerCase()} được ${dungThan[0].toLowerCase()} nâng niu, con cái là niềm vui rực rỡ trong đời bạn.` : `As ${canNguHanh[nhatChu].toLowerCase()} is nurtured by ${dungThan[0].toLowerCase()}, your children bring radiant joy to your life.`} ${Object.keys(thapThanResults).some(k => thapThanResults[k] === "Thực Thần" || thapThanResults[k] === "Thương Quan") ? language === "vi" ? "Thực Thần hoặc Thương Quan hiện diện, mang sự gắn kết với con cái." : "Eating God or Hurting Officer is present, fostering bonds with children." : language === "vi" ? `Dụng Thần ${dungThan.join(", ")} sẽ mang phúc đức cho con cái.` : `Useful God ${dungThan.join(", ")} will bring blessings to your children.`} 
${thanSatResults["Thái Cực Quý Nhân"].value.length ? language === "vi" ? "Thái Cực Quý Nhân hiện diện, mang trí tuệ và phúc đức cho thế hệ sau." : "Grand Ultimate Noble is present, bringing wisdom and blessings to the next generation." : ""}
${language === "vi" ? "Đề xuất:" : "Suggestions:"} ${language === "vi" ? `Chọn màu sắc ${dungThan.includes("Thổ") ? "vàng, nâu" : dungThan.includes("Kim") ? "trắng, bạc" : "xanh lá, xanh dương"}, vật phẩm như ngọc bích, và hướng ${dungThan.includes("Thổ") ? "Đông Bắc" : dungThan.includes("Kim") ? "Tây" : "Đông"} để tăng phúc đức cho con cái.` : `Choose colors ${dungThan.includes("Thổ") ? "yellow, brown" : dungThan.includes("Kim") ? "white, silver" : "green, blue"}, items like jade, and the direction ${dungThan.includes("Thổ") ? "Northeast" : dungThan.includes("Kim") ? "West" : "East"} to enhance blessings for children.`}
${language === "vi" ? "Cầu chúc con cái bạn như những vì sao sáng, mang niềm vui muôn đời!" : "May your children shine like stars, bringing joy forever!"}
`;
  }

  return response;
};

// Kiểm tra API key
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
    const hasModel = response.data.data.some(m => m.id.includes("gpt-3.5-turbo"));
    if (!hasModel) {
      console.error("Mô hình gpt-3.5-turbo không khả dụng với API key này");
      return false;
    }
    return true;
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

  // Kiểm tra payload
  if (!payload.model || !payload.messages || !Array.isArray(payload.messages) || !payload.messages.every(msg => msg.role && typeof msg.content === "string")) {
    console.error("Payload không hợp lệ:", JSON.stringify(payload, null, 2));
    throw new Error("Invalid payload format");
  }

  // Kiểm tra API key trước
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
          timeout: 120000 // Tăng timeout lên 120 giây
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
        console.error("Hết số lần thử, chuyển sang generateResponse");
        throw new Error(`Failed to connect to OpenAI after ${retries} retries: ${err.message}`);
      }
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
Sixth
    }
  }
};

// API luận giải Bát Tự
app.post("/api/luan-giai-bazi", async (req, res) => {
  console.log("Request received:", JSON.stringify(req.body, null, 2));
  const { messages, tuTruInfo, dungThan } = req.body;
  const useOpenAI = process.env.USE_OPENAI !== "false";
  const language = messages.some(msg => /[\u00C0-\u1EF9]/.test(msg.content) || msg.content.includes("hãy") || msg.content.includes("ngày sinh")) ? "vi" : "en";

  // Kiểm tra đầu vào
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    console.error("Thiếu hoặc không hợp lệ: messages");
    return res.status(400).json({ error: language === "vi" ? "Thiếu hoặc không hợp lệ: messages" : "Missing or invalid: messages" });
  }
  if (!tuTruInfo) {
    console.error("Thiếu tuTruInfo");
    return res.status(400).json({ error: language === "vi" ? "Thiếu tuTruInfo" : "Missing tuTruInfo" });
  }
  if (!dungThan || !Array.isArray(dungThan) || !dungThan.every(elem => ["Mộc", "Hỏa", "Thổ", "Kim", "Thủy"].includes(elem))) {
    console.error("Dụng Thần không hợp lệ:", dungThan);
    return res.status(400).json({ error: language === "vi" ? "Dụng Thần không hợp lệ hoặc thiếu" : "Invalid or missing Useful God" });
  }

  // Lấy tin nhắn người dùng
  const lastUserMsg = messages.slice().reverse().find(m => m.role === "user");
  const userInput = lastUserMsg ? lastUserMsg.content.toLowerCase() : "";

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

  // Gọi OpenAI với prompt rút gọn
  const prompt = `
You are a Bazi master, responding in ${language === "vi" ? "Vietnamese" : "English"} with concise, poetic answers. Focus on personality (Day Master, Ten Gods), careers, and lucky colors based on Useful God. Briefly mention Auspicious Stars with full names and meanings. Analysis:
Four Pillars: Hour ${tuTruParsed.gio}, Day ${tuTruParsed.ngay}, Month ${tuTruParsed.thang}, Year ${tuTruParsed.nam}
Five Elements: ${Object.entries(nguHanhCount).map(([k, v]) => `${k}: ${((v / Object.values(nguHanhCount).reduce((a, b) => a + b, 0)) * 100).toFixed(2)}%`).join(", ")}
Useful God: ${dungThan.join(", ")}
Question: ${userInput}
${userInput.includes("tiền bạc") || userInput.includes("money") ? language === "vi" ? "Phân tích tài lộc (Chính Tài, Thiên Tài, Dụng Thần)." : "Analyze wealth (Proper Wealth, Unexpected Wealth, Useful God)." : ""}
${userInput.includes("nghề") || userInput.includes("công việc") || userInput.includes("sự nghiệp") || userInput.includes("career") ? language === "vi" ? "Phân tích sự nghiệp (Thực Thần, Chính Quan, Văn Xương, Đào Hoa, Dụng Thần)." : "Analyze career (Eating God, Proper Authority, Literary Star, Peach Blossom, Useful God)." : ""}
${userInput.includes("sức khỏe") || userInput.includes("health") ? language === "vi" ? "Phân tích sức khỏe (ngũ hành, Chính Ấn, Thiên Đức)." : "Analyze health (Five Elements, Proper Seal, Heavenly Virtue)." : ""}
${userInput.includes("tình duyên") || userInput.includes("hôn nhân") || userInput.includes("love") || userInput.includes("marriage") ? language === "vi" ? "Phân tích tình duyên/hôn nhân (Đào Hoa, Hồng Loan, Thực Thần)." : "Analyze love/marriage (Peach Blossom, Red Phoenix, Eating God)." : ""}
${userInput.includes("con cái") || userInput.includes("children") ? language === "vi" ? "Phân tích con cái (Thực Thần, Thương Quan, Thái Cực Quý Nhân)." : "Analyze children (Eating God, Hurting Officer, Grand Ultimate Noble)." : ""}
${userInput.includes("dự đoán") || userInput.includes("tương lai") || userInput.includes("future") ? language === "vi" ? "Hướng dẫn liên hệ app.aihuyenhoc@gmail.com hoặc Discord." : "Guide to contact app.aihuyenhoc@gmail.com or Discord." : ""}
`;

  try {
    console.log("Prompt gửi đến OpenAI:", prompt);
    const payload = {
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 1000,
      top_p: 0.9,
      frequency_penalty: 0.2,
      presence_penalty: 0.1
    };
    const gptRes = await callOpenAI(payload);
    res.json({ answer: gptRes.choices[0].message.content });
  } catch (err) {
    console.error("GPT API error:", err.message, err.response?.data || {});
    console.log("Chuyển sang generateResponse do lỗi OpenAI");
    const answer = generateResponse(tuTruParsed, nguHanhCount, thapThanResults, dungThan, thanSatResults, userInput, messages, language);
    res.json({ 
      answer,
      warning: language === "vi" 
        ? `Lỗi OpenAI API: ${err.response?.data?.error?.message || err.message}. Sử dụng phản hồi cục bộ thay thế.`
        : `OpenAI API error: ${err.response?.data?.error?.message || err.message}. Using local response instead.`
    });
  }
});

// Xử lý lỗi toàn cục
app.use((err, req, res, next) => {
  console.error("Lỗi server:", err.stack);
  const language = req.body?.messages?.some(msg => /[\u00C0-\u1EF9]/.test(msg.content)) ? "vi" : "en";
  res.status(500).json({ 
    error: language === "vi" 
      ? "Đã xảy ra lỗi hệ thống, vui lòng thử lại sau" 
      : "A system error occurred, please try again later" 
  });
});

// Khởi động server
const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
server.setTimeout(120000);
