// server.js
// ──────────────────────────────────────────────────────────────────────────────
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const NodeCache = require("node-cache");
const fs = require("fs");
require("dotenv").config();

const app = express();
const cache = new NodeCache({ stdTTL: 600 });

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/health", (_, res) => res.status(200).send("OK"));

// ──────────────────────── Utilities ─────────────────────────
const rmDiacritics = (s = "") =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

const looksVI = (txt = "") =>
  /ngay|thang|nam|gio|giap|at|binh|dinh|mau|ky|canh|tan|nham|quy|ty|suu|dan|mao|thin|ty|ngo|mui|than|dau|tuat|hoi/i.test(
    rmDiacritics(txt)
  );

const guessLang = (messages = []) =>
  looksVI(messages.map((m) => m.content || "").join(" ")) ? "vi" : "en";

const getLastUserText = (messages = []) =>
  [...messages].reverse().find((m) => m.role === "user")?.content || "";

// ──────────────────────── Can–Chi maps ─────────────────────
const heavenlyStemsMap = {
  en: {
    Jia: "Giáp",
    Yi: "Ất",
    Bing: "Bính",
    Ding: "Đinh",
    Wu: "Mậu",
    Ji: "Kỷ",
    Geng: "Canh",
    Xin: "Tân",
    Ren: "Nhâm",
    Gui: "Quý",
  },
  vi: {
    Giáp: "Giáp",
    Ất: "Ất",
    Bính: "Bính",
    Đinh: "Đinh",
    Mậu: "Mậu",
    Kỷ: "Kỷ",
    Canh: "Canh",
    Tân: "Tân",
    Nhâm: "Nhâm",
    Quý: "Quý",
  },
};
const earthlyBranchesMap = {
  en: {
    Rat: "Tý",
    Ox: "Sửu",
    Tiger: "Dần",
    Rabbit: "Mão",
    Dragon: "Thìn",
    Snake: "Tỵ",
    Horse: "Ngọ",
    Goat: "Mùi",
    Monkey: "Thân",
    Rooster: "Dậu",
    Dog: "Tuất",
    Pig: "Hợi",
  },
  vi: {
    Tý: "Tý",
    Sửu: "Sửu",
    Dần: "Dần",
    Mão: "Mão",
    Thìn: "Thìn",
    Tỵ: "Tỵ",
    Ngọ: "Ngọ",
    Mùi: "Mùi",
    Thân: "Thân",
    Dậu: "Dậu",
    Tuất: "Tuất",
    Hợi: "Hợi",
  },
};
const canNguHanh = {
  Giáp: "Mộc",
  Ất: "Mộc",
  Bính: "Hỏa",
  Đinh: "Hỏa",
  Mậu: "Thổ",
  Kỷ: "Thổ",
  Canh: "Kim",
  Tân: "Kim",
  Nhâm: "Thủy",
  Quý: "Thủy",
};
const chiNguHanh = {
  Tý: "Thủy",
  Hợi: "Thủy",
  Sửu: "Thổ",
  Thìn: "Thổ",
  Mùi: "Thổ",
  Tuất: "Thổ",
  Dần: "Mộc",
  Mão: "Mộc",
  Tỵ: "Hỏa",
  Ngọ: "Hỏa",
  Thân: "Kim",
  Dậu: "Kim",
};

const normalizeCanChi = (pair) => {
  if (!pair || typeof pair !== "string") return null;
  const [rawCan, rawChi] = pair.trim().split(/\s+/);
  if (!rawCan || !rawChi) return null;

  // try VI first
  const canVi = Object.keys(heavenlyStemsMap.vi).find(
    (k) => rmDiacritics(k).toLowerCase() === rmDiacritics(rawCan).toLowerCase()
  );
  const chiVi = Object.keys(earthlyBranchesMap.vi).find(
    (k) => rmDiacritics(k).toLowerCase() === rmDiacritics(rawChi).toLowerCase()
  );
  if (canVi && chiVi) return `${canVi} ${chiVi}`;

  // fallback EN
  const canEn = heavenlyStemsMap.en[rawCan] || null;
  const chiEn = earthlyBranchesMap.en[rawChi] || null;
  if (canEn && chiEn) return `${canEn} ${chiEn}`;

  return null;
};

const parseEnglishTuTru = (input) => {
  try {
    if (!input) return null;
    const re = /([A-Za-z]+)\s+([A-Za-z]+)\s*(hour|day|month|year)/gi;
    const out = {};
    for (const m of input.matchAll(re)) {
      const can = heavenlyStemsMap.en[m[1]] || m[1];
      const chi = earthlyBranchesMap.en[m[2]] || m[2];
      const slot = m[3].toLowerCase();
      const pair = `${can} ${chi}`;
      if (slot === "hour") out.gio = pair;
      if (slot === "day") out.ngay = pair;
      if (slot === "month") out.thang = pair;
      if (slot === "year") out.nam = pair;
    }
    return out.gio && out.ngay && out.thang && out.nam ? out : null;
  } catch {
    return null;
  }
};

// ─────────────────────── Ngũ hành tổng hợp ─────────────────
const analyzeNguHanh = (tuTru) => {
  const count = { Mộc: 0, Hỏa: 0, Thổ: 0, Kim: 0, Thủy: 0 };
  const hidden = {
    Tý: ["Quý"],
    Sửu: ["Kỷ", "Tân", "Quý"],
    Dần: ["Giáp", "Bính", "Mậu"],
    Mão: ["Ất"],
    Thìn: ["Mậu", "Ất", "Quý"],
    Tỵ: ["Bính", "Canh", "Mậu"],
    Ngọ: ["Đinh", "Kỷ"],
    Mùi: ["Kỷ", "Đinh", "Ất"],
    Thân: ["Canh", "Nhâm", "Mậu"],
    Dậu: ["Tân"],
    Tuất: ["Mậu", "Đinh", "Tân"],
    Hợi: ["Nhâm", "Giáp"],
  };

  const parts = [tuTru.gio, tuTru.ngay, tuTru.thang, tuTru.nam]
    .filter(Boolean)
    .map((s) => s.split(" "))
    .flat();

  const branches = [tuTru.gio, tuTru.ngay, tuTru.thang, tuTru.nam]
    .filter(Boolean)
    .map((s) => s.split(" ")[1]);

  if (parts.length < 8) throw new Error("Tứ Trụ không đầy đủ");

  for (const p of parts) {
    if (canNguHanh[p]) count[canNguHanh[p]] += 1;
    if (chiNguHanh[p]) count[chiNguHanh[p]] += 1;
  }
  for (const chi of branches) {
    (hidden[chi] || []).forEach((c) => {
      if (canNguHanh[c]) count[canNguHanh[c]] += 0.3;
    });
  }
  return count;
};

const elementMeta = {
  Mộc: {
    vi: { color: ["xanh lá", "xanh ngọc"], styles: "tối giản, tự nhiên" },
    jobs: ["giáo dục", "thiết kế", "cố vấn phát triển", "nội dung"],
    foods: ["rau xanh", "ngũ cốc", "trái cây xanh"],
    sports: ["yoga", "đi bộ", "cầu lông"],
    pets: ["chó hiền", "mèo lông ngắn"],
  },
  Hỏa: {
    vi: { color: ["đỏ", "cam", "hồng"], styles: "năng động, nổi bật" },
    jobs: ["truyền thông", "biểu diễn", "sales", "năng lượng"],
    foods: ["món ấm nóng", "gia vị cay nhẹ"],
    sports: ["chạy bộ", "bóng rổ", "aerobic"],
    pets: ["chó năng động", "chim cảnh"],
  },
  Thổ: {
    vi: { color: ["vàng", "be", "nâu đất"], styles: "bền vững, tinh gọn" },
    jobs: ["quản trị", "vận hành", "bất động sản", "nông nghiệp"],
    foods: ["khoai, đậu", "thực phẩm nguyên hạt"],
    sports: ["tập tạ nhẹ", "pilates"],
    pets: ["mèo hiền", "chó nhỏ trầm tính"],
  },
  Kim: {
    vi: { color: ["trắng", "bạc", "xám"], styles: "tối giản, chuẩn chỉnh" },
    jobs: ["tài chính", "kỹ thuật", "luật", "QA"],
    foods: ["món giòn nhẹ", "sạch vị"],
    sports: ["gym máy", "bơi"],
    pets: ["cá cảnh", "chó giống gọn gàng"],
  },
  Thủy: {
    vi: { color: ["xanh dương", "đen", "navy"], styles: "thanh lịch, linh hoạt" },
    jobs: ["CNTT – dữ liệu", "logistics", "nghiên cứu"],
    foods: ["hải sản vừa phải", "trái cây mọng nước"],
    sports: ["bơi", "đi bộ công viên"],
    pets: ["cá cảnh", "mèo lười"],
  },
};

// ─────────────────────── Intent engine ─────────────────────
const OR_WORDS = ["hay", "or", "/", "|"];
const isChoiceQuestion = (text) => {
  const t = rmDiacritics(text.toLowerCase());
  return OR_WORDS.some((w) => t.includes(` ${w} `));
};

const splitChoices = (text) => {
  // lấy phần sau câu hỏi
  const t = text.replace(/\?$/, "");
  const lower = rmDiacritics(t.toLowerCase());
  let seg = t;
  for (const w of OR_WORDS) {
    const reg = new RegExp(`\\s${w}\\s`, "i");
    if (reg.test(lower)) {
      seg = t.split(reg)[0] + "|" + t.split(reg)[1];
      break;
    }
  }
  // lấy 2 cụm cuối trước "hay"
  const parts = seg.split("|").map((s) => s.trim());
  if (parts.length === 2) return [parts[0], parts[1]];
  return null;
};

// từ khóa chủ đề (rất rộng)
const TOPICS = {
  money: /tien|tai chinh|thu nhap|tai loc|tai van|dau tu|saving|invest|tiet kiem|chi tieu/i,
  career: /nghe|su nghiep|cong viec|thang tien|job|career|chuyen nganh/i,
  love: /tinh cam|tinh yeu|hon nhan|nguoi yeu|ket hon|romance/i,
  health: /suc khoe|sleep|mat ngu|stress|an uong|tap luyen|health/i,
  family: /gia dinh|gia dao|cha me|vo chong|anh chi em|me chong/i,
  children: /con cai|em be|tre nho|nuoi day|parenting/i,
  property: /tai san|bds|bat dong san|nha dat|so huu/i,
  study: /hoc tap|thi cu|bang cap|ngoai ngu|IELTS|TOEIC|hoc code|university/i,
  productivity: /nang suat|lam viec thong minh|to chuc|thoi quen|thoi gian/i,
  etiquette: /ung xu|giao tiep|lich su|xung ho|vi the/i,
  travel: /du lich|di choi|lich trinh|itinerary|visa|may bay/i,
  tech: /cong nghe|may tinh|app|phan mem|gia lap|devops|data|AI/i,
  beauty: /trang phuc|phong cach|mau sac|mac gi|thoi trang|ao|quan|makeup/i,
  food: /am thuc|an gi|mon|do an|thuc don|che do an|keto|eat/i,
  sport: /the thao|tap|bong|bong da|bong ro|gym|yoga|boi/i,
  pet: /thu cung|cho|meo|pet|nuoi ca|hamster|vet/i,
  luck: /may man|van may|thoi diem may man|lucky|ngay gio tot/i,
  color: /mau|color/i,
};

const detectTopic = (text) => {
  for (const [k, re] of Object.entries(TOPICS)) {
    if (re.test(rmDiacritics(text.toLowerCase()))) return k;
  }
  return "general";
};

const recentlyAnswered = (messages, topicKey) => {
  const last = [...(messages || [])].reverse().slice(0, 6);
  const re = TOPICS[topicKey] || null;
  if (!re) return false;
  return last.some((m) => m.role === "assistant" && re.test(rmDiacritics(m.content || "")));
};

// ─────────────────── Bát Tự narrative blocks ───────────────
const personalityVI = {
  Mộc: "sáng tạo, linh hoạt",
  Hỏa: "nhiệt huyết, chủ động",
  Thổ: "vững chãi, thực tế",
  Kim: "kỷ luật, chuẩn xác",
  Thủy: "nhạy bén, uyển chuyển",
};

const openingNarrative = (lang, tuTru, count, dungThan) => {
  const nhatChu = tuTru.ngay.split(" ")[0];
  const hanh = canNguHanh[nhatChu];
  const sum = Object.entries(count).reduce((a, [, v]) => a + v, 0) || 1;
  const pct = (v) => `${((v / sum) * 100).toFixed(2)}%`;
  const top = Object.entries(count).sort((a, b) => b[1] - a[1])[0][0];
  const weak = Object.entries(count).sort((a, b) => a[1] - b[1])[0][0];
  const chosen = (Array.isArray(dungThan) ? dungThan[0] : null) || weak;

  if (lang === "vi") {
    const meta = elementMeta[chosen].vi;
    return [
      `Xin chào bạn, mình đã xem Bát Tự: **Giờ ${tuTru.gio} – Ngày ${tuTru.ngay} – Tháng ${tuTru.thang} – Năm ${tuTru.nam}**.`,
      `Nhật Chủ **${nhatChu} (${hanh})** – ${personalityVI[hanh]}.`,
      `Cân bằng Ngũ Hành: Mộc ${pct(count["Mộc"])}, Hỏa ${pct(count["Hỏa"])}, Thổ ${pct(count["Thổ"])}, Kim ${pct(count["Kim"])}, Thủy ${pct(count["Thủy"])}.`,
      `Bức tranh tổng thể: **${top}** đang mạnh, **${weak}** còn yếu → nên bồi bổ **${chosen}**.`,
      `Gợi ý nhanh: màu hợp **${meta.color.join("/")}**, phong cách **${meta.styles}**.`,
    ].join("\n");
  }
  // English (if ever needed)
  return `Your chart shows Day Master ${nhatChu} (${hanh}). Five-Elements balance suggests adding ${chosen}.`;
};

// ───────────────── Choice resolver by element ───────────────
const pickByElement = (hanh, a, b) => {
  const E = elementMeta[hanh] ? hanh : "Thổ";
  const colors = elementMeta[E].vi.color;
  const foods = elementMeta[E].foods.join(" ").toLowerCase();
  const sports = elementMeta[E].sports.join(" ").toLowerCase();
  const jobs = elementMeta[E].jobs.join(" ").toLowerCase();

  const A = rmDiacritics((a || "").toLowerCase());
  const B = rmDiacritics((b || "").toLowerCase());

  // color decision
  const inColors = (x) => colors.some((c) => rmDiacritics(c).includes(x) || x.includes(rmDiacritics(c)));
  if (inColors(A) !== inColors(B)) return inColors(A) ? a : b;

  // food
  const hasFood = (x) => foods.includes(x);
  if (hasFood(A) !== hasFood(B)) return hasFood(A) ? a : b;

  // sport
  const hasSport = (x) => sports.includes(x);
  if (hasSport(A) !== hasSport(B)) return hasSport(A) ? a : b;

  // job
  const hasJob = (x) => jobs.includes(x);
  if (hasJob(A) !== hasJob(B)) return hasJob(A) ? a : b;

  // fallback: prefer simpler/neutral option
  return a.length <= b.length ? a : b;
};

// ─────────────────── OpenAI helpers ─────────────────────────
const checkOpenAIKey = async () => {
  if (!process.env.OPENAI_API_KEY) return false;
  try {
    await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
        messages: [{ role: "user", content: "ping" }],
        max_tokens: 1,
      },
      { headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, timeout: 8000 }
    );
    return true;
  } catch (err) {
    if (err.response && err.response.status === 401) return false;
    return true;
  }
};

const callOpenAI = async (payload) => {
  const res = await axios.post("https://api.openai.com/v1/chat/completions", payload, {
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    timeout: 30000,
  });
  return res.data?.choices?.[0]?.message?.content?.trim();
};

// ─────────────────── Core response builders ─────────────────
const buildGeneralAnswerVI = (topic, tuTru, count, dungThan, ask) => {
  const nhatChu = tuTru.ngay.split(" ")[0];
  const hanh = canNguHanh[nhatChu];
  const chosen = (Array.isArray(dungThan) ? dungThan[0] : null) || hanh;
  const meta = elementMeta[chosen].vi;

  const lines = [];

  if (topic === "health") {
    lines.push(
      `Sức khoẻ tinh thần: duy trì ngủ đủ, thiền/đi bộ 10–15 phút mỗi ngày.`,
      `Gợi ý hợp **${chosen}**: nghe nhạc nhẹ, không gian ${meta.color.join("/")} giúp cân bằng.`
    );
  } else if (topic === "money") {
    lines.push(
      `Tài vận: ưu tiên **tài sản cố định** và kỹ luật chi tiêu.`,
      `Chiến lược nhanh: 50/30/20; tăng nguồn thu nhờ kỹ năng liên quan đến **${elementMeta[chosen].jobs[0]}**.`
    );
  } else if (topic === "career") {
    lines.push(
      `Nghề hợp hành **${chosen}**: ${elementMeta[chosen].jobs.join(", ")}.`,
      `Mẹo 90 ngày: chọn 1 kỹ năng lõi → luyện 30 phút/ngày → đo tác động hàng tuần.`
    );
  } else if (topic === "love") {
    lines.push(
      `Tình cảm thuận khi giao tiếp chân thành, hẹn khung giờ bạn thấy sáng tạo/thoải mái.`,
      `Giữ màu ${meta.color.join("/")} khi gặp gỡ để tạo cảm giác hợp hành.`
    );
  } else if (topic === "color" || topic === "beauty") {
    lines.push(
      `Phối màu hợp: **${meta.color.join(" / ")}**. Phong cách: **${meta.styles}**.`,
      `Nếu phải chọn giữa hai màu, ưu tiên màu gắn với **${chosen}**.`
    );
  } else if (topic === "food") {
    lines.push(
      `Ẩm thực hợp: ${elementMeta[chosen].foods.join(", ")}.`,
      `Tránh thái cực (quá nhiều đường/dầu).`
    );
  } else if (topic === "sport") {
    lines.push(
      `Thể thao nên thử: ${elementMeta[chosen].sports.join(", ")}.`,
      `Nếu bận rộn: công thức 15 phút – khởi động 3’, bài chính 10’, giãn cơ 2’.`
    );
  } else if (topic === "pet") {
    lines.push(
      `Thú cưng hợp tính: ${elementMeta[chosen].pets.join(", ")}.`,
      `Nguyên tắc: vừa sức chăm, sạch sẽ, không ảnh hưởng hàng xóm.`
    );
  } else if (topic === "study") {
    lines.push(
      `Học tập: chọn phương pháp **lặp ngắt quãng** (spaced repetition).`,
      `Tận dụng khung giờ bạn tỉnh táo nhất trong ngày để học 25’ (Pomodoro).`
    );
  } else if (topic === "productivity") {
    lines.push(
      `Năng suất: “Plan–Do–Review” mỗi ngày 10’.`,
      `Dọn bớt nhiễu: mute thông báo, batch việc tương tự trong 30–60’.`
    );
  } else if (topic === "travel") {
    lines.push(
      `Du lịch: ưu tiên hành trình gọn – 3 điểm chính/ngày.`,
      `Mang theo 1 màu chủ đạo ${meta.color.join("/")} cho ảnh lên hình đẹp và hợp hành.`
    );
  } else if (topic === "luck") {
    lines.push(
      `May mắn tăng khi bạn kiên định mục tiêu ngắn hạn và giao tiếp rõ ràng.`,
      `Giữ tông màu ${meta.color.join("/")} trong những dịp quan trọng.`
    );
  } else {
    // generic outside
    lines.push(
      `Bạn có thể hỏi sâu hơn theo chủ đề cụ thể (ví dụ: ẩm thực, thể thao, thú cưng, học tập, du lịch, tài chính, nghề nghiệp…).`,
      `Nếu là câu **lựa chọn A hay B**, mình sẽ chọn giúp theo hành **${chosen}** và tiêu chí thực tế.`
    );
  }

  // chống lặp: không nhắc lại màu khi topic không liên quan
  if (!["color", "beauty", "love", "travel"].includes(topic)) {
    // không thêm màu nữa
  }

  return lines.join("\n");
};

// ───────────────────── Main route ───────────────────────────
app.post("/api/luan-giai-bazi", async (req, res) => {
  const started = Date.now();
  try {
    const { messages, tuTruInfo, dungThan } = req.body || {};
    const lang = guessLang(messages);
    const userText = getLastUserText(messages);
    const topic = detectTopic(userText);

    // cache key
    const cacheKey = `${tuTruInfo}|${lang}|${userText}`;
    const hit = cache.get(cacheKey);
    if (hit) return res.json({ answer: hit });

    // parse Tứ Trụ
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
      const fallback = parseEnglishTuTru(userText);
      if (!fallback) {
        return res.status(400).json({ error: lang === "vi" ? "Tứ Trụ không hợp lệ" : "Invalid Four Pillars" });
      }
      tuTru = fallback;
    }

    const dungThanArr = Array.isArray(dungThan) ? dungThan : (dungThan?.hanh || []);
    if (!dungThanArr.every((d) => ["Mộc", "Hỏa", "Thổ", "Kim", "Thủy"].includes(d))) {
      return res.status(400).json({ error: lang === "vi" ? "Dụng Thần không hợp lệ" : "Invalid Useful God" });
    }

    // phân tích ngũ hành
    const count = analyzeNguHanh(tuTru);
    const nhatChu = tuTru.ngay.split(" ")[0];
    const hanhChu = canNguHanh[nhatChu];
    const chosen = dungThanArr[0] || hanhChu;

    // 1) Nếu là lời mở đầu “Hãy xem bát tự cho mình”
    const isWarmStart = /hay xem bat tu cho minh|hãy xem bát tự cho mình/i.test(
      rmDiacritics(userText)
    );
    if (isWarmStart && !recentlyAnswered(messages, "general")) {
      const intro = openingNarrative(lang, tuTru, count, dungThanArr);
      cache.set(cacheKey, intro);
      return res.json({ answer: intro });
    }

    // 2) Câu hỏi lựa chọn A/B
    if (isChoiceQuestion(userText)) {
      const pair = splitChoices(userText) || [];
      const [A, B] = pair;
      if (A && B) {
        const pick = pickByElement(chosen, A, B);
        const why =
          lang === "vi"
            ? `Mình chọn **${pick}** vì hợp với hành **${chosen}** (ưu tiên màu/phong cách/hoạt động phù hợp).`
            : `I pick **${pick}** as it aligns with element **${chosen}**.`;
        cache.set(cacheKey, why);
        return res.json({ answer: why });
      }
    }

    // 3) Chủ đề trong vùng hỗ trợ mở rộng
    if (topic !== "general") {
      // tránh lặp
      let text = "";
      if (lang === "vi") {
        text = buildGeneralAnswerVI(topic, tuTru, count, dungThanArr, userText);
      } else {
        text = "Ask me in Vietnamese for the most tailored Bazi guidance.";
      }
      // nếu đã trả lời gần đây chủ đề này → rút gọn
      if (recentlyAnswered(messages, topic)) {
        text = text.split("\n")[0]; // câu cốt lõi duy nhất
      }
      cache.set(cacheKey, text);
      return res.json({ answer: text });
    }

    // 4) Ngoài phạm vi → nhờ OpenAI biên tập, có fallback local
    let answer = "";
    const base = buildGeneralAnswerVI("general", tuTru, count, dungThanArr, userText);
    const okKey = await checkOpenAIKey();
    if (okKey && process.env.USE_OPENAI !== "false") {
      const systemVI =
        "Bạn là trợ lý thân thiện, trả lời ngắn gọn, cụ thể theo câu hỏi. Không đoán mò mốc thời gian. Có thể dùng vài gợi ý hợp ngũ hành nếu phù hợp.";
      const promptVI =
        `Ngữ cảnh Bát Tự (tóm tắt): ${openingNarrative("vi", tuTru, count, dungThanArr)}\n` +
        `Câu người dùng: "${userText}".\n` +
        `Nếu câu hỏi không thuộc Bát Tự, hãy trả lời thực tế theo kiến thức thông thường và có thể gợi ý nhẹ theo hành "${chosen}".\n` +
        `Tránh lặp ý đã nói. Trả lời tối đa 5–7 câu, dễ đọc.\n` +
        `Tham khảo gợi ý nền: ${base}`;
      try {
        const gpt = await callOpenAI({
          model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
          messages: [
            { role: "system", content: systemVI },
            { role: "user", content: promptVI },
          ],
          temperature: 0.5,
          max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || "900", 10),
        });
        answer = gpt || base;
      } catch (e) {
        answer = base;
      }
    } else {
      answer = base;
    }

    cache.set(cacheKey, answer);
    return res.json({ answer, note: "ok" });
  } catch (err) {
    try {
      fs.appendFileSync(
        "error.log",
        `${new Date().toISOString()} - ${err.stack || err.message}\n`
      );
    } catch {}
    console.error(err);
    return res.status(500).json({ error: "System error occurred" });
  } finally {
    // eslint-disable-next-line no-console
    console.log(`Done in ${Date.now() - started}ms`);
  }
});

// ──────────────────── Start server ──────────────────────────
const port = process.env.PORT || 10000;
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
server.setTimeout(300000);
