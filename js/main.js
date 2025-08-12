/**
 * Main initialization and coordination for Bouncing Balls Editor
 */

// Canvas and rendering
let canvas, ctx;
let workspace;

// FPS tracking
let fpsAvg = 0;
let fpsLast = performance.now();

// Rendering functions
function clearCanvas(hard = false) {
  if (window.state.doTrail && !hard) {
    ctx.fillStyle = 'rgba(5,7,12,.08)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const g = ctx.createRadialGradient(
      window.arena.cx, window.arena.cy, window.arena.r * 0.1,
      window.arena.cx, window.arena.cy, window.arena.r * 1.2
    );
    g.addColorStop(0, '#0b0f1c');
    g.addColorStop(1, '#06080e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function drawArena() {
  ctx.save();
  
  // Main arena circle
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#20325a';
  ctx.beginPath();
  ctx.arc(window.arena.cx, window.arena.cy, window.arena.r, 0, Math.PI * 2);
  ctx.stroke();
  
  // Gap highlight
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#3f6fff';
  ctx.beginPath();
  const a1 = window.arena.gapAngle - window.arena.gapWidth / 2;
  const a2 = window.arena.gapAngle + window.arena.gapWidth / 2;
  ctx.arc(window.arena.cx, window.arena.cy, window.arena.r, a1, a2);
  ctx.stroke();
  
  ctx.restore();
}

function render() {
  clearCanvas();
  drawArena();
  
  // Draw balls
  for (const b of window.state.balls) {
    ctx.beginPath();
    ctx.fillStyle = b.color;
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Main game loop
function frame(ms) {
  try {
    if (window.state.lastMs == null) window.state.lastMs = ms;
    const dt = (ms - window.state.lastMs) / 1000;
    window.state.lastMs = ms;
    
    // Only run physics when simulation is running
    if (window.state.running) {
      window.state.accumulator += Math.min(dt, 0.25);
      while (window.state.accumulator >= window.state.dt) {
        window.tick(window.state.dt);
        window.state.accumulator -= window.state.dt;
      }
      
      // Update FPS only when running
      const delta = (ms - fpsLast) / 1000;
      fpsLast = ms;
      const inst = 1 / delta;
      fpsAvg = fpsAvg * 0.9 + inst * 0.1;
      window.$('#fps').textContent = (fpsAvg | 0);
    }
    
    // Always render (to show spawned balls even when not running)
    render();
    
  } catch (err) {
    console.error('frame loop error:', err);
    window.state.running = false;
    window.showWarn('Render loop halted by an error (see console).');
  }
  
  // Continue frame loop only when running
  if (window.state.running) {
    requestAnimationFrame(frame);
  }
}

// Static render function for when simulation is stopped
function renderStatic() {
  render();
}

// Initialization
function initializeBlockly() {
  workspace = Blockly.inject('blocklyDiv', {
    toolbox: document.getElementById('toolbox'),
    renderer: 'zelos',
    zoom: {
      controls: true,
      wheel: true,
      startScale: 0.9
    },
    trashcan: true,
    grid: {
      spacing: 24,
      length: 3,
      colour: '#1f2a44',
      snap: false
    },
    theme: Blockly.Themes.Dark
  });
  
  return workspace;
}

function boot() {
  // Load initial preset and setup
  window.reset();
  window.loadPreset('duplicate', workspace);
  window.applyProgram();
  
  // Spawn initial balls
  for (let i = 0; i < 8; i++) {
    window.spawnBall();
  }
  
  // Initial render (static, no animation loop)
  renderStatic();
  
  console.log('🎯 Bouncing Balls Editor initialized successfully!');
}

// DOM ready initialization
document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 Initializing Bouncing Balls Editor...');
  
  // Initialize canvas
  canvas = document.getElementById('sim');
  ctx = canvas.getContext('2d');
  
  // Update arena with actual canvas dimensions
  window.arena.cx = canvas.width / 2;
  window.arena.cy = canvas.height / 2;
  window.arena.r = Math.min(canvas.width, canvas.height) * 0.44;
  
  // Initialize Blockly workspace
  workspace = initializeBlockly();
  
  // Initialize UI
  window.initializeUI();
  
  // Boot the application
  boot();
});

// Export globals for other modules
window.clearCanvas = clearCanvas;
window.frame = frame;
window.renderStatic = renderStatic;
window.workspace = workspace;