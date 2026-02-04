<script setup lang="ts">
import { ref, computed } from 'vue';
import FurlowButton from '@/components/common/FurlowButton.vue';

interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

interface EmbedAuthor {
  name: string;
  url?: string;
  icon_url?: string;
}

interface EmbedFooter {
  text: string;
  icon_url?: string;
}

interface Embed {
  title?: string;
  description?: string;
  url?: string;
  color?: string;
  author?: EmbedAuthor;
  thumbnail?: string;
  image?: string;
  footer?: EmbedFooter;
  fields?: EmbedField[];
  timestamp?: boolean;
}

interface Props {
  embed: Embed;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: 'update', embed: Embed): void;
}>();

const activeSection = ref<string | null>(null);

const currentEmbed = computed(() => props.embed || {});

const updateField = (key: keyof Embed, value: unknown) => {
  const updated = { ...currentEmbed.value, [key]: value };
  // Remove empty values
  if (value === '' || value === undefined) {
    delete updated[key];
  }
  emit('update', updated);
};

const updateAuthor = (key: keyof EmbedAuthor, value: string) => {
  const author = { ...(currentEmbed.value.author || { name: '' }) };
  if (value) {
    author[key] = value;
  } else {
    delete author[key];
  }
  // If author has no name, remove the whole author object
  if (!author.name) {
    updateField('author', undefined);
  } else {
    updateField('author', author);
  }
};

const updateFooter = (key: keyof EmbedFooter, value: string) => {
  const footer = { ...(currentEmbed.value.footer || { text: '' }) };
  if (value) {
    footer[key] = value;
  } else {
    delete footer[key];
  }
  // If footer has no text, remove the whole footer object
  if (!footer.text) {
    updateField('footer', undefined);
  } else {
    updateField('footer', footer);
  }
};

const addField = () => {
  const fields = [...(currentEmbed.value.fields || [])];
  fields.push({ name: 'Field Name', value: 'Field Value', inline: false });
  updateField('fields', fields);
};

const updateEmbedField = (index: number, key: keyof EmbedField, value: unknown) => {
  const fields = [...(currentEmbed.value.fields || [])];
  fields[index] = { ...fields[index], [key]: value };
  updateField('fields', fields);
};

const removeEmbedField = (index: number) => {
  const fields = [...(currentEmbed.value.fields || [])];
  fields.splice(index, 1);
  updateField('fields', fields.length > 0 ? fields : undefined);
};

const moveField = (index: number, direction: 'up' | 'down') => {
  const fields = [...(currentEmbed.value.fields || [])];
  const newIndex = direction === 'up' ? index - 1 : index + 1;
  if (newIndex < 0 || newIndex >= fields.length) return;
  [fields[index], fields[newIndex]] = [fields[newIndex], fields[index]];
  updateField('fields', fields);
};

const toggleSection = (section: string) => {
  activeSection.value = activeSection.value === section ? null : section;
};

// Color utilities
const colorToHex = (color: string | undefined) => {
  if (!color) return '#ff6b35';
  return color;
};

const previewColor = computed(() => colorToHex(currentEmbed.value.color));
</script>

<template>
  <div class="embed-builder">
    <div class="builder-columns">
      <!-- Editor Column -->
      <div class="editor-column">
        <div class="editor-sections">
          <!-- Basic Info -->
          <div class="editor-section">
            <div class="section-header" @click="toggleSection('basic')">
              <span class="section-title">BASIC INFO</span>
              <i :class="['fas', activeSection === 'basic' ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
            </div>
            <div v-if="activeSection === 'basic' || !activeSection" class="section-body">
              <div class="field-group">
                <label class="field-label">Title</label>
                <input
                  type="text"
                  class="input"
                  :value="currentEmbed.title || ''"
                  placeholder="Embed Title"
                  @input="updateField('title', ($event.target as HTMLInputElement).value)"
                />
              </div>
              <div class="field-group">
                <label class="field-label">URL <span class="hint">(makes title clickable)</span></label>
                <input
                  type="text"
                  class="input"
                  :value="currentEmbed.url || ''"
                  placeholder="https://..."
                  @input="updateField('url', ($event.target as HTMLInputElement).value)"
                />
              </div>
              <div class="field-group">
                <label class="field-label">Description</label>
                <textarea
                  class="input textarea"
                  :value="currentEmbed.description || ''"
                  placeholder="Embed description text..."
                  rows="3"
                  @input="updateField('description', ($event.target as HTMLTextAreaElement).value)"
                ></textarea>
              </div>
              <div class="field-group">
                <label class="field-label">Color</label>
                <div class="color-input">
                  <input
                    type="color"
                    class="color-picker"
                    :value="previewColor"
                    @input="updateField('color', ($event.target as HTMLInputElement).value)"
                  />
                  <input
                    type="text"
                    class="input color-text"
                    :value="currentEmbed.color || ''"
                    placeholder="#ff6b35"
                    @input="updateField('color', ($event.target as HTMLInputElement).value)"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Author -->
          <div class="editor-section">
            <div class="section-header" @click="toggleSection('author')">
              <span class="section-title">AUTHOR</span>
              <i :class="['fas', activeSection === 'author' ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
            </div>
            <div v-if="activeSection === 'author'" class="section-body">
              <div class="field-group">
                <label class="field-label">Author Name</label>
                <input
                  type="text"
                  class="input"
                  :value="currentEmbed.author?.name || ''"
                  placeholder="Author name"
                  @input="updateAuthor('name', ($event.target as HTMLInputElement).value)"
                />
              </div>
              <div class="field-group">
                <label class="field-label">Author URL</label>
                <input
                  type="text"
                  class="input"
                  :value="currentEmbed.author?.url || ''"
                  placeholder="https://..."
                  @input="updateAuthor('url', ($event.target as HTMLInputElement).value)"
                />
              </div>
              <div class="field-group">
                <label class="field-label">Author Icon URL</label>
                <input
                  type="text"
                  class="input"
                  :value="currentEmbed.author?.icon_url || ''"
                  placeholder="https://..."
                  @input="updateAuthor('icon_url', ($event.target as HTMLInputElement).value)"
                />
              </div>
            </div>
          </div>

          <!-- Images -->
          <div class="editor-section">
            <div class="section-header" @click="toggleSection('images')">
              <span class="section-title">IMAGES</span>
              <i :class="['fas', activeSection === 'images' ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
            </div>
            <div v-if="activeSection === 'images'" class="section-body">
              <div class="field-group">
                <label class="field-label">Thumbnail URL <span class="hint">(small image, top-right)</span></label>
                <input
                  type="text"
                  class="input"
                  :value="currentEmbed.thumbnail || ''"
                  placeholder="https://..."
                  @input="updateField('thumbnail', ($event.target as HTMLInputElement).value)"
                />
              </div>
              <div class="field-group">
                <label class="field-label">Image URL <span class="hint">(large image)</span></label>
                <input
                  type="text"
                  class="input"
                  :value="currentEmbed.image || ''"
                  placeholder="https://..."
                  @input="updateField('image', ($event.target as HTMLInputElement).value)"
                />
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="editor-section">
            <div class="section-header" @click="toggleSection('footer')">
              <span class="section-title">FOOTER</span>
              <i :class="['fas', activeSection === 'footer' ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
            </div>
            <div v-if="activeSection === 'footer'" class="section-body">
              <div class="field-group">
                <label class="field-label">Footer Text</label>
                <input
                  type="text"
                  class="input"
                  :value="currentEmbed.footer?.text || ''"
                  placeholder="Footer text"
                  @input="updateFooter('text', ($event.target as HTMLInputElement).value)"
                />
              </div>
              <div class="field-group">
                <label class="field-label">Footer Icon URL</label>
                <input
                  type="text"
                  class="input"
                  :value="currentEmbed.footer?.icon_url || ''"
                  placeholder="https://..."
                  @input="updateFooter('icon_url', ($event.target as HTMLInputElement).value)"
                />
              </div>
              <label class="checkbox">
                <input
                  type="checkbox"
                  :checked="currentEmbed.timestamp"
                  @change="updateField('timestamp', ($event.target as HTMLInputElement).checked || undefined)"
                />
                <span>Include Timestamp</span>
              </label>
            </div>
          </div>

          <!-- Fields -->
          <div class="editor-section">
            <div class="section-header" @click="toggleSection('fields')">
              <span class="section-title">FIELDS</span>
              <span class="field-count">{{ currentEmbed.fields?.length || 0 }}</span>
              <i :class="['fas', activeSection === 'fields' ? 'fa-chevron-up' : 'fa-chevron-down']"></i>
            </div>
            <div v-if="activeSection === 'fields'" class="section-body">
              <div v-if="currentEmbed.fields && currentEmbed.fields.length > 0" class="fields-list">
                <div v-for="(field, index) in currentEmbed.fields" :key="index" class="embed-field-editor">
                  <div class="field-editor-header">
                    <span class="field-number">Field {{ index + 1 }}</span>
                    <div class="field-editor-actions">
                      <button
                        class="field-action"
                        :disabled="index === 0"
                        @click="moveField(index, 'up')"
                      >
                        <i class="fas fa-chevron-up"></i>
                      </button>
                      <button
                        class="field-action"
                        :disabled="index === currentEmbed.fields!.length - 1"
                        @click="moveField(index, 'down')"
                      >
                        <i class="fas fa-chevron-down"></i>
                      </button>
                      <button class="field-action danger" @click="removeEmbedField(index)">
                        <i class="fas fa-times"></i>
                      </button>
                    </div>
                  </div>
                  <div class="field-inputs">
                    <input
                      type="text"
                      class="input"
                      :value="field.name"
                      placeholder="Field Name"
                      @input="updateEmbedField(index, 'name', ($event.target as HTMLInputElement).value)"
                    />
                    <textarea
                      class="input textarea"
                      :value="field.value"
                      placeholder="Field Value"
                      rows="2"
                      @input="updateEmbedField(index, 'value', ($event.target as HTMLTextAreaElement).value)"
                    ></textarea>
                    <label class="checkbox">
                      <input
                        type="checkbox"
                        :checked="field.inline"
                        @change="updateEmbedField(index, 'inline', ($event.target as HTMLInputElement).checked)"
                      />
                      <span>Inline</span>
                    </label>
                  </div>
                </div>
              </div>
              <FurlowButton size="sm" icon="fas fa-plus" @click="addField">
                ADD FIELD
              </FurlowButton>
            </div>
          </div>
        </div>
      </div>

      <!-- Preview Column -->
      <div class="preview-column">
        <div class="preview-header">
          <span class="preview-title">PREVIEW</span>
        </div>
        <div class="preview-container">
          <div class="discord-embed" :style="{ borderColor: previewColor }">
            <!-- Author -->
            <div v-if="currentEmbed.author?.name" class="embed-author">
              <img v-if="currentEmbed.author.icon_url" :src="currentEmbed.author.icon_url" class="author-icon" />
              <a v-if="currentEmbed.author.url" :href="currentEmbed.author.url" class="author-name">
                {{ currentEmbed.author.name }}
              </a>
              <span v-else class="author-name">{{ currentEmbed.author.name }}</span>
            </div>

            <!-- Title -->
            <div v-if="currentEmbed.title" class="embed-title">
              <a v-if="currentEmbed.url" :href="currentEmbed.url">{{ currentEmbed.title }}</a>
              <span v-else>{{ currentEmbed.title }}</span>
            </div>

            <!-- Description -->
            <div v-if="currentEmbed.description" class="embed-description">
              {{ currentEmbed.description }}
            </div>

            <!-- Fields -->
            <div v-if="currentEmbed.fields && currentEmbed.fields.length > 0" class="embed-fields">
              <div
                v-for="(field, index) in currentEmbed.fields"
                :key="index"
                :class="['embed-field', { inline: field.inline }]"
              >
                <div class="field-name">{{ field.name }}</div>
                <div class="field-value">{{ field.value }}</div>
              </div>
            </div>

            <!-- Thumbnail -->
            <div v-if="currentEmbed.thumbnail" class="embed-thumbnail">
              <img :src="currentEmbed.thumbnail" alt="Thumbnail" />
            </div>

            <!-- Image -->
            <div v-if="currentEmbed.image" class="embed-image">
              <img :src="currentEmbed.image" alt="Image" />
            </div>

            <!-- Footer -->
            <div v-if="currentEmbed.footer?.text || currentEmbed.timestamp" class="embed-footer">
              <img v-if="currentEmbed.footer?.icon_url" :src="currentEmbed.footer.icon_url" class="footer-icon" />
              <span v-if="currentEmbed.footer?.text">{{ currentEmbed.footer.text }}</span>
              <span v-if="currentEmbed.footer?.text && currentEmbed.timestamp" class="separator"> | </span>
              <span v-if="currentEmbed.timestamp">Today at 12:00 PM</span>
            </div>

            <!-- Empty State -->
            <div v-if="!currentEmbed.title && !currentEmbed.description && !currentEmbed.author?.name" class="embed-empty">
              Start adding content to see preview
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.embed-builder {
  display: flex;
  flex-direction: column;
  gap: var(--sp-lg);
}

.builder-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sp-lg);
}

/* Editor Column */
.editor-column {
  display: flex;
  flex-direction: column;
}

.editor-sections {
  display: flex;
  flex-direction: column;
  gap: var(--sp-sm);
}

.editor-section {
  background: var(--bg-raised);
  border: var(--border-solid);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sp-sm) var(--sp-md);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.section-header:hover {
  background: var(--bg-hover);
}

.section-title {
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-dim);
  letter-spacing: 1.5px;
}

.field-count {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--accent);
  background: var(--accent-faint);
  padding: 1px 6px;
  margin-left: auto;
  margin-right: var(--sp-sm);
}

.section-header i {
  color: var(--text-ghost);
  font-size: 10px;
}

.section-body {
  padding: var(--sp-md);
  border-top: var(--border-dashed);
  display: flex;
  flex-direction: column;
  gap: var(--sp-md);
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: var(--sp-xs);
}

.field-label {
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 700;
  color: var(--text-ghost);
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

.field-label .hint {
  font-weight: 400;
  color: var(--text-ghost);
  text-transform: none;
  letter-spacing: 0;
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

.input:focus {
  outline: none;
  border-color: var(--accent);
}

.textarea {
  resize: vertical;
  min-height: 60px;
}

.color-input {
  display: flex;
  gap: var(--sp-sm);
}

.color-picker {
  width: 40px;
  height: 36px;
  padding: 0;
  border: var(--border-solid);
  cursor: pointer;
  background: none;
}

.color-text {
  flex: 1;
}

.checkbox {
  display: flex;
  align-items: center;
  gap: var(--sp-sm);
  cursor: pointer;
  font-size: 12px;
  color: var(--text);
}

.checkbox input {
  width: 16px;
  height: 16px;
  accent-color: var(--accent);
}

/* Fields Editor */
.fields-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-md);
  margin-bottom: var(--sp-md);
}

.embed-field-editor {
  background: var(--bg);
  border: var(--border-solid);
  padding: var(--sp-sm);
}

.field-editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sp-sm);
}

.field-number {
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 600;
  color: var(--text-ghost);
  letter-spacing: 1px;
}

.field-editor-actions {
  display: flex;
  gap: var(--sp-xs);
}

.field-action {
  background: none;
  border: none;
  color: var(--text-ghost);
  cursor: pointer;
  padding: var(--sp-2xs);
}

.field-action:hover:not(:disabled) {
  color: var(--text-bright);
}

.field-action:disabled {
  opacity: 0.3;
}

.field-action.danger:hover {
  color: var(--red);
}

.field-inputs {
  display: flex;
  flex-direction: column;
  gap: var(--sp-sm);
}

/* Preview Column */
.preview-column {
  position: sticky;
  top: var(--sp-lg);
  align-self: start;
}

.preview-header {
  margin-bottom: var(--sp-sm);
}

.preview-title {
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-ghost);
  letter-spacing: 2px;
}

.preview-container {
  background: #36393f;
  padding: var(--sp-md);
  border: var(--border-solid);
}

/* Discord Embed Preview */
.discord-embed {
  background: #2f3136;
  border-left: 4px solid;
  border-radius: 4px;
  padding: var(--sp-md);
  max-width: 400px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  color: #dcddde;
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--sp-sm);
}

.embed-author {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: var(--sp-sm);
  font-size: 12px;
}

.author-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
}

.author-name {
  color: #fff;
  font-weight: 500;
}

a.author-name:hover {
  text-decoration: underline;
}

.embed-title {
  grid-column: 1;
  font-weight: 600;
  color: #fff;
}

.embed-title a {
  color: #00aff4;
}

.embed-title a:hover {
  text-decoration: underline;
}

.embed-description {
  grid-column: 1;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.embed-fields {
  grid-column: 1;
  display: flex;
  flex-wrap: wrap;
  gap: var(--sp-sm);
  margin-top: var(--sp-sm);
}

.embed-field {
  flex: 1 0 100%;
}

.embed-field.inline {
  flex: 1 0 30%;
  min-width: 100px;
}

.field-name {
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 2px;
}

.field-value {
  font-size: 14px;
  line-height: 1.4;
  white-space: pre-wrap;
}

.embed-thumbnail {
  grid-column: 2;
  grid-row: 1 / 4;
  width: 80px;
  height: 80px;
  margin-left: var(--sp-md);
}

.embed-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}

.embed-image {
  grid-column: 1 / -1;
  margin-top: var(--sp-sm);
}

.embed-image img {
  max-width: 100%;
  border-radius: 4px;
}

.embed-footer {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: var(--sp-sm);
  font-size: 12px;
  color: #72767d;
  margin-top: var(--sp-sm);
}

.footer-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
}

.separator {
  margin: 0 var(--sp-xs);
}

.embed-empty {
  grid-column: 1 / -1;
  text-align: center;
  color: #72767d;
  font-style: italic;
  padding: var(--sp-lg);
}

/* Mobile */
@media (max-width: 768px) {
  .builder-columns {
    grid-template-columns: 1fr;
  }

  .preview-column {
    position: static;
    order: -1; /* Show preview first on mobile */
  }

  .discord-embed {
    max-width: 100%;
  }

  .section-header {
    padding: var(--sp-xs) var(--sp-sm);
  }

  .section-title {
    font-size: 10px;
  }

  .section-body {
    padding: var(--sp-sm);
    gap: var(--sp-sm);
  }

  .field-label {
    font-size: 9px;
  }

  .input {
    font-size: 12px;
    padding: var(--sp-xs) var(--sp-sm);
  }

  .textarea {
    min-height: 50px;
  }

  .embed-field-editor {
    padding: var(--sp-xs);
  }

  .field-editor-header {
    flex-wrap: wrap;
    gap: var(--sp-xs);
  }

  .preview-container {
    padding: var(--sp-sm);
  }

  .discord-embed {
    padding: var(--sp-sm);
    font-size: 12px;
  }

  .embed-author {
    font-size: 11px;
  }

  .embed-thumbnail {
    width: 60px;
    height: 60px;
  }
}

@media (max-width: 480px) {
  .color-input {
    flex-direction: column;
  }

  .color-picker {
    width: 100%;
    height: 32px;
  }

  .field-inputs {
    gap: var(--sp-xs);
  }

  .discord-embed {
    grid-template-columns: 1fr;
  }

  .embed-thumbnail {
    grid-column: 1;
    grid-row: auto;
    width: 100%;
    height: 100px;
    margin: var(--sp-sm) 0;
  }

  .embed-thumbnail img {
    width: 80px;
    height: 80px;
  }
}
</style>
