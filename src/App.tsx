import { useEffect, useState } from "react";
import { CamelotLibrary } from "./components/CamelotLibrary";
import { ExcaliburReader } from "./components/ExcaliburReader";

function App() {
  const [view, setView] = useState<"library" | "reader">("library");
  const [currentBook, setCurrentBook] = useState<Book | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    loadLibrary();
  }, []);

  async function loadLibrary() {
    try {
      const library = await window.merlin.invoke("get-library");
      setBooks(library);
    } catch (e) {
      console.error("Failed to load library", e);
    }
  }

  // Reload library when we get focus or added books?
  // We can listen for messages if we wanted, or just reload on view change.
  // Ideally, after adding a book via drag n drop, we should reload.
  // The CamelotLibrary calls 'add-book', we should listen to something or just poll?
  // Let's add an IPC listener for 'library-updated' if we wanted, or just trigger reload manually.
  // But CamelotLibrary doesn't expose a callback for 'onBookAdded'.
  // We can simple modify CamelotLibrary to return the promise or just rely on IPC events.
  // For now I'll use a specific interval or event listener if the backend sent one.
  // Or I'll setup an event listener in the backend to notify frontend.
  // But simplifying: I'll just reload library every time I enter library view.

  useEffect(() => {
    if (view === "library") {
      loadLibrary();
      const interval = setInterval(loadLibrary, 2000); // Polling for dropped files updates
      return () => clearInterval(interval);
    }
  }, [view]);

  // Also listen for library updates from backend if I added that. I didn't.
  // Polling is fine for MVP.

  const handleSelectBook = (book: Book) => {
    setCurrentBook(book);
    setView("reader");
  };

  const handleRemoveBook = async (id: number) => {
    if (
      confirm("Are you sure you want to banish this tome from the library?")
    ) {
      await window.merlin.invoke("remove-book", id);
      loadLibrary();
    }
  };

  const handleAddFolder = async () => {
    const folder = await window.merlin.invoke("select-folder");
    if (folder) {
      // Scanning... we could show a spinner.
      // Backend 'scan-folder' waits until done.
      // It returns count.
      const count = await window.merlin.invoke("scan-folder", folder);
      alert(`Discovered ${count} tomes in the specified realm.`);
      loadLibrary();
    }
  };

  if (view === "reader" && currentBook) {
    return (
      <ExcaliburReader
        book={currentBook}
        onBack={() => {
          // Update local book state with latest progress before going back?
          // The reader updates DB. On going back, we reload library.
          loadLibrary();
          setView("library");
          setCurrentBook(null);
        }}
        isDarkMode={isDarkMode}
        toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
      />
    );
  }

  return (
    <CamelotLibrary
      books={books}
      onSelectBook={handleSelectBook}
      onRemoveBook={handleRemoveBook}
      onAddFolder={handleAddFolder}
    />
  );
}

export default App;
