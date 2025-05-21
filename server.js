const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Route cho Bát Tự AI
app.post("/api/luan-giai-bazi", async (req, res) => {
  const { messages, tuTruInfo, dungThan } = req.body;

  // Lấy câu hỏi của người dùng
  const userMessage = messages[messages.length - 1].content;

  // Kiểm tra câu hỏi có liên quan đến may mắn hay không
  const isLuckyQuestion = userMessage.toLowerCase().includes("may mắn") || userMessage.toLowerCase().includes("vận hạn");

  // Tạo fullPrompt cho GPT
  const fullPrompt = `
    Bạn là một chuyên gia luận mệnh Bát Tự với kiến thức chuẩn xác về ngũ hành, dụng thần và nguyên tắc luận mạnh yếu của Nhật Chủ.

    Khi phân tích lá số Bát Tự, hãy nhắc lại các nội dung bát tự và cách dụng dụng thần do tôi gửi đến 
    **Thông tin Bát Tự**:
    ${tuTruInfo} // Thông tin ẩn chứa cách cục và dụng thần
    **Dụng Thần**: ${dungThan ? dungThan : "Chưa xác định"}

    Việc phân tích tiếp theo tuân thủ các nguyên tắc sau:
    
    ${isLuckyQuestion ? `
    **Dự đoán vận hạn và may mắn trong năm**:
    Dựa trên năm sinh và các yếu tố Bát Tự, phân tích vận hạn của người này trong năm 2025.
    Dự đoán sự nghiệp, tài chính, sức khỏe và các mối quan hệ trong năm đó. 
    Lưu ý, tập trung vào các yếu tố tương sinh, tương khắc của năm 2025 đối với Nhật Chủ và các yếu tố tác động từ năm này đến cuộc sống của người này.
    ` : `
    III. **Tính Cách và Vận Trình:**
    - Phân tích tính cách nổi bật, điểm mạnh và yếu của người này.
    - Dự đoán vận trình cuộc đời theo ba giai đoạn:
        1. **Thời thơ ấu**: Đánh giá các yếu tố ảnh hưởng đến sự phát triển trong giai đoạn đầu đời.
        2. **Trung niên**: Dự đoán các cơ hội và thách thức trong sự nghiệp, tài chính, và các mối quan hệ.
        3. **Hậu vận**: Dự đoán vận trình khi về già, bao gồm sức khỏe, hạnh phúc và an nhàn.
    - Nêu thách thức và cơ hội chính trong từng giai đoạn.

    IV. **Gợi Ý Ứng Dụng:**
    - Gợi ý ngành nghề phù hợp với Dụng Thần và các đặc điểm trong Bát Tự.
    - Gợi ý màu sắc, vật phẩm phong thủy nên dùng để tăng cường vận khí.
    - Phương hướng nhà hoặc làm việc nên ưu tiên để thúc đẩy sự nghiệp và sức khỏe.
    `}
  `;

  const formattedMessages = messages.map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
  }));

  const lastMsgIndex = formattedMessages.findLastIndex((m) => m.role === "user");
  if (lastMsgIndex !== -1) {
    formattedMessages[lastMsgIndex].content = fullPrompt;
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

// Khởi động server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
