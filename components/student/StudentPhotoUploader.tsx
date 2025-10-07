"use client";

import { useRef, useState, type ChangeEventHandler } from "react";
import { useRouter } from "next/navigation";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.has(file.type)) {
    return "Formato no soportado. Usa una imagen JPG, PNG o WEBP.";
  }

  if (file.size > MAX_FILE_SIZE) {
    return "La imagen debe pesar 2 MB o menos.";
  }

  return null;
}

export type StudentPhotoUploaderProps = {
  studentId: number;
};

export function StudentPhotoUploader({ studentId }: StudentPhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelect: ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setError(null);
      return;
    }

    const validationError = validateFile(file);

    if (validationError) {
      setError(validationError);
      event.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setIsUploading(true);
    setError(null);

    try {
      const response = await fetch(`/api/students/${studentId}/photo`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message =
          payload && typeof payload === "object" && "error" in payload
            ? String((payload as { error?: unknown }).error ?? "")
            : "No se pudo subir la foto.";
        throw new Error(message || "No se pudo subir la foto.");
      }

      await response.json().catch(() => null);
      router.refresh();
    } catch (uploadError) {
      console.error("Error uploading student photo", uploadError);
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : "No se pudo subir la foto.";
      setError(message);
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleSelect}
      />
      <button
        type="button"
        onClick={() => {
          setError(null);
          inputRef.current?.click();
        }}
        disabled={isUploading}
        className="inline-flex items-center justify-center rounded-full border border-brand-ink-muted/20 bg-white px-4 py-2 text-sm font-semibold text-brand-teal shadow transition hover:-translate-y-[1px] hover:border-brand-teal hover:bg-brand-teal-soft/60 focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#00bfa6] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isUploading ? "Subiendo..." : "Cambiar foto"}
      </button>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}
