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
  const isFortuneQuestion = /2025|2026|2027|may mắn|vận hạn|có tốt không|việc này có tốt không/.test(userMessage.toLowerCase());

  // Tạo fullPrompt cho GPT
  const fullPrompt = `
Bạn là chuyên gia luận mệnh Bát Tự với kiến thức chuẩn xác về Ngũ Hành, Cách Cục và Dụng Thần.

${isFortuneQuestion ? `
Bạn vừa hỏi về vận hạn năm hoặc đại vận (ví dụ: năm 2025, 2026, 2027), nhưng chưa cung cấp đầy đủ thông tin về can chi của năm đó (ví dụ: năm 2025 là năm Ất Tỵ). 

Vui lòng cung cấp đầy đủ can chi của năm hoặc đại vận bạn muốn hỏi để tôi có thể phân tích ngũ hành, vận khí chính xác dựa trên:

Bảng Ngũ Hành 10 Thiên Can:
- Giáp, Ất thuộc Mộc
- Bính, Đinh thuộc Hỏa
- Mậu, Kỷ thuộc Thổ
- Canh, Tân thuộc Kim
- Nhâm, Quý thuộc Thủy

Bảng Ngũ Hành 12 Địa Chi:
- Tý, Hợi thuộc Thủy
- Sửu, Thìn, Mùi, Tuất thuộc Thổ
- Dần, Mão thuộc Mộc
- Tỵ, Ngọ thuộc Hỏa
- Thân, Dậu thuộc Kim

Sau khi nhận được can chi đầy đủ, tôi sẽ phân tích vận hạn, vận khí, cơ hội và thách thức trong năm hoặc đại vận đó, đưa ra lời khuyên cụ thể để tăng cường vận khí và giảm thiểu khó khăn.

Nếu bạn đã cung cấp đủ thông tin, hãy hỏi lại hoặc cung cấp thêm chi tiết để tôi giúp bạn phân tích kỹ hơn.

` : isBirthInfoQuestion ? `
Thông tin Bát Tự:
${tuTruInfo}
Dụng Thần: ${dungThan ? dungThan : "Chưa xác định"}

Khi phân tích lá số Bát Tự, hãy thực hiện các bước sau:

1. Nhắc lại cách cục và dụng thần một cách chính xác và đầy đủ.

2. Phân tích ngũ hành toàn cục:
- Đánh giá sự vượng suy của Kim, Mộc, Thủy, Hỏa, Thổ trong lá số dựa trên cách cục và các thiên can, địa chi liên quan.
- Giải thích nguyên lý tương sinh tương khắc tác động thế nào đến sức mạnh Nhật Chủ.

3. Phân tích tính cách và vận trình:
- Phân tích điểm mạnh, điểm yếu và tính cách nổi bật.
- Dự đoán vận trình theo ba giai đoạn: thời thơ ấu, trung niên, hậu vận.
- Nêu thách thức và cơ hội chính trong từng giai đoạn.

4. Gợi ý ứng dụng chi tiết:
- Ngành nghề phù hợp theo từng hành dụng thần:
  + Kim: kim loại, trang sức, công nghệ, y tế, luật pháp.
  + Mộc: nông nghiệp, giáo dục, thời trang, nghề mộc, nghệ thuật.
  + Thủy: vận tải, thủy sản, truyền thông, nghệ thuật, tư vấn.
  + Hỏa: kinh doanh, quảng cáo, điện tử, nghệ thuật biểu diễn, ẩm thực.
  + Thổ: xây dựng, bất động sản, tài chính, bảo hiểm, chăm sóc sức khỏe.
- Màu sắc trang phục và phụ kiện:
  + Kim: trắng, bạc, xám, trang sức kim loại.
  + Mộc: xanh lá, nâu đất, vàng gỗ, vòng gỗ trầm hương, đàn hương.
  + Thủy: đen, xanh dương, pha lê, đá mắt mèo.
  + Hỏa: đỏ, cam, hồng, tím, đá ruby, thạch anh hồng.
  + Thổ: vàng đất, nâu, cam đất, đá thạch anh vàng, hổ phách.
- Phương hướng nhà hoặc nơi làm việc nên ưu tiên theo dụng thần:
  + Kim: Tây, Tây Bắc.
  + Mộc: Đông, Đông Nam.
  + Thủy: Bắc.
  + Hỏa: Nam.
  + Thổ: Đông Bắc, Tây Nam, trung cung.
- Giải thích cụ thể tại sao các màu sắc, trang sức và hướng này sẽ giúp tăng cường sức khỏe, vận khí, sự nghiệp.

Hãy trình bày dài, rõ ràng, dễ hiểu, không dùng ký tự đặc biệt như dấu * hay #.

` : `
Đây là câu trả lời tự do, linh hoạt cho các câu hỏi không liên quan đến Bát Tự hay ngày sinh.
Hãy trả lời dễ hiểu, thân thiện, không nhắc lại thông tin mạnh yếu, dụng thần hay cách cục.
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
