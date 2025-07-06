// pseudo.js

// Generate nicely formatted pseudocode from AST

function generatePseudocode(node, indent = 0) {
  const indentStr = '  '.repeat(indent);

  if (!node) return '';

  switch (node.type) {

    case 'Program':
      return node.body.map(stmt => generatePseudocode(stmt, indent)).join('\n');

    case 'PreprocessorDirective':
      return indentStr + node.value;

    case 'FunctionDeclaration': {
      let params = node.parameters.map(p => p.paramType + ' ' + p.paramName).join(', ');
      let header = `${indentStr}${node.returnType} ${node.name}(${params}) {`;
      let body = generatePseudocode(node.body, indent + 1);
      return `${header}\n${body}\n${indentStr}}`;
    }

    case 'CompoundStatement':
      return node.body.map(stmt => generatePseudocode(stmt, indent)).join('\n');

    case 'DeclarationStatement': {
      let vars = node.variables.map(v => {
        if (v.initializer) {
          return `${v.name} = ${generatePseudocode(v.initializer)}`;
        } else {
          return v.name;
        }
      }).join(', ');
      return `${indentStr}${node.varType} ${vars};`;
    }

    case 'ReturnStatement':
      return `${indentStr}return ${generatePseudocode(node.expression)};`;

    case 'IfStatement': {
      let cond = generatePseudocode(node.condition);
      let thenPart = generatePseudocode(node.then, indent + 1);
      let elsePart = node.else ? generatePseudocode(node.else, indent + 1) : null;
      let result = `${indentStr}if (${cond}) {\n${thenPart}\n${indentStr}}`;
      if (elsePart) {
        result += ` else {\n${elsePart}\n${indentStr}}`;
      }
      return result;
    }

    case 'ForStatement': {
      let init = generatePseudocode(node.initialization);
      let cond = generatePseudocode(node.condition);
      let incr = generatePseudocode(node.increment);
      let body = generatePseudocode(node.body, indent + 1);
      return `${indentStr}for (${init.trim().replace(/;$/, '')}; ${cond}; ${incr.trim()}) {\n${body}\n${indentStr}}`;
    }

    case 'ExpressionStatement':
      return indentStr + generatePseudocode(node.expression) + ';';

    case 'AssignmentExpression':
      return `${generatePseudocode(node.left)} ${node.operator} ${generatePseudocode(node.right)}`;

    case 'BinaryExpression':
      return `${generatePseudocode(node.left)} ${node.operator} ${generatePseudocode(node.right)}`;

    case 'PrefixExpression':
      return `${node.operator}${generatePseudocode(node.argument)}`;

    case 'PostfixExpression':
      return `${generatePseudocode(node.argument)}${node.operator}`;

    case 'CallExpression': {
      let args = node.arguments.map(arg => generatePseudocode(arg)).join(', ');
      return `${generatePseudocode(node.callee)}(${args})`;
    }

    case 'Identifier':
      return node.name || node.value;

    case 'Literal':
      return node.value;

    case 'Parameter':
      return `${node.paramType} ${node.paramName}`;

    default:
      // For any unknown node types, return a placeholder string
      return `${indentStr}[Unknown node type: ${node.type}]`;
  }
}

// Export the main function if using modules
// module.exports = { generatePseudocode };
