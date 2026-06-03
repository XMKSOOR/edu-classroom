import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Topbar from '../components/Topbar';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useNotify } from '../contexts/NotificationContext';
import { db, listenClass, onSnapshot, doc, updateDoc, arrayUnion, collection } from '../firebase/firestore';
import { storage, uploadFile } from '../firebase/storage';
import { ref } from 'firebase/storage';

const COLORS = [
  { grad: 'linear-gradient(135deg,#1a73e8,#0d47a1)', bg: '#1a73e8' },
  { grad: 'linear-gradient(135deg,#e8710a,#bf360c)', bg: '#e8710a' },
  { grad: 'linear-gradient(135deg,#0d652d,#1b5e20)', bg: '#0d652d' },
  { grad: 'linear-gradient(135deg,#9334e6,#6a1b9a)', bg: '#9334e6' },
  { grad: 'linear-gradient(135deg,#c5221f,#b71c1c)', bg: '#c5221f' },
  { grad: 'linear-gradient(135deg,#f9ab00,#e65100)', bg: '#f9ab00' },
];

const TABS = [
  { key: 'stream', label: 'الإعلانات' },
  { key: 'assignments', label: 'المهام' },
  { key: 'lessons', label: 'الدروس' },
  { key: 'people', label: 'الأعضاء' },
];

export default function ClassDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { notify } = useNotify();
  const [cls, setCls] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('stream');
  const [members, setMembers] = useState([]);

  // Modals
  const [showPost, setShowPost] = useState(false);
  const [postText, setPostText] = useState('');
  const [postFile, setPostFile] = useState(null);
  const [showAssign, setShowAssign] = useState(false);
  const [caTitle, setCaTitle] = useState('');
  const [caDesc, setCaDesc] = useState('');
  const [caDue, setCaDue] = useState('');
  const [caPoints, setCaPoints] = useState(20);
  const [showSubmit, setShowSubmit] = useState(false);
  const [currentAssign, setCurrentAssign] = useState(null);
  const [subFile, setSubFile] = useState(null);
  const [subNote, setSubNote] = useState('');
  const [showLesson, setShowLesson] = useState(false);
  const [lsTitle, setLsTitle] = useState('');
  const [lsType, setLsType] = useState('video');
  const [lsUrl, setLsUrl] = useState('');
  const [showSubs, setShowSubs] = useState(false);
  const [viewSubAssign, setViewSubAssign] = useState(null);

  const isTeacher = user?.role === 'teacher';

  useEffect(() => {
    if (!id) return;
    const unsub = listenClass(id, snap => {
      if (!snap.exists) { notify('الصف غير موجود'); return; }
      setCls({ id: snap.id, ...snap.data() });
      setLoading(false);
    }, err => { notify(err.message); });
    return unsub;
  }, [id]);

  useEffect(() => {
    if (!cls?.members?.length) return;
    const unsub = onSnapshot(collection(db, 'users'), snap => {
      const ms = [];
      snap.docs.forEach(d => {
        if (cls.members.includes(d.id)) {
          ms.push({ uid: d.id, name: d.data().name, role: d.data().role });
        }
      });
      setMembers(ms);
    });
    return unsub;
  }, [cls?.members]);

  if (loading) return <LoadingSpinner />;
  if (!cls) return <div className="empty-state"><i className="ti ti-alert-circle"></i><h3>الصف غير موجود</h3></div>;

  const col = COLORS[cls.color] || COLORS[0];

  async function addPost() {
    if (!postText.trim()) { notify('اكتب نص الإعلان أولاً'); return; }
    const p = {
      id: Date.now(), author: user?.name, avatar: user?.name?.substring(0, 2),
      avatarColor: '#1a73e8', time: new Date().toLocaleString('ar-SA'),
      iso: new Date().toISOString(), text: postText.trim(), attachment: null
    };
    try {
      if (postFile) {
        const url = await uploadFile(`stream/${cls.id}/${Date.now()}_${postFile.name}`, postFile);
        p.attachment = { name: postFile.name, icon: 'ti-file', url };
      }
      await updateDoc(doc(db, 'classes', cls.id), { stream: arrayUnion(p) });
      setShowPost(false);
      setPostText(''); setPostFile(null);
      notify('تم النشر 🎉');
    } catch (e) { notify(e.message); }
  }

  async function createAssignment() {
    if (!caTitle || !caDue) { notify('أدخل عنوان المهمة وتاريخ التسليم'); return; }
    const dueStr = new Date(caDue).toLocaleDateString('ar-SA', { day: 'numeric', month: 'long', year: 'numeric' });
    const a = {
      id: Date.now(), title: caTitle, desc: caDesc || 'لا يوجد وصف',
      due: dueStr, dueISO: caDue, status: 'pending', points: caPoints, submissions: []
    };
    try {
      await updateDoc(doc(db, 'classes', cls.id), {
        assignments_data: arrayUnion(a),
        assignments: increment(1)
      });
      setShowAssign(false);
      setCaTitle(''); setCaDesc(''); setCaDue(''); setCaPoints(20);
      notify('تم إنشاء المهمة 📝');
    } catch (e) { notify(e.message); }
  }

  async function submitAssignment() {
    if (!subFile) { notify('يرجى اختيار ملف أولاً ⚠️'); return; }
    const existing = (cls.assignments_data || []).find(a => a.id === currentAssign?.id);
    if (existing?.submissions?.some(s => s.uid === user?.uid)) {
      notify('لقد سلَّمت هذه المهمة مسبقاً ⚠️');
      return;
    }
    try {
      const url = await uploadFile(`assignments/${cls.id}/${currentAssign.id}/${user.uid}_${subFile.name}`, subFile);
      const sub = { uid: user.uid, name: user.name, file: url, fileName: subFile.name, submittedAt: Date.now(), note: subNote.trim() || '' };
      const updated = (cls.assignments_data || []).map(a => {
        if (a.id !== currentAssign.id) return a;
        return { ...a, status: 'done', submissions: [...(a.submissions || []), sub] };
      });
      await updateDoc(doc(db, 'classes', cls.id), { assignments_data: updated });
      setShowSubmit(false);
      setSubFile(null); setSubNote('');
      notify('تم تسليم المهمة بنجاح! 🎉');
    } catch (e) { notify(e.message); }
  }

  async function addLesson() {
    if (!lsTitle.trim()) { notify('أدخل عنوان الدرس'); return; }
    const emojiMap = { video: '📹', doc: '📄', quiz: '📝', link: '🔗' };
    const colorMap = { video: '#e8f0fe', doc: '#e6f4ea', quiz: '#fef3e2', link: '#f3e8fd' };
    const l = {
      id: Date.now(), title: lsTitle, desc: 'درس مُضاف حديثاً', type: lsType,
      url: lsUrl, emoji: emojiMap[lsType], color: colorMap[lsType]
    };
    try {
      await updateDoc(doc(db, 'classes', cls.id), { lessons_data: arrayUnion(l) });
      setShowLesson(false);
      setLsTitle(''); setLsUrl('');
      notify('تم ربط الدرس بنجاح ✅');
    } catch (e) { notify(e.message); }
  }

  function openSubmit(a) {
    setCurrentAssign(a);
    setSubFile(null);
    setSubNote('');
    setShowSubmit(true);
  }

  function viewSubmissions(a) {
    setViewSubAssign(a);
    setShowSubs(true);
  }

  const st = (cls.stream || []).slice().reverse();

  return (
    <div className="app-wrapper">
      <Topbar />
      <main className="main-content">
        <button className="back-btn" onClick={() => window.history.back()} aria-label="العودة للصفوف">
          <i className="ti ti-arrow-right" aria-hidden="true"></i> العودة للصفوف
        </button>

        <section className="class-hero" style={{ background: col.grad }} aria-label="معلومات الصف">
          <h1>{cls.name}</h1>
          <p>{cls.teacher || ''} &nbsp;·&nbsp; رمز الصف: <strong>{cls.code || ''}</strong></p>
          <div className="hero-stats">
            <div className="hero-stat"><div className="num">{cls.students || 0}</div><div className="lbl">طالب</div></div>
            <div className="hero-stat"><div className="num">{(cls.assignments_data || []).length}</div><div className="lbl">مهمة</div></div>
            <div className="hero-stat"><div className="num">{(cls.lessons_data || []).length}</div><div className="lbl">درس</div></div>
            <div className="hero-stat"><div className="num">{cls.progress || 0}%</div><div className="lbl">إنجاز</div></div>
          </div>
        </section>

        <div className="tabs-bar" role="tablist" aria-label="أقسام الصف">
          {TABS.map(t => (
            <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} role="tab"
              aria-selected={tab === t.key} onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
        </div>

        {tab === 'stream' && (
          <section role="tabpanel" aria-label="الإعلانات">
            {isTeacher && (
              <div className="stream-post" style={{ border: '2px dashed var(--border)', background: 'var(--surface2)', cursor: 'pointer' }}
                onClick={() => setShowPost(true)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text3)' }}>
                  <div className="avatar" style={{ background: 'var(--primary)', color: '#fff' }}>{user?.name?.substring(0, 2)}</div>
                  <span style={{ fontSize: 14 }}>شارك إعلاناً مع الصف...</span>
                </div>
              </div>
            )}
            {st.map(p => (
              <article key={p.id} className="stream-post">
                <header className="post-header">
                  <div className="avatar" style={{ background: p.avatarColor || 'var(--primary)' }}>{p.avatar || '?'}</div>
                  <div><div style={{ fontSize: 14, fontWeight: 600 }}>{p.author || ''}</div></div>
                  <time className="post-time" dateTime={p.iso || ''}>{p.time || ''}</time>
                </header>
                <p className="post-text">{p.text || ''}</p>
                {p.attachment && (
                  <div className="post-attachment" onClick={() => window.open(p.attachment.url, '_blank')}>
                    <i className="ti ti-file" style={{ fontSize: 20, color: 'var(--primary)' }} aria-hidden="true"></i>
                    <span>{p.attachment.name}</span>
                    <i className="ti ti-download" style={{ marginRight: 'auto', color: 'var(--text3)' }} aria-hidden="true"></i>
                  </div>
                )}
              </article>
            ))}
            {!st.length && !isTeacher && (
              <div className="empty-state"><i className="ti ti-message" aria-hidden="true"></i><h3>لا توجد إعلانات بعد</h3><p>سيتم عرض إعلانات المعلم هنا</p></div>
            )}
          </section>
        )}

        {tab === 'assignments' && (
          <section role="tabpanel" aria-label="المهام">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>المهام والواجبات</span>
              {isTeacher && <button className="btn btn-primary btn-sm" onClick={() => setShowAssign(true)}><i className="ti ti-plus" aria-hidden="true"></i> إضافة مهمة</button>}
            </div>
            <div className="assignments-list">
              {(cls.assignments_data || []).map(a => {
                const userSub = (a.submissions || []).find(s => s.uid === user?.uid);
                const status = userSub ? 'done' : (a.dueISO && new Date(a.dueISO) < new Date() ? 'late' : 'pending');
                const colors = { pending: ['#fff9e6', '#fa7b17'], done: ['#e6f4ea', '#1e8e3e'], late: ['#fce8e6', '#d93025'] };
                const sl = colors[status] || colors.pending;
                const icons = { pending: 'ti-clock', done: 'ti-check', late: 'ti-alert-triangle' };
                const labels = { pending: 'قيد التسليم', done: 'مُسلَّم', late: 'متأخر' };
                return (
                  <article key={a.id} className="assignment-card" onClick={() => isTeacher ? viewSubmissions(a) : openSubmit(a)}>
                    <div className="assign-icon" style={{ background: sl[0], color: sl[1] }}><i className={`ti ${icons[status] || 'ti-clock'}`} aria-hidden="true"></i></div>
                    <div className="assign-info"><h4>{a.title}</h4><p>{a.desc || ''}</p></div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <span className="assign-badge" style={{ background: sl[0], color: sl[1] }}>{labels[status] || ''}</span>
                      <time className="assign-date" dateTime={a.dueISO || ''}><i className="ti ti-calendar" style={{ fontSize: 12 }} aria-hidden="true"></i> {a.due || ''}</time>
                      <span style={{ fontSize: 12, color: 'var(--text3)' }}>{a.points || 0} درجة</span>
                    </div>
                  </article>
                );
              })}
              {!cls.assignments_data?.length && <div className="empty-state"><i className="ti ti-clipboard" aria-hidden="true"></i><h3>لا توجد مهام بعد</h3></div>}
            </div>
          </section>
        )}

        {tab === 'lessons' && (
          <section role="tabpanel" aria-label="الدروس">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 15, fontWeight: 600 }}>الدروس والمواد</span>
              {isTeacher && <button className="btn btn-primary btn-sm" onClick={() => setShowLesson(true)}><i className="ti ti-link" aria-hidden="true"></i> ربط درس</button>}
            </div>
            <div className="lessons-grid">
              {(cls.lessons_data || []).map(l => {
                const typeLabel = { video: 'فيديو', doc: 'مستند', quiz: 'اختبار', link: 'رابط' };
                const typeIcon = { video: 'ti-player-play', doc: 'ti-file-description', quiz: 'ti-clipboard-check', link: 'ti-external-link' };
                return (
                  <article key={l.id} className="lesson-card" onClick={() => l.url && window.open(l.url, '_blank')}>
                    <div className="lesson-thumb" style={{ background: l.color || 'var(--surface3)' }}>
                      <span style={{ fontSize: 42 }}>{l.emoji || '📄'}</span>
                      <span className="lesson-tag">{typeLabel[l.type] || 'رابط'}</span>
                    </div>
                    <div className="lesson-body">
                      <h4>{l.title}</h4>
                      <p>{l.desc || ''}</p>
                      <footer className="lesson-footer">
                        <span className="lesson-type"><i className={`ti ${typeIcon[l.type] || 'ti-link'}`} style={{ fontSize: 13 }} aria-hidden="true"></i> {typeLabel[l.type] || 'رابط'}</span>
                        <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); l.url && window.open(l.url, '_blank'); }}>فتح</button>
                      </footer>
                    </div>
                  </article>
                );
              })}
              {!cls.lessons_data?.length && <div className="empty-state"><i className="ti ti-book" aria-hidden="true"></i><h3>لا توجد دروس بعد</h3></div>}
            </div>
          </section>
        )}

        {tab === 'people' && (
          <section role="tabpanel" aria-label="الأعضاء">
            {(() => {
              const teachers = members.filter(m => m.role === 'teacher');
              const students = members.filter(m => m.role !== 'teacher' && m.uid !== cls.teacherId);
              return (
                <>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className="ti ti-shield-check" style={{ color: 'var(--primary)' }} aria-hidden="true"></i> المعلمون
                    </div>
                    {teachers.map(m => (
                      <article key={m.uid} className="person-card">
                        <div className="person-avatar" style={{ background: 'var(--primary)', color: '#fff' }}>{m.name?.substring(0, 2)}</div>
                        <div className="person-info"><h4>{m.name}</h4><p>معلم الصف</p></div>
                        <span className="person-role-badge" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>معلم</span>
                      </article>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <i className="ti ti-users" style={{ color: 'var(--green)' }} aria-hidden="true"></i> الطلاب ({students.length})
                    </div>
                    <div className="people-list">
                      {students.length ? students.map(m => (
                        <article key={m.uid} className="person-card">
                          <div className="person-avatar" style={{ background: 'var(--surface3)', color: 'var(--text1)' }}>{m.name?.substring(0, 2)}</div>
                          <div className="person-info"><h4>{m.name}</h4><p>طالب</p></div>
                          <span className="person-role-badge" style={{ background: 'var(--green-light)', color: 'var(--green)' }}>طالب</span>
                        </article>
                      )) : <div className="empty-state"><i className="ti ti-users" aria-hidden="true"></i><h3>لا يوجد طلاب بعد</h3></div>}
                    </div>
                  </div>
                </>
              );
            })()}
          </section>
        )}
      </main>

      {/* Add Post Modal */}
      <Modal open={showPost} onClose={() => setShowPost(false)} title="إضافة إعلان" subtitle="شارك إعلاناً مع طلاب الصف">
        <div className="form-group"><label htmlFor="postText">نص الإعلان</label>
          <textarea id="postText" placeholder="اكتب إعلانك هنا..." style={{ minHeight: 100 }} required
            value={postText} onChange={e => setPostText(e.target.value)}></textarea></div>
        <div className="form-group"><label>مرفق (اختياري)</label>
          <div className="upload-area" onClick={() => document.getElementById('postFile').click()} style={{ padding: 14 }}>
            <i className="ti ti-paperclip" style={{ fontSize: 20 }} aria-hidden="true"></i>
            <p style={{ fontSize: 12 }}>{postFile ? postFile.name : 'إرفاق ملف'}</p>
          </div>
          <input type="file" id="postFile" style={{ display: 'none' }} onChange={e => setPostFile(e.target.files[0])} /></div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setShowPost(false)}>إلغاء</button>
          <button className="btn btn-primary" onClick={addPost}><i className="ti ti-send" aria-hidden="true"></i> نشر</button>
        </div>
      </Modal>

      {/* Create Assignment Modal */}
      <Modal open={showAssign} onClose={() => setShowAssign(false)} title="إضافة مهمة جديدة" subtitle="أنشئ واجباً لطلاب هذا الصف">
        <div className="form-group"><label htmlFor="ca-title">عنوان المهمة</label>
          <input id="ca-title" placeholder="مثال: واجب المعادلات التربيعية" value={caTitle} onChange={e => setCaTitle(e.target.value)} required /></div>
        <div className="form-group"><label htmlFor="ca-desc">الوصف</label>
          <textarea id="ca-desc" placeholder="وصف المهمة والتعليمات..." value={caDesc} onChange={e => setCaDesc(e.target.value)}></textarea></div>
        <div className="form-row">
          <div className="form-group"><label htmlFor="ca-due">تاريخ التسليم</label>
            <input id="ca-due" type="date" style={{ fontFamily: "'Cairo',sans-serif" }} value={caDue} onChange={e => setCaDue(e.target.value)} required /></div>
          <div className="form-group"><label htmlFor="ca-points">الدرجة</label>
            <input id="ca-points" type="number" value={caPoints} min="1" max="100" onChange={e => setCaPoints(parseInt(e.target.value) || 20)} /></div>
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setShowAssign(false)}>إلغاء</button>
          <button className="btn btn-primary" onClick={createAssignment}><i className="ti ti-plus" aria-hidden="true"></i> إنشاء</button>
        </div>
      </Modal>

      {/* Submit Assignment Modal */}
      <Modal open={showSubmit} onClose={() => setShowSubmit(false)} title="تسليم المهمة"
        subtitle={currentAssign ? <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text1)' }}>{currentAssign.title}</span> : null}>
        <div className="upload-area" onClick={() => document.getElementById('fileInput').click()}>
          <i className={`ti ${subFile ? 'ti-file' : 'ti-upload'}`} id="uploadIcon" style={subFile ? { color: 'var(--primary)' } : {}} aria-hidden="true"></i>
          <p id="uploadText">{subFile ? subFile.name : 'انقر لرفع ملف المهمة'}</p>
          <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>PDF, Word, أو صور</p>
        </div>
        <input type="file" id="fileInput" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip" style={{ display: 'none' }}
          onChange={e => setSubFile(e.target.files[0])} />
        <div className="form-group" style={{ marginTop: 16 }}><label htmlFor="submitNote">ملاحظة للمعلم (اختياري)</label>
          <textarea id="submitNote" placeholder="اكتب ملاحظتك هنا..." value={subNote} onChange={e => setSubNote(e.target.value)}></textarea></div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setShowSubmit(false)}>إلغاء</button>
          <button className="btn btn-success" onClick={submitAssignment}><i className="ti ti-send" aria-hidden="true"></i> تسليم</button>
        </div>
      </Modal>

      {/* Add Lesson Modal */}
      <Modal open={showLesson} onClose={() => setShowLesson(false)} title="ربط درس جديد" subtitle="أضف رابط درس أو مادة تعليمية لهذا الصف">
        <div className="form-group"><label htmlFor="ls-title">عنوان الدرس</label>
          <input id="ls-title" placeholder="مثال: درس المعادلات التربيعية" value={lsTitle} onChange={e => setLsTitle(e.target.value)} required /></div>
        <div className="form-group"><label htmlFor="ls-type">نوع المحتوى</label>
          <select id="ls-type" value={lsType} onChange={e => setLsType(e.target.value)}>
            <option value="video">فيديو يوتيوب</option>
            <option value="doc">مستند / PDF</option>
            <option value="quiz">اختبار قصير</option>
            <option value="link">رابط خارجي</option>
          </select></div>
        <div className="form-group"><label htmlFor="ls-url">الرابط</label>
          <input id="ls-url" placeholder="https://..." value={lsUrl} onChange={e => setLsUrl(e.target.value)} /></div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setShowLesson(false)}>إلغاء</button>
          <button className="btn btn-primary" onClick={addLesson}><i className="ti ti-link" aria-hidden="true"></i> إضافة الدرس</button>
        </div>
      </Modal>

      {/* View Submissions Modal */}
      <Modal open={showSubs} onClose={() => setShowSubs(false)} title="تسليمات المهمة"
        subtitle={viewSubAssign ? <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text1)' }}>{viewSubAssign.title} ({(viewSubAssign.submissions || []).length} تسليم)</span> : null} wide>
        <div id="submissionsList" style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
          {(viewSubAssign?.submissions || []).length ? viewSubAssign.submissions.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'var(--surface2)', borderRadius: 8 }}>
              <div className="avatar" style={{ background: 'var(--primary)', color: '#fff', width: 36, height: 36, fontSize: 13 }}>{s.name?.substring(0, 2) || '?'}</div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{s.name || ''}</div>
                <time style={{ fontSize: 11, color: 'var(--text3)' }} dateTime={s.submittedAt ? new Date(s.submittedAt).toISOString() : ''}>
                  {s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('ar-SA') : ''}</time></div>
              {s.file && <a href={s.file} target="_blank" className="btn btn-sm btn-primary" rel="noreferrer"><i className="ti ti-download" aria-hidden="true"></i></a>}
              {s.note && <span style={{ fontSize: 11, color: 'var(--text2)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.note}</span>}
            </div>
          )) : <div className="empty-state"><i className="ti ti-inbox" aria-hidden="true"></i><h3>لا توجد تسليمات بعد</h3></div>}
        </div>
        <div className="modal-actions"><button className="btn btn-secondary" onClick={() => setShowSubs(false)}>إغلاق</button></div>
      </Modal>
    </div>
  );
}
