import TurndownService from "turndown";
import DOMPurify from "isomorphic-dompurify";
import he from "he";

const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  emDelimiter: "*", // Use * for emphasis (italic) to match standard markdown
  // Contenteditable Shift+Enter / Enter inserts <br>. Use plain newlines —
  // CommonMark hard breaks ("  \n" / "\\\n") are wrong for WhatsApp chat.
  br: "",
});

// Keep literal WhatsApp markers (*bold*, _italic_, etc.). Default escape()
// turns "*6300" into "\*6300", which is what the contact sees.
turndownService.escape = (string) => string;

// Contenteditable wraps each line in a <div>. Turndown's default block rule
// emits paragraph breaks ("\n\n"); chat lines should be single newlines.
turndownService.addRule("contentEditableLine", {
  filter: "div",
  replacement(content, node) {
    const text = content.replace(/^\n+|\n+$/g, "");
    // Empty line (e.g. <div><br></div>). Use "\n\n" so turndown's join()
    // keeps a blank line instead of collapsing with the next prefix "\n".
    if (!text) {
      return "\n\n";
    }
    const prefix = node.previousSibling ? "\n" : "";
    return prefix + text;
  },
});

/**
 * Sanitizes HTML to prevent XSS and converts it to Markdown.
 * Useful for converting contenteditable HTML input to safe Markdown for storage/sending.
 */
export function htmlToMarkdown(html: string): string {
  // 1. Decode HTML entities (e.g. &lt;h1&gt; -> <h1>)
  // This allows pasting HTML source code to be converted, and ensures we sanitize the actual tags.
  const decoded = he.decode(html);

  // 2. Sanitize HTML
  const cleanHtml = DOMPurify.sanitize(decoded);

  // 3. Convert to Markdown (plain newlines for line breaks — see br / div rules above)
  return turndownService.turndown(cleanHtml);
}
