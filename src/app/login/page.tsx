import type { Metadata } from "next";

import { RoutePage } from "@/components/pages";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in or create your ALCL account.",
};

export default function LoginPage() {
  return <RoutePage segments={["login"]} />;
}
