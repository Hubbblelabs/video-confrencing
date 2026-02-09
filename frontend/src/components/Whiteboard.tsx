import { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas, FabricObject, Circle, Rect, Line, IText } from 'fabric';
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
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  '#800000', '#808080', '#008000', '#000080', '#808000', '#800080', '#008080', '#C0C0C0',
  '#FFA500', '#FFD700', '#FF69B4', '#FF1493', '#9370DB', '#4B0082', '#00CED1', '#20B2AA',
];
const BRUSH_SIZES = [1, 2, 4, 6, 8, 12, 16, 20, 24, 32];

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

  // Initialize Fabric.js canvas with responsive size
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();

    const canvas = new Canvas(canvasRef.current, {
      width: rect.width,
      height: rect.height,
      backgroundColor: '#ffffff',
      isDrawingMode: tool === 'pen' || tool === 'eraser',
    });

    // Configure brush
    if (canvas.freeDrawingBrush) {
      canvas.freeDrawingBrush.color = tool === 'eraser' ? '#ffffff' : color;
      canvas.freeDrawingBrush.width = brushSize;
    }

    fabricCanvasRef.current = canvas;

    // Handle window resize
    const handleResize = () => {
      const newRect = container.getBoundingClientRect();
      canvas.setDimensions({ width: newRect.width, height: newRect.height });
      canvas.renderAll();
    };

    window.addEventListener('resize', handleResize);

    // Object events
    canvas.on('object:added', (e: any) => {
      if (e.target && !(e.target as any).remote) {
        const obj = e.target.toObject();
        onObjectAdded(obj);
      }
    });

    canvas.on('object:modified', (e: any) => {
      if (e.target) {
        const obj = e.target.toObject();
        onObjectModified(obj);
      }
    });

    canvas.on('object:removed', (e: any) => {
      if (e.target && !(e.target as any).remote) {
        onObjectRemoved({ id: (e.target as any).id });
      }
    });

    // Mouse events for cursor tracking
    canvas.on('mouse:move', (e: any) => {
      if (e.e && e.absolutePointer) {
        onCursorMove(e.absolutePointer.x, e.absolutePointer.y);
      }
    });

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.dispose();
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Z = Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y = Redo
      if (((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') || ((e.ctrlKey || e.metaKey) && e.key === 'y')) {
        e.preventDefault();
        handleRedo();
      }
      // Ctrl/Cmd + C = Copy
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        e.preventDefault();
        handleCopy();
      }
      // Ctrl/Cmd + V = Paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        handlePaste();
      }
      // Delete or Backspace = Delete selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Update drawing mode when tool changes
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.isDrawingMode = tool === 'pen' || tool === 'eraser';
    canvas.selection = tool === 'select';
    
    if (canvas.freeDrawingBrush) {
      // Eraser uses white color to "erase"
      canvas.freeDrawingBrush.color = tool === 'eraser' ? '#ffffff' : color;
      canvas.freeDrawingBrush.width = tool === 'eraser' ? brushSize * 2 : brushSize;
    }
  }, [tool, color, brushSize]);

  // Add shape
  const addShape = useCallback((shapeType: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    let shape: FabricObject | null = null;
    const fillColor = fillEnabled ? color : 'transparent';

    switch (shapeType) {
      case 'circle':
        shape = new Circle({
          radius: 50,
          fill: fillColor,
          stroke: color,
          strokeWidth: brushSize,
          left: 100,
          top: 100,
        });
        break;
      case 'rect':
        shape = new Rect({
          width: 100,
          height: 100,
          fill: fillColor,
          stroke: color,
          strokeWidth: brushSize,
          left: 100,
          top: 100,
        });
        break;
      case 'line':
        shape = new Line([50, 100, 200, 200], {
          stroke: color,
          strokeWidth: brushSize,
        });
        break;
      case 'text':
        shape = new IText('Text', {
          left: 100,
          top: 100,
          fill: color,
          fontSize: 20,
          fontFamily: 'Arial',
        });
        break;
    }

    if (shape) {
      canvas.add(shape);
      canvas.setActiveObject(shape);
      canvas.renderAll();
    }
  }, [color, brushSize, fillEnabled]);

  // Handle tool selection
  const handleToolChange = (newTool: DrawingTool) => {
    setTool(newTool);
    
    if (newTool !== 'pen' && newTool !== 'select') {
      addShape(newTool);
    }
  };

  // Clear canvas
  const handleClear = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.clear();
    canvas.backgroundColor = '#ffffff';
    canvas.renderAll();
    onClear();
  };

  // Undo last action
  const handleUndo = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const objects = canvas.getObjects();
    if (objects.length > 0) {
      const removed = objects[objects.length - 1];
      canvas.remove(removed);
      historyRef.current.push(removed);
      canvas.renderAll();
    }
  };

  // Redo last undone action
  const handleRedo = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || historyRef.current.length === 0) return;

    const obj = historyRef.current.pop();
    if (obj) {
      canvas.add(obj);
      canvas.renderAll();
    }
  };

  // Delete selected object
  const handleDelete = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length > 0) {
      activeObjects.forEach((obj) => canvas.remove(obj));
      canvas.discardActiveObject();
      canvas.renderAll();
    }
  };

  // Copy selected object
  const handleCopy = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      try {
        const cloned = await (activeObject as any).clone();
        (window as any)._clipboard = cloned;
      } catch (error) {
        console.error('Copy failed:', error);
      }
    }
  };

  // Paste copied object
  const handlePaste = async () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !(window as any)._clipboard) return;

    try {
      const clonedObj = await ((window as any)._clipboard as any).clone();
      canvas.discardActiveObject();
      clonedObj.set({
        left: clonedObj.left + 10,
        top: clonedObj.top + 10,
        evented: true,
      });
      canvas.add(clonedObj);
      canvas.setActiveObject(clonedObj);
      canvas.renderAll();
    } catch (error) {
      console.error('Paste failed:', error);
    }
  };

  // Bring to front
  const handleBringToFront = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      canvas.bringObjectToFront(activeObject);
      canvas.renderAll();
    }
  };

  // Send to back
  const handleSendToBack = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      canvas.sendObjectToBack(activeObject);
      canvas.renderAll();
    }
  };

  // Save/export canvas
  const handleSave = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 1,
    });
    onSave(dataUrl);
  };

  // Export as JSON
  const handleExportJSON = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const json = JSON.stringify(canvas.toJSON());
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whiteboard-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full w-full flex flex-col bg-card border-l border-border">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-3 bg-card border-b border-border overflow-x-auto">
        {/* Drawing Tools */}
        <div className="flex items-center gap-1 border-r border-border pr-2">
          <ToolButton
            icon={<PenIcon />}
            label="Pen"
            active={tool === 'pen'}
            onClick={() => handleToolChange('pen')}
          />
          <ToolButton
            icon={<EraserIcon />}
            label="Eraser"
            active={tool === 'eraser'}
            onClick={() => handleToolChange('eraser')}
          />
          <ToolButton
            icon={<SelectIcon />}
            label="Select"
            active={tool === 'select'}
            onClick={() => handleToolChange('select')}
          />
          <ToolButton
            icon={<LineIcon />}
            label="Line"
            active={tool === 'line'}
            onClick={() => handleToolChange('line')}
          />
          <ToolButton
            icon={<RectIcon />}
            label="Rectangle"
            active={tool === 'rect'}
            onClick={() => handleToolChange('rect')}
          />
          <ToolButton
            icon={<CircleIcon />}
            label="Circle"
            active={tool === 'circle'}
            onClick={() => handleToolChange('circle')}
          />
          <ToolButton
            icon={<TextIcon />}
            label="Text"
            active={tool === 'text'}
            onClick={() => handleToolChange('text')}
          />
        </div>

        {/* Color Picker */}
        <div className="flex items-center gap-1 border-r border-border pr-2">
          <div className="grid grid-cols-8 gap-1">
            {COLORS.map((c) => (
              <button
                key={c}
                className={`w-5 h-5 rounded border-2 transition-all hover:scale-110 ${
                  color === c ? 'border-[var(--primary)] scale-110 ring-2 ring-[var(--primary)] ring-offset-1' : 'border-gray-300'
                }`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
                title={c}
              />
            ))}
          </div>
        </div>

        {/* Brush Size */}
        <div className="flex items-center gap-1 border-r border-border pr-2">
          <div className="flex flex-wrap gap-1 max-w-[200px]">
            {BRUSH_SIZES.map((size) => (
              <button
                key={size}
                className={`w-7 h-7 rounded flex items-center justify-center transition-all ${
                  brushSize === size
                    ? 'bg-[var(--primary)] text-white ring-2 ring-[var(--primary)] ring-offset-1'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
                onClick={() => setBrushSize(size)}
                title={`Size ${size}px`}
              >
                <div
                  className="rounded-full bg-current"
                  style={{ width: Math.min(size, 12), height: Math.min(size, 12) }}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-auto">
          <button
            className={`px-3 h-8 rounded flex items-center gap-1 transition-all text-sm font-medium ${
              fillEnabled
                ? 'bg-[var(--primary)] text-white'
                : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
            onClick={() => setFillEnabled(!fillEnabled)}
            title="Fill Shapes"
          >
            <FillIcon />
            <span className="hidden sm:inline">Fill</span>
          </button>
          <ActionButton icon={<UndoIcon />} label="Undo" onClick={handleUndo} />
          <ActionButton icon={<RedoIcon />} label="Redo" onClick={handleRedo} />
          <ActionButton icon={<CopyIcon />} label="Copy" onClick={handleCopy} />
          <ActionButton icon={<PasteIcon />} label="Paste" onClick={handlePaste} />
          <ActionButton icon={<DeleteIcon />} label="Delete" onClick={handleDelete} />
          <ActionButton icon={<FrontIcon />} label="Bring Front" onClick={handleBringToFront} />
          <ActionButton icon={<BackIcon />} label="Send Back" onClick={handleSendToBack} />
          <ActionButton icon={<ClearIcon />} label="Clear" onClick={handleClear} />
          <ActionButton icon={<SaveIcon />} label="Save PNG" onClick={handleSave} />
          <ActionButton icon={<DownloadIcon />} label="Export JSON" onClick={handleExportJSON} />
        </div>
      </div>

      {/* Canvas Area */}
      <div ref={containerRef} className="flex-1 relative bg-white overflow-hidden">
        <canvas ref={canvasRef} />
        
        {/* Remote Cursors */}
        {remoteCursors.map((cursor) => (
          cursor.userId !== userId && (
            <div
              key={cursor.userId}
              className="absolute pointer-events-none transition-all duration-75"
              style={{
                left: cursor.x,
                top: cursor.y,
                transform: 'translate(-50%, -50%)',
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill={cursor.color}>
                <path d="M0 0L12 3L5 10L9 14L14 9L21 21L14 14L24 12L0 0Z" />
              </svg>
              <div
                className="text-xs font-medium px-2 py-1 rounded shadow-lg mt-1 whitespace-nowrap"
                style={{ backgroundColor: cursor.color, color: '#fff' }}
              >
                {cursor.displayName}
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}

// Helper Components

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function ToolButton({ icon, label, active, onClick }: ToolButtonProps) {
  return (
    <button
      className={`w-10 h-10 rounded flex items-center justify-center transition-all ${
        active
          ? 'bg-[var(--primary)] text-white shadow-md'
          : 'bg-muted text-foreground hover:bg-muted/80'
      }`}
      onClick={onClick}
      title={label}
    >
      {icon}
    </button>
  );
}

interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

function ActionButton({ icon, label, onClick }: ActionButtonProps) {
  return (
    <button
      className="px-3 h-8 rounded flex items-center justify-center gap-2 bg-muted text-foreground hover:bg-muted/80 transition-all text-sm font-medium"
      onClick={onClick}
      title={label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

// SVG Icons

const PenIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

const SelectIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
  </svg>
);

const EraserIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const LineIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
  </svg>
);

const RectIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="6" width="18" height="12" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CircleIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="9" />
  </svg>
);

const TextIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h8m-8 6h16" />
  </svg>
);

const UndoIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
  </svg>
);

const ClearIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const SaveIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
  </svg>
);

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const RedoIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const PasteIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

const DeleteIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const FrontIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
  </svg>
);

const BackIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8V20m0 0l4-4m-4 4l-4-4M7 16V4m0 0L3 8m4-4l4 4" />
  </svg>
);

const FillIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
  </svg>
);

