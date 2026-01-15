import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Settings,
  RotateCw,
} from "lucide-react";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
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
    book.last_read_page || 1
  );
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(false);

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
      className={`flex flex-col h-screen ${
        isDarkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-black"
      }`}
    >
      {/* Toolbar */}
      <div
        className={`flex items-center justify-between p-4 shadow-md z-10 ${
          isDarkMode ? "bg-gray-800" : "bg-white"
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
        className="flex-1 overflow-auto flex justify-center p-8 scroll-smooth"
        onScroll={onScroll}
      >
        <Document
          file={`file://${book.filepath}`}
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
            className={isDarkMode ? "invert hue-rotate-180" : ""}
          />
        </Document>
      </div>
    </div>
  );
}
