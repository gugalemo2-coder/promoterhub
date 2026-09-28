// Armazenamento de arquivos do PromoterHub — Supabase Storage
// Substitui o armazenamento antigo do Manus (BUILT_IN_FORGE_API_*).
//
// Variáveis de ambiente necessárias no Railway:
//   SUPABASE_URL          → ex.: https://abcdefgh.supabase.co
//   SUPABASE_SERVICE_KEY  → chave secreta (secret / service_role) do projeto
//   SUPABASE_BUCKET       → opcional, nome do bucket (padrão: "promoterhub")
//
// O bucket precisa ser PÚBLICO, pois o app exibe as fotos direto pela URL.

type StorageConfig = { baseUrl: string; apiKey: string; bucket: string };

function getStorageConfig(): StorageConfig {
  const baseUrl = process.env.SUPABASE_URL ?? "";
  const apiKey = process.env.SUPABASE_SERVICE_KEY ?? "";
  const bucket = process.env.SUPABASE_BUCKET || "promoterhub";

  if (!baseUrl || !apiKey) {
    throw new Error(
      "Armazenamento não configurado: defina SUPABASE_URL e SUPABASE_SERVICE_KEY no Railway",
    );
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey, bucket };
}

// Remove barras do início do caminho e codifica cada parte para uso na URL
function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function encodeKey(key: string): string {
  return key
    .split("/")
    .map((parte) => encodeURIComponent(parte))
    .join("/");
}

// Monta a URL pública do arquivo (bucket público)
function buildPublicUrl(config: StorageConfig, key: string): string {
  return `${config.baseUrl}/storage/v1/object/public/${config.bucket}/${encodeKey(key)}`;
}

// Envia um arquivo para o Supabase e devolve a URL pública
export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream",
): Promise<{ key: string; url: string }> {
  const config = getStorageConfig();
  const key = normalizeKey(relKey);
  const uploadUrl = `${config.baseUrl}/storage/v1/object/${config.bucket}/${encodeKey(key)}`;

  const body =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      apikey: config.apiKey,
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": contentType,
      "x-upsert": "true", // sobrescreve se já existir um arquivo com o mesmo nome
    },
    body,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Falha no envio do arquivo (${response.status} ${response.statusText}): ${message}`,
    );
  }

  return { key, url: buildPublicUrl(config, key) };
}

// Devolve a URL pública de um arquivo já enviado
export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const config = getStorageConfig();
  const key = normalizeKey(relKey);
  return { key, url: buildPublicUrl(config, key) };
}
