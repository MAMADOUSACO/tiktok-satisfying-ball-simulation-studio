/**
 * Blockly block definitions and code generators
 * Enhanced with Custom Draggable Parameters
 */

// JavaScript generator setup
const JS = (Blockly.JavaScript || Blockly.javascriptGenerator);
if (!JS) {
  window.showWarn('No JavaScript generator found in Blockly build.');
}
JS?.addReservedWords && JS.addReservedWords('api,program,utils,rng');
const G = (JS && (JS.forBlock || JS));

// ============================================================================
// WORKSPACE ACCESS HELPER
// ============================================================================

function getWorkspace() {
  // Try multiple ways to get the workspace
  if (window.workspace) return window.workspace;
  
  // Try getting from Blockly
  if (window.Blockly && window.Blockly.getMainWorkspace) {
    return window.Blockly.getMainWorkspace();
  }
  
  // Try getting from any existing block
  if (dragStartField && dragStartField.getSourceBlock) {
    const block = dragStartField.getSourceBlock();
    if (block && block.workspace) {
      return block.workspace;
    }
  }
  
  return null;
}

// ============================================================================
// CUSTOM DRAGGABLE PARAMETER SYSTEM
// ============================================================================

// Global drag state
let isDraggingParameter = false;
let dragStartField = null;
let dragGhost = null;
let mouseStartX = 0;
let mouseStartY = 0;
let hasDragStarted = false;
let highlightedElements = [];

/**
 * Custom Field for Draggable Parameters
 * Creates block-style tokens that can be dragged to create parameter connections
 */
class FieldParameter extends Blockly.Field {
  constructor(paramName, validator, config) {
    super(paramName, validator, config);
    
    this.SERIALIZABLE = true;
    this.EDITABLE = false;
    this.paramName_ = paramName || 'param';
    this.paramColor_ = '#9966ff';
    this.paramId_ = 'param_' + Math.random().toString(36).substr(2, 9);
    
    this.size_ = new Blockly.utils.Size(0, 0);
    this.isMouseDown_ = false;
  }

  initView() {
    if (!this.fieldGroup_) {
      this.fieldGroup_ = Blockly.utils.dom.createSvgElement('g', {}, null);
    }

    const textWidth = this.paramName_.length * 8;
    const width = Math.max(50, textWidth + 20);
    const height = 32;
    const cornerRadius = 16; // Half of height for fully rounded ends

    // Create block-like background (rounded rectangle, not oval)
    this.blockElement_ = Blockly.utils.dom.createSvgElement('rect', {
      'width': width,
      'height': height,
      'x': 0,
      'y': 0,
      'rx': cornerRadius,
      'ry': cornerRadius,
      'fill': this.paramColor_,
      'stroke': '#7744cc',
      'stroke-width': 1,
      'class': 'blocklyFieldParameter',
      'style': 'cursor: grab; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.3));'
    }, this.fieldGroup_);

    // Create text element with proper positioning
    this.textElement_ = Blockly.utils.dom.createSvgElement('text', {
      'x': width / 2,
      'y': height / 2 + 1,
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      'class': 'blocklyText',
      'fill': 'white',
      'font-size': '13px',
      'font-weight': '600',
      'font-family': 'Arial, sans-serif',
      'style': 'pointer-events: none; user-select: none;'
    }, this.fieldGroup_);

    // Set initial text
    this.textElement_.textContent = this.paramName_;

    // Update size
    this.updateSize_();
  }

  updateSize_() {
    const textWidth = this.paramName_.length * 8;
    const width = Math.max(50, textWidth + 20);
    const height = 32;
    const cornerRadius = 16;

    if (this.blockElement_) {
      this.blockElement_.setAttribute('width', width);
      this.blockElement_.setAttribute('height', height);
      this.blockElement_.setAttribute('rx', cornerRadius);
      this.blockElement_.setAttribute('ry', cornerRadius);
      
      this.textElement_.setAttribute('x', width / 2);
      this.textElement_.setAttribute('y', height / 2 + 1);
    }

    this.size_.width = width;
    this.size_.height = height;
  }

  bindEvents_() {
    const target = this.getClickTarget_();
    
    this.mouseDownWrapper_ = Blockly.browserEvents.bind(
      target, 'mousedown', this, this.onMouseDown_
    );
    
    this.mouseMoveWrapper_ = Blockly.browserEvents.bind(
      document, 'mousemove', this, this.onMouseMove_
    );
    
    this.mouseUpWrapper_ = Blockly.browserEvents.bind(
      document, 'mouseup', this, this.onMouseUp_
    );
  }

  onMouseDown_(event) {
    event.stopPropagation();
    event.preventDefault();
    
    this.isMouseDown_ = true;
    mouseStartX = event.clientX;
    mouseStartY = event.clientY;
    hasDragStarted = false;
    
    // Visual feedback
    if (this.blockElement_) {
      this.blockElement_.style.cursor = 'grabbing';
      this.blockElement_.setAttribute('fill', '#bb88ff');
    }
  }
  
  onMouseMove_(event) {
    if (!this.isMouseDown_) return;
    
    const deltaX = Math.abs(event.clientX - mouseStartX);
    const deltaY = Math.abs(event.clientY - mouseStartY);
    
    // Start drag if moved enough
    if (!hasDragStarted && (deltaX > 5 || deltaY > 5)) {
      hasDragStarted = true;
      startParameterDrag(this, event);
    }
    
    // Continue drag if already started
    if (hasDragStarted && isDraggingParameter) {
      updateDragGhost(event.clientX, event.clientY);
      highlightDropZones(event.clientX, event.clientY);
    }
  }
  
  onMouseUp_(event) {
    if (!this.isMouseDown_) return;
    
    this.isMouseDown_ = false;
    
    // Reset visual state
    if (this.blockElement_) {
      this.blockElement_.style.cursor = 'grab';
      this.blockElement_.setAttribute('fill', this.paramColor_);
    }
    
    // Handle drag end if we were dragging
    if (hasDragStarted && isDraggingParameter) {
      endParameterDrag(event);
    }
    
    hasDragStarted = false;
  }

  getClickTarget_() {
    return this.blockElement_ || this.fieldGroup_;
  }

  setValue(newValue) {
    if (newValue !== null && newValue !== undefined) {
      this.paramName_ = String(newValue);
    }
    super.setValue(newValue);
  }
}

// Register the custom field
Blockly.fieldRegistry.register('field_parameter', FieldParameter);

// ============================================================================
// DRAG AND DROP SYSTEM
// ============================================================================

function startParameterDrag(field, event) {
  if (isDraggingParameter) return;
  
  isDraggingParameter = true;
  dragStartField = field;
  
  // Create visual drag ghost
  createDragGhost(field.getValue(), event.clientX, event.clientY);
}

function createDragGhost(paramName, x, y) {
  dragGhost = document.createElement('div');
  dragGhost.className = 'drag-ghost';
  dragGhost.textContent = paramName;
  dragGhost.style.left = x + 'px';
  dragGhost.style.top = y + 'px';
  document.body.appendChild(dragGhost);
}

function updateDragGhost(x, y) {
  if (dragGhost) {
    dragGhost.style.left = x + 'px';
    dragGhost.style.top = y + 'px';
  }
}

function endParameterDrag(event) {
  if (!isDraggingParameter) return;
  
  // Remove ghost
  if (dragGhost) {
    document.body.removeChild(dragGhost);
    dragGhost = null;
  }
  
  // Try to drop parameter
  attemptParameterDrop(event.clientX, event.clientY);
  
  // Cleanup
  isDraggingParameter = false;
  dragStartField = null;
  clearDropZoneHighlights();
}

function highlightDropZones(clientX, clientY) {
  clearDropZoneHighlights();
  
  // Get workspace safely
  const workspace = getWorkspace();
  if (!workspace) return;
  
  // Check for connection first
  const connectionResult = findConnectionUnderMouse(clientX, clientY);
  if (connectionResult.connection) {
    const targetBlock = connectionResult.block;
    const blockSvg = targetBlock.getSvgRoot();
    if (blockSvg) {
      blockSvg.classList.add('blockly-drop-zone-highlight');
      highlightedElements.push(blockSvg);
    }
    return;
  }
  
  // Check if over workspace
  const blocklyDiv = document.getElementById('blocklyDiv');
  const blocklyRect = blocklyDiv.getBoundingClientRect();
  
  if (clientX >= blocklyRect.left && clientX <= blocklyRect.right &&
      clientY >= blocklyRect.top && clientY <= blocklyRect.bottom) {
    blocklyDiv.style.backgroundColor = 'rgba(68, 170, 68, 0.1)';
    highlightedElements.push(blocklyDiv);
  }
}

function clearDropZoneHighlights() {
  highlightedElements.forEach(element => {
    if (element.classList) {
      element.classList.remove('blockly-drop-zone-highlight');
    } else if (element.style) {
      element.style.backgroundColor = '';
    }
  });
  highlightedElements = [];
}

function attemptParameterDrop(clientX, clientY) {
  // Get workspace safely
  const workspace = getWorkspace();
  if (!workspace) {
    console.warn('Workspace not available for parameter drop');
    return;
  }
  
  // Get workspace coordinates
  const blocklyDiv = document.getElementById('blocklyDiv');
  const blocklyRect = blocklyDiv.getBoundingClientRect();
  
  // Check if dropping in workspace
  if (clientX < blocklyRect.left || clientX > blocklyRect.right ||
      clientY < blocklyRect.top || clientY > blocklyRect.bottom) {
    return;
  }
  
  // Convert screen coordinates to workspace coordinates
  const workspaceCoords = screenToWorkspaceCoordinates(clientX, clientY);
  if (!workspaceCoords) return;
  
  // Try to find a block connection first
  const connectionResult = findConnectionUnderMouse(clientX, clientY);
  if (connectionResult.connection) {
    createAndConnectParameterBlock(connectionResult.connection, dragStartField.getValue());
  } else {
    // Create free-floating block
    createParameterBlockInWorkspace(dragStartField.getValue(), workspaceCoords);
  }
}

function screenToWorkspaceCoordinates(screenX, screenY) {
  const workspace = getWorkspace();
  if (!workspace) {
    console.warn('Workspace not available for coordinate conversion');
    return null;
  }
  
  const blocklyDiv = document.getElementById('blocklyDiv');
  const blocklyRect = blocklyDiv.getBoundingClientRect();
  
  const divX = screenX - blocklyRect.left;
  const divY = screenY - blocklyRect.top;
  
  try {
    const originOffset = workspace.getOriginOffsetInPixels();
    const scale = workspace.scale;
    
    const workspaceX = (divX - originOffset.x) / scale;
    const workspaceY = (divY - originOffset.y) / scale;
    
    return { x: workspaceX, y: workspaceY };
  } catch (error) {
    console.warn('Error converting coordinates:', error);
    return { x: divX, y: divY }; // Fallback to div coordinates
  }
}

function findConnectionUnderMouse(clientX, clientY) {
  const workspace = getWorkspace();
  if (!workspace) {
    console.warn('Workspace not available for connection detection');
    return { connection: null, block: null };
  }
  
  // Get all blocks in workspace
  const blocks = workspace.getAllBlocks(false);
  
  for (let block of blocks) {
    for (let input of block.inputList) {
      if (input.type === Blockly.INPUT_VALUE && input.connection && !input.connection.targetConnection) {
        try {
          const blockPos = block.getRelativeToSurfaceXY();
          const inputOffsetX = block.width - 20;
          const inputOffsetY = 20;
          
          const inputWorkspaceX = blockPos.x + inputOffsetX;
          const inputWorkspaceY = blockPos.y + inputOffsetY;
          
          const originOffset = workspace.getOriginOffsetInPixels();
          const scale = workspace.scale;
          const blocklyDiv = document.getElementById('blocklyDiv');
          const blocklyRect = blocklyDiv.getBoundingClientRect();
          
          const inputScreenX = blocklyRect.left + (inputWorkspaceX * scale) + originOffset.x;
          const inputScreenY = blocklyRect.top + (inputWorkspaceY * scale) + originOffset.y;
          
          const distance = Math.sqrt(
            Math.pow(clientX - inputScreenX, 2) + 
            Math.pow(clientY - inputScreenY, 2)
          );
          
          if (distance < 80) {
            return { connection: input.connection, block: block };
          }
        } catch (e) {
          continue;
        }
      }
    }
  }
  
  return { connection: null, block: null };
}

function createAndConnectParameterBlock(connection, paramName) {
  const workspace = getWorkspace();
  if (!workspace) {
    console.warn('Workspace not available for block creation');
    return;
  }
  
  try {
    const paramBlock = workspace.newBlock('parameter_get');
    paramBlock.initSvg();
    paramBlock.setParameterName(paramName);
    paramBlock.render();
    
    connection.connect(paramBlock.outputConnection);
  } catch (error) {
    console.error('Failed to connect parameter block:', error);
  }
}

function createParameterBlockInWorkspace(paramName, coords) {
  const workspace = getWorkspace();
  if (!workspace) {
    console.warn('Workspace not available for block creation');
    return;
  }
  
  try {
    const paramBlock = workspace.newBlock('parameter_get');
    paramBlock.initSvg();
    paramBlock.setParameterName(paramName);
    paramBlock.render();
    
    const blockBounds = paramBlock.getBoundingRectangle();
    const blockWidth = blockBounds.width || 80;
    const blockHeight = blockBounds.height || 32;
    
    const centeredX = coords.x - (blockWidth / 2);
    const centeredY = coords.y - (blockHeight / 2);
    
    paramBlock.moveBy(centeredX, centeredY);
  } catch (error) {
    console.error('Failed to create parameter block:', error);
  }
}

// ============================================================================
// PARAMETER BLOCK DEFINITION
// ============================================================================

Blockly.Blocks['parameter_get'] = {
  init: function() {
    this.appendDummyInput()
      .appendField(new Blockly.FieldLabel('param'), 'PARAM_NAME');
    this.setOutput(true, null);
    this.setColour('#9966ff');
    this.setTooltip('Parameter from event block');
  },
  
  setParameterName: function(name) {
    this.setFieldValue(name, 'PARAM_NAME');
  }
};

// ============================================================================
// ENHANCED EVENT BLOCKS WITH DRAGGABLE PARAMETERS
// ============================================================================

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
    this.appendDummyInput()
      .appendField('When')
      .appendField(new FieldParameter('ball'), 'PARAM_BALL')
      .appendField('hits wall');
    this.appendStatementInput('DO');
    this.setColour('#5CA699');
    this.setTooltip('Called after a wall bounce - drag the ball parameter to actions!');
  }
};

Blockly.Blocks['event_ball_collision'] = {
  init() {
    this.appendDummyInput()
      .appendField('When')
      .appendField(new FieldParameter('ball1'), 'PARAM_BALL1')
      .appendField('collides with')
      .appendField(new FieldParameter('ball2'), 'PARAM_BALL2');
    this.appendStatementInput('DO');
    this.setColour('#5CA699');
    this.setTooltip('Requires collisions ON - drag ball1/ball2 parameters to actions!');
  }
};

Blockly.Blocks['event_spawn'] = {
  init() {
    this.appendDummyInput()
      .appendField('When')
      .appendField(new FieldParameter('ball'), 'PARAM_BALL')
      .appendField('spawns');
    this.appendStatementInput('DO');
    this.setColour('#5CA699');
    this.setTooltip('Called when a new ball is created - drag the ball parameter to actions!');
  }
};

Blockly.Blocks['event_exit'] = {
  init() {
    this.appendDummyInput()
      .appendField('When')
      .appendField(new FieldParameter('ball'), 'PARAM_BALL')
      .appendField('exits gap');
    this.appendStatementInput('DO');
    this.setColour('#5CA699');
    this.setTooltip('Called when ball escapes through gap - drag the ball parameter to actions!');
  }
};

// ============================================================================
// ACTION BLOCKS (Enhanced to accept parameter connections)
// ============================================================================

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
    this.appendDummyInput().appendField('Duplicate');
    this.appendValueInput('BALL')
      .setCheck(null)
      .appendField('ball');
    this.setColour('#5C81A6');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Duplicate a ball - connect a ball parameter or leave empty for current ball');
  }
};

Blockly.Blocks['action_destroy'] = {
  init() {
    this.appendDummyInput().appendField('Destroy');
    this.appendValueInput('BALL')
      .setCheck(null)
      .appendField('ball');
    this.setColour('#5C81A6');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Destroy a ball - connect a ball parameter or leave empty for current ball');
  }
};

Blockly.Blocks['action_set_velocity'] = {
  init() {
    this.appendValueInput('BALL')
      .setCheck(null)
      .appendField('Set');
    this.appendValueInput('VX')
      .setCheck('Number')
      .appendField('velocity vx');
    this.appendValueInput('VY')
      .setCheck('Number')
      .appendField('vy');
    this.setColour('#5C81A6');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Set ball velocity - connect a ball parameter or leave empty for current ball');
  }
};

Blockly.Blocks['action_scale_speed'] = {
  init() {
    this.appendValueInput('BALL')
      .setCheck(null)
      .appendField('Scale');
    this.appendValueInput('F')
      .setCheck('Number')
      .appendField('speed ×');
    this.setColour('#5C81A6');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Scale ball speed - connect a ball parameter or leave empty for current ball');
  }
};

Blockly.Blocks['action_set_radius'] = {
  init() {
    this.appendValueInput('BALL')
      .setCheck(null)
      .appendField('Set');
    this.appendValueInput('R')
      .setCheck('Number')
      .appendField('radius');
    this.setColour('#5C81A6');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Set ball radius - connect a ball parameter or leave empty for current ball');
  }
};

Blockly.Blocks['action_set_color'] = {
  init() {
    this.appendValueInput('BALL')
      .setCheck(null)
      .appendField('Set');
    this.appendValueInput('C')
      .setCheck(null)
      .appendField('color');
    this.setColour('#5C81A6');
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setTooltip('Set ball color - connect a ball parameter or leave empty for current ball');
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

// ============================================================================
// ENHANCED CODE GENERATORS
// ============================================================================

// Event generators with parameter support
G['event_tick'] = function(block, g) {
  const gen = g || JS;
  const s = gen.statementToCode(block, 'DO');
  return `api.register("onTick", function(dt){\n${s}});\n`;
};

G['event_wall_hit'] = function(block, g) {
  const gen = g || JS;
  const paramName = block.getFieldValue('PARAM_BALL') || 'ball';
  const s = gen.statementToCode(block, 'DO');
  return `api.register("onWallHit", function(${paramName}){\n${s}});\n`;
};

G['event_ball_collision'] = function(block, g) {
  const gen = g || JS;
  const param1 = block.getFieldValue('PARAM_BALL1') || 'ball1';
  const param2 = block.getFieldValue('PARAM_BALL2') || 'ball2';
  const s = gen.statementToCode(block, 'DO');
  return `api.register("onBallCollision", function(${param1},${param2}){\n${s}});\n`;
};

G['event_spawn'] = function(block, g) {
  const gen = g || JS;
  const paramName = block.getFieldValue('PARAM_BALL') || 'ball';
  const s = gen.statementToCode(block, 'DO');
  return `api.register("onSpawn", function(${paramName}){\n${s}});\n`;
};

G['event_exit'] = function(block, g) {
  const gen = g || JS;
  const paramName = block.getFieldValue('PARAM_BALL') || 'ball';
  const s = gen.statementToCode(block, 'DO');
  return `api.register("onExit", function(${paramName}){\n${s}});\n`;
};

// Parameter block generator
G['parameter_get'] = function(block, g) {
  const paramName = block.getFieldValue('PARAM_NAME') || 'param';
  const gen = g || JS;
  return [paramName, gen.ORDER_ATOMIC];
};

// Enhanced action generators with parameter support
G['action_spawn'] = function(block, g) {
  const gen = g || JS;
  const n = block.getFieldValue('N') || 1;
  const r = gen.valueToCode(block, 'R', gen.ORDER_NONE) || 'undefined';
  return `api.spawn(${n}, { r: ${r} });\n`;
};

G['action_duplicate'] = function(block, g) {
  const gen = g || JS;
  const ball = gen.valueToCode(block, 'BALL', gen.ORDER_NONE) || 'ball';
  return `api.dup(${ball});\n`;
};

G['action_destroy'] = function(block, g) {
  const gen = g || JS;
  const ball = gen.valueToCode(block, 'BALL', gen.ORDER_NONE) || 'ball';
  return `api.kill(${ball});\n`;
};

G['action_set_velocity'] = function(block, g) {
  const gen = g || JS;
  const ball = gen.valueToCode(block, 'BALL', gen.ORDER_NONE) || 'ball';
  const vx = gen.valueToCode(block, 'VX', gen.ORDER_NONE) || '0';
  const vy = gen.valueToCode(block, 'VY', gen.ORDER_NONE) || '0';
  return `(${ball}).setVelocity(${vx}, ${vy});\n`;
};

G['action_scale_speed'] = function(block, g) {
  const gen = g || JS;
  const ball = gen.valueToCode(block, 'BALL', gen.ORDER_NONE) || 'ball';
  const f = gen.valueToCode(block, 'F', gen.ORDER_NONE) || '1';
  return `(${ball}).scaleSpeed(${f});\n`;
};

G['action_set_radius'] = function(block, g) {
  const gen = g || JS;
  const ball = gen.valueToCode(block, 'BALL', gen.ORDER_NONE) || 'ball';
  const r = gen.valueToCode(block, 'R', gen.ORDER_NONE) || '10';
  return `(${ball}).r = ${r};\n`;
};

G['action_set_color'] = function(block, g) {
  const gen = g || JS;
  const ball = gen.valueToCode(block, 'BALL', gen.ORDER_NONE) || 'ball';
  const c = gen.valueToCode(block, 'C', gen.ORDER_NONE) || '"#fff"';
  return `(${ball}).color = ${c};\n`;
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

// ============================================================================
// BALL PROPERTY BLOCKS (Enhanced)
// ============================================================================

Blockly.Blocks['ball_get'] = {
  init() {
    this.appendValueInput('BALL')
      .setCheck(null)
      .appendField('get');
    this.appendDummyInput()
      .appendField(new Blockly.FieldDropdown([
        ['x', 'x'],
        ['y', 'y'],
        ['vx', 'vx'],
        ['vy', 'vy'],
        ['radius', 'r'],
        ['color', 'color']
      ]), 'K')
      .appendField('of');
    this.setOutput(true);
    this.setColour('#A6745C');
    this.setTooltip('Get property of a ball - connect a ball parameter');
  }
};

Blockly.Blocks['ball_set'] = {
  init() {
    this.appendValueInput('BALL')
      .setCheck(null)
      .appendField('set');
    this.appendDummyInput()
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
    this.setTooltip('Set property of a ball - connect a ball parameter');
  }
};

// Enhanced ball property generators
G['ball_get'] = function(block, g) {
  const gen = g || JS;
  const ball = gen.valueToCode(block, 'BALL', gen.ORDER_NONE) || 'ball';
  const k = block.getFieldValue('K');
  if (k === 'radius') return [`(${ball}).r`, gen.ORDER_MEMBER || 0];
  return [`(${ball}).${k}`, gen.ORDER_MEMBER || 0];
};

G['ball_set'] = function(block, g) {
  const gen = g || JS;
  const ball = gen.valueToCode(block, 'BALL', gen.ORDER_NONE) || 'ball';
  const k = block.getFieldValue('K');
  const v = gen.valueToCode(block, 'V', gen.ORDER_NONE) || '0';
  if (k === 'r' || k === 'radius') return `(${ball}).r = ${v};\n`;
  return `(${ball}).${k} = ${v};\n`;
};

// ============================================================================
// UTILITY BLOCKS (unchanged)
// ============================================================================

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

// Utility generators (unchanged)
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

// ============================================================================
// COMPILATION FUNCTION (unchanged)
// ============================================================================

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