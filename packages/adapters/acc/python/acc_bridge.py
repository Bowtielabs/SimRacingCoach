
import mmap
import struct
import socket
import time
import json
import math

# ==========================================================
# ASSETTO CORSA SHARED MEMORY MAPS
# ==========================================================
# Physics Map: "Local\\acpmf_physics"
# Graphics Map: "Local\\acpmf_graphics"
# Static Map: "Local\\acpmf_static"

class ACCBridge:
    def __init__(self, host="127.0.0.1", port=9300):
        self.host = host
        self.port = port
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.physics_mm = None
        self.graphics_mm = None
        self.static_mm = None
        
    def connect(self):
        try:
            self.physics_mm = mmap.mmap(0, 712, "Local\\acpmf_physics")
            self.graphics_mm = mmap.mmap(0, 1588, "Local\\acpmf_graphics")
            self.static_mm = mmap.mmap(0, 756, "Local\\acpmf_static")
            print("[ACC-Bridge] Connected to Shared Memory!")
            return True
        except FileNotFoundError:
            # AC not running yet
            return False

    def read_physics(self):
        if not self.physics_mm: return None
        self.physics_mm.seek(0)
        data = self.physics_mm.read(712)
        # Struct layout is complex, simplifying for critical telemetry
        # Ref: AC Shared Memory Documentation
        # packetId (i), gas (f), brake (f), fuel (f), gear (i), rpms (i), steerAngle (f), speedKmh (f)
        # Offset 0: packetId (4b)
        # Offset 4: gas (4b)
        # Offset 8: brake (4b)
        # Offset 12: fuel (4b)
        # Offset 16: gear (4b)
        # Offset 20: rpms (4b)
        # Offset 24: steerAngle (4b)
        # Offset 28: speedKmh (4b)
        # ...
        # Offset 40: accG [3] (12b) -> x/y/z
        # ...
        # Offset 124: suspensionTravel [4] (16b)
        
        try:
            unpacked = struct.unpack("ifffii", data[0:24]) # ID, Gas, Brake, Fuel, Gear, RPMS
            steer = struct.unpack("f", data[24:28])[0]
            speed = struct.unpack("f", data[28:32])[0]
            
            # Vectors
            params_start = 28 + 4
            # velocity [3]
            # accG [3] (starts at 28+4+12 = 44?) No.
            # Let's count bytes carefully or use a robust pattern.
            # Byte 0: int packetId
            # Byte 4: float gas
            # Byte 8: float brake
            # Byte 12: float fuel
            # Byte 16: int gear
            # Byte 20: int rpm
            # Byte 24: float steer
            # Byte 28: float speedKmh
            # Byte 32: float velocity[3]
            # Byte 44: float accG[3]
            # Byte 56: float wheelSlip[4]
            # Byte 72: float wheelLoad[4]
            # Byte 88: float wheelsPressure[4]
            # Byte 104: float wheelAngularSpeed[4]
            # Byte 120: float tyreWear[4]
            # Byte 136: float tyreDirtyLevel[4]
            # Byte 152: float tyreCoreTemp[4] -> This is what we want 'Tyre Temp'
            # Byte 168: float camberRAD[4]
            # Byte 184: float suspensionTravel[4] ? Wait, offset shift.
            
            # Let's count from 44 (accG end):
            # 44 + 16 (slip) = 60
            # 60 + 16 (load) = 76
            # 76 + 16 (pressure) = 92
            # 92 + 16 (angSpeed) = 108
            # 108 + 16 (wear) = 124
            # 124 + 16 (dirty) = 140
            # 140 + 16 (coreTemp) = 156
            # 156 + 16 (camber) = 172
            # 172 + 16 (suspTravel) = 188
            
            # Re-verify offset 124 in previous code (suspTravel). 
            # The AC struct is tricky between versions. Let's use standard offsets.
            # wheelSlip @ 56
            
            # Temps @ 152 (4 floats)
            tyreCoreTemp = struct.unpack("ffff", data[152:168])
            
            # Brake Temps ?
            # AC physics struct usually has brakeTemp later?
            # Actually, standard struct:
            # ...
            # 204: drs (f)
            # 208: tc (f)
            # ... 
            # BrakeTemp is notably missing in standard AC Shared Mem v1.4. 
            # BUT ACC might populate `brakeTemp` @ ?
            # We'll stick to Tyre Temps for now which are critical.
            
            return {
                "packetId": unpacked[0],
                "gas": unpacked[1],
                "brake": unpacked[2],
                "fuel": unpacked[3],
                "gear": unpacked[4],
                "rpm": unpacked[5],
                "steerAngle": steer,
                "speedKph": speed,
                "accG": accG,
                "suspensionTravel": suspTravel,
                "tyreTemp": tyreCoreTemp,
                "wheelSlip": struct.unpack("ffff", data[56:72]),
                "tyreWear": struct.unpack("ffff", data[120:136])
            }
        except Exception as e:
            return None

    def loop(self):
        print("[ACC-Bridge] Waiting for AC/ACC...")
        while True:
            if not self.physics_mm:
                if self.connect():
                    time.sleep(1)
                else:
                    time.sleep(2)
                    continue
            
            # Read
            frame = {}
            try:
                phys = self.read_physics()
                if phys:
                    frame["physics"] = phys
                    frame["graphics"] = {"status": 1} # Todo reading graphics
                    
                    # Send UDP
                    payload = json.dumps(frame).encode('utf-8')
                    self.sock.sendto(payload, (self.host, self.port))
                    
                    if phys["packetId"] % 100 == 0:
                        print(f"[ACC-Bridge] Sending Packet {phys['packetId']} - Speed: {phys['speedKph']:.1f}")
            except Exception as e:
                print(f"[ACC-Bridge] Error: {e}")
                self.physics_mm.close()
                self.physics_mm = None
            
            time.sleep(0.05) # 20Hz

if __name__ == "__main__":
    bridge = ACCBridge()
    bridge.loop()
