type DashboardAlertProps = {
  error?: string | null;
  status?: string | null;
  message?: string | null;
};

export function DashboardAlert({ error, status, message }: DashboardAlertProps) {
  if (error === "forbidden") {
    return (
      <div className="card dashboard-alert" role="alert">
        <strong>Access restricted</strong>
        <p>Organizer tools require a separate role. You are signed in as a player.</p>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="card dashboard-alert dashboard-alert-warn" role="status">
        <strong>Team registration submitted</strong>
        <p>Your team is pending organizer review. You can update roster details from My team.</p>
      </div>
    );
  }

  if (status === "approved") {
    return (
      <div className="card dashboard-alert dashboard-alert-success" role="status">
        <strong>Team ready</strong>
        <p>{message ?? "Your team was created successfully."}</p>
      </div>
    );
  }

  return null;
}
