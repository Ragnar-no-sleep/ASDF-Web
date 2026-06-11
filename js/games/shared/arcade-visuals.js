/**
 * ASDF Games - Shared Arcade Visuals
 *
 * Reusable drawing primitives used by all arcade engines.
 * Focused on:
 * - Consistent ASDF ember styling
 * - Lightweight, scalable canvas operations
 * - Modular helpers so visual updates remain centralized
 */

'use strict';

(function () {
  const FONT_STACK = 'Orbitron, "JetBrains Mono", sans-serif';
  const H1_FONT = `700 34px ${FONT_STACK}`;
  const H2_FONT = `600 20px ${FONT_STACK}`;
  const BODY_FONT = `600 14px ${FONT_STACK}`;
  const UI_FONT = `500 13px ${FONT_STACK}`;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function hash(v) {
    return (Math.sin(v * 127.1) * 43758.5453123) % 1;
  }

  function randSeed(seed, idx) {
    return (hash(seed + idx) + 1) * 0.5;
  }

  function roundRect(ctx, x, y, w, h, r = 6) {
    const radius = Math.max(1, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function hexPath(ctx, x, y, size) {
    const segments = 6;
    const radius = Math.max(1, size);
    ctx.beginPath();
    for (let i = 0; i < segments; i++) {
      const angle = (Math.PI * 2 * i) / segments - Math.PI / 6;
      const px = x + Math.cos(angle) * radius;
      const py = y + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function drawGlowText(
    ctx,
    text,
    x,
    y,
    color,
    glowColor,
    size = 14,
    center = 'center',
    weight = '600'
  ) {
    const t = `${weight} ${size}px ${FONT_STACK}`;
    ctx.save();
    ctx.font = t;
    ctx.textAlign = center;
    ctx.textBaseline = 'middle';
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = Math.max(4, size * 0.35);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 0;
    ctx.fillStyle = `${color}`;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function drawNoiseField(ctx, w, h, alpha = 0.04, seed = 11) {
    const step = 3;
    const maxY = h + step;
    for (let y = 0; y < maxY; y += step) {
      for (let x = 0; x < w; x += step) {
        const jitter = randSeed(seed, x * 0.011 + y * 0.009) * 1.9;
        const flick = jitter > 0.955 ? 1 : 0;
        if (!flick) continue;
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }
  }

  const themes = {
    default: {
      bgTop: '#0a0a0f',
      bgMid: '#2a1005',
      bgBot: '#070504',
      grid: 'rgba(251,146,60,0.1)',
      accent: '#fb923c',
      amber: '#fbbf24',
      mint: '#22c55e',
      magenta: '#f97316',
      danger: '#ef4444',
      panel: 'rgba(18,7,3,0.7)',
      panelLine: 'rgba(251,146,60,0.22)',
      scanline: 'rgba(2, 6, 23, 0.1)',
      pulse: 'rgba(251,146,60,0.24)',
    },
    racer: {
      bgTop: '#0b0d10',
      bgMid: '#20140b',
      bgBot: '#070504',
      grid: 'rgba(255,255,255,0.1)',
      accent: '#ef4444',
      amber: '#fcd34d',
      mint: '#22c55e',
      magenta: '#f97316',
      danger: '#dc2626',
      panel: 'rgba(9,13,18,0.74)',
      panelLine: 'rgba(255,255,255,0.18)',
      scanline: 'rgba(2, 6, 23, 0.12)',
      pulse: 'rgba(255,255,255,0.18)',
    },
  };

  const ArcadeVisuals = {
    fonts: {
      stack: FONT_STACK,
      h1: H1_FONT,
      h2: H2_FONT,
      body: BODY_FONT,
      ui: UI_FONT,
    },

    theme(name = 'default') {
      return themes[name] || themes.default;
    },

    getTheme(name = 'default') {
      return this.theme(name);
    },

    clamp,
    lerp,
    roundRect,
    hexPath,

    setFont(ctx, sizePx = 14, weight = 600, family = FONT_STACK) {
      ctx.font = `${weight} ${sizePx}px ${family}`;
      return ctx.font;
    },

    getPalette(name = 'default') {
      return this.theme(name);
    },

    drawBackdrop(ctx, w, h, opts = {}) {
      const {
        theme = 'default',
        top = 0,
        bottom = h,
        alphaBoost = 1,
        withNoise = false,
        seed = 0,
      } = opts;

      const distance = opts.distance || 0;
      const t = this.theme(theme);
      const grad = ctx.createLinearGradient(0, top, 0, bottom);
      grad.addColorStop(0, t.bgTop);
      grad.addColorStop(0.5, t.bgMid);
      grad.addColorStop(1, t.bgBot);

      ctx.fillStyle = grad;
      ctx.globalAlpha = clamp(alphaBoost, 0, 1);
      ctx.fillRect(0, top, w, bottom - top);
      ctx.globalAlpha = 1;

      const height = bottom - top;

      // PARALLAX SUN
      const sunX = w * 0.5 + Math.sin(distance * 0.001) * (w * 0.1);
      const sunY = top + height * 0.32;
      const sunR = Math.max(54, Math.min(126, w * 0.14, height * 0.22));

      ctx.save();
      const sunGrad = ctx.createLinearGradient(0, sunY - sunR, 0, sunY + sunR);
      sunGrad.addColorStop(0, '#fbbf24');
      sunGrad.addColorStop(0.4, '#fb923c');
      sunGrad.addColorStop(0.72, '#ea580c');
      sunGrad.addColorStop(1, '#7c2d12');
      ctx.globalAlpha = 0.34;
      ctx.fillStyle = sunGrad;
      ctx.beginPath();
      ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
      ctx.fill();

      // Sun Scanlines (Moving)
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = '#160a05';
      const sunOffset = (distance * 0.5) % 14;
      for (let y = sunY - sunR * 0.42 + sunOffset; y < sunY + sunR * 0.78; y += 14) {
        const span = Math.sqrt(Math.max(0, sunR * sunR - (y - sunY) * (y - sunY)));
        ctx.fillRect(sunX - span, y, span * 2, 4);
      }
      ctx.restore();

      // PARALLAX MOUNTAINS
      ctx.save();
      const groundY = top + height * 0.82;
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#160b06';

      const drawLayer = (offsetMult, color, hMult) => {
        ctx.fillStyle = color;
        const mOff = (distance * offsetMult) % w;
        ctx.beginPath();
        ctx.moveTo(-w + mOff, groundY);
        ctx.lineTo(-w * 0.8 + mOff, top + height * (0.82 - 0.15 * hMult));
        ctx.lineTo(-w * 0.6 + mOff, groundY);
        ctx.lineTo(-w * 0.4 + mOff, top + height * (0.82 - 0.1 * hMult));
        ctx.lineTo(-w * 0.2 + mOff, groundY);
        ctx.lineTo(mOff, top + height * (0.82 - 0.2 * hMult));

        ctx.lineTo(w * 0.2 + mOff, groundY);
        ctx.lineTo(w * 0.4 + mOff, top + height * (0.82 - 0.12 * hMult));
        ctx.lineTo(w * 0.6 + mOff, groundY);
        ctx.lineTo(w * 0.8 + mOff, top + height * (0.82 - 0.18 * hMult));
        ctx.lineTo(w + mOff, groundY);

        ctx.lineTo(w * 1.2 + mOff, top + height * (0.82 - 0.15 * hMult));
        ctx.lineTo(w * 1.4 + mOff, groundY);

        ctx.lineTo(w * 1.5, groundY);
        ctx.lineTo(-w * 0.5, groundY);
        ctx.closePath();
        ctx.fill();
      };

      drawLayer(0.2, '#0a0502', 0.6); // Far layer
      drawLayer(0.5, '#160b06', 1.0); // Near layer

      ctx.restore();

      // Horizon line
      ctx.fillStyle = '#070504';
      ctx.fillRect(0, groundY, w, Math.max(0, bottom - groundY));
      ctx.fillStyle = 'rgba(251,191,36,0.66)';
      ctx.fillRect(0, groundY, w, 2);

      ctx.globalAlpha = 0.18;
      ctx.strokeStyle = '#ffcc00';
      ctx.lineWidth = 1;
      const gridScroll = (distance * 5) % 34;
      for (let y = groundY + 24 - gridScroll; y < bottom + 34; y += 34) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      ctx.restore();

      if (withNoise && opts.allowNoise) {
        drawNoiseField(ctx, w, h, 0.004, 99 + seed);
      }
    },

    drawGrid(ctx, w, h, opts = {}) {
      ctx.save();
      ctx.fillStyle = opts.color || 'rgba(255,204,0,0.08)';
      ctx.fillRect(0, Math.max(0, h * 0.84), w, 2);
      ctx.restore();
    },

    drawScanlines(ctx, w, h, opts = {}) {
      const { density = 3.5, speed = 6, alpha = 0.08, color = 'rgba(241,245,249,0.14)' } = opts;
      const t = (performance.now() / 1000) * speed;
      const step = Math.max(1, Math.round((1 / density) * 4));
      ctx.save();
      ctx.globalAlpha = alpha;
      for (let y = -20; y < h + 24; y += 5) {
        const jitter = (Math.sin((y + t * 12) * 0.06) * 2.2) | 0;
        const x = ((t * 2.2 + jitter) % 10) - 3;
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w, step);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    },

    drawNeonFrame(ctx, w, h, opts = {}) {
      const {
        inset = 8,
        line = 'rgba(148,163,184,0.4)',
        glow = 'rgba(251,146,60,0.24)',
        thickness = 1.4,
      } = opts;
      ctx.save();
      ctx.strokeStyle = line;
      ctx.lineWidth = thickness;
      ctx.shadowColor = glow;
      ctx.shadowBlur = 10;
      roundRect(ctx, inset, inset, w - inset * 2, h - inset * 2, 6);
      ctx.stroke();
      ctx.restore();
    },

    drawPulseRing(ctx, x, y, baseR, theme = 'default', maxR = baseR * 1.45, alpha = 0.4) {
      const t = this.theme(theme);
      const breath = (Math.sin(performance.now() / 350) + 1) * 0.5;
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, baseR + breath * (maxR - baseR), 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = Math.max(1, baseR * 0.08);
      ctx.shadowColor = t.amber;
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.restore();
    },

    drawStatBar(ctx, x, y, w, h, ratio, opts = {}) {
      const { theme = 'default', min = 0, max = 1, track = 'rgba(15,23,42,0.7)' } = opts;
      const t = this.theme(theme);
      const value = clamp((ratio - min) / (max - min || 1), 0, 1);
      roundRect(ctx, x, y, w, h, 3);
      ctx.fillStyle = track;
      ctx.fill();
      const fill = w * value;
      const grad = ctx.createLinearGradient(x, y, x + fill, y);
      grad.addColorStop(0, t.accent);
      grad.addColorStop(1, t.mint);
      ctx.fillStyle = grad;
      roundRect(ctx, x + 1, y + 1, Math.max(0, fill - 2), Math.max(0, h - 2), 2);
      ctx.fill();
      ctx.strokeStyle = t.panelLine;
      ctx.lineWidth = 1;
      ctx.stroke();
    },

    drawHUD(ctx, x, y, label, value, opts = {}) {
      const { width = 112, height = 36, theme = 'default', showDivider = false } = opts;
      const t = this.theme(theme);
      ctx.save();
      this.roundRect(ctx, x, y, width, height, 6);
      ctx.fillStyle = t.panel;
      ctx.fill();
      ctx.strokeStyle = t.panelLine;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#f8fafc';
      this.setFont(ctx, 10, 500);
      ctx.globalAlpha = 0.74;
      ctx.fillText(label, x + 10, y + 13);
      ctx.globalAlpha = 1;
      drawGlowText(ctx, String(value), x + 10, y + 24, '#f8fafc', t.amber, 14, 'left', '600');
      if (showDivider) {
        ctx.fillStyle = 'rgba(251,191,36,0.24)';
        ctx.fillRect(x + 10, y + 28, width - 20, 1.2);
      }
      ctx.restore();
    },

    drawNeonText(ctx, value, x, y, color, glow, size = 14, align = 'left') {
      drawGlowText(ctx, value, x, y, color, glow, size, align);
    },

    drawRoadDepth(ctx, layout, h, state, color = 'rgba(31, 41, 55, 0.66)', theme = 'racer') {
      const steps = 18;
      ctx.fillStyle = color || 'rgba(9, 5, 16, 0.86)';
      ctx.beginPath();
      ctx.moveTo(layout.roadLeft(0), layout.projectY(0));
      ctx.lineTo(layout.roadLeft(0) + layout.roadWidth(0), layout.projectY(0));
      ctx.lineTo(layout.roadLeft(1) + layout.roadWidth(1), layout.projectY(1));
      ctx.lineTo(layout.roadLeft(1), layout.projectY(1));
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(251,146,60,0.7)';
      ctx.lineWidth = 3;
      for (let edge = 0; edge <= 1; edge++) {
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const depth = i / steps;
          const x = layout.roadLeft(depth) + edge * layout.roadWidth(depth);
          const y = layout.projectY(depth);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      ctx.strokeStyle = 'rgba(255,244,204,0.24)';
      ctx.lineWidth = 1.4;
      for (let lane = 1; lane < layout.lanes; lane++) {
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const depth = i / steps;
          const x = layout.roadLeft(depth) + (layout.roadWidth(depth) * lane) / layout.lanes;
          const y = layout.projectY(depth);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    },

    drawF1Car(ctx, x, y, opts = {}) {
      const t = this.theme('racer');
      const {
        length = 104,
        width = 44,
        scale = 1,
        palette = ['#ef4444', '#f87171', '#0b1220', '#facc15', '#7dd3fc'],
        lean = 0,
        glow = 0.25,
        active = false,
      } = opts;
      const l = length * scale;
      const w = width * scale;
      const carW = Math.max(18, w);
      const carL = Math.max(42, Math.min(l, carW * 2.25));

      const bodyColor = palette[0];
      const stripe = palette[1];
      const shell = palette[2];
      const wing = palette[3];
      const glass = palette[4];

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(lean * 0.18);
      ctx.shadowColor = active ? 'rgba(250, 204, 21, 0.22)' : 'rgba(148, 163, 184, 0)';
      ctx.shadowBlur = active ? Math.max(4, carL * 0.05) : 0;

      this.roundRect(ctx, -carL * 0.46, -carW * 0.18, carL * 0.92, carW * 0.48, 7);
      const shellGr = ctx.createLinearGradient(-carL * 0.46, -carW * 0.18, carL * 0.46, carW * 0.3);
      shellGr.addColorStop(0, bodyColor);
      shellGr.addColorStop(0.7, stripe);
      shellGr.addColorStop(1, '#dc2626');
      ctx.fillStyle = shellGr;
      ctx.fill();

      ctx.fillStyle = shell;
      this.roundRect(ctx, -carL * 0.36, -carW * 0.1, carL * 0.24, carW * 0.22, 4);
      ctx.fill();

      ctx.fillStyle = bodyColor;
      this.roundRect(ctx, carL * 0.34, -carW * 0.08, carL * 0.18, carW * 0.16, 4);
      ctx.fill();

      const wheelW = carL * 0.12;
      const wheelH = carW * 0.14;
      const wheelYf = carW * 0.22;
      const wheelYr = carW * 0.0;
      for (const side of [-1, 1]) {
        const cx = side * carL * 0.22;
        ctx.fillStyle = '#111827';
        ctx.beginPath();
        ctx.ellipse(cx - wheelW * 0.45, wheelYf, wheelW * 0.52, wheelH * 0.45, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + wheelW * 0.45, wheelYf, wheelW * 0.52, wheelH * 0.45, 0, 0, Math.PI * 2);
        ctx.ellipse(cx - wheelW * 0.45, wheelYr, wheelW * 0.52, wheelH * 0.45, 0, 0, Math.PI * 2);
        ctx.ellipse(cx + wheelW * 0.45, wheelYr, wheelW * 0.52, wheelH * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = glass;
      this.roundRect(ctx, -carL * 0.08, -carW * 0.1, carL * 0.22, carW * 0.12, 3);
      ctx.fill();

      ctx.fillStyle = wing;
      this.roundRect(ctx, -carL * 0.38, carW * 0.16, carL * 0.1, carW * 0.05, 2);
      this.roundRect(ctx, carL * 0.3, carW * 0.16, carL * 0.1, carW * 0.05, 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(-carL * 0.14, -carW * 0.03, carL * 0.16, 2);

      ctx.fillStyle = wing;
      this.roundRect(ctx, -carL * 0.06, carW * 0.18, carL * 0.12, carW * 0.05, 2);
      ctx.fill();
      if (active) {
        ctx.fillStyle = `rgba(251,191,36,${glow})`;
        ctx.fillRect(carL * 0.38, -carW * 0.02, 4, 2);
      }
      ctx.restore();
    },

    drawThreatNode(ctx, x, y, size, opts = {}) {
      const t = this.theme('default');
      const {
        shape = 'hex',
        primary = '#ef4444',
        secondary = '#7f1d1d',
        accent = '#fef08a',
        icon = '!',
        label = 'SCAM',
        threat = 1,
        intensity = 1,
        spin = 0,
        pulse = 1,
        width = size,
        height = size,
      } = opts;

      const w = Math.max(16, width);
      const h = Math.max(12, height);
      const radius = Math.max(8, Math.min(w, h) * 0.5);
      const core = Math.max(5, Math.min(radius * 0.56, 18));

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(performance.now() * 0.001 + spin) * 0.03);
      const grad = ctx.createLinearGradient(
        -radius * 0.4,
        -radius * 0.4,
        radius * 0.4,
        radius * 0.4
      );
      grad.addColorStop(0, primary);
      grad.addColorStop(1, secondary);
      ctx.fillStyle = grad;
      ctx.strokeStyle = 'rgba(226,232,240,0.24)';
      ctx.lineWidth = 1.2;
      const drawBody = () => {
        if (shape === 'diamond') {
          ctx.beginPath();
          ctx.moveTo(0, -core * 1.02);
          ctx.lineTo(core * 0.9, 0);
          ctx.lineTo(0, core * 0.84);
          ctx.lineTo(-core * 0.9, 0);
          ctx.closePath();
        } else if (shape === 'shield') {
          ctx.beginPath();
          ctx.moveTo(0, -core * 0.9);
          ctx.quadraticCurveTo(core * 0.78, -core * 0.58, core * 0.75, -core * 0.08);
          ctx.quadraticCurveTo(core * 0.75, core * 0.72, 0, core * 0.88);
          ctx.quadraticCurveTo(-core * 0.75, core * 0.72, -core * 0.75, -core * 0.08);
          ctx.quadraticCurveTo(-core * 0.78, -core * 0.58, 0, -core * 0.9);
          ctx.closePath();
        } else if (shape === 'plate') {
          this.roundRect(
            ctx,
            -core * 0.85,
            -core * 0.65,
            core * 1.7,
            core * 1.28,
            Math.max(2, radius * 0.2)
          );
        } else {
          const ringCount = 6;
          for (let i = 0; i < ringCount; i++) {
            const a = (Math.PI * 2 * i) / ringCount - Math.PI / 6;
            const px = Math.cos(a) * core * 0.7;
            const py = Math.sin(a) * core * 0.62;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
        }
      };

      drawBody();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
      this.roundRect(
        ctx,
        -core * 0.52,
        -core * 0.28,
        core * 1.04,
        core * 0.44,
        Math.max(2, radius * 0.12)
      );
      ctx.fill();
      ctx.fillStyle = accent;
      ctx.fillRect(-core * 0.18, -core * 0.06, core * 0.36, core * 0.12);

      ctx.fillStyle = '#f8fafc';
      const iconSize = Math.max(9, Math.min(core * 1.18, 22));
      ctx.font = `800 ${iconSize}px ${FONT_STACK}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = `rgba(251,191,36,${0.24 + threat * 0.06})`;
      ctx.shadowBlur = Math.max(2, radius * 0.1);
      ctx.fillText(String(icon).slice(0, 4), 0, 1);

      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.84)';
      ctx.font = `600 ${Math.max(8, Math.min(11, core * 0.66))}px ${FONT_STACK}`;
      ctx.fillText(`${label}`, 0, core * 0.72);

      const fillRatio = Math.max(0.1, Math.min(1, (intensity || 1) / 10));
      ctx.fillStyle = 'rgba(226,232,240,0.2)';
      ctx.fillRect(-core * 0.7, core * 0.88, core * 1.4, 3);
      ctx.fillStyle = threat >= 9 ? t.danger : t.mint;
      ctx.fillRect(-core * 0.7, core * 0.88, core * 1.4 * fillRatio, 3);

      ctx.restore();
    },

    drawRacerVehicle(ctx, x, y, opts = {}) {
      const {
        length = 126,
        width = 48,
        scale = 1,
        palette = ['#ef4444', '#f87171', '#0b1220', '#facc15', '#7dd3fc'],
        colorShift = 0,
        active = false,
      } = opts;

      this.drawF1Car(ctx, x, y, {
        length: length * scale,
        width,
        scale: 1,
        palette,
        lean: Math.sin(performance.now() * 0.0015 + colorShift) * 0.06,
        glow: active ? 0.75 : 0.33,
        active,
      });

      const bodyGlow =
        (0.1 + (Math.sin(performance.now() * 0.006 + colorShift) + 1) * 0.09) * scale;
      const bodyLength = Math.max(44, Math.min(length * scale, Math.max(24, width * scale) * 2.25));
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = `rgba(251,191,36,${bodyGlow})`;
      ctx.beginPath();
      this.roundRect(
        ctx,
        -bodyLength * 0.42,
        -width * scale * 0.1,
        bodyLength * 0.84,
        width * scale * 0.18,
        2
      );
      ctx.fill();
      ctx.fillStyle = `rgba(15,23,42,${0.34 + scale * 0.2})`;
      ctx.beginPath();
      ctx.fillRect(
        -bodyLength * 0.42 + bodyLength * 0.03,
        -width * scale * 0.06,
        Math.max(2, width * scale * 0.08),
        Math.max(1, width * scale * 0.08)
      );
      ctx.fill();
      ctx.restore();
    },

    drawStackGrid(ctx, w, h, horizonY, speed = 0) {
      const bandY = Math.min(h - 20, h - horizonY * 0.5);
      ctx.fillStyle = 'rgba(255,204,0,0.22)';
      ctx.fillRect(w * 0.42, bandY, w * 0.16, 3);
    },
  };

  if (typeof window !== 'undefined') {
    window.ASDF = window.ASDF || {};
    window.ASDF.ArcadeVisuals = ArcadeVisuals;
    window.ArcadeVisuals = ArcadeVisuals;
  }
})();
