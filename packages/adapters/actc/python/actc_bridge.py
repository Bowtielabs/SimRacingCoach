
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
                print(f"[ACTC-Bridge] Connected to Shared Memory ({name})!", flush=True)
                return True
            except:
                pass
        return False

    def read_telemetry(self):
        if not self.mm: return None
        self.mm.seek(0)
        data = self.mm.read(512) # Read first 512 bytes

        # Heuristic Scanner
        # We look for RPM (usually > 800 and < 10000) and Speed (0-100 m/s)
        
        floats = []
        try:
            # Unpack first 64 floats (256 bytes)
            floats = struct.unpack("64f", data[:256])
        except:
            pass
            
        # Debug: Print potential candidates
        if time.time() % 1.0 < 0.1:
            candidates = []
            for i, val in enumerate(floats):
                if 100 < val < 10000: # Potential RPM
                    candidates.append(f"Offset {i*4}: {val:.0f} (RPM?)")
                if 0.1 < val < 100:   # Potential Speed m/s (approx 1-360 kph)
                    candidates.append(f"Offset {i*4}: {val:.1f} (Speed?)")
            
            if candidates:
                print(f"[ACTC-Bridge] SCANNER: {', '.join(candidates[:5])}", flush=True)

        # Return dummy data for now
        return {
            "t": time.time() * 1000,
            "speed": 0, "rpm": 0, "gear": 0, "throttle": 0, "brake": 0,
            "clutch": 0, "steer": 0, "waterTemp": 0, "oilTemp": 0,
            "lateralG": 0, "longitudinalG": 0, "tyreTemp": [0,0,0,0],
            "suspensionTravel": [0,0,0,0], "lapDist": 0.0, "sector": 0
        }

    def loop(self):
        print("[ACTC-Bridge] Waiting for ACTC/rFactor1...", flush=True)
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
                print(f"[ACTC-Bridge] Error: {e}", flush=True)
                if self.mm: self.mm.close()
                self.mm = None
            
            time.sleep(0.05)

if __name__ == "__main__":
    bridge = ACTCBridge()
    bridge.loop()
