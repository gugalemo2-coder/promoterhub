import { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { WebView } from "react-native-webview";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { trpc } from "@/lib/trpc";
import { useColors } from "@/hooks/use-colors";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// HTML para o canvas de assinatura digital
const SIGNATURE_HTML = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #f8f9fa; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: -apple-system, sans-serif; }
  canvas { background: white; border: 2px dashed #cbd5e0; border-radius: 12px; touch-action: none; cursor: crosshair; }
  .hint { margin-top: 12px; font-size: 13px; color: #718096; }
  .btn { margin-top: 12px; padding: 10px 24px; background: #ef4444; color: white; border: none; border-radius: 20px; font-size: 14px; cursor: pointer; }
</style>
</head>
<body>
<canvas id="sig" width="320" height="160"></canvas>
<p class="hint">Assine com o dedo na área acima</p>
<button class="btn" onclick="clearSig()">Limpar</button>
<script>
  const canvas = document.getElementById('sig');
  const ctx = canvas.getContext('2d');
  let drawing = false;
  let hasDrawn = false;
  ctx.strokeStyle = '#1a202c';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: (src.clientX - rect.left) * (canvas.width / rect.width), y: (src.clientY - rect.top) * (canvas.height / rect.height) };
  }

  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); }, { passive: false });
  canvas.addEventListener('touchmove', (e) => { e.preventDefault(); if (!drawing) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); hasDrawn = true; }, { passive: false });
  canvas.addEventListener('touchend', (e) => { e.preventDefault(); drawing = false; if (hasDrawn) sendSig(); });

  canvas.addEventListener('mousedown', (e) => { drawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); });
  canvas.addEventListener('mousemove', (e) => { if (!drawing) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); hasDrawn = true; });
  canvas.addEventListener('mouseup', () => { drawing = false; if (hasDrawn) sendSig(); });

  function sendSig() {
    const data = canvas.toDataURL('image/png');
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'signature', data }));
  }

  function clearSig() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawn = false;
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'cleared' }));
  }
</script>
</body>
</html>
`;

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0").toUpperCase();
}

export default function SignReportScreen() {
  const colors = useColors();
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [showSignModal, setShowSignModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastReportId, setLastReportId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const { data: promoters } = trpc.reports.allPromoters.useQuery();
  const [selectedPromoter, setSelectedPromoter] = useState<number | undefined>(undefined);

  const { data: monthlyData, isLoading: loadingReport } = trpc.reports.monthly.useQuery(
    { year: selectedYear, month: selectedMonth, userId: selectedPromoter },
    { enabled: true }
  );

  const { data: signedHistory, refetch: refetchHistory } = trpc.signedReports.listByManager.useQuery();

  useFocusEffect(useCallback(() => { refetchHistory(); }, []));

  const createSignedReportMutation = trpc.signedReports.create.useMutation({
    onSuccess: (data) => {
      setLastReportId(data.reportId);
      setShowSignModal(false);
      setShowSuccess(true);
      refetchHistory();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (e) => Alert.alert("Erro", e.message),
  });

  const handleSign = () => {
    if (!signatureData) {
      Alert.alert("Atenção", "Por favor, assine o relatório antes de confirmar.");
      return;
    }
    const reportContent = JSON.stringify({
      month: selectedMonth,
      year: selectedYear,
      promoterId: selectedPromoter,
      totalHours: monthlyData?.totalHours ?? 0,
      totalPhotos: monthlyData?.totalPhotos ?? 0,
      signedAt: new Date().toISOString(),
    });
    const reportHash = hashString(reportContent + signatureData.slice(0, 100));
    createSignedReportMutation.mutate({
      month: selectedMonth,
      year: selectedYear,
      promoterId: selectedPromoter,
      signatureData,
      reportHash,
    });
  };

  const handleExportPDF = async (reportId: string) => {
    const verifyUrl = `https://promoterhub.app/verify/${reportId}`;
    const content = `RELATÓRIO ASSINADO DIGITALMENTE

Código: ${reportId}
Mês: ${MONTHS[selectedMonth - 1]}/${selectedYear}
${selectedPromoter ? `Promotor ID: ${selectedPromoter}` : "Todos os promotores"}

DADOS DO PERÍODO:
• Total de horas: ${(monthlyData?.totalHours ?? 0).toFixed(1)}h
• Fotos enviadas: ${monthlyData?.totalPhotos ?? 0}
• Materiais solicitados: ${monthlyData?.totalRequests ?? 0}

VERIFICAÇÃO:
Acesse ${verifyUrl} para verificar a autenticidade deste relatório.

Assinado digitalmente em ${new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}`;

    const fileUri = `${FileSystem.documentDirectory}relatorio-${reportId}.txt`;
    await FileSystem.writeAsStringAsync(fileUri, content, { encoding: FileSystem.EncodingType.UTF8 });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, { mimeType: "text/plain", dialogTitle: "Exportar Relatório" });
    } else {
      Alert.alert("Relatório salvo", `Arquivo salvo em: ${fileUri}`);
    }
  };

  const years = [now.getFullYear() - 1, now.getFullYear()];

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View
          style={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 16,
            borderBottomWidth: 0.5,
            borderBottomColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 26, fontWeight: "700", color: colors.foreground }}>
            Assinar Relatório
          </Text>
          <Text style={{ fontSize: 13, color: colors.muted, marginTop: 2 }}>
            Assine digitalmente e gere código de verificação
          </Text>
        </View>

        <View style={{ padding: 20, gap: 20 }}>
          {/* Seletor de período */}
          <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground, marginBottom: 12 }}>
              📅 Período do Relatório
            </Text>
            <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 8 }}>ANO</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
              {years.map((y) => (
                <Pressable
                  key={y}
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedYear(y); }}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: selectedYear === y ? colors.primary : colors.background,
                    alignItems: "center",
                    borderWidth: 1,
                    borderColor: selectedYear === y ? colors.primary : colors.border,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text style={{ fontSize: 15, fontWeight: "600", color: selectedYear === y ? "#fff" : colors.foreground }}>
                    {y}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={{ fontSize: 12, color: colors.muted, marginBottom: 8 }}>MÊS</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {MONTHS.map((m, i) => {
                const idx = i + 1;
                const active = selectedMonth === idx;
                return (
                  <Pressable
                    key={m}
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedMonth(idx); }}
                    style={({ pressed }) => ({
                      paddingHorizontal: 10,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: active ? colors.primary : colors.background,
                      borderWidth: 1,
                      borderColor: active ? colors.primary : colors.border,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "600", color: active ? "#fff" : colors.foreground }}>
                      {m.slice(0, 3)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Seletor de promotor */}
          {promoters && promoters.length > 0 && (
            <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground, marginBottom: 12 }}>
                👤 Promotor (opcional)
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedPromoter(undefined); }}
                    style={({ pressed }) => ({
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 20,
                      backgroundColor: !selectedPromoter ? colors.primary : colors.background,
                      borderWidth: 1,
                      borderColor: !selectedPromoter ? colors.primary : colors.border,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "600", color: !selectedPromoter ? "#fff" : colors.foreground }}>
                      Todos
                    </Text>
                  </Pressable>
                  {promoters.map((p) => (
                    <Pressable
                      key={p.id}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedPromoter(p.id); }}
                      style={({ pressed }) => ({
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor: selectedPromoter === p.id ? colors.primary : colors.background,
                        borderWidth: 1,
                        borderColor: selectedPromoter === p.id ? colors.primary : colors.border,
                        opacity: pressed ? 0.7 : 1,
                      })}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "600", color: selectedPromoter === p.id ? "#fff" : colors.foreground }}>
                        {p.name ?? `Promotor ${p.id}`}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Resumo do relatório */}
          {loadingReport ? (
            <ActivityIndicator color={colors.primary} />
          ) : monthlyData ? (
            <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground, marginBottom: 12 }}>
                📊 Resumo — {MONTHS[selectedMonth - 1]} {selectedYear}
              </Text>
              <View style={{ flexDirection: "row", gap: 12 }}>
                {[
                  { label: "Horas", value: `${(monthlyData.totalHours ?? 0).toFixed(1)}h`, icon: "⏱️" },
                  { label: "Fotos", value: String(monthlyData.totalPhotos ?? 0), icon: "📸" },
                  { label: "Materiais", value: String(monthlyData.totalRequests ?? 0), icon: "📦" },
                ].map((stat) => (
                  <View
                    key={stat.label}
                    style={{
                      flex: 1,
                      backgroundColor: colors.background,
                      borderRadius: 12,
                      padding: 12,
                      alignItems: "center",
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>{stat.icon}</Text>
                    <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground, marginTop: 4 }}>
                      {stat.value}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.muted }}>{stat.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Botão de assinar */}
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowSignModal(true); }}
            style={({ pressed }) => ({
              backgroundColor: colors.primary,
              borderRadius: 16,
              padding: 18,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 10,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ fontSize: 20 }}>✍️</Text>
            <Text style={{ fontSize: 17, fontWeight: "700", color: "#fff" }}>
              Assinar Relatório
            </Text>
          </Pressable>

          {/* Histórico */}
          {signedHistory && signedHistory.length > 0 && (
            <View>
              <Pressable
                onPress={() => setShowHistory((v) => !v)}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}
              >
                <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground }}>
                  Relatórios Assinados ({signedHistory.length})
                </Text>
                <Text style={{ fontSize: 13, color: colors.primary }}>{showHistory ? "Ocultar" : "Ver todos"}</Text>
              </Pressable>
              {showHistory && signedHistory.map((r) => (
                <View
                  key={r.id}
                  style={{
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 8,
                    borderWidth: 1,
                    borderColor: colors.border,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground }}>
                      {MONTHS[r.month - 1]} {r.year}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.muted, marginTop: 2 }}>
                      {r.reportId}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.muted }}>
                      Assinado em {new Date(r.signedAt).toLocaleDateString("pt-BR")}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleExportPDF(r.reportId)}
                    style={({ pressed }) => ({
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 10,
                      backgroundColor: colors.primary,
                      opacity: pressed ? 0.7 : 1,
                    })}
                  >
                    <Text style={{ fontSize: 12, color: "#fff", fontWeight: "600" }}>Exportar</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal de assinatura */}
      <Modal visible={showSignModal} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 20,
              paddingTop: 20,
              paddingBottom: 16,
              borderBottomWidth: 0.5,
              borderBottomColor: colors.border,
            }}
          >
            <Pressable onPress={() => { setShowSignModal(false); setSignatureData(null); }}>
              <Text style={{ fontSize: 16, color: colors.muted }}>Cancelar</Text>
            </Pressable>
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.foreground }}>Assinatura Digital</Text>
            <Pressable
              onPress={handleSign}
              disabled={!signatureData || createSignedReportMutation.isPending}
            >
              <Text style={{
                fontSize: 16,
                fontWeight: "600",
                color: !signatureData || createSignedReportMutation.isPending ? colors.muted : colors.primary,
              }}>
                {createSignedReportMutation.isPending ? "Salvando..." : "Confirmar"}
              </Text>
            </Pressable>
          </View>

          <View style={{ padding: 20, gap: 16 }}>
            <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 20 }}>
                Ao assinar, você confirma que os dados do relatório de{" "}
                <Text style={{ fontWeight: "700", color: colors.foreground }}>
                  {MONTHS[selectedMonth - 1]} {selectedYear}
                </Text>{" "}
                estão corretos. A assinatura será registrada com data, hora e código de verificação único.
              </Text>
            </View>

            <View style={{ height: 280, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
              <WebView
                source={{ html: SIGNATURE_HTML }}
                onMessage={(e) => {
                  try {
                    const msg = JSON.parse(e.nativeEvent.data);
                    if (msg.type === "signature") setSignatureData(msg.data);
                    if (msg.type === "cleared") setSignatureData(null);
                  } catch {}
                }}
                scrollEnabled={false}
                style={{ flex: 1 }}
              />
            </View>

            {signatureData ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: `${colors.success}20`, borderRadius: 10, padding: 10 }}>
                <Text style={{ fontSize: 16 }}>✅</Text>
                <Text style={{ fontSize: 13, color: colors.success, fontWeight: "600" }}>Assinatura capturada</Text>
              </View>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.surface, borderRadius: 10, padding: 10 }}>
                <Text style={{ fontSize: 16 }}>✍️</Text>
                <Text style={{ fontSize: 13, color: colors.muted }}>Assine na área acima para continuar</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal de sucesso */}
      <Modal visible={showSuccess} animationType="fade" transparent>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <View style={{ backgroundColor: colors.background, borderRadius: 24, padding: 28, width: "100%", alignItems: "center", gap: 16 }}>
            <Text style={{ fontSize: 56 }}>🎉</Text>
            <Text style={{ fontSize: 22, fontWeight: "700", color: colors.foreground, textAlign: "center" }}>
              Relatório Assinado!
            </Text>
            <Text style={{ fontSize: 14, color: colors.muted, textAlign: "center" }}>
              Código de verificação gerado com sucesso.
            </Text>
            <View style={{ backgroundColor: colors.surface, borderRadius: 12, padding: 14, width: "100%", borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 11, color: colors.muted, marginBottom: 4 }}>CÓDIGO DO RELATÓRIO</Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.foreground, fontFamily: "monospace" }} selectable>
                {lastReportId}
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 12, width: "100%" }}>
              <Pressable
                onPress={() => { setShowSuccess(false); if (lastReportId) handleExportPDF(lastReportId); }}
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: colors.primary,
                  borderRadius: 14,
                  padding: 14,
                  alignItems: "center",
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#fff" }}>Exportar</Text>
              </Pressable>
              <Pressable
                onPress={() => setShowSuccess(false)}
                style={({ pressed }) => ({
                  flex: 1,
                  backgroundColor: colors.surface,
                  borderRadius: 14,
                  padding: 14,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: colors.border,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>Fechar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
