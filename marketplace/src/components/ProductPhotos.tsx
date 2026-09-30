"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { deletePhoto, makeMainPhoto } from "@/lib/actions";
import { photoUrl } from "@/lib/photos";

const MAX_PHOTOS = 6;
const MAX_EDGE = 2400;

// Shrink big phone photos in the browser before uploading, so they fit the host's
// ~4.5 MB request limit. The server still validates and re-encodes everything.
async function prepare(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 3_500_000) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    return blob ?? file;
  } catch {
    return file; // the browser can't read it; let the server explain
  }
}

export function ProductPhotos({ productId, productName, photos }: { productId: string; productName: string; photos: { id: string }[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    const room = MAX_PHOTOS - photos.length;
    const list = Array.from(files).slice(0, room);
    if (files.length > room) setError(`Only ${room} more photo${room === 1 ? "" : "s"} fit (${MAX_PHOTOS} max).`);
    for (const [i, file] of list.entries()) {
      setBusy(`Uploading ${i + 1} of ${list.length}…`);
      const body = new FormData();
      body.append("photo", await prepare(file), file.name);
      const res = await fetch(`/api/products/${productId}/photos`, { method: "POST", body });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(`${file.name}: ${data.error ?? "Upload failed."}`);
        break;
      }
    }
    setBusy("");
    if (input.current) input.current.value = "";
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {photos.map((p, i) => (
          <div key={p.id} className="group relative h-20 w-20 overflow-hidden rounded-lg border border-stone-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl(p.id)} alt={`${productName} photo ${i + 1}`} className="h-full w-full object-cover" />
            {i === 0 && <span className="absolute left-1 top-1 rounded bg-white/90 px-1 text-[10px] font-medium">Main</span>}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 px-1 py-0.5 text-[10px] text-white opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
              {i > 0 ? (
                <form action={makeMainPhoto}>
                  <input type="hidden" name="id" value={p.id} />
                  <button aria-label={`Make photo ${i + 1} the main photo`}>Main</button>
                </form>
              ) : (
                <span />
              )}
              <form action={deletePhoto} onSubmit={(e) => !confirm("Delete this photo?") && e.preventDefault()}>
                <input type="hidden" name="id" value={p.id} />
                <button aria-label={`Delete photo ${i + 1}`}>Delete</button>
              </form>
            </div>
          </div>
        ))}
        {photos.length < MAX_PHOTOS && (
          <button
            type="button"
            disabled={!!busy}
            onClick={() => input.current?.click()}
            className="flex h-20 w-20 flex-col items-center justify-center rounded-lg border-2 border-dashed border-stone-300 text-xs text-stone-500 hover:border-brand hover:text-brand disabled:opacity-50"
          >
            <span className="text-xl">＋</span>
            Add photo
          </button>
        )}
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          multiple
          hidden
          aria-label={`Upload photos for ${productName}`}
          onChange={(e) => upload(e.target.files)}
        />
      </div>
      {busy && <p className="text-xs text-stone-500">{busy}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
