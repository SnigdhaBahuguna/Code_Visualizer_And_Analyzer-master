const TokenType = {
  PREPROCESSOR: 'PREPROCESSOR',
  KEYWORD: 'KEYWORD',
  IDENTIFIER: 'IDENTIFIER',
  NUMBER: 'NUMBER',
  STRING_LITERAL: 'STRING_LITERAL',
  OPERATOR: 'OPERATOR',
  SEPARATOR: 'SEPARATOR',
  OPEN_PAREN: 'OPEN_PAREN',
  CLOSE_PAREN: 'CLOSE_PAREN',
  OPEN_BRACE: 'OPEN_BRACE',
  CLOSE_BRACE: 'CLOSE_BRACE',
  COMMENT: 'COMMENT',
  UNDEFINED: 'UNDEFINED'
};

const tokenRegex = {
  [TokenType.PREPROCESSOR]: /^#\s*\w+\s*(<[^>]+>|"[^"]+")/,
  [TokenType.KEYWORD]: /\b(int|char|float|double|if|else|for|while|return|void|include|define|printf)\b/,
  [TokenType.IDENTIFIER]: /\b[a-zA-Z_]\w*\b/,
  [TokenType.NUMBER]: /\b(0x[0-9A-Fa-f]+|\d+(\.\d+)?([eE][-+]?\d+)?)\b/,
  [TokenType.STRING_LITERAL]: /^"([^"\\]|\\.)*"/,
  [TokenType.OPERATOR]: /^(>>=|<<=|==|!=|<=|>=|->|&&|\|\||<<|>>|\+\+|--|[-+*/%=<>&^|!~])/,
  [TokenType.SEPARATOR]: /^[;,.:]/,
  [TokenType.OPEN_PAREN]: /^\(/,
  [TokenType.CLOSE_PAREN]: /^\)/,
  [TokenType.OPEN_BRACE]: /^\{/,
  [TokenType.CLOSE_BRACE]: /^\}/,
  [TokenType.COMMENT]: /^\/\/.*|^\/\*[\s\S]*?\*\//
};

function classifyLexeme(lexeme) {
  for (const [type, regex] of Object.entries(tokenRegex)) {
    if (regex.test(lexeme)) return { type, value: lexeme };
  }
  return { type: TokenType.UNDEFINED, value: lexeme };
}

function tokenize(inputCode) {
  const tokens = [];
  let lineNum = 1;

  // Match multiline comments and extract them first
  inputCode = inputCode.replace(/\/\*[\s\S]*?\*\//g, match => {
    tokens.push({ type: TokenType.COMMENT, value: match, line: lineNum });
    const newlineCount = (match.match(/\n/g) || []).length;
    lineNum += newlineCount;
    return ' '.repeat(match.length); // keep positions
  });

  const lines = inputCode.split('\n');

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    let line = lines[lineIndex];
    let i = 0;

    // Handle preprocessor directive
    if (/^\s*#/.test(line)) {
      const match = line.trim();
      tokens.push({ type: TokenType.PREPROCESSOR, value: match, line: lineNum });
      lineNum++;
      continue;
    }

    while (i < line.length) {
      if (/\s/.test(line[i])) {
        i++;
        continue;
      }

      // Handle single-line comment
      if (line[i] === '/' && line[i + 1] === '/') {
        const comment = line.slice(i);
        tokens.push({ type: TokenType.COMMENT, value: comment, line: lineNum });
        break;
      }

      // Match string literal
      if (line[i] === '"') {
        const match = line.slice(i).match(/^"([^"\\]|\\.)*"/);
        if (match) {
          tokens.push({ type: TokenType.STRING_LITERAL, value: match[0], line: lineNum });
          i += match[0].length;
        } else {
          tokens.push({ type: TokenType.UNDEFINED, value: '"', line: lineNum });
          i++;
        }
        continue;
      }

      // Match multi-char operators first
      const twoChar = line.slice(i, i + 2);
      if (tokenRegex[TokenType.OPERATOR].test(twoChar)) {
        tokens.push({ type: TokenType.OPERATOR, value: twoChar, line: lineNum });
        i += 2;
        continue;
      }

      const oneChar = line[i];

      // Single char matchers
      if (tokenRegex[TokenType.OPERATOR].test(oneChar)) {
        tokens.push({ type: TokenType.OPERATOR, value: oneChar, line: lineNum });
        i++;
        continue;
      }
      if (tokenRegex[TokenType.SEPARATOR].test(oneChar)) {
        tokens.push({ type: TokenType.SEPARATOR, value: oneChar, line: lineNum });
        i++;
        continue;
      }
      // Parentheses
      if (tokenRegex[TokenType.OPEN_PAREN].test(oneChar)) {
        tokens.push({ type: TokenType.OPEN_PAREN, value: oneChar, line: lineNum });
        i++;
        continue;
      }
      if (tokenRegex[TokenType.CLOSE_PAREN].test(oneChar)) {
        tokens.push({ type: TokenType.CLOSE_PAREN, value: oneChar, line: lineNum });
        i++;
        continue;
      }
      // Braces
      if (tokenRegex[TokenType.OPEN_BRACE].test(oneChar)) {
        tokens.push({ type: TokenType.OPEN_BRACE, value: oneChar, line: lineNum });
        i++;
        continue;
      }
      if (tokenRegex[TokenType.CLOSE_BRACE].test(oneChar)) {
        tokens.push({ type: TokenType.CLOSE_BRACE, value: oneChar, line: lineNum });
        i++;
        continue;
      }

      // Match identifiers, numbers, and keywords
      let lexeme = '';
      while (i < line.length && /[a-zA-Z0-9_]/.test(line[i])) {
        lexeme += line[i++];
      }

      if (lexeme.length > 0) {
        const token = classifyLexeme(lexeme);
        tokens.push({ ...token, line: lineNum });
      } else {
        // Unknown symbol
        tokens.push({ type: TokenType.UNDEFINED, value: oneChar, line: lineNum });
        i++;
      }
    }
    lineNum++;
  }

  return tokens;
}

document.getElementById('tokenizeBtn').addEventListener('click', () => {
  const input = document.getElementById('codeInput').value;
  const tokenTable = document.getElementById('tokenTableBody');
  tokenTable.innerHTML = "";

  const tokens = tokenize(input);

  // Aggregate tokens by type
  const tokenGroups = {};
  for (const token of tokens) {
    if (!tokenGroups[token.type]) {
      tokenGroups[token.type] = [];
    }
    tokenGroups[token.type].push(`${token.value} (Line ${token.line})`);
  }

  // Create table rows
  for (const type of Object.keys(TokenType)) {
    if (tokenGroups[type] && tokenGroups[type].length > 0) {
      const row = document.createElement('tr');
      const typeCell = document.createElement('td');
      const valueCell = document.createElement('td');

      typeCell.textContent = type === TokenType.UNDEFINED ? 'ERROR' : type;
      valueCell.textContent = tokenGroups[type].join(', ');

      row.appendChild(typeCell);
      row.appendChild(valueCell);
      tokenTable.appendChild(row);
    }
  }

  // If no tokens, add a placeholder row
  if (Object.keys(tokenGroups).length === 0) {
    const row = document.createElement('tr');
    const typeCell = document.createElement('td');
    const valueCell = document.createElement('td');
    typeCell.textContent = 'No tokens found';
    valueCell.textContent = '';
    row.appendChild(typeCell);
    row.appendChild(valueCell);
    tokenTable.appendChild(row);
  }
});
