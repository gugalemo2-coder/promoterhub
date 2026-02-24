# Project TODO — Promoter Management System

## Branding & Setup
- [x] Gerar logo do app (ícone de promotor/equipe)
- [x] Configurar tema de cores (primary azul, success verde, danger vermelho)
- [x] Atualizar app.config.ts com nome e logo
- [x] Configurar ícones de navegação no icon-symbol.tsx

## Banco de Dados (Schema)
- [x] Tabela: stores (lojas/PDVs com coordenadas GPS)
- [x] Tabela: brands (marcas: Sinhá, LeitBom, Paraná, Emana, UltraPlas)
- [x] Tabela: promoterProfiles (perfil de promotor vinculado ao user)
- [x] Tabela: timeEntries (registros de ponto com GPS)
- [x] Tabela: photos (fotos com metadados GPS)
- [x] Tabela: materials (materiais cadastrados pelo gestor)
- [x] Tabela: materialRequests (solicitações de materiais)
- [x] Tabela: stockFiles (arquivos de estoque enviados pelo gestor)
- [x] Tabela: geoAlerts (alertas de geolocalização)
- [x] Executar migração do banco (db:push)

## Backend (tRPC Routers)
- [x] Router: auth (login, perfil, papel do usuário)
- [x] Router: stores (CRUD de lojas)
- [x] Router: brands (listar marcas)
- [x] Router: timeEntries (criar, listar, resumo diário)
- [x] Router: photos (upload, listar, filtrar)
- [x] Router: materials (CRUD, controle de estoque)
- [x] Router: materialRequests (criar, aprovar, rejeitar, entregar)
- [x] Router: stockFiles (upload, listar por marca)
- [x] Router: geoAlerts (criar, listar, reconhecer)
- [x] Router: reports (resumo diário, desempenho de promotor)
- [x] Validação de GPS no backend (raio de 5km)
- [x] Proteção anti-spoofing de GPS (alerta automático)

## Autenticação & Navegação
- [x] Tela de Login com email/senha (OAuth)
- [x] Tela de Splash com verificação de sessão
- [x] Contexto de autenticação com papel do usuário (promoter/manager)
- [x] Navegação condicional: Promotor vs Gestor
- [x] Proteção de rotas por papel

## Telas do Promotor
- [x] Promoter Home (resumo do dia + ações rápidas + marcas)
- [x] Photos Screen (galeria + câmera + upload com GPS)
- [x] Materials Screen (catálogo + solicitação de materiais)
- [x] Files Screen (arquivos enviados pelo gestor por marca)
- [x] Clock Screen (registro de ponto com GPS + histórico)

## Telas do Gestor
- [x] Manager Home (painel com alertas + estatísticas + ações rápidas)
- [x] Photos Screen (galeria com aprovação/rejeição)
- [x] Materials Screen (catálogo + gestão de solicitações + aprovação)
- [x] Files Screen (upload de arquivos para promotores)
- [x] Team Screen (equipe de promotores + relatório diário)
- [x] Clock Screen (controle de ponto de todos os promotores)
- [x] Alerts Screen (alertas de geolocalização com reconhecimento)

## Geolocalização
- [x] Instalar expo-location
- [x] Solicitar permissão de localização
- [x] Capturar coordenadas GPS em tempo real
- [x] Calcular distância entre promotor e loja (Haversine)
- [x] Validar raio de 5km para registro de ponto
- [x] Gerar alerta se promotor sair do raio

## Upload de Fotos
- [x] Instalar expo-image-picker
- [x] Permissões de câmera e galeria
- [x] Captura de foto com câmera
- [x] Seleção de foto da galeria
- [x] Upload para S3 via backend
- [x] Salvar metadados (GPS, data, hora, loja)

## Upload de Arquivos
- [x] Instalar expo-document-picker
- [x] Seleção de arquivo (PDF, Excel, etc)
- [x] Upload para S3 via backend
- [x] Associação de arquivo à marca

## Monitoramento Inteligente
- [x] Análise automática de jornada diária
- [x] Cálculo de horas trabalhadas
- [x] Detecção de inconsistências (entrada fora do raio)
- [x] Geração automática de alertas para o gestor
- [x] Painel de alertas com filtros e reconhecimento

## Configurações e Permissões
- [x] Permissões de localização no app.config.ts
- [x] Permissões de câmera no app.config.ts
- [x] Permissões de documentos no app.config.ts
- [x] Ícones SF Symbols mapeados para Material Icons

## Fase 2 — Novas Funcionalidades

### Cadastro de Lojas com Mapa
- [x] Ler documentação expo-maps
- [x] Tela de listagem de lojas para o Gestor
- [x] Tela de cadastro de loja com mapa interativo (toque para selecionar coordenadas)
- [x] Exibir raio de 5km no mapa
- [x] Integrar lojas cadastradas com registro de ponto

### Relatório de Desempenho Mensal
- [x] Tela de relatório com seletor de mês/promotor
- [x] Gráfico de horas trabalhadas por dia (barras)
- [x] Gráfico de fotos enviadas por marca (pizza)
- [x] Tabela detalhada diária com mini-barras de progresso
- [x] Exportação do relatório (compartilhamento nativo)
- [x] Adicionar aba de relatórios na navegação do Gestor
- [x] Filtro por promotor individual

### Notificações Push
- [x] Ler documentação expo-notifications
- [x] Configurar registro de token de push no backend
- [x] Tabela pushTokens no banco de dados
- [x] Notificação ao gestor: promotor saiu do raio
- [x] Notificação ao gestor: nova solicitação de material
- [x] Notificação ao promotor: solicitação aprovada/rejeitada
- [x] Notificação ao gestor: inconsistência de jornada
- [x] Notificação ao promotor: novo arquivo disponível
- [x] Integração no _layout.tsx (PushNotificationSetup)
- [x] Plugin expo-notifications no app.config.ts

## Fase 3 — Novas Funcionalidades

### Central de Histórico de Notificações
- [x] Tabela `notifications` no banco de dados (título, corpo, tipo, lida, userId)
- [x] Salvar notificações no banco ao disparar push
- [x] Router tRPC: listar, marcar como lida, marcar todas como lidas, contar não lidas
- [x] Tela de histórico de notificações (aba para gestor e promotor)
- [x] Filtros por tipo e por não lidas
- [x] Marcar como lida ao tocar na notificação

### Cadastro e Gestão de Marcas
- [x] Router tRPC: criar, editar, desativar marca, upload de logo
- [x] Tela de listagem de marcas para o Gestor
- [x] Formulário de criação/edição de marca (nome, cor, logo)
- [x] Upload de logo da marca via galeria com preview
- [x] Ativar/desativar marca com toggle
- [x] Seletor de 10 cores predefinidas + campo hex personalizado

### Assinatura Digital de Relatório
- [x] Tela de assinatura digital com canvas de desenho (WebView)
- [x] Geração de código único de verificação por relatório
- [x] Tabela signed_reports no banco de dados
- [x] Router tRPC: criar, verificar, listar por gestor
- [x] Histórico de relatórios assinados
- [x] Exportação via compartilhamento nativo

### Correção de Erros no Expo Go
- [x] Investigar Console Error ao abrir o app (push token sem projectId no Expo Go)
- [x] Investigar Uncaught Error ao abrir o app (tRPC UNAUTHORIZED antes da autenticação)
- [x] Corrigir retry do QueryClient para não repetir em erros UNAUTHORIZED
- [x] Adicionar enabled: !!user em todas as queries da tela Home
- [x] Remover expo-device do hook de push notifications

## Fase 4 — Novas Funcionalidades

### Dashboard de Desempenho por PDV
- [x] Query de desempenho por loja: visitas, fotos, materiais, horas de cobertura
- [x] Algoritmo de score composto ponderado por PDV (visitas 25%, fotos 20%, qualidade 20%, cobertura 20%, materiais 10%, alertas -5%)
- [x] Router tRPC: storePerformance.ranking (mensal, com ranking)
- [x] Tela Dashboard de PDVs para o Gestor
- [x] Ranking visual com médalhas top 3, score ring e cards expandíveis
- [x] Barras de progresso por métrica com breakdown do score
- [x] Filtro por mês e ano com navegação

### Modo Offline para o Promotor
- [x] Fila local de ações offline (AsyncStorage, persistência entre sessões)
- [x] Suporte offline: registro de ponto (entrada e saída)
- [x] Suporte offline: envio de fotos (base64 local)
- [x] Suporte offline: solicitação de materiais
- [x] Detecção de conectividade (@react-native-community/netinfo)
- [x] Sincronização automática ao reconectar e ao voltar ao foreground
- [x] Banner animado de status offline/sincronizando no topo do app
- [x] Tela de fila offline com status, erros, retry e limpeza
- [x] Retry automático (máx 3 tentativas) + retry manual
- [x] Aba "Offline" na navegação do Promotor
