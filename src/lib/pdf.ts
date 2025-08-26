import { PDFDocument } from 'pdf-lib'
import * as pdfjs from 'pdfjs-dist'
// @ts-ignore - Vite URL import for worker
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.js?url'

;(pdfjs as any).GlobalWorkerOptions.workerSrc = workerSrc

export async function mergePdfs(files: File[], onProgress?: (p: number) => void): Promise<Blob> {
  const outPdf = await PDFDocument.create()
  let processed = 0

  for (const f of files) {
    const bytes = new Uint8Array(await f.arrayBuffer())
    const src = await PDFDocument.load(bytes)
    const pages = await outPdf.copyPages(src, src.getPageIndices())
    pages.forEach(p => outPdf.addPage(p))
    processed++
    onProgress?.(Math.round((processed / files.length) * 100))
    await delay(0)
  }
  const out = await outPdf.save()
  return new Blob([out], { type: 'application/pdf' })
}

export async function splitPdfByRanges(file: File, ranges: Array<{ start: number, end: number }>, onProgress?: (p: number) => void): Promise<Array<{ name: string, blob: Blob }>> {
  const base = await PDFDocument.load(await file.arrayBuffer())
  const results: Array<{ name: string, blob: Blob }> = []
  let processed = 0
  for (let i = 0; i < ranges.length; i++) {
    const { start, end } = ranges[i]
    const indices = rangeToIndices(start, end, base.getPageCount())
    const out = await PDFDocument.create()
    const pages = await out.copyPages(base, indices)
    pages.forEach(p => out.addPage(p))
    const bytes = await out.save()
    results.push({ name: `${stripExt(file.name)}_${i + 1}.pdf`, blob: new Blob([bytes], { type: 'application/pdf' }) })
    processed++
    onProgress?.(Math.round((processed / ranges.length) * 100))
    await delay(0)
  }
  return results
}

export async function splitPdfByBookmarks(file: File, onProgress?: (p: number) => void): Promise<Array<{ name: string, blob: Blob }>> {
  const data = new Uint8Array(await file.arrayBuffer())
  const loadingTask = pdfjs.getDocument({ data })
  const doc = await loadingTask.promise
  const outline = await doc.getOutline()
  const pageCount = doc.numPages

  if (!outline || outline.length === 0) {
    return [{ name: file.name, blob: new Blob([data], { type: 'application/pdf' }) }]
  }

  const starts: Array<{ title: string, pageIndex: number }> = []
  for (const item of outline) {
    const dest = item.dest
    if (!dest) continue
    const explicitDest = typeof dest === 'string' ? await doc.getDestination(dest) : dest
    if (Array.isArray(explicitDest) && explicitDest[0]) {
      const pageRef = explicitDest[0] as any
      const pageIndex = await doc.getPageIndex(pageRef)
      starts.push({ title: sanitize(item.title || 'Section'), pageIndex })
    }
  }
  starts.sort((a, b) => a.pageIndex - b.pageIndex)
  if (starts.length === 0) {
    return [{ name: file.name, blob: new Blob([data], { type: 'application/pdf' }) }]
  }

  const base = await PDFDocument.load(data)
  const results: Array<{ name: string, blob: Blob }> = []
  for (let i = 0; i < starts.length; i++) {
    const s = starts[i]
    const endIndexExclusive = (i + 1 < starts.length) ? starts[i + 1].pageIndex : pageCount
    const indices = rangeToIndices(s.pageIndex + 1, endIndexExclusive, pageCount)
    const out = await PDFDocument.create()
    const pages = await out.copyPages(base, indices)
    pages.forEach(p => out.addPage(p))
    const bytes = await out.save()
    results.push({ name: `${stripExt(file.name)}_${s.title}.pdf`, blob: new Blob([bytes], { type: 'application/pdf' }) })
    onProgress?.(Math.round(((i + 1) / starts.length) * 100))
    await delay(0)
  }
  return results
}

export async function jpgsToPdf(files: File[], onProgress?: (p: number) => void): Promise<Blob> {
  const pdfDoc = await PDFDocument.create()
  let processed = 0
  for (const f of files) {
    const imgBytes = new Uint8Array(await f.arrayBuffer())
    let img
    if (f.type === 'image/jpeg') {
      img = await pdfDoc.embedJpg(imgBytes)
    } else if (f.type === 'image/png') {
      img = await pdfDoc.embedPng(imgBytes)
    } else {
      const lower = f.name.toLowerCase()
      if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
        img = await pdfDoc.embedJpg(imgBytes)
      } else if (lower.endsWith('.png')) {
        img = await pdfDoc.embedPng(imgBytes)
      } else {
        throw new Error(`Unsupported image type for ${f.name}`)
      }
    }
    const page = pdfDoc.addPage([img.width, img.height])
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height })
    processed++
    onProgress?.(Math.round((processed / files.length) * 100))
    await delay(0)
  }
  const bytes = await pdfDoc.save()
  return new Blob([bytes], { type: 'application/pdf' })
}

export async function pdfToJpgs(file: File, onProgress?: (p: number) => void): Promise<Array<{ name: string, blob: Blob }>> {
  const data = new Uint8Array(await file.arrayBuffer())
  const loadingTask = pdfjs.getDocument({ data })
  const doc = await loadingTask.promise
  const outputs: Array<{ name: string, blob: Blob }> = []
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { alpha: false })

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const viewport = page.getViewport({ scale: 2 })
    canvas.width = viewport.width
    canvas.height = viewport.height
    if (!ctx) throw new Error('Canvas 2D context not available')
    await page.render({ canvasContext: ctx, viewport }).promise
    const blob = await new Promise<Blob>((resolve) => canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.92))
    outputs.push({ name: `${stripExt(file.name)}_page_${i}.jpg`, blob })
    onProgress?.(Math.round((i / doc.numPages) * 100))
    await delay(0)
  }
  return outputs
}

export async function pdfToDocxImageBased(file: File, onProgress?: (p: number) => void): Promise<Blob> {
  const pages = await pdfToJpgs(file, (p) => onProgress?.(Math.min(p, 90)))
  const { Document, Packer, Paragraph, ImageRun, PageOrientation } = await import('docx')

  // Preload image buffers for docx
  const buffers = await Promise.all(pages.map(p => p.blob.arrayBuffer()))

  const doc = new Document({
    sections: buffers.map((buf) => ({
      properties: { page: { size: { orientation: PageOrientation.PORTRAIT } } },
      children: [
        new Paragraph({
          children: [
            new ImageRun({
              data: buf,
              transformation: { width: 612, height: 792 }
            })
          ]
        })
      ]
    }))
  })
  onProgress?.(95)
  const buffer = await Packer.toBlob(doc)
  onProgress?.(100)
  return buffer
}

// Helpers
function stripExt(name: string) {
  const idx = name.lastIndexOf('.')
  return idx > 0 ? name.slice(0, idx) : name
}
function sanitize(s: string) {
  return s.replace(/[^\w\-]+/g, '_').slice(0, 50)
}
function rangeToIndices(start1: number, end1: number, total: number): number[] {
  const s = Math.max(1, Math.min(start1, total))
  const e = Math.max(1, Math.min(end1, total))
  const res: number[] = []
  for (let i = Math.min(s, e); i <= Math.max(s, e); i++) {
    res.push(i - 1)
  }
  return res
}
function delay(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms))
}