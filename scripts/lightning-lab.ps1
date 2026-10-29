#Requires -Version 5.1
param(
    [Parameter(Position = 0)]
    [ValidateSet("up", "init", "status", "mine", "invoice", "pay", "demo", "export-secrets", "down", "reset")]
    [string]$Command = "status",
    [int]$AmountSats = 2500,
    [string]$PayReq = "",
    [switch]$Confirm
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$ComposeFile = Join-Path $RepoRoot "infrastructure\lightning-regtest\compose.yaml"
$SecretsDir = Join-Path $RepoRoot "infrastructure\lightning-regtest\secrets"
$RpcUser = if ($env:BITCOIN_RPC_USER) { $env:BITCOIN_RPC_USER } else { "smartpayregtest" }
$RpcPass = if ($env:BITCOIN_RPC_PASSWORD) { $env:BITCOIN_RPC_PASSWORD } else { "changeme-regtest-rpc-only" }
$WalletPass = if ($env:LND_WALLET_PASSWORD) { $env:LND_WALLET_PASSWORD } else { "changeme-regtest-wallet" }

function Invoke-Compose {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
    & docker compose -f $ComposeFile @Args
    if ($LASTEXITCODE -ne 0) { throw "docker compose a échoué: $Args" }
}

function Invoke-Bitcoin {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
    & docker compose -f $ComposeFile exec -T bitcoind bitcoin-cli -regtest "-rpcuser=$RpcUser" "-rpcpassword=$RpcPass" @Args
    if ($LASTEXITCODE -ne 0) { throw "bitcoin-cli a échoué: $Args" }
}

function Invoke-Lncli {
    param(
        [ValidateSet("alice", "bob")][string]$Node,
        [Parameter(ValueFromRemainingArguments = $true)][string[]]$Args
    )
    $service = "lnd-$Node"
    & docker compose -f $ComposeFile exec -T $service lncli --network=regtest @Args
    if ($LASTEXITCODE -ne 0) { throw "lncli $Node a échoué: $Args" }
}

function Get-LncliText {
    param(
        [ValidateSet("alice", "bob")][string]$Node,
        [Parameter(ValueFromRemainingArguments = $true)][string[]]$Args
    )
    $service = "lnd-$Node"
    $output = & docker compose -f $ComposeFile exec -T $service lncli --network=regtest @Args 2>&1 | Out-String
    return $output.Trim()
}

function Ensure-Wallet {
    param([ValidateSet("alice", "bob")][string]$Node)
    $info = Get-LncliText $Node getinfo 2>&1
    if ($info -match "identity_pubkey") { return }
    if ($info -match "wallet locked|uninitialized|not found|unavailable|WaitForReady") {
        $createInput = "$WalletPass`n$WalletPass`nn`nn`n"
        $createInput | docker compose -f $ComposeFile exec -T "lnd-$Node" lncli --network=regtest create | Out-Null
        Start-Sleep -Seconds 3
        $info = Get-LncliText $Node getinfo 2>&1
        if ($info -match "wallet locked") {
            "$WalletPass" | docker compose -f $ComposeFile exec -T "lnd-$Node" lncli --network=regtest unlock | Out-Null
            Start-Sleep -Seconds 3
        }
    }
}

function Wait-ForInfo {
    param([ValidateSet("alice", "bob")][string]$Node)
    for ($i = 0; $i -lt 45; $i++) {
        $info = Get-LncliText $Node getinfo 2>&1
        if ($info -match "identity_pubkey") {
            $parsed = $info | ConvertFrom-Json
            if ($parsed.synced_to_chain -eq $true) { return $parsed }
        }
        Start-Sleep -Seconds 2
        Ensure-Wallet $Node
    }
    throw "LND $Node n'est pas prêt (synced_to_chain)."
}

function Export-Secrets {
    New-Item -ItemType Directory -Force -Path (Join-Path $SecretsDir "alice"), (Join-Path $SecretsDir "bob") | Out-Null
    docker cp smartpay-lnd-alice:/root/.lnd/tls.cert (Join-Path $SecretsDir "alice\tls.cert") | Out-Null
    docker cp smartpay-lnd-alice:/root/.lnd/data/chain/bitcoin/regtest/admin.macaroon (Join-Path $SecretsDir "alice\admin.macaroon") | Out-Null
    docker cp smartpay-lnd-bob:/root/.lnd/tls.cert (Join-Path $SecretsDir "bob\tls.cert") | Out-Null
    docker cp smartpay-lnd-bob:/root/.lnd/data/chain/bitcoin/regtest/admin.macaroon (Join-Path $SecretsDir "bob\admin.macaroon") | Out-Null
    Write-Host "Secrets exportés dans infrastructure/lightning-regtest/secrets (gitignoré)."
}

function Invoke-Init {
    Ensure-Wallet alice
    Ensure-Wallet bob
    $alice = Wait-ForInfo alice
    $bob = Wait-ForInfo bob
    $aliceAddr = (Get-LncliText alice newaddress p2wkh | ConvertFrom-Json).address
    Invoke-Bitcoin generatetoaddress 101 $aliceAddr | Out-Null
    Start-Sleep -Seconds 3
    $bobKey = $bob.identity_pubkey
    $connected = $false
    for ($i = 0; $i -lt 10; $i++) {
        try {
            Invoke-Lncli alice connect "$bobKey@lnd-bob:9735" | Out-Null
            $connected = $true
            break
        } catch {
            Start-Sleep -Seconds 3
        }
    }
    if (-not $connected) { Write-Host "Connexion peer déjà établie ou en cours." }
    Start-Sleep -Seconds 2
    $channels = Get-LncliText alice listchannels | ConvertFrom-Json
    if (-not $channels.channels) {
        Invoke-Lncli alice openchannel --node_key $bobKey --local_amt 1000000 --push_amt 400000 | Out-Null
        Invoke-Bitcoin generatetoaddress 6 $aliceAddr | Out-Null
    }
    for ($i = 0; $i -lt 30; $i++) {
        $channels = Get-LncliText alice listchannels | ConvertFrom-Json
        $active = @($channels.channels | Where-Object { $_.active -eq $true })
        if ($active.Count -ge 1) { break }
        Start-Sleep -Seconds 2
    }
    Export-Secrets
    Write-Host "Laboratoire initialisé. Alice pubkey=$($alice.identity_pubkey)"
    Write-Host "Bob pubkey=$($bob.identity_pubkey)"
}

function Invoke-Demo {
    Invoke-Init
    $invoice = Get-LncliText bob addinvoice "--amt=$AmountSats" "--memo=p02-alice-to-bob" | ConvertFrom-Json
    Write-Host "Facture Bob: $($invoice.payment_request)"
    Invoke-Lncli alice payinvoice --force $invoice.payment_request | Out-Null
    Start-Sleep -Seconds 2
    $lookup = Get-LncliText bob lookupinvoice $invoice.r_hash | ConvertFrom-Json
    $payments = Get-LncliText alice listpayments | ConvertFrom-Json
    $proof = [ordered]@{
        amount_sats = $AmountSats
        bob_settled = [bool]$lookup.settled
        bob_state = $lookup.state
        alice_payments = @($payments.payments | Select-Object -Last 1 | ForEach-Object { [ordered]@{ status = $_.status; value = $_.value } })
        payment_hash = $invoice.r_hash
        invoice_prefix = $invoice.payment_request.Substring(0, [Math]::Min(8, $invoice.payment_request.Length))
    }
    $proof | ConvertTo-Json -Depth 5
    if (-not $lookup.settled) { throw "Le règlement Bob n'est pas confirmé." }
}

switch ($Command) {
    "up" { Invoke-Compose up -d }
    "init" { Invoke-Init }
    "status" {
        Invoke-Compose ps
        try { Wait-ForInfo alice | ConvertTo-Json -Compress } catch { Write-Host $_ }
        try { Wait-ForInfo bob | ConvertTo-Json -Compress } catch { Write-Host $_ }
    }
    "mine" {
        $addr = (Get-LncliText alice newaddress p2wkh | ConvertFrom-Json).address
        Invoke-Bitcoin generatetoaddress 6 $addr
    }
    "invoice" {
        Get-LncliText bob addinvoice "--amt=$AmountSats" "--memo=smartpay-regtest"
    }
    "pay" {
        if (-not $PayReq) { throw "Fournir -PayReq <bolt11>" }
        Invoke-Lncli alice payinvoice --force $PayReq
    }
    "demo" { Invoke-Demo }
    "export-secrets" { Export-Secrets }
    "down" { Invoke-Compose down }
    "reset" {
        if (-not $Confirm) {
            Write-Host "Refusé. Relancer avec -Confirm pour détruire les volumes Lightning (PostgreSQL n'est pas touché)."
            exit 2
        }
        Invoke-Compose down -v
        Remove-Item -Recurse -Force (Join-Path $SecretsDir "alice"), (Join-Path $SecretsDir "bob") -ErrorAction SilentlyContinue
        Write-Host "Volumes Lightning supprimés. Volume PostgreSQL smartpay_pgdata conservé."
    }
}
