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
