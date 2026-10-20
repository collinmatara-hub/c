import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronRight, LogOut, Palette } from 'lucide-react';
import Crest from './Crest.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { navFor } from '../config/nav.js';
import { roleLabel } from '../config/roles.js';
import api from '../api/axios.js';

function NavGroup({ item, onNavigate }) {
  const { pathname } = useLocation();
  const Icon = item.icon;
  const childActive = item.children.some((c) => pathname === c.to || pathname.startsWith(c.to + '/'));
  const [open, setOpen] = useState(childActive);
  useEffect(() => { if (childActive) setOpen(true); }, [childActive]);
  return <div>
    <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className={`nav-link sidebar-nav-link justify-between ${childActive ? 'active' : ''}`}>
      <span className="flex items-center gap-3"><Icon size={18} strokeWidth={2} />{item.label}</span>
      <ChevronRight size={15} className={`opacity-50 transition-transform ${open ? 'rotate-90' : ''}`} />
    </button>
    {open && <div className="mt-0.5 space-y-0.5 pb-1">{item.children.map((child) => <NavLink key={`${child.to}-${child.label}`} to={child.to} onClick={onNavigate} className={({ isActive }) => `sidebar-sub-link ${isActive ? 'active' : ''}`}>{child.label}</NavLink>)}</div>}
  </div>;
}

export function SidebarNav({ onNavigate }) {
  const { user } = useAuth();
  const [creativeAccess, setCreativeAccess] = useState(false);
  useEffect(() => { let live=true; if(user){ api.get('/creatives/me').then(({data})=>{if(live)setCreativeAccess(Boolean(data.superAdmin || data.permissions?.length));}).catch(()=>{if(live)setCreativeAccess(false)}); } return ()=>{live=false}; }, [user?.id,user?.role]);
  const navItems = [...navFor(user?.role)];
  if (creativeAccess && !navItems.some(item => item.to === '/admin/creatives' || item.children?.some(child => child.to === '/admin/creatives'))) navItems.push({to:'/admin/creatives',label:'Creative Studio',icon:Palette});
  return <nav className="space-y-1" aria-label="Main menu">
    {navItems.map((item) => item.children
      ? <NavGroup key={item.label} item={item} onNavigate={onNavigate} />
      : <NavLink key={item.to} to={item.to} end={item.end} onClick={onNavigate} className={({ isActive }) => `nav-link sidebar-nav-link ${isActive ? 'active' : ''}`}><item.icon size={18} strokeWidth={2} /><span>{item.label}</span></NavLink>)}
  </nav>;
}

export default function Sidebar() {
  const { user, logout } = useAuth();
  return <aside className="sidebar-shell">
    <div className="sidebar-brand">
      <Crest size={42} />
      <div className="min-w-0"><p className="whitespace-nowrap text-[15px] font-extrabold tracking-tight text-white">MATARA UNIVERSITY</p><p className="text-[9px] font-medium tracking-wide text-white/70">Knowledge <span className="px-0.5">•</span> Integrity <span className="px-0.5">•</span> Excellence</p></div>
    </div>
    <div className="sidebar-scroll"><SidebarNav /></div>
    <div className="sidebar-footer">
      <div className="flex items-center gap-3">{user?.profile_image_url ? <img src={user.profile_image_url} alt="" className="h-9 w-9 rounded-full object-cover"/> : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">{user?.name?.split(' ').map((x) => x[0]).slice(0,2).join('').toUpperCase() || 'SA'}</span>}<div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-white">{user?.name || 'Administrator'}</p><p className="truncate text-[10px] text-white/55">{roleLabel(user?.role)}</p></div><button onClick={logout} className="text-white/55 transition hover:text-white" title="Sign out"><LogOut size={16} /></button></div>
    </div>
  </aside>;
}
