#!/usr/bin/env python3
"""
INTERACTIVE E2E CLEANUP WIZARD
==============================

Safe, guided cleanup process with step-by-step instructions.
Prevents accidental deletions with interactive confirmation.

USAGE:
  python scripts/cleanup_e2e_interactive.py
"""

import os
import sys
import subprocess
import json
from datetime import datetime
from pathlib import Path

# Color codes for terminal output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    END = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'


def print_header(text):
    """Print section header."""
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.END}\n")


def print_step(step_num, text):
    """Print step header."""
    print(f"{Colors.BOLD}{Colors.CYAN}STEP {step_num}: {text}{Colors.END}")
    print(f"{Colors.CYAN}{'-'*80}{Colors.END}\n")


def print_success(text):
    """Print success message."""
    print(f"{Colors.GREEN}✓ {text}{Colors.END}")


def print_warning(text):
    """Print warning message."""
    print(f"{Colors.YELLOW}⚠ {text}{Colors.END}")


def print_error(text):
    """Print error message."""
    print(f"{Colors.RED}✗ {text}{Colors.END}")


def print_info(text):
    """Print info message."""
    print(f"{Colors.CYAN}ℹ {text}{Colors.END}")


def get_yes_no(prompt, default=False):
    """Get yes/no input from user."""
    default_str = "Y/n" if default else "y/N"
    response = input(f"{prompt} [{default_str}]: ").strip().lower()

    if response == "":
        return default
    return response in ["y", "yes"]


def get_input(prompt, default=""):
    """Get text input from user."""
    if default:
        response = input(f"{prompt} [{default}]: ").strip()
        return response or default
    else:
        response = input(f"{prompt}: ").strip()
        while not response:
            print_error("Input required")
            response = input(f"{prompt}: ").strip()
        return response


def run_command(command, description):
    """Run shell command and capture output."""
    print(f"\nExecuting: {command}\n")

    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=False,
            text=True,
            cwd=os.getcwd(),
        )
        return result.returncode == 0
    except Exception as e:
        print_error(f"Failed to execute: {e}")
        return False


def check_prerequisites():
    """Check if prerequisites are met."""
    print_step("PREREQUISITE CHECKS", "Verifying environment setup")

    checks = {
        "service-account.json": "Google Cloud credentials file",
        "scripts/cleanup_e2e_firestore.py": "Main cleanup script",
        "scripts/cleanup_e2e_helper.py": "Helper utilities script",
    }

    all_ok = True
    for file_path, description in checks.items():
        if os.path.exists(file_path):
            print_success(f"{description} ({file_path})")
        else:
            print_error(f"Missing {description}: {file_path}")
            all_ok = False

    return all_ok


def step_dry_run():
    """Execute DRY_RUN step."""
    print_step("1", "DRY RUN - Preview E2E Records (No Deletion)")

    print_info("This will scan your Firestore database for E2E test records.")
    print_info("No deletion will occur - this is preview mode only.")
    print()

    if not get_yes_no("Proceed with DRY RUN scan?", default=True):
        print_warning("Skipped dry run")
        return None

    print()
    success = run_command(
        "python scripts/cleanup_e2e_firestore.py",
        "Scanning for E2E records..."
    )

    if success:
        print_success("DRY RUN completed")
        return True
    else:
        print_error("DRY RUN failed")
        return False


def step_review_matches():
    """Review matched records."""
    print_step("2", "Review Matched Records")

    print_info("Based on the DRY RUN output above, please review:")
    print()
    print("  1. How many E2E records were detected?")
    print("  2. Do all matches look like test artifacts?")
    print("  3. Are there any suspicious matches?")
    print("  4. Do you want to proceed with deletion?")
    print()

    if not get_yes_no("Are you satisfied with the matches shown?", default=False):
        print_warning("Cleanup cancelled by user")
        return False

    print_success("Matches approved for deletion")
    return True


def step_backup():
    """Create backup before deletion."""
    print_step("3", "Backup Collections (Safety Precaution)")

    print_warning("HIGHLY RECOMMENDED: Create backup before deletion")
    print_info("Backup is stored in 'backups/' directory with timestamp")
    print()

    if get_yes_no("Create backup before deletion?", default=True):
        print()
        success = run_command(
            "python scripts/cleanup_e2e_helper.py --backup",
            "Creating backup..."
        )

        if success:
            print_success("Backup created successfully")
            print_info("Backups are stored in: backups/")
            return True
        else:
            print_error("Backup failed")

            if get_yes_no("Continue without backup?", default=False):
                print_warning("Proceeding without backup")
                return True
            else:
                print_error("Cleanup cancelled")
                return False
    else:
        print_warning("Skipping backup")

        if not get_yes_no("Continue without backup?", default=False):
            print_error("Cleanup cancelled")
            return False

        return True


def step_analyze():
    """Analyze collection statistics."""
    print_step("4", "Analyze Collection Statistics")

    print_info("Analyzing collection sizes and E2E indicator distribution...")
    print()

    success = run_command(
        "python scripts/cleanup_e2e_helper.py --analyze",
        "Analyzing collections..."
    )

    if success:
        print_success("Analysis completed")
        return True
    else:
        print_error("Analysis failed")
        return False


def step_confirm_deletion():
    """Get explicit confirmation for deletion."""
    print_step("5", "Final Confirmation Before Deletion")

    print_warning("THIS STEP WILL DELETE E2E TEST RECORDS FROM FIRESTORE")
    print()
    print("After you proceed:")
    print("  1. E2E test records will be PERMANENTLY DELETED")
    print("  2. Related records will also be removed")
    print("  3. This action CANNOT be undone without backup recovery")
    print("  4. Deletion will be logged and verified")
    print()

    print_info("Deletion requires explicit confirmation:")
    print()

    confirmation_text = "YES, DELETE E2E DATA"
    provided_text = get_input(f"Type exactly: '{confirmation_text}' to confirm")

    if provided_text == confirmation_text:
        print_success("Confirmation accepted")
        return True
    else:
        print_error(f"Invalid confirmation. Expected: '{confirmation_text}'")
        print_error("Got: '{provided_text}'")
        return False


def step_execute_deletion():
    """Execute the actual deletion."""
    print_step("6", "Execute Deletion")

    print_info("Updating cleanup script with deletion settings...")
    print()

    # Read the cleanup script
    cleanup_script = "scripts/cleanup_e2e_firestore.py"

    try:
        with open(cleanup_script, "r") as f:
            content = f.read()

        # Check if we need to modify the script
        if 'DRY_RUN = True' in content:
            print_info("Setting DRY_RUN = False...")
            content = content.replace("DRY_RUN = True", "DRY_RUN = False")

        if 'CONFIRM_DELETE = ""' in content:
            print_info('Setting CONFIRM_DELETE = "YES_DELETE_E2E_DATA"...')
            content = content.replace(
                'CONFIRM_DELETE = ""',
                'CONFIRM_DELETE = "YES_DELETE_E2E_DATA"'
            )

        # Create temporary modified script
        temp_script = "scripts/cleanup_e2e_firestore_temp.py"
        with open(temp_script, "w") as f:
            f.write(content)

        print_success("Script configured")
        print()

        # Run the deletion
        print_info("Starting deletion process...")
        print()

        success = run_command(
            f"python {temp_script}",
            "Executing deletion..."
        )

        # Clean up temp script
        if os.path.exists(temp_script):
            os.remove(temp_script)

        if success:
            print_success("Deletion completed successfully")
            return True
        else:
            print_error("Deletion encountered errors")
            return False

    except Exception as e:
        print_error(f"Failed to prepare deletion: {e}")
        return False


def step_verify():
    """Verify cleanup results."""
    print_step("7", "Verify Cleanup Results")

    print_info("Verifying that E2E records were successfully deleted...")
    print()

    success = run_command(
        "python scripts/cleanup_e2e_helper.py --verify",
        "Verifying cleanup..."
    )

    if success:
        print_success("Verification completed")
        return True
    else:
        print_error("Verification encountered errors")
        return False


def step_generate_report():
    """Generate detailed cleanup report."""
    print_step("8", "Generate Cleanup Report")

    print_info("Generating E2E indicator report for documentation...")
    print()

    success = run_command(
        "python scripts/cleanup_e2e_helper.py --report",
        "Generating report..."
    )

    if success:
        print_success("Report generated: e2e_indicators_report.csv")
        print_info("Report saved for audit trail")
        return True
    else:
        print_warning("Report generation failed (non-critical)")
        return True  # Don't fail cleanup for this


def main():
    """Main interactive wizard."""
    print_header("E2E FIRESTORE TEST DATA CLEANUP WIZARD")

    print(f"{Colors.BOLD}Current Date/Time: {datetime.now().isoformat()}{Colors.END}")
    print(f"{Colors.BOLD}Working Directory: {os.getcwd()}{Colors.END}")
    print()

    # Check prerequisites
    if not check_prerequisites():
        print_error("Prerequisites check failed")
        sys.exit(1)

    print_success("All prerequisites met")

    # Display workflow
    print()
    print(f"{Colors.BOLD}WORKFLOW:{Colors.END}")
    print("  1. DRY RUN - Preview E2E records")
    print("  2. Review - Verify detected records")
    print("  3. BACKUP - Create safety backup")
    print("  4. ANALYZE - Check collection statistics")
    print("  5. CONFIRM - Get explicit deletion confirmation")
    print("  6. DELETE - Execute deletion")
    print("  7. VERIFY - Confirm deletion success")
    print("  8. REPORT - Generate audit trail")
    print()

    if not get_yes_no("Begin E2E cleanup process?", default=False):
        print_info("Cleanup cancelled by user")
        sys.exit(0)

    # Run workflow steps
    steps = [
        ("DRY RUN", step_dry_run),
        ("REVIEW", step_review_matches),
        ("BACKUP", step_backup),
        ("ANALYZE", step_analyze),
        ("CONFIRM", step_confirm_deletion),
        ("DELETE", step_execute_deletion),
        ("VERIFY", step_verify),
        ("REPORT", step_generate_report),
    ]

    completed_steps = []

    for step_name, step_func in steps:
        try:
            result = step_func()

            if result is None:
                print_info(f"Step skipped: {step_name}")
                completed_steps.append((step_name, "SKIPPED"))
            elif result:
                print_success(f"Step completed: {step_name}")
                completed_steps.append((step_name, "SUCCESS"))
            else:
                print_error(f"Step failed: {step_name}")
                completed_steps.append((step_name, "FAILED"))

                # Ask if user wants to continue
                if not get_yes_no("Continue to next step?", default=False):
                    print_warning("Cleanup process interrupted by user")
                    break

        except KeyboardInterrupt:
            print()
            print_warning("Process interrupted by user (Ctrl+C)")
            break
        except Exception as e:
            print_error(f"Unexpected error in {step_name}: {e}")
            if not get_yes_no("Continue to next step?", default=False):
                break

    # Final summary
    print_header("CLEANUP PROCESS SUMMARY")

    print(f"{Colors.BOLD}Steps Completed:{Colors.END}\n")

    for step_name, status in completed_steps:
        if status == "SUCCESS":
            print(f"  {Colors.GREEN}✓{Colors.END} {step_name}: {Colors.GREEN}{status}{Colors.END}")
        elif status == "SKIPPED":
            print(f"  {Colors.YELLOW}~{Colors.END} {step_name}: {Colors.YELLOW}{status}{Colors.END}")
        else:
            print(f"  {Colors.RED}✗{Colors.END} {step_name}: {Colors.RED}{status}{Colors.END}")

    print()

    # Final status
    all_successful = all(
        status == "SUCCESS" or status == "SKIPPED"
        for _, status in completed_steps
    )

    if all_successful:
        print_success("E2E Cleanup completed successfully!")
        print_info("Database is now clean of E2E test records")
    else:
        print_error("E2E Cleanup completed with errors")
        print_warning("Please review error messages above")

    print()
    print_info(f"Process finished at {datetime.now().isoformat()}")
    print()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print()
        print_warning("\nProcess interrupted by user")
        sys.exit(130)
    except Exception as e:
        print_error(f"\nUnexpected error: {e}")
        sys.exit(1)
