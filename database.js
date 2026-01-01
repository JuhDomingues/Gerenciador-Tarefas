// =================== CONFIGURAÇÃO DO BANCO DE DADOS (SUPABASE/POSTGRESQL) ===================
require('dotenv').config();
const { Pool } = require('pg');

// Criar pool de conexões com o PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// =================== CRIAR TABELAS ===================
async function initializeDatabase() {
  const client = await pool.connect();

  try {
    // Tabela de usuários
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabela de perfis (informações adicionais do usuário)
    await client.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL,
        bio TEXT,
        company TEXT,
        position TEXT,
        phone TEXT,
        avatar_url TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Tabela de tarefas
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        client_data JSONB NOT NULL,
        last_sync TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('✅ Banco de dados Supabase inicializado com sucesso');
  } catch (error) {
    console.error('❌ Erro ao inicializar banco de dados:', error);
    throw error;
  } finally {
    client.release();
  }
}

// =================== OPERAÇÕES DE USUÁRIO ===================

// Criar usuário
async function createUser(name, email, hashedPassword) {
  const client = await pool.connect();

  try {
    const result = await client.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id',
      [name, email, hashedPassword]
    );

    return result.rows[0].id;
  } finally {
    client.release();
  }
}

// Buscar usuário por email
async function getUserByEmail(email) {
  const client = await pool.connect();

  try {
    const result = await client.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    return result.rows[0];
  } finally {
    client.release();
  }
}

// Buscar usuário por ID
async function getUserById(id) {
  const client = await pool.connect();

  try {
    const result = await client.query(
      'SELECT id, name, email, created_at FROM users WHERE id = $1',
      [id]
    );

    return result.rows[0];
  } finally {
    client.release();
  }
}

// =================== OPERAÇÕES DE PERFIL ===================

// Criar perfil inicial para usuário
async function createProfile(userId) {
  const client = await pool.connect();

  try {
    await client.query(
      `INSERT INTO profiles (user_id, bio, company, position, phone, avatar_url)
       VALUES ($1, '', '', '', '', '')`,
      [userId]
    );
  } finally {
    client.release();
  }
}

// Buscar perfil do usuário
async function getProfile(userId) {
  const client = await pool.connect();

  try {
    const result = await client.query(
      'SELECT * FROM profiles WHERE user_id = $1',
      [userId]
    );

    return result.rows[0];
  } finally {
    client.release();
  }
}

// Atualizar perfil
async function updateProfile(userId, profileData) {
  const { bio, company, position, phone, avatar_url } = profileData;
  const client = await pool.connect();

  try {
    await client.query(
      `UPDATE profiles
       SET bio = $1, company = $2, position = $3, phone = $4, avatar_url = $5, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $6`,
      [bio || '', company || '', position || '', phone || '', avatar_url || '', userId]
    );
  } finally {
    client.release();
  }
}

// =================== OPERAÇÕES DE TAREFAS ===================

// Buscar tarefas do usuário
async function getUserTasks(userId) {
  const client = await pool.connect();

  try {
    const result = await client.query(
      'SELECT client_data FROM tasks WHERE user_id = $1 ORDER BY id DESC LIMIT 1',
      [userId]
    );

    if (result.rows.length > 0 && result.rows[0].client_data) {
      return result.rows[0].client_data;
    }

    return [];
  } finally {
    client.release();
  }
}

// Salvar/atualizar tarefas do usuário
async function saveTasks(userId, clientsData) {
  const client = await pool.connect();

  try {
    // Verificar se já existe registro de tarefas
    const existing = await client.query(
      'SELECT id FROM tasks WHERE user_id = $1',
      [userId]
    );

    if (existing.rows.length > 0) {
      // Atualizar
      await client.query(
        'UPDATE tasks SET client_data = $1, last_sync = CURRENT_TIMESTAMP WHERE user_id = $2',
        [JSON.stringify(clientsData), userId]
      );
    } else {
      // Inserir novo
      await client.query(
        'INSERT INTO tasks (user_id, client_data) VALUES ($1, $2)',
        [userId, JSON.stringify(clientsData)]
      );
    }
  } finally {
    client.release();
  }
}

// =================== EXPORTAR FUNÇÕES ===================
module.exports = {
  pool,
  initializeDatabase,
  createUser,
  getUserByEmail,
  getUserById,
  createProfile,
  getProfile,
  updateProfile,
  getUserTasks,
  saveTasks
};
