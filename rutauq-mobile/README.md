# RutaUQ Mobile

Aplicación móvil de carpooling para la Universidad de Quindío (Colombia).  
Construida con **React Native + Expo SDK 51** (managed workflow).

---

## Prerrequisitos

| Herramienta | Versión mínima |
|---|---|
| Node.js | 20+ |
| npm / yarn / pnpm | última estable |
| Expo CLI | `npm install -g expo-cli` |
| iOS Simulator | Xcode 15+ (solo macOS) |
| Android Emulator | Android Studio con AVD |
| Expo Go (físico) | App Store / Play Store |

---

## Configuración

```bash
# 1. Entrar al directorio del proyecto
cd rutauq-mobile

# 2. Instalar dependencias
npm install

# 3. Copiar variables de entorno
cp .env.example .env.local

# 4. Editar .env.local y ajustar la URL del backend
#    EXPO_PUBLIC_API_URL=http://<tu-ip-local>:8080/api/v1
```

---

## Ejecución

```bash
npx expo start
```

| Plataforma | Tecla |
|---|---|
| iOS Simulator | `i` |
| Android Emulator | `a` |
| Dispositivo físico | Escanear QR con Expo Go |
| Web (solo debug) | `w` |

> **Nota:** Para probar en dispositivo físico, el backend debe ser accesible  
> desde la red local (usar IP de tu máquina, no `localhost`).

---

## Backend local

```bash
# Iniciar PostgreSQL
cd rutauq-backend
docker-compose up -d

# Iniciar Spring Boot
./mvnw spring-boot:run
```

El backend queda disponible en `http://localhost:8080/api/v1`.

---

## Deep Linking

La app registra el esquema `rutauq://` para manejar:

| Ruta | Descripción |
|---|---|
| `rutauq://verify-email?token=<token>` | Verificación de correo |
| `rutauq://reset-password?token=<token>` | Restablecer contraseña |
| `rutauq://pse-result?payment_id=<id>` | Resultado de pago PSE |

---

## Build de producción (EAS)

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Iniciar sesión en Expo
eas login

# Build Android
npx eas build --platform android --profile production

# Build iOS
npx eas build --platform ios --profile production
```

Requiere cuenta en [expo.dev](https://expo.dev) y configurar `eas.json`.

---

## Estructura del proyecto

```
rutauq-mobile/
├── app/                    # Expo Router (file-based routing)
│   ├── (auth)/             # Pantallas de autenticación
│   └── (app)/              # Pantallas autenticadas (tabs)
├── components/
│   ├── ui/                 # Sistema de diseño (Button, Input, Card…)
│   ├── trips/              # Componentes de viajes
│   ├── reservations/       # Componentes de reservas
│   └── driver/             # Componentes para conductores
├── services/               # Capa de acceso a la API REST
├── stores/                 # Estado global con Zustand
├── lib/                    # Axios, validaciones Zod, utilidades
├── hooks/                  # Hooks personalizados
├── types/                  # Tipos TypeScript (copiados del web)
└── constants/              # Colores y constantes
```

---

## Tecnologías

- **Framework:** React Native + Expo SDK 51
- **Navegación:** Expo Router v3 (file-based)
- **Estado:** Zustand 5 con persistencia AsyncStorage
- **HTTP:** Axios (JWT en SecureStore)
- **Formularios:** React Hook Form + Zod
- **Estilos:** NativeWind v4 (Tailwind CSS)
- **Pagos:** MercadoPago via WebView
- **Notificaciones:** expo-notifications

---

## Variables de entorno

```env
EXPO_PUBLIC_API_URL=http://localhost:8080/api/v1
EXPO_PUBLIC_MP_PUBLIC_KEY=your_mercadopago_public_key
```

---

## Tests

```bash
npm test
```

Incluye tests unitarios de stores, utilidades y componentes clave.
