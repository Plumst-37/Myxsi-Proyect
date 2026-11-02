/**
 * =========================================================================
 * MYXSI OPEN SOURCE CLIENT CONFIGURATION TEMPLATE
 * =========================================================================
 * Archivo público de configuración de Myxsi (myxsi.com).
 * En este repositorio de código abierto todas las claves privadas,
 * credenciales y endpoints se configuran como plantillas seguras.
 *
 * Para configurar tus credenciales de forma privada:
 * 1. Crea un archivo 'js/config.local.js' (ignorado por Git).
 * 2. O define 'window.__MYXSI_FIREBASE_CONFIG__' y 'window.__MYXSI_API_URL__'
 *    en tu entorno antes de cargar la aplicación.
 */

window.__MYXSI_FIREBASE_CONFIG__ = window.__MYXSI_FIREBASE_CONFIG__ || {
    apiKey: "TU_FIREBASE_API_KEY",
    authDomain: "TU_PROYECTO.firebaseapp.com",
    projectId: "TU_PROYECTO",
    storageBucket: "TU_PROYECTO.firebasestorage.app",
    messagingSenderId: "TU_SENDER_ID",
    appId: "TU_APP_ID",
    measurementId: "TU_MEASUREMENT_ID"
};

window.__MYXSI_API_URL__ = window.__MYXSI_API_URL__ || '/api';
