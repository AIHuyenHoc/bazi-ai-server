const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/luan-giai-bazi", async (req, res) => {
  const { messages, tuTruInfo, dungThan } = req.body;

  const lastUserMsg = messages.slice().reverse().find(m => m.role === "user");
  const userInput = lastUserMsg ? lastUserMsg.content.trim().toLowerCase() : "";

  // Kiểm tra có đủ thông tin giờ ngày tháng năm
  const hasFullBirthInfo = /giờ\s*\w+/.test(userInput) && /ngày\s*\w+/.test(userInput) && /tháng\s*\w+/.test(userInput) && /năm\s*\w+/.test(userInput);

  // Kiểm tra có hỏi vận hạn năm hoặc đại vận (nhưng không có đủ info Bát Tự)
  const isAskingAboutYearOrDaiVan = /(năm\s*\d{4}|năm\s*\w+|đại vận|vận hạn|vận mệnh|năm tới|năm sau|vận trong năm)/.test(userInput) && !hasFullBirthInfo;

  let fullPrompt = "";

  if (hasFullBirthInfo) {
    fullPrompt = `
Bạn là chuyên gia luận mệnh Bát Tự, có kiến thức chuẩn xác về ngũ hành, cách cục, dụng thần và nguyên tắc luận Nhật Chủ mạnh yếu.

Thông tin ẩn về Bát Tự và cách cục người dùng cung cấp:  
${tuTruInfo || "Chưa có thông tin cụ thể"}

Dụng Thần được xác định là: ${dungThan || "Chưa xác định"}

---

1. Phân tích tính cách nổi bật, điểm mạnh và điểm yếu của người này dựa trên Bát Tự.

2. Dự đoán vận trình cuộc đời theo 3 giai đoạn:  
   - Thời thơ ấu: những ảnh hưởng chủ yếu đến sự phát triển ban đầu.  
   - Trung niên: cơ hội và thách thức trong sự nghiệp, tài chính và mối quan hệ.  
   - Hậu vận: sức khỏe, an nhàn, hạnh phúc khi về già.

3. Gợi ý ứng dụng chi tiết:  
   - Ngành nghề phù hợp dựa trên dụng thần và đặc điểm ngũ hành của Bát Tự (nêu rõ các ngành nghề điển hình tương ứng với từng hành).  
   - Màu sắc trang phục và phụ kiện: phân tích chi tiết từng hành và gợi ý màu sắc, trang sức cụ thể (ví dụ: dụng thần Kim – trắng, bạc, trang sức kim loại...).  
   - Vật phẩm phong thủy nên dùng để tăng cường vận khí.  
   - Phương hướng nhà hoặc nơi làm việc ưu tiên theo hành dụng thần (nêu rõ từng hướng ứng với từng hành).

Lưu ý: Tránh sử dụng dấu * hoặc # trong câu trả lời, trình bày rõ ràng, dễ hiểu, không lặp lại các thông tin đã cho.  
Không được thêm thắt hay sáng tạo từ ngữ không có căn cứ trong lý luận Bát Tự truyền thống.

---

Quy tắc ngũ hành chuẩn xác dùng trong phân tích:

- Thiên Can 10: Giáp, Ất (Mộc); Bính, Đinh (Hỏa); Mậu, Kỷ (Thổ); Canh, Tân (Kim); Nhâm, Quý (Thủy)  
- Địa Chi 12: Tý, Hợi (Thủy); Sửu, Thìn, Mùi, Tuất (Thổ); Dần, Mão (Mộc); Tỵ, Ngọ (Hỏa); Thân, Dậu (Kim)  

Mọi phân tích về năm sinh, vận hạn cần căn cứ chính xác theo nguyên tắc trên.

---

Hãy bắt đầu phân tích.
    `;
  }
  else if (isAskingAboutYearOrDaiVan) {
    fullPrompt = `
Bạn nhận được câu hỏi về vận hạn năm hoặc đại vận, nhưng người hỏi chưa cung cấp đủ thông tin Thiên Can và Địa Chi năm hoặc đại vận đó.

Ví dụ: Năm 2025 là năm Ất Tỵ, trong đó Thiên Can Ất thuộc Mộc, Địa Chi Tỵ thuộc Hỏa.

Để phân tích vận hạn, cơ hội, thách thức và lời khuyên chi tiết, vui lòng yêu cầu người dùng cung cấp đầy đủ can chi năm hoặc đại vận cần hỏi.

Không được tự đoán hay sáng tạo thông tin khi chưa có dữ liệu đầy đủ.

Hãy yêu cầu cung cấp thông tin can chi năm hoặc đại vận và không trả lời phân tích nếu chưa đủ dữ liệu.
    `;
  }
  else {
    fullPrompt = `
Bạn là trợ lý thân thiện, trả lời các câu hỏi tự do, dễ hiểu, không nhắc lại kiến thức chuyên sâu về Bát Tự hoặc vận hạn nếu không có yêu cầu rõ ràng.
    `;
  }

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
  console.log(\`Server running on port \${port}\`);
});
