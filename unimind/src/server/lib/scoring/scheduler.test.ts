import { Rating, State, createEmptyCard } from "ts-fsrs";
import { applyAnswer } from "./scheduler";

describe("applyAnswer", () => {
  it("creates a fresh card on first attempt and advances state", () => {
    const now = new Date("2026-04-17T10:00:00Z");
    const { card, log } = applyAnswer({
      prevCard: null,
      rating: Rating.Good,
      now,
    });

    // Brand-new card → after Good, state should leave New.
    expect(card.state).not.toBe(State.New);
    // Stability and difficulty must be set to non-default positive numbers.
    expect(card.stability).toBeGreaterThan(0);
    expect(card.difficulty).toBeGreaterThan(0);
    // Log records the rating that was applied.
    expect(log.rating).toBe(Rating.Good);
    // last_review pinned to `now`.
    expect(card.last_review?.getTime()).toBe(now.getTime());
  });

  it("advances an existing card forward in time on a Good rating", () => {
    const t0 = new Date("2026-04-17T10:00:00Z");
    const t1 = new Date("2026-04-18T10:00:00Z");
    const t2 = new Date("2026-04-21T10:00:00Z");

    const first = applyAnswer({ prevCard: null, rating: Rating.Good, now: t0 }).card;
    const second = applyAnswer({ prevCard: first, rating: Rating.Good, now: t1 }).card;
    const third = applyAnswer({ prevCard: second, rating: Rating.Good, now: t2 }).card;

    // Three successive Goods should monotonically increase stability.
    expect(second.stability).toBeGreaterThanOrEqual(first.stability);
    expect(third.stability).toBeGreaterThan(second.stability);
    // Reps counter increments.
    expect(third.reps).toBeGreaterThan(first.reps);
  });

  it("increments lapses when a Review-state card is rated Again", () => {
    const t0 = new Date("2026-04-17T10:00:00Z");
    const t1 = new Date("2026-04-18T10:00:00Z");
    const t2 = new Date("2026-04-21T10:00:00Z");
    const t3 = new Date("2026-04-29T10:00:00Z");

    // Chain Goods to graduate the card from Learning into Review state.
    const c1 = applyAnswer({ prevCard: null, rating: Rating.Good, now: t0 }).card;
    const c2 = applyAnswer({ prevCard: c1, rating: Rating.Good, now: t1 }).card;
    const reviewing = applyAnswer({ prevCard: c2, rating: Rating.Good, now: t2 }).card;

    expect(reviewing.state).toBe(State.Review);

    const lapsed = applyAnswer({ prevCard: reviewing, rating: Rating.Again, now: t3 }).card;

    // ts-fsrs only counts lapses on Review → Relearning transitions.
    expect(lapsed.lapses).toBe(reviewing.lapses + 1);
    expect(lapsed.state).toBe(State.Relearning);
  });

  it("accepts a Card produced by createEmptyCard as prevCard input", () => {
    // Sanity: an externally-constructed empty card should round-trip cleanly.
    const now = new Date("2026-04-17T10:00:00Z");
    const empty = createEmptyCard(now);
    const { card } = applyAnswer({ prevCard: empty, rating: Rating.Good, now });
    expect(card.state).not.toBe(State.New);
  });
});
