<script setup lang="ts">
const currentYear = new Date().getFullYear();
</script>

<template>
  <footer class="app-footer">
    <div class="footer-inner">
      <div class="footer-left">
        <span class="footer-brand">
          <span class="brand-fur">FUR</span><span class="brand-low">LOW</span>
        </span>
        <span class="footer-tagline">Declarative Discord Bots</span>
      </div>

      <nav class="footer-links">
        <a href="https://github.com/virgilvox/discord-furlow" target="_blank" rel="noopener">
          <i class="fab fa-github"></i> GitHub
        </a>
        <a href="https://www.npmjs.com/org/furlow" target="_blank" rel="noopener">
          <i class="fab fa-npm"></i> npm
        </a>
        <RouterLink to="/docs">
          <i class="fas fa-book"></i> Docs
        </RouterLink>
      </nav>

      <div class="footer-right">
        <span class="footer-maintainer">
          Maintained by <a href="https://github.com/virgilvox" target="_blank" rel="noopener">@virgilvox</a>
        </span>
        <span class="footer-copyright">
          &copy; {{ currentYear }} FURLOW
        </span>
        <span class="footer-license">MIT License</span>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.app-footer {
  background: var(--bg-sidebar);
  border-top: var(--border-solid);
  padding: var(--sp-xl) 0;
  margin-top: auto;
}

.footer-inner {
  max-width: var(--max-width);
  margin: 0 auto;
  padding: 0 var(--sp-lg);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--sp-lg);
}

.footer-left {
  display: flex;
  align-items: center;
  gap: var(--sp-md);
}

.footer-brand {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 3px;
}

.brand-fur {
  color: var(--text-bright);
}

.brand-low {
  color: var(--accent);
}

.footer-tagline {
  font-size: 11px;
  color: var(--text-ghost);
  letter-spacing: 1px;
}

.footer-links {
  display: flex;
  gap: var(--sp-lg);
}

.footer-links a {
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--text-dim);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: var(--sp-xs);
  transition: color var(--transition-fast);
}

.footer-links a:hover {
  color: var(--accent);
}

.footer-links i {
  font-size: 12px;
}

.footer-right {
  display: flex;
  align-items: center;
  gap: var(--sp-md);
}

.footer-maintainer {
  font-size: 11px;
  color: var(--text-ghost);
}

.footer-maintainer a {
  color: var(--accent);
  text-decoration: none;
  transition: color var(--transition-fast);
}

.footer-maintainer a:hover {
  color: var(--text-bright);
}

.footer-copyright {
  font-size: 11px;
  color: var(--text-ghost);
}

.footer-license {
  font-size: 10px;
  color: var(--text-ghost);
  padding: 2px 6px;
  border: 1px dashed var(--border-mid);
}

@media (max-width: 768px) {
  .footer-inner {
    flex-direction: column;
    text-align: center;
  }

  .footer-left,
  .footer-right {
    flex-direction: column;
    gap: var(--sp-xs);
  }
}
</style>
