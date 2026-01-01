# 🚀 Deploy na Vercel - Passo a Passo

## Pré-requisitos
- Conta no GitHub
- Conta na Vercel (gratuita)
- Código do projeto no GitHub

## Passo 1: Preparar o Repositório GitHub

1. Se ainda não tem, inicialize o Git:
   ```bash
   git init
   git add .
   git commit -m "Primeiro commit - Gerenciador de Tarefas"
   ```

2. Crie um repositório no GitHub:
   - Acesse [github.com](https://github.com)
   - Clique em "New repository"
   - Nome: `gerenciador-tarefas`
   - Deixe público ou privado
   - NÃO marque "Initialize with README"
   - Clique em "Create repository"

3. Conecte o repositório local ao GitHub:
   ```bash
   git remote add origin https://github.com/SEU-USUARIO/gerenciador-tarefas.git
   git branch -M main
   git push -u origin main
   ```

## Passo 2: Deploy na Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Clique em "Sign Up" ou "Log In"
3. Conecte com sua conta do GitHub
4. Clique em "Add New..." → "Project"
5. Selecione o repositório `gerenciador-tarefas`
6. Clique em "Import"

## Passo 3: Configurar Variáveis de Ambiente

**IMPORTANTE**: Antes de fazer o deploy, configure as variáveis:

1. Na tela de configuração do projeto, vá em "Environment Variables"
2. Adicione as seguintes variáveis:

   **Nome**: `DATABASE_URL`
   **Valor**: `postgresql://postgres.igutvvjatkuedfevrmtl:92250121As2026@aws-0-us-west-2.pooler.supabase.com:5432/postgres`

   **Nome**: `JWT_SECRET`
   **Valor**: `minha-chave-jwt-super-secreta-2026-gerenciador-tarefas`

   **Nome**: `NODE_ENV`
   **Valor**: `production`

3. Clique em "Deploy"

## Passo 4: Aguardar Deploy

- A Vercel vai automaticamente:
  - Instalar as dependências (`npm install`)
  - Fazer o build
  - Deploy da aplicação

- Em 1-2 minutos, você terá uma URL tipo:
  ```
  https://gerenciador-tarefas-seu-usuario.vercel.app
  ```

## Passo 5: Testar a API

Abra o terminal e teste:

```bash
curl https://SEU-APP.vercel.app/api/health
```

Deve retornar:
```json
{"status":"ok","message":"Servidor rodando","timestamp":"..."}
```

## Passo 6: Atualizar a Extensão

1. Abra o arquivo `auth.js`
2. Na linha 2, altere:
   ```javascript
   const API_URL = 'https://SEU-APP.vercel.app/api';
   ```

3. Salve e recarregue a extensão no Chrome

## 🎉 Pronto!

Agora sua extensão funciona em qualquer dispositivo!

## Atualizações Futuras

Toda vez que você fizer alterações:

```bash
git add .
git commit -m "Descrição da alteração"
git push
```

A Vercel fará o deploy automático em segundos!

## 🆘 Problemas Comuns

### Erro 500 no deploy
- Verifique se as variáveis de ambiente estão corretas
- Verifique os logs na Vercel Dashboard

### CORS Error
- Já configurado no `server.js` com `app.use(cors())`
- Se persistir, adicione domínios específicos

### Banco não conecta
- Verifique se a `DATABASE_URL` está correta
- Confirme que o Supabase está ativo
