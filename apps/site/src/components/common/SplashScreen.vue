<script setup lang="ts">
import { ref, onMounted } from 'vue';

const isVisible = ref(true);
const isFadingOut = ref(false);

onMounted(() => {
  // Start fade out after animation completes (~2.2s)
  setTimeout(() => {
    isFadingOut.value = true;
    // Remove from DOM after fade completes
    setTimeout(() => {
      isVisible.value = false;
    }, 400);
  }, 2400);
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isVisible"
      :class="['splash-overlay', { 'fade-out': isFadingOut }]"
    >
      <div class="scanline"></div>

      <div class="splash">
        <!-- Logo Mark -->
        <div class="mark">
          <!-- Rail -->
          <div class="rail"></div>
          <!-- Rail dots -->
          <div class="rail-dot"></div>
          <div class="rail-dot"></div>
          <div class="rail-dot"></div>
          <div class="rail-dot"></div>

          <!-- Toggle 1: ON -->
          <div class="toggle t1">
            <div class="toggle-bg"></div>
            <div class="toggle-track"></div>
            <div class="toggle-knob"></div>
          </div>

          <!-- Toggle 2: OFF -->
          <div class="toggle t2">
            <div class="toggle-bg"></div>
            <div class="toggle-track"></div>
            <div class="toggle-knob"></div>
          </div>

          <!-- Toggle 3: ON -->
          <div class="toggle t3">
            <div class="toggle-bg"></div>
            <div class="toggle-track"></div>
            <div class="toggle-knob"></div>
          </div>
        </div>

        <!-- Wordmark -->
        <div class="wordmark">
          <span class="wm-char white">F</span>
          <span class="wm-char white">U</span>
          <span class="wm-char white">R</span>
          <span class="wm-char orange">L</span>
          <span class="wm-char orange">O</span>
          <span class="wm-char orange">W</span>
          <div class="cursor"></div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.splash-overlay {
  position: fixed;
  inset: 0;
  background: #0a0a0a;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  overflow: hidden;
  transition: opacity 0.4s ease-out;
}

.splash-overlay::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 10000;
  opacity: 0.035;
  mix-blend-mode: overlay;
  background: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

.splash-overlay.fade-out {
  opacity: 0;
}

.splash {
  display: flex;
  align-items: center;
  gap: 32px;
  position: relative;
}

/* ---- LOGO MARK ---- */
.mark {
  width: 120px;
  height: 120px;
  position: relative;
  flex-shrink: 0;
}

/* --- Rail --- */
.rail {
  position: absolute;
  left: 10px;
  top: 28px;
  width: 2px;
  height: 0;
  background: repeating-linear-gradient(
    to bottom,
    #ff6b35 0px, #ff6b35 3px,
    transparent 3px, transparent 7px
  );
  animation: railGrow 0.35s cubic-bezier(0.16, 1, 0.3, 1) 0.05s both;
}

@keyframes railGrow {
  to { height: 64px; }
}

/* --- Rail dots --- */
.rail-dot {
  position: absolute;
  left: 7px;
  width: 6px;
  height: 4px;
  background: #ff6b35;
  opacity: 0;
  animation: dotPop 0.2s ease-out both;
}

.rail-dot:nth-child(2) { top: 28px; animation-delay: 0.20s; }
.rail-dot:nth-child(3) { top: 58px; opacity: 0.35; animation-delay: 0.45s; }
.rail-dot:nth-child(4) { top: 88px; animation-delay: 0.70s; }

.rail-dot:nth-child(3) {
  animation-name: dotPopDim;
}

@keyframes dotPop {
  from { opacity: 0; transform: scale(0); }
  to   { opacity: 1; transform: scale(1); }
}

@keyframes dotPopDim {
  from { opacity: 0; transform: scale(0); }
  to   { opacity: 0.35; transform: scale(1); }
}

/* --- Toggle tracks --- */
.toggle {
  position: absolute;
  left: 20px;
  width: 80px;
  height: 20px;
  opacity: 0;
}

.toggle-track {
  position: absolute;
  inset: 0;
  border: 2px solid #ff6b35;
}

.toggle-bg {
  position: absolute;
  inset: 0;
  background: #ff6b35;
  opacity: 0.2;
}

.toggle-knob {
  position: absolute;
  top: 2px;
  width: 28px;
  height: 16px;
  background: #ff6b35;
}

/* Toggle 1: ON */
.t1 {
  top: 20px;
  animation: trackSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.15s both;
}

.t1 .toggle-knob {
  left: -30px;
  animation: knobSnapRight 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) 0.45s both;
}

/* Toggle 2: OFF */
.t2 {
  top: 50px;
  animation: trackSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.35s both;
}

.t2 .toggle-track {
  border-style: dashed;
}

.t2 .toggle-bg { opacity: 0; }

.t2 .toggle-knob {
  left: -30px;
  opacity: 0.35;
  animation: knobSnapLeft 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) 0.65s both;
}

/* Toggle 3: ON */
.t3 {
  top: 80px;
  animation: trackSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.55s both;
}

.t3 .toggle-knob {
  left: -30px;
  animation: knobSnapRight 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) 0.85s both;
}

/* track slides in from left */
@keyframes trackSlideIn {
  from {
    opacity: 0;
    transform: translateX(-24px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* knob snaps to right (ON position) */
@keyframes knobSnapRight {
  from {
    left: -30px;
  }
  to {
    left: 50px;
  }
}

/* knob snaps to left (OFF position) */
@keyframes knobSnapLeft {
  from {
    left: -30px;
  }
  to {
    left: 2px;
  }
}

/* ---- WORDMARK ---- */
.wordmark {
  display: flex;
  gap: 0;
  overflow: hidden;
}

.wm-char {
  font-family: 'Oswald', 'Arial Narrow', sans-serif;
  font-size: 64px;
  font-weight: 700;
  letter-spacing: 5px;
  text-transform: uppercase;
  line-height: 1;
  opacity: 0;
  transform: translateY(12px);
}

.wm-char.white { color: #f0f0f0; }
.wm-char.orange { color: #ff6b35; }

/* staggered type-in */
.wm-char:nth-child(1) { animation: charIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) 1.05s both; }
.wm-char:nth-child(2) { animation: charIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) 1.12s both; }
.wm-char:nth-child(3) { animation: charIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) 1.19s both; }
.wm-char:nth-child(4) { animation: charIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) 1.28s both; }
.wm-char:nth-child(5) { animation: charIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) 1.35s both; }
.wm-char:nth-child(6) { animation: charIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) 1.42s both; }

@keyframes charIn {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* ---- CURSOR BLINK at end ---- */
.cursor {
  width: 3px;
  height: 48px;
  background: #ff6b35;
  align-self: center;
  margin-left: 4px;
  opacity: 0;
  animation: cursorAppear 0.01s linear 1.5s both,
             cursorBlink 0.8s step-end 1.5s infinite;
}

@keyframes cursorAppear {
  to { opacity: 1; }
}

@keyframes cursorBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

/* ---- SCAN LINE (subtle) ---- */
.scanline {
  position: fixed;
  top: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, #ff6b35, transparent);
  opacity: 0;
  animation: scanDown 0.6s ease-out 0.0s both;
  pointer-events: none;
  z-index: 100;
}

@keyframes scanDown {
  0% {
    opacity: 0.6;
    top: -2px;
  }
  100% {
    opacity: 0;
    top: 100vh;
  }
}

/* ---- MOBILE RESPONSIVE ---- */
@media (max-width: 600px) {
  .splash {
    flex-direction: column;
    gap: 24px;
  }

  .mark {
    transform: scale(0.8);
  }

  .wm-char {
    font-size: 42px;
    letter-spacing: 3px;
  }

  .cursor {
    height: 32px;
    width: 2px;
  }
}

@media (max-width: 380px) {
  .mark {
    transform: scale(0.7);
  }

  .wm-char {
    font-size: 36px;
    letter-spacing: 2px;
  }

  .cursor {
    height: 28px;
  }
}
</style>
