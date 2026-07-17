
# Plano: Edição de Configuração Contratada + Sync condicional Bivvo/Asaas

Permitir que o admin edite `bivvo_config` de qualquer cliente. Após salvar, o backend calcula o diff canônico e libera botões condicionais para sincronizar Bivvo (tenant) e/ou Asaas (valor recorrente). Toda alteração fica registrada em log auditável com autor, data, config anterior/atual, e é exposta em "Detalhes da Assinatura".

## Respostas às perguntas pendentes (sugeridas)

1. **Cupom no recálculo Asaas** → ignorar cupom promocional. O cupom é benefício de aquisição; alterações contratuais posteriores usam preço cheio recorrente (`totalRec`). Admin pode reaplicar manualmente se quiser.
2. **Primeiro mês x recorrente** → só atualizar recorrente. Primeiro mês já foi cobrado.
3. **Downgrade** → warn, não bloquear. Bivvo aceita `maxUsers`/`maxConnections` menores; responsabilidade do admin verificar impacto operacional. Mostrar aviso visual quando o novo valor for menor que o atualmente provisionado.
4. **Notificação ao cliente** → silencioso (interno). Admin decide se comunica externamente.

## 1. Banco de dados (uma migração)

Colunas em `users`:
- `bivvo_config_previous` (jsonb) — snapshot da config anterior
- `bivvo_config_updated_at` (timestamptz)
- `bivvo_config_synced_bivvo` (jsonb) — última config propagada para tenant
- `bivvo_config_synced_bivvo_at` (timestamptz)
- `bivvo_config_synced_asaas_value` (numeric)
- `bivvo_config_synced_asaas_at` (timestamptz)

Nova tabela `bivvo_config_change_logs`:
- `id`, `user_id` (fk users), `changed_by` (uuid), `changed_by_email`, `changed_by_name`
- `action` (`edit` | `sync_bivvo` | `sync_asaas` | `rollback`)
- `config_before`, `config_after` (jsonb)
- `asaas_value_before`, `asaas_value_after` (numeric, null quando não aplicável)
- `bivvo_relevant_changed` (bool), `asaas_value_changed` (bool)
- `notes` (text), `created_at`
- RLS: SELECT/INSERT apenas para admin via `has_role`; GRANT authenticated + service_role.

## 2. Diff canônico server-side (fonte única da verdade)

Nova função `computeConfigDiff(before, after)` em `supabase/functions/_shared/bivvo-logic.ts`:

Retorna:
- `bivvoRelevantChanged` — true se `plan`, `users`, qualquer canal, `telefonia`, `disparo` ou `protagonista` mudaram (afetam payload do `updateTenant`)
- `asaasValueChanged` — true se `quoteBivvo(after).totalRec !== quoteBivvo(before).totalRec`
- `changedFields` — lista legível para exibir no histórico
- `newRecurringValue`, `previousRecurringValue`

Frontend NUNCA decide sozinho: chama `save-bivvo-config` e recebe as flags prontas.

## 3. Edge functions

### `admin-api/save-bivvo-config` (nova sub-rota)
1. Valida schema da config (zod).
2. Carrega user atual, extrai `bivvo_config` como `before`.
3. Normaliza `after` (clamp negativos, floor inteiros).
4. `diff = computeConfigDiff(before, after)`.
5. Update em `users`: `bivvo_config=after`, `bivvo_config_previous=before`, `bivvo_config_updated_at=now()`.
6. Insere row em `bivvo_config_change_logs` (action=`edit`) com autor extraído do JWT admin.
7. Retorna `{ diff, needsBivvoUpdate, needsAsaasUpdate, newRecurringValue, currentSyncedAsaasValue }`.

### `admin-api/update-subscription-value` (nova sub-rota)
1. Recarrega user; recalcula `totalRec` server-side (ignora cupom).
2. Chama `PUT https://api.asaas.com/v3/subscriptions/{id}` com `value` novo.
3. Valida `res.ok` e que `res.json().value === novoValor` (±0.01). Se divergir, marca erro e não persiste sync.
4. Persiste `bivvo_config_synced_asaas_value` + `_at`.
5. Log `action=sync_asaas` com before/after.

### `provision-bivvo-tenant` (modo `update`)
1. Após `callUpdateTenant` OK, valida resposta upstream (`res.ok` + tenant retornado com `id` esperado).
2. Persiste `bivvo_config_synced_bivvo = current bivvo_config` + `_at`.
3. Log `action=sync_bivvo`.

### Rollback (nova sub-rota `admin-api/rollback-bivvo-config`)
- Se `bivvo_config_previous` existir: troca `bivvo_config` ↔ `bivvo_config_previous`, log `action=rollback`. Não sincroniza automaticamente — botões de sync reaparecem.

## 4. Frontend — `src/pages/Admin.tsx` (Gestão de Assinaturas → Detalhes)

### Editor de Configuração Contratada
- Disponível para **todos** os clientes (remove restrição atual de "sem configuração").
- Modo "Visualização" por padrão; botão "Editar" abre form controlado (mesmos campos do checkout: plano, users, canais, telefonia, disparo, protagonista).
- Ao salvar: chama `save-bivvo-config`. Toast com diff resumido.
- Botões condicionais aparecem só quando as flags do backend indicarem:
  - **Atualizar Tenant Bivvo** — visível se `bivvo_config !== bivvo_config_synced_bivvo` (comparação hash server-side incluída na resposta do fetch de usuário).
  - **Atualizar Valor no Asaas** — visível se `quoteBivvo(bivvo_config).totalRec !== bivvo_config_synced_asaas_value`.
- Warning inline quando downgrade detectado (users ou canais menores que sincronizados).

### Histórico de Alterações (nova seção)
Lista de `bivvo_config_change_logs` do cliente:
- Data, autor (nome/email), badge da ação (`edit`, `sync_bivvo`, `sync_asaas`, `rollback`)
- Campos alterados (chips)
- Popover "Ver diff" com JSON before/after formatado
- Para `sync_asaas`: mostra `R$ antes → R$ depois`
- Botão "Restaurar esta versão" ao lado de entradas `edit` (dispara rollback via edge function)

### Histórico de Mudanças de Plano (nova seção, também em Detalhes da Assinatura)
Reaproveita o mesmo log filtrando por `action='edit'` **e** por mudanças em `config_after.plan !== config_before.plan`:
- Linha do tempo compacta: `STANDARD → SILVER` em 12/03/2026 por admin@x
- Fonte: mesma tabela `bivvo_config_change_logs`, query separada `WHERE user_id=? AND action='edit' AND config_before->>'plan' IS DISTINCT FROM config_after->>'plan'`.
- Renderiza acima do histórico geral, colapsável.

## 5. Detalhes técnicos

- Validação zod compartilhada entre `save-bivvo-config` e a UI (schema em `_shared/bivvo-logic.ts`, replicado no client sem importar do Deno).
- `computeConfigDiff` é a única autoridade — client apenas exibe flags recebidas.
- Rollback registra em log; não chama Bivvo/Asaas automaticamente (admin re-sincroniza manualmente).
- Toda escrita de log usa service_role dentro da edge function; nenhum insert direto do client.
- Nenhum toque em `new_deploy/` conforme solicitado.

```text
[Admin edita config]
      │
      ▼
save-bivvo-config ── update users ── insert log(edit)
      │
      ▼
Retorna flags ──► UI mostra botões condicionais
      │
      ├─► [Atualizar Bivvo] ─► provision-bivvo-tenant(update) ─► sync bivvo + log(sync_bivvo)
      └─► [Atualizar Asaas] ─► update-subscription-value ─► PUT Asaas + log(sync_asaas)
```

## 6. Ordem de implementação

1. Migração (colunas + tabela de log + RLS + grants).
2. `computeConfigDiff` em `_shared/bivvo-logic.ts`.
3. Sub-rotas em `admin-api`: `save-bivvo-config`, `update-subscription-value`, `rollback-bivvo-config`.
4. Ajuste em `provision-bivvo-tenant` para persistir sync + log.
5. UI: editor + botões condicionais + histórico geral + histórico de plano.

## Fora do escopo (declarado)

- Consolidação de `bivvo-calc.ts` duplicado (fica issue separada).
- Alterações em `new_deploy/`.
- Notificações automáticas ao cliente final.
