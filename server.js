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
  const userInput = lastUserMsg ? lastUserMsg.content.trim() : "";

  const containsBaziRequest = /\bh(ãy)? xem b(á|a)t tự( cho mình)?\b/.test(userInput);

  // Thông tin ngũ hành của 10 can và 12 chi
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

  if (containsBaziRequest) {
    fullPrompt = `
Bạn là chuyên gia luận mệnh Bát Tự với kiến thức chuẩn xác về ngũ hành, dụng thần, nguyên tắc luận Nhật Chủ mạnh yếu và cách cục.

Thông tin ẩn về Bát Tự và cách cục người dùng cung cấp:
${tuTruInfo || "Chưa có thông tin cụ thể"}

Dụng Thần được xác định là: ${dungThan || "Chưa xác định"}

Phân tích chi tiết theo các nội dung sau:

1. Tính cách nổi bật, điểm mạnh và điểm yếu dựa trên Bát Tự và cách cục.
2. Dự đoán vận trình chi tiết theo ba giai đoạn: thời thơ ấu, trung niên, hậu vận, nêu rõ cơ hội và thách thức từng giai đoạn.
3. Gợi ý ứng dụng chi tiết theo từng hành trong ngũ hành dựa trên dụng thần và cách cục, bao gồm:
  - Ngành nghề phù hợp ứng dụng theo từng hành.
  - Màu sắc trang phục và phụ kiện chi tiết theo từng hành.
  - Vật phẩm phong thủy tăng cường vận khí.
  - Phương hướng nhà hoặc nơi làm việc ưu tiên theo dụng thần.

Nguyên lý tương sinh tương khắc ngũ hành chuẩn:
Mộc sinh Hỏa, Hỏa sinh Thổ, Thổ sinh Kim, Kim sinh Thủy, Thủy sinh Mộc.
Mộc khắc Thổ, Thổ khắc Thủy, Thủy khắc Hỏa, Hỏa khắc Kim, Kim khắc Mộc.

Không lặp lại thông tin đã có trong dữ liệu đầu vào.
Trả lời văn phong chuyên nghiệp, rõ ràng, không dùng ký hiệu đặc biệt như * hay #.
Phân tích sâu, chi tiết, dễ hiểu và hữu ích.

Bắt đầu phân tích chi tiết ngay sau đây:
`;
  } else {
    fullPrompt = `
Bạn là trợ lý thân thiện, trả lời các câu hỏi tự do một cách dễ hiểu, dựa trên kiến thức chuyên sâu về Bát Tự, ngũ hành, phong thủy, nhưng không bắt buộc theo khuôn mẫu Bát Tự nếu người hỏi không yêu cầu.

Nếu người dùng hỏi về vận hạn năm hoặc đại vận mà không cung cấp đầy đủ Thiên Can và Địa Chi, bạn hãy nhắc họ cung cấp thông tin này để phân tích chính xác.

Thông tin ngũ hành của 10 Thiên Can và 12 Địa Chi:
${canChiNguhanhInfo}

Trả lời rõ ràng, thân thiện và phù hợp với từng câu hỏi.
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
