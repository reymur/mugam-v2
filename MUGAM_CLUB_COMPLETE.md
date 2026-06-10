# Mugam Club — Полная документация проекта v2026

## Что это
Мобильное приложение для азербайджанских музыкантов на React Native / Expo Go.
Платформа для поиска музыкантов, общения в чате и заключения договоров о сотрудничестве.

---

## Технический стек

| Технология | Версия | Зачем |
|---|---|---|
| Expo SDK | 54.0.x | Основной фреймворк |
| React Native | 0.81.5 | Мобильный UI |
| React | 18.3.1 | UI |
| Firebase JS SDK | **9.23.0** | Auth + Firestore |
| Zustand | 4.5.x | Стейт менеджмент |
| React Navigation | 6.x | Навигация |
| expo-av | SDK54 | Голосовые сообщения |
| AsyncStorage | — | Персистентная сессия |

---

## КРИТИЧЕСКИ ВАЖНО (без этого не работает)

1. Firebase **строго v9.23.0** — v10/v11 ломаются с New Architecture
2. `metro.config.js` — обязательно `unstable_enablePackageExports = false`
3. Search экран — **только ScrollView + .map()**, НЕ FlatList (ломает Hermes + Zustand Set)
4. Emoji в Text — всегда в **отдельном** `<Text>` без стилей (иначе Hermes crash)
5. `initializeAuth` — обязательно в `try/catch` (hot reload вызывает повторную инициализацию)
6. Zustand — не хранить `Set` в store (Hermes не поддерживает). Использовать `string[]`
7. Вызов функций в useAppStore selector (`s => s.someFunc()`) — иногда ломается. Лучше вычислять прямо в selector

---

## Восстановление проекта

```bash
cd ~/Downloads/mugam-v2
npm install --legacy-peer-deps
npx expo start --clear
```

---

## Firebase конфиг (реальные ключи)

```ts
// src/firebase/config.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FIREBASE_CONFIG = {
  apiKey:            'AIzaSyDFGOC39rQDKRZR2xZ9wR54x2VXWX3AERk',
  authDomain:        'mugam-club.firebaseapp.com',
  projectId:         'mugam-club',
  storageBucket:     'mugam-club.firebasestorage.app',
  messagingSenderId: '1034748814848',
  appId:             '1:1034748814848:web:4b2edc2575a211efbc9ae5',
};

let app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApp();

let fbAuth;
try {
  fbAuth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
} catch {
  fbAuth = getAuth(app);
}

export { fbAuth };
export const fbFirestore = getFirestore(app);
export const fbStorage = null as any; // не работает в Expo Go

export const COLLECTIONS = {
  USERS: 'users', MUSICIANS: 'musicians', GIGS: 'gigs', BOARD: 'board',
  MARKET: 'market', STORIES: 'stories', VIDEOS: 'videos', CHATS: 'chats',
  MESSAGES: 'messages', EVENTS: 'events', ROOMS: 'rooms',
  NOTIFICATIONS: 'notifications', INVITES: 'invites', AGREEMENTS: 'agreements',
} as const;
```

---

## metro.config.js

```js
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];
config.resolver.unstable_enablePackageExports = false;
module.exports = config;
```

---

## babel.config.js

```js
module.exports = function (api) {
  api.cache(true);
  return { presets: ['babel-preset-expo'] };
};
```

---

## Структура файлов

```
mugam-v2/
├── App.tsx                          # Точка входа + AppState онлайн статус
├── metro.config.js                  # КРИТИЧНО!
├── babel.config.js
├── src/
│   ├── types.ts                     # Все TypeScript типы
│   ├── theme/
│   │   ├── colors.ts
│   │   └── typography.ts
│   ├── i18n/
│   │   ├── az.ts                    # Азербайджанские переводы
│   │   ├── ru.ts                    # Русские переводы
│   │   └── index.ts                 # useT() хук
│   ├── firebase/
│   │   ├── config.ts                # Ключи + инициализация + COLLECTIONS
│   │   ├── auth.ts                  # register, login, logout
│   │   ├── firestore.ts             # Все Firestore операции
│   │   ├── storage.ts               # Stub
│   │   └── messaging.ts             # Stub
│   ├── store/
│   │   └── useAppStore.ts           # Zustand store (весь стейт приложения)
│   ├── navigation/
│   │   └── RootNavigator.tsx        # 10 вкладок
│   ├── components/
│   │   └── common/
│   │       ├── Topbar.tsx           # Колокольчик + уведомления + DirectChat
│   │       └── Toast.tsx
│   └── screens/
│       ├── Auth/
│       │   ├── LoginScreen.tsx
│       │   ├── RegisterScreen.tsx   # Выбор роли Musiqiçi / Qonaq
│       │   └── AuthNavigator.tsx
│       ├── Home/index.tsx           # Карточки + онлайн dot + agreement badge
│       ├── Search/index.tsx         # ScrollView+map (НЕ FlatList!)
│       ├── Board/index.tsx
│       ├── Gigs/index.tsx
│       ├── Market/index.tsx
│       ├── Stories/index.tsx
│       ├── Video/index.tsx
│       ├── Chat/
│       │   ├── index.tsx            # Список чатов
│       │   └── DirectChat.tsx       # Чат договора (ленивое создание)
│       ├── Profile/
│       │   ├── index.tsx
│       │   └── InvitesScreen.tsx
│       ├── Musician/
│       │   └── MusicianProfileScreen.tsx
│       └── Agreements/
│           └── index.tsx            # Список + детали договоров
```

---

## Firebase коллекции

### users
```
uid, displayName, email, instrument, city, emoji, bio,
rating, reviews, available, online, lastSeen, createdAt
```

### musicians
Только пользователи с ролью "Musiqiçi" при регистрации.
```
id, uid, name, emoji, instrument, city, bio, rating,
reviews, available, goldRing, online, lastSeen, updatedAt
```

### chats
```
members: [uid1, uid2]
isGroup: false
name: "имя получателя"          // Теймур видит имя Sevgi
initiatorName: "имя Теймура"    // Sevgi видит имя Теймура
initiatorUid: uid               // кто открыл чат первым
emoji, preview
completed: false                // → true после нажатия Razıyam
lastMessageAt
unreadCount: { [uid]: number }
createdAt
```
ВАЖНО: чат создаётся ТОЛЬКО при отправке первого сообщения, не при нажатии Mesaj!

### chats/{id}/messages
```
text, senderId, senderName, createdAt
```
Голосовые: `text = "🎤 VOICE:{localUri}"`

### invites
Создаётся автоматически вместе с первым сообщением.
```
musicianId, musicianName, musicianEmoji, musicianInst,
fromUid, fromName, fromCity, status: 'pending', createdAt
```

### agreements
Создаётся когда получатель нажимает "Razıyam".
Множественные договоры между одними пользователями разрешены.
```
fromUid, fromName   // инициатор (Теймур — кто написал первым)
toUid, toName       // принявший (Sevgi — кто нажал Razıyam)
chatId              // ссылка на чат с историей переписки
status: 'agreed'
createdAt
```

---

## Firestore индексы (создать в консоли вручную)

| Коллекция | Поля | Порядок |
|---|---|---|
| chats | members (array) + lastMessageAt | desc |
| invites | fromUid + createdAt | desc |
| invites | musicianId + status + createdAt | desc |

---

## Firestore правила (для разработки)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```
ВАЖНО: закрыть перед релизом!

---

## Навигация — 10 вкладок

| Вкладка | Экран | Описание |
|---|---|---|
| KLUB | HomeScreen | Карточки музыкантов + онлайн dot + agreement badge |
| AXTAR | SearchScreen | Поиск + фильтры по инструменту |
| ELANLAR | BoardScreen | Объявления |
| SİFARİŞ | GigsScreen | Заказы |
| BAZAR | MarketScreen | Маркет инструментов |
| HEKAYƏ | StoriesScreen | Истории |
| VİDEO | VideoScreen | Видео плеер |
| MESAJ | ChatsScreen | Список чатов (badge = непрочитанные сообщения) |
| MÜQAV. | AgreementsScreen | Договоры (badge = непрочитанные договоры) |
| PROFİL | ProfileScreen | Профиль пользователя |

---

## Полный поток договора (самое важное)

### Шаг 1 — Открытие чата
- Теймур открывает профиль Sevgi
- Видит: `🤝 Razılaşma` (серая) и `✉️ Mesaj`
- Нажимает **Mesaj** — открывается чистый UI чата
- В Firestore НИЧЕГО НЕ СОЗДАЁТСЯ

### Шаг 2 — Первое сообщение
- Теймур пишет первое сообщение и отправляет
- ТОЛЬКО ТОГДА создаётся: документ в `chats` + документ в `invites`
- Sevgi видит уведомление в колокольчике

### Шаг 3 — Баннеры в чате
- Теймур видит: `🤔 Sevgi Orucova fikirləşir....` (без кнопок)
- Sevgi видит: `🤝 Teymur Orucov cavab gözləyir` + кнопка `✅ Razıyam`

### Шаг 4 — Нажатие Razıyam
- Создаётся документ в `agreements` с `chatId`
- Чат помечается `completed: true`
- Оба видят баннер: `✅ Razılaşma qəbul edildi — Müqavilələr bölməsinə keçirik...`
- Через 2 секунды оба автоматически переходят на вкладку **Müqavilələr**

### Шаг 5 — После договора
- У Теймура кнопка `🤝 Razılaşma (1)` — золотая, кликабельна — открывает договор
- Следующий **Mesaj** — создаётся новый чистый чат
- Завершённые чаты (`completed: true`) скрыты из списка

---

## Экран договора — детали

- **Tərəflər** — стороны с онлайн/офлайн кружком, кликабельны — открывают профиль музыканта
- **💬 Yazışma tarixi** — полная история переписки с именем, датой и временем каждого сообщения
- Внизу секции — номер договора и дата
- Заметка о взаимном согласии

---

## Непрочитанные договоры

- Новый договор → badge на вкладке MÜQAV. + зелёный кружок на карточке + яркий текст
- Пользователь нажимает на договор → `markAgreementAsRead(id)` → badge уменьшается
- Все прочитаны → badge исчезает
- Следующий договор → снова появляется

### Как реализовано в store:
```ts
readAgreementIds: string[]  // массив прочитанных id (не Set!)

markAgreementAsRead: (id) => {
  const already = get().readAgreementIds ?? [];
  if (!already.includes(id)) set({ readAgreementIds: [...already, id] });
}
```
В navigation badge вычисляется прямо в selector:
```ts
const agreementsCount = useAppStore(s => {
  const ids = s.readAgreementIds ?? [];
  return s.agreements.filter(a => !ids.includes(a.id)).length;
});
```

---

## Онлайн статус

### Логика (App.tsx с AppState)
```ts
AppState active     → setUserOnlineStatus(uid, true)
AppState background → setUserOnlineStatus(uid, false)
logout              → setUserOnlineStatus(uid, false)
```

### Показывается везде
- Home карточки — кружок внизу слева аватара (зелёный/серый)
- Search список — кружок на аватаре
- Профиль музыканта — `● Onlayn` / `○ Oflayn` бейдж + кружок на аватаре
- Договор (Tərəflər) — кружок + текст рядом с именем

### Сброс всех в офлайн (запускать при необходимости)
```bash
cd ~/Downloads/mugam-v2
node -e "
const {initializeApp} = require('firebase/app');
const {getFirestore, collection, getDocs, updateDoc, doc} = require('firebase/firestore');
const app = initializeApp({apiKey:'AIzaSyDFGOC39rQDKRZR2xZ9wR54x2VXWX3AERk', projectId:'mugam-club'});
const db = getFirestore(app);
getDocs(collection(db,'musicians')).then(s => {
  s.docs.forEach(d => updateDoc(doc(db,'musicians',d.id), {online: false}));
  setTimeout(() => process.exit(0), 2000);
});
"
```

---

## Agreement badge на карточках Home и Search

- Показывает `🤝` + число договоров с этим музыкантом
- Вычисляется через `useMemo` — `agreementCountMap` (не filter в каждом рендере!)
```ts
const agreementCountMap = useMemo(() => {
  const map: Record<string, number> = {};
  agreements.forEach(a => {
    map[a.fromUid] = (map[a.fromUid] ?? 0) + 1;
    map[a.toUid]   = (map[a.toUid]   ?? 0) + 1;
  });
  return map;
}, [agreements]);
```
- Emoji и число в отдельных Text элементах (иначе Hermes crash):
```tsx
<Text>🤝</Text>
<Text style={s.count}>{count}</Text>
```

---

## Колокольчик (Topbar)

- Только непрочитанные сообщения (не приглашения)
- Завершённые чаты (`completed: true`) не показываются
- При нажатии на чат — открывает DirectChat с `onAgreed` callback
- `onAgreed` закрывает чат и переходит на вкладку Agreements

---

## Zustand Store — ключевые поля

```ts
// Пользователь
user: UserProfile | null
isAuthenticated: boolean
authLoading: boolean
lang: 'az' | 'ru'

// Данные (realtime через onSnapshot)
musicians: Musician[]
chats: ChatItem[]             // только не завершённые
messages: Record<string, Message[]>
agreements: Agreement[]
receivedInvites: Invite[]

// Непрочитанные договоры
readAgreementIds: string[]    // МАССИВ, не Set!

// Действия
login(email, pass)
logout()                      // ставит offline перед выходом
register(email, pass, name, inst, city, role)
sendMessage(chatId, text)
createAgreement(toUid, toName, chatId?)
hasAgreementWith(uid): boolean
markAgreementAsRead(id)
setUserOnlineStatus(uid, online)
```

---

## Известные ограничения Expo Go

| Функция | Expo Go | EAS Build |
|---|---|---|
| Текстовые сообщения | ✅ | ✅ |
| Голосовые (запись) | ✅ | ✅ |
| Голосовые (другому устройству) | ❌ нет Storage | ✅ |
| Push-уведомления | ❌ | ✅ |
| Загрузка фото | ❌ | ✅ |
| Online при force-close iOS | ⚠️ background=offline | ✅ надёжно |

---

## Частые ошибки и решения

| Ошибка | Причина | Решение |
|---|---|---|
| `property is not configurable` | FlatList + Zustand в Hermes | ScrollView + .map() вместо FlatList |
| `private properties not supported` | Firebase v10/v11 | Использовать firebase@9.23.0 |
| `auth/already-initialized` | Hot reload | try/catch при initializeAuth |
| Сессия сбрасывается | Нет AsyncStorage | getReactNativePersistence(AsyncStorage) |
| Property X doesn't exist | Zustand кэш устарел | Добавить `?? defaultValue` в selector |
| Emoji ломает рендер | Hermes + кастомный стиль | Emoji в отдельном Text без стилей |
| Badge не обновляется | Вызов функции в selector | Вычислять прямо в selector |
| Чат не показывается у получателя | Пустой preview или completed:true | Фильтр в subscribeChats |

---

## Следующие шаги (EAS Build)

```bash
npm install -g eas-cli
eas login
eas build --platform ios
```

После EAS Build:
1. Заменить Firebase JS SDK на `@react-native-firebase` — стабильнее
2. Загрузка фото через `expo-image-picker` + Firebase Storage
3. Push-уведомления через FCM
4. Закрыть Firestore правила
5. Надёжный онлайн статус через нативный Firebase Presence
