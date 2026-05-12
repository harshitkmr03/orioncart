$env:SPRING_DATASOURCE_URL = 'jdbc:h2:file:./data/orioncart_db;AUTO_SERVER=TRUE'
$env:SPRING_DATASOURCE_USERNAME = 'sa'
$env:SPRING_DATASOURCE_PASSWORD = ''
$env:SPRING_JPA_HIBERNATE_DDL_AUTO = 'update'
$env:JWT_SECRET = '4f1e2a3b4c5d6e7f8a9b0c1d2e3f4a5b'
Set-Location -Path $PSScriptRoot
& "..\tools\apache-maven-3.9.6\bin\mvn.cmd" spring-boot:run

