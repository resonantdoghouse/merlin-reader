import { useState, useEffect, useRef } from "react";
import { Book as BookIcon, Trash2, Heart, Tag } from "lucide-react";
import { pdfjs } from "react-pdf";

// Ensure worker is set (it might be set in ExcaliburReader, but safe to set here too if not)
if (!pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
}

interface Props {
  book: Book;
  onSelect: (book: Book) => void;
  onRemove: (id: number) => void;
  onToggleFavorite: (id: number) => void;
}

export function BookCard({
  book,
  onSelect,
  onRemove,
  onToggleFavorite,
}: Props) {
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
      { rootMargin: "200px" }, // Start loading slightly before it comes into view
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
        const safePath = book.filepath.replace(/\\/g, "/");
        const loadingTask = pdfjs.getDocument(`media:///${safePath}`);
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
        className="w-full aspect-[2/3] bg-merlin-950 rounded-lg shadow-lg border border-merlin-500/10 mb-2 cursor-pointer hover:border-merlin-500 transition-colors flex items-center justify-center overflow-hidden relative"
        onClick={() => onSelect(book)}
      >
        <div className="absolute inset-x-0 bottom-0 h-1 bg-merlin-900/50 z-10">
          <div
            className="h-full bg-merlin-500"
            style={{
              width: `${Math.min(
                100,
                (book.last_read_page / (book.total_pages || 1)) * 100,
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
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex flex-col gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(book.id);
            }}
            className={`p-2 rounded-full text-white shadow-md transition-colors ${book.is_favorite ? "bg-pink-500 hover:bg-pink-600" : "bg-merlin-900/80 hover:bg-merlin-500"}`}
            title={
              book.is_favorite ? "Remove from Favorites" : "Add to Favorites"
            }
          >
            <Heart
              size={16}
              fill={book.is_favorite ? "currentColor" : "none"}
            />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(book.id);
            }}
            className="p-2 bg-red-900/80 hover:bg-red-600 rounded-full text-white shadow-md"
            title="Remove from Library"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* Author / Metadata Overlay on hover if no cover or just always? */}
        {/* Let's put tags at bottom left */}
        {book.tags && (
          <div className="absolute bottom-2 left-2 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20 max-w-[90%]">
            {book.tags
              .split(",")
              .slice(0, 3)
              .map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] bg-merlin-900/90 text-merlin-100 px-1.5 py-0.5 rounded border border-merlin-500/30 truncate max-w-[80px]"
                >
                  {tag.trim()}
                </span>
              ))}
          </div>
        )}
      </div>

      <h3
        className="text-center font-medium text-sm line-clamp-2 text-merlin-100 px-2 break-words w-full"
        title={book.title}
      >
        {book.title}
      </h3>
      {book.author && (
        <p className="text-center text-xs text-merlin-100/50 line-clamp-1 w-full px-2">
          {book.author}
        </p>
      )}
    </div>
  );
}
