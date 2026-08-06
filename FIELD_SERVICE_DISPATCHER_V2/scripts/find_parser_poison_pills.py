from __future__ import annotations

import argparse
import os
from pathlib import Path
from typing import Iterable


DEFAULT_SKIP_DIRS = {".git", "venv", "node_modules", ".venv"}
MAX_LINE_LENGTH = 50_000
MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

# Extensions that are usually safe text/code assets.
COMMON_TEXT_EXTENSIONS = {
    ".py",
    ".pyi",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".json",
    ".jsonl",
    ".md",
    ".txt",
    ".csv",
    ".yaml",
    ".yml",
    ".toml",
    ".ini",
    ".cfg",
    ".xml",
    ".html",
    ".htm",
    ".css",
    ".scss",
    ".sass",
    ".less",
    ".sh",
    ".ps1",
    ".bat",
    ".cmd",
    ".env",
    ".sql",
    ".log",
    ".lock",
    ".gitignore",
    ".gitattributes",
    ".dockerignore",
    ".editorconfig",
    ".eslintignore",
    ".prettierignore",
    ".prettierrc",
    ".npmrc",
    ".nvmrc",
    ".ipynb",
    ".svg",
    ".c",
    ".h",
    ".hpp",
    ".cpp",
    ".cc",
    ".java",
    ".kt",
    ".go",
    ".rs",
    ".rb",
    ".php",
    ".swift",
    ".gradle",
    ".properties",
    ".conf",
    ".sample",
}

# Extensions that are expected in normal repos (including common binaries).
KNOWN_SAFE_EXTENSIONS = COMMON_TEXT_EXTENSIONS | {
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".bmp",
    ".ico",
    ".tiff",
    ".pdf",
    ".zip",
    ".tar",
    ".gz",
    ".7z",
    ".rar",
    ".woff",
    ".woff2",
    ".ttf",
    ".otf",
    ".eot",
    ".mp3",
    ".wav",
    ".mp4",
    ".mov",
    ".avi",
    ".mkv",
    ".exe",
    ".dll",
    ".so",
    ".dylib",
    ".bin",
    ".class",
    ".jar",
    ".pyd",
    ".pyc",
    ".pkl",
    ".pickle",
    ".db",
    ".sqlite",
    ".sqlite3",
    ".parquet",
    ".feather",
    ".avro",
    ".onnx",
    ".pt",
    ".pth",
    ".joblib",
    ".npy",
    ".npz",
    ".heic",
}


def iter_files(root: Path, skip_dirs: set[str]) -> Iterable[Path]:
    for current_root, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        base = Path(current_root)
        for name in files:
            yield base / name


def has_binary_signature(file_path: Path, sample_size: int = 4096) -> bool:
    """Heuristic: null bytes strongly suggest binary content."""
    try:
        with file_path.open("rb") as f:
            chunk = f.read(sample_size)
    except OSError:
        return False
    return b"\x00" in chunk


def max_line_length(file_path: Path, max_threshold: int) -> int | None:
    """Return max line length if it exceeds threshold, else None."""
    try:
        with file_path.open("rb") as f:
            for raw_line in f:
                line_len = len(raw_line.rstrip(b"\r\n"))
                if line_len > max_threshold:
                    return line_len
    except (OSError, UnicodeError):
        return None
    return None


def classify_extension(file_path: Path) -> tuple[bool, str]:
    suffix = file_path.suffix.lower()
    name = file_path.name

    if not suffix and "." not in name:
        return True, "No file extension"
    if suffix and suffix not in KNOWN_SAFE_EXTENSIONS:
        return True, f"Unusual extension: {suffix}"
    return False, ""


def scan(root: Path) -> list[tuple[Path, list[str]]]:
    results: list[tuple[Path, list[str]]] = []

    for file_path in iter_files(root, DEFAULT_SKIP_DIRS):
        reasons: list[str] = []

        try:
            size = file_path.stat().st_size
        except OSError:
            continue

        if size > MAX_FILE_SIZE_BYTES:
            reasons.append(f"File size {size:,} bytes (> {MAX_FILE_SIZE_BYTES:,})")

        long_line = max_line_length(file_path, MAX_LINE_LENGTH)
        if long_line is not None:
            reasons.append(f"Contains line length {long_line:,} (> {MAX_LINE_LENGTH:,})")

        ext_suspicious, ext_reason = classify_extension(file_path)
        if ext_suspicious:
            if "No file extension" in ext_reason and has_binary_signature(file_path):
                ext_reason += " (binary signature detected)"
            reasons.append(ext_reason)

        if reasons:
            results.append((file_path, reasons))

    return results


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Find files that may crash or stall language servers/parsers."
    )
    parser.add_argument(
        "root",
        nargs="?",
        default=".",
        help="Root directory to scan (default: current directory)",
    )
    args = parser.parse_args()

    root = Path(args.root).resolve()
    findings = scan(root)

    if not findings:
        print("No suspicious files found.")
        return 0

    print(f"Suspicious files found: {len(findings)}")
    for path, reasons in sorted(findings, key=lambda item: str(item[0]).lower()):
        rel = path.relative_to(root)
        print(f"- {rel}")
        for reason in reasons:
            print(f"    reason: {reason}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
