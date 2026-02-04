<script setup lang="ts">
const links = [
  {
    icon: 'fas fa-book',
    title: 'DOCUMENTATION',
    description: 'Learn how to build bots with FURLOW. Guides, references, and examples.',
    to: '/docs',
    color: 'accent',
  },
  {
    icon: 'fas fa-hammer',
    title: 'SCHEMA BUILDER',
    description: 'Build your bot spec visually. No YAML knowledge required.',
    to: '/builder',
    color: 'purple',
  },
  {
    icon: 'fab fa-github',
    title: 'GITHUB',
    description: 'View source code, report issues, and contribute.',
    href: 'https://github.com/virgilvox/discord-furlow',
    color: 'blue',
  },
  {
    icon: 'fab fa-npm',
    title: 'NPM',
    description: 'Install packages and explore the API.',
    href: 'https://www.npmjs.com/org/furlow',
    color: 'red',
  },
];
</script>

<template>
  <section class="quick-links">
    <div class="quick-links-inner">
      <h2 class="section-title">
        <span class="section-num">04</span>
        QUICK LINKS
      </h2>

      <div class="links-grid">
        <component
          v-for="link in links"
          :key="link.title"
          :is="link.to ? 'RouterLink' : 'a'"
          :to="link.to"
          :href="link.href"
          :target="link.href ? '_blank' : undefined"
          :rel="link.href ? 'noopener' : undefined"
          :class="['link-card', `link-${link.color}`]"
        >
          <div class="link-icon">
            <i :class="link.icon"></i>
          </div>
          <div class="link-content">
            <h3 class="link-title">{{ link.title }}</h3>
            <p class="link-description">{{ link.description }}</p>
          </div>
          <i class="fas fa-arrow-right link-arrow"></i>
        </component>
      </div>
    </div>
  </section>
</template>

<style scoped>
.quick-links {
  padding: var(--sp-3xl) var(--sp-lg);
  background: var(--bg);
}

.quick-links-inner {
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

.links-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--sp-lg);
}

.link-card {
  display: flex;
  align-items: center;
  gap: var(--sp-lg);
  padding: var(--sp-xl);
  background: var(--bg-raised);
  border: var(--border-solid);
  text-decoration: none;
  transition: all var(--transition-fast);
}

.link-card:hover {
  border-color: var(--border-mid);
  transform: translateX(4px);
}

.link-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--border-mid);
  flex-shrink: 0;
}

.link-icon i {
  font-size: 18px;
}

.link-content {
  flex: 1;
}

.link-title {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 2px;
  color: var(--text-bright);
  margin-bottom: var(--sp-xs);
}

.link-description {
  font-size: 12px;
  color: var(--text-dim);
  line-height: 1.6;
  margin: 0;
}

.link-arrow {
  font-size: 14px;
  color: var(--text-ghost);
  transition: all var(--transition-fast);
}

.link-card:hover .link-arrow {
  color: var(--accent);
  transform: translateX(4px);
}

/* Color variants */
.link-accent .link-icon {
  background: var(--accent-faint);
  border-color: var(--accent-dim);
}
.link-accent .link-icon i { color: var(--accent); }
.link-accent:hover { border-color: var(--accent-dim); }

.link-purple .link-icon {
  background: var(--purple-dim);
  border-color: rgba(154, 123, 202, 0.3);
}
.link-purple .link-icon i { color: var(--purple); }
.link-purple:hover { border-color: rgba(154, 123, 202, 0.5); }

.link-blue .link-icon {
  background: var(--blue-dim);
  border-color: rgba(91, 168, 245, 0.3);
}
.link-blue .link-icon i { color: var(--blue); }
.link-blue:hover { border-color: rgba(91, 168, 245, 0.5); }

.link-red .link-icon {
  background: var(--red-dim);
  border-color: rgba(224, 85, 85, 0.3);
}
.link-red .link-icon i { color: var(--red); }
.link-red:hover { border-color: rgba(224, 85, 85, 0.5); }

@media (max-width: 768px) {
  .quick-links {
    padding: var(--sp-2xl) var(--sp-md);
  }

  .links-grid {
    grid-template-columns: 1fr;
  }

  .link-card {
    padding: var(--sp-lg);
  }

  .link-icon {
    width: 44px;
    height: 44px;
  }
}

@media (max-width: 480px) {
  .link-card {
    gap: var(--sp-md);
  }

  .link-description {
    font-size: 11px;
  }

  .section-num {
    font-size: 28px;
  }
}
</style>
