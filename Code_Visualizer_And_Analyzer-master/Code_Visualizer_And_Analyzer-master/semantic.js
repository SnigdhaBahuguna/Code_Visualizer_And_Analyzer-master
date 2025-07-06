class SemanticAnalyzer {
  constructor() {
    this.symbolTable = [];
    this.errors = [];
    this.warnings = [];
    this.currentFunction = null;
    this.currentFunctionReturnType = null;
    this.inLoop = false;
    
    // Standard C library functions
    this.standardFunctions = {
      'printf': { 
        kind: 'function', 
        type: 'int',
        parameters: [{ paramType: 'const char*', paramName: 'format' }],
        variadic: true,
        scope: 'global'
      },
      'scanf': {
        kind: 'function',
        type: 'int',
        parameters: [{ paramType: 'const char*', paramName: 'format' }],
        variadic: true,
        scope: 'global'
      },
      'malloc': {
        kind: 'function',
        type: 'void*',
        parameters: [{ paramType: 'size_t', paramName: 'size' }],
        scope: 'global'
      },
      'free': {
        kind: 'function',
        type: 'void',
        parameters: [{ paramType: 'void*', paramName: 'ptr' }],
        scope: 'global'
      },
      'puts': {
        kind: 'function',
        type: 'int',
        parameters: [{ paramType: 'const char*', paramName: 'str' }],
        scope: 'global'
      },
      'gets': {
        kind: 'function',
        type: 'char*',
        parameters: [{ paramType: 'char*', paramName: 'str' }],
        scope: 'global'
      }
    };
  }

  analyze(ast) {
    this.symbolTable = [];
    this.errors = [];
    this.warnings = [];
    this.currentFunction = null;
    this.currentFunctionReturnType = null;
    this.inLoop = false;

    // Add standard functions to symbol table
    for (const [name, details] of Object.entries(this.standardFunctions)) {
      this.symbolTable.push({
        name,
        ...details
      });
    }

    this.visitNode(ast);

    return {
      errors: this.errors,
      warnings: this.warnings,
      symbolTable: this.symbolTable,
      isValid: this.errors.length === 0
    };
  }

  addError(message, node) {
    this.errors.push({
      message,
      node: node ? node.type : 'Unknown'
    });
  }

  addWarning(message, node) {
    this.warnings.push({
      message,
      node: node ? node.type : 'Unknown'
    });
  }

  findSymbol(name) {
    return this.symbolTable.find(s => s.name === name);
  }

  visitNode(node) {
    if (!node || typeof node !== 'object') return;

    switch (node.type) {
      case 'Program': return this.visitProgram(node);
      case 'FunctionDeclaration': return this.visitFunctionDeclaration(node);
      case 'CompoundStatement': return this.visitCompoundStatement(node);
      case 'DeclarationStatement': return this.visitDeclaration(node);
      case 'ReturnStatement': return this.visitReturnStatement(node);
      case 'ExpressionStatement': return this.visitExpressionStatement(node);
      case 'IfStatement': return this.visitIfStatement(node);
      case 'ForStatement': return this.visitForStatement(node);
      case 'BinaryExpression': return this.visitBinaryExpression(node);
      case 'AssignmentExpression': return this.visitAssignmentExpression(node);
      case 'PrefixExpression':
      case 'PostfixExpression': return this.visitUnaryExpression(node);
      case 'Identifier': return this.visitIdentifier(node);
      case 'Literal': return this.visitLiteral(node);
      case 'FunctionCall': return this.visitFunctionCall(node);
      default:
        console.warn("Unhandled node type in semantic analyzer:", node.type);
        return null;
    }
  }

  visitProgram(node) {
    node.body.forEach(declaration => {
      this.visitNode(declaration);
    });

    const mainFunction = this.symbolTable.find(s => s.name === 'main' && s.kind === 'function');
    if (!mainFunction) {
      this.addWarning("Program should have a 'main' function", node);
    }
  }

  visitFunctionDeclaration(node) {
    const existingFunction = this.findSymbol(node.name);
    if (existingFunction && existingFunction.kind === 'function') {
      this.addError(`Duplicate function declaration: '${node.name}'`, node);
      return;
    }

    this.symbolTable.push({
      name: node.name,
      kind: 'function',
      type: node.returnType,
      parameters: node.parameters || [],
      scope: 'global'
    });

    const prevFunction = this.currentFunction;
    const prevReturnType = this.currentFunctionReturnType;
    this.currentFunction = node.name;
    this.currentFunctionReturnType = node.returnType;

    if (node.parameters) {
      node.parameters.forEach(param => {
        if (this.findSymbol(param.paramName)) {
          this.addError(`Duplicate parameter name: '${param.paramName}'`, param);
        } else {
          this.symbolTable.push({
            name: param.paramName,
            kind: 'parameter',
            type: param.paramType,
            scope: node.name
          });
        }
      });
    }

    this.visitNode(node.body);

    this.currentFunction = prevFunction;
    this.currentFunctionReturnType = prevReturnType;
  }

  visitCompoundStatement(node) {
    node.body?.forEach(stmt => this.visitNode(stmt));
  }

  visitDeclaration(node) {
    if (!node.variables) return;

    node.variables.forEach(varDecl => {
      if (this.findSymbol(varDecl.name)) {
        this.addError(`Duplicate variable declaration: '${varDecl.name}'`, varDecl);
        return;
      }

      this.symbolTable.push({
        name: varDecl.name,
        kind: 'variable',
        type: node.varType,
        scope: this.currentFunction || 'global'
      });

      if (varDecl.initializer) {
        this.visitNode(varDecl.initializer);
      }
    });
  }

  visitReturnStatement(node) {
    if (!this.currentFunction) {
      this.addError("Return statement outside of function", node);
      return;
    }

    if (node.expression) {
      if (this.currentFunctionReturnType === 'void') {
        this.addError("Void function should not return a value", node);
      }
    } else {
      if (this.currentFunctionReturnType !== 'void') {
        this.addError(`Function '${this.currentFunction}' should return a value`, node);
      }
    }
  }

  visitExpressionStatement(node) {
    this.visitNode(node.expression);
  }

  visitIfStatement(node) {
    this.visitNode(node.condition);
    this.visitNode(node.then);
    if (node.else) {
      this.visitNode(node.else);
    }
  }

  visitForStatement(node) {
    const prevInLoop = this.inLoop;
    this.inLoop = true;

    if (node.initialization) this.visitNode(node.initialization);
    if (node.condition) this.visitNode(node.condition);
    if (node.increment) this.visitNode(node.increment);
    this.visitNode(node.body);

    this.inLoop = prevInLoop;
  }

  visitBinaryExpression(node) {
    this.visitNode(node.left);
    this.visitNode(node.right);
  }

  visitAssignmentExpression(node) {
    const left = node.left;
    if (left.type === 'Identifier') {
      const symbol = this.findSymbol(left.name);
      if (!symbol) {
        this.addError(`Undeclared variable '${left.name}'`, left);
      }
    }
    this.visitNode(node.right);
  }

  visitUnaryExpression(node) {
    this.visitNode(node.argument);
  }

  visitIdentifier(node) {
    const symbol = this.findSymbol(node.name);
    if (!symbol) {
      this.addError(`Undeclared identifier '${node.name}'`, node);
    }
    return symbol ? symbol.type : 'unknown';
  }

  visitLiteral(node) {
    if (typeof node.value === 'number') {
      return node.value.toString().includes('.') ? 'float' : 'int';
    }
    return 'unknown';
  }

  visitFunctionCall(node) {
    const funcSymbol = this.findSymbol(node.name);
    
    if (!funcSymbol || funcSymbol.kind !== 'function') {
      this.addError(`Undeclared function '${node.name}'`, node);
      return;
    }

    const expectedArgs = funcSymbol.parameters.length;
    const actualArgs = node.arguments ? node.arguments.length : 0;
    
    // Skip argument count check for variadic functions
    if (!funcSymbol.variadic && expectedArgs !== actualArgs) {
      this.addError(
        `Function '${node.name}' expects ${expectedArgs} arguments but got ${actualArgs}`,
        node
      );
    }

    if (node.arguments) {
      node.arguments.forEach(arg => this.visitNode(arg));
    }
  }
}

function basicSyntaxCheck(code) {
  const errors = [];
  const stack = [];
  const lines = code.split('\n');

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Basic missing semicolon check
    if (
      trimmed &&
      !trimmed.startsWith('//') &&
      !trimmed.endsWith(';') &&
      !trimmed.endsWith('}') &&
      !trimmed.includes('{') &&
      !trimmed.startsWith('#') &&
      !trimmed.startsWith('for') &&
      !trimmed.startsWith('if') &&
      !trimmed.startsWith('while') &&
      !trimmed.startsWith('else') &&
      !trimmed.includes('switch') &&
      !trimmed.includes(':') &&
      !trimmed.endsWith('{')
    ) {
      errors.push(`Line ${index + 1}: Possible missing semicolon.`);
    }

    // Bracket matching
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '{' || ch === '(' || ch === '[') {
        stack.push({ char: ch, line: index + 1 });
      } else if (ch === '}' || ch === ')' || ch === ']') {
        const last = stack.pop();
        if (
          !last ||
          (ch === '}' && last.char !== '{') ||
          (ch === ')' && last.char !== '(') ||
          (ch === ']' && last.char !== '[')
        ) {
          errors.push(`Line ${index + 1}: Unmatched closing '${ch}'.`);
        }
      }
    }
  });

  // Unmatched opening brackets
  stack.forEach(item => {
    errors.push(`Line ${item.line}: Unmatched opening '${item.char}'.`);
  });

  return errors;
}

function formatSemanticResults(results) {
  let output = '';

  if (results.errors.length > 0) {
    output += '=== ERRORS ===\n';
    results.errors.forEach((error, i) => {
      output += `${i + 1}. ${error.message} (${error.node})\n`;
    });
    output += '\n';
  }

  if (results.warnings.length > 0) {
    output += '=== WARNINGS ===\n';
    results.warnings.forEach((warning, i) => {
      output += `${i + 1}. ${warning.message} (${warning.node})\n`;
    });
    output += '\n';
  }

  if (results.errors.length === 0 && results.warnings.length === 0) {
    output += 'No semantic errors or warnings found.\n\n';
  }

  output += '=== SYMBOL TABLE ===\n';
  results.symbolTable.forEach(symbol => {
    output += `${symbol.kind} ${symbol.name}: ${symbol.type}`;
    if (symbol.scope !== 'global') output += ` (scope: ${symbol.scope})`;
    if (symbol.kind === 'function' && symbol.parameters.length > 0) {
      output += ` (params: ${symbol.parameters.map(p => `${p.paramType} ${p.paramName}`).join(', ')})`;
    }
    if (symbol.variadic) output += ' [variadic]';
    output += '\n';
  });

  return output;
}

// UI Handler
document.getElementById('semanticBtn').addEventListener('click', () => {
  const input = document.getElementById('codeInput').value;
  const syntaxErrors = basicSyntaxCheck(input);
  const outputContainer = document.getElementById('semanticContent');

  if (syntaxErrors.length > 0) {
    outputContainer.textContent = '=== SYNTAX ERRORS ===\n' + syntaxErrors.join('\n');
    outputContainer.className = 'semantic-error';
    return;
  }

  const tokens = tokenize(input);  // From lexer.js
  const ast = parse(tokens);      // From parser.js

  const analyzer = new SemanticAnalyzer();
  const results = analyzer.analyze(ast);

  const output = formatSemanticResults(results);
  outputContainer.textContent = output;

  outputContainer.className =
    results.errors.length > 0 ? 'semantic-error' :
    results.warnings.length > 0 ? 'semantic-warning' :
    'semantic-ok';
});