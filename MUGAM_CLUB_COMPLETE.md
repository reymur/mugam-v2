# Muğam Club — Полная документация проекта

## Обзор
Мобильное приложение для азербайджанских музыкантов. Платформа для поиска музыкантов, общения, заключения договоров о сотрудничестве.

---

## Технический стек

| Технология | Версия | Назначение |
|---|---|---|
| Expo SDK | 54.0.x | Основной фреймворк |
| React Native | 0.81.5 | Мобильный UI |
| React | 18.3.1 | UI библиотека |
| Firebase JS SDK | 9.23.0 | Backend (Auth + Firestore) |
| Zustand | 4.5.x | Стейт менеджмент |
| React Navigation | 6.x | Навигация |
| expo-av | SDK54 | Голосовые сообщения |

### Критически важно:
- Firebase **v9.23.0** — более новые версии (v10/v11) ломаются с New Architecture
- React Native **0.81.5** — точно совпадает с Expo Go SDK 54
- `metro.config.js` должен иметь `unstable_enablePackageExports = false`

---

## Восстановление проекта

```bash
# Клонировать или перейти в папку
cd ~/Downloads/mugam-v2

# Установить зависимости
npm install --legacy-peer-deps

# Запустить
npx expo start --clear
```

### Git коммиты (рабочие версии):
```bash
git log --oneline
# d65a694 — Working version (база)
# f12502c — Fix invites
# ... последующие коммиты
```

### Откат к рабочей версии:
```bash
git checkout .
npm install --legacy-peer-deps
npx expo start --clear
```

---

## Конфигурационные файлы

### `metro.config.js`
```js
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.resolver.sourceExts = [...config.resolver.sourceExts, 'cjs'];
config.resolver.unstable_enablePackageExports = false;
module.exports = config;
```

### `babel.config.js`
```js
module.exports = function (api) {
  api.cache(true);
  return { presets: ['babel-preset-expo'] };
};
```

### `src/firebase/config.ts`
```ts
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
  fbAuth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  fbAuth = getAuth(app);
}

export { fbAuth };
export const fbFirestore = getFirestore(app);
export const fbStorage = null as any; // Storage не работает в Expo Go
```

---

## Структура файлов

```
mugam-v2/
├── App.tsx                          # Точка входа
├── metro.config.js                  # Metro конфиг (критично!)
├── babel.config.js                  # Babel конфиг
├── src/
│   ├── types.ts                     # Все TypeScript типы
│   ├── theme/
│   │   ├── colors.ts                # Цвета приложения
│   │   └── typography.ts            # Шрифты (Playfair + Nunito)
│   ├── i18n/
│   │   ├── az.ts                    # Азербайджанские переводы
│   │   ├── ru.ts                    # Русские переводы
│   │   └── index.ts                 # Хук useT()
│   ├── firebase/
│   │   ├── config.ts                # Firebase инициализация + ключи
│   │   ├── auth.ts                  # Авторизация (register, login, logout)
│   │   ├── firestore.ts             # Все Firestore операции
│   │   ├── storage.ts               # Stub (не работает в Expo Go)
│   │   └── messaging.ts             # Stub (не работает в Expo Go)
│   ├── store/
│   │   └── useAppStore.ts           # Zustand store (весь стейт приложения)
│   ├── navigation/
│   │   └── RootNavigator.tsx        # Tab навигация (10 вкладок)
│   ├── components/
│   │   └── common/
│   │       ├── Topbar.tsx           # Верхняя панель + колокольчик
│   │       └── Toast.tsx            # Уведомления
│   └── screens/
│       ├── Auth/
│       │   ├── LoginScreen.tsx      # Экран входа
│       │   ├── RegisterScreen.tsx   # Регистрация с выбором роли
│       │   └── AuthNavigator.tsx    # Auth навигация
│       ├── Home/index.tsx           # Главная — карточки музыкантов
│       ├── Search/index.tsx         # Поиск музыкантов
│       ├── Board/index.tsx          # Объявления
│       ├── Gigs/index.tsx           # Заказы
│       ├── Market/index.tsx         # Маркет
│       ├── Stories/index.tsx        # Истории
│       ├── Video/index.tsx          # Видео плеер
│       ├── Chat/
│       │   ├── index.tsx            # Список чатов
│       │   └── DirectChat.tsx       # Прямой чат (текст + голос)
│       ├── Profile/
│       │   ├── index.tsx            # Профиль пользователя
│       │   └── InvitesScreen.tsx    # Входящие/исходящие приглашения
│       ├── Musician/
│       │   └── MusicianProfileScreen.tsx  # Профиль музыканта
│       └── Agreements/
│           └── index.tsx            # Список и детали договоров
```

---

## Firebase — Коллекции Firestore

### `users`
```
{
  uid, displayName, email, instrument, city,
  emoji, bio, rating, reviews, available,
  verified, followers, gigs, fcmToken,
  createdAt, updatedAt
}
```

### `musicians`
Только пользователи выбравшие роль "Musiqiçi" при регистрации, или нажавшие кнопку "Musiqiçi kimi əlavə ol" в профиле.
```
{
  id, uid, name, emoji, instrument, city,
  bio, rating, reviews, available, goldRing, online,
  createdAt, updatedAt
}
```

### `chats`
```
{
  members: [uid1, uid2],    // массив участников
  isGroup: false,
  name: "имя получателя",   // для инициатора
  initiatorName: "имя отправителя",  // для получателя
  initiatorUid: uid,        // кто создал чат
  emoji, preview,
  lastMessageAt, unreadCount: { [uid]: number },
  createdAt
}
```

### `chats/{id}/messages`
```
{
  text, senderId, senderName, createdAt
}
```
Голосовые сообщения: `text = "🎤 VOICE:{localUri}"`

### `invites`
Создаётся автоматически когда инициатор открывает чат. Используется для определения кто "получатель" в чате.
```
{
  musicianId, musicianName, musicianEmoji, musicianInst,
  fromUid, fromName, fromCity,
  status: 'pending' | 'accepted' | 'declined',
  createdAt
}
```

### `agreements`
Создаётся когда получатель нажимает "Razıyam" в чате.
```
{
  fromUid, fromName,   // инициатор (Teymur — кто открыл чат)
  toUid, toName,       // получатель (Sevgi — кто нажал Razıyam)
  chatId,              // ссылка на чат для истории переписки
  status: 'agreed',
  createdAt
}
```

---

## Firestore индексы (нужно создать вручную)

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
⚠️ Перед релизом заменить на строгие правила!

---

## Навигация (10 вкладок)

| Вкладка | Компонент | Описание |
|---|---|---|
| KLUB | HomeScreen | Карточки музыкантов + события |
| AXTAR | SearchScreen | Поиск + фильтры |
| ELANLAR | BoardScreen | Объявления |
| SİFARİŞ | GigsScreen | Заказы |
| BAZAR | MarketScreen | Маркет инструментов |
| HEKAYƏ | StoriesScreen | Истории |
| VİDEO | VideoScreen | Видео плеер |
| MESAJ | ChatsScreen | Список чатов |
| MÜQAV. | AgreementsScreen | Договоры |
| PROFİL | ProfileScreen | Профиль |

---

## Функционал — подробное описание

### 1. Авторизация
- Email/пароль
- Сессия сохраняется через AsyncStorage (не нужно входить каждый раз)
- При регистрации выбор роли:
  - **🎵 Musiqiçi** → добавляется в коллекцию `musicians`, виден в карточках
  - **👤 Qonaq** → только в `users`, не виден в карточках
- В профиле кнопка "🎵 Musiqiçi kimi əlavə ol" / "Musiqiçi siyahısından çıx"

### 2. Карточки музыкантов (Home + Search)
- Данные из Firestore в реальном времени
- Свой профиль не показывается
- Нажатие → открывается `MusicianProfileScreen`

### 3. Профиль музыканта
**Кнопки:**
- `🤝 Razılaşma` — серая, неактивная (до договора)
- `✅ Qəbul etdi` — зелёная (после договора, меняется в реальном времени)
- `✉️ Mesaj` — всегда активна, открывает DirectChat

### 4. Прямой чат (DirectChat)
**Как работает:**
1. Teymur открывает профиль Sevgi → нажимает **Mesaj**
2. Создаётся чат в `chats` + автоматически invite в `invites`
3. Чат скрыт от Sevgi пока Teymur не отправит сообщение
4. После первого сообщения Sevgi видит чат в списке и колокольчике

**Баннеры в чате:**
- **Teymur** видит: `"🤔 Sevgi Orucova fikirləşir...."` (без кнопок)
- **Sevgi** видит: `"🤝 Teymur Orucov cavab gözləyir"` + кнопка `✅ Razıyam`

**Голосовые сообщения:**
- Зажми 🎤 → запись → отпусти → отправляет
- ▶/⏹ для воспроизведения
- ⚠️ В Expo Go голос слышен только на том же устройстве (нет Storage)

### 5. Договор (Agreement)
**Поток:**
1. Они общаются в чате
2. Договорились → Sevgi нажимает `✅ Razıyam`
3. Создаётся документ в `agreements` с `chatId`
4. У Teymur кнопка `Razılaşma` сразу меняется на `✅ Qəbul etdi`
5. Оба видят договор во вкладке **MÜQAV.**

**Экран договора (детали):**
- Стороны: Teymur (Göndərən) и Sevgi (Qəbul edən)
- Номер договора, дата, статус
- `💬 Yazışma tarixi` — полная история переписки: Имя: сообщение, дата, время
- Заметка о взаимном согласии

### 6. Колокольчик 🔔
Показывает только непрочитанные сообщения (не приглашения).
- Бейдж = сумма непрочитанных
- Нажатие → открывается чат

### 7. Видео плеер
- Кнопка ✕ (floating, 16px от верха)
- Ползунок — 44px зона касания
- `«` 10s / 10s `»` — перемотка (прозрачные кнопки)

---

## Zustand Store — основные поля

```ts
// Пользователь
user: UserProfile | null
isAuthenticated: boolean
authLoading: boolean

// Данные
musicians: Musician[]      // реалтайм
chats: ChatItem[]          // реалтайм
messages: Record<string, Message[]>
agreements: Agreement[]    // реалтайм
receivedInvites: Invite[]  // реалтайм
myInvites: Invite[]        // реалтайм
invitedMusicianIds: Set<string>
acceptedMusicianIds: Set<string>

// Основные действия
register(email, pass, name, inst, city, role)
login(email, pass)
logout()
sendMessage(chatId, text)
createAgreement(toUid, toName, chatId?)
hasAgreementWith(uid): boolean
```

---

## Известные ограничения Expo Go

| Функция | Expo Go | EAS Build |
|---|---|---|
| Текстовые сообщения | ✅ | ✅ |
| Голосовые (запись) | ✅ | ✅ |
| Голосовые (другому) | ❌ | ✅ |
| Push-уведомления | ❌ | ✅ |
| Загрузка фото | ❌ | ✅ |
| Телефонный вход | ❌ | ✅ |

---

## Следующие шаги (после Expo Go)

1. **EAS Build** — нативная сборка:
   ```bash
   npm install -g eas-cli
   eas login
   eas build --platform ios
   ```

2. **@react-native-firebase** — заменить Firebase JS SDK на нативный (стабильнее, поддерживает Storage)

3. **Загрузка фото** — `expo-image-picker` уже установлен, нужен Storage

4. **Закрыть Firestore правила** перед релизом

5. **Реальные видео** — заменить emoji на реальные видео файлы

---

## Частые проблемы и решения

| Проблема | Причина | Решение |
|---|---|---|
| `private properties not supported` | Firebase v10/v11 | Использовать firebase@9.23.0 |
| `PlatformConstants not found` | Неверная версия RN | RN 0.81.5 |
| `Cannot read property 'S'` | Metro берёт ESM вместо CJS | `unstable_enablePackageExports = false` |
| `auth/already-initialized` | Hot reload | `try/catch` при `initializeAuth` |
| Сессия сбрасывается | Нет AsyncStorage | `getReactNativePersistence(AsyncStorage)` |
| Чат не показывается у получателя | Пустой `preview` | Фильтр: показывать только если `preview` не пустой или ты инициатор |