# Design do Aplicativo — Promoter Management
## Gestão de Equipe de Promotores

---

## 1. IDENTIDADE VISUAL

### Paleta de Cores
- **Primary (Azul Corporativo):** `#1A56DB` — ações principais, botões, destaques
- **Secondary (Verde Sucesso):** `#0E9F6E` — confirmações, status ativo, entrada de ponto
- **Danger (Vermelho Alerta):** `#E02424` — alertas, saída de ponto, erros
- **Warning (Âmbar):** `#D97706` — avisos, pendências, atenção
- **Background Light:** `#F9FAFB` — fundo claro
- **Background Dark:** `#111827` — fundo escuro
- **Surface Light:** `#FFFFFF` — cards e superfícies
- **Surface Dark:** `#1F2937` — cards e superfícies escuras
- **Foreground Light:** `#111827` — texto principal
- **Foreground Dark:** `#F9FAFB` — texto principal escuro
- **Muted Light:** `#6B7280` — texto secundário
- **Muted Dark:** `#9CA3AF` — texto secundário escuro
- **Border Light:** `#E5E7EB` — bordas
- **Border Dark:** `#374151` — bordas escuras

### Tipografia
- **Títulos:** System font bold, 24-28px
- **Subtítulos:** System font semibold, 18-20px
- **Corpo:** System font regular, 14-16px
- **Legenda:** System font regular, 12px

### Iconografia
- SF Symbols (iOS) / Material Icons (Android)
- Tamanho padrão: 24px para navegação, 28px para ações principais

---

## 2. LISTA DE TELAS

### Fluxo de Autenticação
1. **Splash Screen** — Logo + loading
2. **Login Screen** — Email, senha, botão entrar
3. **Forgot Password Screen** — Recuperação de senha

### Telas do Promotor
4. **Promoter Home** — Botões das 5 marcas + barra inferior
5. **Brand Screen (Sinhá / LeitBom / Paraná / Emana / UltraPlas)** — Abas: Fotos + Estoques
6. **Photos Tab** — Galeria de fotos + botão tirar/anexar foto
7. **Photo Capture Screen** — Câmera + metadados automáticos
8. **Stock Tab** — Lista de arquivos enviados pelo gestor
9. **Materials PDV Screen** — Lista de materiais por marca + solicitar
10. **Material Request Screen** — Formulário de solicitação
11. **Time Entry Screen** — Registro de ponto (entrada/saída) com GPS
12. **Profile Screen** — Dados do promotor + histórico

### Telas do Gestor
13. **Manager Home** — Botões das 5 marcas + barra inferior gestor
14. **Manager Brand Screen** — Galeria de fotos com filtros
15. **Requests Screen** — Lista de solicitações de materiais
16. **Send Screen** — Envio de arquivos + cadastro de materiais
17. **Time Control Screen** — Controle de ponto dos promotores
18. **Promoter Detail Screen** — Histórico individual do promotor
19. **Alerts Screen** — Alertas de geolocalização e inconsistências

---

## 3. CONTEÚDO E FUNCIONALIDADES POR TELA

### Splash Screen
- Logo centralizado com animação de fade-in
- Indicador de carregamento
- Verificação de sessão ativa

### Login Screen
- Logo no topo
- Campo email com validação
- Campo senha com toggle de visibilidade
- Botão "Entrar" (primary)
- Link "Esqueci minha senha"
- Indicador de loading durante autenticação

### Promoter Home
- Header: "Olá, [Nome]" + ícone de perfil
- Grid 2x3 com botões das marcas (ícone + nome + cor da marca)
- Barra inferior: Home | Materiais PDV | Registro de Ponto
- Badge de notificação nos materiais se houver pendências

### Brand Screen
- Header com nome da marca + cor da marca
- Abas: "Fotos" | "Estoques"
- Aba Fotos: Grid de fotos enviadas + FAB para nova foto
- Aba Estoques: Lista de arquivos com ícone de tipo, nome, data

### Time Entry Screen
- Card de status atual (dentro/fora do raio)
- Mapa mostrando posição atual vs. loja
- Botão grande "REGISTRAR ENTRADA" (verde) ou "REGISTRAR SAÍDA" (vermelho)
- Histórico do dia atual
- Indicador de GPS ativo/inativo

### Materials PDV Screen
- Filtro por marca (chips horizontais)
- Lista de materiais com foto, nome, quantidade disponível
- Botão "Solicitar" em cada item
- Badge de status em solicitações pendentes

### Manager Home
- Header: "Painel Gestor" + ícone de perfil
- Grid 2x3 com botões das marcas
- Barra inferior: Home | Solicitações | Envio | Controle de Ponto
- Badge de notificação nas solicitações pendentes

### Manager Brand Screen
- Header com nome da marca
- Filtros: Data inicial/final, Loja, Promotor
- Grid de fotos com metadados visíveis
- Tap na foto abre detalhes completos

### Requests Screen
- Lista de solicitações com status colorido
- Filtros: Status, Prioridade, Promotor
- Swipe para aprovar/rejeitar
- Botão de confirmar entrega

### Time Control Screen
- Lista de promotores com status do dia
- Para cada promotor: nome, horas trabalhadas, status (ativo/ausente/alerta)
- Tap abre histórico detalhado
- Filtro por data
- Badge de alerta para inconsistências

---

## 4. FLUXOS PRINCIPAIS

### Fluxo 1: Login e Redirecionamento
```
Splash → Verificar sessão → 
  Se logado como Promotor → Promoter Home
  Se logado como Gestor → Manager Home
  Se não logado → Login Screen
```

### Fluxo 2: Registro de Ponto (Promotor)
```
Promoter Home → Tab "Registro de Ponto" → 
Verificar GPS ativo → Validar raio 5km → 
Botão Entrada/Saída → Confirmar → 
Salvar com metadados → Feedback visual
```

### Fluxo 3: Envio de Foto (Promotor)
```
Promoter Home → Selecionar Marca → Aba Fotos → 
FAB "Nova Foto" → Câmera/Galeria → 
Capturar metadados automáticos → Preview → 
Confirmar envio → Upload → Feedback
```

### Fluxo 4: Solicitação de Material (Promotor)
```
Tab "Materiais PDV" → Filtrar por marca → 
Selecionar material → "Solicitar" → 
Formulário (quantidade, notas) → Confirmar → 
Notificação ao gestor → Feedback
```

### Fluxo 5: Aprovação de Solicitação (Gestor)
```
Manager Home → Tab "Solicitações" → 
Ver lista pendente → Selecionar solicitação → 
Aprovar/Rejeitar → Confirmar entrega → 
Sistema registra destino → Notificação ao promotor
```

### Fluxo 6: Controle de Ponto (Gestor)
```
Manager Home → Tab "Controle de Ponto" → 
Ver lista de promotores → Filtrar por data → 
Selecionar promotor → Ver histórico detalhado → 
Auditoria de inconsistências
```

---

## 5. COMPONENTES REUTILIZÁVEIS

- **BrandCard** — Card com cor da marca, ícone e nome
- **PhotoCard** — Miniatura de foto com metadados
- **MaterialCard** — Card de material com foto, nome, quantidade
- **RequestCard** — Card de solicitação com status colorido
- **TimeEntryCard** — Card de registro de ponto com horário e loja
- **StatusBadge** — Badge colorido para status
- **FilterBar** — Barra de filtros com chips
- **LoadingOverlay** — Overlay de carregamento
- **AlertCard** — Card de alerta com ícone e ação
- **GPSStatusIndicator** — Indicador de status do GPS

---

## 6. PADRÕES DE INTERAÇÃO

- **Haptic feedback** em ações principais (registro de ponto, envio de foto)
- **Pull-to-refresh** em todas as listas
- **Infinite scroll** em galerias de fotos
- **Swipe actions** em listas de solicitações (aprovar/rejeitar)
- **Long press** em fotos para ver detalhes
- **Skeleton loading** durante carregamento de dados
- **Toast notifications** para feedback de ações
- **Bottom sheet** para formulários rápidos

---

## 7. ACESSIBILIDADE

- Contraste mínimo 4.5:1 para textos
- Tamanho mínimo de toque: 44x44 pontos
- Labels de acessibilidade em todos os elementos interativos
- Suporte a Dynamic Type (iOS)
- Suporte a TalkBack (Android)

---

## 8. PERFORMANCE

- Lazy loading de imagens com placeholder
- Compressão de fotos antes do upload (máx. 1MB)
- Cache de dados com TanStack Query
- Paginação em todas as listas
- Sincronização em background

---

**Status:** Design aprovado — pronto para implementação
