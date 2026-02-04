<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSchemaStore } from '@/stores/schema';
import FurlowButton from '@/components/common/FurlowButton.vue';
import FurlowInput from '@/components/common/FurlowInput.vue';
import ActionCard from './ActionCard.vue';
import CommandOptionEditor from './CommandOptionEditor.vue';

interface Props {
  section: string;
}

const props = defineProps<Props>();
const schemaStore = useSchemaStore();

const showActionPicker = ref(false);
const editingItem = ref<number | null>(null);
const draggedActionIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);

// Action categories
const actionCategories = [
  {
    name: 'MESSAGE',
    icon: 'fas fa-message',
    actions: [
      'send_message', 'reply', 'edit_message', 'delete_message', 'bulk_delete',
      'add_reaction', 'add_reactions', 'remove_reaction', 'clear_reactions',
    ],
  },
  {
    name: 'MEMBER',
    icon: 'fas fa-user',
    actions: [
      'assign_role', 'remove_role', 'toggle_role', 'set_nickname',
      'kick', 'ban', 'unban', 'timeout', 'remove_timeout', 'send_dm',
    ],
  },
  {
    name: 'CHANNEL',
    icon: 'fas fa-hashtag',
    actions: [
      'create_channel', 'edit_channel', 'delete_channel',
      'create_thread', 'archive_thread', 'set_channel_permissions',
    ],
  },
  {
    name: 'ROLE',
    icon: 'fas fa-id-badge',
    actions: ['create_role', 'edit_role', 'delete_role'],
  },
  {
    name: 'STATE',
    icon: 'fas fa-database',
    actions: [
      'set', 'increment', 'decrement',
      'list_push', 'list_remove', 'set_map', 'delete_map',
    ],
  },
  {
    name: 'DATABASE',
    icon: 'fas fa-table',
    actions: ['db_insert', 'db_update', 'db_delete', 'db_query'],
  },
  {
    name: 'FLOW',
    icon: 'fas fa-diagram-project',
    actions: [
      'call_flow', 'abort', 'return', 'wait', 'log', 'emit',
      'flow_if', 'flow_switch', 'flow_while', 'parallel', 'batch', 'repeat', 'try',
    ],
  },
  {
    name: 'VOICE',
    icon: 'fas fa-microphone',
    actions: [
      'voice_join', 'voice_leave', 'voice_play', 'voice_pause',
      'voice_resume', 'voice_stop', 'voice_skip', 'voice_seek',
      'voice_volume', 'voice_set_filter', 'voice_search',
      'queue_add', 'queue_remove', 'queue_clear', 'queue_shuffle', 'queue_loop', 'queue_get',
    ],
  },
  {
    name: 'MISC',
    icon: 'fas fa-ellipsis',
    actions: [
      'defer', 'show_modal', 'update_message',
      'pipe_request', 'pipe_send', 'webhook_send',
      'create_timer', 'cancel_timer',
      'counter_increment', 'record_metric', 'canvas_render',
    ],
  },
];

const sectionItems = computed(() => {
  switch (props.section) {
    case 'commands':
      return schemaStore.spec.commands || [];
    case 'events':
      return schemaStore.spec.events || [];
    case 'flows':
      return schemaStore.spec.flows || [];
    default:
      return [];
  }
});

const sectionLabel = computed(() => {
  switch (props.section) {
    case 'commands':
      return { singular: 'Command', plural: 'Commands', icon: 'fas fa-terminal' };
    case 'events':
      return { singular: 'Event Handler', plural: 'Event Handlers', icon: 'fas fa-bolt' };
    case 'flows':
      return { singular: 'Flow', plural: 'Flows', icon: 'fas fa-diagram-project' };
    default:
      return { singular: 'Item', plural: 'Items', icon: 'fas fa-cube' };
  }
});

const addItem = () => {
  const items = [...sectionItems.value];

  if (props.section === 'commands') {
    items.push({
      name: `command_${items.length + 1}`,
      description: 'New command',
      actions: [],
    });
    schemaStore.updateSection('commands', items as never);
  } else if (props.section === 'events') {
    items.push({
      event: 'message_create',
      actions: [],
    } as never);
    schemaStore.updateSection('events', items as never);
  } else if (props.section === 'flows') {
    items.push({
      name: `flow_${items.length + 1}`,
      actions: [],
    });
    schemaStore.updateSection('flows', items as never);
  }

  editingItem.value = items.length - 1;
};

const removeItem = (index: number) => {
  const items = [...sectionItems.value];
  items.splice(index, 1);
  schemaStore.updateSection(props.section as 'commands' | 'events' | 'flows', items as never);
  if (editingItem.value === index) {
    editingItem.value = null;
  }
};

const updateItem = (index: number, key: string, value: unknown) => {
  const items = [...sectionItems.value] as Record<string, unknown>[];
  items[index] = { ...items[index], [key]: value };
  schemaStore.updateSection(props.section as 'commands' | 'events' | 'flows', items as never);
};

const addAction = (actionType: string) => {
  if (editingItem.value === null) return;

  const items = [...sectionItems.value] as Record<string, unknown>[];
  const item = items[editingItem.value];
  const actions = [...((item.actions as unknown[]) || [])];

  actions.push({ action: actionType });
  items[editingItem.value] = { ...item, actions };

  schemaStore.updateSection(props.section as 'commands' | 'events' | 'flows', items as never);
  showActionPicker.value = false;
};

const removeAction = (actionIndex: number) => {
  if (editingItem.value === null) return;

  const items = [...sectionItems.value] as Record<string, unknown>[];
  const item = items[editingItem.value];
  const actions = [...((item.actions as unknown[]) || [])];

  actions.splice(actionIndex, 1);
  items[editingItem.value] = { ...item, actions };

  schemaStore.updateSection(props.section as 'commands' | 'events' | 'flows', items as never);
};

// Drag and drop handlers
const onDragStart = (index: number, event: DragEvent) => {
  draggedActionIndex.value = index;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  }
};

const onDragOver = (index: number, event: DragEvent) => {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
  dragOverIndex.value = index;
};

const onDragLeave = () => {
  dragOverIndex.value = null;
};

const onDrop = (targetIndex: number, event: DragEvent) => {
  event.preventDefault();

  if (editingItem.value === null || draggedActionIndex.value === null) return;
  if (draggedActionIndex.value === targetIndex) {
    draggedActionIndex.value = null;
    dragOverIndex.value = null;
    return;
  }

  const items = [...sectionItems.value] as Record<string, unknown>[];
  const item = items[editingItem.value];
  const actions = [...((item.actions as unknown[]) || [])];

  // Remove from old position and insert at new position
  const [movedAction] = actions.splice(draggedActionIndex.value, 1);
  actions.splice(targetIndex, 0, movedAction);

  items[editingItem.value] = { ...item, actions };
  schemaStore.updateSection(props.section as 'commands' | 'events' | 'flows', items as never);

  draggedActionIndex.value = null;
  dragOverIndex.value = null;
};

const onDragEnd = () => {
  draggedActionIndex.value = null;
  dragOverIndex.value = null;
};

const updateAction = (actionIndex: number, updatedAction: Record<string, unknown>) => {
  if (editingItem.value === null) return;

  const items = [...sectionItems.value] as Record<string, unknown>[];
  const item = items[editingItem.value];
  const actions = [...((item.actions as unknown[]) || [])] as Record<string, unknown>[];

  actions[actionIndex] = updatedAction;
  items[editingItem.value] = { ...item, actions };

  schemaStore.updateSection(props.section as 'commands' | 'events' | 'flows', items as never);
};
</script>

<template>
  <div class="action-builder">
    <!-- Items List -->
    <div class="items-list">
      <div class="items-header">
        <span class="items-count">{{ sectionItems.length }} {{ sectionLabel.plural }}</span>
        <FurlowButton size="sm" icon="fas fa-plus" @click="addItem">
          ADD {{ sectionLabel.singular.toUpperCase() }}
        </FurlowButton>
      </div>

      <div v-if="sectionItems.length === 0" class="empty-list">
        <i :class="sectionLabel.icon"></i>
        <p>No {{ sectionLabel.plural.toLowerCase() }} yet</p>
        <FurlowButton size="sm" variant="secondary" @click="addItem">
          Create your first {{ sectionLabel.singular.toLowerCase() }}
        </FurlowButton>
      </div>

      <div v-else class="items-grid">
        <div
          v-for="(item, index) in sectionItems"
          :key="index"
          :class="['item-card', { active: editingItem === index }]"
          @click="editingItem = index"
        >
          <div class="item-header">
            <span class="item-name">
              {{ (item as Record<string, unknown>).name || (item as Record<string, unknown>).event || `Item ${index + 1}` }}
            </span>
            <button class="remove-btn" @click.stop="removeItem(index)">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="item-meta">
            <span class="action-count">
              {{ ((item as Record<string, unknown>).actions as unknown[])?.length || 0 }} actions
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Item Editor -->
    <div v-if="editingItem !== null" class="item-editor">
      <div class="editor-header">
        <h3 class="editor-title">
          EDIT {{ sectionLabel.singular.toUpperCase() }}
        </h3>
      </div>

      <div class="editor-fields">
        <template v-if="section === 'commands'">
          <FurlowInput
            :model-value="(sectionItems[editingItem] as Record<string, unknown>).name as string || ''"
            label="Command Name"
            placeholder="greet"
            @update:model-value="updateItem(editingItem!, 'name', $event)"
          />
          <FurlowInput
            :model-value="(sectionItems[editingItem] as Record<string, unknown>).description as string || ''"
            label="Description"
            placeholder="Greet a user"
            @update:model-value="updateItem(editingItem!, 'description', $event)"
          />
          <CommandOptionEditor
            :options="((sectionItems[editingItem] as Record<string, unknown>).options as any) || []"
            @update="updateItem(editingItem!, 'options', $event)"
          />
        </template>

        <template v-else-if="section === 'events'">
          <div class="input-group">
            <label class="input-label">Event Type</label>
            <select
              class="select"
              :value="(sectionItems[editingItem] as Record<string, unknown>).event as string || ''"
              @change="updateItem(editingItem!, 'event', ($event.target as HTMLSelectElement).value)"
            >
              <option value="message_create">message_create</option>
              <option value="member_join">member_join</option>
              <option value="member_leave">member_leave</option>
              <option value="reaction_add">reaction_add</option>
              <option value="reaction_remove">reaction_remove</option>
              <option value="interaction_create">interaction_create</option>
              <option value="voice_state_update">voice_state_update</option>
              <option value="channel_create">channel_create</option>
              <option value="channel_delete">channel_delete</option>
              <option value="role_create">role_create</option>
              <option value="role_delete">role_delete</option>
              <option value="thread_create">thread_create</option>
              <option value="scheduled_event">scheduled_event</option>
            </select>
          </div>
          <div class="input-group">
            <label class="input-label">
              Condition (when)
              <span class="field-type-badge">expr</span>
            </label>
            <input
              type="text"
              class="input"
              :value="(sectionItems[editingItem] as Record<string, unknown>).when as string || ''"
              placeholder="e.g. message.content | startsWith('!')"
              @input="updateItem(editingItem!, 'when', ($event.target as HTMLInputElement).value || undefined)"
            />
            <span class="input-hint">Optional expression to filter when this handler runs</span>
          </div>
          <div class="input-group">
            <label class="input-label">Debounce</label>
            <input
              type="text"
              class="input"
              :value="(sectionItems[editingItem] as Record<string, unknown>).debounce as string || ''"
              placeholder="e.g. 5s, 1m"
              @input="updateItem(editingItem!, 'debounce', ($event.target as HTMLInputElement).value || undefined)"
            />
          </div>
          <div class="input-group">
            <label class="input-label">Throttle</label>
            <input
              type="text"
              class="input"
              :value="(sectionItems[editingItem] as Record<string, unknown>).throttle as string || ''"
              placeholder="e.g. 10s, 1m"
              @input="updateItem(editingItem!, 'throttle', ($event.target as HTMLInputElement).value || undefined)"
            />
          </div>
        </template>

        <template v-else-if="section === 'flows'">
          <FurlowInput
            :model-value="(sectionItems[editingItem] as Record<string, unknown>).name as string || ''"
            label="Flow Name"
            placeholder="welcome_flow"
            @update:model-value="updateItem(editingItem!, 'name', $event)"
          />
          <FurlowInput
            :model-value="(sectionItems[editingItem] as Record<string, unknown>).description as string || ''"
            label="Description"
            placeholder="Handles new member welcome messages"
            @update:model-value="updateItem(editingItem!, 'description', $event)"
          />
          <div class="input-group">
            <label class="input-label">
              Condition (when)
              <span class="field-type-badge">expr</span>
            </label>
            <input
              type="text"
              class="input"
              :value="(sectionItems[editingItem] as Record<string, unknown>).when as string || ''"
              placeholder="e.g. guild.memberCount > 100"
              @input="updateItem(editingItem!, 'when', ($event.target as HTMLInputElement).value || undefined)"
            />
            <span class="input-hint">Optional condition for when this flow can be called</span>
          </div>
        </template>
      </div>

      <!-- Actions List -->
      <div class="actions-section">
        <div class="actions-header">
          <span class="actions-title">ACTIONS</span>
          <FurlowButton size="sm" icon="fas fa-plus" @click="showActionPicker = true">
            ADD ACTION
          </FurlowButton>
        </div>

        <div class="actions-list">
          <div
            v-for="(action, aIndex) in (sectionItems[editingItem] as Record<string, unknown>).actions as unknown[] || []"
            :key="aIndex"
            :class="[
              'action-wrapper',
              { dragging: draggedActionIndex === aIndex },
              { 'drag-over': dragOverIndex === aIndex && draggedActionIndex !== aIndex }
            ]"
            draggable="true"
            @dragstart="onDragStart(aIndex, $event)"
            @dragover="onDragOver(aIndex, $event)"
            @dragleave="onDragLeave"
            @drop="onDrop(aIndex, $event)"
            @dragend="onDragEnd"
          >
            <ActionCard
              :action="action as Record<string, unknown>"
              :index="aIndex"
              @update="updateAction"
              @remove="removeAction"
            />
          </div>

          <div v-if="!((sectionItems[editingItem] as Record<string, unknown>).actions as unknown[])?.length" class="empty-actions">
            <p>No actions added yet</p>
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
            <div class="category-header">
              <i :class="category.icon"></i>
              {{ category.name }}
            </div>
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
.action-builder {
  display: flex;
  flex-direction: column;
  gap: var(--sp-xl);
}

.items-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-md);
}

.items-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.items-count {
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
}

.items-grid {
  display: flex;
  flex-direction: column;
  gap: var(--sp-sm);
}

.item-card {
  background: var(--bg-raised);
  border: var(--border-solid);
  padding: var(--sp-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.item-card:hover {
  border-color: var(--border-mid);
}

.item-card.active {
  border-color: var(--accent);
  background: var(--accent-faint);
}

.item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.item-name {
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

.item-meta {
  margin-top: var(--sp-xs);
}

.action-count {
  font-size: 11px;
  color: var(--text-ghost);
}

.item-editor {
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

.action-wrapper {
  cursor: grab;
  transition: all var(--transition-fast);
}

.action-wrapper:active {
  cursor: grabbing;
}

.action-wrapper.dragging {
  opacity: 0.5;
}

.action-wrapper.dragging :deep(.action-card-main) {
  border-style: dashed;
}

.action-wrapper.drag-over :deep(.action-card-main) {
  border-color: var(--accent);
  background: var(--accent-faint);
}


.empty-actions {
  padding: var(--sp-lg);
  text-align: center;
  border: 1px dashed var(--border-mid);
}

.empty-actions p {
  color: var(--text-ghost);
  font-size: 12px;
  margin: 0;
}

/* Action Picker Modal */
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
  max-width: 600px;
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
  display: flex;
  align-items: center;
  gap: var(--sp-sm);
}

.category-header i {
  color: var(--accent-dim);
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

.input {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text-bright);
  background: var(--bg);
  border: var(--border-solid);
  padding: var(--sp-sm) var(--sp-md);
  width: 100%;
}

.input:hover {
  border-color: var(--border-mid);
}

.input:focus {
  outline: none;
  border-color: var(--accent);
  background: var(--bg-raised);
}

.input::placeholder {
  color: var(--text-ghost);
}

.input-hint {
  font-size: 10px;
  color: var(--text-ghost);
}

/* Mobile responsive styles */
@media (max-width: 768px) {
  .action-builder {
    gap: var(--sp-lg);
  }

  .items-header {
    flex-wrap: wrap;
    gap: var(--sp-sm);
  }

  .item-editor {
    padding: var(--sp-md);
  }

  .editor-fields {
    gap: var(--sp-sm);
  }

  .actions-header {
    flex-wrap: wrap;
    gap: var(--sp-sm);
  }

  /* Action picker modal - full screen on mobile */
  .action-picker {
    width: 100%;
    max-width: 100%;
    max-height: 100vh;
    height: 100vh;
  }

  .picker-header {
    padding: var(--sp-sm) var(--sp-md);
  }

  .picker-body {
    padding: var(--sp-md);
  }

  .category-actions {
    gap: var(--sp-2xs);
  }

  .action-option {
    font-size: 10px;
    padding: var(--sp-xs) var(--sp-sm);
  }
}

@media (max-width: 480px) {
  .items-count {
    font-size: 11px;
  }

  .item-card {
    padding: var(--sp-sm);
  }

  .item-name {
    font-size: 12px;
  }

  .editor-title {
    font-size: 12px;
  }

  .actions-title {
    font-size: 10px;
  }

  .action-option {
    font-size: 9px;
    padding: var(--sp-2xs) var(--sp-xs);
  }

  .category-header {
    font-size: 10px;
  }

  .empty-list {
    padding: var(--sp-lg);
  }

  .empty-list i {
    font-size: 24px;
  }
}
</style>
