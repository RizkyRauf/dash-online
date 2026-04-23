/**
 * Database types for the media_configs table.
 *
 * Each JSONB field stores a RulesArray:
 * [                                      // RuleSet[] (OR between sets)
 *   [                                    // RuleSet (AND within set)
 *     { "type": "xpath", "value": "...", "action": "include" },
 *     { "type": "regex", "value": "...", "action": "exclude" }
 *   ]
 * ]
 */

export interface Rule {
  type: string
  value: string
  action: string
}

/** One rule-set (AND logic). */
export type RuleSet = Rule[]

/** JSONB column value: array of rule-sets (OR logic). */
export type JsonFieldData = RuleSet[] | null

export interface MediaConfig {
  id: number
  page: number
  media_id: string
  media_name: string
  config: JsonFieldData
  index_content_link: JsonFieldData
  index_pagination: JsonFieldData
  content_title: JsonFieldData
  content_text: JsonFieldData
  content_summary: JsonFieldData
  content_topic: JsonFieldData
  content_journalist: JsonFieldData
  content_editor: JsonFieldData
  content_published: JsonFieldData
  content_image_url: JsonFieldData
  content_image_caption: JsonFieldData
  content_video_url: JsonFieldData
  content_url: JsonFieldData
  paginated_links: JsonFieldData
  content_pagination: JsonFieldData
  is_active: boolean
  is_premium: boolean
  use_cache: boolean
  created_at: string
  updated_at: string
}

export type MediaConfigInsert = Omit<MediaConfig, 'id' | 'created_at' | 'updated_at'>
export type MediaConfigUpdate = Partial<Omit<MediaConfig, 'id' | 'created_at' | 'updated_at'>>
