DESCRIPTION: "Prendre des vacances"
LEVEL: 2

ELEMENT: 1, Screen, "Vacances 2025", 1;1
TEXT: 
~Connecté: Paul~
Du: 12.07.2025
Au: 15.07.2025
[ Soumettre ]

ELEMENT: 2, Command, "Soumettre Demande Vacances", 1;0
TEXT: 
Du: 12.07.2025
Au: 15.07.2025
Demandeur: Paul

ELEMENT: 3, Event, "Vacances Soumises", 1;-1
TEXT: 
Du: 12.07.2025
Au: 15.07.2025
Demandeur: Paul

ELEMENT: 4, ReadModel, "Demandes à valider", 2;0
TEXT: 
Demandeur: Paul
12.07/5.07.2025 (3j)

ELEMENT: 5, Screen, "Vacances A Approuver", 3;1
TEXT: 
~ Connecté : Andrea ~
Demandeur: Paul
12.07/5.07.2025 (3j)
[ Approuver Sélection ]

ELEMENT: 6, Command, "Approuver Vacances", 3;0
TEXT: 
Demandeur: Paul
Du: 12.07.2025
Au: 15.07.2025
Par: Andrea

ELEMENT: 7, Event, "Vacances Approuvées", 3;-1
TEXT: 
Demandeur: Paul
Du: 12.07.2025
Au: 15.07.2025
Par: Andrea

ELEMENT: 8, ReadModel, "Status Vacances", 4;0
TEXT: 
Mois 07.2025 {
Paul
3j & 12 jours restants
Emma
2j & 10j restants
}

ELEMENT: 9, Screen, "SoldeConge (Paul)", 4;1
TEXT: 
~ Connecté: Paul ~
o Solde initial : 15 jours
o Congés validés : 3 jours
o Solde restant : 12 jours

ELEMENT: 10, Screen, "Rapport RH 0.72025", 5;1
TEXT: 
~Connecté: Adel (DRH)~
Paul : 3 jours pris (12–15/07)
Emma : 2 jours pris (8–9/07)
Karim : 0 jour pris


FLOW: 1 to 2
FLOW: 2 to 3
FLOW: 3 to 4
FLOW: 4 to 5
FLOW: 5 to 6
BACK_FLOW: 7 to 4 
FLOW: 6 to 7
FLOW: 7 to 8
FLOW: 8 to 9
FLOW: 8 to 10
