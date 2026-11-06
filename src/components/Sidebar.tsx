import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Icon, type IconName } from './Icon'
import brand from '../assets/resolvai-original.svg'

type SidebarProps = {
  mobileOpen: boolean
  setMobileOpen: Dispatch<SetStateAction<boolean>>
  userName: string
  onProfile: () => void
}

const items: { to: string; label: string; icon: IconName; match: (path: string) => boolean }[] = [
  { to: '/', label: 'Início', icon: 'grid', match: (path) => path === '/' },
  { to: '/pedidos', label: 'Pedidos abertos', icon: 'bag', match: (path) => path.startsWith('/pedidos') },
  { to: '/propostas', label: 'Minhas propostas', icon: 'file', match: (path) => path.startsWith('/propostas') },
]

export function Sidebar({ mobileOpen, setMobileOpen, userName, onProfile }: SidebarProps) {
  const location = useLocation()
  const sidebarRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!mobileOpen) return
    const previousFocus = document.activeElement as HTMLElement | null
    const elements = sidebarRef.current?.querySelectorAll<HTMLElement>('a[href], button')
    const first = elements?.[0]
    const last = elements?.[elements.length - 1]
    first?.focus()
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMobileOpen(false)
      if (event.key === 'Tab') {
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => { document.removeEventListener('keydown', handleKey); previousFocus?.focus() }
  }, [mobileOpen, setMobileOpen])

  return (
    <>
      {mobileOpen && <button className="sidebar-overlay" aria-label="Fechar menu" onClick={() => setMobileOpen(false)} />}
      <aside ref={sidebarRef} className={`sidebar ${mobileOpen ? 'is-open' : ''}`} aria-label="Menu principal">
        <div className="sidebar-content">
          <Link className="brand" to="/" aria-label="ResolvAI — início do prestador" onClick={() => setMobileOpen(false)}>
            <img src={brand} alt="ResolvAI" />
          </Link>
          <nav>
            <p className="nav-label">PRESTADOR</p>
            {items.map((item) => {
              const active = item.match(location.pathname)
              return (
                <Link key={item.to} to={item.to} className={`nav-item ${active ? 'active' : ''}`}
                  aria-current={active ? 'page' : undefined} onClick={() => setMobileOpen(false)}>
                  <Icon name={item.icon} /><span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
        <div className="sidebar-bottom">
          <button className="sidebar-profile" aria-label={`Abrir perfil de ${userName}`} onClick={() => { setMobileOpen(false); onProfile() }}>
            <span className="avatar">{userName.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>
            <span><strong>{userName}</strong><small>Prestador</small></span>
            <Icon name="chevron" size={16} />
          </button>
        </div>
      </aside>
    </>
  )
}
