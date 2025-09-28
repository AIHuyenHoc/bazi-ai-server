"use strict";

const express = require("express");
const axios = require("axios");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const NodeCache = require("node-cache");
require("dotenv").config();

const app = express();
const cache = new NodeCache({ stdTTL: 300 });

/* ---------- middleware ---------- */
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false }));
app.get("/health", (_, res) => res.send("OK"));

/* ---------- utils ---------- */
const rm = (s = "") => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const guessLang = (messages = []) => (/ngay|thang|nam|gio|giap|at|binh|dinh|mau|ky|canh|tan|nham|quy|ty|suu|dan|mao|thin|ty|ngo|mui|than|dau|tuat|hoi/i.test(rm(messages.map(m=>m.content||"").join(" "))) ? "vi" : "en");

/* ---------- can–chi & maps ---------- */
const heavenlyStemsVI = ["Giáp","Ất","Bính","Đinh","Mậu","Kỷ","Canh","Tân","Nhâm","Quý"];
const earthlyBranchesVI = ["Tý","Sửu","Dần","Mão","Thìn","Tỵ","Ngọ","Mùi","Thân","Dậu","Tuất","Hợi"];
const canNguHanh = {"Giáp":"Mộc","Ất":"Mộc","Bính":"Hỏa","Đinh":"Hỏa","Mậu":"Thổ","Kỷ":"Thổ","Canh":"Kim","Tân":"Kim","Nhâm":"Thủy","Quý":"Thủy"};
const chiNguHanh = {"Tý":"Thủy","Hợi":"Thủy","Sửu":"Thổ","Thìn":"Thổ","Mùi":"Thổ","Tuất":"Thổ","Dần":"Mộc","Mão":"Mộc","Tỵ":"Hỏa","Ngọ":"Hỏa","Thân":"Kim","Dậu":"Kim"};
const mapsEN = {
  stems: { Jia:"Giáp", Yi:"Ất", Bing:"Bính", Ding:"Đinh", Wu:"Mậu", Ji:"Kỷ", Geng:"Canh", Xin:"Tân", Ren:"Nhâm", Gui:"Quý" },
  branches: { Rat:"Tý", Ox:"Sửu", Tiger:"Dần", Rabbit:"Mão", Dragon:"Thìn", Snake:"Tỵ", Horse:"Ngọ", Goat:"Mùi", Monkey:"Thân", Rooster:"Dậu", Dog:"Tuất", Pig:"Hợi" },
};
const normalizeCanChi = (input) => {
  if (!input || typeof input !== "string") return null;
  const [rawCan, rawChi] = input.trim().split(/\s+/);
  if (!rawCan || !rawChi) return null;
  const canVi = heavenlyStemsVI.find(c=>rm(c)===rm(rawCan));
  const chiVi = earthlyBranchesVI.find(c=>rm(c)===rm(rawChi));
  if (canVi && chiVi) return `${canVi} ${chiVi}`;
  const canEn = Object.keys(mapsEN.stems).find(k=>rm(k)===rm(rawCan));
  const chiEn = Object.keys(mapsEN.branches).find(k=>rm(k)===rm(rawChi));
  if (canEn && chiEn) return `${mapsEN.stems[canEn]} ${mapsEN.branches[chiEn]}`;
  return null;
};
const parseEnglishTuTru = (text) => {
  if (!text) return null;
  const re = /([A-Za-z]+)\s+([A-Za-z]+)\s*(hour|day|month|year)/gi;
  const out = {};
  for (const m of text.matchAll(re)) {
    const pair = `${mapsEN.stems[m[1]]||m[1]} ${mapsEN.branches[m[2]]||m[2]}`;
    const slot = (m[3]||"").toLowerCase();
    if (slot==="hour") out.gio = pair;
    if (slot==="day") out.ngay = pair;
    if (slot==="month") out.thang = pair;
    if (slot==="year") out.nam = pair;
  }
  return out.gio && out.ngay && out.thang && out.nam ? out : null;
};

/* ---------- phân tích ---------- */
const analyzeNguHanh = (tuTru) => {
  const nh = {"Mộc":0,"Hỏa":0,"Thổ":0,"Kim":0,"Thủy":0};
  const hidden = {
    "Tý":["Quý"],"Sửu":["Kỷ","Tân","Quý"],"Dần":["Giáp","Bính","Mậu"],"Mão":["Ất"],
    "Thìn":["Mậu","Ất","Quý"],"Tỵ":["Bính","Canh","Mậu"],"Ngọ":["Đinh","Kỷ"],
    "Mùi":["Kỷ","Đinh","Ất"],"Thân":["Canh","Nhâm","Mậu"],"Dậu":["Tân"],
    "Tuất":["Mậu","Đinh","Tân"],"Hợi":["Nhâm","Giáp"]
  };
  const parts = [...(tuTru.nam||"").split(" "),...(tuTru.thang||"").split(" "),...(tuTru.ngay||"").split(" "),...(tuTru.gio||"").split(" ")].filter(Boolean);
  const branches = [tuTru.nam?.split(" ")[1],tuTru.thang?.split(" ")[1],tuTru.ngay?.split(" ")[1],tuTru.gio?.split(" ")[1]].filter(Boolean);
  if (parts.length < 8 || branches.length < 4) throw new Error("Tứ trụ thiếu");
  for (const p of parts){ if (canNguHanh[p]) nh[canNguHanh[p]]+=1; if (chiNguHanh[p]) nh[chiNguHanh[p]]+=1; }
  for (const chi of branches) (hidden[chi]||[]).forEach(h=> nh[canNguHanh[h]] += 0.3);
  return nh;
};
const tinhThapThan = (nhatChu, tuTru) => {
  const map = {
    "Kim": {"Kim":["Tỷ Kiên","Kiếp Tài"],"Thủy":["Thực Thần","Thương Quan"],"Mộc":["Chính Tài","Thiên Tài"],"Hỏa":["Chính Quan","Thất Sát"],"Thổ":["Chính Ấn","Thiên Ấn"]},
    "Mộc": {"Mộc":["Tỷ Kiên","Kiếp Tài"],"Hỏa":["Thực Thần","Thương Quan"],"Thổ":["Chính Tài","Thiên Tài"],"Kim":["Chính Quan","Thất Sát"],"Thủy":["Chính Ấn","Thiên Ấn"]},
    "Hỏa": {"Hỏa":["Tỷ Kiên","Kiếp Tài"],"Thổ":["Thực Thần","Thương Quan"],"Kim":["Chính Tài","Thiên Tài"],"Thủy":["Chính Quan","Thất Sát"],"Mộc":["Chính Ấn","Thiên Ấn"]},
    "Thổ": {"Thổ":["Tỷ Kiên","Kiếp Tài"],"Kim":["Thực Thần","Thương Quan"],"Thủy":["Chính Tài","Thiên Tài"],"Mộc":["Chính Quan","Thất Sát"],"Hỏa":["Chính Ấn","Thiên Ấn"]},
    "Thủy": {"Thủy":["Tỷ Kiên","Kiếp Tài"],"Mộc":["Thực Thần","Thương Quan"],"Hỏa":["Chính Tài","Thiên Tài"],"Thổ":["Chính Quan","Thất Sát"],"Kim":["Chính Ấn","Thiên Ấn"]}
  };
  if (!nhatChu || !canNguHanh[nhatChu]) throw new Error("Nhật Chủ sai");
  const isYang = ["Giáp","Bính","Mậu","Canh","Nhâm"].includes(nhatChu);
  const out = {};
  const els = [tuTru.gio?.split(" ")[0],tuTru.thang?.split(" ")[0],tuTru.nam?.split(" ")[0]].filter(Boolean);
  const chis = [tuTru.gio?.split(" ")[1],tuTru.ngay?.split(" ")[1],tuTru.thang?.split(" ")[1],tuTru.nam?.split(" ")[1]].filter(Boolean);
  for (const can of els){ if (can===nhatChu) continue; const h=canNguHanh[can]; if(!h) continue; const sameYang=["Giáp","Bính","Mậu","Canh","Nhâm"].includes(can); const idx=isYang===sameYang?0:1; out[can]=map[canNguHanh[nhatChu]][h][idx]; }
  for (const chi of chis){ const h=chiNguHanh[chi]; if(!h) continue; const chiYang=["Tý","Dần","Thìn","Ngọ","Thân","Tuất"].includes(chi); const idx=isYang===chiYang?0:1; out[chi]=map[canNguHanh[nhatChu]][h][idx]; }
  return out;
};
const tinhThanSat = (tuTru) => {
  const nhatChu = tuTru.ngay?.split(" ")[0];
  const ngayChi = tuTru.ngay?.split(" ")[1];
  const branches = [tuTru.nam?.split(" ")[1],tuTru.thang?.split(" ")[1],tuTru.ngay?.split(" ")[1],tuTru.gio?.split(" ")[1]].filter(Boolean);
  if (!nhatChu || !ngayChi) throw new Error("Ngày không hợp lệ");
  const thienAtQuyNhan = {"Giáp":["Sửu","Mùi"],"Mậu":["Sửu","Mùi"],"Canh":["Sửu","Mùi"],"Ất":["Thân","Tý"],"Kỷ":["Thân","Tý"],"Bính":["Dậu","Hợi"],"Đinh":["Dậu","Hợi"],"Tân":["Dần","Ngọ"],"Nhâm":["Tỵ","Mão"],"Quý":["Tỵ","Mão"]};
  const vanXuong = {"Giáp":["Tỵ"],"Ất":["Ngọ"],"Bính":["Thân"],"Đinh":["Dậu"],"Mậu":["Thân"],"Kỷ":["Dậu"],"Canh":["Hợi"],"Tân":["Tý"],"Nhâm":["Dần"],"Quý":["Mão"]};
  const daoHoa = {"Thân":"Dậu","Tý":"Dậu","Thìn":"Dậu","Tỵ":"Ngọ","Dậu":"Ngọ","Sửu":"Ngọ","Dần":"Mão","Ngọ":"Mão","Tuất":"Mão","Hợi":"Tý","Mão":"Tý","Mùi":"Tý"};
  return {
    "Thiên Ất Quý Nhân": (thienAtQuyNhan[nhatChu]||[]).filter(c=>branches.includes(c)),
    "Văn Xương": (vanXuong[nhatChu]||[]).filter(c=>branches.includes(c)),
    "Đào Hoa": daoHoa[ngayChi] && branches.includes(daoHoa[ngayChi]) ? [daoHoa[ngayChi]] : [],
  };
};

/* ---------- hợp tuổi (A/B) ---------- */
const lucHop = {"Tý":"Sửu","Sửu":"Tý","Dần":"Hợi","Mão":"Tuất","Thìn":"Dậu","Tỵ":"Thân","Ngọ":"Mùi","Mùi":"Ngọ","Thân":"Tỵ","Dậu":"Thìn","Tuất":"Mão","Hợi":"Dần"};
const tamHop = {"Thân":["Tý","Thìn"],"Tý":["Thân","Thìn"],"Thìn":["Thân","Tý"],"Dần":["Ngọ","Tuất"],"Ngọ":["Dần","Tuất"],"Tuất":["Dần","Ngọ"],"Hợi":["Mão","Mùi"],"Mão":["Hợi","Mùi"],"Mùi":["Hợi","Mão"],"Tỵ":["Dậu","Sửu"],"Dậu":["Tỵ","Sửu"],"Sửu":["Tỵ","Dậu"]};
const compatScore = (dayChi, candChi) => { let s=0; if (!dayChi||!candChi) return 0; if (lucHop[dayChi]===candChi) s+=2; if ((tamHop[dayChi]||[]).includes(candChi)) s+=1; return s; };

/* ---------- intent & choice ---------- */
const keywordSets = {
  money: /(tien|tiền|tài chính|tài lộc|thu nhập|đầu tư|wealth|finance|invest|bđs|bất động sản|tiết kiệm|ngân sách)/i,
  career: /(nghề|công việc|sự nghiệp|job|career|thăng tiến|kỹ năng|chuyển ngành|startup|kinh doanh|marketing|kế toán|kỹ sư|product|designer|pháp lý|nhân sự)/i,
  love: /(tình|tình duyên|tình cảm|yêu|hôn nhân|kết hôn|relationship|marriage|dating|người yêu)/i,
  health: /(sức khỏe|suc khoe|giấc ngủ|stress|ăn uống|diet|tập|yoga|gym|chạy|thiền)/i,
  family: /(gia đình|gia đạo|cha mẹ|con cái|parents|kids|children)/i,
  luck: /(may mắn|thời điểm|giờ đẹp|ngày tốt|vận may|lucky|good time)/i,
  color: /(màu|trang phục|áo|phối)/i,
  choice: /\b(.+?)\s+(?:hay|or)\s+(.+?)\b/i,
};
const detectIntent = (text="") => {
  const intents = [];
  for (const [k,re] of Object.entries(keywordSets)) if (k!=="choice" && re.test(text)) intents.push(k);
  return { intents: intents.length?intents:["general"], choice: text.match(keywordSets.choice)?.slice(1,3) };
};

/* ---------- OpenAI ---------- */
const callOpenAI = async (payload, retries=2, delay=1200) => {
  if (!process.env.OPENAI_API_KEY) throw new Error("Missing OpenAI API key");
  for (let i=0;i<=retries;i++){
    try{
      const r = await axios.post("https://api.openai.com/v1/chat/completions", payload, { headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`}, timeout:30000 });
      return r.data;
    }catch(err){
      const st = err.response?.status;
      if (st===401) throw err;
      if (i===retries || st===429) throw err;
      await new Promise(r=>setTimeout(r, delay*(i+1)));
    }
  }
};

/* ---------- post-process: chống lôi A/B khi KHÔNG có choice ---------- */
const postProcess = (text, { hasChoice }) => {
  let out = (text || "").trim();
  if (!hasChoice) {
    const lines = out.split(/\n/).filter(Boolean);
    const reBad = /(A\/B|lựa chọn|chon|chọn)[^.\n]*|(?:tuổi|con giáp)\s+(Tý|Sửu|Dần|Mão|Thìn|Tỵ|Ngọ|Mùi|Thân|Dậu|Tuất|Hợi)/i;
    out = lines.filter(l => !reBad.test(l)).join("\n").trim();
  }
  return out;
};

/* ---------- main route ---------- */
app.post("/api/luan-giai-bazi", async (req, res) => {
  const start = Date.now();
  try{
    const { messages=[], tuTruInfo="{}", dungThan } = req.body;
    const language = guessLang(messages);
    const userInput = [...messages].reverse().find(m=>m.role==="user")?.content || "";
    const { intents, choice } = detectIntent(userInput);
    const hasChoice = !!choice;

    // parse tứ trụ
    let tuTru;
    try{
      const raw = JSON.parse(tuTruInfo);
      tuTru = { gio:normalizeCanChi(raw.gio), ngay:normalizeCanChi(raw.ngay), thang:normalizeCanChi(raw.thang), nam:normalizeCanChi(raw.nam) };
      if(!tuTru.gio||!tuTru.ngay||!tuTru.thang||!tuTru.nam) throw new Error();
    }catch{
      const fromText = parseEnglishTuTru(userInput);
      if(!fromText) return res.status(400).json({ error: language==="vi"?"Tứ Trụ không hợp lệ":"Invalid Four Pillars" });
      tuTru = fromText;
    }

    // tính toán
    const nhatChu = tuTru.ngay.split(" ")[0];
    const nhatChuHanh = canNguHanh[nhatChu];
    const nguHanh = analyzeNguHanh(tuTru);
    const thapThan = tinhThapThan(nhatChu, tuTru);
    const thanSat = tinhThanSat(tuTru);
    const dungs = Array.isArray(dungThan)?dungThan:(dungThan?.hanh||[]);
    const dayChi = tuTru.ngay.split(" ")[1];

    // A/B thật sự
    let abSuggest = null;
    if (hasChoice) {
      const aChi = earthlyBranchesVI.find(c=>rm(choice[0]).includes(rm(c)));
      const bChi = earthlyBranchesVI.find(c=>rm(choice[1]).includes(rm(c)));
      if (aChi && bChi) {
        const sa=compatScore(dayChi,aChi), sb=compatScore(dayChi,bChi);
        abSuggest = sa===sb?null:(sa>sb?aChi:bChi);
      }
    }

    // cache chống lặp
    const key = JSON.stringify({ tuTru, dungs, intents, choice, q: rm(userInput).slice(0,160) });
    const cached = cache.get(key);
    if (cached) return res.json({ answer: cached, cached: true });

    const prevAssistant = messages.filter(m=>m.role==="assistant").slice(-3).map(m=>m.content);

    const rubricVI = {
      general: "Mở đầu tự nhiên (không dùng 'Dựa vào bát tự'). Nêu điểm mạnh/yếu theo Ngũ Hành & Dụng Thần; 2–3 gợi ý thực hành hằng ngày.",
      money: "Tài chính: cách kiểm soát dòng tiền/tiết kiệm/đầu tư hợp hành Dụng Thần; 2 bước hành động + 1 rủi ro cần tránh.",
      career: "Sự nghiệp: 3 hướng nghề/ngách theo Dụng Thần + 1 kỹ năng nên rèn trong 7 ngày.",
      love: "Tình cảm: kiểu người hợp theo hành/chi; NẾU CÓ lựa chọn A/B mới được chọn 1 bên và nêu 2 lý do.",
      health: "Sức khỏe: giấc ngủ & thói quen 10–15 phút theo hành yếu để cân bằng.",
      family: "Gia đạo: cách giao tiếp/hỗ trợ theo hành Dụng Thần; 1 việc nên làm cuối tuần.",
      luck: "Thời điểm: khung giờ/không gian hợp hành (không bịa tháng/năm).",
      color: "Màu sắc/phong cách: 1–2 tông hợp hành + cách ứng dụng.",
    };

    const bannedVI = [
      "Dựa vào bát tự","Với bát tự của bạn","Theo bát tự",
      "Nếu cần lựa chọn A/B","hãy chọn A","hãy chọn B"
    ];

    const system = language==="vi"
      ? "Bạn là Thầy Bát Tự AI, văn phong ấm áp, không sáo rỗng. Trả lời đúng trọng tâm intent hiện tại; chỉ nói A/B hoặc tuổi hợp KHI VÀ CHỈ KHI phát hiện lựa chọn. Không bịa mốc tháng/năm. Độ dài 120–180 từ. Tránh lặp lời các phản hồi trước."
      : "Warm Bazi reader. Do not mention A/B or zodiac compatibility unless a choice is detected. No fabricated dates. 120–180 words.";

    const dataPack = {
      pillars: tuTru,
      dayMaster: { can: nhatChu, element: nhatChuHanh },
      fiveElements: nguHanh,
      tenGods: thapThan,
      stars: thanSat,
      usefulGods: dungs,
      intents,
      hasChoice,
      choice,
      abHint: abSuggest,
      rubric: rubricVI,
      banned: bannedVI,
      previousAssistant: prevAssistant
    };

    const prompt = language==="vi"
      ? `DỮ LIỆU (để suy luận, KHÔNG in thô): ${JSON.stringify(dataPack)}
Câu hỏi: "${userInput}"
YÊU CẦU:
- Nếu hasChoice=false: TUYỆT ĐỐI KHÔNG nhắc A/B, tuổi hợp, con giáp hợp, chọn người tuổi gì.
- Áp dụng rubric theo intent hiện tại: ${intents.map(i=>rubricVI[i]||"").join(" | ")}.
- Tránh các cụm trong banned. Không lặp lại ý/giọng của previousAssistant.`
      : `DATA (for reasoning; do not print verbatim): ${JSON.stringify(dataPack)}
User question: "${userInput}"
If hasChoice=false: DO NOT mention A/B, zodiac compatibility, or choosing a partner's sign. Follow the rubric for the detected intent; avoid banned phrases and previous phrasing.`;

    const gpt = await callOpenAI({
      model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
      temperature: 0.7,
      max_tokens: 900,
      frequency_penalty: 0.7,
      presence_penalty: 0.35,
      messages: [{ role:"system", content: system }, { role:"user", content: prompt }]
    });

    let answer = gpt?.choices?.[0]?.message?.content?.trim() || (language==="vi"?"Mình đã nhận được câu hỏi của bạn.":"Got it.");
    answer = postProcess(answer, { hasChoice });

    cache.set(key, answer);
    return res.json({ answer, took_ms: Date.now()-start });
  }catch(err){
    console.error("API error:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
});

app.use((err, req, res, next) => {
  console.error("Unhandled:", err);
  res.status(500).json({ error: "System error" });
});

const port = process.env.PORT || 10000;
app.listen(port, ()=>console.log("Server listening on", port));
