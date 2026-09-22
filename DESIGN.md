---
name: Nexus Coding Arena Design Specification
version: 1.0.0
description: Design tokens and visual specifications for Nexus Coding Arena and RLabZ CTF platform.
colors:
  background: "#09090b"
  foreground: "#f4f4f5"
  card: "#18181b"
  cardForeground: "#f4f4f5"
  primary: "#22c55e"
  primaryForeground: "#09090b"
  secondary: "#27272a"
  secondaryForeground: "#f4f4f5"
  muted: "#27272a"
  mutedForeground: "#a1a1aa"
  accent: "#3b82f6"
  accentForeground: "#ffffff"
  destructive: "#ef4444"
  destructiveForeground: "#ffffff"
  border: "#27272a"
  input: "#27272a"
  ring: "#22c55e"
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
Nexus Coding Arena is an elite, focused competitive programming and security hacking interface. The visual language emphasizes low cognitive load, ultra-crisp typography, dark mode ergonomics for prolonged coding sessions, and instant visual feedback.

## Colors
- **Canvas (`background`):** Deep Zinc (`#09090b`) to eliminate screen glare.
- **Card / Surface (`card`):** Dark Zinc (`#18181b`) with border (`#27272a`).
- **Primary / Success (`primary`):** Hacker Green (`#22c55e`) representing successful compilation, passed test cases, and active status.
- **Accent (`accent`):** High-clarity Electric Blue (`#3b82f6`) for active tabs, secondary highlights, and interactive states.
- **Destructive (`destructive`):** Vibrant Red (`#ef4444`) for failed tests, syntax/compilation errors, and termination actions.

## Typography
- **UI / Headings:** `Inter` for clean, modern readability.
- **Code & Terminal:** `JetBrains Mono` / `Menlo` for unambiguous character distinction (0 vs O, 1 vs l).

## Layout: The 3-Column Arena (User Reference Specification)
- **Column 1 (Left ~28%):** Problem Specification
  - Header: Problem navigation (`< Problem X of Y >`), difficulty badge (`Easy`, `Medium`, `Hard`), point pill (`100 points`), title.
  - Sub-tabs: `Description`, `Examples`, `Constraints`, `Notes`.
  - Content: Rich problem statement, Example cards with 1-click input/output copy, Constraints bullet list with math notations.
- **Column 2 (Center ~44%):** Code Editor & Bottom Console
  - Editor Header: Active file tab (`main.c`), tab add button (`+`), Language selector pill (`C (GCC 13)`), Settings gear (`⚙`), and Fullscreen toggle (`⛶`).
  - Code Editor: Monaco editor with dark theme (`vs-dark`), syntax highlighting, line numbers.
  - Bottom Tabbed Console: Tabs for `Output` and `Terminal ($HOME)`, `Clear` button, collapse toggle (`^`).
    - *Output tab:* Formatted compiler and runner logs (e.g., "Code compiled successfully.", "Test Case 1: Passed (2 ms)").
    - *Terminal tab:* Interactive xterm.js terminal connected to ephemeral Linux pod running at `$HOME`.
- **Column 3 (Right ~28%):** Test Runner, Custom Input & Submissions
  - Header Tabs: `Test Cases` | `Submissions`.
  - Test Cases Sub-tabs: `Run Code` | `Custom Input`.
  - Test Case Cards: Collapsible cards with status dot (green/red), `Test Case N`, status pill (`Passed`/`Failed`), `Input (stdin)`, `Expected Output`, and `Your Output`.
  - Custom Input: Textarea for user-supplied stdin.
  - Submissions: History list with status, score, timestamp, and load code action.
  - Sticky Footer Bar:
    - Left: `▶ Run Code` (dark button).
    - Right: `☁ Submit Solution` (vibrant electric/royal blue rounded button).

## Do's and Don'ts
- **DO** match the exact 3-column layout and visual hierarchy from the reference design.
- **DO** keep editor keystrokes 100% client-side for zero latency.
- **DO** provide separate Output (execution summary) and Terminal (raw bash pod) tabs.
- **DON'T** reveal secret inputs or expected outputs for hidden test cases.
- **DON'T** clutter the editor toolbar with non-essential controls.
