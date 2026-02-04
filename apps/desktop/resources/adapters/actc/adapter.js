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

// packages/adapters/actc/dist/actc-adapter.js
var import_dgram = __toESM(require("dgram"), 1);
var import_child_process = require("child_process");
var import_path = __toESM(require("path"), 1);
var import_url = require("url");
var import_meta = {};
var __dirname = import_path.default.dirname((0, import_url.fileURLToPath)(import_meta.url));
var ActcAdapter = class {
  socket;
  lastFrame = null;
  port;
  pythonProcess = null;
  constructor(port = 9302) {
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
        console.error("[ACTC-Adapter] Error parsing UDP:", e);
      }
    });
    this.socket.bind(this.port, () => {
      console.log(`[ACTC-Adapter] Listening on UDP ${this.port}`);
      this.spawnBridge();
    });
  }
  spawnBridge() {
    const scriptPath = import_path.default.resolve(__dirname, "../../python/actc_bridge.py");
    console.log("[ACTC-Adapter] Spawning bridge:", scriptPath);
    this.pythonProcess = (0, import_child_process.spawn)("python", [scriptPath], { stdio: "inherit" });
    this.pythonProcess.on("error", (err) => {
      console.error("[ACTC-Adapter] Failed to spawn python bridge:", err);
    });
  }
  stop() {
    this.socket.close();
    if (this.pythonProcess) {
      this.pythonProcess.kill();
    }
  }
  mapToTelemetryFrame(raw) {
    return {
      t: raw.t || Date.now(),
      sim: "actc",
      // Identified as 'actc' internally
      player: {
        carIdx: 0
      },
      powertrain: {
        speedKph: raw.speed * 3.6,
        // Received in m/s
        rpm: raw.rpm,
        gear: raw.gear,
        throttle: raw.throttle,
        // 0-1
        brake: raw.brake,
        // 0-1 
        clutch: raw.clutch
      },
      physics: {
        steeringAngle: raw.steer,
        lateralG: raw.lateralG,
        longitudinalG: raw.longitudinalG
      },
      temps: {
        tyreC: raw.tyreTemp,
        // [FL, FR, RL, RR]
        waterC: raw.waterTemp,
        oilC: raw.oilTemp
      },
      suspension: {
        shockDeflection: raw.suspensionTravel
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

// apps/adapters/actc/adapter.mjs
var sim = "actc";
function emit(payload) {
  process.stdout.write(`${JSON.stringify(payload)}
`);
}
function log(message) {
  console.error(`[ACTC] ${message}`);
}
log("Starting ACTC adapter...");
emit({ type: "status", state: "waiting", sim, details: "Waiting for connection..." });
var adapter = new ActcAdapter(9302);
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
