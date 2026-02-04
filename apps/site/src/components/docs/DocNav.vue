<script setup lang="ts">
import { ref } from 'vue';
import type { DocsManifest, DocPage } from '@/composables/useDocs';

interface Props {
  manifest: DocsManifest;
  activeId?: string;
}

const props = defineProps<Props>();

const expandedSections = ref<Set<string>>(new Set(['ai-reference', 'getting-started']));

const toggleSection = (sectionId: string) => {
  if (expandedSections.value.has(sectionId)) {
    expandedSections.value.delete(sectionId);
  } else {
    expandedSections.value.add(sectionId);
  }
};

const isExpanded = (sectionId: string) => expandedSections.value.has(sectionId);

const getDocPath = (page: DocPage) => {
  const path = page.path.replace(/\.md$/, '').replace(/\/_index$/, '').replace(/\/README$/, '');
  return `/docs/${path}`;
};

const isActive = (pageId: string) => props.activeId === pageId;
</script>

<template>
  <nav class="doc-nav">
    <div class="nav-header">
      <span class="nav-title">DOCUMENTATION</span>
    </div>

    <div v-for="section in manifest.sections" :key="section.id" :class="['nav-section', { highlight: section.highlight }]">
      <button
        :class="['section-header', { expanded: isExpanded(section.id), highlight: section.highlight }]"
        @click="toggleSection(section.id)"
      >
        <i :class="['section-icon', section.icon]"></i>
        <span class="section-title">{{ section.title }}</span>
        <i class="fas fa-chevron-down chevron"></i>
      </button>

      <div :class="['section-pages', { expanded: isExpanded(section.id) }]">
        <RouterLink
          v-for="page in section.pages"
          :key="page.id"
          :to="getDocPath(page)"
          :class="['page-link', { active: isActive(page.id) }]"
        >
          <span class="page-title">{{ page.title }}</span>
          <span v-if="page.badge" :class="['page-badge', { 'badge-ai': page.badge === 'AI' }]">{{ page.badge }}</span>
        </RouterLink>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.doc-nav {
  padding: var(--sp-lg) 0;
}

.nav-header {
  padding: 0 var(--sp-lg) var(--sp-md);
  border-bottom: var(--border-dashed);
  margin-bottom: var(--sp-md);
}

.nav-title {
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 700;
  color: var(--text-ghost);
  letter-spacing: 2px;
}

.nav-section {
  margin-bottom: var(--sp-xs);
}

.section-header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--sp-sm);
  padding: var(--sp-sm) var(--sp-lg);
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-dim);
  transition: all var(--transition-fast);
}

.section-header:hover {
  color: var(--text-bright);
  background: var(--bg-hover);
}

.section-header.expanded {
  color: var(--text-bright);
}

.section-icon {
  font-size: 11px;
  width: 16px;
  text-align: center;
  color: var(--accent-dim);
}

.section-title {
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  flex: 1;
  text-align: left;
}

.chevron {
  font-size: 10px;
  transition: transform var(--transition-fast);
}

.section-header.expanded .chevron {
  transform: rotate(180deg);
}

.section-pages {
  display: none;
  flex-direction: column;
}

.section-pages.expanded {
  display: flex;
}

.page-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-xs) var(--sp-lg);
  padding-left: calc(var(--sp-lg) + var(--sp-lg));
  color: var(--text-dim);
  text-decoration: none;
  font-size: 12px;
  transition: all var(--transition-fast);
}

.page-link:hover {
  color: var(--text-bright);
  background: var(--bg-hover);
}

.page-link.active {
  color: var(--accent);
  background: var(--accent-faint);
  border-left: 2px solid var(--accent);
}

.page-title {
  flex: 1;
}

.page-badge {
  font-size: 9px;
  font-family: var(--font-mono);
  color: var(--text-ghost);
  background: var(--bg-panel);
  padding: 1px 4px;
  border: 1px dashed var(--border-mid);
}

.page-badge.badge-ai {
  color: var(--accent);
  background: var(--accent-faint);
  border: 1px solid var(--accent);
  font-weight: 600;
}

/* Highlighted section (AI Reference) */
.nav-section.highlight {
  background: linear-gradient(135deg, var(--accent-faint) 0%, transparent 100%);
  border-left: 2px solid var(--accent);
  margin: 0 var(--sp-sm) var(--sp-md);
  padding: var(--sp-xs) 0;
}

.section-header.highlight {
  color: var(--accent);
}

.section-header.highlight .section-icon {
  color: var(--accent);
}

.section-header.highlight:hover {
  background: var(--accent-faint);
}

.nav-section.highlight .page-link {
  padding-left: calc(var(--sp-lg) + var(--sp-md));
}
</style>
