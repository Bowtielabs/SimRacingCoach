import { IRacingAdapter } from "../../packages/adapters/iracing/src/iracingAdapter";
import { LocalEngine } from "../../packages/core/src/localEngine";
import { SpeechQueue } from "../../packages/speech/src/speechQueue";

async function speakTTS(text: string) {
  console.log("[TTS]", text);
}

const sessionId = crypto.randomUUID();

const adapter = new IRacingAdapter({ telemetryHz: 60, sessionId });
const engine = new LocalEngine();
const speech = new SpeechQueue();

adapter.on("status", (s) => console.log("iRacing status:", s));
adapter.on("capabilities", (c) => console.log("Capabilities:", c));

adapter.on("frame", (frame) => {
  const events = engine.onFrame(frame);
  for (const ev of events) speech.enqueue(ev);
});

setInterval(() => {
  speech.tick(speakTTS).catch(console.error);
}, 50);

adapter.start();
