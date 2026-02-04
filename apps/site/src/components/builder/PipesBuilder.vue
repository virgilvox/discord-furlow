<script setup lang="ts">
import { ref, computed } from 'vue';
import { useSchemaStore } from '@/stores/schema';
import FurlowButton from '@/components/common/FurlowButton.vue';
import FurlowInput from '@/components/common/FurlowInput.vue';

const schemaStore = useSchemaStore();

const editingPipe = ref<number | null>(null);

const pipes = computed(() => {
  return (schemaStore.spec.pipes as Record<string, unknown>[] | undefined) || [];
});

const pipeTypes = [
  { value: 'http', label: 'HTTP', icon: 'fas fa-globe', description: 'REST API requests' },
  { value: 'websocket', label: 'WebSocket', icon: 'fas fa-plug', description: 'Real-time bidirectional' },
  { value: 'webhook', label: 'Webhook', icon: 'fas fa-satellite-dish', description: 'Receive webhooks' },
  { value: 'mqtt', label: 'MQTT', icon: 'fas fa-broadcast-tower', description: 'Message broker' },
  { value: 'tcp', label: 'TCP', icon: 'fas fa-network-wired', description: 'TCP socket' },
  { value: 'udp', label: 'UDP', icon: 'fas fa-tower-broadcast', description: 'UDP datagram' },
  { value: 'database', label: 'Database', icon: 'fas fa-database', description: 'External database' },
  { value: 'file', label: 'File', icon: 'fas fa-file', description: 'File system watch' },
];

const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const authTypes = [
  { value: 'none', label: 'None' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'api_key', label: 'API Key' },
];

const dbAdapters = [
  { value: 'postgres', label: 'PostgreSQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'sqlite', label: 'SQLite' },
  { value: 'mongodb', label: 'MongoDB' },
  { value: 'redis', label: 'Redis' },
];

const mqttQos = [
  { value: 0, label: 'At most once (0)' },
  { value: 1, label: 'At least once (1)' },
  { value: 2, label: 'Exactly once (2)' },
];

const addPipe = (type: string) => {
  const pipeList = [...pipes.value];
  const newPipe: Record<string, unknown> = {
    name: `${type}_${pipeList.length + 1}`,
    type,
  };

  // Set defaults based on type
  switch (type) {
    case 'http':
      newPipe.url = '';
      newPipe.method = 'GET';
      break;
    case 'websocket':
      newPipe.url = '';
      newPipe.reconnect = true;
      break;
    case 'webhook':
      newPipe.path = '/webhook';
      break;
    case 'mqtt':
      newPipe.broker = '';
      newPipe.topics = [];
      break;
    case 'tcp':
    case 'udp':
      newPipe.host = 'localhost';
      newPipe.port = 8080;
      break;
    case 'database':
      newPipe.adapter = 'postgres';
      newPipe.connection = '';
      break;
    case 'file':
      newPipe.path = './data';
      newPipe.watch = true;
      break;
  }

  pipeList.push(newPipe);
  schemaStore.updateSection('pipes' as never, pipeList as never);
  editingPipe.value = pipeList.length - 1;
};

const removePipe = (index: number) => {
  const pipeList = [...pipes.value];
  pipeList.splice(index, 1);
  schemaStore.updateSection('pipes' as never, pipeList.length > 0 ? pipeList as never : undefined as never);
  if (editingPipe.value === index) {
    editingPipe.value = null;
  }
};

const updatePipe = (index: number, key: string, value: unknown) => {
  const pipeList = [...pipes.value];
  pipeList[index] = { ...pipeList[index], [key]: value === '' ? undefined : value };
  schemaStore.updateSection('pipes' as never, pipeList as never);
};

const updateNestedPipe = (index: number, parentKey: string, childKey: string, value: unknown) => {
  const pipeList = [...pipes.value];
  const pipe = pipeList[index];
  const parent = (pipe[parentKey] as Record<string, unknown>) || {};
  parent[childKey] = value === '' ? undefined : value;
  pipeList[index] = { ...pipe, [parentKey]: parent };
  schemaStore.updateSection('pipes' as never, pipeList as never);
};

// MQTT topics management
const addMqttTopic = () => {
  if (editingPipe.value === null) return;
  const pipeList = [...pipes.value];
  const pipe = pipeList[editingPipe.value];
  const topics = [...((pipe.topics as string[]) || [])];
  topics.push('topic/new');
  pipeList[editingPipe.value] = { ...pipe, topics };
  schemaStore.updateSection('pipes' as never, pipeList as never);
};

const updateMqttTopic = (topicIndex: number, value: string) => {
  if (editingPipe.value === null) return;
  const pipeList = [...pipes.value];
  const pipe = pipeList[editingPipe.value];
  const topics = [...((pipe.topics as string[]) || [])];
  topics[topicIndex] = value;
  pipeList[editingPipe.value] = { ...pipe, topics };
  schemaStore.updateSection('pipes' as never, pipeList as never);
};

const removeMqttTopic = (topicIndex: number) => {
  if (editingPipe.value === null) return;
  const pipeList = [...pipes.value];
  const pipe = pipeList[editingPipe.value];
  const topics = [...((pipe.topics as string[]) || [])];
  topics.splice(topicIndex, 1);
  pipeList[editingPipe.value] = { ...pipe, topics };
  schemaStore.updateSection('pipes' as never, pipeList as never);
};

const getPipeIcon = (type: string) => {
  return pipeTypes.find(t => t.value === type)?.icon || 'fas fa-plug';
};

const getPipeLabel = (type: string) => {
  return pipeTypes.find(t => t.value === type)?.label || type;
};
</script>

<template>
  <div class="pipes-builder">
    <!-- Pipes List -->
    <div class="pipes-list">
      <div class="pipes-header">
        <span class="pipes-count">{{ pipes.length }} Pipes</span>
      </div>

      <!-- Add Pipe Options -->
      <div class="pipe-types">
        <button
          v-for="type in pipeTypes"
          :key="type.value"
          class="pipe-type-btn"
          @click="addPipe(type.value)"
        >
          <i :class="type.icon"></i>
          <span class="type-label">{{ type.label }}</span>
          <span class="type-desc">{{ type.description }}</span>
        </button>
      </div>

      <div v-if="pipes.length === 0" class="empty-list">
        <i class="fas fa-plug"></i>
        <p>No pipes configured</p>
        <span>Connect your bot to external services and APIs</span>
      </div>

      <div v-else class="pipes-grid">
        <div
          v-for="(pipe, index) in pipes"
          :key="index"
          :class="['pipe-card', { active: editingPipe === index }]"
          @click="editingPipe = index"
        >
          <div class="pipe-header">
            <div class="pipe-info">
              <i :class="getPipeIcon(pipe.type as string)"></i>
              <span class="pipe-name">{{ pipe.name }}</span>
            </div>
            <button class="remove-btn" @click.stop="removePipe(index)">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="pipe-meta">
            <span class="pipe-type">{{ getPipeLabel(pipe.type as string) }}</span>
            <span v-if="pipe.url" class="pipe-url">{{ pipe.url }}</span>
            <span v-else-if="pipe.host" class="pipe-url">{{ pipe.host }}:{{ pipe.port }}</span>
            <span v-else-if="pipe.path" class="pipe-url">{{ pipe.path }}</span>
            <span v-else-if="pipe.broker" class="pipe-url">{{ pipe.broker }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Pipe Editor -->
    <div v-if="editingPipe !== null && pipes[editingPipe]" class="pipe-editor">
      <div class="editor-header">
        <h3 class="editor-title">
          <i :class="getPipeIcon(pipes[editingPipe].type as string)"></i>
          CONFIGURE {{ getPipeLabel(pipes[editingPipe].type as string).toUpperCase() }} PIPE
        </h3>
      </div>

      <div class="editor-fields">
        <FurlowInput
          :model-value="(pipes[editingPipe].name as string) || ''"
          label="Pipe Name"
          placeholder="my_api"
          hint="Reference name for this pipe"
          @update:model-value="updatePipe(editingPipe!, 'name', $event)"
        />

        <!-- HTTP Pipe -->
        <template v-if="pipes[editingPipe].type === 'http'">
          <FurlowInput
            :model-value="(pipes[editingPipe].url as string) || ''"
            label="Base URL"
            placeholder="https://api.example.com"
            hint="Base URL for all requests"
            @update:model-value="updatePipe(editingPipe!, 'url', $event)"
          />

          <div class="input-group">
            <label class="input-label">Default Method</label>
            <select
              class="select"
              :value="(pipes[editingPipe].method as string) || 'GET'"
              @change="updatePipe(editingPipe!, 'method', ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="method in httpMethods" :key="method" :value="method">
                {{ method }}
              </option>
            </select>
          </div>

          <div class="input-group">
            <label class="input-label">Authentication</label>
            <select
              class="select"
              :value="((pipes[editingPipe].auth as Record<string, unknown>)?.type as string) || 'none'"
              @change="updateNestedPipe(editingPipe!, 'auth', 'type', ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="auth in authTypes" :key="auth.value" :value="auth.value">
                {{ auth.label }}
              </option>
            </select>
          </div>

          <template v-if="((pipes[editingPipe].auth as Record<string, unknown>)?.type as string) === 'bearer'">
            <FurlowInput
              :model-value="((pipes[editingPipe].auth as Record<string, unknown>)?.token as string) || ''"
              label="Bearer Token"
              placeholder="${{ env.API_TOKEN }}"
              hint="Use expressions to reference environment variables"
              @update:model-value="updateNestedPipe(editingPipe!, 'auth', 'token', $event)"
            />
          </template>

          <template v-if="((pipes[editingPipe].auth as Record<string, unknown>)?.type as string) === 'api_key'">
            <FurlowInput
              :model-value="((pipes[editingPipe].auth as Record<string, unknown>)?.header as string) || ''"
              label="Header Name"
              placeholder="X-API-Key"
              @update:model-value="updateNestedPipe(editingPipe!, 'auth', 'header', $event)"
            />
            <FurlowInput
              :model-value="((pipes[editingPipe].auth as Record<string, unknown>)?.key as string) || ''"
              label="API Key"
              placeholder="${{ env.API_KEY }}"
              @update:model-value="updateNestedPipe(editingPipe!, 'auth', 'key', $event)"
            />
          </template>

          <div class="fieldset">
            <div class="fieldset-title">Rate Limiting</div>
            <div class="inline-fields">
              <FurlowInput
                :model-value="((pipes[editingPipe].rate_limit as Record<string, unknown>)?.requests as number) || ''"
                type="number"
                label="Requests"
                placeholder="100"
                @update:model-value="updateNestedPipe(editingPipe!, 'rate_limit', 'requests', $event)"
              />
              <FurlowInput
                :model-value="((pipes[editingPipe].rate_limit as Record<string, unknown>)?.per as string) || ''"
                label="Per"
                placeholder="1m"
                hint="e.g., 1m, 1h"
                @update:model-value="updateNestedPipe(editingPipe!, 'rate_limit', 'per', $event)"
              />
            </div>
          </div>

          <div class="fieldset">
            <div class="fieldset-title">Retry Settings</div>
            <div class="inline-fields">
              <FurlowInput
                :model-value="((pipes[editingPipe].retry as Record<string, unknown>)?.attempts as number) || ''"
                type="number"
                label="Attempts"
                placeholder="3"
                @update:model-value="updateNestedPipe(editingPipe!, 'retry', 'attempts', $event)"
              />
              <FurlowInput
                :model-value="((pipes[editingPipe].retry as Record<string, unknown>)?.delay as string) || ''"
                label="Delay"
                placeholder="1s"
                @update:model-value="updateNestedPipe(editingPipe!, 'retry', 'delay', $event)"
              />
            </div>
          </div>
        </template>

        <!-- WebSocket Pipe -->
        <template v-if="pipes[editingPipe].type === 'websocket'">
          <FurlowInput
            :model-value="(pipes[editingPipe].url as string) || ''"
            label="WebSocket URL"
            placeholder="wss://socket.example.com"
            @update:model-value="updatePipe(editingPipe!, 'url', $event)"
          />

          <div class="checkbox-row">
            <label class="checkbox">
              <input
                type="checkbox"
                :checked="Boolean(pipes[editingPipe].reconnect)"
                @change="updatePipe(editingPipe!, 'reconnect', ($event.target as HTMLInputElement).checked)"
              />
              <span>Auto-reconnect</span>
            </label>
          </div>

          <FurlowInput
            :model-value="(pipes[editingPipe].heartbeat as string) || ''"
            label="Heartbeat Interval"
            placeholder="30s"
            hint="Send ping to keep connection alive"
            @update:model-value="updatePipe(editingPipe!, 'heartbeat', $event)"
          />
        </template>

        <!-- Webhook Pipe -->
        <template v-if="pipes[editingPipe].type === 'webhook'">
          <FurlowInput
            :model-value="(pipes[editingPipe].path as string) || ''"
            label="Webhook Path"
            placeholder="/webhook/github"
            hint="Path to receive incoming webhooks"
            @update:model-value="updatePipe(editingPipe!, 'path', $event)"
          />

          <FurlowInput
            :model-value="(pipes[editingPipe].secret as string) || ''"
            label="Secret"
            placeholder="${{ env.WEBHOOK_SECRET }}"
            hint="For signature validation"
            @update:model-value="updatePipe(editingPipe!, 'secret', $event)"
          />

          <div class="checkbox-row">
            <label class="checkbox">
              <input
                type="checkbox"
                :checked="Boolean(pipes[editingPipe].validate_signature)"
                @change="updatePipe(editingPipe!, 'validate_signature', ($event.target as HTMLInputElement).checked)"
              />
              <span>Validate Signature</span>
            </label>
          </div>
        </template>

        <!-- MQTT Pipe -->
        <template v-if="pipes[editingPipe].type === 'mqtt'">
          <FurlowInput
            :model-value="(pipes[editingPipe].broker as string) || ''"
            label="Broker URL"
            placeholder="mqtt://broker.example.com:1883"
            @update:model-value="updatePipe(editingPipe!, 'broker', $event)"
          />

          <FurlowInput
            :model-value="(pipes[editingPipe].client_id as string) || ''"
            label="Client ID"
            placeholder="furlow-bot"
            @update:model-value="updatePipe(editingPipe!, 'client_id', $event)"
          />

          <div class="input-group">
            <label class="input-label">QoS Level</label>
            <select
              class="select"
              :value="(pipes[editingPipe].qos as number) ?? 1"
              @change="updatePipe(editingPipe!, 'qos', Number(($event.target as HTMLSelectElement).value))"
            >
              <option v-for="qos in mqttQos" :key="qos.value" :value="qos.value">
                {{ qos.label }}
              </option>
            </select>
          </div>

          <div class="topics-section">
            <div class="topics-header">
              <span class="topics-title">TOPICS</span>
              <FurlowButton size="sm" icon="fas fa-plus" @click="addMqttTopic">
                ADD TOPIC
              </FurlowButton>
            </div>

            <div class="topics-list">
              <div
                v-for="(topic, tIndex) in (pipes[editingPipe].topics as string[]) || []"
                :key="tIndex"
                class="topic-item"
              >
                <input
                  type="text"
                  class="input"
                  :value="topic"
                  placeholder="sensors/temperature"
                  @input="updateMqttTopic(tIndex, ($event.target as HTMLInputElement).value)"
                />
                <button class="remove-topic" @click="removeMqttTopic(tIndex)">
                  <i class="fas fa-times"></i>
                </button>
              </div>

              <div v-if="!((pipes[editingPipe].topics as string[]) || []).length" class="empty-topics">
                No topics subscribed
              </div>
            </div>
          </div>
        </template>

        <!-- TCP/UDP Pipe -->
        <template v-if="pipes[editingPipe].type === 'tcp' || pipes[editingPipe].type === 'udp'">
          <div class="inline-fields">
            <FurlowInput
              :model-value="(pipes[editingPipe].host as string) || ''"
              label="Host"
              placeholder="localhost"
              @update:model-value="updatePipe(editingPipe!, 'host', $event)"
            />
            <FurlowInput
              :model-value="(pipes[editingPipe].port as number) || ''"
              type="number"
              label="Port"
              placeholder="8080"
              @update:model-value="updatePipe(editingPipe!, 'port', $event)"
            />
          </div>

          <div class="input-group">
            <label class="input-label">Encoding</label>
            <select
              class="select"
              :value="(pipes[editingPipe].encoding as string) || 'utf8'"
              @change="updatePipe(editingPipe!, 'encoding', ($event.target as HTMLSelectElement).value)"
            >
              <option value="utf8">UTF-8</option>
              <option value="binary">Binary</option>
              <option value="hex">Hex</option>
              <option value="base64">Base64</option>
            </select>
          </div>
        </template>

        <!-- Database Pipe -->
        <template v-if="pipes[editingPipe].type === 'database'">
          <div class="input-group">
            <label class="input-label">Database Adapter</label>
            <select
              class="select"
              :value="(pipes[editingPipe].adapter as string) || 'postgres'"
              @change="updatePipe(editingPipe!, 'adapter', ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="adapter in dbAdapters" :key="adapter.value" :value="adapter.value">
                {{ adapter.label }}
              </option>
            </select>
          </div>

          <FurlowInput
            :model-value="(pipes[editingPipe].connection as string) || ''"
            label="Connection String"
            placeholder="postgres://user:pass@host:5432/db"
            hint="Use env vars: ${{ env.DATABASE_URL }}"
            @update:model-value="updatePipe(editingPipe!, 'connection', $event)"
          />

          <FurlowInput
            :model-value="(pipes[editingPipe].tables as string) || ''"
            label="Tables"
            placeholder="users, orders, products"
            hint="Comma-separated list of tables to access"
            @update:model-value="updatePipe(editingPipe!, 'tables', $event)"
          />
        </template>

        <!-- File Pipe -->
        <template v-if="pipes[editingPipe].type === 'file'">
          <FurlowInput
            :model-value="(pipes[editingPipe].path as string) || ''"
            label="Path"
            placeholder="./data"
            hint="File or directory path"
            @update:model-value="updatePipe(editingPipe!, 'path', $event)"
          />

          <div class="checkbox-row">
            <label class="checkbox">
              <input
                type="checkbox"
                :checked="Boolean(pipes[editingPipe].watch)"
                @change="updatePipe(editingPipe!, 'watch', ($event.target as HTMLInputElement).checked)"
              />
              <span>Watch for changes</span>
            </label>
            <label class="checkbox">
              <input
                type="checkbox"
                :checked="Boolean(pipes[editingPipe].hot_reload)"
                @change="updatePipe(editingPipe!, 'hot_reload', ($event.target as HTMLInputElement).checked)"
              />
              <span>Hot reload on change</span>
            </label>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pipes-builder {
  display: flex;
  flex-direction: column;
  gap: var(--sp-xl);
}

.pipes-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-md);
}

.pipes-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pipes-count {
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-dim);
  letter-spacing: 1px;
  text-transform: uppercase;
}

.pipe-types {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--sp-sm);
}

.pipe-type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--sp-xs);
  padding: var(--sp-md);
  background: var(--bg-raised);
  border: var(--border-solid);
  cursor: pointer;
  transition: all var(--transition-fast);
  text-align: center;
}

.pipe-type-btn:hover {
  border-color: var(--accent);
  background: var(--accent-faint);
}

.pipe-type-btn i {
  font-size: 20px;
  color: var(--accent-dim);
}

.pipe-type-btn:hover i {
  color: var(--accent);
}

.type-label {
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 600;
  color: var(--text-bright);
  letter-spacing: 1px;
}

.type-desc {
  font-size: 10px;
  color: var(--text-ghost);
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

.pipes-grid {
  display: flex;
  flex-direction: column;
  gap: var(--sp-sm);
}

.pipe-card {
  background: var(--bg-raised);
  border: var(--border-solid);
  padding: var(--sp-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.pipe-card:hover {
  border-color: var(--border-mid);
}

.pipe-card.active {
  border-color: var(--accent);
  background: var(--accent-faint);
}

.pipe-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pipe-info {
  display: flex;
  align-items: center;
  gap: var(--sp-sm);
}

.pipe-info i {
  color: var(--accent-dim);
  font-size: 12px;
}

.pipe-name {
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

.pipe-meta {
  display: flex;
  align-items: center;
  gap: var(--sp-md);
  margin-top: var(--sp-xs);
}

.pipe-type {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--accent-dim);
  text-transform: uppercase;
}

.pipe-url {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-ghost);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}

/* Editor */
.pipe-editor {
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
  display: flex;
  align-items: center;
  gap: var(--sp-sm);
}

.editor-title i {
  color: var(--accent);
}

.editor-fields {
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
  font-size: 11px;
  font-weight: 700;
  color: var(--text-ghost);
  letter-spacing: 1.5px;
  text-transform: uppercase;
}

.checkbox-row {
  display: flex;
  gap: var(--sp-lg);
  flex-wrap: wrap;
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

.inline-fields {
  display: flex;
  gap: var(--sp-md);
}

.inline-fields > * {
  flex: 1;
}

.fieldset {
  border: var(--border-dashed);
  padding: var(--sp-md);
}

.fieldset-title {
  font-family: var(--font-display);
  font-size: 10px;
  font-weight: 700;
  color: var(--text-ghost);
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-bottom: var(--sp-md);
}

/* Topics Section */
.topics-section {
  margin-top: var(--sp-md);
  padding-top: var(--sp-md);
  border-top: var(--border-dashed);
}

.topics-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sp-md);
}

.topics-title {
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 700;
  color: var(--text-ghost);
  letter-spacing: 2px;
}

.topics-list {
  display: flex;
  flex-direction: column;
  gap: var(--sp-xs);
}

.topic-item {
  display: flex;
  gap: var(--sp-xs);
  align-items: center;
}

.topic-item .input {
  flex: 1;
}

.remove-topic {
  background: none;
  border: none;
  color: var(--text-ghost);
  cursor: pointer;
  padding: var(--sp-xs);
}

.remove-topic:hover {
  color: var(--red);
}

.empty-topics {
  font-size: 11px;
  color: var(--text-ghost);
  padding: var(--sp-md);
  text-align: center;
  border: 1px dashed var(--border-mid);
}

/* Mobile responsive styles */
@media (max-width: 768px) {
  .pipes-builder {
    gap: var(--sp-lg);
  }

  .pipe-types {
    grid-template-columns: repeat(2, 1fr);
    gap: var(--sp-xs);
  }

  .pipe-type-btn {
    padding: var(--sp-sm);
  }

  .pipe-type-btn i {
    font-size: 16px;
  }

  .type-label {
    font-size: 10px;
  }

  .type-desc {
    font-size: 9px;
  }

  .pipe-editor {
    padding: var(--sp-md);
  }

  .editor-fields {
    gap: var(--sp-sm);
  }

  .inline-fields {
    flex-direction: column;
    gap: var(--sp-sm);
  }

  .fieldset {
    padding: var(--sp-sm);
  }

  .checkbox-row {
    flex-direction: column;
    gap: var(--sp-sm);
  }

  .topics-header {
    flex-wrap: wrap;
    gap: var(--sp-sm);
  }
}

@media (max-width: 480px) {
  .pipe-types {
    grid-template-columns: repeat(2, 1fr);
  }

  .pipe-type-btn {
    padding: var(--sp-xs);
  }

  .type-desc {
    display: none;
  }

  .pipes-count {
    font-size: 11px;
  }

  .pipe-card {
    padding: var(--sp-sm);
  }

  .pipe-name {
    font-size: 12px;
  }

  .pipe-url {
    max-width: 120px;
  }

  .editor-title {
    font-size: 11px;
    flex-wrap: wrap;
  }

  .topics-title {
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
