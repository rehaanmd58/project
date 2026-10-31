/**
 * ResQRoute 2D – Master Application Controller & Navigation Coordinator
 * Orchestrates navigation, UI bindings, simulation HUD, toasts, and subsystem lifecycle.
 */

import { SimulationCanvas } from '../simulation/canvas.js';
import { SimulationEngine } from '../simulation/simulation-engine.js';
import { RoutePlanner } from './route-planner.js';
import { ApiClient, SocketClient } from './api.js';
import { DashboardController } from './dashboard.js';
import { ConfigurationController } from './configuration.js';
import { AnalyticsManager } from './analytics.js';
import { ResultsController } from './results.js';

export class App {
  constructor() {
    this.currentView = 'dashboard';
    this.theme = 'night';

    // Subsystems
    this.apiClient = new ApiClient();
    this.socketClient = new SocketClient();
    this.routePlanner = new RoutePlanner();

    this.canvasManager = null;
    this.engine = null;
    this.dashboardCtrl = null;
    this.configCtrl = null;
    this.analyticsMgr = null;
    this.resultsCtrl = null;
  }

  init() {
    this.initSimulation();
    this.initControllers();
    this.initNavigation();
    this.initSimulationControls();
    this.initRoutePlannerPage();
    this.initLiveClock();
    this.initThemeToggle();

    // Default route setup
    const defaultCandidateRoutes = this.routePlanner.calculateRoutes(
      'A', 'D', 'ambulance', this.engine.vehicles, 'priority'
    );
    if (defaultCandidateRoutes.length > 0) {
      this.engine.setRouteWaypoints(defaultCandidateRoutes[0].waypoints, defaultCandidateRoutes[0]);
    }

    // Start with dashboard active
    this.navigateTo('dashboard');
    this.showToast('ResQRoute 2D Initialized. Ready for simulation.', 'info');
  }

  initSimulation() {
    const canvasEl = document.getElementById('city-canvas');
    if (canvasEl) {
      this.canvasManager = new SimulationCanvas(canvasEl);
      this.engine = new SimulationEngine(this.canvasManager);
      this.engine.setTheme(this.theme);

      // Listen for corridor priority alert
      this.engine.on('corridorStatusChange', (data) => {
        const alertEl = document.getElementById('corridor-priority-alert');
        if (alertEl) {
          if (data.active) {
            alertEl.classList.add('active');
            const alertText = document.getElementById('corridor-alert-text');
            if (alertText) {
              alertText.textContent = `EMERGENCY CORRIDOR ACTIVE – INTERSECTION ${data.intersectionId || 'NODE'}`;
            }
          } else {
            alertEl.classList.remove('active');
          }
        }
      });

      // Listen for emergency run completion
      this.engine.on('emergencyCompleted', (runData) => {
        this.showToast(`Emergency vehicle reached destination in ${runData.travelTime.toFixed(1)}s!`, 'success');
        if (this.resultsCtrl) {
          this.resultsCtrl.recordRunResult(runData.scenario, runData);
        }
        if (this.dashboardCtrl) {
          this.dashboardCtrl.loadRecentHistory();
        }
      });

      // Telemetry strip updates
      this.engine.on('metricsUpdate', (m) => {
        const setElem = (id, val) => {
          const el = document.getElementById(id);
          if (el) el.textContent = val;
        };
        setElem('hud-active-vehicles', m.totalVehicles);
        setElem('hud-avg-speed', `${Math.round(m.avgSpeed)} px/s`);
        setElem('hud-emergency-travel-time', `${m.emergencyTravelTime.toFixed(1)}s`);
        setElem('hud-emergency-stops', m.emergencyStops);
      });
    }
  }

  initControllers() {
    this.dashboardCtrl = new DashboardController(this.engine, this.apiClient, this);
    this.dashboardCtrl.init();

    this.configCtrl = new ConfigurationController(this.engine, this.routePlanner, this);
    this.configCtrl.init();

    this.analyticsMgr = new AnalyticsManager(this.engine);
    this.analyticsMgr.init();

    this.resultsCtrl = new ResultsController(this.apiClient);
    this.resultsCtrl.init();
  }

  initNavigation() {
    const navLinks = document.querySelectorAll('[data-nav-target]');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = link.getAttribute('data-nav-target');
        if (target) this.navigateTo(target);
      });
    });

    // Hash change routing support
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && ['dashboard', 'configuration', 'simulation', 'routes', 'analytics', 'results'].includes(hash)) {
        this.navigateTo(hash, false);
      }
    });

    // Check initial hash
    if (window.location.hash) {
      const initial = window.location.hash.replace('#', '');
      if (['dashboard', 'configuration', 'simulation', 'routes', 'analytics', 'results'].includes(initial)) {
        this.navigateTo(initial, false);
      }
    }
  }

  navigateTo(viewId, updateHash = true) {
    this.currentView = viewId;
    if (updateHash) {
      window.location.hash = viewId;
    }

    // Update active nav links
    const navLinks = document.querySelectorAll('[data-nav-target]');
    navLinks.forEach(link => {
      if (link.getAttribute('data-nav-target') === viewId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });

    // Show active page view
    const pageViews = document.querySelectorAll('.page-view');
    pageViews.forEach(view => {
      if (view.id === `view-${viewId}`) {
        view.classList.add('active');
      } else {
        view.classList.remove('active');
      }
    });

    // Update breadcrumb & topbar
    const breadcrumb = document.getElementById('topbar-page-name');
    if (breadcrumb) {
      const titles = {
        dashboard: 'Home Dashboard',
        configuration: 'Simulation Configuration',
        simulation: '2D City Simulation Environment',
        routes: 'Route Optimization & Planning',
        analytics: 'Traffic Analytics & Real-Time Charts',
        results: 'Simulation Scenario Results'
      };
      breadcrumb.textContent = titles[viewId] || 'Dashboard';
    }

    // Trigger canvas resize when entering simulation page
    if (viewId === 'simulation' && this.canvasManager) {
      setTimeout(() => this.canvasManager.resize(), 50);
    }

    // Trigger route refresh when entering routes page
    if (viewId === 'routes') {
      this.refreshRoutePlannerDisplay();
    }
  }

  initSimulationControls() {
    const startBtn = document.getElementById('btn-sim-start');
    const pauseBtn = document.getElementById('btn-sim-pause');
    const resetBtn = document.getElementById('btn-sim-reset');

    if (startBtn) {
      startBtn.addEventListener('click', () => {
        if (!this.engine.isRunning) {
          this.engine.start();
          this.showToast('Simulation started', 'info');
        } else if (this.engine.isPaused) {
          this.engine.resume();
          this.showToast('Simulation resumed', 'info');
        }
      });
    }

    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        this.engine.pause();
        this.showToast('Simulation paused', 'info');
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        this.engine.reset();
        this.showToast('Simulation reset', 'info');
      });
    }

    // Speed segmented buttons (1x, 2x, 3x)
    const hudSpeedBtns = document.querySelectorAll('[data-hud-speed]');
    hudSpeedBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        hudSpeedBtns.forEach(b => b.classList.remove('active'));
        const el = e.currentTarget;
        el.classList.add('active');
        const speed = parseInt(el.getAttribute('data-hud-speed'), 10) || 1;
        this.engine.setSpeed(speed);
      });
    });

    // Zoom and Center buttons
    const zoomInBtn = document.getElementById('btn-canvas-zoom-in');
    const zoomOutBtn = document.getElementById('btn-canvas-zoom-out');
    const resetViewBtn = document.getElementById('btn-canvas-reset-view');

    if (zoomInBtn) zoomInBtn.addEventListener('click', () => this.canvasManager?.zoomIn());
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', () => this.canvasManager?.zoomOut());
    if (resetViewBtn) resetViewBtn.addEventListener('click', () => this.canvasManager?.resetView());

    // Toggle: Show/Hide Emergency Route
    const toggleRoute = document.getElementById('chk-show-route');
    if (toggleRoute) {
      toggleRoute.addEventListener('change', (e) => {
        this.canvasManager?.setShowRoute(e.target.checked);
      });
    }

    // Toggle: Show/Hide Intersection Labels
    const toggleLabels = document.getElementById('chk-show-labels');
    if (toggleLabels) {
      toggleLabels.addEventListener('change', (e) => {
        this.canvasManager?.setShowLabels(e.target.checked);
      });
    }

    // Toggle: Enable/Disable Normal Vehicles
    const toggleNormalVehicles = document.getElementById('chk-normal-vehicles');
    if (toggleNormalVehicles) {
      toggleNormalVehicles.addEventListener('change', (e) => {
        this.engine?.setNormalVehiclesEnabled(e.target.checked);
      });
    }
  }

  initRoutePlannerPage() {
    const routeStartSelect = document.getElementById('routes-start-node');
    const routeDestSelect = document.getElementById('routes-dest-node');
    const routeVehicleSelect = document.getElementById('routes-vehicle-type');
    const calculateBtn = document.getElementById('btn-calculate-routes');

    const runCalculation = () => {
      if (!routeStartSelect || !routeDestSelect) return;
      const start = routeStartSelect.value;
      const dest = routeDestSelect.value;
      const vehicle = routeVehicleSelect ? routeVehicleSelect.value : 'ambulance';

      if (start === dest) {
        this.showToast('Start and destination intersections must be different', 'warning');
        return;
      }

      const candidateRoutes = this.routePlanner.calculateRoutes(
        start, dest, vehicle, this.engine.vehicles, this.engine.config.scenario
      );

      this.renderRouteCards(candidateRoutes);
    };

    if (calculateBtn) calculateBtn.addEventListener('click', runCalculation);
    if (routeStartSelect) routeStartSelect.addEventListener('change', runCalculation);
    if (routeDestSelect) routeDestSelect.addEventListener('change', runCalculation);
    if (routeVehicleSelect) routeVehicleSelect.addEventListener('change', runCalculation);
  }

  refreshRoutePlannerDisplay() {
    const routeStartSelect = document.getElementById('routes-start-node');
    const routeDestSelect = document.getElementById('routes-dest-node');
    const routeVehicleSelect = document.getElementById('routes-vehicle-type');

    if (routeStartSelect && routeDestSelect) {
      routeStartSelect.value = this.engine.config.startIntersection || 'A';
      routeDestSelect.value = this.engine.config.destIntersection || 'D';
      if (routeVehicleSelect) routeVehicleSelect.value = this.engine.config.emergencyVehicleType || 'ambulance';

      const candidateRoutes = this.routePlanner.calculateRoutes(
        routeStartSelect.value,
        routeDestSelect.value,
        routeVehicleSelect ? routeVehicleSelect.value : 'ambulance',
        this.engine.vehicles,
        this.engine.config.scenario
      );

      this.renderRouteCards(candidateRoutes);
    }
  }

  renderRouteCards(routes) {
    const container = document.getElementById('routes-cards-container');
    if (!container) return;

    container.innerHTML = '';
    if (routes.length === 0) {
      container.innerHTML = '<div class="card" style="padding: 20px; color: var(--text-muted);">No routes available for identical points.</div>';
      return;
    }

    routes.forEach((route, idx) => {
      const card = document.createElement('div');
      card.className = `card route-option-card ${route.isRecommended ? 'recommended' : ''}`;
      card.style.cssText = `
        border: ${route.isRecommended ? '1.5px solid #10b981' : '1px solid var(--border-subtle)'};
        cursor: pointer;
        position: relative;
        margin-bottom: 12px;
      `;

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
          <div>
            <div style="font-weight: 700; font-size: 15px; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
              ${route.name}
              ${route.isRecommended ? '<span style="font-size: 10px; font-weight: 700; text-transform: uppercase; background: rgba(16, 185, 129, 0.2); color: #34d399; padding: 2px 8px; border-radius: 4px; border: 1px solid rgba(16, 185, 129, 0.4);">Recommended</span>' : ''}
            </div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
              Corridor Path: ${route.nodes.join(' → ')}
            </div>
          </div>
          <button class="btn btn-sm ${route.isRecommended ? 'btn-primary' : 'btn-secondary'} select-route-btn">
            Select Corridor
          </button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 10px; padding: 12px; background: var(--bg-tertiary); border-radius: 8px;">
          <div>
            <div style="font-size: 11px; color: var(--text-muted);">Distance</div>
            <div style="font-size: 14px; font-weight: 700; font-family: var(--font-mono); color: var(--text-primary);">${route.distance} m</div>
          </div>
          <div>
            <div style="font-size: 11px; color: var(--text-muted);">Est. Travel Time</div>
            <div style="font-size: 14px; font-weight: 700; font-family: var(--font-mono); color: var(--accent-cyan);">${route.estimatedTravelTime} s</div>
          </div>
          <div>
            <div style="font-size: 11px; color: var(--text-muted);">Traffic Density</div>
            <div style="font-size: 14px; font-weight: 700; font-family: var(--font-mono); color: ${route.trafficDensity > 60 ? '#f87171' : '#34d399'};">${route.trafficDensity}%</div>
          </div>
          <div>
            <div style="font-size: 11px; color: var(--text-muted);">Intersections</div>
            <div style="font-size: 14px; font-weight: 700; font-family: var(--font-mono); color: var(--text-primary);">${route.intersectionsCount}</div>
          </div>
          <div>
            <div style="font-size: 11px; color: var(--text-muted);">Est. Signal Delay</div>
            <div style="font-size: 14px; font-weight: 700; font-family: var(--font-mono); color: var(--text-primary);">${route.estimatedWaitTime} s</div>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        this.engine.setRouteWaypoints(route.waypoints, route);
        this.showToast(`Selected: ${route.name}`, 'info');
        this.navigateTo('simulation');
      });

      container.appendChild(card);
    });
  }

  initLiveClock() {
    const clockEl = document.getElementById('live-control-clock');
    if (!clockEl) return;

    const updateClock = () => {
      const now = new Date();
      clockEl.textContent = now.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };
    updateClock();
    setInterval(updateClock, 1000);
  }

  initThemeToggle() {
    const themeToggleBtn = document.getElementById('btn-toggle-theme');
    if (!themeToggleBtn) return;

    themeToggleBtn.addEventListener('click', () => {
      this.theme = this.theme === 'night' ? 'day' : 'night';
      document.documentElement.setAttribute('data-theme', this.theme);
      this.engine?.setTheme(this.theme);

      const label = document.getElementById('theme-toggle-label');
      if (label) {
        label.textContent = this.theme === 'night' ? 'Night View' : 'Day View';
      }
      this.showToast(`Switched to ${this.theme === 'night' ? 'Night View' : 'Day View'}`, 'info');
    });
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type === 'danger' ? 'danger' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'info'}`;
    toast.innerHTML = `
      <div style="font-weight: 500;">${message}</div>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }
}
