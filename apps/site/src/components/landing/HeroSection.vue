<script setup lang="ts">
import FurlowButton from '@/components/common/FurlowButton.vue';
</script>

<template>
  <section class="hero">
    <div class="hero-inner">
      <div class="hero-content">
        <img
          src="@/assets/images/furlow-logo.svg"
          alt="FURLOW Logo"
          class="hero-logo"
        />
        <h1 class="hero-title">
          <span class="title-fur">FUR</span><span class="title-low">LOW</span>
        </h1>
        <p class="hero-tagline">DECLARATIVE DISCORD BOTS</p>
        <p class="hero-description">
          Build powerful Discord bots with YAML specifications.
          No code required. 85 actions, expressions, state management,
          voice support, and more.
        </p>
        <div class="hero-actions">
          <FurlowButton to="/docs" icon="fas fa-book" size="lg">
            GET STARTED
          </FurlowButton>
          <FurlowButton to="/builder" variant="secondary" icon="fas fa-hammer" size="lg">
            TRY BUILDER
          </FurlowButton>
        </div>
      </div>

      <div class="hero-visual">
        <div class="code-preview">
          <div class="code-header">
            <span class="code-dot"></span>
            <span class="code-dot"></span>
            <span class="code-dot"></span>
            <span class="code-filename">bot.furlow.yaml</span>
          </div>
          <pre class="code-content"><code><span class="yaml-key">identity</span>:
  <span class="yaml-key">name</span>: <span class="yaml-string">"MyBot"</span>

<span class="yaml-key">commands</span>:
  - <span class="yaml-key">name</span>: <span class="yaml-string">hello</span>
    <span class="yaml-key">description</span>: <span class="yaml-string">"Say hello"</span>
    <span class="yaml-key">actions</span>:
      - <span class="yaml-key">action</span>: <span class="yaml-action">reply</span>
        <span class="yaml-key">content</span>: <span class="yaml-expr">"Hello, {<!-- -->{ user.name }}!"</span></code></pre>
        </div>
      </div>
    </div>

    <div class="hero-scroll-indicator">
      <i class="fas fa-chevron-down"></i>
    </div>
  </section>
</template>

<style scoped>
.hero {
  min-height: calc(100vh - var(--nav-height));
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--sp-2xl);
  position: relative;
  overflow: hidden;
}

.hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, var(--accent-faint) 0%, transparent 70%);
  pointer-events: none;
}

.hero-inner {
  max-width: var(--max-width);
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-3xl);
  align-items: center;
  position: relative;
  z-index: 1;
}

.hero-content {
  display: flex;
  flex-direction: column;
  gap: var(--sp-lg);
}

.hero-logo {
  width: 80px;
  height: 80px;
}

.hero-title {
  font-family: var(--font-display);
  font-size: 64px;
  font-weight: 700;
  letter-spacing: 8px;
  line-height: 1;
}

.title-fur {
  color: var(--text-heading);
}

.title-low {
  color: var(--accent);
}

.hero-tagline {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 4px;
  color: var(--text-dim);
}

.hero-description {
  font-size: 15px;
  color: var(--text);
  line-height: 1.8;
  max-width: 480px;
}

.hero-actions {
  display: flex;
  gap: var(--sp-md);
  margin-top: var(--sp-md);
}

.hero-visual {
  display: flex;
  justify-content: center;
}

.code-preview {
  width: 100%;
  max-width: 420px;
  background: var(--bg-code);
  border: var(--border-solid);
  border-left: 3px solid var(--accent);
  box-shadow: var(--shadow-lg);
}

.code-header {
  display: flex;
  align-items: center;
  gap: var(--sp-xs);
  padding: var(--sp-sm) var(--sp-md);
  background: var(--bg-panel);
  border-bottom: var(--border-solid);
}

.code-dot {
  width: 8px;
  height: 8px;
  background: var(--border-bright);
}

.code-dot:first-child {
  background: var(--red);
}

.code-dot:nth-child(2) {
  background: var(--yellow);
}

.code-dot:nth-child(3) {
  background: var(--green);
}

.code-filename {
  margin-left: var(--sp-md);
  font-size: 11px;
  color: var(--text-ghost);
  font-family: var(--font-mono);
}

.code-content {
  padding: var(--sp-lg);
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  background: transparent;
  border: none;
}

.code-content code {
  font-family: var(--font-mono);
}

.yaml-key {
  color: var(--cyan);
}

.yaml-string {
  color: var(--green);
}

.yaml-action {
  color: var(--accent);
}

.yaml-expr {
  color: var(--yellow);
}

.hero-scroll-indicator {
  position: absolute;
  bottom: var(--sp-xl);
  left: 50%;
  transform: translateX(-50%);
  color: var(--text-ghost);
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(8px); }
}

@media (max-width: 900px) {
  .hero-inner {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .hero-content {
    align-items: center;
  }

  .hero-title {
    font-size: 48px;
  }

  .hero-actions {
    flex-direction: column;
    width: 100%;
    max-width: 280px;
  }

  .hero-visual {
    display: none;
  }
}

@media (max-width: 600px) {
  .hero {
    padding: var(--sp-xl) var(--sp-md);
    min-height: auto;
    padding-top: var(--sp-3xl);
    padding-bottom: var(--sp-3xl);
  }

  .hero-logo {
    width: 64px;
    height: 64px;
  }

  .hero-title {
    font-size: 36px;
    letter-spacing: 4px;
  }

  .hero-tagline {
    font-size: 12px;
    letter-spacing: 2px;
  }

  .hero-description {
    font-size: 13px;
    line-height: 1.7;
  }

  .hero-scroll-indicator {
    display: none;
  }
}

@media (max-width: 400px) {
  .hero-title {
    font-size: 28px;
    letter-spacing: 3px;
  }

  .hero-actions {
    max-width: 100%;
  }
}
</style>
