# Configurar o banco de dados (Supabase) e publicar na Vercel

## 1. Criar o projeto no Supabase
1. Acesse https://supabase.com e crie uma conta (dá pra usar login do GitHub/Google).
2. Clique em **New project**, escolha um nome (ex: `backlog-headset`) e uma senha de banco (guarde-a, mas você não vai precisar dela no dia a dia).
3. Aguarde ~2 minutos até o projeto ficar pronto.

## 2. Criar a tabela
1. No menu lateral, clique em **SQL Editor** → **New query**.
2. Abra o arquivo `supabase-schema.sql` (está na mesma pasta deste guia), copie todo o conteúdo e cole no editor.
3. Clique em **Run**. Isso cria a tabela `chamados`, as regras de acesso e insere 1 linha de exemplo.

## 3. Pegar as credenciais
1. No menu lateral, vá em **Project Settings** (ícone de engrenagem) → **API**.
2. Copie o **Project URL**.
3. Copie a chave em **Project API keys → anon public**.

## 4. Preencher o `config.js`
Abra o arquivo `config.js` e substitua:
```js
const SUPABASE_URL = "COLE_AQUI_A_PROJECT_URL";
const SUPABASE_ANON_KEY = "COLE_AQUI_A_ANON_KEY";
```
pelos valores copiados no passo 3.

## 5. Testar localmente (opcional)
Dentro da pasta do projeto:
```bash
python3 -m http.server 8000
```
Abra `http://localhost:8000` — o indicador no topo da página deve mostrar **"Sincronizado"** em verde.

## 6. Publicar na Vercel
1. Suba os arquivos (`index.html`, `style.css`, `config.js`) para um repositório no GitHub.
2. Na Vercel: **Add New → Project** → importe o repositório.
3. Como é um site estático (sem framework), a Vercel detecta sozinha — não precisa configurar build command nem output directory. Clique em **Deploy**.
4. Pronto: qualquer pessoa que acessar a URL vai ler e escrever no mesmo banco, em tempo real.

## Sobre segurança
A chave `anon` fica visível no código-fonte da página — isso é esperado, ela é feita pra ser pública. O controle de acesso está nas regras (RLS) do banco, que hoje liberam leitura/escrita para quem tiver o link do site. Para um uso interno é aceitável, mas **não divulgue a URL publicamente**. Se depois quiser exigir login (ex: só e-mails da empresa), me avise que eu adiciono autenticação.

## Arquivos desta entrega
| Arquivo | Função |
|---|---|
| `index.html` | Estrutura da página + lógica de conexão com o Supabase |
| `style.css` | Estilo visual |
| `config.js` | Onde você cola a URL e a chave do seu projeto Supabase |
| `supabase-schema.sql` | Script que cria a tabela no banco (rodar uma única vez) |
