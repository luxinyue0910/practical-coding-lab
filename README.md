# Practical.py

A browser-based Python practice lab for software-engineering virtual onsite
interviews, with an emphasis on practical coding rather than puzzle-only
LeetCode exercises.

**Live site:** [practical-py-lab.spunky-loom-3465.chatgpt.site](https://practical-py-lab.spunky-loom-3465.chatgpt.site)

## What is included

- 14 timed Python exercises
- Chinese/English interface toggle with a device-local language preference
- In-browser Python execution with Pyodide
- Expandable public tests and additional hidden tests
- Hints, timeout protection, and device-local progress tracking
- Responsive desktop and mobile layouts

The practice set covers:

- Log parsing and aggregation
- Sliding-window rate limiting
- TTL-aware LRU caching
- Retry and API reliability
- JSON merging and nested data
- ISO 8601 dates and time zones
- Pagination and cursor-cycle protection
- Webhook deduplication
- Streaming iterables and bounded memory

## Run locally

Requires Node.js `>=22.13.0`.

```bash
npm install
npm run dev
```

Open the local URL printed by the development server.

## Validate

```bash
npm test
```

This builds the site and runs the rendered application checks.

## Project structure

```text
app/page.tsx           Main practice interface and original problem set
app/i18n.ts            Chinese and English interface/problem copy
app/problems-extra.ts  Role-focused practical coding exercises
app/globals.css        Responsive visual design
tests/                 Rendered application tests
```

Python code executes in an isolated browser worker. The first run downloads the
Pyodide runtime, so it may take a few seconds.
