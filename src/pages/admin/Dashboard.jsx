import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, BarChart, Bar, LabelList,
} from 'recharts';
import {
  Users, GraduationCap, UserCog, School, Wallet, TrendingUp, UserPlus, CreditCard,
  ClipboardList, FileQuestion, UploadCloud, Megaphone, Plus, CalendarDays, ShieldCheck,
  BookOpen, Building2, Banknote, Activity, FileText, Settings, Bell, UserRoundPlus,
} from 'lucide-react';
import DashboardLayout from '../../components/DashboardLayout.jsx';
import { DashboardSkeleton } from '../../components/Skeleton.jsx';
import Panel from '../../components/dashboard/Panel.jsx';
import RecentActivities from '../../components/dashboard/RecentActivities.jsx';
import MiniCalendar from '../../components/dashboard/MiniCalendar.jsx';
import api from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { firstName, greeting, kes } from '../../utils/format.js';

const CHART_COLORS = {
  light: { grid: '#DCE7F0', text: '#61768A', line: '#2F86E6', fill: '#5AA7F0', green: '#32C89B', tipBg: '#fff', tipBorder: '#D7E3EC', tipText: '#102A43' },
  dark: { grid: '#263B4D', text: '#9DB1C0', line: '#5AA7F0', fill: '#2F86E6', green: '#3DD6A5', tipBg: '#102334', tipBorder: '#294257', tipText: '#E6EEF5' },
};

const FACULTY_COLORS = ['#3B8EF3', '#2F6FE0', '#F27667', '#2DC4C8', '#8A67E8', '#F1B33C', '#B58BEA', '#45C89A'];
const QUICK_STAT_ICONS = { graduation: GraduationCap, users: Users, library: BookOpen, revenue: Wallet };

const QUICK_ACTIONS = [
  { to: '/admin/students', label: 'Add Student', icon: UserPlus, tone: 'blue' },
  { to: '/admin/users', label: 'Add Staff', icon: UserRoundPlus, tone: 'green' },
  { to: '/admin/reports/academic', label: 'Generate Report', icon: FileText, tone: 'purple' },
  { to: '/admin/fees', label: 'Make Payment', icon: Banknote, tone: 'orange' },
  { to: '/university', label: 'Create Program', icon: BookOpen, tone: 'teal' },
  { to: '/admin/documents', label: 'Upload Document', icon: UploadCloud, tone: 'red' },
];

function pct(part, whole) { return whole ? Math.round((part / whole) * 100) : 0; }

function Stat({ icon: Icon, label, value, hint, tone = 'blue' }) {
  return (
    <div className="dashboard-stat">
      <div className={`dashboard-stat-icon ${tone}`}><Icon size={22} strokeWidth={2} /></div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-ink/55">{label}</p>
        <p className="mt-1 whitespace-nowrap text-[19px] font-extrabold tracking-tight text-ink sm:text-[21px] xl:text-[19px] 2xl:text-[22px]" title={String(value)}>{value}</p>
        <p className="mt-1 text-[11px] font-medium text-ink/45">{hint}</p>
      </div>
    </div>
  );
}

function ChartTooltip({ colors, ...props }) {
  return <Tooltip cursor={{ stroke: colors.grid }} contentStyle={{ borderRadius: 12, border: `1px solid ${colors.tipBorder}`, background: colors.tipBg, color: colors.tipText, fontSize: 12 }} labelStyle={{ color: colors.tipText, fontWeight: 700 }} itemStyle={{ color: colors.tipText }} {...props} />;
}

function Banner({ name, branding }) {
  const now = new Date();
  const date = now.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  const time = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
  return (
    <div className="dashboard-welcome">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[.13em] text-forest">University administration</p>
        <h1 className="mt-2 font-display text-[27px] font-extrabold tracking-tight text-ink sm:text-[30px]">{greeting()}, {firstName(name)} <span aria-hidden>👋</span></h1>
        <p className="mt-1 text-sm text-ink/60">Here's what's happening at Matara University today.</p>
      </div>
      <div className="hidden shrink-0 text-right md:block">
        <p className="text-xs font-medium text-ink/50">{date}</p>
        <p className="mt-1 text-[26px] font-extrabold text-navy dark:text-ink">{time}</p>
        <p className="text-[10px] font-semibold text-ink/40">EAT (GMT+3)</p>
      </div>
      <div className="dashboard-campus-banner" style={branding?.dashboardImage ? { backgroundImage: `url(${branding.dashboardImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}>
        {!branding?.dashboardImage && <div className="dashboard-campus-art" aria-hidden>
          <div className="building-roof" />
          <div className="building-main"><span /><span /><span /><span /><span /><span /></div>
          <div className="building-ground" />
          <div className="tree tree-a" /><div className="tree tree-b" />
        </div>}
        <div className="relative z-10 ml-auto max-w-[220px] pr-5 text-right text-white">
          <p className="text-base font-bold sm:text-lg">{branding?.universityName || 'Matara University'}</p>
          <p className="mt-1 text-[11px] text-white/80">Building Futures, Shaping Leaders</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const colors = CHART_COLORS[theme === 'dark' ? 'dark' : 'light'];
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  function load() {
    setError('');
    api.get('/dashboard/overview')
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Could not load the dashboard. Check that the backend is running.'));
  }
  useEffect(() => { load(); }, []);

  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);

  const facultyTotal = useMemo(() => (data?.distribution || []).reduce((s, x) => s + Number(x.value || 0), 0), [data]);
  const performanceMax = Math.max(5, ...((data?.performance || []).map((x) => Number(x.gpa || 0))));

  if (error) return <DashboardLayout hideTitle><div className="card mx-auto max-w-md p-8 text-center"><p className="text-sm text-ink/70">{error}</p><button className="btn-primary mt-4" onClick={load}>Try again</button></div></DashboardLayout>;
  if (!data) return <DashboardLayout hideTitle><DashboardSkeleton /></DashboardLayout>;

  const { totals, fees, enrolment, events, activities, attendance, distribution, performance, quickStats, systemStatus } = data;
  const upcoming = (events || []).filter((e) => e.event_date >= todayIso).slice(0, 4);
  const monthName = today.toLocaleDateString('en-GB', { month: 'long' });
  const allSystems = systemStatus.every((s) => s.ok);

  return (
    <DashboardLayout hideTitle>
      <div className="dashboard-page">
        <Banner name={user?.name} branding={data?.branding} />

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
          <Stat icon={Users} label="Total Students" value={totals.students.toLocaleString()} hint="Active university students" />
          <Stat icon={GraduationCap} label="Total Lecturers" value={totals.teachers.toLocaleString()} hint="Active academic staff" tone="indigo" />
          <Stat icon={UserCog} label="Total Staff" value={totals.staff.toLocaleString()} hint="Active non-academic staff" tone="green" />
          <Stat icon={School} label="Total Programs" value={totals.programs.toLocaleString()} hint="Active university programmes" tone="purple" />
          <Stat icon={Wallet} label="Outstanding Fees" value={kes(fees.outstanding)} hint={`${fees.percent}% of billed fees collected`} tone="orange" />
          <Stat icon={Users} label="Active Users" value={totals.activeUsers.toLocaleString()} hint="Accounts currently active" tone="blue" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,.85fr)_300px]">
          <Panel icon={TrendingUp} title="Student Enrollment Trend" subtitle="Last 6 recorded months" action={<select className="dashboard-select" defaultValue="all"><option value="all">All Campuses</option></select>}>
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={enrolment} margin={{ top: 18, right: 8, left: -18, bottom: 0 }}>
                <defs><linearGradient id="student-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={colors.fill} stopOpacity={0.32} /><stop offset="1" stopColor={colors.fill} stopOpacity={0.02} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: colors.text }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: colors.text }} axisLine={false} tickLine={false} />
                <ChartTooltip colors={colors} formatter={(v) => [Number(v).toLocaleString(), 'Students']} />
                <Area type="monotone" dataKey="students" stroke={colors.line} strokeWidth={2.5} fill="url(#student-area)" dot={{ r: 3, fill: colors.line, strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </Panel>

          <Panel icon={Users} title="Student Distribution" subtitle="By faculty" action={<select className="dashboard-select" defaultValue="all"><option value="all">All Faculties</option></select>}>
            {distribution.length ? <div className="flex items-center gap-3 py-1">
              <div className="relative h-[185px] w-[185px] shrink-0">
                <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={distribution} dataKey="value" nameKey="name" innerRadius={54} outerRadius={78} paddingAngle={2} stroke="none">
                  {distribution.map((_, i) => <Cell key={i} fill={FACULTY_COLORS[i % FACULTY_COLORS.length]} />)}
                </Pie></PieChart></ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><strong className="text-xl text-ink">{facultyTotal.toLocaleString()}</strong><span className="text-[10px] text-ink/50">Total Students</span></div>
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                {distribution.slice(0, 6).map((item, i) => <div key={item.name} className="flex items-center justify-between gap-2 text-[11px]"><span className="flex min-w-0 items-center gap-2 truncate"><i className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: FACULTY_COLORS[i % FACULTY_COLORS.length] }} />{item.name}</span><span className="font-semibold text-ink/65">{Number(item.value).toLocaleString()} ({pct(item.value, facultyTotal)}%)</span></div>)}
              </div>
            </div> : <p className="py-14 text-center text-sm text-ink/45">No faculty enrolment data yet.</p>}
          </Panel>

          <Panel icon={Plus} title="Quick Actions">
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map(({ to, label, icon: Icon, tone }) => <Link key={label} to={to} className={`quick-action ${tone}`}><Icon size={18} /><span>{label}</span></Link>)}
            </div>
          </Panel>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1.15fr)_300px]">
          <Panel title="Recent Activities" action={<Link to="/admin/reports/activity" className="text-xs font-semibold text-forest">View All</Link>}>
            <RecentActivities items={activities} embedded />
          </Panel>

          <Panel icon={Activity} title="Academic Performance" subtitle="Average GPA by faculty">
            <ResponsiveContainer width="100%" height={205}>
              <BarChart data={performance} margin={{ top: 18, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: colors.text }} axisLine={false} tickLine={false} interval={0} />
                <YAxis domain={[0, performanceMax]} tick={{ fontSize: 10, fill: colors.text }} axisLine={false} tickLine={false} />
                <ChartTooltip colors={colors} formatter={(v) => [Number(v).toFixed(2), 'Average GPA']} />
                <Bar dataKey="gpa" fill={colors.fill} radius={[7, 7, 0, 0]} maxBarSize={34}><LabelList dataKey="gpa" position="top" formatter={(v) => Number(v).toFixed(1)} style={{ fontSize: 10, fill: colors.tipText }} /></Bar>
              </BarChart>
            </ResponsiveContainer>
          </Panel>

          <Panel icon={CalendarDays} title="Academic Calendar" action={<Link to="/admin/events" className="text-[11px] font-semibold text-forest">View Full Calendar</Link>}>
            <MiniCalendar events={events} embedded title={monthName} />
          </Panel>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
          <Panel title="Quick Stats">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {quickStats.map((s) => { const Icon = QUICK_STAT_ICONS[s.icon] || Activity; return <div key={s.label} className="quick-stat"><span className="icon-bubble h-9 w-9"><Icon size={17} /></span><div><p className="text-[10px] text-ink/50">{s.label}</p><p className="text-base font-extrabold text-ink">{s.value}</p><p className="text-[10px] font-semibold text-emerald-500">{s.hint}</p></div></div>; })}
            </div>
          </Panel>

          <Panel icon={ShieldCheck} title="System Status" action={<span className={`status-online ${allSystems ? "" : "!bg-clay/10 !text-clay"}`}>● {allSystems ? "All Systems Operational" : "Attention Required"}</span>}>
            <div className="space-y-2.5">
              {systemStatus.map((s) => <div key={s.label} className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-ink/70"><i className={`status-dot ${s.ok ? '' : 'offline'}`} />{s.label}</span><span className={s.ok ? 'text-emerald-500' : 'text-clay'}>{s.ok ? 'Online' : 'Check'}</span></div>)}
            </div>
          </Panel>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel icon={Wallet} title="Fee Collection" subtitle="Current university receivables">
            <div className="grid grid-cols-3 gap-3">
              <div><p className="text-[11px] text-ink/50">Collected</p><p className="mt-1 font-extrabold text-ink">{kes(fees.collected)}</p></div>
              <div><p className="text-[11px] text-ink/50">Outstanding</p><p className="mt-1 font-extrabold text-ink">{kes(fees.outstanding)}</p></div>
              <div><p className="text-[11px] text-ink/50">Collection rate</p><p className="mt-1 font-extrabold text-forest">{fees.percent}%</p></div>
            </div>
          </Panel>
          <Panel icon={Bell} title="Upcoming Events">
            {upcoming.length ? <div className="space-y-2">{upcoming.map((e) => <Link key={e.id} to="/admin/events" className="flex items-center gap-3 rounded-xl p-2 hover:bg-forest/5"><span className="rounded-lg bg-forest/10 px-2 py-1 text-center text-[10px] font-bold text-forest">{new Date(e.event_date + 'T00:00:00').getDate()}</span><span className="min-w-0 truncate text-xs font-semibold text-ink">{e.title}</span><span className="ml-auto text-[10px] text-ink/40">{e.event_date}</span></Link>)}</div> : <p className="py-5 text-center text-sm text-ink/45">No upcoming university events.</p>}
          </Panel>
        </div>
      </div>
    </DashboardLayout>
  );
}
