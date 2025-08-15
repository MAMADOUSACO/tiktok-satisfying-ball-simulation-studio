/**
 * Multi-Engine Physics System for Bouncing Balls Editor
 * Enhanced with State Snapshot System for Frame Stepping
 */

// Engine state
const state = {
  running: false,
  balls: [],
  nextId: 1,
  t: 0,
  dt: 1/120,
  accumulator: 0,
  lastMs: null,
  doTrail: true,
  doSfx: false,
  doCollide: false,
  score: 0,
  program: null,
  physicsEngine: 'arcadeSimple' // Default to the cleanest collision mode
};

// Arena configuration
const arena = {
  cx: 540, // canvas.width/2
  cy: 960, // canvas.height/2
  r: Math.min(1080, 1920) * 0.44,
  gapAngle: -Math.PI/2,
  gapWidth: 0.28
};

// Physics engine configurations
const physicsConfig = {
  arcade: {
    minReflectionAngle: 15, // degrees - prevents shallow angle cascades
    maxReflectionAngle: 165, // degrees - prevents near-180° bounces
    energyConservation: true,
    gravity: 0
  },
  arcadeSimple: {
    minReflectionAngle: 15, // degrees - prevents shallow angle cascades
    maxReflectionAngle: 165, // degrees - prevents near-180° bounces
    energyConservation: true,
    gravity: 0,
    separationOnly: true // No momentum transfer in collisions
  },
  realistic: {
    gravity: 980, // pixels/s² (roughly earth gravity scaled)
    elasticity: 0.85, // energy retained after bounce (0-1)
    airResistance: 0.99, // velocity multiplier per frame
    minVelocity: 5, // minimum velocity before ball stops (reduced from 10)
    groundLevel: 0.9 // fraction of arena radius where "ground" physics apply
  }
};

// ============================================================================
// STATE SNAPSHOT SYSTEM FOR FRAME STEPPING
// ============================================================================

const SNAPSHOT_BUFFER_SIZE = 5000; // Store last 5000 frames (~42-83 seconds of history)
let simulationHistory = new Map(); // Use Map for better frame tracking
let maxSavedFrame = -1;

/**
 * Create a complete snapshot of the current simulation state
 */
function createStateSnapshot(frameNumber) {
  return {
    frameNumber: frameNumber,
    
    // Deep copy of balls array with all properties
    balls: state.balls.map(ball => ({
      id: ball.id,
      x: ball.x,
      y: ball.y,
      vx: ball.vx,
      vy: ball.vy,
      r: ball.r,
      color: ball.color,
      alive: ball.alive,
      data: { ...ball.data } // Shallow copy of data object
    })),
    
    // Other simulation state
    nextId: state.nextId,
    t: state.t,
    score: state.score,
    
    // Physics settings (in case they change during simulation)
    physicsEngine: state.physicsEngine,
    doCollide: state.doCollide,
    
    // Frame metadata
    timestamp: performance.now()
  };
}

/**
 * Restore simulation state from a snapshot
 */
function restoreStateSnapshot(snapshot) {
  if (!snapshot) return false;
  
  try {
    // Restore balls array
    state.balls = snapshot.balls.map(ballData => ({
      id: ballData.id,
      x: ballData.x,
      y: ballData.y,
      vx: ballData.vx,
      vy: ballData.vy,
      r: ballData.r,
      color: ballData.color,
      alive: ballData.alive,
      data: { ...ballData.data }
    }));
    
    // Restore other state
    state.nextId = snapshot.nextId;
    state.t = snapshot.t;
    state.score = snapshot.score;
    state.physicsEngine = snapshot.physicsEngine;
    state.doCollide = snapshot.doCollide;
    
    // Update ball count display
    if (window.$) {
      window.$('#ballCount').textContent = String(state.balls.length);
    }
    
    console.log(`State restored to frame ${snapshot.frameNumber} with ${state.balls.length} balls`);
    return snapshot.frameNumber;
  } catch (error) {
    console.error('Failed to restore state snapshot:', error);
    return false;
  }
}

/**
 * Save current state to history buffer with frame number
 */
function saveSimulationState(frameNumber) {
  if (frameNumber === undefined || frameNumber === null) {
    console.warn('saveSimulationState called without frame number');
    return;
  }
  
  const snapshot = createStateSnapshot(frameNumber);
  
  // Store in Map with frame number as key
  simulationHistory.set(frameNumber, snapshot);
  maxSavedFrame = Math.max(maxSavedFrame, frameNumber);
  
  // Clean up old frames to keep memory under control
  if (simulationHistory.size > SNAPSHOT_BUFFER_SIZE) {
    const oldestFrameToKeep = maxSavedFrame - SNAPSHOT_BUFFER_SIZE + 1;
    for (const [frame, _] of simulationHistory) {
      if (frame < oldestFrameToKeep) {
        simulationHistory.delete(frame);
      }
    }
  }
  
  // Debug log occasionally
  if (frameNumber % 500 === 0) {
    console.log(`State saved for frame ${frameNumber}, buffer has ${simulationHistory.size} frames`);
  }
}

/**
 * Restore state for a specific frame number
 */
function restoreSimulationState(targetFrame) {
  if (targetFrame < 0) {
    console.log('Cannot restore negative frame number');
    return false;
  }
  
  const snapshot = simulationHistory.get(targetFrame);
  if (!snapshot) {
    console.log(`No saved state for frame ${targetFrame}. Available frames: ${Math.min(...simulationHistory.keys())} to ${Math.max(...simulationHistory.keys())}`);
    return false;
  }
  
  // Restore the state
  const restoredFrame = restoreStateSnapshot(snapshot);
  if (restoredFrame !== false) {
    console.log(`Successfully restored state for frame ${targetFrame}`);
    return targetFrame;
  }
  
  return false;
}

/**
 * Get the closest available frame to a target frame
 */
function getClosestAvailableFrame(targetFrame) {
  if (simulationHistory.has(targetFrame)) {
    return targetFrame;
  }
  
  // Find closest frame
  let closestFrame = -1;
  let minDistance = Infinity;
  
  for (const frame of simulationHistory.keys()) {
    const distance = Math.abs(frame - targetFrame);
    if (distance < minDistance) {
      minDistance = distance;
      closestFrame = frame;
    }
  }
  
  return closestFrame >= 0 ? closestFrame : null;
}

/**
 * Clear simulation history (useful for reset)
 */
function clearSimulationHistory() {
  simulationHistory.clear();
  maxSavedFrame = -1;
  console.log('Simulation history cleared');
}

/**
 * Get history buffer stats for debugging
 */
function getHistoryStats() {
  const frames = Array.from(simulationHistory.keys()).sort((a, b) => a - b);
  const memoryUsage = JSON.stringify([...simulationHistory.values()]).length; // Rough estimate
  
  return {
    totalFrames: simulationHistory.size,
    frameRange: frames.length > 0 ? `${frames[0]} to ${frames[frames.length - 1]}` : 'none',
    maxSavedFrame: maxSavedFrame,
    memoryUsageBytes: memoryUsage,
    availableFrames: frames
  };
}

// Audio context for sound effects
let audioCtx = null;

function pingSfx(freq = 520, dur = 0.04) {
  if (!state.doSfx) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    g.gain.value = 0.06;
    o.connect(g);
    g.connect(audioCtx.destination);
    const t = audioCtx.currentTime;
    o.start(t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.stop(t + dur);
  } catch (err) {
    console.warn('Audio blocked by browser/sandbox:', err);
    state.doSfx = false;
    $('#chkSfx').checked = false;
  }
}

// ============================================================================
// ARCADE PHYSICS ENGINE (Perfect Mathematical Bouncing)
// ============================================================================

const ArcadePhysics = {
  updateBall(ball, dt) {
    // Pure kinematic motion - no gravity, no energy loss
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
  },

  reflectWall(ball) {
    const dx = ball.x - arena.cx;
    const dy = ball.y - arena.cy;
    const dist = Math.hypot(dx, dy);
    
    if (dist + ball.r <= arena.r) return false;
    
    // Check for gap exit
    const ang = Math.atan2(dy, dx);
    const d = Math.atan2(Math.sin(ang - arena.gapAngle), Math.cos(ang - arena.gapAngle));
    
    if (Math.abs(d) < arena.gapWidth / 2) {
      if (state.program?.onExit) {
        try {
          state.program.onExit(ballProxy(ball));
        } catch (e) {
          console.warn(e);
        }
      }
      ball.x = arena.cx;
      ball.y = arena.cy;
      return true;
    }
    
    // Wall reflection with angle constraints
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = dist + ball.r - arena.r;
    ball.x -= nx * overlap;
    ball.y -= ny * overlap;
    
    // Calculate natural reflection
    const vdotn = ball.vx * nx + ball.vy * ny;
    let newVx = ball.vx - 2 * vdotn * nx;
    let newVy = ball.vy - 2 * vdotn * ny;
    
    // Apply minimum and maximum reflection angle constraints
    const config = physicsConfig.arcade;
    
    // Calculate natural reflection angle in degrees (-180 to +180)
    let reflectionAngleDeg = (Math.atan2(newVy, newVx) * 180) / Math.PI;
    
    // Normalize to -180 to +180 range
    while (reflectionAngleDeg > 180) reflectionAngleDeg -= 360;
    while (reflectionAngleDeg < -180) reflectionAngleDeg += 360;
    
    const speed = Math.hypot(newVx, newVy);
    let constrainedAngleDeg = reflectionAngleDeg;
    
    // Apply constraints by finding closest valid angle
    if (reflectionAngleDeg > config.maxReflectionAngle) {
      // Ball wants to bounce at angle > max (e.g., 175°), constrain to max (e.g., 165°)
      constrainedAngleDeg = config.maxReflectionAngle;
      console.log(`Constrained ${reflectionAngleDeg.toFixed(1)}° to max ${config.maxReflectionAngle}°`);
    } else if (reflectionAngleDeg < -config.maxReflectionAngle) {
      // Ball wants to bounce at angle < -max (e.g., -175°), constrain to -max (e.g., -165°)
      constrainedAngleDeg = -config.maxReflectionAngle;
      console.log(`Constrained ${reflectionAngleDeg.toFixed(1)}° to -max ${-config.maxReflectionAngle}°`);
    }
    
    // Apply minimum angle constraints (prevent too shallow bounces)
    if (Math.abs(constrainedAngleDeg) < config.minReflectionAngle) {
      // Ball wants to bounce too shallow, push to minimum
      if (constrainedAngleDeg >= 0) {
        constrainedAngleDeg = config.minReflectionAngle;
      } else {
        constrainedAngleDeg = -config.minReflectionAngle;
      }
      console.log(`Applied min angle constraint: ${constrainedAngleDeg}°`);
    }
    
    // Apply the constrained angle if it changed
    if (Math.abs(constrainedAngleDeg - reflectionAngleDeg) > 0.1) {
      const constrainedAngleRad = (constrainedAngleDeg * Math.PI) / 180;
      newVx = Math.cos(constrainedAngleRad) * speed;
      newVy = Math.sin(constrainedAngleRad) * speed;
    }
    
    ball.vx = newVx;
    ball.vy = newVy;
    
    if (state.program?.onWallHit) {
      try {
        state.program.onWallHit(ballProxy(ball));
      } catch (e) {
        console.warn(e);
      }
    }
    
    pingSfx();
    return true;
  }
};

// ============================================================================
// ARCADE SIMPLE PHYSICS ENGINE (No Momentum Transfer)
// ============================================================================

const ArcadeSimplePhysics = {
  updateBall(ball, dt) {
    // Pure kinematic motion - no gravity, no energy loss (same as regular arcade)
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
  },

  reflectWall(ball) {
    // Wall physics identical to regular arcade mode
    const dx = ball.x - arena.cx;
    const dy = ball.y - arena.cy;
    const dist = Math.hypot(dx, dy);
    
    if (dist + ball.r <= arena.r) return false;
    
    // Check for gap exit
    const ang = Math.atan2(dy, dx);
    const d = Math.atan2(Math.sin(ang - arena.gapAngle), Math.cos(ang - arena.gapAngle));
    
    if (Math.abs(d) < arena.gapWidth / 2) {
      if (state.program?.onExit) {
        try {
          state.program.onExit(ballProxy(ball));
        } catch (e) {
          console.warn(e);
        }
      }
      ball.x = arena.cx;
      ball.y = arena.cy;
      return true;
    }
    
    // Wall reflection with angle constraints (same as regular arcade)
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = dist + ball.r - arena.r;
    ball.x -= nx * overlap;
    ball.y -= ny * overlap;
    
    // Calculate natural reflection
    const vdotn = ball.vx * nx + ball.vy * ny;
    let newVx = ball.vx - 2 * vdotn * nx;
    let newVy = ball.vy - 2 * vdotn * ny;
    
    // Apply minimum and maximum reflection angle constraints
    const config = physicsConfig.arcadeSimple;
    
    // Calculate natural reflection angle in degrees (-180 to +180)
    let reflectionAngleDeg = (Math.atan2(newVy, newVx) * 180) / Math.PI;
    
    // Normalize to -180 to +180 range
    while (reflectionAngleDeg > 180) reflectionAngleDeg -= 360;
    while (reflectionAngleDeg < -180) reflectionAngleDeg += 360;
    
    const speed = Math.hypot(newVx, newVy);
    let constrainedAngleDeg = reflectionAngleDeg;
    
    // Apply constraints by finding closest valid angle
    if (reflectionAngleDeg > config.maxReflectionAngle) {
      constrainedAngleDeg = config.maxReflectionAngle;
      console.log(`Constrained ${reflectionAngleDeg.toFixed(1)}° to max ${config.maxReflectionAngle}°`);
    } else if (reflectionAngleDeg < -config.maxReflectionAngle) {
      constrainedAngleDeg = -config.maxReflectionAngle;
      console.log(`Constrained ${reflectionAngleDeg.toFixed(1)}° to -max ${-config.maxReflectionAngle}°`);
    }
    
    // Apply minimum angle constraints (prevent too shallow bounces)
    if (Math.abs(constrainedAngleDeg) < config.minReflectionAngle) {
      if (constrainedAngleDeg >= 0) {
        constrainedAngleDeg = config.minReflectionAngle;
      } else {
        constrainedAngleDeg = -config.minReflectionAngle;
      }
      console.log(`Applied min angle constraint: ${constrainedAngleDeg}°`);
    }
    
    // Apply the constrained angle if it changed
    if (Math.abs(constrainedAngleDeg - reflectionAngleDeg) > 0.1) {
      const constrainedAngleRad = (constrainedAngleDeg * Math.PI) / 180;
      newVx = Math.cos(constrainedAngleRad) * speed;
      newVy = Math.sin(constrainedAngleRad) * speed;
    }
    
    ball.vx = newVx;
    ball.vy = newVy;
    
    if (state.program?.onWallHit) {
      try {
        state.program.onWallHit(ballProxy(ball));
      } catch (e) {
        console.warn(e);
      }
    }
    
    pingSfx();
    return true;
  }
};

// ============================================================================
// REALISTIC PHYSICS ENGINE (Gravity + Energy Loss)
// ============================================================================

const RealisticPhysics = {
  updateBall(ball, dt) {
    const config = physicsConfig.realistic;
    
    // Apply gravity
    ball.vy += config.gravity * dt;
    
    // Apply air resistance
    ball.vx *= config.airResistance;
    ball.vy *= config.airResistance;
    
    // Smart velocity stopping - only stop balls that are truly settled
    const speed = Math.hypot(ball.vx, ball.vy);
    const distFromCenter = Math.hypot(ball.x - arena.cx, ball.y - arena.cy);
    const isNearGround = distFromCenter > arena.r * config.groundLevel;
    
    // Only stop if ball is very slow AND near the ground, or if individual components are tiny
    if ((speed < config.minVelocity && isNearGround) || 
        (Math.abs(ball.vx) < 1 && Math.abs(ball.vy) < 1)) {
      ball.vx = 0;
      ball.vy = 0;
    }
    
    // Update position
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
  },

  reflectWall(ball) {
    const dx = ball.x - arena.cx;
    const dy = ball.y - arena.cy;
    const dist = Math.hypot(dx, dy);
    
    if (dist + ball.r <= arena.r) return false;
    
    // Check for gap exit
    const ang = Math.atan2(dy, dx);
    const d = Math.atan2(Math.sin(ang - arena.gapAngle), Math.cos(ang - arena.gapAngle));
    
    if (Math.abs(d) < arena.gapWidth / 2) {
      if (state.program?.onExit) {
        try {
          state.program.onExit(ballProxy(ball));
        } catch (e) {
          console.warn(e);
        }
      }
      ball.x = arena.cx;
      ball.y = arena.cy;
      return true;
    }
    
    // Wall reflection with energy loss
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = dist + ball.r - arena.r;
    ball.x -= nx * overlap;
    ball.y -= ny * overlap;
    
    const vdotn = ball.vx * nx + ball.vy * ny;
    ball.vx = ball.vx - 2 * vdotn * nx;
    ball.vy = ball.vy - 2 * vdotn * ny;
    
    // Apply elasticity (energy loss)
    const config = physicsConfig.realistic;
    ball.vx *= config.elasticity;
    ball.vy *= config.elasticity;
    
    if (state.program?.onWallHit) {
      try {
        state.program.onWallHit(ballProxy(ball));
      } catch (e) {
        console.warn(e);
      }
    }
    
    pingSfx();
    return true;
  }
};

// ============================================================================
// PHYSICS ENGINE MANAGER
// ============================================================================

function getCurrentEngine() {
  switch (state.physicsEngine) {
    case 'realistic':
      return RealisticPhysics;
    case 'arcadeSimple':
      return ArcadeSimplePhysics;
    case 'arcade':
    default:
      return ArcadePhysics;
  }
}

function setPhysicsEngine(engineName) {
  state.physicsEngine = engineName;
  console.log(`Physics engine switched to: ${engineName}`);
}

// ============================================================================
// BALL MANAGEMENT
// ============================================================================

function spawnBall(props = {}) {
  try {
    const id = state.nextId++;
    let angle = window.rng() * Math.PI * 2;
    let rad = Math.sqrt(window.rng()) * (arena.r * 0.85);
    let x = arena.cx + Math.cos(angle) * rad;
    let y = arena.cy + Math.sin(angle) * rad;
    let speed = 250 + window.rng() * 250;
    let dir = window.rng() * Math.PI * 2;
    let vx = Math.cos(dir) * speed;
    let vy = Math.sin(dir) * speed;
    
    const b = {
      id,
      x: props.x ?? x,
      y: props.y ?? y,
      vx: props.vx ?? vx,
      vy: props.vy ?? vy,
      r: props.r ?? 15, // Fixed size instead of random (12 + window.rng() * 10)
      color: props.color ?? window.randColor(),
      alive: true,
      data: Object.create(null)
    };
    
    state.balls.push(b);
    $('#ballCount').textContent = String(state.balls.length);
    
    if (state.program?.onSpawn) {
      try {
        state.program.onSpawn(ballProxy(b));
      } catch (e) {
        console.warn(e);
      }
    }
    
    return b;
  } catch (err) {
    console.error('spawnBall error:', err);
    throw err;
  }
}

function duplicateBall(ball) {
  // Calculate the direction from ball to arena center (safe direction)
  const centerAngle = Math.atan2(arena.cy - ball.y, arena.cx - ball.x);
  
  // Move clone much further toward center for safety
  const safeDistance = ball.r * 2.0; // Increased from 0.6 to 2.0
  const safeX = ball.x + Math.cos(centerAngle) * safeDistance;
  const safeY = ball.y + Math.sin(centerAngle) * safeDistance;
  
  // Calculate current speed
  const originalSpeed = Math.hypot(ball.vx, ball.vy) * (0.9 + window.rng() * 0.3);
  
  // Create safe trajectory: heavily bias toward center with controlled randomness
  const randomOffset = (window.rng() - 0.5) * 0.4; // Reduced random variation
  const safeAngle = centerAngle + randomOffset;
  
  // Additional safety: ensure the angle points away from wall region
  const ballAngle = Math.atan2(ball.y - arena.cy, ball.x - arena.cx);
  const angleDifference = Math.abs(safeAngle - ballAngle);
  
  // If clone would point back toward wall area, redirect it more toward center
  let finalAngle = safeAngle;
  if (angleDifference > Math.PI * 0.75) { // If pointing back toward wall area
    finalAngle = centerAngle + (window.rng() - 0.5) * 0.2; // Much smaller random variation
  }
  
  const nb = spawnBall({
    x: safeX,
    y: safeY,
    r: ball.r // Keep same size as original
  });
  
  // Set velocity with safe trajectory
  nb.vx = Math.cos(finalAngle) * originalSpeed;
  nb.vy = Math.sin(finalAngle) * originalSpeed;
  nb.color = ball.color;
  
  return nb;
}

function destroyBall(ball) {
  ball.alive = false;
}

// Ball proxy for safe access from user code
function ballProxy(b) {
  return {
    get id() { return b.id; },
    get x() { return b.x; },
    set x(v) { b.x = v; },
    get y() { return b.y; },
    set y(v) { b.y = v; },
    get vx() { return b.vx; },
    set vx(v) { b.vx = v; },
    get vy() { return b.vy; },
    set vy(v) { b.vy = v; },
    get r() { return b.r; },
    set r(v) { b.r = Math.max(1, v); },
    get color() { return b.color; },
    set color(v) { b.color = String(v); },
    get data() { return b.data; },
    destroy() { destroyBall(b); },
    duplicate() { return duplicateBall(b); },
    setVelocity(vx, vy) { b.vx = vx; b.vy = vy; },
    scaleSpeed(f) {
      const s = Math.hypot(b.vx, b.vy);
      const ns = s * f;
      if (s > 0) {
        const t = ns / s;
        b.vx *= t;
        b.vy *= t;
      }
    }
  };
}

// ============================================================================
// COLLISION DETECTION (Enhanced for Property Changes)
// ============================================================================

function handleCollisions() {
  const n = state.balls.length;
  const processedPairs = new Set(); // Track which pairs we've already processed this frame
  
  for (let i = 0; i < n; i++) {
    const a = state.balls[i];
    if (!a.alive) continue;
    
    for (let j = i + 1; j < n; j++) {
      const b = state.balls[j];
      if (!b.alive) continue;
      
      const pairId = `${Math.min(a.id, b.id)}-${Math.max(a.id, b.id)}`;
      if (processedPairs.has(pairId)) continue;
      
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const minD = a.r + b.r;
      
      if (dist < minD && dist > 1e-4) {
        processedPairs.add(pairId);
        
        // PHASE 1: Apply physics collision resolution
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = minD - dist;
        
        // Separate balls based on current radii
        const totalR = a.r + b.r;
        const aRatio = a.r / totalR;
        const bRatio = b.r / totalR;
        
        a.x -= nx * overlap * bRatio;  // Larger balls move less
        a.y -= ny * overlap * bRatio;
        b.x += nx * overlap * aRatio;
        b.y += ny * overlap * aRatio;
        
        // Apply momentum transfer ONLY if not in arcadeSimple mode
        if (state.physicsEngine !== 'arcadeSimple') {
          const va = a.vx * nx + a.vy * ny;
          const vb = b.vx * nx + b.vy * ny;
          const dv = vb - va;
          
          a.vx += dv * nx;
          a.vy += dv * ny;
          b.vx -= dv * nx;
          b.vy -= dv * ny;
          
          // Apply physics engine-specific collision response
          if (state.physicsEngine === 'realistic') {
            const elasticity = physicsConfig.realistic.elasticity;
            a.vx *= elasticity;
            a.vy *= elasticity;
            b.vx *= elasticity;
            b.vy *= elasticity;
          }
        } else {
          // Arcade Simple: Reflect velocities but preserve original speeds
          const originalSpeedA = Math.hypot(a.vx, a.vy);
          const originalSpeedB = Math.hypot(b.vx, b.vy);
          
          // Reflect velocity components along collision normal
          const vaNormal = a.vx * nx + a.vy * ny;
          const vbNormal = b.vx * nx + b.vy * ny;
          
          // Apply reflection (bounce off each other)
          a.vx = a.vx - 2 * vaNormal * nx;
          a.vy = a.vy - 2 * vaNormal * ny;
          b.vx = b.vx - 2 * vbNormal * nx;
          b.vy = b.vy - 2 * vbNormal * ny;
          
          // Restore original speeds (preserve energy per ball)
          const newSpeedA = Math.hypot(a.vx, a.vy);
          const newSpeedB = Math.hypot(b.vx, b.vy);
          
          if (newSpeedA > 0) {
            const scaleA = originalSpeedA / newSpeedA;
            a.vx *= scaleA;
            a.vy *= scaleA;
          }
          
          if (newSpeedB > 0) {
            const scaleB = originalSpeedB / newSpeedB;
            b.vx *= scaleB;
            b.vy *= scaleB;
          }
          
          console.log(`Arcade Simple collision: preserved speeds ${originalSpeedA.toFixed(1)}, ${originalSpeedB.toFixed(1)}`);
        }
        
        // Store original radii for comparison
        const originalARadius = a.r;
        const originalBRadius = b.r;
        
        // PHASE 2: Run user collision event (may change ball properties)
        if (state.program?.onBallCollision) {
          try {
            state.program.onBallCollision(ballProxy(a), ballProxy(b));
          } catch (e) {
            console.warn(e);
          }
        }
        
        // PHASE 3: Handle any radius changes with additional separation
        if (a.r !== originalARadius || b.r !== originalBRadius) {
          const newDx = b.x - a.x;
          const newDy = b.y - a.y;
          const newDist = Math.hypot(newDx, newDy);
          const newMinD = a.r + b.r;
          
          if (newDist < newMinD && newDist > 1e-4) {
            // Balls are still overlapping after radius change - apply additional separation
            const newNx = newDx / newDist;
            const newNy = newDy / newDist;
            const additionalOverlap = newMinD - newDist;
            
            // Calculate separation based on new radii
            const newTotalR = a.r + b.r;
            const newARatio = a.r / newTotalR;
            const newBRatio = b.r / newTotalR;
            
            // Apply additional separation
            a.x -= newNx * additionalOverlap * newBRatio;
            a.y -= newNy * additionalOverlap * newBRatio;
            b.x += newNx * additionalOverlap * newARatio;
            b.y += newNy * additionalOverlap * newARatio;
            
            // Apply slight velocity adjustment to prevent re-collision
            // This gives balls a small push away from each other
            const separationVelocity = state.physicsEngine === 'arcadeSimple' ? 10 : 20; // Smaller push for simple mode
            a.vx -= newNx * separationVelocity * newBRatio;
            a.vy -= newNy * separationVelocity * newBRatio;
            b.vx += newNx * separationVelocity * newARatio;
            b.vy += newNy * separationVelocity * newARatio;
            
            console.log(`Handled radius change collision: ${originalARadius},${originalBRadius} → ${a.r},${b.r}`);
          }
        }
      }
    }
  }
}

// ============================================================================
// MAIN PHYSICS TICK
// ============================================================================

function tick(dt) {
  state.t += dt;
  
  if (state.program?.onTick) {
    try {
      state.program.onTick(dt);
    } catch (e) {
      console.warn(e);
    }
  }
  
  const engine = getCurrentEngine();
  
  for (const b of state.balls) {
    if (!b.alive) continue;
    
    // Update ball physics using current engine
    engine.updateBall(b, dt);
    
    // Handle wall collisions using current engine
    engine.reflectWall(b);
  }
  
  if (state.doCollide) handleCollisions();
  
  if (state.balls.some(b => !b.alive)) {
    state.balls = state.balls.filter(b => b.alive);
    $('#ballCount').textContent = String(state.balls.length);
  }
}

// Reset simulation
function reset() {
  state.running = false;
  state.balls = [];
  state.nextId = 1;
  state.t = 0;
  state.accumulator = 0;
  state.lastMs = null;
  state.score = 0;
  $('#ballCount').textContent = '0';
  
  // Clear frame stepping history
  clearSimulationHistory();
  
  // Reset frame counter if the function is available
  if (window.resetFrameCounter) {
    // Note: We can't directly call resetFrameCounter here because it's in main.js
    // The frame counter will be reset by the UI reset handler
    console.log('Simulation reset - frame history cleared');
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

window.state = state;
window.arena = arena;
window.physicsConfig = physicsConfig;
window.setPhysicsEngine = setPhysicsEngine;
window.spawnBall = spawnBall;
window.duplicateBall = duplicateBall;
window.destroyBall = destroyBall;
window.ballProxy = ballProxy;
window.tick = tick;
window.reset = reset;
window.pingSfx = pingSfx;

// Export state snapshot functions
window.saveSimulationState = saveSimulationState;
window.restoreSimulationState = restoreSimulationState;
window.clearSimulationHistory = clearSimulationHistory;
window.createStateSnapshot = createStateSnapshot;
window.restoreStateSnapshot = restoreStateSnapshot;
window.getHistoryStats = getHistoryStats; 