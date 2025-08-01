try {
  var express = require('express');
  var rateLimit = require('express-rate-limit');
  var cors = require('cors');
  var helmet = require('helmet');
} catch (error) {
  console.error('Critical error: Core modules (express, express-rate-limit, cors, helmet) are missing.');
  console.error('Ensure package.json includes these dependencies and Render runs: npm install');
  console.error('Local fix: npm install express express-rate-limit cors helmet');
  process.exit(1);
}

let NodeCache;
try {
  NodeCache = require('node-cache');
} catch (error) {
  console.warn('Warning: node-cache module is missing. Caching disabled.');
  console.warn('Run: npm install node-cache (optional for performance)');
}

let dotenv;
try {
  dotenv = require('dotenv');
  dotenv.config();
} catch (error) {
  console.warn('Warning: dotenv module is missing. Using default environment variables.');
  console.warn('Run: npm install dotenv (optional for configuration)');
}

const app = express();
const PORT = process.env.PORT || 3000;

const cache = NodeCache ? new NodeCache({ stdTTL: 3600, checkperiod: 600 }) : {
  get: () => null,
  set: () => true,
  getStats: () => ({ hits: 0, misses: 0, keys: 0 })
};

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: {
      vi: 'Quá nhiều yêu cầu, vui lòng thử lại sau 15 phút.',
      en: 'Too many requests, please try again after 15 minutes.'
    }
  }
});
app.use('/api', limiter);

const hoaGiap = [
  'Giáp Tý', 'Ất Sửu', 'Bính Dần', 'Đinh Mão', 'Mậu Thìn', 'Kỷ Tỵ', 'Canh Ngọ', 'Tân Mùi', 'Nhâm Thân', 'Quý Dậu',
  'Giáp Tuất', 'Ất Hợi', 'Bính Tý', 'Đinh Sửu', 'Mậu Dần', 'Kỷ Mão', 'Canh Thìn', 'Tân Tỵ', 'Nhâm Ngọ', 'Quý Mùi',
  'Giáp Thân', 'Ất Dậu', 'Bính Tuất', 'Đinh Hợi', 'Mậu Tý', 'Kỷ Sửu', 'Canh Dần', 'Tân Mão', 'Nhâm Thìn', 'Quý Tỵ',
  'Giáp Ngọ', 'Ất Mùi', 'Bính Thân', 'Đinh Dậu', 'Mậu Tuất', 'Kỷ Hợi', 'Canh Tý', 'Tân Sửu', 'Nhâm Dần', 'Quý Mão',
  'Giáp Thìn', 'Ất Tỵ', 'Bính Ngọ', 'Đinh Mùi', 'Mậu Thân', 'Kỷ Dậu', 'Canh Tuất', 'Tân Hợi', 'Nhâm Tý', 'Quý Sửu',
  'Giáp Dần', 'Ất Mão', 'Bính Thìn', 'Đinh Tỵ', 'Mậu Ngọ', 'Kỷ Mùi', 'Canh Thân', 'Tân Dậu', 'Nhâm Tuất', 'Quý Hợi'
];

const validHeavenlyStems = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const validEarthlyBranches = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const validCanChi = [];
validHeavenlyStems.forEach(stem => {
  validEarthlyBranches.forEach(branch => {
    validCanChi.push(`${stem} ${branch}`);
  });
});

const canNguHanh = {
  Giáp: 'Mộc', Ất: 'Mộc', Bính: 'Hỏa', Đinh: 'Hỏa', Mậu: 'Thổ',
  Kỷ: 'Thổ', Canh: 'Kim', Tân: 'Kim', Nhâm: 'Thủy', Quý: 'Thủy'
};
const chiNguHanh = {
  Tý: 'Thủy', Hợi: 'Thủy', Sửu: 'Thổ', Thìn: 'Thổ', Mùi: 'Thổ', Tuất: 'Thổ',
  Dần: 'Mộc', Mão: 'Mộc', Tỵ: 'Hỏa', Ngọ: 'Hỏa', Thân: 'Kim', Dậu: 'Kim'
};

const hiddenElements = {
  Tý: ['Quý'], Sửu: ['Kỷ', 'Tân', 'Quý'], Dần: ['Giáp', 'Bính', 'Mậu'], Mão: ['Ất'],
  Thìn: ['Mậu', 'Ất', 'Quý'], Tỵ: ['Bính', 'Canh', 'Mậu'], Ngọ: ['Đinh', 'Kỷ'],
  Mùi: ['Kỷ', 'Đinh', 'Ất'], Thân: ['Canh', 'Nhâm', 'Mậu'], Dậu: ['Tân'],
  Tuất: ['Mậu', 'Đinh', 'Tân'], Hợi: ['Nhâm', 'Giáp']
};

const thapThanMap = {
  Kim: {
    Kim: ['Tỷ Kiên', 'Kiếp Tài'], Thủy: ['Thực Thần', 'Thương Quan'], Mộc: ['Chính Tài', 'Thiên Tài'],
    Hỏa: ['Chính Quan', 'Thất Sát'], Thổ: ['Chính Ấn', 'Thiên Ấn']
  },
  Mộc: {
    Mộc: ['Tỷ Kiên', 'Kiếp Tài'], Hỏa: ['Thực Thần', 'Thương Quan'], Thổ: ['Chính Tài', 'Thiên Tài'],
    Kim: ['Chính Quan', 'Thất Sát'], Thủy: ['Chính Ấn', 'Thiên Ấn']
  },
  Hỏa: {
    Hỏa: ['Tỷ Kiên', 'Kiếp Tài'], Thổ: ['Thực Thần', 'Thương Quan'], Kim: ['Chính Tài', 'Thiên Tài'],
    Thủy: ['Chính Quan', 'Thất Sát'], Mộc: ['Chính Ấn', 'Thiên Ấn']
  },
  Thổ: {
    Thổ: ['Tỷ Kiên', 'Kiếp Tài'], Kim: ['Thực Thần', 'Thương Quan'], Thủy: ['Chính Tài', 'Thiên Tài'],
    Mộc: ['Chính Quan', 'Thất Sát'], Hỏa: ['Chính Ấn', 'Thiên Ấn']
  },
  Thủy: {
    Thủy: ['Tỷ Kiên', 'Kiếp Tài'], Mộc: ['Thực Thần', 'Thương Quan'], Hỏa: ['Chính Tài', 'Thiên Tài'],
    Thổ: ['Chính Quan', 'Thất Sát'], Kim: ['Chính Ấn', 'Thiên Ấn']
  }
};

const tuongTinh = {
  'Thân': ['Tý'], 'Tý': ['Tý'], 'Thìn': ['Tý'],
  'Tỵ': ['Dậu'], 'Dậu': ['Dậu'], 'Sửu': ['Dậu'],
  'Dần': ['Ngọ'], 'Ngọ': ['Ngọ'], 'Tuất': ['Ngọ'],
  'Hợi': ['Mão'], 'Mão': ['Mão'], 'Mùi': ['Mão']
};
const thienAtQuyNhan = {
  Giáp: ['Sửu', 'Mùi'], Mậu: ['Sửu', 'Mùi'], Canh: ['Sửu', 'Mùi'],
  Ất: ['Thân', 'Tý'], Kỷ: ['Thân', 'Tý'],
  Bính: ['Dậu', 'Hợi'], Đing: ['Dậu', 'Hợi'],
  Tân: ['Dần', 'Ngọ'],
  Nhâm: ['Tỵ', 'Mão'], Quý: ['Tỵ', 'Mão']
};
const vanXuong = {
  Giáp: ['Tỵ'], Ất: ['Ngọ'], Bính: ['Thân'], Đinh: ['Dậu'], Mậu: ['Thân'],
  Kỷ: ['Dậu'], Canh: ['Hợi'], Tân: ['Tý'], Nhâm: ['Dần'], Quý: ['Mão']
};
const daoHoa = {
  'Thân': ['Dậu'], 'Tý': ['Dậu'], 'Thìn': ['Dậu'],
  'Tỵ': ['Ngọ'], 'Dậu': ['Ngọ'], 'Sửu': ['Ngọ'],
  'Dần': ['Mão'], 'Ngọ': ['Mão'], 'Tuất': ['Mão'],
  'Hợi': ['Tý'], 'Mão': ['Tý'], 'Mùi': ['Tý']
};
const dichMa = {
  'Thân': ['Dần'], 'Tý': ['Dần'], 'Thìn': ['Dần'],
  'Tỵ': ['Hợi'], 'Dậu': ['Hợi'], 'Sửu': ['Hợi'],
  'Dần': ['Thân'], 'Ngọ': ['Thân'], 'Tuất': ['Thân'],
  'Hợi': ['Tỵ'], 'Mão': ['Tỵ'], 'Mùi': ['Tỵ']
};
const coThanQuaTu = {
  'Tý': ['Dần', 'Tuất'], 'Sửu': ['Dần', 'Tuất'], 'Hợi': ['Dần', 'Tuất'],
  'Dần': ['Tỵ', 'Sửu'], 'Mão': ['Tỵ', 'Sửu'], 'Thìn': ['Tỵ', 'Sửu'],
  'Tỵ': ['Thân', 'Thìn'], 'Ngọ': ['Thân', 'Thìn'], 'Mùi': ['Thân', 'Thìn'],
  'Thân': ['Hợi', 'Mùi'], 'Dậu': ['Hợi', 'Mùi'], 'Tuất': ['Hợi', 'Mùi']
};
const kiepSat = {
  'Thân': ['Tỵ'], 'Tý': ['Tỵ'], 'Thìn': ['Tỵ'],
  'Tỵ': ['Dần'], 'Dậu': ['Dần'], 'Sửu': ['Dần'],
  'Dần': ['Hợi'], 'Ngọ': ['Hợi'], 'Tuất': ['Hợi'],
  'Hợi': ['Thân'], 'Mão': ['Thân'], 'Mùi': ['Thân']
};
const khongVong = {
  'Giáp Tý': ['Tuất', 'Hợi'], 'Ất Sửu': ['Tuất', 'Hợi'], 'Bính Dần': ['Tuất', 'Hợi'], 'Đinh Mão': ['Tuất', 'Hợi'], 'Mậu Thìn': ['Tuất', 'Hợi'],
  'Kỷ Tỵ': ['Tuất', 'Hợi'], 'Canh Ngọ': ['Tuất', 'Hợi'], 'Tân Mùi': ['Tuất', 'Hợi'], 'Nhâm Thân': ['Tuất', 'Hợi'], 'Quý Dậu': ['Tuất', 'Hợi'],
  'Giáp Tuất': ['Thân', 'Dậu'], 'Ất Hợi': ['Thân', 'Dậu'], 'Bính Tý': ['Thân', 'Dậu'], 'Đinh Sửu': ['Thân', 'Dậu'], 'Mậu Dần': ['Thân', 'Dậu'],
  'Kỷ Mão': ['Thân', 'Dậu'], 'Canh Thìn': ['Thân', 'Dậu'], 'Tân Tỵ': ['Thân', 'Dậu'], 'Nhâm Ngọ': ['Thân', 'Dậu'], 'Quý Mùi': ['Thân', 'Dậu'],
  'Giáp Thân': ['Ngọ', 'Mùi'], 'Ất Dậu': ['Ngọ', 'Mùi'], 'Bính Tuất': ['Ngọ', 'Mùi'], 'Đinh Hợi': ['Ngọ', 'Mùi'], 'Mậu Tý': ['Ngọ', 'Mùi'],
  'Kỷ Sửu': ['Ngọ', 'Mùi'], 'Canh Dần': ['Ngọ', 'Mùi'], 'Tân Mão': ['Ngọ', 'Mùi'], 'Nhâm Thìn': ['Ngọ', 'Mùi'], 'Quý Tỵ': ['Ngọ', 'Mùi'],
  'Giáp Ngọ': ['Thìn', 'Tỵ'], 'Ất Mùi': ['Thìn', 'Tỵ'], 'Bính Thân': ['Thìn', 'Tỵ'], 'Đinh Dậu': ['Thìn', 'Tỵ'], 'Mậu Tuất': ['Thìn', 'Tỵ'],
  'Kỷ Hợi': ['Thìn', 'Tỵ'], 'Canh Tý': ['Thìn', 'Tỵ'], 'Tân Sửu': ['Thìn', 'Tỵ'], 'Nhâm Dần': ['Thìn', 'Tỵ'], 'Quý Mão': ['Thìn', 'Tỵ'],
  'Giáp Thìn': ['Dần', 'Mão'], 'Ất Tỵ': ['Dần', 'Mão'], 'Bính Ngọ': ['Dần', 'Mão'], 'Đinh Mùi': ['Dần', 'Mão'], 'Mậu Thân': ['Dần', 'Mão'],
  'Kỷ Dậu': ['Dần', 'Mão'], 'Canh Tuất': ['Dần', 'Mão'], 'Tân Hợi': ['Dần', 'Mão'], 'Nhâm Tý': ['Dần', 'Mão'], 'Quý Sửu': ['Dần', 'Mão'],
  'Giáp Dần': ['Tý', 'Sửu'], 'Ất Mão': ['Tý', 'Sửu'], 'Bính Thìn': ['Tý', 'Sửu'], 'Đinh Tỵ': ['Tý', 'Sửu'], 'Mậu Ngọ': ['Tý', 'Sửu'],
  'Kỷ Mùi': ['Tý', 'Sửu'], 'Canh Thân': ['Tý', 'Sửu'], 'Tân Dậu': ['Tý', 'Sửu'], 'Nhâm Tuất': ['Tý', 'Sửu'], 'Quý Hợi': ['Tý', 'Sửu']
};

const dayMasterDescriptions = {
  Mộc: {
    vi: 'Như cây đại thụ vươn mình đón nắng, bạn sở hữu sức sống mãnh liệt, tinh thần sáng tạo và khả năng thích nghi cao.',
    en: 'Like a towering tree reaching for sunlight, you possess vibrant vitality, creativity, and strong adaptability.'
  },
  Hỏa: {
    vi: 'Như ngọn lửa bùng cháy, bạn mang năng lượng nhiệt huyết, đam mê và khả năng dẫn dắt mọi người.',
    en: 'Like a blazing flame, you carry passionate energy, enthusiasm, and the ability to lead others.'
  },
  Thổ: {
    vi: 'Như đất mẹ vững chãi, bạn đáng tin cậy, kiên nhẫn và luôn tạo nền tảng ổn định cho mọi người xung quanh.',
    en: 'Like the steadfast earth, you are reliable, patient, and provide a stable foundation for those around you.'
  },
  Kim: {
    vi: 'Như kim loại sắc bén, bạn cứng cỏi, quyết đoán và luôn theo đuổi sự hoàn hảo trong mọi việc.',
    en: 'Like sharp metal, you are resolute, decisive, and always pursue perfection in all endeavors.'
  },
  Thủy: {
    vi: 'Như dòng nước chảy, bạn linh hoạt, thông minh và có khả năng thích nghi với mọi hoàn cảnh.',
    en: 'Like flowing water, you are flexible, intelligent, and adaptable to any situation.'
  }
};

function validateCanChi({ gio, ngay, thang, nam }) {
  const inputs = [gio, ngay, thang, nam];
  for (const input of inputs) {
    if (!input || !validCanChi.includes(input)) {
      console.error(`Invalid Can Chi: ${input}`);
      return false;
    }
  }
  return true;
}

function analyzeNguHanh(tuTru) {
  const nguHanhCount = { Mộc: 0, Hỏa: 0, Thổ: 0, Kim: 0, Thủy: 0 };
  try {
    const elements = [
      tuTru.nam ? tuTru.nam.split(' ') : [],
      tuTru.thang ? tuTru.thang.split(' ') : [],
      tuTru.ngay ? tuTru.ngay.split(' ') : [],
      tuTru.gio ? tuTru.gio.split(' ') : []
    ].flat().filter(Boolean);
    const branches = [
      tuTru.nam?.split(' ')[1], tuTru.thang?.split(' ')[1],
      tuTru.ngay?.split(' ')[1], tuTru.gio?.split(' ')[1]
    ].filter(Boolean);

    if (elements.length < 4 || branches.length < 4) {
      throw new Error('Tứ Trụ không đầy đủ hoặc không hợp lệ');
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
    if (total === 0) throw new Error('Không tìm thấy ngũ hành hợp lệ');
    return nguHanhCount;
  } catch (e) {
    console.error('Error analyzing Ngũ Hành:', e.message, { tuTru });
    throw new Error('Không thể phân tích ngũ hành do dữ liệu Tứ Trụ không hợp lệ');
  }
}

function tinhThapThan(nhatChu, tuTru) {
  if (!nhatChu || !canNguHanh[nhatChu]) {
    console.error('Invalid Nhật Chủ:', { nhatChu });
    throw new Error('Nhật Chủ không hợp lệ');
  }

  const isYang = ['Giáp', 'Bính', 'Mậu', 'Canh', 'Nhâm'].includes(nhatChu);
  const thapThanResults = {};

  try {
    const elements = [
      tuTru.gio?.split(' ')[0], tuTru.thang?.split(' ')[0], tuTru.nam?.split(' ')[0]
    ].filter(Boolean);
    const branches = [
      tuTru.gio?.split(' ')[1], tuTru.ngay?.split(' ')[1],
      tuTru.thang?.split(' ')[1], tuTru.nam?.split(' ')[1]
    ].filter(Boolean);

    if (elements.length < 3 || branches.length < 4) {
      throw new Error('Tứ Trụ không đầy đủ để tính Thập Thần');
    }

    for (const can of elements) {
      if (can === nhatChu) continue;
      const nguHanh = canNguHanh[can];
      if (!nguHanh) continue;
      const isCanYang = ['Giáp', 'Bính', 'Mậu', 'Canh', 'Nhâm'].includes(can);
      const index = (isYang === isCanYang) ? 0 : 1;
      thapThanResults[can] = thapThanMap[canNguHanh[nhatChu]][nguHanh][index];
    }

    for (const chi of branches) {
      const nguHanh = chiNguHanh[chi];
      if (!nguHanh) continue;
      const isChiYang = ['Tý', 'Dần', 'Thìn', 'Ngọ', 'Thân', 'Tuất'].includes(chi);
      const index = (isYang === isChiYang) ? 0 : 1;
      thapThanResults[chi] = thapThanMap[canNguHanh[nhatChu]][nguHanh][index];
    }

    return thapThanResults;
  } catch (e) {
    console.error('Error calculating Thập Thần:', e.message, { nhatChu, tuTru });
    throw new Error('Không thể tính Thập Thần do dữ liệu Tứ Trụ không hợp lệ');
  }
}

function tinhThanSat(tuTru) {
  const nhatChu = tuTru.ngay?.split(' ')[0];
  const dayCanChi = tuTru.ngay;
  const branches = [
    tuTru.nam?.split(' ')[1], tuTru.thang?.split(' ')[1],
    tuTru.ngay?.split(' ')[1], tuTru.gio?.split(' ')[1]
  ].filter(Boolean);

  if (!nhatChu || !dayCanChi || branches.length < 4) {
    console.error('Invalid Nhật Chủ or branches:', { nhatChu, dayCanChi, branches });
    throw new Error('Nhật Chủ hoặc chi không hợp lệ');
  }

  const dayBranch = tuTru.ngay.split(' ')[1];

  return {
    'Tướng Tinh': {
      vi: 'Tướng Tinh', en: 'General Star',
      value: tuongTinh[dayBranch]?.filter(chi => branches.includes(chi)) || [],
      description: {
        vi: 'Hỗ trợ khởi nghiệp, thăng tiến, thi cử, bầu cử, và đầu tư. Biểu thị người văn võ toàn tài, thông minh, thu nhập cao và địa vị cao trong xã hội.',
        en: 'Supports startups, promotions, exams, elections, and investments. Indicates a versatile, intelligent person with high income and social status.'
      }
    },
    'Thiên Ất Quý Nhân': {
      vi: 'Thiên Ất Quý Nhân', en: 'Nobleman Star',
      value: thienAtQuyNhan[nhatChu]?.filter(chi => branches.includes(chi)) || [],
      description: {
        vi: 'Thần sát mạnh nhất, mang lại sự hỗ trợ từ người khác, hóa giải khó khăn, phù hợp với sự nghiệp và quan hệ xã hội. Thông minh, trí huệ, thiên tư sáng sủa.',
        en: 'The most powerful star, brings support from others, resolves difficulties, ideal for career and social relations. Intelligent, wise, and talented.'
      }
    },
    'Văn Xương': {
      vi: 'Văn Xương', en: 'Literary Star',
      value: vanXuong[nhatChu]?.filter(chi => branches.includes(chi)) || [],
      description: {
        vi: 'Biểu thị sự thông minh, thành công học thuật, kỹ năng giao tiếp. Lợi về sự nghiệp, danh lợi song toàn.',
        en: 'Signifies intelligence, academic success, and communication skills. Benefits career and fame.'
      }
    },
    'Đào Hoa': {
      vi: 'Đào Hoa', en: 'Peach Blossom',
      value: daoHoa[dayBranch]?.filter(chi => branches.includes(chi)) || [],
      description: {
        vi: 'Mang lại sức hút, duyên dáng, nhưng cần cẩn trọng tránh rắc rối tình cảm. Tốt cho lĩnh vực giải trí.',
        en: 'Brings charm and charisma, but caution is needed to avoid emotional complications. Good for entertainment.'
      }
    },
    'Dịch Mã': {
      vi: 'Dịch Mã', en: 'Traveling Horse',
      value: dichMa[dayBranch]?.filter(chi => branches.includes(chi)) || [],
      description: {
        vi: 'Biểu thị sự di chuyển, cơ hội nghề nghiệp ở nước ngoài, và thay đổi tích cực trong sự nghiệp.',
        en: 'Indicates movement, overseas career opportunities, and positive career changes.'
      }
    },
    'Cô Thần Quả Tú': {
      vi: 'Cô Thần Quả Tú', en: 'Solitary Widow',
      value: coThanQuaTu[dayBranch]?.filter(chi => branches.includes(chi)) || [],
      description: {
        vi: 'Gây khó khăn trong hôn nhân, biểu thị sự cô đơn. Có thể hỗ trợ thành công học vấn do tập trung vào công việc.',
        en: 'Causes marital challenges and loneliness. May support academic success due to focus on work.'
      }
    },
    'Kiếp Sát': {
      vi: 'Kiếp Sát', en: 'Robbery Sha',
      value: kiepSat[dayBranch]?.filter(chi => branches.includes(chi)) || [],
      description: {
        vi: 'Biểu thị thách thức, nguy cơ mất tiền hoặc tiểu nhân. Người thông minh nhưng gặp nhiều thử thách.',
        en: 'Indicates challenges, financial loss, or adversaries. Intelligent but faces many challenges.'
      }
    },
    'Không Vong': {
      vi: 'Không Vong', en: 'Void Star',
      value: khongVong[dayCanChi]?.filter(chi => branches.includes(chi)) || [],
      description: {
        vi: 'Làm suy yếu ngũ hành tại Thiên Can, có thể gây khó khăn nhưng nếu gặp Lục Hợp hoặc Tam Hợp thì ảnh hưởng giảm. Ba Không Vong là cách cục tốt.',
        en: 'Weakens the Heavenly Stem’s element, may cause difficulties but mitigated by Six Combinations or Triple Harmony. Three Void Stars form a favorable pattern.'
      }
    }
  };
}

function generateResponse(tuTru, nguHanhCount, thapThanResults, dungThanText, userInput, language = 'vi') {
  const nhatChu = tuTru.ngay.split(' ')[0];
  const thangChi = tuTru.thang.split(' ')[1];
  const totalElements = Object.values(nguHanhCount).reduce((a, b) => a + b, 0);
  const tyLeNguHanh = Object.fromEntries(
    Object.entries(nguHanhCount).map(([k, v]) => [k, `${((v / totalElements) * 100).toFixed(2)}%`])
  );
  const userInputLower = userInput.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const thanSat = tinhThanSat(tuTru);
  const dungThan = Array.isArray(dungThanText) ? dungThanText : dungThanText.split(',').map(e => e.trim());

  const isMoney = /tien bac|tai chinh|money|finance|wealth|thu nhap|lam giau|dau tu|investment|kinh doanh|business/i.test(userInputLower);
  const isCareer = /nghe|cong viec|su nghiep|career|job|vieclam|nghe nghiep|lam viec|occupation|profession/i.test(userInputLower);
  const isHealth = /suc khoe|benh tat|health|illness|binh an|wellness|benh|disease|khoe manh|healthy/i.test(userInputLower);
  const isLove = /tinh duyen|tinh yeu|love|hon nhan|marriage|vo chong|ket hon|romance|doi lua|partner|nguoi yeu|boyfriend|girlfriend/i.test(userInputLower);
  const isChildren = /con cai|children|con|be|gia dinh|family|con chau|offspring|tre con|kids/i.test(userInputLower);
  const isComplex = /du doan|tuong lai|future|dai van|van menh|destiny|so menh|fate|nam nay|this year|nam sau|next year/i.test(userInputLower);
  const isThapThan = /thap than|ten gods|thapthan|tenth gods/i.test(userInputLower);
  const isThanSat = /than sat|auspicious stars|sao|star|thansat/i.test(userInputLower);
  const isGeneral = !isMoney && !isCareer && !isHealth && !isLove && !isChildren && !isComplex && !isThapThan && !isThanSat;

  const response = {
    nguHanh: tyLeNguHanh,
    thapThan: thapThanResults,
    thanSat,
    dungThan
  };

  if (isGeneral) {
    response.message = {
      vi: `
Nhật Chủ ${nhatChu} (${canNguHanh[nhatChu]}): ${dayMasterDescriptions[canNguHanh[nhatChu]].vi}
Tứ Trụ: Giờ ${tuTru.gio}, Ngày ${tuTru.ngay}, Tháng ${tuTru.thang}, Năm ${tuTru.nam}
Ngũ Hành:
${Object.entries(tyLeNguHanh).map(([k, v]) => `${k}: ${v} (${parseFloat(v) >= 30 ? 'mạnh' : parseFloat(v) <= 15 ? 'yếu' : 'trung bình'})`).join('\n')}
Dụng Thần: ${dungThan.join(', ')}
Đề xuất: Sử dụng màu sắc ${dungThan.includes('Mộc') ? 'xanh lá cây, gỗ' : dungThan.includes('Hỏa') ? 'đỏ, cam' : dungThan.includes('Thổ') ? 'nâu, vàng đất' : dungThan.includes('Kim') ? 'trắng, bạc' : 'xanh dương, đen'} và vật phẩm như ${dungThan.includes('Mộc') ? 'ngọc bích, gỗ' : dungThan.includes('Hỏa') ? 'thạch anh hồng, đá ruby' : dungThan.includes('Thổ') ? 'đá thạch anh vàng, gốm' : dungThan.includes('Kim') ? 'trang sức bạc, thép' : 'thủy tinh, sapphire'} để tăng cường vận may và cân bằng năng lượng. Chúc bạn thuận buồm xuôi gió, gặp nhiều may mắn!
`,
      en: `
Day Master ${nhatChu} (${canNguHanh[nhatChu]}): ${dayMasterDescriptions[canNguHanh[nhatChu]].en}
Four Pillars: Hour ${tuTru.gio}, Day ${tuTru.ngay}, Month ${tuTru.thang}, Year ${tuTru.nam}
Five Elements:
${Object.entries(tyLeNguHanh).map(([k, v]) => `${k}: ${v} (${parseFloat(v) >= 30 ? 'strong' : parseFloat(v) <= 15 ? 'weak' : 'balanced'})`).join('\n')}
Useful God: ${dungThan.join(', ')}
Recommendation: Use colors ${dungThan.includes('Mộc') ? 'green, wood' : dungThan.includes('Hỏa') ? 'red, orange' : dungThan.includes('Thổ') ? 'brown, earthy tones' : dungThan.includes('Kim') ? 'white, silver' : 'blue, black'} and items like ${dungThan.includes('Mộc') ? 'jade, wooden objects' : dungThan.includes('Hỏa') ? 'rose quartz, ruby' : dungThan.includes('Thổ') ? 'citrine, ceramics' : dungThan.includes('Kim') ? 'silver jewelry, steel' : 'glass, sapphire'} to enhance luck and balance energy. Wishing you smooth sailing and abundant fortune!
`
    };
  } else if (isCareer) {
    response.message = {
      vi: `
Sự nghiệp: Với Dụng Thần ${dungThan.join(', ')}, bạn phù hợp với các lĩnh vực như ${dungThan.includes('Mộc') ? 'giáo dục, công nghệ xanh, thiết kế' : dungThan.includes('Hỏa') ? 'nghệ thuật, truyền thông, marketing' : dungThan.includes('Thổ') ? 'bất động sản, nông nghiệp, quản lý' : dungThan.includes('Kim') ? 'công nghệ, tài chính, kỹ thuật' : 'thương mại, vận tải, du lịch'}. ${thanSat['Văn Xương'].value.length ? 'Văn Xương hỗ trợ trí tuệ và giao tiếp, giúp bạn tỏa sáng trong công việc.' : ''} ${thanSat['Dịch Mã'].value.length ? 'Dịch Mã mang cơ hội phát triển ở nước ngoài.' : ''} ${thanSat['Tướng Tinh'].value.length ? 'Tướng Tinh thúc đẩy thăng tiến và khởi nghiệp.' : ''} Đề xuất: Sử dụng màu ${dungThan.includes('Mộc') ? 'xanh lá' : dungThan.includes('Hỏa') ? 'đỏ' : dungThan.includes('Thổ') ? 'nâu' : dungThan.includes('Kim') ? 'trắng' : 'xanh dương'} để tăng cường năng lượng. Chúc bạn thành công rực rỡ, vươn xa trên con đường sự nghiệp!
`,
      en: `
Career: With Useful Gods ${dungThan.join(', ')}, you are suited for fields like ${dungThan.includes('Mộc') ? 'education, green tech, design' : dungThan.includes('Hỏa') ? 'arts, media, marketing' : dungThan.includes('Thổ') ? 'real estate, agriculture, management' : dungThan.includes('Kim') ? 'tech, finance, engineering' : 'trade, transport, tourism'}. ${thanSat['Văn Xương'].value.length ? 'Literary Star enhances intelligence and communication, helping you shine at work.' : ''} ${thanSat['Dịch Mã'].value.length ? 'Traveling Horse brings overseas opportunities.' : ''} ${thanSat['Tướng Tinh'].value.length ? 'General Star promotes advancement and entrepreneurship.' : ''} Recommendation: Use ${dungThan.includes('Mộc') ? 'green' : dungThan.includes('Hỏa') ? 'red' : dungThan.includes('Thổ') ? 'brown' : dungThan.includes('Kim') ? 'white' : 'blue'} to boost energy. Wishing you brilliant success and a soaring career!
`
    };
  } else if (isMoney) {
    const chinhTai = thapThanResults['Kỷ'] || thapThanResults['Mậu'] || 'Không nổi bật';
    response.message = {
      vi: `
Tài lộc: Chính Tài/Thiên Tài (${chinhTai}): Bạn có khả năng quản lý tài chính tốt, đặc biệt trong các lĩnh vực sáng tạo hoặc đầu tư. Dụng Thần ${dungThan[0]} mạnh sẽ thúc đẩy tài lộc. Năm 2026 mang cơ hội qua các dự án liên quan đến ${dungThan[0]}. ${thanSat['Kiếp Sát'].value.length ? 'Cẩn thận tiểu nhân hoặc mất tiền do đầu tư mạo hiểm.' : ''} ${thanSat['Không Vong'].value.length ? 'Không Vong có thể ảnh hưởng tài vận, cần thận trọng trong quyết định tài chính.' : ''} Đề xuất: Tập trung vào các cơ hội đầu tư liên quan đến ${dungThan.includes('Mộc') ? 'giáo dục, công nghệ xanh' : dungThan.includes('Hỏa') ? 'nghệ thuật, truyền thông' : dungThan.includes('Thổ') ? 'bất động sản, nông nghiệp' : dungThan.includes('Kim') ? 'công nghệ, tài chính' : 'thương mại, vận tải'}; sử dụng màu ${dungThan.includes('Mộc') ? 'xanh lá' : dungThan.includes('Hỏa') ? 'đỏ' : dungThan.includes('Thổ') ? 'nâu' : dungThan.includes('Kim') ? 'trắng' : 'xanh dương'}. Chúc bạn thịnh vượng, tài lộc dồi dào!
`,
      en: `
Wealth: Direct/Indirect Wealth (${chinhTai}): You excel in financial management, especially in creative or investment fields. Strong ${dungThan[0]} boosts wealth. 2026 brings opportunities via ${dungThan[0]}-related projects. ${thanSat['Kiếp Sát'].value.length ? 'Beware of adversaries or financial loss from risky investments.' : ''} ${thanSat['Không Vong'].value.length ? 'Void Star may affect finances; be cautious with financial decisions.' : ''} Recommendation: Focus on investments in ${dungThan.includes('Mộc') ? 'education, green tech' : dungThan.includes('Hỏa') ? 'arts, media' : dungThan.includes('Thổ') ? 'real estate, agriculture' : dungThan.includes('Kim') ? 'tech, finance' : 'trade, transport'}; use ${dungThan.includes('Mộc') ? 'green' : dungThan.includes('Hỏa') ? 'red' : dungThan.includes('Thổ') ? 'brown' : dungThan.includes('Kim') ? 'white' : 'blue'}. Wishing you prosperity and abundant wealth!
`
    };
  } else if (isHealth) {
    response.message = {
      vi: `
Sức khỏe: Để cân bằng năng lượng, hãy chú trọng Dụng Thần ${dungThan.join(', ')}. ${thanSat['Kiếp Sát'].value.length ? 'Cẩn thận bệnh tật hoặc tai nạn nhỏ, đặc biệt khi mệt mỏi.' : ''} ${thanSat['Không Vong'].value.length ? 'Không Vong có thể gây khó khăn về sức khỏe, cần nghỉ ngơi đầy đủ.' : ''} Đề xuất: Sử dụng vật phẩm như ${dungThan.includes('Mộc') ? 'ngọc bích, cây xanh' : dungThan.includes('Hỏa') ? 'đá ruby, ánh sáng mạnh' : dungThan.includes('Thổ') ? 'đá thạch anh vàng, gốm' : dungThan.includes('Kim') ? 'trang sức bạc' : 'thủy tinh, sapphire'} và màu sắc ${dungThan.includes('Mộc') ? 'xanh lá' : dungThan.includes('Hỏa') ? 'đỏ' : dungThan.includes('Thổ') ? 'nâu' : dungThan.includes('Kim') ? 'trắng' : 'xanh dương'} để tăng cường sức khỏe. Chúc bạn dồi dào sức khỏe, bình an mỗi ngày!
`,
      en: `
Health: To balance energy, focus on Useful Gods ${dungThan.join(', ')}. ${thanSat['Kiếp Sát'].value.length ? 'Beware of illness or minor accidents, especially when fatigued.' : ''} ${thanSat['Không Vong'].value.length ? 'Void Star may cause health challenges; ensure adequate rest.' : ''} Recommendation: Use items like ${dungThan.includes('Mộc') ? 'jade, green plants' : dungThan.includes('Hỏa') ? 'ruby, bright lighting' : dungThan.includes('Thổ') ? 'citrine, ceramics' : dungThan.includes('Kim') ? 'silver jewelry' : 'glass, sapphire'} and colors ${dungThan.includes('Mộc') ? 'green' : dungThan.includes('Hỏa') ? 'red' : dungThan.includes('Thổ') ? 'brown' : dungThan.includes('Kim') ? 'white' : 'blue'} to enhance health. Wishing you abundant vitality and daily peace!
`
    };
  } else if (isLove) {
    response.message = {
      vi: `
Tình duyên: ${thanSat['Đào Hoa'].value.length ? 'Đào Hoa tăng sức hút, giúp bạn dễ dàng thu hút đối phương, nhưng cần chân thành và cẩn trọng trong cảm xúc.' : 'Không có Đào Hoa, bạn nên chủ động tìm kiếm và mở lòng trong tình cảm.'} ${thanSat['Cô Thần Quả Tú'].value.length ? 'Cô Thần Quả Tú có thể gây khó khăn trong hôn nhân, cần kiên nhẫn và thấu hiểu.' : ''} ${thanSat['Không Vong'].value.length ? 'Không Vong có thể ảnh hưởng tình duyên, hãy chú ý giao tiếp rõ ràng.' : ''} Dụng Thần ${dungThan.join(', ')} hỗ trợ bạn xây dựng mối quan hệ bền vững. Đề xuất: Sử dụng màu ${dungThan.includes('Mộc') ? 'xanh lá' : dungThan.includes('Hỏa') ? 'đỏ' : dungThan.includes('Thổ') ? 'nâu' : dungThan.includes('Kim') ? 'trắng' : 'xanh dương'} và tham gia các sự kiện liên quan đến ${dungThan.includes('Mộc') ? 'nghệ thuật, giáo dục' : dungThan.includes('Hỏa') ? 'giải trí, truyền thông' : dungThan.includes('Thổ') ? 'cộng đồng, từ thiện' : dungThan.includes('Kim') ? 'công nghệ, hội thảo' : 'du lịch, giao lưu'}. Chúc bạn sớm tìm được hạnh phúc viên mãn!
`,
      en: `
Romance: ${thanSat['Đào Hoa'].value.length ? 'Peach Blossom enhances your charm, making it easier to attract others, but sincerity and emotional caution are key.' : 'No Peach Blossom; be proactive and open-hearted in relationships.'} ${thanSat['Cô Thần Quả Tú'].value.length ? 'Solitary Widow may cause marital challenges; patience and understanding are needed.' : ''} ${thanSat['Không Vong'].value.length ? 'Void Star may affect relationships; focus on clear communication.' : ''} Useful Gods ${dungThan.join(', ')} support building lasting relationships. Recommendation: Use ${dungThan.includes('Mộc') ? 'green' : dungThan.includes('Hỏa') ? 'red' : dungThan.includes('Thổ') ? 'brown' : dungThan.includes('Kim') ? 'white' : 'blue'} and engage in events related to ${dungThan.includes('Mộc') ? 'arts, education' : dungThan.includes('Hỏa') ? 'entertainment, media' : dungThan.includes('Thổ') ? 'community, charity' : dungThan.includes('Kim') ? 'tech, seminars' : 'travel, networking'}. Wishing you lasting happiness and fulfillment!
`
    };
  } else if (isChildren) {
    const thucThan = thapThanResults['Thực Thần'] || thapThanResults['Thương Quan'] || 'Không rõ';
    response.message = {
      vi: `
Con cái: Vận con cái chịu ảnh hưởng từ ${thucThan}. Dụng Thần ${dungThan.join(', ')} giúp bạn xây dựng mối quan hệ gia đình hài hòa. ${thanSat['Cô Thần Quả Tú'].value.length ? 'Cô Thần Quả Tú có thể gây trở ngại, cần dành nhiều thời gian cho con cái.' : ''} ${thanSat['Không Vong'].value.length ? 'Không Vong có thể ảnh hưởng, hãy chú ý chăm sóc sức khỏe con trẻ.' : ''} Đề xuất: Sử dụng vật phẩm như ${dungThan.includes('Mộc') ? 'ngọc bích, đồ gỗ' : dungThan.includes('Hỏa') ? 'đá ruby, vật phẩm đỏ' : dungThan.includes('Thổ') ? 'đá thạch anh vàng, gốm' : dungThan.includes('Kim') ? 'trang sức bạc' : 'thủy tinh, sapphire'} để tăng năng lượng tích cực cho gia đình. Chúc gia đình bạn luôn hạnh phúc, con cái khỏe mạnh!
`,
      en: `
Children: Luck with children is influenced by ${thucThan}. Useful Gods ${dungThan.join(', ')} help you build harmonious family relationships. ${thanSat['Cô Thần Quả Tú'].value.length ? 'Solitary Widow may cause challenges; spend more time with your children.' : ''} ${thanSat['Không Vong'].value.length ? 'Void Star may affect children; pay attention to their health.' : ''} Recommendation: Use items like ${dungThan.includes('Mộc') ? 'jade, wooden objects' : dungThan.includes('Hỏa') ? 'ruby, red items' : dungThan.includes('Thổ') ? 'citrine, ceramics' : dungThan.includes('Kim') ? 'silver jewelry' : 'glass, sapphire'} to enhance positive family energy. Wishing your family happiness and healthy children!
`
    };
  } else if (isComplex) {
    response.message = {
      vi: `
Vận mệnh: Dụng Thần ${dungThan.join(', ')} là kim chỉ nam cho tương lai của bạn. ${thanSat['Không Vong'].value.length ? 'Không Vong có thể gây trở ngại, cần thận trọng trong các quyết định lớn.' : ''} ${thanSat['Thiên Ất Quý Nhân'].value.length ? 'Thiên Ất Quý Nhân mang đến sự hỗ trợ từ quý nhân, giúp bạn vượt qua khó khăn.' : ''} Năm 2026, hãy tập trung vào ${dungThan.includes('Mộc') ? 'phát triển sáng tạo, học vấn' : dungThan.includes('Hỏa') ? 'giao tiếp, nghệ thuật' : dungThan.includes('Thổ') ? 'xây dựng nền tảng ổn định' : dungThan.includes('Kim') ? 'tư duy logic, công nghệ' : 'linh hoạt, thích nghi'}. Đề xuất: Sử dụng màu ${dungThan.includes('Mộc') ? 'xanh lá' : dungThan.includes('Hỏa') ? 'đỏ' : dungThan.includes('Thổ') ? 'nâu' : dungThan.includes('Kim') ? 'trắng' : 'xanh dương'}. Chúc bạn định hướng đúng đắn, tương lai rạng ngời!
`,
      en: `
Destiny: Useful Gods ${dungThan.join(', ')} guide your future path. ${thanSat['Không Vong'].value.length ? 'Void Star may cause obstacles; be cautious with major decisions.' : ''} ${thanSat['Thiên Ất Quý Nhân'].value.length ? 'Nobleman Star brings support from benefactors, helping you overcome challenges.' : ''} In 2026, focus on ${dungThan.includes('Mộc') ? 'creativity, education' : dungThan.includes('Hỏa') ? 'communication, arts' : dungThan.includes('Thổ') ? 'building a stable foundation' : dungThan.includes('Kim') ? 'logical thinking, technology' : 'flexibility, adaptability'}. Recommendation: Use ${dungThan.includes('Mộc') ? 'green' : dungThan.includes('Hỏa') ? 'red' : dungThan.includes('Thổ') ? 'brown' : dungThan.includes('Kim') ? 'white' : 'blue'}. Wishing you a clear path and a bright future!
`
    };
  } else if (isThapThan) {
    response.message = {
      vi: `Thập Thần: ${JSON.stringify(thapThanResults, null, 2)}`,
      en: `Ten Gods: ${JSON.stringify(thapThanResults, null, 2)}`
    };
  } else if (isThanSat) {
    response.message = {
      vi: `Thần Sát: ${JSON.stringify(thanSat, null, 2)}`,
      en: `Auspicious Stars: ${JSON.stringify(thanSat, null, 2)}`
    };
  }

  return response;
}

app.post('/api/bazi', async (req, res) => {
  try {
    const { gio, ngay, thang, nam, userInput = '', language = 'vi', dungThanText = '' } = req.body;

    if (!validateCanChi({ gio, ngay, thang, nam })) {
      console.error('Invalid Can Chi input:', { body: req.body });
      return res.status(400).json({
        error: {
          vi: 'Dữ liệu Can Chi không hợp lệ. Vui lòng kiểm tra giờ, ngày, tháng, năm.',
          en: 'Invalid Can Chi data. Please check hour, day, month, year.'
        }
      });
    }

    if (!dungThanText) {
      console.error('Missing dungThanText:', { body: req.body });
      return res.status(400).json({
        error: {
          vi: 'Thiếu thông tin Dụng Thần. Vui lòng cung cấp Dụng Thần từ client.',
          en: 'Missing Useful God information. Please provide Useful God from client.'
        }
      });
    }

    console.log('Processing Bát Tự request:', { gio, ngay, thang, nam, userInput, language, dungThanText });

    const cacheKey = `${gio}:${ngay}:${thang}:${nam}:${userInput}:${language}:${dungThanText}`;
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      console.log('Returning cached Bát Tự result:', { cacheKey });
      return res.json(cachedResult);
    }

    const tuTru = { gio, ngay, thang, nam };
    const nhatChu = ngay.split(' ')[0];
    const nguHanhCount = await analyzeNguHanh(tuTru);
    const thapThanResults = tinhThapThan(nhatChu, tuTru);
    const response = generateResponse(tuTru, nguHanhCount, thapThanResults, dungThanText, userInput, language);

    cache.set(cacheKey, response);
    res.json(response);
  } catch (error) {
    console.error('Bát Tự endpoint error:', error.message, { stack: error.stack });
    res.status(500).json({
      error: {
        vi: 'Lỗi tính toán Bát Tự, vui lòng thử lại sau.',
        en: 'Bát Tự calculation error, please try again later.'
      }
    });
  }
});

app.post('/api/bazi/career', async (req, res) => {
  try {
    const { gio, ngay, thang, nam, language = 'vi', dungThanText = '' } = req.body;

    if (!validateCanChi({ gio, ngay, thang, nam })) {
      console.error('Invalid Can Chi input for career:', { body: req.body });
      return res.status(400).json({
        error: {
          vi: 'Dữ liệu Can Chi không hợp lệ.',
          en: 'Invalid Can Chi data.'
        }
      });
    }

    if (!dungThanText) {
      console.error('Missing dungThanText for career:', { body: req.body });
      return res.status(400).json({
        error: {
          vi: 'Thiếu thông tin Dụng Thần.',
          en: 'Missing Useful God information.'
        }
      });
    }

    const tuTru = { gio, ngay, thang, nam };
    const nhatChu = ngay.split(' ')[0];
    const nguHanhCount = await analyzeNguHanh(tuTru);
    const thapThanResults = tinhThapThan(nhatChu, tuTru);
    const response = generateResponse(tuTru, nguHanhCount, thapThanResults, dungThanText, 'career', language);

    res.json(response);
  } catch (error) {
    console.error('Career endpoint error:', error.message, { stack: error.stack });
    res.status(500).json({
      error: {
        vi: 'Lỗi phân tích sự nghiệp, vui lòng thử lại sau.',
        en: 'Career analysis error, please try again later.'
      }
    });
  }
});

app.post('/api/bazi/marriage', async (req, res) => {
  try {
    const { gio, ngay, thang, nam, language = 'vi', dungThanText = '' } = req.body;

    if (!validateCanChi({ gio, ngay, thang, nam })) {
      console.error('Invalid Can Chi input for marriage:', { body: req.body });
      return res.status(400).json({
        error: {
          vi: 'Dữ liệu Can Chi không hợp lệ.',
          en: 'Invalid Can Chi data.'
        }
      });
    }

    if (!dungThanText) {
      console.error('Missing dungThanText for marriage:', { body: req.body });
      return res.status(400).json({
        error: {
          vi: 'Thiếu thông tin Dụng Thần.',
          en: 'Missing Useful God information.'
        }
      });
    }

    const tuTru = { gio, ngay, thang, nam };
    const nhatChu = ngay.split(' ')[0];
    const nguHanhCount = await analyzeNguHanh(tuTru);
    const thapThanResults = tinhThapThan(nhatChu, tuTru);
    const response = generateResponse(tuTru, nguHanhCount, thapThanResults, dungThanText, 'love', language);

    res.json(response);
  } catch (error) {
    console.error('Marriage endpoint error:', error.message, { stack: error.stack });
    res.status(500).json({
      error: {
        vi: 'Lỗi phân tích hôn nhân, vui lòng thử lại sau.',
        en: 'Marriage analysis error, please try again later.'
      }
    });
  }
});

app.post('/api/bazi/health', async (req, res) => {
  try {
    const { gio, ngay, thang, nam, language = 'vi', dungThanText = '' } = req.body;

    if (!validateCanChi({ gio, ngay, thang, nam })) {
      console.error('Invalid Can Chi input for health:', { body: req.body });
      return res.status(400).json({
        error: {
          vi: 'Dữ liệu Can Chi không hợp lệ.',
          en: 'Invalid Can Chi data.'
        }
      });
    }

    if (!dungThanText) {
      console.error('Missing dungThanText for health:', { body: req.body });
      return res.status(400).json({
        error: {
          vi: 'Thiếu thông tin Dụng Thần.',
          en: 'Missing Useful God information.'
        }
      });
    }

    const tuTru = { gio, ngay, thang, nam };
    const nhatChu = ngay.split(' ')[0];
    const nguHanhCount = await analyzeNguHanh(tuTru);
    const thapThanResults = tinhThapThan(nhatChu, tuTru);
    const response = generateResponse(tuTru, nguHanhCount, thapThanResults, dungThanText, 'health', language);

    res.json(response);
  } catch (error) {
    console.error('Health endpoint error:', error.message, { stack: error.stack });
    res.status(500).json({
      error: {
        vi: 'Lỗi phân tích sức khỏe, vui lòng thử lại sau.',
        en: 'Health analysis error, please try again later.'
      }
    });
  }
});

app.post('/api/bazi/children', async (req, res) => {
  try {
    const { gio, ngay, thang, nam, language = 'vi', dungThanText = '' } = req.body;

    if (!validateCanChi({ gio, ngay, thang, nam })) {
      console.error('Invalid Can Chi input for children:', { body: req.body });
      return res.status(400).json({
        error: {
          vi: 'Dữ liệu Can Chi không hợp lệ.',
          en: 'Invalid Can Chi data.'
        }
      });
    }

    if (!dungThanText) {
      console.error('Missing dungThanText for children:', { body: req.body });
      return res.status(400).json({
        error: {
          vi: 'Thiếu thông tin Dụng Thần.',
          en: 'Missing Useful God information.'
        }
      });
    }

    const tuTru = { gio, ngay, thang, nam };
    const nhatChu = ngay.split(' ')[0];
    const nguHanhCount = await analyzeNguHanh(tuTru);
    const thapThanResults = tinhThapThan(nhatChu, tuTru);
    const response = generateResponse(tuTru, nguHanhCount, thapThanResults, dungThanText, 'children', language);

    res.json(response);
  } catch (error) {
    console.error('Children endpoint error:', error.message, { stack: error.stack });
    res.status(500).json({
      error: {
        vi: 'Lỗi phân tích con cái, vui lòng thử lại sau.',
        en: 'Children analysis error, please try again later.'
      }
    });
  }
});

app.post('/api/bazi/yearly', async (req, res) => {
  try {
    const { gio, ngay, thang, nam, targetYear, language = 'vi', dungThanText = '' } = req.body;

    if (!validateCanChi({ gio, ngay, thang, nam })) {
      console.error('Invalid Can Chi input for yearly:', { body: req.body });
      return res.status(400).json({
        error: {
          vi: 'Dữ liệu Can Chi không hợp lệ.',
          en: 'Invalid Can Chi data.'
        }
      });
    }

    if (!dungThanText) {
      console.error('Missing dungThanText for yearly:', { body: req.body });
      return res.status(400).json({
        error: {
          vi: 'Thiếu thông tin Dụng Thần.',
          en: 'Missing Useful God information.'
        }
      });
    }

    if (!targetYear || isNaN(targetYear)) {
      console.error('Invalid target year:', { body: req.body });
      return res.status(400).json({
        error: {
          vi: 'Năm dự đoán không hợp lệ.',
          en: 'Invalid target year.'
        }
      });
    }

    const tuTru = { gio, ngay, thang, nam };
    const nhatChu = ngay.split(' ')[0];
    const nguHanhCount = await analyzeNguHanh(tuTru);
    const thapThanResults = tinhThapThan(nhatChu, tuTru);
    const response = generateResponse(tuTru, nguHanhCount, thapThanResults, dungThanText, `future ${targetYear}`, language);

    res.json(response);
  } catch (error) {
    console.error('Yearly prediction endpoint error:', error.message, { stack: error.stack });
    res.status(500).json({
      error: {
        vi: 'Lỗi dự đoán năm, vui lòng thử lại sau.',
        en: 'Yearly prediction error, please try again later.'
      }
    });
  }
});

app.get('/health', (req, res) => {
  res.status(200).json({
    status: {
      vi: 'Máy chủ đang hoạt động.',
      en: 'Server is running.'
    },
    uptime: process.uptime(),
    cacheStats: cache.getStats()
  });
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error.message, { stack: error.stack });
  process.exit(1);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Environment:', {
    nodeVersion: process.version,
    port: PORT,
    corsOrigin: process.env.CORS_ORIGIN || '*'
  });
});
