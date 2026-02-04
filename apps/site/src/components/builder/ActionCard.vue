<script setup lang="ts">
import { ref, computed } from 'vue';
import FurlowButton from '@/components/common/FurlowButton.vue';
import FurlowInput from '@/components/common/FurlowInput.vue';
import { getActionDefinition, type ActionField } from '@/data/action-schemas';

interface Props {
  action: Record<string, unknown>;
  index: number;
  depth?: number;
}

interface Emits {
  (e: 'update', index: number, action: Record<string, unknown>): void;
  (e: 'remove', index: number): void;
  (e: 'add-nested', index: number, key: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  depth: 0,
});

const emit = defineEmits<Emits>();

const isExpanded = ref(false);

// Actions that have nested action arrays
const nestedActionTypes: Record<string, string[]> = {
  flow_if: ['then', 'else'],
  flow_switch: ['cases', 'default'],
  flow_while: ['actions'],
  parallel: ['actions'],
  batch: ['actions'],
  repeat: ['actions'],
  try: ['actions', 'catch', 'finally'],
};

const actionType = computed(() => props.action.action as string);

const actionDefinition = computed(() => getActionDefinition(actionType.value));

// Get fields that are not action arrays (those are handled separately)
const editableFields = computed(() => {
  if (!actionDefinition.value) return [];
  return actionDefinition.value.fields.filter(f => f.type !== 'actions');
});

const hasNestedActions = computed(() => {
  return actionType.value in nestedActionTypes;
});

const nestedKeys = computed(() => {
  return nestedActionTypes[actionType.value] || [];
});

const getNestedActions = (key: string): unknown[] => {
  const nested = props.action[key];
  if (Array.isArray(nested)) return nested;
  return [];
};

const updateField = (fieldName: string, value: unknown) => {
  const updatedAction = { ...props.action, [fieldName]: value };
  // Remove empty/undefined values
  if (value === '' || value === undefined || value === null) {
    delete updatedAction[fieldName];
  }
  emit('update', props.index, updatedAction);
};

const getFieldValue = (field: ActionField): unknown => {
  return props.action[field.name] ?? field.default ?? '';
};

const updateNestedAction = (key: string, nestedIndex: number, updatedAction: Record<string, unknown>) => {
  const nested = [...getNestedActions(key)] as Record<string, unknown>[];
  nested[nestedIndex] = updatedAction;
  emit('update', props.index, { ...props.action, [key]: nested });
};

const removeNestedAction = (key: string, nestedIndex: number) => {
  const nested = [...getNestedActions(key)] as Record<string, unknown>[];
  nested.splice(nestedIndex, 1);
  emit('update', props.index, { ...props.action, [key]: nested });
};

const addNestedAction = (key: string, actionType: string) => {
  const nested = [...getNestedActions(key)] as Record<string, unknown>[];
  nested.push({ action: actionType });
  emit('update', props.index, { ...props.action, [key]: nested });
};

// Simple action picker for nested actions
const showNestedPicker = ref<string | null>(null);
const quickActions = [
  'reply', 'send_message', 'set', 'log', 'wait',
  'assign_role', 'remove_role', 'flow_if', 'call_flow'
];

const getNestedLabel = (key: string): string => {
  const labels: Record<string, string> = {
    then: 'THEN',
    else: 'ELSE',
    actions: 'ACTIONS',
    catch: 'CATCH',
    finally: 'FINALLY',
    cases: 'CASES',
    default: 'DEFAULT',
  };
  return labels[key] || key.toUpperCase();
};

// Get preview text for the action
const getPreviewText = computed(() => {
  // Check common fields for a preview
  const content = props.action.content;
  const message = props.action.message;
  const variable = props.action.var;
  const flow = props.action.flow;
  const duration = props.action.duration;
  const condition = props.action.condition;

  if (content) return truncate(String(content), 40);
  if (message) return truncate(String(message), 40);
  if (variable) return `var: ${variable}`;
  if (flow) return `flow: ${flow}`;
  if (condition) return truncate(`if: ${condition}`, 40);
  if (duration) return `${duration}`;

  return null;
});

const truncate = (str: string, len: number): string => {
  return str.length > len ? str.slice(0, len) + '...' : str;
};
</script>

<template>
  <div :class="['action-card-wrapper', `depth-${depth}`]">
    <div class="action-card-main">
      <div class="action-drag-handle" v-if="depth === 0">
        <i class="fas fa-grip-vertical"></i>
      </div>

      <div class="action-content" @click="isExpanded = !isExpanded">
        <div class="action-type">
          <i class="fas fa-bolt"></i>
          <span class="action-name">{{ actionType }}</span>
          <span class="expand-indicator">
            <i :class="isExpanded ? 'fas fa-chevron-down' : 'fas fa-chevron-right'"></i>
          </span>
        </div>

        <!-- Show preview for collapsed actions -->
        <div v-if="!isExpanded && getPreviewText" class="action-preview">
          {{ getPreviewText }}
        </div>
      </div>

      <button class="action-remove" @click.stop="emit('remove', index)">
        <i class="fas fa-trash"></i>
      </button>
    </div>

    <!-- Expanded Fields Section -->
    <div v-if="isExpanded" class="action-fields">
      <!-- Show action description -->
      <div v-if="actionDefinition?.description" class="action-description">
        {{ actionDefinition.description }}
      </div>

      <!-- Editable fields -->
      <div v-if="editableFields.length > 0" class="fields-grid">
        <template v-for="field in editableFields" :key="field.name">
          <!-- String input -->
          <FurlowInput
            v-if="field.type === 'string'"
            :model-value="String(getFieldValue(field) || '')"
            :label="field.label"
            :placeholder="field.description"
            :required="field.required"
            @update:model-value="updateField(field.name, $event)"
          />

          <!-- Number input -->
          <FurlowInput
            v-else-if="field.type === 'number'"
            type="number"
            :model-value="Number(getFieldValue(field)) || 0"
            :label="field.label"
            :placeholder="field.description"
            :required="field.required"
            @update:model-value="updateField(field.name, $event)"
          />

          <!-- Expression/Duration input (treat as string for now) -->
          <div v-else-if="field.type === 'expression' || field.type === 'duration' || field.type === 'color'" class="input-group">
            <label class="input-label">
              {{ field.label }}
              <span v-if="field.required" class="required-mark">*</span>
              <span v-if="field.type === 'expression'" class="field-type-badge">expr</span>
              <span v-else-if="field.type === 'duration'" class="field-type-badge">duration</span>
              <span v-else-if="field.type === 'color'" class="field-type-badge">color</span>
            </label>
            <input
              type="text"
              class="input"
              :value="getFieldValue(field)"
              :placeholder="field.description || (field.type === 'expression' ? 'e.g. user.id' : field.type === 'duration' ? 'e.g. 5m, 1h' : '#ff6b35')"
              @input="updateField(field.name, ($event.target as HTMLInputElement).value)"
            />
          </div>

          <!-- Boolean checkbox -->
          <div v-else-if="field.type === 'boolean'" class="checkbox-group">
            <label class="checkbox">
              <input
                type="checkbox"
                :checked="Boolean(getFieldValue(field))"
                @change="updateField(field.name, ($event.target as HTMLInputElement).checked)"
              />
              <span class="checkbox-label">{{ field.label }}</span>
            </label>
          </div>

          <!-- Select dropdown -->
          <div v-else-if="field.type === 'select'" class="input-group">
            <label class="input-label">
              {{ field.label }}
              <span v-if="field.required" class="required-mark">*</span>
            </label>
            <select
              class="select"
              :value="getFieldValue(field)"
              @change="updateField(field.name, ($event.target as HTMLSelectElement).value)"
            >
              <option value="">Select...</option>
              <option
                v-for="opt in field.options"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
          </div>
        </template>
      </div>

      <div v-else-if="!hasNestedActions" class="no-fields">
        No configurable fields
      </div>

      <!-- Nested actions (flow_if, batch, etc.) -->
      <div v-if="hasNestedActions" class="nested-sections">
        <div v-for="key in nestedKeys" :key="key" class="nested-section">
          <div class="nested-header">
            <span class="nested-label">{{ getNestedLabel(key) }}</span>
            <span class="nested-count">{{ getNestedActions(key).length }}</span>
          </div>

          <div class="nested-actions">
            <ActionCard
              v-for="(nestedAction, nIndex) in getNestedActions(key)"
              :key="nIndex"
              :action="nestedAction as Record<string, unknown>"
              :index="nIndex"
              :depth="depth + 1"
              @update="(_, updated) => updateNestedAction(key, nIndex, updated)"
              @remove="() => removeNestedAction(key, nIndex)"
            />

            <div v-if="getNestedActions(key).length === 0" class="empty-nested">
              No actions
            </div>
          </div>

          <div class="nested-add">
            <FurlowButton
              v-if="showNestedPicker !== key"
              size="sm"
              variant="ghost"
              icon="fas fa-plus"
              @click="showNestedPicker = key"
            >
              Add
            </FurlowButton>

            <div v-else class="quick-action-picker">
              <button
                v-for="qAction in quickActions"
                :key="qAction"
                class="quick-action-btn"
                @click="addNestedAction(key, qAction); showNestedPicker = null"
              >
                {{ qAction }}
              </button>
              <button class="quick-action-cancel" @click="showNestedPicker = null">
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.action-card-wrapper {
  border-left: 2px solid var(--border-dim);
}

.action-card-wrapper.depth-0 {
  border-left: none;
}

.action-card-main {
  display: flex;
  align-items: center;
  gap: var(--sp-sm);
  background: var(--bg);
  border: var(--border-solid);
  padding: var(--sp-sm) var(--sp-md);
  transition: all var(--transition-fast);
}

.depth-1 .action-card-main {
  background: var(--bg-raised);
  margin-left: var(--sp-md);
}

.depth-2 .action-card-main {
  background: var(--bg-panel);
  margin-left: var(--sp-lg);
}

.action-drag-handle {
  color: var(--text-ghost);
  font-size: 12px;
  cursor: grab;
  padding: 0 var(--sp-xs);
}

.action-drag-handle:hover {
  color: var(--text-dim);
}

.action-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  cursor: pointer;
}

.action-type {
  display: flex;
  align-items: center;
  gap: var(--sp-sm);
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--accent);
}

.action-type i {
  font-size: 10px;
}

.action-name {
  font-weight: 600;
}

.expand-indicator {
  color: var(--text-ghost);
  font-size: 10px;
  margin-left: auto;
}

.action-preview {
  font-size: 11px;
  color: var(--text-dim);
  font-family: var(--font-mono);
}

.action-remove {
  background: none;
  border: none;
  color: var(--text-ghost);
  cursor: pointer;
  font-size: 11px;
  padding: var(--sp-xs);
}

.action-remove:hover {
  color: var(--red);
}

/* Fields Section */
.action-fields {
  background: var(--bg-raised);
  border: var(--border-solid);
  border-top: none;
  padding: var(--sp-md);
}

.depth-1 .action-fields {
  margin-left: var(--sp-md);
}

.depth-2 .action-fields {
  margin-left: var(--sp-lg);
}

.action-description {
  font-size: 11px;
  color: var(--text-dim);
  margin-bottom: var(--sp-md);
  padding-bottom: var(--sp-sm);
  border-bottom: var(--border-dashed);
}

.fields-grid {
  display: flex;
  flex-direction: column;
  gap: var(--sp-md);
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: var(--sp-xs);
}

.input-label {
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 700;
  color: var(--text-ghost);
  letter-spacing: 1.5px;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: var(--sp-xs);
}

.required-mark {
  color: var(--accent);
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
  font-size: 12px;
  color: var(--text-bright);
  background: var(--bg);
  border: var(--border-solid);
  padding: var(--sp-xs) var(--sp-sm);
  width: 100%;
}

.input:focus {
  outline: none;
  border-color: var(--accent);
}

.checkbox-group {
  display: flex;
  align-items: center;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: var(--sp-sm);
  cursor: pointer;
}

.checkbox input {
  appearance: none;
  width: 14px;
  height: 14px;
  background: var(--bg);
  border: var(--border-solid);
  cursor: pointer;
  position: relative;
}

.checkbox input:checked {
  background: var(--accent);
  border-color: var(--accent);
}

.checkbox input:checked::after {
  content: '\f00c';
  font-family: 'Font Awesome 6 Free';
  font-weight: 900;
  font-size: 8px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--bg);
}

.checkbox-label {
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 500;
  color: var(--text);
  letter-spacing: 1px;
}

.no-fields {
  font-size: 11px;
  color: var(--text-ghost);
  font-style: italic;
}

/* Nested Sections */
.nested-sections {
  margin-top: var(--sp-md);
  padding-top: var(--sp-md);
  border-top: var(--border-dashed);
}

.nested-section {
  margin-bottom: var(--sp-md);
}

.nested-section:last-child {
  margin-bottom: 0;
}

.nested-header {
  display: flex;
  align-items: center;
  gap: var(--sp-sm);
  margin-bottom: var(--sp-xs);
}

.nested-label {
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 700;
  color: var(--accent-dim);
  letter-spacing: 1.5px;
}

.nested-count {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-ghost);
}

.nested-actions {
  display: flex;
  flex-direction: column;
  gap: var(--sp-xs);
  padding-left: var(--sp-md);
  border-left: 2px dashed var(--accent-dim);
}

.empty-nested {
  font-size: 11px;
  color: var(--text-ghost);
  padding: var(--sp-sm);
  border: 1px dashed var(--border-dim);
  text-align: center;
}

.nested-add {
  margin-top: var(--sp-xs);
  margin-left: var(--sp-md);
}

.quick-action-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: var(--sp-xs);
  background: var(--bg-panel);
  border: var(--border-solid);
}

.quick-action-btn {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-dim);
  background: var(--bg);
  border: var(--border-solid);
  padding: 2px 6px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.quick-action-btn:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.quick-action-cancel {
  background: none;
  border: none;
  color: var(--text-ghost);
  cursor: pointer;
  padding: 2px 6px;
}

.quick-action-cancel:hover {
  color: var(--red);
}

/* Mobile responsive styles */
@media (max-width: 768px) {
  .action-card-main {
    padding: var(--sp-xs) var(--sp-sm);
  }

  .action-type {
    font-size: 11px;
  }

  .action-preview {
    font-size: 10px;
  }

  .action-fields {
    padding: var(--sp-sm);
  }

  .fields-grid {
    gap: var(--sp-sm);
  }

  .input-label {
    font-size: 9px;
  }

  .input {
    font-size: 11px;
    padding: var(--sp-xs);
  }

  .checkbox-label {
    font-size: 10px;
  }

  .nested-actions {
    padding-left: var(--sp-sm);
  }

  .depth-1 .action-card-main {
    margin-left: var(--sp-sm);
  }

  .depth-1 .action-fields {
    margin-left: var(--sp-sm);
  }

  .depth-2 .action-card-main {
    margin-left: var(--sp-md);
  }

  .depth-2 .action-fields {
    margin-left: var(--sp-md);
  }

  .quick-action-picker {
    padding: var(--sp-2xs);
    gap: 2px;
  }

  .quick-action-btn {
    font-size: 9px;
    padding: 1px 4px;
  }
}

@media (max-width: 480px) {
  .action-drag-handle {
    display: none;
  }

  .action-content {
    min-width: 0;
  }

  .action-name {
    word-break: break-all;
  }

  .action-preview {
    word-break: break-word;
  }
}
</style>
