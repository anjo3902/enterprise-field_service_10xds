"""
start_server.py
---------------
Stable launcher for Field Service Dispatch API

✔ Clean restart (kills old processes)
✔ HTTP (8000) with reload (for development)
✔ HTTPS (8443) for mobile GPS
✔ No port conflicts
✔ Always runs latest code
"""

import os
import sys
import time
import threading
import subprocess
from pathlib import Path

ROOT = Path(__file__).parent
HTTP_PORT = 8000
HTTPS_PORT = 8443


# 🔥 SAFE — PORT-SCOPED CLEANER
def clean_port(port: int) -> None:
    """Safely kill only the process listening on the given port (Windows/Linux)."""
    try:
        result = subprocess.run(
            ["netstat", "-ano"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        for line in result.stdout.splitlines():
            if f":{port}" in line and "LISTENING" in line:
                pid = line.strip().split()[-1]
                try:
                    if int(pid) != os.getpid():
                        print(f"Killing PID {pid} on port {port}...")
                        subprocess.run(
                            ["taskkill", "/PID", pid, "/F"],
                            capture_output=True,
                            timeout=10,
                        )
                except ValueError:
                    print(f"  Skipping non-numeric PID: {pid}")
    except Exception as e:
        print("Cleanup error:", e)


def ensure_firewall_rule(port: int) -> None:
    if sys.platform != "win32":
        return

    check_cmd = f'Get-NetFirewallRule -DisplayName "FieldService Mobile GPS" -ErrorAction SilentlyContinue'
    result = subprocess.run(["powershell", "-Command", check_cmd], capture_output=True, text=True)

    if "FieldService Mobile GPS" not in result.stdout:
        print(f"Adding firewall rule for port {port}...")
        add_cmd = (
            f"New-NetFirewallRule -DisplayName 'FieldService Mobile GPS' "
            f"-Direction Inbound -LocalPort {port} -Protocol TCP -Action Allow"
        )
        try:
            subprocess.run(
                ["powershell", "-NoProfile", "-Command", add_cmd],
                capture_output=True,
                text=True,
                check=True,
            )
        except Exception as e:
            print("Firewall warning:", e)


def ensure_ssl_cert():
    cert_path = ROOT / "cert.pem"
    key_path = ROOT / "key.pem"

    if cert_path.exists() and key_path.exists():
        print("SSL certs exist")
        return cert_path, key_path

    print("Generating SSL cert...")
    from generate_ssl_cert import generate_cert, detect_lan_ip

    lan_ip = detect_lan_ip()
    generate_cert(cert_path, key_path, lan_ip)

    return cert_path, key_path


def main():
    # 🔥 CRITICAL: clean everything first
    clean_port(HTTP_PORT)
    clean_port(HTTPS_PORT)
    time.sleep(1)
    print("CLEANUP DONE - STARTING SERVER")

    # 🔥 VERSION TRACKING
    os.environ["SERVER_VERSION"] = "NEW CODE ACTIVE"
    print("\nSERVER VERSION: NEW CODE ACTIVE\n")

    # Required before import
    os.environ["_MOBILE_GPS_HTTPS_PORT"] = str(HTTPS_PORT)

    import uvicorn
    from backend.services.mobile_gps_service import _detect_lan_ip

    lan_ip = _detect_lan_ip()

    print("=" * 60)
    print("Field Service Dispatch — CLEAN START")
    print("=" * 60)

    # SSL + Firewall
    cert_path, key_path = ensure_ssl_cert()
    ensure_firewall_rule(HTTPS_PORT)

    print("\nStarting servers...\n")

    print(f"HTTP  : http://localhost:{HTTP_PORT}")
    print(f"HTTPS : https://{lan_ip}:{HTTPS_PORT}")
    print("=" * 60)

    # 🔥 HTTPS (NO reload)
    def run_https():
        uvicorn.run(
            "api_server:app",
            host="0.0.0.0",
            port=HTTPS_PORT,
            ssl_keyfile=str(key_path),
            ssl_certfile=str(cert_path),
            reload=False,
            log_level="warning",
        )

    https_thread = threading.Thread(target=run_https, daemon=True)
    https_thread.start()

    print(f"HTTPS running on {HTTPS_PORT}")

    # 🔥 HTTP (WITH reload)
    try:
        uvicorn.run(
            "api_server:app",
            host="0.0.0.0",
            port=HTTP_PORT,
            reload=True,  # 🔥 IMPORTANT
            log_level="info",
        )
    except KeyboardInterrupt:
        print("\nServer stopped.")


if __name__ == "__main__":
    main()