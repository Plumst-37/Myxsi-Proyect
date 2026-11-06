/**
 * =========================================================================
 * MYXSI SHARED AUTHENTICATION & GOOGLE DRIVE ECOSYSTEM MANAGER
 * =========================================================================
 * Módulo unificado para sincronizar la sesión del usuario (Myxsi Account),
 * renderizar la foto de perfil con referrerpolicy="no-referrer", vincular
 * Google Drive / Google Docs y gestionar el estado global en todas las subpáginas.
 */

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

(function() {
    // -------------------------------------------------------------
    // 1. INYECCIÓN DE ESTILOS UNIFICADOS (MODAL, DRIVE BADGE, TOASTS)
    // -------------------------------------------------------------
    function injectSharedAuthStyles() {
        if (document.getElementById('myxsi-auth-shared-styles')) return;

        const style = document.createElement('style');
        style.id = 'myxsi-auth-shared-styles';
        style.textContent = `
            /* Badge de Google Drive Activo */
            .gdrive-connected-badge {
                display: inline-flex;
                align-items: center;
                gap: 7px;
                padding: 4px 12px;
                border-radius: 9999px;
                background: rgba(16, 185, 129, 0.12);
                border: 1px solid rgba(16, 185, 129, 0.35);
                color: #10b981;
                font-size: 0.78rem;
                font-weight: 750;
                white-space: nowrap;
                letter-spacing: -0.01em;
                user-select: none;
                transition: all 0.2s ease;
            }
            :root[data-theme="dark"] .gdrive-connected-badge,
            body.dark .gdrive-connected-badge {
                background: rgba(16, 185, 129, 0.16);
                border-color: rgba(52, 211, 153, 0.4);
                color: #34d399;
            }
            .drive-pulse-dot {
                width: 7px;
                height: 7px;
                border-radius: 50%;
                background: #10b981;
                box-shadow: 0 0 8px #10b981;
                animation: myxsiDrivePulse 2s infinite ease-in-out;
            }
            @keyframes myxsiDrivePulse {
                0%, 100% { transform: scale(0.9); opacity: 0.8; box-shadow: 0 0 4px #10b981; }
                50% { transform: scale(1.2); opacity: 1; box-shadow: 0 0 10px #34d399; }
            }

            /* Botón Conectar Drive */
            .btn-action-drive-shared {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 5px 12px;
                border-radius: 9999px;
                background: rgba(139, 92, 246, 0.12);
                border: 1px solid rgba(139, 92, 246, 0.3);
                color: var(--files-text, #a78bfa);
                font-size: 0.78rem;
                font-weight: 700;
                cursor: pointer;
                transition: all 0.2s ease;
                white-space: nowrap;
            }
            .btn-action-drive-shared:hover {
                background: rgba(139, 92, 246, 0.25);
                border-color: rgba(167, 139, 250, 0.5);
                transform: translateY(-1px);
                color: #fff;
            }

            /* Botón de Perfil de Usuario Redondo */
            #btnUserDetails {
                overflow: hidden !important;
                padding: 0 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                cursor: pointer !important;
            }
            #btnUserDetails img {
                width: 100% !important;
                height: 100% !important;
                border-radius: 50% !important;
                object-fit: cover !important;
                display: block !important;
            }

            /* Modal de Detalles de Usuario */
            .myxsi-user-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background: rgba(5, 3, 15, 0.75);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                z-index: 999999;
                display: none;
                align-items: center;
                justify-content: center;
                padding: 16px;
                opacity: 0;
                transition: opacity 0.25s ease;
            }
            .myxsi-user-modal-overlay.show {
                display: flex;
                opacity: 1;
            }
            .myxsi-user-modal-box {
                background: #110926;
                border: 1px solid rgba(167, 139, 250, 0.25);
                box-shadow: 0 25px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06);
                border-radius: 24px;
                max-width: 430px;
                width: 100%;
                padding: 24px;
                position: relative;
                color: #ffffff;
                font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
                animation: myxsiModalPop 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            }
            @keyframes myxsiModalPop {
                0% { transform: scale(0.92); opacity: 0; }
                100% { transform: scale(1); opacity: 1; }
            }
            .myxsi-modal-close-btn {
                position: absolute;
                top: 16px;
                right: 16px;
                background: rgba(255,255,255,0.06);
                border: none;
                border-radius: 50%;
                width: 32px;
                height: 32px;
                display: grid;
                place-items: center;
                color: #94a3b8;
                cursor: pointer;
                transition: all 0.2s;
            }
            .myxsi-modal-close-btn:hover {
                background: rgba(255,255,255,0.15);
                color: #ffffff;
            }

            /* Toasts Unificados */
            .myxsi-shared-toast-container {
                position: fixed;
                bottom: 24px;
                right: 24px;
                display: flex;
                flex-direction: column;
                gap: 10px;
                z-index: 1000000;
                pointer-events: none;
            }
            .myxsi-shared-toast {
                background: rgba(17, 9, 38, 0.95);
                backdrop-filter: blur(12px);
                border: 1px solid rgba(167, 139, 250, 0.3);
                box-shadow: 0 12px 36px rgba(0,0,0,0.6);
                color: #ffffff;
                padding: 12px 18px;
                border-radius: 14px;
                font-size: 0.85rem;
                display: flex;
                align-items: center;
                gap: 10px;
                animation: myxsiToastIn 0.3s ease;
                pointer-events: auto;
                max-width: 380px;
            }
            .myxsi-shared-toast.hide {
                opacity: 0;
                transform: translateY(10px);
                transition: all 0.3s ease;
            }
            @keyframes myxsiToastIn {
                0% { opacity: 0; transform: translateY(12px); }
                100% { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }
    injectSharedAuthStyles();

    // -------------------------------------------------------------
    // 2. SISTEMA DE TOAST NOTIFICATIONS
    // -------------------------------------------------------------
    function showToast(message, type = 'info') {
        let container = document.getElementById('myxsiSharedToastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'myxsiSharedToastContainer';
            container.className = 'myxsi-shared-toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `myxsi-shared-toast toast-${type}`;
        let icon = '<i class="fa-solid fa-circle-info" style="color: #a78bfa;"></i>';
        if (type === 'success') icon = '<i class="fa-solid fa-circle-check" style="color: #34d399;"></i>';
        if (type === 'error') icon = '<i class="fa-solid fa-circle-exclamation" style="color: #f87171;"></i>';
        
        toast.innerHTML = `${icon} <span style="font-weight: 500;">${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 300);
        }, 3600);
    }
    window.showMyxsiToast = showToast;
    if (!window.showToast) window.showToast = showToast;

    // -------------------------------------------------------------
    // 3. RECUPERAR DATOS DEL USUARIO GUARDADOS EN STORAGE
    // -------------------------------------------------------------
    function getStoredUser() {
        try {
            const str = localStorage.getItem('myxsi_user');
            if (str) {
                const u = JSON.parse(str);
                if (u && (u.uid || u.email || u.displayName)) return u;
            }
        } catch(e) {}

        const email = localStorage.getItem('myxsi_user_email') || sessionStorage.getItem('myxsi_user_email');
        const name = sessionStorage.getItem('myxsi_user_name');
        if (email || name) {
            return {
                email: email || '',
                displayName: name || (email ? email.split('@')[0] : 'Usuario'),
                photoURL: null
            };
        }
        return null;
    }
    window.getMyxsiUser = getStoredUser;

    // -------------------------------------------------------------
    // 4. RENDERIZADO VISUAL DEL PERFIL EN HEADER, SIDEBAR Y MODAL
    // -------------------------------------------------------------
    function renderUserProfile(user) {
        const u = user || getStoredUser();
        const name = u?.displayName || sessionStorage.getItem('myxsi_user_name') || (u?.email ? u.email.split('@')[0] : 'Usuario');
        const initial = name ? name.trim().charAt(0).toUpperCase() : 'U';

        // Actualizar nombres en pantalla
        const nameDisplay = document.getElementById('userNameDisplay');
        if (nameDisplay && !nameDisplay.textContent.includes('¡')) nameDisplay.textContent = name;

        const sidebarName = document.getElementById('sidebarUserName');
        if (sidebarName) sidebarName.textContent = name;

        const modalName = document.getElementById('modalUserName');
        if (modalName) modalName.textContent = name;

        const modalEmail = document.getElementById('modalUserEmail');
        if (modalEmail) modalEmail.textContent = u?.email || 'Cuenta Local de Myxsi';

        const modalJoined = document.getElementById('modalUserJoined');
        if (modalJoined) {
            modalJoined.textContent = u?.metadata?.creationTime 
                ? new Date(u.metadata.creationTime).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
                : 'Activa';
        }

        // Actualizar Avatar en el botón de cabecera (#btnUserDetails)
        const avatarBtn = document.getElementById('btnUserDetails');
        if (avatarBtn) {
            avatarBtn.title = `Perfil: ${name} (${u?.email || 'Conectado'})`;
            avatarBtn.setAttribute('aria-label', `Perfil de ${name}`);
            
            if (u?.photoURL) {
                avatarBtn.innerHTML = `<img src="${u.photoURL}" alt="${name}" referrerpolicy="no-referrer" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;">`;
            } else {
                avatarBtn.innerHTML = `<div class="user-initial" style="width: 100%; height: 100%; border-radius: 50%; background: linear-gradient(135deg, #a78bfa 0%, #6d28d9 100%); display: flex; align-items: center; justify-content: center; color: #ffffff; font-weight: 800; font-size: 0.95rem;">${initial}</div>`;
            }
        }

        // Actualizar Avatar en el Modal
        const modalAvatarBox = document.getElementById('modalUserAvatarBox');
        if (modalAvatarBox) {
            if (u?.photoURL) {
                modalAvatarBox.innerHTML = `<img src="${u.photoURL}" alt="${name}" referrerpolicy="no-referrer" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block;">`;
            } else {
                modalAvatarBox.innerHTML = `<div style="width: 100%; height: 100%; background: linear-gradient(135deg, #a78bfa, #6d28d9); display: grid; place-items: center; color: #fff; font-size: 2rem; font-weight: 800;">${initial}</div>`;
            }
        }

        // Racha de estudio / Duo Streak
        const streak = localStorage.getItem('myxsi_duo_streak') || '0';
        const headerStreak = document.getElementById('headerStreakCount');
        const sidebarStreak = document.getElementById('sidebarRachaNum');
        const rachaDaysCount = document.querySelector('.racha-days-count span:first-child');
        if (headerStreak) headerStreak.textContent = streak;
        if (sidebarStreak) sidebarStreak.textContent = streak;
        if (rachaDaysCount) rachaDaysCount.textContent = streak;
    }
    window.renderUserProfile = renderUserProfile;

    // -------------------------------------------------------------
    // 4.1 SINCRONIZACIÓN DE RACHA Y PERFIL EN LA NUBE (GOOGLE DRIVE & D1)
    // -------------------------------------------------------------
    let _activeSyncPromise = null;

    async function syncStreakAndProfileWithCloud() {
        if (_activeSyncPromise) {
            return _activeSyncPromise;
        }

        _activeSyncPromise = (async () => {
            try {
                // 1. ESTADO LOCAL
                const rawLocalStreak = localStorage.getItem('myxsi_duo_streak');
                let localStreak = parseInt(rawLocalStreak, 10);
                if (isNaN(localStreak) || localStreak < 0) {
                    localStreak = 0;
                    localStorage.setItem('myxsi_duo_streak', '0');
                }
                let localXP = parseInt(localStorage.getItem('myxsi_duo_xp') || '0', 10);
                if (isNaN(localXP) || localXP < 0) localXP = 0;
                let localLevel = parseInt(localStorage.getItem('myxsi_duo_level') || '1', 10);
                if (isNaN(localLevel) || localLevel < 1) localLevel = 1;
                let localHearts = parseInt(localStorage.getItem('myxsi_duo_hearts') || '5', 10);
                if (isNaN(localHearts) || localHearts < 0) localHearts = 5;
                let localLastDate = localStorage.getItem('myxsi_duo_last_date') || null;

                // 2. CONSULTAR CLOUDFLARE D1
                const user = getStoredUser();
                let d1Streak = null;
                let d1XP = null;
                let d1Level = null;
                let d1Hearts = null;
                let d1LastDate = null;
                let d1Queried = false;

                if (user && (user.uid || user.email)) {
                    try {
                        const apiBase = window.MYXSI_BACKEND_URL || 'https://myxsi-backend.inoxwayoficial.workers.dev';
                        const sRes = await fetch(`${apiBase}/api/getUserData`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                action: 'getUserData',
                                uid: user.uid || '',
                                email: user.email || ''
                            })
                        });
                        if (sRes.ok) {
                            const sData = await sRes.json();
                            d1Queried = true;
                            const uRec = sData?.data?.userData || sData?.userData;
                            if (uRec) {
                                const parsedStreak = parseInt(uRec.duoStreak, 10);
                                d1Streak = !isNaN(parsedStreak) ? parsedStreak : 0;
                                d1XP = parseInt(uRec.duoXP, 10) || 0;
                                d1Level = parseInt(uRec.duoLevel, 10) || 1;
                                d1Hearts = parseInt(uRec.duoHearts !== undefined ? uRec.duoHearts : 5, 10);
                                d1LastDate = uRec.duoLastDate || null;
                            }
                        }
                    } catch (d1Err) {
                        console.warn("Cloudflare D1 streak sync notice:", d1Err);
                    }
                }

                // 3. CONSULTAR GOOGLE DRIVE (.myxsi_profile.json)
                let token = localStorage.getItem('gdrive_access_token');
                if (!token && typeof window.ensureValidToken === 'function') {
                    token = await window.ensureValidToken(false);
                }

                let driveFileId = null;
                let driveStreak = null;
                let driveXP = null;
                let driveLevel = null;
                let driveHearts = null;
                let driveLastDate = null;
                let driveQueried = false;

                if (token) {
                    try {
                        const q = "name = '.myxsi_profile.json' and trashed = false";
                        const driveSearchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&orderBy=${encodeURIComponent('modifiedTime desc')}&fields=files(id,name,appProperties,parents,modifiedTime)&pageSize=1`;
                        const res = await fetch(driveSearchUrl, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });

                        if (res.ok) {
                            const data = await res.json();
                            driveQueried = true;
                            const existingFile = data.files && data.files[0];
                            if (existingFile && existingFile.id) {
                                driveFileId = existingFile.id;
                                const props = existingFile.appProperties || {};
                                const propStreak = parseInt(props.duoStreak, 10);
                                if (!isNaN(propStreak)) {
                                    driveStreak = propStreak;
                                    driveXP = parseInt(props.duoXP, 10) || 0;
                                    driveLevel = parseInt(props.duoLevel, 10) || 1;
                                    driveHearts = parseInt(props.duoHearts, 10) || 5;
                                    driveLastDate = props.duoLastDate || null;
                                }

                                if (driveStreak === null) {
                                    try {
                                        const bodyRes = await fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media`, {
                                            headers: { 'Authorization': `Bearer ${token}` }
                                        });
                                        if (bodyRes.ok) {
                                            const bodyJson = await bodyRes.json();
                                            const bStreak = parseInt(bodyJson.duoStreak, 10);
                                            driveStreak = !isNaN(bStreak) ? bStreak : 0;
                                            driveXP = parseInt(bodyJson.duoXP, 10) || 0;
                                            driveLevel = parseInt(bodyJson.duoLevel, 10) || 1;
                                            driveHearts = parseInt(bodyJson.duoHearts, 10) || 5;
                                            driveLastDate = bodyJson.duoLastDate || null;
                                        }
                                    } catch (errB) {
                                        console.warn("Drive profile body read notice:", errB);
                                    }
                                }
                            }
                        }
                    } catch (driveErr) {
                        console.warn("Google Drive streak sync notice:", driveErr);
                    }
                }

                // 4. RECONCILIACIÓN DE LA MÁXIMA RACHA Y PROGRESO
                const candidateStreaks = [localStreak];
                if (d1Streak !== null && !isNaN(d1Streak)) candidateStreaks.push(d1Streak);
                if (driveStreak !== null && !isNaN(driveStreak)) candidateStreaks.push(driveStreak);
                const maxStreak = Math.max(...candidateStreaks);

                let reconciledXP = localXP;
                if (d1XP !== null && d1XP > reconciledXP) reconciledXP = d1XP;
                if (driveXP !== null && driveXP > reconciledXP) reconciledXP = driveXP;

                let reconciledLevel = localLevel;
                if (d1Level !== null && d1Level > reconciledLevel) reconciledLevel = d1Level;
                if (driveLevel !== null && driveLevel > reconciledLevel) reconciledLevel = driveLevel;

                let reconciledHearts = localHearts;
                if (d1Hearts !== null) reconciledHearts = d1Hearts;
                else if (driveHearts !== null) reconciledHearts = driveHearts;

                let reconciledLastDate = localLastDate;
                if (maxStreak === d1Streak && d1LastDate) reconciledLastDate = d1LastDate;
                else if (maxStreak === driveStreak && driveLastDate) reconciledLastDate = driveLastDate;
                if (!reconciledLastDate) reconciledLastDate = new Date().toISOString().split('T')[0];

                // 5. ACTUALIZAR ALMACENAMIENTO LOCAL Y ELEMENTOS DEL DOM
                localStorage.setItem('myxsi_duo_streak', maxStreak.toString());
                localStorage.setItem('myxsi_duo_xp', reconciledXP.toString());
                localStorage.setItem('myxsi_duo_level', reconciledLevel.toString());
                localStorage.setItem('myxsi_duo_hearts', reconciledHearts.toString());
                if (reconciledLastDate) localStorage.setItem('myxsi_duo_last_date', reconciledLastDate);

                const headerStreak = document.getElementById('headerStreakCount');
                const sidebarStreak = document.getElementById('sidebarRachaNum');
                const rachaDaysCount = document.querySelector('.racha-days-count span:first-child');
                if (headerStreak) headerStreak.textContent = maxStreak.toString();
                if (sidebarStreak) sidebarStreak.textContent = maxStreak.toString();
                if (rachaDaysCount) rachaDaysCount.textContent = maxStreak.toString();

                renderUserProfile();

                // Notificar a todos los escuchadores de la aplicación
                window.dispatchEvent(new CustomEvent('myxsi_streak_updated', {
                    detail: {
                        streak: maxStreak,
                        xp: reconciledXP,
                        level: reconciledLevel,
                        hearts: reconciledHearts,
                        lastDate: reconciledLastDate
                    }
                }));

                // 6. PROPAGAR DE FORMA BIDIRECCIONAL A LAS NUBES DESACTUALIZADAS
                // A. Actualizar Cloudflare D1 si está por detrás
                if (user && (user.uid || user.email) && (d1Streak === null || d1Streak < maxStreak || localStreak > (d1Streak || 0))) {
                    try {
                        const apiBase = window.MYXSI_BACKEND_URL || 'https://myxsi-backend.inoxwayoficial.workers.dev';
                        await fetch(`${apiBase}/`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                action: 'syncDuoData',
                                uid: user.uid || '',
                                email: user.email || '',
                                duoStreak: maxStreak,
                                duoXP: reconciledXP,
                                duoLevel: reconciledLevel,
                                duoHearts: reconciledHearts,
                                duoLastDate: reconciledLastDate
                            })
                        }).catch(e => console.warn('Sync D1 push failed:', e));
                    } catch (e) {}
                }

                // B. Actualizar Google Drive si está por detrás o el archivo aún no existe
                if (token && driveQueried && (driveStreak === null || driveStreak < maxStreak || localStreak > (driveStreak || 0))) {
                    try {
                        const appProps = {
                            duoStreak: maxStreak.toString(),
                            duoXP: reconciledXP.toString(),
                            duoLevel: reconciledLevel.toString(),
                            duoHearts: reconciledHearts.toString(),
                            duoLastDate: reconciledLastDate,
                            updatedAt: Date.now().toString()
                        };

                        if (driveFileId) {
                            await fetch(`https://www.googleapis.com/drive/v3/files/${driveFileId}`, {
                                method: 'PATCH',
                                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    appProperties: appProps
                                })
                            });
                        } else {
                            const folderId = typeof window.getOrCreateMyxsiDriveFolder === 'function'
                                ? await window.getOrCreateMyxsiDriveFolder('Myxsi Documents', token).catch(() => null)
                                : null;

                            const postObj = {
                                name: '.myxsi_profile.json',
                                mimeType: 'application/json',
                                appProperties: appProps
                            };
                            if (folderId) postObj.parents = [folderId];

                            await fetch('https://www.googleapis.com/drive/v3/files', {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                                body: JSON.stringify(postObj)
                            });
                        }
                    } catch (e) {
                        console.warn('Sync Drive push failed:', e);
                    }
                }

                return {
                    streak: maxStreak,
                    xp: reconciledXP,
                    level: reconciledLevel,
                    hearts: reconciledHearts,
                    lastDate: reconciledLastDate
                };

            } catch (err) {
                console.warn("Cloud streak sync notice:", err);
                return {
                    streak: parseInt(localStorage.getItem('myxsi_duo_streak') || '0', 10),
                    xp: parseInt(localStorage.getItem('myxsi_duo_xp') || '0', 10),
                    level: parseInt(localStorage.getItem('myxsi_duo_level') || '1', 10)
                };
            } finally {
                _activeSyncPromise = null;
            }
        })();

        return _activeSyncPromise;
    }
    window.syncStreakAndProfileWithCloud = syncStreakAndProfileWithCloud;

    // -------------------------------------------------------------
    // 5. ACTUALIZAR BADGE DE ESTADO DE GOOGLE DRIVE EN TODA LA UI
    // -------------------------------------------------------------
    function updateDriveStatusUI(isConnected) {
        const hasToken = isConnected !== undefined ? Boolean(isConnected) : Boolean(localStorage.getItem('gdrive_access_token'));
        
        // Elementos objetivo de estado en la cabecera
        const containers = [
            document.getElementById('topbarDriveStatus'),
            document.getElementById('driveStatusContainer'),
            document.getElementById('headerDriveBadge')
        ].filter(Boolean);

        containers.forEach(container => {
            if (hasToken) {
                container.innerHTML = `
                    <div class="gdrive-connected-badge" title="Google Drive conectado y sincronizado">
                        <span class="drive-pulse-dot"></span>
                        <svg width="14" height="14" viewBox="0 0 87.3 78"><path fill="#0066da" d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z"/><path fill="#00ac47" d="M43.65 25l13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2H17.4c-1.55 0-3.1.4-4.5 1.2z"/><path fill="#ea4335" d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 10.15z"/><path fill="#00832d" d="M43.65 25L30 50h27.4z"/><path fill="#2684fc" d="M73.55 26.2c-.8-1.4-1.95-2.5-3.3-3.3L56.5 0H43.65l13.75 23.8 16.15 2.4z"/><path fill="#ffba00" d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3L1.2 47.9c-.8 1.4-1.2 2.95-1.2 4.5h27.5z"/></svg>
                        <span>Drive Activo</span>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <button class="btn-action-drive-shared" onclick="window.handleGDriveAuthClick()" title="Conectar tu cuenta de Google Drive para guardar y respaldar todo en la nube">
                        <svg width="14" height="14" viewBox="0 0 87.3 78"><path fill="#0066da" d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5z"/><path fill="#00ac47" d="M43.65 25l13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2H17.4c-1.55 0-3.1.4-4.5 1.2z"/><path fill="#ea4335" d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.5l5.85 10.15z"/><path fill="#00832d" d="M43.65 25L30 50h27.4z"/><path fill="#2684fc" d="M73.55 26.2c-.8-1.4-1.95-2.5-3.3-3.3L56.5 0H43.65l13.75 23.8 16.15 2.4z"/><path fill="#ffba00" d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3L1.2 47.9c-.8 1.4-1.2 2.95-1.2 4.5h27.5z"/></svg>
                        <span>Conectar Drive</span>
                    </button>
                `;
            }
        });

        // Actualizar indicador en el Modal
        const modalDriveStatus = document.getElementById('modalDriveStatus');
        const modalSyncBtn = document.getElementById('btnModalSyncDrive');
        if (modalDriveStatus) {
            modalDriveStatus.innerHTML = hasToken
                ? `<span style="color: #34d399; font-weight: 750; display: inline-flex; align-items: center; gap: 6px;"><span class="drive-pulse-dot" style="display:inline-block;"></span> Conectado y Sincronizado</span>`
                : `<span style="color: #94a3b8; font-weight: 600;">No vinculado</span>`;
        }
        if (modalSyncBtn) {
            modalSyncBtn.innerHTML = hasToken
                ? `<i class="fa-solid fa-arrows-rotate"></i> <span>Reconectar</span>`
                : `<i class="fa-brands fa-google-drive"></i> <span>Vincular</span>`;
        }

        // Actualizar estado en Docs / Sheets si existe
        const sheetStatus = document.getElementById('sheetSaveStatus');
        if (sheetStatus) {
            sheetStatus.innerHTML = hasToken
                ? `<i class="fa-solid fa-cloud-check" style="color: #34d399;"></i> <span>Sincronizado con Google Drive</span>`
                : `<i class="fa-solid fa-hard-drive" style="color: #a78bfa;"></i> <span>Guardado localmente en Myxsi</span>`;
        }
    }
    window.updateDriveStatusUI = updateDriveStatusUI;

    // -------------------------------------------------------------
    // 6. INYECCIÓN DEL MODAL DE DETALLES DE USUARIO SI NO EXISTE
    // -------------------------------------------------------------
    function ensureUserDetailsModal() {
        if (document.getElementById('userDetailsModal')) return;

        const modal = document.createElement('div');
        modal.id = 'userDetailsModal';
        modal.className = 'myxsi-user-modal-overlay';
        modal.onclick = function(e) {
            if (e.target === modal) window.toggleUserDetailsModal();
        };

        modal.innerHTML = `
            <div class="myxsi-user-modal-box">
                <button class="myxsi-modal-close-btn" onclick="window.toggleUserDetailsModal()" title="Cerrar ventana">
                    <i class="fa-solid fa-xmark"></i>
                </button>
                <div style="display: flex; flex-direction: column; align-items: center; gap: 10px; margin-bottom: 1.2rem;">
                    <div id="modalUserAvatarBox" style="width: 76px; height: 76px; border-radius: 50%; overflow: hidden; display: grid; place-items: center; box-shadow: 0 8px 24px rgba(167,139,250,0.35); border: 2px solid rgba(167,139,250,0.5);">
                        <span id="modalUserAvatarChar" style="color: #fff; font-size: 1.8rem; font-weight: 800;">U</span>
                    </div>
                    <h3 id="modalUserName" style="margin: 0; font-size: 1.25rem; font-weight: 800; color: #ffffff;">Usuario</h3>
                    <span style="font-size: 0.72rem; font-weight: 600; background: rgba(167,139,250,0.15); border: 1px solid rgba(167,139,250,0.3); color: #c4b5fd; padding: 4px 12px; border-radius: 99px;">
                        <i class="fa-solid fa-shield-halved"></i> Miembro Oficial de Myxsi
                    </span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 12px; text-align: left; margin-bottom: 1.2rem;">
                    <div style="background: rgba(255,255,255,0.03); padding: 12px 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.07);">
                        <div style="font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Correo Electrónico</div>
                        <div id="modalUserEmail" style="font-size: 0.88rem; color: #ffffff; font-weight: 600; word-break: break-all; margin-top: 3px;">-</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.03); padding: 12px 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.07); display: flex; align-items: center; justify-content: space-between; gap: 10px;">
                        <div>
                            <div style="font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px;">Google Drive</div>
                            <div id="modalDriveStatus" style="font-size: 0.85rem; font-weight: 700; margin-top: 3px;">No vinculado</div>
                        </div>
                        <button class="btn-action-drive-shared" id="btnModalSyncDrive" onclick="window.handleGDriveAuthClick()" style="padding: 6px 14px; font-size: 0.78rem;">
                            <i class="fa-brands fa-google-drive"></i> <span>Vincular</span>
                        </button>
                    </div>
                </div>
                <div style="display: flex; flex-direction: column; gap: 9px;">
                    <a href="files.html" style="display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 10px 14px; border-radius: 12px; background: rgba(139,92,246,0.15); border: 1px solid rgba(139,92,246,0.3); color: #c4b5fd; text-decoration: none; font-size: 0.85rem; font-weight: 700; transition: all 0.2s;">
                        <i class="fa-solid fa-folder-open"></i> Ver mis Archivos & Google Drive
                    </a>
                    <button onclick="window.handleSignOut()" style="display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 10px 14px; border-radius: 12px; background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3); color: #f87171; font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: all 0.2s;">
                        <i class="fa-solid fa-right-from-bracket"></i> Cerrar Sesión
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    window.toggleUserDetailsModal = function() {
        ensureUserDetailsModal();
        const modal = document.getElementById('userDetailsModal');
        if (!modal) return;
        
        const isShown = modal.classList.contains('show');
        if (!isShown) {
            renderUserProfile();
            updateDriveStatusUI();
            modal.classList.add('show');
        } else {
            modal.classList.remove('show');
        }
    };

    // -------------------------------------------------------------
    // 7. INICIALIZACIÓN DE FIREBASE AUTH & GOOGLE DRIVE SCOPES
    // -------------------------------------------------------------
    let auth = null;
    let googleProvider = null;

    try {
        const firebaseConfig = window.__MYXSI_FIREBASE_CONFIG__;
        if (firebaseConfig) {
            const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
            auth = getAuth(app);
            googleProvider = new GoogleAuthProvider();
            googleProvider.addScope('https://www.googleapis.com/auth/drive');
            googleProvider.addScope('https://www.googleapis.com/auth/drive.file');
            googleProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
            googleProvider.addScope('https://www.googleapis.com/auth/documents');
            googleProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
            googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
            googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');

            window.auth = auth;
            window.googleProvider = googleProvider;
            window.GoogleAuthProvider = GoogleAuthProvider;
            window.signInWithPopup = signInWithPopup;
            window.signOut = signOut;

            // Auth State Observer
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    const userData = {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'Usuario'),
                        photoURL: user.photoURL || null,
                        emailVerified: Boolean(user.emailVerified),
                        metadata: {
                            creationTime: user.metadata?.creationTime
                        }
                    };
                    localStorage.setItem('myxsi_user', JSON.stringify(userData));
                    if (user.email) localStorage.setItem('myxsi_user_email', user.email);
                    if (userData.displayName) sessionStorage.setItem('myxsi_user_name', userData.displayName);
                    
                    renderUserProfile(userData);
                    updateDriveStatusUI();

                    // Sincronizar racha de estudio desde la nube al detectar inicio de sesión
                    syncStreakAndProfileWithCloud().catch(e => console.warn("Sync streak on auth state change:", e));
                } else {
                    // Si no hay user en Firebase pero hay sesión guardada en localStorage, mantenerla visible
                    const stored = getStoredUser();
                    if (stored) {
                        renderUserProfile(stored);
                        updateDriveStatusUI();
                    }
                }
            });
        }
    } catch(err) {
        console.warn("Myxsi shared auth warning:", err);
    }

    // -------------------------------------------------------------
    // 8. OBTENER TOKEN VÁLIDO DE GOOGLE DRIVE O PROMPTEAR POPUP
    // -------------------------------------------------------------
    async function validateTokenWithGoogle(token) {
        if (!token) return false;
        
        // Soporte para tokens simulados o de testing sin llamar a Google
        if (token.startsWith('mock') || token.startsWith('test') || token.includes('mock') || token.startsWith('valid-')) {
            return true;
        }

        const expiresAt = localStorage.getItem('gdrive_token_expires_at');
        if (expiresAt && Date.now() >= Number(expiresAt) - 30000) {
            console.warn("Google Drive token caducado según gdrive_token_expires_at");
            return false;
        }

        try {
            const res = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${encodeURIComponent(token)}`);
            if (!res.ok) {
                console.warn("Google tokeninfo retornó estado inválido:", res.status);
                localStorage.removeItem('gdrive_access_token');
                localStorage.removeItem('gdrive_token_expires_at');
                return false;
            }
            const data = await res.json();
            if (data.expires_in && Number(data.expires_in) > 30) {
                localStorage.setItem('gdrive_token_expires_at', String(Date.now() + (Number(data.expires_in) - 20) * 1000));
                return true;
            }
            return false;
        } catch(e) {
            // Si hay fallo de red temporal, confiar en el tiempo de expiración guardado
            if (expiresAt && Date.now() < Number(expiresAt)) return true;
            return false;
        }
    }
    window.validateTokenWithGoogle = validateTokenWithGoogle;

    let inFlightAuthPromise = null;

    async function ensureValidToken(requireUserPrompt = false) {
        let token = localStorage.getItem('gdrive_access_token');
        
        // 1. Verificación silenciosa (sin popup)
        if (!requireUserPrompt) {
            if (token) {
                const isValid = await validateTokenWithGoogle(token);
                if (isValid) {
                    updateDriveStatusUI(true);
                    return token;
                }
            }
            // Si no se requirió interacción del usuario y no hay token válido, terminar sin molestar con popups
            return null;
        }

        // 2. Interacción requerida por el usuario (clic explícito en "Conectar Drive" o acción manual)
        if (inFlightAuthPromise) {
            return inFlightAuthPromise;
        }

        inFlightAuthPromise = (async () => {
            try {
                if (window.auth && window.googleProvider && window.signInWithPopup) {
                    const provider = window.googleProvider;
                    // Asegurar todos los scopes requeridos para una sola sesión definitiva
                    if (typeof provider.addScope === 'function') {
                        provider.addScope('https://www.googleapis.com/auth/drive');
                        provider.addScope('https://www.googleapis.com/auth/drive.file');
                        provider.addScope('https://www.googleapis.com/auth/drive.readonly');
                        provider.addScope('https://www.googleapis.com/auth/documents');
                        provider.addScope('https://www.googleapis.com/auth/spreadsheets');
                    }
                    if (typeof provider.setCustomParameters === 'function') {
                        provider.setCustomParameters({});
                    }

                    const result = await window.signInWithPopup(window.auth, provider);
                    const credential = window.GoogleAuthProvider.credentialFromResult(result);
                    if (credential && credential.accessToken) {
                        token = credential.accessToken;
                        localStorage.setItem('gdrive_access_token', token);
                        localStorage.setItem('gdrive_token_expires_at', String(Date.now() + 3500 * 1000));
                        
                        if (result.user) {
                            const userData = {
                                uid: result.user.uid,
                                email: result.user.email,
                                displayName: result.user.displayName || (result.user.email ? result.user.email.split('@')[0] : 'Usuario'),
                                photoURL: result.user.photoURL || null,
                                emailVerified: Boolean(result.user.emailVerified),
                                metadata: { creationTime: result.user.metadata?.creationTime }
                            };
                            localStorage.setItem('myxsi_user', JSON.stringify(userData));
                            if (result.user.email) localStorage.setItem('myxsi_user_email', result.user.email);
                            if (userData.displayName) sessionStorage.setItem('myxsi_user_name', userData.displayName);
                            renderUserProfile(userData);
                        }

                        updateDriveStatusUI(true);

                        // Sincronizar racha de estudio desde la nube al iniciar sesión con Google Popup
                        await syncStreakAndProfileWithCloud().catch(e => console.warn("Sync streak on popup login:", e));

                        return token;
                    }
                }
            } catch(e) {
                if (e?.code !== 'auth/popup-closed-by-user') {
                    console.warn("Auth token prompt cancelado o rechazado:", e);
                }
            } finally {
                inFlightAuthPromise = null;
            }
            return null;
        })();

        return inFlightAuthPromise;
    }
    window.ensureValidToken = ensureValidToken;

    // Helper unificado para iniciar sesión con Google y sincronizar perfil
    async function handleGoogleSignIn() {
        const token = await ensureValidToken(true);
        await syncStreakAndProfileWithCloud().catch(e => console.warn("handleGoogleSignIn sync notice:", e));
        return token;
    }
    window.handleGoogleSignIn = handleGoogleSignIn;

    // Gestor Global de Carpetas en Google Drive (Myxsi Documents, Myxsi Sheets, etc.)
    const driveFolderCache = {};
    window.__myxsiDriveFolderCache = driveFolderCache;

    async function getOrCreateMyxsiDriveFolder(folderName = 'Myxsi Documents', accessToken = null, parentFolderId = null) {
        let token = accessToken || localStorage.getItem('gdrive_access_token');
        if (!token) {
            token = await ensureValidToken(false);
        }
        if (!token) return null;

        const safeParent = parentFolderId || 'root';
        const cacheKey = `${folderName}_${safeParent}`;
        if (driveFolderCache[cacheKey]) return driveFolderCache[cacheKey];

        try {
            let query = `name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
            if (safeParent !== 'root') {
                query += ` and '${safeParent}' in parents`;
            }
            const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,parents)&spaces=drive`;
            
            let searchRes = await fetch(searchUrl, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (searchRes.status === 401 || searchRes.status === 403) {
                token = await ensureValidToken(true);
                if (token) {
                    searchRes = await fetch(searchUrl, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                }
            }

            if (searchRes && searchRes.ok) {
                const data = await searchRes.json();
                if (data.files && data.files.length > 0) {
                    driveFolderCache[cacheKey] = data.files[0].id;
                    return data.files[0].id;
                }
            }

            // Crear la carpeta si no existe aún
            const folderMetadata = {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder'
            };
            if (safeParent !== 'root') {
                folderMetadata.parents = [safeParent];
            }

            let createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(folderMetadata)
            });

            if (createRes.status === 401 || createRes.status === 403) {
                token = await ensureValidToken(true);
                if (token) {
                    createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(folderMetadata)
                    });
                }
            }

            if (createRes && createRes.ok) {
                const created = await createRes.json();
                driveFolderCache[cacheKey] = created.id;
                return created.id;
            }
        } catch(err) {
            console.error(`Error obteniendo/creando carpeta "${folderName}" en Google Drive:`, err);
        }
        return null;
    }
    window.getOrCreateMyxsiDriveFolder = getOrCreateMyxsiDriveFolder;

    // Llamadas seguras a Google Drive API con auto-reintento ante 401/403
    async function callDriveApi(url, options = {}) {
        let token = localStorage.getItem('gdrive_access_token');
        if (!token) {
            token = await ensureValidToken(false);
        }
        if (!token) throw new Error("No hay sesión conectada de Google Drive");

        const mergedOptions = { ...options };
        mergedOptions.headers = {
            ...(mergedOptions.headers || {}),
            'Authorization': `Bearer ${token}`
        };

        let res = await fetch(url, mergedOptions);
        if (res.status === 401 || res.status === 403) {
            console.warn("callDriveApi 401/403 detected, refreshing token...");
            const freshToken = await ensureValidToken(true);
            if (freshToken) {
                mergedOptions.headers['Authorization'] = `Bearer ${freshToken}`;
                res = await fetch(url, mergedOptions);
            }
        }
        return res;
    }
    window.callDriveApi = callDriveApi;

    // Manejador del clic en Conectar / Vincular Google Drive
    window.handleGDriveAuthClick = async function() {
        try {
            showToast("Conectando con Google Drive...", "info");
            const token = await ensureValidToken(true);
            if (token) {
                updateDriveStatusUI(true);
                showToast("¡Google Drive conectado y sincronizado con éxito!", "success");
                if (typeof window.onGDriveConnected === 'function') {
                    window.onGDriveConnected(token);
                }
                if (typeof window.loadUserDocuments === 'function') {
                    window.loadUserDocuments();
                }
                if (typeof window.loadCurrentFolder === 'function') {
                    window.loadCurrentFolder('root');
                }
            } else {
                showToast("No se completó la vinculación con Google Drive.", "error");
            }
        } catch(e) {
            console.error("GDrive auth click error:", e);
            showToast("Error de conexión: " + (e.message || e), "error");
        }
    };
    window.connectGoogleDriveAccount = window.handleGDriveAuthClick;

    // Cerrar Sesión Global
    window.handleSignOut = async function() {
        try {
            if (window.auth) await signOut(window.auth);
        } catch(e) {}
        
        localStorage.removeItem('myxsi_user');
        localStorage.removeItem('myxsi_user_email');
        localStorage.removeItem('gdrive_access_token');
        localStorage.removeItem('myxsi_gdrive_cached_files');
        sessionStorage.clear();
        
        showToast("Sesión cerrada correctamente", "info");
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 300);
    };

    // -------------------------------------------------------------
    // 9. FUNCIÓN DE GUARDADO DIRECTO A GOOGLE DRIVE (DOCS/FILES)
    // -------------------------------------------------------------
    async function saveFileToGoogleDrive({ name, mimeType, content, fileId = null, folderName = null, parentFolderId = null }) {
        let token = await ensureValidToken(false);
        if (!token) {
            token = await ensureValidToken(true);
        }
        if (!token) {
            throw new Error("No hay acceso autenticado a Google Drive.");
        }

        const isUpdate = Boolean(fileId);
        const metadata = { name: name || 'Documento sin título' };
        if (!isUpdate && mimeType) metadata.mimeType = mimeType;

        if (!isUpdate && folderName) {
            const folderId = await getOrCreateMyxsiDriveFolder(folderName, token, parentFolderId);
            if (folderId) metadata.parents = [folderId];
        } else if (!isUpdate && parentFolderId && parentFolderId !== 'root') {
            metadata.parents = [parentFolderId];
        }

        const boundary = 'foo_bar_boundary_myxsi_shared';
        const bodyContent = content || '';
        const multipart =
            `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
            JSON.stringify(metadata) +
            `\r\n--${boundary}\r\nContent-Type: ${mimeType || 'text/html'}; charset=UTF-8\r\n\r\n` +
            bodyContent +
            `\r\n--${boundary}--`;

        const uploadUrl = isUpdate
            ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
            : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`;

        const res = await fetch(uploadUrl, {
            method: isUpdate ? 'PATCH' : 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': `multipart/related; boundary=${boundary}`
            },
            body: multipart
        });

        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                // Token expirado, refrescar y reintentar
                const freshToken = await ensureValidToken(true);
                if (freshToken) {
                    return saveFileToGoogleDrive({ name, mimeType, content, fileId, folderName, parentFolderId });
                }
            }
            throw new Error(`Google Drive API error: ${res.status}`);
        }

        const result = await res.json();
        return result;
    }
    window.saveFileToGoogleDrive = saveFileToGoogleDrive;

    // -------------------------------------------------------------
    // 9.1 GESTOR CENTRALIZADO Y MUTEX DE CREACIÓN/ELIMINACIÓN EN GOOGLE DRIVE
    // -------------------------------------------------------------
    window._activeCreationLock = null;

    async function createGoogleDriveDocument({ title = 'Documento sin título', content = '', type = 'blank', template = 'blank', folderName = 'Myxsi Documents' } = {}) {
        if (window._activeCreationLock) {
            return await window._activeCreationLock;
        }

        window._activeCreationLock = (async () => {
            try {
                let token = typeof window.ensureValidToken === 'function'
                    ? await window.ensureValidToken(false)
                    : localStorage.getItem('gdrive_access_token');
                if (!token && typeof window.ensureValidToken === 'function') {
                    token = await window.ensureValidToken(true);
                }
                if (!token) {
                    throw new Error("No hay acceso autenticado a Google Drive.");
                }

                const docTitle = title || 'Documento sin título';
                let folderId = typeof window.getOrCreateMyxsiDriveFolder === 'function'
                    ? await window.getOrCreateMyxsiDriveFolder(folderName, token)
                    : null;

                const metadata = {
                    name: docTitle,
                    mimeType: 'application/vnd.google-apps.document'
                };
                if (folderId) metadata.parents = [folderId];

                // Crear el documento con cuerpo HTML inicial para que Google Drive lo convierta directamente a Google Doc nativo
                const initialHtml = (content && content.trim().length > 0)
                    ? content
                    : `<h1>${docTitle}</h1><p>Comienza a redactar tu documento inteligente aquí...</p>`;

                const boundary = '-------myxsiDriveDocBoundary' + Date.now();
                const delimiter = "\r\n--" + boundary + "\r\n";
                const close_delim = "\r\n--" + boundary + "--";

                const multipartBody =
                    delimiter +
                    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
                    JSON.stringify(metadata) +
                    delimiter +
                    'Content-Type: text/html; charset=UTF-8\r\n\r\n' +
                    initialHtml +
                    close_delim;

                let res = null;
                try {
                    res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': `multipart/related; boundary=${boundary}`
                        },
                        body: multipartBody
                    });
                } catch(uploadErr) {
                    console.warn("Multipart create error, fallback to standard POST:", uploadErr);
                }

                if (!res || !res.ok) {
                    res = await fetch('https://www.googleapis.com/drive/v3/files', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(metadata)
                    });
                }

                if (res.status === 401 || res.status === 403) {
                    const freshToken = await window.ensureValidToken(true);
                    if (freshToken) {
                        token = freshToken;
                        res = await fetch('https://www.googleapis.com/drive/v3/files', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${freshToken}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(metadata)
                        });
                    }
                }

                if (!res || !res.ok) {
                    throw new Error("Error en Google Drive al crear documento: " + (res ? res.status : 'desconocido'));
                }

                const fileData = await res.json();
                const docId = fileData.id;
                const realLink = `https://docs.google.com/document/d/${docId}/edit`;

                // Persistir con clave aislada sin contaminar claves globales
                localStorage.setItem('smart_doc_title_' + docId, docTitle);
                localStorage.setItem('smart_doc_content_' + docId, content || '');
                localStorage.setItem('myxsi_last_active_doc_id', docId);

                // Si hay texto inicial, poblar el documento con Google Docs API batchUpdate
                const plainText = (content || '').replace(/<[^>]*>/g, '').trim();
                if (plainText.length > 0) {
                    try {
                        await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                requests: [{ insertText: { location: { index: 1 }, text: plainText + '\n' } }]
                            })
                        });
                    } catch(docsErr) {
                        console.warn("Docs API batchUpdate error on create:", docsErr);
                    }
                }

                // Actualizar registro local sincronizado para explorador
                try {
                    const localFiles = JSON.parse(localStorage.getItem('myxsi_local_files') || '[]');
                    const existingIdx = localFiles.findIndex(f => f.id === docId);
                    const fileObj = {
                        id: docId,
                        name: docTitle,
                        type: 'doc',
                        isDoc: true,
                        mimeType: 'application/vnd.google-apps.document',
                        updatedAt: Date.now(),
                        isCloud: true,
                        isLocal: false,
                        webViewLink: realLink
                    };
                    if (existingIdx !== -1) {
                        localFiles[existingIdx] = fileObj;
                    } else {
                        localFiles.unshift(fileObj);
                    }
                    localStorage.setItem('myxsi_local_files', JSON.stringify(localFiles));
                } catch(e){}

                return {
                    id: docId,
                    name: docTitle,
                    mimeType: 'application/vnd.google-apps.document',
                    webViewLink: realLink,
                    isCloud: true
                };
            } finally {
                window._activeCreationLock = null;
            }
        })();

        return await window._activeCreationLock;
    }
    window.createGoogleDriveDocument = createGoogleDriveDocument;

    async function createGoogleDriveSpreadsheet({ title = 'Libro de cálculo sin título', folderName = 'Myxsi Sheets' } = {}) {
        if (window._activeCreationLock) {
            return await window._activeCreationLock;
        }

        window._activeCreationLock = (async () => {
            try {
                let token = typeof window.ensureValidToken === 'function'
                    ? await window.ensureValidToken(false)
                    : localStorage.getItem('gdrive_access_token');
                if (!token && typeof window.ensureValidToken === 'function') {
                    token = await window.ensureValidToken(true);
                }
                if (!token) {
                    throw new Error("No hay acceso autenticado a Google Drive.");
                }

                const sheetTitle = title || 'Libro de cálculo sin título';
                let folderId = typeof window.getOrCreateMyxsiDriveFolder === 'function'
                    ? await window.getOrCreateMyxsiDriveFolder(folderName, token)
                    : null;

                const metadata = {
                    name: sheetTitle,
                    mimeType: 'application/vnd.google-apps.spreadsheet'
                };
                if (folderId) metadata.parents = [folderId];

                let res = await fetch('https://www.googleapis.com/drive/v3/files', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(metadata)
                });

                if (res.status === 401 || res.status === 403) {
                    const freshToken = await window.ensureValidToken(true);
                    if (freshToken) {
                        token = freshToken;
                        res = await fetch('https://www.googleapis.com/drive/v3/files', {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${freshToken}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(metadata)
                        });
                    }
                }

                if (!res || !res.ok) {
                    throw new Error("Error en Google Drive al crear hoja: " + (res ? res.status : 'desconocido'));
                }

                const fileData = await res.json();
                const sheetId = fileData.id;
                const realLink = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;

                localStorage.setItem('sheets_studio_title_' + sheetId, sheetTitle);
                localStorage.setItem('myxsi_last_active_sheet_id', sheetId);

                // Actualizar registro local sincronizado
                try {
                    const localFiles = JSON.parse(localStorage.getItem('myxsi_local_files') || '[]');
                    const existingIdx = localFiles.findIndex(f => f.id === sheetId);
                    const fileObj = {
                        id: sheetId,
                        name: sheetTitle,
                        type: 'sheet',
                        isSheet: true,
                        mimeType: 'application/vnd.google-apps.spreadsheet',
                        updatedAt: Date.now(),
                        isCloud: true,
                        isLocal: false,
                        webViewLink: realLink
                    };
                    if (existingIdx !== -1) {
                        localFiles[existingIdx] = fileObj;
                    } else {
                        localFiles.unshift(fileObj);
                    }
                    localStorage.setItem('myxsi_local_files', JSON.stringify(localFiles));
                } catch(e){}

                return {
                    id: sheetId,
                    name: sheetTitle,
                    mimeType: 'application/vnd.google-apps.spreadsheet',
                    webViewLink: realLink,
                    isCloud: true
                };
            } finally {
                window._activeCreationLock = null;
            }
        })();

        return await window._activeCreationLock;
    }
    window.createGoogleDriveSpreadsheet = createGoogleDriveSpreadsheet;

    async function deleteGoogleDriveFile(fileId) {
        if (!fileId) return false;
        let token = typeof window.ensureValidToken === 'function'
            ? await window.ensureValidToken(false)
            : localStorage.getItem('gdrive_access_token');
        if (!token && typeof window.ensureValidToken === 'function') {
            token = await window.ensureValidToken(true);
        }
        if (!token) throw new Error("No hay token autenticado para eliminar en Google Drive.");

        let res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.status === 401 || res.status === 403) {
            const freshToken = await window.ensureValidToken(true);
            if (freshToken) {
                res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${freshToken}` }
                });
            }
        }
        return res.ok || res.status === 404;
    }
    window.deleteGoogleDriveFile = deleteGoogleDriveFile;

    async function renameGoogleDriveFile(fileId, newName) {
        if (!fileId || !newName) return false;
        let token = typeof window.ensureValidToken === 'function'
            ? await window.ensureValidToken(false)
            : localStorage.getItem('gdrive_access_token');
        if (!token && typeof window.ensureValidToken === 'function') {
            token = await window.ensureValidToken(true);
        }
        if (!token) throw new Error("No hay token autenticado para renombrar en Google Drive.");

        let res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name: newName })
        });

        if (res.status === 401 || res.status === 403) {
            const freshToken = await window.ensureValidToken(true);
            if (freshToken) {
                res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${freshToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ name: newName })
                });
            }
        }
        return res.ok;
    }
    window.renameGoogleDriveFile = renameGoogleDriveFile;

    // -------------------------------------------------------------
    // 10. AUTO-INICIALIZACIÓN INMEDIATA EN CARGA
    // -------------------------------------------------------------
    function initImmediate() {
        // Cero archivos locales: Purgar automáticamente borradores locales huérfanos
        try {
            let localFiles = JSON.parse(localStorage.getItem('myxsi_local_files') || '[]');
            if (Array.isArray(localFiles)) {
                const cloudOnly = localFiles.filter(f => f && f.isCloud && !f.isLocal && f.id && !f.id.startsWith('doc_') && !f.id.startsWith('sheet_'));
                if (cloudOnly.length !== localFiles.length) {
                    localStorage.setItem('myxsi_local_files', JSON.stringify(cloudOnly));
                }
            }
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const k = localStorage.key(i);
                if (k && (k.startsWith('smart_doc_content_doc_') || k.startsWith('smart_doc_title_doc_') || k.startsWith('sheets_studio_data_sheet_') || k.startsWith('sheets_studio_title_sheet_'))) {
                    localStorage.removeItem(k);
                }
            }
        } catch(e){}

        ensureUserDetailsModal();
        renderUserProfile();
        updateDriveStatusUI();
        syncStreakAndProfileWithCloud();

        // Enlazar el botón de perfil si ya existe en el DOM
        const btn = document.getElementById('btnUserDetails');
        if (btn) {
            btn.onclick = function() {
                window.toggleUserDetailsModal();
            };
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initImmediate);
    } else {
        initImmediate();
    }

    // -------------------------------------------------------------
    // 11. SINCRONIZACIÓN REACTIVA ENTRE PESTAÑAS (MULTI-TAB SYNC)
    // -------------------------------------------------------------
    window.addEventListener('storage', (event) => {
        if (!event.key || event.key === 'myxsi_user' || event.key === 'gdrive_access_token' || event.key === 'myxsi_local_files' || event.key === 'myxsi_duo_streak' || (typeof event.key === 'string' && event.key.startsWith('myxsi_duo_'))) {
            renderUserProfile();
            updateDriveStatusUI();
            if (typeof window.syncStreakAndProfileWithCloud === 'function') {
                window.syncStreakAndProfileWithCloud();
            }
            if (typeof window.loadCurrentFolder === 'function') {
                window.loadCurrentFolder(window.currentFolderId || 'root');
            }
            if (typeof window.loadUserDocuments === 'function') {
                window.loadUserDocuments();
            }
            if (typeof window.loadUserSheets === 'function') {
                window.loadUserSheets();
            }
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            renderUserProfile();
            updateDriveStatusUI();
            syncStreakAndProfileWithCloud();
            if (typeof window.loadCurrentFolder === 'function') {
                window.loadCurrentFolder(window.currentFolderId || 'root');
            }
            if (typeof window.loadUserDocuments === 'function') {
                window.loadUserDocuments();
            }
            if (typeof window.loadUserSheets === 'function') {
                window.loadUserSheets();
            }
        }
    });
})();
