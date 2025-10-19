import traverseModule from '@babel/traverse';
import * as t from '@babel/types';

const traverse = traverseModule.default || traverseModule;

/**
 * React Global Transformer
 *
 * Auto-detects ALL React imports and replaces with window.React references
 * Supports:
 * - Default imports: import React from 'react'
 * - Named imports: import { useState, useEffect } from 'react'
 * - Renamed imports: import { useState as useS } from 'react'
 * - Namespace imports: import * as React from 'react'
 * - react-dom/client imports
 */
export const reactGlobalTransformer = {
  name: 'react-global',

  transform(ast, context) {
    const imports = new Map(); // local name -> { source, imported }
    const importSources = new Set();

    // Step 1: Collect all React-related imports
    traverse(ast, {
      ImportDeclaration(path) {
        const source = path.node.source.value;

        // Match react, react/, react-dom
        if (source === 'react' ||
            source.startsWith('react/') ||
            source === 'react-dom' ||
            source.startsWith('react-dom/')) {

          importSources.add(source);

          // Process each import specifier
          path.node.specifiers.forEach(spec => {
            if (spec.type === 'ImportDefaultSpecifier') {
              // import React from 'react'
              imports.set(spec.local.name, {
                source,
                imported: 'default',
                type: 'default'
              });
            } else if (spec.type === 'ImportSpecifier') {
              // import { useState } from 'react'
              // import { useState as useS } from 'react'
              imports.set(spec.local.name, {
                source,
                imported: spec.imported.name,
                type: 'named'
              });
            } else if (spec.type === 'ImportNamespaceSpecifier') {
              // import * as React from 'react'
              imports.set(spec.local.name, {
                source,
                imported: '*',
                type: 'namespace'
              });
            }
          });

          // Remove the import statement
          path.remove();
        }
      }
    });

    // Step 2: Generate global variable declarations
    if (imports.size > 0) {
      const declarations = generateGlobalDeclarations(imports);

      // Insert at the beginning of the file
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
 * Generate AST nodes for global variable declarations
 */
function generateGlobalDeclarations(imports) {
  const declarations = [];

  for (const [localName, info] of imports) {
    let declaration;

    if (info.source === 'react') {
      if (info.type === 'default' || info.type === 'namespace') {
        // const React = window.React;
        declaration = t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier(localName),
            t.memberExpression(
              t.identifier('window'),
              t.identifier('React')
            )
          )
        ]);
      } else {
        // const { useState } = window.React;
        // const useState = window.React.useState;
        declaration = t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier(localName),
            t.memberExpression(
              t.memberExpression(
                t.identifier('window'),
                t.identifier('React')
              ),
              t.identifier(info.imported)
            )
          )
        ]);
      }
    } else if (info.source === 'react-dom/client') {
      if (info.type === 'default' || info.type === 'namespace') {
        // const ReactDOM = window.ReactDOM;
        declaration = t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier(localName),
            t.memberExpression(
              t.identifier('window'),
              t.identifier('ReactDOM')
            )
          )
        ]);
      } else {
        // const { createRoot } = window.ReactDOM;
        declaration = t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier(localName),
            t.memberExpression(
              t.memberExpression(
                t.identifier('window'),
                t.identifier('ReactDOM')
              ),
              t.identifier(info.imported)
            )
          )
        ]);
      }
    } else if (info.source === 'react/jsx-runtime' || info.source === 'react/jsx-dev-runtime') {
      // Handle jsx/jsxs/Fragment from jsx-runtime
      if (info.imported === 'jsx' || info.imported === 'jsxs') {
        declaration = t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier(localName),
            t.memberExpression(
              t.memberExpression(
                t.identifier('window'),
                t.identifier('React')
              ),
              t.identifier('createElement')
            )
          )
        ]);
      } else if (info.imported === 'Fragment') {
        declaration = t.variableDeclaration('const', [
          t.variableDeclarator(
            t.identifier(localName),
            t.memberExpression(
              t.memberExpression(
                t.identifier('window'),
                t.identifier('React')
              ),
              t.identifier('Fragment')
            )
          )
        ]);
      }
    }

    if (declaration) {
      declarations.push(declaration);
    }
  }

  return declarations;
}
