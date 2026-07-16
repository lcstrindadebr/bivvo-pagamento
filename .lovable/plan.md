## Diagnóstico

O gráfico atual "Fluxo de Caixa 360°" tenta empilhar quatro dimensões (Previsto, Recebido, Despesas e Saldo Bancário) num único `ComposedChart`. Isso está causando dois problemas:

1. **Sobrecarga visual** — três barras + uma linha por bucket, cada uma com escala e semântica diferentes, faz o olho perder informação.
2. **Dados incompletos** — o endpoint `finance-series` chama `/v3/financialTransactions` do Asaas para popular `receivedNet` e o saldo diário, mas: (a) essa rota exige body vazio em GET e alguns ambientes derrubam a chamada, (b) o extrato só retorna dados de dias com movimento, então buckets vazios ficam zerados no gráfico, (c) `bankBalance` está caindo silenciosamente para `0` quando a rota `/finance/balance` retorna erro.

Minha opinião: **sim, vale separar em gráficos dedicados**. Cada um responde uma pergunta específica e fica mais legível. Também precisamos tornar o consumo do Asaas mais robusto.

---

## Plano

### Etapa 1 — Backend robusto (`finance-series`)

Refatorar a rota para retornar 3 blocos independentes e nunca falhar silenciosamente:

- **`revenueSeries`** — por bucket: `forecastRevenue`, `receivedGross`, `receivedNet`, `asaasFees`. Fontes: `/payments?dueDate` (previsto) e `/v3/financialTransactions` (recebido real).
- **`profitSeries`** — por bucket: `receivedNet`, `expenses`, `commissions`, `netProfit`. Fontes: extrato + `finance_daily_snapshots`.
- **`balanceSeries`** — por bucket: `closingBalance` real (extrato) para passado, `projectedBalance` para futuro (ancorado no `/finance/balance` atual).
- **`meta`** — `bankBalance`, `granularity`, `warnings[]` (se alguma rota Asaas falhou, aparece aqui e vira badge no card).

Melhorias técnicas:
- Log estruturado (`console.log('[finance-series]', ...)`) para cada chamada Asaas com status HTTP.
- Retry simples (1 tentativa) para 429/5xx do Asaas.
- Fallback: se extrato falhar, `receivedNet` cai para `finance_daily_snapshots.net_revenue` (que o webhook já popula).

### Etapa 2 — Três gráficos dedicados no dashboard

Substituir o gráfico único por uma seção com 3 cards em grid responsivo:

**1. Receita: Previsto × Recebido** (BarChart)
- Barras lado a lado por bucket.
- Cinza listrado = Previsto, verde sólido = Recebido líquido.
- Tooltip mostra: previsto, recebido bruto, tarifa Asaas, recebido líquido, taxa de conversão (recebido/previsto).
- Responde: "Quanto entrou vs. quanto era esperado?"

**2. Lucro Líquido diário** (BarChart com barras +/−)
- Uma barra por bucket, verde se positivo, vermelha se negativo.
- Linha de referência em Y=0.
- Tooltip: recebido líq., despesas, comissões, lucro.
- Responde: "Em quais dias eu tive lucro/prejuízo?"

**3. Saldo Bancário evolução** (AreaChart)
- Área azul contínua, dado real do extrato até hoje, tracejado projetado para o futuro.
- Marcador no ponto "hoje".
- Tooltip: saldo, delta vs. bucket anterior.
- Responde: "Como o caixa está evoluindo?"

Layout: em desktop `grid-cols-2` com o gráfico 3 ocupando linha inteira; em mobile, empilhados. Todos respeitam o filtro de período do topo.

### Etapa 3 — Melhorias transversais

- Formatação de datas em pt-BR consistente (`dd/MM` ou `MM/aaaa`) em todos os eixos e tooltips.
- Ticks do Y compactos (`R$1,2k`, `R$12k`, `R$1,5M`).
- Badge de "dados parciais" no header do card quando `warnings[]` do backend não estiver vazio.
- Botão "Atualizar" pequeno no header de cada gráfico para refazer só aquela série (útil pra reconciliar).

---

## Detalhes técnicos

- Nenhuma alteração de schema. `finance_daily_snapshots` continua servindo de fallback.
- `finance-series` passa a retornar `{ revenueSeries, profitSeries, balanceSeries, meta }` — o componente do dashboard consome cada série no gráfico correspondente.
- Recharts já está no projeto; só adicionamos um `AreaChart` (import direto do pacote).
- Tempo estimado: backend ~30 min, frontend ~40 min.

## Pergunta antes de codar

Você prefere manter **um card único** com abas ("Receita" / "Lucro" / "Saldo") para economizar espaço, ou **três cards em grid** aparecendo simultaneamente? Grid é melhor pra análise cruzada; abas é melhor pra foco.
