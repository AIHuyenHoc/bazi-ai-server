const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' })); // Giữ limit 1mb để tránh lỗi 413

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

const canChiNguHanhInfo = `
Ngũ hành 10 Thiên Can:
- Giáp, Ất: Mộc
- Bính, Đinh: Hỏa
- Mậu, Kỷ: Thổ
- Canh, Tân: Kim
- Nhâm, Quý: Thủy
Ngũ hành 12 Địa Chi:
- Tý, Hợi: Thủy
- Sửu, Thìn, Mùi, Tuất: Thổ
- Dần, Mão: Mộc
- Tỵ, Ngọ: Hỏa
- Thân, Dậu: Kim
`;

const heavenlyStemsMap = {
  en: { Jia: "Giáp", Yi: "Ất", Bing: "Bính", Ding: "Đinh", Wu: "Mậu", Ji: "Kỷ", Geng: "Canh", Xin: "Tân", Ren: "Nhâm", Gui: "Quý" },
  vi: { Giáp: "Giáp", Ất: "Ất", Bính: "Bính", Đinh: "Đinh", Mậu: "Mậu", Kỷ: "Kỷ", Canh: "Canh", Tân: "Tân", Nhâm: "Nhâm", Quý: "Quý" }
};
const earthlyBranchesMap = {
  en: { Rat: "Tý", Ox: "Sửu", Tiger: "Dần", Rabbit: "Mão", Dragon: "Thìn", Snake: "Tỵ", Horse: "Ngọ", Goat: "Mùi", Monkey: "Thân", Rooster: "Dậu", Dog: "Tuất", Pig: "Hợi" },
  vi: { Tý: "Tý", Sửu: "Sửu", Dần: "Dần", Mão: "Mão", Thìn: "Thìn", Tỵ: "Tỵ", Ngọ: "Ngọ", Mùi: "Mùi", Thân: "Thân", Dậu: "Dậu", Tuất: "Tuất", Hợi: "Hợi" }
};

const normalizeCanChi = (input) => {
  if (!input || typeof input !== "string") return null;
  const parts = input.trim().split(" ");
  if (parts.length !== 2) return null;
  const can = Object.keys(heavenlyStemsMap.vi).find(k => k.toLowerCase() === parts[0].toLowerCase());
  const chi = Object.keys(earthlyBranchesMap.vi).find(k => k.toLowerCase() === parts[1].toLowerCase());
  if (!can || !chi) return null;
  return `${can} ${chi}`;
};

const parseEnglishTuTru = (input) => {
  try {
    const parts = input.match(/(\w+\s+\w+)\s*(?:hour|day|month|year)/gi)?.map(part => part.trim().split(" "));
    if (!parts || parts.length !== 4) return null;
    return {
      gio: `${heavenlyStemsMap.en[parts[0][0]] || parts[0][0]} ${earthlyBranchesMap.en[parts[0][1]] || parts[0][1]}`,
      ngay: `${heavenlyStemsMap.en[parts[1][0]] || parts[1][0]} ${earthlyBranchesMap.en[parts[1][1]] || parts[1][1]}`,
      thang: `${heavenlyStemsMap.en[parts[2][0]] || parts[2][0]} ${earthlyBranchesMap.en[parts[2][1]] || parts[2][1]}`,
      nam: `${heavenlyStemsMap.en[parts[3][0]] || parts[3][0]} ${earthlyBranchesMap.en[parts[3][1]] || parts[3][1]}`
    };
  } catch (e) {
    console.error("Lỗi parseEnglishTuTru:", e.message);
    return null;
  }
};

const hoaGiap = [
  "Giáp Tý", "Ất Sửu", "Bính Dần", "Đinh Mão", "Mậu Thìn", "Kỷ Tỵ", "Canh Ngọ", "Tân Mùi", "Nhâm Thân", "Quý Dậu",
  "Giáp Tuất", "Ất Hợi", "Bính Tý", "Đinh Sửu", "Mậu Dần", "Kỷ Mão", "Canh Thìn", "Tân Tỵ", "Nhâm Ngọ", "Quý Mùi",
  "Giáp Thân", "Ất Dậu", "Bính Tuất", "Đinh Hợi", "Mậu Tý", "Kỷ Sửu", "Canh Dần", "Tân Mão", "Nhâm Thìn", "Quý Tỵ",
  "Giáp Ngọ", "Ất Mùi", "Bính Ngọ", "Đinh Mùi", "Mậu Thân", "Kỷ Dậu", "Canh Tuất", "Tân Hợi", "Nhâm Tý", "Quý Sửu",
  "Giáp Dần", "Ất Mão", "Bính Thìn", "Đinh Tỵ", "Mậu Ngọ", "Kỷ Mùi", "Canh Thân", "Tân Dậu", "Nhâm Tuất", "Quý Hợi"
];

const getCanChiForYear = (year) => {
  if (!Number.isInteger(year) || year < 1900 || year > 2100) return null;
  const baseYear = 1984;
  const index = (year - baseYear) % 60;
  const adjustedIndex = index < 0 ? index + 60 : index;
  return hoaGiap[adjustedIndex] || null;
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
  const hiddenElements = {
    Tý: ["Quý"], Sửu: ["Kỷ", "Tân", "Quý"], Dần: ["Giáp", "Bính", "Mậu"], Mão: ["Ất"],
    Thìn: ["Mậu", "Ất", "Quý"], Tỵ: ["Bính", "Canh", "Mậu"], Ngọ: ["Đinh", "Kỷ"],
    Mùi: ["Kỷ", "Đinh", "Ất"], Thân: ["Canh", "Nhâm", "Mậu"], Dậu: ["Tân"],
    Tuất: ["Mậu", "Đinh", "Tân"], Hợi: ["Nhâm", "Giáp"]
  };

  try {
    const elements = [
      tuTru.nam ? tuTru.nam.split(" ") : [],
      tuTru.thang ? tuTru.thang.split(" ") : [],
      tuTru.ngay ? tuTru.ngay.split(" ") : [],
      tuTru.gio ? tuTru.gio.split(" ") : []
    ].flat().filter(Boolean);
    const branches = [
      tuTru.nam?.split(" ")[1], tuTru.thang?.split(" ")[1],
      tuTru.ngay?.split(" ")[1], tuTru.gio?.split(" ")[1]
    ].filter(Boolean);

    if (elements.length < 4 || branches.length < 4) {
      throw new Error("Tứ Trụ không đầy đủ");
    }

    for (const elem of elements) {
      if (canNguHanh[elem]) nguHanhCount[canNguHanh[elem]] += 1;
      if (chiNguHanh[elem]) nguHanhCount[chiNguHanh[elem]] += 1;
    }
    for (const chi of branches) {
      const hidden = hiddenElements[chi] || [];
      for (const hiddenCan of hidden) {
        if (canNguHanh[hiddenCan]) nguHanhCount[canNguHanh[hiddenCan]] += 0.3;
      }
    }

    const total = Object.values(nguHanhCount).reduce((a, b) => a + b, 0);
    if (total === 0) throw new Error("Không tìm thấy ngũ hành hợp lệ");
    return nguHanhCount;
  } catch (e) {
    console.error("Lỗi phân tích ngũ hành:", e.message);
    throw new Error("Không thể phân tích ngũ hành");
  }
};

const tinhThapThan = (nhatChu, tuTru) => {
  const canNguHanh = {
    Giáp: "Mộc", Ất: "Mộc", Bính: "Hỏa", Đinh: "Hỏa", Mậu: "Thổ",
    Kỷ: "Thổ", Canh: "Kim", Tân: "Kim", Nhâm: "Thủy", Quý: "Thủy"
  };
  const chiNguHanh = {
    Tý: "Thủy", Hợi: "Thủy", Sửu: "Thổ", Thìn: "Thổ", Mùi: "Thổ", Tuất: "Thổ",
    Dần: "Mộc", Mão: "Mộc", Tỵ: "Hỏa", Ngọ: "Hỏa", Thân: "Kim", Dậu: "Kim"
  };
  const thapThanMap = {
    Kim: {
      Kim: ["Tỷ Kiên", "Kiếp Tài"], Thủy: ["Thực Thần", "Thương Quan"], Mộc: ["Chính Tài", "Thiên Tài"],
      Hỏa: ["Chính Quan", "Thất Sát"], Thổ: ["Chính Ấn", "Thiên Ấn"]
    },
    Mộc: {
      Mộc: ["Tỷ Kiên", "Kiếp Tài"], Hỏa: ["Thực Thần", "Thương Quan"], Thổ: ["Chính Tài", "Thiên Tài"],
      Kim: ["Chính Quan", "Thất Sát"], Thủy: ["Chính Ấn", "Thiên Ấn"]
    },
    Hỏa: {
      Hỏa: ["Tỷ Kiên", "Kiếp Tài"], Thổ: ["Thực Thần", "Thương Quan"], Kim: ["Chính Tài", "Thiên Tài"],
      Thủy: ["Chính Quan", "Thất Sát"], Mộc: ["Chính Ấn", "Thiên Ấn"]
    },
    Thổ: {
      Thổ: ["Tỷ Kiên", "Kiếp Tài"], Kim: ["Thực Thần", "Thương Quan"], Thủy: ["Chính Tài", "Thiên Tài"],
      Mộc: ["Chính Quan", "Thất Sát"], Hỏa: ["Chính Ấn", "Thiên Ấn"]
    },
    Thủy: {
      Thủy: ["Tỷ Kiên", "Kiếp Tài"], Mộc: ["Thực Thần", "Thương Quan"], Hỏa: ["Chính Tài", "Thiên Tài"],
      Thổ: ["Chính Quan", "Thất Sát"], Kim: ["Chính Ấn", "Thiên Ấn"]
    }
  };

  if (!nhatChu || !canNguHanh[nhatChu]) {
    throw new Error("Nhật Chủ không hợp lệ");
  }

  const isYang = ["Giáp", "Bính", "Mậu", "Canh", "Nhâm"].includes(nhatChu);
  const thapThanResults = {};

  try {
    const elements = [
      tuTru.gio?.split(" ")[0], tuTru.thang?.split(" ")[0], tuTru.nam?.split(" ")[0]
    ].filter(Boolean);
    const branches = [
      tuTru.gio?.split(" ")[1], tuTru.ngay?.split(" ")[1],
      tuTru.thang?.split(" ")[1], tuTru.nam?.split(" ")[1]
    ].filter(Boolean);

    if (elements.length < 3 || branches.length < 4) {
      throw new Error("Tứ Trụ không đầy đủ");
    }

    for (const can of elements) {
      if (can === nhatChu) continue;
      const nguHanh = canNguHanh[can];
      if (!nguHanh) continue;
      const isCanYang = ["Giáp", "Bính", "Mậu", "Canh", "Nhâm"].includes(can);
      const index = (isYang === isCanYang) ? 0 : 1;
      thapThanResults[can] = thapThanMap[canNguHanh[nhatChu]][nguHanh][index];
    }

    for (const chi of branches) {
      const nguHanh = chiNguHanh[chi];
      if (!nguHanh) continue;
      const isChiYang = ["Tý", "Dần", "Thìn", "Ngọ", "Thân", "Tuất"].includes(chi);
      const index = (isYang === isChiYang) ? 0 : 1;
      thapThanResults[chi] = thapThanMap[canNguHanh[nhatChu]][nguHanh][index];
    }

    return thapThanResults;
  } catch (e) {
    console.error("Lỗi tính Thập Thần:", e.message);
    throw new Error("Không thể tính Thập Thần");
  }
};

const tinhThanSat = (tuTru) => {
  const thienAtQuyNhan = {
    Giáp: ["Sửu", "Mùi"], Ất: ["Tý", "Hợi"], Bính: ["Dần", "Mão"], Đinh: ["Sửu", "Hợi"],
    Mậu: ["Tỵ", "Ngọ"], Kỷ: ["Thìn", "Tuất"], Canh: ["Thân", "Dậu"], Tân: ["Thân", "Dậu"],
    Nhâm: ["Hợi", "Tý"], Quý: ["Tý", "Hợi"]
  };
  const daoHoa = {
    Tý: "Dậu", Sửu: "Thân", Dần: "Mùi", Mão: "Ngọ", Thìn: "Tỵ", Tỵ: "Thìn",
    Ngọ: "Mão", Mùi: "Dần", Thân: "Sửu", Dậu: "Tý", Tuất: "Hợi", Hợi: "Tuất"
  };
  const hongLoan = {
    Tý: "Dậu", Sửu: "Thân", Dần: "Mùi", Mão: "Ngọ", Thìn: "Tỵ", Tỵ: "Thìn",
    Ngọ: "Mão", Mùi: "Dần", Thân: "Sửu", Dậu: "Tý", Tuất: "Hợi", Hợi: "Tuất"
  };

  const nhatChu = tuTru.ngay?.split(" ")[0];
  const branches = [
    tuTru.nam?.split(" ")[1], tuTru.thang?.split(" ")[1],
    tuTru.ngay?.split(" ")[1], tuTru.gio?.split(" ")[1]
  ].filter(Boolean);

  if (!nhatChu || !branches.length) {
    throw new Error("Invalid nhatChu or branches");
  }

  return {
    "Thiên Ất Quý Nhân": { vi: "Thiên Ất Quý Nhân", en: "Nobleman Star", value: thienAtQuyNhan[nhatChu]?.filter(chi => branches.includes(chi)) || [] },
    "Đào Hoa": { vi: "Đào Hoa", en: "Peach Blossom", value: branches.includes(daoHoa[tuTru.ngay?.split(" ")[1]]) ? [daoHoa[tuTru.ngay?.split(" ")[1]]] : [] },
    "Hồng Loan": { vi: "Hồng Loan", en: "Red Phoenix", value: branches.includes(hongLoan[tuTru.ngay?.split(" ")[1]]) ? [hongLoan[tuTru.ngay?.split(" ")[1]]] : [] }
  };
};

const dayMasterDescriptions = {
  Mộc: {
    vi: [
      "Như cây xanh vươn cao đón nắng, bạn tràn đầy sức sống, sáng tạo, và linh hoạt. Bạn yêu thích khám phá, nhưng cần thời gian để ổn định cảm xúc.",
      "Bạn giống một cánh rừng xanh, luôn tìm cách vươn lên, sáng tạo không ngừng, nhưng đôi khi cần học cách kiên nhẫn để đạt mục tiêu dài hạn.",
      "Như ngọn cỏ đung đưa trong gió, bạn linh hoạt, thích nghi tốt, nhưng cần tránh phân tâm khi đối mặt với nhiều lựa chọn."
    ],
    en: [
      "Like a tree reaching for sunlight, you are vibrant, creative, and adaptable. You thrive on exploration but may need moments to ground your emotions.",
      "You resemble a lush forest, always growing, endlessly creative, but sometimes need patience to achieve long-term goals.",
      "Like grass swaying in the breeze, you are flexible and adaptable, but should avoid distraction when faced with many choices."
    ]
  },
  Hỏa: {
    vi: [
      "Như ngọn lửa rực rỡ soi sáng màn đêm, bạn bừng cháy với đam mê và nhiệt huyết, dễ truyền cảm hứng nhưng cần kiểm soát sự bốc đồng.",
      "Bạn là ánh lửa ấm áp, luôn tỏa sáng và thu hút mọi người, nhưng cần học cách giữ bình tĩnh để tránh xung đột không đáng có.",
      "Như ngọn đuốc không bao giờ tắt, bạn tràn đầy năng lượng, nhưng cần cân bằng để tránh kiệt sức trong hành trình dài."
    ],
    en: [
      "Like a blazing fire illuminating the night, you burn with passion and enthusiasm, inspiring others but needing to manage impulsiveness.",
      "You are a warm flame, always shining and attracting others, but must learn to stay calm to avoid unnecessary conflicts.",
      "Like an eternal torch, you are full of energy, but need balance to avoid burnout on your long journey."
    ]
  },
  Thổ: {
    vi: [
      "Như ngọn núi vững chãi giữa đất trời, bạn đáng tin cậy, kiên định và thực tế, nhưng đôi khi cần mở lòng để đón nhận thay đổi.",
      "Bạn như cánh đồng phì nhiêu, nuôi dưỡng mọi thứ xung quanh, nhưng cần linh hoạt hơn để nắm bắt cơ hội mới.",
      "Như tảng đá kiên cố, bạn là chỗ dựa vững chắc, nhưng cần học cách đón nhận những ý tưởng mới để phát triển."
    ],
    en: [
      "Like a steadfast mountain under the sky, you are reliable, resolute, and practical, yet may need to embrace change more openly.",
      "You are like fertile land, nurturing everything around you, but need more flexibility to seize new opportunities.",
      "Like a solid rock, you are a dependable foundation, but should embrace new ideas to grow."
    ]
  },
  Kim: {
    vi: [
      "Như thanh kiếm sắc bén lấp lánh ánh kim, bạn tinh tế, quyết tâm và chính trực, nhưng cần cân bằng giữa lý trí và cảm xúc.",
      "Bạn như viên kim cương quý giá, rực rỡ và mạnh mẽ, nhưng cần học cách mềm dẻo để hòa hợp với mọi người.",
      "Như chuông đồng vang vọng, bạn kiên định và rõ ràng, nhưng cần mở lòng để kết nối sâu sắc hơn."
    ],
    en: [
      "Like a gleaming sword shining bright, you are refined, determined, and upright, but need balance between logic and emotion.",
      "You are like a precious diamond, radiant and strong, but must learn flexibility to harmonize with others.",
      "Like a resonant bell, you are steadfast and clear, but need to open your heart for deeper connections."
    ]
  },
  Thủy: {
    vi: [
      "Như dòng sông sâu thẳm chảy không ngừng, bạn thông thái, nhạy bén và sâu sắc, nhưng đôi khi cần kiểm soát dòng cảm xúc mạnh mẽ.",
      "Bạn giống đại dương bao la, sâu sắc và đầy bí ẩn, nhưng cần học cách giữ bình tĩnh trước sóng gió cuộc đời.",
      "Như suối nước trong lành, bạn mang lại sự tươi mới, nhưng cần tránh để cảm xúc cuốn trôi lý trí."
    ],
    en: [
      "Like a deep river flowing endlessly, you are wise, perceptive, and profound, but may need to manage intense emotions.",
      "You resemble a vast ocean, profound and mysterious, but must learn to stay calm amidst life’s storms.",
      "Like a clear spring, you bring freshness, but need to avoid letting emotions overwhelm your reason."
    ]
  }
};

const thapThanEffects = {
  "Tỷ Kiên": {
    vi: [
      "Bạn tự lập, mạnh mẽ, có khả năng lãnh đạo, thích tự do nhưng cần tránh cố chấp.",
      "Như ngọn núi đứng vững, bạn dẫn dắt với sự tự tin, nhưng cần lắng nghe để tránh xung đột.",
      "Sức mạnh nội tại giúp bạn vượt thử thách, nhưng cần học cách hợp tác để thành công lớn."
    ],
    en: [
      "Independent, strong, with leadership qualities, loves freedom but should avoid stubbornness.",
      "Like a steadfast mountain, you lead with confidence, but need to listen to avoid conflicts.",
      "Your inner strength helps you overcome challenges, but collaboration is key to greater success."
    ]
  },
  "Kiếp Tài": {
    vi: [
      "Quyết đoán, dám mạo hiểm, tài năng nhưng dễ bốc đồng trong quan hệ.",
      "Bạn như chiến binh dũng cảm, luôn tiến lên, nhưng cần kiểm soát cảm xúc để xây dựng mối quan hệ bền vững.",
      "Tinh thần táo bạo giúp bạn chinh phục mục tiêu, nhưng cần cân nhắc trước khi hành động."
    ],
    en: [
      "Decisive, daring, talented but prone to impulsiveness in relationships.",
      "Like a brave warrior, you charge forward, but need emotional control for lasting bonds.",
      "Your bold spirit conquers goals, but careful consideration enhances success."
    ]
  },
  // ... (Tương tự cho các Thập Thần khác: Thực Thần, Thương Quan, Chính Tài, Thiên Tài, Chính Quan, Thất Sát, Chính Ấn, Thiên Ấn) ...
};

const determineQuestionType = (userInput, language) => {
  const normalizedInput = typeof userInput === "string" ? userInput.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") : "";
  const keywords = {
    isMoney: {
      vi: ["tien bac", "tai chinh", "tai loc", "lam giau", "kinh doanh", "dau tu", "thu nhap", "cua cai", "loi nhuan", "von", "cai thien tai loc"],
      en: ["money", "finance", "wealth", "riches", "investment", "business", "income", "profit", "capital", "earnings", "improve wealth"],
      not: ["tai nan", "accident"]
    },
    isCareer: {
      vi: ["nghe", "cong viec", "su nghiep", "viec lam", "chuc vu", "thang chuc", "nghe nghiep", "lam viec", "co hoi viec", "chuyen mon"],
      en: ["career", "job", "work", "profession", "employment", "promotion", "occupation", "business", "opportunity", "skill"]
    },
    isFame: {
      vi: ["cong danh", "danh tieng", "ten tuoi", "uy tin", "thanh tuu", "noi tieng", "danh vong", "thanh cong", "truyen thong", "quang cao"],
      en: ["fame", "reputation", "prestige", "success", "achievement", "recognition", "popularity", "status", "celebrity", "publicity"]
    },
    isHealth: {
      vi: ["suc khoe", "benh tat", "sang khoe", "the luc", "tri benh", "benh", "khoe manh", "y te", "phuc hoi", "the chat", "tam ly"],
      en: ["health", "illness", "wellness", "sickness", "disease", "recovery", "fitness", "medical", "vitality", "strength", "mental health"]
    },
    isLove: {
      vi: ["tinh duyen", "tinh yeu", "hon nhan", "vo chong", "tinh cam", "ket hon", "doi lua", "lang man", "ban doi", "hanh phuc", "hon nhan lau dai", "ben vung"],
      en: ["love", "marriage", "romance", "relationship", "partner", "spouse", "dating", "affection", "soulmate", "happiness", "long-term marriage", "stable"]
    },
    isFamily: {
      vi: ["gia dao", "gia dinh", "ho gia", "than nhan", "gia can", "cha me", "anh em", "vo chong", "gia toc", "hanh phuc"],
      en: ["family", "household", "kin", "relatives", "parents", "siblings", "spouse", "clan", "home", "harmony"]
    },
    isChildren: {
      vi: ["con cai", "con", "tre con", "con nho", "nuoi day", "con trai", "con gai", "sinh con", "gia dinh", "cha me"],
      en: ["children", "kids", "offspring", "son", "daughter", "parenting", "child", "family", "birth", "raising"]
    },
    isProperty: {
      vi: ["tai san", "dat dai", "nha cua", "bat dong san", "so huu", "mua ban", "nha dat", "von", "tai nguyen", "dau tu"],
      en: ["property", "real estate", "land", "house", "asset", "ownership", "buying", "selling", "resources", "investment"]
    },
    isDanger: {
      vi: ["tai nan", "nguy hiem", "rui ro", "an toan", "tai hoa", "hoan nan", "kho khan", "de phong", "phong tranh", "bao ve"],
      en: ["accident", "danger", "risk", "safety", "hazard", "trouble", "crisis", "caution", "prevention", "protection"]
    },
    isYear: {
      vi: ["nam", "sang nam", "tuong lai", "nam toi", "nam sau", "luu nien", "van menh", "tram nam", "thoi gian", "nien"],
      en: ["year", "next year", "future", "coming year", "forecast", "annual", "destiny", "time", "period", "cycle"]
    },
    isComplex: {
      vi: ["du doan", "tuong lai", "van menh", "dai van", "toan bo", "tong quan", "chi tiet", "tat ca", "toan dien", "tron doi"],
      en: ["predict", "future", "destiny", "life path", "overall", "general", "detailed", "complete", "comprehensive", "lifetime"]
    },
    isThapThan: {
      vi: ["thap than", "mười than", "than tai", "ty kien", "thuc than", "thien tai", "chinh quan", "thien an", "chinh an", "that sat"],
      en: ["ten gods", "ten deities", "shoulder", "wealth", "food god", "indirect wealth", "direct officer", "seal", "indirect seal", "seven killings"]
    },
    isThanSat: {
      vi: ["than sat", "sao", "thien at", "dao hoa", "hong loan", "quy nhan", "sao tot", "sao xau", "thien tai", "dia sat"],
      en: ["auspicious stars", "stars", "nobleman", "peach blossom", "red phoenix", "benefactor", "good stars", "bad stars", "heavenly star", "earthly star"]
    },
    isInvestment: {
      vi: ["dau tu", "lam giau", "von", "loi nhuan", "tai chinh ca nhan", "khoi nghiep", "cai thien tai loc"],
      en: ["investment", "wealth creation", "capital", "profit", "personal finance", "startup", "improve wealth"]
    },
    isLongTermLove: {
      vi: ["hon nhan lau dai", "ben vung", "on dinh", "ket noi lau dai", "cam ket"],
      en: ["long-term marriage", "stable", "lasting relationship", "commitment", "enduring love"]
    },
    isMentalHealth: {
      vi: ["tam ly", "cang thang", "lo lang", "binh an", "tam hon", "can bang cam xuc"],
      en: ["mental health", "stress", "anxiety", "peace of mind", "emotional balance"]
    }
  };

  const types = {};
  for (const [type, { vi, en, not = [] }] of Object.entries(keywords)) {
    const viMatch = vi.some(keyword => normalizedInput.includes(keyword));
    const enMatch = en.some(keyword => normalizedInput.includes(keyword));
    const notMatch = not.some(keyword => normalizedInput.includes(keyword));
    types[type] = (viMatch || enMatch) && !notMatch;
  }
  types.isGeneral = !Object.values(types).some(v => v);
  return types;
};

const analyzeYear = (year, tuTru, nguHanhCount, thapThanResults, dungThan) => {
  const canChi = getCanChiForYear(year);
  if (!canChi) return { vi: "Năm không hợp lệ", en: "Invalid year" };
  const [can, chi] = canChi.split(" ");
  const canNguHanh = {
    Giáp: "Mộc", Ất: "Mộc", Bính: "Hỏa", Đinh: "Hỏa", Mậu: "Thổ",
    Kỷ: "Thổ", Canh: "Kim", Tân: "Kim", Nhâm: "Thủy", Quý: "Thủy"
  };
  const chiNguHanh = {
    Tý: "Thủy", Hợi: "Thủy", Sửu: "Thổ", Thìn: "Thổ", Mùi: "Thổ", Tuất: "Thổ",
    Dần: "Mộc", Mão: "Mộc", Tỵ: "Hỏa", Ngọ: "Hỏa", Thân: "Kim", Dậu: "Kim"
  };
  const nhatChu = tuTru.ngay.split(" ")[0];
  const thapThanMap = {
    Kim: { Kim: ["Tỷ Kiên", "Kiếp Tài"], Thủy: ["Thực Thần", "Thương Quan"], Mộc: ["Chính Tài", "Thiên Tài"], Hỏa: ["Chính Quan", "Thất Sát"], Thổ: ["Chính Ấn", "Thiên Ấn"] },
    Mộc: { Mộc: ["Tỷ Kiên", "Kiếp Tài"], Hỏa: ["Thực Thần", "Thương Quan"], Thổ: ["Chính Tài", "Thiên Tài"], Kim: ["Chính Quan", "Thất Sát"], Thủy: ["Chính Ấn", "Thiên Ấn"] },
    Hỏa: { Hỏa: ["Tỷ Kiên", "Kiếp Tài"], Thổ: ["Thực Thần", "Thương Quan"], Kim: ["Chính Tài", "Thiên Tài"], Thủy: ["Chính Quan", "Thất Sát"], Mộc: ["Chính Ấn", "Thiên Ấn"] },
    Thổ: { Thổ: ["Tỷ Kiên", "Kiếp Tài"], Kim: ["Thực Thần", "Thương Quan"], Thủy: ["Chính Tài", "Thiên Tài"], Mộc: ["Chính Quan", "Thất Sát"], Hỏa: ["Chính Ấn", "Thiên Ấn"] },
    Thủy: { Thủy: ["Tỷ Kiên", "Kiếp Tài"], Mộc: ["Thực Thần", "Thương Quan"], Hỏa: ["Chính Tài", "Thiên Tài"], Thổ: ["Chính Quan", "Thất Sát"], Kim: ["Chính Ấn", "Thiên Ấn"] }
  };
  const isYang = ["Giáp", "Bính", "Mậu", "Canh", "Nhâm"].includes(nhatChu);
  const isCanYang = ["Giáp", "Bính", "Mậu", "Canh", "Nhâm"].includes(can);
  const isChiYang = ["Tý", "Dần", "Thìn", "Ngọ", "Thân", "Tuất"].includes(chi);
  const canThapThan = thapThanMap[canNguHanh[nhatChu]][canNguHanh[can]][(isYang === isCanYang) ? 0 : 1];
  const chiThapThan = thapThanMap[canNguHanh[nhatChu]][chiNguHanh[chi]][(isYang === isChiYang) ? 0 : 1];

  const nguHanhYear = { can: canNguHanh[can], chi: chiNguHanh[chi] };
  const isFavorable = dungThan.includes(nguHanhYear.can) || dungThan.includes(nguHanhYear.chi);
  const analysis = {
    vi: [
      `Năm ${year} (${can} ${chi}): ${nguHanhYear.can} (${canThapThan}), ${nguHanhYear.chi} (${chiThapThan}). ${isFavorable ? `Hỗ trợ Dụng Thần ${dungThan.join(", ")}, mang cơ hội trong sự nghiệp và mối quan hệ.` : `Cần cân bằng với ${dungThan.join(", ")} để giảm áp lực và tận dụng cơ hội.`}`,
      `Trong năm ${year} (${can} ${chi}), ${nguHanhYear.can} kết hợp ${canThapThan} mở ra ${isFavorable ? "những cánh cửa mới trong công việc và tình cảm" : "thách thức cần sự kiên nhẫn"}. Hãy tận dụng ${dungThan[0]} để tiến bước.`,
      `Năm ${year} (${can} ${chi}) mang năng lượng ${nguHanhYear.can}. ${isFavorable ? `Dụng Thần ${dungThan[0]} giúp bạn tỏa sáng trong các dự án lớn.` : `Dùng ${dungThan[0]} để vượt qua khó khăn và tìm cơ hội.`}`
    ],
    en: [
      `Year ${year} (${can} ${chi}): ${nguHanhYear.can} (${canThapThan}), ${nguHanhYear.chi} (${chiThapThan}). ${isFavorable ? `Supports Useful God ${dungThan.join(", ")}, bringing opportunities in career and relationships.` : `Balance with ${dungThan.join(", ")} to reduce pressure and seize opportunities.`}`,
      `In ${year} (${can} ${chi}), ${nguHanhYear.can} with ${canThapThan} opens ${isFavorable ? "new doors in work and love" : "challenges requiring patience"}. Leverage ${dungThan[0]} to move forward.`,
      `Year ${year} (${can} ${chi}) carries ${nguHanhYear.can} energy. ${isFavorable ? `Useful God ${dungThan[0]} helps you shine in big projects.` : `Use ${dungThan[0]} to overcome obstacles and find opportunities.`}`
    ]
  };
  return analysis;
};

const determineDungThan = (nguHanhCount) => {
  const sortedElements = Object.entries(nguHanhCount).sort((a, b) => a[1] - b[1]);
  const weakest = sortedElements[0][0];
  const secondWeakest = sortedElements[1][0];
  const balanceMap = {
    Mộc: ["Mộc", "Hỏa"], Hỏa: ["Hỏa", "Mộc"], Thổ: ["Thổ", "Kim"],
    Kim: ["Kim", "Thủy"], Thủy: ["Thủy", "Mộc"]
  };
  return balanceMap[weakest] || [weakest, secondWeakest];
};

const randomChoice = (array) => array[Math.floor(Math.random() * array.length)];

const generateResponse = (tuTru, nguHanhCount, thapThanResults, thanSatResults, dungThan, userInput, messages, language) => {
  const totalElements = Object.values(nguHanhCount).reduce((a, b) => a + b, 0);
  const tyLeNguHanh = Object.fromEntries(
    Object.entries(nguHanhCount).map(([k, v]) => [k, v.toFixed(1)])
  );
  const nhatChu = tuTru.ngay.split(" ")[0];
  const canNguHanh = {
    Giáp: "Mộc", Ất: "Mộc", Bính: "Hỏa", Đinh: "Hỏa", Mậu: "Thổ",
    Kỷ: "Thổ", Canh: "Kim", Tân: "Kim", Nhâm: "Thủy", Quý: "Thủy"
  };

  const { isGeneral, isMoney, isCareer, isFame, isHealth, isLove, isFamily, isChildren, isProperty, isDanger, isYear, isComplex, isThapThan, isThanSat, isInvestment, isLongTermLove, isMentalHealth } = determineQuestionType(userInput, language);

  if (isComplex) {
    return `${language === "vi" ? "Vui lòng gửi câu hỏi qua app.aihuyenhoc@gmail.com" : "Please send questions to app.aihuyenhoc@gmail.com"}`;
  }

  let response = {
    personality: "",
    career: "",
    relationships: "",
    passions: "",
    future: "",
    advice: ""
  };

  // Personality
  response.personality = `
${language === "vi" ? `**Nhật Chủ và Tính Cách**` : `**Day Master and Personality**`}:
${randomChoice(dayMasterDescriptions[canNguHanh[nhatChu]][language])}
${language === "vi" ? `Ngũ Hành: ${Object.entries(tyLeNguHanh).map(([k, v]) => `${k}: ${v} (${v >= 2.5 ? "mạnh" : v <= 1.5 ? "yếu" : "trung bình"})`).join(", ")}.` : `Five Elements: ${Object.entries(tyLeNguHanh).map(([k, v]) => `${k}: ${v} (${v >= 2.5 ? "strong" : v <= 1.5 ? "weak" : "balanced"})`).join(", ")}.`}
`;

  // Career
  if (isGeneral || isCareer || isMoney || isInvestment) {
    const chinhTai = thapThanResults["Kỷ"] || thapThanResults["Mậu"] || "Không nổi bật";
    const tyKien = thapThanResults["Canh"] || thapThanResults["Tân"] || "Không nổi bật";
    const careerTemplates = {
      vi: [
        `**Sự Nghiệp và Định Hướng**:\nTỷ Kiên (${tyKien}), Chính Tài (${chinhTai}): Bạn tỏa sáng trong ${isInvestment ? "đầu tư và khởi nghiệp" : isMoney ? "quản lý tài chính và kinh doanh" : "các lĩnh vực sáng tạo"} như ${dungThan.includes("Mộc") ? "giáo dục, thiết kế" : dungThan.includes("Hỏa") ? "truyền thông, nghệ thuật" : dungThan.includes("Thổ") ? "bất động sản, nông nghiệp" : dungThan.includes("Kim") ? "công nghệ, tài chính" : "thương mại, tư vấn"}. Dụng Thần ${dungThan.join(", ")} giúp bạn vươn xa, đặc biệt nếu bạn tận dụng sự kiên trì.`,
        `**Sự Nghiệp và Định Hướng**:\nVới Tỷ Kiên (${tyKien}) và Chính Tài (${chinhTai}), bạn có tài lãnh đạo và khả năng kiếm tiền qua ${isInvestment ? "các dự án táo bạo" : isMoney ? "kế hoạch tài chính thông minh" : "những ý tưởng độc đáo"}. Hãy tập trung vào ${dungThan.includes("Mộc") ? "sáng tạo nội dung" : dungThan.includes("Hỏa") ? "truyền thông đại chúng" : dungThan.includes("Thổ") ? "xây dựng nền tảng vững chắc" : dungThan.includes("Kim") ? "phát triển công nghệ" : "kết nối mạng lưới"} để thành công.`
      ],
      en: [
        `**Career and Direction**:\nShoulder-to-Shoulder (${tyKien}), Direct Wealth (${chinhTai}): You shine in ${isInvestment ? "investment and startups" : isMoney ? "financial management and business" : "creative fields"} like ${dungThan.includes("Mộc") ? "education, design" : dungThan.includes("Hỏa") ? "media, arts" : dungThan.includes("Thổ") ? "real estate, agriculture" : dungThan.includes("Kim") ? "tech, finance" : "trade, consulting"}. Useful Gods ${dungThan.join(", ")} propel you forward, especially with persistence.`,
        `**Career and Direction**:\nWith Shoulder-to-Shoulder (${tyKien}) and Direct Wealth (${chinhTai}), you excel in leadership and earning through ${isInvestment ? "bold projects" : isMoney ? "smart financial plans" : "unique ideas"}. Focus on ${dungThan.includes("Mộc") ? "content creation" : dungThan.includes("Hỏa") ? "mass media" : dungThan.includes("Thổ") ? "building a solid foundation" : dungThan.includes("Kim") ? "tech development" : "networking"} for success.`
      ]
    };
    response.career = randomChoice(careerTemplates[language]);
  }

  // Relationships
  if (isGeneral || isLove || isLongTermLove) {
    const thienTai = thapThanResults["Đinh"] || thapThanResults["Bính"] || "Không nổi bật";
    const daoHoa = thanSatResults["Đào Hoa"].value.length ? "Có Đào Hoa" : "Không có Đào Hoa";
    const loveTemplates = {
      vi: [
        `**Tình Duyên và Mối Quan Hệ**:\nThiên Tài (${thienTai}): Bạn hợp với người ${isLongTermLove ? "tận tâm, ổn định" : "sáng tạo, sâu sắc"} như ${dungThan.includes("Mộc") ? "người linh hoạt, yêu nghệ thuật" : dungThan.includes("Hỏa") ? "người đam mê, năng động" : dungThan.includes("Thổ") ? "người thực tế, đáng tin" : dungThan.includes("Kim") ? "người tinh tế, chính trực" : "người thông thái, sâu sắc"}. ${daoHoa}. Dụng Thần ${dungThan[0]} giúp ${isLongTermLove ? "xây dựng mối quan hệ bền vững" : "tăng sức hút tình cảm"}.`,
        `**Tình Duyên và Mối Quan Hệ**:\nVới Thiên Tài (${thienTai}) và ${daoHoa}, bạn dễ thu hút những người ${isLongTermLove ? "trung thành, tận tụy" : "có cùng đam mê"}. Hãy tìm người mang năng lượng ${dungThan[0]}, như ${dungThan.includes("Mộc") ? "nghệ sĩ sáng tạo" : dungThan.includes("Hỏa") ? "người tràn đầy nhiệt huyết" : dungThan.includes("Thổ") ? "người ổn định, thực dụng" : dungThan.includes("Kim") ? "người logic, chính xác" : "người sâu sắc, tâm lý"} để xây dựng tình cảm lâu dài.`
      ],
      en: [
        `**Love and Relationships**:\nIndirect Wealth (${thienTai}): You are compatible with ${isLongTermLove ? "devoted, stable" : "creative, profound"} partners like ${dungThan.includes("Mộc") ? "adaptable, artistic" : dungThan.includes("Hỏa") ? "passionate, energetic" : dungThan.includes("Thổ") ? "practical, reliable" : dungThan.includes("Kim") ? "refined, upright" : "wise, profound"} individuals. ${daoHoa}. Useful God ${dungThan[0]} supports ${isLongTermLove ? "lasting relationships" : "romantic charm"}.`,
        `**Love and Relationships**:\nWith Indirect Wealth (${thienTai}) and ${daoHoa}, you attract ${isLongTermLove ? "loyal, dedicated" : "like-minded, passionate"} people. Seek partners with ${dungThan[0]} energy, such as ${dungThan.includes("Mộc") ? "creative artists" : dungThan.includes("Hỏa") ? "vibrant enthusiasts" : dungThan.includes("Thổ") ? "stable pragmatists" : dungThan.includes("Kim") ? "logical, precise individuals" : "deep, empathetic souls"} for lasting bonds.`
      ]
    };
    response.relationships = randomChoice(loveTemplates[language]);
  }

  // Health
  if (isGeneral || isHealth || isMentalHealth) {
    const weakestElement = Object.entries(nguHanhCount).sort((a, b) => a[1] - b[1])[0][0];
    const healthTemplates = {
      vi: [
        `**Sức Khỏe**:\n${weakestElement} yếu, cần bổ sung ${dungThan[0]} để cân bằng cơ thể và tinh thần. Chú ý ${isMentalHealth ? "sức khỏe tâm lý, giảm căng thẳng" : weakestElement === "Thủy" ? "thận, hệ thần kinh" : weakestElement === "Mộc" ? "gan, mật" : weakestElement === "Hỏa" ? "tim mạch, mắt" : weakestElement === "Thổ" ? "tiêu hóa, dạ dày" : "hô hấp, phổi"}. Hãy thử thiền hoặc yoga để thư giãn.`,
        `**Sức Khỏe**:\nNăng lượng ${weakestElement} thấp, cần tăng cường ${dungThan[0]} để phục hồi sức khỏe. ${isMentalHealth ? "Tập trung vào thiền định và các hoạt động giảm lo âu" : `Chú ý ${weakestElement === "Thủy" ? "thận và tâm lý" : weakestElement === "Mộc" ? "gan và năng lượng" : weakestElement === "Hỏa" ? "tim và mắt" : weakestElement === "Thổ" ? "dạ dày và tiêu hóa" : "phổi và hô hấp"}.`} Thử các bài tập nhẹ nhàng để cân bằng.`
      ],
      en: [
        `**Health**:\n${weakestElement} is weak, strengthen ${dungThan[0]} for physical and mental balance. Focus on ${isMentalHealth ? "mental health, stress reduction" : weakestElement === "Thủy" ? "kidneys, nervous system" : weakestElement === "Mộc" ? "liver, gallbladder" : weakestElement === "Hỏa" ? "cardiovascular, eyes" : weakestElement === "Thổ" ? "digestion, stomach" : "respiratory system, lungs"}. Try meditation or yoga for relaxation.`,
        `**Health**:\nLow ${weakestElement} energy requires boosting ${dungThan[0]} for recovery. ${isMentalHealth ? "Prioritize meditation and stress-relief activities" : `Pay attention to ${weakestElement === "Thủy" ? "kidneys and mental state" : weakestElement === "Mộc" ? "liver and energy" : weakestElement === "Hỏa" ? "heart and eyes" : weakestElement === "Thổ" ? "stomach and digestion" : "lungs and breathing"}.`} Engage in gentle exercises for balance.`
      ]
    };
    response.health = randomChoice(healthTemplates[language]);
  }

  // Passions
  if (isGeneral) {
    const passionTemplates = {
      vi: [
        `**Sở Thích và Đam Mê**:\nDụng Thần ${dungThan[0]} gợi ý bạn yêu thích ${dungThan.includes("Mộc") ? "sáng tạo, nghệ thuật, du lịch" : dungThan.includes("Hỏa") ? "truyền thông, biểu diễn" : dungThan.includes("Thổ") ? "làm vườn, nghiên cứu lịch sử" : dungThan.includes("Kim") ? "công nghệ, chế tác" : "viết lách, thiền định"}. Thử ${dungThan.includes("Mộc") ? "vẽ tranh, làm đồ thủ công" : dungThan.includes("Hỏa") ? "nhảy múa, viết blog" : dungThan.includes("Thổ") ? "trồng cây, sưu tầm cổ vật" : dungThan.includes("Kim") ? "lập trình, chế tác kim loại" : "thiền, viết nhật ký"} để nuôi dưỡng tâm hồn.`,
        `**Sở Thích và Đam Mê**:\nNăng lượng ${dungThan[0]} dẫn bạn đến những hoạt động như ${dungThan.includes("Mộc") ? "khám phá thiên nhiên, sáng tác nghệ thuật" : dungThan.includes("Hỏa") ? "biểu diễn, chia sẻ câu chuyện" : dungThan.includes("Thổ") ? "nuôi dưỡng, nghiên cứu truyền thống" : dungThan.includes("Kim") ? "sáng tạo công nghệ, chế tác" : "suy ngẫm, viết lách"}. Hãy thử ${dungThan.includes("Mộc") ? "trồng cây, vẽ" : dungThan.includes("Hỏa") ? "kể chuyện, nhảy" : dungThan.includes("Thổ") ? "làm gốm, sưu tầm" : dungThan.includes("Kim") ? "lập trình, làm đồ thủ công" : "thiền, viết thơ"} để tìm niềm vui.`
      ],
      en: [
        `**Passions and Interests**:\nUseful God ${dungThan[0]} suggests you enjoy ${dungThan.includes("Mộc") ? "creativity, arts, travel" : dungThan.includes("Hỏa") ? "media, performance" : dungThan.includes("Thổ") ? "gardening, historical research" : dungThan.includes("Kim") ? "technology, crafting" : "writing, meditation"}. Try ${dungThan.includes("Mộc") ? "painting, crafting" : dungThan.includes("Hỏa") ? "dancing, blogging" : dungThan.includes("Thổ") ? "gardening, collecting antiques" : dungThan.includes("Kim") ? "programming, metalwork" : "meditation, journaling"} to nurture your soul.`,
        `**Passions and Interests**:\n${dungThan[0]} energy draws you to activities like ${dungThan.includes("Mộc") ? "exploring nature, creating art" : dungThan.includes("Hỏa") ? "performing, storytelling" : dungThan.includes("Thổ") ? "nurturing, studying traditions" : dungThan.includes("Kim") ? "innovating technology, crafting" : "reflecting, writing"}. Try ${dungThan.includes("Mộc") ? "gardening, painting" : dungThan.includes("Hỏa") ? "storytelling, dancing" : dungThan.includes("Thổ") ? "pottery, collecting" : dungThan.includes("Kim") ? "coding, crafting" : "meditation, poetry"} to find joy.`
      ]
    };
    response.passions = randomChoice(passionTemplates[language]);
  }

  // Future
  if (isYear) {
    const yearMatch = userInput.match(/\d{4}/);
    const year = yearMatch ? parseInt(yearMatch[0]) : 2026;
    const yearAnalysis = analyzeYear(year, tuTru, nguHanhCount, thapThanResults, dungThan);
    const futureTemplates = {
      vi: [
        `**Dự Đoán Tương Lai (${year})**:\n${randomChoice(yearAnalysis[language])}\nTừ 2026-2030, Dụng Thần ${dungThan.join(", ")} mang cơ hội trong ${dungThan.includes("Mộc") ? "sáng tạo, giáo dục" : dungThan.includes("Hỏa") ? "truyền thông, nghệ thuật" : dungThan.includes("Thổ") ? "bất động sản, cộng đồng" : dungThan.includes("Kim") ? "công nghệ, tài chính" : "thương mại, tư vấn"}. Hãy chuẩn bị để nắm bắt.`,
        `**Dự Đoán Tương Lai (${year})**:\n${randomChoice(yearAnalysis[language])}\nGiai đoạn 2026-2030, năng lượng ${dungThan[0]} sẽ giúp bạn tỏa sáng trong ${dungThan.includes("Mộc") ? "các dự án sáng tạo" : dungThan.includes("Hỏa") ? "truyền thông và nghệ thuật" : dungThan.includes("Thổ") ? "cộng đồng và bất động sản" : dungThan.includes("Kim") ? "công nghệ và tài chính" : "thương mại và kết nối"}. Hãy tận dụng thời cơ này.`
      ],
      en: [
        `**Future Outlook (${year})**:\n${randomChoice(yearAnalysis[language])}\nFrom 2026-2030, Useful Gods ${dungThan.join(", ")} bring opportunities in ${dungThan.includes("Mộc") ? "creativity, education" : dungThan.includes("Hỏa") ? "media, arts" : dungThan.includes("Thổ") ? "real estate, community" : dungThan.includes("Kim") ? "tech, finance" : "trade, consulting"}. Prepare to seize them.`,
        `**Future Outlook (${year})**:\n${randomChoice(yearAnalysis[language])}\nFrom 2026-2030, ${dungThan[0]} energy will help you shine in ${dungThan.includes("Mộc") ? "creative projects" : dungThan.includes("Hỏa") ? "media and arts" : dungThan.includes("Thổ") ? "community and real estate" : dungThan.includes("Kim") ? "tech and finance" : "trade and networking"}. Make the most of this time.`
      ]
    };
    response.future = randomChoice(futureTemplates[language]);
  }

  // Advice
  const adviceTemplates = {
    vi: [
      `**Lời Khuyên**:\nSử dụng màu ${dungThan.includes("Mộc") ? "xanh lá cây, gỗ" : dungThan.includes("Hỏa") ? "đỏ, cam" : dungThan.includes("Thổ") ? "nâu, vàng đất" : dungThan.includes("Kim") ? "trắng, bạc" : "xanh dương, đen"} và vật phẩm như ${dungThan.includes("Mộc") ? "ngọc bích, gỗ" : dungThan.includes("Hỏa") ? "thạch anh hồng, đá ruby" : dungThan.includes("Thổ") ? "đá thạch anh vàng, gốm" : dungThan.includes("Kim") ? "trang sức bạc, thép" : "thủy tinh, sapphire"} để tăng cường vận may. ${isLongTermLove ? "Tập trung vào giao tiếp chân thành để xây dựng mối quan hệ bền vững." : isInvestment ? "Nghiên cứu kỹ thị trường trước khi đầu tư." : isMentalHealth ? "Thử thiền hoặc viết nhật ký để cân bằng tâm lý." : "Duy trì cân bằng cảm xúc và tận dụng cơ hội."}`,
      `**Lời Khuyên**:\nĐể tăng vận may, hãy sử dụng ${dungThan.includes("Mộc") ? "màu xanh lá, vật phẩm gỗ" : dungThan.includes("Hỏa") ? "màu đỏ, đá ruby" : dungThan.includes("Thổ") ? "màu nâu, gốm sứ" : dungThan.includes("Kim") ? "màu trắng, bạc" : "màu xanh dương, sapphire"}. ${isLongTermLove ? "Hãy dành thời gian để thấu hiểu đối phương." : isInvestment ? "Lập kế hoạch tài chính cẩn thận." : isMentalHealth ? "Tập yoga hoặc thiền để giảm căng thẳng." : "Kiên nhẫn và nắm bắt thời cơ để phát triển."}`
    ],
    en: [
      `**Advice**:\nUse colors ${dungThan.includes("Mộc") ? "green, wood" : dungThan.includes("Hỏa") ? "red, orange" : dungThan.includes("Thổ") ? "brown, earthy tones" : dungThan.includes("Kim") ? "white, silver" : "blue, black"} and items like ${dungThan.includes("Mộc") ? "jade, wooden objects" : dungThan.includes("Hỏa") ? "rose quartz, ruby" : dungThan.includes("Thổ") ? "citrine, ceramics" : dungThan.includes("Kim") ? "silver jewelry, steel" : "glass, sapphire"} to enhance luck. ${isLongTermLove ? "Focus on sincere communication for lasting relationships." : isInvestment ? "Research markets thoroughly before investing." : isMentalHealth ? "Try meditation or journaling for emotional balance." : "Maintain emotional balance and seize opportunities."}`,
      `**Advice**:\nBoost your luck with ${dungThan.includes("Mộc") ? "green colors, wooden items" : dungThan.includes("Hỏa") ? "red colors, rubies" : dungThan.includes("Thổ") ? "brown colors, ceramics" : dungThan.includes("Kim") ? "white colors, silver" : "blue colors, sapphires"}. ${isLongTermLove ? "Spend time understanding your partner." : isInvestment ? "Plan finances carefully." : isMentalHealth ? "Practice yoga or meditation to reduce stress." : "Stay patient and seize opportunities for growth."}`
    ]
  };
  response.advice = randomChoice(adviceTemplates[language]);

  // Thập Thần và Thần Sát
  if (isThapThan) {
    response.thapThan = `
${language === "vi" ? `**Thập Thần**:\n${Object.entries(thapThanResults).map(([elem, thapThan]) => thapThanEffects[thapThan] ? `${elem}: ${randomChoice(thapThanEffects[thapThan][language])}` : "").filter(Boolean).join("\n")}` : `**Ten Gods**:\n${Object.entries(thapThanResults).map(([elem, thapThan]) => thapThanEffects[thapThan] ? `${elem}: ${randomChoice(thapThanEffects[thapThan][language])}` : "").filter(Boolean).join("\n")}`}
`;
  }

  if (isThanSat) {
    const activeThanSat = Object.entries(thanSatResults)
      .filter(([_, value]) => value.value.length)
      .map(([_, value]) => `${value[language]}: ${value.value.join(", ")}`);
    response.thanSat = `
${language === "vi" ? `**Thần Sát**:\n${activeThanSat.length > 0 ? activeThanSat.join("\n") : "Không có Thần Sát nổi bật"}` : `**Auspicious Stars**:\n${activeThanSat.length > 0 ? activeThanSat.join("\n") : "No prominent stars"}`}
`;
  }

  // Kết hợp phản hồi
  return Object.values(response).filter(Boolean).join("\n\n").trim();
};

app.post("/api/luan-giai-bazi", async (req, res) => {
  const startTime = Date.now();
  const { messages, tuTruInfo, dungThan, language = "vi" } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: language === "vi" ? "Thiếu messages" : "Missing messages" });
  }
  if (!tuTruInfo || typeof tuTruInfo !== "string") {
    return res.status(400).json({ error: language === "vi" ? "Thiếu tuTruInfo" : "Missing tuTruInfo" });
  }
  let dungThanHanh = Array.isArray(dungThan) ? dungThan : dungThan?.hanh || [];
  if (!dungThanHanh.every(d => ["Mộc", "Hỏa", "Thổ", "Kim", "Thủy"].includes(d))) {
    try {
      dungThanHanh = determineDungThan(analyzeNguHanh(JSON.parse(tuTruInfo)));
    } catch (e) {
      return res.status(400).json({ error: language === "vi" ? "Không thể xác định Dụng Thần" : "Cannot determine Useful God" });
    }
  }

  const userInput = messages?.slice().reverse().find(m => m.role === "user")?.content || "";

  let tuTru;
  try {
    tuTru = JSON.parse(tuTruInfo);
    tuTru = {
      gio: normalizeCanChi(tuTru.gio),
      ngay: normalizeCanChi(tuTru.ngay),
      thang: normalizeCanChi(tuTru.thang),
      nam: normalizeCanChi(tuTru.nam)
    };
    if (!tuTru.gio || !tuTru.ngay || !tuTru.thang || !tuTru.nam) {
      throw new Error("Tứ Trụ không đầy đủ");
    }
  } catch (e) {
    tuTru = parseEnglishTuTru(userInput);
    if (!tuTru || !tuTru.gio || !tuTru.ngay || !tuTru.thang || !tuTru.nam) {
      return res.status(400).json({ error: language === "vi" ? "Tứ Trụ không hợp lệ" : "Invalid Four Pillars" });
    }
  }

  let nguHanh;
  try {
    nguHanh = analyzeNguHanh(tuTru);
  } catch (err) {
    return res.status(400).json({ error: language === "vi" ? "Dữ liệu ngũ hành không hợp lệ" : "Invalid Five Elements" });
  }

  let thapThanResults = {};
  try {
    thapThanResults = tinhThapThan(tuTru.ngay?.split(" ")[0], tuTru);
  } catch (err) {
    console.error("Lỗi Thập Thần:", err.message);
  }

  let thanSatResults = {};
  try {
    thanSatResults = tinhThanSat(tuTru);
  } catch (err) {
    console.error("Lỗi Thần Sát:", err.message);
  }

  const answer = generateResponse(tuTru, nguHanh, thapThanResults, thanSatResults, dungThanHanh, userInput, messages, language);
  console.log(`Tổng thời gian xử lý: ${Date.now() - startTime}ms`);
  return res.json({ answer });
});

app.use((err, req, res, next) => {
  console.error("Lỗi hệ thống:", err.stack);
  res.status(500).json({ error: language === "vi" ? "Lỗi hệ thống xảy ra" : "System error occurred" });
});

const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
server.setTimeout(300000);
