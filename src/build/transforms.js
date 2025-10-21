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
 * Single AST parse, validators first, composable transformers
 */
export class CodeTransformPipeline {
  constructor() {
    this.transformers = [];
    this.validators = [];
  }

  /**
   * Add transformer to pipeline
   */
  use(transformer) {
    if (!transformer || typeof transformer.transform !== 'function') {
      throw new Error('Transformer must have a transform() method');
    }
    this.transformers.push(transformer);
    return this;
  }

  /**
   * Add validator to pipeline
   */
  validate(validator) {
    if (!validator || typeof validator.validate !== 'function') {
      throw new Error('Validator must have a validate() method');
    }
    this.validators.push(validator);
    return this;
  }

  /**
   * Transform source code through pipeline
   */
  async transform(source, filename, context = {}) {
    try {
      // Step 1: Parse to AST
      const ast = parseSource(source);

      // Step 2: Run validators
      runValidators(this.validators, ast, filename, context);

      // Step 3: Apply transformers
      const metadata = applyTransformers(this.transformers, ast, filename, context);

      // Step 4: Generate code
      const output = generateCode(ast);

      return {
        code: output.code,
        map: output.map,
        metadata
      };

    } catch (error) {
      return handleTransformError(error, filename);
    }
  }

  /**
   * Create pipeline clone
   */
  clone() {
    const pipeline = new CodeTransformPipeline();
    pipeline.transformers = [...this.transformers];
    pipeline.validators = [...this.validators];
    return pipeline;
  }
}

/**
 * Parse source code to AST
 */
function parseSource(source) {
  return parse(source, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
    errorRecovery: true
  });
}

/**
 * Run all validators
 */
function runValidators(validators, ast, filename, context) {
  const allErrors = [];

  for (const validator of validators) {
    try {
      const errors = validator.validate(ast, filename, context);
      if (errors?.length > 0) {
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

  if (allErrors.length > 0) {
    throw new ValidationError(
      `Validation failed for ${filename}`,
      allErrors
    );
  }
}

/**
 * Apply all transformers
 */
function applyTransformers(transformers, ast, filename, context) {
  const metadata = {};

  for (const transformer of transformers) {
    try {
      const result = transformer.transform(ast, {
        ...context,
        filename,
        metadata
      });

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

  return metadata;
}

/**
 * Generate code from AST
 */
function generateCode(ast) {
  return generate(ast, {
    retainLines: true,
    comments: true,
    compact: false
  });
}

/**
 * Handle transform errors
 */
function handleTransformError(error, filename) {
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
