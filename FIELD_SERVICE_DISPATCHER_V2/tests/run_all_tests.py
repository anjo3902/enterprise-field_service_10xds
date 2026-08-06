from pathlib import Path
import subprocess
import sys


TEST_CASES = [
    ('API health check', 'tests/integration/test_api_health.py'),
    ('AI diagnosis API', 'tests/integration/test_ai_diagnosis_api.py'),
    ('Dispatch pipeline', 'tests/integration/test_dispatch_pipeline.py'),
    ('Technician route API', 'tests/integration/test_technician_route_api.py'),
    ('Database integrity', 'tests/integration/test_database_integrity.py'),
]


def run_test(label: str, test_path: str) -> tuple[bool, str]:
    command = [sys.executable, '-m', 'pytest', '-q', '--tb=short', test_path]
    process = subprocess.run(command, capture_output=True, text=True)
    output = (process.stdout or '') + (process.stderr or '')
    return process.returncode == 0, output.strip()


def summarize_output(output: str, max_lines: int = 40) -> str:
    lines = output.splitlines()
    if len(lines) <= max_lines:
        return output
    return '\n'.join(lines[-max_lines:])


def main() -> int:
    root = Path(__file__).resolve().parents[1]

    passed = 0
    failed = 0

    print('Running integration test suite...')
    print('-' * 60)

    for label, relative_test_path in TEST_CASES:
        test_path = str(root / relative_test_path)
        ok, output = run_test(label, test_path)

        if ok:
            print(f'{label}: PASS')
            passed += 1
        else:
            print(f'{label}: FAIL')
            failed += 1
            if output:
                print('Error details:')
                print(summarize_output(output))
            print('-' * 60)

    print('Summary')
    print('-' * 60)
    print(f'Total: {len(TEST_CASES)}')
    print(f'Passed: {passed}')
    print(f'Failed: {failed}')

    return 0 if failed == 0 else 1


if __name__ == '__main__':
    raise SystemExit(main())
