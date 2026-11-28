--
-- PostgreSQL database dump
--

\restrict jcWDzZatW8uKUhsiVezlOy80UfkKrL35inTqDGJzcB4U3FAjXyOMgsJRQufDorm

-- Dumped from database version 16.16
-- Dumped by pg_dump version 16.16

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: AccessRequestStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AccessRequestStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


--
-- Name: AssignmentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AssignmentStatus" AS ENUM (
    'PENDING',
    'SUBMITTED',
    'GRADED',
    'LATE'
);


--
-- Name: BadgeType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BadgeType" AS ENUM (
    'ACHIEVEMENT',
    'COMPLETION',
    'STREAK',
    'SPECIAL'
);


--
-- Name: CertificateStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CertificateStatus" AS ENUM (
    'PENDING',
    'ISSUED',
    'REVOKED'
);


--
-- Name: CertificationExamStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CertificationExamStatus" AS ENUM (
    'MCQ_PENDING',
    'MCQ_COMPLETED',
    'LAB_IN_PROGRESS',
    'LAB_COMPLETED',
    'REPORT_PENDING',
    'REPORT_UPLOADED',
    'PENDING_REVIEW',
    'GRADED',
    'EXPIRED'
);


--
-- Name: ChatMemberRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ChatMemberRole" AS ENUM (
    'STUDENT',
    'INSTRUCTOR'
);


--
-- Name: ChatMessageType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ChatMessageType" AS ENUM (
    'TEXT',
    'FILE',
    'IMAGE',
    'ANNOUNCEMENT',
    'QUIZ_LINK',
    'ASSIGNMENT',
    'LAB_CHALLENGE',
    'SYSTEM'
);


--
-- Name: ContactStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ContactStatus" AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'RESOLVED',
    'CLOSED'
);


--
-- Name: ContentType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ContentType" AS ENUM (
    'VIDEO',
    'PDF',
    'TEXT',
    'AUDIO',
    'INTERACTIVE',
    'SCORM',
    'QUIZ',
    'ASSIGNMENT'
);


--
-- Name: CourseLevel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CourseLevel" AS ENUM (
    'BEGINNER',
    'INTERMEDIATE',
    'ADVANCED',
    'EXPERT'
);


--
-- Name: CourseStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CourseStatus" AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'ARCHIVED'
);


--
-- Name: CtfDifficulty; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."CtfDifficulty" AS ENUM (
    'EASY',
    'MEDIUM',
    'HARD',
    'EXPERT'
);


--
-- Name: EnrollmentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."EnrollmentStatus" AS ENUM (
    'ACTIVE',
    'COMPLETED',
    'DROPPED',
    'SUSPENDED'
);


--
-- Name: FinalExamAccessRequestStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FinalExamAccessRequestStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED'
);


--
-- Name: FinalExamProctoringEventType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FinalExamProctoringEventType" AS ENUM (
    'EXAM_STARTED',
    'EXAM_COMPLETED',
    'TAB_SWITCH',
    'TAB_RETURN',
    'WINDOW_BLUR',
    'WINDOW_FOCUS',
    'COPY_ATTEMPT',
    'PASTE_ATTEMPT',
    'RIGHT_CLICK',
    'FULLSCREEN_EXIT',
    'VIOLATION_WARNING'
);


--
-- Name: FinalExamQuestionType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FinalExamQuestionType" AS ENUM (
    'MCQ',
    'TRUE_FALSE'
);


--
-- Name: FinalExamVisibility; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FinalExamVisibility" AS ENUM (
    'ALL',
    'SPECIFIC'
);


--
-- Name: InternshipStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."InternshipStatus" AS ENUM (
    'ACTIVE',
    'COMPLETED',
    'CANCELLED',
    'PAUSED'
);


--
-- Name: NotificationChannel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."NotificationChannel" AS ENUM (
    'IN_APP',
    'EMAIL',
    'PUSH',
    'SMS'
);


--
-- Name: NotificationType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."NotificationType" AS ENUM (
    'COURSE',
    'ASSIGNMENT',
    'QUIZ',
    'GRADE',
    'ANNOUNCEMENT',
    'MESSAGE',
    'SYSTEM',
    'PAYMENT'
);


--
-- Name: OfferLetterStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OfferLetterStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'GENERATED',
    'SENT'
);


--
-- Name: OtpPurpose; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OtpPurpose" AS ENUM (
    'LOGIN',
    'RESET_PASSWORD',
    'EMAIL_VERIFICATION'
);


--
-- Name: OtpStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."OtpStatus" AS ENUM (
    'PENDING',
    'USED',
    'EXPIRED',
    'EXCEEDED_ATTEMPTS'
);


--
-- Name: PaymentStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PaymentStatus" AS ENUM (
    'PENDING',
    'PROCESSING',
    'COMPLETED',
    'FAILED',
    'REFUNDED'
);


--
-- Name: QuizQuestionType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."QuizQuestionType" AS ENUM (
    'MULTIPLE_CHOICE',
    'TRUE_FALSE',
    'SHORT_ANSWER',
    'ESSAY',
    'FILL_BLANK',
    'MATCHING'
);


--
-- Name: RoleType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."RoleType" AS ENUM (
    'SUPERADMIN',
    'ADMIN',
    'INSTRUCTOR',
    'STUDENT',
    'GUEST',
    'CTF_USER',
    'INTERN'
);


--
-- Name: SecurityEventType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SecurityEventType" AS ENUM (
    'LOGIN_SUCCESS',
    'LOGIN_FAILED',
    'PASSWORD_CHANGED',
    'ACCOUNT_LOCKED',
    'MFA_ENABLED',
    'MFA_DISABLED',
    'SUSPICIOUS_LOGIN',
    'BRUTE_FORCE_ATTEMPT',
    'SESSION_HIJACK_ATTEMPT',
    'UNAUTHORIZED_ACCESS',
    'LOGOUT',
    'SESSION_TERMINATED',
    'OTP_REQUESTED',
    'OTP_VERIFIED',
    'OTP_FAILED',
    'OTP_EXPIRED',
    'PASSWORD_RESET_REQUESTED',
    'ACCOUNT_CREATED',
    'ACCESS_REQUEST_SUBMITTED'
);


--
-- Name: SecuritySeverity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SecuritySeverity" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);


--
-- Name: SubscriptionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."SubscriptionStatus" AS ENUM (
    'ACTIVE',
    'EXPIRED',
    'CANCELLED',
    'PAUSED'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Permission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Permission" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    module text NOT NULL,
    action text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: Role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Role" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    type public."RoleType" DEFAULT 'STUDENT'::public."RoleType" NOT NULL
);


--
-- Name: _PermissionToRole; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."_PermissionToRole" (
    "A" text NOT NULL,
    "B" text NOT NULL
);


--
-- Name: access_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.access_requests (
    id text NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    reason text,
    status public."AccessRequestStatus" DEFAULT 'PENDING'::public."AccessRequestStatus" NOT NULL,
    "reviewedBy" text,
    "reviewedAt" timestamp(3) without time zone,
    "reviewNotes" text,
    "createdUserId" text,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.achievements (
    id text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    icon text,
    points integer DEFAULT 0 NOT NULL,
    conditions jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: admin_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_settings (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    key text NOT NULL,
    value text,
    encrypted boolean DEFAULT false,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: announcements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.announcements (
    id text NOT NULL,
    "courseId" text,
    title text NOT NULL,
    content text NOT NULL,
    priority text DEFAULT 'NORMAL'::text NOT NULL,
    "publishedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone
);


--
-- Name: assignment_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignment_submissions (
    id text NOT NULL,
    "assignmentId" text NOT NULL,
    "userId" text NOT NULL,
    status public."AssignmentStatus" DEFAULT 'PENDING'::public."AssignmentStatus" NOT NULL,
    content text NOT NULL,
    attachments text[] DEFAULT ARRAY[]::text[],
    score integer,
    feedback text,
    "gradedBy" text,
    "gradedAt" timestamp(3) without time zone,
    "attemptNumber" integer DEFAULT 1 NOT NULL,
    "isLate" boolean DEFAULT false NOT NULL,
    "submittedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignments (
    id text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    instructions text NOT NULL,
    points integer DEFAULT 100 NOT NULL,
    "dueDate" timestamp(3) without time zone,
    "availableFrom" timestamp(3) without time zone,
    "availableUntil" timestamp(3) without time zone,
    "maxAttempts" integer,
    "allowLateSubmission" boolean DEFAULT false NOT NULL,
    "latePenalty" integer,
    attachments text[] DEFAULT ARRAY[]::text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    type text DEFAULT 'Assignment'::text NOT NULL,
    "courseId" text,
    visibility text DEFAULT 'All Students'::text NOT NULL,
    "isPublished" boolean DEFAULT false NOT NULL
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id text NOT NULL,
    "userId" text,
    action text NOT NULL,
    "entityType" text NOT NULL,
    "entityId" text,
    changes jsonb,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: badges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.badges (
    id text NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    icon text NOT NULL,
    type public."BadgeType" DEFAULT 'ACHIEVEMENT'::public."BadgeType" NOT NULL,
    points integer DEFAULT 0 NOT NULL,
    rarity text DEFAULT 'COMMON'::text NOT NULL,
    conditions jsonb NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    icon text,
    "parentId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: certificates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.certificates (
    id text NOT NULL,
    "certificateNumber" text NOT NULL,
    "userId" text NOT NULL,
    "courseId" text NOT NULL,
    "enrollmentId" text NOT NULL,
    title text NOT NULL,
    description text,
    status public."CertificateStatus" DEFAULT 'PENDING'::public."CertificateStatus" NOT NULL,
    "fileUrl" text,
    "qrCodeUrl" text,
    "verificationUrl" text,
    score integer,
    grade text,
    "completionDate" timestamp(3) without time zone NOT NULL,
    "expiryDate" timestamp(3) without time zone,
    "issuedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "revokedAt" timestamp(3) without time zone,
    "revokedReason" text
);


--
-- Name: certification_exam_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.certification_exam_attempts (
    id text NOT NULL,
    "userId" text NOT NULL,
    "examConfigId" text NOT NULL,
    "assignedPool" text NOT NULL,
    "redeemedAt" timestamp(3) without time zone NOT NULL,
    "globalExpiresAt" timestamp(3) without time zone NOT NULL,
    "mcqScore" numeric(5,2),
    "mcqCorrect" integer,
    "mcqWrong" integer,
    "mcqTotal" integer DEFAULT 60 NOT NULL,
    "mcqCompletedAt" timestamp(3) without time zone,
    "lmsFinalExamAttemptId" text,
    "labStartedAt" timestamp(3) without time zone,
    "labExpiresAt" timestamp(3) without time zone,
    "labPointsEarned" integer DEFAULT 0 NOT NULL,
    "labTotalPoints" integer DEFAULT 120 NOT NULL,
    "labScore" numeric(5,2),
    "labCompletedChallenges" jsonb,
    "labChallengeOrder" integer[],
    "labCompletedAt" timestamp(3) without time zone,
    "reportUnlockedAt" timestamp(3) without time zone,
    "reportExpiresAt" timestamp(3) without time zone,
    "reportFileUrl" text,
    "reportUploadedAt" timestamp(3) without time zone,
    "reportClarityScore" integer,
    "reportTechnicalScore" integer,
    "reportReproducibilityScore" integer,
    "reportImpactScore" integer,
    "reportRemediationScore" integer,
    "reportTotalScore" numeric(5,2),
    "reportGradedAt" timestamp(3) without time zone,
    "reportGradedById" text,
    "reportFeedback" text,
    "finalScore" numeric(5,2),
    passed boolean,
    "certificationLevel" text,
    "ipAddress" text,
    "userAgent" text,
    "proctoringLogs" jsonb,
    status public."CertificationExamStatus" DEFAULT 'MCQ_PENDING'::public."CertificationExamStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: certification_exam_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.certification_exam_configs (
    id text NOT NULL,
    name text NOT NULL,
    "examType" text DEFAULT 'ZXCPPT'::text NOT NULL,
    "lmsFinalExamId" text NOT NULL,
    "poolAChallengeIds" text[],
    "poolBChallengeIds" text[],
    "poolCChallengeIds" text[],
    "totalLabPoints" integer DEFAULT 120 NOT NULL,
    "globalDurationHours" integer DEFAULT 48 NOT NULL,
    "ctfDurationHours" integer DEFAULT 12 NOT NULL,
    "reportDurationHours" integer DEFAULT 3 NOT NULL,
    "mcqWeight" numeric(3,2) DEFAULT 0.30 NOT NULL,
    "labWeight" numeric(3,2) DEFAULT 0.50 NOT NULL,
    "reportWeight" numeric(3,2) DEFAULT 0.20 NOT NULL,
    "passThreshold" numeric(5,2) DEFAULT 70.00 NOT NULL,
    "labMinThreshold" numeric(5,2) DEFAULT 60.00 NOT NULL,
    "reportMinThreshold" numeric(5,2) DEFAULT 60.00 NOT NULL,
    "labUnlockReportThreshold" numeric(5,2) DEFAULT 80.00 NOT NULL,
    "associateMin" numeric(5,2) DEFAULT 70.00 NOT NULL,
    "professionalMin" numeric(5,2) DEFAULT 80.00 NOT NULL,
    "eliteMin" numeric(5,2) DEFAULT 90.00 NOT NULL,
    "isPublished" boolean DEFAULT false NOT NULL,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: challenge_packs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.challenge_packs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pack_name text NOT NULL,
    display_name text NOT NULL,
    images jsonb NOT NULL,
    combined_ports jsonb NOT NULL,
    compose_content text,
    is_multi_container boolean DEFAULT true,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: chat_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_members (
    "chatId" text NOT NULL,
    "userId" text NOT NULL,
    role public."ChatMemberRole" DEFAULT 'STUDENT'::public."ChatMemberRole" NOT NULL,
    "isMuted" boolean DEFAULT false NOT NULL,
    "mutedBy" text,
    "mutedAt" timestamp(3) without time zone,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastSeenAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chat_messages (
    id text DEFAULT gen_random_uuid() NOT NULL,
    "chatId" text NOT NULL,
    "senderId" text NOT NULL,
    content text NOT NULL,
    type public."ChatMessageType" DEFAULT 'TEXT'::public."ChatMessageType" NOT NULL,
    "fileUrl" text,
    "fileName" text,
    "fileMime" text,
    metadata jsonb,
    "parentId" text,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "editedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "deletedForUsers" jsonb DEFAULT '[]'::jsonb
);


--
-- Name: chatbot_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chatbot_conversations (
    id text DEFAULT gen_random_uuid() NOT NULL,
    "userId" text NOT NULL,
    "courseId" text,
    title text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: chatbot_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chatbot_messages (
    id text DEFAULT gen_random_uuid() NOT NULL,
    "conversationId" text NOT NULL,
    "userId" text NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    "sourcesUsed" jsonb,
    "tokenCount" integer,
    "modelUsed" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: coding_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coding_submissions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    challenge_id uuid NOT NULL,
    source_code text NOT NULL,
    language text NOT NULL,
    status text DEFAULT 'queued'::text,
    score integer DEFAULT 0,
    max_score integer DEFAULT 100,
    test_results jsonb DEFAULT '[]'::jsonb,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: course_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_analytics (
    id text NOT NULL,
    "courseId" text NOT NULL,
    date date NOT NULL,
    views integer DEFAULT 0 NOT NULL,
    enrollments integer DEFAULT 0 NOT NULL,
    completions integer DEFAULT 0 NOT NULL,
    dropouts integer DEFAULT 0 NOT NULL,
    "averageProgress" numeric(5,2),
    "averageScore" numeric(5,2),
    "averageRating" numeric(3,2),
    "averageTimeSpent" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: course_chats; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_chats (
    id text DEFAULT gen_random_uuid() NOT NULL,
    "courseId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: course_prerequisites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_prerequisites (
    id text NOT NULL,
    "courseId" text NOT NULL,
    "prerequisiteId" text NOT NULL,
    required boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: course_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_reviews (
    id text NOT NULL,
    "courseId" text NOT NULL,
    "userId" text NOT NULL,
    rating integer NOT NULL,
    review text,
    "helpfulCount" integer DEFAULT 0 NOT NULL,
    "instructorReply" text,
    "repliedAt" timestamp(3) without time zone,
    "isPublished" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courses (
    id text NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    description text NOT NULL,
    "shortDescription" text,
    thumbnail text,
    "previewVideo" text,
    level public."CourseLevel" DEFAULT 'BEGINNER'::public."CourseLevel" NOT NULL,
    status public."CourseStatus" DEFAULT 'DRAFT'::public."CourseStatus" NOT NULL,
    language text DEFAULT 'en'::text NOT NULL,
    duration integer,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    "discountPrice" numeric(10,2),
    "instructorId" text NOT NULL,
    "orgId" text,
    "categoryId" text,
    "maxStudents" integer,
    "enrollmentDeadline" timestamp(3) without time zone,
    "startDate" timestamp(3) without time zone,
    "endDate" timestamp(3) without time zone,
    "isPublic" boolean DEFAULT true NOT NULL,
    "allowReviews" boolean DEFAULT true NOT NULL,
    "certificateEnabled" boolean DEFAULT true NOT NULL,
    "passingScore" integer DEFAULT 70 NOT NULL,
    "viewCount" integer DEFAULT 0 NOT NULL,
    "enrollmentCount" integer DEFAULT 0 NOT NULL,
    "completionCount" integer DEFAULT 0 NOT NULL,
    "averageRating" numeric(3,2),
    tags text[] DEFAULT ARRAY[]::text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "publishedAt" timestamp(3) without time zone,
    "courseCode" text,
    "createdById" text
);


--
-- Name: ctf_active_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ctf_active_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    session_token text NOT NULL,
    ip_address text,
    user_agent text,
    device_info text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    last_activity_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp(6) with time zone NOT NULL,
    is_active boolean DEFAULT true
);


--
-- Name: ctf_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ctf_categories (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    icon text DEFAULT '🏴'::text NOT NULL,
    color text DEFAULT 'gray'::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "orderIndex" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ctf_challenge_artifacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ctf_challenge_artifacts (
    id uuid NOT NULL,
    challenge_id text NOT NULL,
    filename text NOT NULL,
    file_path text NOT NULL,
    file_size integer,
    mime_type text,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: ctf_challenges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ctf_challenges (
    id text NOT NULL,
    "ctfModuleId" text NOT NULL,
    "lmsTopicId" text,
    title text NOT NULL,
    "shortDescription" text,
    context text,
    "topicNumber" integer NOT NULL,
    "topicName" text,
    "isCapstone" boolean DEFAULT false NOT NULL,
    difficulty public."CtfDifficulty" DEFAULT 'MEDIUM'::public."CtfDifficulty" NOT NULL,
    "dockerImage" text,
    "dockerCompose" text,
    flags jsonb DEFAULT '[]'::jsonb NOT NULL,
    hints jsonb DEFAULT '[]'::jsonb NOT NULL,
    points integer DEFAULT 100 NOT NULL,
    "orderIndex" integer DEFAULT 0 NOT NULL,
    "isPublished" boolean DEFAULT false NOT NULL,
    "solveCount" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ctf_courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ctf_courses (
    id text NOT NULL,
    "lmsCourseId" text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "startDate" timestamp(3) without time zone,
    "endDate" timestamp(3) without time zone,
    "allowLateSubmission" boolean DEFAULT false NOT NULL,
    color text DEFAULT 'gray'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ctf_docker_instances; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ctf_docker_instances (
    id text NOT NULL,
    "userId" text NOT NULL,
    "challengeId" text NOT NULL,
    "containerId" text,
    port integer,
    status text DEFAULT 'starting'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ctf_enrollment_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ctf_enrollment_codes (
    id text NOT NULL,
    "ctfCourseId" text NOT NULL,
    code text NOT NULL,
    "isUsed" boolean DEFAULT false NOT NULL,
    "usedAt" timestamp(3) without time zone,
    "expiresAt" timestamp(3) without time zone,
    "createdBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ctf_enrollments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ctf_enrollments (
    id text NOT NULL,
    "userId" text NOT NULL,
    "ctfCourseId" text NOT NULL,
    "lmsEnrollmentId" text,
    progress integer DEFAULT 0 NOT NULL,
    "totalPoints" integer DEFAULT 0 NOT NULL,
    "enrolledAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastAccessedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone
);


--
-- Name: ctf_modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ctf_modules (
    id text NOT NULL,
    "ctfCourseId" text NOT NULL,
    "lmsModuleId" text,
    name text NOT NULL,
    description text,
    "orderIndex" integer NOT NULL,
    "hasCapstone" boolean DEFAULT true NOT NULL,
    "isPublished" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ctf_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ctf_notifications (
    id text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'announcement'::text NOT NULL,
    "senderId" text NOT NULL,
    "targetType" text DEFAULT 'all'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ctf_otp_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ctf_otp_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    email text NOT NULL,
    code text NOT NULL,
    purpose text DEFAULT 'force_logout'::text NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp(6) with time zone NOT NULL,
    used_at timestamp(6) with time zone,
    is_used boolean DEFAULT false
);


--
-- Name: ctf_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ctf_progress (
    id text NOT NULL,
    "userId" text NOT NULL,
    "challengeId" text NOT NULL,
    "enrollmentId" text NOT NULL,
    "flagsSolved" integer[] DEFAULT ARRAY[]::integer[],
    "hintsUsed" integer[] DEFAULT ARRAY[]::integer[],
    "pointsEarned" integer DEFAULT 0 NOT NULL,
    "hintCost" integer DEFAULT 0 NOT NULL,
    "isCompleted" boolean DEFAULT false NOT NULL,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ctf_public_challenges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ctf_public_challenges (
    id text NOT NULL,
    "categoryId" text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    difficulty public."CtfDifficulty" DEFAULT 'MEDIUM'::public."CtfDifficulty" NOT NULL,
    points integer DEFAULT 100 NOT NULL,
    flag text NOT NULL,
    "dockerImage" text,
    "dockerCommand" text,
    hints jsonb DEFAULT '[]'::jsonb NOT NULL,
    questions jsonb DEFAULT '[]'::jsonb NOT NULL,
    solves integer DEFAULT 0 NOT NULL,
    "isPublished" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    tags jsonb DEFAULT '[]'::jsonb,
    ports jsonb DEFAULT '[]'::jsonb,
    "hasDocker" boolean DEFAULT false,
    "challengePackId" text,
    "isMultiContainer" boolean DEFAULT false,
    slug text,
    author text,
    "isCodingChallenge" boolean DEFAULT false,
    language text DEFAULT 'c'::text,
    "starterCode" text DEFAULT ''::text,
    "testCases" jsonb DEFAULT '[]'::jsonb,
    "timeLimitMs" integer DEFAULT 2000,
    "memoryLimitMb" integer DEFAULT 128
);


--
-- Name: ctf_public_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ctf_public_progress (
    id text NOT NULL,
    "userId" text NOT NULL,
    "challengeId" text NOT NULL,
    solved boolean DEFAULT false NOT NULL,
    "hintsUsed" integer[] DEFAULT ARRAY[]::integer[],
    "solvedQuestions" integer[] DEFAULT ARRAY[]::integer[],
    "scoreEarned" integer DEFAULT 0 NOT NULL,
    "solvedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ctf_user_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ctf_user_notifications (
    id text NOT NULL,
    "userId" text NOT NULL,
    "notificationId" text NOT NULL,
    read boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: departments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.departments (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "orgId" text NOT NULL,
    "parentDeptId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: docker_image_metadata; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.docker_image_metadata (
    id integer NOT NULL,
    image_url text NOT NULL,
    image_name text,
    ports jsonb DEFAULT '[]'::jsonb,
    dockerfile_content text,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: docker_image_metadata_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.docker_image_metadata_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: docker_image_metadata_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.docker_image_metadata_id_seq OWNED BY public.docker_image_metadata.id;


--
-- Name: enrollment_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enrollment_codes (
    id text NOT NULL,
    code text NOT NULL,
    "userId" text,
    "userEmail" text NOT NULL,
    "courseId" text NOT NULL,
    "isUsed" boolean DEFAULT false NOT NULL,
    "usedAt" timestamp(3) without time zone,
    "expiresAt" timestamp(3) without time zone,
    "isRevoked" boolean DEFAULT false NOT NULL,
    "revokedAt" timestamp(3) without time zone,
    "revokedReason" text,
    "createdBy" text NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: enrollments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.enrollments (
    id text NOT NULL,
    "userId" text NOT NULL,
    "courseId" text NOT NULL,
    status public."EnrollmentStatus" DEFAULT 'ACTIVE'::public."EnrollmentStatus" NOT NULL,
    progress integer DEFAULT 0 NOT NULL,
    "lastAccessedAt" timestamp(3) without time zone,
    "completedAt" timestamp(3) without time zone,
    "certificateIssued" boolean DEFAULT false NOT NULL,
    "enrolledAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "enrollmentCodeId" text
);


--
-- Name: feature_flags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_flags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    description text DEFAULT ''::text,
    status text DEFAULT 'disabled'::text NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feedback (
    id text NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    subject text NOT NULL,
    message text NOT NULL,
    type text DEFAULT 'GENERAL'::text NOT NULL,
    status public."ContactStatus" DEFAULT 'PENDING'::public."ContactStatus" NOT NULL,
    "adminNotes" text,
    "respondedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: final_exam_access_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.final_exam_access_codes (
    id text NOT NULL,
    "examId" text NOT NULL,
    "userId" text NOT NULL,
    code text NOT NULL,
    "isRedeemed" boolean DEFAULT false NOT NULL,
    "redeemedAt" timestamp(3) without time zone,
    "expiresAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: final_exam_access_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.final_exam_access_requests (
    id text NOT NULL,
    "examId" text NOT NULL,
    "userId" text NOT NULL,
    message text,
    status public."FinalExamAccessRequestStatus" DEFAULT 'PENDING'::public."FinalExamAccessRequestStatus" NOT NULL,
    "reviewedBy" text,
    "reviewedAt" timestamp(3) without time zone,
    "reviewNotes" text,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: final_exam_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.final_exam_answers (
    id text NOT NULL,
    "attemptId" text NOT NULL,
    "questionId" text NOT NULL,
    "selectedAnswer" text NOT NULL,
    "isCorrect" boolean NOT NULL,
    "pointsEarned" integer DEFAULT 0 NOT NULL,
    "answeredAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: final_exam_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.final_exam_attempts (
    id text NOT NULL,
    "examId" text NOT NULL,
    "userId" text NOT NULL,
    "accessCodeId" text NOT NULL,
    "attemptNumber" integer DEFAULT 1 NOT NULL,
    score integer DEFAULT 0 NOT NULL,
    "maxScore" integer NOT NULL,
    percentage numeric(5,2) NOT NULL,
    passed boolean DEFAULT false NOT NULL,
    "timeSpent" integer,
    "totalPausedSeconds" integer DEFAULT 0 NOT NULL,
    "isPaused" boolean DEFAULT false NOT NULL,
    "pausedAt" timestamp(3) without time zone,
    "ipAddress" text,
    "userAgent" text,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: final_exam_proctoring_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.final_exam_proctoring_logs (
    id text NOT NULL,
    "attemptId" text NOT NULL,
    "eventType" public."FinalExamProctoringEventType" NOT NULL,
    metadata jsonb,
    "timestamp" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: final_exam_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.final_exam_questions (
    id text NOT NULL,
    "examId" text NOT NULL,
    "questionText" text NOT NULL,
    "questionType" public."FinalExamQuestionType" DEFAULT 'MCQ'::public."FinalExamQuestionType" NOT NULL,
    options jsonb NOT NULL,
    "correctAnswer" text NOT NULL,
    explanation text,
    points integer DEFAULT 1 NOT NULL,
    "orderIndex" integer DEFAULT 0 NOT NULL,
    "sourceQuizId" text,
    "sourceQuestionId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: final_exams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.final_exams (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    instructions text,
    "courseId" text,
    duration integer DEFAULT 60 NOT NULL,
    "passPercentage" integer DEFAULT 80 NOT NULL,
    "retryLimit" integer,
    "cooldownHours" integer DEFAULT 24 NOT NULL,
    "questionCount" integer DEFAULT 30 NOT NULL,
    "isPublished" boolean DEFAULT false NOT NULL,
    "startDate" timestamp(3) without time zone,
    "endDate" timestamp(3) without time zone,
    visibility public."FinalExamVisibility" DEFAULT 'ALL'::public."FinalExamVisibility" NOT NULL,
    "shuffleQuestions" boolean DEFAULT true NOT NULL,
    "createdById" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: forum_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forum_comments (
    id text NOT NULL,
    "postId" text NOT NULL,
    "authorId" text NOT NULL,
    content text NOT NULL,
    attachments text[] DEFAULT ARRAY[]::text[],
    "parentId" text,
    upvotes integer DEFAULT 0 NOT NULL,
    downvotes integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: forum_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forum_posts (
    id text NOT NULL,
    "forumId" text NOT NULL,
    "authorId" text NOT NULL,
    title text NOT NULL,
    content text NOT NULL,
    attachments text[] DEFAULT ARRAY[]::text[],
    "isPinned" boolean DEFAULT false NOT NULL,
    "isLocked" boolean DEFAULT false NOT NULL,
    "viewCount" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: forums; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.forums (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    slug text NOT NULL,
    "courseId" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: internships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.internships (
    id text NOT NULL,
    "userId" text NOT NULL,
    "programName" text NOT NULL,
    "programType" text,
    "durationMonths" integer NOT NULL,
    "startDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    status public."InternshipStatus" DEFAULT 'ACTIVE'::public."InternshipStatus" NOT NULL,
    "paymentId" text,
    "paymentAmount" numeric(10,2),
    notes text,
    "completedAt" timestamp(3) without time zone,
    "certificateIssued" boolean DEFAULT false NOT NULL,
    "certificateUrl" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: lesson_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lesson_progress (
    id text NOT NULL,
    "enrollmentId" text NOT NULL,
    "lessonId" text NOT NULL,
    "isCompleted" boolean DEFAULT false NOT NULL,
    "timeSpent" integer DEFAULT 0 NOT NULL,
    "lastPosition" integer DEFAULT 0 NOT NULL,
    score integer,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: lessons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lessons (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    "moduleId" text NOT NULL,
    "orderIndex" integer NOT NULL,
    "contentType" public."ContentType" DEFAULT 'VIDEO'::public."ContentType" NOT NULL,
    "videoUrl" text,
    "videoDuration" integer,
    content text,
    attachments text[] DEFAULT ARRAY[]::text[],
    duration integer,
    points integer DEFAULT 10 NOT NULL,
    "isPreview" boolean DEFAULT false NOT NULL,
    "isMandatory" boolean DEFAULT true NOT NULL,
    "isPublished" boolean DEFAULT false NOT NULL,
    "quizId" text,
    "assignmentId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: magic_login_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.magic_login_tokens (
    id text NOT NULL,
    "userId" text NOT NULL,
    "tokenHash" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "usedAt" timestamp(3) without time zone,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.media (
    id text NOT NULL,
    filename text NOT NULL,
    "originalName" text NOT NULL,
    "mimeType" text NOT NULL,
    size integer NOT NULL,
    "storageType" text DEFAULT 'S3'::text NOT NULL,
    url text NOT NULL,
    "thumbnailUrl" text,
    duration integer,
    resolution text,
    "uploadedBy" text NOT NULL,
    "entityType" text,
    "entityId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id text NOT NULL,
    "senderId" text NOT NULL,
    "receiverId" text NOT NULL,
    subject text,
    content text NOT NULL,
    attachments text[] DEFAULT ARRAY[]::text[],
    "isRead" boolean DEFAULT false NOT NULL,
    "readAt" timestamp(3) without time zone,
    "parentId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: module_quiz_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.module_quiz_attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quiz_id uuid NOT NULL,
    user_id text NOT NULL,
    attempt_number integer DEFAULT 1 NOT NULL,
    answers jsonb DEFAULT '{}'::jsonb NOT NULL,
    score integer DEFAULT 0 NOT NULL,
    max_score integer DEFAULT 100 NOT NULL,
    percentage numeric(5,2) DEFAULT 0 NOT NULL,
    passed boolean DEFAULT false,
    started_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp(6) without time zone,
    time_spent integer DEFAULT 0,
    cooldown_until timestamp(6) without time zone
);


--
-- Name: module_quiz_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.module_quiz_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quiz_id uuid NOT NULL,
    question_type text NOT NULL,
    question_text text NOT NULL,
    options jsonb DEFAULT '[]'::jsonb NOT NULL,
    correct_answer text NOT NULL,
    explanation text,
    order_index integer DEFAULT 0 NOT NULL,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: module_quizzes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.module_quizzes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    module_id text,
    course_id text,
    title text NOT NULL,
    description text,
    time_limit integer DEFAULT 3600 NOT NULL,
    passing_percentage integer DEFAULT 80 NOT NULL,
    max_attempts integer,
    is_final_quiz boolean DEFAULT false,
    is_published boolean DEFAULT false,
    created_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) without time zone DEFAULT CURRENT_TIMESTAMP,
    max_marks integer DEFAULT 30
);


--
-- Name: modules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.modules (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    "courseId" text NOT NULL,
    "orderIndex" integer NOT NULL,
    duration integer,
    "isPublished" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: nexus_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.nexus_usage (
    id text DEFAULT (gen_random_uuid())::text NOT NULL,
    user_id text NOT NULL,
    challenge_id text,
    container_id text,
    started_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    stopped_at timestamp(3) without time zone,
    status text DEFAULT 'running'::text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP,
    session_id text,
    ended_at timestamp(3) without time zone,
    pod_seconds integer DEFAULT 0,
    estimated_cost numeric(10,4) DEFAULT 0
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id text NOT NULL,
    "userId" text NOT NULL,
    type public."NotificationType" NOT NULL,
    channel public."NotificationChannel" DEFAULT 'IN_APP'::public."NotificationChannel" NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    data jsonb,
    "isRead" boolean DEFAULT false NOT NULL,
    "readAt" timestamp(3) without time zone,
    "actionUrl" text,
    "actionText" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: offer_letter_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.offer_letter_requests (
    id text NOT NULL,
    "userId" text NOT NULL,
    "internshipId" text NOT NULL,
    status public."OfferLetterStatus" DEFAULT 'PENDING'::public."OfferLetterStatus" NOT NULL,
    "requestedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "approvedAt" timestamp(3) without time zone,
    "rejectedAt" timestamp(3) without time zone,
    "rejectionReason" text,
    "offerLetterUrl" text,
    "generatedAt" timestamp(3) without time zone,
    "sentAt" timestamp(3) without time zone,
    "approvedBy" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organizations (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    logo text,
    website text,
    "contactEmail" text,
    phone text,
    address text,
    "maxUsers" integer,
    "maxCourses" integer,
    features jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: otps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.otps (
    id text NOT NULL,
    "userId" text NOT NULL,
    email text NOT NULL,
    code text NOT NULL,
    purpose public."OtpPurpose" NOT NULL,
    status public."OtpStatus" DEFAULT 'PENDING'::public."OtpStatus" NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    "maxAttempts" integer DEFAULT 5 NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "usedAt" timestamp(3) without time zone,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: partner_payouts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_payouts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partner_referral_id uuid NOT NULL,
    amount numeric(12,2) NOT NULL,
    payout_method character varying(50),
    payout_reference character varying(255),
    status character varying(20) DEFAULT 'pending'::character varying,
    notes text,
    processed_by character varying(255),
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    processed_at timestamp(6) with time zone
);


--
-- Name: partner_referral_usages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_referral_usages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partner_referral_id uuid NOT NULL,
    order_id character varying(255) NOT NULL,
    payment_id character varying(255),
    customer_email character varying(255) NOT NULL,
    customer_name character varying(255),
    original_amount numeric(10,2) NOT NULL,
    discount_applied numeric(10,2) NOT NULL,
    final_amount numeric(10,2) NOT NULL,
    commission_earned numeric(10,2) NOT NULL,
    is_paid_out boolean DEFAULT false,
    paid_out_at timestamp(6) with time zone,
    payout_id uuid,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: partner_referrals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.partner_referrals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partner_name character varying(255) NOT NULL,
    partner_email character varying(255) NOT NULL,
    partner_phone character varying(20),
    partner_notes text,
    code character varying(50) NOT NULL,
    user_discount_type character varying(20) NOT NULL,
    user_discount_value numeric(10,2) NOT NULL,
    max_user_discount numeric(10,2),
    min_order_amount numeric(10,2) DEFAULT 0,
    commission_type character varying(20) NOT NULL,
    commission_value numeric(10,2) NOT NULL,
    max_uses integer,
    current_uses integer DEFAULT 0,
    valid_from timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    valid_until timestamp(6) with time zone,
    is_active boolean DEFAULT true,
    total_earnings numeric(12,2) DEFAULT 0,
    total_paid_out numeric(12,2) DEFAULT 0,
    pending_payout numeric(12,2) DEFAULT 0,
    created_by character varying(255),
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    id text NOT NULL,
    "userId" text NOT NULL,
    "tokenHash" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "usedAt" timestamp(3) without time zone,
    "isAdminTriggered" boolean DEFAULT false NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id text NOT NULL,
    "userId" text NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    status public."PaymentStatus" DEFAULT 'PENDING'::public."PaymentStatus" NOT NULL,
    gateway text NOT NULL,
    "gatewayOrderId" text,
    "gatewayPaymentId" text,
    description text,
    metadata jsonb,
    "courseId" text,
    "subscriptionId" text,
    "paidAt" timestamp(3) without time zone,
    "refundedAt" timestamp(3) without time zone,
    "refundAmount" numeric(10,2),
    "refundReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: pinned_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pinned_messages (
    "chatId" text NOT NULL,
    "messageId" text NOT NULL,
    "pinnedBy" text NOT NULL,
    "pinnedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subscriptions (
    id text DEFAULT gen_random_uuid() NOT NULL,
    "userId" text NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: quiz_answers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_answers (
    id text NOT NULL,
    "attemptId" text NOT NULL,
    "questionId" text NOT NULL,
    "selectedAnswer" text NOT NULL,
    "isCorrect" boolean NOT NULL,
    "pointsEarned" integer DEFAULT 0 NOT NULL,
    "answeredAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: quiz_attempts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_attempts (
    id text NOT NULL,
    "quizId" text NOT NULL,
    "userId" text NOT NULL,
    "attemptNumber" integer DEFAULT 1 NOT NULL,
    score integer DEFAULT 0 NOT NULL,
    "maxScore" integer NOT NULL,
    percentage numeric(5,2) NOT NULL,
    passed boolean DEFAULT false NOT NULL,
    "timeSpent" integer,
    "startedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "completedAt" timestamp(3) without time zone
);


--
-- Name: quiz_questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quiz_questions (
    id text NOT NULL,
    "quizId" text NOT NULL,
    type public."QuizQuestionType" DEFAULT 'MULTIPLE_CHOICE'::public."QuizQuestionType" NOT NULL,
    question text NOT NULL,
    explanation text,
    points integer DEFAULT 1 NOT NULL,
    "orderIndex" integer NOT NULL,
    options jsonb,
    "correctAnswer" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: quizzes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quizzes (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    instructions text,
    "timeLimit" integer,
    "availableFrom" timestamp(3) without time zone,
    "availableUntil" timestamp(3) without time zone,
    "passingScore" integer DEFAULT 70 NOT NULL,
    "maxAttempts" integer,
    "shuffleQuestions" boolean DEFAULT false NOT NULL,
    "shuffleOptions" boolean DEFAULT false NOT NULL,
    "showCorrectAnswers" boolean DEFAULT true NOT NULL,
    "showScoreImmediately" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: referral_code_usages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_code_usages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    referral_code_id uuid NOT NULL,
    order_id uuid,
    customer_email character varying(255) NOT NULL,
    original_amount numeric(10,2) NOT NULL,
    discount_applied numeric(10,2) NOT NULL,
    final_amount numeric(10,2) NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: referral_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    discount_type character varying(20) NOT NULL,
    discount_value numeric(10,2) NOT NULL,
    min_order_amount numeric(10,2) DEFAULT 0,
    max_discount numeric(10,2),
    max_uses integer,
    current_uses integer DEFAULT 0,
    valid_from timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    valid_until timestamp(6) with time zone,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refresh_tokens (
    id text NOT NULL,
    token text NOT NULL,
    "userId" text NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "isRevoked" boolean DEFAULT false NOT NULL,
    "revokedAt" timestamp(3) without time zone,
    "ipAddress" text,
    "userAgent" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: security_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.security_events (
    id text NOT NULL,
    "userId" text,
    "eventType" public."SecurityEventType" NOT NULL,
    description text NOT NULL,
    severity public."SecuritySeverity" DEFAULT 'LOW'::public."SecuritySeverity" NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    metadata jsonb,
    resolved boolean DEFAULT false NOT NULL,
    "resolvedBy" text,
    "resolvedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscriptions (
    id text NOT NULL,
    "userId" text NOT NULL,
    plan text NOT NULL,
    status public."SubscriptionStatus" DEFAULT 'ACTIVE'::public."SubscriptionStatus" NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency text DEFAULT 'USD'::text NOT NULL,
    "startDate" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "endDate" timestamp(3) without time zone NOT NULL,
    "nextBillingDate" timestamp(3) without time zone,
    "cancelledAt" timestamp(3) without time zone,
    "cancelReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_settings (
    id text NOT NULL,
    key text NOT NULL,
    value text NOT NULL,
    type text DEFAULT 'STRING'::text NOT NULL,
    description text,
    "isPublic" boolean DEFAULT false NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: topic_highlights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.topic_highlights (
    id text NOT NULL,
    "topicId" text NOT NULL,
    "userId" text NOT NULL,
    color text DEFAULT '#FFFF00'::text NOT NULL,
    "pageNumber" integer NOT NULL,
    "position" jsonb NOT NULL,
    "selectedText" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: topic_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.topic_notes (
    id text NOT NULL,
    "topicId" text NOT NULL,
    "userId" text NOT NULL,
    content text NOT NULL,
    "pageNumber" integer,
    "highlightId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: topic_progress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.topic_progress (
    id text NOT NULL,
    "topicId" text NOT NULL,
    "userId" text NOT NULL,
    "enrollmentId" text NOT NULL,
    "isCompleted" boolean DEFAULT false NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "totalTimeSpent" integer DEFAULT 0 NOT NULL,
    "lastAccessedAt" timestamp(3) without time zone,
    "lastPageViewed" integer DEFAULT 1 NOT NULL,
    "maxPageViewed" integer DEFAULT 1 NOT NULL,
    "pageTimeSpent" jsonb,
    "scrollPercentage" integer DEFAULT 0 NOT NULL,
    "lastPosition" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: topic_related_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.topic_related_media (
    id text NOT NULL,
    "topicId" text NOT NULL,
    title text NOT NULL,
    url text NOT NULL,
    "thumbnailUrl" text,
    description text,
    "orderIndex" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: topics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.topics (
    id text NOT NULL,
    title text NOT NULL,
    description text,
    "lessonId" text NOT NULL,
    "orderIndex" integer NOT NULL,
    "contentType" public."ContentType" DEFAULT 'PDF'::public."ContentType" NOT NULL,
    "pdfUrl" text,
    "videoUrl" text,
    duration integer,
    "pageCount" integer,
    "isPublished" boolean DEFAULT false NOT NULL,
    points integer DEFAULT 10 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: user_achievements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_achievements (
    id text NOT NULL,
    "userId" text NOT NULL,
    "achievementId" text NOT NULL,
    progress integer DEFAULT 0 NOT NULL,
    completed boolean DEFAULT false NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: user_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_analytics (
    id text NOT NULL,
    "userId" text NOT NULL,
    date date NOT NULL,
    "timeSpent" integer DEFAULT 0 NOT NULL,
    "coursesViewed" integer DEFAULT 0 NOT NULL,
    "lessonsCompleted" integer DEFAULT 0 NOT NULL,
    "quizzesTaken" integer DEFAULT 0 NOT NULL,
    "assignmentsSubmitted" integer DEFAULT 0 NOT NULL,
    "forumPosts" integer DEFAULT 0 NOT NULL,
    "forumComments" integer DEFAULT 0 NOT NULL,
    "messageseSent" integer DEFAULT 0 NOT NULL,
    "pointsEarned" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: user_badges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_badges (
    id text NOT NULL,
    "userId" text NOT NULL,
    "badgeId" text NOT NULL,
    "earnedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: user_otp_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_otp_settings (
    id text NOT NULL,
    "userId" text NOT NULL,
    "otpLoginEnabled" boolean DEFAULT true NOT NULL,
    "forceOtpPasswordReset" boolean DEFAULT false NOT NULL,
    "lastOtpRequestAt" timestamp(3) without time zone,
    "lastOtpVerifiedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles (
    id text NOT NULL,
    "userId" text NOT NULL,
    "dateOfBirth" timestamp(3) without time zone,
    gender text,
    country text,
    city text,
    timezone text,
    language text DEFAULT 'en'::text NOT NULL,
    "linkedinUrl" text,
    "githubUrl" text,
    "twitterUrl" text,
    "websiteUrl" text,
    "emailNotifications" boolean DEFAULT true NOT NULL,
    "pushNotifications" boolean DEFAULT true NOT NULL,
    "marketingEmails" boolean DEFAULT false NOT NULL,
    "courseRecommendations" boolean DEFAULT true NOT NULL,
    "profileVisibility" text DEFAULT 'PUBLIC'::text NOT NULL,
    "showEmail" boolean DEFAULT false NOT NULL,
    "showPhone" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: user_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_sessions (
    id text NOT NULL,
    "userId" text NOT NULL,
    "sessionToken" text NOT NULL,
    "deviceFingerprint" text,
    "ipAddress" text NOT NULL,
    "userAgent" text,
    location text,
    "isActive" boolean DEFAULT true NOT NULL,
    "lastActivityAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "expiresAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    phone text,
    avatar text,
    bio text,
    "roleId" text NOT NULL,
    "orgId" text,
    "deptId" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "isVerified" boolean DEFAULT false NOT NULL,
    "emailVerifiedAt" timestamp(3) without time zone,
    "isLocked" boolean DEFAULT false NOT NULL,
    "lockReason" text,
    "lockedAt" timestamp(3) without time zone,
    "lockedUntil" timestamp(3) without time zone,
    "failedLoginAttempts" integer DEFAULT 0 NOT NULL,
    "lastLoginAt" timestamp(3) without time zone,
    "lastLoginIp" text,
    "lastLoginUserAgent" text,
    "passwordChangedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "mustChangePassword" boolean DEFAULT false NOT NULL,
    "mfaEnabled" boolean DEFAULT false NOT NULL,
    "mfaSecret" text,
    "mfaBackupCodes" text[] DEFAULT ARRAY[]::text[],
    "totalPoints" integer DEFAULT 0 NOT NULL,
    "currentStreak" integer DEFAULT 0 NOT NULL,
    "longestStreak" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "ctfScore" integer DEFAULT 0 NOT NULL,
    "isLmsUser" boolean DEFAULT false NOT NULL,
    github_id text,
    avatar_url text,
    google_id text,
    social_links jsonb DEFAULT '{}'::jsonb,
    google_avatar text,
    github_avatar text,
    "lmsOnboarded" boolean DEFAULT false NOT NULL
);


--
-- Name: docker_image_metadata id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.docker_image_metadata ALTER COLUMN id SET DEFAULT nextval('public.docker_image_metadata_id_seq'::regclass);


--
-- Name: Permission Permission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Permission"
    ADD CONSTRAINT "Permission_pkey" PRIMARY KEY (id);


--
-- Name: Role Role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_pkey" PRIMARY KEY (id);


--
-- Name: _PermissionToRole _PermissionToRole_AB_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_PermissionToRole"
    ADD CONSTRAINT "_PermissionToRole_AB_pkey" PRIMARY KEY ("A", "B");


--
-- Name: access_requests access_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_requests
    ADD CONSTRAINT access_requests_pkey PRIMARY KEY (id);


--
-- Name: achievements achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT achievements_pkey PRIMARY KEY (id);


--
-- Name: admin_settings admin_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_settings
    ADD CONSTRAINT admin_settings_pkey PRIMARY KEY (id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: assignment_submissions assignment_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_submissions
    ADD CONSTRAINT assignment_submissions_pkey PRIMARY KEY (id);


--
-- Name: assignments assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: badges badges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.badges
    ADD CONSTRAINT badges_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: certificates certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT certificates_pkey PRIMARY KEY (id);


--
-- Name: certification_exam_attempts certification_exam_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certification_exam_attempts
    ADD CONSTRAINT certification_exam_attempts_pkey PRIMARY KEY (id);


--
-- Name: certification_exam_configs certification_exam_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certification_exam_configs
    ADD CONSTRAINT certification_exam_configs_pkey PRIMARY KEY (id);


--
-- Name: challenge_packs challenge_packs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.challenge_packs
    ADD CONSTRAINT challenge_packs_pkey PRIMARY KEY (id);


--
-- Name: chat_members chat_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_members
    ADD CONSTRAINT chat_members_pkey PRIMARY KEY ("chatId", "userId");


--
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- Name: chatbot_conversations chatbot_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chatbot_conversations
    ADD CONSTRAINT chatbot_conversations_pkey PRIMARY KEY (id);


--
-- Name: chatbot_messages chatbot_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chatbot_messages
    ADD CONSTRAINT chatbot_messages_pkey PRIMARY KEY (id);


--
-- Name: coding_submissions coding_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coding_submissions
    ADD CONSTRAINT coding_submissions_pkey PRIMARY KEY (id);


--
-- Name: course_analytics course_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_analytics
    ADD CONSTRAINT course_analytics_pkey PRIMARY KEY (id);


--
-- Name: course_chats course_chats_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_chats
    ADD CONSTRAINT course_chats_pkey PRIMARY KEY (id);


--
-- Name: course_prerequisites course_prerequisites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_prerequisites
    ADD CONSTRAINT course_prerequisites_pkey PRIMARY KEY (id);


--
-- Name: course_reviews course_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_reviews
    ADD CONSTRAINT course_reviews_pkey PRIMARY KEY (id);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: ctf_active_sessions ctf_active_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctf_active_sessions
    ADD CONSTRAINT ctf_active_sessions_pkey PRIMARY KEY (id);


--
-- Name: ctf_categories ctf_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctf_categories
    ADD CONSTRAINT ctf_categories_pkey PRIMARY KEY (id);


--
-- Name: ctf_challenge_artifacts ctf_challenge_artifacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctf_challenge_artifacts
    ADD CONSTRAINT ctf_challenge_artifacts_pkey PRIMARY KEY (id);


--
-- Name: ctf_challenges ctf_challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctf_challenges
    ADD CONSTRAINT ctf_challenges_pkey PRIMARY KEY (id);


--
-- Name: ctf_courses ctf_courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctf_courses
    ADD CONSTRAINT ctf_courses_pkey PRIMARY KEY (id);


--
-- Name: ctf_docker_instances ctf_docker_instances_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctf_docker_instances
    ADD CONSTRAINT ctf_docker_instances_pkey PRIMARY KEY (id);


--
-- Name: ctf_enrollment_codes ctf_enrollment_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctf_enrollment_codes
    ADD CONSTRAINT ctf_enrollment_codes_pkey PRIMARY KEY (id);


--
-- Name: ctf_enrollments ctf_enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctf_enrollments
    ADD CONSTRAINT ctf_enrollments_pkey PRIMARY KEY (id);


--
-- Name: ctf_modules ctf_modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctf_modules
    ADD CONSTRAINT ctf_modules_pkey PRIMARY KEY (id);


--
-- Name: ctf_notifications ctf_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctf_notifications
    ADD CONSTRAINT ctf_notifications_pkey PRIMARY KEY (id);


--
-- Name: ctf_otp_codes ctf_otp_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctf_otp_codes
    ADD CONSTRAINT ctf_otp_codes_pkey PRIMARY KEY (id);


--
-- Name: ctf_progress ctf_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctf_progress
    ADD CONSTRAINT ctf_progress_pkey PRIMARY KEY (id);


--
-- Name: ctf_public_challenges ctf_public_challenges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctf_public_challenges
    ADD CONSTRAINT ctf_public_challenges_pkey PRIMARY KEY (id);


--
-- Name: ctf_public_progress ctf_public_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctf_public_progress
    ADD CONSTRAINT ctf_public_progress_pkey PRIMARY KEY (id);


--
-- Name: ctf_user_notifications ctf_user_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctf_user_notifications
    ADD CONSTRAINT ctf_user_notifications_pkey PRIMARY KEY (id);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: docker_image_metadata docker_image_metadata_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.docker_image_metadata
    ADD CONSTRAINT docker_image_metadata_pkey PRIMARY KEY (id);


--
-- Name: enrollment_codes enrollment_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollment_codes
    ADD CONSTRAINT enrollment_codes_pkey PRIMARY KEY (id);


--
-- Name: enrollments enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT enrollments_pkey PRIMARY KEY (id);


--
-- Name: feature_flags feature_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT feature_flags_pkey PRIMARY KEY (id);


--
-- Name: feedback feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedback
    ADD CONSTRAINT feedback_pkey PRIMARY KEY (id);


--
-- Name: final_exam_access_codes final_exam_access_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.final_exam_access_codes
    ADD CONSTRAINT final_exam_access_codes_pkey PRIMARY KEY (id);


--
-- Name: final_exam_access_requests final_exam_access_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.final_exam_access_requests
    ADD CONSTRAINT final_exam_access_requests_pkey PRIMARY KEY (id);


--
-- Name: final_exam_answers final_exam_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.final_exam_answers
    ADD CONSTRAINT final_exam_answers_pkey PRIMARY KEY (id);


--
-- Name: final_exam_attempts final_exam_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.final_exam_attempts
    ADD CONSTRAINT final_exam_attempts_pkey PRIMARY KEY (id);


--
-- Name: final_exam_proctoring_logs final_exam_proctoring_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.final_exam_proctoring_logs
    ADD CONSTRAINT final_exam_proctoring_logs_pkey PRIMARY KEY (id);


--
-- Name: final_exam_questions final_exam_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.final_exam_questions
    ADD CONSTRAINT final_exam_questions_pkey PRIMARY KEY (id);


--
-- Name: final_exams final_exams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.final_exams
    ADD CONSTRAINT final_exams_pkey PRIMARY KEY (id);


--
-- Name: forum_comments forum_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_comments
    ADD CONSTRAINT forum_comments_pkey PRIMARY KEY (id);


--
-- Name: forum_posts forum_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_posts
    ADD CONSTRAINT forum_posts_pkey PRIMARY KEY (id);


--
-- Name: forums forums_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forums
    ADD CONSTRAINT forums_pkey PRIMARY KEY (id);


--
-- Name: internships internships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internships
    ADD CONSTRAINT internships_pkey PRIMARY KEY (id);


--
-- Name: lesson_progress lesson_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT lesson_progress_pkey PRIMARY KEY (id);


--
-- Name: lessons lessons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT lessons_pkey PRIMARY KEY (id);


--
-- Name: magic_login_tokens magic_login_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_login_tokens
    ADD CONSTRAINT magic_login_tokens_pkey PRIMARY KEY (id);


--
-- Name: media media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.media
    ADD CONSTRAINT media_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: module_quiz_attempts module_quiz_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_quiz_attempts
    ADD CONSTRAINT module_quiz_attempts_pkey PRIMARY KEY (id);


--
-- Name: module_quiz_questions module_quiz_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_quiz_questions
    ADD CONSTRAINT module_quiz_questions_pkey PRIMARY KEY (id);


--
-- Name: module_quizzes module_quizzes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_quizzes
    ADD CONSTRAINT module_quizzes_pkey PRIMARY KEY (id);


--
-- Name: modules modules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT modules_pkey PRIMARY KEY (id);


--
-- Name: nexus_usage nexus_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.nexus_usage
    ADD CONSTRAINT nexus_usage_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: offer_letter_requests offer_letter_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offer_letter_requests
    ADD CONSTRAINT offer_letter_requests_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: otps otps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otps
    ADD CONSTRAINT otps_pkey PRIMARY KEY (id);


--
-- Name: partner_payouts partner_payouts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_payouts
    ADD CONSTRAINT partner_payouts_pkey PRIMARY KEY (id);


--
-- Name: partner_referral_usages partner_referral_usages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_referral_usages
    ADD CONSTRAINT partner_referral_usages_pkey PRIMARY KEY (id);


--
-- Name: partner_referrals partner_referrals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_referrals
    ADD CONSTRAINT partner_referrals_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: pinned_messages pinned_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pinned_messages
    ADD CONSTRAINT pinned_messages_pkey PRIMARY KEY ("chatId", "messageId");


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: quiz_answers quiz_answers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_answers
    ADD CONSTRAINT quiz_answers_pkey PRIMARY KEY (id);


--
-- Name: quiz_attempts quiz_attempts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT quiz_attempts_pkey PRIMARY KEY (id);


--
-- Name: quiz_questions quiz_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_questions
    ADD CONSTRAINT quiz_questions_pkey PRIMARY KEY (id);


--
-- Name: quizzes quizzes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT quizzes_pkey PRIMARY KEY (id);


--
-- Name: referral_code_usages referral_code_usages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_code_usages
    ADD CONSTRAINT referral_code_usages_pkey PRIMARY KEY (id);


--
-- Name: referral_codes referral_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_codes
    ADD CONSTRAINT referral_codes_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: security_events security_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT security_events_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: topic_highlights topic_highlights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topic_highlights
    ADD CONSTRAINT topic_highlights_pkey PRIMARY KEY (id);


--
-- Name: topic_notes topic_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topic_notes
    ADD CONSTRAINT topic_notes_pkey PRIMARY KEY (id);


--
-- Name: topic_progress topic_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topic_progress
    ADD CONSTRAINT topic_progress_pkey PRIMARY KEY (id);


--
-- Name: topic_related_media topic_related_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topic_related_media
    ADD CONSTRAINT topic_related_media_pkey PRIMARY KEY (id);


--
-- Name: topics topics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topics
    ADD CONSTRAINT topics_pkey PRIMARY KEY (id);


--
-- Name: user_achievements user_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT user_achievements_pkey PRIMARY KEY (id);


--
-- Name: user_analytics user_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_analytics
    ADD CONSTRAINT user_analytics_pkey PRIMARY KEY (id);


--
-- Name: user_badges user_badges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT user_badges_pkey PRIMARY KEY (id);


--
-- Name: user_otp_settings user_otp_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_otp_settings
    ADD CONSTRAINT user_otp_settings_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: user_sessions user_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT user_sessions_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: Permission_module_action_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Permission_module_action_idx" ON public."Permission" USING btree (module, action);


--
-- Name: Permission_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Permission_name_key" ON public."Permission" USING btree (name);


--
-- Name: Role_name_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Role_name_idx" ON public."Role" USING btree (name);


--
-- Name: Role_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Role_name_key" ON public."Role" USING btree (name);


--
-- Name: Role_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Role_type_idx" ON public."Role" USING btree (type);


--
-- Name: _PermissionToRole_B_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "_PermissionToRole_B_index" ON public."_PermissionToRole" USING btree ("B");


--
-- Name: access_requests_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "access_requests_createdAt_idx" ON public.access_requests USING btree ("createdAt");


--
-- Name: access_requests_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX access_requests_email_idx ON public.access_requests USING btree (email);


--
-- Name: access_requests_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX access_requests_status_idx ON public.access_requests USING btree (status);


--
-- Name: achievements_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX achievements_name_key ON public.achievements USING btree (name);


--
-- Name: admin_settings_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX admin_settings_key_key ON public.admin_settings USING btree (key);


--
-- Name: announcements_courseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "announcements_courseId_idx" ON public.announcements USING btree ("courseId");


--
-- Name: assignment_submissions_assignmentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "assignment_submissions_assignmentId_idx" ON public.assignment_submissions USING btree ("assignmentId");


--
-- Name: assignment_submissions_assignmentId_userId_attemptNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "assignment_submissions_assignmentId_userId_attemptNumber_key" ON public.assignment_submissions USING btree ("assignmentId", "userId", "attemptNumber");


--
-- Name: assignment_submissions_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX assignment_submissions_status_idx ON public.assignment_submissions USING btree (status);


--
-- Name: assignment_submissions_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "assignment_submissions_userId_idx" ON public.assignment_submissions USING btree ("userId");


--
-- Name: assignments_courseid_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX assignments_courseid_idx ON public.assignments USING btree ("courseId");


--
-- Name: audit_logs_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "audit_logs_createdAt_idx" ON public.audit_logs USING btree ("createdAt");


--
-- Name: audit_logs_entityType_entityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "audit_logs_entityType_entityId_idx" ON public.audit_logs USING btree ("entityType", "entityId");


--
-- Name: audit_logs_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "audit_logs_userId_idx" ON public.audit_logs USING btree ("userId");


--
-- Name: badges_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX badges_name_key ON public.badges USING btree (name);


--
-- Name: categories_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX categories_name_key ON public.categories USING btree (name);


--
-- Name: categories_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX categories_slug_idx ON public.categories USING btree (slug);


--
-- Name: categories_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX categories_slug_key ON public.categories USING btree (slug);


--
-- Name: certificates_certificateNumber_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "certificates_certificateNumber_idx" ON public.certificates USING btree ("certificateNumber");


--
-- Name: certificates_certificateNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "certificates_certificateNumber_key" ON public.certificates USING btree ("certificateNumber");


--
-- Name: certificates_courseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "certificates_courseId_idx" ON public.certificates USING btree ("courseId");


--
-- Name: certificates_enrollmentId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "certificates_enrollmentId_key" ON public.certificates USING btree ("enrollmentId");


--
-- Name: certificates_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "certificates_userId_idx" ON public.certificates USING btree ("userId");


--
-- Name: certification_exam_attempts_assignedPool_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "certification_exam_attempts_assignedPool_idx" ON public.certification_exam_attempts USING btree ("assignedPool");


--
-- Name: certification_exam_attempts_examConfigId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "certification_exam_attempts_examConfigId_idx" ON public.certification_exam_attempts USING btree ("examConfigId");


--
-- Name: certification_exam_attempts_lmsFinalExamAttemptId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "certification_exam_attempts_lmsFinalExamAttemptId_key" ON public.certification_exam_attempts USING btree ("lmsFinalExamAttemptId");


--
-- Name: certification_exam_attempts_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX certification_exam_attempts_status_idx ON public.certification_exam_attempts USING btree (status);


--
-- Name: certification_exam_attempts_userId_examConfigId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "certification_exam_attempts_userId_examConfigId_idx" ON public.certification_exam_attempts USING btree ("userId", "examConfigId");


--
-- Name: certification_exam_attempts_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "certification_exam_attempts_userId_idx" ON public.certification_exam_attempts USING btree ("userId");


--
-- Name: certification_exam_configs_isPublished_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "certification_exam_configs_isPublished_idx" ON public.certification_exam_configs USING btree ("isPublished");


--
-- Name: certification_exam_configs_lmsFinalExamId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "certification_exam_configs_lmsFinalExamId_idx" ON public.certification_exam_configs USING btree ("lmsFinalExamId");


--
-- Name: certification_exam_configs_lmsFinalExamId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "certification_exam_configs_lmsFinalExamId_key" ON public.certification_exam_configs USING btree ("lmsFinalExamId");


--
-- Name: challenge_packs_pack_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX challenge_packs_pack_name_key ON public.challenge_packs USING btree (pack_name);


--
-- Name: chat_members_chatId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "chat_members_chatId_idx" ON public.chat_members USING btree ("chatId");


--
-- Name: chat_messages_chatId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "chat_messages_chatId_createdAt_idx" ON public.chat_messages USING btree ("chatId", "createdAt");


--
-- Name: chat_messages_chatId_parentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "chat_messages_chatId_parentId_idx" ON public.chat_messages USING btree ("chatId", "parentId");


--
-- Name: chat_messages_senderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "chat_messages_senderId_idx" ON public.chat_messages USING btree ("senderId");


--
-- Name: chatbot_conversations_courseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "chatbot_conversations_courseId_idx" ON public.chatbot_conversations USING btree ("courseId");


--
-- Name: chatbot_conversations_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "chatbot_conversations_isActive_idx" ON public.chatbot_conversations USING btree ("isActive");


--
-- Name: chatbot_conversations_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "chatbot_conversations_userId_idx" ON public.chatbot_conversations USING btree ("userId");


--
-- Name: chatbot_messages_conversationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "chatbot_messages_conversationId_idx" ON public.chatbot_messages USING btree ("conversationId");


--
-- Name: chatbot_messages_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "chatbot_messages_createdAt_idx" ON public.chatbot_messages USING btree ("createdAt");


--
-- Name: chatbot_messages_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "chatbot_messages_userId_idx" ON public.chatbot_messages USING btree ("userId");


--
-- Name: course_analytics_courseId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "course_analytics_courseId_date_idx" ON public.course_analytics USING btree ("courseId", date);


--
-- Name: course_analytics_courseId_date_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "course_analytics_courseId_date_key" ON public.course_analytics USING btree ("courseId", date);


--
-- Name: course_chats_courseId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "course_chats_courseId_key" ON public.course_chats USING btree ("courseId");


--
-- Name: course_prerequisites_courseId_prerequisiteId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "course_prerequisites_courseId_prerequisiteId_key" ON public.course_prerequisites USING btree ("courseId", "prerequisiteId");


--
-- Name: course_reviews_courseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "course_reviews_courseId_idx" ON public.course_reviews USING btree ("courseId");


--
-- Name: course_reviews_courseId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "course_reviews_courseId_userId_key" ON public.course_reviews USING btree ("courseId", "userId");


--
-- Name: course_reviews_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "course_reviews_userId_idx" ON public.course_reviews USING btree ("userId");


--
-- Name: courses_categoryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "courses_categoryId_idx" ON public.courses USING btree ("categoryId");


--
-- Name: courses_courseCode_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "courses_courseCode_idx" ON public.courses USING btree ("courseCode");


--
-- Name: courses_courseCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "courses_courseCode_key" ON public.courses USING btree ("courseCode");


--
-- Name: courses_createdById_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "courses_createdById_idx" ON public.courses USING btree ("createdById");


--
-- Name: courses_instructorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "courses_instructorId_idx" ON public.courses USING btree ("instructorId");


--
-- Name: courses_level_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX courses_level_idx ON public.courses USING btree (level);


--
-- Name: courses_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX courses_slug_idx ON public.courses USING btree (slug);


--
-- Name: courses_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX courses_slug_key ON public.courses USING btree (slug);


--
-- Name: courses_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX courses_status_idx ON public.courses USING btree (status);


--
-- Name: ctf_active_sessions_session_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ctf_active_sessions_session_token_key ON public.ctf_active_sessions USING btree (session_token);


--
-- Name: ctf_categories_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ctf_categories_isActive_idx" ON public.ctf_categories USING btree ("isActive");


--
-- Name: ctf_categories_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ctf_categories_name_key ON public.ctf_categories USING btree (name);


--
-- Name: ctf_challenges_ctfModuleId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ctf_challenges_ctfModuleId_idx" ON public.ctf_challenges USING btree ("ctfModuleId");


--
-- Name: ctf_challenges_isPublished_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ctf_challenges_isPublished_idx" ON public.ctf_challenges USING btree ("isPublished");


--
-- Name: ctf_challenges_topicNumber_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ctf_challenges_topicNumber_idx" ON public.ctf_challenges USING btree ("topicNumber");


--
-- Name: ctf_courses_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ctf_courses_isActive_idx" ON public.ctf_courses USING btree ("isActive");


--
-- Name: ctf_courses_lmsCourseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ctf_courses_lmsCourseId_idx" ON public.ctf_courses USING btree ("lmsCourseId");


--
-- Name: ctf_courses_lmsCourseId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ctf_courses_lmsCourseId_key" ON public.ctf_courses USING btree ("lmsCourseId");


--
-- Name: ctf_docker_instances_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ctf_docker_instances_status_idx ON public.ctf_docker_instances USING btree (status);


--
-- Name: ctf_docker_instances_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ctf_docker_instances_userId_idx" ON public.ctf_docker_instances USING btree ("userId");


--
-- Name: ctf_enrollment_codes_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ctf_enrollment_codes_code_idx ON public.ctf_enrollment_codes USING btree (code);


--
-- Name: ctf_enrollment_codes_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ctf_enrollment_codes_code_key ON public.ctf_enrollment_codes USING btree (code);


--
-- Name: ctf_enrollment_codes_ctfCourseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ctf_enrollment_codes_ctfCourseId_idx" ON public.ctf_enrollment_codes USING btree ("ctfCourseId");


--
-- Name: ctf_enrollments_ctfCourseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ctf_enrollments_ctfCourseId_idx" ON public.ctf_enrollments USING btree ("ctfCourseId");


--
-- Name: ctf_enrollments_lmsEnrollmentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ctf_enrollments_lmsEnrollmentId_idx" ON public.ctf_enrollments USING btree ("lmsEnrollmentId");


--
-- Name: ctf_enrollments_userId_ctfCourseId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ctf_enrollments_userId_ctfCourseId_key" ON public.ctf_enrollments USING btree ("userId", "ctfCourseId");


--
-- Name: ctf_enrollments_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ctf_enrollments_userId_idx" ON public.ctf_enrollments USING btree ("userId");


--
-- Name: ctf_modules_ctfCourseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ctf_modules_ctfCourseId_idx" ON public.ctf_modules USING btree ("ctfCourseId");


--
-- Name: ctf_modules_ctfCourseId_orderIndex_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ctf_modules_ctfCourseId_orderIndex_key" ON public.ctf_modules USING btree ("ctfCourseId", "orderIndex");


--
-- Name: ctf_notifications_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ctf_notifications_createdAt_idx" ON public.ctf_notifications USING btree ("createdAt");


--
-- Name: ctf_notifications_senderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ctf_notifications_senderId_idx" ON public.ctf_notifications USING btree ("senderId");


--
-- Name: ctf_progress_challengeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ctf_progress_challengeId_idx" ON public.ctf_progress USING btree ("challengeId");


--
-- Name: ctf_progress_enrollmentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ctf_progress_enrollmentId_idx" ON public.ctf_progress USING btree ("enrollmentId");


--
-- Name: ctf_progress_userId_challengeId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ctf_progress_userId_challengeId_key" ON public.ctf_progress USING btree ("userId", "challengeId");


--
-- Name: ctf_progress_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ctf_progress_userId_idx" ON public.ctf_progress USING btree ("userId");


--
-- Name: ctf_public_challenges_categoryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ctf_public_challenges_categoryId_idx" ON public.ctf_public_challenges USING btree ("categoryId");


--
-- Name: ctf_public_challenges_isPublished_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ctf_public_challenges_isPublished_idx" ON public.ctf_public_challenges USING btree ("isPublished");


--
-- Name: ctf_public_progress_challengeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ctf_public_progress_challengeId_idx" ON public.ctf_public_progress USING btree ("challengeId");


--
-- Name: ctf_public_progress_userId_challengeId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ctf_public_progress_userId_challengeId_key" ON public.ctf_public_progress USING btree ("userId", "challengeId");


--
-- Name: ctf_public_progress_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ctf_public_progress_userId_idx" ON public.ctf_public_progress USING btree ("userId");


--
-- Name: ctf_user_notifications_notificationId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ctf_user_notifications_notificationId_idx" ON public.ctf_user_notifications USING btree ("notificationId");


--
-- Name: ctf_user_notifications_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ctf_user_notifications_userId_idx" ON public.ctf_user_notifications USING btree ("userId");


--
-- Name: ctf_user_notifications_userId_notificationId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ctf_user_notifications_userId_notificationId_key" ON public.ctf_user_notifications USING btree ("userId", "notificationId");


--
-- Name: departments_orgId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "departments_orgId_idx" ON public.departments USING btree ("orgId");


--
-- Name: docker_image_metadata_image_url_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX docker_image_metadata_image_url_key ON public.docker_image_metadata USING btree (image_url);


--
-- Name: enrollment_codes_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX enrollment_codes_code_idx ON public.enrollment_codes USING btree (code);


--
-- Name: enrollment_codes_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX enrollment_codes_code_key ON public.enrollment_codes USING btree (code);


--
-- Name: enrollment_codes_courseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "enrollment_codes_courseId_idx" ON public.enrollment_codes USING btree ("courseId");


--
-- Name: enrollment_codes_isUsed_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "enrollment_codes_isUsed_idx" ON public.enrollment_codes USING btree ("isUsed");


--
-- Name: enrollment_codes_userEmail_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "enrollment_codes_userEmail_idx" ON public.enrollment_codes USING btree ("userEmail");


--
-- Name: enrollment_codes_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "enrollment_codes_userId_idx" ON public.enrollment_codes USING btree ("userId");


--
-- Name: enrollments_courseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "enrollments_courseId_idx" ON public.enrollments USING btree ("courseId");


--
-- Name: enrollments_enrollmentCodeId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "enrollments_enrollmentCodeId_key" ON public.enrollments USING btree ("enrollmentCodeId");


--
-- Name: enrollments_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX enrollments_status_idx ON public.enrollments USING btree (status);


--
-- Name: enrollments_userId_courseId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "enrollments_userId_courseId_key" ON public.enrollments USING btree ("userId", "courseId");


--
-- Name: enrollments_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "enrollments_userId_idx" ON public.enrollments USING btree ("userId");


--
-- Name: feature_flags_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX feature_flags_key_key ON public.feature_flags USING btree (key);


--
-- Name: feedback_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX feedback_status_idx ON public.feedback USING btree (status);


--
-- Name: final_exam_access_codes_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX final_exam_access_codes_code_idx ON public.final_exam_access_codes USING btree (code);


--
-- Name: final_exam_access_codes_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX final_exam_access_codes_code_key ON public.final_exam_access_codes USING btree (code);


--
-- Name: final_exam_access_codes_examId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "final_exam_access_codes_examId_idx" ON public.final_exam_access_codes USING btree ("examId");


--
-- Name: final_exam_access_codes_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "final_exam_access_codes_userId_idx" ON public.final_exam_access_codes USING btree ("userId");


--
-- Name: final_exam_access_requests_examId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "final_exam_access_requests_examId_idx" ON public.final_exam_access_requests USING btree ("examId");


--
-- Name: final_exam_access_requests_examId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "final_exam_access_requests_examId_userId_key" ON public.final_exam_access_requests USING btree ("examId", "userId");


--
-- Name: final_exam_access_requests_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX final_exam_access_requests_status_idx ON public.final_exam_access_requests USING btree (status);


--
-- Name: final_exam_access_requests_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "final_exam_access_requests_userId_idx" ON public.final_exam_access_requests USING btree ("userId");


--
-- Name: final_exam_answers_attemptId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "final_exam_answers_attemptId_idx" ON public.final_exam_answers USING btree ("attemptId");


--
-- Name: final_exam_answers_attemptId_questionId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "final_exam_answers_attemptId_questionId_key" ON public.final_exam_answers USING btree ("attemptId", "questionId");


--
-- Name: final_exam_attempts_accessCodeId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "final_exam_attempts_accessCodeId_key" ON public.final_exam_attempts USING btree ("accessCodeId");


--
-- Name: final_exam_attempts_examId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "final_exam_attempts_examId_idx" ON public.final_exam_attempts USING btree ("examId");


--
-- Name: final_exam_attempts_startedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "final_exam_attempts_startedAt_idx" ON public.final_exam_attempts USING btree ("startedAt");


--
-- Name: final_exam_attempts_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "final_exam_attempts_userId_idx" ON public.final_exam_attempts USING btree ("userId");


--
-- Name: final_exam_proctoring_logs_attemptId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "final_exam_proctoring_logs_attemptId_idx" ON public.final_exam_proctoring_logs USING btree ("attemptId");


--
-- Name: final_exam_proctoring_logs_eventType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "final_exam_proctoring_logs_eventType_idx" ON public.final_exam_proctoring_logs USING btree ("eventType");


--
-- Name: final_exam_questions_examId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "final_exam_questions_examId_idx" ON public.final_exam_questions USING btree ("examId");


--
-- Name: final_exams_courseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "final_exams_courseId_idx" ON public.final_exams USING btree ("courseId");


--
-- Name: final_exams_isPublished_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "final_exams_isPublished_idx" ON public.final_exams USING btree ("isPublished");


--
-- Name: final_exams_startDate_endDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "final_exams_startDate_endDate_idx" ON public.final_exams USING btree ("startDate", "endDate");


--
-- Name: forum_comments_authorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "forum_comments_authorId_idx" ON public.forum_comments USING btree ("authorId");


--
-- Name: forum_comments_postId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "forum_comments_postId_idx" ON public.forum_comments USING btree ("postId");


--
-- Name: forum_posts_authorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "forum_posts_authorId_idx" ON public.forum_posts USING btree ("authorId");


--
-- Name: forum_posts_forumId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "forum_posts_forumId_idx" ON public.forum_posts USING btree ("forumId");


--
-- Name: forums_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX forums_slug_idx ON public.forums USING btree (slug);


--
-- Name: forums_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX forums_slug_key ON public.forums USING btree (slug);


--
-- Name: idx_ctf_otp_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ctf_otp_email ON public.ctf_otp_codes USING btree (email);


--
-- Name: idx_ctf_otp_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ctf_otp_expires ON public.ctf_otp_codes USING btree (expires_at);


--
-- Name: idx_ctf_otp_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ctf_otp_user_id ON public.ctf_otp_codes USING btree (user_id);


--
-- Name: idx_ctf_sessions_expires; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ctf_sessions_expires ON public.ctf_active_sessions USING btree (expires_at);


--
-- Name: idx_ctf_sessions_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ctf_sessions_token ON public.ctf_active_sessions USING btree (session_token);


--
-- Name: idx_ctf_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ctf_sessions_user_id ON public.ctf_active_sessions USING btree (user_id);


--
-- Name: idx_mqa_quiz_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mqa_quiz_user ON public.module_quiz_attempts USING btree (quiz_id, user_id);


--
-- Name: idx_public_partner_payouts_partner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_public_partner_payouts_partner_id ON public.partner_payouts USING btree (partner_referral_id);


--
-- Name: idx_public_partner_payouts_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_public_partner_payouts_status ON public.partner_payouts USING btree (status);


--
-- Name: idx_public_partner_referral_usages_customer_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_public_partner_referral_usages_customer_email ON public.partner_referral_usages USING btree (customer_email);


--
-- Name: idx_public_partner_referral_usages_is_paid_out; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_public_partner_referral_usages_is_paid_out ON public.partner_referral_usages USING btree (is_paid_out);


--
-- Name: idx_public_partner_referral_usages_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_public_partner_referral_usages_order_id ON public.partner_referral_usages USING btree (order_id);


--
-- Name: idx_public_partner_referral_usages_partner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_public_partner_referral_usages_partner_id ON public.partner_referral_usages USING btree (partner_referral_id);


--
-- Name: idx_public_partner_referrals_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_public_partner_referrals_code ON public.partner_referrals USING btree (code);


--
-- Name: idx_public_partner_referrals_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_public_partner_referrals_is_active ON public.partner_referrals USING btree (is_active);


--
-- Name: idx_public_partner_referrals_partner_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_public_partner_referrals_partner_email ON public.partner_referrals USING btree (partner_email);


--
-- Name: idx_public_referral_code_usages_code_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_public_referral_code_usages_code_id ON public.referral_code_usages USING btree (referral_code_id);


--
-- Name: idx_public_referral_codes_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_public_referral_codes_code ON public.referral_codes USING btree (code);


--
-- Name: idx_quiz_attempts_quiz; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quiz_attempts_quiz ON public.module_quiz_attempts USING btree (quiz_id);


--
-- Name: idx_quiz_attempts_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quiz_attempts_user ON public.module_quiz_attempts USING btree (user_id);


--
-- Name: idx_quiz_course; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quiz_course ON public.module_quizzes USING btree (course_id);


--
-- Name: idx_quiz_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quiz_module ON public.module_quizzes USING btree (module_id);


--
-- Name: idx_quiz_questions_quiz; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quiz_questions_quiz ON public.module_quiz_questions USING btree (quiz_id);


--
-- Name: internships_endDate_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "internships_endDate_idx" ON public.internships USING btree ("endDate");


--
-- Name: internships_programType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "internships_programType_idx" ON public.internships USING btree ("programType");


--
-- Name: internships_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX internships_status_idx ON public.internships USING btree (status);


--
-- Name: internships_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "internships_userId_idx" ON public.internships USING btree ("userId");


--
-- Name: lesson_progress_enrollmentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "lesson_progress_enrollmentId_idx" ON public.lesson_progress USING btree ("enrollmentId");


--
-- Name: lesson_progress_enrollmentId_lessonId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "lesson_progress_enrollmentId_lessonId_key" ON public.lesson_progress USING btree ("enrollmentId", "lessonId");


--
-- Name: lesson_progress_lessonId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "lesson_progress_lessonId_idx" ON public.lesson_progress USING btree ("lessonId");


--
-- Name: lessons_moduleId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "lessons_moduleId_idx" ON public.lessons USING btree ("moduleId");


--
-- Name: lessons_moduleId_orderIndex_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "lessons_moduleId_orderIndex_key" ON public.lessons USING btree ("moduleId", "orderIndex");


--
-- Name: magic_login_tokens_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "magic_login_tokens_expiresAt_idx" ON public.magic_login_tokens USING btree ("expiresAt");


--
-- Name: magic_login_tokens_tokenHash_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "magic_login_tokens_tokenHash_idx" ON public.magic_login_tokens USING btree ("tokenHash");


--
-- Name: magic_login_tokens_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "magic_login_tokens_userId_idx" ON public.magic_login_tokens USING btree ("userId");


--
-- Name: media_entityType_entityId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "media_entityType_entityId_idx" ON public.media USING btree ("entityType", "entityId");


--
-- Name: messages_receiverId_isRead_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "messages_receiverId_isRead_idx" ON public.messages USING btree ("receiverId", "isRead");


--
-- Name: messages_senderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "messages_senderId_idx" ON public.messages USING btree ("senderId");


--
-- Name: module_quiz_attempts_quiz_id_user_id_attempt_number_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX module_quiz_attempts_quiz_id_user_id_attempt_number_key ON public.module_quiz_attempts USING btree (quiz_id, user_id, attempt_number);


--
-- Name: modules_courseId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "modules_courseId_idx" ON public.modules USING btree ("courseId");


--
-- Name: modules_courseId_orderIndex_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "modules_courseId_orderIndex_key" ON public.modules USING btree ("courseId", "orderIndex");


--
-- Name: notifications_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "notifications_createdAt_idx" ON public.notifications USING btree ("createdAt");


--
-- Name: notifications_userId_isRead_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "notifications_userId_isRead_idx" ON public.notifications USING btree ("userId", "isRead");


--
-- Name: offer_letter_requests_internshipId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "offer_letter_requests_internshipId_key" ON public.offer_letter_requests USING btree ("internshipId");


--
-- Name: offer_letter_requests_requestedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "offer_letter_requests_requestedAt_idx" ON public.offer_letter_requests USING btree ("requestedAt");


--
-- Name: offer_letter_requests_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX offer_letter_requests_status_idx ON public.offer_letter_requests USING btree (status);


--
-- Name: offer_letter_requests_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "offer_letter_requests_userId_idx" ON public.offer_letter_requests USING btree ("userId");


--
-- Name: organizations_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX organizations_slug_idx ON public.organizations USING btree (slug);


--
-- Name: organizations_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX organizations_slug_key ON public.organizations USING btree (slug);


--
-- Name: otps_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX otps_email_idx ON public.otps USING btree (email);


--
-- Name: otps_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "otps_expiresAt_idx" ON public.otps USING btree ("expiresAt");


--
-- Name: otps_purpose_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX otps_purpose_idx ON public.otps USING btree (purpose);


--
-- Name: otps_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX otps_status_idx ON public.otps USING btree (status);


--
-- Name: otps_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "otps_userId_idx" ON public.otps USING btree ("userId");


--
-- Name: partner_referrals_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX partner_referrals_code_key ON public.partner_referrals USING btree (code);


--
-- Name: password_reset_tokens_expiresAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "password_reset_tokens_expiresAt_idx" ON public.password_reset_tokens USING btree ("expiresAt");


--
-- Name: password_reset_tokens_tokenHash_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "password_reset_tokens_tokenHash_idx" ON public.password_reset_tokens USING btree ("tokenHash");


--
-- Name: password_reset_tokens_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "password_reset_tokens_userId_idx" ON public.password_reset_tokens USING btree ("userId");


--
-- Name: payments_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX payments_status_idx ON public.payments USING btree (status);


--
-- Name: payments_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "payments_userId_idx" ON public.payments USING btree ("userId");


--
-- Name: push_subscriptions_userId_endpoint_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "push_subscriptions_userId_endpoint_key" ON public.push_subscriptions USING btree ("userId", endpoint);


--
-- Name: push_subscriptions_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "push_subscriptions_userId_idx" ON public.push_subscriptions USING btree ("userId");


--
-- Name: quiz_answers_attemptId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "quiz_answers_attemptId_idx" ON public.quiz_answers USING btree ("attemptId");


--
-- Name: quiz_answers_attemptId_questionId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "quiz_answers_attemptId_questionId_key" ON public.quiz_answers USING btree ("attemptId", "questionId");


--
-- Name: quiz_attempts_quizId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "quiz_attempts_quizId_idx" ON public.quiz_attempts USING btree ("quizId");


--
-- Name: quiz_attempts_quizId_userId_attemptNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "quiz_attempts_quizId_userId_attemptNumber_key" ON public.quiz_attempts USING btree ("quizId", "userId", "attemptNumber");


--
-- Name: quiz_attempts_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "quiz_attempts_userId_idx" ON public.quiz_attempts USING btree ("userId");


--
-- Name: quiz_questions_quizId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "quiz_questions_quizId_idx" ON public.quiz_questions USING btree ("quizId");


--
-- Name: referral_codes_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX referral_codes_code_key ON public.referral_codes USING btree (code);


--
-- Name: refresh_tokens_token_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX refresh_tokens_token_idx ON public.refresh_tokens USING btree (token);


--
-- Name: refresh_tokens_token_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX refresh_tokens_token_key ON public.refresh_tokens USING btree (token);


--
-- Name: refresh_tokens_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "refresh_tokens_userId_idx" ON public.refresh_tokens USING btree ("userId");


--
-- Name: security_events_eventType_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "security_events_eventType_idx" ON public.security_events USING btree ("eventType");


--
-- Name: security_events_severity_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX security_events_severity_idx ON public.security_events USING btree (severity);


--
-- Name: security_events_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "security_events_userId_idx" ON public.security_events USING btree ("userId");


--
-- Name: subscriptions_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX subscriptions_status_idx ON public.subscriptions USING btree (status);


--
-- Name: subscriptions_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "subscriptions_userId_idx" ON public.subscriptions USING btree ("userId");


--
-- Name: system_settings_key_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX system_settings_key_idx ON public.system_settings USING btree (key);


--
-- Name: system_settings_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX system_settings_key_key ON public.system_settings USING btree (key);


--
-- Name: topic_highlights_topicId_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "topic_highlights_topicId_userId_idx" ON public.topic_highlights USING btree ("topicId", "userId");


--
-- Name: topic_notes_topicId_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "topic_notes_topicId_userId_idx" ON public.topic_notes USING btree ("topicId", "userId");


--
-- Name: topic_progress_enrollmentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "topic_progress_enrollmentId_idx" ON public.topic_progress USING btree ("enrollmentId");


--
-- Name: topic_progress_topicId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "topic_progress_topicId_idx" ON public.topic_progress USING btree ("topicId");


--
-- Name: topic_progress_topicId_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "topic_progress_topicId_userId_key" ON public.topic_progress USING btree ("topicId", "userId");


--
-- Name: topic_progress_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "topic_progress_userId_idx" ON public.topic_progress USING btree ("userId");


--
-- Name: topic_related_media_topicId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "topic_related_media_topicId_idx" ON public.topic_related_media USING btree ("topicId");


--
-- Name: topics_lessonId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "topics_lessonId_idx" ON public.topics USING btree ("lessonId");


--
-- Name: topics_lessonId_orderIndex_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "topics_lessonId_orderIndex_key" ON public.topics USING btree ("lessonId", "orderIndex");


--
-- Name: user_achievements_userId_achievementId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "user_achievements_userId_achievementId_key" ON public.user_achievements USING btree ("userId", "achievementId");


--
-- Name: user_achievements_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_achievements_userId_idx" ON public.user_achievements USING btree ("userId");


--
-- Name: user_analytics_userId_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_analytics_userId_date_idx" ON public.user_analytics USING btree ("userId", date);


--
-- Name: user_analytics_userId_date_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "user_analytics_userId_date_key" ON public.user_analytics USING btree ("userId", date);


--
-- Name: user_badges_userId_badgeId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "user_badges_userId_badgeId_key" ON public.user_badges USING btree ("userId", "badgeId");


--
-- Name: user_badges_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_badges_userId_idx" ON public.user_badges USING btree ("userId");


--
-- Name: user_otp_settings_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_otp_settings_userId_idx" ON public.user_otp_settings USING btree ("userId");


--
-- Name: user_otp_settings_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "user_otp_settings_userId_key" ON public.user_otp_settings USING btree ("userId");


--
-- Name: user_profiles_userId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "user_profiles_userId_key" ON public.user_profiles USING btree ("userId");


--
-- Name: user_sessions_sessionToken_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_sessions_sessionToken_idx" ON public.user_sessions USING btree ("sessionToken");


--
-- Name: user_sessions_sessionToken_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "user_sessions_sessionToken_key" ON public.user_sessions USING btree ("sessionToken");


--
-- Name: user_sessions_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "user_sessions_userId_idx" ON public.user_sessions USING btree ("userId");


--
-- Name: users_email_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX users_email_idx ON public.users USING btree (email);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: users_github_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_github_id_key ON public.users USING btree (github_id);


--
-- Name: users_google_id_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_google_id_key ON public.users USING btree (google_id);


--
-- Name: users_isActive_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "users_isActive_idx" ON public.users USING btree ("isActive");


--
-- Name: users_orgId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "users_orgId_idx" ON public.users USING btree ("orgId");


--
-- Name: users_roleId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "users_roleId_idx" ON public.users USING btree ("roleId");


--
-- Name: _PermissionToRole _PermissionToRole_A_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_PermissionToRole"
    ADD CONSTRAINT "_PermissionToRole_A_fkey" FOREIGN KEY ("A") REFERENCES public."Permission"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _PermissionToRole _PermissionToRole_B_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."_PermissionToRole"
    ADD CONSTRAINT "_PermissionToRole_B_fkey" FOREIGN KEY ("B") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: announcements announcements_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT "announcements_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: assignment_submissions assignment_submissions_assignmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_submissions
    ADD CONSTRAINT "assignment_submissions_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES public.assignments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: assignment_submissions assignment_submissions_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_submissions
    ADD CONSTRAINT "assignment_submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: assignments assignments_courseid_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_courseid_fkey FOREIGN KEY ("courseId") REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: audit_logs audit_logs_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: categories categories_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: certificates certificates_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT "certificates_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: certificates certificates_enrollmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT "certificates_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES public.enrollments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: certificates certificates_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certificates
    ADD CONSTRAINT "certificates_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: certification_exam_attempts certification_exam_attempts_examConfigId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certification_exam_attempts
    ADD CONSTRAINT "certification_exam_attempts_examConfigId_fkey" FOREIGN KEY ("examConfigId") REFERENCES public.certification_exam_configs(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: certification_exam_attempts certification_exam_attempts_lmsFinalExamAttemptId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certification_exam_attempts
    ADD CONSTRAINT "certification_exam_attempts_lmsFinalExamAttemptId_fkey" FOREIGN KEY ("lmsFinalExamAttemptId") REFERENCES public.final_exam_attempts(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: certification_exam_attempts certification_exam_attempts_reportGradedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certification_exam_attempts
    ADD CONSTRAINT "certification_exam_attempts_reportGradedById_fkey" FOREIGN KEY ("reportGradedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: certification_exam_attempts certification_exam_attempts_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certification_exam_attempts
    ADD CONSTRAINT "certification_exam_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: certification_exam_configs certification_exam_configs_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certification_exam_configs
    ADD CONSTRAINT "certification_exam_configs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: certification_exam_configs certification_exam_configs_lmsFinalExamId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.certification_exam_configs
    ADD CONSTRAINT "certification_exam_configs_lmsFinalExamId_fkey" FOREIGN KEY ("lmsFinalExamId") REFERENCES public.final_exams(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: chat_members chat_members_chatId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_members
    ADD CONSTRAINT "chat_members_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES public.course_chats(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: chat_members chat_members_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_members
    ADD CONSTRAINT "chat_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_chatId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT "chat_messages_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES public.course_chats(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: chat_messages chat_messages_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT "chat_messages_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public.chat_messages(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: chat_messages chat_messages_senderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT "chat_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: chatbot_conversations chatbot_conversations_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chatbot_conversations
    ADD CONSTRAINT "chatbot_conversations_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: chatbot_conversations chatbot_conversations_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chatbot_conversations
    ADD CONSTRAINT "chatbot_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: chatbot_messages chatbot_messages_conversationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chatbot_messages
    ADD CONSTRAINT "chatbot_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES public.chatbot_conversations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: chatbot_messages chatbot_messages_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chatbot_messages
    ADD CONSTRAINT "chatbot_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: course_analytics course_analytics_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_analytics
    ADD CONSTRAINT "course_analytics_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: course_chats course_chats_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_chats
    ADD CONSTRAINT "course_chats_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: course_prerequisites course_prerequisites_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_prerequisites
    ADD CONSTRAINT "course_prerequisites_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: course_prerequisites course_prerequisites_prerequisiteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_prerequisites
    ADD CONSTRAINT "course_prerequisites_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: course_reviews course_reviews_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_reviews
    ADD CONSTRAINT "course_reviews_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: course_reviews course_reviews_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_reviews
    ADD CONSTRAINT "course_reviews_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: courses courses_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT "courses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.categories(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: courses courses_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT "courses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: courses courses_instructorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT "courses_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: courses courses_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT "courses_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ctf_active_sessions ctf_active_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctf_active_sessions
    ADD CONSTRAINT ctf_active_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: ctf_challenges ctf_challenges_ctfModuleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctf_challenges
    ADD CONSTRAINT "ctf_challenges_ctfModuleId_fkey" FOREIGN KEY ("ctfModuleId") REFERENCES public.ctf_modules(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ctf_courses ctf_courses_lmsCourseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctf_courses
    ADD CONSTRAINT "ctf_courses_lmsCourseId_fkey" FOREIGN KEY ("lmsCourseId") REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ctf_docker_instances ctf_docker_instances_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctf_docker_instances
    ADD CONSTRAINT "ctf_docker_instances_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ctf_enrollment_codes ctf_enrollment_codes_ctfCourseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctf_enrollment_codes
    ADD CONSTRAINT "ctf_enrollment_codes_ctfCourseId_fkey" FOREIGN KEY ("ctfCourseId") REFERENCES public.ctf_courses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ctf_enrollments ctf_enrollments_ctfCourseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctf_enrollments
    ADD CONSTRAINT "ctf_enrollments_ctfCourseId_fkey" FOREIGN KEY ("ctfCourseId") REFERENCES public.ctf_courses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ctf_enrollments ctf_enrollments_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctf_enrollments
    ADD CONSTRAINT "ctf_enrollments_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ctf_modules ctf_modules_ctfCourseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctf_modules
    ADD CONSTRAINT "ctf_modules_ctfCourseId_fkey" FOREIGN KEY ("ctfCourseId") REFERENCES public.ctf_courses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ctf_notifications ctf_notifications_senderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctf_notifications
    ADD CONSTRAINT "ctf_notifications_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: ctf_otp_codes ctf_otp_codes_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctf_otp_codes
    ADD CONSTRAINT ctf_otp_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: ctf_progress ctf_progress_challengeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctf_progress
    ADD CONSTRAINT "ctf_progress_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES public.ctf_challenges(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ctf_progress ctf_progress_enrollmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctf_progress
    ADD CONSTRAINT "ctf_progress_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES public.ctf_enrollments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ctf_progress ctf_progress_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctf_progress
    ADD CONSTRAINT "ctf_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ctf_public_challenges ctf_public_challenges_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctf_public_challenges
    ADD CONSTRAINT "ctf_public_challenges_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public.ctf_categories(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ctf_public_progress ctf_public_progress_challengeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctf_public_progress
    ADD CONSTRAINT "ctf_public_progress_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES public.ctf_public_challenges(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ctf_public_progress ctf_public_progress_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctf_public_progress
    ADD CONSTRAINT "ctf_public_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ctf_user_notifications ctf_user_notifications_notificationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctf_user_notifications
    ADD CONSTRAINT "ctf_user_notifications_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES public.ctf_notifications(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ctf_user_notifications ctf_user_notifications_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ctf_user_notifications
    ADD CONSTRAINT "ctf_user_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: departments departments_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT "departments_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: departments departments_parentDeptId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT "departments_parentDeptId_fkey" FOREIGN KEY ("parentDeptId") REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: enrollment_codes enrollment_codes_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollment_codes
    ADD CONSTRAINT "enrollment_codes_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: enrollment_codes enrollment_codes_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollment_codes
    ADD CONSTRAINT "enrollment_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: enrollments enrollments_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT "enrollments_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: enrollments enrollments_enrollmentCodeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT "enrollments_enrollmentCodeId_fkey" FOREIGN KEY ("enrollmentCodeId") REFERENCES public.enrollment_codes(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: enrollments enrollments_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.enrollments
    ADD CONSTRAINT "enrollments_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: final_exam_access_codes final_exam_access_codes_examId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.final_exam_access_codes
    ADD CONSTRAINT "final_exam_access_codes_examId_fkey" FOREIGN KEY ("examId") REFERENCES public.final_exams(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: final_exam_access_codes final_exam_access_codes_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.final_exam_access_codes
    ADD CONSTRAINT "final_exam_access_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: final_exam_access_requests final_exam_access_requests_examId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.final_exam_access_requests
    ADD CONSTRAINT "final_exam_access_requests_examId_fkey" FOREIGN KEY ("examId") REFERENCES public.final_exams(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: final_exam_access_requests final_exam_access_requests_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.final_exam_access_requests
    ADD CONSTRAINT "final_exam_access_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: final_exam_answers final_exam_answers_attemptId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.final_exam_answers
    ADD CONSTRAINT "final_exam_answers_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES public.final_exam_attempts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: final_exam_answers final_exam_answers_questionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.final_exam_answers
    ADD CONSTRAINT "final_exam_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES public.final_exam_questions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: final_exam_attempts final_exam_attempts_accessCodeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.final_exam_attempts
    ADD CONSTRAINT "final_exam_attempts_accessCodeId_fkey" FOREIGN KEY ("accessCodeId") REFERENCES public.final_exam_access_codes(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: final_exam_attempts final_exam_attempts_examId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.final_exam_attempts
    ADD CONSTRAINT "final_exam_attempts_examId_fkey" FOREIGN KEY ("examId") REFERENCES public.final_exams(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: final_exam_attempts final_exam_attempts_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.final_exam_attempts
    ADD CONSTRAINT "final_exam_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: final_exam_proctoring_logs final_exam_proctoring_logs_attemptId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.final_exam_proctoring_logs
    ADD CONSTRAINT "final_exam_proctoring_logs_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES public.final_exam_attempts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: final_exam_questions final_exam_questions_examId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.final_exam_questions
    ADD CONSTRAINT "final_exam_questions_examId_fkey" FOREIGN KEY ("examId") REFERENCES public.final_exams(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: final_exams final_exams_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.final_exams
    ADD CONSTRAINT "final_exams_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: forum_comments forum_comments_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_comments
    ADD CONSTRAINT "forum_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: forum_comments forum_comments_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_comments
    ADD CONSTRAINT "forum_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public.forum_comments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: forum_comments forum_comments_postId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_comments
    ADD CONSTRAINT "forum_comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES public.forum_posts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: forum_posts forum_posts_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_posts
    ADD CONSTRAINT "forum_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: forum_posts forum_posts_forumId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.forum_posts
    ADD CONSTRAINT "forum_posts_forumId_fkey" FOREIGN KEY ("forumId") REFERENCES public.forums(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: internships internships_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internships
    ADD CONSTRAINT "internships_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: lesson_progress lesson_progress_enrollmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT "lesson_progress_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES public.enrollments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: lesson_progress lesson_progress_lessonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lesson_progress
    ADD CONSTRAINT "lesson_progress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES public.lessons(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: lessons lessons_moduleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lessons
    ADD CONSTRAINT "lessons_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES public.modules(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: magic_login_tokens magic_login_tokens_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.magic_login_tokens
    ADD CONSTRAINT "magic_login_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: messages messages_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT "messages_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public.messages(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: messages messages_receiverId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT "messages_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: messages messages_senderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT "messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: module_quiz_attempts module_quiz_attempts_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_quiz_attempts
    ADD CONSTRAINT module_quiz_attempts_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.module_quizzes(id) ON DELETE CASCADE;


--
-- Name: module_quiz_questions module_quiz_questions_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_quiz_questions
    ADD CONSTRAINT module_quiz_questions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.module_quizzes(id) ON DELETE CASCADE;


--
-- Name: modules modules_courseId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.modules
    ADD CONSTRAINT "modules_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES public.courses(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: notifications notifications_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: offer_letter_requests offer_letter_requests_internshipId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offer_letter_requests
    ADD CONSTRAINT "offer_letter_requests_internshipId_fkey" FOREIGN KEY ("internshipId") REFERENCES public.internships(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: offer_letter_requests offer_letter_requests_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offer_letter_requests
    ADD CONSTRAINT "offer_letter_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: otps otps_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.otps
    ADD CONSTRAINT "otps_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: partner_payouts partner_payouts_partner_referral_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_payouts
    ADD CONSTRAINT partner_payouts_partner_referral_id_fkey FOREIGN KEY (partner_referral_id) REFERENCES public.partner_referrals(id) ON DELETE CASCADE;


--
-- Name: partner_referral_usages partner_referral_usages_partner_referral_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.partner_referral_usages
    ADD CONSTRAINT partner_referral_usages_partner_referral_id_fkey FOREIGN KEY (partner_referral_id) REFERENCES public.partner_referrals(id) ON DELETE CASCADE;


--
-- Name: password_reset_tokens password_reset_tokens_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: payments payments_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pinned_messages pinned_messages_chatId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pinned_messages
    ADD CONSTRAINT "pinned_messages_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES public.course_chats(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pinned_messages pinned_messages_messageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pinned_messages
    ADD CONSTRAINT "pinned_messages_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES public.chat_messages(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: pinned_messages pinned_messages_pinnedBy_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pinned_messages
    ADD CONSTRAINT "pinned_messages_pinnedBy_fkey" FOREIGN KEY ("pinnedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: quiz_answers quiz_answers_attemptId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_answers
    ADD CONSTRAINT "quiz_answers_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES public.quiz_attempts(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: quiz_answers quiz_answers_questionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_answers
    ADD CONSTRAINT "quiz_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES public.quiz_questions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: quiz_attempts quiz_attempts_quizId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT "quiz_attempts_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES public.quizzes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: quiz_attempts quiz_attempts_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_attempts
    ADD CONSTRAINT "quiz_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: quiz_questions quiz_questions_quizId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quiz_questions
    ADD CONSTRAINT "quiz_questions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES public.quizzes(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: referral_code_usages referral_code_usages_referral_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_code_usages
    ADD CONSTRAINT referral_code_usages_referral_code_id_fkey FOREIGN KEY (referral_code_id) REFERENCES public.referral_codes(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: security_events security_events_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.security_events
    ADD CONSTRAINT "security_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: subscriptions subscriptions_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: topic_highlights topic_highlights_topicId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topic_highlights
    ADD CONSTRAINT "topic_highlights_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES public.topics(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: topic_highlights topic_highlights_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topic_highlights
    ADD CONSTRAINT "topic_highlights_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: topic_notes topic_notes_topicId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topic_notes
    ADD CONSTRAINT "topic_notes_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES public.topics(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: topic_notes topic_notes_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topic_notes
    ADD CONSTRAINT "topic_notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: topic_progress topic_progress_enrollmentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topic_progress
    ADD CONSTRAINT "topic_progress_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES public.enrollments(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: topic_progress topic_progress_topicId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topic_progress
    ADD CONSTRAINT "topic_progress_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES public.topics(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: topic_progress topic_progress_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topic_progress
    ADD CONSTRAINT "topic_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: topic_related_media topic_related_media_topicId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topic_related_media
    ADD CONSTRAINT "topic_related_media_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES public.topics(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: topics topics_lessonId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.topics
    ADD CONSTRAINT "topics_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES public.lessons(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_achievements user_achievements_achievementId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT "user_achievements_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES public.achievements(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_achievements user_achievements_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT "user_achievements_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_analytics user_analytics_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_analytics
    ADD CONSTRAINT "user_analytics_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_badges user_badges_badgeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT "user_badges_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES public.badges(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_badges user_badges_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_badges
    ADD CONSTRAINT "user_badges_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_otp_settings user_otp_settings_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_otp_settings
    ADD CONSTRAINT "user_otp_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_profiles user_profiles_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT "user_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_sessions user_sessions_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_sessions
    ADD CONSTRAINT "user_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: users users_deptId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "users_deptId_fkey" FOREIGN KEY ("deptId") REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: users users_orgId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "users_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES public.organizations(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: users users_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict jcWDzZatW8uKUhsiVezlOy80UfkKrL35inTqDGJzcB4U3FAjXyOMgsJRQufDorm

