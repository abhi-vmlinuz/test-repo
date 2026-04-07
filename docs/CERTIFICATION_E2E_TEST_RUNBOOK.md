# ZXCPPT LMS -> CTF Certification Exam E2E Test Runbook

Last updated: 2026-03-27

## Purpose

This document defines the full end-to-end test flow for the ZXCPPT certification pipeline:

- LMS final exam (MCQ)
- CTF lab challenges
- report upload and admin grading
- student final result visibility

Use this before releases and after any certification-related change.

## Current rules (source of truth)

- Weights: MCQ 30%, Lab 50%, Report 20%
- Report unlock threshold: lab score >= 80
- Pass rule: final weighted score >= 75
- Certification levels:
  - Associate: 75.00-84.99
  - Professional: 85.00-94.99
  - Elite: >=95.00
- Student should still see graded attempts in `student/certification-exams`
- Exam should disappear for students only when exam config is removed by admin

## Test accounts and roles

- Admin account (`admin`/`superadmin`)
- Student account A (primary test user)
- Optional Student account B (parallel/concurrency checks)

## Required setup

1. Create/publish one certification exam config in admin panel.
2. Ensure pools A/B/C each have exactly 7 challenges totaling 120 points.
3. Link to an LMS final exam.
4. Ensure student is enrolled/redeemed via LMS flow.

## Quick smoke checklist (release gate)

- [ ] LMS redemption creates certification attempt
- [ ] MCQ completion syncs score into CTF
- [ ] Student sees exam card in certification exams page
- [ ] Lab starts and challenge order is randomized
- [ ] Multi-question challenge supports out-of-order solving
- [ ] Challenge points awarded only when full challenge is completed
- [ ] Report unlocks at lab score >= 80
- [ ] Report upload accepts PDF/DOCX, fails cleanly for invalid file
- [ ] Admin can download submitted report
- [ ] Admin grading succeeds and computes final score
- [ ] Student sees graded result and correct pass/fail outcome
- [ ] Graded exam still visible to student

## Detailed test flow

## 1) Admin exam setup

Steps:
1. Go to admin certification exams.
2. Create/update exam config with pools and publish it.

Expected:
- Exam appears in admin list.
- No validation errors for pool counts/points.

## 2) LMS redemption -> attempt creation

Steps:
1. Redeem exam from LMS as Student A.
2. Open CTF `student/certification-exams`.

Expected:
- Exam card exists.
- Status is pre-lab (e.g. `MCQ_PENDING`/`MCQ_COMPLETED` depending on LMS completion state).

## 3) MCQ completion sync

Steps:
1. Complete LMS final exam.
2. Refresh CTF certification exams page.

Expected:
- MCQ score is visible.
- `Start Lab` action is available.

## 4) Lab start and progression

Steps:
1. Start lab from student page.
2. Confirm challenge list loads.
3. Submit answers across challenge types:
   - single-flag challenge
   - multi-question challenge (solve Q2 before Q1)

Expected:
- Out-of-order question submissions are accepted.
- Partial progress does not mark challenge solved.
- Challenge marked solved only when all required answers are correct.
- Points awarded on full completion only.

## 5) Report unlock behavior

Steps:
1. Reach lab score exactly 80.00 and refresh.
2. Keep solving to >80 and refresh again.

Expected:
- Report unlocks at >=80 (not strictly >80).
- `REPORT_PENDING` still allows `Continue Lab` where applicable.

## 6) Report upload

Steps:
1. Open report page.
2. Upload valid PDF and DOCX in separate runs.
3. Try invalid file type (`.txt`) and oversized file (>50MB).

Expected:
- Valid uploads succeed.
- Invalid files are rejected with clear errors.
- No internal storage path leakage in student UI.

## 7) Admin review and download

Steps:
1. Open pending reports in admin panel.
2. Open one attempt and download report.

Expected:
- Report details page loads (no blank page).
- Download opens correct file.
- Filename shown without exposing internal filesystem path.

## 8) Admin grading

Steps:
1. Grade all five rubric criteria.
2. Submit grade.

Expected:
- Grading submission succeeds.
- Final score is computed correctly.
- Pass/fail follows final score >=75.
- Level mapping follows 75/85/95 boundaries.

## 9) Student post-grading visibility

Steps:
1. Login as student and open certification exams.
2. Open status page.

Expected:
- Graded exam remains visible.
- Pass/fail badge matches final score policy.
- Status page and exam card are consistent.

## 10) Exam deletion behavior

Steps:
1. Delete exam config from admin.
2. Refresh student certification exams list.

Expected:
- Exam no longer appears for student.

## Edge and regression scenarios

- [ ] Timezone-safe date handling (no offset-aware vs offset-naive crashes)
- [ ] No `Failed to load certification exams` after grading
- [ ] No blank page after admin grading submit
- [ ] Report upload field compatibility (`file` multipart key)
- [ ] Admin report details API/frontend schema compatibility
- [ ] `GRADED` records from old policy still render correct pass/fail by final score

## Suggested test data matrix

Run at least these grading outcomes:

1. Final score `74.99` -> FAIL
2. Final score `75.00` -> PASS (Associate)
3. Final score `85.00` -> PASS (Professional)
4. Final score `95.00` -> PASS (Elite)

## Optional DB verification queries

Use read-only checks in PostgreSQL:

```sql
SELECT id, "userId", "examConfigId", status, "mcqScore", "labScore", "reportTotalScore", "finalScore", passed, "certificationLevel"
FROM certification_exam_attempts
WHERE "userId" = '<student-id>'
ORDER BY "redeemedAt" DESC;
```

```sql
SELECT id, name, "passThreshold", "labMinThreshold", "reportMinThreshold", "associateMin", "professionalMin", "eliteMin"
FROM certification_exam_configs
ORDER BY "createdAt" DESC;
```

## Troubleshooting

- If student list fails to load:
  - check backend logs for datetime subtraction errors
  - verify `GET /api/student/certification-exams` response
- If report download fails:
  - verify `report_file_url` exists in admin report details API response
- If pass/fail looks wrong:
  - verify final score and 75 threshold
  - verify UI is latest build and hard refresh browser

## Sign-off template

Release candidate: `<version/commit>`

- Tester:
- Date:
- Environment:
- Result: PASS / FAIL
- Notes:
