import { ref, shallowRef } from 'vue';
import manifestData from '../../../../docs/manifest.json';

export interface DocPage {
  id: string;
  title: string;
  path: string;
  badge?: string;
  copyable?: boolean;
}

export interface DocSection {
  id: string;
  title: string;
  icon: string;
  pages: DocPage[];
  highlight?: boolean;
}

export interface DocsManifest {
  version: string;
  title: string;
  sections: DocSection[];
}

// Import all docs at build time
const docModules = import.meta.glob('../../../../docs/**/*.md', { as: 'raw', eager: false });

export function useDocs() {
  const manifest = ref<DocsManifest>(manifestData as DocsManifest);
  const currentDoc = shallowRef<string>('');
  const loading = ref(false);
  const error = ref<string | null>(null);

  const findDocPath = (slug: string): string | null => {
    // Try exact path match first
    const paths = [
      `../../../../docs/${slug}.md`,
      `../../../../docs/${slug}/README.md`,
      `../../../../docs/${slug}/_index.md`,
    ];

    for (const path of paths) {
      if (docModules[path]) {
        return path;
      }
    }

    // Try matching from manifest
    for (const section of manifest.value.sections) {
      for (const page of section.pages) {
        const pagePath = page.path.replace(/\.md$/, '');
        const pagePathWithoutIndex = pagePath.replace(/\/_index$/, '').replace(/\/README$/, '');

        if (pagePathWithoutIndex === slug || page.id === slug) {
          const fullPath = `../../../../docs/${page.path}`;
          if (docModules[fullPath]) {
            return fullPath;
          }
        }
      }
    }

    return null;
  };

  const loadDoc = async (slug: string) => {
    loading.value = true;
    error.value = null;

    try {
      const docPath = findDocPath(slug);

      if (!docPath) {
        error.value = `Document "${slug}" not found`;
        currentDoc.value = '';
        return;
      }

      const content = await docModules[docPath]();
      currentDoc.value = content as string;
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load document';
      currentDoc.value = '';
    } finally {
      loading.value = false;
    }
  };

  const getPagesBySection = (sectionId: string): DocPage[] => {
    const section = manifest.value.sections.find((s) => s.id === sectionId);
    return section?.pages || [];
  };

  return {
    manifest,
    currentDoc,
    loading,
    error,
    loadDoc,
    getPagesBySection,
  };
}
