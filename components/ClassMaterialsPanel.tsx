"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileText, Trash2, Upload } from "lucide-react";
import type { ClassMaterial } from "@/types";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Only rendered for a class where the caller already has
// owner/collaborator/admin authorization (gated by the parent, same
// as ClassAccessPanel, DsaAssignmentsPanel, AptitudeTestsPanel, and
// ProctoredTestsPanel).
export default function ClassMaterialsPanel({ classId }: { classId: string }) {
  const [materials, setMaterials] = useState<ClassMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/classes/${classId}/materials`);
    const data = await res.json();
    setMaterials(data.materials ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classId]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      if (title.trim()) body.append("title", title.trim());
      const res = await fetch(`/api/classes/${classId}/materials`, { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTitle("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(m: ClassMaterial) {
    if (!confirm(`Delete "${m.title}"? This can't be undone.`)) return;
    setDeletingId(m.id);
    await fetch(`/api/classes/${classId}/materials/${m.id}`, { method: "DELETE" });
    await load();
    setDeletingId(null);
  }

  if (loading) return null;

  return (
    <div className="card space-y-5 p-5">
      <div>
        <p className="text-sm font-medium text-fg">Class materials</p>
        <p className="text-xs text-fg-muted">
          PDFs or Word documents visible to every student in this class, to view or download for practice.
        </p>
      </div>

      <form onSubmit={handleUpload} className="flex flex-wrap items-end gap-2">
        <div className="min-w-[160px] flex-1">
          <label className="mb-1 block text-xs text-fg-muted">Title (optional)</label>
          <input
            className="input"
            placeholder="e.g. Week 4 practice sheet"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary flex items-center gap-1.5 py-2.5 text-xs"
          >
            <FileText className="h-3.5 w-3.5" />
            {file ? file.name : "Choose file"}
          </button>
        </div>
        <button type="submit" disabled={!file || uploading} className="btn-primary flex items-center gap-1.5 py-2.5 text-xs">
          <Upload className="h-3.5 w-3.5" />
          {uploading ? "Uploading..." : "Upload"}
        </button>
      </form>
      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="space-y-2">
        {materials.length === 0 && <p className="text-xs text-fg-subtle">No materials uploaded yet.</p>}
        {materials.map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-line/70 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <FileText className="h-4 w-4 shrink-0 text-fg-muted" />
              <div className="min-w-0">
                <p className="truncate text-sm text-fg">{m.title}</p>
                <p className="text-xs text-fg-subtle">
                  {formatBytes(m.file_size)} · Uploaded {new Date(m.created_at).toLocaleDateString()}
                  {m.uploaded_by_name && ` by ${m.uploaded_by_name}`}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-3 text-xs">
              <a
                href={m.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-fg-muted hover:text-fg"
              >
                <Download className="h-3.5 w-3.5" /> View
              </a>
              <button
                type="button"
                onClick={() => handleDelete(m)}
                disabled={deletingId === m.id}
                className="text-fg-subtle hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
