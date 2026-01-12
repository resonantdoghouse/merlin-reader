import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ArrowLeft, ChevronLeft, ChevronRight, Moon, Sun } from "lucide-react";

import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

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

  // Update backend when page changes
  useEffect(() => {
    window.merlin.invoke("update-progress", book.id, pageNumber);
  }, [pageNumber, book.id]);

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

      {/* Reader Area */}
      <div className="flex-1 overflow-auto flex justify-center p-8">
        <Document
          file={`file://${book.filepath}`}
          onLoadSuccess={onDocumentLoadSuccess}
          className={`shadow-2xl ${
            isDarkMode ? "brightness-[0.8] contrast-[1.2]" : ""
          }`}
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
