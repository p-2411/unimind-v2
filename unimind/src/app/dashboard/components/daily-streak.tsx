type DailyStreakProps = {
  currentStreak?: number;
  longestStreak?: number;
};

export function DailyStreak({ currentStreak = 0, longestStreak = 0 }: DailyStreakProps) {
  return (
    <div className="aspect-video rounded-xl bg-muted/50 p-4 flex flex-col justify-center items-center">
      <div className="text-4xl font-bold">{currentStreak}</div>
      <div className="text-sm text-muted-foreground mt-2">Day Streak</div>
      <div className="text-xs text-muted-foreground mt-1">Longest: {longestStreak} days</div>
    </div>
  );
}
