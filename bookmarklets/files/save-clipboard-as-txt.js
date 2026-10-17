/**
 * @name Save clipboard as .txt
 * @category files
 * @description Download the clipboard text as a plain text file.
 * @tags clipboard, text, file
 * @added 2026-10-17
 * @featured false
 */
(function(){(async () => {
  try {
    // 1. Read text from the user's clipboard.
    const text = await navigator.clipboard.readText();

    // 2. Create a Blob (a file-like object) from the clipboard text.
    const blob = new Blob([text], {
      type: 'text/plain'
    });

    // 3. Create a temporary URL that points to the Blob in memory.
    const url = URL.createObjectURL(blob);

    // 4. Create a hidden anchor element to act as a download link.
    const link = document.createElement('a');
    link.href = url;
    link.download = 'clipboard.txt'; // The default filename for the download.

    // 5. Add the link to the page, click it to trigger the download, and then remove it.
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 6. Clean up by revoking the temporary URL.
    URL.revokeObjectURL(url);

  } catch (err) {
    // Alert the user if clipboard access fails.
    alert('Failed to read clipboard. Please grant permission and ensure you are on a secure (HTTPS) page.');
    console.error('Bookmarklet error:', err);
  }
})();
})();
