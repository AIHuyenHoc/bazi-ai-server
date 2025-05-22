const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

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

app.post("/api/luan-giai-bazi", async (req, res) => {
  const { messages, tuTruInfo, dungThan } = req.body;

  const lastUserMsg = messages.slice().reverse().find(m => m.role === "user");
  const userInput = lastUserMsg ? lastUserMsg.content.toLowerCase() : "";

  const isRequestBazi =
    userInput.includes("hãy xem bát tự cho mình") ||
    userInput.includes("xem bát tự") ||
    userInput.includes("luận bát tự") ||
    userInput.includes("xem lá số");

  const isAskingYearOrDaiVan =
    /(năm\s*\d{4}|năm\s*\w+|đại vận|vận hạn|vận mệnh|năm tới|năm sau|vận trong năm)/.test(userInput) &&
    !isRequestBazi;

  // Parse tuTruInfo
  let tuTruParsed = null;
  try {
    tuTruParsed = tuTruInfo ? JSON.parse(tuTruInfo) : null;
  } catch (e) {
    console.error("Lỗi parse tuTruInfo:", e);
  }

  // Chuyển tuTruParsed sang đoạn mô tả
  const tuTruText = tuTruParsed
    ? `
Thông tin Tứ Trụ:
- Năm: ${tuTruParsed.nam || "chưa rõ hoặc không có"}
- Tháng: ${tuTruParsed.thang || "chưa rõ hoặc không có"}
- Ngày: ${tuTruParsed.ngay || "chưa rõ hoặc không có"}
- Giờ: ${tuTruParsed.gio || "chưa rõ hoặc không có"}
- Cách Cục: ${tuTruParsed.cachCuc || "chưa rõ hoặc không có"}
- Tỷ lệ Ngũ Hành: ${
        tuTruParsed.dungThan?.tyLeNguHanh
          ? Object.entries(tuTruParsed.dungThan.tyLeNguHanh)
              .map(([k, v]) => `${k}: ${v}`)
              .join(", ")
          : "không có"
      }
`
    : "Không có thông tin Tứ Trụ.";

  // Chuyển dungThan sang đoạn mô tả
  const dungThanText = dungThan && typeof dungThan === 'object'
    ? `Dụng Thần: ${Array.isArray(dungThan.hanh) ? dungThan.hanh.join(", ") : dungThan.hanh || "chưa rõ hoặc không có"}
Lý do chọn dụng thần: ${dungThan.lyDo || "không có"}
Cách Cục: ${dungThan.cachCuc || "không có"}`
    : "Chưa có thông tin dụng thần hoặc dữ liệu không hợp lệ.";

  

  let fullPrompt = "";

  if (isRequestBazi) {
    fullPrompt = `
Bạn là chuyên gia luận mệnh Bát Tự với kiến thức sâu sắc về ngũ hành.
Không lặp lại thông tin đã cung cấp và sẽ cung cấp, không dùng dấu * hay ** hoặc # để liệt kê nội dung. Trình bày rõ ràng, chuyên nghiệp.
Tham khảo thông tin Bát Tự và cách cục được cung cấp dưới đây:
${tuTruText}
Và thông tin về Dụng Thần:
${dungThanText}

Phân tích chi tiết các nội dung sau:
1. Lấy nội dung cách cục từ ${dungThan.cachCuc}. Nhắc lại nội dung ${tuTruText} và ${dungThanText} với lời văn hay hơn. Không phân tích Nhật Chủ. Không phân tích lại giờ sinh, ngày sinh, tháng sinh, năm sinh và cách cục. 
2. Dự đoán vận trình chi tiết theo ba giai đoạn: thời thơ ấu, trung niên, hậu vận.
3. Ở cuối, liệt kê gợi ý ứng dụng chi tiết theo ngũ hành dụng thần dưới đây, chỉ áp dụng đúng ngũ hành trong ${dungThanText}, không được liệt kế các ngũ hành bên ngoài ${dungThanText}, viết lại lời văn hay hơn:

1. Mộc:
- Ngành nghề phù hợp: giáo dục, nông nghiệp, trồng trọt, chăn nuôi, thời trang, thợ mộc, đồ gỗ.
- Màu sắc trang phục và phụ kiện: xanh lá cây, nâu đất, vòng gỗ như đàn hương, trầm hương.
- Vật phẩm phong thủy: cây xanh, tranh phong cảnh, vòng tay gỗ.
- Phương hướng ưu tiên: Đông, Đông Nam.

2. Hỏa:
- Ngành nghề phù hợp: kinh doanh, nghệ thuật biểu diễn, ẩm thực, nấu ăn, giải trí.
- Màu sắc trang phục và phụ kiện: đỏ, cam, hồng, tím.
- Vật phẩm phong thủy: nến, đèn đỏ, đá quý màu đỏ.
- Phương hướng ưu tiên: Nam.

3. Thổ:
- Ngành nghề phù hợp: bất động sản, tài chính, chăm sóc sức khỏe, xây dựng.
- Màu sắc trang phục và phụ kiện: vàng đất, nâu, đá phong thủy, vòng đá quý.
- Vật phẩm phong thủy: tượng Phật đá, đá phong thủy.
- Phương hướng ưu tiên: Đông Bắc, Tây Nam, trung cung.

4. Kim:
- Ngành nghề phù hợp: công nghệ, y tế, luật pháp, kỹ thuật, cơ khí.
- Màu sắc trang phục và phụ kiện: trắng, bạc, xám, trang sức kim loại.
- Vật phẩm phong thủy: đồng tiền vàng, vật liệu kim loại.
- Phương hướng ưu tiên: Tây, Tây Bắc.

5. Thủy:
- Ngành nghề phù hợp: truyền thông, tư vấn, vận tải, du lịch, nghệ thuật.
- Màu sắc trang phục và phụ kiện: đen, xanh dương, phụ kiện pha lê, thủy tinh như mắt kính.
- Vật phẩm phong thủy: hồ cá nhỏ, bình thủy tinh.
- Phương hướng ưu tiên: Bắc.

Nguyên lý tương sinh tương khắc ngũ hành chuẩn:
- Tương sinh: Mộc sinh Hỏa, Hỏa sinh Thổ, Thổ sinh Kim, Kim sinh Thủy, Thủy sinh Mộc.
- Tương khắc: Mộc khắc Thổ, Thổ khắc Thủy, Thủy khắc Hỏa, Hỏa khắc Kim, Kim khắc Mộc.

Không lặp lại thông tin đã cung cấp và sẽ cung cấp, không dùng dấu * hay ** hoặc # để liệt kê nội dung. Trình bày rõ ràng, chuyên nghiệp.
Bắt đầu phân tích chi tiết:
`;
  } else if (isAskingYearOrDaiVan) {
    fullPrompt = `
Bạn nhận được câu hỏi về vận hạn năm hoặc đại vận nhưng chưa có đủ thông tin Thiên Can và Địa Chi của năm hoặc đại vận đó.

Ví dụ: Năm 2025 là năm Ất Tỵ, trong đó:
- Thiên Can: Ất (Mộc)
- Địa Chi: Tỵ (Hỏa)

Để phân tích vận hạn chính xác, vui lòng cung cấp đầy đủ thông tin can chi của năm hoặc đại vận bạn quan tâm.

Thông tin ngũ hành của 10 Thiên Can và 12 Địa Chi:
${canChiNguhanhInfo}
Nếu như các ngũ hành đó là dụng thần ở trong thông tin ${dungThanText} thì các năm đó may mắn, còn nếu không phải thì tương đối khó khăn, hãy cho lời văn hay hơn
`;
  } else {
    fullPrompt = `
Bạn là trợ lý thân thiện, trả lời các câu hỏi tự do, dễ hiểu, không bắt buộc theo cấu trúc Bát Tự hay vận hạn nếu không được yêu cầu cụ thể.
`;
  }

  const formattedMessages = messages.map(m => ({
    role: m.role,
    content: m.content,
  }));

  if (
    formattedMessages.length > 0 &&
    formattedMessages[formattedMessages.length - 1].role === "user"
  ) {
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
