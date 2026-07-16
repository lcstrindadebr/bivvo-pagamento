# Plano: Provisionamento Automático de Tenant Bivvo

## Visão Geral

Após o pagamento ser confirmado (cartão aprovado ou webhook PIX/Boleto), o sistema irá:

1. Armazenar toda a configuração contratada (usuários, canais, módulos extras) no banco.
2. Chamar a API Bivvo `tenantApiStoreTenant` para criar tenant + usuário admin.
3. Chamar `tenantApiUpdateTenant` para finalizar configuração (identity, menus, canais, limites).
4. Redirecionar o cliente para o WhatsApp da Bivvo (número configurável no admin).
5. Expor toda a configuração contratada nos detalhes do assinante.

---

## 1. Banco de Dados

### Nova coluna em `payments` (e `users`)

- `payments.bivvo_config` (jsonb) — snapshot da config contratada no momento da compra (plano, users, extras, canais com quantidades, módulos, telefonia, protagonista).
- `users.bivvo_config` (jsonb) — última config ativa (atualizada quando pagamento confirmar).
- `users.tenant_provisioned_at` (timestamptz) — marca quando tenant foi criado com sucesso na Bivvo.
- `users.tenant_provision_error` (text) — última mensagem de erro do provisionamento, se houver.
- DEVE ARMAZENAR o nuemro do tenant criado atravez da api do bivvo

### Novas configurações em `settings` (chave/valor)

- `bivvo_api_url` (default `https://adm.bivvo.com.br`)
- `bivvo_api_token` (armazenado como secret, não em settings) — usar secret `BIVVO_API_TOKEN`
- `bivvo_asaas_token` (secret `BIVVO_ASAAS_TOKEN`) — token usado no campo `asaasToken` do payload
- `support_whatsapp` (default `5511936230279`) — número usado no botão "Continuar"

---

## 2. Frontend — Checkout

- Enviar `bivvoConfig` completo no fluxo de checkout (já ocorre em parte) e persistir em `payments.bivvo_config`.
- Botão "Continuar" na tela de sucesso (cartão) e na tela de PIX/Boleto (após confirmação) passa a abrir:
`https://wa.me/<support_whatsapp>?text=<mensagem>`
- Ler `support_whatsapp` via `useSiteSettings` com fallback ao default.

---

## 3. Admin — Configurações

Adicionar na aba **Notificações/Geral** (settings) um campo:

- **WhatsApp de Suporte** — usado no redirecionamento pós-compra.

---

## 4. Admin — Detalhes do Assinante

Na aba "Gestão de Assinaturas", ao expandir/abrir o cliente, mostrar seção "Configuração Contratada":

- Plano base + usuários totais (base + extras)
- Canais contratados (lista com emoji, label, quantidade)
- Módulos extras (Telefonia, Disparo em Massa/Protagonista)
- Valor primeiro mês e recorrente
- Status do provisionamento Bivvo (provisionado em / erro)

Fonte de dados: `users.bivvo_config` (mais recente) ou `payments.bivvo_config` (histórico).

---

## 5. Provisionamento Bivvo (Edge Function)

### Nova edge function: `provision-bivvo-tenant`

Invocada a partir de:

- `process-payment` (cartão aprovado imediatamente)
- `asaas-webhook` (PIX/Boleto confirmado — `PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED`)

Idempotente: se `users.tenant_provisioned_at` já preenchido, retorna sucesso sem chamar API.

### Payload construído a partir de `bivvo_config` + `users`

**Passo A — POST `/tenantApiStoreTenant**`

```json
{
  "status": "active",
  "name": "<company_name se PJ, senão name>",
  "maxUsers": <users totais contratados>,
  "maxConnections": <soma de todos canais contratados>,
  "acceptTerms": true,
  "email": "<users.email>",
  "password": "@Bivvo123456",
  "userName": "<users.name>",
  "profile": "admin",
  "paymentGateway": "asaas",
  "asaasCustomerId": "<users.asaas_customer_id>",
  "asaasToken": "<secret BIVVO_ASAAS_TOKEN>",
  "asaas": "enabled"
}
```

**Passo B — POST `/tenantApiUpdateTenant**`

```json
{
  "identity": "<cpf ou cnpj limpo>",
  "status": "active",
  "menuVisibility": [...base sem "MassDispatch" se não contratou],
  "allowedChannels": ["waba","baileys","whatsapp","telegram","webchat","webmail","wabaoauth","instagramoauth","facebookoauth"],
  "channelConnectionLimits": {
    "waba": <qty waof>, "wabaoauth": <qty waof>,
    "baileys": <qty wano>,
    "whatsapp": 0, "meow": 0, "evo": 0, "zapi": 0, "uazapi": 0,
    "telegram": 0, "hub": 0, "webchat": 0, "webmail": 0,
    "instagramoauth": <qty ig>, "facebookoauth": <qty fb>
  }
}
```

Regras aplicadas:

- `MassDispatch` incluído apenas se `bivvoConfig.massDispatch === true` (ou marcador equivalente — validar qual flag representa "disparo em massa"; hoje há `protagonista` e `telefonia`, precisamos confirmar se disparo em massa é um módulo separado).
- `waba` e `wabaoauth` = quantidade de "WhatsApp API Oficial" (waof).
- `baileys` = quantidade de "WhatsApp API não oficial" (wano).
- `instagramoauth` = qty Instagram; `facebookoauth` = qty Facebook.
- Ao sucesso: atualizar `users.tenant_provisioned_at = now()`.
- Ao erro: gravar `users.tenant_provision_error`, logar, retornar 200 para não travar webhook.

---

## 6. Secrets necessários

- `BIVVO_API_TOKEN` — Bearer para chamadas Bivvo
- `BIVVO_ASAAS_TOKEN` — valor a enviar no campo `asaasToken`
- `BIVVO_API_URL` (opcional; default hardcoded `https://adm.bivvo.com.br`)

---

## Perguntas antes de implementar

1. **Disparo em Massa** é um módulo separado que o cliente contrata (que ainda não existe no checkout), ou está atrelado ao "Protagonista"/algum plano específico? Preciso saber qual flag do `bivvoConfig` controla o `MassDispatch`.
2. Confirmar que os dois tokens (`BIVVO_API_TOKEN` e `BIVVO_ASAAS_TOKEN`) são valores distintos, ou é o mesmo token nos dois lugares?
3. Mensagem padrão no link do WhatsApp — quer texto pré-preenchido tipo "Olá, acabei de contratar o plano X…" ou link puro?

Depois que responder essas três, implemento tudo (migração + edge function nova + hooks nos existentes + UI admin + redirect checkout).