# WA Multi Device ESM

Port ESM dari library WhatsApp Multi Session berbasis Baileys.
Dibuat untuk menjalankan banyak akun WhatsApp dalam satu aplikasi tanpa Selenium atau browser automation.

Repository: https://github.com/east-tech-id/wa-multi-device-esm

## 📦 Instalasi

```bash
npm install wa-multi-device-esm
```

### ES Module / TypeScript

```ts
import * as whatsapp from "wa-multi-device-esm";
```

### CommonJS

```js
const whatsapp = require("wa-multi-device-esm");
```

## 🚀 Manajemen Session

### Membuat Session Baru

```ts
const session = await whatsapp.startSession("mysessionid");
```

### Mendapatkan Semua Session

```ts
const sessions = whatsapp.getAllSession();
```

### Mendapatkan Session Berdasarkan ID

```ts
const session = whatsapp.getSession("mysessionid");
```

### Meload Session dari Penyimpanan

```ts
whatsapp.loadSessionsFromStorage();
```

## 💬 Mengirim Pesan

### Text

```ts
await whatsapp.sendTextMessage({
  sessionId: "mysessionid",
  to: "6281234567890",
  text: "Halo dari server!"
});
```

### Gambar

```ts
const image = fs.readFileSync("./image.png");
await whatsapp.sendImage({ sessionId:"mysessionid", to:"6281234567890", text:"caption", media:image });
```

### Video

```ts
const video = fs.readFileSync("./video.mp4");
await whatsapp.sendVideo({ sessionId:"mysessionid", to:"6281234567890", text:"caption", media:video });
```

### Dokumen

```ts
const file = fs.readFileSync("file.pdf");
await whatsapp.sendDocument({ sessionId:"mysessionid", to:"6281234567890", filename:"file.pdf", media:file });
```

### Voice Note

```ts
const audio = fs.readFileSync("voice.mp3");
await whatsapp.sendVoiceNote({ sessionId:"mysessionid", to:"6281234567890", media:audio });
```

### Read Message

```ts
await whatsapp.readMessage({ sessionId:"mysessionid", key: msg.key });
```

### Typing Effect

```ts
await whatsapp.sendTyping({ sessionId:"mysessionid", to:"6281234567890", duration:3000 });
```

## 📡 Event Listener

### Pesan Masuk
```ts
whatsapp.onMessageReceived((msg)=>{ console.log(msg); });
```

### QR Updated
```ts
whatsapp.onQRUpdated(({sessionId,qr})=>{ console.log(qr); });
```

### Session Connected
```ts
whatsapp.onConnected((id)=> console.log("connected:",id));
```

## 🗂️ Menyimpan Media

```ts
whatsapp.onMessageReceived(async (msg)=>{
  if(msg.message?.imageMessage) msg.saveImage("./saved.jpg");
  if(msg.message?.videoMessage) msg.saveVideo("./saved.mp4");
  if(msg.message?.documentMessage) msg.saveDocument("./saved");
});
```

## ⚙️ Konfigurasi

```ts
whatsapp.setCredentialsDir("my_creds_folder");
```

## 👤 Kontributor

Original: https://github.com/mimamch  
ESM Port: https://github.com/east-tech-id

## 💬 Feedback

https://github.com/east-tech-id/wa-multi-device-esm/issues
