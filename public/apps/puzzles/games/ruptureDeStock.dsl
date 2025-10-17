DESCRIPTION: "Rupture de stock d'articles que le client a déjà mis dans son panier"
LEVEL: 3

ELEMENT: 1, Screen, "Sélectionner article et quantité - Article A", 1;1
ELEMENT: 2, Command, "Valider Sélection", 1;0
ELEMENT: 3, Event, "Sélection Validé", 1;-1
ELEMENT: 4, ReadModel, "Articles à ajouter au panier", 2;0
ELEMENT: 5, Automation, "Panier Ajout Processeur", 3;1
ELEMENT: 6, Command, "Ajouter Articles au panier", 3;0
ELEMENT: 7, Event, "Articles ajoutés au panier", 3;-1
ELEMENT: 8, Event, "Articles refusés (ne livre pas dans ce pays)", 4;-1
ELEMENT: 9, ReadModel, "Liste des articles du panier et quantité", 5;0
ELEMENT: 10, ExternalEvent, "Alerte Entrepot- rupture de stock Article A", 6;-2
ELEMENT: 11, Automation, "Gestion des alertes reçues depuis l'entrepot", 7;1
ELEMENT: 12, Command, "Alerter Non Disponibilité Article A", 7;0
ELEMENT: 13, Event, "Article A rendu indisponible", 7;-1
ELEMENT: 14, ReadModel, "Liste des articles à retirer des paniers", 8;0
ELEMENT: 15, Automation, "Panier Retireur", 9;1
ELEMENT: 16, Command, "Retirer Article", 9;0
ELEMENT: 17, Event, "Article Retiré", 9;-1
ELEMENT: 18, ReadModel, "Clients à notifier - Article Retiré", 10;0
ELEMENT: 19, Automation, "Traitement des notifications", 11;1
ELEMENT: 20, Command, "Appliquer Notification: Article Retiré", 11;0
ELEMENT: 21, Event, "Notification Appliquée: Article Retiré", 11;-1
ELEMENT: 22, ReadModel, "Liste des notifications - Articles retirés - par panier", 12;0
ELEMENT: 23, Screen, "Article A n'est plus disponible - Il a été retiré de votre panier", 12;1

FLOW: 1 to 2
FLOW: 2 to 3
FLOW: 3 to 4
FLOW: 4 to 5
FLOW: 5 to 6
FLOW: 6 to 7
FLOW: 7 to 9
FLOW: 6 to 8 
BACK_FLOW: 7 to 4
FLOW: 10 to 11
FLOW: 11 to 12
FLOW: 12 to 13
FLOW: 13 to 14
FLOW: 14 to 15
FLOW: 15 to 16
FLOW: 16 to 17
FLOW: 17 to 18
FLOW: 18 to 19
FLOW: 19 to 20
FLOW: 20 to 21
FLOW: 21 to 22
FLOW: 22 to 23
BACK_FLOW: 17 to 14
BACK_FLOW: 21 to 18

