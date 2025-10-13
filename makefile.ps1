$COMMAND = $args[0]

${NAME} = "workday-pi-time"
$OWNER = "byuoitav"
$PKG = "github.com/$OWNER/${NAME}"
$DOCKER_URL = "ghcr.io"
$DOCKER_PKG = "$DOCKER_URL/$OWNER/${NAME}"

Write-Output "PKG: $PKG"
Write-Output "DOCKER_PKG: $DOCKER_PKG"

$PRD_TAG_REGEX = "v[0-9]+\.[0-9]+\.[0-9]+"
$DEV_TAG_REGEX = "v[0-9]+\.[0-9]+\.[0-9]+-.+"

$COMMIT_HASH = Invoke-Expression "git rev-parse --short HEAD"
$TAG = Invoke-Expression "git rev-parse --short HEAD"
try {
    $NEW_TAG = Invoke-Expression "git describe --exact-match --tags HEAD"
    Write-Output "NEW_TAG: $NEW_TAG.Length"
    if ($NEW_TAG.Length -gt 0) {
        $TAG = $NEW_TAG
        Write-Output "The repo contains a tag: $TAG"
    }
}
catch {
    Write-Output "The repo does not contain a tag"
}

Write-Output "The TAG is: $TAG"

# go stuff
$PKG_LIST = Invoke-Expression "go list $PKG/..."
Write-Output "PKG_LIST: $PKG_LIST"

function All {
    Write-Output "All"
}

function Test {
    Write-Output "Test"
    Invoke-Expression "go test -v $PKG_LIST"
}

function Test-cov {
    Write-Output "Test-cov"
    Invoke-Expression "go test -coverprofile=coverage.txt -covermode=atomic $PKG_LIST"
}

function Lint {
    Write-Output "Lint"
    Invoke-Expression "golangci-lint run --test=false"
}

function Deps {
    Write-Output "Downloading Dependencies"
    Invoke-Expression "go mod download"
}

function Build {
    Write-Output "Build"

    New-Item -Path dist -ItemType Directory

    Write-Output "*****************************************"
    Write-Output "Building for linux-arm64"
    Set-Item -Path env:CGO_ENABLED -Value 0
    Set-Item -Path env:GOOS -Value "linux"
    Set-Item -Path env:GOARCH -Value "arm64"
    Invoke-Expression "go build -v -o ./dist/${NAME}"

    Write-Output "Build output is located in ./dist/."
}

function Cleanup {
    Write-Output "Clean"
    Invoke-Expression "go clean"
    if (Test-Path -Path "dist") {
        Remove-Item dist -recurse
        Write-Output "Recursively deleted dist/"
    } else {
        Write-Output "No dist directory to delete"
    }
}

function DockerFunc {
    Write-Output "Function Docker      Commit Hash: $COMMIT_HASH     Tag: $TAG"
    if ($COMMIT_HASH -eq $TAG) {
        Write-Output "Building dev container with tag $COMMIT_HASH"

        Write-Output "Building container $DOCKER_PKG/${NAME}:$COMMIT_HASH"
        Invoke-Expression "docker build --platform linux/arm64 -f .\dockerfile --build-arg NAME=${NAME} -t $DOCKER_PKG/${NAME}:$COMMIT_HASH dist"
    } elseif ($TAG -match $DEV_TAG_REGEX) {
        Write-Output "Building dev container with tag $TAG"

        Write-Output "Building container $DOCKER_PKG/${NAME}:$TAG"
        Invoke-Expression "docker build --platform linux/arm64 -f .\dockerfile --build-arg NAME=${NAME} -t $DOCKER_PKG/${NAME}:$TAG dist"
    } elseif ($TAG -match $PRD_TAG_REGEX) {
        Write-Output "Building prd container with tag $TAG"

        Write-Output "Building container $DOCKER_PKG/${NAME}:$TAG"
        Invoke-Expression "docker build --platform linux/arm64 -f .\dockerfile --build-arg NAME=${NAME} -t $DOCKER_PKG/${NAME}:$TAG dist"
    } else {
        Write-Output "Docker function quit unexpectedly. Commit Hash: $COMMIT_HASH     Tag: $TAG"
    }
 }

function Deploy {
    Write-Output "Deploy      Commit Hash: $COMMIT_HASH     Tag: $TAG"

    Write-Output "Logging into repo"    
    Invoke-Expression "docker login $DOCKER_URL -u $Env:DOCKER_USERNAME -p $Env:DOCKER_PASSWORD"
    
    if ($COMMIT_HASH -eq $TAG) {
        Write-Output "Pushing dev container with tag $COMMIT_HASH"

        Write-Output "Pushing container $DOCKER_PKG/${NAME}:$COMMIT_HASH"
        Invoke-Expression "docker push $DOCKER_PKG/${NAME}:$COMMIT_HASH"
    } elseif ($TAG -match $DEV_TAG_REGEX) {
        Write-Output "Pushing dev container with tag $TAG"

        Write-Output "Pushing container $DOCKER_PKG/${NAME}:$TAG"
        Invoke-Expression "docker push $DOCKER_PKG/${NAME}:$TAG"
    } elseif ($TAG -match $PRD_TAG_REGEX) {
        Write-Output "Pushing prd container with tag $TAG"

        Write-Output "Pushing container $DOCKER_PKG/${NAME}:$TAG"
        Invoke-Expression "docker push $DOCKER_PKG/${NAME}:$TAG"
    } else {
        Write-Output "Deploy function quit unexpectedly. Commit Hash: $COMMIT_HASH     Tag: $TAG"
    }
}

if ($COMMAND -eq "All") {
    Cleanup
    Build
    All     
}
elseif ($COMMAND -eq "Test") {
    Deps
    Test
}
elseif ($COMMAND -eq "Test-cov") {
    Deps
    Test-cov
}
elseif ($COMMAND -eq "Lint") {
    Deps
    Lint
}
elseif ($COMMAND -eq "Deps") {
    Deps
}
elseif ($COMMAND -eq "Build") {
    Cleanup
    Deps
    Build
}
elseif ($COMMAND -eq "Clean") {
    Cleanup
}
elseif ($COMMAND -eq "Docker" ) {
    Cleanup
    Deps
    Build
    DockerFunc
    Cleanup
}
elseif ($COMMAND -eq "Deploy" ) {
    Cleanup
    Deps
    Build
    DockerFunc
    Deploy
    Cleanup
}
else {
    Write-Output "Please include a valid command parameter"
}
