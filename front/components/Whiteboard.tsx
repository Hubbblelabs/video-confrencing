'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import type { WhiteboardCursor } from '../types/whiteboard.types';

export interface WhiteboardSlide {
  elements: readonly any[];
  thumbnailDataUrl: string | null;
}

// Dynamically import Excalidraw and wrap it with a custom top menu to hide promotional links
const ExcalidrawWrapper = dynamic(
  async () => {
    const { Excalidraw, MainMenu } = await import('@excalidraw/excalidraw');
    return function CustomExcalidraw(props: any) {
      return (
        <Excalidraw {...props}>
          <MainMenu>
            <MainMenu.DefaultItems.ClearCanvas />
            <MainMenu.Separator />
            <MainMenu.DefaultItems.ToggleTheme />
            <MainMenu.DefaultItems.ChangeCanvasBackground />
          </MainMenu>
        </Excalidraw>
      );
    };
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
  /** Called when teacher saves all slides as PDF to server */
  onSaveToServer?: (slides: WhiteboardSlide[], pdfBase64: string) => Promise<void>;
  /** Subscribe to remote cursor positions */
  onCursorUpdate: (callback: (data: WhiteboardCursor) => void) => () => void;
  /** Latest full elements state from remote peers */
  remoteElements?: readonly any[];
  /** Local user id & display name for collaborator cursor */
  localUserId?: string;
  localDisplayName?: string;
  /** Whether the save-to-server button is visible (teacher/admin only) */
  canSave?: boolean;
  /** When true, the whiteboard is view-only — no drawing or broadcasting */
  readOnly?: boolean;
}

export function Whiteboard({
  onElementsChange,
  onCursorMove,
  onClear,
  onSaveToServer,
  onCursorUpdate,
  remoteElements,
  localUserId = 'me',
  localDisplayName = 'You',
  canSave = false,
  readOnly = false,
}: WhiteboardProps) {
  const [excalidrawAPI, setExcalidrawAPI] = useState<any | null>(null);
  // Counter incremented before each programmatic updateScene; decremented in handleChange to skip re-broadcast
  const pendingRemoteRef = useRef(0);
  // True until Excalidraw fires its initial onChange on mount — that event must not be broadcast
  const isFirstOnChangeRef = useRef(true);
  const prevRemoteRef = useRef<readonly any[]>([]);

  // ── Multi-slide state ─────────────────────────────────────────
  const [currentSlide, setCurrentSlide] = useState(0);
  const slidesRef = useRef<WhiteboardSlide[]>([{ elements: [], thumbnailDataUrl: null }]);
  const [slideCount, setSlideCount] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // ── Apply remote elements ──────────────────────────────────────
  useEffect(() => {
    if (!excalidrawAPI || !remoteElements) return;
    if (remoteElements === prevRemoteRef.current) return;
    prevRemoteRef.current = remoteElements;

    // Increment before updateScene so the resulting async onChange is suppressed
    pendingRemoteRef.current++;
    if (remoteElements.length === 0) {
      excalidrawAPI.updateScene({ elements: [] });
    } else {
      excalidrawAPI.updateScene({ elements: remoteElements as any[] });
    }
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

  // ── Capture thumbnail for current slide ───────────────────────
  const captureThumbnail = useCallback(async (): Promise<string | null> => {
    if (!excalidrawAPI) return null;
    try {
      const { exportToBlob } = await import('@excalidraw/excalidraw');
      const blob = await exportToBlob({
        elements: excalidrawAPI.getSceneElements(),
        appState: { ...excalidrawAPI.getAppState(), exportBackground: true },
        files: excalidrawAPI.getFiles(),
        mimeType: 'image/png',
      });
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }, [excalidrawAPI]);

  // ── Persist current slide to buffer ──────────────────────────
  const persistCurrentSlide = useCallback(
    async (slideIndex: number) => {
      if (!excalidrawAPI) return;
      const elements = excalidrawAPI.getSceneElements();
      const thumbnail = await captureThumbnail();
      slidesRef.current[slideIndex] = { elements, thumbnailDataUrl: thumbnail };
    },
    [excalidrawAPI, captureThumbnail],
  );

  // ── Switch slide ──────────────────────────────────────────────
  const switchToSlide = useCallback(
    async (targetIndex: number) => {
      if (!excalidrawAPI) return;
      await persistCurrentSlide(currentSlide);
      const target = slidesRef.current[targetIndex];
      pendingRemoteRef.current++;
      excalidrawAPI.updateScene({ elements: target.elements as any[] });
      setCurrentSlide(targetIndex);
      onElementsChange(target.elements);
    },
    [excalidrawAPI, currentSlide, persistCurrentSlide, onElementsChange],
  );

  // ── Add slide ─────────────────────────────────────────────────
  const handleAddSlide = useCallback(async () => {
    await persistCurrentSlide(currentSlide);
    const newIndex = slidesRef.current.length;
    slidesRef.current.push({ elements: [], thumbnailDataUrl: null });
    setSlideCount(slidesRef.current.length);
    pendingRemoteRef.current++;
    excalidrawAPI?.updateScene({ elements: [] });
    setCurrentSlide(newIndex);
    onElementsChange([]);
  }, [currentSlide, persistCurrentSlide, excalidrawAPI, onElementsChange]);

  // ── Delete current slide ──────────────────────────────────────
  const handleDeleteSlide = useCallback(async () => {
    if (slidesRef.current.length <= 1) return;
    slidesRef.current.splice(currentSlide, 1);
    setSlideCount(slidesRef.current.length);
    const newIndex = Math.min(currentSlide, slidesRef.current.length - 1);
    const target = slidesRef.current[newIndex];
    pendingRemoteRef.current++;
    excalidrawAPI?.updateScene({ elements: target.elements as any[] });
    setCurrentSlide(newIndex);
    onElementsChange(target.elements);
  }, [currentSlide, excalidrawAPI, onElementsChange]);

  // ── Generate PDF from all slides ──────────────────────────────
  const generatePdf = useCallback(async (slides: WhiteboardSlide[]): Promise<string> => {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'px', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < slides.length; i++) {
      if (i > 0) pdf.addPage();
      const slide = slides[i];
      if (slide.thumbnailDataUrl) {
        pdf.addImage(slide.thumbnailDataUrl, 'PNG', 0, 0, pageW, pageH, undefined, 'FAST');
      } else {
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageW, pageH, 'F');
      }
      pdf.setFontSize(10);
      pdf.setTextColor(150);
      pdf.text(`Slide ${i + 1} / ${slides.length}`, pageW / 2, pageH - 8, { align: 'center' });
    }
    return pdf.output('datauristring').split(',')[1];
  }, []);

  // ── Save all slides to server ─────────────────────────────────
  const handleSaveToServer = useCallback(async () => {
    if (!onSaveToServer || isSaving) return;
    setIsSaving(true);
    setSaveStatus('saving');
    try {
      await persistCurrentSlide(currentSlide);
      const slides = [...slidesRef.current];
      const pdfBase64 = await generatePdf(slides);
      await onSaveToServer(slides, pdfBase64);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error('Failed to save whiteboard:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  }, [onSaveToServer, isSaving, currentSlide, persistCurrentSlide, generatePdf]);

  // ── Handlers ─────────────────────────────────────────────────────

  const handleChange = useCallback(
    (elements: readonly any[]) => {
      // Skip Excalidraw's initial onChange fired on mount — it must not overwrite remote state
      if (isFirstOnChangeRef.current) {
        isFirstOnChangeRef.current = false;
        return;
      }
      // Skip onChange that results from a programmatic updateScene call
      if (pendingRemoteRef.current > 0) {
        pendingRemoteRef.current--;
        return;
      }
      if (readOnly) return;
      onElementsChange(elements);
    },
    [onElementsChange, readOnly],
  );

  const handlePointerUpdate = useCallback(
    (payload: { pointer: { x: number; y: number } }) => {
      onCursorMove(payload.pointer.x, payload.pointer.y);
    },
    [onCursorMove],
  );

  const handleClear = useCallback(() => {
    if (!excalidrawAPI) return;
    excalidrawAPI.updateScene({ elements: [] });
    slidesRef.current[currentSlide] = { elements: [], thumbnailDataUrl: null };
    onClear();
  }, [excalidrawAPI, currentSlide, onClear]);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-white flex flex-col">

      {/* ── Slide strip (top) ─────────────────────────────────── */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-50 border-b border-gray-200 overflow-x-auto shrink-0">
        {Array.from({ length: slideCount }).map((_, idx) => (
          <button
            key={idx}
            onClick={() => switchToSlide(idx)}
            className={`relative shrink-0 w-16 h-10 rounded border overflow-hidden transition-all ${
              idx === currentSlide
                ? 'border-violet-500 ring-2 ring-violet-300'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            title={`Slide ${idx + 1}`}
          >
            {slidesRef.current[idx]?.thumbnailDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={slidesRef.current[idx].thumbnailDataUrl!}
                alt={`Slide ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-white flex items-center justify-center text-gray-300 text-xs">
                {idx + 1}
              </div>
            )}
            <span className="absolute bottom-0 right-0 bg-black/40 text-white text-[8px] px-0.5 leading-3 rounded-tl">
              {idx + 1}
            </span>
          </button>
        ))}

        {/* Add slide button – editors only */}
        {!readOnly && (
          <button
            onClick={handleAddSlide}
            className="shrink-0 w-10 h-10 rounded border border-dashed border-gray-300 hover:border-violet-400 text-gray-400 hover:text-violet-500 flex items-center justify-center transition-colors"
            title="Add slide"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        )}

        <span className="ml-auto shrink-0 text-xs text-gray-400 pr-1 whitespace-nowrap">
          {currentSlide + 1} / {slideCount}
        </span>
      </div>

      {/* ── Excalidraw Canvas ──────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">
        <ExcalidrawWrapper
          excalidrawAPI={(api: any) => setExcalidrawAPI(api)}
          onChange={handleChange}
          onPointerUpdate={readOnly ? undefined : handlePointerUpdate}
          viewModeEnabled={readOnly}
          initialData={{ elements: [], appState: { viewBackgroundColor: '#ffffff', openSidebar: null } }}
          UIOptions={{
            welcomeScreen: false,
            canvasActions: {
              saveToActiveFile: false,
              loadScene: false,
              export: false,
              toggleTheme: true,
            },
          }}
        />

        {/* ── Action buttons overlay ──────────────────────────── */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2 z-50">
          {/* Delete current slide – editors only */}
          {!readOnly && slideCount > 1 && (
            <button
              onClick={handleDeleteSlide}
              title="Delete current slide"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-lg transition-all duration-150"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Slide
            </button>
          )}

          {/* Clear current slide – editors only */}
          {!readOnly && <button
            onClick={handleClear}
            title="Clear current slide"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-lg transition-all duration-150"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear
          </button>}

          {/* Save to server (teacher/admin only) */}
          {canSave && onSaveToServer && (
            <button
              onClick={handleSaveToServer}
              disabled={isSaving}
              title="Save whiteboard as PDF"
              className={`flex items-center gap-1.5 px-3 py-1.5 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-lg transition-all duration-150 ${
                saveStatus === 'saved'
                  ? 'bg-green-600'
                  : saveStatus === 'error'
                  ? 'bg-red-600'
                  : 'bg-violet-600 hover:bg-violet-700'
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {isSaving ? (
                <>
                  <div className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Saving…
                </>
              ) : saveStatus === 'saved' ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Saved!
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Save PDF
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
