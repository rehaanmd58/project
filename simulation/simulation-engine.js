/**
 * ResQRoute 2D – Core Simulation Engine
 * Orchestrates physical simulation loop, vehicle generation, priority corridors, and real-time metrics.
 */

import { City, CITY_CONFIG } from './city.js';
import { RoadNetwork } from './roads.js';
import { IntersectionManager } from './intersections.js';
import { TrafficLightSystem } from './traffic-lights.js';
import { Vehicle, VEHICLE_CONFIGS } from './vehicles.js';
import { VehicleMovementController } from './vehicle-movement.js';
import { EmergencyPrioritySystem } from './emergency-system.js';
import { ConflictDetector } from './conflict-detection.js';

export class SimulationEngine {
  constructor(canvasManager) {
    this.canvasManager = canvasManager;

    // Simulation subsystems
    this.city = new City();
    this.roads = new RoadNetwork();
    this.intersections = new IntersectionManager();
    this.trafficLights = new TrafficLightSystem(CITY_CONFIG.intersections);
    this.movementController = new VehicleMovementController(this.intersections, this.trafficLights);
    this.emergencySystem = new EmergencyPrioritySystem(this.intersections, this.trafficLights);
    this.conflictDetector = new ConflictDetector(this.intersections);

    // State
    this.isRunning = false;
    this.isPaused = false;
    this.simSpeed = 1; // 1x, 2x, 3x
    this.theme = 'night';

    // Vehicles
    this.vehicles = [];
    this.emergencyVehicle = null;
    this.targetVehicleCount = 20;
    this.normalVehiclesEnabled = true;

    // Configuration settings
    this.config = {
      emergencyVehicleType: 'ambulance',
      startIntersection: 'A',
      destIntersection: 'D',
      trafficDensity: 'medium',
      numNormalVehicles: 20,
      simSpeed: 1,
      scenario: 'priority' // 'priority' or 'normal'
    };

    // Active Route Waypoints for Emergency Vehicle
    this.currentRouteWaypoints = [];
    this.currentRouteSummary = null;

    // Metrics & History
    this.metrics = {
      totalVehicles: 0,
      normalVehicles: 0,
      emergencyVehicles: 0,
      avgSpeed: 0,
      avgWaitTime: 0,
      trafficDensityPercent: 45,
      activeIntersections: 4,
      conflictsDetected: 0,
      emergencyTravelTime: 0,
      emergencyWaitTime: 0,
      emergencyStops: 0,
      isEmergencyCompleted: false
    };

    this.lastFrameTime = performance.now();
    this.animationFrameId = null;

    // Event listeners
    this.listeners = {
      metricsUpdate: [],
      emergencyCompleted: [],
      corridorStatusChange: []
    };

    this.emergencySystem.onCorridorActivated = (info) => {
      this.emit('corridorStatusChange', { active: true, ...info });
    };

    this.emergencySystem.onCorridorCleared = (info) => {
      this.emit('corridorStatusChange', { active: false, ...info });
    };

    this.init();
  }

  init() {
    this.applyTheme(this.theme);
    this.generateNormalVehicles(this.targetVehicleCount);
  }

  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }

  setTheme(theme) {
    this.theme = theme;
    this.applyTheme(theme);
  }

  applyTheme(theme) {
    this.city.setTheme(theme);
    this.roads.setTheme(theme);
    if (this.canvasManager) this.canvasManager.setTheme(theme);
  }

  setSpeed(speedMultiplier) {
    this.simSpeed = Math.max(1, Math.min(3, speedMultiplier));
    this.config.simSpeed = this.simSpeed;
  }

  setScenario(scenario) {
    this.config.scenario = scenario;
    this.emergencySystem.setScenario(scenario);
  }

  setNormalVehiclesEnabled(enabled) {
    this.normalVehiclesEnabled = enabled;
    if (!enabled) {
      // Keep only emergency vehicle
      this.vehicles = this.emergencyVehicle ? [this.emergencyVehicle] : [];
    } else {
      this.generateNormalVehicles(this.config.numNormalVehicles);
    }
  }

  configure(newConfig) {
    Object.assign(this.config, newConfig);
    this.setSpeed(this.config.simSpeed);
    this.setScenario(this.config.scenario);
    this.targetVehicleCount = this.config.numNormalVehicles;
    if (this.normalVehiclesEnabled) {
      this.generateNormalVehicles(this.targetVehicleCount);
    }
  }

  start() {
    this.isRunning = true;
    this.isPaused = false;
    this.spawnEmergencyVehicle();
    this.lastFrameTime = performance.now();
    this.loop();
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    if (!this.isRunning) {
      this.start();
    } else {
      this.isPaused = false;
      this.lastFrameTime = performance.now();
      this.loop();
    }
  }

  reset() {
    this.isRunning = false;
    this.isPaused = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.emergencySystem.clearAllPriorities();
    this.conflictDetector.reset();
    this.emergencyVehicle = null;
    this.vehicles = [];

    this.metrics.emergencyTravelTime = 0;
    this.metrics.emergencyWaitTime = 0;
    this.metrics.emergencyStops = 0;
    this.metrics.isEmergencyCompleted = false;

    this.generateNormalVehicles(this.config.numNormalVehicles);
    this.render();
    this.emit('corridorStatusChange', { active: false });
  }

  loop() {
    if (!this.isRunning || this.isPaused) return;

    const now = performance.now();
    let dt = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    // Cap delta time to prevent physics tunneling
    if (dt > 0.1) dt = 0.1;

    this.update(dt);
    this.render();

    this.animationFrameId = requestAnimationFrame(() => this.loop());
  }

  update(dt) {
    // 1. Update Traffic Signals
    this.trafficLights.update(dt * this.simSpeed);

    // 2. Emergency Corridor Priority Updates
    const emergencyList = this.emergencyVehicle && !this.emergencyVehicle.isCompleted ? [this.emergencyVehicle] : [];
    this.emergencySystem.update(emergencyList);

    // 3. Move vehicles and avoid collisions
    this.movementController.updateVehicles(this.vehicles, dt, this.simSpeed);

    // 4. Detect traffic conflicts
    this.conflictDetector.detectConflicts(this.vehicles, dt * this.simSpeed);

    // 5. Cleanup completed normal vehicles and respawn
    this.vehicles = this.vehicles.filter(v => {
      if (v.isEmergency) return true; // keep emergency vehicle
      return !v.isCompleted;
    });

    if (this.normalVehiclesEnabled && this.vehicles.length < this.targetVehicleCount) {
      this.spawnSingleNormalVehicle();
    }

    // 6. Check emergency vehicle completion
    if (this.emergencyVehicle) {
      this.metrics.emergencyTravelTime = this.emergencyVehicle.travelTime;
      this.metrics.emergencyWaitTime = this.emergencyVehicle.waitTime;
      this.metrics.emergencyStops = this.emergencyVehicle.stopCount;

      if (this.emergencyVehicle.isCompleted && !this.metrics.isEmergencyCompleted) {
        this.metrics.isEmergencyCompleted = true;
        this.emergencySystem.clearAllPriorities();
        this.emit('corridorStatusChange', { active: false });
        this.emit('emergencyCompleted', {
          travelTime: this.emergencyVehicle.travelTime,
          waitTime: this.emergencyVehicle.waitTime,
          stopCount: this.emergencyVehicle.stopCount,
          scenario: this.config.scenario
        });
      }
    }

    // 7. Calculate aggregate simulation metrics
    this.computeMetrics();
  }

  computeMetrics() {
    const total = this.vehicles.length;
    let sumSpeed = 0;
    let sumWait = 0;

    this.vehicles.forEach(v => {
      sumSpeed += v.speed;
      sumWait += v.waitTime;
    });

    const activeEmergency = this.emergencyVehicle && !this.emergencyVehicle.isCompleted ? 1 : 0;
    const normalCount = Math.max(0, total - activeEmergency);

    this.metrics.totalVehicles = total;
    this.metrics.normalVehicles = normalCount;
    this.metrics.emergencyVehicles = activeEmergency;
    this.metrics.avgSpeed = total > 0 ? (sumSpeed / total) : 0;
    this.metrics.avgWaitTime = total > 0 ? (sumWait / total) : 0;
    this.metrics.conflictsDetected = this.conflictDetector.totalConflictsDetected;
    this.metrics.trafficDensityPercent = Math.min(100, Math.round((total / 50) * 100));

    this.emit('metricsUpdate', { ...this.metrics });
  }

  render() {
    if (!this.canvasManager) return;

    this.canvasManager.render({
      city: (ctx) => this.city.render(ctx),
      roads: (ctx) => this.roads.render(ctx),
      route: (ctx) => this.renderRouteCorridor(ctx),
      trafficLights: (ctx) => this.trafficLights.render(ctx),
      vehicles: (ctx) => {
        const isNight = this.theme === 'night';
        this.vehicles.forEach(v => v.render(ctx, isNight));
      },
      intersections: (ctx, showLabels) => this.intersections.render(ctx, showLabels),
      conflicts: (ctx) => this.conflictDetector.render(ctx)
    });
  }

  renderRouteCorridor(ctx) {
    if (!this.currentRouteWaypoints || this.currentRouteWaypoints.length < 2) return;

    ctx.save();
    // Glowing emergency corridor path
    ctx.strokeStyle = this.config.scenario === 'priority' ? 'rgba(16, 185, 129, 0.45)' : 'rgba(59, 130, 246, 0.45)';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(this.currentRouteWaypoints[0].x, this.currentRouteWaypoints[0].y);
    for (let i = 1; i < this.currentRouteWaypoints.length; i++) {
      ctx.lineTo(this.currentRouteWaypoints[i].x, this.currentRouteWaypoints[i].y);
    }
    ctx.stroke();

    // Central dashed line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([8, 8]);
    ctx.stroke();
    ctx.restore();
  }

  setRouteWaypoints(waypoints, summary = null) {
    this.currentRouteWaypoints = waypoints;
    this.currentRouteSummary = summary;
  }

  spawnEmergencyVehicle() {
    if (!this.currentRouteWaypoints || this.currentRouteWaypoints.length < 2) return;

    const startPt = this.currentRouteWaypoints[0];
    const nextPt = this.currentRouteWaypoints[1];
    const initialAngle = Math.atan2(nextPt.y - startPt.y, nextPt.x - startPt.x);

    this.emergencyVehicle = new Vehicle({
      id: 'emergency_' + Date.now(),
      type: this.config.emergencyVehicleType || 'ambulance',
      x: startPt.x,
      y: startPt.y,
      angle: initialAngle,
      route: [...this.currentRouteWaypoints],
      speed: 0
    });

    // Remove any previous emergency vehicle and prepend new one
    this.vehicles = this.vehicles.filter(v => !v.isEmergency);
    this.vehicles.unshift(this.emergencyVehicle);

    this.metrics.isEmergencyCompleted = false;
  }

  generateNormalVehicles(count) {
    this.vehicles = this.emergencyVehicle ? [this.emergencyVehicle] : [];
    for (let i = 0; i < count; i++) {
      this.spawnSingleNormalVehicle(true);
    }
  }

  spawnSingleNormalVehicle(scatterInitial = false) {
    const types = ['car', 'car', 'car', 'bus', 'motorcycle'];
    const type = types[Math.floor(Math.random() * types.length)];

    // Pick one of 8 realistic city ingress-to-egress transit paths
    const paths = this.getStandardCityPaths();
    const chosenPath = paths[Math.floor(Math.random() * paths.length)];

    let startX = chosenPath[0].x;
    let startY = chosenPath[0].y;
    let routeIndex = 0;

    if (scatterInitial) {
      // Scatter vehicles along path so city is active immediately
      const segmentIndex = Math.floor(Math.random() * (chosenPath.length - 1));
      const p1 = chosenPath[segmentIndex];
      const p2 = chosenPath[segmentIndex + 1];
      const ratio = Math.random();
      startX = p1.x + (p2.x - p1.x) * ratio;
      startY = p1.y + (p2.y - p1.y) * ratio;
      routeIndex = segmentIndex + 1;
    }

    const nextTarget = chosenPath[Math.min(routeIndex, chosenPath.length - 1)];
    const angle = Math.atan2(nextTarget.y - startY, nextTarget.x - startX);

    const veh = new Vehicle({
      type,
      x: startX,
      y: startY,
      angle,
      route: chosenPath,
      speed: 35 + Math.random() * 25
    });
    veh.routeIndex = routeIndex;

    this.vehicles.push(veh);
  }

  getStandardCityPaths() {
    const lo = CITY_CONFIG.laneOffset; // 16
    const xA = 240, xB = 680, yTop = 200, yBottom = 540;

    return [
      // 1. West-to-East Top Corridor (Through A -> B)
      [
        { x: 0, y: yTop + lo },
        { x: xA - 40, y: yTop + lo, intersectionId: 'A', approach: 'west' },
        { x: xA + 40, y: yTop + lo },
        { x: xB - 40, y: yTop + lo, intersectionId: 'B', approach: 'west' },
        { x: 920, y: yTop + lo }
      ],
      // 2. East-to-West Top Corridor (Through B -> A)
      [
        { x: 920, y: yTop - lo },
        { x: xB + 40, y: yTop - lo, intersectionId: 'B', approach: 'east' },
        { x: xB - 40, y: yTop - lo },
        { x: xA + 40, y: yTop - lo, intersectionId: 'A', approach: 'east' },
        { x: 0, y: yTop - lo }
      ],
      // 3. West-to-East Bottom Corridor (Through C -> D)
      [
        { x: 0, y: yBottom + lo },
        { x: xA - 40, y: yBottom + lo, intersectionId: 'C', approach: 'west' },
        { x: xA + 40, y: yBottom + lo },
        { x: xB - 40, y: yBottom + lo, intersectionId: 'D', approach: 'west' },
        { x: 920, y: yBottom + lo }
      ],
      // 4. East-to-West Bottom Corridor (Through D -> C)
      [
        { x: 920, y: yBottom - lo },
        { x: xB + 40, y: yBottom - lo, intersectionId: 'D', approach: 'east' },
        { x: xB - 40, y: yBottom - lo },
        { x: xA + 40, y: yBottom - lo, intersectionId: 'C', approach: 'east' },
        { x: 0, y: yBottom - lo }
      ],
      // 5. North-to-South Left Corridor (Through A -> C)
      [
        { x: xA - lo, y: 0 },
        { x: xA - lo, y: yTop - 40, intersectionId: 'A', approach: 'north' },
        { x: xA - lo, y: yTop + 40 },
        { x: xA - lo, y: yBottom - 40, intersectionId: 'C', approach: 'north' },
        { x: xA - lo, y: 740 }
      ],
      // 6. South-to-North Left Corridor (Through C -> A)
      [
        { x: xA + lo, y: 740 },
        { x: xA + lo, y: yBottom + 40, intersectionId: 'C', approach: 'south' },
        { x: xA + lo, y: yBottom - 40 },
        { x: xA + lo, y: yTop + 40, intersectionId: 'A', approach: 'south' },
        { x: xA + lo, y: 0 }
      ],
      // 7. North-to-South Right Corridor (Through B -> D)
      [
        { x: xB - lo, y: 0 },
        { x: xB - lo, y: yTop - 40, intersectionId: 'B', approach: 'north' },
        { x: xB - lo, y: yTop + 40 },
        { x: xB - lo, y: yBottom - 40, intersectionId: 'D', approach: 'north' },
        { x: xB - lo, y: 740 }
      ],
      // 8. South-to-North Right Corridor (Through D -> B)
      [
        { x: xB + lo, y: 740 },
        { x: xB + lo, y: yBottom + 40, intersectionId: 'D', approach: 'south' },
        { x: xB + lo, y: yBottom - 40 },
        { x: xB + lo, y: yTop + 40, intersectionId: 'B', approach: 'south' },
        { x: xB + lo, y: 0 }
      ]
    ];
  }
}
