services:
  api:
    build: .
    ports:
      - "8000:8000"
    env_file:
      - .env
    volumes:
      # Persist the SQLite DB across container restarts.
      - api_data:/app/data
    environment:
      DATABASE_URL: sqlite+aiosqlite:////app/data/rental.db
    restart: unless-stopped

volumes:
  api_data:
