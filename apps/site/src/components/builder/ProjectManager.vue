<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useSchemaStore } from '@/stores/schema';
import FurlowButton from '@/components/common/FurlowButton.vue';
import FurlowInput from '@/components/common/FurlowInput.vue';
import { useFocusTrap } from '@/composables/useKeyboard';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'new'): void;
  (e: 'load', projectId: string): void;
}>();

const schemaStore = useSchemaStore();

const newProjectName = ref('');
const showNewProject = ref(false);
const modalRef = ref<HTMLElement | null>(null);

// Focus trap for accessibility
const { activate: activateFocusTrap, deactivate: deactivateFocusTrap } = useFocusTrap(modalRef);

// Handle escape key
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    emit('close');
  }
};

onMounted(() => {
  activateFocusTrap();
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  deactivateFocusTrap();
  window.removeEventListener('keydown', handleKeyDown);
});

const projects = computed(() =>
  [...schemaStore.savedProjects].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )
);

const formatDate = (date: Date) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const handleNewProject = () => {
  if (newProjectName.value.trim()) {
    schemaStore.newProject(newProjectName.value.trim());
    emit('close');
  }
};

const handleLoadProject = (projectId: string) => {
  emit('load', projectId);
};

const handleDeleteProject = (projectId: string, event: Event) => {
  event.stopPropagation();
  if (confirm('Are you sure you want to delete this project?')) {
    schemaStore.deleteProject(projectId);
  }
};
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')" role="dialog" aria-modal="true" aria-labelledby="project-manager-title">
    <div ref="modalRef" class="project-manager">
      <div class="modal-header">
        <h2 id="project-manager-title" class="modal-title">PROJECTS</h2>
        <button class="modal-close" @click="emit('close')">
          <i class="fas fa-times"></i>
        </button>
      </div>

      <div class="modal-body">
        <!-- New Project Form -->
        <div v-if="showNewProject" class="new-project-form">
          <FurlowInput
            v-model="newProjectName"
            label="Project Name"
            placeholder="My Awesome Bot"
          />
          <div class="form-actions">
            <FurlowButton variant="ghost" size="sm" @click="showNewProject = false">
              CANCEL
            </FurlowButton>
            <FurlowButton size="sm" @click="handleNewProject">
              CREATE
            </FurlowButton>
          </div>
        </div>

        <!-- New Project Button -->
        <div v-else class="new-project-btn-container">
          <FurlowButton icon="fas fa-plus" @click="showNewProject = true">
            NEW PROJECT
          </FurlowButton>
        </div>

        <!-- Storage Warning -->
        <div class="storage-warning">
          <i class="fas fa-info-circle"></i>
          <span>Projects are stored in your browser. Clear browser data will delete them.</span>
        </div>

        <!-- Projects List -->
        <div class="projects-section">
          <h3 class="section-title">SAVED PROJECTS</h3>

          <div v-if="projects.length === 0" class="empty-projects">
            <i class="fas fa-folder-open"></i>
            <p>No saved projects yet</p>
          </div>

          <div v-else class="projects-list">
            <div
              v-for="project in projects"
              :key="project.id"
              :class="['project-card', { active: schemaStore.currentProject?.id === project.id }]"
              @click="handleLoadProject(project.id)"
            >
              <div class="project-info">
                <span class="project-name">{{ project.name }}</span>
                <span class="project-date">{{ formatDate(project.updatedAt) }}</span>
              </div>
              <div class="project-actions">
                <button
                  class="delete-btn"
                  title="Delete project"
                  @click="handleDeleteProject(project.id, $event)"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.project-manager {
  background: var(--bg-panel);
  border: var(--border-solid);
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-lg);
  border-bottom: var(--border-solid);
}

.modal-title {
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 600;
  color: var(--text-heading);
  letter-spacing: 2px;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  color: var(--text-dim);
  cursor: pointer;
  font-size: 16px;
  padding: var(--sp-xs);
  transition: color var(--transition-fast);
}

.modal-close:hover {
  color: var(--text-bright);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--sp-lg);
}

.new-project-form {
  display: flex;
  flex-direction: column;
  gap: var(--sp-md);
  margin-bottom: var(--sp-lg);
  padding: var(--sp-lg);
  background: var(--bg-raised);
  border: var(--border-solid);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--sp-sm);
}

.new-project-btn-container {
  margin-bottom: var(--sp-lg);
}

.storage-warning {
  display: flex;
  align-items: flex-start;
  gap: var(--sp-sm);
  padding: var(--sp-sm) var(--sp-md);
  background: var(--yellow-dim);
  border-left: 3px solid var(--yellow);
  font-size: 11px;
  color: var(--yellow);
  margin-bottom: var(--sp-lg);
}

.storage-warning i {
  margin-top: 2px;
}

.projects-section {
  border-top: var(--border-dashed);
  padding-top: var(--sp-lg);
}

.section-title {
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 700;
  color: var(--text-ghost);
  letter-spacing: 2px;
  margin: 0 0 var(--sp-md);
}

.empty-projects {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-md);
  padding: var(--sp-2xl);
  text-align: center;
  border: 1px dashed var(--border-mid);
}

.empty-projects i {
  font-size: 32px;
  color: var(--text-ghost);
}

.empty-projects p {
  color: var(--text-dim);
  margin: 0;
}

.projects-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-sm);
}

.project-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-md);
  background: var(--bg-raised);
  border: var(--border-solid);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.project-card:hover {
  border-color: var(--border-mid);
}

.project-card.active {
  border-color: var(--accent);
  background: var(--accent-faint);
}

.project-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.project-name {
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-bright);
  letter-spacing: 1px;
}

.project-date {
  font-size: 10px;
  color: var(--text-ghost);
}

.project-actions {
  display: flex;
  gap: var(--sp-xs);
}

.delete-btn {
  background: none;
  border: 1px solid var(--border-mid);
  color: var(--text-ghost);
  width: 28px;
  height: 28px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.delete-btn:hover {
  color: var(--red);
  border-color: var(--red);
  background: var(--red-dim);
}

.delete-btn i {
  font-size: 11px;
}

/* Mobile responsive styles */
@media (max-width: 768px) {
  .project-manager {
    width: 100%;
    max-width: 100%;
    max-height: 100vh;
    height: 100vh;
  }

  .modal-header {
    padding: var(--sp-md);
  }

  .modal-title {
    font-size: 14px;
  }

  .modal-body {
    padding: var(--sp-md);
  }

  .new-project-form {
    padding: var(--sp-md);
  }

  .storage-warning {
    font-size: 10px;
    padding: var(--sp-xs) var(--sp-sm);
  }

  .project-card {
    padding: var(--sp-sm);
  }

  .project-name {
    font-size: 12px;
  }

  .empty-projects {
    padding: var(--sp-lg);
  }

  .empty-projects i {
    font-size: 24px;
  }
}

@media (max-width: 480px) {
  .form-actions {
    flex-direction: column;
  }

  .form-actions button {
    width: 100%;
    justify-content: center;
  }

  .section-title {
    font-size: 10px;
  }

  .project-info {
    min-width: 0;
    flex: 1;
  }

  .project-name {
    word-break: break-word;
  }

  .delete-btn {
    width: 36px;
    height: 36px;
  }
}
</style>
