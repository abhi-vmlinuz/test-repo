#!/usr/bin/env python3
"""Live check of the grading path against a real Judge0.

The unit tests in test_judge_service.py use a mocked transport, so they cannot
tell you whether Judge0 accepts our payload shape, whether hidden masking
survives a real response, or whether an unreachable judge really degrades to
"pending" instead of "wrong answer". This script answers those questions and
exits non-zero if any assumption breaks.

It is deliberately not named test_*.py: CI has no Judge0, and a collection
error there would be noise. Run it by hand:

    cd backend
    uv run --no-project --with httpx python tests/live_judge0_check.py

Requires Judge0 on JUDGE0_URL (default http://127.0.0.1:2358).
"""

import asyncio
import os
import sys
import time

import httpx

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import judge_service  # noqa: E402
from judge_service import JudgeService  # noqa: E402

CASES = [
    {"id": 1, "input": "2 3\n", "expected": "5\n", "points": 50, "is_hidden": False},
    {"id": 2, "input": "10 20\n", "expected": "30\n", "points": 50, "is_hidden": True},
]

CORRECT = "a, b = map(int, input().split())\nprint(a + b)\n"
WRONG = "a, b = map(int, input().split())\nprint(a * b)\n"
BROKEN_C = "int main(void) { this is not C }\n"

failures = []


def check(name, condition, detail=""):
    status = "PASS" if condition else "FAIL"
    print(f"  [{status}] {name}" + (f" — {detail}" if detail and not condition else ""))
    if not condition:
        failures.append(name)


def wait_for_judge0(url, timeout=180):
    print(f"waiting for Judge0 at {url} (up to {timeout}s)")
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            res = httpx.get(f"{url}/about", timeout=5.0)
            if res.status_code == 200:
                version = res.json().get("version", "?")
                print(f"Judge0 {version} is up after {int(timeout - (deadline - time.time()))}s\n")
                return True
        except Exception:
            pass
        time.sleep(3)
    print(f"Judge0 never answered at {url}\n")
    return False


async def main():
    url = judge_service.JUDGE0_URL
    if not wait_for_judge0(url):
        return 1

    print("1. correct solution, one visible and one hidden case")
    res = await JudgeService.evaluate_submission(CORRECT, "python", CASES, 2000, 128)
    check("status is passed", res["status"] == "passed", res.get("status"))
    check("not pending", res["pending"] is False)
    check("score is 100", res["score"] == 100, str(res["score"]))
    check("two case reports", len(res["test_cases"]) == 2, str(len(res["test_cases"])))
    if len(res["test_cases"]) == 2:
        visible, hidden = res["test_cases"]
        check("visible case echoes stdout", visible.get("stdout", "").strip() == "5", visible.get("stdout"))
        check("hidden case masks stdout even when passing", hidden.get("stdout") == "[Hidden]", hidden.get("stdout"))
        check("hidden case masks input", hidden.get("input") == "[Hidden Test Case]", hidden.get("input"))
        check("hidden case masks expected", hidden.get("expected") == "[Hidden]", hidden.get("expected"))
        check("hidden case still reports pass/fail", hidden.get("passed") is True)
        check("hidden case keeps no stderr key", "stderr" not in hidden)

    print("\n2. wrong solution")
    res = await JudgeService.evaluate_submission(WRONG, "python", CASES, 2000, 128)
    check("status is failed", res["status"] == "failed", res.get("status"))
    check("not pending", res["pending"] is False)
    check("score is 0", res["score"] == 0, str(res["score"]))
    check("visible case shows wrong stdout", res["test_cases"][0].get("stdout", "").strip() == "6")
    check("hidden case masks stdout on failure", res["test_cases"][1].get("stdout") == "[Hidden]")
    check("hidden case reports failure", res["test_cases"][1].get("passed") is False)

    print("\n3. compile error")
    res = await JudgeService.evaluate_submission(BROKEN_C, "c", CASES, 2000, 128)
    check("status is compile_error", res["status"] == "compile_error", res.get("status"))
    check("compile_error text is not empty", bool(res["compile_error"]))
    check("compile_error is not pending", res["pending"] is False)

    print("\n4. judge unreachable must be pending, never failed")
    real = judge_service.JUDGE0_URL
    judge_service.JUDGE0_URL = "http://127.0.0.1:9"  # discard port, refuses instantly
    try:
        res = await JudgeService.evaluate_submission(CORRECT, "python", CASES, 2000, 128)
    finally:
        judge_service.JUDGE0_URL = real
    check("status is pending", res["status"] == "pending", res.get("status"))
    check("pending flag is True", res["pending"] is True)
    check("no case reports", res["test_cases"] == [])
    check("error is recorded", bool(res.get("error")))

    print()
    if failures:
        print(f"{len(failures)} check(s) failed: {', '.join(failures)}")
        return 1
    print("all live grading checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
