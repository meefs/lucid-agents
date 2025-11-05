set shell := ['bash', '-uc']
set dotenv-load := true

# Colours
RED:= '\033[31m'
GREEN:= '\033[32m'
YELLOW:= '\033[33m'
BLUE:= '\033[34m'
MAGENTA:= '\033[35m'
CYAN:= '\033[36m'
WHITE:= '\033[37m'
BOLD:= '\033[1m'
UNDERLINE:= '\033[4m'
INVERTED_COLOURS:= '\033[7m'
RESET := '\033[0m'
NEWLINE := '\n'

# Default: show available recipes with pretty heading
default:
    @just --list --unsorted --list-heading $'{{BOLD}}{{GREEN}}Available commands:{{NEWLINE}}{{RESET}}'

# Install dependencies
install:
    @echo -e $'{{BOLD}}{{CYAN}}Installing dependencies...{{RESET}}'
    bun install
    @echo -e $'{{BOLD}}{{GREEN}}✅ Dependencies installed!{{RESET}}'

# Clean all build outputs
clean:
    @echo -e $'{{BOLD}}{{CYAN}}Cleaning build outputs...{{RESET}}'
    rm -rf packages/*/dist
    @echo -e $'{{BOLD}}{{GREEN}}✅ Build outputs cleaned!{{RESET}}'

# Build all packages
build-all:
    @echo -e $'{{BOLD}}{{CYAN}}Building all packages...{{RESET}}'
    bun run build:packages
    @echo -e $'{{BOLD}}{{GREEN}}✅ All packages built!{{RESET}}'

# Build a specific package
build PACKAGE:
    @echo -e $'{{BOLD}}{{CYAN}}Building {{PACKAGE}}...{{RESET}}'
    cd packages/{{PACKAGE}} && bun run build
    @echo -e $'{{BOLD}}{{GREEN}}✅ {{PACKAGE}} built!{{RESET}}'

# Clean and rebuild all packages
rebuild: clean build-all

# Test all packages
test-all:
    @echo -e $'{{BOLD}}{{CYAN}}Running all tests...{{RESET}}'
    bun test
    @echo -e $'{{BOLD}}{{GREEN}}✅ All tests completed!{{RESET}}'

# Test a specific package
test PACKAGE:
    @echo -e $'{{BOLD}}{{CYAN}}Running tests for {{PACKAGE}}...{{RESET}}'
    cd packages/{{PACKAGE}} && bun test
    @echo -e $'{{BOLD}}{{GREEN}}✅ {{PACKAGE}} tests completed!{{RESET}}'

# Typecheck all packages
typecheck-all:
    @echo -e $'{{BOLD}}{{CYAN}}Typechecking all packages...{{RESET}}'
    bun x tsc -p packages/agent-kit/tsconfig.json --noEmit
    bun x tsc -p packages/agent-kit-identity/tsconfig.json --noEmit
    bun x tsc -p packages/create-agent-kit/tsconfig.json --noEmit
    @echo -e $'{{BOLD}}{{GREEN}}✅ All packages typechecked!{{RESET}}'

# Typecheck a specific package
typecheck PACKAGE:
    @echo -e $'{{BOLD}}{{CYAN}}Typechecking {{PACKAGE}}...{{RESET}}'
    bun x tsc -p packages/{{PACKAGE}}/tsconfig.json --noEmit
    @echo -e $'{{BOLD}}{{GREEN}}✅ {{PACKAGE}} typechecked!{{RESET}}'

# Check all packages (typecheck + build + test) - mirrors CI
check-all: typecheck-all build-all test-all
    @echo -e $'{{BOLD}}{{GREEN}}✅ All checks passed!{{RESET}}'

# Show package versions
versions:
    @echo -e $'{{BOLD}}{{CYAN}}Package Versions:{{RESET}}'
    @cat packages/agent-kit/package.json | grep '"version"'
    @cat packages/agent-kit-identity/package.json | grep '"version"'
    @cat packages/create-agent-kit/package.json | grep '"version"'

# Create a new changeset
changeset:
    @echo -e $'{{BOLD}}{{CYAN}}Creating changeset...{{RESET}}'
    bunx @changesets/cli add

# Show pending changesets
changeset-status:
    @echo -e $'{{BOLD}}{{CYAN}}Changeset status:{{RESET}}'
    bunx @changesets/cli status

# Version packages (bump versions based on changesets)
version:
    @echo -e $'{{BOLD}}{{CYAN}}Versioning packages...{{RESET}}'
    bunx @changesets/cli version
    @echo -e $'{{BOLD}}{{GREEN}}✅ Packages versioned!{{RESET}}'

# Publish packages to npm
publish: build-all
    @echo -e $'{{BOLD}}{{CYAN}}Publishing packages...{{RESET}}'
    bun run scripts/changeset-publish.ts
    @echo -e $'{{BOLD}}{{GREEN}}✅ Packages published!{{RESET}}'

# Full release flow (version + publish)
release: version publish
    @echo -e $'{{BOLD}}{{GREEN}}✅ Release completed!{{RESET}}'
