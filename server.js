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

// Ánh xạ Thiên Can và Địa Chi từ tiếng Anh sang tiếng Việt
const heavenlyStemsMap = {
  en: { Jia: "Giáp", Yi: "Ất", Bing: "Bính", Ding: "Đinh", Wu: "Mậu", Ji: "Kỷ", Geng: "Canh", Xin: "Tân", Ren: "Nhâm", Gui: "Quý" },
  vi: { Giáp: "Giáp", Ất: "Ất", Bính: "Bính", Đinh: "Đinh", Mậu: "Mậu", Kỷ: "Kỷ", Canh: "Canh", Tân: "Tân", Nhâm: "Nhâm", Quý: "Quý" }
};
const earthlyBranchesMap = {
  en: { Rat: "Tý", Ox: "Sửu", Tiger: "Dần", Rabbit: "Mão", Dragon: "Thìn", Snake: "Tỵ", Horse: "Ngọ", Goat: "Mùi", Monkey: "Thân", Rooster: "Dậu", Dog: "Tuất", Pig: "Hợi" },
  vi: { Tý: "Tý", Sửu: "Sửu", Dần: "Dần", Mão: "Mão", Thìn: "Thìn", Tỵ: "Tỵ", Ngọ: "Ngọ", Mùi: "Mùi", Thân: "Thân", Dậu: "Dậu", Tuất: "Tuất", Hợi: "Hợi" }
};

// Chuyển đổi Tứ Trụ từ tiếng Anh sang tiếng Việt
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
  const baseYear = 1984; // Mốc Giáp Tý
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

  try {
    const elements = [
      tuTru.nam ? tuTru.nam.split(" ") : [],
      tuTru.thang ? tuTru.thang.split(" ") : [],
      tuTru.ngay ? tuTru.ngay.split(" ") : [],
      tuTru.gio ? tuTru.gio.split(" ") : []
    ].flat().filter(Boolean);

    for (const elem of elements) {
      if (canNguHanh[elem]) nguHanhCount[canNguHanh[elem]] += 1;
      if (chiNguHanh[elem]) nguHanhCount[chiNguHanh[elem]] += 1;
    }

    const total = Object.values(nguHanhCount).reduce((a, b) => a + b, 0);
    if (total !== 8) {
      throw new Error("Tổng số hành không đúng (phải bằng 8)");
    }
  } catch (e) {
    console.error("Lỗi phân tích ngũ hành:", e.message);
    throw new Error("Không thể phân tích ngũ hành do dữ liệu Tứ Trụ không hợp lệ");
  }

  return nguHanhCount;
};

// Tính Thập Thần dựa trên Nhật Chủ
const tinhThapThan = (nhatChu, tuTru) => {
  const canNguHanh = {
    Giáp: "Mộc", Ất: "Mộc", Bính: "Hỏa", Đinh: "Hỏa", Mậu: "Thổ",
    Kỷ: "Thổ", Canh: "Kim", Tân: "Kim", Nhâm: "Thủy", Quý: "Thủy"
  };
  const thapThanMap = {
    Mộc: { Mộc: ["Tỷ Kiên", "Kiếp Tài"], Hỏa: ["Thực Thần", "Thương Quan"], Thổ: ["Chính Tài", "Thiên Tài"], Kim: ["Chính Quan", "Thất Sát"], Thủy: ["Chính Ấn", "Thiên Ấn"] },
    Hỏa: { Hỏa: ["Tỷ Kiên", "Kiếp Tài"], Thổ: ["Thực Thần", "Thương Quan"], Kim: ["Chính Tài", "Thiên Tài"], Thủy: ["Chính Quan", "Thất Sát"], Mộc: ["Chính Ấn", "Thiên Ấn"] },
    Thổ: { Thổ: ["Tỷ Kiên", "Kiếp Tài"], Kim: ["Thực Thần", "Thương Quan"], Thủy: ["Chính Tài", "Thiên Tài"], Mộc: ["Chính Quan", "Thất Sát"], Hỏa: ["Chính Ấn", "Thiên Ấn"] },
    Kim: { Kim: ["Tỷ Kiên", "Kiếp Tài"], Thủy: ["Thực Thần", "Thương Quan"], Mộc: ["Chính Tài", "Thiên Tài"], Hỏa: ["Chính Quan", "Thất Sát"], Thổ: ["Chính Ấn", "Thiên Ấn"] },
    Thủy: { Thủy: ["Tỷ Kiên", "Kiếp Tài"], Mộc: ["Thực Thần", "Thương Quan"], Hỏa: ["Chính Tài", "Thiên Tài"], Thổ: ["Chính Quan", "Thất Sát"], Kim: ["Chính Ấn", "Thiên Ấn"] }
  };
  const isYang = ["Giáp", "Bính", "Mậu", "Canh", "Nhâm"].includes(nhatChu);
  const thapThanResults = {};

  try {
    const elements = [
      tuTru.nam ? tuTru.nam.split(" ")[0] : null,
      tuTru.thang ? tuTru.thang.split(" ")[0] : null,
      tuTru.gio ? tuTru.gio.split(" ")[0] : null
    ].filter(Boolean);

    for (const can of elements) {
      const nguHanh = canNguHanh[can];
      const isCanYang = ["Giáp", "Bính", "Mậu", "Canh", "Nhâm"].includes(can);
      const index = (isYang === isCanYang) ? 0 : 1;
      thapThanResults[can] = thapThanMap[canNguHanh[nhatChu]][nguHanh][index];
    }
  } catch (e) {
    console.error("Lỗi tính Thập Thần:", e.message);
    throw new Error("Không thể tính Thập Thần do dữ liệu Tứ Trụ không hợp lệ");
  }

  return thapThanResults;
};

// Tính Dụng Thần (Tổng quát cho mọi Nhật Can)
const tinhDungThan = (nhatChu, thangChi, nguHanhCount) => {
  const chiNguHanh = {
    Tý: "Thủy", Hợi: "Thủy", Sửu: "Thổ", Thìn: "Thổ", Mùi: "Thổ", Tuất: "Thổ",
    Dần: "Mộc", Mão: "Mộc", Tỵ: "Hỏa", Ngọ: "Hỏa", Thân: "Kim", Dậu: "Kim"
  };
  const canNguHanh = {
    Giáp: "Mộc", Ất: "Mộc", Bính: "Hỏa", Đinh: "Hỏa", Mậu: "Thổ",
    Kỷ: "Thổ", Canh: "Kim", Tân: "Kim", Nhâm: "Thủy", Quý: "Thủy"
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
  const nhatChuCount = nguHanhCount[nhatChuNguHanh];
  const khacNhatChuCount = nguHanhCount[tuongKhac[nhatChuNguHanh]];

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

// Hàm gọi API OpenAI với cơ chế retry
const callOpenAI = async (payload, retries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        payload,
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 30000
        }
      );
      return response.data;
    } catch (err) {
      if (attempt === retries) {
        console.error("Hết số lần thử lại:", err.message);
        throw err;
      }
      console.warn(`Thử lại lần ${attempt} do lỗi: ${err.message}`);
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
};

// API luận giải Bát Tự
app.post("/api/luan-giai-bazi", async (req, res) => {
  const { messages, tuTruInfo, dungThan } = req.body;

  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set');
    return res.status(500).json({ error: "Cấu hình API không hợp lệ" });
  }

  // Lấy tin nhắn người dùng gần nhất
  const lastUserMsg = messages.slice().reverse().find(m => m.role === "user");
  const userInput = lastUserMsg ? lastUserMsg.content.toLowerCase() : "";

  // Phát hiện ngôn ngữ
  const vietnameseKeywords = ["hãy", "ngày sinh", "xem bát tự", "luận bát tự", "lá số", "sức khỏe", "nghề", "công việc", "vận hạn", "tình duyên"];
  const englishKeywords = ["please", "my birth date", "interpret", "bazi", "health", "career", "job", "fortune", "love"];
  const vietnameseCount = vietnameseKeywords.reduce((count, kw) => count + (userInput.includes(kw) ? 1 : 0), 0);
  const englishCount = englishKeywords.reduce((count, kw) => count + (userInput.includes(kw) ? 1 : 0), 0);
  const language = vietnameseCount >= englishCount ? "vi" : "en";

  // Parse Tứ Trụ
  let tuTruParsed = tuTruInfo ? JSON.parse(tuTruInfo) : null;
  if (language === "en" && userInput.includes("my birth date is")) {
    tuTruParsed = parseEnglishTuTru(userInput) || tuTruParsed;
  }

  if (!tuTruParsed || !tuTruParsed.nam || !tuTruParsed.thang || !tuTruParsed.ngay || !tuTruParsed.gio) {
    return res.status(400).json({ 
      error: language === "vi" 
        ? "Vui lòng cung cấp đầy đủ thông tin Tứ Trụ (năm, tháng, ngày, giờ)" 
        : "Please provide complete Four Pillars information (year, month, day, hour)" 
    });
  }

  // Phân tích ngũ hành
  let nguHanhCount;
  try {
    nguHanhCount = analyzeNguHanh(tuTruParsed);
  } catch (e) {
    console.error("Lỗi trong analyzeNguHanh:", e.message);
    return res.status(400).json({ 
      error: language === "vi" 
        ? e.message 
        : "Unable to analyze Five Elements due to invalid Four Pillars data" 
    });
  }

  const totalElements = Object.values(nguHanhCount).reduce((a, b) => a + b, 0);
  const tyLeNguHanh = Object.fromEntries(
    Object.entries(nguHanhCount).map(([k, v]) => [k, `${((v / totalElements) * 100).toFixed(2)}%`])
  );

  const nhatChu = tuTruParsed.ngay.split(" ")[0];
  const thangChi = tuTruParsed.thang.split(" ")[1];

  // Tính Thập Thần
  let thapThanResults;
  try {
    thapThanResults = tinhThapThan(nhatChu, tuTruParsed);
  } catch (e) {
    console.error("Lỗi trong tinhThapThan:", e.message);
    return res.status(400).json({ 
      error: language === "vi" 
        ? e.message 
        : "Unable to calculate Ten Gods due to invalid Four Pillars data" 
    });
  }

  // Tính Dụng Thần (Tổng quát cho mọi lá số)
  let dungThanResult;
  try {
    dungThanResult = tinhDungThan(nhatChu, thangChi, nguHanhCount);
  } catch (e) {
    console.error("Lỗi trong tinhDungThan:", e.message);
    return res.status(400).json({ 
      error: language === "vi" 
        ? e.message 
        : "Unable to calculate Useful God due to invalid data" 
    });
  }

  const dungThanText = `
${language === "vi" ? "Dụng Thần:" : "Useful God:"} ${dungThanResult.dungThan.join(", ")}
${language === "vi" ? "Lý do chọn Dụng Thần:" : "Reason for selecting Useful God:"} ${dungThanResult.lyDo}
${language === "vi" ? "Cách Cục:" : "Pattern:"} ${dungThanResult.cachCuc}
`;

  // Tính Can Chi và ngũ hành của năm
  const yearMatch = userInput.match(/năm\s*(\d{4})/) || userInput.match(/year\s*(\d{4})/);
  let year = yearMatch ? parseInt(yearMatch[1]) : (userInput.includes("năm tới") || userInput.includes("năm sau") || userInput.includes("next year")) ? new Date().getFullYear() + 1 : new Date().getFullYear();
  const yearCanChi = year ? getCanChiForYear(year) : null;
  const canNguHanh = {
    Giáp: "Mộc", Ất: "Mộc", Bính: "Hỏa", Đinh: "Hỏa", Mậu: "Thổ",
    Kỷ: "Thổ", Canh: "Kim", Tân: "Kim", Nhâm: "Thủy", Quý: "Thủy"
  };
  const chiNguHanh = {
    Tý: "Thủy", Hợi: "Thủy", Sửu: "Thổ", Thìn: "Thổ", Mùi: "Thổ", Tuất: "Thổ",
    Dần: "Mộc", Mão: "Mộc", Tỵ: "Hỏa", Ngọ: "Hỏa", Thân: "Kim", Dậu: "Kim"
  };
  let yearNguHanh = "";
  if (yearCanChi) {
    const [can, chi] = yearCanChi.split(" ");
    yearNguHanh = `${can} (${canNguHanh[can] || "chưa rõ"}), ${chi} (${chiNguHanh[chi] || "chưa rõ"})`;
  }

  // Prompt học thuật, chạm nội tâm
  let fullPrompt = `
Bạn là một bậc thầy Bát Tự, am hiểu sâu sắc văn hóa ${language === "vi" ? "Việt Nam" : "Chinese astrology"}, với khả năng diễn đạt tinh tế, thơ ca, chạm đến nội tâm người nghe. Trả lời bằng ${language === "vi" ? "tiếng Việt" : "English"}, dài, chi tiết, học thuật nhưng dễ hiểu, sử dụng ẩn dụ tự nhiên như vàng trong đất, cây xanh trong gió, hay dòng sông linh hoạt. Câu trả lời cần giải quyết "nỗi đau" của người dùng: tìm hiểu bản thân, định hướng cuộc sống, vượt qua thử thách, và tìm sự cân bằng. Tránh diễn đạt rập khuôn, đặc biệt khi phân tích tỷ lệ ngũ hành; thay vào đó, mô tả ngũ hành như một bức tranh sống động. Chỉ sử dụng Tứ Trụ để minh họa tương tác Can-Chi, không phân tích lá số cá nhân chi tiết trừ khi cần. Xử lý mọi Nhật Can (Giáp, Ất, Bính, Đinh, Mậu, Kỷ, Canh, Tân, Nhâm, Quý) và áp dụng Dụng Thần chính xác, không áp dụng Tòng Cách trừ khi được yêu cầu.

Thông tin:
${language === "vi" ? "Tứ Trụ:" : "Four Pillars:"} Giờ ${tuTruParsed.gio}, Ngày ${tuTruParsed.ngay}, Tháng ${tuTruParsed.thang}, Năm ${tuTruParsed.nam}
${language === "vi" ? "Tỷ lệ Ngũ Hành:" : "Five Elements Ratio:"} ${Object.entries(tyLeNguHanh).map(([k, v]) => `${k}: ${v}`).join(", ")}
${language === "vi" ? "Thập Thần:" : "Ten Gods:"} ${Object.entries(thapThanResults).map(([can, thapThan]) => `${can}: ${thapThan}`).join(", ")}
${dungThanText}
${canChiNguhanhInfo}
Năm hiện tại: ${year} (${yearCanChi || "chưa rõ"}, ngũ hành: ${yearNguHanh || "chưa rõ"})

Nguyên lý ngũ hành:
- Tương sinh: Mộc sinh Hỏa, Hỏa sinh Thổ, Thổ sinh Kim, Kim sinh Thủy, Thủy sinh Mộc.
- Tương khắc: Mộc khắc Thổ, Thổ khắc Thủy, Thủy khắc Hỏa, Hỏa khắc Kim, Kim khắc Mộc.

Thập Thần (dựa trên Nhật Chủ ${nhatChu}):
- Tỷ Kiên: Cùng hành, cùng âm dương (bạn bè, cạnh tranh, sự kiên định).
- Kiếp Tài: Cùng hành, khác âm dương (đối thủ, rủi ro tài chính, thử thách).
- Thực Thần: Nhật Chủ sinh, cùng âm dương (sáng tạo, ẩm thực, nghệ thuật).
- Thương Quan: Nhật Chủ sinh, khác âm dương (phản kháng, tài năng bộc phát).
- Chính Tài: Nhật Chủ khắc, khác âm dương (quản lý tài chính, sự ổn định).
- Thiên Tài: Nhật Chủ khắc, cùng âm dương (kiếm tiền nhanh, trực giác).
- Chính Quan: Khắc Nhật Chủ, khác âm dương (trách nhiệm, công chức, uy tín).
- Thất Sát: Khắc Nhật Chủ, cùng âm dương (quyết đoán, mạo hiểm, áp lực).
- Chính Ấn: Sinh Nhật Chủ, khác âm dương (học thuật, bảo vệ, trí tuệ).
- Thiên Ấn: Sinh Nhật Chủ, cùng âm dương (trực giác, tâm linh, sáng tạo độc đáo).

Hướng dẫn trả lời:
1. Phân tích Nhật Can ${nhatChu} (${canNguHanh[nhatChu]}), mô tả đặc điểm tính cách và vận mệnh theo hành: 
   - Mộc (Giáp, Ất): Như cây cối, kiên cường, phát triển.
   - Hỏa (Bính, Đinh): Như ngọn lửa, đam mê, rực rỡ.
   - Thổ (Mậu, Kỷ): Như ngọn núi, ổn định, che chở.
   - Kim (Canh, Tân): Như kim loại, sắc bén, kiên định.
   - Thủy (Nhâm, Quý): Như dòng sông, linh hoạt, trí tuệ.
   Minh họa tương sinh/tương khắc với các hành trong Tứ Trụ (${tuTruParsed.gio}, ${tuTruParsed.ngay}, ${tuTruParsed.thang}, ${tuTruParsed.nam}).
2. Mô tả tỷ lệ ngũ hành (${Object.entries(tyLeNguHanh).map(([k, v]) => `${k}: ${v}`).join(", ")}) như một bức tranh: Hỏa như ngọn lửa soi đường, Thủy như dòng sông linh hoạt, Thổ như ngọn núi che chở, Kim như vàng quý, Mộc như rừng xanh. Liên hệ với Dụng Thần (${dungThanResult.dungThan.join(", ")}) để định hướng cuộc sống.
3. Phân tích Thập Thần (${Object.entries(thapThanResults).map(([can, thapThan]) => `${can}: ${thapThan}`).join(", ")}) để làm rõ khát vọng nội tâm, ví dụ: Chính Ấn mang sự bảo vệ, Thực Thần khơi dậy sáng tạo.
4. Đề xuất ứng dụng Dụng Thần (${dungThanResult.dungThan.join(", ")}):
   - Nghề nghiệp: Mộc (giáo dục, sáng tạo), Hỏa (truyền thông, nghệ thuật), Thổ (bất động sản, tài chính), Kim (công nghệ, kỹ thuật), Thủy (giao tiếp, du lịch).
   - Màu sắc: Dựa trên tương sinh với Dụng Thần, ví dụ: Thổ (vàng, nâu), Kim (trắng, bạc), Mộc (xanh lá), Hỏa (đỏ), Thủy (xanh dương, đen).
   - Vật phẩm: Đá phong thủy (thạch anh, ngọc bích), trang sức phù hợp hành.
   - Hướng: Đông (Mộc), Nam (Hỏa), Đông Bắc (Thổ), Tây (Kim), Bắc (Thủy).
5. Giải quyết "nỗi đau" của người dùng: tìm kiếm ý nghĩa bản thân, định hướng nghề nghiệp, sức khỏe, hay tình duyên. Sử dụng ngôn ngữ thơ ca, ví dụ: "${language === "vi" ? "Như cây xanh vươn mình trong gió, bạn sẽ tìm thấy ánh sáng của vận mệnh." : "Like a tree reaching for the sky, you will find the light of your destiny."}"
`;

  // Xác định loại câu hỏi
  const isRequestBazi = userInput.includes("hãy xem bát tự") || userInput.includes("xem bát tự") || userInput.includes("luận bát tự") || userInput.includes("xem lá số") || userInput.includes("please interpret my bazi");
  const isAskingYearOrDaiVan = /(năm\s*\d{4}|năm\s*\w+|đại vận|vận hạn|vận mệnh|năm tới|năm sau|vận trong năm|year|next year|fortune)/.test(userInput) && !isRequestBazi;
  const isAskingHealth = userInput.includes("sức khỏe") || userInput.includes("cha mẹ") || userInput.includes("bệnh tật") || userInput.includes("health");
  const isAskingCareer = userInput.includes("nghề") || userInput.includes("công việc") || userInput.includes("thủy sản") || userInput.includes("kinh doanh") || userInput.includes("career") || userInput.includes("job");
  const isAskingLove = userInput.includes("tình duyên") || userInput.includes("hôn nhân") || userInput.includes("tình yêu") || userInput.includes("love") || userInput.includes("marriage");

  if (isRequestBazi) {
    fullPrompt += `
Hướng dẫn phân tích Bát Tự:
1. Mô tả Nhật Can ${nhatChu} (${canNguHanh[nhatChu]}) với đặc điểm tính cách và vận mệnh, ví dụ: Tân Kim như vàng tinh luyện, kiên định nhưng cần đất nuôi dưỡng. Phân tích tương sinh/tương khắc với các hành trong Tứ Trụ, ví dụ: ${nhatChu} đối mặt ${chiNguHanh[tuTruParsed.ngay.split(" ")[1]]} như ${canNguHanh[nhatChu]} trong bối cảnh ${chiNguHanh[tuTruParsed.ngay.split(" ")[1]]}, được ${canNguHanh[tuTruParsed.gio.split(" ")[0]]} hỗ trợ.
2. Mô tả ngũ hành như một bức tranh sống động, ví dụ: Hỏa như ngọn lửa rực cháy, Thủy như dòng sông mát lành. Liên hệ với Dụng Thần (${dungThanResult.dungThan.join(", ")}) để giúp người dùng cân bằng cuộc sống.
3. Phân tích Thập Thần để làm rõ khát vọng nội tâm, ví dụ: Chính Ấn mang sự bảo vệ, Thực Thần khơi dậy sáng tạo. Gợi ý cách tận dụng Thập Thần để vượt qua "nỗi đau" như mất phương hướng.
4. Đề xuất ứng dụng thực tế: nghề nghiệp, màu sắc, vật phẩm, hướng phù hợp với Dụng Thần.
5. Kết thúc bằng lời chúc thơ ca, ví dụ: "${language === "vi" ? "Cầu chúc bạn như ${canNguHanh[nhatChu].toLowerCase()} tỏa sáng giữa đất trời, vận mệnh rạng ngời." : "May you shine like ${canNguHanh[nhatChu].toLowerCase()} under the heavens, your destiny radiant."}"
`;
  } else if (isAskingYearOrDaiVan) {
    fullPrompt += `
Hướng dẫn phân tích vận năm ${year || "chưa rõ"}:
1. Phân tích tương tác ngũ hành của năm (${yearCanChi || "chưa rõ"}, ${yearNguHanh || "chưa rõ"}) với Nhật Can ${nhatChu}. Ví dụ: Năm ${yearCanChi} (${yearNguHanh}) tương tác với ${canNguHanh[nhatChu]} như ${canNguHanh[nhatChu].toLowerCase()} trong bối cảnh ${yearNguHanh.split(", ")[1] || "chưa rõ"}.
2. Liên hệ với Thập Thần và Dụng Thần (${dungThanResult.dungThan.join(", ")}) để đề xuất cách tận dụng cơ hội hoặc vượt qua thách thức.
3. Mô tả năm như một hành trình, ví dụ: "${language === "vi" ? "Năm như ngọn gió thổi qua, cần ${dungThanResult.dungThan[0].toLowerCase()} để giữ vững ánh sáng." : "The year is like a breeze passing through, needing ${dungThanResult.dungThan[0].toLowerCase()} to hold your light."}"
4. Đề xuất ứng dụng: nghề nghiệp, màu sắc, vật phẩm, hướng phù hợp.
5. Kết thúc bằng lời chúc, ví dụ: "${language === "vi" ? "Cầu chúc bạn như ${canNguHanh[nhatChu].toLowerCase()} đứng vững trước gió, vận mệnh rạng ngời." : "May you stand like ${canNguHanh[nhatChu].toLowerCase()} against the wind, your destiny shining brightly."}"
`;
  } else if (isAskingCareer) {
    fullPrompt += `
Hướng dẫn trả lời về nghề nghiệp ("${userInput}"):
1. Phân tích nghề nghiệp liên quan đến Dụng Thần (${dungThanResult.dungThan.join(", ")}) và tương sinh với Nhật Can ${nhatChu}. Ví dụ: Dụng Thần ${dungThanResult.dungThan[0]} như ${dungThanResult.dungThan[0].toLowerCase()} nuôi dưỡng ${canNguHanh[nhatChu].toLowerCase()}.
2. Liên hệ Thập Thần, ví dụ: Thực Thần thúc đẩy sáng tạo, Chính Ấn mang sự ổn định.
3. Giải quyết "nỗi đau" như thiếu định hướng nghề nghiệp, ví dụ: "${language === "vi" ? "Như ${canNguHanh[nhatChu].toLowerCase()} tìm thấy ${dungThanResult.dungThan[0].toLowerCase()}, bạn sẽ khám phá con đường sự nghiệp rực rỡ." : "Like ${canNguHanh[nhatChu].toLowerCase()} finding ${dungThanResult.dungThan[0].toLowerCase()}, you will discover a radiant career path."}"
4. Đề xuất nghề, màu sắc, vật phẩm, hướng phù hợp.
5. Kết thúc bằng lời chúc, ví dụ: "${language === "vi" ? "Cầu chúc sự nghiệp bạn như ${canNguHanh[nhatChu].toLowerCase()} được ${dungThanResult.dungThan[0].toLowerCase()} nâng niu, tỏa sáng muôn đời." : "May your career shine like ${canNguHanh[nhatChu].toLowerCase()} cradled by ${dungThanResult.dungThan[0].toLowerCase()}, radiant forever."}"
`;
  } else if (isAskingHealth) {
    fullPrompt += `
Hướng dẫn trả lời về sức khỏe ("${userInput}"):
1. Phân tích ngũ hành liên quan đến sức khỏe, tập trung vào Dụng Thần (${dungThanResult.dungThan.join(", ")}) và Nhật Can ${nhatChu}. Ví dụ: ${dungThanResult.dungThan[0]} như ${dungThanResult.dungThan[0].toLowerCase()} che chở ${canNguHanh[nhatChu].toLowerCase()}.
2. Liên hệ Thập Thần, ví dụ: Chính Ấn mang sự bảo vệ, Thực Thần mang sự thư thái.
3. Giải quyết "nỗi đau" như lo lắng về sức khỏe, ví dụ: "${language === "vi" ? "Như ${canNguHanh[nhatChu].toLowerCase()} được ${dungThanResult.dungThan[0].toLowerCase()} sưởi ấm, sức khỏe bạn sẽ bền lâu." : "Like ${canNguHanh[nhatChu].toLowerCase()} warmed by ${dungThanResult.dungThan[0].toLowerCase()}, your health will endure."}"
4. Đề xuất màu sắc, vật phẩm, hướng phù hợp.
5. Kết thúc bằng lời chúc, ví dụ: "${language === "vi" ? "Cầu chúc sức khỏe bạn như ${canNguHanh[nhatChu].toLowerCase()} lấp lánh, vững bền như ${dungThanResult.dungThan[0].toLowerCase()}." : "May your health shine like ${canNguHanh[nhatChu].toLowerCase()}, enduring like ${dungThanResult.dungThan[0].toLowerCase()}."}"
`;
  } else if (isAskingLove) {
    fullPrompt += `
Hướng dẫn trả lời về tình duyên ("${userInput}"):
1. Phân tích tình duyên liên quan đến Nhật Can ${nhatChu} và Dụng Thần (${dungThanResult.dungThan.join(", ")}). Ví dụ: ${nhatChu} (${canNguHanh[nhatChu]}) như ${canNguHanh[nhatChu].toLowerCase()} cần ${dungThanResult.dungThan[0].toLowerCase()} để bền vững.
2. Liên hệ tương sinh/tương khắc và Thập Thần, ví dụ: Thực Thần mang sự hòa hợp, Chính Quan mang sự trách nhiệm.
3. Giải quyết "nỗi đau" như tìm kiếm tình yêu, ví dụ: "${language === "vi" ? "Như ${canNguHanh[nhatChu].toLowerCase()} tìm thấy ${dungThanResult.dungThan[0].toLowerCase()}, tình duyên bạn sẽ nở hoa." : "Like ${canNguHanh[nhatChu].toLowerCase()} finding ${dungThanResult.dungThan[0].toLowerCase()}, your love will blossom."}"
4. Đề xuất màu sắc, vật phẩm, hướng để thu hút tình duyên.
5. Kết thúc bằng lời chúc, ví dụ: "${language === "vi" ? "Cầu chúc tình duyên bạn như ${canNguHanh[nhatChu].toLowerCase()} lấp lánh, mãi mãi bền lâu." : "May your love shine like ${canNguHanh[nhatChu].toLowerCase()}, enduring forever."}"
`;
  } else {
    fullPrompt += `
Hướng dẫn trả lời câu hỏi tự do ("${userInput}"):
1. Phân tích câu hỏi liên quan đến Nhật Can ${nhatChu} và tương sinh/tương khắc. Ví dụ: ${nhatChu} (${canNguHanh[nhatChu]}) như ${canNguHanh[nhatChu].toLowerCase()} cần ${dungThanResult.dungThan[0].toLowerCase()} để tỏa sáng.
2. Liên hệ Thập Thần và Dụng Thần (${dungThanResult.dungThan.join(", ")}) để giải đáp, sử dụng ẩn dụ tự nhiên.
3. Giải quyết "nỗi đau" của người dùng, ví dụ: "${language === "vi" ? "Như ${canNguHanh[nhatChu].toLowerCase()} lấp lánh trong ${dungThanResult.dungThan[0].toLowerCase()}, bạn sẽ tìm thấy ánh sáng của vận mệnh." : "Like ${canNguHanh[nhatChu].toLowerCase()} gleaming in ${dungThanResult.dungThan[0].toLowerCase()}, you will find the light of your destiny."}"
4. Đề xuất ứng dụng: nghề nghiệp, màu sắc, vật phẩm, hướng.
5. Kết thúc bằng lời chúc thơ ca, ví dụ: "${language === "vi" ? "Cầu chúc bạn như ${canNguHanh[nhatChu].toLowerCase()} được ${dungThanResult.dungThan[0].toLowerCase()} nâng niu, vận mệnh rạng ngời." : "May your destiny shine like ${canNguHanh[nhatChu].toLowerCase()} cradled by ${dungThanResult.dungThan[0].toLowerCase()}, radiant forever."}"
`;
  }

  fullPrompt += `
Câu hỏi: "${userInput}"
Bắt đầu trả lời:
`;

  // Chuẩn bị messages gửi tới GPT
  const formattedMessages = messages.map(m => ({
    role: m.role,
    content: m.role === "user" && m === lastUserMsg ? fullPrompt.trim() : m.content
  }));

  try {
    const gptRes = await callOpenAI({
      model: "gpt-3.5-turbo",
      messages: formattedMessages,
      temperature: 0.4,
      max_tokens: 2500, // Tăng để đảm bảo câu trả lời dài, chi tiết
      top_p: 0.9,
      frequency_penalty: 0.2,
      presence_penalty: 0.1
    });

    const answer = gptRes.choices[0].message.content;
    res.json({ answer });
  } catch (err) {
    console.error("GPT API error:", err.response?.data || err.message);
    res.status(500).json({ 
      error: language === "vi" 
        ? "Lỗi kết nối đến dịch vụ luận giải Bát Tự" 
        : "Error connecting to Bazi analysis service" 
    });
  }
});

// Xử lý lỗi toàn cục
app.use((err, req, res, next) => {
  console.error("Lỗi server:", err.stack);
  res.status(500).json({ 
    error: req.body.language === "vi" 
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
