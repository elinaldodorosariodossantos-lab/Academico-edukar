export function periodoFinanceiroPermitido(mes: number, ano: number): boolean {
  return Number.isInteger(mes) && mes >= 1 && mes <= 12 && Number.isInteger(ano) &&
    (ano > 2026 || (ano === 2026 && mes >= 9));
}

export function periodoGastosPermitido(mes: number, ano: number): boolean {
  return periodoFinanceiroPermitido(mes, ano) && (ano > 2026 || mes >= 10);
}
