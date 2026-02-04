<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

const commands = [
  { cmd: 'init', desc: 'Create a new bot project', icon: 'fas fa-plus', color: 'accent' },
  { cmd: 'dev', desc: 'Development with hot reload', icon: 'fas fa-fire', color: 'yellow' },
  { cmd: 'start', desc: 'Run in production mode', icon: 'fas fa-play', color: 'green' },
  { cmd: 'validate', desc: 'Check YAML syntax', icon: 'fas fa-check', color: 'cyan' },
];

const lines = [
  { text: '$ npm install -g @furlow/cli' },
  { text: '$ furlow init my-bot' },
  { text: '✓ Created my-bot/furlow.yaml', class: 'success' },
  { text: '$ cd my-bot && furlow dev' },
  { text: '❯ Bot online as MyBot#1234', class: 'info' },
  { text: '⟳ Watching for changes...', class: 'warn' },
];

const displayed = ref<typeof lines>([]);
const idx = ref(0);
const cursor = ref(true);

let timer: ReturnType<typeof setTimeout> | null = null;
let blink: ReturnType<typeof setInterval> | null = null;

const next = () => {
  if (idx.value < lines.length) {
    displayed.value.push(lines[idx.value]);
    idx.value++;
    timer = setTimeout(next, idx.value <= 1 ? 600 : 300);
  } else {
    timer = setTimeout(() => {
      displayed.value = [];
      idx.value = 0;
      next();
    }, 3000);
  }
};

onMounted(() => {
  blink = setInterval(() => cursor.value = !cursor.value, 500);
  setTimeout(next, 500);
});

onUnmounted(() => {
  if (timer) clearTimeout(timer);
  if (blink) clearInterval(blink);
});
</script>

<template>
  <section class="cli-section">
    <div class="cli-inner">
      <h2 class="section-title">
        <span class="section-num">03</span>
        COMMAND LINE
      </h2>

      <div class="cli-grid">
        <div
          v-for="cmd in commands"
          :key="cmd.cmd"
          :class="['cli-card', `cli-${cmd.color}`]"
        >
          <div class="cli-icon">
            <i :class="cmd.icon"></i>
          </div>
          <div class="cli-content">
            <h3 class="cli-title">furlow {{ cmd.cmd }}</h3>
            <p class="cli-desc">{{ cmd.desc }}</p>
          </div>
        </div>
      </div>

      <div class="terminal-card">
        <div class="terminal-header">
          <span class="terminal-dot"></span>
          <span class="terminal-dot"></span>
          <span class="terminal-dot"></span>
          <span class="terminal-title">Terminal</span>
        </div>
        <div class="terminal-body">
          <div
            v-for="(line, i) in displayed"
            :key="i"
            :class="['terminal-line', line.class]"
          >{{ line.text }}</div>
          <span :class="['terminal-cursor', { visible: cursor }]">▋</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.cli-section {
  padding: var(--sp-3xl) var(--sp-lg);
  background: var(--bg-raised);
}

.cli-inner {
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

.cli-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--sp-lg);
  margin-bottom: var(--sp-xl);
}

.cli-card {
  background: var(--bg-card);
  border: var(--border-solid);
  padding: var(--sp-lg);
  display: flex;
  align-items: flex-start;
  gap: var(--sp-md);
  transition: all var(--transition-fast);
}

.cli-card:hover {
  border-color: var(--border-mid);
  transform: translateY(-2px);
}

.cli-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--border-mid);
  flex-shrink: 0;
}

.cli-icon i {
  font-size: 14px;
}

.cli-content {
  min-width: 0;
}

.cli-title {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-bright);
  margin-bottom: 4px;
}

.cli-desc {
  font-size: 11px;
  color: var(--text-dim);
  line-height: 1.5;
}

/* Color variants */
.cli-accent .cli-icon {
  background: var(--accent-faint);
  border-color: var(--accent-dim);
}
.cli-accent .cli-icon i { color: var(--accent); }

.cli-yellow .cli-icon {
  background: var(--yellow-dim);
  border-color: rgba(240, 192, 64, 0.3);
}
.cli-yellow .cli-icon i { color: var(--yellow); }

.cli-green .cli-icon {
  background: var(--green-dim);
  border-color: rgba(139, 214, 73, 0.3);
}
.cli-green .cli-icon i { color: var(--green); }

.cli-cyan .cli-icon {
  background: var(--cyan-dim);
  border-color: rgba(78, 201, 176, 0.3);
}
.cli-cyan .cli-icon i { color: var(--cyan); }

/* Terminal */
.terminal-card {
  background: var(--bg-code);
  border: var(--border-solid);
}

.terminal-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: var(--sp-sm) var(--sp-md);
  background: var(--bg-panel);
  border-bottom: var(--border-solid);
}

.terminal-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.terminal-dot:nth-child(1) { background: #ff5f56; }
.terminal-dot:nth-child(2) { background: #ffbd2e; }
.terminal-dot:nth-child(3) { background: #27c93f; }

.terminal-title {
  margin-left: var(--sp-sm);
  font-size: 11px;
  color: var(--text-ghost);
}

.terminal-body {
  padding: var(--sp-md) var(--sp-lg);
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.8;
  height: 180px;
  overflow: hidden;
}

.terminal-line {
  color: var(--text);
}

.terminal-line.success {
  color: var(--green);
}

.terminal-line.info {
  color: var(--purple);
}

.terminal-line.warn {
  color: var(--yellow);
}

.terminal-cursor {
  opacity: 0;
  color: var(--accent);
}

.terminal-cursor.visible {
  opacity: 1;
}

@media (max-width: 900px) {
  .cli-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .cli-section {
    padding: var(--sp-2xl) var(--sp-md);
  }

  .cli-card {
    padding: var(--sp-md);
  }

  .terminal-body {
    font-size: 12px;
    height: 160px;
  }
}

@media (max-width: 600px) {
  .cli-grid {
    grid-template-columns: 1fr;
    gap: var(--sp-md);
  }

  .section-num {
    font-size: 28px;
  }

  .terminal-body {
    font-size: 11px;
    height: 140px;
    padding: var(--sp-sm) var(--sp-md);
  }
}
</style>
