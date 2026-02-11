import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

export interface StudentData {
  nume: string;
  prenume: string;
  cetatenia: string;
  email: string;
  raion: string;
  localitate: string;
  strada: string;
  numar: string;
  apartament: string;
  serieActIdentitate: string;
  numarActIdentitate: string;
  eliberatDe: string;
  dataEliberare: string;
  dataNasterii: string;
  sex: 'M' | 'F';
  idnp: string;
  telefon: string;
  telefonContact: string;
  cutie: 'MECANICĂ' | 'AUTOMATĂ';
  deUndeAflat: string;
  // contractNumber: string;
}

@Injectable()
export class ContractService {

  private generateApplicationHTML(data: StudentData): string {
    return `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4;
      margin: 2cm;
    }
    
    body {
      font-family: 'Times New Roman', serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #000;
    }
    
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    
    .header h1 {
      font-size: 16pt;
      font-weight: bold;
      margin: 5px 0;
    }
    
    .header h2 {
      font-size: 14pt;
      font-weight: bold;
      margin: 5px 0;
    }
    
    .header h3 {
      font-size: 12pt;
      font-weight: bold;
      margin: 15px 0;
    }
    
    .intro {
      text-align: justify;
      margin-bottom: 20px;
    }
    
    .field {
      margin-bottom: 10px;
    }
    
    .field-label {
      font-weight: bold;
      display: inline;
    }
    
    .field-value {
      display: inline;
    }
    
    .indent {
      margin-left: 20px;
    }
    
    .footer {
      margin-top: 30px;
      font-size: 9pt;
      font-style: italic;
      text-align: justify;
    }
    
    .signature {
      margin-top: 40px;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Școala Auto</h1>
    <h2>"PROD-AM SERVICE" SRL</h2>
    <h3>CEREREA LA CONTRACT</h3>
  </div>
  
  <div class="intro">
    <p>Rog, să fiu înmatriculat(ă) în grupa de pregătire a conducătorilor de autovehiculelor de <strong>categoria B.</strong> Cu condițiile și termenul studiilor sunt la curent și mă angajez să le îndeplinesc.</p>
    <p>În trecut permis de conducere nu am avut și de poliția rutieră nu a fost confiscat.</p>
  </div>
  
  <div class="field">
    <span class="field-label">1. Nume:</span> <span class="field-value">${data.nume}</span><br>
    <span class="indent"><span class="field-label">Prenume:</span> <span class="field-value">${data.prenume}</span></span>
  </div>
  
  <div class="field">
    <span class="field-label">2. Cetățenia:</span> <span class="field-value">${data.cetatenia}</span>
  </div>
  
  <div class="field">
    <span class="field-label">3. Email:</span> <span class="field-value">${data.email}</span>
  </div>
  
  <div class="field">
    <span class="field-label">4. Domiciliu:</span><br>
    <div class="indent">
      Raionul(sectorul): ${data.raion}<br>
      Localitatea: ${data.localitate}<br>
      str. ${data.strada}, nr. ${data.numar}, ap. ${data.apartament}
    </div>
  </div>
  
  <div class="field">
    <span class="field-label">5. Actul de identitate:</span><br>
    <div class="indent">
      seria ${data.serieActIdentitate}, nr. ${data.numarActIdentitate}<br>
      eliberat de ${data.eliberatDe} la data de ${data.dataEliberare}
    </div>
  </div>
  
  <div class="field">
    <span class="field-label">6. Data nașterii:</span> <span class="field-value">${data.dataNasterii}</span>
    &nbsp;&nbsp;&nbsp;&nbsp;Sex: ${data.sex}
  </div>
  
  <div class="field">
    <span class="field-label">7. Numărul de identificare (IDNP):</span> <span class="field-value">${data.idnp}</span>
  </div>
  
  <div class="field">
    <span class="field-label">8. De unde ați aflat de școala noastră:</span> <span class="field-value">${data.deUndeAflat}</span>
  </div>
  
  <div class="field">
    <span class="field-label">9. Număr de telefon:</span> <span class="field-value">${data.telefon}</span>
  </div>
  
  <div class="field">
    <span class="field-label">10. Numărul unei persoane de contact:</span> <span class="field-value">${data.telefonContact}</span>
  </div>
  
  <div class="field">
    <span class="field-label">11. Limba de studii:</span> <span class="field-value">română</span>
  </div>
  
  <div class="field">
    <span class="field-label">12. Instruirea practică la cutie:</span> <span class="field-value">${data.cutie}</span>
  </div>
  
  <div class="footer">
    <p>*Prin prezenta cerere îmi dau acordul, ca datele mele cu caracter personal să fie folosite pentru înmatriculare și păstrare în arhivă de către unitatea de instruire.</p>
  </div>
  
  <div class="signature">
    <div>Data: ________________</div>
    <div>Semnatura: ________________</div>
  </div>
</body>
</html>
    `;
  }

  private generateContractHTML(data: StudentData): string {
    return `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4;
      margin: 2cm;
    }
    
    body {
      font-family: 'Times New Roman', serif;
      font-size: 10pt;
      line-height: 1.3;
      color: #000;
    }
    
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    
    .header h1 {
      font-size: 16pt;
      font-weight: bold;
      margin: 5px 0;
    }
    
    .header h2 {
      font-size: 11pt;
      font-weight: normal;
      margin: 5px 0;
    }
    
    .contract-info {
      font-size: 10pt;
      margin-bottom: 20px;
    }
    
    .parties {
      margin-bottom: 15px;
      text-align: justify;
    }
    
    .party-label {
      font-weight: bold;
      display: inline;
    }
    
    .section-title {
      font-size: 11pt;
      font-weight: bold;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    
    .subsection-title {
      font-size: 10pt;
      font-weight: bold;
      margin-top: 15px;
      margin-bottom: 8px;
    }
    
    p {
      text-align: justify;
      margin: 8px 0;
    }
    
    ul {
      margin: 5px 0;
      padding-left: 25px;
    }
    
    li {
      margin: 5px 0;
      text-align: justify;
    }
    
    .indent {
      margin-left: 20px;
    }
    
    .page-break {
      page-break-after: always;
    }
    
    .signatures {
      margin-top: 50px;
      display: table;
      width: 100%;
    }
    
    .signature-col {
      display: table-cell;
      width: 48%;
      vertical-align: top;
      font-size: 9pt;
    }
    
    .signature-col:first-child {
      padding-right: 4%;
    }
    
    .signature-line {
      margin-top: 30px;
      border-top: 1px solid #000;
      width: 200px;
    }
    
    .final-statement {
      font-weight: bold;
      text-align: justify;
      margin: 30px 0;
    }
  </style>
</head>
<body>
  <!-- PAGINA 1 -->
  <div class="header">
    <h1>CONTRACT</h1>
    <h2>DE PRESTĂRI SERVICII DE INSTRUIRE LA CURSURILE DE CONDUCERE AUTO</h2>
  </div>
  
  <div class="contract-info">
    Nr. <br>
    ________________ mun. Chișinău
  </div>
  
  <div class="parties">
    <span class="party-label">Școala-auto:</span> "PROD-AM SERVICE" SRL, cod fiscal 1022600015731, reprezentată de administratorului Mihaela Prodan, care activează în baza statutului, în calitate de <strong>"ȘCOALA AUTO"</strong> sau <strong>"PRESTATOR"</strong>, pe de o parte,
  </div>
  
  <div class="parties">
    <span class="party-label">Formabil:</span> ${data.nume} ${data.prenume}, IDNP: ${data.idnp}, domiciliat/ă în: ${data.localitate}, str. ${data.strada}, nr. ${data.numar}, ap. ${data.apartament}, numit în continuare <strong>"FORMABIL"</strong> sau <strong>"BENEFICIAR"</strong>, pe de altă parte,
  </div>
  
  <p style="font-size: 9pt;">fiecare denumită individual "Parte", iar colectiv "Părți", conducându-se de prevederile Legii privind siguranța traficului rutier nr. 131-XVI din 07.06.2007, HG nr. 181 din 23 martie 2022 pentru aprobarea Regulamentului privind procedura de examinare pentru obținerea dreptului de a conduce vehicule, emiterea și valabilitatea permisului de conducere, au încheiat prezentul contract cu următoarele prevederi, HG nr. 170 din 29 martie 2023 cu privire la aprobarea Regulamentului de organizare și funcționare a unităților de formare profesională a conducătorilor de vehicule și a Regulamentului de organizare și funcționare a unităților de formare profesională a personalului din domeniul transportului rutier:</p>
  
  <div class="section-title">PREAMBUL:</div>
  <ul>
    <li>Având în vedere specificul obiectului prezentului Contract, Părțile au stabilit că pe parcursul valabilității Contractului, Prestatorul va depune toată diligența pentru îndeplinirea obligațiilor sale, iar Beneficiarul va depune tot efortul pentru asimilarea informațiilor și îndeplinirea sarcinilor corespunzătoare parvenite de la Prestator întru îndeplinirea serviciilor conform prezentului Contract;</li>
    <li>Beneficiarul înțelege că rezultatul executării prezentului Contract poate fi diferit, în dependență de diverși factori obiectivi și subiectivi, precum și capacitățile care include și implicarea nemijlocită a Beneficiarului;</li>
    <li>Serviciile prestate conform prezentului Contract reprezintă pentru Prestator obligație de mijloace;</li>
    <li>Reieșind din specificul serviciului care se prestează, părțile cataloghează ca informație confidențială orice informație care se referă, sau și decurge din prezentul Contract, dacă aceasta nu a fost făcută publică, ca fiind confidențială; Orice încălcare a confidențialității se sancționează în conformitate cu prevederile legislației și a prezentului Contract.</li>
  </ul>
  
  <div class="section-title">I. OBIECTUL CONTRACTULUI</div>
  <p>1. Prin contract, o parte "Prestator" se obligă să presteze celeilalte părți "Beneficiar" servicii de instruire teoretică și practică a formabilului conform programului de formare profesională a conducătorilor de autovehicule "Conducător/conducătoare auto (categoria B)", iar "Beneficiarul" se obligă să plătească prețul în mărimea și condițiile stipulate în prezentul Contract;</p>
  <p>2. Orice modificare a serviciilor ce formează obiectul prezentului Contract și al Anexelor, parte componentă a acestuia (modificarea naturii, volumului serviciilor, prestarea serviciilor auxiliare și de orice altă natură, care inițial nu au fost convenite și specificate de către Părți), se va opera în formă scrisă, prin încheierea Acordurilor Adiționale/Anexelor sau a altor acte care vor face parte integrantă a prezentului Contract.</p>
  
  <!-- PAGINA 2 -->
  <div class="page-break"></div>
  
  <div class="section-title">II. TERMENUL CONTRACTULUI</div>
  <p>1. Contractul este încheiat pentru o perioadă de 12 luni, cu condiția îndeplinirii tuturor obligațiilor stabilite, și va intra în vigoare din momentul semnării acestuia de către părți.</p>
  
  <div class="section-title">III. PREȚUL CONTRACTULUI. CONDIȚIILE DE PLATĂ A PREȚULUI ȘI ALTOR PLĂȚI</div>
  <p>1. Părțile au convenit că pentru prestarea serviciilor indicate în pct. 1.1. din prezentul Contract, Beneficiarul se obligă să achite Prestatorului prețul convenit și stipulată de Părți:</p>
  <div class="indent">
    <p>a) Taxa de instruire pentru lecțiile teoretice constituie <strong>2550 de lei</strong>, iar din 15 februarie 2026 costul cursului va fi de 3200 de lei. Necesită a fi vărsată integral la data semnării contractului.</p>
    <p>b) Taxa de instruire pentru o lecție practică constituie <strong>415 de lei</strong>, iar începând cu 1 mai 2026 aceasta va fi de 450 lei. Sunt obligatorii 30 lecții practice. Poate fi achitată:</p>
    <ul>
      <li>Integral;</li>
      <li>În două tranșe;</li>
      <li>Fiecare lecție individual;</li>
    </ul>
    <p>c) Taxa pentru examen intern practic, pentru fiecare tentativă constituie 300 lei;</p>
    <p>d) Taxa pentru certificatul de școlarizare constituie 350 lei.</p>
    <p>e) Taxa pentru caietele de sarcini constituie suma de 450 lei.</p>
    <p>f) Examinarea teoretică -- gratuit primele 2 tentative. Începând cu tentativa 3 -- 100 lei tentativa.</p>
  </div>
  
  <p>2. Beneficiarul își asumă obligația de a achita prețul serviciilor contractate în numerar și/sau prin transfer bancar la contul de decontare al Prestatorului, stipulat în prezentul Contract;</p>
  
  <p>3. Părțile poartă răspunderea pentru neexecutarea sau executarea necorespunzătoare a obligațiilor născute în baza prezentului Contract, în condițiile prevăzute de acesta;</p>
  
  <p>4. În cazul neexecutării sau executării necorespunzătoare de către Beneficiar a obligației de plată a prețului către Prestator conform pct. 3.1 din prezentul Contract, Beneficiarul acceptă obligația de a achita Prestatorului o penalitate de întârziere în mărime de 0,1% din suma neachitată pentru fiecare zi de întârziere a plății, dar nu mai mult de 10% din suma Contractului;</p>
  
  <p>5. Instruirea practică în conducerea vehiculului se organizează individual pentru fiecare cursant, în conformitate cu orarul stabilit. Fiecare oră de instruire practică are o durată de 90 (nouăzeci) de minute și este documentată prin completarea fișei de instruire.</p>
  
  <p>6. Durata zilnică a instruirii practice programate pentru un cursant nu poate depăși o (1) lecție cu durata de 90 de minute, din pachetul lecțiilor obligatorii. Planificarea și desfășurarea activităților de instruire, atât teoretice, cât și practice, respectă prevederile Hotărârii Guvernului nr. 170 din 29.03.2023 privind aprobarea Regulamentului de organizare și funcționare a unităților de formare profesională a conducătorilor de vehicule.</p>
  
  <p>7. Orele de conducere suplimentare care nu se prevăd la lit. b) se vor efectua contra cost fără a se încheia un nou contract de școlarizare;</p>
  
  <!-- PAGINA 3 -->
  <div class="page-break"></div>
  
  <p>8. În cazul în care, după încheierea contractului, vor interveni majorări de prețuri care afectează prețul serviciilor (cheltuieli și alte plăți pe care Prestatorul nu le-a putut prevedea la momentul încheierii contractului):</p>
  <div class="indent">
    <p>a) Prestatorul are dreptul să majoreze până la 10% prețul Contractului, în raport cu majorările de prețuri intervenite, cu obligația de notificare în scris a Beneficiarului în care să justifice aceste circumstanțe, în termen de 24 ore, despre această hotărâre, în condițiile stipulate de prezentul Contract;</p>
    <p>b) Beneficiarul, în termen de 24 de ore de la data primirii notificării scrise din partea Prestatorului, are obligația să notifice Prestatorul, în scris, dacă acceptă prețul majorat și să solicite continuarea prestării serviciilor.</p>
    <p class="indent">5.1. Dacă Beneficiarul nu răspunde Prestatorului la notificarea scrisă în termenul de mai sus, aceasta este considerată o acceptare tacită a prețului majorat în circumstanțele indicate iar Beneficiarul se obligă să-l achite în condițiile stabilite de prezentul Contract, în termen de 10 (zece) zile calendaristice din momentul acceptării tacite de către Beneficiar a prețului majorat.</p>
  </div>
  
  <div class="section-title">IV. DREPTURILE ȘI OBLIGAȚIILE PĂRȚILOR</div>
  
  <div class="subsection-title">Drepturile și obligațiile Prestatorului:</div>
  <ul>
    <li>Prestatorul are obligația de a presta serviciile prevăzute în contract cu profesionalismul și promptitudinea cuvenite angajamentului asumat și în conformitate cu reglementările în vigoare;</li>
    <li>Prestatorul este ținut, înainte de încheierea Contractului, să furnizeze Beneficiarului, în măsura în care circumstanțele o permit, toate informațiile referitoare la natura, termenele și costurile necesare prestării serviciilor;</li>
    <li>Să înmatriculeze persoana particulară la cursurile de instruire a conducătorilor auto în Sistemul Informațional Registru Unităților de Instruire a Conducătorilor de Vehicule și Formabililor (RUICVF);</li>
    <li>Prestatorul este obligat în prestarea serviciilor să pună la dispoziția Beneficiarului personal calificat;</li>
    <li>Prestatorul se obligă să depună toate eforturile pentru a presta servicii conforme, asumându-și o obligație de competență și prudență, demonstrând solicitudine, inventivitate și profesionalism. În temeiul obligației de competență și prudență, Prestatorul se obligă să presteze serviciile contractate cu competența și prudența pe care un prestator rezonabil le-ar fi exercitat în circumstanțele cazului și în conformitate cu legea sau cu alte norme obligatorii aplicabile serviciilor în cauză;</li>
    <li>Prestatorul se obligă să coopereze cu Beneficiarul în prestarea serviciilor contractate;</li>
    <li>Prestatorul se obligă să soluționeze în termen de până la 5 (cinci) zile calendaristice reclamațiile și sesizările Beneficiarului privind prestarea serviciilor conform specificațiilor negociate;</li>
    <li>Prestatorul se obligă să urmărească realizarea obiectului contractului la standardele prevăzute în contract și legislația în vigoare;</li>
    <li>Prestatorul se obligă să elibereze beneficiarului documentele de absolvire a cursurilor de instruire după susținerea examenelor interne (teorie și practică), în conformitate cu legislația în vigoare.</li>
  </ul>
  
  <!-- PAGINA 4 -->
  <div class="page-break"></div>
  
  <div class="subsection-title">Drepturile și obligațiile Beneficiarului:</div>
  <ul>
    <li>Beneficiarul are dreptul la prestarea serviciilor indicate în pct. 1.1 din prezentul Contract în termenii, volumul și condițiile stabilite de prezentul Contract;</li>
    <li>Beneficiarul are dreptul să beneficieze gratuit de suportul de curs, în valoare de 470 MDL;</li>
    <li>Beneficiarul are dreptul să adreseze orice tip de cereri, solicitări și propuneri către Prestator cu privire la serviciile ce constituie obiectul prezentului Contract de luni până vineri, în intervalul de ore 09:00 - 18:00;</li>
    <li>Beneficiarul se obligă să achite serviciile Prestatorului în conformitate cu termenii și condițiile stabilite de capitolul 3 din prezentul Contract;</li>
    <li>Beneficiarul se obligă să frecventeze orele teoretice și practice conform orarului aprobat;</li>
    <li>Beneficiarul se obligă să frecventeze lecțiile practice obligatorii în număr de 30 unități (60 de ore), conform programului aprobat fără întârzieri, iar dacă formabilul/a se reține mai mult de 25 minute urmează să repete lecția practică;</li>
    <li>Beneficiarul poate solicita modificarea graficului lecției practice cu un preaviz de minimum 48 de ore. Solicitările primite cu mai puțin de 48 de ore înaintea lecției programate trebuie să fie însoțite de un act justificativ. În caz de neprezentare la lecția de practică încălcând acest pct., Beneficiarul va achita contravaloarea integrală a lecției respective;</li>
    <li>Beneficiarul poate solicita înlocuirea maistrului-instructor auto după stabilirea graficului de practică, în următoarele situații:<br>
      a) maistrul-instructor manifestă un comportament discriminatoriu față de formabil/cursant, pe criterii de origine rasială sau etnică, religie sau convingeri, dizabilitate, orientare sexuală, vârstă sau sex, și/sau aplică pedepse, tratamente abuzive ori acte de violență fizică sau verbală asupra acestuia;<br>
      b) maistrul-instructor refuză îndeplinirea sarcinilor prevăzute în programului de formare profesională a conducătorilor de autovehicule (Conducător/Conducătoare pentru Categoria B), pe durata lecțiilor de practică.</li>
    <li>Beneficiarul are obligația de a efectua lecțiile practice exclusiv cu instructorii și pe vehiculele stabilite de către Prestator, conform programului de instruire și graficului de practică aprobat, și să accepte orice modificare în programul de practică, dacă Prestatorul se află în prezența unui impediment justificator, care împiedică desfășurarea lecției practice conform graficului aprobat.</li>
    <li>Solicitarea de înlocuire a maistrului-instructor se va formula în scris și va fi transmisă Instituției, însoțită de o justificare privind situația reclamată. Instituția are obligația de a analiza solicitarea în termen de 5 (cinci) zile lucrătoare și, în cazul în care motivele invocate sunt întemeiate, de a dispune măsurile corespunzătoare, inclusiv înlocuirea maistrului-instructor.</li>
    <li>Beneficiarul se obligă să anunțe administrația instituției despre schimbarea/modificarea numărului de contact, adresa poștei electronice sau alte date, care asigură comunicarea dintre formabil și reprezentanții instituției;</li>
  </ul>
  
  <!-- PAGINA 5 -->
  <div class="page-break"></div>
  
  <ul>
    <li>Beneficiarul se obligă să depună cerere de suspendare a procesului educațional, dacă este în imposibilitatea de a se prezenta la lecțiile teoretice și/sau practice mai mult de 3 săptămâni și după caz, să repete partea teoretică după achitarea suplimentară a taxei;</li>
    <li>Beneficiarul se obligă să îndeplinească în termenii stabiliți obiectivele prevăzute de planul de învățământ la programul solicitat;</li>
    <li>Beneficiarul se obligă să îndeplinească în termenii stabiliți sarcinile prevăzute de planul și programele de învățământ a cursurilor solicitate, conform anexei nr. 2 la ordin al Ministerul Educației și Culturii nr. 260 din 12 aprilie 2022;</li>
    <li>Beneficiarul se obligă să însușească materialul predat și să obțină calificativul "admis" la probele de examinare la finalizarea programului de formare profesională;</li>
    <li>Beneficiarul se obligă să execute exercițiile stipulate în Caietele de sarcini, în care maistru-instructor va indica unitatea de curs realizată, competențele dobândite și observațiile de rigoare.</li>
    <li>Beneficiarul se obligă să prezinte Caietele de sarcini și le depună la instituție, la finalizarea programului, pentru păstrarea la dosarul formabilului pe o perioadă de 6 luni de zile.</li>
    <li>Beneficiarul se obligă să respecte Regulamentul de ordine internă al instituției;</li>
    <li>Beneficiarul se obligă să prezinte instituției și/sau maistru-instructorului (după caz, se prezintă la prima lecție practică): buletinul de identitate; certificatele medicale Forma 083/E (comisia medicală), în temeiul Hotărârii Guvernului nr. 12 din 19.01.2009, în decurs de 30 zile din data semnării Contractului;</li>
    <li>Beneficiarul se obligă să nu participe la lecțiile teoretice/practice în stare de ebrietate sau sub influența băuturilor alcoolice, a substanțelor psihoactive ori a drogurilor.</li>
  </ul>
  
  <div class="subsection-title">Formabililor le este interzis:</div>
  <ul>
    <li>purtarea hainelor, care: nu acoperă umerii; nu acoperă picioarele mai sus de genunchi;</li>
    <li>purtarea încălțămintei: șlapilor; pantofilor cu toc; pantofilor cu talpă groasă;</li>
    <li>utilizarea telefonului mobil în timpul lecțiilor practice;</li>
    <li>neglijarea intenționată a indicațiilor maistru-instructorului;</li>
    <li>abaterea de la itinerarul prestabilit și comunicat de către maistru-instructor;</li>
    <li>neîndeplinirea sarcinilor/temei pentru acasă oferite de către maistru-instructor la finalul lecției practice;</li>
  </ul>
  
  <ul>
    <li>Beneficiarul se obligă să păstreze și să mențină în curățenie bunurile oferite de Prestator (edificiu, sală de studii, echipamente, vehicule de instruire, teren de instruire, etc.);</li>
    <li>Beneficiarul se obligă să completeze actele necesare în termenul stabilit și să depună dosarul organelor competente pentru examenul auto intern;</li>
    <li>Beneficiarul se obligă să semneze în caietul de sarcini doar pentru orele efectuate și să dețină asupra sa actul de identitate și copia actelor medicale, în caz contrar maistru-instructorul având obligația să refuze formabilului accesul în mașină;</li>
    <li>Actele de identitate și actele medicale în copii, iar în cazul de refuz de prezentare procesul de practică se suspendă până la prezentarea acestora de către Formabil.</li>
    <li>Beneficiarul (formabilului), care a încheiat programul de formare și a promovat examenele, are dreptul să li se elibereze certificat (document generat de RUICVF), care îi permite să solicite obținerea dreptului de a conduce vehicule și a permisului de conducere, în condițiile legii;</li>
  </ul>
  
  <!-- PAGINA 6 -->
  <div class="page-break"></div>
  
  <div class="section-title">V. CONDIȚII SPECIALE</div>
  <p>1. În cazul în care formabilul își manifestă dorința de a continua cursurile de pregătire după perioada de 6 luni de zile, acesta urmează să achite integral tariful prevăzut de prezentul contract, urmând să se întocmească un nou dosar de școlarizare;</p>
  
  <p>2. În vederea încheierii dosarului de școlarizare al formabilului, acesta va trebui să îndeplinească cumulativ următoarele condiții: să depună documentele de școlarizare, buletinul de identitate; Forma 083/E (comisia medicală), în temeiul Hotărârii Guvernului nr. 12 din 19.01.2009 și să promoveze examenul de pregătire teoretică și practică din cadrul școlii;</p>
  
  <p>3. Formabilii sunt exmatriculați în următoarele cazuri:</p>
  <ul>
    <li>la solicitarea proprie;</li>
    <li>pentru restanțe și absențe neîntemeiate la 2 lecțiile practice sau la peste 25% din numărul total de ore teoretice prevăzute de planurile de învățământ;</li>
    <li>refuzul de urmare a programului de formare profesionale a conducătorilor de autovehicule "Conducător/conducătoare auto (categoria/subcategoria B/B1)"</li>
    <li>comportament indecent în raport cu reprezentanții Prestatorului;</li>
    <li>prejudicierii imaginii Prestatorului;</li>
    <li>pentru comiterea cu intenție a încălcărilor legislației rutiere, care au ca pedeapsă privarea de dreptul de a conduce mijloace de transport sau anularea dreptului de a conduce.</li>
  </ul>
  
  <div class="section-title">VI. COMUNICARE ELECTRONICĂ</div>
  <p>1. Părțile pot comunica prin metode electronice, prin intermediul platformei viber și, acceptând această metodă de comunicare, acceptă riscurile inerente ale acestora (inclusiv, riscurile de securitate de interceptare sau acces neautorizat la astfel de comunicații sau la o direcționare greșită accidentală sau neintenționată, riscurile de corupere a acestor comunicații, sosirea târzie sau informații incomplete, precum și riscurile de virusare sau alte riscuri conexe).</p>
  
  <div class="section-title">VII. CONFIDENȚIALITATE</div>
  <p>1. Părțile acceptă ca obiectul Serviciilor, este strict confidențial;</p>
  <p>2. Nici una din Părți nu va face uz de informația confidențială în interese proprii sau în interesele terțelor persoane;</p>
  <p>3. Beneficiarul se obligă să nu transmită către persoane terțe numărul de contact al maistru-instructorilor auto;</p>
  <p>4. Beneficiarul se obligă să nu răspândească fragmentat și/sau integral conținutul suportului de curs, caietului de sarcini și a altor materiale primite sau achiziționate de la Prestator, fără acordul expres al Prestatorului;</p>
  <p>5. Informațiile pe care le schimbă Părțile în legătură cu termenii prezentului Contract vor constitui "Informații Confidențiale" și vor fi păstrate strict confidențial de către Prestator și Beneficiar. Fără acordul scris prealabil al Prestatorului, Părțile nu vor dezvălui, revela sau permite dezvăluirea acestora în întregime sau în parte către orice persoana, alta decât destinatarul acestora sau alte persoane, și pentru alte scopuri decât îndeplinirea obligațiilor cu privire la obiectul prezentului Contract;</p>
  
  <!-- PAGINA 7 -->
  <div class="page-break"></div>
  
  <p>6. Totuși, Părțile vor avea dreptul să dezvăluie sau să folosească o parte sau toate informațiile:</p>
  <div class="indent">
    <p>a) care aparțin deja domeniului public, altfel decât ca rezultat al încălcării prezentului Contract de către una dintre Părțile acestuia; sau</p>
    <p>b) care se afla deja, fără restricție, in posesia Părților în momentul in care aceste informații sunt furnizate conform prezentului Contract; sau</p>
    <p>c) pe care Părțile au convenit, în scris, să le dezvăluie sau folosească în mod liber; sau</p>
    <p>d) pe care Părțile trebuie să le dezvăluie conform unei decizii a unei instanțe competente sau a unei audieri în instanța, în cadrul unui proces sau conform unei legi sau reglementari în vigoare, dar numai după ce au fost luate toate masurile rezonabile si legale pentru a împiedica aceasta dezvăluire</p>
    <p>e) pe care Părțile trebuie să le dezvăluie autorităților de stat din RM, cu ocazia efectuării unui control fiscal sau de alt gen, conform legii.</p>
  </div>
  
  <p>7. Obligațiile referitoare la confidențialitate, stabilite prin prezentul Contract vor rămâne valide pentru o perioada de 24 de luni de la încetarea/terminarea prezentului Contract;</p>
  
  <p>8. Părțile nu vor dezvălui și se vor asigura că nici unul dintre partenerii, asociații, personalul, reprezentanții acestora nu vor dezvălui termenii prezentului Contract, către orice terță parte. Orice astfel de termeni vor rămâne strict confidențiali în orice moment și vor supraviețui oricărei rezoluțiuni/expirări a acestui contract sau a oricăror altor obligații de confidențialitate din partea Părților.</p>
  
  <div class="section-title">VIII. IMPEDIMENT JUSTIFICATOR</div>
  <p>1. Se consideră impediment justificator orice circumstanțe care împiedică îndeplinirea obligațiilor și sunt în afara controlului Părții care invocă survenirea impedimentului (și anume -- incendiu, inundație, război, cutremur de pământ, faliment sau suspendarea temporară a activității băncilor de deservire, lipsa curentului electric, avariarea vehiculului, îmbolnăvirea maistru-instructorului, îmbolnăvirea profesorului de siguranță rutieră, acțiuni ale organului de resort privind verificarea și/sau acreditarea Prestatorului, concediile anuale ale angajaților, zilele oficial libere, zilele de odihnă din programul de activitate al maiștrilor-instrucrori), dar numai pe parcursul perioadei de acțiune a acestor circumstanțe. Partea care invocă impedimentul justificator trebuie să informeze imediat cealaltă Parte despre începutul și terminarea acțiunii circumstanțelor de impediment justificator, prezentând dovezile corespunzătoare.</p>
  
  <p>2. Termenul de îndeplinire a obligațiilor conform prezentului Contract este prelungit proporțional cu timpul acțiunii circumstanțelor de impediment justificator.</p>
  
  <p>3. În caz dacă circumstanțele de forță majoră durează mai mult de 1 (una) lună din data invocării, Părțile sunt în drept să rezoluționeze prezentul Contract.</p>
  
  <!-- PAGINA 8 -->
  <div class="page-break"></div>
  
  <div class="section-title">IX. ÎNCETAREA CONTRACTULUI</div>
  <p>1. Prezentul Contract încetează de plin drept și nu-și mai produce efectele sale juridice în cazul încheierii unui nou contract în alte condiții.</p>
  <p>2. Rezoluțiunea contractului poate avea loc cu acordul comun al ambelor părți;</p>
  <p>3. Prezentul Contract încetează de plin drept, fără a mai fi necesară intervenția unei instanțe judecătorești (sau tribunal arbitral), în cazul în care una dintre Părți:</p>
  <ul>
    <li>Beneficiarul nu execută sau execută necorespunzător una dintre obligațiile specificate în Capitolul 3 și 4 și alte stipulații din prezentul Contract;</li>
    <li>Restanțe și absențe neîntemeiate la 2 lecțiile practice sau la peste 25% din numărul total de ore teoretice prevăzute de planurile de învățământ;</li>
    <li>Beneficiarul aduce atingeri de imagini Prestatorului, prin orice mijloace, inclusiv electronice;</li>
    <li>Își încalcă oricare dintre obligațiile sale, după ce a fost avertizată, printr-o notificare scrisă, de către cealaltă Parte, că o nouă nerespectare a acestora va duce la rezoluțiunea prezentului Contract;</li>
  </ul>
  
  <p>4. În cazul în care, încetarea Contractului are loc din cauza pct. 9.3, Beneficiarul nu poate să solicite restituirea sumelor de bani achitate Prestatorului;</p>
  <p>5. În cazul în care Prestatorul a format grupa, înscriindu-l pe Formabil, prețul achitat pentru cursul teoretic nu se restituie, indiferent de motivul încetării contractului, inclusiv în cazul rezoluțiunii de comun acord între părți.</p>
  <p>6. În urma survenirii situației stabilite la pct. 9.3, Prestatorul urmează să radieze dosarul formabilului din evidențele sale;</p>
  <p>7. Rezoluțiunea prezentului Contract nu va avea nici un efect asupra obligațiilor deja scadente între Părțile contractante;</p>
  <p>8. Nici o parte nu are dreptul să cesioneză drepturile și obligațiile sale prevăzute de prezentul Contract fără acordul celeilalte părți ale prezentului contract.</p>
  
  <div class="section-title">X. SOLUȚIONAREA LITIGIILOR</div>
  <p>1. "Beneficiarul" și "Prestatorul" vor depune toate eforturile pentru a rezolva pe cale amiabilă, prin negocieri directe orice neînțelegere sau dispută care pot apărea între ei în cadrul sau în legătură cu îndeplinirea contractului.</p>
  <p>2. Dacă conflictele ce vor apărea dintre Părți, în legătură cu neexecutarea sau executarea necorespunzătoare a obligațiilor prevăzute în prezentul Contract nu se vor soluționa în baza negocierilor, se vor soluționa ordinea pretențiilor. Termenul pentru răspundere la pretenția înaintată este de 14 zile calendaristice.</p>
  <p>3. În cazul soluționării parțiale a pretenției, a refuzului de a soluționa pretenția sau în caz de nesoluționare în termen a acesteia, Partea care a înaintat pretenția este în drept să se adreseze Curții de Arbitraj de pe lângă Camera de Comerț și Industrie a Republicii Moldova situată în municipiul Chișinău, bulevardul Ștefan cel Mare și Sfânt, nr. 151, de către un complet de 3 arbitri aleși conform regulilor instanței arbitrale respective în conformitate cu regulile de procedură aplicate de Curte de Arbitraj de pe lângă Camera de Comerț și Industrie a Republicii Moldova.</p>
  <p>4. Acest Contract va fi guvernat și interpretat în conformitate cu legea Republicii Moldova.</p>
  
  <!-- PAGINA 9 -->
  <div class="page-break"></div>
  
  <div class="section-title">XI. DISPOZIȚII FINALE</div>
  <p>1. Părțile poartă răspunderea pentru neexecutarea sau executarea necorespunzătoare a obligațiilor născute în baza prezentului Contract, în condițiile prevăzite de acesta;</p>
  <p>2. Dreptul la informare: Părțile se obligă să se informeze reciproc despre faptul schimbării adreselor juridice, persoanelor responsabile de executarea prezentului Contract, a numerelor de telefoane, e-mail sau a administratorului, nu mai târziu de 5 zile calendaristice după modificarea acestora;</p>
  <p>3. Prestatorul declară și garantează următoarele:</p>
  <div class="indent">
    <p>a) este o societate valabil înregistrată în Republica Moldova, organizată și funcționând în mod legal în conformitate cu legea în vigoare, fiind autorizată în mod corespunzător să își desfășoare activitatea la data semnării;</p>
    <p>b) persoana care semnează Contractul este pe deplin autorizată să încheie contractul cu "Beneficiarul" în mod valabil;</p>
    <p>c) are capacitatea juridică necesară, a obținut toate aprobările și a întreprins toate acțiunile necesare conform legii în vigoare pentru a încheia în mod valabil acest Contract și pentru a îndeplini și/sau respecta în mod corespunzător obligațiile decurgând din acest Contract;</p>
    <p>d) obligațiile prevăzute în acest Contract sunt legale, valabile, opozabile locatorului;</p>
    <p>e) nu există niciun litigiu, dispută cerere sau procedură care afectează sau ar putea afecta îndeplinirea obligațiilor din acest Contract.</p>
  </div>
  
  <p>4. Părțile declară că acest contract reprezintă înțelegerea integrală dintre părți cu privire la obiectul său și înlocuiește orice înțelegeri anterioare, scrise sau verbale, referitoare la același obiect;</p>
  <p>5. Părțile declară că toate declarațiile și garanțiile date de ele în acest Contract sunt corecte și complete;</p>
  <p>6. Părțile declară că declarațiile și garanțiile de mai sus sunt emise de Părți la data semnării și vor fi menținute valabile pe toată durata Contractului. În cazul în care o garanție sau declarație devine, la un moment dat, nevalabilă, Partea care a emis-o va trebui să notifice de îndată cealaltă Parte cu privire la acest aspect;</p>
  <p>7. Contractul, inclusiv Anexele, care sunt parte integrantă a prezentului Contract, reflectă în mod deplin întreaga înțelegere a Părților, înlocuiește oricare și toate înțelegerile, înscrisurile, documentele pre-contractuale sau negocierile care au avut loc între Părți înainte de data semnării;</p>
  <p>8. Anexele la acest contract vor fi semnate de către ambele părți. Anexele fac parte integrantă din prezentul Contract;</p>
  <p>9. În cazul în care apar discrepanțe între prevederile cuprinse în Anexele atașate prezentului Contract și prevederile din Contract, acestea din urmă vor prevala;</p>
  <p>10. Orice modificare a prezentului contract trebuie să fie realizată în scris și semnată de ambele părți;</p>
  <p>11. Toate documentele furnizate, notificările și orice alte comunicări efectuate conform prezentului Contract se vor face în scris în limba română, prin remiterea acestora către oricare dintre Părți la adresele menționate mai jos;</p>
  
  <!-- PAGINA 10 -->
  <div class="page-break"></div>
  
  <p>12. O notificare/comunicare transmisă conform prezentului capitol va fi considerată primită:</p>
  <div class="indent">
    <p>a) dacă este remisă personal, în momentul remiterii sau refuzului de a fi primită;</p>
    <p>b) dacă este transmisă prin scrisoare recomandată cu confirmare de primire, la data confirmării primirii sau returului de către curier pentru motive ce nu țin de persoana expeditorului;</p>
    <p>c) dacă este transmisă prin e-mail, la finalizarea cu succes a transmisiei respective, cu condiția ca o astfel de transmitere să fi fost urmată și de transmiterea documentului respectiv, în aceeași zi, prin scrisoare recomandată cu confirmare de primire; sau</p>
    <p>d) dacă este transmisă prin serviciu reputabil de curierat rapid, în următoarea zi lucrătoare ce urmează livrării.</p>
  </div>
  
  <p>13. În cazul în care una sau mai multe dintre prevederile prezentului Contract devin, din orice motiv, în tot sau în parte, inaplicabile, ilegale sau imposibil de executat, conform legii aplicabile, acest fapt nu va afecta nicio altă prevedere a prezentului Contract, iar Contractul va fi interpretat ca și când astfel de dispoziții sau părți ale acestora nu ar fi fost incluse în cuprinsul Contractului.</p>
  <p>14. Părțile vor depune toate diligențele astfel încât dispoziția nulă sau inaplicabilă să fie înlocuită cu o dispoziție validă și aplicabilă, care să aibă în limitele permise de legea aplicabilă același efect sau unul echivalent ca și cea pe care o înlocuiește.</p>
  <p>15. Referitor la toate condițiile ce nu sunt prevăzute în prezentul Contract, Părțile se vor ghida după legislația civilă în vigoare a Republicii Moldova.</p>
  <p>16. Prezentul Contract a fost întocmit în limba română, în 2 (două) exemplare cu aceeași valoare juridică, ambele Părți atestând că un exemplar original al acestuia.</p>
  
  <div class="final-statement">
    ÎN CONFIRMAREA CELOR MENȚIONATE MAI SUS, Părțile semnează prezentul Contract, la data și locul indicat în preambulul, condițiile contractuale fiind clare și consimt, fără rezerve la executarea acestora.
  </div>
  
  <!-- Semnături -->
  <div class="signatures">
    <div class="signature-col">
      <strong>"PROD-AM SERVICE" SRL</strong><br><br>
      IDNO: 1022600015731<br>
      Adresa pentru corespondență:<br>
      Telefon: 060798666<br>
      E-mail: instruire.auto.botanica@gmail.com<br><br>
      Date bancare:<br>
      BC "MAIB" SA, suc. "Dacia"<br>
      BIC: AGRNMD2X887<br>
      IBAN: MD44AG000000022514954776<br><br><br>
      <strong>Mihaela Prodan, administrator</strong><br><br>
      _________________________
    </div>
    <div class="signature-col">
      <strong>${data.nume} ${data.prenume}</strong><br><br>
      IDNP: ${data.idnp}<br>
      Domiciliul: ${data.localitate}<br>
      str. ${data.strada}, nr. ${data.numar}<br>
      ap. ${data.apartament}<br><br>
      Telefon: ${data.telefon}<br><br>
      E-mail: ${data.email}<br><br><br><br><br>
      <strong>Semnatura</strong><br><br>
      _________________________
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Generează PDF din HTML folosind Puppeteer
   */
  private async generatePDFFromHTML(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-ipc-flooding-protection',
        '--disable-xss-auditor',
        '--disable-bundled-ppapi-flash',
        '--disable-plugins-discovery',
        '--ignore-certificate-errors',
        '--ignore-ssl-errors',
        '--ignore-certificate-errors-spki-list',
        '--disable-extensions'
      ],
      executablePath: process.env.CHROME_BIN || '/usr/bin/chromium-browser',
    });
    
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '2cm',
          right: '2cm',
          bottom: '2cm',
          left: '2cm'
        }
      });
      
      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  /**
   * Generează PDF pentru cererea de înmatriculare
   */
  async generateApplicationPDF(data: StudentData): Promise<Buffer> {
    const html = this.generateApplicationHTML(data);
    return this.generatePDFFromHTML(html);
  }

  /**
   * Generează PDF pentru contract complet
   */
  async generateContractPDF(data: StudentData): Promise<Buffer> {
    const html = this.generateContractHTML(data);
    return this.generatePDFFromHTML(html);
  }

  /**
   * Generează ambele documente PDF
   */
  async generateContractDocuments(studentData: StudentData): Promise<{
    applicationPDF: Buffer;
    contractPDF: Buffer;
  }> {
    const [applicationPDF, contractPDF] = await Promise.all([
      this.generateApplicationPDF(studentData),
      this.generateContractPDF(studentData),
    ]);

    return { applicationPDF, contractPDF };
  }
}