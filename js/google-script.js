// ============================================
// MYXSI - GOOGLE APPS SCRIPT BACKEND COMPLETO
// Guarda chats en Google Drive por usuario
// ============================================

// ID DE LA CARPETA DONDE SE GUARDARÁN LOS ARCHIVOS
const FOLDER_ID = '1EvEtjKDGjpzr0rpS0kYqJ0NPmeZWLjpE';

// ============================================
// FUNCIÓN PARA CREAR RESPUESTA
// ============================================
function createCorsResponse(data) {
  const response = ContentService.createTextOutput(JSON.stringify(data));
  response.setMimeType(ContentService.MimeType.JSON);
  return response;
}

// ============================================
// MANEJO DE PETICIONES GET
// ============================================
function doGet(e) {
  return createCorsResponse({
    status: 'OK',
    message: 'Myxsi API funcionando correctamente',
    timestamp: new Date().toISOString()
  });
}

// ============================================
// MANEJO DE PETICIONES OPTIONS (CORS Preflight)
// ============================================
function doOptions(e) {
  const response = ContentService.createTextOutput('');
  response.setMimeType(ContentService.MimeType.TEXT);
  return response;
}

// ============================================
// MANEJO DE PETICIONES POST
// ============================================
function doPost(e) {
  try {
    const respond = (success, data = null, error = null) => {
      const result = { success: success };
      if (data !== null) result.data = data;
      if (error !== null) result.error = error;
      return createCorsResponse(result);
    };
    
    // Parsear los datos
    let params;
    if (e && e.postData && e.postData.contents) {
      params = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      params = e.parameter;
    } else {
      return respond(false, null, 'No se recibieron datos');
    }
    
    const action = params.action;
    const uid = params.uid;
    
    Logger.log(`📡 Acción: ${action}, UID: ${uid}`);
    
    if (!uid && action !== 'test') {
      return respond(false, null, 'UID requerido');
    }
    
    // Obtener la carpeta
    let folder;
    try {
      folder = DriveApp.getFolderById(FOLDER_ID);
    } catch(e) {
      return respond(false, null, 'Carpeta no encontrada: ' + FOLDER_ID);
    }
    
    const fileName = `user_${uid}.json`;
    const files = folder.getFilesByName(fileName);
    
    // ========== CREAR USUARIO ==========
    if (action === 'createUser') {
      Logger.log(`📝 createUser llamado para UID: ${uid}`);
      
      try {
        if (files.hasNext()) {
          const file = files.next();
          const data = JSON.parse(file.getBlob().getDataAsString());
          data.lastAccess = Date.now();
          if (params.email && !data.email) data.email = params.email;
          if (params.name && !data.name) data.name = params.name;
          file.setContent(JSON.stringify(data));
          Logger.log(`✅ Usuario actualizado: ${uid}`);
          return respond(true, { exists: true, userData: data });
        } else {
          const newUserData = {
            uid: uid,
            email: params.email || '',
            name: params.name || 'Usuario',
            createdAt: Date.now(),
            lastAccess: Date.now(),
            chats: []
          };
          folder.createFile(fileName, JSON.stringify(newUserData), 'application/json');
          Logger.log(`✅ Usuario CREADO: ${uid} - Archivo: ${fileName}`);
          return respond(true, { exists: false, userData: newUserData });
        }
      } catch (error) {
        Logger.log(`❌ Error en createUser: ${error}`);
        return respond(false, null, `Error al crear usuario: ${error}`);
      }
    }
    
    // ========== CREAR CHAT ==========
    if (action === 'createChat') {
      if (!files.hasNext()) {
        return respond(false, null, 'Usuario no encontrado');
      }
      
      const file = files.next();
      const data = JSON.parse(file.getBlob().getDataAsString());
      if (!data.chats) data.chats = [];
      
      const chatId = 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
      const newChat = {
        chatId: chatId,
        title: params.title || 'Nueva conversación',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: []
      };
      
      data.chats.push(newChat);
      file.setContent(JSON.stringify(data));
      
      return respond(true, { chat: newChat });
    }
    
    // ========== GUARDAR MENSAJE ==========
    if (action === 'saveMessage') {
      if (!files.hasNext()) {
        return respond(false, null, 'Usuario no encontrado');
      }
      
      const file = files.next();
      const data = JSON.parse(file.getBlob().getDataAsString());
      if (!data.chats) data.chats = [];
      const chatId = params.chatId;
      const message = params.message;
      
      let chatFound = false;
      for (let i = 0; i < data.chats.length; i++) {
        if (data.chats[i].chatId === chatId) {
          const newMessage = {
            id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            role: message.role,
            content: message.content,
            timestamp: message.timestamp || Date.now()
          };
          data.chats[i].messages.push(newMessage);
          data.chats[i].updatedAt = Date.now();
          
          // Cambiar el título automáticamente si el chat tenía un nombre genérico o estaba vacío
          const currentTitle = data.chats[i].title;
          if ((currentTitle === 'Nuevo chat' || currentTitle === 'Nueva conversación' || !currentTitle) && 
              message.role === 'user' && 
              data.chats[i].messages.filter(m => m.role === 'user').length === 1) {
            let newTitle = message.content.substring(0, 40);
            if (newTitle.length < message.content.length) newTitle += '...';
            data.chats[i].title = newTitle;
          }
          
          file.setContent(JSON.stringify(data));
          chatFound = true;
          break;
        }
      }
      
      if (!chatFound) {
        return respond(false, null, 'Chat no encontrado');
      }
      
      return respond(true);
    }
    
    // ========== OBTENER CHATS ==========
    if (action === 'getChats') {
      if (!files.hasNext()) {
        return respond(true, { chats: [] });
      }
      
      const file = files.next();
      const data = JSON.parse(file.getBlob().getDataAsString());
      if (!data.chats) data.chats = [];
      
      const chats = data.chats.map(chat => ({
        chatId: chat.chatId,
        title: chat.title,
        updatedAt: chat.updatedAt,
        createdAt: chat.createdAt,
        messageCount: chat.messages.length,
        lastMessage: chat.messages.length > 0 ? chat.messages[chat.messages.length - 1].content.substring(0, 50) : null
      }));
      
      chats.sort((a, b) => b.updatedAt - a.updatedAt);
      
      return respond(true, { chats: chats });
    }
    
    // ========== OBTENER MENSAJES DE UN CHAT ==========
    if (action === 'getMessages') {
      if (!files.hasNext()) {
        return respond(false, null, 'Usuario no encontrado');
      }
      
      const file = files.next();
      const data = JSON.parse(file.getBlob().getDataAsString());
      if (!data.chats) data.chats = [];
      const chatId = params.chatId;
      
      for (let i = 0; i < data.chats.length; i++) {
        if (data.chats[i].chatId === chatId) {
          return respond(true, { chat: data.chats[i] });
        }
      }
      
      return respond(false, null, 'Chat no encontrado');
    }
    
    // ========== ELIMINAR CHAT ==========
    if (action === 'deleteChat') {
      if (!files.hasNext()) {
        return respond(false, null, 'Usuario no encontrado');
      }
      
      const file = files.next();
      const data = JSON.parse(file.getBlob().getDataAsString());
      if (!data.chats) data.chats = [];
      const chatId = params.chatId;
      
      data.chats = data.chats.filter(chat => chat.chatId !== chatId);
      file.setContent(JSON.stringify(data));
      
      return respond(true);
    }
    
    // ========== ELIMINAR TODOS LOS CHATS ==========
    if (action === 'clearAllChats') {
      if (!files.hasNext()) {
        return respond(true, { chatsCleared: 0 });
      }
      
      const file = files.next();
      const data = JSON.parse(file.getBlob().getDataAsString());
      if (!data.chats) data.chats = [];
      const deletedCount = data.chats.length;
      data.chats = [];
      file.setContent(JSON.stringify(data));
      
      return respond(true, { chatsCleared: deletedCount });
    }
    
    return respond(false, null, 'Acción no válida: ' + action);
    
  } catch(error) {
    Logger.log('❌ Error en doPost:', error);
    return createCorsResponse({
      success: false,
      error: error.toString()
    });
  }
}

// ============================================
// FUNCIÓN DE PRUEBA
// ============================================
function testAPI() {
  Logger.log('=== TESTEANDO API MYXSI ===');
  Logger.log('Folder ID:', FOLDER_ID);
  
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    Logger.log('✅ Carpeta encontrada:', folder.getName());
    Logger.log('URL de la carpeta:', folder.getUrl());
  } catch(e) {
    Logger.log('❌ Error: Carpeta no encontrada. Verifica el FOLDER_ID');
    Logger.log(e.toString());
  }
  
  Logger.log('=== TEST COMPLETADO ===');
}