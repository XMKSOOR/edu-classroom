import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useNotify } from '../contexts/NotificationContext';
import { db, getAllClassesRef, onSnapshot, collection, doc, query, where, getDocs, setDoc, updateDoc, deleteDoc, arrayUnion, increment } from '../firebase/firestore';

const COLORS = [
  { grad: 'linear-gradient(135deg,#1a73e8,#0d47a1)', bg: '#1a73e8' },
  { grad: 'linear-gradient(135deg,#e8710a,#bf360c)', bg: '#e8710a' },
  { grad: 'linear-gradient(135deg,#0d652d,#1b5e20)', bg: '#0d652d' },
  { grad: 'linear-gradient(135deg,#9334e6,#6a1b9a)', bg: '#9334e6' },
  { grad: 'linear-gradient(135deg,#c5221f,#b71c1c)', bg: '#c5221f' },
  { grad: 'linear-gradient(135deg,#f9ab00,#e65100)', bg: '#f9ab00' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { notify } = useNotify();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createSubject, setCreateSubject] = useState('');
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    const unsub = onSnapshot(getAllClassesRef(), snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setClasses(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  function getColor(idx) { return COLORS[idx % COLORS.length]; }

  async function createClass() {
    if (!createName || !createSubject) { notify('يرجى ملء جميع الحقول المطلوبة'); return; }
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const classData = {
      name: createName, subject: createSubject, code, teacher: user?.name, teacherId: user?.uid,
      color: classes.length % COLORS.length, students: 1,
      members: [user?.uid], stream: [], assignments_data: [], lessons_data: [], progress: 0,
      createdAt: Date.now()
    };
    try {
      const ref = doc(collection(db, 'classes'));
      await setDoc(ref, classData);
      setShowCreate(false);
      setCreateName(''); setCreateSubject('');
      notify('تم إنشاء الصف! رمز الصف: ' + code + ' ✅');
    } catch (e) { notify(e.message); }
  }

  async function joinClass() {
    if (!joinCode) { notify('أدخل رمز الصف أولاً ⚠️'); return; }
    try {
      const q = query(getAllClassesRef(), where('code', '==', joinCode.toUpperCase()));
      const snap = await getDocs(q);
      if (snap.empty) { notify('لم يُعثر على صف بهذا الرمز'); return; }
      const docRef = snap.docs[0];
      const data = docRef.data();
      if (data.members?.includes(user?.uid)) { notify('أنت مسجل بالفعل'); return; }
      await updateDoc(docRef.ref, {
        members: arrayUnion(user?.uid),
        students: increment(1)
      });
      setShowJoin(false);
      setJoinCode('');
      notify('تم الانضمام بنجاح! 🎉');
    } catch (e) { notify(e.message); }
  }

  async function deleteClass(id) {
    if (user?.role !== 'teacher') { notify('فقط المعلم يمكنه حذف الصف'); return; }
    try {
      await deleteDoc(doc(db, 'classes', id));
      notify('تم حذف الصف بنجاح 🗑️');
    } catch (e) { notify(e.message); }
  }

  if (loading) return <LoadingSpinner />;

  const myClasses = classes.filter(c => c.members?.includes(user?.uid));
  const isTeacher = user?.role === 'teacher';
  const name = user?.name || '';

  return (
    <div className="app-wrapper">
      <Topbar />
      <main className="main-content">
        <section className="join-banner">
          <div><i className="ti ti-school" aria-hidden="true"></i><div><h3>مرحباً، {name}</h3><p>تابع مهامك ودروسك اليوم</p></div></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowJoin(true)}><i className="ti ti-user-plus" aria-hidden="true"></i> انضمام</button>
            {isTeacher && <button className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}><i className="ti ti-plus" aria-hidden="true"></i> إنشاء صف</button>}
          </div>
        </section>

        <section aria-label="إحصائيات سريعة" className="stats-grid">
          <article className="stat-card"><div className="num">{myClasses.length}</div><div className="lbl">صفوفي</div></article>
          <article className="stat-card"><div className="num">{myClasses.reduce((s, c) => s + (c.assignments_data || []).length, 0)}</div><div className="lbl">مهام</div></article>
          <article className="stat-card"><div className="num">{myClasses.reduce((s, c) => s + (c.lessons_data || []).length, 0)}</div><div className="lbl">دروس</div></article>
        </section>

        <section aria-label="قائمة الصفوف">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 15, fontWeight: 600 }}>الصفوف المسجلة</span>
          </div>
          <div className="classes-grid">
            {myClasses.length ? myClasses.map(c => {
              const col = getColor(c.color);
              return (
                <article key={c.id} className="class-card" onClick={() => navigate('/class/' + c.id)}>
                  <header className="class-banner" style={{ background: col.grad }}>
                    <div className="class-icon">{c.name?.substring(0, 2) || '?'}</div>
                    {isTeacher && <button className="class-delete-btn" onClick={e => { e.stopPropagation(); deleteClass(c.id); }} title="حذف الصف"><i className="ti ti-trash"></i></button>}
                  </header>
                  <div className="class-body">
                    <h4>{c.name}</h4>
                    <p className="class-subject">{c.subject || ''}</p>
                    <p className="class-teacher">{c.teacher || '—'}</p>
                    <div className="class-footer">
                      <span><i className="ti ti-users" aria-hidden="true"></i> {c.members?.length || 0}</span>
                      <span><i className="ti ti-clipboard" aria-hidden="true"></i> {(c.assignments_data || []).length}</span>
                    </div>
                  </div>
                </article>
              );
            }) : (
              <div style={{ gridColumn: '1/-1' }}>
                <div className="empty-state"><i className="ti ti-school" aria-hidden="true"></i><h3>لا توجد صفوف بعد</h3>
                  <p>أنشئ صفاً جديداً أو انضم إلى صف باستخدام رمز الصف</p>
                  <button className="btn btn-primary" onClick={() => setShowCreate(true)}><i className="ti ti-plus" aria-hidden="true"></i> إنشاء صف</button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="إنشاء صف جديد" subtitle="أدخل معلومات الصف الدراسي">
        <div className="form-group"><label htmlFor="className">اسم الصف</label>
          <input id="className" placeholder="مثال: رياضيات - ثالث متوسط" value={createName} onChange={e => setCreateName(e.target.value)} required /></div>
        <div className="form-group"><label htmlFor="classSubject">المادة</label>
          <input id="classSubject" placeholder="مثال: الرياضيات" value={createSubject} onChange={e => setCreateSubject(e.target.value)} required /></div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setShowCreate(false)}>إلغاء</button>
          <button className="btn btn-primary" onClick={createClass}><i className="ti ti-plus" aria-hidden="true"></i> إنشاء</button>
        </div>
      </Modal>

      <Modal open={showJoin} onClose={() => setShowJoin(false)} title="انضمام إلى صف" subtitle="أدخل رمز الصف المرسل من معلمك">
        <div className="form-group"><label htmlFor="joinCode">رمز الصف</label>
          <input id="joinCode" placeholder="أدخل الرمز (مثال: ABC123)" value={joinCode} onChange={e => setJoinCode(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && joinClass()} /></div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setShowJoin(false)}>إلغاء</button>
          <button className="btn btn-primary" onClick={joinClass}><i className="ti ti-user-plus" aria-hidden="true"></i> انضمام</button>
        </div>
      </Modal>
    </div>
  );
}
