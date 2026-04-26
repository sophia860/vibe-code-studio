import { FileUp, Paperclip, X } from "lucide-react";
import type { ChangeEvent, RefObject } from "react";

import type { UploadContext } from "../types/agent";

const MAX_UPLOADS = 4;

type FileUploadProps = {
  uploads: UploadContext[];
  fileInputRef: RefObject<HTMLInputElement | null>;
  onUploadClick: () => void;
  onUploadChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onRemoveUpload: (id: string) => void;
};

export function FileUpload({
  uploads,
  fileInputRef,
  onUploadClick,
  onUploadChange,
  onRemoveUpload,
}: FileUploadProps) {
  return (
    <>
      <div className="mb-4 grid gap-3 rounded-3xl border border-white/10 bg-black/25 p-3 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <p className="text-sm font-medium text-white">
            Attach product notes, wireframes, or brand references
          </p>
          <p className="mt-1 text-xs text-white/50">
            Uploaded context is injected into the generation prompt. Up to {MAX_UPLOADS} files per
            run.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".md,.txt,.json,.csv,.ts,.tsx,.js,.jsx,.css,.html,.svg,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={onUploadChange}
          />
          <button
            type="button"
            onClick={onUploadClick}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/8 px-4 py-2 text-sm font-medium text-white transition hover:border-cyan-300/45 hover:text-cyan-100"
          >
            <Paperclip className="h-4 w-4" />
            Upload context
          </button>
        </div>
      </div>

      {uploads.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {uploads.map((upload) => (
            <div
              key={upload.id}
              className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-white/10 bg-white/8 px-3 py-2 text-sm text-white/80"
            >
              <FileUp className="h-4 w-4 shrink-0 text-cyan-200" />
              <span className="truncate">{upload.name}</span>
              <span className="text-white/35">{upload.sizeLabel}</span>
              <button
                type="button"
                onClick={() => onRemoveUpload(upload.id)}
                className="rounded-full p-1 text-white/45 transition hover:bg-white/10 hover:text-white"
                aria-label={`Remove ${upload.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
