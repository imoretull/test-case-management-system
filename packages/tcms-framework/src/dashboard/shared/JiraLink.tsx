interface JiraLinkProps {
  storyKey: string;
  className?: string;
}

// Read VITE_JIRA_BASE_URL without depending on an ambient import.meta.env
// type definition (which only exists when the consuming app uses Vite).
function getJiraBase(): string {
  const meta = import.meta as unknown as {
    env?: { VITE_JIRA_BASE_URL?: string };
  };
  return meta.env?.VITE_JIRA_BASE_URL ?? 'https://example.atlassian.net';
}

export function JiraLink({ storyKey, className }: JiraLinkProps) {
  const href = `${getJiraBase()}/browse/${storyKey}`;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={
        className ?? 'font-mono text-sm text-blue-700 hover:underline'
      }
    >
      {storyKey}
    </a>
  );
}
