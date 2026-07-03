# Documentation Technique - LPDWCA-Chat

Ce document présente l'architecture technique et le fonctionnement détaillé de l'application **LPDWCA-Chat**. Il détaille les choix d'implémentation pour la Progressive Web App (PWA) ainsi que les mécanismes de gestion d'état, de profil et de messagerie.

---

## 1. Introduction et But de l'Application

**LPDWCA-Chat** est une application web de messagerie instantanée conçue spécifiquement pour les étudiants de la Licence Professionnelle Développeur Web et Mobile (LPDWCA).

### Objectifs principaux :

- **Légèreté et Performance :** Interface construite en HTML5 sémantique, CSS moderne natif (sans framework) et JavaScript Vanilla (ES Modules).
- **Accessibilité et Standards :** Respect des standards du Web moderne et des critères d'accessibilité.
- **Expérience PWA Avancée :** Fonctionnement en mode déconnecté (offline) et synchronisation en arrière-plan (Background Sync).
- **Intégration Temps Réel / Persistance :** Liaison fluide avec un Backend-as-a-Service (BaaS) via **Supabase** pour la sauvegarde et la récupération des messages, complétée par un stockage local (`localStorage`) pour le profil utilisateur.

---

## 2. Génération de la PWA : L'approche moderne avec `@vite-pwa/viteplugin`

Plutôt que d'utiliser la méthode "standard" manuelle qui consiste à écrire manuellement un fichier `manifest.json`, à coder un Service Worker complet de zéro à la main et à gérer l'enregistrement du Service Worker via des scripts personnalisés dans le code principal, l'application s'appuie sur la bibliothèque **`vite-plugin-pwa`** (configurée dans `vite.config.js`).

### Avantages de cette approche :

1. **Zéro Boilerplate d'enregistrement :** Le plugin injecte automatiquement le code d'enregistrement du Service Worker dans le build final.
2. **Génération automatique du manifeste :** Le Web App Manifest est configuré en JS et généré sous forme de fichier JSON à la compilation, garantissant la validité des chemins des assets.
3. **Intégration Workbox transparente :** Le plugin embarque Workbox pour la mise en cache des assets (precaching) et l'injection dynamique des routes du Service Worker.
4. **Support du Dev Mode :** Permet de tester le comportement PWA (y compris le Service Worker) en cours de développement (`npm run dev`).

---

## 3. Analyse détaillée de la configuration PWA (`vite.config.js`)

Le fichier [vite.config.js](file:///home/lmerkel/dev/lpdwca-chat/vite.config.js) centralise la configuration du build et du plugin PWA. Voici le fichier complet suivi de l'explication de ses options :

```javascript
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
        type: 'module',
        suppressWarnings: true,
      },
      manifest: {
        name: 'LPDWCA-Chat',
        short_name: 'LP-Chat',
        description: 'Tchat de la LPDWCA',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'javascript.svg',
            sizes: '32x32',
            type: 'image/svg',
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
```

### Explications des options de `VitePWA` :

#### `strategies: 'injectManifest'`

Par défaut, `vite-plugin-pwa` génère automatiquement un Service Worker complet basé sur des patterns prédéfinis (`generateSW`). Ici, l'option `'injectManifest'` est choisie pour nous permettre d'utiliser notre propre fichier de Service Worker source ([sw.js](file:///home/lmerkel/dev/lpdwca-chat/src/sw.js)). Le plugin va compiler notre fichier source et y injecter la liste des ressources à pré-mettre en cache (precaching manifest) à l'emplacement `self.__WB_MANIFEST`.

> [!NOTE]
> Cette stratégie est indispensable lorsque l'on souhaite intégrer des modules ou stratégies complexes de Workbox (comme le plugin de synchronisation en arrière-plan) tout en conservant le precaching automatisé de nos assets Vite.

#### `srcDir: 'src'` et `filename: 'sw.js'`

Définissent l'emplacement source du fichier Service Worker. Vite ira chercher [src/sw.js](file:///home/lmerkel/dev/lpdwca-chat/src/sw.js) pour le compiler et le placer à la racine du dossier de distribution (`dist/sw.js`).

#### `registerType: 'autoUpdate'`

Indique le comportement lors de la détection d'une nouvelle version du Service Worker. Avec `'autoUpdate'`, dès qu'un nouveau Service Worker est détecté et installé, il prend immédiatement le contrôle de l'application (en appelant en arrière-plan `skipWaiting()` et `clients.claim()`) sans afficher de boîte de dialogue de confirmation à l'utilisateur.

#### `devOptions: { enabled: true, type: 'module', suppressWarnings: true }`

- `enabled: true` : Permet au Service Worker de s'enregistrer et de s'exécuter également lorsque l'application tourne sur le serveur de développement (`npm run dev`), facilitant le débogage.
- `type: 'module'` : Spécifie que le Service Worker généré en mode développement doit être traité comme un module ES (`import` natif), ce qui est nécessaire car notre [sw.js](file:///home/lmerkel/dev/lpdwca-chat/src/sw.js) utilise la syntaxe `import`.

#### `manifest: { ... }`

Définit la configuration de l'application installable par le système d'exploitation (PWA) :

- `name` : Nom complet de l'application (utilisé sur les écrans d'installation).
- `short_name` : Nom court affiché sous l'icône de l'application sur l'écran d'accueil mobile.
- `description` : Description textuelle de l'application.
- `theme_color` : Couleur de la barre d'adresse et du système d'exploitation entourant l'application.
- `icons` : Liste des icônes disponibles pour l'installation sur les différents terminaux.

---

## 4. Fonctionnalités Clés et Fonctionnement Interne

L'application propose des mécanismes modernes tirant parti des API du navigateur pour offrir une expérience fluide et robuste, même en cas de coupure réseau.

### 4.1. Gestion du Statut Réseau et API Notifications (`src/status.js`)

Le module [status.js](file:///home/lmerkel/dev/lpdwca-chat/src/status.js) gère la détection de la connectivité de l'utilisateur et interagit avec lui via les notifications système du système d'exploitation.

#### Demande d'autorisation de notification

Au chargement, si l'autorisation de notification n'a pas encore été décidée, l'application la demande poliment :

```javascript
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission().catch((err) => {
    console.error('Notification permission request failed:', err)
  })
}
```

#### Système d'affichage résilient des Notifications

L'affichage des notifications dispose d'un mécanisme de secours (fallback). Si la création classique via le constructeur `new Notification` échoue (par exemple, sur certains navigateurs mobiles où les notifications ne sont autorisées que via le Service Worker), le code bascule sur l'enregistrement du Service Worker :

```javascript
window.showNotification = function (title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      // Tentative standard
      new Notification(title, {
        body: body,
        icon: '/favicon.svg',
      })
    } catch (e) {
      // Secours via le Service Worker actif
      if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready
          .then((registration) => {
            return registration.showNotification(title, {
              body: body,
              icon: '/favicon.svg',
            })
          })
          .catch((err) => {
            console.error('Service worker notification failed:', err)
          })
      }
    }
  }
}
```

#### Écouteurs de connectivité

L'application écoute les événements `online` et `offline` du navigateur pour adapter l'interface (affichage d'un bandeau "Hors ligne" en haut de la page) et avertir immédiatement l'utilisateur par notification système :

```javascript
function updateNetworkStatus() {
  if (navigator.onLine) {
    offlineBadge.style.display = 'none'
  } else {
    offlineBadge.style.display = 'block'
    window.showNotification('Mode hors ligne', 'Connexion perdue. Vos messages seront mis en attente.')
  }
}

window.addEventListener('online', updateNetworkStatus)
window.addEventListener('offline', updateNetworkStatus)
```

---

### 4.2. Mode Hors ligne & Synchronisation en Arrière-plan (Workbox Background Sync)

C'est l'une des fonctionnalités les plus puissantes de l'application. Lorsqu'un utilisateur envoie un message alors qu'il n'a pas de réseau, le message est stocké localement et envoyé automatiquement dès que la connexion est rétablie, sans qu'aucune action manuelle ne soit requise.

#### Le Service Worker : [src/sw.js](file:///home/lmerkel/dev/lpdwca-chat/src/sw.js)

Nous utilisons `BackgroundSyncPlugin` fourni par la bibliothèque Google Workbox pour capturer les requêtes POST échouées.

```javascript
import { precacheAndRoute } from 'workbox-precaching'
import { BackgroundSyncPlugin } from 'workbox-background-sync'
import { registerRoute } from 'workbox-routing'
import { NetworkOnly } from 'workbox-strategies'

// Met en cache tous les assets générés au build par Vite (HTML, JS, CSS, icônes)
precacheAndRoute(self.__WB_MANIFEST)

// Configuration de la file d'attente de synchronisation
const bgSyncPlugin = new BackgroundSyncPlugin('messages-queue', {
  maxRetentionTime: 24 * 60, // Réessaie l'envoi pendant max 24 Heures
})

// Enregistrement de la route d'envoi de message Supabase
registerRoute(
  ({ url }) => url.pathname.endsWith('/rest/v1/messages'),
  new NetworkOnly({
    plugins: [bgSyncPlugin],
  }),
  'POST'
)
```

#### Comment ça fonctionne sous le capot ?

1. **Precaching :** `precacheAndRoute` prend les fichiers statiques de l'application et les stocke dans le cache du Service Worker au démarrage, ce qui permet à l'application de s'ouvrir instantanément même sans réseau.
2. **Interception :** Lorsqu'un message est envoyé, le client envoie une requête `POST` vers la table `messages` de Supabase (l'URL se termine par `/rest/v1/messages`).
3. **Capture en cas d'échec :** La stratégie `NetworkOnly` tente d'exécuter la requête en ligne. Si la requête échoue en raison d'une panne réseau, le `BackgroundSyncPlugin` l'intercepte et stocke la requête HTTP (avec ses en-têtes et son corps JSON) dans une base de données locale **IndexedDB** nommée `workbox-background-sync`.
4. **Rejeu Automatique :** Le navigateur enregistre une tâche de synchronisation en arrière-plan (`sync`). Dès que le système d'exploitation détecte le retour d'une connexion internet stable, il réveille le Service Worker et rejoue la requête HTTP stockée.

#### Gestion résiliente côté client : Le stockage hybride (`localStorage`)

Bien que l'API `BackgroundSyncPlugin` de Workbox soit implémentée dans le Service Worker, elle présente des limites majeures en conditions de test et de production :
1. **Restrictions de sécurité (HTTPS/localhost)** : Les Service Workers ne s'enregistrent pas sur des connexions non sécurisées (ex: accès au serveur de développement local via l'IP `http://192.168.x.x:5173` sur un smartphone).
2. **Incompatibilité iOS** : L'API `BackgroundSyncPlugin` n'est pas du tout supportée par iOS Safari.
3. **Simulation DevTools** : Le bouton de simulation "Offline" de Chrome/Firefox ne déclenche pas le rejeu réseau au retour en ligne.

Pour assurer un fonctionnement universel, nous avons mis en place une file d'attente robuste côté client en utilisant le **`localStorage`** dans [main.js](file:///j:/devs/dwca-chat/src/main.js).

##### 1. Structure de la file d'attente locale
Dès qu'un message est rédigé hors ligne, il est immédiatement poussé dans l'interface et enregistré de façon persistante dans le `localStorage` :
```javascript
// Outils de gestion du stockage local
function getPendingMessages() {
  return JSON.parse(localStorage.getItem('pendingMessages') || '[]')
}

function savePendingMessage(msg) {
  const pending = getPendingMessages()
  pending.push(msg)
  localStorage.setItem('pendingMessages', JSON.stringify(pending))
}

function removePendingMessage(msgId) {
  let pending = getPendingMessages()
  pending = pending.filter((m) => m.id !== msgId)
  localStorage.setItem('pendingMessages', JSON.stringify(pending))
}
```

##### 2. Rejeu et synchronisation réseau groupée
Lorsque l'appareil repasse en ligne (détection de l'événement `online` de la fenêtre), ou lors de l'initialisation de l'application, la fonction `syncPendingMessages` dépile tous les messages accumulés dans le `localStorage` et les envoie en parallèle avec `Promise.all` vers Supabase pour éviter les appels concurrents et les doublons de rafraîchissement :
```javascript
async function syncPendingMessages() {
  const pending = getPendingMessages()
  if (pending.length === 0) return

  // Envoi parallèle de tous les messages
  const promises = pending.map((msg) => sendToSupabase(msg, false))

  try {
    await Promise.all(promises)
    // Un seul rechargement global pour éviter les doublons UI
    const profile = JSON.parse(localStorage.getItem('myProfile'))
    if (profile && profile.name) {
      await loadMessages(profile.name)
    }
  } catch (err) {
    console.error('Erreur lors de la synchronisation des messages :', err)
  }
}

window.addEventListener('online', syncPendingMessages)
```

---

### 4.3. Gestion Locale du Profil Utilisateur (`src/profile.js`)

Pour préserver l'anonymat tout en permettant d'identifier les expéditeurs des messages, l'application implémente une gestion de profil entièrement locale.

- **`localStorage` comme base de persistance :** L'identité de l'utilisateur (un simple identifiant et son nom) est stockée directement dans le navigateur sous forme de chaîne JSON.
- **Modale intrusive au premier lancement :** Si aucun profil n'est présent dans le `localStorage`, l'application affiche immédiatement une boîte de dialogue modale non fermable (le bouton "Annuler" est masqué) pour contraindre l'utilisateur à saisir un pseudonyme.

```javascript
// src/profile.js
let myProfile = JSON.parse(localStorage.getItem('myProfile')) || null

function openProfileModal() {
  modalEditProfile.style.display = 'flex'
  if (myProfile) {
    inputProfileName.value = myProfile.name
  } else {
    inputProfileName.value = ''
    btnCancelProfileModal.style.display = 'none' // Cache Annuler si aucun profil n'existe
  }
  inputProfileName.focus()
}

formEditProfile.addEventListener('submit', (e) => {
  e.preventDefault()
  const name = inputProfileName.value.trim()

  if (name) {
    myProfile = { id: 'me', name: name }
    localStorage.setItem('myProfile', JSON.stringify(myProfile))
    updateProfileUI()
    closeProfileModal()
    btnCancelProfileModal.style.display = 'inline-block' // Réactive le bouton annuler pour les futures modifications

    // Déclenchement d'un événement global pour avertir l'application
    document.dispatchEvent(new CustomEvent('profile-updated', { detail: myProfile }))
  }
})
```

#### Avatars Dynamiques

Les avatars de la barre latérale et du panneau de discussion sont générés dynamiquement en récupérant l'initiale du nom d'affichage de l'utilisateur :

```javascript
function updateProfileUI() {
  if (myProfile) {
    currentUserName.textContent = myProfile.name
    currentUserAvatar.textContent = myProfile.name.charAt(0).toUpperCase()
  }
}
```

---

### 4.4. Messagerie Dynamique et Intégration Supabase (`src/main.js`)

Le cœur fonctionnel du tchat est orchestré dans [main.js](file:///home/lmerkel/dev/lpdwca-chat/src/main.js).

#### Structure des données en mémoire

L'application contient une liste d'utilisateurs statiques (nos contacts) et un tableau de messages pré-chargés en mémoire pour la démo, combinés avec les messages réels récupérés en ligne.

#### Récupération sélective des messages

Lorsqu'un profil est configuré (au chargement initial ou suite à une modification), l'application interroge la table `messages` de Supabase pour récupérer l'historique lié à ce pseudonyme spécifique (les messages de l'utilisateur) :

```javascript
async function loadMessages(username) {
  if (!username) return

  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('sender_name', username)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching messages from Supabase:', error)
      return
    }

    // On nettoie les messages locaux de l'utilisateur juste avant d'injecter pour éviter les doublons asynchrones (race conditions)
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].userId === MY_USER_ID) {
        messages.splice(i, 1)
      }
    }

    if (data) {
      // Agrégation des messages récupérés dans notre tableau de messages en mémoire
      data.forEach((msg) => {
        messages.push({
          id: msg['id'],
          userId: MY_USER_ID,
          contactId: msg['contact_id'],
          content: msg['content'],
          timestamp: msg['created_at'] || msg['timestamp'],
        })
      })

      // Fusionne également les messages encore en attente de synchronisation locale
      const pending = getPendingMessages()
      pending.forEach((msg) => {
        if (!messages.some((m) => m.id === msg.id)) {
          messages.push(msg)
        }
      })

      // Rafraîchissement de l'affichage si une conversation est en cours de visualisation
      if (currentActiveUserId) {
        displayConversation(currentActiveUserId)
      }
    }
  } catch (err) {
    console.error('Failed to load messages from Supabase:', err)
  }
}
```

#### Écouteurs d'événements pour rechargement dynamique

Grâce à l'événement personnalisé `profile-updated` déclenché par le module de profil, l'application sait exactement quand charger les messages de la base de données :

```javascript
document.addEventListener('profile-updated', (e) => {
  const profile = e.detail
  if (profile && profile.name) {
    loadMessages(profile.name).catch((err) => console.error('Error loading messages:', err))
  }
})
```

### 4.5. Interface Mobile Tactile & Glissement (Responsive CSS/JS)

Pour permettre une utilisation fluide sur smartphone, l'application propose une interface à double vue (contacts vs discussion active) animée par transitions CSS.

#### Structure CSS responsive (`src/style.css`)
Sous les résolutions mobiles (`max-width: 768px`), la barre latérale (`sidebar`) et le panneau de discussion (`chat-panel`) se positionnent en absolu et occupent 100% de la largeur. Un système de translation (`transform: translateX`) les fait coulisser :
- **Vue par défaut (sans conversation ou retour) :** La barre de contacts est visible (`translateX(0)`), la discussion est rejetée hors écran à droite (`translateX(100%)`).
- **Vue active (classe `.show-chat` ajoutée au conteneur principal) :** La discussion glisse à l'écran (`translateX(0)`) et la barre latérale recule légèrement vers la gauche (`translateX(-30%)`) pour donner un effet de profondeur/parallaxe.

#### Bouton de retour dans l'interface (`src/main.js` & `index.html`)
Un bouton avec une icône de flèche vers la gauche (`#btn-back-to-contacts`) est intégré au header de la discussion.
- Il reste caché sur ordinateur (`display: none`).
- Il apparaît en format flex sur mobile (`display: inline-flex`).
- Un simple écouteur d'événement JavaScript gère le retour en retirant la classe `.show-chat` de l'application :

```javascript
if (btnBackToContacts) {
  btnBackToContacts.addEventListener('click', () => {
    appContainer.classList.remove('show-chat')
  })
}
```

---

## 5. Synthèse des Technologies de l'App Web & PWA

L'application rassemble les API du Web moderne de manière optimale :

- **Web App Manifest :** Déclaré dynamiquement pour configurer les modes d'affichage (`standalone`), les couleurs de marque et les icônes d'application sur mobile et desktop.
- **Service Worker & Cache Storage (Workbox Precaching) :** Rend l'application accessible instantanément sans réseau en servant le squelette (App Shell) directement depuis le cache.
- **Background Sync API :** Permet une tolérance extrême aux coupures de réseau réseau sans perte de données.
- **Notifications API :** Assure une communication utilisateur réactive, même lorsque l'application s'exécute en arrière-plan.
- **Web Storage (`localStorage`) & IndexedDB :** Stockage des données légères et persistance des requêtes en attente.
