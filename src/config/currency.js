import api from '../services/api';

let cachedCurrency = null;

export const CURRENCIES = [
  { value: "SDG", label: "جنيه سوداني", symbol: "جنيه", icon: "💵" },
  { value: "USD", label: "دولار أمريكي", symbol: "$", icon: "💵" },
  { value: "SAR", label: "ريال سعودي", symbol: "ر.س", icon: "💵" },
  { value: "AED", label: "درهم إماراتي", symbol: "د.إ", icon: "💵" },
  { value: "EGP", label: "جنيه مصري", symbol: "ج.م", icon: "💵" },
];

export const getCurrencyInfo = () => cachedCurrency;

export const fetchCurrency = async () => {
  try {
    const res = await api.get('/currency');
    if (res.data?.data) {
      cachedCurrency = res.data.data;
      return cachedCurrency;
    }
  } catch (err) {
    console.error('Failed to fetch currency:', err);
  }
  return { currency: 'SDG', currency_symbol: 'جنيه' };
};

export const formatCurrency = (amount, customSymbol = null) => {
  const symbol = customSymbol || cachedCurrency?.currency_symbol || 'جنيه';
  if (!amount && amount !== 0) return `0 ${symbol}`;
  return `${parseFloat(amount).toLocaleString()} ${symbol}`;
};

export const getCurrencySymbol = () => {
  return cachedCurrency?.currency_symbol || 'جنيه';
};
