// البنوك الأساسية
export const BASE_BANKS = [
  { key: 'فهد', name: 'بنك الفهد الإسلامي', icon: '🏦' },
  { key: 'التعاون', name: 'بنك التعاون', icon: '🤝' },
  { key: 'الزراعي', name: 'البنك الزراعي', icon: '🌾' },
  { key: 'الشعب', name: 'بنك الشعب', icon: '👥' },
  { key: 'الثقة', name: 'بنك الثقة', icon: '✓' },
  { key: 'الخرطوم', name: 'بنك الخرطوم', icon: '🏛️' },
  { key: 'فيصل', name: 'بنك فيصل الإسلامي', icon: '☪️' },
  { key: 'السودان', name: 'بنك السودان', icon: '🇸🇩' },
  { key: 'طيبة', name: 'بنك طيبة الإسلامي', icon: '🕌' },
  { key: 'الدوحة', name: 'بنك الدوحة', icon: '🏙️' },
  { key: 'التأمين', name: 'شركة التأمين', icon: '🛡️' },
  { key: 'اخرى', name: 'بنوك أخرى', icon: '💼' },
];

// الحصول على اسم البنك بالعربي
export const getBankName = (key) => {
  const bank = BASE_BANKS.find(b => b.key === key);
  return bank ? bank.name : key;
};

// الحصول على أيقونة البنك
export const getBankIcon = (key) => {
  const bank = BASE_BANKS.find(b => b.key === key);
  return bank ? bank.icon : '🏦';
};

// تحويل قائمة البنوك للاستخدام في select
export const getBankOptions = (customBanks = []) => {
  return [
    ...BASE_BANKS.map(b => ({ value: b.key, label: `${b.icon} ${b.name}` })),
    ...customBanks.map(b => ({ value: b.key, label: `🏦 ${b.name}` })),
  ];
};
