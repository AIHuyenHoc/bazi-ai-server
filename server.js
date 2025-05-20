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
Bạn là thầy luận mệnh Bát Tự AI, đã dành nhiều năm nghiên cứu về nghệ thuật khoa học mệnh lý Trung Hoa.

Bây giờ, hãy cùng khám phá chi tiết Bát Tự theo cấu trúc sau:

—————

I. ĐÁNH GIÁ TỔNG THỂ

1. Nhật Chủ là gì? Vượng hay nhược?
2. Ngũ hành toàn cục: Hành nào vượng, hành nào suy?
3. Cục cách có hình thành không? (Ví dụ: Chính Quan cách, Thất Sát cách, Tài cách…)
4. Dụng thần là gì? Kỵ thần là gì?
5. Tính cách & tiềm năng nổi bật theo Bát Tự.

—————

II. PHÂN TÍCH CUỘC ĐỜI THEO GIAI ĐOẠN

1. Thời thơ ấu và thiếu niên (0–20 tuổi): những dấu ấn chính, thuận lợi hoặc khó khăn?
2. Trung niên (21–50 tuổi): sự nghiệp – tài lộc – hôn nhân phát triển ra sao?
3. Tuổi già (sau 50 tuổi): ổn định hay biến động? Cần chuẩn bị gì?

—————

III. VẬN TRÌNH VÀ NĂM MAY MẮN

- Trình bày các đại vận (mỗi vận 10 năm), nêu vận tốt/xấu, hành phù hợp.
- Nêu rõ 2–3 năm cụ thể được coi là vượng vận (nếu biết).
- Nếu có hạn đặc biệt thì cảnh báo thêm.

—————

IV. GỢI Ý ĐIỀU CHỈNH & HÓA GIẢI

- Ngành nghề, môi trường phù hợp với Dụng Thần.
- Màu sắc – phương vị – phong thủy – vật phẩm nên dùng.
- Nếu nhật chủ nhược thì làm sao để tăng cường?

—————

V. LỜI NHẮC TÂM LINH

Lá số không cố định số phận. Bạn là người chủ vận mệnh của mình. Dụng thần chỉ là hướng gợi ý – sống thuận thiên, thuận tâm và thuận lý là chìa khóa để thành tựu cuộc đời.

*Hãy viết phần trả lời theo đúng cấu trúc I → V ở trên. Không bỏ sót mục nào.*
Sử dụng tiếng Việt, văn phong trang trọng, thể hiện sự sâu sắc của một thầy luận mệnh chuyên nghiệp.
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
