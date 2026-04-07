# ZXCPPT CERTIFICATION EXAM SYSTEM - FINAL IMPLEMENTATION PLAN

**Date Created:** 2026-03-25  
**System Architecture:** Two-Platform Integration (LMS + CTF)  
**Database:** Shared `zecurx_platform` PostgreSQL  
**Estimated Timeline:** 39-49 hours of development

---

## Executive Summary

### Architecture Overview

**Two-Platform Integration:**
- **LMS Platform**: Handles MCQ component (60 questions, 60 minutes)
- **CTF Platform**: Handles Lab challenges (7 challenges, 12 hours) + Report upload (3 hours)
- **Shared Database**: `certification_exam_attempts` table in `zecurx_platform` PostgreSQL for cross-platform state synchronization

**Pool System:**
- Admin creates 3 pools (A, B, C) per exam
- Each pool contains exactly 7 challenges totaling 120 points
- Students are randomly assigned ONE pool when starting lab
- Pool assignment is HIDDEN from students (visible to admins for analytics)
- Challenge order within pool is randomized per student
- Pools can have overlapping challenges

**Timing:**
- **Global Timer**: 48 hours from LMS code redemption
- **CTF Lab Timer**: 12 hours from lab start (or remaining global time, whichever is less)
- **Report Upload Timer**: 3 hours from unlock (or remaining global time, whichever is less)
- **Hard Cutoff**: At 48-hour mark, progress auto-saved and graded

**Scoring:**
- **MCQ**: 30% weight (NO negative marking - simply correct/total × 100)
- **Lab**: 50% weight (auto-scored based on flag submissions)
- **Report**: 20% weight (manual grading by admin - 5 criteria)
- **Final Score**: (MCQ × 0.3) + (Lab × 0.5) + (Report × 0.2)

**Passing Criteria:**
- Total score ≥ 70% AND
- Lab score ≥ 60% AND
- Report score ≥ 60%

**Certification Levels:**
- **Associate**: 70-79.99%
- **Professional**: 80-89.99%
- **Elite**: 90%+

---

## Key Design Decisions (Finalized)

| Decision Point | Choice | Rationale |
|---|---|---|
| **MCQ Negative Marking** | ❌ NO negative marking | Simpler scoring, focus on knowledge |
| **Pool System** | 3 pools (A, B, C) per exam | Prevents cheating, maintains fairness |
| **Pool Assignment** | Random (pure random, not balanced) | Simplicity over distribution control |
| **Pool Visibility** | Hidden from students | Prevents "Pool A solutions" sharing |
| **Challenge Overlap** | ✅ Allowed across pools | Admin flexibility in challenge selection |
| **MCQ Wrong Tracking** | ✅ Track for analytics | Useful data, not used in scoring |
| **Exam Config Reuse** | ❌ New config per cohort | Prevents exam becoming easier over time |
| **Timer Enforcement** | Hard cutoff at 48h | Maintains discipline, auto-saves progress |
| **Certificate Generation** | Manual issuance by admin | No auto-generation needed for MVP |
| **Proctoring** | Basic logging (IP, user agent) | Lightweight, non-intrusive |
| **Report Storage** | Local filesystem | `/uploads/certification-reports/` |

---

## Database Schema - FINAL VERSION

### Prisma Schema

```prisma
// Exam Templates (one per cohort, pools are NOT reused)
model CertificationExamConfig {
  id                    String   @id @default(uuid())
  name                  String   // "ZXCPPT January 2026"
  examType              String   @default("ZXCPPT")
  
  // LMS Integration
  lmsFinalExamId        String   @unique
  
  // THREE POOLS - Each with exactly 7 challenges (120 points)
  // Pools can have overlapping challenges
  poolAChallengeIds     String[] // 7 UUIDs
  poolBChallengeIds     String[] // 7 UUIDs
  poolCChallengeIds     String[] // 7 UUIDs
  
  totalLabPoints        Int      @default(120)
  
  // Timing Configuration
  globalDurationHours   Int      @default(48)
  ctfDurationHours      Int      @default(12)
  reportDurationHours   Int      @default(3)
  
  // Scoring Weights
  mcqWeight             Decimal  @default(0.30)
  labWeight             Decimal  @default(0.50)
  reportWeight          Decimal  @default(0.20)
  
  // Passing Criteria
  passThreshold         Decimal  @default(70.00)
  labMinThreshold       Decimal  @default(60.00)
  reportMinThreshold    Decimal  @default(60.00)
  labUnlockReportThreshold Decimal @default(80.00)
  
  // Certification Levels
  associateMin          Decimal  @default(70.00)
  professionalMin       Decimal  @default(80.00)
  eliteMin              Decimal  @default(90.00)
  
  isPublished           Boolean  @default(false)
  createdById           String?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  attempts              CertificationExamAttempt[]
  
  @@index([lmsFinalExamId])
  @@map("certification_exam_configs")
}

// Individual Student Attempts
model CertificationExamAttempt {
  id                     String   @id @default(uuid())
  userId                 String
  examConfigId           String
  
  // Pool Assignment (HIDDEN from student)
  assignedPool           String   // 'A', 'B', or 'C' - randomly assigned
  
  // Global Timing (LMS-driven)
  redeemedAt             DateTime
  globalExpiresAt        DateTime // redeemedAt + 48 hours
  
  // MCQ Component (30%) - NO NEGATIVE MARKING
  mcqScore               Decimal? @db.Decimal(5,2) // (Correct / Total) × 100
  mcqCorrect             Int?
  mcqWrong               Int?     // For analytics only, not used in scoring
  mcqTotal               Int      @default(60)
  mcqCompletedAt         DateTime?
  lmsFinalExamAttemptId  String?  @unique
  
  // Lab Component (50%)
  labStartedAt           DateTime?
  labExpiresAt           DateTime? // min(labStartedAt + 12h, globalExpiresAt)
  labPointsEarned        Int      @default(0)
  labTotalPoints         Int      @default(120)
  labScore               Decimal? @db.Decimal(5,2) // (labPointsEarned / 120) × 100
  labCompletedChallenges Json?    // [{challenge_id, title, difficulty, points, solved_at}]
  labChallengeOrder      Int[]    // Randomized indices [0-6] for assigned pool
  labCompletedAt         DateTime?
  
  // Report Component (20%)
  reportUnlockedAt       DateTime? // When labScore >= 80%
  reportExpiresAt        DateTime? // min(reportUnlockedAt + 3h, globalExpiresAt)
  reportFileUrl          String?
  reportUploadedAt       DateTime?
  reportClarityScore     Int?     // 0-20
  reportTechnicalScore   Int?     // 0-25
  reportReproducibilityScore Int? // 0-25
  reportImpactScore      Int?     // 0-15
  reportRemediationScore Int?     // 0-15
  reportTotalScore       Decimal? @db.Decimal(5,2)
  reportGradedAt         DateTime?
  reportGradedById       String?
  reportFeedback         String?  @db.Text
  
  // Final Result
  finalScore             Decimal? @db.Decimal(5,2)
  passed                 Boolean?
  certificationLevel     String?  // 'Associate', 'Professional', 'Elite'
  
  // Metadata
  ipAddress              String?
  userAgent              String?  @db.Text
  proctoringLogs         Json?    // [{event_type, timestamp, ip, user_agent}]
  
  // Status Tracking
  status                 String   @default("mcq_pending")
  // Values: mcq_pending, mcq_completed, lab_in_progress, lab_completed,
  //         report_pending, report_uploaded, pending_review, graded, expired
  
  createdAt              DateTime @default(now())
  updatedAt              DateTime @updatedAt
  
  user                   User     @relation(fields: [userId], references: [id])
  examConfig             CertificationExamConfig @relation(fields: [examConfigId], references: [id])
  
  @@unique([userId, examConfigId])
  @@index([userId])
  @@index([status])
  @@index([examConfigId])
  @@index([assignedPool])
  @@map("certification_exam_attempts")
}
```

---

## Complete Workflow - Step by Step

### Phase 1: Exam Setup (Admin)

1. **Create MCQ Exam in LMS**
   - Navigate to LMS admin panel
   - Create Final Exam with 60 questions
   - Set duration: 60 minutes
   - Note the LMS exam ID

2. **Create Certification Exam in CTF**
   - Navigate to CTF admin panel → Certification Exams
   - Click "Create New Exam"
   - Enter exam name: "ZXCPPT January 2026"
   - Select LMS Final Exam from dropdown
   - **Select Pool A challenges** (7 challenges, 120 points):
     - Example: 3 Easy (30), 2 Medium (40), 2 Hard (60) = 130 pts ❌
     - Valid: 2 Easy (20), 3 Medium (60), 2 Hard (60) = 140 pts ❌
     - Valid: 3 Easy (30), 3 Medium (60), 1 Hard (30) = 120 pts ✅
   - **Select Pool B challenges** (7 challenges, 120 points)
   - **Select Pool C challenges** (7 challenges, 120 points)
   - Publish exam

3. **Enroll Students**
   - Students enrolled in LMS course automatically eligible
   - Admin generates access codes in LMS

### Phase 2: Student Exam Journey

**Step 1: LMS MCQ (T=0)**
- Student receives access code via email
- Student logs into LMS
- Student redeems access code → **48-hour global timer starts**
- **Background**: LMS creates record in `certification_exam_attempts` table
- Student completes 60 MCQ questions in 60 minutes
- LMS calculates score: `(Correct / 60) × 100` (NO negative marking)
- **Background**: LMS updates `mcqScore`, `mcqCompletedAt`, `status = 'mcq_completed'`

**Step 2: CTF Lab (T=1h, 47h global remaining)**
- Student logs into CTF platform (same email as LMS)
- Navigates to "Certification Exams" page
- Sees exam card:
  ```
  [ZXCPPT January 2026]
  MCQ: ✓ Complete (85%)
  Lab: Not Started
  Report: Locked
  Time Remaining: 47h 12m
  [Start Lab Exam]
  ```
- Clicks "Start Lab Exam"
- **Background**: System randomly assigns pool (A, B, or C)
- **Background**: System randomizes challenge order within pool
- **Background**: CTF timer starts (12 hours OR 47h global remaining, whichever is less)
- Student sees 7 challenges in random order (pool letter NOT shown)
- Student solves challenges, submits flags
- **Real-time scoring**: Each correct flag updates `labPointsEarned`, `labScore`

**Step 3: Report Upload (T=7h, 41h global remaining)**
- When `labScore ≥ 80%`, "Upload Report" button becomes active
- **Background**: `reportUnlockedAt` set, 3-hour timer starts
- Student uploads PDF/DOCX report
- **Background**: File saved to `/uploads/certification-reports/{userId}/{attemptId}/report.pdf`
- **Background**: Status changes to `report_uploaded`

**Step 4: Admin Grading**
- Admin navigates to "Pending Reports" in CTF admin panel
- Clicks on student report
- PDF viewer opens on left, grading form on right
- Admin scores 5 criteria:
  - Clarity: 18/20
  - Technical Accuracy: 22/25
  - Reproducibility: 23/25
  - Impact Explanation: 13/15
  - Remediation: 12/15
  - **Total Report Score**: 88/100
- Admin enters optional feedback
- Clicks "Submit Grade"

**Step 5: Final Calculation (Automatic)**
```
MCQ:    85% × 0.30 = 25.5%
Lab:    75% × 0.50 = 37.5%
Report: 88% × 0.20 = 17.6%
─────────────────────────
Final:  80.6%

Passing Check:
✓ Final score (80.6%) ≥ 70%
✓ Lab score (75%) ≥ 60%
✓ Report score (88%) ≥ 60%

Result: PASSED
Certification Level: Professional (80-89.99%)
```

**Step 6: Student Views Results**
- Student navigates to "Results" page
- Sees detailed score breakdown
- Sees certification level
- Reads admin feedback

---

## Implementation Phases

### PHASE 1: Database Setup ⏱️ 2-3 hours

**Objective**: Create shared database tables in `zecurx_platform`

**Tasks:**

1. Update Prisma schema (both LMS and CTF)
2. Generate migrations
3. Test migrations locally
4. Verify foreign keys and indexes

**Files to Modify:**
- `/home/elish4h/zecurx/services/zecurx-lms/backend/prisma/schema.prisma`
- `/home/elish4h/zecurx/services/zecurx-ctf/backend/prisma/schema.prisma`

**Commands:**
```bash
# LMS
cd /home/elish4h/zecurx/services/zecurx-lms/backend
npx prisma migrate dev --name add_certification_exam_tables

# CTF
cd /home/elish4h/zecurx/services/zecurx-ctf/backend
npx prisma migrate dev --name add_certification_exam_tables
```

**Success Criteria:**
- ✅ Tables exist in local database
- ✅ Both LMS and CTF can query tables
- ✅ Indexes created correctly
- ✅ Foreign keys working

---

### PHASE 2: LMS Backend Integration ⏱️ 2-3 hours

**Objective**: LMS creates attempt records and updates MCQ scores (no negative marking)

**Tasks:**

1. Hook into exam redemption (`redeemCode()` method)
   - Check if exam is linked to certification config
   - Create `certification_exam_attempts` record
   - Set 48-hour global timer

2. Hook into exam submission (`submitExam()` method)
   - Calculate MCQ score WITHOUT negative marking: `(correct / total) × 100`
   - Update `mcqScore`, `mcqCorrect`, `mcqWrong` (analytics only)
   - Set `status = 'mcq_completed'`

**Files to Modify:**
- `/home/elish4h/zecurx/services/zecurx-lms/backend/src/final-exam/final-exam.service.ts`

**Code Snippets:**

```typescript
// In redeemCode() method
const certConfig = await this.prisma.certificationExamConfig.findUnique({
  where: { lmsFinalExamId: examId }
});

if (certConfig) {
  const redeemedAt = new Date();
  await this.prisma.certificationExamAttempt.create({
    data: {
      userId,
      examConfigId: certConfig.id,
      redeemedAt,
      globalExpiresAt: new Date(redeemedAt.getTime() + 48 * 60 * 60 * 1000),
      lmsFinalExamAttemptId: attempt.id,
      status: 'mcq_pending',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    }
  });
}
```

```typescript
// In submitExam() method
const correctCount = answers.filter(a => a.isCorrect).length;
const mcqScore = (correctCount / totalQuestions) * 100;

const certAttempt = await this.prisma.certificationExamAttempt.findUnique({
  where: { lmsFinalExamAttemptId: attempt.id }
});

if (certAttempt) {
  await this.prisma.certificationExamAttempt.update({
    where: { id: certAttempt.id },
    data: {
      mcqScore: mcqScore,
      mcqCorrect: correctCount,
      mcqWrong: totalQuestions - correctCount,
      mcqCompletedAt: new Date(),
      status: 'mcq_completed'
    }
  });
}
```

**Success Criteria:**
- ✅ Redeeming code creates certification attempt
- ✅ MCQ score calculated without negative marking
- ✅ Status updates correctly
- ✅ 48-hour timer set

---

### PHASE 3: CTF Backend - Admin API ⏱️ 5-6 hours

**Objective**: Admin can create exams, select challenges for 3 pools

**Tasks:**

1. Create admin route group
2. Implement validation logic (7 challenges, 120 points per pool)
3. Create CRUD endpoints for exam configs
4. Implement available challenges endpoint

**Files to Modify:**
- `/home/elish4h/zecurx/services/zecurx-ctf/backend/server.py`

**API Endpoints:**

```python
# Get available challenges grouped by difficulty
GET /api/admin/certification-exams/available-challenges
Response: {
  "easy": [{"id", "title", "category", "difficulty", "points": 10}],
  "medium": [{"id", "title", "category", "difficulty", "points": 20}],
  "hard": [{"id", "title", "category", "difficulty", "points": 30}]
}

# Create exam config
POST /api/admin/certification-exams
Body: {
  "name": "ZXCPPT January 2026",
  "lms_final_exam_id": "uuid",
  "pool_a_challenge_ids": ["uuid1", "uuid2", ...], // 7 challenges
  "pool_b_challenge_ids": [...], // 7 challenges
  "pool_c_challenge_ids": [...] // 7 challenges
}
Validation: Each pool must have exactly 7 challenges totaling 120 points

# List exams
GET /api/admin/certification-exams

# Get exam details
GET /api/admin/certification-exams/{id}

# Update exam
PUT /api/admin/certification-exams/{id}

# Delete exam
DELETE /api/admin/certification-exams/{id}

# Publish exam
PUT /api/admin/certification-exams/{id}/publish

# List student attempts
GET /api/admin/certification-exams/{id}/attempts
```

**Validation Helper:**

```python
def validate_pool(challenge_ids: List[str]) -> tuple[bool, str, int]:
    """Validate pool has exactly 7 challenges totaling 120 points"""
    if len(challenge_ids) != 7:
        return False, f"Pool must have exactly 7 challenges", 0
    
    total_points = 0
    for challenge_id in challenge_ids:
        challenge = await get_challenge(challenge_id)
        if challenge.difficulty == 'easy': total_points += 10
        elif challenge.difficulty == 'medium': total_points += 20
        elif challenge.difficulty == 'hard': total_points += 30
    
    if total_points != 120:
        return False, f"Pool must total 120 points (has {total_points})", 0
    
    return True, "", total_points
```

**Success Criteria:**
- ✅ Admin can fetch available challenges
- ✅ Admin can create exam with 3 pools
- ✅ Validation enforces 7 challenges, 120 points per pool
- ✅ Pools can have overlapping challenges
- ✅ CRUD operations working

---

### PHASE 4: CTF Backend - Student Lab Flow ⏱️ 6-7 hours

**Objective**: Students discover exams, start lab, submit flags, auto-scoring

**Tasks:**

1. Student exam discovery endpoint
2. Start lab exam (CRITICAL - pool assignment logic)
3. Submit flag endpoint (auto-scoring + report unlock)
4. Timer utility function

**Files to Modify:**
- `/home/elish4h/zecurx/services/zecurx-ctf/backend/server.py`

**API Endpoints:**

```python
# Get student's enrolled exams
GET /api/student/certification-exams
Response: [{
  "id": "exam-id",
  "name": "ZXCPPT January 2026",
  "attemptId": "attempt-id",
  "status": "mcq_completed",
  "timeRemaining": {
    "global": 169200,  // seconds
    "ctf": null,       // not started
    "report": null
  },
  "components": {
    "mcq": {"completed": true, "score": 85},
    "lab": {"started": false, "score": null},
    "report": {"unlocked": false, "uploaded": false}
  }
}]

# Start lab exam (assigns pool, starts timer)
POST /api/student/certification-exams/{exam_id}/start-lab
Response: {
  "attemptId": "uuid",
  "challenges": [
    {"id", "title", "description", "difficulty", "points", "category", "hints", "has_docker"}
  ],
  "timeRemaining": 43200  // 12 hours in seconds
}
Note: assignedPool NOT returned (hidden from student)

# Submit flag
POST /api/student/certification-exams/attempts/{attempt_id}/submit
Body: {"challenge_id": "uuid", "flag": "CTF{...}"}
Response: {
  "correct": true,
  "points": 20,
  "labPointsEarned": 60,
  "labScore": 50.0,
  "reportUnlocked": false
}
```

**Critical Pool Assignment Logic:**

```python
# RANDOM POOL ASSIGNMENT
assigned_pool = random.choice(['A', 'B', 'C'])

# Get challenges for assigned pool
if assigned_pool == 'A':
    challenge_ids = exam_config.pool_a_challenge_ids
elif assigned_pool == 'B':
    challenge_ids = exam_config.pool_b_challenge_ids
else:  # Pool C
    challenge_ids = exam_config.pool_c_challenge_ids

# RANDOMIZE ORDER within pool
randomized_order = list(range(7))
random.shuffle(randomized_order)

# Calculate lab expiration (12h OR global expiration, whichever earlier)
ctf_12h = now + timedelta(hours=12)
lab_expires_at = min(ctf_12h, attempt.global_expires_at)

# Update attempt
await update_attempt(
    assignedPool=assigned_pool,
    labStartedAt=now,
    labExpiresAt=lab_expires_at,
    labChallengeOrder=randomized_order,
    status='lab_in_progress'
)
```

**Report Unlock Logic:**

```python
new_score = (new_points / 120) * 100

if new_score >= 80 and attempt.report_unlocked_at is None:
    report_3h = now + timedelta(hours=3)
    report_expires_at = min(report_3h, attempt.global_expires_at)
    
    update_data['reportUnlockedAt'] = now
    update_data['reportExpiresAt'] = report_expires_at
    update_data['status'] = 'report_pending'
```

**Success Criteria:**
- ✅ Student can discover enrolled exams
- ✅ Student can start lab → Random pool assigned
- ✅ Pool assignment hidden from student
- ✅ Challenges randomized within pool
- ✅ 12h timer starts (or global remaining, whichever less)
- ✅ Flag submission updates score in real-time
- ✅ Report unlocks at 80% lab score

---

### PHASE 5: CTF Backend - Report Upload & Grading ⏱️ 4-5 hours

**Objective**: Students upload reports, admins grade, final scores calculated

**Tasks:**

1. Report upload endpoint
2. Admin grading endpoints
3. Final score calculation logic

**Files to Modify:**
- `/home/elish4h/zecurx/services/zecurx-ctf/backend/server.py`

**API Endpoints:**

```python
# Upload report
POST /api/student/certification-exams/attempts/{attempt_id}/report
Form-data: {file: File (PDF/DOCX, max 50MB)}
Response: {
  "success": true,
  "reportUrl": "/uploads/...",
  "uploadedAt": "2026-01-15T10:30:00Z"
}

# Get pending reports (admin)
GET /api/admin/certification-exams/reports/pending
Response: [{
  "attemptId": "uuid",
  "studentName": "John Doe",
  "studentEmail": "john@example.com",
  "examName": "ZXCPPT January 2026",
  "mcqScore": 85,
  "labScore": 75,
  "labPointsEarned": 90,
  "reportUploadedAt": "2026-01-15T10:30:00Z",
  "reportFileUrl": "/uploads/..."
}]

# Get report details (admin)
GET /api/admin/certification-exams/reports/{attempt_id}

# Grade report (admin)
POST /api/admin/certification-exams/reports/{attempt_id}/grade
Body: {
  "clarity": 18,           // 0-20
  "technical": 22,         // 0-25
  "reproducibility": 23,   // 0-25
  "impact": 13,            // 0-15
  "remediation": 12,       // 0-15
  "feedback": "Great work, clear explanations..."
}
Response: {
  "success": true,
  "reportScore": 88,
  "finalScore": 80.6,
  "passed": true,
  "certificationLevel": "Professional",
  "breakdown": {
    "mcq": "85% × 0.30 = 25.5%",
    "lab": "75% × 0.50 = 37.5%",
    "report": "88% × 0.20 = 17.6%"
  }
}
```

**Final Score Calculation:**

```python
# Calculate report total
report_total = clarity + technical + reproducibility + impact + remediation

# Calculate weighted contributions
mcq_contribution = (mcq_score or 0) * 0.30
lab_contribution = (lab_score or 0) * 0.50
report_contribution = report_total * 0.20

final_score = mcq_contribution + lab_contribution + report_contribution

# Determine pass/fail
passed = (
    final_score >= 70.00 and
    (lab_score or 0) >= 60.00 and
    report_total >= 60.00
)

# Determine certification level
certification_level = None
if passed:
    if final_score >= 90:
        certification_level = 'Elite'
    elif final_score >= 80:
        certification_level = 'Professional'
    else:  # 70-79.99
        certification_level = 'Associate'
```

**Success Criteria:**
- ✅ Students can upload PDF/DOCX (max 50MB)
- ✅ Upload only when lab score ≥ 80%
- ✅ Upload deadline enforced
- ✅ Admins see pending reports
- ✅ Admins can grade with 5 criteria
- ✅ Final score calculated correctly
- ✅ Pass/fail determined
- ✅ Certification level assigned

---

### PHASE 6: CTF Frontend - Admin Panel ⏱️ 8-10 hours

**Objective**: Admin UI for creating exams, monitoring attempts, grading reports

**Components to Create:**

1. **Exam List Page** (`/admin/certification-exams`)
   - Table: Name, Type, LMS Exam ID, Published, Students, Actions
   - Actions: Edit, View Attempts, Publish/Unpublish, Delete

2. **Exam Form** (`/admin/certification-exams/new`, `/{id}/edit`)
   - Input: Exam name
   - Dropdown: LMS Final Exam
   - Pool A selector (7 challenges, 120 points)
   - Pool B selector (7 challenges, 120 points)
   - Pool C selector (7 challenges, 120 points)
   - Real-time validation display

3. **Pool Selector Component** (`components/PoolSelector.tsx`)
   - Dropdown grouped by difficulty
   - Selected challenges list
   - Real-time point calculation
   - Remove buttons

4. **Attempts Monitoring** (`/admin/certification-exams/{id}/attempts`)
   - Table: Student, Pool (admin sees this), MCQ, Lab, Report, Final, Passed
   - Filters: Status, Pass/Fail, Pool
   - Export CSV

5. **Report Grading Interface** (`/admin/certification-exams/reports/{attemptId}/grade`)
   - Left panel: PDF viewer (iframe)
   - Right panel: Grading form
     - 5 sliders + number inputs (Clarity 0-20, Technical 0-25, etc.)
     - Auto-calculated total
     - Feedback textarea
     - Final score preview
   - Submit button

**Files to Create:**
- `/home/elish4h/zecurx/services/zecurx-ctf/frontend/src/pages/admin/CertificationExams.tsx`
- `/home/elish4h/zecurx/services/zecurx-ctf/frontend/src/pages/admin/CertificationExamForm.tsx`
- `/home/elish4h/zecurx/services/zecurx-ctf/frontend/src/pages/admin/CertificationAttempts.tsx`
- `/home/elish4h/zecurx/services/zecurx-ctf/frontend/src/pages/admin/ReportGrading.tsx`
- `/home/elish4h/zecurx/services/zecurx-ctf/frontend/src/components/PoolSelector.tsx`
- `/home/elish4h/zecurx/services/zecurx-ctf/frontend/src/components/GradingCriterion.tsx`

**Success Criteria:**
- ✅ Admin can create exam with 3 pools
- ✅ Pool validation works (7 challenges, 120 points)
- ✅ Admin can publish/unpublish
- ✅ Admin can view attempts with pool info
- ✅ Admin can grade reports with PDF viewer
- ✅ Final score preview updates in real-time

---

### PHASE 7: CTF Frontend - Student Panel ⏱️ 8-10 hours

**Objective**: Student UI for taking exam, viewing progress, uploading report

**Components to Create:**

1. **Exam Dashboard** (`/student/certification-exams`)
   - Card layout
   - Component status display (MCQ ✓, Lab, Report)
   - Timer display
   - Action buttons (Start Lab, Continue Lab, Upload Report, View Results)

2. **Lab Exam Room** (`/student/certification-exams/attempts/{id}/lab`)
   - Top bar: Timer, Score progress
   - Challenge grid (7 cards, randomized order)
   - Challenge modal: Description, hints, flag submission
   - Real-time score updates
   - **CRITICAL**: Pool letter NOT displayed

3. **Report Upload Page** (`/student/certification-exams/attempts/{id}/report`)
   - Unlock condition check (80% lab score)
   - Drag-and-drop file upload
   - Timer countdown
   - File validation (PDF/DOCX, max 50MB)

4. **Results Page** (`/student/certification-exams/attempts/{id}/results`)
   - Score breakdown table
   - Pass/fail status
   - Certification level (if passed)
   - Admin feedback
   - Lab challenges list

**Files to Create:**
- `/home/elish4h/zecurx/services/zecurx-ctf/frontend/src/pages/student/CertificationExams.tsx`
- `/home/elish4h/zecurx/services/zecurx-ctf/frontend/src/pages/student/CertificationLab.tsx`
- `/home/elish4h/zecurx/services/zecurx-ctf/frontend/src/pages/student/CertificationReport.tsx`
- `/home/elish4h/zecurx/services/zecurx-ctf/frontend/src/pages/student/CertificationResults.tsx`
- `/home/elish4h/zecurx/services/zecurx-ctf/frontend/src/components/ExamCard.tsx`
- `/home/elish4h/zecurx/services/zecurx-ctf/frontend/src/components/Timer.tsx`
- `/home/elish4h/zecurx/services/zecurx-ctf/frontend/src/components/ChallengeCard.tsx`
- `/home/elish4h/zecurx/services/zecurx-ctf/frontend/src/components/ScoreBreakdown.tsx`

**UI Requirements:**
- Pool assignment MUST be hidden from student
- Challenges displayed in randomized order
- Timer updates every second
- Score updates immediately on flag submission
- Report unlock clearly indicated at 80%

**Success Criteria:**
- ✅ Student sees enrolled exams automatically
- ✅ Student can start lab (pool hidden)
- ✅ Timer displays correctly
- ✅ Student can submit flags
- ✅ Real-time score updates
- ✅ Report unlocks at 80%
- ✅ Report upload enforces deadline
- ✅ Results page shows detailed breakdown

---

### PHASE 8: Testing & Deployment ⏱️ 4-5 hours

**Objective**: End-to-end testing, edge cases, production deployment

**Testing Checklist:**

**Admin Workflow:**
- [ ] Create exam with 3 pools (7 challenges each, 120 points each)
- [ ] Pools can have overlapping challenges
- [ ] Validation prevents invalid configs
- [ ] Link to LMS Final Exam
- [ ] Publish exam
- [ ] View student attempts (see assigned pools)
- [ ] Grade report with 5 criteria
- [ ] Final score calculated correctly
- [ ] Certification level assigned correctly

**Student Workflow:**
- [ ] Redeem LMS code → CTF record created
- [ ] Complete MCQ → Score written (no negative marking)
- [ ] Login to CTF → Exam auto-enrolled
- [ ] Start lab → Random pool assigned
- [ ] Pool letter HIDDEN from UI
- [ ] Challenges in random order
- [ ] 12h timer starts
- [ ] Submit flags → Real-time updates
- [ ] Report unlocks at 80%
- [ ] Upload report
- [ ] View results after grading

**Edge Cases:**
- [ ] Random pool distribution (Student 1 gets A, Student 2 gets B, etc.)
- [ ] Student starts lab at T=40h → Only 8h remaining (not 12h)
- [ ] Report unlocks at T=46h → Only 2h to upload (not 3h)
- [ ] Timer expires → Hard cutoff, progress saved
- [ ] Lab score exactly 80.0% → Report unlocks
- [ ] Lab score 79.9% → Report locked
- [ ] Final 70% but lab 59% → FAIL
- [ ] Final 69% but lab 80% → FAIL
- [ ] Final 90.1% → Elite
- [ ] Duplicate flag → "Already solved"
- [ ] MCQ 40/60 correct → 66.67% (no penalty)

**Proctoring Logs:**
- [ ] IP address logged
- [ ] User agent logged
- [ ] IP changes tracked

**Deployment Steps:**

1. **Backup VPS database**:
   ```bash
   ssh -i ~/.ssh/hetzner-zecurx root@65.21.191.184
   docker exec zecurx-postgres pg_dump -U zecurx zecurx_platform > /backups/zecurx_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Push code to GitHub**:
   ```bash
   # LMS
   cd /home/elish4h/zecurx/services/zecurx-lms
   git add .
   git commit -m "Add ZXCPPT certification exam integration"
   git push origin main
   
   # CTF
   cd /home/elish4h/zecurx/services/zecurx-ctf
   git add .
   git commit -m "Add ZXCPPT certification exam system (pools, lab, report grading)"
   git push origin main
   ```

3. **Deploy to VPS**:
   ```bash
   ssh -i ~/.ssh/hetzner-zecurx root@65.21.191.184
   
   # Pull latest
   cd /opt/zecurx-lms && git pull origin main
   cd /opt/zecurx-ctf && git pull origin main
   
   # Run migrations
   cd /opt/zecurx-lms/backend && npx prisma migrate deploy
   cd /opt/zecurx-ctf/backend && npx prisma migrate deploy
   
   # Restart containers
   cd /opt/zecurx-lms && docker-compose restart backend frontend
   cd /opt/zecurx-ctf && docker-compose restart backend frontend
   ```

4. **Verify deployment**:
   - [ ] LMS admin panel loads
   - [ ] CTF admin panel loads
   - [ ] Database tables exist
   - [ ] Test exam creation
   - [ ] Test LMS redemption → CTF record

---

## Edge Cases & Special Scenarios

### Scenario 1: Late Lab Start
**Situation**: Student starts lab at T=40h (only 8h global remaining)

**Behavior**:
- CTF timer shows: "Time Remaining: 8h 0m" (not 12h)
- `lab_expires_at = min(now + 12h, global_expires_at)`
- Hard cutoff at T=48h

### Scenario 2: Report Unlock Near Deadline
**Situation**: Student achieves 80% at T=46h (only 2h global remaining)

**Behavior**:
- Report upload timer shows: "Upload Deadline: 2h 0m" (not 3h)
- `report_expires_at = min(now + 3h, global_expires_at)`
- Hard cutoff at T=48h

### Scenario 3: Timer Expiration
**Situation**: Student reaches 48-hour mark with lab incomplete

**Behavior**:
- Lab submission locked
- Report upload locked (if unlocked)
- Progress auto-saved
- `status = 'expired'`
- Admin can still grade based on progress

### Scenario 4: Exact Threshold Scores
**Situation**: Student scores exactly 80.0% on lab

**Behavior**:
- Report UNLOCKS (threshold is `>=`, not `>`)
- Student can upload report

**Situation**: Student scores exactly 70.0% final

**Behavior**:
- PASSES (threshold is `>=`)
- Certification level: Associate

### Scenario 5: Passing Requirements
**Situation**: Final 72%, Lab 59%, Report 85%

**Behavior**:
- FAILS (lab minimum 60% not met)
- No certification level assigned

**Situation**: Final 68%, Lab 75%, Report 80%

**Behavior**:
- FAILS (final minimum 70% not met)
- No certification level assigned

### Scenario 6: MCQ Scoring
**Situation**: Student answers 40 correct, 20 wrong, 0 skipped

**Old (with negative marking)**: `(40 × 1) - (20 × 0.25) = 40 - 5 = 35/60 = 58.33%`
**New (no negative marking)**: `40/60 = 66.67%`

### Scenario 7: Pool Distribution
**Situation**: 50 students start exam

**Expected Distribution** (pure random):
- Approximately 17 in Pool A
- Approximately 17 in Pool B
- Approximately 16 in Pool C
- (Actual distribution may vary due to randomness)

### Scenario 8: Challenge Overlap
**Situation**: Pool A and Pool B both contain "XSS Basics"

**Behavior**:
- Allowed
- Student assigned Pool A gets XSS Basics at position 3 (randomized)
- Student assigned Pool B gets XSS Basics at position 1 (randomized)
- Both students solve the same challenge, but in different pools

---

## Security Considerations

### Authentication & Authorization
- JWT tokens for API authentication
- Role-based access control (admin vs student)
- Email matching for auto-enrollment (LMS email = CTF email)

### Proctoring & Integrity
- IP address logging on lab start
- User agent tracking
- IP change detection (basic monitoring)
- No advanced proctoring (tab switches, etc.) for MVP

### Data Privacy
- Report files stored locally with user/attempt ID isolation
- No PII in logs beyond email (already in database)
- Admin-only access to grading interface

### Timer Enforcement
- Server-side timer validation (client timer is display-only)
- Hard cutoff at expiration (no grace period)
- Progress auto-saved on expiration

---

## Performance Considerations

### Database
- Indexes on frequently queried fields: `userId`, `examConfigId`, `status`, `assignedPool`
- JSONB for flexible data storage (completed challenges, proctoring logs)
- Connection pooling for concurrent users

### File Storage
- Local filesystem for MVP (`/uploads/certification-reports/`)
- File size limit: 50MB per report
- Directory structure: `/{userId}/{attemptId}/report.{ext}`

### Scalability
- Stateless API design (RESTful)
- Random pool assignment done on-demand (not pre-generated)
- Timer calculations done server-side

---

## Future Enhancements (Post-MVP)

### Phase 2 Features
- **Balanced Pool Distribution**: Rotate pool assignment to ensure equal distribution
- **Advanced Proctoring**: Tab switches, window blur, copy/paste detection (copy from LMS)
- **Auto-Generated Certificates**: PDF generation with student name, certification level, date
- **Cloud Storage**: Move reports to S3/GCS for scalability
- **Real-Time Notifications**: Email/push notifications for report unlock, grading completion
- **Analytics Dashboard**: Pass rates, average scores, pool difficulty analysis
- **Retry Mechanism**: Allow students to retake exam (with admin approval)
- **Partial Credit**: Allow admins to award partial points for incomplete lab challenges

### Admin Features
- **Exam Templates**: Save pool configurations as templates for reuse
- **Bulk Operations**: Bulk student enrollment, bulk code generation
- **Challenge Tagging**: Tag challenges by topic/skill for better pool curation
- **Auto-Pool Generation**: AI-suggested pools based on difficulty balance

### Student Features
- **Progress Dashboard**: Visual progress indicator (challenges solved, time remaining)
- **Hint System**: Integrate hint requests with point penalties
- **Challenge Notes**: Allow students to take notes during exam
- **Docker Instance Management**: Start/stop/restart challenge containers

---

## Risk Mitigation

### Risk 1: Timer Desynchronization
**Risk**: Client and server timers drift, student thinks they have time but server rejects submission

**Mitigation**:
- Server is source of truth
- Client timer syncs with server every 60 seconds
- Warning messages at 1h, 30m, 10m, 5m remaining
- Grace period for network latency (5 seconds server-side)

### Risk 2: Pool Randomization Bias
**Risk**: Pure random assignment results in unbalanced distribution (e.g., 40 in Pool A, 5 in Pool C)

**Mitigation**:
- Acceptable for MVP (randomness is fair)
- Document pool distribution in analytics
- Phase 2: Implement balanced rotation

### Risk 3: Report Upload Failure
**Risk**: Student upload fails at deadline due to network issues

**Mitigation**:
- Large buffer before deadline (3 hours)
- File size validation before upload (client-side check)
- Detailed error messages (file too large, wrong format, etc.)
- Admin can manually accept late submissions if justified

### Risk 4: Database Deadlocks
**Risk**: Concurrent flag submissions cause race conditions

**Mitigation**:
- Use database transactions for score updates
- Optimistic locking (check `labCompletedChallenges` before update)
- Idempotent flag submissions (duplicate submission returns "already solved")

### Risk 5: Challenge Pool Quality
**Risk**: Admin selects unbalanced pools (e.g., Pool A too easy, Pool C too hard)

**Mitigation**:
- Validation enforces difficulty-based points (Easy=10, Medium=20, Hard=30)
- All pools must total 120 points
- Admin analytics shows pass rates by pool (for future adjustment)

---

## Success Metrics

### System Health
- 99% uptime during exam window
- < 200ms API response time (p95)
- < 1% flag submission errors
- Zero data loss (reports, scores)

### User Satisfaction
- > 80% of students complete exam within time limits
- < 5% late submissions due to technical issues
- > 90% admin satisfaction with grading workflow

### Exam Integrity
- Pool distribution within 10% variance (e.g., 30-40-30 acceptable)
- < 2% proctoring violations logged
- Zero duplicate student identities (email matching works)

---

## Documentation Deliverables

### Admin Documentation
- How to create certification exam
- How to select challenges for pools
- How to publish exam
- How to grade reports
- How to interpret analytics

### Student Documentation
- How to redeem access code
- Exam format and structure
- Timing rules and deadlines
- Report upload requirements
- How to view results

### Developer Documentation
- API endpoint specifications
- Database schema reference
- Deployment procedures
- Troubleshooting guide

---

## Timeline Summary

| Phase | Description | Estimated Hours |
|-------|-------------|-----------------|
| 1 | Database Setup | 2-3 |
| 2 | LMS Integration | 2-3 |
| 3 | CTF Admin API | 5-6 |
| 4 | CTF Student API | 6-7 |
| 5 | Report & Grading | 4-5 |
| 6 | CTF Admin UI | 8-10 |
| 7 | CTF Student UI | 8-10 |
| 8 | Testing & Deployment | 4-5 |
| **TOTAL** | | **39-49 hours** |

---

## Approval Checklist

Before implementation begins, confirm:

- [ ] Database schema approved
- [ ] API endpoints approved
- [ ] UI mockups/wireframes approved (if needed)
- [ ] Timeline acceptable
- [ ] All edge cases understood
- [ ] Success criteria clear
- [ ] Risk mitigation strategies acceptable

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Approve for implementation** or request changes
3. **Begin Phase 1** (Database Setup)
4. **Iterate through phases** sequentially
5. **Test thoroughly** before production deployment
6. **Launch** for first cohort

---

## Conclusion

This plan provides a comprehensive roadmap for implementing the ZXCPPT Certification Exam System. The two-platform architecture leverages existing infrastructure (LMS for MCQ, CTF for Lab) while introducing a novel 3-pool challenge distribution system to maintain exam integrity.

Key innovations:
- **Pool randomization** prevents cheating while maintaining fairness
- **Hidden pool assignment** prevents students from sharing pool-specific solutions
- **Multi-component assessment** (MCQ + Lab + Report) provides holistic evaluation
- **Automatic + manual grading** balances efficiency with quality
- **Hard time constraints** simulate real-world pressure

With careful implementation following this plan, the system will provide a robust, secure, and fair certification process for ZecurX students.

---

**Document Version**: 1.0  
**Last Updated**: 2026-03-25  
**Status**: Ready for Implementation
