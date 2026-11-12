import { useState } from 'react'
import { useStore } from '../store'
import { CloudMemoryPanel } from './CloudMemoryPanel'

type Area = 'core' | 'memory' | 'devices' | 'vision'
const areas: { id: Area; label: string; code: string }[] = [
  { id: 'core', label: 'NEURAL CORE', code: '01' },
  { id: 'memory', label: 'MEMORY CONSTELLATION', code: '02' },
  { id: 'devices', label: 'DEVICE COMMAND', code: '03' },
  { id: 'vision', label: 'VISION & INTELLIGENCE', code: '04' },
]

export function CommandCenter({ connected }: { connected: string[] }) {
  const [area, setArea] = useState<Area>('core')
  const phase = useStore((s) => s.phase)
  const looking = useStore((s) => s.looking)
  const turns = useStore((s) => s.turns)
  const activeTool = useStore((s) => s.activeTool)

  return (
    <section className="command-center" aria-label="JARVIS command center">
      <nav className="command-nav" aria-label="Intelligence systems">
        {areas.map((item) => (
          <button
            key={item.id}
            className={area === item.id ? 'command-tab active' : 'command-tab'}
            onClick={() => setArea(item.id)}
            type="button"
          >
            <span>{item.code}</span>{item.label}
          </button>
        ))}
      </nav>

      <div className="command-panel">
        <div className="command-panel-head">
          <span>J.A.R.V.I.S. / {areas.find((item) => item.id === area)?.label}</span>
          <span className="command-live"><i /> {phase.toUpperCase()}</span>
        </div>

        {area === 'core' && (
          <div className="core-overview">
            <div className="core-orbit" aria-hidden="true">
              <div className="core-orbit-ring ring-a" />
              <div className="core-orbit-ring ring-b" />
              <div className="core-orbit-ring ring-c" />
              <div className="core-nucleus">J</div>
              <span className="core-node node-a" /><span className="core-node node-b" />
              <span className="core-node node-c" /><span className="core-node node-d" />
            </div>
            <div className="core-readouts">
              <div><small>COGNITIVE STATE</small><strong>{phase.toUpperCase()}</strong></div>
              <div><small>ACTIVE PROCESS</small><strong>{activeTool ? activeTool.replace(/[_-]/g, ' ').toUpperCase() : 'STANDBY'}</strong></div>
              <div><small>CONVERSATION CONTEXT</small><strong>{turns.length} RECORDED TURNS</strong></div>
              <div><small>CONNECTED SYSTEMS</small><strong>{connected.length} REPORTED CONNECTIONS</strong></div>
            </div>
          </div>
        )}

        {area === 'memory' && (
          <div className="memory-constellation">
            <div className="command-note"><b>ACCOUNT-SCOPED MEMORY</b><span>Sign in to view this account's pending facts, manage explicit memory consent, and review approved-memory settings. The 3D constellation remains a visual map of knowledge domains, not a claim that records are already connected.</span></div>
            <CloudMemoryPanel />
          </div>
        )}

        {area === 'devices' && (
          <div className="device-grid">
            {['BMW', 'BLINK CAMERAS', 'DREAME', 'SMART LIGHTING', 'COMPUTER', 'MOBILE'].map((device) => {
              const match = connected.find((item) => item.toLowerCase().includes(device.split(' ')[0].toLowerCase()))
              return <article className="device-card" key={device}>
                <span className="device-glyph">{device === 'BMW' ? '◈' : device === 'BLINK CAMERAS' ? '◎' : device === 'DREAME' ? '◉' : '⌘'}</span>
                <b>{device}</b>
                <small className={match ? 'device-state is-connected' : 'device-state'}>{match ? 'CONNECTED' : 'NOT CONNECTED / NOT VERIFIED'}</small>
                <span className="device-detail">{match ?? 'Integration adapter not yet verified'}</span>
              </article>
            })}
          </div>
        )}

        {area === 'vision' && (
          <div className="vision-overview">
            <div className="vision-reticle"><span /><i /><b>VISION SENSOR</b></div>
            <div className="core-readouts">
              <div><small>CAMERA / GESTURE MODE</small><strong>{looking ? `ACTIVE · ${looking.toUpperCase()}` : 'NOT ACTIVE'}</strong></div>
              <div><small>PERCEPTION INPUT</small><strong>USER-SHARED IMAGE / CAMERA SESSION</strong></div>
              <div><small>INTERPRETATION</small><strong>AVAILABLE THROUGH CONVERSATION WHEN INPUT IS PROVIDED</strong></div>
              <div><small>PRIVACY</small><strong>CAMERA IS NOT ASSUMED TO BE ALWAYS ON</strong></div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
