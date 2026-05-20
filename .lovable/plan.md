## Proposta de Melhoria de Layout - Bivvo Calculator

O objetivo é tornar a calculadora mais intuitiva e limpa, agrupando logicamente as configurações, aprimorando o feedback visual e destacando melhor as informações de custo recorrente e promocional.

### Principais mudanças:
1.  **Refinamento da UI**:
    *   Substituir botões de seleção de plano por cartões mais limpos e focados.
    *   Melhorar a hierarquia visual (tamanhos de fonte e espaçamento).
    *   Adicionar um seletor de "ajuda" para o modo de exibição.
2.  **Organização Lógica**:
    *   Dividir a calculadora em três seções claras: **Configuração de Plano**, **Personalização (Usuários e Canais)** e **Resumo do Investimento**.
    *   Usar ícones mais consistentes para representar os recursos.
3.  **Feedback Visual**:
    *   Melhorar a animação dos valores (Total 1º mês vs. Recorrente).
    *   Utilizar cores de destaque (accent) apenas para o preço final e botões de ação (CTA).

### Detalhes Técnicos:
*   Substituir o layout atual `grid-cols-[1fr_360px]` por um layout um pouco mais flexível se necessário (ex: `flex-col` em mobile, `grid` em desktop).
*   Ajustar a exibição da lista de Canais Adicionais (Grid flexível).
*   Manter a funcionalidade de "Proposta" e "Checkout" intacta.

---
**Esta proposta melhora a legibilidade e conversão da ferramenta.**
Pode prosseguir com a implementação?