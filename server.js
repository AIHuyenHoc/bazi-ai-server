app.post("/api/luan-giai-bazi", async (req, res) => {
  const { messages, tuTruInfo, dungThan, isFortuneQuestion } = req.body;

  const lastUserMsg = messages
    .slice()
    .reverse()
    .find((m) => m.role === "user");
  const userInput = lastUserMsg ? lastUserMsg.content.trim() : "";

  let fullPrompt = "";

  if (isFortuneQuestion) {
    // Kiểm tra nếu người dùng chỉ hỏi về năm hoặc đại vận mà không có đầy đủ thông tin
    const hasYearCanChi = /(giáp|ất|bính|đinh|mậu|kỷ|canh|tân|nhâm|quý)\s*(tý|sửu|dần|mão|thìn|tỵ|ngọ|mùi|thân|dậu|tuất|hợi)/i.test(userInput);
    
    if (!hasYearCanChi) {
      fullPrompt = `
Bạn hỏi về vận hạn năm hoặc đại vận nhưng chưa cung cấp đủ thông tin can chi (Thiên Can + Địa Chi) của năm đó.
Ví dụ: Năm 2025 là năm Ất Tỵ.
Vui lòng cung cấp đầy đủ can chi năm hoặc đại vận bạn muốn hỏi để tôi phân tích chính xác dựa trên:

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

Khi bạn cung cấp đủ thông tin, tôi sẽ phân tích vận hạn, cơ hội và thách thức trong năm đó chi tiết và đưa ra lời khuyên cụ thể.
`;
    } else {
      fullPrompt = `
Dựa trên Bát Tự của bạn: 
${tuTruInfo || "Chưa có thông tin Bát Tự cụ thể."} 
Dụng Thần: ${dungThan || "Chưa xác định"}

Phân tích vận hạn năm bạn hỏi:
1. Đánh giá sự tương sinh tương khắc giữa ngũ hành năm và dụng thần.
2. Nhận định vận khí, cơ hội và thách thức chính trong năm đó.
3. Đưa ra lời khuyên cụ thể về ngành nghề, màu sắc và phương hướng phù hợp với Dụng Thần.

Giải thích chi tiết vì sao các yếu tố này sẽ giúp tăng cường vận khí và hóa giải khó khăn.
`;
    }
  } else if (isBirthInfoQuestion) {
    fullPrompt = `
Bạn là chuyên gia luận mệnh Bát Tự với kiến thức chính xác về Ngũ Hành, Cách Cục và Dụng Thần.

Thông tin Bát Tự: ${tuTruInfo || "Chưa có thông tin Bát Tự cụ thể."}
Dụng Thần: ${dungThan || "Chưa xác định"}

Hãy phân tích lá số Bát Tự theo các mục:

1. Nhắc lại cách cục và dụng thần một cách chính xác và rõ ràng.

2. Phân tích ngũ hành toàn cục:
- Đánh giá sự vượng suy của Kim, Mộc, Thủy, Hỏa, Thổ.
- Giải thích nguyên lý tương sinh tương khắc ảnh hưởng thế nào đến Nhật Chủ.

3. Phân tích tính cách và vận trình:
- Phân tích điểm mạnh, điểm yếu và tính cách nổi bật.
- Dự đoán vận trình cuộc đời theo ba giai đoạn: thời thơ ấu, trung niên, hậu vận.
- Nêu rõ thách thức và cơ hội chính trong từng giai đoạn.

4. Gợi ý ứng dụng chi tiết theo dụng thần:
- Ngành nghề phù hợp từng hành:
  + Kim: công nghệ, y tế, luật pháp, trang sức, công nghiệp kim loại.
  + Mộc: nông nghiệp, giáo dục, thời trang, nghề mộc, nghệ thuật, y dược thảo dược.
  + Thủy: vận tải thủy, thủy sản, truyền thông, tư vấn, nghệ thuật, tâm linh.
  + Hỏa: kinh doanh, quảng cáo, điện tử, nghệ thuật biểu diễn, ẩm thực, thể thao.
  + Thổ: xây dựng, bất động sản, tài chính, bảo hiểm, chăm sóc sức khỏe, giáo dục.

- Màu sắc trang phục và phụ kiện phong thủy:
  + Kim: trắng, bạc, xám; trang sức kim loại như vàng, bạc.
  + Mộc: xanh lá, nâu đất, vàng gỗ; vòng tay gỗ đàn hương, trầm hương.
  + Thủy: đen, xanh dương; pha lê, đá mắt mèo, kính mắt.
  + Hỏa: đỏ, cam, hồng, tím; đá ruby, thạch anh hồng.
  + Thổ: vàng đất, nâu, cam đất; đá thạch anh vàng, hổ phách.

- Phương hướng nhà hoặc nơi làm việc nên ưu tiên:
  + Kim: Tây, Tây Bắc.
  + Mộc: Đông, Đông Nam.
  + Thủy: Bắc.
  + Hỏa: Nam.
  + Thổ: Đông Bắc, Tây Nam, trung cung.

Giải thích vì sao các gợi ý trên sẽ giúp tăng cường sức khỏe, vận khí và sự nghiệp.
`;
  } else {
    fullPrompt = `
Đây là câu trả lời tự do, linh hoạt cho câu hỏi của bạn.
Nếu câu hỏi không liên quan đến Bát Tự, ngày giờ sinh hoặc vận hạn năm, hãy trả lời dễ hiểu, thân thiện và không nhắc lại các thông tin mệnh lý chuyên sâu.
`;
  }

  // Thay thế nội dung tin nhắn user cuối cùng bằng fullPrompt
  const formattedMessages = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

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
