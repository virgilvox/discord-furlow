<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSchemaStore } from '@/stores/schema';
import FurlowInput from '@/components/common/FurlowInput.vue';
import FurlowButton from '@/components/common/FurlowButton.vue';
import ExpressionEditor from './ExpressionEditor.vue';
import EmbedBuilder from './EmbedBuilder.vue';

interface Props {
  section: string;
}

const props = defineProps<Props>();
const schemaStore = useSchemaStore();

// Section-specific form definitions
const sectionForms: Record<string, Array<{
  key: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'select' | 'boolean' | 'expression';
  placeholder?: string;
  hint?: string;
  options?: Array<{ label: string; value: string }>;
}>> = {
  identity: [
    { key: 'name', label: 'Bot Name', type: 'text', placeholder: 'MyBot', hint: 'Display name for your bot' },
    { key: 'avatar', label: 'Avatar URL', type: 'text', placeholder: 'https://...', hint: 'URL to bot avatar image' },
    { key: 'banner', label: 'Banner URL', type: 'text', placeholder: 'https://...', hint: 'URL to bot banner image' },
    { key: 'description', label: 'Description', type: 'textarea', placeholder: 'A helpful Discord bot...', hint: 'Bot description' },
  ],
  presence: [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'Online', value: 'online' },
        { label: 'Idle', value: 'idle' },
        { label: 'Do Not Disturb', value: 'dnd' },
        { label: 'Invisible', value: 'invisible' },
      ],
    },
    {
      key: 'activity.type',
      label: 'Activity Type',
      type: 'select',
      options: [
        { label: 'Playing', value: 'playing' },
        { label: 'Streaming', value: 'streaming' },
        { label: 'Listening', value: 'listening' },
        { label: 'Watching', value: 'watching' },
        { label: 'Competing', value: 'competing' },
      ],
    },
    { key: 'activity.text', label: 'Activity Text', type: 'expression', placeholder: 'guild.memberCount + " members online"', hint: 'Use expressions for dynamic status' },
    { key: 'activity.url', label: 'Stream URL', type: 'text', placeholder: 'https://twitch.tv/...', hint: 'For streaming activities' },
  ],
  permissions: [
    { key: 'default_level', label: 'Default Permission Level', type: 'number', placeholder: '0', hint: 'Default permission level for users' },
    { key: 'admin_role', label: 'Admin Role', type: 'expression', placeholder: 'role.id', hint: 'Role ID expression for admin access' },
    { key: 'moderator_role', label: 'Moderator Role', type: 'expression', placeholder: 'role.id', hint: 'Role ID expression for mod access' },
  ],
  state: [
    { key: 'persist', label: 'Persist State', type: 'boolean', hint: 'Save state to database' },
    { key: 'sync_interval', label: 'Sync Interval (ms)', type: 'number', placeholder: '5000', hint: 'How often to sync state' },
  ],
  theme: [
    { key: 'primary_color', label: 'Primary Color', type: 'text', placeholder: '#ff6b35', hint: 'Hex color for embeds' },
    { key: 'success_color', label: 'Success Color', type: 'text', placeholder: '#8bd649' },
    { key: 'error_color', label: 'Error Color', type: 'text', placeholder: '#e05555' },
    { key: 'warning_color', label: 'Warning Color', type: 'text', placeholder: '#f0c040' },
  ],
  analytics: [
    { key: 'enabled', label: 'Enable Analytics', type: 'boolean' },
    { key: 'prometheus.enabled', label: 'Enable Prometheus', type: 'boolean' },
    { key: 'prometheus.port', label: 'Prometheus Port', type: 'number', placeholder: '9090' },
    { key: 'prometheus.path', label: 'Metrics Path', type: 'text', placeholder: '/metrics' },
  ],
  dashboard: [
    { key: 'enabled', label: 'Enable Dashboard', type: 'boolean' },
    { key: 'port', label: 'Port', type: 'number', placeholder: '3000' },
    { key: 'host', label: 'Host', type: 'text', placeholder: 'localhost' },
    { key: 'branding.name', label: 'Dashboard Name', type: 'text', placeholder: 'Bot Dashboard' },
  ],
  voice: [
    { key: 'enabled', label: 'Enable Voice', type: 'boolean', hint: 'Enable voice channel support' },
    { key: 'default_volume', label: 'Default Volume', type: 'number', placeholder: '50', hint: 'Default playback volume (0-100)' },
    { key: 'max_queue_size', label: 'Max Queue Size', type: 'number', placeholder: '100', hint: 'Maximum songs in queue' },
    { key: 'leave_on_empty', label: 'Leave on Empty', type: 'boolean', hint: 'Leave voice channel when empty' },
    { key: 'leave_delay', label: 'Leave Delay', type: 'text', placeholder: '5m', hint: 'Delay before leaving (e.g., 5m, 30s)' },
  ],
  automod: [
    { key: 'enabled', label: 'Enable Automod', type: 'boolean', hint: 'Enable automatic moderation' },
    { key: 'log_channel', label: 'Log Channel', type: 'expression', placeholder: 'channel.id', hint: 'Channel ID expression for mod logs' },
  ],
  scheduler: [
    { key: 'enabled', label: 'Enable Scheduler', type: 'boolean', hint: 'Enable scheduled tasks' },
    { key: 'timezone', label: 'Timezone', type: 'text', placeholder: 'UTC', hint: 'Default timezone for schedules' },
  ],
  locale: [
    { key: 'default', label: 'Default Locale', type: 'text', placeholder: 'en-US', hint: 'Default language/locale' },
    { key: 'fallback', label: 'Fallback Locale', type: 'text', placeholder: 'en', hint: 'Fallback when translation missing' },
  ],
  canvas: [
    { key: 'enabled', label: 'Enable Canvas', type: 'boolean', hint: 'Enable image generation' },
    { key: 'fonts_dir', label: 'Fonts Directory', type: 'text', placeholder: './fonts', hint: 'Path to custom fonts' },
  ],
  errors: [
    { key: 'default_handler', label: 'Default Handler', type: 'expression', placeholder: 'flow.error_handler', hint: 'Flow to call on errors' },
    { key: 'log_errors', label: 'Log Errors', type: 'boolean', hint: 'Log errors to console' },
  ],
};

const currentForm = computed(() => sectionForms[props.section] || []);

// Embeds section management
const editingEmbedIndex = ref<number | null>(null);

const embeds = computed(() => {
  const spec = schemaStore.spec;
  return (spec.embeds as Record<string, unknown>[] | undefined) || [];
});

const addEmbed = () => {
  const currentEmbeds = [...embeds.value];
  const newEmbed = {
    name: `embed_${currentEmbeds.length + 1}`,
    title: 'New Embed',
    color: '#ff6b35',
  };
  currentEmbeds.push(newEmbed);
  schemaStore.updateSection('embeds', currentEmbeds as never);
  editingEmbedIndex.value = currentEmbeds.length - 1;
};

const updateEmbed = (index: number, embed: Record<string, unknown>) => {
  const currentEmbeds = [...embeds.value];
  currentEmbeds[index] = embed;
  schemaStore.updateSection('embeds', currentEmbeds as never);
};

const removeEmbed = (index: number) => {
  const currentEmbeds = [...embeds.value];
  currentEmbeds.splice(index, 1);
  schemaStore.updateSection('embeds', currentEmbeds.length > 0 ? currentEmbeds as never : undefined as never);
  if (editingEmbedIndex.value === index) {
    editingEmbedIndex.value = null;
  }
};

const getValue = (key: string): string | number | boolean => {
  const parts = key.split('.');
  let value: unknown = schemaStore.spec[props.section as keyof typeof schemaStore.spec];

  for (const part of parts) {
    if (value && typeof value === 'object' && part in value) {
      value = (value as Record<string, unknown>)[part];
    } else {
      return '';
    }
  }

  return value as string | number | boolean;
};

const setValue = (key: string, newValue: string | number | boolean) => {
  const parts = key.split('.');
  const sectionKey = props.section as keyof typeof schemaStore.spec;

  // Deep clone current section value or create empty object
  let sectionValue: Record<string, unknown> =
    typeof schemaStore.spec[sectionKey] === 'object' && schemaStore.spec[sectionKey]
      ? JSON.parse(JSON.stringify(schemaStore.spec[sectionKey]))
      : {};

  // Navigate and set the value
  let current = sectionValue;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current) || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = newValue === '' ? undefined : newValue;

  // Update the store
  schemaStore.updateSection(sectionKey, sectionValue as never);
};
</script>

<template>
  <div class="schema-form">
    <!-- Embeds Section -->
    <template v-if="section === 'embeds'">
      <div class="embeds-section">
        <div class="embeds-header">
          <span class="embeds-count">{{ embeds.length }} Embeds</span>
          <FurlowButton size="sm" icon="fas fa-plus" @click="addEmbed">
            ADD EMBED
          </FurlowButton>
        </div>

        <div v-if="embeds.length === 0" class="empty-embeds">
          <i class="fas fa-window-maximize"></i>
          <p>No embeds defined</p>
          <span>Create reusable embeds for your bot messages</span>
        </div>

        <div v-else class="embeds-list">
          <div
            v-for="(embed, index) in embeds"
            :key="index"
            :class="['embed-card', { active: editingEmbedIndex === index }]"
          >
            <div class="embed-card-header" @click="editingEmbedIndex = editingEmbedIndex === index ? null : index">
              <div class="embed-info">
                <div
                  class="embed-color-dot"
                  :style="{ background: (embed as Record<string, unknown>).color as string || '#ff6b35' }"
                ></div>
                <span class="embed-name">{{ (embed as Record<string, unknown>).name || `Embed ${index + 1}` }}</span>
                <span class="embed-title-preview">{{ (embed as Record<string, unknown>).title || 'Untitled' }}</span>
              </div>
              <div class="embed-actions">
                <button class="embed-action danger" @click.stop="removeEmbed(index)">
                  <i class="fas fa-times"></i>
                </button>
                <i :class="['expand-icon', 'fas', editingEmbedIndex === index ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
              </div>
            </div>

            <div v-if="editingEmbedIndex === index" class="embed-card-body">
              <div class="embed-name-field">
                <label class="field-label">Embed Name (for reference)</label>
                <input
                  type="text"
                  class="input"
                  :value="(embed as Record<string, unknown>).name as string || ''"
                  placeholder="welcome_embed"
                  @input="updateEmbed(index, { ...embed as Record<string, unknown>, name: ($event.target as HTMLInputElement).value })"
                />
              </div>
              <EmbedBuilder
                :embed="embed as Record<string, unknown>"
                @update="updateEmbed(index, { name: (embed as Record<string, unknown>).name, ...$event })"
              />
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Generic empty form -->
    <template v-else-if="currentForm.length === 0">
      <div class="empty-form">
        <i class="fas fa-code"></i>
        <p>This section uses a custom editor. Configure it in the form below or edit the YAML directly.</p>
      </div>
    </template>

    <!-- Form fields for other sections -->
    <div v-else class="form-fields">
      <div v-for="field in currentForm" :key="field.key" class="form-field">
        <template v-if="field.type === 'text' || field.type === 'number'">
          <FurlowInput
            :model-value="getValue(field.key) as string | number"
            :type="field.type"
            :label="field.label"
            :placeholder="field.placeholder"
            :hint="field.hint"
            @update:model-value="setValue(field.key, $event)"
          />
        </template>

        <template v-else-if="field.type === 'textarea'">
          <div class="input-group">
            <label class="input-label">{{ field.label }}</label>
            <textarea
              class="input textarea"
              :value="getValue(field.key) as string"
              :placeholder="field.placeholder"
              rows="3"
              @input="setValue(field.key, ($event.target as HTMLTextAreaElement).value)"
            ></textarea>
            <span v-if="field.hint" class="input-hint">{{ field.hint }}</span>
          </div>
        </template>

        <template v-else-if="field.type === 'select'">
          <div class="input-group">
            <label class="input-label">{{ field.label }}</label>
            <select
              class="select"
              :value="getValue(field.key) as string"
              @change="setValue(field.key, ($event.target as HTMLSelectElement).value)"
            >
              <option value="">-- Select --</option>
              <option
                v-for="opt in field.options"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </option>
            </select>
            <span v-if="field.hint" class="input-hint">{{ field.hint }}</span>
          </div>
        </template>

        <template v-else-if="field.type === 'boolean'">
          <label class="checkbox">
            <input
              type="checkbox"
              :checked="getValue(field.key) as boolean"
              @change="setValue(field.key, ($event.target as HTMLInputElement).checked)"
            />
            <span>{{ field.label }}</span>
          </label>
        </template>

        <template v-else-if="field.type === 'expression'">
          <div class="input-group">
            <label class="input-label">{{ field.label }}</label>
            <ExpressionEditor
              :model-value="getValue(field.key) as string || ''"
              :placeholder-text="field.placeholder || 'Enter expression...'"
              @update:model-value="setValue(field.key, $event)"
            />
            <span v-if="field.hint" class="input-hint">{{ field.hint }}</span>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.schema-form {
  display: flex;
  flex-direction: column;
  gap: var(--sp-lg);
}

.empty-form {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-md);
  padding: var(--sp-2xl);
  border: 1px dashed var(--border-mid);
  text-align: center;
}

.empty-form i {
  font-size: 32px;
  color: var(--text-ghost);
}

.empty-form p {
  color: var(--text-dim);
  font-size: 13px;
  max-width: 300px;
}

.form-fields {
  display: flex;
  flex-direction: column;
  gap: var(--sp-lg);
}

.form-field {
  display: flex;
  flex-direction: column;
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

.input-hint {
  font-size: 11px;
  color: var(--text-ghost);
}

.textarea {
  resize: vertical;
  min-height: 80px;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: var(--sp-sm);
  cursor: pointer;
}

.checkbox input {
  appearance: none;
  width: 16px;
  height: 16px;
  background: var(--bg);
  border: var(--border-solid);
  cursor: pointer;
  position: relative;
  transition: all var(--transition-fast);
}

.checkbox input:checked {
  background: var(--accent);
  border-color: var(--accent);
}

.checkbox input:checked::after {
  content: '\f00c';
  font-family: 'Font Awesome 6 Free';
  font-weight: 900;
  font-size: 10px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--bg);
}

.checkbox span {
  font-size: 13px;
  color: var(--text);
}

/* Embeds Section */
.embeds-section {
  display: flex;
  flex-direction: column;
  gap: var(--sp-lg);
}

.embeds-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.embeds-count {
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-dim);
  letter-spacing: 1px;
  text-transform: uppercase;
}

.empty-embeds {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-sm);
  padding: var(--sp-2xl);
  border: 1px dashed var(--border-mid);
  text-align: center;
}

.empty-embeds i {
  font-size: 32px;
  color: var(--text-ghost);
}

.empty-embeds p {
  color: var(--text-dim);
  margin: 0;
}

.empty-embeds span {
  font-size: 12px;
  color: var(--text-ghost);
}

.embeds-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-md);
}

.embed-card {
  background: var(--bg-raised);
  border: var(--border-solid);
  transition: all var(--transition-fast);
}

.embed-card.active {
  border-color: var(--accent-dim);
}

.embed-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-md);
  cursor: pointer;
}

.embed-card-header:hover {
  background: var(--bg-hover);
}

.embed-info {
  display: flex;
  align-items: center;
  gap: var(--sp-sm);
}

.embed-color-dot {
  width: 12px;
  height: 12px;
  flex-shrink: 0;
}

.embed-name {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-bright);
}

.embed-title-preview {
  font-size: 11px;
  color: var(--text-ghost);
  margin-left: var(--sp-sm);
}

.embed-actions {
  display: flex;
  align-items: center;
  gap: var(--sp-sm);
}

.embed-action {
  background: none;
  border: none;
  color: var(--text-ghost);
  cursor: pointer;
  padding: var(--sp-xs);
}

.embed-action:hover {
  color: var(--text-bright);
}

.embed-action.danger:hover {
  color: var(--red);
}

.expand-icon {
  color: var(--text-ghost);
  font-size: 10px;
}

.embed-card-body {
  padding: var(--sp-md);
  border-top: var(--border-dashed);
  background: var(--bg);
}

.embed-name-field {
  margin-bottom: var(--sp-lg);
}

.field-label {
  display: block;
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 700;
  color: var(--text-ghost);
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-bottom: var(--sp-xs);
}

/* Mobile responsive styles */
@media (max-width: 768px) {
  .schema-form {
    gap: var(--sp-md);
  }

  .form-fields {
    gap: var(--sp-md);
  }

  .embeds-header {
    flex-wrap: wrap;
    gap: var(--sp-sm);
  }

  .embed-card-header {
    padding: var(--sp-sm);
  }

  .embed-info {
    flex: 1;
    min-width: 0;
  }

  .embed-name {
    font-size: 11px;
    word-break: break-all;
  }

  .embed-title-preview {
    display: none;
  }

  .embed-card-body {
    padding: var(--sp-sm);
  }

  .empty-form,
  .empty-embeds {
    padding: var(--sp-lg);
  }

  .empty-form i,
  .empty-embeds i {
    font-size: 24px;
  }

  .empty-form p {
    max-width: 100%;
  }

  .textarea {
    min-height: 100px;
  }
}

@media (max-width: 480px) {
  .input-label,
  .field-label {
    font-size: 10px;
    letter-spacing: 1px;
  }

  .checkbox span {
    font-size: 12px;
  }

  .embeds-count {
    font-size: 11px;
  }

  .embed-name {
    font-size: 10px;
  }
}
</style>
