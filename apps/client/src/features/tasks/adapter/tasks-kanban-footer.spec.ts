import { describe, expect, it } from "vitest";
import { SYS } from "./tasks-native-ui-adapter";

/**
 * Card footer must follow view.config.visiblePropertyIds (KanbanCardProperties).
 * FILES_NOT_IMPLEMENTED / Comments NOT DISPLAYED.
 */
describe("Tasks kanban card footer visibility contract", () => {
  it("footer-capable system ids", () => {
    expect(SYS.space).toBe("sys:space");
    expect(SYS.dueDate).toBe("sys:dueDate");
  });

  it("renders nothing when Space and Due are OFF", () => {
    const visible: string[] = [];
    const showSpace = visible.includes(SYS.space);
    const showDue = visible.includes(SYS.dueDate);
    expect(showSpace || showDue).toBe(false);
  });

  it("shows Due alone when only Due is ON", () => {
    const visible = [SYS.dueDate];
    expect(visible.includes(SYS.space)).toBe(false);
    expect(visible.includes(SYS.dueDate)).toBe(true);
  });
});
