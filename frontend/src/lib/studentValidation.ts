export const formatCpf = (value: string) => value
  .replace(/\D/g, '')
  .slice(0, 11)
  .replace(/^(\d{3})(\d)/, '$1.$2')
  .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
  .replace(/\.(\d{3})(\d)/, '.$1-$2');

export const isValidCpf = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;

  const calculateDigit = (length: number) => {
    const sum = digits
      .slice(0, length)
      .split('')
      .reduce((total, digit, index) => total + Number(digit) * (length + 1 - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return calculateDigit(9) === Number(digits[9])
    && calculateDigit(10) === Number(digits[10]);
};

export const isValidOptionalCpf = (value: string | undefined) => {
  const normalized = value?.trim() ?? '';
  return normalized === '' || isValidCpf(normalized);
};

export const isValidEmail = (value: string) => {
  const normalized = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized);
};
