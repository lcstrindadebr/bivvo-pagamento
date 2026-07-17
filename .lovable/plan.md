
# Plano: renomear "Configuração Contratada" para "Setup Bivvo" e mover o campo Tenant Bivvo para dentro dele

## Análise da sugestão

Faz sentido. Hoje o admin vê dois cards separados em Detalhes da Assinatura:
- **Configuração Contratada** — plano, usuários, canais, telefonia, disparo, protagonista, com botões condicionais de sync Bivvo/Asaas e histórico.
- **Tenant Bivvo** — ID do tenant + botões Provisionar/Atualizar/Inativar via API.

Os dois tratam do mesmo domínio (a conta Bivvo do cliente): um define **o que foi contratado**, o outro **o vínculo com o tenant real na Bivvo**. Unificá-los em um único card "Setup Bivvo" reduz ruído visual, deixa clara a relação (config → tenant), e o admin passa a ver o ID do tenant no mesmo lugar em que edita a config e dispara o sync.

Nenhuma mudança de lógica de backend é necessária — só reorganização de UI.

## Escopo

Puramente frontend, em `src/pages/Admin.tsx`, no painel de Detalhes da Assinatura.

### 1. Renomear o card

- Título "Configuração Contratada" → **"Setup Bivvo"**.
- Ícone mantém o `Package`.
- Subtítulo curto opcional: "Configuração contratada + vínculo com o tenant na Bivvo".

### 2. Mover o bloco Tenant Bivvo para dentro do card Setup Bivvo

Ordem interna sugerida (de cima pra baixo):

```text
[ Setup Bivvo ]
 ├─ Tenant Bivvo (ID + Salvar)                ← movido para o topo
 │   • Status atual (badge)
 │   • ID travado quando provisionado via API
 ├─ Configuração contratada (visualização/edição)
 │   • Plano, usuários, canais, telefonia, disparo, protagonista
 │   • Botões condicionais: Atualizar Tenant Bivvo / Atualizar Valor Asaas
 ├─ Ações do tenant
 │   • Provisionar/Atualizar Tenant via API Bivvo
 │   • Inativar Conta Bivvo (quando aplicável)
 └─ Histórico de Alterações (com filtro "Só mudanças de plano")
```

Motivo da ordem: o ID do tenant é o "identificador raiz" — ver primeiro. Depois a config que alimenta esse tenant. Depois as ações que empurram config → tenant. Por fim o histórico.

### 3. Remover o card duplicado

O card antigo `TENANT BIVVO` (linhas ~1605-1695) deixa de existir como card separado — vira uma seção interna do Setup Bivvo com o mesmo conteúdo (input, botão Salvar, status, provisionar, inativar). Nenhum handler muda: `handleSaveTenant`, `handleProvisionTenant`, `handleInactivateTenant` continuam iguais.

### 4. Ajustes visuais menores

- Separadores sutis (`border-t` + `pt-3`) entre as sub-seções internas para não virar um bloco monolítico.
- Manter o mesmo tom de fundo (`bg-accent/5`) do card atual de Configuração Contratada; o Tenant Bivvo herda esse fundo.
- Botão "Atualizar Tenant Bivvo" (sync após edição de config) fica logo abaixo da config; botão "Provisionar/Atualizar Tenant via API Bivvo" (ação genérica) fica no bloco de ações — deixar rótulos distintos pra não confundir:
  - Sync pós-edição: **"Sincronizar configuração no tenant"**
  - Ação manual bruta: **"Provisionar/Atualizar tenant via API"**

### 5. Fora do escopo

- Nenhuma mudança em edge functions, banco, RLS ou lógica de sync.
- Sem mexer em `new_deploy/`.
- Histórico e botões condicionais continuam com o mesmo comportamento atual.

## Arquivos afetados

- `src/pages/Admin.tsx` — única edição.

## Riscos

Baixos. É reorganização de JSX. Único cuidado: garantir que `tenantInfo`/`tenantBivvo`/`selectedSub` continuam no mesmo escopo quando o bloco é movido — já estão no mesmo componente, então é apenas recorte e colagem.
