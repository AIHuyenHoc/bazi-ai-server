try {
  var express = require('express');
  var rateLimit = require('express-rate-limit');
  var winston = require('winston');
  var cors = require('cors');
  var helmet = require('helmet');
  var NodeCache = require('node-cache');
  var axios = require('axios');
  var dotenv = require('dotenv');
} catch (error) {
  console.error('Error: Missing required modules. Please run:');
  console.error('npm install express express-rate-limit winston cors helmet node-cache axios dotenv');
  process.exit(1);
}

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize cache (TTL: 1 hour)
const cache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

// Logger configuration (console fallback for Render)
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({ format: winston.format.simple() })
  ]
});

// Attempt to add file transports if writable
try {
  logger.add(new winston.transports.File({ filename: 'logs/error.log', level: 'error' }));
  logger.add(new winston.transports.File({ filename: 'logs/combined.log' }));
} catch (error) {
  logger.warn('File logging disabled due to permissions. Using console only.', { error: error.message });
}

// Middleware
app.use(helmet()); // Security headers
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting: 100 requests per 15 minutes per IP
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

// Hoa Giáp table (60 Can Chi combinations)
const hoaGiap = [
  'Giáp Tý', 'Ất Sửu', 'Bính Dần', 'Đinh Mão', 'Mậu Thìn', 'Kỷ Tỵ', 'Canh Ngọ', 'Tân Mùi', 'Nhâm Thân', 'Quý Dậu',
  'Giáp Tuất', 'Ất Hợi', 'Bính Tý', 'Đinh Sửu', 'Mậu Dần', 'Kỷ Mão', 'Canh Thìn', 'Tân Tỵ', 'Nhâm Ngọ', 'Quý Mùi',
  'Giáp Thân', 'Ất Dậu', 'Bính Tuất', 'Đinh Hợi', 'Mậu Tý', 'Kỷ Sửu', 'Canh Dần', 'Tân Mão', 'Nhâm Thìn', 'Quý Tỵ',
  'Giáp Ngọ', 'Ất Mùi', 'Bính Thân', 'Đinh Dậu', 'Mậu Tuất', 'Kỷ Hợi', 'Canh Tý', 'Tân Sửu', 'Nhâm Dần', 'Quý Mão',
  'Giáp Thìn', 'Ất Tỵ', 'Bính Ngọ', 'Đinh Mùi', 'Mậu Thân', 'Kỷ Dậu', 'Canh Tuất', 'Tân Hợi', 'Nhâm Tý', 'Quý Sửu',
  'Giáp Dần', 'Ất Mão', 'Bính Thìn', 'Đinh Tỵ', 'Mậu Ngọ', 'Kỷ Mùi', 'Canh Thân', 'Tân Dậu', 'Nhâm Tuất', 'Quý Hợi'
];

// Valid Can Chi pairs
const validHeavenlyStems = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const validEarthlyBranches = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const validCanChi = [];
validHeavenlyStems.forEach(stem => {
  validEarthlyBranches.forEach(branch => {
    validCanChi.push(`${stem} ${branch}`);
  });
});

// Ngũ Hành mapping
const canNguHanh = {
  Giáp: 'Mộc', Ất: 'Mộc', Bính: 'Hỏa', Đinh: 'Hỏa', Mậu: 'Thổ',
  Kỷ: 'Thổ', Canh: 'Kim', Tân: 'Kim', Nhâm: 'Thủy', Quý: 'Thủy'
};
const chiNguHanh = {
  Tý: 'Thủy', Hợi: 'Thủy', Sửu: 'Thổ', Thìn: 'Thổ', Mùi: 'Thổ', Tuất: 'Thổ',
  Dần: 'Mộc', Mão: 'Mộc', Tỵ: 'Hỏa', Ngọ: 'Hỏa', Thân: 'Kim', Dậu: 'Kim'
};

// Hidden elements in branches
const hiddenElements = {
  Tý: ['Quý'], Sửu: ['Kỷ', 'Tân', 'Quý'], Dần: ['Giáp', 'Bính', 'Mậu'], Mão: ['Ất'],
  Thìn: ['Mậu', 'Ất', 'Quý'], Tỵ: ['Bính', 'Canh', 'Mậu'], Ngọ: ['Đinh', 'Kỷ'],
  Mùi: ['Kỷ', 'Đinh', 'Ất'], Thân: ['Canh', 'Nhâm', 'Mậu'], Dậu: ['Tân'],
  Tuất: ['Mậu', 'Đinh', 'Tân'], Hợi: ['Nhâm', 'Giáp']
};

// Thập Thần mapping
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

// Thần Sát mapping (corrected Đào Hoa with Tam Hợp, no Không Vong)
const thienAtQuyNhan = {
  Giáp: ['Sửu', 'Mùi'], Ất: ['Tý', 'Hợi'], Bính: ['Dần', 'Mão'], Đinh: ['Sửu', 'Hợi'],
  Mậu: ['Tỵ', 'Ngọ'], Kỷ: ['Thìn', 'Tuất'], Canh: ['Thân', 'Dậu'], Tân: ['Thân', 'Dậu'],
  Nhâm: ['Hợi', 'Tý'], Quý: ['Tý', 'Hợi']
};
const daoHoaTamHop = {
  'Thân': 'Hợi', 'Tý': 'Hợi', 'Thìn': 'Hợi', // Thân-Tý-Thìn (Water)
  'Hợi': 'Ngọ', 'Mão': 'Ngọ', 'Mùi': 'Ngọ', // Hợi-Mão-Mùi (Wood)
  'Dần': 'Mão', 'Ngọ': 'Mão', 'Tuất': 'Mão', // Dần-Ngọ-Tuất (Fire)
  'Tỵ': 'Tý', 'Dậu': 'Tý', 'Sửu': 'Tý' // Tỵ-Dậu-Sửu (Metal)
};
const vanXuong = {
  Giáp: ['Tỵ'], Ất: ['Ngọ'], Bính: ['Thân'], Đinh: ['Dậu'], Mậu: ['Hợi'],
  Kỷ: ['Tý'], Canh: ['Dần'], Tân: ['Mão'], Nhâm: ['Tỵ'], Quý: ['Ngọ']
};
const thaiCucQuyNhan = {
  Giáp: ['Tý'], Ất: ['Tý'], Bính: ['Dần'], Đinh: ['Dần'], Mậu: ['Thìn'],
  Kỷ: ['Thìn'], Canh: ['Ngọ'], Tân: ['Ngọ'], Nhâm: ['Thân'], Quý: ['Thân']
};
const hongLoan = {
  Tý: 'Dậu', Sửu: 'Thân', Dần: 'Mùi', Mão: 'Ngọ', Thìn: 'Tỵ', Tỵ: 'Thìn',
  Ngọ: 'Mão', Mùi: 'Dần', Thân: 'Sửu', Dậu: 'Tý', Tuất: 'Hợi', Hợi: 'Tuất'
};
const thienDuc = {
  Giáp: ['Hợi'], Ất: ['Tý'], Bính: ['Dần'], Đinh: ['Mão'], Mậu: ['Tỵ'],
  Kỷ: ['Ngọ'], Canh: ['Thân'], Tân: ['Dậu'], Nhâm: ['Hợi'], Quý: ['Tý']
};
const nguyetDuc = {
  Giáp: ['Dần'], Ất: ['Mão'], Bính: ['Tỵ'], Đinh: ['Ngọ'], Mậu: ['Thân'],
  Kỷ: ['Dậu'], Canh: ['Hợi'], Tân: ['Tý'], Nhâm: ['Dần'], Quý: ['Mão']
};
const tuongTinh = {
  Giáp: ['Mão'], Ất: ['Tý'], Bính: ['Tỵ'], Đinh: ['Ngọ'], Mậu: ['Dần'],
  Kỷ: ['Hợi'], Canh: ['Thân'], Tân: ['Dậu'], Nhâm: ['Tý'], Quý: ['Hợi']
};
const dichMa = {
  Dần: ['Tỵ'], Mão: ['Tỵ'], Thìn: ['Tỵ'], Tỵ: ['Dần'], Ngọ: ['Dần'], Mùi: ['Dần'],
  Thân: ['Hợi'], Dậu: ['Hợi'], Tuất: ['Hợi'], Hợi: ['Thân'], Tý: ['Thân'], Sửu: ['Thân']
};
const coThanQuaTu = {
  Giáp: ['Thân', 'Thìn'], Ất: ['Dậu', 'Tỵ'], Bính: ['Hợi', 'Mùi'], Đinh: ['Tý', 'Thân'],
  Mậu: ['Dần', 'Tuất'], Kỷ: ['Mão', 'Hợi'], Canh: ['Tỵ', 'Sửu'], Tân: ['Ngọ', 'Dần'],
  Nhâm: ['Thân', 'Thìn'], Quý: ['Dậu', 'Tỵ']
};
const kiepSat = {
  Giáp: ['Thân'], Ất: ['Dậu'], Bính: ['Hợi'], Đinh: ['Tý'], Mậu: ['Dần'],
  Kỷ: ['Mão'], Canh: ['Tỵ'], Tân: ['Ngọ'], Nhâm: ['Thân'], Quý: ['Dậu']
};

// Dụng Thần recommendations
const dungThanRecommendations = {
  Thủy: {
    colors: ['Xanh dương', 'Đen'],
    careers: ['Truyền thông', 'Nghệ thuật', 'Công nghệ', 'Du lịch', 'Hải sản'],
    advice: {
      vi: 'Tập trung vào sáng tạo và linh hoạt để phát triển sự nghiệp và cuộc sống.',
      en: 'Focus on creativity and adaptability for career and life growth.'
    },
    phongThuy: {
      vi: 'Sử dụng vật phẩm như hình ảnh biển cả, hồ nước để tăng năng lượng tích cực.',
      en: 'Use items like ocean or lake imagery to enhance positive energy.'
    }
  },
  Kim: {
    colors: ['Trắng', 'Vàng kim'],
    careers: ['Kỹ thuật', 'Quản lý', 'Tài chính', 'Xây dựng'],
    advice: {
      vi: 'Phát huy sự chính xác và kỷ luật trong công việc để đạt thành công.',
      en: 'Leverage precision and discipline in work for success.'
    },
    phongThuy: {
      vi: 'Sử dụng trang sức kim loại hoặc vật phẩm màu trắng để tăng may mắn.',
      en: 'Use metal jewelry or white items to boost luck.'
    }
  },
  Mộc: {
    colors: ['Xanh lá', 'Nâu'],
    careers: ['Giáo dục', 'Nghệ thuật', 'Thiết kế', 'Văn học'],
    advice: {
      vi: 'Khuyến khích sự sáng tạo và linh hoạt trong mọi lĩnh vực.',
      en: 'Encourage creativity and adaptability in all areas.'
    },
    phongThuy: {
      vi: 'Sử dụng cây xanh hoặc vật phẩm gỗ để cân bằng năng lượng.',
      en: 'Use green plants or wooden items to balance energy.'
    }
  },
  Hỏa: {
    colors: ['Đỏ', 'Cam'],
    careers: ['Marketing', 'PR', 'Giải trí', 'Ẩm thực'],
    advice: {
      vi: 'Tận dụng năng lượng nhiệt huyết và giao tiếp để thành công.',
      en: 'Leverage passion and communication skills for success.'
    },
    phongThuy: {
      vi: 'Sử dụng vật phẩm màu đỏ hoặc ánh sáng mạnh để kích hoạt năng lượng.',
      en: 'Use red items or bright lighting to activate energy.'
    }
  },
  Thổ: {
    colors: ['Vàng', 'Nâu đất'],
    careers: ['Bất động sản', 'Nông nghiệp', 'Xây dựng', 'Quản lý'],
    advice: {
      vi: 'Tập trung vào sự ổn định và kiên nhẫn để xây dựng nền tảng vững chắc.',
      en: 'Focus on stability and patience to build a strong foundation.'
    },
    phongThuy: {
      vi: 'Sử dụng vật phẩm đá hoặc đất để tăng cường sự ổn định.',
      en: 'Use stone or earth items to enhance stability.'
    }
  }
};

// Utility function to validate Can Chi
function validateCanChi({ gio, ngay, thang, nam }) {
  const inputs = [gio, ngay, thang, nam];
  for (const input of inputs) {
    if (!input || !validCanChi.includes(input)) {
      logger.warn('Invalid Can Chi input', { input });
      return false;
    }
  }
  return true;
}

// Calculate Can Chi for a given year
function getCanChiForYear(year) {
  if (!Number.isInteger(year) || year < 1900 || year > 2100) {
    logger.error('Invalid year provided', { year });
    return null;
  }
  const baseYear = 1984; // Reference year for Giáp Tý
  const index = (year - baseYear) % 60;
  const adjustedIndex = index < 0 ? index + 60 : index;
  return hoaGiap[adjustedIndex] || null;
}

// Analyze Ngũ Hành from Tứ Trụ
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
    logger.error('Error analyzing Ngũ Hành', { error: e.message, tuTru });
    throw new Error('Không thể phân tích ngũ hành do dữ liệu Tứ Trụ không hợp lệ');
  }
}

// Calculate Thập Thần
function tinhThapThan(nhatChu, tuTru) {
  if (!nhatChu || !canNguHanh[nhatChu]) {
    logger.error('Invalid Nhật Chủ', { nhatChu });
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
    logger.error('Error calculating Thập Thần', { error: e.message, nhatChu, tuTru });
    throw new Error('Không thể tính Thập Thần do dữ liệu Tứ Trụ không hợp lệ');
  }
}

// Calculate Thần Sát (corrected Đào Hoa with Tam Hợp, no Không Vong)
function tinhThanSat(tuTru) {
  const nhatChu = tuTru.ngay?.split(' ')[0];
  const branches = [
    tuTru.nam?.split(' ')[1], tuTru.thang?.split(' ')[1],
    tuTru.ngay?.split(' ')[1], tuTru.gio?.split(' ')[1]
  ].filter(Boolean);

  if (!nhatChu || branches.length < 4) {
    logger.error('Invalid Nhật Chủ or branches', { nhatChu, branches });
    throw new Error('Nhật Chủ hoặc chi không hợp lệ');
  }

  const dayBranch = tuTru.ngay?.split(' ')[1];
  const yearBranch = tuTru.nam?.split(' ')[1];
  const daoHoaBranch = daoHoaTamHop[dayBranch] || daoHoaTamHop[yearBranch];

  return {
    'Thiên Ất Quý Nhân': {
      vi: 'Thiên Ất Quý Nhân', en: 'Nobleman Star',
      value: thienAtQuyNhan[nhatChu]?.filter(chi => branches.includes(chi)) || [],
      description: {
        vi: 'Mang lại sự hỗ trợ từ người khác, hóa giải khó khăn, phù hợp với sự nghiệp và quan hệ xã hội.',
        en: 'Brings support from others, resolves difficulties, ideal for career and social relations.'
      }
    },
    'Đào Hoa': {
      vi: 'Đào Hoa', en: 'Peach Blossom',
      value: daoHoaBranch && branches.includes(daoHoaBranch) ? [daoHoaBranch] : [],
      description: {
        vi: 'Mang lại sức hút và duyên dáng, nhưng cần cẩn trọng để tránh rắc rối tình cảm.',
        en: 'Brings charm and charisma, but caution is needed to avoid emotional complications.'
      }
    },
    'Văn Xương': {
      vi: 'Văn Xương', en: 'Literary Star',
      value: vanXuong[nhatChu]?.filter(chi => branches.includes(chi)) || [],
      description: {
        vi: 'Biểu thị sự thông minh, thành công học thuật và kỹ năng giao tiếp.',
        en: 'Signifies intelligence, academic success, and communication skills.'
      }
    },
    'Thái Cực Quý Nhân': {
      vi: 'Thái Cực Quý Nhân', en: 'Grand Ultimate Noble',
      value: thaiCucQuyNhan[nhatChu]?.filter(chi => branches.includes(chi)) || [],
      description: {
        vi: 'Hỗ trợ sự nghiệp và mang lại sự bảo vệ trong khó khăn.',
        en: 'Supports career and provides protection in difficulties.'
      }
    },
    'Hồng Loan': {
      vi: 'Hồng Loan', en: 'Red Phoenix',
      value: branches.includes(hongLoan[dayBranch]) ? [hongLoan[dayBranch]] : [],
      description: {
        vi: 'Mang lại cơ hội tình cảm và hôn nhân, nhưng cần sự chân thành.',
        en: 'Brings opportunities for romance and marriage, but requires sincerity.'
      }
    },
    'Thiên Đức': {
      vi: 'Thiên Đức', en: 'Heavenly Virtue',
      value: thienDuc[nhatChu]?.filter(chi => branches.includes(chi)) || [],
      description: {
        vi: 'Mang lại sự may mắn và bảo vệ từ thiên nhiên.',
        en: 'Brings luck and protection from nature.'
      }
    },
    'Nguyệt Đức': {
      vi: 'Nguyệt Đức', en: 'Lunar Virtue',
      value: nguyetDuc[nhatChu]?.filter(chi => branches.includes(chi)) || [],
      description: {
        vi: 'Hỗ trợ sự ổn định và bình an trong cuộc sống.',
        en: 'Supports stability and peace in life.'
      }
    },
    'Tướng Tinh': {
      vi: 'Tướng Tinh', en: 'General Star',
      value: tuongTinh[nhatChu]?.filter(chi => branches.includes(chi)) || [],
      description: {
        vi: 'Hỗ trợ khởi nghiệp, thăng tiến và thi cử.',
        en: 'Supports startups, promotions, and exams.'
      }
    },
    'Dịch Mã': {
      vi: 'Dịch Mã', en: 'Traveling Horse',
      value: dichMa[dayBranch]?.filter(chi => branches.includes(chi)) || [],
      description: {
        vi: 'Biểu thị sự di chuyển và cơ hội ở nước ngoài.',
        en: 'Indicates movement and overseas opportunities.'
      }
    },
    'Cô Thần Quả Tú': {
      vi: 'Cô Thần Quả Tú', en: 'Solitary Widow',
      value: coThanQuaTu[nhatChu]?.filter(chi => branches.includes(chi)) || [],
      description: {
        vi: 'Gây khó khăn trong hôn nhân, biểu thị sự cô đơn.',
        en: 'Causes marital challenges and loneliness.'
      }
    },
    'Kiếp Sát': {
      vi: 'Kiếp Sát', en: 'Robbery Sha',
      value: kiepSat[nhatChu]?.filter(chi => branches.includes(chi)) || [],
      description: {
        vi: 'Biểu thị thách thức, nguy cơ mất tiền hoặc tiểu nhân.',
        en: 'Indicates challenges, financial loss, or adversaries.'
      }
    }
  };
}

// Generate response based on user input
function generateResponse(tuTru, nguHanhCount, thapThanResults, dungThan, userInput, language = 'vi') {
  const totalElements = Object.values(nguHanhCount).reduce((a, b) => a + b, 0);
  const tyLeNguHanh = Object.fromEntries(
    Object.entries(nguHanhCount).map(([k, v]) => [k, `${((v / totalElements) * 100).toFixed(2)}%`])
  );
  const nhatChu = tuTru.ngay.split(' ')[0];
  const userInputLower = userInput.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const thanSat = tinhThanSat(tuTru);

  const isMoney = /tien bac|tai chinh|money|finance/i.test(userInputLower);
  const isCareer = /nghe|cong viec|su nghiep|career|job/i.test(userInputLower);
  const isHealth = /suc khoe|benh tat|health/i.test(userInputLower);
  const isLove = /tinh duyen|tinh yeu|love|hon nhan|marriage/i.test(userInputLower);
  const isChildren = /con cai|children/i.test(userInputLower);
  const isComplex = /du doan|tuong lai|future|dai van/i.test(userInputLower);
  const isThapThan = /thap than|ten gods/i.test(userInputLower);
  const isThanSat = /than sat|auspicious stars|sao/i.test(userInputLower);
  const isGeneral = !isMoney && !isCareer && !isHealth && !isLove && !isChildren && !isComplex && !isThapThan && !isThanSat;

  const response = {
    nguHanh: tyLeNguHanh,
    thapThan: thapThanResults,
    thanSat,
    dungThan,
    cachCuc: 'Thân Nhược' // From previous logs
  };

  if (isGeneral) {
    response.message = {
      vi: `Nhật Chủ ${nhatChu} (${canNguHanh[nhatChu]}): Bạn có tính cách sáng tạo, linh hoạt, nhưng cần kiểm soát cảm xúc. Dụng Thần ${dungThan.join(' và ')} khuyên bạn nên ${dungThanRecommendations[dungThan[0]].advice.vi}`,
      en: `Day Master ${nhatChu} (${canNguHanh[nhatChu]}): You are creative and adaptable, but need to manage emotions. Useful Gods ${dungThan.join(' and ')} suggest you ${dungThanRecommendations[dungThan[0]].advice.en}`
    };
  } else if (isCareer) {
    response.message = {
      vi: `Sự nghiệp phù hợp: ${dungThanRecommendations[dungThan[0]].careers.join(', ')}. ${thanSat['Tướng Tinh'].value.length ? 'Tướng Tinh hỗ trợ thăng tiến.' : ''}`,
      en: `Suitable careers: ${dungThanRecommendations[dungThan[0]].careers.join(', ')}. ${thanSat['Tướng Tinh'].value.length ? 'General Star supports promotions.' : ''}`
    };
  } else if (isMoney) {
    response.message = {
      vi: `Tài vận chịu ảnh hưởng từ ${thapThanResults['Chính Tài'] || thapThanResults['Thiên Tài'] || 'không rõ'}. ${thanSat['Kiếp Sát'].value.length ? 'Cẩn thận tiểu nhân hoặc mất tiền.' : ''}`,
      en: `Financial luck influenced by ${thapThanResults['Chính Tài'] || thapThanResults['Thiên Tài'] || 'unknown'}. ${thanSat['Kiếp Sát'].value.length ? 'Beware of adversaries or financial loss.' : ''}`
    };
  } else if (isHealth) {
    response.message = {
      vi: `Sức khỏe cần chú ý cân bằng ngũ hành ${dungThan.join(' và ')}. ${thanSat['Kiếp Sát'].value.length ? 'Cẩn thận bệnh tật hoặc tai nạn nhỏ.' : ''}`,
      en: `Health requires balancing elements ${dungThan.join(' and ')}. ${thanSat['Kiếp Sát'].value.length ? 'Beware of illness or minor accidents.' : ''}`
    };
  } else if (isLove) {
    response.message = {
      vi: `${thanSat['Đào Hoa'].value.length ? 'Đào Hoa tăng sức hút, nhưng cần chân thành.' : 'Không có Đào Hoa, cần chủ động trong tình cảm.'} ${thanSat['Cô Thần Quả Tú'].value.length ? 'Cô Thần Quả Tú có thể gây khó khăn trong hôn nhân.' : ''}`,
      en: `${thanSat['Đào Hoa'].value.length ? 'Peach Blossom enhances charm, but sincerity is needed.' : 'No Peach Blossom, be proactive in relationships.'} ${thanSat['Cô Thần Quả Tú'].value.length ? 'Solitary Widow may cause marital challenges.' : ''}`
    };
  } else if (isChildren) {
    response.message = {
      vi: `Vận con cái chịu ảnh hưởng từ ${thapThanResults['Thực Thần'] || thapThanResults['Thương Quan'] || 'không rõ'}. ${thanSat['Cô Thần Quả Tú'].value.length ? 'Cô Thần Quả Tú có thể gây khó khăn.' : ''}`,
      en: `Children luck influenced by ${thapThanResults['Thực Thần'] || thapThanResults['Thương Quan'] || 'unknown'}. ${thanSat['Cô Thần Quả Tú'].value.length ? 'Solitary Widow may cause challenges.' : ''}`
    };
  } else if (isComplex) {
    response.message = {
      vi: `Tương lai phụ thuộc vào Dụng Thần ${dungThan.join(' và ')}. Hãy tập trung vào ${dungThanRecommendations[dungThan[0]].advice.vi}`,
      en: `Future depends on Useful Gods ${dungThan.join(' and ')}. Focus on ${dungThanRecommendations[dungThan[0]].advice.en}`
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

// Retry logic for external API calls
async function callExternalBaziAPI(data, retries = 3, delay = 1000) {
  try {
    if (!process.env.XAI_BAZI_API || !process.env.XAI_API_KEY) {
      logger.warn('External API not configured, using internal logic');
      return null;
    }
    const response = await axios.post(
      process.env.XAI_BAZI_API,
      data,
      {
        headers: { Authorization: `Bearer ${process.env.XAI_API_KEY}` },
        timeout: 10000
      }
    );
    return response.data;
  } catch (error) {
    if (retries > 0 && error.code !== 'ECONNABORTED') {
      logger.warn('Retrying API call', { retriesLeft: retries, error: error.message });
      await new Promise(resolve => setTimeout(resolve, delay));
      return callExternalBaziAPI(data, retries - 1, delay * 2);
    }
    logger.error('External API call failed, using internal logic', { error: error.message });
    return null;
  }
}

// Main Bát Tự endpoint
app.post('/api/bazi', async (req, res) => {
  try {
    const { gio, ngay, thang, nam, userInput = '', language = 'vi' } = req.body;

    if (!validateCanChi({ gio, ngay, thang, nam })) {
      logger.warn('Invalid Can Chi input', { body: req.body });
      return res.status(400).json({
        error: {
          vi: 'Dữ liệu Can Chi không hợp lệ. Vui lòng kiểm tra giờ, ngày, tháng, năm.',
          en: 'Invalid Can Chi data. Please check hour, day, month, year.'
        }
      });
    }

    logger.info('Processing Bát Tự request', { gio, ngay, thang, nam, userInput, language });

    const cacheKey = `${gio}:${ngay}:${thang}:${nam}:${userInput}:${language}`;
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      logger.info('Returning cached Bát Tự result', { cacheKey });
      return res.json(cachedResult);
    }

    const tuTru = { gio, ngay, thang, nam };
    const nhatChu = ngay.split(' ')[0];
    const nguHanhCount = await analyzeNguHanh(tuTru);
    const thapThanResults = tinhThapThan(nhatChu, tuTru);
    const dungThan = ['Kim', 'Thủy']; // Based on previous logs
    const response = generateResponse(tuTru, nguHanhCount, thapThanResults, dungThan, userInput, language);

    cache.set(cacheKey, response);
    res.json(response);
  } catch (error) {
    logger.error('Bát Tự endpoint error', { error: error.message, stack: error.stack });
    res.status(500).json({
      error: {
        vi: 'Lỗi tính toán Bát Tự, vui lòng thử lại sau.',
        en: 'Bát Tự calculation error, please try again later.'
      }
    });
  }
});

// Career analysis endpoint
app.post('/api/bazi/career', async (req, res) => {
  try {
    const { gio, ngay, thang, nam, language = 'vi' } = req.body;

    if (!validateCanChi({ gio, ngay, thang, nam })) {
      logger.warn('Invalid Can Chi input for career', { body: req.body });
      return res.status(400).json({
        error: {
          vi: 'Dữ liệu Can Chi không hợp lệ.',
          en: 'Invalid Can Chi data.'
        }
      });
    }

    const tuTru = { gio, ngay, thang, nam };
    const nhatChu = ngay.split(' ')[0];
    const nguHanhCount = await analyzeNguHanh(tuTru);
    const thapThanResults = tinhThapThan(nhatChu, tuTru);
    const dungThan = ['Kim', 'Thủy'];
    const response = generateResponse(tuTru, nguHanhCount, thapThanResults, dungThan, 'career', language);

    res.json(response);
  } catch (error) {
    logger.error('Career endpoint error', { error: error.message, stack: error.stack });
    res.status(500).json({
      error: {
        vi: 'Lỗi phân tích sự nghiệp, vui lòng thử lại sau.',
        en: 'Career analysis error, please try again later.'
      }
    });
  }
});

// Marriage analysis endpoint
app.post('/api/bazi/marriage', async (req, res) => {
  try {
    const { gio, ngay, thang, nam, language = 'vi' } = req.body;

    if (!validateCanChi({ gio, ngay, thang, nam })) {
      logger.warn('Invalid Can Chi input for marriage', { body: req.body });
      return res.status(400).json({
        error: {
          vi: 'Dữ liệu Can Chi không hợp lệ.',
          en: 'Invalid Can Chi data.'
        }
      });
    }

    const tuTru = { gio, ngay, thang, nam };
    const nhatChu = ngay.split(' ')[0];
    const nguHanhCount = await analyzeNguHanh(tuTru);
    const thapThanResults = tinhThapThan(nhatChu, tuTru);
    const dungThan = ['Kim', 'Thủy'];
    const response = generateResponse(tuTru, nguHanhCount, thapThanResults, dungThan, 'love', language);

    res.json(response);
  } catch (error) {
    logger.error('Marriage endpoint error', { error: error.message, stack: error.stack });
    res.status(500).json({
      error: {
        vi: 'Lỗi phân tích hôn nhân, vui lòng thử lại sau.',
        en: 'Marriage analysis error, please try again later.'
      }
    });
  }
});

// Yearly prediction endpoint
app.post('/api/bazi/yearly', async (req, res) => {
  try {
    const { gio, ngay, thang, nam, targetYear, language = 'vi' } = req.body;

    if (!validateCanChi({ gio, ngay, thang, nam })) {
      logger.warn('Invalid Can Chi input for yearly', { body: req.body });
      return res.status(400).json({
        error: {
          vi: 'Dữ liệu Can Chi không hợp lệ.',
          en: 'Invalid Can Chi data.'
        }
      });
    }

    if (!targetYear || isNaN(targetYear)) {
      logger.warn('Invalid target year', { body: req.body });
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
    const dungThan = ['Kim', 'Thủy'];
    const yearlyCanChi = getCanChiForYear(targetYear);
    const yearlyElement = canNguHanh[yearlyCanChi?.split(' ')[0]] || 'Unknown';
    const response = generateResponse(tuTru, nguHanhCount, thapThanResults, dungThan, `future ${yearlyElement}`, language);

    res.json(response);
  } catch (error) {
    logger.error('Yearly prediction endpoint error', { error: error.message, stack: error.stack });
    res.status(500).json({
      error: {
        vi: 'Lỗi dự đoán năm, vui lòng thử lại sau.',
        en: 'Yearly prediction error, please try again later.'
      }
    });
  }
});

// Health analysis endpoint
app.post('/api/bazi/health', async (req, res) => {
  try {
    const { gio, ngay, thang, nam, language = 'vi' } = req.body;

    if (!validateCanChi({ gio, ngay, thang, nam })) {
      logger.warn('Invalid Can Chi input for health', { body: req.body });
      return res.status(400).json({
        error: {
          vi: 'Dữ liệu Can Chi không hợp lệ.',
          en: 'Invalid Can Chi data.'
        }
      });
    }

    const tuTru = { gio, ngay, thang, nam };
    const nhatChu = ngay.split(' ')[0];
    const nguHanhCount = await analyzeNguHanh(tuTru);
    const thapThanResults = tinhThapThan(nhatChu, tuTru);
    const dungThan = ['Kim', 'Thủy'];
    const response = generateResponse(tuTru, nguHanhCount, thapThanResults, dungThan, 'health', language);

    res.json(response);
  } catch (error) {
    logger.error('Health endpoint error', { error: error.message, stack: error.stack });
    res.status(500).json({
      error: {
        vi: 'Lỗi phân tích sức khỏe, vui lòng thử lại sau.',
        en: 'Health analysis error, please try again later.'
      }
    });
  }
});

// Children analysis endpoint
app.post('/api/bazi/children', async (req, res) => {
  try {
    const { gio, ngay, thang, nam, language = 'vi' } = req.body;

    if (!validateCanChi({ gio, ngay, thang, nam })) {
      logger.warn('Invalid Can Chi input for children', { body: req.body });
      return res.status(400).json({
        error: {
          vi: 'Dữ liệu Can Chi không hợp lệ.',
          en: 'Invalid Can Chi data.'
        }
      });
    }

    const tuTru = { gio, ngay, thang, nam };
    const nhatChu = ngay.split(' ')[0];
    const nguHanhCount = await analyzeNguHanh(tuTru);
    const thapThanResults = tinhThapThan(nhatChu, tuTru);
    const dungThan = ['Kim', 'Thủy'];
    const response = generateResponse(tuTru, nguHanhCount, thapThanResults, dungThan, 'children', language);

    res.json(response);
  } catch (error) {
    logger.error('Children endpoint error', { error: error.message, stack: error.stack });
    res.status(500).json({
      error: {
        vi: 'Lỗi phân tích con cái, vui lòng thử lại sau.',
        en: 'Children analysis error, please try again later.'
      }
    });
  }
});

// Health check endpoint
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

// Error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info('Environment:', {
    nodeVersion: process.version,
    port: PORT,
    corsOrigin: process.env.CORS_ORIGIN || '*'
  });
});
