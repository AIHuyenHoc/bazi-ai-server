// server.js
/* =========================================================
 *  Bazi Assistant API (VN/EN) – empathetic answers
 *  If a user question isn't recognized => delegate to GPT-3.5
 * ========================================================= */

const express = require("express");
const axios = require("axios");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const NodeCache = require("node-cache");
require("dotenv").config();

const app = express();
const cache = new NodeCache({ stdTTL: 600 });

/* ------------------------- Middlewares ------------------------- */
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

app.get("/health", (req, res) => res.status(200).send("OK"));

/* ------------------------- Utils ------------------------- */
const rmDiacritics = (s = "") =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const guessLanguage = (messages = []) => {
  const txt = rmDiacritics(messages.map(m => m.content || "").join(" "));
  const looksVI = /(ngay|thang|nam|gio|hay|khong|mau|tai|suc|tinh|gia|con|dau tu|may man|xem bat tu)/i.test(txt);
  return looksVI ? "vi" : "en";
};

/* ------------------------- Can–Chi maps ------------------------- */
const heavenlyStemsMap = {
  en: { Jia: "Giáp", Yi: "Ất", Bing: "Bính", Ding: "Đinh", Wu: "Mậu", Ji: "Kỷ", Geng: "Canh", Xin: "Tân", Ren: "Nhâm", Gui: "Quý" },
  vi: { Giáp: "Giáp", Ất: "Ất", Bính: "Bính", Đinh: "Đinh", Mậu: "Mậu", Kỷ: "Kỷ", Canh: "Canh", Tân: "Tân", Nhâm: "Nhâm", Quý: "Quý" }
};
const earthlyBranchesMap = {
  en: { Rat: "Tý", Ox: "Sửu", Tiger: "Dần", Rabbit: "Mão", Dragon: "Thìn", Snake: "Tỵ", Horse: "Ngọ", Goat: "Mùi", Monkey: "Thân", Rooster: "Dậu", Dog: "Tuất", Pig: "Hợi" },
  vi: { Tý: "Tý", Sửu: "Sửu", Dần: "Dần", Mão: "Mão", Thìn: "Thìn", Tỵ: "Tỵ", Ngọ: "Ngọ", Mùi: "Mùi", Thân: "Thân", Dậu: "Dậu", Tuất: "Tuất", Hợi: "Hợi" }
};
const canNguHanh = { Giáp:"Mộc", Ất:"Mộc", Bính:"Hỏa", Đinh:"Hỏa", Mậu:"Thổ", Kỷ:"Thổ", Canh:"Kim", Tân:"Kim", Nhâm:"Thủy", Quý:"Thủy" };
const chiNguHanh = { Tý:"Thủy", Hợi:"Thủy", Sửu:"Thổ", Thìn:"Thổ", Mùi:"Thổ", Tuất:"Thổ", Dần:"Mộc", Mão:"Mộc", Tỵ:"Hỏa", Ngọ:"Hỏa", Thân:"Kim", Dậu:"Kim" };

const chiVI = Object.keys(earthlyBranchesMap.vi);
const lucHop = { Tý:"Sửu", Sửu:"Tý", Dần:"Hợi", Hợi:"Dần", Mão:"Tuất", Tuất:"Mão", Thìn:"Dậu", Dậu:"Thìn", Tỵ:"Thân", Thân:"Tỵ", Ngọ:"Mùi", Mùi:"Ngọ" };
const tamHop = [["Thân","Tý","Thìn"],["Dần","Ngọ","Tuất"],["Hợi","Mão","Mùi"],["Tỵ","Dậu","Sửu"]];
const xungGroups = [["Tý","Ngọ","Mão","Dậu"],["Dần","Thân","Tỵ","Hợi"],["Thìn","Tuất","Sửu","Mùi"]];
const sameGroup = (a,b,groups)=>groups.some(g=>g.includes(a)&&g.includes(b));
const findChiFromText = (s="")=>{
  const t = rmDiacritics(s.toLowerCase());
  return chiVI.find(c => t.includes(rmDiacritics(c).toLowerCase())) || null;
};

/* ------------------------- Parsers ------------------------- */
const normalizeCanChi = (input) => {
  if (!input || typeof input !== "string") return null;
  const [rawCan, rawChi] = input.trim().split(/\s+/);
  if (!rawCan || !rawChi) return null;

  // VI
  const canVi = Object.keys(heavenlyStemsMap.vi)
    .find(k => rmDiacritics(k).toLowerCase() === rmDiacritics(rawCan).toLowerCase());
  const chiVi = Object.keys(earthlyBranchesMap.vi)
    .find(k => rmDiacritics(k).toLowerCase() === rmDiacritics(rawChi).toLowerCase());
  if (canVi && chiVi) return `${canVi} ${chiVi}`;

  // EN
  const enCanKey = Object.keys(heavenlyStemsMap.en).find(k => k.toLowerCase() === rawCan.toLowerCase());
  const enChiKey = Object.keys(earthlyBranchesMap.en).find(k => k.toLowerCase() === rawChi.toLowerCase());
  if (enCanKey && enChiKey) return `${heavenlyStemsMap.en[enCanKey]} ${earthlyBranchesMap.en[enChiKey]}`;

  return null;
};

const parseEnglishTuTru = (input = "") => {
  try {
    const re = /([A-Za-z]+)\s+([A-Za-z]+)\s*(hour|day|month|year)/gi;
    const out = {};
    for (const m of input.matchAll(re)) {
      const stem = heavenlyStemsMap.en[m[1]] || m[1];
      const branch = earthlyBranchesMap.en[m[2]] || m[2];
      const pair = `${stem} ${branch}`;
      const slot = (m[3] || "").toLowerCase();
      if (slot === "hour") out.gio = pair;
      if (slot === "day") out.ngay = pair;
      if (slot === "month") out.thang = pair;
      if (slot === "year") out.nam = pair;
    }
    return (out.gio && out.ngay && out.thang && out.nam) ? out : null;
  } catch {
    return null;
  }
};

/* ------------------------- Core analyzers ------------------------- */
const analyzeNguHanh = (tuTru) => {
  // count stems + branches + hidden stems (0.3)
  const hidden = {
    Tý:["Quý"], Sửu:["Kỷ","Tân","Quý"], Dần:["Giáp","Bính","Mậu"], Mão:["Ất"],
    Thìn:["Mậu","Ất","Quý"], Tỵ:["Bính","Canh","Mậu"], Ngọ:["Đinh","Kỷ"],
    Mùi:["Kỷ","Đinh","Ất"], Thân:["Canh","Nhâm","Mậu"], Dậu:["Tân"],
    Tuất:["Mậu","Đinh","Tân"], Hợi:["Nhâm","Giáp"]
  };
  const out = { Mộc:0, Hỏa:0, Thổ:0, Kim:0, Thủy:0 };

  const pieces = [
    ...(tuTru.nam||"").split(" "),
    ...(tuTru.thang||"").split(" "),
    ...(tuTru.ngay||"").split(" "),
    ...(tuTru.gio||"").split(" "),
  ].filter(Boolean);
  const branches = [tuTru.nam?.split(" ")[1], tuTru.thang?.split(" ")[1], tuTru.ngay?.split(" ")[1], tuTru.gio?.split(" ")[1]].filter(Boolean);

  if (pieces.length < 8 || branches.length < 4) throw new Error("Tứ Trụ không đầy đủ");

  for (const p of pieces) {
    if (canNguHanh[p]) out[canNguHanh[p]] += 1;
    if (chiNguHanh[p]) out[chiNguHanh[p]] += 1;
  }
  for (const c of branches) {
    (hidden[c] || []).forEach(h => { if (canNguHanh[h]) out[canNguHanh[h]] += 0.3; });
  }
  const total = Object.values(out).reduce((a,b)=>a+b,0);
  if (!total) throw new Error("Ngũ hành rỗng");
  return out;
};

const personality = {
  Mộc: { vi:"linh hoạt, sáng tạo, tinh tế", en:"adaptive, creative, refined" },
  Hỏa: { vi:"nhiệt huyết, chủ động, truyền cảm", en:"passionate, proactive, inspiring" },
  Thổ: { vi:"kiên định, thực tế, bền bỉ", en:"steady, practical, resilient" },
  Kim: { vi:"kỷ luật, sắc sảo, chuẩn mực", en:"disciplined, sharp, principled" },
  Thủy: { vi:"nhạy bén, sâu sắc, giao cảm", en:"perceptive, deep, connective" },
};

const elementMeta = {
  Mộc: { vi:{color:"xanh lá", jobs:"giáo dục – thiết kế – nội dung; cố vấn phát triển"}, en:{color:"green", jobs:"education/design/content; advisory"} },
  Hỏa: { vi:{color:"đỏ/cam", jobs:"truyền thông, trình diễn, năng lượng"}, en:{color:"red/orange", jobs:"media, performance, energy"} },
  Thổ: { vi:{color:"vàng/đất", jobs:"quản trị, vận hành, bất động sản"}, en:{color:"yellow/earth", jobs:"operations, management, real estate"} },
  Kim: { vi:{color:"trắng/ánh kim", jobs:"tài chính, kỹ thuật, pháp chế"}, en:{color:"white/metallic", jobs:"finance, engineering, compliance"} },
  Thủy: { vi:{color:"xanh dương/đen", jobs:"CNTT – dữ liệu, nghiên cứu, logistics"}, en:{color:"blue/black", jobs:"IT/data, research, logistics"} },
};

/* ------------------------- Intent detection ------------------------- */
const determineIntent = (contentRaw = "", lang = "vi") => {
  const content = rmDiacritics(contentRaw.toLowerCase());

  // overview trigger
  if (/hay xem bat tu|xem bat tu cho minh|xem bat tu/i.test(content)) return "overview";

  if (/suc khoe|benh|health|stress|giac ngu|met moi/.test(content)) return "health";
  if (/tinh cam|hon nhan|yeu|nguoi yeu|love|romance|ket hon/.test(content)) return "love";
  if (/tai van|tien bac|tai chinh|tien|wealth|money|thu nhap|chi tieu|dau tu/.test(content)) return "money";
  if (/su nghiep|nghe nghiep|cong viec|career|thang tien|chuyen mon|startup|kinh doanh/.test(content)) return "career";
  if (/gia dao|gia dinh|family|cha me|vo chong|anh chi em/.test(content)) return "family";
  if (/con cai|children|nuoi day|hoc hanh/.test(content)) return "children";
  if (/tai san|bat dong san|property|nha cua|dat dai|mua nha/.test(content)) return "property";
  if (/khi nao|luc nao|thoi diem|may man|gio tot|ngay tot|thang nao|nam nao|lucky|when/.test(content)) return "timing";
  if (/mau|mau sac|ao|quan|thoi trang|color|dress|wear/.test(content)) return "colors";
  if (/(hay|hoac| or ).+/.test(content) && /(hay|hoac| or )/.test(content)) return "pair-choice";
  if (/the thao|tap luyen|bong|chay bo|gym|yoga|swim|run|football/.test(content)) return "sports";
  if (/am thuc|an gi|food|mon|keto|thuong thuc|nau/.test(content)) return "food";
  if (/thu cung|pet|cho|meo|hamster|nuoi con gi/.test(content)) return "pets";
  if (/du lich|travel|di dau|hanh trinh|lich trinh/.test(content)) return "travel";
  if (/hoc tap|education|tu hoc|bang cap|khoa hoc/.test(content)) return "education";

  return "unknown";
};

/* ------------------------- Writers ------------------------- */
const pct = (n) => `${(+n).toFixed(2)}%`;

const writeOverview = (tuTru, perc, dung, lang="vi") => {
  const nhatChu = tuTru.ngay.split(" ")[0];
  const dmHanh = canNguHanh[nhatChu];
  const order = ["Mộc","Hỏa","Thổ","Kim","Thủy"];
  const weak = order.reduce((m,k)=>( (perc[k]??999) < (perc[m]??999) ? k : m ), order[0]);
  const dominant = order.reduce((m,k)=>( (perc[k]??-1) > (perc[m]??-1) ? k : m ), order[0]);

  const eMeta = elementMeta[dung] || elementMeta[dominant];
  const elemLine =
    ["Mộc","Hỏa","Thổ","Kim","Thủy"].map(h=>`${h} ${pct(perc[h]||0)}`).join(", ");

  if (lang === "vi") {
    return [
      `Xin chào bạn, mình đã xem Bát Tự: **Giờ ${tuTru.gio} – Ngày ${tuTru.ngay} – Tháng ${tuTru.thang} – Năm ${tuTru.nam}**.`,
      `**Nhật Chủ ${nhatChu} (${dmHanh})** – phong thái ${personality[dmHanh].vi}.`,
      `Bức tranh ngũ hành: ${elemLine}. ${dominant} đang nổi, **${weak}** mỏng ⇒ nên bồi **${dung}** để cân bằng.`,
      `Lĩnh vực hợp cơ địa: ${eMeta.vi.jobs}.`,
      `Màu/không gian gợi ý: ${eMeta.vi.color}.`,
      `Nếu bạn muốn, mình có thể đi sâu ngay vào *tài vận, sự nghiệp, tình cảm, sức khỏe, gia đạo, con cái, đầu tư, thời điểm may mắn*… điều bạn quan tâm nhất là gì?`
    ].join("\n");
  }
  return [
    `Hello! I’ve read your BaZi: **Hour ${tuTru.gio} – Day ${tuTru.ngay} – Month ${tuTru.thang} – Year ${tuTru.nam}**.`,
    `**Day Master ${nhatChu} (${dmHanh})** – ${personality[dmHanh].en}.`,
    `Five Elements: ${elemLine}. ${dominant} is strong while **${weak}** is light ⇒ nourish **${dung}** to balance.`,
    `Fitting domains: ${eMeta.en.jobs}.`,
    `Supportive mood/colors: ${eMeta.en.color}.`,
    `Tell me what you care most about now — wealth, career, love, health, family, kids, property, or lucky timing — I’ll dive right in.`
  ].join("\n");
};

const writeMoney = (perc, dung, lang="vi") => {
  const tone = (lang==="vi") ? {
    title:"### Tài vận",
    core:"Dòng **Thủy** biểu trưng tài khí; khi **Hỏa**/**Mộc** hỗ trợ, tư duy và mối quan hệ mở ra cơ hội sáng.",
    do:"• Kỷ luật ngân sách 50/30/20. • Ưu tiên tài sản cố định/kiến thức. • Làm việc có quy trình/OKR.",
    boost:`• Bồi **${dung}** bằng thói quen tương ứng (màu, không gian, nhịp sinh hoạt).`,
  } : {
    title:"### Wealth",
    core:"**Water** carries cashflow; with **Fire/Wood**, ideas and networks unlock opportunities.",
    do:"• Budget 50/30/20. • Prioritize fixed assets/knowledge. • Work with clear OKRs.",
    boost:`• Nourish **${dung}** through colors, environment, and routines.`,
  };
  return [tone.title, tone.core, tone.do, tone.boost].join("\n");
};

const writeCareer = (dung, lang="vi") => {
  const meta = elementMeta[dung][lang];
  return (lang==="vi")
    ? [
        "### Sự nghiệp",
        `Thế mạnh: làm việc có cấu trúc, giữ nhịp đều. Hợp môi trường **${meta.jobs}**.`,
        "Gợi ý: chọn vai *xương sống* của đội (vận hành/lead mảng rõ ràng), đặt OKR và review tuần."
      ].join("\n")
    : [
        "### Career",
        `Strength: structured, consistent execution. Suitable domains: **${meta.jobs}**.`,
        "Tip: pick a backbone role (ops/clear ownership), set OKRs and weekly reviews."
      ].join("\n");
};

const writeHealth = (weakElem, lang="vi") => {
  const text = (lang==="vi")
    ? [
        "### Sức khỏe",
        `Điểm cần giữ là **${weakElem}** ⇒ cân bằng qua giấc ngủ đều, nắng sớm, vận động vừa.`,
        "Thực hành: 10–15' đi bộ sau bữa tối; tắt màn hình trước giờ ngủ 45'."
      ]
    : [
        "### Health",
        `Watch your **${weakElem}** ⇒ balance with steady sleep, morning light, moderate movement.`,
        "Practice: 10–15' evening walk; screens off 45' before bed."
      ];
  return text.join("\n");
};

const writeLove = (tuTru, lang="vi") => {
  const ngayChi = tuTru.ngay.split(" ")[1];
  const line = (lang==="vi")
    ? `Tín hiệu hợp: người có nhịp sống ổn định, mục tiêu dài hạn. Giao tiếp thẳng thắn. (Ngày **${ngayChi}** nên ưu tiên chi Lục hợp/Tam hợp khi chọn bạn đời).`
    : `Match: steady lifestyle, long-term goals; direct communication. (Day branch **${ngayChi}** prefers Six/Triple-Harmony partners).`;
  return (lang==="vi") ? ["### Tình cảm", line].join("\n") : ["### Love", line].join("\n");
};

const writeFamily = (lang="vi") => (
  (lang==="vi")
    ? "### Gia đạo\nDuy trì 1 cuộc hẹn gia đình chất lượng/tuần; quy ước “nói thật – lắng nghe – không phán xét”."
    : "### Family\nKeep one quality family meeting/week; agree on honest talk – listening – no judgement."
);

const writeChildren = (lang="vi") => (
  (lang==="vi")
    ? "### Con cái\nKhơi gợi sáng tạo qua dự án nhỏ theo tuần; khen nỗ lực, không chỉ kết quả."
    : "### Children\nSpark creativity via small weekly projects; praise effort, not only results."
);

const writeProperty = (lang="vi") => (
  (lang==="vi")
    ? "### Tài sản/Đầu tư\nƯu tiên tài sản hữu hình/giáo dục dài hạn; tránh vay đòn bẩy khi dòng tiền chưa ổn."
    : "### Assets/Investment\nPrefer tangible assets/education; avoid leverage while cashflow is unstable."
);

const writeTiming = (dung, lang="vi") => {
  const gioTot = {
    Mộc: "03:00–05:00 (Dần) hoặc 05:00–07:00 (Mão)",
    Hỏa: "09:00–11:00 (Tỵ) hoặc 11:00–13:00 (Ngọ)",
    Thổ: "07:00–09:00 (Thìn) hoặc 19:00–21:00 (Tuất)",
    Kim: "15:00–17:00 (Thân) hoặc 17:00–19:00 (Dậu)",
    Thủy: "21:00–23:00 (Hợi) hoặc 23:00–01:00 (Tý)",
  };
  const thangTot = {
    Mộc: "tháng Dần–Mão", Hỏa: "tháng Tỵ–Ngọ", Thổ: "Thìn–Tuất–Sửu–Mùi",
    Kim: "tháng Thân–Dậu", Thủy: "tháng Hợi–Tý",
  };
  return (lang==="vi")
    ? [
        "### Thời điểm may mắn (định hướng)",
        `Bồi **${dung}** ⇒ khung giờ thuận: ${gioTot[dung]}.`,
        `Mùa/tháng dễ “bắt sóng”: **${thangTot[dung]}**.`,
        "Đặt việc khó vào khung trên; giữ thói quen đều để tận dụng vận tốt."
      ].join("\n")
    : [
        "### Favorable timing (guidance)",
        `Nourish **${dung}** ⇒ time windows: ${gioTot[dung]}.`,
        `Months with smoother flow: **${thangTot[dung]}**.`,
        "Schedule hard tasks in those windows; routines catch the tailwind."
      ].join("\n");
};

const writeColors = (dung, lang="vi") => {
  const m = elementMeta[dung][lang].color;
  return (lang==="vi")
    ? `### Màu sắc\nHợp nhất: **${m}** (bồi **${dung}**). Dùng ở trang phục/đồ dùng/không gian khi cần tự tin & tập trung.`
    : `### Colors\nBest: **${m}** (nourishes **${dung}**). Use in outfit/space when you need confidence & focus.`;
};

/* ------------------------- Pair choice (A/B) ------------------------- */
const chooseBetween = (domain, left, right, dungThanList = [], lang = "vi", tuTru=null) => {
  const d = dungThanList[0] || "Hỏa";
  const vi = {
    pick: (x) => `Chọn **${x}**`,
    because: (r) => ` vì ${r}.`,
  };
  const en = {
    pick: (x) => `Choose **${x}**`,
    because: (r) => ` because ${r}.`,
  };
  const L = left.trim(); const R = right.trim();

  // Love: tuổi… hay tuổi…
  if (domain === "love") {
    const dayChi = tuTru?.ngay?.split(" ")[1];
    const a = findChiFromText(left); const b = findChiFromText(right);
    if (dayChi && (a || b)) {
      const score = (c) => {
        if (!c) return 0;
        let s = 0;
        if (lucHop[dayChi] === c) s += 3;
        if (tamHop.some(g => g.includes(dayChi) && g.includes(c))) s += 1;
        if (sameGroup(dayChi, c, xungGroups)) s -= 2;
        return s;
      };
      const sA = score(a), sB = score(b);
      const pick = sA >= sB ? L : R;
      const reason = (lang==="vi")
        ? `phù hợp chi ngày **${dayChi}** (ưu tiên Lục hợp/Tam hợp, tránh xung)`
        : `more compatible with day branch **${dayChi}** (harmonies over clashes)`;
      return (lang==="vi") ? `${vi.pick(pick)}${vi.because(reason)}` : `${en.pick(pick)}${en.because(reason)}`;
    }
  }

  // Colors
  if (domain === "colors") {
    const meta = elementMeta[d][lang].color;
    const reason = (lang==="vi")
      ? `phù hợp mệnh dụng **${d}** (tông gợi ý: ${meta})`
      : `fits useful element **${d}** (suggested tones: ${meta})`;
    return (lang==="vi") ? `${vi.pick(L)}${vi.because(reason)}` : `${en.pick(L)}${en.because(reason)}`;
  }

  // Career
  if (domain === "career") {
    const reason = (lang==="vi")
      ? `bổ **${d}**: vai trò có quy trình, chỉ số rõ ràng`
      : `nourishes **${d}**: roles with structure & metrics`;
    return (lang==="vi") ? `${vi.pick(L)}${vi.because(reason)}` : `${en.pick(L)}${en.because(reason)}`;
  }

  // Sports
  if (domain === "sports") {
    const reason = (lang==="vi")
      ? `giữ nhịp đều, ít rủi ro (hợp xây nhịp **${d}**)`
      : `steady cadence, lower risk (helps build **${d}** rhythm)`;
    return (lang==="vi") ? `${vi.pick(L)}${vi.because(reason)}` : `${en.pick(L)}${en.because(reason)}`;
  }

  // Pets
  if (domain === "pets") {
    const reason = (lang==="vi")
      ? `đỡ tốn sức chăm ban đầu; phù hợp nhịp sống hiện tại`
      : `lighter care load; fits current routine`;
    return (lang==="vi") ? `${vi.pick(L)}${vi.because(reason)}` : `${en.pick(L)}${en.because(reason)}`;
  }

  // Default
  return (lang==="vi")
    ? `Bạn có thể chọn **${L}** hoặc **${R}**; hãy ưu tiên thứ giúp bạn tiến gần mục tiêu ngay tuần này.`
    : `Both **${L}** and **${R}** work; pick the one that moves you closer to your goal this week.`;
};

/* ------------------------- OpenAI ------------------------- */
const callOpenAI = async (messages, model = process.env.OPENAI_MODEL || "gpt-3.5-turbo") => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY");
  const url = "https://api.openai.com/v1/chat/completions";
  const payload = { model, messages, temperature: 0.6, max_tokens: 1200 };
  const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type":"application/json" };
  const res = await axios.post(url, payload, { headers, timeout: 30000 });
  return res.data?.choices?.[0]?.message?.content?.trim() || "";
};

/* ------------------------- Main route ------------------------- */
app.post("/api/luan-giai-bazi", async (req, res) => {
  const start = Date.now();
  try {
    const { messages = [], tuTruInfo, dungThan } = req.body;
    const lang = guessLanguage(messages);
    const userInput = (messages.slice().reverse().find(m => m.role === "user")?.content || "").trim();

    if (!tuTruInfo || typeof tuTruInfo !== "string") {
      return res.status(400).json({ error: lang==="vi" ? "Thiếu tuTruInfo" : "Missing tuTruInfo" });
    }

    // Parse Tứ Trụ
    let tuTru;
    try {
      const raw = JSON.parse(tuTruInfo);
      tuTru = {
        gio: normalizeCanChi(raw.gio),
        ngay: normalizeCanChi(raw.ngay),
        thang: normalizeCanChi(raw.thang),
        nam: normalizeCanChi(raw.nam),
      };
      if (!tuTru.gio || !tuTru.ngay || !tuTru.thang || !tuTru.nam) throw new Error("invalid");
    } catch {
      const parsed = parseEnglishTuTru(userInput);
      if (!parsed) return res.status(400).json({ error: lang==="vi" ? "Tứ Trụ không hợp lệ" : "Invalid Four Pillars" });
      tuTru = parsed;
    }

    // Dụng Thần
    const dungThanList = Array.isArray(dungThan) ? dungThan : (dungThan?.hanh || []);
    const validElems = ["Mộc","Hỏa","Thổ","Kim","Thủy"];
    if (!dungThanList.length || !dungThanList.every(e => validElems.includes(e))) {
      return res.status(400).json({ error: lang==="vi" ? "Dụng Thần không hợp lệ" : "Invalid Useful God" });
    }
    const dung = dungThanList[0];

    // Cache key
    const cacheKey = `${tuTruInfo}|${dung}|${lang}|${rmDiacritics(userInput)}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ answer: cached, cached: true });

    // Intent
    const intent = determineIntent(userInput, lang);

    // For unknown intent -> send to GPT directly (no internal compute)
    if (intent === "unknown") {
      const system = (lang==="vi")
        ? "Bạn là trợ lý thân thiện, truyền cảm, trả lời ngắn gọn nhưng ấm áp và thực tế."
        : "You are a warm, empathetic assistant. Answer briefly, warmly and practically.";
      const gptAns = await callOpenAI([{ role:"system", content: system }, ...messages]);
      cache.set(cacheKey, gptAns);
      return res.json({ answer: gptAns, model: "gpt-3.5-turbo", time: Date.now()-start });
    }

    // For recognized intents: we do light internal compute
    const counts = analyzeNguHanh(tuTru);
    const total = Object.values(counts).reduce((a,b)=>a+b,0);
    const perc = Object.fromEntries(Object.entries(counts).map(([k,v]) => [k, (v/total)*100]));
    const order = ["Mộc","Hỏa","Thổ","Kim","Thủy"];
    const weakElem = order.reduce((m,k)=>( (perc[k]??999) < (perc[m]??999) ? k : m ), order[0]);

    let answer = "";
    if (intent === "overview") answer = writeOverview(tuTru, perc, dung, lang);
    else if (intent === "money") answer = writeMoney(perc, dung, lang);
    else if (intent === "career") answer = writeCareer(dung, lang);
    else if (intent === "health") answer = writeHealth(weakElem, lang);
    else if (intent === "love") answer = writeLove(tuTru, lang);
    else if (intent === "family") answer = writeFamily(lang);
    else if (intent === "children") answer = writeChildren(lang);
    else if (intent === "property") answer = writeProperty(lang);
    else if (intent === "timing") answer = writeTiming(dung, lang);
    else if (intent === "colors") answer = writeColors(dung, lang);
    else if (intent === "sports") answer = (lang==="vi")
      ? "### Thể thao\nƯu tiên bộ môn nhịp đều, tránh chấn thương: đi bộ nhanh, bơi, đạp xe/yoga. Mục tiêu: 150’/tuần."
      : "### Sports\nPrefer steady, low-injury sports: brisk walk, swim, bike/yoga. Aim: 150’/week.";
    else if (intent === "food") answer = (lang==="vi")
      ? "### Ẩm thực\nChế độ “vừa đủ”: 80/20; nấu đơn giản, đạm vừa, nhiều rau củ theo mùa; uống nước ấm vào sáng."
      : "### Food\nSimple 80/20 plate; moderate protein, seasonal veggies; warm water in the morning.";
    else if (intent === "pets") answer = (lang==="vi")
      ? "### Thú cưng\nNếu lịch bận: chọn mèo/cá; nếu thích giao tiếp ngoài trời: chọn chó (giống cỡ vừa, hiền)."
      : "### Pets\nBusy routine: pick cat/fish; outdoor social: pick a mid-size, gentle dog.";
    else if (intent === "education") answer = (lang==="vi")
      ? "### Học tập\nChọn 1 kỹ năng lõi và 1 dự án ứng dụng/6 tuần. Nhịp: 45’ học + 15’ ôn, 5 ngày/tuần."
      : "### Learning\nPick one core skill and one applied project/6 weeks. Cadence: 45’ study + 15’ review, 5 days/week.";
    else if (intent === "travel") answer = (lang==="vi")
      ? "### Du lịch\nƯu tiên nơi có ánh sáng tự nhiên, gần nước/cây xanh; đi chậm, ghi chép 3 điều biết ơn mỗi ngày."
      : "### Travel\nPick sunlight, water/greens; slow travel; journal 3 gratitudes daily.";
    else if (intent === "pair-choice") {
      // detect the two options around "hay/hoặc/or"
      const m = userInput.match(/(.+?)\s*(?:hay|hoac|or)\s*(.+)/i);
      const left = m?.[1]?.trim() || "A";
      const right = m?.[2]?.trim() || "B";
      // domain guess
      const domain =
        /mau|ao|quan|color|purple|brown|blue|red/i.test(userInput) ? "colors" :
        /tuoi|con giap|suu|dan|ty|mao|thin|ty|ngo|mui|than|dau|tuat|hoi/i.test(userInput) ? "love" :
        /nghe|job|career|vi tri/i.test(userInput) ? "career" :
        /the thao|sport|yoga|gym|run|bong/i.test(userInput) ? "sports" :
        /thu cung|pet|cho|meo|hamster/i.test(userInput) ? "pets" : "general";
      answer = chooseBetween(domain, left, right, dungThanList, lang, tuTru);
    }

    // If after all still blank → delegate to GPT with context
    if (!answer) {
      const system = (lang==="vi")
        ? "Bạn là trợ lý thân thiện, truyền cảm, trả lời ấm áp và thực tế."
        : "You are a warm, empathetic assistant. Be concise and practical.";
      const gptAns = await callOpenAI([{ role:"system", content: system }, ...messages]);
      cache.set(cacheKey, gptAns);
      return res.json({ answer: gptAns, model: "gpt-3.5-turbo", time: Date.now()-start });
    }

    cache.set(cacheKey, answer);
    return res.json({ answer, time: Date.now()-start });
  } catch (err) {
    console.error("Server error:", err.message);
    return res.status(500).json({ error: "Internal error", detail: err.message });
  }
});

/* ------------------------- Start server ------------------------- */
const port = process.env.PORT || 10000;
const server = app.listen(port, () => {
  console.log(`Bazi Assistant running on port ${port}`);
});
server.setTimeout(300000);
