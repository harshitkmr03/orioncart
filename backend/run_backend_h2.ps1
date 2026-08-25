$env:SPRING_DATASOURCE_URL = 'jdbc:h2:file:./data/orioncart_db;AUTO_SERVER=TRUE;MODE=PostgreSQL'
$env:SPRING_DATASOURCE_USERNAME = 'sa'
$env:SPRING_DATASOURCE_PASSWORD = ''
$env:SPRING_JPA_HIBERNATE_DDL_AUTO = 'update'
$env:SPRING_FLYWAY_ENABLED = 'false'
$env:FLYWAY_ENABLED = 'false'
$env:SERVER_PORT = '7070'
$env:JWT_SECRET = '4f1e2a3b4c5d6e7f8a9b0c1d2e3f4a5b'
Set-Location -Path $PSScriptRoot
.\mvnw.cmd spring-boot:run

