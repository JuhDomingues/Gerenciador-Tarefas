# 🚀 Configuração do Supabase

## Passo 1: Criar conta no Supabase

1. Acesse [https://supabase.com](https://supabase.com)
2. Clique em "Start your project"
3. Faça login com GitHub, Google ou email

## Passo 2: Criar novo projeto

1. Clique em "New Project"
2. Escolha sua organização (ou crie uma nova)
3. Preencha os dados do projeto:
   - **Project name**: `gerenciador-tarefas` (ou qualquer nome)
   - **Database Password**: Crie uma senha forte e **ANOTE**
   - **Region**: Escolha a região mais próxima (ex: South America)
4. Clique em "Create new project"
5. Aguarde alguns minutos até o projeto estar pronto

## Passo 3: Obter credenciais do banco de dados

1. No painel do projeto, vá em **Settings** (⚙️ no menu lateral)
2. Clique em **Database**
3. Role até encontrar **Connection String**
4. Selecione a aba **URI**
5. Copie a string de conexão (algo como):
   ```
   postgresql://postgres.xxxxxxxxxxxx:SUA-SENHA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
   ```
6. **IMPORTANTE**: Substitua `[YOUR-PASSWORD]` pela senha que você criou no Passo 2

## Passo 4: Configurar o arquivo .env

1. Abra o arquivo `.env` na raiz do projeto
2. Cole a string de conexão no campo `DATABASE_URL`:
   ```env
   DATABASE_URL=postgresql://postgres.xxxxxxxxxxxx:SUA-SENHA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
   ```
3. Salve o arquivo

## Passo 5: Testar a conexão

Execute o servidor:
```bash
npm start
```

Você deve ver a mensagem:
```
✅ Banco de dados Supabase inicializado com sucesso
🚀 Servidor rodando na porta 3000
```

## Passo 6: Verificar tabelas criadas (Opcional)

1. No painel do Supabase, vá em **Table Editor** (🗄️ no menu lateral)
2. Você deve ver as tabelas criadas:
   - `users` - Usuários do sistema
   - `profiles` - Perfis dos usuários
   - `tasks` - Tarefas dos usuários

## 🎉 Pronto!

Agora seu sistema está conectado ao Supabase e pode sincronizar entre dispositivos!

## 📱 Como sincronizar entre dispositivos

1. **Mesmo backend**: Coloque seu servidor em produção (Heroku, Railway, Render, etc.)
2. **Mesma conta**: Faça login com o mesmo email em diferentes dispositivos
3. **Sincronização automática**: Os dados serão salvos no Supabase automaticamente

## 🔒 Segurança

- ✅ Não commite o arquivo `.env` (já está no .gitignore)
- ✅ Use senhas fortes
- ✅ Em produção, altere o `JWT_SECRET` no `.env`

## 🆘 Problemas comuns

### Erro de conexão
- Verifique se a senha no DATABASE_URL está correta
- Confirme que o projeto Supabase está ativo

### Tabelas não criadas
- O servidor cria as tabelas automaticamente na primeira execução
- Verifique os logs do servidor para erros

### ECONNREFUSED
- Verifique se está usando a string de conexão correta
- Confirme que o Supabase está online
