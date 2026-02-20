# Análise de Requisitos e Validação de Arquitetura
## Sistema de Gestão de Equipe de Promotores

**Data:** 20 de Fevereiro de 2026  
**Status:** Fase 1 - Análise e Validação

---

## 1. RESUMO EXECUTIVO

Sistema mobile multiplataforma (iOS/Android) para gestão de equipe de promotores com funcionalidades de:
- Registro de ponto com geolocalização
- Envio de fotos de PDV
- Controle de materiais
- Distribuição de arquivos
- Painel gestor com monitoramento automático inteligente

---

## 2. REQUISITOS FUNCIONAIS

### 2.1 Autenticação e Perfis
- **Dois perfis de usuário**: Promotor e Gestor
- Autenticação segura com criptografia de senha
- Permissões baseadas em perfil
- Sessão persistente com token JWT

### 2.2 Funcionalidades do Promotor

#### Home
- Botões de acesso rápido para 5 marcas: Sinhá, LeitBom, Paraná, Emana, UltraPlas
- Barra inferior fixa com navegação: Home, Materiais PDV, Registro de Ponto

#### Registro de Ponto
- **Entrada/Saída com geolocalização**
  - Validação obrigatória de GPS ativo
  - Raio de validação: 5km da loja
  - Salvamento de: data, hora, coordenadas (latitude/longitude), loja
  - Alerta automático ao gestor se promotor sair do raio após entrada

#### Marcas (Sinhá, LeitBom, Paraná, Emana, UltraPlas)
- **Aba Fotos**
  - Captura de foto via câmera
  - Anexação de foto da galeria
  - Metadados salvos: data, hora, localização, loja (identificada automaticamente via GPS)

- **Aba Estoques**
  - Visualização de arquivos enviados pelo gestor relacionados à marca

#### Materiais PDV
- Visualização de materiais por marca
- Solicitação de material (gera notificação ao gestor)
- Avaliação de qualidade recebida

### 2.3 Funcionalidades do Gestor

#### Home
- Botões para 5 marcas
- Cada botão abre galeria de fotos enviadas

#### Filtros Obrigatórios
- Data inicial e final
- Loja
- Promotor

#### Solicitações
- Visualização de pedidos de materiais dos promotores
- Confirmação de entrega
- Registro automático de destino do material

#### Envio
- **Envio de arquivo de estoque**
  - Seleção de marca
  - Anexação de arquivo

- **Cadastro de material**
  - Nome, foto opcional, quantidade opcional
  - Controle automático de estoque se quantidade informada

#### Controle de Ponto
- Lista de promotores com horários do dia
- Visualização de histórico
- Filtro por datas
- Auditoria

### 2.4 Monitoramento Automático Inteligente
- Análise automática de jornada diária
- Cálculo de horas trabalhadas
- Detecção de inconsistências
- Alerta automático ao gestor se carga horária abaixo do esperado

---

## 3. REQUISITOS NÃO-FUNCIONAIS

### 3.1 Segurança
- Autenticação segura com JWT
- Criptografia de senhas (bcrypt)
- Proteção contra falsificação de GPS (validação de velocidade, padrões anormais)
- Validação backend obrigatória
- Logs de auditoria para todas as ações críticas
- Comunicação HTTPS/TLS

### 3.2 Performance
- Sincronização offline-first para dados críticos
- Cache inteligente de imagens
- Otimização de requisições de API
- Compressão de imagens antes do upload

### 3.3 Escalabilidade
- Arquitetura modular e desacoplada
- Banco de dados normalizado
- APIs RESTful bem estruturadas
- Suporte para múltiplas instâncias de backend

### 3.4 Disponibilidade
- Armazenamento permanente de dados sem expiração
- Backup automático
- Recuperação de falhas

### 3.5 Usabilidade
- Interface intuitiva e responsiva
- Navegação clara e consistente
- Feedback visual para ações do usuário

---

## 4. STACK TECNOLÓGICO RECOMENDADO

### Frontend Mobile
- **Framework**: React Native com Expo
- **Linguagem**: TypeScript
- **Styling**: TailwindCSS
- **Navegação**: React Navigation
- **Geolocalização**: expo-location
- **Câmera**: expo-image-picker, expo-camera
- **Armazenamento Local**: AsyncStorage, SQLite (expo-sqlite)
- **Notificações**: expo-notifications
- **Mapas**: react-native-maps

### Backend
- **Framework**: Node.js com Express ou FastAPI (Python)
- **Banco de Dados**: MySQL/TiDB (suportado pelo scaffold)
- **ORM**: Drizzle ORM
- **Autenticação**: JWT com refresh tokens
- **Upload de Arquivos**: AWS S3 ou similar
- **Processamento de Imagens**: Sharp
- **Validação**: Zod ou Joi
- **Logging**: Winston ou Pino

### Infraestrutura
- **Hospedagem**: AWS, Google Cloud ou similar
- **CI/CD**: GitHub Actions
- **Monitoramento**: Sentry para erros, DataDog para performance

---

## 5. ESTRUTURA DE BANCO DE DADOS (Preliminar)

### Tabelas Principais
1. **users** - Usuários (promotores e gestores)
2. **brands** - Marcas (Sinhá, LeitBom, Paraná, Emana, UltraPlas)
3. **stores** - Lojas/PDVs
4. **time_entries** - Registros de ponto
5. **photos** - Fotos enviadas
6. **materials** - Materiais cadastrados
7. **material_requests** - Solicitações de materiais
8. **stock_files** - Arquivos de estoque
9. **audit_logs** - Logs de auditoria
10. **geolocation_alerts** - Alertas de geolocalização

---

## 6. FLUXOS DE DADOS CRÍTICOS

### Fluxo 1: Registro de Ponto
```
Promotor abre app → Solicita GPS → Valida raio de 5km → 
Registra entrada/saída → Sincroniza com backend → 
Notifica gestor se sair do raio
```

### Fluxo 2: Envio de Foto
```
Promotor tira/anexa foto → Captura metadados (GPS, hora) → 
Comprime imagem → Faz upload para S3 → 
Registra no banco → Notifica gestor
```

### Fluxo 3: Solicitação de Material
```
Promotor solicita material → Gera notificação ao gestor → 
Gestor confirma entrega → Sistema registra destino → 
Promotor recebe confirmação
```

### Fluxo 4: Monitoramento Inteligente
```
Sistema analisa jornada diária → Calcula horas → 
Detecta inconsistências → Se abaixo do esperado → 
Gera alerta automático ao gestor
```

---

## 7. PRIORIDADES TÉCNICAS

1. **Estabilidade** - Sistema robusto e confiável
2. **Precisão de Localização** - Validação rigorosa de GPS
3. **Segurança** - Proteção de dados e autenticação
4. **Performance** - Resposta rápida e eficiência
5. **Usabilidade** - Interface intuitiva

---

## 8. DECISÕES ARQUITETURAIS

### 8.1 Por que Expo + React Native?
- ✅ Código único para iOS e Android
- ✅ Desenvolvimento rápido
- ✅ Ecossistema maduro e estável
- ✅ Suporte nativo para geolocalização, câmera, notificações
- ✅ Facilita testes e iterações

### 8.2 Por que Node.js + Express com Drizzle?
- ✅ Scaffold pronto do Manus com web-db-user
- ✅ TypeScript para segurança de tipos
- ✅ ORM moderno e type-safe
- ✅ Fácil integração com autenticação OAuth
- ✅ Performance comprovada

### 8.3 Por que MySQL/TiDB?
- ✅ Suportado nativamente pelo scaffold
- ✅ ACID compliance para transações críticas
- ✅ Escalabilidade horizontal com TiDB
- ✅ Backup e recovery robustos

### 8.4 Offline-First
- Sincronização local com SQLite
- Fila de requisições para quando offline
- Reconciliação automática quando online

---

## 9. RISCOS E MITIGAÇÕES

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Falsificação de GPS | Alto | Validação de velocidade, padrões, histórico |
| Perda de dados | Alto | Backup automático, replicação |
| Performance com muitas fotos | Médio | Compressão, cache, CDN |
| Sincronização offline | Médio | Fila de requisições, versionamento |
| Autenticação comprometida | Alto | JWT com refresh, HTTPS, rate limiting |

---

## 10. PRÓXIMOS PASSOS

1. ✅ Análise de requisitos (CONCLUÍDO)
2. ⏳ Planejamento detalhado do banco de dados
3. ⏳ Inicialização do projeto com scaffold
4. ⏳ Implementação do backend
5. ⏳ Implementação do frontend
6. ⏳ Testes e otimizações
7. ⏳ Documentação e deploy

---

**Aprovado para prosseguir para Fase 2: Planejamento Detalhado**
