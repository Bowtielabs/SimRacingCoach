// i18n translations import
let translations = {
  es: null,
  en: null,
  pt: null,
  fr: null,
  it: null
};

let currentLanguage = 'es';
let isRunning = false;

// DOM elements
const elements = {
  simulatorSelect: document.getElementById('simulator-select'),
  languageSelect: document.getElementById('language-select'),

  speedSlider: document.getElementById('speed-slider'),
  speedValue: document.getElementById('speed-value'),
  testVoiceBtn: document.getElementById('test-voice-btn'),
  runBtn: document.getElementById('run-btn'),
  stopBtn: document.getElementById('stop-btn'),
  statusIndicator: document.getElementById('status-indicator'),
  statusText: document.getElementById('status-text'),
};

// Load translation files
async function loadTranslations() {
  const languages = ['es', 'en', 'pt', 'fr', 'it'];

  for (const lang of languages) {
    try {
      const response = await fetch(`./i18n/${lang}.json`);
      translations[lang] = await response.json();
    } catch (err) {
      console.error(`Failed to load ${lang} translations:`, err);
    }
  }

  // Apply initial language
  await applyLanguage(currentLanguage);
}

// Apply language to UI
async function applyLanguage(lang) {
  currentLanguage = lang;
  const t = translations[lang];

  if (!t) {
    console.error(`Translations for ${lang} not loaded`);
    return;
  }

  // Update all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const value = getNestedProperty(t, key);

    if (value) {
      if (el.tagName === 'INPUT' || el.tagName === 'SELECT') {
        el.placeholder = value;
      } else {
        el.textContent = value;
      }
    }
  });

  // Update document lang attribute
  document.documentElement.lang = lang;

  // Notify backend of language change
  if (window.api) {
    await window.api.updateConfig({
      language: lang,
      ai: { language: mapToAILanguage(lang) }
    });
  }
}

// Helper to get nested property from object
function getNestedProperty(obj, path) {
  return path.split('.').reduce((current, prop) => current?.[prop], obj);
}

// Map UI language to AI language code
function mapToAILanguage(uiLang) {
  const map = {
    'es': 'es',
    'en': 'en',
    'pt': 'pt',
    'fr': 'fr',
    'it': 'it'
  };
  return map[uiLang] || 'es';
}

// Load config from backend
async function loadConfig() {
  try {
    const config = await window.api.getConfig();

    elements.simulatorSelect.value = config.adapter?.id || 'iracing';
    currentLanguage = config.language?.split('-')[0] || 'es';
    elements.languageSelect.value = currentLanguage;

    // Speed is stored as rate (-10 to +10), convert to multiplier (0.5 to 2.0)
    const rate = config.voice?.rate || 0;
    const speed = 1.0 + (rate / 10);
    elements.speedSlider.value = speed.toFixed(1);
    elements.speedValue.textContent = speed.toFixed(1) + 'x';

    await applyLanguage(currentLanguage);
  } catch (err) {
    console.error('Failed to load config:', err);
  }
}

// Update status display
function updateStatus(status) {
  elements.statusIndicator.className = 'status-indicator';

  const t = translations[currentLanguage];

  // Fallback text if translations not loaded
  const fallbackText = {
    connected: `Conectado - ${status.sim || 'iRacing'}`,
    running: 'Ejecutando',
    disconnected: 'Desconectado',
    waiting: 'Esperando...'
  };

  switch (status.state) {
    case 'connected':
      elements.statusIndicator.classList.add('connected');
      elements.statusText.textContent = t?.status?.connected?.replace('{{sim}}', status.sim) || fallbackText.connected;
      break;
    case 'running':
      elements.statusIndicator.classList.add('running');
      elements.statusText.textContent = t?.status?.running || fallbackText.running;
      break;
    case 'waiting':
      elements.statusIndicator.classList.add('running');
      elements.statusText.textContent = t?.status?.waiting?.replace('{{sim}}', status.sim) || fallbackText.waiting;
      break;
    case 'disconnected':
    default:
      elements.statusText.textContent = t?.status?.disconnected || fallbackText.disconnected;
      break;
  }
}

// Event Listeners

// Simulator change
elements.simulatorSelect.addEventListener('change', () => {
  window.api.updateConfig({
    adapter: { id: elements.simulatorSelect.value }
  });
});

// Language change
elements.languageSelect.addEventListener('change', async () => {
  const newLang = elements.languageSelect.value;
  await applyLanguage(newLang);
});

// Speed slider
elements.speedSlider.addEventListener('input', () => {
  const speed = Number(elements.speedSlider.value);
  elements.speedValue.textContent = speed.toFixed(1) + 'x';

  // Convert speed multiplier (0.5-2.0) back to rate (-10 to +10)
  const rate = Math.round((speed - 1.0) * 10);
  window.api.updateConfig({
    voice: { rate: rate }
  });
});

// Test Voice button
elements.testVoiceBtn.addEventListener('click', async () => {
  const originalText = elements.testVoiceBtn.querySelector('span').textContent;
  elements.testVoiceBtn.querySelector('span').textContent = '⏱️';
  elements.testVoiceBtn.disabled = true;

  try {
    const t = translations[currentLanguage];
    const testMessage = t?.voice?.testMessage || 'Test message';

    await window.api.testVoice(testMessage, {
      voice: 'ai-tts', // Use AI TTS instead of Windows
      rate: Number(elements.speedSlider.value)
    });

    elements.testVoiceBtn.querySelector('span').textContent = '✅';
  } catch (err) {
    console.error('Test voice failed:', err);
    elements.testVoiceBtn.querySelector('span').textContent = '❌';
  }

  setTimeout(() => {
    elements.testVoiceBtn.querySelector('span').textContent = originalText;
    elements.testVoiceBtn.disabled = false;
  }, 2000);
});

// RUN button
elements.runBtn.addEventListener('click', async () => {
  try {
    await window.api.startService({
      adapterId: elements.simulatorSelect.value,
      language: currentLanguage
    });

    isRunning = true;
    elements.runBtn.classList.add('hidden');
    elements.stopBtn.classList.remove('hidden');
    updateStatus({ state: 'running', sim: elements.simulatorSelect.value });
  } catch (err) {
    console.error('Failed to start:', err);
  }
});

// STOP button
elements.stopBtn.addEventListener('click', async () => {
  try {
    await window.api.stopService();

    isRunning = false;
    elements.stopBtn.classList.add('hidden');
    elements.runBtn.classList.remove('hidden');
    updateStatus({ state: 'disconnected' });
  } catch (err) {
    console.error('Failed to stop:', err);
  }
});

// Status polling (every 2 seconds)
setInterval(async () => {
  try {
    const status = await window.api.getStatus();
    console.log('[Status Poll]', status); // DEBUG
    updateStatus(status);

    // Update button states based on status
    if (status.state === 'disconnected' && isRunning) {
      console.log('[Status Poll] Resetting to disconnected'); // DEBUG
      isRunning = false;
      elements.stopBtn.classList.add('hidden');
      elements.runBtn.classList.remove('hidden');
    }
  } catch (err) {
    console.error('[Status Poll] Error:', err); // DEBUG
  }
}, 2000);

// Initialize
loadTranslations().then(() => {
  loadConfig();
});
