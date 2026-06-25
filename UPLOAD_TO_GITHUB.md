# Upload MoltiAI- to GitHub

Your GitHub repository currently only contains `.gitignore`.

Repository:

```text
https://github.com/JUICEMM/MoltiAI-
```

## Option A: GitHub Website

1. Open `github-upload/MoltiAI-.zip`.
2. Extract it locally.
3. Open `https://github.com/JUICEMM/MoltiAI-`.
4. Click `Add file` -> `Upload files`.
5. Drag the extracted files and folders:
   - `apps/`
   - `vidgo-video-prototype/`
   - `package.json`
   - `package-lock.json`
   - `README.md`
   - `.gitignore`
6. Commit with:

```text
Initial MoltiAI video generator integration
```

## Option B: No-Git Upload Script

This does not require Git to be installed.

1. Create a GitHub fine-grained personal access token:
   - Repository access: `JUICEMM/MoltiAI-`
   - Repository permissions: `Contents` -> `Read and write`

2. In PowerShell, from the workspace root:

```powershell
$env:GITHUB_TOKEN="YOUR_TOKEN_HERE"
.\github-upload\push-to-github.ps1
```

3. Refresh:

```text
https://github.com/JUICEMM/MoltiAI-
```

You should see `apps/web` and `vidgo-video-prototype`.
