import projectCardBg01 from "@/assets/project-card-bg-01.png";
import projectCardBg02 from "@/assets/project-card-bg-02.png";
import projectCardBg03 from "@/assets/project-card-bg-03.png";
import projectCardBg04 from "@/assets/project-card-bg-04.png";
import projectCardBg05 from "@/assets/project-card-bg-05.png";
import projectCardBg06 from "@/assets/project-card-bg-06.png";
import projectCardBg07 from "@/assets/project-card-bg-07.png";
import projectCardBg08 from "@/assets/project-card-bg-08.png";
import projectCardBg09 from "@/assets/project-card-bg-09.png";
import projectCardBg10 from "@/assets/project-card-bg-10.png";

export const PROJECT_HEADER_BACKGROUND_OPTIONS = [
  { value: "project-card-bg-01", label: "ภาพที่ 1", image: projectCardBg01 },
  { value: "project-card-bg-02", label: "ภาพที่ 2", image: projectCardBg02 },
  { value: "project-card-bg-03", label: "ภาพที่ 3", image: projectCardBg03 },
  { value: "project-card-bg-04", label: "ภาพที่ 4", image: projectCardBg04 },
  { value: "project-card-bg-05", label: "ภาพที่ 5", image: projectCardBg05 },
  { value: "project-card-bg-06", label: "ภาพที่ 6", image: projectCardBg06 },
  { value: "project-card-bg-07", label: "ภาพที่ 7", image: projectCardBg07 },
  { value: "project-card-bg-08", label: "ภาพที่ 8", image: projectCardBg08 },
  { value: "project-card-bg-09", label: "ภาพที่ 9", image: projectCardBg09 },
  { value: "project-card-bg-10", label: "ภาพที่ 10", image: projectCardBg10 },
] as const;

export type ProjectHeaderBackground = (typeof PROJECT_HEADER_BACKGROUND_OPTIONS)[number]["value"];

const LEGACY_BACKGROUND_MAP: Record<string, ProjectHeaderBackground> = {
  blueprint: "project-card-bg-01",
  sunset: "project-card-bg-02",
  forest: "project-card-bg-03",
  midnight: "project-card-bg-04",
  none: "project-card-bg-01",
};

export function normalizeProjectHeaderBackground(value?: string | null): ProjectHeaderBackground {
  if (PROJECT_HEADER_BACKGROUND_OPTIONS.some((option) => option.value === value)) {
    return value as ProjectHeaderBackground;
  }

  return value ? LEGACY_BACKGROUND_MAP[value] ?? "project-card-bg-01" : "project-card-bg-01";
}

export function getProjectHeaderBackgroundStyle(value?: string | null): Record<string, string> {
  const normalizedValue = normalizeProjectHeaderBackground(value);
  const background = PROJECT_HEADER_BACKGROUND_OPTIONS.find((option) => option.value === normalizedValue);

  return {
    backgroundImage: `url(${background?.image ?? projectCardBg01})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };
}
