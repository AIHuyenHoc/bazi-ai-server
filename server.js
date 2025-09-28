// server.js (focus: fix màu sắc & không mở rộng chủ đề)
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const NodeCache = require("node-cache");
require("dotenv").config();

const app = express();
const cache = new NodeCache({ stdTTL: 600 });

/* -------------------- middleware -------------------- */
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
}));

app.get("/health", (_, res) => res.status(200).send("OK"));

/* -------------------- util -------------------- */
const rm = s => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const guessLang = (messages=[]) =>
  /ngay|thang|nam|gio|giap|at|binh|dinh|mau|ky|canh|tan|nham|quy|ty|suu|dan|mao|thin|ty|ngo|mui|than|dau|tuat|hoi/i
  .test(rm(messages.map(m=>m.content||"").join(" "))) ? "vi" : "en";

/* -------------------- intent detector (không mở rộng) -------------------- */
function detectIntent(text) {
  const t = rm(text);
  return {
    color: /(mau|màu|color|tone|wear)/.test(t),
    colorAB: /(mau|màu).+(hay|or)/.test(t),
    money: /(tien|ti?n|tai chinh|tai loc|money|wealth|thu nhap|dau tu|investment)/.test(t),
    career: /(nghe|cong viec|su nghiep|career|job|work|chuyen mon|kinh doanh|startup)/.test(t),
    love: /(tinh cam|tinh yeu|hon nhan|love|romance|ket hon|nguoi yeu)/.test(t),
    health: /(suc khoe|s?c khoe|health|benh|ngu ngh?)/.test(t),
    luckTime: /(may man|thoi diem|gio tot|ngay tot|lucky|when).*/.test(t)
  };
}

/* -------------------- mapping màu -> ngũ hành -------------------- */
/* chuẩn hóa cực kì chặt để tránh mâu thuẫn */
const COLOR2ELEMENT = (() => {
  const m = new Map();
  // Thủy
  ["xanh duong","xanh nước biển","den","đen","navy","blue","indigo"].forEach(k=>m.set(rm(k),"Thủy"));
  // Mộc
  ["xanh la","xanh lá","green","xanh la cay","olive"].forEach(k=>m.set(rm(k),"Mộc"));
  // Hỏa
  ["do","đỏ","cam","orange","hong","hồng","tim","tím","magenta","fuchsia"].forEach(k=>m.set(rm(k),"Hỏa"));
  // Thổ
  ["vang","vàng","nau","nâu","be","beige","earth","tan","brown","mustard","kaki","cát"].forEach(k=>m.set(rm(k),"Thổ"));
  // Kim
  ["trang","trắng","bac","bạc","xam","xám","ghi","silver","white","grey","gray","kim","metallic"].forEach(k=>m.set(rm(k),"Kim"));
  // fallback: “xanh” đơn lẻ coi là xanh dương (Thủy)
  m.set("xanh","Thủy");
  return m;
})();

/* chọn màu theo Dụng Thần + sinh khắc (không mâu thuẫn) */
function chooseColorByDungThan(colorList, dungThan=[]) {
  // dungThan là mảng như ["Thổ","Kim"]
  const prefers = Array.isArray(dungThan) ? dungThan : (dungThan?.hanh || []);
  const toElem = c => COLOR2ELEMENT.get(rm(c));
  const candidates = colorList.map(c => ({color:c, elem: toElem(c)}));

  // 1) Ưu tiên màu trùng Dụng Thần (theo thứ tự ưu tiên người dùng truyền vào)
  for (const fav of prefers) {
    const hit = candidates.find(x => x.elem === fav);
    if (hit) return {
      pick: hit.color,
      reason: `Ưu tiên ${fav} (Dụng Thần).`
    };
  }

  // 2) Nếu không trùng, chọn màu ít gây khắc Dụng Thần nhất
  // bảng sinh–khắc tối giản
  const beats = { Mộc:"Thổ", Thổ:"Thủy", Thủy:"Hỏa", Hỏa:"Kim", Kim:"Mộc" }; // khắc
  const weakens = { Mộc:"Hỏa", Hỏa:"Thổ", Thổ:"Kim", Kim:"Thủy", Thủy:"Mộc" }; // sinh xuất (ít xấu hơn)
  function score(elem, favs){
    if (!elem || !favs?.length) return 0;
    let s = 0;
    for (const f of favs){
      if (beats[elem] === f) s -= 2;       // bị khắc → tệ
      else if (elem === weakens[f]) s -= 1; // làm tiết khí Dụng Thần → kém
      else if (elem === f) s += 3;         // (đã loại ở bước 1, giữ để tổng quát)
      else s += 0;
    }
    return s;
  }
  let best = candidates[0];
  let bestS = -999;
  for (const c of candidates){
    const sc = score(c.elem, prefers);
    if (sc > bestS) { best = c; bestS = sc; }
  }
  return {
    pick: best.color,
    reason: best.elem ? `Chọn ${best.color} vì ${best.elem} ít xung khắc Dụng Thần.` : `Chọn ${best.color} vì trung tính với Dụng Thần.`
  };
}

/* trích màu từ câu hỏi (A/B hay 1 màu) */
function extractColorsVI(text) {
  const t = (text || "").toLowerCase();
  // cố gắng bắt “màu X hay màu Y” hoặc “… X hay Y”
  const reAB = /màu\s+([a-zA-ZÀ-ỹ\s]+?)\s+(?:hay|or)\s+màu\s+([a-zA-ZÀ-ỹ\s]+)|màu\s+([a-zA-ZÀ-ỹ\s]+?)\s+(?:hay|or)\s+([a-zA-ZÀ-ỹ\s]+)/i;
  const m = t.match(reAB);
  if (m) {
    const a = (m[1] || m[3] || "").trim();
    const b = (m[2] || m[4] || "").trim();
    return [a, b].filter(Boolean);
  }
  // bắt 1 màu đơn lẻ
  const palette = Array.from(COLOR2ELEMENT.keys());
  for (const key of palette) {
    if (key.length < 3) continue;
    if (t.includes(key)) return [key];
  }
  return [];
}

/* -------------------- OpenAI helper (polish văn phong) -------------------- */
async function polishWithGPT(lang, baseAnswer, topicTag) {
  if (!process.env.OPENAI_API_KEY) return baseAnswer;
  try {
    const sys = lang === "vi"
      ? "Bạn là trợ lý Bát Tự viết súc tích, truyền cảm, trả lời đúng chủ đề được hỏi. Tuyệt đối không mở rộng sang chủ đề khác, không nhắc màu sắc nếu người dùng không hỏi màu. Nhắc Dụng Thần/Thần Sát chỉ khi liên quan trực tiếp."
      : "You are a concise, warm Bazi assistant. Stick strictly to the asked topic, no expansion. Mention Useful God / stars only if directly relevant.";
    const usr = lang === "vi"
      ? `Chủ đề: ${topicTag}. Viết lại đoạn dưới đây theo văn phong gần gũi, mạch lạc, không thêm nội dung mới:\n\n${baseAnswer}`
      : `Topic: ${topicTag}. Rewrite the text below with a warm, clear tone; do not add new topics:\n\n${baseAnswer}`;
    const resp = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
        messages: [{ role: "system", content: sys }, { role: "user", content: usr }],
        temperature: 0.5,
        max_tokens: 800
      },
      { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } }
    );
    return resp.data?.choices?.[0]?.message?.content?.trim() || baseAnswer;
  } catch {
    return baseAnswer;
  }
}

/* -------------------- main route -------------------- */
app.post("/api/luan-giai-bazi", async (req, res) => {
  const { messages, tuTruInfo, dungThan } = req.body || {};
  const lang = guessLang(messages);
  const lastUser = (messages || []).slice().reverse().find(m => m.role === "user")?.content || "";
  const intents = detectIntent(lastUser);
  const cacheKey = JSON.stringify({ tuTruInfo, dungThan, q: lastUser, lang });

  const mem = cache.get(cacheKey);
  if (mem) return res.json({ answer: mem });

  // Lấy Dụng Thần (mảng hành)
  const dung = Array.isArray(dungThan) ? dungThan : (dungThan?.hanh || []);
  const dungTxt = dung.length ? (lang === "vi" ? `Dụng Thần: ${dung.join(", ")}.` : `Useful God: ${dung.join(", ")}.`) : "";

  let answer = "";
  /* ====== 1) CÂU HỎI VỀ MÀU (fix mâu thuẫn & A/B) ====== */
  if (intents.color) {
    const colors = extractColorsVI(lastUser);
    if (colors.length >= 2) {
      const pick = chooseColorByDungThan(colors, dung);
      if (lang === "vi") {
        answer =
          `Chọn **${pick.pick}**. ${pick.reason}\n` +
          (dung.length ? `(${dungTxt} Nếu cần nổi bật hơn, ưu tiên các tông thuộc ${dung.join(" / ")}.)` : "");
      } else {
        answer =
          `Pick **${pick.pick}**. ${pick.reason} ` +
          (dung.length ? `(${dungTxt})` : "");
      }
    } else if (colors.length === 1) {
      const elem = COLOR2ELEMENT.get(rm(colors[0]));
      const ok = dung.includes(elem);
      if (lang === "vi") {
        answer = ok
          ? `**${colors[0]}** phù hợp vì thuộc hành **${elem}** trùng với ${dungTxt}`
          : `**${colors[0]}** thuộc hành **${elem || "trung tính"}**. ${dung.length ? `Để hợp Dụng Thần, bạn có thể chuyển sang tông thuộc ${dung.join(" / ")}.` : ""}`;
      } else {
        answer = ok
          ? `**${colors[0]}** fits (element **${elem}**) and matches ${dungTxt}`
          : `**${colors[0]}** is **${elem || "neutral"}**. ${dung.length ? `For best alignment, prefer ${dung.join(" / ")}.` : ""}`;
      }
    } else {
      // Không nêu màu cụ thể → chỉ gợi ý theo Dụng Thần, không thêm chủ đề khác
      if (lang === "vi") {
        answer = dung.length
          ? `Ưu tiên tông thuộc **${dung.join(" / ")}**. (Ví dụ: Thổ → vàng/đất; Kim → trắng/ánh kim.)`
          : "Bạn có thể mô tả rõ hai lựa chọn màu (A/B) để mình chọn giúp theo Bát Tự.";
      } else {
        answer = dung.length
          ? `Prefer **${dung.join(" / ")}** palettes. (e.g., Earth → yellow/tan; Metal → white/silver.)`
          : "Tell me the two colors (A/B) and I’ll choose per your Bazi.";
      }
    }
    answer = await polishWithGPT(lang, answer, "màu sắc");
    cache.set(cacheKey, answer);
    return res.json({ answer });
  }

  /* ====== 2) CÁC CHỦ ĐỀ KHÁC – TRẢ LỜI GỌN, KHÔNG LAN MAN ====== */
  const shortHeadsVI = {
    money: "Tài chính",
    career: "Công việc",
    love: "Tình cảm",
    health: "Sức khỏe",
    luckTime: "Thời điểm may mắn"
  };
  const shortHeadsEN = {
    money: "Finance",
    career: "Career",
    love: "Love",
    health: "Health",
    luckTime: "Lucky timing"
  };

  function baseTopicReply(tag) {
    const head = lang === "vi" ? shortHeadsVI[tag] : shortHeadsEN[tag];
    // Chỉ gắn Dụng Thần vào kết luận, không mở rộng sang màu/khác
    if (lang === "vi") {
      return [
        `**${head}:**`,
        dung.length ? `Giữ nhịp theo **${dung.join(" / ")}** để thuận khí (Dụng Thần).` : "",
        `Nếu muốn đi sâu hơn, bạn hỏi cụ thể trong phạm vi chủ đề **${head}** (mình sẽ không mở rộng sang phần khác).`
      ].filter(Boolean).join("\n");
    }
    return [
      `**${head}:**`,
      dung.length ? `Align with **${dung.join(" / ")}** (Useful God) to ride favorable Qi.` : "",
      `Ask a specific question within **${head}** and I’ll keep it on-topic.`
    ].filter(Boolean).join("\n");
  }

  if (intents.money)         answer = baseTopicReply("money");
  else if (intents.career)   answer = baseTopicReply("career");
  else if (intents.love)     answer = baseTopicReply("love");
  else if (intents.health)   answer = baseTopicReply("health");
  else if (intents.luckTime) answer = baseTopicReply("luckTime");
  else {
    // Không nhận diện được → giao cho GPT 3.5, nhưng bó cứng: KHÔNG mở rộng sang chủ đề khác
    const sys = lang === "vi"
      ? "Bạn là trợ lý Bát Tự. Trả lời ngắn gọn, truyền cảm, đúng câu hỏi. Không mở rộng sang chủ đề khác. Không nhắc màu nếu người dùng không hỏi màu."
      : "You are a Bazi assistant. Be concise, warm, and strictly on-topic. Do not expand to other topics. Do not mention colors unless asked.";
    const user = (lang === "vi"
      ? `Câu hỏi: ${lastUser}\nBối cảnh: Dụng Thần ${dung.join(", ") || "không xác định"}.\nHãy trả lời đúng trọng tâm, không mở chủ đề mới.`
      : `Question: ${lastUser}\nContext: Useful God ${dung.join(", ") || "n/a"}.\nAnswer on-topic only.`);
    try {
      const resp = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        { model: process.env.OPENAI_MODEL || "gpt-3.5-turbo", messages: [{ role: "system", content: sys }, { role: "user", content: user }], temperature: 0.5, max_tokens: 600 },
        { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } }
      );
      answer = resp.data?.choices?.[0]?.message?.content?.trim() || (lang === "vi" ? "Mình cần thêm chi tiết để trả lời đúng trọng tâm." : "Please give me a bit more detail.");
    } catch {
      answer = lang === "vi" ? "Mình cần thêm chi tiết để trả lời đúng trọng tâm." : "Please give me a bit more detail.";
    }
  }

  answer = await polishWithGPT(lang, answer, "on-topic");
  cache.set(cacheKey, answer);
  return res.json({ answer });
});

/* -------------------- error & server -------------------- */
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "System error" });
});
const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`Server on ${port}`));
