export type AchievementSeed = {
  code: string;
  name: string;
  description: string;
  category: "streak" | "volume" | "mastery" | "breadth" | "meta";
  tier: 1 | 2 | 3;
  xpReward: number;
  iconKey?: string;
};

// Phase 1 catalog. Extend in later phases — order here controls display order
// within a category on the /achievements page.
export const ACHIEVEMENTS: AchievementSeed[] = [
  // Streak
  { code: "STREAK_3",  name: "Warm-Up",        description: "Maintain a 3-day streak.",  category: "streak", tier: 1, xpReward: 25,  iconKey: "flame-1" },
  { code: "STREAK_7",  name: "Week One",       description: "Maintain a 7-day streak.",  category: "streak", tier: 2, xpReward: 75,  iconKey: "flame-2" },
  { code: "STREAK_30", name: "Month Strong",   description: "Maintain a 30-day streak.", category: "streak", tier: 3, xpReward: 300, iconKey: "flame-3" },

  // Volume (total correct answers)
  { code: "VOL_10",   name: "First Ten",     description: "Answer 10 questions correctly.",   category: "volume", tier: 1, xpReward: 20,  iconKey: "target-1" },
  { code: "VOL_100",  name: "Centurion",     description: "Answer 100 questions correctly.",  category: "volume", tier: 2, xpReward: 100, iconKey: "target-2" },
  { code: "VOL_1000", name: "Thousandaire",  description: "Answer 1000 questions correctly.", category: "volume", tier: 3, xpReward: 500, iconKey: "target-3" },

  // Mastery (per-topic mastery thresholds)
  { code: "MASTERY_70_ONE",    name: "Specialist",    description: "Reach 70 mastery in one topic.",       category: "mastery", tier: 1, xpReward: 40,  iconKey: "spark-1" },
  { code: "MASTERY_85_ONE",    name: "Expert",        description: "Reach 85 mastery in one topic.",       category: "mastery", tier: 2, xpReward: 120, iconKey: "spark-2" },
  { code: "MASTERY_70_FIVE",   name: "Well-Rounded",  description: "Reach 70 mastery in five topics.",     category: "mastery", tier: 3, xpReward: 250, iconKey: "spark-3" },

  // Breadth (topics or courses touched)
  { code: "BREADTH_3_TOPICS",  name: "Explorer",      description: "Practice in 3 different topics.",      category: "breadth", tier: 1, xpReward: 20,  iconKey: "map-1" },
  { code: "BREADTH_10_TOPICS", name: "Cartographer",  description: "Practice in 10 different topics.",     category: "breadth", tier: 2, xpReward: 100, iconKey: "map-2" },
  { code: "BREADTH_2_COURSES", name: "Polymath",      description: "Enrol in and practice 2 courses.",     category: "breadth", tier: 3, xpReward: 150, iconKey: "map-3" },

  // Meta (one-off / onboarding)
  { code: "META_FIRST_ANSWER", name: "First Step",    description: "Answer your very first question.",     category: "meta", tier: 1, xpReward: 10,  iconKey: "start" },
  { code: "META_HARD_ANSWER",  name: "No Easy Road",  description: "Answer a difficulty-3 question correctly.", category: "meta", tier: 1, xpReward: 30,  iconKey: "shield" },
  { code: "META_LEVEL_5",      name: "Cadet",         description: "Reach level 5.",                        category: "meta", tier: 2, xpReward: 100, iconKey: "pip-2" },
];
