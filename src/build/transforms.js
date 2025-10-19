import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import generateModule from '@babel/generator';

// Handle ESM/CJS compatibility
const traverse = traverseModule.default || traverseModule;
const generate = generateModule.default || generateModule;

/**
 * Custom Error Classes
 */
export class ValidationError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export class SecurityError extends Error {
  constructor(message, secrets = []) {
    super(message);
    this.name = 'SecurityError';
    this.secrets = secrets;
  }
}

export class TransformError extends Error {
  constructor(message, filename, cause) {
    super(message);
    this.name = 'TransformError';
    this.filename = filename;
    this.cause = cause;
  }
}

/**
 * AST-First Code Transform Pipeline
 *
 * Philosophy:
 * - Single AST parse per file
 * - Validators run before transformers
 * - Composable transformers
 * - Clear error reporting
 * - End-user freedom
 */
export class CodeTransformPipeline {
  constructor() {
    this.transformers = [];
    this.validators = [];
  }

  /**
   * Add a transformer to the pipeline
   * Transformers modify the AST
   */
  use(transformer) {
    if (!transformer || typeof transformer.transform !== 'function') {
      throw new Error('Transformer must have a transform() method');
    }
    this.transformers.push(transformer);
    return this;
  }

  /**
   * Add a validator to the pipeline
   * Validators check the AST and return errors
   */
  validate(validator) {
    if (!validator || typeof validator.validate !== 'function') {
      throw new Error('Validator must have a validate() method');
    }
    this.validators.push(validator);
    return this;
  }

  /**
   * Transform source code through the pipeline
   *
   * @param {string} source - Source code
   * @param {string} filename - Filename for error reporting
   * @param {object} context - Additional context for transformers
   * @returns {object} - { code, map, metadata }
   */
  async transform(source, filename, context = {}) {
    try {
      // Step 1: Parse source code to AST (once!)
      const ast = parse(source, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript'],
        errorRecovery: true
      });

      // Step 2: Run validators BEFORE transforming
      const allErrors = [];

      for (const validator of this.validators) {
        try {
          const errors = validator.validate(ast, filename, context);
          if (errors && errors.length > 0) {
            allErrors.push(...errors);
          }
        } catch (error) {
          allErrors.push({
            validator: validator.name,
            message: error.message,
            file: filename
          });
        }
      }

      // Fail fast if validation errors
      if (allErrors.length > 0) {
        throw new ValidationError(
          `Validation failed for ${filename}`,
          allErrors
        );
      }

      // Step 3: Apply transformers in order
      const metadata = {};

      for (const transformer of this.transformers) {
        try {
          const result = transformer.transform(ast, {
            ...context,
            filename,
            metadata
          });

          // Store transformer results in metadata
          if (result) {
            metadata[transformer.name] = result;
          }
        } catch (error) {
          throw new TransformError(
            `Transformer '${transformer.name}' failed`,
            filename,
            error
          );
        }
      }

      // Step 4: Generate code from transformed AST (once!)
      const output = generate(ast, {
        retainLines: true,
        comments: true,
        compact: false
      });

      return {
        code: output.code,
        map: output.map,
        metadata
      };

    } catch (error) {
      // Re-throw custom errors
      if (error instanceof ValidationError ||
          error instanceof SecurityError ||
          error instanceof TransformError) {
        throw error;
      }

      // Wrap unknown errors
      throw new TransformError(
        `Failed to transform ${filename}`,
        filename,
        error
      );
    }
  }

  /**
   * Create a clone of this pipeline
   * Useful for creating variants with different transformers
   */
  clone() {
    const pipeline = new CodeTransformPipeline();
    pipeline.transformers = [...this.transformers];
    pipeline.validators = [...this.validators];
    return pipeline;
  }
}

/**
 * Utility: Create AST node from code string
 */
export function createASTNode(code) {
  const ast = parse(code, {
    sourceType: 'module',
    plugins: ['jsx']
  });
  return ast.program.body[0];
}

/**
 * Utility: Check if AST node matches pattern
 */
export function matchNode(node, pattern) {
  if (!node || !pattern) return false;

  for (const key in pattern) {
    if (pattern[key] !== node[key]) {
      return false;
    }
  }

  return true;
}
