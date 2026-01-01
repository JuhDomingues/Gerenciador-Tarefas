// =================== CONFIGURAÇÃO ===================
const API_URL = 'https://gerenciador-tarefas-one-puce.vercel.app/api'; // Servidor Vercel

// =================== ESTADO DE AUTENTICAÇÃO ===================
let authState = {
  user: null,
  token: null
};

// =================== HELPERS ===================
function showError(message) {
  const errorEl = document.getElementById('errorMessage');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.add('show');
    setTimeout(() => errorEl.classList.remove('show'), 5000);
  }
}

function showSuccess(message) {
  const successEl = document.getElementById('successMessage');
  if (successEl) {
    successEl.textContent = message;
    successEl.classList.add('show');
    setTimeout(() => successEl.classList.remove('show'), 3000);
  }
}

function showLoading(show = true) {
  const loadingEl = document.getElementById('loading');
  const forms = document.querySelectorAll('.form-content');

  if (loadingEl) {
    if (show) {
      loadingEl.classList.add('show');
      forms.forEach(f => f.style.display = 'none');
    } else {
      loadingEl.classList.remove('show');
      forms.forEach(f => {
        if (f.classList.contains('active')) {
          f.style.display = 'block';
        }
      });
    }
  }
}

// =================== STORAGE ===================
function saveAuthData(user, token) {
  authState.user = user;
  authState.token = token;

  // Salvar no chrome.storage para persistir entre sessões
  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.set({ authUser: user, authToken: token });
  } else {
    // Fallback para localStorage (para teste fora da extensão)
    localStorage.setItem('authUser', JSON.stringify(user));
    localStorage.setItem('authToken', token);
  }
}

function loadAuthData() {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['authUser', 'authToken'], (result) => {
        if (result.authUser && result.authToken) {
          authState.user = result.authUser;
          authState.token = result.authToken;
          resolve(true);
        } else {
          resolve(false);
        }
      });
    } else {
      // Fallback para localStorage
      const user = localStorage.getItem('authUser');
      const token = localStorage.getItem('authToken');

      if (user && token) {
        authState.user = JSON.parse(user);
        authState.token = token;
        resolve(true);
      } else {
        resolve(false);
      }
    }
  });
}

function clearAuthData() {
  authState.user = null;
  authState.token = null;

  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.local.remove(['authUser', 'authToken']);
  } else {
    localStorage.removeItem('authUser');
    localStorage.removeItem('authToken');
  }
}

// =================== API CALLS ===================
async function registerUser(name, email, password) {
  try {
    const response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Erro ao cadastrar');
    }

    return data;
  } catch (error) {
    console.error('Erro no registro:', error);
    throw error;
  }
}

async function loginUser(email, password) {
  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Erro ao fazer login');
    }

    return data;
  } catch (error) {
    console.error('Erro no login:', error);
    throw error;
  }
}

async function syncTasks(tasks) {
  try {
    const response = await fetch(`${API_URL}/tasks/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authState.token}`
      },
      body: JSON.stringify({ tasks })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Erro ao sincronizar tarefas');
    }

    return data.tasks;
  } catch (error) {
    console.error('Erro ao sincronizar:', error);
    throw error;
  }
}

async function fetchTasks() {
  try {
    const response = await fetch(`${API_URL}/tasks`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authState.token}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Erro ao buscar tarefas');
    }

    return data.tasks;
  } catch (error) {
    console.error('Erro ao buscar tarefas:', error);
    throw error;
  }
}

// =================== FORM HANDLERS ===================
async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    showError('Por favor, preencha todos os campos');
    return;
  }

  showLoading(true);

  try {
    const data = await loginUser(email, password);
    saveAuthData(data.user, data.token);
    showSuccess('Login realizado com sucesso!');

    // Redirecionar para a página principal após 1 segundo
    setTimeout(() => {
      window.location.href = 'sidebar.html';
    }, 1000);
  } catch (error) {
    showError(error.message || 'Erro ao fazer login');
  } finally {
    showLoading(false);
  }
}

async function handleRegister(e) {
  e.preventDefault();

  const name = document.getElementById('registerName').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

  if (!name || !email || !password || !passwordConfirm) {
    showError('Por favor, preencha todos os campos');
    return;
  }

  if (password.length < 6) {
    showError('A senha deve ter pelo menos 6 caracteres');
    return;
  }

  if (password !== passwordConfirm) {
    showError('As senhas não coincidem');
    return;
  }

  showLoading(true);

  try {
    const data = await registerUser(name, email, password);
    saveAuthData(data.user, data.token);
    showSuccess('Cadastro realizado com sucesso!');

    // Redirecionar para a página principal após 1 segundo
    setTimeout(() => {
      window.location.href = 'sidebar.html';
    }, 1000);
  } catch (error) {
    showError(error.message || 'Erro ao cadastrar');
  } finally {
    showLoading(false);
  }
}

// =================== TAB SWITCHING ===================
function switchTab(tabName) {
  // Atualizar botões
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.dataset.tab === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Atualizar conteúdo
  document.querySelectorAll('.form-content').forEach(content => {
    if (content.id === `${tabName}-form`) {
      content.classList.add('active');
      content.style.display = 'block';
    } else {
      content.classList.remove('active');
      content.style.display = 'none';
    }
  });

  // Limpar mensagens
  document.getElementById('errorMessage').classList.remove('show');
  document.getElementById('successMessage').classList.remove('show');
}

// =================== VERIFICAR AUTENTICAÇÃO ===================
async function checkAuth() {
  const isAuthenticated = await loadAuthData();

  // Se já está autenticado e está na página de login, redirecionar
  if (isAuthenticated && window.location.pathname.includes('login.html')) {
    window.location.href = 'sidebar.html';
    return true;
  }

  // Se não está autenticado e não está na página de login, redirecionar
  if (!isAuthenticated && !window.location.pathname.includes('login.html')) {
    window.location.href = 'login.html';
    return false;
  }

  return isAuthenticated;
}

// =================== LOGOUT ===================
function logout() {
  clearAuthData();
  window.location.href = 'login.html';
}

// =================== EXPORTAR PARA USO GLOBAL ===================
window.auth = {
  checkAuth,
  logout,
  syncTasks,
  fetchTasks,
  getUser: () => authState.user,
  getToken: () => authState.token,
  isAuthenticated: () => authState.token !== null
};

// =================== INICIALIZAÇÃO ===================
document.addEventListener('DOMContentLoaded', () => {
  // Se estamos na página de login
  if (window.location.pathname.includes('login.html')) {
    // Verificar se já está autenticado
    checkAuth();

    // Event listeners para tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        switchTab(btn.dataset.tab);
      });
    });

    // Event listeners para forms
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', handleLogin);
    }

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
      registerForm.addEventListener('submit', handleRegister);
    }
  }
});
