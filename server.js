const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint cho Render
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

const canChiNguhanhInfo = `
Ngũ hành 10 Thiên Can:
- Giáp, Ất thuộc Mộc
- Bính, Đinh thuộc Hỏa
- Mậu, Kỷ thuộc Thổ
- Canh, Tân thuộc Kim
- Nhâm, Quý thuộc Thủy

Ngũ hành 12 Địa Chi:
- Tý, Hợi thuộc Thủy
- Sửu, Thìn, Mùi, Tuất thuộc Thổ
- Dần, Mão thuộc Mộc
- Tỵ, Ngọ thuộc Hỏa
- Thân, Dậu thuộc Kim
`;

// Ánh xạ từ tiếng Anh sang can chi tiếng Việt
const heavenlyStemsMap = {
  en: { Yi: "Ất", Ding: "Đinh", Ren: "Nhâm", Gui: "Quý" }, // Thêm các thiên can khác nếu cần
  vi: { Ất: "Ất", Đinh: "Đinh", Nhâm: "Nhâm", Quý: "Quý" }
};
const earthlyBranchesMap = {
  en: { Snake: "Tỵ", Horse: "Ngọ", Goat: "Mùi", Rabbit: "Mão" }, // Thêm các địa chi khác nếu cần
  vi: { Tỵ: "Tỵ", Ngọ: "Ngọ", Mùi: "Mùi", Mão: "Mão" }
};

// Chuyển đổi Tứ Trụ từ tiếng Anh sang can chi
const parseEnglishTuTru = (input) => {
  const parts = input.split(/hour|day|month|year/).filter(Boolean).map(part => part.trim().split(" "));
  if (parts.length !== 4) return null;
  return {
    gio: `${heavenlyStemsMap.en[parts[0][0]] || parts[0][0]} ${earthlyBranchesMap.en[parts[0][1]] || parts[0][1]}`,
    ngay: `${heavenlyStemsMap.en[parts[1][0]] || parts[1][0]} ${earthlyBranchesMap.en[parts[1][1]] || parts[1][1]}`,
    thang: `${heavenlyStemsMap.en[parts[2][0]] || parts[2][0]} ${earthlyBranchesMap.en[parts[2][1]] || parts[2][1]}`,
    nam: `${heavenlyStemsMap.en[parts[3][0]] || parts[3][0]} ${earthlyBranchesMap.en[parts[3][1]] || parts[3][1]}`
  };
};

const hoaGiap = [
  "Giáp Tý", "Ất Sửu", "Bính Dần", "Đinh Mão", "Mậu Thìn", "Kỷ Tỵ", "Canh Ngọ", "Tân Mùi", "Nhâm Thân", "Quý Dậu",
  "Giáp Tuất", "Ất Hợi", "Bính Tý", "Đinh Sửu", "Mậu Dần", "Kỷ Mão", "Canh Thìn", "Tân Tỵ", "Nhâm Ngọ", "Quý Mùi",
  "Giáp Thân", "Ất Dậu", "Bính Tuất", "Đinh Hợi", "Mậu Tý", "Kỷ Sửu", "Canh Dần", "Tân Mão", "Nhâm Thìn", "Quý Tỵ",
  "Giáp Ngọ", "Ất Mùi", "Bính Thân", "Đinh Dậu", "Mậu Tuất", "Kỷ Hợi", "Canh Tý", "Tân Sửu", "Nhâm Dần", "Quý Mão",
  "Giáp Thìn", "Ất Tỵ", "Bính Ngọ", "Đinh Mùi", "Mậu Thân", "Kỷ Dậu", "Canh Tuất", "Tân Hợi", "Nhâm Tý", "Quý Sửu",
  "Giáp Dần", "Ất Mão", "Bính Thìn", "Đinh Tỵ", "Mậu Ngọ", "Kỷ Mùi", "Canh Thân", "Tân Dậu", "Nhâm Tuất", "Quý Hợi"
];

const getCanChiForYear = (year) => {
  const baseYear = 1984; // Mốc Giáp Tý
  const index = (year - baseYear) % 60;
  const adjustedIndex = index < 0 ? index + 60 : index;
  return hoaGiap[adjustedIndex] || "Không xác định";
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

const tinhDungThan = (nhatChu, thangChi, nguHanhCount) => {
  const chiNguHanh = {
    Tý: "Thủy", Hợi: "Thủy", Sửu: "Thổ", Thìn: "Thổ", Mùi: "Thổ", Tuất: "Thổ",
    Dần: "Mộc", Mão: "Mộc", Tỵ: "Hỏa", Ngọ: "Hỏa", Thân: "Kim", Dậu: "Kim"
  };
  
  const nhatChuHanh = {
    Giáp: "Mộc", Ất: "Mộc", Bính: "Hỏa", Đinh: "Hỏa", Mậu: "Thổ",
    Kỷ: "Thổ", Canh: "Kim", Tân: "Kim", Nhâm: "Thủy", Quý: "Thủy"
  };
  
  const tuongSinh = {
    Mộc: "Hỏa", Hỏa: "Thổ", Thổ: "Kim", Kim: "Thủy", Thủy: "Mộc"
  };
  
  const tuongKhac = {
    Mộc: "Thổ", Thổ: "Thủy", Thủy: "Hỏa", Hỏa: "Kim", Kim: "Mộc"
  };

  if (!nhatChu || !thangChi || !nhatChuHanh[nhatChu] || !chiNguHanh[thangChi]) {
    throw new Error("Nhật Chủ hoặc tháng sinh không hợp lệ");
  }

  const thangHanh = chiNguHanh[thangChi];
  const nhatChuNguHanh = nhatChuHanh[nhatChu];
  
  const thangTrongSo = {
    Mộc: ["Dần", "Mão"],
    Hỏa: ["Tỵ", "Ngọ"],
    Thổ: ["Sửu", "Thìn", "Mùi", "Tuất"],
    Kim: ["Thân", "Dậu"],
    Thủy: ["Tý", "Hợi"]
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
    lyDo = `Vì Thân Vượng, cần tiết khí bằng hành khắc Nhật Chủ (${tuongKhac[nhatChuNguHanh]}) và hành tiết khí (${tuongKhac[tuongSinh[nhatChuNguHanh]]}).`;
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

app.post("/api/luan-giai-bazi", async (req, res) => {
  const { messages, tuTruInfo, dungThan } = req.body;

  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set');
    return res.status(500).json({ error: "Cấu hình API không hợp lệ" });
  }

  const lastUserMsg = messages.slice().reverse().find(m => m.role === "user");
  const userInput = lastUserMsg ? lastUserMsg.content.toLowerCase() : "";

  // Phát hiện ngôn ngữ dựa trên từ khóa
  const isEnglish = userInput.includes("please") || userInput.includes("my birth date is") || userInput.includes("interpret");
  const isVietnamese = userInput.includes("hãy") || userInput.includes("ngày sinh của mình là") || userInput.includes("xem bát tự");

  let language = "vi"; // Mặc định là tiếng Việt
  if (isEnglish && !isVietnamese) language = "en";
  else if (isVietnamese && !isEnglish) language = "vi";

  let tuTruParsed = tuTruInfo ? JSON.parse(tuTruInfo) : null;
  if (language === "en" && userInput.includes("my birth date is")) {
    tuTruParsed = parseEnglishTuTru(userInput) || tuTruParsed;
  }

  if (!tuTruParsed || !tuTruParsed.nam || !tuTruParsed.thang || !tuTruParsed.ngay || !tuTruParsed.gio) {
    return res.status(400).json({ error: language === "vi" ? "Vui lòng cung cấp đầy đủ thông tin Tứ Trụ (năm, tháng, ngày, giờ)" : "Please provide complete Tứ Trụ information (year, month, day, hour)" });
  }

  let nguHanhCount;
  try {
    nguHanhCount = analyzeNguHanh(tuTruParsed);
  } catch (e) {
    console.error("Lỗi trong analyzeNguHanh:", e.message);
    return res.status(400).json({ error: language === "vi" ? e.message : "Unable to analyze Ngũ Hành due to invalid Tứ Trụ data" });
  }

  const totalElements = Object.values(nguHanhCount).reduce((a, b) => a + b, 0);
  const tyLeNguHanh = Object.fromEntries(
    Object.entries(nguHanhCount).map(([k, v]) => [k, `${((v / totalElements) * 100).toFixed(2)}%`])
  );

  const nhatChu = tuTruParsed.ngay.split(" ")[0];
  const thangChi = tuTruParsed.thang.split(" ")[1];

  let dungThanTinhToan;
  try {
    dungThanTinhToan = dungThan ? dungThan : tinhDungThan(nhatChu, thangChi, nguHanhCount);
  } catch (e) {
    console.error("Lỗi trong tinhDungThan:", e.message);
    return res.status(400).json({ error: language === "vi" ? "Không thể tính Dụng Thần do dữ liệu không hợp lệ" : "Unable to calculate Dụng Thần due to invalid data" });
  }

  const tuTruText = `
${language === "vi" ? "Thông tin Tứ Trụ:" : "Four Pillars Information:"}
- ${language === "vi" ? "Năm:" : "Year:"} ${tuTruParsed.nam}
- ${language === "vi" ? "Tháng:" : "Month:"} ${tuTruParsed.thang}
- ${language === "vi" ? "Ngày:" : "Day:"} ${tuTruParsed.ngay}
- ${language === "vi" ? "Giờ:" : "Hour:"} ${tuTruParsed.gio}
- ${language === "vi" ? "Nhật Chủ:" : "Day Master:"} ${nhatChu}
- ${language === "vi" ? "Tỷ lệ Ngũ Hành:" : "Five Elements Ratio:"} ${Object.entries(tyLeNguHanh).map(([k, v]) => `${k}: ${v}`).join(", ")}
`;

  const dungThanText = `
${language === "vi" ? "Dụng Thần:" : "Useful God:"} ${dungThanTinhToan.hanh.join(", ")}
${language === "vi" ? "Lý do chọn dụng thần:" : "Reason for selecting Useful God:"} ${dungThanTinhToan.lyDo}
${language === "vi" ? "Cách Cục:" : "Structure:"} ${dungThanTinhToan.cachCuc}
${language === "vi" ? "Lý do cách cục:" : "Reason for Structure:"} ${dungThanTinhToan.lyDoCachCuc}
`;

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
    yearNguHanh = `${can} (${canNguHanh[can] || "chưa rõ" || "not specified"}), ${chi} (${chiNguHanh[chi] || "chưa rõ" || "not specified"})`;
  }

  let fullPrompt = "";

  const isRequestBazi = userInput.includes("hãy xem bát tự cho mình") || userInput.includes("xem bát tự") || userInput.includes("luận bát tự") || userInput.includes("xem lá số") || userInput.includes("please interpret my bazi");
  const isAskingYearOrDaiVan = /(năm\s*\d{4}|năm\s*\w+|đại vận|vận hạn|vận mệnh|năm tới|năm sau|vận trong năm|year|next year|fortune)/.test(userInput) && !isRequestBazi;
  const isAskingHealth = userInput.includes("sức khỏe") || userInput.includes("cha mẹ") || userInput.includes("bệnh tật") || userInput.includes("health");
  const isAskingCareer = userInput.includes("nghề") || userInput.includes("công việc") || userInput.includes("thủy sản") || userInput.includes("kinh doanh") || userInput.includes("career") || userInput.includes("job");

  if (isRequestBazi) {
    fullPrompt = `
Bạn là chuyên gia luận mệnh Bát Tự với kiến thức sâu sắc về ngũ hành, am hiểu văn hóa ${language === "vi" ? "Việt Nam" : "Chinese astrology"} và cách diễn đạt tinh tế, mang tính cá nhân hóa. Trả lời bằng ${language === "vi" ? "tiếng Việt" : "English"}, trình bày rõ ràng, mạch lạc, chuyên nghiệp, không dùng dấu * hay ** hoặc # để liệt kê nội dung. Diễn đạt bằng lời văn sâu sắc, dễ hiểu, tránh thuật ngữ quá phức tạp, kết hợp phong cách ${language === "vi" ? "truyền thống Việt Nam" : "traditional Chinese"} với lời chúc may mắn. Sử dụng đúng thông tin Tứ Trụ và Dụng Thần được cung cấp, không tự tạo dữ liệu sai lệch. Kiểm tra kỹ Nhật Chủ (thiên can ngày: ${nhatChu}) và tháng sinh (Địa Chi tháng: ${thangChi}, ngũ hành: ${chiNguHanh[thangChi]}) để đảm bảo chính xác. Phải sử dụng tỷ lệ ngũ hành từ ${tuTruText} và Dụng Thần từ ${dungThanText}. Nếu người dùng hỏi câu hỏi khác, trả lời ngay lập tức, cá nhân hóa dựa trên Tứ Trụ và Dụng Thần, tích hợp bối cảnh ngũ hành. Chỉ sử dụng Dụng Thần từ thông tin cung cấp hoặc tính tự động, ưu tiên Thân Vượng/Nhược, không áp dụng Tòng Cách trừ khi được yêu cầu rõ ràng.

Thông tin tham khảo:
${tuTruText}
${dungThanText}
${canChiNguhanhInfo}

Năm hiện tại: ${year} (${yearCanChi}, ngũ hành: ${yearNguHanh})

Hướng dẫn phân tích Bát Tự:
1. Phân tích chi tiết Tứ Trụ (${language === "vi" ? "giờ: " + tuTruParsed.gio : "hour: " + tuTruParsed.gio}, ${language === "vi" ? "ngày: " + tuTruParsed.ngay : "day: " + tuTruParsed.ngay}, ${language === "vi" ? "tháng: " + tuTruParsed.thang : "month: " + tuTruParsed.thang}, ${language === "vi" ? "năm: " + tuTruParsed.nam : "year: " + tuTruParsed.nam}), diễn đạt bằng lời văn tinh tế, giải thích vai trò và tương tác ngũ hành dựa trên tỷ lệ chính xác từ ${tuTruText}:
   - ${language === "vi" ? "Kim" : "Metal"} (${tyLeNguHanh.Kim}): ${language === "vi" ? "Thể hiện sự sắc bén, quyết đoán, sinh Thủy hoặc khắc Mộc." : "Represents sharpness, decisiveness, generates Water or overcomes Wood."}
   - ${language === "vi" ? "Thổ" : "Earth"} (${tyLeNguHanh.Thổ}): ${language === "vi" ? "Mang lại sự ổn định, bền vững, sinh Kim hoặc khắc Thủy." : "Brings stability, endurance, generates Metal or overcomes Water."}
   - ${language === "vi" ? "Hỏa" : "Fire"} (${tyLeNguHanh.Hỏa}): ${language === "vi" ? "Tạo năng lượng, đam mê, khắc Kim hoặc sinh Thổ." : "Creates energy, passion, overcomes Metal or generates Earth."}
   - ${language === "vi" ? "Thủy" : "Water"} (${tyLeNguHanh.Thủy}): ${language === "vi" ? "Thúc đẩy giao tiếp, linh hoạt, sinh Mộc hoặc khắc Hỏa." : "Promotes communication, flexibility, generates Wood or overcomes Fire."}
   - ${language === "vi" ? "Mộc" : "Wood"} (${tyLeNguHanh.Mộc}): ${language === "vi" ? "Biểu thị sáng tạo, phát triển, khắc Thổ hoặc sinh Hỏa." : "Symbolizes creativity, growth, overcomes Earth or generates Fire."}
   Xác định Nhật Chủ (${nhatChu}) và giải thích Thân Vượng/Nhược dựa trên tháng sinh (${thangChi}, ngũ hành: ${chiNguHanh[thangChi]}), tỷ lệ ngũ hành, và tương sinh/tương khắc. Đưa ra lý do chi tiết dựa trên ${dungThanText}.
2. Dự đoán vận trình qua ba giai đoạn (${language === "vi" ? "thời thơ ấu, trung niên, hậu vận" : "childhood, middle age, later years"}), tập trung vào:
   - Vai trò của Dụng Thần (${dungThanTinhToan.hanh.join(", ")}) trong việc cân bằng lá số (${language === "vi" ? "tiết khí nếu Thân Vượng, hỗ trợ nếu Thân Nhược" : "releasing energy if Self is Strong, supporting if Self is Weak"}).
   - Tác động của các ngũ hành mạnh/yếu theo tỷ lệ chính xác từ ${tuTruText}.
   - Ảnh hưởng của tháng sinh và các hành chính trong Tứ Trụ, sử dụng đúng ngũ hành của Địa Chi.
3. Đưa ra gợi ý ứng dụng theo Dụng Thần (${dungThanTinhToan.hanh.join(", ")}), giải thích tại sao phù hợp với Cách Cục:
   - ${language === "vi" ? "Ngành nghề" : "Career fields"}: Chỉ đề xuất dựa trên Dụng Thần (${language === "vi" ? "Mộc: giáo dục, thiết kế; Thủy: truyền thông, logistics; Hỏa: nghệ thuật, marketing; Thổ: bất động sản, tài chính; Kim: công nghệ, kỹ thuật" : "Wood: education, design; Water: communication, logistics; Fire: arts, marketing; Earth: real estate, finance; Metal: technology, engineering"}).
   - ${language === "vi" ? "Màu sắc" : "Colors"}: Chỉ đề xuất dựa trên Dụng Thần (${language === "vi" ? "Mộc: xanh lá, xanh ngọc; Thủy: xanh dương, đen, xám; Hỏa: đỏ, hồng; Thổ: vàng, nâu; Kim: trắng, bạc" : "Wood: green, jade; Water: blue, black, gray; Fire: red, pink; Earth: yellow, brown; Metal: white, silver"}).
   - ${language === "vi" ? "Vật phẩm phong thủy" : "Feng Shui items"}: Chỉ đề xuất dựa trên Dụng Thần (${language === "vi" ? "Mộc: cây xanh; Thủy: bể cá; Hỏa: đèn đỏ; Thổ: đá thạch anh vàng; Kim: trang sức bạc" : "Wood: plants; Water: aquarium; Fire: red lamp; Earth: yellow quartz; Metal: silver jewelry"}).
   - ${language === "vi" ? "Phương hướng" : "Directions"}: Chỉ đề xuất dựa trên Dụng Thần (${language === "vi" ? "Mộc: Đông, Đông Nam; Thủy: Bắc; Hỏa: Nam; Thổ: Đông Bắc; Kim: Tây, Tây Bắc" : "Wood: East, Southeast; Water: North; Fire: South; Earth: Northeast; Metal: West, Northwest"}).
   - ${language === "vi" ? "Lưu ý" : "Note"}: Không đề xuất các hành ngoài Dụng Thần.
4. Phân tích vận trình năm hiện tại (${yearCanChi}, ${yearNguHanh}):
   - Đánh giá chi tiết tương tác giữa ngũ hành của năm và Nhật Chủ (${nhatChu}), tập trung vào Dụng Thần. Xem xét tương sinh/tương khắc (ví dụ: Mộc khắc Thổ, Hỏa sinh Thổ).
   - Dự báo cơ hội/thách thức, đề xuất cách hóa giải chỉ dựa trên Dụng Thần.
   - ${language === "vi" ? "Diễn đạt cá nhân hóa, mang phong cách Việt Nam" : "Personalized expression with a traditional Chinese style"} (ví dụ: ${language === "vi" ? "'Năm nay thuận lợi, như cây xanh đâm chồi'" : "'This year brings fortune, like a blooming tree'"}).
5. Nếu người dùng hỏi câu hỏi khác (ví dụ: nghề nghiệp, sức khỏe):
   - Phân tích câu hỏi, xác định ngũ hành liên quan.
   - So sánh với Tứ Trụ và Dụng Thần, đánh giá tương sinh/tương khắc.
   - Trả lời ngắn gọn, tập trung, chỉ sử dụng gợi ý thuộc Dụng Thần.

Nguyên lý tương sinh tương khắc ngũ hành:
- ${language === "vi" ? "Tương sinh" : "Mutual generation"}: Mộc sinh Hỏa, Hỏa sinh Thổ, Thổ sinh Kim, Kim sinh Thủy, Thủy sinh Mộc.
- ${language === "vi" ? "Tương khắc" : "Mutual overcoming"}: Mộc khắc Thổ, Thổ khắc Thủy, Thủy khắc Hỏa, Hỏa khắc Kim, Kim khắc Mộc.

Ví dụ lời văn tinh tế:
- ${language === "vi" ? "Phân tích Bát Tự" : "Bazi Analysis"}: "${language === "vi" ? "Lá số mang Nhật Chủ Mậu Thổ, sinh vào tháng Tuất (Thổ), như ngọn núi vững chãi." : "Your chart with Day Master Mậu Earth, born in the Tuất month (Earth), stands like a solid mountain."} ${language === "vi" ? "Thổ mạnh tạo sự ổn định, nhưng cần Mộc để tiết khí, như cây xanh làm mềm đất." : "A strong Earth brings stability, but Wood is needed to balance it, like trees softening the soil."}"
- ${language === "vi" ? "Gợi ý" : "Suggestion"}: "${language === "vi" ? "Dựa trên Dụng Thần Mộc, Hỏa, bạn nên chọn màu xanh lá (Mộc) và đỏ (Hỏa) để thu hút may mắn" : "Based on Useful Gods Wood and Fire, choose green (Wood) and red (Fire) to attract good fortune"} ${language === "vi" ? "như ngọn lửa thắp sáng con đường." : "like a flame lighting your path."}"

Bắt đầu phân tích Bát Tự, diễn đạt tinh tế, cá nhân hóa, và kết thúc với lời chúc may mắn:
`;
  } else if (isAskingYearOrDaiVan) {
    fullPrompt = `
Bạn là chuyên gia luận mệnh Bát Tự với kiến thức sâu sắc về ngũ hành, am hiểu văn hóa ${language === "vi" ? "Việt Nam" : "Chinese astrology"} và cách diễn đạt tinh tế. Trả lời bằng ${language === "vi" ? "tiếng Việt" : "English"}, rõ ràng, chuyên nghiệp, không dùng dấu * hay ** hoặc # để liệt kê nội dung. Người dùng hỏi về vận hạn năm ${year ? year : "hoặc đại vận cụ thể"}, cần phân tích dựa trên Tứ Trụ, Dụng Thần, và can chi chính xác của năm. Diễn đạt dễ hiểu, cá nhân hóa, mang phong cách ${language === "vi" ? "truyền thống Việt Nam" : "traditional Chinese"}, tránh thuật ngữ phức tạp. Sử dụng đúng tỷ lệ ngũ hành từ ${tuTruText} và Dụng Thần từ ${dungThanText}, không tự tạo dữ liệu sai lệch. Chỉ sử dụng Dụng Thần từ thông tin cung cấp hoặc tính tự động, ưu tiên Thân Vượng/Nhược, không áp dụng Tòng Cách trừ khi được yêu cầu rõ ràng.

Thông tin tham khảo:
${tuTruText}
${dungThanText}
${canChiNguhanhInfo}

Năm được hỏi: ${year ? `${year} (${yearCanChi}, ngũ hành: ${yearNguHanh})` : language === "vi" ? "Chưa rõ năm cụ thể, vui lòng cung cấp năm (ví dụ: 2025)" : "Year not specified, please provide a year (e.g., 2025)"}

Hướng dẫn phân tích:
1. Xác định chính xác can chi và ngũ hành của năm được hỏi (${yearCanChi ? `${yearCanChi} (${yearNguHanh})` : language === "vi" ? "chưa rõ, yêu cầu người dùng cung cấp" : "not specified, request user to provide"}). Nếu năm không rõ, yêu cầu người dùng cung cấp năm cụ thể.
2. Phân tích chi tiết tương tác giữa ngũ hành của năm và Nhật Chủ (${nhatChu}), tập trung vào Dụng Thần. Giải thích cụ thể sự tương sinh/tương khắc (ví dụ: Mộc khắc Thổ, Hỏa sinh Thổ).
3. Dự đoán vận hạn năm: Nếu ngũ hành của năm thuộc Dụng Thần, dự báo thuận lợi. Nếu không, dự báo khó khăn và đề xuất cách hóa giải chỉ bằng vật phẩm/màu sắc thuộc Dụng Thần.
4. ${language === "vi" ? "Diễn đạt bằng lời văn tinh tế, cá nhân hóa, mang phong cách Việt Nam" : "Express with refined language, personalized, in a traditional Chinese style"} (ví dụ: ${language === "vi" ? "'Năm nay như ngọn gió xuân, mang cơ hội mới'" : "'This year is like a spring breeze, bringing new opportunities'"}).
5. Nếu người dùng hỏi về đại vận, sử dụng logic đại vận (tuổi nhập vận, thuận/nghịch) để xác định giai đoạn, phân tích can chi đại vận, và liên kết với Dụng Thần.

Ví dụ phân tích: "${language === "vi" ? "Năm 2025 (Ất Tỵ, Mộc-Hỏa) thuận lợi vì Mộc khắc Thổ (Dụng Thần). Sử dụng cây xanh (Mộc) và đèn đỏ (Hỏa) để thu hút may mắn" : "Year 2025 (Ất Tỵ, Wood-Fire) is favorable as Wood overcomes Earth (Useful God). Use plants (Wood) and red lamps (Fire) to attract good fortune"}, ${language === "vi" ? "như ngọn lửa soi sáng con đường." : "like a flame lighting your path."}"
Bắt đầu phân tích:
`;
  } else if (isAskingCareer) {
    fullPrompt = `
Bạn là chuyên gia mệnh lý và tư vấn nghề nghiệp với kiến thức sâu sắc về ngũ hành và Bát Tự, am hiểu văn hóa ${language === "vi" ? "Việt Nam" : "Chinese astrology"}. Trả lời bằng ${language === "vi" ? "tiếng Việt" : "English"}, rõ ràng, chuyên nghiệp, không dùng dấu * hay ** hoặc # để liệt kê nội dung. Người dùng hỏi về nghề nghiệp: "${userInput}". Trả lời ngắn gọn, tập trung vào câu hỏi, sử dụng thông tin Tứ Trụ và Dụng Thần để đưa ra gợi ý phù hợp. Diễn đạt dễ hiểu, cá nhân hóa, mang phong cách ${language === "vi" ? "truyền thống Việt Nam" : "traditional Chinese"}. Sử dụng đúng tỷ lệ ngũ hành từ ${tuTruText} và Dụng Thần từ ${dungThanText}, không tự tạo dữ liệu sai lệch. Chỉ sử dụng Dụng Thần từ thông tin cung cấp hoặc tính tự động, ưu tiên Thân Vượng/Nhược, không áp dụng Tòng Cách trừ khi được yêu cầu rõ ràng.

Thông tin tham khảo:
${tuTruText}
${dungThanText}
${canChiNguhanhInfo}

Nguyên lý tương sinh tương khắc ngũ hành:
- ${language === "vi" ? "Tương sinh" : "Mutual generation"}: Mộc sinh Hỏa, Hỏa sinh Thổ, Thổ sinh Kim, Kim sinh Thủy, Thủy sinh Mộc.
- ${language === "vi" ? "Tương khắc" : "Mutual overcoming"}: Mộc khắc Thổ, Thổ khắc Thủy, Thủy khắc Hỏa, Hỏa khắc Kim, Kim khắc Mộc.

Hướng dẫn trả lời:
1. Phân tích câu hỏi "${userInput}" và xác định ngũ hành liên quan.
2. So sánh ngũ hành của nghề với Dụng Thần (${dungThanTinhToan.hanh.join(", ")}). Đánh giá sự phù hợp, xem xét tương sinh/tương khắc với Nhật Chủ (${nhatChu}).
3. Trả lời ngắn gọn, tập trung, đề xuất nghề nghiệp chỉ thuộc Dụng Thần, giải thích lý do dựa trên tương sinh/tương khắc.
4. Nếu nghề không thuộc Dụng Thần, đề xuất nghề phù hợp hơn và giải thích.

Ví dụ trả lời: "${language === "vi" ? "Nghề thủy sản (Thủy) không phù hợp vì Dụng Thần là Mộc, Hỏa. Bạn nên chọn giáo dục (Mộc) hoặc marketing (Hỏa) để phát huy sáng tạo" : "The fishery career (Water) is not suitable as Useful Gods are Wood and Fire. Consider education (Wood) or marketing (Fire) to enhance creativity"}, ${language === "vi" ? "như cây xanh đâm chồi." : "like a sprouting tree."}"
Bắt đầu trả lời:
`;
  } else if (isAskingHealth) {
    fullPrompt = `
Bạn là chuyên gia mệnh lý với kiến thức sâu sắc về ngũ hành và Bát Tự, am hiểu văn hóa ${language === "vi" ? "Việt Nam" : "Chinese astrology"}. Trả lời bằng ${language === "vi" ? "tiếng Việt" : "English"}, rõ ràng, chuyên nghiệp, không dùng dấu * hay ** hoặc # để liệt kê nội dung. Người dùng hỏi về sức khỏe: "${userInput}". Trả lời ngắn gọn, tập trung vào câu hỏi, sử dụng thông tin Tứ Trụ và Dụng Thần để đưa ra gợi ý phù hợp. Diễn đạt dễ hiểu, cá nhân hóa, mang phong cách ${language === "vi" ? "truyền thống Việt Nam" : "traditional Chinese"}. Sử dụng đúng tỷ lệ ngũ hành từ ${tuTruText} và Dụng Thần từ ${dungThanText}, không tự tạo dữ liệu sai lệch. Chỉ sử dụng Dụng Thần từ thông tin cung cấp hoặc tính tự động, ưu tiên Thân Vượng/Nhược, không áp dụng Tòng Cách trừ khi được yêu cầu rõ ràng.

Thông tin tham khảo:
${tuTruText}
${dungThanText}
${canChiNguhanhInfo}

Nguyên lý tương sinh tương khắc ngũ hành:
- ${language === "vi" ? "Tương sinh" : "Mutual generation"}: Mộc sinh Hỏa, Hỏa sinh Thổ, Thổ sinh Kim, Kim sinh Thủy, Thủy sinh Mộc.
- ${language === "vi" ? "Tương khắc" : "Mutual overcoming"}: Mộc khắc Thổ, Thổ khắc Thủy, Thủy khắc Hỏa, Hỏa khắc Kim, Kim khắc Mộc.

Hướng dẫn trả lời:
1. Phân tích câu hỏi "${userInput}" và xem xét Tứ Trụ để đánh giá ngũ hành mạnh/yếu.
2. Dựa trên Dụng Thần (${dungThanTinhToan.hanh.join(", ")}), đề xuất cách cải thiện sức khỏe (màu sắc, vật phẩm) chỉ thuộc Dụng Thần.
3. Giải thích ngắn gọn dựa trên tương sinh/tương khắc.
4. Tránh dự đoán cụ thể về bệnh tật, tập trung vào cân bằng ngũ hành.

Ví dụ trả lời: "${language === "vi" ? "Dựa trên Dụng Thần Mộc, Hỏa, sử dụng cây xanh (Mộc) và đèn đỏ (Hỏa) để hỗ trợ sức khỏe" : "Based on Useful Gods Wood and Fire, use plants (Wood) and red lamps (Fire) to support health"}, ${language === "vi" ? "như ngọn lửa thắp sáng may mắn." : "like a flame bringing good fortune."}"
Bắt đầu trả lời:
`;
  } else {
    fullPrompt = `
Bạn là chuyên gia mệnh lý với kiến thức sâu sắc về ngũ hành và Bát Tự, am hiểu văn hóa ${language === "vi" ? "Việt Nam" : "Chinese astrology"}. Trả lời bằng ${language === "vi" ? "tiếng Việt" : "English"}, rõ ràng, chuyên nghiệp, không dùng dấu * hay ** hoặc # để liệt kê nội dung. Người dùng hỏi một câu hỏi tự do: "${userInput}". Trả lời ngắn gọn, tập trung vào câu hỏi, sử dụng thông tin Tứ Trụ và Dụng Thần để đưa ra gợi ý phù hợp nếu câu hỏi liên quan đến quyết định quan trọng. Diễn đạt dễ hiểu, cá nhân hóa, mang phong cách ${language === "vi" ? "truyền thống Việt Nam" : "traditional Chinese"}. Sử dụng đúng tỷ lệ ngũ hành từ ${tuTruText} và Dụng Thần từ ${dungThanText}, không tự tạo dữ liệu sai lệch. Chỉ sử dụng Dụng Thần từ thông tin cung cấp hoặc tính tự động, ưu tiên Thân Vượng/Nhược, không áp dụng Tòng Cách trừ khi được yêu cầu rõ ràng.

Thông tin tham khảo:
${tuTruText}
${dungThanText}
${canChiNguhanhInfo}

Năm hiện tại: ${year} (${yearCanChi}, ngũ hành: ${yearNguHanh})

Nguyên lý tương sinh tương khắc ngũ hành:
- ${language === "vi" ? "Tương sinh" : "Mutual generation"}: Mộc sinh Hỏa, Hỏa sinh Thổ, Thổ sinh Kim, Kim sinh Thủy, Thủy sinh Mộc.
- ${language === "vi" ? "Tương khắc" : "Mutual overcoming"}: Mộc khắc Thổ, Thổ khắc Thủy, Thủy khắc Hỏa, Hỏa khắc Kim, Kim khắc Mộc.

Hướng dẫn trả lời:
1. Phân tích câu hỏi "${userInput}" và xác định ngũ hành liên quan.
2. So sánh với Tứ Trụ và Dụng Thần, đánh giá sự phù hợp, xem xét tương sinh/tương khắc.
3. Trả lời ngắn gọn, tập trung, đề xuất chỉ thuộc Dụng Thần, không lặp lại phân tích Tứ Trụ trừ khi cần thiết.
4. ${language === "vi" ? "Diễn đạt tinh tế, mang phong cách Việt Nam" : "Express with refined language, in a traditional Chinese style"} (ví dụ: ${language === "vi" ? "'Như ngọn gió xuân, quyết định này sẽ mang may mắn'" : "'Like a spring breeze, this decision will bring good fortune'"}).

Ví dụ trả lời: "${language === "vi" ? "Dựa trên Dụng Thần Mộc, Hỏa, bạn nên chọn màu xanh lá (Mộc) hoặc đỏ (Hỏa) để hỗ trợ quyết định" : "Based on Useful Gods Wood and Fire, choose green (Wood) or red (Fire) to support your decision"}, ${language === "vi" ? "như cây xanh đâm chồi." : "like a sprouting tree."}"
Bắt đầu trả lời:
`;
  }

  const formattedMessages = messages.map(m => ({
    role: m.role,
    content: m.content,
  }));

  if (
    formattedMessages.length > 0 &&
    formattedMessages[formattedMessages.length - 1].role === "user"
  ) {
    formattedMessages[formattedMessages.length - 1].content = fullPrompt.trim();
  } else {
    formattedMessages.push({ role: "user", content: fullPrompt.trim() });
  }

  try {
    const gptRes = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: formattedMessages,
        temperature: 0.5,
        max_tokens: 1200,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const answer = gptRes.data.choices[0].message.content;
    res.json({ answer });
  } catch (err) {
    console.error("GPT API error:", err.response?.data || err.message);
    res.status(500).json({ error: "Lỗi gọi GPT" });
  }
});

const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
server.setTimeout(120000);
