# CamperApp Family

Applicazione web privata nell'utilizzo familiare, distribuita tramite **GitHub Pages** e sincronizzata mediante **Firebase Authentication e Firestore**. È prevista per due account familiari e tre dispositivi Android: gli smartphone e il tablet del camper. Il codice del sito pubblicato su GitHub Pages è visibile nel repository; i dati familiari richiedono autenticazione e regole Firestore corrette.

**Apri:** https://jacopo85.github.io/CamperApp/

## Icona ufficiale (versione 20)

L'icona approvata raffigura il camper e la famiglia di quattro persone (babbo, mamma, figlio maggiore e figlia minore), racchiusi in un cuore rosso in stile cartoon. È stata preparata dalla stessa immagine approvata, senza usare fotografie esterne.

Le risorse pubblicate nel repository sono:
- `icon-192.png` e `icon-512.png`: icone standard Android (web app manifest).
- `icon-maskable-512.png`: variante con spazio protettivo per i ritagli circolari o adattivi delle schermate Home Android.
- `apple-touch-icon.png` (180 px) e `favicon-48.png`: icone per altri browser e schede web.

La PWA pubblica il proprio manifesto in `manifest.webmanifest` e memorizza le icone nella cache con `sw.js` (shell-v20). Nessuna modifica a Firebase o ai dati della famiglia.

**Per far comparire la nuova icona sul tablet e sui telefoni Android:** aprire CamperApp online in Chrome, ricaricare e controllare il footer **versione 20**. La sostituzione della vecchia icona sulla schermata Home dipende dalla gestione dei collegamenti o delle app installate di Android e Chrome; può aggiornarsi automaticamente oppure essere necessario rimuovere il solo vecchio collegamento e aggiungerlo nuovamente dal menu Chrome. Se il browser indica **Installa app** invece di **Aggiungi a schermata Home**, verificare prima se l'app è già installata; non rimuovere l'app né cancellare i suoi dati solo per cambiare icona. L'icona non cambia i dati archiviati in Firestore.

## Funzioni disponibili

- Account con login e gruppo familiare condiviso.
- Lista della spesa sincronizzata e mete da visitare con priorità, note e indirizzo.
- Dimensioni e peso del camper sincronizzati: 7,38 × 2,32 × 2,95 m, 3.500 kg.
- Itinerari con origine manuale o GPS, destinazione, tappe e apertura in Google Maps, anche per l'uso con Android Auto sul dispositivo che esegue Google Maps.
- Bozza di viaggio per zona e numero di giorni (1–14), con spostamento delle mete tra le giornate, esclusione e riordino.
- Coordinate GPS **facoltative** per mete nuove e già salvate. Con almeno due mete dotate di coordinate, riordino approssimativo per distanza **in linea d'aria**. Non sono distanze stradali.
- Link Google Maps per ogni giornata. Su browser Android Google Maps supporta fino a tre tappe intermedie nei collegamenti standard: usa le singole giornate per non perdere tappe.
- Avvisi GPS di prossimità **soltanto quando attivati dall'utente, con CamperApp aperta e coordinate inserite**. Non si garantiscono notifiche a schermo spento o in background.
- Ricerca *esterna* di campeggi, aree di sosta, carico/scarico, WC e di eventi/sagre nelle date del viaggio, vicino alle mete della giornata.
- Vademecum di 20 regioni italiane e 46 Paesi o territori europei con fonti e limiti delle verifiche.

## Come usare gli avvisi di prossimità

1. Apri **Mete** e inserisci latitudine/longitudine quando aggiungi una meta. Per una meta già salvata, espandi **Aggiungi coordinate GPS** e tocca **Salva coordinate**. Le coordinate possono essere ricavate da Google Maps e sono condivise nel gruppo.
2. Apri **Itinerario**, sezione **Avvisi di prossimità alle mete**.
3. Scegli 500 m, 1 km, 2 km o 5 km, quindi tocca **Attiva avvisi GPS** e autorizza la posizione nel browser.
4. L'avviso compare quando il dispositivo raggiunge il raggio impostato, se la precisione GPS è sufficiente e l'app è attiva. Tocca **Interrompi** per fermare il controllo. Non è un sistema di monitoraggio continuo in background.

La posizione letta durante il monitoraggio non viene inviata a Firestore né a servizi di localizzazione aggiuntivi. **Le coordinate delle mete salvate sono invece dati sincronizzati su Firestore**, come gli indirizzi e le note.

## Scadenzario del camper (versione 17)

Nella scheda **Camper** trovi lo scadenzario condiviso per **bollo, assicurazione, tagliando, revisione, manutenzione e altri appuntamenti**. Le date vanno inserite manualmente: l'app non presume scadenze legali valide per tutti i mezzi o le assicurazioni.

Ogni voce contiene categoria, descrizione, data, preavviso selezionabile **0, 1, 3, 7, 15, 30, 60 o 90 giorni** e note facoltative. Si può modificare la data dopo un rinnovo o eliminare la voce. Le scadenze vicine o superate sono evidenziate in **Home**, nella pagina Camper e nella lista.

Le scadenze vengono salvate in `groups/{groupId}/settings/deadlines`, un documento della raccolta `settings` già utilizzata dall'app per i dati del veicolo. Si usa una transazione Firestore per evitare la perdita di aggiornamenti contemporanei; non sono necessarie nuove collezioni né modifiche alle regole Firebase esistenti. Le note sono condivise fra gli account: evitare codici, numeri di polizza completi o documenti riservati.

### Promemoria sui dispositivi Android

- **Avvisi nell'app:** lo scadenzario mostra le voci entro il preavviso scelto e quelle scadute ogni volta che apri CamperApp e hai accesso ai dati.
- **Notifica web facoltativa:** nella pagina Camper premi **Attiva avvisi con app aperta** e autorizza il browser. Mostra una notifica quando CamperApp è attiva e la scadenza entra nel periodo di preavviso, se il browser supporta le notifiche. La notifica viene emessa una sola volta per scadenza, data e preavviso su quel dispositivo, per evitare ripetizioni.
- **Notifica anche con CamperApp chiusa, senza PC:** su una scadenza tocca **Google Calendar**. Si apre un evento precompilato alle 09:00; **imposta manualmente la notifica del numero di giorni scelto e salva l'evento**. L'app non può impostare automaticamente il promemoria di Google Calendar tramite il semplice link. Verifica la comparsa dell'evento e dell'avviso nel calendario Android.
- **Esportazione per altri calendari:** il pulsante **Calendario (.ics)** su una singola voce o **Esporta tutte (.ics)** produce un file con evento alle 09:00 e preavviso iCalendar. Il file va importato manualmente in un calendario compatibile: **Google Calendar su Android non importa direttamente i file .ics**, mentre Google Calendar nel browser desktop permette l'importazione. Controlla che il promemoria venga mantenuto.
- L'evento nel calendario non si aggiorna automaticamente quando cambi o elimini una scadenza in CamperApp. Devi correggere o eliminare anche l'evento calendario. Non reimportare più volte senza controllare i duplicati.
- Il download .ics contiene le informazioni inserite nella scadenza. Condividilo soltanto con i dispositivi familiari autorizzati.

**Importante:** GitHub Pages è un sito statico: senza un servizio push e un processo attivo sul server, CamperApp **non può promettere una notifica automatica quando la web app è completamente chiusa**. L'alternativa gratuita consigliata è il Calendario Android, dopo aver verificato il preavviso.

## Eventi, campeggi e itinerari

Le ricerche di eventi, sagre, campeggi, aree sosta e camper service aprono siti esterni. CamperApp **non verifica automaticamente** orari, disponibilità, prezzi, idoneità alle dimensioni del veicolo o date effettive delle manifestazioni. I link per singola giornata aiutano a evitare l'eccesso di tappe dei collegamenti Google Maps.

**Google Maps non certifica percorsi adatti a un camper alto 2,95 m o lungo 7,38 m:** verifica sempre cartelli, ponti, strade, limitazioni di massa e accessi.

## Dati, sicurezza e offline

- Firebase gestisce autenticazione e dati condivisi. Il repository del sito non contiene copie delle liste familiari Firestore.
- Prima di modificare regole e servizi Firebase **confronta le regole effettivamente pubblicate con quelle nel repository** e prova l'accesso con tutti gli account. Non distribuire automaticamente nuove regole di sicurezza senza verifica.
- Il client segnala alcune condizioni offline ed evita di avviare salvataggi quando il dispositivo dichiara di non avere rete. Non è un database offline completamente autonomo.
- La cache PWA cerca di mantenere i file dell'interfaccia accessibili offline; Firebase e altri servizi esterni possono comunque richiedere Internet.
- Il controllo sulle regole Firestore e i test di autorizzazione richiedono una prova dedicata sul progetto attivo. Vedi [rapporto di sicurezza](VERIFICHE_STABILITA_SICUREZZA_2026-11-22.md).

## Norme di sosta

La sezione Europa separa sosta diurna/notturna, campeggio, servizi di scarico e fonti nazionali/regionali. Non costituisce una certificazione legale delle ordinanze comunali o delle restrizioni temporanee. Controlla sempre la fonte ufficiale e la segnaletica del luogo. Vedi [rapporto sul vademecum](VADEMECUM_VERIFICHE_2026-11-22.md).

## Collaudi e distribuzione

La sincronizzazione familiare e le principali funzioni dell'itinerario sono state collaudate dai familiari su Android nelle versioni precedenti. I nuovi avvisi GPS, l'ordinamento per coordinate e la navigazione giornata per giornata devono essere provati sul dispositivo dopo la pubblicazione. Il solo controllo statico del codice **non** sostituisce queste prove.

Le modifiche vengono preparate in un ramo GitHub separato e pubblicate su `main` solo dopo verifica e salvataggio di un backup. Nessuna di queste funzioni richiede API di navigazione a pagamento o modifica delle impostazioni Firebase.
