"""Tests for the Judge0 client.

These cover the two properties the arena depends on:

1. Hidden test data never appears in a response the student can read.
2. A grader that does not answer is reported as pending, never as a failure.
"""

import base64

import pytest

from judge_service import JudgeService


def _b64(value: str) -> str:
    return base64.b64encode(value.encode()).decode()


def _judge_case(status_id: int, stdout: str = "", compile_output: str = ""):
    return {
        "status_id": status_id,
        "status": {"description": "Accepted" if status_id == 3 else "Wrong Answer"},
        "stdout": _b64(stdout) if stdout else "",
        "stderr": "",
        "compile_output": _b64(compile_output) if compile_output else "",
        "time": "0.010",
        "memory": 1024,
    }


class TestHiddenMasking:
    def test_passing_hidden_case_does_not_leak_stdout(self):
        # A passing case means stdout equals the expected output. Echoing it
        # back would hand the student the answer for that case.
        test_cases = [{"id": 1, "input": "secret", "expected": "42", "points": 10, "is_hidden": True}]
        result = JudgeService._format_results(test_cases, [_judge_case(3, stdout="42")])

        case = result["test_cases"][0]
        assert case["passed"] is True
        assert case["stdout"] == "[Hidden]"
        assert case["input"] == "[Hidden Test Case]"
        assert case["expected"] == "[Hidden]"

    def test_failing_hidden_case_is_masked(self):
        test_cases = [{"id": 1, "input": "secret", "expected": "42", "points": 10, "is_hidden": True}]
        result = JudgeService._format_results(test_cases, [_judge_case(4, stdout="41")])

        case = result["test_cases"][0]
        assert case["passed"] is False
        assert case["stdout"] == "[Hidden]"
        assert case["input"] == "[Hidden Test Case]"

    def test_visible_case_still_returns_its_output(self):
        test_cases = [{"id": 1, "input": "1 2", "expected": "3", "points": 10, "is_hidden": False}]
        result = JudgeService._format_results(test_cases, [_judge_case(3, stdout="3")])

        case = result["test_cases"][0]
        assert case["stdout"] == "3"
        assert case["input"] == "1 2"
        assert case["expected"] == "3"

    def test_compile_error_is_reported_without_test_data(self):
        test_cases = [{"id": 1, "input": "secret", "expected": "42", "points": 10, "is_hidden": True}]
        result = JudgeService._format_results(
            test_cases, [_judge_case(6, compile_output="main.c:1: error: expected ';'")]
        )

        assert result["status"] == "compile_error"
        assert "expected ';'" in result["compile_error"]
        assert result["test_cases"][0]["input"] == "[Hidden Test Case]"


class TestPendingIsNotFailure:
    def test_unavailable_result_is_pending_and_carries_no_cases(self):
        test_cases = [{"id": 1, "input": "secret", "expected": "42", "points": 10, "is_hidden": True}]
        result = JudgeService._unavailable_result(test_cases, error="connection refused")

        assert result["pending"] is True
        assert result["status"] == "pending"
        assert result["test_cases"] == []
        assert result["score"] == 0

    def test_successful_batch_is_not_pending(self):
        test_cases = [{"id": 1, "input": "1", "expected": "1", "points": 10}]
        result = JudgeService._format_results(test_cases, [_judge_case(3, stdout="1")])
        assert result["pending"] is False


class _ExplodingClient:
    """Stands in for an unreachable Judge0."""

    def __init__(self, *args, **kwargs):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *exc):
        return False

    async def post(self, *args, **kwargs):
        raise ConnectionError("judge0 is down")


@pytest.mark.asyncio
async def test_unreachable_judge0_reports_pending(monkeypatch):
    import judge_service

    monkeypatch.setattr(judge_service.httpx, "AsyncClient", _ExplodingClient)
    result = await JudgeService.evaluate_submission(
        source_code="int main(){}",
        language="c",
        test_cases=[{"id": 1, "input": "1", "expected": "1", "points": 10}],
    )

    assert result["pending"] is True
    assert result["status"] == "pending"


@pytest.mark.asyncio
async def test_empty_test_list_does_not_raise(monkeypatch):
    # Regression: the default smoke test used `false` (JS) instead of `False`,
    # which raised NameError before any request was made.
    import judge_service

    monkeypatch.setattr(judge_service.httpx, "AsyncClient", _ExplodingClient)
    result = await JudgeService.evaluate_submission(
        source_code="int main(){}", language="c", test_cases=[]
    )

    assert result["pending"] is True
