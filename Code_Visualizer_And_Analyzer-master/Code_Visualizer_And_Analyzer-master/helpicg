// icg.js - Intermediate Code Generator for C code
// Generates Three-Address Code (3AC) from abstract syntax tree

class IntermediateCodeGenerator {
  constructor() {
    this.code = [];
    this.tempCounter = 0;
    this.labelCounter = 0;
    this.currentFunction = null;
  }

  newTemp() {
    return `t${++this.tempCounter}`;
  }

  newLabel() {
    return `L${++this.labelCounter}`;
  }

  emit(line) {
    this.code.push(line);
  }

  generateCode(ast) {
    this.code = [];
    this.tempCounter = 0;
    this.labelCounter = 0;

    this.visitNode(ast);
    return this.code.join('\n');
  }

  visitNode(node) {
    if (!node || typeof node !== 'object') return null;

    switch (node.type) {
      case 'Program': return this.visitProgram(node);
      case 'FunctionDeclaration': return this.visitFunctionDeclaration(node);
      case 'CompoundStatement': return this.visitCompoundStatement(node);
      case 'DeclarationStatement': return this.visitDeclaration(node);
      case 'ReturnStatement': return this.visitReturn(node);
      case 'ExpressionStatement': return this.visitExpressionStatement(node);
      case 'IfStatement': return this.visitIfStatement(node);
      case 'ForStatement': return this.visitForStatement(node);
      case 'BinaryExpression': return this.visitBinaryExpression(node);
      case 'AssignmentExpression': return this.visitAssignmentExpression(node);
      case 'PrefixExpression': return this.visitPrefixExpression(node);
      case 'PostfixExpression': return this.visitPostfixExpression(node);
      case 'Identifier': return this.visitIdentifier(node);
      case 'Literal': return this.visitLiteral(node);
      case 'FunctionCall': return this.visitFunctionCall(node);
      default:
        console.warn("Unhandled node type in ICG:", node.type);
        return null;
    }
  }

  visitProgram(node) {
    this.emit('// Three-Address Code (3AC) Output');
    this.emit('// =============================');
    node.body.forEach(stmt => this.visitNode(stmt));
  }

  visitFunctionDeclaration(node) {
    this.currentFunction = node.name;
    this.emit(`\n// Function: ${node.name}`);
    this.emit(`FUNC_BEGIN ${node.name}`);

    if (node.parameters?.length) {
      node.parameters.forEach(param => {
        this.emit(`PARAM ${param.paramName}`);
      });
    }

    this.visitNode(node.body);
    this.emit(`FUNC_END ${node.name}`);
    this.currentFunction = null;
  }

  visitCompoundStatement(node) {
    node.body?.forEach(stmt => this.visitNode(stmt));
  }

  visitDeclaration(node) {
    if (node.variables) {
      node.variables.forEach(varDecl => {
        if (varDecl.initializer) {
          const initValue = this.visitNode(varDecl.initializer);
          this.emit(`${varDecl.name} = ${initValue}`);
        } else {
          this.emit(`${varDecl.name} = 0`);
        }
      });
    }
  }

  visitReturn(node) {
    if (node.expression) {
      const value = this.visitNode(node.expression);
      this.emit(`RETURN ${value}`);
    } else {
      this.emit('RETURN');
    }
  }

  visitExpressionStatement(node) {
    if (node.expression) {
      this.visitNode(node.expression);
    }
  }

  visitIfStatement(node) {
    const elseLabel = node.else ? this.newLabel() : null;
    const endLabel = this.newLabel();
    const condition = this.visitNode(node.condition);

    this.emit(`IF_FALSE ${condition} GOTO ${elseLabel || endLabel}`);
    this.visitNode(node.then);

    if (node.else) {
      this.emit(`GOTO ${endLabel}`);
      this.emit(`LABEL ${elseLabel}`);
      this.visitNode(node.else);
    }

    this.emit(`LABEL ${endLabel}`);
  }

  visitForStatement(node) {
    const startLabel = this.newLabel();
    const endLabel = this.newLabel();

    if (node.initialization) this.visitNode(node.initialization);
    this.emit(`LABEL ${startLabel}`);

    if (node.condition) {
      const cond = this.visitNode(node.condition);
      this.emit(`IF_FALSE ${cond} GOTO ${endLabel}`);
    }

    this.visitNode(node.body);
    if (node.increment) this.visitNode(node.increment);
    this.emit(`GOTO ${startLabel}`);
    this.emit(`LABEL ${endLabel}`);
  }

  visitBinaryExpression(node) {
    const left = this.visitNode(node.left);
    const right = this.visitNode(node.right);
    const temp = this.newTemp();
    this.emit(`${temp} = ${left} ${node.operator} ${right}`);
    return temp;
  }

  visitAssignmentExpression(node) {
    const right = this.visitNode(node.right);
    const leftName = this.getOperandName(node.left);
    this.emit(`${leftName} = ${right}`);
    return leftName;
  }

  visitPrefixExpression(node) {
    const name = this.getOperandName(node.argument);
    const temp = this.newTemp();

    if (node.operator === '++') {
      this.emit(`${temp} = ${name} + 1`);
      this.emit(`${name} = ${temp}`);
    } else if (node.operator === '--') {
      this.emit(`${temp} = ${name} - 1`);
      this.emit(`${name} = ${temp}`);
    }

    return name;
  }

  visitPostfixExpression(node) {
    const name = this.getOperandName(node.argument);
    const temp = this.newTemp();
    this.emit(`${temp} = ${name}`);

    if (node.operator === '++') {
      this.emit(`${name} = ${name} + 1`);
    } else if (node.operator === '--') {
      this.emit(`${name} = ${name} - 1`);
    }

    return temp;
  }

  visitFunctionCall(node) {
    const temp = this.newTemp();
    const args = node.arguments?.map(arg => this.visitNode(arg)) || [];

    args.forEach(arg => this.emit(`PARAM ${arg}`));
    this.emit(`${temp} = CALL ${node.name}, ${args.length}`);
    return temp;
  }

  visitIdentifier(node) {
    return node.name;
  }

  visitLiteral(node) {
    return node.value;
  }

  getOperandName(node) {
    return node.type === 'Identifier' ? node.name : this.visitNode(node);
  }
}

// Exportable function for external modules
function generateIntermediateCode(ast) {
  const icg = new IntermediateCodeGenerator();
  return icg.generateCode(ast);
}

// Event handler for UI
document.getElementById('tokenizeBtn').addEventListener('click', () => {
  const codeInput = document.getElementById('codeInput').value;
  const tokens = tokenize(codeInput);  // From lexer.js
  const ast = parse(tokens);           // From parser.js
  const icgOutput = generateIntermediateCode(ast);

  let icgOutputSection = document.getElementById('icgOutput');
  if (!icgOutputSection) {
    icgOutputSection = document.createElement('section');
    icgOutputSection.id = 'icgOutput';
    icgOutputSection.className = 'output-section';

    const title = document.createElement('h2');
    title.className = 'section-title';
    title.textContent = 'Intermediate Code (3AC)';
    icgOutputSection.appendChild(title);

    const pre = document.createElement('pre');
    pre.id = 'icgOutputContent';
    icgOutputSection.appendChild(pre);

    document.querySelector('main.container').appendChild(icgOutputSection);
  }

  document.getElementById('icgOutputContent').textContent = icgOutput;
});
