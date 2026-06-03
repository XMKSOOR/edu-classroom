import { useState, useEffect } from 'react';
import Topbar from '../components/Topbar';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase/auth';
import { getAllClassesRef, onSnapshot } from '../firebase/firestore';

export default function Profile() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(getAllClassesRef(), snap => {
      setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  const myClasses = classes.filter(c => c.members?.includes(user?.uid));
  const totalTasks = myClasses.reduce((s, c) => s + (c.assignments_data || []).length, 0);
  const doneTasks = myClasses.reduce((s, c) =>
    s + (c.assignments_data || []).filter(a => (a.submissions || []).some(sub => sub.uid === user?.uid)).length, 0);

  return (
    <div className="app-wrapper">
      <Topbar />
      <main className="main-content">
        <div className="section-header"><span>الملف الشخصي</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
          <section className="card" style={{ textAlign: 'center' }} aria-label="صورة الملف">
            <figure className="avatar" style={{ width: 80, height: 80, fontSize: 32, margin: '0 auto 12px', background: 'var(--primary)', color: '#fff' }} aria-label="الصورة الرمزية">
              {user?.name?.substring(0, 2) || '?'}
            </figure>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>{user?.name || '—'}</h2>
            <p style={{ fontSize: 14, color: 'var(--text2)', margin: '4px 0 16px' }}>{user?.role === 'teacher' ? 'معلم' : 'طالب'}</p>
            <span className="person-role-badge" style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '4px 16px', fontSize: 13 }}>
              {user?.role === 'teacher' ? 'معلم' : 'طالب'}
            </span>
            <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '20px 0' }} />
            <button className="btn btn-danger btn-sm" onClick={() => { auth.signOut(); localStorage.removeItem('edu_user'); }}>
              <i className="ti ti-logout" aria-hidden="true"></i> تسجيل الخروج
            </button>
          </section>
          <div>
            <article className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>معلومات الحساب</h3>
              <div className="form-group"><label htmlFor="profName">الاسم الكامل</label><input id="profName" value={user?.name || ''} disabled /></div>
              <div className="form-group"><label htmlFor="profEmail">البريد الإلكتروني</label><input id="profEmail" value={auth.currentUser?.email || ''} disabled /></div>
              <div className="form-group"><label htmlFor="profRole">الدور</label><input id="profRole" value={user?.role === 'teacher' ? 'معلم' : 'طالب'} disabled /></div>
            </article>
            <article className="card">
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>إحصائيات سريعة</h3>
              <section aria-label="إحصائيات المستخدم">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ textAlign: 'center', background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', padding: 16 }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--primary)' }}>{myClasses.length}</div>
                    <div style={{ fontSize: 13, color: 'var(--text2)' }}>صفوف مسجلة</div>
                  </div>
                  <div style={{ textAlign: 'center', background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', padding: 16 }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--green)' }}>{totalTasks}</div>
                    <div style={{ fontSize: 13, color: 'var(--text2)' }}>إجمالي المهام</div>
                  </div>
                  <div style={{ textAlign: 'center', background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', padding: 16 }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--purple)' }}>{doneTasks}</div>
                    <div style={{ fontSize: 13, color: 'var(--text2)' }}>مهام مكتملة</div>
                  </div>
                  <div style={{ textAlign: 'center', background: 'var(--surface2)', borderRadius: 'var(--radius-sm)', padding: 16 }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--orange)' }}>{totalTasks - doneTasks}</div>
                    <div style={{ fontSize: 13, color: 'var(--text2)' }}>مهام معلقة</div>
                  </div>
                </div>
              </section>
            </article>
          </div>
        </div>
      </main>
    </div>
  );
}
