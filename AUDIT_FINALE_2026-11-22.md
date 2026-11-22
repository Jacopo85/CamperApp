# CamperApp Family — rapporto dei controlli finali (22/11/2026)

**Versione codice esaminata:** 18, con sola correzione di cache proposta nella 19. **Uso previsto:** privato, due account familiari e tre dispositivi Android. Non è stata apportata alcuna modifica alla configurazione Firebase, alle regole pubblicate, ai dati Firestore o ai servizi esterni.

## Esiti verificati sul codice
- Analisi di **10 file JavaScript**: tutti superano il controllo di sintassi (`app.js`, `deadlines-ui.js`, `deadline-utils.js`, `guide.js`, `route-geo.js`, `sw.js`, `norme-sosta.js`, `norme-regionali.js`, `vademecum-data.js`, `firebase-config.js`).
- **97 elementi HTML con ID**: nessun ID duplicato e nessun riferimento mancante fra i controlli richiesti da `app.js` e `deadlines-ui.js`.
- Service worker: **12 risorse nell'elenco principale della cache**; tutte corrispondono a file del progetto. I moduli JavaScript importati da sorgenti locali sono presenti.
- Vademecum europeo: generate in simulazione **66/66 schede**, inclusi **20 territori regionali italiani** e **46 stati/territori europei**; nessun errore di renderizzazione, ogni regione ha almeno una fonte indicata. La presenza di fonti non equivale a certificare tutte le disposizioni locali.
- La configurazione Firebase esposta come codice web **non contiene chiavi private di service account** secondo la ricerca testuale effettuata. La configurazione web del client non è una credenziale di amministrazione; il controllo dell'accesso ai dati è affidato a Authentication e alle Security Rules.
- Controlli precedentemente eseguiti sulla versione 17 e confermati dall'utente sui dispositivi per le funzioni già usate: sincronizzazione familiare e scadenzario, collegamento e promemoria di Google Calendar.
- La versione 19 introduce un'unica correzione della cache offline per gli URL con parametro `?aggiorna=...`. Test simulati superati: fallback su home e `index.html` offline, file CSS dalla cache, risposta di rete in condizioni online, richieste fuori dominio ignorate. Nessuna modifica alle operazioni sui dati.

## Sicurezza: punto non concluso

Il file `firestore.rules` **presente su GitHub** controlla che il richiedente sia membro del gruppo per leggere `shopping`, `wishlist` e `settings`, ma contiene permessi troppo ampi per le modifiche:
1. `groups/{groupId}/members/{uid}`: il membro può aggiornare il proprio documento mantenendo `uid` invariato, senza bloccare una modifica a `role` o `email`.
2. `groups/{groupId}`: qualunque membro può aggiornare il documento gruppo purché non modifichi `ownerUid`, senza whitelist delle altre proprietà.
3. La validazione dei tipi/delle lunghezze dei campi nelle collezioni condivise è minima; il limite applicato dal client non è un limite di sicurezza lato server.

Questi sono **rilievi di analisi del repository**, non la prova che le Security Rules pubblicate su Firebase abbiano lo stesso contenuto, né la prova di letture non autorizzate. Non è possibile dichiarare definitivamente verificato l'isolamento dei dati senza **confrontare le regole effettivamente attive** ed eseguire test di autorizzazione con un utente non membro.

Per facilitare questo passaggio è stata predisposta la bozza `firestore.rules.hardening-candidate.txt` **solo nel ramo `audit/camperapp-family-verifica-finale-2026-11-22`**: limita l'aggiornamento del gruppo al proprietario e disabilita gli aggiornamenti dei documenti membro. **Non è stata distribuita.** Non applicarla alle regole reali senza test di compatibilità del flusso di invito e dei due account esistenti.

Firebase raccomanda di verificare l'adeguatezza delle regole con Emulator Suite o test nel Rules Playground:
- https://firebase.google.com/docs/firestore/security/test-rules-emulator
- https://firebase.google.com/docs/firestore/security/get-started

## Limiti residui non bloccanti nell'uso familiare
- Le interfacce offline possono essere consultabili dopo il caricamento, ma le operazioni Firestore e l'autenticazione **non sono garantite senza Internet**. La correzione di cache non cambia questa limitazione.
- L'app registra le scadenze; le notifiche quando è chiusa dipendono dagli eventi salvati separatamente in Google Calendar, che non si aggiornano automaticamente alle modifiche in CamperApp.
- Google Maps non garantisce un itinerario sicuro per le dimensioni e la massa del camper.
- `manifest.webmanifest` non dichiara icone dedicate: l'installabilità come PWA può variare in base al browser, benché i collegamenti Android già installati siano stati usati con successo.
- Le 66 schede normative non possono sostituire ordinanze aggiornate, cartelli e verifiche ufficiali alla data del viaggio.

## Ulteriori controlli che richiedono accesso al servizio/dispositivo
1. **Firestore reale:** confrontare il testo delle Security Rules attive con quelle del repository, verificare accesso e scrittura ammessi ai due membri e vietati a un account estraneo. Nessuna modifica in produzione prima dei test.
2. **Offline Android:** aprire CamperApp una volta online, poi usare la modalità aereo e verificare che si apra almeno l'interfaccia senza promettere la sincronizzazione dei dati. Riconnettersi senza salvare modifiche durante la prova.
3. **Versione 19:** controllare il numero della versione nel footer del sito dopo la normale ricarica.
4. **GitHub Pages:** l'effettiva propagazione sul sito pubblico non è verificabile con certezza dai soli file GitHub. L'utente aveva confermato l'uso della versione 18; per la 19 manca ancora una verifica reale sul tablet.

## Criterio di chiusura
**Funzioni operative e testate nell'uso quotidiano: sì, secondo le conferme degli utenti. Certificazione finale dei permessi attivi di Firebase: non ancora effettuata.** Per evitare di bloccare il gruppo familiare, mantenere le regole di produzione inalterate fino alla verifica dedicata.

Documentazione tecnica Cache API: https://developer.mozilla.org/en-US/docs/Web/API/Cache/match
