/**
 * ResQRoute 2D – Conflict Detection & Safety Analyzer
 * Monitors conflict vectors and intersection encroachment risks between vehicles.
 */

export class ConflictDetector {
  constructor(intersections) {
    this.intersections = intersections;
    this.totalConflictsDetected = 0;
    this.conflictCooldowns = new Map(); // prevents double-counting the same encounter
    this.activeConflictLocations = [];
  }

  reset() {
    this.totalConflictsDetected = 0;
    this.conflictCooldowns.clear();
    this.activeConflictLocations = [];
  }

  detectConflicts(vehicles, dt) {
    this.activeConflictLocations = [];

    // Decrement cooldowns
    for (const [pairKey, time] of this.conflictCooldowns.entries()) {
      if (time <= dt) {
        this.conflictCooldowns.delete(pairKey);
      } else {
        this.conflictCooldowns.set(pairKey, time - dt);
      }
    }

    const n = vehicles.length;
    for (let i = 0; i < n; i++) {
      const v1 = vehicles[i];
      if (v1.isCompleted) continue;

      for (let j = i + 1; j < n; j++) {
        const v2 = vehicles[j];
        if (v2.isCompleted) continue;

        const dx = v2.x - v1.x;
        const dy = v2.y - v1.y;
        const distSq = dx * dx + dy * dy;

        // Collision or critical near-miss threshold: 26px (~car length)
        if (distSq < 26 * 26) {
          // Check if vehicles have divergent headings (orthogonal or intersecting trajectories)
          let angleDiff = Math.abs(v1.angle - v2.angle);
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          angleDiff = Math.abs(angleDiff);

          // If angles differ significantly (not trailing same lane), it's a cross-traffic conflict!
          if (angleDiff > 0.6) {
            const pairKey = `${v1.id}_${v2.id}`;
            if (!this.conflictCooldowns.has(pairKey)) {
              this.totalConflictsDetected++;
              this.conflictCooldowns.set(pairKey, 3.0); // 3 second cooldown per vehicle pair

              this.activeConflictLocations.push({
                x: (v1.x + v2.x) / 2,
                y: (v1.y + v2.y) / 2,
                time: 0.8
              });
            }
          }
        }
      }
    }
  }

  render(ctx) {
    // Render brief warning pulse at conflict location
    this.activeConflictLocations.forEach(loc => {
      ctx.save();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(loc.x, loc.y, 18, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
      ctx.beginPath();
      ctx.arc(loc.x, loc.y, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }
}
