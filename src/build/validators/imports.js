import traverseModule from '@babel/traverse';

const traverse = traverseModule.default || traverseModule;

// Server-only Node.js built-in modules
const SERVER_MODULES = [
  'fs', 'fs/promises', 'path', 'os', 'crypto',
  'child_process', 'cluster', 'net', 'http', 'https',
  'stream', 'zlib', 'dns', 'dgram', 'readline',
  'repl', 'tls', 'v8', 'vm', 'worker_threads'
];

/**
 * Import Validator
 * Validates that client code doesn't import server-only modules
 */
export const importValidator = {
  name: 'import-validator',

  validate(ast, filename) {
    const errors = [];

    traverse(ast, {
      // Check static imports
      ImportDeclaration(path) {
        const source = path.node.source.value;
        if (isServerModule(source)) {
          errors.push(createError(filename, path.node, source));
        }
      },

      // Check dynamic imports
      CallExpression(path) {
        if (path.node.callee.type === 'Import') {
          const arg = path.node.arguments[0];
          if (arg?.type === 'StringLiteral') {
            const source = arg.value;
            if (isServerModule(source)) {
              errors.push(createError(filename, path.node, source));
            }
          }
        }
      }
    });

    return errors;
  }
};

/**
 * Check if module is server-only
 */
function isServerModule(source) {
  return SERVER_MODULES.includes(source) || source.startsWith('node:');
}

/**
 * Create error object
 */
function createError(filename, node, source) {
  return {
    file: filename,
    line: node.loc?.start.line,
    column: node.loc?.start.column,
    message: `Cannot import server-only module '${source}' in client code`,
    module: source
  };
}
