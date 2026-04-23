import type { Plugin } from 'vite';

export interface CocosDecoratorOptimizerOptions {
  optimize: boolean;
  removeEditorDecorators: boolean;
  fieldDecorators?: string[];
  editorDecorators?: string[];
}

const defaultFieldDecorators = [
  'property',
  'serializable',
  'formerlySerializedAs',
  'editorOnly',
  'uniquelyReferenced',
  'type',
  'override',
  'executeInEditMode',
  'menu',
  'playOnFocus',
  'inspector',
  'icon',
  'help',
  'editable',
  'visible',
  'readOnly',
  'displayName',
  'tooltip',
  'group',
  'range',
  'rangeMin',
  'rangeMax',
  'rangeStep',
  'slide',
  'displayOrder',
  'unit',
  'radian',
  'multiline',
  'disallowAnimation',
  'requireComponent',
  'executionOrder',
  'disallowMultiple',
  'allowReplicated',
  'ccclass',
];

const defaultEditorDecorators = [
  'executeInEditMode',
  'menu',
  'playOnFocus',
  'inspector',
  'icon',
  'help',
  'editable',
  'visible',
  'readOnly',
  'displayName',
  'tooltip',
  'group',
  'range',
  'rangeMin',
  'rangeMax',
  'rangeStep',
  'slide',
  'displayOrder',
  'unit',
  'radian',
  'multiline',
  'disallowAnimation',
];

export function cocosDecoratorOptimizer(options: CocosDecoratorOptimizerOptions): Plugin {
  const {
    optimize,
    removeEditorDecorators,
    fieldDecorators = defaultFieldDecorators,
    editorDecorators = defaultEditorDecorators,
  } = options;

  const decoratorsToRemove = removeEditorDecorators ? editorDecorators : [];
  const decoratorsToOptimize = optimize ? fieldDecorators : [];

  return {
    name: 'vite-plugin-cocos-decorator-optimizer',
    
    enforce: 'post',
    
    transform(code, id) {
      if (!id.endsWith('.ts') && !id.endsWith('.js')) {
        return null;
      }

      if (decoratorsToRemove.length === 0 && decoratorsToOptimize.length === 0) {
        return null;
      }

      let modified = false;
      let result = code;

      for (const decorator of decoratorsToRemove) {
        const decoratorRegex = new RegExp(
          `@\\s*${decorator}\\s*(?:\\([^)]*\\))?\\s*`,
          'g'
        );
        if (decoratorRegex.test(result)) {
          result = result.replace(decoratorRegex, '');
          modified = true;
        }
      }

      if (!modified) {
        return null;
      }

      return {
        code: result,
        map: null,
      };
    },
  };
}

export default cocosDecoratorOptimizer;
