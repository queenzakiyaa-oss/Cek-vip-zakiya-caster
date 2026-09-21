import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, serverTimestamp, runTransaction } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = id => document.getElementById(id);
let editingId = null;
let customers = [];

$("loginBtn").onclick = async () => {
  $("loginError").textContent = "";
  try { await signInWithEmailAndPassword(auth, $("email").value, $("password").value); }
  catch(e) { $("loginError").textContent = "Email atau password salah."; }
};
$("logoutBtn").onclick = () => signOut(auth);

onAuthStateChanged(auth, user => {
  $("loginPanel").hidden = !!user;
  $("adminPanel").hidden = !user;
  if (user) startAdminRealtime();
});

function resetForm() {
  editingId = null; $("customerForm").hidden = true; $("customerForm").reset(); $("initialVip").value = 0;
  $("formTitle").textContent = "Tambah Customer";
}
$("newCustomerBtn").onclick = () => { resetForm(); $("customerForm").hidden = false; };
$("cancelBtn").onclick = resetForm;

$("customerForm").onsubmit = async e => {
  e.preventDefault();
  const name = $("name").value.trim(), mlId = $("mlId").value.trim();
  const vip = Number($("initialVip").value || 0), note = $("note").value.trim();
  if (editingId) {
    await updateDoc(doc(db,"customers",editingId), { name, mlId, note, updatedAt: serverTimestamp() });
  } else {
    await addDoc(collection(db,"customers"), { name, mlId, totalVip: vip, note, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  }
  resetForm();
};

function startAdminRealtime() {
  onSnapshot(query(collection(db,"customers"), orderBy("name")), snap => {
    customers = snap.docs.map(d => ({id:d.id,...d.data()}));
    $("adminList").innerHTML = customers.map(c => `
      <article class="customer-card admin-card">
        <div class="customer-main">
          <h3>${escapeHtml(c.name)}</h3>
          <small>ID ML: ${escapeHtml(c.mlId)}</small>
          <div class="vip-number">${Number(c.totalVip||0)} <span>VIP</span></div>
          <div class="button-grid">
            <button data-id="${c.id}" data-change="1" class="plus">+1</button>
            <button data-id="${c.id}" data-change="5" class="plus">+5</button>
            <button data-id="${c.id}" data-change="10" class="plus">+10</button>
            <button data-id="${c.id}" data-change="-1" class="minus">−1</button>
            <button data-id="${c.id}" data-change="-5" class="minus">−5</button>
            <button data-id="${c.id}" data-change="-10" class="minus">−10</button>
          </div>
          <div class="form-actions">
            <button data-edit="${c.id}" class="secondary">Edit</button>
            <button data-delete="${c.id}" class="danger">Hapus</button>
          </div>
        </div>
      </article>`).join("") || `<div class="empty">Belum ada customer.</div>`;
  });
}

$("adminList").onclick = async e => {
  const btn = e.target.closest("button"); if (!btn) return;
  const id = btn.dataset.id;
  if (id && btn.dataset.change) {
    const change = Number(btn.dataset.change);
    await runTransaction(db, async tx => {
      const ref = doc(db,"customers",id);
      const snap = await tx.get(ref);
      const current = Number(snap.data().totalVip || 0);
      tx.update(ref, { totalVip: Math.max(0,current+change), updatedAt: serverTimestamp() });
    });
  }
  if (btn.dataset.delete) {
    if (confirm("Hapus customer ini?")) await deleteDoc(doc(db,"customers",btn.dataset.delete));
  }
  if (btn.dataset.edit) {
    const c = customers.find(x=>x.id===btn.dataset.edit); if (!c) return;
    editingId = c.id; $("formTitle").textContent = "Edit Customer"; $("customerForm").hidden = false;
    $("name").value=c.name; $("mlId").value=c.mlId; $("note").value=c.note||""; $("initialVip").value=c.totalVip||0;
    window.scrollTo({top:0,behavior:"smooth"});
  }
};

function escapeHtml(value=""){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
