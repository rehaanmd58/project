/**
 * ResQRoute 2D – API & Socket.IO Integration Layer
 * Connects to future Express.js / Node backend with automatic local demo data fallback.
 */

export class ApiClient {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
    this.isBackendConnected = false;
    this.demoStorageKey = 'resqroute_demo_simulations';
    this.initDemoStorage();
    this.checkBackendHealth();
  }

  initDemoStorage() {
    if (!localStorage.getItem(this.demoStorageKey)) {
      const initialRuns = [
        {
          id: 'sim_1001',
          timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
          vehicleType: 'ambulance',
          start: 'A',
          dest: 'D',
          scenario: 'priority',
          travelTime: 23.4,
          waitTime: 1.8,
          stops: 0,
          conflicts: 0
        },
        {
          id: 'sim_1002',
          timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
          vehicleType: 'fire_engine',
          start: 'B',
          dest: 'C',
          scenario: 'normal',
          travelTime: 46.2,
          waitTime: 16.5,
          stops: 2,
          conflicts: 3
        },
        {
          id: 'sim_1003',
          timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
          vehicleType: 'police',
          start: 'A',
          dest: 'B',
          scenario: 'priority',
          travelTime: 14.1,
          waitTime: 0.5,
          stops: 0,
          conflicts: 0
        }
      ];
      localStorage.setItem(this.demoStorageKey, JSON.stringify(initialRuns));
    }
  }

  async checkBackendHealth() {
    try {
      const res = await fetch(`${this.baseUrl}/api/traffic/status`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(1500)
      });
      if (res.ok) {
        this.isBackendConnected = true;
      } else {
        this.isBackendConnected = false;
      }
    } catch {
      this.isBackendConnected = false;
    }
    return this.isBackendConnected;
  }

  // GET /api/vehicles
  async getVehicles() {
    if (this.isBackendConnected) {
      try {
        const res = await fetch(`${this.baseUrl}/api/vehicles`);
        return await res.json();
      } catch {
        // fallback
      }
    }
    // Local demo data
    return {
      source: 'local_demo',
      vehicles: [
        { id: 'veh_demo_1', type: 'car', speed: 65, active: true },
        { id: 'veh_demo_2', type: 'bus', speed: 45, active: true },
        { id: 'veh_demo_3', type: 'ambulance', speed: 92, active: true }
      ]
    };
  }

  // POST /api/vehicles
  async createVehicle(vehicleData) {
    if (this.isBackendConnected) {
      try {
        const res = await fetch(`${this.baseUrl}/api/vehicles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(vehicleData)
        });
        return await res.json();
      } catch {
        // fallback
      }
    }
    return {
      source: 'local_demo',
      success: true,
      vehicle: { id: 'veh_' + Date.now(), ...vehicleData }
    };
  }

  // POST /api/simulations
  async saveSimulation(simData) {
    const record = {
      id: 'sim_' + Date.now(),
      timestamp: new Date().toISOString(),
      ...simData
    };

    if (this.isBackendConnected) {
      try {
        const res = await fetch(`${this.baseUrl}/api/simulations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record)
        });
        return await res.json();
      } catch {
        // fallback to local demo
      }
    }

    // Save to local demo storage
    const list = JSON.parse(localStorage.getItem(this.demoStorageKey) || '[]');
    list.unshift(record);
    localStorage.setItem(this.demoStorageKey, JSON.stringify(list.slice(0, 20)));

    return {
      source: 'local_demo',
      success: true,
      simulation: record
    };
  }

  // GET /api/simulations
  async getSimulations() {
    if (this.isBackendConnected) {
      try {
        const res = await fetch(`${this.baseUrl}/api/simulations`);
        return await res.json();
      } catch {
        // fallback
      }
    }
    const list = JSON.parse(localStorage.getItem(this.demoStorageKey) || '[]');
    return {
      source: 'local_demo',
      simulations: list
    };
  }

  // GET /api/simulations/:id
  async getSimulationById(id) {
    if (this.isBackendConnected) {
      try {
        const res = await fetch(`${this.baseUrl}/api/simulations/${id}`);
        return await res.json();
      } catch {
        // fallback
      }
    }
    const list = JSON.parse(localStorage.getItem(this.demoStorageKey) || '[]');
    const item = list.find(s => s.id === id);
    return {
      source: 'local_demo',
      simulation: item || null
    };
  }

  // POST /api/routes/compare
  async compareRoutes(compareData) {
    if (this.isBackendConnected) {
      try {
        const res = await fetch(`${this.baseUrl}/api/routes/compare`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(compareData)
        });
        return await res.json();
      } catch {
        // fallback
      }
    }
    return {
      source: 'local_demo',
      comparison: {
        normalTravelTime: compareData.normalTravelTime || 48.0,
        priorityTravelTime: compareData.priorityTravelTime || 24.5,
        timeSaved: (compareData.normalTravelTime || 48.0) - (compareData.priorityTravelTime || 24.5),
        improvementPercent: Math.round((((compareData.normalTravelTime || 48.0) - (compareData.priorityTravelTime || 24.5)) / (compareData.normalTravelTime || 48.0)) * 100)
      }
    };
  }

  // GET /api/traffic/status
  async getTrafficStatus() {
    if (this.isBackendConnected) {
      try {
        const res = await fetch(`${this.baseUrl}/api/traffic/status`);
        return await res.json();
      } catch {
        // fallback
      }
    }
    return {
      source: 'local_demo',
      status: 'Active',
      intersections: {
        A: { status: 'Optimal', queueLength: 3 },
        B: { status: 'Moderate', queueLength: 5 },
        C: { status: 'Optimal', queueLength: 2 },
        D: { status: 'Heavy', queueLength: 7 }
      }
    };
  }

  // GET /api/analytics/:id
  async getAnalytics(id) {
    if (this.isBackendConnected) {
      try {
        const res = await fetch(`${this.baseUrl}/api/analytics/${id}`);
        return await res.json();
      } catch {
        // fallback
      }
    }
    return {
      source: 'local_demo',
      id,
      timestamp: new Date().toISOString(),
      summary: 'Simulation analytics loaded from local engine data'
    };
  }
}

/**
 * Socket.IO Client Wrapper
 * Supports real socket.io instance or falls back gracefully to internal event emitter.
 */
export class SocketClient {
  constructor(baseUrl = '') {
    this.handlers = new Map();
    this.connected = false;

    // Check if external Socket.IO client library exists on window
    if (typeof window !== 'undefined' && window.io) {
      try {
        this.socket = window.io(baseUrl, { autoConnect: false, timeout: 2000 });
        this.socket.connect();
        this.socket.on('connect', () => {
          this.connected = true;
        });
        this.socket.on('disconnect', () => {
          this.connected = false;
        });
      } catch {
        this.socket = null;
      }
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event).push(callback);
  }

  emit(event, data) {
    if (this.socket && this.connected) {
      this.socket.emit(event, data);
    }
    // Also dispatch to local listeners
    const list = this.handlers.get(event);
    if (list) {
      list.forEach(cb => cb(data));
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
    const list = this.handlers.get(event);
    if (list) {
      this.handlers.set(event, list.filter(cb => cb !== callback));
    }
  }
}
