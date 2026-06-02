/* ========== LOGGER ========== */
const Logger={
  _ts:()=>new Date().toISOString().slice(11,19),
  info:m=>console.log(`[${Logger._ts()}] [INFO] ${m}`),
  warn:m=>console.warn(`[${Logger._ts()}] [WARN] ${m}`),
  error:m=>console.error(`[${Logger._ts()}] [ERROR] ${m}`),
};

/* ========== COLORS ========== */
const COLORS=[
  {bg:'#1a73e8',grad:'linear-gradient(135deg,#1a73e8,#0d47a1)'},
  {bg:'#1e8e3e',grad:'linear-gradient(135deg,#1e8e3e,#0d5c24)'},
  {bg:'#8430ce',grad:'linear-gradient(135deg,#8430ce,#5c1f96)'},
  {bg:'#fa7b17',grad:'linear-gradient(135deg,#fa7b17,#c45c0d)'},
  {bg:'#d93025',grad:'linear-gradient(135deg,#d93025,#9a1f1a)'},
  {bg:'#006064',grad:'linear-gradient(135deg,#006064,#00363a)'},
];

/* ========== GLOBALS ========== */
let currentUser=null;
let _cloudClasses=[];
let notifTimeout=null;

/* ========== NOTIFICATION ========== */
function showNotification(msg){
  const n=document.getElementById('notification');
  if(!n) return;
  n.innerHTML=`<i class="ti ti-info-circle"></i> ${msg}`;
  n.classList.remove('hidden');
  clearTimeout(notifTimeout);
  notifTimeout=setTimeout(()=>n.classList.add('hidden'),3000);
}

/* ========== AUTH ========== */
function handleAuth(mode){
  if(mode==='signIn'){
    const email=document.getElementById('auth-email').value.trim();
    const pass=document.getElementById('auth-pass').value;
    if(!email||!pass){showNotification('قم بملء جميع الحقول');return}
    auth.signInWithEmailAndPassword(email,pass)
      .then(()=>window.location.href='dashboard.html')
      .catch(e=>showNotification(e.message));
  } else {
    const name=document.getElementById('auth-name').value.trim();
    const email=document.getElementById('auth-email-signup').value.trim();
    const pass=document.getElementById('auth-pass-signup').value;
    const role=document.getElementById('auth-role').value;
    if(!name||!email||!pass){showNotification('قم بملء جميع الحقول');return}
    auth.createUserWithEmailAndPassword(email,pass).then(async cred=>{
      await cred.user.updateProfile({displayName:name});
      await db.collection('users').doc(cred.user.uid).set({name,email,role,createdAt:Date.now()});
      window.location.href='dashboard.html';
    }).catch(e=>showNotification(e.message));
  }
}

function handleGoogleAuth(){
  auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).then(async result=>{
    const user=result.user;
    const snap=await db.collection('users').doc(user.uid).get();
    if(!snap.exists){
      const role=confirm('هل تريد التسجيل كمعلم؟ (OK=معلم, إلغاء=طالب)')?'teacher':'student';
      await db.collection('users').doc(user.uid).set({name:user.displayName,email:user.email,role,createdAt:Date.now()});
    }
    window.location.href='dashboard.html';
  }).catch(e=>showNotification(e.message));
}

function logout(){
  auth.signOut().then(()=>window.location.href='index.html');
}

/* ========== AUTH STATE ========== */
auth.onAuthStateChanged(user=>{
  if(user){
    db.collection('users').doc(user.uid).get().then(snap=>{
      const data=snap.data()||{role:'student',name:user.displayName||'مستخدم'};
      currentUser={uid:user.uid,name:data.name,role:data.role};
      localStorage.setItem('edu_user',JSON.stringify(currentUser));
    });
  } else {
    currentUser=null;
    const pth=window.location.pathname.replace(/\/+$/,'');
    const onLoginPage=pth.includes('index.html')||pth===''||pth==='/'||pth.endsWith('edu-classroom')||pth.endsWith('edu-platform');
    if(!onLoginPage){
      // If we just logged in but persistence hasn't caught up yet, wait
      if(localStorage.getItem('edu_just_logged_in')){
        let tries=0;
        const iv=setInterval(()=>{
          tries++;
          if(auth.currentUser){
            clearInterval(iv);
            localStorage.removeItem('edu_just_logged_in');
            db.collection('users').doc(auth.currentUser.uid).get().then(snap=>{
              const data=snap.data()||{role:'student',name:auth.currentUser.displayName||'مستخدم'};
              currentUser={uid:auth.currentUser.uid,name:data.name,role:data.role};
              localStorage.setItem('edu_user',JSON.stringify(currentUser));
            });
          } else if(tries>10){
            clearInterval(iv);
            localStorage.removeItem('edu_just_logged_in');
            localStorage.removeItem('edu_user');
            window.location.href='index.html';
          }
        },500);
      } else {
        localStorage.removeItem('edu_user');
        window.location.href='index.html';
      }
    }
  }
});

/* ========== HELPERS ========== */
function getClassRef(){
  if(!currentUser) return null;
  return db.collection('classes').where('members','array-contains',currentUser.uid);
}
function getAllClassesRef(){
  return db.collection('classes');
}
function getClassIdFromUrl(){
  const p=new URLSearchParams(window.location.search);
  return p.get('id');
}

function getDueDateColor(dateStr){
  if(!dateStr) return '';
  if(dateStr.includes('متأخر')) return 'var(--red)';
  return 'var(--text3)';
}
