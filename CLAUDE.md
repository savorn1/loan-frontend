# CLAUDE.md

## Workflow

- After making code changes, run `npm run format` to apply Prettier formatting before finishing the task.
- Double check the diff afterward — Prettier can restructure multi-statement inline template handlers (e.g. `@click="a = 1; b = 2"`) in a way that breaks Vue's template expression parser.
