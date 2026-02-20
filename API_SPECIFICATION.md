# Especificação de APIs
## Sistema de Gestão de Equipe de Promotores

---

## 1. VISÃO GERAL

**Base URL**: `https://api.promoter-management.com/v1`  
**Autenticação**: JWT Bearer Token  
**Content-Type**: `application/json`  
**Rate Limit**: 1000 requisições/hora por usuário  

---

## 2. AUTENTICAÇÃO

### 2.1 POST /auth/register
Registrar novo usuário (apenas para gestores/admin).

**Request:**
```json
{
  "email": "promoter@example.com",
  "password": "SecurePassword123!",
  "first_name": "João",
  "last_name": "Silva",
  "role": "promoter",
  "phone": "11987654321",
  "cpf": "12345678901",
  "store_id": "uuid-store-id"
}
```

**Response (201):**
```json
{
  "id": "uuid-user-id",
  "email": "promoter@example.com",
  "first_name": "João",
  "last_name": "Silva",
  "role": "promoter",
  "created_at": "2026-02-20T10:30:00Z"
}
```

---

### 2.2 POST /auth/login
Autenticar usuário e obter token JWT.

**Request:**
```json
{
  "email": "promoter@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600,
  "user": {
    "id": "uuid-user-id",
    "email": "promoter@example.com",
    "first_name": "João",
    "role": "promoter"
  }
}
```

---

### 2.3 POST /auth/refresh
Renovar token de acesso.

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600
}
```

---

### 2.4 POST /auth/logout
Fazer logout e invalidar tokens.

**Response (200):**
```json
{
  "message": "Logout successful"
}
```

---

## 3. LOJAS (STORES)

### 3.1 GET /stores
Listar todas as lojas (com filtros).

**Query Parameters:**
- `city`: Filtrar por cidade
- `state`: Filtrar por estado
- `status`: active, inactive
- `limit`: Número de resultados (padrão: 20)
- `offset`: Deslocamento (padrão: 0)

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid-store-id",
      "name": "Loja Centro",
      "latitude": -23.5505,
      "longitude": -46.6333,
      "address": "Rua A, 123",
      "city": "São Paulo",
      "state": "SP",
      "phone": "1133334444",
      "status": "active"
    }
  ],
  "total": 150,
  "limit": 20,
  "offset": 0
}
```

---

### 3.2 GET /stores/:id
Obter detalhes de uma loja específica.

**Response (200):**
```json
{
  "id": "uuid-store-id",
  "name": "Loja Centro",
  "latitude": -23.5505,
  "longitude": -46.6333,
  "address": "Rua A, 123",
  "city": "São Paulo",
  "state": "SP",
  "zip_code": "01234-567",
  "phone": "1133334444",
  "manager": {
    "id": "uuid-manager-id",
    "name": "Carlos Manager"
  },
  "status": "active",
  "created_at": "2026-01-15T08:00:00Z"
}
```

---

## 4. REGISTRO DE PONTO (TIME ENTRIES)

### 4.1 POST /time-entries
Registrar entrada ou saída com geolocalização.

**Request:**
```json
{
  "entry_type": "entry",
  "store_id": "uuid-store-id",
  "latitude": -23.5505,
  "longitude": -46.6333,
  "accuracy": 5.2,
  "gps_altitude": 750.5,
  "device_id": "device-unique-id",
  "ip_address": "192.168.1.1"
}
```

**Response (201):**
```json
{
  "id": "uuid-entry-id",
  "user_id": "uuid-user-id",
  "store_id": "uuid-store-id",
  "entry_type": "entry",
  "entry_time": "2026-02-20T08:30:00Z",
  "latitude": -23.5505,
  "longitude": -46.6333,
  "distance_from_store": 0.2,
  "is_within_radius": true,
  "accuracy": 5.2
}
```

**Errors:**
- `400`: GPS não ativo ou fora do raio de 5km
- `401`: Não autenticado
- `409`: Já existe entrada não fechada

---

### 4.2 GET /time-entries
Listar registros de ponto do usuário autenticado.

**Query Parameters:**
- `start_date`: Data inicial (ISO 8601)
- `end_date`: Data final (ISO 8601)
- `store_id`: Filtrar por loja
- `limit`: Número de resultados
- `offset`: Deslocamento

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid-entry-id",
      "entry_type": "entry",
      "entry_time": "2026-02-20T08:30:00Z",
      "store": {
        "id": "uuid-store-id",
        "name": "Loja Centro"
      },
      "distance_from_store": 0.2,
      "is_within_radius": true
    }
  ],
  "total": 45,
  "limit": 20,
  "offset": 0
}
```

---

### 4.3 GET /time-entries/daily-summary
Resumo de jornada diária.

**Query Parameters:**
- `date`: Data (ISO 8601, padrão: hoje)

**Response (200):**
```json
{
  "date": "2026-02-20",
  "first_entry": "2026-02-20T08:30:00Z",
  "last_exit": "2026-02-20T17:45:00Z",
  "total_hours": 9.25,
  "stores_visited": 3,
  "entries": [
    {
      "store_name": "Loja Centro",
      "entry_time": "2026-02-20T08:30:00Z",
      "exit_time": "2026-02-20T12:00:00Z",
      "duration_hours": 3.5
    }
  ]
}
```

---

## 5. FOTOS (PHOTOS)

### 5.1 POST /photos
Enviar foto com metadados.

**Request (multipart/form-data):**
```
file: <binary image data>
brand_id: uuid-brand-id
store_id: uuid-store-id
latitude: -23.5505
longitude: -46.6333
photo_timestamp: 2026-02-20T10:30:00Z
description: "Foto do PDV"
```

**Response (201):**
```json
{
  "id": "uuid-photo-id",
  "brand_id": "uuid-brand-id",
  "store_id": "uuid-store-id",
  "photo_url": "https://s3.amazonaws.com/photos/uuid-photo-id.jpg",
  "thumbnail_url": "https://s3.amazonaws.com/photos/uuid-photo-id-thumb.jpg",
  "latitude": -23.5505,
  "longitude": -46.6333,
  "photo_timestamp": "2026-02-20T10:30:00Z",
  "file_size": 2048576,
  "status": "pending",
  "created_at": "2026-02-20T10:31:00Z"
}
```

---

### 5.2 GET /photos
Listar fotos com filtros.

**Query Parameters:**
- `brand_id`: Filtrar por marca
- `store_id`: Filtrar por loja
- `user_id`: Filtrar por promotor (apenas para gestores)
- `start_date`: Data inicial
- `end_date`: Data final
- `status`: pending, approved, rejected
- `limit`: Número de resultados
- `offset`: Deslocamento

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid-photo-id",
      "user": {
        "id": "uuid-user-id",
        "name": "João Silva"
      },
      "brand": {
        "id": "uuid-brand-id",
        "name": "Sinhá"
      },
      "store": {
        "id": "uuid-store-id",
        "name": "Loja Centro"
      },
      "photo_url": "https://s3.amazonaws.com/photos/uuid-photo-id.jpg",
      "photo_timestamp": "2026-02-20T10:30:00Z",
      "status": "pending",
      "quality_rating": null
    }
  ],
  "total": 250,
  "limit": 20,
  "offset": 0
}
```

---

### 5.3 PATCH /photos/:id
Atualizar status ou avaliação de foto (apenas gestor).

**Request:**
```json
{
  "status": "approved",
  "quality_rating": 5,
  "manager_notes": "Excelente qualidade"
}
```

**Response (200):**
```json
{
  "id": "uuid-photo-id",
  "status": "approved",
  "quality_rating": 5,
  "manager_notes": "Excelente qualidade",
  "updated_at": "2026-02-20T11:00:00Z"
}
```

---

## 6. MATERIAIS (MATERIALS)

### 6.1 POST /materials
Cadastrar novo material (apenas gestor).

**Request:**
```json
{
  "brand_id": "uuid-brand-id",
  "name": "Adesivo Sinhá 50x50",
  "description": "Adesivo para PDV",
  "quantity_available": 100,
  "unit": "box",
  "photo_url": "https://s3.amazonaws.com/materials/photo.jpg"
}
```

**Response (201):**
```json
{
  "id": "uuid-material-id",
  "brand_id": "uuid-brand-id",
  "name": "Adesivo Sinhá 50x50",
  "quantity_available": 100,
  "quantity_reserved": 0,
  "unit": "box",
  "status": "active",
  "created_at": "2026-02-20T10:00:00Z"
}
```

---

### 6.2 GET /materials
Listar materiais com filtros.

**Query Parameters:**
- `brand_id`: Filtrar por marca
- `status`: active, inactive, discontinued
- `limit`: Número de resultados
- `offset`: Deslocamento

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid-material-id",
      "brand": {
        "id": "uuid-brand-id",
        "name": "Sinhá"
      },
      "name": "Adesivo Sinhá 50x50",
      "quantity_available": 100,
      "quantity_reserved": 25,
      "quantity_free": 75,
      "unit": "box",
      "status": "active"
    }
  ],
  "total": 450,
  "limit": 20,
  "offset": 0
}
```

---

### 6.3 PATCH /materials/:id
Atualizar quantidade de material (apenas gestor).

**Request:**
```json
{
  "quantity_available": 120,
  "quantity_delivered": 10
}
```

**Response (200):**
```json
{
  "id": "uuid-material-id",
  "quantity_available": 120,
  "quantity_reserved": 25,
  "quantity_delivered": 10,
  "updated_at": "2026-02-20T11:00:00Z"
}
```

---

## 7. SOLICITAÇÕES DE MATERIAL (MATERIAL REQUESTS)

### 7.1 POST /material-requests
Promotor solicita material.

**Request:**
```json
{
  "material_id": "uuid-material-id",
  "store_id": "uuid-store-id",
  "quantity_requested": 10,
  "priority": "medium",
  "notes": "Urgente para reposição"
}
```

**Response (201):**
```json
{
  "id": "uuid-request-id",
  "material": {
    "id": "uuid-material-id",
    "name": "Adesivo Sinhá 50x50"
  },
  "store": {
    "id": "uuid-store-id",
    "name": "Loja Centro"
  },
  "quantity_requested": 10,
  "status": "pending",
  "priority": "medium",
  "requested_at": "2026-02-20T10:30:00Z",
  "created_at": "2026-02-20T10:30:00Z"
}
```

---

### 7.2 GET /material-requests
Listar solicitações de material.

**Query Parameters:**
- `status`: pending, approved, rejected, delivered, cancelled
- `priority`: low, medium, high
- `user_id`: Filtrar por promotor (apenas gestor)
- `start_date`: Data inicial
- `end_date`: Data final
- `limit`: Número de resultados
- `offset`: Deslocamento

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid-request-id",
      "user": {
        "id": "uuid-user-id",
        "name": "João Silva"
      },
      "material": {
        "id": "uuid-material-id",
        "name": "Adesivo Sinhá 50x50"
      },
      "store": {
        "id": "uuid-store-id",
        "name": "Loja Centro"
      },
      "quantity_requested": 10,
      "status": "pending",
      "priority": "medium",
      "requested_at": "2026-02-20T10:30:00Z"
    }
  ],
  "total": 85,
  "limit": 20,
  "offset": 0
}
```

---

### 7.3 PATCH /material-requests/:id
Gestor aprova ou rejeita solicitação.

**Request:**
```json
{
  "status": "approved",
  "notes": "Aprovado para entrega hoje"
}
```

**Response (200):**
```json
{
  "id": "uuid-request-id",
  "status": "approved",
  "approved_at": "2026-02-20T11:00:00Z",
  "approved_by": {
    "id": "uuid-manager-id",
    "name": "Carlos Manager"
  },
  "updated_at": "2026-02-20T11:00:00Z"
}
```

---

### 7.4 POST /material-requests/:id/deliver
Registrar entrega de material (apenas gestor).

**Request:**
```json
{
  "quantity_delivered": 10,
  "notes": "Entregue no PDV"
}
```

**Response (200):**
```json
{
  "id": "uuid-request-id",
  "status": "delivered",
  "delivered_at": "2026-02-20T14:30:00Z",
  "delivered_by": {
    "id": "uuid-manager-id",
    "name": "Carlos Manager"
  },
  "quantity_delivered": 10,
  "updated_at": "2026-02-20T14:30:00Z"
}
```

---

## 8. ARQUIVOS DE ESTOQUE (STOCK FILES)

### 8.1 POST /stock-files
Gestor envia arquivo de estoque.

**Request (multipart/form-data):**
```
file: <binary file data>
brand_id: uuid-brand-id
description: "Estoque de fevereiro"
visibility: all_promoters
```

**Response (201):**
```json
{
  "id": "uuid-file-id",
  "brand_id": "uuid-brand-id",
  "file_url": "https://s3.amazonaws.com/stock-files/uuid-file-id.pdf",
  "file_name": "estoque_fevereiro.pdf",
  "file_type": "application/pdf",
  "file_size": 1024576,
  "description": "Estoque de fevereiro",
  "visibility": "all_promoters",
  "created_at": "2026-02-20T10:00:00Z"
}
```

---

### 8.2 GET /stock-files
Listar arquivos de estoque.

**Query Parameters:**
- `brand_id`: Filtrar por marca
- `limit`: Número de resultados
- `offset`: Deslocamento

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid-file-id",
      "brand": {
        "id": "uuid-brand-id",
        "name": "Sinhá"
      },
      "file_url": "https://s3.amazonaws.com/stock-files/uuid-file-id.pdf",
      "file_name": "estoque_fevereiro.pdf",
      "description": "Estoque de fevereiro",
      "uploaded_by": {
        "id": "uuid-manager-id",
        "name": "Carlos Manager"
      },
      "created_at": "2026-02-20T10:00:00Z"
    }
  ],
  "total": 120,
  "limit": 20,
  "offset": 0
}
```

---

## 9. ALERTAS DE GEOLOCALIZAÇÃO (GEOLOCATION ALERTS)

### 9.1 GET /geolocation-alerts
Listar alertas (apenas gestor).

**Query Parameters:**
- `alert_type`: left_radius, suspicious_movement, gps_spoofing_suspected
- `acknowledged`: true, false
- `user_id`: Filtrar por promotor
- `start_date`: Data inicial
- `end_date`: Data final
- `limit`: Número de resultados
- `offset`: Deslocamento

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid-alert-id",
      "user": {
        "id": "uuid-user-id",
        "name": "João Silva"
      },
      "store": {
        "id": "uuid-store-id",
        "name": "Loja Centro"
      },
      "alert_type": "left_radius",
      "distance_from_store": 5.8,
      "alert_timestamp": "2026-02-20T12:30:00Z",
      "acknowledged": false
    }
  ],
  "total": 15,
  "limit": 20,
  "offset": 0
}
```

---

### 9.2 PATCH /geolocation-alerts/:id
Reconhecer alerta (apenas gestor).

**Request:**
```json
{
  "acknowledged": true,
  "notes": "Verificado com o promotor"
}
```

**Response (200):**
```json
{
  "id": "uuid-alert-id",
  "acknowledged": true,
  "acknowledged_by": {
    "id": "uuid-manager-id",
    "name": "Carlos Manager"
  },
  "acknowledged_at": "2026-02-20T13:00:00Z",
  "updated_at": "2026-02-20T13:00:00Z"
}
```

---

## 10. MONITORAMENTO E RELATÓRIOS

### 10.1 GET /reports/daily-summary
Resumo diário de atividades (apenas gestor).

**Query Parameters:**
- `date`: Data (ISO 8601, padrão: hoje)
- `store_id`: Filtrar por loja

**Response (200):**
```json
{
  "date": "2026-02-20",
  "total_promoters": 15,
  "promoters_on_duty": 12,
  "total_entries": 45,
  "total_exits": 42,
  "photos_uploaded": 120,
  "material_requests": 8,
  "geolocation_alerts": 2,
  "average_work_hours": 8.5,
  "stores": [
    {
      "store_id": "uuid-store-id",
      "store_name": "Loja Centro",
      "promoters_count": 3,
      "photos_count": 25,
      "alerts_count": 0
    }
  ]
}
```

---

### 10.2 GET /reports/promoter-performance
Desempenho de promotor (apenas gestor).

**Query Parameters:**
- `user_id`: ID do promotor
- `start_date`: Data inicial
- `end_date`: Data final

**Response (200):**
```json
{
  "user_id": "uuid-user-id",
  "user_name": "João Silva",
  "period": {
    "start_date": "2026-02-01",
    "end_date": "2026-02-20"
  },
  "total_work_days": 15,
  "total_work_hours": 127.5,
  "average_daily_hours": 8.5,
  "photos_uploaded": 450,
  "material_requests": 25,
  "geolocation_alerts": 3,
  "stores_visited": 8,
  "attendance_rate": 100
}
```

---

## 11. TRATAMENTO DE ERROS

### Códigos de Status HTTP

| Código | Significado |
|--------|-------------|
| 200 | OK - Requisição bem-sucedida |
| 201 | Created - Recurso criado com sucesso |
| 400 | Bad Request - Dados inválidos |
| 401 | Unauthorized - Não autenticado |
| 403 | Forbidden - Sem permissão |
| 404 | Not Found - Recurso não encontrado |
| 409 | Conflict - Conflito (ex: entrada já aberta) |
| 422 | Unprocessable Entity - Validação falhou |
| 429 | Too Many Requests - Rate limit excedido |
| 500 | Internal Server Error - Erro do servidor |
| 503 | Service Unavailable - Serviço indisponível |

### Formato de Erro

```json
{
  "error": {
    "code": "INVALID_GPS_LOCATION",
    "message": "Usuário está fora do raio de 5km da loja",
    "details": {
      "distance": 5.8,
      "max_distance": 5.0
    },
    "timestamp": "2026-02-20T10:30:00Z",
    "request_id": "req-uuid-123"
  }
}
```

---

## 12. SEGURANÇA

### Headers Obrigatórios

```
Authorization: Bearer <access_token>
Content-Type: application/json
X-Request-ID: <uuid>
```

### Rate Limiting

- 1000 requisições/hora por usuário
- 10000 requisições/hora por IP
- Retry-After header em respostas 429

### CORS

```
Access-Control-Allow-Origin: https://app.promoter-management.com
Access-Control-Allow-Methods: GET, POST, PATCH, DELETE
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Max-Age: 86400
```

---

**Status:** Especificação completa e pronta para implementação
