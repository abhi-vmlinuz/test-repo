# Nexus Coding Arena
## Product, Architecture & Technical Specification

### 1. Product Overview

Nexus Coding Arena is a browser-based competitive programming and coding-assessment platform built on top of the existing Nexus ephemeral-environment orchestration system.

The platform combines three capabilities:

1. **Ephemeral development environments** provisioned by Nexus/Kubernetes.
2. **A native-feeling browser coding environment** consisting of a Monaco-based code editor and an xterm.js terminal connected to the student's actual ephemeral environment.
3. **A trusted online judge** based on self-hosted Judge0 for compiling and executing untrusted student submissions under strict resource and isolation constraints.

The system should support both:

- Traditional browser-based coding competitions similar to LeetCode/Codeforces/onlineGDB.
- Nexus-style ephemeral environments where participants receive an isolated Linux environment accessible through SSH and/or the browser.

The system must be designed as a reusable platform rather than a one-off competition implementation.

---

# 2. Core Design Philosophy

The most important architectural principle is:

> The student's development environment is NOT the trusted grading environment.

Students are allowed to completely control their own ephemeral workspace. They may modify files, binaries, shell configuration, locally installed tools, and anything else permitted inside their container.

None of those modifications may affect authoritative grading.

The authoritative submission must be independently evaluated by the Judge0 execution infrastructure.

Therefore:

```text
Student Environment
        |
        | source submission
        v
     Nexus API
        |
        v
     Judge0
        |
        v
 Independent Execution
        |
        v
 Nexus Scoring Engine
        |
        v
 Score / Solve / Flag
```

The student environment is a development workspace.

Judge0 is the execution authority.

Nexus is the orchestration, competition, identity, scoring and presentation layer.

---

# 3. High-Level Architecture

```text
                         ┌──────────────────────────────┐
                         │          WEB CLIENT          │
                         │                              │
                         │  Next.js + TypeScript        │
                         │                              │
                         │  ┌────────────────────────┐  │
                         │  │ Problem Statement      │  │
                         │  ├────────────────────────┤  │
                         │  │ Monaco Editor          │  │
                         │  ├────────────────────────┤  │
                         │  │ xterm.js Terminal      │  │
                         │  ├────────────────────────┤  │
                         │  │ Test Results            │  │
                         │  └────────────────────────┘  │
                         └──────────────┬───────────────┘
                                        │
                              HTTPS / WebSocket
                                        │
                                        ▼
                         ┌──────────────────────────────┐
                         │          NEXUS API           │
                         │                              │
                         │ Authentication               │
                         │ Sessions                     │
                         │ Challenges                   │
                         │ Workspace management         │
                         │ Terminal gateway             │
                         │ Submission API               │
                         │ Scoring                      │
                         │ Competition management       │
                         └───────┬──────────────┬───────┘
                                 │              │
                         workspace           submission
                                 │              │
                                 ▼              ▼
                    ┌──────────────────┐   ┌──────────────┐
                    │ Student Pod      │   │   Judge0     │
                    │                  │   │              │
                    │ bash             │   │ Compilation  │
                    │ gcc              │   │ Execution    │
                    │ runtimes         │   │ Sandboxing   │
                    │ /workspace       │   │ Limits       │
                    └──────────────────┘   └──────┬───────┘
                                                   │
                                                   ▼
                                            Judge Result
                                                   │
                                                   ▼
                                      ┌─────────────────────┐
                                      │ Nexus Scoring       │
                                      │                     │
                                      │ Test evaluation     │
                                      │ Points               │
                                      │ Challenge state     │
                                      │ Flag release        │
                                      └─────────────────────┘
```

---

# 4. Technology Stack

## Frontend

Use:

- Next.js
- TypeScript
- React
- Tailwind CSS
- shadcn/ui
- Monaco Editor
- xterm.js
- xterm.js addons where useful

The frontend should be responsive but primarily optimized for desktop/laptop usage because competitive programming requires substantial screen real estate.

---

## Backend / Nexus

Use the existing Nexus backend architecture.

Preferred implementation language:

- Go

Responsibilities:

- REST API
- WebSocket gateway
- authentication
- authorization
- challenge management
- competition management
- ephemeral environment lifecycle
- terminal/PTY proxying
- submission management
- Judge0 integration
- scoring
- result persistence
- flag issuance
- leaderboard

The backend must NOT execute arbitrary student code itself.

---

## Infrastructure

Use:

- Kubernetes
- K3s for the initial deployment
- Kubernetes NetworkPolicies
- container resource limits
- namespaces where appropriate
- ephemeral Pods
- existing Nexus Kubernetes adapter/orchestrator

The architecture must remain compatible with standard Kubernetes so that migration from K3s to GKE/EKS/etc. does not require rewriting the application.

---

## Code Execution

Use:

### Judge0

Judge0 is the trusted code-execution backend.

Nexus should communicate with Judge0 through its API.

Do not implement a custom arbitrary-code execution sandbox unless absolutely necessary.

Judge0 handles:

- compilation
- execution
- language/runtime selection
- execution time
- memory usage
- stdout
- stderr
- exit codes
- execution status
- sandboxed execution

Nexus handles the competition-specific semantics around those results.

---

# 5. Student Experience

The primary UX should feel like a lightweight cloud development environment rather than a conventional form-based coding website.

The student should be able to:

1. Open a challenge.
2. Read the problem.
3. Open the browser editor.
4. Write code.
5. Run code inside their actual Nexus environment.
6. Interact with a real Linux terminal.
7. Compile locally inside their assigned environment.
8. Inspect files.
9. Run arbitrary development commands permitted by the environment.
10. Submit their solution.
11. Receive test results and score.
12. Continue editing and resubmit.

---

# 6. Browser IDE

The browser coding interface should be implemented using Monaco Editor.

It should resemble a simplified VS Code experience.

Required features:

- syntax highlighting
- autocomplete where available
- line numbers
- bracket matching
- indentation
- code folding
- search
- replace
- keyboard shortcuts
- multiple files
- tabs
- save
- unsaved-change indicator
- language selection
- starter code
- submission

The editor should NOT attempt to emulate a complete IDE.

Keep it focused on competition coding.

---

# 7. Browser Terminal

Use xterm.js.

The terminal must connect to the student's actual ephemeral Nexus environment.

Architecture:

```text
Browser
   |
   | WebSocket
   v
Nexus WebSocket Gateway
   |
   | PTY stream
   v
Student Pod
   |
   v
Shell / PTY
```

The terminal must support:

- interactive shell
- command input
- ANSI colors
- cursor movement
- resizing
- Ctrl+C
- Ctrl+D
- Ctrl+L
- interactive programs where practical
- compiler output
- program stdin/stdout
- terminal resize events

The terminal should feel as close to a native SSH terminal as reasonably possible.

---

# 8. Native-Latency Requirement

This is a critical requirement.

The browser IDE should NOT send every keystroke to the backend.

Typing in Monaco must be entirely local in the browser.

The terminal must use a persistent WebSocket connection rather than individual HTTP requests.

Desired architecture:

```text
Typing:

Keyboard
   ↓
Monaco
   ↓
Browser only
```

Terminal:

```text
Keyboard
   ↓
xterm.js
   ↓
persistent WebSocket
   ↓
Nexus
   ↓
PTY
```

Do not implement terminal commands using request/response HTTP calls.

The target experience is:

> The terminal should feel like an SSH session, not like a remote web form.

Network latency is acceptable for actual terminal communication, but unnecessary round trips must be avoided.

---

# 9. Workspace Model

Every competition participant receives an ephemeral workspace.

Example:

```text
/student-session/
    workspace/
        main.c
        README.md
        ...
```

The student can freely modify their workspace.

The workspace may contain:

- source code
- starter files
- test files supplied by the challenge
- configuration files
- compiler-generated artifacts

The workspace must NOT contain:

- hidden tests
- authoritative expected outputs
- flags
- Judge0 credentials
- Nexus administrative credentials
- other participant data
- authoritative grading logic

---

# 10. Run vs Submit

This distinction is fundamental.

## RUN

The `Run` operation executes the student's current code inside their own ephemeral environment.

Example:

```text
Monaco
   |
   | Run
   v
Student Pod
   |
   ├── gcc
   ├── execute
   └── stdout/stderr
```

This is for development.

It is NOT authoritative.

The student may modify their environment.

That is acceptable.

---

## SUBMIT

The `Submit` operation creates an authoritative submission.

Example:

```text
Student Workspace
       |
       | source files
       v
Nexus API
       |
       | immutable submission
       v
Judge0
       |
       v
Independent execution
       |
       v
Nexus Scoring Engine
```

The authoritative submission must NOT depend on the student's locally compiled binary.

The judge must compile the source independently.

---

# 11. Submission Model

Every submission should have a unique immutable ID.

Example:

```json
{
  "submission_id": "sub_01H...",
  "user_id": "...",
  "challenge_id": "binary-search-01",
  "session_id": "...",
  "language": "c",
  "source_hash": "...",
  "submitted_at": "...",
  "status": "queued"
}
```

The submission should be immutable once submitted.

A new submission creates a new submission ID.

---

# 12. Challenge Definition

Challenges should be declarative.

Do not hardcode challenge-specific logic into the judge service.

Example:

```yaml
version: 1

id: binary-search-001

title: Binary Search

language: c

description: |
  Implement binary search on a sorted array.

starter:
  files:
    - main.c

build:
  compiler: gcc
  flags:
    - -O2
    - -Wall

execution:
  timeout_ms: 2000
  memory_mb: 128

grading:
  type: io

tests:
  - id: basic
    points: 10
    input: |
      5
      1 2 3 4 5
      3
    expected_output: |
      2

  - id: first
    points: 10
    hidden: true
    input: |
      5
      1 2 3 4 5
      1
    expected_output: |
      0
```

The exact schema can evolve.

---

# 13. Test Cases

Tests must support:

- visible tests
- hidden tests
- edge cases
- large inputs
- randomized/generated tests where practical
- individual point values

Example:

```text
Test 1 → 10 points
Test 2 → 10 points
Test 3 → 15 points
Test 4 → 20 points
Test 5 → 45 points
```

The total score is derived from the sum of passed test points.

Hidden test input and expected output must never be sent to the student environment.

---

# 14. Scoring

A challenge may be partially solved.

Example:

```text
10 tests × 10 points

Passed: 7
Score: 70/100
```

The frontend should display appropriate feedback.

Example:

```text
Test 1       ✓
Test 2       ✓
Test 3       ✗
Test 4       ✓
...
Score: 70/100
```

For hidden tests, do not reveal:

- hidden input
- expected output
- private test implementation

Optionally expose:

- passed/failed
- execution time
- memory
- error type

---

# 15. Anti-Hardcoding Strategy

Behavioral testing alone is insufficient for challenges that explicitly require a particular algorithm or data structure.

For example:

```text
"Implement binary search"
```

A linear search implementation could produce correct outputs while violating the intended requirement.

Therefore the grading architecture must support optional additional checks.

Possible future check types:

```text
compile
io
source
ast
complexity
resource
```

Example:

```yaml
checks:

  - type: compile

  - type: io

  - type: ast
    rule: required_function
    value: binary_search

  - type: complexity
    expected: logarithmic
```

These checks should be implemented as deterministic rules wherever possible.

Do NOT use an LLM as the authoritative pass/fail mechanism.

---

# 16. Code Quality

"Code quality" must not mean subjective LLM evaluation.

Instead, challenge authors should define concrete enforceable requirements.

Examples:

- required function exists
- required function signature
- prohibited library/function
- required data structure
- maximum complexity
- forbidden hardcoded output
- required source structure
- compiler warnings
- maximum runtime
- maximum memory
- test coverage requirements where applicable

Subjective criteria such as "clean code" should not determine competition scores.

---

# 17. Judge Architecture

Judge0 should be deployed separately from student environments.

Do NOT install Judge0 inside every student pod.

Recommended:

```text
K3s Cluster

┌─────────────────────────────────────────────┐
│                                             │
│  Student Namespace                          │
│                                             │
│  ┌──────┐ ┌──────┐ ┌──────┐                │
│  │ Pod A│ │ Pod B│ │ Pod C│ ...            │
│  └──────┘ └──────┘ └──────┘                │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  Judge Namespace                            │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │ Judge0                              │    │
│  │                                     │    │
│  │ API                                 │    │
│  │ Workers                             │    │
│  │ Sandbox                             │    │
│  └─────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

Student pods must never be able to directly access other student pods.

---

# 18. Network Isolation

Student environments should have extremely restricted network access.

Desired policy:

```text
Student Pod

ALLOW:
    Nexus API
    required platform services

DENY:
    other student pods
    Kubernetes API
    database
    Judge0 internals
    arbitrary internet
```

The Judge0 service should not expose unnecessary internal interfaces to students.

NetworkPolicies should enforce these boundaries.

---

# 19. Resource Limits

Student execution must be constrained.

At minimum:

- CPU limit
- memory limit
- execution timeout
- process limit
- output-size limit
- file-size limit
- request rate limit

The platform must handle malicious submissions such as:

```c
while (1) {}
```

or:

```c
while (1) {
    printf("A");
}
```

or excessive memory allocation.

The platform must terminate these submissions cleanly.

---

# 20. Judge Result

Judge0 execution results should be normalized by Nexus.

Example internal representation:

```json
{
  "submission_id": "sub_123",
  "status": "completed",
  "score": 70,
  "max_score": 100,
  "tests_passed": 7,
  "tests_total": 10,
  "runtime_ms": 83,
  "memory_kb": 12400,
  "compile_error": null
}
```

The frontend should not depend directly on Judge0's raw API format.

Nexus must act as the abstraction layer.

This allows Judge0 to be replaced later without rewriting the frontend.

---

# 21. Flag / Completion System

For CTF-style challenges, the flag must NOT exist inside the student's environment.

The flag belongs to Nexus's trusted backend.

Example:

```text
Judge
  |
  | score = 100
  v
Nexus
  |
  | challenge solved
  v
Flag service
  |
  v
FLAG
```

A flag should only be released when the challenge's configured completion condition is satisfied.

For normal coding competitions, replace the flag with:

- score
- solved state
- leaderboard points

The same grading engine should support both modes.

---

# 22. CTF Mode

The platform should support:

```text
CTF challenge

Student
   ↓
Ephemeral pod
   ↓
SSH/browser terminal
   ↓
Solve challenge
   ↓
Submit
   ↓
Judge
   ↓
PASS
   ↓
Flag released
```

This allows Nexus to continue supporting its original ephemeral CTF use case.

---

# 23. Coding Competition Mode

The same infrastructure should support:

```text
Coding challenge

Student
   ↓
Browser
   ├── Problem
   ├── Monaco
   └── xterm.js
          ↓
       Nexus Pod
          ↓
       Run locally
          ↓
       Submit
          ↓
       Judge0
          ↓
       Score
```

No SSH is required.

---

# 24. Browser UX Requirements

The application should feel like a real development environment rather than a web form.

Priorities:

1. Extremely responsive editor.
2. Persistent terminal connection.
3. Minimal loading states.
4. No unnecessary page reloads.
5. Keyboard-first interaction.
6. Fast Run operation.
7. Fast file switching.
8. Persistent workspace.
9. Clear compilation/runtime errors.
10. Fast submission feedback.

Avoid unnecessary animations.

The platform should prioritize responsiveness and technical credibility over visual effects.

---

# 25. Suggested UI Layout

Desktop-first:

```text
┌───────────────────────────────────────────────────────────────┐
│ Nexus Coding Arena                       User   Time   Score │
├──────────────────────┬────────────────────────────────────────┤
│                      │                                        │
│ Problem              │ main.c                                 │
│                      │                                        │
│ Description          │ #include <stdio.h>                    │
│                      │                                        │
│ Constraints           │ int main() {                          │
│                      │     ...                                │
│ Examples             │ }                                      │
│                      │                                        │
│ Test Cases           │                                        │
│                      │                                        │
├──────────────────────┴────────────────────────────────────────┤
│ TERMINAL                                                     │
│ $ gcc main.c -o main                                         │
│ $ ./main                                                     │
│                                                               │
├───────────────────────────────────────────────────────────────┤
│ ✓ Run successful                 [ RUN ]       [ SUBMIT ]     │
└───────────────────────────────────────────────────────────────┘
```

The exact UI can evolve.

---

# 26. Terminal Implementation

The terminal should use:

- xterm.js
- WebSocket
- PTY

The server-side gateway should bridge:

```text
WebSocket ↔ PTY
```

The PTY must exist inside the student's actual environment.

Do not fake terminal output.

The student should be interacting with the real shell.

---

# 27. Editor / Workspace Synchronization

The system must define a clear workspace synchronization mechanism.

Preferred behavior:

```text
Browser editor
      |
      | save
      v
Nexus workspace service
      |
      v
Student pod /workspace
```

The system must prevent race conditions between:

- browser edits
- SSH edits
- terminal commands
- submission

If the student edits `main.c` using SSH and then opens it in Monaco, the editor should eventually reflect the current file state.

---

# 28. SSH Support

SSH should remain supported.

A participant may choose:

```bash
ssh student@<session-host>
```

and use:

```text
vim
nvim
nano
gcc
gdb
python
bash
```

Their changes must operate on the same workspace used by the browser IDE.

Thus:

```text
SSH
 │
 ▼
Student Pod
 ▲
 │
Web IDE
```

Both interfaces access the same filesystem.

---

# 29. Persistence

The student's environment should be considered ephemeral.

A session may be:

```text
CREATING
READY
ACTIVE
SUBMITTED
EXPIRED
DESTROYED
```

Workspace persistence may optionally exist independently of the pod.

This allows the platform to recreate an environment without losing source code if required.

---

# 30. Competition Architecture

The platform should eventually support:

```text
Competition
 ├── challenges
 ├── participants
 ├── start time
 ├── end time
 ├── scoring rules
 ├── leaderboard
 └── submissions
```

Challenge:

```text
Challenge
 ├── problem statement
 ├── starter files
 ├── language
 ├── visible tests
 ├── hidden tests
 ├── scoring
 └── grading rules
```

Participant:

```text
Participant
 ├── competition
 ├── session
 ├── submissions
 ├── solved challenges
 └── score
```

---

# 31. Security Principles

The following must be treated as hard requirements:

### Never trust student containers.

Anything inside a student environment is considered attacker-controlled.

### Never store authoritative secrets in student environments.

This includes:

- flags
- hidden tests
- expected outputs
- judge credentials
- database credentials
- Kubernetes credentials

### Never grade using the student's locally compiled executable.

Always rebuild from the submitted source.

### Never allow student pods to access the Kubernetes API.

### Never allow student pods to access other student pods.

### Never let the frontend directly control Judge0.

All judge interaction goes through Nexus.

### Never expose hidden tests.

### Never use an LLM as the final grading authority.

---

# 32. Observability

The platform should log:

- environment creation
- environment destruction
- terminal connection
- submission creation
- Judge0 request
- Judge0 result
- scoring result
- challenge completion
- flag issuance

Each operation should have correlation IDs.

Example:

```text
competition_id
participant_id
session_id
submission_id
challenge_id
```

This allows debugging during competitions.

---

# 33. MVP Scope

The first implementation should NOT attempt to build the entire platform.

MVP:

```text
1. Nexus creates student Pod
2. Student opens browser
3. xterm.js connects to Pod PTY
4. Student can use bash
5. Monaco edits main.c
6. File is synchronized into Pod
7. Student can Run locally
8. Student clicks Submit
9. Nexus sends submission to Judge0
10. Judge0 compiles and runs hidden tests
11. Nexus calculates score
12. Frontend displays result
```

Once this works reliably, add:

```text
13. Multiple files
14. Challenge YAML
15. Hidden tests
16. Partial scoring
17. SSH
18. Leaderboard
19. CTF flag release
20. AST/static checks
```

---

# 34. Non-Goals

Do NOT initially build:

- custom compiler infrastructure
- custom sandbox runtime
- custom terminal emulator
- AI-based grading
- full VS Code clone
- collaborative editing
- Kubernetes cluster management UI
- arbitrary package installation
- production-scale multi-region infrastructure

Use existing technologies wherever possible.

---

# 35. Demonstration Goal

The final demonstration should show the following flow:

```text
1. User opens Nexus Coding Arena.

2. User starts a challenge.

3. Nexus creates an ephemeral Kubernetes environment.

4. Browser immediately displays:
       - problem
       - Monaco editor
       - xterm.js terminal

5. User opens terminal and runs:
       gcc
       ./program
       ls
       etc.

6. Terminal interaction feels like a native SSH session.

7. User writes the solution in Monaco.

8. User runs it locally inside the Nexus environment.

9. User submits.

10. Nexus creates an immutable submission.

11. Judge0 independently compiles and executes it.

12. Hidden tests are executed.

13. Nexus calculates the score.

14. Browser displays:
       Tests passed
       Score
       Runtime
       Memory

15. If the configured completion condition is satisfied:
       Challenge Solved
       Flag issued
```

The key demonstration should make it obvious that the browser is not simply a mock IDE.

The terminal is connected to a real ephemeral Linux environment orchestrated by Nexus.

The submitted code is then independently evaluated by Judge0.

---

# 36. Final Architectural Principle

The system should be understood as four independent layers:

```text
┌─────────────────────────────────────┐
│              UX LAYER               │
│ Next.js + Monaco + xterm.js         │
└──────────────────┬──────────────────┘
                   │
┌──────────────────▼──────────────────┐
│          NEXUS PLATFORM             │
│ Sessions / Pods / Auth / API / WS   │
└──────────────────┬──────────────────┘
                   │
┌──────────────────▼──────────────────┐
│          JUDGE / EXECUTION          │
│ Judge0 + sandboxed execution        │
└──────────────────┬──────────────────┘
                   │
┌──────────────────▼──────────────────┐
│         COMPETITION LOGIC           │
│ Tests / scoring / challenges / flag │
└─────────────────────────────────────┘
```

The fundamental rule is:

> **Nexus provides the environment. Judge0 provides trusted execution. The challenge specification provides the grading rules. The frontend provides the native-feeling development experience.**

Do not tightly couple these components.

This separation is what allows the same infrastructure to power CTFs, coding competitions, college practical examinations, programming assignments, workshops, and future assessment platforms.
