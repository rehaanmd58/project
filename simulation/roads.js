/**
 * ResQRoute 2D – Road Network Definitions & Renderer
 * Handles road geometry, lanes, crosswalks, stop lines, and markings.
 */

import { CITY_CONFIG } from './city.js';

export class RoadNetwork {
  constructor() {
    this.width = CITY_CONFIG.width;
    this.height = CITY_CONFIG.height;
    this.roadWidth = CITY_CONFIG.roadWidth; // 64px
    this.halfWidth = this.roadWidth / 2; // 32px
    this.laneOffset = CITY_CONFIG.laneOffset; // 16px from center line
    this.theme = 'night';

    // Key coordinates for horizontal and vertical corridors
    this.xLeft = CITY_CONFIG.intersections.A.x;   // 240
    this.xRight = CITY_CONFIG.intersections.B.x;  // 680
    this.yTop = CITY_CONFIG.intersections.A.y;    // 200
    this.yBottom = CITY_CONFIG.intersections.C.y; // 540
  }

  setTheme(theme) {
    this.theme = theme;
  }

  render(ctx) {
    const isNight = this.theme === 'night';
    const asphaltColor = isNight ? '#141d2e' : '#475569';
    const edgeColor = isNight ? '#2b3952' : '#cbd5e1';
    const markingWhite = isNight ? '#94a3b8' : '#f8fafc';
    const markingYellow = '#f59e0b';

    // 1. Draw all road surfaces
    ctx.fillStyle = asphaltColor;

    // Horizontal top road
    ctx.fillRect(0, this.yTop - this.halfWidth, this.width, this.roadWidth);
    // Horizontal bottom road
    ctx.fillRect(0, this.yBottom - this.halfWidth, this.width, this.roadWidth);
    // Vertical left road
    ctx.fillRect(this.xLeft - this.halfWidth, 0, this.roadWidth, this.height);
    // Vertical right road
    ctx.fillRect(this.xRight - this.halfWidth, 0, this.roadWidth, this.height);

    // 2. Road Edges (solid boundary lines)
    ctx.strokeStyle = edgeColor;
    ctx.lineWidth = 2;

    // Outer boundaries with intersection cutouts
    const drawHLine = (x1, x2, y) => {
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();
    };
    const drawVLine = (x, y1, y2) => {
      ctx.beginPath();
      ctx.moveTo(x, y1);
      ctx.lineTo(x, y2);
      ctx.stroke();
    };

    // Horizontal top edges
    drawHLine(0, this.xLeft - this.halfWidth, this.yTop - this.halfWidth);
    drawHLine(this.xLeft + this.halfWidth, this.xRight - this.halfWidth, this.yTop - this.halfWidth);
    drawHLine(this.xRight + this.halfWidth, this.width, this.yTop - this.halfWidth);

    drawHLine(0, this.xLeft - this.halfWidth, this.yTop + this.halfWidth);
    drawHLine(this.xLeft + this.halfWidth, this.xRight - this.halfWidth, this.yTop + this.halfWidth);
    drawHLine(this.xRight + this.halfWidth, this.width, this.yTop + this.halfWidth);

    // Horizontal bottom edges
    drawHLine(0, this.xLeft - this.halfWidth, this.yBottom - this.halfWidth);
    drawHLine(this.xLeft + this.halfWidth, this.xRight - this.halfWidth, this.yBottom - this.halfWidth);
    drawHLine(this.xRight + this.halfWidth, this.width, this.yBottom - this.halfWidth);

    drawHLine(0, this.xLeft - this.halfWidth, this.yBottom + this.halfWidth);
    drawHLine(this.xLeft + this.halfWidth, this.xRight - this.halfWidth, this.yBottom + this.halfWidth);
    drawHLine(this.xRight + this.halfWidth, this.width, this.yBottom + this.halfWidth);

    // Vertical left edges
    drawVLine(this.xLeft - this.halfWidth, 0, this.yTop - this.halfWidth);
    drawVLine(this.xLeft - this.halfWidth, this.yTop + this.halfWidth, this.yBottom - this.halfWidth);
    drawVLine(this.xLeft - this.halfWidth, this.yBottom + this.halfWidth, this.height);

    drawVLine(this.xLeft + this.halfWidth, 0, this.yTop - this.halfWidth);
    drawVLine(this.xLeft + this.halfWidth, this.yTop + this.halfWidth, this.yBottom - this.halfWidth);
    drawVLine(this.xLeft + this.halfWidth, this.yBottom + this.halfWidth, this.height);

    // Vertical right edges
    drawVLine(this.xRight - this.halfWidth, 0, this.yTop - this.halfWidth);
    drawVLine(this.xRight - this.halfWidth, this.yTop + this.halfWidth, this.yBottom - this.halfWidth);
    drawVLine(this.xRight - this.halfWidth, this.yBottom + this.halfWidth, this.height);

    drawVLine(this.xRight + this.halfWidth, 0, this.yTop - this.halfWidth);
    drawVLine(this.xRight + this.halfWidth, this.yTop + this.halfWidth, this.yBottom - this.halfWidth);
    drawVLine(this.xRight + this.halfWidth, this.yBottom + this.halfWidth, this.height);

    // 3. Double Yellow Centerlines (between intersections)
    ctx.strokeStyle = markingYellow;
    ctx.lineWidth = 1.5;

    const drawDoubleYellowH = (x1, x2, y) => {
      ctx.beginPath();
      ctx.moveTo(x1, y - 2);
      ctx.lineTo(x2, y - 2);
      ctx.moveTo(x1, y + 2);
      ctx.lineTo(x2, y + 2);
      ctx.stroke();
    };

    const drawDoubleYellowV = (x, y1, y2) => {
      ctx.beginPath();
      ctx.moveTo(x - 2, y1);
      ctx.lineTo(x - 2, y2);
      ctx.moveTo(x + 2, y1);
      ctx.lineTo(x + 2, y2);
      ctx.stroke();
    };

    drawDoubleYellowH(0, this.xLeft - this.halfWidth - 16, this.yTop);
    drawDoubleYellowH(this.xLeft + this.halfWidth + 16, this.xRight - this.halfWidth - 16, this.yTop);
    drawDoubleYellowH(this.xRight + this.halfWidth + 16, this.width, this.yTop);

    drawDoubleYellowH(0, this.xLeft - this.halfWidth - 16, this.yBottom);
    drawDoubleYellowH(this.xLeft + this.halfWidth + 16, this.xRight - this.halfWidth - 16, this.yBottom);
    drawDoubleYellowH(this.xRight + this.halfWidth + 16, this.width, this.yBottom);

    drawDoubleYellowV(this.xLeft, 0, this.yTop - this.halfWidth - 16);
    drawDoubleYellowV(this.xLeft, this.yTop + this.halfWidth + 16, this.yBottom - this.halfWidth - 16);
    drawDoubleYellowV(this.xLeft, this.yBottom + this.halfWidth + 16, this.height);

    drawDoubleYellowV(this.xRight, 0, this.yTop - this.halfWidth - 16);
    drawDoubleYellowV(this.xRight, this.yTop + this.halfWidth + 16, this.yBottom - this.halfWidth - 16);
    drawDoubleYellowV(this.xRight, this.yBottom + this.halfWidth + 16, this.height);

    // 4. Pedestrian Crosswalks & Stop Lines at Intersections
    const intersections = [
      { x: this.xLeft, y: this.yTop },
      { x: this.xRight, y: this.yTop },
      { x: this.xLeft, y: this.yBottom },
      { x: this.xRight, y: this.yBottom }
    ];

    intersections.forEach(node => {
      this.renderCrosswalksAndStopLines(ctx, node.x, node.y, markingWhite);
    });
  }

  renderCrosswalksAndStopLines(ctx, cx, cy, color) {
    const hw = this.halfWidth; // 32
    ctx.fillStyle = color;
    ctx.strokeStyle = color;

    // Crosswalk Zebra Stripes helper
    const drawCrosswalkH = (x, y) => {
      for (let i = -hw + 4; i < hw - 4; i += 7) {
        ctx.fillRect(x - 5, y + i, 10, 4);
      }
    };
    const drawCrosswalkV = (x, y) => {
      for (let i = -hw + 4; i < hw - 4; i += 7) {
        ctx.fillRect(x + i, y - 5, 4, 10);
      }
    };

    // North Approach
    drawCrosswalkV(cx, cy - hw - 8);
    // North Stop Line
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - hw, cy - hw - 15);
    ctx.lineTo(cx, cy - hw - 15); // for southbound incoming right lane
    ctx.stroke();

    // South Approach
    drawCrosswalkV(cx, cy + hw + 8);
    // South Stop Line
    ctx.beginPath();
    ctx.moveTo(cx, cy + hw + 15);
    ctx.lineTo(cx + hw, cy + hw + 15); // for northbound incoming right lane
    ctx.stroke();

    // West Approach
    drawCrosswalkH(cx - hw - 8, cy);
    // West Stop Line
    ctx.beginPath();
    ctx.moveTo(cx - hw - 15, cy);
    ctx.lineTo(cx - hw - 15, cy + hw); // for eastbound incoming right lane
    ctx.stroke();

    // East Approach
    drawCrosswalkH(cx + hw + 8, cy);
    // East Stop Line
    ctx.beginPath();
    ctx.moveTo(cx + hw + 15, cy - hw);
    ctx.lineTo(cx + hw + 15, cy); // for westbound incoming right lane
    ctx.stroke();
  }
}
