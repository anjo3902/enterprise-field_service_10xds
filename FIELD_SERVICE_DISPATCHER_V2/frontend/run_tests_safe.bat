@echo off
REM Run Playwright tests with fail-fast semantics for CI safety
npx playwright test --max-failures=1
IF %ERRORLEVEL% NEQ 0 (
  echo TEST FAILED
  exit /b 1
)
echo TEST COMPLETED SUCCESSFULLY
exit /b 0
