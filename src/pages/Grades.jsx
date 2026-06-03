import { useState, useEffect } from 'react';
import Topbar from '../components/Topbar';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { getAllClassesRef, onSnapshot } from '../firebase/firestore';

const COLORS = [
  { grad: 'linear-gradient(135deg,#1a73e8,#0d47a1)', bg: '#1a73e8' },
  { grad: 'linear-gradient(135deg,#e8710a,#bf360c)', bg: '#e8710a' },
  { grad: 'linear-gradient(135deg,#0d652d,#1b5e20)', bg: '#0d652d' },
  { grad: 'linear-gradient(135deg,#9334e6,#6a1b9a)', bg: '#9334e6' },
  { grad: 'linear-gradient(135deg,#c5221f,#b71c1c)', bg: '#c5221f' },
  { grad: 'linear-gradient(135deg,#f9ab00,#e65100)', bg: '#f9ab00' },
];

export default function Grades() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(getAllClassesRef(), snap => {
      setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) return <LoadingSpinner />;

  const myClasses = classes.filter(c => c.members?.includes(user?.uid));
  const isTeacher = user?.role === 'teacher';

  return (
    <div className="app-wrapper">
      <Topbar />
      <main className="main-content">
        <section aria-label="سجل الدرجات">
          <div className="section-header"><span>سجل الدرجات</span></div>
          {myClasses.length ? myClasses.map(c => {
            const col = COLORS[c.color] || COLORS[0];
            return (
              <article key={c.id} className="card" style={{ marginBottom: 16 }}>
                <header className="card-header">
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: col.bg }} aria-hidden="true"></div>
                  <h3>{c.name}</h3>
                </header>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(c.assignments_data || []).length ? c.assignments_data.map(a => {
                    const userSub = (a.submissions || []).find(s => s.uid === user?.uid);
                    let label, color;
                    if (isTeacher) {
                      const subCount = (a.submissions || []).length;
                      const memberCount = (c.members || []).filter(m => m !== c.teacherId).length || 1;
                      label = `${subCount}/${memberCount} سلَّم`;
                      color = subCount > 0 ? 'var(--green)' : 'var(--text3)';
                    } else {
                      const status = userSub ? 'done' : (a.dueISO && new Date(a.dueISO) < new Date() ? 'late' : 'pending');
                      const gradeMap = { done: 'مُسلَّم', pending: '—', late: 'متأخر' };
                      const colorMap = { done: 'var(--green)', pending: 'var(--text3)', late: 'var(--red)' };
                      label = gradeMap[status] || '—';
                      color = colorMap[status] || 'var(--text3)';
                    }
                    return (
                      <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8 }}>
                        <span style={{ fontSize: 14 }}>{a.title}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          <span style={{ fontSize: 12, color: 'var(--text3)' }}>{a.points || 0} درجة</span>
                          <span style={{ fontSize: 13, fontWeight: 600, color }}>{label}</span>
                        </div>
                      </div>
                    );
                  }) : <div style={{ textAlign: 'center', padding: 20, color: 'var(--text3)' }}>لا توجد مهام</div>}
                </div>
              </article>
            );
          }) : <div className="empty-state"><i className="ti ti-chart-bar" aria-hidden="true"></i><h3>لا توجد درجات بعد</h3></div>}
        </section>
      </main>
    </div>
  );
}
