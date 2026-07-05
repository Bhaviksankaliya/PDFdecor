# PDFForge API + workers image.
# Bundles every system binary the PDF tools shell out to.
FROM node:22-bookworm-slim

# ── System binaries used by the processing pipeline ──────────────
#   ghostscript    -> Compress PDF, PDF/A
#   qpdf           -> Unlock / Protect / Repair / linearize
#   libreoffice    -> Office <-> PDF conversions (headless soffice)
#   tesseract-ocr  -> OCR PDF (+ language packs)
#   poppler-utils  -> pdfinfo / pdftoppm helpers
RUN apt-get update && apt-get install -y --no-install-recommends \
      ghostscript \
      qpdf \
      libreoffice \
      tesseract-ocr \
      tesseract-ocr-eng \
      poppler-utils \
      fonts-dejavu \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
COPY packages ./packages
COPY apps/api ./apps/api
RUN npm install --omit=dev

ENV NODE_ENV=production
EXPOSE 3001
CMD ["npm", "run", "start", "-w", "@pdfforge/api"]
