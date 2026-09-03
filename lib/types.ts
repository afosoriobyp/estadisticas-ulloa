export type MonthDatum = {
  month: string;
  label: string;
  startDate: string;
  endDate: string;
  totalConsultas: number;
  error?: string;
};

export type FacturacionResponse = {
  success: boolean;
  total: number;
  from: string;
  to: string;
  count: number;
  months: MonthDatum[];
  errors: number;
};