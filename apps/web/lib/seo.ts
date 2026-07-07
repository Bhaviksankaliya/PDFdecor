import { TOOLS, type Tool } from "@pdfforge/config";

/**
 * Canonical site origin. Override with NEXT_PUBLIC_SITE_URL when the custom
 * domain lands — every canonical URL, OG tag, sitemap entry, and JSON-LD
 * block derives from this single constant.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://pdfdecor.com"
).replace(/\/$/, "");

export const SITE_NAME = "PDFdecor";

export type ToolSeo = {
  /** <title> — front-loads the highest-volume keyword for the tool. */
  title: string;
  /** Meta description — 150-160 chars, keyword-rich, ends with a CTA. */
  description: string;
  /** Secondary keywords woven into meta + on-page copy. */
  keywords: string[];
  /** "How to" steps — rendered on-page and emitted as HowTo JSON-LD. */
  steps: string[];
  /** FAQs — rendered on-page and emitted as FAQPage JSON-LD. */
  faqs: { q: string; a: string }[];
};

/** Boilerplate answers shared by most tools (privacy / price / signup). */
const COMMON_FAQS = (what: string): { q: string; a: string }[] => [
  {
    q: `Is it free to ${what} online?`,
    a: `Yes. PDFdecor lets you ${what} completely free — no sign-up, no watermarks, and no software to install. It works in your browser on Windows, Mac, Linux, Android, and iPhone.`,
  },
  {
    q: "Are my files safe?",
    a: "Yes. Files are transferred over an encrypted connection and automatically deleted from our servers after 2 hours. Nobody can access your documents.",
  },
  {
    q: "Do I need to install any software?",
    a: `No. PDFdecor runs entirely online in your web browser, so you can ${what} without installing Adobe Acrobat or any other desktop software.`,
  },
];

/**
 * Hand-tuned SEO copy for the highest-traffic tools. Anything not listed
 * here falls back to a generated-but-still-solid template via getToolSeo().
 */
const TOOL_SEO: Record<string, Partial<ToolSeo>> = {
  "merge-pdf": {
    title: "Merge PDF Files Online Free — Combine PDF Documents",
    description:
      "Merge PDF files online for free. Combine multiple PDFs into one document in seconds — no sign-up, no watermark. Drag, drop, reorder, and download.",
    keywords: [
      "merge pdf", "combine pdf", "merge pdf files", "pdf merger",
      "join pdf", "merge pdf online free", "combine pdf files into one",
    ],
    steps: [
      "Upload two or more PDF files (up to 30 at once).",
      "Drag the thumbnails to put the files in the order you want.",
      "Click Merge and download your combined PDF instantly.",
    ],
    faqs: [
      {
        q: "How do I merge PDF files into one?",
        a: "Upload your PDFs to PDFdecor's free Merge PDF tool, drag them into the order you want, and click Merge. Your combined PDF downloads in seconds — no sign-up required.",
      },
      {
        q: "How many PDFs can I combine at once?",
        a: "You can combine up to 30 PDF files (100 MB each) in a single merge — enough for contracts, reports, scanned pages, and full document sets.",
      },
      ...COMMON_FAQS("merge PDF files"),
    ],
  },
  "split-pdf": {
    title: "Split PDF Online Free — Separate PDF Pages",
    description:
      "Split PDF files online for free. Extract page ranges, separate every page, or split every N pages — no sign-up, no watermark. Fast and private.",
    keywords: [
      "split pdf", "split pdf online", "separate pdf pages", "pdf splitter",
      "divide pdf", "split pdf into multiple files", "extract pages from pdf",
    ],
    steps: [
      "Upload the PDF you want to split.",
      "Choose page ranges, single pages, or split every N pages.",
      "Click Split and download your files as a ZIP.",
    ],
    faqs: [
      {
        q: "How do I split a PDF into separate pages?",
        a: "Upload your PDF, choose the 'individual pages' option, and click Split. PDFdecor turns every page into its own PDF and bundles them in a ZIP for download.",
      },
      ...COMMON_FAQS("split PDF files"),
    ],
  },
  "compress-pdf": {
    title: "Compress PDF Online Free — Reduce PDF File Size",
    description:
      "Compress PDF files online for free. Reduce PDF size for email and uploads while keeping quality — no sign-up, no watermark, works in your browser.",
    keywords: [
      "compress pdf", "reduce pdf size", "pdf compressor", "shrink pdf",
      "compress pdf online free", "make pdf smaller", "pdf size reducer",
    ],
    steps: [
      "Upload the PDF you want to compress.",
      "Pick a quality preset — smaller file or higher quality.",
      "Download your compressed PDF instantly.",
    ],
    faqs: [
      {
        q: "How do I reduce a PDF's file size?",
        a: "Upload your PDF to PDFdecor's free compressor, pick a quality preset, and download. We rebuild the file with optimized images so it's small enough for email, forms, and portals.",
      },
      {
        q: "Will compressing lower my PDF's quality?",
        a: "You control the trade-off with quality presets. The 'balanced' preset is usually visually identical while cutting size dramatically — and we never return a file bigger than the original.",
      },
      ...COMMON_FAQS("compress PDF files"),
    ],
  },
  "edit-pdf": {
    title: "Edit PDF Online Free — Free PDF Editor, No Sign-Up",
    description:
      "Edit PDF files online for free. Add text, images, and shapes to any PDF in your browser — no sign-up, no watermark, no Adobe needed. Try the free PDF editor.",
    keywords: [
      "edit pdf", "pdf editor", "edit pdf free", "edit pdf online",
      "free pdf editor", "pdf editor online free", "add text to pdf",
      "edit pdf without adobe", "online pdf editor free no sign up",
    ],
    steps: [
      "Upload the PDF you want to edit.",
      "Add text, images, and shapes directly onto the pages.",
      "Click Apply and download your edited PDF.",
    ],
    faqs: [
      {
        q: "How can I edit a PDF for free?",
        a: "Upload your PDF to PDFdecor's free online editor, add text, images, or shapes right on the page, then download the edited file. It's completely free — no sign-up, no watermark, no trial limits.",
      },
      {
        q: "Can I edit a PDF without Adobe Acrobat?",
        a: "Yes. PDFdecor's editor runs entirely in your web browser, so you can edit PDFs on any device without installing Adobe Acrobat or any other software.",
      },
      ...COMMON_FAQS("edit PDF files"),
    ],
  },
  "sign-pdf": {
    title: "Sign PDF Online Free — Add Signature to PDF",
    description:
      "Sign PDF documents online for free. Draw, type, or upload your signature and place it on any page — no sign-up, no watermark. Fast, private e-signing.",
    keywords: [
      "sign pdf", "pdf signature", "esign pdf", "sign pdf online free",
      "add signature to pdf", "electronic signature pdf", "signature maker",
    ],
    steps: [
      "Upload the PDF you need to sign.",
      "Draw, type, or upload an image of your signature.",
      "Drag it into place, apply, and download the signed PDF.",
    ],
    faqs: [
      {
        q: "How do I add a signature to a PDF?",
        a: "Upload your PDF, create a signature by drawing, typing, or uploading an image, then drag it exactly where it needs to go. Download the signed document in seconds — free.",
      },
      ...COMMON_FAQS("sign PDF documents"),
    ],
  },
  "rotate-pdf": {
    title: "Rotate PDF Online Free — Rotate PDF Pages Permanently",
    description:
      "Rotate PDF pages online for free. Fix sideways or upside-down pages permanently — all pages or just the ones you pick. No sign-up, no watermark.",
    keywords: [
      "rotate pdf", "rotate pdf pages", "rotate pdf online",
      "rotate pdf and save", "fix upside down pdf", "turn pdf pages",
    ],
    steps: [
      "Upload one or more PDFs (up to 30).",
      "Choose the rotation angle and which pages to rotate.",
      "Download your correctly-oriented PDF.",
    ],
    faqs: [
      {
        q: "How do I rotate a PDF and save it permanently?",
        a: "Unlike a PDF viewer's temporary rotate, PDFdecor rewrites the file — upload, pick an angle, download, and the pages stay rotated in every app, forever.",
      },
      ...COMMON_FAQS("rotate PDF pages"),
    ],
  },
  "jpg-to-pdf": {
    title: "JPG to PDF Converter Free — Convert Images to PDF Online",
    description:
      "Convert JPG to PDF online for free. Turn JPG and PNG images into a single PDF with page size, orientation, and margin options. No sign-up, no watermark.",
    keywords: [
      "jpg to pdf", "image to pdf", "convert jpg to pdf", "png to pdf",
      "photo to pdf", "jpg to pdf converter free", "pictures to pdf",
    ],
    steps: [
      "Upload your JPG or PNG images.",
      "Choose page size (A4, Letter, or fit), orientation, and margins.",
      "Click Convert and download your PDF.",
    ],
    faqs: [
      {
        q: "How do I convert JPG images to PDF?",
        a: "Upload your images to PDFdecor, arrange the order, pick a page size, and click Convert. All your photos become one clean PDF — free and watermark-free.",
      },
      ...COMMON_FAQS("convert images to PDF"),
    ],
  },
  "pdf-to-word": {
    title: "PDF to Word Converter Free — Convert PDF to DOCX Online",
    description:
      "Convert PDF to Word online for free. Extract your PDF's text into an editable DOCX document in seconds — no sign-up, no watermark, no email required.",
    keywords: [
      "pdf to word", "pdf to docx", "convert pdf to word free",
      "pdf to word converter", "pdf to editable word", "pdf converter",
    ],
    steps: [
      "Upload the PDF you want to convert.",
      "Click Convert — text is extracted into a Word document.",
      "Download your editable DOCX file.",
    ],
    faqs: [
      {
        q: "How do I convert a PDF to an editable Word document?",
        a: "Upload your PDF to PDFdecor's free converter and click Convert. You'll get a DOCX file with the document's text ready to edit in Microsoft Word or Google Docs.",
      },
      ...COMMON_FAQS("convert PDF to Word"),
    ],
  },
  "pdf-to-jpg": {
    title: "PDF to JPG Converter Free — Convert PDF Pages to Images",
    description:
      "Convert PDF to JPG online for free. Render every page as a high-quality image you can share anywhere — no sign-up, no watermark, instant download.",
    keywords: [
      "pdf to jpg", "pdf to image", "convert pdf to jpg", "pdf to png",
      "pdf pages to images", "pdf to jpg converter free",
    ],
    steps: [
      "Upload the PDF you want to convert.",
      "Every page is rendered as a high-quality JPG.",
      "Download your images individually or as a ZIP.",
    ],
    faqs: COMMON_FAQS("convert PDF to JPG"),
  },
  "watermark-pdf": {
    title: "Add Watermark to PDF Free — Text & Image Watermarks",
    description:
      "Watermark PDF files online for free. Stamp text or a logo over every page with full control of opacity, rotation, and position. No sign-up needed.",
    keywords: [
      "watermark pdf", "add watermark to pdf", "pdf watermark free",
      "stamp pdf", "add logo to pdf", "confidential watermark pdf",
    ],
    steps: [
      "Upload your PDF.",
      "Choose a text or image watermark and style it — opacity, angle, position, tiling.",
      "Apply and download your watermarked PDF.",
    ],
    faqs: COMMON_FAQS("watermark PDF files"),
  },
  "remove-pages": {
    title: "Delete Pages from PDF Free — Remove PDF Pages Online",
    description:
      "Remove pages from a PDF online for free. Select the pages you don't need and delete them in one click — no sign-up, no watermark, instant download.",
    keywords: [
      "delete pages from pdf", "remove pdf pages", "delete pdf pages free",
      "remove pages from pdf online", "pdf page remover",
    ],
    steps: [
      "Upload your PDF.",
      "Click the pages you want to delete.",
      "Apply and download the cleaned-up PDF.",
    ],
    faqs: COMMON_FAQS("delete pages from a PDF"),
  },
  "extract-pages": {
    title: "Extract Pages from PDF Free — Save PDF Pages Separately",
    description:
      "Extract pages from a PDF online for free. Keep only the pages you choose as a new PDF, or save each one separately. No sign-up, no watermark.",
    keywords: [
      "extract pages from pdf", "save one page of pdf", "pdf page extractor",
      "pull pages from pdf", "extract pdf pages online free",
    ],
    steps: [
      "Upload your PDF.",
      "Select the pages you want to keep.",
      "Download them as a new PDF or as separate files.",
    ],
    faqs: COMMON_FAQS("extract pages from a PDF"),
  },
  "organize-pdf": {
    title: "Organize PDF Pages Free — Reorder, Rotate & Delete Online",
    description:
      "Organize PDF pages online for free. Drag pages into a new order, rotate them, and delete extras in one visual editor. No sign-up, no watermark.",
    keywords: [
      "organize pdf", "reorder pdf pages", "rearrange pdf pages",
      "move pdf pages", "change pdf page order online free",
    ],
    steps: [
      "Upload your PDF to see every page as a thumbnail.",
      "Drag pages to reorder, rotate them, or remove them.",
      "Apply and download your reorganized PDF.",
    ],
    faqs: COMMON_FAQS("organize PDF pages"),
  },
  "crop-pdf": {
    title: "Crop PDF Online Free — Trim PDF Margins & Pages",
    description:
      "Crop PDF pages online for free. Trim margins or crop to any region on one page or all pages — no sign-up, no watermark, instant results.",
    keywords: [
      "crop pdf", "trim pdf margins", "crop pdf pages", "cut pdf page",
      "crop pdf online free", "resize pdf page",
    ],
    steps: [
      "Upload your PDF.",
      "Draw the crop box over the area you want to keep.",
      "Apply to one page or all pages, then download.",
    ],
    faqs: COMMON_FAQS("crop PDF pages"),
  },
  "page-numbers": {
    title: "Add Page Numbers to PDF Free — Number PDF Pages Online",
    description:
      "Add page numbers to a PDF online for free. Choose position, format, font size, and starting number — no sign-up, no watermark, instant download.",
    keywords: [
      "add page numbers to pdf", "number pdf pages", "pdf page numbers free",
      "insert page numbers pdf online",
    ],
    steps: [
      "Upload your PDF.",
      "Pick the position, format, size, and starting number.",
      "Apply and download your numbered PDF.",
    ],
    faqs: COMMON_FAQS("add page numbers to a PDF"),
  },
  "scan-to-pdf": {
    title: "Scan to PDF Free — Turn Photos & Scans into PDF Online",
    description:
      "Scan documents to PDF online for free. Capture from your camera or upload photos and build a clean multi-page PDF — no app install, no sign-up.",
    keywords: [
      "scan to pdf", "camera to pdf", "photo scanner pdf",
      "scan documents to pdf free", "mobile scan to pdf online",
    ],
    steps: [
      "Capture pages with your camera or upload photos.",
      "Arrange the pages and pick a page size.",
      "Download your scanned document as a PDF.",
    ],
    faqs: COMMON_FAQS("scan documents to PDF"),
  },
};

/** Template fallback so every tool page ships decent SEO even without hand-tuned copy. */
export function getToolSeo(tool: Tool): ToolSeo {
  const hand = TOOL_SEO[tool.slug] ?? {};
  const what = tool.title.toLowerCase();
  return {
    title: hand.title ?? `${tool.title} Online Free — Fast & Private`,
    description:
      hand.description ??
      `${tool.description} Free online ${what} tool — no sign-up, no watermark, files auto-deleted after 2 hours.`,
    keywords:
      hand.keywords ??
      [what, `${what} online`, `${what} free`, `${what} online free`, "pdf tool"],
    steps:
      hand.steps ??
      [
        `Upload your file${tool.multiple ? "s" : ""} to the ${tool.title} tool.`,
        "Adjust the options to fit what you need.",
        "Download your result instantly.",
      ],
    faqs: hand.faqs ?? COMMON_FAQS(what),
  };
}

/** All tool slugs that should appear in the sitemap (implemented = indexable priority). */
export function sitemapTools() {
  return TOOLS.map((t) => ({
    slug: t.slug,
    priority: t.implemented ? 0.9 : 0.5,
  }));
}
