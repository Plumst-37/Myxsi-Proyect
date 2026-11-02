/* =========================================================
   MYXSI AI - UI MANIPULATION & RENDER MODULE
   ========================================================= */

import { state, setTheme, getActiveChat, createChat, renameChat, deleteChat, toggleFavoriteChat, saveChatsToStorage } from './state.js';
import { sendChatMessage, extractFileText } from './api.js';
import { toggleListening } from './audio.js';

const elements = {};

export function cacheDOMElements() {
  elements.html = document.documentElement;
  elements.app = document.getElementById('app');
  elements.sidebar = document.getElementById('sidebar');
  elements.sidebarOverlay = document.getElementById('sidebarOverlay');
  elements.btnToggleSidebar = document.getElementById('btnToggleSidebar');
  elements.btnMobileSidebar = document.getElementById('btnMobileSidebar');
  elements.btnNewChat = document.getElementById('btnNewChat');
  elements.btnThemeToggle = document.getElementById('btnThemeToggle');
  elements.searchChatsInput = document.getElementById('searchChatsInput');
  elements.chatsListContainer = document.getElementById('chatsListContainer');
  
  elements.heroView = document.getElementById('heroView');
  elements.chatThreadView = document.getElementById('chatThreadView');
  elements.messagesContainer = document.getElementById('messagesContainer');
  
  elements.dockTextarea = document.getElementById('dockTextarea');
  elements.btnSendDock = document.getElementById('btnSendDock');
  elements.btnAttach = document.getElementById('btnAttach');
  elements.btnVoice = document.getElementById('btnVoice');
  elements.fileInput = document.getElementById('fileInput');
  elements.voiceWaveArea = document.getElementById('voiceWaveArea');
  elements.attachedFileChip = document.getElementById('attachedFileChip');
  elements.attachedFileName = document.getElementById('attachedFileName');
  
  elements.streakCount = document.getElementById('streakCount');
  elements.topbarHomeTab = document.getElementById('topbarHomeTab');
}

// 1. CAMBIO DE TEMA (DARK / LIGHT)
export function toggleAppTheme() {
  const newTheme = state.theme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
  updateThemeIcon();
}

export function updateThemeIcon() {
  if (!elements.btnThemeToggle) return;
  const icon = elements.btnThemeToggle.querySelector('i');
  if (icon) {
    icon.className = state.theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }
}

// 2. CAMBIO DE VISTAS ('home' vs 'chat')
export function switchView(viewName) {
  state.activeView = viewName;
  
  if (viewName === 'home') {
    state.activeChatId = null;
    if (elements.heroView) elements.heroView.classList.remove('hidden');
    if (elements.chatThreadView) elements.chatThreadView.classList.add('hidden');
    if (elements.topbarHomeTab) elements.topbarHomeTab.classList.add('active');
  } else {
    if (elements.heroView) elements.heroView.classList.add('hidden');
    if (elements.chatThreadView) elements.chatThreadView.classList.remove('hidden');
    if (elements.topbarHomeTab) elements.topbarHomeTab.classList.remove('active');
    renderActiveChatMessages();
  }
  
  renderSidebarChats();
}

// 3. AUTO-EXPANSIÓN DE TEXTAREA
export function autoExpandTextarea(textarea) {
  textarea.style.height = 'auto';
  const maxHeight = 120; // 5 líneas
  const newHeight = Math.min(textarea.scrollHeight, maxHeight);
  textarea.style.height = newHeight + 'px';
  
  const val = textarea.value.trim();
  if (elements.btnSendDock) {
    elements.btnSendDock.disabled = (!val && !state.attachedFile);
  }
}

// Helper para tiempo relativo (ej. "Hace 2 horas", "Ayer")
function formatRelativeTime(dateString) {
  if (!dateString) return 'Reciente';
  const date = new Date(dateString);
  const now = new Date();
  const diffSecs = Math.floor((now - date) / 1000);
  
  if (diffSecs < 60) return 'Hace un momento';
  if (diffSecs < 3600) return `Hace ${Math.floor(diffSecs / 60)} min`;
  if (diffSecs < 86400) return `Hace ${Math.floor(diffSecs / 3600)} h`;
  if (diffSecs < 172800) return 'Ayer';
  return `Hace ${Math.floor(diffSecs / 86400)} días`;
}

// 4. RENDERIZADO DEL HISTORIAL DE CHATS EN SIDEBAR
export function renderSidebarChats(filterQuery = '') {
  if (!elements.chatsListContainer) return;
  elements.chatsListContainer.innerHTML = '';

  const query = filterQuery.toLowerCase().trim();
  const filtered = state.chats.filter(c => c.title.toLowerCase().includes(query));

  if (filtered.length === 0) {
    elements.chatsListContainer.innerHTML = `
      <div style="padding: 1.5rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.8rem;">
        <i class="fa-solid fa-comments-question" style="font-size: 1.4rem; margin-bottom: 0.4rem; opacity: 0.5;"></i>
        <p>No se encontraron chats</p>
      </div>
    `;
    return;
  }

  // Agrupar chats
  const todayChats = [];
  const earlierChats = [];

  const now = new Date();
  filtered.forEach(chat => {
    const d = new Date(chat.createdAt || Date.now());
    const isToday = (now.toDateString() === d.toDateString());
    if (isToday) {
      todayChats.push(chat);
    } else {
      earlierChats.push(chat);
    }
  });

  if (todayChats.length > 0) {
    appendChatGroup('Hoy', todayChats);
  }
  if (earlierChats.length > 0) {
    appendChatGroup('Anteriores', earlierChats);
  }
}

function appendChatGroup(title, chatList) {
  const groupTitle = document.createElement('div');
  groupTitle.className = 'sidebar-group-title';
  groupTitle.textContent = title;
  elements.chatsListContainer.appendChild(groupTitle);

  chatList.forEach(chat => {
    const item = document.createElement('div');
    const isActive = (chat.id === state.activeChatId);
    item.className = `chat-history-item ${isActive ? 'active' : ''}`;
    
    item.innerHTML = `
      <div class="chat-item-main">
        <i class="fa-regular fa-message chat-icon"></i>
        <div class="chat-item-info">
          <span class="chat-history-title">${escapeHTML(chat.title)}</span>
          <span class="chat-history-time">${formatRelativeTime(chat.createdAt)}</span>
        </div>
      </div>
      <div class="chat-item-actions">
        <button class="action-btn btn-fav ${chat.favorite ? 'active' : ''}" title="${chat.favorite ? 'Quitar de favoritos' : 'Marcar como favorito'}">
          <i class="fa-${chat.favorite ? 'solid' : 'regular'} fa-star"></i>
        </button>
        <button class="action-btn btn-delete" title="Eliminar conversación">
          <i class="fa-regular fa-trash-can"></i>
        </button>
      </div>
    `;

    // Seleccionar chat
    item.addEventListener('click', (e) => {
      if (e.target.closest('.action-btn')) return; // No cambiar de vista si hace clic en icono de accion
      state.activeChatId = chat.id;
      switchView('chat');
    });

    // Favorito
    const btnFav = item.querySelector('.btn-fav');
    btnFav.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleFavoriteChat(chat.id);
      renderSidebarChats();
    });

    // Eliminar
    const btnDelete = item.querySelector('.btn-delete');
    btnDelete.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`¿Eliminar la conversación "${chat.title}"?`)) {
        deleteChat(chat.id);
        if (state.activeChatId === chat.id) {
          switchView('home');
        } else {
          renderSidebarChats();
        }
      }
    });

    elements.chatsListContainer.appendChild(item);
  });
}

// 5. RENDERIZADO DE MENSAJES EN EL CHAT
export function renderActiveChatMessages() {
  if (!elements.messagesContainer) return;
  elements.messagesContainer.innerHTML = '';

  const activeChat = getActiveChat();
  if (!activeChat || activeChat.history.length === 0) {
    elements.messagesContainer.innerHTML = `
      <div class="empty-thread-state">
        <i class="fa-solid fa-sparkles"></i>
        <h3>Inicia tu conversación con Myxsi</h3>
        <p>Pregunta sobre cualquier tema escolar, universitario o profesional.</p>
      </div>
    `;
    return;
  }

  activeChat.history.forEach(msg => {
    const msgElement = createMessageElement(msg.role, msg.content, msg.attachment);
    elements.messagesContainer.appendChild(msgElement);
  });

  scrollToBottom();
}

export function createMessageElement(role, content, attachment = null) {
  const wrapper = document.createElement('div');
  wrapper.className = `chat-message ${role}`;

  const isUser = (role === 'user');
  
  let attachmentHTML = '';
  if (attachment) {
    attachmentHTML = `
      <div class="message-attachment-chip">
        <i class="fa-solid fa-file-lines"></i>
        <span>${escapeHTML(attachment.name)}</span>
      </div>
    `;
  }

  wrapper.innerHTML = `
    <div class="avatar-col">
      <div class="avatar-bubble ${isUser ? 'user' : 'bot'}">
        ${isUser ? '<i class="fa-solid fa-user"></i>' : '<span>M</span>'}
      </div>
    </div>
    <div class="message-body">
      ${attachmentHTML}
      <div class="message-bubble">
        ${formatMarkdownText(content)}
      </div>
    </div>
  `;

  return wrapper;
}

export function scrollToBottom() {
  if (elements.messagesContainer) {
    elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
  }
}

// 6. ENVIAR MENSAJE Y MANEJAR STREAMING CON IA
export async function handleSendMessage(textInput) {
  let text = textInput ? textInput.trim() : '';
  let attached = state.attachedFile;

  if (!text && !attached) return;

  // Si estamos en vista 'home', crear un nuevo chat
  let activeChat = getActiveChat();
  if (!activeChat || state.activeView === 'home') {
    const title = text ? (text.substring(0, 35) + (text.length > 35 ? '...' : '')) : 'Consulta con archivo';
    activeChat = createChat(title);
    switchView('chat');
  }

  // Limpiar adjunto y textarea
  removeAttachment();

  // Agregar mensaje del usuario al estado
  const userMsg = { role: 'user', content: text, attachment: attached };
  activeChat.history.push(userMsg);
  saveChatsToStorage();

  // Renderizar mensaje del usuario
  renderActiveChatMessages();

  // Crear burbuja vacía de la IA con loader
  state.isGenerating = true;
  const botMsgWrapper = document.createElement('div');
  botMsgWrapper.className = 'chat-message assistant';
  botMsgWrapper.innerHTML = `
    <div class="avatar-col">
      <div class="avatar-bubble bot">
        <span>M</span>
      </div>
    </div>
    <div class="message-body">
      <div class="message-bubble typing">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
    </div>
  `;
  elements.messagesContainer.appendChild(botMsgWrapper);
  scrollToBottom();

  const bubbleElem = botMsgWrapper.querySelector('.message-bubble');

  try {
    // Generar respuesta streaming con Groq AI / Fallback
    let fullResponse = '';
    await sendChatMessage(activeChat.history, (chunk) => {
      fullResponse += chunk;
      bubbleElem.classList.remove('typing');
      bubbleElem.innerHTML = formatMarkdownText(fullResponse);
      scrollToBottom();
    });

    // Guardar respuesta final en el estado
    activeChat.history.push({ role: 'assistant', content: fullResponse });
    saveChatsToStorage();

  } catch (err) {
    console.error("Error generando respuesta IA:", err);
    bubbleElem.classList.remove('typing');
    bubbleElem.innerHTML = '<span style="color: #ef4444;">Ocurrió un error al procesar tu solicitud. Intenta nuevamente.</span>';
  } finally {
    state.isGenerating = false;
  }
}

// 7. MANEJO DE ARCHIVOS ADJUNTOS
export async function handleFileUpload(file) {
  if (!file) return;
  
  const fileData = await extractFileText(file);
  state.attachedFile = {
    name: file.name,
    type: file.type,
    text: fileData
  };

  if (elements.attachedFileChip && elements.attachedFileName) {
    elements.attachedFileName.textContent = file.name;
    elements.attachedFileChip.classList.remove('hidden');
  }

  if (elements.dockTextarea) {
    autoExpandTextarea(elements.dockTextarea);
  }
}

export function removeAttachment() {
  state.attachedFile = null;
  if (elements.attachedFileChip) {
    elements.attachedFileChip.classList.add('hidden');
  }
  if (elements.fileInput) {
    elements.fileInput.value = '';
  }
}

// Formateador simple de Markdown
function formatMarkdownText(text) {
  if (!text) return '';
  let html = escapeHTML(text);
  
  // Negrita **texto**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Cursiva *texto*
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Listas con guiones - item
  html = html.replace(/^- (.*$)/gim, '• $1');

  // Saltos de línea
  html = html.replace(/\n/g, '<br>');

  return html;
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}
