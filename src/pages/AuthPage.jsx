import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, loginEmail, signupEmail, googleLogin, updateUserProfile } from '../firebase/auth';
import { setUser, getUser } from '../firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useNotify } from '../contexts/NotificationContext';

export default function AuthPage() {
  const [view, setView] = useState('login');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const { setUser: setAuthUser } = useAuth();
  const { notify } = useNotify();
  const navigate = useNavigate();

  function setLoad(val) { setLoading(val); }

  function saveAndGo(uid, nm, rl) {
    const u = { uid, name: nm, role: rl || 'student' };
    localStorage.setItem('edu_user', JSON.stringify(u));
    localStorage.setItem('edu_just_logged_in', '1');
    setAuthUser(u);
    setTimeout(() => navigate('/dashboard'), 1200);
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (!email || !pass) { notify('قم بملء جميع الحقول'); return; }
    setLoad(true);
    localStorage.setItem('edu_just_logged_in', '1');
    try {
      await loginEmail(email, pass);
      const u = auth.currentUser;
      const data = await getUser(u.uid);
      const nm = data?.name || u.displayName || u.email;
      const rl = data?.role || 'student';
      saveAndGo(u.uid, nm, rl);
    } catch (err) {
      localStorage.removeItem('edu_just_logged_in');
      setLoad(false);
      notify(err.message);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    if (!name || !email || !pass) { notify('قم بملء جميع الحقول'); return; }
    if (pass.length < 6) { notify('كلمة المرور 6 أحرف على الأقل'); return; }
    setLoad(true);
    localStorage.setItem('edu_just_logged_in', '1');
    try {
      const cred = await signupEmail(email, pass);
      await updateUserProfile(name);
      await setUser(cred.user.uid, { name, email, role, createdAt: Date.now() });
      saveAndGo(cred.user.uid, name, role);
    } catch (err) {
      localStorage.removeItem('edu_just_logged_in');
      setLoad(false);
      notify(err.message);
    }
  }

  async function handleGoogle(btn) {
    setLoad(true);
    localStorage.setItem('edu_just_logged_in', '1');
    try {
      const result = await googleLogin();
      const u = result.user;
      const snap = await getUser(u.uid);
      let nm, rl;
      if (snap) {
        nm = snap.name || u.displayName;
        rl = snap.role || 'student';
      } else {
        rl = 'student';
        nm = u.displayName;
        await setUser(u.uid, { name: nm, email: u.email, role: rl, createdAt: Date.now() });
      }
      saveAndGo(u.uid, nm, rl);
    } catch (err) {
      localStorage.removeItem('edu_just_logged_in');
      setLoad(false);
      if (err.code === 'auth/popup-blocked') notify('تم حظر النافذة المنبثقة، يرجى السماح للنوافذ المنبثقة');
      else notify(err.message);
    }
  }

  const isLogin = view === 'login';

  return (
    <section className="auth-page" aria-label="صفحة تسجيل الدخول">
      <div className="auth-card">
        <header className="auth-header">
          <i className="ti ti-school" aria-hidden="true" style={{ fontSize: 40, color: 'var(--primary)' }}></i>
          <h1 style={{ fontSize: 22, marginTop: 8 }}>المدرسة النظامية</h1>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>منصة التعليم الإلكترونية</p>
        </header>

        <form onSubmit={isLogin ? handleLogin : handleSignup}>
          {isLogin ? (
            <>
              <h2 style={{ fontSize: 20, marginBottom: 4 }}>تسجيل الدخول</h2>
              <p style={{ marginBottom: 20 }}>مرحباً بك مجدداً</p>
              <div className="form-group">
                <label htmlFor="auth-email">البريد الإلكتروني</label>
                <input id="auth-email" type="email" placeholder="email@example.com" autoComplete="email" required
                  value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="auth-pass">كلمة المرور</label>
                <input id="auth-pass" type="password" placeholder="••••••••" autoComplete="current-password" required minLength={6}
                  value={pass} onChange={e => setPass(e.target.value)} />
              </div>
              <button className="btn btn-primary btn-block" id="loginBtn" disabled={loading}>
                {loading ? <><span className="spinner"></span> جاري...</> : 'دخول'}
              </button>
              <div className="auth-divider" role="separator"><hr /><span>أو</span><hr /></div>
              <button type="button" className="btn btn-secondary btn-block" onClick={() => handleGoogle('login')} disabled={loading}>
                <i className="ti ti-brand-google" aria-hidden="true"></i> تسجيل الدخول بـ Google
              </button>
              <div className="auth-switch">
                ليس لديك حساب؟ <span role="button" tabIndex={0} onClick={() => setView('signup')}>أنشئ حساباً</span>
              </div>
            </>
          ) : (
            <>
              <h2 style={{ fontSize: 20, marginBottom: 4 }}>إنشاء حساب</h2>
              <p style={{ marginBottom: 20 }}>انضم إلى المنصة الآن</p>
              <div className="form-group">
                <label htmlFor="auth-name">الاسم الكامل</label>
                <input id="auth-name" placeholder="أحمد محمد" autoComplete="name" required
                  value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="auth-email-signup">البريد الإلكتروني</label>
                <input id="auth-email-signup" type="email" placeholder="email@example.com" autoComplete="email" required
                  value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="auth-pass-signup">كلمة المرور</label>
                <input id="auth-pass-signup" type="password" placeholder="••••••••" autoComplete="new-password" required minLength={6}
                  value={pass} onChange={e => setPass(e.target.value)} />
              </div>
              <div className="form-group">
                <label htmlFor="auth-role">الدور</label>
                <select id="auth-role" value={role} onChange={e => setRole(e.target.value)}>
                  <option value="student">طالب</option>
                  <option value="teacher">معلم</option>
                </select>
              </div>
              <button className="btn btn-primary btn-block" disabled={loading}>
                {loading ? <><span className="spinner"></span> جاري...</> : 'اشتراك'}
              </button>
              <div className="auth-divider" role="separator"><hr /><span>أو</span><hr /></div>
              <button type="button" className="btn btn-secondary btn-block" onClick={() => handleGoogle('signup')} disabled={loading}>
                <i className="ti ti-brand-google" aria-hidden="true"></i> التسجيل بـ Google
              </button>
              <div className="auth-switch">
                لديك حساب بالفعل؟ <span role="button" tabIndex={0} onClick={() => setView('login')}>تسجيل الدخول</span>
              </div>
            </>
          )}
        </form>
      </div>
    </section>
  );
}
