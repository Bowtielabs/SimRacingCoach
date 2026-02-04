import { EventEmitter } from 'node:events';
import type { CapabilityMap, TelemetryFrame } from '../../../packages/core/src/types.js';


// Importar irsdk-node dinámicamente para evitar errores si no está disponible
let irsdk: any = null;
try {
  irsdk = require('irsdk-node');
} catch (err) {
  console.warn('irsdk-node not available, adapter will run in mock mode');
}

export interface IracingAdapterOptions {
  debugDump?: boolean;
  onLog?: (message: string) => void;
}

export class IracingAdapter extends EventEmitter {
  private options: IracingAdapterOptions;
  private connected = false;
  private pollIntervalId?: NodeJS.Timeout;
  private lastSessionId?: string;
  private reconnectTimeoutId?: NodeJS.Timeout;

  constructor(options: IracingAdapterOptions = {}) {
    super();
    this.options = options;
  }

  async connect(): Promise<void> {
    if (!irsdk) {
      this.log('irsdk-node not available, running in mock mode');
      this.startMockMode();
      return;
    }

    try {
      this.log('Attempting to connect to iRacing...');

      // Asegurar shutdown previo para evitar múltiples instancias
      try {
        irsdk.shutdown();
      } catch {
        // Ignorar errores si no había nada que cerrar
      }

      // Inicializar SDK
      const result = irsdk.init();

      if (!result) {
        throw new Error('Failed to initialize iRacing SDK');
      }

      // Esperar conexión (con timeout)
      const connected = await this.waitForConnection(5000);

      if (!connected) {
        this.log('iRacing not running or no active session');
        this.scheduleReconnect();
        return;
      }

      this.connected = true;
      this.emit('connected');
      this.log('Connected to iRacing');

      // Detectar capacidades
      this.detectCapabilities();

      // Iniciar polling de telemetría
      this.startPolling();

    } catch (error) {
      this.log(`Failed to connect: ${error}`);
      this.scheduleReconnect();
      throw error;
    }
  }

  disconnect(): void {
    this.connected = false;

    if (this.pollIntervalId) {
      clearInterval(this.pollIntervalId);
      this.pollIntervalId = undefined;
    }

    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = undefined;
    }

    if (irsdk) {
      try {
        irsdk.shutdown();
      } catch (err) {
        this.log(`Error during shutdown: ${err}`);
      }
    }

    this.emit('disconnected');
    this.log('Disconnected from iRacing');
  }

  private async waitForConnection(timeoutMs: number): Promise<boolean> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (irsdk.waitForConnection()) {
          clearInterval(checkInterval);
          resolve(true);
        } else if (Date.now() - startTime > timeoutMs) {
          clearInterval(checkInterval);
          resolve(false);
        }
      }, 100);
    });
  }

  private detectCapabilities(): void {
    const caps: CapabilityMap = {
      hasCarLeftRight: this.hasVar('CarLeftRight'),
      hasSessionFlags: this.hasVar('SessionFlags'),
      hasWaterTemp: this.hasVar('WaterTemp'),
      hasOilTemp: this.hasVar('OilTemp'),
      hasFuelLevel: this.hasVar('FuelLevel'),
      hasEngineWarnings: this.hasVar('EngineWarnings'),
      hasTyreTemps: this.hasVar('LFtempCL'),
      hasBrakeTemps: this.hasVar('LFbrakeLinePress'),
      hasSteeringAngle: this.hasVar('SteeringWheelAngle'),
      hasLateralG: this.hasVar('LatAccel'),
    };

    this.emit('capabilities', caps);
    this.log(`Capabilities detected: ${JSON.stringify(caps)}`);
  }

  private hasVar(varName: string): boolean {
    try {
      const value = irsdk.getTelemetryValue(varName);
      return value !== undefined && value !== null;
    } catch {
      return false;
    }
  }

  private startPolling(): void {
    const pollRate = 60; // 60 Hz
    const intervalMs = Math.floor(1000 / pollRate);

    this.pollIntervalId = setInterval(() => {
      if (!this.connected) {
        return;
      }

      try {
        // Intentar leer una variable simple para verificar conectividad
        // (evitamos waitForConnection() en cada poll - puede causar crashes)
        const testValue = this.getVar('IsOnTrack');
        if (testValue === undefined || testValue === null) {
          // Posiblemente desconectado, verificar con un método más seguro
          try {
            if (!irsdk.waitForConnection()) {
              this.log('Lost connection to iRacing');
              this.disconnect();
              this.scheduleReconnect();
              return;
            }
          } catch (err) {
            this.log(`Connection check failed: ${err}`);
            this.disconnect();
            this.scheduleReconnect();
            return;
          }
        }

        // Leer session ID
        const sessionId = this.getSessionId();
        if (sessionId && sessionId !== this.lastSessionId) {
          this.lastSessionId = sessionId;
          this.emit('session', sessionId);
          this.log(`New session detected: ${sessionId}`);
        }

        // Construir frame de telemetría COMPLETO
        const frame = this.buildTelemetryFrame();

        if (this.options.debugDump) {
          this.log(`Frame: ${JSON.stringify(frame)}`);
        }

        this.emit('telemetry', frame);

      } catch (error) {
        this.log(`Error reading telemetry: ${error}`);
        this.disconnect();
        this.scheduleReconnect();
      }
    }, intervalMs);
  }

  private buildTelemetryFrame(): TelemetryFrame {
    const now = Date.now();
    const playerIdx = this.getVar('PlayerCarIdx') ?? 0;

    return {
      t: now,
      sim: 'iracing',
      sessionId: this.lastSessionId,

      // Player info
      player: {
        carIdx: playerIdx,
        position: this.getVar('PlayerCarPosition'),
        classPosition: this.getVar('PlayerCarClassPosition'),
      },

      // Traffic awareness
      traffic: {
        carLeftRight: this.getVar('CarLeftRight'),
        carAhead: this.getVar('CarDistAhead'),
        carBehind: this.getVar('CarDistBehind'),
      },

      // Session flags
      flags: {
        sessionFlags: this.getVar('SessionFlags'),
      },

      // Powertrain - pedals, engine, transmission
      powertrain: {
        speedKph: (this.getVar('Speed') ?? 0) * 3.6, // m/s to km/h
        rpm: this.getVar('RPM'),
        gear: this.getVar('Gear'),
        throttle: this.getVar('Throttle'),
        brake: this.getVar('Brake'),
        clutch: this.getVar('Clutch'),
        shiftLightFirstRpm: this.getVar('PlayerCarSLFirstRPM'),
        shiftLightShiftRpm: this.getVar('PlayerCarSLShiftRPM'),
        shiftLightLastRpm: this.getVar('PlayerCarSLLastRPM'),
        shiftLightBlinkRpm: this.getVar('PlayerCarSLBlinkRPM'),
      },

      // Temperatures
      temps: {
        waterC: this.getVar('WaterTemp'),
        oilC: this.getVar('OilTemp'),
        trackC: this.getVar('TrackTempCrew'),
        airC: this.getVar('AirTemp'),
        // Tyre temps - promedio de izquierda, centro, derecha para cada rueda
        tyreC: [
          this.avgTemp('LFtempCL', 'LFtempCM', 'LFtempCR'),
          this.avgTemp('RFtempCL', 'RFtempCM', 'RFtempCR'),
          this.avgTemp('LRtempCL', 'LRtempCM', 'LRtempCR'),
          this.avgTemp('RRtempCL', 'RRtempCM', 'RRtempCR'),
        ],
        // Tyre temps detallados (left, middle, right de cada rueda)
        tyreTempLF: [this.getVar('LFtempCL'), this.getVar('LFtempCM'), this.getVar('LFtempCR')],
        tyreTempRF: [this.getVar('RFtempCL'), this.getVar('RFtempCM'), this.getVar('RFtempCR')],
        tyreTempLR: [this.getVar('LRtempCL'), this.getVar('LRtempCM'), this.getVar('LRtempCR')],
        tyreTempRR: [this.getVar('RRtempCL'), this.getVar('RRtempCM'), this.getVar('RRtempCR')],
        // Brake line pressure (bar) - representa calor indirecto
        brakeC: [
          this.getVar('LFbrakeLinePress'),
          this.getVar('RFbrakeLinePress'),
          this.getVar('LRbrakeLinePress'),
          this.getVar('RRbrakeLinePress'),
        ],
      },

      // Tyre wear (0-100% remaining)
      tyreWear: {
        LF: [this.getVar('LFwearL'), this.getVar('LFwearM'), this.getVar('LFwearR')],
        RF: [this.getVar('RFwearL'), this.getVar('RFwearM'), this.getVar('RFwearR')],
        LR: [this.getVar('LRwearL'), this.getVar('LRwearM'), this.getVar('LRwearR')],
        RR: [this.getVar('RRwearL'), this.getVar('RRwearM'), this.getVar('RRwearR')],
      },

      // Tyre cold pressure (kPa)
      tyrePressure: {
        LF: this.getVar('LFcoldPressure'),
        RF: this.getVar('RFcoldPressure'),
        LR: this.getVar('LRcoldPressure'),
        RR: this.getVar('RRcoldPressure'),
      },

      // Fuel
      fuel: {
        level: this.getVar('FuelLevel'),           // Liters remaining
        levelPct: this.getVar('FuelLevelPct'),     // Percent remaining (0-1)
        usePerHour: this.getVar('FuelUsePerHour'), // kg/h consumption
        pressure: this.getVar('FuelPress'),        // bar
      },

      // Physics / dynamics
      physics: {
        steeringAngle: this.getVar('SteeringWheelAngle'),  // radians
        steeringAngleMax: this.getVar('SteeringWheelAngleMax'),
        lateralG: this.getVar('LatAccel'),         // m/s^2
        longitudinalG: this.getVar('LongAccel'),   // m/s^2
        verticalG: this.getVar('VertAccel'),       // m/s^2
        yaw: this.getVar('Yaw'),                   // radians
        pitch: this.getVar('Pitch'),               // radians
        roll: this.getVar('Roll'),                 // radians
        yawRate: this.getVar('YawRate'),           // rad/s
        pitchRate: this.getVar('PitchRate'),       // rad/s
        rollRate: this.getVar('RollRate'),         // rad/s
        velocityX: this.getVar('VelocityX'),       // m/s
        velocityY: this.getVar('VelocityY'),       // m/s
        velocityZ: this.getVar('VelocityZ'),       // m/s
      },

      // Session info
      session: {
        onPitRoad: this.getVar('OnPitRoad'),
        inGarage: this.getVar('IsInGarage'),
        isOnTrack: this.getVar('IsOnTrack'),
        incidents: this.getVar('PlayerCarMyIncidentCount'),
        teamIncidents: this.getVar('PlayerCarTeamIncidentCount'),
        lap: this.getVar('Lap'),
        lapsCompleted: this.getVar('LapCompleted'),
        lapDistPct: this.getVar('LapDistPct'),     // % around lap
        lapDist: this.getVar('LapDist'),           // meters from S/F
        sessionTime: this.getVar('SessionTime'),
        sessionTimeRemain: this.getVar('SessionTimeRemain'),
        sessionLapsRemain: this.getVar('SessionLapsRemainEx'),
        sessionState: this.getVar('SessionState'),
        pitstopActive: this.getVar('PitstopActive'),
        pitRepairLeft: this.getVar('PitRepairLeft'),
      },

      // Lap times
      lapTimes: {
        best: this.getVar('LapBestLapTime'),
        last: this.getVar('LapLastLapTime'),
        current: this.getVar('LapCurrentLapTime'),
        deltaToBest: this.getVar('LapDeltaToBestLap'),
        deltaToOptimal: this.getVar('LapDeltaToOptimalLap'),
        deltaToSessionBest: this.getVar('LapDeltaToSessionBestLap'),
        bestLapNum: this.getVar('LapBestLap'),
      },

      // Weather
      weather: {
        trackTemp: this.getVar('TrackTempCrew'),
        airTemp: this.getVar('AirTemp'),
        trackWetness: this.getVar('TrackWetness'),
        precipitation: this.getVar('Precipitation'),
        humidity: this.getVar('RelativeHumidity'),
        windSpeed: (this.getVar('WindVel') ?? 0) * 3.6, // m/s to km/h
        windDir: this.getVar('WindDir'),           // radians
        skies: this.getVar('Skies'),               // 0=clear, 1=partial, 2=mostly, 3=overcast
        fogLevel: this.getVar('FogLevel'),
        declaredWet: this.getVar('WeatherDeclaredWet'),
      },

      // Car controls / settings
      carControls: {
        brakeBias: this.getVar('dcBrakeBias'),
        absLevel: this.getVar('dcABS'),
        tcLevel: this.getVar('dcTractionControl'),
        absActive: this.getVar('BrakeABSactive'),
      },

      // Engine
      engine: {
        oilTemp: this.getVar('OilTemp'),
        oilPressure: this.getVar('OilPress'),
        oilLevel: this.getVar('OilLevel'),
        waterTemp: this.getVar('WaterTemp'),
        waterLevel: this.getVar('WaterLevel'),
        voltage: this.getVar('Voltage'),
        manifoldPressure: this.getVar('ManifoldPress'),
      },

      // Suspension & Aero (Phase 5)
      suspension: {
        rideHeight: [
          this.getVar('LFrideHeight'),
          this.getVar('RFrideHeight'),
          this.getVar('LRrideHeight'),
          this.getVar('RRrideHeight')
        ],
        shockDeflection: [
          this.getVar('LFshockDefl'),
          this.getVar('RFshockDefl'),
          this.getVar('LRshockDefl'),
          this.getVar('RRshockDefl')
        ],
        shockVelocity: [
          this.getVar('LFshockVel'),
          this.getVar('RFshockVel'),
          this.getVar('LRshockVel'),
          this.getVar('RRshockVel')
        ],
      },

      aero: {
        frontRideHeight: this.avgTemp('LFrideHeight', 'LFrideHeight', 'RFrideHeight'), // Avg Front using existing helper hack
        rearRideHeight: this.avgTemp('LRrideHeight', 'LRrideHeight', 'RRrideHeight'), // Avg Rear
        // Rake calculated on the fly or by rules engine. Here we just map raw values.
        // We can pre-calculate rake if helpful, but let's stick to raw data mapping.
      },

      engineWarnings: this.getVar('EngineWarnings'),

      // Tire compound
      tireCompound: this.getVar('PlayerTireCompound'),

      // Raw inputs (pre-processing)
      rawInputs: {
        throttle: this.getVar('ThrottleRaw'),
        brake: this.getVar('BrakeRaw'),
        clutch: this.getVar('ClutchRaw'),
        handbrake: this.getVar('HandbrakeRaw'),
      },

      // Pit service configuration
      pitService: {
        flags: this.getVar('PitSvFlags'),
        fuelAdd: this.getVar('PitSvFuel'),
        tireCompound: this.getVar('PitSvTireCompound'),
        lfPressure: this.getVar('PitSvLFP'),
        rfPressure: this.getVar('PitSvRFP'),
        lrPressure: this.getVar('PitSvLRP'),
        rrPressure: this.getVar('PitSvRRP'),
        fastRepairUsed: this.getVar('FastRepairUsed'),
        fastRepairAvailable: this.getVar('FastRepairAvailable'),
        pitOptRepairLeft: this.getVar('PitOptRepairLeft'),
      },

      // Tire odometer (distance traveled per tire)
      tyreOdometer: {
        LF: this.getVar('LFodometer'),
        RF: this.getVar('RFodometer'),
        LR: this.getVar('LRodometer'),
        RR: this.getVar('RRodometer'),
      },

      // Tire sets usage
      tireSets: {
        lfUsed: this.getVar('LFTiresUsed'),
        rfUsed: this.getVar('RFTiresUsed'),
        lrUsed: this.getVar('LRTiresUsed'),
        rrUsed: this.getVar('RRTiresUsed'),
        lfAvailable: this.getVar('LFTiresAvailable'),
        rfAvailable: this.getVar('RFTiresAvailable'),
        lrAvailable: this.getVar('LRTiresAvailable'),
        rrAvailable: this.getVar('RRTiresAvailable'),
        setsUsed: this.getVar('TireSetsUsed'),
        setsAvailable: this.getVar('TireSetsAvailable'),
      },

      // Force feedback
      ffb: {
        torque: this.getVar('SteeringWheelTorque'),
        pctTorque: this.getVar('SteeringWheelPctTorque'),
        pctIntensity: this.getVar('SteeringWheelPctIntensity'),
        pctSmoothing: this.getVar('SteeringWheelPctSmoothing'),
        pctDamper: this.getVar('SteeringWheelPctDamper'),
        limiter: this.getVar('SteeringWheelLimiter'),
        maxForceNm: this.getVar('SteeringWheelMaxForceNm'),
        peakForceNm: this.getVar('SteeringWheelPeakForceNm'),
        enabled: this.getVar('SteeringFFBEnabled'),
      },

      // Shift light and gear shifting
      shifting: {
        shiftIndicatorPct: this.getVar('ShiftIndicatorPct'),
        shiftPowerPct: this.getVar('ShiftPowerPct'),
        shiftGrindRPM: this.getVar('ShiftGrindRPM'),
      },

      // Rumble strip contact
      rumbleStrip: {
        LF: this.getVar('TireLF_RumblePitch'),
        RF: this.getVar('TireRF_RumblePitch'),
        LR: this.getVar('TireLR_RumblePitch'),
        RR: this.getVar('TireRR_RumblePitch'),
      },

      // Push to pass / DRS
      p2p: {
        status: this.getVar('P2P_Status'),
        count: this.getVar('P2P_Count'),
      },

      // Camera
      camera: {
        carIdx: this.getVar('CamCarIdx'),
        cameraNumber: this.getVar('CamCameraNumber'),
        groupNumber: this.getVar('CamGroupNumber'),
        state: this.getVar('CamCameraState'),
      },

      // Replay
      replay: {
        playing: this.getVar('IsReplayPlaying'),
        frameNum: this.getVar('ReplayFrameNum'),
        frameNumEnd: this.getVar('ReplayFrameNumEnd'),
        playSpeed: this.getVar('ReplayPlaySpeed'),
        slowMotion: this.getVar('ReplayPlaySlowMotion'),
        sessionTime: this.getVar('ReplaySessionTime'),
        sessionNum: this.getVar('ReplaySessionNum'),
      },

      // System performance
      systemPerf: {
        frameRate: this.getVar('FrameRate'),
        cpuUsageFG: this.getVar('CpuUsageFG'),
        cpuUsageBG: this.getVar('CpuUsageBG'),
        gpuUsage: this.getVar('GpuUsage'),
        diskLoggingEnabled: this.getVar('IsDiskLoggingEnabled'),
        diskLoggingActive: this.getVar('IsDiskLoggingActive'),
      },

      // Network
      network: {
        latency: this.getVar('ChanLatency'),
        avgLatency: this.getVar('ChanAvgLatency'),
        quality: this.getVar('ChanQuality'),
        partnerQuality: this.getVar('ChanPartnerQuality'),
        clockSkew: this.getVar('ChanClockSkew'),
      },

      // Session extended
      sessionExt: {
        sessionNum: this.getVar('SessionNum'),
        sessionUniqueID: this.getVar('SessionUniqueID'),
        sessionTick: this.getVar('SessionTick'),
        sessionTimeTotal: this.getVar('SessionTimeTotal'),
        sessionLapsTotal: this.getVar('SessionLapsTotal'),
        sessionTimeOfDay: this.getVar('SessionTimeOfDay'),
        paceMode: this.getVar('PaceMode'),
        pitsOpen: this.getVar('PitsOpen'),
        isOnTrackCar: this.getVar('IsOnTrackCar'),
        isGarageVisible: this.getVar('IsGarageVisible'),
        displayUnits: this.getVar('DisplayUnits'),
        playerIncidents: this.getVar('PlayerIncidents'),
      },

      // Player car extended
      playerCarExt: {
        class: this.getVar('PlayerCarClass'),
        trackSurface: this.getVar('PlayerTrackSurface'),
        trackSurfaceMaterial: this.getVar('PlayerTrackSurfaceMaterial'),
        weightPenalty: this.getVar('PlayerCarWeightPenalty'),
        powerAdjust: this.getVar('PlayerCarPowerAdjust'),
        dryTireSetLimit: this.getVar('PlayerCarDryTireSetLimit'),
        towTime: this.getVar('PlayerCarTowTime'),
        inPitStall: this.getVar('PlayerCarInPitStall'),
        pitSvStatus: this.getVar('PlayerCarPitSvStatus'),
        driverIncidentCount: this.getVar('PlayerCarDriverIncidentCount'),
        fastRepairsUsed: this.getVar('PlayerFastRepairsUsed'),
      },

      // All delta lap times
      lapDeltas: {
        deltaToBest: this.getVar('LapDeltaToBestLap'),
        deltaToBestOK: this.getVar('LapDeltaToBestLap_OK'),
        deltaToBestDD: this.getVar('LapDeltaToBestLap_DD'),
        deltaToOptimal: this.getVar('LapDeltaToOptimalLap'),
        deltaToOptimalOK: this.getVar('LapDeltaToOptimalLap_OK'),
        deltaToSessionBest: this.getVar('LapDeltaToSessionBestLap'),
        deltaToSessionBestOK: this.getVar('LapDeltaToSessionBestLap_OK'),
        deltaToSessionOptimal: this.getVar('LapDeltaToSessionOptimalLap'),
        deltaToSessionOptimalOK: this.getVar('LapDeltaToSessionOptimalLap_OK'),
        deltaToSessionLast: this.getVar('LapDeltaToSessionLastlLap'),
        deltaToSessionLastOK: this.getVar('LapDeltaToSessionLastlLap_OK'),
        lastNLapTime: this.getVar('LapLastNLapTime'),
        bestNLapTime: this.getVar('LapBestNLapTime'),
        bestNLapLap: this.getVar('LapBestNLapLap'),
        lastNLapSeq: this.getVar('LapLasNLapSeq'),
        raceLaps: this.getVar('RaceLaps'),
      },

      // In-car adjustments
      inCarAdjustments: {
        dashPage: this.getVar('dcDashPage'),
        powerSteering: this.getVar('dcPowerSteering'),
        throttleShape: this.getVar('dcThrottleShape'),
        starter: this.getVar('dcStarter'),
        pitSpeedLimiter: this.getVar('dcPitSpeedLimiterToggle'),
        tcToggle: this.getVar('dcTractionControlToggle'),
        headlightFlash: this.getVar('dcHeadlightFlash'),
        lowFuelAccept: this.getVar('dcLowFuelAccept'),
        windshieldWipers: this.getVar('dcToggleWindshieldWipers'),
      },

      // Pitstop requests
      pitRequests: {
        rfTireChange: this.getVar('dpRFTireChange'),
        lfTireChange: this.getVar('dpLFTireChange'),
        rrTireChange: this.getVar('dpRRTireChange'),
        lrTireChange: this.getVar('dpLRTireChange'),
        fuelFill: this.getVar('dpFuelFill'),
        fuelAutoFillEnabled: this.getVar('dpFuelAutoFillEnabled'),
        fuelAutoFillActive: this.getVar('dpFuelAutoFillActive'),
        windshieldTearoff: this.getVar('dpWindshieldTearoff'),
        fuelAddKg: this.getVar('dpFuelAddKg'),
        fastRepair: this.getVar('dpFastRepair'),
        lfTireColdPress: this.getVar('dpLFTireColdPress'),
        rfTireColdPress: this.getVar('dpRFTireColdPress'),
        lrTireColdPress: this.getVar('dpLRTireColdPress'),
        rrTireColdPress: this.getVar('dpRRTireColdPress'),
      },

      // Orientation extended
      orientation: {
        yawNorth: this.getVar('YawNorth'),
        enterExitReset: this.getVar('EnterExitReset'),
      },

      // Radio
      radio: {
        transmitCarIdx: this.getVar('RadioTransmitCarIdx'),
        transmitRadioIdx: this.getVar('RadioTransmitRadioIdx'),
        transmitFrequencyIdx: this.getVar('RadioTransmitFrequencyIdx'),
        driverMarker: this.getVar('DriverMarker'),
        pushToTalk: this.getVar('PushToTalk'),
      },

      // Hybrid / boost
      hybrid: {
        manualBoost: this.getVar('ManualBoost'),
        manualNoBoost: this.getVar('ManualNoBoost'),
        pushToPass: this.getVar('PushToPass'),
      },

      // Video capture
      videoCapture: {
        enabled: this.getVar('VidCapEnabled'),
        active: this.getVar('VidCapActive'),
      },

      // Joker laps
      jokerLaps: {
        remain: this.getVar('SessionJokerLapsRemain'),
        onJokerLap: this.getVar('SessionOnJokerLap'),
      },

      // ============================================
      // CarIdx arrays - DATA FOR ALL 64 CARS IN SESSION
      // ============================================
      allCars: {
        // Lap info per car (array of 64)
        lap: this.getVar('CarIdxLap'),                      // Laps started by car
        lapCompleted: this.getVar('CarIdxLapCompleted'),    // Laps completed by car
        lapDistPct: this.getVar('CarIdxLapDistPct'),        // % around lap per car

        // Position per car
        position: this.getVar('CarIdxPosition'),            // Race position
        classPosition: this.getVar('CarIdxClassPosition'),  // Class position
        class: this.getVar('CarIdxClass'),                  // Car class ID

        // Timing per car
        bestLapTime: this.getVar('CarIdxBestLapTime'),      // Best lap time
        lastLapTime: this.getVar('CarIdxLastLapTime'),      // Last lap time
        bestLapNum: this.getVar('CarIdxBestLapNum'),        // Best lap number
        f2Time: this.getVar('CarIdxF2Time'),                // Time behind leader
        estTime: this.getVar('CarIdxEstTime'),              // Estimated time to current location

        // Track surface per car
        trackSurface: this.getVar('CarIdxTrackSurface'),           // Track surface type
        trackSurfaceMaterial: this.getVar('CarIdxTrackSurfaceMaterial'), // Surface material
        onPitRoad: this.getVar('CarIdxOnPitRoad'),                 // On pit road?

        // Car state per car
        steer: this.getVar('CarIdxSteer'),                  // Steering angle (rad)
        rpm: this.getVar('CarIdxRPM'),                      // Engine RPM
        gear: this.getVar('CarIdxGear'),                    // Current gear

        // Tire compound per car
        tireCompound: this.getVar('CarIdxTireCompound'),    // Current tire compound
        qualTireCompound: this.getVar('CarIdxQualTireCompound'),        // Qual tire compound
        qualTireCompoundLocked: this.getVar('CarIdxQualTireCompoundLocked'), // Qual compound locked?

        // Flags & repairs per car
        sessionFlags: this.getVar('CarIdxSessionFlags'),    // Session flags per car
        fastRepairsUsed: this.getVar('CarIdxFastRepairsUsed'), // Fast repairs used

        // Pacing per car
        paceLine: this.getVar('CarIdxPaceLine'),            // Pace line (-1 if not pacing)
        paceRow: this.getVar('CarIdxPaceRow'),              // Pace row (-1 if not pacing)
        paceFlags: this.getVar('CarIdxPaceFlags'),          // Pace flags

        // Push to pass per car
        p2pStatus: this.getVar('CarIdxP2P_Status'),         // P2P active?
        p2pCount: this.getVar('CarIdxP2P_Count'),           // P2P count
      },
    };
  }

  // Helper para calcular promedio de temperaturas
  private avgTemp(left: string, mid: string, right: string): number | undefined {
    const l = this.getVar(left);
    const m = this.getVar(mid);
    const r = this.getVar(right);
    if (l === undefined && m === undefined && r === undefined) return undefined;
    const vals = [l, m, r].filter(v => v !== undefined) as number[];
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : undefined;
  }

  private getVar(varName: string): any {
    try {
      return irsdk.getTelemetryValue(varName);
    } catch {
      return undefined;
    }
  }

  private getSessionId(): string | undefined {
    try {
      const sessionNum = irsdk.getTelemetryValue('SessionNum');
      const sessionTime = irsdk.getTelemetryValue('SessionTime');

      if (sessionNum !== undefined && sessionTime !== undefined) {
        return `session-${sessionNum}-${Math.floor(sessionTime / 100)}`;
      }
    } catch {
      return undefined;
    }
    return undefined;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeoutId) {
      return; // Ya hay un reconnect programado
    }

    this.log('Scheduling reconnect in 5 seconds...');
    this.reconnectTimeoutId = setTimeout(() => {
      this.reconnectTimeoutId = undefined;
      this.connect().catch((err) => {
        this.log(`Reconnect failed: ${err}`);
      });
    }, 5000);
  }

  private startMockMode(): void {
    this.log('Starting in MOCK mode - no real telemetry');
    this.connected = true;
    this.emit('connected');

    const mockCaps: CapabilityMap = {
      hasCarLeftRight: true,
      hasSessionFlags: true,
      hasWaterTemp: true,
      hasOilTemp: true,
      hasFuelLevel: false,
      hasEngineWarnings: false,
      hasTyreTemps: false,
      hasBrakeTemps: false,
      hasSteeringAngle: false,
      hasLateralG: false,
    };

    this.emit('capabilities', mockCaps);

    // Emitir frames mock muy básicos
    this.pollIntervalId = setInterval(() => {
      const frame: TelemetryFrame = {
        t: Date.now(),
        sim: 'iracing',
        sessionId: 'mock-session',
        player: { carIdx: 0 },
        traffic: { carLeftRight: undefined },
        flags: { sessionFlags: undefined },
        powertrain: {},
        temps: {},
      };

      this.emit('telemetry', frame);
    }, 1000);
  }

  private log(message: string): void {
    if (this.options.onLog) {
      this.options.onLog(message);
    }
  }
}
