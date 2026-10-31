/**
 * ResQRoute 2D – Home Dashboard Controller
 * Manages Home Dashboard KPIs, traffic overview cards, recent run history, and live mini canvas preview.
 */

export class DashboardController {
  constructor(engine, apiClient, appNavigator) {
    this.engine = engine;
    this.apiClient = apiClient;
    this.appNavigator = appNavigator;

    this.miniCanvas = null;
    this.miniCtx = null;
  }

  async init() {
    this.setupMiniPreview();
    this.bindActions();
    this.loadRecentHistory();

    // Listen to engine metrics to update Home Dashboard tiles
    if (this.engine) {
      this.engine.on('metricsUpdate', (m) => this.updateHomeMetrics(m));
    }
  }

  bindActions() {
    const quickStartBtn = document.getElementById('btn-dashboard-start-sim');
    if (quickStartBtn) {
      quickStartBtn.addEventListener('click', () => {
        if (this.appNavigator) this.appNavigator.navigateTo('configuration');
      });
    }

    const viewSimulationBtn = document.getElementById('btn-dashboard-view-sim');
    if (viewSimulationBtn) {
      viewSimulationBtn.addEventListener('click', () => {
        if (this.appNavigator) this.appNavigator.navigateTo('simulation');
      });
    }
  }

  updateHomeMetrics(m) {
    const setElem = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setElem('kpi-total-vehicles', m.totalVehicles);
    setElem('kpi-emergency-vehicles', m.emergencyVehicles);
    setElem('kpi-active-intersections', m.activeIntersections);
    setElem('kpi-traffic-density', `${m.trafficDensityPercent}%`);
    setElem('kpi-avg-speed', `${Math.round(m.avgSpeed)} px/s`);
  }

  async loadRecentHistory() {
    const tableBody = document.getElementById('dashboard-history-tbody');
    if (!tableBody) return;

    const data = await this.apiClient.getSimulations();
    const runs = data.simulations || [];

    tableBody.innerHTML = '';
    runs.slice(0, 5).forEach(run => {
      const tr = document.createElement('tr');
      const timeFormatted = new Date(run.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const isPriority = run.scenario === 'priority';

      tr.innerHTML = `
        <td class="tabular-nums">${run.id}</td>
        <td>${timeFormatted}</td>
        <td style="text-transform: capitalize;">${run.vehicleType.replace('_', ' ')}</td>
        <td>Intersection ${run.start} → ${run.dest}</td>
        <td>
          <span class="status-badge ${isPriority ? 'green' : 'amber'}">
            ${isPriority ? 'Corridor Priority' : 'Normal Cycle'}
          </span>
        </td>
        <td class="tabular-nums">${run.travelTime ? run.travelTime.toFixed(1) + 's' : '—'}</td>
        <td class="tabular-nums">${run.stops !== undefined ? run.stops : 0}</td>
      `;
      tableBody.appendChild(tr);
    });
  }

  setupMiniPreview() {
    this.miniCanvas = document.getElementById('mini-preview-canvas');
    if (!this.miniCanvas) return;

    this.miniCtx = this.miniCanvas.getContext('2d');
    this.renderMiniPreview();
  }

  renderMiniPreview() {
    if (!this.miniCanvas || !this.engine) return;

    const rect = this.miniCanvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      this.miniCanvas.width = rect.width;
      this.miniCanvas.height = rect.height;

      const ctx = this.miniCtx;
      ctx.save();
      const scaleX = rect.width / this.engine.city.width;
      const scaleY = rect.height / this.engine.city.height;
      const scale = Math.min(scaleX, scaleY);

      ctx.scale(scale, scale);
      this.engine.city.render(ctx);
      this.engine.roads.render(ctx);
      this.engine.trafficLights.render(ctx);
      this.engine.vehicles.forEach(v => v.render(ctx, true));
      this.engine.intersections.render(ctx, true);
      ctx.restore();
    }

    // Mini preview animation update
    requestAnimationFrame(() => this.renderMiniPreview());
  }
}
