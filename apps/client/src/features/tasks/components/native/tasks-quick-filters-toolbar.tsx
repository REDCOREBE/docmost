import { useEffect, useMemo, useState } from "react";
import { MultiSelect, Select } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { useWorkspaceMembersQuery } from "@/features/workspace/queries/workspace-query";
import { useGetSpacesQuery } from "@/features/space/queries/space-query";
import type { IUser } from "@/features/user/types/user.types";
import type { ISpace } from "@/features/space/types/space.types";
import {
  parseQuickFiltersFromSearch,
  writeQuickFiltersToUrl,
  type TasksQuickFilterState,
} from "./tasks-quick-filters";

type Props = {
  value: TasksQuickFilterState;
  onChange: (next: TasksQuickFilterState) => void;
};

/**
 * Ephemeral Global Tasks Person / Space controls.
 * URL-backed; never writes task_views / view.config.
 */
export function TasksQuickFiltersToolbar({ value, onChange }: Props) {
  const { t } = useTranslation();
  const { data: membersData } = useWorkspaceMembersQuery({ limit: 100 });
  const { data: spacesData } = useGetSpacesQuery({ limit: 100 });

  const memberOptions = useMemo(() => {
    const items = (membersData?.items ?? []) as IUser[];
    return items.map((u) => ({
      value: u.id,
      label: u.name || u.email || u.id,
    }));
  }, [membersData]);

  const spaceOptions = useMemo(() => {
    const items = (spacesData?.items ?? []) as ISpace[];
    return items.map((s) => ({
      value: s.id,
      label: s.name,
      name: s.name,
    }));
  }, [spacesData]);

  const spaceNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of spaceOptions) map.set(s.value, s.name);
    return map;
  }, [spaceOptions]);

  return (
    <>
      <MultiSelect
        size="xs"
        w={180}
        clearable
        searchable
        aria-label={t("Personne")}
        placeholder={t("Toutes les personnes")}
        data={memberOptions}
        value={value.assigneeIds}
        onChange={(ids) => {
          const next = {
            ...value,
            assigneeIds: ids,
          };
          writeQuickFiltersToUrl(next);
          onChange(next);
        }}
        maxValues={20}
        hidePickedOptions
      />
      <Select
        size="xs"
        w={160}
        clearable
        searchable
        aria-label={t("Espace")}
        placeholder={t("Tous les espaces")}
        data={spaceOptions.map(({ value: v, label }) => ({
          value: v,
          label,
        }))}
        value={value.spaceId}
        onChange={(id) => {
          const spaceId = id || null;
          const next = {
            ...value,
            spaceId,
            spaceName: spaceId ? spaceNameById.get(spaceId) ?? null : null,
          };
          writeQuickFiltersToUrl(next);
          onChange(next);
        }}
        allowDeselect
      />
    </>
  );
}

/** Sync URL → state on mount / popstate; resolve space name when spaces load. */
export function useTasksQuickFiltersFromUrl(
  spaces: Array<{ id: string; name: string }>,
): [TasksQuickFilterState, (next: TasksQuickFilterState) => void] {
  const [state, setState] = useState<TasksQuickFilterState>(() => {
    const parsed = parseQuickFiltersFromSearch(window.location.search);
    return {
      assigneeIds: parsed.assigneeIds,
      spaceId: parsed.spaceId,
      spaceName: null,
    };
  });

  useEffect(() => {
    const sync = () => {
      const parsed = parseQuickFiltersFromSearch(window.location.search);
      setState((prev) => ({
        assigneeIds: parsed.assigneeIds,
        spaceId: parsed.spaceId,
        spaceName: parsed.spaceId
          ? spaces.find((s) => s.id === parsed.spaceId)?.name ?? prev.spaceName
          : null,
      }));
    };
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, [spaces]);

  useEffect(() => {
    if (!state.spaceId) return;
    const name = spaces.find((s) => s.id === state.spaceId)?.name ?? null;
    if (name && name !== state.spaceName) {
      setState((prev) => ({ ...prev, spaceName: name }));
    }
  }, [spaces, state.spaceId, state.spaceName]);

  return [state, setState];
}
