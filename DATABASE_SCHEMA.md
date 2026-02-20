# Planejamento Detalhado do Banco de Dados
## Sistema de Gestão de Equipe de Promotores

---

## 1. DIAGRAMA ENTIDADE-RELACIONAMENTO (ER)

```
┌─────────────────────────────────────────────────────────────────┐
│                         ESTRUTURA DO BANCO                      │
└─────────────────────────────────────────────────────────────────┘

users (1) ──────────── (N) time_entries
users (1) ──────────── (N) photos
users (1) ──────────── (N) material_requests
users (1) ──────────── (N) audit_logs

brands (1) ──────────── (N) photos
brands (1) ──────────── (N) materials
brands (1) ──────────── (N) stock_files

stores (1) ──────────── (N) time_entries
stores (1) ──────────── (N) photos
stores (1) ──────────── (N) geolocation_alerts

materials (1) ──────────── (N) material_requests
materials (1) ──────────── (N) material_deliveries

material_requests (1) ──────────── (N) material_deliveries
```

---

## 2. TABELAS DETALHADAS

### 2.1 users
Armazena informações de promotores e gestores.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role ENUM('promoter', 'manager') NOT NULL,
  phone VARCHAR(20),
  cpf VARCHAR(11) UNIQUE,
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  store_id UUID REFERENCES stores(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_store_id (store_id),
  INDEX idx_status (status)
);
```

**Campos:**
- `id`: Identificador único (UUID)
- `email`: Email único para login
- `password_hash`: Senha criptografada com bcrypt
- `first_name`, `last_name`: Nome completo
- `role`: Promoter ou Manager
- `phone`: Telefone para contato
- `cpf`: CPF único (para auditoria)
- `status`: Ativo, inativo ou suspenso
- `store_id`: Loja associada (para promotores)
- `created_at`, `updated_at`: Timestamps
- `last_login`: Último acesso

---

### 2.2 stores
Lojas/PDVs onde promotores trabalham.

```sql
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  address VARCHAR(500),
  city VARCHAR(100),
  state VARCHAR(2),
  zip_code VARCHAR(10),
  phone VARCHAR(20),
  manager_id UUID REFERENCES users(id),
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_latitude_longitude (latitude, longitude),
  INDEX idx_city_state (city, state),
  INDEX idx_manager_id (manager_id),
  INDEX idx_status (status)
);
```

**Campos:**
- `id`: Identificador único
- `name`: Nome da loja
- `latitude`, `longitude`: Coordenadas GPS
- `address`, `city`, `state`, `zip_code`: Endereço completo
- `phone`: Telefone da loja
- `manager_id`: Gerente responsável
- `status`: Ativa ou inativa

---

### 2.3 brands
Marcas (Sinhá, LeitBom, Paraná, Emana, UltraPlas).

```sql
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  logo_url VARCHAR(500),
  color_hex VARCHAR(7),
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_name (name),
  INDEX idx_status (status)
);
```

**Campos:**
- `id`: Identificador único
- `name`: Nome da marca (único)
- `description`: Descrição
- `logo_url`: URL do logo
- `color_hex`: Cor da marca (para UI)
- `status`: Ativa ou inativa

---

### 2.4 time_entries
Registros de entrada/saída de promotores.

```sql
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  entry_type ENUM('entry', 'exit') NOT NULL,
  entry_time TIMESTAMP NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(5, 2),
  gps_altitude DECIMAL(8, 2),
  distance_from_store DECIMAL(5, 2),
  is_within_radius BOOLEAN DEFAULT TRUE,
  device_id VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_user_id (user_id),
  INDEX idx_store_id (store_id),
  INDEX idx_entry_time (entry_time),
  INDEX idx_entry_type (entry_type),
  INDEX idx_user_entry_time (user_id, entry_time),
  FULLTEXT INDEX ft_device_id (device_id)
);
```

**Campos:**
- `id`: Identificador único
- `user_id`: Promotor
- `store_id`: Loja
- `entry_type`: Entrada ou saída
- `entry_time`: Data/hora do registro
- `latitude`, `longitude`: Coordenadas GPS capturadas
- `accuracy`: Precisão do GPS em metros
- `gps_altitude`: Altitude capturada
- `distance_from_store`: Distância calculada da loja
- `is_within_radius`: Boolean indicando se dentro do raio de 5km
- `device_id`: ID único do dispositivo (para detecção de fraude)
- `ip_address`: IP da requisição
- `user_agent`: User agent do dispositivo
- `created_at`: Timestamp

---

### 2.5 photos
Fotos enviadas por promotores.

```sql
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  brand_id UUID NOT NULL REFERENCES brands(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  photo_url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  photo_timestamp TIMESTAMP NOT NULL,
  file_size INT,
  file_type VARCHAR(50),
  description TEXT,
  quality_rating INT CHECK (quality_rating >= 1 AND quality_rating <= 5),
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  manager_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_user_id (user_id),
  INDEX idx_brand_id (brand_id),
  INDEX idx_store_id (store_id),
  INDEX idx_photo_timestamp (photo_timestamp),
  INDEX idx_status (status),
  INDEX idx_user_brand_timestamp (user_id, brand_id, photo_timestamp)
);
```

**Campos:**
- `id`: Identificador único
- `user_id`: Promotor que enviou
- `brand_id`: Marca da foto
- `store_id`: Loja onde foi tirada
- `photo_url`: URL da foto no S3
- `thumbnail_url`: URL da miniatura
- `latitude`, `longitude`: Coordenadas GPS
- `photo_timestamp`: Data/hora da captura
- `file_size`: Tamanho em bytes
- `file_type`: Tipo MIME (jpg, png, etc)
- `description`: Descrição adicionada pelo promotor
- `quality_rating`: Avaliação de qualidade (1-5)
- `status`: Pendente, aprovada ou rejeitada
- `manager_notes`: Notas do gestor
- `created_at`, `updated_at`: Timestamps

---

### 2.6 materials
Materiais cadastrados pelo gestor.

```sql
CREATE TABLE materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  photo_url VARCHAR(500),
  quantity_available INT DEFAULT 0,
  quantity_reserved INT DEFAULT 0,
  quantity_delivered INT DEFAULT 0,
  unit ENUM('unit', 'box', 'pack', 'kg', 'liter') DEFAULT 'unit',
  status ENUM('active', 'inactive', 'discontinued') DEFAULT 'active',
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_brand_id (brand_id),
  INDEX idx_status (status),
  INDEX idx_created_by (created_by),
  INDEX idx_brand_status (brand_id, status)
);
```

**Campos:**
- `id`: Identificador único
- `brand_id`: Marca do material
- `name`: Nome do material
- `description`: Descrição
- `photo_url`: Foto do material
- `quantity_available`: Quantidade disponível
- `quantity_reserved`: Quantidade reservada
- `quantity_delivered`: Quantidade entregue
- `unit`: Unidade de medida
- `status`: Ativo, inativo ou descontinuado
- `created_by`: Gestor que criou
- `created_at`, `updated_at`: Timestamps

---

### 2.7 material_requests
Solicitações de materiais pelos promotores.

```sql
CREATE TABLE material_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  material_id UUID NOT NULL REFERENCES materials(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  quantity_requested INT NOT NULL,
  status ENUM('pending', 'approved', 'rejected', 'delivered', 'cancelled') DEFAULT 'pending',
  priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
  notes TEXT,
  requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES users(id),
  delivered_at TIMESTAMP,
  delivered_by UUID REFERENCES users(id),
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_user_id (user_id),
  INDEX idx_material_id (material_id),
  INDEX idx_store_id (store_id),
  INDEX idx_status (status),
  INDEX idx_requested_at (requested_at),
  INDEX idx_user_status (user_id, status)
);
```

**Campos:**
- `id`: Identificador único
- `user_id`: Promotor que solicitou
- `material_id`: Material solicitado
- `store_id`: Loja de destino
- `quantity_requested`: Quantidade solicitada
- `status`: Pendente, aprovada, rejeitada, entregue, cancelada
- `priority`: Prioridade (baixa, média, alta)
- `notes`: Notas adicionais
- `requested_at`: Data/hora da solicitação
- `approved_at`: Data/hora da aprovação
- `approved_by`: Gestor que aprovou
- `delivered_at`: Data/hora da entrega
- `delivered_by`: Gestor que entregou
- `rejection_reason`: Motivo da rejeição
- `created_at`, `updated_at`: Timestamps

---

### 2.8 stock_files
Arquivos de estoque enviados pelo gestor.

```sql
CREATE TABLE stock_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id),
  file_url VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50),
  file_size INT,
  description TEXT,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  visibility ENUM('all_promoters', 'specific_stores', 'specific_users') DEFAULT 'all_promoters',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX idx_brand_id (brand_id),
  INDEX idx_uploaded_by (uploaded_by),
  INDEX idx_created_at (created_at)
);
```

**Campos:**
- `id`: Identificador único
- `brand_id`: Marca relacionada
- `file_url`: URL do arquivo no S3
- `file_name`: Nome do arquivo
- `file_type`: Tipo (PDF, Excel, etc)
- `file_size`: Tamanho em bytes
- `description`: Descrição do arquivo
- `uploaded_by`: Gestor que enviou
- `visibility`: Visibilidade (todos, lojas específicas, usuários específicos)
- `created_at`, `updated_at`: Timestamps

---

### 2.9 geolocation_alerts
Alertas de geolocalização (promotor saiu do raio).

```sql
CREATE TABLE geolocation_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  store_id UUID NOT NULL REFERENCES stores(id),
  time_entry_id UUID REFERENCES time_entries(id),
  alert_type ENUM('left_radius', 'suspicious_movement', 'gps_spoofing_suspected') NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  distance_from_store DECIMAL(5, 2),
  alert_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_user_id (user_id),
  INDEX idx_store_id (store_id),
  INDEX idx_alert_type (alert_type),
  INDEX idx_acknowledged (acknowledged),
  INDEX idx_alert_timestamp (alert_timestamp)
);
```

**Campos:**
- `id`: Identificador único
- `user_id`: Promotor
- `store_id`: Loja
- `time_entry_id`: Registro de ponto relacionado
- `alert_type`: Tipo de alerta
- `latitude`, `longitude`: Coordenadas do alerta
- `distance_from_store`: Distância da loja
- `alert_timestamp`: Data/hora do alerta
- `acknowledged`: Se foi reconhecido
- `acknowledged_by`: Gestor que reconheceu
- `acknowledged_at`: Data/hora do reconhecimento
- `notes`: Notas
- `created_at`: Timestamp

---

### 2.10 audit_logs
Logs de auditoria para todas as ações críticas.

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  changes JSON,
  ip_address VARCHAR(45),
  user_agent TEXT,
  status ENUM('success', 'failure') DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_resource_type (resource_type),
  INDEX idx_created_at (created_at),
  INDEX idx_user_action_created (user_id, action, created_at)
);
```

**Campos:**
- `id`: Identificador único
- `user_id`: Usuário que realizou a ação
- `action`: Tipo de ação (login, create, update, delete, etc)
- `resource_type`: Tipo de recurso afetado
- `resource_id`: ID do recurso
- `changes`: JSON com mudanças (para updates)
- `ip_address`: IP da requisição
- `user_agent`: User agent
- `status`: Sucesso ou falha
- `error_message`: Mensagem de erro se falhou
- `created_at`: Timestamp

---

## 3. ÍNDICES ESTRATÉGICOS

```sql
-- Performance para queries frequentes
CREATE INDEX idx_user_time_entries ON time_entries(user_id, entry_time DESC);
CREATE INDEX idx_brand_photos ON photos(brand_id, photo_timestamp DESC);
CREATE INDEX idx_store_time_entries ON time_entries(store_id, entry_time DESC);
CREATE INDEX idx_material_requests_status ON material_requests(status, requested_at DESC);

-- Busca por localização
CREATE SPATIAL INDEX idx_store_location ON stores(POINT(latitude, longitude));
CREATE SPATIAL INDEX idx_photo_location ON photos(POINT(latitude, longitude));
```

---

## 4. VIEWS ÚTEIS

```sql
-- View: Jornada diária do promotor
CREATE VIEW v_daily_journey AS
SELECT 
  u.id as user_id,
  u.first_name,
  u.last_name,
  DATE(te.entry_time) as work_date,
  MIN(CASE WHEN te.entry_type = 'entry' THEN te.entry_time END) as first_entry,
  MAX(CASE WHEN te.entry_type = 'exit' THEN te.entry_time END) as last_exit,
  TIMEDIFF(
    MAX(CASE WHEN te.entry_type = 'exit' THEN te.entry_time END),
    MIN(CASE WHEN te.entry_type = 'entry' THEN te.entry_time END)
  ) as total_time,
  COUNT(DISTINCT te.store_id) as stores_visited
FROM users u
JOIN time_entries te ON u.id = te.user_id
GROUP BY u.id, DATE(te.entry_time);

-- View: Materiais em falta
CREATE VIEW v_low_stock_materials AS
SELECT 
  m.id,
  m.name,
  b.name as brand_name,
  m.quantity_available,
  m.quantity_reserved,
  (m.quantity_available - m.quantity_reserved) as quantity_free,
  COUNT(mr.id) as pending_requests
FROM materials m
JOIN brands b ON m.brand_id = b.id
LEFT JOIN material_requests mr ON m.id = mr.material_id AND mr.status = 'pending'
WHERE (m.quantity_available - m.quantity_reserved) < 5
GROUP BY m.id;
```

---

## 5. CONSTRAINTS E VALIDAÇÕES

```sql
-- Validações de negócio
ALTER TABLE time_entries 
ADD CONSTRAINT check_distance CHECK (distance_from_store >= 0);

ALTER TABLE materials 
ADD CONSTRAINT check_quantities CHECK (
  quantity_available >= 0 AND 
  quantity_reserved >= 0 AND 
  quantity_delivered >= 0
);

ALTER TABLE material_requests 
ADD CONSTRAINT check_quantity_requested CHECK (quantity_requested > 0);

ALTER TABLE stores 
ADD CONSTRAINT check_coordinates CHECK (
  latitude BETWEEN -90 AND 90 AND 
  longitude BETWEEN -180 AND 180
);
```

---

## 6. ESTRATÉGIA DE PARTICIONAMENTO (Futuro)

Para escalabilidade, considerar particionamento por data:

```sql
-- Particionar time_entries por mês
ALTER TABLE time_entries 
PARTITION BY RANGE (YEAR_MONTH(entry_time)) (
  PARTITION p202601 VALUES LESS THAN (202602),
  PARTITION p202602 VALUES LESS THAN (202603),
  ...
);
```

---

## 7. BACKUP E RECOVERY

- **Backup automático**: Diário, com retenção de 30 dias
- **Point-in-time recovery**: Habilitado
- **Replicação**: Master-slave para alta disponibilidade
- **Disaster recovery**: Backup em múltiplas regiões

---

**Status:** Pronto para implementação no scaffold web-db-user
