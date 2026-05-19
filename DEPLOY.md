# chatbot_tool deployment

## Local network sharing

Run:

```bash
bash start.sh
```

Open on this machine:

```text
http://127.0.0.1:8000/
```

Other devices on the same Wi-Fi can open:

```text
http://192.168.0.103:8000/
```

If other devices cannot open it, allow incoming connections for Python in macOS firewall settings.

## Public deployment with Railway

This repo already includes `Dockerfile` and `railway.toml`.

1. Push this folder to a Git repository.
2. Create a Railway project from the repository.
3. Set the builder to Dockerfile if Railway does not detect `railway.toml`.
4. Add environment variables as needed:

```text
DEEPSEEK_API_KEY=your_default_key
```

The app can also use API keys entered in the browser settings page, so this environment variable is optional.

5. Deploy. Railway will expose a public HTTPS URL.

## Public deployment with Render

1. Push this folder to a Git repository.
2. Create a new Web Service.
3. Choose Docker runtime.
4. Set environment variables as needed:

```text
DEEPSEEK_API_KEY=your_default_key
```

5. Deploy. Render will expose a public HTTPS URL.

## Container behavior

The Dockerfile builds the React frontend first, copies it into `backend/static`, and starts FastAPI:

```text
uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
```

FastAPI serves both the API and the frontend from the same public URL.
