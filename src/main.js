import './style.css'

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
