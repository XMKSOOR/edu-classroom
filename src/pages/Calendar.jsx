import { useState, useEffect } from 'react';
import Topbar from '../components/Topbar';
import { useAuth } from '../contexts/AuthContext';
import { getAllClassesRef, onSnapshot } from '../firebase/firestore';

const arabicMonths = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const arabicDays = ['أحد','اثن','ثلا','أرب','خمي','جمع','سبت'];

export default function Calendar() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());

  useEffect(() => {
    const unsub = onSnapshot(getAllClassesRef(), snap => {
      setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  function prevMonth() {
    setMonth(m => {
      if (m === 0) { setYear(y => y - 1); return 11; }
      return m - 1;
    });
  }

  function nextMonth() {
    setMonth(m => {
      if (m === 11) { setYear(y => y + 1); return 0; }
      return m + 1;
    });
  }

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  function getTasksForDate(dateStr) {
    const tasks = [];
    classes.forEach(c => {
      (c.assignments_data || []).forEach(a => {
        if (a.dueISO === dateStr) tasks.push({ title: a.title, class: c.name, color: c.color });
      });
    });
    return tasks;
  }

  const allTasks = [];
  classes.forEach(c => {
    (c.assignments_data || []).forEach(a => {
      allTasks.push({
        title: a.title, due: a.due, status: a.status,
        className: c.name, color: c.color
      });
    });
  });
  const pending = allTasks.filter(a => a.status === 'pending' || a.status === 'late');

  return (
    <div className="app-wrapper">
      <Topbar />
      <main className="main-content">
        <section aria-label="التقويم الأكاديمي">
          <div className="section-header"><span>التقويم الأكاديمي</span></div>
          <article className="card">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <button className="btn btn-secondary btn-sm" onClick={prevMonth} aria-label="الشهر السابق"><i className="ti ti-chevron-right" aria-hidden="true"></i></button>
              <h3 style={{ fontSize: 18, fontWeight: 700 }}>{arabicMonths[month]} {year}</h3>
              <button className="btn btn-secondary btn-sm" onClick={nextMonth} aria-label="الشهر التالي"><i className="ti ti-chevron-left" aria-hidden="true"></i></button>
            </header>
            <div className="cal-grid" role="grid" aria-label="شبكة التقويم">
              {arabicDays.map(d => <div key={d} role="columnheader" style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--text2)', padding: 6 }}>{d}</div>)}
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} role="gridcell"></div>)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                const tasks = getTasksForDate(dateStr);
                return (
                  <div key={day} className={`cal-day${isToday ? ' today' : ''}`} role="gridcell"
                    aria-label={`${day} ${arabicMonths[month]}${tasks.length ? '، فيه موعد تسليم' : ''}`}>
                    {day}
                    {tasks.length > 0 && <div className="dot"></div>}
                  </div>
                );
              })}
            </div>
          </article>
        </section>

        <section aria-label="المواعيد القادمة" style={{ marginTop: 24 }}>
          <div className="section-header"><span>المواعيد القادمة</span></div>
          {pending.length ? pending.map((a, i) => (
            <article key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.color, flexShrink: 0 }} aria-hidden="true"></div>
              <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600 }}>{a.title}</div><div style={{ fontSize: 12, color: 'var(--text2)' }}>{a.className}</div></div>
              <time style={{ fontSize: 12, color: 'var(--text3)' }}>{a.due}</time>
            </article>
          )) : <div className="empty-state"><i className="ti ti-calendar-check" aria-hidden="true"></i><h3>لا توجد مواعيد قادمة</h3></div>}
        </section>
      </main>
    </div>
  );
}
