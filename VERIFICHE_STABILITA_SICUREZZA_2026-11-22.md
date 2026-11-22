# CamperApp Family – verifica tecnica e sicurezza (22/11/2026)

## Ambito di questa fase
Modifiche preparate nel ramo di prova e destinate a GitHub Pages soltanto dopo controlli e backup. **Nessuna modifica al progetto Firebase, alle regole Firestore attive, ai documenti familiari o ai servizi di hosting.**

### Controlli statici e correzioni
- Gli inviti di gruppo nuovi sono generati con `crypto.getRandomValues` invece di `Math.random`. Gli inviti esistenti non vengono cambiati.
- `canWrite` ora richiede anche un account autenticato e un gruppo attivo, oltre alla connessione dichiarata disponibile.
- Evitati indirizzi email familiari completi nel codice sorgente corrente per associare le etichette degli autori. **Le versioni passate del repository Git restano comunque nella cronologia**: la rimozione dal sorgente attuale non implica cancellazione della cronologia.
- Corretto il rischio di link Google Maps con più di 3 tappe intermedie su browser Android. I viaggi lunghi si aprono singolarmente per giornata e restano soggetti alle restrizioni stradali per camper.
- Il monitoraggio di prossimità è opzionale, richiede coordinate valide e autorizzazione GPS; funziona **solo mentre la web app è in uso/visibile**. Non invia la posizione del dispositivo a Firebase né a un nuovo servizio esterno. Browser e Android possono sospendere la geolocalizzazione.
- Si possono aggiungere coordinate alle mete già salvate mediante un'azione esplicita dell'utente; queste **vengono memorizzate nel gruppo Firestore**, come le altre mete condivise. Non si esegue una migrazione automatica.
- Distanze geografiche in linea d'aria: non sono tempi o distanze di guida; Google Maps rimane il navigatore esterno.
- Eventi, sagre, servizi e campeggi vengono cercati su servizi esterni **su azione dell'utente**. Non sono filtrati per prezzo, apertura, raggiungibilità o disponibilità.

## Verifiche di sicurezza delle regole Firestore del repository
La lettura di `firestore.rules` del repository indica che:
- L'accesso alle collezioni `shopping`, `wishlist` e `settings` richiede la presenza di un documento `members/{uid}` nel gruppo, condizione di base positiva.
- La regola `members/{userId} allow update` richiede che `uid` resti costante, **ma non impedisce di modificare `role` o `email`** per il proprio documento membro. Potrebbe permettere di falsare etichette o ruoli presentati dall'interfaccia; le verifiche lato client non sono un sostituto di controlli nelle regole.
- La modifica di `groups/{groupId}` è concessa a qualunque membro purché resti invariato `ownerUid`; valutare se limitare l'aggiornamento ai soli campi previsti o al proprietario.
- Per i documenti in `shopping`, `wishlist`, `settings` non risultano limiti di schema e dimensione dei singoli campi nelle regole fornite; sarebbe opportuno definire con precisione tipi, valori consentiti e scriventi.
- `firestore.rules` potrebbe differire dalle **regole effettivamente pubblicate in Firebase**: il controllo delle regole operative e l'esecuzione di test di autorizzazione nel Firebase Emulator o su ambiente di prova **non sono stati effettuati in questa sessione**.
- **Non aggiornare direttamente le regole in produzione senza prima controllare compatibilità con i tre account e con il flusso d'invito esistente.** Una modifica errata può bloccare il gruppo familiare.

## Test ancora necessari sul dispositivo
1. Aprire la PWA aggiornata online su tablet e telefoni, verificando login e sincronizzazione della spesa e delle mete.
2. Inserire coordinate GPS di una meta di prova (o aggiornarle esplicitamente), verificare la sincronizzazione e avviare/fermare il controllo di prossimità con autorizzazione.
3. Generare un itinerario di più giorni, aprire le singole giornate in Google Maps e verificare che non siano perse tappe.
4. Provare una ricerca di eventi e servizi in presenza di rete, verificando sempre le fonti.
5. Verificare un riavvio dopo la prima visita e comportamento offline, senza considerare garantita la disponibilità di Auth/Firestore senza rete.
6. Controllare separatamente le **regole effettivamente pubblicate** di Firestore e l'impossibilità per un account esterno di accedere ai dati. Questo richiede accesso al progetto Firebase e non è dimostrabile dal solo codice GitHub.

## Limiti confermati
Le 66 schede normative europee sono una base documentale, non una certificazione di ogni ordinanza locale. Non è disponibile un motore gratuito di routing certificato per i vincoli di altezza (2,95 m), larghezza (2,32 m), lunghezza (7,38 m) e massa (3.500 kg). I risultati esterni di ricerca e la geolocalizzazione in background non sono garantiti.
