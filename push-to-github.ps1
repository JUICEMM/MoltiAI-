param(
  [string]$Owner = "JUICEMM",
  [string]$Repo = "MoltiAI-",
  [string]$Branch = "main",
  [string]$SourceDir = ""
)

$ErrorActionPreference = "Stop"

if (-not $env:GITHUB_TOKEN) {
  throw "Missing GITHUB_TOKEN. Create a fine-grained GitHub token with Contents: Read and write, then run: `$env:GITHUB_TOKEN='YOUR_TOKEN'"
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$workspaceRoot = Resolve-Path (Join-Path $scriptDir "..")

if (-not $SourceDir) {
  $SourceDir = Join-Path $workspaceRoot "github-upload\MoltiAI-"
}

$SourceDir = Resolve-Path $SourceDir

$headers = @{
  Authorization = "Bearer $env:GITHUB_TOKEN"
  Accept = "application/vnd.github+json"
  "X-GitHub-Api-Version" = "2022-11-28"
  "User-Agent" = "MoltiAI-upload-script"
}

$skipParts = @(
  "node_modules",
  ".git",
  "dist",
  "out",
  "tmp",
  "public\uploads"
)

function Should-Skip($relativePath) {
  foreach ($part in $skipParts) {
    if ($relativePath -eq $part -or $relativePath.StartsWith("$part\")) {
      return $true
    }
    if ($relativePath.Contains("\$part\")) {
      return $true
    }
  }
  return $false
}

function Get-ExistingSha($path) {
  $encodedPath = ($path -replace "\\", "/")
  $url = "https://api.github.com/repos/$Owner/$Repo/contents/$encodedPath`?ref=$Branch"
  try {
    $existing = Invoke-RestMethod -Method Get -Uri $url -Headers $headers
    return $existing.sha
  } catch {
    if ($_.Exception.Response.StatusCode.value__ -eq 404) {
      return $null
    }
    throw
  }
}

$files = Get-ChildItem -Path $SourceDir -Recurse -File | Where-Object {
  $relative = [System.IO.Path]::GetRelativePath($SourceDir, $_.FullName)
  -not (Should-Skip $relative)
}

Write-Host "Uploading $($files.Count) files to $Owner/$Repo..."

foreach ($file in $files) {
  $relativePath = [System.IO.Path]::GetRelativePath($SourceDir, $file.FullName)
  $githubPath = ($relativePath -replace "\\", "/")
  $sha = Get-ExistingSha $relativePath
  $bytes = [System.IO.File]::ReadAllBytes($file.FullName)
  $content = [Convert]::ToBase64String($bytes)

  $body = @{
    message = "Upload $githubPath"
    content = $content
    branch = $Branch
  }

  if ($sha) {
    $body.sha = $sha
  }

  $json = $body | ConvertTo-Json -Depth 10
  $url = "https://api.github.com/repos/$Owner/$Repo/contents/$githubPath"
  Invoke-RestMethod -Method Put -Uri $url -Headers $headers -Body $json -ContentType "application/json" | Out-Null
  Write-Host "Uploaded $githubPath"
}

Write-Host "Done: https://github.com/$Owner/$Repo"
