
## Problema detectado

Hoje existem **duas colunas paralelas** na tabela `users` representando o mesmo dado (o ID do tenant na API Bivvo), e cada parte do código usa uma delas:

| Coluna | Onde é lida/escrita |
|---|---|
| `tenant_bivvo` | `admin-api` (checagem de status via `tenantApiShowTenant`, listagem de assinaturas, ação `update-user-tenant`, `refresh-all-bivvo-statuses`) |
| `bivvo_tenant_id` | `_shared/bivvo-api.ts` (store/update/inactivate na Bivvo), `provision-bivvo-tenant`, `auto-inactivate-overdue`, `Admin.tsx` (Setup Bivvo / Ações do Tenant) |

Consequência prática:
- Ao salvar o Tenant ID em "Setup Bivvo" (grava em `bivvo_tenant_id`), a coluna `bivvo_status` (que consulta `tenant_bivvo`) continua vazia — o status "Inserir ID" nunca sai.
- `refresh-all-bivvo-statuses` ignora tenants provisionados pelo fluxo automático.
- `handleSaveTenant` da UI e a action `update-user-tenant` gravam em campos diferentes.

## Objetivo

Consolidar tudo em **um único campo canônico: `bivvo_tenant_id`** (nome mais semântico e já usado pelo fluxo de provisionamento). Remover `tenant_bivvo` após migrar os dados.

## Passos

### 1. Migração SQL
- Copiar valores existentes: `UPDATE users SET bivvo_tenant_id = COALESCE(bivvo_tenant_id, tenant_bivvo) WHERE tenant_bivvo IS NOT NULL;`
- `ALTER TABLE users DROP COLUMN tenant_bivvo;`

### 2. `supabase/functions/admin-api/index.ts`
Substituir todas as referências a `tenant_bivvo` por `bivvo_tenant_id`:
- `checkBivvoStatus` (linhas ~85, 96): usar `u.bivvo_tenant_id`.
- Listagem de assinaturas (linhas ~145, 227, 314, 315): selecionar `bivvo_tenant_id`; manter chave de retorno `tenantBivvo` no JSON para não quebrar a UI, mas alimentada por `bivvo_tenant_id`.
- Ação `update-user-tenant` (linhas ~1079, 1086): gravar em `bivvo_tenant_id`. Também zerar `tenant_provisioned_at` / `tenant_provision_error` se o ID mudar manualmente (opcional, mais coerente).
- `refresh-all-bivvo-statuses` (linha 1141): selecionar `bivvo_tenant_id`.

### 3. Frontend `src/pages/Admin.tsx`
- `handleSaveTenant`: já grava em `bivvo_tenant_id`. Adicional: **após salvar, também disparar imediatamente `check-bivvo-tenant`** (ou chamar `refresh-all-bivvo-statuses` só para esse usuário) para popular `bivvo_status` na hora — assim o card "Detalhes da Assinatura" mostra status correto sem esperar cron.
- Nenhuma mudança de UI/labels: continua "Setup Bivvo" / "Tenant Bivvo".

### 4. `src/integrations/supabase/types.ts`
- Remover as três aparições de `tenant_bivvo` (Row / Insert / Update) da tabela `users`. (Se o arquivo for autogerado, deixar que próximo pull do schema regenere.)

### 5. Verificação
- Grep final: `rg "tenant_bivvo" src supabase` deve retornar apenas linhas em `supabase/migrations/` antigas (histórico) — nenhum código ativo.
- Fluxo end-to-end: salvar ID manual → status atualiza; provisionar via botão → mesmo campo alimenta status; inativar → mesmo campo.

## Fora de escopo
- `new_deploy/` e `deploy/` (snapshots de exportação): não tocamos.
- Renomear `bivvo_tenant_id` para outro nome: mantemos como está.
- Nenhuma mudança em `_shared/bivvo-api.ts`, `provision-bivvo-tenant`, `auto-inactivate-overdue` — já usam o campo correto.

## Riscos
- Se algum usuário em produção só tem `tenant_bivvo` preenchido (não `bivvo_tenant_id`), a migração cobre com `COALESCE`. Após deploy da migração, `tenant_bivvo` deixa de existir; qualquer código externo que ainda consulte essa coluna quebra — não há consumidores fora do próprio projeto.
