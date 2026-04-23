import { useCallback } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'

/**
 * JsonFieldBuilder — Rule-based JSON field editor.
 *
 * Output structure per JSONB column — a RulesArray:
 * [                                          // RuleSet[]
 *   [                                        // RuleSet 1 (OR between sets)
 *     { "type": "xpath", "value": "//h1", "action": "include" },  // AND within set
 *     { "type": "regex", "value": ".*", "action": "exclude" }
 *   ],
 *   [                                        // RuleSet 2
 *     { "type": "css", "value": ".title", "action": "include" }
 *   ]
 * ]
 */

// ---------- Types ----------

export interface Rule {
  type: string
  value: string
  action: string
}

/** One rule-set (AND logic between its rules). */
export type RuleSet = Rule[]

/** The JSONB column value: array of rule-sets (OR logic between sets). */
export type JsonFieldData = RuleSet[] | null

// ---------- Props ----------

interface JsonFieldBuilderProps {
  label: string
  value: JsonFieldData
  onChange: (value: JsonFieldData) => void
  description?: string
}

// ---------- Options ----------

const TYPE_OPTIONS = [
  { value: 'xpath', label: 'XPath' },
  { value: 'css', label: 'CSS Selector' },
  { value: 'regex', label: 'Regex' },
  { value: 'jsonpath', label: 'JSONPath' },
  { value: 'string', label: 'String' },
  { value: 'expand', label: 'Expand' },
]

const ACTION_OPTIONS = [
  { value: 'include', label: 'Include' },
  { value: 'exclude', label: 'Exclude' },
]

// ---------- Helpers ----------

function emptyRuleSet(): RuleSet {
  return [{ type: 'xpath', value: '', action: 'include' }]
}

function emptyFieldData(): JsonFieldData {
  return [emptyRuleSet()]
}

/** Deep clone to avoid React mutation bugs. */
function clone<T>(data: T): T {
  return JSON.parse(JSON.stringify(data))
}

// ---------- Component ----------

export function JsonFieldBuilder({
  label,
  value,
  onChange,
  description,
}: JsonFieldBuilderProps) {
  // Guard against non-array data (old format objects, {} default, etc.)
  const enabled = Array.isArray(value) && value.length > 0

  const handleEnable = useCallback(() => {
    onChange(emptyFieldData())
  }, [onChange, label])

  const handleDisable = useCallback(() => {
    onChange(null)
  }, [onChange, label])

  // ---- Mutations — deep clone first ----

  const addRuleSet = () => {
    if (!value) return
    const next = clone(value)
    next.push(emptyRuleSet())
    onChange(next)
  }

  const removeRuleSet = (setIdx: number) => {
    if (!value) return
    const next = clone(value)
    next.splice(setIdx, 1)
    if (next.length === 0) {
      onChange(emptyFieldData())
    } else {
      onChange(next)
    }
  }

  const addRuleToSet = (setIdx: number) => {
    if (!value) return
    const next = clone(value)
    next[setIdx].push({ type: 'xpath', value: '', action: 'include' })
    onChange(next)
  }

  const removeRuleFromSet = (setIdx: number, ruleIdx: number) => {
    if (!value) return
    const next = clone(value)
    next[setIdx].splice(ruleIdx, 1)
    // If rule-set becomes empty, remove it
    if (next[setIdx] && next[setIdx].length === 0) {
      next.splice(setIdx, 1)
    }
    if (next.length === 0) {
      onChange(emptyFieldData())
    } else {
      onChange(next)
    }
  }

  const updateRule = (
    setIdx: number,
    ruleIdx: number,
    field: keyof Rule,
    val: string
  ) => {
    if (!value) return
    const next = clone(value)
    next[setIdx][ruleIdx][field] = val
    onChange(next)
  }

  if (!enabled) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-foreground">{label}</span>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleEnable} type="button">
            + Add Rules
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 p-4 border border-border rounded-md bg-muted/20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold text-foreground">{label}</span>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={handleDisable} type="button" className="text-muted-foreground">
          ✕ Clear
        </Button>
      </div>

      {/* Rule Sets */}
      {value.map((ruleSet, setIdx) => (
        <div key={setIdx} className="space-y-2 p-3 bg-background rounded-md border border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Rule Set {setIdx + 1}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => addRuleToSet(setIdx)}
                type="button"
                className="text-xs"
              >
                + Rule
              </Button>
              {value.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRuleSet(setIdx)}
                  className="text-xs text-destructive hover:text-destructive/80"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Individual Rules */}
          {ruleSet.map((rule, ruleIdx) => (
            <RuleRow
              key={ruleIdx}
              rule={rule}
              onUpdate={(f, v) => updateRule(setIdx, ruleIdx, f, v)}
              onRemove={() => removeRuleFromSet(setIdx, ruleIdx)}
            />
          ))}
        </div>
      ))}

      {/* Add Rule Set */}
      <Button
        variant="outline"
        size="sm"
        onClick={addRuleSet}
        type="button"
        className="w-full text-xs"
      >
        + Add Rule Set
      </Button>
    </div>
  )
}

// ---------- Single Rule Row ----------

function RuleRow({
  rule,
  onUpdate,
  onRemove,
}: {
  rule: Rule
  onUpdate: (field: keyof Rule, val: string) => void
  onRemove: () => void
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 items-end">
      {/* Type */}
      <div className="flex-1 w-full space-y-1">
        <label className="block text-xs font-medium text-muted-foreground">Type</label>
        <select
          value={rule.type}
          onChange={(e) => onUpdate('type', e.target.value)}
          className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Value */}
      <div className="flex-[3] w-full space-y-1">
        <label className="block text-xs font-medium text-muted-foreground">Value</label>
        <Input
          value={rule.value}
          onChange={(e) => onUpdate('value', e.target.value)}
          placeholder={
            rule.type === 'xpath' ? '//div[@class="article"]/a/@href' :
            rule.type === 'regex' ? '(https?://.*)' :
            rule.type === 'css' ? 'a.article-link' :
            'value'
          }
        />
      </div>

      {/* Action */}
      <div className="flex-1 w-full space-y-1">
        <label className="block text-xs font-medium text-muted-foreground">Action</label>
        <select
          value={rule.action}
          onChange={(e) => onUpdate('action', e.target.value)}
          className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {ACTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        className="text-destructive hover:text-destructive/80 pb-2"
        title="Remove rule"
      >
        ✕
      </button>
    </div>
  )
}
