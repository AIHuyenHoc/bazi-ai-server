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

const fullPrompt = `
Dưới đây là một ví dụ mẫu phân tích Bát Tự:

—————

I. ĐÁNH GIÁ TỔNG THỂ
- Nhật Chủ là Tân Kim, sinh tháng Kỷ Dậu (thu kim vượng), nên nhật chủ mạnh.
- Ngũ hành thiên về Kim và Thổ, thiếu Mộc và Thủy.
- Cục cách là Chính Quan cách, có đủ Quan – Ấn tương sinh.
- Dụng Thần là Thủy hoặc Mộc để tiết Kim sinh Tài; Kỵ Thần là Thổ vì quá nhiều.
- Người này thông minh, lý trí, có xu hướng cầu toàn, kiệm lời nhưng cứng rắn.

II. PHÂN TÍCH CUỘC ĐỜI
1. Thơ ấu: ổn định, ít bệnh tật, dễ học nhưng nội tâm kín đáo.
2. Trung niên: phát triển chậm đầu, về sau có quý nhân nâng đỡ.
3. Về già: cần giữ sức khỏe tỳ vị, nếu dụng thần không đổi thì giàu có an nhàn.

III. VẬN TRÌNH
- Đại vận từ 12–22: Hành Thổ, không lợi (Kỵ Thần).
- 23–32: Hành Kim, gia tăng quyền lực.
- 33–42: Hành Thủy (Dụng Thần): làm ăn khởi sắc.
- Năm tốt: 2026, 2028 (Tý, Thìn).

IV. ĐIỀU CHỈNH & HÓA GIẢI
- Nên chọn nghề liên quan đến Kim/Thủy: công nghệ, tài chính, kỹ thuật.
- Dùng màu xanh, đen, trang trí cây cối trong nhà.
- Tránh đất hướng Tây Nam (nhiều Thổ).

V. NHẮC NHỞ
Dù có mệnh đẹp, vẫn phải nỗ lực. Vận may là tiềm năng, không phải đảm bảo. Biết dụng thần là hiểu mình, sống thuận thiên thì an yên.

—————

Bây giờ, hãy phân tích Bát Tự sau: giờ Canh Tý, ngày Tân Tỵ, tháng Kỷ Dậu, năm Đinh Sửu.

Lưu ý: hãy viết theo đúng format như ví dụ mẫu trên, dùng tiếng Việt, không bỏ sót mục nào.
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
