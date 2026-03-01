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

## Fase 18 — Melhorias no Painel Web

- [x] Modal de cadastro de nova loja na página de PDVs (nome, endereço, coordenadas GPS)
- [x] Gráficos de barras (horas por dia) e pizza (fotos por marca) na página de Relatórios
- [x] Filtro de mês/ano no Controle de Ponto para ver histórico completo
- [x] Botão de download individual de foto na página de Fotos
- [x] Botão de download em massa de todas as fotos filtradas

## Fase 19 — PWA (Progressive Web App)

- [ ] Gerar ícones PWA em múltiplos tamanhos (192x192, 512x512, apple-touch-icon 180x180)
- [ ] Criar manifest.json com nome, cores, ícones, display standalone e orientação
- [ ] Configurar metadados PWA no layout do Next.js (apple-mobile-web-app, theme-color, viewport)
- [ ] Implementar service worker com cache offline (next-pwa ou custom)
- [ ] Adicionar banner de instalação nativo no painel web
- [ ] Tela de splash personalizada para iOS e Android
- [ ] Testar instalação na tela inicial do celular

## Fase 20 — Sistema de Autenticação Próprio

- [x] Tabela app_users no banco: id, name, login, passwordHash, role (promoter/manager/master), active, createdAt
- [x] Seed automático da conta Master (gustavolemes / Gustavo2410@) na inicialização do servidor
- [x] Endpoint POST /api/auth/app-register: nome + senha → login gerado, role=promoter
- [x] Endpoint POST /api/auth/app-login: login + senha → JWT token
- [x] Endpoint GET /api/auth/app-me: retorna dados do usuário autenticado
- [x] Endpoint GET /api/master/users: lista todos os usuários (só Master)
- [x] Endpoint PATCH /api/master/users/:id/role: promove/rebaixa role (só Master)
- [x] Endpoint PATCH /api/master/users/:id/active: ativa/desativa conta (só Master)
- [x] Tela de Login no app: campos login e senha, botão Entrar, link para Cadastro
- [x] Tela de Cadastro no app: campo Nome e Senha, login gerado automaticamente
- [x] Painel Master no app: lista de usuários com filtros, role badge e botões de ação
- [x] Navegação condicional: Master → aba Usuários + tudo do Gestor
- [x] Navegação condicional: Gestor → painel de gestão
- [x] Navegação condicional: Promotor → painel do promotor
- [x] Login demo mantido para testes (pode ser removido futuramente)

## Fase 21 — Vinculação de Dados ao Novo Sistema de Auth e Recuperação de Senha

- [x] Auditar como userId é usado nas tabelas (timeEntries, photos, materialRequests, etc.)
- [x] SDK auto-cria registro na tabela users ao primeiro login com token app_user_*
- [x] Dados criados pelo novo login ficam vinculados ao appUser correto via tRPC
- [x] Endpoint PATCH /api/master/users/:id/password (só Master): redefine senha de qualquer usuário
- [x] Botão "Redefinir Senha" (chave amarela) no card de cada usuário no painel Master
- [x] Alert.prompt nativo do iOS para digitar a nova senha com campo seguro
- [x] Feedback de sucesso/erro na redefinição

## Fase 22 — Nome e Avatar do Usuário no Cabeçalho

- [x] Componente UserHeader: avatar com inicial do nome, nome completo e role badge
- [x] Integrar UserHeader nas telas principais do Gestor (dashboard/equipe)
- [x] Integrar UserHeader nas telas principais do Promotor (home/perfil)
- [x] Integrar UserHeader na tela Master (painel de usuários)

## Fase 23 — Foto de Perfil e Nome Real no Painel Web

- [ ] Coluna avatarUrl na tabela app_users do banco de dados
- [ ] Endpoint POST /api/auth/app-upload-avatar: upload de foto de perfil para S3
- [ ] Endpoint GET /api/auth/app-me retorna avatarUrl junto com nome e role
- [ ] Componente UserHeader exibe foto de perfil quando disponível (fallback para inicial)
- [ ] Botão de editar foto de perfil no UserHeader (toque no avatar)
- [ ] Picker de imagem com opções: câmera ou galeria
- [ ] Preview da nova foto antes de confirmar upload
- [x] Painel web: cabeçalho exibe nome real do usuário logado (não "Gestor Demo")
- [x] Painel web: avatar com inicial do nome no cabeçalho do painel web

## Fase 24 — PWA (Progressive Web App) no App Mobile

- [x] Gerar ícones PWA em múltiplos tamanhos (192x192, 512x512, apple-touch-icon 180x180)
- [x] Configurar manifest.json no Expo (nome, cores, ícones, display standalone, orientação portrait)
- [x] Configurar metadados PWA no HTML template do Expo Web (apple-mobile-web-app, theme-color, viewport)
- [x] Implementar service worker com cache offline (custom sw.js compatível com Turbopack)
- [x] Testar instalação na tela inicial do celular (Android Chrome e iOS Safari)
- [x] Documentar link de instalação para distribuição via WhatsApp

## Fase 26 — Redesign de Navegação Gestor/Master

- [x] Reestruturar menu inferior Gestor/Master para 5 abas: Painel, Materiais, Arquivos, Config, Menu (≡)
- [x] Remover abas: Equipe, Alertas, Lojas, Marcas, Fotos, Relatórios, Assinar, PDVs, Ranking, Visitas, Usuários do menu inferior
- [x] Criar aba Menu (≡) com drawer/modal listando: Fotos, Relatórios, Assinar, PDVs, Ranking, Visitas
- [x] Redesenhar Painel Gestor/Master: dashboard com resumo do dia + sino de alertas no cabeçalho (esquerda da saudação)
- [x] Adicionar seletor de marcas no Painel para exibir fotos do dia dos promotores
- [x] Expandir tela Config: adicionar seções Equipe, Lojas, Marcas (Gestor e Master) + Usuários (apenas Master)
- [x] Criar tela de Fotos para Gestor/Master com filtros: Marca, Loja, Promotor, Data
- [x] Fotos ordenadas por padrão das mais recentes, com filtro de Data usando ordem cronológica
- [x] Remover Fotos, Ponto e Meu Perfil do fluxo de Gestor/Master (são exclusivos do Promotor)
- [x] Corrigir PWA: headers corretos para manifest.json, sw.js atualizado para v2

## Fase 27 — Correções de Navegação

- [x] Corrigir botão "Equipe" no Painel Gestor/Master para navegar para /(tabs)/team
- [x] Corrigir botão "Relatórios" no Painel Gestor/Master para navegar para /(tabs)/reports

## Fase 28 — Correção de Navegação na Conta Master

- [x] Investigar por que botões de Equipe e Relatórios não funcionam na conta Master
- [x] Corrigir navegação para que Master acesse as mesmas telas que o Gestor via Acesso Rápido (alerts, reports, stores, team)

## Fase 29 — Login e Remoção de Demos

- [x] Corrigir redirecionamento: criado index.tsx na raiz com lógica de auth, removido anchor "(tabs)" do _layout.tsx
- [x] Remover endpoint /api/auth/demo-login do servidor (botões já não existiam na tela de login)
- [x] Verificar banco de dados: não há usuários demo cadastrados (tabela limpa)

## Fase 30 — Correção de Logout

- [x] Corrigir botão de logout na conta Master (router.replace("/") para acionar o fluxo de auth do index raiz)

## Fase 31 — Auditoria e Correção Geral de Roles

- [x] Corrigir isManager em clock.tsx para incluir master
- [x] Corrigir isManager em files.tsx para incluir master
- [x] Corrigir isManager em materials.tsx para incluir master
- [x] Corrigir isManager em photos.tsx para incluir master
- [x] Verificar aba clock (Ponto): oculta para Gestor/Master via href: isPromoter ? undefined : null
- [x] Verificar aba photos (Fotos): oculta para Gestor/Master via href: isPromoter ? undefined : null
- [x] Verificar aba my-profile: oculta para Gestor/Master via href: isPromoter ? undefined : null

## Fase 32 — Correção de Logout Web

- [x] Corrigir logout na versão web: limpa localStorage completo + cookie + window.location.href para /login (força reload e destrói estado em memória)
- [x] Garantir que o app não abra direto em conta antiga ao acessar o link (localStorage limpo no logout)

## Fase 32 — Correção de Logout Web

- [x] Corrigir logout na versão web: substituir Pressable por TouchableOpacity no UserHeader
- [x] Remover window.confirm (bloqueado em iframe/headless) e fazer logout direto na web
- [x] Corrigir logout em index.tsx, team.tsx e master-users.tsx para usar Platform.OS === "web"
- [x] Testado e confirmado: botão de logout redireciona para /login corretamente

## Fase 33 — Troca de Logo (Dinâmica Corretora)

- [x] Processar logo Dinâmica: fundo branco + padding + formato quadrado
- [x] Gerar ícones em todos os tamanhos (72, 96, 128, 144, 152, 192, 384, 512px)
- [x] Gerar apple-touch-icon (180x180)
- [x] Substituir icon.png, splash-icon.png, favicon.png, android-icon-foreground.png no Expo
- [x] Substituir ícones PWA no manifest.json do painel web
- [x] Atualizar app.config.ts com novo logoUrl (S3 CDN)

### Fase 34 — Correção de Ícone PWA na Tela Inicial
- [x] Verificar qual manifest.json está sendo usado pelo app Expo Web
- [x] Corrigir o manifest para apontar para os ícones da Dinâmica
- [x] Atualizar versão do service worker para forçar limpeza de cache
- [x] Verificar meta tags apple-touch-icon no HTML gerado pelo Expo

## Fase 35 — Correção Definitiva do Ícone PWA
- [x] Criar public/index.html customizado com todas as tags PWA (manifest, apple-touch-icon, theme-color, icons)
- [x] Criar public/manifest.json estático com ícones da Dinâmica (192x192, 512x512, maskable)
- [x] Copiar ícones PWA para public/icons/ (icon-192x192.png, icon-512x512.png, maskable)
- [x] Copiar apple-touch-icon.png para public/ (180x180)
- [x] Mudar web.output de "static" para "single" no app.config.ts para que o Expo injete o script bundle
- [x] Adicionar web.name, web.description, web.themeColor ao app.config.ts
- [x] Verificado: manifest.json sendo servido corretamente com ícones da Dinâmica
- [x] Verificado: apple-touch-icon (180x180) carregando corretamente
- [x] Verificado: icon-192x192.png (192x192) carregando corretamente
- [x] Verificado: app funcionando normalmente após as mudanças

## Fase 36 — Ajuste de Tamanho da Logo nos Ícones PWA
- [x] Aumentar o tamanho da logo da Dinâmica nos ícones PWA (192x192, 512x512, maskable, apple-touch-icon)

## Fase 37 — Recorte do Fundo Branco da Logo nos Ícones PWA
- [x] Recortar o excesso de fundo branco ao redor da logo da Dinâmica (auto-crop)
- [x] Regenerar todos os ícones PWA com a logo preenchendo bem o ícone

## Fase 38 — Correção dos Botões na Tela de Usuários
- [x] Corrigir botão de seleção de cargo (não funciona) — substituído Alert nativo por RoleModal customizado
- [x] Corrigir botão de ver senha (não funciona) — substituído Alert.prompt (iOS-only) por PasswordModal cross-platform
- [x] Corrigir botão de excluir/ativar conta (não funciona) — substituído Alert.alert por ConfirmModal customizado

## Fase 39 — Correções e Melhorias no Acesso do Promotor

### Registrar Ponto
- [x] Corrigir botão "Registrar Entrada" (não funciona)
- [x] Adicionar seleção de loja ao registrar entrada (apenas lojas vinculadas ao promotor)
- [x] Adicionar captura/envio de foto do ponto eletrônico ao registrar entrada
- [x] Adicionar botão "Registrar Saída" com captura de foto
- [x] Preencher automaticamente a loja na saída com base na entrada mais recente

### Fotos
- [x] Corrigir botões de galeria e câmera (não funcionam)
- [x] Adicionar seleção de marca ao enviar fotos
- [x] Adicionar seleção de loja ao enviar fotos (apenas lojas vinculadas ao promotor)

### Lojas (Gestor/Master)
- [x] Adicionar campo de promotor vinculado ao criar loja (seleção entre contas de promotor)
- [x] Permitir editar o promotor vinculado a uma loja existente
- [x] Filtrar lojas exibidas ao promotor: mostrar apenas as lojas vinculadas a ele

### Backend/Banco
- [x] Adicionar coluna promoter_id na tabela de lojas
- [x] Adicionar coluna photo_url na tabela de registros de ponto
- [x] Endpoint de lojas filtrado por promotor logado
- [x] Endpoint listPromoterUsers para seleção de promotor nas lojas

## Fase 40 — Remoção de Geolocalização e Correção do Seletor de Promotor

### Remoção de Geolocalização
- [x] Remover GPS/localização da tela de Registrar Ponto (clock.tsx)
- [x] Remover GPS/localização da tela de Fotos (photos.tsx)
- [x] Remover mapa e campos de coordenadas da tela de Lojas (stores.tsx)
- [x] Remover validação de raio e alertas de geo do backend (routers.ts)
- [x] Remover campos latitude/longitude/accuracy/distanceFromStore do endpoint timeEntries.create
- [x] Remover campos latitude/longitude do endpoint photos.upload
- [x] Remover router geoAlerts do backend

### Correção do Seletor de Promotor
- [x] Investigar bug: ao selecionar um promotor na tela de lojas, todos ficam selecionados
- [x] Corrigir lógica de seleção: usar user.id em vez de user.userId

## Fase 41 — Correção do Botão de Alteração de Função (Master/Usuários)
- [x] Investigar por que o botão de alterar função (promotor → gestor) não salva a mudança
- [x] Causa raíz: na Web, getSessionToken() retornava null (usava cookie) e apiCall não enviava Authorization header
- [x] Correção: auth.ts agora usa localStorage na Web para getSessionToken/setSessionToken/removeSessionToken
- [x] Correção: api.ts agora envia Authorization header em todas as plataformas (Web + nativo)

## Fase 42 — Correção dos Botões de Usuários e Remoção de Geofencing das Configurações
- [x] Investigar e corrigir botão de alterar cargo — causa: bcrypt rounds=10 travava o servidor; reduzido para rounds=6
- [x] Investigar e corrigir botão de ver/alterar senha — mesma causa do bcrypt; corrigido
- [x] Investigar e corrigir botão de ativar/desativar conta — funcionava; confirmado com testes diretos na API
- [x] Remover raio de geofencing da tela de Configurações (settings.tsx)
- [x] Remover opção de alerta de geofencing da tela de Notificações (settings.tsx)

## Fase 43 — Lojas, Tab Bar e Painel do Promotor
- [x] Corrigir bug: lojas vinculadas ao promotor não aparecem — causa: listForPromoter usava ctx.user.id (OAuth) em vez do appUserId; corrigido com getAppUserId()
- [x] Reordenar tab bar: Meu Perfil é agora o último botão da esquerda para direita
- [x] Adicionar seção "Minhas Lojas" no painel do promotor (abaixo de Ações Rápidas)

## Fase 45 — Card de Fotos Recusadas no Perfil do Promotor
- [x] Adicionar totalRejectedPhotos ao endpoint promoterProfile.myStats (db.ts + interface)
- [x] Adicionar card "Fotos Recusadas" (vermelho) ao lado de "Fotos Aprovadas" (verde) na tela de perfil do promotor

## Fase 46 — Diagnóstico Definitivo dos Botões de Usuários (Master)
- [ ] Testar endpoint de redefinição de senha via API com token master válido
- [ ] Testar endpoint de alteração de tipo de conta via API com token master válido
- [ ] Testar endpoint de excluir/desativar conta via API com token master válido
- [ ] Corrigir os problemas encontrados

## Fase 46 — Diagnóstico Definitivo dos Botões de Usuários (Master)
- [x] Testado: backend funciona corretamente (todos os 3 endpoints retornam 200)
- [x] Causa raiz: na Web, useAuth usava OAuth cookie em vez de token customizado do localStorage
- [x] Correção: useAuth agora verifica token customizado (localStorage) primeiro via /api/auth/app-me
- [x] Correção: login.tsx já salva token em todas as plataformas (sem condição Platform.OS)
- [x] TypeScript: zero erros após as mudanças

## Fase 47 — Diagnóstico Final dos Botões de Usuários (Master)
- [ ] Abrir app no browser e capturar erros do console ao clicar nos botões
- [ ] Identificar e corrigir a causa raiz definitiva

## Fase — Correções na Tela de Usuários Master
- [x] Adicionar mensagem de sucesso (toast/banner) após alterar cargo, redefinir senha e ativar/desativar conta
- [x] Corrigir persistência de mudança de cargo: usuário alterado deve ver novo cargo ao fazer login
- [x] Exibir cargo e status atual de forma mais clara na lista de usuários

## Fase — Correções nas Telas de Gestor/Master (Rodada 2)
- [x] Corrigir erro "Uncaught Error" ao tentar enviar arquivo
- [x] Corrigir lista de promotores na tela Equipe (não atualiza com novos promotores)
- [x] Corrigir scroll nos filtros da aba Fotos dos Promotores
- [x] Corrigir filtro "Filtrar por Promotor" na aba Relatório Mensal
- [x] Excluir aba "Assinar Relatório"
- [x] Corrigir filtro de promotores no Dashboard de PDVs
- [x] Corrigir filtro de promotores no Ranking de Promotores
- [x] Adicionar botões Aprovar/Rejeitar ao abrir foto na aba Fotos dos Promotores
- [x] Impactar score do promotor com aprovação/rejeição de fotos
- [x] Exibir status de aprovação/rejeição no perfil do promotor e nos filtros existentes

## Fase — Swipe Horizontal entre Fotos no Modal
- [x] Implementar navegação por swipe horizontal entre fotos no modal de preview (manager-photos.tsx)
- [x] Exibir indicador de posição (ex: "3 / 12") no topo do modal
- [x] Manter botões Aprovar/Rejeitar na parte inferior durante a navegação

## Fase — Melhorias no Modal de Fotos
- [x] Zoom com pinch (dois dedos) na foto aberta no modal
- [x] Painel de informações (promotor, loja, data, marca) que aparece/some ao tocar na foto
- [x] Modo de seleção múltipla na grade de fotos com aprovação/rejeição em lote

## Fase — Melhorias no Modal de Fotos (Gestor/Master)
- [x] Zoom com pinch (dois dedos) e double-tap para ampliar/reduzir foto no modal
- [x] Painel de informações toggle (toque no botão "i") com promotor, loja, marca e data
- [x] Painel some ao navegar para outra foto
- [x] Seleção múltipla em lote (long press ou botão no header) com aprovação/rejeição em lote
- [x] Backend: getPhotosWithDetails (JOIN com brands, stores, appUsers)
- [x] Backend: updateStatusBatch (aprovar/rejeitar múltiplas fotos)

## Fase — Badge de Fotos Pendentes
- [x] Badge vermelho com contador de fotos pendentes no ícone da aba Fotos (Gestor/Master)

## Fase — Notificação Push para Gestor/Master (Nova Foto)
- [x] Disparar push para todos os gestores/masters quando promotor fizer upload de foto
- [x] Notificação com título, nome do promotor e marca da foto
- [x] Salvar notificação no histórico (tabela notifications)

## Fase — Exclusão e Inativação de Contas (Master)
- [x] Backend: deleteUserAccount — apaga conta e todos os dados vinculados (fotos, arquivos, ponto, solicitações, relatórios, perfil, tokens, notificações)
- [x] Backend: bloquear login de contas com status "inactive" no custom-auth.ts
- [x] Backend: endpoint DELETE /api/master/users/:id com verificação de permissão Master
- [x] Frontend: botão Excluir com confirmação na tela master-users.tsx
- [x] Frontend: botão Ativar/Inativar separados (Ativar verde, Inativar vermelho) na tela master-users.tsx
- [x] Frontend: modal de confirmação de exclusão com aviso de ação irreversível

## Fase — Painel Web Desktop (Gestor/Master)
- [x] Estrutura base: Next.js + Tailwind CSS, autenticação com mesmo backend
- [x] Layout com sidebar colapsável, header e área de conteúdo
- [x] Dashboard: KPIs, gráficos de desempenho, resumo da equipe
- [x] Fotos: grade com seleção múltipla, aprovação/rejeição em lote, download individual e em lote (ZIP)
- [x] Equipe: lista de promotores com detalhes e navegação para perfil
- [x] Ranking de promotores com score e métricas
- [x] Dashboard de PDVs com ranking e filtros
- [x] Relatório mensal com gráficos e exportação
- [x] Usuários: gestão de contas (somente Master) com ativar/inativar/excluir
- [x] Configurações do gestor
- [x] Link separado do PWA mobile

## Bug — Status de Contas no Painel Desktop
- [x] Investigar por que painel desktop mostra todas as contas como "Inativas" enquanto PWA mostra como "Ativas"
- [x] Corrigir a leitura/interpretação do campo de status no frontend do painel web

## Bug — Status de Contas no Painel Desktop
- [x] Corrigir campo isActive → active na página de Usuários do painel desktop
- [x] Corrigir Service Worker para usar Network-first em assets Next.js (evitar cache stale)

## Fase 16 — Remoção de Geolocalização e Logo no Portal Web

- [x] Remover coluna "Localização" e dados de GPS da tela de Equipe (portal web)
- [x] Remover coluna "Localização" e dados de GPS da tela de Controle de Ponto (portal web)
- [x] Remover mapa/coordenadas GPS da tela de PDVs (portal web)
- [x] Remover campo de mapa interativo do cadastro/edição de loja (portal web)
- [x] Remover alertas de geofencing e seção de geo-alertas do Dashboard (portal web)
- [x] Remover página de Alertas de geolocalização (portal web) se existir
- [x] Remover referências a GPS/coordenadas em Visitas por PDV (portal web)
- [x] Aplicar logo da Dinâmica Corretora no header do portal web
- [x] Aplicar logo da Dinâmica Corretora na tela de login do portal web
- [x] Atualizar favicon do portal web com a logo da Dinâmica

## Fase 17 — Upload de Arquivos, Notificações e Exclusão

- [x] Corrigir bug de upload de arquivo no PWA (trava sem feedback após clicar em Enviar)
- [x] Adicionar notificação de confirmação no PWA após envio de arquivo bem-sucedido
- [x] Implementar exclusão de materiais pelo gestor/master (ocultar para promotor)
- [x] Implementar exclusão de arquivos pelo gestor/master (ocultar para promotor)

## Fase 18 — Visualizador de PDF do Ranking

- [x] Adicionar botão de fechar no visualizador de PDF do ranking
- [x] Adicionar botão de salvar/compartilhar o PDF do ranking

## Fase 19 — Correção Definitiva de Upload e PDF

- [x] Diagnosticar e corrigir definitivamente o bug de upload de arquivos no PWA (httpBatchLink → httpLink)
- [x] Corrigir visualizador de PDF do ranking (botões fechar e salvar)

## Fase 20 — Perfil do Promotor na Aba Equipe

- [x] Corrigir bug "Promotor não encontrado" ao selecionar promotor na aba Equipe
- [x] Exibir média de horas trabalhadas no mês atual no perfil do promotor
- [x] Exibir horas trabalhadas na última semana (atualizado somente no domingo)
- [x] Exibir fotos enviadas no mês no perfil do promotor
- [x] Corrigir upload de arquivos no PWA (modal não abre ou trava)
- [x] Corrigir visualizador de PDF do ranking (botões fechar e salvar)

## Fase 21 — Correção do Cálculo de Média de Horas

- [x] Corrigir cálculo de média de horas: soma das horas ÷ dias efetivamente trabalhados (excluindo domingos e dias sem registro)

## Fase 22 — Ajuste do Cálculo de Média de Horas

- [x] Excluir sábados e domingos do cálculo de média de horas por dia trabalhado (considerar apenas segunda a sexta)

## Fase 23 — Média Diária no Score do Promotor

- [x] Adicionar campo "Peso — Média Diária de Horas" nas Configurações do app
- [x] Atualizar o cálculo do score para incluir a média diária (referência 8h/dia, bônus proporcional acima, penalidade abaixo)
- [x] Atualizar a exibição da composição do score no perfil do promotor

## Bug — Upload de Arquivos por Marca (PWA)

- [x] Corrigir definitivamente o upload de arquivos por marca no PWA (ainda não funciona após tentativas anteriores)

## Bug — Exclusão de Arquivos e Materiais no PWA

- [x] Corrigir botão de exclusão de arquivos no PWA (gestor/master)
- [x] Corrigir botão de exclusão de materiais no PWA (gestor/master)
- [x] Investigar causa raiz (token de autenticação, endpoint, permissão)

## Fase 24 — Notificação de Média Diária Baixa

- [x] Adicionar campo `dailyHoursAlertThreshold` nas configurações (limiar em horas, padrão 6)
- [x] Migrar banco de dados para o novo campo
- [x] Criar job/endpoint no servidor que verifica promotores com média abaixo do limiar e envia push notification
- [x] Adicionar controle do limiar na tela de Configurações do app
- [x] Adicionar botão "Verificar agora" na tela de Configurações para disparar a verificação manualmente

## Fase 25 — Exportação de Relatório com Média Diária

- [x] Adicionar coluna "Méd. Diária (h)" ao relatório PDF de ranking mensal
- [x] Adicionar coluna "Méd. Diária (h)" ao relatório Excel/CSV de ranking mensal
- [x] Incluir "Dias Úteis Trabalhados" como coluna adicional nos relatórios

## Fase 26 — Correções Pré-Publicação

- [x] Corrigir "Uncaught Error" ao aprovar/recusar solicitação de material
- [x] Corrigir exclusão de materiais (bug persistente)
- [x] Corrigir exclusão de arquivos (bug persistente)
- [x] Limpar registros de fotos do banco de dados antes da publicação
- [x] Limpar registros de ponto do banco de dados antes da publicação

## Fase 27 — Correção de Permissão de Arquivos

- [x] Corrigir bug: promotor conseguia deletar e fazer upload de arquivos (só gestor/master deve poder)
- [x] Adicionar verificação de appRole nas procedures stockFiles.delete e stockFiles.upload
- [x] Adicionar função getAppUserById no db.ts para verificar role do usuário

## Fase 28 — Filtro de Mês/Ano nas Fotos

- [x] Substituir filtro de data (últimos 30 dias) por seletor de mês + ano na tela de fotos do gestor/master
- [x] Exibir meses dos últimos 3 anos no dropdown (do mais recente ao mais antigo)
- [x] Chip do filtro mostra o mês/ano selecionado (ex: "Mar 2026")
- [x] Ao limpar filtros, resetar mês e ano
- [x] Ordenação das fotos sempre da mais recente para a mais antiga

## Fase 29 — Melhorias na Tela de Fotos e Filtros

- [x] Substituir setas de navegação por dropdown de mês único ou período (3/6/12 meses ou personalizado) no Ranking de Promotores
- [x] Substituir setas de navegação por dropdown de mês único ou período (3/6/12 meses ou personalizado) nos Relatórios
- [x] Adicionar contador de fotos por status (pendentes, aprovadas, rejeitadas) no cabeçalho da tela de fotos
- [x] Adicionar botão de download de fotos para o dispositivo (individual e em lote)

## Fase 30 — Novo Tipo de Conta: Supervisor

- [x] Adicionar role 'supervisor' no schema do banco de dados (app_users.appRole)
- [x] Atualizar autenticação para reconhecer e retornar o role 'supervisor'
- [x] Atualizar a API REST de patch de role para aceitar 'supervisor'
- [x] Criar navegação exclusiva para o Supervisor (tab única: Fotos)
- [x] Criar tela de fotos do Supervisor (visualizar, filtrar, baixar — sem aprovar/recusar)
- [x] Atualizar a tela de usuários do Master para exibir e promover para 'Supervisor'
- [x] Exibir badge/label "Supervisor" na listagem de usuários do Master
## Fase 31 — Upload de Imagem de Produto nos Materiais
- [x] Adicionar campo de imagem ao formulário de criação de material (gestor/master)
- [ ] Adicionar campo de imagem ao formulário de edição de material (gestor/master)
- [x] Criar endpoint de upload de imagem de material no backend (REST multipart)
- [x] Exibir imagem do produto na listagem de materiais
- [x] Exibir imagem do produto no detalhe/modal do material

## Fase 32 — Correções de UI (Supervisor + Imagem de Material)

- [x] Corrigir modal de cargo: botão Supervisor não aparece (layout espremido com 3 botões em linha)
- [x] Corrigir campo de imagem no modal de criação de material (não aparece para gestor/master)
