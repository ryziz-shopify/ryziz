import traverseModule from '@babel/traverse';

const traverse = traverseModule.default || traverseModule;

/**
 * Import Validator
 *
 * Validates that client code doesn't import server-only modules
 */
export const importValidator = {
  name: 'import-validator',

  validate(ast, filename) {
    const errors = [];

    // Server-only Node.js built-in modules
    const serverOnlyModules = [
      'fs', 'fs/promises',
      'path', 'os', 'crypto',
      'child_process', 'cluster',
      'net', 'http', 'https',
      'stream', 'zlib', 'dns',
      'dgram', 'readline', 'repl',
      'tls', 'v8', 'vm', 'worker_threads'
    ];

    traverse(ast, {
      ImportDeclaration(path) {
        const source = path.node.source.value;

        // Check if importing server-only module
        if (serverOnlyModules.includes(source)) {
          errors.push({
            file: filename,
            line: path.node.loc?.start.line,
            column: path.node.loc?.start.column,
            message: `Cannot import server-only module '${source}' in client code`,
            module: source
          });
        }

        // Check for Node.js protocol imports (node:fs, node:path)
        if (source.startsWith('node:')) {
          errors.push({
            file: filename,
            line: path.node.loc?.start.line,
            column: path.node.loc?.start.column,
            message: `Cannot import Node.js built-in '${source}' in client code`,
            module: source
          });
        }
      },

      // Also check dynamic imports
      CallExpression(path) {
        if (path.node.callee.type === 'Import') {
          const arg = path.node.arguments[0];

          if (arg && arg.type === 'StringLiteral') {
            const source = arg.value;

            if (serverOnlyModules.includes(source) || source.startsWith('node:')) {
              errors.push({
                file: filename,
                line: path.node.loc?.start.line,
                column: path.node.loc?.start.column,
                message: `Cannot dynamically import server-only module '${source}' in client code`,
                module: source
              });
            }
          }
        }
      }
    });

    return errors;
  }
};
