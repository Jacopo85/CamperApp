# CamperApp: revisione sicurezza isolata (NON DISTRIBUIRE)

Questo ramo contiene SOLO modifiche ai codici invito, alle regole Firestore e test di emulazione.
Non contiene fotografie, le 66 schede normative, dati personali o configurazioni di servizio segrete.

## Stato
- NON unire su main e NON applicare le regole a Firebase di produzione finché i test dell'emulatore e i test reali dei due account non saranno superati.
- La modifica non viene distribuita automaticamente: il file firestore.rules in GitHub non aggiorna da solo il database Firebase.
- La versione attuale dei due account può continuare a funzionare su main.

## Compatibilità e migrazione
- Le membership esistenti restano valide: la lettura dei gruppi è sempre basata sui documenti membership.
- I codici invito di 12 caratteri senza scadenza NON saranno più accettati: il proprietario deve crearne uno nuovo.
- Aggiornare client e regole in una finestra coordinata, dopo aver verificato i test e la conservazione dei dati.
- Il nuovo invito scade dopo 7 giorni; il codice è riutilizzabile fino alla scadenza. Non condividerlo pubblicamente.
- Verificare che l'indirizzo email restituito da Firebase Auth coincida con quello del profilo e della membership.

## Test automatici
Su ambiente con Node 22 e Java 21:
  npm install
  npx firebase emulators:exec --only firestore --project demo-camperapp-security --config firebase.json "npm run test:rules"

La CI usa esclusivamente l'emulatore con ID demo-camperapp-security e non tocca Firebase reale.

## Restano fuori da questo PR
- Rilascio delle 66 schede europee, foto e licenze.
- Collaudo Android/tablet/Google Maps, GPS e sincronizzazione reale.
- Controlli normativi e diritti di terzi.
