from __future__ import annotations

import argparse
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable


MAX_HUGE_FILE_BYTES = 15 * 1024 * 1024
MAX_LINE_LENGTH = 30_000
TEXT_EXTENSIONS = {".txt", ".json", ".py", ".md"}


@dataclass(slots=True)
class ScanReport:
    total_files: int = 0
    huge_files: list[tuple[Path, int]] = field(default_factory=list)
    long_lines: list[tuple[Path, int]] = field(default_factory=list)
    binary_disguises: list[Path] = field(default_factory=list)
    symlink_loops: list[tuple[Path, str]] = field(default_factory=list)
    unreadable: list[tuple[Path, str]] = field(default_factory=list)


def normalize_path(path: Path) -> Path:
    try:
        return path.resolve(strict=False)
    except OSError:
        return path


def is_binary_text_disguise(file_path: Path) -> bool:
    try:
        with file_path.open("rb") as handle:
            chunk = handle.read(8192)
    except OSError:
        return False
    return b"\x00" in chunk


def scan_text_for_long_lines(file_path: Path) -> int | None:
    try:
        with file_path.open("rb") as handle:
            for raw_line in handle:
                length = len(raw_line.rstrip(b"\r\n"))
                if length > MAX_LINE_LENGTH:
                    return length
    except (OSError, UnicodeError):
        return None
    return None


def detect_symlink_loop(entry: Path, ancestor_realpaths: list[Path]) -> str | None:
    if not entry.is_symlink():
        return None

    try:
        target_real = normalize_path(entry)
    except OSError as exc:
        return f"unresolved symlink target: {exc}"

    if target_real in ancestor_realpaths:
        return f"symlink target resolves to ancestor {target_real}"

    if entry.is_dir():
        # Directory symlinks are the main loop risk for recursive tree scans.
        return f"directory symlink points to {target_real}"

    return None


def scan_tree(root: Path) -> ScanReport:
    report = ScanReport()
    root = root.resolve()

    def walk(current: Path, ancestor_realpaths: list[Path]) -> None:
        try:
            current_real = normalize_path(current)
        except OSError as exc:
            report.unreadable.append((current, str(exc)))
            return

        if current_real in ancestor_realpaths:
            report.symlink_loops.append((current, f"directory cycle through {current_real}"))
            return

        next_ancestors = ancestor_realpaths + [current_real]

        try:
            entries = list(os.scandir(current))
        except OSError as exc:
            report.unreadable.append((current, str(exc)))
            return

        for entry in entries:
            entry_path = Path(entry.path)
            report.total_files += 1

            if entry.is_symlink():
                loop_reason = detect_symlink_loop(entry_path, next_ancestors)
                if loop_reason:
                    report.symlink_loops.append((entry_path, loop_reason))

            try:
                if entry.is_dir(follow_symlinks=False):
                    if entry.is_symlink():
                        # Do not recurse into symlinked directories; flag the risk instead.
                        continue
                    walk(entry_path, next_ancestors)
                    continue

                if not entry.is_file(follow_symlinks=False):
                    continue

                stat_result = entry.stat(follow_symlinks=False)
            except OSError as exc:
                report.unreadable.append((entry_path, str(exc)))
                continue

            if stat_result.st_size > MAX_HUGE_FILE_BYTES:
                report.huge_files.append((entry_path, stat_result.st_size))

            if entry_path.suffix.lower() in TEXT_EXTENSIONS:
                if is_binary_text_disguise(entry_path):
                    report.binary_disguises.append(entry_path)

                long_line = scan_text_for_long_lines(entry_path)
                if long_line is not None:
                    report.long_lines.append((entry_path, long_line))

    walk(root, [])
    return report


def format_bytes(value: int) -> str:
    units = ["B", "KB", "MB", "GB"]
    amount = float(value)
    for unit in units:
        if amount < 1024 or unit == units[-1]:
            if unit == "B":
                return f"{int(amount)} {unit}"
            return f"{amount:.2f} {unit}"
        amount /= 1024
    return f"{value} B"


def print_section(title: str, items: Iterable[str]) -> None:
    print(title)
    printed = False
    for item in items:
        printed = True
        print(item)
    if not printed:
        print("  none")


def main() -> int:
    parser = argparse.ArgumentParser(description="Deep workspace poison-pill scanner.")
    parser.add_argument("root", nargs="?", default=".", help="Root directory to scan")
    args = parser.parse_args()

    root = Path(args.root).resolve()
    report = scan_tree(root)

    print("Deep scan report")
    print(f"Root: {root}")
    print(f"Total files seen: {report.total_files:,}")
    if report.total_files > 50_000:
        print("Warning: total file count exceeds 50,000 and may overwhelm file watchers.")

    print()
    print_section(
        f"Symlink loops / recursion risks ({len(report.symlink_loops)})",
        (f"- {path.relative_to(root)}: {reason}" for path, reason in sorted(report.symlink_loops, key=lambda item: str(item[0]).lower())),
    )

    print()
    print_section(
        f"Massive files > 15 MB ({len(report.huge_files)})",
        (f"- {path.relative_to(root)}: {format_bytes(size)}" for path, size in sorted(report.huge_files, key=lambda item: item[1], reverse=True)),
    )

    print()
    print_section(
        f"Extreme line lengths > 30,000 chars ({len(report.long_lines)})",
        (f"- {path.relative_to(root)}: line length {length:,}" for path, length in sorted(report.long_lines, key=lambda item: item[1], reverse=True)),
    )

    print()
    print_section(
        f"Binary disguises in text extensions ({len(report.binary_disguises)})",
        (f"- {path.relative_to(root)}" for path in sorted(report.binary_disguises, key=lambda item: str(item).lower())),
    )

    print()
    print_section(
        f"Unreadable entries ({len(report.unreadable)})",
        (f"- {path.relative_to(root)}: {reason}" for path, reason in sorted(report.unreadable, key=lambda item: str(item[0]).lower())),
    )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
