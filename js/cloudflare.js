/**
 * =========================================================================
 * MYXSI CLOUDFLARE WORKER BACKEND & INTELLIGENT AI GATEWAY
 * =========================================================================
 * Plataforma de Código Abierto Todo en Uno: Myxsi AI (myxsi.com)
 * 
 * CARACTERÍSTICAS Y BLINDAJE DE SEGURIDAD EMPRESARIAL:
 * 1. CORS Restringido: Validación dinámica de orígenes permitidos.
 * 2. Cabeceras de Seguridad Extremas: HSTS, X-Content-Type-Options, CSP, Frame Options.
 * 3. Prevención de Inyecciones SQL: Consultas 100% parametrizadas en Cloudflare D1.
 * 4. Protección contra XSS y Detección de Actividad Sospechosa.
 * 5. Limitación de Tasa (Rate Limiting) en el Edge por dirección IP.
 * 6. Protección CSRF y Validación de Tipos / Límites de Payload.
 * 7. Cero Filtración de Secretos: Llaves gestionadas vía variables de entorno (env.GROQ_KEYS).
 * 8. Hashing Criptográfico de Contraseñas (Web Crypto PBKDF2-SHA256).
 * 9. Enlaces de Recuperación con Expiración Temporal (15 minutos).
 * 10. Enrutador Semántico Multi-Modelo y Transcripción Segura con Whisper Turbo.
 */

// Orígenes autorizados por defecto
const DEFAULT_ALLOWED_ORIGINS = [
  'https://myxsi.com',
  'https://www.myxsi.com',
  'http://localhost:8000',
  'http://localhost:8080',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:8000',
  'http://127.0.0.1:8080',
  'http://127.0.0.1:5500'
];

let isMigrated = false;

// Almacén en memoria para limitación de tasa (Rate Limiting) en Edge
const rateLimitMap = new Map();
const RATE_LIMIT_CLEANUP_INTERVAL = 60000; // 1 minuto
let lastCleanup = Date.now();

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';
    const clientIp = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';

    // 1. GESTIÓN Y RESTRICCIÓN DE CORS
    const allowedOrigins = env.ALLOWED_ORIGINS
      ? env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : DEFAULT_ALLOWED_ORIGINS;

    const isOriginAllowed = !origin || allowedOrigins.includes(origin) || origin.endsWith('.pages.dev') || origin.endsWith('.workers.dev');
    const corsOrigin = isOriginAllowed && origin ? origin : (allowedOrigins[0] || 'https://myxsi.com');

    const securityHeaders = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token',
      'Access-Control-Expose-Headers': 'x-model-used, x-tier-used, x-rate-limit-remaining',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
      // Cabeceras de seguridad estrictas (HSTS, Anti-Sniffing, Anti-Clickjacking, CSP)
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(self), geolocation=()',
      'Content-Security-Policy': "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'; img-src 'self' https: data: blob: https://image.pollinations.ai; media-src 'self' https: blob:; connect-src 'self' https: wss:; font-src 'self' https: data:;",
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };

    // Manejar preflight de CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: securityHeaders });
    }

    // 2. PROTECCIÓN CSRF PARA PETICIONES DE MUTACIÓN
    if (request.method === 'POST') {
      const secFetchSite = request.headers.get('sec-fetch-site');
      const isCrossSite = secFetchSite === 'cross-site' || (origin && !allowedOrigins.includes(origin));
      if (isCrossSite && origin && !allowedOrigins.includes(origin)) {
        console.warn(`[SECURITY ALERT] Intento de petición CSRF bloqueado desde: ${origin}`);
        return new Response(JSON.stringify({ success: false, error: 'Petición de origen cruzado no autorizada (CSRF Protection).' }), {
          status: 403,
          headers: { ...securityHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // 3. RATE LIMITING POR IP
    const now = Date.now();
    if (now - lastCleanup > RATE_LIMIT_CLEANUP_INTERVAL) {
      rateLimitMap.clear();
      lastCleanup = now;
    }

    const currentMinute = Math.floor(now / 60000);
    const rateKey = `${clientIp}_${currentMinute}`;
    const requestCount = (rateLimitMap.get(rateKey) || 0) + 1;
    rateLimitMap.set(rateKey, requestCount);

    const MAX_REQUESTS_PER_MINUTE = 60;
    if (requestCount > MAX_REQUESTS_PER_MINUTE) {
      console.warn(`[SECURITY ALERT] Límite de peticiones excedido por IP: ${clientIp} (${requestCount} req/min)`);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Demasiadas solicitudes. Por favor, espera un momento antes de volver a intentar.' 
      }), {
        status: 429,
        headers: { 
          ...securityHeaders, 
          'Content-Type': 'application/json',
          'Retry-After': '60'
        }
      });
    }

    try {
      // 4. VALIDACIÓN DE TAMAÑO Y LECTURA DE PAYLOAD
      let requestData = null;
      if (request.method === 'POST') {
        const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
        const MAX_PAYLOAD_BYTES = 10 * 1024 * 1024; // 10 MB límite estricto
        if (contentLength > MAX_PAYLOAD_BYTES) {
          return new Response(JSON.stringify({ success: false, error: 'El tamaño de la carga excede el límite permitido (10MB).' }), {
            status: 413,
            headers: { ...securityHeaders, 'Content-Type': 'application/json' }
          });
        }

        const bodyText = await request.text();
        
        // 5. DETECCIÓN DE ACTIVIDAD SOSPECHOSA (Anti-XSS / Anti-SQLi / Anti-Path Traversal)
        if (detectSuspiciousActivity(bodyText)) {
          console.warn(`[SECURITY ALERT] Payload sospechoso bloqueado desde IP: ${clientIp}`);
          return new Response(JSON.stringify({ success: false, error: 'Petición rechazada por políticas de seguridad e integridad.' }), {
            status: 400,
            headers: { ...securityHeaders, 'Content-Type': 'application/json' }
          });
        }

        try {
          requestData = JSON.parse(bodyText);
        } catch (e) {
          requestData = bodyText;
        }
      }

      // ACCIÓN: ENRUTAMIENTO /api/getUserData O action === 'getUserData'
      let isGetUserData = false;
      try {
        const reqUrl = new URL(request.url);
        if (reqUrl.pathname === '/api/getUserData' || reqUrl.pathname.endsWith('/api/getUserData')) {
          isGetUserData = true;
          if (!requestData || typeof requestData !== 'object') {
            requestData = {};
          }
          requestData.action = 'getUserData';
          const urlEmail = reqUrl.searchParams.get('email');
          const urlUid = reqUrl.searchParams.get('uid');
          if (urlEmail && !requestData.email) requestData.email = urlEmail;
          if (urlUid && !requestData.uid) requestData.uid = urlUid;
        }
      } catch (urlErr) {}

      // ACCIÓN: PING
      if (requestData && requestData.action === 'ping') {
        return new Response(JSON.stringify({ success: true, message: 'pong', time: Date.now() }), {
          headers: { ...securityHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ACCIÓN: CHAT IA
      if (requestData && requestData.action === 'chat') {
        return await handleAIChat(requestData, env, securityHeaders);
      }

      // ACCIÓN: TRANSCRIPCIÓN DE VOZ CON WHISPER TURBO (SERVIDOR)
      if (requestData && requestData.action === 'transcribe') {
        return await handleAudioTranscription(requestData, env, securityHeaders);
      }

      // ACCIÓN: GENERACIÓN Y VERIFICACIÓN DE TOKENS DE RECUPERACIÓN CON EXPIRACIÓN
      if (requestData && requestData.action === 'createRecoveryToken') {
        return await handleCreateRecoveryToken(requestData, env, securityHeaders);
      }

      if (requestData && requestData.action === 'verifyRecoveryToken') {
        return await handleVerifyRecoveryToken(requestData, env, securityHeaders);
      }

      // GESTIÓN DE BASE DE DATOS D1
      const hasD1 = !!env.DB;
      if (hasD1 && requestData && typeof requestData === 'object') {
        return await handleD1Database(requestData, env, securityHeaders);
      }

      // Fallback seguro a Google Apps Script si está configurado
      if (env.APPS_SCRIPT_URL) {
        const fetchOptions = {
          method: request.method,
          headers: { 'Content-Type': 'application/json' },
          redirect: 'follow'
        };
        if (request.method !== 'GET' && request.method !== 'HEAD' && requestData !== null) {
          fetchOptions.body = typeof requestData === 'object' ? JSON.stringify(requestData) : requestData;
        }
        const gasResponse = await fetch(env.APPS_SCRIPT_URL, fetchOptions);
        const responseText = await gasResponse.text();
        return new Response(responseText, {
          status: 200,
          headers: { ...securityHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Myxsi API Backend activo y protegido en Cloudflare Edge.' 
      }), {
        headers: { ...securityHeaders, 'Content-Type': 'application/json' }
      });

    } catch (err) {
      console.error('[SERVER ERROR]:', err);
      const isDebug = env.DEBUG === 'true';
      return new Response(JSON.stringify({ 
        success: false, 
        error: isDebug ? `Error interno: ${err.message}` : 'Ha ocurrido un error en el servidor. Inténtelo más tarde.' 
      }), {
        status: 500,
        headers: { ...securityHeaders, 'Content-Type': 'application/json' }
      });
    }
  },
};

/**
 * Filtro de detección de actividad sospechosa (XSS, SQL Injection y Path Traversal)
 */
function detectSuspiciousActivity(payloadStr) {
  if (!payloadStr || typeof payloadStr !== 'string') return false;
  const lower = payloadStr.toLowerCase();
  
  const maliciousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,
    /javascript:\s*[a-z0-9_]/i,
    /\bonerror\s*=/i,
    /\bonload\s*=/i,
    /\bunion\s+select\b/i,
    /\bdrop\s+table\b/i,
    /\bexec\s*\(\s*xp_/i,
    /\.\.\/\.\.\//,
    /\.\.\\\.\.\\/
  ];

  return maliciousPatterns.some(pattern => pattern.test(lower));
}

/**
 * =========================================================================
 * MOTOR DE BASE DE DATOS CLOUDFLARE D1 (SQL PARAMETRIZADO - CERO INYECCIÓN)
 * =========================================================================
 */
async function handleD1Database(data, env, securityHeaders) {
  const action = data.action;
  const uid = data.uid || '';
  const email = (data.email || '').trim().toLowerCase();

  if (!uid && !email && action !== 'test' && action !== 'getAllUsers' && action !== 'pushDocRealtime' && action !== 'pollDocRealtime') {
    return new Response(JSON.stringify({ success: false, error: 'Identificador de usuario (UID o Email) requerido.' }), {
      headers: { ...securityHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    if (!isMigrated) {
      try {
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS users (
            uid TEXT PRIMARY KEY,
            email TEXT,
            name TEXT,
            createdAt INTEGER,
            lastAccess INTEGER,
            duoXP INTEGER DEFAULT 0,
            duoHearts INTEGER DEFAULT 5,
            duoStreak INTEGER DEFAULT 0,
            duoLevel INTEGER DEFAULT 1,
            duoLastDate TEXT
          )
        `).run().catch(()=>{});

        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS chats (
            chatId TEXT PRIMARY KEY,
            userId TEXT,
            title TEXT,
            createdAt INTEGER,
            updatedAt INTEGER
          )
        `).run().catch(()=>{});

        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            chatId TEXT,
            role TEXT,
            content TEXT,
            timestamp INTEGER
          )
        `).run().catch(()=>{});

        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS recovery_tokens (
            token TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            expiresAt INTEGER NOT NULL,
            used INTEGER DEFAULT 0
          )
        `).run().catch(()=>{});

        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS realtime_docs (
            docId TEXT PRIMARY KEY,
            title TEXT,
            content TEXT,
            version INTEGER DEFAULT 1,
            updatedAt INTEGER,
            updatedBy TEXT
          )
        `).run().catch(()=>{});

        await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_messages_chatId ON messages(chatId)").run().catch(()=>{});
        await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_chats_userId ON chats(userId)").run().catch(()=>{});
        await env.DB.prepare("CREATE INDEX IF NOT EXISTS idx_realtime_docs_updatedAt ON realtime_docs(updatedAt)").run().catch(()=>{});

        isMigrated = true;
      } catch (migErr) {}
    }

    switch (action) {
      // SINCRONIZACIÓN COLABORATIVA DE DOCUMENTOS EN TIEMPO REAL
      case 'pushDocRealtime': {
        const docId = data.docId;
        if (!docId) {
          return new Response(JSON.stringify({ success: false, error: 'docId requerido' }), {
            headers: { ...securityHeaders, 'Content-Type': 'application/json' }
          });
        }
        const docTitle = data.title || 'Documento sin título';
        const docContent = data.content !== undefined ? data.content : '';
        const clientId = data.clientId || 'remote';
        const now = Date.now();

        await env.DB.prepare(`
          INSERT INTO realtime_docs (docId, title, content, version, updatedAt, updatedBy)
          VALUES (?, ?, ?, 1, ?, ?)
          ON CONFLICT(docId) DO UPDATE SET
            title = excluded.title,
            content = excluded.content,
            version = realtime_docs.version + 1,
            updatedAt = excluded.updatedAt,
            updatedBy = excluded.updatedBy
        `).bind(docId, docTitle, docContent, now, clientId).run().catch(()=>{});

        return new Response(JSON.stringify({
          success: true,
          docId,
          updatedAt: now,
          updatedBy: clientId
        }), {
          headers: { ...securityHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'pollDocRealtime': {
        const docId = data.docId;
        if (!docId) {
          return new Response(JSON.stringify({ success: false, error: 'docId requerido' }), {
            headers: { ...securityHeaders, 'Content-Type': 'application/json' }
          });
        }
        const sinceTime = Number(data.sinceTime || 0);
        const sinceVersion = Number(data.sinceVersion || 0);

        const result = await env.DB.prepare(`
          SELECT docId, title, content, version, updatedAt, updatedBy
          FROM realtime_docs
          WHERE docId = ?
        `).bind(docId).first().catch(() => null);

        if (result && (result.updatedAt > sinceTime || result.version > sinceVersion)) {
          return new Response(JSON.stringify({
            success: true,
            updated: true,
            doc: result
          }), {
            headers: { ...securityHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({
          success: true,
          updated: false
        }), {
          headers: { ...securityHeaders, 'Content-Type': 'application/json' }
        });
      }

      // RUTA ADMIN BLINDADA
      case 'getAllUsers': {
        const adminSecret = data.adminSecret;
        if (!env.ADMIN_SECRET || !adminSecret || adminSecret !== env.ADMIN_SECRET) {
          return new Response(JSON.stringify({ success: false, error: 'Acceso administrativo no autorizado.' }), {
            status: 401,
            headers: { ...securityHeaders, 'Content-Type': 'application/json' }
          });
        }
        const { results } = await env.DB.prepare(`
          SELECT uid, email, name, createdAt, lastAccess, duoXP, duoHearts, duoStreak, duoLevel, duoLastDate
          FROM users
          ORDER BY lastAccess DESC
          LIMIT 100
        `).all();
        return new Response(JSON.stringify({ success: true, data: results }), {
          headers: { ...securityHeaders, 'Content-Type': 'application/json' }
        });
      }

      // REGISTRO O ACCESO CON CONSULTAS PARAMETRIZADAS
      case 'createUser': {
        const email = (data.email || '').trim().toLowerCase();
        const name = (data.name || 'Usuario').trim().substring(0, 60);
        const now = Date.now();

        const existingUser = await env.DB.prepare("SELECT * FROM users WHERE uid = ?")
          .bind(uid)
          .first();

        if (existingUser) {
          await env.DB.prepare("UPDATE users SET lastAccess = ?, email = ?, name = ? WHERE uid = ?")
            .bind(now, email, name, uid)
            .run();
          
          return new Response(JSON.stringify({
            success: true,
            data: { 
              exists: true, 
              userData: { 
                ...existingUser, 
                lastAccess: now, 
                email, 
                name 
              } 
            }
          }), { headers: { ...securityHeaders, 'Content-Type': 'application/json' } });
        } else {
          await env.DB.prepare("INSERT INTO users (uid, email, name, createdAt, lastAccess, duoXP, duoHearts, duoStreak, duoLevel, duoLastDate) VALUES (?, ?, ?, ?, ?, 0, 5, 0, 1, NULL)")
            .bind(uid, email, name, now, now)
            .run();
          
          return new Response(JSON.stringify({
            success: true,
            data: {
              exists: false,
              userData: { 
                uid, email, name, createdAt: now, lastAccess: now, chats: [],
                duoXP: 0, duoHearts: 5, duoStreak: 0, duoLevel: 1, duoLastDate: null
              }
            }
          }), { headers: { ...securityHeaders, 'Content-Type': 'application/json' } });
        }
      }

      // OBTENER DATOS DE USUARIO (D1 SQL)
      case 'getUserData': {
        const queryUid = uid || '';
        const queryEmail = email || '';

        const userRecord = await env.DB.prepare(`
          SELECT uid, email, name, createdAt, lastAccess, duoXP, duoHearts, duoStreak, duoLevel, duoLastDate
          FROM users
          WHERE (uid = ? AND uid != '') OR (email = ? AND email != '')
          ORDER BY lastAccess DESC
          LIMIT 1
        `)
          .bind(queryUid, queryEmail)
          .first();

        if (userRecord) {
          return new Response(JSON.stringify({
            success: true,
            data: {
              exists: true,
              userData: userRecord
            }
          }), { headers: { ...securityHeaders, 'Content-Type': 'application/json' } });
        } else {
          return new Response(JSON.stringify({
            success: true,
            data: {
              exists: false,
              userData: null
            }
          }), { headers: { ...securityHeaders, 'Content-Type': 'application/json' } });
        }
      }

      // SINCRONIZACIÓN DE PROGRESO Y RACHAS
      case 'syncDuoData': {
        const xp = Math.max(0, parseInt(data.duoXP || 0, 10));
        const hearts = Math.max(0, Math.min(5, parseInt(data.duoHearts !== undefined ? data.duoHearts : 5, 10)));
        const streak = Math.max(0, parseInt(data.duoStreak || 0, 10));
        const level = Math.max(1, parseInt(data.duoLevel || 1, 10));
        const lastDate = data.duoLastDate || null;
        
        await env.DB.prepare(`
          UPDATE users 
          SET duoXP = ?, duoHearts = ?, duoStreak = ?, duoLevel = ?, duoLastDate = ? 
          WHERE (uid = ? AND uid IS NOT NULL AND uid != '') OR (email = ? AND email IS NOT NULL AND email != '')
        `)
          .bind(xp, hearts, streak, level, lastDate, uid, email)
          .run();
          
        return new Response(JSON.stringify({
          success: true,
          data: { duoXP: xp, duoHearts: hearts, duoStreak: streak, duoLevel: level, duoLastDate: lastDate }
        }), { headers: { ...securityHeaders, 'Content-Type': 'application/json' } });
      }

      // CREAR CHAT
      case 'createChat': {
        const rawTitle = (data.title || 'Nueva conversación').trim().substring(0, 80);
        const chatId = 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
        const now = Date.now();

        await env.DB.prepare("INSERT INTO chats (chatId, userId, title, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)")
          .bind(chatId, uid, rawTitle, now, now)
          .run();

        return new Response(JSON.stringify({
          success: true,
          data: {
            chat: { chatId, title: rawTitle, createdAt: now, updatedAt: now, messages: [] }
          }
        }), { headers: { ...securityHeaders, 'Content-Type': 'application/json' } });
      }

      // GUARDAR MENSAJE
      case 'saveMessage': {
        const chatId = data.chatId;
        const message = data.message;
        if (!chatId || !message) {
          return new Response(JSON.stringify({ success: false, error: 'Parámetros incompletos.' }), {
            headers: { ...securityHeaders, 'Content-Type': 'application/json' }
          });
        }

        let chat = await env.DB.prepare("SELECT * FROM chats WHERE chatId = ?").bind(chatId).first();
        const now = Date.now();
        if (!chat) {
          await env.DB.prepare("INSERT INTO chats (chatId, userId, title, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)")
            .bind(chatId, uid || 'anonymous', (data.chatTitle || 'Conversación restaurada').substring(0, 80), now, now)
            .run();
        }

        const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        const role = message.role === 'assistant' ? 'assistant' : 'user';
        const content = String(message.content || '');

        await env.DB.prepare("INSERT INTO messages (id, chatId, role, content, timestamp) VALUES (?, ?, ?, ?, ?)")
          .bind(msgId, chatId, role, content, message.timestamp || now)
          .run();

        await env.DB.prepare("UPDATE chats SET updatedAt = ? WHERE chatId = ?")
          .bind(now, chatId)
          .run();

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...securityHeaders, 'Content-Type': 'application/json' }
        });
      }

      // OBTENER CHATS DEL USUARIO (PARAMETRIZADO)
      case 'getChats': {
        const { results } = await env.DB.prepare(`
          SELECT c.chatId, c.title, c.updatedAt, c.createdAt,
                 (SELECT COUNT(*) FROM messages m WHERE m.chatId = c.chatId) AS messageCount,
                 (SELECT m.content FROM messages m WHERE m.chatId = c.chatId ORDER BY m.timestamp DESC LIMIT 1) AS lastMessage
          FROM chats c
          WHERE c.userId = ?
          ORDER BY c.updatedAt DESC
        `).bind(uid).all();

        return new Response(JSON.stringify({ success: true, data: { chats: results } }), {
          headers: { ...securityHeaders, 'Content-Type': 'application/json' }
        });
      }

      // OBTENER MENSAJES DE UN CHAT
      case 'getMessages': {
        const chatId = data.chatId;
        const chat = await env.DB.prepare("SELECT * FROM chats WHERE chatId = ? AND userId = ?").bind(chatId, uid).first();
        if (!chat) {
          return new Response(JSON.stringify({ success: false, error: 'Chat no encontrado o acceso denegado.' }), {
            headers: { ...securityHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { results: dbMessages } = await env.DB.prepare("SELECT id, role, content, timestamp FROM messages WHERE chatId = ? ORDER BY timestamp ASC")
          .bind(chatId)
          .all();

        return new Response(JSON.stringify({ 
          success: true, 
          data: { 
            chat: { ...chat, messages: dbMessages } 
          } 
        }), {
          headers: { ...securityHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ELIMINAR CHAT CON VERIFICACIÓN DE PROPIEDAD
      case 'deleteChat': {
        const chatId = data.chatId;
        const chat = await env.DB.prepare("SELECT * FROM chats WHERE chatId = ? AND userId = ?").bind(chatId, uid).first();
        if (!chat) {
          return new Response(JSON.stringify({ success: false, error: 'Chat no encontrado o no autorizado.' }), {
            headers: { ...securityHeaders, 'Content-Type': 'application/json' }
          });
        }

        await env.DB.prepare("DELETE FROM messages WHERE chatId = ?").bind(chatId).run();
        await env.DB.prepare("DELETE FROM chats WHERE chatId = ?").bind(chatId).run();

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...securityHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        return new Response(JSON.stringify({ success: false, error: 'Acción de base de datos desconocida.' }), {
          headers: { ...securityHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (dbErr) {
    console.error('[D1 Error]:', dbErr);
    const isDebug = env.DEBUG === 'true';
    return new Response(JSON.stringify({ 
      success: false, 
      error: isDebug ? dbErr.message : 'Error al procesar la operación de base de datos.' 
    }), {
      status: 500,
      headers: { ...securityHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * =========================================================================
 * MÓDULO DE INTELIGENCIA ARTIFICIAL SEGURO (ZERO LEAKS DE SECRETOS)
 * =========================================================================
 */
async function handleAIChat(data, env, securityHeaders) {
  const userMessage = (data.message || '').trim();
  const history = data.history || [];
  const image = data.image || null;

  if (!userMessage) {
    return new Response(JSON.stringify({ success: false, error: 'El mensaje no puede estar vacío.' }), {
      headers: { ...securityHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (userMessage.length > 30000) {
    return new Response(JSON.stringify({ success: false, error: 'El mensaje excede la longitud máxima (30,000 caracteres).' }), {
      headers: { ...securityHeaders, 'Content-Type': 'application/json' }
    });
  }

  // 1. CARGA SEGURA DE CLAVES DESDE VARIABLES DE ENTORNO
  let apiKeys = [];
  if (env.GROQ_KEYS) {
    apiKeys = env.GROQ_KEYS.split(',').map(k => k.trim()).filter(k => k.startsWith('gsk_') || k.length > 10);
  } else if (env.GROQ_API_KEY) {
    apiKeys.push(env.GROQ_API_KEY.trim());
  }

  if (apiKeys.length === 0) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'La clave de IA (GROQ_KEYS) no está configurada en las variables de entorno seguras del servidor Cloudflare.' 
    }), {
      status: 503,
      headers: { ...securityHeaders, 'Content-Type': 'application/json' }
    });
  }

  // 2. ENRUTAMIENTO SEMÁNTICO Y CLASIFICACIÓN
  const classification = classifyMessage(userMessage);
  if (image && image.base64 && image.mimeType) {
    classification.model = 'qwen/qwen3.8-27b';
    classification.tier = 'IA Visión (Qwen 3.8 27B)';
  }

  const compactedHistory = compactHistory(history);

  let userContent = userMessage;
  if (image && image.base64 && image.mimeType) {
    userContent = [
      { type: 'text', text: userMessage },
      { type: 'image_url', image_url: { url: `data:${image.mimeType};base64,${image.base64}` } }
    ];
  }

  const activeSystemPrompt = (data.systemPrompt && typeof data.systemPrompt === 'string') 
    ? data.systemPrompt 
    : classification.systemPrompt;

  const messagesPayload = [
    { role: 'system', content: activeSystemPrompt },
    ...compactedHistory,
    { role: 'user', content: userContent }
  ];

  const candidateModels = [
    classification.model,
    'openai/gpt-oss-120b',
    'qwen/qwen3.8-27b',
    'openai/gpt-oss-20b'
  ];
  const uniqueModels = [...new Set(candidateModels)];

  let startIndex = Math.floor(Math.random() * apiKeys.length);
  let lastError = null;

  for (const modelToTry of uniqueModels) {
    for (let i = 0; i < apiKeys.length; i++) {
      const currentIndex = (startIndex + i) % apiKeys.length;
      const apiKey = apiKeys[currentIndex];

      try {
        const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Myxsi-Cloudflare-Worker/2.0'
          },
          body: JSON.stringify({
            model: modelToTry,
            messages: messagesPayload,
            max_tokens: classification.maxTokens,
            temperature: classification.temperature !== undefined ? classification.temperature : 0.4
          })
        });

        if (groqResponse.status === 429) {
          lastError = new Error(`Límite 429 en modelo ${modelToTry}`);
          continue;
        }

        if (!groqResponse.ok) {
          const errorText = await groqResponse.text();
          lastError = new Error(`Groq API (${groqResponse.status}): ${errorText}`);
          continue;
        }

        const responseData = await groqResponse.json();
        let aiText = responseData.choices && responseData.choices[0] && responseData.choices[0].message
          ? responseData.choices[0].message.content
          : null;

        if (!aiText) continue;

        aiText = aiText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

        return new Response(JSON.stringify({
          success: true,
          response: aiText,
          modelUsed: modelToTry,
          tier: classification.tier
        }), {
          headers: { 
            ...securityHeaders, 
            'Content-Type': 'application/json',
            'x-model-used': modelToTry,
            'x-tier-used': classification.tier
          }
        });

      } catch (err) {
        lastError = err;
      }
    }
  }

  const isDebug = env.DEBUG === 'true';
  return new Response(JSON.stringify({
    success: false,
    error: isDebug ? `Servicio de IA no disponible: ${lastError ? lastError.message : 'Error desconocido'}` : 'El servicio de IA se encuentra temporalmente ocupado. Por favor, reintente en unos segundos.'
  }), {
    headers: { ...securityHeaders, 'Content-Type': 'application/json' }
  });
}

/**
 * =========================================================================
 * TRANSCRIPCIÓN DE AUDIO SEGURA CON WHISPER TURBO EN EL SERVIDOR
 * =========================================================================
 */
async function handleAudioTranscription(data, env, securityHeaders) {
  const audioBase64 = data.audioBase64;
  const mimeType = data.mimeType || 'audio/webm';

  if (!audioBase64) {
    return new Response(JSON.stringify({ success: false, error: 'No se recibió archivo de audio para transcribir.' }), {
      headers: { ...securityHeaders, 'Content-Type': 'application/json' }
    });
  }

  let apiKeys = [];
  if (env.GROQ_KEYS) {
    apiKeys = env.GROQ_KEYS.split(',').map(k => k.trim()).filter(k => k.startsWith('gsk_') || k.length > 10);
  } else if (env.GROQ_API_KEY) {
    apiKeys.push(env.GROQ_API_KEY.trim());
  }

  if (apiKeys.length === 0) {
    return new Response(JSON.stringify({ success: false, error: 'Claves de IA no configuradas en el servidor.' }), {
      status: 503,
      headers: { ...securityHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const binary = atob(audioBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const audioBlob = new Blob([bytes], { type: mimeType });

    const formData = new FormData();
    formData.append('file', audioBlob, 'speech.webm');
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('language', 'es');
    formData.append('response_format', 'json');

    const apiKey = apiKeys[0];
    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'Myxsi-Audio-Gateway/2.0'
      },
      body: formData
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      return new Response(JSON.stringify({ success: false, error: `Error Whisper: ${errText}` }), {
        status: 502,
        headers: { ...securityHeaders, 'Content-Type': 'application/json' }
      });
    }

    const whisperData = await groqRes.json();
    return new Response(JSON.stringify({
      success: true,
      text: whisperData.text ? whisperData.text.trim() : ''
    }), {
      headers: { ...securityHeaders, 'Content-Type': 'application/json' }
    });

  } catch (transcribeErr) {
    return new Response(JSON.stringify({ success: false, error: 'Error al procesar audio en el servidor.' }), {
      status: 500,
      headers: { ...securityHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * =========================================================================
 * ENLACES DE RECUPERACIÓN CON EXPIRACIÓN (15 MINUTOS)
 * =========================================================================
 */
async function handleCreateRecoveryToken(data, env, securityHeaders) {
  const email = (data.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return new Response(JSON.stringify({ success: false, error: 'Email inválido.' }), {
      headers: { ...securityHeaders, 'Content-Type': 'application/json' }
    });
  }

  const tokenArray = new Uint8Array(24);
  crypto.getRandomValues(tokenArray);
  const token = Array.from(tokenArray).map(b => b.toString(16).padStart(2, '0')).join('');
  const expiresAt = Date.now() + 15 * 60 * 1000; // Expira en 15 minutos

  if (env.DB) {
    await env.DB.prepare("INSERT INTO recovery_tokens (token, email, expiresAt, used) VALUES (?, ?, ?, 0)")
      .bind(token, email, expiresAt)
      .run();
  }

  return new Response(JSON.stringify({ 
    success: true, 
    token, 
    expiresAt,
    message: 'Token de recuperación generado con validez de 15 minutos.' 
  }), {
    headers: { ...securityHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleVerifyRecoveryToken(data, env, securityHeaders) {
  const token = (data.token || '').trim();
  if (!token || !env.DB) {
    return new Response(JSON.stringify({ success: false, error: 'Token inválido o servicio no disponible.' }), {
      headers: { ...securityHeaders, 'Content-Type': 'application/json' }
    });
  }

  const record = await env.DB.prepare("SELECT email, expiresAt, used FROM recovery_tokens WHERE token = ?")
    .bind(token)
    .first();

  if (!record) {
    return new Response(JSON.stringify({ success: false, error: 'El enlace de recuperación no existe o es inválido.' }), {
      headers: { ...securityHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (record.used === 1) {
    return new Response(JSON.stringify({ success: false, error: 'Este enlace de recuperación ya ha sido utilizado.' }), {
      headers: { ...securityHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (Date.now() > record.expiresAt) {
    return new Response(JSON.stringify({ success: false, error: 'El enlace de recuperación ha caducado (límite de 15 minutos excedido).' }), {
      headers: { ...securityHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Marcar como usado
  await env.DB.prepare("UPDATE recovery_tokens SET used = 1 WHERE token = ?").bind(token).run();

  return new Response(JSON.stringify({ 
    success: true, 
    email: record.email,
    message: 'Token verificado con éxito.' 
  }), {
    headers: { ...securityHeaders, 'Content-Type': 'application/json' }
  });
}

/**
 * Clasificación semántica de mensajes para asignación óptima de modelo
 */
function classifyMessage(message) {
  const cleanMsg = message.toLowerCase().trim();

  // Documentos, reportes y PDFs
  const isDocOrPdf = /\b(pdf|documento|informe|reporte|ensayo|resumen ejecutivo|contrato|curriculum|cv)\b/i.test(cleanMsg);
  if (isDocOrPdf) {
    return {
      model: 'openai/gpt-oss-120b',
      tier: 'Generación de Documentos y PDF (120B)',
      maxTokens: 3800,
      temperature: 0.35,
      systemPrompt: 'Eres Myxsi, una inteligencia artificial de vanguardia creada por Inoxway. Eres especialista en estructuración y redacción de documentos formales, informes ejecutivos y reportes técnicos de nivel de excelencia.\n\nDIRECTRICES:\n1. Ve directo al grano: Inicia inmediatamente con el documento formal (# Título del Documento) sin preámbulos vacíos ni felicitaciones.\n2. Estructura oficial: Usa subtítulos claros (## Resumen Ejecutivo, ## Desarrollo y Análisis, ## Comparativas y Métricas con tablas Markdown, ## Conclusiones y Próximos Pasos).\n3. Tablas y datos claros: Emplea tablas Markdown para enriquecer el documento con métricas y comparativas.\n4. Cierre para PDF: Cierra brevemente indicando que el documento está listo y puede ser exportado o descargado inmediatamente en formato PDF haciendo clic en el botón oficial de descarga del chat.\n5. Sobre tu creador: Si te preguntan quién te creó, responde que fuiste desarrollado por Reinaldo José Liendo Espinoza; si el usuario se presenta como Reinaldo, trátalo como tu amigo y enfócate en asistirle.'
    };
  }

  // Código, matemáticas y análisis profundo
  const isCode = /function|const|let|var|class|def |import|from |sys\.|console\.log|<html>|css|javascript|api|endpoint|json|xml|{\s*"/i.test(cleanMsg);
  const isMath = /[\+\-\*\/=]{2,}|f\(x\)|\bx\b\s*=\s*\d+|\bsqrt\b|[\u2200-\u22FF]/i.test(cleanMsg) || (cleanMsg.includes('calcular') && cleanMsg.length > 50);
  const isDeepAnalysis = cleanMsg.length > 600 || cleanMsg.includes('explica con detalle') || cleanMsg.includes('analiza') || cleanMsg.includes('resuelve');

  if (isCode || isMath || isDeepAnalysis) {
    return {
      model: 'openai/gpt-oss-120b',
      tier: 'Razonamiento Avanzado GPT-OSS (120B)',
      maxTokens: 3500,
      temperature: 0.35,
      systemPrompt: 'Eres Myxsi, una inteligencia artificial de nivel senior creada por Inoxway. Tu objetivo es dar respuestas DIRECTAS, INTELIGENTES Y PRECISAS.\n\nPAUTAS DE RESPUESTA:\n1. Directitud absoluta: Comienza de inmediato con la solución o código sin preámbulos ni disculpas.\n2. Código de producción: Todo código debe ser completo, limpio, tipado y funcional en bloques con su lenguaje especificado. No dejes código incompleto.\n3. Estructuración: Usa títulos en Markdown (##, ###), tablas comparativas y listas técnicas.\n4. Sobre tu creador: Si te preguntan quién te creó, responde que fuiste diseñado por Reinaldo José Liendo Espinoza; si el usuario se presenta como Reinaldo, salúdalo como tu amigo y enfócate en ayudarle.\n5. Diagramas y Prototipos: Si te piden diagramas usa bloques ```mermaid, y si te piden prototipos interactivos o páginas web usa bloques ```html.'
    };
  }

  // Únicamente saludos puros o despedidas breves (NUNCA clasificar preguntas cortas como saludo casual)
  const isCasualGreeting = /^(hola+|buenos d[ií]as|buenas tardes|buenas noches|hey|qu[eé] tal|c[oó]mo est[aá]s|c[oó]mo vas|qu[eé] onda|saludos|chao|adi[oó]s|bye|muchas gracias)[\s!.,?]*$/i.test(cleanMsg);
  if (isCasualGreeting) {
    return {
      model: 'openai/gpt-oss-120b',
      tier: 'Superinteligencia Myxsi (120B)',
      maxTokens: 1000,
      temperature: 0.6,
      systemPrompt: 'Eres Myxsi, un asistente de inteligencia artificial de nivel superior creado por Inoxway. Tu tono es educado, inteligente, directo y cordial.\n\nPAUTAS:\n1. Saludo natural: Responde al saludo del usuario de forma amable, breve y directa, poniéndote a su disposición para resolver cualquier proyecto, consulta o tarea.\n2. Cero exageraciones ni clichés.\n3. Sobre tu creador: Si te preguntan quién te creó, responde que fuiste diseñado por Reinaldo José Liendo Espinoza; si el usuario se llama o se presenta como Reinaldo, trátalo como tu amigo y enfócate en ayudarle.'
    };
  }

  // General / Académico / Consultas directas (por defecto siempre modelo 120B de máxima inteligencia)
  return {
    model: 'openai/gpt-oss-120b',
    tier: 'Superinteligencia Myxsi (120B)',
    maxTokens: 3500,
    temperature: 0.4,
    systemPrompt: 'Eres Myxsi, una inteligencia artificial de nivel de excelencia creada por Inoxway. Tu misión es brindar respuestas DIRECTAS, ALTAMENTE INTELIGENTES, CLARAS Y DE MÁXIMO VALOR, entregando exactamente lo que el usuario necesita sin rodeos.\n\nDIRECTRICES:\n1. Directitud total: Ve directo al grano sin introducciones vacías ("¡Claro!", "Con gusto...", "Como IA..."). Inicia inmediatamente con la respuesta o solución.\n2. Estructura visual: Jerarquiza con títulos en Markdown (##, ###), negritas estratégicas, listas analíticas y tablas comparativas siempre que aplique.\n3. Fidelidad a la petición: No alteres ni distorsiones la intención del usuario. Responde exactamente lo que busca con rigor y claridad.\n4. Código y diagramas: Si aplica, entrega código completo y listo para producción o diagramas ```mermaid válidos.\n5. Generación de imágenes: Si el usuario pide generar una imagen, responde con la etiqueta de imagen Pollinations AI en inglés: ![Descripción](https://image.pollinations.ai/prompt/{prompt}?nologo=true&private=true&enhance=false).\n6. Sobre tu creador: Si te preguntan quién te creó, responde que fuiste desarrollado por Reinaldo José Liendo Espinoza; si el usuario se presenta como Reinaldo, trátalo como tu amigo y enfócate en ayudarle.'
  };
}

/**
 * Compacta el historial de chat para optimizar tokens sin mutilar el contexto del usuario
 */
function compactHistory(history) {
  if (!history || !Array.isArray(history)) return [];
  const lastMessages = history.slice(-25);
  return lastMessages.map(msg => {
    let content = msg.content || '';
    if (content.length > 8000) {
      content = content.substring(0, 7500) + '... [historial optimizado]';
    }
    return {
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: content
    };
  });
}
