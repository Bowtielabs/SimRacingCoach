var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// packages/adapters/ams2/dist/ams2-adapter.js
var import_dgram = __toESM(require("dgram"), 1);
var import_child_process = require("child_process");
var import_path = __toESM(require("path"), 1);
var import_url = require("url");
var import_meta = {};
var __dirname = import_path.default.dirname((0, import_url.fileURLToPath)(import_meta.url));
var Ams2Adapter = class {
  socket;
  lastFrame = null;
  port;
  pythonProcess = null;
  constructor(port = 9301) {
    this.port = port;
    this.socket = import_dgram.default.createSocket("udp4");
  }
  start(onData) {
    this.socket.on("message", (msg) => {
      try {
        const raw = JSON.parse(msg.toString());
        const frame = this.mapToTelemetryFrame(raw);
        if (frame) {
          this.lastFrame = frame;
          onData(frame);
        }
      } catch (e) {
        console.error("[AMS2-Adapter] Error parsing UDP:", e);
      }
    });
    this.socket.bind(this.port, () => {
      console.log(`[AMS2-Adapter] Listening on UDP ${this.port}`);
      this.spawnBridge();
    });
  }
  spawnBridge() {
    const scriptPath = import_path.default.resolve(__dirname, "../../python/ams2_bridge.py");
    console.log("[AMS2-Adapter] Spawning bridge:", scriptPath);
    this.pythonProcess = (0, import_child_process.spawn)("python", [scriptPath], { stdio: "inherit" });
    this.pythonProcess.on("error", (err) => {
      console.error("[AMS2-Adapter] Failed to spawn python bridge:", err);
    });
  }
  stop() {
    this.socket.close();
    if (this.pythonProcess) {
      this.pythonProcess.kill();
    }
  }
  mapToTelemetryFrame(raw) {
    if (!raw.physics)
      return null;
    return {
      t: Date.now(),
      sim: "automobilista2",
      player: {
        carIdx: 0
      },
      powertrain: {
        speedKph: raw.physics.speedKph,
        rpm: raw.physics.rpm,
        gear: raw.physics.gear,
        throttle: raw.physics.gas,
        brake: raw.physics.brake,
        clutch: raw.physics.clutch
      },
      physics: {
        steeringAngle: raw.physics.steerAngle,
        lateralG: raw.physics.accG?.[0] || 0,
        longitudinalG: raw.physics.accG?.[2] || 0
      },
      temps: {
        tyreC: raw.physics.tyreTemp,
        // [FL, FR, RL, RR]
        brakeC: []
        // Not yet mapped
      },
      suspension: {
        shockDeflection: raw.physics.suspensionTravel
      },
      traffic: {
        carLeftRight: 0
        // Placeholder
      },
      flags: {
        sessionFlags: 0
        // Placeholder
      }
    };
  }
};

// apps/adapters/ams2/adapter.mjs
var sim = "ams2";
function emit(payload) {
  process.stdout.write(`${JSON.stringify(payload)}
`);
}
function log(message) {
  console.error(`[AMS2] ${message}`);
}
log("Starting AMS2 adapter...");
emit({ type: "status", state: "waiting", sim, details: "Waiting for connection..." });
var adapter = new Ams2Adapter(9301);
adapter.start((frame) => {
  const data = {
    speed_mps: (frame.powertrain?.speedKph || 0) / 3.6,
    rpm: frame.powertrain?.rpm,
    gear: frame.powertrain?.gear,
    throttle_pct: (frame.powertrain?.throttle || 0) * 100,
    brake_pct: (frame.powertrain?.brake || 0) * 100,
    clutch_pct: (frame.powertrain?.clutch || 0) * 100,
    steering_rad: frame.physics?.steeringAngle || 0,
    // Pass through complex objects for Service v2 logic
    physics: frame.physics,
    suspension: frame.suspension,
    // Basic flags
    on_pit_road: 0,
    is_on_track: 1
  };
  emit({ type: "frame", sim, ts: frame.t, data });
});
process.on("SIGINT", () => {
  adapter.stop();
  process.exit(0);
});
