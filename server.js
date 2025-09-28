// server.js — Bát Tự API (GPT-3.5 viết lời, nội bộ tính dữ kiện)
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const NodeCache = require("node-cache");
require("dotenv").config();

const app = express();
const cache = new NodeCache({ stdTTL: 300 }); // 5 phút

/* ---------------- Middlewares ---------------- */
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false }));
app.get("/health", (_, res) => res.status(200).send("OK"));

/* ---------------- Utils ---------------- */
const rm = (s = "") => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const guessLang = (messages = []) => {
  const t = messages.map(m => m.content || "").join(" ");
  return /ngay|thang|nam|gio|giap|at|binh|dinh|mau|ky|canh|tan|nham|quy|ty|suu|dan|mao|thin|ty|ngo|mui|than|dau|tuat|hoi/i.test(rm(t)) ? "vi" : "en";
};

/* Can–Chi, Ngũ hành */
const heavenlyStemsVI = ["Giáp","Ất","Bính","Đinh","Mậu","Kỷ","Canh","Tân","Nhâm","Quý"];
const earthlyBranchesVI = ["Tý","Sửu","Dần","Mão","Thìn","Tỵ","Ngọ","Mùi","Thân","Dậu","Tuất","Hợi"];
const canNguHanh = { Giáp:"Mộc", Ất:"Mộc", Bính:"Hỏa", Đinh:"Hỏa", Mậu:"Thổ", Kỷ:"Thổ", Canh:"Kim", Tân:"Kim", Nhâm:"Thủy", Quý:"Thủy" };
const chiNguHanh = { Tý:"Thủy", Hợi:"Thủy", Sửu:"Thổ", Thìn:"Thổ", Mùi:"Thổ", Tuất:"Thổ", Dần:"Mộc", Mão:"Mộc", Tỵ:"Hỏa", Ngọ:"Hỏa", Thân:"Kim", Dậu:"Kim" };

const mapsEN = {
  stems: { Jia:"Giáp", Yi:"Ất", Bing:"Bính", Ding:"Đinh", Wu:"Mậu", Ji:"Kỷ", Geng:"Canh", Xin:"Tân", Ren:"Nhâm", Gui:"Quý" },
  branches: { Rat:"Tý", Ox:"Sửu", Tiger:"Dần", Rabbit:"Mão", Dragon:"Thìn", Snake:"Tỵ", Horse:"Ngọ", Goat:"Mùi", Monkey:"Thân", Rooster:"Dậu", Dog:"Tuất", Pig:"Hợi" }
};

const normalizeCanChi = (input) => {
  if (!input || typeof input !== "string") return null;
  const [rawCan, rawChi] = input.trim().split(/\s+/);
  if (!rawCan || !rawChi) return null;
  const canVi = heavenlyStemsVI.find(c => rm(c) === rm(rawCan));
  const chiVi = earthlyBranchesVI.find(c => rm(c) === rm(rawChi));
  if (canVi && chiVi) return `${canVi} ${chiVi}`;
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
    const pair = `${mapsEN.stems[m[1]] || m[1]} ${mapsEN.branches[m[2]] || m[2]}`;
    const slot = m[3].toLowerCase();
    if (slot === "hour") out.gio = pair;
    if (slot === "day") out.ngay = pair;
    if (slot === "month") out.thang = pair;
    if (slot === "year") out.nam = pair;
  }
  return out.gio && out.ngay && out.thang && out.nam ? out : null;
};

/* Phân tích Ngũ hành / Thập thần / Thần sát */
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
  const map = {
    Kim:{ Kim:["Tỷ Kiên","Kiếp Tài"], Thủy:["Thực Thần","Thương Quan"], Mộc:["Chính Tài","Thiên Tài"], Hỏa:["Chính Quan","Thất Sát"], Thổ:["Chính Ấn","Thiên Ấn"] },
    Mộc:{ Mộc:["Tỷ Kiên","Kiếp Tài"], Hỏa:["Thực Thần","Thương Quan"], Thổ:["Chính Tài","Thiên Tài"], Kim:["Chính Quan","Thất Sát"], Thủy:["Chính Ấn","Thiên Ấn"] },
    Hỏa:{ Hỏa:["Tỷ Kiên","Kiếp Tài"], Thổ:["Thực Thần","Thương Quan"], Kim:["Chính Tài","Thiên Tài"], Thủy:["Chính Quan","Thất Sát"], Mộc:["Chính Ấn","Thiên Ấn"] },
    Thổ:{ Thổ:["Tỷ Kiên","Kiếp Tài"], Kim:["Thực Thần","Thương Quan"], Thủy:["Chính Tài","Thiên Tài"], Mộc:["Chính Quan","Thất Sát"], Hỏa:["Chính Ấn","Thiên Ấn"] },
    Thủy:{ Thủy:["Tỷ Kiên","Kiếp Tài"], Mộc":["Thực Thần","Thương Quan"], Hỏa:["Chính Tài","Thiên Tài"], Thổ:["Chính Quan","Thất Sát"], Kim:["Chính Ấn","Thiên Ấn"] },
  };
  if (!nhatChu || !canNguHanh[nhatChu]) throw new Error("Nhật Chủ sai");
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

/* Lục hợp / Tam hợp cho câu hỏi A/B (tình cảm) */
const lucHop = { Tý:"Sửu", Sửu:"Tý", Dần:"Hợi", Mão:"Tuất", Thìn:"Dậu", Tỵ:"Thân", Ngọ:"Mùi", Mùi:"Ngọ", Thân:"Tỵ", Dậu:"Thìn", Tuất:"Mão", Hợi:"Dần" };
const tamHop = { "Thân": ["Tý","Thìn"], "Tý": ["Thân","Thìn"], "Thìn": ["Thân","Tý"],
                 "Dần": ["Ngọ","Tuất"], "Ngọ": ["Dần","Tuất"], "Tuất": ["Dần","Ngọ"],
                 "Hợi": ["Mão","Mùi"], "Mão": ["Hợi","Mùi"], "Mùi": ["Hợi","Mão"],
                 "Tỵ": ["Dậu","Sửu"], "Dậu": ["Tỵ","Sửu"], "Sửu": ["Tỵ","Dậu"] };

const compatScore = (dayChi, candChi) => {
  let s = 0;
  if (!dayChi || !candChi) return 0;
  if (lucHop[dayChi] === candChi) s += 2;
  if ((tamHop[dayChi] || []).includes(candChi)) s += 1;
  return s;
};

/* Intent & Choice detection */
const keywordSets = {
  money: /(tien|tiền|tài chính|tài lộc|thu nhập|đầu tư|wealth|finance|invest|bđs|bất động sản|tiết kiệm|ngân sách)/i,
  career: /(nghề|công việc|sự nghiệp|job|career|thăng tiến|kỹ năng|chuyển ngành|startup|kinh doanh|marketing|kế toán|kỹ sư|product|designer|pháp lý|nhân sự)/i,
  love: /(tình|tình duyên|tình cảm|yêu|hôn nhân|kết hôn|relationship|marriage|dating|người yêu)/i,
  health: /(sức khỏe|suc khoe|giấc ngủ|stress|ăn uống|diet|tập|yoga|gym|chạy|thiền)/i,
  family: /(gia đình|gia đạo|cha mẹ|con cái|parents|kids|children)/i,
  luck: /(may mắn|thời điểm|giờ đẹp|ngày tốt|vận may|lucky|good time)/i,
  color: /(màu|trang phục|áo|phối)/i,
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

/* OpenAI */
const callOpenAI = async (payload, retries = 2, delay = 1200) => {
  if (!process.env.OPENAI_API_KEY) throw new Error("Missing OpenAI API key");
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await axios.post("https://api.openai.com/v1/chat/completions", payload, {
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        timeout: 30000
      });
      return res.data;
    } catch (err) {
      const st = err.response?.status;
      if (st === 401) throw new Error("Invalid API key");
      if (i === retries || st === 429) throw err;
      await new Promise(r => setTimeout(r, delay * (i + 1)));
    }
  }
};

/* ---------------- Main Route ---------------- */
app.post("/api/luan-giai-bazi", async (req, res) => {
  const start = Date.now();
  try {
    const { messages = [], tuTruInfo = "{}", dungThan } = req.body;
    const language = guessLang(messages);
    const userInput = [...messages].reverse().find(m => m.role === "user")?.content || "";
    const { intents, choice } = detectIntent(userInput);

    // Tứ trụ
    let tuTru;
    try {
      const raw = JSON.parse(tuTruInfo);
      tuTru = {
        gio: normalizeCanChi(raw.gio),
        ngay: normalizeCanChi(raw.ngay),
        thang: normalizeCanChi(raw.thang),
        nam: normalizeCanChi(raw.nam)
      };
      if (!tuTru.gio || !tuTru.ngay || !tuTru.thang || !tuTru.nam) throw new Error();
    } catch {
      const fromText = parseEnglishTuTru(userInput);
      if (!fromText) return res.status(400).json({ error: language === "vi" ? "Tứ Trụ không hợp lệ" : "Invalid Four Pillars" });
      tuTru = fromText;
    }

    // Dữ kiện nội bộ
    const nhatChu = tuTru.ngay.split(" ")[0];
    const nhatChuHanh = canNguHanh[nhatChu];
    const nguHanh = analyzeNguHanh(tuTru);
    const thapThan = tinhThapThan(nhatChu, tuTru);
    const thanSat = tinhThanSat(tuTru);
    const dungs = Array.isArray(dungThan) ? dungThan : (dungThan?.hanh || []);
    const dayChi = tuTru.ngay.split(" ")[1];

    // Nếu có câu A/B về tuổi, tính điểm hợp
    let abSuggest = null;
    if (choice) {
      const aChi = earthlyBranchesVI.find(c => rm(choice.a).includes(rm(c)));
      const bChi = earthlyBranchesVI.find(c => rm(choice.b).includes(rm(c)));
      if (aChi && bChi) {
        const sa = compatScore(dayChi, aChi);
        const sb = compatScore(dayChi, bChi);
        abSuggest = sa === sb ? null : (sa > sb ? aChi : bChi);
      }
    }

    // Cache chống lặp
    const fp = JSON.stringify({ tuTru, dungs, intents, choice: choice ? [choice.a, choice.b] : null, q: rm(userInput).slice(0,160) });
    const cached = cache.get(fp);
    if (cached) return res.json({ answer: cached, cached: true });

    // Lấy 3 câu trước của assistant để tránh lặp
    const prevAssistant = messages.filter(m => m.role === "assistant").slice(-3).map(m => m.content);

    // Hints theo intent (để GPT bám sát, không nói lan man)
    const intentRubricVI = {
      general: "Mở đầu 1 câu riêng (không dùng 'Dựa vào bát tự'). Nêu điểm mạnh/yếu ngũ hành (không liệt kê %). Gắn Dụng Thần nếu có. Đưa 2–3 gợi ý ứng dụng hàng ngày.",
      money: "Trọng tâm tài chính: cách kiểm soát dòng tiền/tiết kiệm/đầu tư hợp hành của Dụng Thần; 2 bước hành động; 1 rủi ro cần tránh.",
      career: "Trọng tâm sự nghiệp: 3 hướng nghề/nhánh công việc phù hợp với hành của Dụng Thần + 1 kỹ năng nên rèn trong 7 ngày.",
      love: "Trọng tâm tình cảm: kiểu người hợp (ngũ hành/chi), nếu có lựa chọn A/B hãy chọn 1 bên và ghi 2 lý do (hợp chi, hợp hành, Đào Hoa).",
      health: "Trọng tâm sức khỏe: giấc ngủ, nhịp năng lượng của hành yếu; 2 thói quen nhỏ (10–15 phút) để cân bằng.",
      family: "Trọng tâm gia đạo: cách giao tiếp/hỗ trợ thế hệ trong nhà theo hành Dụng Thần; 1 việc nên làm cuối tuần.",
      luck: "Trọng tâm thời điểm: khung giờ/không gian hợp hành (không nêu năm/tháng cụ thể); 1 nghi thức nhỏ để khởi tâm.",
      color: "Trọng tâm màu sắc & phong cách: 1–2 tông màu hợp hành + cách phối ứng dụng vào công việc/hẹn hò."
    };

    const bannedPhrasesVI = [
      "Dựa vào bát tự","Với bát tự của bạn","Theo bát tự","Ngũ hành Kim xuất hiện nhiều, tượng trưng cho",
      "Thần Sát đang hoạt động","hãy tránh việc làm quá mức","Hãy dành thời gian để chăm sóc"
    ];

    const system = language === "vi"
      ? "Bạn là Thầy Bát Tự AI. Viết tự nhiên, truyền cảm, KHÔNG dùng các cụm sáo rỗng, mở đầu phải đa dạng. Trả lời đúng trọng tâm câu hỏi hiện tại; chỉ nhắc màu khi người dùng hỏi về màu. Liên hệ Dụng Thần/Thần Sát cụ thể (gọi tên sao nếu có). Không bịa mốc năm/tháng. 120–180 từ. Dùng vài gạch đầu dòng nếu giúp dễ đọc."
      : "You are a warm Bazi reader. Avoid boilerplate openings. Answer the current question only, tie advice to Useful Gods / named stars, no fabricated dates, 120–180 words.";

    const dataPack = {
      pillars: tuTru,
      dayMaster: { can: nhatChu, element: nhatChuHanh },
      fiveElements: nguHanh,
      tenGods: thapThan,
      stars: thanSat,
      usefulGods: dungs,
      intents,
      choice,
      abHint: abSuggest,        // nếu có A/B gợi ý theo lục hợp/tam hợp
      rubric: intentRubricVI,
      banned: bannedPhrasesVI,
      previousAssistant: prevAssistant
    };

    const userPrompt = language === "vi"
      ? `DỮ LIỆU (để suy luận, đừng in thô): ${JSON.stringify(dataPack)}
Câu hỏi của người dùng: "${userInput}"
YÊU CẦU:
- Không dùng các cụm trong "banned".
- Áp dụng rubric theo intent hiện tại: ${intents.map(i=>intentRubricVI[i]||"").join(" | ")}.
- Nếu có "abHint" thì cân nhắc khi chọn A/B (ghi 2 lý do ngắn).
- Không nhắc màu sắc nếu intent không phải "color".
- Không liệt kê phần trăm ngũ hành trừ khi người dùng hỏi.`
      : `DATA (for reasoning, do not print verbatim): ${JSON.stringify(dataPack)}
User question: "${userInput}"
Follow the rubric for the detected intent; avoid banned phrases; do not repeat previous assistant phrasing; no percentages unless asked; if choice given, pick one with 2 reasons.`;

    const gpt = await callOpenAI({
      model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
      temperature: 0.7,
      max_tokens: 900,
      frequency_penalty: 0.7,
      presence_penalty: 0.35,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt }
      ]
    });

    const answer = gpt?.choices?.[0]?.message?.content?.trim()
      || (language === "vi" ? "Mình đã nhận được câu hỏi của bạn." : "I received your question.");
    cache.set(fp, answer);
    return res.json({ answer, took_ms: Date.now() - start });

  } catch (err) {
    console.error("API error:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
});

/* --------------- Error handler --------------- */
app.use((err, req, res, next) => {
  console.error("Unhandled:", err);
  res.status(500).json({ error: "System error" });
});

/* --------------- Start --------------- */
const port = process.env.PORT || 10000;
app.listen(port, () => console.log("Server listening on", port));
