<div align="center">

# 🌐 Myxsi — Plataforma de Inteligencia Artificial Todo en Uno
### **Código Abierto • Privada • Accesible • Potente**
**Sitio Web Oficial:** [myxsi.com](https://myxsi.com) • **Repositorio:** [github.com/Plumst-37/Myxsi-Proyect](https://github.com/Plumst-37/Myxsi-Proyect)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Open Source](https://img.shields.io/badge/Open%20Source-%E2%99%A5-purple.svg)](https://github.com/Plumst-37/Myxsi-Proyect)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers%20%26%20D1-orange.svg)](https://workers.cloudflare.com/)
[![Web Security](https://img.shields.io/badge/Security-Hardened%20A%2B-brightgreen.svg)](https://myxsi.com)

> *"Con Myxsi avanzamos todos, la inclusión y tecnología hace el futuro."*

---

</div>

## 🌟 ¿Qué es Myxsi?

**Myxsi** es una plataforma de **código abierto** concebida bajo la visión de ofrecer una experiencia **todo en uno**, unificando las mejores capacidades de inteligencia artificial, productividad de oficina, diseño creativo y accesibilidad universal en una sola suite web fluida, ligera y totalmente soberana.

A diferencia de los servicios privativos tradicionales, Myxsi está diseñado para:
1. **Poner el control en tus manos:** Código 100% auditable y libre para desplegar en tu propia infraestructura o en la nube de Cloudflare.
2. **Proteger tu privacidad:** Sin rastreadores invasivos, con autenticación segura basada en hashing criptográfico y sin exponer claves privadas en el navegador.
3. **Inclusión tecnológica real:** A través del proyecto **Myxsi Vision**, integramos interfaces accesibles para personas con discapacidad visual y comandos continuos por voz con transcripción Whisper.

---

## 🚀 Módulos y Aplicaciones Incluidas ("Todo en Uno")

| Módulo | Archivo Principal | Descripción y Capacidades |
| :--- | :--- | :--- |
| 💬 **Chat IA Inteligente** | `chat.html` | Asistente conversacional de élite con modelos de alta capacidad, transcripción de voz continua vía Whisper, análisis de imágenes (visión por computador), generación de código interactivo con vista previa en vivo, diagramas Mermaid automáticos y compilador de documentos a **PDF oficial**. |
| 📄 **Docs Studio** | `docs-home.html` / `docs.html` | Procesador de textos inteligente para crear informes técnicos, ensayos y contratos asistidos por IA, con guardado automático y exportación formal. |
| 📊 **Sheets Studio** | `sheets-home.html` / `sheets.html` | Hojas de cálculo enriquecidas con análisis predictivo, fórmulas generativas y tablas dinámicas. |
| 🎨 **Canva Studio** | `canva-home.html` / `canva.html` | Espacio de diseño gráfico, creación de banners, flyers e ilustraciones con integración generativa de arte visual. |
| 🎬 **Video Studio** | `video-home.html` | Creación y estructuración de contenido multimedia, guiones y edición ligera. |
| 📂 **Gestor de Archivos** | `files.html` | Almacenamiento organizado de proyectos, historial y sincronización segura con Google Drive. |
| 👁️ **Myxsi Vision** | `vision.html` | Iniciativa de inclusión y accesibilidad con síntesis de voz, alto contraste y lectura contextual de interfaces. |
| 🎓 **Myxsi Academy** | `academy.html` | Hub pedagógico con rutas de aprendizaje y tutoría personalizada con IA. |

---

## 📁 Estructura del Código y Organización Modular

El repositorio ha sido organizado con una arquitectura limpia, legible y desacoplada, separando la capa visual (CSS), la lógica funcional (JavaScript) y la estructura semántica (HTML):

```text
Myxsi-Proyect/
├── assets/                  # Identidad de marca, logos vectoriales, iconos y fondos cósmicos
│   └── temarios/            # Temarios y programas de estudio oficiales en formato PDF
├── css/                     # Hojas de estilo modulares organizadas y desacopladas
│   ├── chat.css             # Estilos de la interfaz de chat, temas y micro-animaciones
│   ├── index.css            # Estilos del portal principal y landing page oficial
│   ├── login.css            # Formularios y tarjetas de autenticación
│   ├── recuperacion.css     # Interfaz de restablecimiento seguro de contraseñas
│   └── registro.css         # Flujo de registro y alta de nuevos usuarios
├── js/                      # Lógica de cliente y proxy backend de alto rendimiento
│   ├── chat.js              # Controlador principal del chat: streaming, voz Whisper, PDF
│   ├── cloudflare.js        # Backend seguro para Cloudflare Workers con proxy de IA y D1 SQL
│   ├── academy.js           # Motor de estudio, simuladores de exámenes y seguimiento académico
│   └── video-db.js          # Persistencia y almacenamiento de proyectos multimedia
├── .well-known/             # Directivas de seguridad web estándar (RFC 9116)
│   └── security.txt         # Política de divulgación de vulnerabilidades y contacto
├── _headers                 # Cabeceras de seguridad HTTP de nivel A+ (HSTS, CSP, X-Frame-Options)
├── _redirects               # Reglas de enrutamiento y redirección del servidor
├── index.html               # Portal principal de Myxsi (myxsi.com)
├── chat.html                # Interfaz del Asistente IA todo en uno
├── docs.html                # Suite de edición de documentos de texto inteligentes
├── sheets.html              # Suite de hojas de cálculo asistidas por IA
├── canva.html               # Suite de diseño gráfico y generación de banners
├── video.html               # Suite de creación y estructuración de video
├── files.html               # Gestor soberano de archivos y sincronización
├── vision.html              # Interfaz de accesibilidad Myxsi Vision
└── academy.html             # Centro educativo y tutoría personalizada
```

---

## 🛡️ Arquitectura de Seguridad y Blindaje (Security Hardening)

Esta versión de Myxsi cuenta con una auditoría integral de seguridad y blindaje de nivel empresarial:

* 🔐 **Cero Claves Expuestas en el Cliente:** No se filtran API keys ni tokens en archivos HTML/JS estáticos. Todas las peticiones a modelos de lenguaje y transcripción de audio se gestionan a través de un proxy backend seguro en Cloudflare Workers (`js/cloudflare.js`).
* 🗄️ **Base de Datos Blindada (Cloudflare D1 SQL):** Todas las consultas SQL emplean parámetros vinculados estrictos (`.bind(...)`), eliminando vulnerabilidades de inyección SQL (SQLi).
* 🔒 **Hashing Criptográfico de Contraseñas:** Se utiliza el estándar Web Crypto API con **PBKDF2**, SHA-256 y un salt aleatorio de 16 bytes con 100,000 iteraciones. Las contraseñas en texto plano jamás se almacenan ni registran.
* 🚦 **Limitador de Peticiones (Rate Limiting):** Ventana deslizante en memoria que restringe ráfagas maliciosas y abusos (máximo 60 peticiones por minuto por IP), retornando código HTTP `429 Too Many Requests`.
* 🛡️ **Protección Anti-XSS y Sanitización:** Validación estricta en el servidor que rechaza patrones sospechosos de inyección de scripts, etiquetas `<script>` no autorizadas y manipulaciones de eventos en el cuerpo de las peticiones.
* 🌐 **CORS Estricto y Dinámico:** Respuestas CORS restringidas a los dominios oficiales (`myxsi.com`, `www.myxsi.com`) y entornos locales de desarrollo autorizados.
* 🛡️ **Cabeceras de Seguridad HTTP:**
  * `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` (HTTPS estricto forzado).
  * `X-Content-Type-Options: nosniff`.
  * `X-Frame-Options: SAMEORIGIN`.
  * `X-XSS-Protection: 1; mode=block`.
  * `Referrer-Policy: strict-origin-when-cross-origin`.
  * `Permissions-Policy: camera=(self), microphone=(self), geolocation=()`.
* ⏱️ **Recuperación con Caducidad:** Tokens de restablecimiento de contraseña firmados con validez máxima de 15 minutos.
* 🔕 **Modo Producción Silencioso (`DEBUG=false`):** Los esquemas internos de base de datos y rastros de error detallados (stack traces) se enmascaran fuera de desarrollo.

---

## 💻 Instalación y Despliegue Local

### 1. Clonar el repositorio
```bash
git clone https://github.com/Plumst-37/Myxsi-Proyect.git
cd Myxsi-Proyect
```

### 2. Ejecutar el servidor web local
Puedes servir los archivos estáticos con cualquier servidor HTTP local:
```bash
# Con Python 3:
python3 -m http.server 8000

# O con Node.js / npx:
npx serve -p 8000
```
Abre tu navegador en `http://localhost:8000`.

---

## ☁️ Despliegue del Backend en Cloudflare (Workers & D1)

El archivo `js/cloudflare.js` está preparado para ejecutarse directamente como un Cloudflare Worker con base de datos SQL D1.

### 1. Variables de Entorno Requeridas
Copia `.env.example` o configura las siguientes variables en el panel de Cloudflare (*Workers & Pages -> Settings -> Variables*):

| Variable | Tipo | Descripción |
| :--- | :--- | :--- |
| `GROQ_KEYS` | Secreto / Encriptado | Lista de claves de Groq separadas por coma (`gsk_...,gsk_...`) para rotación automática y tolerancia a fallos. |
| `ADMIN_SECRET` | Secreto / Encriptado | Token largo y aleatorio para proteger rutas de administración y migraciones de BD. |
| `ALLOWED_ORIGINS` | Texto | Dominios con permiso de acceso CORS (ej. `https://myxsi.com,https://www.myxsi.com`). |
| `DEBUG` | Texto (`true`/`false`) | Debe ser `false` en producción. |

### 2. Desplegar con Wrangler CLI
```bash
# Instalar Wrangler si no lo tienes
npm install -g wrangler

# Iniciar sesión en Cloudflare
wrangler login

# Crear base de datos D1
wrangler d1 create myxsi-db

# Desplegar el Worker
wrangler deploy js/cloudflare.js --name myxsi-backend
```

---

## 🤝 Contribución y Código Abierto

¡Las contribuciones son más que bienvenidas! Myxsi es un proyecto comunitario creado para democratizar el acceso a herramientas de alta tecnología.

1. Haz un **Fork** de este repositorio.
2. Crea tu rama para la nueva función (`git checkout -b feature/nueva-mejora`).
3. Confirma tus cambios (`git commit -m 'Añadir nueva función'`).
4. Sube tu rama (`git push origin feature/nueva-mejora`).
5. Abre un **Pull Request**.

---

## 📜 Licencia

Distribuido bajo la Licencia **MIT**. Consulta el archivo `LICENSE` para más información.

---

## 👤 Creador y Dirección del Proyecto

* **Fundador & Desarrollador Principal:** Reinaldo José Liendo Espinoza
* **Organización:** Inoxway
* **Sitio Web:** [https://myxsi.com](https://myxsi.com)
