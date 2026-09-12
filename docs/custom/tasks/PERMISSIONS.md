# Permissions

Reuse existing Space CASL. No `TaskAbilityFactory`. No CASL subject `Task`.

## Factory

`SpaceAbilityFactory.createForUser(user, spaceId)`

Non-member → native `NotFoundException` (404). Do not coerce to 403.

## Mapping

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

## Global list

Do **not** call `createForUser` per row. Filter:

```
workspaceId = auth workspace
AND spaceId IN SpaceMemberRepo.getUserSpaceIdsQuery(userId)
```

## Assignees on write

Every `assigneeId` must have Space membership (`getUserIdsWithSpaceAccess` / roles). Reject others.

## Linked page

Task visibility ≠ page visibility. If page inaccessible / soft-deleted / other space: `linkedPage: null` (no title/slug leak).
