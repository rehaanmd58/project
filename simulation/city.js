/**
 * ResQRoute 2D – City Environment & Landscape Definitions
 * Contains map bounds, buildings, parks, sidewalks, and urban props.
 */

export const CITY_CONFIG = {
  width: 920,
  height: 740,
  roadWidth: 64,
  laneWidth: 16,
  laneOffset: 16,
  intersections: {
    A: { id: 'A', name: 'Downtown Hub (A)', x: 240, y: 200 },
    B: { id: 'B', name: 'Medical District (B)', x: 680, y: 200 },
    C: { id: 'C', name: 'Civic Center (C)', x: 240, y: 540 },
    D: { id: 'D', name: 'Industrial Park (D)', x: 680, y: 540 }
  }
};

export class City {
  constructor() {
    this.width = CITY_CONFIG.width;
    this.height = CITY_CONFIG.height;
    this.intersections = CITY_CONFIG.intersections;
    this.buildings = this.generateBuildings();
    this.trees = this.generateTrees();
    this.streetLights = this.generateStreetLights();
    this.theme = 'night'; // default traffic control room night view
  }

  setTheme(theme) {
    this.theme = theme;
  }

  generateBuildings() {
    return [
      // Top-Left Zone (Northwest of A)
      { x: 30, y: 30, w: 160, h: 120, type: 'hospital', name: 'Central Hospital', color: '#1e293b', roofColor: '#0f172a', accent: '#ef4444' },
      
      // Top-Center Zone (Between A and B, North of Road)
      { x: 290, y: 30, w: 160, h: 120, type: 'office', name: 'Metropolis Tower', color: '#1e293b', roofColor: '#172554', accent: '#3b82f6' },
      { x: 470, y: 30, w: 160, h: 120, type: 'commercial', name: 'Tech Plaza', color: '#1e293b', roofColor: '#0f172a', accent: '#06b6d4' },

      // Top-Right Zone (Northeast of B)
      { x: 730, y: 30, w: 160, h: 120, type: 'fire_station', name: 'Fire Station #1', color: '#1e293b', roofColor: '#450a0a', accent: '#ef4444' },

      // Middle-Center Zone (Center Island between A, B, C, D)
      { x: 290, y: 250, w: 170, h: 240, type: 'park', name: 'Civic Green Park', color: '#064e3b', roofColor: '#042f2e', accent: '#10b981' },
      { x: 480, y: 250, w: 150, h: 110, type: 'police_hq', name: 'Police Department HQ', color: '#1e293b', roofColor: '#172554', accent: '#3b82f6' },
      { x: 480, y: 380, w: 150, h: 110, type: 'office', name: 'Traffic Control Center', color: '#1e293b', roofColor: '#022c22', accent: '#10b981' },

      // Bottom-Left Zone (Southwest of C)
      { x: 30, y: 590, w: 160, h: 120, type: 'residential', name: 'Harbor Heights', color: '#1e293b', roofColor: '#1e1b4b', accent: '#8b5cf6' },

      // Bottom-Center Zone (Between C and D, South of Road)
      { x: 290, y: 590, w: 170, h: 120, type: 'commercial', name: 'Grand Mall', color: '#1e293b', roofColor: '#0f172a', accent: '#f59e0b' },
      { x: 480, y: 590, w: 150, h: 120, type: 'office', name: 'Innovation Lab', color: '#1e293b', roofColor: '#172554', accent: '#3b82f6' },

      // Bottom-Right Zone (Southeast of D)
      { x: 730, y: 590, w: 160, h: 120, type: 'industrial', name: 'Logistics Terminal', color: '#1e293b', roofColor: '#312e81', accent: '#6366f1' },

      // Middle-Left Zone (West of A-C corridor)
      { x: 30, y: 250, w: 160, h: 240, type: 'residential', name: 'Westside Residential', color: '#1e293b', roofColor: '#0f172a', accent: '#64748b' },

      // Middle-Right Zone (East of B-D corridor)
      { x: 730, y: 250, w: 160, h: 240, type: 'commercial', name: 'Eastside Retail Hub', color: '#1e293b', roofColor: '#0f172a', accent: '#06b6d4' }
    ];
  }

  generateTrees() {
    const trees = [];
    // Plant trees along central park (290, 250, 170, 240)
    for (let x = 310; x <= 440; x += 32) {
      for (let y = 270; y <= 470; y += 38) {
        trees.push({ x, y, r: 10 + (Math.sin(x + y) * 3) });
      }
    }
    // Trees along perimeter boulevards
    const spots = [
      { x: 205, y: 110 }, { x: 205, y: 370 }, { x: 205, y: 640 },
      { x: 645, y: 110 }, { x: 645, y: 370 }, { x: 645, y: 640 },
      { x: 130, y: 180 }, { x: 580, y: 180 }, { x: 130, y: 520 }, { x: 580, y: 520 }
    ];
    spots.forEach(pt => trees.push({ x: pt.x, y: pt.y, r: 8 }));
    return trees;
  }

  generateStreetLights() {
    return [
      { x: 200, y: 160 }, { x: 280, y: 160 }, { x: 200, y: 240 }, { x: 280, y: 240 },
      { x: 640, y: 160 }, { x: 720, y: 160 }, { x: 640, y: 240 }, { x: 720, y: 240 },
      { x: 200, y: 500 }, { x: 280, y: 500 }, { x: 200, y: 580 }, { x: 280, y: 580 },
      { x: 640, y: 500 }, { x: 720, y: 500 }, { x: 640, y: 580 }, { x: 720, y: 580 },
      { x: 460, y: 160 }, { x: 460, y: 240 }, { x: 460, y: 500 }, { x: 460, y: 580 },
      { x: 200, y: 370 }, { x: 280, y: 370 }, { x: 640, y: 370 }, { x: 720, y: 370 }
    ];
  }

  render(ctx) {
    const isNight = this.theme === 'night';

    // 1. Base terrain ground
    ctx.fillStyle = isNight ? '#080d1a' : '#e2e8f0';
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Sidewalk blocks / city parcels
    ctx.fillStyle = isNight ? '#0d1527' : '#cbd5e1';
    ctx.fillRect(15, 15, 190, 150);
    ctx.fillRect(275, 15, 370, 150);
    ctx.fillRect(715, 15, 190, 150);

    ctx.fillRect(15, 235, 190, 270);
    ctx.fillRect(275, 235, 370, 270);
    ctx.fillRect(715, 235, 190, 270);

    ctx.fillRect(15, 575, 190, 150);
    ctx.fillRect(275, 575, 370, 150);
    ctx.fillRect(715, 575, 190, 150);

    // 3. Render buildings
    this.buildings.forEach(b => {
      // Building drop shadow
      ctx.fillStyle = isNight ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.12)';
      ctx.fillRect(b.x + 4, b.y + 6, b.w, b.h);

      // Building main body
      if (b.type === 'park') {
        ctx.fillStyle = isNight ? '#064e3b' : '#a7f3d0';
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeStyle = isNight ? '#047857' : '#059669';
        ctx.lineWidth = 2;
        ctx.strokeRect(b.x, b.y, b.w, b.h);

        // Park paths
        ctx.strokeStyle = isNight ? '#1e293b' : '#f1f5f9';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(b.x + b.w / 2, b.y);
        ctx.lineTo(b.x + b.w / 2, b.y + b.h);
        ctx.moveTo(b.x, b.y + b.h / 2);
        ctx.lineTo(b.x + b.w, b.y + b.h / 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = isNight ? b.roofColor : '#ffffff';
        ctx.fillRect(b.x, b.y, b.w, b.h);

        // Architectural border
        ctx.strokeStyle = isNight ? '#223049' : '#94a3b8';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(b.x, b.y, b.w, b.h);

        // Roof details / HVAC / Helipad
        if (b.type === 'hospital') {
          // Helipad
          const cx = b.x + b.w / 2;
          const cy = b.y + b.h / 2;
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(cx, cy, 24, 0, Math.PI * 2);
          ctx.stroke();

          // Red Cross
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(cx - 4, cy - 14, 8, 28);
          ctx.fillRect(cx - 14, cy - 4, 28, 8);
        } else if (b.type === 'fire_station') {
          // Fire Station yellow/red stripes
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(b.x + 10, b.y + 10, b.w - 20, 10);
        } else if (b.type === 'police_hq') {
          // Police star badge
          ctx.fillStyle = '#3b82f6';
          ctx.fillRect(b.x + 10, b.y + 10, b.w - 20, 8);
        } else {
          // Office HVAC boxes
          ctx.fillStyle = isNight ? '#0b1120' : '#e2e8f0';
          ctx.fillRect(b.x + 15, b.y + 15, 30, 20);
          ctx.fillRect(b.x + b.w - 45, b.y + 20, 25, 25);
        }

        // Building Label
        ctx.fillStyle = isNight ? '#94a3b8' : '#334155';
        ctx.font = '600 10px Plus Jakarta Sans, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(b.name, b.x + b.w / 2, b.y + b.h - 10);
      }
    });

    // 4. Render Trees
    this.trees.forEach(t => {
      ctx.fillStyle = isNight ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.1)';
      ctx.beginPath();
      ctx.arc(t.x + 2, t.y + 2, t.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isNight ? '#15803d' : '#22c55e';
      ctx.beginPath();
      ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = isNight ? '#166534' : '#15803d';
      ctx.beginPath();
      ctx.arc(t.x - 2, t.y - 2, t.r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    });

    // 5. Streetlight glows (at night)
    if (isNight) {
      this.streetLights.forEach(sl => {
        const radGlow = ctx.createRadialGradient(sl.x, sl.y, 2, sl.x, sl.y, 24);
        radGlow.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
        radGlow.addColorStop(0.5, 'rgba(254, 240, 138, 0.12)');
        radGlow.addColorStop(1, 'rgba(254, 240, 138, 0)');
        ctx.fillStyle = radGlow;
        ctx.beginPath();
        ctx.arc(sl.x, sl.y, 24, 0, Math.PI * 2);
        ctx.fill();

        // Lamp post base
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.arc(sl.x, sl.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }
}
