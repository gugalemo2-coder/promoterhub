/**
 * Funções utilitárias de data/hora compartilhadas entre telas.
 * Centraliza formatações que estavam duplicadas em vários arquivos.
 */

/** Formata minutos em "Xh YYm" — ex: 125 → "2h 05m" */
export function formatHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${h}h ${m.toString().padStart(2, "0")}m`;
}

/** Formata uma data/string em hora "HH:MM" no fuso pt-BR */
export function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** Formata uma data em "DD/MM/AAAA HH:MM" */
export function formatDateTime(date: Date | string | null): string {
  if (!date) return "—";
  const d = new Date(date as string);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Formata uma data com dia da semana longo — ex: "segunda-feira, 06 de abril" */
export function formatDateLong(date: Date): string {
  return date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

/** Formata uma data curta — ex: "06/04/2026" */
export function formatDateShort(date: Date | string): string {
  return new Date(date as string).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Retorna início do dia (00:00:00) no fuso local */
export function startOfDay(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

/** Retorna fim do dia (23:59:59) no fuso local */
export function endOfDay(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

/** Retorna início do mês no fuso local */
export function startOfMonth(year: number, month: number): Date {
  return new Date(year, month - 1, 1, 0, 0, 0, 0);
}

/** Retorna fim do mês no fuso local */
export function endOfMonth(year: number, month: number): Date {
  return new Date(year, month, 0, 23, 59, 59, 999);
}

/** Calcula há quanto tempo (ex: "há 2h 15min") */
export function timeAgo(date: Date | string): string {
  const diff = Date.now() - new Date(date as string).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `há ${mins}min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `há ${h}h ${m}min` : `há ${h}h`;
}
