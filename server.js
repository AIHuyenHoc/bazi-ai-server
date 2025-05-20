const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/luan-giai-bazi", async (req, res) => {
  const { messages } = req.body;

  // Lấy nội dung user input cuối cùng
  const lastUserIndex = messages.findLastIndex((m) => m.role === "user");
  const userInput = lastUserIndex !== -1 ? messages[lastUserIndex].content.trim() : "";

  // Prompt hệ thống có ví dụ mẫu phân tích mạnh yếu Nhật Chủ
  const systemPrompt = `
Bạn là một thầy luận mệnh Bát Tự có nhiều năm kinh nghiệm, am hiểu sâu sắc các nguyên tắc luận mạnh yếu nhật chủ.

Khi phân tích mạnh yếu Nhật Chủ trong Bát Tự, bạn cần dựa trên các yếu tố sau:

1. Tháng sinh âm lịch (ảnh hưởng lớn đến vượng suy của Nhật Chủ).
2. Thiên Can của ngày sinh (đặc biệt là can Nhật Chủ) và các Thiên Can khác trong tứ trụ, xem tương sinh tương khắc.
3. Địa Chi trong tứ trụ, bao gồm hợp xung, tam hợp, lục hợp, hại, phá, ảnh hưởng đến Nhật Chủ.
4. Tương quan ngũ hành giữa Nhật Chủ và các yếu tố Can Chi trong tứ trụ.
5. Các nguyên lý truyền thống như Phù – Ức nhật nguyên, Điều Hậu, ảnh hưởng đến cục cách và dụng thần.

---

Ví dụ phân tích:

Ngày giờ sinh:
- Giờ: Canh Tý
- Ngày: Nhâm Ngọ
- Tháng: Canh Thân
- Năm: Mậu Thân

Phân tích:

I. Xác định Nhật Chủ và phân tích mạnh yếu:

- Nhật Chủ là Nhâm Thủy (can ngày sinh).
- Nhật Chủ sinh tháng Canh Thân (Thân Kim), Kim sinh Thủy, trợ sinh mạnh cho Nhật Chủ.
- Thiên Can Canh Kim (tháng) tương sinh Nhâm Thủy (nhật chủ), củng cố khí chất Nhật Chủ vượng.
- Địa Chi Tý Thủy (giờ) tương hợp với Nhật Chủ.
- Ngọ Hỏa (ngày) khắc Thủy, tạo áp lực cho Nhật Chủ.
- Tổng hợp, Nhật Chủ vượng, được trợ sinh nhiều từ Kim, nhưng cần chế tiết Hỏa để tránh tổn hao khí.

II. Dụng Thần:

- Dụng Thần là Hỏa để tiết Kim, cân bằng Thủy Kim.
- Hỷ Thần là Thổ để sinh Hỏa.
- Kỵ Thần là Kim quá vượng làm Nhật Chủ bóp nghẹt.

III. Nhận định:

- Nhật Chủ vượng, trí tuệ sắc bén.
- Cần kiểm soát cảm xúc, sức khỏe liên quan Thủy – Hỏa.
- Vận trình thuận lợi khi hành Hỏa – Thổ thịnh, tránh Kim quá mạnh.

---

Bây giờ, hãy phân tích lá số Bát Tự dưới đây theo cấu trúc trên, rõ ràng từng phần, đầy đủ chi tiết:

${userInput}
`;

  // Tạo mảng messages gửi API
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
