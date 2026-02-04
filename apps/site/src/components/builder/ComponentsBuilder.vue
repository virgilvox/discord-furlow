<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSchemaStore } from '@/stores/schema';
import FurlowButton from '@/components/common/FurlowButton.vue';
import FurlowInput from '@/components/common/FurlowInput.vue';
import ActionCard from './ActionCard.vue';

const schemaStore = useSchemaStore();

const showActionPicker = ref(false);
const editingComponent = ref<number | null>(null);

const components = computed(() => {
  return (schemaStore.spec.components as Record<string, unknown>[] | undefined) || [];
});

const componentTypes = [
  { value: 'button', label: 'Button', icon: 'fas fa-square' },
  { value: 'select', label: 'Select Menu', icon: 'fas fa-caret-down' },
  { value: 'modal', label: 'Modal', icon: 'fas fa-window-restore' },
];

const buttonStyles = [
  { value: 'primary', label: 'Primary (Blurple)', color: '#5865f2' },
  { value: 'secondary', label: 'Secondary (Gray)', color: '#4f545c' },
  { value: 'success', label: 'Success (Green)', color: '#3ba55c' },
  { value: 'danger', label: 'Danger (Red)', color: '#ed4245' },
  { value: 'link', label: 'Link', color: '#4f545c' },
];

const addComponent = (type: string) => {
  const comps = [...components.value];
  const newComp: Record<string, unknown> = {
    custom_id: `${type}_${comps.length + 1}`,
    type,
    actions: [],
  };

  if (type === 'button') {
    newComp.style = 'primary';
    newComp.label = 'Click Me';
  } else if (type === 'select') {
    newComp.placeholder = 'Select an option...';
    newComp.options = [];
  } else if (type === 'modal') {
    newComp.title = 'Modal Title';
    newComp.components = [];
  }

  comps.push(newComp);
  schemaStore.updateSection('components' as never, comps as never);
  editingComponent.value = comps.length - 1;
};

const removeComponent = (index: number) => {
  const comps = [...components.value];
  comps.splice(index, 1);
  schemaStore.updateSection('components' as never, comps.length > 0 ? comps as never : undefined as never);
  if (editingComponent.value === index) {
    editingComponent.value = null;
  }
};

const updateComponent = (index: number, key: string, value: unknown) => {
  const comps = [...components.value];
  comps[index] = { ...comps[index], [key]: value === '' ? undefined : value };
  schemaStore.updateSection('components' as never, comps as never);
};

// Select menu options management
const addSelectOption = () => {
  if (editingComponent.value === null) return;
  const comps = [...components.value];
  const comp = comps[editingComponent.value];
  const options = [...((comp.options as Record<string, unknown>[]) || [])];
  options.push({
    label: `Option ${options.length + 1}`,
    value: `option_${options.length + 1}`,
  });
  comps[editingComponent.value] = { ...comp, options };
  schemaStore.updateSection('components' as never, comps as never);
};

const updateSelectOption = (optIndex: number, key: string, value: string) => {
  if (editingComponent.value === null) return;
  const comps = [...components.value];
  const comp = comps[editingComponent.value];
  const options = [...((comp.options as Record<string, unknown>[]) || [])] as Record<string, unknown>[];
  options[optIndex] = { ...options[optIndex], [key]: value };
  comps[editingComponent.value] = { ...comp, options };
  schemaStore.updateSection('components' as never, comps as never);
};

const removeSelectOption = (optIndex: number) => {
  if (editingComponent.value === null) return;
  const comps = [...components.value];
  const comp = comps[editingComponent.value];
  const options = [...((comp.options as Record<string, unknown>[]) || [])];
  options.splice(optIndex, 1);
  comps[editingComponent.value] = { ...comp, options };
  schemaStore.updateSection('components' as never, comps as never);
};

// Modal text input fields management
const addModalField = () => {
  if (editingComponent.value === null) return;
  const comps = [...components.value];
  const comp = comps[editingComponent.value];
  const fields = [...((comp.components as Record<string, unknown>[]) || [])];
  fields.push({
    custom_id: `field_${fields.length + 1}`,
    label: `Field ${fields.length + 1}`,
    style: 'short',
  });
  comps[editingComponent.value] = { ...comp, components: fields };
  schemaStore.updateSection('components' as never, comps as never);
};

const updateModalField = (fieldIndex: number, key: string, value: unknown) => {
  if (editingComponent.value === null) return;
  const comps = [...components.value];
  const comp = comps[editingComponent.value];
  const fields = [...((comp.components as Record<string, unknown>[]) || [])] as Record<string, unknown>[];
  fields[fieldIndex] = { ...fields[fieldIndex], [key]: value === '' ? undefined : value };
  comps[editingComponent.value] = { ...comp, components: fields };
  schemaStore.updateSection('components' as never, comps as never);
};

const removeModalField = (fieldIndex: number) => {
  if (editingComponent.value === null) return;
  const comps = [...components.value];
  const comp = comps[editingComponent.value];
  const fields = [...((comp.components as Record<string, unknown>[]) || [])];
  fields.splice(fieldIndex, 1);
  comps[editingComponent.value] = { ...comp, components: fields };
  schemaStore.updateSection('components' as never, comps as never);
};

// Actions for component handlers
const addAction = (actionType: string) => {
  if (editingComponent.value === null) return;

  const comps = [...components.value];
  const comp = comps[editingComponent.value];
  const actions = [...((comp.actions as unknown[]) || [])];

  actions.push({ action: actionType });
  comps[editingComponent.value] = { ...comp, actions };

  schemaStore.updateSection('components' as never, comps as never);
  showActionPicker.value = false;
};

const removeAction = (actionIndex: number) => {
  if (editingComponent.value === null) return;

  const comps = [...components.value];
  const comp = comps[editingComponent.value];
  const actions = [...((comp.actions as unknown[]) || [])];

  actions.splice(actionIndex, 1);
  comps[editingComponent.value] = { ...comp, actions };

  schemaStore.updateSection('components' as never, comps as never);
};

const updateAction = (actionIndex: number, updatedAction: Record<string, unknown>) => {
  if (editingComponent.value === null) return;

  const comps = [...components.value];
  const comp = comps[editingComponent.value];
  const actions = [...((comp.actions as unknown[]) || [])] as Record<string, unknown>[];

  actions[actionIndex] = updatedAction;
  comps[editingComponent.value] = { ...comp, actions };

  schemaStore.updateSection('components' as never, comps as never);
};

const actionCategories = [
  { name: 'MESSAGE', actions: ['reply', 'send_message', 'update_message', 'defer'] },
  { name: 'MEMBER', actions: ['assign_role', 'remove_role', 'toggle_role'] },
  { name: 'STATE', actions: ['set', 'increment', 'decrement'] },
  { name: 'FLOW', actions: ['call_flow', 'flow_if', 'log', 'show_modal'] },
];

const getComponentIcon = (type: string) => {
  return componentTypes.find(t => t.value === type)?.icon || 'fas fa-puzzle-piece';
};

const getButtonStyleColor = (style: string) => {
  return buttonStyles.find(s => s.value === style)?.color || '#5865f2';
};
</script>

<template>
  <div class="components-builder">
    <!-- Components List -->
    <div class="components-list">
      <div class="components-header">
        <span class="components-count">{{ components.length }} Components</span>
        <div class="add-buttons">
          <FurlowButton
            v-for="type in componentTypes"
            :key="type.value"
            size="sm"
            variant="secondary"
            :icon="type.icon"
            @click="addComponent(type.value)"
          >
            {{ type.label }}
          </FurlowButton>
        </div>
      </div>

      <div v-if="components.length === 0" class="empty-list">
        <i class="fas fa-puzzle-piece"></i>
        <p>No components defined</p>
        <span>Create reusable buttons, select menus, and modals</span>
      </div>

      <div v-else class="components-grid">
        <div
          v-for="(comp, index) in components"
          :key="index"
          :class="['component-card', { active: editingComponent === index }]"
          @click="editingComponent = index"
        >
          <div class="component-header">
            <div class="component-info">
              <i :class="getComponentIcon(comp.type as string)"></i>
              <span class="component-id">{{ comp.custom_id }}</span>
            </div>
            <button class="remove-btn" @click.stop="removeComponent(index)">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <!-- Preview -->
          <div class="component-preview">
            <!-- Button Preview -->
            <div v-if="comp.type === 'button'" class="button-preview">
              <span
                class="discord-button"
                :style="{ background: getButtonStyleColor(comp.style as string) }"
              >
                <span v-if="comp.emoji" class="btn-emoji">{{ comp.emoji }}</span>
                {{ comp.label || 'Button' }}
              </span>
            </div>

            <!-- Select Preview -->
            <div v-if="comp.type === 'select'" class="select-preview">
              <span class="discord-select">
                {{ comp.placeholder || 'Select...' }}
                <i class="fas fa-chevron-down"></i>
              </span>
            </div>

            <!-- Modal Preview -->
            <div v-if="comp.type === 'modal'" class="modal-preview">
              <i class="fas fa-window-restore"></i>
              {{ comp.title || 'Modal' }}
            </div>
          </div>

          <div class="component-meta">
            <span class="component-type">{{ comp.type }}</span>
            <span class="action-count">{{ ((comp.actions as unknown[]) || []).length }} actions</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Component Editor -->
    <div v-if="editingComponent !== null && components[editingComponent]" class="component-editor">
      <div class="editor-header">
        <h3 class="editor-title">
          EDIT {{ (components[editingComponent].type as string).toUpperCase() }}
        </h3>
      </div>

      <div class="editor-fields">
        <FurlowInput
          :model-value="(components[editingComponent].custom_id as string) || ''"
          label="Custom ID"
          placeholder="my_button"
          hint="Unique identifier for this component"
          @update:model-value="updateComponent(editingComponent!, 'custom_id', $event)"
        />

        <!-- Button-specific fields -->
        <template v-if="components[editingComponent].type === 'button'">
          <FurlowInput
            :model-value="(components[editingComponent].label as string) || ''"
            label="Label"
            placeholder="Click Me"
            hint="Button text"
            @update:model-value="updateComponent(editingComponent!, 'label', $event)"
          />

          <div class="input-group">
            <label class="input-label">Style</label>
            <div class="style-picker">
              <button
                v-for="style in buttonStyles"
                :key="style.value"
                :class="['style-option', { active: components[editingComponent].style === style.value }]"
                :style="{ '--style-color': style.color }"
                @click="updateComponent(editingComponent!, 'style', style.value)"
              >
                {{ style.label }}
              </button>
            </div>
          </div>

          <FurlowInput
            :model-value="(components[editingComponent].emoji as string) || ''"
            label="Emoji"
            placeholder="e.g. :tada: or custom emoji ID"
            hint="Optional emoji before the label"
            @update:model-value="updateComponent(editingComponent!, 'emoji', $event)"
          />

          <FurlowInput
            v-if="components[editingComponent].style === 'link'"
            :model-value="(components[editingComponent].url as string) || ''"
            label="URL"
            placeholder="https://example.com"
            hint="Link destination (for link-style buttons)"
            @update:model-value="updateComponent(editingComponent!, 'url', $event)"
          />

          <div class="checkbox-row">
            <label class="checkbox">
              <input
                type="checkbox"
                :checked="Boolean(components[editingComponent].disabled)"
                @change="updateComponent(editingComponent!, 'disabled', ($event.target as HTMLInputElement).checked)"
              />
              <span>Disabled</span>
            </label>
          </div>
        </template>

        <!-- Select-specific fields -->
        <template v-if="components[editingComponent].type === 'select'">
          <FurlowInput
            :model-value="(components[editingComponent].placeholder as string) || ''"
            label="Placeholder"
            placeholder="Select an option..."
            hint="Placeholder text when nothing is selected"
            @update:model-value="updateComponent(editingComponent!, 'placeholder', $event)"
          />

          <div class="input-group">
            <label class="input-label">Min/Max Values</label>
            <div class="inline-inputs">
              <input
                type="number"
                class="input small"
                :value="components[editingComponent].min_values ?? 1"
                min="0"
                @input="updateComponent(editingComponent!, 'min_values', Number(($event.target as HTMLInputElement).value))"
              />
              <span class="inline-label">to</span>
              <input
                type="number"
                class="input small"
                :value="components[editingComponent].max_values ?? 1"
                min="1"
                @input="updateComponent(editingComponent!, 'max_values', Number(($event.target as HTMLInputElement).value))"
              />
            </div>
          </div>

          <!-- Select Options -->
          <div class="options-section">
            <div class="options-header">
              <span class="options-title">OPTIONS</span>
              <FurlowButton size="sm" icon="fas fa-plus" @click="addSelectOption">
                ADD OPTION
              </FurlowButton>
            </div>

            <div class="options-list">
              <div
                v-for="(opt, optIndex) in (components[editingComponent].options as Record<string, unknown>[]) || []"
                :key="optIndex"
                class="option-item"
              >
                <input
                  type="text"
                  class="input"
                  :value="(opt.label as string) || ''"
                  placeholder="Label"
                  @input="updateSelectOption(optIndex, 'label', ($event.target as HTMLInputElement).value)"
                />
                <input
                  type="text"
                  class="input"
                  :value="(opt.value as string) || ''"
                  placeholder="Value"
                  @input="updateSelectOption(optIndex, 'value', ($event.target as HTMLInputElement).value)"
                />
                <button class="remove-option" @click="removeSelectOption(optIndex)">
                  <i class="fas fa-times"></i>
                </button>
              </div>

              <div v-if="!((components[editingComponent].options as unknown[]) || []).length" class="empty-options">
                No options defined
              </div>
            </div>
          </div>
        </template>

        <!-- Modal-specific fields -->
        <template v-if="components[editingComponent].type === 'modal'">
          <FurlowInput
            :model-value="(components[editingComponent].title as string) || ''"
            label="Title"
            placeholder="My Modal"
            hint="Modal title displayed at the top"
            @update:model-value="updateComponent(editingComponent!, 'title', $event)"
          />

          <!-- Modal Fields -->
          <div class="fields-section">
            <div class="fields-header">
              <span class="fields-title">TEXT INPUTS</span>
              <FurlowButton size="sm" icon="fas fa-plus" @click="addModalField">
                ADD FIELD
              </FurlowButton>
            </div>

            <div class="fields-list">
              <div
                v-for="(field, fieldIndex) in (components[editingComponent].components as Record<string, unknown>[]) || []"
                :key="fieldIndex"
                class="field-item"
              >
                <div class="field-row">
                  <input
                    type="text"
                    class="input"
                    :value="(field.custom_id as string) || ''"
                    placeholder="Custom ID"
                    @input="updateModalField(fieldIndex, 'custom_id', ($event.target as HTMLInputElement).value)"
                  />
                  <select
                    class="select"
                    :value="(field.style as string) || 'short'"
                    @change="updateModalField(fieldIndex, 'style', ($event.target as HTMLSelectElement).value)"
                  >
                    <option value="short">Short</option>
                    <option value="paragraph">Paragraph</option>
                  </select>
                  <button class="remove-field" @click="removeModalField(fieldIndex)">
                    <i class="fas fa-times"></i>
                  </button>
                </div>
                <input
                  type="text"
                  class="input"
                  :value="(field.label as string) || ''"
                  placeholder="Label"
                  @input="updateModalField(fieldIndex, 'label', ($event.target as HTMLInputElement).value)"
                />
                <input
                  type="text"
                  class="input"
                  :value="(field.placeholder as string) || ''"
                  placeholder="Placeholder (optional)"
                  @input="updateModalField(fieldIndex, 'placeholder', ($event.target as HTMLInputElement).value)"
                />
                <div class="field-options">
                  <label class="checkbox small">
                    <input
                      type="checkbox"
                      :checked="Boolean(field.required)"
                      @change="updateModalField(fieldIndex, 'required', ($event.target as HTMLInputElement).checked)"
                    />
                    <span>Required</span>
                  </label>
                </div>
              </div>

              <div v-if="!((components[editingComponent].components as unknown[]) || []).length" class="empty-fields">
                No text inputs defined
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Actions Section (not for link buttons) -->
      <div
        v-if="!(components[editingComponent].type === 'button' && components[editingComponent].style === 'link')"
        class="actions-section"
      >
        <div class="actions-header">
          <span class="actions-title">ACTIONS</span>
          <FurlowButton size="sm" icon="fas fa-plus" @click="showActionPicker = true">
            ADD ACTION
          </FurlowButton>
        </div>

        <div class="actions-list">
          <ActionCard
            v-for="(action, aIndex) in (components[editingComponent].actions as unknown[]) || []"
            :key="aIndex"
            :action="action as Record<string, unknown>"
            :index="aIndex"
            @update="updateAction"
            @remove="removeAction"
          />

          <div v-if="!((components[editingComponent].actions as unknown[]) || []).length" class="empty-actions">
            <p>No actions added</p>
            <span>Actions run when a user interacts with this component</span>
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
.components-builder {
  display: flex;
  flex-direction: column;
  gap: var(--sp-xl);
}

.components-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-md);
}

.components-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: var(--sp-sm);
}

.components-count {
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-dim);
  letter-spacing: 1px;
  text-transform: uppercase;
}

.add-buttons {
  display: flex;
  gap: var(--sp-xs);
  flex-wrap: wrap;
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

.components-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--sp-sm);
}

.component-card {
  background: var(--bg-raised);
  border: var(--border-solid);
  padding: var(--sp-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.component-card:hover {
  border-color: var(--border-mid);
}

.component-card.active {
  border-color: var(--accent);
  background: var(--accent-faint);
}

.component-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sp-sm);
}

.component-info {
  display: flex;
  align-items: center;
  gap: var(--sp-sm);
}

.component-info i {
  color: var(--accent-dim);
  font-size: 12px;
}

.component-id {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-bright);
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

/* Component Previews */
.component-preview {
  margin-bottom: var(--sp-sm);
}

.button-preview .discord-button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: white;
  padding: 4px 12px;
  border-radius: 3px;
}

.btn-emoji {
  font-size: 14px;
}

.select-preview .discord-select {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-sm);
  font-size: 11px;
  color: var(--text-dim);
  background: var(--bg);
  border: 1px solid var(--border-mid);
  padding: 4px 8px;
  border-radius: 3px;
  width: 100%;
}

.select-preview .discord-select i {
  font-size: 8px;
}

.modal-preview {
  display: flex;
  align-items: center;
  gap: var(--sp-sm);
  font-size: 11px;
  color: var(--text-dim);
  background: var(--bg);
  border: 1px solid var(--border-mid);
  padding: 4px 8px;
  border-radius: 3px;
}

.modal-preview i {
  color: var(--accent-dim);
}

.component-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.component-type {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-ghost);
  text-transform: uppercase;
}

.action-count {
  font-size: 10px;
  color: var(--text-ghost);
}

/* Editor */
.component-editor {
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
}

/* Style Picker */
.style-picker {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-xs);
}

.style-option {
  font-size: 10px;
  color: var(--text-dim);
  background: var(--bg);
  border: var(--border-solid);
  padding: var(--sp-xs) var(--sp-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.style-option:hover {
  border-color: var(--style-color);
  color: var(--text-bright);
}

.style-option.active {
  background: var(--style-color);
  border-color: var(--style-color);
  color: white;
}

.checkbox-row {
  display: flex;
  gap: var(--sp-md);
}

.checkbox {
  display: flex;
  align-items: center;
  gap: var(--sp-sm);
  cursor: pointer;
  font-size: 12px;
  color: var(--text);
}

.checkbox.small {
  font-size: 11px;
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

.inline-inputs {
  display: flex;
  align-items: center;
  gap: var(--sp-sm);
}

.inline-label {
  font-size: 11px;
  color: var(--text-ghost);
}

.input.small {
  width: 60px;
}

/* Options/Fields Sections */
.options-section,
.fields-section {
  margin-top: var(--sp-md);
  padding-top: var(--sp-md);
  border-top: var(--border-dashed);
}

.options-header,
.fields-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sp-md);
}

.options-title,
.fields-title {
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 700;
  color: var(--text-ghost);
  letter-spacing: 2px;
}

.options-list,
.fields-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-sm);
}

.option-item {
  display: flex;
  gap: var(--sp-xs);
  align-items: center;
}

.option-item .input {
  flex: 1;
}

.field-item {
  display: flex;
  flex-direction: column;
  gap: var(--sp-xs);
  padding: var(--sp-sm);
  background: var(--bg);
  border: var(--border-solid);
}

.field-row {
  display: flex;
  gap: var(--sp-xs);
  align-items: center;
}

.field-row .input {
  flex: 1;
}

.field-row .select {
  width: 100px;
}

.field-options {
  display: flex;
  gap: var(--sp-md);
}

.remove-option,
.remove-field {
  background: none;
  border: none;
  color: var(--text-ghost);
  cursor: pointer;
  padding: var(--sp-xs);
}

.remove-option:hover,
.remove-field:hover {
  color: var(--red);
}

.empty-options,
.empty-fields {
  font-size: 11px;
  color: var(--text-ghost);
  padding: var(--sp-md);
  text-align: center;
  border: 1px dashed var(--border-mid);
}

/* Actions Section */
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
