/**
 * Multi-Engine Physics System for Bouncing Balls Editor
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
  physicsEngine: 'arcade' // 'arcade' or 'realistic'
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
    maxReflectionAngle: 165, // degrees - prevents perfect 180° bounces
    energyConservation: true,
    gravity: 0
  },
  realistic: {
    gravity: 980, // pixels/s² (roughly earth gravity scaled)
    elasticity: 0.85, // energy retained after bounce (0-1)
    airResistance: 0.99, // velocity multiplier per frame
    minVelocity: 5, // minimum velocity before ball stops (reduced from 10)
    groundLevel: 0.9 // fraction of arena radius where "ground" physics apply
  }
};

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
    
    // Wall reflection with minimum angle constraint
    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = dist + ball.r - arena.r;
    ball.x -= nx * overlap;
    ball.y -= ny * overlap;
    
    // Calculate reflection
    const vdotn = ball.vx * nx + ball.vy * ny;
    let newVx = ball.vx - 2 * vdotn * nx;
    let newVy = ball.vy - 2 * vdotn * ny;
    
    // Apply minimum and maximum reflection angle constraints
    const config = physicsConfig.arcade;
    const wallAngle = Math.atan2(ny, nx);
    const reflectionAngle = Math.atan2(newVy, newVx);
    
    const minAngleRad = (config.minReflectionAngle * Math.PI) / 180;
    const maxAngleRad = (config.maxReflectionAngle * Math.PI) / 180;
    
    // Calculate angle between reflection and wall normal
    let angleFromNormal = Math.abs(reflectionAngle - wallAngle);
    if (angleFromNormal > Math.PI) angleFromNormal = 2 * Math.PI - angleFromNormal;
    
    const speed = Math.hypot(newVx, newVy);
    let adjustedAngle = reflectionAngle;
    
    // Prevent too shallow angles (min constraint)
    if (angleFromNormal < minAngleRad) {
      const sign = Math.sign(reflectionAngle - wallAngle);
      adjustedAngle = wallAngle + sign * minAngleRad;
    }
    // Prevent too steep angles / perfect 180° bounces (max constraint)  
    else if (angleFromNormal > maxAngleRad) {
      const sign = Math.sign(reflectionAngle - wallAngle);
      adjustedAngle = wallAngle + sign * maxAngleRad;
    }
    
    // Apply adjustment if needed
    if (adjustedAngle !== reflectionAngle) {
      newVx = Math.cos(adjustedAngle) * speed;
      newVy = Math.sin(adjustedAngle) * speed;
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
  return state.physicsEngine === 'realistic' ? RealisticPhysics : ArcadePhysics;
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
// COLLISION DETECTION
// ============================================================================

function handleCollisions() {
  const n = state.balls.length;
  for (let i = 0; i < n; i++) {
    const a = state.balls[i];
    if (!a.alive) continue;
    
    for (let j = i + 1; j < n; j++) {
      const b = state.balls[j];
      if (!b.alive) continue;
      
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      const minD = a.r + b.r;
      
      if (dist < minD && dist > 1e-4) {
        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = minD - dist;
        
        a.x -= nx * overlap * 0.5;
        a.y -= ny * overlap * 0.5;
        b.x += nx * overlap * 0.5;
        b.y += ny * overlap * 0.5;
        
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
        
        if (state.program?.onBallCollision) {
          try {
            state.program.onBallCollision(ballProxy(a), ballProxy(b));
          } catch (e) {
            console.warn(e);
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