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

  const hasFullBirthInfo = /giờ\s*\w+/.test(userInput) && /ngày\s*\w+/.test(userInput) && /tháng\s*\w+/.test(userInput) && /năm\s*\w+/.test(userInput);

  const isAskingAboutYearOrDaiVan = /(năm\s*\d{4}|năm\s*\w+|đại vận|vận hạn|vận mệnh|năm tới|năm sau|vận trong năm)/.test(userInput) && !hasFullBirthInfo;

  let fullPrompt = "";

  if (hasFullBirthInfo) {
    fullPrompt = `
Bạn là chuyên gia luận mệnh Bát Tự, có kiến thức chuẩn xác về ngũ hành, dụng thần, nguyên tắc luận Nhật Chủ mạnh yếu và cách cục.

Thông tin ẩn về Bát Tự và cách cục người dùng cung cấp:  
${tuTruInfo || "Chưa có thông tin cụ thể"}

Dụng Thần được xác định là: ${dungThan || "Chưa xác định"}

---

I. Phân tích tính cách nổi bật, điểm mạnh và điểm yếu.

II. Dự đoán vận trình cuộc đời theo 3 giai đoạn:
1. Thời thơ ấu: các yếu tố ảnh hưởng chính.
2. Trung niên: cơ hội và thách thức sự nghiệp, tài chính, mối quan hệ.
3. Hậu vận: sức khỏe, hạnh phúc, an nhàn khi về già.

III. Gợi ý ứng dụng chi tiết:
- Ngành nghề phù hợp ứng dụng theo dụng thần và ngũ hành cá nhân (ví dụ: Mộc làm nghề giáo dục, trồng trọt, thời trang; Kim làm nghề công nghệ, y tế...).
- Màu sắc trang phục và phụ kiện chi tiết theo từng hành (Kim: trắng, bạc, kim loại; Thủy: đen, xanh dương, pha lê...).
- Vật phẩm phong thủy nên dùng để tăng cường vận khí.
- Phương hướng nhà hoặc nơi làm việc ưu tiên theo dụng thần (Kim: Tây, Tây Bắc; Thủy: Bắc; Mộc: Đông, Đông Nam...).

---

Nguyên lý ngũ hành tương sinh tương khắc chuẩn:

- Tương sinh: Mộc sinh Hỏa, Hỏa sinh Thổ, Thổ sinh Kim, Kim sinh Thủy, Thủy sinh Mộc.
- Tương khắc: Mộc khắc Thổ, Thổ khắc Thủy, Thủy khắc Hỏa, Hỏa khắc Kim, Kim khắc Mộc.

---

Tránh lặp lại thông tin đã cung cấp và không dùng ký hiệu đặc biệt trong câu trả lời.

Bắt đầu phân tích:
    `;
  }
  else if (isAskingAboutYearOrDaiVan) {
    fullPrompt = `
Bạn nhận được câu hỏi về vận hạn năm hoặc đại vận, nhưng chưa có đủ thông tin Thiên Can và Địa Chi năm hoặc đại vận đó.

Ví dụ: Năm 2025 là năm Ất Tỵ, Thiên Can Ất thuộc Mộc, Địa Chi Tỵ thuộc Hỏa.

Để phân tích vận hạn năm chính xác, cần người dùng cung cấp đầy đủ can chi năm hoặc đại vận.

Không tự động suy đoán nếu chưa có đủ dữ liệu.

Hãy yêu cầu người dùng cung cấp thông tin can chi năm hoặc đại vận và không phân tích nếu chưa đủ thông tin.
    `;
  }
  else {
    fullPrompt = `
Bạn là trợ lý thân thiện, trả lời các câu hỏi tự do, dễ hiểu, không nhắc lại kiến thức chuyên sâu về Bát Tự hoặc vận hạn nếu không có yêu cầu rõ ràng.
    `;
  }

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
  console.log(\`Server running on port \${port}\`);
});
