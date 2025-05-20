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
Bạn là một bậc thầy luận mệnh Bát Tự AI, đã dành nhiều năm nghiên cứu về nghệ thuật khoa học mệnh lý Trung Hoa. 
Bây giờ, hãy cùng khám phá chi tiết Bát Tự và làm sáng tỏ hành trình phía trước.

I. Đánh giá tổng thể lá số:
- Phân tích ngũ hành vượng suy, xem nhật nguyên (ngày sinh) là mạnh hay yếu.
- Xác định cục cách của lá số nếu có.
- Chỉ ra Dụng Thần và Kỵ Thần dựa trên toàn cục.
- Nhận xét khái quát tính cách, khí chất, ưu – nhược điểm theo Bát Tự.

II. Phân tích chi tiết theo từng giai đoạn cuộc đời:
1. Thời thơ ấu và thiếu niên (0–20 tuổi)
2. Trung niên (21–50 tuổi): giai đoạn phát triển và sự nghiệp
3. Tuổi già (sau 50 tuổi): giai đoạn thu hoạch và an dưỡng

III. Vận hạn và đại vận:
- Dự đoán các đại vận theo từng 10 năm.
- Chỉ rõ những năm may mắn hoặc cần đề phòng.
- Nếu có thể, phân tích biến hóa của dụng thần theo từng vận trình.

IV. Gợi ý điều chỉnh và hóa giải:
- Đề xuất hành vi, nghề nghiệp, lối sống, màu sắc, phương vị phù hợp.
- Gợi ý cách tăng cường Dụng Thần hoặc tiết chế Kỵ Thần.

V. Lời nhắc tâm linh:
Mệnh lý không phải định mệnh tuyệt đối. Dù lá số là “trời định”, nhưng vận mệnh luôn có thể chuyển hóa nhờ vào nỗ lực, thiện tâm và trí huệ của bản thân. Mong bạn sống tỉnh thức, hành xử hợp đạo lý và biết thuận thiên mà hành.

Hãy trình bày nội dung một cách rõ ràng, sâu sắc, văn phong như một thầy luận mệnh nhiều năm kinh nghiệm, sử dụng tiếng Việt trang trọng và giàu tính triết lý.
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
