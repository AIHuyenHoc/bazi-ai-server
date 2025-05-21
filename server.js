const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/luan-giai-bazi", async (req, res) => {
  const { messages, tuTruInfo, dungThan } = req.body;

  const lastUserMsg = messages.slice().reverse().find(m => m.role === "user");
  const userInput = lastUserMsg ? lastUserMsg.content.trim().toLowerCase() : "";

  const isRequestBazi =
    userInput.includes("xem bát tự") ||
    userInput.includes("luận bát tự") ||
    userInput.includes("bát tự cho mình") ||
    userInput.includes("xem lá số");

  // Phân loại trường hợp hỏi vận hạn năm hoặc đại vận
  const isAskingYearOrDaiVan =
    /(năm\s*\d{4}|năm\s*\w+|đại vận|vận hạn|vận mệnh|năm tới|năm sau|vận trong năm)/.test(userInput) &&
    !isRequestBazi;

  // Template chứa ngũ hành can chi 10 Thiên Can và 12 Địa Chi
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

  let fullPrompt = "";

  if (isRequestBazi) {
    fullPrompt = `
Bạn là chuyên gia luận mệnh Bát Tự, có kiến thức chuẩn xác về ngũ hành, dụng thần, nguyên tắc luận Nhật Chủ mạnh yếu và cách cục.

Thông tin ẩn về Bát Tự và cách cục người dùng cung cấp:
${tuTruInfo || "Chưa có thông tin cụ thể"}

Dụng Thần được xác định là: ${dungThan || "Chưa xác định"}

---

1. Phân tích mạnh yếu Nhật Chủ, cách cục, dụng thần theo ngũ hành và tương sinh tương khắc.
2. Phân tích tính cách nổi bật, điểm mạnh và điểm yếu.
3. Dự đoán vận trình chi tiết theo 3 giai đoạn: thời thơ ấu, trung niên, hậu vận.
4. Gợi ý ứng dụng chi tiết:
  - Ngành nghề phù hợp ứng dụng theo dụng thần và ngũ hành cá nhân.
  - Màu sắc trang phục và phụ kiện chi tiết theo từng hành.
  - Vật phẩm phong thủy tăng cường vận khí.
  - Phương hướng nhà/nơi làm việc ưu tiên theo dụng thần.

---

Nguyên lý tương sinh tương khắc ngũ hành chuẩn:
- Tương sinh: Mộc sinh Hỏa, Hỏa sinh Thổ, Thổ sinh Kim, Kim sinh Thủy, Thủy sinh Mộc.
- Tương khắc: Mộc khắc Thổ, Thổ khắc Thủy, Thủy khắc Hỏa, Hỏa khắc Kim, Kim khắc Mộc.

---

Không lặp lại thông tin đã cung cấp, không dùng ký hiệu đặc biệt, không dùng các dấu * hoặc #.

Bắt đầu phân tích chi tiết:
`;
  } else if (isAskingYearOrDaiVan) {
    fullPrompt = `
Bạn nhận được câu hỏi về vận hạn năm hoặc đại vận nhưng chưa có đủ thông tin Thiên Can và Địa Chi của năm hoặc đại vận đó.

Ví dụ: Năm 2025 là năm Ất Tỵ, trong đó:
- Thiên Can: Ất (Mộc)
- Địa Chi: Tỵ (Hỏa)

Để phân tích vận hạn chính xác, vui lòng cung cấp thông tin can chi năm hoặc đại vận bạn quan tâm.

${canChiNguhanhInfo}

Không tự suy đoán nếu chưa đủ dữ liệu.
`;
  } else {
    fullPrompt = `
Bạn là trợ lý thân thiện, trả lời các câu hỏi tự do, dễ hiểu, không bắt buộc theo cấu trúc Bát Tự hay vận hạn nếu không được yêu cầu cụ thể.
`;
  }

  // Thay thế nội dung user cuối cùng bằng fullPrompt
  const formattedMessages = messages.map(m => ({ role: m.role, content: m.content }));
  if (formattedMessages.length > 0 && formattedMessages[formattedMessages.length - 1].role === "user") {
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
        temperature: 0.7,
        max_tokens: 1500,
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
  console.log(`Server running on port ${port}`);
});
