import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server.js";
import { del, put } from "@vercel/blob";

import { getSqlClient, normalizeRows } from "@/lib/db/client";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

function normalizeStudentId(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

type ExistingPhotoRow = {
  photoUrl: string | null;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const resolvedParams = await params;
  const studentId = normalizeStudentId(resolvedParams.studentId);

  if (studentId == null) {
    return NextResponse.json({ error: "Identificador inválido." }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Debes adjuntar una imagen válida." }, { status: 400 });
  }

  const fileType = file.type || "";
  const extension = ALLOWED_TYPES.get(fileType);

  if (!extension) {
    return NextResponse.json(
      { error: "Formato no soportado. Usa una imagen JPG, PNG o WEBP." },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "La imagen debe pesar 2 MB o menos." },
      { status: 400 },
    );
  }

  const sql = getSqlClient();

  const existingRows = normalizeRows<ExistingPhotoRow>(
    await sql`
      SELECT photo_url AS "photoUrl"
      FROM public.students
      WHERE id = ${studentId}::bigint
      LIMIT 1
    `,
  );

  if (!existingRows.length) {
    return NextResponse.json({ error: "Estudiante no encontrado." }, { status: 404 });
  }

  const previousUrl = existingRows[0]?.photoUrl ?? null;
  const timestamp = Date.now();
  const filename = `students/${studentId}/profile-${timestamp}.${extension}`;

  try {
    const uploadResult = await put(filename, file, {
      access: "public",
      contentType: fileType,
    });

    try {
      await sql`
        UPDATE public.students
        SET
          photo_url = ${uploadResult.url},
          photo_updated_at = timezone('UTC', now()),
          updated_at = timezone('UTC', now())
        WHERE id = ${studentId}::bigint
      `;
    } catch (dbError) {
      await del(uploadResult.url).catch((error) => {
        console.error("Error reverting uploaded photo", error);
      });
      throw dbError;
    }

    if (previousUrl && previousUrl !== uploadResult.url) {
      await del(previousUrl).catch((error) => {
        console.error("Error deleting previous student photo", error);
      });
    }

    revalidatePath(`/administracion/gestion-estudiantes/${studentId}`);

    return NextResponse.json({ url: uploadResult.url });
  } catch (error) {
    console.error("Error uploading student photo", error);
    const message =
      error instanceof Error
        ? error.message
        : "No se pudo actualizar la foto del estudiante.";
    return NextResponse.json(
      { error: message || "No se pudo actualizar la foto del estudiante." },
      { status: 500 },
    );
  }
}
