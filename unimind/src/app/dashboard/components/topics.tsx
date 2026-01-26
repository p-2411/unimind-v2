type Topic = {
  id: string;
  topicName: string;
  score: number;
};

type TopicsProps = {
  topics: Topic[];
};

export function Topics({ topics }: TopicsProps) {
  return (
    <>
      {topics.slice(0, 3).map((topic) => (
        <div key={topic.id} className="aspect-video rounded-xl bg-muted/50 p-4">
          <div className="font-semibold">Topic Name: {topic.topicName}</div>
          <div className="text-sm text-muted-foreground">Topic Score: {topic.score}</div>
        </div>
      ))}
    </>
  );
}
