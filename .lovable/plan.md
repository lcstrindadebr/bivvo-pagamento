## Plano — Melhorias no módulo de Tarefas

Revisei `src/components/admin/AdminTasks.tsx` e a tabela `public.tasks`. Hoje o módulo já tem Kanban + Lista + delegação, mas há vários campos criados no banco que não são usados na UI e faltam recursos básicos de gestão. Abaixo o que pode melhorar, agrupado por prioridade.

---

### 1. Usar os campos que já existem no banco

A tabela `tasks` tem `description`, `priority` (low/medium/high) e `due_date` — nenhum aparece na tela hoje.

- Modal de "Nova tarefa" com título, descrição, responsável, prioridade e data de vencimento.
- Card do Kanban mostra badge de prioridade colorida e data de vencimento (vermelho se atrasada).
- Linha da Lista ganha colunas Prioridade e Vencimento (ordenáveis).

### 2. Edição de tarefa

Hoje só dá para trocar status (drag) e responsável. Não dá para editar título/descrição depois de criar.

- Clique no card → modal de detalhes/edição com todos os campos.
- Suporte a marcar como concluída direto no card do Kanban (checkbox no canto).
- adicionar subtarefas

### 3. Filtros e busca

Com o tempo a lista fica longa. Adicionar:

- Campo de busca por título/descrição.
- Filtros por responsável, prioridade e status.
- Toggle "Mostrar concluídas" (por padrão esconde as `done` com mais de 7 dias).

### 4. Ordenação e agrupamento no Kanban

- Dentro de cada coluna, ordenar por prioridade (alta → baixa) e depois por vencimento.
- Contador da coluna mostra `pendentes / total`.
- Coluna "Concluído" limita a 20 mais recentes (link "ver todas").

### 5. Notificações e responsabilidade

- Ao delegar, registrar em `audit_logs` (já existe a tabela) quem delegou para quem.
- Badge no menu lateral do admin com contagem de tarefas atribuídas ao usuário logado e ainda não concluídas.
- Destaque visual nos cards atribuídos ao próprio usuário ("Minhas tarefas").

### 6. Realtime

Duas pessoas editando o Kanban hoje não veem update uma da outra sem F5.

- Assinar canal realtime da tabela `tasks` e recarregar no `INSERT/UPDATE/DELETE`.

### 7. UX do drag-and-drop

- Feedback visual da coluna alvo (borda destacada) enquanto arrasta.
- Suporte a mover no mobile (hoje `draggable` HTML5 não funciona bem em touch) — usar `@dnd-kit/core`, que é leve e já é o padrão do shadcn.

### 8. Pequenos ajustes

- Loading skeleton enquanto carrega tarefas.
- Empty state ilustrado quando não há nenhuma tarefa.
- Confirmação antes de excluir (`AlertDialog` do shadcn).
- Atalho `Ctrl+Enter` no modal para salvar.

---

### Estrutura técnica

```text
src/components/admin/AdminTasks.tsx
  ├─ estado: filters { search, assignee, priority, status, showDone }
  ├─ TaskDialog.tsx           ← novo, criar/editar (título, desc, prioridade, prazo, responsável)
  ├─ TaskCard.tsx             ← extrai card do kanban
  ├─ useTasksRealtime()       ← hook que assina canal 'tasks'
  └─ dnd: substituir HTML5 por @dnd-kit/core + @dnd-kit/sortable
```

Banco: nenhuma migration nova é necessária — os campos já existem em `public.tasks`.

### Ordem sugerida

1. Itens 1 e 2 (campos + edição) — desbloqueia uso real.
2. Item 3 (filtros/busca) — organização.
3. Itens 4 e 8 (ordenação + polish).
4. Itens 5, 6, 7 (auditoria, realtime, dnd mobile) — melhorias avançadas.

Quer que eu execute tudo, ou prefere priorizar só 1 → 3 primeiro?