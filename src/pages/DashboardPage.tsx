import React, { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../components/ui/Toast'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import type { MediaConfig } from '../types/database'
import { formatDate } from '../lib/utils'
import { exportToCsv } from '../lib/export'

type ViewMode = 'cards' | 'table'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { signOut, user } = useAuth()
  const { addToast } = useToast()
  const queryClient = useQueryClient()

  // View mode: cards overview or table view
  const [viewMode, setViewMode] = useState<ViewMode>('cards')

  // Table state
  const [page, setPage] = useState(0)
  const [pageSize] = useState(15)
  const [search, setSearch] = useState('')
  const [filterActive, setFilterActive] = useState<string>('all')
  const [sortColumn, setSortColumn] = useState<string>('created_at')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<MediaConfig | null>(null)
  const [exporting, setExporting] = useState(false)

  // Fetch summary counts
  const { data: summaryData } = useQuery({
    queryKey: ['media-summary'],
    queryFn: async () => {
      // Total
      const { count: total } = await supabase.from('media_configs').select('*', { count: 'exact', head: true })
      // Active
      const { count: active } = await supabase.from('media_configs').select('*', { count: 'exact', head: true }).eq('is_active', true)
      // Inactive
      const { count: inactive } = await supabase.from('media_configs').select('*', { count: 'exact', head: true }).eq('is_active', false)
      // Premium
      const { count: premium } = await supabase.from('media_configs').select('*', { count: 'exact', head: true }).eq('is_premium', true)

      return {
        total: total || 0,
        active: active || 0,
        inactive: inactive || 0,
        premium: premium || 0,
      }
    },
    refetchOnWindowFocus: false,
  })

  // Fetch table data (only when in table view)
  const { data, isLoading } = useQuery({
    queryKey: ['media-configs', page, pageSize, search, filterActive, sortColumn, sortDirection],
    queryFn: async () => {
      let query = supabase.from('media_configs').select('*', { count: 'exact' })
      if (search) {
        query = query.or(`media_name.ilike.%${search}%,media_id.ilike.%${search}%`)
      }
      if (filterActive === 'true') {
        query = query.eq('is_active', true)
      } else if (filterActive === 'false') {
        query = query.eq('is_active', false)
      }
      query = query.order(sortColumn, { ascending: sortDirection === 'asc' })
      const from = page * pageSize
      query = query.range(from, from + pageSize - 1)

      const { data, error } = await query
      if (error) throw error
      return { data: data as MediaConfig[], count: 0 }
    },
    enabled: viewMode === 'table',
  })

  const { data: countData } = useQuery({
    queryKey: ['media-configs-count', search, filterActive],
    queryFn: async () => {
      let query = supabase.from('media_configs').select('*', { count: 'exact', head: true })
      if (search) {
        query = query.or(`media_name.ilike.%${search}%,media_id.ilike.%${search}%`)
      }
      if (filterActive === 'true') {
        query = query.eq('is_active', true)
      } else if (filterActive === 'false') {
        query = query.eq('is_active', false)
      }
      const { count, error } = await query
      if (error) throw error
      return { count: count || 0 }
    },
    enabled: viewMode === 'table',
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('media_configs').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-configs'] })
      queryClient.invalidateQueries({ queryKey: ['media-configs-count'] })
      queryClient.invalidateQueries({ queryKey: ['media-summary'] })
      addToast({ title: 'Deleted', description: 'Media config has been deleted', type: 'success' })
      setDeleteTarget(null)
    },
    onError: (err: Error) => {
      addToast({ title: 'Error', description: err.message, type: 'error' })
    },
  })

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setPage(0)
  }, [])

  const handleExport = useCallback(async () => {
    setExporting(true)
    try {
      let query = supabase.from('media_configs').select('*')
      if (search) {
        query = query.or(`media_name.ilike.%${search}%,media_id.ilike.%${search}%`)
      }
      if (filterActive === 'true') {
        query = query.eq('is_active', true)
      } else if (filterActive === 'false') {
        query = query.eq('is_active', false)
      }
      const { data: exportData, error } = await query
      if (error) throw error
      exportToCsv(exportData as MediaConfig[])
      addToast({ title: 'Exported', description: 'Data has been exported to CSV', type: 'success' })
    } catch (err: unknown) {
      addToast({ title: 'Error', description: (err as Error).message, type: 'error' })
    } finally {
      setExporting(false)
    }
  }, [search, filterActive, addToast])

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const handleCardClick = (filter: string) => {
    setFilterActive(filter)
    setViewMode('table')
    setPage(0)
    setSearch('')
  }

  const totalPages = countData ? Math.ceil(countData.count / pageSize) : 0

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return <span className="text-muted-foreground ml-1">↕</span>
    return <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur border-b border-border sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <h1 className="text-lg font-bold text-foreground">Media Configs</h1>
            </div>
            <div className="flex items-center gap-3">
              {viewMode === 'table' && (
                <Button variant="outline" size="sm" onClick={() => { setViewMode('cards'); setSearch(''); setFilterActive('all') }}>
                  ← Cards
                </Button>
              )}
              <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
              <Button variant="outline" size="sm" onClick={() => signOut()}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ===== CARDS VIEW ===== */}
        {viewMode === 'cards' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Overview</h2>
                <p className="text-muted-foreground mt-1">Select a category to view details</p>
              </div>
              <Button onClick={() => navigate('/dashboard/new')} size="sm">
                + Add New
              </Button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <SummaryCard
                title="Total Media"
                count={summaryData?.total ?? 0}
                icon="📊"
                onClick={() => handleCardClick('all')}
                color="border-primary/30 bg-primary/5"
                hoverColor="hover:bg-primary/10"
              />
              <SummaryCard
                title="Active"
                count={summaryData?.active ?? 0}
                icon="✅"
                onClick={() => handleCardClick('true')}
                color="border-green-500/30 bg-green-500/5"
                hoverColor="hover:bg-green-500/10"
              />
              <SummaryCard
                title="Inactive"
                count={summaryData?.inactive ?? 0}
                icon="⏸️"
                onClick={() => handleCardClick('false')}
                color="border-red-500/30 bg-red-500/5"
                hoverColor="hover:bg-red-500/10"
              />
              <SummaryCard
                title="Premium"
                count={summaryData?.premium ?? 0}
                icon="⭐"
                onClick={() => { setViewMode('table'); setPage(0) }}
                color="border-yellow-500/30 bg-yellow-500/5"
                hoverColor="hover:bg-yellow-500/10"
              />
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <QuickStatCard
                label="Recently Created"
                description="Latest 5 media configs"
                action="View"
                onClick={() => { setSortColumn('created_at'); setSortDirection('desc'); setViewMode('table'); setPage(0) }}
              />
              <QuickStatCard
                label="All Media"
                description="View all configured media"
                action="Browse"
                onClick={() => { setViewMode('table'); setPage(0) }}
              />
              <QuickStatCard
                label="Add New Config"
                description="Create a new media configuration"
                action="Create"
                onClick={() => navigate('/dashboard/new')}
              />
            </div>
          </div>
        )}

        {/* ===== TABLE VIEW ===== */}
        {viewMode === 'table' && (
          <div className="space-y-4">
            {/* Controls */}
            <div className="bg-card rounded-lg border border-border p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="Search by media name or ID..."
                    value={search}
                    onChange={handleSearch}
                    className="w-full"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <select
                    value={filterActive}
                    onChange={(e) => { setFilterActive(e.target.value); setPage(0) }}
                    className="px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="all">All Status</option>
                    <option value="true">Active Only</option>
                    <option value="false">Inactive Only</option>
                  </select>
                  <Button variant="outline" size="sm" onClick={handleExport} loading={exporting}>
                    Export CSV
                  </Button>
                  <Button onClick={() => navigate('/dashboard/new')} size="sm">
                    + Add New
                  </Button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      {/* <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        <button onClick={() => handleSort('id')} className="flex items-center hover:text-foreground">
                          ID<SortIcon column="id" />
                        </button>
                      </th> */}
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        <button onClick={() => handleSort('media_id')} className="flex items-center hover:text-foreground">
                          Media ID<SortIcon column="media_id" />
                        </button>
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        <button onClick={() => handleSort('media_name')} className="flex items-center hover:text-foreground">
                          Media Name<SortIcon column="media_name" />
                        </button>
                      </th>
                      {/* <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                        <button onClick={() => handleSort('page')} className="flex items-center hover:text-foreground">
                          Page<SortIcon column="page" />
                        </button>
                      </th> */}
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                        Status
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                        Created
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          <td className="px-4 py-3"><div className="h-4 bg-muted rounded w-8" /></td>
                          <td className="px-4 py-3"><div className="h-4 bg-muted rounded w-24" /></td>
                          <td className="px-4 py-3"><div className="h-4 bg-muted rounded w-40" /></td>
                          <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 bg-muted rounded w-12" /></td>
                          <td className="px-4 py-3 hidden sm:table-cell"><div className="h-5 bg-muted rounded-full w-16" /></td>
                          <td className="px-4 py-3 hidden lg:table-cell"><div className="h-4 bg-muted rounded w-28" /></td>
                          <td className="px-4 py-3"><div className="h-8 bg-muted rounded w-24 ml-auto" /></td>
                        </tr>
                      ))
                    ) : data?.data.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                          No media configs found. Click "+ Add New" to create one.
                        </td>
                      </tr>
                    ) : (
                      data?.data.map((config) => (
                        <tr key={config.id} className="hover:bg-muted/30 transition-colors">
                          {/* <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{config.id}</td> */}
                          <td className="px-4 py-3 text-sm font-mono text-foreground">{config.media_id}</td>
                          <td className="px-4 py-3 text-sm font-medium text-foreground">{config.media_name}</td>
                          {/* <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell">{config.page}</td> */}
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <div className="flex gap-1 flex-wrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.is_active ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                {config.is_active ? 'Active' : 'Inactive'}
                              </span>
                              {config.is_premium && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400">
                                  Premium
                                </span>
                              )}
                              {/* {config.use_cache && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-700 text-zinc-300">
                                  Cache
                                </span>
                              )} */}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground hidden lg:table-cell">
                            {formatDate(config.created_at)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/dashboard/edit/${config.id}`)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setDeleteTarget(config)}
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    Page {page + 1} of {totalPages} ({countData?.count ?? 0} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages - 1}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Confirm Delete"
        description="This action cannot be undone."
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong className="text-foreground">{deleteTarget?.media_name}</strong>?
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              loading={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ---------- Summary Card ----------

function SummaryCard({
  title,
  count,
  icon,
  onClick,
  color,
  hoverColor,
}: {
  title: string
  count: number
  icon: string
  onClick: () => void
  color: string
  hoverColor: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-start p-6 rounded-xl border ${color} ${hoverColor} transition-all cursor-pointer text-left group`}
    >
      <span className="text-2xl mb-3">{icon}</span>
      <p className="text-3xl font-bold text-foreground group-hover:scale-105 transition-transform">
        {count}
      </p>
      <p className="text-sm text-muted-foreground mt-1">{title}</p>
    </button>
  )
}

// ---------- Quick Stat Card ----------

function QuickStatCard({
  label,
  description,
  action,
  onClick,
}: {
  label: string
  description: string
  action: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between p-5 rounded-xl bg-card border border-border hover:border-primary/50 transition-all text-left group"
    >
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
      <span className="text-sm text-primary font-medium group-hover:translate-x-1 transition-transform">
        {action} →
      </span>
    </button>
  )
}
