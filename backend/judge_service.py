"""
Judge0 Client Service
Asynchronous integration with self-hosted Judge0 CE for trusted code execution.
"""

import os
import base64
import asyncio
import logging
from typing import List, Dict, Any, Optional
import httpx

logger = logging.getLogger(__name__)

JUDGE0_URL = os.environ.get("JUDGE0_URL", "http://127.0.0.1:2358")

# Total time we are willing to wait for a batch to finish before declaring the
# grader unavailable. Scaled per batch in evaluate_submission; this is the floor.
JUDGE0_POLL_BUDGET_SECONDS = float(os.environ.get("JUDGE0_POLL_BUDGET_SECONDS", "30"))
# Ceiling, so a pathological batch cannot hold a request open forever.
JUDGE0_POLL_MAX_SECONDS = float(os.environ.get("JUDGE0_POLL_MAX_SECONDS", "90"))

# Common Judge0 Language IDs (Judge0 standard)
LANGUAGE_MAP: Dict[str, int] = {
    "c": 50,          # C (GCC 9.2.0)
    "cpp": 54,        # C++ (GCC 9.2.0)
    "c++": 54,
    "python": 71,     # Python (3.8.1)
    "python3": 71,
    "py": 71,
    "java": 62,       # Java (OpenJDK 13.0.1)
    "javascript": 63, # JavaScript (Node.js 12.14.0)
    "js": 63,
    "go": 60,         # Go (1.13.5)
    "rust": 73,       # Rust (1.40.0)
    "bash": 46,       # Bash (5.0.0)
}

# Status descriptions
STATUS_ACCEPTED = 3
STATUS_WRONG_ANSWER = 4
STATUS_TIME_LIMIT_EXCEEDED = 5
STATUS_COMPILATION_ERROR = 6
STATUS_RUNTIME_ERROR_SIGSEGV = 7
STATUS_RUNTIME_ERROR_NZEC = 11

def _b64_encode(text: Optional[str]) -> str:
    if not text:
        return ""
    return base64.b64encode(text.encode("utf-8")).decode("utf-8")

def _b64_decode(text: Optional[str]) -> str:
    if not text:
        return ""
    try:
        return base64.b64decode(text.encode("utf-8")).decode("utf-8", errors="replace")
    except Exception:
        return text

class JudgeService:
    @staticmethod
    def get_language_id(lang_name: str) -> int:
        norm = lang_name.lower().strip()
        return LANGUAGE_MAP.get(norm, 50)

    @classmethod
    async def evaluate_submission(
        cls,
        source_code: str,
        language: str,
        test_cases: List[Dict[str, Any]],
        time_limit_ms: int = 2000,
        memory_limit_mb: int = 128,
    ) -> Dict[str, Any]:
        """
        Submits code to Judge0 for all test cases and returns comprehensive results.

        Returns `pending=True` (never a failed verdict) if Judge0 is unreachable
        or the batch does not finish in time.
        """
        lang_id = cls.get_language_id(language)
        cpu_time_limit = max(0.5, float(time_limit_ms) / 1000.0)
        memory_limit_kb = memory_limit_mb * 1024

        if not test_cases:
            # Default smoke test if none provided
            test_cases = [{"id": 1, "input": "", "expected": "", "points": 100, "is_hidden": False}]

        # Prepare batch request
        submissions_payload = []
        b64_source = _b64_encode(source_code)

        for tc in test_cases:
            submissions_payload.append({
                "language_id": lang_id,
                "source_code": b64_source,
                "stdin": _b64_encode(tc.get("input", "")),
                "expected_output": _b64_encode(tc.get("expected", "")),
                "cpu_time_limit": cpu_time_limit,
                "memory_limit": memory_limit_kb,
            })

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                # 1. Post batch
                batch_res = await client.post(
                    f"{JUDGE0_URL}/submissions/batch?base64_encoded=true",
                    json={"submissions": submissions_payload},
                )

                if batch_res.status_code != 201:
                    logger.error(f"Judge0 batch creation failed: {batch_res.status_code} {batch_res.text}")
                    return cls._unavailable_result(test_cases, error=f"Judge0 returned {batch_res.status_code}")

                tokens_data = batch_res.json()
                tokens = [item["token"] for item in tokens_data]
                token_str = ",".join(tokens)

                # 2. Poll until all tokens finish.
                # Budget scales with the work we asked for: two workers running
                # N cases of cpu_time_limit each need roughly N*cpu/2 seconds
                # before queueing even starts to matter.
                budget = min(
                    JUDGE0_POLL_MAX_SECONDS,
                    max(JUDGE0_POLL_BUDGET_SECONDS, len(tokens) * cpu_time_limit * 2),
                )
                deadline = asyncio.get_running_loop().time() + budget
                poll_delay = 0.5
                completed_results = None

                while asyncio.get_running_loop().time() < deadline:
                    await asyncio.sleep(poll_delay)
                    poll_res = await client.get(
                        f"{JUDGE0_URL}/submissions/batch?tokens={token_str}&base64_encoded=true&fields=token,status_id,status,stdout,stderr,compile_output,time,memory"
                    )

                    if poll_res.status_code == 200:
                        data = poll_res.json().get("submissions", [])
                        # Check if any still in queue (status_id <= 2)
                        in_progress = any(item.get("status_id", 1) in (1, 2) for item in data)
                        if not in_progress and len(data) == len(tokens):
                            completed_results = data
                            break

                    poll_delay = min(poll_delay * 1.5, 2.0)

                if not completed_results:
                    return cls._unavailable_result(
                        test_cases,
                        error=f"grader did not finish within {int(budget)}s",
                    )

                # 3. Process results and calculate score
                return cls._format_results(test_cases, completed_results)

        except Exception as e:
            logger.warning(f"Judge0 unreachable ({e}); reporting submission as pending.")
            return cls._unavailable_result(test_cases, error=str(e))

    @classmethod
    def _format_results(
        cls, test_cases: List[Dict[str, Any]], judge_results: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        results = []
        total_score = 0
        max_score = 0
        all_passed = True
        overall_compile_error = None
        total_runtime_ms = 0.0
        max_memory_kb = 0

        for i, tc in enumerate(test_cases):
            pts = int(tc.get("points", 10))
            max_score += pts
            is_hidden = bool(tc.get("is_hidden", False))

            jr = judge_results[i] if i < len(judge_results) else {}
            status_id = jr.get("status_id", 0)
            status_desc = jr.get("status", {}).get("description", "Unknown")

            stdout = _b64_decode(jr.get("stdout"))
            stderr = _b64_decode(jr.get("stderr"))
            compile_out = _b64_decode(jr.get("compile_output"))

            if compile_out and not overall_compile_error:
                overall_compile_error = compile_out

            runtime_s = float(jr.get("time") or 0.0)
            mem_kb = int(jr.get("memory") or 0)
            runtime_ms = int(runtime_s * 1000)

            total_runtime_ms += runtime_ms
            if mem_kb > max_memory_kb:
                max_memory_kb = mem_kb

            passed = (status_id == STATUS_ACCEPTED)
            if passed:
                earned = pts
                total_score += earned
            else:
                earned = 0
                all_passed = False

            test_report = {
                "id": tc.get("id", i + 1),
                "is_hidden": is_hidden,
                "passed": passed,
                "status": status_desc,
                "points": pts,
                "earned_points": earned,
                "runtime_ms": runtime_ms,
                "memory_kb": mem_kb,
            }

            if is_hidden:
                # Mask secret inputs/outputs for hidden test cases. Mask stdout
                # even when the case passes: a passing run means stdout equals
                # the expected output, so echoing it back hands the student the
                # answer for that case.
                test_report["input"] = "[Hidden Test Case]"
                test_report["expected"] = "[Hidden]"
                test_report["stdout"] = "[Hidden]"
            else:
                test_report["input"] = tc.get("input", "")
                test_report["expected"] = tc.get("expected", "")
                test_report["stdout"] = stdout
                if stderr:
                    test_report["stderr"] = stderr

            results.append(test_report)

        return {
            "status": "passed" if all_passed else ("compile_error" if overall_compile_error else "failed"),
            "score": total_score,
            "max_score": max_score,
            "all_passed": all_passed,
            "pending": False,
            "compile_error": overall_compile_error,
            "total_runtime_ms": int(total_runtime_ms),
            "max_memory_kb": max_memory_kb,
            "test_cases": results,
        }

    @classmethod
    def _unavailable_result(
        cls, test_cases: List[Dict[str, Any]], error: str = ""
    ) -> Dict[str, Any]:
        """The grader did not produce a verdict.

        This is deliberately NOT a failed submission. Scoring an infrastructure
        problem as a zero would turn a queue spike into a mass false negative,
        so callers must treat `pending=True` as "ask the student to retry",
        never as a wrong answer.
        """
        return {
            "status": "pending",
            "score": 0,
            "max_score": sum(int(tc.get("points", 10)) for tc in test_cases),
            "all_passed": False,
            "pending": True,
            "compile_error": None,
            "error": error or "grader unavailable",
            "total_runtime_ms": 0,
            "max_memory_kb": 0,
            "test_cases": [],
        }
