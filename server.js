// =================== SERVIDOR BACKEND PARA AUTENTICAÇÃO E SINCRONIZAÇÃO ===================
// Para executar: npm install
// Depois: Configure o arquivo .env (veja SETUP_SUPABASE.md)
// Depois: npm start

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const {
  initializeDatabase,
  createUser,
  getUserByEmail,
  getUserById,
  createProfile,
  getProfile,
  updateProfile,
  getUserTasks,
  saveTasks
} = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'sua-chave-secreta-super-segura-aqui';

// Inicializar banco de dados
initializeDatabase();

// =================== MIDDLEWARE ===================
app.use(cors());
app.use(bodyParser.json());

// =================== MIDDLEWARE DE AUTENTICAÇÃO ===================
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Token não fornecido' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token inválido' });
    }

    req.user = user;
    next();
  });
}

// =================== ROTAS DE AUTENTICAÇÃO ===================

// Registro
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validação
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'A senha deve ter pelo menos 6 caracteres' });
    }

    // Verificar se o usuário já existe
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'E-mail já cadastrado' });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar usuário
    const userId = await createUser(name, email, hashedPassword);

    // Criar perfil inicial
    await createProfile(userId);

    // Gerar token
    const token = jwt.sign(
      { id: userId, email: email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Retornar dados do usuário (sem a senha)
    res.status(201).json({
      message: 'Usuário cadastrado com sucesso',
      user: {
        id: userId,
        name: name,
        email: email
      },
      token
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validação
    if (!email || !password) {
      return res.status(400).json({ message: 'E-mail e senha são obrigatórios' });
    }

    // Buscar usuário
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'E-mail ou senha incorretos' });
    }

    // Verificar senha
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'E-mail ou senha incorretos' });
    }

    // Gerar token
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Retornar dados do usuário (sem a senha)
    res.json({
      message: 'Login realizado com sucesso',
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      token
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// =================== ROTAS DE TAREFAS ===================

// Buscar tarefas do usuário
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userTasks = await getUserTasks(userId);

    res.json({
      tasks: userTasks
    });
  } catch (error) {
    console.error('Erro ao buscar tarefas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Sincronizar tarefas
app.post('/api/tasks/sync', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { tasks: clientTasks } = req.body;

    if (!Array.isArray(clientTasks)) {
      return res.status(400).json({ message: 'Formato de tarefas inválido' });
    }

    // Salvar tarefas do usuário
    await saveTasks(userId, clientTasks);

    res.json({
      message: 'Tarefas sincronizadas com sucesso',
      tasks: clientTasks
    });
  } catch (error) {
    console.error('Erro ao sincronizar tarefas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Atualizar tarefas
app.put('/api/tasks', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { tasks: clientTasks } = req.body;

    if (!Array.isArray(clientTasks)) {
      return res.status(400).json({ message: 'Formato de tarefas inválido' });
    }

    // Atualizar tarefas do usuário
    await saveTasks(userId, clientTasks);

    res.json({
      message: 'Tarefas atualizadas com sucesso',
      tasks: clientTasks
    });
  } catch (error) {
    console.error('Erro ao atualizar tarefas:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// =================== ROTAS DE PERFIL ===================

// Buscar perfil do usuário
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await getUserById(userId);
    const profile = await getProfile(userId);

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at
      },
      profile: profile || {
        bio: '',
        company: '',
        position: '',
        phone: '',
        avatar_url: ''
      }
    });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Atualizar perfil do usuário
app.put('/api/profile', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { bio, company, position, phone, avatar_url } = req.body;

    // Atualizar perfil
    await updateProfile(userId, { bio, company, position, phone, avatar_url });

    // Buscar perfil atualizado
    const updatedProfile = await getProfile(userId);

    res.json({
      message: 'Perfil atualizado com sucesso',
      profile: updatedProfile
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// =================== ROTA DE VERIFICAÇÃO ===================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Servidor rodando',
    timestamp: new Date().toISOString()
  });
});

// =================== INICIAR SERVIDOR (apenas em desenvolvimento) ===================
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log('==========================================');
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📋 API disponível em http://localhost:${PORT}/api`);
    console.log('==========================================');
    console.log('\nEndpoints disponíveis:');
    console.log('  POST /api/register - Cadastrar usuário');
    console.log('  POST /api/login - Fazer login');
    console.log('  GET /api/tasks - Buscar tarefas (requer autenticação)');
    console.log('  POST /api/tasks/sync - Sincronizar tarefas (requer autenticação)');
    console.log('  PUT /api/tasks - Atualizar tarefas (requer autenticação)');
    console.log('  GET /api/health - Verificar status do servidor');
    console.log('==========================================\n');
  });
}

// Exportar o app para Vercel
module.exports = app;

// =================== TRATAMENTO DE ERROS ===================
process.on('uncaughtException', (error) => {
  console.error('Erro não capturado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promise rejeitada não tratada:', reason);
});
