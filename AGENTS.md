# AGENTS.md

## Project Overview

This project is an **Aozora Bunko reader for Even G2**.

The expected product behavior is:

- Users select a book on the WebView side.
- The selected work is displayed on Even G2.
- Reading is performed on the glasses with scroll gestures.
- Reading progress is saved **per work** in LocalStorage.
- Works with saved progress are shown at the top of WebView as **"Currently Reading"**.
- A search bar is placed at the top of the WebView for finding works.
- Tapping a work opens it on Even G2, and if progress exists, resumes from that point.

## Documentation Guide

Read docs in this order when implementing or modifying behavior:

1. `docs/even-g2-developer-manual.md`
   - Overall Even G2 app development flow and constraints.
2. `docs/even-app-bridge-api.md`
   - Bridge API surface for host/WebView communication.
3. `docs/evenhub-event-models.md`
   - Event payloads and routing model.
4. `docs/evenhub-container-models.md`
   - Container and rendering models.
5. `docs/even-g2-input-reference.md`
   - Practical input handling rules for swipe/tap behavior.

## Docs Naming Convention

Use the following rule for new markdown files under `docs/`:

- lowercase only
- kebab-case
- suffix by topic (`-guide`, `-reference`, `-models`, `-api`, etc.)

Examples:

- `feature-reading-flow-guide.md`
- `evenhub-audio-event-reference.md`
- `storage-schema-reference.md`

Avoid mixed casing and underscores (for example, `MyDoc.md` or `my_doc.md`).
