/**
 * ResQRoute 2D – Traffic Lights & Safe Priority Controller
 * Controls signal phases (Red, Yellow, Green), transitions, and safe emergency corridor preemption.
 */

export const SIGNAL_STATE = {
  RED: 'RED',
  YELLOW: 'YELLOW',
  GREEN: 'GREEN'
};

export class TrafficLightIntersection {
  constructor(id, x, y) {
    this.id = id;
    this.x = x;
    this.y = y;

    // Timing parameters in seconds
    this.greenDuration = 7.0;
    this.yellowDuration = 2.0;
    this.allRedDuration = 1.0;

    // Current normal phase: 'NS' or 'EW'
    this.currentPhase = id === 'A' || id === 'D' ? 'NS' : 'EW'; // Staggered offsets for realistic city flow
    this.subState = SIGNAL_STATE.GREEN; // GREEN, YELLOW, ALL_RED
    this.timer = 0;

    // Emergency priority state
    this.isPriorityActive = false;
    this.priorityDirection = null; // 'NS' or 'EW'
    this.transitioningToPriority = false;
    this.priorityReleaseTimer = 0;
  }

  update(dt) {
    // If in priority mode and locked to emergency direction
    if (this.isPriorityActive) {
      if (this.transitioningToPriority) {
        this.timer += dt;
        // Step 1: if conflicting phase was green, wait yellow transition
        if (this.subState === SIGNAL_STATE.YELLOW) {
          if (this.timer >= this.yellowDuration) {
            this.subState = 'ALL_RED';
            this.timer = 0;
          }
        } else if (this.subState === 'ALL_RED') {
          if (this.timer >= this.allRedDuration) {
            // Safe transition complete: switch to emergency phase GREEN!
            this.currentPhase = this.priorityDirection;
            this.subState = SIGNAL_STATE.GREEN;
            this.transitioningToPriority = false;
            this.timer = 0;
          }
        }
      }
      return;
    }

    // Normal cycling when priority is not active
    this.timer += dt;

    if (this.subState === SIGNAL_STATE.GREEN) {
      if (this.timer >= this.greenDuration) {
        this.subState = SIGNAL_STATE.YELLOW;
        this.timer = 0;
      }
    } else if (this.subState === SIGNAL_STATE.YELLOW) {
      if (this.timer >= this.yellowDuration) {
        this.subState = 'ALL_RED';
        this.timer = 0;
      }
    } else if (this.subState === 'ALL_RED') {
      if (this.timer >= this.allRedDuration) {
        // Switch phase safely
        this.currentPhase = this.currentPhase === 'NS' ? 'EW' : 'NS';
        this.subState = SIGNAL_STATE.GREEN;
        this.timer = 0;
      }
    }
  }

  // Request Emergency Priority corridor for a required phase ('NS' or 'EW')
  requestPriority(requiredPhase) {
    this.priorityDirection = requiredPhase;
    this.isPriorityActive = true;

    if (this.currentPhase === requiredPhase) {
      // Already green in this direction! Extend green and hold
      this.subState = SIGNAL_STATE.GREEN;
      this.transitioningToPriority = false;
      this.timer = 0;
    } else {
      // Conflicting direction is active! Safely transition it
      if (this.subState === SIGNAL_STATE.GREEN) {
        this.subState = SIGNAL_STATE.YELLOW;
        this.transitioningToPriority = true;
        this.timer = 0;
      } else if (this.subState === SIGNAL_STATE.YELLOW) {
        this.transitioningToPriority = true;
      } else if (this.subState === 'ALL_RED') {
        this.transitioningToPriority = true;
      }
    }
  }

  // Release Emergency Priority when vehicle has cleared
  releasePriority() {
    this.isPriorityActive = false;
    this.transitioningToPriority = false;
    this.priorityDirection = null;
    // Remain green for 2 seconds to let trailing traffic clear, then cycle
    this.timer = this.greenDuration - 2.0;
  }

  // Get current signal state for North/South approaches
  getNSState() {
    if (this.currentPhase === 'NS') {
      if (this.subState === 'ALL_RED') return SIGNAL_STATE.RED;
      return this.subState;
    }
    return SIGNAL_STATE.RED;
  }

  // Get current signal state for East/West approaches
  getEWState() {
    if (this.currentPhase === 'EW') {
      if (this.subState === 'ALL_RED') return SIGNAL_STATE.RED;
      return this.subState;
    }
    return SIGNAL_STATE.RED;
  }

  // Check state for a specific approach direction: 'north', 'south', 'east', 'west'
  getStateForApproach(approach) {
    if (approach === 'north' || approach === 'south') {
      return this.getNSState();
    } else {
      return this.getEWState();
    }
  }

  render(ctx) {
    const hw = 32; // half road width
    const nsState = this.getNSState();
    const ewState = this.getEWState();

    // Draw 4 signal heads around the intersection corners
    // 1. North incoming approach (facing southbound vehicles, located at NW corner)
    this.renderSignalHead(ctx, this.x - hw - 8, this.y - hw - 18, nsState, 'vertical');

    // 2. South incoming approach (facing northbound vehicles, located at SE corner)
    this.renderSignalHead(ctx, this.x + hw + 8, this.y + hw + 18, nsState, 'vertical');

    // 3. West incoming approach (facing eastbound vehicles, located at SW corner)
    this.renderSignalHead(ctx, this.x - hw - 18, this.y + hw + 8, ewState, 'horizontal');

    // 4. East incoming approach (facing westbound vehicles, located at NE corner)
    this.renderSignalHead(ctx, this.x + hw + 18, this.y - hw - 8, ewState, 'horizontal');
  }

  renderSignalHead(ctx, x, y, state, orientation) {
    const isVert = orientation === 'vertical';
    const w = isVert ? 10 : 26;
    const h = isVert ? 26 : 10;

    // Signal housing box
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, w, h, 3);
    ctx.fill();
    ctx.stroke();

    // 3 Lights (Red, Yellow, Green)
    const isRed = state === SIGNAL_STATE.RED;
    const isYellow = state === SIGNAL_STATE.YELLOW;
    const isGreen = state === SIGNAL_STATE.GREEN;

    const r = 3;
    const positions = isVert
      ? [
          { px: x, py: y - 7, active: isRed, col: '#ef4444', dim: '#450a0a' },
          { px: x, py: y,     active: isYellow, col: '#f59e0b', dim: '#451a03' },
          { px: x, py: y + 7, active: isGreen, col: '#10b981', dim: '#022c22' }
        ]
      : [
          { px: x - 7, py: y, active: isRed, col: '#ef4444', dim: '#450a0a' },
          { px: x,     py: y, active: isYellow, col: '#f59e0b', dim: '#451a03' },
          { px: x + 7, py: y, active: isGreen, col: '#10b981', dim: '#022c22' }
        ];

    positions.forEach(light => {
      ctx.fillStyle = light.active ? light.col : light.dim;
      ctx.beginPath();
      ctx.arc(light.px, light.py, r, 0, Math.PI * 2);
      ctx.fill();

      // Light glow when active
      if (light.active) {
        ctx.save();
        ctx.fillStyle = light.col;
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.arc(light.px, light.py, r * 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });
  }
}

export class TrafficLightSystem {
  constructor(intersections) {
    this.lights = {
      A: new TrafficLightIntersection('A', intersections.A.x, intersections.A.y),
      B: new TrafficLightIntersection('B', intersections.B.x, intersections.B.y),
      C: new TrafficLightIntersection('C', intersections.C.x, intersections.C.y),
      D: new TrafficLightIntersection('D', intersections.D.x, intersections.D.y)
    };
  }

  update(dt) {
    Object.values(this.lights).forEach(tl => tl.update(dt));
  }

  get(id) {
    return this.lights[id];
  }

  getAll() {
    return Object.values(this.lights);
  }

  render(ctx) {
    Object.values(this.lights).forEach(tl => tl.render(ctx));
  }
}
