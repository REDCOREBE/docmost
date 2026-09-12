# Views

## Global scope tabs (V2 — not saved views)

Client-only filters on `/tasks`:

1. **Tout** — no `assignee` / `due` filter (default)
2. **Mes tâches** — `assignee=me`
3. **En retard** — `due=overdue`

Separate from Table / Board layout tabs.

## Virtual defaults (no DB row)

1. **Table** — type `table`
2. **Board** — type `kanban`, `groupBy: status`

## Saved views (`task_views`)

| space_id | owner_user_id | Meaning | Who writes |
|----------|---------------|---------|------------|
| set | null | Shared Space view | Space admin (`Manage Settings`) |
| set | user | Personal Space view | Owner |
| null | user | Personal global view | Owner |
| null | null | Shared global | **Forbidden in V1/V2** |

## Config JSON

```json
{
  "sorts": [{ "field": "updatedAt", "direction": "desc" }],
  "filter": { "status": "todo", "assignee": "me", "due": "overdue" },
  "groupBy": "status",
  "visibleColumnIds": ["title", "status", "assignees", "priority", "progress", "dueDate", "space"],
  "visiblePropertyIds": ["uuid-of-custom-property"]
}
```

- `visiblePropertyIds` — custom `task_properties` shown on Kanban cards (and optionally table later)
- Independent of Base `FilterGroup` / ViewConfig EE
- No full dynamic Base column engine in V2
