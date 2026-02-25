import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, FabricObject, Circle, Rect, Line, IText, PencilBrush, util } from 'fabric';
import type { DrawingTool, WhiteboardCursor } from '../types/whiteboard.types';

interface WhiteboardProps {
  onObjectAdded: (object: any) => void;
  onObjectModified: (object: any) => void;
  onObjectRemoved: (objectId: string) => void;
  onCursorMove: (x: number, y: number) => void;
  onClear: () => void;
  onSave: (dataUrl: string) => void;
  onCursorUpdate: (callback: (data: WhiteboardCursor) => void) => () => void;
  remoteObjects?: any[];
  fullScreen?: boolean;
}

const COLORS = [
  '#000000', '#ffffff', '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e'
];
const BRUSH_SIZES = [2, 4, 8, 12, 16, 24];

export function Whiteboard({
  onObjectAdded,
  onObjectModified,
  onObjectRemoved,
  onCursorMove,
  onClear,
  onSave,
  onCursorUpdate,
  remoteObjects,
  fullScreen = false,
}: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const cursorsContainerRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<DrawingTool>('pen');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(4);
  const [fillEnabled, setFillEnabled] = useState(false);

  // Subscribe to cursor updates
  useEffect(() => {
    // Local map to track cursor elements to avoid re-creating them
    const cursorElements = new Map<string, HTMLDivElement>();
    const cursorTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

    const cleanup = onCursorUpdate((data) => {
      if (!cursorsContainerRef.current) return;

      let el = cursorElements.get(data.userId);

      if (!el) {
        el = document.createElement('div');
        el.className = "absolute pointer-events-none transition-all duration-100 ease-linear z-10";
        el.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="${data.color}" class="drop-shadow-sm">
            <path d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19138L15.6499 12.3673H5.65376Z" stroke="white" stroke-width="1" />
          </svg>
          <div class="absolute top-4 left-4 px-2 py-0.5 rounded-full text-[10px] font-bold text-white whitespace-nowrap shadow-sm" style="background-color: ${data.color}">
            ${data.displayName}
          </div>
        `;
        cursorsContainerRef.current.appendChild(el);
        cursorElements.set(data.userId, el);
      }

      // Update position
      el.style.left = `${data.x}px`;
      el.style.top = `${data.y}px`;

      // Clear existing timeout
      if (cursorTimeouts.has(data.userId)) {
        clearTimeout(cursorTimeouts.get(data.userId)!);
      }

      // Set new timeout to remove cursor after 3 seconds of inactivity
      const timeout = setTimeout(() => {
        if (el && el.parentNode) {
          el.parentNode.removeChild(el);
        }
        cursorElements.delete(data.userId);
        cursorTimeouts.delete(data.userId);
      }, 3000);

      cursorTimeouts.set(data.userId, timeout);
    });

    return () => {
      cleanup();
      cursorTimeouts.forEach(t => clearTimeout(t));
      cursorElements.forEach(el => {
        if (el.parentNode) el.parentNode.removeChild(el);
      });
      cursorElements.clear();
      cursorTimeouts.clear();
    };
  }, [onCursorUpdate]);

  // Update canvas state when tool/color/size changes
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.isDrawingMode = tool === 'pen' || tool === 'eraser';
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = tool === 'eraser' ? '#ffffff' : color;
      canvas.freeDrawingBrush.width = brushSize;
    }
  }, [tool, color, brushSize]);

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
      if (e.target && !(e.target as any).remote) {
        if (!(e.target as any).id) {
          (e.target as any).id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
        onObjectAdded(e.target.toObject(['id']));
      }
    });

    canvas.on('object:modified', (e: any) => {
      if (e.target && !(e.target as any).remote) {
        onObjectModified(e.target.toObject(['id']));
      }
    });

    canvas.on('object:removed', (e: any) => {
      if (e.target && !(e.target as any).remote) onObjectRemoved((e.target as any).id);
    });

    canvas.on('mouse:move', (e: any) => {
      if (e.scenePoint) onCursorMove(e.scenePoint.x, e.scenePoint.y);
    });

    // Check for path created events (free drawing)
    canvas.on('path:created', (e: any) => {
      if (e.path) {
        e.path.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.dispose();
    };
  }, [brushSize, color, onCursorMove, onObjectAdded, onObjectModified, onObjectRemoved, tool]);

  // Sync Remote Objects
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !remoteObjects) return;

    const currentObjects = canvas.getObjects();
    const remoteIds = new Set(remoteObjects.map((o: any) => o.id));

    // 1. Remove objects that are no longer in remoteObjects
    currentObjects.forEach((obj: any) => {
      if (obj.remote && !remoteIds.has(obj.id)) {
        canvas.remove(obj);
      }
    });

    // 2. Update existing objects
    const toUpdate = remoteObjects.filter((obj: any) => {
      const existing = currentObjects.find((o: any) => o.id === obj.id);
      return existing && canvas.getActiveObject() !== existing;
    });

    toUpdate.forEach((obj: any) => {
      const existing = currentObjects.find((o: any) => o.id === obj.id);
      if (existing) {
        existing.set(obj);
        (existing as any).remote = true;
        existing.setCoords();
      }
    });

    if (toUpdate.length > 0) canvas.requestRenderAll();

    // 3. Add new objects
    const toAdd = remoteObjects.filter((obj: any) => !currentObjects.find((o: any) => o.id === obj.id));

    if (toAdd.length > 0) {
      if (util && util.enlivenObjects) {
        (util.enlivenObjects(toAdd) as Promise<any[]>).then((enlivenedObjects) => {
          enlivenedObjects.forEach((enlivened) => {
            (enlivened as any).remote = true;
            canvas.add(enlivened);
          });
          canvas.requestRenderAll();
        });
      }
    }
  }, [remoteObjects]);

  const addShape = useCallback((shapeType: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    let shape: FabricObject | null = null;
    const fillColor = fillEnabled ? color : 'transparent';
    const center = canvas.getCenterPoint();

    const commonProps = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      stroke: color,
      strokeWidth: brushSize,
      fill: fillColor,
      left: center.x - 50,
      top: center.y - 50,
    };

    switch (shapeType) {
      case 'circle': shape = new Circle({ ...commonProps, radius: 50 }); break;
      case 'rect': shape = new Rect({ ...commonProps, width: 100, height: 100 }); break;
      case 'line': shape = new Line([center.x - 50, center.y, center.x + 50, center.y], { ...commonProps, fill: 'transparent' }); break;
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
  };

  const handleUndo = () => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const objects = canvas.getObjects();
      if (objects.length > 0) {
        const last = objects[objects.length - 1];
        if (!(last as any).remote) {
          canvas.remove(last);
          onObjectRemoved((last as any).id);
        }
      }
    }
  };

  const handleClear = () => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
      onClear();
    }
  };

  const handleSave = () => {
    const canvas = fabricCanvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL({ format: 'png', multiplier: 2 });
      onSave(dataUrl);
    }
  };

  return (
    <div className="h-full w-full flex flex-col relative bg-[#f8fafc]">
      <div ref={containerRef} className="absolute inset-0 z-0">
        <canvas ref={canvasRef} />
        <div ref={cursorsContainerRef} className="absolute inset-0 pointer-events-none z-10 overflow-hidden" />
      </div>

      <div className="absolute top-4 left-4 bottom-4 w-16 bg-background/80 backdrop-blur-xl rounded-2xl flex flex-col items-center py-4 gap-4 z-20 shadow-2xl border border-border/50">
        <div className="flex flex-col gap-2">
          <ToolButton active={tool === 'select'} onClick={() => handleToolChange('select')} icon={<SelectIcon />} title="Select (V)" />
          <ToolButton active={tool === 'pen'} onClick={() => handleToolChange('pen')} icon={<PenIcon />} title="Pen (P)" />
          <ToolButton active={tool === 'eraser'} onClick={() => handleToolChange('eraser')} icon={<EraserIcon />} title="Eraser (E)" />
        </div>
        <div className="w-8 h-px bg-border my-1" />
        <div className="flex flex-col gap-2">
          <ToolButton active={false} onClick={() => addShape('rect')} icon={<RectIcon />} title="Rectangle" />
          <ToolButton active={false} onClick={() => addShape('circle')} icon={<CircleIcon />} title="Circle" />
          <ToolButton active={false} onClick={() => addShape('line')} icon={<LineIcon />} title="Line" />
          <ToolButton active={false} onClick={() => addShape('text')} icon={<TextIcon />} title="Text" />
        </div>
        <div className="w-8 h-px bg-border my-1" />
        <div className="flex flex-col gap-2 mt-auto">
          <ToolButton active={fillEnabled} onClick={() => setFillEnabled(!fillEnabled)} icon={<FillIcon />} title="Toggle Fill" />
          <ToolButton active={false} onClick={handleUndo} icon={<UndoIcon />} title="Undo (Ctrl+Z)" />
          <ToolButton active={false} onClick={handleClear} icon={<ClearIcon />} title="Clear Canvas" danger />
          <ToolButton active={false} onClick={handleSave} icon={<SaveIcon />} title="Save as PNG" />
        </div>
      </div>

      <div className={`absolute left-24 right-4 h-14 bg-background/80 backdrop-blur-xl rounded-2xl flex items-center px-6 gap-6 z-20 shadow-xl border border-border/50 transition-all duration-300 ${fullScreen ? 'bottom-32 left-1/2 -translate-x-1/2 w-auto min-w-[600px] justify-center' : 'bottom-4 left-24 right-4'}`}>
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
