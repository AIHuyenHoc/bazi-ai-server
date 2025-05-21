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

  // Kiểm tra nếu câu hỏi có liên quan đến giờ, ngày, tháng, năm sinh hay không
  const isBirthInfoQuestion = /giờ|ngày|tháng|năm/.test(userMessage.toLowerCase());
  const isFortuneQuestion = /2025|2026|2027|may mắn|vận hạn/.test(userMessage.toLowerCase());

  // Tạo fullPrompt cho GPT
  const fullPrompt = `
    Bạn là một chuyên gia luận mệnh Bát Tự với kiến thức chuẩn xác về ngũ hành, dụng thần và nguyên tắc luận mạnh yếu của Nhật Chủ.

    ${isBirthInfoQuestion ? `
    Thông tin Bát Tự:
    ${tuTruInfo} // Thông tin ẩn chứa cách cục và dụng thần
    Dụng Thần: ${dungThan ? dungThan : "Chưa xác định"}

    Khi phân tích lá số Bát Tự, nhắc lại thông tin mạnh yếu, cách cục, và dụng thần của người này theo các nguyên tắc trong Bát Tự:

    Tính Cách và Vận Trình:
    - Phân tích tính cách nổi bật, điểm mạnh và yếu của người này.
    - Dự đoán vận trình cuộc đời theo ba giai đoạn:
        - Thời thơ ấu: Đánh giá các yếu tố ảnh hưởng đến sự phát triển trong giai đoạn đầu đời.
        - Trung niên: Dự đoán các cơ hội và thách thức trong sự nghiệp, tài chính, và các mối quan hệ.
        - Hậu vận: Dự đoán vận trình khi về già, bao gồm sức khỏe, hạnh phúc và an nhàn.
    - Nêu thách thức và cơ hội chính trong từng giai đoạn.

    Gợi Ý Ứng Dụng:
    - Ngành nghề phù hợp với Dụng Thần: Gợi ý ngành nghề phù hợp với các yếu tố trong Bát Tự và Dụng Thần, ví dụ: Dụng Thần Mộc phù hợp với ngành trồng trọt, chăn nuôi, giáo dục, may mặc, thợ mộc, đồ gỗ.
    - Màu sắc và phụ kiện: Gợi ý màu sắc và phụ kiện phong thủy cho người này, ví dụ: Mộc - Màu xanh lá, Thủy - Màu đen hoặc xanh, Kim - Màu trắng và kim loại, Thổ - Màu vàng hoặc nâu.
    - Phương hướng làm việc: Gợi ý phương hướng dựa trên Dụng Thần, ví dụ: Dụng Thần Mộc - Hướng Đông và Đông Nam, Dụng Thần Thủy - Hướng Bắc, Dụng Thần Kim - Hướng Tây và Tây Bắc.
    ` : isFortuneQuestion ? `
    Phân tích về vận hạn năm 2025 hoặc các năm khác:
    Dựa trên thông tin về Bát Tự của bạn, phân tích những yếu tố ảnh hưởng đến vận hạn của bạn trong năm bạn yêu cầu. Điều này bao gồm các cơ hội, thách thức, và các bước hành động để tăng cường may mắn.
    - Dự đoán những thay đổi chính trong công việc, tài chính, sức khỏe và mối quan hệ trong năm yêu cầu.
    - Cung cấp các gợi ý về cách cải thiện vận khí và tối ưu hóa cơ hội trong năm đó.
    ` : `
    Tính Cách và Vận Trình:
    - Phân tích tính cách nổi bật, điểm mạnh và yếu của người này.
    - Dự đoán vận trình cuộc đời theo ba giai đoạn:
        - Thời thơ ấu: Đánh giá các yếu tố ảnh hưởng đến sự phát triển trong giai đoạn đầu đời.
        - Trung niên: Dự đoán các cơ hội và thách thức trong sự nghiệp, tài chính, và các mối quan hệ.
        - Hậu vận: Dự đoán vận trình khi về già, bao gồm sức khỏe, hạnh phúc và an nhàn.
    - Nêu thách thức và cơ hội chính trong từng giai đoạn.

    Gợi Ý Ứng Dụng:
    - Ngành nghề phù hợp với Dụng Thần: Gợi ý ngành nghề phù hợp với Dụng Thần và các yếu tố trong Bát Tự.
    - Màu sắc và phụ kiện: Gợi ý màu sắc và các phụ kiện phong thủy để gia tăng vận khí của người này.
    - Phương hướng làm việc: Gợi ý phương hướng ưu tiên cho công việc và sinh hoạt.
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
