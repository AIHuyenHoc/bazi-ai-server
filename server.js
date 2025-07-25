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
  "Giáp Dần", "Ất Mão", "Bính Thìn", "Đinh Tỵ", "Mậu Ngọ", "Kỷ Mùi", "Canh Thân", "Tân Dậu", "Nhâm Tuất", "Quý Hợi"
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
    throw new Error("Invalid nhatChu or branches");
  }

  return {
    "Thiên Ất Quý Nhân": { vi: "Thiên Ất Quý Nhân", en: "Nobleman Star", value: thienAtQuyNhan[nhatChu]?.filter(chi => branches.includes(chi)) || [] },
    "Đào Hoa": { vi: "Đào Hoa", en: "Peach Blossom", value: branches.includes(daoHoa[tuTru.ngay?.split(" ")[1]]) ? [daoHoa[tuTru.ngay?.split(" ")[1]]] : [] },
    "Hồng Loan": { vi: "Hồng Loan", en: "Red Phoenix", value: branches.includes(hongLoan[tuTru.ngay?.split(" ")[1]]) ? [hongLoan[tuTru.ngay?.split(" ")[1]]] : [] }
  };
};

const personalityDescriptions = {
  Mộc: { vi: "sáng tạo, linh hoạt", en: "creative, adaptable" },
  Hỏa: { vi: "đam mê, năng động", en: "passionate, energetic" },
  Thổ: { vi: "vững chãi, đáng tin", en: "steadfast, reliable" },
  Kim: { vi: "tinh tế, quyết tâm", en: "elegant, determined" },
  Thủy: { vi: "sâu sắc, trí tuệ", en: "profound, intelligent" }
};

const thapThanEffects = {
  "Tỷ Kiên": { vi: "Tự lập, mạnh mẽ", en: "Independent, strong" },
  "Kiếp Tài": { vi: "Tài năng, quyết đoán", en: "Talented, decisive" },
  "Thực Thần": { vi: "Sáng tạo, nghệ thuật", en: "Creative, artistic" },
  "Thương Quan": { vi: "Tư duy sắc bén", en: "Sharp-minded" },
  "Chính Tài": { vi: "Giỏi tài chính", en: "Good at finance" },
  "Thiên Tài": { vi: "Nhạy bén", en: "Perceptive" },
  "Chính Quan": { vi: "Trách nhiệm, uy tín", en: "Responsible, influential" },
  "Thất Sát": { vi: "Dũng cảm", en: "Courageous" },
  "Chính Ấn": { vi: "Trí tuệ", en: "Wise" },
  "Thiên Ấn": { vi: "Sáng tạo", en: "Creative" }
};

const determineQuestionType = (userInput, language) => {
  const normalizedInput = typeof userInput === "string" ? userInput.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
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
  types.isGeneral = !types.isMoney && !types.isCareer && !types.isHealth && !types.isLove && !types.isChildren && !types.isComplex && !types.isThapThan && !types.isThanSat;
  return types;
};

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

  const { isGeneral, isMoney, isCareer, isHealth, isLove, isChildren, isComplex, isThapThan, isThanSat } = determineQuestionType(userInput, language);

  if (isComplex) {
    return `${language === "vi" ? "Vui lòng gửi câu hỏi qua app.aihuyenhoc@gmail.com" : "Please send questions to app.aihuyenhoc@gmail.com"}`;
  }

  let response = "";

  if (isGeneral) {
    response += `
${language === 'vi' ? "Luận giải Bát Tự:" : "Bazi Interpretation:"}
${language === 'vi' ? `Nhật Chủ ${nhatChu} (${canNguHanh[nhatChu]}): ${personalityDescriptions[canNguHanh[nhatChu]].vi}` : `Day Master ${nhatChu} (${canNguHanh[nhatChu]}): ${personalityDescriptions[canNguHanh[nhatChu]].en}`}
Tứ Trụ: ${language === "vi" ? `Giờ ${tuTru.gio}, Ngày ${tuTru.ngay}, Tháng ${tuTru.thang}, Năm ${tuTru.nam}` : `Hour ${tuTru.gio}, Day ${tuTru.ngay}, Month ${tuTru.thang}, Year ${tuTru.nam}`}
Ngũ Hành: ${Object.entries(tyLeNguHanh).map(([k, v]) => `${k}: ${v}`).join(", ")}
${language === "vi" ? `Dụng Thần: ${dungThan.join(", ")}` : `Useful God: ${dungThan.join(", ")}`}
Nghề nghiệp: ${language === "vi" ? `Phù hợp ${dungThan.includes("Mộc") ? "giáo dục, nghệ thuật" : "tư vấn, giao tiếp"}` : `Suitable for ${dungThan.includes("Mộc") ? "education, arts" : "consulting, communication"}`}
Đề xuất: ${language === "vi" ? `Màu sắc ${dungThan.includes("Mộc") ? "xanh lá" : "xanh dương"}` : `Color ${dungThan.includes("Mộc") ? "green" : "blue"}`}
`;
  }

  if (isMoney) {
    response += `
${language === "vi" ? "Tài lộc:" : "Wealth:"}
${language === "vi" ? `Tài lộc phụ thuộc Dụng Thần ${dungThan[0]}` : `Wealth depends on Useful God ${dungThan[0]}`}
`;
  } else if (isCareer) {
    response += `
${language === "vi" ? "Sự nghiệp:" : "Career:"}
${language === "vi" ? `Phù hợp ${dungThan.includes("Mộc") ? "giáo dục, nghệ thuật" : "tư vấn"}` : `Suitable for ${dungThan.includes("Mộc") ? "education, arts" : "consulting"}`}
`;
  } else if (isLove) {
    response += `
${language === "vi" ? "Tình duyên:" : "Love:"}
${language === "vi" ? `Tình duyên nở hoa với Dụng Thần ${dungThan[0]}` : `Love blossoms with Useful God ${dungThan[0]}`}
`;
  } else if (isHealth) {
    response += `
${language === "vi" ? "Sức khỏe:" : "Health:"}
${language === "vi" ? `Cần cân bằng Dụng Thần ${dungThan[0]}` : `Balance with Useful God ${dungThan[0]}`}
`;
  } else if (isChildren) {
    response += `
${language === "vi" ? "Con cái:" : "Children:"}
${language === "vi" ? `Con cái mang niềm vui với Dụng Thần ${dungThan[0]}` : `Children bring joy with Useful God ${dungThan[0]}`}
`;
  }

  if (isThapThan) {
    response += `
${language === "vi" ? "Thập Thần:" : "Ten Gods:"}
${Object.entries(thapThanResults).map(([elem, thapThan]) => thapThanEffects[thapThan] ? `${elem}: ${thapThanEffects[thapThan][language]}` : "").filter(Boolean).join("\n")}
`;
  }

  if (isThanSat) {
    const activeThanSat = Object.entries(tinhThanSat(tuTru))
      .filter(([_, value]) => value.value.length)
      .map(([key, value]) => `${value[language]}: ${value.value.join(", ")}`);
    response += `
${language === "vi" ? "Thần Sát:" : "Auspicious Stars:"}
${activeThanSat.length > 0 ? activeThanSat.join("\n") : language === "vi" ? "Không có Thần Sát nổi bật" : "No prominent stars"}
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
  const { messages, tuTruInfo, dungThan } = req.body;
  const useOpenAI = process.env.USE_OPENAI !== "false";
  const language = messages?.some(m => /[\u00C0-\u1EF9]/.test(m.content)) ? "vi" : "en";

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: language === "vi" ? "Thiếu messages" : "Missing messages" });
  }
  if (!tuTruInfo || typeof tuTruInfo !== "string") {
    return res.status(400).json({ error: language === "vi" ? "Thiếu tuTruInfo" : "Missing tuTruInfo" });
  }
  let dungThanHanh = Array.isArray(dungThan) ? dungThan : dungThan?.hanh || [];
  if (!dungThanHanh.every(d => ["Mộc", "Hỏa", "Thổ", "Kim", "Thủy"].includes(d))) {
    return res.status(400).json({ error: language === "vi" ? "Dụng Thần không hợp lệ" : "Invalid Useful God" });
  }

  const userInput = messages?.slice().reverse().find(m => m.role === "user")?.content || "";

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
    tuTru = parseEnglishTuTru(userInput);
    if (!tuTru || !tuTru.gio || !tuTru.ngay || !tuTru.thang || !tuTru.nam) {
      return res.status(400).json({ error: language === "vi" ? "Tứ Trụ không hợp lệ" : "Invalid Four Pillars" });
    }
  }

  let nguHanh;
  try {
    nguHanh = analyzeNguHanh(tuTru);
  } catch (err) {
    return res.status(400).json({ error: language === "vi" ? "Dữ liệu ngũ hành không hợp lệ" : "Invalid Five Elements" });
  }

  let thapThanResults = {};
  if (/thap than|ten gods/i.test(userInput)) {
    try {
      thapThanResults = tinhThapThan(tuTru.ngay?.split(" ")[0], tuTru);
    } catch (err) {
      return res.status(400).json({ error: language === "vi" ? "Dữ liệu Thập Thần không hợp lệ" : "Invalid Ten Gods" });
    }
  }

  let thanSatResults = {};
  if (/than sat|auspicious stars|sao/i.test(userInput)) {
    try {
      thanSatResults = tinhThanSat(tuTru);
    } catch (err) {
      return res.status(400).json({ error: language === "vi" ? "Dữ liệu Thần Sát không hợp lệ" : "Invalid Stars" });
    }
  }

  if (!useOpenAI) {
    const answer = generateResponse(tuTru, nguHanh, thapThanResults, dungThanHanh, userInput, messages, language);
    console.log(`Tổng thời gian xử lý: ${Date.now() - startTime}ms`);
    return res.json({ answer });
  }

  const prompt = `
Bắt buộc trả lời bằng ${language === "vi" ? "tiếng Việt" : "English"}. Nhật Chủ là Thiên Can ngày sinh. Cấu trúc:
- Tính cách: Dựa trên Nhật Chủ ${tuTru.ngay?.split(" ")[0] || "Unknown"}.
- Nghề nghiệp: Dựa trên Dụng Thần ${dungThanHanh.join(", ")}.
- Màu sắc: Dựa trên Dụng Thần.
- Lời khuyên: Cá nhân hóa.

Tứ Trụ: Giờ ${tuTru.gio || "N/A"}, Ngày ${tuTru.ngay || "N/A"}, Tháng ${tuTru.thang || "N/A"}, Năm ${tuTru.nam || "N/A"}
Ngũ Hành: ${Object.entries(nguHanh).map(([k, v]) => `${k}: ${v}`).join(", ") || "N/A"}
${/thap than|ten gods/i.test(userInput) ? `Thập Thần: ${Object.entries(thapThanResults).map(([k, v]) => `${k}: ${v}`).join(", ") || "N/A"}` : ""}
${/than sat|auspicious stars|sao/i.test(userInput) ? `Thần Sát: ${Object.entries(thanSatResults).map(([k, v]) => `${v[language]}: ${v.value.join(", ") || "N/A"}`).join("; ") || "N/A"}` : ""}
Dụng Thần: ${dungThanHanh.join(", ") || "N/A"}
Câu hỏi: ${userInput || "N/A"}
`;

  try {
    const gptRes = await callOpenAI({
      model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 1500
    });
    console.log(`Tổng thời gian xử lý: ${Date.now() - startTime}ms`);
    return res.json({ answer: gptRes.choices[0].message.content });
  } catch (err) {
    console.error("OpenAI error:", err.message);
    const answer = generateResponse(tuTru, nguHanh, thapThanResults, dungThanHanh, userInput, messages, language);
    return res.json({ answer, warning: language === "vi" ? `Không thể kết nối với OpenAI: ${err.message}` : `Failed to connect with OpenAI: ${err.message}` });
  }
});

app.use((err, req, res, next) => {
  console.error("Lỗi hệ thống:", err.stack);
  res.status(500).json({ error: language === "vi" ? "Lỗi hệ thống xảy ra" : "System error occurred" });
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
