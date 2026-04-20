<script setup lang="ts">
const stats = [
  { value: '85', label: 'ACTIONS', description: 'Built-in action handlers' },
  { value: '71', label: 'FUNCTIONS', description: 'Expression functions' },
  { value: '50', label: 'TRANSFORMS', description: 'Data transforms' },
  { value: '59', label: 'EVENTS', description: 'Discord events' },
];
</script>

<template>
  <section class="stats">
    <div class="stats-inner">
      <div class="stats-grid">
        <div v-for="stat in stats" :key="stat.label" class="stat-card">
          <span class="stat-value">{{ stat.value }}</span>
          <span class="stat-label">{{ stat.label }}</span>
          <span class="stat-description">{{ stat.description }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.stats {
  padding: var(--sp-3xl) var(--sp-lg);
  background: var(--bg-panel);
  border-top: var(--border-solid);
  border-bottom: var(--border-solid);
}

.stats-inner {
  max-width: var(--max-width);
  margin: 0 auto;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--sp-lg);
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--sp-xl);
  border: 1px dashed var(--border-mid);
  transition: all var(--transition-fast);
}

.stat-card:hover {
  border-color: var(--accent-dim);
  background: var(--accent-faint);
}

.stat-value {
  font-family: var(--font-display);
  font-size: 48px;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 4px;
  line-height: 1;
}

.stat-label {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-bright);
  letter-spacing: 3px;
  margin-top: var(--sp-sm);
}

.stat-description {
  font-size: 11px;
  color: var(--text-ghost);
  margin-top: var(--sp-xs);
}

@media (max-width: 900px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .stats {
    padding: var(--sp-2xl) var(--sp-md);
  }

  .stat-card {
    padding: var(--sp-lg);
  }
}

@media (max-width: 500px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--sp-md);
  }

  .stat-value {
    font-size: 32px;
  }

  .stat-label {
    font-size: 11px;
  }

  .stat-description {
    font-size: 10px;
  }
}

@media (max-width: 360px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
