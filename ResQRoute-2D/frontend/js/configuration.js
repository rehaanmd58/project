/**
 * ResQRoute 2D – Simulation Configuration Controller
 * Handles configuration form inputs, validation (Start != Dest), preset synchronization, and launch.
 */

export class ConfigurationController {
  constructor(engine, routePlanner, appNavigator) {
    this.engine = engine;
    this.routePlanner = routePlanner;
    this.appNavigator = appNavigator;

    this.state = {
      vehicleType: 'ambulance',
      startIntersection: 'A',
      destIntersection: 'D',
      trafficDensity: 'medium',
      numNormalVehicles: 20,
      simSpeed: 1,
      scenario: 'priority'
    };
  }

  init() {
    this.bindInputs();
    this.validate();
  }

  bindInputs() {
    // Vehicle selection buttons
    const vehicleBtns = document.querySelectorAll('[data-config-vehicle]');
    vehicleBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        vehicleBtns.forEach(b => b.classList.remove('active'));
        const el = e.currentTarget;
        el.classList.add('active');
        this.state.vehicleType = el.getAttribute('data-config-vehicle');
        this.updateVehiclePreview();
      });
    });

    // Start Intersection
    const startSelect = document.getElementById('config-start-node');
    if (startSelect) {
      startSelect.value = this.state.startIntersection;
      startSelect.addEventListener('change', (e) => {
        this.state.startIntersection = e.target.value;
        this.validate();
      });
    }

    // Destination Intersection
    const destSelect = document.getElementById('config-dest-node');
    if (destSelect) {
      destSelect.value = this.state.destIntersection;
      destSelect.addEventListener('change', (e) => {
        this.state.destIntersection = e.target.value;
        this.validate();
      });
    }

    // Density segmented buttons
    const densityBtns = document.querySelectorAll('[data-config-density]');
    const vehicleSlider = document.getElementById('config-num-vehicles');
    const vehicleSliderVal = document.getElementById('config-vehicles-val');

    densityBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        densityBtns.forEach(b => b.classList.remove('active'));
        const el = e.currentTarget;
        el.classList.add('active');
        const density = el.getAttribute('data-config-density');
        this.state.trafficDensity = density;

        // Auto sync vehicle count slider with density preset
        let count = 20;
        if (density === 'low') count = 10;
        else if (density === 'medium') count = 25;
        else if (density === 'high') count = 45;

        this.state.numNormalVehicles = count;
        if (vehicleSlider) vehicleSlider.value = count;
        if (vehicleSliderVal) vehicleSliderVal.textContent = count;
      });
    });

    // Normal vehicles slider (5 to 50)
    if (vehicleSlider) {
      vehicleSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.state.numNormalVehicles = val;
        if (vehicleSliderVal) vehicleSliderVal.textContent = val;
      });
    }

    // Simulation Speed (1x, 2x, 3x)
    const speedBtns = document.querySelectorAll('[data-config-speed]');
    speedBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        speedBtns.forEach(b => b.classList.remove('active'));
        const el = e.currentTarget;
        el.classList.add('active');
        this.state.simSpeed = parseInt(el.getAttribute('data-config-speed'), 10) || 1;
      });
    });

    // Scenario (Normal Traffic vs Emergency Priority)
    const scenarioInputs = document.querySelectorAll('input[name="config-scenario"]');
    scenarioInputs.forEach(input => {
      input.addEventListener('change', (e) => {
        this.state.scenario = e.target.value;
      });
    });

    // Start Simulation Button
    const startBtn = document.getElementById('btn-config-start-sim');
    if (startBtn) {
      startBtn.addEventListener('click', () => this.handleStartSimulation());
    }
  }

  validate() {
    const errorBox = document.getElementById('config-validation-error');
    const startBtn = document.getElementById('btn-config-start-sim');

    const isValid = this.state.startIntersection !== this.state.destIntersection;

    if (!isValid) {
      if (errorBox) {
        errorBox.textContent = 'Starting intersection and destination must be different.';
        errorBox.style.display = 'block';
      }
      if (startBtn) startBtn.disabled = true;
    } else {
      if (errorBox) errorBox.style.display = 'none';
      if (startBtn) startBtn.disabled = false;
    }

    return isValid;
  }

  updateVehiclePreview() {
    const previewName = document.getElementById('config-preview-vehicle-name');
    const previewDesc = document.getElementById('config-preview-vehicle-desc');
    const previewSpeed = document.getElementById('config-preview-vehicle-speed');

    const type = this.state.vehicleType;
    if (type === 'ambulance') {
      if (previewName) previewName.textContent = 'Rapid Response Ambulance';
      if (previewDesc) previewDesc.textContent = 'High acceleration emergency medical unit with priority siren.';
      if (previewSpeed) previewSpeed.textContent = '95 px/s';
    } else if (type === 'fire_engine') {
      if (previewName) previewName.textContent = 'Heavy Rescue Fire Engine';
      if (previewDesc) previewDesc.textContent = 'High-capacity municipal fire tender with dual warning flashers.';
      if (previewSpeed) previewSpeed.textContent = '82 px/s';
    } else if (type === 'police') {
      if (previewName) previewName.textContent = 'Police Interceptor Patrol';
      if (previewDesc) previewDesc.textContent = 'Rapid interception cruiser equipped with lightbar beacons.';
      if (previewSpeed) previewSpeed.textContent = '100 px/s';
    }
  }

  handleStartSimulation() {
    if (!this.validate()) return;

    // 1. Calculate routes and pick recommended
    const candidateRoutes = this.routePlanner.calculateRoutes(
      this.state.startIntersection,
      this.state.destIntersection,
      this.state.vehicleType,
      this.engine.vehicles,
      this.state.scenario
    );

    const chosenRoute = candidateRoutes[0]; // recommended route

    // 2. Configure simulation engine
    this.engine.configure({
      emergencyVehicleType: this.state.vehicleType,
      startIntersection: this.state.startIntersection,
      destIntersection: this.state.destIntersection,
      trafficDensity: this.state.trafficDensity,
      numNormalVehicles: this.state.numNormalVehicles,
      simSpeed: this.state.simSpeed,
      scenario: this.state.scenario
    });

    if (chosenRoute) {
      this.engine.setRouteWaypoints(chosenRoute.waypoints, chosenRoute);
    }

    // 3. Switch view to Simulation and start
    if (this.appNavigator) {
      this.appNavigator.navigateTo('simulation');
    }

    this.engine.reset();
    this.engine.start();
  }
}
