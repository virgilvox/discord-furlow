<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DocNav from '@/components/docs/DocNav.vue';
import MarkdownRenderer from '@/components/docs/MarkdownRenderer.vue';
import TableOfContents from '@/components/docs/TableOfContents.vue';
import { useDocs } from '@/composables/useDocs';

const route = useRoute();
const router = useRouter();

const { manifest, loadDoc, currentDoc, loading, error } = useDocs();

const mobileSidebarOpen = ref(false);
const mobileTocOpen = ref(false);
const copied = ref(false);

const toggleMobileSidebar = () => {
  mobileSidebarOpen.value = !mobileSidebarOpen.value;
  if (mobileSidebarOpen.value) mobileTocOpen.value = false;
};

const toggleMobileToc = () => {
  mobileTocOpen.value = !mobileTocOpen.value;
  if (mobileTocOpen.value) mobileSidebarOpen.value = false;
};

const closeMobilePanels = () => {
  mobileSidebarOpen.value = false;
  mobileTocOpen.value = false;
};

const slug = computed(() => {
  const params = route.params.pathMatch;
  if (Array.isArray(params)) {
    return params.join('/');
  }
  return params || '';
});

const currentPage = computed(() => {
  if (!manifest.value) return null;

  for (const section of manifest.value.sections) {
    for (const page of section.pages) {
      const pagePath = page.path.replace(/\.md$/, '').replace(/\/_index$/, '').replace(/\/README$/, '');
      if (pagePath === slug.value || page.id === slug.value) {
        return { ...page, sectionId: section.id, copyable: (page as any).copyable };
      }
    }
  }
  return null;
});

const copyToClipboard = async () => {
  if (currentDoc.value) {
    try {
      await navigator.clipboard.writeText(currentDoc.value);
      copied.value = true;
      setTimeout(() => {
        copied.value = false;
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }
};

watch(
  () => slug.value,
  async (newSlug) => {
    if (newSlug) {
      await loadDoc(newSlug);
    } else {
      // Default to installation guide
      router.replace('/docs/guides/installation');
    }
  },
  { immediate: true }
);

onMounted(async () => {
  if (!slug.value) {
    router.replace('/docs/guides/installation');
  }
});
</script>

<template>
  <div class="docs-layout">
    <!-- Desktop sidebar -->
    <aside class="docs-sidebar desktop-only">
      <DocNav
        v-if="manifest"
        :manifest="manifest"
        :activeId="currentPage?.id"
      />
    </aside>

    <main class="docs-main">
      <article class="docs-content">
        <div v-if="loading" class="docs-loading">
          <div class="spinner"></div>
          <span>Loading...</span>
        </div>

        <div v-else-if="error" class="docs-error">
          <i class="fas fa-exclamation-triangle"></i>
          <h2>DOCUMENT NOT FOUND</h2>
          <p>{{ error }}</p>
          <RouterLink to="/docs/guides/installation" class="btn btn-primary">
            GO TO DOCS HOME
          </RouterLink>
        </div>

        <template v-else>
          <div v-if="currentPage?.copyable" class="copy-banner">
            <div class="copy-banner-content">
              <i class="fas fa-robot"></i>
              <div class="copy-banner-text">
                <span class="copy-banner-title">LLM Reference</span>
                <span class="copy-banner-desc">Copy this entire page to use with AI assistants</span>
              </div>
            </div>
            <button
              class="copy-banner-btn"
              @click="copyToClipboard"
              :class="{ copied }"
            >
              <i :class="copied ? 'fas fa-check' : 'fas fa-copy'"></i>
              {{ copied ? 'Copied!' : 'Copy to Clipboard' }}
            </button>
          </div>
          <MarkdownRenderer :content="currentDoc" />
        </template>
      </article>

      <!-- Desktop TOC -->
      <aside class="docs-toc desktop-toc">
        <TableOfContents v-if="currentDoc" :content="currentDoc" />
      </aside>
    </main>

    <!-- Mobile bottom navigation -->
    <nav class="mobile-docs-nav mobile-only">
      <button
        :class="['mobile-nav-btn', { active: mobileSidebarOpen }]"
        @click="toggleMobileSidebar"
      >
        <i class="fas fa-list"></i>
        <span>NAV</span>
      </button>
      <button
        :class="['mobile-nav-btn', { active: mobileTocOpen }]"
        @click="toggleMobileToc"
      >
        <i class="fas fa-bookmark"></i>
        <span>ON PAGE</span>
      </button>
    </nav>

    <!-- Mobile sidebar overlay -->
    <div
      :class="['mobile-overlay', { open: mobileSidebarOpen || mobileTocOpen }]"
      @click="closeMobilePanels"
    ></div>

    <!-- Mobile sidebar panel -->
    <aside :class="['mobile-docs-sidebar', { open: mobileSidebarOpen }]">
      <div class="mobile-panel-header">
        <span class="mobile-panel-title">NAVIGATION</span>
        <button class="mobile-panel-close" @click="mobileSidebarOpen = false">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="mobile-panel-body" @click="closeMobilePanels">
        <DocNav
          v-if="manifest"
          :manifest="manifest"
          :activeId="currentPage?.id"
        />
      </div>
    </aside>

    <!-- Mobile TOC panel -->
    <aside :class="['mobile-docs-toc', { open: mobileTocOpen }]">
      <div class="mobile-panel-header">
        <span class="mobile-panel-title">ON THIS PAGE</span>
        <button class="mobile-panel-close" @click="mobileTocOpen = false">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="mobile-panel-body" @click="closeMobilePanels">
        <TableOfContents v-if="currentDoc" :content="currentDoc" />
      </div>
    </aside>
  </div>
</template>

<style scoped>
.docs-layout {
  display: flex;
  min-height: calc(100vh - var(--nav-height));
}

.docs-sidebar {
  width: var(--sidebar-width);
  flex-shrink: 0;
  background: var(--bg-sidebar);
  border-right: var(--border-solid);
  position: sticky;
  top: var(--nav-height);
  height: calc(100vh - var(--nav-height));
  overflow-y: auto;
}

.docs-main {
  flex: 1;
  display: flex;
  max-width: calc(100% - var(--sidebar-width));
}

.docs-content {
  flex: 1;
  padding: var(--sp-2xl);
  max-width: 800px;
}

.docs-toc {
  width: 220px;
  flex-shrink: 0;
  padding: var(--sp-2xl) var(--sp-lg);
  position: sticky;
  top: var(--nav-height);
  height: calc(100vh - var(--nav-height));
  overflow-y: auto;
  border-left: var(--border-solid);
}

.docs-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-md);
  padding: var(--sp-4xl);
  color: var(--text-dim);
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border-mid);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.docs-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--sp-lg);
  padding: var(--sp-4xl);
}

.docs-error i {
  font-size: 48px;
  color: var(--yellow);
}

.docs-error h2 {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 600;
  color: var(--text-heading);
  letter-spacing: 3px;
}

.docs-error p {
  color: var(--text-dim);
}

.copy-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-lg);
  padding: var(--sp-lg);
  margin-bottom: var(--sp-xl);
  background: linear-gradient(135deg, rgba(88, 101, 242, 0.1) 0%, rgba(235, 69, 158, 0.1) 100%);
  border: 1px solid var(--accent);
  border-left: 4px solid var(--accent);
}

.copy-banner-content {
  display: flex;
  align-items: center;
  gap: var(--sp-md);
}

.copy-banner-content > i {
  font-size: 24px;
  color: var(--accent);
}

.copy-banner-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.copy-banner-title {
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-bright);
  letter-spacing: 1px;
}

.copy-banner-desc {
  font-size: 12px;
  color: var(--text-dim);
}

.copy-banner-btn {
  display: flex;
  align-items: center;
  gap: var(--sp-sm);
  padding: var(--sp-sm) var(--sp-lg);
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 1px;
  color: var(--text-bright);
  background: var(--accent);
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.copy-banner-btn:hover {
  background: var(--accent-hover);
  transform: translateY(-1px);
}

.copy-banner-btn.copied {
  background: var(--green);
}

.copy-banner-btn i {
  font-size: 11px;
}

/* Desktop only */
.desktop-only {
  display: block;
}

.desktop-toc {
  display: block;
}

/* Mobile only */
.mobile-only {
  display: none;
}

/* Mobile navigation bar */
.mobile-docs-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--bg-panel);
  border-top: var(--border-solid);
  z-index: 100;
  padding: var(--sp-xs) 0;
  padding-bottom: env(safe-area-inset-bottom, var(--sp-xs));
  justify-content: center;
  gap: var(--sp-lg);
}

.mobile-nav-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: var(--sp-sm) var(--sp-xl);
  color: var(--text-dim);
  font-family: var(--font-display);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 1px;
  text-transform: uppercase;
  background: none;
  border: none;
  cursor: pointer;
  transition: color var(--transition-fast);
  min-height: 52px;
}

.mobile-nav-btn i {
  font-size: 18px;
}

.mobile-nav-btn:hover,
.mobile-nav-btn.active {
  color: var(--accent);
}

/* Mobile overlay */
.mobile-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 200;
  opacity: 0;
  visibility: hidden;
  transition: all var(--transition-fast);
  display: none;
}

.mobile-overlay.open {
  opacity: 1;
  visibility: visible;
}

/* Mobile panels */
.mobile-docs-sidebar,
.mobile-docs-toc {
  position: fixed;
  top: 0;
  bottom: 0;
  width: 85%;
  max-width: 320px;
  background: var(--bg-sidebar);
  z-index: 201;
  transform: translateX(-100%);
  transition: transform var(--transition-fast);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  display: none;
  flex-direction: column;
}

.mobile-docs-sidebar {
  left: 0;
}

.mobile-docs-toc {
  left: auto;
  right: 0;
  transform: translateX(100%);
}

.mobile-docs-sidebar.open,
.mobile-docs-toc.open {
  transform: translateX(0);
}

.mobile-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-md) var(--sp-lg);
  border-bottom: var(--border-solid);
  background: var(--bg-panel);
  flex-shrink: 0;
}

.mobile-panel-title {
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-bright);
  letter-spacing: 2px;
  text-transform: uppercase;
}

.mobile-panel-close {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 1px solid var(--border-mid);
  color: var(--text-dim);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.mobile-panel-close:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.mobile-panel-body {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

@media (max-width: 1100px) {
  .desktop-toc {
    display: none;
  }
}

@media (max-width: 768px) {
  .desktop-only {
    display: none !important;
  }

  .mobile-only {
    display: flex !important;
  }

  .mobile-overlay,
  .mobile-docs-sidebar,
  .mobile-docs-toc {
    display: flex;
  }

  .docs-main {
    max-width: 100%;
    padding-bottom: 72px;
  }

  .docs-content {
    padding: var(--sp-lg);
  }
}

@media (max-width: 480px) {
  .mobile-docs-sidebar,
  .mobile-docs-toc {
    max-width: 100%;
    width: 100%;
  }

  .docs-content {
    padding: var(--sp-md);
  }
}

/* Copy banner responsive */
@media (max-width: 768px) {
  .copy-banner {
    flex-direction: column;
    align-items: stretch;
    gap: var(--sp-md);
    padding: var(--sp-md);
  }

  .copy-banner-content > i {
    font-size: 20px;
  }

  .copy-banner-title {
    font-size: 13px;
  }

  .copy-banner-desc {
    font-size: 11px;
  }

  .copy-banner-btn {
    justify-content: center;
    padding: var(--sp-md);
  }
}

@media (max-width: 480px) {
  .copy-banner {
    margin-left: calc(-1 * var(--sp-md));
    margin-right: calc(-1 * var(--sp-md));
    border-left: none;
    border-right: none;
  }

  .copy-banner-content {
    gap: var(--sp-sm);
  }

  .copy-banner-title {
    font-size: 12px;
  }

  .copy-banner-desc {
    font-size: 10px;
  }

  .copy-banner-btn {
    font-size: 11px;
  }
}
</style>
