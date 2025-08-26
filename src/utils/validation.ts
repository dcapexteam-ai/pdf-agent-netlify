export const MAX_FILES = 20
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024 // 50MB

export function validateFiles(files: File[]): string[] {
  const errors: string[] = []
  if (files.length === 0) {
    errors.push('Please add at least one file.')
  }
  if (files.length > MAX_FILES) {
    errors.push(`You can upload up to ${MAX_FILES} files at a time.`)
  }
  for (const f of files) {
    if (f.size > MAX_FILE_SIZE_BYTES) {
      errors.push(`"${f.name}" exceeds 50MB.`)
    }
  }
  return errors
}

export function isPdf(file: File) {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

export function isJpg(file: File) {
  const n = file.name.toLowerCase()
  return file.type === 'image/jpeg' || n.endsWith('.jpg') || n.endsWith('.jpeg')
}

export function ensureAllPdfs(files: File[]): string[] {
  const notPdf = files.filter(f => !isPdf(f)).map(f => f.name)
  return notPdf.length ? [`These files are not PDFs: ${notPdf.join(', ')}`] : []
}

export function ensureAllJpgs(files: File[]): string[] {
  const notJpg = files.filter(f => !isJpg(f)).map(f => f.name)
  return notJpg.length ? [`These files are not JPG images: ${notJpg.join(', ')}`] : []
}