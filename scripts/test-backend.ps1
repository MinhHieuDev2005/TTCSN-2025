param([switch]$MySql)

$ErrorActionPreference = 'Stop'
Push-Location (Join-Path $PSScriptRoot '../CreaTShop-server/creatshop')
try {
    $wrapper = if ($env:OS -eq 'Windows_NT') { '.\mvnw.cmd' } else { './mvnw' }
    & $wrapper -B test dependency:build-classpath '-Dmdep.outputFile=target/test-classpath.txt' '-DincludeScope=test'
    if ($LASTEXITCODE -ne 0) { throw 'Backend build failed.' }
    $separator = [IO.Path]::PathSeparator
    $classpath = "target/test-classes${separator}target/classes${separator}$(Get-Content target/test-classpath.txt -Raw)"
    [string[]]$mode = if ($MySql) { @('mysql') } else { @() }
    & java -ea "-Duser.timezone=Asia/Ho_Chi_Minh" -cp $classpath.Trim() com.example.creatshop.RegressionChecks @mode
    if ($LASTEXITCODE -ne 0) { throw 'Backend regression checks failed.' }
    if (-not $MySql) {
        $httpClasspath = "target/classes${separator}$(Get-Content target/test-classpath.txt -Raw)"
        & java -ea -cp $httpClasspath.Trim() src/test/java/com/example/creatshop/CustomerHttpChecks.java
        if ($LASTEXITCODE -ne 0) { throw 'Customer HTTP checks failed.' }
        & java -ea -cp $httpClasspath.Trim() src/test/java/com/example/creatshop/ChatHttpChecks.java
        if ($LASTEXITCODE -ne 0) { throw 'Chat HTTP checks failed.' }
    }
} finally {
    Pop-Location
}
