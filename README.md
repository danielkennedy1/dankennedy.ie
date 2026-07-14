# dankennedy.ie

Personal portfolio site — static HTML/CSS/JS served via nginx in Docker.

## Local preview

```bash
docker build -t dankennedy-ie .
docker run -p 8080:80 dankennedy-ie
```

Open http://localhost:8080

## Tailwind CSS

`html/style.css` is pre-compiled and committed. To regenerate after editing classes in `index.html` or `main.js`:

```bash
npx tailwindcss -i input.css -o html/style.css --config html/tailwind.config.js
```

Add `--watch` to rebuild on file changes during development.
