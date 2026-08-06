"""
generate_ssl_cert.py
--------------------
Generates a self-signed SSL certificate (cert.pem + key.pem) for the
local LAN IP so uvicorn can serve HTTPS, enabling navigator.geolocation
on mobile browsers (Chrome/Safari block GPS on plain HTTP LAN pages).

Usage:
    python generate_ssl_cert.py

Then start the backend with:
    uvicorn api_server:app --host 0.0.0.0 --port 8000 --reload --ssl-keyfile=key.pem --ssl-certfile=cert.pem
"""

import ipaddress
import socket
import datetime
from pathlib import Path

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID


def detect_lan_ip() -> str:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"


def generate_cert(cert_path: Path, key_path: Path, lan_ip: str) -> None:
    # Generate RSA key
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)

    now = datetime.datetime.utcnow()
    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COMMON_NAME, lan_ip),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "FieldServiceDispatcher"),
    ])

    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(now)
        .not_valid_after(now + datetime.timedelta(days=825))  # ~ 2 years
        .add_extension(
            x509.SubjectAlternativeName([
                x509.IPAddress(ipaddress.IPv4Address(lan_ip)),
                x509.IPAddress(ipaddress.IPv4Address("127.0.0.1")),
                x509.DNSName("localhost"),
            ]),
            critical=False,
        )
        .add_extension(
            x509.BasicConstraints(ca=True, path_length=None),
            critical=True,
        )
        .sign(key, hashes.SHA256())
    )

    # Write private key
    key_path.write_bytes(
        key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption(),
        )
    )

    # Write certificate
    cert_path.write_bytes(cert.public_bytes(serialization.Encoding.PEM))


def main() -> None:
    lan_ip = detect_lan_ip()
    cert_path = Path("cert.pem")
    key_path  = Path("key.pem")

    print(f"Detected LAN IP : {lan_ip}")
    generate_cert(cert_path, key_path, lan_ip)

    print(f"\n✅  Generated self-signed certificate")
    print(f"   cert.pem  →  {cert_path.resolve()}")
    print(f"   key.pem   →  {key_path.resolve()}")
    print(f"\nStart the backend with HTTPS:")
    print(f"   uvicorn api_server:app --host 0.0.0.0 --port 8000 --reload --ssl-keyfile=key.pem --ssl-certfile=cert.pem")
    print(f"\nMobile GPS page URL (scan QR or open manually on phone):")
    print(f"   https://{lan_ip}:8000/mobile-gps.html")
    print(f"\n⚠️  First time on phone: Chrome will show 'Not secure – Your connection is not private'")
    print(f"   Tap  Advanced  →  Proceed to {lan_ip} (unsafe)")
    print(f"   After that, GPS works normally — no repeated warnings.")


if __name__ == "__main__":
    main()
