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

## Fase 5 — Novas Funcionalidades

### Integração Offline nas Telas de Ponto e Fotos
- [x] Detectar ausência de conexão na tela de Registro de Ponto
- [x] Enfileirar entrada/saída offline via useOfflineQueue em vez de exibir erro
- [x] Feedback visual ao usuário quando a ação é salva offline (📥 Salvo offline)
- [x] Detectar ausência de conexão na tela de Fotos (câmera e galeria)
- [x] Enfileirar upload de foto offline (base64) via useOfflineQueue
- [x] Fallback automático para offline em caso de falha de rede

### Exportação do Ranking de PDVs em PDF
- [x] Gerar HTML estilizado com ranking mensal completo
- [x] Cabeçalho com gradiente, mês/ano, número de PDVs e score médio
- [x] Cards de sumário (PDVs, visitas, fotos, cobertura, score médio)
- [x] Tabela com posição (medalhas top 3), PDV, todas as métricas e score colorido
- [x] Fórmula do score composto no rodapé
- [x] Código de verificação único por exportação
- [x] Botão "Exportar" no header da tela de Dashboard de PDVs
- [x] Compartilhamento nativo no mobile / nova aba no web

## Fase 6 — Novas Funcionalidades

### Filtro de PDV por Promotor no Dashboard
- [x] Endpoint tRPC: storePerformance.promoters (listar promotores ativos)
- [x] Seletor de promotor com dropdown no Dashboard de PDVs
- [x] Filtrar ranking de PDVs pelas lojas cobertas pelo promotor selecionado
- [x] Opção "Todos os promotores" como padrão
- [x] Botão de limpar filtro (X) quando promotor está selecionado

### Perfil do Promotor
- [x] Endpoint tRPC: promoterProfile.myStats (fotos aprovadas, materiais solicitados, horas, visitas)
- [x] Endpoint tRPC: promoterProfile.weeklyTrend (últimas 4 semanas)
- [x] Tela de perfil com 4 cards de estatísticas (fotos aprovadas, materiais, horas, visitas)
- [x] Gráfico de barras semanal com seletor de métrica (fotos/materiais/horas)
- [x] Breakdown de fotos aprovadas por marca com barras de progresso
- [x] Seletor de mês/ano para filtrar os dados
- [x] Aba "Meu Perfil" na navegação do Promotor

## Fase 7 — Novas Funcionalidades

### Ranking Comparativo de Promotores
- [x] Endpoint tRPC: promoterRanking.monthly (fotos aprovadas, horas, materiais, visitas, score)
- [x] Algoritmo de score composto por promotor (fotos 30%, horas 25%, visitas 25%, materiais 10%, qualidade 10%, alertas -5%)
- [x] Tela de ranking de promotores para o Gestor
- [x] Cards com posição (medalhas top 3), avatar com iniciais, métricas rápidas e score ring
- [x] Cards expandíveis com barras de progresso por métrica
- [x] Filtro por mês/ano com navegação
- [x] Fórmula do score no cabeçalho da lista
- [x] Aba "Ranking" na navegação do Gestor

### Histórico de Visitas por PDV
- [x] Endpoint tRPC: storeVisits.history (visitas por loja com detalhes)
- [x] Tela de histórico de visitas com seletor de loja e mês
- [x] Cada visita: data, promotor, horário de entrada/saída, horas, fotos aprovadas, materiais
- [x] Cards expandíveis com taxa de aprovação de fotos e alertas de geo
- [x] Cards de sumário: total de visitas, horas, fotos aprovadas, materiais
- [x] Aba "Visitas" na navegação do Gestor

## Fase 8 — Novas Funcionalidades

### Exportação do Ranking de Promotores em PDF
- [ ] Botão "Exportar" no header da tela de Ranking de Promotores
- [ ] Gerar HTML estilizado com ranking mensal completo de promotores
- [ ] Cabeçalho com mês/ano, número de promotores e score médio
- [ ] Tabela com posição (medalhas top 3), nome, todas as métricas e score colorido
- [ ] Fórmula do score composto no rodapé
- [ ] Código de verificação único por exportação
- [ ] Compartilhamento nativo no mobile / nova aba no web

### Tela de Detalhe do Promotor para o Gestor
- [x] Endpoint tRPC: promoterRanking.detail (histórico completo do promotor)
- [x] Acesso via tela de Ranking (tap no card do promotor)
- [x] Acesso via tela de Equipe (tap no card do promotor)
- [x] Cabeçalho com avatar, nome, score do mês e posição no ranking
- [x] Cards de métricas: fotos aprovadas, materiais, horas, visitas
- [x] Lista de lojas visitadas no mês com horas e fotos por loja
- [x] Gráfico de evolução mensal (últimos 6 meses)
- [x] Histórico de fotos aprovadas e rejeitadas

## Fase 9 — Novas Funcionalidades

### Exportação PDF do Ranking de Promotores
- [x] Botão "Exportar" no header da tela de Ranking de Promotores
- [x] Gerar HTML estilizado com ranking mensal completo de promotores
- [x] Cabeçalho com mês/ano, número de promotores e score médio
- [x] Tabela com posição (medalhas top 3), nome, todas as métricas e score colorido
- [x] Fórmula do score composto no rodapé
- [x] Código de verificação único por exportação
- [x] Compartilhamento nativo no mobile / nova aba no web

### Card de Evolução de Posição no Detalhe do Promotor
- [x] Endpoint tRPC: promoterRanking.rankPosition (posição atual vs mês anterior)
- [x] Card "Posição no Ranking" com posição atual e variação (subiu/desceu X posições)
- [x] Indicador visual com seta e cor (verde = subiu, vermelho = desceu, cinza = igual)
- [x] Total de promotores no ranking exibido no card

### Filtro de Mês/Ano na Tela de Equipe
- [x] Substituir seletor de data diário por seletor de mês/ano
- [x] Exibir resumo mensal da equipe: horas, fotos, dias trabalhados, solicitações
- [x] Cards de sumário mensal da equipe no topo
- [x] Navegação para Detalhe do Promotor ao tocar no card

## Fase 10 — Ajustes de UX

### Limpeza da Navegação e Perfil
- [x] Remover aba "Offline" da barra de navegação inferior do Promotor
- [x] Manter a funcionalidade de fila offline funcionando em segundo plano
- [x] Remover card de horas trabalhadas da tela de Perfil do Promotor

## Fase 11 — Filtro de Marca nas Fotos

- [x] Barra de filtro horizontal com chips pill de marca na tela de Fotos do Promotor
- [x] Opção "Todas" selecionada por padrão com contador total
- [x] Filtrar a listagem de fotos pela marca selecionada (server-side via brandId)
- [x] Chip ativo com cor de fundo sólida da marca
- [x] Chip inativo com fundo translucido e borda colorida da marca
- [x] Contador de fotos por marca exibido em badge no chip
- [x] Ponto colorido da marca ao lado do nome no chip

## Fase 12 — Correção de Autenticação e Fluxo de Role

- [x] Corrigir fluxo pós-logout: usuário deve voltar para tela de login normalmente
- [x] Corrigir seleção de role após novo login (promotor/gestor)
- [x] App não deve ir direto para tela de promotor sem passar pela seleção de role
- [x] Limpar estado de role e cache ao fazer logout
- [x] Corrigir react-native-maps para versão compatível com Expo Go SDK 54 (1.20.1)
- [x] Adicionar confirmação de logout (Alert) antes de sair da conta

## Fase 13 — Configurações do Gestor e Status Visual de Fotos

- [x] Tabela appSettings no banco de dados (raio geofencing, pesos do score, notificações)
- [x] Endpoint tRPC: settings.get e settings.save
- [x] Tela de Configurações do Gestor com raio de geofencing (chips pill 0.1km–10km)
- [x] Pesos do score compostos com controles +/- e validação de soma = 100%
- [x] Indicador visual de pesos válidos/inválidos
- [x] Toggles de notificações push por tipo de evento
- [x] Botão Salvar com estado dirty (só ativo quando há alterações)
- [x] Aba "Config" visível apenas para gestores na barra de navegação
- [x] Filtro de status (Todos/Pendente/Aprovada/Rejeitada) na tela de Fotos
- [x] Filtro de status passado como parâmetro server-side para o endpoint
- [x] Downgrade react-native-webview para 13.15.0 (compatível com Expo Go SDK 54)
- [x] Downgrade @react-native-community/netinfo para 11.4.1 (compatível com Expo Go SDK 54)

## Fase 14 — Login de Demonstração

- [x] Endpoint POST /api/auth/demo-login no servidor (cria usuários demo no banco e gera token JWT)
- [x] Função demoLogin() no api.ts
- [x] Botões "Promotor Demo" e "Gestor Demo" na tela de login
- [x] Separador visual entre login OAuth e login demo
- [x] Fluxo completo: token salvo no SecureStore + role definido + navegação para o app
- [x] Loading state individual por botão de demo
- [x] Role pré-definido no login demo (sem passar pela tela de seleção de role)

## Fase 15 — Painel Web do Gestor (Desktop/iPad)

- [x] Estrutura base: Next.js 16 + Tailwind CSS + shadcn/ui
- [x] Layout com sidebar colapsável, header e área de conteúdo
- [x] Autenticação: login demo (Gestor Demo) + OAuth Manus
- [x] Dashboard principal: KPIs do dia, gráficos de desempenho, alertas recentes
- [x] Página de Equipe: tabela de promotores com status, horas e métricas do mês
- [x] Página de Ranking de Promotores: tabela com score, posição e evolução
- [x] Página de Detalhe do Promotor: métricas, gráfico de evolução, lojas visitadas
- [x] Página de PDVs: lista de lojas com status e coordenadas
- [x] Página de Fotos: galeria com aprovação/rejeição
- [x] Página de Materiais: gestão de solicitações e catálogo
- [x] Página de Alertas: tabela de alertas com reconhecimento
- [x] Página de Relatórios: relatório mensal com exportação CSV
- [x] Página de Configurações: raio geofencing, pesos do score, notificações
- [x] Conexão com o mesmo banco de dados do app mobile via tRPC
- [x] Zero erros TypeScript no painel web

## Fase 16 — Gerenciamento de Marcas no Painel Web

- [x] Página de Marcas no painel web: listagem com logo, cor, status e ordem
- [x] Modal de criação de marca: nome, descrição, cor hex, ordem
- [x] Modal de edição de marca: pré-preencher campos existentes
- [x] Upload de logo da marca via arquivo (input file)
- [x] Toggle ativar/desativar marca com confirmação
- [x] Link "Marcas" na sidebar do painel web

## Fase 17 — Paridade Total do Painel Web com o App do Gestor

### Controle de Ponto (clock)
- [ ] Página /clock no painel web: tabela de registros de ponto de todos os promotores por data
- [ ] Seletor de data com navegação anterior/próximo
- [ ] Exibir: promotor, loja, tipo (entrada/saída), horário, distância, status dentro do raio
- [ ] Resumo do dia: total de registros, promotores ativos, alertas de geofencing

### Arquivos (files)
- [ ] Página /files no painel web: listagem de arquivos por marca
- [ ] Upload de arquivo (PDF, Excel, imagem) vinculado a uma marca
- [ ] Filtro por marca com chips
- [ ] Exibir: nome, tipo, tamanho, data de upload, marca
- [ ] Botão de download/visualização de cada arquivo

### Dashboard de PDVs (store-dashboard)
- [ ] Página /store-dashboard no painel web: ranking de PDVs com score composto
- [ ] Seletor de mês/ano e filtro por promotor
- [ ] Cards de top 3 com medalhas, score ring e métricas
- [ ] Tabela completa com todas as métricas e barras de progresso
- [ ] Botão de exportar ranking em CSV

### Visitas por PDV (store-visits)
- [ ] Página /store-visits no painel web: histórico de visitas por loja
- [ ] Seletor de loja e mês/ano
- [ ] Cards de sumário: total de visitas, horas, fotos aprovadas, materiais
- [ ] Tabela de visitas com promotor, data, horários, horas, fotos e materiais

### Notificações (notifications)
- [ ] Página /notifications no painel web: histórico de notificações do gestor
- [ ] Filtro por tipo e por não lidas
- [ ] Marcar como lida individualmente e marcar todas como lidas
- [ ] Badge de não lidas no link da sidebar

### Assinatura de Relatório (sign-report)
- [ ] Página /sign-report no painel web: assinar relatório mensal digitalmente
- [ ] Seletor de promotor e mês/ano
- [ ] Canvas de assinatura digital com mouse/touch
- [ ] Gerar código de verificação único
- [ ] Histórico de relatórios assinados com link de verificação

### Melhorias nas páginas existentes
- [ ] Página de Relatórios: adicionar gráfico de horas por dia (barras) e fotos por marca (pizza)
- [ ] Página de PDVs (stores): adicionar botão de cadastrar nova loja com formulário completo
- [ ] Detalhe do Promotor: acessível via clique na tabela de Equipe e Ranking

## Fase 17 — Paridade Total do Painel Web com o App do Gestor

- [x] Página de Controle de Ponto: tabela diária de entradas/saídas de todos os promotores
- [x] Página de Arquivos: listagem por marca + upload de arquivo (PDF, imagem, Excel)
- [x] Página de Dashboard de PDVs: ranking mensal com score composto + exportação HTML
- [x] Página de Visitas por PDV: histórico detalhado de visitas por loja e mês
- [x] Página de Notificações: histórico com filtros e marcar como lida
- [x] Página de Assinar Relatório: canvas de assinatura digital + histórico + exportação
- [x] Sidebar reorganizada em grupos (Visão Geral, PDVs & Visitas, Promotores, Conteúdo, Gestão)
- [x] Zero erros TypeScript após todas as novas páginas
