## Plano — Melhorias em Configurações

Hoje `AdminSettings.tsx` gerencia apenas **um campo** (`site_url`), e a tabela `settings` é um simples key/value. Proponho evoluir a tela em três frentes: mais campos úteis, organização por abas, e conexão com integrações que hoje ficam em variáveis de ambiente ou hard-coded.

---

### 1. Estrutura em abas
Uma única tela com todos os grupos vira bagunça. Dividir em abas (`Tabs` do shadcn):

- **Geral** — identidade, domínio, contatos.
- **Marca / Aparência** — logo, favicon, cores.
- **Notificações** — e-mail/webhooks.
- **Integrações** — Asaas, analytics.

### 2. Aba Geral
- Nome do site / razão social.
- E-mail de suporte (exibido no checkout e rodapé).
- WhatsApp de suporte (link `wa.me`).
- CNPJ / endereço (usado em recibos e rodapé LGPD).
- `site_url` (já existe) — manter aqui.
- Fuso horário padrão para relatórios.

### 3. Aba Marca / Aparência
- Upload de **logo claro** e **logo escuro** (bucket `marketing`).
- Upload de **favicon**.
- Cor primária / accent (color picker) — grava CSS vars no `:root` via hook.
- Alternar tema padrão (claro/escuro/sistema).
- Preview ao vivo do resultado.

### 4. Aba Notificações
- E-mail do remetente (from).
- E-mails que recebem cópia de novas vendas / cancelamentos.
- URL de webhook para eventos internos (opcional).
- Toggle "enviar e-mail ao criar tarefa delegada".

### 5. Aba Integrações
- **Asaas**: mostrar status da chave (mascarada), ambiente (sandbox/prod), URL do webhook para copiar. **Não** editar a chave pela UI — apenas indicar se está configurada, com botão "atualizar" que abre modal explicando que a chave é um secret.
- Google Analytics / Meta Pixel — IDs (públicos, seguros no client).
- Reset/limpeza do cache de 60s da edge function `finance-stats`.

### 6. UX & robustez
- Validação com `zod` + `react-hook-form` para cada aba.
- Salvar por aba (não tudo de uma vez) — botão fica no fim de cada painel.
- Badge "não salvo" no título da aba quando há mudanças pendentes.
- Toast + refetch por aba (não invalida tudo).
- Loading skeleton por aba.
- Confirmar antes de sair da aba se houver alterações não salvas (`useBeforeUnload`).

### 7. Auditoria
Toda alteração em `settings` grava linha em `audit_logs` (`action='settings.update'`, `old_data`, `new_data`). Já existe a tabela, falta o hook.

---

### Estrutura técnica

```text
src/components/admin/settings/
  ├─ AdminSettings.tsx           ← shell com Tabs
  ├─ tabs/GeneralTab.tsx
  ├─ tabs/BrandingTab.tsx
  ├─ tabs/NotificationsTab.tsx
  └─ tabs/IntegrationsTab.tsx

src/hooks/
  ├─ useSiteSettings.ts          (já existe, ampliar tipagem)
  └─ useSaveSetting.ts           ← wrapper único (upsert + audit_log + toast)
```

Modelo de dados: **manter `settings` key/value** — sem migration nova. Cada campo vira uma chave (`support_email`, `brand_logo_url`, etc). Valor sempre `text` (JSON serializado quando estruturado).

Política RLS atual já permite:
- leitura pública apenas de `site_url` (para o checkout público continuar funcionando);
- leitura/escrita completa para admins (via `has_role`).

Precisa adicionar mais uma chave pública se algum campo (ex.: `brand_logo_url`, `support_whatsapp`) tiver que aparecer para visitantes anônimos no checkout. Faço isso ampliando a policy `Public can read site_url` para uma whitelist de chaves.

### Ordem sugerida
1. Reestruturar em abas + aba **Geral** (impacto imediato).
2. Aba **Marca** com upload de logo/favicon.
3. Aba **Notificações**.
4. Aba **Integrações** + auditoria.

Quer que eu execute tudo ou prefere priorizar 1–2 primeiro?
