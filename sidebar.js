// =================== STATE ===================
let clients = [];
let selectedClientId = null;
let activeTab = 'clientes';
let syncInProgress = false;

// =================== STORAGE ===================
function saveClients() {
  localStorage.setItem("clients", JSON.stringify(clients));

  // Auto-sync se estiver autenticado
  if (window.auth && window.auth.isAuthenticated()) {
    debouncedSync();
  }
}

function loadClients() {
  const saved = localStorage.getItem("clients");
  if (saved) {
    clients = JSON.parse(saved);
  }
}

// Debounce para evitar múltiplas sincronizações
let syncTimeout;
function debouncedSync() {
  clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    syncWithServer();
  }, 2000); // Sincroniza após 2 segundos de inatividade
}

// =================== TAB SWITCHING ===================
function switchTab(tabName) {
  console.log('Trocando para tab:', tabName);
  activeTab = tabName;
  
  // Atualizar botões
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.getAttribute('data-tab') === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  
  // Atualizar conteúdo
  document.querySelectorAll('.tab-content').forEach(content => {
    if (content.id === `tab-${tabName}`) {
      content.classList.add('active');
      content.style.display = 'block';
    } else {
      content.classList.remove('active');
      content.style.display = 'none';
    }
  });
  
  // Renderizar conteúdo da tab
  if (tabName === 'urgencias') {
    renderUrgencyList();
  } else if (tabName === 'arquivadas') {
    renderArchivedList();
  }
}

// =================== CUSTOM DIALOGS ===================
function showPrompt(message, defaultValue = '') {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 8px;
      min-width: 300px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
    
    dialog.innerHTML = `
      <div style="margin-bottom: 15px; font-weight: 500; color: #333;">${message}</div>
      <input type="text" id="promptInput" value="${defaultValue}" 
             style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; margin-bottom: 15px; font-size: 14px;">
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button id="promptCancel" style="padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">
          Cancelar
        </button>
        <button id="promptOk" style="padding: 8px 16px; border: none; background: #4CAF50; color: white; border-radius: 4px; cursor: pointer;">
          OK
        </button>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    const input = dialog.querySelector('#promptInput');
    input.focus();
    input.select();
    
    const cleanup = () => {
      document.body.removeChild(overlay);
    };
    
    dialog.querySelector('#promptOk').onclick = () => {
      const value = input.value.trim();
      cleanup();
      resolve(value || null);
    };
    
    dialog.querySelector('#promptCancel').onclick = () => {
      cleanup();
      resolve(null);
    };
    
    input.onkeydown = (e) => {
      if (e.key === 'Enter') {
        const value = input.value.trim();
        cleanup();
        resolve(value || null);
      } else if (e.key === 'Escape') {
        cleanup();
        resolve(null);
      }
    };
  });
}

function showConfirm(message) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      background: white;
      padding: 20px;
      border-radius: 8px;
      min-width: 300px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    `;
    
    dialog.innerHTML = `
      <div style="margin-bottom: 20px; color: #333; line-height: 1.5;">${message}</div>
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button id="confirmCancel" style="padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">
          Cancelar
        </button>
        <button id="confirmOk" style="padding: 8px 16px; border: none; background: #f44336; color: white; border-radius: 4px; cursor: pointer;">
          Confirmar
        </button>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    const cleanup = () => {
      document.body.removeChild(overlay);
    };
    
    dialog.querySelector('#confirmOk').onclick = () => {
      cleanup();
      resolve(true);
    };
    
    dialog.querySelector('#confirmCancel').onclick = () => {
      cleanup();
      resolve(false);
    };
    
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        cleanup();
        resolve(false);
      }
    };
  });
}

// =================== TASK MODAL ===================
function openTaskModal(taskId) {
  // Encontrar a tarefa
  let task = null;
  let clientName = '';
  let clientId = null;

  for (let client of clients) {
    const foundTask = client.tasks.find(t => t.id === taskId);
    if (foundTask) {
      task = foundTask;
      clientName = client.name;
      clientId = client.id;
      break;
    }
  }

  if (!task) return;

  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && !task.completed;

  // Converter deadline para formato datetime-local
  let deadlineValue = '';
  if (task.deadline) {
    const date = new Date(task.deadline);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    deadlineValue = `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  const overlay = document.createElement('div');
  overlay.className = 'task-modal-overlay';
  overlay.id = 'taskModalOverlay';

  overlay.innerHTML = `
    <div class="task-modal">
      <div class="task-modal-header">
        <h3>Detalhes da Tarefa</h3>
        <button class="task-modal-close" id="closeTaskModal">✕</button>
      </div>

      <div class="task-modal-body">
        <div class="task-modal-field">
          <label>Cliente</label>
          <div class="task-modal-value">${escapeHtml(clientName)}</div>
        </div>

        <div class="task-modal-field">
          <label>Tarefa</label>
          <input
            type="text"
            class="task-modal-input"
            id="taskModalText"
            value="${escapeHtml(task.text)}"
            style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;"
          />
        </div>

        <div class="task-modal-field">
          <label>Urgência</label>
          <select
            id="taskModalUrgency"
            style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;"
          >
            <option value="baixa" ${task.urgency === 'baixa' ? 'selected' : ''}>🟢 Baixa</option>
            <option value="media" ${task.urgency === 'media' ? 'selected' : ''}>🟡 Média</option>
            <option value="alta" ${task.urgency === 'alta' ? 'selected' : ''}>🔴 Alta</option>
          </select>
        </div>

        <div class="task-modal-field">
          <label>Prazo</label>
          <input
            type="datetime-local"
            id="taskModalDeadline"
            value="${deadlineValue}"
            style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px;"
          />
        </div>

        <div class="task-modal-field">
          <label>Status</label>
          <div class="task-modal-value">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="checkbox" id="taskModalCompleted" ${task.completed ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;">
              <span>${task.completed ? '✅ Concluída' : '⏳ Pendente'}</span>
            </label>
          </div>
        </div>

        <div class="task-modal-field">
          <label>Notas e Informações</label>
          <textarea
            class="task-modal-notes"
            id="taskModalNotes"
            placeholder="Adicione links, observações, informações importantes..."
            style="width: 100%; min-height: 100px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; resize: vertical;"
          >${escapeHtml(task.notes || '')}</textarea>
        </div>
      </div>

      <div class="task-modal-footer">
        <button class="btn-modal-save" id="saveTaskModal">💾 Salvar Alterações</button>
        <button class="btn-modal-cancel" id="cancelTaskModal">Cancelar</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Event listeners
  document.getElementById('closeTaskModal').onclick = () => closeTaskModal();
  document.getElementById('cancelTaskModal').onclick = () => closeTaskModal();

  document.getElementById('saveTaskModal').onclick = () => {
    const text = document.getElementById('taskModalText').value.trim();
    const urgency = document.getElementById('taskModalUrgency').value;
    const deadline = document.getElementById('taskModalDeadline').value;
    const completed = document.getElementById('taskModalCompleted').checked;
    const notes = document.getElementById('taskModalNotes').value;

    if (!text) {
      alert('O nome da tarefa não pode estar vazio!');
      return;
    }

    updateTask(taskId, {
      text,
      urgency,
      deadline,
      completed,
      notes
    });

    closeTaskModal();
    if (selectedClientId) renderClientTasks(selectedClientId);
    renderClientsList();
    renderUrgencyList();
    updateGlobalStats();
  };

  overlay.onclick = (e) => {
    if (e.target === overlay) closeTaskModal();
  };

  // Focar no input de texto
  setTimeout(() => {
    document.getElementById('taskModalText').focus();
  }, 100);
}

function closeTaskModal() {
  const overlay = document.getElementById('taskModalOverlay');
  if (overlay) {
    overlay.classList.add('closing');
    setTimeout(() => {
      document.body.removeChild(overlay);
    }, 300);
  }
}

// =================== ESCAPE HTML ===================
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// =================== RENDER CLIENTS ===================
function renderClientsList() {
  const clientsList = document.getElementById("clientsList");
  if (!clientsList) return;

  clientsList.innerHTML = "";

  if (clients.length === 0) {
    clientsList.innerHTML = `<p class="empty-message">Nenhum cliente</p>`;
    return;
  }

  clients.forEach((client, index) => {
    const total = client.tasks.length;
    const completed = client.tasks.filter(t => t.completed).length;
    const progress = total ? Math.round((completed / total) * 100) : 0;
    const isActive = selectedClientId === client.id;

    const div = document.createElement("div");
    div.className = `client-item ${isActive ? 'active' : ''}`;
    div.draggable = true;
    div.dataset.clientId = client.id;
    div.dataset.index = index;

    div.innerHTML = `
      <div class="drag-handle" style="cursor: move; padding: 5px; color: #999; display: flex; align-items: center;">
        <span style="font-size: 18px;">⋮⋮</span>
      </div>
      <div class="client-content" style="flex: 1;">
        <div class="client-name-row">
          <span class="client-name">${escapeHtml(client.name)}</span>
          <span class="client-percentage">${progress}%</span>
        </div>
        <div class="client-progress-bar">
          <div class="client-progress-fill" style="width: ${progress}%"></div>
        </div>
        <div class="client-tasks-info">
          ${completed} de ${total} tarefas
        </div>
      </div>
      <div class="client-actions" style="position: relative; z-index: 10; pointer-events: auto;">
        <button class="btn-icon btn-edit" title="Editar" style="pointer-events: auto; cursor: pointer; position: relative; z-index: 11;">✏️</button>
        <button class="btn-icon btn-delete" title="Excluir" style="pointer-events: auto; cursor: pointer; position: relative; z-index: 11;">🗑️</button>
      </div>
    `;

    // Event listeners para os botões PRIMEIRO (antes do div)
    const btnEdit = div.querySelector('.btn-edit');
    const btnDelete = div.querySelector('.btn-delete');

    if (btnEdit) {
      btnEdit.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.log('🟢 Botão EDITAR clicado! Cliente ID:', client.id);
        editClient(client.id);
      }, true); // Capture phase
    }

    if (btnDelete) {
      btnDelete.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.log('🔴 Botão DELETAR clicado! Cliente ID:', client.id);
        deleteClient(client.id);
      }, true); // Capture phase
    }

    // Event listener para selecionar cliente (clique no div principal)
    div.addEventListener('click', (e) => {
      // Não selecionar se clicou nos botões, área de ações ou drag handle
      if (e.target.closest('.client-actions') ||
          e.target.closest('.drag-handle') ||
          e.target.classList.contains('btn-edit') ||
          e.target.classList.contains('btn-delete')) {
        console.log('⚠️ Clicou na área de botões/drag, ignorando seleção');
        return;
      }
      console.log('✅ Selecionando cliente:', client.id);
      renderClientTasks(client.id);
      renderClientsList();
    });

    // Drag and Drop events para clientes
    div.addEventListener('dragstart', (e) => {
      div.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', div.innerHTML);
    });

    div.addEventListener('dragend', (e) => {
      div.classList.remove('dragging');
    });

    div.addEventListener('dragover', (e) => {
      e.preventDefault();
      const draggingElement = document.querySelector('.dragging');
      if (!draggingElement || draggingElement === div) return;

      const afterElement = getDragAfterElement(clientsList, e.clientY);
      if (afterElement == null) {
        clientsList.appendChild(draggingElement);
      } else {
        clientsList.insertBefore(draggingElement, afterElement);
      }
    });

    div.addEventListener('drop', (e) => {
      e.preventDefault();
      // Reordenar array de clientes baseado na nova ordem visual
      const items = Array.from(clientsList.querySelectorAll('.client-item'));
      const newOrder = items.map(item => {
        const clientId = parseInt(item.dataset.clientId);
        return clients.find(c => c.id === clientId);
      }).filter(Boolean);

      clients = newOrder;
      saveClients();
      console.log('✅ Ordem dos clientes atualizada');
    });

    clientsList.appendChild(div);
  });
}

// Helper function para determinar posição do drop (clientes)
function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.client-item:not(.dragging)')];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;

    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// Helper function para determinar posição do drop (tarefas)
function getDragAfterElementTask(container, y) {
  const draggableElements = [...container.querySelectorAll('.task-item:not(.dragging)')];

  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;

    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// =================== RENDER TASKS ===================
function renderClientTasks(clientId) {
  const noClient = document.getElementById("noClientSelected");
  const tasksView = document.getElementById("clientTasksView");
  const tasksList = document.getElementById("tasksList");

  if (!tasksList) return;
  
  tasksList.innerHTML = "";

  const client = clients.find(c => c.id === clientId);
  if (!client) {
    if (noClient) noClient.classList.remove("hidden");
    if (tasksView) tasksView.classList.add("hidden");
    return;
  }

  selectedClientId = clientId;

  if (noClient) noClient.classList.add("hidden");
  if (tasksView) tasksView.classList.remove("hidden");

  const nameEl = document.getElementById("selectedClientName");
  if (nameEl) nameEl.textContent = client.name;

  // Filtrar tarefas não arquivadas
  const activeTasks = client.tasks.filter(t => !t.archived);

  if (activeTasks.length === 0) {
    tasksList.innerHTML = `<p class="empty-message">Nenhuma tarefa</p>`;
    updateClientStats(client);
    return;
  }

  activeTasks.forEach((task, index) => {
    const isOverdue = task.deadline && new Date(task.deadline) < new Date() && !task.completed;
    const overdueClass = isOverdue ? 'overdue' : '';
    const completedClass = task.completed ? 'completed' : '';

    const div = document.createElement("div");
    div.className = `task-item ${completedClass} ${overdueClass}`;
    div.draggable = true;
    div.dataset.taskId = task.id;
    div.dataset.index = index;

    const urgencyMap = {
      'alta': '🔴 Alta',
      'media': '🟡 Média',
      'baixa': '🟢 Baixa'
    };

    const formattedDeadline = task.deadline ? new Date(task.deadline).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : '';

    const hasNotes = task.notes && task.notes.trim().length > 0;

    div.innerHTML = `
      <div class="task-row">
        <div class="drag-handle-task" style="cursor: move; padding: 5px; color: #999;">
          <span style="font-size: 14px;">⋮⋮</span>
        </div>
        <input type="checkbox" class="task-checkbox" data-action="toggle-task" data-id="${task.id}" ${task.completed ? "checked" : ""}>
        <div class="task-content" data-task-id="${task.id}" style="flex: 1;">
          <div class="task-text-row">
            <div class="task-text">${escapeHtml(task.text)}</div>
            ${hasNotes ? '<span class="task-has-notes" title="Esta tarefa tem notas">📝</span>' : ''}
          </div>
          <div class="task-tags">
            <span class="task-tag tag-${task.urgency}">${urgencyMap[task.urgency] || task.urgency}</span>
            ${task.deadline ? `<span class="task-tag tag-deadline ${isOverdue ? 'overdue' : ''}">🕐 ${formattedDeadline}${isOverdue ? ' (ATRASADO)' : ''}</span>` : ''}
          </div>
        </div>
        <div class="task-actions">
          ${task.completed ? `<button class="btn-archive-task" data-action="archive-task" data-id="${task.id}" title="Arquivar">📦</button>` : ''}
          <button class="btn-delete-task" data-action="delete-task" data-id="${task.id}">🗑️</button>
        </div>
      </div>
    `;

    // Drag and Drop events para tarefas
    div.addEventListener('dragstart', (e) => {
      div.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', div.innerHTML);
    });

    div.addEventListener('dragend', () => {
      div.classList.remove('dragging');
    });

    div.addEventListener('dragover', (e) => {
      e.preventDefault();
      const draggingElement = document.querySelector('.task-item.dragging');
      if (!draggingElement || draggingElement === div) return;

      const afterElement = getDragAfterElementTask(tasksList, e.clientY);
      if (afterElement == null) {
        tasksList.appendChild(draggingElement);
      } else {
        tasksList.insertBefore(draggingElement, afterElement);
      }
    });

    div.addEventListener('drop', (e) => {
      e.preventDefault();
      // Reordenar array de tarefas baseado na nova ordem visual
      const items = Array.from(tasksList.querySelectorAll('.task-item'));
      const newOrder = items.map(item => {
        const taskId = parseInt(item.dataset.taskId);
        return client.tasks.find(t => t.id === taskId);
      }).filter(Boolean);

      client.tasks = newOrder;
      saveClients();
      console.log('✅ Ordem das tarefas atualizada');
    });

    tasksList.appendChild(div);
  });

  // Adicionar event listeners para abrir modal ao clicar na tarefa
  tasksList.querySelectorAll('.task-content').forEach(content => {
    content.addEventListener('click', (e) => {
      const taskId = parseInt(e.currentTarget.getAttribute('data-task-id'), 10);
      openTaskModal(taskId);
    });
    content.style.cursor = 'pointer';
  });

  updateClientStats(client);
}

// =================== RENDER URGENCIES ===================
function renderUrgencyList() {
  const urgencyList = document.getElementById("urgencyList");
  if (!urgencyList) return;
  
  urgencyList.innerHTML = "";

  const allTasks = clients.flatMap(c => c.tasks.map(t => ({ ...t, clientName: c.name, clientId: c.id })));
  const pending = allTasks.filter(t => !t.completed && !t.archived);

  if (pending.length === 0) {
    urgencyList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📅</div>
        <p>Nenhuma tarefa pendente</p>
        <small>Você está em dia!</small>
      </div>`;
    return;
  }

  // Ordenar por urgência e depois por deadline
  const urgencyOrder = { alta: 3, media: 2, baixa: 1 };
  pending.sort((a, b) => {
    const urgDiff = urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
    if (urgDiff !== 0) return urgDiff;
    
    if (a.deadline && b.deadline) {
      return new Date(a.deadline) - new Date(b.deadline);
    }
    if (a.deadline) return -1;
    if (b.deadline) return 1;
    return 0;
  });

  const urgencyMap = {
    'alta': '🔴 Urgência Alta',
    'media': '🟡 Urgência Média',
    'baixa': '🟢 Urgência Baixa'
  };

  pending.forEach(task => {
    const isOverdue = task.deadline && new Date(task.deadline) < new Date();
    const div = document.createElement("div");
    div.className = `urgency-item urgency-${task.urgency} ${isOverdue ? 'overdue' : ''}`;

    const formattedDeadline = task.deadline ? new Date(task.deadline).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : '';

    div.innerHTML = `
      <div class="urgency-header">
        <input type="checkbox" class="urgency-checkbox" data-action="toggle-task" data-id="${task.id}" title="Marcar como concluída">
        <span class="urgency-dot dot-${task.urgency}"></span>
        <span class="urgency-task-name">${escapeHtml(task.text)}</span>
      </div>
      <div class="urgency-meta">
        <span>👤 ${escapeHtml(task.clientName)}</span>
        ${task.deadline ? `<span class="${isOverdue ? 'text-red' : ''}">🕐 ${formattedDeadline}${isOverdue ? ' (ATRASADO)' : ''}</span>` : ''}
      </div>
      <div class="task-tags">
        <span class="task-tag tag-${task.urgency}">${urgencyMap[task.urgency]}</span>
        ${isOverdue ? '<span class="task-tag tag-deadline overdue">⚠️ ATRASADO</span>' : ''}
      </div>
    `;

    urgencyList.appendChild(div);
  });
}

// =================== RENDER ARCHIVED ===================
function renderArchivedList() {
  const archivedList = document.getElementById("archivedList");
  if (!archivedList) return;
  
  archivedList.innerHTML = "";

  const allTasks = clients.flatMap(c => c.tasks.map(t => ({ ...t, clientName: c.name, clientId: c.id })));
  const archived = allTasks.filter(t => t.archived);

  if (archived.length === 0) {
    archivedList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📦</div>
        <p>Nenhuma tarefa arquivada</p>
        <small>Tarefas concluídas e arquivadas aparecerão aqui</small>
      </div>`;
    return;
  }

  // Ordenar por data (mais recentes primeiro)
  archived.sort((a, b) => b.id - a.id);

  const urgencyMap = {
    'alta': '🔴 Alta',
    'media': '🟡 Média',
    'baixa': '🟢 Baixa'
  };

  archived.forEach(task => {
    const div = document.createElement("div");
    div.className = 'archived-item';

    const formattedDeadline = task.deadline ? new Date(task.deadline).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : 'Sem prazo';

    div.innerHTML = `
      <div class="archived-header">
        <span class="archived-task-name">✅ ${escapeHtml(task.text)}</span>
      </div>
      <div class="archived-meta">
        <span>👤 ${escapeHtml(task.clientName)}</span>
        <span>🕐 ${formattedDeadline}</span>
      </div>
      <div class="task-tags">
        <span class="task-tag tag-${task.urgency}">${urgencyMap[task.urgency]}</span>
        <span class="task-tag tag-archived">📦 Arquivada</span>
      </div>
      <div class="archived-actions">
        <button class="btn-unarchive" data-action="unarchive-task" data-id="${task.id}" title="Desarquivar">
          ↩️ Desarquivar
        </button>
        <button class="btn-delete-archived" data-action="delete-task" data-id="${task.id}" title="Deletar permanentemente">
          🗑️ Deletar
        </button>
      </div>
    `;

    archivedList.appendChild(div);
  });
}

function unarchiveTask(taskId) {
  for (let client of clients) {
    const task = client.tasks.find(t => t.id === taskId);
    if (task) {
      task.archived = false;
      saveClients();
      renderArchivedList();
      renderClientsList();
      renderClientTasks(client.id);
      updateGlobalStats();
      break;
    }
  }
}

// =================== CLIENT FUNCS ===================
function addClient(name) {
  const newClient = {
    id: Date.now(),
    name,
    tasks: []
  };
  clients.push(newClient);
  saveClients();
  renderClientsList();
  updateGlobalStats();
}

async function editClient(id) {
  console.log('=== EDITAR CLIENTE ===');
  console.log('ID:', id);

  const client = clients.find(c => c.id === id);
  if (!client) {
    console.error('Cliente não encontrado:', id);
    return;
  }

  const newName = await showPrompt("Novo nome do cliente:", client.name);
  console.log('Novo nome:', newName);

  if (newName && newName.trim()) {
    client.name = newName.trim();
    saveClients();
    renderClientsList();
    if (selectedClientId === id) {
      renderClientTasks(id);
    }
    console.log('Cliente renomeado com sucesso!');
  }
}

async function deleteClient(id) {
  console.log('=== DELETAR CLIENTE ===');
  console.log('ID:', id);

  const confirmed = await showConfirm('Tem certeza que deseja excluir este cliente e todas suas tarefas?');

  if (!confirmed) {
    console.log('Exclusão cancelada pelo usuário');
    return;
  }

  clients = clients.filter(c => c.id !== id);
  saveClients();
  renderClientsList();
  updateGlobalStats();

  if (selectedClientId === id) {
    selectedClientId = null;
    renderClientTasks(null);
  }

  console.log('Cliente excluído com sucesso!');
}

// =================== TASK FUNCS ===================
function showAddTaskForm() {
  const form = document.getElementById("addTaskForm");
  if (form) {
    form.classList.remove("hidden");
    document.getElementById("newTaskText").focus();
  }
}

function hideAddTaskForm() {
  const form = document.getElementById("addTaskForm");
  if (form) {
    form.classList.add("hidden");
    document.getElementById("newTaskText").value = "";
    document.getElementById("newTaskDeadline").value = "";
    document.getElementById("newTaskUrgency").value = "media";
  }
}

function addTask(clientId, text, deadline, urgency) {
  const client = clients.find(c => c.id === clientId);
  if (!client) return;

  client.tasks.push({
    id: Date.now(),
    text,
    deadline,
    urgency,
    completed: false,
    notes: '', // Campo de notas
    archived: false // Campo de arquivamento
  });

  saveClients();
  hideAddTaskForm(); // Fechar formulário após adicionar
  renderClientTasks(clientId);
  renderUrgencyList();
  updateGlobalStats();
}

function toggleTask(taskId) {
  for (let client of clients) {
    const task = client.tasks.find(t => t.id === taskId);
    if (task) {
      task.completed = !task.completed;
      saveClients();
      renderClientTasks(client.id);
      renderClientsList(); // Atualizar lista de clientes com progresso
      renderUrgencyList(); // Atualizar lista de urgências
      updateGlobalStats();
      break;
    }
  }
}

function archiveTask(taskId) {
  for (let client of clients) {
    const task = client.tasks.find(t => t.id === taskId);
    if (task) {
      if (!task.completed) {
        alert('Apenas tarefas concluídas podem ser arquivadas!');
        return;
      }
      task.archived = true;
      saveClients();
      renderClientTasks(client.id);
      renderClientsList();
      renderUrgencyList();
      updateGlobalStats();
      break;
    }
  }
}

function updateTaskNotes(taskId, notes) {
  for (let client of clients) {
    const task = client.tasks.find(t => t.id === taskId);
    if (task) {
      task.notes = notes;
      saveClients();
      break;
    }
  }
}

function updateTask(taskId, updates) {
  for (let client of clients) {
    const task = client.tasks.find(t => t.id === taskId);
    if (task) {
      if (updates.text !== undefined) task.text = updates.text;
      if (updates.urgency !== undefined) task.urgency = updates.urgency;
      if (updates.deadline !== undefined) task.deadline = updates.deadline;
      if (updates.completed !== undefined) task.completed = updates.completed;
      if (updates.notes !== undefined) task.notes = updates.notes;
      saveClients();
      break;
    }
  }
}

function deleteTask(taskId) {
  for (let client of clients) {
    client.tasks = client.tasks.filter(t => t.id !== taskId);
  }
  saveClients();
  if (selectedClientId) renderClientTasks(selectedClientId);
  renderUrgencyList();
  updateGlobalStats();
}

// =================== STATS ===================
function updateClientStats(client) {
  const total = client.tasks.length;
  const completed = client.tasks.filter(t => t.completed).length;
  const progress = total ? Math.round((completed / total) * 100) : 0;

  const statsEl = document.getElementById("clientStats");
  const progressEl = document.getElementById("clientProgress");
  
  if (statsEl) statsEl.textContent = `${completed} de ${total} concluídas`;
  if (progressEl) progressEl.textContent = progress + "%";

  updateGlobalStats();
}

function updateGlobalStats() {
  const totalTasks = clients.reduce((sum, c) => sum + c.tasks.length, 0);
  const completedTasks = clients.reduce((sum, c) => sum + c.tasks.filter(t => t.completed).length, 0);
  const pendingTasks = totalTasks - completedTasks;
  const overallProgress = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const totalEl = document.getElementById("totalTasks");
  const completedEl = document.getElementById("completedTasks");
  const pendingEl = document.getElementById("pendingTasks");
  const progressTextEl = document.getElementById("overallProgress");
  const progressFillEl = document.getElementById("progressFill");

  if (totalEl) totalEl.textContent = totalTasks;
  if (completedEl) completedEl.textContent = completedTasks;
  if (pendingEl) pendingEl.textContent = pendingTasks;
  if (progressTextEl) progressTextEl.textContent = overallProgress + "%";
  if (progressFillEl) progressFillEl.style.width = overallProgress + "%";
}

// =================== EVENT DELEGATION ===================
document.addEventListener("click", (e) => {
  console.log('Click detectado:', e.target, 'Classes:', e.target.className);

  // Verificar PRIMEIRO se é um botão específico (prioridade alta)
  const isEditBtn = e.target.classList.contains('btn-edit') || e.target.closest('.btn-edit');
  const isDeleteBtn = e.target.classList.contains('btn-delete') || e.target.closest('.btn-delete');
  const isArchiveBtn = e.target.classList.contains('btn-archive-task') || e.target.closest('.btn-archive-task');
  const isUnarchiveBtn = e.target.classList.contains('btn-unarchive') || e.target.closest('.btn-unarchive');
  const isDeleteTaskBtn = e.target.classList.contains('btn-delete-task') || e.target.closest('.btn-delete-task');
  const isDeleteArchivedBtn = e.target.classList.contains('btn-delete-archived') || e.target.closest('.btn-delete-archived');

  // Se é um botão de ação, pegar o botão correto
  let actionButton = null;
  if (isEditBtn) actionButton = e.target.closest('.btn-edit') || e.target;
  else if (isDeleteBtn) actionButton = e.target.closest('.btn-delete') || e.target;
  else if (isArchiveBtn) actionButton = e.target.closest('.btn-archive-task') || e.target;
  else if (isUnarchiveBtn) actionButton = e.target.closest('.btn-unarchive') || e.target;
  else if (isDeleteTaskBtn) actionButton = e.target.closest('.btn-delete-task') || e.target;
  else if (isDeleteArchivedBtn) actionButton = e.target.closest('.btn-delete-archived') || e.target;

  if (actionButton) {
    e.preventDefault();
    e.stopPropagation();

    const action = actionButton.dataset.action;
    const id = parseInt(actionButton.dataset.id, 10);

    console.log('=== BOTÃO DE AÇÃO DETECTADO ===');
    console.log('Ação:', action);
    console.log('ID:', id);

    switch (action) {
      case "edit-client":
        console.log('Executando editClient');
        editClient(id);
        break;

      case "delete-client":
        console.log('Executando deleteClient');
        deleteClient(id);
        break;

      case "delete-task":
        console.log('Executando deleteTask');
        deleteTask(id);
        break;

      case "archive-task":
        console.log('Executando archiveTask');
        archiveTask(id);
        break;

      case "unarchive-task":
        console.log('Executando unarchiveTask');
        unarchiveTask(id);
        break;
    }
    return; // Importante: sair aqui
  }

  // Se não é um botão, verificar outras ações
  const el = e.target.closest("[data-action]");
  if (!el) {
    return;
  }

  const action = el.dataset.action;
  const id = parseInt(el.dataset.id, 10);

  console.log('=== AÇÃO GENÉRICA DETECTADA ===');
  console.log('Ação:', action);
  console.log('ID:', id);

  switch (action) {
    case "select-client":
      console.log('Selecionando cliente:', id);
      renderClientTasks(id);
      renderClientsList();
      break;

    case "delete-task-global":
      console.log('Deletando tarefa (global):', id);
      deleteTask(id);
      break;
  }
});

document.addEventListener("change", (e) => {
  if (e.target.matches("[data-action='toggle-task']")) {
    const id = parseInt(e.target.dataset.id, 10);
    console.log('Toggle tarefa:', id);
    toggleTask(id);
  }
});

// =================== SINCRONIZAÇÃO COM SERVIDOR ===================
async function syncWithServer() {
  if (syncInProgress) return;

  if (!window.auth || !window.auth.isAuthenticated()) {
    console.log('Usuário não autenticado, pulando sync');
    return;
  }

  syncInProgress = true;
  const btnSync = document.getElementById("btnSync");
  if (btnSync) {
    btnSync.textContent = "⏳ Sync...";
    btnSync.disabled = true;
  }

  try {
    await window.auth.syncTasks(clients);
    console.log('✅ Tarefas sincronizadas com sucesso!');

    if (btnSync) {
      btnSync.textContent = "✅ Sync";
      setTimeout(() => {
        btnSync.textContent = "🔄 Sync";
        btnSync.disabled = false;
      }, 2000);
    }
  } catch (error) {
    console.error('❌ Erro ao sincronizar:', error);

    if (btnSync) {
      btnSync.textContent = "❌ Erro";
      setTimeout(() => {
        btnSync.textContent = "🔄 Sync";
        btnSync.disabled = false;
      }, 2000);
    }
  } finally {
    syncInProgress = false;
  }
}

async function loadTasksFromServer() {
  if (!window.auth || !window.auth.isAuthenticated()) {
    console.log('Usuário não autenticado, carregando do localStorage');
    loadClients();
    return;
  }

  try {
    const serverTasks = await window.auth.fetchTasks();

    if (serverTasks && serverTasks.length > 0) {
      clients = serverTasks;
      localStorage.setItem("clients", JSON.stringify(clients));
      console.log('✅ Tarefas carregadas do servidor!');
    } else {
      loadClients();
    }

    renderClientsList();
    renderUrgencyList();
    renderArchivedList();
    updateGlobalStats();
  } catch (error) {
    console.error('❌ Erro ao carregar tarefas do servidor:', error);
    loadClients();
    renderClientsList();
    renderUrgencyList();
    renderArchivedList();
    updateGlobalStats();
  }
}

// =================== INIT ===================
document.addEventListener("DOMContentLoaded", async () => {
  console.log('========================================');
  console.log('SIDEBAR.JS CARREGADO!');
  console.log('Versão: 7.0 - COM AUTENTICAÇÃO E SYNC');
  console.log('========================================');

  // Verificar autenticação
  const isAuth = await window.auth.checkAuth();
  if (!isAuth) {
    console.log('Usuário não autenticado, redirecionando...');
    return; // checkAuth já redireciona
  }

  // Mostrar dados do usuário
  const user = window.auth.getUser();
  if (user) {
    // Pegar primeiro nome
    const firstName = user.name ? user.name.split(' ')[0] : 'Usuário';
    const initial = firstName.charAt(0).toUpperCase();

    // Atualizar elementos
    const userNameEl = document.getElementById("userName");
    const userInitialEl = document.getElementById("userInitial");
    const profileMenuNameEl = document.getElementById("profileMenuName");
    const profileMenuEmailEl = document.getElementById("profileMenuEmail");

    if (userNameEl) userNameEl.textContent = firstName;
    if (userInitialEl) userInitialEl.textContent = initial;
    if (profileMenuNameEl) profileMenuNameEl.textContent = user.name || 'Usuário';
    if (profileMenuEmailEl) profileMenuEmailEl.textContent = user.email || '';
  }

  // Carregar tarefas do servidor
  await loadTasksFromServer();

  renderClientsList();
  renderUrgencyList();
  renderArchivedList();
  updateGlobalStats();

  // Tab switchers
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      switchTab(tab);
    });
  });

  // Adicionar cliente
  const btnAddClient = document.getElementById("btnAddClient");
  if (btnAddClient) {
    btnAddClient.addEventListener("click", () => {
      document.getElementById("addClientForm").classList.remove("hidden");
      document.getElementById("newClientName").focus();
    });
  }

  const btnSaveClient = document.getElementById("btnSaveClient");
  if (btnSaveClient) {
    btnSaveClient.addEventListener("click", () => {
      const name = document.getElementById("newClientName").value.trim();
      if (name) {
        addClient(name);
        document.getElementById("newClientName").value = "";
        document.getElementById("addClientForm").classList.add("hidden");
      }
    });
  }

  const btnCancelClient = document.getElementById("btnCancelClient");
  if (btnCancelClient) {
    btnCancelClient.addEventListener("click", () => {
      document.getElementById("newClientName").value = "";
      document.getElementById("addClientForm").classList.add("hidden");
    });
  }

  // Adicionar tarefa
  const btnShowAddTask = document.getElementById("btnShowAddTask");
  if (btnShowAddTask) {
    btnShowAddTask.addEventListener("click", () => {
      showAddTaskForm();
    });
  }

  const btnAddTask = document.getElementById("btnAddTask");
  if (btnAddTask) {
    btnAddTask.addEventListener("click", () => {
      const text = document.getElementById("newTaskText").value.trim();
      const deadline = document.getElementById("newTaskDeadline").value;
      const urgency = document.getElementById("newTaskUrgency").value;

      if (text && selectedClientId) {
        addTask(selectedClientId, text, deadline, urgency);
      }
    });
  }

  const btnCancelTask = document.getElementById("btnCancelTask");
  if (btnCancelTask) {
    btnCancelTask.addEventListener("click", () => {
      hideAddTaskForm();
    });
  }

  // Enter no campo de texto da tarefa
  const newTaskText = document.getElementById("newTaskText");
  if (newTaskText) {
    newTaskText.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        const text = document.getElementById("newTaskText").value.trim();
        const deadline = document.getElementById("newTaskDeadline").value;
        const urgency = document.getElementById("newTaskUrgency").value;

        if (text && selectedClientId) {
          addTask(selectedClientId, text, deadline, urgency);
        }
      }
    });
  }

  // Menu de perfil
  const btnProfile = document.getElementById("btnProfile");
  const profileMenu = document.getElementById("profileMenu");

  if (btnProfile && profileMenu) {
    btnProfile.addEventListener("click", (e) => {
      e.stopPropagation();
      profileMenu.style.display = profileMenu.style.display === 'none' ? 'block' : 'none';
    });

    // Fechar ao clicar fora
    document.addEventListener("click", (e) => {
      if (!profileMenu.contains(e.target) && e.target !== btnProfile) {
        profileMenu.style.display = 'none';
      }
    });
  }

  // Botão de logout
  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) {
    btnLogout.addEventListener("click", () => {
      if (profileMenu) profileMenu.style.display = 'none';
      if (confirm("Tem certeza que deseja sair?")) {
        window.auth.logout();
      }
    });
  }

  // Hover no botão de logout
  if (btnLogout) {
    btnLogout.addEventListener("mouseenter", () => {
      btnLogout.style.background = '#ffebee';
    });
    btnLogout.addEventListener("mouseleave", () => {
      btnLogout.style.background = 'none';
    });
  }

  // Botão de sync manual
  const btnSync = document.getElementById("btnSync");
  if (btnSync) {
    btnSync.addEventListener("click", () => {
      syncWithServer();
    });
  }

  console.log('Inicialização completa!');
});