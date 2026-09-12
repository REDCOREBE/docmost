# AI (future — not in V1)

Do **not** wire MCP or AI Chat tools in V1.

When ready:

- Tools (`list_tasks`, `search_tasks`, `get_task`, `create_task`, `update_task`, `complete_task`) must call `TaskService` with the **same JWT user** and Space ACL.
- No elevated AI role.
- Prefer fork-owned wrappers over patching missing `apps/server/src/ee` MCP server.
- RAG / page context can combine later via existing `contextPageId` / `contextSpaceId` chat fields.

See also: `apps/client/src/ee/ai/components/mcp-settings.tsx` (page tools list — documentation only for now).
