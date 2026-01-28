const adapters = [
  { id: 'iracing', label: 'iRacing' },
  { id: 'ams2', label: 'AMS2' },
  { id: 'raceroom', label: 'RaceRoom' },
  { id: 'rfactor', label: 'rFactor' },
  { id: 'rfactor2', label: 'rFactor 2' },
  { id: 'automobilista', label: 'Automobilista' },
  { id: 'simutc', label: 'SimuTC' },
  { id: 'ac', label: 'Assetto Corsa' },
  { id: 'acc', label: 'ACC' },
  { id: 'mock-iracing', label: 'iRacing (Mock)' },
  { id: 'other', label: 'Other' },
];

const screens = {
  config: document.getElementById('config-screen'),
  status: document.getElementById('status-screen'),
};

const statusEls = {
  message: document.getElementById('status-message'),
  details: document.getElementById('status-details'),
  badge: document.getElementById('connection-badge'),
  fps: document.getElementById('fps'),
  lastFrame: document.getElementById('last-frame'),
  liveDot: document.getElementById('live-indicator'),
  messages: document.getElementById('messages'),
};

const form = document.getElementById('settings-form');
const inputs = {
  adapter: document.getElementById('adapter-select'),
  language: document.getElementById('language-select'),
  apiUrl: document.getElementById('api-url'),
  apiToken: document.getElementById('api-token'),
  useRemoteApi: document.getElementById('use-remote-api'),
  voiceName: document.getElementById('voice-name'),
  voiceVolume: document.getElementById('voice-volume'),
  volumeValue: document.getElementById('volume-value'),
  voiceRate: document.getElementById('voice-rate'),
  rateValue: document.getElementById('rate-value'),
  hotkeyMute: document.getElementById('hotkey-mute'),
  hotkeyVolumeUp: document.getElementById('hotkey-volume-up'),
  hotkeyVolumeDown: document.getElementById('hotkey-volume-down'),
  hotkeyRepeat: document.getElementById('hotkey-repeat'),
  testVoice: document.getElementById('test-voice'),
  configPath: document.getElementById('config-path'),
  stopButton: document.getElementById('stop-button'),
  muteBtn: document.getElementById('mute-btn'),
  repeatBtn: document.getElementById('repeat-btn'),
  focusBtn: document.getElementById('focus-btn'),
};

// Definicion de botones primero
const testVoiceBtn = document.getElementById('test-voice');
if (testVoiceBtn) {
  testVoiceBtn.addEventListener('click', async () => {
    console.log('[Renderer] Click en Probar Voz');
    const originalText = testVoiceBtn.textContent;
    testVoiceBtn.textContent = '⏱️ Enviando...';
    try {
      console.log('[Renderer] Llamando a window.api.testVoice con:', {
        voice: inputs.voiceName.value,
        volume: Number(inputs.voiceVolume.value),
        rate: Number(inputs.voiceRate.value)
      });
      await window.api.testVoice('Probando audio con la voz seleccionada', {
        voice: inputs.voiceName.value,
        volume: Number(inputs.voiceVolume.value),
        rate: Number(inputs.voiceRate.value)
      });
      testVoiceBtn.textContent = '✅ OK';
    } catch (err) {
      console.error('[Renderer] Error detallado:', err);
      testVoiceBtn.textContent = '❌ ERROR';
    }
    setTimeout(() => { testVoiceBtn.textContent = originalText; }, 2000);
  });
}

// Defensive check
Object.entries(inputs).forEach(([key, el]) => {
  if (!el && key !== 'testVoice') console.error(`[Renderer] Element not found: ${key}`);
});


function setScreen(screen) {
  if (screen === 'config') {
    screens.config.classList.remove('hidden');
    screens.status.classList.add('hidden');
  } else {
    screens.config.classList.add('hidden');
    screens.status.classList.remove('hidden');
  }
}

async function populateVoices() {
  try {
    const voices = await window.api.getVoices();
    inputs.voiceName.innerHTML = '';

    if (voices.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = '❌ No se encontraron voces. ¡Instala voces en Windows!';
      option.disabled = true;
      option.selected = true;
      inputs.voiceName.appendChild(option);
      return;
    }

    voices.forEach((voice) => {
      const option = document.createElement('option');
      option.value = voice;
      option.textContent = voice;
      inputs.voiceName.appendChild(option);
    });
  } catch (err) {
    console.error('[Renderer] Failed to populate voices:', err);
  }
}

async function populateAdapters() {
  inputs.adapter.innerHTML = '';
  adapters.forEach((adapter) => {
    const option = document.createElement('option');
    option.value = adapter.id;
    option.textContent = adapter.label;
    inputs.adapter.appendChild(option);
  });
}

async function loadConfig() {
  const config = await window.api.getConfig();
  inputs.adapter.value = config.adapter?.id ?? 'iracing';
  inputs.language.value = config.language ?? 'es-AR';
  inputs.apiUrl.value = config.api.url;
  inputs.apiToken.value = config.api.token ?? '';
  inputs.useRemoteApi.checked = config.api.useRemoteApi ?? false;

  // Update status text
  updateApiModeStatus(config.api.useRemoteApi ?? false);

  // Wait for voices to be populated then select the current one
  await populateVoices();
  const savedVoice = config.voice.voice && config.voice.voice.trim() !== ''
    ? config.voice.voice
    : 'Microsoft Sabina Desktop';

  inputs.voiceName.value = savedVoice;

  inputs.voiceVolume.value = config.voice.volume;
  if (inputs.volumeValue) inputs.volumeValue.textContent = config.voice.volume;

  inputs.voiceRate.value = config.voice.rate;
  if (inputs.rateValue) inputs.rateValue.textContent = config.voice.rate;
  inputs.hotkeyMute.value = config.hotkeys.muteToggle;
  inputs.hotkeyVolumeUp.value = config.hotkeys.volumeUp;
  inputs.hotkeyVolumeDown.value = config.hotkeys.volumeDown;
  inputs.hotkeyRepeat.value = config.hotkeys.repeatLast ?? '';

  inputs.configPath.textContent = await window.api.getConfigPath();
}

// Update API mode status text
function updateApiModeStatus(isRemote) {
  const statusElement = document.getElementById('api-mode-status');
  if (statusElement) {
    statusElement.textContent = isRemote ? 'API Remota' : 'Local';
  }
}

// Config sync listeners
inputs.voiceName.addEventListener('change', () => {
  window.api.updateConfig({ voice: { voice: inputs.voiceName.value } });
});
inputs.voiceVolume.addEventListener('input', () => {
  if (inputs.volumeValue) inputs.volumeValue.textContent = inputs.voiceVolume.value;
  window.api.updateConfig({ voice: { volume: Number(inputs.voiceVolume.value) } });
});
inputs.voiceRate.addEventListener('input', () => {
  if (inputs.rateValue) inputs.rateValue.textContent = inputs.voiceRate.value;
  window.api.updateConfig({ voice: { rate: Number(inputs.voiceRate.value) } });
});
inputs.useRemoteApi.addEventListener('change', () => {
  console.log('[Renderer] useRemoteApi changed to:', inputs.useRemoteApi.checked);
  updateApiModeStatus(inputs.useRemoteApi.checked);
  window.api.updateConfig({ api: { useRemoteApi: inputs.useRemoteApi.checked } });
});

function formatStatusMessage(state, adapterLabel, running) {
  if (!running) {
    return `Adapter detenido (${adapterLabel})`;
  }
  switch (state) {
    case 'connected':
      return `Conectado a: ${adapterLabel}`;
    case 'waiting':
      return `Esperando ${adapterLabel}...`;
    case 'error':
      return `Error en: ${adapterLabel}`;
    case 'disconnected':
    default:
      return `Esperando ${adapterLabel}...`;
  }
}

function updateBadge(state) {
  statusEls.badge.className = `badge badge-${state}`;
  const badgeText = state === 'disconnected' ? 'WAITING' : state.toUpperCase();
  statusEls.badge.textContent = badgeText;
}

async function refreshStatus() {
  try {
    const status = await window.api.getStatus();
    const adapterLabel = status.adapter?.label ?? 'Sim';
    const state = status.adapterStatus?.state ?? 'disconnected';
    if (status.adapterRunning) {
      setScreen('status');
    }
    statusEls.message.textContent = formatStatusMessage(
      state,
      adapterLabel,
      status.adapterRunning,
    );
    statusEls.details.textContent = status.adapterStatus?.details ?? '';
    updateBadge(state);
    statusEls.fps.textContent = `FPS: ${status.fps ?? '-'}`;
    statusEls.lastFrame.textContent = status.lastFrameAt
      ? `Última telemetría: ${new Date(status.lastFrameAt).toLocaleTimeString()}`
      : 'Última telemetría: -';

    const isLive = status.lastFrameAt && (Date.now() - status.lastFrameAt < 2000);
    if (isLive) {
      statusEls.liveDot.classList.add('active');
    } else {
      statusEls.liveDot.classList.remove('active');
    }

    // Update button states
    inputs.muteBtn.textContent = status.muted ? 'Activado (Muted)' : 'Silenciar (Mute)';
    inputs.muteBtn.className = status.muted ? 'btn-danger' : 'btn-secondary';

    inputs.focusBtn.textContent = status.focusMode ? 'Focus: ON' : 'Focus: OFF';
    inputs.focusBtn.className = status.focusMode ? 'btn-success' : 'btn-secondary';

    const messagesList = statusEls.messages;
    const container = messagesList.parentElement;

    messagesList.innerHTML = '';
    const messages = status.recentMessages ?? [];
    messages.forEach((message) => {
      const li = document.createElement('li');
      li.textContent = message;
      messagesList.appendChild(li);
    });

    // Auto-scroll to bottom
    container.scrollTop = container.scrollHeight;
  } catch (error) {
    console.error('Refresh status error:', error);
    statusEls.message.textContent = 'Servicio offline';
    statusEls.details.textContent = '';
    updateBadge('error');
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = {
    adapter: {
      id: inputs.adapter.value,
    },
    language: inputs.language.value,
    api: {
      url: inputs.apiUrl.value,
      token: inputs.apiToken.value,
      useRemoteApi: inputs.useRemoteApi.checked,
    },
    voice: {
      voice: inputs.voiceName.value || undefined,
      volume: Number(inputs.voiceVolume.value),
      rate: Number(inputs.voiceRate.value),
    },
    hotkeys: {
      muteToggle: inputs.hotkeyMute.value,
      volumeUp: inputs.hotkeyVolumeUp.value,
      volumeDown: inputs.hotkeyVolumeDown.value,
      repeatLast: inputs.hotkeyRepeat.value || undefined,
    },
  };

  await window.api.updateConfig(payload);
  await window.api.startService({
    adapterId: inputs.adapter.value,
    language: inputs.language.value,
    hotkeys: payload.hotkeys,
  });
  setScreen('status');
  await refreshStatus();
});

// Button is moved to the top


inputs.stopButton.addEventListener('click', async () => {
  await window.api.stopService();
  setScreen('config');
});

inputs.muteBtn.addEventListener('click', async () => {
  const status = await window.api.getStatus();
  if (status.muted) {
    await window.api.unmute();
  } else {
    await window.api.mute();
  }
  await refreshStatus();
});

inputs.repeatBtn.addEventListener('click', async () => {
  await window.api.repeat();
});

inputs.focusBtn.addEventListener('click', async () => {
  await window.api.focus();
  await refreshStatus();
});

try {
  (async () => {
    await populateAdapters();
    await loadConfig();
    await refreshStatus();
    setInterval(refreshStatus, 1500);
  })().catch(e => console.error('[Renderer] Init failed:', e));
} catch (err) {
  console.error('[Renderer] Initialization error:', err);
}
