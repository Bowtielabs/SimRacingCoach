import mmap
import struct
import time

def scan():
    print("Scanning Shared Memory for rFactor/ACTC...")
    
    # Try common names
    names = ["$rFactorShared$", "rFactorShared", "$rFactorSharedMemoryField$", "Local\\$rFactorShared$"]
    mm = None
    
    for name in names:
        try:
            mm = mmap.mmap(0, 8192, name)
            print(f"Connected to {name}!")
            break
        except Exception as e:
            pass
            
    if not mm:
        print("Could not connect to any shared memory mapping. Is the game running?")
        return

    print("Reading data... PLEASE DRIVE THE CAR!")
    
    while True:
        mm.seek(0)
        data = mm.read(1024)
        
        floats = struct.unpack("256f", data)
        
        candidates = []
        for i, val in enumerate(floats):
            if abs(val) > 0.001: # Any non-zero
                candidates.append(f"Offset {i*4}: {val:.4f}")
                
        if candidates:
            print("-" * 50)
            print(f"Found {len(candidates)} non-zero values:")
            for c in candidates[:20]: # Show top 20
                print(c)
        else:
            print("Memory is all ZEROS. Are you on track?", end='\r')
            
        time.sleep(0.5)

if __name__ == "__main__":
    scan()
