---
layout: post
category: Azure
title: Token authentication to SQL Azure with a Key Vault Certificate
tags:
- Azure
- AzureAD
- AzureSQL
- AppService
- KeyVault
comments: []
---
In a [previous post]({% post_url 2017-08-28-azure-ad-service-principal-with-keyvault-cert %}),
I presented a PowerShell script to create a new Service Principal in Azure Active Directory,
using a self-signed certificate generated directly in Azure Key Vault for authentication.

Now, let's try using it for somethig useful. All the code and samples for this article can
be found on [GitHub](https://github.com/tomasr/sql-auth-with-aad-sample/tree/post2).

We can use the Key Vault certificate in a Web Application deployed to Azure App Service
to authenticate to Azure Active Directory using our Service Principal, and then
obtain a token to connect to SQL Azure. This saves us from having to store passwords
anywhere in our configuration, since Key Vault and App Service will provide us
with easy, secure access to our authentication certificate.

In order to do this, we need a few things:

* Our Service Principal identity in AAD, with the Key Vault certificate
* A SQL Azure Database
* A SQL Server (Azure) login based on our AAD Service Principal, with permissions on the database in question.
* A Web App deployed with our Key Vault certificate
* An ASP.NET App that will use the certificate to authenticate to AAD, then use the token to connect to SQL.

Let's get started!

## Creating the Database

For this sample, I'm going to create a new Azure SQL Server logical server, then
deploy a new, blank database on it. We'll also set up the server firewall to
allow connections from other Azure resources.

Since we want to use Azure Active Directory authentication, we also need to
setup our new server to have an AzureAD admin user. For this we need both
the username (`user@domain`) and the `object id` of the account in the domain.

As usual, let's use Azure Resource Manager (ARM) Templates for this,
by creating a resource of type `Micosoft.Sql/servers/administrators`:

```json
{
    "name": "[parameters('sqlServerName')]",
    "type": "Microsoft.Sql/servers",
    "location": "[resourceGroup().location]",
    "apiVersion": "2014-04-01-preview",
    "dependsOn": [],
    "tags": {
        "displayName": "SQL Logical Server"
    },
    "properties": {
        "administratorLogin": "[parameters('sqlServerAdminLogin')]",
        "administratorLoginPassword": "[parameters('sqlServerAdminLoginPassword')]"
    },
    "resources": [
        {
            "name": "activedirectory",
            "type": "administrators",
            "location": "[resourceGroup().location]",
            "apiVersion": "2014-04-01-preview",
            "dependsOn": [
                "[resourceId('Microsoft.Sql/servers', parameters('sqlServerName'))]"
            ],
            "properties": {
                "administratorType": "ActiveDirectory",
                "login": "[parameters('sqlServerAdAdmin')]",
                "sid": "[parameters('sqlServerAdAdminObjectId')]",
                "tenantId": "[subscription().tenantId]"
            }
        },
        {
            "name": "AllowAllWindowsAzureIps",
            "type": "firewallrules",
            "location": "[resourceGroup().location]",
            "apiVersion": "2014-04-01-preview",
            "dependsOn": [
                "[resourceId('Microsoft.Sql/servers', parameters('sqlServerName'))]"
            ],
            "properties": {
                "startIpAddress": "0.0.0.0",
                "endIpAddress": "0.0.0.0"
            }
        },
        {
            "name": "[parameters('sqlDbName')]",
            "type": "databases",
            "location": "[resourceGroup().location]",
            "apiVersion": "2014-04-01-preview",
            "dependsOn": [
                "[resourceId('Microsoft.Sql/servers', parameters('sqlServerName'))]"
            ],
            "tags": {
                "displayName": "SQL DB"
            },
            "properties": {
                "collation": "[parameters('sqlDbCollation')]",
                "edition": "[parameters('sqlDbEdition')]",
                "maxSizeBytes": "1073741824",
                "requestedServiceObjectiveName": "[parameters('sqlDbRequestedServiceObjectiveName')]"
            }
        }
    ]
}
```

## Creating the SQL Login

To define our new SQL login for our service principal, we must first connect to our
new database using the Azure AD admin account we created in the previous step.
Then, we want to grant the necessary permissions (we'll make it
`db_owner` for now). You can do this from SQL Server Management Studio, or use
a version of `SqlCmd.exe` that supports Azure AD Authentication:

```powershell
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [String]$sqlServer,
    [Parameter(Mandatory=$true)]
    [String]$database,
    [Parameter(Mandatory=$true)]
    [PSCredential]$sqlAdminCredentials,
    [Parameter(Mandatory=$true)]
    [String]$servicePrincipalName
)

# For this script to work we need SqlCmd v14.1 or later
# which can be downloaded from
# https://www.microsoft.com/en-us/download/details.aspx?id=53591
# and the latest ODBC driver from
# https://www.microsoft.com/en-us/download/details.aspx?id=53339

$query = @"
CREATE USER [$servicePrincipalName] FROM EXTERNAL PROVIDER
GO
ALTER ROLE db_owner ADD MEMBER [$servicePrincipalName]
"@

sqlcmd.exe -S "tcp:$sqlServer,1433" `
           -N -C -d $database -G -U $sqlAdminCredentials.UserName `
           -P $sqlAdminCredentials.GetNetworkCredential().Password `
           -Q $query
```

## Creating the Web Application

Now we can create a new Web App resource that references our Key Vault certificate.
We will add this to our ARM template, and most of it is normal stuff, so I won't
repeat it here. The interesting bit is importing the certificate from
Key Vault using a resource of type `Microsoft.Web/certificates`.

To do this, we will need the Id of our Key Vault (which we can get
from the resource group and key vault names), the certificate secret name,
and the Id of our App Service Plan:

```json
{
    "name": "[concat(parameters('servicePrincipalName'))]",
    "type": "Microsoft.Web/certificates",
    "location": "[resourceGroup().location]",
    "apiVersion": "2015-08-01",
    "properties": {
        "keyVaultId": "[resourceId(parameters('keyVaultRGName'), 'Microsoft.KeyVault/vaults', parameters('keyVaultName'))]",
        "keyVaultSecretName": "[concat('SPCert-', parameters('servicePrincipalName'))]",
        "serverFarmId": "[resourceId('Microsoft.Web/serverfarms', parameters('webAppPlanName'))]"
    }

}
```

__Note:__ In order to use certificates, our Web Application must be deployed
on an App Service Plan in the Basic/Standard/Premium tiers.

The first time you try this, you will likely get an error similar to this:

```text
The service does not have access to '<keyvault_id_here>' Key Vault.
Please make sure that you have granted necessary permissions to the service to perform the request operation
```

This happens because internally, App Service will use a "Well-Known Service Principal"
to connect to your Key Vault and read the certificate, but it won't have permissions by
default.

You can find such principals by enumerating Service Principals in your Azure Active
Directory Tenant, using a command such as `Get-AzureRmAdServicePrincipal` in PowerShell,
or `az ad sp list` in the Azure CLI:

```text
ServicePrincipalNames : {abfa0a7c-a6b6-4736-8310-5855508787cd, Microsoft.Azure.WebSites}
ApplicationId         : abfa0a7c-a6b6-4736-8310-5855508787cd
DisplayName           : Microsoft.Azure.WebSites
Id                    : a365affc-333f-4deb-9f8b-5f802fbb2615
Type                  : ServicePrincipal
```

We can then grant this principal the necessary permissions by using PowerShell:

```powershell
Set-AzureRmKeyVaultAccessPolicy -VaultName trkv -ServicePrincipalName abfa0a7c-a6b6-4736-8310-5855508787cd -PermissionsTo get
```

We can do the same using the Azure CLI command:

```sh
az keyvault set-policy --name trkv --spn abfa0a7c-a6b6-4736-8310-5855508787cd --secret-permissions get
```

Now, our ARM template should be able to deploy the certificate without problems.

## Using Token Authentication to SQL

We can now write a simple ASP.NET application that will connect to our SQL Database and
show us the authenticated user, which should match our Service Principal.

Let's first write the code to load the certificate, and then authenticate to Azure AD
using the Active Directory Authentication Library (ADAL):

```csharp
public static class ADAuthentication
{
    static String TenantId = ConfigurationManager.AppSettings["AAD_TENANT_ID"];
    static String Authority = "https://login.windows.net/" + TenantId;
    static String ServicePrincipalName = ConfigurationManager.AppSettings["SERVICE_PRINCIPAL_NAME"];
    static String CertSubjectName = ConfigurationManager.AppSettings["CERT_SUBJECT_NAME"];
    const String SqlResource = "https://database.windows.net/";

    public static X509Certificate2 FindCertificate(String subjectName)
    {
        using (var store = new X509Store(StoreName.My, StoreLocation.CurrentUser))
        {
            store.Open(OpenFlags.ReadOnly);
            var results = store.Certificates.Find(X509FindType.FindBySubjectName, CertSubjectName, false);
            if ( results.Count > 0 )
            {
                return results[0];
            }
        }
        return null;
    }

    public static async Task<String> GetSqlTokenAsync()
    {
        var context = new AuthenticationContext(Authority);
        var certificate = FindCertificate(CertSubjectName);
        if (certificate == null)
            throw new InvalidOperationException("Could not load certificate");

        var credential = new ClientAssertionCertificate($"http://{ServicePrincipalName}", certificate);

        var result = await context.AcquireTokenAsync(SqlResource, credential);
        return result.AccessToken;
    }
}
```

A couple of notes about the code:

* To use `ClientAssertionCertificate`, we need to specify the URL identifier
  for our Service Principal. The code above assumes that's `http://` and its name.
* To acquire a token, we need to specify the target resource. In this case,
  we will always use the `https://database.windows.net/` resource identifier
  to tell AzureAD we want a token to an Azure SQL Server database.

Once we have a token, we can go ahead and connect to SQL Azure, by
assigning the token to the `SqlConnection.AccessToken` property:

```csharp
public async Task<ActionResult> UsingSP()
{
    String cs = ConfigurationManager.ConnectionStrings["SqlDb"].ConnectionString;

    var token = await ADAuthentication.GetSqlTokenAsync();

    var user = await GetSqlUserName(cs, token);
    ViewBag.SqlUserName = user;
    return View("UserContext");
}

private async Task<String> GetSqlUserName(String connectionString, String token)
{
    using (var conn = new SqlConnection(connectionString))
    {
        conn.AccessToken = token;
        await conn.OpenAsync();
        String text = "SELECT SUSER_SNAME()"; 
        using (var cmd = new SqlCommand(text, conn))
        {
            var result = await cmd.ExecuteScalarAsync();
            return result as String;
        }

    }
}
```

If the connection succeeds, we should see something like this in our application:

![Authenticated user message](http://static.winterdom.com/images/2017/sql-adauth1.png)

Here the username will be composed of two parts separated by `@`:

* The first one is the `ApplicationId` of our service principal in Azure AD.
* The second is the `TenantId` for the directory

## Conclusion

In this post I introduced how to take advantage of Azure Active Directory
Service Principals, together with Key Vault-based certificates to authenticate
to Azure SQL using an access token. Along the way, we figured out how to
automate some deployment processes and configure things using ARM templates.

Hope you found it useful. In a follow up post, I'll discuss how to extend this further.