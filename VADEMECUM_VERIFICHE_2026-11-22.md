# CamperApp Family — ricognizione normativa al 22/11/2026

## Stato del catalogo
- **66 schede consultabili nell'app:** 46 Stati/territori europei e 20 regioni italiane.
- **46/46 schede europee:** dispongono di un profilo documentale distinto. La presenza di un profilo non significa che ogni diritto di sosta sia stato verificato.
- **20/20 regioni italiane:** l'articolo 185 del Codice della Strada è distinto dalle indicazioni regionali.
- **20 regioni italiane:** ora dispongono di riferimenti regionali individuati. Per Molise e Basilicata il testo non è consolidato/aggiornato e non costituisce verifica delle successive modifiche. Molte fonti riguardano strutture ricettive, non sosta su strada.
- **Nuove integrazioni del 22/11/2026:** Molise LR 5/2001 e modifica 10/2008; Basilicata LR 6/2008; Calabria LR 32/2024; Sicilia LR 6/2025 art. 23 (campeggio fuori aree autorizzate).
- **Riferimenti nel catalogo ampliato:** sono stati aggiunti collegamenti a norme regionali e ministeriali. **Non tutti sono testi di legge**: sono presenti enti pubblici, portali turistici ufficiali, comunicazioni consolari e indicazioni di un'associazione automobilistica.

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

## Controllo mirato del 22/11/2026
- Calabria: LR 32/2024 art. 2 commi 8-9, limite di 48 ore per le aree contemplate e eccezione per aree senza attività di campeggio; non esteso ad altre strade o parcheggi.
- Sicilia: LR 6/2025 art. 23 comma 4, divieto di campeggio fuori dalle strutture e aree individuate; distinzione dalla sosta stradale dell'art. 185 CdS.
- Paesi Bassi: il Comune di Amsterdam permette il parcheggio del camper sulla via pubblica per al massimo 3 giorni consecutivi, ma vieta di dormirvi; regola locale, non nazionale.
- Croazia: divieto di campeggio fuori strutture e aree appositamente individuate nella legge ministeriale consultata (art. 29), distinta dalla sosta in un regolare parcheggio.
- Regno Unito: indicazioni Highland Council relative solo agli spazi aderenti al programma, con orari e condizioni locali.
- Svezia: fonte Naturvårdsverket sul divieto di accesso fuoristrada e sulle aree di riposo; la permanenza non è uniformemente disciplinata per tutti i parcheggi.
- Non sono state verificate exhaustivamente eventuali modifiche di legge posteriori ai singoli documenti, tutte le ordinanze comunali o la raggiungibilità di ogni collegamento del catalogo.

## Miglioramenti finali della ricognizione — 22/11/2026
- **Valle d'Aosta:** sostituito il solo glossario turistico con il riferimento regionale LR 8/2002 sui complessi all'aperto e pagina istituzionale dedicata.
- **Piemonte:** fonte istituzionale specifica sul turismo itinerante e riferimento all'articolo 8 della LR 5/2019.
- **Sardegna:** LR 7/2022, limite ordinario di 72 ore nelle aree attrezzate di sosta temporanea, deroga fino a 120 ore per al massimo il 30% delle piazzole. Non applicare questi limiti ai parcheggi stradali ordinari.
- **Amsterdam (Paesi Bassi):** la fonte ufficiale locale dispone parcheggio massimo 3 giorni consecutivi sulla strada pubblica e vieta il pernottamento nel mezzo. Non è una norma per tutto il Paese.
- **Croazia:** art. 29 della legge ministeriale sulle attività ricettive; divieto di campeggio fuori da campeggi e aree specificamente individuate nei casi previsti. Il testo ministeriale consultato richiede una verifica delle modifiche successive.
- **Svezia:** il diritto di accesso alla natura non consente l'uso del camper fuori strada; l'agenzia ambientale indica normalmente un limite di 24 ore nei giorni feriali nelle aree di riposo, con possibili differenze nel fine settimana e per segnaletica.
- **Regno Unito (Highlands):** solo nei parcheggi aderenti allo schema Highland Council: pernottamento 22:00–08:00, senza ritorno nello stesso parcheggio entro 72 ore. Non è un regime nazionale.
- **Spagna:** precisata l'importanza delle disposizioni municipali secondo la DGT 2026.
- **Interfaccia:** la scheda italiana mostra prima la disciplina regionale, poi la regola nazionale all'interno di una sezione espandibile.
- **Ricerca ordinanze comunali:** aggiunto un collegamento a ricerca web esterna basata sul Comune inserito; i risultati **non** sono controllati automaticamente dall'app e non sono fonti certificate.
- **Verifiche di qualità:** sintassi controllata per i moduli JavaScript; test simulato di apertura per 66/66 schede, test dei campi per ricerca locale e verifica che il codice non tocchi Firestore.
- **Cache:** aggiornata alla versione 15; consultazione offline resta prevista per i file già memorizzati.

## Ambito della dichiarazione di completamento
Si considera terminato **il lavoro di compilazione e integrazione dei 66 profili documentali del catalogo**, non l'audit legale esaustivo di tutte le ordinanze, le variazioni legislative e le aree di sosta europee. Non è stata effettuata una verifica in sito o un test manuale sui tre dispositivi Android per questo aggiornamento. Prima di un viaggio controllare le disposizioni del luogo e i segnali stradali.
