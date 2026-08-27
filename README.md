# 📋 Sistema de Backlog

Sistema web desenvolvido para **gerenciamento e acompanhamento de chamados**, permitindo registrar, consultar e atualizar solicitações de forma centralizada.

## 🚀 Sobre o projeto

O sistema foi desenvolvido para facilitar o controle de chamados e solicitações, centralizando as informações em uma interface simples e objetiva.

A aplicação possui integração com **Supabase** para armazenamento e gerenciamento dos dados.

## ✨ Funcionalidades

* 📋 Cadastro de chamados
* 🔎 Consulta de chamados
* 🔄 Atualização de status
* 📝 Registro de observações
* 👤 Identificação do solicitante
* 🏷️ Identificação da PA
* 📊 Controle do tipo de solicitação
* 📅 Registro automático de data de criação
* 🔄 Registro de atualização dos chamados
* ⚠️ Validação para evitar duplicidade de chamados em determinadas situações

## 🛠️ Tecnologias utilizadas

* **HTML5**
* **CSS3**
* **JavaScript**
* **Supabase**
* **Git / GitHub**
* **Vercel**

## 📁 Estrutura do projeto

```text
├── index.html
├── config.js
├── style.css
└── README.md
```

> A estrutura pode variar de acordo com a versão atual do projeto.

## 🗄️ Banco de dados

O projeto utiliza o **Supabase** como backend e banco de dados.

A principal tabela utilizada pela aplicação é:

```text
chamados
```

Principais informações armazenadas:

| Campo         | Descrição                      |
| ------------- | ------------------------------ |
| `id`          | Identificador único do chamado |
| `numero`      | Número do chamado              |
| `solicitante` | Solicitante                    |
| `tipo`        | Tipo da solicitação            |
| `pa`          | PA relacionada                 |
| `observacoes` | Observações do chamado         |
| `status`      | Situação do chamado            |
| `created_at`  | Data de criação                |
| `updated_at`  | Data da última atualização     |

### Status disponíveis

```text
pendente
resolvido
```

## 🔐 Segurança

Este projeto utiliza a integração pública do Supabase para comunicação com o frontend.

**Nunca adicione ao repositório:**

* Senhas
* Tokens privados
* Secret Keys
* Service Role Keys
* Arquivos `.env`
* Certificados privados
* Credenciais de acesso
* Informações internas ou confidenciais

As regras de acesso aos dados devem ser controladas através das **RLS Policies do Supabase**.

## ⚙️ Configuração

Para executar o projeto, configure a conexão com o Supabase utilizando as credenciais públicas apropriadas para o frontend.

Exemplo conceitual:

```javascript
const SUPABASE_URL = "SUA_URL";
const SUPABASE_KEY = "SUA_PUBLISHABLE_KEY";
```

> Nunca utilize uma `Secret Key` ou `Service Role Key` diretamente no frontend.

## ▶️ Execução local

Por ser uma aplicação web baseada em HTML, CSS e JavaScript, o projeto pode ser executado utilizando um servidor local.

No VS Code, uma opção é utilizar a extensão:

**Live Server**

Depois:

1. Abra o projeto no VS Code.
2. Abra o arquivo `index.html`.
3. Clique com o botão direito.
4. Selecione **Open with Live Server**.
5. A aplicação será aberta no navegador.

## 🌐 Deploy

O projeto pode ser publicado utilizando o **Vercel**, conectado diretamente ao repositório GitHub.

Fluxo recomendado:

```text
Alteração no código
        ↓
Git Commit
        ↓
Git Push
        ↓
GitHub
        ↓
Vercel
        ↓
Deploy
```

## 🔄 Fluxo de desenvolvimento

Para realizar uma alteração:

```bash
git pull
```

Realize as alterações no projeto e depois:

```bash
git add .
git commit -m "descrição da alteração"
git push
```

Após o `push`, o Vercel poderá realizar automaticamente um novo deploy, caso o projeto esteja configurado para deploy contínuo.

## 📌 Pontos de atenção

* Verifique as alterações antes de realizar o `push`.
* Não publique credenciais ou informações confidenciais.
* Antes de alterar o banco de dados, faça uma validação da estrutura existente.
* Alterações nas RLS Policies podem afetar diretamente o funcionamento da aplicação.
* Sempre teste as principais funcionalidades após alterações no sistema.

## 👥 Manutenção

O projeto deve ser mantido através do repositório GitHub.

Recomenda-se manter:

* Código atualizado
* README atualizado
* Backlog atualizado
* Histórico de commits organizado
* Configurações do Supabase documentadas
* Processo de deploy documentado

---

## 📄 Status do projeto

**Em manutenção e evolução.**

Novas funcionalidades, correções e melhorias devem ser registradas no backlog do projeto.

---

### Desenvolvido para gerenciamento interno de chamados.

**Tecnologias:** HTML • CSS • JavaScript • Supabase • GitHub • Vercel
