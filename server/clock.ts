// Regras do registro de ponto dos promotores
//
// 1. Não pode registrar uma nova ENTRADA enquanto houver uma entrada aberta hoje.
// 2. A SAÍDA só pode ser registrada se houver uma entrada aberta hoje.
// 3. A SAÍDA é sempre registrada na MESMA LOJA da entrada aberta (automaticamente).
//
// "Hoje" é sempre calculado no horário de Brasília, no servidor, para não depender
// do relógio ou do fuso do celular do promotor.

import * as db from "./db";

// O Brasil não tem mais horário de verão (desde 2019), então o fuso é fixo em UTC-3
const BRASILIA_OFFSET_MS = 3 * 60 * 60 * 1000;

/** Retorna o início do dia de hoje (00:00 em Brasília) como data UTC */
export function getBrasiliaDayStart(agora: Date = new Date()): Date {
  const local = new Date(agora.getTime() - BRASILIA_OFFSET_MS);
  const meiaNoiteUtc = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  return new Date(meiaNoiteUtc + BRASILIA_OFFSET_MS);
}

/** Formata um horário no fuso de Brasília (ex.: "08:05") */
export function formatBrasiliaTime(data: Date): string {
  return new Date(data).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

export type OpenEntryInfo = {
  id: number;
  storeId: number;
  storeName: string | null;
  entryTime: Date;
};

/**
 * Busca a entrada aberta do promotor HOJE (horário de Brasília).
 * Considera o registro mais recente do dia: se for uma entrada, ela está aberta.
 * Ordena pelo id (autoincremento) para desempatar registros no mesmo segundo.
 */
export async function getOpenEntryToday(userId: number): Promise<OpenEntryInfo | null> {
  const inicioDoDia = getBrasiliaDayStart();
  const registros = await db.getTimeEntriesByUser(userId, inicioDoDia);
  if (registros.length === 0) return null;

  const maisRecente = [...registros].sort((a, b) => b.id - a.id)[0];
  if (maisRecente.entryType !== "entry") return null;

  const loja = await db.getStoreById(maisRecente.storeId);
  return {
    id: maisRecente.id,
    storeId: maisRecente.storeId,
    storeName: loja?.name ?? null,
    entryTime: maisRecente.entryTime,
  };
}

// ─── Trava contra cliques duplos ──────────────────────────────────────────────
// Impede que dois registros do mesmo promotor sejam processados ao mesmo tempo
// (ex.: toque duplo no botão ou internet lenta que faz o app reenviar).

const registrosEmAndamento = new Set<number>();

export function tryLockClock(userId: number): boolean {
  if (registrosEmAndamento.has(userId)) return false;
  registrosEmAndamento.add(userId);
  return true;
}

export function unlockClock(userId: number): void {
  registrosEmAndamento.delete(userId);
}
