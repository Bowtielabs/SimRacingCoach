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
  messages: document.getElementById('messages'),
};

const form = document.getElementById('settings-form');
const inputs = {
  adapter: document.getElementById('adapter-select'),
  language: document.getElementById('language-select'),
  apiUrl: document.getElementById('api-url'),
  apiToken: document.getElementById('api-token'),
  voiceName: document.getElementById('voice-name'),
  voiceVolume: document.getElementById('voice-volume'),
  voiceRate: document.getElementById('voice-rate'),
  hotkeyMute: document.getElementById('hotkey-mute'),
  hotkeyVolumeUp: document.getElementById('hotkey-volume-up'),
  hotkeyVolumeDown: document.getElementById('hotkey-volume-down'),
  hotkeyRepeat: document.getElementById('hotkey-repeat'),
  testVoice: document.getElementById('test-voice'),
  configPath: document.getElementById('config-path'),
  stopButton: document.getElementById('stop-button'),
};

function setScreen(screen) {
  if (screen === 'config') {
    screens.config.classList.remove('hidden');
    screens.status.classList.add('hidden');
  } else {
    screens.config.classList.add('hidden');
    screens.status.classList.remove('hidden');
  }
}

function populateAdapters() {
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
  inputs.voiceName.value = config.voice.voice ?? '';
  inputs.voiceVolume.value = config.voice.volume;
  inputs.voiceRate.value = config.voice.rate;
  inputs.hotkeyMute.value = config.hotkeys.muteToggle;
  inputs.hotkeyVolumeUp.value = config.hotkeys.volumeUp;
  inputs.hotkeyVolumeDown.value = config.hotkeys.volumeDown;
  inputs.hotkeyRepeat.value = config.hotkeys.repeatLast ?? '';

  inputs.configPath.textContent = await window.api.getConfigPath();
}

function formatStatusMessage(state, adapterLabel, running) {
  if (!running) {
    return `Adapter detenido (${adapterLabel})`;
  }
  switch (state) {
    case 'connected':
      return `Conectado a: ${adapterLabel}`;
    case 'waiting':
      return `Esperando datos de: ${adapterLabel}`;
    case 'error':
      return `Error en: ${adapterLabel}`;
    case 'disconnected':
    default:
      return `Sin conexión con: ${adapterLabel}`;
  }
}

function updateBadge(state) {
  statusEls.badge.className = `badge badge-${state}`;
  statusEls.badge.textContent = state.toUpperCase();
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
    statusEls.messages.innerHTML = '';
    (status.recentMessages ?? []).forEach((message) => {
      const li = document.createElement('li');
      li.textContent = message;
      statusEls.messages.appendChild(li);
    });
  } catch {
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

inputs.testVoice.addEventListener('click', async () => {
  await window.api.testVoice('Prueba de voz de SimRacing Coach.');
});

inputs.stopButton.addEventListener('click', async () => {
  await window.api.stopService();
  setScreen('config');
});

populateAdapters();
loadConfig();
refreshStatus();
setInterval(refreshStatus, 1500);
