import { useState, type DragEvent, useMemo } from "react";
import {
  Book as BookIcon,
  FolderOpen,
  Plus,
  FileText,
  Search,
  LayoutGrid,
  List,
  Sparkles,
  Maximize2,
  Grid3X3,
  Heart,
  Tag,
} from "lucide-react";
import { BookCard } from "./BookCard";
import Fuse from "fuse.js";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "title" | "added" | "author">(
    "recent",
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [gridSize, setGridSize] = useState<"small" | "medium" | "large">(
    "medium",
  );
  const [isDragging, setIsDragging] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Tag Editing State
  const [editingBookId, setEditingBookId] = useState<number | null>(null);
  const [tagInput, setTagInput] = useState("");

  // Fuse instance
  const fuse = useMemo(() => {
    return new Fuse(books, {
      keys: ["title", "author", "keywords", "tags", "subject"],
      threshold: 0.4,
      ignoreLocation: true,
    });
  }, [books]);

  // Filter and Sort
  const filteredBooks = useMemo(() => {
    let result = books.filter((b) => !b.is_removed);

    if (showFavoritesOnly) {
      result = result.filter((b) => b.is_favorite);
    }

    if (searchQuery) {
      const searchResults = fuse.search(searchQuery);
      result = searchResults
        .map((r) => r.item)
        .filter(
          (b) => !b.is_removed && (showFavoritesOnly ? b.is_favorite : true),
        );
    }

    return result.sort((a, b) => {
      if (searchQuery) return 0; // Keep search relevance order if searching

      if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      } else if (sortBy === "author") {
        return (a.author || "").localeCompare(b.author || "");
      } else if (sortBy === "added") {
        return (
          new Date(b.added_at).getTime() - new Date(a.added_at).getTime() ||
          b.id - a.id
        );
      } else {
        // Recent
        const dateA = a.last_read_at ? new Date(a.last_read_at).getTime() : 0;
        const dateB = b.last_read_at ? new Date(b.last_read_at).getTime() : 0;
        return dateB - dateA;
      }
    });
  }, [books, searchQuery, sortBy, showFavoritesOnly, fuse]);

  const recentBook = books
    .filter((b) => !b.is_removed)
    .sort((a, b) => {
      const dateA = a.last_read_at ? new Date(a.last_read_at).getTime() : 0;
      const dateB = b.last_read_at ? new Date(b.last_read_at).getTime() : 0;
      return dateB - dateA;
    })[0];

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

  const handleRandomBook = () => {
    if (filteredBooks.length > 0) {
      const random =
        filteredBooks[Math.floor(Math.random() * filteredBooks.length)];
      onSelectBook(random);
    }
  };

  const handleOpenTagEditor = (book: Book) => {
    setEditingBookId(book.id);
    setTagInput(book.tags || "");
  };

  const handleSaveTags = async () => {
    if (editingBookId !== null) {
      await window.merlin.invoke("update-tags", editingBookId, tagInput);
      setEditingBookId(null);
      setTagInput("");
    }
  };

  const handleToggleFavorite = async (id: number) => {
    await window.merlin.invoke("toggle-favorite", id);
    // Trigger reload is handled by App.tsx polling/refresh
    // But for better UX we might want immediate local update or rely on parent to refresh
    // Since props.books comes from parent, we wait for parent update.
    // Ideally we'd have a callback to refresh library immediately.
    // For now, next poll or manual refresh will pick it up.
    // Actually, let's force a refresh if possible or just wait.
    // App.tsx polls every 2s, so it should be quick.
  };

  const getGridCols = () => {
    switch (gridSize) {
      case "small":
        return "grid-cols-3 md:grid-cols-6 lg:grid-cols-8";
      case "large":
        return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3";
      default: // medium
        return "grid-cols-2 md:grid-cols-4 lg:grid-cols-6";
    }
  };

  return (
    <div
      className={`h-screen overflow-y-auto p-8 transition-colors duration-300 ${
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
        <div className="flex gap-3">
          <button
            onClick={handleRandomBook}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-900/20 transition-all border border-purple-400/30"
            title="Read a Random Book"
          >
            <Sparkles size={20} />
            <span className="hidden sm:inline">Surprise Me</span>
          </button>
          <button
            onClick={onAddFolder}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-merlin-900 hover:bg-merlin-500 transition-colors border border-merlin-500/30"
          >
            <FolderOpen size={20} />
            <span>Scan Kingdom</span>
          </button>
        </div>
      </header>

      {/* Tag Editor Modal */}
      {editingBookId !== null && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-merlin-900 border border-merlin-500/50 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
              <Tag size={20} className="text-merlin-500" />
              Manage Tags
            </h3>
            <p className="text-merlin-100/60 text-sm mb-4">
              Enter tags separated by commas (e.g., fantasy, epic, dragons)
            </p>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              className="w-full bg-merlin-950 border border-merlin-500/30 rounded-lg p-3 text-white focus:border-merlin-500 outline-none mb-6"
              placeholder="tag1, tag2, tag3"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditingBookId(null)}
                className="px-4 py-2 rounded-lg hover:bg-merlin-800 text-merlin-100/70 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTags}
                className="px-4 py-2 rounded-lg bg-merlin-500 text-white font-medium hover:bg-merlin-400 transition-colors"
              >
                Save Tags
              </button>
            </div>
          </div>
        </div>
      )}

      {recentBook && !searchQuery && !showFavoritesOnly && (
        <div className="mb-12 relative overflow-hidden p-8 rounded-3xl bg-gradient-to-br from-merlin-900/90 to-merlin-900/50 border border-merlin-500/20 backdrop-blur-md shadow-2xl flex gap-8 items-end group">
          {/* Background Glow */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-merlin-500/10 rounded-full blur-3xl group-hover:bg-merlin-500/20 transition-colors duration-500" />

          <div className="flex-1 relative z-10">
            <h2 className="text-xs font-bold text-merlin-400 mb-2 uppercase tracking-[0.2em]">
              Continue Your Journey
            </h2>
            <h3 className="text-4xl font-extrabold mb-3 text-white tracking-tight drop-shadow-sm line-clamp-3 break-words">
              {recentBook.title}
            </h3>
            <div className="text-merlin-100/60 mb-8 flex items-center gap-2 text-sm font-medium">
              <FileText size={16} className="text-merlin-500" />
              <span className="truncate max-w-md">{recentBook.filepath}</span>
            </div>

            <button
              onClick={() => onSelectBook(recentBook)}
              className="px-8 py-3.5 bg-merlin-500 text-white font-bold rounded-xl hover:bg-merlin-400 transition-all shadow-lg hover:shadow-merlin-500/25 active:scale-95 flex items-center gap-2"
            >
              Resume from Page {recentBook.last_read_page}
            </button>
          </div>

          <div className="relative z-10 flex-shrink-0 group-hover:-translate-y-2 transition-transform duration-500 ease-out">
            <div className="w-40 aspect-[2/3] bg-merlin-950 rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-center overflow-hidden border border-merlin-500/20 relative">
              {recentBook.cover_image ? (
                <img
                  src={recentBook.cover_image}
                  alt={recentBook.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-merlin-500/30">
                  <BookIcon size={48} />
                  <div className="w-3/4 h-1 bg-merlin-500/20 rounded-full" />
                  <div className="w-1/2 h-1 bg-merlin-500/20 rounded-full" />
                </div>
              )}
              {/* Shine effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BookIcon className="text-merlin-500" />
          Library Configured (`RoundTable`)
          <span className="text-sm font-normal text-merlin-100/50 ml-2">
            ({filteredBooks.length} Books)
          </span>
        </h2>

        {/* Search and Sort Controls */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative group">
            <input
              type="text"
              placeholder="Search titles, authors, keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-merlin-900/50 border border-merlin-500/30 rounded-lg px-4 py-2 pl-10 focus:outline-none focus:border-merlin-500 transition-colors w-64"
            />
            <Search
              className="absolute left-3 top-2.5 text-merlin-500/50 group-focus-within:text-merlin-500"
              size={18}
            />
          </div>

          <button
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            className={`p-2 rounded-lg border transition-colors ${showFavoritesOnly ? "bg-pink-500/20 border-pink-500 text-pink-500" : "bg-merlin-900/50 border-merlin-500/30 text-merlin-100/50 hover:text-pink-500"}`}
            title="Show Favorites Only"
          >
            <Heart
              size={20}
              fill={showFavoritesOnly ? "currentColor" : "none"}
            />
          </button>

          <div className="flex bg-merlin-900/50 rounded-lg p-1 border border-merlin-500/30">
            <button
              onClick={() => setSortBy("recent")}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                sortBy === "recent"
                  ? "bg-merlin-500 text-white"
                  : "hover:bg-merlin-500/20 text-merlin-100/70"
              }`}
            >
              Recent
            </button>
            <button
              onClick={() => setSortBy("title")}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                sortBy === "title"
                  ? "bg-merlin-500 text-white"
                  : "hover:bg-merlin-500/20 text-merlin-100/70"
              }`}
            >
              Title
            </button>
            <button
              onClick={() => setSortBy("author")}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                sortBy === "author"
                  ? "bg-merlin-500 text-white"
                  : "hover:bg-merlin-500/20 text-merlin-100/70"
              }`}
            >
              Author
            </button>
            <button
              onClick={() => setSortBy("added")}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                sortBy === "added"
                  ? "bg-merlin-500 text-white"
                  : "hover:bg-merlin-500/20 text-merlin-100/70"
              }`}
            >
              Added
            </button>
          </div>

          {/* View Options */}
          <div className="flex bg-merlin-900/50 rounded-lg p-1 border border-merlin-500/30 ml-2">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "grid"
                  ? "bg-merlin-500 text-white"
                  : "hover:bg-merlin-500/20 text-merlin-100/70"
              }`}
              title="Grid View"
            >
              <LayoutGrid size={18} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "list"
                  ? "bg-merlin-500 text-white"
                  : "hover:bg-merlin-500/20 text-merlin-100/70"
              }`}
              title="List View"
            >
              <List size={18} />
            </button>
          </div>

          {/* Grid Size Control (Only in Grid Mode) */}
          {viewMode === "grid" && (
            <div className="flex bg-merlin-900/50 rounded-lg p-1 border border-merlin-500/30">
              <button
                onClick={() => setGridSize("small")}
                className={`p-1.5 rounded-md transition-colors ${
                  gridSize === "small"
                    ? "bg-merlin-500 text-white"
                    : "hover:bg-merlin-500/20 text-merlin-100/70"
                }`}
                title="Small Grid"
              >
                <Grid3X3 size={18} />
              </button>
              <button
                onClick={() => setGridSize("medium")}
                className={`p-1.5 rounded-md transition-colors ${
                  gridSize === "medium"
                    ? "bg-merlin-500 text-white"
                    : "hover:bg-merlin-500/20 text-merlin-100/70"
                }`}
                title="Medium Grid"
              >
                <div className="w-[18px] text-center text-xs font-bold leading-none flex items-center justify-center">
                  M
                </div>
              </button>
              <button
                onClick={() => setGridSize("large")}
                className={`p-1.5 rounded-md transition-colors ${
                  gridSize === "large"
                    ? "bg-merlin-500 text-white"
                    : "hover:bg-merlin-500/20 text-merlin-100/70"
                }`}
                title="Large Grid"
              >
                <Maximize2 size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

      {viewMode === "grid" ? (
        <div className={`grid ${getGridCols()} gap-6`}>
          {filteredBooks.map((book) => (
            <div key={book.id} className="relative group">
              <BookCard
                book={book}
                onSelect={onSelectBook}
                onRemove={onRemoveBook}
                onToggleFavorite={handleToggleFavorite}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenTagEditor(book);
                }}
                className="absolute top-2 left-2 p-2 rounded-full bg-merlin-900/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-merlin-500 z-30"
                title="Edit Tags"
              >
                <Tag size={14} />
              </button>
            </div>
          ))}

          {/* Add Book Card */}
          {!searchQuery && !showFavoritesOnly && (
            <div
              className="flex flex-col items-center justify-center w-full aspect-[2/3] border-2 border-dashed border-merlin-500/30 rounded-lg hover:border-merlin-500 hover:bg-merlin-500/5 transition-all cursor-pointer text-merlin-500/50 hover:text-merlin-500"
              onClick={() => {
                // Trigger file input or drop zone hint
              }}
            >
              <Plus size={40} />
              <span className="mt-2 text-sm font-medium">Drag PDF Here</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filteredBooks.map((book) => (
            <div
              key={book.id}
              className="flex items-center gap-4 p-4 rounded-xl bg-merlin-900/40 border border-merlin-500/20 hover:border-merlin-500/50 hover:bg-merlin-900/60 transition-all group"
            >
              <div
                className="w-16 h-24 bg-merlin-950 rounded shadow-md flex-shrink-0 flex items-center justify-center cursor-pointer overflow-hidden border border-merlin-500/10"
                onClick={() => onSelectBook(book)}
              >
                {book.cover_image ? (
                  <img
                    src={book.cover_image}
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <BookIcon size={24} className="text-merlin-500/50" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3
                    className="text-lg font-bold truncate cursor-pointer hover:text-merlin-400 transition-colors"
                    onClick={() => onSelectBook(book)}
                  >
                    {book.title}
                  </h3>
                  {book.is_favorite && (
                    <Heart
                      size={14}
                      className="text-pink-500"
                      fill="currentColor"
                    />
                  )}
                </div>

                {book.author && (
                  <p className="text-sm text-merlin-100/70">{book.author}</p>
                )}

                <p className="text-xs text-merlin-100/50 truncate flex items-center gap-2 mt-1">
                  <FileText size={12} />
                  {book.filepath}
                </p>

                {book.tags && (
                  <div className="flex gap-2 mt-2">
                    {book.tags.split(",").map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] bg-merlin-900/80 border border-merlin-500/20 px-1.5 py-0.5 rounded text-merlin-100/70"
                      >
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-2 flex items-center gap-4 text-xs text-merlin-100/40">
                  <span>
                    Added: {new Date(book.added_at).toLocaleDateString()}
                  </span>
                  <span>•</span>
                  <span>
                    Progress:{" "}
                    {Math.round(
                      (book.last_read_page / (book.total_pages || 1)) * 100,
                    )}
                    %
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenTagEditor(book);
                  }}
                  className="p-2 rounded-lg bg-merlin-900/50 text-merlin-100/50 hover:bg-merlin-500/20 hover:text-merlin-100 transition-colors"
                  title="Edit Tags"
                >
                  <Tag size={20} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFavorite(book.id);
                  }}
                  className={`p-2 rounded-lg transition-colors ${book.is_favorite ? "bg-pink-500/20 text-pink-500" : "bg-merlin-900/50 text-merlin-100/50 hover:bg-pink-500/10 hover:text-pink-500"}`}
                  title={
                    book.is_favorite
                      ? "Remove from Favorites"
                      : "Add to Favorites"
                  }
                >
                  <Heart
                    size={20}
                    fill={book.is_favorite ? "currentColor" : "none"}
                  />
                </button>
                <button
                  onClick={() => onSelectBook(book)}
                  className="px-4 py-2 rounded-lg bg-merlin-500 text-white font-medium hover:bg-merlin-400 transition-colors text-sm"
                >
                  Read
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveBook(book.id);
                  }}
                  className="p-2 rounded-lg hover:bg-red-500/20 text-merlin-100/50 hover:text-red-400 transition-colors"
                  title="Remove Book"
                >
                  <span className="text-xl leading-none">×</span>
                </button>
              </div>
            </div>
          ))}
          {!searchQuery && !showFavoritesOnly && (
            <div className="p-8 border-2 border-dashed border-merlin-500/30 rounded-xl flex items-center justify-center gap-4 text-merlin-500/50">
              <Plus size={24} />
              <span>Drag PDF anywhere to add</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
