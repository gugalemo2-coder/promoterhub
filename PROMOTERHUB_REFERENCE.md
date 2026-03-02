# PromoterHub — Documento de Referência

> **Última atualização:** 02/03/2026  
> **Mantido por:** Fernanda (agente Manus)  
> Este documento descreve a arquitetura completa do app, os ambientes de produção e o processo exato para implementar correções e novas funcionalidades.

---

## 1. Visão Geral do Sistema

O **PromoterHub** é um sistema de gestão de equipe de promotores de vendas. Ele é composto por:

| Componente | Tecnologia | URL de Produção |
|---|---|---|
| **Frontend (App)** | React Native + Expo (web export) | https://promoterhub.vercel.app |
| **Backend (API)** | Node.js + tRPC + Express | https://api-production-bbc3e.up.railway.app |
| **Banco de Dados** | PostgreSQL (Railway) | Gerenciado pelo Railway |
| **Armazenamento de Arquivos** | S3-compatible (Railway) | Integrado ao backend |
| **Repositório GitHub** | gugalemo2-coder/promoterhub | https://github.com/gugalemo2-coder/promoterhub |

---

## 2. Perfis de Usuário (Roles)

O sistema tem quatro perfis com permissões distintas:

| Role | Descrição | Acesso |
|---|---|---|
| `master` | Dono do sistema (Gustavo) | Acesso total — gerencia usuários, roles, marcas, lojas, relatórios |
| `manager` | Gestor | Aprova fotos, materiais, visualiza relatórios e equipe |
| `supervisor` | Supervisor | Aprova/rejeita fotos dos promotores com filtros avançados |
| `promoter` | Promotor de campo | Registra ponto, envia fotos, solicita materiais, acessa arquivos |

O role padrão ao criar uma conta é `promoter`. Apenas o `master` pode alterar roles via tela de usuários.

---

## 3. Telas do App

### Telas Comuns (todos os roles)
- `app/login.tsx` — Tela de login
- `app/register.tsx` — Cadastro de nova conta
- `app/role-select.tsx` — Seleção de perfil após login
- `app/(tabs)/my-profile.tsx` — Perfil do usuário logado
- `app/(tabs)/notifications.tsx` — Notificações
- `app/(tabs)/settings.tsx` — Configurações do app

### Telas do Promotor
- `app/(tabs)/index.tsx` — Início (dashboard do promotor)
- `app/(tabs)/clock.tsx` — Registro de ponto (entrada/saída)
- `app/(tabs)/photos.tsx` — Envio de fotos de PDV
- `app/(tabs)/materials.tsx` — Catálogo e solicitação de materiais
- `app/(tabs)/files.tsx` — Arquivos e materiais de apoio
- `app/(tabs)/more-menu.tsx` — Menu adicional

### Telas do Gestor/Master
- `app/(tabs)/manager-photos.tsx` — Aprovação de fotos
- `app/(tabs)/team.tsx` — Gestão da equipe de promotores
- `app/(tabs)/stores.tsx` — Gestão de lojas
- `app/(tabs)/brands.tsx` — Gestão de marcas
- `app/(tabs)/reports.tsx` — Relatórios
- `app/(tabs)/alerts.tsx` — Alertas e avisos
- `app/(tabs)/store-dashboard.tsx` — Dashboard por loja
- `app/(tabs)/store-visits.tsx` — Visitas às lojas
- `app/(tabs)/promoter-ranking.tsx` — Ranking de promotores
- `app/(tabs)/sign-report.tsx` — Assinar relatório
- `app/(tabs)/master-users.tsx` — Gerenciar usuários (apenas master)
- `app/(tabs)/offline-queue.tsx` — Fila de ações offline

### Telas do Supervisor
- `app/(tabs)/supervisor-photos.tsx` — Painel de aprovação de fotos com filtros por marca, promotor e loja

### Telas de Detalhe (fora das tabs)
- `app/promoter-detail.tsx` — Detalhe de um promotor

---

## 4. Backend — Módulos da API (tRPC)

Todos os endpoints usam tRPC com autenticação via sessão. A URL base é `https://api-production-bbc3e.up.railway.app`.

| Módulo | Descrição |
|---|---|
| `auth` | Login, logout, sessão, registro, troca de role |
| `brands` | CRUD de marcas |
| `stores` | CRUD de lojas, vinculação de promotores |
| `timeEntries` | Registro de ponto (entrada/saída), histórico |
| `photos` | Upload, listagem, aprovação/rejeição de fotos |
| `materials` | CRUD de materiais do catálogo |
| `materialRequests` | Solicitações de material (criar, aprovar, rejeitar, entregar) |
| `stockFiles` | Upload e listagem de arquivos de estoque |
| `pushTokens` | Registro de tokens para notificações push |
| `reports` | Geração de relatórios |
| `notifications` | Listagem e marcação de notificações |
| `brandsAdmin` | Administração avançada de marcas |
| `storePerformance` | Métricas de desempenho por loja |
| `promoterProfile` | Perfil detalhado do promotor |
| `promoterRanking` | Ranking de promotores por métricas |
| `storeVisits` | Registro de visitas às lojas |
| `promoterDetail` | Dados detalhados de um promotor específico |
| `settings` | Configurações gerais do sistema |

---

## 5. Persistência de Dados

O app usa duas camadas de persistência:

| Camada | Tecnologia | Uso |
|---|---|---|
| **Servidor** | PostgreSQL via Railway | Dados permanentes, sincronizados entre dispositivos |
| **Local (dispositivo)** | `AsyncStorage` | Estado temporário offline (ex: entrada de ponto aberta, storeId) |

### Chaves do AsyncStorage importantes
- `open_entry` — `"true"/"false"` — indica se há uma entrada de ponto aberta
- `open_entry_store_id` — ID da loja da entrada aberta (para registrar saída mesmo offline)

---

## 6. Infraestrutura de Deploy

### Frontend (Vercel)
- **Plataforma:** Vercel
- **Team ID:** `gugalemo2-9276s-projects`
- **Project:** `promoterhub`
- **URL de produção:** https://promoterhub.vercel.app
- **Build command:** `npx expo export --platform web --clear`
- **Output directory:** `dist`

> **IMPORTANTE:** O Vercel **não detecta automaticamente** os commits feitos pelo agente Manus via GitHub. O deploy deve ser disparado manualmente via API do Vercel (ver seção 7).

### Backend (Railway)
- **Plataforma:** Railway
- **URL:** https://api-production-bbc3e.up.railway.app
- **Deploy:** Automático via push no repositório Railway (configurado internamente)

---

## 7. Processo de Deploy — Passo a Passo

### Para implementar uma correção ou nova funcionalidade:

**Passo 1 — Editar os arquivos**
```
Editar os arquivos em /home/ubuntu/promoter_management/
```

**Passo 2 — Verificar TypeScript**
```bash
cd /home/ubuntu/promoter_management && npx tsc --noEmit
```

**Passo 3 — Commit e push para o GitHub**
```bash
cd /home/ubuntu/promoter_management
git add <arquivos>
git commit -m "descrição da mudança"
git push github HEAD:main
```

**Passo 4 — Iniciar deploy no Vercel via API**
```bash
SHA=$(git rev-parse HEAD)
curl -s -X POST "https://api.vercel.com/v13/deployments?teamId=gugalemo2-9276s-projects" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"promoterhub\",\"gitSource\":{\"type\":\"github\",\"repoId\":\"1168037134\",\"ref\":\"main\",\"sha\":\"$SHA\"}}"
```
> Salvar o `id` do deploy retornado (ex: `dpl_XXXXX`)

**Passo 5 — Monitorar o build**
```bash
# Repetir até STATUS = READY (leva 3-5 minutos)
curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v13/deployments/dpl_XXXXX?teamId=gugalemo2-9276s-projects" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('readyState'))"
```

**Passo 6 — Promover para produção**
```bash
curl -s -X POST "https://api.vercel.com/v2/deployments/dpl_XXXXX/aliases?teamId=gugalemo2-9276s-projects" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"alias": "promoterhub.vercel.app"}'
```

**Passo 7 — Confirmar em produção**
```bash
BUNDLE=$(curl -s "https://promoterhub.vercel.app" | grep -o '_expo/static/js/web/entry-[a-f0-9]*\.js')
curl -s "https://promoterhub.vercel.app/$BUNDLE" | grep -o "TEXTO_DA_FEATURE" | head -3
```

---

## 8. Variáveis de Ambiente

As variáveis de ambiente são gerenciadas pelo sistema Manus e **não devem ser editadas manualmente**. As principais são:

| Variável | Descrição |
|---|---|
| `VERCEL_TOKEN` | Token de acesso à API do Vercel |
| `EXPO_PUBLIC_API_BASE_URL` | URL do backend Railway (produção) |
| `EXPO_PUBLIC_APP_ID` | ID do app no sistema de autenticação |
| `DATABASE_URL` | String de conexão com o PostgreSQL |

---

## 9. Arquivos Críticos do Projeto

| Arquivo | Descrição |
|---|---|
| `app/(tabs)/clock.tsx` | Registro de ponto — lógica de entrada/saída e persistência |
| `app/(tabs)/photos.tsx` | Envio de fotos — modal de upload com limpeza de estado |
| `app/(tabs)/materials.tsx` | Materiais — catálogo e filtros por marca |
| `app/(tabs)/supervisor-photos.tsx` | Painel do supervisor — aprovação com filtros |
| `server/routers.ts` | Todos os endpoints da API tRPC |
| `server/db.ts` | Queries do banco de dados |
| `server/schema.ts` | Schema do banco (tabelas e colunas) |
| `vercel.json` | Configuração de build e rotas do Vercel |
| `todo.md` | Histórico de todas as features e bugs |

---

## 10. Histórico de Fases de Desenvolvimento

| Fase | Descrição |
|---|---|
| Fases 1–37 | Desenvolvimento inicial do app completo |
| Fase 38 | Painel do Supervisor, welcome banner, filtros avançados, download de fotos |
| Fase 39 | Correção: modal de fotos, seleção de loja, persistência de ponto |
| Fase 40 | Correção: promotor não conseguia registrar saída (storeId no AsyncStorage) |
| Fase 41 | Correção: botão de ponto não voltava para "Registrar Entrada" após saída |
| Fase 42 | Correção: chips de filtro de marca com altura exagerada em Materiais |

---

## 11. Observações Importantes

- O **Vercel não detecta automaticamente** os commits do agente Manus. Sempre usar a API do Vercel para disparar o deploy (Passo 4 acima).
- O **Railway detecta automaticamente** os pushes e faz redeploy do backend.
- O `VERCEL_TOKEN` está disponível como variável de ambiente no sandbox do Manus.
- O `repoId` do GitHub é `1168037134` (fixo para o repositório `gugalemo2-coder/promoterhub`).
- O `teamId` do Vercel é `gugalemo2-9276s-projects` (fixo).
- Sempre verificar TypeScript antes de fazer o commit para evitar builds com erro.
- O bundle do Expo é minificado — strings literais (textos visíveis no app) podem ser usadas para confirmar que a feature está no bundle de produção.
