# Views

## Virtual defaults (no DB row)

1. **Tout** — type `table`, empty filter
2. **Tableau** — type `kanban`, `groupBy: status`

## Saved views (`task_views`)

| space_id | owner_user_id | Meaning | Who writes |
|----------|---------------|---------|------------|
| set | null | Shared Space view | Space admin (`Manage Settings`) |
| set | user | Personal Space view | Owner |
| null | user | Personal global view | Owner |
| null | null | Shared global | **Forbidden in V1** |

## Config JSON

```json
{
  "sorts": [{ "field": "updatedAt", "direction": "desc" }],
  "filter": { "status": "todo", "assignee": "me", "due": "overdue" },
  "groupBy": "status",
  "visibleColumnIds": ["title", "status", "assignees", "priority", "progress", "dueDate", "space"]
}
```

Independent of Base `FilterGroup` engine.
