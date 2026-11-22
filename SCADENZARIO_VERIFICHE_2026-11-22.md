# CamperApp Family — scadenzario e collaudo del 22 novembre 2026

## Funzione introdotta
Scadenzario nella scheda **Camper** con categorie Bollo, Assicurazione, Tagliando, Revisione, Manutenzione e Altro. Ogni scadenza include descrizione, data manuale, preavviso selezionabile (0, 1, 3, 7, 15, 30, 60 o 90 giorni) e note facoltative.

Lo scadenzario mostra date future, in scadenza e scadute. Le scadenze nel periodo di avviso e quelle scadute compaiono anche in **Home**. Si possono aggiungere, aggiornare (anche in seguito al rinnovo), eliminare ed esportare.

## Sincronizzazione
Dati memorizzati in `groups/{groupId}/settings/deadlines`, documento nella sottocollezione **settings** già usata dall'app. Modifiche tramite transazioni Firestore per ridurre conflitti tra account. Limite implementato: 80 scadenze per gruppo. Nessuna migrazione dei dati, nessuna nuova collezione, nessun intervento sulle regole Firebase esistenti.

## Notifiche: limiti da non nascondere
- Il pannello e la Home mostrano scadenze e preavvisi quando CamperApp viene aperta e i dati sono accessibili.
- L'utente può abilitare notifiche browser tramite autorizzazione esplicita. Sono tentate **soltanto mentre la PWA è visibile** e il browser supporta `ServiceWorkerRegistration.showNotification()`. Deduplicazione per scadenza, data, preavviso e account su ogni dispositivo.
- Non esiste alcuna schedulazione server, Firebase Cloud Function, servizio push in background, né processo di polling quando la PWA è chiusa. **Non garantire notifiche con CamperApp chiusa.**
- Per il calendario Android di Google la soluzione pratica è il pulsante **Google Calendar** nella riga: apre un evento precompilato alle 09:00. L'utente deve selezionare e salvare manualmente il preavviso richiesto dentro Google Calendar.
- L'esportazione `.ics` segue lo standard iCalendar con `VALARM` relativo all'inizio. Google Calendar **app Android non importa direttamente** i file ICS; altre applicazioni potrebbero supportarli, o è possibile usare l'importazione nella versione web desktop di Google Calendar. Nessun calendario esterno si aggiorna automaticamente dopo modifiche in CamperApp.
- Le scadenze legali di bollo e revisione, e le date di rinnovo contrattuali, **non vengono calcolate dall'app**: sono indicate manualmente dalla famiglia.

## Verifiche sul codice superate
- Sintassi JavaScript per i nuovi moduli, `app.js` e `sw.js`.
- Tutti gli identificatori DOM utilizzati dall'app e dallo scadenzario esistono una sola volta nel file HTML.
- Modulo date: anni bisestili, date non valide, differenze di giorni locali, promemoria imminenti e scadenze superate.
- Modulo calendario: eventi alle 09:00 locali, `VALARM` con preavvisi configurati, ID stabile per evento, escaping del testo e ripiegatura delle righe UTF-8 entro 75 ottetti.
- Simulazione con due account: aggiunta, sincronizzazione, modifica da un account e ricezione da un altro, apertura Google Calendar, esportazione ICS, una notifica web senza duplicato, blocco salvataggi offline, eliminazione e rimozione dell'avviso dalla Home.
- `firestore.rules` del ramo di prova confrontato con `main`, senza modifiche. **La coincidenza con le regole Firebase attualmente pubblicate non è stata verificata.**
- Cache del service worker aggiornata alla versione **17**, comprendendo i nuovi moduli.

## Verifiche Android da eseguire
1. Aggiornare CamperApp sui due telefoni e sul tablet, controllando **versione 17** nel footer.
2. Su un dispositivo aggiungere una scadenza fittizia tra tre giorni e impostare avviso 7 giorni prima.
3. Sul secondo dispositivo verificare che compaia nella scheda Camper e nel riepilogo Home.
4. Aprire **Google Calendar**, confermare evento e notifica 7 giorni prima. Verificare la presenza del promemoria nell'app Calendario. È un'operazione manuale.
5. Con CamperApp aperta, abilitare gli avvisi web, verificare il consenso del browser e, se supportato, la notifica per la scadenza fittizia.
6. Modificare la data da un dispositivo e controllare l'aggiornamento sull'altro; correggere manualmente l'evento Google Calendar esterno.
7. Eliminare la scadenza fittizia e controllare che scompaia dal gruppo; eliminarla anche dal calendario, se era stata salvata.

La versione 17 è stata sottoposta a test di codice e simulazioni. **Non è ancora stata testata realmente sui tre Android** e **non è stata effettuata una prova diretta sui permessi Firestore di produzione**. Evitare di considerare questi aspetti completati senza il collaudo sul dispositivo.
