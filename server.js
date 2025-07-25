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
  "Giáp Ngọ", "Ất Mùi", "Bính Ngọ", "Đinh Mùi", "Mậu Thân", "Kỷ Dậu", "Canh Tuất", "Tân Hợi", "Nhâm Tý", "Quý Sửu",
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
    console.error("Nhật Chủ hoặc Địa Chi không hợp lệ:", { nhatChu, branches });
    throw new Error("Invalid nhatChu or branches");
  }

  return {
    "Thiên Ất Quý Nhân": { vi: "Thiên Ất Quý Nhân", en: "Nobleman Star", value: thienAtQuyNhan[nhatChu]?.filter(chi => branches.includes(chi)) || [] },
    "Đào Hoa": { vi: "Đào Hoa", en: "Peach Blossom", value: branches.includes(daoHoa[tuTru.ngay?.split(" ")[1]]) ? [daoHoa[tuTru.ngay?.split(" ")[1]]] : [] },
    "Hồng Loan": { vi: "Hồng Loan", en: "Red Phoenix", value: branches.includes(hongLoan[tuTru.ngay?.split(" ")[1]]) ? [hongLoan[tuTru.ngay?.split(" ")[1]]] : [] }
  };
};

// Định nghĩa tính cách và ảnh hưởng Thập Thần
const personalityDescriptions = {
  Mộc: {
    vi: "sáng tạo, linh hoạt, yêu tự do và khám phá, nhưng có thể thiếu kiên nhẫn khi áp lực.",
    en: "creative, adaptable, freedom-loving, and exploratory, but may lack patience under pressure."
  },
  Hỏa: {
    vi: "đam mê, năng động, dẫn dắt, nhưng dễ nóng nảy nếu không kiểm soát.",
    en: "passionate, energetic, and leadership-driven, but prone to impulsiveness if unchecked."
  },
  Thổ: {
    vi: "vững chãi, đáng tin cậy, nuôi dưỡng, nhưng có thể bảo thủ nếu không linh hoạt.",
    en: "steadfast, reliable, and nurturing, but can be stubborn if not flexible."
  },
  Kim: {
    vi: "tinh tế, quyết tâm, chính xác, nhưng có thể cứng nhắc nếu quá tập trung.",
    en: "elegant, determined, and precise, but can be rigid if overly focused."
  },
  Thủy: {
    vi: "sâu sắc, thích nghi, trí tuệ, nhưng có thể dễ dao động nếu thiếu ổn định.",
    en: "profound, adaptable, and intelligent, but may waver without stability."
  }
};

const thapThanEffects = {
  "Tỷ Kiên": {
    vi: "Tự lập, mạnh mẽ, thích cạnh tranh, nhưng cần tránh bướng bỉnh.",
    en: "Independent, strong, competitive, but should avoid stubbornness."
  },
  "Kiếp Tài": {
    vi: "Tài năng, quyết đoán, nhưng dễ gặp rủi ro tài chính nếu không cẩn thận.",
    en: "Talented, decisive, but prone to financial risks if not cautious."
  },
  "Thực Thần": {
    vi: "Sáng tạo, yêu nghệ thuật, thích hưởng thụ, nhưng cần kiểm soát chi tiêu.",
    en: "Creative, artistic, enjoys life, but needs to manage spending."
  },
  "Thương Quan": {
    vi: "Tư duy sắc bén, dám nghĩ dám làm, nhưng dễ xung đột nếu không kiểm soát.",
    en: "Sharp-minded, bold, but prone to conflicts if uncontrolled."
  },
  "Chính Tài": {
    vi: "Thực tế, giỏi quản lý tài chính, nhưng cần tránh tham lam.",
    en: "Practical, good at financial management, but should avoid greed."
  },
  "Thiên Tài": {
    vi: "Nhạy bén, cơ hội tài lộc bất ngờ, nhưng cần ổn định cảm xúc.",
    en: "Perceptive, with unexpected wealth opportunities, but needs emotional stability."
  },
  "Chính Quan": {
    vi: "Trách nhiệm, uy tín, lãnh đạo, nhưng cần tránh áp lực quá mức.",
    en: "Responsible, reputable, leadership-oriented, but should avoid excessive pressure."
  },
  "Thất Sát": {
    vi: "Dũng cảm, quyết liệt, nhưng cần kiểm soát sự nóng nảy.",
    en: "Courageous, intense, but needs to control impulsiveness."
  },
  "Chính Ấn": {
    vi: "Trí tuệ, học thức, bảo vệ, nhưng cần tránh thụ động.",
    en: "Wise, scholarly, protective, but should avoid passivity."
  },
  "Thiên Ấn": {
    vi: "Sáng tạo, trực giác mạnh, nhưng cần thực tế hơn.",
    en: "Creative, highly intuitive, but needs to be more practical."
  }
};

// Hàm xác định loại câu hỏi
const determineQuestionType = (userInput, language) => {
  const normalizedInput = typeof userInput === 'string' ? userInput.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
  console.log("Normalized userInput:", normalizedInput);

  const types = {
    isMoney: /tien bac|tai chinh|money|finance/i.test(normalizedInput),
    isCareer: /nghe|cong viec|su nghiep|career|job/i.test(normalizedInput),
    isHealth: /suc khoe|benh tat|health/i.test(normalizedInput),
    isLove: /tinh duyen|tinh yeu|love|hon nhan|marriage/i.test(normalizedInput),
    isChildren: /con cai|children/i.test(normalizedInput),
    isComplex: /du doan|tuong lai|future|dai van/i.test(normalizedInput),
    isThapThan: /thap than|ten gods/i.test(normalizedInput),
    isThanSat: /than sat|auspicious stars|sao/i.test(normalizedInput)
  };

  // isGeneral là true nếu không khớp với bất kỳ loại câu hỏi cụ thể nào
  types.isGeneral = !types.isMoney && !types.isCareer && !types.isHealth && !types.isLove && !types.isChildren && !types.isComplex && !types.isThapThan && !types.isThanSat;

  console.log("Question types:", types);
  return types;
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

  // Xác định loại câu hỏi
  const { isGeneral, isMoney, isCareer, isHealth, isLove, isChildren, isComplex, isThapThan, isThanSat } = determineQuestionType(userInput, language);

  // Xử lý câu hỏi phức tạp
  if (isComplex) {
    return `
${language === "vi" ? "Luận giải Bát Tự" : "Bazi Interpretation"}:
${language === "vi" ? "Câu hỏi của bạn liên quan đến dự đoán tương lai hoặc đại vận, cần phân tích chi tiết hơn. Vui lòng gửi câu hỏi qua email app.aihuyenhoc@gmail.com hoặc tham gia cộng đồng Discord để được hỗ trợ chuyên sâu." : "Your question involves future predictions or major life cycles, requiring detailed analysis. Please send your question to app.aihuyenhoc@gmail.com or join our Discord community for in-depth support."}
    `;
  }

  let response = "";

  // Phần tổng quan nếu là câu hỏi chung
  if (isGeneral) {
    response += `
${language === "vi" ? "Luận giải Bát Tự" : "Bazi Interpretation"}:

${language === "vi" ? `Như cây xanh vươn mình trong gió, Nhật Chủ ${nhatChu} (${canNguHanh[nhatChu]}) mang ánh sáng của ${personalityDescriptions[canNguHanh[nhatChu]].vi}` : `Like a thriving tree in the wind, Day Master ${nhatChu} (${canNguHanh[nhatChu]}) carries the light of ${personalityDescriptions[canNguHanh[nhatChu]].en}`}
${language === "vi" ? "Tứ Trụ:" : "Four Pillars:"} ${language === "vi" ? `Giờ ${tuTru.gio}, Ngày ${tuTru.ngay}, Tháng ${tuTru.thang}, Năm ${tuTru.nam}` : `Hour ${tuTru.gio}, Day ${tuTru.ngay}, Month ${tuTru.thang}, Year ${tuTru.nam}`}
${language === "vi" ? "Ngũ Hành:" : "Five Elements:"}
${Object.entries(tyLeNguHanh).map(([k, v]) => `${k}: ${v}`).join("\n")}
${language === "vi" ? `Với Nhật Chủ ${nhatChu} (${canNguHanh[nhatChu]}), lá số ${canNguHanh[nhatChu]} yếu (Thân Nhược), cần Dụng Thần ${dungThan.join(", ")} để cân bằng.` : `With Day Master ${nhatChu} (${canNguHanh[nhatChu]}), the chart is weak (Shen Ruo), requiring Useful God ${dungThan.join(", ")} for balance.`}

${language === "vi" ? "Tính cách:" : "Personality:"}
${language === "vi" ? `Bạn là hiện thân của ${canNguHanh[nhatChu]}, ${personalityDescriptions[canNguHanh[nhatChu]].vi}` : `You embody ${canNguHanh[nhatChu]}, ${personalityDescriptions[canNguHanh[nhatChu]].en}`}

${language === "vi" ? "Nghề nghiệp:" : "Career:"}
${language === "vi" ? `Phù hợp với nghề ${dungThan.includes("Mộc") ? "giáo dục, sáng tạo, nghệ thuật" : dungThan.includes("Hỏa") ? "truyền thông, marketing, lãnh đạo" : dungThan.includes("Thổ") ? "bất động sản, tài chính, quản lý" : dungThan.includes("Kim") ? "công nghệ, kỹ thuật, phân tích" : "giao tiếp, du lịch, tư vấn"}.` : `Suitable for careers in ${dungThan.includes("Mộc") ? "education, creativity, arts" : dungThan.includes("Hỏa") ? "media, marketing, leadership" : dungThan.includes("Thổ") ? "real estate, finance, management" : dungThan.includes("Kim") ? "technology, engineering, analysis" : "communication, travel, consulting"}.`}

${language === "vi" ? "Đề xuất:" : "Suggestions:"}
${language === "vi" ? `Chọn màu sắc ${dungThan.includes("Thổ") ? "vàng, nâu" : dungThan.includes("Kim") ? "trắng, bạc" : dungThan.includes("Hỏa") ? "đỏ, hồng" : "xanh lá, xanh dương"}, vật phẩm như ${dungThan.includes("Thổ") ? "thạch anh vàng" : dungThan.includes("Kim") ? "đá mặt trăng" : dungThan.includes("Hỏa") ? "thạch anh hồng" : "ngọc lục bảo, lapis lazuli"}, và hướng ${dungThan.includes("Thổ") ? "Đông Bắc" : dungThan.includes("Kim") ? "Tây" : dungThan.includes("Hỏa") ? "Nam" : "Đông, Bắc"}.` : `Choose colors ${dungThan.includes("Thổ") ? "yellow, brown" : dungThan.includes("Kim") ? "white, silver" : dungThan.includes("Hỏa") ? "red, pink" : "green, blue"}, items like ${dungThan.includes("Thổ") ? "citrine" : dungThan.includes("Kim") ? "moonstone" : dungThan.includes("Hỏa") ? "rose quartz" : "emerald, lapis lazuli"}, and the direction ${dungThan.includes("Thổ") ? "Northeast" : dungThan.includes("Kim") ? "West" : dungThan.includes("Hỏa") ? "South" : "East, North"}.`}

${language === "vi" ? "Lời khuyên:" : "Advice:"}
${language === "vi" ? `Hãy để ${canNguHanh[nhatChu]} trong bạn như ${canNguHanh[nhatChu] === "Kim" ? "viên ngọc được mài giũa" : canNguHanh[nhatChu] === "Mộc" ? "cây xanh vươn mình" : canNguHanh[nhatChu] === "Hỏa" ? "ngọn lửa rực rỡ" : canNguHanh[nhatChu] === "Thổ" ? "ngọn núi vững chãi" : "dòng sông bất tận"}, luôn sáng bóng và kiên cường. Tận dụng sự ${canNguHanh[nhatChu] === "Kim" ? "tinh tế và quyết tâm" : canNguHanh[nhatChu] === "Mộc" ? "sáng tạo và linh hoạt" : canNguHanh[nhatChu] === "Hỏa" ? "đam mê và dẫn dắt" : canNguHanh[nhatChu] === "Thổ" ? "vững chãi và nuôi dưỡng" : "sâu sắc và thích nghi"} để xây dựng cuộc sống ý nghĩa.` : `Let the ${canNguHanh[nhatChu]} within you shine like ${canNguHanh[nhatChu] === "Kim" ? "a gem polished by challenges" : canNguHanh[nhatChu] === "Mộc" ? "a thriving tree" : canNguHanh[nhatChu] === "Hỏa" ? "a radiant flame" : canNguHanh[nhatChu] === "Thổ" ? "a steadfast mountain" : "an endless river"}, always radiant and resilient. Leverage your ${canNguHanh[nhatChu] === "Kim" ? "elegance and determination" : canNguHanh[nhatChu] === "Mộc" ? "creativity and adaptability" : canNguHanh[nhatChu] === "Hỏa" ? "passion and leadership" : canNguHanh[nhatChu] === "Thổ" ? "steadfastness and nurturing" : "depth and adaptability"} to build a meaningful life.`}
${language === "vi" ? `Cầu chúc bạn như ${canNguHanh[nhatChu] === "Kim" ? "viên ngọc quý" : canNguHanh[nhatChu] === "Mộc" ? "cây xanh vươn mình" : canNguHanh[nhatChu] === "Hỏa" ? "ngọn lửa bất diệt" : canNguHanh[nhatChu] === "Thổ" ? "ngọn núi vững chãi" : "dòng sông bất tận"}, vận mệnh rạng ngời muôn đời!` : `May you shine like ${canNguHanh[nhatChu] === "Kim" ? "a precious gem" : canNguHanh[nhatChu] === "Mộc" ? "a thriving tree" : canNguHanh[nhatChu] === "Hỏa" ? "an eternal flame" : canNguHanh[nhatChu] === "Thổ" ? "a steadfast mountain" : "an endless river"}, with a destiny radiant forever!`}
`;
  }

  // Phân tích cụ thể theo câu hỏi
  if (isMoney) {
    response += `
${language === "vi" ? "Tài lộc:" : "Wealth:"}
${language === "vi" ? `Như ${canNguHanh[nhatChu].toLowerCase()} cần ${dungThan[0].toLowerCase()} để tỏa sáng, tài lộc của bạn phụ thuộc vào sự cân bằng của Dụng Thần.` : `As ${canNguHanh[nhatChu].toLowerCase()} needs ${dungThan[0].toLowerCase()} to shine, your wealth depends on the balance of Useful God.`}
${language === "vi" ? `Đề xuất: Chọn màu sắc ${dungThan.includes("Thổ") ? "vàng, nâu" : dungThan.includes("Kim") ? "trắng, bạc" : dungThan.includes("Hỏa") ? "đỏ, hồng" : "xanh lá, xanh dương"}, vật phẩm như ${dungThan.includes("Thổ") ? "thạch anh vàng" : dungThan.includes("Kim") ? "đá mặt trăng" : dungThan.includes("Hỏa") ? "thạch anh hồng" : "ngọc xanh lục, lapis lazuli"}, và hướng ${dungThan.includes("Thổ") ? "Đông Bắc" : dungThan.includes("Kim") ? "Tây" : dungThan.includes("Hỏa") ? "Nam" : "Đông, Bắc"} để thu hút tài lộc.` : `Suggestions: Choose colors ${dungThan.includes("Thổ") ? "yellow, brown" : dungThan.includes("Kim") ? "white, silver" : dungThan.includes("Hỏa") ? "red, pink" : "green, blue"}, items like ${dungThan.includes("Thổ") ? "citrine" : dungThan.includes("Kim") ? "moonstone" : dungThan.includes("Hỏa") ? "rose quartz" : "emerald, lapis lazuli"}, and the direction ${dungThan.includes("Thổ") ? "Northeast" : dungThan.includes("Kim") ? "West" : dungThan.includes("Hỏa") ? "South" : "East, North"} to attract wealth.`}
${language === "vi" ? "Cầu chúc tài lộc bạn như dòng sông vàng chảy mãi, thịnh vượng muôn đời!" : "May your wealth flow like a golden river, prosperous forever!"}
`;
  } else if (isCareer) {
    response += `
${language === "vi" ? "Sự nghiệp:" : "Career:"}
${language === "vi" ? `Như ${canNguHanh[nhatChu].toLowerCase()} được ${dungThan[0].toLowerCase()} nâng niu, sự nghiệp của bạn cần sự hỗ trợ từ Dụng Thần.` : `As ${canNguHanh[nhatChu].toLowerCase()} is nurtured by ${dungThan[0].toLowerCase()}, your career needs support from Useful God.`}
${language === "vi" ? `Phù hợp với nghề ${dungThan.includes("Mộc") ? "giáo dục, nghệ thuật, thiết kế" : dungThan.includes("Hỏa") ? “truyền thông, marketing, lãnh đạo" : dungThan.includes("Thổ") ? "bất động sản, tài chính, quản lý" : dungThan.includes("Kim") ? "công nghệ, kỹ thuật, phân tích" : "giao tiếp, du lịch, tư vấn"}.` : `Suitable for careers in ${dungThan.includes("Mộc") ? "education, arts, design" : dungThan.includes("Hỏa") ? "media, marketing, leadership" : dungThan.includes("Thổ") ? "real estate, finance, management" : dungThan.includes("Kim") ? "technology, engineering, analysis" : "communication, travel, consulting"}.`}
${language === "vi" ? `Đề xuất: Chọn màu sắc ${dungThan.includes("Thổ") ? "vàng, nâu" : dungThan.includes("Kim") ? "trắng, bạc" : dungThan.includes("Hỏa") ? "đỏ, hồng" : "xanh lá, xanh dương"}, vật phẩm như ${dungThan.includes("Thổ") ? "thạch anh vàng" : dungThan.includes("Kim") ? "đá mặt trăng" : dungThan.includes("Hỏa") ? "thạch anh hồng" : "ngọc lục bảo, lapis lazuli"}, và hướng ${dungThan.includes("Thổ") ? "Đông Bắc" : dungThan.includes("Kim") ? "Tây" : dungThan.includes("Hỏa") ? "Nam" : "Đông, Bắc"}.` : `Suggestions: Choose colors ${dungThan.includes("Thổ") ? "yellow, brown" : dungThan.includes("Kim") ? "white, silver" : dungThan.includes("Hỏa") ? "red, pink" : "green, blue"}, items like ${dungThan.includes("Thổ") ? "citrine" : dungThan.includes("Kim") ? "moonstone" : dungThan.includes("Hỏa") ? "rose quartz" : "emerald, lapis lazuli"}, and the direction ${dungThan.includes("Thổ") ? "Northeast" : dungThan.includes("Kim") ? "West" : dungThan.includes("Hỏa") ? "South" : "East, North"}.`}
${language === "vi" ? "Cầu chúc sự nghiệp bạn như ngọn núi vững vàng, rực rỡ ánh vàng!" : "May your career stand like a mountain, radiant with golden light!"}
`;
  } else if (isLove) {
    response += `
${language === "vi" ? "Tình duyên & Hôn nhân:" : "Love & Marriage:"}
${language === "vi" ? `Như ${canNguHanh[nhatChu].toLowerCase()} tìm thấy ${dungThan[0].toLowerCase()}, tình duyên của bạn nở hoa trong sự hòa hợp.` : `As ${canNguHanh[nhatChu].toLowerCase()} finds ${dungThan[0].toLowerCase()}, your love blossoms in harmony.`}
${language === "vi" ? `Đề xuất: Chọn màu sắc ${dungThan.includes("Hỏa") ? "đỏ, hồng" : dungThan.includes("Kim") ? "trắng, bạc" : "xanh lá, xanh dương"}, vật phẩm như ${dungThan.includes("Hỏa") ? "thạch anh hồng" : dungThan.includes("Kim") ? "đá mặt trăng" : "ngọc lục bảo, lapis lazuli"}, và hướng ${dungThan.includes("Hỏa") ? "Nam" : dungThan.includes("Kim") ? "Tây" : "Đông, Bắc"} để thu hút tình duyên.` : `Suggestions: Choose colors ${dungThan.includes("Hỏa") ? "red, pink" : dungThan.includes("Kim") ? "white, silver" : "green, blue"}, items like ${dungThan.includes("Hỏa") ? "rose quartz" : dungThan.includes("Kim") ? "moonstone" : "emerald, lapis lazuli"}, and the direction ${dungThan.includes("Hỏa") ? "South" : dungThan.includes("Kim") ? "West" : "East, North"} to attract love.`}
${language === "vi" ? "Cầu chúc tình duyên bạn như hoa nở trên cành, mãi mãi rực rỡ!" : "May your love blossom like flowers on a branch, radiant forever!"}
`;
  } else if (isHealth) {
    response += `
${language === "vi" ? "Sức khỏe:" : "Health:"}
${language === "vi" ? `Như ${canNguHanh[nhatChu].toLowerCase()} được ${dungThan[0].toLowerCase()} che chở, sức khỏe của bạn cần sự cân bằng ngũ hành.`}
${language === "vi" : `As ${canNguHanh[nhatChu].toLowerCase()} is protected by ${dungThan[0].toLowerCase()}, your health requires balance của the Five Elements.`}
${language === "vi" ? "Đề xuất: Chọn màu sắc ${dungThan.includes("Thổ") ? "vàng, nâu" : dungThan.includes("Kim") ? "trắng, bạc" : dungThan.includes("xanh") ? lá xanh, xanh dương" : "xanh lá xanh, dương"}, vật phẩm như ${dungThan.includes("Thổ") ? "ngọc bích" : dungThan.includes("Kim") ? "thạch anh trắng" : dungThan.includes("lapis") ? lazuli"}, và hướng ${dungThan.includes("Thổ") ? "Đông Bắc" : dungThan.includes("Kim") ? "Tây" : dungThan là "Bắc"} để tăng cường sức khỏe.` : `Suggestions: Choose colors ${dungThan.includes("Thổ") ? "yellow, brown" : dungThan.includes("Kim") ? "white, silver" : "green, blue"}, items like ${dungThan.includes("Thổ") ? "jade" : dungThan.includes("Kim") ? "white quartz" : "lapis lazuli"}, and the direction ${dungThan.includes("Thổ") ? “Northeast” : dungThan.includes("Kim") ? “West” : “North”}} to enhance health.`}
${language === "vi" ? "Cầu chúc sức khỏe của bạn như dòng sông trong lành, bền lâu mãi mãi!" : "May your health flow like a clear river, enduring forever!"}
`;
  } else if (isChildren) {
    response += `
${language === "vi" ? "Con cái:" : "Children:"}
${language === "vi" ? `Như ${canNguHanh[nhatChu].toLowerCase()} được ${dungThan[0].toLowerCase()} nâng niu, con cái là niềm vui rực rỡ trong đời bạn.` : `As ${canNguHanh[nhatChu].toLowerCase()} is nurtured by ${dungThan[0].toLowerCase()}, your children bring radiant joy to your life.`}
${language === "vi" ? `Đề xuất: Chọn màu sắc ${dungThan.includes("Thổ") ? "vàng, nâu" : dungThan.includes("Kim") ? "trắng, bạc" : "xanh lá, xanh dương"}, vật phẩm như ${dungThan}.includes("Thổ") ? "ngọc bích" : dungThan.includes("Kim") ? "thạch anh trắng" : dungThan, "ngọc lục bảo"}, và hướng ${dungThan.includes("Thổ") ? "Đông Bắc" : dungThan.includes("Kim") ? "Tây" : "Đông"} để tăng phúc đức cho con cái.` : `Suggestions: Choose colors ${dungThan.includes("Thổ") ? "yellow, brown" : "white, silver"}, items like ${dungThan.includes("Thổ") ? "jade" : "white quartz", "emerald"}, and : "East"} để tăng phúc.`}
${language === "vi" ? "Cầu chúc con cái bạn như những vì sao sáng, mang niềm vui muôn đời!" : "May your children shine like stars, bringing joy forever!"}
`;
  }

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
      .map(([key], value)) => `${language[key]}: ${value.value.join(", ")}`);
    response += `
${language === "vi" ? "Thần Sát:" : "Auspicious Stars:"}
${activeThanSat.length > 0 ? activeThanSat.join("\n") : language === "vi" ? "Không có Thần Sát nổi bật trong lá số." : "No prominent Auspicious Stars in the chart."}
`;
  }

  return response.trim();
};

// Kiểm tra trạng thái server OpenAI
const checkOpenAIStatus = async () => {
  try {
    const response = await axios.get("https://status.openai.com/api/v2/status.json", { timeout: 10000 });
    return response.data.status.indicator === "none"; // "none" nghĩa là server ổn định
  } catch (err) {
    console.error("Lỗi kiểm tra trạng thái OpenAI:", err.message);
    return false;
  }
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
    console.log("API key hợp lệ, danh sách mô hình:", response.data.data.map(m => m.id})));
    return response.data.data.some(m => m.id.includes("gpt-3.5-turbo"));
  } catch (err) {
    console.error("Lỗi kiểm tra API key:", err.message, err.response?.data || {});
    return false;
  }
};

// Gọi API OpenAI
const callOpenAI = async (payload, retries = 7, delay = 5000) => {
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

  const isServerUp = await checkOpenAIStatus();
  if (!isServerUp) {
    throw new Error("OpenAI server is down");
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Thử gọi OpenAI lần ${attempt} với mô hình ${payload.model}...`);
      console.log("Payload:", JSON.stringify(payload, null, 2)));
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        payload,
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 60000
        }
      );
      console.log("Gọi OpenAI thành công:", response.data.id);
      return response.data;
    } catch (err) {
      console.error(`Thử lại lần ${attempt} thất bại`, {
        message: err.message,
        code: err.code,
        response: err.response?.data || {},
        status: err.response?.response.status
      });
      if (err.response?.status === 429) {
        throw new Error("Quota exceeded for OpenAI API");
      } else if (err.response?.status === 401) {
        throw new Error("Invalid OpenAI API key");
      } else if (err.response?.status >= 500) {
        throw new Error("OpenAI server error");
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
  const startTime = Date.now();
  console.log("Request received:", JSON.stringify(req.body, null, 2));
  const { messages, tuTruInfo, dungThan } = req.body;
  const useOpenAI = process.env.USE_OPENAI !== "false";
  const language = messages?.some(m => /[\u00C0-\u1EF9]/.test(m.content) || m.content.includes("hãy") || m.content.includes("ngày sinh")) ? "vi" : "en";

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
    console.log(`Xử lý yêu cầu mất ${Date.now() - startTime}ms`);
    return res.json({ answer });
  }

  // Gọi OpenAI với prompt tối ưu
  const prompt = `
Bạn là bậc thầy Bát Tự, trả lời bằng ${language === "vi" ? "tiếng Việt" : "English"}, ngắn gọn, chính xác, mang tính thơ ca nhưng dễ hiểu. Nhật Chủ là Thiên Can của ngày sinh. Cấu trúc:
1. Tính cách: Dựa trên Nhật Chủ ${tuTruParsed.ngay?.split(" ")[0]} (${canNguHanh[tuTruParsed?.ngay?.split(" ")[0]]}).
2. Nghề nghiệp: Dựa trên Dụng Thần ${dungThanHanh.join(", ")}.
3. Màu sắc may mắn: Dựa trên Dụng Thần, tránh tương khắc với ${canNguHanh[tuTruParsed?.ngay?.split(" ")[0]]}.
4. Lời khuyên: Cá nhân hóa dựa trên Nhật Chủ và Dụng Thần.
Chỉ đề cập đến Thập Thần và Thần Sát khi yêu cầu chứa "thập thần", "ten gods", "thần sát", "auspicious stars", hoặc "sao".

**Tứ Trụ**: Giờ ${tuTruParsed?.gio}, Ngày ${tuTruParsed?.ngay}, Tháng ${tuTruParsed?.thang}, Năm ${tuTruParsed?.nam}
**Ngũ Hành**: ${Object.entries(nguHanhCount).map(([k, v]) => `${k}: ${((v / Object.values(nguHanhCount).reduce((a, b) => a + b, 0)) * 100).toFixed(2)}%`).join(", ")}
${userInput.toLowerCase().includes("thập thần") || userInput.toLowerCase().includes("ten gods") ? `**Thập Thần**: ${Object.entries(thapThanResults).map(([elem, thapThan]) => ${elem}: ${thapThan}`).join(", ")}` : ""}
${userInput.toLowerCase().includes("thần sát") || userInput.toLowerCase().includes("auspicious stars") || userInput.toLowerCase().includes("sao") ? `**Thần Sát**: ${Object.entries(thanSatResults).filter(([_, value]) => value.value.length > 0).map(([key], value)) => `${value?.vi}: ${value?.value?.join(", ")}`).join("; ")}` : ""}
**Dụng Thần**: ${dungThanHanh.join(", ")}
**Câu hỏi**: ${userInput}
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
    console.log(`Xử lý yêu cầu mất ${Date.now() - startTime}ms`);
    return res.json({ answer: gptRes.choices[0].message.content });
  } catch (err) {
    console.error("GPT API error:", err.message, err.response?.data || {});
    console.log("Chuyển sang generateResponse do lỗi OpenAI");
    const answer = generateResponse(tuTruParsed, nguHanhCount, thapThanResults, dungThanHanh, userInput, messages, language);
    console.log(`Xử lý yêu cầu mất ${Date.now() - startTime}ms`);
    return res.json({ answer, warning: language === "vi" ? `Không thể kết nối với OpenAI: ${err.message}` : `Failed to connect to OpenAI: ${err.message}` });
  }
});

// Xử lý lỗi toàn cục
app.use((err, req, res, next) => {
  console.error("Lỗi server:", err.stack);
  res.status(500).json({ error: language === "vi" ? "Đã xảy ra lỗi hệ thống, vui lòng thử lại sau" : "A system error occurred, please try again later" });
});

// Khởi động server
const port = process.env.PORT || 5000;
const server = app.listen(port, async () => {
  console.log(`Server is running on port ${port}`);
  const isKeyValid = await checkOpenAIKey();
  console.log(`OpenAI API key valid: ${isKeyValid}`);
});
server.setTimeout(120000);
