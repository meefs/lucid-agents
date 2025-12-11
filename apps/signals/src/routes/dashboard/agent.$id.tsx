import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/dashboard/agent/$id')({
  component: AgentDetailPage,
});

function AgentDetailPage() {
  return (
    <div>
      <Outlet />
    </div>
  );
}
