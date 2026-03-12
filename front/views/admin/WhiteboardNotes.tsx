"use client";
import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { whiteboardService, type WhiteboardSession } from '@/services/whiteboard.service';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Eye, ChevronLeft, ChevronRight, Loader2, ImageIcon, Layers } from 'lucide-react';

interface WhiteboardNotesProps {
  /** admin mode shows all sessions across all teachers */
  adminMode?: boolean;
}

export function WhiteboardNotes({ adminMode = false }: WhiteboardNotesProps) {
  const token = useAuthStore((s) => s.token);
  const [sessions, setSessions] = useState<WhiteboardSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // PDF / slide viewer state
  const [viewing, setViewing] = useState<WhiteboardSession | null>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);

  const loadSessions = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = adminMode
        ? await whiteboardService.getAllWhiteboards(token)
        : await whiteboardService.getMyWhiteboards(token);
      setSessions(data);
    } catch {
      setError('Failed to load whiteboard sessions');
    } finally {
      setLoading(false);
    }
  }, [token, adminMode]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleView = async (session: WhiteboardSession) => {
    if (!token) return;
    setViewLoading(true);
    try {
      const full = await whiteboardService.getWhiteboardById(session.id, token);
      setViewing(full);
      setSlideIndex(0);
    } catch {
      setError('Failed to load whiteboard details');
    } finally {
      setViewLoading(false);
    }
  };

  const handleDownloadPdf = (session: WhiteboardSession) => {
    if (!session.pdfBase64) return;
    const byteChars = atob(session.pdfBase64);
    const bytes = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whiteboard-${session.id.slice(0, 8)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16 text-destructive">
        <p>{error}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={loadSessions}>Retry</Button>
      </div>
    );
  }

  // ── Slide Viewer ──────────────────────────────────────────────
  if (viewing) {
    const slides = viewing.slidesData ?? [];
    const current = slides[slideIndex];

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => setViewing(null)}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Slide {slideIndex + 1} of {slides.length}
            </span>
            {viewing.pdfBase64 && (
              <Button size="sm" variant="outline" onClick={() => handleDownloadPdf(viewing)}>
                <Download className="w-4 h-4 mr-1.5" /> Download PDF
              </Button>
            )}
          </div>
        </div>

        {/* Slide display */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {current?.thumbnailDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={current.thumbnailDataUrl}
                alt={`Slide ${slideIndex + 1}`}
                className="w-full aspect-video object-contain bg-white"
              />
            ) : (
              <div className="w-full aspect-video flex items-center justify-center bg-white text-gray-400">
                <ImageIcon className="w-12 h-12" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Thumbnail strip */}
        {slides.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {slides.map((slide, idx) => (
              <button
                key={idx}
                onClick={() => setSlideIndex(idx)}
                className={`shrink-0 w-24 h-14 rounded border overflow-hidden transition-all ${
                  idx === slideIndex ? 'border-primary ring-2 ring-primary/40' : 'border-border hover:border-primary/50'
                }`}
              >
                {slide.thumbnailDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={slide.thumbnailDataUrl} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground text-xs">{idx + 1}</div>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Prev / Next */}
        {slides.length > 1 && (
          <div className="flex justify-center gap-4">
            <Button
              size="sm"
              variant="outline"
              disabled={slideIndex === 0}
              onClick={() => setSlideIndex((i) => i - 1)}
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={slideIndex === slides.length - 1}
              onClick={() => setSlideIndex((i) => i + 1)}
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ── List view ─────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Whiteboard Notes</h2>
          <p className="text-sm text-muted-foreground">
            {adminMode ? 'All saved whiteboard sessions' : 'Your saved whiteboard sessions'}
          </p>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Layers className="w-3 h-3" />
          {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
        </Badge>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <FileText className="w-12 h-12 opacity-30" />
            <p className="text-sm">No whiteboard sessions saved yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((session) => (
            <Card key={session.id} className="flex flex-col hover:border-primary/50 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-medium line-clamp-2">
                    {session.title || `Session from ${new Date(session.createdAt).toLocaleDateString()}`}
                  </CardTitle>
                  <Badge variant="outline" className="shrink-0 text-xs gap-1">
                    <Layers className="w-3 h-3" />
                    {session.slideCount} {session.slideCount === 1 ? 'slide' : 'slides'}
                  </Badge>
                </div>
                {adminMode && session.host && (
                  <CardDescription className="text-xs">
                    By {session.host.displayName}
                  </CardDescription>
                )}
                <CardDescription className="text-xs">
                  {new Date(session.createdAt).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2 pt-0 mt-auto">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1.5"
                  disabled={viewLoading}
                  onClick={() => handleView(session)}
                >
                  {viewLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                  View
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1.5"
                  onClick={() =>
                    whiteboardService
                      .getWhiteboardById(session.id, token!)
                      .then(handleDownloadPdf)
                  }
                >
                  <Download className="w-3.5 h-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
