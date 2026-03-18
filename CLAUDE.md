# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cabinmate cabin layouts — a collection of static HTML pages that render interactive seat/cabin layout maps for Cabinmate coworking spaces. Each HTML file represents a specific franchise location's floor plan. These pages are embedded as iframes (or WebViews in React Native) inside a parent application (Axpert-based or mobile app) to allow users to visually select available seats during the booking flow.

## Architecture

### Environment Directories

The repo is organized by deployment environment. Each directory contains its own `layout.js`, `layout.css`, and per-location HTML files:

| Directory | API Base URL | Notes |
|-----------|-------------|-------|
| `dev/` | `https://dev-cmapi.zysk.in` | Development; `requiredParams` does NOT include `id` |
| `qa/` | `https://qa-cmapi.zysk.in` | QA; `requiredParams` includes `id` (userId) |
| `prod/` | `https://api.cabinmate.in` | Production; `requiredParams` includes `id`; `handleSeatSelection` does NOT call `parent.SetFieldValue`/`parent.UpdateFieldArray` |
| `Axpert/` | N/A (uses `AxCallSqlDataAPI`) | Legacy Axpert integration — reads field values from parent via `parent.GetFieldValue` and calls the SQL data API directly instead of fetch |

### Key Differences Between Environments

- **dev** `layout.js`: Uses `parent.SetFieldValue` / `parent.UpdateFieldArray` on seat selection. No `userId` param.
- **qa** `layout.js`: Same as dev but hits QA API and requires `id` (userId) param.
- **prod** `layout.js`: Hits production API, requires `id` param, does NOT call `parent.SetFieldValue` on seat select — only uses `postMessage`.
- **Axpert** `layout.js`: Completely different flow — synchronous, uses `AxCallSqlDataAPI`, no fetch calls, no loading overlay.

### How Layouts Work

1. HTML files define the physical floor plan using absolutely-positioned `<div>` elements with inline styles. Seats use classes `.horizontalSeat` or `.verticalSeat` and have a cabin-type class (e.g., `AC`, `Non-AC`). Each seat div's `id` attribute maps to the seat's database ID.

2. CSS and JS are loaded from an S3 bucket in prod HTML files (`cabinmate-axpert-api.s3.ap-south-1.amazonaws.com/html-files/`). Dev/QA files may reference local or S3-hosted assets.

3. `layout.js` runs on `DOMContentLoaded`:
   - Parses URL query params (passed via `?params=` with `^` as `&` and `~` as `=` delimiters)
   - Fetches seat availability from `/api/bookings/cabin-layout` (POST) and temp-cabin reservations from `/api/bookings/temp-cabin` (GET)
   - Colors seats based on availability: available (green border, pointer cursor), booked/hidden (grey `#eeeeee`, no border)
   - On seat click, communicates selection back to parent via `window.parent.postMessage` and/or `window.ReactNativeWebView.postMessage`

### Other Files

- `community.html` — A standalone file upload form for community posts (not a cabin layout). Posts files to `/api/community/posts`. Uses `parent.GetFieldValue` for Axpert integration.
- `occupancy/` — Occupancy view variants with tooltip support for showing seat details on hover.

## Development

Use VS Code Live Server (configured on port 5501 in `.vscode/settings.json`) to preview layout HTML files locally. No build step, package manager, or test framework — this is a pure static HTML/CSS/JS project.

### Adding a New Franchise Location

1. Create a new HTML file named `h<LocationName>.html` in the target environment directory (typically `prod/`).
2. Structure the floor plan with absolutely-positioned divs. Use `.horizontalSeat` or `.verticalSeat` classes. Set each seat's `id` to match its database record ID, and add the cabin-type class (`AC`, `Non-AC`, etc.).
3. Include the loading overlay div, link the S3-hosted CSS, and add the S3-hosted JS script at the bottom of `<body>`.
4. The seat `id` attributes must match what the `/api/bookings/cabin-layout` endpoint returns — mismatches cause seats to not render.

### URL Query Parameter Format

Layouts expect `?params=franchise_id~<value>^s_date~<value>^b_duration~<value>^cabin_type~<value>^d_value~<value>^id~<value>` where `~` = `=` and `^` = `&`.
