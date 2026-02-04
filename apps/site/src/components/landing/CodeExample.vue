<script setup lang="ts">
import { ref, computed } from 'vue';

const examples = [
  {
    id: 'commands',
    label: 'COMMANDS',
    code: `commands:
  - name: greet
    description: "Greet a user"
    options:
      - name: user
        type: user
        required: true
    actions:
      - reply:
          content: "Hello, \${options.user.name}!"
          embed:
            color: "#5865F2"
            title: "Welcome!"`,
  },
  {
    id: 'events',
    label: 'EVENTS',
    code: `events:
  - event: member_join
    actions:
      - send_message:
          channel: "\${env.WELCOME_CHANNEL}"
          content: "Welcome \${member.display_name}!"
      - assign_role:
          role: "Member"

  - event: message_create
    when: "message.content | startsWith('!')"
    actions:
      - add_reaction:
          emoji: "wave"`,
  },
  {
    id: 'state',
    label: 'STATE',
    code: `state:
  variables:
    counter:
      scope: guild
      default: 0

commands:
  - name: count
    actions:
      - increment:
          var: counter
          scope: guild
      - reply:
          content: "Count: \${state.guild.counter}"`,
  },
  {
    id: 'canvas',
    label: 'CANVAS',
    hasPreview: true,
    code: `commands:
  - name: welcome-card
    actions:
      - canvas_create:
          width: 600
          height: 200
          background: "#1a1c2e"
          as: canvas
      - canvas_draw_image:
          canvas: "\${canvas}"
          url: "\${member.displayAvatarURL}"
          x: 30
          y: 35
          width: 130
          height: 130
          radius: 65
      - canvas_draw_text:
          canvas: "\${canvas}"
          text: "WELCOME"
          x: 180
          y: 70
          font: "bold 12px Inter"
          color: "#5865F2"
      - canvas_draw_text:
          canvas: "\${canvas}"
          text: "\${member.displayName}"
          x: 180
          y: 100
          font: "bold 28px Inter"
          color: "#ffffff"
      - canvas_to_attachment:
          canvas: "\${canvas}"
          filename: "welcome.png"
          as: image
      - reply:
          files: ["\${image}"]`,
  },
  {
    id: 'voice',
    label: 'VOICE',
    code: `commands:
  - name: play
    options:
      - name: query
        type: string
        required: true
    actions:
      - voice_join:
          channel: "\${member.voice.channelId}"
      - voice_search:
          query: "\${options.query}"
          as: results
      - queue_add:
          track: "\${results[0]}"
      - reply:
          content: "Playing: \${results[0].title}"`,
  },
];

const activeExample = ref('commands');

const setActiveExample = (id: string) => {
  activeExample.value = id;
};

const activeExampleData = computed(() => {
  return examples.find(e => e.id === activeExample.value);
});
</script>

<template>
  <section class="code-example">
    <div class="code-example-inner">
      <h2 class="section-title">
        <span class="section-num">02</span>
        EXAMPLES
      </h2>

      <div class="example-container">
        <div class="example-tabs">
          <button
            v-for="example in examples"
            :key="example.id"
            :class="['example-tab', { active: activeExample === example.id }]"
            @click="setActiveExample(example.id)"
          >
            {{ example.label }}
          </button>
        </div>

        <div :class="['example-body', { 'has-preview': activeExampleData?.hasPreview }]">
          <div class="example-code">
            <div class="code-header">
              <span class="code-label">YAML</span>
              <button class="copy-btn" title="Copy code">
                <i class="fas fa-copy"></i>
              </button>
            </div>
            <pre class="code-content"><code>{{ activeExampleData?.code }}</code></pre>
          </div>

          <div v-if="activeExampleData?.hasPreview" class="example-preview">
            <div class="preview-label">OUTPUT</div>
            <div class="canvas-preview-card">
              <div class="preview-avatar">
                <img src="https://cdn.discordapp.com/embed/avatars/0.png" alt="Avatar" />
              </div>
              <div class="preview-text">
                <span class="preview-welcome">WELCOME</span>
                <span class="preview-name">Username</span>
                <span class="preview-sub">Member #1,234</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.code-example {
  padding: var(--sp-3xl) var(--sp-lg);
  background: var(--bg);
}

.code-example-inner {
  max-width: var(--max-width);
  margin: 0 auto;
}

.section-title {
  display: flex;
  align-items: baseline;
  gap: var(--sp-md);
  margin-bottom: var(--sp-xl);
  padding-bottom: var(--sp-md);
  border-bottom: 2px solid var(--accent);
}

.section-num {
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 2px;
}

.example-container {
  display: flex;
  flex-direction: column;
}

.example-tabs {
  display: flex;
  border-bottom: var(--border-solid);
  background: var(--bg-panel);
  overflow-x: auto;
}

.example-tabs::-webkit-scrollbar {
  display: none;
}

.example-tab {
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 1.5px;
  color: var(--text-dim);
  padding: var(--sp-sm) var(--sp-lg);
  cursor: pointer;
  border: none;
  background: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.example-tab:hover {
  color: var(--text-bright);
}

.example-tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.example-body {
  display: grid;
  grid-template-columns: 1fr;
  background: var(--bg-code);
  border: var(--border-solid);
  border-top: none;
}

.example-body.has-preview {
  grid-template-columns: 1fr 280px;
}

.example-code {
  display: flex;
  flex-direction: column;
}

.code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-xs) var(--sp-md);
  border-bottom: var(--border-solid);
  background: var(--bg-panel);
}

.code-label {
  font-size: 9px;
  color: var(--text-ghost);
  letter-spacing: 1.5px;
}

.copy-btn {
  background: none;
  border: 1px solid var(--border-mid);
  color: var(--text-dim);
  padding: 2px 6px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.copy-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.copy-btn i {
  font-size: 10px;
}

.code-content {
  padding: var(--sp-md);
  margin: 0;
  font-size: 11px;
  line-height: 1.7;
  overflow-x: auto;
  background: transparent;
  border: none;
  color: var(--text);
  max-height: 320px;
  overflow-y: auto;
}

.code-content code {
  font-family: var(--font-mono);
  white-space: pre;
}

.example-preview {
  border-left: var(--border-solid);
  display: flex;
  flex-direction: column;
}

.preview-label {
  font-size: 9px;
  color: var(--text-ghost);
  letter-spacing: 1.5px;
  padding: var(--sp-xs) var(--sp-md);
  border-bottom: var(--border-solid);
  background: var(--bg-panel);
}

.canvas-preview-card {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--sp-md);
  padding: var(--sp-lg);
  background: linear-gradient(135deg, #1a1c2e 0%, #2d3250 100%);
  margin: var(--sp-md);
  border-radius: 6px;
}

.preview-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 3px solid var(--accent);
  overflow: hidden;
  flex-shrink: 0;
}

.preview-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.preview-welcome {
  font-family: var(--font-display);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 2px;
  color: var(--accent);
}

.preview-name {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-sub {
  font-size: 10px;
  color: #99aab5;
}

@media (max-width: 900px) {
  .example-body.has-preview {
    grid-template-columns: 1fr;
  }

  .example-preview {
    border-left: none;
    border-top: var(--border-solid);
  }
}

@media (max-width: 768px) {
  .code-example {
    padding: var(--sp-2xl) var(--sp-md);
  }

  .example-tab {
    padding: var(--sp-sm) var(--sp-md);
    font-size: 10px;
  }

  .code-content {
    font-size: 10px;
    max-height: 280px;
  }

  .section-num {
    font-size: 24px;
  }
}

@media (max-width: 480px) {
  .example-tabs {
    flex-wrap: wrap;
  }

  .example-tab {
    flex: 1;
    min-width: 33%;
    text-align: center;
    padding: var(--sp-sm);
  }

  .code-content {
    font-size: 9px;
    padding: var(--sp-sm);
  }

  .canvas-preview-card {
    padding: var(--sp-md);
  }

  .preview-avatar {
    width: 48px;
    height: 48px;
  }

  .preview-name {
    font-size: 14px;
  }
}
</style>
