/**
 * charts.js
 * =========
 * Visualization layer for Online Robust Batch Scheduling Simulator.
 * Manages all Chart.js instances. Must be loaded after Chart.js CDN.
 *
 * Charts:
 *   1. Daily Compute Load      (bar)
 *   2. Backlog Size            (line)
 *   3. Strategy Comparison     (multi-line)
 *   4. Load Variance Over Time (line + fill)
 */

'use strict';

/* ─────────────────────────────────────────────
   CHART INSTANCES (module-scoped singletons)
   ───────────────────────────────────────────── */
let computeChart = null;
let backlogChart = null;
let comparisonChart = null;
let varianceChart = null;

/* ─────────────────────────────────────────────
   SHARED THEME
   ───────────────────────────────────────────── */
const PALETTE = {
    primary: '#6C63FF',
    secondary: '#FF6584',
    accent: '#43E97B',
    warn: '#F9A825',
    edf: '#6C63FF',
    lcf: '#FF6584',
    random: '#43E97B',
    gridLine: 'rgba(255,255,255,0.07)',
    text: '#CBD5E1',
};

function baseOptions(title) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 500, easing: 'easeInOutQuart' },
        plugins: {
            legend: {
                labels: { color: PALETTE.text, font: { family: "'Inter', sans-serif", size: 12 } },
            },
            title: {
                display: !!title,
                text: title,
                color: PALETTE.text,
                font: { family: "'Inter', sans-serif", size: 14, weight: '600' },
                padding: { bottom: 12 },
            },
            tooltip: {
                backgroundColor: 'rgba(15,23,42,0.9)',
                titleColor: '#fff',
                bodyColor: PALETTE.text,
                borderColor: PALETTE.primary,
                borderWidth: 1,
                cornerRadius: 8,
            },
        },
        scales: {
            x: {
                ticks: { color: PALETTE.text, font: { family: "'Inter', sans-serif" } },
                grid: { color: PALETTE.gridLine },
            },
            y: {
                ticks: { color: PALETTE.text, font: { family: "'Inter', sans-serif" } },
                grid: { color: PALETTE.gridLine },
                beginAtZero: true,
            },
        },
    };
}

/* ─────────────────────────────────────────────
   1. DAILY COMPUTE LOAD CHART
   ───────────────────────────────────────────── */

/**
 * initComputeChart – create the compute load bar chart.
 * @param {string} canvasId  HTML canvas element id.
 */
function initComputeChart(canvasId) {
    const ctx = document.getElementById(canvasId).getContext('2d');

    if (computeChart) computeChart.destroy();

    computeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Daily Compute Load',
                data: [],
                backgroundColor: 'rgba(108,99,255,0.75)',
                borderColor: PALETTE.primary,
                borderWidth: 2,
                borderRadius: 6,
                hoverBackgroundColor: 'rgba(108,99,255,1)',
            }],
        },
        options: baseOptions('Daily Compute Load'),
    });
    return computeChart;
}

/**
 * updateComputeChart – push new day data.
 * @param {number} day     Day label.
 * @param {number} compute Compute total.
 */
function updateComputeChart(day, compute) {
    if (!computeChart) return;
    computeChart.data.labels.push(`Day ${day}`);
    computeChart.data.datasets[0].data.push(compute);
    computeChart.update();
}

/**
 * resetComputeChart – clear all data.
 */
function resetComputeChart() {
    if (!computeChart) return;
    computeChart.data.labels = [];
    computeChart.data.datasets[0].data = [];
    computeChart.update();
}

/* ─────────────────────────────────────────────
   2. BACKLOG SIZE CHART
   ───────────────────────────────────────────── */

function initBacklogChart(canvasId) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    if (backlogChart) backlogChart.destroy();

    backlogChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Backlog Size',
                data: [],
                borderColor: PALETTE.secondary,
                backgroundColor: 'rgba(255,101,132,0.15)',
                borderWidth: 2.5,
                pointRadius: 4,
                pointHoverRadius: 7,
                fill: true,
                tension: 0.4,
            }],
        },
        options: baseOptions('Backlog Size Over Time'),
    });
    return backlogChart;
}

function updateBacklogChart(day, backlog) {
    if (!backlogChart) return;
    backlogChart.data.labels.push(`Day ${day}`);
    backlogChart.data.datasets[0].data.push(backlog);
    backlogChart.update();
}

function resetBacklogChart() {
    if (!backlogChart) return;
    backlogChart.data.labels = [];
    backlogChart.data.datasets[0].data = [];
    backlogChart.update();
}

/* ─────────────────────────────────────────────
   3. STRATEGY COMPARISON CHART
   ───────────────────────────────────────────── */

/**
 * renderComparisonChart – full replacement render from strategy comparison data.
 * @param {string} canvasId
 * @param {object} data  { edf: results[], lcf: results[], random: results[] }
 */
function renderComparisonChart(canvasId, data) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    if (comparisonChart) comparisonChart.destroy();

    const days = data.edf.map((_, i) => `Day ${i + 1}`);

    const makeDataset = (label, results, color) => ({
        label,
        data: results.map(r => r.totalCompute),
        borderColor: color,
        backgroundColor: color + '26',
        borderWidth: 2.5,
        pointRadius: 3,
        fill: false,
        tension: 0.4,
    });

    comparisonChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: days,
            datasets: [
                makeDataset('EDF + Smoothing', data.edf, PALETTE.edf),
                makeDataset('Largest Compute First', data.lcf, PALETTE.lcf),
                makeDataset('Random Selection', data.random, PALETTE.random),
            ],
        },
        options: baseOptions('Strategy Comparison — Daily Compute Load'),
    });
}

/* ─────────────────────────────────────────────
   4. LOAD VARIANCE OVER TIME CHART
   ───────────────────────────────────────────── */

function initVarianceChart(canvasId) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    if (varianceChart) varianceChart.destroy();

    varianceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Load Variance',
                data: [],
                borderColor: PALETTE.warn,
                backgroundColor: 'rgba(249,168,37,0.12)',
                borderWidth: 2.5,
                pointRadius: 4,
                fill: true,
                tension: 0.45,
            }],
        },
        options: baseOptions('Load Variance Over Time'),
    });
    return varianceChart;
}

function updateVarianceChart(day, variance) {
    if (!varianceChart) return;
    varianceChart.data.labels.push(`Day ${day}`);
    varianceChart.data.datasets[0].data.push(+variance.toFixed(2));
    varianceChart.update();
}

function resetVarianceChart() {
    if (!varianceChart) return;
    varianceChart.data.labels = [];
    varianceChart.data.datasets[0].data = [];
    varianceChart.update();
}

/* ─────────────────────────────────────────────
   BULK HELPERS
   ───────────────────────────────────────────── */

/** initialiseAllCharts – set up all canvases. */
function initialiseAllCharts() {
    initComputeChart('computeChart');
    initBacklogChart('backlogChart');
    initVarianceChart('varianceChart');
}

/** resetAllCharts – clear all chart data. */
function resetAllCharts() {
    resetComputeChart();
    resetBacklogChart();
    resetVarianceChart();
}

/**
 * pushDayToCharts – convenience: push one day's result to charts 1, 2, 4.
 * @param {object} result  Result from runScheduler / simulateDay.
 * @param {number[]} computeHistory  Full history array for variance.
 */
function pushDayToCharts(result, computeHistory) {
    updateComputeChart(result.day, result.totalCompute);
    updateBacklogChart(result.day, result.backlogSize);
    const v = calculateLoadVariance(computeHistory);
    updateVarianceChart(result.day, v);
}
