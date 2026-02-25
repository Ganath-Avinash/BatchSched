/**
 * simulation.js
 * =============
 * Simulation engine for the Online Robust Batch Scheduling Simulator.
 *
 * Depends on: scheduler.js (must be loaded first).
 *
 * Public API:
 *   generateRandomJobs(count, today, maxDeadlineOffset, maxCompute)
 *   simulateDay(today, N, strategy)
 *   simulateMultipleDays(days, N, strategy, jobsPerDay)
 *   injectWorstCaseTomorrow(today)
 */

'use strict';

/* ─────────────────────────────────────────────
   RANDOM JOB GENERATOR
   ───────────────────────────────────────────── */

/**
 * generateRandomJobs – create a batch of randomised jobs and add them to pool.
 *
 * @param {number} count              Number of jobs to generate.
 * @param {number} today              Current day (deadline lower bound = today).
 * @param {number} [maxOffset=7]      Maximum days ahead for deadlines.
 * @param {number} [maxCompute=20]    Maximum compute units per job.
 * @returns {object[]} Array of newly created job objects.
 */
function generateRandomJobs(count, today, maxOffset = 7, maxCompute = 20) {
    const created = [];
    for (let i = 0; i < count; i++) {
        const compute = Math.floor(Math.random() * maxCompute) + 1;
        const deadlineOffset = Math.floor(Math.random() * maxOffset);      // 0 … maxOffset-1
        const deadline = today + deadlineOffset;
        try {
            const job = addJob(compute, deadline, today);
            created.push(job);
        } catch (e) {
            // Skip degenerate jobs
        }
    }
    return created;
}

/* ─────────────────────────────────────────────
   SINGLE-DAY SIMULATION
   ───────────────────────────────────────────── */

/** Internal history tracker used across multi-day simulation. */
let _computeHistory = [];

/**
 * simulateDay – generate jobs for one day, then run the scheduler.
 * Automatically adds 3–6 random jobs before scheduling.
 *
 * @param {number} today    Current day number.
 * @param {number} N        Batch size.
 * @param {string} strategy Scheduling strategy.
 * @param {number} [incomingCount=5] Base number of incoming jobs.
 * @returns {object} Scheduler result state + incoming jobs list.
 */
function simulateDay(today, N, strategy, incomingCount = 5) {
    const randomCount = incomingCount + Math.floor(Math.random() * 4) - 1; // ±2 jitter
    const incoming = generateRandomJobs(Math.max(1, randomCount), today);
    const result = runScheduler(today, N, strategy, _computeHistory);
    _computeHistory.push(result.totalCompute);
    return { ...result, incoming };
}

/* ─────────────────────────────────────────────
   MULTI-DAY SIMULATION
   ───────────────────────────────────────────── */

/**
 * simulateMultipleDays – run the scheduler forward for multiple days.
 * Resets the job pool and history for a clean run.
 *
 * @param {number} days         Number of days to simulate.
 * @param {number} N            Batch size per day.
 * @param {string} strategy     Scheduling strategy.
 * @param {number} [jobsPerDay=5] Incoming jobs per day.
 * @returns {object[]} Array of per-day result objects.
 */
function simulateMultipleDays(days, N, strategy, jobsPerDay = 5) {
    // Clean slate
    resetJobPool();
    _computeHistory = [];

    const results = [];

    for (let d = 1; d <= days; d++) {
        const dayResult = simulateDay(d, N, strategy, jobsPerDay);
        results.push(dayResult);
    }

    return results;
}

/* ─────────────────────────────────────────────
   WORST-CASE INJECTION
   ───────────────────────────────────────────── */

/**
 * injectWorstCaseTomorrow – stress-test by flooding tomorrow with heavy,
 * urgent jobs. Designed to prove the scheduler can remain stable under load.
 *
 * Injects:
 *  - 8 jobs all due tomorrow (deadline = today + 1) with large compute.
 *  - 3 jobs due today (deadline = today) with maximum compute.
 *
 * @param {number} today  Current day.
 * @returns {object[]}    List of injected job objects.
 */
function injectWorstCaseTomorrow(today) {
    const injected = [];

    // Ultra-urgent jobs due TODAY
    for (let i = 0; i < 3; i++) {
        const compute = 18 + Math.floor(Math.random() * 3); // 18-20
        const job = addJob(compute, today, today);
        job._worstCase = true;
        injected.push(job);
    }

    // Heavy jobs due TOMORROW
    for (let i = 0; i < 8; i++) {
        const compute = 14 + Math.floor(Math.random() * 7); // 14-20
        const job = addJob(compute, today + 1, today);
        job._worstCase = true;
        injected.push(job);
    }

    return injected;
}

/* ─────────────────────────────────────────────
   STRATEGY COMPARISON
   ───────────────────────────────────────────── */

/**
 * compareStrategies – run the same scenario under all three strategies
 * and return comparative metrics.
 *
 * @param {number} days       Days to simulate.
 * @param {number} N          Batch size.
 * @param {number} [jobs=5]   Incoming jobs per day.
 * @returns {object} { edf: [...], lcf: [...], random: [...] }
 */
function compareStrategies(days, N, jobs = 5) {
    const strategies = ['edf', 'lcf', 'random'];
    const comparison = {};

    for (const s of strategies) {
        comparison[s] = simulateMultipleDays(days, N, s, jobs);
    }

    return comparison;
}

/** Reset simulation history (call before a fresh multi-day run externally). */
function resetSimulation() {
    resetJobPool();
    _computeHistory = [];
}
