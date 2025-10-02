export type LevelAccent = {
  primary: string;
  background: string;
  chipBackground: string;
};

const fallbackAccent: LevelAccent = {
  primary: "#ff7a23",
  background: "rgba(255, 122, 35, 0.14)",
  chipBackground: "rgba(255, 122, 35, 0.12)",
};

export function getLevelAccent(level: string | null | undefined): LevelAccent {
  if (!level) {
    return fallbackAccent;
  }

  const normalized = level.trim().toUpperCase();
  switch (normalized) {
    case "A1":
      return {
        primary: "#2f9d6a",
        background: "rgba(47, 157, 106, 0.16)",
        chipBackground: "rgba(47, 157, 106, 0.12)",
      };
    case "A2":
      return {
        primary: "#2e88c9",
        background: "rgba(46, 136, 201, 0.16)",
        chipBackground: "rgba(46, 136, 201, 0.12)",
      };
    case "B1":
      return {
        primary: "#ff7a23",
        background: "rgba(255, 122, 35, 0.16)",
        chipBackground: "rgba(255, 122, 35, 0.14)",
      };
    case "B2":
      return {
        primary: "#f97316",
        background: "rgba(249, 115, 22, 0.18)",
        chipBackground: "rgba(249, 115, 22, 0.14)",
      };
    case "C1":
      return {
        primary: "#ab47bc",
        background: "rgba(171, 71, 188, 0.18)",
        chipBackground: "rgba(171, 71, 188, 0.14)",
      };
    case "C2":
      return {
        primary: "#6d4c41",
        background: "rgba(109, 76, 65, 0.18)",
        chipBackground: "rgba(109, 76, 65, 0.14)",
      };
    default:
      return fallbackAccent;
  }
}
