ELEMENT: 1, Screen, "Vacances 2025", 1;1
TEXT: Connecté: Paul; Du: 12.07.2025; Au: 15.07.2025; Soumettre 
ELEMENT: 2, Command, "Soumettre Demande Vacances", 1;0
TEXT: Du: 12.07.2025; Au: 15.07.2025; Demandeur: Paul
ELEMENT: 3, Event, "Vacances Soumises", 1;-1
ELEMENT: 4, ReadModel, "Demandes à valider", 2;0

FLOW: 2 to 1
FLOW: 1 to 3
FLOW: 3 to 4
