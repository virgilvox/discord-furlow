<script setup lang="ts">
const features = [
  {
    icon: 'fas fa-file-code',
    title: 'YAML CONFIGURATION',
    description: 'Define your bot behavior entirely in YAML. No code required for common use cases.',
    color: 'accent',
  },
  {
    icon: 'fas fa-bolt',
    title: '84 ACTIONS',
    description: 'Send messages, manage roles, moderate users, handle voice, and more with built-in actions.',
    color: 'yellow',
  },
  {
    icon: 'fas fa-code',
    title: 'EXPRESSIONS',
    description: '71 functions and 50 transforms for dynamic content. Access context like user, member, guild.',
    color: 'cyan',
  },
  {
    icon: 'fas fa-database',
    title: 'STATE MANAGEMENT',
    description: 'Scoped variables at global, guild, channel, user, or member level. Persistent storage.',
    color: 'purple',
  },
  {
    icon: 'fas fa-microphone',
    title: 'VOICE SUPPORT',
    description: 'Join channels, play audio, manage queues. Full music bot capabilities built-in.',
    color: 'green',
  },
  {
    icon: 'fas fa-plug',
    title: 'INTEGRATIONS',
    description: 'HTTP, WebSocket, MQTT, TCP pipes. Connect to external services and APIs.',
    color: 'blue',
  },
];

const colorClasses: Record<string, string> = {
  accent: 'feature-accent',
  yellow: 'feature-yellow',
  cyan: 'feature-cyan',
  purple: 'feature-purple',
  green: 'feature-green',
  blue: 'feature-blue',
};
</script>

<template>
  <section class="features">
    <div class="features-inner">
      <h2 class="section-title">
        <span class="section-num">01</span>
        FEATURES
      </h2>

      <div class="features-grid">
        <div
          v-for="feature in features"
          :key="feature.title"
          :class="['feature-card', colorClasses[feature.color]]"
        >
          <div class="feature-icon">
            <i :class="feature.icon"></i>
          </div>
          <h3 class="feature-title">{{ feature.title }}</h3>
          <p class="feature-description">{{ feature.description }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.features {
  padding: var(--sp-3xl) var(--sp-lg);
  background: var(--bg-raised);
}

.features-inner {
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

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--sp-lg);
}

.feature-card {
  background: var(--bg-card);
  border: var(--border-solid);
  padding: var(--sp-xl);
  transition: all var(--transition-fast);
}

.feature-card:hover {
  border-color: var(--border-mid);
  transform: translateY(-2px);
}

.feature-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--sp-lg);
  border: 1px dashed var(--border-mid);
}

.feature-icon i {
  font-size: 16px;
}

.feature-title {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 2px;
  color: var(--text-bright);
  margin-bottom: var(--sp-sm);
}

.feature-description {
  font-size: 13px;
  color: var(--text-dim);
  line-height: 1.7;
}

/* Color variants */
.feature-accent .feature-icon {
  background: var(--accent-faint);
  border-color: var(--accent-dim);
}
.feature-accent .feature-icon i { color: var(--accent); }

.feature-yellow .feature-icon {
  background: var(--yellow-dim);
  border-color: rgba(240, 192, 64, 0.3);
}
.feature-yellow .feature-icon i { color: var(--yellow); }

.feature-cyan .feature-icon {
  background: var(--cyan-dim);
  border-color: rgba(78, 201, 176, 0.3);
}
.feature-cyan .feature-icon i { color: var(--cyan); }

.feature-purple .feature-icon {
  background: var(--purple-dim);
  border-color: rgba(154, 123, 202, 0.3);
}
.feature-purple .feature-icon i { color: var(--purple); }

.feature-green .feature-icon {
  background: var(--green-dim);
  border-color: rgba(139, 214, 73, 0.3);
}
.feature-green .feature-icon i { color: var(--green); }

.feature-blue .feature-icon {
  background: var(--blue-dim);
  border-color: rgba(91, 168, 245, 0.3);
}
.feature-blue .feature-icon i { color: var(--blue); }

@media (max-width: 900px) {
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .features {
    padding: var(--sp-2xl) var(--sp-md);
  }

  .feature-card {
    padding: var(--sp-lg);
  }
}

@media (max-width: 600px) {
  .features-grid {
    grid-template-columns: 1fr;
    gap: var(--sp-md);
  }

  .section-num {
    font-size: 28px;
  }
}

@media (max-width: 400px) {
  .feature-description {
    font-size: 12px;
  }
}
</style>
