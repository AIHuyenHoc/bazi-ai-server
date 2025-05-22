const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

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

// Danh sách 60 Hoa Giáp (dựa trên thông tin bạn cung cấp ngày 07/05/2025)
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

  // Phân tích Tứ Trụ
  if (tuTru.nam) nguHanhCount[canNguHanh[tuTru.nam.split(" ")[0]]] += 1;
  if (tuTru.nam) nguHanhCount[chiNguHanh[tuTru.nam.split(" ")[1]]] += 1;
  if (tuTru.thang) nguHanhCount[canNguHanh[tuTru.thang.split(" ")[0]]] += 1;
  if (tuTru.thang) nguHanhCount[chiNguHanh[tuTru.thang.split(" ")[1]]] += 1;
  if (tuTru.ngay) nguHanhCount[canNguHanh[tuTru.ngay.split(" ")[0]]] += 1;
  if (tuTru.ngay) nguHanhCount[chiNguHanh[tuTru.ngay.split(" ")[1]]] += 1;
  if (tuTru.gio) nguHanhCount[canNguHanh[tuTru.gio.split(" ")[0]]] += 1;
  if (tuTru.gio) nguHanhCount[chiNguHanh[tuTru.gio.split(" ")[1]]] += 1;

  return nguHanhCount;
};

app.post("/api/luan-giai-bazi", async (req, res) => {
  const { messages, tuTruInfo, dungThan } = req.body;

  const lastUserMsg = messages.slice().reverse().find(m => m.role === "user");
  const userInput = lastUserMsg ? lastUserMsg.content.toLowerCase() : "";

  const isRequestBazi =
    userInput.includes("hãy xem bát tự cho mình") ||
    userInput.includes("xem bát tự") ||
    userInput.includes("luận bát tự") ||
    userInput.includes("xem lá số");

  const isAskingYearOrDaiVan =
    /(năm\s*\d{4}|năm\s*\w+|đại vận|vận hạn|vận mệnh|năm tới|năm sau|vận trong năm)/.test(userInput) &&
    !isRequestBazi;

  // Parse tuTruInfo
  let tuTruParsed = null;
  try {
    tuTruParsed = tuTruInfo ? JSON.parse(tuTruInfo) : null;
  } catch (e) {
    console.error("Lỗi parse tuTruInfo:", e);
    return res.status(400).json({ error: "Dữ liệu Tứ Trụ không hợp lệ" });
  }

  if (!tuTruParsed || !tuTruParsed.nam || !tuTruParsed.thang || !tuTruParsed.ngay || !tuTruParsed.gio) {
    return res.status(400).json({ error: "Vui lòng cung cấp đầy đủ thông tin Tứ Trụ (năm, tháng, ngày, giờ)" });
  }

  // Tính toán tỷ lệ ngũ hành
  const nguHanhCount = analyzeNguHanh(tuTruParsed);
  const totalElements = Object.values(nguHanhCount).reduce((a, b) => a + b, 0);
  const tyLeNguHanh = Object.fromEntries(
    Object.entries(nguHanhCount).map(([k, v]) => [k, `${((v / totalElements) * 100).toFixed(2)}%`])
  );

  // Chuyển tuTruParsed sang đoạn mô tả
  const tuTruText = `
Thông tin Tứ Trụ:
- Năm: ${tuTruParsed.nam || "chưa rõ"}
- Tháng: ${tuTruParsed.thang || "chưa rõ"}
- Ngày: ${tuTruParsed.ngay || "chưa rõ"}
- Giờ: ${tuTruParsed.gio || "chưa rõ"}
- Tỷ lệ Ngũ Hành: ${Object.entries(tyLeNguHanh).map(([k, v]) => `${k}: ${v}`).join(", ")}
`;

  // Chuyển dungThan sang đoạn mô tả
  const dungThanText = dungThan && typeof dungThan === 'object'
    ? `Dụng Thần: ${Array.isArray(dungThan.hanh) ? dungThan.hanh.join(", ") : dungThan.hanh || "Thổ, Kim"}
Lý do chọn dụng thần: ${dungThan.lyDo || "Dựa trên sự thiếu hụt Thổ và Kim trong Tứ Trụ, cần bổ sung để hỗ trợ Nhật Chủ Tân Kim"}
Cách Cục: ${dungThan.cachCuc || "Thân Nhược"}`
    : `Dụng Thần: Thổ, Kim
Lý do chọn dụng thần: Tứ Trụ có sự thiếu hụt Thổ và Kim, cần bổ sung để cân bằng Nhật Chủ Tân Kim
Cách Cục: Thân Nhược`;

  // Xác định năm được hỏi từ userInput
  let year = null;
  const yearMatch = userInput.match(/năm\s*(\d{4})/);
  if (yearMatch) {
    year = parseInt(yearMatch[1]);
  } else if (userInput.includes("năm tới") || userInput.includes("năm sau")) {
    year = new Date().getFullYear() + 1; // Giả sử năm tới
  }

  const yearCanChi = year ? getCanChiForYear(year) : null;
  const canNguHanh = {
    Giáp: "Mộc", Ất: "Mộc", Bính: "Hỏa", Đing: "Hỏa", Mậu: "Thổ",
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

  let fullPrompt = "";

  if (isRequestBazi) {
    fullPrompt = `
Bạn là chuyên gia luận mệnh Bát Tự với kiến thức sâu sắc về ngũ hành. Trả lời bằng tiếng Việt, trình bày rõ ràng, chuyên nghiệp, không dùng dấu * hay ** hoặc # để liệt kê nội dung. Không lặp lại nguyên văn thông tin Tứ Trụ và Dụng Thần đã cung cấp. Diễn đạt lại bằng lời văn mạch lạc, tinh tế, sâu sắc, thể hiện sự am hiểu về mệnh lý. Phân tích dựa trên sự tương tác giữa các ngũ hành trong Tứ Trụ và Dụng Thần, tập trung vào Nhật Chủ Tân Kim và cách cục Thân Nhược.

Thông tin tham khảo:
${tuTruText}
${dungThanText}
${canChiNguhanhInfo}

Phân tích chi tiết các nội dung sau:
1. Diễn đạt lại thông tin Tứ Trụ và Dụng Thần bằng lời văn tinh tế, nhấn mạnh sự tương tác giữa các ngũ hành (Mộc mạnh từ Ất Tỵ, Tân Mão; Hỏa từ Tân Tỵ; Thổ từ Mậu Tý; Kim yếu) và lý do cách cục là Thân Nhược do Nhật Chủ Tân Kim thiếu hỗ trợ.
2. Dự đoán vận trình chi tiết cho ba giai đoạn (thời thơ ấu, trung niên, hậu vận) dựa trên sự cân bằng/tương khắc của ngũ hành trong Tứ Trụ và Dụng Thần (Thổ, Kim). Giải thích cụ thể cách Mộc mạnh, Hỏa vượng, và Thổ-Kim yếu ảnh hưởng đến từng giai đoạn.
3. Đưa ra gợi ý ứng dụng chi tiết theo ngũ hành Dụng Thần (chỉ tập trung vào Thổ và Kim), giải thích tại sao các gợi ý này phù hợp với lá số. Liệt kê các ngành nghề, màu sắc, vật phẩm phong thủy, và phương hướng liên quan đến Thổ và Kim. Không đề xuất các yếu tố thuộc Mộc, Hỏa, hoặc Thủy trừ khi cần thiết để hóa giải tương khắc.

Gợi ý mẫu cho Thổ và Kim:
- Thổ: Ngành nghề như bất động sản, tài chính, xây dựng, chăm sóc sức khỏe. Màu sắc: vàng đất, nâu đất, be. Vật phẩm phong thủy: đá phong thủy (thạch anh vàng, mã não nâu), tượng Phật đá. Phương hướng: Đông Bắc, Tây Nam.
- Kim: Ngành nghề như công nghệ, y tế, luật pháp, kỹ thuật, cơ khí. Màu sắc: trắng, bạc, xám ánh kim. Vật phẩm phong thủy: đồng tiền vàng, trang sức kim loại. Phương hướng: Tây, Tây Bắc.

Nguyên lý tương sinh tương khắc ngũ hành:
- Tương sinh: Mộc sinh Hỏa, Hỏa sinh Thổ, Thổ sinh Kim, Kim sinh Thủy, Thủy sinh Mộc.
- Tương khắc: Mộc khắc Thổ, Thổ khắc Thủy, Thủy khắc Hỏa, Hỏa khắc Kim, Kim khắc Mộc.

Ví dụ lời văn tinh tế: "Lá số của bạn với Nhật Chủ Tân Kim, sinh vào tháng Tỵ (Hỏa), mang cách cục Thân Nhược do Kim yếu, cần sự hỗ trợ từ Thổ để sinh Kim và củng cố nền tảng. Trong trung niên, sự hiện diện của Thổ từ giờ Mậu Tý sẽ mang lại sự ổn định, giúp bạn phát triển sự nghiệp bền vững."
Bắt đầu phân tích:
`;
  } else if (isAskingYearOrDaiVan) {
    fullPrompt = `
Bạn là chuyên gia luận mệnh Bát Tự với kiến thức sâu sắc về ngũ hành. Trả lời bằng tiếng Việt, rõ ràng, chuyên nghiệp, không dùng dấu * hay ** hoặc # để liệt kê nội dung. Người dùng hỏi về vận hạn năm ${year ? year : "hoặc đại vận cụ thể"}, cần phân tích dựa trên Tứ Trụ, Dụng Thần, và can chi chính xác của năm được hỏi.

Thông tin tham khảo:
${tuTruText}
${dungThanText}
${canChiNguhanhInfo}

Năm được hỏi: ${year ? `${year} (${yearCanChi}, ngũ hành: ${yearNguHanh})` : "Chưa rõ năm cụ thể, vui lòng cung cấp năm (ví dụ: 2024)"}

Hướng dẫn phân tích:
1. Xác định chính xác can chi và ngũ hành của năm được hỏi (${yearCanChi ? `${yearCanChi} (${yearNguHanh})` : "chưa rõ, yêu cầu người dùng cung cấp"}). Nếu năm không rõ, yêu cầu người dùng cung cấp năm cụ thể.
2. Phân tích tương tác giữa ngũ hành của năm (${yearNguHanh || "chưa rõ"}) và Tứ Trụ (Mộc mạnh từ Ất Tỵ, Tân Mão; Hỏa từ Tân Tỵ; Thổ từ Mậu Tý; Kim yếu), tập trung vào Nhật Chủ Tân Kim và Dụng Thần (Thổ, Kim). Giải thích cụ thể sự tương sinh/tương khắc (ví dụ: Mộc khắc Thổ, Thổ sinh Kim, Hỏa khắc Kim).
3. Dự đoán vận hạn năm: Nếu ngũ hành của năm thuộc Thổ hoặc Kim, dự báo thuận lợi và giải thích tại sao. Nếu không (ví dụ: Mộc khắc Thổ, Hỏa khắc Kim), dự báo khó khăn và đề xuất cách hóa giải bằng vật phẩm/màu sắc thuộc Thổ (đá thạch anh vàng, màu nâu đất) hoặc Kim (trang sức bạc, màu trắng). Liên kết với đặc điểm Tứ Trụ (Mộc mạnh, Kim yếu) để cá nhân hóa dự đoán.
4. Diễn đạt bằng lời văn tinh tế, cá nhân hóa, không lặp lại nguyên văn thông tin Tứ Trụ hoặc Dụng Thần. Tránh sử dụng thông tin sai về can chi (ví dụ: 2024 là Giáp Thìn, không phải Giáp Tý).

Ví dụ phân tích: "Năm 2024 (Giáp Thìn, Mộc-Thổ) mang lại sự cân bằng cho lá số với Nhật Chủ Tân Kim. Thổ từ Thìn hỗ trợ Dụng Thần Thổ, sinh Kim, tạo điều kiện thuận lợi cho sự ổn định và phát triển. Tuy nhiên, Mộc từ Giáp có thể khắc Thổ, gây một số áp lực. Nên sử dụng đá thạch anh vàng (Thổ) hoặc trang sức bạc (Kim) để tăng cường năng lượng tích cực."
Bắt đầu phân tích:
`;
  } else {
    fullPrompt = `
Bạn là trợ lý thân thiện, trả lời các câu hỏi tự do bằng tiếng Việt, dễ hiểu, không bắt buộc theo cấu trúc Bát Tự hay vận hạn nếu không được yêu cầu cụ thể.
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
        max_tokens: 2000,
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
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
