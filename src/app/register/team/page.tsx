import type { Metadata } from "next";
import { RoutePage } from "@/components/pages";

export const metadata: Metadata = {
  title: "Register a team",
  description: "Submit an ALCL community tournament team and roster registration.",
};

export default function RegisterTeamPage() {
  return <RoutePage segments={["register", "team"]} />;
}
