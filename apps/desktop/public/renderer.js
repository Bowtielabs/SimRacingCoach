const statusEls = {
  iracing: document.getElementById('iracing-status'),
  api: document.getElementById('api-status'),
  fps: document.getElementById('fps'),
  lastFrame: document.getElementById('last-frame'),
  messages: document.getElementById('messages'),
};

const form = document.getElementById('settings-form');
const inputs = {
  apiUrl: document.getElementById('api-url'),
  apiToken: document.getElementById('api-token'),
  voiceName: document.getElementById('voice-name'),
  voiceVolume: document.getElementById('voice-volume'),
  voiceRate: document.getElementById('voice-rate'),
  filterTraffic: document.getElementById('filter-traffic'),
  filterFlags: document.getElementById('filter-flags'),
  filterEngine: document.getElementById('filter-engine'),
  filterCoaching: document.getElementById('filter-coaching'),
  hotkeyMute: document.getElementById('hotkey-mute'),
  hotkeyRepeat: document.getElementById('hotkey-repeat'),
  hotkeyFocus: document.getElementById('hotkey-focus'),
  testVoice: document.getElementById('test-voice'),
  mute: document.getElementById('mute'),
  unmute: document.getElementById('unmute'),
  focus: document.getElementById('focus'),
  repeat: document.getElementById('repeat'),
  configPath: document.getElementById('config-path'),
};

async function loadConfig() {
  const config = await window.api.getConfig();
  inputs.apiUrl.value = config.api.url;
  inputs.apiToken.value = config.api.token ?? '';
  inputs.voiceName.value = config.voice.voice ?? '';
  inputs.voiceVolume.value = config.voice.volume;
  inputs.voiceRate.value = config.voice.rate;
  inputs.filterTraffic.checked = config.filters.TRAFFIC;
  inputs.filterFlags.checked = config.filters.FLAGS;
  inputs.filterEngine.checked = config.filters.ENGINE;
  inputs.filterCoaching.checked = config.filters.COACHING;
  inputs.hotkeyMute.value = config.hotkeys.muteToggle;
  inputs.hotkeyRepeat.value = config.hotkeys.repeatLast;
  inputs.hotkeyFocus.value = config.hotkeys.focusMode;

  inputs.configPath.textContent = await window.api.getConfigPath();
}

async function refreshStatus() {
  try {
    const status = await window.api.getStatus();
    statusEls.iracing.textContent = status.iracingStatus;
    statusEls.api.textContent = status.apiStatus;
    statusEls.fps.textContent = status.fps ?? '-';
    statusEls.lastFrame.textContent = status.lastFrameAt
      ? new Date(status.lastFrameAt).toLocaleTimeString()
      : '-';
    statusEls.messages.innerHTML = '';
    (status.recentMessages ?? []).forEach((message) => {
      const li = document.createElement('li');
      li.textContent = message;
      statusEls.messages.appendChild(li);
    });
  } catch {
    statusEls.iracing.textContent = 'disconnected';
    statusEls.api.textContent = 'offline';
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = {
    api: {
      url: inputs.apiUrl.value,
      token: inputs.apiToken.value,
    },
    voice: {
      voice: inputs.voiceName.value || undefined,
      volume: Number(inputs.voiceVolume.value),
      rate: Number(inputs.voiceRate.value),
    },
    filters: {
      TRAFFIC: inputs.filterTraffic.checked,
      FLAGS: inputs.filterFlags.checked,
      ENGINE: inputs.filterEngine.checked,
      COACHING: inputs.filterCoaching.checked,
    },
    hotkeys: {
      muteToggle: inputs.hotkeyMute.value,
      repeatLast: inputs.hotkeyRepeat.value,
      focusMode: inputs.hotkeyFocus.value,
    },
  };

  await window.api.updateConfig(payload);
});

inputs.testVoice.addEventListener('click', async () => {
  await window.api.testVoice('Prueba de voz de SimRacing Coach.');
});

inputs.mute.addEventListener('click', () => window.api.mute());
inputs.unmute.addEventListener('click', () => window.api.unmute());
inputs.focus.addEventListener('click', () => window.api.focus());
inputs.repeat.addEventListener('click', () => window.api.repeat());

loadConfig();
refreshStatus();
setInterval(refreshStatus, 1500);
