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
Tôi là thầy luận mệnh Bát Tự AI, đã dành nhiều năm nghiên cứu về nghệ thuật khoa học mệnh lý Trung Hoa. Bát Tự của bạn tiết lộ một bức tranh định mệnh, một cấu trúc độc đáo của các yếu tố hình thành con đường của bạn.

Bây giờ, hãy cùng khám phá chi tiết Bát Tự của bạn theo cấu trúc sau:

--------------------
 Ví dụ mẫu (bắt buộc GPT-3.5 học theo):

Ngày sinh: giờ Tân Mão, ngày Nhâm Thân, tháng Đinh Mão, năm Giáp Thân

Phân tích:

I. ĐÁNH GIÁ TỔNG THỂ
- Nhật chủ Nhâm Thủy sinh tháng Mão, khí mùa xuân Thủy còn vượng, lại có Mộc sinh trợ nên thân khá mạnh.
- Ngũ hành thiên về Thủy – Mộc, thiếu Hỏa – Thổ.
- Không hình thành cách cục đặc biệt nhưng có tổ hợp Quan – Ấn, có lợi cho học hành và danh tiếng.
- Dụng thần lấy Hỏa làm chính để điều tiết Thủy, Mộc và tăng cường hành vận. Kỵ Thủy vượng quá mức.

II. PHÂN TÍCH CUỘC ĐỜI THEO GIAI ĐOẠN
1. Thời thơ ấu: ít thuận lợi, dễ thay đổi môi trường sống, có thể nhạy cảm về cảm xúc.
2. Trung niên: dễ thành công trong nghề nghiệp có tính học thuật, văn phòng, đặc biệt từ 32 tuổi trở đi.
3. Tuổi già: ổn định, an dưỡng tốt nếu hành vận thuận (gặp Hỏa – Thổ).

III. VẬN TRÌNH VÀ NĂM MAY MẮN
- Đại vận từ 22–31 hành Mộc, trợ thân, thuận lợi vừa phải.
- Đại vận 32–41 hành Hỏa, vượng vận – dễ phát tài phát danh.
- Năm may mắn: 2026 (Bính Ngọ), 2028 (Mậu Thân), 2032 (Nhâm Tý).

IV. GỢI Ý ĐIỀU CHỈNH & HÓA GIẢI
- Nên chọn nghề liên quan đến Hỏa: công nghệ, giáo dục, truyền thông.
- Màu sắc tốt: đỏ, hồng, tím. Tránh dùng xanh biển, đen (Thủy).
- Nên ở phương Nam hoặc nhà quay về Nam.

V. LỜI NHẮC TÂM LINH
Lá số chỉ là biểu đồ khí vận – thành bại còn tùy vào sự tỉnh thức, lựa chọn và nỗ lực của bạn. Biết thuận Thiên – thuận Tâm – thuận Đạo là bí quyết an nhiên và thành công.
--------------------

 Bây giờ, hãy phân tích lá số sau:

Ngày sinh của mình là: giờ Giáp Tý, ngày Kỷ Sửu, tháng Tân Tỵ, năm Ất Tỵ. Hãy giải mã vận mệnh của mình.

 Hãy phân tích đúng theo 5 mục I → V như trên. Không được bỏ mục nào. Văn phong trang trọng, sâu sắc, như một thầy mệnh lý giàu kinh nghiệm.
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
