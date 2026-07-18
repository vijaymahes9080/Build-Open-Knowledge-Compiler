import React from "react";
import WorkspaceClient from "./WorkspaceClient";

export async function generateStaticParams() {
  // Pre-generate static path for build export compatibility
  return [{ id: "demo" }];
}

export default function WorkspacePage() {
  return <WorkspaceClient />;
}
