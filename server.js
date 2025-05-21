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
Bạn là một chuyên gia luận mệnh Bát Tự với kiến thức chuẩn xác về ngũ hành, dụng thần và nguyên tắc luận mạnh yếu của Nhật Chủ.

${isBirthInfoQuestion ? `
Thông tin Bát Tự:
${tuTruInfo} 
Dụng Thần: ${dungThan ? dungThan : "Chưa xác định"}

Khi phân tích lá số Bát Tự, hãy bắt đầu bằng việc nhắc lại cách cục và dụng thần của người này một cách chính xác và đầy đủ.

Tiếp theo, phân tích như sau:

1. Phân tích ngũ hành toàn cục:
- Đánh giá các hành Kim, Mộc, Thủy, Hỏa, Thổ vượng hay suy dựa trên cách cục và các thiên can, địa chi xung quanh.
- Giải thích ý nghĩa của các hành trong lá số theo nguyên tắc tương sinh tương khắc.

2. Tính cách và vận trình:
- Phân tích tính cách nổi bật, điểm mạnh và yếu đặc trưng theo cách cục và dụng thần.
- Dự đoán vận trình cuộc đời theo ba giai đoạn: thời thơ ấu, trung niên, hậu vận.
- Nêu bật thách thức và cơ hội chính trong từng giai đoạn.

3. Gợi ý ứng dụng:
- Ngành nghề phù hợp với dụng thần, ví dụ dụng thần Mộc thì nên làm nghề trồng trọt, giáo dục, thời trang, nghề gỗ, thợ mộc.
- Màu sắc nên dùng theo ngũ hành dụng thần, ví dụ dụng thần Kim thì mặc đồ trắng, dùng trang sức kim loại; dụng thần Thủy thì màu đen hoặc xanh dương, trang sức pha lê.
- Phương hướng nhà hoặc làm việc ưu tiên theo dụng thần, ví dụ dụng thần Kim là hướng Tây và Tây Bắc; dụng thần Thủy là hướng Bắc; dụng thần Mộc là hướng Đông và Đông Nam.

Không sử dụng các ký tự đặc biệt như dấu sao hay dấu thăng trong câu trả lời. Hãy trình bày rõ ràng, mạch lạc và thân thiện với người dùng.

` : isFortuneQuestion ? `
Dựa trên thông tin Bát Tự của bạn, hãy phân tích vận hạn, vận khí và các cơ hội, thách thức trong năm mà bạn hỏi (ví dụ: năm 2025, 2026, 2027). 

Cung cấp dự đoán chi tiết về công việc, tài chính, sức khỏe, mối quan hệ trong năm đó.

Đưa ra lời khuyên và cách tối ưu vận khí để năm đó may mắn và thuận lợi.

Không cần nhắc lại thông tin cách cục hay dụng thần.

` : `
Vui lòng trả lời tự nhiên, linh hoạt cho câu hỏi của người dùng. Nếu câu hỏi không liên quan đến ngày sinh hoặc Bát Tự, không cần nhắc lại thông tin mạnh yếu, dụng thần, cách cục.

Hãy trả lời dễ hiểu, không sử dụng dấu sao hay ký tự đặc biệt gây khó chịu.

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
