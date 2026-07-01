import './style.css'
import './profile.js'
import './status.js'

import { supabase } from './supabase.js'

const ContactsList = document.getElementById('contacts-list')
const LoadingContacts = document.getElementById('loading-placeholder')
const ChatEmptyState = document.getElementById('chat-empty-state')
const ChatInterface = document.getElementById('chat-interface')
const ChatMessages = document.getElementById('chat-messages')
const ActiveName = document.getElementById('active-name')
const ActiveAvatar = document.getElementById('active-avatar')
const chatForm = document.getElementById('chat-form')
const chatInput = document.getElementById('chat-input')

let currentActiveUserId = null
const MY_USER_ID = 0

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

function displayConversation(userId) {
  const user = users.find((u) => u.id === userId)
  if (!user) return

  currentActiveUserId = userId

  ActiveName.textContent = `${user.options.FirstName} ${user.options.LastName}`
  ActiveAvatar.textContent = user.options.FirstName[0]
  ChatMessages.replaceChildren()

  const conversationMessages = messages.filter(
    (m) => m.userId === userId || (m.userId === MY_USER_ID && m.contactId === userId)
  )

  if (conversationMessages.length === 0) {
    const emptyMsgDiv = document.createElement('div')
    emptyMsgDiv.classList.add('chat-message', 'system')
    emptyMsgDiv.textContent = 'Aucun message pour le moment.'
    ChatMessages.appendChild(emptyMsgDiv)
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
    ChatMessages.appendChild(fragment)
    ChatMessages.scrollTop = ChatMessages.scrollHeight
  }

  ChatEmptyState.style.display = 'none'
  ChatInterface.style.display = 'flex'
}

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

  messages.push(newMessage)
  chatInput.value = ''
  displayConversation(currentActiveUserId)

  const myProfile = JSON.parse(localStorage.getItem('myProfile'))
  const senderName = myProfile ? myProfile.name : 'Anonyme'

  supabase
    .from('messages')
    .insert([
      {
        sender_name: senderName,
        contact_id: currentActiveUserId,
        content: text,
        created_at: newMessage.timestamp,
      },
    ])
    .then(({ error }) => {
      if (error) {
        if (!navigator.onLine || error.message === 'TypeError: Failed to fetch') {
          console.log('Message mis en attente pour synchronisation en arrière-plan (mode hors ligne).')
          if (typeof window.showNotification === 'function') {
            window.showNotification(
              'Message non distribué',
              `Le message "${text}" a été mis en attente et sera envoyé dès le retour de la connexion.`
            )
          }
          return
        }
        console.error('Error saving message to Supabase:', error)
      }
    })
})

if (users) {
  ContactsList.removeChild(LoadingContacts)
  users.forEach((user) => {
    const card = document.createElement('div')
    const firstName = user.options.FirstName
    const lastName = user.options.LastName

    card.textContent = `${firstName} ${lastName}`
    card.id = user.id
    card.classList.add('contact-item')
    ContactsList.appendChild(card)
  })

  const contactItems = document.querySelectorAll('.contact-item')
  contactItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      displayConversation(Number(e.target.id))
    })
  })
} else {
  console.error("Aucun user n'a été détecté")
}

async function loadMessages(username) {
  if (!username) return

  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].userId === MY_USER_ID) {
      messages.splice(i, 1)
    }
  }

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

      if (currentActiveUserId) {
        displayConversation(currentActiveUserId)
      }
    }
  } catch (err) {
    console.error('Failed to load messages from Supabase:', err)
  }
}

document.addEventListener('profile-updated', (e) => {
  const profile = e.detail
  if (profile && profile.name) {
    loadMessages(profile.name).catch((err) => console.error('Error loading messages:', err))
  }
})
const initialProfile = JSON.parse(localStorage.getItem('myProfile'))
if (initialProfile && initialProfile.name) {
  loadMessages(initialProfile.name).catch((err) => console.error('Error loading messages:', err))
}
