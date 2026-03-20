import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // 1. ESTA LIBRERÍA ES VITAL
import {
  getAuth,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
} from "firebase/auth";

// TODO: Reemplaza esto con las llaves reales de tu proyecto de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAqweiq2mV98N00yWlecQtOE3BUsBM5-Cs",
  authDomain: "control-ganadero-1518e.firebaseapp.com",
  projectId: "control-ganadero-1518e",
  storageBucket: "control-ganadero-1518e.firebasestorage.app",
  messagingSenderId: "327622024275",
  appId: "1:327622024275:web:de43032167c765c8a43aa6",
};

// Inicializamos la aplicación de Firebase
const app = initializeApp(firebaseConfig);

// Exportamos los servicios para usarlos en nuestras pantallas
export const auth = getAuth(app);
export const db = getFirestore(app); // Esta es la línea mágica que arregla el error
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider("apple.com");

// --- FUNCIONES DE AUTENTICACIÓN ---
export const iniciarSesionCorreo = (correo, password) => {
  return signInWithEmailAndPassword(auth, correo, password);
};

export const registrarCorreo = (correo, password) => {
  return createUserWithEmailAndPassword(auth, correo, password);
};

export const iniciarSesionGoogle = () => {
  return signInWithPopup(auth, googleProvider);
};

export const iniciarSesionApple = () => {
  return signInWithPopup(auth, appleProvider);
};
