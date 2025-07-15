const express = require("express");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs").promises;
require("dotenv").config();

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

// Tính Dụng Thần
const tinhDungThan = (nhatChu, thangChi, nguHanhCount) => {
  const chiNguHanh = {
    Tý: "Thủy", Hợi: "Thủy", Sửu: "Thổ", Thìn: "Thổ", Mùi: "Thổ", Tuất: "Thổ",
    Dần: "Mộc", Mão: "Mộc", Tỵ: "Hỏa", Ngọ: "Hỏa", Thân: "Kim", Dậu: "Kim"
  };
  const nhatChuHanh = {
    Giáp: "Mộc", Ất: "Mộc", Bính: "Hỏa", Đinh: "Hỏa", Mậu: "Thổ",
    Kỷ: "Thổ", Canh: "Kim", Tân: "Kim", Nhâm: "Thủy", Quý: "Thủy"
  };
  const tuongSinh = { Mộc: "Hỏa", Hỏa: "Thổ", Thổ: "Kim", Kim: "Thủy", Thủy: "Mộc" };
  const tuongKhac = { Mộc: "Thổ", Thổ: "Thủy", Thủy: "Hỏa", Hỏa: "Kim", Kim: "Mộc" };

  if (!nhatChu || !thangChi || !nhatChuHanh[nhatChu] || !chiNguHanh[thangChi]) {
    throw new Error("Nhật Chủ hoặc tháng sinh không hợp lệ");
  }

  const thangHanh = chiNguHanh[thangChi];
  const nhatChuNguHanh = nhatChuHanh[nhatChu];
  const thangTrongSo = {
    Mộc: ["Dần", "Mão"], Hỏa: ["Tỵ", "Ngọ"], Thổ: ["Sửu", "Thìn", "Mùi", "Tuất"],
    Kim: ["Thân", "Dậu"], Thủy: ["Tý", "Hợi"]
  };

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
    lyDo = `Vì Thân Vượng, cần tiết khí bằng hành khắc Nhật Chủ (${tuongKhac[nhatChuNguHanh]}) và hành tiết khí (${tuongKhac[tuongSinh[nhatChuNguHanh]] || "không có"}).`;
  } else {
    dungThan = [nhatChuNguHanh, tuongSinh[tuongKhac[nhatChuNguHanh]]];
    lyDo = `Vì Thân Nhược, cần hỗ trợ bằng hành của Nhật Chủ (${nhatChuNguHanh}) và hành sinh Nhật Chủ (${tuongSinh[tuongKhac[nhatChuNguHanh]]}).`;
  }

  return {
    hanh: dungThan,
    lyDo: lyDo,
    cachCuc: cachCuc,
    lyDoCachCuc: `Dựa trên tháng sinh (${thangHanh}, ${thangTrongSo[nhatChuNguHanh].includes(thangChi) ? "mạnh cho Nhật Chủ" : "không mạnh"}) và tỷ lệ ngũ hành (${nhatChuNguHanh}: ${nhatChuCount}/8, hành khắc: ${tuongKhac[nhatChuNguHanh]}: ${khacNhatChuCount}/8).`
  };
};

// Hàm quản lý cache
const cacheFile = "./cache.json";
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 ngày

const readCache = async () => {
  try {
    const data = await fs.readFile(cacheFile, "utf8");
    return JSON.parse(data);
  } catch {
    return {};
  }
};

const writeCache = async (cache) => {
  try {
    await fs.writeFile(cacheFile, JSON.stringify(cache, null, 2));
  } catch (e) {
    console.error("Lỗi ghi cache:", e.message);
  }
};

const getCacheKey = (userInput, tuTru, year) => {
  return `${userInput}|${JSON.stringify(tuTru)}|${year}`;
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
  const vietnameseKeywords = ["hãy", "ngày sinh", "xem bát tự", "luận bát tự", "lá số", "sức khỏe", "nghề", "công việc", "vận hạn"];
  const englishKeywords = ["please", "my birth date", "interpret", "bazi", "health", "career", "job", "fortune"];
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

  // Tính Dụng Thần
  let dungThanTinhToan;
  try {
    dungThanTinhToan = dungThan ? dungThan : tinhDungThan(nhatChu, thangChi, nguHanhCount);
  } catch (e) {
    console.error("Lỗi trong tinhDungThan:", e.message);
    return res.status(400).json({ 
      error: language === "vi" 
        ? "Không thể tính Dụng Thần do dữ liệu không hợp lệ" 
        : "Unable to calculate Useful God due to invalid data" 
    });
  }

  // Chuẩn bị thông tin Tứ Trụ và Dụng Thần
  const tuTruText = `
${language === "vi" ? "Thông tin Tứ Trụ:" : "Four Pillars Information:"}
Giờ: ${tuTruParsed.gio}
Ngày: ${tuTruParsed.ngay}
Tháng: ${tuTruParsed.thang}
Năm: ${tuTruParsed.nam}
Nhật Chủ: ${nhatChu}
${language === "vi" ? "Tỷ lệ Ngũ Hành:" : "Five Elements Ratio:"} ${Object.entries(tyLeNguHanh).map(([k, v]) => `${k}: ${v}`).join(", ")}
`;

  const dungThanText = `
${language === "vi" ? "Dụng Thần:" : "Useful God:"} ${dungThanTinhToan.hanh.join(", ")}
${language === "vi" ? "Lý do chọn Dụng Thần:" : "Reason for selecting Useful God:"} ${dungThanTinhToan.lyDo}
${language === "vi" ? "Cách Cục:" : "Structure:"} ${dungThanTinhToan.cachCuc}
${language === "vi" ? "Lý do Cách Cục:" : "Reason for Structure:"} ${dungThanTinhToan.lyDoCachCuc}
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

  // Kiểm tra cache
  const cacheKey = getCacheKey(userInput, tuTruParsed, year);
  const cache = await readCache();
  const cachedResponse = cache[cacheKey];
  if (cachedResponse && cachedResponse.timestamp + CACHE_TTL > Date.now()) {
    return res.json({ answer: cachedResponse.answer });
  }

  // Xác định loại câu hỏi
  const isRequestBazi = userInput.includes("hãy xem bát tự") || userInput.includes("xem bát tự") || userInput.includes("luận bát tự") || userInput.includes("xem lá số") || userInput.includes("please interpret my bazi");
  const isAskingYearOrDaiVan = /(năm\s*\d{4}|năm\s*\w+|đại vận|vận hạn|vận mệnh|năm tới|năm sau|vận trong năm|year|next year|fortune)/.test(userInput) && !isRequestBazi;
  const isAskingHealth = userInput.includes("sức khỏe") || userInput.includes("cha mẹ") || userInput.includes("bệnh tật") || userInput.includes("health");
  const isAskingCareer = userInput.includes("nghề") || userInput.includes("công việc") || userInput.includes("thủy sản") || userInput.includes("kinh doanh") || userInput.includes("career") || userInput.includes("job");

  // Prompt học thuật và chi tiết
  let fullPrompt = `
Bạn là chuyên gia Bát Tự với kiến thức sâu sắc về ngũ hành và Thập Thần, am hiểu văn hóa ${language === "vi" ? "Việt Nam" : "Chinese astrology"}. Trả lời bằng ${language === "vi" ? "tiếng Việt" : "English"}, chi tiết, học thuật nhưng dễ hiểu, tránh dấu * hay ** hoặc #. Diễn đạt tinh tế, cá nhân hóa, mang phong cách ${language === "vi" ? "truyền thống Việt Nam" : "traditional Chinese"}, kết hợp phân tích học thuật với lời khuyên thực tế. Sử dụng đúng thông tin Tứ Trụ, Dụng Thần, và Thập Thần, không tự tạo dữ liệu sai lệch. Chỉ dùng Dụng Thần từ ${dungThanText}, ưu tiên Thân Vượng/Nhược, không áp dụng Tòng Cách trừ khi được yêu cầu.

Thông tin:
${tuTruText}
${dungThanText}
${canChiNguhanhInfo}
Năm hiện tại: ${year} (${yearCanChi || "chưa rõ"}, ngũ hành: ${yearNguHanh || "chưa rõ"})

Nguyên lý ngũ hành:
- Tương sinh: Mộc sinh Hỏa, Hỏa sinh Thổ, Thổ sinh Kim, Kim sinh Thủy, Thủy sinh Mộc.
- Tương khắc: Mộc khắc Thổ, Thổ khắc Thủy, Thủy khắc Hỏa, Hỏa khắc Kim, Kim khắc Mộc.

Thập Thần (dựa trên Nhật Chủ ${nhatChu}):
- Tỷ Kiên: Cùng hành, cùng âm dương (bạn bè, cạnh tranh).
- Kiếp Tài: Cùng hành, khác âm dương (đối thủ, rủi ro tài chính).
- Thực Thần: Nhật Chủ sinh, cùng âm dương (sáng tạo, ẩm thực).
- Thương Quan: Nhật Chủ sinh, khác âm dương (phản kháng, nghệ thuật).
- Chính Tài: Nhật Chủ khắc, khác âm dương (quản lý tài chính).
- Thiên Tài: Nhật Chủ khắc, cùng âm dương (kiếm tiền nhanh).
- Chính Quan: Khắc Nhật Chủ, khác âm dương (trách nhiệm, công chức).
- Thất Sát: Khắc Nhật Chủ, cùng âm dương (quyết đoán, mạo hiểm).
- Chính Ấn: Sinh Nhật Chủ, khác âm dương (học thuật, bảo vệ).
- Thiên Ấn: Sinh Nhật Chủ, cùng âm dương (trực giác, tâm linh).
`;

  if (isRequestBazi) {
    fullPrompt += `
Hướng dẫn phân tích Bát Tự:
1. Phân tích chi tiết Tứ Trụ (${tuTruParsed.gio}, ${tuTruParsed.ngay}, ${tuTruParsed.thang}, ${tuTruParsed.nam}), giải thích tương tác ngũ hành dựa trên ${tuTruText}. Nhật Chủ (${nhatChu}) và tháng sinh (${thangChi}, ${chiNguHanh[thangChi]}) xác định Thân Vượng/Nhược.
2. Phân tích Thập Thần (Tỷ Kiên, Kiếp Tài, Thực Thần, v.v.) từ Can/Chi của năm, tháng, ngày, giờ so với Nhật Chủ. Đánh giá vai trò Thập Thần trong tính cách và vận mệnh.
3. Dự đoán vận trình qua ba giai đoạn (thời thơ ấu, trung niên, hậu vận), nhấn mạnh vai trò Dụng Thần (${dungThanTinhToan.hanh.join(", ")}) và Thập Thần nổi bật.
4. Gợi ý ứng dụng Dụng Thần:
   - Nghề nghiệp: Mộc (giáo dục, thiết kế), Thủy (truyền thông, logistics), Hỏa (nghệ thuật, marketing), Thổ (bất động sản, tài chính), Kim (công nghệ, kỹ thuật).
   - Màu sắc: Mộc (xanh lá, xanh ngọc), Thủy (xanh dương, đen), Hỏa (đỏ, hồng), Thổ (vàng, nâu), Kim (trắng, bạc).
   - Vật phẩm: Mộc (cây xanh), Thủy (bể cá), Hỏa (đèn đỏ), Thổ (đá thạch anh vàng), Kim (trang sức bạc).
   - Hướng: Mộc (Đông, Đông Nam), Thủy (Bắc), Hỏa (Nam), Thổ (Đông Bắc), Kim (Tây, Tây Bắc).
5. Kết thúc bằng lời chúc may mắn, ví dụ: "${language === "vi" ? "Cầu chúc bạn như cây xanh đâm chồi, vận mệnh rạng ngời." : "May your destiny bloom like a vibrant tree."}"
`;
  } else if (isAskingYearOrDaiVan) {
    fullPrompt += `
Hướng dẫn phân tích vận năm ${year || "chưa rõ"}:
1. Xác định can chi năm (${yearCanChi || "chưa rõ"}, ${yearNguHanh || "chưa rõ"}). Nếu năm không rõ, yêu cầu người dùng cung cấp.
2. Phân tích tương tác ngũ hành của năm với Nhật Chủ (${nhatChu}) và Dụng Thần (${dungThanTinhToan.hanh.join(", ")}). Đánh giá Thập Thần của Can/Chi năm.
3. Dự báo chi tiết cơ hội/thách thức, đề xuất hóa giải bằng vật phẩm/màu sắc thuộc Dụng Thần.
4. Diễn đạt tinh tế, ví dụ: "${language === "vi" ? "Năm nay như ngọn gió xuân, mang cơ hội mới." : "This year is like a spring breeze, bringing new opportunities."}"
`;
  } else if (isAskingCareer) {
    fullPrompt += `
Hướng dẫn trả lời về nghề nghiệp ("${userInput}"):
1. Xác định ngũ hành của nghề, so sánh với Dụng Thần (${dungThanTinhToan.hanh.join(", ")}) và Thập Thần (Chính Tài, Thiên Tài, Thực Thần, v.v.).
2. Đề xuất nghề phù hợp thuộc Dụng Thần, giải thích tương sinh/tương khắc và vai trò Thập Thần.
3. Diễn đạt chi tiết, ví dụ: "${language === "vi" ? "Chọn giáo dục (Mộc) để phát huy sáng tạo, phù hợp Thực Thần." : "Choose education (Wood) to enhance creativity, aligned with Food God."}"
`;
  } else if (isAskingHealth) {
    fullPrompt += `
Hướng dẫn trả lời về sức khỏe ("${userInput}"):
1. Đánh giá ngũ hành mạnh/yếu từ ${tuTruText}, tập trung vào Dụng Thần (${dungThanTinhToan.hanh.join(", ")}) và Thập Thần liên quan (Chính Ấn, Thiên Ấn).
2. Đề xuất vật phẩm/màu sắc thuộc Dụng Thần để cải thiện sức khỏe, giải thích tương sinh/tương khắc.
3. Diễn đạt chi tiết, ví dụ: "${language === "vi" ? "Dùng cây xanh (Mộc) để hỗ trợ sức khỏe, phù hợp Chính Ấn." : "Use plants (Wood) to support health, aligned with Proper Seal."}"
`;
  } else {
    fullPrompt += `
Hướng dẫn trả lời câu hỏi tự do ("${userInput}"):
1. Xác định ngũ hành liên quan đến câu hỏi, so sánh với Dụng Thần (${dungThanTinhToan.hanh.join(", ")}) và Thập Thần.
2. Trả lời chi tiết, đề xuất thuộc Dụng Thần nếu liên quan đến quyết định.
3. Diễn đạt tinh tế, ví dụ: "${language === "vi" ? "Quyết định này như ngọn gió xuân, mang may mắn." : "This decision is like a spring breeze, bringing fortune."}"
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
      max_tokens: 1500,
      top_p: 0.9,
      frequency_penalty: 0.2,
      presence_penalty: 0.1
    });

    const answer = gptRes.choices[0].message.content;

    // Lưu vào cache
    cache[cacheKey] = { answer, timestamp: Date.now() };
    await writeCache(cache);

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

// Khởi động server
const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
server.setTimeout(120000);
