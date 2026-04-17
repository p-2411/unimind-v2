import {
  fsrs,
  createEmptyCard,
  type Card,
  type Grade,
  type RecordLogItem,
} from "ts-fsrs";

const f = fsrs(); // default parameters: enable_fuzz=true, enable_short_term=false

export type SchedulerInput = {
  prevCard: Card | null;
  rating: Grade; // 1=Again, 2=Hard, 3=Good, 4=Easy (excludes Manual=0)
  now: Date;
};

export function applyAnswer({
  prevCard,
  rating,
  now,
}: SchedulerInput): RecordLogItem {
  const card: Card = prevCard ?? createEmptyCard<Card>(now);
  return f.next(card, now, rating);
}
