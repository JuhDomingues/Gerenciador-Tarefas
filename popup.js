// Estado da aplicação
let state = {
  clients: [],
  selectedClientId: null,
  activeTab: 'clientes'
};

// Carregar dados ao iniciar
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  initializeEventListeners();
  render();
});

// Carregar dados do localStorage
function loadData() {
  const saved = localStorage.getItem('clientTodos');
  if (saved) {
    state.clients = JSON.parse(saved);
  }
}

// Salvar dados no localStorage
function saveData() {
  localStorage.setItem('clientTodos', JSON.stringify(state.clients));
}

// Inicializar event listeners
function initializeEventListeners() {
  // Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
    });
  });

  // Adicionar cliente
  document.getElementById('btnAddClient').addEventListener('click', showAddClientForm);
  document.getElementById('btnSaveClient').addEventListener('click', saveNewClient);
  document.getElementById('btnCancelClient').addEventListener('click', hideAddClientForm);
  document.getElementById('newClientName').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveNewClient();
  });

  // Adicionar tarefa
  document.getElementById('btnAddTask').addEventListener('click', saveNewTask);
  document.getElementById('newTaskText').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveNewTask();
  });
}

// Trocar tab
function switchTab(tab) {
  console.log('Trocando para tab:', tab);
  state.activeTab = tab;
  
  // Atualizar botões
  document.querySelectorAll('.tab-btn').forEach(btn => {
    const btnTab = btn.getAttribute('data-tab');
    console.log('Verificando botão:', btnTab, 'ativo:', tab);
    if (btnTab === tab) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Atualizar conteúdo
  document.querySelectorAll('.tab-content').forEach(content => {
    const contentId = content.id;
    console.log('Verificando conteúdo:', contentId);
    if (contentId === `tab-${tab}`) {
      content.classList.add('active');
      content.style.display = 'block';
    } else {
      content.classList.remove('active');
      content.style.display = 'none';
    }
  });
  
  render();
}

// Mostrar formulário de adicionar cliente
function showAddClientForm() {
  document.getElementById('addClientForm').classList.remove('hidden');
  document.getElementById('newClientName').focus();
}

// Esconder formulário de adicionar cliente
function hideAddClientForm() {
  document.getElementById('addClientForm').classList.add('hidden');
  document.getElementById('newClientName').value = '';
}

// Salvar novo cliente
function saveNewClient() {
  const name = document.getElementById('newClientName').value.trim();
  if (!name) return;
  
  const newClient = {
    id: Date.now(),
    name: name,
    tasks: []
  };
  
  state.clients.push(newClient);
  saveData();
  hideAddClientForm();
  render();
}

// Selecionar cliente
function selectClient(clientId) {
  state.selectedClientId = clientId;
  render();
}

// Deletar cliente
function deleteClient(clientId) {
  console.log('Deletando cliente:', clientId);
  if (!confirm('Tem certeza que deseja excluir este cliente e todas suas tarefas?')) return;
  
  state.clients = state.clients.filter(c => c.id !== clientId);
  if (state.selectedClientId === clientId) {
    state.selectedClientId = null;
  }
  saveData();
  render();
}

// Editar cliente
function editClient(clientId) {
  console.log('Editando cliente:', clientId);
  const client = state.clients.find(c => c.id === clientId);
  if (!client) {
    console.error('Cliente não encontrado:', clientId);
    return;
  }
  
  const newName = prompt('Novo nome do cliente:', client.name);
  if (newName && newName.trim()) {
    client.name = newName.trim();
    saveData();
    render();
    console.log('Cliente renomeado para:', newName);
  }
}

// Tornar funções globais para onclick funcionar
window.selectClient = selectClient;
window.deleteClient = deleteClient;
window.editClient = editClient;
window.toggleTask = toggleTask;
window.deleteTask = deleteTask;
window.switchTab = switchTab;  // ← ADICIONADO!

// Salvar nova tarefa
function saveNewTask() {
  if (!state.selectedClientId) return;
  
  const text = document.getElementById('newTaskText').value.trim();
  if (!text) return;
  
  const deadline = document.getElementById('newTaskDeadline').value;
  const urgency = document.getElementById('newTaskUrgency').value;
  
  const client = state.clients.find(c => c.id === state.selectedClientId);
  if (!client) return;
  
  const newTask = {
    id: Date.now(),
    text: text,
    completed: false,
    urgency: urgency,
    deadline: deadline || null,
    createdAt: new Date().toISOString()
  };
  
  client.tasks.push(newTask);
  saveData();
  
  // Limpar formulário
  document.getElementById('newTaskText').value = '';
  document.getElementById('newTaskDeadline').value = '';
  document.getElementById('newTaskUrgency').value = 'media';
  
  render();
}

// Toggle tarefa
function toggleTask(taskId) {
  const client = state.clients.find(c => c.id === state.selectedClientId);
  if (!client) return;
  
  const task = client.tasks.find(t => t.id === taskId);
  if (task) {
    task.completed = !task.completed;
    saveData();
    render();
  }
}

// Deletar tarefa
function deleteTask(taskId) {
  const client = state.clients.find(c => c.id === state.selectedClientId);
  if (!client) return;
  
  client.tasks = client.tasks.filter(t => t.id !== taskId);
  saveData();
  render();
}

// Calcular progresso do cliente
function getClientProgress(client) {
  if (client.tasks.length === 0) return 0;
  const completed = client.tasks.filter(t => t.completed).length;
  return Math.round((completed / client.tasks.length) * 100);
}

// Calcular progresso geral
function getOverallProgress() {
  const allTasks = state.clients.flatMap(c => c.tasks);
  if (allTasks.length === 0) return 0;
  const completed = allTasks.filter(t => t.completed).length;
  return Math.round((completed / allTasks.length) * 100);
}

// Obter estatísticas
function getTotalStats() {
  const allTasks = state.clients.flatMap(c => c.tasks);
  return {
    total: allTasks.length,
    completed: allTasks.filter(t => t.completed).length,
    pending: allTasks.filter(t => !t.completed).length
  };
}

// Verificar se está atrasado
function isOverdue(deadline) {
  if (!deadline) return false;
  return new Date(deadline) < new Date();
}

// Formatar deadline
function formatDeadline(deadline) {
  if (!deadline) return 'Sem prazo';
  
  const date = new Date(deadline);
  const now = new Date();
  const diff = date - now;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  
  const formatted = date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  if (diff < 0) {
    return `${formatted} (ATRASADO)`;
  } else if (hours < 24) {
    return `${formatted} (${hours}h restantes)`;
  }
  return formatted;
}

// Obter urgência com texto
function getUrgencyText(urgency) {
  const map = {
    'alta': '🔴 Alta',
    'media': '🟡 Média',
    'baixa': '🟢 Baixa'
  };
  return map[urgency] || urgency;
}

// Obter todas as tarefas com cliente
function getAllTasksWithClient() {
  const tasksWithClient = [];
  state.clients.forEach(client => {
    client.tasks.forEach(task => {
      tasksWithClient.push({
        ...task,
        clientName: client.name,
        clientId: client.id
      });
    });
  });
  return tasksWithClient;
}

// Ordenar tarefas por urgência
function sortTasksByUrgency() {
  const allTasks = getAllTasksWithClient();
  const pendingTasks = allTasks.filter(t => !t.completed);
  const urgencyOrder = { alta: 0, media: 1, baixa: 2 };
  
  return pendingTasks.sort((a, b) => {
    if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    }
    if (a.deadline && b.deadline) {
      return new Date(a.deadline) - new Date(b.deadline);
    }
    if (a.deadline) return -1;
    if (b.deadline) return 1;
    return 0;
  });
}

// Renderizar aplicação
function render() {
  renderStats();
  renderClientsList();
  renderClientTasks();
  renderUrgencyList();
}

// Renderizar estatísticas
function renderStats() {
  const stats = getTotalStats();
  const progress = getOverallProgress();
  
  document.getElementById('totalTasks').textContent = stats.total;
  document.getElementById('completedTasks').textContent = stats.completed;
  document.getElementById('pendingTasks').textContent = stats.pending;
  document.getElementById('overallProgress').textContent = `${progress}%`;
  document.getElementById('progressFill').style.width = `${progress}%`;
}

// Renderizar lista de clientes
function renderClientsList() {
  const container = document.getElementById('clientsList');
  
  if (state.clients.length === 0) {
    container.innerHTML = '<p class="empty-message">Nenhum cliente cadastrado</p>';
    return;
  }
  
  container.innerHTML = state.clients.map(client => {
    const progress = getClientProgress(client);
    const completedCount = client.tasks.filter(t => t.completed).length;
    const isActive = state.selectedClientId === client.id;
    
    return `
      <div class="client-item ${isActive ? 'active' : ''}" onclick="selectClient(${client.id})">
        <div class="client-name-row">
          <span class="client-name">${escapeHtml(client.name)}</span>
          <span class="client-percentage">${progress}%</span>
        </div>
        <div class="client-progress-bar">
          <div class="client-progress-fill" style="width: ${progress}%"></div>
        </div>
        <div class="client-tasks-info">
          ${completedCount} de ${client.tasks.length} tarefas
        </div>
        <div class="client-actions">
          <button class="btn-icon btn-edit" onclick="event.stopPropagation(); editClient(${client.id})" title="Editar">✏️</button>
          <button class="btn-icon btn-delete" onclick="event.stopPropagation(); deleteClient(${client.id})" title="Excluir">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
}

// Renderizar tarefas do cliente
function renderClientTasks() {
  const noClientView = document.getElementById('noClientSelected');
  const clientTasksView = document.getElementById('clientTasksView');
  
  if (!state.selectedClientId) {
    noClientView.classList.remove('hidden');
    clientTasksView.classList.add('hidden');
    return;
  }
  
  const client = state.clients.find(c => c.id === state.selectedClientId);
  if (!client) {
    noClientView.classList.remove('hidden');
    clientTasksView.classList.add('hidden');
    return;
  }
  
  noClientView.classList.add('hidden');
  clientTasksView.classList.remove('hidden');
  
  const progress = getClientProgress(client);
  const completedCount = client.tasks.filter(t => t.completed).length;
  
  document.getElementById('selectedClientName').textContent = client.name;
  document.getElementById('clientStats').textContent = `${completedCount} de ${client.tasks.length} concluídas`;
  document.getElementById('clientProgress').textContent = `${progress}%`;
  
  const tasksList = document.getElementById('tasksList');
  
  if (client.tasks.length === 0) {
    tasksList.innerHTML = '<p class="empty-message">Nenhuma tarefa cadastrada</p>';
    return;
  }
  
  tasksList.innerHTML = client.tasks.map(task => {
    const overdueClass = isOverdue(task.deadline) && !task.completed ? 'overdue' : '';
    const completedClass = task.completed ? 'completed' : '';
    
    return `
      <div class="task-item ${completedClass} ${overdueClass}">
        <div class="task-row">
          <input 
            type="checkbox" 
            class="task-checkbox" 
            ${task.completed ? 'checked' : ''}
            data-task-id="${task.id}"
          />
          <div class="task-content">
            <div class="task-text">${escapeHtml(task.text)}</div>
            <div class="task-tags">
              <span class="task-tag tag-${task.urgency}">${getUrgencyText(task.urgency)}</span>
              ${task.deadline ? `
                <span class="task-tag tag-deadline ${isOverdue(task.deadline) && !task.completed ? 'overdue' : ''}">
                  🕐 ${formatDeadline(task.deadline)}
                </span>
              ` : ''}
            </div>
          </div>
          <button class="btn-delete-task" data-task-id="${task.id}">🗑️</button>
        </div>
      </div>
    `;
  }).join('');
  
  // Adicionar event listeners aos checkboxes
  tasksList.querySelectorAll('.task-checkbox').forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      const taskId = parseInt(checkbox.getAttribute('data-task-id'));
      console.log('Toggle task:', taskId);
      toggleTask(taskId);
    });
  });
  
  // Event listeners para botões de deletar tarefa
  tasksList.querySelectorAll('.btn-delete-task').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const taskId = parseInt(btn.getAttribute('data-task-id'));
      console.log('Deletar task:', taskId);
      deleteTask(taskId);
    });
  });
}

// Renderizar lista de urgências
function renderUrgencyList() {
  const container = document.getElementById('urgencyList');
  const urgentTasks = sortTasksByUrgency();
  
  if (urgentTasks.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📅</div>
        <p>Nenhuma tarefa pendente</p>
        <small>Parabéns! Você está em dia.</small>
      </div>
    `;
    return;
  }
  
  const tasksHtml = urgentTasks.map(task => {
    const overdueClass = isOverdue(task.deadline) ? 'overdue' : '';
    
    return `
      <div class="urgency-item urgency-${task.urgency} ${overdueClass}">
        <div class="urgency-header">
          <span class="urgency-dot dot-${task.urgency}"></span>
          <span class="urgency-task-name">${escapeHtml(task.text)}</span>
        </div>
        <div class="urgency-meta">
          <span>👤 ${escapeHtml(task.clientName)}</span>
          ${task.deadline ? `
            <span class="${isOverdue(task.deadline) ? 'text-red' : ''}">
              🕐 ${formatDeadline(task.deadline)}
            </span>
          ` : ''}
        </div>
        <div class="task-tags">
          <span class="task-tag tag-${task.urgency}">${getUrgencyText(task.urgency)}</span>
          ${isOverdue(task.deadline) ? '<span class="task-tag tag-deadline overdue">⚠️ ATRASADO</span>' : ''}
        </div>
      </div>
    `;
  }).join('');
  
  const altaCount = urgentTasks.filter(t => t.urgency === 'alta').length;
  const tipHtml = altaCount > 0 ? `
    <div class="urgency-tip">
      <strong>💡 Dica:</strong> Você tem ${altaCount} tarefa(s) de urgência alta. 
      Foque nelas primeiro para manter sua produtividade em dia!
    </div>
  ` : '';
  
  container.innerHTML = tasksHtml + tipHtml;
}

// Escapar HTML para prevenir XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}