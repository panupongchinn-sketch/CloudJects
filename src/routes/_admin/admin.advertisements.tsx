import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import {
  deleteAdvertisement,
  listAdvertisements,
  type AdminAdvertisementRecord,
  uploadAdvertisement,
} from "@/lib/advertisements.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_admin/admin/advertisements")({
  component: AdminAdvertisementsPage,
});

function AdminAdvertisementsPage() {
  const loadAdvertisements = useServerFn(listAdvertisements);
  const createAdvertisement = useServerFn(uploadAdvertisement);
  const removeAdvertisement = useServerFn(deleteAdvertisement);

  const [items, setItems] = useState<AdminAdvertisementRecord[]>([]);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const result = await loadAdvertisements();
      setItems(result.advertisements);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load advertisements";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onUpload = async () => {
    if (!file) {
      toast.error("Please choose an image");
      return;
    }

    setUploading(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const base64 = dataUrl.split(",")[1];
      if (!base64) throw new Error("Invalid image data");

      const result = await createAdvertisement({
        data: {
          title: title.trim() || undefined,
          fileName: file.name,
          mimeType: file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
          dataBase64: base64,
        },
      });

      setItems((current) => [result.advertisement, ...current]);
      setTitle("");
      setFile(null);
      const input = document.getElementById("advertisement-file") as HTMLInputElement | null;
      if (input) input.value = "";
      toast.success("Advertisement uploaded");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const onDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await removeAdvertisement({ data: { id } });
      setItems((current) => current.filter((item) => item.id !== id));
      toast.success("Advertisement deleted");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed";
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Login Advertisements</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage the full-bleed images shown on the login page.
          </p>
        </div>
        <div className="text-xs text-slate-500">Recommended size: 1600 x 1200 or larger</div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
          <ImagePlus className="h-4 w-4 text-primary" />
          Add Advertisement
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Optional title"
            maxLength={160}
          />
          <Input
            id="advertisement-file"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Button onClick={() => void onUpload()} disabled={!file || uploading} className="gap-2">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload
          </Button>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Supported: JPG, PNG, WEBP, GIF. Maximum file size 5 MB.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Current Advertisements</h2>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading advertisements...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center text-sm text-slate-500">
            No advertisements yet
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => (
              <div key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <div className="aspect-[4/3] bg-slate-100">
                  <img src={item.imageUrl} alt={item.title ?? "Advertisement"} className="h-full w-full object-cover" />
                </div>
                <div className="space-y-3 p-4">
                  <div>
                    <div className="truncate text-sm font-semibold text-slate-900">
                      {item.title?.trim() || "Untitled advertisement"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Added {new Date(item.created_at).toLocaleString("th-TH")}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => void onDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="gap-2"
                    >
                      {deletingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Unable to read file"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}
