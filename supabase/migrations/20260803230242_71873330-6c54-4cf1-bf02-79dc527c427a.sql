INSERT INTO public.plans (slug, name, price, price_recurring, description, features, popular, sort_order, active, gradient, icon)
VALUES 
('standard', 'Standard', 349.00, 349.00, 'Ideal para pequenas equipes.', '[{"text": "Até 3 usuários", "included": true}, {"text": "Canais Ilimitados", "included": true}, {"text": "Suporte por Chat", "included": true}]', false, 1, true, 'from-blue-500 to-indigo-500', 'Package'),
('silver', 'Silver', 549.00, 549.00, 'Para empresas em crescimento.', '[{"text": "Até 6 usuários", "included": true}, {"text": "Canais Ilimitados", "included": true}, {"text": "Suporte Prioritário", "included": true}]', true, 2, true, 'from-blue-600 to-cyan-500', 'Zap'),
('pro', 'Pro', 949.00, 949.00, 'Solução completa para grandes operações.', '[{"text": "Até 12 usuários", "included": true}, {"text": "Canais Ilimitados", "included": true}, {"text": "Gerente de Conta", "included": true}]', false, 3, true, 'from-indigo-600 to-purple-600', 'Shield')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price,
  price_recurring = EXCLUDED.price_recurring,
  description = EXCLUDED.description,
  features = EXCLUDED.features,
  popular = EXCLUDED.popular,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  gradient = EXCLUDED.gradient,
  icon = EXCLUDED.icon;