/**
 * Preset configurations for the Bouncing Balls Editor
 * Enhanced for Custom Draggable Parameters
 */

const PRESETS = {
  duplicate: `<xml xmlns="https://developers.google.com/blockly/xml">
    <block type="event_wall_hit" x="20" y="20">
      <field name="PARAM_BALL">ball</field>
      <statement name="DO">
        <block type="action_duplicate">
          <value name="BALL">
            <block type="parameter_get">
              <field name="PARAM_NAME">ball</field>
            </block>
          </value>
        </block>
      </statement>
    </block>
  </xml>`,

  grow: `<xml xmlns="https://developers.google.com/blockly/xml">
    <block type="event_wall_hit" x="20" y="20">
      <field name="PARAM_BALL">ball</field>
      <statement name="DO">
        <block type="action_set_radius">
          <value name="BALL">
            <block type="parameter_get">
              <field name="PARAM_NAME">ball</field>
            </block>
          </value>
          <value name="R">
            <block type="math_arithmetic">
              <field name="OP">MULTIPLY</field>
              <value name="A">
                <block type="ball_get">
                  <field name="K">r</field>
                  <value name="BALL">
                    <block type="parameter_get">
                      <field name="PARAM_NAME">ball</field>
                    </block>
                  </value>
                </block>
              </value>
              <value name="B">
                <shadow type="math_number">
                  <field name="NUM">1.1</field>
                </shadow>
              </value>
            </block>
          </value>
          <next>
            <block type="action_set_color">
              <value name="BALL">
                <block type="parameter_get">
                  <field name="PARAM_NAME">ball</field>
                </block>
              </value>
              <value name="C">
                <block type="math_arithmetic">
                  <field name="OP">ADD</field>
                  <value name="A">
                    <block type="ball_get">
                      <field name="K">x</field>
                      <value name="BALL">
                        <block type="parameter_get">
                          <field name="PARAM_NAME">ball</field>
                        </block>
                      </value>
                    </block>
                  </value>
                  <value name="B">
                    <shadow type="math_number">
                      <field name="NUM">30</field>
                    </shadow>
                  </value>
                </block>
              </value>
            </block>
          </next>
        </block>
      </statement>
    </block>
  </xml>`,

  trail: `<xml xmlns="https://developers.google.com/blockly/xml">
    <block type="event_tick" x="20" y="20">
      <statement name="DO">
        <block type="action_spawn">
          <field name="N">1</field>
          <value name="R">
            <shadow type="math_number">
              <field name="NUM">3</field>
            </shadow>
          </value>
        </block>
      </statement>
    </block>
  </xml>`,

  escape: `<xml xmlns="https://developers.google.com/blockly/xml">
    <block type="event_exit" x="20" y="20">
      <field name="PARAM_BALL">ball</field>
      <statement name="DO">
        <block type="action_score">
          <value name="D">
            <shadow type="math_number">
              <field name="NUM">1</field>
            </shadow>
          </value>
          <next>
            <block type="action_spawn">
              <field name="N">1</field>
              <value name="R">
                <shadow type="math_number">
                  <field name="NUM">10</field>
                </shadow>
              </value>
            </block>
          </next>
        </block>
      </statement>
    </block>
  </xml>`,

  collision: `<xml xmlns="https://developers.google.com/blockly/xml">
    <block type="event_ball_collision" x="20" y="20">
      <field name="PARAM_BALL1">ball1</field>
      <field name="PARAM_BALL2">ball2</field>
      <statement name="DO">
        <block type="action_destroy">
          <value name="BALL">
            <block type="parameter_get">
              <field name="PARAM_NAME">ball1</field>
            </block>
          </value>
          <next>
            <block type="action_set_color">
              <value name="BALL">
                <block type="parameter_get">
                  <field name="PARAM_NAME">ball2</field>
                </block>
              </value>
              <value name="C">
                <shadow type="text">
                  <field name="TEXT">#ff0000</field>
                </shadow>
              </value>
            </block>
          </next>
        </block>
      </statement>
    </block>
  </xml>`,

  spawn_chain: `<xml xmlns="https://developers.google.com/blockly/xml">
    <block type="event_spawn" x="20" y="20">
      <field name="PARAM_BALL">newBall</field>
      <statement name="DO">
        <block type="action_set_color">
          <value name="BALL">
            <block type="parameter_get">
              <field name="PARAM_NAME">newBall</field>
            </block>
          </value>
          <value name="C">
            <block type="util_rand"></block>
          </value>
          <next>
            <block type="action_scale_speed">
              <value name="BALL">
                <block type="parameter_get">
                  <field name="PARAM_NAME">newBall</field>
                </block>
              </value>
              <value name="F">
                <shadow type="math_number">
                  <field name="NUM">0.8</field>
                </shadow>
              </value>
            </block>
          </next>
        </block>
      </statement>
    </block>
  </xml>`
};

function loadPreset(name, workspace) {
  const xml = PRESETS[name];
  if (!xml) return false;
  
  try {
    workspace.clear();
    const dom = window.BX.textToDom(xml);
    window.BX.domToWorkspace(dom, workspace);
    
    // Show helpful message about the new parameter system
    if (name === 'duplicate' || name === 'grow' || name === 'escape') {
      setTimeout(() => {
        console.log('✨ This preset demonstrates draggable parameters!');
        console.log('💡 Try dragging the purple "ball" tokens to other action blocks.');
        console.log('🎯 You can also create new parameter connections by dragging from event blocks.');
      }, 500);
    }
    
    return true;
  } catch (err) {
    console.error('loadPreset error:', err);
    window.showWarn('Failed to load preset XML. See console.');
    return false;
  }
}

// Export for use in other modules
window.PRESETS = PRESETS;
window.loadPreset = loadPreset;