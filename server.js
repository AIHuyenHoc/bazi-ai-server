const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());
app.post("/api/luan-menh-bazi", async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Thiếu hoặc sai định dạng messages" });
  }

  const userMessage = messages.find((m) => m.role === "user")?.content || "";

  const fullPrompt = `${userMessage} 

Hãy giải mã vận mệnh của mình.

Đánh giá tổng thể ngày sinh:
Phân tích chi tiết theo giai đoạn cuộc đời:
- Thời thơ ấu và thiếu niên:
- Trung niên (tuổi trưởng thành và sự nghiệp)
- Tuổi già (những năm sau này)

Những năm may mắn cụ thể: nhập năm và đại vận của bạn

Dựa trên Bát Tự của bạn, tôi đề xuất những điều sau:
Tăng cường dụng thần của bạn là ngũ hành.....

Lời nhắc quan trọng:
Hãy nhớ rằng, Bát Tự của bạn không phải là định mệnh cố định, mà chỉ là vận trình có lúc thăng lúc trầm khi kết hợp cùng nỗ lực cá nhân và môi trường bạn sinh sống. Để nhận được những lời tư vấn chính xác hơn, bạn có thể liên hệ thầy Hiệp +84 969 200 785.
`;

  try {
    const gptRes = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: fullPrompt }],
        temperature: 0.7,
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
    res.status(500).json({ error: "Lỗi gọi GPT khi luận mệnh Bát Tự" });
  }
});
