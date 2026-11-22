# CamperApp Family — ricognizione normativa al 22/11/2026

## Stato del catalogo
- **66 schede consultabili nell'app:** 46 Stati/territori europei e 20 regioni italiane.
- **46/46 schede europee:** dispongono di un profilo documentale distinto. La presenza di un profilo non significa che ogni diritto di sosta sia stato verificato.
- **20/20 regioni italiane:** l'articolo 185 del Codice della Strada è distinto dalle indicazioni regionali.
- **17 regioni italiane:** dispongono di almeno un riferimento regionale utile (in alcuni casi relativo soltanto a strutture ricettive, non a sosta su strada).
- **Molise, Basilicata, Calabria:** non sono state reperite fonti regionali sufficienti per formulare indicazioni normative specifiche.
- **Riferimenti inseriti:** 49 collegamenti nei profili nazionali, 23 nelle schede regionali. **Non tutti sono testi di legge**: sono presenti enti pubblici, portali turistici ufficiali, comunicazioni consolari e indicazioni di un'associazione automobilistica.

## Criteri seguiti
1. Distinguere le regole per parcheggio diurno, permanenza notturna, campeggio vero e proprio, servizi di carico/scarico acque e WC.
2. Non confondere un'area attrezzata ricettiva con un parcheggio stradale; limiti delle prime non sono automaticamente validi per tutti i secondi.
3. Per l'Italia l'articolo 185 CdS è il livello **nazionale**; Regioni, Comuni, ZTL, aree protette e ordinanze possono introdurre regole specifiche nei limiti consentiti.
4. Per Stati federali o con ordinamenti territoriali articolati non trasformare norme locali in regole nazionali.
5. Gli avvisi MAECI relativi a Bielorussia, Russia e Ucraina sono **avvisi di sicurezza di viaggio**, non norme sul campeggio o sul parcheggio.
6. Per le informazioni non confermate, indicare esplicitamente "non verificato"; **nessuna autorizzazione, eccezione, durata di sosta o sanzione è presunta**.

## Limiti ancora aperti
Questa ricognizione **non può considerarsi una certificazione legale esaustiva** di ogni Comune europeo. Divieti temporanei, ordinanze comunali, regolamenti di parchi, vincoli stagionali, ZTL, soste private e disponibilità degli impianti cambiano frequentemente.

Prima di sostare, consultare la normativa del singolo luogo, i cartelli presenti e il gestore; in caso di dubbio scegliere un campeggio o un'area camper espressamente autorizzata. Le fonti inserite in app sono punti di partenza per la verifica e potrebbero richiedere aggiornamenti.

## Informazioni tecniche
- Catalogo mete e territori: `vademecum-data.js` (conservato).
- Schede nazionali e documentazione: `norme-sosta.js`.
- Schede regionali: `norme-regionali.js`.
- Visualizzazione delle informazioni: `guide.js`.
- Cache offline: `sw.js`, versione `v13`, include i dati regionali.
- Nessun intervento sul database Firestore, sugli account o sulle regole Firebase.
