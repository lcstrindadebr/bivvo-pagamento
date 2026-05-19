import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

const PrivacyPolicy = () => {
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
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">POLÍTICA DE PRIVACIDADE- BIVVO</h1>
              <p className="text-sm text-muted-foreground mt-1">Última atualização: 16/05/2026</p>
            </div>
          </div>

          <div className="prose prose-slate dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-line">
            {`A sua privacidade é muito importante para nós.

Esta Política de Privacidade (“Política”) tem como objetivo explicar, de forma clara e transparente, como a Bivvo, inscrita no CNPJ sob o nº 61.912.973/0001-91, com sede na Rua Waldemar Falcão, 979, Edifício Horto Office, Sala 201, Horto Florestal, CEP 40295-010, Salvador/BA, doravante denominada simplesmente Bivvo, coleta, utiliza, armazena, compartilha e protege dados pessoais no contexto da utilização de seus sites, canais de atendimento, plataforma, integrações, automações e serviços relacionados.

Esta Política deve ser lida em conjunto com os Termos de Uso da Plataforma Bivvo, que regulam as condições de contratação, acesso e utilização da Plataforma.

Ao acessar nossos sites, contratar nossos serviços, utilizar a Plataforma Bivvo, interagir com nossos canais de atendimento ou fornecer dados pessoais à Bivvo, você declara estar ciente das condições desta Política.

Caso você não concorde com esta Política, recomendamos que não utilize a Plataforma e entre em contato conosco para esclarecimentos.

1. CONCEITOS IMPORTANTES
Para facilitar a compreensão desta Política, utilizamos os seguintes conceitos:

Bivvo: plataforma tecnológica de atendimento, gestão de conversas, automações, disparos, integrações e centralização de canais de comunicação.

Cliente ou Contratante: pessoa física ou jurídica que contrata a Plataforma Bivvo para uso próprio, por sua equipe, colaboradores, representantes ou usuários autorizados.

Usuário: pessoa autorizada pelo Cliente a acessar e utilizar a Plataforma, incluindo administradores, gestores, atendentes, operadores, vendedores, colaboradores, prestadores de serviço ou terceiros autorizados.

Usuário Administrador: usuário com poderes para gerenciar a conta do Cliente, cadastrar usuários, definir permissões, conectar canais, configurar integrações, criar automações e administrar a utilização da Plataforma.

Contato, Lead ou Cliente Final: pessoa natural que interage com o Cliente por meio dos canais conectados à Plataforma Bivvo, como WhatsApp, Instagram, Facebook, e-mail, webchat, SMS, telefonia ou outros meios.

Dados Pessoais: informações relacionadas a pessoa natural identificada ou identificável, como nome, telefone, e-mail, CPF, endereço, IP, identificadores online, mensagens, imagem, voz e demais dados que possam identificar alguém.

Dados Pessoais Sensíveis: dados sobre origem racial ou étnica, convicção religiosa, opinião política, filiação sindical, dados referentes à saúde, vida sexual, dado genético ou biométrico, conforme definição da LGPD.

LGPD: Lei Geral de Proteção de Dados Pessoais, Lei nº 13.709/2018.

Marco Civil da Internet: Lei nº 12.965/2014, que estabelece princípios, garantias, direitos e deveres para o uso da internet no Brasil.

Titular: pessoa natural a quem se referem os dados pessoais.

Controlador: pessoa física ou jurídica responsável por tomar decisões sobre o tratamento de dados pessoais.

Operador: pessoa física ou jurídica que realiza o tratamento de dados pessoais em nome do Controlador.

Tratamento: toda operation realizada com dados pessoais, como coleta, recepção, classificação, utilização, acesso, reprodução, transmissão, distribuição, processamento, armazenamento, eliminação, avaliação, controle, modificação, comunicação, transferência, difusão ou extração.

Serviços de Terceiros: plataformas, APIs, provedores, aplicativos e ferramentas externas integradas ou utilizadas em conjunto com a Bivvo, como Meta, WhatsApp, Instagram, Facebook, e-mail, SMS, telefonia, CRMs, ERPs, n8n, Dify, OpenAI, provedores de infraestrutura, gateways de pagamento e demais sistemas.

2. A QUEM ESTA POLÍTICA SE APLICA
Esta Política se aplica aos dados pessoais tratados pela Bivvo em relação a:

I. visitantes dos sites, páginas, formulários, landing pages e canais digitais da Bivvo;

II. leads, prospects e pessoas que entram em contato com a Bivvo;

III. Clientes e representantes legais de Clientes;

IV. Usuários autorizados a acessar a Plataforma Bivvo;

V. contatos, leads, clientes finais ou terceiros que interagem com Clientes da Bivvo por meio dos canais conectados à Plataforma;

VI. parceiros, fornecedores, prestadores de serviço e terceiros relacionados à operação da Bivvo.

Esta Política não se aplica diretamente às práticas de privacidade dos Clientes da Bivvo, nem às práticas de terceiros integrados à Plataforma. Nessas hipóteses, é importante que o Titular consulte também as políticas de privacidade do respectivo Cliente, da Meta, WhatsApp, Instagram, Facebook, provedores de e-mail, telefonia, SMS, CRMs, ferramentas de automação e demais plataformas utilizadas.

3. PAPÉIS DA BIVVO NO TRATAMENTO DE DADOS
A Bivvo poderá atuar como Controladora ou como Operadora de dados pessoais, a depender do contexto do tratamento.

4. QUANDO A BIVVO ATUA COMO CONTROLADORA
A Bivvo atua como Controladora quando toma decisões sobre o tratamento de dados pessoais relacionados às suas próprias finalidades empresariais, comerciais, contratuais, administrativas, fiscais, financeiras, operacionais, de segurança e relacionamento.

Isso ocorre, por exemplo, no tratamento de dados de:

I. visitantes do site da Bivvo;

II. leads que solicitam contato, demonstração ou proposta comercial;

III. representantes legais, sócios, administradores e responsáveis financeiros dos Clientes;

IV. Usuários da Plataforma, quando necessário para cadastro, autenticação, suporte, segurança e gestão contratual;

V. pessoas que entram em contato pelos canais oficiais da Bivvo;

VI. fornecedores, parceiros e prestadores de serviço;

VII. dados utilizados para cobrança, faturamento, emissão de notas fiscais, prevenção à fraude, análise de segurança e cumprimento de obrigações legais.

Nessas situações, a Bivvo define as finalidades e bases legais do tratamento, observando a LGPD, o Marco Civil da Internet e demais normas aplicáveis.

5. QUANDO A BIVVO ATUA COMO OPERADORA
Na maior parte das operações realizadas dentro da Plataforma, a Bivvo atua como Operadora dos dados pessoais tratados em nome do Cliente.

Isso ocorre quando o Cliente utiliza a Plataforma Bivvo para:

I. importar ou cadastrar contatos;

II. gerenciar leads, clientes finais e conversas;

III. enviar mensagens pelo WhatsApp, Instagram, Facebook, e-mail, SMS, telefonia, webchat ou outros canais;

IV. criar campanhas, disparos, templates e automações;

V. configurar fluxos de atendimento, bots, regras, etiquetas e integrações;

VI. armazenar históricos de atendimento, mensagens, arquivos, mídias, protocolos, metadados e relatórios;

VII. integrar a Plataforma com ferramentas externas, como CRMs, ERPs, n8n, Dify, APIs, webhooks, IA e outros sistemas.

Nessas hipóteses, o Cliente é o Controlador dos dados pessoais de seus contatos, leads e clientes finais, sendo responsável por definir as finalidades, bases legais, critérios, limites e instruções de tratamento.

A Bivvo, como Operadora, realiza o tratamento conforme as instruções lícitas do Cliente, os Termos de Uso, esta Política, a legislação aplicável e as necessidades técnicas para a prestação dos serviços.

A Bivvo não controla o teor das mensagens enviadas pelo Cliente, as bases de contatos utilizadas, as campanhas executadas, os dados inseridos na Plataforma, as decisões comerciais adotadas ou a legalidade das comunicações realizadas pelo Cliente.

6. RESPONSABILIDADES DO CLIENTE COMO CONTROLADOR
Quando o Cliente utiliza a Plataforma para tratar dados pessoais de terceiros, caberá exclusivamente ao Cliente:

I. possuir base legal adequada para o tratamento dos dados;

II. obter consentimento quando necessário;

III. informar os titulares sobre o tratamento de seus dados;

IV. manter política de privacidade própria, quando aplicável;

V. respeitar direitos dos titulares;

VI. atender solicitações de acesso, correção, exclusão, anonimização, oposição, portabilidade e demais direitos previstos na LGPD;

VII. garantir que os dados inseridos na Plataforma foram obtidos de forma lícita;

VIII. respeitar opt-outs, descadastros, bloqueios e pedidos de não contato;

IX. não utilizar listas compradas, raspadas, vazadas ou obtidas sem base legal;

X. cumprir as políticas da Meta, WhatsApp, Instagram, Facebook e demais terceiros integrados;

XI. garantir que mensagens, campanhas, automações e disparos estejam em conformidade com a lei e com as regras dos canais utilizados;

XII. orientar seus usuários sobre boas práticas de privacidade, segurança e uso da Plataforma.

Caso o Cliente trate dados de titulares localizados fora do Brasil, caberá a ele observar também as leis de proteção de dados aplicáveis no respectivo território, incluindo, quando aplicável, o GDPR ou outras normas internacionais.

7. DADOS PESSOAIS QUE PODEMOS TRATAR
A Bivvo poderá tratar diferentes categorias de dados pessoais, conforme a relação mantida com o Titular e a forma de utilização da Plataforma.

7.1. Dados cadastrais e de identificação
Podemos tratar:

I. nome completo;

II. CPF;

III. RG ou documento de identificação, quando necessário;

IV. cargo, função ou área;

V. empresa em que trabalha;

VI. razão social, nome fantasia e CNPJ do Cliente;

VII. endereço comercial;

VIII. telefone;

IX. e-mail;

X. dados do representante legal;

XI. dados de cobrança e faturamento.

7.2. Dados de acesso e autenticação
Podemos tratar:

I. login;

II. senha criptografada ou protegida por mecanismos de segurança;

III. permissões de usuário;

IV. perfil de acesso;

V. histórico de login;

VI. endereço IP;

VII. data e hora de acesso;

VIII. identificadores de dispositivo;

IX. navegador, sistema operacional e informações técnicas;

X. registros de atividade na Plataforma.

7.3. Dados de comunicação e suporte
Podemos tratar:

I. mensagens enviadas à Bivvo;

II. conversas por WhatsApp, e-mail, chat, telefone ou outros canais oficiais;

III. gravações ou registros de atendimento, quando aplicável;

IV. solicitações de suporte;

V. prints, anexos, logs, identificadores de conta, números de protocolo e informações técnicas enviadas voluntariamente pelo Cliente ou Usuário;

VI. avaliações de atendimento e feedbacks.

7.4. Dados financeiros, fiscais e contratuais
Podemos tratar:

I. dados para emissão de nota fiscal;

II. dados de cobrança;

III. status de pagamento;

IV. informações de plano contratado;

V. histórico financeiro;

VI. comprovantes de pagamento;

VII. dados necessários à prevenção à fraude, análise de crédito, cobrança e cumprimento de obrigações legais.

A Bivvo não armazena diretamente dados completos de cartão de crédito quando o pagamento é processado por plataformas ou gateways externos. Nesses casos, o tratamento é realizado também pelo respectivo provedor de pagamento, conforme suas próprias políticas.

7.5. Dados tratados dentro da Plataforma em nome do Cliente
Conforme o uso da Plataforma pelo Cliente, poderão ser tratados:

I. nomes de contatos, leads ou clientes finais;

II. telefones;

III. e-mails;

IV. documentos;

V. endereços;

VI. mensagens enviadas e recebidas;

VII. áudios, imagens, vídeos, arquivos e anexos;

VIII. etiquetas, observações, protocolos e classificações;

IX. histórico de conversas;

X. informações de funil, atendimento, responsável, departamento ou carteira;

XI. dados provenientes de integrações com terceiros;

XII. metadados de mensagens, status de envio, entrega, leitura e falhas;

XIII. dados de campanhas, templates, disparos e automações;

XIV. informações inseridas em fluxos, formulários, webhooks ou APIs.

A definição de quais dados serão coletados, inseridos, importados ou tratados na Plataforma é de responsabilidade do Cliente.

7.6. Dados de navegação e cookies
Podemos tratar:

I. endereço IP;

II. data e hora de acesso;

III. páginas acessadas;

IV. dispositivo utilizado;

V. navegador;

VI. sistema operacional;

VII. origem de tráfego;

VIII. identificadores de cookies;

IX. preferências de navegação;

X. eventos de interação com páginas, formulários e campanhas.

Esses dados podem ser coletados por cookies, pixels, tags, ferramentas de análise, ferramentas de marketing e tecnologias semelhantes.

8. DADOS PESSOAIS SENSÍVEIS
A Bivvo não solicita, como regra, dados pessoais sensíveis para a contratação e utilização regular da Plataforma.

Contudo, considerando que a Plataforma permite que o Cliente envie mensagens, receba informações, integre canais e armazene conversas, é possível que o próprio Cliente, seus usuários, contatos ou clientes finais insiram dados pessoais sensíveis nas interações.

Nessas hipóteses:

I. o Cliente será responsável por avaliar a necessidade, adequação e base legal para o tratamento desses dados;

II. o Cliente deverá obter consentimento específico e destacado quando exigido pela LGPD;

III. o Cliente deverá adotar medidas adicionais de segurança e restrição de acesso;

IV. a Bivvo tratará tais dados apenas na medida necessária para executar os serviços contratados, na qualidade de Operadora.

É vedada a utilização da Plataforma para tratar dados sensíveis de forma ilícita, excessiva, discriminatória ou incompatível com a legislação aplicável.

9. DADOS DE CRIANÇAS E ADOLESCENTES
A Plataforma Bivvo é destinada ao uso empresarial e não é direcionada a crianças ou adolescentes.

O Cliente não deverá inserir, coletar ou tratar dados pessoais de crianças e adolescentes por meio da Plataforma sem observar integralmente as exigências legais aplicáveis, incluindo o consentimento específico e em destaque de ao menos um dos pais ou responsável legal, quando exigido.

Caso a Bivvo identifique tratamento indevido de dados de crianças ou adolescentes, poderá solicitar esclarecimentos, restringir funcionalidades, suspender o tratamento ou adotar outras medidas necessárias para conformidade legal.

10. FINALIDADES DO TRATAMENTO
A Bivvo poderá tratar dados pessoais para as seguintes finalidades:

I. permitir a contratação, acesso e utilização da Plataforma;

II. criar e administrar contas de Clientes e Usuários;

III. autenticar acessos e gerenciar permissões;

IV. prestar suporte técnico e atendimento;

V. configurar canais, integrações, automações e funcionalidades;

VI. processar pagamentos, cobranças e emissão de notas fiscais;

VII. cumprir obrigações contratuais, legais, fiscais, regulatórias e contábeis;

VIII. prevenir fraudes, abusos, acessos indevidos e incidentes de segurança;

IX. monitorar estabilidade, performance, disponibilidade e segurança da Plataforma;

X. enviar notificações operacionais, avisos técnicos, comunicados de serviço e atualizações contratuais;

XI. enviar comunicações comerciais, institucionais, educativas ou promocionais, quando permitido;

XII. melhorar a experiência do usuário e aprimorar funcionalidades;

XIII. realizar análises estatísticas, métricas e estudos de uso;

XIV. cumprir solicitações de titulares, autoridades, ordens judiciais ou administrativas;

XV. exercer direitos em processos judiciais, administrativos ou arbitrais;

XVI. viabilizar integrações com serviços de terceiros;

XVII. operar recursos de inteligência artificial, quando contratados ou utilizados;

XVIII. proteger a Bivvo, seus clientes, usuários, parceiros e terceiros contra riscos legais, técnicos, reputacionais ou financeiros.

Quando a Bivvo atua como Operadora, as finalidades específicas do tratamento dos dados de contatos, leads e clientes finais são determinadas pelo Cliente Controlador.

11. BASES LEGAIS UTILIZADAS
A Bivvo poderá tratar dados pessoais com fundamento nas seguintes bases legais previstas na LGPD:

I. execução de contrato ou procedimentos preliminares, para viabilizar contratação, acesso, suporte, cobrança e prestação dos serviços;

II. cumprimento de obrigação legal ou regulatória, para emissão de notas fiscais, guarda de registros, atendimento a autoridades e demais obrigações legais;

III. legítimo interesse, para segurança, prevenção à fraude, melhoria dos serviços, relacionamento comercial, comunicações institucionais e proteção de direitos;

IV. consentimento, quando necessário para determinadas comunicações, cookies não essenciais, campanhas ou tratamentos específicos;

V. exercício regular de direitos, em processos judiciais, administrativos ou arbitrais;

VI. proteção do crédito, quando aplicável a cobranças, análise de risco ou inadimplência;

VII. proteção da vida ou da incolumidade física, em situações excepcionais;

VIII. outras bases legais previstas na LGPD, quando aplicáveis ao caso concreto.

Quando a Bivvo atua como Operadora, cabe ao Cliente definir a base legal adequada para o tratamento dos dados pessoais de seus contatos, leads e clientes finais.

12. COOKIES E TECNOLOGIAS SEMELHANTES
A Bivvo poderá utilizar cookies, pixels, tags, scripts, ferramentas de análise e tecnologias semelhantes em seus sites, páginas, landing pages e ambientes digitais.

Essas tecnologias podem ser utilizadas para:

I. permitir o funcionamento adequado do site;

II. manter sessões ativas e seguras;

III. registrar preferências do usuário;

IV. medir desempenho e audiência;

V. analisar comportamento de navegação;

VI. melhorar a experiência do usuário;

VII. personalizar conteúdos e comunicações;

VIII. direcionar campanhas de marketing;

IX. medir conversões e resultados comerciais;

X. prevenir fraudes e reforçar a segurança.

Os cookies podem ser classificados como:

Cookies necessários: essenciais para o funcionamento do site e da Plataforma.

Cookies funcionais: permitem lembrar preferências e melhorar a experiência.

Cookies analíticos ou estatísticos: ajudam a entender como usuários interagem com nossos canais.

Cookies de marketing: utilizados para publicidade, mensuração de campanhas e personalização de conteúdos.

O Titular poderá gerenciar suas preferências de cookies por meio do banner de cookies, quando disponível, ou pelas configurações do navegador.

A desativação de determinados cookies poderá afetar o funcionamento de algumas páginas ou funcionalidades.

13. INTEGRAÇÕES COM META, WHATSAPP E OUTROS TERCEIROS
A Plataforma Bivvo pode ser integrada a serviços de terceiros, incluindo Meta, WhatsApp, WhatsApp Business Platform, Instagram, Facebook, Messenger, provedores de e-mail, SMS, telefonia, CRMs, ERPs, gateways de pagamento, n8n, Dify, OpenAI, ferramentas de IA, APIs externas e outros provedores.

Para viabilizar essas integrações, determinados dados poderão ser compartilhados ou trafegar por esses terceiros, como:

I. identificadores de conta;

II. números telefônicos;

III. mensagens;

IV. nomes de contatos;

V. IDs de conversas;

VI. status de envio, entrega e leitura;

VII. tokens, permissões e credenciais técnicas;

VIII. dados de templates, campanhas e eventos;

IX. arquivos, mídias e anexos enviados ou recebidos;

X. metadados necessários à operação da integração.

O Cliente reconhece que tais terceiros possuem suas próprias políticas de privacidade, termos de uso, regras de tratamento de dados, medidas de segurança, bases legais, servidores, países de armazenamento e prazos de retenção.

A Bivvo não controla as práticas de privacidade, decisões, políticas, infraestrutura, disponibilidade ou tratamento de dados realizado diretamente por terceiros.

O uso de canais como WhatsApp, Instagram, Facebook e outros serviços integrados dependerá da aceitação e cumprimento das políticas dos respectivos provedores.

14. INTELIGÊNCIA ARTIFICIAL E AUTOMAÇÕES
A Bivvo poderá oferecer ou permitir integrações com ferramentas de inteligência artificial, modelos de linguagem, agentes virtuais, classificadores, sumarizadores, assistentes automatizados e recursos semelhantes.

Quando o Cliente utilizar recursos de IA, determinados dados poderão ser processados para:

I. gerar respostas automáticas;

II. classificar conversas;

III. resumir atendimentos;

IV. sugerir mensagens;

V. interpretar intenções;

VI. automatizar fluxos;

VII. melhorar o atendimento;

VIII. executar comandos ou integrações.

O Cliente deverá avaliar quais dados serão enviados a ferramentas de IA, limitar o envio de dados excessivos ou sensíveis, revisar os resultados gerados e informar os titulares quando necessário.

A Bivvo não recomenda que o Cliente envie dados pessoais sensíveis, segredos comerciais, informações sigilosas ou dados excessivos para ferramentas de IA sem avaliação jurídica, técnica e de segurança adequada.

Quando o recurso de IA depender de terceiros, como provedores externos de modelos, o tratamento também estará sujeito às políticas e termos desses provedores.

15. COMPARTILHAMENTO DE DADOS PESSOAIS
A Bivvo poderá compartilhar dados pessoais, conforme necessário e nos limites da legislação aplicável, com:

I. provedores de infraestrutura, hospedagem, banco de dados, armazenamento e segurança;

II. provedores de pagamento, cobrança, emissão fiscal e contabilidade;

III. ferramentas de atendimento, suporte, CRM, comunicação e gestão interna;

IV. provedores de e-mail, SMS, telefonia, WhatsApp, Meta e demais canais de comunicação;

V. ferramentas de automação, webhooks, APIs e integrações configuradas pelo Cliente;

VI. provedores de inteligência artificial, quando utilizados;

VII. consultores, advogados, auditores, contadores e prestadores profissionais;

VIII. autoridades públicas, judiciais, administrativas, regulatórias ou fiscais, quando necessário;

IX. empresas do mesmo grupo econômico, sucessores, compradores ou interessados em operações societárias, respeitada a legislação aplicável;

X. terceiros autorizados pelo Cliente ou pelo Titular.

A Bivvo não vende dados pessoais.

O compartilhamento será realizado apenas quando necessário para as finalidades descritas nesta Política, para execução dos serviços, cumprimento de obrigações legais, proteção de direitos, segurança, prevenção à fraude ou mediante autorização aplicável.

16. TRANSFERÊNCIA INTERNACIONAL DE DADOS
Alguns dados pessoais poderão ser transferidos, armazenados ou processados fora do Brasil, especialmente quando utilizarmos provedores de nuvem, serviços de infraestrutura, plataformas de comunicação, Meta, WhatsApp, ferramentas de IA, APIs internacionais ou outros fornecedores localizados no exterior.

Quando houver transferência internacional de dados, a Bivvo adotará medidas razoáveis para garantir que o tratamento ocorra em conformidade com a LGPD, incluindo, quando aplicável:

I. cláusulas contratuais adequadas;

II. avaliação de fornecedores;

III. medidas técnicas e organizacionais de segurança;

IV. limitação do compartilhamento ao necessário;

V. observância de padrões compatíveis de proteção de dados.

O Cliente reconhece que o uso de serviços como Meta, WhatsApp, Instagram, Facebook, provedores de IA e outras plataformas globais poderá envolver transferência internacional de dados conforme as políticas desses terceiros.

17. SEGURANÇA DA INFORMAÇÃO
A Bivvo adota medidas técnicas, administrativas e organizacionais razoáveis para proteger dados pessoais contra acessos não autorizados, perda, destruição, alteração, divulgação indevida ou uso inadequado.

Entre as medidas que podem ser adotadas, conforme aplicável, estão:

I. controle de acesso;

II. autenticação de usuários;

III. segregação de permissões;

IV. registros de logs;

V. monitoramento de segurança;

VI. backups;

VII. criptografia ou proteção de dados em trânsito e/ou em repouso, quando aplicável;

VIII. políticas internas de segurança;

IX. limitação de acesso a colaboradores e prestadores autorizados;

X. medidas de prevenção, detecção e resposta a incidentes.

Apesar dos esforços de segurança, nenhum sistema conectado à internet é absolutamente seguro. O Titular e o Cliente reconhecem que existem riscos inerentes ao uso de sistemas digitais, redes públicas, integrações, APIs, dispositivos, navegadores e serviços de terceiros.

O Cliente também deverá adotar medidas próprias de segurança, incluindo:

I. uso de senhas fortes;

II. não compartilhamento de credenciais;

III. revisão periódica de usuários ativos;

IV. exclusão de acessos de ex-colaboradores;

V. proteção de computadores e dispositivos;

VI. uso de redes seguras;

VII. treinamento da equipe;

VIII. cuidado com phishing, links suspeitos e engenharia social;

IX. gestão adequada de tokens, APIs e credenciais de terceiros.

A Bivvo não será responsável por incidentes decorrentes de culpa exclusiva do Cliente, credenciais compartilhadas, dispositivos comprometidos, vírus, malware, engenharia social, redes inseguras, usuários internos, permissões inadequadas ou falhas em serviços de terceiros.

18. INCIDENTES DE SEGURANÇA
Caso a Bivvo identifique incidente de segurança que possa acarretar risco ou dano relevante aos titulares, adotará medidas razoáveis para:

I. avaliar a natureza e extensão do incidente;

II. conter e mitigar os riscos;

III. identificar dados e titulares potencialmente afetados;

IV. comunicar o Cliente Controlador, quando a Bivvo atuar como Operadora;

V. colaborar com o Cliente na apuração e mitigação, quando cabível;

VI. comunicar autoridades e titulares, quando exigido pela legislação aplicável e quando a Bivvo atuar como Controladora.

Quando a Bivvo atuar como Operadora, caberá ao Cliente, na qualidade de Controlador, avaliar a necessidade de comunicação à Autoridade Nacional de Proteção de Dados, aos titulares ou a outros órgãos competentes, salvo disposição contratual ou legal diversa.

O Cliente deverá comunicar imediatamente à Bivvo qualquer incidente, suspeita de vazamento, acesso indevido, perda de credenciais ou uso não autorizado relacionado à sua conta ou aos dados tratados na Plataforma.

19. RETENÇÃO E EXCLUSÃO DE DADOS
A Bivvo manterá dados pessoais pelo tempo necessário ao cumprimento das finalidades previstas nesta Política, dos Termos de Uso, de obrigações legais, regulatórias, fiscais, contábeis, contratuais, de segurança e de exercício regular de direitos.

Os prazos de retenção poderão variar conforme:

I. natureza do dado;

II. finalidade do tratamento;

III. base legal aplicável;

IV. obrigações legais ou regulatórias;

V. necessidade de defesa em processos;

VI. prevenção à fraude;

VII. segurança da Plataforma;

VIII. vigência contratual;

IX. política de backup;

X. solicitações do Cliente ou do Titular.

Os registros de acesso a aplicações de internet poderão ser mantidos pelo prazo mínimo exigido pelo Marco Civil da Internet.

Após o término da relação contratual, dados da conta do Cliente poderão ser mantidos pelo prazo necessário para cumprimento de obrigações legais, exercício regular de direitos, segurança, auditoria, prevenção à fraude, cobrança, histórico contratual ou eventual reativação.

Dados tratados pela Bivvo como Operadora poderão ser excluídos, anonimizados ou mantidos conforme instruções do Cliente, limites técnicos, obrigações legais e prazos previstos nos Termos de Uso, contrato ou Política de Retenção aplicável.

O Cliente é responsável por exportar ou realizar backup dos dados que deseje preservar antes do encerramento da contratação, cancelamento, inadimplência ou exclusão da conta.

20. DIREITOS DOS TITULARES
Nos termos da LGPD, o Titular poderá solicitar, quando aplicável:

I. confirmação da existência de tratamento;

II. acesso aos dados pessoais;

III. correção de dados incompletos, inexatos ou desatualizados;

IV. anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade;

V. portabilidade dos dados, quando regulamentada pela ANPD;

VI. eliminação de dados tratados com base no consentimento;

VII. informação sobre compartilhamento de dados;

VIII. informação sobre a possibilidade de não fornecer consentimento e suas consequências;

IX. revogação do consentimento;

X. oposição ao tratamento, quando aplicável;

XI. revisão de decisões automatizadas, quando aplicável;

XII. peticionamento perante a Autoridade Nacional de Proteção de Dados.

Quando a Bivvo atuar como Controladora, as solicitações poderão ser encaminhadas diretamente à Bivvo pelo canal indicado nesta Política.

Quando a Bivvo atuar como Operadora em nome do Cliente, a solicitação deverá ser preferencialmente direcionada ao próprio Cliente, que é o Controlador dos dados. Nesses casos, a Bivvo poderá orientar o Titular a procurar o Cliente ou poderá encaminhar a solicitação ao Cliente, quando possível e apropriado.

Para proteger a privacidade e segurança dos titulares, a Bivvo poderá solicitar informações adicionais para confirmar a identidade do solicitante antes de atender a uma requisição.

21. CANAL PARA EXERCÍCIO DE DIREITOS E CONTATO SOBRE PRIVACIDADE
Para dúvidas, solicitações, reclamações ou exercício de direitos relacionados a dados pessoais, entre em contato com a Bivvo pelo canal oficial de privacidade:

E-mail: legal@bivvo.com.br

Encarregado/DPO: lgpd@bivvo.com.br

Empresa: Bivvo
CNPJ: 61.912.973/0001-91
Endereço: Rua Waldemar Falcão, 979, Edifício Horto Office, Sala 201, Horto Florestal, CEP 40295-010, Salvador/BA

A Bivvo analisará as solicitações recebidas e responderá dentro de prazo razoável, observados os prazos previstos na legislação aplicável, a complexidade da solicitação, a necessidade de validação de identidade e a natureza do tratamento.

22. COMUNICAÇÕES COMERCIAIS E MARKETING
A Bivvo poderá utilizar dados de contato para enviar comunicações institucionais, comerciais, educativas, promocionais, novidades, convites, materiais, conteúdos, ofertas ou informações sobre produtos e serviços.

O envio poderá ocorrer com base em consentimento, legítimo interesse ou outra base legal aplicável, observadas as regras da LGPD.

O Titular poderá solicitar a interrupção do recebimento de comunicações promocionais a qualquer momento, por meio de link de descadastro, resposta à mensagem ou contato com a Bivvo.

Comunicações operacionais, técnicas, contratuais, de segurança, cobrança, suporte ou relacionadas à prestação dos serviços poderão continuar sendo enviadas mesmo após o descadastro de comunicações promocionais.

23. LINKS PARA SITES E PLATAFORMAS DE TERCEIROS
Os sites, páginas, mensagens ou a própria Plataforma Bivvo poderão conter links, integrações, botões ou redirecionamentos para sites, aplicativos, plataformas ou serviços de terceiros.

A Bivvo não controla e não se responsabiliza pelas práticas de privacidade, segurança, conteúdo, cookies, políticas ou tratamento de dados realizados por terceiros.

Recomendamos que o Titular leia atentamente as políticas de privacidade e termos de uso de qualquer site, aplicativo ou serviço externo antes de fornecer dados pessoais.

24. ATUALIZAÇÕES DESTA POLÍTICA
A Bivvo poderá atualizar esta Política de Privacidade a qualquer momento, especialmente para refletir alterações legais, regulatórias, operacionais, técnicas, comerciais, de segurança, de funcionalidades, de integrações ou de práticas de tratamento de dados.

A versão atualizada será disponibilizada nos canais oficiais da Bivvo, podendo ser comunicada por e-mail, aviso na Plataforma, mensagem ou outro meio adequado.

O uso continuado da Plataforma após a publicação da versão atualizada será interpretado como ciência da nova Política.

Recomendamos que o Titular consulte esta Política periodicamente.

25. DISPOSIÇÕES GERAIS
Esta Política será regida pelas leis da República Federativa do Brasil.

Caso qualquer disposição desta Política seja considerada inválida, ilegal ou inexequível, as demais disposições permanecerão válidas e eficazes.

A eventual tolerância da Bivvo quanto ao descumprimento de qualquer condição desta Política não constituirá renúncia, novação ou alteração de direitos.

Esta Política complementa os Termos de Uso da Plataforma Bivvo e demais documentos contratuais aplicáveis.

26. DECLARAÇÃO FINAL
Ao utilizar a Plataforma Bivvo, contratar seus serviços, acessar seus sites ou interagir com seus canais, você declara ciência de que:

I. a Bivvo poderá tratar dados pessoais conforme esta Política;

II. a Bivvo poderá atuar como Controladora ou Operadora, conforme o contexto;

III. o Cliente é responsável pelos dados de seus contatos, leads e clientes finais tratados na Plataforma;

IV. integrações com Meta, WhatsApp, Instagram, Facebook e outros terceiros poderão envolver compartilhamento e transferência de dados;

V. a Bivvo não controla as práticas de privacidade, decisões, bloqueios, políticas ou infraestrutura de terceiros;

VI. os direitos dos titulares poderão ser exercidos pelos canais indicados nesta Política;

VII. a Bivvo adota medidas razoáveis de segurança, sem garantir inviolabilidade absoluta de sistemas conectados à internet.

Bivvo
CNPJ: 61.912.973/0001-91
Endereço: Rua Waldemar Falcão, 979, Edifício Horto Office, Sala 201, Horto Florestal, CEP 40295-010, Salvador/BA
E-mail de privacidade/DPO: lgpd@bivvo.com.br`}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
