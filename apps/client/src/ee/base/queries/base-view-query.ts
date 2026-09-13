import { useMutation } from "@tanstack/react-query";
import {
  createView,
  updateView,
  deleteView,
} from "@/ee/base/services/base-service";
import {
  IBase,
  IBaseView,
  CreateViewInput,
  UpdateViewInput,
  DeleteViewInput,
  ViewConfig,
  ViewConfigPatch,
} from "@/ee/base/types/base.types";

function applyConfigPatch(
  existing: ViewConfig | undefined,
  patch: ViewConfigPatch | undefined,
): ViewConfig {
  const merged: Record<string, unknown> = { ...(existing ?? {}) };
  for (const [key, value] of Object.entries(patch ?? {})) {
    if (value === null) delete merged[key];
    else if (value !== undefined) merged[key] = value;
  }
  return merged as ViewConfig;
}
import { notifications } from "@mantine/notifications";
import { queryClient } from "@/main";
import { useTranslation } from "react-i18next";
import { getApiErrorMessage } from "@/lib/api-error";
import { useBaseDataPorts } from "@/ee/base/context/base-data-ports";

export function useCreateViewMutation() {
  const { t } = useTranslation();
  const ports = useBaseDataPorts();
  return useMutation<IBaseView, Error, CreateViewInput>({
    mutationFn: (data) => {
      if (ports?.createView) {
        return ports.createView({
          pageId: data.pageId,
          name: data.name,
          type: data.type ?? "table",
          config: data.config,
        });
      }
      return createView(data);
    },
    onSuccess: (newView) => {
      if (ports?.createView) return;
      queryClient.setQueryData<IBase>(["bases", newView.pageId], (old) => {
        if (!old) return old;
        return {
          ...old,
          views: [...old.views, newView],
        };
      });
    },
    onError: (error) => {
      notifications.show({
        message: getApiErrorMessage(error, t("Failed to create view")),
        color: "red",
      });
    },
  });
}

export function useUpdateViewMutation() {
  const { t } = useTranslation();
  const ports = useBaseDataPorts();
  return useMutation<
    IBaseView,
    Error,
    UpdateViewInput,
    { previous: IBase | undefined }
  >({
    mutationFn: async (data) => {
      if (ports?.updateViewMeta) {
        return ports.updateViewMeta({
          pageId: data.pageId,
          viewId: data.viewId,
          name: data.name,
          type: data.type,
          position: data.position,
          config: data.config,
        });
      }
      if (ports?.persistViewConfig && data.config !== undefined) {
        ports.persistViewConfig({
          viewId: data.viewId,
          pageId: data.pageId,
          config: data.config,
        });
        return {
          id: data.viewId,
          pageId: data.pageId,
          name: data.name ?? "",
          type: data.type ?? "table",
          position: data.position ?? "a0",
          config: (data.config ?? {}) as ViewConfig,
          workspaceId: "",
          creatorId: "",
          createdAt: new Date(0).toISOString(),
          updatedAt: new Date(0).toISOString(),
        };
      }
      return updateView(data);
    },
    onMutate: async (variables) => {
      if (ports?.updateViewMeta || ports?.persistViewConfig) {
        return { previous: undefined };
      }
      await queryClient.cancelQueries({
        queryKey: ["bases", variables.pageId],
      });

      const previous = queryClient.getQueryData<IBase>([
        "bases",
        variables.pageId,
      ]);

      queryClient.setQueryData<IBase>(["bases", variables.pageId], (old) => {
        if (!old) return old;
        return {
          ...old,
          views: old.views.map((v) =>
            v.id === variables.viewId
              ? {
                  ...v,
                  ...(variables.name !== undefined && {
                    name: variables.name,
                  }),
                  ...(variables.type !== undefined && {
                    type: variables.type,
                  }),
                  ...(variables.config !== undefined && {
                    config: applyConfigPatch(v.config, variables.config),
                  }),
                  ...(variables.position !== undefined && {
                    position: variables.position,
                  }),
                }
              : v,
          ),
        };
      });

      return { previous };
    },
    onError: (error, variables, context) => {
      if (ports?.updateViewMeta || ports?.persistViewConfig) {
        notifications.show({
          message: getApiErrorMessage(error, t("Failed to update view")),
          color: "red",
        });
        return;
      }
      if (context?.previous) {
        queryClient.setQueryData(
          ["bases", variables.pageId],
          context.previous,
        );
      }
      notifications.show({
        message: getApiErrorMessage(error, t("Failed to update view")),
        color: "red",
      });
    },
    onSuccess: (updatedView) => {
      if (ports?.updateViewMeta || ports?.persistViewConfig) return;
      queryClient.setQueryData<IBase>(
        ["bases", updatedView.pageId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            views: old.views.map((v) =>
              v.id === updatedView.id ? updatedView : v,
            ),
          };
        },
      );
    },
  });
}

export function useDeleteViewMutation() {
  const { t } = useTranslation();
  const ports = useBaseDataPorts();
  return useMutation<void, Error, DeleteViewInput>({
    mutationFn: (data) => {
      if (ports?.deleteView) {
        return ports.deleteView({
          pageId: data.pageId,
          viewId: data.viewId,
        });
      }
      return deleteView(data);
    },
    onSuccess: (_, variables) => {
      if (ports?.deleteView) return;
      queryClient.setQueryData<IBase>(["bases", variables.pageId], (old) => {
        if (!old) return old;
        return {
          ...old,
          views: old.views.filter((v) => v.id !== variables.viewId),
        };
      });
    },
    onError: (error) => {
      notifications.show({
        message: getApiErrorMessage(error, t("Failed to delete view")),
        color: "red",
      });
    },
  });
}
