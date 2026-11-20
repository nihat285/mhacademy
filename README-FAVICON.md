# MH Academy favicon sistemi

1. Zip-i layihənin kökündə aç (fayllar `public/` və `src/app/manifest.ts` yoluna düşür).
2. Əgər `src/app/icon.svg` (köhnə favicon) varsa, SİL: yenisi `public/icon.svg`-dir, ikisi toqquşar.
3. Əgər `src/app/manifest.ts` (və ya public/manifest.webmanifest) artıq varsa, `manifest.ts`-in üstünə yazma;
   yalnız içindəki `icons` massivini öz manifestinə köçür.
4. `src/app/layout.tsx`-də `metadata`-ya bu bloku əlavə et (manifest sətri artıq varsa toxunma):

```ts
icons: {
  icon: [
    { url: "/favicon.ico", sizes: "48x48" },
    { url: "/icon.svg", type: "image/svg+xml", sizes: "any" },
    { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
    { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
  ],
  apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
},
```

5. `npm run build`. Yoxlama: tabda MH ikonu; `/manifest.webmanifest` JSON qaytarır.
Google axtarışında yeni ikon bir neçə gün–həftə sonra görünür (Google özü yeniləyir).
