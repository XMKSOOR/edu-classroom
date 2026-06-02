# PROJECT_MAP — المدرسة النظامية (Edu Classroom Platform)

## TECH_STACK
| التقنية | الدور | الإصدار |
|---------|-------|---------|
| HTML5 | الهيكل | — |
| CSS3 (Custom Variables) | التصميم | — |
| Vanilla JavaScript (ES6) | المنطق | — |
| Firebase Auth | المصادقة (Email/Password + Google OAuth) | 10.7.1 compat |
| Firebase Firestore | قاعدة البيانات (NoSQL) | 10.7.1 compat |
| Firebase Storage | رفع الملفات | 10.7.1 compat |
| Tabler Icons | الأيقونات | 3.44.0 |
| Google Fonts (Cairo) | الخطوط | — |

---

## ARCHITECTURE

### 🗂 هيكل الملفات (Multi-Page — SPA-like)
```
/edu-platform/
├── index.html            # تسجيل الدخول (standalone auth page)
├── dashboard.html        # لوحة التحكم الرئيسية
├── js/
│   ├── app.js            # المتغيرات العامة (currentUser, COLORS, Logger, getClassRef, logout)
│   └── firebase-config.js# تهيئة Firebase (مستقلة لمنع إعادة التهيئة)
├── css/
│   └── style.css         # جميع التنسيقات (RTL, responsive)
├── pages/
│   ├── class.html        # تفاصيل الصف (stream, assignments, lessons, people)
│   ├── calendar.html     # التقويم الأكاديمي الشهري
│   ├── grades.html       # سجل الدرجات (per-user status)
│   └── profile.html      # الملف الشخصي والإحصائيات
├── PROJECT_MAP.md
├── .nojekyll
├── firestore.rules
└── storage.rules
```

---

## DATA FLOW

### 🔐 المصادقة
```
index.html
  ↓ (Email/Password أو Google OAuth)
auth.signInWithEmailAndPassword / createUserWithEmailAndPassword / signInWithPopup
  ↓
onAuthStateChanged ← guard: edu_just_logged_in (set BEFORE auth call, cleared on error)
  ↓
saveAndGo() → localStorage.setItem('edu_user', {...uid, name, role})
  ↓ (1.2s timeout)
window.location.href = 'dashboard.html'
  ↓
inline script ← restore from localStorage (synchronous)
app.js ← onAuthStateChanged registers observer
renderDashboard() ← reads currentUser
```

### 📦 البيانات
```
Firestore collection: classes/{id}
  ├── name, subject, teacher, teacherId
  ├── color, code, students, progress
  ├── members: [uid, ...]         ← array-contains filter
  ├── assignments_data: [{id, title, desc, due, dueISO, status, points, submissions: [{uid, name, file, submittedAt, note}]}]
  ├── lessons_data: [{id, title, desc, type, url, emoji, color}]
  ├── stream: [{id, author, avatar, text, time, attachment}]
  └── createdAt

Firestore collection: users/{uid}
  ├── name, email, role (student | teacher)
  └── createdAt
```

---

## PAGES & COMPONENTS

### 1. index.html — Auth (standalone)
- **Login**: Email/password → queries Firestore `users/{uid}` for role
- **Signup**: Creates account → saves name, email, role, createdAt → redirects
- **Google**: OAuth popup → checks existing doc or creates with confirm dialog
- **Guard**: `edu_just_logged_in` flag set **before** auth calls to prevent onAuthStateChanged race condition
- **UX**: Loading spinner on buttons during auth, Enter key submits, popup-blocker handled

### 2. dashboard.html — Main Hub
- **Stats bar**: 4 cards (total classes, tasks, lessons, pending)
- **Join banner**: Enter class code → `arrayUnion(uid)` + `increment(1)` on Firestore
- **Class grid**: Cards with gradient header, subject badge, student count, assignments, progress bar
- **Create class modal**: Generates 6-char code, random color, initializes empty arrays
- **Delete class**: Teacher-only, Firestore `doc(id).delete()`

### 3. pages/class.html — Class Detail
- **Hero**: Gradient banner with class name, code, stats
- **Tabs**:
  - `stream`: Teacher can post announcements with optional file attachment (Firebase Storage)
  - `assignments`: Student submits file → `assignments_data[].submissions[]` + status→'done'; duplicate submission prevented
  - `lessons`: Teacher links resources (video/doc/quiz/link) via arrayUnion
  - `people`: Fetches `users/{uid}.name/role` for each member in the class
- **Modals**: submitAssign (file upload 20MB max), addPost, addLesson, createAssign, viewSubmissions

### 4. pages/calendar.html — Academic Calendar
- **Month grid**: Dynamic M-F grid, highlights today, dots for due-date assignments
- **Upcoming list**: Filters pending/late assignments across all classes
- **Navigation**: Previous/next month buttons

### 5. pages/grades.html — Grade Book
- **Student view**: Per-user status (checks `submissions[].uid === currentUser.uid`; late if past due)
- **Teacher view**: Submit count "X/Y submitted"

### 6. pages/profile.html — Profile & Stats
- **Info**: Name, email (from auth.currentUser), role
- **Stats**: Classes count, total tasks, completed (per-user), pending

---

## DEPLOYMENT

| المنصة | الرابط |
|--------|--------|
| GitHub Pages | https://xmksoor.github.io/edu-classroom/ |
| المستودع | https://github.com/XMKSOOR/edu-classroom |

```
push → GitHub Pages (gh-pages or main branch, root folder)
```

---

## KEY DESIGN DECISIONS

1. **Multi-page with synchronous session restore**: Each page has inline `<script>` that reads `localStorage` before `app.js` loads, giving instant `currentUser` without waiting for Firebase async callback.
2. **Per-user data in grades**: The `status` field on each assignment is deprecated for per-user views. Instead, `submissions[].uid` is checked against `currentUser.uid`.
3. **Race condition guard**: `edu_just_logged_in` flag is set in localStorage BEFORE calling any Firebase auth method (`signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `signInWithPopup`), preventing `onAuthStateChanged` from redirecting before `saveAndGo` stores user data.
4. **No SPA router**: Full page navigations (`window.location.href`) for simplicity and isolation; each page has its own script context.
5. **Firebase compat SDK**: v10 compat (namespaced API) used instead of modular to avoid build tooling (Webpack/Vite).
6. **RTL-first**: All CSS and HTML use `dir="rtl"`, Arabic fonts (Cairo), and Arabic UI labels.
