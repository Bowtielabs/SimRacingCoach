// ==========================================
// SIMRACING COACH - UNIFIED SCREEN RENDERER
// ==========================================

let currentLanguage = 'es';
let isRunning = false;

// DOM Elements
const elements = {
  // Sidebar controls
  simulatorSelect: document.getElementById('simulator-select'),
  languageSelect: document.getElementById('language-select'),
  testVoiceBtn: document.getElementById('test-voice-btn'),
  startBtn: document.getElementById('start-btn'),
  stopBtn: document.getElementById('stop-btn'),

  // Main content - Status Bar
  coachState: document.getElementById('coach-state'),
  audioWaves: document.getElementById('audio-waves'),
  simName: document.getElementById('sim-name'),

  // Main content - Last Recommendation
  lastRecPanel: document.getElementById('last-recommendation'),
  recIcon: document.getElementById('rec-icon'),
  recText: document.getElementById('rec-text'),
  recTime: document.getElementById('rec-time'),

  // Control buttons
  focusBtn: document.getElementById('focus-btn'),
  muteBtn: document.getElementById('mute-btn')
};

// ========== INITIALIZATION ==========

window.addEventListener('DOMContentLoaded', async () => {
  console.log('[Renderer] Unified screen initialized');

  // Load translations first
  await loadTranslations();

  // Setup event listeners
  setupEventListeners();

  // Initial status update
  updateStatus({ state: 'disconnected' });
});

// ========== EVENT LISTENERS ==========

function setupEventListeners() {
  console.log('[Renderer] Setting up event listeners');
  console.log('[Renderer] Start button element:', elements.startBtn);
  console.log('[Renderer] Stop button element:', elements.stopBtn);

  // Language change
  elements.languageSelect.addEventListener('change', async () => {
    const newLang = elements.languageSelect.value;
    await applyLanguage(newLang);
  });

  // Test Voice
  elements.testVoiceBtn.addEventListener('click', async () => {
    console.log('[Renderer] Test voice clicked');

    // Set speaking state
    elements.testVoiceBtn.classList.add('speaking');
    const originalHTML = elements.testVoiceBtn.innerHTML;
    elements.testVoiceBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <rect x="4" y="8" width="3" height="8" rx="1.5">
          <animate attributeName="height" values="8;16;8" dur="0.8s" repeatCount="indefinite"/>
          <animate attributeName="y" values="8;4;8" dur="0.8s" repeatCount="indefinite"/>
        </rect>
        <rect x="10" y="8" width="3" height="8" rx="1.5">
          <animate attributeName="height" values="8;16;8" dur="0.8s" begin="0.15s" repeatCount="indefinite"/>
          <animate attributeName="y" values="8;4;8" dur="0.8s" begin="0.15s" repeatCount="indefinite"/>
        </rect>
        <rect x="16" y="8" width="3" height="8" rx="1.5">
          <animate attributeName="height" values="8;16;8" dur="0.8s" begin="0.3s" repeatCount="indefinite"/>
          <animate attributeName="y" values="8;4;8" dur="0.8s" begin="0.3s" repeatCount="indefinite"/>
        </rect>
      </svg>
      Reproduciendo...
    `;

    try {
      await window.api.testVoice({
        text: getTestVoiceText(),
        language: currentLanguage
      });

      // Wait a bit to show completion
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (err) {
      console.error('[Renderer] Test voice error:', err);
    } finally {
      // Restore original state
      elements.testVoiceBtn.classList.remove('speaking');
      elements.testVoiceBtn.innerHTML = originalHTML;
    }
  });

  console.log('[Renderer] About to register START button listener');

  // Start Coaching
  elements.startBtn.addEventListener('click', async () => {
    console.log('[Renderer] START COACHING clicked, isRunning:', isRunning);

    // Prevent multiple clicks
    if (isRunning) {
      console.log('[Renderer] Already running, ignoring click');
      return;
    }

    try {
      const sim = elements.simulatorSelect.value;

      // Immediately switch to STOP button (allows cancellation during waiting)
      isRunning = true;
      elements.startBtn.classList.add('hidden');
      elements.stopBtn.classList.remove('hidden');

      // Update config and start service
      await window.api.updateConfig({
        adapter: { id: sim },
        language: currentLanguage
      });

      await window.api.startService({
        adapterId: sim,
        language: currentLanguage
      });

      console.log('[Renderer] Service started successfully');
      startStatusPolling();

    } catch (err) {
      console.error('[Renderer] Start error:', err);
      // Restore start button on error
      isRunning = false;
      elements.stopBtn.classList.add('hidden');
      elements.startBtn.classList.remove('hidden');
    }
  });

  console.log('[Renderer] START button listener registered');

  // Stop Coaching
  elements.stopBtn.addEventListener('click', async () => {
    console.log('[Renderer] STOP COACHING clicked');

    try {
      // Disable button while stopping
      elements.stopBtn.disabled = true;

      await window.api.stopService();

      // Only switch buttons AFTER service responds
      isRunning = false;
      elements.stopBtn.classList.add('hidden');
      elements.startBtn.classList.remove('hidden');

      updateStatus({ state: 'disconnected' });
      stopStatusPolling();

    } catch (err) {
      console.error('[Renderer] Stop error:', err);
    } finally {
      // ALWAYS re-enable button
      elements.stopBtn.disabled = false;
    }
  });

  // Focus Mode Toggle
  elements.focusBtn.addEventListener('click', async () => {
    const isActive = elements.focusBtn.classList.contains('active');

    try {
      if (isActive) {
        // Deactivate focus
        await window.api.focus(); // This toggles focus in backend
        elements.focusBtn.classList.remove('active');
        console.log('[Renderer] Focus mode OFF');
      } else {
        // Activate focus
        await window.api.focus();
        elements.focusBtn.classList.add('active');
        console.log('[Renderer] Focus mode ON');
      }
    } catch (err) {
      console.error('[Renderer] Focus toggle error:', err);
    }
  });

  // Mute Toggle
  elements.muteBtn.addEventListener('click', async () => {
    const isActive = elements.muteBtn.classList.contains('active');

    try {
      if (isActive) {
        // Unmute
        await window.api.unmute();
        elements.muteBtn.classList.remove('active');
        console.log('[Renderer] Mute OFF');
      } else {
        // Mute
        await window.api.mute();
        elements.muteBtn.classList.add('active');
        console.log('[Renderer] Mute ON');
      }
    } catch (err) {
      console.error('[Renderer] Mute toggle error:', err);
    }
  });
}

// ========== LANGUAGE ==========

// Load translation files
let translations = {
  es: null,
  en: null,
  pt: null
};

async function loadTranslations() {
  const languages = ['es', 'en', 'pt'];

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

async function applyLanguage(lang) {
  currentLanguage = lang;
  console.log(`[Renderer] Language set to: ${lang}`);

  const t = translations[lang];
  if (!t) {
    console.error(`Translations for ${lang} not loaded`);
    return;
  }

  // Update all UI labels
  const testVoiceBtn = document.getElementById('test-voice-btn');
  const startBtn = document.getElementById('start-btn');
  const stopBtn = document.getElementById('stop-btn');

  // Update button labels (preserve SVG icons)
  const speakerIcon = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M11 5L6 9H2v6h4l5 4V5z"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
    </svg>
  `;

  const playIcon = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z"/>
    </svg>
  `;

  const stopIcon = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12"/>
    </svg>
  `;

  // Update test voice button only (start/stop buttons manage their own state)
  if (testVoiceBtn) {
    testVoiceBtn.innerHTML = `${speakerIcon}${t.config.testVoice}`;
  }

  // DON'T update start/stop innerHTML - it breaks event listeners!
  // These buttons are set in HTML and should not be dynamically updated

  // Update service config
  try {
    await window.api.updateConfig({
      language: lang,
      ai: { language: lang }
    });
  } catch (err) {
    console.error('[Renderer] Language config error:', err);
  }
}

function getTestVoiceText() {
  const t = translations[currentLanguage];
  return t?.voice?.testMessage || 'Test message';
}

// ========== STATUS UPDATES ==========

function updateStatus(status) {
  console.log('[Renderer] Update status:', status);

  const connectionDot = document.querySelector('.connection-dot');

  // Update coach state and connection dot color
  if (status.state === 'running' || status.state === 'connected' || status.sessionActive) {
    elements.coachState.textContent = 'Activo';
    elements.coachState.classList.add('status-active');
    if (connectionDot) connectionDot.className = 'connection-dot connected';

    // Show STOP button, hide START button
    if (!isRunning) {
      isRunning = true;
      elements.startBtn.classList.add('hidden');
      elements.stopBtn.classList.remove('hidden');
    }

  } else if (status.state === 'waiting') {
    elements.coachState.textContent = 'Esperando...';
    elements.coachState.classList.remove('status-active');
    if (connectionDot) connectionDot.className = 'connection-dot waiting';

    // Don't touch buttons during waiting - let click handler manage them

  } else {
    // Disconnected state
    elements.coachState.textContent = 'Desconectado';
    elements.coachState.classList.remove('status-active');
    if (connectionDot) connectionDot.className = 'connection-dot'; // Red by default

    // Show START button, hide STOP button
    isRunning = false;
    elements.stopBtn.classList.add('hidden');
    elements.startBtn.classList.remove('hidden');
  }

  // Update sim name
  if (status.sim) {
    elements.simName.textContent = status.sim === 'mock-iracing' ? 'iRacing (Mock)' : 'iRacing';
  } else {
    elements.simName.textContent = '—';
  }
}

function updateCoachPanel(status) {
  // Show/hide audio waves when speaking
  if (status.audio?.isSpeaking) {
    elements.audioWaves.style.display = 'flex';
  } else {
    elements.audioWaves.style.display = 'none';
  }

  // Update buffer progress
  if (status.buffer) {
    const progress = status.buffer.progress || 0;
    const size = status.buffer.size || 0;
    elements.bufferProgress.style.width = `${progress}%`;
    elements.bufferText.textContent = `${size}/300 frames`;
  } else {
    elements.bufferProgress.style.width = '0%';
    elements.bufferText.textContent = '0/300 frames';
  }

  // Update last recommendation
  if (status.ai?.lastRecommendation) {
    const rec = status.ai.lastRecommendation;
    elements.lastRecPanel.style.display = 'flex';

    // Category icons
    const categoryIcons = {
      technique: '🎯',
      engine: '⚙️',
      brakes: '🔴',
      tyres: '🛞',
      strategy: '🧠',
      track: '🏁'
    };

    elements.recIcon.textContent = categoryIcons[rec.category] || '💬';
    elements.recText.textContent = rec.advice;

    // Timestamp
    const secondsAgo = Math.floor((Date.now() - rec.timestamp) / 1000);
    if (secondsAgo < 60) {
      elements.recTime.textContent = `Hace ${secondsAgo}s`;
    } else {
      elements.recTime.textContent = `Hace ${Math.floor(secondsAgo / 60)}m`;
    }
  } else {
    elements.lastRecPanel.style.display = 'none';
  }
}

// ========== STATUS POLLING ==========

let statusPollInterval = null;

function startStatusPolling() {
  if (statusPollInterval) return;

  console.log('[Renderer] Starting status polling');

  statusPollInterval = setInterval(async () => {
    try {
      const status = await window.api.getStatus();
      updateStatus(status);
      updateCoachPanel(status);

      // Auto-stop if disconnected
      if (status.state === 'disconnected' && isRunning) {
        console.log('[Renderer] Auto-stopping (disconnected)');
        isRunning = false;
        elements.stopBtn.classList.add('hidden');
        elements.startBtn.classList.remove('hidden');
        stopStatusPolling();
      }
    } catch (err) {
      console.error('[Renderer] Status poll error:', err);
    }
  }, 1500);
}

// ========== STATUS POLLING ==========

let statusPollingInterval = null;

function startStatusPolling() {
  console.log('[Renderer] Starting status polling');

  // Clear any existing interval
  if (statusPollingInterval) {
    clearInterval(statusPollingInterval);
  }

  // Poll every 1 second
  statusPollingInterval = setInterval(async () => {
    try {
      const status = await window.api.getStatus();
      updateStatus(status);
    } catch (err) {
      console.error('[Renderer] Status poll error:', err);
    }
  }, 1000);
}

function stopStatusPolling() {
  if (statusPollInterval) {
    console.log('[Renderer] Stopping status polling');
    clearInterval(statusPollInterval);
    statusPollInterval = null;
  }
}

// ========== EXPORTS ==========

console.log('[Renderer] Unified screen renderer loaded');
