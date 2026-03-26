# Système de Gestion Commerciale

Documentation et modélisation d'un système de gestion commerciale basé sur une architecture microservices.

## Contenu du projet

| Fichier | Description |
|---------|-------------|
| `CDC_Systeme_Gestion_Commerciale_v2.docx` | Cahier des charges complet du système |
| `ERD_Systeme_Gestion_Commerciale.mermaid` | Diagramme entité-relation (ERD) — architecture database-per-service |
| `Modele_Donnees_Dictionnaire.docx` | Dictionnaire des données et modèle de données |
| `Plan_Performance_Commerciale.docx` | Plan de performance commerciale |

## Architecture

Le système suit le pattern **microservices** avec une base de données par service :

- **User Service** — gestion des utilisateurs et profils commerciaux
- **Product Service** — catalogue produits et gestion des stocks
- **Order/Sales Service** — commandes et transactions commerciales
- **Reporting Service** — tableaux de bord et indicateurs de performance

## Rôles utilisateurs

- `CASHIER` — caissier
- `COMMERCIAL` — commercial terrain
- `MANAGER` — responsable
- `DIRECTOR` — directeur
- `ADMIN` — administrateur système
