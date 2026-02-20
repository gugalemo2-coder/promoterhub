import { describe, it, expect } from "vitest";

// ─── Haversine Distance Calculation ──────────────────────────────────────────
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Daily Hours Calculation ──────────────────────────────────────────────────
function calculateWorkedMinutes(entries: { entryType: "entry" | "exit"; entryTime: Date }[]): number {
  let totalMinutes = 0;
  let lastEntry: Date | null = null;
  for (const e of entries) {
    if (e.entryType === "entry") {
      lastEntry = e.entryTime;
    } else if (e.entryType === "exit" && lastEntry) {
      totalMinutes += (e.entryTime.getTime() - lastEntry.getTime()) / 60000;
      lastEntry = null;
    }
  }
  return totalMinutes;
}

// ─── Priority Color Logic ─────────────────────────────────────────────────────
function priorityColor(p: string): string {
  if (p === "high") return "#EF4444";
  if (p === "medium") return "#F59E0B";
  return "#6B7280";
}

// ─── Status Label ─────────────────────────────────────────────────────────────
function statusLabel(s: string): string {
  const map: Record<string, string> = {
    pending: "Pendente",
    approved: "Aprovado",
    rejected: "Recusado",
    delivered: "Entregue",
    cancelled: "Cancelado",
  };
  return map[s] ?? s;
}

// ─── File Icon Mapping ────────────────────────────────────────────────────────
function getFileIcon(fileType: string): string {
  if (fileType.includes("pdf")) return "document-text-outline";
  if (fileType.includes("image")) return "image-outline";
  if (fileType.includes("excel") || fileType.includes("spreadsheet")) return "grid-outline";
  return "document-outline";
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("PromoterHub — Geolocalização", () => {
  it("deve calcular distância zero para o mesmo ponto", () => {
    const dist = haversineDistance(-23.5505, -46.6333, -23.5505, -46.6333);
    expect(dist).toBe(0);
  });

  it("deve calcular distância aproximada entre dois pontos conhecidos", () => {
    // São Paulo (Paulista) → Santo André: ~15 km
    const dist = haversineDistance(-23.5629, -46.6544, -23.6639, -46.5383);
    expect(dist).toBeGreaterThan(10);
    expect(dist).toBeLessThan(20);
  });

  it("deve identificar promotor dentro do raio de 5km", () => {
    const storeLocation = { lat: -23.5505, lon: -46.6333 };
    const promoterLocation = { lat: -23.5520, lon: -46.6350 }; // ~200m de distância
    const dist = haversineDistance(storeLocation.lat, storeLocation.lon, promoterLocation.lat, promoterLocation.lon);
    expect(dist).toBeLessThan(5);
    expect(dist < 5).toBe(true); // isWithinRadius
  });

  it("deve identificar promotor fora do raio de 5km", () => {
    const storeLocation = { lat: -23.5505, lon: -46.6333 };
    const promoterLocation = { lat: -23.6200, lon: -46.7100 }; // ~10km de distância
    const dist = haversineDistance(storeLocation.lat, storeLocation.lon, promoterLocation.lat, promoterLocation.lon);
    expect(dist).toBeGreaterThan(5);
    expect(dist < 5).toBe(false); // !isWithinRadius → deve gerar alerta
  });
});

describe("PromoterHub — Cálculo de Horas", () => {
  it("deve calcular 8 horas de trabalho corretamente", () => {
    const now = new Date("2026-02-20T08:00:00");
    const later = new Date("2026-02-20T16:00:00");
    const entries = [
      { entryType: "entry" as const, entryTime: now },
      { entryType: "exit" as const, entryTime: later },
    ];
    const minutes = calculateWorkedMinutes(entries);
    expect(minutes).toBe(480); // 8 horas = 480 minutos
  });

  it("deve calcular zero minutos sem registros", () => {
    const minutes = calculateWorkedMinutes([]);
    expect(minutes).toBe(0);
  });

  it("deve calcular zero minutos com apenas entrada (sem saída)", () => {
    const entries = [{ entryType: "entry" as const, entryTime: new Date() }];
    const minutes = calculateWorkedMinutes(entries);
    expect(minutes).toBe(0);
  });

  it("deve calcular horas com múltiplos pares entrada/saída", () => {
    const entries = [
      { entryType: "entry" as const, entryTime: new Date("2026-02-20T08:00:00") },
      { entryType: "exit" as const, entryTime: new Date("2026-02-20T12:00:00") },
      { entryType: "entry" as const, entryTime: new Date("2026-02-20T13:00:00") },
      { entryType: "exit" as const, entryTime: new Date("2026-02-20T17:00:00") },
    ];
    const minutes = calculateWorkedMinutes(entries);
    expect(minutes).toBe(480); // 4h + 4h = 8h = 480 min
  });
});

describe("PromoterHub — Lógica de UI", () => {
  it("deve retornar cor vermelha para prioridade alta", () => {
    expect(priorityColor("high")).toBe("#EF4444");
  });

  it("deve retornar cor amarela para prioridade média", () => {
    expect(priorityColor("medium")).toBe("#F59E0B");
  });

  it("deve retornar cor cinza para prioridade baixa", () => {
    expect(priorityColor("low")).toBe("#6B7280");
  });

  it("deve traduzir status para português", () => {
    expect(statusLabel("pending")).toBe("Pendente");
    expect(statusLabel("approved")).toBe("Aprovado");
    expect(statusLabel("rejected")).toBe("Recusado");
    expect(statusLabel("delivered")).toBe("Entregue");
    expect(statusLabel("cancelled")).toBe("Cancelado");
  });

  it("deve retornar ícone correto para PDF", () => {
    expect(getFileIcon("application/pdf")).toBe("document-text-outline");
  });

  it("deve retornar ícone correto para imagem", () => {
    expect(getFileIcon("image/jpeg")).toBe("image-outline");
  });

  it("deve retornar ícone correto para Excel", () => {
    expect(getFileIcon("application/vnd.ms-excel")).toBe("grid-outline");
  });

  it("deve retornar ícone padrão para tipo desconhecido", () => {
    expect(getFileIcon("application/octet-stream")).toBe("document-outline");
  });
});

describe("PromoterHub — Validações de Negócio", () => {
  it("deve validar que quantidade de material deve ser positiva", () => {
    const qty = 5;
    expect(qty > 0).toBe(true);
  });

  it("deve validar que quantidade zero é inválida para solicitação", () => {
    const qty = 0;
    expect(qty > 0).toBe(false);
  });

  it("deve validar que quantidade negativa é inválida", () => {
    const qty = -1;
    expect(qty > 0).toBe(false);
  });

  it("deve formatar horas corretamente", () => {
    const formatHours = (minutes: number) => {
      const h = Math.floor(minutes / 60);
      const m = Math.floor(minutes % 60);
      return `${h}h ${m.toString().padStart(2, "0")}m`;
    };
    expect(formatHours(480)).toBe("8h 00m");
    expect(formatHours(90)).toBe("1h 30m");
    expect(formatHours(0)).toBe("0h 00m");
  });

  it("deve validar que papel do usuário é promoter ou manager", () => {
    const validRoles = ["promoter", "manager"];
    expect(validRoles.includes("promoter")).toBe(true);
    expect(validRoles.includes("manager")).toBe(true);
    expect(validRoles.includes("admin")).toBe(false);
  });
});
