const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint cho Render
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

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

const hoaGiap = [
  "Giáp Tý", "Ất Sửu", "Bính Dần", "Đinh Mão", "Mậu Thìn", "Kỷ Tỵ", "Canh Ngọ", "Tân Mùi", "Nhâm Thân", "Quý Dậu",
  "Giáp Tuất", "Ất Hợi", "Bính Tý", "Đinh Sửu", "Mậu Dần", "Kỷ Mão", "Canh Thìn", "Tân Tỵ", "Nhâm Ngọ", "Quý Mùi",
  "Giáp Thân", "Ất Dậu", "Bính Tuất", "Đinh Hợi", "Mậu Tý", "Kỷ Sửu", "Canh Dần", "Tân Mão", "Nhâm Thìn", "Quý Tỵ",
  "Giáp Ngọ", "Ất Mùi", "Bính Thân", "Đinh Dậu", "Mậu Tuất", "Kỷ Hợi", "Canh Tý", "Tân Sửu", "Nhâm Dần", "Quý Mão",
  "Giáp Thìn", "Ất Tỵ", "Bính Ngọ", "Đinh Mùi", "Mậu Thân", "Kỷ Dậu", "Canh Tuất", "Tân Hợi", "Nhâm Tý", "Quý Sửu",
  "Giáp Dần", "Ất Mão", "Bính Thìn", "Đinh Tỵ", "Mậu Ngọ", "Kỷ Mùi", "Canh Thân", "Tân Dậu", "Nhâm Tuất", "Quý Hợi"
];

const getCanChiForYear = (year) => {
  const baseYear = 1984; // Mốc Giáp Tý
  const index = (year - baseYear) % 60;
  const adjustedIndex = index < 0 ? index + 60 : index;
  return hoaGiap[adjustedIndex] || "Không xác định";
};

const analyzeNguHanh = (tuTru) => {
  const nguHanhCount = { Mộc: 0, Hỏa: 0, Thổ: 0, Kim: 0, Thủy: 0 };
  
  const canNguHanh = {
    Giáp: "Mộc", Ất: "Mộc", Bính: "Hỏa", Đinh: "Hỏa", Mậu: "Thổ",
    Kỷ: "Thổ", Canh: "Kim", Tân: "Kim", Nhâm: "Thủy", Quý: "Thủy"
  };
  
  const chiNguHanh = {
    Tý: "Thủy", Hợi: "Thủy", Sửu: "Thổ", Thìn: "Thổ", Mùi: "Thổ", Tuất: "Thổ",
    Dần: "Mộc", Mão: "Mộc", Tỵ: "Hỏa", Ngọ: "Hỏa", Thân: "Kim", Dậu: "Kim"
  };

  if (tuTru.nam) nguHanhCount[canNguHanh[tuTru.nam.split(" ")[0]]] += 1;
  if (tuTru.nam) nguHanhCount[chiNguHanh[tuTru.nam.split(" ")[1]]] += 1;
  if (tuTru.thang) nguHanhCount[canNguHanh[tuTru.thang.split(" ")[0]]] += 1;
  if (tuTru.thang) nguHanhCount[chiNguHanh[tuTru.thang.split(" ")[1]]] += 1;
  if (tuTru.ngay) nguHanhCount[canNguHanh[tuTru.ngay.split(" ")[0]]] += 1;
  if (tuTru.ngay) nguHanhCount[chiNguHanh[tuTru.ngay.split(" ")[1]]] += 1;
  if (tuTru.gio) nguHanhCount[canNguHanh[tuTru.gio.split(" ")[0]]] += 1;
  if (tuTru.gio) nguHanhCount[chiNguHanh[tuTru.gio.split(" ")[1]]] += 1;

  return nguHanhCount;
};

app.post("/api/luan-giai-bazi", async (req, res) => {
  const { messages, tuTruInfo, dungThan } = req.body;

  // Kiểm tra biến môi trường
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set');
    return res.status(500).json({ error: "Cấu hình API không hợp lệ" });
  }

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

  let tuTruParsed = null;
  try {
    tuTruParsed = tuTruInfo ? JSON.parse(tuTruInfo) : null;
  } catch (e) {
    console.error("Lỗi parse tuTruInfo:", e);
    return res.status(400).json({ error: "Dữ liệu Tứ Trụ không hợp lệ" });
  }

  if (!tuTruParsed || !tuTruParsed.nam || !tuTruParsed.thang || !tuTruParsed.ngay || !tuTruParsed.gio) {
    return res.status(400).json({ error: "Vui lòng cung cấp đầy đủ thông tin Tứ Trụ (năm, tháng, ngày, giờ)" });
  }

  const nguHanhCount = analyzeNguHanh(tuTruParsed);
  const totalElements = Object.values(nguHanhCount).reduce((a, b) => a + b, 0);
  const tyLeNguHanh = Object.fromEntries(
    Object.entries(nguHanhCount).map(([k, v]) => [k, `${((v / totalElements) * 100).toFixed(2)}%`])
  );

  const tuTruText = `
Thông tin Tứ Trụ:
- Năm: ${tuTruParsed.nam || "chưa rõ"}
- Tháng: ${tuTruParsed.thang || "chưa rõ"}
- Ngày: ${tuTruParsed.ngay || "chưa rõ"}
- Giờ: ${tuTruParsed.gio || "chưa rõ"}
- Tỷ lệ Ngũ Hành: ${Object.entries(tyLeNguHanh).map(([k, v]) => `${k}: ${v}`).join(", ")}
`;

  const dungThanText = dungThan && typeof dungThan === 'object'
    ? `Dụng Thần: ${Array.isArray(dungThan.hanh) ? dungThan.hanh.join(", ") : dungThan.hanh || "Mộc, Thủy"}
Lý do chọn dụng thần: ${dungThan.lyDo || "Vì Thân Vượng nên cần tiết khí bằng hành thân khắc (Mộc), hành tiết khí (Thủy)."}
Cách Cục: ${dungThan.cachCuc || "Thân Vượng"}
Lý do cách cục: Nhật Chủ Tân Kim mạnh, được tháng Dậu và Thổ (Kỷ, Sửu) hỗ trợ, tạo thành Thân Vượng.`
    : `Dụng Thần: Mộc, Thủy
Lý do chọn dụng thần: Vì Thân Vượng nên cần tiết khí bằng hành thân khắc (Mộc), hành tiết khí (Thủy).
Cách Cục: Thân Vượng
Lý do cách cục: Nhật Chủ Tân Kim mạnh, được tháng Dậu và Thổ (Kỷ, Sửu) hỗ trợ, tạo thành Thân Vượng.`;

  const yearMatch = userInput.match(/năm\s*(\d{4})/);
  let year = yearMatch ? parseInt(yearMatch[1]) : (userInput.includes("năm tới") || userInput.includes("năm sau")) ? new Date().getFullYear() + 1 : new Date().getFullYear();
  const yearCanChi = year ? getCanChiForYear(year) : null;
  const canNguHanh = {
    Giáp: "Mộc", Ất: "Mộc", Bính: "Hỏa", Đinh: "Hỏa", Mậu: "Thổ",
    Kỷ: "Thổ", Canh: "Kim", Tân: "Kim", Nhâm: "Thủy", Quý: "Thủy"
  };
  const chiNguHanh = {
    Tý: "Thủy", Hợi: "Thủy", Sửu: "Thổ", Thìn: "Thổ", Mùi: "Thổ", Tuất: "Thổ",
    Dần: "Mộc", Mão: "Mộc", Tỵ: "Hỏa", Ngọ: "Hỏa", Thân: "Kim", Dậu: "Kim"
  };

  let yearNguHanh = "";
  if (yearCanChi) {
    const [can, chi] = yearCanChi.split(" ");
    yearNguHanh = `${can} (${canNguHanh[can] || "chưa rõ"}), ${chi} (${chiNguHanh[chi] || "chưa rõ"})`;
  }

  let fullPrompt = "";

  if (isRequestBazi) {
    fullPrompt = `
Bạn là chuyên gia luận mệnh Bát Tự với kiến thức sâu sắc về ngũ hành, am hiểu văn hóa Việt Nam và cách diễn đạt tinh tế. Trả lời bằng tiếng Việt, trình bày rõ ràng, mạch lạc, chuyên nghiệp, không dùng dấu * hay ** hoặc # để liệt kê nội dung. Diễn đạt bằng lời văn sâu sắc, dễ hiểu, tránh thuật ngữ quá phức tạp để phù hợp với người mới sử dụng. Sử dụng đúng thông tin Tứ Trụ và Dụng Thần được cung cấp, không nhầm lẫn với dữ liệu từ các yêu cầu trước. Nếu người dùng hỏi câu hỏi khác (ví dụ: về đại vận, nghề nghiệp, năm cụ thể, hoặc quyết định cá nhân), trả lời ngay lập tức, cá nhân hóa dựa trên Tứ Trụ và Dụng Thần, đồng thời tích hợp bối cảnh ngũ hành.

Thông tin tham khảo:
${tuTruText}
${dungThanText}
${canChiNguhanhInfo}

Năm hiện tại: ${year} (${yearCanChi}, ngũ hành: ${yearNguHanh})

Hướng dẫn phân tích Bát Tự:
1. Phân tích chi tiết Tứ Trụ (giờ: ${tuTruParsed.gio}, ngày: ${tuTruParsed.ngay}, tháng: ${tuTruParsed.thang}, năm: ${tuTruParsed.nam}), diễn đạt bằng lời văn tinh tế, giải thích vai trò của từng ngũ hành:
   - Kim (Canh Tý, Tân Tỵ, Kỷ Dậu, 37.5%): Thể hiện sự sắc bén, quyết đoán, ảnh hưởng đến tư duy và hành động.
   - Thổ (Kỷ Dậu, Đinh Sửu, 25%): Mang lại sự ổn định, bền vững, sinh Kim để củng cố Nhật Chủ.
   - Hỏa (Đinh Sửu, Tân Tỵ, 25%): Tạo thử thách bằng cách khắc Kim, nhưng yếu do thiếu Mộc sinh Hỏa.
   - Thủy (Canh Tý, 12.5%): Hao tiết Kim, giúp điều tiết năng lượng, hỗ trợ Dụng Thần.
   - Mộc (0%): Vắng mặt, giảm tính sáng tạo và linh hoạt, cần bổ sung qua Dụng Thần.
   Giải thích Thân Vượng dựa trên Kim mạnh, tháng Dậu hỗ trợ, Thổ sinh Kim, và Thủy hao tiết.
2. Dự đoán vận trình qua ba giai đoạn (thời thơ ấu, trung niên, hậu vận), tập trung vào:
   - Vai trò tiết khí của Mộc (sáng tạo, đổi mới) và Thủy (giao tiếp, lưu thông).
   - Thế mạnh của Kim (quyết đoán, chính xác) và Thổ (ổn định, bền vững).
   - Tác động của Hỏa (thử thách) và sự vắng mặt của Mộc (thiếu linh hoạt).
3. Đưa ra gợi ý ứng dụng theo Dụng Thần (Mộc, Thủy), giải thích tại sao phù hợp với Thân Vượng:
   - Ngành nghề: Giáo dục, nghệ thuật, thiết kế, xuất bản (Mộc); truyền thông, marketing, logistics, du lịch (Thủy).
   - Màu sắc: Xanh lá, xanh ngọc (Mộc); xanh dương, đen, xám (Thủy).
   - Vật phẩm phong thủy: Cây xanh, đồ gỗ, đá thạch anh xanh (Mộc); bể cá, đài phun nước, đá xanh dương (Thủy).
   - Phương hướng: Đông, Đông Nam (Mộc); Bắc (Thủy).
   - Lưu ý: Sử dụng Mộc và Thủy tiết chế (cây nhỏ, màu nhạt, vật phẩm nhỏ) vì Mộc vắng mặt và Thủy chỉ chiếm 12.5%.
4. Phân tích vận trình năm hiện tại (${yearCanChi}, ${yearNguHanh}):
   - Đánh giá tác động của ngũ hành năm (ví dụ: Mộc hỗ trợ Dụng Thần, Hỏa khắc Kim).
   - Đề xuất cách hóa giải: Tăng cường Mộc (cây xanh) và Thủy (bể cá) để cân bằng, tránh Hỏa mạnh (màu đỏ, ánh sáng mạnh).
5. Nếu người dùng hỏi câu hỏi khác (ví dụ: đại vận, nghề nghiệp, năm cụ thể, khởi nghiệp, quyết định cá nhân):
   - Phân tích câu hỏi, xác định ngũ hành liên quan (ví dụ: khởi nghiệp - Mộc, Thủy; tài chính - Thổ, Kim).
   - So sánh với Tứ Trụ và Dụng Thần (Mộc, Thủy), đánh giá tương sinh/tương khắc.
   - Đưa ra lời khuyên cụ thể, cá nhân hóa, kèm gợi ý ngành nghề, màu sắc, vật phẩm, phương hướng phù hợp.
   - Nếu hỏi về năm cụ thể, xác định can chi và ngũ hành của năm, phân tích tương tác với Tứ Trụ, dự đoán vận hạn, và đề xuất hóa giải.
   - Nếu hỏi về đại vận, sử dụng logic đại vận (tuổi nhập vận, thuận/nghịch) để xác định giai đoạn, phân tích can chi đại vận, và liên kết với Dụng Thần.

Nguyên lý tương sinh tương khắc ngũ hành:
- Tương sinh: Mộc sinh Hỏa, Hỏa sinh Thổ, Thổ sinh Kim, Kim sinh Thủy, Thủy sinh Mộc.
- Tương khắc: Mộc khắc Thổ, Thổ khắc Thủy, Thủy khắc Hỏa, Hỏa khắc Kim, Kim khắc Mộc.

Ví dụ lời văn tinh tế:
- Phân tích Bát Tự: "Lá số của bạn mang Nhật Chủ Tân Kim, sinh vào tháng Dậu, thời điểm Kim vượng. Kim từ Canh Tý, Tân Tỵ, và Dậu tạo sự sắc bén, quyết đoán. Thổ từ Kỷ Dậu và Sửu mang lại ổn định, sinh Kim để củng cố. Hỏa từ Đinh và Tỵ tạo thử thách nhưng không mạnh do thiếu Mộc. Thủy từ Tý điều tiết năng lượng, cùng Mộc cần bổ sung, giúp lá số linh hoạt hơn."
- Trả lời câu hỏi nghề nghiệp: "Khởi nghiệp đòi hỏi sáng tạo (Mộc) và giao tiếp (Thủy), rất phù hợp với Dụng Thần của bạn. Nên chọn ngành thiết kế hoặc marketing, sử dụng cây xanh và bể cá để tăng may mắn."

Bắt đầu phân tích Bát Tự và sẵn sàng trả lời câu hỏi khác:
`;
  } else if (isAskingYearOrDaiVan) {
    fullPrompt = `
Bạn là chuyên gia luận mệnh Bát Tự với kiến thức sâu sắc về ngũ hành, am hiểu văn hóa Việt Nam và cách diễn đạt tinh tế. Trả lời bằng tiếng Việt, rõ ràng, chuyên nghiệp, không dùng dấu * hay ** hoặc # để liệt kê nội dung. Người dùng hỏi về vận hạn năm ${year ? year : "hoặc đại vận cụ thể"}, cần phân tích dựa trên Tứ Trụ, Dụng Thần, và can chi chính xác của năm được hỏi. Diễn đạt dễ hiểu, tránh thuật ngữ phức tạp để phù hợp với người mới sử dụng.

Thông tin tham khảo:
${tuTruText}
${dungThanText}
${canChiNguhanhInfo}

Năm được hỏi: ${year ? `${year} (${yearCanChi}, ngũ hành: ${yearNguHanh})` : "Chưa rõ năm cụ thể, vui lòng cung cấp năm (ví dụ: 2025)"}

Hướng dẫn phân tích:
1. Xác định chính xác can chi và ngũ hành của năm được hỏi (${yearCanChi ? `${yearCanChi} (${yearNguHanh})` : "chưa rõ, yêu cầu người dùng cung cấp"}). Nếu năm không rõ, yêu cầu người dùng cung cấp năm cụ thể.
2. Phân tích tương tác giữa ngũ hành của năm (${yearNguHanh || "chưa rõ"}) và Tứ Trụ (Kim mạnh từ Canh Tý, Tân Tỵ, Kỷ Dậu; Thổ từ Kỷ Dậu, Đinh Sửu; Hỏa từ Đinh Sửu, Tân Tỵ; Thủy từ Canh Tý; không có Mộc), tập trung vào Nhật Chủ Tân Kim và Dụng Thần (Mộc, Thủy). Giải thích cụ thể sự tương sinh/tương khắc (ví dụ: Mộc hỗ trợ Dụng Thần, Hỏa khắc Kim, Thủy hao tiết Kim).
3. Dự đoán vận hạn năm: Nếu ngũ hành của năm thuộc Mộc hoặc Thủy, dự báo thuận lợi và giải thích tại sao. If khác (ví dụ: Hỏa khắc Kim), dự báo khó khăn và đề xuất cách hóa giải bằng vật phẩm/màu sắc thuộc Mộc (cây xanh, màu xanh lá) hoặc Thủy (bể cá, màu xanh dương). Liên kết với Thân Vượng để cá nhân hóa dự đoán.
4. Diễn đạt bằng lời văn tinh tế, cá nhân hóa, không lặp lại nguyên văn thông tin Tứ Trụ hoặc Dụng Thần.
5. Nếu người dùng hỏi về đại vận, sử dụng logic đại vận (tuổi nhập vận, thuận/nghịch) để xác định giai đoạn, phân tích can chi đại vận, và liên kết với Dụng Thần.

Ví dụ phân tích: "Năm 2025 (Ất Tỵ, Mộc-Hỏa) mang cơ hội nhờ Mộc hỗ trợ Dụng Thần, nhưng Hỏa khắc Kim gây áp lực. Sử dụng cây xanh (Mộc) và bể cá (Thủy) để tăng cường may mắn và cân bằng năng lượng."
Bắt đầu phân tích:
`;
  } else {
    fullPrompt = `
Bạn là chuyên gia mệnh lý và tư vấn nghề nghiệp với kiến thức sâu sắc về ngũ hành và Bát Tự, am hiểu văn hóa Việt Nam. Trả lời bằng tiếng Việt, rõ ràng, chuyên nghiệp, không dùng dấu * hay ** hoặc # để liệt kê nội dung. Người dùng hỏi một câu hỏi tự do: "${userInput}". Hãy trả lời chi tiết, tinh tế, và cá nhân hóa, sử dụng thông tin Tứ Trụ và Dụng Thần để đưa ra gợi ý phù hợp nếu câu hỏi liên quan đến nghề nghiệp, khởi nghiệp, hoặc quyết định quan trọng. Diễn đạt dễ hiểu, tránh thuật ngữ phức tạp để phù hợp với người mới sử dụng.

Thông tin tham khảo:
${tuTruText}
${dungThanText}
${canChiNguhanhInfo}

Năm hiện tại: ${year} (${yearCanChi}, ngũ hành: ${yearNguHanh})

Nguyên lý tương sinh tương khắc ngũ hành:
- Tương sinh: Mộc sinh Hỏa, Hỏa sinh Thổ, Thổ sinh Kim, Kim sinh Thủy, Thủy sinh Mộc.
- Tương khắc: Mộc khắc Thổ, Thổ khắc Thủy, Thủy khắc Hỏa, Hỏa khắc Kim, Kim khắc Mộc.

Hướng dẫn trả lời:
1. Phân tích câu hỏi "${userInput}" và xác định ngũ hành liên quan (ví dụ: khởi nghiệp liên quan đến Mộc - sáng tạo, Thủy - giao tiếp).
2. So sánh ngũ hành của câu hỏi với Tứ Trụ (Kim mạnh từ Canh Tý, Tân Tỵ, Kỷ Dậu; Thổ từ Kỷ Dậu, Đinh Sửu; Hỏa từ Đinh Sửu, Tân Tỵ; Thủy từ Canh Tý; không có Mộc) và Dụng Thần (Mộc, Thủy). Đánh giá sự phù hợp, xem xét Hỏa khắc Kim, Thổ sinh Kim, Thủy hao tiết Kim, và sự vắng mặt của Mộc.
3. Xem xét bối cảnh năm hiện tại (${yearCanChi}, ${yearNguHanh}) để đánh giá tính khả thi của quyết định.
4. Đưa ra lời khuyên cụ thể, giải thích lý do dựa trên ngũ hành và đặc điểm lá số. Đề xuất ngành nghề (nếu liên quan), màu sắc, vật phẩm phong thủy (Mộc: cây xanh; Thủy: bể cá), và phương hướng (Đông, Đông Nam, Bắc) phù hợp với Dụng Thần.
5. Nếu câu hỏi không liên quan trực tiếp đến ngũ hành, trả lời thực tế, thân thiện, nhưng vẫn tham khảo Tứ Trụ/Dụng Thần để cá nhân hóa nếu phù hợp.

Ví dụ trả lời: "Khởi nghiệp đòi hỏi sáng tạo (Mộc) và giao tiếp (Thủy), phù hợp với Dụng Thần của bạn. Với Thân Vượng, nên chọn ngành thiết kế hoặc marketing, sử dụng cây xanh và bể cá để tăng cường may mắn."
Bắt đầu trả lời:
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
        temperature: 0.5,
        max_tokens: 2000,
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
const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
server.setTimeout(120000); // Tăng timeout server lên 120 giây
