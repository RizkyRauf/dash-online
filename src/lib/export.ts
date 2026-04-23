import type { MediaConfig } from '../types/database'

/**
 * Convert MediaConfig data to CSV format and trigger download.
 * JSON fields are stringified for CSV compatibility.
 */
export function exportToCsv(data: MediaConfig[], filename?: string) {
  if (data.length === 0) return

  // Define columns to export
  const columns: (keyof MediaConfig)[] = [
    'id', 'page', 'media_id', 'media_name',
    'is_active', 'is_premium', 'use_cache',
    'created_at', 'updated_at',
    'config', 'index_content_link', 'index_pagination',
    'content_title', 'content_text', 'content_summary',
    'content_topic', 'content_journalist', 'content_editor',
    'content_published', 'content_image_url', 'content_image_caption',
    'content_video_url', 'content_url', 'paginated_links', 'content_pagination',
  ]

  // CSV header
  const headers = columns.join(',')

  // CSV rows
  const rows = data.map((item) =>
    columns.map((col) => {
      const value = item[col]
      // Handle null/undefined
      if (value === null || value === undefined) return ''
      // Handle objects (JSON fields) - stringify and escape
      if (typeof value === 'object') {
        // Escape quotes in JSON strings for CSV
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`
      }
      // Handle booleans
      if (typeof value === 'boolean') return value ? 'true' : 'false'
      // Handle strings with commas - wrap in quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return String(value)
    }).join(',')
  )

  const csv = [headers, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename || `media-configs-${new Date().toISOString().split('T')[0]}.csv`
  link.click()

  URL.revokeObjectURL(url)
}
