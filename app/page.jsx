'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const GOLD = '#C9A84C'
const NAVY = '#0D1B2A'
const GOLD_DIM = 'rgba(201,168,76,0.12)'
const BORDER = 'rgba(255,255,255,0.13)'
const MUTED = 'rgba(255,255,255,0.45)'
const INPUT_BG = 'rgba(255,255,255,0.05)'

// ─── Questions ────────────────────────────────────────────────────────────────
const QUESTIONS = [
  {
    id: 'business_basics',
    type: 'group',
    question: "Tell us about your business.",
    hint: "The essentials — name, what you do, and where you do it.",
    optional: false,
    fields: [
      { key: 'name',        label: 'Business name',    placeholder: 'e.g. The Blue Door Café', type: 'text' },
      { key: 'what_you_do', label: 'What you do', placeholder: 'Type your industry…', type: 'text', withOther: true, singleSelect: true,
        suggestions: ['Restaurant / Café', 'Hair & Beauty', 'Health & Fitness', 'Trade / Builder', 'Retail', 'Professional services'] },
      { key: 'location',    label: "Where you're based", placeholder: 'e.g. Shoreditch, London', type: 'text' },
    ],
  },
  {
    id: 'customers',
    type: 'chipselect',
    question: "Who are your customers?",
    hint: "Pick all that apply — or describe them yourself.",
    placeholder: 'e.g. Busy professionals who want a quality cut…',
    optional: false,
    multiSelect: true,
    suggestions: ['Locals', 'Families', 'Professionals', 'Women', 'Men', 'Young adults'],
  },
  {
    id: 'price_range',
    type: 'select',
    question: "What's your price range?",
    hint: "Helps us match the tone and design to where you sit in the market.",
    optional: true,
    options: [
      { value: '£',   label: '£',   sub: 'Budget-friendly' },
      { value: '££',  label: '££',  sub: 'Mid-range'       },
      { value: '£££',  label: '£££',  sub: 'Premium'         },
    ],
  },
  {
    id: 'vibe',
    type: 'chipselect',
    question: "How should your website feel?",
    hint: "Pick whatever fits — or describe it yourself.",
    placeholder: 'e.g. Friendly but sharp, like a local expert…',
    optional: false,
    multiSelect: true,
    suggestions: ['Bold', 'Warm', 'Minimal', 'Luxurious', 'Playful', 'Professional'],
  },
  {
    id: 'goal',
    type: 'dual',
    question: "What should your website make people do?",
    hint: "The one action that matters most — and what the button should say.",
    optional: false,
    fields: [
      { key: 'goal', label: 'Primary goal', placeholder: 'Describe your own goal…', withOther: true,
        suggestions: ['More bookings', 'Generate leads', 'Sell online', 'Showcase work'] },
      { key: 'cta',  label: 'CTA button text', placeholder: 'e.g. Book a Table, Get a Quote…', withOther: true,
        suggestions: ['Book Now', 'Get a Quote', 'Contact Us', 'Order Now'] },
    ],
  },
  {
    id: 'branding',
    type: 'fileupload',
    question: "Do you have a logo or any brand assets?",
    hint: "Upload anything you have — logo, colours, fonts, brand guide. If not, we'll build everything from scratch.",
    optional: false,
  },
  {
    id: 'references',
    type: 'group',
    question: "Any websites you love the look of?",
    hint: "Your existing site and anything that inspires you — competitors, brands you admire, anything that captures the feeling you want.",
    optional: true,
    fields: [
      { key: 'existing_site', label: 'Your current website', placeholder: 'https://yoursite.com (leave blank if none)', type: 'text' },
      { key: 'inspiration',   label: 'Sites you like',       placeholder: 'https://example.com — and what you love about it', type: 'textarea', rows: 2 },
    ],
  },
  {
    id: 'contact_details',
    type: 'group',
    question: "How can customers reach you?",
    hint: "This goes directly on the site.",
    optional: false,
    fields: [
      { key: 'phone',   label: 'Phone / WhatsApp', placeholder: '+44 7700 900000', type: 'text' },
      { key: 'address', label: 'Address',           placeholder: '12 Example Street, London', type: 'text' },
      { key: 'hours',   label: 'Opening hours',     placeholder: 'e.g. Mon–Fri 9am–6pm, Sat 10am–4pm', type: 'text' },
    ],
  },
  {
    id: 'client_contact',
    type: 'group',
    question: "Last one — how do we reach you?",
    hint: "We'll be in touch within 24 hours to walk you through what happens next.",
    optional: false,
    fields: [
      { key: 'name',  label: 'Your name',      placeholder: 'e.g. Sarah', type: 'text' },
      { key: 'email', label: 'Email address',   placeholder: 'sarah@yourbusiness.com', type: 'text' },
      { key: 'phone', label: 'Phone / WhatsApp', placeholder: '+44 7700 900000', type: 'text' },
    ],
  },
]

const TOTAL = QUESTIONS.length

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isValid(q, answers) {
  if (q.optional) return true
  const val = answers[q.id]
  if (!val) return false
  if (q.type === 'text' || q.type === 'textarea') return val.trim().length > 0
  if (q.type === 'select') return typeof val === 'string' && val.length > 0
  if (q.type === 'chipselect') return typeof val === 'string' && val.trim().length > 0
  if (q.type === 'multiselect') return Array.isArray(val) && val.length > 0
  if (q.type === 'fileupload') return val && (val.nobranding === true || val.file != null)
  if (q.type === 'group') {
    const v = val
    return q.fields.some((f) => v[f.key] && v[f.key].trim().length > 0)
  }
  if (q.type === 'dual') {
    const v = val
    return q.fields.some((f) => v[f.key] && v[f.key].trim().length > 0)
  }
  return false
}

// ─── Starfield canvas ─────────────────────────────────────────────────────────
function Starfield() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)
    const stars = Array.from({ length: 180 }, () => ({
      x: Math.random(),
      y: Math.random() * 0.88,
      size: 0.3 + Math.random() * 1.6,
      opacity: 0.1 + Math.random() * 0.55,
      phase: Math.random() * Math.PI * 2,
      speed: 0.002 + Math.random() * 0.009,
    }))
    let raf
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      stars.forEach(s => {
        s.phase += s.speed
        const alpha = s.opacity * (0.5 + 0.5 * Math.sin(s.phase))
        ctx.globalAlpha = alpha
        ctx.fillStyle = '#C9A84C'
        ctx.beginPath()
        ctx.arc(s.x * canvas.width, s.y * canvas.height, s.size, 0, Math.PI * 2)
        ctx.fill()
      })
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 1 }} />
}



// ─── Progress bar ─────────────────────────────────────────────────────────────
function GladiatorProgress({ step, total }) {
  const pct = step / (total - 1)
  return (
    <div style={{ position: 'relative', width: '100%', padding: '6px 0 2px' }}>

      {/* Outer glow */}
      <div style={{
        position: 'absolute', inset: '2px -3px',
        borderRadius: '8px',
        background: 'rgba(201,168,76,0.14)',
        filter: 'blur(5px)',
        pointerEvents: 'none',
      }} />

      {/* Track shell */}
      <div style={{
        position: 'relative', height: '8px', borderRadius: '5px',
        background: 'linear-gradient(180deg, rgba(30,20,5,0.96) 0%, rgba(12,8,1,0.99) 100%)',
        border: '1.5px solid rgba(201,168,76,0.38)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), inset 0 -1px 0 rgba(0,0,0,0.5)',
        overflow: 'hidden',
      }}>

        {/* Liquid gold fill */}
        <motion.div
          animate={{ width: `${pct * 100}%` }}
          transition={{ duration: 0.5, ease: [0.32, 0, 0.18, 1] }}
          style={{
            height: '100%', borderRadius: '4px', position: 'relative', overflow: 'hidden',
            boxShadow: '0 0 8px rgba(201,168,76,0.7), 0 0 18px rgba(201,168,76,0.25)',
          }}
        >
          <div className="liquid-gold-fill" style={{ position: 'absolute', inset: 0 }} />
          {/* Top highlight */}
          <div style={{
            position: 'absolute', top: '1px', left: '3px', right: '3px', height: '2px',
            background: 'rgba(255,252,210,0.45)', borderRadius: '2px',
          }} />
        </motion.div>

      </div>
    </div>
  )
}

// ─── Shared input style ───────────────────────────────────────────────────────
const inputStyle = {
  width: '100%',
  background: INPUT_BG,
  border: `1px solid ${BORDER}`,
  borderRadius: '4px',
  color: '#fff',
  fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif',
  fontSize: '16px',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
  padding: '14px 16px',
}

// ─── Suggestion chips ─────────────────────────────────────────────────────────
function SuggestionChips({ suggestions, value, onChange, singleSelect }) {
  const toggle = (s) => {
    if (singleSelect) { onChange(value === s ? '' : s); return }
    const current = value || ''
    const parts = current.split(', ').map(p => p.trim()).filter(Boolean)
    if (parts.includes(s)) {
      onChange(parts.filter(p => p !== s).join(', '))
    } else {
      onChange([...parts, s].join(', '))
    }
  }
  const parts = singleSelect
    ? (value ? [value] : [])
    : (value || '').split(', ').map(p => p.trim()).filter(Boolean)
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
      {suggestions.map(s => {
        const active = parts.includes(s)
        return (
          <button key={s} type="button" onClick={() => toggle(s)} style={{
            display: 'inline-flex', alignItems: 'center', gap: '5px',
            padding: '6px 12px', minHeight: '32px', borderRadius: '3px',
            border: `1px solid ${active ? GOLD : BORDER}`,
            background: active ? GOLD_DIM : 'transparent',
            color: active ? GOLD : MUTED,
            fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif',
            fontSize: '12px', letterSpacing: '0.04em',
            cursor: 'pointer', transition: 'all 0.15s ease',
            whiteSpace: 'nowrap', userSelect: 'none',
          }}>
            {active && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><polyline points="1.5,5 4,7.5 8.5,2.5" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            {s}
          </button>
        )
      })}
    </div>
  )
}

// ─── Chips + Other input ──────────────────────────────────────────────────────
function ChipSelectInput({ options = [], value, onChange, singleSelect = false, placeholder = 'Describe your own…' }) {
  const parts = (value || '').split(', ').map(s => s.trim()).filter(Boolean)
  const selected = parts.filter(p => options.includes(p))
  const otherText = parts.filter(p => !options.includes(p)).join(', ')

  const [showOther, setShowOther] = useState(() =>
    (value || '').split(', ').some(s => s.trim() && !options.includes(s.trim()))
  )

  const rebuild = (newSelected, newOther) => {
    const all = [...newSelected, ...(newOther ? [newOther] : [])]
    onChange(all.join(', '))
  }

  const toggleChip = (chip) => {
    if (singleSelect) {
      const picking = !selected.includes(chip)
      if (picking) { setShowOther(false); rebuild([chip], ''); return }
      rebuild([], otherText)
    } else {
      const newSel = selected.includes(chip) ? selected.filter(s => s !== chip) : [...selected, chip]
      rebuild(newSel, otherText)
    }
  }

  const toggleOther = () => {
    if (showOther) { rebuild(selected, ''); setShowOther(false) }
    else { if (singleSelect) rebuild([], otherText); setShowOther(true) }
  }

  const cardBase = {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '11px 10px', minHeight: '44px', borderRadius: '4px',
    fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif',
    fontSize: '13px', fontWeight: 600, letterSpacing: '0.05em',
    cursor: 'pointer', transition: 'all 0.18s ease',
    userSelect: 'none', textAlign: 'center',
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', marginBottom: showOther ? '12px' : 0 }}>
        {options.map(opt => {
          const active = selected.includes(opt)
          return (
            <button key={opt} type="button" onClick={() => toggleChip(opt)} style={{
              ...cardBase,
              gap: '6px',
              border: `1.5px solid ${active ? GOLD : BORDER}`,
              background: active ? GOLD_DIM : INPUT_BG,
              color: active ? GOLD : 'rgba(255,255,255,0.82)',
              boxShadow: active ? `0 0 12px rgba(201,168,76,0.1)` : 'none',
            }}>
              {active && <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}><polyline points="1.5,5 4,7.5 8.5,2.5" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
              {opt}
            </button>
          )
        })}
        <button type="button" onClick={toggleOther} style={{
          ...cardBase,
          gridColumn: options.length % 2 === 0 ? '1 / -1' : undefined,
          border: `1.5px dashed ${showOther ? GOLD : BORDER}`,
          background: showOther ? GOLD_DIM : 'transparent',
          color: showOther ? GOLD : 'rgba(255,255,255,0.28)',
          boxShadow: showOther ? `0 0 12px rgba(201,168,76,0.1)` : 'none',
        }}>
          {showOther ? '× Other' : '+ Other'}
        </button>
      </div>
      {showOther && (
        <input
          autoFocus type="text" value={otherText}
          onChange={e => rebuild(singleSelect ? [] : selected, e.target.value)}
          placeholder={placeholder}
          style={{ ...inputStyle, borderColor: BORDER }}
        />
      )}
    </div>
  )
}

// ─── Input components ─────────────────────────────────────────────────────────
function TextInput({ value, onChange, placeholder, onEnter, autoFocus, suggestions }) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      {suggestions?.length > 0 && <SuggestionChips suggestions={suggestions} value={value} onChange={onChange} />}
      <input
        type="text" autoFocus={autoFocus} value={value || ''}
        onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ ...inputStyle, borderColor: focused ? GOLD : BORDER, boxShadow: focused ? `0 0 0 3px rgba(201,168,76,0.1)` : 'none' }}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        onKeyDown={e => { if (e.key === 'Enter') onEnter?.() }}
      />
    </div>
  )
}

function TextareaInput({ value, onChange, placeholder, autoFocus, rows = 4, suggestions }) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      {suggestions?.length > 0 && <SuggestionChips suggestions={suggestions} value={value} onChange={onChange} />}
      <textarea
        autoFocus={autoFocus} value={value || ''}
        onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.6', borderColor: focused ? GOLD : BORDER, boxShadow: focused ? `0 0 0 3px rgba(201,168,76,0.1)` : 'none' }}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      />
    </div>
  )
}

function MultiSelectInput({ options, value, onChange }) {
  const selected = value || []
  const toggle = opt => selected.includes(opt)
    ? onChange(selected.filter(o => o !== opt))
    : onChange([...selected, opt])
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {options.map(opt => {
        const active = selected.includes(opt)
        return (
          <button key={opt} type="button" onClick={() => toggle(opt)} style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '10px 18px', minHeight: '44px', borderRadius: '2px',
            border: `1px solid ${active ? GOLD : BORDER}`,
            background: active ? GOLD_DIM : 'transparent',
            color: active ? GOLD : MUTED,
            fontFamily: 'var(--font-inter), Inter, system-ui, sans-serif',
            fontSize: '14px', cursor: 'pointer', transition: 'all 0.18s ease',
            letterSpacing: '0.02em', userSelect: 'none', whiteSpace: 'nowrap',
          }}>
            {active && <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polyline points="1.5,6 4.5,9 10.5,3" stroke={GOLD} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            {opt}
          </button>
        )
      })}
    </div>
  )
}

function FileUploadInput({ value, onChange }) {
  const val = value || {}
  const fileInputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const handleFile = file => { if (!file) return; onChange({ file, fileName: file.name, nobranding: false }) }
  const handleDrop = e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files?.[0]) }
  const toggleNobranding = () => {
    if (val.nobranding) { onChange({}) }
    else { onChange({ nobranding: true, file: null, fileName: null }); if (fileInputRef.current) fileInputRef.current.value = '' }
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {!val.nobranding && (
        <>
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            style={{
              border: `1.5px dashed ${dragging || val.fileName ? GOLD : BORDER}`,
              borderRadius: '4px',
              background: dragging ? GOLD_DIM : val.fileName ? 'rgba(201,168,76,0.06)' : INPUT_BG,
              padding: '32px 24px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px',
              cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: dragging ? `0 0 0 3px rgba(201,168,76,0.1)` : 'none',
            }}
          >
            {val.fileName ? (
              <>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <path d="M5 3l14 0 6 6v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V3z" stroke={GOLD} strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M19 3v6h6" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontSize: '13px', color: GOLD, fontWeight: 500, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{val.fileName}</span>
                <button type="button" onClick={e => { e.stopPropagation(); onChange({}); if (fileInputRef.current) fileInputRef.current.value = '' }}
                  style={{ background: 'none', border: `1px solid ${BORDER}`, color: MUTED, fontFamily: 'var(--font-inter), Inter, sans-serif', fontSize: '11px', letterSpacing: '0.06em', textTransform: 'uppercase', cursor: 'pointer', padding: '4px 12px', transition: 'all 0.15s' }}>
                  Remove
                </button>
              </>
            ) : (
              <>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <path d="M14 18V10" stroke={MUTED} strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M10 13l4-4 4 4" stroke={MUTED} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M8 20a4 4 0 0 1 0-8h.5A5.5 5.5 0 0 1 19 10.5V11a4 4 0 0 1 1 7.9" stroke={MUTED} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontSize: '14px', color: MUTED, textAlign: 'center', lineHeight: 1.5 }}>
                  Drag and drop or{' '}
                  <span style={{ color: GOLD, textDecoration: 'underline', textUnderlineOffset: '3px' }}>click to upload</span>
                </span>
                <span style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontSize: '11px', color: 'rgba(255,255,255,0.18)', letterSpacing: '0.04em' }}>Images &amp; PDFs accepted</span>
              </>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={e => handleFile(e.target.files?.[0])} style={{ display: 'none' }} />
        </>
      )}
      <button type="button" onClick={toggleNobranding} style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        background: val.nobranding ? GOLD_DIM : 'transparent',
        border: `1px solid ${val.nobranding ? GOLD : BORDER}`,
        borderRadius: '4px', padding: '14px 18px', cursor: 'pointer', textAlign: 'left',
        transition: 'all 0.18s ease', width: '100%',
      }}>
        <div style={{ width: '18px', height: '18px', borderRadius: '2px', border: `1.5px solid ${val.nobranding ? GOLD : BORDER}`, background: val.nobranding ? GOLD_DIM : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
          {val.nobranding && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><polyline points="1.5,5 3.8,7.5 8.5,2.5" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        </div>
        <span style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontSize: '14px', color: val.nobranding ? GOLD : MUTED, transition: 'color 0.15s', letterSpacing: '0.01em' }}>
          No branding yet — we&apos;ll create something
        </span>
      </button>
    </div>
  )
}

function GroupField({ field, value, onChange, autoFocus }) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label style={{ display: 'block', marginBottom: '8px', fontSize: '10px', fontFamily: 'var(--font-inter), Inter, sans-serif', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.55)' }}>
        {field.label}
      </label>
      {field.withOther ? (
        <ChipSelectInput options={field.suggestions || []} value={value} onChange={onChange} singleSelect={field.singleSelect} placeholder={field.placeholder} />
      ) : (
        <>
          {field.suggestions?.length > 0 && <SuggestionChips suggestions={field.suggestions} value={value} onChange={onChange} singleSelect={field.singleSelect} />}
          {field.type === 'textarea' ? (
            <textarea autoFocus={autoFocus} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} rows={field.rows || 3}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.6', borderColor: focused ? GOLD : BORDER, boxShadow: focused ? `0 0 0 3px rgba(201,168,76,0.1)` : 'none' }}
              onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
          ) : (
            <input type="text" autoFocus={autoFocus} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder}
              style={{ ...inputStyle, borderColor: focused ? GOLD : BORDER, boxShadow: focused ? `0 0 0 3px rgba(201,168,76,0.1)` : 'none' }}
              onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
          )}
        </>
      )}
    </div>
  )
}

function GroupInput({ fields, value, onChange, autoFocus }) {
  const val = value || {}
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {fields.map((field, i) => (
        <GroupField key={field.key} field={field} value={val[field.key]} onChange={v => onChange({ ...val, [field.key]: v })} autoFocus={autoFocus && i === 0} />
      ))}
    </div>
  )
}

function DualField({ field, value, onChange, autoFocus }) {
  const [focused, setFocused] = useState(false)
  return (
    <div>
      <label style={{ display: 'block', marginBottom: '8px', fontSize: '10px', fontFamily: 'var(--font-inter), Inter, sans-serif', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.55)' }}>
        {field.label}
      </label>
      {field.withOther ? (
        <ChipSelectInput options={field.suggestions || []} value={value} onChange={onChange} singleSelect placeholder={field.placeholder} />
      ) : (
        <>
          {field.suggestions?.length > 0 && <SuggestionChips suggestions={field.suggestions} value={value} onChange={onChange} />}
          <input type="text" autoFocus={autoFocus} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder}
            style={{ ...inputStyle, borderColor: focused ? GOLD : BORDER, boxShadow: focused ? `0 0 0 3px rgba(201,168,76,0.1)` : 'none' }}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
        </>
      )}
    </div>
  )
}

function DualInput({ fields, value, onChange, autoFocus }) {
  const val = value || {}
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {fields.map((field, i) => (
        <DualField key={field.key} field={field} value={val[field.key]} onChange={v => onChange({ ...val, [field.key]: v })} autoFocus={autoFocus && i === 0} />
      ))}
    </div>
  )
}

// ─── Price select ─────────────────────────────────────────────────────────────
function PriceSelectInput({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
      {options.map(opt => {
        const active = value === opt.value
        return (
          <button key={opt.value} type="button" onClick={() => onChange(active ? '' : opt.value)}
            style={{
              flex: '1 1 0', minWidth: '90px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: '6px', padding: '22px 16px',
              border: `1.5px solid ${active ? GOLD : BORDER}`,
              borderRadius: '4px',
              background: active ? GOLD_DIM : INPUT_BG,
              cursor: 'pointer', transition: 'all 0.18s ease',
              boxShadow: active ? `0 0 16px rgba(201,168,76,0.12)` : 'none',
            }}>
            <span style={{
              fontFamily: 'var(--font-cormorant), Cormorant Garamond, Georgia, serif',
              fontSize: '28px', fontWeight: 600, color: active ? GOLD : 'rgba(255,255,255,0.7)',
              letterSpacing: '0.04em', lineHeight: 1, transition: 'color 0.18s',
            }}>{opt.label}</span>
            <span style={{
              fontFamily: 'var(--font-inter), Inter, sans-serif',
              fontSize: '11px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: active ? 'rgba(201,168,76,0.75)' : MUTED, transition: 'color 0.18s',
            }}>{opt.sub}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─── Question slide ───────────────────────────────────────────────────────────
function QuestionSlide({ q, stepIndex, answers, onChange, onContinue, direction }) {
  const value = answers[q.id]
  const variants = {
    enter:  { y: direction >= 0 ? 52 : -32, opacity: 0 },
    center: { y: 0, opacity: 1 },
    exit:   { y: direction >= 0 ? -32 : 52, opacity: 0 },
  }
  return (
    <motion.div
      key={q.id} variants={variants} initial="enter" animate="center" exit="exit"
      transition={{ duration: 0.42, ease: [0.32, 0, 0.18, 1] }}
      style={{ width: '100%', maxWidth: '640px', margin: '0 auto', padding: '0 clamp(12px, 3vw, 20px)' }}
    >
      {/* Step tag */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '22px' }}>
        <div style={{ width: '28px', height: '1px', background: GOLD, opacity: 0.4 }} />
        <span style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontSize: '11px', fontWeight: 600, color: GOLD, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          {String(stepIndex + 1).padStart(2, '0')}
        </span>
        {q.optional && (
          <span style={{ fontSize: '9px', fontFamily: 'var(--font-inter), Inter, sans-serif', fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(201,168,76,0.45)', border: `1px solid rgba(201,168,76,0.2)`, borderRadius: '1px', padding: '2px 8px' }}>
            Optional
          </span>
        )}
      </div>

      {/* Question */}
      <h2 style={{ fontFamily: 'var(--font-cormorant), Cormorant Garamond, Georgia, serif', fontSize: 'clamp(24px, 4.5vw, 38px)', fontWeight: 400, lineHeight: 1.2, color: '#fff', marginBottom: q.hint ? '10px' : '32px', letterSpacing: '-0.01em' }}>
        {q.question}
      </h2>

      {q.hint && (
        <p style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontSize: '14px', color: MUTED, lineHeight: 1.65, marginBottom: '28px' }}>
          {q.hint}
        </p>
      )}

      {q.type === 'text'        && <TextInput        value={value} onChange={v => onChange(q.id, v)} placeholder={q.placeholder} autoFocus onEnter={isValid(q, { [q.id]: value }) ? onContinue : undefined} suggestions={q.suggestions} />}
      {q.type === 'textarea'    && <TextareaInput    value={value} onChange={v => onChange(q.id, v)} placeholder={q.placeholder} autoFocus rows={4} suggestions={q.suggestions} />}
      {q.type === 'chipselect'  && <ChipSelectInput  options={q.suggestions} value={value} onChange={v => onChange(q.id, v)} singleSelect={q.singleSelect} placeholder={q.placeholder} />}
      {q.type === 'select'      && <PriceSelectInput options={q.options} value={value} onChange={v => onChange(q.id, v)} />}
      {q.type === 'multiselect' && <MultiSelectInput options={q.options} value={value} onChange={v => onChange(q.id, v)} />}
      {q.type === 'fileupload'  && <FileUploadInput  value={value} onChange={v => onChange(q.id, v)} />}
      {q.type === 'group'       && <GroupInput       fields={q.fields} value={value} onChange={v => onChange(q.id, v)} autoFocus />}
      {q.type === 'dual'        && <DualInput        fields={q.fields} value={value} onChange={v => onChange(q.id, v)} autoFocus />}
    </motion.div>
  )
}

// ─── Splash screen ────────────────────────────────────────────────────────────
function SplashScreen({ onStart }) {
  const container = { hidden: {}, show: { transition: { staggerChildren: 0.16, delayChildren: 0.15 } } }
  const item = { hidden: { opacity: 0, y: 30 }, show: { opacity: 1, y: 0, transition: { duration: 0.72, ease: [0.32, 0, 0.18, 1] } } }
  return (
    <motion.div
      key="splash" variants={container} initial="hidden" animate="show"
      exit={{ opacity: 0, y: -24, transition: { duration: 0.38, ease: [0.32, 0, 0.18, 1] } }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 clamp(20px, 6vw, 60px)', maxWidth: '660px', margin: '0 auto', position: 'relative', zIndex: 10 }}
    >
      {/* Vertical ornament */}
      <motion.div variants={item} style={{ width: '1px', height: '44px', background: `linear-gradient(to bottom, transparent, ${GOLD})`, marginBottom: '24px', opacity: 0.45 }} />

      {/* Headline */}
      <motion.h1 variants={item} style={{
        fontFamily: 'var(--font-cormorant), Cormorant Garamond, Georgia, serif',
        fontSize: 'clamp(38px, 7vw, 62px)', fontWeight: 300, lineHeight: 1.1,
        color: '#fff', marginBottom: '10px', letterSpacing: '-0.01em',
      }}>
        Your Custom Website,
      </motion.h1>
      <motion.h1 variants={item} style={{
        fontFamily: 'var(--font-cormorant), Cormorant Garamond, Georgia, serif',
        fontSize: 'clamp(38px, 7vw, 62px)', fontWeight: 300, lineHeight: 1.1,
        color: GOLD, marginBottom: '24px', letterSpacing: '-0.01em',
      }}>
        Built Free.
      </motion.h1>

      {/* Sub-copy */}
      <motion.p variants={item} style={{
        fontFamily: 'var(--font-inter), Inter, sans-serif',
        fontSize: 'clamp(14px, 1.8vw, 16px)', color: MUTED,
        lineHeight: 1.75, marginBottom: '38px', maxWidth: '460px',
      }}>
        Answer 9 quick questions and we'll design and build a fully custom website for your business — then send you a live preview. No card. No commitment.
      </motion.p>

      {/* CTA */}
      <motion.div variants={item}>
        <motion.button
          onClick={onStart}
          whileHover={{ scale: 1.03, boxShadow: '0 0 36px rgba(201,168,76,0.55), 0 0 12px rgba(201,168,76,0.3)' }}
          whileTap={{ scale: 0.97 }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            background: GOLD, color: NAVY,
            fontFamily: 'var(--font-inter), Inter, sans-serif',
            fontSize: '13px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            padding: '18px 40px', borderRadius: '3px', border: 'none', cursor: 'pointer',
            boxShadow: '0 0 22px rgba(201,168,76,0.28)',
          }}
        >
          Build My Free Website
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M2.5 7.5h10M9 4l3.5 3.5L9 11" stroke={NAVY} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.button>
      </motion.div>

      {/* Trust line */}
      <motion.p variants={item} style={{
        fontFamily: 'var(--font-inter), Inter, sans-serif',
        fontSize: '11px', color: 'rgba(255,255,255,0.55)',
        letterSpacing: '0.07em', marginTop: '18px',
      }}>
        No card required&nbsp;&nbsp;·&nbsp;&nbsp;Takes 3 minutes&nbsp;&nbsp;·&nbsp;&nbsp;Live preview delivered to your inbox
      </motion.p>
    </motion.div>
  )
}

// ─── Gold confetti ────────────────────────────────────────────────────────────
function ConfettiCanvas() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)
    const particles = Array.from({ length: 100 }, () => ({
      x: Math.random() * window.innerWidth, y: -20 - Math.random() * 60,
      vx: (Math.random() - 0.5) * 3, vy: 1.6 + Math.random() * 3.2,
      rotation: Math.random() * 360, rotationSpeed: (Math.random() - 0.5) * 5,
      width: 5 + Math.random() * 6, height: 2 + Math.random() * 3,
      color: ['#C9A84C', '#E8D5A0', '#C9A84C', '#F0E4B0'][Math.floor(Math.random() * 4)],
      wobble: Math.random() * Math.PI * 2, wobbleSpeed: 0.03 + Math.random() * 0.04,
    }))
    const startTime = performance.now()
    const DURATION = 4200
    let raf
    const draw = now => {
      const elapsed = now - startTime
      if (elapsed > DURATION) { ctx.clearRect(0, 0, canvas.width, canvas.height); return }
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const fade = elapsed > DURATION * 0.65 ? 1 - (elapsed - DURATION * 0.65) / (DURATION * 0.35) : 1
      particles.forEach(p => {
        p.wobble += p.wobbleSpeed; p.x += p.vx + Math.sin(p.wobble) * 0.7; p.y += p.vy; p.rotation += p.rotationSpeed; p.vy += 0.035
        if (p.y > canvas.height + 20) { p.y = -20; p.x = Math.random() * canvas.width; p.vy = 1.6 + Math.random() * 2 }
        ctx.save(); ctx.globalAlpha = fade; ctx.translate(p.x, p.y); ctx.rotate(p.rotation * Math.PI / 180)
        ctx.fillStyle = p.color; ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height); ctx.restore()
      })
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 50 }} />
}

// ─── Thank you screen ─────────────────────────────────────────────────────────
function ThankYouScreen({ businessName }) {
  const container = { hidden: {}, show: { transition: { staggerChildren: 0.14, delayChildren: 0.2 } } }
  const item = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.32, 0, 0.18, 1] } } }
  return (
    <>
      <ConfettiCanvas />
      <motion.div variants={container} initial="hidden" animate="show"
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 24px', maxWidth: '520px', margin: '0 auto', position: 'relative', zIndex: 60 }}
      >
        {/* Ornamental ring */}
        <motion.div variants={item}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', border: `1px solid ${GOLD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px', boxShadow: `0 0 24px rgba(201,168,76,0.2)` }}>
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <polyline points="3.5,11 8.5,16.5 18.5,5.5" stroke={GOLD} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </motion.div>

        {/* Ornamental line */}
        <motion.div variants={item} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
          <div style={{ width: '40px', height: '1px', background: GOLD, opacity: 0.4 }} />
          <div style={{ width: '5px', height: '5px', background: GOLD, opacity: 0.6, transform: 'rotate(45deg)' }} />
          <div style={{ width: '40px', height: '1px', background: GOLD, opacity: 0.4 }} />
        </motion.div>

        <motion.h1 variants={item} style={{ fontFamily: 'var(--font-cormorant), Cormorant Garamond, Georgia, serif', fontSize: 'clamp(22px, 4.5vw, 38px)', fontWeight: 400, color: '#fff', lineHeight: 1.2, marginBottom: '14px', letterSpacing: '-0.01em' }}>
          Congratulations on taking the first step.
        </motion.h1>

        <motion.p variants={item} style={{ fontFamily: 'var(--font-cormorant), Cormorant Garamond, Georgia, serif', fontSize: 'clamp(18px, 3vw, 24px)', fontWeight: 400, color: GOLD, lineHeight: 1.35, marginBottom: '22px', letterSpacing: '0.01em' }}>
          {businessName ? `Welcome to Quintus AI, ${businessName}.` : 'Welcome to Quintus AI.'}
        </motion.p>

        <motion.p variants={item} style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontSize: '15px', color: MUTED, lineHeight: 1.7, maxWidth: '380px' }}>
          Your details are with us. We&apos;ll be in touch within 24 hours to walk you through exactly what happens next.
        </motion.p>

        <motion.div variants={item} style={{ marginTop: '48px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '16px', height: '1px', background: GOLD, opacity: 0.3 }} />
          <span style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.18)' }}>
            Quintus AI
          </span>
          <div style={{ width: '16px', height: '1px', background: GOLD, opacity: 0.3 }} />
        </motion.div>
      </motion.div>
    </>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <motion.svg width="14" height="14" viewBox="0 0 14 14" fill="none" animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}>
      <circle cx="7" cy="7" r="5.5" stroke={NAVY} strokeWidth="1.5" strokeOpacity="0.3" />
      <path d="M7 1.5a5.5 5.5 0 0 1 5.5 5.5" stroke={NAVY} strokeWidth="1.5" strokeLinecap="round" />
    </motion.svg>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Page() {
  const [splash, setSplash] = useState(true)
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [keyboardOffset, setKeyboardOffset] = useState(0)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const update = () => setKeyboardOffset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop))
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => { vv.removeEventListener('resize', update); vv.removeEventListener('scroll', update) }
  }, [])

  const q = QUESTIONS[step]
  const valid = isValid(q, answers)
  const isLast = step === TOTAL - 1

  const handleChange = useCallback((id, val) => setAnswers(prev => ({ ...prev, [id]: val })), [])

  const handleContinue = useCallback(async () => {
    if (!valid) return
    document.activeElement?.blur()
    if (step < TOTAL - 1) { setDirection(1); setStep(s => s + 1); return }
    setSubmitting(true); setError(null)
    try {
      const brandingAnswer = answers.branding
      const hasFile = brandingAnswer?.file instanceof File
      let res
      if (hasFile) {
        const formData = new FormData()
        const textAnswers = { ...answers, branding: { fileName: brandingAnswer.fileName, nobranding: false } }
        formData.append('answers', JSON.stringify(textAnswers))
        formData.append('branding_file', brandingAnswer.file)
        res = await fetch('/api/submit', { method: 'POST', body: formData })
      } else {
        const textAnswers = { ...answers, branding: brandingAnswer ? { nobranding: brandingAnswer.nobranding, fileName: null } : null }
        res = await fetch('/api/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(textAnswers) })
      }
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      setSubmitted(true)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }, [valid, step, answers])

  const handleBack = useCallback(() => {
    if (step > 0) { document.activeElement?.blur(); setDirection(-1); setStep(s => s - 1) }
  }, [step])

  useEffect(() => {
    const onKeyDown = e => {
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') {
        if (valid) handleContinue()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [valid, handleContinue])

  return (
    <div style={{ background: NAVY, height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>

      {/* ── Background layers ── */}

      {/* Palace background — full strength */}
      <div className="palace-bg" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />

      {/* General atmospheric dark — dims the non-pillar areas softly */}
      <div className="overlay-sides" style={{
        position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: 'linear-gradient(90deg, transparent 0%, rgba(2,6,12,0.55) 22%, rgba(2,6,12,0.55) 78%, transparent 100%)',
      }} />

      {/* Arch fade — deep black contained between the pillars, full height */}
      <div className="overlay-center" style={{
        position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 30% 90% at 50% 50%, rgba(2,6,12,0.97) 0%, rgba(2,6,12,0.92) 40%, rgba(2,6,12,0.65) 70%, transparent 100%)',
      }} />

      <Starfield />

      {/* Subtle gold warmth at very bottom — echoes the torch glow */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 30% at 50% 100%, rgba(201,168,76,0.07) 0%, transparent 70%)',
      }} />

      {/* ── Columns ── */}

      {/* ── Header ── */}
      <header style={{
        flexShrink: 0,
        padding: 'clamp(12px, 2.5vw, 18px) clamp(16px, 5vw, 52px) 0',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
        position: 'relative', zIndex: 10,
      }}>
        {/* Bottom ornamental border */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.12) 15%, rgba(201,168,76,0.5) 50%, rgba(201,168,76,0.12) 85%, transparent 100%)',
        }} />

        {/* Wordmark — centred */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="logo-dash" style={{ width: '44px', height: '1px', background: `linear-gradient(to right, transparent, ${GOLD})`, opacity: 0.55 }} />
            <motion.span
              className="logo-wordmark"
              animate={{ textShadow: [
                '0 0 14px rgba(201,168,76,0.35), 0 0 32px rgba(201,168,76,0.12)',
                '0 0 22px rgba(201,168,76,0.6),  0 0 48px rgba(201,168,76,0.22)',
                '0 0 14px rgba(201,168,76,0.35), 0 0 32px rgba(201,168,76,0.12)',
              ]}}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                fontFamily: 'var(--font-cormorant), Cormorant Garamond, Georgia, serif',
                fontSize: 'clamp(30px, 5.5vw, 44px)', fontWeight: 300, letterSpacing: '10px',
                textTransform: 'uppercase', color: GOLD, display: 'inline-block',
              }}
            >
              Quintus AI
            </motion.span>
            <div className="logo-dash" style={{ width: '44px', height: '1px', background: `linear-gradient(to left, transparent, ${GOLD})`, opacity: 0.55 }} />
          </div>
          <span className="logo-sub" style={{
            fontFamily: 'var(--font-inter), Inter, sans-serif',
            fontSize: '9px', fontWeight: 500, letterSpacing: '0.22em',
            textTransform: 'uppercase', color: 'rgba(201,168,76,0.45)',
          }}>
            Digital Agency
          </span>
        </div>

        {/* Gladiator progress */}
        {!submitted && !splash && <GladiatorProgress step={step} total={TOTAL} />}

        <div style={{ height: '6px' }} />
      </header>

      {/* ── Main content ── */}
      <main style={{
        flex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflowY: 'auto', overflowX: 'hidden',
        padding: `clamp(20px, 4vw, 36px) clamp(20px, 5vw, 60px)`,
        position: 'relative', zIndex: 10,
      }}>
        <AnimatePresence mode="wait" custom={direction}>
          {splash ? (
            <SplashScreen key="splash" onStart={() => setSplash(false)} />
          ) : submitted ? (
            <ThankYouScreen key="thankyou" businessName={answers.business_basics?.name} />
          ) : (
            <QuestionSlide key={q.id} q={q} stepIndex={step} answers={answers} onChange={handleChange} onContinue={handleContinue} direction={direction} />
          )}
        </AnimatePresence>
      </main>

      {/* ── Footer ── */}
      {!submitted && (
        <footer style={{
          flexShrink: 0,
          padding: `clamp(12px, 2vw, 16px) clamp(16px, 5vw, 52px) clamp(16px, 3vw, 24px)`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
          position: 'relative', zIndex: 20,
          background: NAVY,
          transform: `translateY(-${keyboardOffset}px)`,
          transition: 'transform 0.15s ease-out',
        }}>
          {/* Top border */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(201,168,76,0.1) 20%, rgba(201,168,76,0.35) 50%, rgba(201,168,76,0.1) 80%, transparent 100%)',
          }} />

          {/* Back button */}
          <button onClick={handleBack} disabled={step === 0} style={{
            background: 'none', border: 'none',
            color: step === 0 ? 'rgba(255,255,255,0.12)' : MUTED,
            fontFamily: 'var(--font-inter), Inter, sans-serif',
            fontSize: '13px', letterSpacing: '0.04em',
            cursor: step === 0 ? 'default' : 'pointer',
            padding: '12px 0', minHeight: '44px', transition: 'color 0.2s',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ opacity: step === 0 ? 0.3 : 1 }}>
              <path d="M8.5 2.5L4 7l4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back
          </button>

          {/* Continue / Submit */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <motion.button
              onClick={handleContinue}
              disabled={!valid || submitting}
              whileHover={valid ? { y: -1 } : {}}
              transition={{ duration: 0.15 }}
              style={{
                background: valid ? GOLD : GOLD_DIM,
                border: 'none',
                borderRadius: '2px',
                color: valid ? NAVY : 'rgba(255,255,255,0.25)',
                fontFamily: 'var(--font-inter), Inter, sans-serif',
                fontSize: '13px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                padding: '12px 30px', cursor: valid ? 'pointer' : 'default',
                transition: 'background 0.2s, color 0.2s',
                display: 'flex', alignItems: 'center', gap: '8px',
                minWidth: '150px', minHeight: '44px', justifyContent: 'center',
                boxShadow: valid ? `0 0 16px rgba(201,168,76,0.25)` : 'none',
              }}
            >
              {submitting ? (
                <><Spinner /> Sending…</>
              ) : isLast ? 'Submit' : (
                <>Continue <svg width="13" height="13" viewBox="0 0 14 14" fill="none"><path d="M5.5 2.5L10 7l-4.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></>
              )}
            </motion.button>
            {q.type === 'text' && (
              <span style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontSize: '10px', color: 'rgba(255,255,255,0.18)', letterSpacing: '0.04em' }}>
                press <kbd style={{ display: 'inline-flex', alignItems: 'center', padding: '1px 5px', border: `1px solid rgba(255,255,255,0.12)`, borderRadius: '2px', fontSize: '10px', fontFamily: 'var(--font-inter), Inter, sans-serif', color: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.03)' }}>Enter</kbd>
              </span>
            )}
            {error && (
              <span style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontSize: '12px', color: '#e06c6c', maxWidth: '240px', textAlign: 'right', lineHeight: 1.4 }}>
                {error}
              </span>
            )}
          </div>
        </footer>
      )}
    </div>
  )
}
