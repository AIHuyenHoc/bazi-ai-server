const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Route cho Bát Tự AI
app.post("/api/luan-giai-bazi", async (req, res) => {
  const { messages } = req.body;

  const endingPrompt = `
Hãy giải mã vận mệnh của mình.

Đánh giá tổng thể ngày sinh:
Phân tích chi tiết theo giai đoạn cuộc đời:
- Thời thơ ấu và thiếu niên:
- Trung niên (tuổi trưởng thành và sự nghiệp)
- Tuổi già (những năm sau này)

Những năm may mắn cụ thể: nhập năm và đại vận của bạn

Dựa trên Bát Tự của bạn, tôi đề xuất những điều sau:
Tăng cường dụng thần của bạn

Lời nhắc quan trọng:
Hãy nhớ rằng, Bát Tự của bạn không phải là định mệnh cố định, mà chỉ là vận trình có lúc thăng lúc trầm khi kết hợp cùng nỗ lực cá nhân và môi trường bạn sinh sống. Để nhận được những lời tư vấn chính xác hơn, bạn có thể liên hệ thầy Hiệp +84 969 200 785.
`;

  const formattedMessages = messages.map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
  }));

  // 👉 Thêm phần kết prompt vào tin nhắn user cuối cùng
  const lastMsgIndex = formattedMessages.findLastIndex((m) => m.role === "user");
  if (lastMsgIndex !== -1) {
    formattedMessages[lastMsgIndex].content += endingPrompt;
  }

  try {
    const gptRes = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: formattedMessages,
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
    res.status(500).json({ error: "Lỗi gọi GPT" });
  }
});
