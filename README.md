# BatchSched — Online Robust Batch Scheduling Simulator

> **Course:** 23CSE211 Design and Analysis of Algorithms  
> **Semester:** 4  
> **Type:** DAA Course Project  
> **Tech Stack:** HTML · CSS · Vanilla JavaScript · Chart.js · Firebase Auth

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Why This Problem is Hard](#2-why-this-problem-is-hard)
3. [What This Simulator Does](#3-what-this-simulator-does)
4. [Algorithms Used](#4-algorithms-used)
5. [Tech Stack](#5-tech-stack)
6. [Project Structure](#6-project-structure)
7. [System Architecture](#7-system-architecture)
8. [Core Algorithm Walkthrough](#8-core-algorithm-walkthrough)
9. [Metrics Explained](#9-metrics-explained)
10. [Authentication System](#10-authentication-system)
11. [How to Run](#11-how-to-run)
12. [Live Demo](#12-live-demo)

---

## 1. Problem Statement

> You are tasked with designing the core logic for a batch processing scheduler. The system receives a continuous stream of job requests, each requiring a specific amount of computational effort and having a strict expiration date. The engine processes a fixed number of jobs daily. The system is dynamic; while you see a set of jobs now, more will arrive tomorrow, and you have no visibility into their requirements until they appear. The scheduler must make selections today without knowing the characteristics, urgency, or volume of jobs that will be submitted in the future.

### Constraints
- A job is **only successful** if it is included in a batch executed **on or before its deadline**
- The scheduler has **no look-ahead capability** — future arrivals are completely unknown
- The total compute load must be **smoothed across time** to ensure long-term system stability

### Goal
> Select **N jobs** for today's execution batch that represent the "best possible" choice — robust enough that even if the most challenging sequence of jobs arrives tomorrow, today's decision is not rendered suboptimal in hindsight.

### Input
Each job `J_i` has:
| Field | Symbol | Description |
|---|---|---|
| Compute Units | `C_i` | How much computational effort the job requires |
| Deadline | `D_i` | The latest day by which the job must run (or it expires) |

### Output
A list of **N jobs** selected from the current pool to be executed today.

---

## 2. Why This Problem is Hard

This is an **Online Algorithm** problem — unlike offline scheduling where all jobs are known upfront, here:

```
Day 1: You see {J1, J2, J3}   → Must commit to N selections NOW
Day 2: {J4, J5, J6} arrive    → You could not have known these existed
Day 3: {J7, J8} arrive        → Still unknown yesterday
```

This creates a **fundamental trade-off**:

| Greedy Choice | Risk |
|---|---|
| Process only urgent jobs today | Miss heavy-compute jobs that pile up |
| Process only large jobs today | Urgent jobs expire and become missed deadlines |
| Ignore load distribution | Compute spikes damage system stability |

A **robust** selection must balance all three forces simultaneously, which is why three different strategies are implemented and compared.

---

## 3. What This Simulator Does

BatchSched is an **interactive web dashboard** that lets you:

- **Add jobs** manually (set compute units + deadline)
- **Run Today's Scheduler** — execute one day with your chosen strategy
- **Simulate 7 Days** — auto-run a full week with random incoming jobs
- **Inject Worst Case** — flood the pool with 11 heavy/urgent jobs to stress-test
- **Compare Strategies** — run all 3 algorithms on the same scenario side-by-side
- **Step-by-Step Mode** — see exactly how the algorithm makes decisions, step by step
- **Live Metrics Panel** — track compute dispatched, backlog, expiry count, variance
- **Charts** — real-time compute load timeline and strategy comparison bar chart

---

## 4. Algorithms Used

### Algorithm 1: EDF + Load Smoothing *(Primary / Recommended)*

**Earliest Deadline First (EDF)** is the core strategy, extended with a load-smoothing tie-break.

**Sort order:**
1. Primary: **deadline ascending** (most urgent first)
2. Secondary: **compute ascending** (smaller jobs preferred when deadlines tie)

**Why EDF?**  
EDF is provably optimal for single-machine scheduling when all jobs have unit compute and preemption is allowed (Horn 1972, Dertouzos 1974). In our discrete online setting, it provides the best deadline protection with no look-ahead.

**Why the compute tie-break (Load Smoothing)?**  
When two jobs have the same deadline, picking the *smaller* compute job leaves "budget" for tomorrow. This prevents compute spikes — if we greedily pick the heaviest jobs at every deadline tie, the daily total becomes erratic (high variance). The secondary sort keeps variance low.

```
Sort key: (deadline ASC, compute ASC)

Example:
  J1: C=15, D=2   → sort key (2, 15)
  J2: C=3,  D=2   → sort key (2, 3)   ← picked first (same deadline, less compute)
  J3: C=10, D=4   → sort key (4, 10)
```

**Pseudocode:**
```
FUNCTION EDF_Smoothed(jobs, N):
  Remove all jobs where deadline < today
  Sort jobs by (deadline ASC, compute ASC)
  Return first N jobs from sorted list
```

---

### Algorithm 2: Largest Compute First (LCF)

Prioritises the jobs that consume the most compute resources.

**Sort order:**
1. Primary: **compute descending** (heaviest jobs first)
2. Secondary: **deadline ascending** (ties broken by urgency)

**Why LCF?**  
Maximises total compute dispatched per day. Useful when the organisation needs to ensure maximum throughput — important for SLA (Service Level Agreement) compliance by compute volume.

**Trade-off:**  
LCF tends to neglect small-but-urgent jobs, leading to higher expiry rates. It also produces higher compute variance day-to-day since it always picks the heaviest available jobs.

```
Sort key: (compute DESC, deadline ASC)
```

---

### Algorithm 3: Random Selection

Randomly shuffles the job pool using **Fisher-Yates shuffle** and picks the first N.

**Why include Random?**  
Random serves as a **baseline benchmark**. When comparing EDF and LCF, their advantage over Random demonstrates their actual algorithmic value. Random also models what a naive or disorganised scheduler would do.

**Fisher-Yates Algorithm** (used in code):
```
FOR i from n-1 DOWN TO 1:
  j = random integer in [0, i]
  SWAP array[i] with array[j]
```
This runs in O(n) and produces a uniformly random permutation — every ordering is equally likely.

---

### Complete Scheduler Pipeline (runScheduler)

Every scheduling run — regardless of strategy — executes this exact sequence:

```
Step 1: EXPIRE STALE JOBS
        Remove all jobs where deadline < today
        → These are missed; added to "Expired" list
        
Step 2: SORT
        Apply chosen strategy to remaining pool
        
Step 3: SELECT
        Take top N from sorted list (or all if fewer than N available)
        
Step 4: REMOVE FROM POOL
        Selected jobs are marked as "running" and removed from pending pool
        
Step 5: POST-RUN SWEEP
        After advancing to Day+1, remove any jobs with deadline < new_today
        → Catches jobs that survived the run but are now past deadline
        
Step 6: COMPUTE METRICS
        totalCompute = Σ compute units of selected jobs
        backlog      = |remaining pool|
        variance     = population variance of daily compute history
```

---

## 5. Tech Stack

| Technology | Role | Why Chosen |
|---|---|---|
| **HTML5** | Structure and page layout | Semantic, no build step required |
| **CSS3 (Vanilla)** | All styling, dark theme, animations | Full control, no framework overhead |
| **JavaScript (ES6+)** | All application logic | Runs natively in browser, no server |
| **Chart.js 4.4** | Line chart + bar chart rendering | Lightweight, well-documented charting library |
| **Firebase Auth 10.11** | User authentication (Email + Google) | Managed auth with zero backend code |
| **Google Fonts (Inter)** | Typography | Professional, readable modern typeface |

### Why No Framework (React/Vue)?
This is a **DAA algorithm project** — the focus is on the correctness and clarity of scheduling logic, not UI framework choices. Vanilla JS keeps the algorithm code transparent and auditable.

---

## 6. Project Structure

```
Project/
│
├── index.html          # Main simulator dashboard (UI + app controller JS)
├── login.html          # Login / Sign Up page (Firebase Auth)
│
├── scheduler.js        # Core scheduling engine (algorithms live here)
├── simulation.js       # Simulation engine (multi-day runs, worst-case injection)
├── charts.js           # Chart.js wrappers for all visualisations
│
├── style.css           # All styling (dark theme, layout, components)
├── firebase-config.js  # Firebase initialisation and auth export
│
└── README.md           # This file
```

---

## 7. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     login.html                          │
│  Firebase Auth (Email/Password + Google OAuth)          │
│  onAuthStateChanged → redirect to index.html            │
└──────────────────────┬──────────────────────────────────┘
                       │ authenticated session
                       ▼
┌─────────────────────────────────────────────────────────┐
│                     index.html                          │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Control     │  │ Live Metrics │  │ Run Summary   │  │
│  │ Panel       │  │ Panel        │  │ Panel         │  │
│  └──────┬──────┘  └──────────────┘  └───────────────┘  │
│         │                                               │
│         ▼ user actions                                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │              app.js (inline)                    │   │
│  │  Event handlers → calls scheduler/simulation   │   │
│  └──────┬───────────────────────┬──────────────────┘   │
│         │                       │                       │
│         ▼                       ▼                       │
│  ┌─────────────┐       ┌────────────────┐               │
│  │ scheduler.js│       │ simulation.js  │               │
│  │             │       │                │               │
│  │ • addJob    │       │ • simulateDay  │               │
│  │ • sortJobs  │       │ • multiDay     │               │
│  │ • select    │◄──────│ • worstCase    │               │
│  │ • expire    │       │ • compare      │               │
│  │ • metrics   │       └────────────────┘               │
│  └──────┬──────┘                                        │
│         │ results                                       │
│         ▼                                               │
│  ┌─────────────┐  ┌─────────────────────────────────┐   │
│  │  charts.js  │  │  DOM Tables (Pending/Selected/  │   │
│  │  Chart.js   │  │  Expired)                       │   │
│  └─────────────┘  └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

---

## 8. Core Algorithm Walkthrough

### Example Scenario

**Day 5, N=3, Strategy=EDF**

Pool before scheduling:
```
ID   Compute   Deadline   Urgency
J12    8        Day 4     EXPIRED ← deadline < today (Day 5)
J13   15        Day 5     Due Today
J14    3        Day 5     Due Today
J15   10        Day 7     Safe
J16   12        Day 6     Tomorrow
J17    5        Day 8     Safe
```

**Step 1 — Expire:**
```
J12 removed (deadline 4 < today 5) → goes to Expired table
```

**Step 2 — Sort by EDF (deadline ASC, compute ASC on ties):**
```
J14: (5, 3)   ← Day 5, compute 3 → ranked 1st
J13: (5, 15)  ← Day 5, compute 15 → ranked 2nd (same deadline, higher compute)
J16: (6, 12)  ← Day 6 → ranked 3rd
J15: (7, 10)  ← Day 7 → ranked 4th
J17: (8, 5)   ← Day 8 → ranked 5th
```

**Step 3 — Select top 3:**
```
Selected: J14 (C=3), J13 (C=15), J16 (C=12)
Total compute dispatched: 30
```

**Step 4 — Remaining pool:**
```
J15 (D=7), J17 (D=8) → stay in Pending
```

**Step 5 — Day advances to Day 6, post-run sweep:**
```
Any job with deadline < 6 → auto-expired
J15 (D=7) and J17 (D=8) remain → Pending
```

---

## 9. Metrics Explained

### Compute Dispatched
Total compute units scheduled in today's batch.
```
totalCompute = Σ C_i  for all selected jobs
```

### Backlog
Number of jobs still pending (not yet selected or expired).
```
backlog = |jobPool|  after selection
```

### Total Expired
Cumulative count of jobs that missed their deadline across all runs.  
A **lower** expired count = better deadline protection = better algorithm performance.

### Load Variance (σ²)
Population variance of the daily compute totals across all runs so far.
```
mean = (Σ dailyCompute) / days
σ²   = (Σ (dailyCompute_i - mean)²) / days
```
**Lower variance = smoother load distribution = long-term system stability.**  
EDF with load smoothing achieves the lowest variance of the three strategies.

### Schedule Efficiency
```
efficiency = selected / (selected + backlog) × 100%
```
Measures what percentage of the total workload was dispatched today.

---

## 10. Authentication System

Authentication uses **Firebase Authentication** (Google Cloud) — no passwords are ever stored in your code or browser.

### Sign Up Flow
```
User fills email + password
        ↓
Firebase.createUserWithEmailAndPassword(auth, email, password)
        ↓
Firebase hashes password with bcrypt on Google's servers
Firebase creates user record with unique UID
Firebase issues a JWT session token
        ↓
onAuthStateChanged fires with user object
        ↓
Redirect to index.html (app loads)
```

### Login Flow
```
User fills email + password
        ↓
Firebase.signInWithEmailAndPassword(auth, email, password)
        ↓
Firebase verifies hash match on server
Firebase issues refreshed JWT token (auto-stored in browser)
        ↓
onAuthStateChanged fires
        ↓
Redirect to index.html
```

### Google Sign-In Flow
```
User clicks "Sign in with Google"
        ↓
Firebase opens Google's OAuth popup
User selects their Google Account
Google sends OAuth token to Firebase
Firebase verifies and creates/finds user
        ↓
onAuthStateChanged fires
        ↓
Redirect to index.html
```

### Auth Guard (index.html)
```javascript
onAuthStateChanged(auth, (user) => {
  if (!user)  → redirect to login.html   // not signed in
  if (user)   → show app shell           // signed in
});
```
The app shell (`<div id="appShell">`) is hidden by default (`display:none`) and only revealed after Firebase confirms authentication — this prevents any flash of content before the check completes.

---

## 11. How to Run

### Option A — Local (simple, no server needed for email auth)
```
1. Clone or download the project
2. Open login.html directly in your browser
   (email/password auth works; Google Sign-In needs a server)
```

### Option b — GitHub Pages (full feature, recommended)
```
1. Push project to a GitHub repository
2. Settings → Pages → Branch: main / (root) → Save
3. Add your yourusername.github.io to Firebase:
   Authentication → Settings → Authorized domains → Add domain
4. Visit https://yourusername.github.io/your-repo/
```

---

## 12. Live Demo

> **URL:** *(add your GitHub Pages link here after deployment)*

### Quick Start Guide
1. **Log in** with email or Google
2. Jobs are pre-seeded automatically on first load
3. Select a **Strategy** (EDF recommended)
4. Set **Batch Size N** (default: 5)
5. Click **▶ Run Today's Scheduler**
6. Observe the **Pending → Selected → Expired** flow
7. Try **Inject Worst Case** to stress-test the scheduler
8. Use **Compare Strategies** to see all three algorithms side-by-side
9. Use **Step by Step** to trace the exact algorithm decisions

---
