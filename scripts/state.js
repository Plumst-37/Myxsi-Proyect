/* =========================================================
   MYXSI AI - STATE MANAGEMENT SYSTEM
   ========================================================= */

const LOCAL_STORAGE_CHATS = 'myxsi_chats_v2';
const LOCAL_STORAGE_STREAK = 'myxsi_streak_data';
const LOCAL_STORAGE_THEME = 'myxsi_theme_preference';

export const state = {
  chats: [],
  activeChatId: null,
  activeView: 'home', // 'home' | 'chat'
  streak: {
    count: 3,
    lastDate: new Date().toISOString().split('T')[0]
  },
  theme: 'dark',
  attachedFile: null,
  isRecording: false,
  isGenerating: false
};

// Cargar estado persistido
export function initStore() {
  // 1. Cargar tema
  const savedTheme = localStorage.getItem(LOCAL_STORAGE_THEME);
  if (savedTheme) {
    state.theme = savedTheme;
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    state.theme = 'light';
  } else {
    state.theme = 'dark';
  }
  document.documentElement.setAttribute('data-theme', state.theme);
  
  // 2. Cargar chats
  try {
    const savedChats = localStorage.getItem(LOCAL_STORAGE_CHATS);
    if (savedChats) {
      state.chats = JSON.parse(savedChats);
    }
  } catch (e) {
    console.warn("Error cargando historial de chats:", e);
    state.chats = [];
  }

  // Si no hay chats, sembrar historial por defecto
  if (!state.chats || state.chats.length === 0) {
    state.chats = [
      {
        id: 'chat_demo_1',
        title: 'Explicación del Teorema de Pitágoras',
        createdAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
        updatedAt: new Date(Date.now() - 3600 * 1000 * 2).toISOString(),
        favorite: true,
        history: [
          { role: 'user', content: 'Explicame el teorema de Pitágoras con ejemplos sencillos para examen' },
          { role: 'assistant', content: '¡Hola! El **Teorema de Pitágoras** establece que en cualquier triángulo rectángulo:\n\n\\[ a^2 + b^2 = c^2 \\]\n\nDonde **a** y **b** son los catetos y **c** es la hipotenusa. ¿Quieres hacer un problema de práctica?' }
        ]
      },
      {
        id: 'chat_demo_2',
        title: 'Resumen Revolución Industrial',
        createdAt: new Date(Date.now() - 3600 * 1000 * 26).toISOString(),
        updatedAt: new Date(Date.now() - 3600 * 1000 * 26).toISOString(),
        favorite: false,
        history: [
          { role: 'user', content: 'Resume los puntos clave de la Revolución Industrial para un mapa mental' },
          { role: 'assistant', content: 'Aquí tienes los 4 pilares clave de la Revolución Industrial:\n1. **Invención de la máquina de vapor** (James Watt).\n2. **Paso del trabajo artesanal a fábricas**.\n3. **Crecimiento de las ciudades (Urbanización)**.\n4. **Desarrollo del ferrocarril**.' }
        ]
      }
    ];
    saveChatsToStorage();
  }

  // 3. Cargar racha
  try {
    const savedStreak = localStorage.getItem(LOCAL_STORAGE_STREAK);
    if (savedStreak) {
      state.streak = JSON.parse(savedStreak);
      checkDailyStreak();
    }
  } catch (e) {
    console.warn("Error cargando racha:", e);
  }
}

// Persistir chats en localStorage
export function saveChatsToStorage() {
  try {
    localStorage.setItem(LOCAL_STORAGE_CHATS, JSON.stringify(state.chats));
  } catch (e) {
    console.error("Error guardando chats:", e);
  }
}

// Persistir tema
export function setTheme(themeName) {
  state.theme = themeName;
  localStorage.setItem(LOCAL_STORAGE_THEME, themeName);
  document.documentElement.setAttribute('data-theme', themeName);
}

// Gestión de racha diaria
export function checkDailyStreak() {
  const today = new Date().toISOString().split('T')[0];
  if (!state.streak.lastDate) {
    state.streak.count = 1;
    state.streak.lastDate = today;
  } else if (state.streak.lastDate !== today) {
    const last = new Date(state.streak.lastDate);
    const now = new Date(today);
    const diffDays = Math.round((now - last) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      state.streak.count += 1;
      state.streak.lastDate = today;
    } else if (diffDays > 1) {
      state.streak.count = 1;
      state.streak.lastDate = today;
    }
  }
  localStorage.setItem(LOCAL_STORAGE_STREAK, JSON.stringify(state.streak));
}

// Crear nueva conversación
export function createChat(title = 'Nueva conversación') {
  const newChat = {
    id: 'chat_' + Date.now(),
    title: title,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    favorite: false,
    history: []
  };
  state.chats.unshift(newChat);
  state.activeChatId = newChat.id;
  saveChatsToStorage();
  return newChat;
}

// Renombrar conversación
export function renameChat(chatId, newTitle) {
  const chat = state.chats.find(c => c.id === chatId);
  if (chat) {
    chat.title = newTitle.substring(0, 45);
    chat.updatedAt = new Date().toISOString();
    saveChatsToStorage();
  }
}

// Alternar favorito
export function toggleFavoriteChat(chatId) {
  const chat = state.chats.find(c => c.id === chatId);
  if (chat) {
    chat.favorite = !chat.favorite;
    saveChatsToStorage();
  }
}

// Eliminar conversación
export function deleteChat(chatId) {
  state.chats = state.chats.filter(c => c.id !== chatId);
  if (state.activeChatId === chatId) {
    state.activeChatId = state.chats.length > 0 ? state.chats[0].id : null;
  }
  saveChatsToStorage();
}

// Obtener chat activo
export function getActiveChat() {
  if (!state.activeChatId) return null;
  return state.chats.find(c => c.id === state.activeChatId) || null;
}
