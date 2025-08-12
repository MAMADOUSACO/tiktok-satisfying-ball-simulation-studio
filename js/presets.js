/**
 * Preset configurations for the Bouncing Balls Editor
 */

const PRESETS = {
  duplicate: `<xml xmlns="https://developers.google.com/blockly/xml">
    <block type="event_wall_hit" x="20" y="20">
      <statement name="DO">
        <block type="action_duplicate"></block>
      </statement>
    </block>
  </xml>`,

  grow: `<xml xmlns="https://developers.google.com/blockly/xml">
    <block type="event_wall_hit" x="20" y="20">
      <statement name="DO">
        <block type="action_set_radius">
          <value name="R">
            <shadow type="math_number">
              <field name="NUM">0</field>
            </shadow>
            <block type="math_arithmetic">
              <field name="OP">MULTIPLY</field>
              <value name="A">
                <shadow type="math_number">
                  <field name="NUM">0</field>
                </shadow>
                <block type="ball_get">
                  <field name="K">r</field>
                </block>
              </value>
              <value name="B">
                <shadow type="math_number">
                  <field name="NUM">1.1</field>
                </shadow>
              </value>
            </block>
          </value>
        </block>
        <next>
          <block type="action_set_color">
            <value name="C">
              <shadow type="math_number">
                <field name="NUM">0</field>
              </shadow>
              <block type="math_arithmetic">
                <field name="OP">ADD</field>
                <value name="A">
                  <shadow type="math_number">
                    <field name="NUM">0</field>
                  </shadow>
                  <block type="ball_get">
                    <field name="K">x</field>
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
      </statement>
    </block>
    <block type="event_tick" x="20" y="160">
      <statement name="DO">
        <block type="action_log">
          <value name="MSG">
            <shadow type="math_number">
              <field name="NUM">0</field>
            </shadow>
            <block type="math_round">
              <value name="NUM">
                <shadow type="math_number">
                  <field name="NUM">0</field>
                </shadow>
                <block type="util_rand"></block>
              </value>
            </block>
          </value>
        </block>
      </statement>
    </block>
  </xml>`,

  trail: `<xml xmlns="https://developers.google.com/blockly/xml">
    <block type="event_tick" x="20" y="20">
      <statement name="DO">
        <block type="action_spawn">
          <field name="N">0</field>
          <value name="R">
            <shadow type="math_number">
              <field name="NUM">0</field>
            </shadow>
          </value>
        </block>
      </statement>
    </block>
  </xml>`,

  escape: `<xml xmlns="https://developers.google.com/blockly/xml">
    <block type="event_exit" x="20" y="20">
      <statement name="DO">
        <block type="action_score">
          <value name="D">
            <shadow type="math_number">
              <field name="NUM">1</field>
            </shadow>
          </value>
        </block>
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