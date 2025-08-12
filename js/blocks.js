/**
 * Blockly block definitions and code generators
 */

// JavaScript generator setup
const JS = (Blockly.JavaScript || Blockly.javascriptGenerator);
if (!JS) {
  window.showWarn('No JavaScript generator found in Blockly build.');
}
JS?.addReservedWords && JS.addReservedWords('api,program,utils,rng');
const G = (JS && (JS.forBlock || JS));

// EVENT BLOCKS
// =============

Blockly.Blocks['event_tick'] = {
  init() {
    this.appendDummyInput().appendField('When tick');
    this.appendStatementInput('DO');
    this.setColour('#5CA699');
    this.setTooltip('Runs every physics step');
  }
};

Blockly.Blocks['event_wall_hit'] = {
  init() {
    this.appendDummyInput().appendField('When ball hits wall');
    this.appendStatementInput('DO');
    this.setColour('#5CA699');
    this.setTooltip('Called after a wall bounce');
  }
};

Blockly.Blocks['event_ball_collision'] = {
  init() {
    this.appendDummyInput().appendField('When ball collides with ball');
    this.appendStatementInput('DO');
    this.setColour('#5CA699');
    this.setTooltip('Requires collisions ON');
  }
};

Blockly.Blocks['event_spawn'] = {
  init() {
    this.appendDummyInput().appendField('When ball spawns');
    this.appendStatementInput('DO');
    this.setColour('#5CA699');
  }
};

Blockly.Blocks['event_exit'] = {
  init() {
    this.appendDummyInput().appendField('When ball exits gap');
    this.appendStatementInput('DO');
    this.setColour('#5CA699');
  }
};

// Event generators
G['event_tick'] = function(block, g) {
  const gen = g || JS;
  const s = gen.statementToCode(block, 'DO');
  return `api.register("onTick", function(dt){\n${s}});\n`;
};

G['event_wall_hit'] = function(block, g) {
  const gen = g || JS;
  const s = gen.statementToCode(block, 'DO');
  return `api.register("onWallHit", function(ball){\n${s}});\n`;
};

G['event_ball_collision'] = function(block, g) {
  const gen = g || JS;
  const s = gen.statementToCode(block, 'DO');
  return `api.register("onBallCollision", function(a,b){\n${s}});\n`;
};

G['event_spawn'] = function(block, g) {
  const gen = g || JS;
  const s = gen.statementToCode(block, 'DO');
  return `api.register("onSpawn", function(ball){\n${s}});\n`;
};

G['event_exit'] = function(block, g) {
  const gen = g || JS;
  const s = gen.statementToCode(block, 'DO');
  return `api.register("onExit", function(ball){\n${s}});\n`;
};

// ACTION BLOCKS
// =============

Blockly.Blocks['action_spawn'] = {
  init() {
    this.appendDummyInput()
      .appendField('Create')
      .appendField(new Blockly.FieldNumber(1, 1, 100, 1), 'N')
      .appendField('ball(s)');
    this.appendValueInput('R')
      .setCheck('Number')
      .appendField('radius');
    this.setColour('#5C81A6');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
  }
};

Blockly.Blocks['action_duplicate'] = {
  init() {
    this.appendDummyInput().appendField('Duplicate ball');
    this.setColour('#5C81A6');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
  }
};

Blockly.Blocks['action_destroy'] = {
  init() {
    this.appendDummyInput().appendField('Destroy ball');
    this.setColour('#5C81A6');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
  }
};

Blockly.Blocks['action_set_velocity'] = {
  init() {
    this.appendValueInput('VX')
      .setCheck('Number')
      .appendField('Set velocity vx');
    this.appendValueInput('VY')
      .setCheck('Number')
      .appendField('vy');
    this.setColour('#5C81A6');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
  }
};

Blockly.Blocks['action_scale_speed'] = {
  init() {
    this.appendValueInput('F')
      .setCheck('Number')
      .appendField('Scale speed ×');
    this.setColour('#5C81A6');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
  }
};

Blockly.Blocks['action_set_radius'] = {
  init() {
    this.appendValueInput('R')
      .setCheck('Number')
      .appendField('Set radius');
    this.setColour('#5C81A6');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
  }
};

Blockly.Blocks['action_set_color'] = {
  init() {
    this.appendValueInput('C')
      .setCheck(null)
      .appendField('Set color');
    this.setColour('#5C81A6');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
  }
};

Blockly.Blocks['action_log'] = {
  init() {
    this.appendValueInput('MSG')
      .setCheck(null)
      .appendField('Log');
    this.setColour('#5C81A6');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
  }
};

Blockly.Blocks['action_score'] = {
  init() {
    this.appendValueInput('D')
      .setCheck('Number')
      .appendField('Add score');
    this.setColour('#5C81A6');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
  }
};

// Action generators
G['action_spawn'] = function(block, g) {
  const gen = g || JS;
  const n = block.getFieldValue('N') || 1;
  const r = gen.valueToCode(block, 'R', gen.ORDER_NONE) || 'undefined';
  return `api.spawn(${n}, { r: ${r} });\n`;
};

G['action_duplicate'] = function() {
  return `api.dup(ball);\n`;
};

G['action_destroy'] = function() {
  return `api.kill(ball);\n`;
};

G['action_set_velocity'] = function(block, g) {
  const gen = g || JS;
  const vx = gen.valueToCode(block, 'VX', gen.ORDER_NONE) || '0';
  const vy = gen.valueToCode(block, 'VY', gen.ORDER_NONE) || '0';
  return `ball.setVelocity(${vx}, ${vy});\n`;
};

G['action_scale_speed'] = function(block, g) {
  const gen = g || JS;
  const f = gen.valueToCode(block, 'F', gen.ORDER_NONE) || '1';
  return `ball.scaleSpeed(${f});\n`;
};

G['action_set_radius'] = function(block, g) {
  const gen = g || JS;
  const r = gen.valueToCode(block, 'R', gen.ORDER_NONE) || '10';
  return `ball.r = ${r};\n`;
};

G['action_set_color'] = function(block, g) {
  const gen = g || JS;
  const c = gen.valueToCode(block, 'C', gen.ORDER_NONE) || '"#fff"';
  return `ball.color = ${c};\n`;
};

G['action_log'] = function(block, g) {
  const gen = g || JS;
  const m = gen.valueToCode(block, 'MSG', gen.ORDER_NONE) || '""';
  return `api.log(${m});\n`;
};

G['action_score'] = function(block, g) {
  const gen = g || JS;
  const d = gen.valueToCode(block, 'D', gen.ORDER_NONE) || '1';
  return `api.score(${d});\n`;
};

// BALL PROPERTY BLOCKS
// ====================

Blockly.Blocks['ball_get'] = {
  init() {
    this.appendDummyInput()
      .appendField('get')
      .appendField(new Blockly.FieldDropdown([
        ['x', 'x'],
        ['y', 'y'],
        ['vx', 'vx'],
        ['vy', 'vy'],
        ['radius', 'r'],
        ['color', 'color']
      ]), 'K');
    this.setOutput(true);
    this.setColour('#A6745C');
  }
};

Blockly.Blocks['ball_set'] = {
  init() {
    this.appendDummyInput()
      .appendField('set')
      .appendField(new Blockly.FieldDropdown([
        ['x', 'x'],
        ['y', 'y'],
        ['vx', 'vx'],
        ['vy', 'vy'],
        ['radius', 'r'],
        ['color', 'color']
      ]), 'K')
      .appendField('to');
    this.appendValueInput('V');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setColour('#A6745C');
  }
};

// Ball property generators
G['ball_get'] = function(block) {
  const k = block.getFieldValue('K');
  if (k === 'radius') return ['ball.r', JS.ORDER_MEMBER || 0];
  return [`ball.${k}`, JS.ORDER_MEMBER || 0];
};

G['ball_set'] = function(block, g) {
  const gen = g || JS;
  const k = block.getFieldValue('K');
  const v = gen.valueToCode(block, 'V', gen.ORDER_NONE) || '0';
  if (k === 'r' || k === 'radius') return `ball.r = ${v};\n`;
  return `ball.${k} = ${v};\n`;
};

// UTILITY BLOCKS
// ==============

Blockly.Blocks['util_rand'] = {
  init() {
    this.appendDummyInput().appendField('rand()');
    this.setOutput(true, 'Number');
    this.setColour('#A65C81');
  }
};

Blockly.Blocks['util_map'] = {
  init() {
    this.appendDummyInput().appendField('map');
    this.appendValueInput('X').setCheck('Number').appendField('x');
    this.appendValueInput('A').setCheck('Number').appendField('from a');
    this.appendValueInput('B').setCheck('Number').appendField('to b');
    this.appendValueInput('C').setCheck('Number').appendField('→ c');
    this.appendValueInput('D').setCheck('Number').appendField('… d');
    this.setOutput(true, 'Number');
    this.setColour('#A65C81');
  }
};

// Utility generators
G['util_rand'] = function() {
  return ['rng()', JS.ORDER_FUNCTION_CALL || 0];
};

G['util_map'] = function(block, g) {
  const gen = g || JS;
  const x = gen.valueToCode(block, 'X', gen.ORDER_NONE) || '0';
  const a = gen.valueToCode(block, 'A', gen.ORDER_NONE) || '0';
  const b = gen.valueToCode(block, 'B', gen.ORDER_NONE) || '1';
  const c = gen.valueToCode(block, 'C', gen.ORDER_NONE) || '0';
  const d = gen.valueToCode(block, 'D', gen.ORDER_NONE) || '1';
  return [`utils.map(${x},${a},${b},${c},${d})`, JS.ORDER_FUNCTION_CALL || 0];
};

// COMPILATION FUNCTION
// ====================

function compileWorkspace(workspace) {
  let code = '';
  try {
    code = JS.workspaceToCode(workspace);
  } catch (err) {
    console.error('workspaceToCode failed:', err);
    throw err;
  }
  
  const handlers = {};
  const api = {
    register(name, fn) { handlers[name] = fn; },
    spawn(n, props) {
      for (let i = 0; i < n; i++) window.spawnBall(props || {});
    },
    dup(ball) { window.duplicateBall(resolveBall(ball)); },
    kill(ball) { window.destroyBall(resolveBall(ball)); },
    log(...a) { console.log('[RULE]', ...a); },
    score(d) { window.state.score += (d || 1); }
  };
  
  function resolveBall(bp) {
    return window.state.balls.find(b => b.id === bp.id) || null;
  }
  
  try {
    const fn = new Function('api', 'utils', 'rng', code + "\nreturn true;");
    fn(api, window.utils, window.rng);
  } catch (err) {
    console.error('Program compile error:', err);
    window.showWarn('Your environment may block dynamic code (CSP). Program not applied.');
    throw err;
  }
  
  return handlers;
}

// Export for use in other modules
window.compileWorkspace = compileWorkspace;