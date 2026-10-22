# Vendored skills

Copied from pinned commits. Nothing here is installed globally or executed; they are Markdown instructions for coding agents. To update one, re-copy from a newer commit, review the diff, and bump the SHA below.

| Skill | Source | Commit | License | Local changes |
|---|---|---|---|---|
| make-interfaces-feel-better | github.com/jakubkrehel/make-interfaces-feel-better `skills/make-interfaces-feel-better/` | `35545ea1512ad59fa463e6b1f95ca9c052981fe6` | MIT | none |
| no-ai-slop | github.com/petergyang/no-ai-slop `skills/no-ai-slop/` | `000650b156983f5159695b441477f4e63b25dc85` | MIT | none |
| humanizer | github.com/blader/humanizer `SKILL.md` | `8c307f367c91bd974002f10f2be2965d642c13df` | MIT | none |
| anti-ai-slop-writing | github.com/jalaalrd/anti-ai-slop-writing `skills/anti-ai-slop-writing/` | `63255f9bbb75a265dc5786a04535cd033f487756` | README says MIT; repo has no LICENSE file | `description` narrowed to public marketing copy so it doesn't fire on code, docs or UI microcopy |
| better-icons | github.com/better-auth/better-icons `skills/SKILL.md` | `033316ecb8f4982235af4111a2257e80231f5ab1` | MIT | none (see note) |
| superdesign | github.com/superdesigndev/superdesign-skill `skills/superdesign/` | `f9f05cd988c247dce6c072eaf9ac6b162f2ffc4b` | MIT | none |

## Notes

- **better-icons** runs as a project MCP server pinned in `.mcp.json` (`better-icons@1.0.5`). Ignore the skill's advice to `npm install -g` or run `better-icons setup`; setup rewrites global agent configs. Lookups go to the public `api.iconify.design` (no key).
- **superdesign** needs a Superdesign account (`npx @superdesign/cli@latest login`) and uploads drafts plus any context files you pass to superdesign.dev. See CLAUDE.md for what must never be sent.
- The superdesign repo (`superdesigndev/superdesign`) originally requested was not installed: it is an unmaintained VS Code extension that routes prompts through a third-party proxy by default. The maintained skill above replaces it.
