# Plano: melhorias em Setup Bivvo (Detalhes da Assinatura)

Escopo puramente frontend, em `src/pages/Admin.tsx`. Nenhuma mudança em edge functions, banco ou `new_deploy/`.

## 1. Salvar Tenant Bivvo com confirmação + modo edição via caneta

**Hoje:** o input do Tenant Bivvo é editável enquanto `bivvo_tenant_id` estiver vazio. Ao preencher e clicar "Salvar Tenant", o valor é gravado direto (`handleSaveTenant`). Depois, o input fica travado (`readOnly`/`disabled`) e sem botão.

**Depois:**

- **Estado local novo:** `isEditingTenant` (boolean). Inicia `false`.
- **Quando NÃO há `bivvo_tenant_id` salvo:** input editável + botão "Salvar Tenant" (fluxo atual), mas o clique em Salvar agora abre um `AlertDialog` de confirmação:
  > "Confirmar vínculo do Tenant ID `<valor>` a este cliente? Depois de salvo, o ID só poderá ser alterado clicando no ícone de edição."
  Ao confirmar → chama `handleSaveTenant`. Ao cancelar → fecha o diálogo, nada acontece.
- **Quando JÁ há `bivvo_tenant_id` salvo e `isEditingTenant === false`:** input em modo read-only mostrando o ID atual, com um pequeno **ícone de caneta** (`Pencil` do lucide) ao lado. Clique na caneta → `setIsEditingTenant(true)` (input volta a ser editável, aparece botão "Salvar Tenant" + botão "Cancelar" que reverte `tenantBivvo` para o valor original e fecha edição).
- **Ao salvar em modo edição:** mesmo `AlertDialog` de confirmação (texto ajustado para "alteração do Tenant ID de `<antigo>` para `<novo>`"). Confirmar → `handleSaveTenant` + `setIsEditingTenant(false)`.
- Remover a atual regra `apiLocked = !!tenantInfo?.bivvo_tenant_id` que bloqueia edição de forma irreversível — o lock passa a ser controlado por `isEditingTenant`.
- Texto de ajuda abaixo do campo continua, adaptado ao estado (visualização vs. edição).

Nenhuma mudança em `handleSaveTenant` em si (continua fazendo `update` direto no `users` via supabase client, como hoje).

## 2. "Ações do Tenant" habilitadas condicionalmente

**Hoje:** o botão "Provisionar/Atualizar Tenant via API Bivvo" (`handleProvisionTenant`) fica sempre habilitado (só desabilita durante loading). O botão "Inativar Conta Bivvo" aparece apenas quando há tenant provisionado e assinatura ativa, e fica embaixo, em bloco separado.

**Depois:**

- **Cálculo de disponibilidade** (memo local):
  - `hasTenantId = !!tenantInfo?.bivvo_tenant_id`
  - `hasBivvoConfigDrift` — reutiliza o mesmo indicador que hoje decide se "Atualizar Tenant Bivvo" (sync após edição de config) aparece: `!isBivvoConfigEqual(bivvoConfig, tenantInfo?.bivvo_config_synced_bivvo)`. Já existe no arquivo.
  - `tenantExistsOnBivvo` — vem de `selectedSub.bivvoStatus` (a listagem já checa a API Bivvo e classifica como "Não possui Tenant" / status válidos). Considerar "não existe no Bivvo" quando `bivvoStatus === 'Não possui Tenant'` ou quando não há `tenant_provisioned_at`.
  - `canProvisionOrUpdate = !tenantExistsOnBivvo || hasBivvoConfigDrift`
- **Botão "Provisionar/Atualizar Tenant via API"**:
  - `disabled` quando `!canProvisionOrUpdate` (além do loading atual).
  - Tooltip explicando o motivo do disable: "Tenant já existe no Bivvo e está sincronizado — nada a fazer."
  - Rótulo dinâmico: "Provisionar Tenant" quando não existe no Bivvo; "Atualizar Tenant no Bivvo" quando existe mas há drift.
- **Botão "Inativar Conta Bivvo"**:
  - Passa a ficar **ao lado** de "Provisionar/Atualizar" (mesmo `<div className="flex gap-2">`), não mais em bloco separado abaixo.
  - Mantém a condição atual de visibilidade (só quando `isBivvoActive && hasTenantId`).
  - Mantém `handleInactivateTenant` inalterado.
- Se ambos os botões ficarem indisponíveis (sem drift + tenant existe + assinatura já inativa), a seção "Ações do Tenant" mostra apenas uma linha de texto: "Nenhuma ação pendente — tenant sincronizado."

## Fora do escopo

- Não mexer em `handleSaveTenant`, `handleProvisionTenant`, `handleInactivateTenant`.
- Não alterar edge functions, migrations, RLS.
- Não redesenhar o card Setup Bivvo — só a sub-seção Tenant Bivvo e a sub-seção Ações do Tenant.

## Arquivo afetado

- `src/pages/Admin.tsx` (única edição).

## Riscos

Baixos. Adiciona um estado local (`isEditingTenant`), um `AlertDialog` (componente shadcn já usado no projeto) e refina `disabled`/layout dos botões existentes. Nenhuma mudança de fluxo backend.
