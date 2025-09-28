// server.js
// — Bát Tự API (ưu tiên GPT-3.5 viết lời đáp, có phân tích nội bộ để cung cấp dữ kiện)

const express = require("express");
const axios = require("axios");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const NodeCache = require("node-cache");
require("dotenv").config();

const app = express();
const cache = new NodeCache({ stdTTL: 60 * 5 }); // 5 phút tránh lặp

/* -------------------- Middlewares -------------------- */
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/health", (_, res) => res.status(200).send("OK"));

/* -------------------- Helpers -------------------- */
const rm = (s = "") =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const guessLang = (messages = []) => {
  const txt = messages.map(m => m.content || "").join(" ");
  return /ngay|thang|nam|gio|giap|at|binh|dinh|mau|ky|canh|tan|nham|quy|ty|suu|dan|mao|thin|ty|ngo|mui|than|dau|tuat|hoi/i.test(rm(txt))
    ? "vi"
    : "en";
};

// Can-Chi maps
const heavenlyStemsVI = ["Giáp","Ất","Bính","Đinh","Mậu","Kỷ","Canh","Tân","Nhâm","Quý"];
const earthlyBranchesVI = ["Tý","Sửu","Dần","Mão","Thìn","Tỵ","Ngọ","Mùi","Thân","Dậu","Tuất","Hợi"];
const canNguHanh = { Giáp:"Mộc", Ất:"Mộc", Bính:"Hỏa", Đinh:"Hỏa", Mậu:"Thổ", Kỷ:"Thổ", Canh:"Kim", Tân:"Kim", Nhâm:"Thủy", Quý:"Thủy" };
const chiNguHanh = { Tý:"Thủy", Hợi:"Thủy", Sửu:"Thổ", Thìn:"Thổ", Mùi:"Thổ", Tuất:"Thổ", Dần:"Mộc", Mão:"Mộc", Tỵ:"Hỏa", Ngọ:"Hỏa", Thân:"Kim", Dậu:"Kim" };

// normalize "Giáp Tý" / "Jia Zi" -> "Giáp Tý"
const mapsEN = {
  stems: { Jia:"Giáp", Yi:"Ất", Bing:"Bính", Ding:"Đinh", Wu:"Mậu", Ji:"Kỷ", Geng:"Canh", Xin:"Tân", Ren:"Nhâm", Gui:"Quý" },
  branches: { Rat:"Tý", Ox:"Sửu", Tiger:"Dần", Rabbit:"Mão", Dragon:"Thìn", Snake:"Tỵ", Horse:"Ngọ", Goat:"Mùi", Monkey:"Thân", Rooster:"Dậu", Dog:"Tuất", Pig:"Hợi" }
};

const normalizeCanChi = (input) => {
  if (!input || typeof input !== "string") return null;
  const [rawCan, rawChi] = input.trim().split(/\s+/);
  if (!rawCan || !rawChi) return null;

  // VI match (giữ dấu)
  const canVi = heavenlyStemsVI.find(c => rm(c) === rm(rawCan));
  const chiVi = earthlyBranchesVI.find(c => rm(c) === rm(rawChi));
  if (canVi && chiVi) return `${canVi} ${chiVi}`;

  // EN match
  const canEn = Object.keys(mapsEN.stems).find(k => rm(k) === rm(rawCan));
  const chiEn = Object.keys(mapsEN.branches).find(k => rm(k) === rm(rawChi));
  if (canEn && chiEn) return `${mapsEN.stems[canEn]} ${mapsEN.branches[chiEn]}`;

  return null;
};

const parseEnglishTuTru = (text) => {
  if (!text) return null;
  const re = /([A-Za-z]+)\s+([A-Za-z]+)\s*(hour|day|month|year)/gi;
  const out = {};
  for (const m of text.matchAll(re)) {
    const stem = mapsEN.stems[m[1]] || m[1];
    const branch = mapsEN.branches[m[2]] || m[2];
    const pair = `${stem} ${branch}`;
    const slot = m[3].toLowerCase();
    if (slot === "hour") out.gio = pair;
    if (slot === "day") out.ngay = pair;
    if (slot === "month") out.thang = pair;
    if (slot === "year") out.nam = pair;
  }
  return out.gio && out.ngay && out.thang && out.nam ? out : null;
};

/* -------------------- Core analysis (lightweight) -------------------- */
const analyzeNguHanh = (tuTru) => {
  const nh = { Mộc:0, Hỏa:0, Thổ:0, Kim:0, Thủy:0 };
  const hidden = {
    Tý:["Quý"], Sửu:["Kỷ","Tân","Quý"], Dần:["Giáp","Bính","Mậu"], Mão:["Ất"],
    Thìn:["Mậu","Ất","Quý"], Tỵ:["Bính","Canh","Mậu"], Ngọ:["Đinh","Kỷ"],
    Mùi:["Kỷ","Đinh","Ất"], Thân:["Canh","Nhâm","Mậu"], Dậu:["Tân"],
    Tuất:["Mậu","Đinh","Tân"], Hợi:["Nhâm","Giáp"]
  };
  const parts = [
    ...(tuTru.nam||"").split(" "), ...(tuTru.thang||"").split(" "),
    ...(tuTru.ngay||"").split(" "), ...(tuTru.gio||"").split(" ")
  ].filter(Boolean);
  const branches = [tuTru.nam?.split(" ")[1], tuTru.thang?.split(" ")[1], tuTru.ngay?.split(" ")[1], tuTru.gio?.split(" ")[1]].filter(Boolean);
  if (parts.length < 8 || branches.length < 4) throw new Error("Tứ trụ thiếu");

  for (const p of parts) {
    if (canNguHanh[p]) nh[canNguHanh[p]] += 1;
    if (chiNguHanh[p]) nh[chiNguHanh[p]] += 1;
  }
  for (const chi of branches) (hidden[chi] || []).forEach(h => nh[canNguHanh[h]] += 0.3);
  return nh;
};

const tinhThapThan = (nhatChu, tuTru) => {
  if (!nhatChu || !canNguHanh[nhatChu]) throw new Error("Nhật Chủ sai");
  const map = {
    Kim:{ Kim:["Tỷ Kiên","Kiếp Tài"], Thủy:["Thực Thần","Thương Quan"], Mộc:["Chính Tài","Thiên Tài"], Hỏa:["Chính Quan","Thất Sát"], Thổ:["Chính Ấn","Thiên Ấn"] },
    Mộc:{ Mộc:["Tỷ Kiên","Kiếp Tài"], Hỏa:["Thực Thần","Thương Quan"], Thổ:["Chính Tài","Thiên Tài"], Kim:["Chính Quan","Thất Sát"], Thủy:["Chính Ấn","Thiên Ấn"] },
    Hỏa:{ Hỏa:["Tỷ Kiên","Kiếp Tài"], Thổ:["Thực Thần","Thương Quan"], Kim:["Chính Tài","Thiên Tài"], Thủy:["Chính Quan","Thất Sát"], Mộc:["Chính Ấn","Thiên Ấn"] },
    Thổ:{ Thổ:["Tỷ Kiên","Kiếp Tài"], Kim:["Thực Thần","Thương Quan"], Thủy:["Chính Tài","Thiên Tài"], Mộc:["Chính Quan","Thất Sát"], Hỏa:["Chính Ấn","Thiên Ấn"] },
    Thủy:{ Thủy:["Tỷ Kiên","Kiếp Tài"], Mộc:["Thực Thần","Thương Quan"], Hỏa:["Chính Tài","Thiên Tài"], Thổ:["Chính Quan","Thất Sát"], Kim:["Chính Ấn","Thiên Ấn"] },
  };
  const isYang = ["Giáp","Bính","Mậu","Canh","Nhâm"].includes(nhatChu);
  const out = {};
  const els = [tuTru.gio?.split(" ")[0], tuTru.thang?.split(" ")[0], tuTru.nam?.split(" ")[0]].filter(Boolean);
  const chis = [tuTru.gio?.split(" ")[1], tuTru.ngay?.split(" ")[1], tuTru.thang?.split(" ")[1], tuTru.nam?.split(" ")[1]].filter(Boolean);

  for (const can of els) {
    if (can === nhatChu) continue;
    const h = canNguHanh[can]; if (!h) continue;
    const sameYang = ["Giáp","Bính","Mậu","Canh","Nhâm"].includes(can);
    const idx = (isYang === sameYang) ? 0 : 1;
    out[can] = map[canNguHanh[nhatChu]][h][idx];
  }
  for (const chi of chis) {
    const h = chiNguHanh[chi]; if (!h) continue;
    const chiYang = ["Tý","Dần","Thìn","Ngọ","Thân","Tuất"].includes(chi);
    const idx = (isYang === chiYang) ? 0 : 1;
    out[chi] = map[canNguHanh[nhatChu]][h][idx];
  }
  return out;
};

// Thần Sát rút gọn (giữ các bộ bạn dùng)
const tinhThanSat = (tuTru) => {
  const nhatChu = tuTru.ngay?.split(" ")[0];
  const ngayChi = tuTru.ngay?.split(" ")[1];
  const branches = [tuTru.nam?.split(" ")[1], tuTru.thang?.split(" ")[1], tuTru.ngay?.split(" ")[1], tuTru.gio?.split(" ")[1]].filter(Boolean);
  if (!nhatChu || !ngayChi) throw new Error("Ngày không hợp lệ");

  const thienAtQuyNhan = { Giáp:["Sửu","Mùi"], Mậu:["Sửu","Mùi"], Canh:["Sửu","Mùi"], Ất:["Thân","Tý"], Kỷ:["Thân","Tý"], Bính:["Dậu","Hợi"], Đinh:["Dậu","Hợi"], Tân:["Dần","Ngọ"], Nhâm:["Tỵ","Mão"], Quý:["Tỵ","Mão"] };
  const vanXuong = { Giáp:["Tỵ"], Ất:["Ngọ"], Bính:["Thân"], Đinh:["Dậu"], Mậu:["Thân"], Kỷ:["Dậu"], Canh:["Hợi"], Tân:["Tý"], Nhâm:["Dần"], Quý:["Mão"] };
  const daoHoa = { Thân:"Dậu", Tý:"Dậu", Thìn:"Dậu", Tỵ:"Ngọ", Dậu:"Ngọ", Sửu:"Ngọ", Dần:"Mão", Ngọ:"Mão", Tuất:"Mão", Hợi:"Tý", Mão:"Tý", Mùi:"Tý" };

  return {
    "Thiên Ất Quý Nhân": (thienAtQuyNhan[nhatChu]||[]).filter(c => branches.includes(c)),
    "Văn Xương": (vanXuong[nhatChu]||[]).filter(c => branches.includes(c)),
    "Đào Hoa": daoHoa[ngayChi] && branches.includes(daoHoa[ngayChi]) ? [daoHoa[ngayChi]] : []
  };
};

/* Intent + choice detection */
const keywordSets = {
  money: /(tien|tiền|tài chính|tài lộc|thu nhập|đầu tư|wealth|finance|invest|stock|crypto|bđs|bất động sản)/i,
  career: /(nghề|công việc|sự nghiệp|job|career|thăng tiến|promotion|start ?up|business|kinh doanh|bán hàng|marketing|kế toán|kỹ sư|product|designer|luật|pháp|nhân sự)/i,
  love: /(tình|tình cảm|tình duyên|yêu|hôn nhân|kết hôn|relationship|marriage|dating)/i,
  health: /(sức khỏe|suc khoe|sleep|giấc ngủ|stress|ăn uống|diet|tập|yoga|gym|chạy|thiền)/i,
  family: /(gia đình|gia đạo|cha mẹ|con cái|parents|kids|children)/i,
  luck: /(may mắn|thời điểm|giờ đẹp|ngày tốt|vận may|good time|lucky)/i,
  color: /(màu|mau|trang phục|áo|đồ|phối)/i,
  choice: /\b(.+?)\s+(?:hay|or)\s+(.+?)\b/i
};

const detectIntent = (text) => {
  const t = text || "";
  const intents = [];
  for (const [k, re] of Object.entries(keywordSets)) {
    if (k !== "choice" && re.test(t)) intents.push(k);
  }
  const m = t.match(keywordSets.choice);
  const choice = m ? { a: m[1].trim(), b: m[2].trim() } : null;
  return { intents: intents.length ? intents : ["general"], choice };
};

/* -------------------- OpenAI -------------------- */
const callOpenAI = async (payload, retries = 2, delay = 1200) => {
  if (!process.env.OPENAI_API_KEY) throw new Error("Missing OpenAI API key");
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await axios.post("https://api.openai.com/v1/chat/completions", payload, {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        timeout: 30000,
      });
      return res.data;
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) throw new Error("Invalid API key");
      if (i === retries || status === 429) throw err;
      await new Promise(r => setTimeout(r, delay * (i + 1)));
    }
  }
};

/* -------------------- Main Route -------------------- */
app.post("/api/luan-giai-bazi", async (req, res) => {
  const start = Date.now();
  try {
    const { messages = [], tuTruInfo = "{}", dungThan } = req.body;
    const language = guessLang(messages);
    const userInput = [...messages].reverse().find(m => m.role === "user")?.content || "";
    const { intents, choice } = detectIntent(userInput);

    // Parse tứ trụ
    let tuTru;
    try {
      const raw = JSON.parse(tuTruInfo);
      tuTru = {
        gio: normalizeCanChi(raw.gio),
        ngay: normalizeCanChi(raw.ngay),
        thang: normalizeCanChi(raw.thang),
        nam: normalizeCanChi(raw.nam),
      };
      if (!tuTru.gio || !tuTru.ngay || !tuTru.thang || !tuTru.nam) throw new Error();
    } catch {
      const fromText = parseEnglishTuTru(userInput);
      if (!fromText) return res.status(400).json({ error: language === "vi" ? "Tứ Trụ không hợp lệ" : "Invalid Four Pillars" });
      tuTru = fromText;
    }

    // Phân tích nội bộ -> gửi cho GPT trau chuốt
    const nhatChu = tuTru.ngay.split(" ")[0];
    const nhatChuHanh = canNguHanh[nhatChu];
    const nguHanh = analyzeNguHanh(tuTru);
    const thapThan = tinhThapThan(nhatChu, tuTru);
    const thanSat = tinhThanSat(tuTru);

    const dungThanHanh = Array.isArray(dungThan) ? dungThan : (dungThan?.hanh || []);
    const dungs = dungThanHanh.filter(h => ["Mộc","Hỏa","Thổ","Kim","Thủy"].includes(h));

    // Chống lặp: cache theo fingerprint
    const fp = JSON.stringify({
      tuTru, dungs, intents, choice: choice ? [choice.a, choice.b] : null, q: rm(userInput).slice(0,120)
    });
    const cached = cache.get(fp);
    if (cached) return res.json({ answer: cached, cached: true });

    // Lấy 2 câu trả lời gần nhất của assistant để tránh lặp câu chữ
    const prevAssistant = messages.filter(m => m.role === "assistant").slice(-2).map(m => m.content);

    // Prompt cho GPT (ưu tiên VI)
    const system = language === "vi"
      ? "Bạn là Thầy Bát Tự AI. Viết tự nhiên, truyền cảm nhưng không khoa trương; tránh lặp ý; mỗi câu trả lời gắn rõ với Dụng Thần và/hoặc Thần Sát nếu có. Nếu câu hỏi là A/B (hay/or), hãy so sánh ngắn gọn và chọn phương án hợp hành/dụng thần hơn, giải thích 1-2 lý do. Không bịa mốc năm tháng cụ thể. Dài vừa phải, có cấu trúc."
      : "You are a Bazi reader. Write warmly and clearly; tie advice to Useful God(s) and/or stars when relevant. If the user asks A/B, compare briefly and pick one based on elemental fit. No fabricated dates. Balanced length.";

    const dataPack = {
      pillars: tuTru,
      dayMaster: { can: nhatChu, element: nhatChuHanh },
      fiveElements: nguHanh,
      tenGods: thapThan,
      stars: thanSat,
      usefulGods: dungs,
      focusIntents: intents,
      choice: choice,
      previousHints: prevAssistant
    };

    const styleHintsVI = [
      "Mở đầu 1 câu gợi mở (không sáo rỗng).",
      "1–2 dòng tổng quan ngũ hành (điểm mạnh/yếu).",
      "Trả lời trúng trọng tâm câu hỏi hiện tại.",
      "Liên hệ Dụng Thần (nếu có) → đưa 2–3 gợi ý hành động thực tế.",
      "Nhắc khéo Thần Sát đang hoạt động (nếu có), cách tận dụng/tránh.",
      "Kết nhẹ nhàng (không lặp cùng một câu kết)."
    ].join(" ");

    const userPrompt = language === "vi"
      ? `DỮ LIỆU JSON (dùng làm căn cứ, không cần hiển thị thô):\n${JSON.stringify(dataPack)}\n\nCâu hỏi cuối: "${userInput}"\nYÊU CẦU: Viết câu trả lời tiếng Việt theo các ý: ${styleHintsVI}.`
      : `DATA JSON (for grounding, do not dump raw):\n${JSON.stringify(dataPack)}\n\nLast question: "${userInput}"\nPlease answer in English with the style constraints above.`;

    const gpt = await callOpenAI({
      model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
      temperature: 0.6,
      max_tokens: 900,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt }
      ]
    });

    const answer = gpt?.choices?.[0]?.message?.content?.trim() || (language === "vi" ? "Mình đã nhận được câu hỏi của bạn." : "I received your question.");
    cache.set(fp, answer);
    return res.json({ answer, took_ms: Date.now() - start });
  } catch (err) {
    console.error("API error:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
});

/* -------------------- Error handler -------------------- */
app.use((err, req, res, next) => {
  console.error("Unhandled:", err);
  res.status(500).json({ error: "System error" });
});

/* -------------------- Start -------------------- */
const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log("Server listening on", port);
});
