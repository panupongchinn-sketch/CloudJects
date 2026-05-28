import { createContext, useContext, type Dispatch, type SetStateAction } from "react";
import { type fetchProjectBundle } from "@/lib/app-data";

type ProjectBundle = NonNullable<Awaited<ReturnType<typeof fetchProjectBundle>>>;

export type ProjectLayoutContextValue = {
  bundle: ProjectBundle | null;
  loading: boolean;
  error: string | null;
  setBundle: Dispatch<SetStateAction<ProjectBundle | null>>;
};

export const ProjectLayoutContext = createContext<ProjectLayoutContextValue | null>(null);

export function useProjectLayoutContext() {
  const context = useContext(ProjectLayoutContext);
  if (!context) {
    throw new Error("useProjectLayoutContext must be used within ProjectLayout");
  }

  return context;
}
