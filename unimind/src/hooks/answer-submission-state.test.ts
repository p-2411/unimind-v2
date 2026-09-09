import { getOrCreateStablePayload, keepPreviewQuestion } from "./answer-submission-state";

describe("preview question identity", () => {
  const first = { id: "first", answerIndex: 0 };
  const second = { id: "second", answerIndex: 2 };

  it("keeps pending, failed, or revealed attempts on unrelated refreshes", () => {
    expect(keepPreviewQuestion(first, second, true, true)).toBe(first);
    expect(keepPreviewQuestion(first, null, true, false)).toBe(first);
  });

  it("keeps an unsubmitted selection with its question", () => {
    expect(keepPreviewQuestion(first, second, false, true)).toBe(first);
  });

  it("accepts the next question only after clearing the completed interaction", () => {
    expect(keepPreviewQuestion(first, second, false, false)).toBe(second);
    expect(keepPreviewQuestion(first, first, false, false)).toBe(first);
    expect(keepPreviewQuestion(first, null, false, false)).toBeNull();
  });
});

describe("getOrCreateStablePayload", () => {
  it("captures a new payload for a new interaction", () => {
    const payload = getOrCreateStablePayload(undefined, { choiceIndex: 2 }, (draft) => ({
      ...draft,
      attemptId: "attempt-1",
    }));

    expect(payload).toEqual({ choiceIndex: 2, attemptId: "attempt-1" });
  });

  it("reuses the captured payload unchanged for a retry", () => {
    const captured = { choiceIndex: 1, attemptId: "attempt-1" };
    const create = jest.fn(() => ({ choiceIndex: 3, attemptId: "attempt-2" }));

    const retried = getOrCreateStablePayload(captured, { choiceIndex: 3 }, create);

    expect(retried).toBe(captured);
    expect(create).not.toHaveBeenCalled();
  });

  it("creates a fresh identity after an interaction is reset", () => {
    let sequence = 0;
    const create = (draft: { choiceIndex: number }) => ({
      ...draft,
      attemptId: `attempt-${++sequence}`,
    });

    const first = getOrCreateStablePayload(undefined, { choiceIndex: 0 }, create);
    const next = getOrCreateStablePayload(undefined, { choiceIndex: 0 }, create);

    expect(first.attemptId).toBe("attempt-1");
    expect(next.attemptId).toBe("attempt-2");
  });
});
