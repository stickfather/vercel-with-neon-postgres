import Image from "next/image";

function extractInitials(name: string): string {
  const normalized = name.trim();
  if (!normalized.length) {
    return "?";
  }

  const words = normalized
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (!words.length) {
    return "?";
  }

  if (words.length === 1) {
    const [first] = words;
    return first.slice(0, 2).toUpperCase();
  }

  const [first, second] = words;
  return `${first[0] ?? ""}${second[0] ?? ""}`.toUpperCase();
}

function formatUpdatedAt(updatedAt?: string | null): number | null {
  if (!updatedAt) {
    return null;
  }

  const timestamp = Date.parse(updatedAt);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export type StudentAvatarProps = {
  name: string;
  photoUrl?: string | null;
  updatedAt?: string | null;
  size?: number;
  className?: string;
};

export function StudentAvatar({
  name,
  photoUrl,
  updatedAt,
  size = 96,
  className = "",
}: StudentAvatarProps) {
  const initials = extractInitials(name);
  const version = formatUpdatedAt(updatedAt);
  const versionSuffix =
    version != null
      ? `${photoUrl && photoUrl.includes("?") ? "&" : "?"}v=${version}`
      : "";
  const finalSrc = photoUrl ? `${photoUrl}${versionSuffix}` : null;

  return (
    <div
      className={`relative flex items-center justify-center overflow-hidden rounded-full bg-brand-deep-soft text-brand-deep ${className}`.trim()}
      style={{ width: size, height: size }}
    >
      {finalSrc ? (
        <Image
          src={finalSrc}
          alt={name ? `Foto de ${name}` : "Foto del estudiante"}
          width={size}
          height={size}
          className="h-full w-full rounded-full object-cover"
        />
      ) : (
        <span className="text-2xl font-semibold uppercase tracking-wide">
          {initials}
        </span>
      )}
    </div>
  );
}
