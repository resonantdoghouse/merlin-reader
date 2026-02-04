import { useState, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Settings,
  RotateCw,
  Maximize,
  Minimize,
  Pin,
  PinOff,
  Loader2,
} from "lucide-react";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

interface Props {
  book: Book;
  onBack: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export function ExcaliburReader({
  book,
  onBack,
  isDarkMode,
  toggleDarkMode,
}: Props) {
  const [numPages, setNumPages] = useState<number>(book.total_pages || 0);
  const [pageNumber, setPageNumber] = useState<number>(
    book.last_read_page || 1,
  );
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isToolbarPinned, setIsToolbarPinned] = useState(true);
  const [isHoveringToolbar, setIsHoveringToolbar] = useState(false);
  const readerRef = useRef<HTMLDivElement>(null);

  // Update backend when page changes
  useEffect(() => {
    window.merlin.invoke("update-progress", book.id, pageNumber);
  }, [pageNumber, book.id]);

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        setPageNumber((prev) => Math.min(numPages || Infinity, prev + 1));
      } else if (e.key === "ArrowLeft") {
        setPageNumber((prev) => Math.max(1, prev - 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [numPages]);

  // Scroll to top on page change
  useEffect(() => {
    if (readerRef.current) {
      readerRef.current.scrollTop = 0;
    }
  }, [pageNumber]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Improved Scroll Handler with debounce/lock could go here,
  // but for "Next Page on Scroll", effectively we want:
  // If user hits bottom, go to next page AND scroll to top.

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!autoAdvance) return;
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    if (scrollTop + clientHeight >= scrollHeight - 20) {
      // Only advance if enough time has passed or we are not already advancing?
      // Simplest: Just advance.
      if (pageNumber < (numPages || 0)) {
        setPageNumber((p) => p + 1);
        // And reset scroll is handled by React layout updates usually,
        // but we might need to force it.
        // The container will stay same, so we should scroll to top.
        e.currentTarget.scrollTop = 0;
      }
    }
  };

  // Update total pages in DB if not set
  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    if (!book.total_pages || book.total_pages !== numPages) {
      window.merlin.invoke("update-meta", book.id, numPages);
    }
  }

  return (
    <div
      className={`flex flex-col h-screen relative ${
        isDarkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-black"
      }`}
    >
      {/* Zen Mode Hover Trigger Zone */}
      {isFullscreen && !isToolbarPinned && (
        <div
          className="fixed top-0 left-0 right-0 h-4 z-50 bg-transparent"
          onMouseEnter={() => setIsHoveringToolbar(true)}
        />
      )}

      {/* Toolbar */}
      <div
        onMouseEnter={() => setIsHoveringToolbar(true)}
        onMouseLeave={() => setIsHoveringToolbar(false)}
        className={`flex items-center justify-between p-4 shadow-md z-40 transition-transform duration-300 ${
          isDarkMode ? "bg-gray-800" : "bg-white"
        } ${
          isFullscreen
            ? "fixed top-0 left-0 right-0 " +
              (isToolbarPinned || isHoveringToolbar
                ? "translate-y-0"
                : "-translate-y-full")
            : ""
        }`}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-gray-500/20"
          >
            <ArrowLeft size={24} />
          </button>
          <h2 className="font-bold text-lg truncate max-w-md">{book.title}</h2>
        </div>

        <div className="flex items-center gap-4 bg-gray-500/10 px-4 py-2 rounded-lg">
          <button
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber((p) => p - 1)}
            className="disabled:opacity-30 hover:text-merlin-500"
          >
            <ChevronLeft />
          </button>
          <span className="font-mono">
            {pageNumber} / {numPages || "--"}
          </span>
          <button
            disabled={pageNumber >= numPages}
            onClick={() => setPageNumber((p) => p + 1)}
            className="disabled:opacity-30 hover:text-merlin-500"
          >
            <ChevronRight />
          </button>
        </div>

        <div className="flex items-center gap-4">
          {/* Settings Toggle */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-full hover:bg-gray-500/20 ${
              showSettings ? "bg-merlin-500 text-white" : ""
            }`}
            title="Reader Settings"
          >
            <Settings size={20} />
          </button>

          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="p-2 rounded-full hover:bg-gray-500/20"
            title="Rotate Clockwise"
          >
            <RotateCw size={20} />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-full hover:bg-gray-500/20"
            title={isFullscreen ? "Exit Zen Mode" : "Enter Zen Mode"}
          >
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>

          {isFullscreen && (
            <button
              onClick={() => setIsToolbarPinned(!isToolbarPinned)}
              className={`p-2 rounded-full hover:bg-gray-500/20 ${
                isToolbarPinned ? "bg-merlin-500 text-white" : ""
              }`}
              title={
                isToolbarPinned
                  ? "Unpin Toolbar (Auto-hide)"
                  : "Pin Toolbar (Always Visible)"
              }
            >
              {isToolbarPinned ? <Pin size={20} /> : <PinOff size={20} />}
            </button>
          )}

          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full hover:bg-gray-500/20"
            title="Toggle Magical Lighting"
          >
            {isDarkMode ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <div className="flex bg-gray-500/10 rounded-lg">
            <button
              onClick={() => setScale((s) => Math.max(0.5, s - 0.1))}
              className="px-3 py-1 hover:bg-gray-500/20 font-bold"
            >
              -
            </button>
            <span className="px-2 py-1 text-sm flex items-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale((s) => Math.min(2, s + 0.1))}
              className="px-3 py-1 hover:bg-gray-500/20 font-bold"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div
          className={`absolute top-20 right-4 p-4 rounded-xl shadow-2xl border w-64 z-20 ${
            isDarkMode
              ? "bg-gray-800 border-gray-700"
              : "bg-white border-gray-200"
          }`}
        >
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <Settings size={16} /> Preferences
          </h3>

          <div className="flex items-center justify-between mb-2">
            <span className="text-sm">Auto-advance on scroll</span>
            <button
              onClick={() => setAutoAdvance(!autoAdvance)}
              className={`w-10 h-5 rounded-full transition-colors relative ${
                autoAdvance ? "bg-merlin-500" : "bg-gray-400"
              }`}
            >
              <div
                className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${
                  autoAdvance ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
          <p className="text-xs opacity-60">
            Automatically goes to the next page when you scroll to the bottom.
          </p>
        </div>
      )}

      {/* Reader Area */}
      <div
        ref={readerRef}
        className="flex-1 overflow-auto flex justify-center px-8 pb-8 pt-0 scroll-smooth"
        onScroll={onScroll}
      >
        <Document
          file={`media:///${book.filepath.replace(/\\/g, "/")}`}
          onLoadSuccess={onDocumentLoadSuccess}
          className={`shadow-2xl transition-transform duration-300 ${
            isDarkMode ? "brightness-[0.8] contrast-[1.2]" : ""
          }`}
          rotate={rotation}
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderTextLayer={false}
            className={`min-h-[600px] ${
              isDarkMode ? "invert hue-rotate-180" : ""
            }`}
            loading={
              <div
                className="flex items-center justify-center text-gray-400"
                style={{ height: 600 * scale, width: 450 * scale }}
              >
                <Loader2 className="animate-spin" size={48} />
              </div>
            }
          />
        </Document>
      </div>
    </div>
  );
}
