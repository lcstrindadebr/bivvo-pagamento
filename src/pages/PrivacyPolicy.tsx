import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          className="mb-8" 
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>

        <article className="prose prose-slate max-w-none dark:prose-invert">
          <h1 className="text-3xl font-bold mb-2">POLÍTICA DE PRIVACIDADE - BIVVO</h1>
          <p className="text-muted-foreground mb-8">Última atualização: 16/05/2026</p>

          <div className="space-y-6 text-foreground/90 leading-relaxed">
            <p>A sua privacidade é muito importante para nós.</p>

            <p>
              Esta Política de Privacidade (“Política”) tem como objetivo explicar, de forma clara e transparente, como a Bivvo, inscrita no CNPJ sob o nº 61.912.973/0001-91, com sede na Rua Waldemar Falcão, 979, Edifício Horto Office, Sala 201, Horto Florestal, CEP 40295-010, Salvador/BA, doravante denominada simplesmente Bivvo, coleta, utiliza, armazena, compartilha e protege dados pessoais no contexto da utilização de seus sites, canais de atendimento, plataforma, integrações, automações e serviços relacionados.
            </p>

            <p>
              Esta Política deve ser lida em conjunto com os Termos de Uso da Plataforma Bivvo, que regulam as condições de contratação, acesso e utilização da Plataforma.
            </p>

            <p>
              Ao acessar nossos sites, contratar nossos serviços, utilizar a Plataforma Bivvo, interagir com nossos canais de atendimento ou fornecer dados pessoais à Bivvo, você declara estar ciente das condições desta Política.
            </p>

            <p>
              Caso você não concorde com esta Política, recomendamos que não utilize a Plataforma e entre em contato conosco para esclarecimentos.
            </p>

            <h2 className="text-xl font-semibold mt-8">1. CONCEITOS IMPORTANTES</h2>
            <p>Para facilitar a compreensão desta Política, utilizamos os seguintes conceitos:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Bivvo:</strong> plataforma tecnológica de atendimento, gestão de conversas, automações, disparos, integrações e centralização de canais de comunicação.</li>
              <li><strong>Cliente ou Contratante:</strong> pessoa física ou jurídica que contrata a Plataforma Bivvo para uso próprio, por sua equipe, colaboradores, representantes ou usuários autorizados.</li>
              <li><strong>Usuário:</strong> pessoa autorizada pelo Cliente a acessar e utilizar a Plataforma, incluindo administradores, gestores, atendentes, operadores, vendedores, colaboradores, prestadores de serviço ou terceiros autorizados.</li>
              <li><strong>Usuário Administrador:</strong> usuário com poderes para gerenciar a conta do Cliente, cadastrar usuários, definir permissões, conectar canais, configurar integrações, criar automações e administrar a utilização da Plataforma.</li>
              <li><strong>Contato, Lead ou Cliente Final:</strong> pessoa natural que interage com o Cliente por meio dos canais conectados à Plataforma Bivvo, como WhatsApp, Instagram, Facebook, e-mail, webchat, SMS, telefonia ou outros meios.</li>
              <li><strong>Dados Pessoais:</strong> informações relacionadas a pessoa natural identificada ou identificável, como nome, telefone, e-mail, CPF, endereço, IP, identificadores online, mensagens, imagem, voz e demais dados que possam identificar alguém.</li>
              <li><strong>Dados Pessoais Sensíveis:</strong> dados sobre origem racial ou étnica, convicção religiosa, opinião política, filiação sindical, dados referentes à saúde, vida sexual, dado genético ou biométrico, conforme definição da LGPD.</li>
              <li><strong>LGPD:</strong> Lei Geral de Proteção de Dados Pessoais, Lei nº 13.709/2018.</li>
              <li><strong>Marco Civil da Internet:</strong> Lei nº 12.965/2014, que estabelece princípios, garantias, direitos e deveres para o uso da internet no Brasil.</li>
              <li><strong>Titular:</strong> pessoa natural a quem se referem os dados pessoais.</li>
              <li><strong>Controlador:</strong> pessoa física ou jurídica responsável por tomar decisões sobre o tratamento de dados pessoais.</li>
              <li><strong>Operador:</strong> pessoa física ou jurídica que realiza o tratamento de dados pessoais em nome do Controlador.</li>
              <li><strong>Tratamento:</strong> toda operação realizada com dados pessoais, como coleta, recepção, classificação, utilização, acesso, reprodução, transmissão, distribuição, processamento, armazenamento, eliminação, avaliação, controle, modificação, comunicação, transferência, difusão ou extração.</li>
              <li><strong>Serviços de Terceiros:</strong> plataformas, APIs, provedores, aplicativos e ferramentas externas integradas ou utilizadas em conjunto com a Bivvo, como Meta, WhatsApp, Instagram, Facebook, e-mail, SMS, telefonia, CRMs, ERPs, n8n, Dify, OpenAI, provedores de infraestrutura, gateways de pagamento e demais sistemas.</li>
            </ul>

            <h2 className="text-xl font-semibold mt-8">2. A QUEM ESTA POLÍTICA SE APLICA</h2>
            <p>Esta Política se aplica aos dados pessoais tratados pela Bivvo em relação a:</p>
            <ol className="list-roman pl-6 space-y-2">
              <li>visitantes dos sites, páginas, formulários, landing pages e canais digitais da Bivvo;</li>
              <li>leads, prospects e pessoas que entram em contato com a Bivvo;</li>
              <li>Clientes e representantes legais de Clientes;</li>
              <li>Usuários autorizados a acessar a Plataforma Bivvo;</li>
              <li>contatos, leads, clientes finais ou terceiros que interagem com Clientes da Bivvo por meio dos canais conectados à Plataforma;</li>
              <li>parceiros, fornecedores, prestadores de serviço e terceiros relacionados à operação da Bivvo.</li>
            </ol>
            <p>
              Esta Política não se aplica diretamente às práticas de privacidade dos Clientes da Bivvo, nem às práticas de terceiros integrados à Plataforma. Nessas hipóteses, é importante que o Titular consulte também as políticas de privacidade do respectivo Cliente, da Meta, WhatsApp, Instagram, Facebook, provedores de e-mail, telefonia, SMS, CRMs, ferramentas de automação e demais plataformas utilizadas.
            </p>

            <h2 className="text-xl font-semibold mt-8">3. PAPÉIS DA BIVVO NO TRATAMENTO DE DADOS</h2>
            <p>A Bivvo poderá atuar como Controladora ou como Operadora de dados pessoais, a depender do contexto do tratamento.</p>

            <h2 className="text-xl font-semibold mt-8">4. QUANDO A BIVVO ATUA COMO CONTROLADORA</h2>
            <p>
              A Bivvo atua como Controladora quando toma decisões sobre o tratamento de dados pessoais relacionados às suas próprias finalidades empresariais, comerciais, contratuais, administrativas, fiscais, financeiras, operacionais, de segurança e relacionamento.
            </p>
            <p>Isso ocorre, por exemplo, no tratamento de dados de:</p>
            <ol className="list-roman pl-6 space-y-2">
              <li>visitantes do site da Bivvo;</li>
              <li>leads que solicitam contato, demonstração ou proposta comercial;</li>
              <li>representantes legais, sócios, administradores e responsáveis financeiros dos Clientes;</li>
              <li>Usuários da Plataforma, quando necessário para cadastro, autenticação, suporte, segurança e gestão contratual;</li>
              <li>pessoas que entram em contato pelos canais oficiais da Bivvo;</li>
              <li>fornecedores, parceiros e prestadores de serviço;</li>
              <li>dados utilizados para cobrança, faturamento, emissão de notas fiscais, prevenção à fraude, análise de segurança e cumprimento de obrigações legais.</li>
            </ol>

            <h2 className="text-xl font-semibold mt-8">5. QUANDO A BIVVO ATUA COMO OPERADORA</h2>
            <p>Na maior parte das operações realizadas dentro da Plataforma, a Bivvo atua como Operadora dos dados pessoais tratados em nome do Cliente.</p>
            <p>Isso ocorre quando o Cliente utiliza a Plataforma Bivvo para:</p>
            <ol className="list-roman pl-6 space-y-2">
              <li>importar ou cadastrar contatos;</li>
              <li>gerenciar leads, clientes finais e conversas;</li>
              <li>enviar mensagens pelo WhatsApp, Instagram, Facebook, e-mail, SMS, telefonia, webchat ou outros canais;</li>
              <li>criar campanhas, disparos, templates e automações;</li>
              <li>configurar fluxos de atendimento, bots, regras, etiquetas e integrações;</li>
              <li>armazenar históricos de atendimento, mensagens, arquivos, mídias, protocolos, metadados e relatórios;</li>
              <li>integrar a Plataforma com ferramentas externas, como CRMs, ERPs, n8n, Dify, APIs, webhooks, IA e outros sistemas.</li>
            </ol>

            <h2 className="text-xl font-semibold mt-8">6. RESPONSABILIDADES DO CLIENTE COMO CONTROLADOR</h2>
            <p>Quando o Cliente utiliza a Plataforma para tratar dados pessoais de terceiros, caberá exclusivamente ao Cliente:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>possuir base legal adequada para o tratamento dos dados;</li>
              <li>obter consentimento quando necessário;</li>
              <li>informar os titulares sobre o tratamento de seus dados;</li>
              <li>manter política de privacidade própria, quando aplicável;</li>
              <li>respeitar direitos dos titulares;</li>
              <li>atender solicitações de acesso, correção, exclusão, anonimização, oposição, portabilidade e demais direitos previstos na LGPD;</li>
              <li>garantir que os dados inseridos na Plataforma foram obtidos de forma lícita;</li>
              <li>respeitar opt-outs, descadastros, bloqueios e pedidos de não contato;</li>
              <li>não utilizar listas compradas, raspadas, vazadas ou obtidas sem base legal;</li>
              <li>cumprir as políticas da Meta, WhatsApp, Instagram, Facebook e demais terceiros integrados;</li>
              <li>garantir que mensagens, campanhas, automações e disparos estejam em conformidade com a lei e com as regras dos canais utilizados;</li>
              <li>orientar seus usuários sobre boas práticas de privacidade, segurança e uso da Plataforma.</li>
            </ul>

            <h2 className="text-xl font-semibold mt-8">7. DADOS PESSOAIS QUE PODEMOS TRATAR</h2>
            <h3 className="text-lg font-medium mt-4">7.1. Dados cadastrais e de identificação</h3>
            <p>Podemos tratar: nome completo, CPF, e-mail, telefone, cargo, endereço comercial, dados de faturamento, entre outros.</p>
            
            <h3 className="text-lg font-medium mt-4">7.2. Dados de acesso e autenticação</h3>
            <p>Podemos tratar: login, senha criptografada, endereço IP, histórico de login, identificadores de dispositivo, etc.</p>

            <h3 className="text-lg font-medium mt-4">7.3. Dados de comunicação e suporte</h3>
            <p>Podemos tratar: mensagens enviadas à Bivvo, gravações de atendimento, solicitações de suporte, etc.</p>

            <h3 className="text-lg font-medium mt-4">7.4. Dados financeiros, fiscais e contratuais</h3>
            <p>Podemos tratar: dados para nota fiscal, status de pagamento, histórico financeiro, etc.</p>

            <h3 className="text-lg font-medium mt-4">7.5. Dados tratados dentro da Plataforma em nome do Cliente</h3>
            <p>O Cliente é responsável pela definição de quais dados de seus contatos serão tratados (nomes, telefones, mensagens, históricos, etc).</p>

            <h2 className="text-xl font-semibold mt-8">8. DADOS PESSOAIS SENSÍVEIS</h2>
            <p>A Bivvo não solicita dados sensíveis como regra, mas eles podem trafegar na plataforma se inseridos pelo Cliente ou seus usuários nas comunicações.</p>

            <h2 className="text-xl font-semibold mt-8">9. DADOS DE CRIANÇAS E ADOLESCENTES</h2>
            <p>A Plataforma é destinada ao uso empresarial. O tratamento de dados de menores deve observar rigorosamente as exigências da LGPD.</p>

            <h2 className="text-xl font-semibold mt-8">10. FINALIDADES DO TRATAMENTO</h2>
            <p>Os dados são tratados para permitir o uso da plataforma, suporte, faturamento, segurança, cumprimento de leis e melhoria dos serviços.</p>

            <h2 className="text-xl font-semibold mt-8">11. BASES LEGAIS UTILIZADAS</h2>
            <p>Utilizamos bases como execução de contrato, cumprimento de obrigação legal, legítimo interesse e consentimento.</p>

            <h2 className="text-xl font-semibold mt-8">12. COOKIES E TECNOLOGIAS SEMELHANTES</h2>
            <p>Utilizamos cookies necessários, funcionais, analíticos e de marketing para melhorar sua experiência.</p>

            <h2 className="text-xl font-semibold mt-8">13. INTEGRAÇÕES COM META, WHATSAPP E OUTROS TERCEIROS</h2>
            <p>A Bivvo se integra a diversos serviços que possuem suas próprias políticas de privacidade.</p>

            <h2 className="text-xl font-semibold mt-8">14. INTELIGÊNCIA ARTIFICIAL E AUTOMAÇÕES</h2>
            <p>Recursos de IA podem processar dados para gerar respostas e automações conforme contratado pelo Cliente.</p>

            <h2 className="text-xl font-semibold mt-8">15. COMPARTILHAMENTO DE DADOS PESSOAIS</h2>
            <p>Compartilhamos dados com provedores de infraestrutura, pagamento e parceiros necessários para a prestação do serviço. Não vendemos dados.</p>

            <h2 className="text-xl font-semibold mt-8">16. TRANSFERÊNCIA INTERNACIONAL DE DADOS</h2>
            <p>Dados podem ser processados fora do Brasil por provedores globais de nuvem e serviços de comunicação.</p>

            <h2 className="text-xl font-semibold mt-8">17. SEGURANÇA DA INFORMAÇÃO</h2>
            <p>Adotamos medidas técnicas e administrativas para proteger os dados, mas nenhum sistema é 100% seguro.</p>

            <h2 className="text-xl font-semibold mt-8">18. INCIDENTES DE SEGURANÇA</h2>
            <p>Em caso de incidentes, seguiremos os protocolos de mitigação e comunicação previstos em lei.</p>

            <h2 className="text-xl font-semibold mt-8">19. RETENÇÃO E EXCLUSÃO DE DADOS</h2>
            <p>Mantemos os dados pelo tempo necessário para as finalidades descritas e obrigações legais.</p>

            <h2 className="text-xl font-semibold mt-8">20. DIREITOS DOS TITULARES</h2>
            <p>Os titulares possuem direitos de acesso, correção, exclusão, entre outros previstos na LGPD.</p>

            <h2 className="text-xl font-semibold mt-8">21. CANAL DE CONTATO</h2>
            <p>E-mail: legal@bivvo.com.br | Encarregado: lgpd@bivvo.com.br</p>

            <div className="mt-12 pt-8 border-t border-border text-sm text-muted-foreground">
              <p>Bivvo - CNPJ: 61.912.973/0001-91</p>
              <p>Rua Waldemar Falcão, 979, Edifício Horto Office, Sala 201, Horto Florestal, CEP 40295-010, Salvador/BA</p>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};

export default PrivacyPolicy;