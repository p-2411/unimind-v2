"use client";

import { useCallback, useRef, useState } from "react";
import { api, type RouterInputs, type RouterOutputs } from "~/trpc/react";
import { getOrCreateStablePayload } from "./answer-submission-state";

type AnswerInput = RouterInputs["question"]["answer"];
export type AnswerDraft = Omit<AnswerInput, "attemptId">;
export type AnswerResult = RouterOutputs["question"]["answer"];

export type AnswerSubmissionState =
  | { status: "pending" }
  | { status: "error"; message: string }
  | { status: "success"; data: AnswerResult };

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The answer could not be submitted.";
}

export function useStableAnswerSubmission() {
  const mutation = api.question.answer.useMutation();
  const payloadsRef = useRef(new Map<string, AnswerInput>());
  const inFlightRef = useRef(new Set<string>());
  const completedRef = useRef(new Set<string>());
  const [states, setStates] = useState<Record<string, AnswerSubmissionState>>({});

  const send = useCallback(
    async (questionId: string, payload: AnswerInput) => {
      if (inFlightRef.current.has(questionId) || completedRef.current.has(questionId)) return;

      inFlightRef.current.add(questionId);
      setStates((current) => ({ ...current, [questionId]: { status: "pending" } }));

      try {
        const data = await mutation.mutateAsync(payload);
        completedRef.current.add(questionId);
        setStates((current) => ({
          ...current,
          [questionId]: { status: "success", data },
        }));
      } catch (error) {
        setStates((current) => ({
          ...current,
          [questionId]: { status: "error", message: errorMessage(error) },
        }));
      } finally {
        inFlightRef.current.delete(questionId);
      }
    },
    [mutation],
  );

  const submit = useCallback(
    (draft: AnswerDraft) => {
      const payload = getOrCreateStablePayload(
        payloadsRef.current.get(draft.questionId),
        draft,
        (capturedDraft): AnswerInput => ({
          ...capturedDraft,
          attemptId: globalThis.crypto.randomUUID(),
        }),
      );
      payloadsRef.current.set(draft.questionId, payload);
      void send(draft.questionId, payload);
    },
    [send],
  );

  const retry = useCallback(
    (questionId: string) => {
      const payload = payloadsRef.current.get(questionId);
      if (!payload) return;
      void send(questionId, payload);
    },
    [send],
  );

  const reset = useCallback((questionId: string) => {
    if (inFlightRef.current.has(questionId) || !completedRef.current.has(questionId)) return false;

    completedRef.current.delete(questionId);
    payloadsRef.current.delete(questionId);
    setStates((current) => {
      if (!(questionId in current)) return current;
      const next = { ...current };
      delete next[questionId];
      return next;
    });
    return true;
  }, []);

  return { states, submit, retry, reset };
}
