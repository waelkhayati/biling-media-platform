import type { StaffAccessRow } from "@biling/contracts";
import { StudioStaffForm } from "@/components/studio-staff-form";
import { StudioStaffInviteForm } from "@/components/studio-staff-invite-form";
import { readStudio, requireStudioAccount } from "@/lib/studio-api";
import { notFound } from "next/navigation";

export default async function StudioStaffPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string }>;
}) {
  const account = await requireStudioAccount();
  if (account.role !== "ADMIN") notFound();
  const [staff, search] = await Promise.all([readStudio<StaffAccessRow[]>("/staff"), searchParams]);

  return (
    <>
      <div className="studio-heading">
        <h1>Staff access</h1>
      </div>
      <StudioStaffInviteForm />
      <p>
        Suspending an account blocks sign-in and ends its sessions. Revoking sessions keeps the
        account active.
      </p>
      {search.updated === "1" && (
        <p className="studio-success" role="status">
          Staff access updated.
        </p>
      )}
      <div
        className="studio-table-scroll"
        tabIndex={0}
        role="region"
        aria-label="Staff access table"
      >
        <table className="studio-table">
          <thead>
            <tr>
              <th scope="col">Staff member</th>
              <th scope="col">Role</th>
              <th scope="col">Access</th>
              <th scope="col">Authenticator</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((row) => (
              <tr key={row.id}>
                <th scope="row">{row.email}</th>
                <td>{row.role === "ADMIN" ? "Administrator" : "Editor"}</td>
                <td>{row.active ? "Active" : "Suspended"}</td>
                <td>
                  {row.pendingInvitation
                    ? "Invitation pending"
                    : row.enrolled
                      ? "Enrolled"
                      : "Setup required"}
                </td>
                <td>
                  {row.id === account.id ? (
                    "Current account"
                  ) : (
                    <StudioStaffForm id={row.id} active={row.active} email={row.email} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
