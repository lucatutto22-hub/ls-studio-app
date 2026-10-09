# LS Studio

Application web de LS Studio : un espace client pour récupérer photos et vidéos et échanger avec l'équipe, et un espace équipe pour suivre l'activité.

## Ce que fait l'application

**Espace client** (`/espace`)
- Connexion avec ses propres identifiants ; chaque client ne voit que ses fichiers.
- Photos et vidéos classées par campagne, aperçu, téléchargement, validation ou demande de modification.
- Messagerie avec l'équipe, en direct.
- Factures consultables et imprimables en PDF.

**Espace équipe** (`/admin`, pour Luca et Sacha)
- Tableau de bord : CA encaissé, CA du mois, abonnements mensuels, montants à encaisser, tâches en retard, retours clients.
- Messagerie : une conversation par client, messages non lus signalés.
- Clients : fiches, création des identifiants de connexion, fichiers livrés.
- Facturation : numérotation automatique (F-2026-001…), suivi des paiements, facture imprimable.
- Tâches avec délais (à faire, en cours, terminé). Une demande de modification d'un client crée une tâche.
- Livraison de fichiers par glisser-déposer (jusqu'à 5 Go par fichier), le client est prévenu par e-mail.

Pas de paiement en ligne : les factures se règlent par virement.

## Comment c'est construit

| Rôle | Outil |
|---|---|
| Application | Next.js 16 (App Router) |
| Comptes, base de données, messagerie en direct | Supabase |
| Stockage des photos et vidéos | Cloudflare R2 (liens signés et temporaires) |
| E-mails de notification | Resend (facultatif) |

Les règles d'accès sont dans la base (Row Level Security) : même en cas d'erreur dans l'interface, un client ne peut lire que ses propres données. Elles sont testées par `npm run test:db`.

## Mise en route

### 1. Supabase
1. Créer un projet sur [supabase.com](https://supabase.com) (offre gratuite), région Europe.
2. Dans **SQL Editor**, exécuter le contenu de `supabase/migrations/20261009000000_init.sql`.
3. Dans **Authentication > Sign In / Providers**, désactiver l'inscription libre : seuls les administrateurs créent des comptes.
4. Dans **Authentication > URL Configuration**, mettre l'adresse du site dans *Site URL* et ajouter `https://<votre-site>/auth/callback` aux *Redirect URLs*.
5. Récupérer l'URL du projet, la clé publiable et la clé secrète (**Project Settings > API Keys**).

### 2. Cloudflare R2
1. Créer un bucket `ls-studio-fichiers` (gratuit jusqu'à 10 Go).
2. Créer un jeton d'API R2 avec les droits *Object Read & Write* sur ce bucket.
3. Dans les paramètres du bucket, ajouter cette règle CORS (remplacer l'adresse du site) :

```json
[
  {
    "AllowedOrigins": ["https://<votre-site>", "http://localhost:3000"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```

### 3. E-mails (facultatif mais conseillé)
1. Créer un compte [Resend](https://resend.com) et vérifier le nom de domaine.
2. Renseigner `RESEND_API_KEY` et `MAIL_FROM`.
3. Dans Supabase, **Authentication > Emails > SMTP Settings**, brancher le SMTP de Resend pour que « Mot de passe oublié » fonctionne.

Sans e-mails, l'application fonctionne : le mot de passe provisoire d'un nouveau compte s'affiche à l'écran pour être transmis à la main.

### 4. Lancer en local

```bash
cp .env.example .env.local   # puis remplir les valeurs
npm install
npm run create-admin -- luca@exemple.fr "Luca"
npm run dev
```

Ouvrir http://localhost:3000, se connecter avec le mot de passe provisoire affiché, puis le changer. Sacha peut ensuite être ajouté depuis **Paramètres > Équipe**.

### 5. Mise en ligne sur Netlify (offre gratuite)
1. Sur [netlify.com](https://www.netlify.com), *Add new project > Import an existing project*, choisir GitHub puis le dépôt `ls-studio-app` (Next.js est détecté automatiquement, voir `netlify.toml`).
2. Avant de déployer, renseigner les variables d'environnement de `.env.example` (*Site configuration > Environment variables*). `NEXT_PUBLIC_SITE_URL` prend l'adresse Netlify du site.
3. Déployer, puis ajouter l'adresse du site dans la règle CORS de R2 et dans *Site URL* / *Redirect URLs* de Supabase.

`vercel.json` reste disponible si l'application passe un jour sur Vercel.

## Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm run lint` / `npm run typecheck` | Vérifications du code |
| `npm run test:db` | Teste la migration et les règles d'accès sur un Postgres 16 local |
| `npm run create-admin -- email "Prénom"` | Crée un compte administrateur |
