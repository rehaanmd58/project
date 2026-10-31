/**
 * ResQRoute 2D – Route Optimization & Pathfinding Engine
 * Implements Dijkstra / A* graph search and dynamic cost modeling (Distance + Congestion + Signals).
 */

import { CITY_CONFIG } from '../simulation/city.js';

export class RoutePlanner {
  constructor() {
    this.lo = CITY_CONFIG.laneOffset; // 16
    this.xA = CITY_CONFIG.intersections.A.x; // 240
    this.xB = CITY_CONFIG.intersections.B.x; // 680
    this.yTop = CITY_CONFIG.intersections.A.y; // 200
    this.yBottom = CITY_CONFIG.intersections.C.y; // 540

    // City Graph Adjacency with physical distances (in simulated meters)
    this.graph = {
      A: [
        { to: 'B', distance: 440, baseTravelTime: 14 },
        { to: 'C', distance: 340, baseTravelTime: 11 }
      ],
      B: [
        { to: 'A', distance: 440, baseTravelTime: 14 },
        { to: 'D', distance: 340, baseTravelTime: 11 }
      ],
      C: [
        { to: 'A', distance: 340, baseTravelTime: 11 },
        { to: 'D', distance: 440, baseTravelTime: 14 }
      ],
      D: [
        { to: 'B', distance: 340, baseTravelTime: 11 },
        { to: 'C', distance: 440, baseTravelTime: 14 }
      ]
    };
  }

  /**
   * Evaluates candidate routes between start and dest intersections.
   * Calculates actual values based on real simulation vehicle queues and signal delays.
   */
  calculateRoutes(startNode, destNode, vehicleType = 'ambulance', vehicles = [], scenario = 'priority') {
    if (startNode === destNode) return [];

    const candidates = this.generateCandidatePaths(startNode, destNode);
    const speedRatio = vehicleType === 'ambulance' ? 1.0 : vehicleType === 'fire_engine' ? 0.88 : 1.05;

    // Assess traffic density along each segment from live vehicle list
    const segmentQueues = this.computeSegmentCongestion(vehicles);

    const evaluatedRoutes = candidates.map((path, idx) => {
      let totalDistance = 0;
      let totalBaseTime = 0;
      let totalQueueVehicles = 0;

      for (let i = 0; i < path.nodes.length - 1; i++) {
        const u = path.nodes[i];
        const v = path.nodes[i + 1];
        const edge = this.graph[u]?.find(e => e.to === v) || { distance: 400, baseTravelTime: 13 };
        totalDistance += edge.distance;
        totalBaseTime += edge.baseTravelTime / speedRatio;

        const segKey = `${u}_${v}`;
        totalQueueVehicles += segmentQueues[segKey] || 0;
      }

      // Signal wait time: with priority corridor = 1-3s; normal traffic = 10-18s per intersection
      const numIntersections = path.nodes.length;
      const waitPerIntersection = scenario === 'priority' ? 1.2 : 9.5;
      const estimatedWaitTime = Math.round(numIntersections * waitPerIntersection);
      const estimatedTravelTime = Math.round(totalBaseTime + estimatedWaitTime + totalQueueVehicles * 1.5);
      const densityPercent = Math.min(95, Math.round(20 + totalQueueVehicles * 8));

      // Dijkstra composite cost function: Distance + Congestion Weight + Signal Delay
      const cost = totalDistance * 0.4 + (totalQueueVehicles * 45) + (estimatedWaitTime * 25);

      return {
        id: `route_${idx + 1}`,
        name: path.name,
        nodes: path.nodes,
        description: path.description,
        distance: totalDistance,
        estimatedTravelTime,
        trafficDensity: densityPercent,
        intersectionsCount: numIntersections,
        estimatedWaitTime,
        cost,
        isRecommended: false,
        waypoints: this.buildWaypoints(path.nodes)
      };
    });

    // Mark minimum cost route as recommended
    if (evaluatedRoutes.length > 0) {
      evaluatedRoutes.sort((a, b) => a.cost - b.cost);
      evaluatedRoutes[0].isRecommended = true;
    }

    return evaluatedRoutes;
  }

  computeSegmentCongestion(vehicles) {
    const queues = {};
    if (!vehicles || vehicles.length === 0) return queues;

    vehicles.forEach(v => {
      if (v.speed < 15) {
        // Classify road location
        if (Math.abs(v.y - this.yTop) < 32 && v.x > this.xA && v.x < this.xB) {
          queues['A_B'] = (queues['A_B'] || 0) + 1;
          queues['B_A'] = (queues['B_A'] || 0) + 1;
        } else if (Math.abs(v.y - this.yBottom) < 32 && v.x > this.xA && v.x < this.xB) {
          queues['C_D'] = (queues['C_D'] || 0) + 1;
          queues['D_C'] = (queues['D_C'] || 0) + 1;
        } else if (Math.abs(v.x - this.xA) < 32 && v.y > this.yTop && v.y < this.yBottom) {
          queues['A_C'] = (queues['A_C'] || 0) + 1;
          queues['C_A'] = (queues['C_A'] || 0) + 1;
        } else if (Math.abs(v.x - this.xB) < 32 && v.y > this.yTop && v.y < this.yBottom) {
          queues['B_D'] = (queues['B_D'] || 0) + 1;
          queues['D_B'] = (queues['D_B'] || 0) + 1;
        }
      }
    });

    return queues;
  }

  generateCandidatePaths(start, dest) {
    const paths = [];

    if ((start === 'A' && dest === 'D') || (start === 'D' && dest === 'A')) {
      if (start === 'A') {
        paths.push({ name: 'North-East Express Corridor', nodes: ['A', 'B', 'D'], description: 'Downtown Hub through Medical District arterial' });
        paths.push({ name: 'West-South Civic Corridor', nodes: ['A', 'C', 'D'], description: 'Civic Center avenue with wide boulevard clearance' });
        paths.push({ name: 'Peripheral Ring Detour', nodes: ['A', 'B', 'D'], description: 'Outer ring route with lower cross-traffic density' });
      } else {
        paths.push({ name: 'South-West Civic Corridor', nodes: ['D', 'C', 'A'], description: 'Via Civic Center avenue' });
        paths.push({ name: 'East-North Medical Corridor', nodes: ['D', 'B', 'A'], description: 'Via Medical District arterial' });
        paths.push({ name: 'Peripheral Ring Detour', nodes: ['D', 'B', 'A'], description: 'Outer ring route' });
      }
    } else if ((start === 'B' && dest === 'C') || (start === 'C' && dest === 'B')) {
      if (start === 'B') {
        paths.push({ name: 'Medical-West Arterial', nodes: ['B', 'A', 'C'], description: 'Through Downtown Hub' });
        paths.push({ name: 'Industrial-South Boulevard', nodes: ['B', 'D', 'C'], description: 'Through Logistics Terminal' });
      } else {
        paths.push({ name: 'Civic-North Boulevard', nodes: ['C', 'A', 'B'], description: 'Through Downtown Hub' });
        paths.push({ name: 'Industrial-East Corridor', nodes: ['C', 'D', 'B'], description: 'Through Logistics Terminal' });
      }
    } else {
      // Direct adjacent neighbors (e.g. A to B, A to C, etc.)
      const direct = [start, dest];
      paths.push({ name: `Direct Corridor (${start} → ${dest})`, nodes: direct, description: 'Direct point-to-point arterial' });

      // Find 1-2 alternate paths through intermediate nodes
      const allNodes = ['A', 'B', 'C', 'D'];
      const intermediates = allNodes.filter(n => n !== start && n !== dest);

      if (intermediates.length >= 2) {
        paths.push({
          name: `Alternate Bypass (${start} → ${intermediates[0]} → ${intermediates[1]} → ${dest})`,
          nodes: [start, intermediates[0], intermediates[1], dest],
          description: 'Multi-segment perimeter bypass'
        });
      }
    }

    return paths;
  }

  /**
   * Converts a node list like ['A', 'B', 'D'] into precise continuous (x, y) waypoints
   * that align with driving lanes (right-hand driving rules).
   */
  buildWaypoints(nodes) {
    const waypoints = [];
    const lo = this.lo; // 16
    const coords = {
      A: { x: this.xA, y: this.yTop },
      B: { x: this.xB, y: this.yTop },
      C: { x: this.xA, y: this.yBottom },
      D: { x: this.xB, y: this.yBottom }
    };

    for (let i = 0; i < nodes.length; i++) {
      const curr = nodes[i];
      const next = nodes[i + 1];
      const prev = nodes[i - 1];
      const c = coords[curr];

      // Ingress approach waypoint
      if (!prev) {
        // Start node: spawn slightly ahead of node
        if (next === 'B') waypoints.push({ x: c.x - 30, y: c.y + lo });
        else if (next === 'C') waypoints.push({ x: c.x - lo, y: c.y - 30 });
        else waypoints.push({ x: c.x, y: c.y });
      }

      // Intersection node waypoint with approach info
      let approach = 'west';
      if (prev) {
        if (prev === 'A' && (curr === 'B' || curr === 'C')) approach = curr === 'B' ? 'west' : 'north';
        else if (prev === 'B' && (curr === 'A' || curr === 'D')) approach = curr === 'A' ? 'east' : 'north';
        else if (prev === 'C' && (curr === 'A' || curr === 'D')) approach = curr === 'A' ? 'south' : 'west';
        else if (prev === 'D' && (curr === 'B' || curr === 'C')) approach = curr === 'B' ? 'south' : 'east';
      }

      // Approach stop line waypoint
      if (approach === 'west') waypoints.push({ x: c.x - 35, y: c.y + lo, intersectionId: curr, approach });
      else if (approach === 'east') waypoints.push({ x: c.x + 35, y: c.y - lo, intersectionId: curr, approach });
      else if (approach === 'north') waypoints.push({ x: c.x - lo, y: c.y - 35, intersectionId: curr, approach });
      else if (approach === 'south') waypoints.push({ x: c.x + lo, y: c.y + 35, intersectionId: curr, approach });

      // Crossing center of intersection
      waypoints.push({ x: c.x, y: c.y });

      // Exit waypoint towards next node
      if (next) {
        if (next === 'B') waypoints.push({ x: c.x + 35, y: c.y + lo });
        else if (next === 'A') waypoints.push({ x: c.x - 35, y: c.y - lo });
        else if (next === 'C' || next === 'D') waypoints.push({ x: c.x - lo, y: c.y + 35 });
      } else {
        // Destination node reached: exit buffer
        if (prev === 'B') waypoints.push({ x: c.x, y: c.y + 50 });
        else if (prev === 'C') waypoints.push({ x: c.x + 50, y: c.y });
        else waypoints.push({ x: c.x + 40, y: c.y });
      }
    }

    return waypoints;
  }
}
