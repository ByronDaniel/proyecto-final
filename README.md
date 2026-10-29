# Rule Manager

Node.js API and Angular application for the OpenAPI contract in `openapi-rma.yaml`.

## Requirements

- Node.js 22 or later and npm.
- MongoDB Atlas or a MongoDB replica set. Transactions require a replica set; a standalone MongoDB instance is not supported.
- Network access and MongoDB credentials with read and write permissions for the configured database.

## Backend

```sh
cd rma-service
npm ci
cp .env.example .env
```

Configure `MONGODB_URI`, `MONGODB_DATABASE`, and a unique, random `JWT_SECRET` of at least 32 characters in the ignored `.env` file. `openssl rand -base64 48` can generate a secret locally. Configure the MongoDB network access list and URL-encode credentials when required. Never commit credentials or paste them into chat. Rotate any credentials previously disclosed in conversation.

Create users locally using environment variables. The following example is for the default macOS zsh shell; the password prompt does not echo the entered value:

```zsh
export RMA_USERNAME=maker
export RMA_USER_ROLES=MAKER
read -s "RMA_USER_PASSWORD?Password (at least 12 characters): "
export RMA_USER_PASSWORD
npm run user:create
unset RMA_USER_PASSWORD
```

Create separate users for the other roles with `RMA_USER_ROLES=CHECKER`, `AUDITOR`, `CONSUMER`, or `ADMIN`. Multiple roles may be separated by commas. A requester cannot approve or reject their own proposal. `ADMIN` manages parameter metadata and can read audit records; it does not automatically grant the `MAKER`, `CHECKER`, or `CONSUMER` roles.

```sh
PORT=3010 npm start
```

The API listens on port 3000 by default; the command above selects port 3010 to match the development proxy. Configuration options are listed in `rma-service/.env.example`. Tokens are issued by `POST /api/v1/auth/token`; see the contract for the other operations and headers. Creating an account requires direct administrative access through the command above; there is no public registration endpoint.

## Frontend

In a second terminal:

```sh
cd rma-web
npm ci
npm start
```

Open the URL printed by Angular. The development proxy forwards `/api` to `http://localhost:3010`. To use another backend address during development, update `rma-web/proxy.conf.json`.

Production builds (`npm run build`) call the backend directly at the absolute URL set in `rma-web/src/environments/environment.production.ts`. Set `CORS_ORIGIN` in the backend `.env` to the origin where the frontend is served (for example `https://rma.example.com`). The frontend keeps the JWT in session storage until logout, expiry, or tab closure.

Parameters with previously published but expired versions require the last published version number when submitting a new change. It can be found in the details of an approved change request. Reactivation restores the most recently published `SET_VALUE`; expiration does not restore an older value. Scheduled transitions are checked on startup and approximately every five seconds, and current-value reads evaluate validity at request time.

## Verification

```sh
cd rma-service
npm test
npm run test:coverage
cd ../rma-web
npm run build
npm test -- --watch=false
```

Backend integration tests download and start an ephemeral MongoDB replica set through `mongodb-memory-server`. The frontend test runner requires a locally installed Chrome-compatible browser. The current backend coverage report exceeds 80% in aggregate for the files loaded by tests, but excludes entry points that are not loaded.

## Performance tests

Install k6 and start the backend with the intended MongoDB connection. The following macOS zsh commands run a sustained load test followed by a spike and recovery test. Enter an existing CHECKER bearer token at the prompt; do not put it in the command line or commit it:

```zsh
cd rma-service
read -rs 'K6_TOKEN?Bearer token: '
print
export K6_TOKEN
API_PID="$(lsof -tiTCP:3010 -sTCP:LISTEN)" node performance/run.js
unset K6_TOKEN
```

The runner records k6 summaries and samples backend CPU and RSS every five seconds in a timestamped `performance/results` directory. It exits nonzero when a scenario fails its illustrative thresholds: less than 1% failed requests, more than 99% successful checks, and p95 below 1 second. These are test targets, not agreed service-level objectives. To validate the setup first, add `SMOKE=1` before `API_PID`. Configure `BASE_URL` and `API_PID` for a different local instance.

Run `node performance/summarize.js performance/results/<timestamp>` to summarize the recorded metrics and process resources by phase.

The read-only workload requests the first 20 change requests as CHECKER, with one second of think time per virtual user. The sustained scenario ramps to 100 VUs over two minutes, holds for five minutes, and ramps down over one minute. The spike starts at 50 VUs for 30 seconds, jumps to 500 for one minute, drops immediately to zero, then runs a one-VU recovery probe after a ten-second pause. This closed-loop workload does not guarantee a fixed request rate. Running it against a shared database can affect other users and incur costs; use an authorized test environment. CPU and memory are sampled for the API process only; Atlas utilization and autoscaling require separate infrastructure monitoring.

After the load tests, `node performance/controls.js` can check conditional ETag responses and the login rate limiter. Supply `CONSUMER_TOKEN` in the environment or configure the local `JWT_SECRET`. The check sends 21 invalid login attempts and can prevent other logins from the same IP for up to one minute; run it only against an authorized test instance. It does not measure cache performance or distributed rate limiting.

## Deployment limitations

This implementation has not been fully validated against the target Atlas cluster or a production deployment. OpenAPI request validation is enabled, but response validation is not enabled. The login rate limiter is process-local, and JWTs are not individually revocable. User-provided regular expressions require a security review. Run concurrency, load, security, and end-to-end tests, and configure TLS, centralized rate limiting, secret management, observability, and deployment-specific CORS before production use.