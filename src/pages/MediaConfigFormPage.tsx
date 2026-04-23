import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { JsonFieldBuilder } from '../components/forms/JsonFieldBuilder'
import type { MediaConfig, MediaConfigInsert, JsonFieldData } from '../types/database'

/**
 * Normalize JSONB data from DB. Existing data might be:
 *  - null/undefined → null
 *  - {} (empty object, DB default) → null
 *  - old-format object (not an array) → null
 *  - valid array → keep as-is
 */
function normalizeJsonField(raw: unknown): JsonFieldData {
  if (raw === null || raw === undefined) return null
  if (Array.isArray(raw)) {
    // Validate it's an array of arrays (RuleSet[]), not a flat array of Rule objects
    // Empty array is valid
    if (raw.length === 0) return null
    if (raw.every((item) => Array.isArray(item))) {
      // Deep clone to avoid mutating the cached React Query data
      return JSON.parse(JSON.stringify(raw)) as JsonFieldData
    }
    // Flat array of objects (malformed) → treat as null
    return null
  }
  // Object or other type → null
  return null
}

export default function MediaConfigFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const navigate = useNavigate()
  const { addToast } = useToast()
  const queryClient = useQueryClient()

  // --- Basic fields ---
  const [page, setPage] = useState(1)
  const [mediaId, setMediaId] = useState('')
  const [mediaName, setMediaName] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [isPremium, setIsPremium] = useState(false)
  const [useCache, setUseCache] = useState(true)

  // --- JSONB rule fields (15 fields) ---
  const [config, setConfig] = useState<JsonFieldData>(null)
  const [indexContentLink, setIndexContentLink] = useState<JsonFieldData>(null)
  const [indexPagination, setIndexPagination] = useState<JsonFieldData>(null)
  const [contentTitle, setContentTitle] = useState<JsonFieldData>(null)
  const [contentText, setContentText] = useState<JsonFieldData>(null)
  const [contentSummary, setContentSummary] = useState<JsonFieldData>(null)
  const [contentTopic, setContentTopic] = useState<JsonFieldData>(null)
  const [contentJournalist, setContentJournalist] = useState<JsonFieldData>(null)
  const [contentEditor, setContentEditor] = useState<JsonFieldData>(null)
  const [contentPublished, setContentPublished] = useState<JsonFieldData>(null)
  const [contentImageUrl, setContentImageUrl] = useState<JsonFieldData>(null)
  const [contentImageCaption, setContentImageCaption] = useState<JsonFieldData>(null)
  const [contentVideoUrl, setContentVideoUrl] = useState<JsonFieldData>(null)
  const [contentUrl, setContentUrl] = useState<JsonFieldData>(null)
  const [paginatedLinks, setPaginatedLinks] = useState<JsonFieldData>(null)
  const [contentPagination, setContentPagination] = useState<JsonFieldData>(null)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  // --- Fetch existing data for edit mode ---
  const { data: existingData, isLoading: isLoadingData } = useQuery({
    queryKey: ['media-config', id],
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase.from('media_configs').select('*').eq('id', id).single()
      if (error) throw error
      return data as MediaConfig
    },
    enabled: isEdit,
  })

  // Populate form
  useEffect(() => {
    if (existingData && isEdit) {
      setPage(existingData.page)
      setMediaId(existingData.media_id)
      setMediaName(existingData.media_name)
      setIsActive(existingData.is_active)
      setIsPremium(existingData.is_premium)
      setUseCache(existingData.use_cache)
      
      const normalizedConfig = normalizeJsonField(existingData.config)
      const normalizedIndexContentLink = normalizeJsonField(existingData.index_content_link)
      const normalizedIndexPagination = normalizeJsonField(existingData.index_pagination)
      const normalizedContentTitle = normalizeJsonField(existingData.content_title)
      const normalizedContentText = normalizeJsonField(existingData.content_text)
      const normalizedContentSummary = normalizeJsonField(existingData.content_summary)
      const normalizedContentTopic = normalizeJsonField(existingData.content_topic)
      const normalizedContentJournalist = normalizeJsonField(existingData.content_journalist)
      const normalizedContentEditor = normalizeJsonField(existingData.content_editor)
      const normalizedContentPublished = normalizeJsonField(existingData.content_published)
      const normalizedContentImageUrl = normalizeJsonField(existingData.content_image_url)
      const normalizedContentImageCaption = normalizeJsonField(existingData.content_image_caption)
      const normalizedContentVideoUrl = normalizeJsonField(existingData.content_video_url)
      const normalizedContentUrl = normalizeJsonField(existingData.content_url)
      const normalizedPaginatedLinks = normalizeJsonField(existingData.paginated_links)
      const normalizedContentPagination = normalizeJsonField(existingData.content_pagination)
      
      setConfig(normalizedConfig)
      setIndexContentLink(normalizedIndexContentLink)
      setIndexPagination(normalizedIndexPagination)
      setContentTitle(normalizedContentTitle)
      setContentText(normalizedContentText)
      setContentSummary(normalizedContentSummary)
      setContentTopic(normalizedContentTopic)
      setContentJournalist(normalizedContentJournalist)
      setContentEditor(normalizedContentEditor)
      setContentPublished(normalizedContentPublished)
      setContentImageUrl(normalizedContentImageUrl)
      setContentImageCaption(normalizedContentImageCaption)
      setContentVideoUrl(normalizedContentVideoUrl)
      setContentUrl(normalizedContentUrl)
      setPaginatedLinks(normalizedPaginatedLinks)
      setContentPagination(normalizedContentPagination)
    }
  }, [existingData, isEdit])

  // --- Validation ---
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!mediaId.trim()) newErrors.mediaId = 'Media ID is required'
    if (!mediaName.trim()) newErrors.mediaName = 'Media Name is required'
    if (page < 1) newErrors.page = 'Page must be at least 1'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // --- Save ---
  const handleSave = async () => {
    if (!validate()) return

    setSaving(true)
    try {
      // Convert null JSONB fields to empty arrays to satisfy NOT NULL constraints
      const sanitizeJsonField = (field: JsonFieldData): JsonFieldData => {
        return field === null ? [] : field
      }

      const payload: MediaConfigInsert = {
        page,
        media_id: mediaId.trim(),
        media_name: mediaName.trim(),
        is_active: isActive,
        is_premium: isPremium,
        use_cache: useCache,
        config: sanitizeJsonField(config),
        index_content_link: sanitizeJsonField(indexContentLink),
        index_pagination: sanitizeJsonField(indexPagination),
        content_title: sanitizeJsonField(contentTitle),
        content_text: sanitizeJsonField(contentText),
        content_summary: sanitizeJsonField(contentSummary),
        content_topic: sanitizeJsonField(contentTopic),
        content_journalist: sanitizeJsonField(contentJournalist),
        content_editor: sanitizeJsonField(contentEditor),
        content_published: sanitizeJsonField(contentPublished),
        content_image_url: sanitizeJsonField(contentImageUrl),
        content_image_caption: sanitizeJsonField(contentImageCaption),
        content_video_url: sanitizeJsonField(contentVideoUrl),
        content_url: sanitizeJsonField(contentUrl),
        paginated_links: sanitizeJsonField(paginatedLinks),
        content_pagination: sanitizeJsonField(contentPagination),
      }

      if (isEdit && id) {
        const { error } = await supabase.from('media_configs').update(payload).eq('id', parseInt(id, 10))
        if (error) throw error
        addToast({ title: 'Updated', description: `${mediaName} has been updated`, type: 'success' })
      } else {
        const { error } = await supabase.from('media_configs').insert(payload)
        if (error) throw error
        addToast({ title: 'Created', description: `${mediaName} has been created`, type: 'success' })
      }

      // Aggressively invalidate all related queries
      await queryClient.invalidateQueries({ queryKey: ['media-configs'] })
      await queryClient.invalidateQueries({ queryKey: ['media-configs-count'] })
      await queryClient.invalidateQueries({ queryKey: ['media-config', id] })
      await queryClient.refetchQueries({ queryKey: ['media-config', id] })
      
      navigate('/dashboard')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      if (message.includes('unique') || message.includes('duplicate')) {
        setErrors({ mediaId: 'This Media ID already exists' })
        addToast({ title: 'Error', description: 'Media ID must be unique', type: 'error' })
      } else {
        addToast({ title: 'Error', description: message, type: 'error' })
      }
    } finally {
      setSaving(false)
    }
  }

  if (isEdit && isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/dashboard')} className="text-muted-foreground hover:text-foreground">
                ← Back
              </button>
            </div>
            <h1 className="text-lg font-semibold text-foreground">
              {isEdit ? 'Edit Media Config' : 'New Media Config'}
            </h1>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate('/dashboard')}>
                Cancel
              </Button>
              <Button onClick={handleSave} loading={saving}>
                {isEdit ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* Basic Info */}
          <Section title="Basic Information" defaultOpen>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Page"
                type="number"
                value={page}
                onChange={(e) => setPage(parseInt(e.target.value, 10) || 1)}
                error={errors.page}
                min={1}
              />
              <Input
                label="Media ID"
                value={mediaId}
                onChange={(e) => setMediaId(e.target.value)}
                placeholder="unique-media-id"
                error={errors.mediaId}
                disabled={isEdit}
              />
              <Input
                label="Media Name"
                value={mediaName}
                onChange={(e) => setMediaName(e.target.value)}
                placeholder="Media Name"
                error={errors.mediaName}
              />
            </div>
            <div className="flex flex-wrap gap-6 mt-4">
              <Toggle label="Is Active" checked={isActive} onChange={setIsActive} />
              <Toggle label="Is Premium" checked={isPremium} onChange={setIsPremium} />
              <Toggle label="Use Cache" checked={useCache} onChange={setUseCache} />
            </div>
          </Section>

          {/* Index Configuration */}
          <Section title="Index Configuration">
            <JsonFieldBuilder
              label="Config"
              value={config}
              onChange={setConfig}
              description="Main scraping configuration rules"
            />
            <div className="mt-4" />
            <JsonFieldBuilder
              label="Index Content Link"
              value={indexContentLink}
              onChange={setIndexContentLink}
              description="Rules for extracting article links from index page"
            />
            <div className="mt-4" />
            <JsonFieldBuilder
              label="Index Pagination"
              value={indexPagination}
              onChange={setIndexPagination}
              description="Rules for navigating index pagination"
            />
          </Section>

          {/* Content Selectors */}
          <Section title="Content Selectors">
            <JsonFieldBuilder
              label="Content Title"
              value={contentTitle}
              onChange={setContentTitle}
              description="Rules for extracting article title"
            />
            <div className="mt-4" />
            <JsonFieldBuilder
              label="Content Text"
              value={contentText}
              onChange={setContentText}
              description="Rules for extracting article body text"
            />
            <div className="mt-4" />
            <JsonFieldBuilder
              label="Content Summary"
              value={contentSummary}
              onChange={setContentSummary}
              description="Rules for extracting article summary/excerpt"
            />
            <div className="mt-4" />
            <JsonFieldBuilder
              label="Content Topic"
              value={contentTopic}
              onChange={setContentTopic}
              description="Rules for extracting article topic/category"
            />
          </Section>

          {/* Content Metadata */}
          <Section title="Content Metadata">
            <JsonFieldBuilder
              label="Content Journalist"
              value={contentJournalist}
              onChange={setContentJournalist}
              description="Rules for extracting journalist/author name"
            />
            <div className="mt-4" />
            <JsonFieldBuilder
              label="Content Editor"
              value={contentEditor}
              onChange={setContentEditor}
              description="Rules for extracting editor name"
            />
            <div className="mt-4" />
            <JsonFieldBuilder
              label="Content Published"
              value={contentPublished}
              onChange={setContentPublished}
              description="Rules for extracting publish date"
            />
          </Section>

          {/* Media & Links */}
          <Section title="Media & Links">
            <JsonFieldBuilder
              label="Content Image URL"
              value={contentImageUrl}
              onChange={setContentImageUrl}
              description="Rules for extracting main article image URL"
            />
            <div className="mt-4" />
            <JsonFieldBuilder
              label="Content Image Caption"
              value={contentImageCaption}
              onChange={setContentImageCaption}
              description="Rules for extracting image caption"
            />
            <div className="mt-4" />
            <JsonFieldBuilder
              label="Content Video URL"
              value={contentVideoUrl}
              onChange={setContentVideoUrl}
              description="Rules for extracting embedded video URL"
            />
            <div className="mt-4" />
            <JsonFieldBuilder
              label="Content URL"
              value={contentUrl}
              onChange={setContentUrl}
              description="Rules for extracting canonical/permalink URL"
            />
          </Section>

          {/* Pagination & Links */}
          <Section title="Pagination & Links">
            <JsonFieldBuilder
              label="Paginated Links"
              value={paginatedLinks}
              onChange={setPaginatedLinks}
              description="Rules for additional paginated links"
            />
            <div className="mt-4" />
            <JsonFieldBuilder
              label="Content Pagination"
              value={contentPagination}
              onChange={setContentPagination}
              description="Rules for handling multi-page articles"
            />
          </Section>

          {/* Bottom actions */}
          <div className="flex justify-end gap-3 pt-4 pb-8 sticky bottom-0 bg-muted/30 -mx-4 px-4 sm:mx-0 sm:px-0 sm:bg-transparent sm:static sm:pb-0">
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving} size="lg">
              {isEdit ? 'Update Changes' : 'Create Media Config'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}

// ---------- Section (collapsible) ----------

function Section({
  title,
  defaultOpen = false,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(!defaultOpen)

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors text-left"
      >
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <span
          className="text-muted-foreground transition-transform duration-200"
          style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}
        >
          ▼
        </span>
      </button>
      {!collapsed && <div className="px-6 pb-6 space-y-4 border-t border-border pt-4">{children}</div>}
    </div>
  )
}

// ---------- Toggle ----------

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div
        className={`relative w-10 h-6 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-input'}`}
        onClick={() => onChange(!checked)}
      >
        <div
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`}
        />
      </div>
      <span className="text-sm text-foreground">{label}</span>
    </label>
  )
}
