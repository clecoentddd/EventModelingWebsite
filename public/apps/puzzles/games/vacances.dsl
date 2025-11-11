DESCRIPTION: "Prendre des vacances"
LEVEL: 2

ELEMENT: 1, Screen, "Vacances 2025", 1;1
TEXT: Connecté: Paul; Du: 12.07.2025; Au: 15.07.2025; -- Soumettre --
ELEMENT: 2, Command, "Soumettre Demande Vacances", 1;0
TEXT: Du: 12.07.2025; Au: 15.07.2025; Demandeur: Paul
ELEMENT: 3, Event, "Vacances Soumises", 1;-1
TEXT: Du: 12.07.2025; Au: 15.07.2025; Demandeur: Paul
ELEMENT: 4, ReadModel, "Demandes à valider", 2;0
TEXT: Responsable: Jocelyne; De: Paul; 12.07/5.07.2025 (3j); De: Andrea; 31.07/12.08.2025 (10j)
ELEMENT: 5, Screen, "Vacances A Approuver", 3;1
TEXT: Responsable: Jocelyne; De: Paul; 12.07/5.07.2025 (3j); De: Andrea; 31.07/12.08.2025 (10j); -- Approuver Sélection --
ELEMENT: 6, Command, "Approuver Vacances", 4;0
TEXT: Demandeur: Paul; Du: 12.07.2025; Au: 15.07.2025; 
ELEMENT: 7, Event, "Vacances Approuvées", 4;-1
TEXT: Demandeur: Paul; Du: 12.07.2025; Au: 15.07.2025
ELEMENT: 8, ReadModel, "Status Vacances", 5;0
TEXT: Comptes {;  Paul; ... 17 jours restants; Valérie; ... 12 jours restants;}
ELEMENT: 9, Screen, "Vacances 2025", 5;1
TEXT: -- Connecté: Paul -- ; 12 au 15.07: approuvés; 17 jours restants
ELEMENT: 10, Screen, "Vacances 2025", 6;1
TEXT: -- Vue RH -- ; Paul: 17 jours restants; Valérie: 12 jours restants


FLOW: 1 to 2
FLOW: 2 to 3
FLOW: 3 to 4
FLOW: 4 to 5
FLOW: 5 to 6
FLOW: 6 to 7
FLOW: 7 to 8
FLOW: 8 to 9
FLOW: 8 to 10
