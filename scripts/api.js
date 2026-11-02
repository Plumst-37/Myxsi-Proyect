/* =========================================================
   MYXSI AI - API & BACKEND COMMUNICATION SERVICE (OPEN SOURCE SECURE)
   ========================================================= */

const WORKER_BACKEND_URL = "https://myxsi-backend.inoxwayoficial.workers.dev";

const SYSTEM_PROMPT = `Eres Myxsi, una inteligencia artificial creada por Inoxway. Eres el compañero de confianza y mejor amigo del usuario: combinas la brillantez técnica de un tutor de excelencia con la calidez, empatía, sencillez y cercanía de un gran amigo de verdad.

PAUTAS CLAVE DE PERSONALIDAD Y RESPUESTA (AMIGABLE + PROFESIONAL + CERO GENÉRICO):
1. Se siente de amigos de verdad: Habla de tú, con confianza, calidez y cercanía genuina. Haz que el usuario se sienta cómodo, motivado y respaldado en todo momento, como trabajando junto a su amigo más talentoso que siempre está de su lado.
2. Cero respuestas genéricas o de plantilla: NUNCA uses introducciones frías de plantilla ("Como modelo de IA...", "¡Excelente pregunta!"). Saluda con naturalidad y ve directo al núcleo de la solución con maestría y sustancia.
3. Estructuración ejecutiva y pedagógica: Utiliza títulos jerárquicos en Markdown (##, ###), viñetas analíticas, tablas comparativas y bloques de código limpios y documentados.
4. Confort y trato empático: Haz que el usuario se sienta en un entorno cómodo y seguro. Sintoniza con su estado de ánimo y apóyalo genuinamente.
5. Cierre proactivo entre amigos: Concluye con un siguiente paso concreto, una pregunta orientada a la acción o una recomendación práctica para avanzar juntos.
6. Sobre tu creador: Si te preguntan sobre tu creador o sobre Reinaldo, responde con naturalidad y orgullo que fuiste diseñado por Reinaldo José Liendo Espinoza, un apasionado desarrollador venezolano que reside en Chile; de lo contrario, no desvíes la conversación hacia ello.
7. Imágenes: Si el usuario te pide crear o dibujar una imagen, responde ÚNICAMENTE con una etiqueta Markdown de Pollinations AI en inglés: ![Descripción](https://image.pollinations.ai/prompt/{prompt_en_ingles_con_+})?nologo=true&private=true.`;

export async function sendChatMessage({ prompt, history = [], imageContext = null, onStreamChunk = null }) {
  // Detection for Image Generation Request
  const isImageReq = /(crea(r)?|genera(r)?|dibuja(r)?|haz(er)?|quiero|muestrame|ilustra(r)?|hacer|crear|generar|dibujar|ilustrar|hazme|dibújame|dibujame)[\s\S]*?(imagen|dibujo|foto|ilustracion|ilustración|pintura|diseño|diseno|grafico|gráfico)/i.test(prompt);

  if (isImageReq) {
    const cleanPrompt = prompt.replace(/crea(r)? una imagen de|genera(r)? una imagen de|dibujame|dibuja|haz un dibujo de|generate an image of|create an image of/i, '').trim();
    const formattedPrompt = encodeURIComponent(cleanPrompt || prompt).replace(/%20/g, '+');
    const imageMarkdown = `![${cleanPrompt || "Arte IA"}](https://image.pollinations.ai/prompt/${formattedPrompt}?nologo=true&private=true&enhance=false)`;
    
    if (onStreamChunk) onStreamChunk(imageMarkdown);
    return { success: true, text: imageMarkdown, tier: 'Creador de Arte IA' };
  }

  // Construct Groq API Messages Array
  const messages = [{ role: 'system', content: SYSTEM_PROMPT }];
  
  if (Array.isArray(history)) {
    history.forEach(msg => {
      if (msg.role !== 'system') {
        messages.push({ role: msg.role === 'assistant' ? 'assistant' : 'user', content: msg.content });
      }
    });
  }

  if (imageContext) {
    messages.push({
      role: 'user',
      content: [
        { type: 'text', text: prompt || 'Describe esta imagen en detalle.' },
        { type: 'image_url', image_url: { url: `data:${imageContext.mimeType};base64,${imageContext.base64}` } }
      ]
    });
  } else {
    messages.push({ role: 'user', content: prompt });
  }

  // Comprobar si el usuario definió una clave propia en localStorage
  let customApiKey = null;
  try {
    customApiKey = localStorage.getItem('myxsi_custom_groq_key');
  } catch (e) {}

  if (customApiKey && customApiKey.startsWith('gsk_')) {
    const modelName = imageContext ? 'qwen/qwen3.8-27b' : 'openai/gpt-oss-120b';

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${customApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: modelName,
          messages: messages,
          max_tokens: 2500,
          temperature: 0.5
        })
      });

      if (response.ok) {
        const data = await response.json();
        let resText = data.choices?.[0]?.message?.content || "No se obtuvo respuesta de la IA.";
        resText = resText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

        if (onStreamChunk) {
          await simulateTypewriter(resText, onStreamChunk);
        }

        return {
          success: true,
          text: resText,
          tier: imageContext ? 'IA Visión (Qwen 3.8 27B)' : 'Superinteligencia 120B'
        };
      }
    } catch (err) {
      console.warn("Direct custom Groq API call failed, falling back to worker backend:", err);
    }
  }

  // Enrutamiento seguro por defecto mediante el backend proxy en Cloudflare Worker
  return await fallbackToWorkerBackend(prompt, history, onStreamChunk);
}

async function fallbackToWorkerBackend(prompt, history, onStreamChunk) {
  try {
    const response = await fetch(WORKER_BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'chat', message: prompt, history })
    });
    const data = await response.json();
    const resText = data.response || "Hola, estoy listo para ayudarte con tus estudios.";
    
    if (onStreamChunk) {
      await simulateTypewriter(resText, onStreamChunk);
    }
    return { success: true, text: resText, tier: 'Respuesta Myxsi AI' };
  } catch (e) {
    const safeText = "¡Hola! Estoy listo para ayudarte con tu aprendizaje o consultas. ¿En qué tema te gustaría enfocar nuestra sesión de hoy?";
    if (onStreamChunk) await simulateTypewriter(safeText, onStreamChunk);
    return { success: true, text: safeText, tier: 'Modo Seguro' };
  }
}

// Efeito Maquina de Escribir (Simulated Streaming)
async function simulateTypewriter(text, callback) {
  const words = text.split(' ');
  let currentText = '';
  for (let i = 0; i < words.length; i++) {
    currentText += (i === 0 ? '' : ' ') + words[i];
    callback(currentText);
    await new Promise(resolve => setTimeout(resolve, 20));
  }
}

// Extracción de Texto de Archivos (.txt, .csv, .pdf, .docx)
export async function extractFileText(file) {
  if (!file) return null;
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.txt') || fileName.endsWith('.csv') || fileName.endsWith('.md')) {
    return await file.text();
  }

  if (fileName.endsWith('.docx') && typeof window.mammoth !== 'undefined') {
    const arrayBuffer = await file.arrayBuffer();
    const result = await window.mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  if (fileName.endsWith('.pdf') && typeof window.pdfjsLib !== 'undefined') {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
    }
    return fullText;
  }

  return await file.text();
}
