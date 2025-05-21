const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/luan-giai-bazi", async (req, res) => {
  const { messages, tuTruInfo, dungThan } = req.body;

  // Lấy nội dung user cuối cùng
  const lastUserMsg = messages.slice().reverse().find(m => m.role === "user");
  const userInput = lastUserMsg ? lastUserMsg.content.toLowerCase() : "";

  // Kiểm tra user có yêu cầu luận bát tự không
  const isRequestBazi =
    userInput.includes("xem bát tự") ||
    userInput.includes("luận bát tự") ||
    userInput.includes("bát tự cho mình") ||
    userInput.includes("xem lá số");

  // Kiểm tra user hỏi về vận hạn năm hoặc đại vận mà không yêu cầu luận bát tự
  const isAskingYearOrDaiVan =
    /(năm\s*\d{4}|năm\s*\w+|đại vận|vận hạn|vận mệnh|năm tới|năm sau|vận trong năm)/.test(userInput) &&
    !isRequestBazi;

  // Ngũ hành 10 Thiên Can và 12 Địa Chi (chuẩn chỉnh)
  const canChiNguhanhInfo = `
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

  let fullPrompt = "";

  if (isRequestBazi) {
    // Prompt luận bát tự chi tiết dựa trên dữ liệu bạn gửi
    fullPrompt = `
Bạn là chuyên gia luận mệnh Bát Tự có kinh nghiệm chuyên sâu về dụng thần, cách cục và các nguyên tắc phong thủy liên quan.

Thông tin Bát Tự & cách cục người dùng cung cấp:
${tuTruInfo || "Chưa có thông tin cụ thể"}

Dụng Thần và lý do chọn:
${dungThan || "Chưa xác định"}

Dựa trên các dữ liệu trên, vui lòng phân tích:

1. Tính cách nổi bật, điểm mạnh và điểm yếu của người này.
2. Dự đoán vận trình cuộc đời theo 3 giai đoạn: thời thơ ấu, trung niên và hậu vận.
3. Gợi ý ứng dụng chi tiết:
   - Ngành nghề phù hợp dựa trên dụng thần và ngũ hành cá nhân, ví dụ:
     + Mộc: giáo dục, nông nghiệp, may mặc, thợ mộc, thời trang...
     + Hỏa: kinh doanh, nghệ thuật biểu diễn, ẩm thực...
     + Thổ: bất động sản, tài chính, chăm sóc sức khỏe...
     + Kim: công nghệ, y tế, luật pháp...
     + Thủy: truyền thông, tư vấn, vận tải...
   - Màu sắc trang phục và phụ kiện nên dùng tương ứng từng hành:
     + Mộc: xanh lá, nâu đất, vòng gỗ như đàn hương, trầm hương...
     + Hỏa: đỏ, cam, hồng, tím, đá quý màu đỏ...
     + Thổ: vàng đất, nâu, đá phong thủy, vòng đá tự nhiên...
     + Kim: trắng, bạc, xám, trang sức kim loại...
     + Thủy: đen, xanh dương, phụ kiện pha lê, kính mắt...
   - Vật phẩm phong thủy tăng cường vận khí theo dụng thần.
   - Phương hướng nhà hoặc nơi làm việc ưu tiên theo nơi có dụng thần, ví dụ:
     + Mộc: Đông, Đông Nam
     + Hỏa: Nam
     + Thổ: Đông Bắc, Tây Nam, trung cung
     + Kim: Tây, Tây Bắc
     + Thủy: Bắc

Yêu cầu:
- Không nhắc lại chi tiết thông tin Bát Tự hoặc Dụng Thần đã cung cấp.
- Trình bày rõ ràng, chuyên nghiệp, không dùng dấu * hay #.
- Không phân tích mạnh yếu Nhật Chủ hay đoán cách cục.
- Bắt đầu phân tích ngay và đi vào trọng tâm.
    `;
  } else if (isAskingYearOrDaiVan) {
    // Prompt hỏi vận hạn năm hoặc đại vận nhưng chưa đủ thông tin can chi
    fullPrompt = `
Bạn nhận được câu hỏi về vận hạn năm hoặc đại vận nhưng chưa có đủ thông tin Thiên Can và Địa Chi của năm hoặc đại vận đó.

Ví dụ:
Năm 2025 là năm Ất Tỵ, trong đó:
- Thiên Can: Ất (Mộc)
- Địa Chi: Tỵ (Hỏa)

Để phân tích vận hạn chính xác, vui lòng cung cấp thông tin can chi của năm hoặc đại vận bạn quan tâm.

${canChiNguhanhInfo}

Không tự đoán nếu chưa đủ dữ liệu.
    `;
  } else {
    // Câu hỏi tự do, không liên quan Bát Tự
    fullPrompt = `
Bạn là trợ lý thân thiện, trả lời câu hỏi tự do, dễ hiểu, không cần tuân theo cấu trúc Bát Tự hay vận hạn nếu người dùng không yêu cầu.
    `;
  }

  // Thay thế nội dung user cuối cùng bằng prompt đã tạo
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
        max_tokens: 1600,
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
  console.log(`Server is running on port ${port}`);
});
