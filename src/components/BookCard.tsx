import { useState, useEffect, useRef } from "react";
import { Book as BookIcon, Trash2 } from "lucide-react";
import { pdfjs } from "react-pdf";

// Ensure worker is set (it might be set in ExcaliburReader, but safe to set here too if not)
if (!pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
}

interface Props {
  book: Book;
  onSelect: (book: Book) => void;
  onRemove: (id: number) => void;
}

export function BookCard({ book, onSelect, onRemove }: Props) {
  const [cover, setCover] = useState<string | null>(book.cover_image);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Lazy load trigger
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // Only need to trigger once
        }
      },
      { rootMargin: "200px" } // Start loading slightly before it comes into view
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || cover) return;

    let isMounted = true;
    let pdfDoc: any = null;

    async function generateCover() {
      try {
        const loadingTask = pdfjs.getDocument(`file://${book.filepath}`);
        pdfDoc = await loadingTask.promise;
        const page = await pdfDoc.getPage(1);

        const viewport = page.getViewport({ scale: 0.5 }); // Thumbnail scale
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (context) {
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          const renderContext = {
            canvasContext: context,
            viewport: viewport,
            canvas: canvas,
          };
          await page.render(renderContext).promise;

          const dataUrl = canvas.toDataURL("image/jpeg", 0.8);

          if (isMounted) {
            setCover(dataUrl);
            window.merlin.invoke("update-cover", book.id, dataUrl);
          }
        }
      } catch (err) {
        console.error("Failed to generate cover for", book.title, err);
      } finally {
        // Critical: cleanup memory
        if (pdfDoc) {
          pdfDoc.destroy();
        }
      }
    }

    generateCover();

    return () => {
      isMounted = false;
      // Note: we can't easily cancel the loadingTask.promise itself if it's mid-flight,
      // but the finally block will ensure cleanup if it finished.
    };
  }, [isVisible, book.id, book.filepath, cover]);

  return (
    <div ref={cardRef} className="group relative flex flex-col items-center">
      <div
        className="w-full aspect-[2/3] bg-merlin-950 rounded-lg shadow-lg border border-merlin-500/10 mb-4 cursor-pointer hover:border-merlin-500 transition-colors flex items-center justify-center overflow-hidden relative"
        onClick={() => onSelect(book)}
      >
        <div className="absolute inset-x-0 bottom-0 h-1 bg-merlin-900/50 z-10">
          <div
            className="h-full bg-merlin-500"
            style={{
              width: `${Math.min(
                100,
                (book.last_read_page / (book.total_pages || 1)) * 100
              )}%`,
            }}
          />
        </div>

        {cover ? (
          <img
            src={cover}
            alt={book.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <BookIcon
            size={40}
            className="text-merlin-500/30 group-hover:text-merlin-500 transition-colors"
          />
        )}

        {/* Hover Actions */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(book.id);
            }}
            className="p-2 bg-red-900/80 hover:bg-red-600 rounded-full text-white"
            title="Remove from Library"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <h3 className="text-center font-medium text-sm line-clamp-2 text-merlin-100 px-2 break-words w-full">
        {book.title}
      </h3>
    </div>
  );
}
