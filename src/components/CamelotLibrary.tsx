import { useState, type DragEvent } from "react";
import {
  Book as BookIcon,
  Trash2,
  FolderOpen,
  Plus,
  FileText,
} from "lucide-react";

interface Props {
  books: Book[];
  onSelectBook: (book: Book) => void;
  onRemoveBook: (id: number) => void;
  onAddFolder: () => void;
}

export function CamelotLibrary({
  books,
  onSelectBook,
  onRemoveBook,
  onAddFolder,
}: Props) {
  const [isDragging, setIsDragging] = useState(false);

  // Filter out removed books just in case, though backend handles it
  const visibleBooks = books.filter((b) => !b.is_removed);
  const recentBook = visibleBooks[0]; // Ordered by last_read_at DESC

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach((file: any) => {
      if (file.path && file.path.toLowerCase().endsWith(".pdf")) {
        window.merlin.invoke("add-book", file.path);
      }
    });
  };

  return (
    <div
      className={`h-full min-h-screen p-8 transition-colors duration-300 ${
        isDragging ? "bg-merlin-900/50" : "bg-transparent"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-merlin-500 to-merlin-100">
          The Great Library of Camelot
        </h1>
        <button
          onClick={onAddFolder}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-merlin-900 hover:bg-merlin-500 transition-colors border border-merlin-500/30"
        >
          <FolderOpen size={20} />
          <span>Scan Kingdom</span>
        </button>
      </header>

      {recentBook && (
        <div className="mb-12 p-6 bg-merlin-900/40 rounded-2xl border border-merlin-500/20 backdrop-blur-sm flex gap-6 items-end">
          <div className="flex-1">
            <h2 className="text-sm font-medium text-merlin-500 mb-2 uppercase tracking-wide">
              Most Recently Consulted
            </h2>
            <h3 className="text-3xl font-bold mb-2">{recentBook.title}</h3>
            <div className="text-merlin-100/60 mb-6 flex items-center gap-2">
              <FileText size={16} />
              {recentBook.filepath}
            </div>
            <button
              onClick={() => onSelectBook(recentBook)}
              className="px-8 py-3 bg-merlin-500 text-white font-bold rounded-lg hover:bg-merlin-400 transition-all shadow-[0_0_20px_rgba(14,165,233,0.3)] hover:shadow-[0_0_30px_rgba(14,165,233,0.5)]"
            >
              Resume Reading (Page {recentBook.last_read_page})
            </button>
          </div>
          {/* Cover placeholder */}
          <div className="w-32 h-48 bg-merlin-950 rounded-lg shadow-2xl flex items-center justify-center border border-merlin-500/20">
            <BookIcon size={48} className="text-merlin-500/50" />
          </div>
        </div>
      )}

      {/* Grid */}
      <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
        <BookIcon className="text-merlin-500" />
        Library Configured (`RoundTable`)
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
        {visibleBooks.map((book) => (
          <div
            key={book.id}
            className="group relative flex flex-col items-center"
          >
            <div
              className="w-full aspect-[2/3] bg-merlin-950 rounded-lg shadow-lg border border-merlin-500/10 mb-4 cursor-pointer hover:border-merlin-500 transition-colors flex items-center justify-center overflow-hidden relative"
              onClick={() => onSelectBook(book)}
            >
              <div className="absolute inset-x-0 bottom-0 h-1 bg-merlin-900/50">
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
              {book.cover_image ? (
                <img
                  src={book.cover_image}
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
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveBook(book.id);
                  }}
                  className="p-2 bg-red-900/80 hover:bg-red-600 rounded-full text-white"
                  title="Remove from Library"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <h3 className="text-center font-medium text-sm line-clamp-2 text-merlin-100">
              {book.title}
            </h3>
          </div>
        ))}

        {/* Add Book Card */}
        <div
          className="flex flex-col items-center justify-center w-full aspect-[2/3] border-2 border-dashed border-merlin-500/30 rounded-lg hover:border-merlin-500 hover:bg-merlin-500/5 transition-all cursor-pointer text-merlin-500/50 hover:text-merlin-500"
          onClick={() => {
            // Trigger file input? Or just hint to drag and drop
            // Simple version: just hint
          }}
        >
          <Plus size={40} />
          <span className="mt-2 text-sm font-medium">Drag PDF Here</span>
        </div>
      </div>
    </div>
  );
}
