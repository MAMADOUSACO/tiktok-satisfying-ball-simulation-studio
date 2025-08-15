/**
 * Main initialization and coordination for Bouncing Balls Editor
 * Enhanced with Frame-by-Frame Simulation Control
 */

// Canvas and rendering
let canvas, ctx;
let workspace;

// FPS tracking
let fpsAvg = 0;
let fpsLast = performance.now();

// Frame stepping control
let simulationMode = 'continuous'; // 'continuous' or 'step'
let currentFrame = 0;
let stepSize = 1;
let isSteppingAnimation = false;

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
  
  // Update frame counter display
  updateFrameCounter();
}

function updateFrameCounter() {
  const frameElement = window.$('#frameCount');
  if (frameElement) {
    frameElement.textContent = currentFrame.toString();
  }
  
  const modeElement = window.$('#simulationMode');
  if (modeElement) {
    modeElement.textContent = simulationMode;
    modeElement.className = 'kpi ' + (simulationMode === 'step' ? 'step-mode' : 'continuous-mode');
  }
}

// Frame stepping functions
function stepForward(steps = 1) {
  if (!window.state.running && simulationMode === 'step') {
    // Allow stepping even when paused in step mode
    window.state.running = true;
  }
  
  if (!window.state.running) return;
  
  for (let i = 0; i < steps; i++) {
    // Save current state before stepping (with current frame number)
    window.saveSimulationState(currentFrame);
    
    // Run one physics tick
    window.tick(window.state.dt);
    currentFrame++;
    
    // Update FPS counter (for visual feedback)
    const now = performance.now();
    const delta = (now - fpsLast) / 1000;
    fpsLast = now;
    const inst = 1 / delta;
    fpsAvg = fpsAvg * 0.9 + inst * 0.1;
    window.$('#fps').textContent = (fpsAvg | 0);
  }
  
  // Always render after stepping
  render();
  
  console.log(`Stepped forward ${steps} frame(s). Current frame: ${currentFrame}`);
}

function stepBackward(steps = 1) {
  if (currentFrame <= 0) {
    console.log('Cannot step backward: already at frame 0');
    return;
  }
  
  let actualSteps = 0;
  
  for (let i = 0; i < steps; i++) {
    const targetFrame = currentFrame - 1;
    
    if (targetFrame < 0) {
      console.log('Cannot step back to negative frame');
      break;
    }
    
    const restoredFrame = window.restoreSimulationState(targetFrame);
    if (restoredFrame !== false) {
      currentFrame = restoredFrame;
      actualSteps++;
    } else {
      // Try to find the closest available frame
      const closestFrame = window.getClosestAvailableFrame(targetFrame);
      if (closestFrame !== null && closestFrame < currentFrame) {
        const restored = window.restoreSimulationState(closestFrame);
        if (restored !== false) {
          currentFrame = restored;
          actualSteps++;
          console.log(`Stepped back to closest available frame ${closestFrame} instead of ${targetFrame}`);
        } else {
          console.log('Cannot step back further: no more saved states');
          break;
        }
      } else {
        console.log('Cannot step back further: no earlier saved states');
        break;
      }
    }
  }
  
  // Always render after stepping
  render();
  
  if (actualSteps > 0) {
    console.log(`Stepped backward ${actualSteps} frame(s). Current frame: ${currentFrame}`);
  } else {
    console.log('No backward steps possible');
  }
}

function setSimulationMode(mode) {
  const previousMode = simulationMode;
  simulationMode = mode;
  
  if (mode === 'step') {
    // Switch to step mode - pause continuous animation
    if (window.state.running) {
      window.state.running = false;
    }
    console.log('Switched to step-by-step mode');
  } else if (mode === 'continuous') {
    // Switch to continuous mode - start animation loop if not running
    if (!window.state.running) {
      startContinuousMode();
    }
    console.log('Switched to continuous mode');
  }
  
  // Update UI to reflect mode change
  updateFrameCounter();
  updateStepControlsUI();
}

function startContinuousMode() {
  if (window.state.running && simulationMode === 'continuous') {
    // Reset time tracking to prevent time jumps
    window.state.lastMs = null;
    window.state.accumulator = 0;
    
    requestAnimationFrame(frame);
  }
}

function resetFrameCounter() {
  currentFrame = 0;
  window.clearSimulationHistory();
  updateFrameCounter();
  console.log('Frame counter reset to 0, simulation history cleared');
}

// Main game loop (enhanced for step mode)
function frame(ms) {
  try {
    // Only run in continuous mode
    if (simulationMode !== 'continuous') {
      return;
    }
    
    if (window.state.lastMs == null) window.state.lastMs = ms;
    const dt = (ms - window.state.lastMs) / 1000;
    window.state.lastMs = ms;
    
    // Only run physics when simulation is running
    if (window.state.running) {
      window.state.accumulator += Math.min(dt, 0.25);
      while (window.state.accumulator >= window.state.dt) {
        // Save state before each tick in continuous mode (with frame number)
        window.saveSimulationState(currentFrame);
        
        window.tick(window.state.dt);
        currentFrame++;
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
  
  // Continue frame loop only when running and in continuous mode
  if (window.state.running && simulationMode === 'continuous') {
    requestAnimationFrame(frame);
  }
}

// Static render function for when simulation is stopped
function renderStatic() {
  render();
}

// Enhanced run function with mode awareness
function runSimulation() {
  if (!window.state.program) window.applyProgram();
  
  // Reset time tracking to prevent time jumps when resuming
  window.state.lastMs = null;
  window.state.accumulator = 0;
  
  window.state.running = true;
  
  if (simulationMode === 'continuous') {
    // Start continuous animation loop
    requestAnimationFrame(frame);
  } else {
    // In step mode, just enable physics but don't start loop
    console.log('Simulation enabled in step mode - use step controls to advance');
  }
  
  updateStepControlsUI();
}

function pauseSimulation() {
  window.state.running = false;
  
  // Clear FPS display when stopped
  window.$('#fps').textContent = '0';
  
  updateStepControlsUI();
}

function updateStepControlsUI() {
  const stepBackBtn = window.$('#btnStepBack');
  const stepForwardBtn = window.$('#btnStepForward');
  const runBtn = window.$('#btnRun');
  const pauseBtn = window.$('#btnPause');
  
  if (stepBackBtn) stepBackBtn.disabled = (currentFrame <= 0);
  if (stepForwardBtn) stepForwardBtn.disabled = false;
  
  // Update run/pause button states
  if (runBtn && pauseBtn) {
    if (window.state.running) {
      runBtn.disabled = true;
      pauseBtn.disabled = false;
    } else {
      runBtn.disabled = false;
      pauseBtn.disabled = true;
    }
  }
}

// Keyboard shortcuts for stepping
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (event) => {
    // Only handle shortcuts when not typing in input fields
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
      return;
    }
    
    switch (event.code) {
      case 'Space':
        event.preventDefault();
        if (simulationMode === 'step') {
          stepForward(1);
        } else {
          // Toggle play/pause in continuous mode
          if (window.state.running) {
            pauseSimulation();
          } else {
            runSimulation();
          }
        }
        break;
        
      case 'ArrowRight':
        event.preventDefault();
        if (simulationMode === 'step') {
          stepForward(event.shiftKey ? 10 : 1);
        }
        break;
        
      case 'ArrowLeft':
        event.preventDefault();
        if (simulationMode === 'step') {
          stepBackward(event.shiftKey ? 10 : 1);
        }
        break;
        
      case 'KeyS':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          setSimulationMode(simulationMode === 'step' ? 'continuous' : 'step');
        }
        break;
        
      case 'KeyR':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          resetFrameCounter();
        }
        break;
    }
  });
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
    theme: Blockly.Themes.Dark,
    toolboxPosition: 'start',
    horizontalLayout: false,
    collapse: false,
    comments: true,
    disable: true,
    maxBlocks: Infinity,
    oneBasedIndex: true
  });
  
  // Auto-expand all toolbox categories after initialization
  setTimeout(() => {
    try {
      // Try multiple methods to keep categories expanded
      const toolbox = workspace.getToolbox();
      
      if (toolbox) {
        // Method 1: Try the modern Blockly API
        if (toolbox.getToolboxItems) {
          const categories = toolbox.getToolboxItems();
          categories.forEach(category => {
            if (category && typeof category.setExpanded === 'function') {
              category.setExpanded(true);
            }
          });
        }
        
        // Method 2: Try DOM manipulation as fallback
        const categoryElements = document.querySelectorAll('.blocklyTreeRow');
        categoryElements.forEach(element => {
          if (element && element.click && !element.getAttribute('aria-expanded')) {
            // Only click if not already expanded
            element.click();
          }
        });
        
        console.log('✨ Attempted to expand all toolbox categories');
      }
    } catch (e) {
      console.log('Could not auto-expand toolbox categories:', e);
      // Fallback: Try to click on category elements
      setTimeout(() => {
        try {
          const categories = document.querySelectorAll('.blocklyTreeLabel');
          categories.forEach((cat, index) => {
            if (index < 6) { // Only click first 6 to avoid infinite loops
              cat.click();
            }
          });
        } catch (e2) {
          console.log('Fallback toolbox expansion also failed:', e2);
        }
      }, 200);
    }
  }, 150);
  
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
  
  // Initialize frame counter
  currentFrame = 0;
  
  // Initial render (static, no animation loop)
  renderStatic();
  
  // Setup keyboard shortcuts
  setupKeyboardShortcuts();
  
  console.log('🎯 Bouncing Balls Editor initialized with frame stepping control!');
  console.log('💡 Keyboard shortcuts: Space (step/play), ← → (step back/forward), Ctrl+S (toggle mode), Ctrl+R (reset frame)');
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

// Export frame stepping functions
window.stepForward = stepForward;
window.stepBackward = stepBackward;
window.setSimulationMode = setSimulationMode;
window.resetFrameCounter = resetFrameCounter;
window.runSimulation = runSimulation;
window.pauseSimulation = pauseSimulation;
window.updateStepControlsUI = updateStepControlsUI;
window.currentFrame = () => currentFrame;
window.simulationMode = () => simulationMode;