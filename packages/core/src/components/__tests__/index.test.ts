/**
 * Component Manager Tests
 *
 * Tests for UI component building (buttons, selects, modals)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ComponentManager, createComponentManager } from '../index.js';
import type { ExpressionEvaluator } from '../../expression/evaluator.js';

/**
 * Create a mock expression evaluator
 */
function createMockEvaluator(): ExpressionEvaluator {
  return {
    evaluate: vi.fn().mockImplementation((expr: string, context: Record<string, unknown>) => {
      // Simple evaluation - just return the expression result from context if it's a simple key
      if (context[expr]) return context[expr];
      return expr;
    }),
    interpolate: vi.fn().mockImplementation((template: string, context: Record<string, unknown>) => {
      // Simple interpolation - replace ${key} with context values
      return template.replace(/\$\{(\w+)\}/g, (_, key) => String(context[key] ?? ''));
    }),
  } as unknown as ExpressionEvaluator;
}

describe('ComponentManager', () => {
  let manager: ComponentManager;
  let evaluator: ExpressionEvaluator;
  const context = { username: 'TestUser', role: 'Admin', count: 42 };

  beforeEach(() => {
    manager = new ComponentManager();
    evaluator = createMockEvaluator();
  });

  describe('createComponentManager', () => {
    it('should create a new ComponentManager instance', () => {
      const created = createComponentManager();
      expect(created).toBeInstanceOf(ComponentManager);
    });
  });

  describe('register', () => {
    it('should register buttons', () => {
      manager.register({
        buttons: {
          confirm: { style: 'success', label: 'Confirm', custom_id: 'btn_confirm' },
          cancel: { style: 'danger', label: 'Cancel', custom_id: 'btn_cancel' },
        },
      });

      expect(manager.getButton('confirm')).toBeDefined();
      expect(manager.getButton('cancel')).toBeDefined();
    });

    it('should register selects', () => {
      manager.register({
        selects: {
          role_picker: {
            type: 'role_select',
            custom_id: 'select_role',
            placeholder: 'Choose a role',
          },
        },
      });

      expect(manager.getSelect('role_picker')).toBeDefined();
    });

    it('should register modals', () => {
      manager.register({
        modals: {
          feedback: {
            custom_id: 'modal_feedback',
            title: 'Feedback',
            components: [
              {
                components: [
                  {
                    type: 'text_input',
                    custom_id: 'feedback_text',
                    label: 'Your feedback',
                    style: 'paragraph',
                  },
                ],
              },
            ],
          },
        },
      });

      expect(manager.getModal('feedback')).toBeDefined();
    });

    it('should register all component types at once', () => {
      manager.register({
        buttons: { btn1: { label: 'Button', custom_id: 'b1' } },
        selects: { sel1: { type: 'string_select', custom_id: 's1' } },
        modals: {
          mod1: {
            custom_id: 'm1',
            title: 'Modal',
            components: [],
          },
        },
      });

      expect(manager.getButton('btn1')).toBeDefined();
      expect(manager.getSelect('sel1')).toBeDefined();
      expect(manager.getModal('mod1')).toBeDefined();
    });

    it('should overwrite existing components with same name', () => {
      manager.register({
        buttons: { confirm: { label: 'Old', custom_id: 'old' } },
      });
      manager.register({
        buttons: { confirm: { label: 'New', custom_id: 'new' } },
      });

      expect(manager.getButton('confirm')?.custom_id).toBe('new');
    });
  });

  describe('getButton', () => {
    it('should return undefined for non-existent button', () => {
      expect(manager.getButton('nonexistent')).toBeUndefined();
    });

    it('should return registered button', () => {
      manager.register({
        buttons: { test: { label: 'Test', custom_id: 'test_btn' } },
      });

      const button = manager.getButton('test');
      expect(button).toEqual({ label: 'Test', custom_id: 'test_btn' });
    });
  });

  describe('getSelect', () => {
    it('should return undefined for non-existent select', () => {
      expect(manager.getSelect('nonexistent')).toBeUndefined();
    });

    it('should return registered select', () => {
      manager.register({
        selects: { picker: { type: 'user_select', custom_id: 'user_picker' } },
      });

      const select = manager.getSelect('picker');
      expect(select).toEqual({ type: 'user_select', custom_id: 'user_picker' });
    });
  });

  describe('getModal', () => {
    it('should return undefined for non-existent modal', () => {
      expect(manager.getModal('nonexistent')).toBeUndefined();
    });

    it('should return registered modal', () => {
      manager.register({
        modals: {
          test: { custom_id: 'test_modal', title: 'Test', components: [] },
        },
      });

      const modal = manager.getModal('test');
      expect(modal?.title).toBe('Test');
    });
  });

  describe('buildButton', () => {
    it('should build button with default style', async () => {
      const config = { custom_id: 'btn1', label: 'Click me' };
      const result = await manager.buildButton(config, context, evaluator);

      expect(result.type).toBe(2);
      expect(result.style).toBe(1); // primary = 1
      expect(result.custom_id).toBe('btn1');
      expect(result.label).toBe('Click me');
    });

    it('should map button styles correctly', async () => {
      const styles = [
        { style: 'primary', expected: 1 },
        { style: 'secondary', expected: 2 },
        { style: 'success', expected: 3 },
        { style: 'danger', expected: 4 },
        { style: 'link', expected: 5 },
      ];

      for (const { style, expected } of styles) {
        const result = await manager.buildButton(
          { custom_id: 'btn', style },
          context,
          evaluator
        );
        expect(result.style).toBe(expected);
      }
    });

    it('should default to primary for unknown style', async () => {
      const result = await manager.buildButton(
        { custom_id: 'btn', style: 'unknown' as any },
        context,
        evaluator
      );
      expect(result.style).toBe(1);
    });

    it('should interpolate label', async () => {
      const config = { custom_id: 'btn', label: 'Hello ${username}!' };
      const result = await manager.buildButton(config, context, evaluator);

      expect(evaluator.interpolate).toHaveBeenCalledWith('Hello ${username}!', context);
      expect(result.label).toBe('Hello TestUser!');
    });

    it('should parse custom emoji', async () => {
      const config = { custom_id: 'btn', emoji: '<:custom:123456789>' };
      const result = await manager.buildButton(config, context, evaluator);

      expect(result.emoji).toEqual({
        name: 'custom',
        id: '123456789',
        animated: false,
      });
    });

    it('should parse animated emoji', async () => {
      const config = { custom_id: 'btn', emoji: '<a:dance:987654321>' };
      const result = await manager.buildButton(config, context, evaluator);

      expect(result.emoji).toEqual({
        name: 'dance',
        id: '987654321',
        animated: true,
      });
    });

    it('should handle unicode emoji', async () => {
      const config = { custom_id: 'btn', emoji: '🎉' };
      const result = await manager.buildButton(config, context, evaluator);

      expect(result.emoji).toEqual({ name: '🎉' });
    });

    it('should interpolate URL', async () => {
      const config = { style: 'link', url: 'https://example.com/${username}' };
      const result = await manager.buildButton(config, context, evaluator);

      expect(result.url).toBe('https://example.com/TestUser');
    });

    it('should include disabled flag when true', async () => {
      const config = { custom_id: 'btn', disabled: true };
      const result = await manager.buildButton(config, context, evaluator);

      expect(result.disabled).toBe(true);
    });

    it('should not include disabled when not set', async () => {
      const config = { custom_id: 'btn' };
      const result = await manager.buildButton(config, context, evaluator);

      expect(result.disabled).toBeUndefined();
    });
  });

  describe('buildSelect', () => {
    it('should build string select with correct type', async () => {
      const config = {
        type: 'string_select',
        custom_id: 'select1',
      };
      const result = await manager.buildSelect(config, context, evaluator);

      expect(result.type).toBe(3); // string_select = 3
      expect(result.custom_id).toBe('select1');
    });

    it('should map select types correctly', async () => {
      const types = [
        { type: 'select', expected: 3 },
        { type: 'string_select', expected: 3 },
        { type: 'user_select', expected: 5 },
        { type: 'role_select', expected: 6 },
        { type: 'mentionable_select', expected: 7 },
        { type: 'channel_select', expected: 8 },
      ];

      for (const { type, expected } of types) {
        const result = await manager.buildSelect(
          { type, custom_id: 'sel' },
          context,
          evaluator
        );
        expect(result.type).toBe(expected);
      }
    });

    it('should default to string_select for unknown type', async () => {
      const result = await manager.buildSelect(
        { type: 'unknown' as any, custom_id: 'sel' },
        context,
        evaluator
      );
      expect(result.type).toBe(3);
    });

    it('should interpolate placeholder', async () => {
      const config = {
        type: 'string_select',
        custom_id: 'sel',
        placeholder: 'Select for ${username}',
      };
      const result = await manager.buildSelect(config, context, evaluator);

      expect(result.placeholder).toBe('Select for TestUser');
    });

    it('should include min_values and max_values', async () => {
      const config = {
        type: 'string_select',
        custom_id: 'sel',
        min_values: 1,
        max_values: 3,
      };
      const result = await manager.buildSelect(config, context, evaluator);

      expect(result.min_values).toBe(1);
      expect(result.max_values).toBe(3);
    });

    it('should include disabled flag', async () => {
      const config = {
        type: 'string_select',
        custom_id: 'sel',
        disabled: true,
      };
      const result = await manager.buildSelect(config, context, evaluator);

      expect(result.disabled).toBe(true);
    });

    it('should build options array', async () => {
      const config = {
        type: 'string_select',
        custom_id: 'sel',
        options: [
          { label: 'Option 1', value: 'opt1' },
          { label: 'Option 2', value: 'opt2', description: 'Second option' },
        ],
      };
      const result = await manager.buildSelect(config, context, evaluator);

      expect(result.options).toHaveLength(2);
      expect((result.options as any[])[0].label).toBe('Option 1');
      expect((result.options as any[])[1].description).toBe('Second option');
    });

    it('should interpolate option labels and values', async () => {
      const config = {
        type: 'string_select',
        custom_id: 'sel',
        options: [
          { label: '${username}', value: '${role}' },
        ],
      };
      const result = await manager.buildSelect(config, context, evaluator);

      expect((result.options as any[])[0].label).toBe('TestUser');
      expect((result.options as any[])[0].value).toBe('Admin');
    });

    it('should parse emoji in options', async () => {
      const config = {
        type: 'string_select',
        custom_id: 'sel',
        options: [
          { label: 'Option', value: 'opt', emoji: '✅' },
        ],
      };
      const result = await manager.buildSelect(config, context, evaluator);

      expect((result.options as any[])[0].emoji).toEqual({ name: '✅' });
    });

    it('should include default flag in options', async () => {
      const config = {
        type: 'string_select',
        custom_id: 'sel',
        options: [
          { label: 'Default', value: 'def', default: true },
        ],
      };
      const result = await manager.buildSelect(config, context, evaluator);

      expect((result.options as any[])[0].default).toBe(true);
    });

    it('should evaluate options from expression string', async () => {
      const evaluatorWithOptions = {
        ...evaluator,
        evaluate: vi.fn().mockResolvedValue([
          { label: 'Dynamic 1', value: 'd1' },
          { label: 'Dynamic 2', value: 'd2' },
        ]),
      } as unknown as ExpressionEvaluator;

      const config = {
        type: 'string_select',
        custom_id: 'sel',
        options: 'dynamicOptions' as any, // Expression string
      };
      const result = await manager.buildSelect(config, context, evaluatorWithOptions);

      expect(evaluatorWithOptions.evaluate).toHaveBeenCalledWith('dynamicOptions', context);
      expect(result.options).toHaveLength(2);
    });
  });

  describe('buildModal', () => {
    it('should build modal with correct structure', async () => {
      const config = {
        custom_id: 'modal1',
        title: 'Test Modal',
        components: [
          {
            components: [
              {
                type: 'text_input' as const,
                custom_id: 'input1',
                label: 'Name',
                style: 'short' as const,
              },
            ],
          },
        ],
      };
      const result = await manager.buildModal(config, context, evaluator);

      expect(result.custom_id).toBe('modal1');
      expect(result.title).toBe('Test Modal');
      expect(result.components).toHaveLength(1);
    });

    it('should interpolate title', async () => {
      const config = {
        custom_id: 'modal1',
        title: 'Hello ${username}',
        components: [],
      };
      const result = await manager.buildModal(config, context, evaluator);

      expect(result.title).toBe('Hello TestUser');
    });

    it('should build action rows with type 1', async () => {
      const config = {
        custom_id: 'modal1',
        title: 'Test',
        components: [
          { components: [{ type: 'text_input' as const, custom_id: 'in', label: 'L' }] },
        ],
      };
      const result = await manager.buildModal(config, context, evaluator);

      expect((result.components as any[])[0].type).toBe(1);
    });

    it('should build text input with short style', async () => {
      const config = {
        custom_id: 'modal1',
        title: 'Test',
        components: [
          {
            components: [
              {
                type: 'text_input' as const,
                custom_id: 'input',
                label: 'Short input',
                style: 'short' as const,
              },
            ],
          },
        ],
      };
      const result = await manager.buildModal(config, context, evaluator);

      const input = (result.components as any[])[0].components[0];
      expect(input.type).toBe(4); // Text input type
      expect(input.style).toBe(1); // Short style
    });

    it('should build text input with paragraph style', async () => {
      const config = {
        custom_id: 'modal1',
        title: 'Test',
        components: [
          {
            components: [
              {
                type: 'text_input' as const,
                custom_id: 'input',
                label: 'Long input',
                style: 'paragraph' as const,
              },
            ],
          },
        ],
      };
      const result = await manager.buildModal(config, context, evaluator);

      const input = (result.components as any[])[0].components[0];
      expect(input.style).toBe(2); // Paragraph style
    });

    it('should interpolate text input label', async () => {
      const config = {
        custom_id: 'modal1',
        title: 'Test',
        components: [
          {
            components: [
              {
                type: 'text_input' as const,
                custom_id: 'input',
                label: 'Name for ${role}',
              },
            ],
          },
        ],
      };
      const result = await manager.buildModal(config, context, evaluator);

      const input = (result.components as any[])[0].components[0];
      expect(input.label).toBe('Name for Admin');
    });

    it('should interpolate placeholder', async () => {
      const config = {
        custom_id: 'modal1',
        title: 'Test',
        components: [
          {
            components: [
              {
                type: 'text_input' as const,
                custom_id: 'input',
                label: 'Input',
                placeholder: 'Enter ${count} items',
              },
            ],
          },
        ],
      };
      const result = await manager.buildModal(config, context, evaluator);

      const input = (result.components as any[])[0].components[0];
      expect(input.placeholder).toBe('Enter 42 items');
    });

    it('should interpolate default value', async () => {
      const config = {
        custom_id: 'modal1',
        title: 'Test',
        components: [
          {
            components: [
              {
                type: 'text_input' as const,
                custom_id: 'input',
                label: 'Input',
                value: 'Hello ${username}',
              },
            ],
          },
        ],
      };
      const result = await manager.buildModal(config, context, evaluator);

      const input = (result.components as any[])[0].components[0];
      expect(input.value).toBe('Hello TestUser');
    });

    it('should include validation attributes', async () => {
      const config = {
        custom_id: 'modal1',
        title: 'Test',
        components: [
          {
            components: [
              {
                type: 'text_input' as const,
                custom_id: 'input',
                label: 'Input',
                min_length: 5,
                max_length: 100,
                required: true,
              },
            ],
          },
        ],
      };
      const result = await manager.buildModal(config, context, evaluator);

      const input = (result.components as any[])[0].components[0];
      expect(input.min_length).toBe(5);
      expect(input.max_length).toBe(100);
      expect(input.required).toBe(true);
    });

    it('should handle multiple action rows', async () => {
      const config = {
        custom_id: 'modal1',
        title: 'Test',
        components: [
          {
            components: [
              { type: 'text_input' as const, custom_id: 'in1', label: 'First' },
            ],
          },
          {
            components: [
              { type: 'text_input' as const, custom_id: 'in2', label: 'Second' },
            ],
          },
        ],
      };
      const result = await manager.buildModal(config, context, evaluator);

      expect(result.components).toHaveLength(2);
      expect((result.components as any[])[0].components[0].label).toBe('First');
      expect((result.components as any[])[1].components[0].label).toBe('Second');
    });

    it('should pass through non-text-input components unchanged', async () => {
      const customComponent = { type: 'custom', data: 'value' };
      const config = {
        custom_id: 'modal1',
        title: 'Test',
        components: [
          { components: [customComponent as any] },
        ],
      };
      const result = await manager.buildModal(config, context, evaluator);

      const comp = (result.components as any[])[0].components[0];
      expect(comp).toEqual(customComponent);
    });
  });
});
