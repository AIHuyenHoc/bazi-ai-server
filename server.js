const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

// Khởi tạo ứng dụng Express
const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint cho Render
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Thông tin ngũ hành Thiên Can và Địa Chi
const canChiNguhanhInfo = `
Ngũ hành 10 Thiên Can:
- Giáp, Ất: Mộc (cây cối, sự phát triển, sáng tạo)
- Bính, Đinh: Hỏa (ngọn lửa, đam mê, năng lượng)
- Mậu, Kỷ: Thổ (đất đai, sự ổn định, nuôi dưỡng)
- Canh, Tân: Kim (kim loại, sự chính xác, kiên định)
- Nhâm, Quý: Thủy (nước, linh hoạt, trí tuệ)

Ngũ hành 12 Địa Chi:
- Tý, Hợi: Thủy (dòng sông, sự thích nghi)
- Sửu, Thìn, Mùi, Tuất: Thổ (núi cao, sự bền vững)
- Dần, Mão: Mộc (rừng xanh, sự sinh trưởng)
- Tỵ, Ngọ: Hỏa (mặt trời, sự rực rỡ)
- Thân, Dậu: Kim (vàng bạc, sự tinh tế)
`;

// Ánh xạ Thiên Can và Địa Chi từ tiếng Anh sang tiếng Việt
const heavenlyStemsMap = {
  en: { Jia: "Giáp", Yi: "Ất", Bing: "Bính", Ding: "Đinh", Wu: "Mậu", Ji: "Kỷ", Geng: "Canh", Xin: "Tân", Ren: "Nhâm", Gui: "Quý" },
  vi: { Giáp: "Giáp", Ất: "Ất", Bính: "Bính", Đinh: "Đinh", Mậu: "Mậu", Kỷ: "Kỷ", Canh: "Canh", Tân: "Tân", Nhâm: "Nhâm", Quý: "Quý" }
};
const earthlyBranchesMap = {
  en: { Rat: "Tý", Ox: "Sửu", Tiger: "Dần", Rabbit: "Mão", Dragon: "Thìn", Snake: "Tỵ", Horse: "Ngọ", Goat: "Mùi", Monkey: "Thân", Rooster: "Dậu", Dog: "Tuất", Pig: "Hợi" },
  vi: { Tý: "Tý", Sửu: "Sửu", Dần: "Dần", Mão: "Mão", Thìn: "Thìn", Tỵ: "Tỵ", Ngọ: "Ngọ", Mùi: "Mùi", Thân: "Thân", Dậu: "Dậu", Tuất: "Tuất", Hợi: "Hợi" }
};

// Ẩn tàng trong Địa Chi
const hiddenElements = {
  Tý: ['Thủy'], Sửu: ['Thổ', 'Kim', 'Thủy'], Dần: ['Mộc', 'Hỏa', 'Thổ'],
  Mão: ['Mộc'], Thìn: ['Thổ', 'Thủy', 'Mộc'], Tỵ: ['Hỏa', 'Kim', 'Thổ'],
  Ngọ: ['Hỏa', 'Thổ'], Mùi: ['Thổ', 'Hỏa', 'Mộc'], Thân: ['Kim', 'Thủy', 'Thổ'],
  Dậu: ['Kim'], Tuất: ['Thổ', 'Kim', 'Hỏa'], Hợi: ['Thủy', 'Mộc']
};

// Ánh xạ ngũ hành
const nguHanhMap = {
  'Giáp': 'Mộc', 'Ất': 'Mộc', 'Bính': 'Hỏa', 'Đinh': 'Hỏa',
  'Mậu': 'Thổ', 'Kỷ': 'Thổ', 'Canh': 'Kim', 'Tân': 'Kim',
  'Nhâm': 'Thủy', 'Quý': 'Thủy',
  'Tý': 'Thủy', 'Sửu': 'Thổ', 'Dần': 'Mộc', 'Mão': 'Mộc',
  'Thìn': 'Thổ', 'Tỵ': 'Hỏa', 'Ngọ': 'Hỏa', 'Mùi': 'Thổ',
  'Thân': 'Kim', 'Dậu': 'Kim', 'Tuất': 'Thổ', 'Hợi': 'Thủy'
};

// Chu kỳ 60 Hoa Giáp
const hoaGiap = [
  "Giáp Tý", "Ất Sửu", "Bính Dần", "Đinh Mão", "Mậu Thìn", "Kỷ Tỵ", "Canh Ngọ", "Tân Mùi", "Nhâm Thân", "Quý Dậu",
  "Giáp Tuất", "Ất Hợi", "Bính Tý", "Đinh Sửu", "Mậu Dần", "Kỷ Mão", "Canh Thìn", "Tân Tỵ", "Nhâm Ngọ", "Quý Mùi",
  "Giáp Thân", "Ất Dậu", "Bính Tuất", "Đinh Hợi", "Mậu Tý", "Kỷ Sửu", "Canh Dần", "Tân Mão", "Nhâm Thìn", "Quý Tỵ",
  "Giáp Ngọ", "Ất Mùi", "Bính Thân", "Đinh Dậu", "Mậu Tuất", "Kỷ Hợi", "Canh Tý", "Tân Sửu", "Nhâm Dần", "Quý Mão",
  "Giáp Thìn", "Ất Tỵ", "Bính Ngọ", "Đinh Mùi", "Mậu Thân", "Kỷ Dậu", "Canh Tuất", "Tân Hợi", "Nhâm Tý", "Quý Sửu",
  "Giáp Dần", "Ất Mão", "Bính Thìn", "Đinh Tỵ", "Mậu Ngọ", "Kỷ Mùi", "Canh Thân", "Tân Dậu", "Nhâm Tuất", "Quý Hợi"
];

// Tính Can Chi cho năm
const getCanChiForYear = (year) => {
  const baseYear = 1984; // Mốc Giáp Tý
  const index = (year - baseYear) % 60;
  const adjustedIndex = index < 0 ? index + 60 : index;
  return hoaGiap[adjustedIndex] || "Không xác định";
};

// Chuyển đổi Tứ Trụ từ tiếng Anh sang tiếng Việt
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
  } catch {
    return null;
  }
};

// Xác định Thân Vượng hay Thân Nhược
function xetThanVuong(tuTru) {
  const [canNgay, chiNgay] = tuTru.ngay.split(' ');
  const menh = nguHanhMap[canNgay];
  const thangChi = tuTru.thang.split(' ')[1];
  const thangHanh = nguHanhMap[thangChi];

  let diem = 0;

  const muaSinh = {
    'Mộc': ['Dần', 'Mão'], 'Hỏa': ['Tỵ', 'Ngọ'], 'Thổ': ['Thìn', 'Tuất', 'Sửu', 'Mùi'],
    'Kim': ['Thân', 'Dậu'], 'Thủy': ['Hợi', 'Tý']
  };

  if (muaSinh[menh]?.includes(thangChi)) {
    diem += 1;
  }

  const khac = { 'Mộc': 'Thổ', 'Thổ': 'Thủy', 'Thủy': 'Hỏa', 'Hỏa': 'Kim', 'Kim': 'Mộc' };
  if (khac[thangHanh] === menh) {
    diem -= 1;
  }

  const chiList = [tuTru.nam.split(' ')[1], tuTru.thang.split(' ')[1], tuTru.ngay.split(' ')[1], tuTru.gio.split(' ')[1]];
  let thongCan = 0;
  chiList.forEach(chi => {
    const hidden = hiddenElements[chi] || [];
    if (hidden.includes(menh)) {
      thongCan += 0.3;
    }
  });
  if (thongCan >= 1) {
    diem += thongCan;
  }

  let count = { 'Mộc': 0, 'Hỏa': 0, 'Thổ': 0, 'Kim': 0, 'Thủy': 0 };
  let countSurface = { 'Mộc': 0, 'Hỏa': 0, 'Thổ': 0, 'Kim': 0, 'Thủy': 0 };
  [tuTru.nam, tuTru.thang, tuTru.ngay, tuTru.gio].forEach(tru => {
    const [can, chi] = tru.split(' ');
    count[nguHanhMap[can]] += 1;
    count[nguHanhMap[chi]] += 1;
    countSurface[nguHanhMap[chi]] += 1;
    (hiddenElements[chi] || []).forEach(hanh => count[hanh] += 0.3);
  });
  if (count[menh] >= 3) {
    diem += 1;
  }
  const hanhKhac = khac[menh];
  if (count[hanhKhac] >= 3 || countSurface[hanhKhac] >= 2) {
    diem -= 0.5;
  }

  const sinhChoMenh = Object.entries({ 'Thủy': 'Mộc', 'Mộc': 'Hỏa', 'Hỏa': 'Thổ', 'Thổ': 'Kim', 'Kim': 'Thủy' }).find(([from, to]) => to === menh)?.[0];
  const canList = [tuTru.nam.split(' ')[0], tuTru.thang.split(' ')[0], tuTru.ngay.split(' ')[0], tuTru.gio.split(' ')[0]];
  if (canList.some(can => nguHanhMap[can] === sinhChoMenh)) {
    diem += 1;
  }

  return diem >= 2.5 ? 'Thân Vượng' : 'Thân Nhược';
}

// Tính Dụng Thần
function tinhDungThan(tuTru, locale = 'vi') {
  const [canNgay] = tuTru.ngay.split(' ');
  const menh = nguHanhMap[canNgay];
  const cachCuc = xetThanVuong(tuTru);

  let tyLeNguHanh = { 'Mộc': 0, 'Hỏa': 0, 'Thổ': 0, 'Kim': 0, 'Thủy': 0 };
  [tuTru.nam, tuTru.thang, tuTru.ngay, tuTru.gio].forEach(tru => {
    const [can, chi] = tru.split(' ');
    tyLeNguHanh[nguHanhMap[can]] += 1;
    tyLeNguHanh[nguHanhMap[chi]] += 1;
    (hiddenElements[chi] || []).forEach(hanh => tyLeNguHanh[hanh] += 0.3);
  });
  const total = Object.values(tyLeNguHanh).reduce((a, b) => a + b, 0);
  Object.keys(tyLeNguHanh).forEach(hanh => {
    tyLeNguHanh[hanh] = Math.round((tyLeNguHanh[hanh] / total) * 100) + '%';
  });

  const elementsMap = {
    vi: { Mộc: 'Mộc', Hỏa: 'Hỏa', Thổ: 'Thổ', Kim: 'Kim', Thủy: 'Thủy' },
    en: { Mộc: 'Wood', Hỏa: 'Fire', Thổ: 'Earth', Kim: 'Metal', Thủy: 'Water' }
  };

  const metaphors = {
    Mộc: {
      Vượng: {
        vi: 'Cây cối mọc um tùm, rễ lan khắp nơi, phải dùng lửa đốt bớt và lấy đất vùi gốc để cân bằng sức sống.',
        en: 'Branches overgrow, roots invade — fire trims them, and earth buries their spread.'
      },
      Nhược: {
        vi: 'Mầm non yếu ớt trong gió sương, chỉ khi có nước tưới mát và rừng cây che chở mới sống nổi.',
        en: 'A young sprout shakes in the wind — only water and a forest\'s shade help it thrive.'
      }
    },
    Hỏa: {
      Vượng: {
        vi: 'Lửa cháy ngùn ngụt, thiêu rụi cả cánh đồng, cần đất vùi dập và kim loại hút bớt khí nóng.',
        en: 'Flames roar across fields — earth smothers them, and metal absorbs the heat.'
      },
      Nhược: {
        vi: 'Lửa leo lét giữa trời lạnh, cần thêm củi khô và ngọn lửa khác để bùng cháy.',
        en: 'A flicker in the dark — more fuel and shared flame keep it alive.'
      }
    },
    Thổ: {
      Vượng: {
        vi: 'Đất đá chất chồng, bít lối dòng sông, chỉ nước thấm mềm và cuốc sắt đục phá mới thông mạch sống.',
        en: 'Earth piles block the river — rain softens it, and tools carve the path.'
      },
      Nhược: {
        vi: 'Đất khô nứt nẻ, bạc màu, chỉ ánh mặt trời nung ấm và tro củi bón vào mới hồi sinh.',
        en: 'Parched soil lies bare — sunlight and wood ash restore its strength.'
      }
    },
    Kim: {
      Vượng: {
        vi: 'Kim loại sắc bén, cứng rắn quá mức, chỉ nước mài mòn và cây cối tiêu hao khí kim.',
        en: 'Metal sharp and cold — water wears it, and wood draws its force.'
      },
      Nhược: {
        vi: 'Kim loại chưa thành hình, ẩn sâu trong đất, cần đất nuôi dưỡng và kim trợ lực để cứng cáp.',
        en: 'Unshaped ore sleeps in stone — earth nurtures it, and metal lends strength.'
      }
    },
    Thủy: {
      Vượng: {
        vi: 'Nước lớn cuồn cuộn, cuốn trôi mọi thứ, cần rừng cây chặn lại và ánh nắng hong khô.',
        en: 'Floodwaters sweep all away — forests hold them, and sunlight dries them.'
      },
      Nhược: {
        vi: 'Dòng suối nhỏ lạc giữa đá khô, cần quặng sinh thủy và mưa rơi từ khí Kim để hóa sông lớn.',
        en: 'A tiny stream lost among stones — metal rain and gathered waters give it power.'
      }
    }
  };

  const dungThan = [];
  let lyDo = { vi: '', en: '' };

  const sinh = { 'Thủy': 'Mộc', 'Mộc': 'Hỏa', 'Hỏa': 'Thổ', 'Thổ': 'Kim', 'Kim': 'Thủy' };
  const khac = { 'Mộc': 'Thổ', 'Thổ': 'Thủy', 'Thủy': 'Hỏa', 'Hỏa': 'Kim', 'Kim': 'Mộc' };
  const duocSinhBoi = { 'Mộc': 'Thủy', 'Hỏa': 'Mộc', 'Thổ': 'Hỏa', 'Kim': 'Thổ', 'Thủy': 'Kim' };

  if (cachCuc === 'Thân Vượng') {
    const dungThanMap = {
      Mộc: ['Hỏa', 'Thổ'], Hỏa: ['Thổ', 'Kim'], Thổ: ['Kim', 'Thủy'],
      Kim: ['Thủy', 'Mộc'], Thủy: ['Mộc', 'Hỏa']
    };
    dungThan.push(...dungThanMap[menh]);
    const [hanhSinh, hanhKhac] = dungThan;
    lyDo.vi = `${metaphors[menh].Vượng.vi} Lá số cần hành sinh (${elementsMap.vi[hanhSinh]}) để cân bằng và hành khắc (${elementsMap.vi[hanhKhac]}) để tiết khí.`;
    lyDo.en = `${metaphors[menh].Vượng.en} The chart requires the producing element (${elementsMap.en[hanhSinh]}) to balance and the restraining element (${elementsMap.en[hanhKhac]}) to release energy.`;
  } else {
    const dungThanMap = {
      Mộc: ['Thủy', 'Mộc'], Hỏa: ['Mộc', 'Hỏa'], Thổ: ['Hỏa', 'Thổ'],
      Kim: ['Thổ', 'Kim'], Thủy: ['Kim', 'Thủy']
    };
    dungThan.push(...dungThanMap[menh]);
    const [hanhDuocSinh, hanhBanThan] = dungThan;
    const hanhSinhChoSinh = duocSinhBoi[hanhDuocSinh];
    if (hanhSinhChoSinh !== khac[menh]) {
      dungThan.push(hanhSinhChoSinh);
      lyDo.vi = `${metaphors[menh].Nhược.vi} Lá số cần hành sinh thân (${elementsMap.vi[hanhDuocSinh]}), hành bản thân (${elementsMap.vi[hanhBanThan]}), và hành hỗ trợ (${elementsMap.vi[hanhSinhChoSinh]}).`;
      lyDo.en = `${metaphors[menh].Nhược.en} The chart requires the generating element (${elementsMap.en[hanhDuocSinh]}), its own element (${elementsMap.en[hanhBanThan]}), and the supporting element (${elementsMap.en[hanhSinhChoSinh]}).`;
    } else {
      lyDo.vi = `${metaphors[menh].Nhược.vi} Lá số cần hành sinh thân (${elementsMap.vi[hanhDuocSinh]}) và hành bản thân (${elementsMap.vi[hanhBanThan]}).`;
      lyDo.en = `${metaphors[menh].Nhược.en} The chart requires the generating element (${elementsMap.en[hanhDuocSinh]}) and its own element (${elementsMap.en[hanhBanThan]}).`;
    }
  }

  return { hanh: [...new Set(dungThan)], lyDo, cachCuc, tyLeNguHanh };
}

// Tính Thập Thần
function tinhThapThan(tuTru) {
  const [canNgay] = tuTru.ngay.split(' ');
  const menh = nguHanhMap[canNgay];
  const thapThanMap = {
    Mộc: { 'Giáp': 'Tỷ Kiên', 'Ất': 'Kiếp Đao', 'Bính': 'Thực Thần', 'Đinh': 'Thương Quan', 'Mậu': 'Thiên Ấn', 'Kỷ': 'Chính Ấn', 'Canh': 'Thất Sát', 'Tân': 'Chính Quan', 'Nhâm': 'Tài Tinh', 'Quý': 'Chính Tài' },
    Hỏa: { 'Bính': 'Tỷ Kiên', 'Đinh': 'Kiếp Đao', 'Mậu': 'Thực Thần', 'Kỷ': 'Thương Quan', 'Canh': 'Thiên Ấn', 'Tân': 'Chính Ấn', 'Nhâm': 'Thất Sát', 'Quý': 'Chính Quan', 'Giáp': 'Tài Tinh', 'Ất': 'Chính Tài' },
    Thổ: { 'Mậu': 'Tỷ Kiên', 'Kỷ': 'Kiếp Đao', 'Canh': 'Thực Thần', 'Tân': 'Thương Quan', 'Nhâm': 'Thiên Ấn', 'Quý': 'Chính Ấn', 'Giáp': 'Thất Sát', 'Ất': 'Chính Quan', 'Bính': 'Tài Tinh', 'Đinh': 'Chính Tài' },
    Kim: { 'Canh': 'Tỷ Kiên', 'Tân': 'Kiếp Đao', 'Nhâm': 'Thực Thần', 'Quý': 'Thương Quan', 'Giáp': 'Thiên Ấn', 'Ất': 'Chính Ấn', 'Bính': 'Thất Sát', 'Đinh': 'Chính Quan', 'Mậu': 'Tài Tinh', 'Kỷ': 'Chính Tài' },
    Thủy: { 'Nhâm': 'Tỷ Kiên', 'Quý': 'Kiếp Đao', 'Giáp': 'Thực Thần', 'Ất': 'Thương Quan', 'Bính': 'Thiên Ấn', 'Đinh': 'Chính Ấn', 'Mậu': 'Thất Sát', 'Kỷ': 'Chính Quan', 'Canh': 'Tài Tinh', 'Tân': 'Chính Tài' }
  };

  const thapThan = {};
  [tuTru.nam, tuTru.thang, tuTru.gio].forEach(tru => {
    const [can] = tru.split(' ');
    thapThan[can] = thapThanMap[menh][can];
  });

  return thapThan;
}

// Tính Thần Sát
function tinhThanSat(tuTru) {
  const [canNgay, chiNgay] = tuTru.ngay.split(' ');
  const chiList = [tuTru.nam.split(' ')[1], tuTru.thang.split(' ')[1], tuTru.ngay.split(' ')[1], tuTru.gio.split(' ')[1]];
  const thanSat = [];

  const thienAtMap = { 'Tân': ['Thân', 'Dậu'] };
  if (thienAtMap[canNgay]?.some(chi => chiList.includes(chi))) {
    thanSat.push('Thiên Ất Quý Nhân');
  }

  const daoHoaMap = { 'Tý': 'Dậu', 'Sửu': 'Ngọ', 'Dần': 'Mão', 'Mão': 'Tý', 'Thìn': 'Dậu', 'Tỵ': 'Ngọ', 'Ngọ': 'Mão', 'Mùi': 'Tý', 'Thân': 'Dậu', 'Dậu': 'Ngọ', 'Tuất': 'Mão', 'Hợi': 'Tý' };
  if (chiList.includes(daoHoaMap[chiNgay])) {
    thanSat.push('Đào Hoa');
  }

  const vanXuongMap = { 'Tân': ['Mão'] };
  if (vanXuongMap[canNgay]?.some(chi => chiList.includes(chi))) {
    thanSat.push('Văn Xương');
  }

  const thienDucMap = { 'Tân': ['Dậu'] };
  if (thienDucMap[canNgay]?.some(chi => chiList.includes(chi))) {
    thanSat.push('Thiên Đức');
  }

  const nguyetDucMap = { 'Tân': ['Tý'] };
  if (nguyetDucMap[canNgay]?.some(chi => chiList.includes(chi))) {
    thanSat.push('Nguyệt Đức');
  }

  const hongLoanMap = { 'Tý': 'Dậu', 'Sửu': 'Thân', 'Dần': 'Mùi', 'Mão': 'Ngọ', 'Thìn': 'Tỵ', 'Tỵ': 'Thìn', 'Ngọ': 'Mão', 'Mùi': 'Dần', 'Thân': 'Sửu', 'Dậu': 'Tý', 'Tuất': 'Hợi', 'Hợi': 'Tuất' };
  if (chiList.includes(hongLoanMap[chiNgay])) {
    thanSat.push('Hồng Loan');
  }

  return thanSat;
}

// Phân tích ngũ hành từ Tứ Trụ
const analyzeNguHanh = (tuTru) => {
  const nguHanhCount = { Mộc: 0, Hỏa: 0, Thổ: 0, Kim: 0, Thủy: 0 };
  try {
    [tuTru.nam, tuTru.thang, tuTru.ngay, tuTru.gio].forEach(tru => {
      const [can, chi] = tru.split(' ');
      nguHanhCount[nguHanhMap[can]] += 1;
      nguHanhCount[nguHanhMap[chi]] += 1;
      (hiddenElements[chi] || []).forEach(hanh => nguHanhCount[hanh] += 0.3);
    });
  } catch (e) {
    console.error("Lỗi phân tích ngũ hành:", e.message);
    throw new Error("Không thể phân tích ngũ hành do dữ liệu Tứ Trụ không hợp lệ");
  }
  return nguHanhCount;
};

// Hàm tạo câu trả lời chi tiết
function generateResponse(tuTru, dungThanResult, locale = 'vi') {
  const { hanh: dungThan, lyDo, cachCuc, tyLeNguHanh } = dungThanResult;
  const thanSat = tinhThanSat(tuTru);
  const thapThan = tinhThapThan(tuTru);
  const [canNgay] = tuTru.ngay.split(' ');
  const menh = nguHanhMap[canNgay];

  const menhDescriptions = {
    Mộc: {
      vi: 'như cây xanh vươn cao giữa đất trời, mang sức sống mãnh liệt và khát vọng tự do.',
      en: 'like a green tree reaching for the sky, full of vitality and a yearning for freedom.'
    },
    Hỏa: {
      vi: 'như ngọn lửa rực cháy, mang đam mê và sức mạnh soi sáng muôn nơi.',
      en: 'like a blazing flame, carrying passion and the power to illuminate all.'
    },
    Thổ: {
      vi: 'như ngọn núi vững chãi, mang sự ổn định và che chở cho đời.',
      en: 'like a steadfast mountain, offering stability and shelter to life.'
    },
    Kim: {
      vi: 'như ánh vàng tinh luyện, sắc sảo và kiên định, lấp lánh giữa đất trời.',
      en: 'like refined gold, sharp and resolute, gleaming between heaven and earth.'
    },
    Thủy: {
      vi: 'như dòng suối mát lành, linh hoạt và trôi chảy, ôm lấy muôn vật.',
      en: 'like a cool stream, fluid and adaptable, embracing all things.'
    }
  };

  const colors = {
    Thủy: { vi: 'xanh dương, đen', en: 'blue, black' },
    Mộc: { vi: 'xanh lá', en: 'green' },
    Hỏa: { vi: 'đỏ, cam', en: 'red, orange' },
    Thổ: { vi: 'vàng, nâu', en: 'yellow, brown' },
    Kim: { vi: 'trắng, bạc', en: 'white, silver' }
  };

  const careers = {
    Thủy: { vi: 'giao tiếp, truyền thông, du lịch, logistics', en: 'communication, media, travel, logistics' },
    Mộc: { vi: 'giáo dục, thiết kế, nghệ thuật, sáng tạo', en: 'education, design, art, creativity' },
    Hỏa: { vi: 'công nghệ, năng lượng, marketing, giải trí', en: 'technology, energy, marketing, entertainment' },
    Thổ: { vi: 'bất động sản, nông nghiệp, xây dựng', en: 'real estate, agriculture, construction' },
    Kim: { vi: 'tài chính, kỹ thuật, luật pháp', en: 'finance, engineering, law' }
  };

  const items = {
    Thủy: { vi: 'đá thạch anh xanh, ngọc bích', en: 'blue quartz, jade' },
    Mộc: { vi: 'ngọc bích, gỗ thơm', en: 'jade, sandalwood' },
    Hỏa: { vi: 'đá ruby, hồng ngọc', en: 'ruby, garnet' },
    Thổ: { vi: 'đá thạch anh vàng, ngọc lam', en: 'yellow quartz, turquoise' },
    Kim: { vi: 'trang sức bạc, đá thạch anh trắng', en: 'silver jewelry, white quartz' }
  };

  const directions = {
    Thủy: { vi: 'Bắc', en: 'North' },
    Mộc: { vi: 'Đông', en: 'East' },
    Hỏa: { vi: 'Nam', en: 'South' },
    Thổ: { vi: 'Trung tâm', en: 'Center' },
    Kim: { vi: 'Tây', en: 'West' }
  };

  const response = {
    vi: `Nhật Chủ ${canNgay}, thuộc hành ${menh}, ${menhDescriptions[menh].vi} Trong Tứ Trụ (${tuTru.gio}, ${tuTru.ngay}, ${tuTru.thang}, ${tuTru.nam}), mệnh bạn như ánh sáng lấp lánh, được đất trời nâng niu và thử thách. Ngũ hành hòa quyện: Mộc (${tyLeNguHanh.Mộc}), Hỏa (${tyLeNguHanh.Hỏa}), Thổ (${tyLeNguHanh.Thổ}), Kim (${tyLeNguHanh.Kim}), Thủy (${tyLeNguHanh.Thủy}), như bức tranh thiên nhiên, nơi mỗi yếu tố kể một câu chuyện.

Thập Thần hé lộ khát vọng nội tâm: ${Object.entries(thapThan).map(([can, than]) => `${can} (${than})`).join(', ')} như những ngọn gió dẫn lối, khơi dậy tinh thần tự lập, trí tuệ, và trách nhiệm. Dụng Thần ${dungThan.map(h => h).join(' và ')}, ${lyDo.vi}

Thần Sát như ánh trăng soi đường: ${thanSat.length ? thanSat.join(', ') : 'không có Thần Sát nổi bật'}. ${thanSat.includes('Thiên Ất Quý Nhân') ? 'Thiên Ất Quý Nhân như quý nhân dẫn lối, mang may mắn trong sự nghiệp và gia đạo.' : ''} ${thanSat.includes('Đào Hoa') ? 'Đào Hoa như hoa nở bên suối, tăng sức hút trong tình duyên.' : ''} ${thanSat.includes('Nguyệt Đức') ? 'Nguyệt Đức như ánh trăng rằm, mang hòa hợp và phúc đức.' : ''} ${thanSat.includes('Thiên Đức') ? 'Thiên Đức như phúc đức che chở, bảo vệ gia đạo.' : ''} ${thanSat.includes('Hồng Loan') ? 'Hồng Loan như duyên phận rực rỡ, mang hạnh phúc trong tình yêu.' : ''}

**Tình duyên**: ${thanSat.includes('Đào Hoa') || thanSat.includes('Hồng Loan') ? 'Đào Hoa và Hồng Loan khiến bạn như hoa nở bên dòng suối, dễ thu hút ánh nhìn. ' : ''}${menh} cần ${dungThan.map(h => h).join(' và ')} để làm mềm nét cứng cỏi, mở lòng như dòng suối chảy, tình duyên sẽ nở hoa.
**Sự nghiệp**: ${thanSat.includes('Thiên Ất Quý Nhân') ? 'Thiên Ất Quý Nhân như ngọn gió nâng cánh tài năng, ' : ''}phù hợp với ${dungThan.map(h => careers[h].vi).join(' hoặc ')}. Tận dụng trí tuệ và sự kiên định để tỏa sáng.
**Con cái**: ${thanSat.includes('Nguyệt Đức') || thanSat.includes('Thiên Đức') ? 'Nguyệt Đức và Thiên Đức như phúc đức che chở, con cái là niềm vui lớn, ' : ''}nuôi dưỡng sự sáng tạo (${dungThan.find(h => h === 'Mộc') || dungThan[0]}) để gắn kết.
**Gia đạo**: ${thanSat.includes('Nguyệt Đức') || thanSat.includes('Thiên Đức') ? 'Nguyệt Đức và Thiên Đức như ánh trăng rằm, mang hòa hợp và bình an.' : 'Gia đạo cần sự linh hoạt và sáng tạo để hòa hợp.'}

Để cân bằng lá số, hãy dùng màu ${dungThan.map(h => colors[h].vi).join(' và ')}; đặt ${dungThan.map(h => items[h].vi).join(' hoặc ')} trong không gian sống; ưu tiên hướng ${dungThan.map(h => directions[h].vi).join(' hoặc ')}. Mệnh bạn, như ánh sáng giữa đất trời, sẽ tỏa rực rỡ khi được ${dungThan.map(h => h).join(' và ')} nâng niu. Cầu chúc bạn vận mệnh rạng ngời, tình duyên và sự nghiệp nở hoa!`,
    en: `The Day Master ${canNgay}, of the ${elementsMap.en[menh]} element, ${menhDescriptions[menh].en} Within the Four Pillars (${tuTru.gio}, ${tuTru.ngay}, ${tuTru.thang}, ${tuTru.nam}), your destiny shines, nurtured and tested by heaven and earth. The Five Elements blend: Wood (${tyLeNguHanh.Mộc}), Fire (${tyLeNguHanh.Hỏa}), Earth (${tyLeNguHanh.Thổ}), Metal (${tyLeNguHanh.Kim}), Water (${tyLeNguHanh.Thủy}), like a natural tapestry, each element telling a story.

The Ten Gods reveal your inner aspirations: ${Object.entries(thapThan).map(([can, than]) => `${can} (${than})`).join(', ')}, like winds guiding your path, igniting independence, wisdom, and duty. The Useful Gods ${dungThan.map(h => elementsMap.en[h]).join(' and ')}, ${lyDo.en}

The Auspicious Stars light your way: ${thanSat.length ? thanSat.join(', ') : 'no prominent Auspicious Stars'}. ${thanSat.includes('Thiên Ất Quý Nhân') ? 'Nobleman Star, like a guiding ally, brings luck in career and family.' : ''} ${thanSat.includes('Đào Hoa') ? 'Peach Blossom, like flowers by a stream, enhances romantic allure.' : ''} ${thanSat.includes('Nguyệt Đức') ? 'Moon Virtue, like a full moon, brings harmony and blessings.' : ''} ${thanSat.includes('Thiên Đức') ? 'Heavenly Virtue, like divine protection, safeguards your home.' : ''} ${thanSat.includes('Hồng Loan') ? 'Red Phoenix, like radiant fate, brings joy in love.' : ''}

**Romance**: ${thanSat.includes('Đào Hoa') || thanSat.includes('Hồng Loan') ? 'Peach Blossom and Red Phoenix make you like a flower by a stream, drawing admiring glances. ' : ''}${elementsMap.en[menh]} needs ${dungThan.map(h => elementsMap.en[h]).join(' and ')} to soften its edges, opening your heart like a flowing stream to let love bloom.
**Career**: ${thanSat.includes('Thiên Ất Quý Nhân') ? 'Nobleman Star, like a breeze lifting your talents, ' : ''}suits ${dungThan.map(h => careers[h].en).join(' or ')}. Leverage your wisdom and resolve to shine.
**Children**: ${thanSat.includes('Nguyệt Đức') || thanSat.includes('Thiên Đức') ? 'Moon Virtue and Heavenly Virtue, like blessings, make children a great joy, ' : ''}nurture creativity (${elementsMap.en[dungThan.find(h => h === 'Mộc') || dungThan[0]]}) to bond.
**Family**: ${thanSat.includes('Nguyệt Đức') || thanSat.includes('Thiên Đức') ? 'Moon Virtue and Heavenly Virtue, like a full moon, bring harmony and peace.' : 'Family harmony requires flexibility and creativity.'}

To balance your chart, use colors ${dungThan.map(h => colors[h].en).join(' and ')}; place ${dungThan.map(h => items[h].en).join(' or ')} in your living space; favor directions ${dungThan.map(h => directions[h].en).join(' or ')}. Your destiny, like a radiant light between heaven and earth, will shine brightly when nurtured by ${dungThan.map(h => elementsMap.en[h]).join(' and ')}. May your path be luminous, with love and career in full bloom!`
  };

  return response[locale];
}

// API luận giải Bát Tự
app.post("/api/luan-giai-bazi", async (req, res) => {
  const { messages, tuTruInfo, dungThan } = req.body;

  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set');
    return res.status(500).json({ error: "Cấu hình API không hợp lệ" });
  }

  // Lấy tin nhắn người dùng gần nhất
  const lastUserMsg = messages.slice().reverse().find(m => m.role === "user");
  const userInput = lastUserMsg ? lastUserMsg.content.toLowerCase() : "";

  // Phát hiện ngôn ngữ
  const vietnameseKeywords = ["hãy", "ngày sinh", "xem bát tự", "luận bát tự", "lá số", "sức khỏe", "nghề", "công việc", "vận hạn", "tình duyên", "con cái", "gia đạo"];
  const englishKeywords = ["please", "my birth date", "interpret", "bazi", "health", "career", "job", "fortune", "love", "children", "family"];
  const vietnameseCount = vietnameseKeywords.reduce((count, kw) => count + (userInput.includes(kw) ? 1 : 0), 0);
  const englishCount = englishKeywords.reduce((count, kw) => count + (userInput.includes(kw) ? 1 : 0), 0);
  const language = vietnameseCount >= englishCount ? "vi" : "en";

  // Parse Tứ Trụ
  let tuTruParsed = tuTruInfo ? JSON.parse(tuTruInfo) : null;
  if (language === "en" && userInput.includes("my birth date is")) {
    tuTruParsed = parseEnglishTuTru(userInput) || tuTruParsed;
  }

  if (!tuTruParsed || !tuTruParsed.nam || !tuTruParsed.thang || !tuTruParsed.ngay || !tuTruParsed.gio) {
    return res.status(400).json({ 
      error: language === "vi" 
        ? "Vui lòng cung cấp đầy đủ thông tin Tứ Trụ (năm, tháng, ngày, giờ)" 
        : "Please provide complete Four Pillars information (year, month, day, hour)" 
    });
  }

  // Tính Dụng Thần
  let dungThanResult;
  try {
    dungThanResult = tinhDungThan(tuTruParsed, language);
  } catch (e) {
    console.error("Lỗi trong tinhDungThan:", e.message);
    return res.status(400).json({ 
      error: language === "vi" 
        ? e.message 
        : "Unable to calculate Useful God due to invalid data" 
    });
  }

  // Tạo câu trả lời chi tiết
  const answer = generateResponse(tuTruParsed, dungThanResult, language);

  res.json({ answer });
});

// Xử lý lỗi toàn cục
app.use((err, req, res, next) => {
  console.error("Lỗi server:", err.stack);
  res.status(500).json({ 
    error: req.body.language === "vi" 
      ? "Đã xảy ra lỗi hệ thống, vui lòng thử lại sau" 
      : "A system error occurred, please try again later" 
  });
});

// Khởi động server
const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
server.setTimeout(120000);
