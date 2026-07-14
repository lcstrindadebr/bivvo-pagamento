## Plano de melhorias — Dashboard Financeiro

Após revisar `admin-api/finance-stats` e `AdminFinanceDashboard.tsx`, identifiquei 8 pontos que hoje geram distorção nos números, lentidão ou informação pouco útil. Abaixo o que cada um significa e como resolver.

---

### 1. LTV incorreto
**Hoje:** `ltv = paidValue / activeSubscriptions` — divide o recebido do período pelo número de assinaturas ativas. Isso não é LTV, é ticket médio filtrado.
**Melhoria:** LTV = `MRR médio por cliente / churn rate`. Se churn for 0, exibir "—". Ticket médio vira métrica separada.

### 2. Churn calculado com base errada
**Hoje:** compara `affiliate_sales` cancelados x ativas do Asaas — bases diferentes.
**Melhoria:** usar apenas Asaas. Churn = `assinaturas que passaram para INACTIVE/EXPIRED nos últimos 30 dias / ativas no início do período`. Cache do total no início do mês.

### 3. Valor Recebido usa `value` (bruto) em vez de `netValue`
**Hoje:** soma o valor bruto da cobrança, ignorando taxas do Asaas.
**Melhoria:** exibir dois cartões — **Recebido Bruto** (`value`) e **Recebido Líquido** (`netValue`). Caixa livre passa a usar líquido.

### 4. Caixa Livre mistura regimes contábeis
**Hoje:** recebido do período − todas as despesas do período (competência) + comissões (também por competência).
**Melhoria:** manter tudo em regime de caixa: recebido líquido no período − despesas pagas no período − comissões pagas no período. Comissões pendentes viram cartão separado ("Passivo").

### 5. Retidas vs a pagar de afiliados por data fixa
**Hoje:** regra "≤ 7 dias = retida, > 7 dias = a pagar" baseada em `created_at` da comissão.
**Melhoria:** usar o campo `release_date` da comissão (se existir) ou `created_at + release_days` configurável em `settings`. Cartão passa a mostrar "Liberadas hoje" e "A liberar em X dias".

### 6. Duas chamadas paginadas ao Asaas por request
**Hoje:** para cada abertura do dashboard percorremos `/payments` por `dateCreated` **e** por `paymentDate`, mais `/subscriptions` inteiro. Em conta com muitos registros isso passa dos 3–5s.
**Melhoria:**
- Cachear resposta do `finance-stats` por 60s (in-memory na edge function).
- Rodar as três paginações em paralelo com `Promise.all`.
- Para o gráfico de série temporal, computar já na edge function os buckets diários e retornar apenas o resumo (hoje volta todo o array `payments`).

### 7. MRR conta todas as ACTIVE, inclusive canceladas neste mês
**Hoje:** soma `value` de toda ACTIVE — não considera ciclo (algumas são semanais/anuais).
**Melhoria:** normalizar para mensal:
```text
WEEKLY: value * 4.33
BIWEEKLY: value * 2.17
MONTHLY: value
BIMONTHLY: value / 2
QUARTERLY: value / 3
SEMIANNUALLY: value / 6
YEARLY: value / 12
```

### 8. Sem série temporal e sem comparação com período anterior
**Hoje:** apenas números agregados do intervalo. Não dá pra ver tendência.
**Melhoria:**
- Cartão principal mostra variação `%` vs período anterior de mesmo tamanho.
- Novo gráfico de linha (recharts já está no projeto) com Recebido / Pendente por dia.
- Top 5 clientes por valor recebido no período.

---

### Estrutura técnica

```text
supabase/functions/admin-api/index.ts
  ├─ finance-stats
  │   ├─ fetchAllSubscriptions()  (Promise.all)
  │   ├─ fetchPayments(dateCreated + paymentDate)  (Promise.all)
  │   ├─ computeMrrNormalized(subs)
  │   ├─ computeChurn(subs, 30d)
  │   ├─ computeSeries(payments)    ← novo, buckets diários
  │   ├─ computePreviousPeriod()    ← novo, mesmo range deslocado
  │   └─ cache em Map (chave = dateStart|dateEnd, TTL 60s)
  │
src/components/admin/AdminFinanceDashboard.tsx
  ├─ Cartões: adicionar "Líquido", "Δ vs período anterior"
  ├─ Novo gráfico linha (Recharts <LineChart>)
  └─ Nova tabela "Top clientes"
```

### Ordem de execução sugerida
1. Correções de cálculo (itens 1, 2, 3, 7) — impacto imediato, baixo risco.
2. Caixa livre e regra de comissões (4, 5) — precisa alinhar com regra de negócio.
3. Performance/cache + paralelização (6).
4. UI: comparação e série temporal (8).

Quer que eu comece por todos ou prefere priorizar algum grupo? Se aprovar, sigo pelos itens 1–3 e 7 primeiro (correções críticas de número).