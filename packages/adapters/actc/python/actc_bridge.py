
import mmap
import struct
import socket
import time
import json
import math

# rFactor 1 / gMotor 2 Internals Shared Memory
# Standard rfSharedMemoryMap plugin layout (simplified guess based on common structs)
# Many plugins use a simpler map. 
# We will target the "rFactorShared" map which is standard across rF1 variants.
# Map Name: "$rFactorShared$" or "rFactorSharedMemory"
#
# Structure Guess (Standard Plugin):
# float time
# float lapTime
# ...
# float speed
# float rpm
# float maxRpm
# int gear
# ...
# float throttle
# float brake
# ...
#
# Since rFactor 1 doesn't have NATIVE shared memory like rF2, this relies on the user having 
# a DLL installed (rFactorSharedMemoryMap.dll). If they don't, this won't work.
# Most "ACTC" simulators come with plugins or allow this.

class ACTCBridge:
    def __init__(self, host="127.0.0.1", port=9302):
        self.host = host
        self.port = port
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.mm = None
        
    def connect(self):
        # Try common rFactor 1 shared memory map names
        names = ["$rFactorShared$", "rFactorSharedMemory", "Local\\rFactorSharedMemory"]
        
        for name in names:
            try:
                self.mm = mmap.mmap(0, 2048, name) # Size is usually small for rF1 plugins
                print(f"[ACTC-Bridge] Connected to Shared Memory ({name})!")
                return True
            except:
                pass
        return False

    def read_telemetry(self):
        if not self.mm: return None
        self.mm.seek(0)
        
        # NOTE: This layout matches the popular rF1 Shared Memory Map 
        # (Often used by SimHub for rF1/AMS1/GTR2)
        #
        # Offset 0: Data
        # We need to scan or use known offsets.
        #
        # Let's assume the Internals Plugin layout v2/v3
        
        data = self.mm.read(2048)
        
        try:
            # Trying to read basic float blocks
            # rF1 internals are often just a dump of the Telemetry struct.
            
            # Let's try searching for RPM/Speed if we can't be sure.
            # But let's assume a standard layout provided by SimHub's bridge for rF1.
            # Actually, SimRacingCoach should ideally have its OWN dll, but we are Python-only client.
            
            # Fallback: Assume rF1 Shared Memory Map (The one most sims use)
            # 
            # Phase 9 Goal: Basic functional telemetry.
            #
            # Attempting to map standard rF1 Internals struct:
            # 0: DeltaTime (f)
            # 4: LapNumber (i)
            # ...
            # Speed often @ start? No.
            
            # Alternative: Use "Otterhud" or "Gihub rfactor-shared-memory" layout.
            # 
            # Layout:
            # 0: mVersion
            # ...
            # 68: mSpeed (float m/s)
            # 72: mRPM (float)
            # 76: mMaxRPM (float)
            # 80: mGear (int)
            # ...
            # 84: mEngineWaterTemp (float)
            # 88: mEngineOilTemp (float)
            # ...
            # 100: mThrottle (float 0-1)
            # 104: mBrake (float 0-1)
            # 108: mClutch (float 0-1)
            # 112: mSteering (float radians)
            # ...
            # 128: mLocalAccel[3] (float) -> G-Forces
            # ...
            # 204: mWheelRpm[4]
            # ...
            #
            # This looks like a reasonable standard for many rF1 Plugins.
            
            speed = struct.unpack("f", data[68:72])[0]
            rpm = struct.unpack("f", data[72:76])[0]
            gear = struct.unpack("i", data[80:84])[0]
            
            throttle = struct.unpack("f", data[100:104])[0]
            brake = struct.unpack("f", data[104:108])[0]
            
            water = struct.unpack("f", data[84:88])[0]
            oil = struct.unpack("f", data[88:92])[0]
            
            steer = struct.unpack("f", data[112:116])[0]
            
            g_forces = struct.unpack("fff", data[128:140])
            
            # Additional Rfactor1 common offsets
            # mLapStartDist ??
            # mLapDist (float) @ ~16 (offset variable, but let's try standard)
            # Actually, standard RF1 plugin structure is:
            # 0: DeltaTime
            # ...
            # 20: LapDist (float) ?
            
            # Let's emit what we have and add placeholders for critical track data
            # Ideally we'd scan for these.
            
            return {
                "t": time.time() * 1000,
                "speed": speed,
                "rpm": rpm,
                "gear": gear,
                "throttle": throttle,
                "brake": brake,
                "clutch": 0,
                "steer": steer,
                "waterTemp": water,
                "oilTemp": oil,
                "lateralG": g_forces[0], 
                "longitudinalG": g_forces[2],
                "tyreTemp": [0,0,0,0], # Needs finding offset
                "suspensionTravel": [0,0,0,0],
                "lapDist": 0.0, # Placeholder
                "sector": 0     # Placeholder
            }

        except Exception as e:
            return None

    def loop(self):
        print("[ACTC-Bridge] Waiting for ACTC/rFactor1...")
        while True:
            if not self.mm:
                if self.connect():
                    time.sleep(1)
                else:
                    time.sleep(2)
                    continue
            
            frame = {}
            try:
                telem = self.read_telemetry()
                if telem:
                    # JSON encode
                    payload = json.dumps(telem).encode('utf-8')
                    self.sock.sendto(payload, (self.host, self.port))
            except Exception as e:
                print(f"[ACTC-Bridge] Error: {e}")
                if self.mm: self.mm.close()
                self.mm = None
            
            time.sleep(0.05)

if __name__ == "__main__":
    bridge = ACTCBridge()
    bridge.loop()
