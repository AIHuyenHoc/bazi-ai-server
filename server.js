app.post("/api/luan-giai-bazi", async (req, res) => {
  const { messages } = req.body;

  const lastUserIndex = messages.findLastIndex((m) => m.role === "user");
  const userInput = lastUserIndex !== -1 ? messages[lastUserIndex].content : "";

  cconst autoPrompt = `
Trước đó là thông tin Bát Tự của tôi, bạn là một bậc thầy Bát Tự nên hãy thực hiện hai việc sau:

1. Xác định Nhật Chủ là gì, sinh tháng nào, vượng hay nhược. Phân tích ngắn gọn ngũ hành toàn cục để biết hành nào thịnh, hành nào suy. Từ đó xác định Dụng Thần là gì (ví dụ: Thủy, Mộc…).

2. Dựa trên Dụng Thần và ngũ hành, đưa ra gợi ý sơ bộ về tính cách nổi bật, ngành nghề phù hợp, màu sắc nên dùng. Viết ngắn gọn, đúng trọng tâm.

Không được phân tích riêng từng trụ, cũng không cần viết văn phong khái quát hay cổ vũ sáo rỗng.

Chỉ tập trung vào mệnh lý: nhật chủ, vượng nhược, Dụng Thần, gợi ý ứng dụng thực tế.
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
