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
    ? `Dụng Thần: ${Array.isArray(dungThan.hanh) ? dungThan.hanh.join(", ") : dungThan.hanh || "chưa rõ"}
Lý do chọn dụng thần: ${dungThan.lyDo || "Dựa trên sự cân bằng ngũ hành, ưu tiên hành yếu để hỗ trợ Nhật Chủ"}
Cách Cục: ${dungThan.cachCuc || "Thân Nhược"}`
    : `Dụng Thần: Thổ, Kim (tự động chọn dựa trên phân tích ngũ hành)
Lý do chọn dụng thần: Tứ Trụ có sự thiếu hụt Thổ và Kim, cần bổ sung để cân bằng
Cách Cục: Thân Nhược`;

  let fullPrompt = "";

  if (isRequestBazi) {
    fullPrompt = `
Bạn là chuyên gia luận mệnh Bát Tự với kiến thức sâu sắc về ngũ hành. Trả lời bằng tiếng Việt, trình bày rõ ràng, chuyên nghiệp, không dùng dấu * hay ** hoặc # để liệt kê nội dung. Không lặp lại nguyên văn thông tin Tứ Trụ và Dụng Thần đã cung cấp. Diễn đạt lại bằng lời văn mạch lạc, tự nhiên và sâu sắc hơn. Phân tích dựa trên sự tương tác giữa các ngũ hành trong Tứ Trụ và Dụng Thần.

Thông tin tham khảo:
${tuTruText}
${dungThanText}
${canChiNguhanhInfo}

Phân tích chi tiết các nội dung sau:
1. Diễn đạt lại thông tin Tứ Trụ và Dụng Thần bằng lời văn tinh tế, nhấn mạnh sự tương tác giữa các ngũ hành và lý do cách cục là Thân Nhược.
2. Dự đoán vận trình chi tiết cho ba giai đoạn (thời thơ ấu, trung niên, hậu vận) dựa trên sự cân bằng/tương khắc của ngũ hành trong Tứ Trụ và Dụng Thần. Giải thích cụ thể cách các hành ảnh hưởng đến từng giai đoạn.
3. Đưa ra gợi ý ứng dụng theo ngũ hành Dụng Thần (ưu tiên Thổ, Kim), giải thích tại sao các gợi ý này phù hợp với lá số. Chỉ liệt kê các ngành nghề, màu sắc, vật phẩm phong thủy, phương hướng liên quan đến Dụng Thần.

Nguyên lý tương sinh tương khắc ngũ hành:
- Tương sinh: Mộc sinh Hỏa, Hỏa sinh Thổ, Thổ sinh Kim, Kim sinh Thủy, Thủy sinh Mộc.
- Tương khắc: Mộc khắc Thổ, Thổ khắc Thủy, Thủy khắc Hỏa, Hỏa khắc Kim, Kim khắc Mộc.

Ví dụ lời văn hay hơn: "Lá số của bạn mang đặc điểm Thân Nhược, với Nhật Chủ Tân Kim yếu, cần được hỗ trợ bởi Thổ và Kim để đạt sự cân bằng. Trong vận trình, giai đoạn trung niên sẽ có nhiều cơ hội phát triển nhờ sự kiên định từ Thổ, kết hợp với sự sắc bén của Kim."
Bắt đầu phân tích:
`;
  } else if (isAskingYearOrDaiVan) {
    fullPrompt = `
Bạn là chuyên gia luận mệnh Bát Tự. Trả lời bằng tiếng Việt, rõ ràng, chuyên nghiệp. Người dùng hỏi về vận hạn năm hoặc đại vận, cần phân tích dựa trên Tứ Trụ và Dụng Thần.

Thông tin tham khảo:
${tuTruText}
${dungThanText}
${canChiNguhanhInfo}

Nếu năm hoặc đại vận được hỏi có ngũ hành thuộc Dụng Thần (${dungThan.hanh || "Thổ, Kim"}), dự đoán vận trình thuận lợi và giải thích tại sao. Nếu không, dự đoán khó khăn và gợi ý cách hóa giải. Nếu thiếu thông tin can chi của năm/đại vận, yêu cầu người dùng cung cấp thêm.

Ví dụ: Năm 2025 (Ất Tỵ, Mộc-Hỏa) có thể khó khăn với lá số cần Thổ, Kim, do Mộc khắc Thổ. Nên sử dụng vật phẩm phong thủy thuộc Thổ (đá quý nâu) để hóa giải.
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
