import { describe, expect, it } from "vitest";
import {
  SYS,
  buildSystemProperties,
  cellUpdateToTaskMutation,
  mapTaskToBaseRow,
  mapTaskViewToBaseView,
  viewTypeFromBase,
} from "./tasks-native-ui-adapter";
import type { TaskItem, TaskView } from "../types/task.types";

describe("Tasks Gantt V1 adapter", () => {
  it("exposes sys:startDate synthetic property", () => {
    expect(SYS.startDate).toBe("sys:startDate");
    const props = buildSystemProperties({
      pageId: "p",
      workspaceId: "w",
      includeSpace: false,
    });
    expect(props.some((p) => p.id === SYS.startDate && p.type === "date")).toBe(
      true,
    );
    expect(props.some((p) => p.id === SYS.dueDate && p.type === "date")).toBe(
      true,
    );
  });

  it("maps startDate onto row cells", () => {
    const task = {
      id: "t1",
      workspaceId: "w",
      spaceId: "s",
      title: "A",
      status: "todo",
      priority: "none",
      progress: 10,
      startDate: "2026-09-01T00:00:00.000Z",
      dueDate: "2026-09-10T00:00:00.000Z",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    } as TaskItem;
    const row = mapTaskToBaseRow(task, "p");
    expect(row.cells[SYS.startDate]).toBe(task.startDate);
    expect(row.cells[SYS.dueDate]).toBe(task.dueDate);
  });

  it("maps gantt views with default date properties", () => {
    const view = {
      id: "v1",
      workspaceId: "w",
      name: "Gantt",
      type: "gantt",
      config: {},
      position: "a0",
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
    } as TaskView;
    const mapped = mapTaskViewToBaseView(view, "p");
    expect(mapped.type).toBe("gantt");
    expect(mapped.config.gantt?.startPropertyId).toBe(SYS.startDate);
    expect(mapped.config.gantt?.endPropertyId).toBe(SYS.dueDate);
    expect(mapped.config.gantt?.zoom).toBe("week");
  });

  it("round-trips viewTypeFromBase for gantt", () => {
    expect(viewTypeFromBase("gantt")).toBe("gantt");
  });

  it("mutates startDate via cellUpdateToTaskMutation", () => {
    const m = cellUpdateToTaskMutation(
      SYS.startDate,
      "2026-09-02T00:00:00.000Z",
      [],
    );
    expect(m).toEqual({
      kind: "system",
      patch: { startDate: "2026-09-02T00:00:00.000Z" },
    });
  });
});
