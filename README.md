# Camper Compagno — base tecnica v1

Questa è una **base di progetto**, non un'app già configurata o pubblicata. Richiede la configurazione di Firebase e test prima di usarla con dati reali.

## Funzioni incluse nel prototipo

- Accesso con email/password Firebase Authentication.
- Creazione gruppo e codice d'invito per il secondo account.
- Lista spesa condivisa con categorie, quantità, spunta, eliminazione e reset delle spunte.
- Lista mete condivisa con priorità, note e apertura della ricerca in Google Maps.
- Profilo camper: 7,38 m × 2,32 m × 2,95 m, massa massima autorizzata 3.500 kg.
- Interfaccia responsive e manifest PWA.

## Prima di iniziare

Occorrono un account Google e un browser desktop. I nomi delle voci nella console Firebase possono cambiare leggermente.

### 1. Crea il progetto Firebase

1. Apri https://console.firebase.google.com/
2. Crea un progetto, per esempio `camper-compagno`.
3. In **Authentication → Sign-in method**, abilita **Email/Password**.
4. In **Firestore Database**, crea un database in modalità produzione.
5. Nelle impostazioni del progetto, registra una **Web app** e copia la configurazione Firebase.

### 2. Inserisci la configurazione web

1. Copia `firebase-config.example.js` e rinomina la copia `firebase-config.js`.
2. Sostituisci i valori `INSERISCI_...` con quelli mostrati dalla console Firebase.
3. Non pubblicare mai credenziali di service account o chiavi private. La configurazione web Firebase è destinata al client; la sicurezza deve essere applicata tramite Authentication e Firestore Rules.

### 3. Pubblica le regole Firestore

Nella console Firestore, apri **Rules**, sostituisci il contenuto con quello di `firestore.rules` e pubblica.

**Nota importante:** le regole incluse sono una bozza iniziale da verificare in test prima di usare dati reali. Non sono state sottoposte a test automatici in questa consegna. In particolare, testa la creazione del gruppo, l'ingresso tramite codice, l'accesso incrociato e l'impossibilità di leggere dati di gruppi estranei. Non lasciare mai Firestore in modalità test aperta.

### 4. Avvia in locale

I moduli JavaScript e Firebase richiedono un server HTTPS o localhost; non aprire `index.html` direttamente come file.

Con Python installato, dalla cartella del progetto:
```bash
python -m http.server 8000
```
Poi apri `http://localhost:8000`. Alcune funzioni Firebase possono richiedere domini autorizzati: controlla **Authentication → Settings → Authorized domains**.

Per provare su un dispositivo reale, usa un hosting HTTPS. Il server locale sul computer non è automaticamente accessibile dal tablet o dagli smartphone.

### 5. Hosting gratuito (facoltativo)

Puoi valutare Firebase Hosting nel piano gratuito o un hosting statico HTTPS con piano gratuito. Se scegli Firebase Hosting:
1. Installa Node.js e Firebase CLI sul computer.
2. Esegui `firebase login`.
3. Esegui `firebase init hosting` nella cartella del progetto.
4. Seleziona il progetto Firebase e la cartella pubblica corretta.
5. Distribuisci con `firebase deploy`.

Controlla sempre i limiti e le condizioni attuali del piano gratuito prima di distribuire.

### 6. Crea i due account

1. Apri l'app e crea il primo account.
2. Premi **Crea nuovo gruppo** e conserva il codice d'invito mostrato.
3. Dal secondo smartphone crea il secondo account e inserisci il codice in **Entra in un gruppo**.
4. Installa la web app sui dispositivi tramite il menu del browser → **Aggiungi a schermata Home** (la dicitura può variare).

## Test obbligatori prima dell'uso

- Entrambi gli account riescono a vedere la stessa lista.
- Una spunta fatta sul telefono appare sul tablet.
- Il reset delle spunte non elimina i prodotti.
- Un utente esterno al gruppo non può leggere o modificare i dati.
- Il codice d'invito non viene condiviso pubblicamente.
- Google Maps si apre sul telefono collegato ad Android Auto, non soltanto sul tablet.

## Limiti attuali

- Non include ancora notifiche di prossimità, pianificazione automatica, ricerca di eventi, catalogo di soste o vademecum normativo.
- Le mete sono aperte tramite testo/indirizzo in Google Maps; le coordinate precise e la gestione avanzata delle tappe saranno miglioramenti successivi.
- Non calcola percorsi compatibili con altezza, larghezza e massa del camper.
- La PWA non garantisce notifiche GPS affidabili quando è sospesa in background.
- L'icona installabile dedicata va aggiunta in una fase successiva.
- La sicurezza deve essere testata prima dell'uso reale; non usare dati sensibili in questa bozza.

## Itinerario (prima versione)
La sezione Itinerario permette di inserire manualmente la partenza oppure richiedere la posizione del dispositivo tramite il browser (solo dopo il consenso dell'utente), indicare una destinazione e tappe separate da punto e virgola. Il pulsante apre Google Maps con il percorso stradale.

**Importante:** questa integrazione non calcola un percorso certificato per camper e Google Maps non garantisce il rispetto di altezza, larghezza, lunghezza o massa del veicolo. Verificare sempre segnaletica e limitazioni; non usare il percorso come garanzia di transitabilità.
