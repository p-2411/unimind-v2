import {
  fsrs,
  createEmptyCard,
  type Card,
  type RecordLogItem,
  type Rating,
} from "ts-fsrs";

const f = fsrs(); // default parameters: enable_fuzz=true, enable_short_term=false

export type SchedulerInput = {
  prevCard: Card | null;
  rating: Rating;
  now: Date;
};

export function applyAnswer({
  prevCard,
  rating,
  now,
}: SchedulerInput): RecordLogItem {
  const card = prevCard ?? createEmptyCard(now);
  return f.next(card, now, rating);
}
