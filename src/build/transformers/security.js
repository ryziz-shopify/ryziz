import traverseModule from '@babel/traverse';
import { SecurityError } from '../transforms.js';

const traverse = traverseModule.default || traverseModule;

// Secret detection patterns
const SECRET_PATTERNS = [
  /^sk_live_[a-zA-Z0-9]{24,}$/,     // Stripe live key
  /^sk_test_[a-zA-Z0-9]{24,}$/,     // Stripe test key
  /^pk_live_[a-zA-Z0-9]{24,}$/,     // Stripe publishable
  /^[A-Za-z0-9]{32,}$/,             // Generic 32+ char key
  /^AIza[0-9A-Za-z_-]{35}$/,        // Google API key
  /^[0-9a-f]{40}$/,                 // GitHub token
];

const SUSPICIOUS_NAMES = [
  'secret', 'api_key', 'apikey', 'password',
  'private_key', 'privatekey', 'token', 'auth'
];

/**
 * Security Transformer
 * Removes server-only functions and scans for security issues
 */
export const securityTransformer = {
  name: 'security',

  transform(ast, context) {
    const { serverFunctions = ['loader', 'action', 'head'] } = context;
    const removedFunctions = [];
    const foundSecrets = [];

    traverse(ast, {
      ExportNamedDeclaration(path) {
        handleServerFunction(path, serverFunctions, removedFunctions);
      },
      VariableDeclarator(path) {
        detectSecrets(path, foundSecrets);
      },
      CallExpression(path) {
        detectEval(path, foundSecrets);
      }
    });

    if (foundSecrets.length > 0) {
      throwSecurityError(context.filename, foundSecrets);
    }

    return {
      removedFunctions,
      scannedForSecrets: true
    };
  }
};

/**
 * Remove server-only function exports
 */
function handleServerFunction(path, serverFunctions, removedFunctions) {
  const { declaration } = path.node;

  if (declaration?.type === 'FunctionDeclaration') {
    const functionName = declaration.id?.name;

    if (serverFunctions.includes(functionName)) {
      removedFunctions.push({
        name: functionName,
        line: path.node.loc?.start.line
      });

      path.addComment(
        'leading',
        ` [SECURITY] Server function '${functionName}' removed for security `
      );

      path.remove();
    }
  }
}

/**
 * Detect hardcoded secrets and API keys
 */
function detectSecrets(path, foundSecrets) {
  const { id, init } = path.node;

  if (init?.type === 'StringLiteral') {
    const value = init.value;
    const varName = id.name;

    const isSuspiciousValue = SECRET_PATTERNS.some(p => p.test(value));
    const isSuspiciousName = SUSPICIOUS_NAMES.some(n =>
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
}

/**
 * Detect dangerous eval() usage
 */
function detectEval(path, foundSecrets) {
  if (path.node.callee.name === 'eval') {
    foundSecrets.push({
      type: 'dangerous-code',
      line: path.node.loc?.start.line,
      message: 'eval() detected - potential security risk'
    });
  }
}

/**
 * Throw security error with formatted message
 */
function throwSecurityError(filename, foundSecrets) {
  const message = `🔒 Security issue detected in ${filename}!\n` +
    foundSecrets.map(s =>
      `  Line ${s.line}: ${s.variable || s.type} - ${s.reason || s.message}`
    ).join('\n');

  throw new SecurityError(message, foundSecrets);
}
