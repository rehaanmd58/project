/**
 * ResQRoute 2D – Vehicle Movement, Pathing & Collision Avoidance
 * Implements lane following, headway distance checking, and stop line compliance.
 */

import { SIGNAL_STATE } from './traffic-lights.js';

export class VehicleMovementController {
  constructor(intersections, trafficLights) {
    this.intersections = intersections;
    this.trafficLights = trafficLights;
    this.safeFollowingDistance = 38; // pixels
    this.emergencyFollowingDistance = 45;
  }

  updateVehicles(vehicles, dt, simSpeedMultiplier = 1) {
    for (let i = 0; i < vehicles.length; i++) {
      const veh = vehicles[i];
      if (veh.isCompleted) continue;

      // 1. Determine target speed based on leading vehicles and traffic signals
      this.evaluateVehicleSpeed(veh, vehicles, i);

      // 2. Follow waypoints along route
      this.updateWaypointNavigation(veh, dt * simSpeedMultiplier);

      // 3. Step physics
      veh.update(dt, simSpeedMultiplier);
    }
  }

  evaluateVehicleSpeed(veh, allVehicles, currentIndex) {
    let desiredSpeed = veh.maxSpeed;

    // Check 1: Traffic signal ahead at intersection approach
    const stopConstraint = this.checkTrafficSignalStop(veh);
    if (stopConstraint.shouldStop) {
      // Calculate stopping deceleration distance
      const dist = stopConstraint.distanceToStop;
      if (dist < 15) {
        desiredSpeed = 0; // come to complete halt
      } else if (dist < 70) {
        desiredSpeed = Math.min(desiredSpeed, (dist / 70) * veh.maxSpeed * 0.4);
      }
    }

    // Check 2: Safe following distance behind vehicle ahead in same direction
    const leadVehicle = this.findLeadVehicle(veh, allVehicles, currentIndex);
    if (leadVehicle) {
      const gap = leadVehicle.distance;
      const minGap = veh.isEmergency ? this.emergencyFollowingDistance : this.safeFollowingDistance;

      if (gap < minGap) {
        // Too close! Match speed of vehicle ahead or brake harder
        desiredSpeed = Math.min(desiredSpeed, Math.max(0, leadVehicle.vehicle.speed * 0.8));
      } else if (gap < minGap * 2.2) {
        // Approaching leader, smoothly decelerate
        const ratio = (gap - minGap) / (minGap * 1.2);
        desiredSpeed = Math.min(desiredSpeed, leadVehicle.vehicle.speed + (veh.maxSpeed - leadVehicle.vehicle.speed) * ratio);
      }
    }

    veh.targetSpeed = Math.max(0, desiredSpeed);
  }

  findLeadVehicle(veh, allVehicles, currentIndex) {
    let nearestLead = null;
    let minDistance = Infinity;

    for (let j = 0; j < allVehicles.length; j++) {
      if (j === currentIndex) continue;
      const other = allVehicles[j];
      if (other.isCompleted) continue;

      // Check if other vehicle is roughly in front along current heading
      const dx = other.x - veh.x;
      const dy = other.y - veh.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 120) {
        // Angle to other vehicle
        const angleToOther = Math.atan2(dy, dx);
        let angleDiff = Math.abs(angleToOther - veh.angle);
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        angleDiff = Math.abs(angleDiff);

        // Leading vehicle is within ~30 degrees forward cone
        if (angleDiff < 0.5) {
          // Check heading alignment (traveling in similar direction)
          let headingDiff = Math.abs(other.angle - veh.angle);
          while (headingDiff > Math.PI) headingDiff -= Math.PI * 2;
          headingDiff = Math.abs(headingDiff);

          if (headingDiff < 0.6 && dist < minDistance) {
            minDistance = dist;
            nearestLead = { vehicle: other, distance: dist };
          }
        }
      }
    }

    return nearestLead;
  }

  checkTrafficSignalStop(veh) {
    if (!veh.route || veh.routeIndex >= veh.route.length) {
      return { shouldStop: false, distanceToStop: Infinity };
    }

    const currentWaypoint = veh.route[veh.routeIndex];
    if (!currentWaypoint || !currentWaypoint.intersectionId) {
      return { shouldStop: false, distanceToStop: Infinity };
    }

    const interId = currentWaypoint.intersectionId;
    const approach = currentWaypoint.approach; // 'north', 'south', 'east', 'west'
    const intersection = this.intersections.get(interId);
    const trafficLight = this.trafficLights.get(interId);

    if (!intersection || !trafficLight || !approach) {
      return { shouldStop: false, distanceToStop: Infinity };
    }

    // Distance to stop line
    const stopLine = intersection.stopLines[approach];
    if (!stopLine) {
      return { shouldStop: false, distanceToStop: Infinity };
    }

    const dx = stopLine.x - veh.x;
    const dy = stopLine.y - veh.y;
    const distanceToStop = Math.sqrt(dx * dx + dy * dy);

    // Only apply stop rule when approaching the stop line from before it
    const isApproachingBeforeLine = 
      (approach === 'north' && veh.y < stopLine.y) ||
      (approach === 'south' && veh.y > stopLine.y) ||
      (approach === 'west'  && veh.x < stopLine.x) ||
      (approach === 'east'  && veh.x > stopLine.x);

    if (isApproachingBeforeLine && distanceToStop < 90) {
      const signalState = trafficLight.getStateForApproach(approach);
      if (signalState === SIGNAL_STATE.RED || signalState === SIGNAL_STATE.YELLOW) {
        return { shouldStop: true, distanceToStop };
      }
    }

    return { shouldStop: false, distanceToStop: Infinity };
  }

  updateWaypointNavigation(veh, dt) {
    if (!veh.route || veh.routeIndex >= veh.route.length) {
      veh.isCompleted = true;
      return;
    }

    const target = veh.route[veh.routeIndex];
    const dx = target.x - veh.x;
    const dy = target.y - veh.y;
    const distToTarget = Math.sqrt(dx * dx + dy * dy);

    // Target waypoint reached
    const arrivalThreshold = Math.max(12, veh.speed * dt * 1.5);
    if (distToTarget <= arrivalThreshold) {
      veh.routeIndex++;
      if (veh.routeIndex >= veh.route.length) {
        veh.isCompleted = true;
        return;
      }
    }

    // Smooth steering toward target waypoint
    const desiredAngle = Math.atan2(dy, dx);
    let diff = desiredAngle - veh.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    const turnRate = 5.0 * dt; // radians/sec turn agility
    if (Math.abs(diff) < turnRate) {
      veh.angle = desiredAngle;
    } else {
      veh.angle += Math.sign(diff) * turnRate;
    }
  }
}
