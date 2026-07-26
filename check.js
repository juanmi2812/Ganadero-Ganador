import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { firebaseConfig } from './src/firebase.js'; // Assuming it's exported

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const snap = await getDocs(collection(db, "produccion_leche_tanque"));
  console.log("Docs en tanque:", snap.docs.length);
}
check();
