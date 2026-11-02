/**
 * Myxsi Video Engine - Local IndexedDB Storage
 * Manejo 100% local de archivos de video, audio, imágenes y proyectos sin límites de tamaño.
 * Respeta la privacidad total: ningún byte sale de la máquina del usuario.
 */

(function (window) {
    const DB_NAME = 'myxsi_video_engine_db';
    const DB_VERSION = 1;
    const STORE_PROJECTS = 'projects';
    const STORE_ASSETS = 'media_assets';

    let dbInstance = null;
    const activeBlobUrls = new Map();

    function openDB() {
        if (dbInstance) return Promise.resolve(dbInstance);

        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);

            req.onupgradeneeded = (e) => {
                const db = e.target.result;

                if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
                    db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
                }

                if (!db.objectStoreNames.contains(STORE_ASSETS)) {
                    const assetStore = db.createObjectStore(STORE_ASSETS, { keyPath: 'id' });
                    assetStore.createIndex('type', 'type', { unique: false });
                    assetStore.createIndex('createdAt', 'createdAt', { unique: false });
                }
            };

            req.onsuccess = (e) => {
                dbInstance = e.target.result;
                resolve(dbInstance);
            };

            req.onerror = (e) => {
                console.error('[MyxsiVideoDB] Error al abrir IndexedDB:', e.target.error);
                reject(e.target.error);
            };
        });
    }

    // GESTIÓN DE MEDIOS Y ARCHIVOS BINARIOS (BLOBS / FILES)
    async function saveAsset(fileOrBlob, metadata = {}) {
        const db = await openDB();
        const id = metadata.id || 'asset_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        
        let mimeType = fileOrBlob.type || metadata.mimeType || 'video/mp4';
        let mediaType = 'video';
        if (mimeType.startsWith('audio')) mediaType = 'audio';
        else if (mimeType.startsWith('image')) mediaType = 'image';

        const record = {
            id: id,
            name: metadata.name || fileOrBlob.name || 'Archivo sin nombre',
            type: mediaType,
            mimeType: mimeType,
            size: fileOrBlob.size || 0,
            duration: metadata.duration || 0,
            width: metadata.width || 0,
            height: metadata.height || 0,
            blob: fileOrBlob,
            createdAt: Date.now()
        };

        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORE_ASSETS], 'readwrite');
            const store = tx.objectStore(STORE_ASSETS);
            const req = store.put(record);

            req.onsuccess = () => {
                // Generar Blob URL en memoria
                const blobUrl = URL.createObjectURL(fileOrBlob);
                activeBlobUrls.set(id, blobUrl);
                record.blobUrl = blobUrl;
                resolve(record);
            };

            req.onerror = (e) => {
                console.error('[MyxsiVideoDB] Error guardando asset:', e.target.error);
                reject(e.target.error);
            };
        });
    }

    async function getAsset(id) {
        const db = await openDB();

        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORE_ASSETS], 'readonly');
            const store = tx.objectStore(STORE_ASSETS);
            const req = store.get(id);

            req.onsuccess = () => {
                const record = req.result;
                if (!record) {
                    resolve(null);
                    return;
                }

                if (!activeBlobUrls.has(id)) {
                    activeBlobUrls.set(id, URL.createObjectURL(record.blob));
                }
                record.blobUrl = activeBlobUrls.get(id);
                resolve(record);
            };

            req.onerror = (e) => {
                reject(e.target.error);
            };
        });
    }

    async function getAllAssets() {
        const db = await openDB();

        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORE_ASSETS], 'readonly');
            const store = tx.objectStore(STORE_ASSETS);
            const req = store.getAll();

            req.onsuccess = () => {
                const list = req.result || [];
                list.forEach(item => {
                    if (!activeBlobUrls.has(item.id) && item.blob) {
                        activeBlobUrls.set(item.id, URL.createObjectURL(item.blob));
                    }
                    item.blobUrl = activeBlobUrls.get(item.id);
                });
                resolve(list);
            };

            req.onerror = (e) => reject(e.target.error);
        });
    }

    async function deleteAsset(id) {
        const db = await openDB();
        if (activeBlobUrls.has(id)) {
            URL.revokeObjectURL(activeBlobUrls.get(id));
            activeBlobUrls.delete(id);
        }

        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORE_ASSETS], 'readwrite');
            const store = tx.objectStore(STORE_ASSETS);
            const req = store.delete(id);
            req.onsuccess = () => resolve(true);
            req.onerror = (e) => reject(e.target.error);
        });
    }

    // GESTIÓN DE PROYECTOS DE VIDEO
    async function saveProject(project) {
        const db = await openDB();
        project.updatedAt = Date.now();

        // Actualizar también en localStorage para compatibilidad
        try {
            let projects = JSON.parse(localStorage.getItem('myxsi_video_projects') || '[]');
            const idx = projects.findIndex(p => p.id === project.id);
            const summary = {
                id: project.id,
                title: project.title,
                ratio: project.ratio || '16:9',
                duration: project.duration || 10,
                updatedAt: project.updatedAt,
                clipsCount: (project.clips || []).length
            };
            if (idx >= 0) projects[idx] = summary;
            else projects.unshift(summary);
            localStorage.setItem('myxsi_video_projects', JSON.stringify(projects));
        } catch (e) {
            console.warn('[MyxsiVideoDB] LocalStorage sync warning:', e);
        }

        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORE_PROJECTS], 'readwrite');
            const store = tx.objectStore(STORE_PROJECTS);
            const req = store.put(project);
            req.onsuccess = () => resolve(project);
            req.onerror = (e) => reject(e.target.error);
        });
    }

    async function getProject(id) {
        const db = await openDB();

        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORE_PROJECTS], 'readonly');
            const store = tx.objectStore(STORE_PROJECTS);
            const req = store.get(id);

            req.onsuccess = () => {
                const res = req.result;
                if (res) {
                    resolve(res);
                } else {
                    // Fallback a localStorage
                    try {
                        const localProjects = JSON.parse(localStorage.getItem('myxsi_video_projects') || '[]');
                        const found = localProjects.find(p => p.id === id);
                        resolve(found || null);
                    } catch (e) {
                        resolve(null);
                    }
                }
            };

            req.onerror = (e) => reject(e.target.error);
        });
    }

    async function getAllProjects() {
        const db = await openDB();

        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORE_PROJECTS], 'readonly');
            const store = tx.objectStore(STORE_PROJECTS);
            const req = store.getAll();

            req.onsuccess = () => {
                let list = req.result || [];
                list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

                if (list.length === 0) {
                    try {
                        list = JSON.parse(localStorage.getItem('myxsi_video_projects') || '[]');
                    } catch (e) {}
                }
                resolve(list);
            };

            req.onerror = (e) => reject(e.target.error);
        });
    }

    async function deleteProject(id) {
        const db = await openDB();

        // Quitar de localStorage
        try {
            let projects = JSON.parse(localStorage.getItem('myxsi_video_projects') || '[]');
            projects = projects.filter(p => p.id !== id);
            localStorage.setItem('myxsi_video_projects', JSON.stringify(projects));
        } catch (e) {}

        return new Promise((resolve, reject) => {
            const tx = db.transaction([STORE_PROJECTS], 'readwrite');
            const store = tx.objectStore(STORE_PROJECTS);
            const req = store.delete(id);
            req.onsuccess = () => resolve(true);
            req.onerror = (e) => reject(e.target.error);
        });
    }

    // Exportar módulo global
    window.MyxsiVideoDB = {
        openDB,
        saveAsset,
        getAsset,
        getAllAssets,
        deleteAsset,
        saveProject,
        getProject,
        getAllProjects,
        deleteProject
    };

})(window);
