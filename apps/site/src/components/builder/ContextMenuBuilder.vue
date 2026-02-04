<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSchemaStore } from '@/stores/schema';
import FurlowButton from '@/components/common/FurlowButton.vue';
import FurlowInput from '@/components/common/FurlowInput.vue';
import ActionCard from './ActionCard.vue';

const schemaStore = useSchemaStore();

const showActionPicker = ref(false);
const editingMenu = ref<number | null>(null);

const contextMenus = computed(() => {
  return (schemaStore.spec.context_menus as Record<string, unknown>[] | undefined) || [];
});

const addContextMenu = () => {
  const menus = [...contextMenus.value];
  menus.push({
    name: `menu_${menus.length + 1}`,
    type: 'user',
    actions: [],
  });
  schemaStore.updateSection('context_menus' as never, menus as never);
  editingMenu.value = menus.length - 1;
};

const removeContextMenu = (index: number) => {
  const menus = [...contextMenus.value];
  menus.splice(index, 1);
  schemaStore.updateSection('context_menus' as never, menus.length > 0 ? menus as never : undefined as never);
  if (editingMenu.value === index) {
    editingMenu.value = null;
  }
};

const updateMenu = (index: number, key: string, value: unknown) => {
  const menus = [...contextMenus.value];
  menus[index] = { ...menus[index], [key]: value === '' ? undefined : value };
  schemaStore.updateSection('context_menus' as never, menus as never);
};

const addAction = (actionType: string) => {
  if (editingMenu.value === null) return;

  const menus = [...contextMenus.value];
  const menu = menus[editingMenu.value];
  const actions = [...((menu.actions as unknown[]) || [])];

  actions.push({ action: actionType });
  menus[editingMenu.value] = { ...menu, actions };

  schemaStore.updateSection('context_menus' as never, menus as never);
  showActionPicker.value = false;
};

const removeAction = (actionIndex: number) => {
  if (editingMenu.value === null) return;

  const menus = [...contextMenus.value];
  const menu = menus[editingMenu.value];
  const actions = [...((menu.actions as unknown[]) || [])];

  actions.splice(actionIndex, 1);
  menus[editingMenu.value] = { ...menu, actions };

  schemaStore.updateSection('context_menus' as never, menus as never);
};

const updateAction = (actionIndex: number, updatedAction: Record<string, unknown>) => {
  if (editingMenu.value === null) return;

  const menus = [...contextMenus.value];
  const menu = menus[editingMenu.value];
  const actions = [...((menu.actions as unknown[]) || [])] as Record<string, unknown>[];

  actions[actionIndex] = updatedAction;
  menus[editingMenu.value] = { ...menu, actions };

  schemaStore.updateSection('context_menus' as never, menus as never);
};

// Action categories for the picker
const actionCategories = [
  {
    name: 'MESSAGE',
    actions: ['reply', 'send_message', 'send_dm', 'defer'],
  },
  {
    name: 'MEMBER',
    actions: ['assign_role', 'remove_role', 'kick', 'ban', 'timeout'],
  },
  {
    name: 'STATE',
    actions: ['set', 'increment', 'decrement'],
  },
  {
    name: 'FLOW',
    actions: ['call_flow', 'flow_if', 'log'],
  },
];
</script>

<template>
  <div class="context-menu-builder">
    <!-- Menus List -->
    <div class="menus-list">
      <div class="menus-header">
        <span class="menus-count">{{ contextMenus.length }} Context Menus</span>
        <FurlowButton size="sm" icon="fas fa-plus" @click="addContextMenu">
          ADD MENU
        </FurlowButton>
      </div>

      <div v-if="contextMenus.length === 0" class="empty-list">
        <i class="fas fa-bars"></i>
        <p>No context menus defined</p>
        <span>Create right-click menus for users and messages</span>
        <FurlowButton size="sm" variant="secondary" @click="addContextMenu">
          Create your first context menu
        </FurlowButton>
      </div>

      <div v-else class="menus-grid">
        <div
          v-for="(menu, index) in contextMenus"
          :key="index"
          :class="['menu-card', { active: editingMenu === index }]"
          @click="editingMenu = index"
        >
          <div class="menu-header">
            <div class="menu-info">
              <i :class="menu.type === 'user' ? 'fas fa-user' : 'fas fa-message'"></i>
              <span class="menu-name">{{ menu.name || `Menu ${index + 1}` }}</span>
            </div>
            <button class="remove-btn" @click.stop="removeContextMenu(index)">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="menu-meta">
            <span class="menu-type">{{ menu.type === 'user' ? 'User Menu' : 'Message Menu' }}</span>
            <span class="action-count">{{ ((menu.actions as unknown[]) || []).length }} actions</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Menu Editor -->
    <div v-if="editingMenu !== null && contextMenus[editingMenu]" class="menu-editor">
      <div class="editor-header">
        <h3 class="editor-title">EDIT CONTEXT MENU</h3>
      </div>

      <div class="editor-fields">
        <FurlowInput
          :model-value="(contextMenus[editingMenu].name as string) || ''"
          label="Menu Name"
          placeholder="Report User"
          hint="Display name shown in the context menu"
          @update:model-value="updateMenu(editingMenu!, 'name', $event)"
        />

        <div class="input-group">
          <label class="input-label">Menu Type</label>
          <select
            class="select"
            :value="(contextMenus[editingMenu].type as string) || 'user'"
            @change="updateMenu(editingMenu!, 'type', ($event.target as HTMLSelectElement).value)"
          >
            <option value="user">User (right-click on user)</option>
            <option value="message">Message (right-click on message)</option>
          </select>
          <span class="input-hint">Where this menu appears</span>
        </div>

        <div class="input-group">
          <label class="input-label">
            Condition (when)
            <span class="field-type-badge">expr</span>
          </label>
          <input
            type="text"
            class="input"
            :value="(contextMenus[editingMenu].when as string) || ''"
            placeholder="e.g. member.permissions | has('MODERATE_MEMBERS')"
            @input="updateMenu(editingMenu!, 'when', ($event.target as HTMLInputElement).value)"
          />
          <span class="input-hint">Optional expression to control when menu is available</span>
        </div>

        <div class="input-group">
          <label class="input-label">
            Required Permissions
            <span class="field-type-badge">expr</span>
          </label>
          <input
            type="text"
            class="input"
            :value="(contextMenus[editingMenu].permissions as string) || ''"
            placeholder="e.g. 'MODERATE_MEMBERS'"
            @input="updateMenu(editingMenu!, 'permissions', ($event.target as HTMLInputElement).value)"
          />
          <span class="input-hint">Discord permissions required to see this menu</span>
        </div>
      </div>

      <!-- Actions Section -->
      <div class="actions-section">
        <div class="actions-header">
          <span class="actions-title">ACTIONS</span>
          <FurlowButton size="sm" icon="fas fa-plus" @click="showActionPicker = true">
            ADD ACTION
          </FurlowButton>
        </div>

        <div class="actions-list">
          <ActionCard
            v-for="(action, aIndex) in (contextMenus[editingMenu].actions as unknown[]) || []"
            :key="aIndex"
            :action="action as Record<string, unknown>"
            :index="aIndex"
            @update="updateAction"
            @remove="removeAction"
          />

          <div v-if="!((contextMenus[editingMenu].actions as unknown[]) || []).length" class="empty-actions">
            <p>No actions added yet</p>
            <span>Actions run when a user clicks this context menu</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Picker Modal -->
    <div v-if="showActionPicker" class="modal-overlay" @click.self="showActionPicker = false">
      <div class="action-picker">
        <div class="picker-header">
          <h3 class="picker-title">SELECT ACTION</h3>
          <button class="modal-close" @click="showActionPicker = false">
            <i class="fas fa-times"></i>
          </button>
        </div>

        <div class="picker-body">
          <div v-for="category in actionCategories" :key="category.name" class="action-category">
            <div class="category-header">{{ category.name }}</div>
            <div class="category-actions">
              <button
                v-for="action in category.actions"
                :key="action"
                class="action-option"
                @click="addAction(action)"
              >
                {{ action }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.context-menu-builder {
  display: flex;
  flex-direction: column;
  gap: var(--sp-xl);
}

.menus-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-md);
}

.menus-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.menus-count {
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-dim);
  letter-spacing: 1px;
  text-transform: uppercase;
}

.empty-list {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-md);
  padding: var(--sp-2xl);
  border: 1px dashed var(--border-mid);
  text-align: center;
}

.empty-list i {
  font-size: 32px;
  color: var(--text-ghost);
}

.empty-list p {
  color: var(--text-dim);
  margin: 0;
}

.empty-list span {
  font-size: 12px;
  color: var(--text-ghost);
}

.menus-grid {
  display: flex;
  flex-direction: column;
  gap: var(--sp-sm);
}

.menu-card {
  background: var(--bg-raised);
  border: var(--border-solid);
  padding: var(--sp-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.menu-card:hover {
  border-color: var(--border-mid);
}

.menu-card.active {
  border-color: var(--accent);
  background: var(--accent-faint);
}

.menu-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.menu-info {
  display: flex;
  align-items: center;
  gap: var(--sp-sm);
}

.menu-info i {
  color: var(--accent-dim);
  font-size: 12px;
}

.menu-name {
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-bright);
  letter-spacing: 1px;
}

.remove-btn {
  background: none;
  border: none;
  color: var(--text-ghost);
  cursor: pointer;
  padding: var(--sp-xs);
}

.remove-btn:hover {
  color: var(--red);
}

.menu-meta {
  display: flex;
  align-items: center;
  gap: var(--sp-md);
  margin-top: var(--sp-xs);
}

.menu-type {
  font-size: 11px;
  color: var(--text-dim);
}

.action-count {
  font-size: 11px;
  color: var(--text-ghost);
}

.menu-editor {
  background: var(--bg-panel);
  border: var(--border-solid);
  padding: var(--sp-lg);
}

.editor-header {
  margin-bottom: var(--sp-lg);
  padding-bottom: var(--sp-md);
  border-bottom: var(--border-dashed);
}

.editor-title {
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 600;
  color: var(--text-bright);
  letter-spacing: 2px;
  margin: 0;
}

.editor-fields {
  display: flex;
  flex-direction: column;
  gap: var(--sp-md);
  margin-bottom: var(--sp-xl);
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: var(--sp-xs);
}

.input-label {
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 700;
  color: var(--text-ghost);
  letter-spacing: 1.5px;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: var(--sp-xs);
}

.field-type-badge {
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--accent-dim);
  background: var(--accent-faint);
  padding: 1px 4px;
  margin-left: auto;
}

.input-hint {
  font-size: 10px;
  color: var(--text-ghost);
}

.actions-section {
  border-top: var(--border-dashed);
  padding-top: var(--sp-lg);
}

.actions-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sp-md);
}

.actions-title {
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 700;
  color: var(--text-ghost);
  letter-spacing: 2px;
}

.actions-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-sm);
}

.empty-actions {
  padding: var(--sp-lg);
  text-align: center;
  border: 1px dashed var(--border-mid);
}

.empty-actions p {
  color: var(--text-dim);
  font-size: 12px;
  margin: 0 0 var(--sp-xs) 0;
}

.empty-actions span {
  font-size: 11px;
  color: var(--text-ghost);
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.action-picker {
  background: var(--bg-panel);
  border: var(--border-solid);
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-md) var(--sp-lg);
  border-bottom: var(--border-solid);
}

.picker-title {
  font-family: var(--font-display);
  font-size: 14px;
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
}

.modal-close:hover {
  color: var(--text-bright);
}

.picker-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--sp-lg);
}

.action-category {
  margin-bottom: var(--sp-lg);
}

.category-header {
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-dim);
  letter-spacing: 2px;
  margin-bottom: var(--sp-sm);
}

.category-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-xs);
}

.action-option {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text);
  background: var(--bg);
  border: var(--border-solid);
  padding: var(--sp-xs) var(--sp-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.action-option:hover {
  color: var(--accent);
  border-color: var(--accent);
  background: var(--accent-faint);
}
</style>
