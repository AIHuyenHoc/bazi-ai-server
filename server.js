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

  const userMessage = messages[messages.length - 1].content;

  // Kiểm tra câu hỏi có liên quan đến giờ, ngày, tháng, năm sinh hay không
  const isBirthInfoQuestion = /giờ|ngày|tháng|năm/.test(userMessage.toLowerCase());

  // Tạo fullPrompt cho GPT
  const fullPrompt = `
    Bạn là một chuyên gia luận mệnh Bát Tự với kiến thức chuẩn xác về ngũ hành, dụng thần và nguyên tắc luận mạnh yếu của Nhật Chủ.

    ${isBirthInfoQuestion ? `
    **Thông tin Bát Tự**:
    ${tuTruInfo} // Thông tin ẩn chứa cách cục và dụng thần
    **Dụng Thần**: ${dungThan ? dungThan : "Chưa xác định"}

    Khi phân tích lá số Bát Tự, hãy nhắc lại các nội dung về **mạnh yếu**, **cách cục**, và **dụng thần**. Đảm bảo rằng bạn giải thích các tương sinh, tương khắc giữa các yếu tố trong Bát Tự.
    
    III. **Tính Cách và Vận Trình:**
    - Phân tích tính cách nổi bật, điểm mạnh và yếu của người này.
    - Dự đoán vận trình cuộc đời theo ba giai đoạn:
        1. **Thời thơ ấu**: Đánh giá các yếu tố ảnh hưởng đến sự phát triển trong giai đoạn đầu đời.
        2. **Trung niên**: Dự đoán các cơ hội và thách thức trong sự nghiệp, tài chính, và các mối quan hệ.
        3. **Hậu vận**: Dự đoán vận trình khi về già, bao gồm sức khỏe, hạnh phúc và an nhàn.
    - Nêu thách thức và cơ hội chính trong từng giai đoạn.

    IV. **Gợi Ý Ứng Dụng**:
    - **Ngành nghề phù hợp với Dụng Thần**: Nếu Dụng Thần là Mộc, ngành nghề nên liên quan đến trồng trọt, chăn nuôi, giáo dục, may mặc, thời trang, thợ mộc, đồ gỗ.
    - **Màu sắc phù hợp với Dụng Thần**: 
      - Dụng Thần Kim: Mặc đồ màu trắng, trang sức kim loại.
      - Dụng Thần Thủy: Mặc đồ màu đen hoặc xanh, trang sức pha lê, thủy tinh.
      - Dụng Thần Mộc: Mặc đồ màu xanh lá, phụ kiện gỗ như vòng gỗ đàn hương hoặc trầm hương.
      - Dụng Thần Hỏa: Mặc đồ màu đỏ, hồng, tím.
      - Dụng Thần Thổ: Mặc đồ màu vàng hoặc nâu, trang sức đá quý.
    - **Phương hướng làm việc**: 
      - Dụng Thần Kim: Phương hướng Tây và Tây Bắc.
      - Dụng Thần Thủy: Phương hướng Bắc.
      - Dụng Thần Mộc: Phương hướng Đông và Đông Nam.
      - Dụng Thần Hỏa: Phương hướng Nam.
      - Dụng Thần Thổ: Phương hướng Đông Bắc, Tây Nam và Trung Cung.
    ` : `
    III. **Tính Cách và Vận Trình:**
    - Phân tích tính cách nổi bật, điểm mạnh và yếu của người này.
    - Dự đoán vận trình cuộc đời theo ba giai đoạn:
        1. **Thời thơ ấu**: Đánh giá các yếu tố ảnh hưởng đến sự phát triển trong giai đoạn đầu đời.
        2. **Trung niên**: Dự đoán các cơ hội và thách thức trong sự nghiệp, tài chính, và các mối quan hệ.
        3. **Hậu vận**: Dự đoán vận trình khi về già, bao gồm sức khỏe, hạnh phúc và an nhàn.
    - Nêu thách thức và cơ hội chính trong từng giai đoạn.

    IV. **Gợi Ý Ứng Dụng**:
    - **Ngành nghề phù hợp với Dụng Thần**: Gợi ý ngành nghề phù hợp dựa trên các đặc điểm trong Bát Tự và Dụng Thần.
    - **Màu sắc và phụ kiện**: Gợi ý màu sắc và các phụ kiện phong thủy có thể giúp gia tăng vận khí của người này.
    - **Phương hướng làm việc**: Gợi ý phương hướng ưu tiên cho công việc và sinh hoạt.
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
