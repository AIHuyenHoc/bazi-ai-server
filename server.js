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

  try {
    if (tuTru.nam) {
      nguHanhCount[canNguHanh[tuTru.nam.split(" ")[0]]] += 1;
      nguHanhCount[chiNguHanh[tuTru.nam.split(" ")[1]]] += 1;
    }
    if (tuTru.thang) {
      nguHanhCount[canNguHanh[tuTru.thang.split(" ")[0]]] += 1;
      nguHanhCount[chiNguHanh[tuTru.thang.split(" ")[1]]] += 1;
    }
    if (tuTru.ngay) {
      nguHanhCount[canNguHanh[tuTru.ngay.split(" ")[0]]] += 1;
      nguHanhCount[chiNguHanh[tuTru.ngay.split(" ")[1]]] += 1;
    }
    if (tuTru.gio) {
      nguHanhCount[canNguHanh[tuTru.gio.split(" ")[0]]] += 1;
      nguHanhCount[chiNguHanh[tuTru.gio.split(" ")[1]]] += 1;
    }
  } catch (e) {
    console.error("Lỗi phân tích ngũ hành:", e.message);
    throw new Error("Không thể phân tích ngũ hành do dữ liệu Tứ Trụ không hợp lệ");
  }

  return nguHanhCount;
};

const tinhDungThan = (nhatChu, thangChi, nguHanhCount) => {
  const chiNguHanh = {
    Tý: "Thủy", Hợi: "Thủy", Sửu: "Thổ", Thìn: "Thổ", Mùi: "Thổ", Tuất: "Thổ",
    Dần: "Mộc", Mão: "Mộc", Tỵ: "Hỏa", Ngọ: "Hỏa", Thân: "Kim", Dậu: "Kim"
  };
  
  const nhatChuHanh = {
    Giáp: "Mộc", Ất: "Mộc", Bính: "Hỏa", Đinh: "Hỏa", Mậu: "Thổ",
    Kỷ: "Thổ", Canh: "Kim", Tân: "Kim", Nhâm: "Thủy", Quý: "Thủy"
  };
  
  const tuongSinh = {
    Mộc: "Hỏa", Hỏa: "Thổ", Thổ: "Kim", Kim: "Thủy", Thủy: "Mộc"
  };
  
  const tuongKhac = {
    Mộc: "Thổ", Thổ: "Thủy", Thủy: "Hỏa", Hỏa: "Kim", Kim: "Mộc"
  };

  if (!nhatChu || !thangChi || !nhatChuHanh[nhatChu] || !chiNguHanh[thangChi]) {
    throw new Error("Nhật Chủ hoặc tháng sinh không hợp lệ");
  }

  const thangHanh = chiNguHanh[thangChi];
  const nhatChuNguHanh = nhatChuHanh[nhatChu];
  
  let thanVuong = false;
  if (
    thangHanh === nhatChuNguHanh ||
    tuongSinh[thangHanh] === nhatChuNguHanh ||
    nguHanhCount[nhatChuNguHanh] >= 3
  ) {
    thanVuong = true;
  }

  let dungThan = [];
  let lyDo = "";
  let cachCuc = thanVuong ? "Thân Vượng" : "Thân Nhược";

  if (thanVuong) {
    dungThan = [tuongKhac[nhatChuNguHanh], tuongKhac[tuongSinh[nhatChuNguHanh]]];
    lyDo = `Vì Thân Vượng, cần tiết khí bằng hành khắc Nhật Chủ (${tuongKhac[nhatChuNguHanh]}) và hành tiết khí (${tuongKhac[tuongSinh[nhatChuNguHanh]]}).`;
  } else {
    dungThan = [nhatChuNguHanh, tuongSinh[tuongKhac[nhatChuNguHanh]]];
    lyDo = `Vì Thân Nhược, cần hỗ trợ bằng hành của Nhật Chủ (${nhatChuNguHanh}) và hành sinh Nhật Chủ (${tuongSinh[tuongKhac[nhatChuNguHanh]]}).`;
  }

  return {
    hanh: dungThan,
    lyDo: lyDo,
    cachCuc: cachCuc,
    lyDoCachCuc: `Dựa trên tháng sinh (${thangHanh}) và tỷ lệ ngũ hành.`
  };
};

app.post("/api/luan-giai-bazi", async (req, res) => {
  const { messages, tuTruInfo, dungThan } = req.body;

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
    console.error("Lỗi parse tuTruInfo:", e.message);
    return res.status(400).json({ error: "Dữ liệu Tứ Trụ không hợp lệ" });
  }

  if (!tuTruParsed || !tuTruParsed.nam || !tuTruParsed.thang || !tuTruParsed.ngay || !tuTruParsed.gio) {
    return res.status(400).json({ error: "Vui lòng cung cấp đầy đủ thông tin Tứ Trụ (năm, tháng, ngày, giờ)" });
  }

  let nguHanhCount;
  try {
    nguHanhCount = analyzeNguHanh(tuTruParsed);
  } catch (e) {
    console.error("Lỗi trong analyzeNguHanh:", e.message);
    return res.status(400).json({ error: e.message });
  }

  const totalElements = Object.values(nguHanhCount).reduce((a, b) => a + b, 0);
  const tyLeNguHanh = Object.fromEntries(
    Object.entries(nguHanhCount).map(([k, v]) => [k, `${((v / totalElements) * 100).toFixed(2)}%`])
  );

  const nhatChu = tuTruParsed.ngay.split(" ")[0];
  const thangChi = tuTruParsed.thang.split(" ")[1];

  let dungThanTinhToan;
  try {
    dungThanTinhToan = dungThan ? dungThan : tinhDungThan(nhatChu, thangChi, nguHanhCount);
  } catch (e) {
    console.error("Lỗi trong tinhDungThan:", e.message);
    return res.status(400).json({ error: "Không thể tính Dụng Thần do dữ liệu không hợp lệ" });
  }

  const tuTruText = `
Thông tin Tứ Trụ:
- Năm: ${tuTruParsed.nam || "chưa rõ"}
- Tháng: ${tuTruParsed.thang || "chưa rõ"}
- Ngày: ${tuTruParsed.ngay || "chưa rõ"}
- Giờ: ${tuTruParsed.gio || "chưa rõ"}
- Nhật Chủ: ${nhatChu}
- Tỷ lệ Ngũ Hành: ${Object.entries(tyLeNguHanh).map(([k, v]) => `${k}: ${v}`).join(", ")}
`;

  const dungThanText = `
Dụng Thần: ${dungThanTinhToan.hanh.join(", ")}
Lý do chọn dụng thần: ${dungThanTinhToan.lyDo}
Cách Cục: ${dungThanTinhToan.cachCuc}
Lý do cách cục: ${dungThanTinhToan.lyDoCachCuc}
`;

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
Bạn là chuyên gia luận mệnh Bát Tự với kiến thức sâu sắc về ngũ hành, am hiểu văn hóa Việt Nam và cách diễn đạt tinh tế. Trả lời bằng tiếng Việt, trình bày rõ ràng, mạch lạc, chuyên nghiệp, không dùng dấu * hay ** hoặc # để liệt kê nội dung. Diễn đạt bằng lời văn sâu sắc, dễ hiểu, tránh thuật ngữ quá phức tạp để phù hợp với người mới sử dụng. Sử dụng đúng thông tin Tứ Trụ và Dụng Thần được cung cấp, không dựa vào dữ liệu từ các yêu cầu trước. Kiểm tra kỹ Nhật Chủ (thiên can ngày: ${nhatChu}) và tháng sinh (Địa Chi tháng: ${thangChi}) từ Tứ Trụ để đảm bảo chính xác (ví dụ: ngày Quý Sửu có Nhật Chủ Quý Thủy, tháng Đinh Tỵ là Tỵ - Hỏa). Nếu người dùng hỏi câu hỏi khác (ví dụ: đại vận, nghề nghiệp, năm cụ thể, màu sắc), trả lời ngay lập tức, cá nhân hóa dựa trên Tứ Trụ và Dụng Thần, tích hợp bối cảnh ngũ hành. Chỉ sử dụng Dụng Thần từ thông tin cung cấp hoặc tính tự động, ưu tiên Thân Vượng/Nhược, không áp dụng Tòng Cách trừ khi được yêu cầu rõ ràng.

Thông tin tham khảo:
${tuTruText}
${dungThanText}
${canChiNguhanhInfo}

Năm hiện tại: ${year} (${yearCanChi}, ngũ hành: ${yearNguHanh})

Hướng dẫn phân tích Bát Tự:
1. Phân tích chi tiết Tứ Trụ (giờ: ${tuTruParsed.gio}, ngày: ${tuTruParsed.ngay}, tháng: ${tuTruParsed.thang}, năm: ${tuTruParsed.nam}), diễn đạt bằng lời văn tinh tế, giải thích vai trò của từng ngũ hành:
   - Kim (${tyLeNguHanh.Kim}): Thể hiện sự sắc bén, quyết đoán, sinh Thủy hoặc khắc Mộc.
   - Thổ (${tyLeNguHanh.Thổ}): Mang lại sự ổn định, bền vững, sinh Kim hoặc khắc Thủy.
   - Hỏa (${tyLeNguHanh.Hỏa}): Tạo năng lượng, đam mê, khắc Kim hoặc sinh Thổ.
   - Thủy (${tyLeNguHanh.Thủy}): Thúc đẩy giao tiếp, linh hoạt, sinh Mộc hoặc khắc Hỏa.
   - Mộc (${tyLeNguHanh.Mộc}): Biểu thị sáng tạo, phát triển, khắc Thổ hoặc sinh Hỏa.
   Xác định Nhật Chủ (thiên can ngày: ${nhatChu}) và giải thích Thân Vượng/Nhược dựa trên tháng sinh (${thangChi}), tỷ lệ ngũ hành, và tương sinh/tương khắc. Kiểm tra kỹ ngũ hành của tháng sinh (ví dụ: Tỵ là Hỏa, Dậu là Kim).
2. Dự đoán vận trình qua ba giai đoạn (thời thơ ấu, trung niên, hậu vận), tập trung vào:
   - Vai trò của Dụng Thần trong việc cân bằng lá số (tiết khí nếu Thân Vượng, hỗ trợ nếu Thân Nhược).
   - Tác động của các ngũ hành mạnh/yếu (ví dụ: hành vắng mặt làm giảm tính linh hoạt).
   - Ảnh hưởng của tháng sinh và các hành chính trong Tứ Trụ, sử dụng đúng ngũ hành của Địa Chi.
3. Đưa ra gợi ý ứng dụng theo Dụng Thần (${dungThanTinhToan.hanh.join(", ")}), giải thích tại sao phù hợp với Cách Cục:
   - Ngành nghề: Chỉ đề xuất dựa trên Dụng Thần (Mộc: giáo dục, thiết kế; Thủy: truyền thông, logistics; Hỏa: nghệ thuật, marketing; Thổ: bất động sản, tài chính; Kim: công nghệ, kỹ thuật).
   - Màu sắc: Chỉ đề xuất dựa trên Dụng Thần (Mộc: xanh lá, xanh ngọc; Thủy: xanh dương, đen, xám; Hỏa: đỏ, hồng; Thổ: vàng, nâu; Kim: trắng, bạc).
   - Vật phẩm phong thủy: Chỉ đề xuất dựa trên Dụng Thần (Mộc: cây xanh; Thủy: bể cá; Hỏa: đèn đỏ; Thổ: đá thạch anh vàng; Kim: trang sức bạc).
   - Phương hướng: Chỉ đề xuất dựa trên Dụng Thần (Mộc: Đông, Đông Nam; Thủy: Bắc; Hỏa: Nam; Thổ: Đông Bắc; Kim: Tây, Tây Bắc).
   - Lưu ý: Sử dụng Dụng Thần tiết chế nếu hành đó yếu hoặc vắng mặt. Không đề xuất các hành ngoài Dụng Thần.
4. Phân tích vận trình năm hiện tại (${yearCanChi}, ${yearNguHanh}):
   - Đánh giá tương tác giữa ngũ hành của năm và Nhật Chủ (${nhatChu}), tập trung vào Dụng Thần. Xem xét tương sinh/tương khắc (ví dụ: Mộc hút Thủy, Hỏa khắc Thủy).
   - Dự báo cơ hội/thách thức, đề xuất cách hóa giải chỉ dựa trên Dụng Thần.
5. Nếu người dùng hỏi câu hỏi khác (ví dụ: đại vận, nghề nghiệp, năm cụ thể, màu sắc):
   - Phân tích câu hỏi, xác định ngũ hành liên quan.
   - So sánh với Tứ Trụ và Dụng Thần, đánh giá tương sinh/tương khắc.
   - Trả lời ngắn gọn, tập trung, chỉ sử dụng gợi ý thuộc Dụng Thần, không lặp lại phân tích Tứ Trụ.
   - Nếu hỏi về năm cụ thể, xác định can chi và ngũ hành, phân tích tương tác với Nhật Chủ, đề xuất hóa giải dựa trên Dụng Thần.
   - Nếu hỏi về đại vận, sử dụng logic đại vận (tuổi nhập vận, thuận/nghịch), phân tích can chi đại vận, liên kết với Dụng Thần.

Nguyên lý tương sinh tương khắc ngũ hành:
- Tương sinh: Mộc sinh Hỏa, Hỏa sinh Thổ, Thổ sinh Kim, Kim sinh Thủy, Thủy sinh Mộc.
- Tương khắc: Mộc khắc Thổ, Thổ khắc Thủy, Thủy khắc Hỏa, Hỏa khắc Kim, Kim khắc Mộc.

Ví dụ lời văn tinh tế:
- Phân tích Bát Tự: "Lá số mang Nhật Chủ Quý Thủy, sinh vào tháng Tỵ (Hỏa), thời điểm Thủy yếu. Thủy tạo sự linh hoạt, giao tiếp. Thổ mang lại ổn định nhưng khắc Thủy. Kim vắng mặt, cần bổ sung để sinh Thủy."
- Trả lời câu hỏi màu sắc: "Dựa trên Dụng Thần Kim và Thủy, chọn màu trắng, bạc (Kim) hoặc xanh dương, đen (Thủy) để tăng may mắn."

Bắt đầu phân tích Bát Tự và sẵn sàng trả lời câu hỏi khác:
`;
  } else if (isAskingYearOrDaiVan) {
    fullPrompt = `
Bạn là chuyên gia luận mệnh Bát Tự với kiến thức sâu sắc về ngũ hành, am hiểu văn hóa Việt Nam và cách diễn đạt tinh tế. Trả lời bằng tiếng Việt, rõ ràng, chuyên nghiệp, không dùng dấu * hay ** hoặc # để liệt kê nội dung. Người dùng hỏi về vận hạn năm ${year ? year : "hoặc đại vận cụ thể"}, cần phân tích dựa trên Tứ Trụ, Dụng Thần, và can chi chính xác của năm. Diễn đạt dễ hiểu, tránh thuật ngữ phức tạp để phù hợp với người mới sử dụng. Chỉ sử dụng Dụng Thần từ thông tin cung cấp hoặc tính tự động, ưu tiên Thân Vượng/Nhược, không áp dụng Tòng Cách trừ khi được yêu cầu rõ ràng.

Thông tin tham khảo:
${tuTruText}
${dungThanText}
${canChiNguhanhInfo}

Năm được hỏi: ${year ? `${year} (${yearCanChi}, ngũ hành: ${yearNguHanh})` : "Chưa rõ năm cụ thể, vui lòng cung cấp năm (ví dụ: 2025)"}

Hướng dẫn phân tích:
1. Xác định chính xác can chi và ngũ hành của năm được hỏi (${yearCanChi ? `${yearCanChi} (${yearNguHanh})` : "chưa rõ, yêu cầu người dùng cung cấp"}). Nếu năm không rõ, yêu cầu người dùng cung cấp năm cụ thể.
2. Phân tích tương tác giữa ngũ hành của năm và Nhật Chủ (${nhatChu}), tập trung vào Dụng Thần. Giải thích cụ thể sự tương sinh/tương khắc (ví dụ: Mộc hút Thủy, Hỏa khắc Thủy).
3. Dự đoán vận hạn năm: Nếu ngũ hành của năm thuộc Dụng Thần, dự báo thuận lợi. Nếu không, dự báo khó khăn và đề xuất cách hóa giải chỉ bằng vật phẩm/màu sắc thuộc Dụng Thần.
4. Diễn đạt bằng lời văn tinh tế, cá nhân hóa, không lặp lại nguyên văn thông tin Tứ Trụ hoặc Dụng Thần.
5. Nếu người dùng hỏi về đại vận, sử dụng logic đại vận (tuổi nhập vận, thuận/nghịch) để xác định giai đoạn, phân tích can chi đại vận, và liên kết với Dụng Thần.

Ví dụ phân tích: "Năm 2025 (Ất Tỵ, Mộc-Hỏa) gây áp lực vì Hỏa khắc Nhật Chủ Quý Thủy, Mộc hút Thủy. Sử dụng trang sức bạc (Kim) và bể cá (Thủy) để tăng cường may mắn."
Bắt đầu phân tích:
`;
  } else {
    fullPrompt = `
Bạn là chuyên gia mệnh lý và tư vấn nghề nghiệp với kiến thức sâu sắc về ngũ hành và Bát Tự, am hiểu văn hóa Việt Nam. Trả lời bằng tiếng Việt, rõ ràng, chuyên nghiệp, không dùng dấu * hay ** hoặc # để liệt kê nội dung. Người dùng hỏi một câu hỏi tự do: "${userInput}". Trả lời ngắn gọn, tập trung vào câu hỏi, sử dụng thông tin Tứ Trụ và Dụng Thần để đưa ra gợi ý phù hợp nếu câu hỏi liên quan đến nghề nghiệp, màu sắc, khởi nghiệp, hoặc quyết định quan trọng. Diễn đạt dễ hiểu, tránh thuật ngữ phức tạp để phù hợp với người mới sử dụng. Chỉ sử dụng Dụng Thần từ thông tin cung cấp hoặc tính tự động, ưu tiên Thân Vượng/Nhược, không áp dụng Tòng Cách trừ khi được yêu cầu rõ ràng.

Thông tin tham khảo:
${tuTruText}
${dungThanText}
${canChiNguhanhInfo}

Năm hiện tại: ${year} (${yearCanChi}, ngũ hành: ${yearNguHanh})

Nguyên lý tương sinh tương khắc ngũ hành:
- Tương sinh: Mộc sinh Hỏa, Hỏa sinh Thổ, Thổ sinh Kim, Kim sinh Thủy, Thủy sinh Mộc.
- Tương khắc: Mộc khắc Thổ, Thổ khắc Thủy, Thủy khắc Hỏa, Hỏa khắc Kim, Kim khắc Mộc.

Hướng dẫn trả lời:
1. Phân tích câu hỏi "${userInput}" và xác định ngũ hành liên quan (ví dụ: màu sắc - dựa trên Dụng Thần).
2. So sánh ngũ hành của câu hỏi với Tứ Trụ và Dụng Thần. Đánh giá sự phù hợp, xem xét tương sinh/tương khắc.
3. Trả lời ngắn gọn, tập trung, không lặp lại phân tích Tứ Trụ hoặc tỷ lệ ngũ hành trừ khi cần thiết. Đề xuất ngành nghề, màu sắc, vật phẩm phong thủy, phương hướng chỉ thuộc Dụng Thần.
4. Nếu câu hỏi không liên quan trực tiếp đến ngũ hành, trả lời thực tế, thân thiện, nhưng vẫn tham khảo Tứ Trụ/Dụng Thần để cá nhân hóa nếu phù hợp.

Ví dụ trả lời: "Dựa trên Dụng Thần Kim và Thủy, bạn nên chọn màu trắng, bạc (Kim) hoặc xanh dương, đen (Thủy) để tăng may mắn."
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
const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
server.setTimeout(120000);
