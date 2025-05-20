app.post("/api/luan-giai-bazi", async (req, res) => {
  const { messages } = req.body;

  const lastUserIndex = messages.findLastIndex((m) => m.role === "user");
  const userInput = lastUserIndex !== -1 ? messages[lastUserIndex].content : "";

  const autoPrompt = `
Hãy phân tích lá số Bát Tự dưới đây **theo đúng phương pháp truyền thống**, tuyệt đối **không phân tích riêng lẻ từng trụ (năm, tháng, ngày, giờ)**.

Yêu cầu bắt buộc:
1. Xác định Nhật Chủ là gì, sinh tháng nào, vượng hay nhược.
2. Phân tích ngũ hành toàn cục: Kim – Mộc – Thủy – Hỏa – Thổ vượng suy ra sao?
3. Chỉ rõ Dụng Thần, Hỷ Thần và Kỵ Thần theo toàn cục lá số.
4. Phân tích đặc điểm nổi bật về tính cách, khí chất, khả năng và điểm mạnh yếu.
5. Dự đoán sơ lược vận trình theo từng giai đoạn: thơ ấu, trung niên, hậu vận.
6. Gợi ý ngành nghề phù hợp, màu sắc – phương hướng nên dùng để tăng cường Dụng Thần.
7. Viết theo văn phong của một thầy mệnh lý Đông phương, súc tích, chính xác, rõ ràng từng mục.

Chỉ phân tích đúng trọng tâm mệnh lý, **không được giải thích kiểu “Tân Tỵ là linh hoạt”, “Kỷ Dậu là chăm chỉ”**. Hãy đi thẳng vào cốt lõi của Bát Tự: nhật chủ – vượng suy – dụng thần – vận trình.
`;

  const fullPrompt = `${userInput}\n\n${autoPrompt}`;

  const formattedMessages = [
    {
      role: "user",
      content: fullPrompt,
    },
  ];

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
