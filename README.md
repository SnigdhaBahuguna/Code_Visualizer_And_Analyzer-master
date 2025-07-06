C Compiler Visualizer & Analyzer
A full-stack interactive web-based tool that tokenizes, parses, analyzes, and generates Intermediate Code (3AC) from C code. Built entirely in JavaScript (with some Python-based backend support, if needed), this project visualizes compiler phases step-by-step, helping users learn compiler design interactively.

 Features
🔹 1. Lexical Analyzer
Tokenizes C source code into keywords, identifiers, literals, operators, separators, etc.

Handles:

Keywords like int, if, for, return 

Literals: numbers, strings

Identifiers, Operators, Comments

Output: A token table with type, value, and line number.

🔹 2. Syntax Parser (Recursive Descent)
Supports parsing of:

return statements

if-else conditions

for loops

Variable declarations and initializations

Function definitions and calls

Builds a full Abstract Syntax Tree (AST).

🔹 3. AST Renderer (Interactive Tree)
Renders the AST as a collapsible, interactive tree in the browser.

Easy navigation of nested statements and expressions.

🔹 4. Semantic Analyzer
Performs static semantic checks:

Undeclared variables

Duplicate declarations

Function redefinitions

Return type mismatches

Symbol Table construction with:

Scope (global, function-level)

Type (int, float, void, etc.)

Parameters for functions

Built-in support for standard C library functions like printf, scanf, malloc.

🔹 5. Intermediate Code Generator (ICG)
Generates Three-Address Code (TAC / 3AC):

Binary and Unary expressions

Assignments

Control Flow: if, for, labels and jumps

Function calls and returns

Output follows simplified 3AC format:

vbnet
Copy
Edit
t1 = a + b
IF_FALSE t1 GOTO L1
GOTO L2

🔹 6. Basic Syntax Validator
Detects:

Unmatched parentheses, brackets

Missing semicolons

Unbalanced braces

🛠 Technologies Used
Frontend: HTML, CSS, JavaScript

Core Logic: Pure JS for Lexer, Parser, Semantic Analyzer, ICG

Visualization: HTML-based interactive tree

 Python + Graphviz backend for flowcharts
