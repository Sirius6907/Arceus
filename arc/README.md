# Arceus Core CLI: `arceus-s`

This is the core compiler-aware static analyzer and Model Context Protocol (MCP) server daemon for Arceus. It parses raw codebase trees into a queryable semantic graph database (built on LadybugDB) to empower AI engineering agents with high-fidelity system-level reasoning.

[![npm version](https://img.shields.io/npm/v/arceus-s.svg)](https://www.npmjs.com/package/arceus-s)
[![License: PolyForm Noncommercial](https://img.shields.io/badge/License-PolyForm%20Noncommercial-blue.svg)](https://polyformproject.org/licenses/noncommercial/1.0.0/)

---

## Why Use Arceus?

Standard AI code generation assistants are constrained by linear text analysis. They write, edit, and refactor lines of code without a compiler's understanding of structural side effects and calling dependencies. 

Arceus resolves imports, cross-file call targets, variable types, class interfaces, and modular clusters, representing the entire relational map inside an embedded local database. AI agents can then query this database, minimizing context pollution and preventing broken implementation chains.

---

## Installation & Command Ingestion

Because the command name `arc` is already registered by an unrelated project in the public registry, Arceus is distributed under the name **`arceus-s`**. Npm automatically routes global binary path calls to both `arc` and `arceus`.

```bash
# Global install from registry
npm install -g arceus-s

# Verify CLI commands
arc --help
```

### Ingesting Your First Repository
Run the indexer from your project's root folder:
```bash
# Run one-off without global install
npx arceus-s analyze

# Or run via global installer
arc analyze
```
This command maps the directory, persists the graph database inside `.arc/`, registers the repository in your global directory, and generates `AGENTS.md` and `CLAUDE.md` context files.

---

## Editor & MCP Server Integration

To automatically write the connection parameters for your active editors, run:
```bash
arc setup
```

### Manual Configuration Schemes

If your editor requires manual server setup:

#### 1. Claude Code
```bash
# Windows systems
claude mcp add arceus -- cmd /c npx -y arceus-s mcp

# Unix / macOS systems
claude mcp add arceus -- npx -y arceus-s mcp
```

#### 2. Cursor
Add this entry to your system's global config (`~/.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "arceus": {
      "command": "npx",
      "args": ["-y", "arceus-s", "mcp"]
    }
  }
}
```

#### 3. OpenCode
Append this config to `~/.config/opencode/config.json`:
```json
{
  "mcp": {
    "arceus": {
      "command": "npx",
      "args": ["-y", "arceus-s", "mcp"]
    }
  }
}
```

---

## CLI Command Interface

```bash
arc setup                     # Writes MCP configurations for active editors
arc analyze [path]            # Parses source code and updates repository index
arc analyze --force           # Discards graph caches and runs a full re-index
arc analyze --skills          # Generates specialized AI agent guidelines
arc analyze --skip-embeddings # Fast parse mode; skips calculating vector embeddings
arc analyze --skip-git        # Indexes folder even if not initialized as a git repo
arc analyze --embeddings      # Generates full semantic vector embeddings (slower)
arc analyze --verbose         # Outputs file skips and parser debug logs
arc analyze --worker-timeout N# Sets custom parse timeout in seconds
arc mcp                       # Runs the Model Context Protocol daemon (stdio)
arc serve                     # Launches HTTP server for browser Web UI connection
arc list                      # Prints all registered repositories on this machine
arc status                    # Shows index health, size, and statistics
arc clean                     # Deletes database files for the current project
arc clean --all --force       # Wipes all repository graphs from disk
arc wiki [path]               # Formulates a markdown wiki from the codebase graph
arc wiki --model <name>       # Custom LLM model target (defaults: gpt-4o-mini)
arc wiki --base-url <url>     # Custom LLM provider endpoint URL
```

### Multi-Service Sync & Monorepos
*   `arc group create <name>`: Mappings a new microservice group structure.
*   `arc group add <group> <path> <name>`: Registers a codebase in a sync group.
*   `arc group remove <group> <path>`: Deletes a codebase from a sync group.
*   `arc group list [name]`: Outputs active group schemas.
*   `arc group sync <name>`: Resolves boundaries and maps contract exchanges.
*   `arc group contracts <name>`: Reviews service endpoints and interface dependencies.
*   `arc group query <name> <q>`: Executes search routines across all service libraries in a group.
*   `arc group status <name>`: Reports health and stale statuses for grouped codebases.

---

## Token Efficiency & Graph RAG Performance

Arceus's semantic graph model drastically reduces token wastage and context pollution for downstream LLMs compared to traditional lexical exploration (e.g., recursive grep and file reading).

### Quantitative Efficiency Comparison

| Inquiry Scenario | Lexical Method (Grep + Full File Read) | Semantics-Guided (MCP / Cypher Query) | Token Conservation Ratio | Impact & Efficiency Gain |
| :--- | :--- | :--- | :--- | :--- |
| **1. Call-Site Tracing** <br> Retrieve all calling methods and files invoking `withLbugDb`. | **~21,000 tokens** <br>(Requires scanning grep results, opening and parsing `api.ts` [69.6KB] and `lbug-adapter.ts` [14.4KB] to locate calling signatures). | **~28 tokens** <br>(Cypher execution: returns a targeted JSON array referencing the exact caller `handler` in `api.ts`). | **750x Reduction** <br>(99.87% Saved) | **Critical Path Tracing**: Eliminates ingestion of unrelated implementation details, preserving LLM context window. |
| **2. API Route Mapping** <br> Discover all registered endpoints and handler files. | **~20,162 tokens** <br>(Requires reading multiple route-registration files, middleware modules, and unit test suites). | **~65 tokens** <br>(Cypher execution: fetches all `Route` nodes containing route paths and source locations). | **310x Reduction** <br>(99.68% Saved) | **Interface Discovery**: Obtains complete routing topography without feeding entire source files to the LLM. |
| **3. Monorepo Class Indexing** <br> Index all classes and paths in the workspace. | **~87,500 tokens** <br>(Requires reading over 20 files containing class structures to capture inheritance and signatures). | **~1,250 tokens** <br>(Cypher execution: returns a complete node list of all `Class` names and file paths). | **70x Reduction** <br>(98.57% Saved) | **Architecture Mapping**: Instant monorepo-wide indexing with minimal network and computational overhead. |

---

## Language Support Matrix

| Language | Imports | Named Bindings | Exports | Heritage | Type Annotations | Constructor Inference | Config | Frameworks | Entry Points |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **TypeScript** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **JavaScript** | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ |
| **Python** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Java** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ |
| **Kotlin** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ |
| **C#** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Go** | ✓ | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Rust** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ |
| **PHP** | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Ruby** | ✓ | — | ✓ | ✓ | — | ✓ | — | ✓ | ✓ |
| **Swift** | — | — | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **C** | — | — | ✓ | — | ✓ | ✓ | — | ✓ | ✓ |
| **C++** | — | — | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ |
| **Dart** | ✓ | — | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ |

---

## Troubleshooting Guide

### 1. Arborist Conflict: `Cannot destructure property 'package'`
This error occurs in older npm environments due to unresolved symbolic references. 
*   **Remedy**: Update your CLI package to version `v1.6.2+`:
    ```bash
    npm install -g arceus-s@latest
    npm cache clean --force
    ```

### 2. Grammar Compilation Failures
Advanced syntax structures (Dart, Kotlin, Swift) require local C++ compilers. If compilation fails, Arceus bypasses these optional parsers and functions normally for other languages.
*   **Remedy (macOS/Linux)**: Install development essentials:
    ```bash
    # Debian/Ubuntu
    sudo apt install python3 make g++
    # macOS
    xcode-select --install
    ```

### 3. DuckDB Vector Extension Load Warns
Arceus queries leverage local analytical extensions. During `analyze`, it attempts to auto-download them. If offline or in an air-gapped environment, you can set the install behavior:

| Environment Variable | Supported Options | Description |
| :--- | :--- | :--- |
| `ARC_LBUG_EXTENSION_INSTALL` | `auto`, `load-only`, `never` | `auto` downloads on demand. `load-only` prevents network queries. `never` disables vector extensions. |
| `ARC_LBUG_EXTENSION_INSTALL_TIMEOUT_MS` | Integer value | Download process budget in milliseconds (defaults to `15000`). |

### 4. Memory Heap Exceeded on Large Codebases
If the process runs out of memory, increase Node's heap size:
```bash
NODE_OPTIONS="--max-old-space-size=16384" arc analyze
```

---

## License

Copyright (c) 2026 Chandan Kumar Behera

[PolyForm Noncommercial 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0/)

Free for non-commercial use. Contact for commercial licensing.
