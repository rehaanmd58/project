/**
 * ResQRoute 2D – Traffic Analytics & Chart.js Visualizer
 * Manages 4 real-time interactive charts and statistical KPI dashboards.
 */

export class AnalyticsManager {
  constructor(engine) {
    this.engine = engine;
    this.charts = {};
    this.timeLabels = [];
    this.normalVehicleHistory = [];
    this.emergencyVehicleHistory = [];
    this.maxDataPoints = 15;

    this.chartTheme = {
      color: '#94a3b8',
      borderColor: '#1e293b',
      font: { family: 'Plus Jakarta Sans', size: 11 }
    };
  }

  init() {
    this.setupVehicleCountChart();
    this.setupTrafficDensityChart();
    this.setupWaitingTimeChart();
    this.setupTravelTimeComparisonChart();

    // Listen for simulation updates
    if (this.engine) {
      this.engine.on('metricsUpdate', (metrics) => this.handleMetricsUpdate(metrics));
    }
  }

  handleMetricsUpdate(metrics) {
    // 1. Update text metric elements on Analytics page
    const setElem = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setElem('analytics-total-vehicles', metrics.totalVehicles);
    setElem('analytics-normal-vehicles', metrics.normalVehicles);
    setElem('analytics-emergency-vehicles', metrics.emergencyVehicles);
    setElem('analytics-avg-speed', `${Math.round(metrics.avgSpeed)} px/s`);
    setElem('analytics-avg-wait', `${metrics.avgWaitTime.toFixed(1)} s`);
    setElem('analytics-density', `${metrics.trafficDensityPercent}%`);
    setElem('analytics-active-intersections', metrics.activeIntersections);
    setElem('analytics-conflicts', metrics.conflictsDetected);

    // 2. Update Charts
    this.updateVehicleCountChart(metrics.normalVehicles, metrics.emergencyVehicles);
    this.updateTrafficDensityChart();
  }

  setupVehicleCountChart() {
    const ctx = document.getElementById('chart-vehicle-count');
    if (!ctx || typeof Chart === 'undefined') return;

    this.charts.vehicleCount = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Normal Vehicles',
            data: [],
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.12)',
            fill: true,
            tension: 0.3,
            borderWidth: 2
          },
          {
            label: 'Emergency Vehicles',
            data: [],
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            fill: true,
            tension: 0.3,
            borderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: this.chartTheme.color, font: this.chartTheme.font } }
        },
        scales: {
          x: { grid: { color: this.chartTheme.borderColor }, ticks: { color: this.chartTheme.color } },
          y: { grid: { color: this.chartTheme.borderColor }, ticks: { color: this.chartTheme.color }, beginAtZero: true }
        }
      }
    });
  }

  updateVehicleCountChart(normal, emergency) {
    if (!this.charts.vehicleCount) return;

    const timeStr = new Date().toLocaleTimeString([], { hour12: false, minute: '2-digit', second: '2-digit' });
    this.timeLabels.push(timeStr);
    this.normalVehicleHistory.push(normal);
    this.emergencyVehicleHistory.push(emergency);

    if (this.timeLabels.length > this.maxDataPoints) {
      this.timeLabels.shift();
      this.normalVehicleHistory.shift();
      this.emergencyVehicleHistory.shift();
    }

    this.charts.vehicleCount.data.labels = [...this.timeLabels];
    this.charts.vehicleCount.data.datasets[0].data = [...this.normalVehicleHistory];
    this.charts.vehicleCount.data.datasets[1].data = [...this.emergencyVehicleHistory];
    this.charts.vehicleCount.update('none'); // smooth update without full reload
  }

  setupTrafficDensityChart() {
    const ctx = document.getElementById('chart-traffic-density');
    if (!ctx || typeof Chart === 'undefined') return;

    this.charts.trafficDensity = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Corridor A-B', 'Corridor B-D', 'Corridor D-C', 'Corridor C-A'],
        datasets: [
          {
            label: 'Congestion Density (%)',
            data: [42, 58, 35, 62],
            backgroundColor: ['#06b6d4', '#f59e0b', '#10b981', '#ef4444'],
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { grid: { color: this.chartTheme.borderColor }, ticks: { color: this.chartTheme.color } },
          y: { grid: { color: this.chartTheme.borderColor }, ticks: { color: this.chartTheme.color }, max: 100, beginAtZero: true }
        }
      }
    });
  }

  updateTrafficDensityChart() {
    if (!this.charts.trafficDensity || !this.engine) return;

    // Calculate real vehicle counts on each road corridor
    let countAB = 0, countBD = 0, countDC = 0, countCA = 0;
    this.engine.vehicles.forEach(v => {
      if (Math.abs(v.y - 200) < 32) countAB++;
      else if (Math.abs(v.x - 680) < 32) countBD++;
      else if (Math.abs(v.y - 540) < 32) countDC++;
      else if (Math.abs(v.x - 240) < 32) countCA++;
    });

    const cap = 12; // saturation vehicle count per segment
    const dAB = Math.min(100, Math.round((countAB / cap) * 100));
    const dBD = Math.min(100, Math.round((countBD / cap) * 100));
    const dDC = Math.min(100, Math.round((countDC / cap) * 100));
    const dCA = Math.min(100, Math.round((countCA / cap) * 100));

    this.charts.trafficDensity.data.datasets[0].data = [dAB, dBD, dDC, dCA];
    this.charts.trafficDensity.update('none');
  }

  setupWaitingTimeChart() {
    const ctx = document.getElementById('chart-waiting-time');
    if (!ctx || typeof Chart === 'undefined') return;

    this.charts.waitingTime = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Intersection A', 'Intersection B', 'Intersection C', 'Intersection D'],
        datasets: [
          {
            label: 'Normal Cycle Delay (s)',
            data: [14.2, 18.5, 12.0, 16.8],
            backgroundColor: 'rgba(239, 68, 68, 0.7)',
            borderRadius: 6
          },
          {
            label: 'Priority Corridor Delay (s)',
            data: [1.8, 2.1, 1.4, 2.0],
            backgroundColor: 'rgba(16, 185, 129, 0.8)',
            borderRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: this.chartTheme.color, font: this.chartTheme.font } }
        },
        scales: {
          x: { grid: { color: this.chartTheme.borderColor }, ticks: { color: this.chartTheme.color } },
          y: { grid: { color: this.chartTheme.borderColor }, ticks: { color: this.chartTheme.color }, beginAtZero: true }
        }
      }
    });
  }

  setupTravelTimeComparisonChart() {
    const ctx = document.getElementById('chart-travel-time');
    if (!ctx || typeof Chart === 'undefined') return;

    this.charts.travelTime = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Time Saved via Priority (s)', 'Priority Travel Time (s)'],
        datasets: [
          {
            data: [26, 21],
            backgroundColor: ['#10b981', '#3b82f6'],
            borderWidth: 0
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: this.chartTheme.color, font: this.chartTheme.font } }
        },
        cutout: '72%'
      }
    });
  }

  updateComparisonStats(normalTime, priorityTime) {
    if (this.charts.travelTime && normalTime > 0 && priorityTime > 0) {
      const saved = Math.max(0, normalTime - priorityTime);
      this.charts.travelTime.data.datasets[0].data = [Math.round(saved), Math.round(priorityTime)];
      this.charts.travelTime.update();
    }
  }
}
