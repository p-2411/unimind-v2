type Question = {
  id: string;
  question: string;
  difficulty: number;
  topicId: string;
};

type QuestionsProps = {
  questions?: Question[];
};

export function Questions({ questions = [] }: QuestionsProps) {
  if (questions.length === 0) {
    return (
      <div className="rounded-xl bg-muted/50 p-4">
        <h2 className="text-xl font-semibold mb-2">Recent Questions</h2>
        <p className="text-sm text-muted-foreground">No recent questions</p>
      </div>
    );
  }

  const getDifficultyLabel = (difficulty: number) => {
    switch (difficulty) {
      case 1:
        return "Easy";
      case 2:
        return "Medium";
      case 3:
        return "Hard";
      default:
        return "Unknown";
    }
  };

  return (
    <div className="rounded-xl bg-muted/50 p-4">
      <h2 className="text-xl font-semibold mb-4">Recent Questions</h2>
      <div className="space-y-3">
        {questions.slice(0, 5).map((question) => (
          <div key={question.id} className="border-b border-border pb-3 last:border-0">
            <div className="font-medium line-clamp-2">{question.question}</div>
            <div className="text-sm text-muted-foreground mt-1">
              Difficulty: {getDifficultyLabel(question.difficulty)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
