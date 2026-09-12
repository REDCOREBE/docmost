# Permissions

Reuse existing Space CASL. No `TaskAbilityFactory`. No CASL subject `Task`.

## Factory

`SpaceAbilityFactory.createForUser(user, spaceId)`

Non-member → native `NotFoundException` (404). Do not coerce to 403.

## Mapping (tasks)

| Operation | Check |
|-----------|--------|
| Read | `cannot(Read, Page)` → Forbidden |
| Create / Update | `cannot(Edit, Page)` → Forbidden |
| Delete / shared Space views | `cannot(Manage, Settings)` → Forbidden |

| Role | Read | Create/Update | Delete / shared views |
|------|------|---------------|------------------------|
| reader | yes | no | no |
| writer | yes | yes | no |
| admin | yes | yes | yes |

Writer has `Manage Page` (implies Edit). Writer has only `Read Settings` → cannot Manage Settings.

## Mapping (V2 custom properties)

| Operation | Check |
|-----------|--------|
| List / read property + values | Read Page |
| Set / clear property value | Edit Page |
| Create / rename / reorder / configure / delete property | Manage Settings |

All property queries require `workspaceId` + `spaceId` (property is always space-scoped).

Person values: every userId must be a Space member.
Page values: page must be in same Space and accessible to the writer (`filterAccessiblePageIds`).

## Global list

Do **not** call `createForUser` per row. Filter:

```
workspaceId = auth workspace
AND spaceId IN SpaceMemberRepo.getUserSpaceIdsQuery(userId)
```

Scope tabs are client filters only (`assignee=me`, `due=overdue`) — they do not weaken ACL.

## Assignees on write

Every `assigneeId` must have Space membership (`getUserIdsWithSpaceAccess` / roles). Reject others.

## Linked page

Task visibility ≠ page visibility. If page inaccessible / soft-deleted / other space: `linkedPage: null` (no title/slug leak). Same rule for page-type custom properties.
