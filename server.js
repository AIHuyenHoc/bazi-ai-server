const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/luan-giai-bazi", async (req, res) => {
  const { messages, tuTruInfo, dungThan, isAskingBazi } = req.body;

  // Prompt chi tiết cho trường hợp người dùng hỏi về Bát Tự
  const baziPrompt = `
Bạn là một chuyên gia luận mệnh Bát Tự với kiến thức chuẩn xác về ngũ hành, dụng thần, nguyên tắc luận mạnh yếu của Nhật Chủ.

Thông tin Bát Tự và dụng thần ẩn chứa:
${tuTruInfo || "Chưa có thông tin bát tự chi tiết."}

Dụng Thần:
${dungThan || "Chưa xác định"}

Hãy luận giải chi tiết theo các mục sau:

1. Mạnh yếu Nhật Chủ dựa trên ngũ hành và sự tương sinh tương khắc trong lá số.
2. Phân tích cách cục và vai trò của dụng thần, mối quan hệ các hành.
3. Dự đoán tính cách, điểm mạnh, điểm yếu và vận trình theo các giai đoạn:
   - Thời thơ ấu
   - Trung niên
   - Hậu vận
4. Gợi ý ngành nghề phù hợp từng dụng thần:
   - Mộc: nông nghiệp, giáo dục, may mặc, thợ mộc, đồ gỗ,...
   - Hỏa: kinh doanh, biểu diễn, ẩm thực, điện tử,...
   - Thổ: bất động sản, tài chính, chăm sóc sức khỏe,...
   - Kim: công nghệ, y tế, luật pháp, kim hoàn,...
   - Thủy: truyền thông, nghệ thuật, tư vấn, du lịch,...
5. Gợi ý màu sắc trang phục và phụ kiện phù hợp từng hành:
   - Mộc: xanh lá, nâu đất, vòng gỗ như trầm hương.
   - Hỏa: đỏ, cam, hồng, đá quý màu đỏ.
   - Thổ: vàng đất, nâu, thạch anh vàng, đá mắt hổ.
   - Kim: trắng, bạc, xám, trang sức kim loại.
   - Thủy: đen, xanh dương, pha lê thủy tinh, mắt kính.
6. Phương hướng nhà hoặc nơi làm việc nên ưu tiên theo dụng thần:
   - Mộc: Đông, Đông Nam
   - Hỏa: Nam
   - Thổ: Đông Bắc, Tây Nam, Trung cung
   - Kim: Tây, Tây Bắc
   - Thủy: Bắc
7. Kết luận rõ ràng, tránh lặp lại thừa thãi, không dùng câu chung chung như "Chúc bạn may mắn".

Nếu người dùng không hỏi về Bát Tự, hãy trả lời tự nhiên, linh hoạt, không lặp lại phần luận dụng thần hoặc cách cục mà chỉ giải đáp câu hỏi theo cách đơn giản, thân thiện. Nếu cần, yêu cầu người dùng cung cấp thông tin ngày giờ sinh hoặc can chi để phân tích chính xác hơn.
`;

  // Prompt cho trường hợp không phải hỏi Bát Tự
  const generalPrompt = `
Bạn là trợ lý thân thiện, linh hoạt, trả lời phù hợp với câu hỏi của người dùng.
Nếu câu hỏi không liên quan đến Bát Tự, hãy trả lời tự do, rõ ràng, không nhắc đến dụng thần hay cách cục.
Nếu câu hỏi không đủ thông tin để trả lời chính xác, hãy lịch sự yêu cầu cung cấp thêm thông tin.
`;

  // Chuẩn bị messages gửi cho OpenAI
  const formattedMessages = messages.map((m) => ({
    role: m.role === "user" ? "user" : "assistant",
    content: m.content,
  }));

  // Xác định prompt sử dụng dựa trên isAskingBazi
  const promptToUse = isAskingBazi ? baziPrompt : generalPrompt;

  // Chèn prompt vào message cuối cùng của user
  const lastUserIndex = formattedMessages.findLastIndex((m) => m.role === "user");
  if (lastUserIndex !== -1) {
    formattedMessages[lastUserIndex].content = `${formattedMessages[lastUserIndex].content}\n\n${promptToUse}`;
  }

  try {
    const gptRes = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: formattedMessages,
        temperature: 0.7,
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

// Server lắng nghe cổng
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
