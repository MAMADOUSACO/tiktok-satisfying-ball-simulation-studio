/**
 * UI Controls and Event Handlers for Bouncing Balls Editor
 */

// UI element references
const UI = {
  fps: null,
  ballCount: null,
  btnRun: null,
  btnPause: null,
  btnReset: null,
  btnApply: null,
  btnExportXml: null,
  btnImportXml: null,
  btnRecord: null,
  btnAutoRecord: null,
  downloadLink: null,
  seed: null,
  btnReseed: null,
  initialBalls: null,
  btnSpawnInit: null,
  chkTrail: null,
  chkSfx: null,
  chkCollide: null,
  presetSelect: null,
  btnLoadPreset: null,
  btnTests: null,
  warnBanner: null,
  resizeHandle: null,
  recordFormat: null,
  recordFps: null,
  recordQuality: null,
  recordBitrate: null,
  physicsSelect: null,
  arcadeSettings: null,
  realisticSettings: null,
  arcadeMinAngle: null,
  arcadeMaxAngle: null,
  realisticGravity: null,
  realisticElasticity: null,
  realisticAirResistance: null
};

// Recording functionality
let mediaRecorder = null;
let recordedChunks = [];
let autoRecordEnabled = false;

// Resize functionality
let isResizing = false;
let startX = 0;
let startLeftWidth = 0;
let startRightWidth = 0;

function enableRecordUI(enabled) {
  UI.btnRecord.disabled = !enabled;
  if (!enabled) UI.btnRecord.textContent = 'Recording disabled';
}

function getRecordingMimeType() {
  const format = UI.recordFormat.value;
  const codecs = {
    webm: ['vp9', 'vp8', 'h264'],
    mp4: ['h264', 'avc1']
  };
  
  for (const codec of codecs[format] || codecs.webm) {
    const mimeType = `video/${format};codecs=${codec}`;
    if (MediaRecorder.isTypeSupported(mimeType)) {
      return mimeType;
    }
  }
  
  // Fallback
  return 'video/webm';
}

function getRecordingBitrate() {
  const quality = UI.recordQuality.value;
  const customBitrate = parseInt(UI.recordBitrate.value) * 1000; // Convert to bps
  
  if (!isNaN(customBitrate) && customBitrate > 0) {
    return customBitrate;
  }
  
  const qualityMap = {
    low: 1000000,    // 1 Mbps
    medium: 5000000, // 5 Mbps
    high: 10000000,  // 10 Mbps
    ultra: 25000000  // 25 Mbps
  };
  
  return qualityMap[quality] || qualityMap.medium;
}

function startRecording() {
  try {
    const canvas = $('#sim');
    const fps = parseInt(UI.recordFps.value) || 30;
    const stream = canvas.captureStream(fps);
    recordedChunks = [];
    
    const mimeType = getRecordingMimeType();
    const bitrate = getRecordingBitrate();
    
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: mimeType,
      videoBitsPerSecond: bitrate
    });
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };
    
    mediaRecorder.onstop = () => {
      const format = UI.recordFormat.value;
      const blob = new Blob(recordedChunks, { type: `video/${format}` });
      const url = URL.createObjectURL(blob);
      const a = UI.downloadLink;
      a.href = url;
      const seedStr = (UI.seed.value || 'seed');
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      a.download = `bouncing-balls_${seedStr}_${ts}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    };
    
    mediaRecorder.start();
    UI.btnRecord.textContent = 'Stop Recording';
    console.log(`Recording started: ${mimeType}, ${getRecordingBitrate()/1000}kbps, ${fps}fps`);
  } catch (err) {
    console.warn('Recording failed/blocked:', err);
    enableRecordUI(false);
  }
}

function stopRecording() {
  try {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
  } catch {}
  mediaRecorder = null;
  UI.btnRecord.textContent = 'Start Recording';
}

function toggleAutoRecord() {
  autoRecordEnabled = !autoRecordEnabled;
  UI.btnAutoRecord.textContent = autoRecordEnabled ? 'Auto-record: ON' : 'Auto-record: OFF';
  UI.btnAutoRecord.className = autoRecordEnabled ? 'auto-record-on' : '';
}

// Resize functionality
function initResize() {
  const handle = UI.resizeHandle;
  
  handle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    
    const gridCols = document.body.style.gridTemplateColumns.split(' ');
    startLeftWidth = parseInt(gridCols[1]) || 50; // Default fallback
    startRightWidth = parseInt(gridCols[3]) || 520;
    
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', stopResize);
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
  });
}

function handleResize(e) {
  if (!isResizing) return;
  
  const deltaX = e.clientX - startX;
  const newRightWidth = Math.max(300, startRightWidth - deltaX); // Min 300px for Blockly
  
  document.body.style.gridTemplateColumns = `320px 1fr 4px ${newRightWidth}px`;
}

function stopResize() {
  isResizing = false;
  document.removeEventListener('mousemove', handleResize);
  document.removeEventListener('mouseup', stopResize);
  document.body.style.cursor = '';
}

// Physics engine management
function switchPhysicsEngine() {
  const engine = UI.physicsSelect.value;
  window.setPhysicsEngine(engine);
  
  // Show/hide appropriate settings
  if (engine === 'realistic') {
    UI.arcadeSettings.style.display = 'none';
    UI.realisticSettings.style.display = 'block';
  } else {
    UI.arcadeSettings.style.display = 'block';
    UI.realisticSettings.style.display = 'none';
  }
  
  console.log(`Switched to ${engine} physics`);
}

function updatePhysicsParameters() {
  // Update arcade physics parameters
  if (window.physicsConfig) {
    window.physicsConfig.arcade.minReflectionAngle = parseFloat(UI.arcadeMinAngle.value) || 15;
    window.physicsConfig.arcade.maxReflectionAngle = parseFloat(UI.arcadeMaxAngle.value) || 165;
    
    // Update realistic physics parameters
    window.physicsConfig.realistic.gravity = parseFloat(UI.realisticGravity.value) || 980;
    window.physicsConfig.realistic.elasticity = parseFloat(UI.realisticElasticity.value) || 0.85;
    window.physicsConfig.realistic.airResistance = parseFloat(UI.realisticAirResistance.value) || 0.99;
  }
}

function applyProgram() {
  try {
    window.applySeed(UI.seed.value || 'seed');
    window.state.program = window.compileWorkspace(window.workspace);
    console.log('[applyProgram] OK', window.state.program);
  } catch (err) {
    console.error('[applyProgram] failed:', err);
  }
}

function runTests() {
  const results = [];
  const ok = (name, cond) => results.push({ name, pass: !!cond });
  
  try {
    const JS = (Blockly.JavaScript || Blockly.javascriptGenerator);
    ok('Generator present', !!JS);
    ok('forBlock usable', !!(JS && JS.forBlock));
    const G = (JS && (JS.forBlock || JS));
    ok('event_wall_hit registered', !!(G && (G['event_wall_hit'])));
  } catch (e) {
    ok('Generator checks threw', false);
  }
  
  try {
    window.loadPreset('duplicate', window.workspace);
    const JS = (Blockly.JavaScript || Blockly.javascriptGenerator);
    const code = JS.workspaceToCode(window.workspace);
    ok('workspaceToCode yields code', typeof code === 'string' && code.length > 0);
    ok('contains onWallHit register', code.includes('api.register("onWallHit"'));
  } catch (e) {
    ok('Codegen threw', false);
  }
  
  try {
    applyProgram();
    ok('program.onWallHit exists', typeof window.state.program?.onWallHit === 'function');
  } catch (e) {
    ok('Apply program threw', false);
  }
  
  try {
    window.reset();
    window.applySeed('tests');
    window.spawnBall();
    const before = window.state.balls.length;
    if (typeof window.state.program?.onWallHit === 'function') {
      window.state.program.onWallHit({
        id: window.state.balls[0].id,
        get x() { return window.state.balls[0].x; },
        get y() { return window.state.balls[0].y; },
        get vx() { return window.state.balls[0].vx; },
        get vy() { return window.state.balls[0].vy; },
        get r() { return window.state.balls[0].r; },
        get color() { return window.state.balls[0].color; },
        duplicate() { window.duplicateBall(window.state.balls[0]); }
      });
    }
    const after = window.state.balls.length;
    ok('onWallHit duplicate increases count', after > before);
  } catch (e) {
    ok('Simulated onWallHit threw', false);
  }
  
  try {
    const dom = window.BX.textToDom(window.PRESETS.duplicate);
    ok('BX.textToDom returns Node', !!dom && !!dom.nodeName);
  } catch (e) {
    ok('BX.textToDom threw', false);
  }
  
  ok('MediaRecorder available OR disabled gracefully', 
    (!!window.MediaRecorder && !!$('#sim').captureStream) || UI.btnRecord.disabled === true);
  
  try {
    ok('Auto-record functionality initialized', typeof autoRecordEnabled === 'boolean');
    ok('Resize handle present', !!UI.resizeHandle);
    ok('Recording options available', !!(UI.recordFormat && UI.recordFps && UI.recordQuality));
    ok('Physics engine selector present', !!UI.physicsSelect);
    ok('Physics config available', !!(window.physicsConfig && window.setPhysicsEngine));
    ok('Arcade physics parameters available', !!(UI.arcadeMinAngle && UI.arcadeMaxAngle && window.physicsConfig.arcade));
    ok('Realistic physics parameters available', !!(UI.realisticGravity && window.physicsConfig.realistic));
  } catch (e) {
    ok('New UI features threw', false);
  }
  
  try {
    window.loadPreset('escape', window.workspace);
    const JS = (Blockly.JavaScript || Blockly.javascriptGenerator);
    const code2 = JS.workspaceToCode(window.workspace);
    applyProgram();
    const hasExit = typeof window.state.program?.onExit === 'function';
    ok('escape preset wires onExit', hasExit && code2.includes('api.register("onExit"'));
  } catch (e) {
    ok('Escape preset test threw', false);
  }
  
  console.table(results);
  alert(results.every(r => r.pass) ? '✅ Tests passed. See console.' : '❌ Some tests failed. See console.');
}

function setupEventListeners() {
  // Control buttons
  UI.btnApply.addEventListener('click', applyProgram);
  
  UI.btnRun.addEventListener('click', () => {
    if (!window.state.program) applyProgram();
    
    // Reset time tracking to prevent time jumps when resuming
    window.state.lastMs = null;
    window.state.accumulator = 0;
    
    window.state.running = true;
    
    // Auto-record functionality
    if (autoRecordEnabled && (!mediaRecorder || mediaRecorder.state === 'inactive')) {
      startRecording();
    }
    
    window.requestAnimationFrame(window.frame);
  });
  
  UI.btnPause.addEventListener('click', () => {
    window.state.running = false;
    
    // Clear FPS display when stopped
    window.$('#fps').textContent = '0';
    
    // Auto-record functionality
    if (autoRecordEnabled && mediaRecorder && mediaRecorder.state === 'recording') {
      stopRecording();
    }
  });
  
  UI.btnReset.addEventListener('click', () => {
    window.reset();
    window.clearCanvas(true);
    
    // Clear FPS display when reset
    window.$('#fps').textContent = '0';
    
    // Re-render the empty canvas
    window.renderStatic();
    
    // Auto-record functionality
    if (autoRecordEnabled && mediaRecorder && mediaRecorder.state === 'recording') {
      stopRecording();
    }
  });
  
  // Seed controls
  UI.btnReseed.addEventListener('click', () => {
    UI.seed.value = 'seed-' + Math.floor(Math.random() * 1e6);
  });
  
  UI.btnSpawnInit.addEventListener('click', () => {
    try {
      window.applySeed(UI.seed.value || 'seed');
      const n = Math.max(0, Math.min(2000, parseInt(UI.initialBalls.value || '0', 10)));
      for (let i = 0; i < n; i++) window.spawnBall();
      
      // Re-render to show the newly spawned balls even if simulation isn't running
      if (!window.state.running) {
        window.renderStatic();
      }
    } catch (err) {
      console.error('Spawn init failed:', err);
    }
  });
  
  // Settings checkboxes
  UI.chkTrail.addEventListener('change', () => {
    window.state.doTrail = UI.chkTrail.checked;
  });
  
  UI.chkSfx.addEventListener('change', () => {
    window.state.doSfx = UI.chkSfx.checked;
  });
  
  UI.chkCollide.addEventListener('change', () => {
    window.state.doCollide = UI.chkCollide.checked;
  });
  
  // Recording controls
  UI.btnRecord.addEventListener('click', () => {
    if (UI.btnRecord.disabled) return;
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      startRecording();
    } else {
      stopRecording();
    }
  });
  
  UI.btnAutoRecord.addEventListener('click', toggleAutoRecord);
  
  // Recording options
  UI.recordFormat.addEventListener('change', () => {
    // Update filename extension in real-time if needed
    console.log('Recording format changed to:', UI.recordFormat.value);
  });
  
  UI.recordQuality.addEventListener('change', () => {
    // Update bitrate field based on quality preset
    const qualityMap = {
      low: 1000,
      medium: 5000,
      high: 10000,
      ultra: 25000
    };
    UI.recordBitrate.value = qualityMap[UI.recordQuality.value] || 5000;
  });
  
  // Presets
  UI.btnLoadPreset.addEventListener('click', () => {
    const v = UI.presetSelect.value;
    if (v) window.loadPreset(v, window.workspace);
  });
  
  // Save/Load XML
  UI.btnExportXml.addEventListener('click', () => {
    try {
      const dom = window.BX.workspaceToDom(window.workspace);
      if (dom) {
        const text = window.BX.domToPrettyText(dom);
        const blob = new Blob([text], { type: 'text/xml' });
        const url = URL.createObjectURL(blob);
        UI.downloadLink.href = url;
        UI.downloadLink.download = 'blocks.xml';
        UI.downloadLink.click();
        URL.revokeObjectURL(url);
        return;
      }
    } catch (e) {
      console.warn('XML export failed', e);
    }
    alert('This Blockly build may not support XML export.');
  });
  
  UI.btnImportXml.addEventListener('click', () => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.xml';
    inp.onchange = (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const dom = window.BX.textToDom(r.result);
          window.workspace.clear();
          window.BX.domToWorkspace(dom, window.workspace);
        } catch (err) {
          alert('Invalid XML');
        }
      };
      r.readAsText(f);
    };
    inp.click();
  });
  
  // Tests
  UI.btnTests.addEventListener('click', runTests);
  
  // Physics engine controls
  UI.physicsSelect.addEventListener('change', switchPhysicsEngine);
  
  // Physics parameter updates
  UI.arcadeMinAngle.addEventListener('input', updatePhysicsParameters);
  UI.arcadeMaxAngle.addEventListener('input', updatePhysicsParameters);
  UI.realisticGravity.addEventListener('input', updatePhysicsParameters);
  UI.realisticElasticity.addEventListener('input', updatePhysicsParameters);
  UI.realisticAirResistance.addEventListener('input', updatePhysicsParameters);
  
  // Initialize resize functionality
  initResize();
}

function initializeUI() {
  // Get all UI element references
  UI.fps = $('#fps');
  UI.ballCount = $('#ballCount');
  UI.btnRun = $('#btnRun');
  UI.btnPause = $('#btnPause');
  UI.btnReset = $('#btnReset');
  UI.btnApply = $('#btnApply');
  UI.btnExportXml = $('#btnExportXml');
  UI.btnImportXml = $('#btnImportXml');
  UI.btnRecord = $('#btnRecord');
  UI.btnAutoRecord = $('#btnAutoRecord');
  UI.downloadLink = $('#downloadLink');
  UI.seed = $('#seed');
  UI.btnReseed = $('#btnReseed');
  UI.initialBalls = $('#initialBalls');
  UI.btnSpawnInit = $('#btnSpawnInit');
  UI.chkTrail = $('#chkTrail');
  UI.chkSfx = $('#chkSfx');
  UI.chkCollide = $('#chkCollide');
  UI.presetSelect = $('#presetSelect');
  UI.btnLoadPreset = $('#btnLoadPreset');
  UI.btnTests = $('#btnTests');
  UI.warnBanner = $('#warnBanner');
  UI.resizeHandle = $('#resizeHandle');
  UI.recordFormat = $('#recordFormat');
  UI.recordFps = $('#recordFps');
  UI.recordQuality = $('#recordQuality');
  UI.recordBitrate = $('#recordBitrate');
  UI.physicsSelect = $('#physicsSelect');
  UI.arcadeSettings = $('#arcadeSettings');
  UI.realisticSettings = $('#realisticSettings');
  UI.arcadeMinAngle = $('#arcadeMinAngle');
  UI.arcadeMaxAngle = $('#arcadeMaxAngle');
  UI.realisticGravity = $('#realisticGravity');
  UI.realisticElasticity = $('#realisticElasticity');
  UI.realisticAirResistance = $('#realisticAirResistance');
  
  // Initialize settings from checkboxes
  window.state.doTrail = UI.chkTrail.checked;
  window.state.doSfx = UI.chkSfx.checked;
  window.state.doCollide = UI.chkCollide.checked;
  
  // Initialize physics engine
  switchPhysicsEngine();
  updatePhysicsParameters();
  
  // Setup recording UI
  enableRecordUI(!!window.MediaRecorder && !!$('#sim').captureStream);
  
  // Initialize recording format options based on browser support
  if (window.MediaRecorder) {
    if (!MediaRecorder.isTypeSupported('video/mp4')) {
      const mp4Option = UI.recordFormat.querySelector('option[value="mp4"]');
      if (mp4Option) {
        mp4Option.textContent = 'MP4 (not supported)';
        mp4Option.disabled = true;
      }
    }
  }
  
  // Setup all event listeners
  setupEventListeners();
}

// Export for use in main.js
window.initializeUI = initializeUI;
window.applyProgram = applyProgram;