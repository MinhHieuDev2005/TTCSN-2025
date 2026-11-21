# Backend configuration

`src/main/resources/application.properties` contains public defaults and environment
placeholders. It is versioned and included in the JAR. Never put real credentials
there. Database password (`SPRING_DATASOURCE_PASSWORD`) and JWT key (`JWT_SECRET`)
have no shared fallback values; schema management defaults to `validate`.

## Local development

Before updating another existing checkout to this change, copy its old ignored
`src/main/resources/application.properties` to `config/application.properties`
without overwriting an existing external file. Git can replace ignored files
when a path becomes tracked. Do this before pulling the new public defaults.

From `CreaTShop-server/creatshop`, Spring Boot automatically reads the optional
external file `config/application.properties`. This file is ignored by Git and
excluded from the Docker build context. The current machine's previous local
properties have been copied there without changing their values.

For a fresh clone, copy `src/main/resources/application.properties.example` to
`config/application.properties`. Set the real database connection and credentials
in the external file, and set `auth.token.jwtSecret` to a private base64 key of at
least 32 random bytes. Alternatively, provide the environment variables used in
the template. Generate a key locally in PowerShell:

```powershell
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
$env:JWT_SECRET = [Convert]::ToBase64String($bytes)
```

Keep the existing JWT key when migrating a working installation; changing it
invalidates existing sessions. PowerShell `$env:` settings only apply to the current
process and its children; a new terminal does not retain them. To persist OAuth
credentials locally, set `app.oauth2.google.client-id`,
`app.oauth2.google.client-secret`, `app.oauth2.facebook.client-id` and
`app.oauth2.facebook.client-secret` in the ignored external file. Copy the actual
console values without surrounding `< >` or quotes. Restart the backend after
changing these settings, then start a new login from the shop rather than reloading
an old provider error page. Never commit or share Client Secrets.

```powershell
Set-Location D:\creatshop\TTCSN-2025\CreaTShop-server\creatshop
.\mvnw.cmd -DskipTests package
java -jar .\target\creatshop-0.0.1-SNAPSHOT.jar --spring.jpa.hibernate.ddl-auto=validate
```

When starting from the repository root, explicitly locate the external directory:

```powershell
java -jar .\CreaTShop-server\creatshop\target\creatshop-0.0.1-SNAPSHOT.jar --spring.config.additional-location=file:./CreaTShop-server/creatshop/config/ --spring.jpa.hibernate.ddl-auto=validate
```

Do not overwrite an existing external file when updating the repository. The
working directory determines where Spring Boot searches for `config/`.

## Docker and production

For a new local installation follow `docs/SYNTHETIC_DEMO.md`, not legacy
base Compose. Legacy MySQL does not mount the declared named volume: do not
recreate it with changed mounts without verified backup/migration. Keep the
existing DB password and JWT key for an existing volume. Java does not load
Compose `.env` files automatically.

External-provider opt-in: `docs/EXTERNAL_ACCEPTANCE.md`. Configuration presence
is not proof of payment/upload acceptance.

For production, inject secrets through the deployment environment/secret store or
mount an external properties file read-only and point
`SPRING_CONFIG_ADDITIONAL_LOCATION` to it. Apply required database migrations before
starting with `validate`. OAuth, Cloudinary and VNPay variables are documented in
the example properties; forward them explicitly to the container when enabled.

Previously built JARs may still contain the old embedded configuration. Do not
publish those artifacts. Do not run `mvn clean` while using a JAR under `target/`;
stop the intended process first. If an old artifact or credential was shared,
rotate the affected secrets; moving configuration alone does not revoke them.
