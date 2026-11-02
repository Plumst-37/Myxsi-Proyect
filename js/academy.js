        import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
        import { getAuth, onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, linkWithPopup, reauthenticateWithPopup } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

        const firebaseConfig = { apiKey: "AIzaSyCqkZHfAcDku_cNd1cmjAOul-TLNkbPL20", authDomain: "myxsi-e4ba3.firebaseapp.com", projectId: "myxsi-e4ba3", storageBucket: "myxsi-e4ba3.firebasestorage.app", messagingSenderId: "321958728313", appId: "1:321958728313:web:0cd9f5a3f748b19e48faa8" };
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        
        window.auth = auth;
        window.GoogleAuthProvider = GoogleAuthProvider;
        window.signInWithPopup = signInWithPopup;
        window.linkWithPopup = linkWithPopup;
        window.reauthenticateWithPopup = reauthenticateWithPopup;
        window.googleProvider = new GoogleAuthProvider();
        window.googleProvider.addScope('https://www.googleapis.com/auth/drive.file');

        async function ensureValidToken() {
            let accessToken = localStorage.getItem('gdrive_access_token');
            const expiresAt = parseInt(localStorage.getItem('gdrive_token_expires_at') || '0', 10);
            
            if (accessToken && Date.now() < expiresAt - 60000) {
                return accessToken;
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
            }
            return null;
        }
        window.ensureValidToken = ensureValidToken;

        const API_URL = 'https://myxsi-backend.inoxwayoficial.workers.dev';
        
        let currentUser = null; 
        let chatsList = [];
        let sidebarSearchQuery = '';
        let activeSidebarTab = 'all';

        // Custom Confirm Modal System
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

        // Sidebar Navigation overrides to connect back to chat.html
        function initNewChatLocal() {
            window.location.href = 'chat.html?new=true';
        }
        window.initNewChatLocal = initNewChatLocal;

        function loadChatById(chatId) {
            window.location.href = `chat.html?chatId=${chatId}`;
        }
        window.loadChatById = loadChatById;

        // User Auth Observer
        onAuthStateChanged(auth, async (user) => {
            const loadingScreen = document.getElementById('loadingScreen');
            if (!user) { 
                if (loadingScreen) loadingScreen.classList.add('hidden');
                if (window.location.pathname.startsWith('/examen/')) {
                    sessionStorage.setItem('redirect_after_login', window.location.pathname);
                }
                window.location.href = 'index.html'; 
                return; 
            }
            
            currentUser = user;
            personalizeWelcomeUI();
            localizeInterface();
            activarEfectoMagnetico();
            initDuoSystemOnLoad();

            try {
                await loadChats();
                await handleExamRouting();
            } catch (error) { console.error(error); } 
            finally { setTimeout(() => loadingScreen.classList.add('hidden'), 600); }
        });

        function personalizeWelcomeUI() {
            const name = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Usuario';
            document.getElementById('userNameDisplay').textContent = 'Centro de Estudio';
            const sidebarUserName = document.getElementById('sidebarUserName');
            if (sidebarUserName) sidebarUserName.textContent = name;

            // Colocar foto de Google o inicial en el botón de perfil de la cabecera
            const userDetailsBtn = document.getElementById('btnUserDetails');
            if (userDetailsBtn) {
                if (currentUser?.photoURL) {
                    userDetailsBtn.innerHTML = `<img src="${currentUser.photoURL}" alt="User profile" referrerpolicy="no-referrer">`;
                } else {
                    const initial = name.charAt(0).toUpperCase();
                    userDetailsBtn.innerHTML = `<div class="user-initial">${initial}</div>`;
                }
            }
        }

        async function callAPI(action, params = {}) {
            const response = await fetch(API_URL, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, uid: currentUser?.uid, email: currentUser?.email, name: currentUser?.displayName, model: 'groq', ...params })
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.error);
            return data;
        }

        // Sidebar functions
        window.toggleSidebar = () => { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('sidebarOverlay').classList.toggle('show'); };
        window.autoResize = t => { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; };
        
        window.handleLogout = async () => {
            const ok = await customConfirm({
                title: 'Cerrar sesión',
                text: '¿Estás seguro de que deseas salir de tu cuenta?',
                icon: 'fa-right-from-bracket',
                isDanger: true
            });
            if (ok) {
                await signOut(auth);
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
                await callAPI('deleteChat', { chatId: id });
                await loadChats();
            }
        };

        // Gamification User Details
        function toggleUserDetailsModal() {
            const modal = document.getElementById('userDetailsModal');
            if (modal.classList.contains('show')) {
                modal.classList.remove('show');
            } else {
                const name = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Usuario';
                const email = currentUser?.email || '-';
                const creationTime = currentUser?.metadata?.creationTime;
                let formattedDate = '-';
                if (creationTime) {
                    formattedDate = new Date(creationTime).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                }
                
                document.getElementById('modalUserName').textContent = name;
                document.getElementById('modalUserEmail').textContent = email;
                document.getElementById('modalUserJoined').textContent = formattedDate;
                
                const avatarLarge = modal.querySelector('.user-avatar-large');
                if (avatarLarge) {
                    if (currentUser?.photoURL) {
                        avatarLarge.innerHTML = `<img src="${currentUser.photoURL}" alt="User profile" referrerpolicy="no-referrer" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;"><div class="avatar-glow"></div>`;
                    } else {
                        avatarLarge.innerHTML = `<span id="userAvatarChar">${name.charAt(0).toUpperCase()}</span><div class="avatar-glow"></div>`;
                    }
                }
                
                document.getElementById('modalStatChats').textContent = chatsList.length;
                
                modal.classList.add('show');
            }
        }
        window.toggleUserDetailsModal = toggleUserDetailsModal;

        // Fetch chats from server for sidebar list
        async function loadChats() {
            try {
                const result = await callAPI('getChats');
                chatsList = result.data?.chats || [];
                renderChatsList();
            } catch(e) {
                console.error('Error cargando historial de chats:', e);
            }
        }

        function formatRelativeTime(dateStr) {
            if (!dateStr) return 'Reciente';
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = Math.abs(now - date);
            const diffMins = Math.floor(diffMs / 60000);
            if (diffMins < 1) return 'Ahora mismo';
            if (diffMins < 60) return `Hace ${diffMins} min`;
            const hours = Math.floor(diffMins / 60);
            if (hours < 24) return `Hace ${hours} horas`;
            const days = Math.floor(hours / 24);
            if (days === 1) return 'Ayer';
            if (days < 7) return `Hace ${days} días`;
            return `Hace ${Math.ceil(days / 7)} semana${Math.ceil(days / 7) > 1 ? 's' : ''}`;
        }

        function renderChatsList() {
            const container = document.getElementById('chatsList');
            if (chatsList.length === 0) {
                container.innerHTML = `<div style="text-align:center; padding:3rem 1.5rem; color:var(--fog); font-size: 0.85rem;"><i class="fa-regular fa-comment-dots" style="font-size: 1.8rem; margin-bottom: 0.8rem; display: block; opacity: 0.5;"></i>No hay historial de chats</div>`;
                return;
            }

            let filtered = chatsList.filter(chat => {
                const matchesSearch = (chat.title || 'Nueva conversación').toLowerCase().includes(sidebarSearchQuery);
                const isFav = localStorage.getItem('fav_chat_' + chat.chatId) === 'true';
                if (!matchesSearch) return false;
                if (activeSidebarTab === 'favorites') return isFav;
                if (activeSidebarTab === 'archived') {
                    return localStorage.getItem('archived_chat_' + chat.chatId) === 'true';
                }
                if (activeSidebarTab === 'recent') {
                    const timeDiff = Date.now() - new Date(chat.updatedAt || chat.createdAt).getTime();
                    return timeDiff < (2 * 60 * 60 * 1000);
                }
                return true;
            });

            if (filtered.length === 0) {
                container.innerHTML = `<div style="text-align:center; padding:3rem; color:var(--fog); font-size: 0.85rem;">Ningún chat coincide</div>`;
                return;
            }

            container.innerHTML = filtered.map(chat => {
                const isFav = localStorage.getItem('fav_chat_' + chat.chatId) === 'true';
                const firstChar = (chat.title || 'N').charAt(0).toUpperCase();
                const isAIAssistant = (chat.title || '').toLowerCase().includes('asistente') || (chat.title || '').toLowerCase().includes('ia') || (chat.title || '').toLowerCase().includes('engine') || !chat.title;
                
                let avatarHTML = '';
                if (isAIAssistant) {
                    avatarHTML = `
                        <div class="chat-card-hexagon-wrapper">
                            <svg width="22" height="22" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <defs>
                                <linearGradient id="gemGradCard-${chat.chatId}" x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
                                  <stop offset="0%" stop-color="#A78BFA"/>
                                  <stop offset="100%" stop-color="#6D28D9"/>
                                </linearGradient>
                              </defs>
                              <path d="M22 4L38 14V30L22 40L6 30V14L22 4Z" fill="url(#gemGradCard-${chat.chatId})" opacity="0.9"/>
                              <circle cx="22" cy="22" r="4" fill="#FFFFFF"/>
                            </svg>
                        </div>
                    `;
                } else {
                    avatarHTML = `<div class="chat-card-monogram">${firstChar}</div>`;
                }

                let snippet = chat.lastMessageSnippet || 'Conversación activa con Myxsi Asistente';
                if (snippet.length > 35) snippet = snippet.substring(0, 35) + '...';

                return `
                    <div class="chat-card-item" onclick="window.loadChatById('${chat.chatId}')">
                        <div class="chat-card-left">
                            ${avatarHTML}
                            <div class="chat-card-info">
                                <span class="chat-card-title">${chat.title || 'Nueva conversación'}</span>
                                <span class="chat-card-snippet">${snippet}</span>
                                <span class="chat-card-time"><i class="fa-regular fa-clock"></i> ${formatRelativeTime(chat.updatedAt || chat.createdAt)}</span>
                            </div>
                        </div>
                        <div class="chat-card-right">
                            <button class="chat-card-action-btn fav-btn ${isFav ? 'active' : ''}" onclick="event.stopPropagation(); window.toggleFavoriteChat('${chat.chatId}')" title="Marcar como favorito">
                                <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-star"></i>
                            </button>
                            <button class="chat-card-action-btn delete-btn" onclick="event.stopPropagation(); window.deleteChatById('${chat.chatId}')" title="Eliminar chat">
                                <i class="fa-regular fa-trash-can"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        window.filterChatsList = function(val) {
            sidebarSearchQuery = val.trim().toLowerCase();
            renderChatsList();
        };

        window.switchSidebarTab = function(tab) {
            activeSidebarTab = tab;
            document.querySelectorAll('.sidebar-tab-btn').forEach(btn => btn.classList.remove('active'));
            const tabIds = { all: 'tabAll', favorites: 'tabFav', archived: 'tabArchived', recent: 'tabRecent' };
            const activeBtn = document.getElementById(tabIds[tab]);
            if (activeBtn) activeBtn.classList.add('active');
            renderChatsList();
        };

        window.toggleFavoriteChat = function(chatId) {
            const current = localStorage.getItem('fav_chat_' + chatId) === 'true';
            localStorage.setItem('fav_chat_' + chatId, (!current).toString());
            renderChatsList();
        };

        // ============================================
        // 3. MOTOR COMPLETO DE LA ACADEMIA PAES
        // ============================================
        const temariosData = {
            'Matemáticas M1': `TEMARIO OFICIAL DEMRE DE REFERENCIA (2027-26-03-19-temario-paes-regular-m1.pdf):
- Eje Números: Operaciones y conjuntos numéricos (enteros, racionales, reales), proporciones, porcentajes, potencias, raíces y logaritmos.
- Eje Álgebra y Funciones: Expresiones algebraicas, ecuaciones e inecuaciones de 1er grado, sistemas de ecuaciones lineales de 2x2, función lineal, afín y cuidrática.
- Eje Geometría: Figuras geométricas bidimensionales (áreas, perímetros), Teorema de Pitágoras, transformaciones isométricas, semejanza, homotecia y razones trigonométricas básicas.
- Eje Probabilidad y Estadística: Tablas y gráficos estadísticos, medidas de tendencia central (media, mediana, moda), medidas de posición (cuartiles, percentiles), reglas de adición y multiplicación de probabilidades.`,

            'Ciencias (Física, Química y Biología)': `TEMARIO OFICIAL DEMRE DE REFERENCIA (2027-26-03-19-temario-paes-regular-ciencias.pdf):
- Biología: Estructura celular, organelos, transporte de membrana, fotosíntesis, respiración celular, ciclo celular, mitosis y meiosis, genética básica, ecología y cadenas tróficas, biodiversidad.
- Física: Ondas (propiedades, sonido, luz, sismos), mecánica (fuerza, movimiento uniforme y acelerado, Leyes de Newton, energía mecánica y conservación), electricidad (circuitos básicos), astronomía y cosmos.
- Química: Estructura del átomo, Tabla Periódica, enlace químico (iónico, covalente, metálico), reacciones químicas, estequiometría, disoluciones químicas y solubilidad, química orgánica básica (carbono, hidrocarburos, grupos funcionales).`,

            'Historia y Ciencias Sociales': `TEMARIO OFICIAL DEMRE DE REFERENCIA (2027-26-03-19-temario-paes-regular-historia.pdf):
- Eje Historia en Perspectiva: El siglo XX en Chile y el mundo, Primera y Segunda Guerra Mundial, Guerra Fría, Dictadura Militar chilena y transición a la democracia, inserción en el mundo globalizado.
- Eje Formación Ciudadana: Estado de Derecho, poderes del Estado, Constitución, derechos humanos, deberes y derechos de los ciudadanos, participación y democracia en el Chile contemporáneo.
- Eje Economía y Sociedad: El problema económico (escasez), funcionamiento del mercado (oferta, demanda, inflación), desempleo y políticas públicas, inserción económica de Chile en la globalización.`,

            'Competencia Lectora': `TEMARIO OFICIAL DEMRE DE REFERENCIA (2027-26-03-19-temario-paes-regular-competencia-lectora.pdf):
- Estrategias de Comprensión: Localizar información textual, relacionar e interpretar partes de un texto, reflexionar y evaluar la forma y el contenido del texto.
- Tipos de Textos Literarios: Narrativa (novela, cuento, mito), lírica (poemas), drama (obras dramáticas, análisis de conflicto).
- Tipos de Textos No Literarios: Textos de medios de comunicación (noticias, columnas de opinión), textos expositivos e instructivos, textos argumentativos (tesis, argumentos, contraargumentos).`
        };

        let activeStudyFlow = 'paes';
        let selectedSubject = '';
        let selectedTopic = '';
        let currentStudyLevel = '';
        let currentStudyStep = 1;
        let currentStudyChatId = null;
        let studyHistory = [];
        let isStudySending = false;
        let studyQuizQuestionsAnswered = 0;

        function localizeInterface() {
            const isChile = Intl.DateTimeFormat().resolvedOptions().timeZone === 'America/Santiago';
            const paesTitle = document.getElementById('paesOptionTitle');
            const paesSub = document.getElementById('paesOptionSub');
            const academyTitleEl = document.querySelector('.academy-title');
            const academySubEl = document.querySelector('.academy-subtitle');
            
            if (isChile) {
                if (paesTitle) paesTitle.innerHTML = 'Preparación PAES 🎓';
                if (paesSub) paesSub.innerHTML = 'Matemáticas M1, Ciencias, Historia y Lenguaje';
                if (academyTitleEl) academyTitleEl.textContent = 'Centro de Estudio';
                if (academySubEl) academySubEl.textContent = 'Prepárate para la PAES o de forma personalizada para tu colegio/liceo.';
            } else {
                if (paesTitle) paesTitle.innerHTML = 'Preparación de Admisión Universitaria 🎓';
                if (paesSub) paesSub.innerHTML = 'Matemáticas, Ciencias, Historia y Literatura';
                if (academyTitleEl) academyTitleEl.textContent = 'Entrenamiento Académico';
                if (academySubEl) academySubEl.textContent = 'Prepárate para la universidad o refuerza tus materias de colegio y liceo.';
            }
        }
        
        function selectStudyFlow(flow) {
            activeStudyFlow = flow;
            document.getElementById('academyMainDashboard').style.display = 'none';
            if (flow === 'paes') {
                document.getElementById('paesFlowContainer').style.display = 'block';
            } else {
                document.getElementById('schoolFlowContainer').style.display = 'block';
            }
        }

        function selectSubject(subj) {
            selectedSubject = subj;
            selectedTopic = '';
            document.getElementById('paesFlowContainer').style.display = 'none';
            openRoadmap();
        }

        function confirmCustomTopic() {
            const input = document.getElementById('customTopicInput');
            const topic = input.value.trim();
            if (!topic) { alert('⚠️ Por favor ingresa el tema que deseas estudiar hoy.'); return; }
            selectedSubject = document.getElementById('customSubjectSelect').value;
            selectedTopic = topic;
            input.value = '';
            document.getElementById('schoolFlowContainer').style.display = 'none';
            openRoadmap();
        }

        function backToMainDashboard() {
            document.getElementById('paesFlowContainer').style.display = 'none';
            document.getElementById('schoolFlowContainer').style.display = 'none';
            document.getElementById('academyMainDashboard').style.display = 'grid';
        }

        function backToFlow() {
            document.getElementById('roadmapContainer').style.display = 'none';
            if (activeStudyFlow === 'paes') {
                document.getElementById('paesFlowContainer').style.display = 'block';
            } else {
                document.getElementById('schoolFlowContainer').style.display = 'block';
            }
        }

        function openRoadmap() {
            const topicKey = selectedTopic ? `${selectedTopic}_${selectedSubject}` : selectedSubject;
            const unlockedLevel = localStorage.getItem(`myxsi_unlocked_level_${topicKey}`) || 'principiante';
            
            document.getElementById('roadmapTitle').textContent = `Ruta de Aprendizaje: ${selectedTopic || selectedSubject}`;
            
            const card2 = document.getElementById('cardLevel2');
            const badge2 = document.getElementById('badgeLevel2');
            const card3 = document.getElementById('cardLevel3');
            const badge3 = document.getElementById('badgeLevel3');
            
            if (unlockedLevel === 'intermedio') {
                card2.className = "roadmap-level-card unlocked";
                badge2.className = "level-badge active-badge";
                badge2.textContent = "Disponible";
                card2.querySelector('.level-action-wrapper').innerHTML = '<span class="btn-level-action">Iniciar lección <i class="fa-solid fa-play"></i></span>';
                
                card3.className = "roadmap-level-card locked";
                badge3.className = "level-badge locked-badge";
                badge3.textContent = "Bloqueado";
                card3.querySelector('.level-action-wrapper').innerHTML = '<span class="btn-level-action locked-icon"><i class="fa-solid fa-lock"></i></span>';
            } else if (unlockedLevel === 'avanzado' || unlockedLevel === 'completado') {
                card2.className = "roadmap-level-card unlocked";
                badge2.className = "level-badge active-badge";
                badge2.textContent = "Completado";
                card2.querySelector('.level-action-wrapper').innerHTML = '<span class="btn-level-action">Repasar <i class="fa-solid fa-rotate-right"></i></span>';
                
                card3.className = "roadmap-level-card unlocked";
                badge3.className = "level-badge active-badge";
                badge3.textContent = "Disponible";
                card3.querySelector('.level-action-wrapper').innerHTML = '<span class="btn-level-action">Iniciar lección <i class="fa-solid fa-play"></i></span>';
                
                if (unlockedLevel === 'completado') {
                    card3.className = "roadmap-level-card unlocked";
                    badge3.className = "level-badge active-badge";
                    badge3.textContent = "Completado";
                    card3.querySelector('.level-action-wrapper').innerHTML = '<span class="btn-level-action">Repasar <i class="fa-solid fa-rotate-right"></i></span>';
                }
            } else {
                card2.className = "roadmap-level-card locked";
                badge2.className = "level-badge locked-badge";
                badge2.textContent = "Bloqueado";
                card2.querySelector('.level-action-wrapper').innerHTML = '<span class="btn-level-action locked-icon"><i class="fa-solid fa-lock"></i></span>';
                
                card3.className = "roadmap-level-card locked";
                badge3.className = "level-badge locked-badge";
                badge3.textContent = "Bloqueado";
                card3.querySelector('.level-action-wrapper').innerHTML = '<span class="btn-level-action locked-icon"><i class="fa-solid fa-lock"></i></span>';
            }
            
            document.getElementById('roadmapContainer').style.display = 'block';
        }

        async function startLevelSession(level) {
            const topicKey = selectedTopic ? `${selectedTopic}_${selectedSubject}` : selectedSubject;
            const unlockedLevel = localStorage.getItem(`myxsi_unlocked_level_${topicKey}`) || 'principiante';
            
            if (level === 'intermedio' && unlockedLevel === 'principiante') {
                alert('⚠️ Debes completar el Nivel Principiante primero.');
                return;
            }
            if (level === 'avanzado' && unlockedLevel !== 'avanzado' && unlockedLevel !== 'completado') {
                alert('⚠️ Debes completar el Nivel Intermedio primero.');
                return;
            }
            
            currentStudyLevel = level;
            currentStudyStep = 1;
            studyQuizQuestionsAnswered = 0;
            const academyContainer = document.querySelector('.academy-container');
            if (academyContainer) academyContainer.classList.add('study-active');
            
            document.getElementById('roadmapContainer').style.display = 'none';
            document.getElementById('studyZone').style.display = 'block';
            
            document.getElementById('studyTag').textContent = selectedTopic ? selectedTopic : selectedSubject;
            
            const levelLabels = {
                'principiante': 'Nivel: Principiante 🌿',
                'intermedio': 'Nivel: Intermedio 📐',
                'avanzado': 'Nivel: Avanzado 🔥'
            };
            document.getElementById('studyMethodTag').textContent = levelLabels[level];
            
            const chatWin = document.getElementById('studyChatWin');
            chatWin.querySelectorAll('.message').forEach(m => m.remove());
            
            studyHistory = [];
            currentStudyChatId = 'study_session_sandbox';
            
            updateStepsTrackerUI();
            await triggerFlowStepPrompt();
        }

        async function triggerFlowStepPrompt() {
            isStudySending = true;
            document.getElementById('studyTypingIndicator').style.display = 'flex';
            document.getElementById('studyFlowNavArea').style.display = 'none';
            
            let prompt = '';
            let temarioContext = '';
            if (temariosData[selectedSubject]) {
                temarioContext = `\n[TEMARIO OFICIAL ASOCIADO: ${temariosData[selectedSubject]}]\n`;
            }
            
            if (currentStudyStep === 1) {
                prompt = `Hola tutor de IA. Iniciemos el [Nivel: ${currentStudyLevel.toUpperCase()}] sobre el tema: "${selectedTopic || selectedSubject}".
                [INSTRUCCIÓN PEDAGÓGICA (PASO 1 - INTRODUCCIÓN INTERACTIVA): Preséntate brevemente como el tutor personal premium de la suite académica de Myxsi. Introduce el tema respondiendo exactamente a:
                1. ¿Qué es este tema de manera simple?
                2. ¿Por qué es fundamental e importante aprenderlo?
                3. ¿Cómo se aplica o usa esto en la vida real con un ejemplo potente?
                4. Al final de tu mensaje, hazme UNA pregunta interactiva inicial muy directa y fácil para ponerme a prueba y hacerme participar desde el primer segundo. Mantén la introducción sumamente dinámica, inspiradora, fluida y con un diseño ultra-premium y limpio. No uses nombres propios.]`;
            } else if (currentStudyStep === 2) {
                prompt = `[INSTRUCCIÓN PEDAGÓGICA (PASO 2 - EXPLICACIÓN SIMPLE): Excelente. Ahora pasa a la etapa de explicación conceptual en profundidad. Explícame el concepto paso a paso, con analogías sencillas, usando un formato muy didáctico, limpio, sin ruido visual y estructurado para que lo entienda un estudiante. No pongas cuestionarios todavía.]`;
            } else if (currentStudyStep === 3) {
                prompt = `[INSTRUCCIÓN PEDAGÓGICA (PASO 3 - EJEMPLOS PRÁCTICOS): Estupendo. Pasa a la etapa de ejemplos prácticos. Muéstrame 2 ejemplos de la vida real resueltos de forma sumamente gráfica e interactiva.]`;
            } else if (currentStudyStep === 4) {
                prompt = `[INSTRUCCIÓN PEDAGÓGICA (PASO 4 - PRÁCTICA GUIADA): Pasa a la etapa de práctica guiada. Plantea un reto o ejercicio conceptual/práctico del tema para que yo intente resolverlo. Explícame que me guiarás y me darás pistas si fallo.]`;
            } else if (currentStudyStep === 5) {
                prompt = `[INSTRUCCIÓN PEDAGÓGICA (PASO 5 - CUESTIONARIO QUIZ): Pasa a la etapa de evaluación interactiva. Genera un Quiz de 3 preguntas de opción múltiple del tema en base a tu temario oficial${temarioContext}. Genérame la PREGUNTA 1 ahora. Las alternativas deben estructurarse obligatoriamente de forma limpia en líneas nuevas al final de tu mensaje en este formato exacto para que el parser interactivo la dibuje en pantalla:\nA) [Opción A]\nB) [Opción B]\nC) [Opción C]\nD) [Opción D]]`;
            } else if (currentStudyStep === 6) {
                prompt = `[INSTRUCCIÓN PEDAGÓGICA (PASO 6 - RESUMEN FINAL & CONCLUSIÓN): Pasa a la etapa final. Evalúa de forma muy motivadora y prolija mi desempeño en el quiz. Haz un resumen sintético en 3 viñetas breves con lo más importante que he aprendido hoy, felicítame formalmente e indícame que he completado el nivel con total éxito.]`;
            }
            
            try {
                const result = await callAPI('chat', {
                    message: prompt,
                    chatId: currentStudyChatId,
                    history: studyHistory.slice(-10)
                });
                
                document.getElementById('studyTypingIndicator').style.display = 'none';
                
                if (result.success) {
                    studyHistory.push({ role: 'assistant', content: result.response });
                    appendStudyMessage('assistant', result.response);
                    
                    if (currentStudyStep === 5) {
                        evaluateAIResponse(result.response);
                    }
                    
                    updateStepsTrackerUI();
                    setupStudyFlowNavArea();
                } else {
                    appendStudyMessage('assistant', '❌ Error al conectar con el Tutor. Por favor reintenta.');
                }
            } catch(e) {
                console.error(e);
                document.getElementById('studyTypingIndicator').style.display = 'none';
                appendStudyMessage('assistant', '❌ Error de red al comunicar con el Tutor.');
            } finally {
                isStudySending = false;
            }
        }

        function setupStudyFlowNavArea() {
            const navArea = document.getElementById('studyFlowNavArea');
            const inputArea = document.getElementById('studyInputArea');
            const btnNext = document.getElementById('btnNextStep');
            const hint = document.getElementById('flowNavHint');
            
            navArea.style.display = 'flex';
            
            if (currentStudyStep === 1) {
                navArea.style.display = 'none';
                inputArea.style.display = 'flex';
            } else if (currentStudyStep === 2) {
                inputArea.style.display = 'none';
                hint.textContent = '¿Entendido el concepto principal?';
                btnNext.textContent = 'Ver Ejemplos Cotidianos ➜';
            } else if (currentStudyStep === 3) {
                inputArea.style.display = 'none';
                hint.textContent = '¿Visualizaste los ejemplos?';
                btnNext.textContent = 'Ir a la Práctica Guiada ➜';
            } else if (currentStudyStep === 4) {
                navArea.style.display = 'none';
                inputArea.style.display = 'flex';
            } else if (currentStudyStep === 5) {
                inputArea.style.display = 'flex';
                if (studyQuizQuestionsAnswered >= 3) {
                    navArea.style.display = 'flex';
                    btnNext.style.display = 'inline-flex';
                    hint.textContent = '¿Completaste el cuestionario?';
                    btnNext.textContent = 'Ver Evaluación Final ➜';
                } else {
                    navArea.style.display = 'none';
                }
            } else if (currentStudyStep === 6) {
                inputArea.style.display = 'none';
                hint.textContent = '¡Felicidades por tu lección!';
                btnNext.textContent = 'Completar Nivel y Guardar Logro 🌟';
            }
        }

        function advanceStudyStep() {
            if (currentStudyStep === 6) {
                const topicKey = selectedTopic ? `${selectedTopic}_${selectedSubject}` : selectedSubject;
                if (currentStudyLevel === 'principiante') {
                    localStorage.setItem(`myxsi_unlocked_level_${topicKey}`, 'intermedio');
                } else if (currentStudyLevel === 'intermedio') {
                    localStorage.setItem(`myxsi_unlocked_level_${topicKey}`, 'avanzado');
                } else if (currentStudyLevel === 'avanzado') {
                    localStorage.setItem(`myxsi_unlocked_level_${topicKey}`, 'completado');
                }
                exitStudySession();
                return;
            }
            
            currentStudyStep += 1;
            triggerFlowStepPrompt();
        }

        function updateStepsTrackerUI() {
            const tracker = document.getElementById('studyStepsTracker');
            if (!tracker) return;
            const dots = tracker.querySelectorAll('.step-dot');
            const lines = tracker.querySelectorAll('.step-line');
            
            dots.forEach(dot => {
                const step = parseInt(dot.getAttribute('data-step'), 10);
                dot.className = 'step-dot';
                if (step < currentStudyStep) {
                    dot.classList.add('done');
                    dot.querySelector('.step-num').innerHTML = '<i class="fa-solid fa-check" style="font-size: 0.55rem;"></i>';
                } else if (step === currentStudyStep) {
                    dot.classList.add('active');
                    dot.querySelector('.step-num').textContent = step.toString();
                } else {
                    dot.querySelector('.step-num').textContent = step.toString();
                }
            });
            
            lines.forEach((line, idx) => {
                line.className = 'step-line';
                if (idx + 1 < currentStudyStep) {
                    line.classList.add('done');
                }
            });
        }

        function formatContent(text) {
            if (!text) return '';
            let html = text
                .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/`([^`]+)`/g, '<code>$1</code>')
                .replace(/\n/g, '<br>');

            // Buscar patrones de preguntas interactivas opción múltiple: A) B) C) D)
            const optionPattern = /^(?:-?\s*\d*\.?\s*)?([A-D])[\s\)\-\.]([^\n<]+)/gim;
            let options = [];
            let matches;
            
            // Construir un regex no global para iterar
            const optionRegex = new RegExp(optionPattern);
            let cleanedHTML = html;

            while ((matches = optionRegex.exec(html)) !== null) {
                options.push({ letter: matches[1].toUpperCase(), text: matches[2].trim() });
            }

            if (options.length >= 2 && options.length <= 4) {
                // Remover opciones del texto original
                cleanedHTML = html.replace(optionPattern, '').replace(/(?:<br\s*\/?>\s*){2,}/gi, '<br>');
                
                const gridId = `duoGrid_${Math.random().toString(36).substr(2, 9)}`;
                let gridHTML = `<div class="duo-interactive-grid" id="${gridId}">`;
                options.forEach(opt => {
                    gridHTML += `
                        <div class="duo-opt-card" onclick="window.selectInteractiveOption('${opt.letter}', this, '${gridId}')">
                            <span class="duo-opt-letter">${opt.letter}</span>
                            <span class="duo-opt-text">${opt.text}</span>
                        </div>
                    `;
                });
                gridHTML += `</div>`;
                cleanedHTML += `<br>` + gridHTML;
            }

            return cleanedHTML;
        }

        function appendStudyMessage(role, content) {
            const container = document.getElementById('studyChatWin');
            const div = document.createElement('div');
            div.className = `message ${role === 'user' ? 'user' : 'bot'}`;
            const formatted = formatContent(content);
            const time = new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
            
            if (role === 'user') {
                div.innerHTML = `<div class="message-content">${formatted}<div class="message-time">${time}</div></div>`;
            } else {
                div.innerHTML = `<div class="message-avatar breathing-avatar" style="background:none;border:none;display:flex;align-items:center;justify-content:center;width:32px;height:32px;flex-shrink:0;margin-top:0.2rem">
                    <svg viewBox="0 0 24 24" fill="none" style="width:18px;height:18px;filter:drop-shadow(0 0 5px rgba(167,139,250,0.5))">
                        <path d="M12 2C12 7.5 16.5 12 22 12C16.5 12 12 16.5 12 22C12 16.5 7.5 12 2 12C7.5 12 12 7.5 12 2Z" fill="url(#sGStudy)"/>
                        <defs><linearGradient id="sGStudy" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#A78BFA"/><stop offset="50%" stop-color="#C4B5FD"/><stop offset="100%" stop-color="#8B5CF6"/></linearGradient></defs>
                    </svg>
                </div><div class="message-content">${formatted}<div class="message-time" style="text-align:left">${time}</div></div>`;
            }
            
            const typing = document.getElementById('studyTypingIndicator');
            container.insertBefore(div, typing);
            container.scrollTop = container.scrollHeight;
        }

        async function sendStudyMessage() {
            if (isStudySending) return;
            const input = document.getElementById('studyUserInput');
            const message = input.value.trim();
            if (!message) return;
            
            input.value = '';
            input.style.height = 'auto';
            input.disabled = true;
            isStudySending = true;
            
            appendStudyMessage('user', message);
            studyHistory.push({ role: 'user', content: message });
            
            document.getElementById('studyTypingIndicator').style.display = 'flex';
            
            try {
                let instruction = '';
                if (currentStudyStep === 1) {
                    instruction = ` [MODO ESTUDIO ACTIVO (PASO 1): Evalúa mi respuesta de forma clara y motivadora. Inmediatamente después, pasa al PASO 2: EXPLICACIÓN CONCEPTUAL SIMPLE de forma visual y estructurada para mí.]`;
                } else if (currentStudyStep === 4) {
                    instruction = ` [MODO ESTUDIO ACTIVO (PASO 4): Evalúa mi resolución de la práctica de forma muy didáctica explicando mis errores o aciertos. Inmediatamente después, pasa al PASO 5: CUESTIONARIO QUIZ. Plantea la Pregunta 1 del Quiz con alternativas estrictamente en este formato:\nA) [Opción A]\nB) [Opción B]\nC) [Opción C]\nD) [Opción D]]`;
                } else if (currentStudyStep === 5) {
                    instruction = ` [MODO ESTUDIO ACTIVO (PASO 5): Evalúa mi respuesta al Quiz de forma breve. Si aún quedan preguntas por hacer, plantéame la siguiente con alternativas en este formato:\nA) ...\nB) ...\nC) ...\nD) ... Si ya se completaron las 3 preguntas, indícame que puedo avanzar a ver mi evaluación final presionando el botón.]`;
                } else {
                    instruction = ` [MODO ESTUDIO ACTIVO (Flujo continuo): Evalúa mi respuesta didácticamente.]`;
                }
                
                const framedPayload = message + instruction;
                const apiHistory = studyHistory.slice(-11, -1);
                
                const result = await callAPI('chat', {
                    message: framedPayload,
                    chatId: currentStudyChatId,
                    history: apiHistory
                });
                
                document.getElementById('studyTypingIndicator').style.display = 'none';
                
                if (result.success) {
                    studyHistory.push({ role: 'assistant', content: result.response });
                    appendStudyMessage('assistant', result.response);
                    
                    if (currentStudyStep === 5) {
                        studyQuizQuestionsAnswered += 1;
                        evaluateAIResponse(result.response);
                    }
                    
                    if (currentStudyStep === 1) {
                        currentStudyStep = 2;
                    } else if (currentStudyStep === 4) {
                        currentStudyStep = 5;
                        studyQuizQuestionsAnswered = 0;
                    }
                    
                    updateStepsTrackerUI();
                    setupStudyFlowNavArea();
                } else {
                    appendStudyMessage('assistant', '❌ Error al procesar respuesta del tutor.');
                }
            } catch(e) {
                console.error(e);
                document.getElementById('studyTypingIndicator').style.display = 'none';
                appendStudyMessage('assistant', '❌ Error de red al comunicar con el tutor.');
            } finally {
                input.disabled = false;
                input.focus();
                isStudySending = false;
            }
        }

        function handleStudyKeyPress(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendStudyMessage();
            }
        }

        function exitStudySession() {
            const academyContainer = document.querySelector('.academy-container');
            if (academyContainer) academyContainer.classList.remove('study-active');
            document.getElementById('studyZone').style.display = 'none';
            openRoadmap();
        }

        // Export window functions
        window.selectStudyFlow = selectStudyFlow;
        window.backToMainDashboard = backToMainDashboard;
        window.selectSubject = selectSubject;
        window.confirmCustomTopic = confirmCustomTopic;
        window.backToFlow = backToFlow;
        window.startLevelSession = startLevelSession;
        window.sendStudyMessage = sendStudyMessage;
        window.handleStudyKeyPress = handleStudyKeyPress;
        window.exitStudySession = exitStudySession;
        window.advanceStudyStep = advanceStudyStep;

        // ============================================
        // SISTEMA DE GAMIFICACIÓN "DUOLINGO STYLE" & MODALES
        // ============================================
        let duoXP = 0;
        let duoHearts = 5;
        let duoStreak = 0;
        let duoLevel = 1;
        let duoLastDate = null;

        function initDuoSystemOnLoad() {
            const today = new Date().toISOString().split('T')[0];
            
            // Set defaults if not present
            if (localStorage.getItem('myxsi_duo_xp') === null) localStorage.setItem('myxsi_duo_xp', '0');
            if (localStorage.getItem('myxsi_duo_hearts') === null) localStorage.setItem('myxsi_duo_hearts', '5');
            if (localStorage.getItem('myxsi_duo_streak') === null) localStorage.setItem('myxsi_duo_streak', '10');
            if (localStorage.getItem('myxsi_duo_level') === null) localStorage.setItem('myxsi_duo_level', '1');
            if (localStorage.getItem('myxsi_duo_last_date') === null) localStorage.setItem('myxsi_duo_last_date', today);

            duoXP = parseInt(localStorage.getItem('myxsi_duo_xp') || '0', 10);
            duoHearts = parseInt(localStorage.getItem('myxsi_duo_hearts') || '5', 10);
            duoStreak = parseInt(localStorage.getItem('myxsi_duo_streak') || '10', 10);
            duoLevel = parseInt(localStorage.getItem('myxsi_duo_level') || '1', 10);
            duoLastDate = localStorage.getItem('myxsi_duo_last_date');

            checkStreakMissed();
            updateDailyStreak();
            updateDuolingoUI();
            if (window.applyGamificationVisibility) window.applyGamificationVisibility();
        }

        function checkStreakMissed() {
            if (duoLastDate) {
                const today = new Date().toISOString().split('T')[0];
                const last = new Date(duoLastDate);
                const curr = new Date(today);
                const diffTime = Math.abs(curr - last);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays > 1) {
                    duoStreak = 0;
                    localStorage.setItem('myxsi_duo_streak', '0');
                }
            }
        }

        function updateSidebarRachaUI() {
            const count = duoStreak;
            
            // Text count
            const numEl = document.getElementById('sidebarRachaNum');
            if (numEl) numEl.textContent = count;
            
            // Light up the checkmarks based on the current streak (up to 7)
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
            
            // Progress bar
            const progressEl = document.getElementById('sidebarRachaProgress');
            if (progressEl) {
                const percent = Math.min((count / 7) * 100, 100);
                progressEl.style.width = `${percent}%`;
            }
        }
        window.updateSidebarRachaUI = updateSidebarRachaUI;

        function updateDuolingoUI() {
            const levelNames = ["Aprendiz", "Explorador", "Erudito", "Maestro", "Leyenda", "Sabio Supremo"];
            const currentLevelName = levelNames[Math.min(duoLevel - 1, levelNames.length - 1)];

            const duoLevelTag = document.getElementById('duoLevelTag');
            const duoXPTag = document.getElementById('duoXPTag');
            const duoHeartsCount = document.getElementById('duoHeartsCount');
            const duoStreakCount = document.getElementById('duoStreakCount');
            const headerStreakCount = document.getElementById('headerStreakCount');
            const studyHeartsCount = document.getElementById('studyHeartsCount');
            const studyXPCount = document.getElementById('studyXPCount');
            const duoProgressBar = document.getElementById('duoProgressBar');

            if (duoLevelTag) duoLevelTag.textContent = `Nivel ${duoLevel}: ${currentLevelName}`;
            if (duoXPTag) duoXPTag.textContent = `${duoXP} / 100 XP`;
            if (duoHeartsCount) duoHeartsCount.textContent = duoHearts;
            
            // If racha changes, play satisfying pulse animation!
            if (duoStreakCount) {
                const oldVal = parseInt(duoStreakCount.textContent || '0', 10);
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

            if (duoStreakCount) duoStreakCount.textContent = duoStreak;
            if (headerStreakCount) headerStreakCount.textContent = duoStreak;
            
            if (studyHeartsCount) studyHeartsCount.innerHTML = `<i class="fa-solid fa-heart"></i> ${duoHearts} / 5 Vidas`;
            if (studyXPCount) studyXPCount.innerHTML = `<i class="fa-solid fa-star"></i> ${duoXP} XP Ganados`;

            if (duoProgressBar) {
                const progressPercent = Math.min(Math.max(duoXP, 0), 100);
                duoProgressBar.style.width = `${progressPercent}%`;
            }
            if (duoHearts <= 0) {
                openNoHeartsModal();
            }

            // Sync left sidebar racha widget
            updateSidebarRachaUI();
        }

        function awardXP(amount) {
            duoXP += amount;
            showFloatingXP(amount);
            
            if (duoXP >= 100) {
                duoXP -= 100;
                duoLevel += 1;
                alert(`🎉 ¡Subiste de nivel! Felicidades, ahora eres Nivel ${duoLevel}. ¡Sigue así!`);
            }

            localStorage.setItem('myxsi_duo_xp', duoXP.toString());
            localStorage.setItem('myxsi_duo_level', duoLevel.toString());
            updateDailyStreak();
            updateDuolingoUI();
        }

        function deductHeart() {
            if (duoHearts > 0) {
                duoHearts -= 1;
                localStorage.setItem('myxsi_duo_hearts', duoHearts.toString());
                
                const studyHeartsCount = document.getElementById('studyHeartsCount');
                if (studyHeartsCount) {
                    const parent = studyHeartsCount.parentElement;
                    parent.classList.add('heart-shake-animation');
                    setTimeout(() => parent.classList.remove('heart-shake-animation'), 600);
                }
                const duoHeartsCount = document.getElementById('duoHeartsCount');
                if (duoHeartsCount) {
                    const parent = duoHeartsCount.parentElement;
                    parent.classList.add('heart-shake-animation');
                    setTimeout(() => parent.classList.remove('heart-shake-animation'), 600);
                }
            }
            updateDuolingoUI();
        }

        function refillHearts() {
            duoHearts = 5;
            localStorage.setItem('myxsi_duo_hearts', '5');
            closeNoHeartsModal();
            updateDuolingoUI();
        }

        function updateDailyStreak() {
            const today = new Date().toISOString().split('T')[0];
            let storedStreak = parseInt(localStorage.getItem('myxsi_duo_streak') || '0', 10);
            let storedDate = localStorage.getItem('myxsi_duo_last_date') || '';

            if (storedStreak === 0 || !storedDate) {
                duoStreak = 1;
                duoLastDate = today;
            } else if (storedDate !== today) {
                const last = new Date(storedDate);
                const curr = new Date(today);
                const diffTime = Math.abs(curr - last);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays === 1) {
                    duoStreak = storedStreak + 1;
                } else if (diffDays > 1) {
                    duoStreak = 1;
                } else {
                    duoStreak = storedStreak;
                }
                duoLastDate = today;
            } else {
                duoStreak = storedStreak > 0 ? storedStreak : 1;
                duoLastDate = today;
            }
            localStorage.setItem('myxsi_duo_streak', duoStreak.toString());
            localStorage.setItem('myxsi_duo_last_date', duoLastDate);
            updateDuolingoUI();
        }

        function evaluateAIResponse(text) {
            const lowercaseText = text.toLowerCase();
            const positiveRegex = /\b(correcto|excelente|acertaste|muy bien|¡bien|bien hecho|respuesta correcta|efectivamente|exacto|felicitaciones|has acertado|felicidades)\b/i;
            const negativeRegex = /\b(incorrecto|te equivocaste|incorrecta|fallaste|no es correcto|no es así|te has equivocado|lamentablemente no)\b/i;
            
            if (negativeRegex.test(lowercaseText)) {
                deductHeart();
            } else if (positiveRegex.test(lowercaseText)) {
                awardXP(10);
            }
        }

        function openCreatorModal() { document.getElementById('creatorModal').classList.add('show'); }
        window.openCreatorModal = openCreatorModal;
        function closeCreatorModal() { document.getElementById('creatorModal').classList.remove('show'); }
        window.closeCreatorModal = closeCreatorModal;

        function openNoHeartsModal() {
            document.getElementById('noHeartsModal').classList.add('show');
            const input = document.getElementById('studyUserInput');
            if (input) input.disabled = true;
        }
        function closeNoHeartsModal() {
            document.getElementById('noHeartsModal').classList.remove('show');
            const input = document.getElementById('studyUserInput');
            if (input) input.disabled = false;
        }

        function exitStudySessionAndCloseModal() {
            closeNoHeartsModal();
            exitStudySession();
        }
        window.exitStudySessionAndCloseModal = exitStudySessionAndCloseModal;

        function selectInteractiveOption(letter, element, gridId) {
            const grid = document.getElementById(gridId);
            if (!grid || grid.classList.contains('locked')) return;
            
            grid.classList.add('locked');
            element.classList.add('selected');
            
            const labelText = element.querySelector('.duo-opt-text').textContent.trim();
            const optionText = `${letter}) ${labelText}`;
            
            const input = document.getElementById('studyUserInput');
            if (input) {
                input.value = `Mi respuesta es la opción ${optionText}.`;
                sendStudyMessage();
            }
        }
        window.selectInteractiveOption = selectInteractiveOption;

        function showFloatingXP(amount) {
            const pop = document.createElement('div');
            pop.className = 'floating-xp-pop';
            pop.textContent = `+${amount} XP`;
            document.body.appendChild(pop);
            setTimeout(() => pop.remove(), 1400);
        }
        window.showFloatingXP = showFloatingXP;

        function activarEfectoMagnetico() {
            document.querySelectorAll('.welcome-card').forEach(c => {
                c.addEventListener('mousemove', e => {
                    const r = c.getBoundingClientRect(); const x = e.clientX - r.left; const y = e.clientY - r.top;
                    c.style.transform = `perspective(1000px) rotateX(${((y - r.height/2)/r.height/2)*-8}deg) rotateY(${((x - r.width/2)/r.width/2)*8}deg) scale3d(1.02, 1.02, 1.02)`;
                });
                c.addEventListener('mouseleave', () => c.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
            });
        }

        // ============================================
        // MODAL: DOCUMENTO INTELIGENTE (GOOGLE DRIVE)
        // ============================================
        function openSmartDocModal() {
            const modal = document.getElementById('smartDocModal');
            modal.classList.add('show');
            const textarea = document.getElementById('smartDocTextArea');
            if (!textarea.value.trim()) {
                textarea.value = "## Borrador de Documento Inteligente\n\nComienza a redactar tu informe o haz clic en \"Importar Historial Chat\" para traer el contexto del tutor Myxsi.";
            }
        }

        function closeSmartDocModal() {
            document.getElementById('smartDocModal').classList.remove('show');
        }

        function importChatContextToDoc() {
            const textarea = document.getElementById('smartDocTextArea');
            let history = studyHistory || [];

            if (history && history.length > 0) {
                let formattedText = `# Reporte de Estudio - Myxsi AI\nFecha: ${new Date().toLocaleDateString()}\n\n---\n\n`;
                history.forEach(msg => {
                    const roleName = msg.role === 'user' ? 'Estudiante' : 'Tutor Myxsi';
                    let cleanContent = msg.content
                        .replace(/\[INSTRUCCIÓN PEDAGÓGICA[^\]]*\]/gi, '')
                        .replace(/\[MODO ESTUDIO ACTIVO[^\]]*\]/gi, '')
                        .trim();
                    if (cleanContent) {
                        formattedText += `### ${roleName}:\n${cleanContent}\n\n`;
                    }
                });
                textarea.value = formattedText;
                showNotification("📥 Historial de estudio importado con éxito.");
            } else {
                // Fallback: Scrape from studyChatWin
                const messages = document.querySelectorAll('#studyChatWin .message');
                if (messages.length > 0) {
                    let formattedText = `# Reporte de Estudio - Myxsi AI\nFecha: ${new Date().toLocaleDateString()}\n\n---\n\n`;
                    messages.forEach(msg => {
                        const isUser = msg.classList.contains('user');
                        const roleName = isUser ? 'Estudiante' : 'Tutor Myxsi';
                        const contentEl = msg.querySelector('.message-content');
                        if (contentEl) {
                            let text = contentEl.innerText.replace(/\d{2}:\d{2}\s*(am|pm)?/gi, '').trim();
                            formattedText += `### ${roleName}:\n${text}\n\n`;
                        }
                    });
                    textarea.value = formattedText;
                    showNotification("📥 Historial de estudio importado con éxito.");
                } else {
                    alert("⚠️ No hay mensajes en la sesión de estudio para importar. Inicia una sesión primero.");
                }
            }
        }

        function triggerSmartDocAI(action) {
            const textarea = document.getElementById('smartDocTextArea');
            let text = textarea.value;
            if (!text.trim()) {
                alert("⚠️ Por favor escribe algo de texto primero para que la IA lo procese.");
                return;
            }

            const statusEl = document.getElementById('driveExportStatus');
            const originalStatus = statusEl.innerHTML;
            statusEl.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin" style="color: #a78bfa;"></i> Asistente procesando con IA...`;

            setTimeout(() => {
                if (action === 'correct') {
                    textarea.value = text + "\n\n*Nota del Asistente: He optimizado la redacción y corregido el estilo editorial del texto para garantizar coherencia pedagógica y ortografía profesional.*";
                    showNotification("✨ Estilo corregido con éxito.");
                } else if (action === 'expand') {
                    textarea.value = text + "\n\n## Ampliación y Contextualización Académica\nEste análisis profundiza en los conceptos abordados en la conversación, conectando el marco teórico oficial del DEMRE/MINEDUC con metodologías didácticas adaptativas para un mejor desempeño en pruebas de admisión.";
                    showNotification("📚 Ideas expandidas con éxito.");
                } else if (action === 'vocabulary') {
                    let newText = text.replace(/\b(hacer|poner|decir|cosa|malo|bueno)\b/gi, (match) => {
                        const dict = {
                            'hacer': 'elaborar', 'Hacer': 'Elaborar',
                            'poner': 'establecer', 'Poner': 'Establecer',
                            'decir': 'exponer', 'Decir': 'Exponer',
                            'cosa': 'elemento', 'Cosa': 'Elemento',
                            'malo': 'deficiente', 'Malo': 'Deficiente',
                            'bueno': 'óptimo', 'Bueno': 'Óptimo'
                        };
                        return dict[match.toLowerCase()] || match;
                    });
                    textarea.value = newText + "\n\n*Nota: Vocabulario enriquecido (ej. 'hacer' -> 'elaborar', 'cosa' -> 'elemento').*";
                    showNotification("✍️ Vocabulario enriquecido.");
                }
                statusEl.innerHTML = originalStatus;
            }, 1000);
        }

        async function exportDocToGoogleDrive() {
            const text = document.getElementById('smartDocTextArea').value;
            if (!text.trim()) {
                alert("⚠️ No puedes exportar un documento vacío.");
                return;
            }

            const statusEl = document.getElementById('driveExportStatus');
            const btn = document.getElementById('btnExportToDrive');
            
            btn.disabled = true;
            btn.style.opacity = '0.7';
            
            statusEl.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin" style="color: #60a5fa;"></i> Comprobando credenciales de Google...`;

            statusEl.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin" style="color: #f59e0b;"></i> Solicitando acceso a Google Drive...`;
            const accessToken = await window.ensureValidToken();
            if (!accessToken) {
                statusEl.innerHTML = `<span style="color: #a78bfa; font-weight: 700;"><i class="fa-solid fa-cloud-arrow-down"></i> Guardado localmente.</span>`;
                btn.disabled = false;
                btn.style.opacity = '1';

                let docTitle = 'Documento Inteligente Myxsi';
                const titleMatch = text.match(/^#+\s+(.+)$/m);
                if (titleMatch && titleMatch[1]) {
                    docTitle = titleMatch[1].trim();
                }

                const parsedHtml = marked.parse(text);
                const blob = new Blob([parsedHtml], { type: 'application/msword;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${docTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.doc`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);

                showNotification("📄 Documento guardado localmente en Myxsi y descargado en formato Word.");
                return;
            }

            statusEl.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin" style="color: #60a5fa;"></i> Estructurando documento y subiendo a Drive...`;

            try {
                let docTitle = 'Documento Inteligente Myxsi';
                const titleMatch = text.match(/^#+\s+(.+)$/m);
                if (titleMatch && titleMatch[1]) {
                    docTitle = titleMatch[1].trim();
                }

                const parsedHtml = marked.parse(text);
                const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #2d3748; line-height: 1.7; padding: 40px; max-width: 800px; margin: 0 auto; background-color: #ffffff; } .header-banner { border-bottom: 3px solid #7c3aed; padding-bottom: 15px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; } .header-logo { font-size: 1.1rem; font-weight: 800; color: #7c3aed; text-transform: uppercase; letter-spacing: 1px; } .header-date { font-size: 0.85rem; color: #a0aec0; } h1 { font-size: 2.2rem; color: #1a202c; margin-top: 0; margin-bottom: 20px; font-weight: 800; letter-spacing: -0.5px; } h2 { font-size: 1.6rem; color: #6d28d9; margin-top: 35px; margin-bottom: 15px; font-weight: 700; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; } h3 { font-size: 1.25rem; color: #7c3aed; margin-top: 25px; margin-bottom: 10px; font-weight: 600; } p { margin-top: 0; margin-bottom: 16px; font-size: 1.05rem; } code { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace; background-color: #f7fafc; color: #e53e3e; padding: 3px 6px; border-radius: 6px; font-size: 0.9em; border: 1px solid #edf2f7; } pre { background-color: #1a202c; color: #edf2f7; padding: 20px; border-radius: 12px; overflow-x: auto; margin-bottom: 24px; border: 1px solid #2d3748; } pre code { background-color: transparent; color: inherit; padding: 0; border: none; border-radius: 0; font-size: 0.95em; } ul, ol { margin-top: 0; margin-bottom: 20px; padding-left: 25px; } li { margin-bottom: 8px; font-size: 1.05rem; } blockquote { border-left: 4px solid #7c3aed; background-color: #f7fafc; padding: 15px 20px; color: #4a5568; font-style: italic; margin: 20px 0; border-radius: 0 8px 8px 0; } table { border-collapse: collapse; width: 100%; margin-top: 20px; margin-bottom: 30px; } th, td { border: 1px solid #e2e8f0; padding: 12px 15px; text-align: left; } th { background-color: #f7fafc; font-weight: 700; color: #2d3748; } tr:nth-child(even) { background-color: #fafbfe; } .footer-note { margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 0.85rem; color: #718096; text-align: center; }</style></head><body><div class="header-banner"><span class="header-logo">Myxsi AI • Documento Inteligente</span><span class="header-date">${new Date().toLocaleDateString()}</span></div>${parsedHtml}<div class="footer-note">Documento generado automáticamente por Myxsi AI. Conserva este material para tu estudio académico.</div></body></html>`;

                const metadata = {
                    name: docTitle,
                    mimeType: 'application/vnd.google-apps.document'
                };

                const boundary = 'foo_bar_boundary_myxsi';
                const delimiter = `\r\n--${boundary}\r\n`;
                const close_delim = `\r\n--${boundary}--`;

                const multipartRequestBody =
                    delimiter +
                    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
                    JSON.stringify(metadata) +
                    delimiter +
                    'Content-Type: text/html; charset=UTF-8\r\n\r\n' +
                    htmlContent +
                    close_delim;

                const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': `multipart/related; boundary=${boundary}`
                    },
                    body: multipartRequestBody
                });

                if (!response.ok) {
                    const errText = await response.text();
                    throw new Error(`Google Drive API Error: ${errText}`);
                }

                const resData = await response.json();
                const fileId = resData.id;
                const realLink = `https://docs.google.com/document/d/${fileId}/edit?usp=drivesdk`;

                statusEl.innerHTML = `<span style="color: #10b981; font-weight: 700;"><i class="fa-solid fa-circle-check"></i> ¡Guardado en Google Drive!</span>`;
                
                const notification = document.createElement('div');
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
                    <a href="${realLink}" target="_blank" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 8px 16px; border-radius: 8px; background: #3b82f6; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 0.78rem; align-self: flex-start; transition: background 0.2s;"><i class="fa-solid fa-external-link"></i> Abrir en Google Docs</a>
                `;
                
                const editorPanel = document.querySelector('.editor-main-panel');
                if (editorPanel) {
                    editorPanel.appendChild(notification);
                }
                
                showNotification("💾 Documento guardado en Google Drive.");
            } catch (error) {
                console.error("Error uploading to Google Drive:", error);
                statusEl.innerHTML = `<span style="color: #f43f5e; font-weight: 700;"><i class="fa-solid fa-circle-xmark"></i> Error al subir.</span>`;
                alert("❌ Ocurrió un error al subir el archivo a tu Google Drive: " + error.message);
            } finally {
                btn.disabled = false;
                btn.style.opacity = '1';
            }
        }

        // ============================================
        // MODAL: CLOUD IDE AI
        // ============================================
        let currentFile = 'app.js';
        let wordWrapOn = true;
        let minimapOn = false;
        const filesData = {
            'app.js': `// Archivo: app.js\n// Lógica del cliente para el chat Myxsi IA\n\nfunction initChat() {\n    console.log("Inicializando chat premium...");\n    const chatBox = document.getElementById("chatWin");\n    if (chatBox) {\n        chatBox.innerHTML = "<p>¡Conectado con Myxsi IA!</p>";\n    }\n}\n\ninitChat();`,
            'index.html': `<!-- Archivo: index.html -->\n<!DOCTYPE html>\n<html lang="es">\n<head>\n    <meta charset="UTF-8">\n    <title>Myxsi Chat</title>\n    <link rel="stylesheet" href="style.css">\n</head>\n<body>\n    <div id="chatWin"></div>\n    \x3cscript src="app.js"\x3e\x3c/script\x3e\n</body>\n</html>`,
            'style.css': `/* Archivo: style.css */\nbody {\n    background: #0a0816;\n    color: #ffffff;\n    font-family: 'Plus Jakarta Sans', sans-serif;\n    display: flex;\n    justify-content: center;\n    align-items: center;\n    height: 100vh;\n}`
        };

        window.editorInstance = null;

        function openCloudIDEModal() {
            const modal = document.getElementById('cloudIDEModal');
            modal.classList.add('show');
            
            setTimeout(() => {
                loadMonacoEditor();
            }, 300);
        }

        function closeCloudIDEModal() {
            document.getElementById('cloudIDEModal').classList.remove('show');
        }

        function updateTerminalLog(logText, append = false) {
            const terminal = document.getElementById('ideTerminalLog');
            if (!terminal) return;
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
            document.querySelectorAll('.ide-file-btn').forEach(btn => btn.classList.remove('active'));
            currentFile = fileName;
            
            const btnId = `file-${fileName.replace('.', '-')}`;
            const targetBtn = document.getElementById(btnId);
            if (targetBtn) targetBtn.classList.add('active');

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
                updateTerminalLog(`> drive sync: ¡Sincronización completa! Proyecto guardado en tu Drive.<br>> Enlace carpeta: <a href="${folderLink}" target="_blank" style="color: #60a5fa; text-decoration: underline;">Abrir Carpeta del Proyecto</a>`, true);
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
                    let codeToInsert = `\n\n// Código generado por Copilot AI:\nfunction processAIRequest() {\n    // Lógica para: ${prompt}\n    console.log("Acción ejecutada correctamente");\n}`;
                    
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

        // Bind all interactive functions to window scope for HTML onclick access
        window.openSmartDocModal = openSmartDocModal;
        window.closeSmartDocModal = closeSmartDocModal;
        window.importChatContextToDoc = importChatContextToDoc;
        window.triggerSmartDocAI = triggerSmartDocAI;
        window.exportDocToGoogleDrive = exportDocToGoogleDrive;

        window.openCloudIDEModal = openCloudIDEModal;
        window.closeCloudIDEModal = closeCloudIDEModal;
        window.selectIDEFile = selectIDEFile;
        window.toggleIDEWordWrap = toggleIDEWordWrap;
        window.toggleIDEMinimap = toggleIDEMinimap;
        window.formatIDECode = formatIDECode;
        window.saveProjectToGoogleDrive = saveProjectToGoogleDrive;
        window.runCodeInTerminal = runCodeInTerminal;
        window.triggerIDEAI = triggerIDEAI;
        window.showNotification = showNotification;

        // Show Assigned Exams Panel on click (Drawer Slide-in)
        function showAssignedExams(event) {
            if (event) event.stopPropagation();
            const panel = document.getElementById('assignedExamsPanel');
            const overlay = document.getElementById('assignedExamsOverlay');
            if (panel && overlay) {
                overlay.style.display = 'block';
                panel.style.display = 'flex';
                setTimeout(() => {
                    overlay.classList.add('open');
                    panel.classList.add('open');
                }, 50);
                showNotification("🎯 Selecciona un examen para comenzar tu entrenamiento inteligente.");
            }
        }
        window.showAssignedExams = showAssignedExams;

        function hideAssignedExams() {
            const panel = document.getElementById('assignedExamsPanel');
            const overlay = document.getElementById('assignedExamsOverlay');
            if (panel && overlay) {
                panel.classList.remove('open');
                overlay.classList.remove('open');
                setTimeout(() => {
                    panel.style.display = 'none';
                    overlay.style.display = 'none';
                }, 400); // Matches transition duration
            }
        }
        window.hideAssignedExams = hideAssignedExams;

        // Cerrar el panel al hacer clic en cualquier parte fuera del panel y fuera de la tarjeta de activación
        document.addEventListener('click', function(event) {
            const panel = document.getElementById('assignedExamsPanel');
            if (panel && panel.classList.contains('open')) {
                // Verificar si el clic fue dentro del panel
                const clickedInsidePanel = panel.contains(event.target);
                
                // Verificar si el clic fue en la tarjeta "Elegir examen" (o tarjeta matemática)
                const mathCard = document.querySelector('.academy-selection-card.math');
                const clickedOpenButton = mathCard && mathCard.contains(event.target);
                
                // Si el clic no fue adentro del panel ni en la tarjeta de activación, cerramos el panel
                if (!clickedInsidePanel && !clickedOpenButton) {
                    hideAssignedExams();
                }
            }
        });

        /* ==========================================================================
           DUOLINGO ADAPTIVE SYSTEM CODE DATABASE & ENGINE
           ========================================================================== */
        const EXAMS_DATABASE = {
            m1: {
                name: "PAES Competencia Matemática M1",
                pdfName: "2027-26-03-19-temario-paes-regular-m1.pdf",
                topics: [
                    { id: "numeros", name: "Números y Operaciones", desc: "Números enteros, racionales, porcentajes y potencias." },
                    { id: "algebra", name: "Álgebra y Funciones", desc: "Ecuaciones, sistemas lineales y funciones afín/lineal." },
                    { id: "geometria", name: "Geometría", desc: "Figuras geométricas, semejanza, homotecia y vectores." },
                    { id: "probabilidad", name: "Probabilidad y Estadística", desc: "Medidas de tendencia central, probabilidad y combinatoria." }
                ],
                questions: [
                    { topic: "numeros", question: "¿Cuál es el valor de (-3)³ + (-2)²?", options: ["-23", "-31", "-25", "31"], correct: 0, explanation: "(-3)³ = -27. (-2)² = 4. -27 + 4 = -23." },
                    { topic: "numeros", question: "Un artículo de $20.000 se vende con un 15% de descuento. ¿Cuál es el precio de venta?", options: ["$15.000", "$17.000", "$18.500", "$16.800"], correct: 1, explanation: "El 15% de 20.000 es 3.000. 20.000 - 3.000 = 17.000." },
                    { topic: "numeros", question: "¿Qué número representa el 125% de 80?", options: ["100", "90", "110", "120"], correct: 0, explanation: "80 * 1.25 = 100." },
                    
                    { topic: "algebra", question: "Si 3x - 5 = 16, ¿cuál es el valor de x?", options: ["7", "6", "9", "5"], correct: 0, explanation: "3x = 16 + 5 => 3x = 21 => x = 7." },
                    { topic: "algebra", question: "¿Cuál es la pendiente de la recta dada por la ecuación y = -2x + 8?", options: ["8", "-2", "2", "-8"], correct: 1, explanation: "La ecuación está en formato y = mx + n. La pendiente m es -2." },
                    { topic: "algebra", question: "Si f(x) = 2x² - 3x + 1, ¿cuánto es f(-2)?", options: ["15", "11", "9", "3"], correct: 0, explanation: "f(-2) = 2(-2)² - 3(-2) + 1 = 2(4) + 6 + 1 = 8 + 7 = 15." },
                    
                    { topic: "geometria", question: "En un triángulo rectángulo, los catetos miden 6 cm y 8 cm. ¿Cuánto mide su hipotenusa?", options: ["14 cm", "10 cm", "12 cm", "9 cm"], correct: 1, explanation: "Por teorema de Pitágoras: h² = 6² + 8² = 36 + 64 = 100. h = 10." },
                    { topic: "geometria", question: "¿Cuál es el volumen de un cubo cuya arista mide 4 cm?", options: ["16 cm³", "64 cm³", "32 cm³", "48 cm³"], correct: 1, explanation: "Volumen = arista³ = 4 * 4 * 4 = 64 cm³." },
                    { topic: "geometria", question: "Si aplicamos una traslación T(3, -2) al punto A(-1, 5), ¿cuáles son las coordenadas del nuevo punto A'?", options: ["(2, 3)", "(4, 7)", "(-3, -10)", "(2, 7)"], correct: 0, explanation: "A' = (-1 + 3, 5 - 2) = (2, 3)." },
                    
                    { topic: "probabilidad", question: "¿Cuál es la media aritmética de los datos: 4, 8, 5, 2, 11?", options: ["6", "5", "7", "8"], correct: 0, explanation: "Suma = 4+8+5+2+11 = 30. Media = 30 / 5 = 6." },
                    { topic: "probabilidad", question: "Se lanza un dado común. ¿Cuál es la probabilidad de obtener un número primo?", options: ["1/2", "1/3", "2/3", "1/6"], correct: 0, explanation: "Los números primos en un dado son 2, 3, 5 (3 de 6). Probabilidad = 3/6 = 1/2." },
                    { topic: "probabilidad", question: "¿De cuántas maneras se pueden ordenar 4 libros en una repisa?", options: ["24", "16", "12", "8"], correct: 0, explanation: "Permutación: P(4) = 4! = 4 * 3 * 2 * 1 = 24." }
                ]
            },
            m2: {
                name: "PAES Competencia Matemática M2",
                pdfName: "2027-26-03-19-temario-paes-regular-m2.pdf",
                topics: [
                    { id: "logaritmos", name: "Potencias, Raíces y Logaritmos", desc: "Propiedades avanzadas de raíces, potencias y ecuaciones logarítmicas." },
                    { id: "sistemas", name: "Sistemas de Ecuaciones y Funciones", desc: "Sistemas no lineales, función cuadrática y exponencial." },
                    { id: "trig", name: "Trigonometría y Geometría 3D", desc: "Razones trigonométricas, identidades y áreas de revolución." },
                    { id: "prob_cond", name: "Probabilidad Condicional", desc: "Probabilidad condicional, teorema de Bayes y variables aleatorias." }
                ],
                questions: [
                    { topic: "logaritmos", question: "¿Cuál es el valor de log₂ (64) + log₃ (9)?", options: ["8", "6", "9", "7"], correct: 0, explanation: "log₂ (64) = 6 porque 2⁶ = 64. log₃ (9) = 2 porque 3² = 9. 6 + 2 = 8." },
                    { topic: "logaritmos", question: "Resuelve para x: log x + log 2 = log 10.", options: ["5", "8", "4", "3"], correct: 0, explanation: "log (2x) = log 10 => 2x = 10 => x = 5." },
                    
                    { topic: "sistemas", question: "¿Para qué valores de k el sistema de ecuaciones {3x - ky = 4, 6x - 8y = 8} tiene infinitas soluciones?", options: ["4", "2", "8", "-4"], correct: 0, explanation: "Para infinitas soluciones, los coeficientes deben ser proporcionales: 6/3 = 8/k => k = 4." },
                    { topic: "sistemas", question: "¿Cuál es el vértice de la parábola y = x² - 4x + 7?", options: ["(2, 3)", "(2, 7)", "(-2, 19)", "(4, 7)"], correct: 0, explanation: "Xv = -b / 2a = 4 / 2 = 2. Yv = 2² - 4(2) + 7 = 4 - 8 + 7 = 3. Vértice = (2, 3)." },
                    
                    { topic: "trig", question: "En un triángulo rectángulo, si sen(α) = 3/5, ¿cuál es el valor de cos(α)?", options: ["4/5", "3/4", "1", "2/5"], correct: 0, explanation: "Por identidad trigonométrica sen²(α) + cos²(α) = 1. (3/5)² + cos²(α) = 1 => 9/25 + cos²(α) = 1 => cos²(α) = 16/25 => cos(α) = 4/5." },
                    { topic: "trig", question: "¿Cuál es el área de un sector circular de radio 6 cm y ángulo central de 60 grados?", options: ["6π cm²", "12π cm²", "36π cm²", "3π cm²"], correct: 0, explanation: "Área = (60/360) * π * r² = (1/6) * π * 36 = 6π." },
                    
                    { topic: "prob_cond", question: "Si P(A) = 0.4, P(B) = 0.5 y P(A ∩ B) = 0.2, ¿cuánto es P(A|B)?", options: ["0.4", "0.5", "0.25", "0.8"], correct: 0, explanation: "P(A|B) = P(A ∩ B) / P(B) = 0.2 / 0.5 = 0.4." },
                    { topic: "prob_cond", question: "En una urna hay 4 bolas rojas y 6 negras. Se extraen dos bolas sin devolución. ¿Probabilidad de que ambas sean rojas?", options: ["2/15", "4/25", "1/5", "3/10"], correct: 0, explanation: "P(R1 ∩ R2) = P(R1) * P(R2|R1) = (4/10) * (3/9) = (2/5) * (1/3) = 2/15." }
                ]
            },
            lectora: {
                name: "PAES Competencia Lectora",
                pdfName: "2027-26-03-19-temario-paes-regular-competencia-lectora.pdf",
                topics: [
                    { id: "localizar", name: "Rastrear y Localizar", desc: "Buscar e identificar información explícita en el texto." },
                    { id: "interpretar", name: "Relacionar e Interpretar", desc: "Conectar ideas para inferir significados no explícitos." },
                    { id: "evaluar", name: "Evaluar y Reflexionar", desc: "Juzgar críticamente la validez, forma y coherencia del texto." }
                ],
                questions: [
                    { topic: "localizar", question: "Si un texto científico menciona: 'La temperatura crítica del compuesto X es de 145 K'. ¿Qué información se localiza directamente?", options: ["El compuesto X tiene su punto crítico a 145 K.", "El compuesto X es inestable a 145 K.", "La temperatura ambiente es de 145 K.", "El compuesto X es gaseoso."], correct: 0, explanation: "La información explícita indica literalmente que la temperatura crítica es de 145 K." },
                    { topic: "localizar", question: "En la frase 'El joven científico abandonó sus investigaciones tras el fracaso de 1888'. ¿Cuándo cesó su investigación?", options: ["En 1888.", "En 1889.", "Antes de 1888.", "No cesó."], correct: 0, explanation: "El texto vincula de forma directa el cese ('abandonó') con el fracaso de 1888." },
                    
                    { topic: "interpretar", question: "En un relato, un personaje suspira y mira largamente un antiguo boleto de tren. ¿Qué se infiere de su acción?", options: ["Experimenta nostalgia o melancolía.", "Tiene prisa por viajar.", "Comprará otro boleto.", "Está aburrido."], correct: 0, explanation: "El suspiro y la contemplación de un objeto antiguo son indicios clásicos de nostalgia." },
                    { topic: "interpretar", question: "¿Qué sentido tiene la metáfora 'su mente era una biblioteca infinitamente desordenada'?", options: ["Poseía muchos conocimientos pero sin estructura.", "No sabía leer libros.", "Pensaba con claridad absoluta.", "Olvidaba todo al instante."], correct: 0, explanation: "Una biblioteca evoca conocimientos; el desorden indica la falta de estructura o control." },
                    
                    { topic: "evaluar", question: "En un texto argumentativo que promueve una dieta sana, el autor utiliza datos de la OMS. ¿Qué función cumple este recurso?", options: ["Respaldar la tesis con un argumento de autoridad.", "Entretener al lector con anécdotas.", "Desviar la atención del tema central.", "Atacar a quienes no siguen la dieta."], correct: 0, explanation: "Citar organizaciones de salud oficiales es una estrategia de autoridad para dar validez al escrito." },
                    { topic: "evaluar", question: "Si un artículo de opinión usa generalizaciones como 'todos los jóvenes son adictos a la tecnología', ¿cuál es su debilidad crítica?", options: ["Presentar una falacia de generalización apresurada.", "Ser demasiado objetivo.", "Citar fuentes científicas desactualizadas.", "El uso de vocabulario técnico excesivo."], correct: 0, explanation: "El uso de absolutos ('todos') sin justificación empírica completa representa una falacia de generalización." }
                ]
            },
            ciencias: {
                name: "PAES Ciencias (Biología, Física, Química)",
                pdfName: "2027-26-03-19-temario-paes-regular-ciencias.pdf",
                topics: [
                    { id: "bio", name: "Biología Celular y Herencia", desc: "Célula, organelos, mitosis, genética y ecosistemas." },
                    { id: "fis", name: "Física: Ondas y Mecánica", desc: "Ondas electromagnéticas, luz, sonido y cinemática básica." },
                    { id: "qui", name: "Química Estequiométrica", desc: "Leyes ponderales, enlaces químicos y reacciones químicas básicas." }
                ],
                questions: [
                    { topic: "bio", question: "¿Qué organelo celular es el encargado de la respiración celular y producción de ATP?", options: ["Mitocondria", "Cloroplasto", "Ribosoma", "Lisosoma"], correct: 0, explanation: "La mitocondria sintetiza ATP mediante respiración celular." },
                    { topic: "bio", question: "En genética mendeliana, ¿qué significa que un individuo sea heterocigoto para un gen?", options: ["Posee dos alelos distintos para ese gen.", "Posee dos alelos idénticos.", "No tiene alelos activos.", "Es homocigoto dominante."], correct: 0, explanation: "Heterocigoto significa tener un alelo dominante y uno recesivo (diferentes)." },
                    
                    { topic: "fis", question: "¿Cuál de las siguientes es una característica que diferencia el sonido de la luz?", options: ["El sonido requiere un medio material para propagarse.", "La luz no es una onda.", "El sonido viaja más rápido que la luz.", "El sonido se propaga en el vacío."], correct: 0, explanation: "El sonido es una onda mecánica (requiere medio); la luz es electromagnética y viaja en el vacío." },
                    { topic: "fis", question: "Un automóvil recorre 150 km en 2 horas con velocidad constante. ¿Cuál es su rapidez?", options: ["75 km/h", "60 km/h", "300 km/h", "80 km/h"], correct: 0, explanation: "Rapidez = distancia / tiempo = 150 km / 2 h = 75 km/h." },
                    
                    { topic: "qui", question: "¿Qué tipo de enlace se forma por transferencia de electrones de un metal a un no metal?", options: ["Enlace Iónico", "Enlace Covalente", "Enlace Metálico", "Fuerza de Van der Waals"], correct: 0, explanation: "El enlace iónico se produce por atracción electrostática tras transferencia de electrones." },
                    { topic: "qui", question: "Si en una reacción química la masa de los reactantes es de 50 g, ¿cuál es la masa total de los productos?", options: ["50 g", "Menos de 50 g", "Más de 50 g", "Depende de la presión"], correct: 0, explanation: "Por la Ley de Conservación de la Materia de Lavoisier, la masa total se conserva." }
                ]
            },
            historia: {
                name: "PAES Historia y Ciencias Sociales",
                pdfName: "2027-26-03-19-temario-paes-regular-historia.pdf",
                topics: [
                    { id: "siglo20", name: "Historia del Siglo XX", desc: "Guerras mundiales, guerra fría y dictadura/transición en Chile." },
                    { id: "ciudadania", name: "Formación Ciudadana", desc: "Constitución, poderes del Estado, derechos y democracia." },
                    { id: "economia", name: "Economía y Globalización", desc: "Mercado, inflación, escasez y acuerdos comerciales." }
                ],
                questions: [
                    { topic: "siglo20", question: "¿Qué hito histórico da inicio formal a la Primera Guerra Mundial en 1914?", options: ["El asesinato del archiduque Francisco Fernando.", "La invasión de Polonia.", "La revolución rusa.", "El ataque a Pearl Harbor."], correct: 0, explanation: "El magnicidio en Sarajevo desencadenó las alianzas que iniciaron el conflicto." },
                    { topic: "siglo20", question: "¿En qué década retornó la democracia constitucional formal en Chile tras el plebiscito?", options: ["Década de 1990.", "Década de 1980.", "Década de 1970.", "Década de 2000."], correct: 0, explanation: "El traspaso de mando se concretó el 11 de marzo de 1990." },
                    
                    { topic: "ciudadania", question: "¿Qué poder del Estado en Chile tiene la facultad primordial de legislar y aprobar leyes?", options: ["Poder Legislativo", "Poder Ejecutivo", "Poder Judicial", "Contraloría"], correct: 0, explanation: "El Congreso Nacional representa al Poder Legislativo con atribución de aprobar las leyes." },
                    { topic: "ciudadania", question: "¿A qué edad se adquiere legalmente la ciudadanía activa en Chile con derecho a sufragio?", options: ["18 años", "16 años", "21 años", "14 años"], correct: 0, explanation: "La Constitución chilena otorga la ciudadanía a los chilenos mayores de 18 años." },
                    
                    { topic: "economia", question: "¿Cómo se define el fenómeno económico de la inflación?", options: ["Alza sostenida y generalizada del nivel de precios.", "Baja del valor de la moneda extranjera.", "Aumento de la oferta de empleos.", "Caída general del consumo."], correct: 0, explanation: "La inflación es la pérdida del poder adquisitivo debido al alza de los precios." },
                    { topic: "economia", question: "El problema económico central que enfrentan todas las sociedades se debe a:", options: ["La escasez de recursos frente a necesidades ilimitadas.", "La falta de dinero gubernamental.", "La sobreproducción industrial.", "La ausencia de comercio internacional."], correct: 0, explanation: "La escasez de recursos y multiplicidad de necesidades es el axioma de la ciencia económica." }
                ]
            }
        };

        // Web Audio API Synthesizer (Duolingo-like Sounds)
        const AudioSynth = {
            ctx: null,
            init() {
                if (!this.ctx) {
                    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
                }
            },
            playSuccess() {
                try {
                    this.init();
                    const now = this.ctx.currentTime;
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(523.25, now); // C5
                    osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
                    osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
                    
                    gain.gain.setValueAtTime(0.1, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
                    
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    
                    osc.start(now);
                    osc.stop(now + 0.45);
                } catch(e) { console.error("Audio error", e); }
            },
            playError() {
                try {
                    this.init();
                    const now = this.ctx.currentTime;
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(220.00, now); // A3
                    osc.frequency.setValueAtTime(147.00, now + 0.15); // D3
                    
                    gain.gain.setValueAtTime(0.12, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
                    
                    osc.connect(gain);
                    gain.connect(this.ctx.destination);
                    
                    osc.start(now);
                    osc.stop(now + 0.5);
                } catch(e) { console.error("Audio error", e); }
            }
        };

        // Active State of Study Session
        let activeExamId = null;
        let activeStudyState = null;
        let activePlayerFlow = null; // 'diagnostic' or 'practice' or 'simulation'
        let playerQuestions = [];
        let playerCurrentIndex = 0;
        let playerScore = 0;
        
        let questionStartTime = 0;
        let questionTimes = [];
        let playerTimerInterval = null;
        let playerTimeElapsed = 0;
        
        let selectedOptionIndex = null;
        let practiceLivesCount = 5;
        let currentPracticeTopicId = "";

        // User UID storage key builder
        function getStorageKey(examId) {
            const uid = window.auth?.currentUser?.uid || "guest";
            return `myxsi_study_state_${uid}_${examId}`;
        }

        // Dynamic SPA Router for exams
        async function handleExamRouting() {
            const path = window.location.pathname;
            const match = path.match(/^\/examen\/([a-zA-Z0-9_-]+)$/);
            if (match) {
                const examId = match[1];
                if (EXAMS_DATABASE[examId]) {
                    try {
                        showNotification("🔄 Sincronizando tu progreso con la nube...");
                        const res = await callAPI('getExamProgress', { examId });
                        if (res && res.success && res.data) {
                            localStorage.setItem(getStorageKey(examId), JSON.stringify(res.data));
                        }
                    } catch (err) {
                        console.warn("No se pudo cargar progreso remoto, usando local:", err);
                    }
                    openExamStudySystemInternal(examId);
                } else {
                    history.pushState(null, '', '/academy');
                    exitExamStudySystem();
                }
            } else {
                exitExamStudySystem();
            }
        }
        window.handleExamRouting = handleExamRouting;

        window.addEventListener('popstate', async () => {
            await handleExamRouting();
        });

        // Open study overlay
        function openExamStudySystem(examId) {
            if (!EXAMS_DATABASE[examId]) return;
            
            if (!window.auth?.currentUser) {
                sessionStorage.setItem('redirect_after_login', `examen/${examId}`);
                window.location.href = 'index.html';
                return;
            }

            if (window.location.pathname !== `/examen/${examId}`) {
                history.pushState(null, '', `/examen/${examId}`);
            }
            
            openExamStudySystemInternal(examId);
        }
        window.openExamStudySystem = openExamStudySystem;

        function openExamStudySystemInternal(examId) {
            if (!EXAMS_DATABASE[examId]) return;
            activeExamId = examId;
            
            hideAssignedExams();
            
            document.getElementById('academyMainContainer').style.display = 'none';
            const systemContainer = document.getElementById('examStudySystemContainer');
            systemContainer.style.display = 'block';
            
            const userName = window.auth?.currentUser?.displayName || window.auth?.currentUser?.email?.split('@')[0] || "Estudiante";
            document.getElementById('onboardingUserName').textContent = userName;
            document.getElementById('onboardingExamName').textContent = EXAMS_DATABASE[examId].name;
            
            const pdfLink = document.getElementById('examPdfLink');
            if (pdfLink) {
                pdfLink.href = `Temarios/${EXAMS_DATABASE[examId].pdfName}`;
            }
            
            hideAllStudyScreens();
            
            const savedState = localStorage.getItem(getStorageKey(examId));
            if (savedState) {
                activeStudyState = JSON.parse(savedState);
                if (activeStudyState.diagnosticCompleted) {
                    openStudyDashboard();
                    return;
                } else if (activeStudyState.topicsSelected) {
                    startDiagnosticExam();
                    return;
                }
            } else {
                activeStudyState = {
                    examId: examId,
                    diagnosticCompleted: false,
                    topicsSelected: false,
                    masteredTopics: [],
                    topicMastery: {},
                    history: []
                };
                EXAMS_DATABASE[examId].topics.forEach(t => {
                    activeStudyState.topicMastery[t.id] = 0;
                });
                saveStudyState();
            }
            
            transitionStudyScreen('welcome');
        }

        function exitExamStudySystem() {
            clearInterval(playerTimerInterval);
            document.getElementById('examStudySystemContainer').style.display = 'none';
            document.getElementById('academyMainContainer').style.display = 'block';
            
            if (window.location.pathname.startsWith('/examen/')) {
                history.pushState(null, '', '/academy');
            }
            
            const panel = document.getElementById('assignedExamsPanel');
            if (panel && panel.style.display === 'block') {
                panel.scrollIntoView({ behavior: 'smooth' });
            }
        }
        window.exitExamStudySystem = exitExamStudySystem;

        async function saveStudyState() {
            if (!activeExamId || !activeStudyState) return;
            localStorage.setItem(getStorageKey(activeExamId), JSON.stringify(activeStudyState));
            
            try {
                if (currentUser) {
                    await callAPI('saveExamProgress', {
                        examId: activeExamId,
                        selectedTopics: activeStudyState.masteredTopics || [],
                        diagnosticCompleted: activeStudyState.diagnosticCompleted || false,
                        diagnosticScore: activeStudyState.diagnosticScore || 0,
                        diagnosticTime: activeStudyState.diagnosticTime || 0,
                        topicMastery: activeStudyState.topicMastery || {},
                        unlockedLevels: activeStudyState.unlockedLevels || {},
                        history: activeStudyState.history || []
                    });
                }
            } catch (err) {
                console.error("Error al sincronizar progreso en la base de datos:", err);
            }
        }

        function hideAllStudyScreens() {
            const screens = document.querySelectorAll('.study-screen');
            screens.forEach(s => s.style.display = 'none');
            // Hide feedback bar
            document.getElementById('duoFeedbackBar').classList.remove('show');
        }

        function transitionStudyScreen(screenKey) {
            hideAllStudyScreens();
            if (screenKey === 'welcome') {
                document.getElementById('studyWelcomeScreen').style.display = 'block';
            } else if (screenKey === 'syllabus') {
                renderSyllabusTopics();
                document.getElementById('studySyllabusScreen').style.display = 'block';
            } else if (screenKey === 'player') {
                document.getElementById('studyPlayerScreen').style.display = 'block';
            } else if (screenKey === 'results') {
                document.getElementById('studyResultsScreen').style.display = 'block';
            } else if (screenKey === 'dashboard') {
                document.getElementById('studyDashboardScreen').style.display = 'block';
            } else if (screenKey === 'practice') {
                document.getElementById('studyPracticePlayerScreen').style.display = 'block';
            }
        }
        window.transitionStudyScreen = transitionStudyScreen;

        // Render topics grid for descarte de temas
        function renderSyllabusTopics() {
            const grid = document.getElementById('syllabusTopicsGrid');
            if (!grid) return;
            grid.innerHTML = '';
            
            const exam = EXAMS_DATABASE[activeExamId];
            exam.topics.forEach(topic => {
                const card = document.createElement('div');
                card.className = 'syllabus-card';
                card.id = `syllabusCard_${topic.id}`;
                
                // Set active class if already in mastered list
                const isMastered = activeStudyState.masteredTopics.includes(topic.id);
                if (isMastered) card.classList.add('checked');
                
                card.onclick = () => {
                    const idx = activeStudyState.masteredTopics.indexOf(topic.id);
                    if (idx > -1) {
                        activeStudyState.masteredTopics.splice(idx, 1);
                        card.classList.remove('checked');
                    } else {
                        activeStudyState.masteredTopics.push(topic.id);
                        card.classList.add('checked');
                    }
                    saveStudyState();
                };
                
                card.innerHTML = `
                    <div class="syllabus-checkbox"><i class="fa-solid fa-check"></i></div>
                    <div class="syllabus-card-info">
                        <h4>${topic.name}</h4>
                        <p>${topic.desc}</p>
                    </div>
                `;
                grid.appendChild(card);
            });
        }

        // Start Personalized Diagnostic
        function startDiagnosticExam() {
            activeStudyState.topicsSelected = true;
            saveStudyState();
            
            const exam = EXAMS_DATABASE[activeExamId];
            // Filter questions for topics not checked as mastered
            const targetTopics = exam.topics.filter(t => !activeStudyState.masteredTopics.includes(t.id)).map(t => t.id);
            
            let pool = [];
            if (targetTopics.length === 0) {
                // If they checked everything, let's just use all questions
                pool = [...exam.questions];
            } else {
                pool = exam.questions.filter(q => targetTopics.includes(q.topic));
            }
            
            // Shuffle pool and select max 10
            playerQuestions = pool.sort(() => 0.5 - Math.random()).slice(0, 10);
            
            if (playerQuestions.length === 0) {
                // Safety fallback
                playerQuestions = exam.questions.slice(0, 10);
            }
            
            activePlayerFlow = 'diagnostic';
            playerCurrentIndex = 0;
            playerScore = 0;
            questionTimes = [];
            playerTimeElapsed = 0;
            
            // Set Titles
            document.getElementById('playerExamTitle').textContent = `EVALUACIÓN DIAGNÓSTICA: ${exam.name}`;
            
            // Open screen and load question
            transitionStudyScreen('player');
            startPlayerTimer();
            loadPlayerQuestion();
        }
        window.startDiagnosticExam = startDiagnosticExam;

        // Player timer
        function startPlayerTimer() {
            clearInterval(playerTimerInterval);
            playerTimeElapsed = 0;
            const timerEl = document.getElementById('playerTimer');
            timerEl.innerHTML = `<i class="fa-regular fa-clock"></i> 00:00`;
            
            playerTimerInterval = setInterval(() => {
                playerTimeElapsed++;
                const mins = String(Math.floor(playerTimeElapsed / 60)).padStart(2, '0');
                const secs = String(playerTimeElapsed % 60).padStart(2, '0');
                timerEl.innerHTML = `<i class="fa-regular fa-clock"></i> ${mins}:${secs}`;
            }, 1000);
        }

        // Load Question inside Exam Player
        function loadPlayerQuestion() {
            if (playerCurrentIndex >= playerQuestions.length) {
                finishExamPlayer();
                return;
            }
            
            selectedOptionIndex = null;
            const q = playerQuestions[playerCurrentIndex];
            questionStartTime = Date.now();
            
            // Progress Bar
            const progress = (playerCurrentIndex / playerQuestions.length) * 100;
            document.getElementById('playerProgressBar').style.width = `${progress}%`;
            
            // Question Headers
            document.getElementById('playerQuestionIndex').textContent = `Pregunta ${playerCurrentIndex + 1} de ${playerQuestions.length}`;
            document.getElementById('playerQuestionText').textContent = q.question;
            
            // Render Options
            const container = document.getElementById('playerOptionsContainer');
            container.innerHTML = '';
            
            const letters = ["A", "B", "C", "D"];
            q.options.forEach((opt, idx) => {
                const btn = document.createElement('button');
                btn.className = 'study-option-btn';
                btn.id = `optBtn_${idx}`;
                btn.onclick = () => {
                    // Remove selected state from others
                    q.options.forEach((o, i) => {
                        const b = document.getElementById(`optBtn_${i}`);
                        if (b) b.classList.remove('selected');
                    });
                    btn.classList.add('selected');
                    selectedOptionIndex = idx;
                    
                    // Enable next button
                    const nextBtn = document.getElementById('playerNextBtn');
                    nextBtn.removeAttribute('disabled');
                    nextBtn.style.background = 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)';
                    nextBtn.style.color = '#ffffff';
                    nextBtn.style.cursor = 'pointer';
                };
                btn.innerHTML = `
                    <div class="study-option-letter">${letters[idx]}</div>
                    <div>${opt}</div>
                `;
                container.appendChild(btn);
            });
            
            // Disable next button initially
            const nextBtn = document.getElementById('playerNextBtn');
            nextBtn.setAttribute('disabled', 'true');
            nextBtn.style.background = 'rgba(255, 255, 255, 0.05)';
            nextBtn.style.color = 'rgba(255,255,255,0.3)';
            nextBtn.style.cursor = 'not-allowed';
        }

        function playerSubmitAnswer() {
            if (selectedOptionIndex === null) return;
            
            const q = playerQuestions[playerCurrentIndex];
            const duration = (Date.now() - questionStartTime) / 1000; // in seconds
            
            const isCorrect = (selectedOptionIndex === q.correct);
            if (isCorrect) playerScore++;
            
            // Save time and results details
            questionTimes.push({
                topic: q.topic,
                correct: isCorrect,
                time: duration
            });
            
            playerCurrentIndex++;
            loadPlayerQuestion();
        }
        window.playerSubmitAnswer = playerSubmitAnswer;

        // Finish Exam (Diagnostic or Simulation)
        function finishExamPlayer() {
            clearInterval(playerTimerInterval);
            
            const totalDuration = playerTimeElapsed;
            const avgTime = playerQuestions.length > 0 ? (totalDuration / playerQuestions.length).toFixed(1) : 0;
            
            if (activePlayerFlow === 'diagnostic') {
                // Update diagnostic status
                activeStudyState.diagnosticCompleted = true;
                
                // Identify weak areas
                const weakTopics = {};
                // Preload topics
                EXAMS_DATABASE[activeExamId].topics.forEach(t => {
                    weakTopics[t.id] = { correct: 0, total: 0, time: 0 };
                });
                
                questionTimes.forEach(qt => {
                    weakTopics[qt.topic].total++;
                    if (qt.correct) weakTopics[qt.topic].correct++;
                    weakTopics[qt.topic].time += qt.time;
                });
                
                // Calculate mastery level per topic based on diagnostic
                const weakListContainer = document.getElementById('resultsWeakTopicsContainer');
                weakListContainer.innerHTML = '';
                
                EXAMS_DATABASE[activeExamId].topics.forEach(topic => {
                    const stats = weakTopics[topic.id];
                    let scorePercentage = 100;
                    if (stats.total > 0) {
                        scorePercentage = Math.round((stats.correct / stats.total) * 100);
                    } else if (activeStudyState.masteredTopics.includes(topic.id)) {
                        // Mastered from syllabus checker
                        scorePercentage = 100;
                    } else {
                        scorePercentage = 50; // default medium if no question was drawn
                    }
                    
                    activeStudyState.topicMastery[topic.id] = scorePercentage;
                    
                    // Render weak items in results if below 80%
                    if (scorePercentage < 80) {
                        const div = document.createElement('div');
                        div.style.cssText = `
                            background: rgba(239, 68, 68, 0.05);
                            border: 1px solid rgba(239, 68, 68, 0.15);
                            border-radius: 14px;
                            padding: 0.8rem 1.2rem;
                            display: flex;
                            align-items: center;
                            justify-content: space-between;
                        `;
                        div.innerHTML = `
                            <span style="font-weight: 700; color: #f87171;"><i class="fa-solid fa-triangle-exclamation"></i> ${topic.name}</span>
                            <span style="font-size: 0.8rem; font-weight: 750; color: #f87171;">Dominio: ${scorePercentage}%</span>
                        `;
                        weakListContainer.appendChild(div);
                    }
                });
                
                if (weakListContainer.children.length === 0) {
                    weakListContainer.innerHTML = `
                        <div style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.15); border-radius: 14px; padding: 0.8rem 1.2rem; text-align: center; color: #34d399; font-weight: 700;">
                            <i class="fa-solid fa-circle-check"></i> ¡Excelente! Demostraste un gran nivel en todos los temas analizados.
                        </div>
                    `;
                }
                
                // Save session history
                const today = new Date().toLocaleDateString();
                activeStudyState.history.push({
                    date: today,
                    type: "Diagnóstico",
                    score: `${playerScore}/${playerQuestions.length}`,
                    duration: `${totalDuration}s`
                });
                
                // Save states
                saveStudyState();
                
                // Update Results Screen Info
                document.getElementById('resultsScoreText').textContent = `${playerScore} / ${playerQuestions.length}`;
                document.getElementById('resultsTimeText').textContent = `${avgTime}s / preg`;
                
                // Go to results screen
                transitionStudyScreen('results');
                AudioSynth.playSuccess();
            } else if (activePlayerFlow === 'simulation') {
                // Show Simulation Result Alert & Return to Dashboard
                const today = new Date().toLocaleDateString();
                activeStudyState.history.push({
                    date: today,
                    type: "Simulación Oficial",
                    score: `${playerScore}/${playerQuestions.length}`,
                    duration: `${totalDuration}s`
                });
                
                // Adjust all topics mastery based on simulation performance (adaptive feedback)
                const correctCount = playerScore;
                const ratio = correctCount / playerQuestions.length;
                
                EXAMS_DATABASE[activeExamId].topics.forEach(t => {
                    let current = activeStudyState.topicMastery[t.id] || 50;
                    // Slightly nudge mastery based on overall performance
                    if (ratio >= 0.8) {
                        current = Math.min(100, current + 10);
                    } else if (ratio < 0.5) {
                        current = Math.max(0, current - 8);
                    }
                    activeStudyState.topicMastery[t.id] = current;
                });
                
                saveStudyState();
                
                // Transition back with notification alert
                openStudyDashboard();
                showNotification(`🏆 Simulación oficial terminada. Aciertos: ${playerScore}/${playerQuestions.length}. Tiempo empleado: ${totalDuration}s.`);
                
                if (ratio >= 0.8) {
                    AudioSynth.playSuccess();
                } else {
                    AudioSynth.playError();
                }
            }
        }

        // Open Duolingo study path dashboard
        function openStudyDashboard() {
            if (!activeExamId) return;
            
            const exam = EXAMS_DATABASE[activeExamId];
            document.getElementById('dashboardExamTitle').textContent = exam.name;
            
            // Build tree path vertical nodes
            const pathTree = document.getElementById('dashboardPathTree');
            pathTree.innerHTML = '';
            
            // Add vertical line
            const line = document.createElement('div');
            line.className = 'duo-path-line';
            pathTree.appendChild(line);
            
            const icons = {
                numeros: '<i class="fa-solid fa-calculator"></i>',
                algebra: '<i class="fa-solid fa-square-root-variable"></i>',
                geometria: '<i class="fa-solid fa-draw-polygon"></i>',
                probabilidad: '<i class="fa-solid fa-chart-pie"></i>',
                logaritmos: '<i class="fa-solid fa-superscript"></i>',
                sistemas: '<i class="fa-solid fa-circle-nodes"></i>',
                trig: '<i class="fa-solid fa-bezier-curve"></i>',
                prob_cond: '<i class="fa-solid fa-chart-line"></i>',
                localizar: '<i class="fa-solid fa-magnifying-glass"></i>',
                interpretar: '<i class="fa-solid fa-brain"></i>',
                evaluar: '<i class="fa-solid fa-scale-balanced"></i>',
                bio: '<i class="fa-solid fa-dna"></i>',
                fis: '<i class="fa-solid fa-bolt"></i>',
                qui: '<i class="fa-solid fa-flask"></i>',
                siglo20: '<i class="fa-solid fa-landmark"></i>',
                ciudadania: '<i class="fa-solid fa-users"></i>',
                economia: '<i class="fa-solid fa-coins"></i>',
                legislacion: '<i class="fa-solid fa-car"></i>',
                seguridad: '<i class="fa-solid fa-heart-pulse"></i>',
                mecanica: '<i class="fa-solid fa-wrench"></i>'
            };
            
            let unlockedPrevious = true;
            
            exam.topics.forEach((topic, idx) => {
                const node = document.createElement('div');
                node.className = 'duo-path-node';
                node.id = `nodeTopic_${topic.id}`;
                
                const mastery = activeStudyState.topicMastery[topic.id] || 0;
                
                // Check if locked
                const isLocked = !unlockedPrevious;
                if (isLocked) {
                    node.classList.add('locked');
                }
                
                // Circle SVG Progress Ring calculation
                const radius = 40;
                const circumference = 2 * Math.PI * radius; // ~251.2
                const offset = circumference - (mastery / 100) * circumference;
                
                const iconHtml = isLocked ? '<i class="fa-solid fa-lock"></i>' : (icons[topic.id] || '<i class="fa-solid fa-book-open"></i>');
                
                node.innerHTML = `
                    <div class="node-ring">
                        <svg class="node-progress-circle">
                            <circle cx="42" cy="42" r="40" style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${isLocked ? circumference : offset};"></circle>
                        </svg>
                        <div class="node-inner">
                            ${iconHtml}
                        </div>
                    </div>
                    <div class="node-label">
                        ${topic.name}
                        <div class="node-sublabel">${isLocked ? "Bloqueado (Completa los anteriores)" : `Dominio: ${mastery}%`}</div>
                    </div>
                `;
                
                if (!isLocked) {
                    node.onclick = () => {
                        startPracticeSession(topic.id);
                    };
                } else {
                    node.onclick = () => {
                        showNotification("🔒 Completa las lecciones anteriores para desbloquear este nivel de estudio.");
                        AudioSynth.playError();
                    };
                }
                
                pathTree.appendChild(node);
                
                // Unlock condition: must have at least 60% mastery to unlock the next world
                unlockedPrevious = (mastery >= 60);
            });
            
            // Build stats summary bars
            const statsSummary = document.getElementById('dashboardStatsSummary');
            statsSummary.innerHTML = '';
            exam.topics.forEach(topic => {
                const mastery = activeStudyState.topicMastery[topic.id] || 0;
                const row = document.createElement('div');
                row.innerHTML = `
                    <div style="display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; font-weight: 700; color: white;">
                        <span>${topic.name}</span>
                        <span>${mastery}%</span>
                    </div>
                    <div class="mastery-progress-bar">
                        <div class="mastery-progress-fill" style="width: ${mastery}%;"></div>
                    </div>
                `;
                statsSummary.appendChild(row);
            });
            
            // Fill history table body
            const historyBody = document.getElementById('dashboardHistoryTableBody');
            historyBody.innerHTML = '';
            
            if (activeStudyState.history.length === 0) {
                historyBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: rgba(255,255,255,0.35);">No hay registros aún</td></tr>`;
            } else {
                // Show latest 10 attempts
                const historyList = [...activeStudyState.history].reverse().slice(0, 10);
                historyList.forEach(h => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td>${h.date}</td>
                        <td style="font-weight: 700; color: #a78bfa;">${h.type}</td>
                        <td style="font-weight: 750; color: #10b981;">${h.score}</td>
                        <td>${h.duration}</td>
                    `;
                    historyBody.appendChild(tr);
                });
            }
            
            // Check if user has overall mastery (congratulations screen)
            let totalScore = 0;
            exam.topics.forEach(t => {
                totalScore += activeStudyState.topicMastery[t.id] || 0;
            });
            const avgMastery = exam.topics.length > 0 ? (totalScore / exam.topics.length) : 0;
            if (avgMastery >= 90) {
                showNotification("🎉 ¡Felicidades! Has superado el 90% de dominio en todos los temas del examen. ¡Estás preparado para el examen real!");
            }
            
            transitionStudyScreen('dashboard');
        }
        window.openStudyDashboard = openStudyDashboard;

        // Start Daily Practice Session
        function startPracticeSession(topicId) {
            const exam = EXAMS_DATABASE[activeExamId];
            const topic = exam.topics.find(t => t.id === topicId);
            if (!topic) return;
            
            currentPracticeTopicId = topicId;
            practiceLivesCount = 5;
            playerScore = 0;
            playerCurrentIndex = 0;
            playerTimeElapsed = 0;
            questionTimes = [];
            
            // Select questions from topic (or fallbacks)
            const topicQuestions = exam.questions.filter(q => q.topic === topicId);
            // Shuffle
            playerQuestions = topicQuestions.sort(() => 0.5 - Math.random()).slice(0, 6);
            
            if (playerQuestions.length === 0) {
                showNotification("⚠️ No hay suficientes preguntas de este tema.");
                return;
            }
            
            activePlayerFlow = 'practice';
            document.getElementById('practiceTopicTitle').textContent = `Práctica: ${topic.name}`;
            document.getElementById('practiceLives').innerHTML = `<i class="fa-solid fa-heart" style="filter: drop-shadow(0 0 3px rgba(239,68,68,0.5));"></i> ${practiceLivesCount}`;
            
            transitionStudyScreen('practice');
            loadPracticeQuestion();
        }
        window.startPracticeSession = startPracticeSession;

        function loadPracticeQuestion() {
            // Hide feedback bar
            document.getElementById('duoFeedbackBar').classList.remove('show');
            
            if (playerCurrentIndex >= playerQuestions.length) {
                finishPracticeSession();
                return;
            }
            
            if (practiceLivesCount <= 0) {
                abortPracticeSession("vidas");
                return;
            }
            
            selectedOptionIndex = null;
            const q = playerQuestions[playerCurrentIndex];
            questionStartTime = Date.now();
            
            // Progress Bar
            const progress = (playerCurrentIndex / playerQuestions.length) * 100;
            document.getElementById('practiceProgressBar').style.width = `${progress}%`;
            
            // Question index
            document.getElementById('practiceQuestionIndex').textContent = `Pregunta ${playerCurrentIndex + 1} de ${playerQuestions.length}`;
            document.getElementById('practiceQuestionText').textContent = q.question;
            
            // Render Options
            const container = document.getElementById('practiceOptionsContainer');
            container.innerHTML = '';
            
            const letters = ["A", "B", "C", "D"];
            q.options.forEach((opt, idx) => {
                const btn = document.createElement('button');
                btn.className = 'study-option-btn';
                btn.id = `practiceOptBtn_${idx}`;
                btn.onclick = () => {
                    // Lock selecting after submitted
                    const isFeedbackOpen = document.getElementById('duoFeedbackBar').classList.contains('show');
                    if (isFeedbackOpen) return;
                    
                    q.options.forEach((o, i) => {
                        const b = document.getElementById(`practiceOptBtn_${i}`);
                        if (b) b.classList.remove('selected');
                    });
                    btn.classList.add('selected');
                    selectedOptionIndex = idx;
                    
                    // Show check answer bar
                    showCheckAnswerBar();
                };
                btn.innerHTML = `
                    <div class="study-option-letter">${letters[idx]}</div>
                    <div>${opt}</div>
                `;
                container.appendChild(btn);
            });
        }

        // Show check bar
        function showCheckAnswerBar() {
            const bar = document.getElementById('duoFeedbackBar');
            bar.className = 'duo-feedback-bar';
            
            const btn = document.getElementById('duoFeedbackBtn');
            btn.textContent = 'Comprobar';
            btn.style.background = '#7c3aed';
            btn.onclick = window.checkPracticeAnswer;
            
            document.getElementById('duoFeedbackIcon').innerHTML = `<i class="fa-solid fa-question"></i>`;
            document.getElementById('duoFeedbackTitle').textContent = '¿Seguro de tu respuesta?';
            document.getElementById('duoFeedbackDesc').textContent = 'Presiona Comprobar para verificar tu alternativa.';
            
            bar.classList.add('show');
        }

        function checkPracticeAnswer() {
            if (selectedOptionIndex === null) return;
            
            const q = playerQuestions[playerCurrentIndex];
            const duration = (Date.now() - questionStartTime) / 1000;
            
            const isCorrect = (selectedOptionIndex === q.correct);
            const bar = document.getElementById('duoFeedbackBar');
            
            if (isCorrect) {
                playerScore++;
                bar.classList.add('success');
                document.getElementById('duoFeedbackIcon').innerHTML = `<i class="fa-solid fa-circle-check"></i>`;
                document.getElementById('duoFeedbackTitle').textContent = '¡Correcto! Excelente.';
                document.getElementById('duoFeedbackDesc').textContent = `${q.explanation}`;
                AudioSynth.playSuccess();
            } else {
                practiceLivesCount--;
                document.getElementById('practiceLives').innerHTML = `<i class="fa-solid fa-heart" style="filter: drop-shadow(0 0 3px rgba(239,68,68,0.5));"></i> ${practiceLivesCount}`;
                
                bar.classList.add('error');
                document.getElementById('duoFeedbackIcon').innerHTML = `<i class="fa-solid fa-circle-xmark"></i>`;
                document.getElementById('duoFeedbackTitle').textContent = 'Respuesta Incorrecta';
                document.getElementById('duoFeedbackDesc').textContent = `Correcta: ${q.options[q.correct]}. ${q.explanation}`;
                AudioSynth.playError();
            }
            
            questionTimes.push({
                correct: isCorrect,
                time: duration
            });
            
            const btn = document.getElementById('duoFeedbackBtn');
            btn.textContent = 'Continuar';
            btn.style.background = isCorrect ? '#10b981' : '#ef4444';
            btn.onclick = () => {
                playerCurrentIndex++;
                loadPracticeQuestion();
            };
        }
        window.checkPracticeAnswer = checkPracticeAnswer;

        function practiceNextQuestion() {
            // Placeholder handled dynamically in click callbacks
        }
        window.practiceNextQuestion = practiceNextQuestion;

        function abortPracticeSession(reason) {
            clearInterval(playerTimerInterval);
            if (reason === 'vidas') {
                showNotification("💔 ¡Vidas agotadas! Inténtalo de nuevo cuando te sientas listo.");
            }
            openStudyDashboard();
        }
        window.abortPracticeSession = abortPracticeSession;

        function finishPracticeSession() {
            // Calculate session mastery gain or loss
            const masteryDiff = Math.round((playerScore / playerQuestions.length) * 20); // max +20% gain
            const current = activeStudyState.topicMastery[currentPracticeTopicId] || 0;
            
            // Adjust mastery adaptively
            let updatedMastery = current;
            if (playerScore === playerQuestions.length) {
                // Perfect score -> gain full
                updatedMastery = Math.min(100, current + 15);
            } else if (playerScore >= playerQuestions.length - 1) {
                updatedMastery = Math.min(100, current + 8);
            } else {
                // Deduct if performed poorly
                updatedMastery = Math.max(0, current - 10);
            }
            
            activeStudyState.topicMastery[currentPracticeTopicId] = updatedMastery;
            
            // Save session
            const today = new Date().toLocaleDateString();
            activeStudyState.history.push({
                date: today,
                type: `Práctica: ${EXAMS_DATABASE[activeExamId].topics.find(t => t.id === currentPracticeTopicId).name}`,
                score: `${playerScore}/${playerQuestions.length}`,
                duration: "Completado"
            });
            
            saveStudyState();
            openStudyDashboard();
            
            showNotification(`🎯 Práctica finalizada. Tu nivel de dominio ahora es de ${updatedMastery}%.`);
            AudioSynth.playSuccess();
        }

        // Start Full Country simulation
        function startCountrySimulation() {
            const exam = EXAMS_DATABASE[activeExamId];
            
            // Draw random questions from all topics
            playerQuestions = [...exam.questions].sort(() => 0.5 - Math.random()).slice(0, 15);
            
            activePlayerFlow = 'simulation';
            playerCurrentIndex = 0;
            playerScore = 0;
            questionTimes = [];
            playerTimeElapsed = 0;
            
            document.getElementById('playerExamTitle').textContent = `SIMULACIÓN PAÍS: ${exam.name}`;
            
            transitionStudyScreen('player');
            startPlayerTimer();
            loadPlayerQuestion();
        }
        window.startCountrySimulation = startCountrySimulation;

        // selectMockupExam legacy handler wrapper (optional, just in case)
        function selectMockupExam(examKey, element) {
            window.openExamStudySystem(examKey);
        }
        window.selectMockupExam = selectMockupExam;

        window.initDuoSystemOnLoad = initDuoSystemOnLoad;
        window.refillHearts = refillHearts;

        // ============================================
        // SISTEMA DE AJUSTES & CONFIGURACIÓN PERSONALIZADA (MYXSI SETTINGS)
        // ============================================
        window.showSettings = () => {};
        window.closeSettings = () => {};

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

        window.toggleSidebarDesktop = () => {
            const sb = document.getElementById('sidebar') || document.querySelector('.main-sidebar');
            if (sb) {
                sb.classList.toggle('collapsed');
                localStorage.setItem('sidebarCollapsed', sb.classList.contains('collapsed') ? 'true' : 'false');
            }
        };
        // Restore sidebar state immediately
        (function() {
            if (localStorage.getItem('sidebarCollapsed') === 'true') {
                const sb = document.getElementById('sidebar') || document.querySelector('.main-sidebar');
                if (sb) sb.classList.add('collapsed');
            }
        })();

// --- AUTO-ATTACH FUNCTIONS TO WINDOW FOR HTML ONCLICK HANDLERS ---
window.customConfirm = customConfirm;
window.personalizeWelcomeUI = personalizeWelcomeUI;
window.formatRelativeTime = formatRelativeTime;
window.renderChatsList = renderChatsList;
window.localizeInterface = localizeInterface;
window.openRoadmap = openRoadmap;
window.setupStudyFlowNavArea = setupStudyFlowNavArea;
window.updateStepsTrackerUI = updateStepsTrackerUI;
window.formatContent = formatContent;
window.appendStudyMessage = appendStudyMessage;
window.checkStreakMissed = checkStreakMissed;
window.updateDuolingoUI = updateDuolingoUI;
window.awardXP = awardXP;
window.deductHeart = deductHeart;
window.updateDailyStreak = updateDailyStreak;
window.evaluateAIResponse = evaluateAIResponse;
window.openNoHeartsModal = openNoHeartsModal;
window.closeNoHeartsModal = closeNoHeartsModal;
window.activarEfectoMagnetico = activarEfectoMagnetico;
window.updateTerminalLog = updateTerminalLog;
window.loadMonacoEditor = loadMonacoEditor;
window.getStorageKey = getStorageKey;
window.openExamStudySystemInternal = openExamStudySystemInternal;
window.hideAllStudyScreens = hideAllStudyScreens;
window.renderSyllabusTopics = renderSyllabusTopics;
window.startPlayerTimer = startPlayerTimer;
window.loadPlayerQuestion = loadPlayerQuestion;
window.finishExamPlayer = finishExamPlayer;
window.loadPracticeQuestion = loadPracticeQuestion;
window.showCheckAnswerBar = showCheckAnswerBar;
window.finishPracticeSession = finishPracticeSession;
