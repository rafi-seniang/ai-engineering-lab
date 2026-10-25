# The same targets as every Lab repository: install, lint, test, run, image, plus api-types.
install:
	npm ci --no-audit --no-fund

lint:
	npm run lint

test:
	npm test

run:
	npm run dev

image:
	docker build -t lab-frontend .

# Regenerate the typed clients from the running backends' OpenAPI schemas
api-types:
	npm run api:types

.PHONY: install lint test run image api-types
