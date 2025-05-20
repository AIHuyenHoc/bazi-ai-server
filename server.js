app.post("/api/luan-giai-bazi", async (req, res) => {
  const { messages } = req.body;

  const lastUserIndex = messages.findLastIndex((m) => m.role === "user");
  const userInput = lastUserIndex !== -1 ? messages[lastUserIndex].content : "";

  cconst autoPrompt = `Đầu tiên là xác định Nhật Chủ là gì, sinh tháng nào, vượng hay nhược. Phân tích ngắn gọn ngũ hành toàn cục để biết hành nào thịnh, hành nào suy. Từ đó xác định Dụng Thần là gì (ví dụ: Thủy, Mộc…).
Sau đó đưa ra gợi ý sơ bộ về tính cách nổi bật, ngành nghề phù hợp, màu sắc nên dùng. Viết ngắn gọn, đúng trọng tâm.
Không được kết thúc bằng các câu chung chung như “chúc bạn thành công”, “chúc bạn may mắn”… Hãy kết thúc bằng một lời nhắc mệnh lý súc tích (ví dụ: “Thuận thiên, thuận thời, vận sẽ tự đến.”)`;

  const fullPrompt = `${autoPrompt}\n\n${userInput}`;

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
