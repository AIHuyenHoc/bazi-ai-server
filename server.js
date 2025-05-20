app.post("/api/luan-giai-bazi", async (req, res) => {
  const { messages } = req.body;

  const lastUserIndex = messages.findLastIndex((m) => m.role === "user");
  const userInput = lastUserIndex !== -1 ? messages[lastUserIndex].content : "";

  const autoPrompt = `Bạn là một thầy luận mệnh Bát Tự chuyên sâu. 
Hãy phân tích một lá số Bát Tự theo đúng phương pháp cổ truyền với 2 nhiệm vụ:

1. Xác định Nhật Chủ là gì, sinh tháng nào, vượng hay nhược. Phân tích ngũ hành toàn cục, sau đó đưa ra Dụng Thần (và Hỷ/Kỵ Thần nếu có).

2. Gợi ý sơ bộ tính cách, ngành nghề, màu sắc, phương hướng phù hợp với Dụng Thần.

❌ Không được phân tích riêng từng trụ (như “Canh Tý là thông minh…”).
❌ Không được kết thúc bằng các câu sáo rỗng như “chúc bạn thành công”.
✅ Kết thúc bằng một lời nhắc mệnh lý sâu sắc (ví dụ: “Thuận thiên, thuận thời, vận sẽ tự đến.”).`;

  const formattedMessages = [
    {
      role: "system",
      content: autoPrompt,
    },
    {
      role: "user",
      content: userInput,
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
