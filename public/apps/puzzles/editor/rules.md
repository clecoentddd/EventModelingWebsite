# DSL Rules Reference
# Ground rules
Event-sourced process, following event modeling principles:
Every step has a clear actor or system.
Automation executes but does not decide. It prepares data for a command.
Commands are the responsible actors that trigger events.
Events signal that something happened, with all data sources explicit.
Screen → Command → Event → ReadModel → Automation/Screen sequence is enforced.
ExternalEvent in event modeling is truly unexpected: e.g., a webhook, a third-party alert, a sensor trigger — something outside your control that your system reacts to.

## Basic Rules for the flow
(SCREEN or AUTOMATION) then COMMAND then EVENT(s) then READMODEL, then (SCREEN or AUTOMATION)


## 1. Coordinate and Grid Rules
- **Grid Rows Supported:** Only rows listed in `GRID_ROWS` are rendered. (Default: `[2, 1, 0, -1, -2]`)
- **Coordinate Format:** Coordinates must be in the form `C;R` or `C,R` (column;row). Example: `1;0`.
- **Non-numeric or invalid coordinates** will trigger a parser error.
- **Elements with coordinates outside supported rows** will not be rendered.

## 2. Element Type Positioning Rules
- **Screen:** Should be at row 1 or higher. (Warn if r < 1)
- **Command:** Must be at row 0. (Warn if r ≠ 0)
- **Event:** Must be at row -1 or lower. (Warn if r ≥ 0)
- **ReadModel:** Must be at row 0. (Warn if r ≠ 0)
- **Automation:** Should be at row 1 or higher. (Warn if r < 1)
- **ExternalEvent:** Should be at the lowest level (typically -2 or lower). (Warn if r > lowest event row or r ≥ -1)

## 3. Positioning & Uniqueness
- **No duplicate positions:** No two elements may share the same (c, r) coordinate. (Error if duplicate)
- **Multi-event branching:** Events from a single command should be in consecutive columns. (Warn if column gaps)

## 4. Flow Rules
- **Allowed Flows:**
  - Screen → Command
  - Command → Event
  - Event → ReadModel
  - Automation → Command
  - Automation → Event
  - Screen → Automation (**Not allowed!** See note below)
  - Command → Automation
  - ReadModel → Screen
  - ReadModel → Automation
  - ExternalEvent → Automation
- **Screen → Automation is not allowed.**
  - This rule is not yet enforced in code, but should be: a SCREEN element must not have a FLOW to an AUTOMATION element.
- **Invalid flows** will trigger a warning with details.

## 5. Syntax Rules
- **ELEMENT:** `ELEMENT: <id>, <type>, <name>, <col>;<row>`
- **TEXT:** `TEXT:` block follows an ELEMENT, indented or on next lines
- **FLOW:** `FLOW: <fromId> to <toId>`
- **BACK_FLOW:** `BACK_FLOW: <fromId> to <toId>`
- **DESCRIPTION/LEVEL:** Optional metadata at the top

## 6. Error Reporting
- **Positioning errors** and **flow-type errors** are reported with line numbers and reasons.
- **Invalid coordinate or type** will be reported as a parser error.

---

This file is auto-generated from the current DSL parser and renderer logic. Update as rules evolve.
