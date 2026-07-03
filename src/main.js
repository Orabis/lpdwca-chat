import './style.css'
import './profile.js'
import './status.js'

import { supabase } from './supabase.js'

const appContainer = document.getElementById('app-container')
const btnBackToContacts = document.getElementById('btn-back-to-contacts')
const contactsList = document.getElementById('contacts-list')
const loadingContacts = document.getElementById('loading-placeholder')
const chatEmptyState = document.getElementById('chat-empty-state')
const chatInterface = document.getElementById('chat-interface')
const chatMessages = document.getElementById('chat-messages')
const activeName = document.getElementById('active-name')
const activeAvatar = document.getElementById('active-avatar')
const chatForm = document.getElementById('chat-form')
const chatInput = document.getElementById('chat-input')

let currentActiveUserId = null
const MY_USER_ID = 0

// Récupère les messages en attente de synchronisation depuis le localStorage
function getPendingMessages() {
  return JSON.parse(localStorage.getItem('pendingMessages') || '[]')
}

// Enregistre un message dans la file d'attente du localStorage
function savePendingMessage(msg) {
  const pending = getPendingMessages()
  pending.push(msg)
  localStorage.setItem('pendingMessages', JSON.stringify(pending))
}

// Retire un message de la file d'attente du localStorage après envoi réussi
function removePendingMessage(msgId) {
  let pending = getPendingMessages()
  pending = pending.filter((m) => m.id !== msgId)
  localStorage.setItem('pendingMessages', JSON.stringify(pending))
}

// Pour une potentielle évolutivité, s'occuper la gestions des users réellement
const users = [
  {
    id: 1,
    options: {
      FirstName: 'Boris',
      LastName: 'Schmidt',
    },
  },
  {
    id: 2,
    options: {
      FirstName: 'Guillaume',
      LastName: 'Weber',
    },
  },
  {
    id: 3,
    options: {
      FirstName: 'Emilien',
      LastName: 'Meyer',
    },
  },
  {
    id: 4,
    options: {
      FirstName: 'Camille',
      LastName: 'Roux',
    },
  },
]

// Message par défaut
const messages = [
  {
    id: 101,
    userId: 2, //Guillaume
    content: "Salut ! Quelqu'un a réussi à faire marcher l'API Push sur le projet de la LP ?",
    timestamp: '2026-06-29T09:15:00Z',
  },
  {
    id: 102,
    userId: 3, //Emilien
    content: "Ouais, j'ai galéré avec le Service Worker au début, mais ça passe. Fais gaffe au cache du navigateur !",
    timestamp: '2026-06-29T09:17:30Z',
  },
  {
    id: 103,
    userId: 1, //Boris
    content: "Top, merci ! D'ailleurs, on part sur quoi pour le backend ? J'étais chaud pour tester un truc en Rust.",
    timestamp: '2026-06-29T09:20:00Z',
  },
  {
    id: 104,
    userId: 4, //Camille
    content: "Pourquoi pas, tant qu'on garde le front bien Vanilla et accessible, ça me va !",
    timestamp: '2026-06-29T09:21:45Z',
  },
]

// Affiche la discussion avec le contact choisi et charge ses messages
function displayConversation(userId) {
  const user = users.find((u) => u.id === userId)
  if (!user) return

  currentActiveUserId = userId

  activeName.textContent = `${user.options.FirstName} ${user.options.LastName}`
  activeAvatar.textContent = user.options.FirstName[0]
  chatMessages.replaceChildren()

  const conversationMessages = messages.filter(
    (m) => m.userId === userId || (m.userId === MY_USER_ID && m.contactId === userId)
  )

  if (conversationMessages.length === 0) {
    const emptyMsgDiv = document.createElement('div')
    emptyMsgDiv.classList.add('chat-message', 'system')
    emptyMsgDiv.textContent = 'Aucun message pour le moment.'
    chatMessages.appendChild(emptyMsgDiv)
  } else {
    const fragment = document.createDocumentFragment()

    conversationMessages.forEach((msg) => {
      const msgDiv = document.createElement('div')

      if (msg.userId === MY_USER_ID) {
        msgDiv.classList.add('chat-message', 'sent')
      } else {
        msgDiv.classList.add('chat-message', 'received')
      }

      const contentDiv = document.createElement('div')
      contentDiv.classList.add('message-content')
      contentDiv.textContent = msg.content

      const timeSpan = document.createElement('span')
      timeSpan.classList.add('message-time')
      timeSpan.textContent = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

      msgDiv.append(contentDiv, timeSpan)
      fragment.appendChild(msgDiv)
    })
    chatMessages.appendChild(fragment)
    chatMessages.scrollTop = chatMessages.scrollHeight
  }

  chatEmptyState.style.display = 'none'
  chatInterface.style.display = 'flex'
  appContainer.classList.add('show-chat')
}

// Tente d'envoyer un message à Supabase. Si ça réussit, on le retire du stockage local temporaire
function sendToSupabase(msg, shouldReload = true) {
  const myProfile = JSON.parse(localStorage.getItem('myProfile'))
  const senderName = myProfile ? myProfile.name : 'Anonyme'

  return supabase
    .from('messages')
    .insert([
      {
        sender_name: senderName,
        contact_id: msg.contactId,
        content: msg.content,
        created_at: msg.timestamp,
      },
    ])
    .then(({ error }) => {
      if (error) {
        if (!navigator.onLine || error.message === 'TypeError: Failed to fetch') {
          console.log('Message mis en attente pour synchronisation (mode hors ligne).')
          if (typeof window.showNotification === 'function') {
            window.showNotification(
              'Message en attente',
              `Le message "${msg.content}" sera envoyé dès que la connexion reviendra.`
            )
          }
          return
        }
        console.error("Erreur Supabase lors de l'enregistrement:", error)
      } else {
        // Envoi réussi ! On l'enlève du localStorage
        removePendingMessage(msg.id)
        if (shouldReload && currentActiveUserId === msg.contactId) {
          const profile = JSON.parse(localStorage.getItem('myProfile'))
          if (profile && profile.name) {
            loadMessages(profile.name).catch((err) => console.error(err))
          }
        }
      }
    })
    .catch((err) => {
      console.error("Erreur lors de l'appel Supabase:", err)
    })
}

// Envoie le message saisi, le met dans la liste locale et le synchronise sur Supabase
chatForm.addEventListener('submit', (e) => {
  e.preventDefault()

  const text = chatInput.value.trim()
  if (!text || !currentActiveUserId) return

  const newMessage = {
    id: Date.now(),
    userId: MY_USER_ID,
    contactId: currentActiveUserId,
    content: text,
    timestamp: new Date().toISOString(),
  }

  // Affiche direct le message dans la discussion locale
  messages.push(newMessage)
  chatInput.value = ''
  displayConversation(currentActiveUserId)

  // Enregistre en local d'abord (persistance en cas de refresh)
  savePendingMessage(newMessage)

  // Essaie de l'envoyer au serveur
  sendToSupabase(newMessage)
})

// Remplit le menu latéral avec la liste de nos contacts et gère le clic sur chacun
if (users) {
  contactsList.removeChild(loadingContacts)
  users.forEach((user) => {
    const card = document.createElement('div')
    const firstName = user.options.FirstName
    const lastName = user.options.LastName

    card.textContent = `${firstName} ${lastName}`
    card.id = user.id
    card.classList.add('contact-item')
    contactsList.appendChild(card)
  })

  const contactItems = document.querySelectorAll('.contact-item')
  contactItems.forEach((item) => {
    item.addEventListener('click', () => {
      displayConversation(Number(item.id))
    })
  })
} else {
  console.error("Aucun user n'a été détecté")
}

// Ferme la discussion et revient aux contacts sur smartphone
if (btnBackToContacts) {
  btnBackToContacts.addEventListener('click', () => {
    appContainer.classList.remove('show-chat')
  })
}

// Récupère l'historique des messages envoyés par l'utilisateur depuis Supabase
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
      data.forEach((msg) => {
        messages.push({
          id: msg['id'],
          userId: MY_USER_ID,
          contactId: msg['contact_id'],
          content: msg['content'],
          timestamp: msg['created_at'] || msg['timestamp'],
        })
      })

      // Fusionne les messages en attente du localStorage pour qu'ils soient affichés après un refresh
      const pending = getPendingMessages()
      pending.forEach((msg) => {
        if (!messages.some((m) => m.id === msg.id)) {
          messages.push(msg)
        }
      })

      if (currentActiveUserId) {
        displayConversation(currentActiveUserId)
      }
    }
  } catch (err) {
    console.error('Failed to load messages from Supabase:', err)
  }
}

// Recharge les messages dès que l'utilisateur modifie ses infos de profil
document.addEventListener('profile-updated', (e) => {
  const profile = e.detail
  if (profile && profile.name) {
    loadMessages(profile.name).catch((err) => console.error('Error loading messages:', err))
  }
})
// Tente d'envoyer tous les messages stockés en local quand la connexion revient
async function syncPendingMessages() {
  const pending = getPendingMessages()
  if (pending.length === 0) return

  console.log(`Tentative de synchronisation de ${pending.length} message(s)...`)

  // On envoie tout en parallèle et on attend la fin de tous les envois
  const promises = pending.map((msg) => sendToSupabase(msg, false))

  try {
    await Promise.all(promises)
    // Une fois la file d'attente vidée, on effectue un unique rechargement global
    const profile = JSON.parse(localStorage.getItem('myProfile'))
    if (profile && profile.name) {
      await loadMessages(profile.name)
    }
  } catch (err) {
    console.error('Erreur lors de la synchronisation des messages :', err)
  }
}

// Déclenche la synchronisation dès que l'appareil repasse en ligne
window.addEventListener('online', syncPendingMessages)

const initialProfile = JSON.parse(localStorage.getItem('myProfile'))
if (initialProfile && initialProfile.name) {
  loadMessages(initialProfile.name)
    .then(() => {
      if (navigator.onLine) {
        syncPendingMessages()
      }
    })
    .catch((err) => console.error('Error loading messages:', err))
}
