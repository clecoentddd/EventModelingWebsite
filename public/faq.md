### Qu'est que Event Modeling?
Approche collaborative, interactive, visuelle et simple pour modéliser les procesuss métier. Nous prenons une seule histoire (chapitre, processus, workflow sont synonimes) allant pas à pas, sans chemin alternatif (ce sera une autre histoire).

### N'est-ce pas un peu simpliste ? 
A priori, si... Mais en expérimentant, nous rendons l'implicit explicit... et cela n'est pas simpliste. Expérimentez!
- D'être explicite est bien plus difficile que nous puissions imaginer. La complexité accidentale se cache trop souvent dans l'implicite. Chaque slice est un seul pas: malheureusement, nous avons appris à factoriser, à coupler... Event Modeling nous aide à défaire ce couplage.

###  Comment s'assurer que nous couvrons bien l'ensemble du système d'information? 
Parce que les histoires (chapitres, workflow, processus) appellent d'autres histoires, nous couvrons aisément l'ensemble des fonctionnalités du système d'information, surtout en prenant les bonnes priorités

### Cmmbien de slices pour mon système d'information? 
Difficile à dire... Sauf que les premières histoires seront les plus longues en terme de slices. Chaque nouvelle histoire est souvent qu'une "branche" des histoires déjà discutées. Donc, au fur et à mesure, les histoires sont plus courte.

### Qui peut faciliter les séances d'Event Modeling?
Business analysts, architects, developers, and product owners use it to align understanding.

### Y-a-t-il des test unitaires, du TDD?
Les Given/When/Then - tests BDD - spécification par l'exemple - sont les seules tests unitaires que vous avez besoin pour votre système d'information du point de vue des processus métier. Ces tests couvrent les règles métier de manière unitaire.
A noter que les tests BDD et les tests unitaires ne sont pas différents: Dan North (créateur de BDD) voulait une manière plus facile de créer des tests unitaires (ce que dit la légende :)

### Quelle est la différence entre une Base de Données Relationnelle et un EventStore ?


 🗄️ **Base de données relationnelle (stockage de l’état)**

Imaginons un client **Jean Dupont**.  

Dans une table `Clients` d’une base relationnelle, tu pourrais avoir :

| ClientId | Nom         | Adresse                |
|----------|-------------|------------------------|
| 123      | Jean Dupont | 12 Rue de Lyon, Paris  |

👉 Quand Jean déménage à **25 Avenue Victor Hugo, Paris**, tu fais un **UPDATE** :

```sql
UPDATE Clients 
SET Adresse = '25 Avenue Victor Hugo, Paris'
WHERE ClientId = 123;
```

Résultat après mise à jour :

| ClientId | Nom         | Adresse                       |
|----------|-------------|-------------------------------|
| 123      | Jean Dupont | 25 Avenue Victor Hugo, Paris  |

⚠️ **Problème** : tu as perdu l’historique. Impossible de savoir **pourquoi** l’adresse a changé. L'intention est perdu? Etais-un changement d'adresse, de nom ? Biensur, nous pourrions rajouter plus d'information dans les tables pour stocker l'intention de l'usager: cela a un nom: event sourcing.
<br>
---

**📜 EventStore (suite d’événements)**

Dans un EventStore, tu ne stockes pas l’état final mais **tous les événements**.  

Exemple pour le même client :

| EventId | TypeÉvénement  | Données                                                                 | Horodatage           |
|---------|----------------|-------------------------------------------------------------------------|----------------------|
| 1       | ClientCréé     | `{ ClientId: 123, Nom: "Jean Dupont", Adresse: "12 Rue de Lyon, Paris" }` | 2023-05-01 10:00:00  |
| 2       | AdresseChangée | `{ ClientId: 123, AncienneAdresse: "12 Rue de Lyon, Paris", NouvelleAdresse: "25 Avenue Victor Hugo, Paris", Raison: "Déménagement pro" }` | 2024-01-15 14:30:00  |

👉 Ici, tu vois **l’histoire complète** du client :  
- Créé le **1er mai 2023**  
- Changement d’adresse le **15 janvier 2024** avec une **raison**  

L’**état courant** (adresse actuelle) est une **projection** calculée en appliquant les événements dans l’ordre.
<br>
---
<br>
** ✨ **Résumé**

- **Base relationnelle** → état final, facile pour lire mais **historique perdu**.  
- **EventStore** → enregistre tous les changements, garde **l’historique et le contexte**.

### Est-ce que les performances ne sont pas impactées?
Non, car il y a plusieurs mécanismes pour ne pas être impacté :

- **Snapshots** : tous les X événements, on stocke l'état et indique au "replay" de rejouer qu'à partir de cet événement (index nécessaire).  
- **Open/Close book pattern** : on détecte un événement métier qui permet de stocker l'état, par exemple fin d'année scolaire ou comptable.  
- **CQRS** : voir le pattern.

### Qu'est ce que Vertical Slice Architecture ?
# Les "Slices" dans Event Modeling

Une **slice** regroupe toutes les fonctionnalités nécessaires à délivrer **une et une seule capabilité**.  
Chaque slice contient généralement :

- **API**  
- **Command**  
- **CommandHandler**  
- **UI**

---

## Exemples de capabilités

Un système peut permettre différentes actions comme :  

- Créer un client  
- Donner au client le statut de VIP  
- Enlever le statut de VIP  

Ces actions deviennent des **slices (capabilités)** :

- **Slice 1: `CréerClient`** → Évènement : `ClientCréé`  
- **Slice 2: `PasserAuStatutVIP`** → Évènement : `StatutVIPDonné`  
- **Slice 3: `EnleverStatutVIP`** → Évènement : `StatutVIPEnlevé`  

---

## Principe général

Dans le cadre d’**Event Modeling** :  

- Une **slice du modèle** devient un **répertoire** dans la structure du projet.  
- Chaque **changement d’état** = une slice.  
- Chaque **vue de l’état** = une slice.  
- Chaque **automatisation** = une slice.  
- Chaque **translation** = une slice.  

---

# Structure de fichiers (Event Modeling)

```
src/
├── Slices/
│   ├── CreerClient/
│   │   ├── CreerClientUIForm.js
│   │   ├── CreerClientAPIController.cs
│   │   ├── CreerClientCommand.cs
│   │   └── CreerClientHandler.cs
│   ├── PasserAuStatutVIP/
│   │   ├── PasserVIPUIButton.js
│   │   ├── PasserVIPAPIController.cs
│   │   ├── PasserVIPCommand.cs
│   │   └── PasserVIPHandler.cs
│   └── EnleverStatutVIP/
│       ├── EnleverVIPUIButton.js
│       ├── EnleverVIPAPIController.cs
│       ├── EnleverVIPCommand.cs
│       └── EnleverVIPHandler.cs
├── Events/
│   ├── ClientCree.cs
│   ├── StatutVIPDonne.cs
│   └── StatutVIPEnleve.cs
└── Shared/
    └── Utils.cs
```