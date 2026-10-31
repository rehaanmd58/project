/**
 * ResQRoute 2D – Vehicles Model & Visual Renderer
 * Models normal and emergency vehicles with distinct geometries, headlights, and emergency beacons.
 */

export const VEHICLE_CONFIGS = {
  car: {
    length: 22,
    width: 12,
    maxSpeed: 70, // px per second
    acceleration: 45,
    braking: 90,
    colors: ['#3b82f6', '#06b6d4', '#e2e8f0', '#94a3b8', '#10b981', '#f59e0b']
  },
  bus: {
    length: 42,
    width: 15,
    maxSpeed: 48,
    acceleration: 28,
    braking: 60,
    colors: ['#f59e0b', '#d97706', '#ea580c']
  },
  motorcycle: {
    length: 14,
    width: 7,
    maxSpeed: 82,
    acceleration: 65,
    braking: 110,
    colors: ['#ef4444', '#10b981', '#06b6d4', '#e2e8f0']
  },
  ambulance: {
    length: 28,
    width: 14,
    maxSpeed: 95,
    acceleration: 75,
    braking: 120,
    colors: ['#ffffff'],
    isEmergency: true
  },
  fire_engine: {
    length: 38,
    width: 16,
    maxSpeed: 82,
    acceleration: 55,
    braking: 100,
    colors: ['#dc2626'],
    isEmergency: true
  },
  police: {
    length: 24,
    width: 13,
    maxSpeed: 100,
    acceleration: 80,
    braking: 130,
    colors: ['#0f172a'],
    isEmergency: true
  }
};

export class Vehicle {
  constructor(options = {}) {
    this.id = options.id || 'veh_' + Math.random().toString(36).substr(2, 8);
    this.type = options.type || 'car';
    const cfg = VEHICLE_CONFIGS[this.type] || VEHICLE_CONFIGS.car;

    this.isEmergency = !!cfg.isEmergency;
    this.length = cfg.length;
    this.width = cfg.width;
    this.maxSpeed = cfg.maxSpeed;
    this.acceleration = cfg.acceleration;
    this.braking = cfg.braking;
    this.color = options.color || cfg.colors[Math.floor(Math.random() * cfg.colors.length)];

    // Physics
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.speed = options.speed !== undefined ? options.speed : this.maxSpeed * 0.7;
    this.targetSpeed = this.maxSpeed;
    this.angle = options.angle || 0; // In radians: 0 = East (right), PI/2 = South (down), PI = West (left), -PI/2 = North (up)
    this.isBraking = false;

    // Navigation & Route
    this.route = options.route || null; // Waypoints array
    this.routeIndex = 0;
    this.currentIntersection = null;
    this.approachingIntersection = null;

    // Simulation Metrics
    this.distanceTraveled = 0;
    this.waitTime = 0;
    this.stopCount = 0;
    this.wasStopped = false;
    this.travelTime = 0;
    this.isCompleted = false;

    // Visual Animation
    this.strobeTimer = 0;
    this.strobeState = false; // toggle for flashing lights
  }

  update(dt, simSpeedMultiplier = 1) {
    const effectiveDt = dt * simSpeedMultiplier;
    this.travelTime += effectiveDt;

    // Emergency flashing strobe timing
    if (this.isEmergency) {
      this.strobeTimer += effectiveDt;
      if (this.strobeTimer >= 0.12) {
        this.strobeState = !this.strobeState;
        this.strobeTimer = 0;
      }
    }

    // Accelerate or brake towards target speed
    if (this.speed < this.targetSpeed) {
      this.speed = Math.min(this.targetSpeed, this.speed + this.acceleration * effectiveDt);
      this.isBraking = false;
    } else if (this.speed > this.targetSpeed) {
      this.speed = Math.max(this.targetSpeed, this.speed - this.braking * effectiveDt);
      this.isBraking = true;
    } else {
      this.isBraking = false;
    }

    // Check stopped state for metrics
    if (this.speed < 2.0) {
      this.waitTime += effectiveDt;
      if (!this.wasStopped) {
        this.stopCount++;
        this.wasStopped = true;
      }
    } else {
      this.wasStopped = false;
    }

    // Move forward along current heading angle
    const dist = this.speed * effectiveDt;
    this.x += Math.cos(this.angle) * dist;
    this.y += Math.sin(this.angle) * dist;
    this.distanceTraveled += dist;
  }

  render(ctx, isNight = true) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const halfL = this.length / 2;
    const halfW = this.width / 2;

    // 1. Headlight Cones (especially visible at night)
    if (isNight || this.isEmergency) {
      ctx.save();
      const beamGrad = ctx.createRadialGradient(halfL + 2, 0, 1, halfL + 35, 0, 45);
      beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
      beamGrad.addColorStop(0.4, 'rgba(254, 240, 138, 0.15)');
      beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');

      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(halfL, -halfW + 1);
      ctx.lineTo(halfL + 50, -halfW - 14);
      ctx.lineTo(halfL + 50, halfW + 14);
      ctx.lineTo(halfL, halfW - 1);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 2. Vehicle Body Drop Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.roundRect(-halfL + 1, -halfW + 2, this.length, this.width, 3);
    ctx.fill();

    // 3. Main Vehicle Body
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.roundRect(-halfL, -halfW, this.length, this.width, 3);
    ctx.fill();

    // Body Outline
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 4. Windows & Windshield
    ctx.fillStyle = '#0f172a';
    // Front Windshield
    ctx.beginPath();
    ctx.roundRect(halfL * 0.1, -halfW + 2, halfL * 0.45, this.width - 4, 1.5);
    ctx.fill();

    // Rear Window
    ctx.beginPath();
    ctx.roundRect(-halfL * 0.75, -halfW + 2, halfL * 0.35, this.width - 4, 1.5);
    ctx.fill();

    // 5. Tail / Brake Lights
    ctx.fillStyle = this.isBraking ? '#ef4444' : '#7f1d1d';
    // Left & Right taillights
    ctx.fillRect(-halfL, -halfW + 1, 2, 3);
    ctx.fillRect(-halfL, halfW - 4, 2, 3);

    // If braking, taillight glow
    if (this.isBraking) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.beginPath();
      ctx.arc(-halfL, -halfW + 2, 5, 0, Math.PI * 2);
      ctx.arc(-halfL, halfW - 3, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 6. Distinct Emergency Vehicle Markings & Strobe Lights
    if (this.isEmergency) {
      if (this.type === 'ambulance') {
        // Red Cross on white roof
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-3, -1, 6, 2);
        ctx.fillRect(-1, -3, 2, 6);

        // Dual Flashing Strobe Beacons
        const leftRed = this.strobeState;
        this.renderStrobe(ctx, -halfL * 0.2, -halfW + 2, leftRed ? '#ef4444' : '#3b82f6');
        this.renderStrobe(ctx, -halfL * 0.2, halfW - 2, leftRed ? '#3b82f6' : '#ef4444');
      } else if (this.type === 'fire_engine') {
        // Fire Engine Ladder on roof
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-halfL * 0.6, -2);
        ctx.lineTo(halfL * 0.2, -2);
        ctx.moveTo(-halfL * 0.6, 2);
        ctx.lineTo(halfL * 0.2, 2);
        for (let lx = -halfL * 0.5; lx <= halfL * 0.1; lx += 4) {
          ctx.moveTo(lx, -2);
          ctx.lineTo(lx, 2);
        }
        ctx.stroke();

        // Dual Red Strobes
        this.renderStrobe(ctx, halfL * 0.4, -halfW + 2, this.strobeState ? '#ef4444' : '#ffffff');
        this.renderStrobe(ctx, halfL * 0.4, halfW - 2, this.strobeState ? '#ffffff' : '#ef4444');
      } else if (this.type === 'police') {
        // Police Lightbar (Blue & Red)
        const blueLeft = this.strobeState;
        this.renderStrobe(ctx, 0, -3, blueLeft ? '#3b82f6' : '#ef4444');
        this.renderStrobe(ctx, 0, 3, blueLeft ? '#ef4444' : '#3b82f6');
      }
    }

    ctx.restore();
  }

  renderStrobe(ctx, sx, sy, color) {
    ctx.save();
    // Inner bulb
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Radiating beacon flash halo
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.arc(sx, sy, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
