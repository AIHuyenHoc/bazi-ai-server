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

  const isRequestBazi =
    userInput.includes("xem bát tự") ||
    userInput.includes("luận bát tự") ||
    userInput.includes("bát tự cho mình") ||
    userInput.includes("xem lá số");

  // Phân loại trường hợp hỏi vận hạn năm hoặc đại vận
  const isAskingYearOrDaiVan =
    /(năm\s*\d{4}|năm\s*\w+|đại vận|vận hạn|vận mệnh|năm tới|năm sau|vận trong năm)/.test(userInput) &&
    !isRequestBazi;

  // Template chứa ngũ hành can chi 10 Thiên Can và 12 Địa Chi
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
    fullPrompt = `
Bạn là chuyên gia luận mệnh Bát Tự với kiến thức chuẩn xác về ngũ hành, dụng thần và nguyên tắc luận Nhật Chủ mạnh yếu và cách cục.

Thông tin ẩn về Bát Tự và cách cục người dùng cung cấp:
{tuTruInfo}

Dụng Thần được xác định là: {dungThan}

Phân tích chi tiết theo các nội dung sau:

Tính cách nổi bật, điểm mạnh và điểm yếu của người này dựa trên Bát Tự và cách cục.

Dự đoán vận trình cuộc đời chi tiết theo ba giai đoạn: thời thơ ấu, trung niên, hậu vận. Phân tích rõ cơ hội và thách thức của từng giai đoạn.

Gợi ý ứng dụng chi tiết theo từng hành trong ngũ hành dựa trên dụng thần và cách cục:

Ngành nghề phù hợp ứng dụng theo từng hành:

Mộc: Trồng trọt, chăn nuôi, giáo dục, thời trang, may mặc, thợ mộc, nghệ thuật, chế tác đồ gỗ.

Hỏa: Kinh doanh, nghệ thuật biểu diễn, ẩm thực, điện tử, kỹ thuật, công nghệ năng lượng, quảng cáo, tiếp thị.

Thổ: Bất động sản, xây dựng, tài chính ngân hàng, chăm sóc sức khỏe, dịch vụ, giáo dục đào tạo, khai thác khoáng sản.

Kim: Công nghệ, y tế, luật pháp, tài chính, ngân hàng, trang sức, công nghiệp chế tạo, kỹ thuật.

Thủy: Vận tải, thủy sản, truyền thông, nghệ thuật, tư vấn, thương mại điện tử, dịch vụ giải trí, du lịch, dịch vụ khách sạn.

Màu sắc trang phục và phụ kiện:

Mộc: Xanh lá cây, nâu đất, vàng gỗ; phụ kiện bằng gỗ, vòng tay trầm hương, vòng tay gỗ đàn hương.

Hỏa: Đỏ, cam, hồng, tím; trang sức đá quý màu đỏ hoặc hồng, phụ kiện năng lượng mạnh.

Thổ: Vàng đất, nâu; trang sức đá quý thạch anh vàng, mã não, ngọc bích.

Kim: Trắng, bạc, xám; trang sức kim loại, đồng hồ kim loại, vòng tay bạc.

Thủy: Đen, xanh dương; phụ kiện pha lê, kính mắt, đá mắt hổ, vòng tay đá thủy tinh.

Vật phẩm phong thủy tăng cường vận khí:

Mộc: Cây xanh, tượng gỗ, tranh phong cảnh thiên nhiên, chuông gió gỗ.

Hỏa: Nến, đèn, tranh lửa, tượng rồng, vật dụng ánh sáng rực rỡ.

Thổ: Đá thạch anh, bình đất nung, tượng đất, bình gốm, đá mã não.

Kim: Đồ trang trí kim loại, chuông gió kim loại, đồng tiền cổ, tượng kim loại.

Thủy: Hồ cá, nước chảy, bể cá cảnh, vật phẩm thủy tinh, tranh nước.

Phương hướng nhà hoặc nơi làm việc ưu tiên:

Mộc: Hướng Đông và Đông Nam.

Hỏa: Hướng Nam.

Thổ: Hướng Đông Bắc, Tây Nam và trung cung.

Kim: Hướng Tây và Tây Bắc.

Thủy: Hướng Bắc.

Nguyên lý tương sinh tương khắc của ngũ hành chuẩn:
Mộc sinh Hỏa, Hỏa sinh Thổ, Thổ sinh Kim, Kim sinh Thủy, Thủy sinh Mộc.
Mộc khắc Thổ, Thổ khắc Thủy, Thủy khắc Hỏa, Hỏa khắc Kim, Kim khắc Mộc.

Không lặp lại thông tin đã có trong dữ liệu đầu vào.
Trả lời văn phong chuyên nghiệp, rõ ràng, không dùng các ký hiệu * hay #.
Câu trả lời nên có chiều sâu, chi tiết, dễ hiểu và hữu ích cho người dùng.

Bắt đầu phân tích chi tiết ngay sau đây:
`;
  } else if (isAskingYearOrDaiVan) {
    fullPrompt = `
Bạn nhận được câu hỏi về vận hạn năm hoặc đại vận nhưng chưa có đủ thông tin Thiên Can và Địa Chi của năm hoặc đại vận đó.

Ví dụ: Năm 2025 là năm Ất Tỵ, trong đó:
- Thiên Can: Ất (Mộc)
- Địa Chi: Tỵ (Hỏa)

Để phân tích vận hạn chính xác, vui lòng cung cấp thông tin can chi năm hoặc đại vận bạn quan tâm.

${canChiNguhanhInfo}

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
