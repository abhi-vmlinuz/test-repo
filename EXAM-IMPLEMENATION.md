ZXCPPT Certification Exam System - FINAL IMPLEMENTATION PLAN
Executive Summary
Architecture:
- Two-Platform Integration: LMS (MCQ) + CTF (Lab + Report)
- Shared Database: certification_exam_attempts table in zecurx_platform PostgreSQL
- Pool System: 3 pools (A, B, C) per exam, student randomly assigned one pool (hidden), challenges within pool randomized
- Timing: 48h global window, 12h CTF lab, 3h report upload
- Scoring: MCQ 30% (no negative marking), Lab 50%, Report 20%
- Passing: ≥70% total AND ≥60% lab AND ≥60% report
---
Database Schema - FINAL VERSION
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
---
## Implementation Phases - DETAILED BREAKDOWN
### **PHASE 1: Database Setup** ⏱️ 2-3 hours
**Objective**: Create shared database tables in `zecurx_platform`
**Tasks:**
1. **Update Prisma schema** (both LMS and CTF):
   - Add `CertificationExamConfig` model
   - Add `CertificationExamAttempt` model
   - Add relation to existing `User` model
2. **Generate migrations**:
   ```bash
   # LMS
   cd /home/elish4h/zecurx/services/zecurx-lms/backend
   npx prisma migrate dev --name add_certification_exam_tables
   
   # CTF (if using Prisma)
   cd /home/elish4h/zecurx/services/zecurx-ctf/backend
   npx prisma migrate dev --name add_certification_exam_tables
   ```
3. **Test migration locally**:
   - Verify tables created
   - Test basic CRUD operations
   - Check foreign key constraints
**Files Modified:**
- `/home/elish4h/zecurx/services/zecurx-lms/backend/prisma/schema.prisma`
- `/home/elish4h/zecurx/services/zecurx-ctf/backend/prisma/schema.prisma`
**Success Criteria:**
- ✅ Tables exist in local `zecurx_platform` database
- ✅ Both LMS and CTF can query tables
- ✅ Indexes created correctly
- ✅ Foreign keys working
---
PHASE 2: LMS Backend Integration ⏱️ 2-3 hours
Objective: LMS creates attempt records and updates MCQ scores (no negative marking)
Tasks:
1. Hook into exam redemption (final-exam.service.ts):
      async redeemCode(userId: string, examId: string, code: string) {
     // ... existing redemption logic ...
     
     // Check if this is a certification exam
     const certConfig = await this.prisma.certificationExamConfig.findUnique({
       where: { lmsFinalExamId: examId }
     });
     
     if (certConfig) {
       // Create certification attempt
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
     
     return attempt;
   }
   
2. Hook into exam submission (final-exam.service.ts):
      async submitExam(attemptId: string, answers: Answer[]) {
     // ... existing grading logic ...
     
     // Calculate MCQ score WITHOUT negative marking
     const correctCount = answers.filter(a => a.isCorrect).length;
     const totalQuestions = exam.questions.length;
     const mcqScore = (correctCount / totalQuestions) * 100;
     
     // Update certification attempt
     const certAttempt = await this.prisma.certificationExamAttempt.findUnique({
       where: { lmsFinalExamAttemptId: attempt.id }
     });
     
     if (certAttempt) {
       await this.prisma.certificationExamAttempt.update({
         where: { id: certAttempt.id },
         data: {
           mcqScore: mcqScore,
           mcqCorrect: correctCount,
           mcqWrong: totalQuestions - correctCount, // Analytics only
           mcqCompletedAt: new Date(),
           status: 'mcq_completed'
         }
       });
     }
     
     return result;
   }
   
Files Modified:
- /home/elish4h/zecurx/services/zecurx-lms/backend/src/final-exam/final-exam.service.ts
Success Criteria:
- ✅ Redeeming LMS code creates certification_exam_attempts record
- ✅ MCQ completion updates mcqScore correctly (no negative marking)
- ✅ Status changes from mcq_pending to mcq_completed
- ✅ 48-hour global timer set correctly
---
PHASE 3: CTF Backend - Admin API ⏱️ 5-6 hours
Objective: Admin can create exams, select challenges for 3 pools
Tasks:
1. Create admin route group (server.py):
      from fastapi import APIRouter, Depends, HTTPException, Body
   from typing import List
   import random
   from datetime import datetime, timedelta
   
   router_cert_admin = APIRouter(prefix="/api/admin/certification-exams", tags=["Certification Admin"])
   
   # Get available challenges grouped by difficulty
   @router_cert_admin.get("/available-challenges")
   async def get_available_challenges(current_user = Depends(require_admin)):
       """Get all challenges grouped by difficulty for pool selection"""
       
       easy = await prisma.ctf_public_challenges.find_many(
           where={'difficulty': 'easy'},
           order_by={'title': 'asc'}
       )
       
       medium = await prisma.ctf_public_challenges.find_many(
           where={'difficulty': 'medium'},
           order_by={'title': 'asc'}
       )
       
       hard = await prisma.ctf_public_challenges.find_many(
           where={'difficulty': 'hard'},
           order_by={'title': 'asc'}
       )
       
       return {
           'easy': [{
               'id': c.id,
               'title': c.title,
               'category': c.category.name if c.category else 'Uncategorized',
               'difficulty': c.difficulty,
               'points': 10
           } for c in easy],
           'medium': [{
               'id': c.id,
               'title': c.title,
               'category': c.category.name if c.category else 'Uncategorized',
               'difficulty': c.difficulty,
               'points': 20
           } for c in medium],
           'hard': [{
               'id': c.id,
               'title': c.title,
               'category': c.category.name if c.category else 'Uncategorized',
               'difficulty': c.difficulty,
               'points': 30
           } for c in hard]
       }
   
2. Validation helper:
      def validate_pool(challenge_ids: List[str]) -> tuple[bool, str, int]:
       """
       Validate pool has exactly 7 challenges totaling 120 points
       Returns: (is_valid, error_message, total_points)
       """
       if len(challenge_ids) != 7:
           return False, f"Pool must have exactly 7 challenges (has {len(challenge_ids)})", 0
       
       total_points = 0
       for challenge_id in challenge_ids:
           challenge = await prisma.ctf_public_challenges.find_unique(
               where={'id': challenge_id}
           )
           
           if not challenge:
               return False, f"Challenge {challenge_id} not found", 0
           
           if challenge.difficulty == 'easy':
               total_points += 10
           elif challenge.difficulty == 'medium':
               total_points += 20
           elif challenge.difficulty == 'hard':
               total_points += 30
       
       if total_points != 120:
           return False, f"Pool must total 120 points (has {total_points})", total_points
       
       return True, "", total_points
   
3. Create exam endpoint:
      @router_cert_admin.post("")
   async def create_certification_exam(
       name: str = Body(...),
       lms_final_exam_id: str = Body(...),
       pool_a_challenge_ids: List[str] = Body(...),
       pool_b_challenge_ids: List[str] = Body(...),
       pool_c_challenge_ids: List[str] = Body(...),
       current_user = Depends(require_admin)
   ):
       """Create new certification exam config"""
       
       # Validate all 3 pools
       for pool_name, challenge_ids in [
           ('Pool A', pool_a_challenge_ids),
           ('Pool B', pool_b_challenge_ids),
           ('Pool C', pool_c_challenge_ids)
       ]:
           valid, error, points = validate_pool(challenge_ids)
           if not valid:
               raise HTTPException(400, f"{pool_name}: {error}")
       
       # Create config
       config = await prisma.certificationexamconfig.create({
           'data': {
               'name': name,
               'lmsFinalExamId': lms_final_exam_id,
               'poolAChallengeIds': pool_a_challenge_ids,
               'poolBChallengeIds': pool_b_challenge_ids,
               'poolCChallengeIds': pool_c_challenge_ids,
               'createdById': current_user.id,
               'isPublished': False
           }
       })
       
       return config
   
4. Additional admin endpoints:
   - GET /api/admin/certification-exams - List all exam configs
   - GET /api/admin/certification-exams/{id} - Get config details
   - PUT /api/admin/certification-exams/{id} - Update config
   - DELETE /api/admin/certification-exams/{id} - Delete config
   - PUT /api/admin/certification-exams/{id}/publish - Publish exam
   - GET /api/admin/certification-exams/{id}/attempts - List student attempts
Files Modified:
- /home/elish4h/zecurx/services/zecurx-ctf/backend/server.py
Success Criteria:
- ✅ Admin can fetch available challenges
- ✅ Admin can create exam with 3 pools
- ✅ Validation enforces 7 challenges per pool, 120 points each
- ✅ Pools can have overlapping challenges
- ✅ Can list/update/delete exam configs
---
PHASE 4: CTF Backend - Student Lab Flow ⏱️ 6-7 hours
Objective: Students discover exams, start lab, submit flags, auto-scoring
Tasks:
1. Student exam discovery:
      router_cert_student = APIRouter(prefix="/api/student/certification-exams", tags=["Certification Student"])
   
   @router_cert_student.get("")
   async def get_student_exams(current_user = Depends(get_current_user)):
       """Get exams student is enrolled in (via LMS)"""
       
       attempts = await prisma.certificationexamattempt.find_many(
           where={'userId': current_user.id},
           include={'examConfig': True}
       )
       
       result = []
       for attempt in attempts:
           time_remaining = calculate_time_remaining(attempt)
           
           result.append({
               'id': attempt.exam_config.id,
               'name': attempt.exam_config.name,
               'attemptId': attempt.id,
               'status': attempt.status,
               'timeRemaining': time_remaining,
               'components': {
                   'mcq': {
                       'completed': attempt.mcq_completed_at is not None,
                       'score': attempt.mcq_score
                   },
                   'lab': {
                       'started': attempt.lab_started_at is not None,
                       'score': attempt.lab_score,
                       'pointsEarned': attempt.lab_points_earned
                   },
                   'report': {
                       'unlocked': attempt.report_unlocked_at is not None,
                       'uploaded': attempt.report_uploaded_at is not None
                   }
               }
           })
       
       return result
   
2. Start lab exam (CRITICAL - Pool assignment logic):
      @router_cert_student.post("/{exam_id}/start-lab")
   async def start_lab_exam(
       exam_id: str,
       current_user = Depends(get_current_user)
   ):
       """Start CTF lab - randomly assigns pool, starts 12h timer"""
       
       # Find attempt
       attempt = await prisma.certificationexamattempt.find_unique(
           where={
               'userId_examConfigId': {
                   'userId': current_user.id,
                   'examConfigId': exam_id
               }
           },
           include={'examConfig': True}
       )
       
       # Validations
       if not attempt:
           raise HTTPException(404, "Exam not found or not enrolled")
       
       if attempt.mcq_completed_at is None:
           raise HTTPException(400, "Must complete MCQ in LMS first")
       
       if attempt.lab_started_at is not None:
           raise HTTPException(400, "Lab already started")
       
       now = datetime.now()
       if now > attempt.global_expires_at:
           raise HTTPException(403, "Exam expired (48-hour window)")
       
       # RANDOM POOL ASSIGNMENT
       assigned_pool = random.choice(['A', 'B', 'C'])
       
       # Get challenges for assigned pool
       if assigned_pool == 'A':
           challenge_ids = attempt.exam_config.pool_a_challenge_ids
       elif assigned_pool == 'B':
           challenge_ids = attempt.exam_config.pool_b_challenge_ids
       else:  # Pool C
           challenge_ids = attempt.exam_config.pool_c_challenge_ids
       
       # RANDOMIZE ORDER within pool
       randomized_order = list(range(7))
       random.shuffle(randomized_order)
       
       # Calculate lab expiration (12h OR global expiration, whichever is earlier)
       ctf_12h = now + timedelta(hours=12)
       lab_expires_at = min(ctf_12h, attempt.global_expires_at)
       
       # Update attempt
       await prisma.certificationexamattempt.update(
           where={'id': attempt.id},
           data={
               'assignedPool': assigned_pool,
               'labStartedAt': now,
               'labExpiresAt': lab_expires_at,
               'labChallengeOrder': randomized_order,
               'status': 'lab_in_progress'
           }
       )
       
       # Fetch challenges in randomized order
       challenges = []
       for i in randomized_order:
           challenge = await get_challenge(challenge_ids[i])
           challenges.append({
               'id': challenge.id,
               'title': challenge.title,
               'description': challenge.description,
               'difficulty': challenge.difficulty,
               'points': 10 if challenge.difficulty == 'easy' else (20 if challenge.difficulty == 'medium' else 30),
               'category': challenge.category.name if challenge.category else None,
               'hints': challenge.hints,
               'has_docker': challenge.has_docker
           })
       
       return {
           'attemptId': attempt.id,
           'challenges': challenges,
           'timeRemaining': (lab_expires_at - now).total_seconds()
       }
   
3. Submit flag (auto-scoring + report unlock):
      @router_cert_student.post("/attempts/{attempt_id}/submit")
   async def submit_flag(
       attempt_id: str,
       challenge_id: str = Body(...),
       flag: str = Body(...),
       current_user = Depends(get_current_user)
   ):
       """Submit flag for a challenge"""
       
       attempt = await prisma.certificationexamattempt.find_unique(
           where={'id': attempt_id},
           include={'examConfig': True}
       )
       
       # Validations
       if attempt.user_id != current_user.id:
           raise HTTPException(403, "Unauthorized")
       
       if attempt.lab_started_at is None:
           raise HTTPException(400, "Lab not started")
       
       now = datetime.now()
       if now > attempt.lab_expires_at:
           raise HTTPException(403, "Lab time expired")
       
       # Check flag correctness
       challenge = await get_challenge(challenge_id)
       is_correct = challenge.flag.strip() == flag.strip()
       
       if not is_correct:
           return {'correct': False, 'message': 'Incorrect flag'}
       
       # Check if already solved
       completed = attempt.lab_completed_challenges or []
       if any(c['challenge_id'] == challenge_id for c in completed):
           return {
               'correct': True,
               'message': 'Already solved',
               'alreadySolved': True
           }
       
       # Calculate points
       if challenge.difficulty == 'easy':
           points = 10
       elif challenge.difficulty == 'medium':
           points = 20
       else:  # hard
           points = 30
       
       # Update progress
       completed.append({
           'challenge_id': challenge_id,
           'title': challenge.title,
           'difficulty': challenge.difficulty,
           'points': points,
           'solved_at': now.isoformat()
       })
       
       new_points = attempt.lab_points_earned + points
       new_score = (new_points / 120) * 100
       
       # Check if report should unlock (80% threshold)
       report_unlocked = (
           new_score >= 80 and
           attempt.report_unlocked_at is None
       )
       
       update_data = {
           'labPointsEarned': new_points,
           'labScore': new_score,
           'labCompletedChallenges': completed
       }
       
       if report_unlocked:
           report_3h = now + timedelta(hours=3)
           report_expires_at = min(report_3h, attempt.global_expires_at)
           
           update_data.update({
               'reportUnlockedAt': now,
               'reportExpiresAt': report_expires_at,
               'status': 'report_pending'
           })
       
       await prisma.certificationexamattempt.update(
           where={'id': attempt_id},
           data=update_data
       )
       
       return {
           'correct': True,
           'points': points,
           'labPointsEarned': new_points,
           'labScore': new_score,
           'reportUnlocked': report_unlocked,
           'reportExpiresAt': report_expires_at.isoformat() if report_unlocked else None
       }
   
4. Timer utility function:
      def calculate_time_remaining(attempt):
       """Calculate remaining time for all timers"""
       now = datetime.now()
       
       result = {}
       
       # Global timer
       global_remaining = max(
           (attempt.global_expires_at - now).total_seconds(), 
           0
       )
       result['global'] = global_remaining
       
       # CTF lab timer (if started)
       if attempt.lab_started_at and attempt.lab_expires_at:
           ctf_remaining = max(
               (attempt.lab_expires_at - now).total_seconds(),
               0
           )
           result['ctf'] = ctf_remaining
       
       # Report timer (if unlocked)
       if attempt.report_unlocked_at and attempt.report_expires_at:
           report_remaining = max(
               (attempt.report_expires_at - now).total_seconds(),
               0
           )
           result['report'] = report_remaining
       
       return result
   
Files Modified:
- /home/elish4h/zecurx/services/zecurx-ctf/backend/server.py
Success Criteria:
- ✅ Student can discover enrolled exams (auto-enrolled via LMS email)
- ✅ Student can start lab → Random pool assigned (A, B, or C)
- ✅ Pool assignment is HIDDEN from student UI
- ✅ Challenges within pool are randomized
- ✅ 12h timer starts (or remaining global time, whichever is less)
- ✅ Student can submit flags → Real-time scoring
- ✅ Report unlocks at 80% lab score
- ✅ Timer enforcement works (hard cutoff)
---
PHASE 5: CTF Backend - Report Upload & Grading ⏱️ 4-5 hours
Objective: Students upload reports, admins grade, final scores calculated
Tasks:
1. Report upload endpoint:
      @router_cert_student.post("/attempts/{attempt_id}/report")
   async def upload_report(
       attempt_id: str,
       file: UploadFile = File(...),
       current_user = Depends(get_current_user)
   ):
       """Upload certification report (PDF/DOCX)"""
       
       attempt = await prisma.certificationexamattempt.find_unique(
           where={'id': attempt_id}
       )
       
       # Validations
       if attempt.user_id != current_user.id:
           raise HTTPException(403, "Unauthorized")
       
       if attempt.report_unlocked_at is None:
           raise HTTPException(400, "Report not unlocked (need 80% lab score)")
       
       now = datetime.now()
       if now > attempt.report_expires_at:
           raise HTTPException(403, "Report upload deadline expired")
       
       if attempt.report_uploaded_at is not None:
           raise HTTPException(400, "Report already uploaded")
       
       # Validate file type
       allowed_types = [
           'application/pdf',
           'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
       ]
       if file.content_type not in allowed_types:
           raise HTTPException(400, "Only PDF and DOCX files allowed")
       
       # Validate file size (50MB max)
       content = await file.read()
       if len(content) > 50 * 1024 * 1024:
           raise HTTPException(400, "File size exceeds 50MB limit")
       
       # Save file
       upload_dir = f"/uploads/certification-reports/{current_user.id}/{attempt_id}"
       os.makedirs(upload_dir, exist_ok=True)
       
       file_ext = '.pdf' if 'pdf' in file.content_type else '.docx'
       file_path = f"{upload_dir}/report{file_ext}"
       
       with open(file_path, 'wb') as f:
           f.write(content)
       
       # Update attempt
       await prisma.certificationexamattempt.update(
           where={'id': attempt_id},
           data={
               'reportFileUrl': file_path,
               'reportUploadedAt': now,
               'status': 'report_uploaded'
           }
       )
       
       return {
           'success': True,
           'reportUrl': file_path,
           'uploadedAt': now.isoformat()
       }
   
2. Admin grading endpoints:
      @router_cert_admin.get("/reports/pending")
   async def get_pending_reports(current_user = Depends(require_admin)):
       """Get list of reports awaiting grading"""
       
       attempts = await prisma.certificationexamattempt.find_many(
           where={'status': 'report_uploaded'},
           include={'user': True, 'examConfig': True},
           order_by={'reportUploadedAt': 'asc'}
       )
       
       return [{
           'attemptId': a.id,
           'studentName': a.user.name,
           'studentEmail': a.user.email,
           'examName': a.exam_config.name,
           'mcqScore': a.mcq_score,
           'labScore': a.lab_score,
           'labPointsEarned': a.lab_points_earned,
           'reportUploadedAt': a.report_uploaded_at.isoformat(),
           'reportFileUrl': a.report_file_url
       } for a in attempts]
   
   @router_cert_admin.get("/reports/{attempt_id}")
   async def get_report_details(
       attempt_id: str,
       current_user = Depends(require_admin)
   ):
       """Get report details for grading"""
       
       attempt = await prisma.certificationexamattempt.find_unique(
           where={'id': attempt_id},
           include={'user': True, 'examConfig': True}
       )
       
       if not attempt:
           raise HTTPException(404, "Attempt not found")
       
       return {
           'attemptId': attempt.id,
           'student': {
               'name': attempt.user.name,
               'email': attempt.user.email
           },
           'exam': {
               'name': attempt.exam_config.name
           },
           'scores': {
               'mcq': attempt.mcq_score,
               'lab': attempt.lab_score,
               'labPoints': f"{attempt.lab_points_earned}/120"
           },
           'reportFileUrl': attempt.report_file_url,
           'labChallenges': attempt.lab_completed_challenges
       }
   
   @router_cert_admin.post("/reports/{attempt_id}/grade")
   async def grade_report(
       attempt_id: str,
       clarity: int = Body(..., ge=0, le=20),
       technical: int = Body(..., ge=0, le=25),
       reproducibility: int = Body(..., ge=0, le=25),
       impact: int = Body(..., ge=0, le=15),
       remediation: int = Body(..., ge=0, le=15),
       feedback: str = Body(""),
       current_user = Depends(require_admin)
   ):
       """Grade certification report and calculate final score"""
       
       attempt = await prisma.certificationexamattempt.find_unique(
           where={'id': attempt_id},
           include={'examConfig': True}
       )
       
       if not attempt:
           raise HTTPException(404, "Attempt not found")
       
       # Calculate report total
       report_total = clarity + technical + reproducibility + impact + remediation
       
       # Calculate final weighted score
       mcq_contribution = (attempt.mcq_score or 0) * 0.30
       lab_contribution = (attempt.lab_score or 0) * 0.50
       report_contribution = report_total * 0.20
       
       final_score = mcq_contribution + lab_contribution + report_contribution
       
       # Determine pass/fail
       passed = (
           final_score >= 70.00 and
           (attempt.lab_score or 0) >= 60.00 and
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
       
       # Update attempt
       now = datetime.now()
       await prisma.certificationexamattempt.update(
           where={'id': attempt_id},
           data={
               'reportClarityScore': clarity,
               'reportTechnicalScore': technical,
               'reportReproducibilityScore': reproducibility,
               'reportImpactScore': impact,
               'reportRemediationScore': remediation,
               'reportTotalScore': report_total,
               'reportFeedback': feedback,
               'reportGradedAt': now,
               'reportGradedById': current_user.id,
               'finalScore': final_score,
               'passed': passed,
               'certificationLevel': certification_level,
               'status': 'graded'
           }
       )
       
       return {
           'success': True,
           'reportScore': report_total,
           'finalScore': final_score,
           'passed': passed,
           'certificationLevel': certification_level,
           'breakdown': {
               'mcq': f"{attempt.mcq_score}% × 0.30 = {mcq_contribution:.2f}%",
               'lab': f"{attempt.lab_score}% × 0.50 = {lab_contribution:.2f}%",
               'report': f"{report_total}% × 0.20 = {report_contribution:.2f}%"
           }
       }
   
Files Modified:
- /home/elish4h/zecurx/services/zecurx-ctf/backend/server.py
Success Criteria:
- ✅ Students can upload PDF/DOCX reports (max 50MB)
- ✅ Upload only allowed when lab score ≥ 80%
- ✅ Upload deadline enforced (3h OR global expiration)
- ✅ Admins can see pending reports list
- ✅ Admins can grade reports with 5 criteria (0-100 total)
- ✅ Final score calculated: MCQ×0.3 + Lab×0.5 + Report×0.2
- ✅ Pass/fail determined: ≥70% total AND ≥60% lab AND ≥60% report
- ✅ Certification level assigned (Associate/Professional/Elite)
---
PHASE 6: CTF Frontend - Admin Panel ⏱️ 8-10 hours
Objective: Admin UI for creating exams, monitoring attempts, grading reports
Components to Create:
1. Exam List Page: /admin/certification-exams
      // CertificationExams.tsx
   - Table: Exam Name, Type, LMS Exam ID, Published, Students, Actions
   - Actions: Edit, View Attempts, Publish/Unpublish, Delete
   - Create New Exam button
   
2. Exam Form: /admin/certification-exams/new and /{id}/edit
      // CertificationExamForm.tsx
   
   <FormField label="Exam Name">
     <Input value={name} onChange={...} />
   </FormField>
   
   <FormField label="LMS Final Exam">
     <Select options={lmsExams} value={lmsExamId} onChange={...} />
   </FormField>
   
   {/* Pool A Selector */}
   <PoolSelector
     poolLabel="Pool A"
     selectedChallenges={poolA}
     availableChallenges={availableChallenges}
     onAdd={(challengeId) => setPoolA([...poolA, challengeId])}
     onRemove={(challengeId) => setPoolA(poolA.filter(id => id !== challengeId))}
   />
   
   {/* Validation */}
   <ValidationSummary>
     Pool A: {poolA.length}/7 challenges | {calculatePoints(poolA)}/120 points
     Pool B: {poolB.length}/7 challenges | {calculatePoints(poolB)}/120 points
     Pool C: {poolC.length}/7 challenges | {calculatePoints(poolC)}/120 points
   </ValidationSummary>
   
   <Button disabled={!allPoolsValid}>Create Exam</Button>
   
3. Pool Selector Component: components/PoolSelector.tsx
      interface PoolSelectorProps {
     poolLabel: string;
     selectedChallenges: string[];
     availableChallenges: {easy: Challenge[], medium: Challenge[], hard: Challenge[]};
     onAdd: (id: string) => void;
     onRemove: (id: string) => void;
   }
   
   // UI shows:
   // - Dropdown grouped by difficulty
   // - Selected challenges list with remove buttons
   // - Real-time validation (7 challenges, 120 points)
   
4. Attempts Monitoring: /admin/certification-exams/{id}/attempts
      // CertificationAttempts.tsx
   
   <Table>
     <Column header="Student" />
     <Column header="Assigned Pool" /> {/* Show pool for admin analytics */}
     <Column header="MCQ Score" />
     <Column header="Lab Score" />
     <Column header="Report Status" />
     <Column header="Final Score" />
     <Column header="Passed" />
     <Column header="Actions" />
   </Table>
   
   // Filters: Status, Pass/Fail, Pool
   // Export CSV button
   
5. Report Grading Interface: /admin/certification-exams/reports/{attemptId}/grade
      // ReportGrading.tsx
   
   <div className="grid grid-cols-2 gap-6">
     {/* Left Panel: PDF Viewer */}
     <div className="col-span-1">
       <iframe 
         src={reportUrl} 
         className="w-full h-screen border"
       />
     </div>
     
     {/* Right Panel: Grading Form */}
     <div className="col-span-1">
       <h2>Grade Report</h2>
       
       <GradingCriterion
         label="Clarity"
         max={20}
         value={clarity}
         onChange={setClarity}
       />
       
       <GradingCriterion
         label="Technical Accuracy"
         max={25}
         value={technical}
         onChange={setTechnical}
       />
       
       <GradingCriterion
         label="Reproducibility"
         max={25}
         value={reproducibility}
         onChange={setReproducibility}
       />
       
       <GradingCriterion
         label="Impact Explanation"
         max={15}
         value={impact}
         onChange={setImpact}
       />
       
       <GradingCriterion
         label="Remediation"
         max={15}
         value={remediation}
         onChange={setRemediation}
       />
       
       <div className="mt-4 p-4 bg-gray-100">
         <strong>Total Report Score:</strong> {totalReportScore}/100
       </div>
       
       <Textarea 
         label="Feedback (optional)"
         value={feedback}
         onChange={setFeedback}
       />
       
       <div className="mt-4 p-4 bg-blue-50">
         <h3>Final Score Preview</h3>
         <p>MCQ: {mcqScore}% × 0.30 = {mcqContribution}%</p>
         <p>Lab: {labScore}% × 0.50 = {labContribution}%</p>
         <p>Report: {totalReportScore}% × 0.20 = {reportContribution}%</p>
         <hr />
         <p><strong>Final: {finalScore}%</strong></p>
         <p>Status: {passed ? '✓ PASSED' : '✗ FAILED'}</p>
         {passed && <p>Level: {certificationLevel}</p>}
       </div>
       
       <Button onClick={submitGrade}>Submit Grade</Button>
     </div>
   </div>
   
Files to Create:
- /home/elish4h/zecurx/services/zecurx-ctf/frontend/src/pages/admin/CertificationExams.tsx
- /home/elish4h/zecurx/services/zecurx-ctf/frontend/src/pages/admin/CertificationExamForm.tsx
- /home/elish4h/zecurx/services/zecurx-ctf/frontend/src/pages/admin/CertificationAttempts.tsx
- /home/elish4h/zecurx/services/zecurx-ctf/frontend/src/pages/admin/ReportGrading.tsx
- /home/elish4h/zecurx/services/zecurx-ctf/frontend/src/components/PoolSelector.tsx
- /home/elish4h/zecurx/services/zecurx-ctf/frontend/src/components/GradingCriterion.tsx
Success Criteria:
- ✅ Admin can create exam with 3 pools
- ✅ Pool selector UI validates 7 challenges, 120 points
- ✅ Admin can publish/unpublish exams
- ✅ Admin can view all student attempts
- ✅ Admin can see which pool each student got (for analytics)
- ✅ Admin can grade reports with PDF viewer
- ✅ Final score preview updates in real-time
---
PHASE 7: CTF Frontend - Student Panel ⏱️ 8-10 hours
Objective: Student UI for discovering exams, taking lab, uploading report
Components to Create:
1. Exam Dashboard: /student/certification-exams
      // CertificationExams.tsx
   
   <div className="grid gap-4">
     {exams.map(exam => (
       <ExamCard key={exam.id}>
         <h3>{exam.name}</h3>
         
         <div className="flex gap-4 my-4">
           <StatusBadge
             label="MCQ"
             completed={exam.components.mcq.completed}
             score={exam.components.mcq.score}
           />
           <StatusBadge
             label="Lab"
             started={exam.components.lab.started}
             score={exam.components.lab.score}
           />
           <StatusBadge
             label="Report"
             unlocked={exam.components.report.unlocked}
             uploaded={exam.components.report.uploaded}
           />
         </div>
         
         <Timer
           globalRemaining={exam.timeRemaining.global}
           ctfRemaining={exam.timeRemaining.ctf}
           reportRemaining={exam.timeRemaining.report}
         />
         
         {!exam.components.lab.started && (
           <Button onClick={() => startLab(exam.id)}>
             Start Lab Exam
           </Button>
         )}
         
         {exam.components.lab.started && (
           <Button onClick={() => navigateToLab(exam.attemptId)}>
             Continue Lab
           </Button>
         )}
         
         {exam.components.report.unlocked && !exam.components.report.uploaded && (
           <Button onClick={() => navigateToReport(exam.attemptId)}>
             Upload Report
           </Button>
         )}
         
         {exam.status === 'graded' && (
           <Button onClick={() => viewResults(exam.attemptId)}>
             View Results
           </Button>
         )}
       </ExamCard>
     ))}
   </div>
   
2. Lab Exam Room: /student/certification-exams/attempts/{id}/lab
      // CertificationLab.tsx
   
   {/* Top Bar */}
   <div className="flex justify-between items-center p-4 bg-gray-100">
     <div>
       <h2>{examName}</h2>
       <p>Progress: {solvedCount}/7 challenges</p>
     </div>
     
     <div>
       <Timer remaining={ctfTimeRemaining} critical={ctfTimeRemaining < 3600} />
     </div>
     
     <div>
       <ProgressBar
         current={labPointsEarned}
         total={120}
         percentage={labScore}
       />
     </div>
   </div>
   
   {/* Challenge Grid - DO NOT SHOW POOL LETTER */}
   <div className="grid grid-cols-3 gap-4 p-4">
     {challenges.map((challenge, index) => (
       <ChallengeCard
         key={challenge.id}
         number={index + 1}
         title={challenge.title}
         difficulty={challenge.difficulty}
         points={challenge.points}
         category={challenge.category}
         solved={isSolved(challenge.id)}
         onClick={() => openChallengeModal(challenge)}
       />
     ))}
   </div>
   
   {/* Challenge Modal */}
   <Modal open={selectedChallenge} onClose={closeModal}>
     <h3>{selectedChallenge.title}</h3>
     <DifficultyBadge difficulty={selectedChallenge.difficulty} />
     <p>Points: {selectedChallenge.points}</p>
     
     <div className="my-4">
       {selectedChallenge.description}
     </div>
     
     {selectedChallenge.has_docker && (
       <DockerInstance challengeId={selectedChallenge.id} />
     )}
     
     <FlagSubmission
       onSubmit={(flag) => submitFlag(selectedChallenge.id, flag)}
     />
   </Modal>
   
3. Report Upload Page: /student/certification-exams/attempts/{id}/report
      // CertificationReport.tsx
   
   {labScore < 80 ? (
     <Alert variant="warning">
       Report upload unlocks at 80% lab score.
       Current score: {labScore}%
     </Alert>
   ) : (
     <div>
       <Timer
         label="Upload Deadline"
         remaining={reportTimeRemaining}
         critical={reportTimeRemaining < 3600}
       />
       
       <FileUpload
         accept=".pdf,.docx"
         maxSize={50 * 1024 * 1024}
         onUpload={handleUpload}
         disabled={reportUploaded}
       />
       
       {reportUploaded && (
         <Alert variant="success">
           Report uploaded successfully!
           Status: Pending Admin Review
         </Alert>
       )}
     </div>
   )}
   
4. Results Page: /student/certification-exams/attempts/{id}/results
      // CertificationResults.tsx
   
   <div className="max-w-4xl mx-auto p-6">
     <h1>Certification Exam Results</h1>
     <h2>{examName}</h2>
     
     <ScoreBreakdown
       mcq={{score: mcqScore, weight: 0.30, contribution: mcqContribution}}
       lab={{score: labScore, weight: 0.50, contribution: labContribution}}
       report={{score: reportScore, weight: 0.20, contribution: reportContribution}}
       finalScore={finalScore}
       passed={passed}
     />
     
     {passed ? (
       <div className="bg-green-50 p-6 rounded-lg">
         <h3 className="text-green-800">✓ PASSED</h3>
         <p>Certification Level: <strong>{certificationLevel}</strong></p>
         <p className="text-sm text-green-600">
           {certificationLevel === 'Elite' && 'Outstanding performance!'}
           {certificationLevel === 'Professional' && 'Excellent work!'}
           {certificationLevel === 'Associate' && 'Good job!'}
         </p>
       </div>
     ) : (
       <div className="bg-red-50 p-6 rounded-lg">
         <h3 className="text-red-800">✗ FAILED</h3>
         <p>Minimum requirements not met:</p>
         <ul>
           {finalScore < 70 && <li>Total score: {finalScore}% (need 70%)</li>}
           {labScore < 60 && <li>Lab score: {labScore}% (need 60%)</li>}
           {reportScore < 60 && <li>Report score: {reportScore}% (need 60%)</li>}
         </ul>
       </div>
     )}
     
     {reportFeedback && (
       <div className="mt-6 p-4 bg-gray-50">
         <h4>Admin Feedback</h4>
         <p>{reportFeedback}</p>
       </div>
     )}
     
     <div className="mt-6">
       <h4>Lab Performance</h4>
       <ChallengesList
         challenges={labChallenges}
         solved={labCompletedChallenges}
       />
     </div>
   </div>
   
Files to Create:
- /home/elish4h/zecurx/services/zecurx-ctf/frontend/src/pages/student/CertificationExams.tsx
- /home/elish4h/zecurx/services/zecurx-ctf/frontend/src/pages/student/CertificationLab.tsx
- /home/elish4h/zecurx/services/zecurx-ctf/frontend/src/pages/student/CertificationReport.tsx
- /home/elish4h/zecurx/services/zecurx-ctf/frontend/src/pages/student/CertificationResults.tsx
- /home/elish4h/zecurx/services/zecurx-ctf/frontend/src/components/ExamCard.tsx
- /home/elish4h/zecurx/services/zecurx-ctf/frontend/src/components/Timer.tsx
- /home/elish4h/zecurx/services/zecurx-ctf/frontend/src/components/ChallengeCard.tsx
- /home/elish4h/zecurx/services/zecurx-ctf/frontend/src/components/ScoreBreakdown.tsx
Success Criteria:
- ✅ Student sees enrolled exams automatically (based on LMS email)
- ✅ Student can start lab → Challenges displayed (pool letter HIDDEN)
- ✅ Timer displays correctly (CTF 12h, updates in real-time)
- ✅ Student can submit flags → Real-time score updates
- ✅ Report upload unlocks at 80% lab score
- ✅ Report upload enforces 3h deadline
- ✅ Results page shows detailed breakdown
- ✅ Pass/fail status clearly displayed
---
PHASE 8: Testing & Deployment ⏱️ 4-5 hours
Objective: End-to-end testing, edge cases, production deployment
Testing Checklist:
Admin Workflow:
- [ ] Create exam config with 3 pools (7 challenges each, 120 points each)
- [ ] Pools can have overlapping challenges
- [ ] Validation prevents invalid configurations
- [ ] Link to LMS Final Exam
- [ ] Publish exam
- [ ] View student attempts (see assigned pools)
- [ ] Grade report with 5 criteria
- [ ] Final score calculated correctly
- [ ] Certification level assigned correctly
Student Workflow:
- [ ] Redeem LMS access code → Record created in CTF DB
- [ ] Complete MCQ in LMS → Score written (no negative marking)
- [ ] Login to CTF → Exam auto-enrolled (via email matching)
- [ ] Start lab → Random pool assigned (A, B, or C)
- [ ] Pool letter HIDDEN from student UI
- [ ] Challenges displayed in random order
- [ ] 12h CTF timer starts
- [ ] Submit flags → Real-time score updates
- [ ] Report unlocks at 80% lab score
- [ ] Upload report (PDF/DOCX, max 50MB)
- [ ] View results after grading
Edge Cases:
- [ ] Student 1 gets Pool A, Student 2 gets Pool B (random distribution)
- [ ] Student starts lab at T=40h → Only 8h remaining (not 12h)
- [ ] Report unlocks at T=46h → Only 2h to upload (not 3h)
- [ ] Timer expires → Hard cutoff, progress saved
- [ ] Lab score exactly 80.0% → Report unlocks
- [ ] Lab score 79.9% → Report remains locked
- [ ] Final score 70% but lab 59% → FAIL
- [ ] Final score 69% but lab 80% → FAIL
- [ ] Final score 90.1% → Elite certification
- [ ] Duplicate flag submission → "Already solved" message
- [ ] MCQ with 40/60 correct → Score = 66.67% (not penalized for wrong answers)
Proctoring Logs:
- [ ] IP address logged on lab start
- [ ] User agent logged
- [ ] IP changes tracked (if student switches networks)
Deployment Steps:
1. Backup VPS database:
      ssh -i ~/.ssh/hetzner-zecurx root@65.21.191.184
   docker exec zecurx-postgres pg_dump -U zecurx zecurx_platform > /backups/zecurx_$(date +%Y%m%d_%H%M%S).sql
   
2. Push code to GitHub:
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
   
3. Deploy to VPS:
      ssh -i ~/.ssh/hetzner-zecurx root@65.21.191.184
   
   # Pull latest code
   cd /opt/zecurx-lms
   git pull origin main
   
   cd /opt/zecurx-ctf
   git pull origin main
   
   # Run migrations
   cd /opt/zecurx-lms/backend
   npx prisma migrate deploy
   
   cd /opt/zecurx-ctf/backend
   npx prisma migrate deploy  # Or run SQL migration
   
   # Restart containers
   cd /opt/zecurx-lms
   docker-compose restart backend frontend
   
   cd /opt/zecurx-ctf
   docker-compose restart backend frontend
   
4. Verify deployment:
   - [ ] LMS admin panel loads
   - [ ] CTF admin panel loads
   - [ ] Database tables exist: certification_exam_configs, certification_exam_attempts
   - [ ] Test exam creation (3 pools)
   - [ ] Test LMS redemption → CTF attempt record created
Success Criteria:
- ✅ All workflows tested end-to-end
- ✅ Edge cases handled correctly
- ✅ Production deployment successful
- ✅ No errors in logs
- ✅ System ready for first cohort
---
Final Summary
What We're Building:
1. Two-platform certification system (LMS + CTF)
2. Three-pool challenge distribution (students randomly assigned one pool, hidden from view)
3. Three-component exam (MCQ 30%, Lab 50%, Report 20%)
4. Automatic scoring (MCQ + Lab) + Manual grading (Report)
5. Multi-tier certification (Associate/Professional/Elite)
Key Design Decisions:
✅ NO negative marking for MCQ (simple: correct/total × 100)  
✅ 3 pools per exam (A, B, C) - admin selects 7 challenges per pool  
✅ Random pool assignment - pure random, not balanced  
✅ Pool visibility - HIDDEN from students, visible to admins for analytics  
✅ Challenge overlap - pools can share challenges  
✅ MCQ wrong tracking - kept for admin analytics (not scoring)  
✅ Exam configs - created fresh each cohort (not reused)  
✅ Timing - 48h global, 12h CTF (whichever expires first), 3h report  
✅ Hard cutoff - at timer expiration, auto-save progress  
✅ Certificate issuance - manual by admin (no auto-generation)  
✅ Proctoring - basic logging (IP, user agent changes)  
Total Estimated Timeline:
- Phase 1: 2-3 hours (Database)
- Phase 2: 2-3 hours (LMS integration)
- Phase 3: 5-6 hours (CTF admin API)
- Phase 4: 6-7 hours (CTF student API)
- Phase 5: 4-5 hours (Report upload/grading)
- Phase 6: 8-10 hours (CTF admin UI)
- Phase 7: 8-10 hours (CTF student UI)
- Phase 8: 4-5 hours (Testing/deployment)
Total: 39-49 hours of development work
---
Ready to Begin Implementation?
This plan is comprehensive, detailed, and ready for execution. All your requirements have been incorporated:
- ✅ No negative marking for MCQ
- ✅ Pool system for challenge distribution (3 pools, random assignment, hidden from students)
- ✅ Challenge overlap allowed between pools
- ✅ MCQ wrong count tracked for analytics
- ✅ New exam config per cohort
