'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import type { WhiteboardCursor } from '../types/whiteboard.types';

// Dynamically import Excalidraw to avoid SSR issues in Next.js
const Excalidraw = dynamic(
  async () => {
    const { Excalidraw } = await import('@excalidraw/excalidraw');
    return Excalidraw;
  },
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-violet-200 border-t-violet-600 animate-spin" />
          <p className="text-sm text-gray-500 font-medium">Loading Whiteboard…</p>
        </div>
      </div>
    ),
  },
);

interface WhiteboardProps {
  /** Called whenever the canvas changes — send new elements to peers */
  onElementsChange: (elements: readonly any[]) => void;
  /** Called when cursor moves — send position to peers */
  onCursorMove: (x: number, y: number) => void;
  /** Called when user clears the board — broadcast clear event */
  onClear: () => void;
  /** Called when user exports — receives a PNG data URL */
  onSave: (dataUrl: string) => void;
  /** Subscribe to remote cursor positions */
  onCursorUpdate: (callback: (data: WhiteboardCursor) => void) => () => void;
  /** Latest full elements state from remote peers */
  remoteElements?: readonly any[];
  /** Local user id & display name for collaborator cursor */
  localUserId?: string;
  localDisplayName?: string;
}

export function Whiteboard({
  onElementsChange,
  onCursorMove,
  onClear,
  onSave,
  onCursorUpdate,
  remoteElements,
  localUserId = 'me',
  localDisplayName = 'You',
}: WhiteboardProps) {
  const [excalidrawAPI, setExcalidrawAPI] = useState<any | null>(null);
  const isRemoteUpdateRef = useRef(false);
  const prevRemoteRef = useRef<readonly any[]>([]);

  // ── Apply remote elements ────────────────────────────────────────
  useEffect(() => {
    if (!excalidrawAPI || !remoteElements) return;
    // Skip if same reference (no change)
    if (remoteElements === prevRemoteRef.current) return;
    prevRemoteRef.current = remoteElements;

    if (remoteElements.length === 0) {
      // Clear triggered by remote
      isRemoteUpdateRef.current = true;
      excalidrawAPI.updateScene({ elements: [] });
      isRemoteUpdateRef.current = false;
      return;
    }

    isRemoteUpdateRef.current = true;
    excalidrawAPI.updateScene({ elements: remoteElements as any[] });
    isRemoteUpdateRef.current = false;
  }, [excalidrawAPI, remoteElements]);

  // ── Remote cursor overlay ────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const cursorRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const cursorTimeouts = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const cleanup = onCursorUpdate((data) => {
      const container = containerRef.current;
      if (!container) return;

      let el = cursorRefs.current.get(data.userId);
      if (!el) {
        el = document.createElement('div');
        el.style.cssText =
          'position:absolute;pointer-events:none;transition:left 0.1s linear,top 0.1s linear;z-index:999;';
        el.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="${data.color}" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))">
            <path d="M5.65 12.37H5.46L5.32 12.5 .5 16.88V1.19L15.65 12.37H5.65Z" stroke="white" stroke-width="1"/>
          </svg>
          <span style="position:absolute;top:18px;left:4px;padding:1px 6px;background:${data.color};color:#fff;font-size:10px;font-weight:700;border-radius:20px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.3)">
            ${data.displayName}
          </span>
        `;
        container.appendChild(el);
        cursorRefs.current.set(data.userId, el);
      }

      el.style.left = `${data.x}px`;
      el.style.top = `${data.y}px`;

      // Auto-remove after 3s inactivity
      const existing = cursorTimeouts.current.get(data.userId);
      if (existing) clearTimeout(existing);
      cursorTimeouts.current.set(
        data.userId,
        setTimeout(() => {
          el?.remove();
          cursorRefs.current.delete(data.userId);
          cursorTimeouts.current.delete(data.userId);
        }, 3000),
      );
    });

    return () => {
      cleanup();
      cursorTimeouts.current.forEach((t) => clearTimeout(t));
      cursorRefs.current.forEach((el) => el.remove());
      cursorRefs.current.clear();
      cursorTimeouts.current.clear();
    };
  }, [onCursorUpdate]);

  // ── Handlers ─────────────────────────────────────────────────────

  const handleChange = useCallback(
    (elements: readonly any[]) => {
      if (isRemoteUpdateRef.current) return;
      onElementsChange(elements);
    },
    [onElementsChange],
  );

  const handlePointerUpdate = useCallback(
    (payload: { pointer: { x: number; y: number } }) => {
      onCursorMove(payload.pointer.x, payload.pointer.y);
    },
    [onCursorMove],
  );

  const handleSave = useCallback(() => {
    if (!excalidrawAPI) return;
    // Export to PNG blob → dataURL
    import('@excalidraw/excalidraw').then(({ exportToBlob }) => {
      exportToBlob({
        elements: excalidrawAPI.getSceneElements(),
        appState: { ...excalidrawAPI.getAppState(), exportBackground: true },
        files: excalidrawAPI.getFiles(),
        mimeType: 'image/png',
      }).then((blob: Blob) => {
        const reader = new FileReader();
        reader.onloadend = () => onSave(reader.result as string);
        reader.readAsDataURL(blob);
      });
    });
  }, [excalidrawAPI, onSave]);

  const handleClear = useCallback(() => {
    if (!excalidrawAPI) return;
    excalidrawAPI.updateScene({ elements: [] });
    onClear();
  }, [excalidrawAPI, onClear]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-white">
      {/* Excalidraw Canvas */}
      <Excalidraw
        excalidrawAPI={(api: any) => setExcalidrawAPI(api)}
        onChange={handleChange}
        onPointerUpdate={handlePointerUpdate}
        initialData={{ elements: [], appState: { viewBackgroundColor: '#ffffff' } }}
        UIOptions={{
          canvasActions: {
            saveToActiveFile: false,
            loadScene: false,
            export: false,
            toggleTheme: true,
          },
        }}
      />

      {/* Custom action buttons overlay — Save & Clear */}
      <div className="absolute bottom-4 right-4 flex items-center gap-2 z-50">
        <button
          onClick={handleClear}
          title="Clear whiteboard"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-lg transition-all duration-150"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Clear
        </button>
        <button
          onClick={handleSave}
          title="Save as PNG"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-lg transition-all duration-150"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Save PNG
        </button>
      </div>
    </div>
  );
}
