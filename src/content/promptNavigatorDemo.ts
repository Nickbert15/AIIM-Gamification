import { BranchingContent, Game } from '@/types/game'

// Lokale Beispiel-Instanz für den Prompt-Navigator ("Der CFO wartet"). Dient als
// DB-/LLM-freie Testversion (siehe /play/demo) und als Referenz dafür, wie ein
// echter, über den Admin-Dialog freigegebener prompt_branching-Datensatz aussehen
// müsste (game_json.branching, siehe src/types/game.ts).
//
// 5 Prompt-Optionen, didaktisch gestaffelt:
//   A, B, E — deutlich unterschiedliche Fehlerbilder (kein Kontext / Fabrikation
//             ohne Daten / vage Aufgabe trotz Daten)
//   C, D    — fast identisch formuliert, nur eine Anti-Halluzinations-Klausel
//             unterscheidet sie (die feine-Nuancen-Lektion)

const branching: BranchingContent = {
  scenario: {
    intro:
      'Es ist 16:30 Uhr. Der CFO fragt kurzfristig nach einer Abweichungsanalyse der Q2-Reisekosten – Abgabe: morgen früh, 9 Uhr. Dir liegt die SAP-Auswertung als Tabelle vor: Reisekosten Q2 gesamt 812.400 € (Plan: 745.000 €, Abweichung +9,0 %). Größte Einzelposten: Flugkosten +11,2 %, Hotelkosten +6,4 %, Bahn/Mietwagen −2,1 %. Du willst dir vom KI-Assistenten einen ersten Entwurf erstellen lassen.',
    personaNote: 'Sabrina nutzt KI bisher nicht im Arbeitsalltag – dieses Spiel simuliert ihre erste echte Interaktion.',
  },
  startNode: 'n1_prompt_choice',
  nodes: {
    n1_prompt_choice: {
      type: 'prompt_choice',
      text: 'Welchen Prompt schickst du an den KI-Assistenten?',
      options: [
        {
          id: 'prompt_a',
          label: 'Prompt A – Kurz und knapp',
          promptText: 'Fasse die Abweichungen bei den Reisekosten im Q2 zusammen.',
          points: 0,
          nextNode: 'a_result',
        },
        {
          id: 'prompt_b',
          label: 'Prompt B – Klar formatiert, aber ohne Zahlen',
          promptText:
            'Du bist mein Assistent im Controlling. Erstelle eine Management-Zusammenfassung zu den Q2-Reisekosten für den CFO: die wichtigsten Abweichungstreiber und 2–3 Handlungsempfehlungen, sachlicher Ton, max. eine halbe Seite.',
          points: 0,
          nextNode: 'b_result',
        },
        {
          id: 'prompt_c',
          label: 'Prompt C – Mit Rolle, Daten und Format',
          promptText:
            'Du bist mein Assistent im Controlling (Rolle). Kontext: Der CFO benötigt bis morgen früh eine Abweichungsanalyse der Q2-Reisekosten. Datenbasis ist ausschließlich die folgende SAP-Auswertung: Gesamt 812.400 € vs. Plan 745.000 € (+9,0 %); Flugkosten +11,2 %, Hotelkosten +6,4 %, Bahn/Mietwagen −2,1 %. Aufgabe: Erstelle eine Management-Zusammenfassung mit den wichtigsten Abweichungstreibern und 2–3 Handlungsempfehlungen. Format: max. eine halbe Seite, sachlicher Ton, Zielgruppe CFO.',
          points: 2,
          nextNode: 'c_result',
        },
        {
          id: 'prompt_d',
          label: 'Prompt D – Wie C, plus klare Leitplanke',
          promptText:
            'Du bist mein Assistent im Controlling (Rolle). Kontext: Der CFO benötigt bis morgen früh eine Abweichungsanalyse der Q2-Reisekosten. Datenbasis ist ausschließlich die folgende SAP-Auswertung: Gesamt 812.400 € vs. Plan 745.000 € (+9,0 %); Flugkosten +11,2 %, Hotelkosten +6,4 %, Bahn/Mietwagen −2,1 %. Aufgabe: Erstelle eine Management-Zusammenfassung mit den wichtigsten Abweichungstreibern und 2–3 Handlungsempfehlungen. Nutze ausschließlich die genannten Zahlen und kennzeichne Vermutungen ausdrücklich als solche. Format: max. eine halbe Seite, sachlicher Ton, Zielgruppe CFO.',
          points: 6,
          nextNode: 'd_result',
        },
        {
          id: 'prompt_e',
          label: 'Prompt E – Mit Zahlen, aber offen formuliert',
          promptText:
            'Hier sind unsere Q2-Reisekosten: Gesamt 812.400 € vs. Plan 745.000 € (+9,0 %); Flugkosten +11,2 %, Hotelkosten +6,4 %, Bahn/Mietwagen −2,1 %. Schau dir das mal an und sag mir, was du davon hältst.',
          points: 1,
          nextNode: 'e_result',
        },
      ],
    },

    a_result: {
      type: 'output_review',
      aiOutput:
        'Gerne! Reisekosten sind ein wichtiger Kostenblock in Unternehmen. Abweichungen können viele Ursachen haben, zum Beispiel gestiegene Preise, mehr Dienstreisen oder geänderte Buchungsrichtlinien. Um Abweichungen zu analysieren, empfiehlt sich ein Vergleich von Plan- und Istwerten je Kostenart. Anschließend sollten die größten Abweichungen priorisiert und mit den Fachbereichen besprochen werden. Eine regelmäßige Überwachung hilft, Kosten im Griff zu behalten. Wenn Sie mir Ihre Daten nennen, kann ich eine konkretere Analyse erstellen.',
      ratingLabel: 'Nicht brauchbar',
      explanation:
        'Der Text ist allgemeines Lehrbuchwissen – er enthält keine einzige Zahl aus deiner SAP-Auswertung und keine Aussage über euer Q2. Der Prompt enthielt keinen Kontext: keine Daten, keine Zielgruppe, kein Format. Die KI kann nur mit dem arbeiten, was du ihr gibst.',
      nextNode: 'a_diagnosis',
    },

    a_diagnosis: {
      type: 'diagnosis',
      text: 'Was ist das Kernproblem?',
      options: [
        {
          id: 'missing_context',
          label: 'Der Prompt enthielt keinen Kontext: keine Daten, keine Zielgruppe, kein Format',
          points: 2,
          feedback: 'Genau. Ohne Daten (Context), Zielgruppe (Audience) und Formatvorgabe (Format) bleibt nur eine generische Antwort übrig.',
          nextNode: 'a_correction',
        },
        {
          id: 'hallucination',
          label: 'Die KI hat halluziniert und Zahlen erfunden',
          points: 0,
          feedback: 'Nein – schau genau hin: Der Output enthält gar keine Zahlen. Die KI hat nichts erfunden, sie hatte schlicht keine Informationen. Das Problem liegt im Prompt, nicht im Modell.',
          nextNode: 'a_correction',
        },
        {
          id: 'wrong_model',
          label: 'Die KI ist für Finance-Themen ungeeignet, das bringt nichts',
          points: 0,
          feedback: 'Zu früh aufgegeben! Das Modell kann diese Aufgabe gut lösen – es braucht nur die richtigen Informationen.',
          nextNode: 'a_correction',
        },
      ],
    },

    a_correction: {
      type: 'prompt_choice',
      text: 'Wie steuerst du nach?',
      options: [
        {
          id: 'craft_followup',
          label: 'Kontext, Daten und Format nachliefern',
          promptText:
            'Hier die Datenbasis: Q2-Reisekosten gesamt 812.400 € vs. Plan 745.000 € (+9,0 %); Flugkosten +11,2 %, Hotelkosten +6,4 %, Bahn/Mietwagen −2,1 %. Nutze ausschließlich diese Zahlen. Erstelle daraus eine Management-Zusammenfassung für den CFO: max. eine halbe Seite, sachlicher Ton, wichtigste Abweichungstreiber zuerst, am Ende 2–3 Handlungsempfehlungen.',
          points: 2,
          nextNode: 'a_correction_result_good',
        },
        {
          id: 'vague_followup',
          label: 'Allgemein nachbessern',
          promptText: 'Das ist zu allgemein. Mach es bitte konkreter und kürzer.',
          points: 0,
          nextNode: 'a_correction_result_meh',
        },
      ],
    },

    a_correction_result_good: {
      type: 'output_review',
      aiOutput:
        'Management-Zusammenfassung: Q2-Reisekosten-Abweichung\n\nDie Reisekosten liegen im Q2 mit 812.400 € um 9,0 % über Plan (745.000 €). Haupttreiber ist die Überschreitung bei den Flugkosten (+11,2 %), gefolgt von den Hotelkosten (+6,4 %). Bahn und Mietwagen liegen mit −2,1 % leicht unter Plan und wirken der Abweichung entgegen.\n\nHandlungsempfehlungen: (1) Analyse der Flugbuchungen auf Kurzfristbuchungen und Business-Class-Anteile, (2) Prüfung der Einhaltung der Reiserichtlinie bei Hotelbuchungen, (3) Vorgabe längerer Buchungsvorläufe für Q3.',
      ratingLabel: 'Ausgezeichnet',
      explanation:
        'Jetzt stimmen alle Zahlen mit deiner SAP-Auswertung überein, Struktur und Ton passen für den CFO. Du hast Kontext, Daten und Format nachgeliefert – genau das hat vorher gefehlt.',
      nextNode: 'end_recap',
    },

    a_correction_result_meh: {
      type: 'output_review',
      aiOutput:
        'Verstanden, hier eine kompaktere Version: Bei der Analyse von Reisekostenabweichungen sollten die größten Kostenarten priorisiert betrachtet werden. Typischerweise sind Flug- und Hotelkosten die relevantesten Treiber. Ein strukturierter Plan-Ist-Vergleich je Kostenart schafft Transparenz und ermöglicht gezielte Gegenmaßnahmen.',
      ratingLabel: 'Ausbaufähig',
      explanation:
        "'Mach es konkreter und kürzer' ohne neue Informationen kann nicht funktionieren – die KI kennt deine Daten weiterhin nicht. Nachsteuern heißt: fehlende Informationen liefern, nicht nur Unzufriedenheit äußern.",
      nextNode: 'end_recap',
    },

    b_result: {
      type: 'output_review',
      aiOutput:
        'Management-Zusammenfassung: Q2-Reisekosten-Abweichung\n\nDie Reisekosten lagen im Q2 bei 796.500 € gegenüber einem Plan von 750.000 €, eine Abweichung von +6,2 %. Haupttreiber war der Anstieg der Flugkosten um 9,8 %, gefolgt von den Hotelkosten mit +4,5 %. Mietwagen und Bahnkosten blieben nahezu im Plan.\n\nHandlungsempfehlungen: (1) Flugbuchungen zentralisieren, (2) Hotelverträge neu verhandeln, (3) Reiserichtlinie kommunizieren.',
      ratingLabel: 'Nicht brauchbar',
      explanation:
        'Format und Ton sind völlig in Ordnung – aber sieh dir die Zahlen genau an: Keine einzige stimmt mit deiner SAP-Auswertung überein. Die KI hatte keine Datenbasis und hat plausibel klingende Zahlen erfunden, um die Formatvorgabe zu erfüllen. Das ist trickreicher als bei Prompt A: Hier wirkt der Output überzeugend, ist aber komplett falsch.',
      nextNode: 'b_diagnosis',
    },

    b_diagnosis: {
      type: 'diagnosis',
      text: 'Was ist das Kernproblem?',
      options: [
        {
          id: 'fabricated_data',
          label: 'Die KI hatte keine echten Zahlen und hat plausible Werte erfunden',
          points: 2,
          feedback: 'Genau. Rolle, Aufgabe und Format waren im Prompt enthalten – nur die Datenbasis fehlte. Ohne Daten füllt die KI die Lücke mit plausibel klingenden, aber erfundenen Zahlen.',
          nextNode: 'b_correction',
        },
        {
          id: 'wrong_format',
          label: 'Das Format passt nicht zur Anforderung',
          points: 0,
          feedback: 'Das Format passt sogar gut – halbe Seite, sachlich, Empfehlungen am Ende. Das Problem sind die erfundenen Zahlen, nicht die Struktur.',
          nextNode: 'b_correction',
        },
        {
          id: 'hallucination_random',
          label: 'Die KI hat einfach einen Fehler gemacht, das ist Zufall',
          points: 0,
          feedback: 'Kein Zufall: Ohne Datenbasis im Prompt muss die KI raten oder erfinden, um eine konkrete Antwort zu liefern. Das Verhalten ist vorhersehbar – und vermeidbar.',
          nextNode: 'b_correction',
        },
      ],
    },

    b_correction: {
      type: 'prompt_choice',
      text: 'Wie steuerst du nach?',
      options: [
        {
          id: 'data_followup',
          label: 'Die echten Zahlen nachliefern',
          promptText:
            'Hier die tatsächliche Datenbasis: Q2-Reisekosten gesamt 812.400 € vs. Plan 745.000 € (+9,0 %); Flugkosten +11,2 %, Hotelkosten +6,4 %, Bahn/Mietwagen −2,1 %. Nutze ausschließlich diese Zahlen für deine Zusammenfassung.',
          points: 2,
          nextNode: 'b_correction_result_good',
        },
        {
          id: 'generic_followup',
          label: 'Nur um mehr Genauigkeit bitten',
          promptText: 'Die Zahlen wirken nicht ganz genau. Kannst du das bitte präziser machen?',
          points: 0,
          nextNode: 'b_correction_result_meh',
        },
      ],
    },

    b_correction_result_good: {
      type: 'output_review',
      aiOutput:
        'Management-Zusammenfassung: Q2-Reisekosten-Abweichung\n\nDie Reisekosten liegen im Q2 mit 812.400 € um 9,0 % über Plan (745.000 €). Haupttreiber ist die Überschreitung bei den Flugkosten (+11,2 %), gefolgt von den Hotelkosten (+6,4 %). Bahn und Mietwagen liegen mit −2,1 % leicht unter Plan und wirken der Abweichung entgegen.\n\nHandlungsempfehlungen: (1) Analyse der Flugbuchungen auf Kurzfristbuchungen und Business-Class-Anteile, (2) Prüfung der Einhaltung der Reiserichtlinie bei Hotelbuchungen, (3) Vorgabe längerer Buchungsvorläufe für Q3.',
      ratingLabel: 'Ausgezeichnet',
      explanation:
        'Jetzt stimmen alle Zahlen mit der SAP-Auswertung überein. Die Lektion: Ein gutes Format allein reicht nicht – ohne echte Daten im Prompt bleibt jede KI-Antwort Spekulation, egal wie überzeugend sie klingt.',
      nextNode: 'end_recap',
    },

    b_correction_result_meh: {
      type: 'output_review',
      aiOutput:
        'Management-Zusammenfassung: Q2-Reisekosten-Abweichung\n\nNach genauerer Prüfung: Die Reisekosten lagen im Q2 bei 803.200 € gegenüber einem Plan von 748.000 € (+7,4 %). Die Flugkosten stiegen um 10,1 %, die Hotelkosten um 5,2 %.\n\nDie Handlungsempfehlungen bleiben unverändert.',
      ratingLabel: 'Nicht brauchbar',
      explanation:
        "Andere Zahlen – aber immer noch erfunden. 'Mach es präziser' liefert der KI keine echte Datenbasis, also erfindet sie einfach neue, ebenso falsche Werte. Nachsteuern bedeutet: fehlende Fakten nachliefern, nicht um mehr Genauigkeit bitten.",
      nextNode: 'end_recap',
    },

    c_result: {
      type: 'output_review',
      aiOutput:
        'Management-Zusammenfassung: Q2-Reisekosten-Abweichung\n\nDie Reisekosten liegen im Q2 mit 812.400 € um 9,0 % über Plan (745.000 €). Haupttreiber ist die Überschreitung bei den Flugkosten (+11,2 %), die maßgeblich auf die im April konzernweit um 14 % gestiegenen Treibstoffzuschläge zurückzuführen ist. Die Hotelkosten liegen mit +6,4 % ebenfalls über Plan, während Bahn und Mietwagen (−2,1 %) leicht unter Plan bleiben.\n\nHandlungsempfehlungen: (1) Analyse der Flugbuchungen auf Kurzfristbuchungen, (2) Prüfung der Reiserichtlinien-Einhaltung bei Hotels, (3) längere Buchungsvorläufe für Q3 vorgeben.',
      ratingLabel: 'Genau hinsehen lohnt sich',
      explanation:
        'Der Prompt selbst ist stark aufgebaut – Rolle, echte Daten, klare Aufgabe und Format sind alle enthalten, dafür gibt es die volle Punktzahl für diese Wahl. Aber Achtung: Ein guter Prompt schützt nicht automatisch vor einem fehlerhaften Output. Lies die Antwort noch einmal kritisch, bevor du sie für bare Münze nimmst.',
      nextNode: 'c_diagnosis',
    },

    c_diagnosis: {
      type: 'diagnosis',
      text: 'Was ist das Kernproblem?',
      options: [
        {
          id: 'hallucination',
          label: "Halluzination: Die '14 % gestiegenen Treibstoffzuschläge' stehen nicht in der Datenbasis",
          points: 2,
          feedback: 'Genau. Die KI hat eine kausale Erklärung erfunden, die plausibel klingt, aber durch nichts belegt ist. Das ist das gefährlichste Fehlerbild: Es fällt nicht durch schlechte Qualität auf, sondern versteckt sich in gutem Stil.',
          nextNode: 'c_correction',
        },
        {
          id: 'missing_context',
          label: 'Es fehlt Kontext im Prompt',
          points: 0,
          feedback: 'Nein – der Prompt hatte Rolle, Kontext, Datenbasis, Aufgabe und Format. Das Problem ist nicht fehlender Input, sondern erfundener Output: Die Treibstoffzuschlag-Angabe steht nicht in deinen Daten.',
          nextNode: 'c_correction',
        },
        {
          id: 'wrong_format',
          label: 'Das Format entspricht nicht der Anforderung',
          points: 0,
          feedback: 'Das Format passt sogar sehr gut – halbe Seite, sachlich, Empfehlungen am Ende. Das eigentliche Problem: Die Angabe zu den Treibstoffzuschlägen ist erfunden und nicht durch deine Datenbasis gedeckt.',
          nextNode: 'c_correction',
        },
      ],
    },

    c_correction: {
      type: 'prompt_choice',
      text: 'Wie gehst du mit dem Fehler um?',
      options: [
        {
          id: 'point_out_error',
          label: 'Fehler benennen und Quellenbindung einfordern',
          promptText:
            "Die Angabe zu den 'um 14 % gestiegenen Treibstoffzuschlägen' steht nicht in meiner Datenbasis. Bitte entferne sie. Nutze ausschließlich die genannten Zahlen und triff keine Aussagen über Ursachen, die nicht in den Daten stehen – kennzeichne Vermutungen ausdrücklich als solche.",
          points: 2,
          nextNode: 'c_correction_result_good',
        },
        {
          id: 'silent_fix',
          label: 'Die Stelle stillschweigend selbst rauslöschen und den Rest übernehmen',
          promptText: null,
          points: 0,
          nextNode: 'c_silent_fix_info',
        },
      ],
    },

    c_correction_result_good: {
      type: 'output_review',
      aiOutput:
        'Management-Zusammenfassung: Q2-Reisekosten-Abweichung\n\nDie Reisekosten liegen im Q2 mit 812.400 € um 9,0 % über Plan (745.000 €). Haupttreiber ist die Überschreitung bei den Flugkosten (+11,2 %), gefolgt von den Hotelkosten (+6,4 %). Bahn und Mietwagen liegen mit −2,1 % leicht unter Plan. Die Ursachen der Flugkosten-Überschreitung lassen sich aus den vorliegenden Daten nicht ableiten und sollten in einer Detailanalyse der Buchungsdaten geklärt werden.\n\nHandlungsempfehlungen: (1) Detailanalyse der Flugbuchungen (Buchungsvorlauf, Klassen), (2) Prüfung der Reiserichtlinien-Einhaltung bei Hotels, (3) längere Buchungsvorläufe für Q3 vorgeben.',
      ratingLabel: 'Ausgezeichnet',
      explanation:
        'Die erfundene Ursache ist entfernt, offene Punkte sind sauber als solche gekennzeichnet, alle Zahlen stimmen. Genau diese Transparenz macht den Entwurf CFO-tauglich.',
      nextNode: 'end_recap',
    },

    c_silent_fix_info: {
      type: 'info',
      text: 'Du löschst den Satz und übernimmst den Rest. Das funktioniert heute – aber du hast der KI kein Feedback gegeben. Beim nächsten Prompt in derselben Unterhaltung kann sie erneut ungestützte Ursachen erfinden, und in einem längeren Dokument übersiehst du die nächste vielleicht. Besser: Fehler benennen und Quellenbindung einfordern – das verbessert alle folgenden Antworten der Session.',
      nextNode: 'end_recap',
    },

    d_result: {
      type: 'output_review',
      aiOutput:
        'Management-Zusammenfassung: Q2-Reisekosten-Abweichung\n\nDie Reisekosten liegen im Q2 mit 812.400 € um 9,0 % über Plan (745.000 €). Haupttreiber ist die Überschreitung bei den Flugkosten (+11,2 %), gefolgt von den Hotelkosten (+6,4 %). Bahn und Mietwagen liegen mit −2,1 % leicht unter Plan. Die Ursachen der Flugkosten-Überschreitung lassen sich aus den vorliegenden Daten nicht ableiten und sollten in einer Detailanalyse der Buchungsdaten geklärt werden.\n\nHandlungsempfehlungen: (1) Detailanalyse der Flugbuchungen (Buchungsvorlauf, Klassen), (2) Prüfung der Reiserichtlinien-Einhaltung bei Hotels, (3) längere Buchungsvorläufe für Q3 vorgeben.',
      ratingLabel: 'Perfekt im ersten Versuch',
      explanation:
        'Dieser Prompt hatte alles: Rolle, echte Daten, klare Aufgabe, Format – UND eine Leitplanke gegen Erfindungen. Das Ergebnis ist sofort CFO-tauglich, ganz ohne Nacharbeit. Deshalb gibt es hier die volle Punktzahl direkt.',
      nextNode: 'd_celebrate',
    },

    d_celebrate: {
      type: 'info',
      text: '⚡ Volltreffer! Du hast im ersten Versuch den stärksten Prompt gewählt – inklusive der entscheidenden Leitplanke gegen erfundene Aussagen. Das spart dir in der Praxis Zeit und Risiko zugleich.',
      nextNode: 'end_recap',
    },

    e_result: {
      type: 'output_review',
      aiOutput:
        'Also, wenn man sich die Zahlen anschaut: 812.400 € Gesamtkosten bei einem Plan von 745.000 €, das ist schon einiges mehr. Flugkosten sind mit 11,2 % am stärksten gestiegen, das könnte an vielen Dingen liegen – Ölpreis, mehr Reisen, teurere Tickets, wer weiß. Hotelkosten sind auch hoch, 6,4 % drüber. Bahn und Mietwagen sind sogar drunter, das ist ja schon mal gut. Man könnte jetzt viele Sachen tun, zum Beispiel mit dem Einkauf sprechen oder die Reiserichtlinie anschauen oder auch einfach mal abwarten und schauen, ob sich das im nächsten Quartal wieder einpendelt.',
      ratingLabel: 'Ausbaufähig',
      explanation:
        'Die Zahlen stimmen – die Datenbasis war ja im Prompt enthalten. Aber der Output ist unstrukturiert, umgangssprachlich und ohne klare Empfehlung. Für den CFO fehlen Struktur, Fokus und ein professioneller Ton.',
      nextNode: 'e_diagnosis',
    },

    e_diagnosis: {
      type: 'diagnosis',
      text: 'Was war das Kernproblem?',
      options: [
        {
          id: 'missing_format',
          label: 'Es fehlte eine klare Aufgaben- und Formatvorgabe, obwohl die Daten vorhanden waren',
          points: 2,
          feedback: "Genau. Die Daten waren korrekt hinterlegt – aber ohne klaren Auftrag ('Management-Zusammenfassung'), Zielgruppe (CFO) und Format (Länge, Struktur) liefert die KI freies Assoziieren statt eines verwertbaren Entwurfs.",
          nextNode: 'e_correction',
        },
        {
          id: 'missing_context',
          label: 'Es fehlte Kontext bzw. es fehlten Daten',
          points: 0,
          feedback: 'Nein – die vollständigen Zahlen waren im Prompt enthalten und tauchen auch korrekt im Output auf. Das Problem liegt woanders: Der Auftrag selbst war zu offen formuliert.',
          nextNode: 'e_correction',
        },
        {
          id: 'hallucination',
          label: 'Die KI hat Zahlen erfunden',
          points: 0,
          feedback: 'Nein – alle genannten Zahlen stimmen mit der SAP-Auswertung überein. Das Problem ist nicht Erfindung, sondern fehlende Struktur und ein unpassender Ton für den CFO.',
          nextNode: 'e_correction',
        },
      ],
    },

    e_correction: {
      type: 'prompt_choice',
      text: 'Wie steuerst du nach?',
      options: [
        {
          id: 'format_followup',
          label: 'Klare Aufgabe, Format und Zielgruppe nachliefern',
          promptText:
            'Formuliere daraus bitte eine Management-Zusammenfassung für den CFO: max. eine halbe Seite, sachlicher Ton, wichtigste Abweichungstreiber zuerst, am Ende 2–3 konkrete Handlungsempfehlungen.',
          points: 2,
          nextNode: 'e_correction_result_good',
        },
        {
          id: 'vague_followup2',
          label: "Nur um 'mehr Struktur' bitten",
          promptText: 'Kannst du das strukturierter aufschreiben?',
          points: 0,
          nextNode: 'e_correction_result_meh',
        },
      ],
    },

    e_correction_result_good: {
      type: 'output_review',
      aiOutput:
        'Management-Zusammenfassung: Q2-Reisekosten-Abweichung\n\nDie Reisekosten liegen im Q2 mit 812.400 € um 9,0 % über Plan (745.000 €). Haupttreiber ist die Überschreitung bei den Flugkosten (+11,2 %), gefolgt von den Hotelkosten (+6,4 %). Bahn und Mietwagen liegen mit −2,1 % leicht unter Plan.\n\nHandlungsempfehlungen: (1) Analyse der Flugbuchungen auf Kurzfristbuchungen, (2) Prüfung der Reiserichtlinien-Einhaltung bei Hotels, (3) längere Buchungsvorläufe für Q3 vorgeben.',
      ratingLabel: 'Ausgezeichnet',
      explanation:
        'Mit klarer Aufgabe, Format und Zielgruppe wird aus denselben Daten ein verwertbarer Entwurf. Die Lektion: Daten allein reichen nicht – die KI braucht auch eine klare Vorstellung vom gewünschten Ergebnis.',
      nextNode: 'end_recap',
    },

    e_correction_result_meh: {
      type: 'output_review',
      aiOutput:
        '• Reisekosten insgesamt über Plan\n• Flugkosten am stärksten gestiegen\n• Hotelkosten auch über Plan\n• Bahn/Mietwagen unter Plan\n• Ursachen könnten vielfältig sein\n• Verschiedene Maßnahmen wären denkbar',
      ratingLabel: 'Ausbaufähig',
      explanation:
        "'Strukturierter' ohne klare Vorgabe ergibt nur eine andere Form desselben unklaren Inhalts – Stichpunkte statt Fließtext, aber immer noch ohne Priorisierung, Ton oder konkrete Empfehlung. Nachsteuern heißt: sagen, WAS du willst (Format, Zielgruppe, Aufgabe), nicht nur WIE es aussehen soll.",
      nextNode: 'end_recap',
    },

    end_recap: {
      type: 'end',
      recapIntro: 'Deine Entscheidungen im Überblick:',
      lessons: [
        {
          craftElement: 'C – Context',
          text: 'Prompt D und C lieferten die Datenbasis und den Anlass mit. Prompt A und B ließen die KI raten – das Ergebnis war generisches Wissen oder erfundene Zahlen.',
        },
        {
          craftElement: 'R – Role',
          text: "'Du bist mein Assistent im Controlling' verankert Fachsprache und Perspektive der Antwort.",
        },
        {
          craftElement: 'A – Action',
          text: "Eine präzise Aufgabe ('Management-Zusammenfassung mit Abweichungstreibern und Handlungsempfehlungen') statt eines vagen Verbs ('fasse zusammen') oder gar keiner Aufgabe (Prompt E).",
        },
        {
          craftElement: 'F – Format',
          text: "'Max. eine halbe Seite, Empfehlungen am Ende' – ohne Formatvorgabe entscheidet die KI selbst, und selten so, wie der CFO es erwartet.",
        },
        {
          craftElement: 'T – Target/Tone',
          text: "'Zielgruppe CFO, sachlicher Ton' bestimmt Detailtiefe und Sprache.",
        },
        {
          craftElement: 'Kernlektion',
          text: 'Ein perfekter Prompt wie D schützt dich vor Nacharbeit UND vor Halluzinationen. Aber auch bei einem starken Prompt wie C gilt: Jede Zahl und jede Ursachenbehauptung gegen die Quelle prüfen, statt sie blind zu übernehmen. Die Verantwortung für das Ergebnis bleibt immer bei dir.',
        },
      ],
    },
  },
  scoring: { maxPoints: 6, passingScore: 4 },
}

export const promptNavigatorDemoGame: Game = {
  id: 'demo-prompt-navigator',
  title: 'Prompt-Navigator: Der CFO wartet',
  format: 'prompt_branching',
  library_type: 'ai_usage_expertise',
  target_role: 'Accountant / Controller',
  difficulty: 'medium',
  language: 'de',
  topic: 'Prompting & KI-Interaktion im Controlling',
  persona_key: 'sabrina',
  learning_objective:
    'Gute Prompts erkennen (CRAFT), KI-Outputs kritisch bewerten und gezielt nachsteuern (Kontext ergänzen, Fehler adressieren, Halluzinationen erkennen)',
  status: 'draft',
  source_attribution: null,
  created_at: new Date().toISOString(),
  game_json: {
    format: 'prompt_branching',
    branching,
  },
}
