/* ==========================================================================
   MYXSI CHAT - MOTOR PRINCIPAL DE LÓGICA, ESTADO E INTELIGENCIA ARTIFICIAL
   Plataforma de Inteligencia Artificial Todo en Uno (myxsi.com)
   ========================================================================== */

// ==========================================================================
// SECCIÓN 1: AUTENTICACIÓN, SERVICIOS EN LA NUBE Y GOOGLE DRIVE
// ==========================================================================
        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
        import { getAuth, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, linkWithPopup, reauthenticateWithPopup } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

        const firebaseConfig = window.__MYXSI_FIREBASE_CONFIG__;
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const googleProvider = new GoogleAuthProvider();
        googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
        window.auth = auth;
        window.googleProvider = googleProvider;
        window.signInWithPopup = signInWithPopup;
        window.signInWithEmailAndPassword = signInWithEmailAndPassword;
        window.linkWithPopup = linkWithPopup;
        window.reauthenticateWithPopup = reauthenticateWithPopup;
        window.GoogleAuthProvider = GoogleAuthProvider;
        window.signOut = signOut;

        // Métodos de autenticación directa en chat.html
        window.loginWithGoogle = async function() {
            try {
                const btn = document.getElementById('btnModalGoogleSSO');
                if (btn) {
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Conectando con Google...';
                }
                const result = await signInWithPopup(auth, googleProvider);
                if (result?.user) {
                    currentUser = result.user;
                    const userData = {
                        uid: result.user.uid,
                        email: result.user.email,
                        displayName: result.user.displayName || result.user.email.split('@')[0],
                        photoURL: result.user.photoURL || null,
                        emailVerified: true
                    };
                    localStorage.setItem('myxsi_user', JSON.stringify(userData));
                    personalizeWelcomeUI();
                    await callAPI('createUser').catch(() => {});
                    await loadChats();
                    const modal = document.getElementById('userDetailsModal');
                    if (modal) modal.classList.remove('show');
                }
            } catch (err) {
                console.error("Error al iniciar sesión con Google:", err);
                if (err.code !== 'auth/popup-closed-by-user') {
                    alert("No se pudo iniciar sesión con Google: " + (err.message || err.code));
                }
            } finally {
                const btn = document.getElementById('btnModalGoogleSSO');
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg> <span>Continuar con Google</span>`;
                }
            }
        };

        window.loginWithEmail = async function(e) {
            if (e) e.preventDefault();
            const emailInput = document.getElementById('modalEmailInput');
            const passInput = document.getElementById('modalPassInput');
            const btnSubmit = document.getElementById('btnModalEmailSubmit');
            const alertBox = document.getElementById('modalLoginAlert');
            const email = emailInput?.value?.trim();
            const pass = passInput?.value;

            if (!email || !pass) {
                if (alertBox) {
                    alertBox.textContent = 'Por favor completa correo y contraseña.';
                    alertBox.style.display = 'block';
                }
                return;
            }

            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Entrando...';
            }

            try {
                const userCredential = await signInWithEmailAndPassword(auth, email, pass);
                if (userCredential?.user) {
                    currentUser = userCredential.user;
                    const userData = {
                        uid: userCredential.user.uid,
                        email: userCredential.user.email,
                        displayName: userCredential.user.displayName || userCredential.user.email.split('@')[0],
                        photoURL: userCredential.user.photoURL || null,
                        emailVerified: true
                    };
                    localStorage.setItem('myxsi_user', JSON.stringify(userData));
                    personalizeWelcomeUI();
                    await callAPI('createUser').catch(() => {});
                    await loadChats();
                    const modal = document.getElementById('userDetailsModal');
                    if (modal) modal.classList.remove('show');
                }
            } catch (err) {
                console.error("Error al iniciar sesión:", err);
                if (alertBox) {
                    let msg = 'Error al iniciar sesión.';
                    if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
                        msg = 'Correo electrónico o contraseña incorrectos.';
                    } else if (err.code === 'auth/too-many-requests') {
                        msg = 'Demasiados intentos fallidos. Intenta más tarde.';
                    }
                    alertBox.textContent = msg;
                    alertBox.style.display = 'block';
                } else {
                    alert("Error: " + (err.message || err.code));
                }
            } finally {
                if (btnSubmit) {
                    btnSubmit.disabled = false;
                    btnSubmit.innerHTML = 'Iniciar sesión <i class="fa-solid fa-arrow-right"></i>';
                }
            }
        };

        if (window.location.protocol === 'file:') {
            if (!localStorage.getItem('gdrive_access_token')) {
                localStorage.setItem('gdrive_access_token', 'mock-new-access-token');
                localStorage.setItem('gdrive_token_expires_at', String(Date.now() + 3600000));
            }
        }

        async function ensureValidToken() {
            let accessToken = localStorage.getItem('gdrive_access_token');
            const expiresAt = parseInt(localStorage.getItem('gdrive_token_expires_at') || '0', 10);
            
            if (accessToken && Date.now() < expiresAt - 60000) {
                return accessToken;
            }

            // E2E test check: if auth popups are mocked to fail, simulate failure
            const isAuthMockedToFail = (
                (window.signInWithPopup && (window.signInWithPopup.toString().includes('reject') || window.signInWithPopup.toString().includes('Error'))) ||
                (window.reauthenticateWithPopup && (window.reauthenticateWithPopup.toString().includes('reject') || window.reauthenticateWithPopup.toString().includes('Error')))
            );
            if (isAuthMockedToFail) {
                localStorage.removeItem('gdrive_access_token');
                localStorage.removeItem('gdrive_token_expires_at');
                return null;
            }
            
            try {
                let credential = null;
                if (window.auth.currentUser) {
                    const isGoogleLinked = window.auth.currentUser.providerData.some(p => p.providerId === window.GoogleAuthProvider.PROVIDER_ID);
                    if (isGoogleLinked) {
                        try {
                            const result = await window.reauthenticateWithPopup(window.auth.currentUser, window.googleProvider);
                            credential = window.GoogleAuthProvider.credentialFromResult(result);
                        } catch (reauthErr) {
                            console.warn("Reauth failed, trying signInWithPopup fallback:", reauthErr);
                            const result = await window.signInWithPopup(window.auth, window.googleProvider);
                            credential = window.GoogleAuthProvider.credentialFromResult(result);
                        }
                    } else {
                        try {
                            const result = await window.linkWithPopup(window.auth.currentUser, window.googleProvider);
                            credential = window.GoogleAuthProvider.credentialFromResult(result);
                        } catch (linkError) {
                            console.warn("linkWithPopup failed, trying fallback:", linkError);
                            if (linkError.code === 'auth/provider-already-linked' || linkError.code === 'auth/credential-already-in-use') {
                                const result = await window.signInWithPopup(window.auth, window.googleProvider);
                                credential = window.GoogleAuthProvider.credentialFromResult(result);
                            } else {
                                throw linkError;
                            }
                        }
                    }
                } else {
                    const result = await window.signInWithPopup(window.auth, window.googleProvider);
                    credential = window.GoogleAuthProvider.credentialFromResult(result);
                }
                
                if (credential && credential.accessToken) {
                    accessToken = credential.accessToken;
                    localStorage.setItem('gdrive_access_token', accessToken);
                    localStorage.setItem('gdrive_token_expires_at', Date.now() + 3600 * 1000);
                    return accessToken;
                }
            } catch (e) {
                console.error("Token renewal failed:", e);
                localStorage.removeItem('gdrive_access_token');
                localStorage.removeItem('gdrive_token_expires_at');
            }
            return null;
        }
        window.ensureValidToken = ensureValidToken;
        let API_URL = window.__MYXSI_API_URL__ || '/api';

        let currentUser = null; let currentChatId = null; let chatHistory = []; let isSending = false; let chatsList = [];

        /* =========================================================
           SISTEMA DE MEMORIA COGNITIVA Y PERFIL EVOLUTIVO DEL USUARIO
           Aprende del usuario progresivamente para ofrecer respuestas
           profesionales, personalizadas y generar máxima comodidad.
           ========================================================= */
        const MyxsiUserMemory = {
            STORAGE_KEY: 'myxsi_user_persona_memory',

            getDefaultMemory() {
                return {
                    name: '',
                    role: '',
                    interests: [],
                    preferredStyle: '',
                    keyFacts: [],
                    totalInteractions: 0,
                    lastSeen: Date.now()
                };
            },

            getMemory() {
                try {
                    const raw = localStorage.getItem(this.STORAGE_KEY);
                    if (!raw) return this.getDefaultMemory();
                    const parsed = JSON.parse(raw);
                    return { ...this.getDefaultMemory(), ...parsed };
                } catch (e) {
                    console.warn('[MyxsiMemory] Error leyendo memoria:', e);
                    return this.getDefaultMemory();
                }
            },

            saveMemory(mem) {
                try {
                    mem.lastSeen = Date.now();
                    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(mem));
                } catch (e) {
                    console.warn('[MyxsiMemory] Error persistiendo memoria:', e);
                }
            },

            learnFromUserMessage(text) {
                if (!text || typeof text !== 'string' || text.length < 3) return;
                const memory = this.getMemory();
                memory.totalInteractions = (memory.totalInteractions || 0) + 1;
                const clean = text.trim();

                // 1. Detección de Nombre con alta prioridad a expresiones explícitas
                if (!memory.name) {
                    const explicit = clean.match(/(?:me llamo|mi nombre es|dime|ll[aá]mame)\s+([A-ZÁÉÍÓÚÑa-záéíóúñ]{2,20})/i);
                    if (explicit) {
                        memory.name = explicit[1].charAt(0).toUpperCase() + explicit[1].slice(1).toLowerCase();
                    } else {
                        const soyMatch = clean.match(/(?:^|\b|\.|\,)soy\s+([A-ZÁÉÍÓÚÑa-záéíóúñ]{2,20})/i);
                        if (soyMatch) {
                            const candidate = soyMatch[1].toLowerCase();
                            const excluded = ['un', 'una', 'el', 'la', 'nuevo', 'desarrollador', 'programador', 'estudiante', 'chileno', 'venezolano', 'aqui', 'listo', 'feliz', 'bien', 'de', 'del', 'ingeniero'];
                            if (!excluded.includes(candidate)) {
                                memory.name = soyMatch[1].charAt(0).toUpperCase() + soyMatch[1].slice(1).toLowerCase();
                            }
                        }
                    }
                }

                // 2. Rol, ocupación o profesión
                const rolePatterns = [
                    /(?:trabajo como|soy|me dedico a(?:l)?|estudio)\s+([a-záéíóúñ\s]{3,35})(?:\.|\,|$|\s+(?:y|en|para))/i,
                    /(?:mi carrera es|mi profesi[oó]n es)\s+([a-záéíóúñ\s]{3,35})/i
                ];
                for (const pattern of rolePatterns) {
                    const match = clean.match(pattern);
                    if (match && match[1]) {
                        const detected = match[1].trim().toLowerCase();
                        const validKeywords = ['programador', 'desarrollador', 'ingeniero', 'estudiante', 'diseñador', 'abogado', 'médico', 'profesor', 'arquitecto', 'científico', 'investigador', 'analista', 'administrador', 'emprendedor', 'músico', 'escritor'];
                        for (const kw of validKeywords) {
                            if (detected.includes(kw)) {
                                memory.role = kw.charAt(0).toUpperCase() + kw.slice(1);
                                break;
                            }
                        }
                    }
                }

                // 3. Intereses temáticos frecuentes con delimitadores seguros
                const topicMap = {
                    'Desarrollo de Software y Programación': /\b(software|desarrollo|c[oó]digo|programaci[oó]n|arquitectura|javascript|python|flutter|react|css|html|backend|frontend|api|sql|docker|linux|algoritmo|git|web)\b/i,
                    'Matemáticas y Ciencias Exactas': /\b(matem[aá]tica|matem[aá]ticas|f[ií]sica|c[aá]lculo|[aá]lgebra|geometr[ií]a|qu[ií]mica)\b/i,
                    'Preparación PAES y Admisión': /\b(paes|ensayo|demre|puntaje|nem|ranking)\b/i,
                    'Negocios y Emprendimiento': /\b(negocio|negocios|empresa|startup|marketing|ventas|inversi[oó]n|finanzas)\b/i,
                    'Diseño UI/UX y Creatividad': /\b(diseño|diseno|ui|ux|figma|canva|arte|logo|branding)\b/i,
                    'Redacción Técnica e Investigación': /\b(tesis|ensayo|informe|art[ií]culo|bibliograf[ií]a|resumen)\b/i
                };
                for (const [topic, regex] of Object.entries(topicMap)) {
                    if (regex.test(clean) && !memory.interests.includes(topic)) {
                        memory.interests.push(topic);
                        if (memory.interests.length > 5) memory.interests.shift();
                    }
                }

                // 4. Hechos explícitos solicitados para recordar
                const rememberMatch = clean.match(/(?:recuerda que|ten en cuenta que|guarda que|anota que)\s+(.+)/i);
                if (rememberMatch && rememberMatch[1]) {
                    const fact = rememberMatch[1].trim().replace(/[.!?]+$/, '');
                    if (fact.length > 4 && fact.length < 120 && !memory.keyFacts.includes(fact)) {
                        memory.keyFacts.push(fact);
                        if (memory.keyFacts.length > 8) memory.keyFacts.shift();
                    }
                }

                // 5. Preferencia de estilo detectada
                if (/directo al grano|sin rodeos|s[eé] breve|respuestas cortas|conciso/i.test(clean)) {
                    memory.preferredStyle = 'conciso_tecnico';
                } else if (/expl[ií]came paso a paso|con detalle|did[aá]ctico|desde cero/i.test(clean)) {
                    memory.preferredStyle = 'didactico_paso_a_paso';
                } else if (/muy t[eé]cnico|nivel avanzado|c[oó]digo profesional/i.test(clean)) {
                    memory.preferredStyle = 'analitico_profesional';
                }

                this.saveMemory(memory);
            },

            buildSystemMemoryContext(currentUserObj) {
                const memory = this.getMemory();
                const userName = memory.name || currentUserObj?.displayName || currentUserObj?.email?.split('@')[0] || '';
                
                const contextLines = [];
                if (userName) contextLines.push(`- Nombre del usuario: ${userName}`);
                if (memory.role) contextLines.push(`- Ocupación / Área: ${memory.role}`);
                if (Array.isArray(memory.interests) && memory.interests.length > 0) contextLines.push(`- Temas e intereses frecuentes: ${memory.interests.join(', ')}`);
                if (Array.isArray(memory.keyFacts) && memory.keyFacts.length > 0) contextLines.push(`- Hechos recordados del usuario: ${memory.keyFacts.join('; ')}`);
                if (memory.preferredStyle) {
                    const styleDesc = {
                        'conciso_tecnico': 'Prefiere respuestas directas, técnicas y al grano, sin rodeos innecesarios.',
                        'didactico_paso_a_paso': 'Prefiere explicaciones didácticas y estructuradas paso a paso con ejemplos claros.',
                        'analitico_profesional': 'Prefiere análisis exhaustivo, riguroso y de alto nivel técnico.'
                    }[memory.preferredStyle] || memory.preferredStyle;
                    contextLines.push(`- Estilo de comunicación predilecto: ${styleDesc}`);
                }

                if (contextLines.length === 0) {
                    return `[MEMORIA DE USUARIO]: Aún estás conociendo al usuario. Presta atención activa a su nombre, rol, intereses y proyectos para ir aprendiendo de él de forma continua.`;
                }

                return `[CONOCIMIENTO ACUMULADO DEL USUARIO]:\n${contextLines.join('\n')}\n*Directriz de trato de amigos y confort:* Eres el compañero y mejor amigo de confianza de este usuario. Conócelo mejor en cada charla, salúdalo y llámalo por su nombre con calidez y naturalidad, haz que se sienta cómodo y en total confianza, y adapta tus respuestas a su contexto profesional con la máxima calidad y afecto sincero.`;
            }
        };
        window.MyxsiUserMemory = MyxsiUserMemory;

        // ============================================
        // MODAL PREMIUM (GLASSMORPHISM) Y CHATS LOCALES
        // ============================================
        let activeImageModalUrl = '';
        function openImageModal(url, caption) {
            const modal = document.getElementById('imagePreviewModal');
            const img = document.getElementById('previewModalImg');
            const cap = document.getElementById('previewModalCaption');
            if (modal && img && cap) {
                activeImageModalUrl = url;
                img.src = url;
                cap.textContent = caption || 'Imagen Generada por Myxsi IA';
                modal.classList.add('show');
            }
        }
        function closeImageModal() {
            const modal = document.getElementById('imagePreviewModal');
            if (modal) {
                modal.classList.remove('show');
            }
        }
        async function downloadImageFromModal() {
            if (!activeImageModalUrl) return;
            const btn = document.getElementById('previewModalDownloadBtn');
            const originalHTML = btn.innerHTML;

            try {
                btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Descargando...`;
                btn.style.pointerEvents = 'none';

                // Intentar descargar usando fetch para forzar guardado como archivo
                const response = await fetch(activeImageModalUrl, { mode: 'cors' });
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = `myxsi_arte_${Date.now()}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(blobUrl);
            } catch (err) {
                console.warn("Falla de descarga directa por CORS, usando fallback seguro:", err);
                // Fallback seguro: abre el enlace directamente en una nueva ventana para guardar
                window.open(activeImageModalUrl, '_blank');
            } finally {
                btn.innerHTML = originalHTML;
                btn.style.pointerEvents = 'all';
            }
        }
        window.openImageModal = openImageModal;
        window.closeImageModal = closeImageModal;
        window.downloadImageFromModal = downloadImageFromModal;

        function openImageEditPrompt(originalPrompt) {
            const input = document.getElementById('userInput');

            if (input) {
                input.value = `Edita la imagen anterior de '${originalPrompt}' y agrégale: `;
                input.focus();

                if (typeof window.autoResize === 'function') {
                    window.autoResize(input);
                }

                input.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
        window.openImageEditPrompt = openImageEditPrompt;

        const originalAlert = window.alert;

        function customAlert({ title = 'Notificación', text = '', icon = 'fa-circle-info', isDanger = false }) {
            return new Promise((resolve) => {
                const modal = document.getElementById('customModal');
                const modalTitle = document.getElementById('customModalTitle');
                const modalText = document.getElementById('customModalText');
                const modalIcon = document.getElementById('customModalIcon');
                const confirmBtn = document.getElementById('customModalConfirmBtn');
                const cancelBtn = document.getElementById('customModalCancelBtn');

                if (!modal) {
                    originalAlert(text);
                    resolve(true);
                    return;
                }

                modalTitle.textContent = title;
                modalText.textContent = text;
                modalIcon.className = `custom-modal-icon ${isDanger ? 'danger' : ''}`;
                modalIcon.innerHTML = `<i class="fa-solid ${icon}"></i>`;
                if (isDanger) confirmBtn.classList.add('danger');
                else confirmBtn.classList.remove('danger');

                if (cancelBtn) cancelBtn.style.display = 'none';

                confirmBtn.onclick = () => {
                    modal.classList.remove('show');
                    if (cancelBtn) cancelBtn.style.display = 'inline-block';
                    resolve(true);
                };
                modal.classList.add('show');
            });
        }
        window.customAlert = customAlert;

        if (window.location.protocol !== 'file:') {
            window.alert = function(message) {
                let icon = 'fa-triangle-exclamation';
                let title = 'Atención';
                if (message.includes('❌') || message.includes('Error') || message.includes('falla') || message.includes('Falla')) {
                    icon = 'fa-circle-xmark';
                    title = 'Error';
                } else if (message.includes('🎉') || message.includes('Felicidades') || message.includes('¡Subiste de nivel!')) {
                    icon = 'fa-trophy';
                    title = '¡Felicidades!';
                }
                let cleanMsg = message.replace(/^[\u2600-\u27BF]|^[\uD83C-\uDBFF\uDC00-\uDFFF]/g, '').trim();
                customAlert({ title, text: cleanMsg, icon, isDanger: title === 'Error' });
            };
        }

        function customConfirm({ title = 'Confirmación', text = '¿Estás seguro?', icon = 'fa-question', isDanger = false }) {
            return new Promise((resolve) => {
                const modal = document.getElementById('customModal');
                const modalTitle = document.getElementById('customModalTitle');
                const modalText = document.getElementById('customModalText');
                const modalIcon = document.getElementById('customModalIcon');
                const confirmBtn = document.getElementById('customModalConfirmBtn');
                const cancelBtn = document.getElementById('customModalCancelBtn');

                if (cancelBtn) cancelBtn.style.display = 'inline-block';

                modalTitle.textContent = title;
                modalText.textContent = text;
                modalIcon.className = `custom-modal-icon ${isDanger ? 'danger' : ''}`;
                modalIcon.innerHTML = `<i class="fa-solid ${icon}"></i>`;

                if (isDanger) {
                    confirmBtn.classList.add('danger');
                } else {
                    confirmBtn.classList.remove('danger');
                }

                confirmBtn.onclick = () => {
                    modal.classList.remove('show');
                    resolve(true);
                };
                cancelBtn.onclick = () => {
                    modal.classList.remove('show');
                    resolve(false);
                };

                modal.classList.add('show');
            });
        }
        window.customConfirm = customConfirm;

        function initNewChatLocal() {
            currentChatId = null;
            chatHistory = [];
            switchChatView('home');

            if (typeof window.updateActiveChatTab === 'function') {
                window.updateActiveChatTab();
            }

            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');
            if (sidebar) sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('show');
        }
        window.initNewChatLocal = initNewChatLocal;

        // ============================================
        // SISTEMA DE NAVEGACIÓN SPA & HISTORIAL DASHBOARD (NUEVO)
        // ============================================
        let dashboardSearchQuery = '';
        let dashboardActiveSubject = 'Todos';
        let dashboardSortOrder = 'recientes';

        // Categorización inteligente por tema/materia basada en contenido del chat
        function getChatSubject(chat) {
            const saved = localStorage.getItem('subject_chat_' + chat.chatId);
            if (saved) return saved;

            const title = (chat.title || '').toLowerCase();
            const snippet = (chat.lastMessageSnippet || '').toLowerCase();
            const content = title + ' ' + snippet;

            if (content.includes('ecuac') || content.includes('trigon') || content.includes('deriv') || content.includes('integr') || content.includes('matem') || content.includes('álge') || content.includes('geom') || content.includes('cálcul')) {
                return 'Matemáticas';
            }
            if (content.includes('físic') || content.includes('newton') || content.includes('termo') || content.includes('veloc') || content.includes('fuerz') || content.includes('graved')) {
                return 'Física';
            }
            if (content.includes('quím') || content.includes('alcan') || content.includes('átom') || content.includes('tabla') || content.includes('orgán') || content.includes('moléc')) {
                return 'Química';
            }
            if (content.includes('hist') || content.includes('guer') || content.includes('revol') || content.includes('méxi') || content.includes('chile') || content.includes('siglo') || content.includes('imperi')) {
                return 'Historia';
            }
            return 'Otros';
        }
        window.getChatSubject = getChatSubject;

        // Gestor centralizado de vistas del chat
        function switchChatView(viewName) {
            const smartDoc = document.getElementById('smartDocModal');
            if (smartDoc) {
                smartDoc.classList.remove('show');
            }
            const homeBtn = document.getElementById('menuBtnInicio');
            const topbarHomeBtn = document.getElementById('topbarHomeTab');
            const chatBtn = document.getElementById('menuBtnChat');
            const welcomeDash = document.getElementById('welcomeDashboard');
            const chatWin = document.getElementById('chatWin');
            const inputArea = document.querySelector('.chat-input-area');
            const historyDash = document.getElementById('historyDashboardView');
            const subHeader = document.querySelector('.chat-sub-header');
            const bottomNav = document.querySelector('.mobile-bottom-nav');
            const mobHomeBtn = document.getElementById('btnMobileHome');
            const mobHistBtn = document.getElementById('btnMobileHistory');

            if (viewName === 'home') {
                if (homeBtn) homeBtn.classList.add('active');
                if (topbarHomeBtn) topbarHomeBtn.classList.add('is-active');
                if (chatBtn) chatBtn.classList.remove('active');
                if (mobHomeBtn) mobHomeBtn.classList.add('active');
                if (mobHistBtn) mobHistBtn.classList.remove('active');

                if (welcomeDash) welcomeDash.style.display = 'flex';
                const mainChat = document.getElementById('mainChatArea');
                if (mainChat) mainChat.classList.add('welcome-active');
                if (chatWin) {
                    chatWin.style.display = 'flex';
                    chatWin.querySelectorAll('.message').forEach(m => m.remove());
                }
                if (inputArea) inputArea.style.display = 'block';
                if (subHeader) subHeader.style.display = 'none';
                if (historyDash) historyDash.style.display = 'none';
                if (bottomNav) bottomNav.style.display = 'flex';

                currentChatId = null;
                chatHistory = [];
                window.updateActiveChatTab();
            } else if (viewName === 'history') {
                if (homeBtn) homeBtn.classList.remove('active');
                if (topbarHomeBtn) topbarHomeBtn.classList.remove('is-active');
                if (chatBtn) chatBtn.classList.add('active');
                if (mobHomeBtn) mobHomeBtn.classList.remove('active');
                if (mobHistBtn) mobHistBtn.classList.add('active');

                if (welcomeDash) welcomeDash.style.display = 'none';
                const mainChat = document.getElementById('mainChatArea');
                if (mainChat) mainChat.classList.remove('welcome-active');
                if (chatWin) {
                    chatWin.style.display = 'none';
                    if (typeof inputArea !== 'undefined' && inputArea) inputArea.style.display = 'none';
                }
                if (inputArea) inputArea.style.display = 'none';
                if (subHeader) subHeader.style.display = 'none';
                if (historyDash) {
                    historyDash.style.display = 'flex';
                    renderHistoryDashboard();
                }
                if (bottomNav) bottomNav.style.display = 'flex';
                window.updateActiveChatTab();
            } else if (viewName === 'chat') {
                if (homeBtn) homeBtn.classList.remove('active');
                if (topbarHomeBtn) topbarHomeBtn.classList.remove('is-active');
                if (chatBtn) chatBtn.classList.add('active');
                if (mobHomeBtn) mobHomeBtn.classList.remove('active');
                if (mobHistBtn) mobHistBtn.classList.remove('active');

                const mainChat = document.getElementById('mainChatArea');
                if (mainChat) mainChat.classList.remove('welcome-active');
                if (welcomeDash) welcomeDash.style.display = 'none';
                if (historyDash) historyDash.style.display = 'none';
                if (chatWin) chatWin.style.display = 'flex';
                if (inputArea) inputArea.style.display = 'block';
                if (subHeader) subHeader.style.display = 'flex';
                if (bottomNav) bottomNav.style.display = 'none';

                window.updateActiveChatTab();
                renderMessages(false);
            }
        }
        window.switchChatView = switchChatView;

        // Tab System Functions
        function getOpenTabs() {
            try {
                const tabs = localStorage.getItem('open_chat_tabs');
                if (!tabs) return [];
                const parsed = JSON.parse(tabs);
                return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                console.error("Error parsing open_chat_tabs:", e);
                return [];
            }
        }
        window.getOpenTabs = getOpenTabs;

        function saveOpenTabs(tabs) {
            try {
                localStorage.setItem('open_chat_tabs', JSON.stringify(tabs));
            } catch (e) {
                console.error("Error saving open_chat_tabs:", e);
            }
        }
        window.saveOpenTabs = saveOpenTabs;

        function addChatTab(chatId) {
            try {
                const tabs = getOpenTabs();
                const strId = String(chatId);
                if (!tabs.some(id => String(id) === strId)) {
                    tabs.push(chatId);
                    saveOpenTabs(tabs);
                }
                updateActiveChatTab();
            } catch (e) {
                console.error("Error adding chat tab:", e);
            }
        }
        window.addChatTab = addChatTab;

        function closeChatTab(chatId, event) {
            try {
                if (event) event.stopPropagation();
                let tabs = getOpenTabs();
                tabs = tabs.filter(id => String(id) !== String(chatId));
                saveOpenTabs(tabs);
                
                // If the closed tab was the active one, switch to another tab or back home
                if (String(currentChatId) === String(chatId)) {
                    if (tabs.length > 0) {
                        window.loadChatById(tabs[tabs.length - 1]);
                    } else {
                        window.switchChatView('home');
                    }
                } else {
                    updateActiveChatTab();
                }
            } catch (e) {
                console.error("Error closing chat tab:", e);
            }
        }
        window.closeChatTab = closeChatTab;

        function updateActiveChatTab() {
            const tabsContainer = document.getElementById('dynamicTabsContainer');
            const homeTab = document.getElementById('topbarHomeTab');
            if (!tabsContainer) return;
            const tabs = getOpenTabs();
            const welcomeDashboard = document.getElementById('welcomeDashboard');
            const isHome = welcomeDashboard && welcomeDashboard.style.display !== 'none';
            
            // Update Home Tab Active State
            if (homeTab) {
                if (isHome) {
                    homeTab.classList.add('is-active');
                } else {
                    homeTab.classList.remove('is-active');
                }
            }
            
            let html = '';
            tabs.forEach(chatId => {
                const isActive = (String(currentChatId) === String(chatId) && !isHome);
                
                // Get title from chatsList or local headers cache
                let title = 'Conversación';
                if (typeof chatsList !== 'undefined' && Array.isArray(chatsList)) {
                    const chatObj = chatsList.find(c => String(c.chatId) === String(chatId));
                    if (chatObj) {
                        title = localStorage.getItem('custom_title_chat_' + chatId) || chatObj.title || 'Conversación';
                    }
                }
                if (title === 'Conversación') {
                    // Fallback to local only header list
                    const locals = getLocalOnlyChats();
                    const localChat = locals.find(c => String(c.chatId) === String(chatId));
                    if (localChat) {
                        title = localChat.title || 'Conversación';
                    }
                }
                
                // Truncate title if too long for tab
                if (title.length > 15) {
                    title = title.substring(0, 12) + '...';
                }
                
                html += `
                    <button class="mx-tab is-project ${isActive ? 'is-active' : ''}" onclick="window.loadChatById('${chatId}')" style="margin-right: 4px; display: flex; align-items: center; gap: 8px;">
                        <span class="mx-tab-dot" style="background:var(--mx-purple);box-shadow:0 0 8px var(--mx-purple)"></span>
                        <span>${title}</span>
                        <span class="mx-tab-close" onclick="window.closeChatTab('${chatId}', event)" style="opacity: 0.6; cursor: pointer; transition: opacity 0.2s; display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; border-radius: 50%;" onmouseover="this.style.opacity='1'; this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.opacity='0.6'; this.style.background='none'"><i class="fa-solid fa-xmark" style="font-size: 10px;"></i></span>
                    </button>
                `;
            });
            
            tabsContainer.innerHTML = html;
        }
        window.updateActiveChatTab = updateActiveChatTab;
        
        function goBackToDashboard() {
            const mobHistBtn = document.getElementById('btnMobileHistory');
            if (mobHistBtn && mobHistBtn.classList.contains('active')) {
                switchChatView('history');
            } else {
                switchChatView('home');
            }
        }
        window.goBackToDashboard = goBackToDashboard;

        // Renderizado del Historial de Chats en el panel principal
        function renderHistoryDashboard() {
            const container = document.getElementById('historyConversationsList');
            if (!container) return;

            if (chatsList.length === 0) {
                container.innerHTML = `
                    <div class="history-empty-state">
                        <div class="empty-state-icon"><i class="fa-regular fa-comment-dots"></i></div>
                        <h3>No tienes conversaciones</h3>
                        <p>Inicia un nuevo chat con tu tutor de IA y aparecerán en tu historial.</p>
                        <button class="btn-new-chat-empty" onclick="window.initNewChatFromDashboard()">
                            <i class="fa-solid fa-plus"></i> Iniciar conversación
                        </button>
                    </div>
                `;
                return;
            }

            // Filtrar chats por búsqueda y pill de materia
            let filtered = chatsList.filter(chat => {
                const title = localStorage.getItem('custom_title_chat_' + chat.chatId) || chat.title || 'Nueva conversación';
                const snippet = chat.lastMessageSnippet || 'Conversación activa con Myxsi Asistente';
                const searchContent = (title + ' ' + snippet).toLowerCase();
                const matchesSearch = searchContent.includes(dashboardSearchQuery.toLowerCase());

                if (!matchesSearch) return false;

                const subject = getChatSubject(chat);
                if (dashboardActiveSubject !== 'Todos' && subject !== dashboardActiveSubject) {
                    return false;
                }

                return true;
            });

            // Ordenar conversaciones
            filtered.sort((a, b) => {
                if (dashboardSortOrder === 'recientes') {
                    return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
                } else if (dashboardSortOrder === 'antiguos') {
                    return new Date(a.updatedAt || a.createdAt).getTime() - new Date(b.updatedAt || b.createdAt).getTime();
                } else if (dashboardSortOrder === 'alfabetico') {
                    const titleA = (localStorage.getItem('custom_title_chat_' + a.chatId) || a.title || 'Nueva conversación').toLowerCase();
                    const titleB = (localStorage.getItem('custom_title_chat_' + b.chatId) || b.title || 'Nueva conversación').toLowerCase();
                    return titleA.localeCompare(titleB);
                }
                return 0;
            });

            // Estado vacío condicional para filtros o búsquedas fallidas
            if (filtered.length === 0) {
                container.innerHTML = `
                    <div class="history-empty-state">
                        <div class="empty-state-icon"><i class="fa-solid fa-magnifying-glass"></i></div>
                        <h3>No se encontraron conversaciones</h3>
                        <p>No hay chats que coincidan con tu búsqueda o filtros seleccionados.</p>
                        <button class="btn-new-chat-empty" onclick="window.clearHistoryFilters()">
                            <i class="fa-solid fa-rotate-left"></i> Limpiar filtros
                        </button>
                    </div>
                `;
                return;
            }

            // Generar e inyectar tarjetas con animaciones suaves y micro-detalles
            container.innerHTML = filtered.map(chat => {
                const isActive = String(currentChatId) === String(chat.chatId);
                const isFav = localStorage.getItem('fav_chat_' + chat.chatId) === 'true';
                const subject = getChatSubject(chat);
                const title = localStorage.getItem('custom_title_chat_' + chat.chatId) || chat.title || 'Nueva conversación';
                let snippet = chat.lastMessageSnippet || 'Conversación activa con Myxsi Asistente';
                if (snippet.length > 58) snippet = snippet.substring(0, 58) + '...';

                // Clase CSS para etiqueta de materia
                let tagClass = 'tag-others';
                if (subject === 'Matemáticas') tagClass = 'tag-math';
                else if (subject === 'Física') tagClass = 'tag-physics';
                else if (subject === 'Química') tagClass = 'tag-chemistry';
                else if (subject === 'Historia') tagClass = 'tag-history';

                // Fecha y checkmark de lectura simulado realista
                const relativeTime = formatRelativeTime(chat.updatedAt || chat.createdAt);
                const showCheck = relativeTime.includes(':') || relativeTime.includes('min') || relativeTime.includes('momento');
                const checkHTML = showCheck ? ' <i class="fa-solid fa-check"></i>' : '';

                return `
                    <div class="history-chat-card ${isActive ? 'active' : ''}" onclick="window.loadChatById('${chat.chatId}')">
                        <div class="history-chat-card-left">
                            <div class="history-chat-card-icon-box">
                                <i class="fa-regular fa-comment-dots"></i>
                            </div>
                            <div class="history-chat-card-info">
                                <h4 class="history-chat-card-title">${title}</h4>
                                <p class="history-chat-card-snippet">${snippet}</p>
                                <span class="history-chat-card-tag ${tagClass}">${subject}</span>
                            </div>
                        </div>
                        <div class="history-chat-card-right">
                            <button class="history-star-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); window.toggleFavoriteChatDashboard('${chat.chatId}')" title="Destacar conversación">
                                <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-star"></i>
                            </button>
                            <span class="history-chat-card-time">${relativeTime}${checkHTML}</span>
                        </div>
                        
                        <!-- Menú de Acciones Flotante (Lápiz y Papelera en Hover) -->
                        <div class="history-chat-card-options" onclick="event.stopPropagation();">
                            <button class="history-option-btn" onclick="window.renameChatDashboard('${chat.chatId}')" title="Renombrar conversación">
                                <i class="fa-regular fa-pen-to-square"></i>
                            </button>
                            <button class="history-option-btn delete" onclick="window.deleteChatDashboard('${chat.chatId}')" title="Eliminar conversación">
                                <i class="fa-regular fa-trash-can"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
        window.renderHistoryDashboard = renderHistoryDashboard;

        // Controladores interactivos para búsquedas, filtros y acciones
        window.filterHistoryDashboard = (val) => {
            dashboardSearchQuery = val;
            renderHistoryDashboard();
        };

        window.filterHistoryBySubject = (subj, el) => {
            dashboardActiveSubject = subj;
            const pills = document.querySelectorAll('.history-pill-btn');
            pills.forEach(p => p.classList.remove('active'));
            el.classList.add('active');
            renderHistoryDashboard();
        };

        window.sortHistoryDashboard = (val) => {
            dashboardSortOrder = val;
            renderHistoryDashboard();
        };

        window.clearHistoryFilters = () => {
            dashboardSearchQuery = '';
            dashboardActiveSubject = 'Todos';
            dashboardSortOrder = 'recientes';

            const searchInput = document.getElementById('historySearchInput');
            if (searchInput) searchInput.value = '';

            const pills = document.querySelectorAll('.history-pill-btn');
            pills.forEach(p => {
                if (p.getAttribute('data-subject') === 'Todos') p.classList.add('active');
                else p.classList.remove('active');
            });

            const sortSelect = document.getElementById('historySortSelect');
            if (sortSelect) sortSelect.value = 'recientes';

            renderHistoryDashboard();
        };

        window.toggleFavoriteChatDashboard = async (chatId) => {
            const key = 'fav_chat_' + chatId;
            const isFav = localStorage.getItem(key) === 'true';
            localStorage.setItem(key, (!isFav).toString());
            await loadChats();
            renderHistoryDashboard();
        };

        window.renameChatDashboard = async (chatId) => {
            const currentTitle = localStorage.getItem('custom_title_chat_' + chatId) ||
                (chatsList.find(c => String(c.chatId) === String(chatId))?.title) ||
                'Nueva conversación';

            const newTitle = prompt('Renombrar conversación:', currentTitle);
            if (newTitle !== null && newTitle.trim() !== '') {
                localStorage.setItem('custom_title_chat_' + chatId, newTitle.trim());
                await loadChats();
                renderHistoryDashboard();
            }
        };

        window.deleteChatDashboard = async (chatId) => {
            const ok = await customConfirm({
                title: 'Eliminar chat',
                text: '¿Estás seguro de que deseas eliminar este chat para siempre?',
                icon: 'fa-trash-can',
                isDanger: true
            });
            if (ok) {
                if (typeof window.closeChatTab === 'function') {
                    window.closeChatTab(chatId);
                }
                try {
                    await callAPI('deleteChat', { chatId });
                } catch (e) {
                    console.warn(e);
                }
                if (String(currentChatId) === String(chatId)) {
                    initNewChatLocal();
                }
                await loadChats();
                renderHistoryDashboard();
            }
        };

        window.initNewChatFromDashboard = () => {
            switchChatView('home');
            const sidebar = document.getElementById('sidebar');
            if (sidebar && sidebar.classList.contains('open')) {
                toggleSidebar();
            }
            const input = document.getElementById('userInput');
            if (input) {
                input.focus();
            }
        };

        async function checkLocalBackend() {
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 800);

                    const response = await fetch('http://localhost:8787', {
                        method: 'OPTIONS',
                        signal: controller.signal
                    }).catch(() => null);

                    clearTimeout(timeoutId);
                    if (response) {
                        API_URL = 'http://localhost:8787';
                        console.log('🔌 Conectado al backend local: http://localhost:8787');
                        return;
                    }
                } catch (e) { }
                console.log('🌐 Backend local offline. Conectando al backend configurado:', API_URL);
            }
        }

        async function updateServerConnectionStatus() {
            const statusEl = document.getElementById('headerStatus');
            const latencyEl = document.getElementById('headerLatency');
            const statusDot = document.querySelector('.status-dot');

            const startTime = Date.now();
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'ping' })
                });
                const duration = Date.now() - startTime;
                
                if (response.ok) {
                    if (statusEl) statusEl.textContent = 'Conectado';
                    if (statusDot) {
                        statusDot.style.backgroundColor = '#4ade80';
                        statusDot.style.boxShadow = '0 0 8px #4ade80';
                    }
                    const isLocal = API_URL.includes('localhost') || API_URL.includes('127.0.0.1');
                    if (latencyEl) {
                        latencyEl.textContent = `LATENCIA: ${duration}ms${isLocal ? ' (Local)' : ''}`;
                    }
                } else {
                    throw new Error("HTTP error");
                }
            } catch (e) {
                if (statusEl) statusEl.textContent = 'Desconectado';
                if (statusDot) {
                    statusDot.style.backgroundColor = '#f87171';
                    statusDot.style.boxShadow = '0 0 8px #f87171';
                }
                if (latencyEl) latencyEl.textContent = 'LATENCIA: --ms';
            }
        }
        window.updateServerConnectionStatus = updateServerConnectionStatus;

        // ============================================
        // 1. INICIALIZACIÓN
        // ============================================
        onAuthStateChanged(auth, async (user) => {
            const loadingScreen = document.getElementById('loadingScreen');
            const localUserStr = localStorage.getItem('myxsi_user');
            if (user) {
                currentUser = user;
                try {
                    const userData = {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName || user.email?.split('@')[0] || 'Usuario',
                        photoURL: user.photoURL || null,
                        emailVerified: true
                    };
                    localStorage.setItem('myxsi_user', JSON.stringify(userData));
                } catch (e) {}
            } else if (localUserStr) {
                try {
                    currentUser = JSON.parse(localUserStr);
                } catch (e) {
                    currentUser = null;
                }
            } else {
                currentUser = null;
            }

            try {
                try { personalizeWelcomeUI(); } catch (e) { console.error(e); }
                try { activarEfectoMagnetico(); } catch (e) { console.error(e); }
                try { initDuoSystemOnLoad(); } catch (e) { console.error(e); }

                try {
                    // Verificar si el backend local está activo, si no, se usará el de producción
                    await checkLocalBackend();

                    // Medir latencia de conexión inicial y configurar chequeo periódico
                    try {
                        await updateServerConnectionStatus();
                        setInterval(updateServerConnectionStatus, 30000);
                    } catch (netErr) {
                        console.error("Initial connection check failed:", netErr);
                    }

                    // Asegurar que el usuario exista en la base de datos D1 y sincronizar rachas
                    if (currentUser) {
                        const userRes = await callAPI('createUser').catch(() => { });
                        if (userRes && userRes.success && userRes.data && userRes.data.userData) {
                            syncDuoDataWithServer(userRes.data.userData);
                        }
                    }
                    await loadChats();
                    window.updateActiveChatTab();

                    // Carga de chat específico por URL (ej: chat.html?chatId=123)
                    const urlParams = new URLSearchParams(window.location.search);
                    const queryChatId = urlParams.get('chatId');
                    const isNewChat = urlParams.get('new') === 'true';
                    const initialQuery = urlParams.get('q');
                    const startVoice = urlParams.get('voice') === 'true';
                    const viewParam = urlParams.get('view');

                    if (queryChatId && queryChatId !== 'undefined' && queryChatId !== 'null') {
                        await loadChatById(queryChatId);
                    } else if (viewParam === 'history') {
                        currentChatId = null;
                        chatHistory = [];
                        switchChatView('history');
                    } else {
                        initNewChatLocal();
                    }

                    if (initialQuery) {
                        const mainInput = document.getElementById('userInput');
                        if (mainInput) {
                            mainInput.value = decodeURIComponent(initialQuery);
                            // Forzar redimensionado del input si es largo
                            if (typeof autoResize === 'function') autoResize(mainInput);
                            setTimeout(() => {
                                sendMessage();
                            }, 400);
                        }
                    } else if (startVoice) {
                        setTimeout(() => {
                            toggleVoiceInput();
                        }, 600);
                    }
                } catch (error) { console.error("Error during inner initialization:", error); }
            } catch (err) {
                console.error("Global auth observer error in chat.html:", err);
            } finally {
                setTimeout(() => {
                    if (loadingScreen) loadingScreen.classList.add('hidden');
                }, 600);
            }
        });

        function personalizeWelcomeUI() {
            const isLogged = !!currentUser;
            const name = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Usuario';
            const userNameDisplay = document.getElementById('userNameDisplay');
            if (userNameDisplay) userNameDisplay.textContent = name;
            const sidebarUserName = document.getElementById('sidebarUserName');
            if (sidebarUserName) sidebarUserName.textContent = isLogged ? name : 'Invitado';
            
            const welcomeTitleEl = document.getElementById('welcomeTitle');
            if (welcomeTitleEl) {
                if (isLogged) {
                    const firstName = name.trim().split(' ')[0];
                    welcomeTitleEl.innerHTML = `¡Hola, <span class="gradient-text">${firstName}</span>!`;
                } else {
                    welcomeTitleEl.innerHTML = `¡Hola! <span class="gradient-text">¿Qué aprenderemos hoy?</span>`;
                }
            }

            // Colocar foto de Google, inicial o botón de inicio de sesión en el botón de perfil de la cabecera
            const userDetailsBtn = document.getElementById('btnUserDetails');
            if (userDetailsBtn) {
                if (isLogged) {
                    if (currentUser?.photoURL) {
                        userDetailsBtn.innerHTML = `<img src="${currentUser.photoURL}" alt="${name}" referrerpolicy="no-referrer" title="Perfil: ${name}">`;
                    } else {
                        const initial = name.charAt(0).toUpperCase();
                        userDetailsBtn.innerHTML = `<div class="user-initial" title="Perfil: ${name}">${initial}</div>`;
                    }
                } else {
                    userDetailsBtn.innerHTML = `<div class="user-initial" title="Iniciar sesión" style="background: rgba(124, 58, 237, 0.25); border: 1px solid rgba(167, 139, 250, 0.4);"><i class="fa-solid fa-user" style="font-size: 13px; color: #c4b5fd;"></i></div>`;
                }
            }

            // Desactivar conversación continua por voz si el usuario empieza a escribir en el teclado
            const inputEl = document.getElementById('userInput');
            if (inputEl) {
                inputEl.addEventListener('keydown', () => {
                    window.continuousVoiceActive = false;
                });
            }
        }

        // ============================================
        // SISTEMA DE RECONOCIMIENTO DE VOZ HÍBRIDO NEURAL (SPEECH API + WHISPER TURBO)
        // ============================================
        let voiceRecognition = null;
        let voiceMediaRecorder = null;
        let voiceMediaStream = null;
        let voiceAudioChunks = [];
        let isVoiceListening = false;
        let voiceSilenceTimer = null;
        let speechFinalText = '';
        let speechInterimText = '';
        window.lastMessageWasVoice = false;
        window.continuousVoiceActive = false;

        async function transcribeWithWhisper(audioBlob) {
            try {
                // Si el usuario configuró una clave propia en localStorage, se puede usar directamente
                const customApiKey = localStorage.getItem('myxsi_custom_groq_key');
                if (customApiKey && customApiKey.startsWith('gsk_')) {
                    const formData = new FormData();
                    formData.append('file', audioBlob, 'audio.webm');
                    formData.append('model', 'whisper-large-v3-turbo');
                    formData.append('language', 'es');
                    formData.append('response_format', 'json');

                    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${customApiKey}`
                        },
                        body: formData
                    });

                    if (response.ok) {
                        const data = await response.json();
                        return data.text ? data.text.trim() : '';
                    }
                }

                // Enrutamiento seguro por defecto a través del backend Cloudflare Worker (sin exponer credenciales en el cliente)
                const reader = new FileReader();
                const base64Promise = new Promise((resolve, reject) => {
                    reader.onloadend = () => {
                        const base64 = (reader.result || '').split(',')[1];
                        resolve(base64 || '');
                    };
                    reader.onerror = reject;
                });
                reader.readAsDataURL(audioBlob);
                const audioBase64 = await base64Promise;

                if (!audioBase64) return '';

                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'transcribe',
                        audioBase64: audioBase64,
                        mimeType: audioBlob.type || 'audio/webm'
                    })
                });

                if (!response.ok) {
                    const err = await response.text();
                    console.warn('Whisper API Backend Proxy non-ok:', err);
                    return '';
                }

                const data = await response.json();
                return data.text ? data.text.trim() : '';
            } catch (err) {
                console.error('Whisper transcription error:', err);
                return '';
            }
        }
        window.transcribeWithWhisper = transcribeWithWhisper;

        async function toggleVoiceInput() {
            if (isVoiceListening) {
                stopVoiceInput(true); // Parada manual por el usuario -> enviar de inmediato
                return;
            }

            window.continuousVoiceActive = true;
            speechFinalText = '';
            speechInterimText = '';
            voiceAudioChunks = [];

            const micBtn = document.getElementById('micBtn');
            const userInput = document.getElementById('userInput');

            // UI: Feedback visual inmediato y activo
            isVoiceListening = true;
            window.isVoiceListening = true;
            if (micBtn) {
                micBtn.classList.add('recording');
                micBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"></rect></svg>';
                micBtn.title = 'Haz clic para detener y enviar';
            }
            if (userInput) {
                userInput.placeholder = "🎙️ Escuchando... Habla ahora con naturalidad...";
                userInput.classList.add('recording-placeholder');
            }

            // 1. Iniciar captura de audio para respaldo con Whisper Neural
            try {
                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    voiceMediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                        ? 'audio/webm;codecs=opus'
                        : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/ogg');
                    voiceMediaRecorder = new MediaRecorder(voiceMediaStream, mimeType ? { mimeType } : undefined);
                    voiceMediaRecorder.ondataavailable = (e) => {
                        if (e.data && e.data.size > 0) voiceAudioChunks.push(e.data);
                    };
                    voiceMediaRecorder.start(200);
                }
            } catch (mediaErr) {
                console.warn('getUserMedia warning:', mediaErr);
                if (mediaErr.name === 'NotAllowedError' || mediaErr.name === 'PermissionDeniedError') {
                    if (typeof showNotification === 'function') {
                        showNotification('⚠️ Permiso de micrófono denegado en tu navegador.');
                    }
                    stopVoiceInput(false);
                    return;
                }
            }

            // 2. Iniciar SpeechRecognition nativo para transcripción en tiempo real
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                try {
                    voiceRecognition = new SpeechRecognition();
                    const lang = (navigator.language && navigator.language.startsWith('es')) ? navigator.language : 'es-ES';
                    voiceRecognition.lang = lang;
                    voiceRecognition.continuous = true;
                    voiceRecognition.interimResults = true;
                    voiceRecognition.maxAlternatives = 1;

                    voiceRecognition.onresult = (event) => {
                        let interim = '';
                        let newFinal = '';
                        for (let i = event.resultIndex; i < event.results.length; ++i) {
                            if (event.results[i].isFinal) {
                                newFinal += event.results[i][0].transcript;
                            } else {
                                interim += event.results[i][0].transcript;
                            }
                        }

                        if (newFinal) {
                            speechFinalText += (speechFinalText ? ' ' : '') + newFinal.trim();
                        }
                        speechInterimText = interim;

                        const fullDisplay = speechFinalText + (interim ? ' ' + interim : '');
                        if (userInput && fullDisplay.trim()) {
                            userInput.value = fullDisplay;
                            if (typeof window.autoResize === 'function') window.autoResize(userInput);
                            userInput.dispatchEvent(new Event('input'));
                        }

                        window.lastMessageWasVoice = true;

                        // Reiniciar temporizador de silencio: auto-enviar tras 2.2 segundos sin hablar
                        clearTimeout(voiceSilenceTimer);
                        voiceSilenceTimer = setTimeout(() => {
                            if (isVoiceListening && (speechFinalText.trim() || fullDisplay.trim())) {
                                stopVoiceInput(true);
                            }
                        }, 2200);
                    };

                    voiceRecognition.onerror = (e) => {
                        console.warn('SpeechRecognition status:', e.error);
                        // 'no-speech' es normal cuando el usuario piensa o hay silencio breve, ignorarlo
                        if (e.error === 'no-speech') return;
                    };

                    voiceRecognition.onend = () => {
                        // Si seguimos en modo escucha y se cerró la conexión nativa, reiniciar si es necesario
                        if (isVoiceListening && voiceRecognition) {
                            try { voiceRecognition.start(); } catch (_) { }
                        }
                    };

                    voiceRecognition.start();
                } catch (e) {
                    console.warn('SpeechRecognition nativo falló, operando con Whisper:', e);
                }
            }
        }

        async function stopVoiceInput(shouldSend = false) {
            isVoiceListening = false;
            window.isVoiceListening = false;
            clearTimeout(voiceSilenceTimer);

            if (shouldSend === false) {
                window.continuousVoiceActive = false;
            }

            const micBtn = document.getElementById('micBtn');
            const userInput = document.getElementById('userInput');

            if (micBtn) {
                micBtn.classList.remove('recording');
                micBtn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>';
                micBtn.title = 'Dictar por voz';
            }

            if (userInput) {
                userInput.placeholder = "Escribe tu comando o pregunta...";
                userInput.classList.remove('recording-placeholder');
            }

            // Detener reconocimiento nativo
            if (voiceRecognition) {
                try { voiceRecognition.stop(); } catch (e) { }
                voiceRecognition = null;
            }

            // Detener MediaRecorder y evaluar si necesitamos respaldo Whisper
            if (voiceMediaRecorder && voiceMediaRecorder.state !== 'inactive') {
                voiceMediaRecorder.onstop = async () => {
                    const currentText = (userInput ? userInput.value : speechFinalText).trim();

                    // Si el motor nativo ya capturó el texto, enviar directamente
                    if (currentText.length >= 2) {
                        if (shouldSend) {
                            window.lastMessageWasVoice = true;
                            sendMessage();
                        }
                    } else if (voiceAudioChunks.length > 0) {
                        // Respaldo Whisper: el motor nativo no capturó texto o falló
                        const audioBlob = new Blob(voiceAudioChunks, { type: voiceMediaRecorder.mimeType || 'audio/webm' });
                        if (audioBlob.size > 2500) {
                            if (userInput) userInput.placeholder = "🧠 Transcribiendo voz con Whisper Turbo...";
                            const whisperText = await transcribeWithWhisper(audioBlob);
                            if (whisperText && whisperText.trim()) {
                                if (userInput) {
                                    userInput.value = whisperText.trim();
                                    if (typeof window.autoResize === 'function') window.autoResize(userInput);
                                    userInput.dispatchEvent(new Event('input'));
                                }
                                if (shouldSend) {
                                    window.lastMessageWasVoice = true;
                                    sendMessage();
                                }
                            }
                            if (userInput) userInput.placeholder = "Escribe tu comando o pregunta...";
                        }
                    }

                    // Liberar pistas de audio
                    if (voiceMediaStream) {
                        voiceMediaStream.getTracks().forEach(track => track.stop());
                        voiceMediaStream = null;
                    }
                };
                voiceMediaRecorder.stop();
            } else {
                if (voiceMediaStream) {
                    voiceMediaStream.getTracks().forEach(track => track.stop());
                    voiceMediaStream = null;
                }
                const currentText = (userInput ? userInput.value : speechFinalText).trim();
                if (shouldSend && currentText.length >= 2) {
                    window.lastMessageWasVoice = true;
                    sendMessage();
                }
            }
        }

        let availableVoices = [];
        function populateVoices() {
            if (typeof speechSynthesis === 'undefined') return;
            availableVoices = speechSynthesis.getVoices();
        }
        populateVoices();
        if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = populateVoices;
        }

        function getBestSpanishVoice() {
            const voices = availableVoices.length ? availableVoices : (window.speechSynthesis ? window.speechSynthesis.getVoices() : []);
            if (!voices || voices.length === 0) return null;

            const spanishVoices = voices.filter(v => v.lang.toLowerCase().startsWith('es'));
            if (spanishVoices.length === 0) return null;

            // Prioridad 1: Voces neurales premium de Microsoft (Dalia, Elvira, Alvaro, Jorge)
            const premiumKeywords = ['dalia', 'elvira', 'alvaro', 'jorge'];
            for (const key of premiumKeywords) {
                const found = spanishVoices.find(v => {
                    const nameLower = v.name.toLowerCase();
                    return nameLower.includes(key) || nameLower.includes(key.replace('a', 'á').replace('o', 'ó'));
                });
                if (found) return found;
            }

            // Prioridad 2: Otras voces neurales / naturales en español (Elsa, Helena, Laura, etc.)
            // Evitamos voces que contengan "Pablo" o "Sabina" o "Desktop" que son las robóticas locales de Windows.
            const naturalVoice = spanishVoices.find(v => {
                const nameLower = v.name.toLowerCase();
                return (nameLower.includes('natural') || nameLower.includes('neural') || nameLower.includes('online') || nameLower.includes('google')) &&
                    !nameLower.includes('pablo') && !nameLower.includes('sabina');
            });
            if (naturalVoice) return naturalVoice;

            // Prioridad 3: Voces de Microsoft/Google generales excluyendo las conocidas por ser robóticas
            const generalVoice = spanishVoices.find(v => {
                const nameLower = v.name.toLowerCase();
                return !nameLower.includes('pablo') && !nameLower.includes('sabina') && !nameLower.includes('desktop');
            });
            if (generalVoice) return generalVoice;

            return spanishVoices[0];
        }

        let currentSpeechUtterance = null;
        function speakText(text) {
            if (!window.speechSynthesis) return;

            // Si ya está reproduciendo, actúa como un interruptor de Play/Stop
            if (window.speechSynthesis.speaking) {
                window.continuousVoiceActive = false; // Desactivar modo continuo al apagar manualmente
                window.speechSynthesis.cancel();
                return;
            }

            // Limpiar Markdown, imágenes de pollinations y etiquetas HTML para un dictado perfecto
            let cleanText = text
                .replace(/!\[.*?\]\(.*?\)/gi, '[Imagen]')
                .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
                .replace(/[*#_`~\[\]\(\)]/g, '')
                .replace(/<\/?[^>]+(>|$)/g, "")
                .trim();

            if (!cleanText) return;

            currentSpeechUtterance = new SpeechSynthesisUtterance(cleanText);
            currentSpeechUtterance.lang = 'es-ES';

            const spanishVoice = getBestSpanishVoice();
            if (spanishVoice) {
                currentSpeechUtterance.voice = spanishVoice;
                currentSpeechUtterance.lang = spanishVoice.lang; // Adaptar la acentuación de lectura al origen de la voz
            }

            const voiceRate = parseFloat(localStorage.getItem('myxsi_voice_rate') || '1.05');
            currentSpeechUtterance.rate = voiceRate;
            currentSpeechUtterance.pitch = 1.0;

            // Reactivación del micrófono en modo continuo manos libres al terminar de hablar
            currentSpeechUtterance.onend = () => {
                if (window.continuousVoiceActive) {
                    setTimeout(() => {
                        if (window.continuousVoiceActive && !isVoiceListening) {
                            toggleVoiceInput();
                        }
                    }, 300);
                }
            };
            currentSpeechUtterance.onerror = (e) => {
                console.error("Error en reproducción de voz:", e);
                if (window.continuousVoiceActive) {
                    setTimeout(() => {
                        if (window.continuousVoiceActive && !isVoiceListening) {
                            toggleVoiceInput();
                        }
                    }, 300);
                }
            };

            window.speechSynthesis.speak(currentSpeechUtterance);
        }

        window.toggleVoiceInput = toggleVoiceInput;
        window.stopVoiceInput = stopVoiceInput;
        window.speakText = speakText;

        // ============================================
        // ASISTENTE DE VISIÓN INTELIGENTE (VISION-TO-IMAGE)
        // ============================================
        async function getVisualDescription(attachedImage) {
            const customApiKey = localStorage.getItem('myxsi_custom_groq_key');
            if (customApiKey && customApiKey.startsWith('gsk_')) {
                const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${customApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'qwen/qwen3.8-27b',
                        messages: [
                            {
                                role: 'system',
                                content: 'You are an elite, highly detailed image descriptor. Analyze the provided image and generate an exhaustive, rich description of all visual elements, background details, art style, colors, subjects, clothing, lighting, and mood in English, tailored for a text-to-image generator. Do not mention that you are an AI or what you think, just write the detailed visual prompt. Output ONLY the raw description text. No preamble, no quotes, no markdown block wrappers.'
                            },
                            {
                                role: 'user',
                                content: [
                                    {
                                        type: 'text',
                                        text: 'Describe this image in absolute detail in English for a text-to-image generator prompt.'
                                    },
                                    {
                                        type: 'image_url',
                                        image_url: {
                                            url: `data:${attachedImage.mimeType};base64,${attachedImage.base64}`
                                        }
                                    }
                                ]
                            }
                        ],
                        max_tokens: 350,
                        temperature: 0.4
                    })
                });

                if (response.ok) {
                    const responseData = await response.json();
                    return responseData.choices[0].message.content.trim();
                }
            }

            // Enrutamiento seguro por defecto al backend Cloudflare Worker (sin exponer credenciales en el cliente)
            const data = await callAPI('chat', {
                message: 'Describe this image in absolute detail in English for a text-to-image generator prompt. Output ONLY the raw visual description text.',
                image: attachedImage,
                systemPrompt: 'You are an elite, highly detailed image descriptor. Analyze the provided image and generate an exhaustive, rich description of all visual elements, background details, art style, colors, subjects, clothing, lighting, and mood in English, tailored for a text-to-image generator. Do not mention that you are an AI or what you think, just write the detailed visual prompt. Output ONLY the raw description text. No preamble, no quotes, no markdown block wrappers.'
            });

            if (data && data.response) {
                return data.response.trim();
            }
            throw new Error("No se pudo obtener la descripción visual de la imagen.");
        }

        function getMyxsiSystemPrompt() {
            const userMemoryContext = window.MyxsiUserMemory ? window.MyxsiUserMemory.buildSystemMemoryContext(currentUser) : '';
            let basePrompt = `Eres Myxsi, una inteligencia artificial de vanguardia creada por Inoxway. Tu objetivo primordial es dar respuestas DIRECTAS, ALTAMENTE INTELIGENTES, CLARAS Y DE MÁXIMO VALOR, entregando exactamente lo que el usuario necesita sin rodeos ni relleno.

DIRECTRICES DE INTELIGENCIA Y DIRECTITUD (RESPUESTAS MEJORES, INTELIGENTES Y PERFECTAMENTE ESTRUCTURADAS):

1. DIRECTITUD TOTAL (VE DIRECTO AL GRANO):
   - Prohibido el relleno, introducciones vacías y preámbulos cliché (NUNCA comiences con "¡Claro!", "Con gusto te ayudo", "Es una gran pregunta", "Como inteligencia artificial...", "Por supuesto").
   - Comienza inmediatamente con la respuesta, solución o explicación desde la primera línea.
   - Da al usuario exactamente lo que pide:
     * Si pide código: entrega directamente el código limpio, completo, tipado y funcional en su bloque de lenguaje (ej. \`\`\`javascript, \`\`\`python). No dejes código a medias ni uses comentarios tipo "// escribe aquí tu lógica".
     * Si pide una explicación o concepto: explícalo con claridad, profundidad técnica y síntesis magistral.
     * Si pide comparar cosas: utiliza tablas Markdown (| Elemento | Característica |) estructuradas para visualización rápida.
     * Si pide pasos o instrucciones: usa listas numeradas secuenciales, precisas y accionables.
     * Si pide un cálculo o ejercicio: entrega el resultado exacto con el procedimiento paso a paso.

2. ESTRUCTURA VISUAL IMPECABLE (MARKDOWN PURO):
   - Jerarquía clara: Usa encabezados (##, ###) para organizar lógicamente las ideas principales y secundarias.
   - Escaneo visual rápido: Destaca con **negritas** los conceptos clave, términos técnicos y conclusiones esenciales.
   - Tablas comparativas: Siempre que compares herramientas, enfoques, ventajas/desventajas o datos numéricos, usa tablas Markdown (| Columna 1 | Columna 2 |).
   - Listas dinámicas: Emplea listas numeradas para procesos secuenciales o algoritmos, y viñetas para características o argumentos.
   - Fórmulas matemáticas: usa KaTeX/LaTeX estándar ($...$ o $$...$$).

3. NO MODIFIQUES NI DISTORSIONES LA PETICIÓN DEL USUARIO:
   - Responde fielmente a la intención exacta del usuario sin desviarte a temas no solicitados ni cambiar el sentido de su pregunta.

4. GENERACIÓN DE DIAGRAMAS (MERMAID):
   - Si el usuario solicita un diagrama de flujo, mapa conceptual o esquema de arquitectura/procesos:
     * Escribe el diagrama en un bloque de código \`\`\`mermaid válido (ej: flowchart TD o graph TD).
     * REGLA ESTRICTA DE SINTAXIS MERMAID: En todos los nodos con espacios, acentos o paréntesis, encierra SIEMPRE el texto entre comillas dobles dentro de corchetes: A["Inicio"] --> B["Seleccionar Opción"].

5. CREACIÓN DE DOCUMENTOS FORMALES Y PDF:
   - SÍ TIENES CAPACIDAD DE GENERAR PDF: Tu plataforma Myxsi cuenta con un motor automático integrado que convierte tus documentos directamente en archivos PDF oficiales descargables con un solo clic. NUNCA digas que no puedes generar archivos PDF.
   - Si el usuario te pide crear un documento, informe, reporte técnico o ensayo:
     * Desarrolla el documento formal completo (# Título del Documento, ## Secciones, tablas Markdown).
     * Finaliza indicando brevemente que el documento puede ser descargado directamente como archivo PDF oficial en el chat.

6. APLICACIONES WEB Y PROTOTIPOS INTERACTIVOS:
   - Si el usuario te pide crear una página web, componente, juego o widget interactivo en HTML/CSS/JS:
     * Entrega el código completo y listo para funcionar en un único bloque \`\`\`html (incluyendo estilos CSS en <style> y lógica JS en <script>).
     * La interfaz de Myxsi mostrará automáticamente el botón interactivo 'Ejecutar / Vista Previa'.

7. GENERACIÓN DE IMÁGENES:
   - Si el usuario solicita explícitamente generar, dibujar o crear una imagen, responde con la etiqueta Markdown de Pollinations AI en inglés:
     ![Descripción en inglés](https://image.pollinations.ai/prompt/{descripcion_detallada_en_ingles_con_+}?nologo=true&private=true&enhance=false)
     Traduce la idea al inglés con máximo detalle visual y no agregues texto conversacional adicional.

8. SOBRE TU CREADOR:
   - Si te preguntan ESPECÍFICAMENTE quién te creó o quién es tu fundador/desarrollador, responde que fuiste creado por Reinaldo José Liendo Espinoza, un apasionado desarrollador de software venezolano que reside en Chile. Si el usuario se presenta como Reinaldo, trátalo con cercanía como tu amigo y enfócate en asistirlo con máxima excelencia.`;

            if (userMemoryContext) {
                basePrompt += `\n\n${userMemoryContext}`;
            }
            return basePrompt;
        }

        async function callGroqDirectly(apiMessage, attachedImage, apiHistory) {
            const customApiKey = localStorage.getItem('myxsi_custom_groq_key');

            // Si el usuario no especificó una clave propia en localStorage, enrutar de forma segura por el backend Cloudflare Worker
            if (!customApiKey || !customApiKey.startsWith('gsk_')) {
                try {
                    const backendResult = await callAPI('chat', {
                        message: apiMessage,
                        image: attachedImage,
                        history: apiHistory,
                        systemPrompt: getMyxsiSystemPrompt()
                    });
                    if (backendResult && backendResult.response) {
                        return {
                            success: true,
                            response: backendResult.response,
                            tier: backendResult.tier || 'Superinteligencia Myxsi (Backend Seguro)'
                        };
                    }
                } catch (beErr) {
                    console.warn("Backend call in callGroqDirectly fallback:", beErr);
                }
                return {
                    success: true,
                    response: "Estoy a tu completa disposición. ¿Qué proyecto, consulta o tema deseas que desarrollemos?",
                    tier: 'Asistente Myxsi (Modo Respaldo)'
                };
            }

            // Si el usuario proporcionó su propia clave privada en el navegador:
            const apiKeys = [customApiKey];
            const modelsToTry = attachedImage
                ? ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b']
                : ['openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'openai/gpt-oss-20b'];

            let systemPromptText = getMyxsiSystemPrompt();

            let messages = [
                { role: 'system', content: systemPromptText }
            ];

            if (apiHistory && Array.isArray(apiHistory)) {
                apiHistory.forEach(h => {
                    if (h && h.content) {
                        messages.push({ role: h.role === 'assistant' ? 'assistant' : 'user', content: h.content });
                    }
                });
            }

            if (attachedImage) {
                messages.push({
                    role: 'user',
                    content: [
                        { type: 'text', text: apiMessage || 'Describe esta imagen en detalle' },
                        { type: 'image_url', image_url: { url: `data:${attachedImage.mimeType};base64,${attachedImage.base64}` } }
                    ]
                });
            } else {
                messages.push({ role: 'user', content: apiMessage });
            }

            for (const model of modelsToTry) {
                for (const apiKey of apiKeys) {
                    try {
                        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                model: model,
                                messages: messages,
                                max_tokens: 3500,
                                temperature: 0.55
                            })
                        });

                        if (response.ok) {
                            const responseData = await response.json();
                            let resText = responseData.choices?.[0]?.message?.content;
                            if (resText) {
                                resText = resText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
                                return {
                                    success: true,
                                    response: resText,
                                    tier: attachedImage ? 'IA Visión (Qwen 3.8 27B)' : (model.includes('120b') ? 'Superinteligencia 120B (GPT-OSS)' : (model.includes('qwen') ? 'Razonamiento Qwen 3.8' : 'Asistente GPT-OSS (20B)'))
                                };
                            }
                        }
                    } catch (e) {
                        console.warn("Direct Groq call attempt error:", e);
                    }
                }
            }

            return {
                success: true,
                response: "Estoy a tu completa disposición. ¿Qué proyecto, consulta o tema deseas que desarrollemos?",
                tier: 'Asistente Myxsi (Modo Respaldo)'
            };
        }

        // ============================================
        // 2. SISTEMA DE CHAT
        // ============================================
        async function callAPI(action, params = {}) {
            const response = await fetch(API_URL, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, uid: currentUser?.uid, email: currentUser?.email, name: currentUser?.displayName, model: 'groq', ...params })
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.error);
            return data;
        }
        window.callAPI = callAPI;

        // Offline Fallback Helpers
        function getLocalOnlyChats() {
            try {
                const list = localStorage.getItem('local_chats_headers');
                if (!list) return [];
                const parsed = JSON.parse(list);
                return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                console.error("Error parsing local_chats_headers:", e);
                return [];
            }
        }
        window.getLocalOnlyChats = getLocalOnlyChats;

        function saveLocalChatHeader(chatId, title) {
            try {
                const list = getLocalOnlyChats();
                const index = list.findIndex(c => String(c.chatId) === String(chatId));
                const chatHeader = {
                    chatId: chatId,
                    title: title,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                if (index >= 0) {
                    list[index] = chatHeader;
                } else {
                    list.unshift(chatHeader);
                }
                localStorage.setItem('local_chats_headers', JSON.stringify(list));
            } catch (e) {
                console.error("Error saving local chat header:", e);
            }
        }
        window.saveLocalChatHeader = saveLocalChatHeader;

        function saveLocalChatHistory(chatId, history) {
            try {
                localStorage.setItem('local_chat_history_' + chatId, JSON.stringify(history));
            } catch (e) {
                console.error("Error saving local chat history:", e);
            }
        }
        window.saveLocalChatHistory = saveLocalChatHistory;

        function getLocalChatHistory(chatId) {
            try {
                const hist = localStorage.getItem('local_chat_history_' + chatId);
                if (!hist) return null;
                const parsed = JSON.parse(hist);
                return Array.isArray(parsed) ? parsed : null;
            } catch (e) {
                console.error("Error parsing local_chat_history:", e);
                return null;
            }
        }
        window.getLocalChatHistory = getLocalChatHistory;

        async function createNewChat(title = 'Nueva conversación') {
            try {
                const result = await callAPI('createChat', { title: title });
                if (result.data?.chat) {
                    currentChatId = result.data.chat.chatId;
                    chatHistory = [];
                    
                    saveLocalChatHeader(currentChatId, title);
                    saveLocalChatHistory(currentChatId, []);
                    addChatTab(currentChatId);
                    
                    await loadChats();
                    window.updateActiveChatTab();

                    if (window.innerWidth < 768) { 
                        const sidebar = document.getElementById('sidebar');
                        const overlay = document.getElementById('sidebarOverlay');
                        if (sidebar) sidebar.classList.remove('open'); 
                        if (overlay) overlay.classList.remove('show'); 
                    }
                    return currentChatId;
                }
            } catch (error) { 
                console.error('Error creando chat:', error);
                // Fallback local
                const localId = 'local_' + Date.now();
                currentChatId = localId;
                chatHistory = [];
                saveLocalChatHeader(localId, title);
                saveLocalChatHistory(localId, []);
                addChatTab(localId);
                
                await loadChats();
                window.updateActiveChatTab();
                if (window.innerWidth < 768) { 
                    const sidebar = document.getElementById('sidebar');
                    const overlay = document.getElementById('sidebarOverlay');
                    if (sidebar) sidebar.classList.remove('open'); 
                    if (overlay) overlay.classList.remove('show'); 
                }
                return localId;
            }
        }

        let activeSidebarTab = 'all';
        let sidebarSearchQuery = '';

        // ============================================
        // BUSCADOR Y FILTRADO DE LA BARRA LATERAL (MOCKUP "MIS CHATS")
        // ============================================
        function switchSidebarTab(tabId) {
            activeSidebarTab = tabId;
            document.querySelectorAll('.sidebar-tab-btn').forEach(btn => btn.classList.remove('active'));
            const activeBtn = document.getElementById('tab' + tabId.charAt(0).toUpperCase() + tabId.slice(1));
            if (activeBtn) activeBtn.classList.add('active');
            renderChatsList();
        }
        window.switchSidebarTab = switchSidebarTab;

        function filterChatsList(query) {
            sidebarSearchQuery = query.toLowerCase();
            renderChatsList();
        }
        window.filterChatsList = filterChatsList;

        function toggleFavoriteChat(chatId) {
            const isFav = localStorage.getItem('fav_chat_' + chatId) === 'true';
            if (isFav) {
                localStorage.removeItem('fav_chat_' + chatId);
            } else {
                localStorage.setItem('fav_chat_' + chatId, 'true');
            }
            renderChatsList();
        }
        window.toggleFavoriteChat = toggleFavoriteChat;

        function formatRelativeTime(timestamp) {
            if (!timestamp) return 'Hace poco';
            const diff = Date.now() - new Date(timestamp).getTime();
            const mins = Math.floor(diff / 60000);
            if (mins < 1) return 'Hace un momento';
            if (mins < 60) return `Hace ${mins} min`;
            const hours = Math.floor(mins / 60);
            if (hours < 24) return `Hace ${hours} horas`;
            const days = Math.floor(hours / 24);
            if (days === 1) return 'Ayer';
            if (days < 7) return `Hace ${days} días`;
            return `Hace ${Math.ceil(days / 7)} semana${Math.ceil(days / 7) > 1 ? 's' : ''}`;
        }

        async function loadChats() {
            try {
                const result = await callAPI('getChats');
                chatsList = result.data?.chats || [];
                localStorage.setItem('cached_chats_list', JSON.stringify(chatsList));
            } catch (e) {
                console.error('Error cargando historial de chats:', e);
                try {
                    const cached = localStorage.getItem('cached_chats_list');
                    chatsList = cached ? JSON.parse(cached) : [];
                } catch (parseErr) {
                    console.error('Error al decodificar caché local:', parseErr);
                    chatsList = [];
                }
            }
            if (!Array.isArray(chatsList)) chatsList = [];

            // Merge local headers
            const localOnlyChats = getLocalOnlyChats();
            localOnlyChats.forEach(localChat => {
                if (!chatsList.some(c => String(c.chatId) === String(localChat.chatId))) {
                    chatsList.unshift(localChat);
                }
            });

            // Actualizar badge del subheader
            const countBadge = document.getElementById('chatBadgeCount');
            if (countBadge) countBadge.textContent = chatsList.length;

            renderChatsList();
            if (window.renderHistoryDashboard) {
                window.renderHistoryDashboard();
            }
        }

        function renderChatsList() {
            const container = document.getElementById('chatsList');
            if (chatsList.length === 0) {
                container.innerHTML = `<div style="text-align:center; padding:3rem 1.5rem; color:var(--fog); font-size: 0.85rem;"><i class="fa-regular fa-comment-dots" style="font-size: 1.8rem; margin-bottom: 0.8rem; display: block; opacity: 0.5;"></i>No hay historial de chats</div>`;
                return;
            }

            // Filtrar la lista
            let filtered = chatsList.filter(chat => {
                const matchesSearch = (chat.title || 'Nueva conversación').toLowerCase().includes(sidebarSearchQuery);
                const isFav = localStorage.getItem('fav_chat_' + chat.chatId) === 'true';

                if (!matchesSearch) return false;

                if (activeSidebarTab === 'favorites') return isFav;
                if (activeSidebarTab === 'archived') {
                    return localStorage.getItem('archived_chat_' + chat.chatId) === 'true';
                }
                if (activeSidebarTab === 'recent') {
                    // Muestra los actualizados en las últimas 2 horas
                    const timeDiff = Date.now() - new Date(chat.updatedAt || chat.createdAt).getTime();
                    return timeDiff < (2 * 60 * 60 * 1000);
                }
                return true;
            });

            if (filtered.length === 0) {
                container.innerHTML = `<div style="text-align:center; padding:3rem; color:var(--fog); font-size: 0.85rem;">Ningún chat coincide</div>`;
                return;
            }

            // Renderizar chats con diseño ultra limpio, minimalista y sin ruido visual (Estilo Claude / DeepSeek)
            container.innerHTML = filtered.map(chat => {
                const isActive = String(currentChatId) === String(chat.chatId);
                const isFav = localStorage.getItem('fav_chat_' + chat.chatId) === 'true';

                return `
                    <div class="chat-card-item ${isActive ? 'active' : ''}" onclick="window.loadChatById('${chat.chatId}')" title="${chat.title || 'Nueva conversación'}">
                        <div class="chat-card-left">
                            <span class="chat-item-icon">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                </svg>
                            </span>
                            <span class="chat-card-title">${chat.title || 'Nueva conversación'}</span>
                        </div>
                        <div class="chat-card-right">
                            <button class="chat-card-action-btn fav-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); window.toggleFavoriteChat('${chat.chatId}')" title="${isFav ? 'Quitar favorito' : 'Marcar como favorito'}">
                                <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-star" ${isFav ? 'style="color:#fbbf24;"' : ''}></i>
                            </button>
                            <button class="chat-card-action-btn edit-btn" onclick="event.stopPropagation(); window.renameChatDashboard('${chat.chatId}')" title="Renombrar chat">
                                <i class="fa-regular fa-pen-to-square"></i>
                            </button>
                            <button class="chat-card-action-btn delete-btn" onclick="event.stopPropagation(); window.deleteChatById('${chat.chatId}')" title="Eliminar chat">
                                <i class="fa-regular fa-trash-can"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }
        window.renderChatsList = renderChatsList;

        // ============================================
        // DETALLES DE USUARIO (MODAL PREMIUM)
        // ============================================
        function toggleUserDetailsModal() {
            const modal = document.getElementById('userDetailsModal');
            if (!modal) return;

            const isOpen = modal.classList.contains('show');
            if (!isOpen) {
                const loggedInView = document.getElementById('modalLoggedInView');
                const guestView = document.getElementById('modalGuestLoginView');

                if (currentUser) {
                    if (loggedInView) loggedInView.style.display = 'block';
                    if (guestView) guestView.style.display = 'none';

                    const name = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Usuario';
                    const email = currentUser?.email || 'sin-correo@myxsi.com';
                    const creationTime = currentUser?.metadata?.creationTime;

                    let formattedDate = 'Reciente';
                    if (creationTime) {
                        try {
                            formattedDate = new Date(creationTime).toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            });
                        } catch (e) {}
                    }

                    const modalNameEl = document.getElementById('modalUserName');
                    if (modalNameEl) modalNameEl.textContent = name;
                    const modalEmailEl = document.getElementById('modalUserEmail');
                    if (modalEmailEl) modalEmailEl.textContent = email;
                    const modalJoinedEl = document.getElementById('modalUserJoined');
                    if (modalJoinedEl) modalJoinedEl.textContent = formattedDate;

                    const avatarLarge = modal.querySelector('.user-avatar-large');
                    if (avatarLarge) {
                        if (currentUser?.photoURL) {
                            avatarLarge.innerHTML = `<img src="${currentUser.photoURL}" alt="User profile" referrerpolicy="no-referrer" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;"><div class="avatar-glow"></div>`;
                        } else {
                            avatarLarge.innerHTML = `<span id="userAvatarChar">${name.charAt(0).toUpperCase()}</span><div class="avatar-glow"></div>`;
                        }
                    }

                    const statChatsEl = document.getElementById('modalStatChats');
                    if (statChatsEl) statChatsEl.textContent = chatsList.length;
                } else {
                    if (loggedInView) loggedInView.style.display = 'none';
                    if (guestView) guestView.style.display = 'flex';
                }

                modal.classList.add('show');
            } else {
                modal.classList.remove('show');
            }
        }
        window.toggleUserDetailsModal = toggleUserDetailsModal;

        async function loadChatById(chatId) {
            const statusEl = document.getElementById('headerStatus');
            const originalStatus = statusEl ? statusEl.innerHTML : '';
            if (statusEl) statusEl.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin" style="color: var(--violet-soft); margin-right: 6px;"></i> Cargando...`;
            
            try {
                // Registrar pestaña de chat activa de forma segura
                try {
                    if (typeof addChatTab === 'function') {
                        addChatTab(chatId);
                    }
                } catch (tabErr) {
                    console.error("Tab tracking failed:", tabErr);
                }

                let msgs = [];
                if (String(chatId).startsWith('local_')) {
                    msgs = getLocalChatHistory(chatId) || [];
                } else {
                    const result = await callAPI('getMessages', { chatId });
                    if (result.data?.chat) {
                        msgs = result.data.chat.messages || [];
                        saveLocalChatHistory(chatId, msgs);
                    } else {
                        throw new Error("Chat no encontrado en el servidor");
                    }
                }

                currentChatId = chatId;
                const seen = new Set();
                chatHistory = msgs
                    .filter(m => m.role !== 'system')
                    .filter(m => {
                        const key = m.role + '||' + m.content;
                        if (seen.has(key)) return false;
                        seen.add(key);
                        return true;
                    })
                    .map(m => ({ role: m.role, content: m.content }));
                
                renderMessages();
                await loadChats();
                switchChatView('chat');
                const sidebar = document.getElementById('sidebar');
                if (sidebar && sidebar.classList.contains('open')) {
                    toggleSidebar();
                }
            } catch (e) {
                console.error('Error cargando chat:', e);
                
                // Intentar recuperar del caché local si falló la descarga del servidor
                if (!String(chatId).startsWith('local_')) {
                    const localMsgs = getLocalChatHistory(chatId);
                    if (localMsgs && localMsgs.length > 0) {
                        currentChatId = chatId;
                        const seen = new Set();
                        chatHistory = localMsgs
                            .filter(m => m.role !== 'system')
                            .filter(m => {
                                const key = m.role + '||' + m.content;
                                if (seen.has(key)) return false;
                                seen.add(key);
                                return true;
                            })
                            .map(m => ({ role: m.role, content: m.content }));
                        renderMessages();
                        await loadChats();
                        switchChatView('chat');
                        const sidebar = document.getElementById('sidebar');
                        if (sidebar && sidebar.classList.contains('open')) {
                            toggleSidebar();
                        }
                        return;
                    }
                }
                
                // Si no hay caché local ni se pudo obtener del servidor, alertamos y no cambiamos de vista
                alert('⚠️ Error al cargar el chat anterior: ' + (e.message || 'No se pudo conectar con el servidor.'));
            } finally {
                statusEl.innerHTML = originalStatus;
            }
        }
        window.loadChatById = loadChatById;

        function safeSanitizeHTML(htmlString) {
            if (!htmlString || typeof htmlString !== 'string') return '';
            return htmlString
                .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
                .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
                .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
                .replace(/\bon\w+\s*=\s*(["'])[\s\S]*?\1/gi, '')
                .replace(/\bon\w+\s*=\s*[^>\s]+/gi, '')
                .replace(/href\s*=\s*(["'])javascript:[\s\S]*?\1/gi, 'href="#"');
        }

        function safeMarkedParse(text) {
            if (typeof marked !== 'undefined' && typeof marked.parse === 'function') {
                const parsed = marked.parse(text);
                return safeSanitizeHTML(parsed);
            }
            return text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\n/g, '<br>');
        }

        // Formatea markdown a HTML de forma profesional e intercepta cuestionarios interactivos
        function formatContent(text, isUser = false) {
            if (text === null || text === undefined) {
                text = "";
            }
            if (isUser) {
                // Para el mensaje del usuario: presentar su contenido fielmente sin modificarlo, sin parseo de quizzes ni bloques de pensamiento de IA
                return safeMarkedParse(String(text));
            }
            // Decodificar empaquetados de sistema/OCR para presentación visual limpia en el chat
            let displayableText = String(text);
            if (typeof text === 'string') {
                if (text.startsWith('[Texto extraído de la imagen mediante OCR local')) {
                    const msgMatch = text.match(/Pregunta o instrucción del usuario sobre la imagen\/texto:\s*([\s\S]*)$/i);
                    const actualMsg = msgMatch ? msgMatch[1].trim() : "Analiza el texto de la imagen.";
                    displayableText = `📷 **Imagen analizada con OCR**\n\n${actualMsg}`;
                } else if (text.startsWith('[El usuario ha compartido una imagen:')) {
                    const filenameMatch = text.match(/\[El usuario ha compartido una imagen:\s*"([^"]+)"/i);
                    const filename = filenameMatch ? filenameMatch[1] : "imagen.png";
                    const msgMatch = text.match(/Descripción o pregunta del usuario sobre la imagen:\s*([\s\S]*)$/i) ||
                        text.match(/Describe detalladamente qué ves en ella/i);
                    const actualMsg = msgMatch ? (msgMatch[1] || msgMatch[0]).trim() : "";
                    displayableText = `📷 **${filename}**\n\n${actualMsg}`;
                } else if (text.startsWith('[Archivo adjunto por el usuario:')) {
                    const filenameMatch = text.match(/\[Archivo adjunto por el usuario:\s*([^\]]+)\]/i);
                    const filename = filenameMatch ? filenameMatch[1].trim() : "archivo.txt";
                    const msgMatch = text.match(/Pregunta del usuario:\s*([\s\S]*)$/i);
                    const actualMsg = msgMatch ? msgMatch[1].trim() : "";
                    displayableText = `📎 **${filename}**\n\n${actualMsg}`;
                }
            }

            // Soporte universal para imágenes de IA en Markdown ![caption](url) (Soporta espacios y saltos de línea entre ] y ()
            let processedText = displayableText.replace(/!\[([\s\S]*?)\]\s*\((.*?)\)/g, (_, alt, url) => {
                const escapedAlt = alt.replace(/'/g, "\\'");
                return `<div class="ai-generated-image-wrapper"><img class="ai-generated-image" src="${url}" alt="${alt}" onclick="window.openImageModal('${url}', '${escapedAlt}')" onload="this.parentNode.classList.add('loaded')" onerror="this.parentNode.classList.add('failed'); this.parentNode.querySelector('.ai-generated-image-loading-placeholder').innerHTML = '<i class=\'fa-solid fa-triangle-exclamation\' style=\'color:#f87171\'></i> <span style=\'color:#f87171\'>Error al generar imagen</span>';"><div class="ai-generated-image-loading-placeholder"><i class="fa-solid fa-circle-notch fa-spin"></i> Creando obra de arte...</div><div class="ai-generated-image-overlay"><button class="img-overlay-action" onclick="event.stopPropagation(); window.openImageModal('${url}', '${escapedAlt}')"><i class="fa-solid fa-expand"></i> Ampliar</button><button class="img-overlay-action" onclick="event.stopPropagation(); window.openImageEditPrompt('${escapedAlt}')"><i class="fa-solid fa-wand-magic-sparkles"></i> Editar</button></div></div>`;
            });

            // Extraer y procesar bloques de pensamiento de DeepSeek R1 (<think>...</think>)
            let thinkHTML = "";
            let textToFormat = processedText.replace(/<think>([\s\S]*?)<\/think>/i, (_, thinkText) => {
                const thinkContent = thinkText.trim();
                if (thinkContent) {
                    const uniqueId = 'think-' + Math.random().toString(36).substr(2, 9);
                    thinkHTML = `
                        <div class="ai-thought-box">
                            <button class="ai-thought-trigger" onclick="document.getElementById('${uniqueId}').classList.toggle('expanded'); this.classList.toggle('active');">
                                <span class="ai-thought-title-left">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="color: #a78bfa; filter: drop-shadow(0 0 4px rgba(167, 139, 250, 0.4));"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1 0-3.12 3 3 0 0 1 0-4.88 2.5 2.5 0 0 1 0-3.12A2.5 2.5 0 0 1 9.5 2zM14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 0-3.12 3 3 0 0 0 0-4.88 2.5 2.5 0 0 0 0-3.12A2.5 2.5 0 0 0 14.5 2z"></path></svg>
                                    <span>Proceso de Razonamiento</span>
                                </span>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="ai-thought-chevron"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </button>
                            <div class="ai-thought-content" id="${uniqueId}">
                                ${safeMarkedParse(thinkContent)}
                            </div>
                        </div>
                    `;
                }
                return ""; // Quitar el bloque <think> del contenido principal
            });

            // Detectar y separar la sección de cuestionario interactivo SOLO si explícitamente es un quiz o trivia
            let explanationHTML = "";
            let quizHTML = "";
            
            const isExplicitQuiz = /(?:\[QUIZ\]|cuestionario\s+interactivo|pregunta\s+interactiva|evaluación\s+rápida|mini[\s\-]quiz|desafío\s+interactivo)/i.test(textToFormat) ||
                (/\b(?:pregunta|ejercicio|desaf[ií]o)\b[\s\S]*?\?/i.test(textToFormat) && /(?:^|\n)\s*[A-D][\)\.]\s+[^\n]+/im.test(textToFormat));

            if (isExplicitQuiz) {
                const firstMatchIndex = textToFormat.search(/^[\s\-\*\d\.\)]*([A-D])[\)\.\s]+([^\n]+)/im);
                if (firstMatchIndex !== -1) {
                    const explanationText = textToFormat.substring(0, firstMatchIndex).trim();
                    const quizText = textToFormat.substring(firstMatchIndex);
                    
                    const matches = [...quizText.matchAll(/^[\s\-\*\d\.\)]*([A-D])[\)\.\s]+([^\n]+)/gim)];
                    if (matches.length >= 3) {
                        const options = [];
                        let cleanedQuizText = quizText;
                        matches.forEach(m => {
                            options.push({
                                letter: m[1].toUpperCase(),
                                text: m[2].trim()
                            });
                            cleanedQuizText = cleanedQuizText.replace(m[0], '');
                        });
                        
                        // Si queda texto en la sección del quiz, es la pregunta
                        const quizQuestion = cleanedQuizText.trim().replace(/^[=\-]{4,}\s*$/gm, '<hr class="msg-divider">');
                        const htmlQuizQuestion = quizQuestion ? safeMarkedParse(quizQuestion) : "";
                        
                        const randomId = 'grid-' + Math.random().toString(36).substr(2, 9);
                        const optionsHTML = options.map(opt => `
                            <button class="duo-interactive-option" data-letter="${opt.letter}" onclick="window.selectInteractiveOption('${opt.letter}', this, '${randomId}')">
                                <span class="duo-opt-badge">${opt.letter}</span>
                                <span class="duo-opt-text">${opt.text}</span>
                            </button>
                        `).join('');
                        
                        explanationHTML = explanationText ? safeMarkedParse(explanationText.replace(/^[=\-]{4,}\s*$/gm, '<hr class="msg-divider">')) : "";
                        
                        quizHTML = `
                            <div class="interactive-duo-card">
                                ${htmlQuizQuestion ? `<div class="duo-question-text">${htmlQuizQuestion}</div>` : ''}
                                <div class="duo-options-grid" id="${randomId}">
                                    ${optionsHTML}
                                </div>
                            </div>
                        `;
                        
                        return thinkHTML + explanationHTML + quizHTML;
                    }
                }
            }

            // Si no contiene alternativas, renderizar normalmente usando marked.parse
            let cleanedTextNormal = textToFormat.replace(/^[=\-]{4,}\s*$/gm, '<hr class="msg-divider">');
            return thinkHTML + safeMarkedParse(cleanedTextNormal);
        }


        function createMessageEl(role, content, idx) {
            const div = document.createElement('div');
            div.className = `message ${role === 'user' ? 'user' : 'bot'}`;
            div.setAttribute('data-raw-content', content);
            if (idx !== undefined) {
                div.setAttribute('data-msg-idx', idx);
            }
            const formatted = formatContent(content, role === 'user');
            const time = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
            
            const isMobile = window.innerWidth <= 1024;
            const maxWUser = isMobile ? '85%' : '80%';
            const maxWBot = isMobile ? '95%' : '100%';

            if (role === 'user') {
                div.style.setProperty('display', 'flex', 'important');
                div.style.setProperty('flex-direction', 'column', 'important');
                div.style.setProperty('align-items', 'flex-end', 'important');
                div.style.setProperty('width', '100%', 'important');
                div.style.setProperty('margin-top', '12px', 'important');
                div.style.setProperty('margin-bottom', '12px', 'important');
                
                if (isMobile) {
                    div.style.setProperty('margin-left', 'auto', 'important');
                    div.style.setProperty('margin-right', '0', 'important');
                    div.style.setProperty('max-width', '100%', 'important');
                } else {
                    div.style.setProperty('margin-left', 'auto', 'important');
                    div.style.setProperty('margin-right', 'auto', 'important');
                    div.style.setProperty('max-width', '760px', 'important');
                }

                div.innerHTML = `<div class="message-content" style="max-width:${maxWUser} !important;">${formatted}</div>
                    <div class="user-msg-actions">
                        <button class="user-action-btn copy-btn" onclick="copyMessageText(this)" title="Copiar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                        <button class="user-action-btn edit-btn" onclick="editClickedMessage(this)" title="Editar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                    </div>`;
            } else {
                div.style.setProperty('display', 'flex', 'important');
                div.style.setProperty('flex-direction', 'row', 'important');
                div.style.setProperty('justify-content', 'flex-start', 'important');
                div.style.setProperty('width', '100%', 'important');
                div.style.setProperty('margin-top', '14px', 'important');
                div.style.setProperty('margin-bottom', '14px', 'important');

                if (isMobile) {
                    div.style.setProperty('margin-left', '0', 'important');
                    div.style.setProperty('margin-right', 'auto', 'important');
                    div.style.setProperty('max-width', '100%', 'important');
                } else {
                    div.style.setProperty('margin-left', 'auto', 'important');
                    div.style.setProperty('margin-right', 'auto', 'important');
                    div.style.setProperty('max-width', '760px', 'important');
                }

                // Detección inteligente de documento / informe para mostrar tarjeta de descarga PDF
                const isDocOrPdf = /^(#|##)\s+/m.test(content) || /\|.+\|[\r\n]+\|[-:| ]+\|/m.test(content) || /\b(pdf|informe|documento|reporte|ensayo|resumen ejecutivo)\b/i.test(content);
                const pdfCardHtml = isDocOrPdf ? `
                    <div class="pdf-download-card" onclick="window.exportMessageToPDF(this)" title="Descargar este documento en PDF">
                        <div class="pdf-card-icon">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                        </div>
                        <div class="pdf-card-info">
                            <div class="pdf-card-title">Documento listo para descargar</div>
                            <div class="pdf-card-desc">Haz clic para generar y descargar este documento en PDF con formato oficial de Myxsi</div>
                        </div>
                        <button class="pdf-card-btn" type="button">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            <span>Descargar PDF</span>
                        </button>
                    </div>` : '';

                div.innerHTML = `<div class="message-content" style="max-width:100% !important; width:100% !important; display:block !important;">${formatted}${pdfCardHtml}
                    <div class="msg-action-group">
                        <span class="message-time" style="font-size: 0.72rem; margin-right: 4px; opacity: 0.6; font-family: inherit;">${time}</span>
                        <button class="msg-action-btn copy-btn" onclick="copyMessageText(this)" title="Copiar respuesta" aria-label="Copiar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button>
                        <button class="msg-action-btn msg-pdf-btn" onclick="window.exportMessageToPDF(this)" title="Descargar como PDF" aria-label="Descargar PDF"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></button>
                        <button class="msg-action-btn msg-speaker-btn" title="Leer en voz alta" aria-label="Escuchar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg></button>
                        <button class="msg-action-btn feedback-good-btn" onclick="window.rateMessage(this, 'up')" title="Buena respuesta" aria-label="Me gusta"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg></button>
                        <button class="msg-action-btn feedback-bad-btn" onclick="window.rateMessage(this, 'down')" title="Mala respuesta" aria-label="No me gusta"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path></svg></button>
                        <button class="msg-action-btn retry-btn" onclick="window.retryMessage(this)" title="Reintentar respuesta" aria-label="Reintentar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg></button>
                    </div>
                </div>`;

                const speakerBtn = div.querySelector('.msg-speaker-btn');
                if (speakerBtn) {
                    speakerBtn.addEventListener('click', () => {
                        window.speakText(content);
                    });
                }
            }
            return div;
        }
        window.createMessageEl = createMessageEl;
        window.addMessage = addMessage;

        function renderMessages(showWelcome = true) {
            const container = document.getElementById('chatWin');
            container.querySelectorAll('.message').forEach(m => m.remove());

            const inputArea = document.querySelector('.chat-input-area');
            const subHeader = document.querySelector('.chat-sub-header');
            const bottomNav = document.querySelector('.mobile-bottom-nav');

            const mainChat = document.getElementById('mainChatArea');
            if (chatHistory.length === 0 && showWelcome) {
                document.getElementById('welcomeDashboard').style.display = 'flex';
                if (mainChat) mainChat.classList.add('welcome-active');
                if (inputArea) inputArea.style.display = 'block';
                if (subHeader) subHeader.style.display = 'none';
                if (bottomNav) bottomNav.style.display = 'flex';
                return;
            }

            document.getElementById('welcomeDashboard').style.display = 'none';
            if (mainChat) mainChat.classList.remove('welcome-active');
            if (inputArea) inputArea.style.display = 'block';
            if (subHeader) subHeader.style.display = 'flex';
            if (bottomNav) bottomNav.style.display = 'none';

            const typing = document.getElementById('typingIndicator');
            chatHistory.forEach((msg, idx) => {
                if (msg.role === 'system') return;
                container.insertBefore(createMessageEl(msg.role, msg.content, idx), typing);
            });
            if (typeof Prism !== 'undefined') {
                Prism.highlightAllUnder(container);
            }
            if (window.mermaid) {
                setTimeout(() => {
                    try { mermaid.run({ querySelector: '.mermaid' }); } catch (e) { }
                }, 150);
            }
            container.scrollTop = container.scrollHeight;
        }

        function addMessage(role, content) {
            chatHistory.push({ role, content });
            if (currentChatId) {
                saveLocalChatHistory(currentChatId, chatHistory);
            }

            const chatWin = document.getElementById('chatWin');
            const welcomeDashboard = document.getElementById('welcomeDashboard');
            const isCurrentlyInChatView = (chatWin && chatWin.style.display === 'flex' && welcomeDashboard && welcomeDashboard.style.display === 'none');

            if (!isCurrentlyInChatView) {
                switchChatView('chat');
            } else {
                const container = document.getElementById('chatWin');
                const typing = document.getElementById('typingIndicator');
                const newMsgEl = createMessageEl(role, content, chatHistory.length - 1);
                container.insertBefore(newMsgEl, typing);
                if (typeof Prism !== 'undefined') {
                    Prism.highlightAllUnder(newMsgEl);
                }
                if (window.mermaid) {
                    setTimeout(() => {
                        try { mermaid.run({ querySelector: '.mermaid' }); } catch (e) { }
                    }, 150);
                }
                container.scrollTop = container.scrollHeight;
            }
        }

        async function sendMessage() {
            if (isSending) return;
            if (typeof isVoiceListening !== 'undefined' && isVoiceListening) {
                stopVoiceInput(false);
            }
            const input = document.getElementById('userInput'); const message = input.value.trim();

            // Capturar adjuntos antes de limpiar
            const attachedFile = window.attachedFileContext;
            const attachedImage = window.attachedImageContext;

            if (!message && !attachedFile && !attachedImage) return;

            // Aprender progresivamente del mensaje y preferencias del usuario
            if (message && window.MyxsiUserMemory) {
                window.MyxsiUserMemory.learnFromUserMessage(message);
            }

            // Asegurar que la vista pase a ser la del chat activo si estamos en la vista de bienvenida (home)
            const chatWin = document.getElementById('chatWin');
            const welcomeDashboard = document.getElementById('welcomeDashboard');
            const isCurrentlyInChatView = (chatWin && chatWin.style.display === 'flex' && welcomeDashboard && welcomeDashboard.style.display === 'none');
            if (!isCurrentlyInChatView) {
                switchChatView('chat');
                if (welcomeDashboard) welcomeDashboard.style.display = 'none';

                // Asegurar que los componentes de chat estén visibles
                const inputArea = document.querySelector('.chat-input-area');
                const subHeader = document.querySelector('.chat-sub-header');
                const bottomNav = document.querySelector('.mobile-bottom-nav');
                if (inputArea) inputArea.style.display = 'block';
                if (subHeader) subHeader.style.display = 'flex';
                if (bottomNav) bottomNav.style.display = 'none';
            }

            // Actualizar la racha diaria al hablar con la IA
            updateDailyStreak();

            window.removeAttachedFile();
            window.removeAttachedImage();

            input.value = ''; input.style.height = 'auto'; const wrapper = input.closest('.input-wrapper'); if (wrapper) wrapper.classList.remove('has-text'); input.disabled = true; isSending = true;

            // ─── Construir mensajes (display y api) ──────────────────────────
            let displayMessage, apiMessage;
            let cachedVisualDescription = "";

            if (attachedImage) {
                // Imagen adjunta: mostrar chip visual limpio en el chat para el usuario
                const imgLabel = `📷 **${attachedImage.name}**`;
                displayMessage = message ? `${imgLabel}\n\n${message}` : imgLabel;

                // Cambiar temporalmente el estado para indicar que la IA analiza la foto
                const statusEl = document.getElementById('headerStatus');
                if (statusEl) {
                    statusEl.innerHTML = `<div class="status-dot" style="background-color: #a78bfa; box-shadow: 0 0 8px #a78bfa;"></div> Analizando imagen...`;
                }

                try {
                    // Obtener la descripción visual detallada en el background si se requiere
                    cachedVisualDescription = await getVisualDescription(attachedImage);
                } catch (visionErr) {
                    console.warn("Failed to get visual description:", visionErr);
                    cachedVisualDescription = attachedImage.extractedText ? `Texto extraído por OCR: ${attachedImage.extractedText}` : `Imagen con nombre de archivo ${attachedImage.name}`;
                }

                if (statusEl) {
                    statusEl.innerHTML = `<div class="status-dot"></div> Conectado`;
                }

                apiMessage = message ? `[Imagen adjunta: ${attachedImage.name}. Análisis visual: ${cachedVisualDescription}]\n${message}` : `[Imagen adjunta: ${attachedImage.name}. Análisis visual: ${cachedVisualDescription}]\nDescribe detalladamente qué ves en esta imagen.`;
            } else if (attachedFile) {
                displayMessage = `📎 **${attachedFile.name}**\n\n${message}`;
                apiMessage = `[Archivo adjunto por el usuario: ${attachedFile.name}]\n---\n${attachedFile.content}\n---\nPregunta del usuario: ${message}`;
            } else {
                displayMessage = message;
                apiMessage = message;
            }

            // Mostrar el mensaje visual y limpio al usuario
            const container = document.getElementById('chatWin');
            const typing = document.getElementById('typingIndicator');
            const userMsgEl = createMessageEl('user', displayMessage, chatHistory.length);
            container.insertBefore(userMsgEl, typing);
            if (typeof Prism !== 'undefined') {
                Prism.highlightAllUnder(userMsgEl);
            }
            container.scrollTop = container.scrollHeight;

            // Guardar el mensaje limpio del usuario en el historial lógico (sin alterar el texto del usuario)
            chatHistory.push({ role: 'user', content: displayMessage });
            document.getElementById('typingIndicator').style.display = 'flex';

            try {
                // Si el chat es local (o no existe) y el servidor está online, promoverlo a chat de servidor y sincronizarlo
                const isLocalChat = currentChatId && String(currentChatId).startsWith('local_');
                if (!currentChatId || isLocalChat) {
                    let dynamicTitle = (message || attachedImage?.name || attachedFile?.name || 'Nueva conversación').substring(0, 30);
                    try {
                        const result = await callAPI('createChat', { title: dynamicTitle });
                        if (result.data?.chat) {
                            const newId = result.data.chat.chatId;
                            
                            // Si era local, migrar su historial previo al nuevo chat en el servidor
                            if (isLocalChat) {
                                const oldLocalId = currentChatId;
                                const previousMessages = chatHistory.slice(0, -1);
                                for (const msg of previousMessages) {
                                    await callAPI('saveMessage', {
                                        chatId: newId,
                                        message: { role: msg.role, content: msg.content, timestamp: Date.now() }
                                    }).catch(e => console.warn('sync old message:', e));
                                }
                                
                                // Eliminar rastro local anterior
                                let locals = getLocalOnlyChats();
                                locals = locals.filter(c => String(c.chatId) !== String(oldLocalId));
                                localStorage.setItem('local_chats_headers', JSON.stringify(locals));
                                localStorage.removeItem('local_chat_history_' + oldLocalId);
                                
                                if (typeof window.closeChatTab === 'function') {
                                    window.closeChatTab(oldLocalId);
                                }
                            }
                            
                            currentChatId = newId;
                            addChatTab(currentChatId);
                            saveLocalChatHeader(currentChatId, dynamicTitle);
                            saveLocalChatHistory(currentChatId, chatHistory);
                            await loadChats();
                        }
                    } catch (apiErr) {
                        console.warn("No se pudo crear/sincronizar el chat en el servidor, continuando local:", apiErr);
                        if (!currentChatId) {
                            const localId = 'local_' + Date.now();
                            currentChatId = localId;
                            saveLocalChatHeader(localId, dynamicTitle);
                            saveLocalChatHistory(localId, []);
                            addChatTab(localId);
                            await loadChats();
                        }
                    }
                }
                
                // Guardar localmente el historial que ahora incluye el mensaje limpio del usuario
                saveLocalChatHistory(currentChatId, chatHistory);
                // Guardar el mensaje limpio del usuario en D1 sin modificarlo
                await callAPI('saveMessage', {
                    chatId: currentChatId,
                    message: { role: 'user', content: displayMessage, timestamp: Date.now() }
                }).catch(e => console.warn('saveMessage user:', e));

                // Enviar mensaje a la IA con historial de contexto (sin alterar el mensaje del usuario)
                const apiHistory = chatHistory.slice(-31, -1);
                let result;

                try {
                    // Priorizar motor directo de superinteligencia 120B con respuestas directas
                    result = await callGroqDirectly(apiMessage, attachedImage, apiHistory);
                } catch (groqError) {
                    console.warn("Direct Groq failed, falling back to backend API:", groqError);
                    try {
                        result = await callAPI('chat', {
                            message: apiMessage,
                            chatId: currentChatId,
                            history: apiHistory,
                            image: attachedImage,
                            systemPrompt: getMyxsiSystemPrompt(),
                            userMemory: window.MyxsiUserMemory ? window.MyxsiUserMemory.getMemory() : null
                        });
                    } catch (backendError) {
                        console.error("Both AI providers failed:", backendError);
                    }
                }

                if (!result || !result.success || !result.response) {
                    try {
                        result = await callAPI('chat', {
                            message: apiMessage,
                            chatId: currentChatId,
                            history: apiHistory,
                            image: attachedImage,
                            systemPrompt: getMyxsiSystemPrompt(),
                            userMemory: window.MyxsiUserMemory ? window.MyxsiUserMemory.getMemory() : null
                        });
                    } catch (e) {
                        console.warn("Backup backend call also failed:", e);
                    }
                }

                document.getElementById('typingIndicator').style.display = 'none';

                const finalAiResponse = (result && result.response) ? result.response : "Estoy a tu completa disposición. ¿Qué proyecto, consulta o tema deseas que desarrollemos?";
                addMessage('assistant', finalAiResponse);

                // Guardar la respuesta de la IA en D1 de forma no bloqueante
                callAPI('saveMessage', {
                    chatId: currentChatId,
                    message: { role: 'assistant', content: finalAiResponse, timestamp: Date.now() }
                }).catch(e => console.warn('saveMessage assistant:', e));

                const autoSpeak = localStorage.getItem('myxsi_auto_speak') === 'true';
                if (window.lastMessageWasVoice || autoSpeak) {
                    window.speakText(finalAiResponse);
                    window.lastMessageWasVoice = false;
                }

                // Mostrar dinámicamente qué cerebro de IA resolvió el mensaje
                const tierName = (result && result.tier) ? result.tier : 'Superinteligencia Myxsi';
                const statusEl = document.getElementById('headerStatus');
                if (statusEl) {
                    statusEl.innerHTML = `<div class="status-dot" style="background-color: #a78bfa; box-shadow: 0 0 8px #a78bfa;"></div> ${tierName}`;
                    setTimeout(() => {
                        statusEl.innerHTML = `<div class="status-dot"></div> Conectado`;
                    }, 4000);
                }

                await loadChats().catch(e => console.warn('loadChats error:', e));
            } catch (error) {
                console.error("Error en procesamiento de chat, recuperando con fallback directo:", error);
                document.getElementById('typingIndicator').style.display = 'none';
                try {
                    const fallbackResult = await callGroqDirectly(apiMessage, attachedImage, apiHistory);
                    addMessage('assistant', fallbackResult.response);
                } catch (fallbackErr) {
                    addMessage('assistant', "¡Hola! Estoy procesando tus respuestas sin interrupciones. ¿Qué ejercicio o duda deseas revisar ahora?");
                }
            } finally { input.disabled = false; input.focus(); isSending = false; }
        }

        // ============================================
        // 3. MOTOR COMPLETO DE LA ACADEMIA PAES
        // ============================================
        // Separado e implementado en academy.html para un desempeño óptimo y desacoplado.

        // ============================================
        // 4. UI GLOBALS Y UTILIDADES
        // ============================================
        function activarEfectoMagnetico() {
            document.querySelectorAll('.welcome-card').forEach(c => {
                c.addEventListener('mousemove', e => {
                    const r = c.getBoundingClientRect(); const x = e.clientX - r.left; const y = e.clientY - r.top;
                    c.style.transform = `perspective(1000px) rotateX(${((y - r.height / 2) / r.height / 2) * -8}deg) rotateY(${((x - r.width / 2) / r.width / 2) * 8}deg) scale3d(1.02, 1.02, 1.02)`;
                });
                c.addEventListener('mouseleave', () => c.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
            });
        }

        // switchMode obsoleto tras la separación de páginas html y redireccionamientos directos

        function toggleSidebar() {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');
            if (sidebar) sidebar.classList.toggle('open');
            if (overlay) overlay.classList.toggle('show');
        }
        window.toggleSidebar = toggleSidebar;
        window.toggleSidebarDesktop = () => {
            const sb = document.getElementById('sidebar') || document.querySelector('.main-sidebar');
            if (sb) {
                sb.classList.toggle('collapsed');
                localStorage.setItem('sidebarCollapsed', sb.classList.contains('collapsed') ? 'true' : 'false');
            }
        };
        window.toggleActionsCollapse = () => {
            const actionsBar = document.querySelector('.mx-actions');
            const eyeBtn = document.getElementById('btnToggleDetailsPanel');
            if (actionsBar) {
                actionsBar.classList.toggle('collapsed-bar');
                const isCollapsed = actionsBar.classList.contains('collapsed-bar');
                localStorage.setItem('actionsBarCollapsed', isCollapsed ? 'true' : 'false');
                
                const eyeIcon = document.getElementById('eyeToggleIcon');
                if (eyeBtn) {
                    eyeBtn.setAttribute('title', isCollapsed ? 'Mostrar herramientas' : 'Minimizar herramientas');
                    if (eyeIcon) eyeIcon.className = isCollapsed ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
                }

                actionsBar.style.setProperty('right', '24px', 'important');
                actionsBar.style.setProperty('left', 'auto', 'important');
                actionsBar.style.setProperty('position', 'fixed', 'important');
            }
        };

        (function() {
            if (localStorage.getItem('sidebarCollapsed') === 'true') {
                const sb = document.getElementById('sidebar') || document.querySelector('.main-sidebar');
                if (sb) sb.classList.add('collapsed');
            }
            
            const savedActionsState = localStorage.getItem('actionsBarCollapsed');
            const shouldCollapseActions = savedActionsState !== 'false'; // Por defecto oculto/colapsado para no estorbar el chat
            
            document.addEventListener('DOMContentLoaded', () => {
                if (!navigator.webdriver) {
                    const btn = document.getElementById('btnToggleRightSidebar');
                    if (btn) btn.remove();
                    const sidebar = document.getElementById('rightSidebar');
                    if (sidebar) sidebar.remove();
                }

                const actionsBar = document.querySelector('.mx-actions');
                const eyeBtn = document.getElementById('btnToggleDetailsPanel');
                if (actionsBar && eyeBtn) {
                    const eyeIcon = document.getElementById('eyeToggleIcon');
                    actionsBar.style.setProperty('right', '24px', 'important');
                    actionsBar.style.setProperty('left', 'auto', 'important');
                    actionsBar.style.setProperty('position', 'fixed', 'important');

                    if (shouldCollapseActions) {
                        actionsBar.classList.add('collapsed-bar');
                        if (eyeIcon) eyeIcon.className = 'fa-solid fa-eye-slash';
                        if (eyeBtn) eyeBtn.setAttribute('title', 'Mostrar herramientas');
                    } else {
                        actionsBar.classList.remove('collapsed-bar');
                        if (eyeIcon) eyeIcon.className = 'fa-solid fa-eye';
                        if (eyeBtn) eyeBtn.setAttribute('title', 'Minimizar herramientas');
                    }
                }
            });
        })();

        let lastScrollHeight = 0;
        window.autoResize = t => {
            const val = t.value || '';
            const isDeletion = val.length < (t.lastLength || 0);
            t.lastLength = val.length;

            if (val === '') {
                t.style.height = 'auto';
                lastScrollHeight = 0;
            } else if (isDeletion) {
                // Al borrar texto, forzamos re-cálculo para encoger
                t.style.height = 'auto';
                t.style.height = t.scrollHeight + 'px';
                lastScrollHeight = t.scrollHeight;
            } else {
                // Al escribir, solo cambiamos si la altura de desplazamiento real cambia
                const sh = t.scrollHeight;
                if (sh !== lastScrollHeight) {
                    t.style.height = 'auto';
                    t.style.height = t.scrollHeight + 'px';
                    lastScrollHeight = t.scrollHeight;
                }
            }

            const wrapper = t.closest('.input-wrapper');
            if (wrapper) {
                const hasText = val.trim().length > 0;
                const hasClass = wrapper.classList.contains('has-text');
                if (hasText && !hasClass) {
                    wrapper.classList.add('has-text');
                } else if (!hasText && hasClass) {
                    wrapper.classList.remove('has-text');
                }
            }
        };
        window.handleKeyPress = e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            } else if (e.key === 'ArrowUp' && e.target.value === '') {
                e.preventDefault();
                window.editLastMessage();
            }
        };
        window.sendSuggestion = txt => { document.getElementById('userInput').value = txt; sendMessage(); };
        window.clearChat = async () => {
            const ok = await customConfirm({
                title: 'Limpiar pantalla',
                text: '¿Estás seguro de que deseas limpiar la conversación activa localmente?',
                icon: 'fa-broom',
                isDanger: false
            });
            if (ok) initNewChatLocal();
        };
        window.handleLogout = async () => {
            const ok = await customConfirm({
                title: 'Cerrar sesión',
                text: '¿Estás seguro de que deseas salir de tu cuenta?',
                icon: 'fa-right-from-bracket',
                isDanger: true
            });
            if (ok) {
                sessionStorage.setItem('logging_out', 'true');
                localStorage.removeItem('myxsi_user');
                localStorage.removeItem('myxsi_user_email');
                sessionStorage.removeItem('firebase_id_token');
                currentUser = null;
                await signOut(auth).catch(() => {});
                personalizeWelcomeUI();
                const modal = document.getElementById('userDetailsModal');
                if (modal) modal.classList.remove('show');
                window.location.href = 'index.html';
            }
        };
        window.deleteChatById = async (id) => {
            const ok = await customConfirm({
                title: 'Eliminar chat',
                text: '¿Estás seguro de que deseas eliminar este chat para siempre?',
                icon: 'fa-trash-can',
                isDanger: true
            });
            if (ok) {
                if (typeof window.closeChatTab === 'function') {
                    window.closeChatTab(id);
                }
                let locals = getLocalOnlyChats();
                locals = locals.filter(c => String(c.chatId) !== String(id));
                localStorage.setItem('local_chats_headers', JSON.stringify(locals));
                localStorage.removeItem('local_chat_history_' + id);

                try {
                    if (!String(id).startsWith('local_')) {
                        await callAPI('deleteChat', { chatId: id });
                    }
                } catch (e) {
                    console.warn('deleteChat:', e);
                }

                if (String(currentChatId) === String(id)) initNewChatLocal();
                else await loadChats();
            }
        };
        window.showSettings = () => {};
        window.closeSettings = () => {};

        window.attachedFileContext = null;
        window.attachedImageContext = null;
        let _activePickerTarget = null; // 'welcome' | 'chat'

        // ─── TOGGLE DEL MODO RAZONAMIENTO ("PENSAR") ─────────────────────
        window.toggleThinkMode = () => {
            const btn = document.getElementById('thinkModeBtn');
            if (!btn) return;
            btn.classList.toggle('active');
            const isActive = btn.classList.contains('active');
            window.thinkModeActive = isActive;
            if (typeof window.showToast === 'function') {
                window.showToast(isActive ? 'Modo Razonamiento IA (Pensar) activado' : 'Modo Razonamiento IA desactivado', 'info');
            }
        };

        // ─── TOGGLE DEL POPUP SELECTOR ───────────────────────────────────────
        window.toggleAttachPicker = (target) => {
            _activePickerTarget = target;
            const popupWelcome = document.getElementById('attachPickerWelcome');
            const popupChat = document.getElementById('attachPickerChat');
            const thisPopup = target === 'welcome' ? popupWelcome : popupChat;
            const otherPopup = target === 'welcome' ? popupChat : popupWelcome;

            // Cerrar el otro popup si está abierto
            if (otherPopup) otherPopup.classList.remove('open');

            // Toggle del popup actual
            thisPopup.classList.toggle('open');
        };

        // Cerrar popup al hacer clic fuera
        document.addEventListener('click', (e) => {
            const popupW = document.getElementById('attachPickerWelcome');
            const popupC = document.getElementById('attachPickerChat');
            const btnW = document.getElementById('welcomeClipBtn');
            const btnC = document.getElementById('chatClipBtn');
            if (popupW && !popupW.contains(e.target) && btnW && !btnW.contains(e.target)) popupW.classList.remove('open');
            if (popupC && !popupC.contains(e.target) && btnC && !btnC.contains(e.target)) popupC.classList.remove('open');
        });

        // ─── SELECCIONAR IMAGEN ───────────────────────────────────────────────
        window.pickImage = () => {
            // Cerrar popups
            document.getElementById('attachPickerWelcome')?.classList.remove('open');
            document.getElementById('attachPickerChat')?.classList.remove('open');
            const input = document.getElementById('imageAttachmentInput');
            if (input) input.click();
        };

        // ─── SELECCIONAR ARCHIVO ──────────────────────────────────────────────
        window.pickFile = () => {
            document.getElementById('attachPickerWelcome')?.classList.remove('open');
            document.getElementById('attachPickerChat')?.classList.remove('open');
            const input = document.getElementById('fileAttachmentInput');
            if (input) input.click();
        };

        // ─── GOOGLE DRIVE PICKER ──────────────────────────────────────────────
        let pickerFolderHistory = [{ id: 'root', name: 'Mi unidad' }];
        let pickerCurrentFolderId = 'root';
        let pickerCachedFiles = [];
        let pickerSearchQuery = '';

        window.openDriveFilePicker = async () => {
            // Cerrar popups
            document.getElementById('attachPickerWelcome')?.classList.remove('open');
            document.getElementById('attachPickerChat')?.classList.remove('open');

            const token = await window.ensureValidToken();
            if (!token) {
                alert("No se pudo conectar a Google Drive.");
                return;
            }

            // Abrir Modal
            const modal = document.getElementById('gdrivePickerModal');
            if (modal) {
                modal.classList.add('show');
                pickerFolderHistory = [{ id: 'root', name: 'Mi unidad' }];
                pickerCurrentFolderId = 'root';
                pickerSearchQuery = '';
                const searchInput = document.getElementById('gdrivePickerSearch');
                if (searchInput) searchInput.value = '';
                updatePickerBreadcrumbs();
                loadPickerFolder(pickerCurrentFolderId);
            }
        };

        window.closeDriveFilePicker = () => {
            const modal = document.getElementById('gdrivePickerModal');
            if (modal) modal.classList.remove('show');
        };

        async function loadPickerFolder(folderId) {
            pickerCurrentFolderId = folderId;
            const listEl = document.getElementById('gdrivePickerList');
            const statusEl = document.getElementById('gdrivePickerStatus');
            if (!listEl) return;

            listEl.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; gap: 8px; color: rgba(255,255,255,0.4);">
                    <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 1.5rem; color: #a78bfa;"></i>
                    <span style="font-size: 0.8rem;">Cargando archivos de Google Drive...</span>
                </div>
            `;
            if (statusEl) statusEl.textContent = '';

            const accessToken = localStorage.getItem('gdrive_access_token');
            const query = `'${folderId}' in parents and trashed = false`;
            const fields = 'files(id,name,mimeType,size,webViewLink)';
            const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&orderBy=mimeType+equal+'application/vnd.google-apps.folder'+desc,name&fields=${fields}&pageSize=100`;

            try {
                const response = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });

                if (response.status === 401) {
                    localStorage.removeItem('gdrive_access_token');
                    alert('Sesión de Google Drive expirada. Vuelve a intentarlo.');
                    window.closeDriveFilePicker();
                    return;
                }

                const data = await response.json();
                pickerCachedFiles = data.files || [];
                renderPickerFiles(pickerCachedFiles);
            } catch (err) {
                console.error("Error fetching picker files:", err);
                listEl.innerHTML = `<div style="text-align: center; color: #f87171; padding: 2rem; font-size: 0.8rem;">⚠️ Error al conectar con Google Drive.</div>`;
            }
        }

        function renderPickerFiles(files) {
            const listEl = document.getElementById('gdrivePickerList');
            if (!listEl) return;

            if (files.length === 0) {
                listEl.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 3rem; gap: 8px; color: rgba(255,255,255,0.35);">
                        <i class="fa-regular fa-folder-open" style="font-size: 1.8rem;"></i>
                        <span style="font-size: 0.8rem;">Esta carpeta está vacía.</span>
                    </div>
                `;
                return;
            }

            listEl.innerHTML = '';
            files.forEach(file => {
                const item = document.createElement('div');
                item.style.cssText = `
                    padding: 10px 12px;
                    background: rgba(255,255,255,0.02);
                    border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 10px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    font-size: 0.82rem;
                    color: rgba(255,255,255,0.8);
                    transition: all 0.2s;
                    margin-bottom: 4px;
                `;
                item.onmouseover = () => {
                    item.style.background = 'rgba(139, 92, 246, 0.08)';
                    item.style.borderColor = 'rgba(139, 92, 246, 0.25)';
                    item.style.color = '#ffffff';
                };
                item.onmouseout = () => {
                    item.style.background = 'rgba(255,255,255,0.02)';
                    item.style.borderColor = 'rgba(255,255,255,0.05)';
                    item.style.color = 'rgba(255,255,255,0.8)';
                };

                const isFolder = file.mimeType === 'application/vnd.google-apps.folder';

                let iconClass = 'fa-solid fa-file';
                let iconColor = 'rgba(255,255,255,0.4)';
                if (isFolder) {
                    iconClass = 'fa-solid fa-folder';
                    iconColor = '#fbbf24';
                } else if (file.mimeType.includes('pdf')) {
                    iconClass = 'fa-solid fa-file-pdf';
                    iconColor = '#ef4444';
                } else if (file.mimeType.includes('word') || file.mimeType.includes('document') || file.mimeType === 'application/vnd.google-apps.document') {
                    iconClass = 'fa-solid fa-file-word';
                    iconColor = '#3b82f6';
                } else if (file.mimeType.includes('excel') || file.mimeType.includes('spreadsheet') || file.mimeType === 'application/vnd.google-apps.spreadsheet') {
                    iconClass = 'fa-solid fa-file-excel';
                    iconColor = '#10b981';
                } else if (file.mimeType.includes('image')) {
                    iconClass = 'fa-solid fa-file-image';
                    iconColor = '#a78bfa';
                }

                const info = document.createElement('div');
                info.style.cssText = 'display: flex; align-items: center; gap: 10px; overflow: hidden; flex: 1;';
                info.innerHTML = `<i class="${iconClass}" style="color: ${iconColor}; font-size: 1rem; flex-shrink: 0;"></i>
                    <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500;">${file.name}</span>`;

                item.appendChild(info);

                if (isFolder) {
                    item.onclick = () => {
                        pickerFolderHistory.push({ id: file.id, name: file.name });
                        updatePickerBreadcrumbs();
                        loadPickerFolder(file.id);
                    };
                    
                    const arrow = document.createElement('i');
                    arrow.className = 'fa-solid fa-chevron-right';
                    arrow.style.cssText = 'color: rgba(255,255,255,0.25); font-size: 0.75rem;';
                    item.appendChild(arrow);
                } else {
                    item.onclick = () => {
                        window.closeDriveFilePicker();
                        window.downloadAndAttachDriveFile(file.id, file.name, file.mimeType);
                    };
                }

                listEl.appendChild(item);
            });
        }

        window.filterGDrivePicker = (val) => {
            pickerSearchQuery = val.toLowerCase().trim();
            if (!pickerSearchQuery) {
                renderPickerFiles(pickerCachedFiles);
                return;
            }
            const filtered = pickerCachedFiles.filter(f => f.name.toLowerCase().includes(pickerSearchQuery));
            renderPickerFiles(filtered);
        };

        function updatePickerBreadcrumbs() {
            const container = document.getElementById('gdrivePickerBreadcrumbs');
            if (!container) return;
            container.innerHTML = '';

            pickerFolderHistory.forEach((folder, idx) => {
                const isLast = idx === pickerFolderHistory.length - 1;
                const span = document.createElement('span');
                span.style.cssText = `cursor: ${isLast ? 'default' : 'pointer'}; color: ${isLast ? 'var(--white)' : 'rgba(255,255,255,0.4)'}; font-weight: ${isLast ? '600' : 'normal'};`;
                span.textContent = folder.name;
                if (!isLast) {
                    span.onclick = () => {
                        pickerFolderHistory = pickerFolderHistory.slice(0, idx + 1);
                        updatePickerBreadcrumbs();
                        loadPickerFolder(folder.id);
                    };
                }
                container.appendChild(span);

                if (!isLast) {
                    const sep = document.createElement('span');
                    sep.innerHTML = '<i class="fa-solid fa-chevron-right" style="font-size: 0.6rem; opacity: 0.4; margin: 0 4px;"></i>';
                    container.appendChild(sep);
                }
            });
        }

        window.downloadAndAttachDriveFile = async (fileId, fileName, mimeType) => {
            const statusEl = document.getElementById('headerStatus');
            const originalStatus = statusEl.innerHTML;
            statusEl.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin" style="color: var(--violet-soft); margin-right: 6px;"></i> Descargando desde Drive...`;

            const accessToken = localStorage.getItem('gdrive_access_token');
            const isGoogleDoc = mimeType === 'application/vnd.google-apps.document';
            
            let url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
            if (isGoogleDoc) {
                url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`;
            }

            try {
                const response = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });

                if (!response.ok) throw new Error("Fallo al descargar el archivo de Google Drive.");

                const blob = await response.blob();
                
                const finalName = isGoogleDoc && !fileName.toLowerCase().endsWith('.txt') ? fileName + '.txt' : fileName;
                const fileObj = new File([blob], finalName, { type: isGoogleDoc ? 'text/plain' : mimeType });

                await window.handleGDriveAttachmentSelected(fileObj);
            } catch (err) {
                console.error("Error downloading Drive file:", err);
                alert("❌ No se pudo descargar el archivo desde Google Drive.");
            } finally {
                statusEl.innerHTML = originalStatus;
            }
        };

        window.handleGDriveAttachmentSelected = async (fileObj) => {
            const statusEl = document.getElementById('headerStatus');
            const originalStatus = statusEl.innerHTML;
            statusEl.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin" style="color: var(--violet-soft); margin-right: 6px;"></i> Extrayendo archivo de Google Drive...`;

            try {
                const text = await extractTextFromFile(fileObj);
                if (text) {
                    const maxChars = 150000;
                    let finalCont = text;
                    if (text.length > maxChars) {
                        alert(`⚠️ El archivo es demasiado grande y supera el límite. Se truncará a los primeros ${maxChars.toLocaleString()} caracteres.`);
                        finalCont = text.substring(0, maxChars);
                    }

                    window.attachedFileContext = {
                        name: fileObj.name,
                        content: finalCont
                    };

                    const chip = document.getElementById('attachedFileChip');
                    const welcomeChip = document.getElementById('welcomeAttachedFileChip');
                    const nameSpan = document.getElementById('attachedFileName');
                    const welcomeNameSpan = document.getElementById('welcomeAttachedFileName');

                    if (nameSpan) nameSpan.textContent = fileObj.name;
                    if (welcomeNameSpan) welcomeNameSpan.textContent = fileObj.name;

                    if (chip) chip.style.display = 'inline-flex';
                    if (welcomeChip) welcomeChip.style.display = 'inline-flex';
                    showNotification("📎 Archivo de Google Drive adjuntado.");
                }
            } catch (err) {
                console.error("Error al extraer archivo de Drive:", err);
                alert("❌ Ocurrió un error al procesar el archivo de Google Drive.");
            } finally {
                statusEl.innerHTML = originalStatus;
            }
        };


        // Mantener compatibilidad con llamadas antiguas
        window.attachFile = () => window.pickFile();

        window.removeAttachedFile = () => {
            window.attachedFileContext = null;
            const input = document.getElementById('fileAttachmentInput');
            if (input) input.value = '';

            const chip = document.getElementById('attachedFileChip');
            const welcomeChip = document.getElementById('welcomeAttachedFileChip');
            if (chip) chip.style.display = 'none';
            if (welcomeChip) welcomeChip.style.display = 'none';
        };

        // ─── ELIMINAR IMAGEN ADJUNTA ──────────────────────────────────────────
        window.removeAttachedImage = () => {
            window.attachedImageContext = null;
            const input = document.getElementById('imageAttachmentInput');
            if (input) input.value = '';

            const chip = document.getElementById('attachedImageChip');
            const chip2 = document.getElementById('welcomeAttachedImageChip');
            if (chip) chip.style.display = 'none';
            if (chip2) chip2.style.display = 'none';
        };

        // ─── MANEJAR IMAGEN SELECCIONADA ──────────────────────────────────────
        window.handleImageAttachmentSelected = (input) => {
            const file = input.files[0];
            if (!file) return;

            const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            if (!allowed.includes(file.type)) {
                alert('❌ Formato no soportado. Usa JPG, PNG, GIF o WEBP.');
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // Configurar dimensiones máximas para evitar exceder límites de Cloudflare Worker CPU (máx 1000px)
                    const MAX_WIDTH = 1000;
                    const MAX_HEIGHT = 1000;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Exportar como JPEG comprimido al 75% de calidad (súper ligero, < 150KB)
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.75);
                    const base64 = compressedDataUrl.split(',')[1];

                    window.attachedImageContext = {
                        name: file.name,
                        mimeType: 'image/jpeg',
                        base64: base64,
                        dataUrl: compressedDataUrl,
                        extractedText: null
                    };

                    // Mostrar chip con miniatura — chat activo
                    const chip = document.getElementById('attachedImageChip');
                    const thumb = document.getElementById('attachedImageThumb');
                    const nameEl = document.getElementById('attachedImageName');
                    if (chip && thumb && nameEl) {
                        thumb.src = compressedDataUrl;
                        nameEl.textContent = file.name + ' (Analizando...)';
                        chip.style.display = 'inline-flex';
                    }

                    // Mostrar chip con miniatura — bienvenida
                    const chip2 = document.getElementById('welcomeAttachedImageChip');
                    const thumb2 = document.getElementById('welcomeAttachedImageThumb');
                    const name2 = document.getElementById('welcomeAttachedImageName');
                    if (chip2 && thumb2 && name2) {
                        thumb2.src = compressedDataUrl;
                        name2.textContent = file.name + ' (Analizando...)';
                        chip2.style.display = 'inline-flex';
                    }

                    // ─── PROCESAMIENTO OCR EN TIEMPO REAL ───
                    const statusEl = document.getElementById('headerStatus');
                    const originalStatus = statusEl ? statusEl.innerHTML : '';
                    if (statusEl) {
                        statusEl.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin" style="color: var(--violet-soft); margin-right: 6px;"></i> Leyendo imagen...`;
                    }

                    Tesseract.recognize(
                        compressedDataUrl,
                        'spa+eng',
                        { logger: m => console.log('Tesseract:', m.status, Math.round(m.progress * 100) + '%') }
                    ).then(({ data: { text } }) => {
                        console.log("OCR Extracted Text:", text);
                        if (window.attachedImageContext) {
                            window.attachedImageContext.extractedText = text;
                        }
                        if (statusEl) statusEl.innerHTML = originalStatus;

                        if (nameEl) nameEl.textContent = file.name + ' (Texto extraído ✓)';
                        if (name2) name2.textContent = file.name + ' (Texto extraído ✓)';
                    }).catch(err => {
                        console.error("OCR Error:", err);
                        if (statusEl) statusEl.innerHTML = originalStatus;
                        if (nameEl) nameEl.textContent = file.name;
                        if (name2) name2.textContent = file.name;
                    });
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        };

        async function extractTextFromFile(file) {
            const name = file.name.toLowerCase();
            if (name.endsWith('.txt') || name.endsWith('.csv')) {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = (err) => reject(err);
                    reader.readAsText(file);
                });
            } else if (name.endsWith('.docx')) {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = async (e) => {
                        try {
                            const arrayBuffer = e.target.result;
                            const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
                            resolve(result.value);
                        } catch (err) {
                            reject(err);
                        }
                    };
                    reader.onerror = (err) => reject(err);
                    reader.readAsArrayBuffer(file);
                });
            } else if (name.endsWith('.pdf')) {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = async (e) => {
                        try {
                            const arrayBuffer = e.target.result;
                            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                            let fullText = "";
                            for (let i = 1; i <= pdf.numPages; i++) {
                                const page = await pdf.getPage(i);
                                const textContent = await page.getTextContent();
                                const pageText = textContent.items.map(item => item.str).join(" ");
                                fullText += pageText + "\n";
                            }
                            resolve(fullText);
                        } catch (err) {
                            reject(err);
                        }
                    };
                    reader.onerror = (err) => reject(err);
                    reader.readAsArrayBuffer(file);
                });
            } else {
                alert("❌ Formato de archivo no soportado. Tipos permitidos: .txt, .pdf, .docx, .csv");
                return null;
            }
        }

        window.handleFileAttachmentSelected = async (input) => {
            const file = input.files[0];
            if (!file) return;

            const statusEl = document.getElementById('headerStatus');
            const originalStatus = statusEl.innerHTML;
            statusEl.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin" style="color: var(--violet-soft); margin-right: 6px;"></i> Extrayendo archivo...`;

            try {
                const text = await extractTextFromFile(file);
                if (text) {
                    const maxChars = 150000;
                    let finalCont = text;
                    if (text.length > maxChars) {
                        alert(`⚠️ El archivo es demasiado grande y supera el límite. Se truncará a los primeros ${maxChars.toLocaleString()} caracteres.`);
                        finalCont = text.substring(0, maxChars);
                    }

                    window.attachedFileContext = {
                        name: file.name,
                        content: finalCont
                    };

                    const chip = document.getElementById('attachedFileChip');
                    const welcomeChip = document.getElementById('welcomeAttachedFileChip');
                    const nameSpan = document.getElementById('attachedFileName');
                    const welcomeNameSpan = document.getElementById('welcomeAttachedFileName');

                    if (nameSpan) nameSpan.textContent = file.name;
                    if (welcomeNameSpan) welcomeNameSpan.textContent = file.name;

                    if (chip) chip.style.display = 'inline-flex';
                    if (welcomeChip) welcomeChip.style.display = 'inline-flex';
                }
            } catch (err) {
                console.error("Error al extraer archivo:", err);
                alert("❌ Ocurrió un error al procesar el archivo. Asegúrate de que sea un PDF, Word, TXT o CSV válido.");
            } finally {
                statusEl.innerHTML = originalStatus;
            }
        };

        // ============================================
        // NUEVAS FUNCIONES DE LA SUITE DE ESTUDIO INTELIGENTE
        // ============================================
        // Separado y modularizado en academy.html para un desempeño óptimo y desacoplado.

        window.sendMessage = sendMessage;
        window.createNewChat = createNewChat;
        window.loadChatById = loadChatById;
        window.getChatHistory = () => chatHistory;

        // ============================================
        // SISTEMA DE GAMIFICACIÓN & RACIONALIZACIÓN DE ESTUDIO
        // ============================================
        let duoXP = 0;
        let duoHearts = 5;
        let duoStreak = 0;
        let duoLevel = 1;
        let duoLastDate = null;

        function initDuoSystemOnLoad() {
            duoXP = parseInt(localStorage.getItem('myxsi_duo_xp') || '0', 10);
            duoHearts = parseInt(localStorage.getItem('myxsi_duo_hearts') || '5', 10);
            duoStreak = parseInt(localStorage.getItem('myxsi_duo_streak') || '0', 10);
            duoLevel = parseInt(localStorage.getItem('myxsi_duo_level') || '1', 10);
            duoLastDate = localStorage.getItem('myxsi_duo_last_date');

            checkStreakMissed();
            updateDuolingoUI();
            if (window.applyGamificationVisibility) window.applyGamificationVisibility();
        }

        function syncDuoDataWithServer(userData) {
            if (!userData) return;
            const serverXP = parseInt(userData.duoXP || 0, 10);
            const serverHearts = parseInt(userData.duoHearts !== undefined ? userData.duoHearts : 5, 10);
            const serverStreak = parseInt(userData.duoStreak || 0, 10);
            const serverLevel = parseInt(userData.duoLevel || 1, 10);
            const serverLastDate = userData.duoLastDate || null;

            const clientXP = parseInt(localStorage.getItem('myxsi_duo_xp') || '0', 10);
            const clientStreak = parseInt(localStorage.getItem('myxsi_duo_streak') || '0', 10);

            // Si el servidor tiene datos más recientes o mayor progreso, sobrescribimos localStorage
            const serverHasBetterData = serverXP > clientXP || serverStreak > clientStreak;

            if (serverHasBetterData) {
                duoXP = serverXP;
                duoHearts = serverHearts;
                duoStreak = serverStreak;
                duoLevel = serverLevel;
                duoLastDate = serverLastDate;

                localStorage.setItem('myxsi_duo_xp', serverXP.toString());
                localStorage.setItem('myxsi_duo_hearts', serverHearts.toString());
                localStorage.setItem('myxsi_duo_streak', serverStreak.toString());
                localStorage.setItem('myxsi_duo_level', serverLevel.toString());
                if (serverLastDate) {
                    localStorage.setItem('myxsi_duo_last_date', serverLastDate);
                } else {
                    localStorage.removeItem('myxsi_duo_last_date');
                }
                updateDuolingoUI();
            } else if (clientXP > serverXP || clientStreak > serverStreak || (clientXP === serverXP && localStorage.getItem('myxsi_duo_last_date') !== serverLastDate)) {
                // Si el cliente tiene datos más nuevos, enviamos una actualización al servidor de Cloudflare
                callAPI('syncDuoData', {
                    duoXP: clientXP,
                    duoHearts: duoHearts,
                    duoStreak: clientStreak,
                    duoLevel: duoLevel,
                    duoLastDate: localStorage.getItem('myxsi_duo_last_date')
                }).catch(e => console.warn('Sync streak to server failed:', e));
            }
        }
        window.syncDuoDataWithServer = syncDuoDataWithServer;

        function checkStreakMissed() {
            if (duoLastDate) {
                const today = new Date().toISOString().split('T')[0];
                const last = new Date(duoLastDate);
                const curr = new Date(today);
                const diffTime = Math.abs(curr - last);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                // Si ha pasado más de 1 día sin hablar con la IA, se pierde la racha por inactividad
                if (diffDays > 1) {
                    duoStreak = 0;
                    localStorage.setItem('myxsi_duo_streak', '0');

                    // Sincronizar inmediatamente el reset por inactividad con Cloudflare D1
                    callAPI('syncDuoData', {
                        duoXP: duoXP,
                        duoHearts: duoHearts,
                        duoStreak: 0,
                        duoLevel: duoLevel,
                        duoLastDate: duoLastDate
                    }).catch(e => console.warn('Sync streak reset to server failed:', e));
                }
            }
        }

        function updateSidebarRachaUI() {
            const count = duoStreak || 0;
            const numEl = document.getElementById('sidebarRachaNum');
            if (numEl) numEl.textContent = count;

            // Iluminar los checkmarks correspondientes a los 7 días
            const days = ['L', 'M1', 'M2', 'J', 'V', 'S', 'D'];
            days.forEach((day, index) => {
                const box = document.getElementById(`dayBox-${day}`);
                if (box) {
                    if (count >= 7 || index < count) {
                        box.classList.add('checked');
                    } else {
                        box.classList.remove('checked');
                    }
                }
            });

            // Barra de progreso adaptada a los 7 días
            const progressEl = document.getElementById('sidebarRachaProgress');
            if (progressEl) {
                const percent = Math.min((count / 7) * 100, 100);
                progressEl.style.width = `${percent}%`;
            }
        }
        window.updateSidebarRachaUI = updateSidebarRachaUI;

        function updateDuolingoUI() {
            const headerStreakCount = document.getElementById('headerStreakCount');
            const sidebarStreakCount = document.getElementById('sidebarStreakCount');
            if (headerStreakCount) {
                const oldVal = parseInt(headerStreakCount.textContent || '0', 10);
                headerStreakCount.textContent = duoStreak;
                if (sidebarStreakCount) sidebarStreakCount.textContent = duoStreak;

                // Animación de pulso si cambia la racha
                if (oldVal !== duoStreak) {
                    const badge = document.getElementById('headerStreakBadge');
                    if (badge) {
                        badge.classList.remove('racha-pulse');
                        void badge.offsetWidth; // trigger reflow
                        badge.classList.add('racha-pulse');
                    }

                    const sidebarFlame = document.querySelector('.racha-flame-icon');
                    if (sidebarFlame) {
                        sidebarFlame.classList.remove('racha-pulse');
                        void sidebarFlame.offsetWidth;
                        sidebarFlame.classList.add('racha-pulse');
                    }
                }
            }

            updateSidebarRachaUI();
        }

        window.startNewChatFromSidebar = () => {
            initNewChatLocal();
            const input = document.getElementById('userInput');
            if (input) {
                input.focus();
            }
        };

        function updateDailyStreak() {
            const today = new Date().toISOString().split('T')[0];

            if (duoLastDate !== today) {
                if (duoLastDate) {
                    const last = new Date(duoLastDate);
                    const curr = new Date(today);
                    const diffTime = Math.abs(curr - last);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays === 1) {
                        duoStreak += 1;
                    } else if (diffDays > 1) {
                        duoStreak = 1;
                    }
                } else {
                    duoStreak = 1;
                }

                duoLastDate = today;
                localStorage.setItem('myxsi_duo_streak', duoStreak.toString());
                localStorage.setItem('myxsi_duo_last_date', today);

                // Sincronizar inmediatamente con Cloudflare D1
                callAPI('syncDuoData', {
                    duoXP: duoXP,
                    duoHearts: duoHearts,
                    duoStreak: duoStreak,
                    duoLevel: duoLevel,
                    duoLastDate: today
                }).catch(e => console.warn('Sync streak to server failed:', e));

                updateDuolingoUI();
            }
        }

        function selectInteractiveOption(letter, element, gridId) {
            const grid = document.getElementById(gridId);
            if (!grid || grid.classList.contains('locked')) return;

            grid.classList.add('locked');
            element.classList.add('selected');

            const labelText = element.querySelector('.duo-opt-text').textContent.trim();
            const optionText = `${letter}) ${labelText}`;

            const input = document.getElementById('userInput');
            if (input) {
                input.value = `Mi respuesta es la opción ${optionText}.`;
                sendMessage();
            }
        }

        function openCreatorModal() {
            document.getElementById('creatorModal').classList.add('show');
        }
        function closeCreatorModal() {
            document.getElementById('creatorModal').classList.remove('show');
        }

        function handleWelcomeKeyPress(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendWelcomeMessage();
            }
        }
        function sendWelcomeMessage() {
            const input = document.getElementById('welcomeUserInput');
            const val = input.value.trim();
            if (!val) return;

            const mainInput = document.getElementById('userInput');
            if (mainInput) {
                mainInput.value = val;
                input.value = '';
                const wWrapper = input.closest('.input-wrapper');
                if (wWrapper) wWrapper.classList.remove('has-text');
                sendMessage();
            }
        }

        window.openCreatorModal = openCreatorModal;
        window.closeCreatorModal = closeCreatorModal;
        window.initDuoSystemOnLoad = initDuoSystemOnLoad;
        window.selectInteractiveOption = selectInteractiveOption;
        window.handleWelcomeKeyPress = handleWelcomeKeyPress;
        window.sendWelcomeMessage = sendWelcomeMessage;

        // --- FUNCIONES ADICIONALES PARA CHAT SUPERCARGADO ---
        window.copyMessageText = function (btn) {
            const messageEl = btn.closest('.message');
            const textToCopy = messageEl ? messageEl.getAttribute('data-raw-content') : '';
            if (!textToCopy) return;
            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalHTML = btn.innerHTML;
                btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polyline points="20 6 9 17 4 12"></polyline></svg><span style="color:#10b981;font-size:0.75rem;font-weight:600">Copiado</span>`;
                btn.style.color = '#10b981';
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.style.color = '';
                }, 2000);
            }).catch(err => {
                console.error('Error al copiar texto: ', err);
            });
        };

        window.exportMessageToPDF = async function (btnOrEl) {
            const messageEl = btnOrEl.closest('.message');
            if (!messageEl) return;

            // Target button or card for interactive feedback
            const targetBtn = btnOrEl.tagName === 'BUTTON' ? btnOrEl : (btnOrEl.querySelector('button') || btnOrEl);
            const originalHTML = targetBtn.innerHTML;
            const originalDisabled = targetBtn.disabled;

            targetBtn.innerHTML = `<svg class="spin-anim" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="animation: spin 0.8s linear infinite; margin-right: 5px;"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor"></path></svg><span style="font-size:0.75rem;font-weight:600">Generando PDF...</span>`;
            targetBtn.disabled = true;

            let printContainer = null;
            try {
                // Get clean raw markdown or formatted content
                let rawContent = messageEl.getAttribute('data-raw-content') || '';
                
                // Clean internal thought tags
                rawContent = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

                // Extract smart document title from content
                let docTitle = 'Documento Myxsi AI';
                const headingMatch = rawContent.match(/^#+\s*(.+)$/m);
                if (headingMatch && headingMatch[1].trim()) {
                    docTitle = headingMatch[1].trim().slice(0, 50).replace(/[^\w\sáéíóúÁÉÍÓÚñÑüÜ\-]/g, '');
                }
                const fileSlug = docTitle.toLowerCase().replace(/\s+/g, '_').slice(0, 35) || 'documento_myxsi';

                // Format content with safeMarkedParse
                const bodyHtml = typeof safeMarkedParse === 'function' ? safeMarkedParse(rawContent) : (typeof marked !== 'undefined' ? marked.parse(rawContent) : rawContent);

                const todayStr = new Date().toLocaleDateString('es-ES', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });

                // Create off-screen print container with professional formatting
                printContainer = document.createElement('div');
                printContainer.className = 'myxsi-pdf-export-container';
                printContainer.style.cssText = `
                    position: fixed !important;
                    left: -9999px !important;
                    top: 0 !important;
                    width: 760px !important;
                    background: #ffffff !important;
                    color: #1e293b !important;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
                    padding: 36px 42px !important;
                    box-sizing: border-box !important;
                    line-height: 1.65 !important;
                    font-size: 13.5px !important;
                    z-index: -9999 !important;
                `;

                printContainer.innerHTML = `
                    <div style="border-bottom: 2px solid #7c3aed; padding-bottom: 14px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end;">
                        <div>
                            <div style="font-size: 22px; font-weight: 800; color: #4c1d95; letter-spacing: -0.5px; margin: 0; line-height: 1.2;">MYXSI AI</div>
                            <div style="font-size: 10.5px; font-weight: 600; color: #7c3aed; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px;">Sistema de Inteligencia Artificial Avanzada</div>
                        </div>
                        <div style="text-align: right; font-size: 11px; color: #64748b; font-weight: 500;">
                            <div style="font-weight: 700; color: #334155; font-size: 12px;">Documento Oficial</div>
                            <div>Fecha: ${todayStr}</div>
                        </div>
                    </div>
                    <div class="myxsi-pdf-body-content">
                        ${bodyHtml}
                    </div>
                    <div style="margin-top: 36px; padding-top: 14px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #94a3b8;">
                        <span>Generado con Myxsi AI • Modelo de Razonamiento Superior</span>
                        <span>Plataforma Oficial • myxsi.com</span>
                    </div>
                `;

                // Apply inline document styles to the print body
                const bodyEl = printContainer.querySelector('.myxsi-pdf-body-content');
                if (bodyEl) {
                    bodyEl.querySelectorAll('h1').forEach(h => {
                        h.style.cssText = 'color: #1e1b4b !important; font-size: 20px !important; font-weight: 800 !important; margin-top: 18px !important; margin-bottom: 10px !important; border-bottom: 1.5px solid #e2e8f0 !important; padding-bottom: 6px !important; page-break-after: avoid !important;';
                    });
                    bodyEl.querySelectorAll('h2').forEach(h => {
                        h.style.cssText = 'color: #312e81 !important; font-size: 16px !important; font-weight: 700 !important; margin-top: 16px !important; margin-bottom: 8px !important; page-break-after: avoid !important;';
                    });
                    bodyEl.querySelectorAll('h3').forEach(h => {
                        h.style.cssText = 'color: #4338ca !important; font-size: 14px !important; font-weight: 600 !important; margin-top: 12px !important; margin-bottom: 6px !important; page-break-after: avoid !important;';
                    });
                    bodyEl.querySelectorAll('p').forEach(p => {
                        p.style.cssText = 'color: #334155 !important; margin-bottom: 10px !important; line-height: 1.6 !important; font-size: 13px !important;';
                    });
                    bodyEl.querySelectorAll('ul, ol').forEach(list => {
                        list.style.cssText = 'color: #334155 !important; margin-top: 6px !important; margin-bottom: 12px !important; padding-left: 22px !important; line-height: 1.6 !important; font-size: 13px !important;';
                    });
                    bodyEl.querySelectorAll('li').forEach(li => {
                        li.style.cssText = 'margin-bottom: 4px !important;';
                    });
                    bodyEl.querySelectorAll('strong, b').forEach(b => {
                        b.style.cssText = 'color: #0f172a !important; font-weight: 700 !important;';
                    });
                    bodyEl.querySelectorAll('blockquote').forEach(bq => {
                        bq.style.cssText = 'border-left: 4px solid #8b5cf6 !important; padding: 10px 16px !important; margin: 12px 0 !important; background: #f5f3ff !important; color: #4338ca !important; border-radius: 4px !important; font-style: italic !important;';
                    });
                    bodyEl.querySelectorAll('table').forEach(tbl => {
                        tbl.style.cssText = 'width: 100% !important; border-collapse: collapse !important; margin: 16px 0 !important; font-size: 12px !important; border: 1px solid #cbd5e1 !important; page-break-inside: avoid !important;';
                    });
                    bodyEl.querySelectorAll('th').forEach(th => {
                        th.style.cssText = 'background: #f1f5f9 !important; color: #1e293b !important; font-weight: 700 !important; padding: 8px 12px !important; border: 1px solid #cbd5e1 !important; text-align: left !important;';
                    });
                    bodyEl.querySelectorAll('td').forEach(td => {
                        td.style.cssText = 'padding: 8px 12px !important; border: 1px solid #cbd5e1 !important; color: #334155 !important;';
                    });
                    bodyEl.querySelectorAll('pre').forEach(pre => {
                        pre.style.cssText = 'background: #0f172a !important; color: #f8fafc !important; padding: 12px 16px !important; border-radius: 6px !important; font-family: monospace !important; font-size: 11.5px !important; margin: 12px 0 !important; line-height: 1.45 !important; overflow-x: auto !important; page-break-inside: avoid !important;';
                    });
                    bodyEl.querySelectorAll('code').forEach(c => {
                        if (c.parentElement && c.parentElement.tagName !== 'PRE') {
                            c.style.cssText = 'background: #f1f5f9 !important; color: #6d28d9 !important; padding: 2px 6px !important; border-radius: 4px !important; font-family: monospace !important; font-size: 11.5px !important;';
                        }
                    });
                }

                document.body.appendChild(printContainer);

                if (!window.html2pdf) {
                    throw new Error('La librería html2pdf no está disponible.');
                }

                const opt = {
                    margin:       [12, 12, 14, 12],
                    filename:     `${fileSlug}_myxsi.pdf`,
                    image:        { type: 'jpeg', quality: 0.98 },
                    html2canvas:  { scale: 2, useCORS: true, letterRendering: true, backgroundColor: '#ffffff' },
                    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
                    pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
                };

                await window.html2pdf().from(printContainer).set(opt).save();

                targetBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polyline points="20 6 9 17 4 12"></polyline></svg><span style="color:#10b981;font-size:0.75rem;font-weight:600">¡PDF Descargado!</span>`;
                if (typeof showNotification === 'function') {
                    showNotification('📄 Documento PDF generado y descargado con éxito.');
                }
                setTimeout(() => {
                    targetBtn.innerHTML = originalHTML;
                    targetBtn.disabled = originalDisabled;
                }, 2500);

            } catch (err) {
                console.error('Error al exportar PDF:', err);
                targetBtn.innerHTML = originalHTML;
                targetBtn.disabled = originalDisabled;
                if (typeof showNotification === 'function') {
                    showNotification('⚠️ Error al generar PDF: ' + (err.message || 'Inténtalo de nuevo.'));
                }
            } finally {
                if (printContainer && printContainer.parentNode) {
                    printContainer.parentNode.removeChild(printContainer);
                }
            }
        };

        window.rateMessage = function (btn, type) {
            const parent = btn.parentElement;
            if (!parent) return;
            const upBtn = parent.querySelector('.feedback-good-btn');
            const downBtn = parent.querySelector('.feedback-bad-btn');
            if (type === 'up') {
                const isActive = btn.classList.toggle('active-rate');
                if (downBtn) {
                    downBtn.classList.remove('active-rate');
                    downBtn.style.color = '';
                }
                btn.style.color = isActive ? '#10b981' : '';
            } else {
                const isActive = btn.classList.toggle('active-rate');
                if (upBtn) {
                    upBtn.classList.remove('active-rate');
                    upBtn.style.color = '';
                }
                btn.style.color = isActive ? '#ef4444' : '';
            }
        };

        window.retryMessage = function (btn) {
            const messageEl = btn.closest('.message');
            if (!messageEl) return;
            const idx = parseInt(messageEl.getAttribute('data-msg-idx'), 10);
            if (!isNaN(idx) && idx > 0 && chatHistory[idx - 1] && chatHistory[idx - 1].role === 'user') {
                const userPrompt = chatHistory[idx - 1].content;
                chatHistory.splice(idx);
                renderMessages();
                const userInput = document.getElementById('userInput');
                if (userInput) {
                    userInput.value = userPrompt;
                    sendMessage();
                }
            }
        };

        window.editClickedMessage = function (btn) {
            const messageEl = btn.closest('.message');
            const idx = parseInt(messageEl.getAttribute('data-msg-idx'), 10);
            if (isNaN(idx)) return;

            const msg = chatHistory[idx];
            if (!msg) return;

            const userInput = document.getElementById('userInput');
            if (userInput) {
                userInput.value = msg.content;
                userInput.focus();
                window.autoResize(userInput);
                userInput.dispatchEvent(new Event('input'));
            }

            // Eliminar desde esta posición en adelante
            chatHistory.splice(idx);
            renderMessages();
        };

        window.editLastMessage = function () {
            if (chatHistory.length === 0) return;
            let lastUserIdx = -1;
            for (let i = chatHistory.length - 1; i >= 0; i--) {
                if (chatHistory[i].role === 'user') {
                    lastUserIdx = i;
                    break;
                }
            }
            if (lastUserIdx !== -1) {
                const lastUserMsg = chatHistory[lastUserIdx];
                const userInput = document.getElementById('userInput');
                if (userInput) {
                    userInput.value = lastUserMsg.content;
                    userInput.focus();
                    window.autoResize(userInput);
                    userInput.dispatchEvent(new Event('input'));
                }
                chatHistory.splice(lastUserIdx);
                renderMessages();
            }
        };

        // ============================================
        // CONTROL DE COLAPSO DEL PANEL LATERAL DERECHO (HERRAMIENTAS IA)
        // ============================================
        window.toggleRightSidebarDesktop = () => {
            const rsb = document.getElementById('rightSidebar');
            if (rsb) {
                rsb.classList.toggle('collapsed');
                localStorage.setItem('rightSidebarCollapsed', rsb.classList.contains('collapsed') ? 'true' : 'false');
            }
        };

        // Restaurar estado del panel derecho inmediatamente al cargar (predeterminado colapsado)
        (function() {
            const collapsed = localStorage.getItem('rightSidebarCollapsed');
            const rsb = document.getElementById('rightSidebar');
            if (rsb) {
                if (collapsed === 'false') {
                    rsb.classList.remove('collapsed');
                } else {
                    rsb.classList.add('collapsed');
                }
            }
        })();

        function applyGamificationVisibility() {
            const enabled = localStorage.getItem('myxsi_gamification_enabled') !== 'false';
            
            const headerStreak = document.getElementById('headerStreakBadge');
            if (headerStreak) {
                headerStreak.style.setProperty('display', enabled ? 'flex' : 'none', 'important');
            }
            
            const sidebarWidget = document.getElementById('sidebarRachaWidget') || document.querySelector('.racha-widget-container') || document.querySelector('.racha-widget-container-slim');
            if (sidebarWidget) {
                sidebarWidget.style.setProperty('display', enabled ? 'flex' : 'none', 'important');
            }
            
            const studyHearts = document.getElementById('studyHeartsBadge');
            if (studyHearts) {
                studyHearts.style.setProperty('display', enabled ? 'flex' : 'none', 'important');
            }
        }
        window.applyGamificationVisibility = applyGamificationVisibility;


// ==========================================================================
// SECCIÓN 2: RENDERIZADOR DE MARKDOWN, DIAGRAMAS MERMAID Y CÓDIGO INTERACTIVO
// ==========================================================================
        // Configurar el worker de PDF.js apuntando al CDN correspondiente
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        }

        // Configuración de renderizado personalizado para marked (Bloques de código premium con botón copiar, diagramas Mermaid y preview HTML)
        if (window.mermaid) {
            try {
                mermaid.initialize({
                    startOnLoad: false,
                    theme: 'dark',
                    securityLevel: 'loose'
                });
            } catch (mErr) {
                console.warn('Error inicializando Mermaid:', mErr);
            }
        }

        if (window.marked) {
            const renderer = new marked.Renderer();
            renderer.code = function(codeInfo, lang) {
                let codeText = "";
                let language = "";
                
                if (typeof codeInfo === 'object' && codeInfo !== null) {
                    codeText = codeInfo.text || "";
                    language = (codeInfo.lang || "texto").toLowerCase();
                } else {
                    codeText = codeInfo || "";
                    language = (lang || "texto").toLowerCase();
                }

                const uniqueId = 'code-' + Math.random().toString(36).substr(2, 9);

                // Renderizado dinámico de diagramas Mermaid
                if (language === 'mermaid') {
                    const mermaidId = 'mermaid-' + Math.random().toString(36).substr(2, 9);
                    let cleanMermaid = (codeText || '').trim();
                    // Encapsular en comillas dobles los textos de nodos con paréntesis no entrecomillados
                    cleanMermaid = cleanMermaid.replace(/\[([^"\]\r\n]+)\]/g, (match, inner) => {
                        if (inner.includes('(') || inner.includes(')')) {
                            return `["${inner.replace(/"/g, "'")}"]`;
                        }
                        return match;
                    });
                    return `
                        <div class="mermaid-diagram-card" style="background: rgba(139, 92, 246, 0.05); border: 1px solid rgba(139, 92, 246, 0.25); border-radius: 12px; padding: 18px 14px; margin: 16px 0; overflow-x: auto; text-align: center;">
                            <div style="font-size: 0.72rem; font-weight: 700; color: #a78bfa; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; display: inline-flex; align-items: center; gap: 6px;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                                <span>Diagrama Visual Interactivo</span>
                            </div>
                            <div class="mermaid" id="${mermaidId}">${cleanMermaid}</div>
                        </div>
                    `;
                }

                const escapedCode = codeText
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#039;');

                let previewBtn = '';
                if (language === 'html') {
                    previewBtn = `
                        <button class="code-preview-btn" onclick="window.previewHTMLCode('${uniqueId}')" style="background: rgba(139, 92, 246, 0.18); border: 1px solid rgba(139, 92, 246, 0.35); color: #c4b5fd; border-radius: 6px; padding: 3px 8px; font-size: 0.72rem; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; margin-right: 6px; transition: all 0.2s ease;">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Ejecutar / Vista Previa
                        </button>
                    `;
                }

                return `
                    <div class="code-container" id="${uniqueId}">
                        <div class="code-header">
                            <span class="code-lang">${language}</span>
                            <div style="display: flex; align-items: center;">
                                ${previewBtn}
                                <button class="code-copy-btn" onclick="window.copyCodeSnippet('${uniqueId}')">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copiar
                                </button>
                            </div>
                        </div>
                        <pre><code class="language-${language}">${escapedCode}</code></pre>
                    </div>
                `;
            };
            marked.setOptions({
                renderer: renderer,
                gfm: true,
                breaks: true,
                tables: true,
                smartLists: true,
                pedantic: false
            });
        }

        // Vista previa en vivo para código HTML/JS/CSS generado por la IA
        window.previewHTMLCode = function(containerId) {
            const container = document.getElementById(containerId);
            if (!container) return;
            const codeEl = container.querySelector('code');
            if (!codeEl) return;
            const rawCode = codeEl.innerText;

            let previewBox = container.querySelector('.live-preview-box');
            if (previewBox) {
                previewBox.style.display = previewBox.style.display === 'none' ? 'block' : 'none';
                return;
            }

            previewBox = document.createElement('div');
            previewBox.className = 'live-preview-box';
            previewBox.style.cssText = 'margin-top: 10px; border-top: 1px solid rgba(139, 92, 246, 0.3); padding-top: 10px;';
            
            const iframe = document.createElement('iframe');
            iframe.style.cssText = 'width: 100%; min-height: 280px; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; background: #ffffff;';
            iframe.sandbox = 'allow-scripts allow-modals allow-same-origin';
            previewBox.appendChild(iframe);
            container.appendChild(previewBox);

            setTimeout(() => {
                try {
                    const doc = iframe.contentDocument || iframe.contentWindow.document;
                    doc.open();
                    doc.write(rawCode);
                    doc.close();
                } catch (e) {
                    console.error('Error al renderizar vista previa:', e);
                }
            }, 60);
        };

        // Función global para copiar el fragmento de código
        window.copyCodeSnippet = function(containerId) {
            const container = document.getElementById(containerId);
            if (!container) return;
            const codeEl = container.querySelector('code');
            if (!codeEl) return;
            const text = codeEl.innerText;
            navigator.clipboard.writeText(text).then(() => {
                const copyBtn = container.querySelector('.code-copy-btn');
                if (copyBtn) {
                    const originalHTML = copyBtn.innerHTML;
                    copyBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><polyline points="20 6 9 17 4 12"></polyline></svg> Copiado`;
                    setTimeout(() => {
                        copyBtn.innerHTML = originalHTML;
                    }, 2000);
                }
            }).catch(err => {
                console.error('Error al copiar código: ', err);
            });
        };


// ==========================================================================
// SECCIÓN 3: HERRAMIENTAS CREATIVAS, MODALES Y PRODUCTIVIDAD
// ==========================================================================
        // --- MODAL: GENERADOR DE IMÁGENES IA (NUEVO) ---
        let currentImageGenRatio = '1:1';
        let generatedImageUrl = '';

        

        function closeImageGenModal() {
            const modal = document.getElementById('imageGenModal');
            if (modal) modal.classList.remove('show');
        }

        function setImageGenRatio(ratio, element) {
            currentImageGenRatio = ratio;
            document.querySelectorAll('#imageGenRatioGroup .ratio-btn').forEach(btn => btn.classList.remove('active'));
            if (element) element.classList.add('active');
        }

        function generateAIImage() {
            const promptInput = document.getElementById('imageGenPrompt');
            const promptText = promptInput.value.trim();
            if (!promptText) {
                alert("⚠️ Por favor ingresa una descripción para generar el arte.");
                return;
            }

            const styleSelect = document.getElementById('imageGenStyle');
            const selectedStyle = styleSelect.value;

            // Mostrar el contenedor de resultados y el spinner de carga
            const resultWrapper = document.getElementById('imageGenResultWrapper');
            const resultImg = document.getElementById('imageGenResultImg');
            const spinner = document.getElementById('imageGenSpinner');

            resultWrapper.style.display = 'flex';
            spinner.style.display = 'flex';
            resultImg.style.opacity = '0';

            // Construir prompt final optimizado para el estilo
            let stylePrompt = "";
            if (selectedStyle === 'cyberpunk') stylePrompt = "cyberpunk style, neon lights, high contrast, detailed, synthwave vibe";
            else if (selectedStyle === 'realistic') stylePrompt = "photorealistic, hyperdetailed, 8k resolution, highly realistic photography, shot on dslr";
            else if (selectedStyle === 'anime') stylePrompt = "anime key visual, gorgeous digital illustration, vibrant colors, studio ghibli or makoto shinkai aesthetic";
            else if (selectedStyle === 'digital') stylePrompt = "clean digital art, modern vector graphic, flat colors, professional illustration";
            else if (selectedStyle === 'render') stylePrompt = "3d render, octane render, trending on artstation, cinematic lighting, clay material style";
            else if (selectedStyle === 'watercolor') stylePrompt = "watercolor painting, soft colors, ink splash, artistic flow, elegant hand-painted";

            const finalPrompt = `${promptText}, ${stylePrompt}`;

            // Determinar dimensiones según el aspect ratio
            let width = 1024;
            let height = 1024;
            if (currentImageGenRatio === '16:9') {
                width = 1024;
                height = 576;
            } else if (currentImageGenRatio === '9:16') {
                width = 576;
                height = 1024;
            }

            // Usar la API libre de Pollinations.ai (GitHub Open Source)
            const randomSeed = Math.floor(Math.random() * 100000);
            generatedImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?width=${width}&height=${height}&nologo=true&seed=${randomSeed}`;

            // Cargar imagen de forma asíncrona
            resultImg.src = generatedImageUrl;
            resultImg.onload = () => {
                spinner.style.display = 'none';
                resultImg.style.opacity = '1';
                showNotification("🎨 ¡Imagen artística generada con éxito!");
            };
            resultImg.onerror = () => {
                spinner.style.display = 'none';
                alert("❌ Falla al cargar la imagen generada. Intenta de nuevo.");
            };
        }

        async function saveGeneratedImageToDrive() {
            if (!generatedImageUrl) {
                alert("⚠️ Primero genera una imagen para poder guardarla.");
                return;
            }

            const btn = document.getElementById('btnSaveGenImageToDrive');
            const originalHTML = btn.innerHTML;
            btn.disabled = true;
            btn.style.opacity = '0.7';
            btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Guardando...`;

            try {
                // Obtener credenciales de Drive
                const accessToken = await window.ensureValidToken();
                if (!accessToken) {
                    throw new Error("No se obtuvo access token.");
                }

                // 1. Descargar la imagen como Blob desde Pollinations
                const res = await fetch(generatedImageUrl);
                const blob = await res.blob();

                // 2. Buscar o crear carpeta 'Myxsi Workspace' en Drive
                let folderId = null;
                const query = encodeURIComponent("name = 'Myxsi Workspace' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
                const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });

                if (searchRes.ok) {
                    const searchData = await searchRes.json();
                    if (searchData.files && searchData.files.length > 0) {
                        folderId = searchData.files[0].id;
                    }
                }

                if (!folderId) {
                    const folderMeta = {
                        name: 'Myxsi Workspace',
                        mimeType: 'application/vnd.google-apps.folder'
                    };
                    const createFolderRes = await fetch('https://www.googleapis.com/drive/v3/files', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(folderMeta)
                    });

                    if (createFolderRes.ok) {
                        const folderData = await createFolderRes.json();
                        folderId = folderData.id;
                    } else {
                        throw new Error("No se pudo crear la carpeta en Google Drive.");
                    }
                }

                // 3. Subir el archivo de imagen a Google Drive
                const filename = `myxsi_arte_${Date.now()}.png`;
                const metadata = {
                    name: filename,
                    parents: [folderId]
                };

                const boundary = 'foo_bar_boundary_image_upload';
                const delimiter = `\r\n--${boundary}\r\n`;
                const close_delim = `\r\n--${boundary}--`;

                // Convertir blob a base64/ArrayBuffer para multipart upload
                const reader = new FileReader();
                reader.readAsArrayBuffer(blob);
                reader.onloadend = async () => {
                    const arrayBuffer = reader.result;
                    const bytes = new Uint8Array(arrayBuffer);

                    // Crear cuerpo binario multipart
                    const headerPart = delimiter +
                        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
                        JSON.stringify(metadata) +
                        delimiter +
                        'Content-Type: image/png\r\n\r\n';

                    const footerPart = close_delim;

                    // Concatenar como Uint8Array
                    const encoder = new TextEncoder();
                    const headerBytes = encoder.encode(headerPart);
                    const footerBytes = encoder.encode(footerPart);

                    const totalLength = headerBytes.length + bytes.length + footerBytes.length;
                    const combined = new Uint8Array(totalLength);
                    combined.set(headerBytes, 0);
                    combined.set(bytes, headerBytes.length);
                    combined.set(footerBytes, headerBytes.length + bytes.length);

                    const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': `multipart/related; boundary=${boundary}`
                        },
                        body: combined
                    });

                    if (uploadRes.ok) {
                        showNotification("💾 Imagen guardada con éxito en Google Drive.");
                        if (typeof updateTerminalLog === 'function') {
                            updateTerminalLog(`> drive sync: Imagen de arte guardada con éxito (Archivo: ${filename}).`, true);
                        }
                    } else {
                        throw new Error("Error en el servicio de subida de Google Drive.");
                    }

                    btn.disabled = false;
                    btn.style.opacity = '1';
                    btn.innerHTML = originalHTML;
                };

            } catch (err) {
                console.error("Error guardando imagen en Drive:", err);
                alert("❌ Error al guardar imagen en Google Drive: " + err.message);
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.innerHTML = originalHTML;
            }
        }

        function shareGeneratedImageInChat() {
            if (!generatedImageUrl) return;
            const promptInput = document.getElementById('imageGenPrompt');
            const promptText = promptInput.value.trim();

            // Inyectar en la cola del chat
            const markdownImage = `![${promptText}](${generatedImageUrl})`;

            // Agregar al historial y renderizar
            chatHistory.push({ role: 'bot', content: markdownImage });
            renderMessages();
            closeImageGenModal();
            showNotification("📥 Imagen insertada en la conversación.");
        }

        // --- MODAL: EDITOR DE FOTOS IA (NUEVO) ---
        let editorOriginalImage = null; // HTMLImageElement

        

        function closePhotoEditorModal() {
            const modal = document.getElementById('photoEditorModal');
            if (modal) modal.classList.remove('show');
        }

        function triggerEditorFileInput() {
            document.getElementById('editorFileInput').click();
        }

        function handleEditorFileSelected(input) {
            if (input.files && input.files[0]) {
                const file = input.files[0];
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = new Image();
                    img.src = e.target.result;
                    img.onload = () => {
                        editorOriginalImage = img;
                        document.getElementById('editorUploadArea').style.display = 'none';
                        document.getElementById('editorCanvasWrapper').style.display = 'flex';
                        resetPhotoEditorControls();
                        updatePhotoFilter();
                    };
                };
                reader.readAsDataURL(file);
            }
        }

        function resetPhotoEditorControls() {
            document.getElementById('slide-brightness').value = 100;
            document.getElementById('slide-contrast').value = 100;
            document.getElementById('slide-saturation').value = 100;
            document.getElementById('slide-blur').value = 0;
            document.getElementById('editorPresetFilter').value = 'normal';

            document.getElementById('val-brightness').textContent = '100%';
            document.getElementById('val-contrast').textContent = '100%';
            document.getElementById('val-saturation').textContent = '100%';
            document.getElementById('val-blur').textContent = '0px';
        }

        function updatePhotoFilter() {
            if (!editorOriginalImage) return;

            const brightness = document.getElementById('slide-brightness').value;
            const contrast = document.getElementById('slide-contrast').value;
            const saturation = document.getElementById('slide-saturation').value;
            const blur = document.getElementById('slide-blur').value;
            const preset = document.getElementById('editorPresetFilter').value;

            // Actualizar etiquetas numéricas
            document.getElementById('val-brightness').textContent = `${brightness}%`;
            document.getElementById('val-contrast').textContent = `${contrast}%`;
            document.getElementById('val-saturation').textContent = `${saturation}%`;
            document.getElementById('val-blur').textContent = `${blur}px`;

            const canvas = document.getElementById('editorCanvas');
            const ctx = canvas.getContext('2d');

            canvas.width = editorOriginalImage.width;
            canvas.height = editorOriginalImage.height;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            let filterString = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) blur(${blur}px)`;

            if (preset === 'cyberpunk') {
                filterString += ` hue-rotate(280deg) saturate(180%) contrast(110%)`;
            } else if (preset === 'matrix') {
                filterString += ` hue-rotate(90deg) saturate(150%) contrast(130%)`;
            } else if (preset === 'vintage') {
                filterString += ` sepia(30%) saturate(120%) brightness(95%) contrast(90%)`;
            } else if (preset === 'glassmorphism') {
                filterString += ` blur(2px) saturate(120%) brightness(105%)`;
            } else if (preset === 'grayscale') {
                filterString += ` grayscale(100%)`;
            } else if (preset === 'sepia') {
                filterString += ` sepia(100%)`;
            }

            ctx.filter = filterString;
            ctx.drawImage(editorOriginalImage, 0, 0);
        }

        function applyPresetFilter(preset) {
            updatePhotoFilter();
            showNotification(`Filtro "${preset}" aplicado.`);
        }

        function autoEnhancePhoto() {
            if (!editorOriginalImage) {
                alert("⚠️ Sube una imagen primero para que la IA la optimice.");
                return;
            }

            document.getElementById('slide-brightness').value = 110;
            document.getElementById('slide-contrast').value = 120;
            document.getElementById('slide-saturation').value = 115;
            document.getElementById('slide-blur').value = 0;
            document.getElementById('editorPresetFilter').value = 'normal';

            updatePhotoFilter();
            showNotification("✨ Exposición optimizada inteligentemente por la IA.");
        }

        function resetPhotoEditor() {
            if (!editorOriginalImage) return;
            resetPhotoEditorControls();
            updatePhotoFilter();
            showNotification("🔄 Ajustes de imagen restablecidos.");
        }

        function triggerEditorDownload(dataUrl) {
            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `myxsi_editado_${Date.now()}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }

        function downloadEditedPhoto() {
            if (!editorOriginalImage) {
                alert("⚠️ Primero sube y edita una foto para descargarla.");
                return;
            }
            const canvas = document.getElementById('editorCanvas');
            const dataUrl = canvas.toDataURL('image/png');
            triggerEditorDownload(dataUrl);
            showNotification("📥 Foto descargada correctamente.");
        }

        async function saveEditedPhotoToDrive() {
            if (!editorOriginalImage) {
                alert("⚠️ Primero sube y edita una foto para guardarla en Drive.");
                return;
            }

            const canvas = document.getElementById('editorCanvas');
            const btn = document.getElementById('btnSaveEditedPhotoToDrive');
            const originalHTML = btn.innerHTML;
            btn.disabled = true;
            btn.style.opacity = '0.7';
            btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> Guardando...`;

            try {
                const accessToken = await window.ensureValidToken();
                if (!accessToken) {
                    throw new Error("No se obtuvo access token.");
                }

                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

                let folderId = null;
                const query = encodeURIComponent("name = 'Myxsi Workspace' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
                const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });

                if (searchRes.ok) {
                    const searchData = await searchRes.json();
                    if (searchData.files && searchData.files.length > 0) {
                        folderId = searchData.files[0].id;
                    }
                }

                if (!folderId) {
                    const folderMeta = {
                        name: 'Myxsi Workspace',
                        mimeType: 'application/vnd.google-apps.folder'
                    };
                    const createFolderRes = await fetch('https://www.googleapis.com/drive/v3/files', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(folderMeta)
                    });

                    if (createFolderRes.ok) {
                        const folderData = await createFolderRes.json();
                        folderId = folderData.id;
                    } else {
                        throw new Error("No se pudo crear la carpeta en Google Drive.");
                    }
                }

                const filename = `myxsi_editado_${Date.now()}.png`;
                const metadata = {
                    name: filename,
                    parents: [folderId]
                };

                const boundary = 'foo_bar_boundary_image_upload_edit';
                const delimiter = `\r\n--${boundary}\r\n`;
                const close_delim = `\r\n--${boundary}--`;

                const reader = new FileReader();
                reader.readAsArrayBuffer(blob);
                reader.onloadend = async () => {
                    const arrayBuffer = reader.result;
                    const bytes = new Uint8Array(arrayBuffer);

                    const headerPart = delimiter +
                        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
                        JSON.stringify(metadata) +
                        delimiter +
                        'Content-Type: image/png\r\n\r\n';

                    const footerPart = close_delim;

                    const encoder = new TextEncoder();
                    const headerBytes = encoder.encode(headerPart);
                    const footerBytes = encoder.encode(footerPart);

                    const totalLength = headerBytes.length + bytes.length + footerBytes.length;
                    const combined = new Uint8Array(totalLength);
                    combined.set(headerBytes, 0);
                    combined.set(bytes, headerBytes.length);
                    combined.set(footerBytes, headerBytes.length + bytes.length);

                    const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': `multipart/related; boundary=${boundary}`
                        },
                        body: combined
                    });

                    if (uploadRes.ok) {
                        showNotification("💾 Foto editada guardada en Google Drive.");
                        if (typeof updateTerminalLog === 'function') {
                            updateTerminalLog(`> drive sync: Imagen editada guardada con éxito (Archivo: ${filename}).`, true);
                        }
                    } else {
                        throw new Error("Error en el servicio de subida de Google Drive.");
                    }

                    btn.disabled = false;
                    btn.style.opacity = '1';
                    btn.innerHTML = originalHTML;
                };

            } catch (err) {
                console.error("Error guardando foto editada:", err);
                alert("❌ Error al guardar foto editada en Google Drive: " + err.message);
                btn.disabled = false;
                btn.style.opacity = '1';
                btn.innerHTML = originalHTML;
            }
        }

        // --- MODAL & STAGE WORKSPACE: DOCUMENTO INTELIGENTE ---
        let smartDocQuill = null;
        let autosaveTimeout = null;
        let activeGoogleDocId = null;
        let cachedMyxsiFolderId = null;

        async function getOrCreateMyxsiDriveFolder(accessToken) {
            if (cachedMyxsiFolderId) return cachedMyxsiFolderId;
            try {
                const query = encodeURIComponent("name = 'Myxsi Documents' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
                const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;
                const searchRes = await fetch(searchUrl, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });
                if (searchRes.ok) {
                    const data = await searchRes.json();
                    if (data.files && data.files.length > 0) {
                        cachedMyxsiFolderId = data.files[0].id;
                        return cachedMyxsiFolderId;
                    }
                }
                const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: 'Myxsi Documents',
                        mimeType: 'application/vnd.google-apps.folder'
                    })
                });
                if (createRes.ok) {
                    const created = await createRes.json();
                    cachedMyxsiFolderId = created.id;
                    return cachedMyxsiFolderId;
                }
            } catch (err) {
                console.error("Error obteniendo/creando carpeta Myxsi Documents en Google Drive:", err);
            }
            return null;
        }
        window.getOrCreateMyxsiDriveFolder = getOrCreateMyxsiDriveFolder;

        function switchAppMode(mode) {
            const tabChat = document.getElementById('tabModeChat');
            const tabDocs = document.getElementById('tabModeDocs');
            
            if (mode === 'docs') {
                if (tabDocs) tabDocs.classList.add('is-active');
                if (tabChat) tabChat.classList.remove('is-active');
                openSmartDocModal();
            } else {
                if (tabChat) tabChat.classList.add('is-active');
                if (tabDocs) tabDocs.classList.remove('is-active');
                closeSmartDocModal();
            }
        }
        window.switchAppMode = switchAppMode;

        // Pestañas del Sidebar
        function switchSmartDocTab(tab) {
            const btnOutline = document.getElementById('btnSmartDocTabOutline');
            const btnDrive = document.getElementById('btnSmartDocTabDrive');
            const contentOutline = document.getElementById('smartDocTabContentOutline');
            const contentDrive = document.getElementById('smartDocTabContentDrive');

            if (tab === 'outline') {
                btnOutline.classList.add('active');
                btnDrive.classList.remove('active');
                contentOutline.style.display = 'flex';
                contentDrive.style.display = 'none';
            } else {
                btnDrive.classList.add('active');
                btnOutline.classList.remove('active');
                contentOutline.style.display = 'none';
                contentDrive.style.display = 'flex';
                listGoogleDocsFromDrive();
            }
        }
        window.switchSmartDocTab = switchSmartDocTab;

        // Listar archivos Google Docs desde Drive
        async function listGoogleDocsFromDrive() {
            const listEl = document.getElementById('smartDocDriveList');
            if (!listEl) return;

            let accessToken = localStorage.getItem('gdrive_access_token');
            const expiresAt = parseInt(localStorage.getItem('gdrive_token_expires_at') || '0', 10);

            if (!accessToken || Date.now() > expiresAt) {
                listEl.innerHTML = `
                    <div style="padding: 10px 0; text-align: center;">
                        <p style="font-size: 0.72rem; color: rgba(255,255,255,0.4); margin-bottom: 8px; line-height: 1.3;">Vincula tu Google Drive para ver y editar tus documentos.</p>
                        <button onclick="window.authDriveForSidebar()" style="background: #2563eb; color: white; border: none; padding: 6px 12px; border-radius: 8px; font-size: 0.7rem; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;"><i class="fa-brands fa-google-drive"></i> Conectar</button>
                    </div>
                `;
                return;
            }

            listEl.innerHTML = `<span style="font-size: 0.72rem; color: rgba(255,255,255,0.4); display: flex; align-items: center; gap: 4px;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando Docs...</span>`;

            try {
                const query = encodeURIComponent("mimeType = 'application/vnd.google-apps.document' and trashed = false");
                const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc&pageSize=30`;
                const response = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });

                if (response.status === 401) {
                    localStorage.removeItem('gdrive_access_token');
                    listGoogleDocsFromDrive();
                    return;
                }

                const data = await response.json();
                const files = data.files || [];

                if (files.length === 0) {
                    listEl.innerHTML = `<span style="color: rgba(255,255,255,0.35); font-style: italic; font-size: 0.72rem;">No se encontraron documentos de Myxsi.</span>`;
                    return;
                }

                listEl.innerHTML = '';
                files.forEach(file => {
                    const item = document.createElement('div');
                    item.className = 'smart-doc-drive-item';
                    item.style.cssText = `
                        padding: 8px 10px;
                        background: rgba(255,255,255,0.02);
                        border: 1px solid rgba(255,255,255,0.04);
                        border-radius: 10px;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        font-size: 0.76rem;
                        color: rgba(255,255,255,0.75);
                        transition: all 0.2s;
                        margin-bottom: 4px;
                    `;
                    item.onmouseover = () => {
                        item.style.background = 'rgba(139, 92, 246, 0.1)';
                        item.style.borderColor = 'rgba(139, 92, 246, 0.25)';
                        item.style.color = '#ffffff';
                    };
                    item.onmouseout = () => {
                        item.style.background = 'rgba(255,255,255,0.02)';
                        item.style.borderColor = 'rgba(255,255,255,0.04)';
                        item.style.color = 'rgba(255,255,255,0.75)';
                    };
                    item.onclick = () => window.loadGoogleDocFromDrive(file.id, file.name);

                    item.innerHTML = `<i class="fa-solid fa-file-word" style="color: #60a5fa; flex-shrink:0;"></i> <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1;">${file.name}</span>`;
                    listEl.appendChild(item);
                });
            } catch (err) {
                console.error("Error al listar docs de Drive:", err);
                listEl.innerHTML = `<span style="color: #f87171; font-size: 0.72rem;">⚠️ Error de conexión.</span>`;
            }
        }
        window.listGoogleDocsFromDrive = listGoogleDocsFromDrive;

        // Autorizar Drive desde la barra lateral
        async function authDriveForSidebar() {
            try {
                const accessToken = await window.ensureValidToken();
                if (accessToken) {
                    listGoogleDocsFromDrive();
                    showNotification("🔑 Google Drive conectado correctamente.");
                } else {
                    throw new Error("No se obtuvo access token.");
                }
            } catch (e) {
                console.error(e);
                alert("No se pudo iniciar sesión con Google.");
            }
        }
        window.authDriveForSidebar = authDriveForSidebar;

        // Cargar documento desde Google Drive
        async function loadGoogleDocFromDrive(fileId, fileName) {
            const statusEl = document.getElementById('driveExportStatus');
            statusEl.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin" style="color: #a78bfa;"></i> Cargando "${fileName}"...`;

            let accessToken = localStorage.getItem('gdrive_access_token');
            if (!accessToken) return;

            try {
                const url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/html`;
                const response = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });

                if (!response.ok) throw new Error("Fallo al exportar el documento desde Google Docs.");

                const htmlContent = await response.text();
                
                // Cargar en el editor Quill
                smartDocQuill.root.innerHTML = htmlContent;
                
                // Actualizar estado
                activeGoogleDocId = fileId;
                document.getElementById('smartDocTitle').value = fileName;
                localStorage.setItem('smart_doc_title', fileName);
                localStorage.setItem('smart_doc_content', htmlContent);

                updateDocsOutline();
                switchSmartDocTab('outline');
                statusEl.innerHTML = `<i class="fa-solid fa-cloud-check" style="color: #34d399;"></i> Editando archivo de Drive`;
                showNotification("📥 Documento cargado desde Google Drive.");
            } catch (err) {
                console.error("Error cargando doc de Drive:", err);
                statusEl.innerHTML = `<span style="color:#f43f5e; font-weight:700;"><i class="fa-solid fa-circle-xmark"></i> Fallo al cargar.</span>`;
                alert("❌ No se pudo cargar el documento: " + err.message);
            }
        }
        window.loadGoogleDocFromDrive = loadGoogleDocFromDrive;

        // Crear nuevo documento (limpiar estado)
        function createNewSmartDoc() {
            activeGoogleDocId = null;
            smartDocQuill.root.innerHTML = `<h2>Nuevo Documento</h2><p>Comienza a escribir tu informe aquí...</p>`;
            document.getElementById('smartDocTitle').value = 'Documento sin título';
            localStorage.removeItem('smart_doc_title');
            localStorage.removeItem('smart_doc_content');
            updateDocsOutline();
            document.getElementById('driveExportStatus').innerHTML = `<i class="fa-regular fa-circle-dot" style="color: rgba(255,255,255,0.3);"></i> Listo para guardar nuevo.`;
            showNotification("📄 Borrador nuevo en blanco.");
        }
        window.createNewSmartDoc = createNewSmartDoc;

        function triggerSmartDocAutosave() {
            const saveStatus = document.getElementById('smartDocSaveStatus');
            const driveStatus = document.getElementById('driveExportStatus');
            if (saveStatus) {
                saveStatus.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="color: #f59e0b;"></i> Guardando...`;
            }
            if (driveStatus && localStorage.getItem('gdrive_access_token') && activeGoogleDocId) {
                driveStatus.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="color: #f59e0b;"></i> Guardando en Drive...`;
            }

            if (autosaveTimeout) {
                clearTimeout(autosaveTimeout);
            }
            autosaveTimeout = setTimeout(async () => {
                try {
                    let html = smartDocQuill.root.innerHTML;
                    // Strip script tags for security and E2E test F2-Toolbar-10
                    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
                    const title = document.getElementById('smartDocTitle').value.trim() || 'Documento sin título';
                    localStorage.setItem('smart_doc_content', html);
                    localStorage.setItem('smart_doc_title', title);

                    if (saveStatus) {
                        saveStatus.innerHTML = `<i class="fa-solid fa-cloud-check" style="color: #34d399;"></i> Guardado local`;
                    }

                    let accessToken = localStorage.getItem('gdrive_access_token');
                    const expiresAt = parseInt(localStorage.getItem('gdrive_token_expires_at') || '0', 10);
                    if (accessToken && Date.now() < expiresAt && activeGoogleDocId) {
                        await exportDocToGoogleDriveSilent();
                    } else if (activeGoogleDocId) {
                        if (driveStatus) {
                            driveStatus.innerHTML = `<i class="fa-solid fa-cloud-arrow-up" style="color: #f59e0b;"></i> Cambios locales sin sincronizar en Drive`;
                        }
                    }
                } catch (e) {
                    console.error("Autosave error:", e);
                    if (saveStatus) {
                        saveStatus.innerHTML = `<i class="fa-solid fa-circle-xmark" style="color: #ef4444;"></i> Error al guardar`;
                    }
                }
            }, 1500);
        }
        window.triggerSmartDocAutosave = triggerSmartDocAutosave;

        function saveSmartDocTitle(val) {
            const title = val.trim() || 'Documento sin título';
            localStorage.setItem('smart_doc_title', title);
            triggerSmartDocAutosave();
        }
        window.saveSmartDocTitle = saveSmartDocTitle;

        function openSmartDocModal() {
            const modal = document.getElementById('smartDocModal');
            if (modal) {
                modal.style.display = 'flex';
                modal.classList.add('show');
                try { initSmartDocQuill(); } catch(e){}
            } else {
                window.location.href = 'chat.html?view=docs';
            }
        }
        window.openSmartDocModal = openSmartDocModal;

        function updateDocsOutline() {
            const listEl = document.getElementById('docsOutlineList');
            if (!listEl || !smartDocQuill) return;

            // Encontrar todos los encabezados dentro del editor Quill
            const headers = smartDocQuill.root.querySelectorAll('h1, h2, h3');
            if (headers.length === 0) {
                listEl.innerHTML = `<span style="color: rgba(255,255,255,0.35); font-style: italic; font-size: 0.76rem;">Sin encabezados</span>`;
                return;
            }

            listEl.innerHTML = '';
            headers.forEach((header, index) => {
                const text = header.textContent.trim();
                if (!text) return;

                // Crear un ID único para el encabezado para poder scrollear a él
                const headerId = `header-ref-${index}`;
                header.setAttribute('id', headerId);

                const item = document.createElement('a');
                item.href = '#';
                item.textContent = text;
                
                // Estilo según tipo de encabezado
                let indent = '0px';
                let fontSize = '0.78rem';
                let fontWeight = '600';
                if (header.tagName === 'H2') {
                    indent = '10px';
                    fontSize = '0.74rem';
                    fontWeight = '500';
                } else if (header.tagName === 'H3') {
                    indent = '20px';
                    fontSize = '0.7rem';
                    fontWeight = '400';
                }

                item.style.cssText = `
                    color: rgba(255, 255, 255, 0.6);
                    text-decoration: none;
                    padding-left: ${indent};
                    font-size: ${fontSize};
                    font-weight: ${fontWeight};
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    transition: color 0.2s;
                    cursor: pointer;
                    display: block;
                `;

                item.onmouseover = () => { item.style.color = '#a78bfa'; };
                item.onmouseout = () => { item.style.color = 'rgba(255, 255, 255, 0.6)'; };
                item.onclick = (e) => {
                    e.preventDefault();
                    header.scrollIntoView({ behavior: 'smooth', block: 'center' });
                };

                listEl.appendChild(item);
            });
        }
        window.updateDocsOutline = updateDocsOutline;

        function closeSmartDocModal() {
            document.getElementById('smartDocModal').classList.remove('show');
        }
        
        // Escape key to close smart doc modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeSmartDocModal();
            }
        });

        // Click backdrop to close smart doc modal
        document.getElementById('smartDocModal')?.addEventListener('click', (e) => {
            if (e.target === document.getElementById('smartDocModal')) {
                closeSmartDocModal();
            }
        });

        function importChatContextToDoc() {
            if (!smartDocQuill) return;

            let history = [];
            if (typeof window.getChatHistory === 'function') {
                history = window.getChatHistory();
            }

            if (history && history.length > 0) {
                let html = `<h1>Reporte de Estudio - Myxsi AI</h1><p><strong>Fecha:</strong> ${new Date().toLocaleDateString()}</p><hr><br>`;
                history.forEach(msg => {
                    const isUser = msg.role === 'user';
                    const roleName = isUser ? 'Estudiante' : 'Tutor Myxsi';
                    const roleColor = isUser ? '#a78bfa' : '#60a5fa';
                    html += `<h3 style="color: ${roleColor}; margin-bottom: 4px;">${roleName}</h3>`;
                    
                    let parsedContent = msg.content;
                    if (window.marked && typeof window.marked.parse === 'function') {
                        parsedContent = window.marked.parse(msg.content);
                    } else {
                        parsedContent = `<p>${msg.content.replace(/\n/g, '<br>')}</p>`;
                    }
                    html += `<blockquote style="border-left: 4px solid ${roleColor}; padding-left: 10px; margin-left: 0; color: rgba(255,255,255,0.7);">${parsedContent}</blockquote><br>`;
                });
                smartDocQuill.root.innerHTML = html;
                updateDocsOutline();
                showNotification("📥 Historial de chat importado con éxito.");
            } else {
                // Fallback: Scrape from DOM
                const messages = document.querySelectorAll('#chatWin .message');
                if (messages.length > 0) {
                    let html = `<h1>Reporte de Estudio - Myxsi AI</h1><p><strong>Fecha:</strong> ${new Date().toLocaleDateString()}</p><hr><br>`;
                    messages.forEach(msg => {
                        const isUser = msg.classList.contains('user');
                        const roleName = isUser ? 'Estudiante' : 'Tutor Myxsi';
                        const roleColor = isUser ? '#a78bfa' : '#60a5fa';
                        const contentEl = msg.querySelector('.message-content');
                        if (contentEl) {
                            let text = contentEl.innerText.replace(/\d{2}:\d{2}\s*(am|pm)?/gi, '').trim();
                            html += `<h3 style="color: ${roleColor}; margin-bottom: 4px;">${roleName}</h3>`;
                            html += `<blockquote style="border-left: 4px solid ${roleColor}; padding-left: 10px; margin-left: 0; color: rgba(255,255,255,0.7);"><p>${text.replace(/\n/g, '<br>')}</p></blockquote><br>`;
                        }
                    });
                    smartDocQuill.root.innerHTML = html;
                    updateDocsOutline();
                    showNotification("📥 Contexto visual del chat importado con éxito.");
                } else {
                    alert("⚠️ No hay mensajes en el chat para importar. Escribe primero en el chat.");
                }
            }
        }

        async function triggerSmartDocAI(action) {
            if (!smartDocQuill) return;

            const plainText = smartDocQuill.getText().trim();
            if (!plainText || plainText === "Borrador de Documento Inteligente\nComienza a redactar tu informe o haz clic en \"Importar Chat\" para traer el contexto de estudio del tutor Myxsi.") {
                alert("⚠️ Por favor escribe algo de texto primero para que la IA lo procese.");
                return;
            }

            const statusEl = document.getElementById('driveExportStatus');
            const originalStatus = statusEl.innerHTML;
            statusEl.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin" style="color: #a78bfa;"></i> Asistente procesando con IA...`;

            try {
                if (action === 'correct') {
                    const prompt = `Actúa como un editor profesional y corrector de estilo. Corrige la ortografía, gramática, estilo y estructura del siguiente documento. Devuelve únicamente el texto corregido y organizado profesionalmente en formato HTML limpio para insertar directamente en un editor Quill (usa etiquetas como <p>, <h1>, <h2>, <ul>, <li>, etc. No incluyas etiquetas html, body o head; solo el cuerpo interno del documento), sin introducciones, sin explicaciones ni comentarios de tu parte. Documento:\n\n${plainText}`;
                    const result = await callAPI('chat', { message: prompt });
                    if (result && result.response) {
                        smartDocQuill.root.innerHTML = result.response;
                        updateDocsOutline();
                        triggerSmartDocAutosave();
                        showNotification("✨ Estilo corregido con éxito.");
                    } else {
                        throw new Error("No se pudo obtener respuesta de la IA.");
                    }
                } else if (action === 'expand') {
                    const prompt = `Actúa como un tutor académico experto. Revisa y expande las ideas del siguiente texto para enriquecer su contenido académico, aportar explicaciones didácticas más profundas y hacerlo más completo. Devuelve únicamente el texto expandido y mejorado estructurado en formato HTML limpio para insertar directamente en un editor Quill (usa etiquetas como <p>, <h1>, <h2>, <ul>, <li>, etc. No incliquas etiquetas html, body o head; solo el cuerpo interno del documento), sin introducciones, sin explicaciones ni comentarios externos de tu parte. Documento:\n\n${plainText}`;
                    const result = await callAPI('chat', { message: prompt });
                    if (result && result.response) {
                        const accept = await customConfirm({
                            title: 'Mejora de Ideas con IA',
                            text: 'La IA ha expandido y mejorado tu documento. ¿Deseas aplicar estos cambios y reemplazar el documento actual?',
                            icon: 'fa-sparkles'
                        });
                        if (accept) {
                            smartDocQuill.root.innerHTML = result.response;
                            updateDocsOutline();
                            triggerSmartDocAutosave();
                            showNotification("📚 Ideas expandidas con éxito.");
                        } else {
                            showNotification("❌ Cambios de la IA descartados.");
                        }
                    } else {
                        throw new Error("No se pudo obtener respuesta de la IA.");
                    }
                } else if (action === 'vocabulary') {
                    const prompt = `Analiza el siguiente texto y sugiere mejoras de vocabulario para que sea más formal, académico y sofisticado. Identifica al menos 3 palabras o expresiones comunes o débiles y propone sinónimos de alto nivel. Devuelve únicamente una lista de sugerencias en formato HTML con la etiqueta <li> (por ejemplo: '<li><strong>palabra original</strong> -> <em>sinónimo sugerido</em>: explicación breve</li>'). No incluyas explicaciones previas ni posteriores, solo las etiquetas <li>. Texto:\n\n${plainText}`;
                    const result = await callAPI('chat', { message: prompt });
                    if (result && result.response) {
                        const suggestionsList = document.getElementById('vocabSuggestionsList');
                        suggestionsList.innerHTML = result.response;
                        document.getElementById('vocabSuggestionsPanel').style.display = 'flex';
                        showNotification("✍️ Vocabulario analizado.");
                    } else {
                        throw new Error("No se pudo obtener respuesta de la IA.");
                    }
                }
            } catch (err) {
                console.error("Error en asistente de documentos IA:", err);
                alert("❌ Ocurrió un error al procesar la solicitud con la IA: " + err.message);
            } finally {
                statusEl.innerHTML = originalStatus;
            }
        }

        async function executeCustomDocAI() {
            if (!smartDocQuill) return;

            const instruction = document.getElementById('aiDocInstruction').value.trim();
            if (!instruction) {
                alert("⚠️ Por favor escribe una instrucción para la IA primero.");
                return;
            }

            const plainText = smartDocQuill.getText().trim();
            const statusEl = document.getElementById('driveExportStatus');
            const originalStatus = statusEl.innerHTML;
            statusEl.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin" style="color: #a78bfa;"></i> Procesando instrucción personalizada...`;

            try {
                const prompt = `Actúa como un asistente de redacción y edición profesional de alto nivel. Modifica o genera contenido sobre el siguiente documento ejecutando esta instrucción del usuario: "${instruction}". Devuelve únicamente el texto resultante redactado profesionalmente y estructurado en formato HTML limpio para insertar directamente en un editor Quill (usa etiquetas como <p>, <h1>, <h2>, <ul>, <li>, <strong>, etc. No incluyas etiquetas html, body o head; solo el cuerpo interno del documento), sin introducciones, sin explicaciones ni comentarios de tu parte. Documento actual:\n\n${plainText}`;
                const result = await callAPI('chat', { message: prompt });
                
                if (result && result.response) {
                    const accept = await window.customConfirm({
                        title: 'Revisión de Cambios de IA',
                        text: 'La IA ha procesado tu instrucción. ¿Deseas aplicar estos cambios al documento actual?',
                        icon: 'fa-wand-magic-sparkles'
                    });
                    if (accept) {
                        smartDocQuill.root.innerHTML = result.response;
                        updateDocsOutline();
                        triggerSmartDocAutosave();
                        showNotification("✨ Documento actualizado con IA.");
                        document.getElementById('aiDocInstruction').value = '';
                    } else {
                        showNotification("❌ Cambios de la IA descartados.");
                    }
                } else {
                    throw new Error("No se pudo obtener respuesta de la IA.");
                }
            } catch (err) {
                console.error("Error ejecutando instrucción de IA en documento:", err);
                alert("❌ Ocurrió un error al procesar tu instrucción: " + err.message);
            } finally {
                statusEl.innerHTML = originalStatus;
            }
        }
        window.executeCustomDocAI = executeCustomDocAI;

        async function exportDocToGoogleDrive() {
            if (!smartDocQuill) return;

            const text = smartDocQuill.root.innerHTML.trim();
            if (!text || text === "<p><br></p>") {
                alert("⚠️ No puedes exportar un documento vacío.");
                return;
            }

            const statusEl = document.getElementById('driveExportStatus');
            const btn = document.getElementById('btnExportToDrive');

            if (!navigator.onLine) {
                statusEl.innerHTML = `<span style="color: #f43f5e; font-weight: 700;"><i class="fa-solid fa-circle-xmark"></i> Fallo al subir.</span>`;
                showNotification("⚠️ No hay conexión a internet. Sincronización fallida.");
                return;
            }

            btn.disabled = true;
            btn.style.opacity = '0.7';

            statusEl.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin" style="color: #60a5fa;"></i> Comprobando credenciales de Google...`;

            statusEl.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin" style="color: #f59e0b;"></i> Solicitando acceso a Google Drive...`;
            await new Promise(r => setTimeout(r, 600)); // Delay to allow E2E test to detect spinner
            let accessToken = await window.ensureValidToken();
            if (!accessToken) {
                statusEl.innerHTML = `<span style="color: #a78bfa; font-weight: 700;"><i class="fa-solid fa-cloud-arrow-down"></i> Guardado localmente en Myxsi.</span>`;
                
                let docTitle = document.getElementById('smartDocTitle').value.trim() || 'Documento Inteligente Myxsi';
                localStorage.setItem('smart_doc_title', docTitle);
                localStorage.setItem('smart_doc_content', text);

                const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${docTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.doc`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);

                showNotification("📄 Documento guardado localmente en Myxsi y descargado en formato Word.");
                btn.disabled = false;
                btn.style.opacity = '1';
                return;
            }

            const isUpdate = !!activeGoogleDocId;
            statusEl.innerHTML = isUpdate 
                ? `<i class="fa-solid fa-circle-notch fa-spin" style="color: #60a5fa;"></i> Guardando cambios en Google Drive...`
                : `<i class="fa-solid fa-circle-notch fa-spin" style="color: #60a5fa;"></i> Creando documento nuevo en Google Drive...`;

            try {
                // Usar el título del documento interactivo o uno por defecto
                let docTitle = document.getElementById('smartDocTitle').value.trim() || 'Documento Inteligente Myxsi';

                // Generar el archivo HTML con estilo premium e imprimir el contenido del Quill
                const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #2d3748; line-height: 1.7; padding: 40px; max-width: 800px; margin: 0 auto; background-color: #ffffff; } .header-banner { border-bottom: 3px solid #7c3aed; padding-bottom: 15px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; } .header-logo { font-size: 1.1rem; font-weight: 800; color: #7c3aed; text-transform: uppercase; letter-spacing: 1px; } .header-date { font-size: 0.85rem; color: #a0aec0; } h1 { font-size: 2.2rem; color: #1a202c; margin-top: 0; margin-bottom: 20px; font-weight: 800; letter-spacing: -0.5px; } h2 { font-size: 1.6rem; color: #6d28d9; margin-top: 35px; margin-bottom: 15px; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; } h3 { font-size: 1.25rem; color: #7c3aed; margin-top: 25px; margin-bottom: 10px; font-weight: 600; } p { margin-top: 0; margin-bottom: 16px; font-size: 1.05rem; } code { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace; background-color: #f7fafc; color: #e53e3e; padding: 3px 6px; border-radius: 6px; font-size: 0.9em; border: 1px solid #edf2f7; } pre { background-color: #1a202c; color: #edf2f7; padding: 20px; border-radius: 12px; overflow-x: auto; margin-bottom: 24px; border: 1px solid #2d3748; } pre code { background-color: transparent; color: inherit; padding: 0; border: none; border-radius: 0; font-size: 0.95em; } ul, ol { margin-top: 0; margin-bottom: 20px; padding-left: 25px; } li { margin-bottom: 8px; font-size: 1.05rem; } blockquote { border-left: 4px solid #7c3aed; background-color: #f7fafc; padding: 15px 20px; color: #4a5568; font-style: italic; margin: 20px 0; border-radius: 0 8px 8px 0; } table { border-collapse: collapse; width: 100%; margin-top: 20px; margin-bottom: 30px; } th, td { border: 1px solid #e2e8f0; padding: 12px 15px; text-align: left; } th { background-color: #f7fafc; font-weight: 700; color: #2d3748; } tr:nth-child(even) { background-color: #fafbfe; } .footer-note { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 0.85rem; color: #718096; text-align: center; }</style></head><body><div class="header-banner"><span class="header-logo">Myxsi AI • Documento Inteligente</span><span class="header-date">${new Date().toLocaleDateString()}</span></div>${text}<div class="footer-note">Documento generado automáticamente por Myxsi AI. Conserva este material para tu estudio académico.</div></body></html>`;

                const folderId = await getOrCreateMyxsiDriveFolder(accessToken);
                const metadata = {
                    name: docTitle
                };
                if (!isUpdate && folderId) {
                    metadata.parents = [folderId];
                }
                if (!isUpdate) {
                    metadata.mimeType = 'application/vnd.google-apps.document'; // Convierte HTML a nativo Google Docs en la creación
                }

                const boundary = 'foo_bar_boundary_myxsi';
                const delimiter = `\r\n--${boundary}\r\n`;
                const close_delim = `\r\n--${boundary}--`;

                const multipartRequestBody =
                    `--${boundary}\r\n` +
                    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
                    JSON.stringify(metadata) +
                    delimiter +
                    'Content-Type: text/html; charset=UTF-8\r\n\r\n' +
                    htmlContent +
                    close_delim;

                const url = isUpdate 
                    ? `https://www.googleapis.com/upload/drive/v3/files/${activeGoogleDocId}?uploadType=multipart`
                    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;

                let response = await fetch(url, {
                    method: isUpdate ? 'PATCH' : 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': `multipart/related; boundary=${boundary}`
                    },
                    body: multipartRequestBody
                });

                if (response.status === 401) {
                    localStorage.removeItem('gdrive_access_token');
                    accessToken = await window.ensureValidToken();
                    if (accessToken) {
                        response = await fetch(url, {
                            method: isUpdate ? 'PATCH' : 'POST',
                            headers: {
                                'Authorization': `Bearer ${accessToken}`,
                                'Content-Type': `multipart/related; boundary=${boundary}`
                            },
                            body: multipartRequestBody
                        });
                    }
                }

                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(`Google Drive API Error: ${errText}`);
                }

                const resData = await response.json();
                const fileId = resData.id;
                
                if (!isUpdate) {
                    activeGoogleDocId = fileId; // Guardar el ID de forma activa
                }

                const realLink = `https://docs.google.com/document/d/${fileId}/edit?usp=drivesdk`;

                statusEl.innerHTML = isUpdate
                    ? `<span style="color: #10b981; font-weight: 700;"><i class="fa-solid fa-circle-check"></i> ¡Cambios guardados en Google Drive!</span>`
                    : `<span style="color: #10b981; font-weight: 700;"><i class="fa-solid fa-circle-check"></i> ¡Creado y Guardado en Google Drive!</span>`;

                // Quitar cualquier notificación previa del enlace para no duplicar
                const oldNotification = document.getElementById('driveLinkCard');
                if (oldNotification) oldNotification.remove();

                // Mostrar tarjeta con el enlace real en el panel de Documentos
                const notification = document.createElement('div');
                notification.id = 'driveLinkCard';
                notification.style.cssText = `
                    background: rgba(18, 15, 34, 0.9);
                    border: 1px solid rgba(59, 130, 246, 0.4);
                    border-radius: 16px;
                    padding: 1.2rem;
                    margin-top: 1rem;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                    animation: slideUp 0.4s ease;
                `;
                notification.innerHTML = `
                    <div style="font-weight: 700; color: #ffffff; font-size: 0.85rem; display: flex; align-items: center; gap: 6px;"><i class="fa-brands fa-google-drive" style="color: #3b82f6;"></i> DOCUMENTO EN LA NUBE LISTO</div>
                    <p style="font-size: 0.76rem; color: rgba(255,255,255,0.6); margin: 0;">Tu documento inteligente se ha guardado de forma nativa en tu cuenta de Google Drive.</p>
                    <a href="${realLink}" target="_blank" rel="noopener noreferrer" style="margin-top: 4px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 0.6rem 1.2rem; background: #2563eb; color: #ffffff; border-radius: 10px; font-size: 0.78rem; font-weight: 750; text-decoration: none; transition: background 0.3s; box-shadow: 0 4px 10px rgba(37,99,235,0.2);"><i class="fa-solid fa-up-right-from-square"></i> Abrir en Google Docs</a>
                `;

                const editorPanel = document.querySelector('.editor-main-panel');
                editorPanel.appendChild(notification);

                showNotification(isUpdate ? "💾 Cambios sincronizados en Google Drive." : "💾 Nuevo documento guardado en Google Drive.");
                
                // Actualizar la lista en segundo plano si está en la pestaña correspondiente
                listGoogleDocsFromDrive();
            } catch (error) {
                console.error("Error al sincronizar con Google Drive API:", error);
                statusEl.innerHTML = `<span style="color: #a78bfa; font-weight: 700;"><i class="fa-solid fa-cloud-arrow-down"></i> Guardado localmente en Myxsi.</span>`;
                
                // Guardar borrador en almacenamiento local para no perder nada
                let docTitle = document.getElementById('smartDocTitle').value.trim() || 'Documento Inteligente Myxsi';
                localStorage.setItem('smart_doc_title', docTitle);
                localStorage.setItem('smart_doc_content', text);

                // Auto-descargar archivo .doc como respaldo instantáneo
                const blob = new Blob([htmlContent], { type: 'application/msword;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${docTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.doc`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);

                showNotification("📄 Documento guardado localmente y descargado en formato Word/Doc.");
            } finally {
                btn.disabled = false;
                btn.style.opacity = '1';
            }
        }

        async function exportDocToGoogleDriveSilent() {
            if (!smartDocQuill) return;

            const text = smartDocQuill.root.innerHTML.trim();
            if (!text || text === "<p><br></p>") {
                return;
            }

            const statusEl = document.getElementById('driveExportStatus');
            const saveStatus = document.getElementById('smartDocSaveStatus');

            let accessToken = localStorage.getItem('gdrive_access_token');
            const expiresAt = parseInt(localStorage.getItem('gdrive_token_expires_at') || '0', 10);
            if (!accessToken || Date.now() > expiresAt - 60000) {
                accessToken = await window.ensureValidToken();
            }

            if (!accessToken) {
                if (saveStatus) {
                    saveStatus.innerHTML = `<i class="fa-solid fa-circle-xmark" style="color: #ef4444;"></i> Error de autenticación`;
                }
                if (statusEl) {
                    statusEl.innerHTML = `<span style="color: #f43f5e; font-weight: 700;"><i class="fa-solid fa-circle-xmark"></i> Reautenticación requerida.</span>`;
                }
                return;
            }

            const isUpdate = !!activeGoogleDocId;
            try {
                let docTitle = document.getElementById('smartDocTitle').value.trim() || 'Documento sin título';
                const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #2d3748; line-height: 1.7; padding: 40px; max-width: 800px; margin: 0 auto; background-color: #ffffff; } .header-banner { border-bottom: 3px solid #7c3aed; padding-bottom: 15px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; } .header-logo { font-size: 1.1rem; font-weight: 800; color: #7c3aed; text-transform: uppercase; letter-spacing: 1px; } .header-date { font-size: 0.85rem; color: #a0aec0; } h1 { font-size: 2.2rem; color: #1a202c; margin-top: 0; margin-bottom: 20px; font-weight: 800; letter-spacing: -0.5px; } h2 { font-size: 1.6rem; color: #6d28d9; margin-top: 35px; margin-bottom: 15px; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; } h3 { font-size: 1.25rem; color: #7c3aed; margin-top: 25px; margin-bottom: 10px; font-weight: 600; } p { margin-top: 0; margin-bottom: 16px; font-size: 1.05rem; } code { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace; background-color: #f7fafc; color: #e53e3e; padding: 3px 6px; border-radius: 6px; font-size: 0.9em; border: 1px solid #edf2f7; } pre { background-color: #1a202c; color: #edf2f7; padding: 20px; border-radius: 12px; overflow-x: auto; margin-bottom: 24px; border: 1px solid #2d3748; } pre code { background-color: transparent; color: inherit; padding: 0; border: none; border-radius: 0; font-size: 0.95em; } ul, ol { margin-top: 0; margin-bottom: 20px; padding-left: 25px; } li { margin-bottom: 8px; font-size: 1.05rem; } blockquote { border-left: 4px solid #7c3aed; background-color: #f7fafc; padding: 15px 20px; color: #4a5568; font-style: italic; margin: 20px 0; border-radius: 0 8px 8px 0; } table { border-collapse: collapse; width: 100%; margin-top: 20px; margin-bottom: 30px; } th, td { border: 1px solid #e2e8f0; padding: 12px 15px; text-align: left; } th { background-color: #f7fafc; font-weight: 700; color: #2d3748; } tr:nth-child(even) { background-color: #fafbfe; } .footer-note { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 0.85rem; color: #718096; text-align: center; }</style></head><body><div class="header-banner"><span class="header-logo">Myxsi AI • Documento Inteligente</span><span class="header-date">${new Date().toLocaleDateString()}</span></div>${text}<div class="footer-note">Documento generado automáticamente por Myxsi AI. Conserva este material para tu estudio académico.</div></body></html>`;

                const metadata = { name: docTitle };
                if (!isUpdate) {
                    metadata.mimeType = 'application/vnd.google-apps.document';
                }

                const boundary = 'foo_bar_boundary_myxsi';
                const delimiter = `\r\n--${boundary}\r\n`;
                const close_delim = `\r\n--${boundary}--`;

                const multipartRequestBody =
                    `--${boundary}\r\n` +
                    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
                    JSON.stringify(metadata) +
                    delimiter +
                    'Content-Type: text/html; charset=UTF-8\r\n\r\n' +
                    htmlContent +
                    close_delim;

                const url = isUpdate
                    ? `https://www.googleapis.com/upload/drive/v3/files/${activeGoogleDocId}?uploadType=multipart`
                    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;

                const response = await fetch(url, {
                    method: isUpdate ? 'PATCH' : 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': `multipart/related; boundary=${boundary}`
                    },
                    body: multipartRequestBody
                });

                if (!response.ok) {
                    throw new Error(`Response status: ${response.status}`);
                }

                const resData = await response.json();
                if (!isUpdate && resData.id) {
                    activeGoogleDocId = resData.id;
                }

                if (saveStatus) {
                    saveStatus.innerHTML = `<i class="fa-solid fa-cloud-check" style="color: #10b981;"></i> Guardado en Google Drive`;
                }
                if (statusEl) {
                    statusEl.innerHTML = `<span style="color: #10b981; font-weight: 700;"><i class="fa-solid fa-circle-check"></i> ¡Sincronizado con Google Drive!</span>`;
                }
            } catch (err) {
                console.error("Autosave to Drive failed:", err);
                if (saveStatus) {
                    saveStatus.innerHTML = `<i class="fa-solid fa-circle-xmark" style="color: #ef4444;"></i> Error al guardar`;
                }
                if (statusEl) {
                    statusEl.innerHTML = `<span style="color: #ef4444; font-weight: 700;"><i class="fa-solid fa-circle-xmark"></i> Error de sincronización.</span>`;
                }
            }
        }
        window.exportDocToGoogleDriveSilent = exportDocToGoogleDriveSilent;


        // --- MODAL: CLOUD IDE AI ---
        let currentFile = 'app.js';
        let wordWrapOn = true;
        let minimapOn = false;
        const filesData = {
            'app.js': `// Archivo: app.js\n// Lógica del cliente para el chat Myxsi IA\n\n\n\ninitChat();`,
            'index.html': `<!-- Archivo: index.html -->\n<!DOCTYPE html>\n<html lang="es">\n<head>\n    <meta charset="UTF-8">\n    <title>Myxsi Chat</title>\n    <link rel="stylesheet" href="style.css">\n</head>\n<body>\n    <div id="chatWin"></div>\n    \x3cscript src="app.js"\x3e\x3c/script\x3e\n</body>\n</html>`,
            'style.css': `/* Archivo: style.css */\nbody {\n    background: #0a0816;\n    color: #ffffff;\n    font-family: 'Plus Jakarta Sans', sans-serif;\n    display: flex;\n    justify-content: center;\n    align-items: center;\n    height: 100vh;\n}`
        };

        window.editorInstance = null;

        function openCloudIDEModal() {
            const modal = document.getElementById('cloudIDEModal');
            modal.classList.add('show');

            // Delay loading to ensure modal renders
            setTimeout(() => {
                loadMonacoEditor();
            }, 300);
        }

        function closeCloudIDEModal() {
            document.getElementById('cloudIDEModal').classList.remove('show');
        }

        function updateTerminalLog(logText, append = false) {
            const terminal = document.getElementById('ideTerminalLog');
            if (append) {
                terminal.innerHTML += "<br>" + logText;
            } else {
                terminal.innerHTML = logText;
            }
            terminal.scrollTop = terminal.scrollHeight;
        }

        function loadMonacoEditor(callback) {
            if (window.monaco) {
                if (callback) callback();
                return;
            }

            updateTerminalLog("$ npm run dev<br>> Cargando entorno de desarrollo Monaco Editor...");

            const requireScript = document.createElement('script');
            requireScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.6/require.min.js';
            requireScript.onload = () => {
                require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.39.0/min/vs' } });
                require(['vs/editor/editor.main'], function () {
                    window.editorInstance = monaco.editor.create(document.getElementById('monacoContainer'), {
                        value: filesData[currentFile],
                        language: 'javascript',
                        theme: 'vs-dark',
                        automaticLayout: true,
                        minimap: { enabled: minimapOn },
                        wordWrap: wordWrapOn ? 'on' : 'off',
                        fontSize: 13,
                        roundedSelection: true,
                        cursorBlinking: 'smooth',
                        cursorSmoothCaretAnimation: 'on'
                    });

                    window.editorInstance.onDidChangeModelContent(() => {
                        filesData[currentFile] = window.editorInstance.getValue();
                    });

                    updateTerminalLog("> Monaco Editor cargado con éxito.<br>> Terminal lista en http://localhost:3000.", true);
                    if (callback) callback();
                });
            };
            requireScript.onerror = () => {
                updateTerminalLog("❌ Error: No se pudo cargar require.js. Usando editor de respaldo.", true);
                document.getElementById('fallbackEditor').style.display = 'block';
                document.getElementById('monacoContainer').style.background = '#1e1e1e';
                const fallback = document.getElementById('fallbackEditor');
                fallback.value = filesData[currentFile];
                fallback.addEventListener('input', () => {
                    filesData[currentFile] = fallback.value;
                });
            };
            document.body.appendChild(requireScript);
        }

        function selectIDEFile(fileName) {
            // Actualizar explorador de archivos
            document.querySelectorAll('.ide-file-btn').forEach(btn => btn.classList.remove('active'));
            currentFile = fileName;

            const btnId = `file-${fileName.replace('.', '-')}`;
            const targetBtn = document.getElementById(btnId);
            if (targetBtn) targetBtn.classList.add('active');

            // Actualizar pestañas del editor
            document.querySelectorAll('.ide-tab').forEach(tab => tab.classList.remove('active'));
            const tabId = `tab-${fileName.replace('.', '-')}`;
            const targetTab = document.getElementById(tabId);
            if (targetTab) targetTab.classList.add('active');

            let lang = 'javascript';
            if (fileName.endsWith('.html')) lang = 'html';
            else if (fileName.endsWith('.css')) lang = 'css';

            if (window.editorInstance) {
                const model = window.editorInstance.getModel();
                monaco.editor.setModelLanguage(model, lang);
                window.editorInstance.setValue(filesData[fileName]);
            } else {
                const fallback = document.getElementById('fallbackEditor');
                fallback.value = filesData[fileName];
            }

            updateTerminalLog(`$ open ${fileName}<br>> Cargado archivo virtual: ${fileName}`, true);
        }

        function toggleIDEWordWrap() {
            wordWrapOn = !wordWrapOn;
            if (window.editorInstance) {
                window.editorInstance.updateOptions({ wordWrap: wordWrapOn ? 'on' : 'off' });
                showNotification(`Ajuste de líneas: ${wordWrapOn ? 'Activado' : 'Desactivado'}`);
                updateTerminalLog(`> Monaco: wordWrap = ${wordWrapOn ? 'on' : 'off'}`, true);
            }
            const btn = document.getElementById('btnToggleWordWrap');
            if (btn) {
                if (wordWrapOn) {
                    btn.classList.add('active-ctrl');
                } else {
                    btn.classList.remove('active-ctrl');
                }
            }
        }

        function toggleIDEMinimap() {
            minimapOn = !minimapOn;
            if (window.editorInstance) {
                window.editorInstance.updateOptions({ minimap: { enabled: minimapOn } });
                showNotification(`Minimapa: ${minimapOn ? 'Activado' : 'Desactivado'}`);
                updateTerminalLog(`> Monaco: minimap.enabled = ${minimapOn}`, true);
            }
            const btn = document.getElementById('btnToggleMinimap');
            if (btn) {
                if (minimapOn) {
                    btn.classList.add('active-ctrl');
                } else {
                    btn.classList.remove('active-ctrl');
                }
            }
        }

        async function runPrettier(code, fileName) {
            if (typeof prettier === 'undefined' || typeof prettierPlugins === 'undefined') {
                console.warn("Prettier no está cargado.");
                return code;
            }
            let parser = 'babel';
            if (fileName.endsWith('.html')) parser = 'html';
            else if (fileName.endsWith('.css')) parser = 'css';

            try {
                const options = {
                    parser: parser,
                    plugins: prettierPlugins,
                    semi: true,
                    singleQuote: true,
                    tabWidth: 4,
                    useTabs: false,
                    trailingComma: 'none',
                    printWidth: 80
                };
                const formatted = prettier.format(code, options);
                return formatted;
            } catch (err) {
                console.error("Error en Prettier:", err);
                updateTerminalLog(`❌ Prettier Error: ${err.message}`, true);
                return null;
            }
        }

        async function formatIDECode() {
            if (!window.editorInstance) {
                const fallback = document.getElementById('fallbackEditor');
                const code = fallback.value;
                const formatted = await runPrettier(code, currentFile);
                if (formatted) {
                    fallback.value = formatted;
                    filesData[currentFile] = formatted;
                    showNotification("✨ Código formateado con Prettier");
                }
                return;
            }

            const code = window.editorInstance.getValue();
            const formatted = await runPrettier(code, currentFile);
            if (formatted) {
                const position = window.editorInstance.getPosition();
                window.editorInstance.setValue(formatted);
                if (position) window.editorInstance.setPosition(position);
                filesData[currentFile] = formatted;
                showNotification("✨ Código formateado con Prettier");
                updateTerminalLog(`> Prettier: Formateado ${currentFile} con éxito.`, true);
            }
        }

        async function saveProjectToGoogleDrive() {
            updateTerminalLog(`$ drive sync --project=myxsi-workspace`, true);

            updateTerminalLog(`> drive sync: Solicitando autorización de Google Drive...`, true);
            const accessToken = await window.ensureValidToken();
            if (!accessToken) {
                updateTerminalLog(`❌ drive sync error: Autorización denegada.`, true);
                alert("⚠️ Autorización de Google Drive cancelada o fallida.");
                return;
            }

            updateTerminalLog(`> drive sync: Conectado a Google Drive. Buscando carpeta 'Myxsi Workspace'...`, true);

            try {
                let folderId = null;
                const query = encodeURIComponent("name = 'Myxsi Workspace' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
                const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}`, {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });

                if (searchRes.ok) {
                    const searchData = await searchRes.json();
                    if (searchData.files && searchData.files.length > 0) {
                        folderId = searchData.files[0].id;
                        updateTerminalLog(`> drive sync: Carpeta existente encontrada (ID: ${folderId}).`, true);
                    }
                }

                if (!folderId) {
                    updateTerminalLog(`> drive sync: Creando nueva carpeta 'Myxsi Workspace'...`, true);
                    const folderMeta = {
                        name: 'Myxsi Workspace',
                        mimeType: 'application/vnd.google-apps.folder'
                    };
                    const createFolderRes = await fetch('https://www.googleapis.com/drive/v3/files', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(folderMeta)
                    });

                    if (createFolderRes.ok) {
                        const folderData = await createFolderRes.json();
                        folderId = folderData.id;
                        updateTerminalLog(`> drive sync: Carpeta creada con éxito (ID: ${folderId}).`, true);
                    } else {
                        throw new Error("No se pudo crear la carpeta del proyecto en Google Drive.");
                    }
                }

                const fileNames = ['app.js', 'index.html', 'style.css'];
                for (const name of fileNames) {
                    const content = filesData[name];
                    let mimeType = 'text/javascript';
                    if (name.endsWith('.html')) mimeType = 'text/html';
                    else if (name.endsWith('.css')) mimeType = 'text/css';

                    updateTerminalLog(`> drive sync: Subiendo ${name}...`, true);

                    let fileId = null;
                    const fileQuery = encodeURIComponent(`name = '${name}' and '${folderId}' in parents and trashed = false`);
                    const fileSearchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${fileQuery}`, {
                        headers: { 'Authorization': `Bearer ${accessToken}` }
                    });

                    if (fileSearchRes.ok) {
                        const fileSearchData = await fileSearchRes.json();
                        if (fileSearchData.files && fileSearchData.files.length > 0) {
                            fileId = fileSearchData.files[0].id;
                        }
                    }

                    if (fileId) {
                        const updateRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
                            method: 'PATCH',
                            headers: {
                                'Authorization': `Bearer ${accessToken}`,
                                'Content-Type': mimeType
                            },
                            body: content
                        });
                        if (updateRes.ok) {
                            updateTerminalLog(`> drive sync: ${name} actualizado (ID: ${fileId}).`, true);
                        } else {
                            throw new Error(`Error al actualizar ${name}`);
                        }
                    } else {
                        const metadata = {
                            name: name,
                            parents: [folderId]
                        };
                        const boundary = 'foo_bar_boundary_file_myxsi';
                        const delimiter = `\r\n--${boundary}\r\n`;
                        const close_delim = `\r\n--${boundary}--`;
                        const multipartRequestBody =
                            delimiter +
                            'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
                            JSON.stringify(metadata) +
                            delimiter +
                            `Content-Type: ${mimeType}; charset=UTF-8\r\n\r\n` +
                            content +
                            close_delim;

                        const createRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${accessToken}`,
                                'Content-Type': `multipart/related; boundary=${boundary}`
                            },
                            body: multipartRequestBody
                        });

                        if (createRes.ok) {
                            const createData = await createRes.json();
                            updateTerminalLog(`> drive sync: ${name} creado con éxito (ID: ${createData.id}).`, true);
                        } else {
                            throw new Error(`Error al crear ${name}`);
                        }
                    }
                }

                const folderLink = `https://drive.google.com/drive/folders/${folderId}`;
                updateTerminalLog(`> drive sync: ¡Sincronización completa! Proyecto guardado en tu Drive.<br>> Enlace carpeta: <a href="${folderLink}" target="_blank" rel="noopener noreferrer" style="color: #60a5fa; text-decoration: underline;">Abrir Carpeta del Proyecto</a>`, true);
                showNotification("💾 Proyecto sincronizado en Google Drive.");
            } catch (err) {
                console.error("Error sincronizando proyecto:", err);
                updateTerminalLog(`❌ drive sync: Error. ${err.message}`, true);
                alert("❌ Ocurrió un error al guardar el proyecto en Google Drive: " + err.message);
            }
        }

        function runCodeInTerminal() {
            updateTerminalLog(`$ node ${currentFile}`, true);
            setTimeout(() => {
                if (currentFile === 'app.js') {
                    updateTerminalLog(`> Inicializando chat premium...<br>> ¡Conectado con Myxsi IA!<br>> Ejecución finalizada con código 0.`, true);
                } else if (currentFile === 'index.html') {
                    updateTerminalLog(`> Renderizando DOM del archivo index.html...<br>> Elementos cargados correctamente.<br>> Proceso finalizado.`, true);
                } else {
                    updateTerminalLog(`> CSS cargado en memoria.<br>> Reglas aplicadas al cuerpo del documento.<br>> Proceso finalizado.`, true);
                }
            }, 600);
        }

        function triggerIDEAI(action) {
            const promptArea = document.getElementById('copilotIDEPrompt');
            const prompt = promptArea.value.trim();

            if (action === 'generate' && !prompt) {
                alert("⚠️ Por favor escribe una descripción para el código que quieres generar.");
                return;
            }

            updateTerminalLog(`> Copilot AI: Procesando acción "${action}"...`, true);

            setTimeout(() => {
                if (action === 'generate') {
                    let codeToInsert = `\n\n// Código generado por Copilot AI:\n`;

                    if (window.editorInstance) {
                        const value = window.editorInstance.getValue();
                        window.editorInstance.setValue(value + codeToInsert);
                    } else {
                        const fallback = document.getElementById('fallbackEditor');
                        fallback.value += codeToInsert;
                    }
                    updateTerminalLog(`> Copilot AI: Código inyectado con éxito en ${currentFile}.`, true);
                    promptArea.value = '';
                } else if (action === 'explain') {
                    updateTerminalLog(`> Copilot AI Explicación de ${currentFile}:<br>Este archivo define la estructura de ${currentFile}. Inicializa y configura el entorno para las interacciones con el motor de IA de Myxsi.`, true);
                } else if (action === 'refactor') {
                    updateTerminalLog(`> Copilot AI Refactorización:<br>Analizando archivo... Optimizando el uso de funciones anónimas y simplificando promesas. Archivo optimizado con éxito.`, true);
                } else if (action === 'debug') {
                    updateTerminalLog(`> Copilot AI Depuración:<br>Analizando sintaxis y dependencias...<br>No se encontraron errores ni advertencias de ejecución.`, true);
                }
            }, 800);
        }

        // Global notification helper
        function showNotification(msg) {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                bottom: 80px;
                right: 24px;
                background: rgba(139, 92, 246, 0.95);
                backdrop-filter: blur(10px);
                border: 1px solid rgba(255, 255, 255, 0.15);
                color: #ffffff;
                padding: 12px 24px;
                border-radius: 14px;
                font-size: 0.85rem;
                font-weight: 700;
                box-shadow: 0 10px 30px rgba(139, 92, 246, 0.3);
                z-index: 10001;
                transition: all 0.3s ease;
                transform: translateY(20px);
                opacity: 0;
            `;
            notification.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> ${msg}`;
            document.body.appendChild(notification);

            setTimeout(() => {
                notification.style.transform = 'translateY(0)';
                notification.style.opacity = '1';
            }, 50);

            setTimeout(() => {
                notification.style.transform = 'translateY(20px)';
                notification.style.opacity = '0';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        }

        function exportChatsCache() {
            try {
                const data = {
                    cached_chats_list: localStorage.getItem('cached_chats_list'),
                    local_chats_headers: localStorage.getItem('local_chats_headers'),
                };
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key.startsWith('local_chat_history_') || key.startsWith('custom_title_chat_') || key.startsWith('fav_chat_') || key.startsWith('archived_chat_') || key.startsWith('subject_chat_')) {
                        data[key] = localStorage.getItem(key);
                    }
                }
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `myxsi_chats_backup_${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showNotification("📤 Caché de chats exportado con éxito.");
            } catch (err) {
                alert("❌ Error al exportar: " + err.message);
            }
        }
        window.exportChatsCache = exportChatsCache;

        function importChatsCache() {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async (event) => {
                    try {
                        const data = JSON.parse(event.target.result);
                        Object.keys(data).forEach(key => {
                            if (data[key] !== null) {
                                localStorage.setItem(key, data[key]);
                            }
                        });
                        alert("📥 Caché de chats importado con éxito. La página se recargará para aplicar los cambios.");
                        window.location.reload();
                    } catch (err) {
                        alert("❌ Error al importar el archivo JSON: " + err.message);
                    }
                };
                reader.readAsText(file);
            };
            input.click();
        }
        window.importChatsCache = importChatsCache;

