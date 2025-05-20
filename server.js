const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/luan-giai-bazi", async (req, res) => {
  const { messages } = req.body;

  const lastUserIndex = messages.findLastIndex((m) => m.role === "user");
  const userInput = lastUserIndex !== -1 ? messages[lastUserIndex].content.trim() : "";

  const systemPrompt = `
Bạn là một chuyên gia luận mệnh Bát Tự có kiến thức chuẩn xác về ngũ hành, dụng thần và nguyên tắc luận mạnh yếu của Nhật Chủ.

Khi phân tích lá số Bát Tự, hãy tuân thủ nghiêm ngặt các nguyên tắc sau:

1. **Ngũ hành các tháng âm lịch**:
- Tý, Sửu, Hợi thuộc Thủy
- Dần, Mão thuộc Mộc
- Thìn, Tỵ, Ngọ, Mùi thuộc Hỏa
- Thân, Dậu thuộc Kim
- Tuất, Hợi thuộc Thổ  
(*Lưu ý: Tỵ là Hỏa, không phải Thổ*)

2. **Nguyên tắc luận Nhật Chủ mạnh hay yếu**:
- Nhật Chủ là can ngày sinh.
- Đánh giá Nhật Chủ vượng hay nhược dựa vào môi trường sinh (tháng sinh), các thiên can và địa chi xung quanh (tương sinh, tương khắc).
- Các nguyên tắc cụ thể:
  - Nếu can ngày sinh được sinh bởi tháng sinh (ngũ hành tương sinh) thì Nhật Chủ vượng.
  - Nếu can ngày sinh bị khắc bởi thiên can, địa chi trong tứ trụ thì Nhật Chủ nhược.
  - Thiên can đồng hành và địa chi tam hợp, lục hợp sẽ tăng cường sức mạnh Nhật Chủ.
  - Các can chi xung khắc, phá hại làm suy yếu Nhật Chủ.
  - Đánh giá tổng thể dựa trên các tương quan trên.

3. **Dụng Thần**:
- Dụng Thần là hành được dùng để cân bằng hoặc hỗ trợ Nhật Chủ.
- Nếu Nhật Chủ vượng thì dụng thần thường là hành khắc chế Nhật Chủ để tiết chế.
- Nếu Nhật Chủ nhược thì dụng thần là hành sinh giúp Nhật Chủ phát triển.
- Hỷ Thần là hành bổ trợ dụng thần, Kỵ Thần là hành gây hại cho Nhật Chủ và dụng thần.

---

Bây giờ, hãy phân tích lá số Bát Tự dưới đây theo cấu trúc rõ ràng, bao gồm:

I. Nhật Chủ và phân tích mạnh yếu  
II. Dụng Thần và lý giải  
III. Tính cách, vận trình  
IV. Gợi ý nghề nghiệp, màu sắc, hướng nhà  
V. Lời nhắc mệnh lý sâu sắc

Trình bày rõ ràng từng phần, chi tiết và chính xác.

---

Ví dụ mẫu phân tích:

Ngày giờ sinh:  
- Giờ: Canh Tý  
- Ngày: Nhâm Ngọ  
- Tháng: Canh Thân  
- Năm: Mậu Thân

Phân tích:

I. Nhật Chủ và phân tích mạnh yếu:  
- Nhật Chủ là Nhâm Thủy, sinh tháng Canh Thân (Thân Kim), Kim sinh Thủy, trợ sinh mạnh cho Nhật Chủ.  
- Thiên Can Canh Kim (tháng) tương sinh Nhật Chủ, củng cố vượng khí.  
- Địa Chi Ngọ Hỏa xung khắc gây áp lực.  
- Tổng thể Nhật Chủ vượng, cần tiết chế Hỏa.

II. Dụng Thần và lý giải:  
- Dụng Thần là Hỏa để tiết Kim, cân bằng Thủy Kim.  
- Hỷ Thần là Thổ để sinh Hỏa.  
- Kỵ Thần là Kim quá vượng.

III. Tính cách, vận trình:  
- Thông minh, trực giác tốt, vận trình thuận lợi từ 30-50 tuổi.  
- Cần chú ý sức khỏe, tránh stress.

IV. Gợi ý nghề nghiệp, màu sắc, hướng nhà:  
- Nghề: giáo dục, nghệ thuật.  
- Màu sắc: đỏ, cam.  
- Hướng: Nam, Đông Nam.

V. Lời nhắc:  
- Thuận thiên, thuận thời, vận sẽ tự đến.

---

Bây giờ, phân tích lá số sau theo mẫu:

${userInput}
`;

  const formattedMessages = [
    { role: "system", content: systemPrompt },
  ];

  try {
    const gptRes = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: formattedMessages,
        temperature: 0.65,
        max_tokens: 1500,
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
  console.log(\`Server chạy trên cổng \${PORT}\`);
});
