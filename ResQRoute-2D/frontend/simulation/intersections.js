/**
 * ResQRoute 2D – Intersections Model & Node Controller
 * Manages intersection geometry, stop lines, turning paths, and labels.
 */

import { CITY_CONFIG } from './city.js';

export class Intersection {
  constructor(id, name, x, y) {
    this.id = id;
    this.name = name;
    this.x = x;
    this.y = y;
    this.halfWidth = CITY_CONFIG.roadWidth / 2; // 32
    this.laneOffset = CITY_CONFIG.laneOffset;   // 16

    // Stop Line Coordinates for each ingress approach
    this.stopLines = {
      north: { x: this.x - this.laneOffset, y: this.y - this.halfWidth - 15, dir: 'south' },
      south: { x: this.x + this.laneOffset, y: this.y + this.halfWidth + 15, dir: 'north' },
      west:  { x: this.x - this.halfWidth - 15, y: this.y + this.laneOffset, dir: 'east' },
      east:  { x: this.x + this.halfWidth + 15, y: this.y - this.laneOffset, dir: 'west' }
    };

    // Detection Radius for Approaching Emergency Vehicles
    this.detectionRadius = 180;
    this.occupied = false;
    this.priorityActive = false;
  }

  // Check if a point is within detection radius
  isApproaching(x, y) {
    const dx = x - this.x;
    const dy = y - this.y;
    return Math.sqrt(dx * dx + dy * dy) <= this.detectionRadius;
  }

  // Check if a vehicle is inside the intersection box
  isInside(x, y) {
    return (
      x >= this.x - this.halfWidth &&
      x <= this.x + this.halfWidth &&
      y >= this.y - this.halfWidth &&
      y <= this.y + this.halfWidth
    );
  }

  renderLabels(ctx, showLabels = true) {
    if (!showLabels) return;

    // Outer circle badge
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = this.priorityActive ? '#ef4444' : '#38bdf8';
    ctx.lineWidth = 2.5;

    // Render node badge in corner quadrant of intersection to avoid blocking road center
    const badgeX = this.x - 42;
    const badgeY = this.y - 42;

    ctx.beginPath();
    ctx.arc(badgeX, badgeY, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (this.priorityActive) {
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
    }

    // Letter
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 13px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.id, badgeX, badgeY);

    ctx.restore();
  }
}

export class IntersectionManager {
  constructor() {
    this.intersections = {
      A: new Intersection('A', 'Downtown Hub (A)', CITY_CONFIG.intersections.A.x, CITY_CONFIG.intersections.A.y),
      B: new Intersection('B', 'Medical District (B)', CITY_CONFIG.intersections.B.x, CITY_CONFIG.intersections.B.y),
      C: new Intersection('C', 'Civic Center (C)', CITY_CONFIG.intersections.C.x, CITY_CONFIG.intersections.C.y),
      D: new Intersection('D', 'Industrial Park (D)', CITY_CONFIG.intersections.D.x, CITY_CONFIG.intersections.D.y)
    };
  }

  get(id) {
    return this.intersections[id];
  }

  getAll() {
    return Object.values(this.intersections);
  }

  render(ctx, showLabels = true) {
    Object.values(this.intersections).forEach(node => {
      node.renderLabels(ctx, showLabels);
    });
  }
}
