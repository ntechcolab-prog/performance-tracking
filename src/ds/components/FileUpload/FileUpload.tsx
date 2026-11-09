import { forwardRef, useId, useRef, useState, type DragEvent } from 'react'
import { UploadCloud, File as FileIcon, X, AlertCircle } from 'lucide-react'
import { cn } from '../../helpers/cn'
import { tcl } from '../../helpers/tcl'
import { IconButton } from '../IconButton/IconButton'

export interface FileUploadProps {
  /** Called with the full current selection whenever it changes. */
  onFiles: (files: File[]) => void
  /** `accept` attribute, e.g. `'image/*'` or `'.pdf,.docx'`. */
  accept?: string
  multiple?: boolean
  /** Reject files larger than this many megabytes. */
  maxSizeMB?: number
  disabled?: boolean
  /** Primary call-to-action text inside the dropzone. */
  label?: string
  /** Secondary hint (e.g. allowed types / size) shown under the label. */
  hint?: string
  /** Controlled selection. Omit for uncontrolled internal state. */
  files?: File[]
  className?: string
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Dashed-border dropzone with drag-and-drop, click-to-browse, size/type
 * validation and a selected-files list. The zone is a real `<button>`, so it is
 * fully keyboard operable (Enter/Space opens the file dialog); rejected files
 * are announced via `role="alert"`.
 */
export const FileUpload = forwardRef<HTMLDivElement, FileUploadProps>(
  (
    {
      onFiles,
      accept,
      multiple = false,
      maxSizeMB,
      disabled = false,
      label = 'Drag & drop or click to browse',
      hint,
      files,
      className,
    },
    ref,
  ) => {
    const inputRef = useRef<HTMLInputElement>(null)
    const hintId = useId()
    const [dragging, setDragging] = useState(false)
    const [errors, setErrors] = useState<string[]>([])
    const [internal, setInternal] = useState<File[]>([])

    const isControlled = files !== undefined
    const selected = isControlled ? files : internal

    function commit(next: File[]) {
      if (!isControlled) setInternal(next)
      onFiles(next)
    }

    function matchesAccept(file: File): boolean {
      if (!accept) return true
      const name = file.name.toLowerCase()
      const type = file.type.toLowerCase()
      return accept
        .split(',')
        .map((a) => a.trim().toLowerCase())
        .filter(Boolean)
        .some((a) => {
          if (a.startsWith('.')) return name.endsWith(a)
          if (a.endsWith('/*')) return type.startsWith(a.slice(0, -1))
          return type === a
        })
    }

    function process(list: FileList | File[]) {
      const incoming = Array.from(list)
      const accepted: File[] = []
      const rejected: string[] = []

      for (const f of incoming) {
        if (!matchesAccept(f)) {
          rejected.push(`${f.name} — file type not allowed`)
          continue
        }
        if (maxSizeMB != null && f.size > maxSizeMB * 1024 * 1024) {
          rejected.push(`${f.name} — exceeds ${maxSizeMB} MB`)
          continue
        }
        accepted.push(f)
      }

      setErrors(rejected)
      if (accepted.length > 0) {
        commit(multiple ? [...selected, ...accepted] : accepted.slice(0, 1))
      }
    }

    function removeAt(index: number) {
      commit(selected.filter((_, i) => i !== index))
    }

    function onDragOver(e: DragEvent) {
      if (disabled) return
      e.preventDefault()
      setDragging(true)
    }
    function onDragLeave(e: DragEvent) {
      e.preventDefault()
      setDragging(false)
    }
    function onDrop(e: DragEvent) {
      if (disabled) return
      e.preventDefault()
      setDragging(false)
      if (e.dataTransfer.files?.length) process(e.dataTransfer.files)
    }

    return (
      <div
        ref={ref}
        className={cn('flex w-full flex-col gap-3', className)}
        {...tcl('FileUpload', { accept, multiple, maxSizeMB, disabled })}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          onDragEnter={onDragOver}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          aria-describedby={hint ? hintId : undefined}
          className={cn(
            'flex w-full flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed px-6 py-8 text-center transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2',
            'disabled:pointer-events-none disabled:opacity-50',
            dragging
              ? 'border-accent bg-accent-subtle'
              : 'border-border-strong bg-surface-sunken hover:border-accent',
          )}
        >
          <UploadCloud className="size-7 text-text-muted" aria-hidden />
          <span className="text-sm font-medium text-text">{label}</span>
          {hint && (
            <span id={hintId} className="text-xs text-text-muted">
              {hint}
            </span>
          )}
        </button>

        {/* Visually hidden native input. */}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) process(e.target.files)
            e.target.value = ''
          }}
        />

        {errors.length > 0 && (
          // `role="alert"` lives on the wrapper: putting it on the <ul> would
          // override the list role and orphan the <li> children.
          <div role="alert">
            <ul className="space-y-1">
              {errors.map((err, i) => (
                <li key={i} className="flex items-center gap-1.5 text-xs text-danger">
                  <AlertCircle className="size-3.5 shrink-0" aria-hidden />
                  <span>{err}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {selected.length > 0 && (
          <ul className="space-y-2">
            {selected.map((file, i) => (
              <li
                key={`${file.name}-${file.size}-${i}`}
                className="flex items-center gap-2 rounded-card border border-border bg-surface-raised px-3 py-2"
              >
                <FileIcon className="size-4 shrink-0 text-text-muted" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-sm text-text">{file.name}</span>
                <span className="shrink-0 text-xs text-text-muted">{formatSize(file.size)}</span>
                <IconButton
                  size="sm"
                  variant="ghost"
                  disabled={disabled}
                  aria-label={`Remove ${file.name}`}
                  icon={<X className="size-4" />}
                  onClick={() => removeAt(i)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  },
)
FileUpload.displayName = 'FileUpload'
