import { Document, Packer, Paragraph, ImageRun } from 'docx'

export async function makeDocxFromImages(pages: Array<{ name: string, blob: Blob }>): Promise<Blob> {
  const sections = await Promise.all(pages.map(async p => {
    const buf = await p.blob.arrayBuffer()
    const para = new Paragraph({
      children: [new ImageRun({ data: buf })]
    })
    return { children: [para] }
  }))

  const doc = new Document({ sections })
  return await Packer.toBlob(doc)
}