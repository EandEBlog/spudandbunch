# Spud & Bunch — common operations.
# Run `make` (no args) to see all available targets.

.DEFAULT_GOAL := help

DEV  := docker compose -f docker-compose.dev.yml
PROD := docker compose

# ── Help ──────────────────────────────────────────────────────────────────────

.PHONY: help
help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage: make \033[36m<target>\033[0m\n"} \
	  /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-28s\033[0m %s\n", $$1, $$2 } \
	  /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) }' \
	  $(MAKEFILE_LIST)

##@ Dev stack (Postgres + Strapi only)

.PHONY: dev-up
dev-up: ## Start dev CMS
	@test -f apps/cms/.env || cp apps/cms/.env.example apps/cms/.env
	$(DEV) up -d --build

.PHONY: dev-down
dev-down: ## Stop, keep data
	$(DEV) down

.PHONY: dev-reset
dev-reset: ## Stop and wipe all data
	$(DEV) down -v

.PHONY: dev-logs
dev-logs: ## Stream Strapi logs
	$(DEV) logs -f strapi

##@ Dev admin  (EMAIL=x PASS=x NAME=x)

.PHONY: dev-admin-list
dev-admin-list: ## List admin users
	$(DEV) exec strapi strapi admin:list-users

.PHONY: dev-admin-create
dev-admin-create: ## Create admin user
	$(DEV) exec strapi strapi admin:create-user \
	  --email=$(EMAIL) --password=$(PASS) --firstname=$(or $(NAME),User)

.PHONY: dev-admin-reset-password
dev-admin-reset-password: ## Reset a user's password
	$(DEV) exec strapi strapi admin:reset-user-password \
	  --email=$(EMAIL) --password=$(PASS)

##@ Production stack

.PHONY: up
up: ## Start production stack
	$(PROD) up -d --build

.PHONY: down
down: ## Stop, keep data
	$(PROD) down

.PHONY: reset
reset: ## Stop and wipe all data
	$(PROD) down -v

.PHONY: logs
logs: ## Stream rebuild-hook logs (watch builds)
	$(PROD) logs -f rebuild-hook

.PHONY: logs-strapi
logs-strapi: ## Stream Strapi logs
	$(PROD) logs -f strapi

.PHONY: status
status: ## Print rebuild-hook health (building state, last build, last error)
	$(PROD) exec rebuild-hook \
	  node -e "require('http').get('http://localhost:8080/health',r=>{let b='';r.on('data',d=>b+=d);r.on('end',()=>console.log(JSON.stringify(JSON.parse(b),null,2)))})"

.PHONY: rebuild
rebuild: ## Manually trigger a site rebuild
	$(PROD) exec rebuild-hook \
	  node -e "const r=require('http').request({hostname:'localhost',port:8080,path:'/rebuild',method:'POST',headers:{'x-webhook-secret':process.env.WEBHOOK_SECRET||''}},r=>console.log('HTTP',r.statusCode));r.end()"

##@ Prod admin  (EMAIL=x PASS=x NAME=x)

.PHONY: admin-list
admin-list: ## List admin users
	$(PROD) exec strapi strapi admin:list-users

.PHONY: admin-create
admin-create: ## Create admin user
	$(PROD) exec strapi strapi admin:create-user \
	  --email=$(EMAIL) --password=$(PASS) --firstname=$(or $(NAME),User)

.PHONY: admin-reset-password
admin-reset-password: ## Reset a user's password
	$(PROD) exec strapi strapi admin:reset-user-password \
	  --email=$(EMAIL) --password=$(PASS)

##@ Frontend

.PHONY: install
install: ## npm install
	npm install

.PHONY: dev
dev: ## Astro dev server → http://localhost:4321
	npm run dev

.PHONY: build
build: ## Static build → apps/web/dist (requires Strapi running)
	npm run build

.PHONY: test
test: ## Vitest unit tests
	npm test

.PHONY: test-watch
test-watch: ## Vitest in watch mode
	npm run test:watch

.PHONY: lint
lint: ## ESLint
	npm run lint

.PHONY: lint-fix
lint-fix: ## ESLint with auto-fix
	npm run lint:fix

.PHONY: format
format: ## Prettier (writes files)
	npm run format

.PHONY: format-check
format-check: ## Prettier check (no writes)
	npm run format:check

##@ Secrets

.PHONY: gen-secrets
gen-secrets: ## Print freshly generated secrets — paste into .env
	@echo "# Paste into .env — regenerate any time with: make gen-secrets"
	@echo "DATABASE_PASSWORD=$$(openssl rand -base64 16)"
	@echo "APP_KEYS=$$(openssl rand -base64 16),$$(openssl rand -base64 16),$$(openssl rand -base64 16),$$(openssl rand -base64 16)"
	@echo "API_TOKEN_SALT=$$(openssl rand -base64 16)"
	@echo "ADMIN_JWT_SECRET=$$(openssl rand -base64 16)"
	@echo "TRANSFER_TOKEN_SALT=$$(openssl rand -base64 16)"
	@echo "ENCRYPTION_KEY=$$(openssl rand -base64 16)"
	@echo "JWT_SECRET=$$(openssl rand -base64 16)"
	@echo "WEBHOOK_SECRET=$$(openssl rand -base64 16)"
	@echo "PREVIEW_SECRET=$$(openssl rand -base64 16)"
