/* =========================================================
   MYXSI AI - AUDIO & VOICE RECOGNITION / TTS SERVICE
   ========================================================= */

let recognition = null;
let isListening = false;
let synthesis = window.speechSynthesis || null;

// Inicializar Reconocimiento de Voz
export function initSpeechRecognition({ onResult, onError, onEnd }) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    console.warn("SpeechRecognition API no está soportada en este navegador.");
    return false;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'es-ES';

  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    if (onResult) onResult(transcript, event.results[0].isFinal);
  };

  recognition.onerror = (event) => {
    console.warn("SpeechRecognition Error:", event.error);
    isListening = false;
    if (onError) onError(event.error);
  };

  recognition.onend = () => {
    isListening = false;
    if (onEnd) onEnd();
  };

  return true;
}

export function startListening() {
  if (recognition && !isListening) {
    try {
      recognition.start();
      isListening = true;
      return true;
    } catch (e) {
      console.warn("Failed to start speech recognition:", e);
    }
  }
  return false;
}

export function stopListening() {
  if (recognition && isListening) {
    try {
      recognition.stop();
    } catch (e) {
      console.warn("Failed to stop speech recognition:", e);
    }
    isListening = false;
  }
}

export function toggleListening(callbacks) {
  if (isListening) {
    stopListening();
    return false;
  } else {
    if (!recognition) {
      const supported = initSpeechRecognition(callbacks);
      if (!supported) {
        alert("El reconocimiento de voz no está soportado en este navegador. Intenta usar Chrome o Edge.");
        return false;
      }
    }
    return startListening();
  }
}

// Sintetizador de Voz (Text-to-Speech)
export function speakText(text) {
  if (!synthesis) return;
  
  try {
    synthesis.cancel(); // Detener cualquier audio previo
    const cleanText = text.replace(/!\[.*?\]\(.*?\)/g, '').replace(/[*_#`~]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'es-ES';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    synthesis.speak(utterance);
  } catch (e) {
    console.warn("Error en Text-to-Speech:", e);
  }
}
