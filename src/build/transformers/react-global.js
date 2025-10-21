import traverseModule from '@babel/traverse';
import * as t from '@babel/types';

const traverse = traverseModule.default || traverseModule;

// Map import sources to global variable names
const SOURCE_TO_GLOBAL = {
  'react': 'React',
  'react-dom/client': 'ReactDOM',
  'react/jsx-runtime': 'React',
  'react/jsx-dev-runtime': 'React'
};

// Map special jsx-runtime imports to React methods
const JSX_RUNTIME_MAP = {
  'jsx': 'createElement',
  'jsxs': 'createElement',
  'Fragment': 'Fragment'
};

/**
 * React Global Transformer
 * Auto-detects React imports and replaces with window.React references
 */
export const reactGlobalTransformer = {
  name: 'react-global',

  transform(ast, context) {
    const imports = new Map();
    const importSources = new Set();

    // Step 1: Collect all React-related imports
    traverse(ast, {
      ImportDeclaration(path) {
        const source = path.node.source.value;

        if (isReactImport(source)) {
          importSources.add(source);
          collectImports(path.node, source, imports);
          path.remove();
        }
      }
    });

    // Step 2: Generate global variable declarations
    if (imports.size > 0) {
      const declarations = generateDeclarations(imports);
      ast.program.body.unshift(...declarations);
    }

    return {
      imports: Array.from(imports.entries()).map(([local, info]) => ({
        local,
        source: info.source,
        imported: info.imported
      })),
      importSources: Array.from(importSources)
    };
  }
};

/**
 * Check if import is React-related
 */
function isReactImport(source) {
  return source === 'react' ||
         source.startsWith('react/') ||
         source === 'react-dom' ||
         source.startsWith('react-dom/');
}

/**
 * Collect import specifiers into map
 */
function collectImports(node, source, imports) {
  node.specifiers.forEach(spec => {
    if (spec.type === 'ImportDefaultSpecifier') {
      imports.set(spec.local.name, {
        source,
        imported: 'default',
        type: 'default'
      });
    } else if (spec.type === 'ImportSpecifier') {
      imports.set(spec.local.name, {
        source,
        imported: spec.imported.name,
        type: 'named'
      });
    } else if (spec.type === 'ImportNamespaceSpecifier') {
      imports.set(spec.local.name, {
        source,
        imported: '*',
        type: 'namespace'
      });
    }
  });
}

/**
 * Generate global variable declarations
 */
function generateDeclarations(imports) {
  const declarations = [];

  for (const [localName, info] of imports) {
    const declaration = createDeclaration(localName, info);
    if (declaration) {
      declarations.push(declaration);
    }
  }

  return declarations;
}

/**
 * Create single variable declaration
 */
function createDeclaration(localName, info) {
  const globalName = SOURCE_TO_GLOBAL[info.source];
  if (!globalName) return null;

  // Handle jsx-runtime special cases
  if (info.source.includes('jsx-runtime')) {
    const mappedName = JSX_RUNTIME_MAP[info.imported];
    if (mappedName) {
      return createVarDeclaration(localName, globalName, mappedName);
    }
    return null;
  }

  // Default or namespace: const React = window.React
  if (info.type === 'default' || info.type === 'namespace') {
    return createVarDeclaration(localName, globalName);
  }

  // Named: const useState = window.React.useState
  return createVarDeclaration(localName, globalName, info.imported);
}

/**
 * Create AST variable declaration node
 */
function createVarDeclaration(localName, globalName, property = null) {
  let init = t.memberExpression(
    t.identifier('window'),
    t.identifier(globalName)
  );

  if (property) {
    init = t.memberExpression(init, t.identifier(property));
  }

  return t.variableDeclaration('const', [
    t.variableDeclarator(t.identifier(localName), init)
  ]);
}
