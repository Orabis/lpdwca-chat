# LPDWCA-Chat

Pour initialiser le projet, avoir une bdd supabase avec comme unique table __messages__ contenant  :

| NAME        | TYPE      | CONSTRAINTS                     |
|-------------|-----------|---------------------------------|
| id          | int8      | PRIMARY, IDENTITY, NON-NULLABLE |
| sender_name | text      | NON-NULLABLE                    |
| contact_id  | int4      | NON-NULLABLE                    |
| content     | text      | NON-NULLABLE                    |
| created_at  | timestamp | NON-NULLABLE                    |

Ensuite, avoir un .env avec comme valeur (ex.)

```
VITE_SUPABASE_URL=https://exemple.supabase.co
VITE_SUPABASE_PUBLIC_KEY=sb_publishable_JQ_blablabla
```

Et faire en ligne de commande : (npm ou pnpm disponnible)
```bash
git clone https://github.com/Orabis/lpdwca-chat.git
npm install
npm run dev

```

## 📝 Description du projet

LPDWCA-Chat est une application de messagerie instantanée construite sous la forme d'une Progressive Web App (PWA). Le projet est conçu pour être léger, robuste et met un point d'honneur sur l'accessibilité ainsi que sur l'utilisation stricte des standards modernes du web.

### ✨ Fonctionnalités actuelles

- **Interface de Messagerie Dynamique :**
- Navigation fluide entre les différentes conversations depuis la barre latérale.
- Affichage conditionnel des bulles de chat (alignement et styles distincts pour les messages envoyés et reçus).
- Envoi de nouveaux messages avec mise à jour immédiate de l'interface

- **Gestion de Profil Locale :**
- Apparition d'une modale au premier lancement forçant l'utilisateur à définir un nom d'affichage.
- Persistance de l'identité via l'API native `localStorage`.
- Mise à jour en temps réel des avatars (générés via la première lettre du prénom) et possibilité de modifier ses informations via le bouton d'édition du profil.

- **Architecture de base PWA & Backend :**
- Le projet est configuré pour communiquer avec un Backend-as-a-Service (Supabase) via les variables d'environnement gérées par Vite.
- Service Worker (`sw.js`) initialisé pour gérer la mise en cache future des assets de l'application.
- Le webManifest est généré à la volée avec le plugin vite-pwa, customisable dans `vite.config.js`

### 🛠️ Stack Technique

- **Frontend :** HTML5, JavaScript Vanilla (ES Modules).
- **Style :** CSS Natif.
- **Bundler / Dev Server :** Vite.
- **Backend / BDD :** Supabase (via `@supabase/supabase-js`).
