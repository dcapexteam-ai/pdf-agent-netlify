export type Operation =
  | 'merge'
  | 'split-ranges'
  | 'split-bookmarks'
  | 'pdf-to-jpg'
  | 'jpg-to-pdf'
  | 'pdf-to-docx'

export type Source = 'local' | 'onedrive' | 'sharepoint'

export type Progress = {
  message: string
  percent?: number // 0..100
}

export type OutputTarget = 'download' | 'email'

export type FileItem = {
  file: File
  id: string
}