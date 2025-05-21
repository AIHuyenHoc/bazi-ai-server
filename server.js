const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Ngũ hành Can Chi chuẩn
const CAN_CHI_NGU_HANH = `
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

app.post("/api/luan-giai-bazi", async (req, res) => {
  const { messages, tuTruInfo, dungThan } = req.body;

  // Lấy nội dung user cuối cùng để phân tích
  const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
  const userInput = lastUserMsg ? lastUserMsg.content.toLowerCase() : "";

  // Kiểm tra người dùng có muốn xem Bát Tự không (câu có từ khóa này)
  const isRequestBazi = userInput.includes("xem bát tự") || userInput.includes("luận bát tự") || userInput.includes("bát tự cho mình") || userInput.includes("xem lá số");

  // Kiểm tra hỏi về năm hoặc vận hạn mà không phải xem bát tự
  const isAskingYearOrDaiVan = /(năm\s*\d{4}|năm\s*\w+|đại vận|vận hạn|vận mệnh|năm tới|năm sau|vận trong năm)/.test(userInput) && !isRequestBazi;

  let fullPrompt = "";

  if (isRequestBazi) {
    fullPrompt = `
Bạn là chuyên gia luận mệnh Bát Tự, có kiến thức sâu sắc về Ngũ Hành, Can Chi, Dụng Thần và nguyên lý tương sinh tương khắc.

Thông tin Bát Tự và cách cục người dùng đã cung cấp:
${tuTruInfo || "Chưa có thông tin cụ thể"}

Dụng Thần và Cách Cục:
${dungThan || "Chưa xác định"}

1. Phân tích chi tiết từng trụ Can Chi trong Bát Tự dựa trên dữ liệu tuTruInfo, làm rõ vai trò của Nhật Chủ và tương quan với các trụ khác.

2. Phân tích vận trình theo 3 giai đoạn: Thời thơ ấu, Trung niên, Hậu vận, dựa trên dụng thần và mối quan hệ tương sinh tương khắc trong ngũ hành.

3. Gợi ý ứng dụng chi tiết theo từng hành trong dụng thần:

Ngành nghề:
- Mộc: giáo dục, nông nghiệp, thời trang, nghệ thuật.
- Hỏa: kinh doanh, nghệ thuật biểu diễn, ẩm thực.
- Thổ: bất động sản, tài chính, chăm sóc sức khỏe.
- Kim: công nghệ, y tế, luật pháp, kỹ thuật.
- Thủy: truyền thông, tư vấn, vận tải, nghệ thuật.

Màu sắc trang phục và phụ kiện:
- Mộc: xanh lá, nâu đất, vòng gỗ đàn hương, vòng trầm hương.
- Hỏa: đỏ, cam, hồng, trang sức đá quý.
- Thổ: vàng đất, nâu, đá phong thủy, tượng đá.
- Kim: trắng, bạc, xám, trang sức kim loại.
- Thủy: đen, xanh dương, pha lê, phụ kiện thủy tinh.

Vật phẩm phong thủy:
- Mộc: cây xanh, tranh phong cảnh.
- Hỏa: nến, đèn đỏ, tượng phượng hoàng.
- Thổ: đá thạch anh vàng, tượng Phật đá.
- Kim: đồng tiền vàng, vật liệu kim loại.
- Thủy: hồ cá nhỏ, bình thủy tinh.

Phương hướng nhà hoặc nơi làm việc ưu tiên:
- Mộc: Đông, Đông Nam.
- Hỏa: Nam.
- Thổ: Đông Bắc, Tây Nam, trung cung.
- Kim: Tây, Tây Bắc.
- Thủy: Bắc.

4. Không lặp lại thông tin đã có trong tuTruInfo và dungThan.
5. Trình bày rõ ràng, mạch lạc, chuyên nghiệp, không dùng dấu * hoặc #.

Bắt đầu phân tích chi tiết:
    `;
  } else if (isAskingYearOrDaiVan) {
    fullPrompt = `
Bạn nhận được câu hỏi về vận hạn năm hoặc đại vận nhưng chưa có đủ thông tin Thiên Can và Địa Chi của năm hoặc đại vận đó.

Ví dụ: Năm 2025 là năm Ất Tỵ, trong đó:
- Thiên Can: Ất (Mộc)
- Địa Chi: Tỵ (Hỏa)

Để phân tích vận hạn chính xác, vui lòng cung cấp thông tin can chi năm hoặc đại vận bạn quan tâm.

${CAN_CHI_NGU_HANH}

Không tự suy đoán nếu chưa đủ dữ liệu.
    `;
  } else {
    fullPrompt = `
Bạn là trợ lý thân thiện, trả lời các câu hỏi tự do, dễ hiểu, không bắt buộc theo cấu trúc Bát Tự hay vận hạn nếu không được yêu cầu cụ thể.
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
