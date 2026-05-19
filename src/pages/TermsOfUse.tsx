import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ScrollText } from 'lucide-react';

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

          <div className="prose prose-slate dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-line">
            {`Estes Termos e Condições de Uso (“Termos”) regulam a contratação, o acesso e a utilização da plataforma Bivvo (“Bivvo” ou “Plataforma”), solução tecnológica de atendimento, gestão de conversas, automações, disparos, integrações e centralização de canais de comunicação, disponibilizada pela BivvoHub, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 61.912.973/0001-91, com sede em Rua Waldemar Falcão, 979, Edifício Horto Office – Sala 201, Horto Florestal V CEP: 40295010, Salvador – BA, doravante denominada simplesmente Bivvo.

Ao contratar, acessar, ativar, configurar ou utilizar a Plataforma, o Cliente declara que leu, compreendeu e concorda integralmente com estes Termos, obrigando-se a cumpri-los e a fazer com que seus usuários, colaboradores, representantes, prepostos, parceiros e terceiros autorizados também os cumpram.

Caso o Cliente não concorde com quaisquer disposições destes Termos, não deverá contratar, acessar ou utilizar a Plataforma.

1. DEFINIÇÕES IMPORTANTES

Para fins de interpretação destes Termos, as expressões abaixo terão os seguintes significados:

Bivvo: plataforma tecnológica de atendimento, comunicação, automação, gestão de conversas, disparos e integrações multicanais, fornecida pela empresa responsável pela sua operação.

Cliente ou Contratante: pessoa física ou jurídica que contrata a utilização da Plataforma Bivvo, sendo responsável pelo pagamento, pela gestão dos usuários, pela configuração da conta e pelo uso da Plataforma.

Usuário: pessoa autorizada pelo Cliente a acessar e utilizar a Plataforma, incluindo administradores, gestores, supervisores, atendentes, operadores, vendedores, colaboradores, prestadores de serviço ou terceiros autorizados.

Usuário Administrador: usuário com permissões administrativas, responsável por criar, editar, excluir e gerenciar outros usuários, permissões, integrações, canais, departamentos, fluxos, automações, templates, campanhas e demais configurações da conta.

Conta: ambiente individual do Cliente dentro da Plataforma, por meio do qual são gerenciados usuários, canais, conversas, contatos, automações, permissões e demais funcionalidades contratadas.

Plataforma: ambiente tecnológico Bivvo, acessado pela internet, no modelo SaaS, destinado à centralização e gestão de canais de atendimento, automações, campanhas, disparos, conversas e integrações.

Serviços: disponibilização da Plataforma, funcionalidades contratadas, suporte técnico, atualizações, recursos de integração, automação e demais serviços vinculados ao plano contratado.

Plano: pacote comercial contratado pelo Cliente, com funcionalidades, limites, valores, usuários, canais, módulos, integrações e condições específicas.

Canais de Comunicação: meios de comunicação integrados ou passíveis de integração à Plataforma, incluindo, mas não se limitando a WhatsApp, WhatsApp Business Platform, Instagram, Facebook, e-mail, SMS, telefonia, VoIP, webchat, LinkedIn, OLX, Mercado Livre, TikTok e outros canais disponíveis.

Meta: empresa responsável por produtos e serviços como WhatsApp, WhatsApp Business Platform, Instagram, Facebook, Messenger, Business Manager, contas comerciais, aplicativos e APIs relacionadas.

Serviços de Terceiros: plataformas, APIs, sistemas, aplicativos, provedores, canais, ferramentas ou serviços externos à Bivvo, incluindo, mas não se limitando a Meta, WhatsApp, Instagram, Facebook, provedores de e-mail, operadoras de telefonia, serviços de SMS, CRMs, ERPs, gateways de pagamento, ferramentas de automação, inteligência artificial, servidores, APIs externas e demais integrações.

Dados do Cliente: dados, contatos, mensagens, arquivos, conversas, leads, históricos, campanhas, fluxos, templates, prompts, automações e informações inseridas, importadas, tratadas, geradas ou trafegadas pelo Cliente na Plataforma.

Titular de Dados: pessoa natural a quem se referem os dados pessoais tratados na Plataforma.

Controlador: pessoa física ou jurídica responsável por tomar decisões sobre o tratamento de dados pessoais. Em regra, o Cliente atua como Controlador dos dados de seus contatos, leads, clientes finais e usuários próprios.

Operador: pessoa jurídica que trata dados pessoais em nome do Controlador. Em regra, a Bivvo atua como Operadora dos dados tratados em nome do Cliente, ressalvados os dados cadastrais, financeiros, contratuais e operacionais tratados pela Bivvo como Controladora.

2. NATUREZA E ACEITAÇÃO DOS TERMOS

2.1. Estes Termos possuem natureza de contrato eletrônico e vinculam juridicamente a Bivvo e o Cliente, regulando a contratação, o acesso, a utilização da Plataforma, as responsabilidades das partes e as condições comerciais e operacionais aplicáveis.

2.2. A aceitação destes Termos ocorre mediante qualquer uma das seguintes situações:

I. contratação da Plataforma;

II. pagamento de plano, assinatura, implantação, setup ou qualquer valor relacionado aos Serviços;

III. criação de conta ou usuário administrador;

IV. acesso à Plataforma;

V. configuração de canais, integrações ou automações;

VI. uso efetivo de qualquer funcionalidade da Plataforma.

2.3. O Cliente declara que a pessoa responsável pela contratação possui poderes suficientes para representar a empresa ou organização contratante. Ainda que não exista documento formal apresentado à Bivvo, o fornecimento dos dados cadastrais, a contratação e o pagamento serão considerados indícios suficientes de autorização para contratação, nos termos da boa-fé e da teoria da aparência.

2.4. Estes Termos substituem quaisquer propostas, mensagens, conversas, entendimentos ou acordos anteriores, verbais ou escritos, salvo quando houver contrato específico assinado entre as partes, hipótese em que este prevalecerá apenas naquilo que expressamente divergir destes Termos.

2.5. A Bivvo poderá atualizar estes Termos periodicamente, especialmente em razão de alterações legais, regulatórias, comerciais, técnicas, operacionais, de segurança, de infraestrutura ou de políticas de terceiros, incluindo Meta, WhatsApp, Instagram, Facebook e demais plataformas integradas.

2.6. As alterações poderão ser comunicadas por e-mail, aviso na Plataforma, mensagem em canal oficial ou publicação em página institucional. O uso continuado da Plataforma após a atualização implicará aceitação integral da nova versão.

3. OBJETO

3.1. O objeto destes Termos é regular a disponibilização da Plataforma Bivvo ao Cliente, no modelo SaaS, para gestão, centralização e automação de comunicações empresariais em múltiplos canais.

3.2. A Plataforma poderá permitir, conforme plano contratado e disponibilidade técnica:

I. centralização de atendimentos em múltiplos canais;

II. gestão de conversas por status, departamentos, filas, equipes ou usuários;

III. conexão com WhatsApp, Instagram, Facebook, e-mail, SMS, telefonia, webchat e outros canais;

IV. utilização de WhatsApp Business Platform, Cloud API, coexistência, integrações oficiais ou outras modalidades tecnicamente disponíveis;

V. criação, gestão e envio de templates de mensagens;

VI. disparos ativos, campanhas, comunicações em massa e fluxos de prospecção, quando disponíveis e permitidos;

VII. criação de automações, bots, regras, etiquetas, gatilhos e fluxos de atendimento;

VIII. integração com ferramentas externas, como CRMs, ERPs, n8n, Dify, APIs, webhooks, plataformas de inteligência artificial, gateways, bancos de dados e sistemas de terceiros;

IX. relatórios, métricas, registros, histórico de atendimentos e demais recursos operacionais;

X. gestão de usuários, permissões, departamentos, carteiras, equipes e níveis de acesso.

3.3. As funcionalidades disponíveis poderão variar conforme o Plano contratado, estágio de desenvolvimento da Plataforma, disponibilidade técnica, regras de terceiros, requisitos legais, permissões concedidas pelo Cliente e condições comerciais acordadas.

3.4. A Bivvo poderá atualizar, aprimorar, substituir, modificar, remover ou descontinuar funcionalidades da Plataforma, desde que preserve, de forma razoável, a finalidade geral dos Serviços contratados.

4. MODELO SAAS E LICENÇA DE USO

4.1. A Plataforma é disponibilizada no modelo SaaS, ou seja, software como serviço, mediante acesso remoto pela internet, sem transferência de propriedade intelectual, código-fonte, infraestrutura, banco de dados, tecnologia, marca ou qualquer ativo da Bivvo ao Cliente.

4.2. Durante a vigência da contratação e desde que esteja adimplente, o Cliente recebe uma licença limitada, temporária, revogável, onerosa, não exclusiva e intransferível para utilização da Plataforma, exclusivamente para suas atividades empresariais e dentro dos limites do Plano contratado.

4.3. Salvo autorização expressa da Bivvo, é vedado ao Cliente:

I. copiar, reproduzir, vender, sublicenciar, alugar, ceder, distribuir ou explorar comercialmente a Plataforma fora das condições contratadas;

II. realizar engenharia reversa, descompilação, desmontagem, extração de código, tentativa de acesso ao código-fonte ou violação de mecanismos de segurança;

III. remover, alterar ou ocultar marcas, avisos de propriedade intelectual, identificadores técnicos, mecanismos de validação ou elementos de autoria da Plataforma;

IV. utilizar a Plataforma para criar produto concorrente, similar ou derivado;

V. permitir o acesso de terceiros não autorizados;

VI. revender acesso, operar white-label ou disponibilizar a Plataforma a clientes finais sem autorização comercial expressa.

4.4. A contratação da Plataforma não transfere ao Cliente qualquer direito de propriedade sobre software, código, layout, design, documentação, banco de dados estrutural, funcionalidades, automações nativas, marca, tecnologia, arquitetura, APIs internas ou segredos de negócio da Bivvo.

5. CADASTRO, CONTA E USUÁRIOS

5.1. O Cliente deverá fornecer informações verdadeiras, completas, atualizadas e suficientes para contratação, faturamento, suporte, identificação, segurança e cumprimento de obrigações legais.

5.2. O Cliente é responsável pela veracidade dos dados fornecidos, incluindo razão social, nome fantasia, CPF/CNPJ, endereço, e-mail, telefone, dados de cobrança, responsável legal, usuários administradores e demais informações cadastrais.

5.3. A Bivvo poderá solicitar documentos, validações ou informações adicionais para confirmar a identidade, legitimidade da contratação, regularidade cadastral, conformidade do uso, prevenção à fraude ou atendimento a exigências de terceiros.

5.4. O Cliente é integralmente responsável:

I. pela criação, alteração e exclusão de usuários;

II. pela definição de permissões, acessos, departamentos, funções e níveis hierárquicos;

III. pela conduta dos usuários vinculados à sua conta;

IV. por todos os atos praticados na Plataforma por meio de seus usuários;

V. pelo sigilo, segurança e uso adequado de logins, senhas, tokens, credenciais, chaves de API e métodos de autenticação.

5.5. O compartilhamento de credenciais é expressamente desaconselhado e poderá gerar riscos de segurança, vazamento de dados, uso indevido e responsabilização do Cliente.

5.6. A Bivvo não será responsável por prejuízos decorrentes de uso indevido de credenciais, acessos não autorizados, senhas compartilhadas, dispositivos comprometidos, vírus, malware, phishing, engenharia social, falhas de segurança internas do Cliente ou ausência de controles adequados.

5.7. O Cliente deverá comunicar imediatamente à Bivvo qualquer suspeita de acesso indevido, comprometimento de credenciais, incidente de segurança, uso não autorizado ou falha relevante relacionada à sua conta.

6. RESPONSABILIDADES DO CLIENTE

6.1. O Cliente é o único e exclusivo responsável pelo uso da Plataforma, pelas mensagens enviadas, pelos dados tratados, pelas automações criadas, pelos disparos realizados, pelas campanhas executadas, pelos usuários cadastrados e pelas integrações configuradas.

6.2. O Cliente compromete-se a utilizar a Plataforma de forma lícita, ética, responsável, transparente e em conformidade com:

I. a legislação brasileira aplicável;

II. a Lei Geral de Proteção de Dados Pessoais, Lei nº 13.709/2018;

III. o Marco Civil da Internet, Lei nº 12.965/2014;

IV. o Código de Defesa do Consumidor, quando aplicável;

V. normas de publicidade, telecomunicações, comércio eletrônico e proteção ao consumidor;

VI. políticas da Meta, WhatsApp, Instagram, Facebook e demais terceiros integrados;

VII. regras de uso de APIs, canais, provedores e serviços externos;

VIII. estes Termos e demais documentos contratuais da Bivvo.

6.3. O Cliente declara que possui base legal adequada para tratar dados pessoais, importar contatos, realizar comunicações, enviar mensagens, criar campanhas, acionar leads, executar automações e manter históricos de atendimento.

6.4. O Cliente é responsável por obter consentimentos, manter registros, respeitar opt-outs, descadastros, bloqueios, pedidos de titulares, preferências de comunicação e demais exigências legais aplicáveis.

6.5. O Cliente não poderá utilizar a Plataforma para:

I. praticar spam, disparos abusivos, comunicações não autorizadas ou envio massivo em desacordo com a legislação ou políticas de terceiros;

II. utilizar listas compradas, raspadas, obtidas ilicitamente ou sem base legal adequada;

III. divulgar conteúdo falso, enganoso, abusivo, discriminatório, ofensivo, difamatório, calunioso, injurioso, obsceno, violento, ameaçador ou ilícito;

IV. promover golpes, fraudes, pirâmides financeiras, jogos ilegais, produtos proibidos, atividades criminosas ou violações de direitos de terceiros;

V. vender, promover ou intermediar produtos ou serviços proibidos pelas políticas da Meta, WhatsApp, Instagram, Facebook ou demais canais integrados;

VI. violar direitos de propriedade intelectual, imagem, honra, privacidade, intimidade ou dados pessoais de terceiros;

VII. comprometer a segurança, estabilidade, reputação, operação ou disponibilidade da Plataforma;

VIII. tentar burlar limites técnicos, tarifários, comerciais ou de uso;

IX. utilizar automações para simular comportamento humano de forma enganosa ou para contornar políticas de terceiros;

X. praticar qualquer ato que exponha a Bivvo, outros clientes, provedores, parceiros ou terceiros a riscos legais, técnicos, reputacionais ou comerciais.

6.6. A Bivvo poderá limitar, suspender ou bloquear, preventivamente e sem necessidade de aviso prévio, contas, usuários, canais, integrações, disparos, automações ou funcionalidades quando identificar ou suspeitar de uso irregular, risco de bloqueio, violação de políticas de terceiros, risco à segurança, risco à reputação da Plataforma, inadimplência, fraude, abuso, alto volume atípico, reclamações ou qualquer conduta incompatível com estes Termos.

7. WHATSAPP, META E CANAIS OFICIAIS

7.1. O Cliente declara ciência de que a utilização de WhatsApp, WhatsApp Business Platform, Cloud API, coexistência, Instagram, Facebook, Messenger, Business Manager, aplicativos Meta, contas comerciais, números telefônicos e APIs relacionadas depende de regras, permissões, aprovações, políticas, limites, disponibilidade e decisões da Meta e/ou de outros terceiros.

7.2. A Bivvo não possui controle sobre decisões da Meta, incluindo, mas não se limitando a:

I. aprovação, reprovação, limitação ou suspensão de contas;

II. bloqueio de números telefônicos;

III. restrição de Business Manager;

IV. suspensão de contas de desenvolvedor;

V. revisão de aplicativos;

VI. perda, alteração ou revogação de permissões;

VII. alterações em APIs, webhooks, políticas, preços, limites ou regras de uso;

VIII. instabilidades, indisponibilidades ou falhas de infraestrutura da Meta;

IX. limitações de qualidade, reputação, classificação de conta ou capacidade de envio;

X. aprovação, reprovação ou pausa de templates de mensagem.

7.3. O Cliente reconhece que bloqueios, suspensões, restrições, quedas de qualidade, limitações de envio, reprovação de templates, perda de permissões ou instabilidades oriundas da Meta ou de terceiros não constituem falha da Bivvo, não gerando, por si só, direito a indenização, desconto, abatimento, reembolso, cancelamento sem multa ou suspensão de pagamentos.

7.4. O Cliente é exclusivamente responsável por cumprir as políticas da Meta e do WhatsApp, incluindo políticas comerciais, políticas de mensagens, regras de opt-in, regras de templates, restrições de conteúdo, limites de envio, classificação de conversas, boas práticas de qualidade e demais normas aplicáveis.

7.5. O Cliente declara ciência de que a Meta poderá cobrar tarifas por conversas, templates, mensagens, categorias, serviços ou uso de API, sendo tais valores de responsabilidade exclusiva do Cliente, salvo disposição comercial expressa em sentido contrário.

7.6. A Bivvo poderá orientar o Cliente em processos de configuração, integração, conexão, validação, criação de templates, onboarding ou ajustes técnicos, mas não garante aprovação pela Meta, estabilidade permanente, ausência de bloqueios, manutenção de permissões, aprovação de templates, manutenção de limites ou funcionamento ininterrupto de canais de terceiros.

7.7. Quando a conexão envolver conta, número, Business Manager, aplicativo, token, credencial ou estrutura de titularidade do Cliente, caberá ao Cliente manter tais ativos ativos, regulares, seguros, verificados, atualizados e em conformidade com as políticas aplicáveis.

7.8. Quando houver estruturas compartilhadas, aplicativos, permissões, canais ou recursos técnicos operados ou administrados pela Bivvo para viabilizar integrações, o Cliente reconhece que a Bivvo poderá adotar medidas preventivas e corretivas para proteção da operação, incluindo limitação de uso, bloqueio de onboarding, desconexão de canal, suspensão de integração, exigência de revalidação, alteração de método de conexão, migração técnica ou encerramento de uso compartilhado.

7.9. Na hipótese de mudanças promovidas pela Meta ou outros terceiros que exijam reconexão, revalidação OAuth, nova autorização, troca de aplicativo, ajuste de webhook, migração de canal, atualização de permissões, alteração de fluxo ou qualquer procedimento adicional, o Cliente deverá colaborar prontamente, fornecendo acessos, autorizações, documentos, validações ou ações necessárias.

7.10. A ausência de colaboração do Cliente em procedimentos exigidos por terceiros poderá comprometer o funcionamento da integração, sem que isso gere responsabilidade à Bivvo.

8. INTEGRAÇÕES COM SERVIÇOS DE TERCEIROS

8.1. A Plataforma poderá permitir integração com serviços de terceiros, incluindo, mas não se limitando a CRMs, ERPs, plataformas de automação, APIs externas, ferramentas de inteligência artificial, e-mail, SMS, telefonia, gateways, provedores de mídia, bancos de dados, webhooks, n8n, Dify, OpenAI, Google, Meta, Anthropic, provedores de hospedagem e outros sistemas.

8.2. O Cliente reconhece que serviços de terceiros possuem seus próprios termos, políticas, preços, limites, regras de uso, níveis de disponibilidade, restrições técnicas, requisitos de segurança e condições comerciais.

8.3. A Bivvo não se responsabiliza por:

I. indisponibilidade, erro, falha, atraso ou instabilidade de serviços de terceiros;

II. alterações de APIs, endpoints, políticas, preços, permissões, limites ou regras de terceiros;

III. bloqueios, suspensões, banimentos, restrições ou sanções impostas por terceiros;

IV. perda de dados causada por sistemas externos;

V. falhas de autenticação, tokens expirados, credenciais inválidas ou permissões revogadas;

VI. uso irregular, abusivo ou em desacordo com os termos de terceiros;

VII. cobranças, tarifas, consumo, excedentes ou custos variáveis de terceiros;

VIII. decisões automatizadas, respostas, outputs ou conteúdos gerados por ferramentas externas de inteligência artificial;

IX. incompatibilidades decorrentes de alterações externas ou de configuração inadequada pelo Cliente.

8.4. O Cliente é responsável por manter contas, licenças, créditos, planos, acessos, permissões, tokens, integrações, credenciais, webhooks e configurações de terceiros ativos, regulares e em conformidade com os respectivos termos de uso.

8.5. A indisponibilidade de uma integração ou serviço de terceiro não suspende a exigibilidade dos pagamentos devidos à Bivvo, salvo disposição expressa em contrato específico.

8.6. A Bivvo poderá remover, alterar, limitar ou substituir integrações quando houver risco de segurança, violação de política de terceiros, descontinuidade de API, inviabilidade técnica, alteração regulatória, instabilidade recorrente, risco reputacional ou necessidade operacional.

9. DISPAROS, CAMPANHAS, TEMPLATES E AUTOMAÇÕES

9.1. A Plataforma poderá oferecer recursos para criação de campanhas, envio de mensagens, disparos ativos, mensagens em massa, templates, automações, chatbots, respostas automáticas, fluxos de atendimento e comunicações programadas.

9.2. O Cliente é o único responsável por:

I. definir o público destinatário;

II. garantir base legal para contato;

III. obter opt-in quando necessário;

IV. respeitar opt-out, descadastro, bloqueios e solicitações de não contato;

V. revisar textos, ofertas, promessas, preços, informações, condições comerciais e conteúdos enviados;

VI. garantir que as mensagens estejam em conformidade com a lei, políticas da Meta e normas aplicáveis;

VII. acompanhar métricas, reclamações, denúncias, bloqueios, qualidade da conta e reputação dos canais utilizados;

VIII. validar se a campanha é adequada ao produto, serviço, segmento e público-alvo.

9.3. A Bivvo não se responsabiliza pelo conteúdo das mensagens, campanhas, templates, ofertas, automações, fluxos, áudios, imagens, vídeos, documentos, links ou arquivos enviados pelo Cliente por meio da Plataforma.

9.4. A aprovação de templates depende das regras e decisões da Meta ou do provedor aplicável. A Bivvo poderá auxiliar tecnicamente, mas não garante aprovação, prazo de aprovação, permanência do template ativo ou ausência de revisão posterior.

9.5. O Cliente declara ciência de que disparos em desacordo com políticas da Meta, uso de listas inadequadas, excesso de reclamações, bloqueios por usuários finais, baixa qualidade ou conteúdo proibido podem gerar limitação, suspensão, banimento de número, restrição de conta, redução de limite ou outras penalidades impostas por terceiros.

9.6. A Bivvo poderá suspender disparos, campanhas, templates ou automações quando identificar risco de spam, abuso, violação legal, risco de bloqueio, risco reputacional, reclamações, instabilidade técnica ou uso em desacordo com estes Termos.

10. INTELIGÊNCIA ARTIFICIAL E AUTOMAÇÕES AVANÇADAS

10.1. A Plataforma poderá permitir a utilização de recursos de inteligência artificial, integração com modelos de linguagem, classificação automática, respostas automáticas, análise de conversas, geração de textos, roteamento inteligente, sumarização, prompts, agentes virtuais ou outros recursos similares.

10.2. O Cliente reconhece que ferramentas de inteligência artificial podem gerar respostas imprecisas, incompletas, inadequadas, ofensivas, desatualizadas ou incompatíveis com o contexto do atendimento, devendo o Cliente revisar, configurar, supervisionar e validar os fluxos e respostas antes de utilizá-los em produção.

10.3. A Bivvo não se responsabiliza por decisões comerciais, jurídicas, médicas, financeiras, operacionais ou estratégicas tomadas com base em respostas automatizadas ou geradas por inteligência artificial.

10.4. O Cliente é responsável por configurar prompts, bases de conhecimento, regras, limites, orientações, escopo de atuação, revisão humana e mecanismos de segurança necessários ao uso adequado de IA.

10.5. Custos decorrentes de consumo de APIs de inteligência artificial, tokens, chamadas, créditos, planos ou serviços externos serão de responsabilidade do Cliente, salvo disposição comercial expressa em contrário.

11. PLANOS, PAGAMENTOS E CUSTOS DE TERCEIROS

11.1. O Cliente pagará à Bivvo os valores correspondentes ao Plano contratado, conforme proposta comercial, fatura, página de contratação, pedido, contrato, assinatura ou ajuste comercial vigente.

11.2. Os pagamentos poderão ser mensais, trimestrais, semestrais, anuais, recorrentes, antecipados ou conforme outra condição comercial expressamente acordada.

11.3. Salvo disposição expressa em contrário, os Serviços são prestados mediante pagamento antecipado.

11.4. O atraso no pagamento poderá acarretar, a critério da Bivvo:

I. suspensão parcial ou total da Plataforma;

II. bloqueio de usuários;

III. limitação de funcionalidades;

IV. suspensão de canais, integrações, disparos e automações;

V. interrupção de suporte;

VI. cobrança de encargos, multa, juros e correção monetária;

VII. rescisão contratual;

VIII. exclusão de dados após os prazos aplicáveis.

11.5. A reativação da conta poderá depender da quitação integral dos débitos, regularização cadastral, pagamento de taxa de reativação, nova configuração técnica ou disponibilidade de integrações.

11.6. Os valores pagos à Bivvo referem-se exclusivamente aos Serviços contratados junto à Bivvo, não abrangendo custos de terceiros, salvo quando expressamente previsto.

11.7. São de responsabilidade exclusiva do Cliente custos variáveis ou adicionais decorrentes de terceiros, incluindo, mas não se limitando a:

I. tarifas da Meta, WhatsApp ou provedores de mensagens;

II. custos de templates, conversas, mensagens, janelas ou categorias;

III. SMS, telefonia, VoIP, números, chips, linhas ou operadoras;

IV. consumo de APIs de inteligência artificial;

V. ferramentas de automação, CRMs, ERPs, gateways ou plataformas externas;

VI. servidores, domínios, hospedagens, certificados ou infraestrutura;

VII. taxas bancárias, cartões, intermediadores de pagamento ou chargebacks.

11.8. A Bivvo não possui controle sobre reajustes, alterações de preço, mudança de modelo de cobrança, novas tarifas ou cobranças adicionais impostas por terceiros.

11.9. A Bivvo poderá reajustar os valores dos Planos periodicamente, mediante comunicação prévia ou conforme previsto em proposta comercial, contrato específico ou índice aplicável.

12. SETUP, IMPLANTAÇÃO, TREINAMENTO E SERVIÇOS ADICIONAIS

12.1. A contratação da Plataforma poderá envolver serviços de setup, implantação, configuração inicial, treinamento, consultoria, personalização, migração, criação de fluxos, configuração de templates, integração de canais ou outros serviços adicionais.

12.2. Serviços de setup, implantação, treinamento, personalização, consultoria ou configuração possuem natureza técnica e personalizada, podendo não ser reembolsáveis após iniciada sua execução.

12.3. A realização de setup ou implantação depende da colaboração do Cliente, incluindo fornecimento de acessos, dados, documentos, permissões, contas, códigos, validações, responsáveis internos, agendas e informações necessárias.

12.4. Atrasos decorrentes da ausência de colaboração do Cliente, dados incorretos, contas restritas, problemas no Business Manager, pendências com a Meta, falhas de terceiros ou indisponibilidade de responsáveis internos não serão atribuídos à Bivvo.

12.5. Serviços adicionais não incluídos no Plano poderão ser cobrados separadamente, incluindo criação de fluxos complexos, integrações personalizadas, migração de dados, consultoria estratégica, campanhas, treinamentos extras, customizações, relatórios personalizados ou suporte fora do escopo.

13. CANCELAMENTO, RESCISÃO E REEMBOLSO

13.1. O Cliente poderá solicitar o cancelamento da contratação conforme as condições do Plano, proposta comercial, contrato específico ou legislação aplicável.

13.2. Em planos mensais sem fidelidade, o cancelamento produzirá efeitos ao final do ciclo já contratado, salvo disposição expressa em contrário.

13.3. Em planos com fidelidade, anuais, semestrais, promocionais ou com condições comerciais especiais, o cancelamento antecipado poderá não gerar reembolso proporcional e poderá implicar cobrança de multa, parcelas vincendas ou valores remanescentes, conforme condição contratada.

13.4. Quando aplicável, o direito de arrependimento poderá ser exercido no prazo legal de 7 dias corridos, contados da contratação realizada fora do estabelecimento comercial, observadas as regras do Código de Defesa do Consumidor.

13.5. Valores referentes a setup, implantação, personalização, treinamento, consultoria, configuração técnica, integrações ou serviços já executados poderão ser descontados ou não reembolsados, em razão de sua natureza personalizada e do trabalho já realizado.

13.6. A Bivvo poderá rescindir ou suspender imediatamente a contratação, sem reembolso de valores já pagos, quando houver:

I. violação destes Termos;

II. inadimplência;

III. uso ilícito, abusivo, fraudulento ou irregular;

IV. risco à segurança, estabilidade ou reputação da Plataforma;

V. violação de políticas da Meta ou terceiros;

VI. prática de spam ou disparos não autorizados;

VII. fornecimento de dados falsos;

VIII. tentativa de engenharia reversa, fraude, invasão ou exploração indevida;

IX. conduta abusiva contra equipe, parceiros ou outros clientes;

X. determinação legal, judicial, administrativa ou de terceiro essencial à operação.

13.7. O cancelamento ou rescisão não exime o Cliente do pagamento de valores vencidos, pendentes, proporcionais, multas, encargos ou custos de terceiros já incorridos.

14. SUPORTE TÉCNICO

14.1. A Bivvo prestará suporte técnico conforme canal oficial, horário de atendimento, modalidade e escopo definidos no Plano contratado, proposta comercial ou comunicações institucionais.

14.2. O suporte poderá abranger:

I. dúvidas sobre uso da Plataforma;

II. análise de falhas técnicas da Plataforma;

III. orientações sobre configurações nativas;

IV. apoio em integrações disponíveis;

V. acompanhamento de incidentes relacionados ao funcionamento da Plataforma.

14.3. Salvo disposição expressa em contrário, não estão incluídos no suporte padrão:

I. consultoria comercial, marketing, vendas ou estratégia;

II. criação de campanhas, textos, ofertas ou roteiros comerciais;

III. criação de fluxos complexos, chatbots ou automações personalizadas;

IV. configuração, correção ou manutenção de sistemas de terceiros;

V. suporte a CRMs, ERPs, n8n, Dify, OpenAI, servidores, domínios, e-mails, telefonia ou plataformas externas;

VI. resolução de problemas causados por internet, aparelhos, computadores, navegadores, firewalls, antivírus, proxies ou rede interna do Cliente;

VII. problemas decorrentes de bloqueios, instabilidades ou decisões da Meta ou de terceiros;

VIII. treinamentos adicionais não contratados;

IX. desenvolvimento de funcionalidades sob demanda;

X. atendimento fora do horário ou canal oficial, salvo contratação específica.

14.4. A Bivvo poderá classificar solicitações de suporte como dúvida, requisição, incidente, melhoria, customização ou serviço adicional, definindo prioridade e prazo conforme impacto, complexidade, fila de atendimento e condições contratadas.

14.5. A abertura de chamados ou solicitações deverá ser feita pelos canais oficiais indicados pela Bivvo. Solicitações realizadas por canais informais poderão não ser consideradas para fins de SLA, registro, prioridade ou comprovação.

14.6. A Bivvo poderá limitar ou suspender o suporte em caso de inadimplência, uso abusivo, solicitações fora do escopo, conduta inadequada, ausência de colaboração do Cliente ou uso em desacordo com estes Termos.

15. DISPONIBILIDADE, MANUTENÇÕES E INSTABILIDADES

15.1. A Bivvo adotará esforços comercialmente razoáveis para manter a Plataforma disponível e funcional, observadas as limitações inerentes a sistemas conectados à internet, infraestrutura tecnológica, provedores externos e integrações de terceiros.

15.2. O Cliente declara ciência de que a Plataforma poderá apresentar indisponibilidades, interrupções, lentidão, instabilidades, atrasos ou falhas decorrentes de:

I. manutenções programadas ou emergenciais;

II. atualizações, correções, melhorias ou alterações técnicas;

III. falhas de internet, energia, infraestrutura ou provedores;

IV. ataques cibernéticos, tentativas de invasão, DDoS ou eventos de segurança;

V. falhas, bloqueios ou alterações de terceiros;

VI. indisponibilidade da Meta, WhatsApp, Instagram, Facebook ou demais canais;

VII. problemas nos dispositivos, navegadores, rede ou ambiente do Cliente;

VIII. caso fortuito, força maior ou eventos fora do controle razoável da Bivvo.

15.3. Instabilidades decorrentes de terceiros, internet, infraestrutura externa, Meta, WhatsApp, operadoras, provedores ou configurações do Cliente não serão consideradas falha da Bivvo.

15.4. A Bivvo poderá realizar manutenções programadas ou emergenciais para preservar segurança, estabilidade, atualização, desempenho ou conformidade da Plataforma.

15.5. Sempre que razoavelmente possível, a Bivvo comunicará manutenções programadas com antecedência. Manutenções emergenciais poderão ocorrer sem aviso prévio.

16. LIMITAÇÃO DE RESPONSABILIDADE

16.1. A Bivvo não será responsável por danos, prejuízos ou perdas decorrentes de:

I. uso indevido da Plataforma pelo Cliente ou seus usuários;

II. conteúdo enviado, recebido, armazenado ou tratado pelo Cliente;

III. disparos, campanhas, automações, templates ou fluxos criados pelo Cliente;

IV. bloqueios, suspensões ou restrições impostas por Meta, WhatsApp ou terceiros;

V. indisponibilidade de serviços de terceiros;

VI. falhas de internet, rede, dispositivos, navegadores, sistemas ou infraestrutura do Cliente;

VII. vazamento causado por credenciais compartilhadas, dispositivos comprometidos ou falhas internas do Cliente;

VIII. decisões comerciais, operacionais ou estratégicas tomadas pelo Cliente;

IX. perda de oportunidade, lucro cessante, dano moral, dano indireto, dano consequencial, perda de chance, perda de receita, perda de clientes ou interrupção de negócios;

X. eventos de caso fortuito, força maior ou fatos fora de seu controle razoável.

16.2. A responsabilidade da Bivvo, quando comprovadamente aplicável e limitada a ato diretamente imputável à própria Bivvo, ficará restrita aos valores efetivamente pagos pelo Cliente à Bivvo nos últimos 3 meses anteriores ao evento que deu causa à reclamação, salvo quando a legislação aplicável determinar de forma diversa.

16.3. A Bivvo não garante que a Plataforma atenderá a todas as expectativas comerciais do Cliente, aumentará vendas, evitará perdas, impedirá bloqueios, assegurará aprovação de contas, eliminará falhas de atendimento ou garantirá resultados específicos.

16.4. O Cliente reconhece que é o único responsável por avaliar se a Plataforma atende às suas necessidades operacionais, comerciais, técnicas e jurídicas.

17. PRIVACIDADE, LGPD E PROTEÇÃO DE DADOS

17.1. A Bivvo compromete-se a tratar dados pessoais em conformidade com a Lei Geral de Proteção de Dados Pessoais, Lei nº 13.709/2018, com o Marco Civil da Internet e demais normas aplicáveis.

17.2. Em relação aos dados de contatos, leads, clientes finais, mensagens, históricos, campanhas, automações e informações inseridas pelo Cliente na Plataforma, o Cliente atuará, em regra, como Controlador, sendo responsável por definir as finalidades, bases legais, meios e limites do tratamento.

17.3. A Bivvo atuará, em regra, como Operadora dos dados pessoais tratados em nome do Cliente, realizando o tratamento conforme instruções lícitas do Cliente, estes Termos, a Política de Privacidade e as necessidades técnicas da prestação dos Serviços.

17.4. A Bivvo poderá atuar como Controladora dos dados cadastrais, contratuais, financeiros, fiscais, comerciais, técnicos, de suporte, segurança, prevenção à fraude, cobrança e relacionamento com o Cliente.

17.5. O Cliente declara e garante que:

I. possui base legal adequada para tratar os dados inseridos na Plataforma;

II. obteve consentimentos quando necessários;

III. informa adequadamente os titulares sobre o tratamento de dados;

IV. possui política de privacidade própria quando aplicável;

V. atende solicitações de titulares de dados;

VI. respeita direitos de acesso, correção, eliminação, oposição, portabilidade e demais direitos previstos na LGPD;

VII. não insere dados ilícitos, excessivos, desnecessários ou obtidos sem fundamento legal.

17.6. O Cliente será responsável por responder a titulares, autoridades, consumidores, órgãos reguladores ou terceiros em relação ao tratamento de dados que realizar como Controlador.

17.7. A Bivvo poderá tratar dados técnicos e metadados de uso da Plataforma para fins de segurança, auditoria, prevenção à fraude, melhoria da Plataforma, suporte, estatísticas, cobrança, cumprimento legal e análise operacional.

17.8. A Bivvo poderá compartilhar dados com operadores, subprocessadores, provedores de infraestrutura, meios de pagamento, ferramentas de suporte, plataformas integradas e terceiros necessários à prestação dos Serviços, observadas as medidas de segurança e a legislação aplicável.

17.9. Quando a integração com Meta, WhatsApp, Instagram, Facebook ou outros terceiros for utilizada, dados necessários à viabilização da comunicação poderão ser compartilhados com esses terceiros, conforme suas próprias políticas de privacidade e termos de uso.

17.10. O Cliente deverá comunicar imediatamente à Bivvo qualquer incidente de segurança, suspeita de vazamento, acesso indevido ou solicitação de titular que envolva a Plataforma.

18. RETENÇÃO, EXPORTAÇÃO E EXCLUSÃO DE DADOS

18.1. Os dados tratados na Plataforma serão mantidos durante a vigência contratual e conforme os limites técnicos, comerciais e de armazenamento do Plano contratado.

18.2. Cabe ao Cliente realizar exportações, backups, cópias ou guarda de informações que deseje preservar, especialmente antes de cancelamento, rescisão, inadimplência, troca de plano ou encerramento de conta.

18.3. Após o cancelamento, rescisão ou inativação da conta, a Bivvo poderá manter os dados por prazo determinado para fins de backup, segurança, cumprimento legal, exercício regular de direitos, auditoria ou eventual reativação, conforme sua Política de Privacidade e práticas internas.

18.4. Decorrido o prazo de retenção aplicável, os dados poderão ser excluídos de forma definitiva, segura e irreversível, ressalvados aqueles cuja manutenção seja exigida por lei ou necessária para proteção de direitos.

18.5. A recuperação de dados após cancelamento, inativação, inadimplência ou exclusão poderá não ser possível. Quando possível, poderá depender de solicitação formal, disponibilidade técnica e pagamento de taxa de serviço.

18.6. A Bivvo não se obriga a manter histórico integral de mensagens, arquivos, mídias, conversas ou metadados além dos prazos, limites e condições do Plano contratado.

19. SEGURANÇA DA INFORMAÇÃO

19.1. A Bivvo adotará medidas técnicas, administrativas e organizacionais razoáveis para proteger a Plataforma contra acessos não autorizados, perda, alteração, destruição, uso indevido ou divulgação indevida de dados.

19.2. O Cliente reconhece que nenhum sistema conectado à internet é absolutamente imune a riscos, ataques, falhas, vulnerabilidades, incidentes ou ações de terceiros.

19.3. O Cliente deverá adotar boas práticas de segurança, incluindo:

I. uso de senhas fortes;

II. controle de permissões;

III. revogação de acessos de ex-colaboradores;

IV. proteção de dispositivos;

V. uso de redes seguras;

VI. cuidado com links suspeitos;

VII. treinamento de usuários;

VIII. controle de tokens, chaves e credenciais;

IX. revisão periódica de usuários ativos.

19.4. A Bivvo não será responsável por incidentes causados por falhas de segurança do Cliente, uso indevido de credenciais, engenharia social, malware, dispositivos comprometidos, redes inseguras ou permissões inadequadas concedidas pelo Cliente.

20. PROPRIEDADE INTELECTUAL

20.1. A Plataforma, sua marca, nome, logotipo, layout, design, software, código, arquitetura, banco de dados estrutural, documentação, APIs, fluxos nativos, funcionalidades, telas, métodos, processos, know-how e demais ativos são de propriedade exclusiva da Bivvo ou de seus licenciantes.

20.2. O Cliente não adquire qualquer direito de propriedade sobre a Plataforma, recebendo apenas licença de uso limitada, temporária e condicionada ao cumprimento destes Termos.

20.3. Pertencem ao Cliente os dados, contatos, mensagens, históricos, arquivos, campanhas, marcas, conteúdos, textos, imagens, vídeos, documentos e materiais que inserir na Plataforma, desde que sejam lícitos e de sua titularidade ou devidamente autorizados.

20.4. O Cliente autoriza a Bivvo a tratar, armazenar, transmitir e processar tais conteúdos na medida necessária para execução dos Serviços.

20.5. Salvo oposição formal do Cliente, a Bivvo poderá utilizar nome, marca ou logotipo do Cliente em portfólio, materiais comerciais, apresentações ou lista de clientes, exclusivamente para fins institucionais e comerciais, sem divulgação de dados sensíveis, estratégicos ou confidenciais.

21. CONDUTA ÉTICA E RELACIONAMENTO COM A EQUIPE

21.1. O Cliente, seus usuários, representantes, colaboradores e prepostos deverão manter conduta respeitosa, ética, profissional e compatível com a boa-fé em todas as interações com a equipe da Bivvo, parceiros, prestadores e demais clientes.

21.2. É vedada qualquer conduta abusiva, ofensiva, ameaçadora, discriminatória, vexatória, agressiva, racista, assediante, humilhante, intimidatória ou incompatível com um ambiente profissional saudável.

21.3. A Bivvo poderá limitar canais de atendimento, suspender suporte, exigir comunicação por canal formal, restringir contatos, suspender a conta ou rescindir a contratação em caso de conduta inadequada, grave ou reincidente.

21.4. A adoção dessas medidas não prejudica o direito da Bivvo de buscar reparação por danos, registrar ocorrências ou adotar medidas judiciais e extrajudiciais cabíveis.

22. COMUNICAÇÕES OFICIAIS

22.1. As comunicações oficiais da Bivvo ao Cliente poderão ser realizadas por e-mail, WhatsApp, aviso na Plataforma, canal de suporte, painel administrativo, telefone ou outro meio informado pelo Cliente.

22.2. O Cliente é responsável por manter seus dados de contato atualizados e por acompanhar regularmente as comunicações enviadas pela Bivvo.

22.3. Notificações enviadas aos dados cadastrados serão consideradas válidas, ainda que o Cliente não as leia, desde que não haja falha comprovada imputável à Bivvo na entrega.`}
          </div>

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
              </div>
            </div>
          </section>
        </div>

        <div className="mt-8 text-center text-muted-foreground text-sm">
          <p>© 2026 Bivvo. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfUse;
