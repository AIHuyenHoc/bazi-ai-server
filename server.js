// server.js
/* eslint-disable no-console */
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const NodeCache = require("node-cache");
require("dotenv").config();

const app = express();
const cache = new NodeCache({ stdTTL: 600 });

/* ----------------------- Middleware & health ----------------------- */
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
  })
);
app.get("/health", (req, res) => res.status(200).send("OK"));

/* ---------------------------- Data maps --------------------------- */
const rmDiacritics = (s = "") =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const heavenlyStemsMap = {
  en: {
    Jia: "Giáp", Yi: "Ất", Bing: "Bính", Ding: "Đinh", Wu: "Mậu",
    Ji: "Kỷ", Geng: "Canh", Xin: "Tân", Ren: "Nhâm", Gui: "Quý",
  },
  vi: {
    Giáp: "Giáp", Ất: "Ất", Bính: "Bính", Đinh: "Đinh", Mậu: "Mậu",
    Kỷ: "Kỷ", Canh: "Canh", Tân: "Tân", Nhâm: "Nhâm", Quý: "Quý",
  },
};
const earthlyBranchesMap = {
  en: {
    Rat: "Tý", Ox: "Sửu", Tiger: "Dần", Rabbit: "Mão", Dragon: "Thìn", Snake: "Tỵ",
    Horse: "Ngọ", Goat: "Mùi", Monkey: "Thân", Rooster: "Dậu", Dog: "Tuất", Pig: "Hợi",
  },
  vi: {
    Tý: "Tý", Sửu: "Sửu", Dần: "Dần", Mão: "Mão", Thìn: "Thìn", Tỵ: "Tỵ",
    Ngọ: "Ngọ", Mùi: "Mùi", Thân: "Thân", Dậu: "Dậu", Tuất: "Tuất", Hợi: "Hợi",
  },
};

const canNguHanh = {
  Giáp: "Mộc", Ất: "Mộc", Bính: "Hỏa", Đinh: "Hỏa", Mậu: "Thổ",
  Kỷ: "Thổ", Canh: "Kim", Tân: "Kim", Nhâm: "Thủy", Quý: "Thủy",
};
const chiNguHanh = {
  Tý: "Thủy", Hợi: "Thủy", Sửu: "Thổ", Thìn: "Thổ", Mùi: "Thổ", Tuất: "Thổ",
  Dần: "Mộc", Mão: "Mộc", Tỵ: "Hỏa", Ngọ: "Hỏa", Thân: "Kim", Dậu: "Kim",
};

const elementMeta = {
  Mộc: { vi: { color: ["xanh lá", "gỗ sáng"], jobs: "giáo dục, thiết kế, nội dung" }, en: { color: ["green", "wood tones"], jobs: "education, design, content" } },
  Hỏa: { vi: { color: ["đỏ", "cam"], jobs: "truyền thông, trình diễn, năng lượng" }, en: { color: ["red", "orange"], jobs: "media, performance, energy" } },
  Thổ: { vi: { color: ["vàng", "đất"], jobs: "quản trị, vận hành, bất động sản" }, en: { color: ["yellow", "earthy"], jobs: "operations, management, real estate" } },
  Kim: { vi: { color: ["trắng", "ánh kim"], jobs: "tài chính, kỹ thuật, pháp chế" }, en: { color: ["white", "metallic"], jobs: "finance, engineering, compliance" } },
  Thủy: { vi: { color: ["xanh dương", "đen"], jobs: "CNTT-dữ liệu, nghiên cứu, logistics" }, en: { color: ["blue", "black"], jobs: "IT/data, research, logistics" } },
};

/* ------------------------ Helpers: language ----------------------- */
const guessLanguage = (messages = []) => {
  const txt = messages.map((m) => m?.content || "").join(" ");
  const looksVI = /ng(à|a)y|th(á|a)ng|n(ă|a)m|gi(ờ|o)|gi(á|a)p|k(ỷ|y)|t(â|a)n|nh(â|a)m|qu(ý|y)|t(ý|y)|s(ử|u)u|d(ầ|a)n|m(ã|a)o|th(ì|i)n|t(ỵ|y)|ng(ọ|o)|m(ù|u)i|th(â|a)n|d(ậ|a)u|tu(ấ|a)t|h(ợ|o)i/i.test(
    txt
  );
  return looksVI ? "vi" : "en";
};

/* ------------------- Chuẩn hoá / parse Tứ Trụ -------------------- */
const normalizeCanChi = (input) => {
  if (!input || typeof input !== "string") return null;
  const parts = input.trim().split(/\s+/);
  if (parts.length !== 2) return null;

  const [rawCan, rawChi] = parts;
  const viCan = Object.keys(heavenlyStemsMap.vi);
  const viChi = Object.keys(earthlyBranchesMap.vi);

  const canVi = viCan.find(
    (k) => rmDiacritics(k).toLowerCase() === rmDiacritics(rawCan).toLowerCase()
  );
  const chiVi = viChi.find(
    (k) => rmDiacritics(k).toLowerCase() === rmDiacritics(rawChi).toLowerCase()
  );
  if (canVi && chiVi) return `${canVi} ${chiVi}`;

  const enCanKey = Object.keys(heavenlyStemsMap.en).find(
    (k) => k.toLowerCase() === rawCan.toLowerCase()
  );
  const enChiKey = Object.keys(earthlyBranchesMap.en).find(
    (k) => k.toLowerCase() === rawChi.toLowerCase()
  );
  if (enCanKey && enChiKey) {
    return `${heavenlyStemsMap.en[enCanKey]} ${earthlyBranchesMap.en[enChiKey]}`;
  }
  return null;
};

const parseEnglishTuTru = (input) => {
  try {
    if (!input) return null;
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
    if (out.gio && out.ngay && out.thang && out.nam) return out;
    return null;
  } catch {
    return null;
  }
};

/* ---------------------- Phân tích Ngũ Hành ----------------------- */
const analyzeNguHanh = (tuTru) => {
  const count = { Mộc: 0, Hỏa: 0, Thổ: 0, Kim: 0, Thủy: 0 };
  const hidden = {
    Tý: ["Quý"], Sửu: ["Kỷ", "Tân", "Quý"], Dần: ["Giáp", "Bính", "Mậu"], Mão: ["Ất"],
    Thìn: ["Mậu", "Ất", "Quý"], Tỵ: ["Bính", "Canh", "Mậu"], Ngọ: ["Đinh", "Kỷ"],
    Mùi: ["Kỷ", "Đinh", "Ất"], Thân: ["Canh", "Nhâm", "Mậu"], Dậu: ["Tân"],
    Tuất: ["Mậu", "Đinh", "Tân"], Hợi: ["Nhâm", "Giáp"],
  };

  const pieces = [
    ...(tuTru.nam || "").split(" "),
    ...(tuTru.thang || "").split(" "),
    ...(tuTru.ngay || "").split(" "),
    ...(tuTru.gio || "").split(" "),
  ].filter(Boolean);
  const branches = [
    tuTru.nam?.split(" ")[1],
    tuTru.thang?.split(" ")[1],
    tuTru.ngay?.split(" ")[1],
    tuTru.gio?.split(" ")[1],
  ].filter(Boolean);

  if (pieces.length < 8 || branches.length < 4) throw new Error("Tứ Trụ không đầy đủ");

  for (const p of pieces) {
    if (canNguHanh[p]) count[canNguHanh[p]] += 1;
    if (chiNguHanh[p]) count[chiNguHanh[p]] += 1;
  }
  for (const b of branches) {
    (hidden[b] || []).forEach((h) => {
      if (canNguHanh[h]) count[canNguHanh[h]] += 0.3;
    });
  }
  const total = Object.values(count).reduce((a, b) => a + b, 0);
  if (!total) throw new Error("Không tìm thấy ngũ hành hợp lệ");
  return count;
};

const toPercents = (obj) => {
  const total = Object.values(obj).reduce((a, b) => a + b, 0) || 1;
  const out = {};
  Object.entries(obj).forEach(([k, v]) => (out[k] = +(100 * (v / total)).toFixed(2)));
  return out;
};

/* ------------------------ Ý định câu hỏi ------------------------- */
const determineIntent = (contentRaw, lang = "vi") => {
  const content = rmDiacritics((contentRaw || "").toLowerCase());

  const intent =
    /tai van|tai loc|tai chinh|money|finance|wealth|thu nhap|dau tu|invest|luong|thu nhap|khoi nghiep|kinh doanh/.test(
      content
    )
      ? "money"
      : /su nghiep|nghe nghiep|career|job|cong viec|thang tien|promotion|startup|nganh/.test(
          content
        )
      ? "career"
      : /suc khoe|health|benh|an ngu|mat ngu|stress|tram cam|tinh than/.test(content)
      ? "health"
      : /tinh cam|hon nhan|yeu|love|marriage|nguoi yeu|ban doi|ket hon|romance/.test(
          content
        )
      ? "love"
      : /gia dao|gia dinh|quan he|vo chong|cha me|noi bo|family/.test(content)
      ? "family"
      : /con cai|con tre|children|nuoi day|hoc hanh cua con|child/.test(content)
      ? "children"
      : /tai san|bat dong san|nha cua|property|real estate|dat dai/.test(content)
      ? "property"
      : /mau sac|color|phong cach|thoi trang|ao|quan|mac gi|phong thuy mau/.test(
          content
        )
      ? "colors"
      : /am thuc|an uong|do an|food|che do an|an ki|thuoc an|diet/.test(content)
      ? "food"
      : /the thao|sport|boi loi|chay bo|yoga|gym|da bong|bong ro/.test(content)
      ? "sports"
      : /thu cung|pet|cho|meo|ca canh|chim canh|nuoi thu/.test(content)
      ? "pets"
      : /du lich|travel|di choi|hanh trinh|di dau|phuot/.test(content)
      ? "travel"
      : /hoc tap|study|ren luyen|bang cap|thi cu|ngoai ngu/.test(content)
      ? "study"
      : /san xuat|nang suat|productivity|thoi quen|ke hoach|deadline/.test(content)
      ? "productivity"
      : /cam xuc|emotions|an u|ap luc|lo au|tu tin/.test(content)
      ? "emotions"
      : "general";

  // phát hiện câu hỏi dạng lựa chọn
  const pairMatch =
    /\b(.+?)\s+(?:hay|hoac|or)\s+(.+?)\b/.exec(contentRaw || "") ||
    /\bchoose\s+(.+?)\s+or\s+(.+?)\b/i.exec(contentRaw || "");
  const isPairChoice = !!pairMatch;

  return { intent, isPairChoice, pair: pairMatch ? [pairMatch[1], pairMatch[2]] : null };
};

/* ---------------------- Lựa chọn A/Hay/B ------------------------- */
const chooseBetween = (domain, left, right, dungThanList = [], lang = "vi") => {
  const d = dungThanList[0] || "Hỏa";
  const normalize = (s) => rmDiacritics((s || "").trim().toLowerCase());

  const vi = {
    pick: (x) => (lang === "vi" ? `Chọn **${x}**` : `Choose **${x}**`),
    because: (r) => (lang === "vi" ? `vì ${r}.` : `because ${r}.`),
  };

  const L = normalize(left);
  const R = normalize(right);

  // màu sắc
  if (domain === "colors") {
    const pref = {
      Mộc: ["xanh", "la", "go", "olive"],
      Hỏa: ["do", "cam", "hong", "tim"],
      Thổ: ["vang", "dat", "nau", "beige"],
      Kim: ["trang", "bac", "kim", "xam"],
      Thủy: ["xanh duong", "den", "navy"],
    };
    const list = pref[d] || [];
    const score = (s) => list.some((kw) => s.includes(kw)) ? 1 : 0;
    const sL = score(L);
    const sR = score(R);
    const pick = sL >= sR ? left : right;
    const why =
      lang === "vi"
        ? `màu đó bồi dưỡng **${d}** – Dụng Thần của bạn`
        : `that color nourishes **${d}** – your Useful Element`;
    return `${vi.pick(pick)} ${vi.because(why)}`;
  }

  // nghề hoặc môn thể thao: dùng heuristic mạnh/nhẹ
  if (domain === "career" || domain === "sports" || domain === "pets") {
    const hot = ["marketing", "ban hang", "truyen thong", "dien thuyet", "nhay", "bong ro", "bong da", "cho"];
    const calm = ["phan tich", "chuoi cung ung", "nghien cuu", "lap trinh", "yoga", "boi", "meo", "ca"];
    const isHot = (s) => hot.some((k) => normalize(s).includes(k));
    const isCalm = (s) => calm.some((k) => normalize(s).includes(k));

    const wantHot = d === "Hỏa" || d === "Thổ";
    const score = (s) => (wantHot ? (isHot(s) ? 2 : isCalm(s) ? 0 : 1) : (isCalm(s) ? 2 : isHot(s) ? 0 : 1));
    const sL = score(left);
    const sR = score(right);
    const pick = sL >= sR ? left : right;
    const why =
      lang === "vi"
        ? `phù hợp để **bồi ${d}** theo xu hướng ${wantHot ? "động" : "ổn định"}`
        : `better to **strengthen ${d}** with a ${wantHot ? "dynamic" : "steady"} pattern`;
    return `${vi.pick(pick)} ${vi.because(why)}`;
  }

  // mặc định
  return lang === "vi"
    ? `Chọn **${left}** hay **${right}** đều được; ưu tiên bên phù hợp mục tiêu hiện tại của bạn.`
    : `Both **${left}** and **${right}** work; prioritize the one that fits your current goal.`;
};

/* -------------------- Mở bài truyền cảm (VI/EN) ------------------ */
const personalityVI = {
  Mộc: "linh hoạt và sáng tạo",
  Hỏa: "nhiệt huyết và chủ động",
  Thổ: "vững chãi, thực tế",
  Kim: "kỷ luật, gọn gàng",
  Thủy: "nhạy bén và sâu sắc",
};
const personalityEN = {
  Mộc: "adaptable and creative",
  Hỏa: "passionate and proactive",
  Thổ: "steady and practical",
  Kim: "disciplined and precise",
  Thủy: "perceptive and deep",
};

const openingNarrative = (tuTru, nguHanhCount, dungThanList, lang = "vi") => {
  const nhatChu = tuTru.ngay.split(" ")[0];
  const dm = canNguHanh[nhatChu];
  const p = toPercents(nguHanhCount);
  const sorted = Object.entries(p).sort((a, b) => b[1] - a[1]);
  const strong = sorted[0][0];
  const weak = sorted[sorted.length - 1][0];
  const dung = dungThanList[0] || weak;

  if (lang === "vi") {
    return [
      `Xin chào bạn, mình đã xem Bát Tự: **Giờ ${tuTru.gio} – Ngày ${tuTru.ngay} – Tháng ${tuTru.thang} – Năm ${tuTru.nam}**.`,
      `**Nhật Chủ ${nhatChu} (${dm})** – sắc thái ${personalityVI[dm]}.`,
      `**Bức tranh ngũ hành:** ${strong} đang trội, ${weak} mỏng ⇒ nên bồi **${dung}** để cân bằng.`,
      "### 3 nét chính:",
      "• Tư duy và hành động rõ ràng, hợp việc cần kỷ luật.",
      "• Khi áp lực tăng, dễ thiếu “lửa” để về đích – cần nguồn động lực đều mỗi ngày.",
      "• Nền tảng bền khi bạn đi chậm mà chắc, có lộ trình.",
      `**Dụng Thần:** ${dung}.`,
      "**Gợi ý hành động:**",
      "• Mỗi ngày 15–20 phút vận động/thiền để tạo nhiệt và giữ nhịp.",
      "• Công việc hợp: dự án có quy trình rõ, hoặc mảng sáng tạo có deadline cụ thể.",
      `• Không gian/màu gợi ý: ${elementMeta[dung].vi.color.join(", ")}.`,
      "Bạn muốn mình soi tiếp tài vận, sự nghiệp, tình cảm hay sức khỏe trước?",
    ].join("\n");
  }
  return [
    `Hi! I’ve read your Four Pillars: **Hour ${tuTru.gio} – Day ${tuTru.ngay} – Month ${tuTru.thang} – Year ${tuTru.nam}**.`,
    `**Day Master ${nhatChu} (${dm})** – ${personalityEN[dm]}.`,
    `**Element picture:** ${strong} is strong, ${weak} is thin ⇒ nourish **${dung}** for balance.`,
    "### Three highlights:",
    "• Clear, organized drive – great for structured work.",
    "• Under pressure, momentum can dip – keep a daily spark.",
    "• You grow best with steady routines.",
    `**Useful Element:** ${dung}.`,
    "**Do this now:**",
    "• 15–20 min daily movement/meditation.",
    "• Work that blends structure with creativity.",
    `• Colors/space: ${elementMeta[dung].en.color.join(", ")}.`,
    "Where should we go next: wealth, career, love or health?",
  ].join("\n");
};

/* -------------------- Trả lời theo từng chủ đề -------------------- */
const fmtPct = (v) => `${v.toFixed ? v.toFixed(2) : v}%`;

const topicResponders = {
  money: (ctx) => {
    const { lang, perc, dung } = ctx;
    if (lang === "vi") {
      return [
        "### Tài vận",
        `Dòng **Thủy** của bạn ở mức ${fmtPct(perc["Thủy"] || 0)} ⇒ tư duy phân tích & quản lý dòng tiền tốt.`,
        `Gợi ý: ưu tiên **tài sản cố định** và kênh có quy trình rõ; hạn chế đầu tư cảm hứng. Bồi **${dung}** để tăng động lực kiếm tiền chủ động.`,
        "Checklist ngắn: lập quỹ dự phòng 6 tháng – tự động hoá tiết kiệm – review chi tiêu theo tuần.",
      ].join("\n");
    }
    return [
      "### Wealth",
      `Your **Water** sits at ${fmtPct(perc["Thủy"] || 0)} ⇒ good analysis & cash-flow control.`,
      `Go for **structured, tangible assets**; avoid impulse bets. Add **${dung}** to power active income.`,
      "Mini-checklist: 6-month buffer – auto-save – weekly review.",
    ].join("\n");
  },

  career: (ctx) => {
    const { lang, dm, dung } = ctx;
    const meta = elementMeta[dung][lang];
    if (lang === "vi") {
      return [
        "### Sự nghiệp",
        `Bạn hợp việc cần kỷ luật (mạch **${dm}**) nhưng vẫn có “đất diễn”.`,
        `Lựa chọn nên ưu tiên: vai trò quản lý dự án/ops, hoặc sáng tạo có deadline.`,
        `Bồi **${dung}** bằng nhịp làm việc có mục tiêu ngày; môi trường dùng màu ${meta.color.join(", ")}.`,
      ].join("\n");
    }
    return [
      "### Career",
      `Fit roles with structure (tone of **${dm}**) yet room to perform.`,
      "Pick project/ops management, or creative work with clear deadlines.",
      `Boost **${dung}** via daily goal blocks; workspace colors ${meta.color.join(", ")}.`,
    ].join("\n");
  },

  health: (ctx) => {
    const { lang, weak, dung } = ctx;
    if (lang === "vi") {
      return [
        "### Sức khỏe",
        `Điểm mỏng là **${weak}** ⇒ chú ý nền thể lực & giấc ngủ.`,
        `Thực hành: 10–15’ đi bộ nhanh sau bữa tối; ngủ đủ – tắt màn hình trước giờ ngủ 45’.`,
        `Bồi **${dung}** bằng vận động tạo nhiệt vừa phải.`,
      ].join("\n");
    }
    return [
      "### Health",
      `Weak spot: **${weak}** ⇒ protect sleep & base fitness.`,
      "Do: brisk 10–15’ walk after dinner; lights-off 45’ before bed.",
      `Add **${dung}** with moderate heat-building movement.`,
    ].join("\n");
  },

  love: (ctx) => {
    const { lang, stars, dung } = ctx;
    const daoHoa = (stars["Đào Hoa"]?.value || []).join(", ");
    if (lang === "vi") {
      return [
        "### Tình cảm",
        daoHoa ? `Có **Đào Hoa** tại: ${daoHoa}.` : "Duyên đến khi bạn chủ động mở lòng.",
        `Tín hiệu hợp: người có nhịp sống ổn định, cùng mục tiêu dài hạn. Bồi **${dung}** để tăng sự ấm áp & kết nối.`,
        "Việc nhỏ: 1 cuộc hẹn chất lượng/tuần; giao tiếp thẳng thắn, tử tế.",
      ].join("\n");
    }
    return [
      "### Love",
      daoHoa ? `**Peach Blossom** at: ${daoHoa}.` : "Love grows as you open up.",
      `Look for steady partners with long-term goals. Add **${dung}** for warmth & bonding.`,
      "Tiny habit: one quality date/week; honest, kind talk.",
    ].join("\n");
  },

  family: (ctx) => {
    const { lang, dung } = ctx;
    if (lang === "vi") {
      return [
        "### Gia đạo",
        "Giữ kỷ luật nhẹ nhàng, tránh cầu toàn.",
        `“Kế hoạch gia đình hàng tuần” 30 phút – chia việc rõ. Dùng sắc ${elementMeta[dung].vi.color[0]} tạo cảm giác ấm áp.`,
      ].join("\n");
    }
    return [
      "### Family",
      "Keep soft discipline; skip perfectionism.",
      `30-min weekly family plan. Touch of ${elementMeta[dung].en.color[0]} for warmth.`,
    ].join("\n");
  },

  children: (ctx) => {
    const { lang, dm } = ctx;
    if (lang === "vi") {
      return [
        "### Con cái",
        `Khuyến khích **tò mò** và nề nếp; con hợp học theo dự án nhỏ. Bạn truyền cho con “chất” **${dm}**: kỷ luật & rõ ràng.`,
      ].join("\n");
    }
    return [
      "### Children",
      `Nurture **curiosity** and routines; project-style learning fits. You pass on **${dm}**: order and clarity.`,
    ].join("\n");
  },

  property: (ctx) => {
    const { lang, perc } = ctx;
    if (lang === "vi") {
      return [
        "### Tài sản/đầu tư lớn",
        `Thổ hiện ở ${fmtPct(perc["Thổ"] || 0)} ⇒ ưu tiên tài sản có “nền” rõ; khảo sát kỹ pháp lý & dòng tiền.`,
      ].join("\n");
    }
    return [
      "### Property",
      `Earth at ${fmtPct(perc["Thổ"] || 0)} ⇒ pick assets with clear foundations; check cashflow & legal.`,
    ].join("\n");
  },

  colors: (ctx) => {
    const { lang, dung } = ctx;
    const m = elementMeta[dung][lang];
    if (lang === "vi") {
      return `### Màu sắc\nƯu tiên: ${m.color.join(", ")} (bồi **${dung}**). Dùng khi phỏng vấn, thuyết trình hoặc cần “tăng pin”.`;
    }
    return `### Colors\nPrefer: ${m.color.join(", ")} (nourish **${dung}**). Use for interviews, presentations, low-energy days.`;
  },

  food: (ctx) => {
    const { lang, dung } = ctx;
    if (lang === "vi") {
      return [
        "### Ẩm thực",
        dung === "Hỏa"
          ? "Thêm món ấm – gừng, quế, trà ấm. Tránh ăn quá muộn."
          : dung === "Thủy"
          ? "Bổ sung thực phẩm mát, trái cây mọng nước; đủ nước trong ngày."
          : "Giữ tỷ lệ đạm – rau – tinh bột cân bằng 3–4–3.",
      ].join("\n");
    }
    return [
      "### Food",
      dung === "Hỏa"
        ? "Warm foods: ginger, cinnamon, warm tea. Avoid late meals."
        : dung === "Thủy"
        ? "Cooling fruits, hydrate well."
        : "Balanced plate: protein–greens–carbs ≈ 3–4–3.",
    ].join("\n");
  },

  sports: (ctx) => {
    const { lang, dung } = ctx;
    if (lang === "vi") {
      return [
        "### Thể thao",
        dung === "Hỏa"
          ? "Ưu tiên môn tạo nhiệt vừa: chạy nhẹ, bóng rổ, HIIT ngắn."
          : dung === "Thổ"
          ? "Môn bền nhịp: đi bộ dốc, leo bậc, pilates."
          : "Bơi, yoga, đạp xe giúp giữ nhịp ổn định.",
      ].join("\n");
    }
    return [
      "### Sports",
      dung === "Hỏa"
        ? "Heat-building: light runs, basketball, short HIIT."
        : dung === "Thổ"
        ? "Steady endurance: incline walks, stairs, Pilates."
        : "Swim, yoga, cycling for stable rhythm.",
    ].join("\n");
  },

  pets: (ctx) => {
    const { lang, dung } = ctx;
    if (lang === "vi") {
      return [
        "### Thú cưng",
        dung === "Mộc"
          ? "Chó năng động giúp bạn vận động đều."
          : dung === "Thủy"
          ? "Cá/chuồn chuồn nước – nhìn êm dịu, giúp tĩnh tâm."
          : "Mèo hiền, dễ chăm, phù hợp nhịp sống kỷ luật.",
      ].join("\n");
    }
    return [
      "### Pets",
      dung === "Mộc"
        ? "Active dogs keep you moving."
        : dung === "Thủy"
        ? "Aquarium fish – soothing, mindful."
        : "Calm cats match a disciplined routine.",
    ].join("\n");
  },

  travel: (ctx) => {
    const { lang, dung } = ctx;
    if (lang === "vi") {
      return [
        "### Du lịch",
        dung === "Hỏa"
          ? "Thành phố sôi động, lễ hội – nạp năng lượng nhanh."
          : dung === "Thủy"
          ? "Biển, hồ, nơi nhiều nước – xả stress, nạp lại sự tĩnh."
          : "Vùng núi/đồi – nhịp chậm, tập trung hồi phục.",
      ].join("\n");
    }
    return [
      "### Travel",
      dung === "Hỏa"
        ? "Vibrant cities & festivals."
        : dung === "Thủy"
        ? "Seaside/lakes – calming reset."
        : "Hills & trails – slow, restorative.",
    ].join("\n");
  },

  study: (ctx) => {
    const { lang, dm } = ctx;
    if (lang === "vi") {
      return [
        "### Học tập",
        `Hợp “học kèm làm”: đặt mục tiêu tuần và trình bày lại kiến thức. **${dm}** thích hệ thống rõ – hãy dùng flashcard + mindmap.`,
      ].join("\n");
    }
    return [
      "### Study",
      `Best with “learn & do”: weekly goals and teach-back. **${dm}** likes order – flashcards + mindmaps.`,
    ].join("\n");
  },

  productivity: (ctx) => {
    const { lang } = ctx;
    if (lang === "vi") {
      return [
        "### Năng suất",
        "Khung 50–10 (làm 50’, nghỉ 10’), 3 mục tiêu/ngày, review 15’ cuối ngày.",
      ].join("\n");
    }
    return [
      "### Productivity",
      "Use 50–10 focus blocks, 3 goals/day, 15-min daily review.",
    ].join("\n");
  },

  emotions: (ctx) => {
    const { lang, dung } = ctx;
    if (lang === "vi") {
      return [
        "### Cảm xúc",
        `Giữ nhịp thở 4–6; viết 3 dòng cảm ơn mỗi tối. Một vật dụng màu ${elementMeta[dung].vi.color[0]} để “ghim” điểm tĩnh.`,
      ].join("\n");
    }
    return [
      "### Emotions",
      `Breathe 4–6; jot 3 gratitude lines nightly. Carry a ${elementMeta[dung].en.color[0]} item as a calm anchor.`,
    ].join("\n");
  },

  general: (ctx) => {
    const { lang } = ctx;
    return lang === "vi"
      ? "Bạn có thể hỏi mình về **tài vận, sự nghiệp, tình cảm, sức khỏe, gia đạo, con cái, tài sản, màu sắc/thời trang, ẩm thực, thể thao, thú cưng, du lịch, học tập, năng suất, cảm xúc**. Bạn muốn đi sâu mảng nào trước?"
      : "You can ask about **wealth, career, love, health, family, children, property, colors/style, food, sports, pets, travel, study, productivity, emotions**. Which one first?";
  },
};

/* ------------------------ OpenAI (optional) ----------------------- */
const USE_OPENAI = process.env.USE_OPENAI !== "false";
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
  } catch (e) {
    if (e.response?.status === 401) return false;
    return true;
  }
};

const callOpenAI = async (payload) => {
  const res = await axios.post("https://api.openai.com/v1/chat/completions", payload, {
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}`, "Content-Type": "application/json" },
    timeout: 30000,
  });
  return res.data;
};

/* ----------------------------- Route ------------------------------ */
app.post("/api/luan-giai-bazi", async (req, res) => {
  const { messages, tuTruInfo, dungThan } = req.body || {};
  const language = guessLanguage(messages);
  const userMsg = (messages || []).slice().reverse().find((m) => m.role === "user")?.content || "";
  const cacheKey = `${tuTruInfo}|${userMsg}|${language}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json({ answer: cached });

  // Validate
  if (!Array.isArray(messages) || !messages.length) {
    return res.status(400).json({ error: language === "vi" ? "Thiếu messages" : "Missing messages" });
  }
  if (!tuTruInfo || typeof tuTruInfo !== "string") {
    return res.status(400).json({ error: language === "vi" ? "Thiếu tuTruInfo" : "Missing tuTruInfo" });
  }

  // Chuẩn hoá tứ trụ
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
    const parsed = parseEnglishTuTru(userMsg);
    if (!parsed?.gio || !parsed?.ngay || !parsed?.thang || !parsed?.nam) {
      return res.status(400).json({ error: language === "vi" ? "Tứ Trụ không hợp lệ" : "Invalid Four Pillars" });
    }
    tuTru = parsed;
  }

  // Phân tích lõi
  let nguHanh;
  try {
    nguHanh = analyzeNguHanh(tuTru);
  } catch (e) {
    return res.status(400).json({ error: language === "vi" ? "Dữ liệu ngũ hành không hợp lệ" : "Invalid Five Elements" });
  }

  const perc = toPercents(nguHanh);
  const nhatChu = tuTru.ngay.split(" ")[0];
  const dm = canNguHanh[nhatChu];
  const sorted = Object.entries(perc).sort((a, b) => b[1] - a[1]);
  const weak = sorted[sorted.length - 1][0];
  const dungThanList = Array.isArray(dungThan) ? dungThan : (dungThan?.hanh || []);
  const dung = dungThanList[0] || weak;

  // Ý định & pair-choice
  const { intent, isPairChoice, pair } = determineIntent(userMsg, language);

  // Trigger đặc biệt: "Hãy xem bát tự cho mình"
  const triggerOpen =
    /hay xem bat tu cho minh|hay xem bat tu cho toi|xem bat tu cho minh|xem bat tu cho toi/i.test(
      rmDiacritics(userMsg)
    );

  // Pair-choice
  if (isPairChoice) {
    // suy đoán domain của pair-choice
    const domain =
      intent === "colors"
        ? "colors"
        : intent === "career"
        ? "career"
        : intent === "sports"
        ? "sports"
        : intent === "pets"
        ? "pets"
        : "general";
    const answer = chooseBetween(domain, pair[0], pair[1], dungThanList, language);
    cache.set(cacheKey, answer);
    return res.json({ answer });
  }

  // Mở bài truyền cảm
  if (triggerOpen) {
    const answer = openingNarrative(tuTru, nguHanh, dungThanList, language);
    cache.set(cacheKey, answer);
    return res.json({ answer });
  }

  // Trả lời theo chủ đề
  const ctx = { lang: language, perc, dm, dung, stars: {}, tuTru, nhatChu };
  const responder = topicResponders[intent] || topicResponders.general;
  let base = responder(ctx);

  // Fallback OpenAI cho câu ngoài phạm vi
  if (intent === "general" && USE_OPENAI) {
    try {
      const ok = await checkOpenAIKey();
      if (ok) {
        const systemPrompt =
          language === "vi"
            ? "Bạn là trợ lý Bát Tự nói chuyện gần gũi, không mê tín. Giải thích ngắn gọn, truyền cảm, đưa gợi ý thực hành. Không bịa ngày tháng, không tiên tri thời vận chính xác."
            : "You are a warm Bazi assistant. Be empathetic, practical, and never invent exact dates or fortune-telling.";
        const context =
          `Tu Tru: Gio ${tuTru.gio}, Ngay ${tuTru.ngay}, Thang ${tuTru.thang}, Nam ${tuTru.nam}. ` +
          `Day Master: ${nhatChu} (${dm}). Five Elements %: ` +
          `Moc ${perc["Mộc"]} Hoa ${perc["Hỏa"]} Tho ${perc["Thổ"]} Kim ${perc["Kim"]} Thuy ${perc["Thủy"]}. ` +
          `Useful Element (Dung Than): ${dung}.`;
        const gpt = await callOpenAI({
          model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
          temperature: 0.6,
          max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || "1000", 10),
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: language === "vi" ? `Ngữ cảnh: ${context}\n\nCâu hỏi: ${userMsg}` : `Context: ${context}\n\nQuestion: ${userMsg}` },
          ],
        });
        const gptText = gpt?.choices?.[0]?.message?.content?.trim();
        if (gptText) base = gptText;
      }
    } catch (e) {
      console.error("OpenAI fallback error:", e.message);
    }
  }

  cache.set(cacheKey, base);
  return res.json({ answer: base });
});

/* --------------------------- Error handle ------------------------- */
app.use((err, req, res, next) => {
  console.error("Lỗi hệ thống:", err.stack || err.message);
  res.status(500).json({ error: "System error occurred" });
});

/* ----------------------------- Server ----------------------------- */
const port = process.env.PORT || 10000;
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
server.setTimeout(300000);
