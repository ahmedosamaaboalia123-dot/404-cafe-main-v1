const PRINTING_CLASS = "is-printing-document";

/**
 * Prints the document while flagging the print layer.
 *
 * The flag lets PrintDocument.css drop the app shell with `display:none`, which is
 * what removes the phantom pages: hidden-with-`visibility` content keeps its layout
 * box, so the browser still paginates the whole page behind the sheet.
 */
export function openPrintWindow() {
  const { body } = document;
  body.classList.add(PRINTING_CLASS);

  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    body.classList.remove(PRINTING_CLASS);
    window.removeEventListener("afterprint", release);
  };

  window.addEventListener("afterprint", release);
  try {
    window.print();
  } finally {
    release();
  }
}

export { PRINTING_CLASS };
