// server.js — Bazi API (topic-first, cảm xúc; CORS/preflight + fallback chắc chắn)
const express = require("express");
const axios = require("axios");
const https = require("https");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const NodeCache = require("node-cache");
const fs = require("fs");
require("dotenv").config();

const app = express();
const cache = new NodeCache({ stdTTL: 600 });

/* ===== Infra & CORS ===== */
const allowlist = (process.env.CORS_ORIGINS || "*")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // mobile app / curl
      if (allowlist.includes("*") || allowlist.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    maxAge: 86400
  })
);
// Trả lời preflight để tránh "Failed to fetch" do OPTIONS bị chặn
app.options("*", cors());

app.use(express.json({ limit: "2mb" }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true
  })
);

app.get("/health", (_, res) => res.status(200).send("OK"));

/* ===== Helpers chung ===== */
const rm = s => (s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const pct = n => `${(+n).toFixed(2)}%`;
const choose = (arr, seed=0)=>arr[(Math.abs(seed)+arr.length)%arr.length];

/* ===== Can–Chi / mapping ===== */
const stemsEn = { Jia:"Giáp", Yi:"Ất", Bing:"Bính", Ding:"Đinh", Wu:"Mậu", Ji:"Kỷ", Geng:"Canh", Xin:"Tân", Ren:"Nhâm", Gui:"Quý" };
const stemsVi = Object.fromEntries(Object.values(stemsEn).map(x=>[x,x]));
const branchesEn = { Rat:"Tý", Ox:"Sửu", Tiger:"Dần", Rabbit:"Mão", Dragon:"Thìn", Snake:"Tỵ", Horse:"Ngọ", Goat:"Mùi", Monkey:"Thân", Rooster:"Dậu", Dog:"Tuất", Pig:"Hợi" };
const branchesVi = Object.fromEntries(Object.values(branchesEn).map(x=>[x,x]));
const canHanh = { Giáp:"Mộc", Ất:"Mộc", Bính:"Hỏa", Đinh:"Hỏa", Mậu:"Thổ", Kỷ:"Thổ", Canh:"Kim", Tân:"Kim", Nhâm:"Thủy", Quý:"Thủy" };
const chiHanh = { Tý:"Thủy", Hợi:"Thủy", Sửu:"Thổ", Thìn:"Thổ", Mùi:"Thổ", Tuất:"Thổ", Dần:"Mộc", Mão:"Mộc", Tỵ:"Hỏa", Ngọ:"Hỏa", Thân:"Kim", Dậu:"Kim" };

const normalizeCanChi = (s) => {
  if (!s || typeof s!=="string") return null;
  const [c,b] = s.trim().split(/\s+/);
  if (!c||!b) return null;
  const cVi = Object.keys(stemsVi).find(k=>rm(k).toLowerCase()===rm(c).toLowerCase());
  const bVi = Object.keys(branchesVi).find(k=>rm(k).toLowerCase()===rm(b).toLowerCase());
  if (cVi && bVi) return `${cVi} ${bVi}`;
  const cEn = stemsEn[c]; const bEn = branchesEn[b];
  return (cEn&&bEn) ? `${cEn} ${bEn}` : null;
};

const parseEnglishTuTru = (text) => {
  if (!text) return null;
  const re = /([A-Za-z]+)\s+([A-Za-z]+)\s*(hour|day|month|year)/gi;
  const out = {};
  for (const m of text.matchAll(re)) {
    const pair = `${stemsEn[m[1]]||m[1]} ${branchesEn[m[2]]||m[2]}`;
    const slot = m[3].toLowerCase();
    if (slot==="hour") out.gio = pair;
    if (slot==="day") out.ngay = pair;
    if (slot==="month") out.thang = pair;
    if (slot==="year") out.nam = pair;
  }
  return (out.gio && out.ngay && out.thang && out.nam) ? out : null;
};

/* ===== Phân tích cơ bản ===== */
const analyzeNguHanh = (tuTru) => {
  const hidden = {
    Tý:["Quý"], Sửu:["Kỷ","Tân","Quý"], Dần:["Giáp","Bính","Mậu"], Mão:["Ất"],
    Thìn:["Mậu","Ất","Quý"], Tỵ:["Bính","Canh","Mậu"], Ngọ:["Đinh","Kỷ"],
    Mùi:["Kỷ","Đinh","Ất"], Thân:["Canh","Nhâm","Mậu"], Dậu:["Tân"],
    Tuất:["Mậu","Đinh","Tân"], Hợi:["Nhâm","Giáp"]
  };
  const count = { Mộc:0,Hỏa:0,Thổ:0,Kim:0,Thủy:0 };
  const els = [tuTru.nam,tuTru.thang,tuTru.ngay,tuTru.gio].flatMap(x=>String(x||"").split(" ")).filter(Boolean);
  const chis = [tuTru.nam,tuTru.thang,tuTru.ngay,tuTru.gio].map(x=>String(x||"").split(" ")[1]).filter(Boolean);
  if (els.length<8||chis.length<4) throw new Error("Tứ Trụ không đầy đủ");
  els.forEach(e => { if (canHanh[e]) count[canHanh[e]]+=1; if (chiHanh[e]) count[chiHanh[e]]+=1; });
  chis.forEach(ch => (hidden[ch]||[]).forEach(h => { if (canHanh[h]) count[canHanh[h]]+=0.3; }));
  if (Object.values(count).every(v=>v===0)) throw new Error("Ngũ hành rỗng");
  return count;
};

const tinhThapThan = (nhatChu, tuTru) => {
  if (!nhatChu || !canHanh[nhatChu]) throw new Error("Nhật Chủ không hợp lệ");
  const map = {
    Kim:{Kim:["Tỷ Kiên","Kiếp Tài"],Thủy:["Thực Thần","Thương Quan"],Mộc:["Chính Tài","Thiên Tài"],Hỏa:["Chính Quan","Thất Sát"],Thổ:["Chính Ấn","Thiên Ấn"]},
    Mộc:{Mộc:["Tỷ Kiên","Kiếp Tài"],Hỏa:["Thực Thần","Thương Quan"],Thổ:["Chính Tài","Thiên Tài"],Kim:["Chính Quan","Thất Sát"],Thủy:["Chính Ấn","Thiên Ấn"]},
    Hỏa:{Hỏa:["Tỷ Kiên","Kiếp Tài"],Thổ:["Thực Thần","Thương Quan"],Kim:["Chính Tài","Thiên Tài"],Thủy:["Chính Quan","Thất Sát"],Mộc:["Chính Ấn","Thiên Ấn"]},
    Thổ:{Thổ:["Tỷ Kiên","Kiếp Tài"],Kim:["Thực Thần","Thương Quan"],Thủy:["Chính Tài","Thiên Tài"],Mộc:["Chính Quan","Thất Sát"],Hỏa:["Chính Ấn","Thiên Ấn"]},
    Thủy:{Thủy:["Tỷ Kiên","Kiếp Tài"],Mộc:["Thực Thần","Thương Quan"],Hỏa:["Chính Tài","Thiên Tài"],Thổ:["Chính Quan","Thất Sát"],Kim:["Chính Ấn","Thiên Ấn"]}
  };
  const yang = ["Giáp","Bính","Mậu","Canh","Nhâm"];
  const same = x => yang.includes(x);
  const out = {};
  const cans = [tuTru.gio,tuTru.thang,tuTru.nam].map(x=>String(x||"").split(" ")[0]).filter(Boolean);
  const chis = [tuTru.gio,tuTru.ngay,tuTru.thang,tuTru.nam].map(x=>String(x||"").split(" ")[1]).filter(Boolean);
  cans.forEach(c=>{
    if (c===nhatChu) return;
    const h = canHanh[c]; const idx = (same(nhatChu)===same(c))?0:1; out[c]=map[canHanh[nhatChu]][h][idx];
  });
  chis.forEach(ch=>{
    const h=chiHanh[ch]; const idx=(same(nhatChu)===["Tý","Dần","Thìn","Ngọ","Thân","Tuất"].includes(ch))?0:1; out[ch]=map[canHanh[nhatChu]][h][idx];
  });
  return out;
};

const tinhThanSat = (tuTru) => {
  const nhatChu = tuTru.ngay?.split(" ")[0];
  const ngayChi = tuTru.ngay?.split(" ")[1];
  const branches = [tuTru.nam?.split(" ")[1], tuTru.thang?.split(" ")[1], tuTru.ngay?.split(" ")[1], tuTru.gio?.split(" ")[1]].filter(Boolean);
  if (!nhatChu || !ngayChi || !branches.length) throw new Error("Thiếu dữ liệu Thần Sát");
  const thienAt = { Giáp:["Sửu","Mùi"], Mậu:["Sửu","Mùi"], Canh:["Sửu","Mùi"], Ất:["Thân","Tý"], Kỷ:["Thân","Tý"], Bính:["Dậu","Hợi"], Đinh:["Dậu","Hợi"], Tân:["Dần","Ngọ"], Nhâm:["Tỵ","Mão"], Quý:["Tỵ","Mão"] };
  const tuongTinh = { Thân:"Tý", Tý:"Tý", Thìn:"Tý", Tỵ:"Dậu", Dậu:"Dậu", Sửu:"Dậu", Dần:"Ngọ", Ngọ:"Ngọ", Tuất:"Ngọ", Hợi:"Mão", Mão:"Mão", Mùi:"Mão" };
  const vanXuong = { Giáp:["Tỵ"], Ất:["Ngọ"], Bính:["Thân"], Đinh:["Dậu"], Mậu:["Thân"], Kỷ:["Dậu"], Canh:["Hợi"], Tân:["Tý"], Nhâm:["Dần"], Quý:["Mão"] };
  const daoHoa = { Thân:"Dậu", Tý:"Dậu", Thìn:"Dậu", Tỵ:"Ngọ", Dậu:"Ngọ", Sửu:"Ngọ", Dần:"Mão", Ngọ:"Mão", Tuất:"Mão", Hợi:"Tý", Mão:"Tý", Mùi:"Tý" };
  return {
    "Thiên Ất Quý Nhân": { vi:"Thiên Ất Quý Nhân", en:"Nobleman", value: thienAt[nhatChu]?.filter(c=>branches.includes(c))||[] },
    "Tướng Tinh": { vi:"Tướng Tinh", en:"General", value: branches.includes(tuongTinh[ngayChi])?[tuongTinh[ngayChi]]:[] },
    "Văn Xương": { vi:"Văn Xương", en:"Literary", value: vanXuong[nhatChu]?.filter(c=>branches.includes(c))||[] },
    "Đào Hoa": { vi:"Đào Hoa", en:"Peach Blossom", value: branches.includes(daoHoa[ngayChi])?[daoHoa[ngayChi]]:[] },
  };
};

/* ===== Intent & text ===== */
const guessLang = (msgs)=>{
  const t = rm((msgs||[]).map(m=>m.content||"").join(" ").toLowerCase());
  return /(giap|at|binh|dinh|mau|ky|canh|tan|nham|quy|ty|suu|dan|mao|thin|ty|ngo|mui|than|dau|tuat|hoi|bat tu)/.test(t) ? "vi":"en";
};
const openers = [
  "Mình nhìn qua lá số và thấy điều nổi bật là:",
  "Bức tranh năng lượng trong tứ trụ của bạn cho thấy:",
  "Ngay ở cột ngày, khí chất hiện lên rất rõ:"
];

const metaByHanh = {
  "Mộc": { vi:{ colors:["xanh lá","xanh ngọc"], jobs:["giáo dục","thiết kế","nội dung"], sports:["đi bộ công viên","yoga"], foods:["rau xanh","thảo mộc"], traits:"ấm áp, nuôi dưỡng" } },
  "Hỏa": { vi:{ colors:["đỏ thẫm","cam đất"], jobs:["truyền thông","sân khấu","năng lượng"], sports:["chạy ngắn","khiêu vũ"], foods:["gia vị ấm"], traits:"nồng nhiệt, quyết liệt" } },
  "Thổ": { vi:{ colors:["vàng đất","be"], jobs:["quản trị","vận hành","bất động sản"], sports:["sức bền"], foods:["ngũ cốc","khoai củ"], traits:"vững chãi, thực tế" } },
  "Kim": { vi:{ colors:["trắng","bạc","xám"], jobs:["tài chính","kỹ thuật","pháp chế"], sports:["pilates","tạ vừa"], foods:["thanh đạm"], traits:"kỷ luật, mạch lạc" } },
  "Thủy": { vi:{ colors:["xanh dương","đen than"], jobs:["CNTT","nghiên cứu","logistics"], sports:["bơi","đi bộ ven sông"], foods:["đậu hạt","tảo"], traits:"linh hoạt, sâu lắng" } }
};

const detectTopic = (text)=>{
  const s = rm((text||"").toLowerCase());
  const or = a => new RegExp(a.join("|"),"i");
  const flags = {
    money: or(["tien","tai van","tai loc","thu nhap","dau tu","tai chinh","wealth","money","invest","income","finance"]).test(s),
    career: or(["su nghiep","cong viec","nghe nghiep","career","job","promotion","startup","business"]).test(s),
    love: or(["tinh duyen","hon nhan","nguoi yeu","love","marriage","relationship"]).test(s),
    family: or(["gia dinh","gia dao","parents","family"]).test(s),
    health: or(["suc khoe","health","stress","ngu","sleep","fitness"]).test(s),
    property: or(["bat dong san","nha cua","property","real estate"]).test(s),
    children: or(["con cai","parenting","kids","children"]).test(s),
    study: or(["hoc tap","study","exam","research"]).test(s),
    travel: or(["du lich","travel","journey","trip"]).test(s),
    food: or(["am thuc","che do an","diet","food","nutrition"]).test(s),
    sport: or(["the thao","sport","gym","yoga","run","swim"]).test(s),
    pets: or(["thu cung","pet","dog","cat"]).test(s),
    habit: or(["thoi quen","habit","routine","discipline"]).test(s),
    thapthan: /thap than|ten gods/i.test(s),
    thansat: /than sat|auspicious|dao hoa|van xuong|quy nhan/i.test(s),
    choice: /( hay | hoac | or )/i.test(s),
    summon: /hay xem bat tu cho minh|xem bat tu cho minh/i.test(s),
  };
  flags.general = !Object.values(flags).some(Boolean);
  return flags;
};

const detectChoices = (text) => {
  const s = rm((text||"").toLowerCase());
  const hasSplitter = s.includes(" hay ")||s.includes(" hoac ")||s.includes(" or ");
  if (!hasSplitter) return [];
  const parts = s.split(/,|\/| hoac | hay | or /g).map(t=>t.trim()).filter(Boolean);
  return Array.from(new Set(parts)).slice(0,6);
};

const buildIntroIfSummoned = (tuTru, nhatChu, hanh, ratio, lang) => {
  if (lang!=="vi") return `Day Master **${nhatChu} (${hanh})**. Elements: Wood ${pct(ratio["Mộc"])}, Fire ${pct(ratio["Hỏa"])}, Earth ${pct(ratio["Thổ"])}, Metal ${pct(ratio["Kim"])}, Water ${pct(ratio["Thủy"])}. I’ll answer your question directly.`;
  return [
    `${choose(openers, nhatChu.length)} **Nhật Chủ ${nhatChu} (${hanh})**.`,
    `Tỷ lệ ngũ hành: Mộc ${pct(ratio["Mộc"])}, Hỏa ${pct(ratio["Hỏa"])}, Thổ ${pct(ratio["Thổ"])}, Kim ${pct(ratio["Kim"])}, Thủy ${pct(ratio["Thủy"])}.`,
    `Mình sẽ đi thẳng vào điều bạn đang hỏi.`
  ].join("\n");
};

const buildTopic = (topic, ctx) => {
  const { lang, hanhChon, hanhDominant, hanhWeak, meta, starsLine } = ctx;
  if (lang!=="vi") return `Focus: ${topic}.`;
  const bridge = "Gợi ý thực hành:";
  switch(topic){
    case "money": return `Tài vận thuận hướng **${hanhChon}** (${meta.jobs.join(", ")}). ${bridge} rõ thu-chi, ưu tiên dòng tiền đều; khi **${hanhDominant}** vượng nhớ bù **${hanhWeak}** để cân bằng.`;
    case "career": return `Sự nghiệp hợp vai **${meta.jobs.slice(0,2).join(" / ")}**. ${bridge} chọn dự án có tiêu chuẩn rõ, nâng chất lượng đều tay.`;
    case "love": return `Tình cảm hợp nhịp **ấm mà thoáng**; nuôi ngọn lửa vừa đủ, chừa chỗ cho phần **${hanhWeak}** được thở. ${starsLine}`;
    case "family": return `Gia đạo là nền vững; bù nhẹ **${hanhWeak}** là khí nhà êm. ${bridge} đặt giờ trò chuyện cố định mỗi tuần.`;
    case "health": return `Giữ nhịp điều độ. ${bridge} ngủ đủ – ăn sạch – vận động vừa tầm (${meta.sports.slice(0,2).join(", ")}).`;
    case "property": return `Tài sản cố định nên đi **nhỏ đến vừa**; tăng tỷ trọng khi rủi ro đã đo được.`;
    case "children": return `Với con cái: học qua trải nghiệm, khen nỗ lực hơn kết quả. ${bridge} mỗi tuần làm chung một dự án nhỏ.`;
    case "study": return `Học hiệu quả khi chia mạch **ngắn – rõ – đều**; ôn theo chu kỳ 2–7–30.`;
    case "travel": return `Đi ít nhưng sâu; trở về đầy năng lượng.`;
    case "food": return `Ẩm thực hợp hướng **sạch và vừa**: ${meta.foods.join(", ")}.`;
    case "sport": return `Thể thao **đều tay**: ${meta.sports.join(", ")}; đo bằng cảm nhận cơ thể.`;
    case "pets": return `Thú cưng cần nhịp **dịu – đều**; chất lượng thời gian hơn số giờ dài.`;
    case "habit": return `Thói quen: bám nhịp ngày, mỗi tuần tăng 5% là thấy tiến bộ.`;
    case "thapthan": return `Thập Thần đang mở thế thuận; đặt mình đúng vai để tận dụng.`;
    case "thansat": return `${starsLine} Biết mạnh để bật, biết nhiễu để né.`;
    default: return `Bạn có thể nói cụ thể hơn, mình sẽ soi đúng chỗ ngay.`;
  }
};

const buildChoice = (choices, ctx) => {
  const { lang, hanhChon, meta } = ctx;
  if (!choices.length) return "";
  const favored = choices.filter(c => {
    const m = (meta.colors||[]).concat(meta.jobs||[]);
    return m.some(x => rm(c).includes(rm(x)));
  });
  const list = favored.length ? favored : choices;
  return lang!=="vi"
    ? `Between your options, these fit **${hanhChon}** best: ${list.join(", ")}.`
    : `Giữa các lựa chọn, hợp **${hanhChon}** nhất là: ${list.join(", ")}.`;
};

const respond = (tuTru, nguHanh, thapThan, thanSat, dungThan, messages) => {
  const lang = guessLang(messages);
  const user = (messages||[]).slice().reverse().find(m=>m.role==="user")?.content || "";
  const flags = detectTopic(user);

  const nhatChu = tuTru.ngay.split(" ")[0];
  const hanh = canHanh[nhatChu];
  const total = Object.values(nguHanh).reduce((a,b)=>a+b,0)||1;
  const ratio = Object.fromEntries(Object.entries(nguHanh).map(([k,v])=>[k,(v/total)*100]));
  const arr = Object.entries(nguHanh).sort((a,b)=>b[1]-a[1]);
  const hanhDominant = arr[0][0], hanhWeak = arr[arr.length-1][0];
  const hanhChon = (Array.isArray(dungThan)&&dungThan[0]) || hanhDominant;
  const meta = metaByHanh[hanhChon]?.vi || { colors:["xanh dương"], jobs:["tư vấn"], sports:["đi bộ"], foods:["thanh đạm"] };
  const active = Object.values(thanSat||{}).filter(v=>v.value && v.value.length);
  const starsLine = active.length ? `Thần Sát mở: ${active.map(v=>v.vi+(v.value.length?` (${v.value.join(", ")})`:"")).join(" · ")}.` : "";

  const parts = [];
  if (flags.summon) parts.push([
    `${choose(["Mình đã xem qua lá số và thấy","Bức tranh tứ trụ cho thấy","Ngay ở cột ngày có thể thấy"], nhatChu.length)} **Nhật Chủ ${nhatChu} (${hanh})**.`,
    `Tỷ lệ ngũ hành: Mộc ${pct(ratio["Mộc"])}, Hỏa ${pct(ratio["Hỏa"])}, Thổ ${pct(ratio["Thổ"])}, Kim ${pct(ratio["Kim"])}, Thủy ${pct(ratio["Thủy"])}.`,
    `Mình sẽ đi thẳng vào điều bạn đang hỏi.`
  ].join("\n"));

  const order = ["money","career","love","health","family","property","children","study","travel","food","sport","pets","habit","thapthan","thansat"];
  const topic = order.find(t=>flags[t]);
  if (topic) {
    parts.push(buildTopic(topic, { lang, hanhChon, hanhDominant, hanhWeak, meta, starsLine }));
  } else if (!flags.summon) {
    parts.push(lang==="vi"
      ? "Bạn đang quan tâm phần nào của lá số (tài vận, công việc, tình cảm, sức khỏe…)? Mình sẽ soi đúng chỗ ngay."
      : "Which part should I read (money, career, love, health…)? I’ll go straight there."
    );
  }

  if (flags.choice) {
    const choices = detectChoices(user);
    if (choices.length>=2) parts.push(buildChoice(choices, { lang, hanhChon, meta }));
  }

  const prev = (messages||[]).filter(m=>m.role==="assistant").slice(-2).map(m=>m.content||"").join("\n");
  const prevPlain = rm(prev.toLowerCase());
  const final = parts.join("\n\n").split("\n").filter(p=>!prevPlain.includes(rm(p.toLowerCase()))).join("\n");
  return final.trim();
};

/* ===== OpenAI client (keep-alive + timeout) ===== */
const httpsAgent = new https.Agent({ keepAlive: true });
const openai = axios.create({
  baseURL: "https://api.openai.com/v1",
  timeout: 25000,
  httpsAgent,
  headers: { "Content-Type":"application/json" }
});
const keyOK = async () => {
  if (!process.env.OPENAI_API_KEY) return false;
  try {
    await openai.post("/chat/completions",
      { model: process.env.OPENAI_MODEL || "gpt-3.5-turbo", messages:[{role:"user",content:"ping"}], max_tokens:1 },
      { headers:{ Authorization:`Bearer ${process.env.OPENAI_API_KEY}` } }
    );
    return true;
  } catch (e) {
    return !(e.response && e.response.status===401);
  }
};

/* ===== Route chính ===== */
app.post("/api/luan-giai-bazi", async (req, res) => {
  const { messages, tuTruInfo, dungThan } = req.body || {};
  const lang = guessLang(messages);
  const userText = (messages||[]).slice().reverse().find(m=>m.role==="user")?.content || "";
  const cacheKey = `${tuTruInfo}::${userText}::${lang}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ answer: cached });

  if (!Array.isArray(messages)||!messages.length) return res.status(400).json({ error: lang==="vi"?"Thiếu messages":"Missing messages" });
  if (!tuTruInfo || typeof tuTruInfo!=="string") return res.status(400).json({ error: lang==="vi"?"Thiếu tuTruInfo":"Missing tuTruInfo" });

  let tuTru;
  try {
    const raw = JSON.parse(tuTruInfo);
    tuTru = { gio: normalizeCanChi(raw.gio), ngay: normalizeCanChi(raw.ngay), thang: normalizeCanChi(raw.thang), nam: normalizeCanChi(raw.nam) };
    if (!tuTru.gio||!tuTru.ngay||!tuTru.thang||!tuTru.nam) throw new Error("bad");
  } catch {
    tuTru = parseEnglishTuTru(userText);
    if (!tuTru) return res.status(400).json({ error: lang==="vi"?"Tứ Trụ không hợp lệ":"Invalid Four Pillars" });
  }

  let nguHanh, thapThan={}, thanSat={};
  try { nguHanh = analyzeNguHanh(tuTru); }
  catch { return res.status(400).json({ error: lang==="vi"?"Dữ liệu ngũ hành không hợp lệ":"Invalid Five Elements" }); }
  try { thapThan = tinhThapThan(tuTru.ngay.split(" ")[0], tuTru); } catch {}
  try { thanSat = tinhThanSat(tuTru); } catch { return res.status(400).json({ error: lang==="vi"?"Lỗi tính Thần Sát":"Auspicious star error" }); }

  const dung = Array.isArray(dungThan)?dungThan:(dungThan?.hanh||[]);
  if (!dung.every(d=>["Mộc","Hỏa","Thổ","Kim","Thủy"].includes(d))) {
    return res.status(400).json({ error: lang==="vi"?"Dụng Thần không hợp lệ":"Invalid Useful God" });
  }

  // Local response trước (để luôn có kết quả)
  const localText = respond(tuTru, nguHanh, thapThan, thanSat, dung, messages);

  // Nếu tắt GPT hoặc key lỗi → trả ngay local
  if (process.env.USE_OPENAI === "false") {
    cache.set(cacheKey, localText);
    return res.json({ answer: localText });
  }

  const ok = await keyOK().catch(()=>false);
  if (!ok) {
    cache.set(cacheKey, localText);
    return res.json({ answer: localText, warning: "OpenAI unavailable" });
  }

  // “Polish” có timeout cứng 6s; quá hạn trả local
  const polishPrompt = lang==="vi"
    ? "Viết mượt lại đoạn dưới đây theo giọng ấm áp, đúng trọng tâm câu hỏi. KHÔNG thêm chủ đề khác, không bịa mốc thời gian."
    : "Polish warmly and keep it strictly on-topic. Do NOT add topics or dates.";
  const gptPromise = openai.post("/chat/completions", {
    model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
    messages: [{ role:"system", content: polishPrompt }, { role:"user", content: localText }],
    temperature: Number(process.env.OPENAI_TEMPERATURE || 0.55),
    max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || "1200", 10)
  }, { headers:{ Authorization:`Bearer ${process.env.OPENAI_API_KEY}` } })
  .then(r=>r.data?.choices?.[0]?.message?.content?.trim())
  .catch(()=>null);

  const timeout = new Promise(resolve => setTimeout(()=>resolve(null), 6000));
  const polished = await Promise.race([gptPromise, timeout]);

  const answer = polished || localText;
  cache.set(cacheKey, answer);
  res.json({ answer, warning: polished?undefined:"OpenAI timeout → dùng bản local" });
});

/* ===== Error handler ===== */
app.use((err, req, res, next) => {
  try { fs.appendFileSync("error.log", `${new Date().toISOString()} - ${err.stack}\n`); } catch {}
  res.status(500).json({ error: "System error occurred" });
});

/* ===== Start ===== */
const port = process.env.PORT || 10000;
const server = app.listen(port, () => console.log(`Server on ${port}`));
server.setTimeout(300000);
