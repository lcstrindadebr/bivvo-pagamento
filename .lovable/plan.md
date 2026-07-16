
## Minha opinião sobre as sugestões

As 4 mudanças fazem muito sentido e se complementam:

1. **Clientes inadimplentes** — hoje o dashboard mostra apenas o **valor total** em atraso (card "Cobranças em Atraso"), mas não *quem* está devendo. Ter a lista nominal é essencial para acionar cobrança manual (WhatsApp/e-mail). ✅
2. **Snapshot financeiro inteligente** — hoje o dashboard busca tudo em tempo real na API do Asaas a cada carregamento. Isso é lento, custa rate-limit e **impede análise histórica** (não dá pra ver "lucro de março"). Criar uma tabela `finance_snapshots` (ou similar) alimentada pelo webhook + um job diário resolve isso e é pré-requisito real para os gráficos do item 4. ✅ Forte concordância.
3. **Remover Conversão Global e trocar por Lucro Líquido** — concordo. Conversão global (cliques totais ÷ vendas) é métrica de afiliado, não de finanças. Lucro Líquido = Receita líquida − Despesas − Comissões pagas é o KPI principal que hoje falta. ✅
4. **Gráficos Receita × Despesas e Fluxo de Caixa** — essenciais. Recomendo usar Recharts (já é o padrão do shadcn) e respeitar o **período selecionado no topo do dashboard** (Hoje / 7d / 30d / Mês / Personalizado), com granularidade automática: ≤2 dias = por hora, ≤60 dias = por dia, >60 dias = por mês.

**Um ponto que quero validar antes de codar:** o "Saldo Bancário" e "Valor Recebido" hoje já vêm do Asaas em tempo real. Faz sentido continuarmos consultando Asaas *live* para os cards de topo e usar a nova tabela **só** para série histórica (gráficos + Lucro Líquido acumulado)? É o caminho mais barato e mantém o dashboard "vivo".

---

## Plano

### Etapa 1 — Backend: armazenamento inteligente de finanças

Criar duas estruturas novas no banco:

- **`finance_daily_snapshots`** (uma linha por dia)
  - `date` (unique), `gross_revenue`, `net_revenue`, `expenses_total`, `affiliate_commissions_paid`, `net_profit`, `refunds`, `chargebacks`, `active_subscriptions`, `overdue_value`, `created_at`, `updated_at`.
- **`finance_events`** (log append-only para auditar de onde vem cada valor)
  - `event_type` (`payment_received`, `payment_refunded`, `commission_paid`, `expense_recorded`, `chargeback`), `reference_id`, `amount`, `occurred_at`, `metadata jsonb`.

Preenchimento em 3 fontes, todas idempotentes:

1. **Webhook `asaas-webhook`** — a cada evento (`PAYMENT_RECEIVED`, `PAYMENT_REFUNDED`, `PAYMENT_CHARGEBACK_REQUESTED`, `PAYMENT_OVERDUE`), insere em `finance_events` e faz upsert incremental no snapshot do dia.
2. **Triggers já existentes de `affiliate_commissions` e `expenses`** — passam a inserir também em `finance_events` (só adicionar 2 linhas nas functions atuais).
3. **Backfill inicial** — edge function `finance-backfill` que varre pagamentos, comissões e despesas dos últimos 12 meses e reconstrói os snapshots. Roda uma vez após o deploy.

RLS: só admin lê/escreve; edge functions usam `service_role`.

### Etapa 2 — Endpoint agregador

Nova ação no `admin-api`: `finance-series` que recebe `start`, `end`, `granularity` (`hour`|`day`|`month`) e retorna:

```json
{
  "series": [{ "bucket": "2026-07-01", "revenue": 3200, "expenses": 800, "commissions": 400, "netProfit": 2000, "cashFlow": 2000 }, ...],
  "totals": { "revenue": ..., "expenses": ..., "netProfit": ... }
}
```

Também estender `finance-stats` existente para:
- Devolver `netProfit` (Receita líquida − Despesas − Comissões pagas) no período.
- Devolver `overdueCustomers`: lista `[{ name, email, whatsapp, amount, dueDate, asaas_payment_id }]` — puxada do Asaas (`status=OVERDUE`) e cruzada com `users` pelo `asaas_customer_id`.

### Etapa 3 — UI: novo Dashboard

No `AdminFinanceDashboard.tsx`:

- **Remover** o card "Conversão Global".
- **Adicionar** card **Lucro Líquido** (verde/vermelho conforme sinal, com `DeltaBadge` vs. período anterior).
- **Adicionar seção "Clientes Inadimplentes"** logo abaixo dos cards, antes de "Últimas Cobranças":
  - Tabela com Nome, WhatsApp, Valor, Vencimento, Dias em atraso.
  - Botões: "Copiar link de cobrança" e "Abrir WhatsApp" (mensagem pré-preenchida).
- **Adicionar 2 gráficos** (Recharts), lado a lado em desktop:
  1. **Receita × Despesas** (BarChart agrupado — barras verdes e vermelhas por bucket).
  2. **Fluxo de Caixa acumulado** (AreaChart — soma corrente de `netProfit`).
  - Granularidade automática pelo range do filtro já existente (Hoje/7d/30d/Mês/Custom).

### Etapa 4 — Testes e migração

- Backfill dispara manualmente pela tela de Admin (botão discreto em Settings).
- Verificar RLS e GRANTs em `finance_daily_snapshots` e `finance_events`.
- Atualizar `new_deploy/database_schema.sql` e adicionar `new_deploy/migrations/007_finance_snapshots.sql` para deploys externos.

---

## Detalhes técnicos

- Recharts já está no `package.json` (via shadcn `chart`), então zero dependências novas.
- `net_revenue` = `gross_revenue − asaas_fees` (o webhook do Asaas já entrega `netValue` por pagamento).
- Idempotência do webhook: usar `event_id` (já unique em `asaas_webhooks`) como chave de deduplicação antes de escrever em `finance_events`.
- Cálculo do delta comparativo dos cards continua igual — só passa a incluir `netProfit`.

## Pergunta antes de começar

Confirma o approach híbrido? (Asaas *live* para saldo/recebido do topo, tabela nova só para série histórica e Lucro Líquido acumulado.) Se preferir tudo servido da tabela local, também dá — só fica levemente defasado entre webhooks.
