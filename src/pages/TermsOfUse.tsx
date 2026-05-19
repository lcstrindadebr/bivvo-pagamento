import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ScrollText, ShieldCheck, FileText, UserCheck, Gavel, Ban, AlertCircle, HelpCircle, Lock, Database, Clock, Zap, MessageSquare } from 'lucide-react';

const TermsOfUse = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="mb-8 hover:bg-accent transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Home
        </Button>

        <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-primary/10 rounded-lg">
              <ScrollText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">TERMOS E CONDIÇÕES DE USO – BIVVO</h1>
              <p className="text-sm text-muted-foreground mt-1">Última atualização: 16/05/2026</p>
            </div>
          </div>

          <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-muted-foreground">
            <div className="bg-accent/50 p-4 rounded-lg border border-border text-foreground/90 italic">
              Estes Termos e Condições de Uso (“Termos”) regulam a contratação, o acesso e a utilização da plataforma Bivvo (“Bivvo” ou “Plataforma”), solução tecnológica de atendimento, gestão de conversas, automações, disparos, integrações e centralização de canais de comunicação, disponibilizada pela BivvoHub, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 61.912.973/0001-91, com sede em Rua Waldemar Falcão, 979, Edifício Horto Office – Sala 201, Horto Florestal V CEP: 40295010, Salvador – BA, doravante denominada simplesmente Bivvo.
            </div>

            <p>
              Ao contratar, acessar, ativar, configurar ou utilizar a Plataforma, o Cliente declara que leu, compreendeu e concorda integralmente com estes Termos, obrigando-se a cumpri-los e a fazer com que seus usuários, colaboradores, representantes, prepostos, parceiros e terceiros autorizados também os cumpram.
            </p>

            <div className="flex items-start gap-3 p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
              <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
              <p className="m-0 font-medium">Caso o Cliente não concorde com quaisquer disposições destes Termos, não deverá contratar, acessar ou utilizar a Plataforma.</p>
            </div>

            <section>
              <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground mb-4">
                <FileText className="h-5 w-5 text-primary" />
                1. DEFINIÇÕES IMPORTANTES
              </h2>
              <p>Para fins de interpretação destes Termos, as expressões abaixo terão os seguintes significados:</p>
              <ul className="space-y-2">
                <li><strong>Bivvo:</strong> plataforma tecnológica de atendimento, comunicação, automação, gestão de conversas, disparos e integrações multicanais, fornecida pela empresa responsável pela sua operação.</li>
                <li><strong>Cliente ou Contratante:</strong> pessoa física ou jurídica que contrata a utilização da Plataforma Bivvo, sendo responsável pelo pagamento, pela gestão dos usuários, pela configuração da conta e pelo uso da Plataforma.</li>
                <li><strong>Usuário:</strong> pessoa autorizada pelo Cliente a acessar e utilizar a Plataforma, incluindo administradores, gestores, supervisores, atendentes, operadores, vendedores, colaboradores, prestadores de serviço ou terceiros autorizados.</li>
                <li><strong>Usuário Administrador:</strong> usuário com permissões administrativas, responsável por criar, editar, excluir e gerenciar outros usuários, permissões, integrações, canais, departamentos, fluxos, automações, templates, campanhas e demais configurações da conta.</li>
                <li><strong>Conta:</strong> ambiente individual do Cliente dentro da Plataforma, por meio do qual são gerenciados usuários, canais, conversas, contatos, automações, permissões e demais funcionalidades contratadas.</li>
                <li><strong>Plataforma:</strong> ambiente tecnológico Bivvo, acessado pela internet, no modelo SaaS, destinado à centralização e gestão de canais de atendimento, automações, campanhas, disparos, conversas e integrações.</li>
                <li><strong>Serviços:</strong> disponibilização da Plataforma, funcionalidades contratadas, suporte técnico, atualizações, recursos de integração, automação e demais serviços vinculados ao plano contratado.</li>
                <li><strong>Plano:</strong> pacote comercial contratado pelo Cliente, com funcionalidades, limites, valores, usuários, canais, módulos, integrações e condições específicas.</li>
                <li><strong>Canais de Comunicação:</strong> meios de comunicação integrados ou passíveis de integração à Plataforma, incluindo, mas não se limitando a WhatsApp, WhatsApp Business Platform, Instagram, Facebook, e-mail, SMS, telefonia, VoIP, webchat, LinkedIn, OLX, Mercado Livre, TikTok e outros canais disponíveis.</li>
                <li><strong>Meta:</strong> empresa responsável por produtos e serviços como WhatsApp, WhatsApp Business Platform, Instagram, Facebook, Messenger, Business Manager, contas comerciais, aplicativos e APIs relacionadas.</li>
                <li><strong>Serviços de Terceiros:</strong> plataformas, APIs, sistemas, aplicativos, provedores, canais, ferramentas ou serviços externos à Bivvo, incluindo, mas não se limitando a Meta, WhatsApp, Instagram, Facebook, provedores de e-mail, operadoras de telefonia, serviços de SMS, CRMs, ERPs, gateways de pagamento, ferramentas de automação, inteligência artificial, servidores, APIs externas e demais integrações.</li>
                <li><strong>Dados do Cliente:</strong> dados, contatos, mensagens, arquivos, conversas, leads, históricos, campanhas, fluxos, templates, prompts, automações e informações inseridas, importadas, tratadas, geradas ou trafegadas pelo Cliente na Plataforma.</li>
                <li><strong>Titular de Dados:</strong> pessoa natural a quem se referem os dados pessoais tratados na Plataforma.</li>
                <li><strong>Controlador:</strong> pessoa física ou jurídica responsável por tomar decisões sobre o tratamento de dados pessoais. Em regra, o Cliente atua como Controlador dos dados de seus contatos, leads, clientes finais e usuários próprios.</li>
                <li><strong>Operador:</strong> pessoa jurídica que trata dados pessoais em nome do Controlador. Em regra, a Bivvo atua como Operadora dos dados tratados em nome do Cliente, ressalvados os dados cadastrais, financeiros, contratuais e operacionais tratados pela Bivvo como Controladora.</li>
              </ul>
            </section>

            <section>
              <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground mb-4">
                <UserCheck className="h-5 w-5 text-primary" />
                2. NATUREZA E ACEITAÇÃO DOS TERMOS
              </h2>
              <div className="space-y-4">
                <p>2.1. Estes Termos possuem natureza de contrato eletrônico e vinculam juridicamente a Bivvo e o Cliente, regulando a contratação, o acesso, a utilização da Plataforma, as responsabilidades das partes e as condições comerciais e operacionais aplicáveis.</p>
                <p>2.2. A aceitação destes Termos ocorre mediante qualquer uma das seguintes situações: contratação da Plataforma; pagamento de plano; criação de conta; acesso à Plataforma; configuração de canais ou uso efetivo de qualquer funcionalidade.</p>
                <p>2.3. O Cliente declara que a pessoa responsável pela contratação possui poderes suficientes para representar a empresa ou organização contratante.</p>
                <p>2.4. Estes Termos substituem quaisquer propostas, mensagens, conversas, entendimentos ou acordos anteriores.</p>
                <p>2.5. A Bivvo poderá atualizar estes Termos periodicamente, especialmente em razão de alterações legais, regulatórias, comerciais, técnicas ou operacionais.</p>
              </div>
            </section>

            <section>
              <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground mb-4">
                <Zap className="h-5 w-5 text-primary" />
                3. OBJETO
              </h2>
              <p>3.1. O objeto destes Termos é regular a disponibilização da Plataforma Bivvo ao Cliente, no modelo SaaS, para gestão, centralização e automação de comunicações empresariais em múltiplos canais.</p>
              <p>3.2. A Plataforma permite, conforme plano: centralização de atendimentos, gestão de conversas, conexão com múltiplos canais (WhatsApp, Instagram, Facebook, etc.), uso de templates, disparos ativos, automações, chatbots e relatórios métricos.</p>
            </section>

            <section>
              <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground mb-4">
                <Lock className="h-5 w-5 text-primary" />
                4. MODELO SAAS E LICENÇA DE USO
              </h2>
              <p>4.1. A Plataforma é disponibilizada no modelo software como serviço (SaaS), mediante acesso remoto pela internet, sem transferência de propriedade intelectual ou código-fonte.</p>
              <p>4.2. O Cliente recebe uma licença limitada, temporária, revogável e não exclusiva exclusivamente para suas atividades empresariais.</p>
              <p>4.3. É vedado ao Cliente realizar engenharia reversa, copiar, vender, sublicenciar ou utilizar a Plataforma para criar produtos concorrentes.</p>
            </section>

            <section>
              <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground mb-4">
                <ShieldCheck className="h-5 w-5 text-primary" />
                6. RESPONSABILIDADES DO CLIENTE
              </h2>
              <p>6.1. O Cliente é o único e exclusivo responsável pelo uso da Plataforma, pelas mensagens enviadas, pelos dados tratados e pelas automações criadas.</p>
              <p>6.2. O Cliente compromete-se a utilizar a Plataforma de forma lícita, ética e em conformidade com a LGPD (Lei nº 13.709/2018) e o Marco Civil da Internet.</p>
              <p>6.5. O Cliente não poderá utilizar a Plataforma para praticar spam, divulgar conteúdo falso, promover golpes ou violar direitos de terceiros.</p>
            </section>

            <section>
              <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground mb-4">
                <MessageSquare className="h-5 w-5 text-primary" />
                7. WHATSAPP, META E CANAIS OFICIAIS
              </h2>
              <p>7.1. A utilização de WhatsApp e Instagram depende de regras, permissões e disponibilidades da Meta. A Bivvo não possui controle sobre bloqueios de números ou suspensões de contas decididas pela Meta.</p>
              <p>7.4. O Cliente é exclusivamente responsável por cumprir as políticas comerciais e de mensagens da Meta.</p>
            </section>

            <section>
              <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground mb-4">
                <Database className="h-5 w-5 text-primary" />
                17. PRIVACIDADE, LGPD E PROTEÇÃO DE DADOS
              </h2>
              <p>17.1. A Bivvo compromete-se a tratar dados pessoais em conformidade com a LGPD.</p>
              <p>17.2. O Cliente atua como Controlador dos dados de seus contatos, sendo responsável por definir finalidades e bases legais para o tratamento de dados.</p>
              <p>17.3. A Bivvo atua como Operadora, tratando dados em nome do Cliente conforme suas instruções lícitas.</p>
            </section>

            <section>
              <h2 className="flex items-center gap-2 text-xl font-semibold text-foreground mb-4">
                <Gavel className="h-5 w-5 text-primary" />
                16. LIMITAÇÃO DE RESPONSABILIDADE
              </h2>
              <p>16.1. A Bivvo não será responsável por danos decorrentes de uso indevido pelo Cliente, bloqueios impostos por terceiros ou falhas de internet do Cliente.</p>
              <p>16.2. A responsabilidade da Bivvo fica limitada aos valores efetivamente pagos pelo Cliente nos últimos 3 meses anteriores ao evento reclamado.</p>
            </section>

            <section className="border-t border-border pt-8 mt-12 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <h3 className="font-bold text-foreground">Bivvo</h3>
                  <p>CNPJ: 61.912.973/0001-91</p>
                  <p>Endereço: Rua Waldemar Falcão, 979, Edifício Horto Office, Sala 201, Horto Florestal, CEP 40295-010, Salvador/BA</p>
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-foreground">Suporte e DPO</h3>
                  <p>E-mail: lgpd@bivvo.com.br</p>
                  <div className="flex items-center gap-2 text-primary">
                    <HelpCircle className="h-4 w-4" />
                    <span>Dúvidas sobre estes termos? Entre em contato.</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="mt-8 text-center text-muted-foreground text-sm">
          <p>© 2026 Bivvo. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfUse;
