---
name: Nexus Coding Arena Design Specification
version: 1.0.0
description: Design tokens and visual specifications for Nexus Coding Arena and RLabZ CTF platform.
colors:
  background: "#ffffff"
  foreground: "#09090b"
  card: "#ffffff"
  cardForeground: "#09090b"
  primary: "#16a34a"
  primaryForeground: "#ffffff"
  secondary: "#f4f4f5"
  secondaryForeground: "#18181b"
  muted: "#f4f4f5"
  mutedForeground: "#71717a"
  accent: "#2563eb"
  accentForeground: "#ffffff"
  destructive: "#ef4444"
  destructiveForeground: "#ffffff"
  border: "#e4e4e7"
  input: "#e4e4e7"
  ring: "#2563eb"
typography:
  headline:
    fontFamily: Inter, sans-serif
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: Inter, sans-serif
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  code:
    fontFamily: JetBrains Mono, Menlo, monospace
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.4
rounded:
  sm: 4px
  md: 6px
  lg: 8px
  xl: 12px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
---

# Nexus Coding Arena & RLabZ CTF Design System

## Overview
Nexus Coding Arena is an elite, focused competitive programming and security hacking interface. The visual language emphasizes low cognitive load, ultra-crisp typography, minimal white-theme ergonomics, and instant visual feedback.

## Colors
- **Canvas (`background`):** Pure White (`#ffffff`) for a clean, distraction-free environment.
- **Card / Surface (`card`):** White (`#ffffff`) with subtle zinc border (`#e4e4e7`) and secondary surfaces (`#f4f4f5`).
- **Primary / Success (`primary`):** Hacker Green (`#16a34a`) representing successful compilation, passed test cases, and active status.
- **Accent (`accent`):** Clean Royal Blue (`#2563eb`) for active tabs, secondary highlights, and interactive states.
- **Destructive (`destructive`):** Crisp Crimson Red (`#ef4444`) for failed tests, syntax/compilation errors, and termination actions.

## Typography
- **UI / Headings:** `Inter` for clean, modern readability.
- **Code & Terminal:** `JetBrains Mono` / `Menlo` for unambiguous character distinction (0 vs O, 1 vs l).

## Layout: The 3-Column Arena
- **Column 1 (Left ~28%):** Problem Specification
  - Header: Difficulty badge (`Easy`, `Medium`, `Hard`), point pill (`100 points`), title.
  - Sub-tabs: `Description`, `Examples`, `Constraints`, `Notes`.
  - Content: Rich problem statement, Example cards with 1-click input/output copy, Constraints bullet list with math notations.
- **Column 2 (Center ~44%):** Code Editor & Bottom Console
  - Editor Header: Active file tab (`main.c`), tab add button (`+`), Language badge (`C (GCC 13)`), Settings gear (`⚙`), and Fullscreen toggle (`⛶`).
  - Code Editor: Monaco editor with light theme (`vs`), syntax highlighting, configurable font size and word wrap.
  - Bottom Tabbed Console: Tabs for `Output` and `Terminal ($HOME)`, `Clear` button, collapse toggle (`^`).
    - *Output tab:* Formatted compiler and runner logs (e.g., "Code compiled successfully.", "Test Case 1: Passed (2 ms)").
    - *Terminal tab:* Interactive xterm.js terminal with white theme connected to ephemeral Linux pod running at `$HOME`.
- **Column 3 (Right ~28%):** Test Runner, Custom Input & Submissions
  - Header Tabs: `Test Cases` | `Submissions`.
  - Test Cases Sub-tabs: `Run Code` | `Custom Input`.
  - Test Case Cards: Collapsible cards with status dot (green/red), `Test Case N`, status pill (`Passed`/`Failed`), `Input (stdin)`, `Expected Output`, and `Your Output`.
  - Custom Input: Textarea for user-supplied stdin.
  - Submissions: History list with status, score, timestamp, and load code action.
  - Sticky Footer Bar:
    - Left: `▶ Run Code` (light outlined button).
    - Right: `☁ Submit Solution` (vibrant royal blue rounded button).

## Do's and Don'ts
- **DO** maintain a consistent, clean white theme across the entire arena and terminal.
- **DO** keep editor keystrokes 100% client-side for zero latency.
- **DO** provide separate Output (execution summary) and Terminal (raw bash pod) tabs.
- **DON'T** reveal secret inputs or expected outputs for hidden test cases.
- **DON'T** clutter the editor toolbar with mock or non-functional pagination.
