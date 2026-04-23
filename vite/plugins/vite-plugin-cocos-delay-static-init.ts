import type { Plugin } from 'vite';

export interface CocosDelayStaticInitOptions {}

const FREEZE_FUNC_NAMES = ['freezeVec2', 'freezeVec3', 'freezeVec4', 'freezeQuat', 'freezeColor'];

export function cocosDelayStaticInit(options: CocosDelayStaticInitOptions = {}): Plugin {
  return {
    name: 'vite-plugin-cocos-delay-static-init',
    enforce: 'pre',

    transform(code, id) {
      return null;
    },

    renderChunk(code, chunk) {
      let modified = code;
      let changed = false;

      for (const freezeFuncName of FREEZE_FUNC_NAMES) {
        const funcDefPattern = new RegExp(
          `function ${freezeFuncName}\\s*\\(\\s*([^)]*)\\s*\\)\\s*\\{\\s*return\\s+Object\\.freeze\\s*\\(\\s*new\\s+\\w+\\s*\\(([^)]*)\\)\\s*\\)\\s*;\\s*\\}`,
          'g'
        );

        const callPattern = new RegExp(
          `(\\w+)\\.((?:ZERO|ONE|NEG_ONE|UNIT_[XYZW]|RIGHT|UP|FORWARD|IDENTITY|WHITE|GRAY|BLACK|TRANSPARENT|RED|GREEN|BLUE|CYAN|MAGENTA|YELLOW))\\s*=\\s*${freezeFuncName}\\s*\\(([^)]*)\\)\\s*;`,
          'g'
        );

        const callMatches = [...modified.matchAll(callPattern)];
        if (callMatches.length === 0) continue;

        const actualVarName = callMatches[0][1];

        modified = modified.replace(callPattern, (_match, varName, propName, args) => {
          changed = true;
          return `${varName}.${propName} = Object.freeze(new ${varName}(${args}));`;
        });

        modified = modified.replace(funcDefPattern, () => {
          changed = true;
          return '';
        });
      }

      if (!changed) {
        return null;
      }

      return {
        code: modified,
        map: null,
      };
    },
  };
}
