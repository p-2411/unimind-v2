type Assessment = {
  id: string;
  name: string;
  date: Date;
  description?: string | null;
  courseId: string;
};

type AssessmentsProps = {
  assessments?: Assessment[];
};

export function Assessments({ assessments = [] }: AssessmentsProps) {
  if (assessments.length === 0) {
    return (
      <div className="rounded-xl bg-muted/50 p-4">
        <h2 className="text-xl font-semibold mb-2">Assessments</h2>
        <p className="text-sm text-muted-foreground">No upcoming assessments</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-muted/50 p-4">
      <h2 className="text-xl font-semibold mb-4">Assessments</h2>
      <div className="space-y-3">
        {assessments.map((assessment) => (
          <div key={assessment.id} className="border-b border-border pb-3 last:border-0">
            <div className="font-medium">{assessment.name}</div>
            <div className="text-sm text-muted-foreground">
              {new Date(assessment.date).toLocaleDateString()}
            </div>
            {assessment.description && (
              <div className="text-sm text-muted-foreground mt-1">{assessment.description}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
