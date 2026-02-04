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

  // Main content - Buffer Progress
  bufferTimer: document.getElementById('buffer-timer'),
  bufferProgressBar: document.getElementById('buffer-progress-bar'),
  bufferPercentage: document.getElementById('buffer-percentage'),

  // Main content - Recommendations Feed
  feedCount: document.getElementById('feed-count'),
  recList: document.getElementById('recommendations-list'),

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

    // Clear old recommendations from UI
    clearRecommendationsFeed();

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

// Translation state
let translations = {};

// Recommendation Icon Mapping
const RECOMMENDATION_ICONS = {
  'fuel': '⛽',
  'tyre': '🏎️',
  'brake': '🛑',
  'flag': '🚩',
  'temp': '🌡️',
  'technique': '🎯',
  'rev-match': '⚙️',
  'default': '💡'
};

function getIconForRecommendation(ruleId) {
  if (ruleId.includes('fuel')) return RECOMMENDATION_ICONS.fuel;
  if (ruleId.includes('tyre')) return RECOMMENDATION_ICONS.tyre;
  if (ruleId.includes('brake')) return RECOMMENDATION_ICONS.brake;
  if (ruleId.includes('flag')) return RECOMMENDATION_ICONS.flag;
  if (ruleId.includes('temp') || ruleId.includes('overheat')) return RECOMMENDATION_ICONS.temp;
  if (ruleId.includes('rev-match')) return RECOMMENDATION_ICONS['rev-match'];
  return RECOMMENDATION_ICONS.default;
}

function getRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 10) return 'Ahora';
  if (seconds < 60) return `hace ${seconds} seg`;
  if (minutes < 60) return `hace ${minutes} min`;
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.floor(hours / 24)} días`;
}

// ========== LANGUAGE ==========

// Load translation files
// The original `translations` variable was defined here, but it's now moved above with other state.
// The `currentLanguage` variable was also defined here, but it's now moved above with other state.

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
  const SIM_DISPLAY_NAMES = {
    'iracing': 'iRacing',
    'mock-iracing': 'iRacing (Mock)',
    'acc': 'Assetto Corsa',
    'ac': 'Assetto Corsa',
    'ams2': 'Automobilista 2',
    'actc': 'ACTC / rFactor 1',
    'rfactor2': 'rFactor 2'
  };

  if (status.sim) {
    elements.simName.textContent = SIM_DISPLAY_NAMES[status.sim] || status.sim;
  } else {
    elements.simName.textContent = '—';
  }
}

function clearRecommendationsFeed() {
  // Reset feed to empty state
  elements.feedCount.textContent = '0';
  elements.recList.innerHTML = `
    <div class="feed-empty">
      <span class="empty-icon">💬</span>
      <p>Aún no hay recomendaciones</p>
    </div>
  `;
}

function updateBufferProgress(bufferData) {
  if (!bufferData || !elements.bufferProgressBar) return;

  const { progress, secondsToAnalysis } = bufferData;

  // Update progress bar
  elements.bufferProgressBar.style.width = `${progress}%`;

  // Update timer
  elements.bufferTimer.textContent = `${secondsToAnalysis}s`;

  // Update percentage
  elements.bufferPercentage.textContent = `${progress}%`;
}

function updateCoachPanel(status) {
  // Update buffer progress
  if (status.ai?.buffer) {
    updateBufferProgress(status.ai.buffer);
  }

  console.log('[CoachPanel] status.ai:', status.ai);
  console.log('[CoachPanel] status.ai?.recommendations:', status.ai?.recommendations);

  // Show/hide audio waves when speaking
  if (status.audio?.isSpeaking) {
    elements.audioWaves.style.display = 'flex';
  } else {
    elements.audioWaves.style.display = 'none';
  }

  // Update recommendations feed
  const recommendations = status.ai?.recommendations || status.recommendations;
  if (recommendations && recommendations.length > 0) {
    updateRecommendationsFeed(recommendations);
  }
}

function updateRecommendationsFeed(recommendations) {
  console.log('[Feed] updateRecommendationsFeed called with:', recommendations);

  if (!recommendations || recommendations.length === 0) {
    console.log('[Feed] No recommendations, showing empty state');
    elements.feedCount.textContent = '0';
    elements.recList.innerHTML = `
      <div class="feed-empty">
        <span class="empty-icon">💬</span>
        <p>Aún no hay recomendaciones</p>
      </div>
    `;
    return;
  }

  console.log('[Feed] Displaying', recommendations.length, 'recommendations');

  // Update count
  elements.feedCount.textContent = recommendations.length;

  // Clear and rebuild list
  elements.recList.innerHTML = '';

  // Add each recommendation (newest first)
  recommendations.forEach(rec => {
    const item = document.createElement('div');
    item.className = 'recommendation-item';
    item.dataset.id = rec.id;

    const icon = getIconForRecommendation(rec.ruleId);
    const timestamp = getRelativeTime(rec.timestamp);
    const priorityClass = rec.priority >= 8 ? 'high' : rec.priority >= 5 ? 'medium' : 'low';

    item.innerHTML = `
      <div class="rec-icon-container">
        ${icon}
      </div>
      <div class="rec-details">
        <p class="rec-message">${rec.advice}</p>
        <div class="rec-meta">
          <span class="rec-timestamp">${timestamp}</span>
          <span class="rec-priority ${priorityClass}">P${rec.priority}</span>
        </div>
      </div>
    `;

    elements.recList.appendChild(item);
  });

  console.log('[Feed] Feed updated, items in DOM:', elements.recList.children.length);

  // Auto-scroll to top to see newest
  elements.recList.scrollTop = 0;
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

function stopStatusPolling() {
  if (statusPollInterval) {
    console.log('[Renderer] Stopping status polling');
    clearInterval(statusPollInterval);
    statusPollInterval = null;
  }
}


// ========== EXPORTS ==========

console.log('[Renderer] Unified screen renderer loaded');
