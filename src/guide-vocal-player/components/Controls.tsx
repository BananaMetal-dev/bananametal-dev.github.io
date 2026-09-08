import type { ReactNode } from 'react'

type MixerSliderProps = {
  label: string
  value: number
  onChange: (value: number) => void
  disabled?: boolean
}

export function MixerSlider({ label, value, onChange, disabled }: MixerSliderProps) {
  const percentage = Math.round(value * 100)
  return (
    <div className="mixer-control">
      <div className="control-heading">
        <span>{label}</span>
        <strong>{percentage}%</strong>
      </div>
      <input
        aria-label={label}
        className="range-control"
        type="range"
        min="0"
        max="100"
        value={percentage}
        disabled={disabled}
        style={{ '--range-progress': `${percentage}%` } as React.CSSProperties}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
      />
      <div className="range-labels" aria-hidden="true">
        <span>カラオケ（0%）</span>
        <span>原曲（100%）</span>
      </div>
    </div>
  )
}

type StepperProps = {
  label: string
  value: number
  unit: string
  onStep: (direction: -1 | 1) => void
}

export function Stepper({ label, value, unit, onStep }: StepperProps) {
  const display = `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value)}${unit}`
  return (
    <div className="stepper">
      <span className="stepper-label">{label}</span>
      <output>{display}</output>
      <div className="stepper-buttons">
        <button type="button" aria-label={`${label}を下げる`} onClick={() => onStep(-1)}>−</button>
        <button type="button" aria-label={`${label}を上げる`} onClick={() => onStep(1)}>＋</button>
      </div>
    </div>
  )
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header>
          <h2 id="modal-title">{title}</h2>
          <button className="icon-only" type="button" aria-label="閉じる" onClick={onClose}>×</button>
        </header>
        {children}
      </section>
    </div>
  )
}
