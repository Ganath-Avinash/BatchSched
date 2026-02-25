/**
 * scheduler.js
 * ============
 * Core scheduling engine for Online Robust Batch Scheduling Simulator.
 * Contains all algorithm logic: job management, sorting strategies,
 * selection, and metric computation.
 *
 * Public API:
 *   addJob(compute, deadline)         → adds a job to the global pool
 *   removeExpiredJobs(today)          → prunes jobs past their deadline
 *   sortJobs(jobs, strategy)          → sorts a job array by strategy
 *   selectJobs(jobs, N)               → picks top-N from sorted list
 *   getRemainingJobs(all, selected)   → jobs not selected
 *   calculateTotalCompute(jobs)       → Σ compute units
 *   calculateBacklog(jobs)            → count of remaining jobs
 *   calculateLoadVariance(history)    → variance of daily compute loads
 *   runScheduler(today, N, strategy)  → full day execution, returns state
 */

'use strict';

/* ─────────────────────────────────────────────
   GLOBAL JOB POOL
   ───────────────────────────────────────────── */

/** @type {Array<{id:number, compute:number, deadline:number, addedDay:number}>} */
let jobPool = [];
let jobIdCounter = 1;

/** Reset the entire pool (used by simulation engine). */
function resetJobPool() {
  jobPool = [];
  jobIdCounter = 1;
}

/** Expose a read-only view of the current pool. */
function getJobPool() {
  return jobPool.slice();
}

/* ─────────────────────────────────────────────
   JOB CRUD
   ───────────────────────────────────────────── */

/**
 * addJob – push a new job into the pool.
 * @param {number} compute   Compute units required (positive integer).
 * @param {number} deadline  Latest day the job may run.
 * @param {number} [today=1] Day the job was added (for record-keeping).
 * @returns {object} The newly created job object.
 */
function addJob(compute, deadline, today = 1) {
  if (compute <= 0) throw new Error('Compute units must be positive.');
  if (deadline < today) throw new Error('Deadline cannot be in the past.');

  const job = {
    id: jobIdCounter++,
    compute: Math.round(compute),
    deadline: Math.round(deadline),
    addedDay: today,
  };
  jobPool.push(job);
  return job;
}

/**
 * removeExpiredJobs – remove jobs whose deadline has passed.
 * @param {number} today Current day number.
 * @returns {{ remaining: object[], expired: object[] }}
 */
function removeExpiredJobs(today) {
  const expired = jobPool.filter(j => j.deadline < today);
  jobPool = jobPool.filter(j => j.deadline >= today);
  return { remaining: jobPool.slice(), expired };
}

/* ─────────────────────────────────────────────
   SORTING STRATEGIES
   ───────────────────────────────────────────── */

/**
 * sortJobs – sort a job array according to the chosen strategy.
 *
 * Strategies:
 *  'edf'     – Earliest Deadline First; tie-break: smallest compute (load smoothing)
 *  'lcf'     – Largest Compute First; tie-break: earliest deadline
 *  'random'  – Fisher-Yates shuffle
 *
 * @param {object[]} jobs     Array of job objects.
 * @param {string}   strategy One of 'edf' | 'lcf' | 'random'.
 * @returns {object[]} New sorted array (original untouched).
 */
function sortJobs(jobs, strategy = 'edf') {
  const copy = jobs.slice();

  switch (strategy) {
    case 'edf':
      // Primary: deadline ascending | Secondary: compute ascending (smoothing)
      copy.sort((a, b) => {
        if (a.deadline !== b.deadline) return a.deadline - b.deadline;
        return a.compute - b.compute;
      });
      break;

    case 'lcf':
      // Primary: compute descending | Secondary: deadline ascending
      copy.sort((a, b) => {
        if (b.compute !== a.compute) return b.compute - a.compute;
        return a.deadline - b.deadline;
      });
      break;

    case 'random':
      // Fisher-Yates shuffle
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      break;

    default:
      throw new Error(`Unknown strategy: "${strategy}"`);
  }

  return copy;
}

/* ─────────────────────────────────────────────
   SELECTION
   ───────────────────────────────────────────── */

/**
 * selectJobs – pick the first N jobs from an already-sorted array.
 * @param {object[]} sortedJobs Pre-sorted job list.
 * @param {number}   N          Batch size.
 * @returns {object[]} Selected jobs (≤ N).
 */
function selectJobs(sortedJobs, N) {
  return sortedJobs.slice(0, Math.max(0, N));
}

/**
 * getRemainingJobs – compute pool minus selected ids.
 * @param {object[]} all      Full pool snapshot.
 * @param {object[]} selected Jobs that were selected.
 * @returns {object[]}
 */
function getRemainingJobs(all, selected) {
  const selectedIds = new Set(selected.map(j => j.id));
  return all.filter(j => !selectedIds.has(j.id));
}

/* ─────────────────────────────────────────────
   METRIC HELPERS
   ───────────────────────────────────────────── */

/**
 * calculateTotalCompute – sum compute units.
 * @param {object[]} jobs
 * @returns {number}
 */
function calculateTotalCompute(jobs) {
  return jobs.reduce((acc, j) => acc + j.compute, 0);
}

/**
 * calculateBacklog – number of pending (unscheduled) jobs.
 * @param {object[]} jobs
 * @returns {number}
 */
function calculateBacklog(jobs) {
  return jobs.length;
}

/**
 * calculateLoadVariance – population variance of compute values in history.
 * @param {number[]} history Array of daily compute totals.
 * @returns {number} Variance (0 if fewer than 2 data points).
 */
function calculateLoadVariance(history) {
  if (history.length < 2) return 0;
  const mean = history.reduce((a, b) => a + b, 0) / history.length;
  const sqDiffs = history.map(v => Math.pow(v - mean, 2));
  return sqDiffs.reduce((a, b) => a + b, 0) / history.length;
}

/* ─────────────────────────────────────────────
   MAIN SCHEDULER
   ───────────────────────────────────────────── */

/**
 * runScheduler – execute one scheduling round.
 *
 * Steps:
 *  1. Remove expired jobs.
 *  2. Sort remaining pool by strategy.
 *  3. Select N jobs.
 *  4. Remove selected jobs from pool.
 *  5. Compute metrics.
 *  6. Return structured state.
 *
 * @param {number} today    Current day number.
 * @param {number} N        Batch size.
 * @param {string} strategy Scheduling strategy.
 * @returns {{
 *   selected: object[],
 *   remaining: object[],
 *   expired: object[],
 *   totalCompute: number,
 *   backlogSize: number,
 *   variance: number,
 *   day: number,
 *   strategy: string,
 * }}
 */
function runScheduler(today, N, strategy, computeHistory = []) {
  // 1. Expire stale jobs
  const { expired } = removeExpiredJobs(today);

  // 2. Sort
  const sorted = sortJobs(jobPool, strategy);

  // 3. Select
  const selected = selectJobs(sorted, N);

  // 4. Remove selected from pool
  const selectedIds = new Set(selected.map(j => j.id));
  jobPool = jobPool.filter(j => !selectedIds.has(j.id));

  // 5. Metrics
  const totalCompute = calculateTotalCompute(selected);
  const backlogSize = calculateBacklog(jobPool);
  const updatedHistory = [...computeHistory, totalCompute];
  const variance = calculateLoadVariance(updatedHistory);

  return {
    selected,
    remaining: jobPool.slice(),
    expired,
    totalCompute,
    backlogSize,
    variance,
    day: today,
    strategy,
  };
}
