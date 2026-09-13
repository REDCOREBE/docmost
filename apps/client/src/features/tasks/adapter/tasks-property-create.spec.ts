import { describe, expect, it } from "vitest";
import { clampProgressPercent } from "@/ee/base/components/cells/progress-utils";
import { mapBasePropertyTypeToTask } from "./tasks-native-ui-adapter";

describe("mapBasePropertyTypeToTask", () => {
  it.each([
    ["text", "text"],
    ["longText", "long_text"],
    ["number", "number"],
    ["select", "select"],
    ["multiSelect", "multi_select"],
    ["date", "date"],
    ["person", "person"],
    ["page", "page"],
  ] as const)("maps %s → %s", (base, task) => {
    expect(mapBasePropertyTypeToTask(base)).toBe(task);
  });

  it("rejects formula (unsupported on Tasks)", () => {
    expect(mapBasePropertyTypeToTask("formula")).toBeNull();
  });
});

describe("clampProgressPercent", () => {
  it.each([0, 45, 100])("keeps valid %i", (n) => {
    expect(clampProgressPercent(n)).toBe(n);
  });

  it("clamps below 0 and above 100", () => {
    expect(clampProgressPercent(-1)).toBe(0);
    expect(clampProgressPercent(101)).toBe(100);
  });

  it("rounds display values", () => {
    expect(clampProgressPercent(44.6)).toBe(45);
  });
});
