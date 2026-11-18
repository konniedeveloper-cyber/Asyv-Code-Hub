function neutralizeStyle(css: string): string {
  return css.replace(/<\/style/gi, "<\\/style");
}

function neutralizeScript(js: string): string {
  return js.replace(/<\/script/gi, "<\\/script");
}

export function buildPreviewDocument(
  html: string,
  css: string,
  js: string
): string {
  const styleTag = css.trim()
    ? `<style>${neutralizeStyle(css)}</style>`
    : "";
  const scriptTag = js.trim()
    ? `<script>${neutralizeScript(js)}</script>`
    : "";
  const trimmed = html.trim();
  const isDocument = /<\s*(!doctype|html|head|body)\b/i.test(trimmed);

  if (!isDocument) {
    return `<!DOCTYPE html><html><head><meta charset="utf-8">${styleTag}</head><body>${trimmed}${scriptTag}</body></html>`;
  }

  let documentHtml = trimmed;

  if (styleTag) {
    if (/<\/head>/i.test(documentHtml)) {
      documentHtml = documentHtml.replace(/<\/head>/i, `${styleTag}</head>`);
    } else if (/<head[^>]*>/i.test(documentHtml)) {
      documentHtml = documentHtml.replace(
        /<head[^>]*>/i,
        (match) => `${match}${styleTag}`
      );
    } else {
      documentHtml = `${styleTag}${documentHtml}`;
    }
  }

  if (scriptTag) {
    if (/<\/body>/i.test(documentHtml)) {
      documentHtml = documentHtml.replace(/<\/body>/i, `${scriptTag}</body>`);
    } else {
      documentHtml = `${documentHtml}${scriptTag}`;
    }
  }

  return documentHtml;
}
