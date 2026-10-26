# dankennedy.ie

Personal site — a single static page (Vite) served via nginx in Docker.

## Local preview

```bash
docker build -t dankennedy-ie .
docker run -p 8080:80 dankennedy-ie
```

Open http://localhost:8080

## Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # outputs to dist/
```

## Screen images

The homepage backgrounds in `public/images/screens/` are generated from private
source photos in `assets/` (gitignored, never published):

```bash
nix-shell -p imagemagick --run scripts/make-art.sh
```
