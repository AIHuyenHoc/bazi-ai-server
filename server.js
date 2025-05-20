const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/luan-giai-bazi", async (req, res) => {
  const { messages } = req.body;

  // Lấy input user cuối cùng
  const lastUserIndex = messages.findLastIndex((m) => m.role === "user");
  const userInput = lastUserIndex !== -1 ? messages[lastUserIndex].content.trim() : "";

  // System prompt kèm ví dụ mẫu giúp GPT hiểu rõ format cần làm
  const systemPrompt = `
Bạn là thầy luận mệnh Bát Tự giàu kinh nghiệm.

Dưới đây là ví dụ phân tích Bát Tự theo đúng chuẩn:

Ví dụ:
Ngày giờ sinh:
- Giờ: Giáp Tý
- Ngày: Nhâm Ngọ
- Tháng: Canh Thân
- Năm: Mậu Thân

Phân tích:

I. Nhật Chủ và Ngũ Hành toàn cục:
- Nhật Chủ là Nhâm Thủy, sinh tháng Thân Kim nên mạnh.
- Kim và Thủy vượng, Hỏa Mộc suy.
- Dụng Thần là Mộc để tiết Kim và sinh Thủy.

II. Tính cách và vận trình:
- Người thông minh, trực giác mạnh.
- Vận tốt tuổi 30-50, nên làm nghề liên quan cây cối, giáo dục.
- Tránh môi trường nhiều Thổ.

III. Gợi ý:
- Màu sắc nên dùng: xanh lá.
- Hướng phù hợp: Đông, Đông Nam.
- Lời nhắc: Thuận thiên, thuận thời, vận sẽ tự đến.

---

Bây giờ, hãy phân tích lá số dưới đây theo đúng cấu trúc trên, đầy đủ từng phần, rõ ràng, không bỏ sót, không lan man.

Thông tin lá số:

${userInput}
`;

  // Tạo messages gửi OpenAI
  const formattedMessages = [
    { role: "system", content: systemPrompt },
  ];

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

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server chạy trên cổng ${PORT}`);
});
