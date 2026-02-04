<script setup lang="ts">
import { ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const mobileMenuOpen = ref(false);

const navItems = [
  { label: 'DOCS', path: '/docs' },
  { label: 'BUILDER', path: '/builder' },
  { label: 'LLM REF', path: '/docs/reference/llm-reference' },
];

const isActive = (path: string) => {
  return route.path.startsWith(path);
};

const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value;
};
</script>

<template>
  <header class="app-header">
    <div class="header-inner">
      <RouterLink to="/" class="logo-link">
        <img
          src="@/assets/images/furlow-logo-wordmark-dark.svg"
          alt="FURLOW"
          class="logo"
        />
      </RouterLink>

      <nav class="nav-desktop">
        <RouterLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          :class="['nav-link', { active: isActive(item.path) }]"
        >
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="header-actions">
        <a
          href="https://github.com/virgilvox/discord-furlow"
          target="_blank"
          rel="noopener"
          class="icon-link"
          title="GitHub"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" class="icon-svg">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
        </a>
        <a
          href="https://www.npmjs.com/org/furlow"
          target="_blank"
          rel="noopener"
          class="icon-link"
          title="npm"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" class="icon-svg">
            <path d="M0 7.334v8h6.666v1.332H12v-1.332h12v-8H0zm6.666 6.664H5.334v-4H3.999v4H1.335V8.667h5.331v5.331zm4 0v1.336H8.001V8.667h5.334v5.332h-2.669v-.001zm12.001 0h-1.33v-4h-1.336v4h-1.335v-4h-1.33v4h-2.671V8.667h8.002v5.331z"/>
          </svg>
        </a>
      </div>

      <button
        class="mobile-menu-btn"
        @click="toggleMobileMenu"
        :aria-expanded="mobileMenuOpen"
        aria-label="Toggle menu"
      >
        <i :class="mobileMenuOpen ? 'fas fa-times' : 'fas fa-bars'"></i>
      </button>
    </div>

    <nav :class="['nav-mobile', { open: mobileMenuOpen }]">
      <RouterLink
        v-for="item in navItems"
        :key="item.path"
        :to="item.path"
        :class="['mobile-nav-link', { active: isActive(item.path) }]"
        @click="mobileMenuOpen = false"
      >
        {{ item.label }}
      </RouterLink>
      <div class="mobile-divider"></div>
      <a
        href="https://github.com/virgilvox/discord-furlow"
        target="_blank"
        rel="noopener"
        class="mobile-nav-link"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" class="mobile-icon-svg">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
        GITHUB
      </a>
    </nav>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--bg-sidebar);
  border-bottom: var(--border-solid);
}

.header-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--nav-height);
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 var(--sp-lg);
}

.logo-link {
  display: flex;
  align-items: center;
}

.logo {
  height: 32px;
  width: auto;
}

.nav-desktop {
  display: flex;
  gap: var(--sp-xl);
}

.nav-link {
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 2px;
  color: var(--text-dim);
  text-decoration: none;
  padding: var(--sp-sm) 0;
  border-bottom: 2px solid transparent;
  transition: all var(--transition-fast);
}

.nav-link:hover {
  color: var(--text-bright);
}

.nav-link.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
}

.header-actions {
  display: flex;
  gap: var(--sp-md);
}

.icon-link {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: var(--text-dim);
  border: 1px solid var(--border-mid);
  transition: all var(--transition-fast);
}

.icon-link:hover {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--accent-faint);
}

.icon-svg {
  width: 16px;
  height: 16px;
}

.mobile-menu-btn {
  display: none;
  background: none;
  border: 1px solid var(--border-mid);
  color: var(--text);
  width: 36px;
  height: 36px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.mobile-menu-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.nav-mobile {
  display: none;
  flex-direction: column;
  padding: var(--sp-md) var(--sp-lg);
  border-top: var(--border-dashed);
  background: var(--bg-panel);
}

.nav-mobile.open {
  display: flex;
}

.mobile-nav-link {
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 2px;
  color: var(--text-dim);
  text-decoration: none;
  padding: var(--sp-md) 0;
  display: flex;
  align-items: center;
  gap: var(--sp-sm);
}

.mobile-nav-link:hover,
.mobile-nav-link.active {
  color: var(--accent);
}

.mobile-divider {
  border-top: var(--border-dashed);
  margin: var(--sp-sm) 0;
}

.mobile-icon-svg {
  width: 14px;
  height: 14px;
}

@media (max-width: 768px) {
  .nav-desktop,
  .header-actions {
    display: none;
  }

  .mobile-menu-btn {
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
</style>
