import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, FabricObject, Circle, Rect, Line, IText, PencilBrush } from 'fabric';
import type { DrawingTool, WhiteboardCursor } from '../types/whiteboard.types';

interface WhiteboardProps {
  roomId: string;
  userId: string;
  displayName: string;
  onObjectAdded: (object: any) => void;
  onObjectModified: (object: any) => void;
  onObjectRemoved: (object: any) => void;
  onCursorMove: (x: number, y: number) => void;
  onClear: () => void;
  onSave: (dataUrl: string) => void;
  remoteCursors: WhiteboardCursor[];
  remoteObjects?: any[];
}

const COLORS = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e'
];
const BRUSH_SIZES = [2, 4, 8, 12, 16, 24];

export function Whiteboard({
  userId,
  onObjectAdded,
  onObjectModified,
  onObjectRemoved,
  onCursorMove,
  onClear,
  onSave,
  remoteCursors,
}: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const [tool, setTool] = useState<DrawingTool>('pen');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(4);
  const [fillEnabled, setFillEnabled] = useState(false);
  const historyRef = useRef<any[]>([]);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();

    const canvas = new Canvas(canvasRef.current, {
      width: rect.width,
      height: rect.height,
      backgroundColor: '#ffffff',
      isDrawingMode: tool === 'pen' || tool === 'eraser',
      selection: true,
    });

    // Configure brush explicitly
    canvas.freeDrawingBrush = new PencilBrush(canvas);
    canvas.freeDrawingBrush.color = tool === 'eraser' ? '#ffffff' : color;
    canvas.freeDrawingBrush.width = brushSize;

    fabricCanvasRef.current = canvas;

    const handleResize = () => {
      if (!containerRef.current) return;
      const newRect = containerRef.current.getBoundingClientRect();
      canvas.setDimensions({ width: newRect.width, height: newRect.height });
      canvas.renderAll();
    };

    window.addEventListener('resize', handleResize);

    // Events
    canvas.on('object:added', (e: any) => {
      if (e.target && !(e.target as any).remote) onObjectAdded(e.target.toObject());
    });

    canvas.on('object:modified', (e: any) => {
      if (e.target) onObjectModified(e.target.toObject());
    });

    canvas.on('object:removed', (e: any) => {
      if (e.target && !(e.target as any).remote) onObjectRemoved({ id: (e.target as any).id });
    });

    canvas.on('mouse:move', (e: any) => {
      if (e.scenePoint) onCursorMove(e.scenePoint.x, e.scenePoint.y);
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.dispose();
    };
  }, []); // Run once on mount

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); handleUndo(); }
      if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') || ((e.ctrlKey || e.metaKey) && e.key === 'y')) { e.preventDefault(); handleRedo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') { e.preventDefault(); handleCopy(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') { e.preventDefault(); handlePaste(); }
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); handleDelete(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update modes
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.isDrawingMode = tool === 'pen' || tool === 'eraser';
    canvas.selection = tool === 'select';

    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = tool === 'eraser' ? '#ffffff' : color;
      canvas.freeDrawingBrush.width = tool === 'eraser' ? brushSize * 2 : brushSize;
    }
    // Set cursor
    canvas.defaultCursor = tool === 'select' ? 'default' : 'crosshair';
  }, [tool, color, brushSize]);

  const addShape = useCallback((shapeType: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    let shape: FabricObject | null = null;
    const fillColor = fillEnabled ? color : 'transparent';
    const center = canvas.getCenterPoint();

    const commonProps = {
      stroke: color,
      strokeWidth: brushSize,
      fill: fillColor,
      left: center.x - 50,
      top: center.y - 50,
    };

    switch (shapeType) {
      case 'circle': shape = new Circle({ ...commonProps, radius: 50 }); break;
      case 'rect': shape = new Rect({ ...commonProps, width: 100, height: 100 }); break;
      case 'line': shape = new Line([center.x - 50, center.y, center.x + 50, center.y], { stroke: color, strokeWidth: brushSize, fill: 'transparent' }); break;
      case 'text': shape = new IText('Type...', { ...commonProps, fontSize: 24, fontFamily: 'sans-serif', fill: color, strokeWidth: 0 }); break;
    }

    if (shape) {
      canvas.add(shape);
      canvas.setActiveObject(shape);
      canvas.renderAll();
    }
  }, [color, brushSize, fillEnabled]);

  const handleToolChange = (newTool: DrawingTool) => {
    setTool(newTool);
    if (['circle', 'rect', 'line', 'text'].includes(newTool)) {
      addShape(newTool);
      setTool('select'); // Switch back to select after adding shape
    }
  };

  // Actions
  const handleClear = () => {
    if (!fabricCanvasRef.current) return;
    fabricCanvasRef.current.clear();
    fabricCanvasRef.current.backgroundColor = '#ffffff';
    fabricCanvasRef.current.renderAll();
    onClear();
  };
  const handleUndo = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const last = canvas.getObjects().pop();
    if (last) { historyRef.current.push(last); canvas.remove(last); canvas.renderAll(); }
  };
  const handleRedo = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const last = historyRef.current.pop();
    if (last) { canvas.add(last); canvas.renderAll(); }
  };
  const handleDelete = () => {
    const canvas = fabricCanvasRef.current;
    if (canvas) { canvas.getActiveObjects().forEach(o => canvas.remove(o)); canvas.discardActiveObject(); canvas.renderAll(); }
  };
  const handleCopy = async () => {
    const canvas = fabricCanvasRef.current;
    if (canvas) { const active = canvas.getActiveObject(); if (active) { try { (window as any)._clipboard = await active.clone(); } catch (e) { } } }
  };
  const handlePaste = async () => {
    const canvas = fabricCanvasRef.current;
    if (canvas && (window as any)._clipboard) {
      try {
        const cloned = await (window as any)._clipboard.clone();
        canvas.discardActiveObject();
        cloned.set({ left: cloned.left + 20, top: cloned.top + 20, evented: true });
        canvas.add(cloned);
        canvas.setActiveObject(cloned);
        canvas.renderAll();
      } catch (e) { }
    }
  };
  const handleSave = () => {
    if (fabricCanvasRef.current) { onSave(fabricCanvasRef.current.toDataURL({ format: 'png', multiplier: 2 })); }
  };

  return (
    <div className="h-full w-full flex flex-col relative bg-[#f8fafc]">
      <div ref={containerRef} className="absolute inset-0 z-0">
        <canvas ref={canvasRef} />

        {/* Remote Cursors */}
        {remoteCursors.map((cursor) => (
          cursor.userId !== userId && (
            <div
              key={cursor.userId}
              className="absolute pointer-events-none transition-all duration-100 ease-linear z-10"
              style={{ left: cursor.x, top: cursor.y, transform: 'translate(-50%, -50%)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill={cursor.color} className="drop-shadow-sm">
                <path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19138L15.6499 12.3673H5.65376Z" stroke="white" strokeWidth="1" />
              </svg>
              <div className="absolute top-4 left-4 px-2 py-0.5 rounded-full text-[10px] font-bold text-white whitespace-nowrap shadow-sm" style={{ backgroundColor: cursor.color }}>
                {cursor.displayName}
              </div>
            </div>
          )
        ))}
      </div>

      {/* Floating Toolbar */}
      <div className="absolute top-4 left-4 bottom-4 w-16 bg-background/80 backdrop-blur-xl rounded-2xl flex flex-col items-center py-4 gap-4 z-20 shadow-2xl border border-border/50">
        {/* Tools */}
        <div className="flex flex-col gap-2">
          <ToolButton active={tool === 'select'} onClick={() => handleToolChange('select')} icon={<SelectIcon />} title="Select (V)" />
          <ToolButton active={tool === 'pen'} onClick={() => handleToolChange('pen')} icon={<PenIcon />} title="Pen (P)" />
          <ToolButton active={tool === 'eraser'} onClick={() => handleToolChange('eraser')} icon={<EraserIcon />} title="Eraser (E)" />
        </div>

        <div className="w-8 h-px bg-border my-1" />

        {/* Shapes */}
        <div className="flex flex-col gap-2">
          <ToolButton active={tool === 'rect'} onClick={() => handleToolChange('rect')} icon={<RectIcon />} title="Rectangle" />
          <ToolButton active={tool === 'circle'} onClick={() => handleToolChange('circle')} icon={<CircleIcon />} title="Circle" />
          <ToolButton active={tool === 'line'} onClick={() => handleToolChange('line')} icon={<LineIcon />} title="Line" />
          <ToolButton active={tool === 'text'} onClick={() => handleToolChange('text')} icon={<TextIcon />} title="Text" />
        </div>

        <div className="w-8 h-px bg-border my-1" />

        {/* Actions */}
        <div className="flex flex-col gap-2 mt-auto">
          <ToolButton active={fillEnabled} onClick={() => setFillEnabled(!fillEnabled)} icon={<FillIcon />} title="Toggle Fill" />
          <ToolButton active={false} onClick={handleUndo} icon={<UndoIcon />} title="Undo (Ctrl+Z)" />
          <ToolButton active={false} onClick={handleClear} icon={<ClearIcon />} title="Clear Canvas" danger />
          <ToolButton active={false} onClick={handleSave} icon={<SaveIcon />} title="Save as PNG" />
        </div>
      </div>

      {/* Properties Bar (Bottom) */}
      <div className="absolute bottom-4 left-24 right-4 h-14 bg-background/80 backdrop-blur-xl rounded-2xl flex items-center px-6 gap-6 z-20 shadow-xl border border-border/50">
        {/* Colors */}
        <div className="flex items-center gap-1.5">
          {COLORS.slice(0, 10).map(c => (
            <button
              key={c}
              className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${color === c ? 'border-primary scale-110 ring-2 ring-primary/30' : 'border-muted'}`}
              style={{ backgroundColor: c }}
              onClick={() => setColor(c)}
            />
          ))}
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-6 h-6 rounded-full overflow-hidden border-2 border-muted p-0 cursor-pointer"
          />
        </div>

        <div className="w-px h-8 bg-border" />

        {/* Brush Size */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Size</span>
          <div className="flex items-center gap-2">
            {BRUSH_SIZES.map(size => (
              <button
                key={size}
                onClick={() => setBrushSize(size)}
                className={`rounded-full bg-muted hover:bg-muted/80 transition-all ${brushSize === size ? 'bg-primary text-primary-foreground scale-110' : ''}`}
                style={{ width: Math.max(16, size + 8), height: Math.max(16, size + 8), padding: 2 }}
              >
                <div className="w-full h-full rounded-full bg-current" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ToolButton({ active, onClick, icon, title, danger }: any) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${active
        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
        : danger
          ? 'text-destructive hover:bg-destructive/10 hover:text-destructive'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        }`}
    >
      {icon}
    </button>
  );
}

// Icons
const SelectIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>;
const PenIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>;
const EraserIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const RectIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /></svg>;
const CircleIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /></svg>;
const LineIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 21L21 3" /></svg>;
const TextIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h8m-8 6h16" /></svg>;
const FillIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>;
const UndoIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>;
const ClearIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const SaveIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
