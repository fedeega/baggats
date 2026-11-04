# BAGGATS POWER TRAINING · come metterla online

Da computer, circa 20 minuti. Una volta fatto non serve più toccare niente.

Prima di tutto **scompatta `baggats.zip`**: ottieni la cartella `baggats`.

---

## PARTE 1 · Database (Supabase, gratis) · 10 minuti

**1. Crea il progetto**
- Vai su **supabase.com** → **Start your project** → entra con GitHub.
- Premi **New project**:
  - Name: `baggats`;
  - Database Password: premi **Generate** e salvala da qualche parte;
  - Region: **Central EU (Frankfurt)**.
- Premi **Create new project** e aspetta 1–2 minuti che sia pronto.

**2. Crea le tabelle**
- Menu a sinistra → **SQL Editor** → **New query**.
- Apri `baggats/supabase/1_schema.sql` con un editor di testo (Blocco note o TextEdit), copia **tutto** e incollalo.
- Premi **Run**. Deve uscire *"Success. No rows returned"*.

**3. Blocca le registrazioni**
- Menu → **Authentication** → **Sign In / Providers**:
  - lascia attivo **Email**;
  - **disattiva "Allow new users to sign up"** e premi **Save**.

Così nessuno può crearsi un account da solo: gli utenti li crei tu.

**4. Crea i due utenti**
- **Authentication** → **Users** → **Add user** → **Create new user**:
  - la **tua** email e una password, spunta **Auto Confirm User** → **Create user**;
  - ripeti con l'**email di papà** e una password facile da ricordare, sempre con **Auto Confirm User**.

L'email di papà serve solo come nome utente: non gli arriva nessuna mail.

**5. Collega voi due e carica le schede**
- **SQL Editor** → **New query**.
- Apri `baggats/supabase/2_ruoli_e_scheda.sql` e copialo tutto.
- **In alto, subito sotto `declare`,** sostituisci `EMAIL_DI_FEDE@esempio.it` e `EMAIL_DI_GIAN@esempio.it` con le due email vere del punto 4. Lascia gli apici `'...'`.
- Premi **Run**. In fondo devi vedere:
  - Fede `coach` e Gian `athlete`, con `collegato_al_coach = true`;
  - 2 schede: *Scheda precedente* (non attiva) e *Scheda Novembre 2026* (attiva);
  - `allenamenti_importati = 4`.

Questo passo carica già la scheda nuova, quella vecchia e gli ultimi allenamenti della vecchia app, così storico e grafici partono da lì. Se lo rilanci per sbaglio non duplica niente.

**6. Copia le chiavi**
- Menu → **Project Settings** (ingranaggio) → **API Keys**.
- Copia la chiave **anon public** (scheda *Legacy API keys*) oppure, se c'è solo quella, la **publishable key** (`sb_publishable_...`).
- **Project Settings** → **Data API**: copia il **Project URL** (`https://xxxx.supabase.co`).
- Apri `baggats/js/config.js` e incolla i due valori al posto di `INCOLLA_QUI_...`, tra gli apici. Salva.

La chiave anon/publishable è fatta per stare in un sito pubblico: i dati sono protetti dalle regole del database.

---

## PARTE 2 · Sito (GitHub Pages, gratis) · 5 minuti

**7. Crea il repository**
- Su **github.com** premi **+** in alto a destra → **New repository**.
- Repository name: `baggats`, visibilità **Public** (serve per le Pages gratis) → **Create repository**.

**8. Carica i file**
- Nella pagina del repository vuoto premi **uploading an existing file**.
- Apri la cartella `baggats` sul computer, **seleziona tutto quello che c'è dentro** (index.html, cartelle css, js, icons…) e trascinalo nella pagina.

  ⚠️ Trascina il contenuto, non la cartella intera: `index.html` deve finire in cima al repository.
- Aspetta che finisca il caricamento → **Commit changes**.

**9. Accendi il sito**
- Nel repository: **Settings** → **Pages**:
  - Source: **Deploy from a branch**;
  - Branch: **main**, cartella **/ (root)**;
  - premi **Save**.
- Dopo 1–2 minuti, sempre in quella pagina, compare il link **https://TUO-NOME-GITHUB.github.io/baggats/**.

**10. Prova da computer**
- Apri il link ed entra con la **tua** email e password: devi vedere la parte COACH con le schede già caricate.

---

## PARTE 3 · Sui telefoni · 2 minuti a testa

**11. Il telefono di papà (Android)**

Meglio se lo fai tu sul suo telefono.
1. Apri **Chrome** e vai al link `https://TUO-NOME-GITHUB.github.io/baggats/`.
2. Entra con **la sua email e la sua password**.
3. Tocca i **tre puntini ⋮** in alto a destra → **Installa app** (o **Aggiungi a schermata Home**) → **Installa**.
4. Chiudi Chrome e apri **Baggats** dall'icona col toro: si apre a schermo intero e resta collegato.
5. Primo giro di prova: tocca **INIZIA**, spunta una serie e controlla che parta il timer con il suono. Il volume del telefono deve essere alto.

**12. Il tuo iPhone**
1. Apri il link con **Safari**: le altre app non permettono l'installazione.
2. Entra con la **tua** email e password.
3. Tocca **Condividi** (quadrato con la freccia in su) → **Aggiungi alla schermata Home** → **Aggiungi**.
4. Apri **Baggats** dall'icona. Il login va rifatto una volta dentro l'app, perché è separata da Safari.

Fatto. Papà apre l'icona, preme INIZIA e si allena. Tu vedi tutto in tempo reale dalla tua app.

---

## Come funziona

**Gian (atleta)**
- **Inizio:** un bottone grande con l'allenamento di oggi. La rotazione è A → Gambe → B → C, ma può sceglierne un altro.
- **Serie:** già compilate con i carichi dell'ultima volta: spunta, oppure corregge il numero con − e +.
- **Timer:** il recupero parte da solo, con suono e vibrazione (la vibrazione funziona solo su Android). Lo schermo resta acceso. Gli esercizi a tempo hanno il loro timer.
- **Esercizi:** toccandoli vede il disegno, la spiegazione e il link a YouTube.
- **Fine:** fatica (faccine), dolori sì/no e dove, una nota.
- **Home:** calendario con i pallini, tasto **Pesati** con il grafico del peso, record personali.
- **Senza rete:** funziona lo stesso e manda tutto appena torna la connessione.

**Fede (coach)**
- **Gian:**
  - panoramica, con dolori segnalati e allenamenti nuovi;
  - calendario;
  - messaggi, che lui vede appena apre l'app.
- **Allenamenti:** ogni seduta con kg, ripetizioni, pause reali e note. Puoi commentarle.
- **Grafici:**
  - forza (massimale stimato);
  - volume;
  - trazioni e dip;
  - peso;
  - fatica;
  - durata;
  - recuperi.
- **Scheda:** modifichi tutto: esercizi, serie, ripetizioni, pause, coppie, circuiti, carico obiettivo, link YouTube e foto o video tuoi.
  - **Salva modifiche:** papà vede subito "Fede ha aggiornato la scheda".
  - **Salva come nuova scheda:** la vecchia va in **Archivio**, storico e grafici continuano.

## Se qualcosa non va

- **"Email o password sbagliate":** controlla di aver spuntato *Auto Confirm User* al punto 4. Puoi anche reimpostare la password da Authentication → Users → ⋯ → *Reset password*.
- **Entri ma è tutto vuoto o dice "non collegato":** rifai il punto 5 controllando le email.
- **Il link GitHub dà 404:** aspetta 2 minuti e controlla che `index.html` sia in cima al repository, non dentro una cartella.
- **L'app gira in "MODALITÀ DEMO":** `config.js` non è stato compilato bene (punto 6). Correggilo e ricaricalo su GitHub.
- **Progetto in pausa:** Supabase gratis va in pausa dopo 7 giorni senza nessun accesso. Con gli allenamenti non succede. Se capita: dashboard Supabase → **Restore project**.

## Aggiornare l'app in futuro

Se cambio dei file: li ricarichi su GitHub (stessa procedura del punto 8, sovrascrivono quelli vecchi) e in `sw.js` alzi il numero di `VERSION` (es. `baggats-v3`). Al giro dopo i telefoni scaricano la versione nuova.

**Kg:** per i manubri si scrive il peso del singolo manubrio. Per il bilanciere, il peso dei dischi senza il bilanciere.
