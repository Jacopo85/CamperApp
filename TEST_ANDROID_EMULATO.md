# Test interfaccia Android — SOLO simulazione

La bozza include una prova automatica Chromium in dimensioni smartphone Android.

- Due account fittizi, registrati nell'emulatore Firebase Auth.
- Gruppo condiviso con codice temporaneo.
- Sincronizzazione spesa e mete con Firestore Emulator.
- Generazione link Google Maps con partenza manuale.
- Nessun accesso a Firebase reale: ?emulator=1 funziona solo su localhost e usa il progetto demo-camperapp-security.
- Non e un collaudo fisico: non prova GPS reale, Android Auto, PWA offline o tablet vero.

Per riprodurre su un ambiente di sviluppo:
npm install
npx playwright install chromium
npx firebase emulators:exec --only auth,firestore --project demo-camperapp-security --config firebase.json "npm run test:e2e"

Non pubblicare su main ne applicare le regole al Firebase reale senza il collaudo manuale e la migrazione degli inviti.
