/* =========================================================
   MYXSI AI - MAIN APPLICATION ENTRY POINT
   ========================================================= */

import { state, initStore, createChat } from './state.js';
import { cacheDOMElements, toggleAppTheme, switchView, autoExpandTextarea, handleSendMessage, handleFileUpload, removeAttachment, renderSidebarChats } from './ui.js';
import { toggleListening } from './audio.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Inicializar almacenamiento y estado
  initStore();

  // 2. Capturar elementos DOM
  cacheDOMElements();

  // 3. Vincular eventos de la UI
  bindEvents();

  // 4. Si hay conversaciones preexistentes, cargar vista de chat o bien bienvenida
  if (state.activeChatId) {
    switchView('chat');
  } else {
    switchView('home');
  }

  // 5. Inicializar contador de racha en la interfaz
  const streakElem = document.getElementById('streakCount');
  if (streakElem && state.streak) {
    streakElem.textContent = state.streak.count || 3;
  }
});

function bindEvents() {
  // --- Toggle Tema (Modo Claro / Oscuro) ---
  const btnThemeToggle = document.getElementById('btnThemeToggle');
  if (btnThemeToggle) {
    btnThemeToggle.addEventListener('click', () => {
      toggleAppTheme();
    });
  }

  // --- Sidebar Mobile & Collapse Toggle ---
  const btnToggleSidebar = document.getElementById('btnToggleSidebar');
  const btnMobileSidebar = document.getElementById('btnMobileSidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  const sidebar = document.getElementById('sidebar');

  if (btnToggleSidebar && sidebar) {
    btnToggleSidebar.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
    });
  }

  if (btnMobileSidebar && sidebar && sidebarOverlay) {
    btnMobileSidebar.addEventListener('click', () => {
      sidebar.classList.add('mobile-open');
      sidebarOverlay.classList.add('active');
    });

    sidebarOverlay.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      sidebarOverlay.classList.remove('active');
    });
  }

  // --- Botón Nueva Conversación ---
  const btnNewChat = document.getElementById('btnNewChat');
  if (btnNewChat) {
    btnNewChat.addEventListener('click', () => {
      createChat();
      switchView('home');
      const dockTextarea = document.getElementById('dockTextarea');
      if (dockTextarea) dockTextarea.focus();
    });
  }

  // --- Buscador de Chats ---
  const searchChatsInput = document.getElementById('searchChatsInput');
  if (searchChatsInput) {
    searchChatsInput.addEventListener('input', (e) => {
      renderSidebarChats(e.target.value);
    });
  }

  // --- Quick Prompt Cards en Hero (Envían pregunta directamente al dock y ejecutan) ---
  const promptCards = document.querySelectorAll('.hero-prompt-card');
  promptCards.forEach(card => {
    card.addEventListener('click', () => {
      const text = card.getAttribute('data-prompt');
      if (text) {
        handleSendMessage(text);
      }
    });
  });

  // --- Floating Chat Dock Textarea (UNICO CHAT INPUT) ---
  const dockTextarea = document.getElementById('dockTextarea');
  const btnSendDock = document.getElementById('btnSendDock');

  if (dockTextarea) {
    dockTextarea.addEventListener('input', () => {
      autoExpandTextarea(dockTextarea);
    });

    dockTextarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = dockTextarea.value.trim();
        if (text || state.attachedFile) {
          dockTextarea.value = '';
          dockTextarea.style.height = 'auto';
          handleSendMessage(text);
        }
      }
    });
  }

  if (btnSendDock) {
    btnSendDock.addEventListener('click', () => {
      if (dockTextarea) {
        const text = dockTextarea.value.trim();
        if (text || state.attachedFile) {
          dockTextarea.value = '';
          dockTextarea.style.height = 'auto';
          handleSendMessage(text);
        }
      }
    });
  }

  // --- Adjuntar Archivo con Trigger del Input Oculto ---
  const btnAttach = document.getElementById('btnAttach');
  const fileInput = document.getElementById('fileInput');

  if (btnAttach && fileInput) {
    btnAttach.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileUpload(e.target.files[0]);
      }
    });
  }

  const btnRemoveFile = document.getElementById('btnRemoveFile');
  if (btnRemoveFile) {
    btnRemoveFile.addEventListener('click', () => {
      removeAttachment();
    });
  }

  // --- Botón de Reconocimiento de Voz ---
  const btnVoice = document.getElementById('btnVoice');
  if (btnVoice) {
    btnVoice.addEventListener('click', () => {
      toggleListening();
    });
  }

  // --- Navegación Topbar ---
  const topbarHomeTab = document.getElementById('topbarHomeTab');
  if (topbarHomeTab) {
    topbarHomeTab.addEventListener('click', () => {
      switchView('home');
    });
  }
}
