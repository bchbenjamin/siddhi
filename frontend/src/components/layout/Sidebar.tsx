import { NavLink } from 'react-router-dom';
import {
  Home, Users, BookOpen, Heart, Menu, FileText, Calendar,
  ClipboardCheck, BarChart2, UserCog, LogOut, User, GraduationCap
} from 'lucide-react';
import { useAuth } from '../../app/AuthContext';
import type { Role } from '../../types';
import { initials } from '../../lib/utils';

interface NavItem {
  label: string;
  to: string;
  icon: React.ReactNode;
}

function getNavItems(role: Role): NavItem[] {
  switch (role) {
    case 'guardian':
      return [
        { label: 'Home', to: '/guardian', icon: <Home size={18} /> },
        { label: 'My Profile', to: '/guardian/profile', icon: <User size={18} /> },
        { label: 'Reports', to: '/reports', icon: <BarChart2 size={18} /> },
      ];
    case 'special_educator':
      return [
        { label: 'Dashboard', to: '/staff', icon: <Home size={18} /> },
        { label: 'Students', to: '/students', icon: <Users size={18} /> },
        { label: 'IEP Goals', to: '/students', icon: <BookOpen size={18} /> },
        { label: 'Attendance', to: '/students', icon: <Calendar size={18} /> },
        { label: 'Reviews', to: '/students', icon: <ClipboardCheck size={18} /> },
        { label: 'Reports', to: '/reports', icon: <BarChart2 size={18} /> },
      ];
    case 'therapist':
      return [
        { label: 'Dashboard', to: '/staff', icon: <Home size={18} /> },
        { label: 'Students', to: '/students', icon: <Users size={18} /> },
        { label: 'Therapy', to: '/students', icon: <Heart size={18} /> },
        { label: 'Reports', to: '/reports', icon: <BarChart2 size={18} /> },
      ];
    case 'psychologist':
      return [
        { label: 'Dashboard', to: '/staff', icon: <Home size={18} /> },
        { label: 'Students', to: '/students', icon: <Users size={18} /> },
        { label: 'Assessments', to: '/students', icon: <FileText size={18} /> },
        { label: 'Reports', to: '/reports', icon: <BarChart2 size={18} /> },
      ];
    case 'school_head':
      return [
        { label: 'Dashboard', to: '/staff', icon: <Home size={18} /> },
        { label: 'Students', to: '/students', icon: <Users size={18} /> },
        { label: 'IEP Reviews', to: '/students', icon: <ClipboardCheck size={18} /> },
        { label: 'Reports', to: '/reports', icon: <BarChart2 size={18} /> },
      ];
    case 'school_admin':
      return [
        { label: 'Dashboard', to: '/staff', icon: <Home size={18} /> },
        { label: 'Students', to: '/students', icon: <Users size={18} /> },
        { label: 'Users', to: '/staff', icon: <UserCog size={18} /> },
        { label: 'Reports', to: '/reports', icon: <BarChart2 size={18} /> },
      ];
    default:
      return [];
  }
}

interface SidebarProps {
  mobile?: boolean;
  onNavigate?: () => void;
}

export function Sidebar({ mobile = false, onNavigate }: SidebarProps) {
  const { user, logout } = useAuth();

  if (!user) return null;

  const navItems = getNavItems(user.active_role);

  return (
    <aside
      className={
        mobile
          ? 'flex flex-col w-72 max-w-[85vw] bg-white min-h-screen shadow-xl'
          : 'hidden md:flex flex-col w-16 lg:w-56 bg-white border-r border-bone min-h-screen'
      }
      aria-label="Main navigation"
    >
      {/* Logo area */}
      <div className="flex items-center gap-2 px-3 py-4 border-b border-bone">
        <div className="w-8 h-8 rounded-lg bg-burnt-amber flex items-center justify-center flex-shrink-0">
          <GraduationCap size={16} className="text-white" aria-hidden="true" />
        </div>
        <span className={mobile ? 'text-sm font-medium text-ink-black tracking-tight' : 'hidden lg:block text-sm font-medium text-ink-black tracking-tight'}>Siddhi</span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-4 px-2 space-y-1" aria-label="Sidebar navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.label + item.to}
            to={item.to}
            onClick={onNavigate}
            title={item.label}
            className={({ isActive }) =>
              `flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors duration-150
               ${isActive
                 ? 'bg-pale-sage text-ink-black font-medium'
                 : 'text-slate-gray hover:text-ink-black hover:bg-bone'
               }`
            }
          >
            <span className="flex-shrink-0" aria-hidden="true">{item.icon}</span>
            <span className={mobile ? 'truncate' : 'hidden lg:block truncate'}>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User area + logout */}
      <div className="p-2 border-t border-bone space-y-1">
        <div className="flex items-center gap-2 px-2 py-2">
          <div
            className="w-7 h-7 rounded-full bg-lavender-mist flex items-center justify-center flex-shrink-0 text-xs font-medium text-deep-violet"
            aria-hidden="true"
          >
            {initials(user.full_name)}
          </div>
          <div className={mobile ? 'min-w-0' : 'hidden lg:block min-w-0'}>
            <p className="text-xs font-medium text-ink-black truncate">{user.full_name}</p>
            <p className="text-xs text-mist-gray truncate capitalize">{user.active_role.replace('_', ' ')}</p>
          </div>
        </div>
        <button
          onClick={() => logout()}
          title="Log out"
          className="flex items-center gap-3 w-full px-2 py-2 rounded-lg text-sm text-slate-gray hover:text-ink-black hover:bg-bone transition-colors"
        >
          <LogOut size={18} aria-hidden="true" />
          <span className={mobile ? '' : 'hidden lg:block'}>Log out</span>
        </button>
      </div>
    </aside>
  );
}

/** Mobile top bar with hamburger */
export function MobileTopBar({ onMenuOpen }: { onMenuOpen: () => void }) {
  const { user } = useAuth();
  return (
    <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-bone">
      <button
        onClick={onMenuOpen}
        aria-label="Open navigation menu"
        className="p-1 rounded text-slate-gray hover:text-ink-black"
      >
        <Menu size={20} />
      </button>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-full bg-lavender-mist flex items-center justify-center text-xs font-medium text-deep-violet">
          {user ? initials(user.full_name) : '?'}
        </div>
      </div>
    </header>
  );
}
