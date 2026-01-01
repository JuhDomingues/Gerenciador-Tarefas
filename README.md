# 📋 Gerenciador de Tarefas - Marketing Pro

Sistema de gerenciamento de tarefas por cliente com autenticação e sincronização em nuvem.

## 🚀 Funcionalidades

- ✅ **Autenticação de Usuários**: Login e registro com JWT
- ☁️ **Sincronização em Nuvem**: Acesse suas tarefas de qualquer dispositivo
- 👥 **Gestão de Clientes**: Organize tarefas por cliente
- 🔥 **Controle de Urgência**: Priorize tarefas (alta, média, baixa)
- ⏰ **Prazos e Alertas**: Configure deadlines e receba avisos de atrasos
- 📦 **Arquivamento**: Archive tarefas concluídas
- 📊 **Estatísticas**: Acompanhe sua produtividade
- 🔄 **Auto-Sync**: Sincronização automática ao modificar tarefas

## 📁 Estrutura do Projeto

```
gerenciador-tarefa/
├── manifest.json          # Configuração da extensão
├── login.html            # Tela de login/registro
├── sidebar.html          # Interface principal (sidebar)
├── sidebar.js            # Lógica da aplicação
├── sidebar-styles.css    # Estilos da sidebar
├── auth.js               # Autenticação e comunicação com API
├── server.js             # Servidor backend (Node.js)
├── package.json          # Dependências do servidor
└── README.md             # Este arquivo
```

## ⚙️ Configuração

### 1. Instalar Dependências do Servidor

```bash
npm install
```

### 2. Iniciar o Servidor Backend

```bash
npm start
```

O servidor rodará em `http://localhost:3000`

### 3. Carregar a Extensão no Navegador

#### Firefox:
1. Abra `about:debugging#/runtime/this-firefox`
2. Clique em "Carregar extensão temporária..."
3. Selecione o arquivo `manifest.json`

#### Chrome:
1. Abra `chrome://extensions/`
2. Ative o "Modo do desenvolvedor"
3. Clique em "Carregar sem compactação"
4. Selecione a pasta do projeto

### 4. Primeiro Acesso

1. Clique no ícone da extensão
2. Faça seu cadastro na aba "Cadastro"
3. Após o login, você será redirecionado para a sidebar
4. Comece a criar clientes e tarefas!

## 🔐 Autenticação

### Fluxo de Login
1. Usuário insere email e senha
2. Sistema valida credenciais no servidor
3. Servidor retorna token JWT
4. Token é salvo no `chrome.storage`
5. Token é enviado em todas as requisições

### Logout
- Clique no botão "🚪 Sair" no topo da sidebar
- Token e dados de autenticação serão removidos
- Você será redirecionado para a tela de login

## ☁️ Sincronização

### Sincronização Automática
- Tarefas são automaticamente sincronizadas 2 segundos após qualquer modificação
- Todas as ações (criar, editar, deletar) acionam o auto-sync

### Sincronização Manual
- Clique no botão "🔄 Sync" para forçar sincronização
- Útil após fazer login em um novo dispositivo

### Como Funciona
1. Tarefas são salvas localmente no `localStorage`
2. Auto-sync envia para o servidor após 2s de inatividade
3. Ao fazer login, tarefas do servidor são baixadas
4. Conflitos são resolvidos usando última modificação

## 🛠️ API Endpoints

### Autenticação

#### `POST /api/register`
Cadastrar novo usuário
```json
{
  "name": "João Silva",
  "email": "joao@email.com",
  "password": "senha123"
}
```

#### `POST /api/login`
Fazer login
```json
{
  "email": "joao@email.com",
  "password": "senha123"
}
```

### Tarefas (Requer Autenticação)

#### `GET /api/tasks`
Buscar todas as tarefas do usuário

Header: `Authorization: Bearer <token>`

#### `POST /api/tasks/sync`
Sincronizar tarefas
```json
{
  "tasks": [
    {
      "id": 123,
      "name": "Cliente ABC",
      "tasks": [...]
    }
  ]
}
```

Header: `Authorization: Bearer <token>`

## 🎨 Uso da Interface

### Clientes
1. Clique em "+ Adicionar Cliente"
2. Digite o nome do cliente
3. Clique em "Adicionar"

### Tarefas
1. Selecione um cliente
2. Clique no botão "+"
3. Preencha:
   - Nome da tarefa
   - Data/hora do prazo
   - Urgência (alta/média/baixa)
4. Clique em "Adicionar"

### Marcar Como Concluída
- Clique no checkbox da tarefa

### Arquivar Tarefa
- Marque a tarefa como concluída
- Clique no botão "📦 Arquivar"
- Tarefas arquivadas aparecem na aba "📦 Arquivadas"

### Ver Detalhes
- Clique no texto da tarefa para abrir modal com detalhes
- Adicione notas e informações extras

## 🔒 Segurança

- Senhas são criptografadas com bcrypt (10 rounds)
- Tokens JWT com expiração de 30 dias
- Comunicação via HTTPS em produção
- Validação de entrada em todos os endpoints

## ⚠️ Importante para Produção

**ANTES DE COLOCAR EM PRODUÇÃO:**

1. **Altere a chave secreta do JWT** em `server.js`:
```javascript
const JWT_SECRET = 'sua-chave-super-segura-aqui';
```

2. **Use um banco de dados real** (MongoDB, PostgreSQL, etc.) ao invés do array em memória

3. **Configure HTTPS** para o servidor

4. **Atualize a URL da API** em `auth.js`:
```javascript
const API_URL = 'https://seu-dominio.com/api';
```

5. **Atualize as permissões** em `manifest.json`:
```json
"host_permissions": [
  "https://seu-dominio.com/*"
]
```

## 🐛 Troubleshooting

### Erro "Token não fornecido"
- Faça logout e login novamente
- Verifique se o servidor está rodando

### Tarefas não sincronizam
- Verifique conexão com internet
- Verifique se o servidor está rodando
- Veja o console do navegador para erros

### Erro ao fazer login
- Verifique credenciais
- Verifique se o servidor está rodando em `http://localhost:3000`

## 📝 Licença

ISC

## 👨‍💻 Desenvolvimento

Para desenvolvimento com auto-reload do servidor:

```bash
npm run dev
```

Requer `nodemon` (já incluído nas devDependencies)

---

**Desenvolvido com ❤️ para Marketing Pro**
