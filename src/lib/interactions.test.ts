import { renderHook, act } from "@testing-library/react";
import { useInteractionTracker } from "./interactions";

describe("useInteractionTracker", () => {
  test("anchors nudge to the most recent expand for the top entity", () => {
    const { result } = renderHook(() => useInteractionTracker());

    act(() => {
      result.current.track("expand", ["Anthropic"], "latest:tech-0");
      result.current.track("expand", ["Anthropic"], "latest:tech-0");
      result.current.track("expand", ["Anthropic"], "latest:tech-0");
    });

    expect(result.current.getNudge()).toEqual({ entityKey: "Anthropic", storyKey: "latest:tech-0" });

    act(() => {
      result.current.track("expand", ["Setfords"], "latest:law-1");
      result.current.track("expand", ["Setfords"], "latest:law-1");
      result.current.track("expand", ["Setfords"], "latest:law-1");
      result.current.track("expand", ["Setfords"], "latest:law-1");
    });

    expect(result.current.getNudge()?.entityKey).toBe("Setfords");
    expect(result.current.getNudge()?.storyKey).toBe("latest:law-1");

    act(() => {
      result.current.track("expand", ["Anthropic"], "latest:business-2");
    });

    expect(result.current.getNudge()).toEqual({ entityKey: "Anthropic", storyKey: "latest:business-2" });
  });

  test("returns null after session answered", () => {
    const { result } = renderHook(() => useInteractionTracker());

    act(() => {
      result.current.track("expand", ["AI"], "latest:tech-1");
      result.current.track("expand", ["AI"], "latest:tech-1");
      result.current.track("expand", ["AI"], "latest:tech-1");
      result.current.markNudgeSessionAnswered();
    });

    expect(result.current.getNudge()).toBeNull();
  });
});
