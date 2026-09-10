type DashboardAlertProps = {
  error?: string | null;
  status?: string | null;
  message?: string | null;
};

export function DashboardAlert({ error, status, message }: DashboardAlertProps) {
  if (error === "forbidden") {
    return (
      <div className="card dashboard-alert" role="alert">
        <strong>Access Restricted</strong>
        <p>Organizer tools require a separate role. You are signed in as a player.</p>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="card dashboard-alert dashboard-alert-warn" role="status">
        <strong>Team Registration Submitted</strong>
        <p>Your team is pending organizer review. You can update roster details from My Team.</p>
      </div>
    );
  }

  if (status === "approved") {
    return (
      <div className="card dashboard-alert dashboard-alert-success" role="status">
        <strong>Team Ready</strong>
        <p>{message ?? "Your team was created successfully."}</p>
      </div>
    );
  }

  return null;
}
