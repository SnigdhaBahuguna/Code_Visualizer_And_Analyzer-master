import sys
import tempfile
import subprocess
import os
import argparse # For command-line arguments






# Attempt to import pycparser to get its path
try:
    import pycparser
    from pycparser import c_parser, c_ast, c_generator
except ImportError:
    print("ERROR: pycparser library not found. Please install it: pip install pycparser")
    sys.exit(1)

# Attempt to import graphviz Python library
try:
    from graphviz import Digraph
except ImportError:
    print("ERROR: graphviz Python library not found. Please install it: pip install graphviz")
    print("Ensure you also have Graphviz (the software) installed and in your PATH.")
    sys.exit(1)


# --- Helper to find pycparser's fake_libc_include ---
# --- Helper to find pycparser's fake_libc_include ---

import sys
from pycparser import parse_file

filename = sys.argv[1] if len(sys.argv) > 1 else 'test.c'

# Get filename from command-line argument

ast = parse_file(filename, use_cpp=True, cpp_args=[
    r'-IC:\Users\HP\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.11_qbz5n2kfra8p0\LocalCache\local-packages\Python311\site-packages\pycparser\utils\fake_libc_include'
])

# Do something with the AST...
print("Parsed successfully.")






def get_pycparser_fake_libc_path():
    """
    Finds the path to pycparser's fake_libc_include directory.
    Tries multiple methods for robustness.
    """
    # Method 1: Directly from pycparser installation path
    try:
        pycparser_dir = os.path.dirname(pycparser.__file__)
        path1 = os.path.join(pycparser_dir, 'utils', 'fake_libc_include')
        if os.path.isdir(path1):
            print(f"INFO: Found fake_libc_include at: {path1} (Method 1)")
            return path1
        else:
            print(f"DEBUG: fake_libc_include not at {path1} (Method 1)")
    except Exception as e:
        print(f"DEBUG: Error in Method 1 for fake_libc_include: {e}")

    # Method 2: Check common site-packages locations relative to sys.executable
    # This can be helpful in virtual environments or non-standard Python installs.
    try:
        python_exe_dir = os.path.dirname(sys.executable)
        # Common relative paths from python.exe to site-packages
        # Order might matter, try more specific ones first
        relative_paths_to_site_packages = [
            os.path.join('Lib', 'site-packages'),      # Standard Windows, venv
            os.path.join('lib', f'python{sys.version_info.major}.{sys.version_info.minor}', 'site-packages'), # Linux/macOS, venv
            # For paths like C:\Users\HP\AppData\Local\Packages\PythonSoftwareFoundation.Python.3.11_qbz5n2kfra8p0\LocalCache\local-packages\Python311\site-packages
            # The structure might be less predictable from sys.executable alone.
            # We'll rely on pycparser.__file__ if it's valid, or sys.path searching.
        ]
        for rel_path in relative_paths_to_site_packages:
            site_packages_dir = os.path.abspath(os.path.join(python_exe_dir, '..', rel_path)) # Go up one from exe_dir for Lib/lib
            path2 = os.path.join(site_packages_dir, 'pycparser', 'utils', 'fake_libc_include')
            if os.path.isdir(path2):
                print(f"INFO: Found fake_libc_include at: {path2} (Method 2)")
                return path2
            else:
                print(f"DEBUG: fake_libc_include not at {path2} (Method 2, site-packages base: {site_packages_dir})")
    except Exception as e:
        print(f"DEBUG: Error in Method 2 for fake_libc_include: {e}")

    # Method 3: Iterate through sys.path (where Python looks for modules)
    # This is often the most reliable if the package is installed correctly and importable.
    print("DEBUG: Attempting Method 3: Searching sys.path")
    for p_entry in sys.path:
        # We are looking for a directory that contains 'pycparser/utils/fake_libc_include'
        # or where p_entry IS the 'pycparser' directory itself.
        path3_candidate1 = os.path.join(p_entry, 'pycparser', 'utils', 'fake_libc_include')
        path3_candidate2 = os.path.join(p_entry, 'utils', 'fake_libc_include') # If p_entry is .../pycparser/

        if os.path.isdir(path3_candidate1):
            print(f"INFO: Found fake_libc_include at: {path3_candidate1} (Method 3, from sys.path entry: {p_entry})")
            return path3_candidate1
        elif os.path.isdir(path3_candidate2) and "pycparser" in os.path.basename(p_entry.rstrip(os.sep)):
            print(f"INFO: Found fake_libc_include at: {path3_candidate2} (Method 3, from sys.path entry: {p_entry} - assuming it's pycparser dir)")
            return path3_candidate2
        else:
            if not os.path.isdir(path3_candidate1):
                 print(f"DEBUG: fake_libc_include not at {path3_candidate1} (sys.path check)")
            if not os.path.isdir(path3_candidate2):
                 print(f"DEBUG: fake_libc_include not at {path3_candidate2} (sys.path check)")


    print("CRITICAL WARNING: pycparser's fake_libc_include directory not found by any method.")
    print("Please ensure pycparser is installed correctly. You might need to reinstall it.")
    print("As a workaround, you can manually find the 'fake_libc_include' directory within your pycparser installation")
    print("and set the PYCPARSER_FAKE_LIBC_PATH environment variable to its absolute path.")
    
    # Check environment variable as a last resort or manual override
    manual_path = os.environ.get('PYCPARSER_FAKE_LIBC_PATH')
    if manual_path and os.path.isdir(manual_path):
        print(f"INFO: Using fake_libc_include from environment variable PYCPARSER_FAKE_LIBC_PATH: {manual_path}")
        return manual_path
    elif manual_path:
        print(f"WARNING: PYCPARSER_FAKE_LIBC_PATH is set to '{manual_path}' but it's not a valid directory.")

    return None

# --- C Preprocessor (Modified to use fake_libc_include) ---
def preprocess_c_code(c_code_string, c_compiler='gcc', include_paths=None):
    """
    Preprocesses C code using a C compiler (like gcc -E)
    and pycparser's fake_libc_include to handle common std types.
    include_paths is a list of additional include directories.
    """
    fake_libc_path = get_pycparser_fake_libc_path()
    # if not fake_libc_path: # Allow to proceed, but parsing will likely fail for stdlib
    #     print("CRITICAL WARNING: pycparser's fake_libc_include directory not found.")

    temp_c_file_name = None # Ensure it's defined for the finally block
    try:
        # Create a temporary file in the current directory to handle relative includes if any
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.c', dir='.') as tmp_c_file:
            tmp_c_file.write(c_code_string)
            temp_c_file_name = tmp_c_file.name # Get full path

        cmd = [c_compiler, '-E']
        if fake_libc_path:
            cmd.append(f'-I{fake_libc_path}')
            # Using -nostdinc can be too aggressive if the code truly needs
            # some system headers not faked by pycparser. Only use if necessary.
            # cmd.append('-nostdinc')

        # Add user-provided include paths
        if include_paths:
            for path in include_paths:
                cmd.append(f'-I{os.path.abspath(path)}') # Ensure absolute paths for includes

        # Add the directory of the temporary C file itself to include paths
        # This helps if the original C code had relative includes like #include "myheader.h"
        # and was passed as a string. If reading from a file, the original file's dir is better.
        # For string input, we assume includes are relative to where c2flow.py is run or provided via -I.
        cmd.append(f'-I{os.path.dirname(temp_c_file_name)}')


        cmd.append(temp_c_file_name) # The file to preprocess

        # print(f"DEBUG: Preprocessor command: {' '.join(cmd)}") # Uncomment for debugging

        result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8')

        if result.returncode != 0:
            error_message = (
                f"Error during preprocessing (return code {result.returncode}):\n"
                f"Command: {' '.join(cmd)}\n"
                f"Stderr:\n{result.stderr}\n"
                f"Stdout:\n{result.stdout}"
            )
            raise RuntimeError(error_message)
        return result.stdout

    except FileNotFoundError:
        print(f"Error: C compiler '{c_compiler}' not found. Ensure it's installed and in PATH.")
        raise
    except Exception as e:
        print(f"An unexpected error occurred during preprocessing: {e}")
        raise
    finally:
        if temp_c_file_name and os.path.exists(temp_c_file_name):
            os.remove(temp_c_file_name)


# --- AST Visitor for Flowchart Generation (Same as refined version) ---
class FlowchartVisitor(c_ast.NodeVisitor):
    def __init__(self):
        self.dot = Digraph(comment='C Code Flowchart', strict=True)
        self.dot.attr(rankdir='TB')
        self.node_count = 0
        self.c_gen = c_generator.CGenerator()
        self.current_block_end_node = None
        self.loop_stack = [] # {'type': 'while/for', 'start_cond': node, 'inc_node': node_or_None, 'end_node': node}

    def _new_node_name(self):
        name = f'node{self.node_count}'
        self.node_count += 1
        return name

    def _add_node(self, label, shape='box', **kwargs):
        name = self._new_node_name()
        sane_label = str(label).replace('"', '\\"').replace('\n', '\\n')
        self.dot.node(name, label=sane_label, shape=shape, **kwargs)
        return name

    def _add_edge(self, src, dest, label=None, **kwargs):
        if src and dest:
            sane_label = str(label).replace('"', '\\"').replace('\n', '\\n') if label else None
            self.dot.edge(src, dest, label=sane_label, **kwargs)

    def _generate_stmt_label(self, node):
        try:
            return self.c_gen.visit(node).replace(';', '').strip()
        except Exception:
            return f"<{type(node).__name__} (gen_error)>"

    def visit_FileAST(self, node):
        start_node = self._add_node("Start", shape='ellipse')
        self.current_block_end_node = start_node
        for ext in node.ext:
            if isinstance(ext, c_ast.FuncDef): # Only process function definitions at top level for now
                self.visit(ext)
            # elif isinstance(ext, c_ast.Decl): # Handle global declarations if needed
            #     self.visit(ext) # May need specific handling or be ignored for flowchart
        end_node = self._add_node("End", shape='ellipse')
        if self.current_block_end_node != start_node : # If something was processed
             self._add_edge(self.current_block_end_node, end_node)
        elif not node.ext: # If the C file was empty or only had non-function externals
            self._add_edge(start_node, end_node)


    def visit_FuncDef(self, node):
        func_name = node.decl.name
        func_entry_label = f"Function: {func_name}()"
        shape = 'Mdiamond' if func_name == "main" else 'box'
        style = 'filled' if func_name != "main" else ''
        fillcolor = 'lightgrey' if func_name != "main" else ''

        func_entry_node = self._add_node(func_entry_label, shape=shape, style=style, fillcolor=fillcolor)

        # Connect from previous node (e.g., "Start" or previous function's logical end)
        # For simplicity, we'll assume a linear flow of functions from "Start"
        # More complex scenarios might involve call graphs.
        if self.current_block_end_node:
            self._add_edge(self.current_block_end_node, func_entry_node)
        
        self.current_block_end_node = func_entry_node
        self.visit(node.body)
        # After visiting the body, self.current_block_end_node is the logical end of this function.
        # It will either connect to the next FuncDef or the main "End" node in visit_FileAST.

    def visit_Compound(self, node):
        # current_block_end_node is the node *before* this compound block.
        if node.block_items:
            for item in node.block_items:
                self.visit(item)
        # If block is empty, current_block_end_node remains.

    def visit_If(self, node):
        cond_label = self._generate_stmt_label(node.cond)
        if_node = self._add_node(f"If ({cond_label})", shape='diamond')
        self._add_edge(self.current_block_end_node, if_node)

        merge_node = self._add_node(" ", shape='point', width='0.01', height='0.01') # Invisible merge

        # True branch
        self.current_block_end_node = if_node
        self.visit(node.iftrue)
        self._add_edge(self.current_block_end_node, merge_node, label="True")

        if node.iffalse:
            self.current_block_end_node = if_node
            self.visit(node.iffalse)
            self._add_edge(self.current_block_end_node, merge_node, label="False")
        else:
            self._add_edge(if_node, merge_node, label="False") # No 'else', so 'false' from condition goes to merge

        self.current_block_end_node = merge_node

    def visit_While(self, node):
        entry_to_while_cond = self.current_block_end_node

        cond_label = self._generate_stmt_label(node.cond)
        while_cond_node = self._add_node(f"While ({cond_label})", shape='diamond')
        self._add_edge(entry_to_while_cond, while_cond_node)

        after_loop_node = self._new_node_name()
        self.dot.node(after_loop_node, label="", shape='point', width='0.01', height='0.01')
        self.loop_stack.append({'type': 'while', 'start_cond': while_cond_node, 'inc_node': None, 'end_node': after_loop_node})

        self.current_block_end_node = while_cond_node
        self.visit(node.stmt) # Loop body
        self._add_edge(self.current_block_end_node, while_cond_node, label="Loop")

        self._add_edge(while_cond_node, after_loop_node, label="False")
        self.current_block_end_node = after_loop_node
        self.loop_stack.pop()

    def visit_For(self, node):
        entry_to_for = self.current_block_end_node
        current_node_in_for = entry_to_for

        if node.init:
            init_label = self._generate_stmt_label(node.init)
            for_init_node = self._add_node(init_label)
            self._add_edge(current_node_in_for, for_init_node)
            current_node_in_for = for_init_node

        cond_label = self._generate_stmt_label(node.cond) if node.cond else "True"
        for_cond_node = self._add_node(f"For ({cond_label})", shape='diamond')
        self._add_edge(current_node_in_for, for_cond_node)

        after_loop_node = self._new_node_name()
        self.dot.node(after_loop_node, label="", shape='point', width='0.01', height='0.01')

        for_inc_node_name = for_cond_node # Default target for continue/body-end if no 'next'
        if node.next:
            inc_label = self._generate_stmt_label(node.next)
            for_inc_node_name = self._add_node(inc_label)
            self._add_edge(for_inc_node_name, for_cond_node) # Increment back to condition

        self.loop_stack.append({'type': 'for', 'start_cond': for_cond_node, 'inc_node': for_inc_node_name, 'end_node': after_loop_node})

        self.current_block_end_node = for_cond_node # Body starts after condition is true
        self.visit(node.stmt) # Loop body
        self._add_edge(self.current_block_end_node, for_inc_node_name) # End of body to increment/condition

        self._add_edge(for_cond_node, after_loop_node, label="False")
        self.current_block_end_node = after_loop_node
        self.loop_stack.pop()

    def visit_Return(self, node):
        label = "Return"
        if node.expr:
            label += " " + self._generate_stmt_label(node.expr)
        ret_node = self._add_node(label, shape='parallelogram', style='filled', fillcolor='lightblue')
        self._add_edge(self.current_block_end_node, ret_node)
        self.current_block_end_node = ret_node

    def visit_Break(self, node):
        break_node = self._add_node("Break", shape='box', style='filled', fillcolor='orange')
        self._add_edge(self.current_block_end_node, break_node)
        if self.loop_stack:
            self._add_edge(break_node, self.loop_stack[-1]['end_node'], style='dashed', label='to loop exit')
        else:
            print("Warning: Break outside loop.")
        self.current_block_end_node = break_node # Path effectively ends here for this block

    def visit_Continue(self, node):
        continue_node = self._add_node("Continue", shape='box', style='filled', fillcolor='yellow')
        self._add_edge(self.current_block_end_node, continue_node)
        if self.loop_stack:
            loop_info = self.loop_stack[-1]
            target_node = loop_info.get('inc_node') or loop_info['start_cond'] # For->inc, While->cond
            self._add_edge(continue_node, target_node, style='dashed', label='to loop inc/cond')
        else:
            print("Warning: Continue outside loop.")
        self.current_block_end_node = continue_node # Path effectively ends here for this iteration

    def generic_visit(self, node):
        ignored_types = (
            c_ast.Label, c_ast.Case, c_ast.Default, c_ast.EmptyStatement,
            c_ast.Typename, c_ast.TypeDecl, c_ast.IdentifierType,
            c_ast.PtrDecl, c_ast.ArrayDecl, c_ast.FuncDecl,
            c_ast.Constant, c_ast.ID, c_ast.BinaryOp, c_ast.ExprList
        )
        if isinstance(node, ignored_types):
            super().generic_visit(node)
            return

        label = None
        node_created = False
        if isinstance(node, (c_ast.Assignment, c_ast.Decl, c_ast.FuncCall)):
            label = self._generate_stmt_label(node)
        elif isinstance(node, c_ast.UnaryOp) and node.op in ('p++', 'p--', '++', '--'):
            label = self._generate_stmt_label(node)

        if label and label.strip() and label.strip() != ';':
            shape = 'note' if isinstance(node, c_ast.Decl) else 'box'
            style = '' if isinstance(node, c_ast.Decl) else 'rounded'
            
            current_node = self._add_node(label, shape=shape, style=style)
            if self.current_block_end_node:
                self._add_edge(self.current_block_end_node, current_node)
            self.current_block_end_node = current_node
            node_created = True
        
        if not node_created:
            super().generic_visit(node)


# --- Main Function to Generate Flowchart ---
def create_flowchart(c_code_string, output_filename="flowchart", c_compiler='gcc', include_paths=None, view_image=False):
    print(f"INFO: Using C compiler: {c_compiler}")
    print("INFO: Preprocessing C code...")
    try:
        preprocessed_code = preprocess_c_code(c_code_string, c_compiler, include_paths)
        # print("--- Preprocessed Code (first 500 chars) ---")
        # print(preprocessed_code[:500])
        # print("-------------------------------------------")
    except Exception as e:
        print(f"FATAL: Failed to preprocess C code: {e}")
        return

    print("INFO: Parsing C code...")
    parser = c_parser.CParser()
    try:
        ast = parser.parse(preprocessed_code, filename='<c_code_string>')
    except c_parser.ParseError as e:
        print(f"FATAL: Error parsing C code: {e}")
        # print("--- Problematic Preprocessed Code (first 2000 chars) ---")
        # print(preprocessed_code[:2000])
        return
    except Exception as e:
        print(f"FATAL: An unexpected error occurred during parsing: {e}")
        return

    print("INFO: Generating flowchart DOT description...")
    visitor = FlowchartVisitor()
    try:
        visitor.visit(ast)
    except Exception as e:
        print(f"FATAL: Error during AST visitation for flowchart generation: {e}")
        return

    dot_filename_base = os.path.splitext(output_filename)[0]
    dot_filepath = f"{dot_filename_base}.dot"
    img_filepath = f"{dot_filename_base}.png" # Default to PNG

    try:
        with open(dot_filepath, "w", encoding='utf-8') as f:
            f.write(visitor.dot.source)
        print(f"INFO: DOT source saved to {dot_filepath}")

        # Use the Digraph object's render method
        # It saves to output_filename (which becomes output_filename.png by default if format is png)
        # The 'directory' argument specifies where to save the files.
        rendered_path = visitor.dot.render(filename=dot_filename_base, directory='.', format='png', cleanup=False, quiet=False, view=view_image)
        # rendered_path will be something like 'flowchart.png' if dot_filename_base is 'flowchart'
        print(f"INFO: Flowchart image rendered to: {rendered_path}")
        if not os.path.exists(rendered_path):
             print(f"WARNING: Rendered path {rendered_path} does not exist. Check Graphviz output.")


    except subprocess.CalledProcessError as e:
        print(f"ERROR: Graphviz 'dot' command failed (CalledProcessError): {e}")
        if e.stderr: print(f"Stderr from dot: {e.stderr.decode(errors='ignore')}")
        print("Ensure Graphviz is installed and accessible. The .dot file might still be useful.")
    except Exception as e:
        print(f"ERROR: Rendering Graphviz DOT or displaying image: {e}")
        print(f"You can try to manually render the DOT file: dot -Tpng {dot_filepath} -o {img_filepath}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate a flowchart from C code.")
    parser.add_argument("c_file", help="Path to the C source file.")
    parser.add_argument("-o", "--output", default="flowchart",
                        help="Output filename base for .dot and .png (e.g., 'my_flowchart'). Default is 'flowchart'.")
    parser.add_argument("--compiler", default="gcc", help="C compiler to use for preprocessing (e.g., gcc, clang). Default is 'gcc'.")
    parser.add_argument("-I", "--include", action="append", default=[],
                        help="Add directory to C include search paths (can be used multiple times).")
    parser.add_argument("--view", action="store_true", help="Attempt to open the generated flowchart image.")


    args = parser.parse_args()

    try:
        with open(args.c_file, "r", encoding='utf-8') as f:
            c_code_content = f.read()
    except FileNotFoundError:
        print(f"ERROR: C file not found: {args.c_file}")
        sys.exit(1)
    except Exception as e:
        print(f"ERROR: Could not read C file {args.c_file}: {e}")
        sys.exit(1)

    # Add the directory of the input C file to include paths by default
    # This helps resolve relative includes like #include "my_header.h"
    # located next to the input C file.
    c_file_dir = os.path.dirname(os.path.abspath(args.c_file))
    if c_file_dir not in args.include: # Avoid duplicates if user already specified it
        args.include.insert(0, c_file_dir)


    create_flowchart(c_code_content,
                     output_filename=args.output,
                     c_compiler=args.compiler,
                     include_paths=args.include,
                     view_image=args.view)