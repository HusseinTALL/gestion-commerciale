.PHONY: help up down build migrate seed logs ps

help: ## Affiche l'aide
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

setup: ## Initialiser le projet (copier .env, build, migrate)
	@cp -n .env.example .env || true
	@$(MAKE) build
	@$(MAKE) up
	@sleep 5
	@$(MAKE) migrate

build: ## Builder toutes les images Docker
	docker compose build

up: ## Démarrer tous les services
	docker compose up -d

down: ## Arrêter tous les services
	docker compose down

down-volumes: ## Arrêter et supprimer les volumes (ATTENTION: efface les données)
	docker compose down -v

migrate: ## Appliquer les migrations Prisma sur tous les services
	@for svc in user-service sale-service crm-service commission-service planning-service ristourne-service stock-service content-service notification-service; do \
		echo "==> Migration: $$svc"; \
		docker compose exec $$svc npx prisma migrate deploy; \
	done

migrate-dev: ## Créer et appliquer les migrations en mode développement
	@for svc in user-service sale-service crm-service commission-service planning-service ristourne-service stock-service content-service notification-service; do \
		echo "==> Migration dev: $$svc"; \
		docker compose exec $$svc npx prisma migrate dev --name init; \
	done

seed: ## Insérer les données initiales
	@for svc in user-service sale-service commission-service ristourne-service stock-service; do \
		echo "==> Seed: $$svc"; \
		docker compose exec $$svc npx ts-node prisma/seed.ts || true; \
	done

logs: ## Afficher les logs de tous les services
	docker compose logs -f

logs-svc: ## Logs d'un service spécifique (make logs-svc SVC=user-service)
	docker compose logs -f $(SVC)

ps: ## Statut des conteneurs
	docker compose ps

restart: ## Redémarrer tous les services
	docker compose restart
