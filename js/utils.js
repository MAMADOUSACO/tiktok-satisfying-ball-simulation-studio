/**
 * Utility functions and helpers for the Bouncing Balls Editor
 */

// Global error logging (to diagnose "Script error")
window.addEventListener('error', (e) => {
  console.error('[window.onerror]', e.message, e.error || '(no error object)');
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('[unhandledrejection]', e.reason);
});

// Modern+legacy Blockly XML helpers
const BX = {
  textToDom(xml) {
    if (Blockly.utils?.xml?.textToDom) return Blockly.utils.xml.textToDom(xml);
    if (Blockly.Xml?.textToDom) return Blockly.Xml.textToDom(xml);
    throw new Error('No textToDom in this Blockly build');
  },
  
  domToWorkspace(dom, ws) {
    if (Blockly.Xml?.domToWorkspace) return Blockly.Xml.domToWorkspace(dom, ws);
    if (Blockly.Xml?.appendDomToWorkspace) return Blockly.Xml.appendDomToWorkspace(dom, ws);
    throw new Error('No domToWorkspace in this Blockly build');
  },
  
  workspaceToDom(ws) {
    if (Blockly.Xml?.workspaceToDom) return Blockly.Xml.workspaceToDom(ws);
    return null;
  },
  
  domToPrettyText(dom) {
    if (Blockly.Xml?.domToPrettyText) return Blockly.Xml.domToPrettyText(dom);
    if (Blockly.utils?.xml?.domToText) return Blockly.utils.xml.domToText(dom);
    return new XMLSerializer().serializeToString(dom);
  }
};

// Deterministic random number generation
let rng = Math.random;

function applySeed(seed) {
  try {
    rng = new Math.seedrandom(seed || 'default-seed');
  } catch {
    rng = Math.random;
  }
}

function randColor() {
  const h = (rng() * 360) | 0;
  const s = 60 + ((rng() * 30) | 0);
  const l = 50 + ((rng() * 10) | 0);
  return `hsl(${h} ${s}% ${l}%)`;
}

// Mathematical utilities
const utils = {
  map: (x, a, b, c, d) => c + (d - c) * ((x - a) / (b - a)),
  
  clamp: (value, min, max) => Math.min(Math.max(value, min), max),
  
  lerp: (a, b, t) => a + (b - a) * t,
  
  distance: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1),
  
  angle: (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1),
  
  normalize: (x, y) => {
    const mag = Math.hypot(x, y);
    return mag > 0 ? [x / mag, y / mag] : [0, 0];
  },
  
  rotate: (x, y, angle) => [
    x * Math.cos(angle) - y * Math.sin(angle),
    x * Math.sin(angle) + y * Math.cos(angle)
  ],
  
  randomBetween: (min, max) => min + rng() * (max - min),
  
  randomInt: (min, max) => Math.floor(utils.randomBetween(min, max + 1))
};

// DOM utility
const $ = (selector) => document.querySelector(selector);

// Warning banner utility
function showWarn(msg) {
  const banner = $('#warnBanner');
  banner.style.display = 'block';
  banner.textContent = msg;
}

function hideWarn() {
  const banner = $('#warnBanner');
  banner.style.display = 'none';
}

// Export utilities for use in other modules
window.BX = BX;
window.applySeed = applySeed;
window.randColor = randColor;
window.utils = utils;
window.rng = () => rng();
window.$ = $;
window.showWarn = showWarn;
window.hideWarn = hideWarn;