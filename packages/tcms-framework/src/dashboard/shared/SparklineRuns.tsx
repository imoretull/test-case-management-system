type RunStatus = 'pass' | 'fail' | 'skip';

interface SparklineRunsProps {
  runs: RunStatus[];
}

const ICON: Record<RunStatus, string> = {
  pass: '✅',
  fail: '🔴',
  skip: '⚪',
};

export function SparklineRuns({ runs }: SparklineRunsProps) {
  if (runs.length === 0) {
    return <span className="text-slate-400 text-xs">No run history</span>;
  }
  return (
    <span className="inline-flex items-center gap-1" aria-label="last runs">
      {runs.map((r, i) => (
        <span key={i} title={r} className="text-sm leading-none">
          {ICON[r]}
        </span>
      ))}
    </span>
  );
}
