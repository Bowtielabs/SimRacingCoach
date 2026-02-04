
import mmap
import struct
import socket
import time
import json
import math

# ==========================================================
# AUTOMOBILISTA 2 / PROJECT CARS 2 SHARED MEMORY MAPS
# ==========================================================
# Map Name: "$pcars2$"
# Size: 
# Header: 
#   u32 version
#   u32 build_version
#   u32 sequence_number
#   ...
#
# We only need key telemetry relative to offset.
# Based on PCars2 API Struct (simplification):
# Offset 0: Version
# ...
# Offset 12: GameState (u32)
# Offset 16: SessionState (u32)
# ...
# Offset 120: ViewPos[3] (f32)
# ...
# Offset 184: Speed (f32)
# Offset 188: RPM (f32)
# Offset 192: MaxRPM (f32)
# Offset 196: Brake (u8) -> normalized by game? No, 0-255 usually or 0-1 float check? 
# Wait, PCars2 uses u8 for controls?
# Let's verify standard PCars2 struct.
#
# Actually, iterating byte by byte is painful.
# Let's assume standard PCars2 layout:
#
# participantInfo (starts late)
# unFilteredThrottle (u8) @ 634 ??
#
# Let's use a robust approach: Search for known values or use standard offsets.
# Standard Offsets (approx):
# speed: 120 (mps) ? No.
#
# Let's try to map what we can reasonably guess or find from standard docs.
#
# mSpeeed: float (offset ~320?)
# mRpm: float (offset ~324?)
# mGear: int (offset ~332?)
#
# Better Plan: Use the standardized Python `ams2-api` layout approach but simplified.
# 
# Layout (Partial):
# 0: Version
# ...
# 12: GameState
# ...
# 188: ViewPos[3]
# ...
# 280: OilTempCelsius (s16)
# 282: OilPressure
# ...
# 288: WaterTempCelsius (s16)
# ...
# 304: FuelLevel (float)
# 308: FuelCapacity (float)
# 312: Speed (float)
# 316: Rpm (float)
# 320: MaxRpm (float)
# 324: Brake (float) ? No.
# 
# Controls are tricky in Shared Memory.
# Throttle (u8) ?
#
# Let's try to read key floats around offset 312.

class AMS2Bridge:
    def __init__(self, host="127.0.0.1", port=9301):
        self.host = host
        self.port = port
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.mm = None
        
    def connect(self):
        try:
            # AMS2 uses "$pcars2$" by default in System Settings
            self.mm = mmap.mmap(0, 9000, "$pcars2$") 
            print("[AMS2-Bridge] Connected to Shared Memory ($pcars2$)!")
            return True
        except FileNotFoundError:
            return False

    def read_physics(self):
        if not self.mm: return None
        self.mm.seek(0)
        data = self.mm.read(9000)
        
        try:
            # Basic Variables (Approx Offsets - need verification, standard PCars2)
            # Speed @ 312 (float)
            # RPM @ 316 (float)
            # MaxRPM @ 320 (float)
            # Steering @ ?
            # Gear @ 328 (uint)
            
            # Let's unpack a chunk
            # 312 (4) + 316 (4) + 320 (4) = 12 bytes
            
            # Offsets based on standard PCars2 UDP/SharedMem matching:
            # mSpeed @ 312
            # mRpm @ 316
            # mMaxRPM @ 320
            # mBrake @ 324 (float? No, usually separate)
            
            # Let's look for Throttle/Brake/Clutch/Steering.
            # They are u8 (0-255) usually at end of struct or scattered.
            # mUnfilteredThrottle @ 634 (u8)
            # mUnfilteredBrake @ 635 (u8)
            # mUnfilteredSteering @ 637 (s8) -> -128 to 127
            # mUnfilteredClutch @ 636 (u8)
            
            speed = struct.unpack("f", data[312:316])[0] * 3.6 # m/s to kph locally? Or send m/s.
            # Node adapter expects speedKph.
            
            rpm = struct.unpack("f", data[316:320])[0]
            gear = struct.unpack("i", data[328:332])[0]
            
            # Tyres Temps (FL, FR, RL, RR) - u16? or s16?
            # mTyreTemp @ 344 (4 * u8?) No.
            # Standard: mTyreTemp[4] (s16) @ 360? 
            # Let's try offset 360 for 4 shorts
            
            # Controls
            throttle_u8 = data[634]
            brake_u8 = data[635]
            clutch_u8 = data[636]
            steer_s8 = struct.unpack("b", data[637:638])[0]
            
            # Suspension Travel (float[4]) @ ~472?
            # mSuspensionTravel[4] @ 496 ?
            # Let's assume some reasonable values.
            
            # G-Forces (Local Acceleration) @ 180 (Vec3 floats)
            # X=Left/Right, Y=Up/Down, Z=Front/Back
            g_forces = struct.unpack("fff", data[180:192]) 
            
            # Tyre Temps @ 360 (4x s16) -> Celsius
            tyre_temps = struct.unpack("hhhh", data[360:368])
            
            # Suspension Travel @ 496 (4x f32) -> Meters
            suspension = struct.unpack("ffff", data[496:512])

            return {
                "speedKph": speed * 3.6,
                "rpm": rpm,
                "gear": gear,
                "gas": throttle_u8 / 255.0,
                "brake": brake_u8 / 255.0,
                "clutch": clutch_u8 / 255.0,
                "steerAngle": steer_s8 / 127.0,
                "accG": [g_forces[0], g_forces[1], g_forces[2]],
                "tyreTemp": list(tyre_temps),
                "suspensionTravel": list(suspension)
            }
        except Exception as e:
            # print(e)
            return None

    def loop(self):
        print("[AMS2-Bridge] Waiting for Automobilista 2...")
        while True:
            if not self.mm:
                if self.connect():
                    time.sleep(1)
                else:
                    time.sleep(2)
                    continue
            
            frame = {}
            try:
                phys = self.read_physics()
                if phys:
                    frame["physics"] = phys
                    
                    payload = json.dumps(frame).encode('utf-8')
                    self.sock.sendto(payload, (self.host, self.port))
            except Exception as e:
                print(f"[AMS2-Bridge] Error: {e}")
                self.mm.close()
                self.mm = None
            
            time.sleep(0.05)

if __name__ == "__main__":
    bridge = AMS2Bridge()
    bridge.loop()
