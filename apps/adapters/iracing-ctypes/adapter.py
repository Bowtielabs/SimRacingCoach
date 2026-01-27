import ctypes
import json
import struct
import sys
import time

MMF_NAME = "Local\\IRSDKMemMapFileName"
EVENT_READY_NAME = "Local\\IRSDKDataReadyEvent"
EVENT_VALID_NAME = "Local\\IRSDKDataValidEvent"

FILE_MAP_READ = 0x0004
SYNCHRONIZE = 0x00100000
WAIT_OBJECT_0 = 0x00000000
WAIT_TIMEOUT = 0x00000102

IRSDK_CHAR = 0
IRSDK_BOOL = 1
IRSDK_INT = 2
IRSDK_BITFIELD = 3
IRSDK_FLOAT = 4
IRSDK_DOUBLE = 5

TYPE_MAP = {
    IRSDK_CHAR: ("s", 1),
    IRSDK_BOOL: ("?", 1),
    IRSDK_INT: ("i", 4),
    IRSDK_BITFIELD: ("I", 4),
    IRSDK_FLOAT: ("f", 4),
    IRSDK_DOUBLE: ("d", 8),
}

kernel32 = ctypes.windll.kernel32


class IRSDKVarBuf(ctypes.Structure):
    _pack_ = 1
    _fields_ = [("tickCount", ctypes.c_int), ("bufOffset", ctypes.c_int)]


class IRSDKHeader(ctypes.Structure):
    _pack_ = 1
    _fields_ = [
        ("version", ctypes.c_int),
        ("status", ctypes.c_int),
        ("tickRate", ctypes.c_int),
        ("sessionInfoUpdate", ctypes.c_int),
        ("sessionInfoLen", ctypes.c_int),
        ("sessionInfoOffset", ctypes.c_int),
        ("numVars", ctypes.c_int),
        ("varHeaderOffset", ctypes.c_int),
        ("numBuf", ctypes.c_int),
        ("bufLen", ctypes.c_int),
        ("varBuf", IRSDKVarBuf * 4),
    ]


class IRSDKVarHeader(ctypes.Structure):
    _pack_ = 1
    _fields_ = [
        ("type", ctypes.c_int),
        ("offset", ctypes.c_int),
        ("count", ctypes.c_int),
        ("name", ctypes.c_char * 32),
        ("desc", ctypes.c_char * 64),
        ("unit", ctypes.c_char * 32),
    ]


def emit(payload):
    sys.stdout.write(json.dumps(payload, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def emit_status(state, details=""):
    emit(
        {
            "type": "status",
            "state": state,
            "sim": "iracing",
            "details": details,
        }
    )


def emit_log(level, message):
    emit({"type": "log", "level": level, "message": message})


def emit_session_info(yaml_text):
    emit(
        {
            "type": "sessionInfo",
            "sim": "iracing",
            "ts": int(time.time() * 1000),
            "yaml": yaml_text,
        }
    )


def open_file_mapping():
    handle = kernel32.OpenFileMappingW(FILE_MAP_READ, False, MMF_NAME)
    if not handle:
        return None, None
    view = kernel32.MapViewOfFile(handle, FILE_MAP_READ, 0, 0, 0)
    if not view:
        kernel32.CloseHandle(handle)
        return None, None
    return handle, view


def open_event(name):
    handle = kernel32.OpenEventW(SYNCHRONIZE, False, name)
    return handle if handle else None


def close_handle(handle):
    if handle:
        kernel32.CloseHandle(handle)


def unmap_view(view):
    if view:
        kernel32.UnmapViewOfFile(view)


def read_var_headers(base_addr, header):
    headers = {}
    header_size = ctypes.sizeof(IRSDKVarHeader)
    for idx in range(header.numVars):
        addr = base_addr + header.varHeaderOffset + (idx * header_size)
        var_header = IRSDKVarHeader.from_address(addr)
        raw_name = bytes(var_header.name)
        name = raw_name.split(b"\x00", 1)[0].decode("utf-8", errors="ignore")
        headers[name] = (var_header.type, var_header.offset, var_header.count)
    return headers


def read_var_value(var_headers, name, buffer_bytes):
    meta = var_headers.get(name)
    if not meta:
        return None
    var_type, offset, count = meta
    if var_type not in TYPE_MAP:
        return None
    fmt, _size = TYPE_MAP[var_type]
    if var_type == IRSDK_CHAR:
        raw = struct.unpack_from(f"<{count}s", buffer_bytes, offset)[0]
        return raw.split(b"\x00", 1)[0].decode("utf-8", errors="ignore")
    if count == 1:
        return struct.unpack_from(f"<{fmt}", buffer_bytes, offset)[0]
    return list(struct.unpack_from(f"<{count}{fmt}", buffer_bytes, offset))


def pick_latest_buffer(header):
    buf_count = min(header.numBuf, len(header.varBuf))
    best_idx = 0
    best_tick = -1
    for idx in range(buf_count):
        tick = header.varBuf[idx].tickCount
        if tick > best_tick:
            best_tick = tick
            best_idx = idx
    return best_idx


def read_buffer_snapshot(base_addr, header):
    buf_idx = pick_latest_buffer(header)
    tick_before = header.varBuf[buf_idx].tickCount
    buf_offset = header.varBuf[buf_idx].bufOffset
    buf_len = header.bufLen
    buffer_bytes = ctypes.string_at(base_addr + buf_offset, buf_len)
    tick_after = header.varBuf[buf_idx].tickCount
    if tick_after != tick_before:
        tick_before = header.varBuf[buf_idx].tickCount
        buffer_bytes = ctypes.string_at(base_addr + buf_offset, buf_len)
    return tick_before, buffer_bytes


def build_frame(var_headers, header, buffer_bytes, tick_count):
    speed = read_var_value(var_headers, "Speed", buffer_bytes)
    rpm = read_var_value(var_headers, "RPM", buffer_bytes)
    gear = read_var_value(var_headers, "Gear", buffer_bytes)
    throttle = read_var_value(var_headers, "Throttle", buffer_bytes)
    brake = read_var_value(var_headers, "Brake", buffer_bytes)
    steering = read_var_value(var_headers, "SteeringWheelAngle", buffer_bytes)
    lap = read_var_value(var_headers, "Lap", buffer_bytes)
    session_flags = read_var_value(var_headers, "SessionFlags", buffer_bytes)
    traffic = read_var_value(var_headers, "CarLeftRight", buffer_bytes)
    water_temp = read_var_value(var_headers, "WaterTemp", buffer_bytes)
    oil_temp = read_var_value(var_headers, "OilTemp", buffer_bytes)

    frame = {
        "speed_mps": speed,
        "rpm": rpm,
        "gear": gear,
        "throttle_pct": throttle * 100 if isinstance(throttle, (int, float)) else None,
        "brake_pct": brake * 100 if isinstance(brake, (int, float)) else None,
        "steering_rad": steering,
        "lap": lap,
        "session_flags_raw": session_flags,
        "traffic": traffic if traffic is not None else "unknown",
        "temps": {"water_c": water_temp, "oil_c": oil_temp},
        "tickCount": tick_count,
        "tickRate": header.tickRate,
    }

    return frame


def main():
    last_status = None
    last_status_at = 0
    last_session_update = None

    mapping_handle = None
    mapping_view = None
    event_handle = None
    var_headers = {}

    while True:
        if mapping_handle is None or mapping_view is None:
            now = time.time()
            if last_status != "waiting" or now - last_status_at > 1.5:
                emit_status("waiting", "Esperando iRacing...")
                last_status = "waiting"
                last_status_at = now
            mapping_handle, mapping_view = open_file_mapping()
            if mapping_handle and mapping_view:
                event_handle = open_event(EVENT_READY_NAME) or open_event(EVENT_VALID_NAME)
            else:
                time.sleep(1.0)
                continue

        try:
            base_addr = ctypes.c_void_p(mapping_view).value
            header = IRSDKHeader.from_address(base_addr)
        except Exception as exc:
            emit_log("error", f"Failed to read header: {exc}")
            emit_status("disconnected", "No se pudo leer la memoria compartida")
            last_status = "disconnected"
            unmap_view(mapping_view)
            close_handle(mapping_handle)
            close_handle(event_handle)
            mapping_handle = None
            mapping_view = None
            event_handle = None
            time.sleep(1.0)
            continue

        if header.status <= 0:
            if last_status != "disconnected":
                emit_status("disconnected", "Datos no válidos")
                last_status = "disconnected"
            time.sleep(1.0)
            continue

        if last_status != "connected":
            emit_status("connected", "Telemetría activa")
            last_status = "connected"

        if not var_headers:
            var_headers = read_var_headers(base_addr, header)

        if event_handle:
            wait_result = kernel32.WaitForSingleObject(event_handle, 1000)
            if wait_result not in (WAIT_OBJECT_0, WAIT_TIMEOUT):
                emit_log("warn", "WaitForSingleObject returned unexpected result")
        else:
            time.sleep(0.016)

        if header.sessionInfoUpdate != last_session_update:
            last_session_update = header.sessionInfoUpdate
            try:
                raw_info = ctypes.string_at(
                    base_addr + header.sessionInfoOffset, header.sessionInfoLen
                )
                emit_session_info(raw_info.decode("utf-8", errors="ignore"))
            except Exception as exc:
                emit_log("warn", f"Failed to read session info: {exc}")

        try:
            tick_count, buffer_bytes = read_buffer_snapshot(base_addr, header)
            frame = build_frame(var_headers, header, buffer_bytes, tick_count)
            emit(
                {
                    "type": "frame",
                    "sim": "iracing",
                    "ts": int(time.time() * 1000),
                    "data": frame,
                }
            )
        except Exception as exc:
            emit_log("error", f"Failed to read frame: {exc}")
            emit_status("disconnected", "Error leyendo telemetría")
            last_status = "disconnected"
            unmap_view(mapping_view)
            close_handle(mapping_handle)
            close_handle(event_handle)
            mapping_handle = None
            mapping_view = None
            event_handle = None
            time.sleep(1.0)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        emit_log("info", "Adapter stopped")
