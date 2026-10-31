/**
 * ResQRoute 2D – Emergency Vehicle Priority Corridor System
 * Manages automated sensor detection, green-wave signal preemption, and corridor clearance.
 */

export class EmergencyPrioritySystem {
  constructor(intersections, trafficLights) {
    this.intersections = intersections;
    this.trafficLights = trafficLights;
    this.activeCorridors = new Set();
    this.onCorridorActivated = null;
    this.onCorridorCleared = null;
    this.scenario = 'priority'; // 'priority' or 'normal'
  }

  setScenario(scenario) {
    this.scenario = scenario;
  }

  update(emergencyVehicles) {
    if (!emergencyVehicles || emergencyVehicles.length === 0) {
      this.clearAllPriorities();
      return;
    }

    const currentActiveIntersections = new Set();

    emergencyVehicles.forEach(veh => {
      if (veh.isCompleted) return;

      this.intersections.getAll().forEach(inter => {
        const isApproaching = inter.isApproaching(veh.x, veh.y);
        const isInside = inter.isInside(veh.x, veh.y);

        if (isApproaching || isInside) {
          // Identify approaching axis ('NS' or 'EW') from vehicle angle
          // Angle 0/PI is East/West; PI/2 or -PI/2 is North/South
          const absCos = Math.abs(Math.cos(veh.angle));
          const requiredPhase = absCos > 0.5 ? 'EW' : 'NS';

          if (this.scenario === 'priority') {
            currentActiveIntersections.add(inter.id);
            inter.priorityActive = true;

            const tl = this.trafficLights.get(inter.id);
            if (tl && (!tl.isPriorityActive || tl.priorityDirection !== requiredPhase)) {
              tl.requestPriority(requiredPhase);
              if (this.onCorridorActivated) {
                this.onCorridorActivated({
                  intersectionId: inter.id,
                  vehicleType: veh.type,
                  phase: requiredPhase
                });
              }
            }
          }
        }
      });
    });

    // Check for intersections that had priority but the vehicle has now passed
    if (this.scenario === 'priority') {
      this.intersections.getAll().forEach(inter => {
        if (!currentActiveIntersections.has(inter.id) && inter.priorityActive) {
          inter.priorityActive = false;
          const tl = this.trafficLights.get(inter.id);
          if (tl) {
            tl.releasePriority();
            if (this.onCorridorCleared) {
              this.onCorridorCleared({ intersectionId: inter.id });
            }
          }
        }
      });
    }
  }

  clearAllPriorities() {
    this.intersections.getAll().forEach(inter => {
      inter.priorityActive = false;
      const tl = this.trafficLights.get(inter.id);
      if (tl && tl.isPriorityActive) {
        tl.releasePriority();
      }
    });
  }
}
