/**
 * ResQRoute 2D – Canvas Viewport & Coordinate Transformer
 * Handles DPR scaling, pan, zoom, layer composite rendering, and overlays.
 */

import { CITY_CONFIG } from './city.js';

export class SimulationCanvas {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');

    this.simWidth = CITY_CONFIG.width;
    this.simHeight = CITY_CONFIG.height;

    // Viewport transform
    this.scale = 1.0;
    this.panX = 0;
    this.panY = 0;

    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;

    // View settings
    this.showRoute = true;
    this.showLabels = true;
    this.theme = 'night';

    this.initEvents();
    this.resize();
  }

  setTheme(theme) {
    this.theme = theme;
  }

  setShowRoute(show) {
    this.showRoute = show;
  }

  setShowLabels(show) {
    this.showLabels = show;
  }

  initEvents() {
    window.addEventListener('resize', () => this.resize());

    // Mouse drag for panning
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.panX += dx;
      this.panY += dy;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Wheel zoom
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      this.zoom(zoomFactor, e.offsetX, e.offsetY);
    }, { passive: false });
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement ? this.canvas.parentElement.getBoundingClientRect() : this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.resetTransform?.();

    // Auto fit city to container on initial load
    if (rect.width > 0 && rect.height > 0) {
      const scaleX = (rect.width * 0.96) / this.simWidth;
      const scaleY = (rect.height * 0.96) / this.simHeight;
      this.scale = Math.min(scaleX, scaleY, 1.25);
      this.panX = (rect.width - this.simWidth * this.scale) / 2;
      this.panY = (rect.height - this.simHeight * this.scale) / 2;
    }
  }

  zoomIn() {
    this.zoom(1.15, this.canvas.clientWidth / 2, this.canvas.clientHeight / 2);
  }

  zoomOut() {
    this.zoom(0.85, this.canvas.clientWidth / 2, this.canvas.clientHeight / 2);
  }

  resetView() {
    this.resize();
  }

  zoom(factor, mouseX, mouseY) {
    const newScale = Math.min(Math.max(0.4, this.scale * factor), 2.5);
    // Zoom toward mouse location
    this.panX = mouseX - (mouseX - this.panX) * (newScale / this.scale);
    this.panY = mouseY - (mouseY - this.panY) * (newScale / this.scale);
    this.scale = newScale;
  }

  render(renderCallbacks = {}) {
    const dpr = window.devicePixelRatio || 1;
    const ctx = this.ctx;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply HiDPI scale + Pan/Zoom viewport
    ctx.scale(dpr, dpr);
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.scale, this.scale);

    // 1. City Terrain & Buildings
    if (renderCallbacks.city) renderCallbacks.city(ctx);

    // 2. Roads, Lane Lines, Crosswalks, Stop Lines
    if (renderCallbacks.roads) renderCallbacks.roads(ctx);

    // 3. Emergency Route Corridor Overlay
    if (this.showRoute && renderCallbacks.route) renderCallbacks.route(ctx);

    // 4. Traffic Light Signals
    if (renderCallbacks.trafficLights) renderCallbacks.trafficLights(ctx);

    // 5. Vehicles (Normal and Emergency)
    if (renderCallbacks.vehicles) renderCallbacks.vehicles(ctx);

    // 6. Intersection Labels & Badges
    if (renderCallbacks.intersections) renderCallbacks.intersections(ctx, this.showLabels);

    // 7. Conflict Highlights
    if (renderCallbacks.conflicts) renderCallbacks.conflicts(ctx);

    ctx.restore();
  }
}
