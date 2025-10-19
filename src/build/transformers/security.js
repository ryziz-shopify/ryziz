import traverseModule from '@babel/traverse';
import { SecurityError } from '../transforms.js';

const traverse = traverseModule.default || traverseModule;

/**
 * Security Transformer
 *
 * Removes server-only functions and scans for security issues
 */
export const securityTransformer = {
  name: 'security',

  transform(ast, context) {
    const { serverFunctions = ['loader', 'action', 'head'] } = context;
    const removedFunctions = [];
    const foundSecrets = [];

    traverse(ast, {
      // Remove server-only function exports
      ExportNamedDeclaration(path) {
        const { declaration } = path.node;

        if (declaration && declaration.type === 'FunctionDeclaration') {
          const functionName = declaration.id?.name;

          if (serverFunctions.includes(functionName)) {
            removedFunctions.push({
              name: functionName,
              line: path.node.loc?.start.line
            });

            // Add comment for transparency
            path.addComment(
              'leading',
              ` [SECURITY] Server function '${functionName}' removed for security `
            );

            path.remove();
          }
        }
      },

      // Scan for hardcoded secrets/API keys
      VariableDeclarator(path) {
        const { id, init } = path.node;

        if (init && init.type === 'StringLiteral') {
          const value = init.value;
          const varName = id.name;

          // Detect common secret patterns
          const secretPatterns = [
            /^sk_live_[a-zA-Z0-9]{24,}$/,     // Stripe live key
            /^sk_test_[a-zA-Z0-9]{24,}$/,     // Stripe test key
            /^pk_live_[a-zA-Z0-9]{24,}$/,     // Stripe publishable
            /^[A-Za-z0-9]{32,}$/,             // Generic 32+ char key
            /^AIza[0-9A-Za-z_-]{35}$/,        // Google API key
            /^[0-9a-f]{40}$/,                 // GitHub token
          ];

          // Also check variable names
          const suspiciousNames = [
            'secret', 'api_key', 'apikey', 'password',
            'private_key', 'privatekey', 'token', 'auth'
          ];

          const isSuspiciousValue = secretPatterns.some(p => p.test(value));
          const isSuspiciousName = suspiciousNames.some(n =>
            varName.toLowerCase().includes(n)
          );

          if (isSuspiciousValue || (isSuspiciousName && value.length > 20)) {
            foundSecrets.push({
              variable: varName,
              line: path.node.loc?.start.line,
              preview: value.substring(0, 10) + '...',
              reason: isSuspiciousValue ? 'Pattern match' : 'Variable name + length'
            });
          }
        }
      },

      // Scan for dangerous eval() usage
      CallExpression(path) {
        if (path.node.callee.name === 'eval') {
          foundSecrets.push({
            type: 'dangerous-code',
            line: path.node.loc?.start.line,
            message: 'eval() detected - potential security risk'
          });
        }
      }
    });

    // Block build if secrets found
    if (foundSecrets.length > 0) {
      throw new SecurityError(
        `🔒 Security issue detected in ${context.filename}!\n` +
        foundSecrets.map(s =>
          `  Line ${s.line}: ${s.variable || s.type} - ${s.reason || s.message}`
        ).join('\n'),
        foundSecrets
      );
    }

    return {
      removedFunctions,
      scannedForSecrets: true
    };
  }
};
