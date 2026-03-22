'use client'
// components/settings/ClubSettingsClient.tsx
// Three tabs: Visibility, Branding, General
// All mutations go through update_club_settings RPC.

import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'

type ClubData = {
  default_athlete_visibility?: string
  squad_board_enabled?: boolean
  squad_pr_feed_enabled?: boolean
  squad_compliance_visible?: boolean
  athlete_self_compliance?: boolean
  default_weight_unit?: string
  sport?: string
  default_rounding_increment?: number
  name?: string
}

type Branding = {
  logo_url?: string
  accent_color?: string
  theme_preset?: string
}

type Props = {
  activeClubId: string
  clubData: ClubData
  branding: Branding
}

const ACCENT_COLORS = [
  '#ef4444', '#f59e0b', '#22c55e',
  '#3b82f6', '#8b5cf6', '#ec4899', '#fafafa',
]

export default function ClubSettingsClient({ activeClubId, clubData, branding }: Props) {
  const [tab, setTab] = useState<'visibility' | 'branding' | 'general'>('visibility')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Visibility state
  const [defaultVis, setDefaultVis]        = useState(clubData.default_athlete_visibility ?? 'basic_stats')
  const [squadBoard, setSquadBoard]        = useState(clubData.squad_board_enabled ?? false)
  const [squadPR, setSquadPR]              = useState(clubData.squad_pr_feed_enabled ?? true)
  const [squadCompliance, setSquadCompliance] = useState(clubData.squad_compliance_visible ?? false)
  const [selfCompliance, setSelfCompliance]   = useState(clubData.athlete_self_compliance ?? true)

  // Branding state
  const [accentColor, setAccentColor] = useState(branding.accent_color ?? '#fafafa')
  const [logoUploaded, setLogoUploaded] = useState(!!branding.logo_url)

  // General state
  const [weightUnit, setWeightUnit]   = useState(clubData.default_weight_unit ?? 'kg')
  const [sport, setSport]             = useState(clubData.sport ?? '')
  const [rounding, setRounding]       = useState(clubData.default_rounding_increment ?? 2.5)

  const supabase = createClient()

  const handleSave = async () => {
    setSaving(true)
    const { error } = await supabase.rpc('update_club_settings', {
      p_club_id:                  activeClubId,
      p_default_visibility:       defaultVis,
      p_squad_board_enabled:      squadBoard,
      p_squad_pr_feed:            squadPR,
      p_squad_compliance_visible: squadCompliance,
      p_athlete_self_compliance:  selfCompliance,
      p_sport:                    sport || null,
      p_default_weight_unit:      weightUnit,
      p_default_rounding:         rounding,
      p_accent_color:             accentColor,
      p_logo_url:                 null,
    })
    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Tab sidebar */}
      <div className="w-44 shrink-0 border-r border-zinc-800 flex flex-col py-2">
        {(['visibility', 'branding', 'general'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`
              text-left px-4 py-2.5
              text-[10px] font-mono uppercase tracking-widest
              transition-colors border-l-2
              ${tab === t
                ? 'text-white border-l-white bg-zinc-800'
                : 'text-zinc-500 border-l-transparent hover:text-zinc-300 hover:bg-zinc-900/30'}
            `}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ── VISIBILITY ── */}
          {tab === 'visibility' && (
            <>
              <Section title="Default athlete visibility">
                <SettingRow
                  label="New athlete default"
                  sub="Applied automatically when a new athlete joins"
                >
                  <select
                    value={defaultVis}
                    onChange={(e) => setDefaultVis(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-mono p-2 focus:outline-none focus:border-zinc-600"
                  >
                    <option value="name_only">Name only</option>
                    <option value="basic_stats">Basic stats</option>
                    <option value="full_stats">Full stats</option>
                  </select>
                </SettingRow>
              </Section>

              <Section title="Squad board">
                <SettingRow label="Enable squad board" sub="Athletes can see a shared club roster view">
                  <Toggle on={squadBoard} onChange={setSquadBoard} />
                </SettingRow>
                <SettingRow label="PR feed on squad board" sub="New PRs appear in the squad feed">
                  <Toggle on={squadPR} onChange={setSquadPR} />
                </SettingRow>
                <SettingRow label="Show compliance on squad board" sub="Workout completion rate visible to teammates">
                  <Toggle on={squadCompliance} onChange={setSquadCompliance} />
                </SettingRow>
              </Section>

              <Section title="Athlete self-view">
                <SettingRow label="Athletes can see their own compliance rate" sub="Turn off if you want athletes focused on effort, not percentage">
                  <Toggle on={selfCompliance} onChange={setSelfCompliance} />
                </SettingRow>
              </Section>
            </>
          )}

          {/* ── BRANDING ── */}
          {tab === 'branding' && (
            <>
              <Section title="Club logo">
                <div
                  onClick={() => setLogoUploaded(true)}
                  className={`
                    border border-dashed p-6 text-center cursor-pointer transition-colors
                    ${logoUploaded
                      ? 'border-green-900 text-green-500'
                      : 'border-zinc-800 text-zinc-600 hover:border-zinc-600 hover:text-zinc-500'}
                    text-[10px] font-mono uppercase tracking-widest
                  `}
                >
                  {logoUploaded ? 'Logo uploaded ✓' : 'Click to upload logo (PNG or SVG, max 1MB)'}
                </div>
                <p className="text-[10px] font-mono text-zinc-700 mt-2">
                  Appears in the athlete app header and welcome emails
                </p>
              </Section>

              <Section title="Accent colour">
                <div className="flex gap-3 flex-wrap">
                  {ACCENT_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setAccentColor(color)}
                      style={{ backgroundColor: color }}
                      className={`
                        w-8 h-8 border transition-all
                        ${accentColor === color
                          ? 'border-white scale-110'
                          : 'border-zinc-700 hover:border-zinc-500'}
                      `}
                    />
                  ))}
                </div>
                <p className="text-[10px] font-mono text-zinc-700 mt-3">
                  Used for buttons, active states, and highlights in the athlete app
                </p>
                <div className="flex items-center gap-3 mt-3">
                  <div
                    className="w-4 h-4 border border-zinc-700"
                    style={{ backgroundColor: accentColor }}
                  />
                  <span className="text-[10px] font-mono text-zinc-500">
                    Current: {accentColor}
                  </span>
                </div>
              </Section>
            </>
          )}

          {/* ── GENERAL ── */}
          {tab === 'general' && (
            <>
              <Section title="Club details">
                <SettingRow label="Sport / discipline">
                  <select
                    value={sport}
                    onChange={(e) => setSport(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-mono p-2 focus:outline-none focus:border-zinc-600"
                  >
                    <option value="">General strength</option>
                    <option value="powerlifting">Powerlifting</option>
                    <option value="weightlifting">Weightlifting</option>
                    <option value="sc">Strength & Conditioning</option>
                  </select>
                </SettingRow>
                <SettingRow label="Default weight unit">
                  <select
                    value={weightUnit}
                    onChange={(e) => setWeightUnit(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-mono p-2 focus:outline-none focus:border-zinc-600"
                  >
                    <option value="kg">kg</option>
                    <option value="lb">lb</option>
                  </select>
                </SettingRow>
                <SettingRow label="Default rounding increment">
                  <select
                    value={rounding}
                    onChange={(e) => setRounding(Number(e.target.value))}
                    className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-mono p-2 focus:outline-none focus:border-zinc-600"
                  >
                    <option value={1}>1kg</option>
                    <option value={2.5}>2.5kg</option>
                    <option value={5}>5kg</option>
                  </select>
                </SettingRow>
              </Section>
            </>
          )}
        </div>

        {/* Save footer */}
        <div className="shrink-0 border-t border-zinc-800 px-6 py-3 flex items-center justify-between bg-zinc-950">
          <span className={`text-[10px] font-mono uppercase tracking-widest transition-colors ${saved ? 'text-green-400' : 'text-transparent'}`}>
            Saved.
          </span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-white text-black text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-200 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3 pb-2 border-b border-zinc-900">
        {title}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function SettingRow({
  label, sub, children,
}: {
  label: string
  sub?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-900 gap-4">
      <div>
        <p className="text-xs text-zinc-300">{label}</p>
        {sub && <p className="text-[10px] font-mono text-zinc-600 mt-1">{sub}</p>}
      </div>
      {children}
    </div>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className={`
        relative w-9 h-5 flex-shrink-0 transition-colors
        ${on ? 'bg-green-600' : 'bg-zinc-700'}
      `}
      style={{ borderRadius: '10px' }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 bg-white transition-all"
        style={{
          borderRadius: '50%',
          left: on ? '18px' : '2px',
        }}
      />
    </button>
  )
}
